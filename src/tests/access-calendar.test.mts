// Tests are completely local: any unexpected network call fails immediately.
globalThis.fetch=async()=>{throw Error('Network is disabled in mocked tests')};
import assert from 'node:assert/strict';
import fs from 'node:fs';import vm from 'node:vm';import {webcrypto} from 'node:crypto';
import {createFamilyHandler} from '../netlify/functions/family.mjs';
import {createGate} from '../netlify/lib/gate.mjs';
import {resolveAccount} from '../netlify/lib/accounts.mjs';
import {accountFixture} from './helpers/accounts.mjs';
import {automaticMessages} from '../netlify/lib/push.mjs';
const stores=new Map();function getStoreFn({name}){if(!stores.has(name)){const data=new Map();let rev=0;stores.set(name,{get:async k=>data.get(k)?.value??null,getWithMetadata:async k=>data.has(k)?{data:data.get(k).value,etag:data.get(k).etag}:null,setJSON:async(k,value,o={})=>{const old=data.get(k);if(o.onlyIfNew&&old||o.onlyIfMatch&&old?.etag!==o.onlyIfMatch)return{modified:false};const etag=String(++rev);data.set(k,{value,etag});return{modified:true,etag}},delete:async k=>data.delete(k)})}return stores.get(name)}
const fixture=await accountFixture(getStoreFn),{cookie,cookieHeader,accounts,password}=fixture;
const handler=createFamilyHandler({getStoreFn}),req=(op,body,cookie,ip='synthetic-ip')=>new Request('https://test.example/.netlify/functions/family?op='+op,{method:body?'POST':'GET',headers:{Origin:'https://test.example','x-nf-client-connection-ip':ip,...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
assert.match(cookieHeader,/Max-Age=2592000/);assert.match(cookieHeader,/HttpOnly/);assert.match(cookieHeader,/Secure/);
assert(await resolveAccount(req('status',null,cookie),getStoreFn));assert.equal(await resolveAccount(req('status',null,cookie+'x'),getStoreFn),null);assert.equal(await resolveAccount(req('status',null,cookie),getStoreFn,Date.now()+31*86400000),null);
let response=await accounts(fixture.request('login',{username:'fixtureowner',password,trust:false}));assert(!response.headers.get('set-cookie').includes('Max-Age'));assert.equal((await handler(req('state'))).status,401);
for(let i=0;i<10;i++)assert.equal((await accounts(fixture.request('login',{username:'fixtureowner',password:'incorrect'},'', 'rate-test'))).status,401);assert.equal((await accounts(fixture.request('login',{username:'fixtureowner',password},'','rate-test'))).status,429);
let nextCalls=0;const gate=createGate(),context={next:async()=>{nextCalls++;return new Response('public application')}};
assert.equal((await gate(new Request('https://test.example/',{headers:{Accept:'text/html'}}),context)).status,200);assert.equal(nextCalls,1);
assert.equal((await gate(new Request('https://test.example/app.js'),context)).status,200);assert.equal(nextCalls,2);
response=await gate(new Request('https://test.example/login'),context);assert.match(await response.text(),/Tin cậy trình duyệt/);assert(!response.headers.get('set-cookie'));
response=await gate(new Request('https://test.example/',{headers:{Cookie:cookie}}),context);assert.equal(await response.text(),'public application');assert.equal(response.headers.get('cache-control'),'no-cache');assert.equal(nextCalls,3);
assert.equal((await createGate()(new Request('https://test.example/'),context)).status,200);
const familyStore=fixture.store;await familyStore.setJSON('state',{members:[{id:'dad',name:'Dad'},{id:'mum',name:'Mum'}]});
assert.equal((await accounts(fixture.request('link-member',{memberId:'dad'},cookie))).status,200);
response=await handler(req('alert-send',{id:'test-alert-0001',fromId:'dad',targets:['dad'],message:'Synthetic message only'},cookie));assert.equal(response.status,200);const created=(await response.json()).alert;assert.equal(created.message,'Synthetic message only');assert.equal(created.pushAccepted,0);assert.equal(created.pushStatus,'not_sent');
assert.equal((await handler(req('alerts',null,cookie))).status,200);response=await handler(req('alert-read',{id:created.id,memberId:'dad'},cookie));assert((await response.json()).alert.readBy.dad);response=await handler(req('alert-send',{id:created.id,fromId:'dad',targets:['dad'],message:'Attempted overwrite'},cookie));assert.equal((await response.json()).alert.message,'Synthetic message only');
const forcedSender=await handler(req('alert-send',{id:'another-alert-01',fromId:'unknown',targets:['dad'],message:'Test'},cookie));assert.equal(forcedSender.status,200);assert.equal((await forcedSender.json()).alert.fromId,'dad','sender comes from the authenticated membership, never the client body');
const c=vm.createContext({AbortController,setTimeout,clearTimeout,console,Intl,Date,Math,URL,structuredClone,crypto:webcrypto});for(const file of ['seed.js','recipe-catalog.js','core.js','spending-core.js','purchase-units.js','planning-core.js','insights-core.js','family-menu-core.js','availability-core.js'])vm.runInContext(fs.readFileSync('dist/'+file,'utf8'),c);
vm.runInContext(`
const s=defaults();s.weeks={};s.pantry=[];const w=ensureWeek(s,'2026-11-02'),m=w.days['2026-11-02'].dinner,base=mealServings(m,s);m.recipes=[clone(s.recipes[0])];setAvailability(s,'dad',['2026-11-02'],['dinner'],{status:'away',deduct:true,remind:true,note:'Synthetic'});if(Math.abs(mealServings(m,s)-(base-1))>.001)throw Error('Deduction');if(mealServings(w.days['2026-11-02'].breakfast,s)!==base)throw Error('Other meals changed');m.servings=5;if(mealServings(m,s)!==5)throw Error('Manual portions overwritten');m.servings=null;const expected=mealServings(m,s);consumeMeal(s,m);setAvailability(s,'dad',['2026-11-02'],['dinner'],null);if(mealServings(m,s)!==expected)throw Error('Cooked portions changed');undoCook(s,m);if(mealServings(m,s)!==base)throw Error('Undo auto portions');setAvailability(s,'dad',['2026-11-09'],['breakfast'],{status:'busy',deduct:true,remind:true,note:''});const next=ensureWeek(s,'2026-11-09');if(Math.abs(mealServings(next.days['2026-11-09'].breakfast,s)-(base-1))>.001)throw Error('Future generation');if(!validImport(s))throw Error('Calendar backup');s.availability.dad['2026-11-09'].breakfast.deduct='yes';if(validImport(s))throw Error('Invalid deduction accepted');
`,c);
const jobs=automaticMessages({members:[{id:'dad',name:'Dad'}],weeks:{},preferences:{},availability:{dad:{'2026-11-01':{dinner:{status:'away',deduct:true,remind:true,note:''},breakfast:{status:'busy',deduct:false,remind:true,note:''}}}}},new Date('2026-10-31T08:00:00Z'));assert(jobs.some(j=>j.type==='calendar'&&j.body.includes('không trừ')&&j.enBody.includes('no calendar deduction')));
console.log('PASS whole-site gate, trusted/session cookies, expiry/tampering, login throttling, announcement persistence/read status/idempotency (no real push), calendar deductions, cooked/manual protection, future meals and reminder content');
// A signed-out or offline service worker must not fall back to a cached private app.
const handlers={},swCache={matches:0,opened:0},swContext=vm.createContext({AbortController,setTimeout,clearTimeout,URL,Response,Request,console,self:{location:{hostname:'secure.example',origin:'https://secure.example',href:'https://secure.example/sw.js'},addEventListener:(name,fn)=>handlers[name]=fn,skipWaiting:async()=>{},clients:{claim:async()=>{}}},caches:{open:async name=>{if(!name.includes('access'))swCache.opened++;return{addAll:async()=>{},put:async()=>{},match:async()=>null}},match:async()=>{swCache.matches++;return new Response('private cached snapshot')},keys:async()=>[],delete:async()=>true},fetch:async()=>{throw Error('offline')}});vm.runInContext(fs.readFileSync('dist/sw.js','utf8'),swContext);
let pending;handlers.fetch({request:{url:'https://secure.example/',method:'GET',mode:'navigate'},respondWith:p=>pending=p});assert.equal((await pending).status,503);assert.equal(swCache.matches,0);
const beforeInstall=swCache.opened;handlers.install({waitUntil:p=>pending=p});await pending;assert.equal(swCache.opened,beforeInstall+1,'public app cache can be installed without an account');
console.log('PASS offline/signed-out service worker cannot read private cached pages');

// Static assets never consult the account service; business APIs still authenticate themselves.
const previousFetch=globalThis.fetch;let checked=0;
try{globalThis.fetch=async()=>{checked++;throw Error('public assets must not call auth')};assert.equal((await createGate()(new Request('https://test.example/startup-scripts.json'),context)).status,200);assert.equal(checked,0)}finally{globalThis.fetch=previousFetch}
console.log('PASS public app assets do not depend on an account API request');
