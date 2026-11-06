// v1.7.7 (owner, 6 Nov 2026: "Run price online bị fail nhiều lần… giá online trên app không hiện"): a full refresh makes about
// 28 Pinch basket calls and up to 6 paced WhichGrocer calls (5 s apart) — more than a minute, longer than a normal server
// request may run, so "Run now" and the 06:xx schedule were cut off ("Request failed") and nothing was ever saved.
// The refresh now runs in a background function (online-prices-background, up to 15 minutes). Studio and the schedule
// only start it: they leave a one-time token in the price cache and call the background function with it.
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {refreshOnlinePrices} from './online-prices.mjs';
import {cycleId,sydneyDate} from './grocery-pricing.mjs';
export const ONLINE_RUN_KEY='online-prices/run';
const TOKEN_TTL=5*60000,RUN_STALE=20*60000;
/** Current run state: {running, startedAt, by, finishedAt?, error?} or null. A run older than 20 min counts as ended. */
export async function runState(cache:any,now=Date.now()){let r:any=null;try{r=await cache.get(ONLINE_RUN_KEY,{type:'json'})}catch{}if(!r)return null;
 const running=r.running===true&&now-Date.parse(r.startedAt||0)<RUN_STALE;return{running,startedAt:r.startedAt||null,by:r.by||null,finishedAt:r.finishedAt||null,error:r.error||null}}
/** Starts a background refresh. Returns {started} or {running} when one is already going. */
export async function startOnlineRun({cache,origin,by='schedule',fetchFn=fetch,now=Date.now()}:any){const cur=await runState(cache,now);if(cur?.running)return{running:true,startedAt:cur.startedAt};
 const token=randomBytes(24).toString('hex'),at=new Date(now).toISOString();
 await cache.setJSON(ONLINE_RUN_KEY,{running:true,startedAt:at,by,token,tokenAt:now});
 const res=await fetchFn(String(origin).replace(/\/$/,'')+'/.netlify/functions/online-prices-background',{method:'POST',headers:{'x-online-run':token,'Content-Type':'application/json'},body:'{}'}).catch((e:any)=>({ok:false,status:0,err:e}));
 if(!res||!(res.ok||res.status===202)){await cache.setJSON(ONLINE_RUN_KEY,{running:false,startedAt:at,by,finishedAt:new Date(now).toISOString(),error:'start-failed-'+(res?.status??0)});return{started:false,error:'start-failed'}}
 return{started:true,startedAt:at}}
/** The background function: checks the one-time token, runs the refresh, records the end. */
export async function runOnlineInBackground({cache,token,items,env,settings,fetchFn=fetch,now=()=>Date.now()}:any){let r:any=null;try{r=await cache.get(ONLINE_RUN_KEY,{type:'json'})}catch{}
 const want=String(r?.token||''),got=String(token||'');
 if(!want||want.length!==got.length||!timingSafeEqual(Buffer.from(want),Buffer.from(got))||now()-(r.tokenAt||0)>TOKEN_TTL)return{refused:true};
 await cache.setJSON(ONLINE_RUN_KEY,{running:true,startedAt:r.startedAt,by:r.by});// token used once
 const today=sydneyDate(new Date(now()));let status:any=null,error:string|null=null;
 try{status=await refreshOnlinePrices({items,env,settings,fetchFn,cacheStore:cache,statusStore:cache,cycle:cycleId(today),today})}catch(e:any){error=String(e?.message||e).slice(0,120)}
 await cache.setJSON(ONLINE_RUN_KEY,{running:false,startedAt:r.startedAt,by:r.by,finishedAt:new Date(now()).toISOString(),error});
 return{status,error}}
