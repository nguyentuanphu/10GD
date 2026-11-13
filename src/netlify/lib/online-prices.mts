// v1.7.5 · National online supermarket prices from Pinch (primary) and WhichGrocer (cross-check).
// Owner decision 5 Nov 2026: both providers, in v1.7.5. Keys live only in the hosting environment
// (PINCH_API_KEY, WHICHGROCER_API_KEY) and are used here, server side, never sent to devices.
//  - Pinch free tier: 30 requests/min, 1,000/day, basket compare ≤ 5 items per request. Attribution
//    “Price data by Pinch” wherever its prices are shown. Prices are national online prices.
//  - WhichGrocer trial: 200 credits/month (1 per search), 1 request per 5 s. Attribution
//    “Product data by WhichGrocer”. Used for a few cross-checks per run within a daily budget.
// Matching is guarded (the product name must contain the item's name or an alias). Pinch and WhichGrocer
// prices for the same retailer that differ by more than 15 % are held for review, not shown. When a provider
// fails, the last saved prices (with their dates) stay; a price is never invented.
import {productIsItem,catalogItems,itemScore,plainRank} from './scout-match.mjs';
const PINCH='https://pinch-app.com/api',WG='https://api.whichgrocer.com/v2';
// Matching uses the reviewed So Giá matcher (every word of one of the item's names, and no variant word such as
// canned/flavour/chips/crackers/dip/cleaner unless the item is that variant). A live run on 5 Nov 2026 showed the
// providers' “cheapest” hint is often a processed product (coriander → rice cups, squid → “Squid Brand” fish sauce).
let MATCH_ITEMS:any=null;const matchItems=()=>MATCH_ITEMS??=catalogItems();
// v1.7.8: a family search word (lib/online-wanted.mts) matches when every word of it is in the product name and no
// variant word (sauce, chips, cooked …) is — it does not compete with the catalogue, the family chose the word.
export function isItem(item:any,name:any){try{if(item?.wanted)return itemScore(String(name||''),{itemId:item.id,names:[String(item.nameEn||'')]})>0;return productIsItem(String(name||''),item.id,matchItems())}catch{return false}}
// v1.7.21 (Henry, 14 Nov 2026: wrong products such as Lemon → “Lemon & Pepper Tuna”): a store department, when the provider
// sends one, must fit the item's department (fresh lemons are not in “Pantry · Canned fish”). Unknown department → the name
// rules alone decide; nothing is guessed.
const DEPT_NOT:Record<string,RegExp>={
 fresh:/\b(pantry|canned|tinned|snack|confectionery|drinks?|beverages?|ready meals?|frozen meals?|deli|health|beauty|baby|pet|household|cleaning|bakery|spices?|herbs and spices)\b/,
 meat:/\b(ready meals?|frozen meals?|deli|snack|pantry|canned|tinned|pet|health|beauty|household)\b/,
 seafood:/\b(ready meals?|deli|snack|pantry|canned|tinned|pet|health|beauty|household)\b/};
export function departmentFits(itemId:any,dept:any){const d=norm(dept);if(!d)return true;const it=matchItems().find((x:any)=>x.itemId===itemId),re=it&&DEPT_NOT[String(it.category||'')];return !re||!re.test(d)}
const deptOf=(c:any)=>[c?.category,c?.department,c?.category_name,c?.aisle].find(x=>typeof x==='string'&&x.trim())||'';
/** Is a stored online price still a confident match under today's rules? Saved data from earlier runs is re-checked when it is
 * read, so a wrong product (and its photo) disappears at once, without a migration and without inventing a price. Items that
 * are not in the catalogue (family search words) keep their own check. */
export function stillMatches(o:any){const id=String(o?.itemId||'');if(!id)return false;const it=matchItems().find((x:any)=>x.itemId===id);if(!it)return true;return productIsItem(String(o?.label||''),id,matchItems())}
/** Unit prices outside these bounds are a data error (e.g. a per-gram value read as per-kg) and are dropped. */
const UNIT_MAX:Record<string,number>={per_kg:300,per_100g:30,per_L:200,per_100mL:20,per_each:500};
const RETAILER_OF:Record<string,string>={woolworths:'woolworths',coles:'coles',aldi:'aldi','chemist warehouse':'chemist',chemist_warehouse:'chemist',chemistwarehouse:'chemist'};
export const ONLINE_KEY=(cycle:string)=>`online/${cycle}.json`;
export const ONLINE_STATUS_KEY='online-prices/status';
// v1.7.5 review step: a live run (5 Nov 2026) showed automatic matching still picks wrong products for some items
// (lime → lime & chilli tuna, beef bones → T-bone steak). Proposed products are saved for review; only products the
// owner confirmed in Studio (✓) are saved as prices for families. ✗ remembers “not this product”.
export const ONLINE_MAPPING_KEY='online-prices/mapping',ONLINE_PROPOSALS_KEY='online-prices/proposals';
// v1.7.5 Phase C: price history per item and retailer (confirmed product only; a new product starts a new history) and
// a deal check against it. Runs are Wed + Sat, so 12 weeks ≈ 24 points; the check needs ≥ 3 earlier prices.
export const ONLINE_HISTORY_KEY='online/history.json',ONLINE_PHOTOS_KEY='online/photos.json';
const HISTORY_DAYS=182,HISTORY_POINTS=60,USUAL_DAYS=84,MIN_POINTS=3;
const dayMs=(d:string)=>Date.parse(d+'T00:00:00Z');
const median=(a:number[])=>{const b=[...a].sort((x,y)=>x-y),m=b.length>>1;return b.length%2?b[m]:(b[m-1]+b[m])/2};
const r2=(n:number)=>Math.round(n*100)/100;
/** Add today's confirmed prices to the history (one point per day; a different product restarts its line). */
export function addToHistory(history:any,observations:any[],today:string){const h:any=history&&typeof history==='object'&&history.items&&typeof history.items==='object'?history:{version:1,items:{}};
 const cutoff=dayMs(today)-HISTORY_DAYS*864e5;
 for(const o of observations){if(!o?.itemId||!o.retailer||!(o.price>0))continue;const key=o.itemId+'|'+o.retailer,pid=String(o.productId||'');let line=h.items[key];if(!line||line.productId!==pid)line=h.items[key]={productId:pid,points:[]};
  line.points=line.points.filter((p:any)=>p[0]!==today);line.points.push([today,r2(o.price),o.unitPrice??null,o.wasPrice??null,o.promo?1:0]);}
 for(const [k,line] of Object.entries(h.items) as any){line.points=line.points.filter((p:any)=>dayMs(p[0])>=cutoff).sort((a:any,b:any)=>a[0].localeCompare(b[0])).slice(-HISTORY_POINTS);if(!line.points.length)delete h.items[k]}
 h.version=1;h.updatedAt=today;return h}
/**
 * Deal check for today's price against the same product's earlier prices.
 * signal: real (special ≥ 10 % below the usual price) · fake (marked special but not really lower; wasInflated when the
 * "was" price is above anything seen) · unverified (special, not enough history) · lowest (lowest seen, no special) ·
 * higher (≥ 10 % above usual) · usual · new (not enough history).
 */
export function dealSignal(line:any,o:any,today:string){const pts=(line?.points||[]).filter((p:any)=>p[0]<today);const recent=pts.filter((p:any)=>dayMs(p[0])>=dayMs(today)-USUAL_DAYS*864e5);
 const special=!!(o.promo||o.wasPrice),price=o.price,out:any={signal:'new',points:[...pts,[today,price,o.unitPrice??null,o.wasPrice??null,special?1:0]].slice(-16).map((p:any)=>[p[0],p[1],p[4]?1:0]),weeks:0};
 if(recent.length<MIN_POINTS){if(special)out.signal='unverified';return out}
 const regular=recent.filter((p:any)=>!p[4]).map((p:any)=>p[1]),base=regular.length>=MIN_POINTS?regular:recent.map((p:any)=>p[1]),usual=r2(median(base)),low=Math.min(...recent.map((p:any)=>p[1])),high=Math.max(...recent.map((p:any)=>p[1]));
 Object.assign(out,{usual,low:r2(low),high:r2(high),weeks:Math.max(1,Math.round((dayMs(today)-dayMs(recent[0][0]))/(7*864e5)))});
 const pct=Math.round((usual-price)/usual*100);out.pct=pct;
 if(special){out.signal=price<=usual*0.9?'real':'fake';if(o.wasPrice&&o.wasPrice>high*1.05)out.wasInflated=true}
 else if(price<low)out.signal='lowest';else if(price>=usual*1.1)out.signal='higher';else out.signal='usual';
 return out}
const SIGNALS=['real','fake','unverified','lowest','higher','usual','new'];
/** Validated copy of an observation's deal check (shown to families with the price). */
export function cleanInsight(v:any){if(!v||typeof v!=='object'||!SIGNALS.includes(v.signal))return null;const n=(x:any)=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100000?r2(x):null;
 const pts=Array.isArray(v.points)?v.points.filter((p:any)=>Array.isArray(p)&&/^\d{4}-\d{2}-\d{2}$/.test(String(p[0]))&&n(p[1])!=null).slice(-16).map((p:any)=>[String(p[0]),n(p[1]),p[2]?1:0]):[];
 return{signal:v.signal,usual:n(v.usual),low:n(v.low),high:n(v.high),pct:typeof v.pct==='number'&&Number.isFinite(v.pct)?Math.max(-999,Math.min(100,Math.round(v.pct))):null,weeks:Math.max(0,Math.min(52,Math.round(+v.weeks||0))),wasInflated:v.wasInflated===true,points:pts}}
export function cleanMapping(v:any){const out:any={};if(!v||typeof v!=='object'||Array.isArray(v))return out;for(const[item,byR]of Object.entries(v).slice(0,400)){if(!/^[a-z0-9-]{1,60}$/.test(item)||!byR||typeof byR!=='object')continue;for(const[r,m]of Object.entries(byR as any)){if(!['woolworths','coles','aldi','chemist'].includes(r)||!m||typeof m!=='object')continue;const pid=String((m as any).productId||'').slice(0,80),ok=(m as any).ok===true;if(!pid)continue;(out[item]??={})[r]={productId:pid,ok,label:String((m as any).label||'').slice(0,160),by:String((m as any).by||'').slice(0,80),at:String((m as any).at||'').slice(0,30),rejected:Array.isArray((m as any).rejected)?(m as any).rejected.map(String).slice(0,20):[]}}}return out}
/** Split a run's observations into confirmed prices and proposals waiting for review. */
// v1.7.7 (owner, 6 Nov 2026: "vì nó là giá thật online của các cửa hàng thì nên để default On"): with `auto` (Studio switch
// onlineAutoConfirm, on by default) a proposed product is shown to families straight away and listed for the owner to
// check; ✗ removes it (and the next run proposes another). Without `auto` only ✓ products are shown, as before.
export function applyMapping(observations:any[],mapping:any,{auto=false}:{auto?:boolean}={}){const confirmed:any[]=[],proposals:any[]=[];
 for(const o of observations){const m=mapping?.[o.itemId]?.[o.retailer];if(m?.ok&&m.productId===o.productId)confirmed.push(o);else if(!(m?.rejected||[]).includes(o.productId)&&!(m?.ok)){proposals.push({photo:o.photo||null,itemId:o.itemId,retailer:o.retailer,productId:o.productId,label:o.label,price:o.price,unitPrice:o.unitPrice,unitBasis:o.unitBasis,packQty:o.packQty,packUnit:o.packUnit,provider:o.observedBy,auto});if(auto)confirmed.push({...o,note:(o.note||'online')+' · auto'})}}
 return{confirmed,proposals}}
const norm=(s:any)=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim();
/** Words that must appear in a product name for it to count as the catalogue item. */
export function matchTerms(item:any){const list=[item?.nameEn,...(item?.aliases||[])].map(norm).filter(x=>x&&x.length>=3&&/^[a-z0-9 ]+$/.test(x));return [...new Set(list)]}
export function nameMatches(item:any,name:any){const n=' '+norm(name)+' ';return matchTerms(item).some(t=>n.includes(' '+t+' ')||n.includes(' '+t+'s '))}
/** “900g - 1.5kg” → {packQty:900,packUnit:'g'}; “approx. 1.3kg” → 1300 g; “2L” → 2000 mL; “6 pack” → 6 each. */
export function parseSize(size:any){const s=String(size||'').toLowerCase().replace(',','.');let m=s.match(/(\d+(?:\.\d+)?)\s*(kg|g|ml|l|litre|liter)\b/);if(m){const q=+m[1],u=m[2];if(u==='kg')return{packQty:Math.round(q*1000),packUnit:'g'};if(u==='g')return{packQty:q,packUnit:'g'};if(u==='ml')return{packQty:q,packUnit:'mL'};return{packQty:Math.round(q*1000),packUnit:'mL'}}m=s.match(/(\d+)\s*(pack|pk|each|ea|x)\b/);if(m)return{packQty:+m[1],packUnit:'each'};if(/\beach\b|\bea\b/.test(s))return{packQty:1,packUnit:'each'};return{packQty:null,packUnit:null}}
/** cup_price “$18.00 / 1KG” or (16.49,'1KG') → price per the item's basis (per_kg, per_100g, per_L, per_100mL, per_each). */
export function unitPriceFor(basis:string,cup:any,measure:any){let price=typeof cup==='number'?cup:null,meas=String(measure||'');if(typeof cup==='string'){const m=cup.match(/\$?\s*(\d+(?:\.\d+)?)\s*\/\s*(.+)$/);if(m){price=+m[1];meas=m[2]}}if(price==null||!(price>0))return null;const mm=meas.toUpperCase().replace(/\s+/g,'').match(/^(\d+(?:\.\d+)?)?(KG|G|ML|L|EA|EACH)$/);if(!mm)return null;const n=mm[1]?+mm[1]:1,u=mm[2];
 let perBase:number|null=null,kind='';if(u==='KG'){perBase=price/n;kind='kg'}else if(u==='G'){perBase=price/n*1000;kind='kg'}else if(u==='L'){perBase=price/n;kind='L'}else if(u==='ML'){perBase=price/n*1000;kind='L'}else{perBase=price/n;kind='each'}
 const r=(v:number)=>Math.round(v*100)/100;if(basis==='per_kg'&&kind==='kg')return r(perBase);if(basis==='per_100g'&&kind==='kg')return r(perBase/10);if(basis==='per_L'&&kind==='L')return r(perBase);if(basis==='per_100mL'&&kind==='L')return r(perBase/10);if(basis==='per_each'&&kind==='each')return r(perBase);return null}
function saneUnit(basis:string,v:number|null){return v!=null&&v>0&&v<=(UNIT_MAX[basis]??500)?v:null}
async function getJSON(fetchFn:any,url:string,init:any,timeoutMs=20000){const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),timeoutMs);try{const r=await fetchFn(url,{...init,signal:ctl.signal});const body=await r.json().catch(()=>null);return{ok:r.ok,status:r.status,body}}catch(e:any){return{ok:false,status:0,body:null,error:String(e?.name||e)}}finally{clearTimeout(t)}}
/** Pinch basket compare (≤ 5 items per request): the cheapest matching product per retailer for each item. */
export async function pinchPrices(items:any[],{key,fetchFn=fetch,today,maxRequests=45,mapping={}}:any){const out:any[]=[],errors:string[]=[];let requests=0;
 for(let i=0;i<items.length&&requests<maxRequests;i+=5){const chunk=items.slice(i,i+5);requests++;
  const r=await getJSON(fetchFn,PINCH+'/basket/compare',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({items:chunk.map((x:any)=>({query:x.nameEn}))})});
  if(!r.ok){errors.push('pinch '+(r.status||r.error));if(r.status===401||r.status===403||r.status===429)break;continue}
  const rows=Array.isArray(r.body?.data?.items)?r.body.data.items:[];
  rows.forEach((row:any,j:number)=>{const item=chunk[j];if(!item)return;const cands=Array.isArray(row?.candidates)?row.candidates:[];
   const pool=[...cands,...Object.entries(row?.cheapest||{}).map(([store,c]:any)=>({...c,retailer:store}))];const best:any={};
   for(const c of pool){const retailer=RETAILER_OF[norm(c?.retailer)];if(!retailer||!(+c.price>0)||!isItem(item,c.name)||!departmentFits(item.id,deptOf(c)))continue;const unitPrice=saneUnit(item.unitBasis,unitPriceFor(item.unitBasis,c.cup_price,c.cup_measure)),cur=best[retailer],mine=mapping?.[item.id]?.[retailer],chosen=mine?.ok&&String(mine.productId)===String(c.product_id),rejected=(mine?.rejected||[]).includes(String(c.product_id)),rank=chosen?-1:unitPrice??+c.price,plain=chosen?0:plainRank(String(c.name||''),item.id,matchItems());if(rejected)continue;if(!cur||plain<cur.plain||plain===cur.plain&&rank<cur.rank)best[retailer]={c,unitPrice,rank,plain}}
   for(const [retailer,b] of Object.entries(best) as any){const c=b.c;out.push(observation(item,{retailer,label:c.name,price:+c.price,wasPrice:typeof c.was_price==='number'?c.was_price:null,special:c.is_on_special===true,size:parseSize(c.size),unitPrice:b.unitPrice,provider:'Pinch',today,productId:c.product_id,photo:c.image_url}))}})}
 return{observations:out,errors,requests}}
/** WhichGrocer search for a few items (1 credit each): matching products per retailer, cheapest by unit price. */
export async function whichGrocerPrices(items:any[],{key,fetchFn=fetch,today,maxCredits=6,wait=(ms:number)=>new Promise(r=>setTimeout(r,ms))}:any){const out:any[]=[],errors:string[]=[];let credits=0,remaining:number|null=null;
 for(const item of items){if(credits>=maxCredits)break;if(credits)await wait(5200);credits++;
  const r=await getJSON(fetchFn,WG+'/products/search?'+new URLSearchParams({q:item.nameEn,page:'1'}),{headers:{Authorization:'Bearer '+key,Accept:'application/json'}});
  if(!r.ok){errors.push('whichgrocer '+(r.status||r.error));if([401,402,403,429].includes(r.status))break;continue}
  if(typeof r.body?.meta?.credits_remaining==='number')remaining=r.body.meta.credits_remaining;
  const best:any={};for(const p of Array.isArray(r.body?.data)?r.body.data:[]){const retailer=RETAILER_OF[norm(p.store)];if(!retailer||p.out_of_stock||p.is_stale||!isItem(item,p.name)||!departmentFits(item.id,deptOf(p)))continue;const unitPrice=saneUnit(item.unitBasis,unitPriceFor(item.unitBasis,p.cup_price,null)),plain=plainRank(String(p.name||''),item.id,matchItems());const cur=best[retailer];if(!cur||plain<cur.plain||plain===cur.plain&&(unitPrice??p.price)<(cur.unitPrice??cur.price))best[retailer]={...p,unitPrice,plain}}
  for(const [retailer,p] of Object.entries(best) as any)out.push(observation(item,{retailer,label:p.name,price:+p.price,wasPrice:null,special:p.is_special===true,size:p.weight&&p.uom?parseSize(p.weight+p.uom):{packQty:null,packUnit:null},unitPrice:p.unitPrice,provider:'WhichGrocer',today,productId:p.id,photo:p.image_url}))}
 return{observations:out,errors,credits,remaining}}
// v1.7.5 owner decision: the supermarket's product photo is the picture for ingredients and products. Only https
// photos from the supermarkets' own image hosts (or WhichGrocer's copy) are kept; anything else is dropped.
const PHOTO_HOSTS=/^(productimages\.coles\.com\.au|shop\.coles\.com\.au|cdn\d*\.woolworthsstatic\.com\.au|cdn\.woolworths\.media|assets\.woolworths\.com\.au|dm\.apac\.cms\.aldi\.cx|[a-z0-9-]+\.aldi\.com\.au|images\.whichgrocer\.com|[a-z0-9-]+\.harrisfarm\.com\.au|cdn\.shopify\.com)$/i;
export function cleanPhoto(u:any){try{const url=new URL(String(u||''));return url.protocol==='https:'&&PHOTO_HOSTS.test(url.hostname)&&url.href.length<=500?url.href:null}catch{return null}}
function observation(item:any,{retailer,label,price,wasPrice,special,size,unitPrice,provider,today,productId,photo}:any){return{photo:cleanPhoto(photo),productId:productId!=null?String(productId).slice(0,80):null,id:`online-${provider.toLowerCase()}-${item.id}-${retailer}`.slice(0,120),itemId:item.id,label:String(label||'').slice(0,160),retailer,state:null,price:Math.round(price*100)/100,currency:'AUD',packQty:size?.packQty??null,packUnit:size?.packUnit??null,units:null,unitPrice:unitPrice??null,unitBasis:unitPrice!=null?item.unitBasis:null,wasPrice:wasPrice&&wasPrice>price?Math.round(wasPrice*100)/100:null,promo:special?'special':null,validUntil:null,observedAt:today,observedBy:provider,source:'official',note:'online'}}
/** Pinch prices, confirmed or held against WhichGrocer for the same item and retailer (> 15 % apart = held). */
export function crossCheck(primary:any[],check:any[],tolerance=0.15){const byKey=new Map(check.map((o:any)=>[o.itemId+'|'+o.retailer,o])),held:any[]=[],kept:any[]=[];
 for(const o of primary){const c=byKey.get(o.itemId+'|'+o.retailer);if(!c){kept.push(o);continue}const a=o.unitPrice??o.price,b=c.unitPrice??c.price,diff=Math.abs(a-b)/Math.max(a,b);if(diff>tolerance){held.push({itemId:o.itemId,retailer:o.retailer,pinch:{label:o.label,price:o.price,unitPrice:o.unitPrice},whichgrocer:{label:c.label,price:c.price,unitPrice:c.unitPrice},diff:Math.round(diff*100)})}else kept.push({...o,note:'online · checked with 2 sources'})}
 // WhichGrocer prices for items Pinch did not return fill the gap (e.g. Chemist Warehouse)
 const have=new Set(primary.map((o:any)=>o.itemId+'|'+o.retailer));for(const c of check)if(!have.has(c.itemId+'|'+c.retailer))kept.push(c);
 return{kept,held}}
/** One refresh: Pinch for every catalogue item, WhichGrocer for a rotating handful; saved for the current cycle. */
export async function refreshOnlinePrices({items,env=process.env,settings={},fetchFn=fetch,cacheStore,statusStore,cycle,today,wait}:any){
 const usePinch=settings?.flags?.onlinePinch===true&&!!env.PINCH_API_KEY,useWg=settings?.flags?.onlineWhichGrocer===true&&!!env.WHICHGROCER_API_KEY;
 const status:any={at:new Date().toISOString(),cycle,pinch:{enabled:usePinch,keySet:!!env.PINCH_API_KEY},whichgrocer:{enabled:useWg,keySet:!!env.WHICHGROCER_API_KEY},errors:[]};
 if(!usePinch&&!useWg){status.skipped='disabled';await statusStore?.setJSON?.(ONLINE_STATUS_KEY,status);return status}
 const list=(items||[]).filter((x:any)=>x?.id&&x?.nameEn&&(x.channels||[]).some((c:string)=>['woolworths','coles','aldi','chemist'].includes(c)));
 let mapping:any={};try{mapping=cleanMapping(await statusStore?.get?.(ONLINE_MAPPING_KEY,{type:'json'}))}catch{}
 const p=usePinch?await pinchPrices(list,{key:env.PINCH_API_KEY,fetchFn,today,mapping}):{observations:[],errors:[],requests:0};
 const budget=Math.max(0,Math.min(20,+(settings?.onlineWhichGrocerPerRun??6)||0)),day=Number(String(today).replace(/-/g,''))||0,start=list.length?(day*budget)%list.length:0,rot=[...list.slice(start),...list.slice(0,start)];
 const w=useWg&&budget?await whichGrocerPrices(rot,{key:env.WHICHGROCER_API_KEY,fetchFn,today,maxCredits:budget,wait}):{observations:[],errors:[],credits:0,remaining:null};
 const checked=usePinch?crossCheck(p.observations,w.observations):{kept:w.observations,held:[]},{confirmed:kept,proposals}=applyMapping(checked.kept,mapping,{auto:settings?.flags?.onlineAutoConfirm!==false}),held=checked.held;
 await statusStore?.setJSON?.(ONLINE_PROPOSALS_KEY,{at:status.at,items:proposals.slice(0,600)});status.proposals=proposals.length;status.confirmed=kept.length;
 status.pinch={...status.pinch,requests:p.requests,prices:p.observations.length};status.whichgrocer={...status.whichgrocer,credits:w.credits,creditsRemaining:w.remaining,prices:w.observations.length};status.errors=[...p.errors,...w.errors].slice(0,20);status.held=held.slice(0,50);status.saved=kept.length;
 if(kept.length){let hist:any=null;try{hist=await cacheStore?.get?.(ONLINE_HISTORY_KEY,{type:'json'})}catch{}hist=hist&&hist.items?hist:{version:1,items:{}};
  // deal check against earlier prices of the same product, then today's prices join the history
  for(const o of kept){const line=hist.items[o.itemId+'|'+o.retailer];o.insight=dealSignal(line&&line.productId===String(o.productId||'')?line:null,o,today)}
  await cacheStore.setJSON(ONLINE_HISTORY_KEY,addToHistory(hist,kept,today));
  // product photos of owner-confirmed products, one per catalogue item (cheapest store's photo wins); kept between runs
  {let ph:any=null;try{ph=await cacheStore.get(ONLINE_PHOTOS_KEY,{type:'json'})}catch{}const items:any=ph?.items&&typeof ph.items==='object'?ph.items:{};for(const[k,v]of Object.entries(items) as any)if(!stillMatches({itemId:k,label:v?.label}))delete items[k];const seen=new Set();
   for(const o of [...kept].sort((a:any,b:any)=>(a.unitPrice??a.price)-(b.unitPrice??b.price))){if(!o.photo||seen.has(o.itemId))continue;seen.add(o.itemId);items[o.itemId]={photo:o.photo,retailer:o.retailer,label:String(o.label||'').slice(0,160),productId:o.productId,at:today}}
   await cacheStore.setJSON(ONLINE_PHOTOS_KEY,{version:1,updatedAt:today,items});status.photos=Object.keys(items).length}status.deals={real:kept.filter((o:any)=>o.insight.signal==='real').length,fake:kept.filter((o:any)=>o.insight.signal==='fake').length};
  const prev=await cacheStore?.get?.(ONLINE_KEY(cycle),{type:'json'}).catch(()=>null);const merged=new Map((prev?.observations||[]).filter(stillMatches).map((o:any)=>[o.id,o]));for(const o of kept)merged.set(o.id,o);
  await cacheStore.setJSON(ONLINE_KEY(cycle),{version:1,cycle,importedAt:status.at,source:'online',attribution:[usePinch?'Price data by Pinch':null,useWg?'Product data by WhichGrocer':null].filter(Boolean),observations:[...merged.values()].slice(0,5000)})}
 else status.kept='previous';
 await statusStore?.setJSON?.(ONLINE_STATUS_KEY,status);return status}
