'use strict';
// v1.6 Downloads for offline use (Other settings), offline readiness, artwork pinning for this week's menu,
// lazy reference-catalog triggers, self-hosted OCR and friendly offline messages for online-only features.
// Other features add rows with registerOfflinePack({id,label,sizeBytes,status(),download(onProgress),remove()}).
const OFFLINE_CACHES={art:'bep-pack-art-v1',sheets:'bep-pack-sheets-v1',catalog:'bep-pack-catalog-v1',ocr:'bep-pack-ocr-v1',pinned:'bep-art-pinned-v1',runtime:'bep-art-runtime-v1'};
const OFFLINE_WIFI_KEY='bep-offline-wifi-only',OFFLINE_QUEUE_KEY='bep-offline-queue',OFFLINE_ASKED_KEY='bep-offline-wifi-asked';
const offlinePacks=new Map(),offlineJobs=new Map(),offlineStatusCache=new Map();
let offlineManifestPromise=null,offlineReadiness=null,offlineReadinessAt=0,offlineStorage=null,offlinePinnedKey='';
const otr=(vi,en)=>typeof tr==='function'?tr(vi,en):vi;
function offlineOnline(){return navigator.onLine&&!globalThis.BEP_OFFLINE}
function offlineBytes(n){if(!Number.isFinite(n)||n<=0)return otr('0 MB','0 MB');if(n<1024*1024)return Math.max(1,Math.round(n/1024))+' KB';const mb=n/1024/1024;return (mb>=100?Math.round(mb):mb.toFixed(1))+' MB'}
function offlineGet(key,fallback=null){try{const v=localStorage.getItem(key);return v===null?fallback:v}catch{return fallback}}
function offlineSet(key,value){try{if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value)}catch{}}
function offlineWifiOnly(){return offlineGet(OFFLINE_WIFI_KEY,'1')!=='0'}
// Wi-Fi heuristics: the Network Information API where available (Chrome/Android); desktops without it are treated
// as unmetered; phones and tablets without it are "unknown" and the family is asked once per session.
function offlineConnectionKind(nav=navigator){
 if(!nav.onLine)return 'offline';
 const c=nav.connection||nav.mozConnection||nav.webkitConnection;
 if(c?.type){if(c.type==='wifi'||c.type==='ethernet')return 'wifi';if(c.type==='none')return 'offline';if(['cellular','bluetooth','wimax'].includes(c.type))return 'cellular'}
 if(c?.saveData)return 'cellular';
 if(c&&['slow-2g','2g'].includes(c.effectiveType))return 'cellular';
 const mobile=nav.userAgentData?typeof nav.userAgentData.mobile==='boolean'&&nav.userAgentData.mobile:/Android|iPhone|iPad|iPod|Mobile/i.test(nav.userAgent||'')||(nav.maxTouchPoints>1&&/Macintosh/.test(nav.userAgent||''));
 return mobile?'unknown':'wifi';
}
function offlineConnectionLabel(kind=offlineConnectionKind()){return {wifi:otr('Wi-Fi / mạng không tính dung lượng','Wi-Fi / unmetered network'),cellular:otr('Dữ liệu di động','Mobile data'),unknown:otr('Chưa rõ Wi-Fi hay dữ liệu di động','Wi-Fi or mobile data: unknown'),offline:otr('Đang offline','Offline')}[kind]}
function offlineManifest(){if(!offlineManifestPromise){offlineManifestPromise=(async()=>{const res=await fetch('offline-packs.json',{credentials:'same-origin'});if(!res.ok)throw Error('packs '+res.status);return res.json()})();offlineManifestPromise.catch(()=>{offlineManifestPromise=null})}return offlineManifestPromise}
async function offlineCacheCount(cacheName,files){if(typeof caches==='undefined')return{have:0,total:files.length,bytes:0};const cache=await caches.open(cacheName);let have=0,bytes=0;for(const[path,size]of files)if(await cache.match('/'+path)){have++;bytes+=size}return{have,total:files.length,bytes}}
function offlineSupportsSimd(){try{return WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,10,1,8,0,65,0,253,15,253,98,11]))}catch{return false}}
function offlineOcrFiles(m){if(!m?.ocr)return null;const core=offlineSupportsSimd()?m.ocr.simd:m.ocr.plain;return{files:[...m.ocr.common.files,...core.files],bytes:m.ocr.common.bytes+core.bytes}}
// Downloads one pack file by file, skipping what is already stored (resumable), with retries and byte progress.
async function offlineDownloadFiles(cacheName,files,onProgress,signal){
 const cache=await caches.open(cacheName),total=files.reduce((a,f)=>a+f[1],0);let done=0,failed=0;
 for(const[path,size]of files)if(await cache.match('/'+path))done+=size;
 onProgress?.(done,total);
 const queue=[];for(const f of files)if(!await cache.match('/'+f[0]))queue.push(f);
 const worker=async()=>{while(queue.length){if(signal?.aborted)throw new DOMException('Aborted','AbortError');const[path,size]=queue.shift();let ok=false;
  for(let attempt=0;attempt<3&&!ok;attempt++){try{if(attempt)await new Promise(r=>setTimeout(r,attempt*1500));const res=await fetch('/'+path,{headers:{'x-bep-download':'1'},cache:'no-cache',credentials:'same-origin',signal});if(!res.ok||res.redirected)throw Error(String(res.status));await cache.put('/'+path,new Response(await res.arrayBuffer(),{headers:res.headers}));ok=true}catch(e){if(signal?.aborted)throw e}}
  if(ok)done+=size;else failed++;onProgress?.(done,total)}};
 await Promise.all([worker(),worker(),worker()]);
 if(failed)throw Error(otr(`${failed} tệp chưa tải được. Bấm Thử lại để tiếp tục.`,`${failed} files did not download. Tap Retry to continue.`));
 return true;
}
function registerOfflinePack(pack){
 if(!pack||typeof pack.id!=='string'||!/^[a-z0-9-]{2,40}$/.test(pack.id)||typeof pack.status!=='function')throw Error('Invalid offline pack');
 offlinePacks.set(pack.id,{large:true,...pack});offlineStatusCache.delete(pack.id);offlineRefreshUi();return pack.id;
}
globalThis.registerOfflinePack=registerOfflinePack;
function offlineLabel(p){return typeof p.label==='function'?p.label():String(p.label||p.id)}
function offlineDesc(p){return typeof p.description==='function'?p.description():String(p.description||'')}
async function offlineSize(p){try{return typeof p.sizeBytes==='function'?await p.sizeBytes():Number(p.sizeBytes)||0}catch{return 0}}
// Built-in packs. Sizes are exact bytes from dist/offline-packs.json (generated by the build).
function registerBuiltInOfflinePacks(){
 const cachePack=(id,key,label,description,cacheName,large=true)=>registerOfflinePack({id,large,label,description,
  sizeBytes:async()=>(await offlineManifest())[key].bytes,
  status:async()=>{const m=await offlineManifest(),c=await offlineCacheCount(cacheName,m[key].files);return{state:c.have===c.total?'ready':c.have?'partial':'none',have:c.have,total:c.total}},
  download:async(onProgress,signal)=>{const m=await offlineManifest();await navigator.storage?.persist?.().catch(()=>false);return offlineDownloadFiles(cacheName,m[key].files,onProgress,signal)},
  remove:async()=>{await caches.delete(cacheName);return true}});
 cachePack('art','art',()=>otr('Toàn bộ hình món ăn','All dish pictures'),()=>otr('Ảnh nhỏ cho mọi món và nguyên liệu trong danh sách.','Small pictures for every dish and ingredient in lists.'),OFFLINE_CACHES.art);
 cachePack('sheets','sheets',()=>otr('Hình chi tiết độ nét cao','High-detail dish pictures'),()=>otr('Chỉ cần nếu muốn ảnh lớn sắc nét khi xem chi tiết món offline.','Only needed for sharp large pictures in recipe details offline.'),OFFLINE_CACHES.sheets);
 registerOfflinePack({id:'catalog',large:false,
  label:()=>{const n=offlineManifestCache?.catalogCount||475;return otr(`Kho ${n} món (dữ liệu)`,`${n}-recipe library (data)`)},
  description:()=>otr('Bộ lọc thư viện, gợi ý thực đơn và món mẫu khi offline. Món ăn của gia đình luôn có sẵn.','Library filters, menu suggestions and sample dishes offline. Family recipes are always available.'),
  sizeBytes:async()=>(await offlineManifest()).catalog.transfer,
  status:async()=>{const m=await offlineManifest(),c=await offlineCacheCount(OFFLINE_CACHES.catalog,m.catalog.files);return{state:c.have?'ready':'none',have:c.have,total:1}},
  download:async(onProgress,signal)=>{const m=await offlineManifest();await offlineDownloadFiles(OFFLINE_CACHES.catalog,m.catalog.files,onProgress,signal);if(typeof ensureCatalog==='function')await ensureCatalog().catch(()=>{});return true},
  remove:async()=>{await caches.delete(OFFLINE_CACHES.catalog);return true}});
 registerOfflinePack({id:'ocr',large:true,
  label:()=>otr('Đọc hoá đơn/giá bằng camera','Read receipts & prices with the camera'),
  description:()=>otr('Bộ đọc chữ tiếng Việt + tiếng Anh chạy ngay trên máy.','Vietnamese + English text reader that runs on this device.'),
  sizeBytes:async()=>offlineOcrFiles(await offlineManifest())?.bytes||0,
  status:async()=>{const m=await offlineManifest(),f=offlineOcrFiles(m);if(!f)return{state:'unavailable'};const c=await offlineCacheCount(OFFLINE_CACHES.ocr,f.files);return{state:c.have===c.total?'ready':c.have?'partial':'none',have:c.have,total:c.total}},
  download:async(onProgress,signal)=>{const f=offlineOcrFiles(await offlineManifest());if(!f)throw Error('OCR unavailable');await navigator.storage?.persist?.().catch(()=>false);return offlineDownloadFiles(OFFLINE_CACHES.ocr,f.files,onProgress,signal)},
  remove:async()=>{await caches.delete(OFFLINE_CACHES.ocr);return true}});
 registerOfflinePack({id:'price-scout',large:false,builtIn:true,
  label:()=>otr('Danh mục So Giá','Price Check catalog'),
  description:()=>otr('Có sẵn trong ứng dụng; luôn dùng được offline.','Included with the app; always available offline.'),
  sizeBytes:async()=>(await offlineManifest()).priceScout.transfer,
  status:async()=>({state:typeof MASTER_CATALOG!=='undefined'?'builtin':'none'})});
}
let offlineManifestCache=null;
// Voice placeholder until the on-device recognizer registers its own pack (same id).
function offlineVoicePlaceholder(){return{id:'voice',large:true,placeholder:true,label:()=>otr('Giọng nói không cần mạng','Offline voice'),description:()=>otr('Nhận dạng giọng nói ngay trên máy, không cần mạng.','Speech recognition on this device, without a connection.'),sizeBytes:0,status:async()=>({state:'unavailable'})}}

async function offlinePackStatus(p){try{const r=await p.status(),s=typeof r==='string'?{state:r}:r;offlineStatusCache.set(p.id,s);return s}catch{const s={state:'unknown'};offlineStatusCache.set(p.id,s);return s}}
function offlineStatusText(p,s,job){
 if(job?.running)return otr('Đang tải…','Downloading…')+(job.total?` ${Math.floor(job.done*100/job.total)}%`:'');
 if(job?.queued)return otr('Chờ Wi-Fi','Waiting for Wi-Fi');
 if(job?.error)return otr('Lỗi: ','Error: ')+job.error;
 if(s?.busyText)return String(s.busyText);
 return {ready:'✓ '+otr('Đã tải','Downloaded'),builtin:'✓ '+otr('Có sẵn','Included'),partial:otr(`Đã tải ${s.have}/${s.total} — bấm Tiếp tục`,`${s.have}/${s.total} downloaded — tap Resume`),none:otr('Chưa tải','Not downloaded'),unavailable:p.placeholder?otr('Sắp có','Coming soon'):s?.reasonText?String(s.reasonText):otr('Chưa có trên máy chủ này','Not available on this server'),unknown:otr('Chưa kiểm tra được','Status unavailable')}[s?.state||'unknown'];
}
// v1.7.1: a pack may add its own trusted markup under the description (on-device speech: auto-download option + update note).
function offlineExtra(p,s){try{return String(p.extraHtml(s)||'')}catch{return''}}
function offlineRowHtml(p){
 const s=offlineStatusCache.get(p.id)||{state:'unknown'},job=offlineJobs.get(p.id),size=p.__size||0,pct=job?.total?Math.floor(job.done*100/job.total):s.total?Math.floor((s.have||0)*100/s.total):(s.state==='ready'||s.state==='builtin'?100:0);
 const canDownload=!s.busy&&!p.builtIn&&!p.placeholder&&s.state!=='unavailable'&&s.state!=='ready',canRemove=!s.busy&&!p.builtIn&&!p.placeholder&&typeof p.remove==='function'&&(s.state==='ready'||s.state==='partial');
 const action=job?.running?`<button type="button" class="btn small" data-offline-cancel="${p.id}">${otr('Dừng','Stop')}</button>`:canDownload?`<button type="button" class="btn small primary" data-offline-download="${p.id}">${s.state==='partial'||job?.error?otr('Tiếp tục','Resume'):job?.queued?otr('Tải ngay','Download now'):otr('Tải về','Download')}</button>`:'';
 return `<li class="offline-pack" data-pack="${esc(p.id)}" data-state="${esc(job?.running?'running':job?.queued?'queued':s.state)}"><div class="offline-pack-main"><b>${esc(offlineLabel(p))}</b><small>${size?esc(offlineBytes(size))+' · ':''}<span class="offline-pack-status">${esc(offlineStatusText(p,s,job))}</span></small>${offlineDesc(p)?`<small class="hint">${esc(offlineDesc(p))}</small>`:''}${typeof p.extraHtml==='function'?offlineExtra(p,s):''}${s.failedText?`<small class="offline-pack-warn" role="note">⚠️ ${esc(s.failedText)}</small>`:s.warnText&&s.state!=='unavailable'?`<small class="offline-pack-warn">${esc(s.warnText)}</small>`:''}<div class="offline-progress" role="progressbar" aria-label="${esc(offlineLabel(p))}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"${!job?.running&&s.state!=='partial'?' hidden':''}><span style="width:${pct}%"></span></div></div><div class="offline-pack-actions">${action}${canRemove&&!job?.running?`<button type="button" class="btn small" data-offline-remove="${p.id}">${otr('Xoá','Remove')}</button>`:''}</div></li>`;
}
async function offlineStorageText(){
 try{offlineStorage=await navigator.storage?.estimate?.()}catch{offlineStorage=null}
 if(!offlineStorage?.quota)return otr('Không xem được dung lượng trên trình duyệt này.','Storage information is not available in this browser.');
 const free=Math.max(0,offlineStorage.quota-(offlineStorage.usage||0));
 return otr(`Đang dùng ${offlineBytes(offlineStorage.usage||0)} · còn trống khoảng ${offlineBytes(free)}`,`Using ${offlineBytes(offlineStorage.usage||0)} · about ${offlineBytes(free)} free`);
}
function offlineDownloadsBody(){
 const packs=offlineVisiblePacks();
 return `<div class="offline-downloads"><label class="offline-wifi"><input type="checkbox" id="offline-wifi-only" ${offlineWifiOnly()?'checked':''}><span><b>${otr('Chỉ tải khi có Wi-Fi','Download on Wi-Fi only')}</b><small class="hint" id="offline-connection">${esc(offlineConnectionLabel())}</small></span></label><ul class="offline-pack-list">${packs.map(offlineRowHtml).join('')}</ul><p class="hint offline-storage" id="offline-storage" role="status">${otr('Đang kiểm tra dung lượng…','Checking storage…')}</p></div>`;
}
// The on-device speech packs (voice-local.js registers 'voice-local-small' (v1.7.1: the Light pack is retired)) take the voice slot;
// the "coming soon" placeholder only shows when no voice pack is registered.
function offlineVisiblePacks(){const all=[...offlinePacks.values()],voice=all.filter(p=>/^voice(?:-|$)/.test(p.id)),list=all.filter(p=>!voice.includes(p));list.splice(Math.min(4,list.length),0,...(voice.length?voice:[offlineVoicePlaceholder()]));return list}
function offlineReadyBody(){
 const r=offlineReadiness,item=(ok,label,action='')=>`<li class="offline-ready-item ${ok===true?'ok':ok===false?'missing':'pending'}">${action&&ok===false?`<button type="button" class="offline-ready-fix" data-offline-fix="${action}">`:'<span>'}<span aria-hidden="true">${ok===true?'✓':ok===false?'✗':'…'}</span> ${esc(label)}${action&&ok===false?` <small>${otr('— bấm để tải','— tap to download')}</small></button>`:'</span>'}</li>`;
 if(!r)return `<p class="hint">${otr('Đang kiểm tra…','Checking…')}</p>`;
 return `<ul class="offline-ready-list" aria-label="${otr('Sẵn sàng offline','Offline ready')}">${item(r.app,otr('Ứng dụng mở được khi offline','App opens offline'))}${item(true,otr('Thực đơn tuần này','This week’s menu'))}${item(true,otr('Danh sách đi chợ','Shopping list'))}${item(true,otr('Giá đã lưu','Saved prices'))}${item(r.weekArt,otr('Hình món ăn tuần này','This week’s dish pictures'),'week-art')}${item(r.art,otr('Toàn bộ hình món ăn','All dish pictures'),'art')}${item(r.catalog,offlineLabel(offlinePacks.get('catalog')||{id:'catalog',label:'Kho món ăn'}),'catalog')}</ul>`;
}
// Paths of artwork cells for this week's menu, the family's own recipes and the week's ingredients.
function offlineWeekArtPaths(){
 const paths=new Set();if(typeof state==='undefined'||!state||typeof dishArtCellPath!=='function')return [];
 try{const week=typeof currentWeek==='function'?currentWeek():null;for(const day of Object.values(week?.days||{}))for(const meal of Object.values(day||{}))for(const r of meal?.recipes||[]){const p=dishArtCellPath(r);if(p)paths.add(p);for(const i of r.ingredients||[]){const q=ingredientArtCellPath(i.id);if(q)paths.add(q)}}}catch{}
 try{for(const r of state.recipes||[])if(typeof ownRecipe==='function'&&ownRecipe(r)){const p=dishArtCellPath(r);if(p)paths.add(p)}}catch{}
 try{for(const p of state.pantry||[]){const q=ingredientArtCellPath(p.ingredient);if(q)paths.add(q)}}catch{}
 return [...paths].sort();
}
let offlinePinTimer=null;
function offlineSchedulePin(){clearTimeout(offlinePinTimer);offlinePinTimer=setTimeout(offlinePinWeekArt,1500)}
function offlinePinWeekArt(force=false){
 const ctl=navigator.serviceWorker?.controller;if(!ctl||!offlineOnline())return false;
 const paths=offlineWeekArtPaths(),key=paths.join('|');if(!force&&key===offlinePinnedKey)return false;offlinePinnedKey=key;
 ctl.postMessage({type:'PRECACHE_ART',paths});return true;
}
async function offlineComputeReadiness(){
 const r={app:typeof offlineIsReady!=='undefined'?offlineIsReady:null,weekArt:null,art:null,catalog:null};
 try{if(typeof caches!=='undefined'){const paths=offlineWeekArtPaths();let have=0;const names=[OFFLINE_CACHES.pinned,OFFLINE_CACHES.art,OFFLINE_CACHES.runtime];const opened=await Promise.all(names.map(n=>caches.open(n)));for(const p of paths){for(const c of opened)if(await c.match('/'+p)){have++;break}}r.weekArt=have===paths.length;r.weekArtCount=[have,paths.length]}}catch{}
 for(const id of ['art','catalog']){const p=offlinePacks.get(id);if(p){const s=await offlinePackStatus(p);r[id]=s.state==='ready'}}
 offlineReadiness=r;offlineReadinessAt=Date.now();return r;
}
async function offlineRefreshUi(){
 const list=$('.offline-pack-list');
 if(list){const m=await offlineManifest().catch(()=>null);if(m)offlineManifestCache=m;const packs=offlineVisiblePacks();for(const p of packs){p.__size=await offlineSize(p);if(!offlineJobs.get(p.id)?.running)await offlinePackStatus(p)}list.innerHTML=packs.map(offlineRowHtml).join('');const st=$('#offline-storage');if(st)st.textContent=await offlineStorageText();const conn=$('#offline-connection');if(conn)conn.textContent=offlineConnectionLabel()}
 const ready=$('#offline-ready-body');if(ready){await offlineComputeReadiness();ready.innerHTML=offlineReadyBody()}
 offlineUpdateIndicator();
}
function offlineUpdateRow(id){const row=$(`.offline-pack[data-pack="${id}"]`),p=offlinePacks.get(id);if(row&&p)row.outerHTML=offlineRowHtml(p)}
function offlineQueue(){try{return JSON.parse(offlineGet(OFFLINE_QUEUE_KEY,'[]'))||[]}catch{return []}}
function offlineSetQueue(ids){offlineSet(OFFLINE_QUEUE_KEY,ids.length?JSON.stringify([...new Set(ids)]):null)}
// Decides whether a download may start now. Large packs wait for Wi-Fi when "Wi-Fi only" is on; on an unknown
// connection the family is asked once per session.
async function offlineMayDownload(p,{now=false}={}){
 if(!offlineOnline()){toast(otr('Đang offline — tải về khi có mạng nhé.','You are offline — download when you are connected.'),true);return false}
 if(!p.large||!offlineWifiOnly()||now)return true;
 const kind=offlineConnectionKind();
 if(kind==='wifi')return true;
 if(kind==='unknown'){let asked=null;try{asked=sessionStorage.getItem(OFFLINE_ASKED_KEY)}catch{}if(asked==='wifi')return true;
  const yes=typeof confirmDialog==='function'?await confirmDialog({title:otr('Bạn đang dùng Wi-Fi?','Are you on Wi-Fi?'),body:otr(`Không xác định được loại kết nối. "${offlineLabel(p)}" khoảng ${offlineBytes(p.__size||0)}.`,`The connection type is unknown. "${offlineLabel(p)}" is about ${offlineBytes(p.__size||0)}.`),confirmLabel:otr('Đang dùng Wi-Fi — tải','On Wi-Fi — download'),cancelLabel:otr('Để khi có Wi-Fi','Wait for Wi-Fi')}):false;
  try{sessionStorage.setItem(OFFLINE_ASKED_KEY,yes?'wifi':'wait')}catch{}if(yes)return true}
 offlineSetQueue([...offlineQueue(),p.id]);offlineJobs.set(p.id,{queued:true});offlineUpdateRow(p.id);
 toast(otr('Sẽ tự tải khi có Wi-Fi. Có thể bấm "Tải ngay" để dùng dữ liệu di động.','Will download on Wi-Fi. Tap "Download now" to use mobile data.'));
 return false;
}
async function offlineStartDownload(id,{now=false}={}){
 const p=offlinePacks.get(id);if(!p||typeof p.download!=='function'||offlineJobs.get(id)?.running)return;
 if(!p.__size)p.__size=await offlineSize(p);
 // A pack may ask first (on-device speech on iPhone/iPad: size, Wi-Fi, older devices may be slow). Not asked again for a queued resume.
 if(typeof p.beforeDownload==='function'&&!offlineQueue().includes(id)){let ok=false;try{ok=await p.beforeDownload()}catch{}if(!ok)return}
 if(!await offlineMayDownload(p,{now}))return;
 offlineSetQueue(offlineQueue().filter(x=>x!==id));
 const controller=new AbortController(),job={running:true,done:0,total:p.__size||0,controller};offlineJobs.set(id,job);offlineUpdateRow(id);
 let last=0;
 try{await p.download((done,total)=>{job.done=done;job.total=total||job.total;if(Date.now()-last>150){last=Date.now();const row=$(`.offline-pack[data-pack="${id}"]`);if(row){const bar=$('.offline-progress',row),pct=job.total?Math.floor(done*100/job.total):0;bar?.removeAttribute('hidden');bar?.setAttribute('aria-valuenow',String(pct));const fill=$('.offline-progress span',row);if(fill)fill.style.width=pct+'%';const st=$('.offline-pack-status',row);if(st)st.textContent=offlineStatusText(p,{},job)}}},controller.signal);offlineJobs.delete(id);toast(otr(`Đã tải "${offlineLabel(p)}" để dùng offline.`,`"${offlineLabel(p)}" is ready offline.`))}
 catch(error){offlineJobs.set(id,{error:controller.signal.aborted?otr('đã dừng','stopped'):String(error?.message||error).slice(0,120)})}
 offlineRefreshUi();
}
async function offlineRemove(id){const p=offlinePacks.get(id);if(!p?.remove)return;const ok=typeof confirmDialog==='function'?await confirmDialog({title:otr('Xoá bản tải offline?','Remove offline download?'),body:otr(`"${offlineLabel(p)}" sẽ được xoá khỏi máy này. Dữ liệu gia đình không bị ảnh hưởng; có thể tải lại sau.`,`"${offlineLabel(p)}" will be removed from this device. Family data is not affected; you can download it again.`),confirmLabel:otr('Xoá','Remove')}):true;if(!ok)return;try{await p.remove()}catch{}offlineJobs.delete(id);offlineSetQueue(offlineQueue().filter(x=>x!==id));offlineRefreshUi()}
function offlineResumeQueue(){if(!offlineOnline()||offlineConnectionKind()!=='wifi')return;for(const id of offlineQueue())if(offlinePacks.has(id))offlineStartDownload(id,{now:true})}
function offlineUpdateIndicator(){
 const status=$('#network-status');if(!status)return;const r=offlineReadiness;if(!r)return;
 const allArt=r.art||r.weekArt,full=r.app!==false&&allArt&&r.catalog;
 status.dataset.offlineReady=full?'full':'partial';
 const parts=[otr('Thực đơn','Menu')+' ✓',otr('Đi chợ','Shopping')+' ✓',otr('Giá','Prices')+' ✓',otr('Hình món ăn','Pictures')+(allArt?' ✓':' ✗'),otr('Kho món ăn','Library')+(r.catalog?' ✓':' ✗')];
 const base=status.title.split(' · '+otr('Sẵn sàng offline','Offline ready'))[0];
 status.title=base+' · '+otr('Sẵn sàng offline','Offline ready')+': '+parts.join(' · ');
}
// Settings sheet: readiness card and downloads card inside Other settings.
function offlineSettingsCards(){
 const card=(id,title,desc,body)=>typeof settingsCard==='function'?settingsCard('settings',id,title,desc,body):`<section class="kitchen-section kitchen-card" id="settings-${id}"><h3>${title}</h3><p class="kitchen-desc">${desc}</p>${body}</section>`;
 return card('offline-ready',otr('Sẵn sàng offline','Offline ready'),otr('Những gì dùng được khi mất mạng trên máy này.','What works without a connection on this device.'),`<div id="offline-ready-body">${offlineReadyBody()}</div>`)+card('offline-downloads',otr('Tải về để dùng offline','Downloads for offline use'),otr('Lần cài đầu chỉ tải phần cần thiết. Tải thêm khi muốn dùng offline nhiều hơn.','The first install only downloads what is needed. Add more for offline use.'),offlineDownloadsBody());
}
if(typeof otherSettingsModal==='function'){const baseOtherSettings=otherSettingsModal;otherSettingsModal=function(section=''){baseOtherSettings.call(this,section);const data=$('#settings-data'),html=offlineSettingsCards();if(data)data.insertAdjacentHTML('beforebegin',html);else $('.modal .modal-content')?.insertAdjacentHTML('beforeend',html);offlineRefreshUi();if(section&&String(section).startsWith('offline'))requestAnimationFrame(()=>$('#settings-'+section)?.scrollIntoView({block:'start'}))}}
document.addEventListener('click',event=>{
 const t=event.target.closest?.('[data-offline-download],[data-offline-remove],[data-offline-cancel],[data-offline-fix]');if(!t)return;
 event.preventDefault();
 if(t.dataset.offlineDownload){const job=offlineJobs.get(t.dataset.offlineDownload);offlineStartDownload(t.dataset.offlineDownload,{now:!!job?.queued})}
 else if(t.dataset.offlineRemove)offlineRemove(t.dataset.offlineRemove);
 else if(t.dataset.offlineCancel)offlineJobs.get(t.dataset.offlineCancel)?.controller?.abort();
 else if(t.dataset.offlineFix==='week-art'){if(offlinePinWeekArt(true))toast(otr('Đang lưu hình món ăn tuần này…','Saving this week’s pictures…'));else toast(otr('Cần mạng để lưu hình món ăn.','Pictures need a connection to save.'),true);setTimeout(offlineRefreshUi,2500)}
 else offlineStartDownload(t.dataset.offlineFix);
});
document.addEventListener('change',event=>{if(event.target?.id==='offline-wifi-only'){offlineSet(OFFLINE_WIFI_KEY,event.target.checked?'1':'0');if(!event.target.checked)for(const id of offlineQueue())offlineStartDownload(id,{now:true})}});
navigator.connection?.addEventListener?.('change',()=>{const c=$('#offline-connection');if(c)c.textContent=offlineConnectionLabel();offlineResumeQueue()});
window.addEventListener('online',()=>{offlineResumeQueue();offlineSchedulePin()});
navigator.serviceWorker?.addEventListener('message',event=>{if(event.data?.type==='ART_PINNED'||event.data?.type==='OFFLINE_READY')setTimeout(()=>{offlineComputeReadiness().then(()=>{const ready=$('#offline-ready-body');if(ready)ready.innerHTML=offlineReadyBody();offlineUpdateIndicator()})},50)});
navigator.serviceWorker?.addEventListener('controllerchange',()=>{offlinePinnedKey='';offlineSchedulePin()});
// Re-pin after each render (menu edits, week changes); cheap when nothing changed.
if(typeof render==='function'){const baseOfflineRender=render;render=function(...args){const result=baseOfflineRender.apply(this,args);offlineSchedulePin();offlineCatalogForView();return result}}
if(typeof updateConnectivityIcon==='function'){const baseIcon=updateConnectivityIcon;updateConnectivityIcon=function(...args){const result=baseIcon.apply(this,args);offlineUpdateIndicator();return result}}

// ---- Lazy reference catalog triggers: library view, meal editor, menu generator, new-kitchen preview. ----
let offlineCatalogNoticeShown=false,offlineCatalogFailedAt=0;
function offlineCatalogForView(){if(typeof view==='undefined'||view!=='recipes'||typeof ensureCatalog!=='function'||typeof catalogLoaded!=='function'||catalogLoaded()||Date.now()-offlineCatalogFailedAt<60000)return;ensureCatalog().then(()=>{if(view==='recipes'&&typeof render==='function')render()}).catch(()=>{offlineCatalogFailedAt=Date.now()})}
function offlineWithCatalog(name){
 const base=globalThis[name];if(typeof base!=='function'||base.__withCatalog)return;
 const wrapped=function(...args){if(typeof ensureCatalog!=='function'||typeof catalogLoaded!=='function'||catalogLoaded())return base.apply(this,args);
  const self=this,slow=setTimeout(()=>toast(otr('Đang tải kho món ăn…','Loading the recipe library…')),400);
  return ensureCatalog().catch(()=>{if(!offlineCatalogNoticeShown){offlineCatalogNoticeShown=true;toast(otr('Kho món ăn chưa tải về máy — đang dùng các món đã có trên máy.','The recipe library is not downloaded — using the recipes on this device.'))}}).then(()=>{clearTimeout(slow);return base.apply(self,args)})};
 wrapped.__withCatalog=true;globalThis[name]=wrapped;
}
for(const name of ['familyGeneratePreview','familyEditMeal','editMeal','setupShowPreview','familyRecipeEditor'])offlineWithCatalog(name);
window.addEventListener('hashchange',()=>setTimeout(offlineCatalogForView,0));
window.addEventListener('bep-catalog-ready',()=>{offlineStatusCache.delete('catalog');if($('.offline-pack-list'))offlineRefreshUi()});

// ---- Self-hosted OCR (vendor/tesseract). Falls back to the public CDN only if the files are missing. ----
const OCR_BASE='vendor/tesseract/';
function ocrOfflineReady(){return offlineStatusCache.get('ocr')?.state==='ready'}
globalThis.ocrOfflineReady=ocrOfflineReady;
if(typeof loadOCR==='function'){const cdnLoadOCR=loadOCR;let selfHosted=null;
 loadOCR=function(){if(window.Tesseract)return Promise.resolve();if(!selfHosted)selfHosted=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=OCR_BASE+'tesseract.min.js';script.onload=()=>{offlinePatchTesseract();resolve()};script.onerror=()=>{selfHosted=null;script.remove();reject(Error('self-hosted OCR missing'))};document.head.append(script)});
  return selfHosted.catch(()=>offlineOnline()?cdnLoadOCR():Promise.reject(Error(otr('Bộ đọc chữ chưa được tải về máy. Vào Tài khoản & cài đặt (ảnh đại diện góc trên) → Tải về để dùng offline.','The text reader is not downloaded. Open Account & settings (top-right avatar) → Downloads for offline use.'))))}}
function offlinePatchTesseract(){const T=window.Tesseract;if(!T||T.__selfHosted)return;const base=T.createWorker.bind(T),abs=p=>new URL(OCR_BASE+p,document.baseURI).href;
 T.createWorker=(langs,oem=1,options={},config)=>base(langs,oem,{workerPath:abs('worker.min.js'),corePath:abs('core'),langPath:abs('lang'),workerBlobURL:false,cacheMethod:'none',gzip:true,...options},config);T.__selfHosted=true}
async function offlineInitOcrStatus(){const p=offlinePacks.get('ocr');if(p)await offlinePackStatus(p)}

// ---- Online-only features: friendly offline messages. ----
if(typeof weatherModal==='function'){const baseWeather=weatherModal;weatherModal=function(...args){const result=baseWeather.apply(this,args);if(!offlineOnline()){const form=$('#weather-form');form?.insertAdjacentHTML('beforebegin',`<p class="offline-note" role="status">${otr('Đang offline — nhiệt độ trực tiếp sẽ cập nhật khi có mạng. Bạn vẫn có thể tự đánh dấu hôm nay nóng hay mát.','Offline — live temperature updates when you are connected. You can still mark today as hot or cool.')}</p>`);const submit=$('#weather-form button');if(submit)submit.disabled=true}return result}}
document.addEventListener('click',event=>{const link=event.target.closest?.('a[href*="studio.html"]');if(link&&!offlineOnline()){event.preventDefault();toast(otr('Studio cần kết nối mạng. Dữ liệu bếp trên máy vẫn dùng được.','Studio needs an internet connection. Kitchen data on this device is still available.'),true)}},true);

registerBuiltInOfflinePacks();
offlineManifest().then(m=>{offlineManifestCache=m;return Promise.all([offlineInitOcrStatus(),offlineComputeReadiness()])}).then(()=>offlineUpdateIndicator()).catch(()=>{});
// A catalog fetched before the worker controlled the page (first visit) is stored for offline use once it does.
async function offlineKeepLoadedCatalog(){try{if(typeof catalogLoaded!=='function'||!catalogLoaded()||!navigator.serviceWorker?.controller||!offlineOnline()||typeof catalogUrl!=='function')return;const cache=await caches.open(OFFLINE_CACHES.catalog);if(!(await cache.keys()).length)await fetch(catalogUrl(),{credentials:'same-origin'});offlineStatusCache.delete('catalog')}catch{}}
navigator.serviceWorker?.addEventListener('controllerchange',()=>setTimeout(offlineKeepLoadedCatalog,1000));
setTimeout(offlineKeepLoadedCatalog,5000);
offlineSchedulePin();
setTimeout(offlineCatalogForView,0);
setTimeout(offlineResumeQueue,4000);
