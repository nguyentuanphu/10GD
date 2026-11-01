// v1.7.1 Studio · urgent delivery reasons: what is stored with each alert, the metadata list (op=urgent),
// the owner-only audited drill-down (op=urgent-family), role gating, reason aggregation, older alerts, privacy.
import assert from 'node:assert/strict';
import {createAccountsHandler} from '../netlify/lib/accounts.mjs';
import {createFamilyHandler} from '../netlify/functions/family.mjs';
import {createStudioHandler} from '../netlify/functions/studio.mjs';
import {urgentList,classify,alertRow,pushDetailOf} from '../netlify/lib/urgent-report.mjs';
import {memoryStores} from './helpers/accounts.mjs';

const getStoreFn=memoryStores(),origin='https://test.example',password='synthetic-urgent-passphrase-42';
const accounts=createAccountsHandler({getStoreFn});
let gone=new Set<string>();
const pushSend=async(sub:any)=>{if(gone.has(sub.endpoint))throw Object.assign(Error('gone'),{statusCode:410});return{statusCode:201}};
const family=createFamilyHandler({getStoreFn,pushSend});
const env:any={STUDIO_ADMINS:'henrynguyen',STUDIO_SUPPORT:'sam',STUDIO_FLAG_SUPPORT_ROLE:'true'};
const studio=createStudioHandler({getStoreFn,env,limits:{all:1000,mutate:1000}});
let ip=0;
const req=(endpoint:string,q:string,{method='GET',body,cookie=''}:any={})=>new Request(`${origin}/.netlify/functions/${endpoint}?${q}`,{method,headers:{Origin:origin,'x-nf-client-connection-ip':'u-'+(ip++),...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
const acc=(op:string,body:any,cookie='')=>accounts(req('accounts','op='+op,{method:'POST',body,cookie}));
async function register(username:string,name:string){const r=await acc('register',{username,name,password,trust:true});assert.equal(r.status,201);return r.headers.get('set-cookie')!.split(';')[0]}
const fam=async(op:string,body:any,cookie:string)=>{const r=await family(req('family','op='+op,{method:body?'POST':'GET',body,cookie}));return{status:r.status,data:await r.json()}};
const S=(q:string,cookie:string)=>studio(req('studio',q,{cookie}));

const henry=await register('henrynguyen','Henry'),sam=await register('sam','Sam'),alice=await register('alice','Alice Account'),bob=await register('bob','Bob Account');
const famA=(await (await acc('create-family',{name:'Nhà Thử Nghiệm'},alice)).json()).household;
const famB=(await (await acc('create-family',{name:'Bob test family'},bob)).json()).household;
const members=[{id:'mum',name:'Sender Alice Name'},{id:'grandma',name:'Grandma Lan Private'},{id:'kid',name:'Kid Minh Private'},{id:'uncle',name:'Uncle Tuan Private'},{id:'aunt',name:'Aunt Hoa Private'}];
assert.equal((await fam('state',null,alice)).status,200);
assert.equal((await family(req('family','op=state',{method:'PUT',cookie:alice,body:{state:{version:1,members,recipes:[],weeks:{},pantry:[],preferences:{},receipts:[]},etag:null}}))).status,200);
assert.equal((await family(req('family','op=state',{method:'PUT',cookie:bob,body:{state:{version:1,members:[{id:'b1',name:'Bob Member'}],recipes:[],weeks:{},pantry:[],preferences:{},receipts:[]},etag:null}}))).status,200);
const sub=(n:string)=>({endpoint:'https://fcm.googleapis.com/fcm/send/urgent-'+n,keys:{auth:'a'.repeat(22),p256dh:'b'.repeat(87)}});
await fam('push-key',{},alice);
assert.equal((await fam('push-subscribe',{deviceId:'urg-device-mum',memberId:'mum',subscription:sub('mum')},alice)).status,200);
assert.equal((await fam('push-subscribe',{deviceId:'urg-device-kid',memberId:'kid',subscription:sub('kid'),shared:true},alice)).status,200);
assert.equal((await fam('push-subscribe',{deviceId:'urg-device-kid2',memberId:'kid',subscription:sub('kid2'),shared:true},alice)).status,200);
assert.equal((await fam('push-subscribe',{deviceId:'urg-device-uncle',memberId:'uncle',subscription:sub('uncle'),shared:true},alice)).status,200);
assert.equal((await fam('push-subscribe',{deviceId:'urg-device-aunt',memberId:'aunt',subscription:sub('aunt'),shared:true,types:{urgent:false}},alice)).status,200);
const data=getStoreFn({name:'bep-family-data'}),pre=`households/${famA.id}/`;
const uncle=await data.get(pre+'push/subscriptions/urg-device-uncle',{type:'json'});await data.setJSON(pre+'push/subscriptions/urg-device-uncle',{...uncle,needsResubscribe:true});

// ---- 1. What is stored after each send (counts + target member ids; never names in the detail).
const send=async(id:string,targets:string[])=>{const r=await fam('alert-send',{id,fromId:'mum',message:'SECRET-TEXT '+id,targets},alice);assert.equal(r.status,200,id);return (await data.get(pre+'family-alert/'+id,{type:'json'}))};
let a=await send('urg-alert-nodevice',['grandma']);
assert.equal(a.pushStatus,'not_sent');assert.equal(a.pushReason,'no_device');assert.deepEqual(a.targets,['grandma']);assert.ok(a.pushAt);
assert.deepEqual(a.pushDetail,{v:1,recipients:1,devices:0,selected:0,accepted:0,failed:0,expired:0,suppressed:0,needsResubscribe:0,typeOff:0,quiet:0});
a=await send('urg-alert-resub',['uncle']);assert.equal(a.pushReason,'needs_resubscribe');assert.equal(a.pushDetail.devices,1);assert.equal(a.pushDetail.needsResubscribe,1);
a=await send('urg-alert-typeoff',['aunt']);assert.equal(a.pushReason,'no_recipient');assert.equal(a.pushDetail.typeOff,1);
gone=new Set([sub('kid').endpoint,sub('kid2').endpoint]);
a=await send('urg-alert-gone',['kid']);assert.equal(a.pushReason,'delivery_failed');assert.equal(a.pushDetail.devices,2);assert.equal(a.pushDetail.failed,2);assert.equal(a.pushDetail.expired,2);
gone=new Set();
a=await send('urg-alert-ok',['mum','grandma']);assert.equal(a.pushStatus,'accepted');assert.equal(a.pushDetail.accepted,1);assert.equal(a.pushDetail.recipients,2);
assert.ok(!JSON.stringify(Object.values(a.pushDetail)).includes('Private'));
console.log('PASS stored per alert: reason, time, counts (recipients/devices/accepted/failed/expired/suppressed/needsResubscribe/typeOff/quiet), target ids');

// Older alerts (before v1.7.1): no reason, or a reason without counts; one outside the 30-day window; one stuck pending.
const iso=(ms:number)=>new Date(Date.now()-ms).toISOString(),H=3600000;
await data.setJSON(pre+'family-alert/old-noreason',{id:'old-noreason',fromId:'mum',fromName:'Sender Alice Name',message:'SECRET-TEXT old',targets:['grandma'],createdAt:iso(5*24*H),pushStatus:'not_sent'});
await data.setJSON(pre+'family-alert/old-quiet',{id:'old-quiet',fromId:'mum',fromName:'Sender Alice Name',message:'SECRET-TEXT quiet',targets:['kid'],createdAt:iso(6*24*H),pushStatus:'not_sent',pushReason:'quiet_hours'});
await data.setJSON(pre+'family-alert/old-40d',{id:'old-40d',fromId:'mum',fromName:'Sender Alice Name',message:'SECRET-TEXT 40d',targets:['kid'],createdAt:iso(40*24*H),pushStatus:'not_sent',pushReason:'no_device'});
await data.setJSON(pre+'family-alert/stuck-pending',{id:'stuck-pending',fromId:'mum',fromName:'Sender Alice Name',message:'SECRET-TEXT stuck',targets:['kid'],createdAt:iso(2*H),pushStatus:'pending'});
await data.setJSON(`households/${famB.id}/family-alert/b-alert-1`,{id:'b-alert-1',fromId:'b1',fromName:'Bob Member',message:'SECRET-TEXT bob',targets:['b1'],createdAt:iso(H),pushStatus:'not_sent',pushReason:'not_configured',pushDetail:{v:1,recipients:1,devices:null,selected:0,accepted:0,failed:0}});

// ---- 2. Role gating.
assert.equal((await S('op=urgent',alice)).status,403,'family account without Studio role');
assert.equal((await S('op=urgent','')).status,401);
const samList=await S('op=urgent&status=all',sam);assert.equal(samList.status,200,'support may read the metadata list');
assert.equal((await S('op=urgent-family&id='+famA.id,sam)).status,403,'drill-down is owner-only');
console.log('PASS role gating: list = Studio read roles (owner, support); per-family drill-down owner-only; others 401/403');

// ---- 3. List: newest first, 30-day window, aggregation, privacy.
const raw=await (await S('op=urgent&status=all&fresh=1',henry)).text(),list=JSON.parse(raw);
for(const secret of ['SECRET-TEXT','Sender Alice Name','Grandma Lan','Kid Minh','Uncle Tuan','Aunt Hoa','Bob Member','grandma','uncle'])assert.ok(!raw.includes(secret),'list never contains '+secret);
assert.equal(list.total,9,'8 in family A within 30 days + 1 in family B');
assert.deepEqual(list.totals,{total:9,sent:1,failed:7,pending:1,unknown:0});
const times=list.rows.map((r:any)=>Date.parse(r.at));assert.deepEqual(times,[...times].sort((x,y)=>y-x),'newest first');
const reasons=Object.fromEntries(list.reasons.map((r:any)=>[r.reason,r.count]));
assert.deepEqual(reasons,{no_device:1,needs_resubscribe:1,no_recipient:1,delivery_failed:1,unknown:1,quiet_hours:1,not_configured:1,unfinished:1});
const old=list.rows.find((r:any)=>r.reason==='unknown');assert.equal(old.status,'failed');assert.equal(old.detail,null,'older alert: no details');
const quiet=list.rows.find((r:any)=>r.reason==='quiet_hours');assert.equal(quiet.detail,null,'reason kept, counts unavailable');
const gr=list.rows.find((r:any)=>r.reason==='delivery_failed');assert.equal(gr.detail.expired,2);assert.equal(gr.family,'Nhà Thử Nghiệm');assert.equal(gr.recipients,1);
assert.ok(list.families.some((f:any)=>f.id===famB.id&&f.failed===1));
const failedOnly=await (await S('op=urgent&status=failed',henry)).json();assert.equal(failedOnly.total,8);assert.ok(failedOnly.rows.every((r:any)=>r.status==='failed'||r.reason==='unfinished'));
const onlyB=await (await S('op=urgent&status=all&family='+famB.id,henry)).json();assert.equal(onlyB.total,1);assert.equal(onlyB.rows[0].reason,'not_configured');assert.equal(onlyB.reasons.length,1);
const p2=await (await S('op=urgent&status=all&size=5&page=2',henry)).json();assert.equal(p2.page,2);assert.equal(p2.rows.length,4);
const tooFar=await (await S('op=urgent&status=all&size=5&page=99',henry)).json();assert.equal(tooFar.page,2,'page clamps');
console.log('PASS list: 30 days newest first, filters (failed/all, family), pagination, reasons aggregated, older alerts without details, no text or names');

// ---- 4. Drill-down: owner-only, audited, names and current devices, still no message text.
const auditCount=async()=>(await (await S('op=audit&type=view_urgent_family',henry)).json()).items.filter((x:any)=>x.action==='view_urgent_family').length;
const before=await auditCount();
const draw=await (await S('op=urgent-family&id='+famA.id,henry)).text(),d=JSON.parse(draw);
assert.ok(!draw.includes('SECRET-TEXT'),'drill-down never contains message text');assert.ok(!/fcm\.googleapis|p256dh|auth/.test(draw),'no endpoints or keys');
assert.equal(d.rows.length,8);assert.equal(d.rows[0].sender,'Sender Alice Name');
const nod=d.rows.find((r:any)=>r.id==='urg-alert-nodevice');assert.deepEqual(nod.recipients.map((x:any)=>x.name),['Grandma Lan Private']);assert.equal(nod.recipients[0].now.devices,0);
const un=d.rows.find((r:any)=>r.id==='urg-alert-resub');assert.equal(un.recipients[0].now.needsResubscribe,1);
const au=d.rows.find((r:any)=>r.id==='urg-alert-typeoff');assert.equal(au.recipients[0].now.urgentOff,1);
assert.equal(await auditCount(),before+1,'drill-down written to the audit log');
const entry=(await (await S('op=audit&type=view_urgent_family',henry)).json()).items.find((x:any)=>x.action==='view_urgent_family');assert.equal(entry.family,famA.id);assert.equal(entry.actor,'henrynguyen');
await S('op=urgent&status=all',henry);assert.equal(await auditCount(),before+1,'the metadata list itself is not a drill-down');
assert.equal((await S('op=urgent-family&id=not-a-family',henry)).status,400);
console.log('PASS drill-down: owner-only, audited (view_urgent_family), sender/recipient names + current device state, no text, endpoints or keys');

// ---- 5. Pure helpers: rows from an overview cached before v1.7.1 (no time/reason/detail) still list.
const now=Date.now(),legacy={computedAt:new Date(now).toISOString(),perFamily:{f1:{alertRows:[{day:new Date(now).toISOString().slice(0,10),pushStatus:'not_sent',accepted:0,targets:2}]}}};
const l=urgentList(legacy,new Map([['f1','Legacy family']]),{now});assert.equal(l.rows[0].dateOnly,true);assert.equal(l.rows[0].reason,'unknown');assert.equal(l.rows[0].detail,null);assert.equal(l.rows[0].recipients,2);
assert.deepEqual(classify({pushStatus:'pending',at:new Date(now-60000).toISOString()},now),{status:'pending',reason:'pending'});
assert.deepEqual(classify({pushStatus:'retrying',at:new Date(now-3600000).toISOString()},now),{status:'pending',reason:'unfinished'});
assert.equal(alertRow({id:'x',message:'SECRET',fromName:'N',createdAt:'2026-10-30T01:00:00Z',pushStatus:'accepted',pushAccepted:2,targets:['a'],pushDetail:{accepted:2,evil:'x'}}).detail.evil,undefined);
assert.ok(!JSON.stringify(alertRow({message:'SECRET',fromName:'Named',createdAt:'2026-10-30T01:00:00Z'})).match(/SECRET|Named/));
assert.equal(pushDetailOf({accepted:0,failed:0,recipients:0,reason:'delivery_failed'},['a','b']).devices,null,'thrown send: device count unknown');
console.log('PASS helpers: legacy cached rows, pending vs unfinished, detail whitelist, no text in rows');
