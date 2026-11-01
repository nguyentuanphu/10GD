// Opt-in voice statistics: storage, validation, server-side redaction, rate limits,
// retention and the Studio aggregation. Text only — the API refuses anything that
// looks like audio and never stores account names, e-mails or raw device tokens.
//
// Store `bep-voice-stats` (JSON):
//   ev/<deviceHash>/<YYYY-MM-DD>/<ms13>-<rand>   one confirmed preview (see sanitizeEvent)
//   rate/<hash>:<bucket>                          short-lived rate counters
//   meta/prune                                    last retention sweep
// deviceHash = sha256('voice-dev:'+token)[0..24]; the raw device token is never stored.
// Retention: 90 days (swept on submit at most every 6 h and on every Studio view).
// Opt-out deletes every record under ev/<deviceHash>/.
import {createHash,randomBytes} from 'node:crypto';
import {editRecord} from './accounts.mjs';

const REGION={consistency:'strong',region:'ap-southeast-2'} as const;
export const VOICE_STATS_RETENTION_DAYS=90;
export const VOICE_STATS_LIMITS={deviceHour:30,deviceDay:300,ipHour:120};
const DAY=86400000,HOUR=3600000;
export const voiceStatsStore=(getStoreFn:any)=>getStoreFn({name:'bep-voice-stats',...REGION});
const sha=(x:string)=>createHash('sha256').update(x).digest('hex');
export const dayKey=(ms:number)=>new Date(ms).toISOString().slice(0,10);
export const deviceHash=(token:string)=>sha('voice-dev:'+token).slice(0,24);
export const validDeviceToken=(t:any)=>typeof t==='string'&&/^[A-Za-z0-9_-]{24,64}$/.test(t);
function fail(vi:string,en:string,status:number,code?:string):never{throw Object.assign(new Error(vi),{status,en,code})}
async function* listKeys(store:any,prefix:string){for await(const page of store.list({prefix,paginate:true}))for(const b of page.blobs)yield b.key as string}
async function readJSON(store:any,key:string){try{return await store.get(key,{type:'json'})}catch{return null}}

// Same rules as the app (voice-stats.ts), repeated here so a modified client cannot
// store e-mails, links or phone numbers. Member names are removed on the device.
export function redactText(text:any){
 let t=String(text??'').normalize('NFC');
 t=t.replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g,' [email] ');
 t=t.replace(/\b(?:https?:\/\/|www\.)\S+/gi,' [link] ');
 t=t.replace(/\+?\(?\d[\d\s().-]{6,}\d/g,(m:string)=>m.replace(/\D/g,'').length>=7?' [số] ':m);
 t=t.replace(/\b\d{5,}\b/g,' [số] ');
 return t.replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim();
}
const PLACEHOLDER=/^\[(tên|số|email|link)\]$/;
const phrase=(v:any,max:number)=>{const r=redactText(v).toLowerCase().slice(0,max).trim();return r&&!PLACEHOLDER.test(r)?r:''};
export function sanitizeEvent(b:any,now:number){
 if(!b||typeof b!=='object'||Array.isArray(b))fail('Dữ liệu không hợp lệ.','Invalid data.',400);
 for(const k of Object.keys(b))if(/audio|wav|pcm|blob|base64|sound/i.test(k))fail('Không nhận âm thanh.','Audio is not accepted.',400,'audio');
 const ts=Date.parse(b.ts);const at=Number.isFinite(ts)&&Math.abs(ts-now)<2*DAY?ts:now;
 const lang=['vi','en','auto'].includes(b.lang)?b.lang:'auto';
 const recognizer=String(b.recognizer||'typed').replace(/[^a-z0-9-]/gi,'').toLowerCase().slice(0,30)||'typed';
 const unrecognised:string[]=[];for(const x of Array.isArray(b.unrecognised)?b.unrecognised.slice(0,40):[]){const p=phrase(x,40);if(p&&!unrecognised.includes(p))unrecognised.push(p);if(unrecognised.length>=20)break}
 const corrections:any[]=[];for(const c of Array.isArray(b.corrections)?b.corrections.slice(0,20):[]){const p=phrase(c?.phrase,60),id=String(c?.id||'');if(!p||!/^[A-Za-z0-9_-]{1,60}$/.test(id))continue;corrections.push({phrase:p,id,kind:c?.kind==='recipe'?'recipe':'ingredient'});if(corrections.length>=10)break}
 const household=typeof b.household==='string'&&/^[a-f0-9]{16,64}$/.test(b.household)?b.household.slice(0,24):null;
 return{ts:new Date(at).toISOString(),lang,recognizer,kind:b.kind==='meal'?'meal':'shopping',transcript:redactText(b.transcript).slice(0,300),unrecognised,corrections,items:Math.max(0,Math.min(100,b.items|0)),household};
}
export async function rate(getStoreFn:any,who:string,max:number,windowMs:number,now:number){
 const key=`rate/${sha(who).slice(0,24)}:${Math.floor(now/windowMs)}`;
 await editRecord(voiceStatsStore(getStoreFn),key,(n:any)=>{if((n?.count||0)>=max)fail('Gửi quá nhiều. Thử lại sau.','Too many submissions. Try later.',429,'rate');return{count:(n?.count||0)+1,expires:now+2*windowMs}});
}
export async function submitEvent(getStoreFn:any,{token,ip='unknown',body,now=Date.now()}:any){
 if(!validDeviceToken(token))fail('Thiếu mã thiết bị.','Missing device token.',401,'device');
 const dev=deviceHash(token);
 await rate(getStoreFn,'dev-h:'+dev,VOICE_STATS_LIMITS.deviceHour,HOUR,now);
 await rate(getStoreFn,'dev-d:'+dev,VOICE_STATS_LIMITS.deviceDay,DAY,now);
 await rate(getStoreFn,'ip-h:'+ip,VOICE_STATS_LIMITS.ipHour,HOUR,now);
 const ev=sanitizeEvent(body,now);
 const key=`ev/${dev}/${dayKey(now)}/${String(now).padStart(13,'0')}-${randomBytes(4).toString('hex')}`;
 await voiceStatsStore(getStoreFn).setJSON(key,ev,{onlyIfNew:true});
 await maybePrune(getStoreFn,now);
 return{ok:true};
}
export async function forgetDevice(getStoreFn:any,token:string){
 if(!validDeviceToken(token))fail('Thiếu mã thiết bị.','Missing device token.',401,'device');
 const store=voiceStatsStore(getStoreFn),dev=deviceHash(token);let deleted=0;
 for await(const k of listKeys(store,`ev/${dev}/`)){await store.delete(k);deleted++}
 return{deleted};
}
export async function prune(getStoreFn:any,now=Date.now(),budget=1000){
 const store=voiceStatsStore(getStoreFn),cutoff=dayKey(now-VOICE_STATS_RETENTION_DAYS*DAY);let removed=0;
 for await(const k of listKeys(store,'ev/')){if(removed>=budget)break;if(k.split('/')[2]<cutoff){await store.delete(k);removed++}}
 for await(const k of listKeys(store,'rate/')){if(removed>=budget)break;const r=await readJSON(store,k);if(!r||r.expires<now){await store.delete(k);removed++}}
 try{await store.setJSON('meta/prune',{at:new Date(now).toISOString(),removed})}catch{}
 return removed;
}
async function maybePrune(getStoreFn:any,now:number){try{const m=await readJSON(voiceStatsStore(getStoreFn),'meta/prune');if(!m?.at||now-Date.parse(m.at)>6*HOUR)await prune(getStoreFn,now,300)}catch{}}

// ---------- Studio aggregation ----------
const top=(m:Map<string,any>,n:number)=>[...m.values()].sort((a,b)=>b.count-a.count||b.devices.size-a.devices.size||String(a.phrase).localeCompare(String(b.phrase))).slice(0,n).map(x=>({...x,devices:x.devices.size}));
export async function aggregate(getStoreFn:any,{days=30,now=Date.now(),limit=25,max=20000}:any={}){
 days=Math.max(1,Math.min(VOICE_STATS_RETENTION_DAYS,days|0||30));
 const store=voiceStatsStore(getStoreFn),from=dayKey(now-(days-1)*DAY);
 const byLang:any={vi:0,en:0,auto:0},rec=new Map<string,any>(),unrec:any={vi:new Map(),en:new Map(),auto:new Map()},corr=new Map<string,any>();
 const devices=new Set<string>(),households=new Set<string>();let total=0,withUnrec=0,withCorr=0,scanned=0;
 for await(const k of listKeys(store,'ev/')){
  const [,dev,day]=k.split('/');if(day<from)continue;if(++scanned>max)break;
  const e=await readJSON(store,k);if(!e)continue;total++;devices.add(dev);if(e.household)households.add(e.household);
  const lang=['vi','en'].includes(e.lang)?e.lang:'auto';byLang[lang]++;
  const r=rec.get(e.recognizer)||{id:e.recognizer,count:0,withUnrecognised:0,withCorrections:0};r.count++;
  if(e.unrecognised?.length){withUnrec++;r.withUnrecognised++}
  if(e.corrections?.length){withCorr++;r.withCorrections++}
  rec.set(e.recognizer,r);
  for(const p of e.unrecognised||[]){const m=unrec[lang],x=m.get(p)||{phrase:p,count:0,devices:new Set()};x.count++;x.devices.add(dev);m.set(p,x)}
  for(const c of e.corrections||[]){const key=c.kind+'|'+c.phrase+'|'+c.id,x=corr.get(key)||{phrase:c.phrase,id:c.id,kind:c.kind,lang,count:0,devices:new Set()};x.count++;x.devices.add(dev);corr.set(key,x)}
 }
 const rate=(n:number,d:number)=>d?Math.round(n/d*1000)/1000:null;
 return{computedAt:new Date(now).toISOString(),days,total,devices:devices.size,households:households.size,byLang,
  rates:{unrecognised:rate(withUnrec,total),corrected:rate(withCorr,total)},
  recognizers:[...rec.values()].sort((a,b)=>b.count-a.count).map(r=>({...r,share:rate(r.count,total),unrecognisedRate:rate(r.withUnrecognised,r.count),correctionRate:rate(r.withCorrections,r.count)})),
  unrecognised:{vi:top(unrec.vi,limit),en:top(unrec.en,limit),auto:top(unrec.auto,limit)},
  corrections:top(corr,limit),truncated:scanned>max,retentionDays:VOICE_STATS_RETENTION_DAYS};
}
// "Add as synonym" suggestions for the voice lexicon. Review before adding: nothing is applied automatically.
export function suggestions(agg:any){
 return{format:'bep-voice-synonyms',version:1,generatedAt:agg.computedAt,days:agg.days,
  note:'Suggestions only. Review each phrase before adding it as a synonym; nothing is applied automatically.',
  synonyms:agg.corrections.map((c:any)=>({phrase:c.phrase,id:c.id,kind:c.kind,lang:c.lang,count:c.count,devices:c.devices})),
  unrecognised:['vi','en','auto'].flatMap(l=>agg.unrecognised[l].map((u:any)=>({phrase:u.phrase,lang:l,count:u.count,devices:u.devices})))};
}
