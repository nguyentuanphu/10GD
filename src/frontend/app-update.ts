'use strict';
// v1.6 app updates (modelled on Sparkle Valley's launch.ts update notice). A new service worker waits (sw.ts) until
// this page says it is safe: when nothing is being edited the app switches to the new version at once; while the
// family is busy (an edited form, cooking mode, voice input, a download, changes not yet synced) a small notice offers
// the update and steps aside until the work is done. Studio can switch the notice off and can require a minimum build
// (blocking overlay, never a reload loop). Data is always saved first; offline, the pending-sync marker stays.
const APP_UPDATE_GAP=60000,APP_UPDATE_EVERY=30*60000,APP_UPDATE_ATTEMPTS='bep-update-attempts',APP_UPDATE_NOTICE_KEY='bep-update-notice';
const BUILD_ID_PATTERN=/^\d{8}T\d{6}Z-[a-f0-9]{6,20}$/;
// The minimum build is newer than the running one (ids sort by their UTC build time).
function appUpdateBuildOlder(running,minimum){return BUILD_ID_PATTERN.test(String(running||''))&&BUILD_ID_PATTERN.test(String(minimum||''))&&String(running)<String(minimum)}
function createAppUpdater(env){
 const T=env.t,doc=env.doc,swc=env.nav.serviceWorker,timers=env.timers;
 let reg=null,notice=null,noticeWatch=null,updating=false,reloading=false,attempt=false,had=!!swc?.controller,lastCheck=0,required=null,overlay=null,requiredWatch=null;
 const sleepUntil=(ok,ms)=>new Promise(resolve=>{const start=env.now();const tick=()=>{if(ok())resolve(true);else if(env.now()-start>ms)resolve(false);else timers.setTimeout(tick,400)};tick()});
 function begin(reason){if(!attempt){attempt=true;env.report('update.started',{reason})}}
 function outcome(result,reason='none'){if(attempt)env.report('update.result',{outcome:result,reason});attempt=false}
 function reload(){if(reloading)return;reloading=true;env.reload()}
 function activate(worker){let done=false;const go=()=>{if(done)return;done=true;reload()};swc.addEventListener('controllerchange',go,{once:true});worker.postMessage({type:'SKIP_WAITING'});timers.setTimeout(()=>{if(!done){outcome('timeout','controller');go()}},6000)}
 function label(text){const el=notice?.querySelector?.('.app-update-text')||overlay?.querySelector?.('.app-update-text');if(el)el.textContent=text}
 // The Update button: save and sync first, fetch the new version if none is waiting, switch, reload. Double-tap safe.
 async function applyUpdate(){
  const busy=env.isBusy();if(busy&&busy!=='sync'){label(busy==='unsaved'?T('Chưa lưu được thay đổi — hãy xuất sao lưu trước khi cập nhật.','Changes are not saved yet — export a backup before updating.'):T('Lưu hoặc đóng phần đang sửa trước khi cập nhật nhé.','Save or close what you are editing before updating.'));return false}
  if(updating)return false;updating=true;
  for(const b of [...(notice?.querySelectorAll?.('button')||[]),...(overlay?.querySelectorAll?.('button')||[])])b.disabled=true;
  label(T('Đang lưu thay đổi…','Saving your changes…'));
  await env.flush(label);
  if(env.isBusy()==='unsaved'){updating=false;label(T('Chưa lưu được thay đổi — hãy xuất sao lưu trước khi cập nhật.','Changes are not saved yet — export a backup before updating.'));return false}
  label(T('Đang tải bản cập nhật…','Downloading the update…'));
  const r=reg||await swc?.getRegistration?.().catch(()=>null);
  if(!r){outcome('reload','no-worker');reload();return true}
  if(!r.waiting&&!r.installing){await Promise.resolve(r.update?.()).catch(()=>{});await sleepUntil(()=>!!(r.waiting||r.installing),8000)}
  if(r.installing)await sleepUntil(()=>!r.installing,120000);
  if(r.waiting)activate(r.waiting);else{outcome('reload','none');reload()}
  return true;
 }
 function noticesOn(){return env.noticesEnabled()}
 function hideNotice(){timers.clearInterval(noticeWatch);noticeWatch=null;notice?.remove();notice=null}
 // needed: shown even when Studio switched notices off (the running copy cannot continue properly without it).
 function offer(needed=false,reason='new-worker'){
  if(!noticesOn()&&!needed)return null;
  if(notice){if(needed)notice.dataset.required='1';return notice}
  begin(reason);
  notice=doc.createElement('aside');notice.className='app-update-notice';notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');if(needed)notice.dataset.required='1';
  const text=doc.createElement('span');text.className='app-update-text';text.textContent=T('Có bản cập nhật mới','A new version is available');
  const update=doc.createElement('button');update.type='button';update.className='btn small primary app-update-go';update.textContent=T('Cập nhật','Update');update.onclick=()=>applyUpdate();
  const later=doc.createElement('button');later.type='button';later.className='app-update-later';later.textContent='×';later.setAttribute('aria-label',T('Để sau','Later'));later.title=T('Để sau','Later');later.onclick=()=>{hideNotice();outcome('none','busy')};
  notice.append(text,update,later);doc.body.appendChild(notice);notice.hidden=!!env.isBusy();
  noticeWatch=timers.setInterval(()=>{if(!notice?.isConnected)return hideNotice();const busy=!!env.isBusy();if(notice.hidden!==busy&&!updating){notice.hidden=busy;if(!busy)text.textContent=T('Có bản cập nhật mới','A new version is available')}},500);
  return notice;
 }
 // A new version finished installing while this page runs the old one.
 async function onNewWorker(){
  begin('new-worker');
  if(env.isBusy()){offer();return}
  await env.flush(()=>{});
  if(env.isBusy()){offer();return}
  if(reg?.waiting)activate(reg.waiting);
 }
 function check(force=false){if(!reg||!env.online())return;if(!force&&env.now()-lastCheck<APP_UPDATE_GAP)return;lastCheck=env.now();Promise.resolve(reg.update?.()).catch(()=>{})}
 function watch(r){
  reg=r;
  if(r.waiting&&swc.controller)onNewWorker();
  r.addEventListener('updatefound',()=>{const next=r.installing;next?.addEventListener('statechange',()=>{if(next.state==='redundant')outcome('failed','invalid');if(next.state==='installed'&&swc.controller)onNewWorker()})});
  swc.addEventListener('controllerchange',()=>{outcome('success');const was=had;had=true;if(!was)return;if(env.isBusy())offer(false,'controller');else reload()});
  env.on(doc,'visibilitychange',()=>{if(doc.visibilityState==='visible')check()});
  env.on(env.win,'online',()=>check());
  timers.setInterval(()=>check(true),APP_UPDATE_EVERY);
  check(true);
 }
 // A part of this version is gone after a deploy (a lazily loaded script answered 404): offer the update.
 function moduleGone(reason){offer(true,'module-gone');return true}
 // Studio requires a newer build: block the app (after the family's work is saved) with one Update button.
 function requireBuild(minimum){
  if(!appUpdateBuildOlder(env.build(),minimum)){required=null;overlay?.remove();overlay=null;try{env.session.removeItem(APP_UPDATE_ATTEMPTS)}catch{}return false}
  if(required===minimum&&(overlay||requiredWatch))return true;required=minimum;begin('forced');
  const show=()=>{if(env.isBusy()){offer(true,'forced');return false}hideNotice();showOverlay();return true};
  if(!show()){timers.clearInterval(requiredWatch);requiredWatch=timers.setInterval(()=>{if(!required){timers.clearInterval(requiredWatch);requiredWatch=null;return}if(show()){timers.clearInterval(requiredWatch);requiredWatch=null}},500)}
  return true;
 }
 function attempts(){try{return Number(env.session.getItem(APP_UPDATE_ATTEMPTS)||0)||0}catch{return 0}}
 function showOverlay(){
  if(overlay)return overlay;
  const tries=attempts();
  overlay=doc.createElement('div');overlay.className='app-update-required';overlay.setAttribute('role','alertdialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','app-update-title');
  const card=doc.createElement('div');card.className='app-update-card';
  const h=doc.createElement('h2');h.id='app-update-title';h.textContent=T('Cần cập nhật để tiếp tục','Update required');
  const p=doc.createElement('p');p.className='app-update-text';p.textContent=T('Bản ứng dụng trên máy này đã cũ. Dữ liệu của bạn được giữ nguyên; bấm Cập nhật để dùng bản mới.','This version of the app is out of date. Your data is kept; tap Update to continue with the new version.');
  const b=doc.createElement('button');b.type='button';b.className='btn primary app-update-go';b.textContent=tries>=2?T('Thử lại','Retry'):T('Cập nhật','Update');
  card.append(h,p,b);
  if(tries>=2){const hint=doc.createElement('p');hint.className='hint app-update-hint';hint.textContent=T('Vẫn chưa được? Đóng hẳn ứng dụng rồi mở lại khi có mạng. Cần giúp, hãy liên hệ người quản lý gia đình hoặc bộ phận hỗ trợ.','Still not working? Fully close the app and open it again while online. For help, contact your family owner or support.');card.append(hint);outcome('blocked','forced')}
  b.onclick=async()=>{if(updating)return;const n=attempts()+1;try{env.session.setItem(APP_UPDATE_ATTEMPTS,String(n))}catch{}if(n>2){updating=true;b.disabled=true;p.textContent=T('Đang thử lại…','Retrying…');await env.flush(()=>{});env.retire();return}await applyUpdate()};
  overlay.append(card);doc.body.appendChild(overlay);b.focus?.();
  return overlay;
 }
 return {watch,offer,applyUpdate,moduleGone,requireBuild,check,get notice(){return notice},get overlay(){return overlay},get registration(){return reg}};
}

// ---- Browser wiring (not used by the unit harness, which builds its own environment). ----
let appUpdateModalDirty=false;
function appUpdateBusy(){
 try{
  if(document.querySelector('#voice-live[data-mode="listening"]'))return 'voice';
  if(typeof cooking!=='undefined'&&cooking)return 'cooking';
  if(typeof unsaved!=='undefined'&&unsaved)return 'unsaved';
  if(document.querySelector('#confirm-root'))return 'form';
  if(appUpdateModalDirty&&document.querySelector('#modal-root .modal'))return 'form';
  if(typeof offlineJobs!=='undefined'&&[...offlineJobs.values()].some(j=>j?.running))return 'download';
  if(typeof cloudConnection!=='undefined'&&cloudConnection?.connected&&(cloudConnection.dirty||cloudConnection.syncing)&&navigator.onLine&&!globalThis.BEP_OFFLINE)return 'sync';
 }catch{}
 return '';
}
async function appUpdateFlush(status){
 const T=(vi,en)=>typeof tr==='function'?tr(vi,en):vi;
 try{if(typeof unsaved!=='undefined'&&unsaved&&typeof save==='function')save()}catch{}
 if(typeof cloudConnection==='undefined'||!cloudConnection?.connected||!cloudConnection.dirty&&!cloudConnection.syncing)return true;
 // Offline: the change is on this device and its pending-sync marker survives the reload.
 if(!navigator.onLine||globalThis.BEP_OFFLINE){status(T('Đang offline — thay đổi vẫn lưu trên máy và sẽ đồng bộ sau.','Offline — changes stay on this device and will sync later.'));return true}
 status(T('Đang lưu thay đổi lên Đồng bộ gia đình…','Saving changes to family sync…'));
 try{if(!cloudConnection.syncing&&typeof syncFamilyState==='function')syncFamilyState()}catch{}
 const start=Date.now();while((cloudConnection.dirty||cloudConnection.syncing)&&Date.now()-start<10000)await new Promise(r=>setTimeout(r,300));
 return !cloudConnection.dirty;
}
function appUpdateReport(type,data){
 try{if(!navigator.onLine||['localhost','127.0.0.1','terminal.local'].includes(location.hostname))return;const body=JSON.stringify({type,...data,build:globalThis.BEP_BUILD||null});const url='/.netlify/functions/studio?op=client-event';
  if(navigator.sendBeacon?.(url,new Blob([body],{type:'application/json'})))return;fetch(url,{method:'POST',body,headers:{'Content-Type':'application/json'},keepalive:true,credentials:'omit'}).catch(()=>{})}catch{}
}
// Retire this app's worker (never its caches or device data) and open a fresh copy; the last resort of a forced update.
async function appUpdateRetire(){try{const regs=await navigator.serviceWorker?.getRegistrations?.()||[];await Promise.all(regs.filter(r=>r.scope===new URL('/',location.href).href).map(r=>r.unregister()))}catch{}location.replace('/?update-retry='+Date.now())}
function appUpdateNoticesEnabled(){try{return localStorage.getItem(APP_UPDATE_NOTICE_KEY)!=='off'}catch{return true}}
if(typeof window!=='undefined'&&typeof document!=='undefined'&&!globalThis.__bepNoAutoUpdater&&'serviceWorker'in navigator&&location.protocol!=='file:'){
 document.addEventListener('input',event=>{if(event.target?.closest?.('#modal-root'))appUpdateModalDirty=true},true);
 document.addEventListener('change',event=>{if(event.target?.closest?.('#modal-root'))appUpdateModalDirty=true},true);
 const root=document.getElementById('modal-root');if(root&&typeof MutationObserver!=='undefined')new MutationObserver(()=>{appUpdateModalDirty=false}).observe(root,{childList:true});
 const updater=createAppUpdater({win:window,doc:document,nav:navigator,session:sessionStorage,t:(vi,en)=>typeof tr==='function'?tr(vi,en):vi,isBusy:appUpdateBusy,flush:appUpdateFlush,report:appUpdateReport,noticesEnabled:appUpdateNoticesEnabled,
  reload:()=>location.reload(),retire:appUpdateRetire,build:()=>globalThis.BEP_BUILD||'',online:()=>navigator.onLine&&!globalThis.BEP_OFFLINE,now:()=>Date.now(),
  timers:{setTimeout:(f,ms)=>setTimeout(f,ms),setInterval:(f,ms)=>setInterval(f,ms),clearInterval:id=>clearInterval(id)},on:(target,type,fn)=>target.addEventListener(type,fn)});
 globalThis.bepUpdater=updater;
 globalThis.bepModuleGone=reason=>updater.moduleGone(reason);
 addEventListener('unhandledrejection',event=>{if(/dynamically imported module|module script|Importing a module/i.test(String(event.reason?.message||event.reason||'')))updater.moduleGone('import')});
 navigator.serviceWorker.getRegistration().then(r=>{if(r)updater.watch(r);else navigator.serviceWorker.ready.then(ready=>updater.watch(ready)).catch(()=>{})}).catch(()=>{});
 // The startup pack came from an older cached copy (the worker is refreshing it): offer the new version.
 if(globalThis.BEP_STARTUP?.packMismatch)updater.offer(true,'pack-mismatch');
 // Studio switches (public banner endpoint, read by platform-banner.js): notice on/off and the minimum build.
 const applyStudio=data=>{if(!data||typeof data!=='object')return;try{localStorage.setItem(APP_UPDATE_NOTICE_KEY,data.updateNotice===false?'off':'on')}catch{}if(data.minBuild)updater.requireBuild(String(data.minBuild));else updater.requireBuild('')};
 if(typeof renderPlatformBanner==='function'){const baseRender=renderPlatformBanner;renderPlatformBanner=function(...args){const result=baseRender.apply(this,args);try{applyStudio(typeof platformNotice!=='undefined'?platformNotice:null)}catch{}return result}}
 try{applyStudio(typeof platformNotice!=='undefined'?platformNotice:null)}catch{}
}
