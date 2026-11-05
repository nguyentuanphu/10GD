// Price Scout storage and validation. Observations are captured by family
// members (screenshot, bookmark, receipt, catalogue, manual) and shared only
// inside their own household. Optional official prices come from a licensed
// feed imported by grocery-cron into a shared cache. No retailer scraping.
import {supportedState} from './geo-resolver.mjs';
import {cleanInsight,cleanPhoto} from './online-prices.mjs';
export const OBSERVATIONS_KEY='grocery/observations.json';
export const CACHE_STORE='bep-grocery-cache';
export const MAX_OBSERVATIONS=3000;
export const RATE_WINDOW_MS=10*60*1000,RATE_MAX=120;
const RETAILERS=['woolworths','coles','aldi','chemist','amazon','viet-grocer','other'];
const SOURCES=['screenshot','bookmark','receipt','catalogue','manual','official','voice'];
const PROMOS=['half-price','special','special-buy','price-drop','multibuy','deal','clearance'];
// 'manual-voice' (spoken price, v1.6) is family-only: it is not in the community evidence list.
const EVIDENCE=['shelf-photo','receipt','screenshot','bookmark','manual','manual-voice'];
// Server-computed; client values are ignored. manual=low, OCR-matched screenshot/bookmark=medium, receipt/official=high.
export function confidenceFor(source,evidence){if(source==='receipt'||source==='official'||evidence?.type==='receipt')return'high';if(['screenshot','bookmark','shelf-photo'].includes(evidence?.type)&&evidence?.ocrMatches===true)return'medium';return'low'}
const BASES=['per_kg','per_100g','per_L','per_100mL','per_each','per_wash','per_roll','per_sheet'];
const isDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T00:00:00Z'));
const addDays=(d,n)=>new Date(Date.parse(d+'T00:00:00Z')+n*864e5).toISOString().slice(0,10);
export function sydneyDate(now=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Australia/Sydney',year:'numeric',month:'2-digit',day:'2-digit'}).format(now)}
export function sydneyHour(now=new Date()){return +new Intl.DateTimeFormat('en-AU',{timeZone:'Australia/Sydney',hour:'2-digit',hourCycle:'h23'}).format(now)}
// Price week starts on the Wednesday on/before the date (Australia/Sydney).
export function cycleId(date=sydneyDate()){const dow=new Date(date+'T00:00:00Z').getUTCDay();return addDays(date,-((dow-3+7)%7))}
const text=(v,max)=>v==null||v===''?null:typeof v==='string'?v.replace(/[\u0000-\u001f]/g,' ').trim().slice(0,max)||null:undefined;
const num=(v,max)=>v==null||v===''?null:typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=max?Math.round(v*10000)/10000:undefined;
// Returns a clean observation or null. Unknown fields are dropped.
export function cleanObservation(o,{today=sydneyDate(),official=false}={}){
 if(!o||typeof o!=='object'||Array.isArray(o))return null;
 const clean={
  id:typeof o.id==='string'&&/^[\w:.-]{6,120}$/.test(o.id)?o.id:null,
  itemId:o.itemId==null?null:typeof o.itemId==='string'&&/^[a-z0-9-]{1,60}$/.test(o.itemId)?o.itemId:undefined,
  label:text(o.label,160),retailer:RETAILERS.includes(o.retailer)?o.retailer:null,branchId:text(o.branchId,80),
  state:o.state==null?null:supportedState(o.state)?o.state:undefined,
  price:typeof o.price==='number'&&Number.isFinite(o.price)&&o.price>0&&o.price<=10000?Math.round(o.price*100)/100:null,
  currency:o.currency==='AUD'?'AUD':null,packQty:num(o.packQty,100000),packUnit:text(o.packUnit,12),units:num(o.units,100000),
  unitPrice:num(o.unitPrice,100000),unitBasis:o.unitBasis==null?null:BASES.includes(o.unitBasis)?o.unitBasis:undefined,
  wasPrice:num(o.wasPrice,10000),promo:o.promo==null?null:PROMOS.includes(o.promo)?o.promo:undefined,
  validUntil:o.validUntil==null||o.validUntil===''?null:isDate(o.validUntil)?o.validUntil:undefined,
  observedAt:isDate(o.observedAt)&&o.observedAt<=addDays(today,1)?o.observedAt:null,
  observedBy:text(o.observedBy,80),source:SOURCES.includes(o.source)&&(official||o.source!=='official')?o.source:null,note:text(o.note,300)
 };
 // Provenance. Only extracted facts + an image hash are stored, never the image.
 // visibility 'community' is reserved for a future moderated phase and rejected now.
 const ev=o.evidence;
 clean.visibility=o.visibility==null||o.visibility==='family'?'family':undefined;
 clean.evidence=ev==null?{type:o.source==='receipt'?'receipt':['screenshot','bookmark'].includes(o.source)?o.source:'manual',imageHash:null,ocrPrice:null,ocrMatches:null}:typeof ev==='object'&&!Array.isArray(ev)&&EVIDENCE.includes(ev.type)&&(ev.imageHash==null||typeof ev.imageHash==='string'&&/^[a-f0-9]{64}$/.test(ev.imageHash))&&num(ev.ocrPrice,10000)!==undefined?{type:ev.type,imageHash:ev.imageHash||null,ocrPrice:num(ev.ocrPrice,10000),ocrMatches:null}:undefined;
 if(clean.evidence&&clean.evidence.ocrPrice!=null&&clean.price)clean.evidence.ocrMatches=Math.abs(clean.evidence.ocrPrice-clean.price)<0.005;
 clean.capturedAt=o.capturedAt==null||o.capturedAt===''?null:typeof o.capturedAt==='string'&&o.capturedAt.length<=40&&!Number.isNaN(Date.parse(o.capturedAt))?new Date(o.capturedAt).toISOString():undefined;
 clean.storeBranchId=o.storeBranchId==null?clean.branchId:text(o.storeBranchId,80);
 clean.confidence=clean.evidence?confidenceFor(clean.source,clean.evidence):undefined;
 if(Object.values(clean).some(v=>v===undefined))return null;
 if(!clean.id||!clean.label||!clean.retailer||!clean.price||!clean.currency||!clean.observedAt||!clean.source)return null;
 return clean;
}
export async function readObservations(store){const row=await store.getWithMetadata(OBSERVATIONS_KEY,{type:'json'});return{rows:Array.isArray(row?.data?.observations)?row.data.observations:[],etag:row?.etag||null}}
// Conditional read-modify-write with retry so concurrent family edits never overwrite each other.
export async function mutateObservations(store,change,attempts=6){
 for(let i=0;i<attempts;i++){
  const {rows,etag}=await readObservations(store);const next=change(rows.slice());if(next===null)return{rows,changed:false};
  const trimmed=next.sort((a,b)=>String(b.observedAt).localeCompare(String(a.observedAt))).slice(0,MAX_OBSERVATIONS);
  const result=await store.setJSON(OBSERVATIONS_KEY,{version:1,updatedAt:new Date().toISOString(),observations:trimmed},etag?{onlyIfMatch:etag}:{onlyIfNew:true});
  if(result?.modified!==false)return{rows:trimmed,changed:true};
 }
 throw Object.assign(Error('Busy, try again.'),{status:409});
}
export async function rateLimit(store,who,now=Date.now(),cost=1){
 const key='grocery/rate/'+String(who).replace(/[^\w-]/g,'_').slice(0,80);
 for(let i=0;i<4;i++){const row=await store.getWithMetadata(key,{type:'json'});const cur=row?.data&&now-row.data.start<RATE_WINDOW_MS?row.data:{start:now,count:0};if(cur.count+cost>RATE_MAX)return false;const saved=await store.setJSON(key,{start:cur.start,count:cur.count+cost},row?.etag?{onlyIfMatch:row.etag}:{onlyIfNew:true});if(saved?.modified!==false)return true}
 return false;
}
export const cacheKey=(state,cycle)=>`prices/${state}/${cycle}.json`;
export async function officialPrices(cacheStore,state,cycle){
 if(!cacheStore||!supportedState(state))return null;
 let feed=null,online=null;
 try{feed=await cacheStore.get(cacheKey(state,cycle),{type:'json'})}catch{}
 // v1.7.5: national online prices (Pinch / WhichGrocer); the previous cycle's file until this cycle's run
 try{online=await cacheStore.get(`online/${cycle}.json`,{type:'json'})||await cacheStore.get(`online/${addDays(cycle,-7)}.json`,{type:'json'})}catch{}
 const rows=[...(Array.isArray(feed?.observations)?feed.observations:[]),...(Array.isArray(online?.observations)?online.observations:[])];
 if(!rows.length)return null;
 return{cycleId:cycle,importedAt:feed?.importedAt||online?.importedAt||null,source:feed?(online?'licensed-feed+online':feed.source||'licensed-feed'):'online',attribution:Array.isArray(online?.attribution)?online.attribution.slice(0,3):[],observations:rows.map(o=>{const c=cleanObservation({...o,state,source:'official'},{official:true});if(c&&o?.insight){const i=cleanInsight(o.insight);if(i)c.insight=i}if(c&&o?.photo){const ph=cleanPhoto(o.photo);if(ph)c.photo=ph}return c}).filter(Boolean).slice(0,20000)}
}
// Licensed-feed import only (configured by GROCERY_FEED_URL). Expected JSON:
// {version:1, cycleId?:'YYYY-MM-DD', states:{NSW:[observation…], QLD:[…]}}.
export async function importLicensedFeed({env=process.env,fetchFn=fetch,cacheStore,now=new Date(),log=console.log}={}){
 const url=env.GROCERY_FEED_URL;
 if(!url){log('grocery-cron: GROCERY_FEED_URL not configured; nothing imported.');return{imported:false,reason:'not-configured'}}
 if(!/^https:\/\//.test(url)){log('grocery-cron: GROCERY_FEED_URL must be https.');return{imported:false,reason:'invalid-url'}}
 const headers={Accept:'application/json'};if(env.GROCERY_FEED_TOKEN)headers.Authorization='Bearer '+env.GROCERY_FEED_TOKEN;
 const response=await fetchFn(url,{headers});if(!response.ok){log('grocery-cron: feed responded '+response.status);return{imported:false,reason:'http-'+response.status}}
 const raw=await response.text();if(raw.length>5_000_000)return{imported:false,reason:'too-large'};
 let feed;try{feed=JSON.parse(raw)}catch{return{imported:false,reason:'invalid-json'}}
 if(feed?.version!==1||!feed.states||typeof feed.states!=='object')return{imported:false,reason:'invalid-format'};
 const today=sydneyDate(now),cycle=isDate(feed.cycleId)?feed.cycleId:cycleId(today),counts={};
 for(const state of ['NSW','QLD']){const list=Array.isArray(feed.states[state])?feed.states[state]:[];const rows=list.slice(0,20000).map((o,i)=>cleanObservation({...o,id:o?.id||`official-${state}-${i}`,state,source:'official',currency:o?.currency||'AUD'},{today,official:true})).filter(Boolean);if(!rows.length)continue;await cacheStore.setJSON(cacheKey(state,cycle),{version:1,cycleId:cycle,importedAt:now.toISOString(),source:'licensed-feed',observations:rows});counts[state]=rows.length}
 log('grocery-cron: imported '+JSON.stringify(counts)+' for cycle '+cycle);
 return{imported:true,cycleId:cycle,counts};
}
