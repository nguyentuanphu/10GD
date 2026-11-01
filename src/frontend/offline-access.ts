'use strict';
const OFFLINE_ACCESS_KEY='bep-offline-access-v1';
// The verifying key is pinned separately from the grant: the page pins it from a live, authenticated status response;
// the service worker fetches it itself from the server. A grant carrying its own (different) key is rejected.
const OFFLINE_PINNED_KEY='bep-offline-signing-key-v1';
const OFFLINE_KEY_CACHE='bep-family-access-v1';
function offlineJwk(k){return k&&typeof k==='object'&&k.kty==='EC'&&k.crv==='P-256'&&typeof k.x==='string'&&typeof k.y==='string'&&k.x.length<100&&k.y.length<100?{kty:'EC',crv:'P-256',x:k.x,y:k.y}:null}
async function pinnedOfflineKey(){
 try{if(typeof localStorage!=='undefined')return offlineJwk(JSON.parse(localStorage.getItem(OFFLINE_PINNED_KEY)||'null'))}catch{}
 try{if(typeof caches!=='undefined'){const saved=await(await caches.open(OFFLINE_KEY_CACHE)).match('/offline-signing-key');return saved?offlineJwk(await saved.json()):null}}catch{}
 return null;
}
async function verifyOfflineAccess(grant,now=Date.now(),publicKey){
 try{if(!grant||typeof grant.payload!=='string'||typeof grant.signature!=='string'||grant.payload.length>8000)return null;const pinned=offlineJwk(publicKey===undefined?await pinnedOfflineKey():publicKey);if(!pinned)return null;if(grant.publicKey!==undefined){const own=offlineJwk(grant.publicKey);if(!own||own.x!==pinned.x||own.y!==pinned.y)return null}const decode=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0)),key=await crypto.subtle.importKey('jwk',pinned,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);if(!await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,decode(grant.signature),new TextEncoder().encode(grant.payload)))return null;const data=JSON.parse(new TextDecoder().decode(decode(grant.payload)));if(data.version!==1||!data.connected||!Number.isFinite(data.expires)||data.expires<=now||data.expires>now+31*86400000||data.mode!=='account')return null;return data}catch{return null}
}
// Called only with a status response fetched live from the server (authenticated), never with stored data.
async function rememberOfflineAccess(status){if(!status?.offlineGrant)return;const key=offlineJwk(status.offlinePublicKey);if(key){try{localStorage.setItem(OFFLINE_PINNED_KEY,JSON.stringify(key))}catch{}}const verified=await verifyOfflineAccess(status.offlineGrant,Date.now(),key||undefined);if(!verified)return;try{localStorage.setItem(OFFLINE_ACCESS_KEY,JSON.stringify(status.offlineGrant));sessionStorage.setItem('bep-offline-session',verified.session)}catch{}navigator.serviceWorker?.controller?.postMessage({type:'SAVE_OFFLINE_ACCESS',grant:status.offlineGrant});}
async function readOfflineAccess(){try{const grant=JSON.parse(localStorage.getItem(OFFLINE_ACCESS_KEY)||'null'),data=await verifyOfflineAccess(grant);if(!data||!data.trusted&&sessionStorage.getItem('bep-offline-session')!==data.session)return null;return data}catch{return null}}
function clearOfflineAccess(){try{localStorage.removeItem('bep-account-present');localStorage.removeItem(OFFLINE_ACCESS_KEY);sessionStorage.removeItem('bep-offline-session')}catch{}navigator.serviceWorker?.controller?.postMessage({type:'CLEAR_PRIVATE_CACHE'})}
if(typeof window!=='undefined'){window.addEventListener('online',()=>{globalThis.BEP_OFFLINE=false},true);navigator.serviceWorker?.addEventListener('controllerchange',async()=>{try{const grant=JSON.parse(localStorage.getItem(OFFLINE_ACCESS_KEY)||'null');if(await verifyOfflineAccess(grant))navigator.serviceWorker.controller?.postMessage({type:'SAVE_OFFLINE_ACCESS',grant})}catch{}})}
