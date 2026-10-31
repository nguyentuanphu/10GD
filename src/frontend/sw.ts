'use strict';
if(typeof importScripts==='function')importScripts('./offline-access.js');
const ACCESS_CACHE='bep-family-access-v1';
const CACHE='bep-family-v18-artwork-catalog';
const ASSETS=['./','./index.html','./bootstrap.js','./offline-access.js','./startup-scripts.json','./styles.css','./family-logo.png','./artwork/ingredients-v1.webp','./artwork/ingredients-v2.webp','./artwork/ingredients-v3.webp','./artwork/dishes-v1.webp','./artwork/ingredients-v4.webp','./artwork/dishes-v2.webp','./icon.svg','./notification-icon.png','./notification-icon.svg','./icon-192.png','./icon-512.png','./manifest.webmanifest'];
async function fetchWithDeadline(input,options={}){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
 try{const response=await fetch(input,{...options,signal:controller.signal});await response.clone().arrayBuffer();return response}finally{clearTimeout(timer)}
}
function publicAsset(request){const url=new URL(request.url);return url.origin===self.location.origin&&ASSETS.some(path=>new URL(path,self.location.href).pathname===url.pathname)}
async function cachedOfflineResponse(request){
 if(!publicAsset(request)&&request.mode!=='navigate')return new Response('Không có bản tải offline.',{status:503});
 const cache=await caches.open(CACHE);return await cache.match(request,{ignoreSearch:true})||(request.mode==='navigate'?await cache.match('./index.html'):null)||new Response('Kết nối mạng để tải ứng dụng lần đầu.',{status:503});
}
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);await Promise.allSettled(ASSETS.map(async path=>{const response=await fetchWithDeadline(path);if(response.ok&&!response.redirected)await cache.put(path,response)}));await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('bep-family-')&&k!==CACHE&&k!==ACCESS_CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 // API responses contain account/family data and never enter the public app cache.
 if(url.pathname.startsWith('/.netlify/')||url.pathname==='/login'||url.pathname==='/login.js')return;
 if(event.request.method==='POST'&&url.pathname==='/share-notes'){
  event.respondWith((async()=>{
   let scope='guest/';
   try{const saved=await(await caches.open(ACCESS_CACHE)).match('/offline-access'),access=saved&&await verifyOfflineAccess(await saved.json());if(access?.mode==='account'&&access.household?.id)scope='account/'+access.household.id+'/'}catch{}
   const form=await event.request.formData();let text=String(form.get('text')||'');const file=form.get('notes');if(file&&file.size<=1000000)text+='\n'+await file.text();
   const cache=await caches.open('bep-note-inbox');await cache.put('/shared-notes-draft?scope='+encodeURIComponent(scope),Response.json({title:String(form.get('title')||''),text:text.slice(0,100000)}));return Response.redirect(new URL('/#import-notes',url.origin),303);
  })());return;
 }
 if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
 event.respondWith((async()=>{
  try{const response=await fetchWithDeadline(event.request);if(response.ok&&!response.redirected&&publicAsset(event.request)){const cache=await caches.open(CACHE);await cache.put(event.request,response.clone())}return response}catch{return cachedOfflineResponse(event.request)}
 })());
});
self.addEventListener('message',event=>{
 if(event.data?.type==='CHECK_OFFLINE_READY')event.waitUntil((async()=>{const cache=await caches.open(CACHE),matches=await Promise.all(ASSETS.map(path=>cache.match(new URL(path,self.location.href).href)));let identityReady=true;if(event.data.householdId){try{const saved=await(await caches.open(ACCESS_CACHE)).match('/offline-access'),access=saved&&await verifyOfflineAccess(await saved.json());identityReady=access?.household?.id===event.data.householdId}catch{identityReady=false}}event.source?.postMessage({type:'OFFLINE_READY',ready:matches.every(Boolean)&&identityReady})})());
 if(event.data?.type==='SAVE_OFFLINE_ACCESS')event.waitUntil((async()=>{if(await verifyOfflineAccess(event.data.grant))await(await caches.open(ACCESS_CACHE)).put('/offline-access',Response.json(event.data.grant))})());
 // Logout revokes cached private identity, not the public shell or guest's device data.
 if(event.data?.type==='CLEAR_PRIVATE_CACHE')event.waitUntil(caches.delete(ACCESS_CACHE));
});
self.addEventListener('push',event=>{let data={};try{data=event.data?.json()||{}}catch(e){}event.waitUntil(self.registration.showNotification(data.title||'Bếp Gia Đình',{body:data.body||'Nhà mình có việc bếp cần xem.',icon:'./family-logo.png',tag:data.tag||'bep-reminder',data:{url:['/#today','/#shopping','/#planner','/#expenses','/#pantry'].includes(data.url)?data.url:'/#today'}}))});
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{const target=new URL(event.notification.data?.url||'./#today',self.location.href).href;const client=list.find(c=>new URL(c.url).origin===self.location.origin);if(client){client.navigate(target);return client.focus()}return clients.openWindow(target)}))});
