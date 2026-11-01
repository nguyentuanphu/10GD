// v1.6 service worker (dist/sw.js) in a VM: lite precache list, artwork LRU bound, pinned week cells, lazy catalog
// kept offline, update protocol (new worker waits; SKIP_WAITING) and the friendly Studio offline page.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import zlib from 'node:zlib';
const origin='https://kitchen.example';
const stores=new Map<string,Map<string,Response>>();
const keyOf=(k:any)=>{const u=new URL(typeof k==='string'?k:k.url,origin+'/sw.js');return u.pathname+u.search};
const cacheFor=(name:string)=>{if(!stores.has(name))stores.set(name,new Map());const map=stores.get(name)!;return{
 match:async(k:any,o:any={})=>{const key=keyOf(k);let hit=map.get(key);if(!hit&&o.ignoreSearch){const p=key.split('?')[0];for(const[kk,v]of map)if(kk.split('?')[0]===p){hit=v;break}}return hit?hit.clone():undefined},
 put:async(k:any,v:Response)=>{map.set(keyOf(k),v)},delete:async(k:any)=>map.delete(keyOf(k)),keys:async()=>[...map.keys()].map(k=>new Request(origin+k))}};
let online=true;const fetched:string[]=[];const files=new Map<string,Uint8Array>();
const fakeFetch=async(input:any)=>{const url=new URL(typeof input==='string'?input:input.url,origin+'/sw.js');fetched.push(url.pathname+url.search);if(!online)throw TypeError('offline');
 if(url.pathname==='/startup-scripts.json')return new Response('{"version":1,"hash":"abcdef1234","scripts":[]}',{headers:{'content-type':'application/json'}});
 if(url.pathname.startsWith('/artwork/'))return new Response(files.get(url.pathname)||new Uint8Array(30000),{headers:{'content-type':'image/webp'}});
 return new Response('ok '+url.pathname,{headers:{'content-type':'text/plain'}})};
const handlers:any={};let skipped=0,clientsList:any[]=[];const posted:any[]=[];
const self:any={location:{hostname:'kitchen.example',origin,href:origin+'/sw.js'},registration:{active:null},addEventListener:(n:string,f:any)=>handlers[n]=f,skipWaiting:async()=>{skipped++},clients:{claim:async()=>{},matchAll:async()=>clientsList}};
// The worker's 800 ms index-save debounce runs at once here; network deadlines keep their real values.
const ctx=vm.createContext({AbortController,setTimeout:(f:any,ms:number,...a:any[])=>setTimeout(f,ms===800?1:ms,...a),clearTimeout,TextDecoder,TextEncoder,URL,Request,Response,Headers,console,Promise,JSON,Date,Math,
 fetch:fakeFetch,caches:{open:async(n:string)=>cacheFor(n),keys:async()=>[...stores.keys()],delete:async(n:string)=>stores.delete(n),match:async()=>undefined},self,importScripts:()=>{},verifyOfflineAccess:async()=>null,offlineJwk:()=>null});
vm.runInContext(fs.readFileSync('dist/sw.js','utf8'),ctx);
const run=async(name:string,event:any)=>{const waits:Promise<any>[]=[];let response:any;event.waitUntil=(p:Promise<any>)=>waits.push(p);event.respondWith=(p:any)=>{response=p};handlers[name](event);const r=await response;for(let i=0;i<3;i++){await Promise.allSettled(waits);await new Promise(r=>setTimeout(r,3))}return r};
const get=(path:string,extra:any={})=>run('fetch',{request:new Request(origin+path,extra)});

// 1. Lite precache: shell, styles, icons and the pack list only; well under the 3 MB lite target on the wire.
const ASSETS:string[]=vm.runInContext('ASSETS',ctx);
assert.ok(!ASSETS.some(a=>a.includes('artwork/')),'no artwork precached');
for(const required of ['./','./index.html','./bootstrap.js','./startup-scripts.json','./styles.css','./offline-packs.json','./manifest.webmanifest','./family-logo.png'])assert.ok(ASSETS.includes(required),required);
const wire=ASSETS.map(a=>a==='./'?'index.html':a.slice(2)).reduce((n,f)=>{const b=fs.readFileSync('dist/'+f);return n+(/\.(js|json|css|html|svg|webmanifest)$/.test(f)?zlib.gzipSync(b).length:b.length)},0);
assert.ok(wire<1.5*1024*1024,'lite precache '+wire+' bytes');
// First install takes over at once.
await run('install',{});assert.equal(skipped,1,'first install activates immediately');
for(const a of ASSETS)assert.ok(await cacheFor(vm.runInContext('CACHE',ctx)).match(a),'precached '+a);
await run('activate',{});assert.ok(stores.has('bep-update-protocol-v1'));
console.log('PASS lite precache list ('+(wire/1024).toFixed(0)+' KB on the wire) without artwork; first install takes over');
// 2. Update protocol: with an active worker and an open window, a new worker waits until SKIP_WAITING.
self.registration.active={};clientsList=[{}];skipped=0;await run('install',{});assert.equal(skipped,0,'waits while the app is open');
await run('message',{data:{type:'SKIP_WAITING'}});assert.equal(skipped,1,'SKIP_WAITING activates');
clientsList=[];skipped=0;await run('install',{});assert.equal(skipped,1,'no open window: takes over');
stores.delete('bep-update-protocol-v1');clientsList=[{}];skipped=0;await run('install',{});assert.equal(skipped,1,'older worker without the protocol: takes over as before');
await run('activate',{});
console.log('PASS update protocol: new worker waits while the app is open; SKIP_WAITING, no window or legacy worker take over');
// 3. Artwork cache-on-view with a bounded LRU; stale-while-revalidate at most daily.
const MAX=vm.runInContext('ART_RUNTIME_MAX_ENTRIES',ctx),MAXB=vm.runInContext('ART_RUNTIME_MAX_BYTES',ctx);
for(let i=0;i<MAX+40;i++){const r=await get('/artwork/cells/d'+i+'.webp');assert.equal(r.status,200)}
const runtime=cacheFor('bep-art-runtime-v1'),artKeys=(await runtime.keys()).map(r=>new URL(r.url).pathname).filter(p=>p.startsWith('/artwork/'));
assert.ok(artKeys.length<=MAX,'LRU bound: '+artKeys.length);assert.ok(!artKeys.includes('/artwork/cells/d0.webp'),'oldest evicted');assert.ok(artKeys.includes('/artwork/cells/d'+(MAX+39)+'.webp'),'newest kept');
// Touching an entry keeps it; bytes bound applies too.
await get('/artwork/cells/d50.webp');for(let i=0;i<30;i++)await get('/artwork/cells/x'+i+'.webp');assert.ok(await runtime.match('/artwork/cells/d50.webp'),'recently used entry survives');
files.set('/artwork/dishes-v1.webp',new Uint8Array(2*1024*1024));files.set('/artwork/dishes-v2.webp',new Uint8Array(2*1024*1024));files.set('/artwork/dishes-v3.webp',new Uint8Array(2*1024*1024));files.set('/artwork/dishes-v4.webp',new Uint8Array(2*1024*1024));
for(const n of [1,2,3,4])await get('/artwork/dishes-v'+n+'.webp');
let bytes=0;for(const k of await runtime.keys()){const p=new URL(k.url).pathname;if(p.startsWith('/artwork/'))bytes+=(await (await runtime.match(p))!.arrayBuffer()).byteLength}
assert.ok(bytes<=MAXB,'byte bound '+bytes);assert.ok(!await runtime.match('/artwork/dishes-v1.webp'),'big oldest sheet evicted');
const before=fetched.length;await get('/artwork/dishes-v4.webp');assert.equal(fetched.length,before,'fresh entry answered from cache without revalidation');
online=false;assert.equal((await get('/artwork/dishes-v4.webp')).status,200,'viewed artwork works offline');assert.equal((await get('/artwork/cells/d9999.webp')).status,504,'never-viewed artwork: graceful 504');online=true;
console.log('PASS artwork cache-on-view: LRU entry bound '+MAX+', byte bound '+(MAXB>>20)+' MB, recent entries kept, offline answers');
// 4. Pinned cells for this week's menu: fetched or moved from the LRU, never evicted; unpinned ones return to the LRU.
const pin=async(paths:string[])=>{const out:any[]=[];await run('message',{data:{type:'PRECACHE_ART',paths},source:{postMessage:(m:any)=>out.push(m)}});return out[0]};
let result=await pin(['artwork/cells/d50.webp','artwork/cells/i7.webp','../secret','artwork/cells/d1.webp']);
assert.deepEqual([result.total,result.cached,result.failed],[3,3,0]);const pinned=cacheFor('bep-art-pinned-v1');
assert.ok(await pinned.match('/artwork/cells/d50.webp')&&!await runtime.match('/artwork/cells/d50.webp'),'moved from LRU to pinned');
for(let i=0;i<MAX+5;i++)await get('/artwork/cells/y'+i+'.webp');assert.ok(await pinned.match('/artwork/cells/i7.webp'),'pinned survives LRU pressure');
result=await pin(['artwork/cells/i7.webp']);assert.ok(!await pinned.match('/artwork/cells/d50.webp')&&await runtime.match('/artwork/cells/d50.webp'),'unpinned returns to LRU');
console.log('PASS pinned week artwork: validated paths, survives eviction, unpinned cells return to the LRU');
// 5. Lazy catalog: kept once fetched (one version), served offline; old version used if a new one is unreachable.
assert.equal((await get('/recipe-catalog-data.js?v=old')).status,200);assert.equal((await get('/recipe-catalog-data.js?v=new')).status,200);
const cat=cacheFor('bep-pack-catalog-v1');assert.equal((await cat.keys()).length,1,'one catalog version kept');
online=false;assert.equal(await (await get('/recipe-catalog-data.js?v=new')).text(),'ok /recipe-catalog-data.js');assert.equal((await get('/recipe-catalog-data.js?v=newer')).status,200,'older catalog serves offline');
await cat.delete('/recipe-catalog-data.js?v=new');assert.equal((await get('/recipe-catalog-data.js?v=new')).status,503,'not downloaded: clear 503');
// 6. Studio offline navigation shows a friendly page instead of the app shell.
const studio=await run('fetch',{request:{url:origin+'/studio.html',method:'GET',mode:'navigate',headers:new Headers()}});assert.equal(studio.status,503);assert.match(await studio.text(),/Studio cần kết nối mạng[\s\S]*Studio needs an internet connection/);
// Downloads from the Downloads screen bypass the worker; private APIs are never intercepted.
let responded=false;handlers.fetch({request:new Request(origin+'/artwork/dishes-v9.webp',{headers:{'x-bep-download':'1'}}),respondWith:()=>{responded=true},waitUntil:()=>{}});assert.equal(responded,false);
online=true;
console.log('PASS lazy catalog kept offline (single version), Studio offline page, download requests bypass the worker');
// 7. Upgrade from the previous release keeps its already-downloaded sheets as the detailed-artwork pack.
const old=cacheFor('bep-family-v21-plant-catalog');await old.put('/artwork/dishes-v7.webp',new Response(new Uint8Array(10)));await old.put('/index.html',new Response('old'));
await run('activate',{});assert.ok(!stores.has('bep-family-v21-plant-catalog'),'old app cache retired');assert.ok(await cacheFor('bep-pack-sheets-v1').match('/artwork/dishes-v7.webp'),'old sheets kept, not downloaded again');
console.log('PASS upgrade keeps previously precached sheets as the detailed-artwork download');
