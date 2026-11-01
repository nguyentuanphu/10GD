// v1.7.1 (owner): only the accounts assigned in Studio can pair and run the price-check
// extension. Covers: migration (trusted + accounts with paired devices, audited once),
// allowlist CRUD (owner-only, CSRF, audited, support role read-only), every device op
// and pair-code path refuses unassigned accounts with 403 not_assigned, a family owner
// who is not assigned cannot pair, removal stops a paired device at once and re-adding
// re-enables it without re-pairing, my-devices reveals nothing to unassigned accounts.
import assert from 'node:assert/strict';
import {createAccountsHandler} from '../netlify/lib/accounts.mjs';
import {createScoutHandler} from '../netlify/functions/scout.mjs';
import {createStudioHandler} from '../netlify/functions/studio.mjs';
import {createPairCode,setTrusted,scoutStore,dayKey} from '../netlify/lib/scout.mjs';
import {listLog,saveSettings,resetSettingsCache} from '../netlify/lib/studio.mjs';
import {memoryStores} from './helpers/accounts.mjs';

const getStoreFn=memoryStores(),origin='https://test.example',password='synthetic-allowlist-passphrase-42',EXT='chrome-extension://abcdefghijklmnopabcdefghijklmnop';
let clock=Date.parse('2026-11-04T07:00:00+11:00');
const env:any={STUDIO_ADMINS:'henrynguyen',STUDIO_SUPPORT:'supporthelper',SCOUT_DEV:'1'};
const adapter={async wantedItems(){return[]},async productMappings(){return[]},async lastSeen(){return{}},async catalogItems(){return[]},async publishObservation(){},async holdObservation(){},async recordMappingCandidate(){}};
const pushes:string[]=[];
const scout=createScoutHandler({getStoreFn,env,nowFn:()=>clock,adapter,notify:async()=>null,assignedPush:async(u:string)=>{pushes.push(u)}});
const studio=createStudioHandler({getStoreFn,env,nowFn:()=>clock,limits:{all:5000,mutate:5000}});
const accounts=createAccountsHandler({getStoreFn});
let ip=0;
const call=(op:string,{method='GET',body,cookie='',token='',from=origin,csrf=''}:any={})=>scout(new Request(`${origin}/.netlify/functions/scout?op=${op}`,{method,headers:{...(from?{Origin:from}:{}),'x-nf-client-connection-ip':'ip-'+(ip++),...(cookie?{Cookie:cookie}:{}),...(token?{Authorization:'Bearer '+token}:{}),...(csrf?{'x-studio-csrf':csrf}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}));
const J=async(r:Response)=>({status:r.status,data:await r.json()});
const dev=(op:string,token:string,body?:any)=>call(op,{method:body===undefined?'GET':'POST',body,token,from:EXT}).then(J);
async function register(username:string){const r=await accounts(new Request(origin+'/.netlify/functions/accounts?op=register',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','x-nf-client-connection-ip':'r'+(ip++)},body:JSON.stringify({username,name:username,password,trust:true})}));assert.equal(r.status,201,username);return r.headers.get('set-cookie')!.split(';')[0]}
const csrfOf=async(cookie:string)=>(await (await studio(new Request(origin+'/.netlify/functions/studio?op=me',{headers:{Cookie:cookie}}))).json()).csrf;

const henry=await register('henrynguyen'),oldTrusted=await register('trustedmum'),oldPaired=await register('paireddad'),owner=await register('familyowner'),helper=await register('supporthelper');
// ---- state before the upgrade: one trusted price checker, one account with a paired device (written directly, as v1.7 did)
await setTrusted(getStoreFn,'trustedmum',true,'henrynguyen',clock);
// A device paired under v1.7 (record written as v1.7 stored it).
const legacyToken='L'.repeat(43);
{const store=scoutStore(getStoreFn),{createHash}=await import('node:crypto');const tokenHash=createHash('sha256').update('scout-token:'+legacyToken).digest('hex');
 await store.setJSON('devices/dev-aaaaaaaaaaaa',{id:'dev-aaaaaaaaaaaa',owner:'paireddad',name:'Legacy PC',stores:{},caps:{},autoAllowed:false,createdAt:new Date(clock).toISOString(),revokedAt:null,tokenHash,client:{},totals:{}});await store.setJSON('tokens/'+tokenHash,{deviceId:'dev-aaaaaaaaaaaa'})}

// ---- 1. migration on the first request after the upgrade (audited once)
{const r=await J(await call('my-devices',{cookie:oldPaired}));assert.equal(r.status,200);assert.equal(r.data.assigned,true,'account with a paired device migrated');
 assert.equal((await J(await call('my-devices',{cookie:oldTrusted}))).data.assigned,true,'trusted price checker migrated');
 const log=await listLog(getStoreFn,'audit',{now:clock,limit:50,from:dayKey(clock-86400000)}),mig=log.items.filter((x:any)=>x.action==='scout_extension_allowlist_migrated');
 assert.equal(mig.length,1,'migration audited exactly once');assert.deepEqual([...mig[0].details.accounts].sort(),['paireddad','trustedmum']);
 assert.equal((await dev('heartbeat',legacyToken,{version:'1.7.0'})).status,200,'existing device keeps working after the migration')}
console.log('PASS migration: trusted price checkers and accounts with paired devices are assigned automatically, audited once; existing devices keep working');

// ---- 2. unassigned family owner: no pairing, and nothing revealed
{const mine=await J(await call('my-devices',{cookie:owner}));assert.deepEqual(mine.data,{assigned:false,trusted:false,familyRole:null,devices:[]},'unassigned: nothing about the network');
 const pc=await J(await call('pair-code',{method:'POST',body:{},cookie:owner}));assert.equal(pc.status,403);assert.equal(pc.data.code,'not_assigned');assert.match(pc.data.errorEn,/isn’t allowed to use the extension/);
 await assert.rejects(()=>createPairCode(getStoreFn,'familyowner',clock,env),(e:any)=>e.code==='not_assigned'&&e.status===403)}
console.log('PASS a family owner who is not assigned in Studio cannot create a pairing code (403 not_assigned) and my-devices reveals nothing');

// ---- 3. Studio allowlist CRUD: owner only, CSRF, audited; support role is read-only
const hc=await csrfOf(henry);
const S=(op:string,body?:any,cookie=henry,csrf=hc)=>call(op,{method:body===undefined?'GET':'POST',body,cookie,csrf}).then(J);
{assert.equal((await call('studio-extension-users',{method:'POST',body:{username:'familyowner',grant:true},cookie:henry})).status,403,'CSRF required');
 assert.equal((await S('studio-extension-users',{username:'familyowner',grant:true},owner,await csrfOf(owner))).status,403,'non-Studio account refused');
 await saveSettings(getStoreFn,{flags:{supportRole:true}});resetSettingsCache();
 const sh=await csrfOf(helper);const sup=await S('studio-extension-users',{username:'familyowner',grant:true},helper,sh);assert.equal(sup.status,403,'support role is read-only');
 assert.equal((await S('studio-extension-users',{username:'nobody-here',grant:true})).status,404,'unknown account refused');
 const ok=await S('studio-extension-users',{username:'FamilyOwner',grant:true});assert.equal(ok.status,200);assert.ok(ok.data.extensionUsers.some((u:any)=>u.username==='familyowner'&&u.by==='henrynguyen'&&u.source==='studio'));
 assert.deepEqual(pushes,['familyowner'],'a new assignment pushes once to that account');await S('studio-extension-users',{username:'familyowner',grant:true});assert.deepEqual(pushes,['familyowner'],'re-saving an existing assignment does not push again');
 {const m=await J(await call('my-devices',{cookie:owner}));assert.equal(m.data.assigned,true);assert.ok(m.data.grantedAt,'grantedAt for the one-time notice');assert.equal((await J(await call('my-devices',{cookie:oldTrusted}))).data.grantedAt,null,'no notice for migrated accounts')}
 const ov=await S('studio-overview');assert.ok(ov.data.extensionUsers.map((u:any)=>u.username).includes('trustedmum'));assert.deepEqual(ov.data.admins,['henrynguyen'])}
// now the owner pairs
const code=(await J(await call('pair-code',{method:'POST',body:{},cookie:owner}))).data.code;assert.match(code,/^[A-Z0-9]{8}$/);
const paired=await J(await call('pair',{method:'POST',body:{code,name:'Owner PC',postcode:'2166'},from:EXT}));assert.equal(paired.status,201);const token=paired.data.token,deviceId=paired.data.device.id;
assert.equal((await dev('heartbeat',token,{version:'1.7.1'})).status,200);
console.log('PASS Studio allowlist: add needs owner + CSRF (support read-only, unknown account refused), a new assignment pushes once and sets grantedAt, assigned owner pairs');

// ---- 4. removal stops the device at once; every device op refuses; re-adding re-enables without re-pairing
{const code2=(await J(await call('pair-code',{method:'POST',body:{},cookie:owner}))).data.code;
 const rm=await S('studio-extension-users',{username:'familyowner',grant:false,reason:'test'});assert.equal(rm.status,200);
 assert.equal(rm.data.devices.find((d:any)=>d.id===deviceId).status,'access-removed','Studio shows Access removed');
 for(const [op,body] of [['heartbeat',{}],['device',undefined],['tasks',{runId:'run-abcdef'}],['results',{items:[]}],['run-now',{}],['device-settings',{name:'x'}]] as const){const r=await dev(op,token,body as any);assert.equal(r.status,403,op);assert.equal(r.data.code,'not_assigned',op)}
 const p2=await J(await call('pair',{method:'POST',body:{code:code2,name:'Second'},from:EXT}));assert.equal(p2.status,403,'an earlier code stops working when the account is removed');assert.equal(p2.data.code,'not_assigned');
 assert.equal((await J(await call('pair-code',{method:'POST',body:{},cookie:owner}))).status,403);
 const sc=await S('studio-pair-code',{username:'familyowner'});assert.equal(sc.status,403,'Studio cannot make a code for an unassigned account');assert.equal(sc.data.code,'not_assigned');
 assert.equal((await J(await call('my-devices',{cookie:owner}))).data.devices.length,0);
 await S('studio-extension-users',{username:'familyowner',grant:true});assert.deepEqual(pushes,['familyowner','familyowner'],'re-assignment after removal notifies again');assert.equal((await dev('heartbeat',token,{})).status,200,'re-adding the account re-enables its device without re-pairing');
 const bound=await S('studio-pair-code',{username:'familyowner'});assert.equal(bound.status,201);assert.equal(bound.data.account,'familyowner','Studio code bound to the assigned account');
 const p3=await J(await call('pair',{method:'POST',body:{code:bound.data.code,name:'Bound'},from:EXT}));assert.equal(p3.status,201);assert.equal(p3.data.device.owner,'familyowner');
 assert.equal((await dev('unpair',p3.data.token,{})).status,200,'unpair always works')}
{const log=await listLog(getStoreFn,'audit',{now:clock,limit:100,from:dayKey(clock-86400000)}),acts=log.items.map((x:any)=>x.action);
 assert.ok(acts.includes('scout_extension_access_grant')&&acts.includes('scout_extension_access_remove'),'grant and removal audited');
 assert.ok(log.items.some((x:any)=>x.action==='scout_pair_code'&&x.details?.account==='familyowner'),'Studio code audited with its account')}
// Henry (STUDIO_ADMINS) is always allowed, without being on the list.
assert.equal((await J(await call('my-devices',{cookie:henry}))).data.assigned,true);
console.log('PASS removal stops the paired device at once (heartbeat/device/tasks/results/run-now/settings → 403 not_assigned, codes refused, Studio shows Access removed); re-adding re-enables it; Studio codes are bound to an assigned account; admin always allowed');

// The push itself: type 'scout' to the account's own devices only, linking to Today (quiet hours/types handled by sendPushBatch).
{const {assignedMessage}=await import('../netlify/lib/scout-notify.mjs');const {pushPayload}=await import('../netlify/lib/push.mjs');
 const vi=JSON.parse(pushPayload({type:'scout',...assignedMessage},'vi')),en=JSON.parse(pushPayload({type:'scout',...assignedMessage},'en'));
 assert.equal(vi.title,'Bạn đã được cấp quyền So Giá');assert.equal(en.title,'You can now use Price Check');assert.equal(vi.url,'/#today');assert.equal(vi.type,'scout')}
console.log('PASS assignment push: VI/EN text, opens Today, normal (non-urgent) scout type so per-device types and quiet hours apply');
