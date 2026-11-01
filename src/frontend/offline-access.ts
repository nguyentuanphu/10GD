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
if(typeof window!=='undefined'){navigator.serviceWorker?.addEventListener('controllerchange',async()=>{try{const grant=JSON.parse(localStorage.getItem(OFFLINE_ACCESS_KEY)||'null');if(await verifyOfflineAccess(grant))navigator.serviceWorker.controller?.postMessage({type:'SAVE_OFFLINE_ACCESS',grant})}catch{}})}
// v1.7 connectivity. "Offline" means the network is really gone: the browser says so, or a tiny same-origin health
// ping (never answered by the service worker) fails and fails again on retry. One failed or slow family request only
// marks the service as slow ("degraded") and never shows Offline. Recovery is automatic: on `online`, when the app
// becomes visible again, on bfcache `pageshow`, and on a short backoff while offline — no "Retry" tap needed.
function createConnectivity(o={}){
 const ping=o.ping,navOnline=o.navigatorOnline||(()=>true),hidden=o.hidden||(()=>false),setT=o.setTimeout||setTimeout,clearT=o.clearTimeout||clearTimeout,onChange=o.onChange||(()=>{});
 const confirmDelays=o.confirmDelays||[1000,2000],backoff=o.backoff||[2000,5000,10000,20000,30000];
 let offline=!navOnline(),degraded=false,probing=null,timer=null,attempt=0,deferred=false;
 const set=(off,deg)=>{if(off===offline&&deg===degraded)return;const was=offline;offline=off;degraded=deg;try{onChange({offline,degraded,recovered:was&&!off})}catch{}};
 const stopTimer=()=>{if(timer!==null){clearT(timer);timer=null}};
 const schedule=()=>{stopTimer();if(!offline)return;const delay=backoff[Math.min(attempt,backoff.length-1)];attempt++;timer=setT(()=>{timer=null;void verify()},delay)};
 const wait=ms=>new Promise(r=>setT(r,ms));
 const probe=async()=>{if(!ping)return navOnline();try{return !!await ping()}catch{return false}};
 function verify(){
  if(probing)return probing;
  // A page in the background (iOS freezes and aborts its requests) is checked once it is visible again.
  if(hidden()){deferred=true;return Promise.resolve(!offline)}
  probing=(async()=>{try{
   if(!navOnline()){set(true,false);schedule();return false}
   let ok=await probe();
   for(const d of confirmDelays){if(ok||!navOnline())break;await wait(d);if(hidden()){deferred=true;return !offline}ok=await probe()}
   if(ok){attempt=0;stopTimer();set(false,degraded);return true}
   set(true,false);schedule();return false;
  }finally{probing=null}})();
  return probing;
 }
 return{
  get offline(){return offline},get degraded(){return degraded},get state(){return offline?'offline':degraded?'degraded':'online'},
  // A response arrived from the server: the network works.
  reportSuccess(){attempt=0;stopTimer();set(false,false)},
  // kind: 'server' (an HTTP error came back: online, service busy), 'timeout' (slow), 'network' (fetch TypeError).
  reportFailure(kind='network'){if(kind==='server'){attempt=0;stopTimer();set(false,true);return Promise.resolve(true)}if(kind==='timeout'&&!offline)set(false,true);return verify()},
  // The browser reported `offline` (navigator.onLine false): show it at once, then keep probing for recovery.
  wentOffline(){set(true,false);schedule()},
  // online / visible / pageshow: re-check when offline or when a check was deferred while hidden.
  wake(){if(!navOnline()){set(true,false);schedule();return Promise.resolve(false)}if(offline||deferred){deferred=false;return verify()}return Promise.resolve(true)},
  verify,
 };
}
async function bepHealthPing(timeoutMs=4000){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);try{const response=await fetch('/health.json?t='+Date.now().toString(36),{cache:'no-store',credentials:'omit',signal:controller.signal});return response.ok}finally{clearTimeout(timer)}}
if(typeof window!=='undefined'&&typeof document!=='undefined'&&typeof window.addEventListener==='function'&&!globalThis.BepConnectivity){
 globalThis.BEP_OFFLINE=navigator.onLine===false;
 globalThis.BepConnectivity=createConnectivity({ping:()=>bepHealthPing(),navigatorOnline:()=>navigator.onLine!==false,hidden:()=>document.visibilityState==='hidden',onChange:s=>{globalThis.BEP_OFFLINE=s.offline;globalThis.BEP_NET_DEGRADED=s.degraded;const pill=document.getElementById('network-status');if(pill){pill.toggleAttribute('data-degraded',s.degraded&&!s.offline);if(s.degraded&&!s.offline&&typeof tr==='function')pill.title=tr('Đang đồng bộ… dịch vụ phản hồi chậm, dữ liệu vẫn lưu trên máy','Syncing… the service is slow; data stays on this device')}window.dispatchEvent(new Event('bep-connectivity'));if(s.recovered&&typeof checkCloud==='function')checkCloud()}});
 window.addEventListener('online',()=>{void globalThis.BepConnectivity.wake()});
 window.addEventListener('offline',()=>globalThis.BepConnectivity.wentOffline());
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void globalThis.BepConnectivity.wake()});
 window.addEventListener('pageshow',()=>{void globalThis.BepConnectivity.wake()});
}
