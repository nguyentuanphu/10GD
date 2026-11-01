// Anonymous usage statistics (v1.7): validation, daily rollups, forget, retention and the
// Studio aggregation. ON by default with an opt-out in the app ("Cài đặt khác"), and a
// Studio platform switch (flags.usageAnalytics) that stops collection for everyone.
//
// What is stored is a DAILY ROLLUP per install (and through it per account / family),
// never an event log, never recipe content, names, free text, search terms, voice,
// prices, IP addresses, cities or coordinates.
//
// Store `bep-usage` (JSON):
//   d/<YYYY-MM-DD>/<installHash>   one rollup per install per (device-local) day:
//        {day,i,acct,fam,secs,sessions,hours[24] (seconds),features{id:n},platform,standalone,ver,lang,
//         loc:{pc,st}|null (family's Price Scout postcode → state), net:{c,r}|null (country, state/subdivision)}
//   inst/<installHash>             {first,last,days[],batches[],acct,fam} — forget index + batch de-duplication
//   rate/<hash>:<bucket>           short-lived rate counters (expire after 2 windows)
//   cache/overview-<days>          Studio summary, 60 s
//   meta/prune                     last retention sweep
// installHash = sha256('usage-inst:'+install)[0..24]; the random install id itself is never stored.
// Account and family come ONLY from the request's session cookie (never from the client body).
// Retention: 13 months (daily scheduled cleanup + opportunistic sweep on ingest).
import {createHash} from 'node:crypto';
import {editRecord} from './accounts.mjs';
import {postcodeToState} from './geo-resolver.mjs';
import {listFamilies,mapLimit,PARALLEL} from './studio.mjs';

const REGION={consistency:'strong',region:'ap-southeast-2'} as const;
export const USAGE_RETENTION_MONTHS=13;
export const USAGE_FEATURES=['today','plan','shopping','library','pantry','recipe-edit','voice','price-scout','community-price','offline-download','family-connect','reminders','spending','insights','settings'] as const;
export const USAGE_LIMITS={installHour:30,ipHour:600,bytes:8000,days:14,maxFeature:2000};
export const USAGE_OVERVIEW_TTL=60000;
const DAY=86400000,HOUR=3600000;
export const usageStore=(getStoreFn:any)=>getStoreFn({name:'bep-usage',...REGION});
const sha=(x:string)=>createHash('sha256').update(x).digest('hex');
export const installHash=(install:string)=>sha('usage-inst:'+install).slice(0,24);
export const validInstall=(t:any)=>typeof t==='string'&&/^[A-Za-z0-9_-]{24,64}$/.test(t);
export const dayKey=(ms:number)=>new Date(ms).toISOString().slice(0,10);
export const sydneyDay=(ms:number)=>new Intl.DateTimeFormat('en-CA',{timeZone:'Australia/Sydney',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(ms));
const dayMs=(d:string)=>Date.parse(d+'T00:00:00Z');
const addDays=(d:string,n:number)=>dayKey(dayMs(d)+n*DAY);
export function retentionCutoff(now:number){const d=new Date(dayMs(sydneyDay(now)));d.setUTCMonth(d.getUTCMonth()-USAGE_RETENTION_MONTHS);return dayKey(d.getTime())}
function fail(vi:string,en:string,status:number,code?:string):never{throw Object.assign(new Error(vi),{status,en,code})}
async function* listKeys(store:any,prefix:string){for await(const page of store.list({prefix,paginate:true}))for(const b of page.blobs)yield b.key as string}
async function listAll(store:any,prefix:string){const out:string[]=[];for await(const k of listKeys(store,prefix))out.push(k);return out}
async function readJSON(store:any,key:string){try{return await store.get(key,{type:'json'})}catch{return null}}

// ---------- validation (strict whitelist: unknown fields are refused, not dropped) ----------
const TOP=new Set(['v','install','batch','ver','lang','platform','standalone','postcode','days']);
const DAYF=new Set(['day','secs','sessions','hours','features']);
const FEAT=new Set<string>(USAGE_FEATURES);
const isInt=(n:any,min:number,max:number)=>Number.isInteger(n)&&n>=min&&n<=max;
const bad=(what:string):never=>fail('Dữ liệu thống kê không hợp lệ.','Invalid usage data: '+what,400,'invalid');
export function validateBatch(b:any,now:number){
 if(!b||typeof b!=='object'||Array.isArray(b))bad('body');
 for(const k of Object.keys(b))if(!TOP.has(k))bad('field '+k.slice(0,20));
 if(b.v!==1)bad('v');
 if(!validInstall(b.install))fail('Thiếu mã cài đặt.','Missing install id.',401,'install');
 if(typeof b.batch!=='string'||!/^[A-Za-z0-9_-]{8,40}$/.test(b.batch))bad('batch');
 if(b.ver!==undefined&&(typeof b.ver!=='string'||!/^[\w.\/-]{1,40}$/.test(b.ver)))bad('ver');
 if(b.lang!==undefined&&!['vi','en'].includes(b.lang))bad('lang');
 if(b.platform!==undefined&&!['mobile','tablet','desktop'].includes(b.platform))bad('platform');
 if(b.standalone!==undefined&&typeof b.standalone!=='boolean')bad('standalone');
 if(b.postcode!==undefined&&b.postcode!==null&&(typeof b.postcode!=='string'||!/^\d{4}$/.test(b.postcode)))bad('postcode');
 if(!Array.isArray(b.days)||!b.days.length||b.days.length>USAGE_LIMITS.days)bad('days');
 const today=sydneyDay(now),min=addDays(today,-USAGE_LIMITS.days),max=addDays(today,1),seen=new Set<string>();
 const days=b.days.map((d:any)=>{
  if(!d||typeof d!=='object'||Array.isArray(d))bad('day');
  for(const k of Object.keys(d))if(!DAYF.has(k))bad('day field '+k.slice(0,20));
  if(typeof d.day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(d.day)||Number.isNaN(dayMs(d.day))||d.day<min||d.day>max||seen.has(d.day))bad('day');seen.add(d.day);
  if(!isInt(d.secs,0,86400))bad('secs');
  if(!isInt(d.sessions,0,500))bad('sessions');
  if(!Array.isArray(d.hours)||d.hours.length!==24||!d.hours.every((h:any)=>isInt(h,0,3600)))bad('hours');
  const features:Record<string,number>={};
  if(d.features!==undefined){if(!d.features||typeof d.features!=='object'||Array.isArray(d.features))bad('features');
   for(const [k,n] of Object.entries(d.features)){if(!FEAT.has(k))bad('feature '+k.slice(0,20));if(!isInt(n,0,USAGE_LIMITS.maxFeature))bad('feature count');if(n)features[k]=n as number}}
  return{day:d.day,secs:d.secs,sessions:d.sessions,hours:d.hours.slice(),features};
 });
 const pc=b.postcode?postcodeToState(b.postcode):null;
 return{install:b.install,batch:b.batch,ver:b.ver||null,lang:b.lang||null,platform:b.platform||null,standalone:b.standalone===true,loc:pc?.valid?{pc:pc.postcode,st:pc.state}:null,days};
}
// Network location: country and state/subdivision ONLY, from the hosting request geo context
// (function context.geo or the x-nf-geo header). City, coordinates, timezone and IP are dropped here.
export function networkGeo(request:Request,context?:any){
 let g:any=context?.geo||null;
 if(!g){const h=request.headers.get('x-nf-geo');if(h){try{g=JSON.parse(Buffer.from(h,'base64').toString('utf8'))}catch{try{g=JSON.parse(h)}catch{g=null}}}}
 const c=String(g?.country?.code||'').toUpperCase(),r=String(g?.subdivision?.code||'').toUpperCase();
 if(!/^[A-Z]{2}$/.test(c))return null;
 return{c,r:/^[A-Z0-9]{1,3}$/.test(r)?r:null};
}
// Precedence in reports: family postcode if set, else network.
export function locationOf(row:any){
 if(row?.loc?.pc)return{country:'AU',state:row.loc.st||null,postcode:row.loc.pc,source:'postcode'};
 if(row?.net?.c)return{country:row.net.c,state:row.net.r||null,postcode:null,source:'network'};
 return{country:null,state:null,postcode:null,source:'unknown'};
}

// ---------- rollup merge ----------
export function mergeRollup(cur:any,add:any,meta:any){
 const base=cur||{day:add.day,i:meta.i,secs:0,sessions:0,hours:new Array(24).fill(0),features:{}};
 const hours=base.hours.map((h:number,i:number)=>Math.min(3600,h+(add.hours[i]||0)));
 const features={...base.features};for(const [k,n] of Object.entries(add.features||{}))features[k]=Math.min(100000,(features[k]||0)+(n as number));
 return{day:add.day,i:meta.i,acct:meta.acct??base.acct??null,fam:meta.fam??base.fam??null,secs:Math.min(86400,base.secs+add.secs),sessions:Math.min(2000,base.sessions+add.sessions),hours,features,
  platform:meta.platform||base.platform||null,standalone:meta.standalone??base.standalone??false,ver:meta.ver||base.ver||null,lang:meta.lang||base.lang||null,
  loc:meta.loc||base.loc||null,net:meta.net||base.net||null,updatedAt:new Date(meta.now).toISOString()};
}
export async function rate(getStoreFn:any,who:string,max:number,windowMs:number,now:number){
 const key=`rate/${sha('usage-rate:'+who).slice(0,24)}:${Math.floor(now/windowMs)}`;
 await editRecord(usageStore(getStoreFn),key,(n:any)=>{if((n?.count||0)>=max)fail('Gửi quá nhiều. Thử lại sau.','Too many submissions. Try later.',429,'rate');return{count:(n?.count||0)+1,expires:now+2*windowMs}});
}
export async function ingest(getStoreFn:any,{body,account=null,family=null,net=null,ip='unknown',now=Date.now()}:any){
 const install=validInstall(body?.install)?body.install:'';
 if(!install)fail('Thiếu mã cài đặt.','Missing install id.',401,'install');
 const ih=installHash(install);
 await rate(getStoreFn,'inst:'+ih,USAGE_LIMITS.installHour,HOUR,now);
 await rate(getStoreFn,'ip:'+ip,USAGE_LIMITS.ipHour,HOUR,now);
 const b=validateBatch(body,now),store=usageStore(getStoreFn);
 // Claim the batch id first so a page-hide beacon and a later retry of the same batch count once.
 let duplicate=false;
 await editRecord(store,'inst/'+ih,(x:any)=>{const cur=x||{first:null,last:null,days:[],batches:[]};if(cur.batches.includes(b.batch)){duplicate=true;return undefined}
  const days=[...new Set([...cur.days,...b.days.map((d:any)=>d.day)])].sort().slice(-420);
  return{...cur,i:ih,first:cur.first&&cur.first<days[0]?cur.first:days[0],last:days[days.length-1]>(cur.last||'')?days[days.length-1]:cur.last,days,batches:[...cur.batches,b.batch].slice(-50),acct:account||cur.acct||null,fam:family||cur.fam||null,updatedAt:new Date(now).toISOString()}});
 if(duplicate)return{ok:true,duplicate:true};
 const meta={i:ih,acct:account,fam:family,platform:b.platform,standalone:b.standalone,ver:b.ver,lang:b.lang,loc:b.loc,net,now};
 for(const d of b.days)await editRecord(store,`d/${d.day}/${ih}`,(cur:any)=>mergeRollup(cur,d,meta));
 await maybePrune(getStoreFn,now);
 return{ok:true,days:b.days.length};
}
export async function forgetInstall(getStoreFn:any,install:any){
 if(!validInstall(install))fail('Thiếu mã cài đặt.','Missing install id.',401,'install');
 const store=usageStore(getStoreFn),ih=installHash(install),idx=await readJSON(store,'inst/'+ih);let deleted=0;
 for(const day of idx?.days||[]){await store.delete(`d/${day}/${ih}`);deleted++}
 await store.delete('inst/'+ih);
 return{deleted};
}
export async function prune(getStoreFn:any,now=Date.now(),budget=5000){
 const store=usageStore(getStoreFn),cutoff=retentionCutoff(now);let removed=0;
 for await(const k of listKeys(store,'d/')){if(removed>=budget)break;if(k.split('/')[1]<cutoff){await store.delete(k);removed++}}
 for await(const k of listKeys(store,'inst/')){if(removed>=budget)break;const r=await readJSON(store,k);if(!r)continue;
  if(!r.last||r.last<cutoff){await store.delete(k);removed++;continue}
  if(r.days?.some((d:string)=>d<cutoff))try{await editRecord(store,k,(x:any)=>x?{...x,days:x.days.filter((d:string)=>d>=cutoff),first:x.days.find((d:string)=>d>=cutoff)||x.last}:undefined)}catch{}}
 for await(const k of listKeys(store,'rate/')){if(removed>=budget)break;const r=await readJSON(store,k);if(!r||r.expires<now){await store.delete(k);removed++}}
 try{await store.setJSON('meta/prune',{at:new Date(now).toISOString(),removed,cutoff})}catch{}
 return{removed,cutoff};
}
async function maybePrune(getStoreFn:any,now:number){try{const m=await readJSON(usageStore(getStoreFn),'meta/prune');if(!m?.at||now-Date.parse(m.at)>12*HOUR)await prune(getStoreFn,now,300)}catch{}}

// ---------- Studio aggregation ----------
async function rowsFor(getStoreFn:any,days:string[]){
 const store=usageStore(getStoreFn);
 const lists=await mapLimit(days,PARALLEL,d=>listAll(store,`d/${d}/`));
 const keys=lists.flat();
 return (await mapLimit(keys,PARALLEL,k=>readJSON(store,k))).filter(Boolean);
}
const userOf=(r:any)=>r.acct?'a:'+r.acct:'i:'+r.i;
const weekStart=(d:string)=>{const ms=dayMs(d),wd=(new Date(ms).getUTCDay()+6)%7;return dayKey(ms-wd*DAY)};
const inc=(m:Map<string,any>,k:string,init:()=>any)=>{let v=m.get(k);if(!v){v=init();m.set(k,v)}return v};
export async function computeOverview(getStoreFn:any,{days=30,now=Date.now()}:any={}){
 days=[7,30,90].includes(days)?days:30;
 const today=sydneyDay(now),span=Math.max(days,56),list=Array.from({length:span},(_,i)=>addDays(today,-i)),from=addDays(today,-(days-1));
 const store=usageStore(getStoreFn);
 const [rows,instKeys,families]=await Promise.all([rowsFor(getStoreFn,list),listAll(store,'inst/'),listFamilies(getStoreFn).catch(()=>[])]);
 const inst=(await mapLimit(instKeys,PARALLEL,k=>readJSON(store,k))).filter(Boolean);
 const inWin=rows.filter((r:any)=>r.day>=from&&r.day<=today);
 // per user-day
 const ud=new Map<string,{secs:number,sessions:number}>();
 for(const r of inWin){const x=inc(ud,r.day+'|'+userOf(r),()=>({secs:0,sessions:0}));x.secs+=r.secs;x.sessions+=r.sessions}
 const usersOn=(d1:string,d2:string)=>new Set(rows.filter((r:any)=>r.day>=d1&&r.day<=d2).map(userOf)).size;
 const series=Array.from({length:days},(_,i)=>addDays(from,i)).map(d=>{const rs=inWin.filter((r:any)=>r.day===d);return{day:d,users:new Set(rs.map(userOf)).size,sessions:rs.reduce((n:number,r:any)=>n+r.sessions,0),minutes:Math.round(rs.reduce((n:number,r:any)=>n+r.secs,0)/60)}});
 const totalSecs=inWin.reduce((n:number,r:any)=>n+r.secs,0),totalSessions=inWin.reduce((n:number,r:any)=>n+r.sessions,0);
 const activeDays=series.filter(s=>s.users>0).length;
 // weekday × hour heatmap (minutes), Monday first
 const heat=Array.from({length:7},()=>new Array(24).fill(0));
 for(const r of inWin){const wd=(new Date(dayMs(r.day)).getUTCDay()+6)%7;r.hours.forEach((s:number,h:number)=>{heat[wd][h]+=s})}
 const heatmap=heat.map(row=>row.map(s=>Math.round(s/60)));
 const hourTotals=new Array(24).fill(0);heat.forEach(row=>row.forEach((s,h)=>hourTotals[h]+=s));
 const peakHours=hourTotals.map((s,h)=>({hour:h,minutes:Math.round(s/60)})).filter(x=>x.minutes>0).sort((a,b)=>b.minutes-a.minutes||a.hour-b.hour).slice(0,3);
 // features
 const feat=new Map<string,any>();
 for(const r of inWin)for(const [k,n] of Object.entries(r.features||{})){const f=inc(feat,k,()=>({id:k,count:0,users:new Set(),families:new Set()}));f.count+=n as number;f.users.add(userOf(r));if(r.fam)f.families.add(r.fam)}
 const features=USAGE_FEATURES.map(id=>{const f=feat.get(id);return{id,count:f?.count||0,users:f?.users.size||0,families:f?.families.size||0}}).sort((a,b)=>b.count-a.count||a.id.localeCompare(b.id));
 // latest row per user in the window: location, platform, version, language
 const latest=new Map<string,any>();for(const r of inWin){const u=userOf(r),cur=latest.get(u);if(!cur||r.day>cur.day||r.day===cur.day&&(r.updatedAt||'')>(cur.updatedAt||''))latest.set(u,r)}
 const loc=new Map<string,any>();
 for(const r of latest.values()){const l=locationOf(r),k=[l.source,l.country,l.state,l.postcode].join('|');const x=inc(loc,k,()=>({...l,users:0,families:new Set()}));x.users++;if(r.fam)x.families.add(r.fam)}
 const locations=[...loc.values()].map(x=>({...x,families:x.families.size})).sort((a,b)=>b.users-a.users||String(a.state).localeCompare(String(b.state))||String(a.postcode).localeCompare(String(b.postcode)));
 const split=(f:(r:any)=>string)=>{const m=new Map<string,number>();for(const r of latest.values()){const k=f(r);m.set(k,(m.get(k)||0)+1)}return [...m.entries()].map(([id,users])=>({id,users})).sort((a,b)=>b.users-a.users||a.id.localeCompare(b.id))};
 // weekly retention cohorts (last 8 weeks): cohort = week of a user's first use (from the install index)
 const firstByUser=new Map<string,string>();
 for(const x of inst){if(!x.first||!x.i)continue;const u=x.acct?'a:'+x.acct:'i:'+x.i;const f=firstByUser.get(u);if(!f||x.first<f)firstByUser.set(u,x.first)}
 const activeWeeks=new Map<string,Set<string>>();for(const r of rows){const u=userOf(r);inc(activeWeeks,u,()=>new Set()).add(weekStart(r.day))}
 const thisWeek=weekStart(today),weeks=Array.from({length:8},(_,i)=>addDays(thisWeek,-7*(7-i)));
 const cohorts=weeks.map((w,ci)=>{const members=[...firstByUser.entries()].filter(([,f])=>weekStart(f)===w).map(([u])=>u);
  const retention=weeks.slice(ci).map((w2)=>members.length?Math.round(members.filter(u=>activeWeeks.get(u)?.has(w2)).length/members.length*1000)/1000:null);
  return{week:w,size:members.length,retention}});
 // inactive families (no use in 14 / 30 days, or never)
 const famLast=new Map<string,string>();for(const x of inst){if(x.fam&&x.last&&(!famLast.has(x.fam)||x.last>famLast.get(x.fam)!))famLast.set(x.fam,x.last)}
 const famIds=families.map((f:any)=>f.id),c14=addDays(today,-13),c30=addDays(today,-29);
 const inactive={families:famIds.length,active14:famIds.filter((id:string)=>(famLast.get(id)||'')>=c14).length,inactive14:famIds.filter((id:string)=>(famLast.get(id)||'')<c14).length,inactive30:famIds.filter((id:string)=>(famLast.get(id)||'')<c30).length,never:famIds.filter((id:string)=>!famLast.has(id)).length};
 const userDays=ud.size;
 return{computedAt:new Date(now).toISOString(),days,today,from,
  kpis:{dau:usersOn(today,today),wau:usersOn(addDays(today,-6),today),mau:usersOn(addDays(today,-29),today),
   accounts:new Set(inWin.filter((r:any)=>r.acct).map((r:any)=>r.acct)).size,anonymous:new Set(inWin.filter((r:any)=>!r.acct).map((r:any)=>r.i)).size,
   families:new Set(inWin.filter((r:any)=>r.fam).map((r:any)=>r.fam)).size,
   avgMinutesPerUserDay:userDays?Math.round(totalSecs/userDays/60*10)/10:0,sessionsPerDay:Math.round(totalSessions/days*10)/10,sessions:totalSessions,minutes:Math.round(totalSecs/60),activeDays},
  series,heatmap,peakHours,features,cohorts,inactive,locations,
  platforms:split(r=>(r.platform||'unknown')+'|'+(r.standalone?'app':'browser')),versions:split(r=>r.ver||'unknown'),languages:split(r=>r.lang||'unknown'),
  retentionMonths:USAGE_RETENTION_MONTHS};
}
export async function overview(getStoreFn:any,{days=30,fresh=false,now=Date.now()}:any={}){
 days=[7,30,90].includes(days)?days:30;const store=usageStore(getStoreFn),key='cache/overview-'+days;
 if(!fresh){const c=await readJSON(store,key);if(c?.computedAt&&now-Date.parse(c.computedAt)<USAGE_OVERVIEW_TTL&&now>=Date.parse(c.computedAt))return{...c,cached:true}}
 const o=await computeOverview(getStoreFn,{days,now});try{await store.setJSON(key,o)}catch{}return o;
}
// Inactive family list and per-family / per-account detail: owner only, every call audited by the caller.
export async function inactiveFamilies(getStoreFn:any,{threshold=14,now=Date.now()}:any={}){
 const store=usageStore(getStoreFn),today=sydneyDay(now),cut=addDays(today,-(threshold-1));
 const [families,keys]=await Promise.all([listFamilies(getStoreFn),listAll(store,'inst/')]);
 const inst=(await mapLimit(keys,PARALLEL,k=>readJSON(store,k))).filter(Boolean),last=new Map<string,string>();
 for(const x of inst)if(x.fam&&x.last&&(!last.has(x.fam)||x.last>last.get(x.fam)!))last.set(x.fam,x.last);
 return families.filter((f:any)=>(last.get(f.id)||'')<cut).map((f:any)=>({id:f.id,name:f.name||'',members:Object.keys(f.members||{}).length,createdAt:f.createdAt||null,lastSeen:last.get(f.id)||null})).sort((a:any,b:any)=>String(b.lastSeen||'').localeCompare(String(a.lastSeen||''))||a.name.localeCompare(b.name));
}
export async function detail(getStoreFn:any,{family=null,account=null,days=90,now=Date.now()}:any){
 const today=sydneyDay(now),list=Array.from({length:days},(_,i)=>addDays(today,-i));
 const rows=(await rowsFor(getStoreFn,list)).filter((r:any)=>family?r.fam===family:r.acct===account);
 const byDay=new Map<string,any>();
 for(const r of rows){const x=inc(byDay,r.day,()=>({day:r.day,minutes:0,sessions:0,installs:0,features:{} as any}));x.minutes+=r.secs/60;x.sessions+=r.sessions;x.installs++;for(const [k,n] of Object.entries(r.features||{}))x.features[k]=(x.features[k]||0)+(n as number)}
 const last=rows.reduce((a:any,r:any)=>!a||r.day>a.day?r:a,null);
 return{days,rows:[...byDay.values()].map(x=>({...x,minutes:Math.round(x.minutes)})).sort((a,b)=>b.day.localeCompare(a.day)),
  installs:new Set(rows.map((r:any)=>r.i)).size,location:last?locationOf(last):null,platform:last?.platform||null,ver:last?.ver||null,lang:last?.lang||null};
}
