// v1.7.3 Family sync server side: stale merging writes get the stored copy in the 409, the drop guard refuses a write
// that would remove items the writer never saw (unless tombstoned), the cheap version check, legacy clients unchanged,
// and Studio counters (writes / merges / stale / real conflicts). Real handlers, in-memory stores, synthetic data only.
import assert from 'node:assert/strict';
import {createAccountsHandler} from '../netlify/lib/accounts.mjs';
import {createFamilyHandler} from '../netlify/functions/family.mjs';
import {droppedItems} from '../netlify/lib/sync-guard.mjs';
import {studioStore} from '../netlify/lib/studio.mjs';
import {memoryStores} from './helpers/accounts.mjs';
const origin='https://test.example';let ip=0;
const req=(endpoint:string,op:string,{method='GET',body,cookie=''}:any={})=>new Request(`${origin}/.netlify/functions/${endpoint}?op=${op}`,{method,headers:{Origin:origin,'x-nf-client-connection-ip':'sync-ip-'+(ip++),...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
const getStoreFn=memoryStores(),accounts=createAccountsHandler({getStoreFn}),family=createFamilyHandler({getStoreFn});
const reg=await accounts(req('accounts','register',{method:'POST',body:{username:'syncowner',name:'Sync owner',password:'synthetic-sync-passphrase-42',trust:true}}));assert.equal(reg.status,201);
const cookie=reg.headers.get('set-cookie')!.split(';')[0];
const fam=await accounts(req('accounts','create-family',{method:'POST',cookie,body:{name:'Sync family'}}));const household=(await fam.json()).household;
const put=async(body:any)=>{const r=await family(req('family','state',{method:'PUT',cookie,body}));return{status:r.status,data:await r.json()}};
const base=()=>({version:1,members:[{id:'m1',name:'A'}],recipes:[{id:'fam-1',name:'Family recipe',custom:true}],weeks:{'2026-11-02':{days:{},extras:[{id:'x1',name:'Milk'}]}},pantry:[{id:'p1',ingredient:'egg',qty:6}],preferences:{}});
// pure guard
assert.deepEqual(droppedItems(base(),base()),[]);
assert.deepEqual(droppedItems(base(),{...base(),pantry:[]}),['pantry/p1']);
assert.deepEqual(droppedItems(base(),{...base(),pantry:[],syncTombstones:{'pantry/p1':1}}),[]);
assert.deepEqual(droppedItems(base(),{...base(),recipes:[],deletedRecipeIds:['fam-1']}),[]);
assert.deepEqual(droppedItems(base(),{...base(),recipes:[]}),['recipes/fam-1']);
assert.deepEqual(droppedItems(base(),{...base(),weeks:{'2026-11-02':{days:{},extras:[]}}}),['weeks/2026-11-02/extras/x1']);
console.log('PASS drop guard: untombstoned removals are detected; tombstones and deletedRecipeIds allow deletes');
// first write, version check
let r=await put({state:base(),etag:null,sync:2});assert.equal(r.status,200);const e1=r.data.etag;
let v=await (await family(req('family','state-version',{cookie}))).json();assert.equal(v.etag,e1);assert.equal(Object.hasOwn(v,'state'),false,'version check carries no document');
// stale merging write → 409 with the stored copy and etag (no extra read needed)
r=await put({state:{...base(),pantry:[...base().pantry,{id:'p2',ingredient:'milk',qty:1}]},etag:'stale',sync:2});
assert.equal(r.status,409);assert.equal(r.data.reason,'stale');assert.equal(r.data.etag,e1);assert.deepEqual(r.data.state.pantry.map((p:any)=>p.id),['p1']);
// would drop an item without a tombstone → refused, stored copy returned
r=await put({state:{...base(),pantry:[]},etag:e1,sync:2});assert.equal(r.status,409);assert.equal(r.data.reason,'would_drop');assert.deepEqual(r.data.dropped,['pantry/p1']);
// same delete, tombstoned → accepted; a merged write is counted as a merge
r=await put({state:{...base(),pantry:[],syncTombstones:{'pantry/p1':Date.now()}},etag:e1,sync:2,merge:{merged:true,conflicts:1}});assert.equal(r.status,200);const e2=r.data.etag;
// legacy client (no sync flag): unchanged behaviour (plain 409, no state, counted as a conflict)
r=await put({state:base(),etag:'old',});assert.equal(r.status,409);assert.equal(r.data.state,undefined);
r=await put({state:{...base(),pantry:[]},etag:e2});assert.equal(r.status,200,'legacy clients are not guarded (they never send tombstones)');
const sync=await studioStore(getStoreFn).get('sync/'+household.id,{type:'json'});
assert.equal(sync.writes,3);assert.equal(sync.merges,1);assert.equal(sync.stale,1);assert.equal(sync.conflicts,3,'refused drop + content conflict reported by the merge + legacy 409');assert.ok(sync.lastMerge);
console.log('PASS family state: stale merging writes get the stored copy, guard refuses silent drops, version check, Studio counts merges vs conflicts');
