// FamTray Scout v1.7 server: install info (scout?op=public, store links), owner-adjustable
// pacing (presets, 3 s floor, device only same-or-slower, automatic back-off), Run now
// grants (role-gated, audited, time-boxed, one run, every other guardrail and kill switch
// still wins), the remote command queue (create → pick up → ack → result, expiry, device
// isolation), live status aggregation, owner notifications (mock push) and capture time.
// Synthetic data only.
import assert from 'node:assert/strict';
import {createAccountsHandler} from '../netlify/lib/accounts.mjs';
import {createScoutHandler} from '../netlify/functions/scout.mjs';
import {createStudioHandler} from '../netlify/functions/studio.mjs';
import * as lib from '../netlify/lib/scout.mjs';
import {scoutMessage,notifyOwners} from '../netlify/lib/scout-notify.mjs';
import {listLog} from '../netlify/lib/studio.mjs';
import {memoryStores} from './helpers/accounts.mjs';

const getStoreFn=memoryStores(),origin='https://test.example',password='synthetic-scout-passphrase-42',EXT='chrome-extension://abcdefghijklmnopabcdefghijklmnop';
// Wednesday 4 Nov 2026 10:00 Sydney — OUTSIDE the default windows (Wed 06:30–09:00, Sat 06:30–08:00).
let clock=Date.parse('2026-11-04T10:00:00+11:00');
const env:any={STUDIO_ADMINS:'henrynguyen',STUDIO_SUPPORT:'sam',SCOUT_DEV:'1'};
const notified:any[]=[];
const fake={wanted:[{itemId:'nuoc-mam',name:'Fish sauce',families:9}],mappings:[{itemId:'nuoc-mam',retailer:'woolworths',productUrl:'https://www.woolworths.com.au/shop/productdetails/123456/fish-sauce',productId:'123456',confirmations:3}]};
const published:any[]=[];
const adapter={async wantedItems(){return fake.wanted},async productMappings(){return fake.mappings},async lastSeen(){return{}},async catalogItems(){return Array.from({length:12},(_,i)=>({itemId:'item-'+i,name:'Synthetic item '+i}))},async publishObservation(o:any){published.push(o)},async holdObservation(){},async recordMappingCandidate(){}};
const scout=createScoutHandler({getStoreFn,env,nowFn:()=>clock,adapter,notify:async(type:string,data:any)=>{notified.push({type,data})}});
const studio=createStudioHandler({getStoreFn,env,nowFn:()=>clock,limits:{all:5000,mutate:5000}});
const accounts=createAccountsHandler({getStoreFn});
let ip=0;
const call=(op:string,{method='GET',body,cookie='',token='',from=origin,csrf=''}:any={})=>scout(new Request(`${origin}/.netlify/functions/scout?op=${op}`,{method,headers:{...(from?{Origin:from}:{}),'x-nf-client-connection-ip':'ip-'+(ip++),...(cookie?{Cookie:cookie}:{}),...(token?{Authorization:'Bearer '+token}:{}),...(csrf?{'x-studio-csrf':csrf}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{})},body:body===undefined?undefined:JSON.stringify(body)}));
const J=async(r:Response)=>({status:r.status,data:await r.json(),headers:r.headers});
const dev=(op:string,token:string,body?:any)=>call(op,{method:body===undefined?'GET':'POST',body,token,from:EXT}).then(J);
async function register(username:string){const r=await accounts(new Request(origin+'/.netlify/functions/accounts?op=register',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','x-nf-client-connection-ip':'r'+(ip++)},body:JSON.stringify({username,name:username,password,trust:true})}));assert.equal(r.status,201);return String(r.headers.get('set-cookie')).split(';')[0]}
const henry=await register('henrynguyen'),alice=await register('alice'),sam=await register('sam');
const csrf=(await (await studio(new Request(origin+'/.netlify/functions/studio?op=me',{headers:{Cookie:henry}}))).json()).csrf;
const S=(op:string,body?:any,cookie=henry,c=csrf)=>call(op,{method:body===undefined?'GET':'POST',body,cookie,csrf:c}).then(J);
const audits=async()=>(await listLog(getStoreFn,'audit',{now:clock,limit:200,from:lib.dayKey(clock-86400000)})).items.map((x:any)=>x.action);

// ---------- install info ----------
{const r=await J(await call('public'));assert.equal(r.status,200);assert.deepEqual(r.data,{extensionIds:[lib.BUNDLED_EXTENSION_ID],storeUrl:null,edgeStoreUrl:null});
 const e2=createScoutHandler({getStoreFn,env:{...env,SCOUT_EXTENSION_IDS:'abcdefghijklmnopabcdefghijklmnop, bad-id',SCOUT_STORE_URL:'https://chromewebstore.google.com/detail/famtray-scout/abcdefghijklmnopabcdefghijklmnop'},nowFn:()=>clock,adapter,notify:async()=>{}});
 const p=await J(await e2(new Request(origin+'/.netlify/functions/scout?op=public')));assert.deepEqual(p.data.extensionIds,[lib.BUNDLED_EXTENSION_ID,'abcdefghijklmnopabcdefghijklmnop'],'bundled id + configured store id');assert.match(p.data.storeUrl,/^https:\/\/chromewebstore\.google\.com\/detail\//);
 for(const [u,k,ok] of [['https://chromewebstore.google.com/detail/x/abc','chrome',true],['https://chrome.google.com/webstore/detail/x/abc','chrome',true],['http://chromewebstore.google.com/detail/x','chrome',false],['https://evil.example/detail/x','chrome',false],['https://microsoftedge.microsoft.com/addons/detail/x/abc','edge',true],['https://microsoftedge.microsoft.com/addons/detail/x','chrome',false]] as const)assert.equal(lib.validStoreUrl(u,k),ok,u);
 assert.equal((await S('studio-network',{patch:{install:{chrome:'https://evil.example/x'}}})).status,400,'only store URLs');
 assert.equal((await S('studio-network',{patch:{install:{chrome:'https://chromewebstore.google.com/detail/famtray/abc'}}})).status,200);
 assert.equal((await S('studio-network',{patch:{install:{edge:'https://microsoftedge.microsoft.com/addons/detail/famtray/abc'}}})).status,200);
 const after=(await J(await call('public'))).data;assert.equal(after.storeUrl,'https://chromewebstore.google.com/detail/famtray/abc','chrome link kept when edge saved');assert.equal(after.edgeStoreUrl,'https://microsoftedge.microsoft.com/addons/detail/famtray/abc');
 console.log('PASS install info: bundled + configured ids, store links validated and merged');}

// ---------- devices ----------
async function pairAs(cookie:string,name:string){const c=(await J(await call('pair-code',{method:'POST',body:{},cookie}))).data;const p=await dev('pair','',{code:c.code,name,stores:{woolworths:'Hurstville'},timeZone:'Australia/Sydney'});assert.equal(p.status,201);return{token:p.data.token,id:p.data.device.id}}
const A=await pairAs(alice,'Alice PC'),B=await pairAs(alice,'Alice laptop');
await S('studio-network',{patch:{autoScout:'on'}});await S('studio-device',{deviceId:A.id,action:'allow-auto'});

// ---------- pacing ----------
{assert.deepEqual(lib.validPacing('fast'),{minMs:8000,maxMs:15000});assert.equal(lib.validPacing({minMs:2999,maxMs:6000}),null,'< 3 s refused');assert.equal(lib.validPacing({minMs:5000,maxMs:4000}),null,'min > max refused');assert.deepEqual(lib.validPacing({minMs:3000,maxMs:6000}),{minMs:3000,maxMs:6000});
 assert.equal((await S('studio-network',{patch:{pacing:{minMs:2000,maxMs:5000}}})).status,400,'network pace below 3 s refused');
 assert.equal((await S('studio-network',{patch:{pacing:{minMs:8000,maxMs:15000}}})).status,200,'Fast network default');
 let v=(await dev('device',A.token)).data;assert.equal(v.network.pacing.preset,'fast');assert.equal(v.network.pacing.source,'network');
 // The device may only go slower than Studio allows.
 assert.equal((await dev('device-settings',A.token,{pacing:{minMs:1000,maxMs:2000}})).status,400,'device pace below 3 s refused');
 v=(await dev('device-settings',A.token,{pacing:'veryfast'})).data;assert.equal(v.network.pacing.minMs,8000,'device cannot exceed the Studio limit');assert.equal(v.network.pacing.preset,'fast');
 v=(await dev('device-settings',A.token,{pacing:'slow'})).data;assert.equal(v.network.pacing.preset,'slow','device may choose slower');assert.equal(v.network.pacing.deviceChoice,'slow');
 v=(await dev('device-settings',A.token,{pacing:null})).data;assert.equal(v.network.pacing.preset,'fast');
 // Studio per-device override (audited) — may be faster than the network default.
 assert.equal((await S('studio-command',{deviceId:A.id,type:'pace',args:{pacing:{minMs:1000,maxMs:3000}}})).status,400);
 assert.equal((await S('studio-command',{deviceId:A.id,type:'pace',args:{pacing:'veryfast'}})).status,201);
 v=(await dev('device',A.token)).data;assert.equal(v.network.pacing.preset,'veryfast');assert.equal(v.network.pacing.source,'device');
 assert.ok((await audits()).includes('scout_command_pace'),'pace change audited');
 // Automatic back-off: slow page → Normal for that retailer, rest of the day.
 const bo=(await dev('backoff',A.token,{retailer:'woolworths',reason:'slow'})).data;assert.deepEqual({min:bo.pacing.byRetailer.woolworths.minMs,max:bo.pacing.byRetailer.woolworths.maxMs},{min:20000,max:40000});assert.equal(bo.pacing.minMs,3000,'other retailers keep the preset');
 assert.equal((await dev('backoff',A.token,{retailer:'woolworths',reason:'nope'})).status,400);
 const tomorrow=lib.effectivePacing(await lib.getDevice(getStoreFn,A.id),await lib.networkSettings(getStoreFn,env),clock+86400000);assert.deepEqual(tomorrow.byRetailer,{},'back-off lasts for the day only');
 // 429 / challenge (block report) also backs off that retailer (and still pauses 24 h — tested in scout-api).
 const d0=await lib.getDevice(getStoreFn,B.id);await lib.reportBlock(getStoreFn,d0,{retailer:'coles',kind:'429'},clock);
 assert.ok(lib.effectivePacing(await lib.getDevice(getStoreFn,B.id),await lib.networkSettings(getStoreFn,env),clock).byRetailer.coles,'429 backs off coles');
 await lib.editDevice(getStoreFn,B.id,(d:any)=>({...d,pausedUntil:null,pauseReason:null}));
 console.log('PASS pacing: presets + custom, < 3 s refused, device only same-or-slower, Studio per-device override audited, back-off on slow/429');}

// ---------- Run now ----------
{const tasks=(tok:string,runId:string,extra:any={})=>dev('tasks',tok,{runId,autoEnabled:true,max:5,...extra});
 let t=await tasks(A.token,'run-aaaaaa');assert.equal(t.data.code,'outside-window','refused outside the window without a grant');
 // Role-gated: plain account, support role and missing CSRF are refused.
 assert.equal((await S('studio-command',{deviceId:A.id,type:'run-now'},alice,'x')).status,403,'non-Studio account');
 assert.equal((await S('studio-command',{deviceId:A.id,type:'run-now'},henry,'wrong-csrf')).status,403,'CSRF required');
 const samCsrf=(await (await studio(new Request(origin+'/.netlify/functions/studio?op=me',{headers:{Cookie:sam}}))).json()).csrf;
 if(samCsrf)assert.equal((await S('studio-command',{deviceId:A.id,type:'run-now'},sam,samCsrf)).status,403,'support role is read-only');
 assert.equal((await S('studio-command',{deviceId:B.id,type:'run-now'})).status,409,'device not allowed for Auto');
 const g=await S('studio-command',{deviceId:A.id,type:'run-now'});assert.equal(g.status,201);assert.ok((await audits()).includes('scout_command_run_now'),'run now audited');
 t=await tasks(A.token,'run-bbbbbb');assert.equal(t.status,200);assert.ok(t.data.tasks.length>=1,'leases outside the window with a grant: '+JSON.stringify(t.data));assert.equal(t.data.pacing.preset,'veryfast');
 assert.equal((await tasks(A.token,'run-cccccc')).data.code,'outside-window','one run per grant');
 assert.equal((await tasks(A.token,'run-bbbbbb')).status,200,'same run continues');
 // Caps still apply during Run now.
 await lib.editDevice(getStoreFn,A.id,(d:any)=>({...d,caps:{pagesPerRun:1}}));const capped=(await tasks(A.token,'run-bbbbbb')).data;assert.deepEqual(capped.tasks,[]);assert.equal(capped.stop,'cap-run');await lib.editDevice(getStoreFn,A.id,(d:any)=>({...d,caps:{}}));
 // Global pause and the env kill switch override a grant.
 await S('studio-network',{patch:{paused:true}});assert.equal((await tasks(A.token,'run-bbbbbb')).data.code,'paused-global');await S('studio-network',{patch:{paused:false}});
 const killed=createScoutHandler({getStoreFn,env:{...env,SCOUT_AUTO:'off'},nowFn:()=>clock,adapter,notify:async()=>{}});
 const k=await J(await killed(new Request(origin+'/.netlify/functions/scout?op=tasks',{method:'POST',headers:{Origin:EXT,Authorization:'Bearer '+A.token,'Content-Type':'application/json'},body:JSON.stringify({runId:'run-bbbbbb',autoEnabled:true})})));assert.equal(k.data.code,'auto-off','SCOUT_AUTO=off wins');
 // Device-side toggle off still refuses.
 assert.equal((await dev('tasks',A.token,{runId:'run-bbbbbb',autoEnabled:false})).data.code,'device-toggle-off');
 // Stop → the run is refused from then on.
 await S('studio-command',{deviceId:A.id,type:'stop'});assert.equal((await tasks(A.token,'run-bbbbbb',{startedAt:clock-1000})).data.code,'stopped');
 // Popup Run now (device asks): allowed device → fresh grant; expires after 60 min.
 clock+=60000;const r=await dev('run-now',A.token,{});assert.equal(r.status,200);assert.ok(r.data.runNow,'grant shown to the device');
 assert.equal((await dev('run-now',B.token,{})).status,403,'not allowed device refused');
 assert.equal((await tasks(A.token,'run-dddddd',{startedAt:clock})).status,200);
 clock+=61*60000;assert.equal((await tasks(A.token,'run-eeeeee',{startedAt:clock})).data.code,'outside-window','grant expired');
 console.log('PASS Run now: role-gated + audited, leases outside the window only with a grant, one run, caps/pause/kill switch/stop still win, expiry, popup request');}

// ---------- command queue ----------
{const q=await S('studio-command',{deviceId:B.id,type:'refresh-config'});assert.equal(q.status,201);const id=q.data.command.id;
 let ov=(await S('studio-overview')).data.devices.find((d:any)=>d.id===B.id);assert.equal(ov.live.commands[0].status,'pending');
 // Another device can neither see nor acknowledge it.
 let hbA=(await dev('heartbeat',A.token,{version:'1.7.0'})).data;assert.ok(!hbA.commands.some((c:any)=>c.id===id),'device isolation (pick up)');
 assert.equal((await dev('command-result',A.token,{id,ok:true})).status,404,'device isolation (ack)');
 const hb=(await dev('heartbeat',B.token,{version:'1.7.0',chromeOpen:true,idle:'idle'})).data;assert.deepEqual(hb.commands,[{id,type:'refresh-config',args:{}}]);
 assert.deepEqual((await dev('heartbeat',B.token,{version:'1.7.0'})).data.commands,[],'delivered once');
 ov=(await S('studio-overview')).data.devices.find((d:any)=>d.id===B.id);assert.equal(ov.live.commands[0].status,'received');
 assert.equal((await dev('command-result',B.token,{id,ok:true,result:'config 2026-11-01.1'})).status,200);
 ov=(await S('studio-overview')).data.devices.find((d:any)=>d.id===B.id);assert.equal(ov.live.commands[0].status,'done');assert.equal(ov.live.commands[0].result,'config 2026-11-01.1');
 // Expiry: not picked up within 30 minutes.
 const e=(await S('studio-command',{deviceId:B.id,type:'recheck-stores'})).data.command.id;clock+=31*60000;
 assert.deepEqual((await dev('heartbeat',B.token,{version:'1.7.0'})).data.commands,[],'expired command not delivered');
 ov=(await S('studio-overview')).data.devices.find((d:any)=>d.id===B.id);assert.equal(ov.live.commands.find((c:any)=>c.id===e).status,'expired');
 assert.equal((await S('studio-command',{deviceId:B.id,type:'format-disk'})).status,400,'unknown command refused');
 assert.equal((await S('studio-command',{deviceId:B.id,type:'stop'},alice,'x')).status,403,'commands are Studio-only');
 assert.ok((await audits()).includes('scout_command_refresh_config'),'commands audited');
 const tl=(await S('studio-device-timeline&deviceId='+B.id)).data.events;assert.ok(tl.some((x:any)=>x.type==='command_queued')&&tl.some((x:any)=>x.type==='command_done'));assert.ok(tl.length<=50);for(const x of tl)assert.equal('url' in x,false,'no page contents in the timeline');
 console.log('PASS command queue: pending → received → done, delivered once, expiry, device isolation, Studio-only + audited, timeline');}

// ---------- live status ----------
{const s=await lib.networkSettings(getStoreFn,env);const base:any={id:'dev-000000000000',name:'X',lastHeartbeat:new Date(clock-30000).toISOString(),client:{chromeOpen:true,idle:'idle'}};
 assert.equal(lib.liveStatus(base,s,clock).state,'idle');assert.equal(lib.liveStatus(base,s,clock).online,true);
 assert.equal(lib.liveStatus({...base,lastHeartbeat:new Date(clock-10*60000).toISOString()},s,clock).state,'offline');
 const run=lib.liveStatus({...base,client:{...base.client,running:true,run:{pages:12,prices:40}}},s,clock);assert.equal(run.state,'running');assert.deepEqual([run.run.pages,run.run.cap],[12,150]);
 assert.equal(lib.liveStatus({...base,pausedUntil:clock+3600000,pauseReason:'blocked:challenge'},s,clock).state,'blocked');
 assert.equal(lib.liveStatus({...base,pausedUntil:clock+3600000,pauseReason:'studio'},s,clock).state,'paused');
 assert.equal(lib.liveStatus({...base,client:{...base.client,why:'outside-window'}},s,clock).state,'waiting-window');
 const hb=(await dev('heartbeat',B.token,{version:'1.7.0',configVersion:'2026-11-01.1',chromeOpen:true,idle:'active',battery:{charging:false,level:0.42,at:clock},running:true,run:{pages:3,prices:9,startedAt:clock-60000},lastError:{at:clock-5000,retailer:'coles',kind:'429'}})).status;assert.equal(hb,200);
 const l=(await S('studio-overview')).data.devices.find((d:any)=>d.id===B.id).live;
 assert.deepEqual({state:l.state,pages:l.run.pages,battery:l.battery.charging,level:l.battery.level,idle:l.idle,err:l.lastError.retailer,v:l.version},{state:'running',pages:3,battery:false,level:0.42,idle:'active',err:'coles',v:'1.7.0'});
 console.log('PASS live status aggregation (online/offline, running x/y, paused, blocked, waiting, battery, last error, version)');}

// ---------- notifications (mock push) ----------
{notified.length=0;
 // The notifier is process-wide (one handler per function in production); other handlers created above replaced it.
 lib.scoutHooks.notify=async(type:string,data:any)=>{notified.push({type,data})};
 await dev('heartbeat',B.token,{version:'1.7.0',lastRun:{at:clock-1000,pages:5,prices:20,skipped:1,stop:'no-tasks'}});assert.equal(notified.length,0,'opt-in: nothing sent while off');
 assert.equal((await S('studio-network',{patch:{notify:{runFinished:true,blocked:true,offline:true,offlineHours:2,parserBreakage:true}}})).status,200);
 assert.equal((await S('studio-network',{patch:{notify:{offlineHours:0}}})).status,400);
 await dev('heartbeat',B.token,{version:'1.7.0',lastRun:{at:clock-500,pages:6,prices:21,skipped:0,stop:'no-tasks'}});
 await dev('heartbeat',B.token,{version:'1.7.0',lastRun:{at:clock-500,pages:6,prices:21,skipped:0,stop:'no-tasks'}});
 assert.deepEqual(notified.filter(n=>n.type==='run_finished').map(n=>[n.data.pages,n.data.prices]),[[6,21]],'run finished notified once');
 await dev('block',B.token,{retailer:'woolworths',kind:'challenge'});assert.ok(notified.some(n=>n.type==='device_blocked'&&n.data.retailer==='woolworths'),'blocked notified');
 await lib.logEvent(getStoreFn,'parser_breakage',{retailer:'aldi',alert:true},clock);assert.ok(notified.some(n=>n.type==='parser_breakage'),'parser breakage notified');
 // Offline: Auto-allowed device silent > 2 h inside its window → one notice per day.
 const sat=Date.parse('2026-11-07T07:30:00+11:00');await lib.editDevice(getStoreFn,A.id,(d:any)=>({...d,lastHeartbeat:new Date(sat-3*3600000).toISOString()}));
 assert.equal(await lib.scoutOfflineCheck(getStoreFn,sat,env),1);assert.equal(await lib.scoutOfflineCheck(getStoreFn,sat+900000,env),0,'once per day');assert.ok(notified.some(n=>n.type==='device_offline'&&n.data.deviceId===A.id));
 assert.equal(await lib.scoutOfflineCheck(getStoreFn,Date.parse('2026-11-07T12:00:00+11:00')+86400000,env),0,'outside a window: no notice');
 // Message text and the real sender targets only the Studio owner's own push devices.
 assert.match(scoutMessage('run_finished',{name:'PC',pages:6,prices:21}).body,/PC: 6 trang, 21 giá/);assert.match(scoutMessage('device_blocked',{retailer:'coles',kind:'429'}).enBody,/Coles showed a check\/block \(429\)/);
 const sent:any[]=[];const r=await notifyOwners(getStoreFn,'run_finished',{name:'PC',pages:1,prices:2},env,{send:async(sub:any,payload:any)=>{sent.push({sub,payload})}});assert.equal(r.sent,0,'no push devices registered for the owner → nothing sent');
 console.log('PASS notifications: opt-in, run finished once, blocked, parser breakage, offline during window once per day, owner-only targeting');}

// ---------- capture time ----------
{const now=clock;assert.equal(lib.capturedAt(new Date(now-3600000).toISOString(),now),new Date(now-3600000).toISOString(),'device capture time kept');
 assert.equal(lib.capturedAt(new Date(now+3600000).toISOString(),now),new Date(now).toISOString(),'future → server time');
 assert.equal(lib.capturedAt(new Date(now-15*86400000).toISOString(),now),new Date(now).toISOString(),'> 14 days → server time');
 assert.equal(lib.capturedAt('garbage',now),new Date(now).toISOString());
 await S('studio-network',{patch:{semiAuto:'on'}});await lib.editDevice(getStoreFn,B.id,(d:any)=>({...d,pausedUntil:null}));published.length=0;
 const at=new Date(now-2*3600000).toISOString();
 const res=await dev('results',B.token,{mode:'semi',items:[{retailer:'woolworths',url:'https://www.woolworths.com.au/shop/productdetails/123456/fish-sauce',pageType:'product',capturedAt:at,status:'ok',facts:[{name:'Squid fish sauce 725mL',price:4.5,productId:'123456',productUrl:'https://www.woolworths.com.au/shop/productdetails/123456/fish-sauce'}]}]});
 assert.equal(res.status,200,JSON.stringify(res.data));assert.equal(published[0]?.observedAt,at,'observation carries the capture time from the device');assert.equal(published[0]?.receivedAt,new Date(now).toISOString());
 console.log('PASS capture time: device time kept, future / > 14 days replaced, stored on the observation');}
console.log('Scout v1.7 remote control, pacing, Run now, install info, notifications and capture time — all passed.');
