// v1.7.2 (owner): Studio "Danh sách quét / Scan list". Today's plan grouped by kind and store with statuses and the
// empty-plan reason; re-plan is idempotent; pinned catalogue items enter the plan above wanted items; specials pages
// are validated against the retailer's hosts (wrong host refused); owner product links add (confirmed at once) /
// remove; synonyms/exclusions stored for matching; every write audited; support role read-only. Synthetic data only.
import assert from 'node:assert/strict';
import {createAccountsHandler} from '../netlify/lib/accounts.mjs';
import {createScoutHandler} from '../netlify/functions/scout.mjs';
import {createStudioHandler} from '../netlify/functions/studio.mjs';
import {createPairCode,setExtensionAllowed,editDevice,matchExtensions,listTasks,dayKey as scoutDay} from '../netlify/lib/scout.mjs';
import {listLog,dayKey,saveSettings,resetSettingsCache} from '../netlify/lib/studio.mjs';
import {memoryStores} from './helpers/accounts.mjs';

const getStoreFn=memoryStores(),origin='https://test.example',EXT='chrome-extension://abcdefghijklmnopabcdefghijklmnop';
let clock=Date.parse('2026-11-03T10:00:00+11:00');// a Tuesday (no Wednesday specials boost)
const env:any={STUDIO_ADMINS:'henrynguyen',STUDIO_SUPPORT:'supporthelper',SCOUT_DEV:'1'};
const scout=createScoutHandler({getStoreFn,env,nowFn:()=>clock,notify:async()=>null,assignedPush:async()=>{}});// default adapter (real product memory)
const studio=createStudioHandler({getStoreFn,env,nowFn:()=>clock,limits:{all:5000,mutate:5000}});
const accounts=createAccountsHandler({getStoreFn});
let ip=0;
const call=(op:string,{method='GET',body,cookie='',token='',from=origin,csrf=''}:any={})=>scout(new Request(`${origin}/.netlify/functions/scout?op=${op}`,{method,headers:{...(from?{Origin:from}:{}),'x-nf-client-connection-ip':'ip-'+(ip++),...(cookie?{Cookie:cookie}:{}),...(token?{Authorization:'Bearer '+token}:{}),...(csrf?{'x-studio-csrf':csrf}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}));
const J=async(r:Response)=>({status:r.status,data:await r.json()});
const reg=async(u:string)=>{const r=await accounts(new Request(origin+'/.netlify/functions/accounts?op=register',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','x-nf-client-connection-ip':'r'+(ip++)},body:JSON.stringify({username:u,name:u,password:'synthetic-scanlist-passphrase-42',trust:true})}));assert.equal(r.status,201);return r.headers.get('set-cookie')!.split(';')[0]};
const henry=await reg('henrynguyen'),helper=await reg('supporthelper');
await saveSettings(getStoreFn,{flags:{supportRole:true}});resetSettingsCache();
const csrfOf=async(c:string)=>(await (await studio(new Request(origin+'/.netlify/functions/studio?op=me',{headers:{Cookie:c}}))).json()).csrf;
const hc=await csrfOf(henry),sc=await csrfOf(helper);
const post=(op:string,body:any,who=henry,csrf=hc)=>call(op,{method:'POST',body,cookie:who,csrf}).then(J);
const view=async(who=henry)=>J(await call('studio-scanlist',{cookie:who}));
const audits=async()=>(await listLog(getStoreFn,'audit',{now:clock,limit:500,from:dayKey(clock-86400000)})).items.map((x:any)=>x.action);

// Empty plan reasons: Auto off → no allowed devices → no stores.
let v=await view();assert.equal(v.status,200);assert.equal(v.data.emptyReason,'auto-off');assert.equal(v.data.totals.all,0);
assert.equal((await post('studio-network',{patch:{autoScout:'on',schedule:[{days:[0,1,2,3,4,5,6],start:'00:00',end:'24:00'}]}})).status,200);
v=await view();assert.equal(v.data.emptyReason,'no-allowed-devices');
await setExtensionAllowed(getStoreFn,'henrynguyen',true,'henrynguyen',clock);const {code}=await createPairCode(getStoreFn,'henrynguyen',clock,env);
const paired=await J(await call('pair',{method:'POST',from:EXT,body:{code,name:'Henry PC',suburb:'Hurstville',postcode:'2220',stores:{},version:'1.7.0'}}));
await editDevice(getStoreFn,paired.data.device.id,(d:any)=>({...d,autoAllowed:true}));
v=await view();assert.equal(v.data.emptyReason,'no-stores');
await editDevice(getStoreFn,paired.data.device.id,(d:any)=>({...d,stores:{woolworths:'Hurstville'}}));

// Sources: pin an item (only Woolworths), specials (wrong host refused), a product link, synonyms.
assert.equal((await post('studio-pin',{itemId:'not-in-catalogue'})).status,400);
assert.equal((await post('studio-pin',{itemId:'rau-muong',retailers:['woolworths']})).status,200);
assert.equal((await post('studio-specials',{retailer:'woolworths',urls:['https://evil.example/specials']})).status,400,'wrong host refused');
assert.equal((await post('studio-specials',{retailer:'woolworths',urls:['https://www.coles.com.au/on-special']})).status,400,'another retailer refused');
assert.equal((await post('studio-specials',{retailer:'woolworths',urls:['http://www.woolworths.com.au/shop/browse/specials']})).status,400,'https only');
assert.equal((await post('studio-specials',{retailer:'woolworths',urls:['https://www.woolworths.com.au/shop/browse/specials/half-price','https://www.woolworths.com.au/shop/browse/specials/prices-dropped']})).status,200);
assert.equal((await post('studio-mapping',{action:'add',itemId:'ngo',retailer:'woolworths',url:'https://www.coles.com.au/product/x-123456'})).status,422,'link must belong to the retailer');
const ml=await post('studio-mapping',{action:'add',itemId:'ngo',retailer:'woolworths',url:'https://www.woolworths.com.au/shop/productdetails/123456/coriander-bunch?utm=x'});assert.equal(ml.status,200);assert.equal(ml.data.productId,'123456');
assert.equal((await post('studio-synonyms',{itemId:'ngo',add:['Coriander','cilantro'],exclude:['coriander seed']})).status,200);
assert.deepEqual((await matchExtensions(getStoreFn)).ngo.add,['coriander','cilantro']);

// Re-plan: pinned first among item tasks (95 > wanted), specials at 30 on a Tuesday, the owner link used as the URL.
const rp=await post('studio-replan',{});assert.equal(rp.status,200);assert.ok(rp.data.count>0);
v=await view();const kinds=v.data.groups.map((g:any)=>g.kind);assert.deepEqual(kinds.slice(0,2),['specials','pinned'],'groups in the documented order: '+kinds.join(','));
const pin=v.data.groups.find((g:any)=>g.kind==='pinned').stores[0];assert.equal(pin.retailer,'woolworths');assert.equal(pin.tasks[0].itemId,'rau-muong');assert.equal(pin.tasks[0].priority,95);assert.equal(pin.tasks[0].status.code,'queued');
assert.equal(v.data.groups.find((g:any)=>g.kind==='specials').count,2);
const tasks=await listTasks(getStoreFn,scoutDay(clock));const ngo=tasks.find((t:any)=>t.itemId==='ngo');assert.match(ngo.url,/productdetails\/123456/,'confirmed link used');assert.ok(['mapped','stale'].includes(ngo.kind));
assert.equal(v.data.emptyReason,null);assert.equal(v.data.totals.all,tasks.length);
assert.deepEqual(v.data.sources.pinned.map((p:any)=>[p.itemId,p.retailers]),[['rau-muong',['woolworths']]]);
assert.equal(v.data.sources.specials.woolworths.source,'studio');assert.equal(v.data.sources.links.some((l:any)=>l.itemId==='ngo'&&l.retailer==='woolworths'),true);
assert.equal(v.data.sources.catalog.length,164/* v1.7.8: 28 more staples (beef ribs, gravy beef … and app ingredients without a catalogue item) */);assert.deepEqual(v.data.sources.catalog.find((c:any)=>c.itemId==='ngo').exclude,['coriander seed']);
// Idempotent: a second re-plan adds nothing and keeps statuses.
const n0=tasks.length;assert.equal((await post('studio-replan',{})).data.created??0,0);assert.equal((await listTasks(getStoreFn,scoutDay(clock))).length,n0);

// Statuses: a device leases tasks (shown with its name), finishes one with prices.
const lease=await J(await call('tasks',{method:'POST',from:EXT,token:paired.data.token,body:{runId:'run-scan01',autoEnabled:true,max:2}}));assert.equal(lease.status,200);assert.equal(lease.data.tasks[0].itemId,'rau-muong','pinned outranks specials on a Tuesday');
v=await view();const leased=v.data.groups.flatMap((g:any)=>g.stores.flatMap((s:any)=>s.tasks)).filter((t:any)=>t.status.code==='leased');assert.equal(leased.length,2);assert.equal(leased[0].status.device,'Henry PC');
assert.equal(v.data.totals.leased,2);

// Remove the link and the pin; audited; support role reads but cannot change anything.
assert.equal((await post('studio-mapping',{action:'remove',itemId:'ngo',retailer:'woolworths'})).data.removed,1);
v=await view();assert.equal(v.data.sources.links.some((l:any)=>l.itemId==='ngo'),false);
assert.equal((await post('studio-pin',{itemId:'rau-muong',pin:false})).status,200);
const acts=await audits();for(const a of ['scout_pin_item','scout_unpin_item','scout_specials','scout_mapping_add','scout_mapping_remove','scout_match_words','scout_replan'])assert.ok(acts.includes(a),'audited '+a);
assert.equal((await view(helper)).status,200,'support reads');
for(const [op,b] of [['studio-pin',{itemId:'ngo'}],['studio-replan',{}],['studio-specials',{retailer:'coles',urls:[]}],['studio-mapping',{action:'remove',itemId:'ngo',retailer:'woolworths'}],['studio-synonyms',{itemId:'ngo',add:['x1']}]] as any[])assert.equal((await post(op,b,helper,sc)).status,403,'support cannot '+op);
assert.equal((await J(await call('studio-scanlist',{}))).status,401,'signed out');
console.log('PASS scout scan list: plan grouping + statuses + empty reasons, idempotent re-plan, pinned priority, specials validation, owner links add/remove, synonyms, audit, role gating');
