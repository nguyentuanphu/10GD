// v1.7.2 (owner): the same computer paired again after the extension was removed and installed (its storage and
// token are gone) must not become a second device. Covers: the pairing answer lists earlier pairings of the same
// account + label as replacement candidates; accepting (op=replace, or pair with replace:'all') revokes the old
// device (its token is refused), copies its settings (stores, pace, auto permission, schedule, name), keeps its
// history under the new device, and writes device_replaced to the Studio audit log; declining keeps both; Studio's
// overview marks the older pairing (stale after 24 h silent), owner rename + merge-into (audited); "Run now on all"
// never runs a stale old pairing of the same computer. Synthetic data only.
import assert from 'node:assert/strict';
import {createAccountsHandler} from '../netlify/lib/accounts.mjs';
import {createScoutHandler} from '../netlify/functions/scout.mjs';
import {createStudioHandler} from '../netlify/functions/studio.mjs';
import {createPairCode,setExtensionAllowed,editDevice,getDevice,saveNetwork,staleDuplicates,listDevices} from '../netlify/lib/scout.mjs';
import {listLog,dayKey} from '../netlify/lib/studio.mjs';
import {memoryStores} from './helpers/accounts.mjs';

const getStoreFn=memoryStores(),origin='https://test.example',EXT='chrome-extension://abcdefghijklmnopabcdefghijklmnop';
let clock=Date.parse('2026-11-04T07:00:00+11:00');
const env:any={STUDIO_ADMINS:'henrynguyen',SCOUT_DEV:'1'};
const adapter={async wantedItems(){return[]},async productMappings(){return[]},async lastSeen(){return{}},async catalogItems(){return[]},async publishObservation(){},async holdObservation(){},async recordMappingCandidate(){}};
const scout=createScoutHandler({getStoreFn,env,nowFn:()=>clock,adapter,notify:async()=>null,assignedPush:async()=>{}});
const studio=createStudioHandler({getStoreFn,env,nowFn:()=>clock,limits:{all:5000,mutate:5000}});
const accounts=createAccountsHandler({getStoreFn});
let ip=0;
const call=(op:string,{method='GET',body,cookie='',token='',from=origin,csrf=''}:any={})=>scout(new Request(`${origin}/.netlify/functions/scout?op=${op}`,{method,headers:{...(from?{Origin:from}:{}),'x-nf-client-connection-ip':'ip-'+(ip++),...(cookie?{Cookie:cookie}:{}),...(token?{Authorization:'Bearer '+token}:{}),...(csrf?{'x-studio-csrf':csrf}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}));
const J=async(r:Response)=>({status:r.status,data:await r.json()});
const dev=(op:string,token:string,body?:any)=>call(op,{method:body===undefined?'GET':'POST',body,token,from:EXT}).then(J);
const reg=async(u:string)=>{const r=await accounts(new Request(origin+'/.netlify/functions/accounts?op=register',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','x-nf-client-connection-ip':'r'+(ip++)},body:JSON.stringify({username:u,name:u,password:'synthetic-replace-passphrase-42',trust:true})}));assert.equal(r.status,201);return r.headers.get('set-cookie')!.split(';')[0]};
const henry=await reg('henrynguyen');await reg('alice');
const csrf=(await (await studio(new Request(origin+'/.netlify/functions/studio?op=me',{headers:{Cookie:henry}}))).json()).csrf;
const studioPost=(op:string,body:any)=>call(op,{method:'POST',body,cookie:henry,csrf}).then(J);
await setExtensionAllowed(getStoreFn,'alice',true,'henrynguyen',clock);
const pair=async(user:string,name:string,extra:any={})=>{const {code}=await createPairCode(getStoreFn,user,clock,env);return J(await call('pair',{method:'POST',from:EXT,body:{code,name,suburb:'Hurstville',postcode:'2220',stores:extra.stores||{},version:'1.7.0',...extra}}))};
const audits=async()=>(await listLog(getStoreFn,'audit',{now:clock,limit:500,from:dayKey(clock-86400000)})).items;

// First pairing, configured in Studio: stores, pace, auto allowed, schedule; owner renames it.
const first=await pair('alice','Chrome · máy tính',{stores:{woolworths:'Hurstville'}});assert.equal(first.status,201);assert.deepEqual(first.data.replaceCandidates,[]);
const A=first.data.device.id,tokA=first.data.token;
await editDevice(getStoreFn,A,(d:any)=>({...d,autoAllowed:true,pacing:{minMs:30000,maxMs:60000},schedule:[{days:[1,2],start:'09:00',end:'11:00'}],totals:{pages:12,prices:9,parseFail:1,blocked:0}}));
assert.equal((await studioPost('studio-device',{deviceId:A,action:'update',name:'Máy tính phòng khách'})).status,200,'owner rename');
assert.equal((await getDevice(getStoreFn,A)).name,'Máy tính phòng khách');
assert.ok((await audits()).some((x:any)=>x.action==='scout_device_update'),'rename audited');
await dev('heartbeat',tokA,{version:'1.7.0'});

// 1. Re-pair after uninstall (fresh storage, same label): the old pairing is offered; accepting replaces it.
clock+=3600000;
const second=await pair('alice','Chrome · máy tính');assert.equal(second.status,201);
assert.deepEqual(second.data.replaceCandidates.map((c:any)=>c.id),[A],'earlier pairing offered as a replacement');
assert.match(second.data.replaceCandidates[0].shortId,/^[a-f0-9]{6}$/);assert.ok(second.data.replaceCandidates[0].pairedAt);
const B=second.data.device.id,tokB=second.data.token;
// The new token can only replace devices of its own account with the same label.
const other=await pair('henrynguyen','Chrome · máy tính');
const r1=await dev('replace',tokB,{replace:[other.data.device.id,A]});assert.equal(r1.status,200);assert.deepEqual(r1.data.replaced,[A],'only the same account');
assert.equal((await dev('heartbeat',tokA,{version:'1.7.0'})).status,401,'old token refused');
const b=await getDevice(getStoreFn,B),a=await getDevice(getStoreFn,A);
assert.ok(a.revokedAt);assert.equal(a.replacedBy,B);
assert.equal(b.name,'Máy tính phòng khách','renamed name carried over');assert.deepEqual(b.stores,{woolworths:'Hurstville'});assert.equal(b.autoAllowed,true);
assert.deepEqual(b.pacing,{minMs:30000,maxMs:60000});assert.deepEqual(b.schedule,[{days:[1,2],start:'09:00',end:'11:00'}]);assert.deepEqual(b.replaces,[A]);assert.equal(b.totals.pages,12,'history totals kept');
const ra=(await audits()).find((x:any)=>x.action==='device_replaced');assert.ok(ra,'device_replaced audited');assert.equal(ra.details.replaced,A);assert.equal(ra.target.id,B);
// Its history stays attached: the new device's timeline includes the old device's events.
const tl=await J(await call('studio-device-timeline&deviceId='+B,{cookie:henry}));assert.ok(tl.data.events.some((e:any)=>e.type==='device_paired'),'old history in the new timeline');

// 2. Declining keeps both; pair with replace:'all' does it in one step.
clock+=3600000;
const third=await pair('alice','Chrome · máy tính');assert.deepEqual(third.data.replaceCandidates.map((c:any)=>c.id),[B]);
assert.equal((await dev('heartbeat',tokB,{version:'1.7.0'})).status,200,'declined: old still works');
assert.equal((await dev('heartbeat',third.data.token,{version:'1.7.0'})).status,200,'declined: new works');
const C=third.data.device.id;
// 3. Studio overview: the older one is marked (not yet stale while it still checks in); after 24 h silent it is stale.
let ov=(await J(await call('studio-overview',{cookie:henry}))).data;let row=ov.devices.find((d:any)=>d.id===B);
assert.equal(row.possibleOld.newerId,C);assert.equal(row.possibleOld.stale,false);assert.equal(ov.devices.find((d:any)=>d.id===C).possibleOld,null);
assert.match(row.shortId,/^[a-f0-9]{6}$/);assert.ok(row.pairedAt);assert.equal(row.replaces,1);
await dev('heartbeat',third.data.token,{version:'1.7.0'});clock+=25*3600000;await dev('heartbeat',third.data.token,{version:'1.7.0'});
ov=(await J(await call('studio-overview',{cookie:henry}))).data;row=ov.devices.find((d:any)=>d.id===B);assert.equal(row.possibleOld.stale,true,'silent > 24 h');
assert.deepEqual([...staleDuplicates(await listDevices(getStoreFn),clock).keys()],[B]);
// 4. Run now on all: the stale old pairing of the same computer is not run.
await saveNetwork(getStoreFn,{autoScout:'on'},'henrynguyen',clock);await editDevice(getStoreFn,C,(d:any)=>({...d,autoAllowed:true}));await editDevice(getStoreFn,B,(d:any)=>({...d,autoAllowed:true}));
const run=await studioPost('studio-run-now',{all:true});assert.equal(run.status,200);assert.ok(run.data.devices.includes(C));assert.ok(!run.data.devices.includes(B),'old pairing skipped');
// 5. Studio "Merge into the newer one" (owner, audited) cleans up an existing duplicate.
const m=await studioPost('studio-device',{deviceId:B,action:'merge-into',targetId:C});assert.equal(m.status,200);assert.equal(m.data.replaced,B);
assert.equal((await dev('heartbeat',tokB,{version:'1.7.0'})).status,401);const c=await getDevice(getStoreFn,C);assert.deepEqual(c.replaces.sort(),[A,B].sort());assert.equal(c.name,'Máy tính phòng khách');
assert.ok((await audits()).some((x:any)=>x.action==='scout_device_replaced'&&x.details?.replaced===B),'Studio merge audited');
assert.equal((await studioPost('studio-device',{deviceId:other.data.device.id,action:'merge-into',targetId:C})).status,409,'never across accounts');
// 6. pair with replace:'all' (the extension asked first) replaces in one step.
clock+=60000;const fourth=await pair('alice','Chrome · máy tính',{replace:'all'});assert.deepEqual(fourth.data.replaced,[C]);assert.deepEqual(fourth.data.replaceCandidates,[]);
assert.equal((await dev('heartbeat',third.data.token,{version:'1.7.0'})).status,401);
// A different label is a different computer: never offered.
const laptop=await pair('alice','Edge · laptop');assert.deepEqual(laptop.data.replaceCandidates,[]);
console.log('PASS scout re-pair: replacement offered, old token refused, settings + history kept, audited; decline keeps both; stale hint; rename; merge; run-now dedupe');
