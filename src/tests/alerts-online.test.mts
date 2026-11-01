import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import webPush from 'web-push';
import {accountFixture,memoryStores} from './helpers/accounts.mjs';
import {createFamilyHandler} from '../netlify/functions/family.mjs';
import {sendPushBatch,pushOptions,URGENT_TTL} from '../netlify/lib/push.mjs';
// v1.7 alerts & online state. Synthetic data only; push transport and network are mocked.

// ---- 1. Connectivity state machine (dist/offline-access.js, loaded like the page loads it, without DOM wiring).
const ctx:any=vm.createContext({setTimeout,clearTimeout,AbortController,crypto:globalThis.crypto,atob,TextEncoder,TextDecoder,Uint8Array,Date,JSON,console,Promise});
vm.runInContext(fs.readFileSync('dist/offline-access.js','utf8'),ctx);
assert.equal(typeof ctx.createConnectivity,'function','connectivity factory is shipped in offline-access.js');
assert.equal(ctx.BepConnectivity,undefined,'no DOM wiring outside a page (service worker / tests)');
function machine({nav=true,ping=async()=>true,hidden=false}={}){
 const env={nav,ping,hidden,changes:[] as any[],timers:[] as {fn:()=>void,ms:number}[]};
 const c=ctx.createConnectivity({ping:()=>env.ping(),navigatorOnline:()=>env.nav,hidden:()=>env.hidden,confirmDelays:[5,5],backoff:[50,100],onChange:(s:any)=>env.changes.push({...s}),
  setTimeout:(fn:()=>void,ms:number)=>{if(ms<=10)return setTimeout(fn,0);env.timers.push({fn,ms});return env.timers.length},clearTimeout:(id:number)=>{if(typeof id==='number'&&env.timers[id-1])env.timers[id-1].fn=()=>{}}});
 return{c,env,runTimers:async()=>{const t=env.timers.splice(0);for(const x of t)x.fn();await new Promise(r=>setTimeout(r,30))}};
}
{
 // A single failed request (TypeError) is confirmed by the health ping: the ping works, so we stay online.
 let pings=0;const {c,env}=machine({ping:async()=>{pings++;return true}});
 assert.equal(c.offline,false);assert.equal(await c.reportFailure('network'),true);assert.equal(c.offline,false);assert.equal(pings,1);assert.equal(env.changes.length,0,'no Offline flicker');
 // A slow request (timeout) or a server error never shows Offline; it is only "degraded" (mild syncing state).
 await c.reportFailure('timeout');assert.equal(c.offline,false);assert.equal(c.degraded,true);
 c.reportSuccess();assert.equal(c.state,'online');
 await c.reportFailure('server');assert.equal(c.offline,false);assert.equal(c.state,'degraded');assert.equal(pings,2,'server errors need no ping (a response proves the network)');
 c.reportSuccess();assert.equal(c.degraded,false);
}
{
 // One failed ping followed by a successful retry: still online.
 let n=0;const {c}=machine({ping:async()=>++n>1});
 assert.equal(await c.reportFailure('network'),true);assert.equal(c.offline,false);assert.equal(n,2);
}
{
 // TypeError + every confirming retry fails = offline; recovery by backoff without any tap.
 let up=false,n=0;const {c,env,runTimers}=machine({ping:async()=>{n++;if(!up)throw new TypeError('Load failed');return true}});
 assert.equal(await c.reportFailure('network'),false);assert.equal(c.offline,true);assert.equal(n,3,'first ping + 2 confirming retries');
 assert.equal(env.changes.at(-1).offline,true);assert.equal(env.timers.length,1,'backoff probe scheduled');assert.equal(env.timers[0].ms,50);
 await runTimers();assert.equal(c.offline,true);assert.equal(env.timers.at(-1)!.ms,100,'backoff grows');
 up=true;await runTimers();assert.equal(c.offline,false,'recovers automatically on the next backoff probe');assert.equal(env.changes.at(-1).recovered,true);
}
{
 // navigator offline event = offline at once; `online` event recovers after a confirming ping.
 const {c,env}=machine();c.wentOffline();assert.equal(c.offline,true);
 env.nav=true;assert.equal(await c.wake(),true);assert.equal(c.offline,false);
 // A ping that fails on `online` keeps Offline (never claim online when truly offline).
 c.wentOffline();env.ping=async()=>false;assert.equal(await c.wake(),false);assert.equal(c.offline,true);
 // visibilitychange visible / pageshow use the same wake(): recovers once the ping works.
 env.ping=async()=>true;assert.equal(await c.wake(),true);assert.equal(c.offline,false);
 // When the browser itself says offline, wake() reports offline immediately.
 env.nav=false;assert.equal(await c.wake(),false);assert.equal(c.offline,true);env.nav=true;await c.wake();
 // While online, wake() does not ping at all.
 let pinged=false;env.ping=async()=>{pinged=true;return true};await c.wake();assert.equal(pinged,false);
}
{
 // Requests aborted while the app is in the background (iOS) are verified once visible, not while hidden.
 let pings=0;const {c,env}=machine({hidden:true,ping:async()=>{pings++;return false}});
 await c.reportFailure('network');assert.equal(c.offline,false);assert.equal(pings,0,'no probe while hidden');
 env.hidden=false;env.ping=async()=>{pings++;return true};assert.equal(await c.wake(),true);assert.equal(pings,1,'deferred check runs on visible');assert.equal(c.offline,false);
}
{
 // Concurrent failures share one verification.
 let pings=0;const {c}=machine({ping:async()=>{pings++;await new Promise(r=>setTimeout(r,10));return true}});
 await Promise.all([c.reportFailure('network'),c.reportFailure('network'),c.reportFailure('timeout')]);assert.equal(pings,1);
}
// The service worker never answers the health ping from cache.
assert.match(fs.readFileSync('dist/sw.js','utf8'),/url\.pathname\s*===\s*'\/health\.json'\)\s*return;/);
assert.equal(JSON.parse(fs.readFileSync('dist/health.json','utf8')).ok,true);
console.log('PASS connectivity: one failure is not offline; TypeError + failed retries = offline; recovery on online/visible/pageshow/backoff; hidden checks deferred');

// ---- 2. Urgent alert: reply as soon as stored, push fan-out in the background, all devices at once, Urgency high.
const base=memoryStores();const getStoreFn=base;
const f=await accountFixture(getStoreFn);
await f.store.setJSON('state',{version:1,members:[{id:'dad',name:'Bố'},{id:'mum',name:'Mẹ'},{id:'kid',name:'Con'},{id:'grandma',name:'Bà'}],recipes:[],weeks:{},pantry:[],preferences:{},receipts:[]});
let gate:()=>void=()=>{};let gatePromise=new Promise<void>(r=>gate=r);let inFlight=0,maxInFlight=0;const sent:any[]=[];let goneEndpoint='';
const pushSend=async(sub:any,payload:string,options:any)=>{inFlight++;maxInFlight=Math.max(maxInFlight,inFlight);try{await gatePromise;if(sub.endpoint===goneEndpoint)throw Object.assign(Error('gone'),{statusCode:410});sent.push({endpoint:sub.endpoint,payload:JSON.parse(payload),options});return{statusCode:201}}finally{inFlight--}};
const handler=createFamilyHandler({getStoreFn,pushSend});
const call=async(op:string,body:any,runtime?:any)=>{const r=await handler(new Request('https://test.example/.netlify/functions/family?op='+op,{method:body?'POST':'GET',headers:{Origin:'https://test.example',Cookie:f.cookie,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}),runtime);return{status:r.status,data:await r.json()}};
const sub=(n:number)=>({endpoint:'https://fcm.googleapis.com/fcm/send/v17-'+n,keys:{auth:'a'.repeat(22),p256dh:'b'.repeat(87)}});
gate();await call('push-key',{});
assert.equal((await call('push-subscribe',{deviceId:'v17-device-01',memberId:'dad',subscription:sub(1)})).status,200);
for(const [n,m] of [[2,'mum'],[3,'kid'],[4,'grandma'],[5,'mum']] as const)assert.equal((await call('push-subscribe',{deviceId:'v17-device-0'+n,memberId:m,subscription:sub(n),shared:true})).status,200);
gatePromise=new Promise<void>(r=>gate=r);
const pending:Promise<any>[]=[];const runtime={waitUntil:(p:Promise<any>)=>pending.push(p)};
const t0=performance.now();let r=await call('alert-send',{id:'v17-alert-000001',fromId:'dad',message:'Tắt bếp giúp mẹ',targets:['mum','kid','grandma']},runtime);const replyMs=performance.now()-t0;
assert.equal(r.status,200);assert.equal(r.data.saved,true);assert.equal(r.data.queued,true);assert.equal(r.data.push.reason,'queued');assert.equal(sent.length,0,'reply arrives before any push completes');assert.equal(pending.length>=1,true,'fan-out handed to waitUntil');
assert.equal(r.data.alert.pushStatus,'pending');
// The message is already listed for the family while the push is still in flight.
assert((await call('alerts',null)).data.alerts.some((a:any)=>a.id==='v17-alert-000001'));
await new Promise(res=>setTimeout(res,20));assert.equal(maxInFlight,4,'all four recipient devices are sent to in parallel');
goneEndpoint=sub(3).endpoint;gate();await Promise.all(pending);
assert.equal(sent.length,3);for(const s of sent){assert.equal(s.options.urgency,'high');assert.equal(s.options.TTL,URGENT_TTL);assert.equal(s.payload.type,'urgent');assert.equal(s.payload.url,'/#today');assert.equal(s.payload.tag,'family-alert-v17-alert-000001')}
assert.equal(await f.store.get('push/subscriptions/v17-device-03'),null,'a 410 Gone subscription is pruned');
const listed=(await call('alerts',null)).data.alerts.find((a:any)=>a.id==='v17-alert-000001');assert.equal(listed.pushStatus,'accepted');assert.equal(listed.pushAccepted,3);
console.log(`PASS alert reply before push fan-out (${replyMs.toFixed(0)} ms, push gated); 4 devices in parallel; Urgency high, TTL ${URGENT_TTL}s; 410 pruned; status recorded after`);
// Same id again = duplicate, no second push.
const before=sent.length;r=await call('alert-send',{id:'v17-alert-000001',fromId:'dad',message:'Tắt bếp giúp mẹ',targets:['mum']},runtime);assert.equal(r.data.duplicate,true);await Promise.all(pending);assert.equal(sent.length,before,'no double send');
// A recipient this server does not know yet is reported precisely (the app syncs once and resends the same id).
r=await call('alert-send',{id:'v17-alert-000002',fromId:'dad',message:'x',targets:['new-member']},runtime);assert.equal(r.status,400);assert.equal(r.data.reason,'unknown_member');
// Without a background mechanism the handler still completes push before replying (older runtimes, tests).
r=await call('alert-send',{id:'v17-alert-000003',fromId:'dad',message:'Không có waitUntil',targets:['mum']});assert.equal(r.status,200);assert.equal(r.data.push.reason,'sent');assert.equal(r.data.alert.pushStatus,'accepted');
console.log('PASS duplicate id is not re-pushed; unknown_member reason; synchronous fallback without waitUntil');

// ---- 3. sendPushBatch reads keys/devices/state in parallel and reuses a caller's family document.
{
 const data=new Map<string,any>([['push/vapid-keys',webPush.generateVAPIDKeys()],['state',{members:[{id:'dad'}],preferences:{}}]]);let stateReads=0,concurrent=0,peak=0;
 const slow=async<T>(v:T)=>{concurrent++;peak=Math.max(peak,concurrent);await new Promise(r=>setTimeout(r,15));concurrent--;return v};
 const store:any={get:async(k:string)=>{if(k==='state')stateReads++;return slow(data.get(k)??null)},setJSON:async(k:string,v:any)=>{data.set(k,v);return{modified:true}},delete:async(k:string)=>data.delete(k),list:async function*(){yield{blobs:[...data.keys()].filter(k=>k.startsWith('push/subscriptions/')).map(key=>({key}))}}};
 for(let i=1;i<=3;i++)data.set('push/subscriptions/dev-'+i,{deviceId:'dev-'+i,memberId:'dad',subscription:sub(10+i),types:{}});
 const opts:any[]=[];const result=await sendPushBatch(store,{type:'urgent',title:'t',body:'b',url:'/#today'},{targets:['dad'],family:{members:[{id:'dad'}],preferences:{}},send:async(_s:any,_p:any,o:any)=>{opts.push(o);return{statusCode:201}}});
 assert.equal(result.accepted,3);assert.equal(stateReads,0,'family document is not read again');assert(peak>=2,'keys and device records are read concurrently');
 assert.deepEqual(pushOptions({type:'urgent'}),{TTL:URGENT_TTL,urgency:'high',timeout:5000});assert.equal(pushOptions({type:'shopping'}).urgency,'normal');assert.equal(pushOptions({type:'prep'},{automatic:true}).TTL,1800);
}
console.log('PASS push batch: parallel reads, no second family read, urgent options');

// ---- 4. A saved family state runs reminders that are due now, in the background (same dedupe as the schedule).
{
 const g=memoryStores();const fx=await accountFixture(g);const pushes:any[]=[];
 const h=createFamilyHandler({getStoreFn:g,pushSend:async(_s:any,p:string)=>{pushes.push(JSON.parse(p));return{statusCode:201}}});
 const req=(op:string,method:string,body?:any)=>new Request('https://test.example/.netlify/functions/family?op='+op,{method,headers:{Origin:'https://test.example',Cookie:fx.cookie,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 await h(req('push-key','POST',{}));
 const now=new Date();const clock=new Intl.DateTimeFormat('en-GB',{timeZone:'Australia/Sydney',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now);
 const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Australia/Sydney',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));const week=d.toISOString().slice(0,10);
 const state={version:1,members:[{id:'dad',name:'Bố'}],recipes:[],pantry:[],receipts:[],preferences:{prepReminderTime:clock},weeks:{[week]:{days:{[date]:{dinner:{recipes:[{name:'Canh chua'}],cooked:false}}}}}};
 await fx.store.setJSON('state',{version:1,members:[{id:'dad',name:'Bố'}],recipes:[],weeks:{},pantry:[],preferences:{},receipts:[]});
 assert.equal((await h(req('push-subscribe','POST',{deviceId:'v17-rem-device',memberId:'dad',subscription:sub(30),quietStart:'00:00',quietEnd:'00:00'}))).status,200);
 const etag=(await (await h(req('state','GET'))).json()).etag;
 const waits:Promise<any>[]=[];const saved=await h(req('state','PUT',{state,etag}),{waitUntil:(p:Promise<any>)=>waits.push(p)} as any);assert.equal(saved.status,200);
 await Promise.all(waits);assert.equal(pushes.filter(p=>p.type==='prep').length,1,'prep reminder due now is pushed at save time');
 // A second save inside the throttle window does not run reminders again; and the dedupe key prevents a repeat anyway.
 const etag2=(await saved.json()).etag;const waits2:Promise<any>[]=[];await h(req('state','PUT',{state,etag:etag2}),{waitUntil:(p:Promise<any>)=>waits2.push(p)} as any);await Promise.all(waits2);assert.equal(pushes.filter(p=>p.type==='prep').length,1);
}
console.log('PASS reminders due now are pushed when the family state is saved (background, deduplicated)');
