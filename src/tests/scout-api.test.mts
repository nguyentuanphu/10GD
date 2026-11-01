// FamTray Scout API: pairing, token auth/revocation, kill switches, schedule window,
// lease queue (no duplicates, expiry re-queue), caps, priority ordering, results
// validation/dedupe/disagreement hold, trusted scouts, parser-breakage auto-pause,
// robots skip, challenge → 24 h pause, CORS, Studio ops + audit. Synthetic data only.
import assert from 'node:assert/strict';
import {createAccountsHandler} from '../netlify/lib/accounts.mjs';
import {createScoutHandler,extensionOriginAllowed} from '../netlify/functions/scout.mjs';
import {createStudioHandler} from '../netlify/functions/studio.mjs';
import {inWindow,dayKey,validFact,scoutConfig,validateConfig,validateNetworkPatch,setExtensionAllowed} from '../netlify/lib/scout.mjs';
import {listLog,resetSettingsCache} from '../netlify/lib/studio.mjs';
import {memoryStores} from './helpers/accounts.mjs';
const require=(await import('node:module')).createRequire(import.meta.url);

const getStoreFn=memoryStores(),origin='https://test.example',password='synthetic-scout-passphrase-42',EXT='chrome-extension://abcdefghijklmnopabcdefghijklmnop';
// Wednesday 4 Nov 2026 07:00 Sydney (AEDT, UTC+11) — inside the default Wed 06:30–09:00 window.
let clock=Date.parse('2026-11-04T07:00:00+11:00');
const env:any={STUDIO_ADMINS:'henrynguyen',SCOUT_DEV:'1'};
// Fake adapter isolating the network logic (the real community wiring is tested in scout-community.test.mts).
const published:any[]=[],held:any[]=[],candidates:any[]=[];
const fake={
 wanted:[{itemId:'nuoc-mam',name:'Fish sauce',families:9},{itemId:'gao',name:'Jasmine rice 5kg',families:2}],
 mappings:[{itemId:'nuoc-mam',retailer:'woolworths',productUrl:'https://www.woolworths.com.au/shop/productdetails/123456/fish-sauce',productId:'123456',confirmations:3},{itemId:'duong',retailer:'woolworths',productUrl:'https://www.woolworths.com.au/shop/productdetails/222222/sugar',productId:'222222',confirmations:2}],
 seen:{'duong|woolworths':'2026-10-20'} as any
};
const adapter={async wantedItems(){return fake.wanted},async productMappings(){return fake.mappings},async lastSeen(){return fake.seen},async catalogItems(){return[{itemId:'toi',name:'Garlic'},...Array.from({length:30},(_,i)=>({itemId:'item-'+i,name:'Synthetic item '+i}))]},async publishObservation(o:any,m:any){published.push({o,m})},async holdObservation(o:any,r:string){held.push({o,r})},async recordMappingCandidate(c:any){candidates.push(c)}};
const scout=createScoutHandler({getStoreFn,env,nowFn:()=>clock,adapter});
const studio=createStudioHandler({getStoreFn,env,nowFn:()=>clock,limits:{all:5000,mutate:5000}});
const accounts=createAccountsHandler({getStoreFn});
let ip=0;
const call=(op:string,{method='GET',body,cookie='',token='',from=origin,csrf='',headers={}}:any={})=>scout(new Request(`${origin}/.netlify/functions/scout?op=${op}`,{method,headers:{...(from?{Origin:from}:{}),'x-nf-client-connection-ip':'ip-'+(ip++),...(cookie?{Cookie:cookie}:{}),...(token?{Authorization:'Bearer '+token}:{}),...(csrf?{'x-studio-csrf':csrf}:{}),...(body?{'Content-Type':'application/json'}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})}));
const J=async(r:Response)=>({status:r.status,data:await r.json(),headers:r.headers});
const dev=(op:string,token:string,body?:any)=>call(op,{method:body===undefined?'GET':'POST',body,token,from:EXT}).then(J);
async function register(username:string){const r=await accounts(new Request(origin+'/.netlify/functions/accounts?op=register',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','x-nf-client-connection-ip':'r'+(ip++)},body:JSON.stringify({username,name:username,password,trust:true})}));assert.equal(r.status,201,username);return r.headers.get('set-cookie')!.split(';')[0]}

// ---- pure helpers
assert.equal(new Intl.DateTimeFormat('en-US',{timeZone:'Australia/Sydney',weekday:'short'}).format(new Date(clock)),'Wed');
assert.equal(inWindow(clock),true,'Wed 07:00 is inside the default window');
assert.equal(inWindow(Date.parse('2026-11-04T09:30:00+11:00')),false,'Wed 09:30 is outside');
assert.equal(inWindow(Date.parse('2026-11-07T07:59:00+11:00')),true,'Sat 07:59 inside');
assert.equal(inWindow(Date.parse('2026-11-07T08:00:00+11:00')),false,'Sat 08:00 outside');
assert.equal(inWindow(Date.parse('2026-11-05T07:00:00+11:00')),false,'Thursday outside');
assert.equal(extensionOriginAllowed(EXT,{SCOUT_DEV:'1'}),true);assert.equal(extensionOriginAllowed(EXT,{}),false,'any extension only in dev');
assert.equal(extensionOriginAllowed(EXT,{SCOUT_EXTENSION_IDS:'zzz'}),false);assert.equal(extensionOriginAllowed(EXT,{SCOUT_EXTENSION_IDS:'abcdefghijklmnopabcdefghijklmnop',SCOUT_DEV:'1'}),true);
assert.equal(extensionOriginAllowed('https://evil.example',{SCOUT_DEV:'1'}),false);
const cfg=await scoutConfig(getStoreFn);assert.ok(cfg?.retailers?.woolworths,'bundled config shipped to the server');
// The extension core agrees with the server's schedule rule.
const core=require('../.compiled/extension/scout-core.js');
for(const t of ['2026-11-04T06:29:00+11:00','2026-11-04T06:30:00+11:00','2026-11-04T08:59:00+11:00','2026-11-04T09:00:00+11:00','2026-11-07T07:00:00+11:00','2026-11-08T07:00:00+11:00'])assert.equal(core.inWindow(Date.parse(t),core.DEFAULT_SCHEDULE,'Australia/Sydney'),inWindow(Date.parse(t)),t);
assert.equal(validFact({name:'X',price:3,currency:'USD'},'woolworths',cfg).ok,false,'non-AUD rejected');
assert.equal(validFact({name:'X',price:0.01},'woolworths',cfg).ok,false,'implausible price rejected');
assert.equal(validFact({name:'X',price:5000},'woolworths',cfg).ok,false,'price range');
assert.equal(validFact({name:'Rice',price:2,packQty:0.001,packUnit:'g'},'woolworths',cfg).ok,false,'pack sanity');
{const v=validFact({name:'Milk 2L',price:3.1,unitPrice:1.55,unitBasis:'per_L',image:'https://x/y.png',description:'long',reviews:[1],email:'a@b.c',productUrl:'https://evil.example/p'},'woolworths',cfg);assert.ok(v.ok);for(const k of ['image','description','reviews','email'])assert.equal(k in v.fact!,false,'facts only: '+k);assert.equal(v.fact!.productUrl,null,'foreign URL dropped')}
assert.throws(()=>validateNetworkPatch({pacing:{minMs:1000,maxMs:2000}}),/pacing/i,'pacing below 20 s refused');
assert.throws(()=>validateNetworkPatch({robots:'ignore'}),/robots/i,'robots policy cannot be switched off');
assert.throws(()=>validateConfig({version:'x',retailers:{woolworths:{hosts:[],pageTypes:[{type:'product',path:'(('}]}}}),/pattern|Biểu/i,'config regex validated');

// ---- accounts
const henry=await register('henrynguyen'),alice=await register('alice'),bob=await register('bob');
// v1.7.1: only accounts assigned in Studio may pair/run the extension; these synthetic accounts are assigned.
for(const u of ['alice','bob'])await setExtensionAllowed(getStoreFn,u,true,'henrynguyen',clock);
const me=await (await studio(new Request(origin+'/.netlify/functions/studio?op=me',{headers:{Cookie:henry}}))).json();const csrf=me.csrf;assert.ok(csrf);
const S=(op:string,body?:any)=>call(op,{method:body===undefined?'GET':'POST',body,cookie:henry,csrf}).then(J);

// ---- public config
{const r=await J(await call('config',{from:EXT}));assert.equal(r.status,200);assert.equal(r.data.version,cfg.version);assert.equal(r.headers.get('access-control-allow-origin'),EXT,'CORS for extension origin');const u=await J(await call('config&v='+encodeURIComponent(cfg.version),{from:EXT}));assert.equal(u.data.unchanged,true)}
{const r=await scout(new Request(origin+'/.netlify/functions/scout?op=tasks',{method:'OPTIONS',headers:{Origin:EXT}}));assert.equal(r.status,204);assert.match(r.headers.get('access-control-allow-headers')||'',/Authorization/)}
{const r=await scout(new Request(origin+'/.netlify/functions/scout?op=tasks',{method:'OPTIONS',headers:{Origin:'https://evil.example'}}));assert.equal(r.status,403)}

// ---- pairing
assert.equal((await call('pair-code',{method:'POST',body:{}})).status,401,'pair code needs an account');
assert.equal((await call('pair-code',{method:'POST',body:{},cookie:alice,from:'https://evil.example'})).status,403,'same-origin for cookie ops');
const codeA=(await J(await call('pair-code',{method:'POST',body:{},cookie:alice}))).data;assert.match(codeA.code,/^[A-HJ-NP-Z2-9]{8}$/);
assert.equal((await dev('pair','',{code:'ZZZZZZZZ',name:'x'})).status,400,'wrong code');
const pa=await dev('pair','',{code:codeA.code.toLowerCase().replace(/(....)/,'$1-'),name:'Alice kitchen PC',postcode:'2220',suburb:'Hurstville',timeZone:'Australia/Sydney',stores:{woolworths:'Hurstville',coles:'Hurstville'},version:'1.6.0'});
assert.equal(pa.status,201,JSON.stringify(pa.data));const tokA=pa.data.token,devA=pa.data.device.id;assert.match(tokA,/^[\w-]{43}$/);
assert.equal(pa.data.device.autoAllowed,false,'auto not allowed by default');assert.equal(pa.data.device.network.autoScout,'off','autoScout default off');assert.equal(pa.data.device.network.semiAuto,'on','semi-auto default on');
assert.equal((await dev('pair','',{code:codeA.code,name:'again'})).status,400,'code is one-time');
{const s=getStoreFn({name:'bep-scout'});let leaked=false;for await(const p of s.list({prefix:''}))for(const b of p.blobs){const v=JSON.stringify(await s.get(b.key,{type:'json'}));if(v.includes(tokA)||b.key.includes(tokA))leaked=true}assert.equal(leaked,false,'raw token never stored')}
const codeB=(await J(await call('pair-code',{method:'POST',body:{},cookie:bob}))).data;const pb=await dev('pair','',{code:codeB.code,name:'Bob laptop',stores:{woolworths:'Hurstville'}});const tokB=pb.data.token,devB=pb.data.device.id;
const codeH=(await S('studio-pair-code',{})).data;const ph=await dev('pair','',{code:codeH.code,name:'Henry PC',stores:{woolworths:'Hurstville'}});const tokH=ph.data.token,devH=ph.data.device.id;assert.equal(ph.data.device.trusted,true,'Studio owner is a trusted scout');

// ---- token auth
assert.equal((await dev('device','')).status,401,'no token');
assert.equal((await dev('device','x'.repeat(43))).status,401,'unknown token');
assert.equal((await call('device',{token:tokA,from:'https://evil.example'})).status,403,'web origins refused');
assert.equal((await dev('device',tokA)).status,200);
{const hb=await dev('heartbeat',tokA,{autoEnabled:true,semiEnabled:true,version:'1.6.0',signedIn:{woolworths:true},storesSeen:{woolworths:'Hurstville'}});assert.equal(hb.status,200);assert.equal(hb.data.inWindow,true)}

// ---- kill switches (autoScout off by default, per-device allow, device toggle, global pause)
let t=await dev('tasks',tokA,{runId:'run-aaaaaa',autoEnabled:true});assert.equal(t.status,403);assert.equal(t.data.code,'auto-off','server refuses tasks while autoScout is off');
assert.equal((await S('studio-network',{patch:{autoScout:'on'}})).status,200);
t=await dev('tasks',tokA,{runId:'run-aaaaaa',autoEnabled:true});assert.equal(t.data.code,'device-not-allowed','device must be allowed in Studio');
for(const id of [devA,devB,devH])assert.equal((await S('studio-device',{deviceId:id,action:'allow-auto'})).status,200);
t=await dev('tasks',tokA,{runId:'run-aaaaaa',autoEnabled:false});assert.equal(t.data.code,'device-toggle-off','device-side toggle also required');
await S('studio-network',{patch:{paused:true}});t=await dev('tasks',tokA,{runId:'run-aaaaaa',autoEnabled:true});assert.equal(t.data.code,'paused-global');
assert.equal((await dev('results',tokA,{mode:'semi',items:[]})).status,403,'global pause stops semi-auto too');
await S('studio-network',{patch:{paused:false}});
await S('studio-device',{deviceId:devB,action:'pause'});t=await dev('tasks',tokB,{runId:'run-bbbbbb',autoEnabled:true});assert.equal(t.data.code,'paused-device');await S('studio-device',{deviceId:devB,action:'resume'});
clock=Date.parse('2026-11-04T10:00:00+11:00');t=await dev('tasks',tokA,{runId:'run-aaaaaa',autoEnabled:true});assert.equal(t.data.code,'outside-window');assert.equal(t.data.tasks.length,0);
clock=Date.parse('2026-11-04T07:00:00+11:00');

// ---- leases: priority, no duplicates, pacing
const leaseA=await dev('tasks',tokA,{runId:'run-aaaaaa',autoEnabled:true,max:10});assert.equal(leaseA.status,200,JSON.stringify(leaseA.data));
assert.ok(leaseA.data.pacing.minMs>=20000&&leaseA.data.pacing.maxMs<=40000,'pacing 20–40 s');assert.equal(leaseA.data.robots,'respect');
const kinds=leaseA.data.tasks.map((x:any)=>x.kind);assert.equal(kinds[0],'specials','Wednesday specials first');
const iWanted=kinds.indexOf('wanted'),iStale=kinds.indexOf('stale');assert.ok(iWanted>0&&iStale>iWanted,'wanted-by-many before stale: '+kinds.join(','));
assert.equal(leaseA.data.tasks.find((x:any)=>x.itemId==='nuoc-mam'&&x.retailer==='woolworths').url,fake.mappings[0].productUrl,'confirmed mapping URL used');
assert.match(leaseA.data.tasks.find((x:any)=>x.itemId==='gao'&&x.retailer==='woolworths').url,/searchTerm=Jasmine%20rice/,'search URL when unmapped');
const fishW=leaseA.data.tasks.filter((x:any)=>x.itemId==='nuoc-mam');assert.ok(fishW[0].kind==='wanted');
const wantedOrder=leaseA.data.tasks.filter((x:any)=>x.kind==='wanted').map((x:any)=>x.itemId);assert.ok(wantedOrder.indexOf('nuoc-mam')<wantedOrder.indexOf('gao'),'more families first');
const leasedIds=new Set(leaseA.data.tasks.map((x:any)=>x.taskId));
const leaseB=await dev('tasks',tokB,{runId:'run-bbbbbb',autoEnabled:true,max:10});
for(const x of leaseB.data.tasks){assert.equal(leasedIds.has(x.taskId),false,'no duplicate assignment');assert.equal(x.retailer,'woolworths','only tasks for the device stores')}
assert.ok(leaseA.data.tasks.some((x:any)=>x.retailer==='coles'),'coles tasks for the coles store');

// ---- lease expiry re-queues
// release returns tasks to the queue
{const rel=await dev('release',tokB,{taskIds:leaseB.data.tasks.slice(0,2).map((x:any)=>x.taskId)});assert.equal(rel.data.released,Math.min(2,leaseB.data.tasks.length))}
const firstA=leaseA.data.tasks.find((x:any)=>x.retailer==='woolworths');
clock+=9*60000;// lease is 8 minutes
const leaseH=await dev('tasks',tokH,{runId:'run-hhhhhh',autoEnabled:true,max:10});assert.ok(leaseH.data.tasks.some((x:any)=>x.taskId===firstA.taskId),'expired lease re-queued to another device');
{const late=await dev('results',tokA,{mode:'auto',items:[{taskId:firstA.taskId,retailer:firstA.retailer,url:firstA.url,status:'ok',facts:[{name:'x',price:1}]}]});assert.equal(late.data.rejected,1,'stale lease holder cannot submit');assert.equal(late.data.reasons.lease,1)}

// ---- results: validation, dedupe, consensus, disagreement hold, mapping candidate
const hT=leaseH.data.tasks.find((x:any)=>x.itemId==='nuoc-mam'&&x.retailer==='woolworths')||leaseH.data.tasks[0];
const fishFact={name:'Squid Brand Fish Sauce 725mL',price:4.5,unitPrice:0.62,unitBasis:'per_100mL',productId:'123456',productUrl:'https://www.woolworths.com.au/shop/productdetails/123456/fish-sauce',packQty:725,packUnit:'mL',storeLabel:'Hurstville',image:'nope',review:'nope'};
let r=await dev('results',tokH,{mode:'auto',items:[{taskId:hT.taskId,retailer:'woolworths',url:hT.url,pageType:'product',storeLabel:'Hurstville',status:'ok',facts:[fishFact,{name:'Bad',price:-1},{name:'Fake',price:3,currency:'USD'}]}]});
assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.data.accepted,1);assert.equal(r.data.rejected,2);assert.equal(r.data.confirmed,1,'trusted scout confirmed immediately');
assert.equal(published.at(-1).m.confirmed,true);assert.equal(published.at(-1).o.source,'scout-extension');assert.equal('image' in published.at(-1).o,false);
if(hT.itemId==='nuoc-mam')assert.equal(candidates.at(-1).productId,'123456','mapping candidate recorded');
// semi-auto (no task) from a non-trusted device: pending until consensus
const semiItem=(price:number,name='Coles Jasmine Rice 5kg',pid='5550001')=>({retailer:'coles',url:'https://www.coles.com.au/search/products?q=rice',pageType:'search',storeLabel:'Hurstville',status:'ok',facts:[{name,price,productId:pid,storeLabel:'Hurstville'}]});
r=await dev('results',tokA,{mode:'semi',items:[semiItem(15)]});assert.equal(r.data.accepted,1);assert.equal(r.data.confirmed,0,'untrusted → pending');assert.equal(published.at(-1).m.confirmed,false);
r=await dev('results',tokA,{mode:'semi',items:[semiItem(15)]});assert.equal(r.data.duplicates,1,'same device same price deduped');assert.equal(r.data.accepted,0);
r=await dev('results',tokB,{mode:'semi',items:[semiItem(15)]});assert.equal(r.data.confirmed,1,'second account agreeing → confirmed by consensus');
r=await dev('results',tokH,{mode:'semi',items:[semiItem(19.5)]});assert.equal(r.data.held,1,'cross-device disagreement held');assert.equal(held.length,1);assert.equal(held[0].r,'cross-device-disagreement');
assert.equal((await dev('results',tokA,{mode:'semi',items:[{...semiItem(3),url:'https://evil.example/x'}]})).data.reasons['retailer-url'],1,'URL must be on the retailer host');
assert.equal((await dev('results',tokA,{mode:'auto',items:[{retailer:'coles',url:'https://www.coles.com.au/x',status:'ok',facts:[]}]})).data.reasons.task,1,'auto results need a leased task');

// ---- trusted scout management (audited)
assert.equal((await S('studio-trusted',{username:'alice',grant:true})).status,200);
r=await dev('results',tokA,{mode:'semi',items:[semiItem(2.2,'Garlic 250g','5550002')]});assert.equal(r.data.confirmed,1,'granted trusted scout confirms immediately');
await S('studio-trusted',{username:'alice',grant:false});

// ---- robots-disallowed skip
const aT=(await dev('tasks',tokA,{runId:'run-aaaaab',autoEnabled:true,max:3})).data.tasks;assert.ok(aT.length>0);
r=await dev('results',tokA,{mode:'auto',items:[{taskId:aT[0].taskId,retailer:aT[0].retailer,url:aT[0].url,status:'robots-disallowed',facts:[]}]});assert.equal(r.data.skipped,1);assert.equal(r.data.pages,0,'robots skip is not a page visit');
{const ov=(await S('studio-overview')).data;assert.ok(ov.retailers.find((x:any)=>x.retailer===aT[0].retailer).today.robots>=1)}

// ---- caps: per-run, per-day and per-retailer network caps
await S('studio-network',{patch:{caps:{devicePagesPerRun:3}}});
{const a=await dev('tasks',tokB,{runId:'run-capcap',autoEnabled:true,max:10});assert.equal(a.data.tasks.length,3,'per-run cap');const b=await dev('tasks',tokB,{runId:'run-capcap',autoEnabled:true,max:10});assert.equal(b.data.tasks.length,0);assert.equal(b.data.stop,'cap-run')}
await S('studio-network',{patch:{caps:{devicePagesPerRun:150,devicePagesPerDay:1}}});
{const b=await dev('tasks',tokB,{runId:'run-capday',autoEnabled:true,max:10});assert.equal(b.data.stop,'cap-day','per-day cap')}
await S('studio-network',{patch:{caps:{devicePagesPerDay:300,retailerPagesPerDay:{woolworths:0,coles:0}}}});
{const b=await dev('tasks',tokH,{runId:'run-capret',autoEnabled:true,max:10});assert.equal(b.data.tasks.length,0);assert.equal(b.data.stop,'cap-retailer','network cap per retailer per day')}
await S('studio-network',{patch:{caps:{retailerPagesPerDay:{woolworths:600,coles:600}}}});

// ---- parser breakage → retailer auto-pause network-wide
await S('studio-network',{patch:{parser:{minSamples:5,minSuccess:0.5}}});
for(let i=0;i<6;i++)await dev('results',tokA,{mode:'semi',items:[{retailer:'aldi',url:'https://www.aldi.com.au/results?q=x'+i,status:'parse-failed',facts:[]}]});
{const ov=(await S('studio-overview')).data,aldi=ov.retailers.find((x:any)=>x.retailer==='aldi');assert.equal(aldi.paused,true,'aldi auto-paused');assert.equal(aldi.reason,'parser-breakage');assert.ok(ov.events.some((e:any)=>e.type==='parser_breakage'&&e.alert))}
{const d=await dev('device',tokA);assert.equal(d.data.retailerPaused.aldi,'parser-breakage','device sees the paused retailer')}
assert.equal((await S('studio-retailer',{retailer:'aldi',action:'resume'})).status,200);
{const ov=(await S('studio-overview')).data;assert.equal(ov.retailers.find((x:any)=>x.retailer==='aldi').paused,false)}

// ---- challenge report → device paused 24 h, leases released, network pause after 2 devices
const before=(await dev('tasks',tokB,{runId:'run-blk001',autoEnabled:true,max:2})).data.tasks;
r=await dev('block',tokB,{retailer:'woolworths',kind:'challenge',url:'https://www.woolworths.com.au/shop/search/products?searchTerm=x'});assert.equal(r.status,200);
assert.ok(Date.parse(r.data.pausedUntil)-clock>=24*3600000-1000,'paused 24 h');assert.ok(before.length>0&&r.data.released>=before.length,'leases released');
t=await dev('tasks',tokB,{runId:'run-blk002',autoEnabled:true});assert.equal(t.data.code,'paused-device');
{const ov=(await S('studio-overview')).data;const row=ov.devices.find((x:any)=>x.id===devB);assert.equal(row.status,'blocked');assert.ok(ov.events.some((e:any)=>e.type==='device_blocked'&&e.alert))}
r=await dev('block',tokH,{retailer:'woolworths',kind:'429'});assert.equal(r.data.retailerPaused,true,'second blocked device pauses the retailer network-wide');
clock+=25*3600000;// next day Thursday: outside window, but pause expired
{const d=await dev('device',tokB);assert.equal(d.data.paused,null,'24 h pause expires');assert.equal(d.data.retailerPaused.woolworths,undefined,'network pause expires')}

// ---- revoke
assert.equal((await S('studio-revoke',{deviceId:devB,reason:'lost laptop'})).status,200);
assert.equal((await dev('device',tokB)).status,401,'revoked token rejected');
assert.equal((await dev('results',tokB,{mode:'semi',items:[]})).status,401);
// device self-unpair
assert.equal((await dev('unpair',tokA,{})).status,200);assert.equal((await dev('heartbeat',tokA,{})).status,401);

// ---- Studio access + audit
assert.equal((await call('studio-overview',{cookie:alice})).status,403,'non-admin cannot open Scout studio');
assert.equal((await call('studio-network',{method:'POST',body:{patch:{autoScout:'off'}},cookie:henry})).status,403,'csrf required');
{const ov=(await S('studio-overview')).data;assert.equal(ov.settings.autoScout,'on');assert.ok(ov.devices.length===3);assert.equal(typeof ov.tasks.total,'number');for(const d of ov.devices)assert.equal('tokenHash' in d,false,'no token hash in Studio view')}
{const cov=(await S('studio-coverage')).data;assert.ok(cov.columns.includes('woolworths · Hurstville'),'coverage columns');assert.ok(cov.rows.length>=1,'coverage rows')}
resetSettingsCache();
{const log=await listLog(getStoreFn,'audit',{now:clock,limit:200,from:dayKey(clock-3*86400000)});const acts=new Set(log.items.map((x:any)=>x.action));for(const a of ['scout_network','scout_device_allow_auto','scout_device_pause','scout_trusted_grant','scout_retailer_resume','scout_device_revoke','scout_pair_code'])assert.ok(acts.has(a),'audited: '+a)}
// config override is data only and versioned
{const c=structuredClone(cfg);c.version='test-2';assert.equal((await S('studio-config',{config:c})).status,200);const g=await J(await call('config',{from:EXT}));assert.equal(g.data.version,'test-2');await S('studio-config',{config:null});assert.equal((await J(await call('config',{from:EXT}))).data.version,cfg.version)}
// kill switch off again refuses everything auto
await S('studio-network',{patch:{autoScout:'off'}});clock=Date.parse('2026-11-07T07:00:00+11:00');
t=await dev('tasks',tokH,{runId:'run-hhhhh2',autoEnabled:true});assert.equal(t.data.code,'auto-off');
assert.equal((await dev('results',tokH,{mode:'auto',items:[]})).data.code,'auto-off');
console.log('Scout API: pairing, auth, kill switches, schedule, leases, caps, priority, results, consensus, breakage, robots, challenge pause, Studio audit — all passed.');
