'use strict';
if(typeof importScripts==='function')importScripts('./offline-access.js');
const ACCESS_CACHE='bep-family-access-v1';
const CACHE='bep-family-v22-lite';
// v1.6 lite install: the app shell, styles, icons and the offline pack list only (~0.5 MB on the wire).
// Artwork is cached when viewed (bounded, least-recently-used), this week's menu and family recipe cells are
// pinned on request from the page, and larger packs are downloaded from Other settings → Downloads.
const ASSETS=['./','./index.html','./bootstrap.js','./offline-access.js','./startup-scripts.json','./styles.css','./offline-packs.json','./family-logo.png','./icon.svg','./notification-icon.png','./notification-icon.svg','./icon-192.png','./icon-512.png','./manifest.webmanifest'];
const ART_PINNED='bep-art-pinned-v1',ART_RUNTIME='bep-art-runtime-v1',ART_INDEX='/__bep-art-index';
const PACK_ART='bep-pack-art-v1',PACK_SHEETS='bep-pack-sheets-v1',PACK_CATALOG='bep-pack-catalog-v1',PACK_OCR='bep-pack-ocr-v1';
const ART_RUNTIME_MAX_ENTRIES=240,ART_RUNTIME_MAX_BYTES=16*1024*1024,ART_REVALIDATE_MS=86400000,PIN_LIMIT=600;
const CATALOG_HASH='__BEP_CATALOG_HASH__';
async function fetchWithDeadline(input,options={},ms=8000){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),ms);
 try{const response=await fetch(input,{...options,signal:controller.signal});await response.clone().arrayBuffer();return response}finally{clearTimeout(timer)}
}
// The startup pack carries its content hash as the second JSON key; keep it beside the
// cached copy so a loader expecting that exact pack is answered without the network.
const PACK='./startup-scripts.json';
async function storePack(cache,response){const body=await response.clone().arrayBuffer(),hash=new TextDecoder().decode(body.slice(0,160)).match(/"hash":"([a-f0-9]{8,64})"/)?.[1]||'',headers=new Headers(response.headers);headers.set('x-bep-pack-hash',hash);await cache.put(PACK,new Response(body,{status:200,headers}));return hash}
async function refreshPack(cache,ms){const response=await fetchWithDeadline(new URL(PACK,self.location.href).href,{cache:'no-cache',credentials:'same-origin'},ms);if(response.ok&&!response.redirected&&(response.headers.get('content-type')||'').includes('application/json'))await storePack(cache,response);return response}
// Images change rarely; show the cached copy at once and refresh it for the next launch.
const staleFirst=url=>/\.(png|webp|svg|webmanifest)$/.test(url.pathname);
function publicAsset(request){const url=new URL(request.url);return url.origin===self.location.origin&&ASSETS.some(path=>new URL(path,self.location.href).pathname===url.pathname)}
const isArtwork=url=>url.origin===self.location.origin&&/^\/artwork\/[a-z0-9/_-]+\.webp$/i.test(url.pathname);
const isCatalog=url=>url.origin===self.location.origin&&url.pathname==='/recipe-catalog-data.js';
const isOcrVendor=url=>url.origin===self.location.origin&&url.pathname.startsWith('/vendor/tesseract/');
function offlinePage(title,body){return new Response(`<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{font:16px/1.5 system-ui,sans-serif;margin:0;padding:32px 20px;background:#faf9f5;color:#1f2a24}main{max-width:520px;margin:auto}a{display:inline-block;margin-top:16px;padding:12px 18px;border-radius:12px;background:#174e3c;color:#fff;text-decoration:none;min-height:44px;box-sizing:border-box}@media(prefers-color-scheme:dark){body{background:#151a17;color:#eef2ee}}</style><main>${body}<p><a href="/">← Bếp Nhà / Back to the app</a></p></main></html>`,{status:503,headers:{'Content-Type':'text/html; charset=utf-8'}})}
async function cachedOfflineResponse(request){
 const url=new URL(request.url);
 if(request.mode==='navigate'&&url.pathname==='/studio.html')return offlinePage('Studio · Offline','<h1>Studio cần kết nối mạng</h1><p>Studio chỉ dùng khi có mạng. Dữ liệu bếp trên máy này vẫn dùng được.</p><p lang="en">Studio needs an internet connection. Your kitchen data on this device is still available.</p>');
 if(!publicAsset(request)&&request.mode!=='navigate')return new Response('Không có bản tải offline.',{status:503});
 const cache=await caches.open(CACHE);return await cache.match(request,{ignoreSearch:true})||(request.mode==='navigate'?await cache.match('./index.html'):null)||new Response('Kết nối mạng để tải ứng dụng lần đầu.',{status:503});
}

// ---- Artwork: least-recently-used runtime cache with a size bound; pinned cells are never evicted. ----
let artIndex=null,artIndexDirty=false,artIndexTimer=null;
async function loadArtIndex(){if(artIndex)return artIndex;artIndex=new Map();try{const saved=await(await caches.open(ART_RUNTIME)).match(ART_INDEX);if(saved)for(const[k,v]of Object.entries(await saved.json()))artIndex.set(k,v)}catch{}return artIndex}
async function saveArtIndex(){artIndexTimer=null;if(!artIndexDirty||!artIndex)return;artIndexDirty=false;await(await caches.open(ART_RUNTIME)).put(ART_INDEX,Response.json(Object.fromEntries(artIndex)))}
function scheduleArtIndexSave(event){artIndexDirty=true;if(artIndexTimer)return;const done=new Promise(resolve=>{artIndexTimer=setTimeout(()=>saveArtIndex().catch(()=>{}).finally(resolve),800)});if(event?.waitUntil)try{event.waitUntil(done)}catch{}}
const artKey=url=>new URL(url,self.location.href).pathname;
async function evictArt(){
 const index=await loadArtIndex(),cache=await caches.open(ART_RUNTIME);
 let bytes=0;for(const v of index.values())bytes+=v.b||0;
 const oldest=[...index.entries()].sort((a,b)=>(a[1].t||0)-(b[1].t||0));
 while(oldest.length&&(index.size>ART_RUNTIME_MAX_ENTRIES||bytes>ART_RUNTIME_MAX_BYTES)){const[key,v]=oldest.shift();await cache.delete(key);index.delete(key);bytes-=v.b||0;artIndexDirty=true}
}
// `response` must be a copy the page never reads (clone before handing the original to respondWith).
async function rememberRuntimeArt(key,response,event){const body=await response.arrayBuffer(),cache=await caches.open(ART_RUNTIME);await cache.put(key,new Response(body,{status:200,headers:response.headers}));const index=await loadArtIndex(),now=Date.now();index.set(key,{t:now,v:now,b:body.byteLength});await evictArt();scheduleArtIndexSave(event)}
async function findArt(key){for(const name of [PACK_ART,PACK_SHEETS,ART_PINNED,ART_RUNTIME]){const hit=await(await caches.open(name)).match(key);if(hit)return{hit,name}}return null}
async function artResponse(event,url){
 const key=url.pathname,found=await findArt(key);
 if(found){
  if(found.name===ART_RUNTIME){const index=await loadArtIndex(),entry=index.get(key)||{b:0,v:0};entry.t=Date.now();
   // Stale-while-revalidate, at most once a day per image so lists do not trigger a request per tile.
   if(Date.now()-(entry.v||0)>ART_REVALIDATE_MS){entry.v=Date.now();event.waitUntil(fetchWithDeadline(key,{cache:'no-cache'},30000).then(r=>r.ok&&!r.redirected?rememberRuntimeArt(key,r,event):null).catch(()=>{}))}
   index.set(key,entry);scheduleArtIndexSave(event)}
  return found.hit;
 }
 try{const response=await fetchWithDeadline(key,{},30000);if(response.ok&&!response.redirected)event.waitUntil(rememberRuntimeArt(key,response.clone(),event).catch(()=>{}));return response}
 catch{return new Response('',{status:504,statusText:'Offline artwork not downloaded'})}
}
// Pin the exact cells the page asks for (this week's menu and family recipes); unpinned cells move to the LRU cache.
async function pinArt(paths){
 const wanted=[...new Set(paths)].filter(p=>typeof p==='string'&&/^artwork\/(cells\/)?[a-z0-9_-]+\.webp$/i.test(p)).slice(0,PIN_LIMIT).map(p=>'/'+p);
 const pinned=await caches.open(ART_PINNED),runtime=await caches.open(ART_RUNTIME),index=await loadArtIndex();let cached=0,failed=0;
 const queue=[...wanted];
 const worker=async()=>{while(queue.length){const key=queue.shift();if(await pinned.match(key)){cached++;continue}const local=await runtime.match(key)||await(await caches.open(PACK_ART)).match(key);if(local){await pinned.put(key,local.clone());if(index.delete(key)){await runtime.delete(key);artIndexDirty=true}cached++;continue}
  try{const response=await fetchWithDeadline(key,{},30000);if(response.ok&&!response.redirected){await pinned.put(key,response);cached++}else failed++}catch{failed++}}};
 await Promise.all([worker(),worker(),worker(),worker()]);
 const keep=new Set(wanted);for(const request of await pinned.keys()){const key=new URL(request.url).pathname;if(keep.has(key))continue;const response=await pinned.match(request);await pinned.delete(request);if(response){const body=await response.arrayBuffer();await runtime.put(key,new Response(body,{headers:response.headers}));index.set(key,{t:Date.now()-1,v:Date.now(),b:body.byteLength});artIndexDirty=true}}
 await evictArt();await saveArtIndex();
 return{total:wanted.length,cached,failed};
}
// Reference catalog: one current version kept for offline use once it has been fetched or downloaded.
async function catalogResponse(event,request){
 const cache=await caches.open(PACK_CATALOG),exact=await cache.match(request);if(exact)return exact;
 try{const response=await fetchWithDeadline(request,{credentials:'same-origin'},45000);if(response.ok&&!response.redirected){const copy=response.clone();event.waitUntil((async()=>{for(const old of await cache.keys())if(old.url!==request.url)await cache.delete(old);await cache.put(request,copy)})().catch(()=>{}))}return response}
 catch{return await cache.match(request,{ignoreSearch:true})||new Response('Kho món ăn chưa được tải về máy này.',{status:503})}
}
async function ocrResponse(event,request){
 const cache=await caches.open(PACK_OCR),hit=await cache.match(request,{ignoreSearch:true});if(hit)return hit;
 try{const response=await fetchWithDeadline(request,{},120000);if(response.ok&&!response.redirected){const copy=response.clone();event.waitUntil(cache.put(new URL(request.url).pathname,copy).catch(()=>{}))}return response}
 catch{return new Response('Bộ đọc chữ chưa được tải về máy này.',{status:503})}
}
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 await Promise.allSettled(ASSETS.map(async path=>{for(let attempt=0;attempt<2;attempt++){try{if(path===PACK){await refreshPack(cache,60000);return}const response=await fetchWithDeadline(path,{},30000);if(response.ok&&!response.redirected){await cache.put(path,response);return}}catch{}}}));
 // v1.6 updates: a new worker waits until the page tells it to take over (app-update.js decides when it is safe:
 // never in the middle of an edit). It takes over at once on a first visit, when no window is controlled, or when
 // the running worker predates this protocol (its pages cannot send SKIP_WAITING).
 if(await takeOverNow())await self.skipWaiting();
})()));
const UPDATE_PROTOCOL='bep-update-protocol-v1';
async function takeOverNow(){try{if(!self.registration?.active)return true;if(!(await caches.keys()).includes(UPDATE_PROTOCOL))return true;return(await self.clients.matchAll({type:'window',includeUncontrolled:true})).length===0}catch{return true}}
// Older releases precached every artwork sheet. Keep those bytes as the detailed-artwork download instead of
// fetching them again, then retire the old app cache.
async function migrateOldArtwork(names){const sheets=await caches.open(PACK_SHEETS);for(const name of names){try{const old=await caches.open(name);for(const request of await old.keys()){const key=new URL(request.url).pathname;if(!/^\/artwork\/[a-z0-9/_-]+\.webp$/i.test(key)||key.startsWith('/artwork/cells/'))continue;if(!await sheets.match(key)){const response=await old.match(request);if(response)await sheets.put(key,response)}}}catch{}}}
self.addEventListener('activate',event=>event.waitUntil(caches.open(UPDATE_PROTOCOL).then(()=>caches.keys()).then(async keys=>{const old=keys.filter(k=>k.startsWith('bep-family-')&&k!==CACHE&&k!==ACCESS_CACHE);await migrateOldArtwork(old);await Promise.all(old.map(k=>caches.delete(k)))}).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 // API responses contain account/family data and never enter the public app cache.
 if(url.pathname.startsWith('/.netlify/')||url.pathname==='/login'||url.pathname==='/login.js')return;
 // v1.7: the connectivity health ping always goes to the network; a cached or synthetic answer would hide a real outage.
 if(url.pathname==='/health.json')return;
 if(event.request.method==='POST'&&url.pathname==='/share-notes'){
  event.respondWith((async()=>{
   let scope='guest/';
   try{const saved=await(await caches.open(ACCESS_CACHE)).match('/offline-access'),access=saved&&await verifyOfflineAccess(await saved.json());if(access?.mode==='account'&&access.household?.id)scope='account/'+access.household.id+'/'}catch{}
   const form=await event.request.formData();let text=String(form.get('text')||'');const file=form.get('notes');if(file&&file.size<=1000000)text+='\n'+await file.text();
   const cache=await caches.open('bep-note-inbox');await cache.put('/shared-notes-draft?scope='+encodeURIComponent(scope),Response.json({title:String(form.get('title')||''),text:text.slice(0,100000)}));return Response.redirect(new URL('/#import-notes',url.origin),303);
  })());return;
 }
 if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
 // Downloads made by the Offline downloads screen go straight to the network; the page stores them itself.
 if(event.request.headers?.get?.('x-bep-download')==='1')return;
 // The FamTray Scout zip (and any other file under /downloads/) is never cached by the worker.
 if(url.pathname.startsWith('/downloads/'))return;
 if(url.pathname==='/startup-scripts.json'){
  event.respondWith((async()=>{
   const cache=await caches.open(CACHE),fresh=url.searchParams.has('fresh'),cached=fresh?null:await cache.match(PACK);
   if(cached){if(cached.headers.get('x-bep-pack-hash')!==url.searchParams.get('v'))event.waitUntil(refreshPack(cache,60000).catch(()=>{}));return cached}
   try{return await refreshPack(cache,30000)}catch{return await cache.match(PACK)||new Response('Kết nối mạng để tải ứng dụng lần đầu.',{status:503})}
  })());return;
 }
 if(isArtwork(url)){event.respondWith(artResponse(event,url));return}
 if(isCatalog(url)){event.respondWith(catalogResponse(event,event.request));return}
 if(isOcrVendor(url)){event.respondWith(ocrResponse(event,event.request));return}
 if(staleFirst(url)&&publicAsset(event.request)){
  event.respondWith((async()=>{
   const cache=await caches.open(CACHE),cached=await cache.match(event.request,{ignoreSearch:true});
   const update=fetchWithDeadline(event.request,{},30000).then(async response=>{if(response.ok&&!response.redirected)await cache.put(event.request,response.clone());return response});
   if(cached){event.waitUntil(update.catch(()=>{}));return cached}
   try{return await update}catch{return cachedOfflineResponse(event.request)}
  })());return;
 }
 event.respondWith((async()=>{
  try{const response=await fetchWithDeadline(event.request);if(response.ok&&!response.redirected&&publicAsset(event.request)){const cache=await caches.open(CACHE);await cache.put(event.request,response.clone())}return response}catch{return cachedOfflineResponse(event.request)}
 })());
});
self.addEventListener('message',event=>{if(event.data?.type==='clear-badge'){event.waitUntil(setBadge(0));return}
 if(event.data?.type==='SKIP_WAITING'){event.waitUntil(self.skipWaiting());return}
 if(event.data?.type==='CHECK_OFFLINE_READY')event.waitUntil((async()=>{const cache=await caches.open(CACHE),matches=await Promise.all(ASSETS.map(path=>cache.match(new URL(path,self.location.href).href)));let identityReady=true;if(event.data.householdId){try{const saved=await(await caches.open(ACCESS_CACHE)).match('/offline-access'),access=saved&&await verifyOfflineAccess(await saved.json());identityReady=access?.household?.id===event.data.householdId}catch{identityReady=false}}event.source?.postMessage({type:'OFFLINE_READY',ready:matches.every(Boolean)&&identityReady})})());
 // The page lists the artwork cells of this week's menu and the family's own recipes; keep exactly those offline.
 if(event.data?.type==='PRECACHE_ART'&&Array.isArray(event.data.paths))event.waitUntil(pinArt(event.data.paths).then(result=>event.source?.postMessage({type:'ART_PINNED',...result})).catch(()=>{}));
 // The verifying key is fetched by the worker itself (never taken from the page message) and pinned in the private cache.
 if(event.data?.type==='SAVE_OFFLINE_ACCESS')event.waitUntil((async()=>{const access=await caches.open(ACCESS_CACHE);try{const res=await fetch('/.netlify/functions/family?op=offline-key',{credentials:'same-origin',cache:'no-store'}),key=res.ok?offlineJwk((await res.json())?.publicKey):null;if(key)await access.put('/offline-signing-key',Response.json(key))}catch{}if(await verifyOfflineAccess(event.data.grant))await access.put('/offline-access',Response.json(event.data.grant))})());
 // Logout revokes cached private identity, not the public shell or guest's device data.
 if(event.data?.type==='CLEAR_PRIVATE_CACHE')event.waitUntil(caches.delete(ACCESS_CACHE));
});
// Push: show the notification and tell open app windows so urgent lists refresh immediately.
// v1.7.5 · app-icon badge (owner feedback #16): urgent messages, “không ăn / báo cơm” and absence notices add 1 to
// the badge on the Home Screen icon (iPhone/iPad 16.4+ installed app with notifications allowed, Android, desktop).
// Nothing is counted while the app is open on screen; the app clears the badge when it is opened.
const BADGE_KINDS=['urgent','attendance','calendar'],BADGE_CACHE='bep-badge-v1',BADGE_KEY='./__badge-count';
async function badgeCount(){try{const r=await (await caches.open(BADGE_CACHE)).match(BADGE_KEY);return r?Math.max(0,parseInt(await r.text(),10)||0):0}catch{return 0}}
async function setBadge(n){const before=await badgeCount();if(before===n&&n===0)return;try{await (await caches.open(BADGE_CACHE)).put(BADGE_KEY,new Response(String(n)))}catch{}try{if(n>0)await self.navigator.setAppBadge?.(n);else await self.navigator.clearAppBadge?.()}catch{}}
async function bumpBadge(kind){if(!BADGE_KINDS.includes(kind))return;const list=await self.clients.matchAll({type:'window',includeUncontrolled:true}).catch(()=>[]);if(list.some(c=>c.visibilityState==='visible'))return;await setBadge((await badgeCount())+1)}
self.addEventListener('push',event=>{let data={};try{data=event.data?.json()||{}}catch(e){}const url=['/#today','/#shopping','/#planner','/#expenses','/#pantry'].includes(data.url)?data.url:'/#today';event.waitUntil(Promise.all([bumpBadge(String(data.type||'')),self.registration.showNotification(data.title||'Bếp Nhà',{body:data.body||'Nhà mình có việc bếp cần xem.',icon:'./family-logo.png',tag:data.tag||'bep-reminder',data:{url,type:String(data.type||'reminder').slice(0,20)},timestamp:Date.now(),...(data.type==='urgent'?{renotify:true,requireInteraction:true,vibrate:[200,100,200]}:{})}),self.clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>list.forEach(c=>{try{c.postMessage({type:'family-push',kind:String(data.type||'reminder').slice(0,20),url})}catch{}})).catch(()=>{})]))});
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async list=>{const target=new URL(event.notification.data?.url||'./#today',self.location.href).href;const client=list.find(c=>new URL(c.url).origin===self.location.origin);if(client){try{if(typeof client.navigate==='function')await client.navigate(target)}catch{try{client.postMessage({type:'family-push-open',url:event.notification.data?.url||'/#today'})}catch{}}try{return await client.focus()}catch{}}return self.clients.openWindow?self.clients.openWindow(target):undefined}))});
