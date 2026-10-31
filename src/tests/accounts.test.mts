import assert from 'node:assert/strict';
import {createAccountsHandler,resolveAccount,scopedStore} from '../netlify/lib/accounts.mjs';
import {createFamilyHandler} from '../netlify/functions/family.mjs';
import {createWeatherHandler} from '../netlify/lib/weather.mjs';
import {createGate} from '../netlify/lib/gate.mjs';
const stores=new Map();let revision=0;
function getStoreFn({name}){if(stores.has(name))return stores.get(name);const rows=new Map(),store={rows,async get(key,{type}={}){const r=rows.get(key);return r?structuredClone(r.data):null},async getWithMetadata(key){const r=rows.get(key);return r?structuredClone(r):null},async setJSON(key,data,options={}){const r=rows.get(key);if(options.onlyIfNew&&r||options.onlyIfMatch&&options.onlyIfMatch!==r?.etag)return{modified:false};const etag=String(++revision);rows.set(key,{data:structuredClone(data),etag});return{modified:true,etag}},async set(k,d,o){return this.setJSON(k,d,o)},async delete(key){rows.delete(key)},async *list({prefix=''}){yield{blobs:[...rows.keys()].filter(key=>key.startsWith(prefix)).map(key=>({key}))}}};stores.set(name,store);return store}
const accounts=createAccountsHandler({getStoreFn}),family=createFamilyHandler({getStoreFn});
function request(endpoint,op,{method='GET',body,cookie,origin='https://test.example',ip='test-ip'}={}){return new Request('https://test.example/.netlify/functions/'+endpoint+'?op='+op,{method,headers:{Origin:origin,'x-nf-client-connection-ip':ip,...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})})}
const call=(op,options)=>accounts(request('accounts',op,options));
const password='synthetic-account-passphrase-42';
async function register(username){const r=await call('register',{method:'POST',body:{username,name:username,password,trust:true}});assert.equal(r.status,201);const data=await r.json();assert.equal(data.account.username,username);assert.equal(data.password,undefined);assert.match(r.headers.get('set-cookie'),/HttpOnly.*Secure.*SameSite/);return{cookie:r.headers.get('set-cookie'),...data}}
const alice=await register('alice'),bob=await register('bob'),cara=await register('cara');
const newAccountStatus=await family(request('family','status',{cookie:alice.cookie}));
assert.equal(newAccountStatus.status,200);const newcomerStatus=await newAccountStatus.json();assert.equal(newcomerStatus.mode,'account');assert.equal(newcomerStatus.connected,true);assert.equal(newcomerStatus.household,null);assert.ok(newcomerStatus.offlineGrant);
assert.equal((await call('register',{method:'POST',body:{username:'alice',name:'copy',password}})).status,409);
assert.equal((await call('register',{method:'POST',body:{username:'constructor',name:'bad',password}})).status,400);
assert.equal((await call('register',{method:'POST',ip:'test-ip-pw',body:{username:'shortpw7',name:'Short',password:'1234567'}})).status,400);
assert.equal((await call('register',{method:'POST',ip:'test-ip-pw',body:{username:'exactpw8',name:'Exact8',password:'12345678'}})).status,201);
assert.equal((await call('login',{method:'POST',body:{username:'alice',password:'wrong'}})).status,401);
assert.equal((await call('login',{method:'POST',origin:'https://evil.example',body:{username:'alice',password}})).status,403);
const ca=await call('create-family',{method:'POST',cookie:alice.cookie,body:{name:'Family A'}}),a=(await ca.json()).household;
const cb=await call('create-family',{method:'POST',cookie:bob.cookie,body:{name:'Family B'}}),b=(await cb.json()).household;
assert.notEqual(a.id,b.id);
const state={version:1,members:[{id:'member-a',name:'Alice'}],recipes:[],weeks:{},pantry:[],preferences:{currency:'AUD'},receipts:[],marker:'PRIVATE A'};
assert.equal((await family(request('family','state',{method:'PUT',cookie:alice.cookie,body:{state,etag:null}}))).status,200);
assert.equal((await family(request('family','state',{cookie:bob.cookie}))).status,200);
assert.equal((await (await family(request('family','state',{cookie:bob.cookie}))).json()).state,null);
assert.equal((await call('switch-family',{method:'POST',cookie:bob.cookie,body:{id:a.id}})).status,403);
const image=new Uint8Array([255,216,255,0]).buffer,root=getStoreFn({name:'bep-family-data'});await scopedStore(root,a.id).set('receipt-photo/photo-a',image);assert.equal((await family(request('family','photo&id=photo-a',{cookie:bob.cookie}))).status,404);
const invite=await call('invite',{method:'POST',cookie:alice.cookie,body:{username:'cara',role:'viewer'}}),code=(await invite.json()).code;
assert.equal((await call('join',{method:'POST',cookie:bob.cookie,body:{code}})).status,403);
assert.equal((await call('join',{method:'POST',cookie:cara.cookie,body:{code}})).status,200);
assert.equal((await call('join',{method:'POST',cookie:cara.cookie,body:{code}})).status,403);
assert.equal((await (await family(request('family','state',{cookie:cara.cookie}))).json()).state.marker,'PRIVATE A');
assert.equal((await family(request('family','state',{method:'PUT',cookie:cara.cookie,body:{state:{...state,marker:'bad'},etag:'whatever'}}))).status,403);
assert.equal((await call('invite',{method:'POST',cookie:cara.cookie,body:{username:'bob',role:'editor'}})).status,403);
assert.equal((await call('role',{method:'POST',cookie:alice.cookie,body:{username:'cara',role:'remove'}})).status,200);
assert.equal((await family(request('family','state',{cookie:cara.cookie}))).status,409,'removed account has no household context');
const context=await resolveAccount(request('family','status',{cookie:alice.cookie}),getStoreFn);assert.equal(context.household.id,a.id);
const beforeReset=alice.cookie,recover=await call('recover',{method:'POST',body:{username:'alice',password:'different-synthetic-passphrase-43',recoveryCode:alice.recoveryCode}});assert.equal(recover.status,200);assert.equal((await call('status',{cookie:beforeReset})).status,200);assert.equal((await (await call('status',{cookie:beforeReset})).json()).connected,false);
assert.equal((await call('recover',{method:'POST',body:{username:'alice',password,recoveryCode:alice.recoveryCode}})).status,401);
const login=await call('login',{method:'POST',body:{username:'bob',password}});const sessionCookie=login.headers.get('set-cookie');assert(!sessionCookie.includes('Max-Age'));assert.equal((await call('logout',{method:'POST',cookie:sessionCookie,body:{}})).status,200);assert.equal((await (await call('status',{cookie:sessionCookie})).json()).connected,false);
const gate=createGate();const gated=await gate(new Request('https://test.example/',{headers:{Cookie:bob.cookie}}),{next:async()=>new Response('app')});assert.equal(gated.status,200);assert.equal(gated.headers.get('cache-control'),'no-cache');
let weatherCalls=0;const now=Date.now(),weather=createWeatherHandler({getStoreFn,nowFn:()=>now,fetchFn:async url=>{weatherCalls++;assert.equal(url.hostname,'api.open-meteo.com');return Response.json({current:{temperature_2m:31,time:Math.floor(now/1000)}})}});
const weatherReq=city=>new Request('https://test.example/.netlify/functions/weather?city='+city,{headers:{Cookie:bob.cookie}});assert.equal((await weather(weatherReq('hanoi'))).status,200);assert.equal((await weather(weatherReq('hanoi'))).status,200);assert.equal(weatherCalls,1);assert.equal((await weather(weatherReq('https://evil.example'))).status,400);assert.equal((await weather(new Request('https://test.example/.netlify/functions/weather?city=hanoi'))).status,200);
// Scoped list removes the prefix before push code uses keys to get/delete a subscription.
const sa=scopedStore(root,a.id),sb=scopedStore(root,b.id);await sa.setJSON('push/subscriptions/device-a',{memberId:'a'});await sb.setJSON('push/subscriptions/device-b',{memberId:'b'});const keys=[];for await(const page of sa.list({prefix:'push/subscriptions/'}))keys.push(...page.blobs.map(x=>x.key));assert.deepEqual(keys,['push/subscriptions/device-a']);assert.equal(await sb.get(keys[0]),null);

// Legacy migration is retired; old records are retained and cannot be imported by these endpoints.
await root.setJSON('state',{...state,marker:'LEGACY RETAINED'});
assert.equal((await call('legacy-preview',{cookie:bob.cookie})).status,410);
assert.equal((await call('legacy-migrate',{method:'POST',cookie:bob.cookie,body:{etag:'old'}})).status,410);
assert.equal((await root.get('state')).marker,'LEGACY RETAINED');assert.equal(await sb.get('state'),null);
const concurrentInvite=await call('invite',{method:'POST',cookie:bob.cookie,body:{username:'cara',role:'editor'}}),concurrentCode=(await concurrentInvite.json()).code;
const accepted=await Promise.all([call('join',{method:'POST',cookie:cara.cookie,body:{code:concurrentCode}}),call('join',{method:'POST',cookie:cara.cookie,body:{code:concurrentCode}})]);assert.deepEqual(accepted.map(r=>r.status).sort(),[200,403]);
const {sendPushBatch,pushKeys}=await import('../netlify/lib/push.mjs');const restricted=scopedStore(root,b.id,{bob:{memberId:'member-b'}});await pushKeys(restricted,{create:true});await restricted.setJSON('push/subscriptions/revoked-device',{deviceId:'revoked-device',accountUsername:'cara',memberId:'member-c',subscription:{endpoint:'https://fcm.googleapis.com/x'},types:{urgent:true},quietStart:'00:00',quietEnd:'00:00'});let sends=0;const filtered=await sendPushBatch(restricted,{type:'urgent',title:'Test',body:'test'},{send:async()=>{sends++}});assert.equal(sends,0,'removed/unlinked account must not receive private push');assert.equal(filtered.accepted,0);

console.log('PASS accounts: scrypt, account/session/recovery lifecycle, CSRF, household isolation (state/photos/push keys), targeted one-use invitations, roles/revocation, account Edge gate and authenticated cached weather');
