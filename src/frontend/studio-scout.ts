// Studio · Scout network page (FamTray Scout). Separate classic script loaded by
// dist/studio.html after studio.js. v1.6: studio.ts exposes its page registry as
// window.studioPages, so this registers a normal Studio page {scout:{vi,en,icon,render}}
// (nav link, routing, language switch and focus handled by Studio) and adds the
// "Scout tự động / Auto Scout" platform setting card to Studio → Settings.
// Fallback (older studio.js without the registry): its own <main id="scout-main"> at #scout.
// Every action posts to /.netlify/functions/scout?op=studio-* which writes the Studio audit log.
(function studioScout(){
'use strict';
if(!document.getElementById('nav')||!document.getElementById('main'))return;
const API='/.netlify/functions/scout',STUDIO='/.netlify/functions/studio';
const lang=()=>{try{return localStorage.getItem('studio-lang')||(String(navigator.language||'').toLowerCase().startsWith('vi')?'vi':'en')}catch{return 'vi'}};
const T=(vi:string,en:string)=>lang()==='en'?en:vi;
const esc=(v:any)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'} as any)[c]);
const $=(s:string,r:any=document)=>r.querySelector(s) as any;
const RET=['woolworths','coles','aldi','chemist','amazon'],LABEL:any={woolworths:'Woolworths',coles:'Coles',aldi:'ALDI',chemist:'Chemist Warehouse',amazon:'Amazon AU'};
const locale=()=>lang()==='en'?'en-AU':'vi-VN';
const when=(v:any)=>{if(!v)return T('chưa có','never');const d=new Date(v);return isNaN(+d)?'—':d.toLocaleString(locale(),{timeZone:'Australia/Sydney',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})};
const pct=(v:any)=>v==null?'—':Math.round(v*100)+'%';
const days=()=>[T('CN','Sun'),T('T2','Mon'),T('T3','Tue'),T('T4','Wed'),T('T5','Thu'),T('T6','Fri'),T('T7','Sat')];
let csrf='',data:any=null,cov:any=null,code:any=null,busy=false;

// ---------- styles (own block; Studio's stylesheet is not edited) ----------
const css=`#scout-main .scout-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:12px;margin:12px 0}
#scout-main .switchrow{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
#scout-main .switchrow .btn{min-height:44px}
#scout-main .code{font:700 1.6rem/1.2 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.12em;overflow-wrap:anywhere}
#scout-main .covw{overflow-x:auto;max-width:100%}
#scout-main .cov{border-collapse:collapse;font-size:13px}
#scout-main .cov th,#scout-main .cov td{border:1px solid var(--line);padding:6px 8px;text-align:center;white-space:nowrap}
#scout-main .cov th:first-child,#scout-main .cov td:first-child{text-align:left;position:sticky;left:0;background:var(--panel)}
#scout-main .f0{background:var(--okbg);color:var(--ok)}#scout-main .f1{background:var(--warnbg);color:var(--warn)}#scout-main .f2{background:var(--badbg);color:var(--bad)}
#scout-main .win{display:flex;flex-wrap:wrap;gap:6px;align-items:center;border:1px solid var(--line);border-radius:10px;padding:8px;margin:0 0 8px}
#scout-main .win label.d{display:inline-flex;align-items:center;gap:4px;min-height:44px;min-width:44px;padding:0 8px;border:1px solid var(--line);border-radius:8px}
#scout-main .fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr));gap:10px}
#scout-main .fields label{display:flex;flex-direction:column;gap:4px;font-weight:600}
#scout-main input[type=number],#scout-main input[type=time],#scout-main input[type=text]{min-height:44px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--panel);color:var(--text);font:inherit;max-width:100%}
#scout-main .ev{list-style:none;padding:0;margin:0}#scout-main .ev li{padding:6px 0;border-bottom:1px solid var(--line);overflow-wrap:anywhere}
#scout-main .alert{color:var(--bad);font-weight:700}
#scout-main .note{border-left:4px solid var(--warn);padding:8px 12px;background:var(--warnbg);border-radius:8px;margin:0 0 12px}
#scout-main .rc{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:12px}
#scout-main .rc-dev{border:1px solid var(--line);border-radius:12px;padding:12px;min-width:0;background:var(--panel)}
#scout-main .rc-dev h3{margin:0 0 6px;font-size:1rem;display:flex;flex-wrap:wrap;gap:6px;align-items:center;overflow-wrap:anywhere}
#scout-main .rc-kv{display:grid;grid-template-columns:auto minmax(0,1fr);gap:4px 10px;margin:6px 0;font-size:14px}
#scout-main .rc-kv dt{color:var(--muted)}#scout-main .rc-kv dd{margin:0;min-width:0;overflow-wrap:anywhere}
#scout-main .rc-btns{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}#scout-main .rc-btns .btn,#scout-main .rc-btns select{min-height:44px}
#scout-main select{min-height:44px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--panel);color:var(--text);font:inherit;max-width:100%}
#scout-main .rc-cmds{list-style:none;margin:6px 0 0;padding:0;font-size:13px}#scout-main .rc-cmds li{padding:3px 0;overflow-wrap:anywhere}
#scout-main details.rc-tl summary{min-height:44px;display:flex;align-items:center;cursor:pointer;font-weight:600}
#scout-main .switch{display:flex;gap:8px;align-items:center;min-height:44px}#scout-main .switch input{width:22px;height:22px}`;
const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);

// ---------- container + nav ----------
const registry=(window as any).studioPages;
let host:any;
if(registry){host=document.createElement('div');host.id='scout-main'}
else{host=document.createElement('main');host.id='scout-main';host.className='main';host.tabIndex=-1;host.hidden=true;host.setAttribute('aria-labelledby','scout-h1');$('#main').after(host)}
function navLink(){if(registry)return;const nav=$('#nav');if(!nav||!nav.children.length)return;let a=$('a[href="#scout"]',nav);const on=location.hash==='#scout';
 if(!a){a=document.createElement('a');a.href='#scout';nav.appendChild(a)}
 const label=`<span aria-hidden="true">◎</span>${esc(T('Mạng So Giá','Price Check network'))}`;if(a.innerHTML!==label)a.innerHTML=label;
 if(on){a.setAttribute('aria-current','page');for(const x of nav.querySelectorAll('a[aria-current]'))if(x!==a)x.removeAttribute('aria-current')}else a.removeAttribute('aria-current')}
if(!registry)new MutationObserver(navLink).observe($('#nav'),{childList:true,subtree:true,characterData:true});

// ---------- API ----------
async function handle(r:Response){let d:any={};try{d=await r.json()}catch{}if(!r.ok){const e:any=new Error(lang()==='en'?d.errorEn||d.error||'Request failed':d.error||d.errorEn||'Lỗi');e.status=r.status;e.data=d;throw e}return d}
const get=(op:string)=>fetch(API+'?op='+op,{credentials:'same-origin',headers:{Accept:'application/json'}}).then(handle);
async function post(op:string,body:any){if(!csrf)csrf=(await fetch(STUDIO+'?op=me',{credentials:'same-origin'}).then(handle)).csrf;return fetch(API+'?op='+op,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','x-studio-csrf':csrf},body:JSON.stringify(body)}).then(handle)}
function toast(msg:string,bad=false){const t=$('#toast');if(!t)return;t.textContent=msg;t.className='toast show'+(bad?' bad':'');clearTimeout((toast as any).t);(toast as any).t=setTimeout(()=>t.className='toast',4200)}
async function act(op:string,body:any,ok:string){if(busy)return;busy=true;try{const r=await post(op,body);toast(ok);await load();return r}catch(e:any){toast(e.message,true)}finally{busy=false}}

// ---------- render ----------
const chip=(cls:string,label:string)=>`<span class="chip ${cls}">${esc(label)}</span>`;
const statusChip=(s:string)=>s==='active'?chip('green',T('Hoạt động','Active')):s==='blocked'?chip('red',T('Bị chặn — tạm dừng 24 giờ','Blocked — paused 24 h')):s==='paused'?chip('amber',T('Tạm dừng','Paused')):s==='access-removed'?chip('red',T('Bị thu hồi quyền','Access removed')):chip('red',T('Đã thu hồi','Revoked'));
function table(cols:any[],rows:any[],caption:string){if(!rows.length)return `<p class="empty">${T('Chưa có dữ liệu.','Nothing here yet.')}</p>`;return `<div class="tw"><table class="rt"><caption class="sr-only">${esc(caption)}</caption><thead><tr>${cols.map(c=>`<th scope="col">${esc(c.label)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${cols.map(c=>`<td data-label="${esc(c.label)}"><div>${c.render(r)}</div></td>`).join('')}</tr>`).join('')}</tbody></table></div>`}
// ---------- v1.7 pace + remote control ----------
const PACES=()=>({slow:T('Chậm 30–60 giây','Slow 30–60 s'),normal:T('Bình thường 20–40 giây','Normal 20–40 s'),fast:T('Nhanh 8–15 giây','Fast 8–15 s'),veryfast:T('Rất nhanh 3–6 giây','Very fast 3–6 s')} as any);
const PACE_MS:any={slow:{minMs:30000,maxMs:60000},normal:{minMs:20000,maxMs:40000},fast:{minMs:8000,maxMs:15000},veryfast:{minMs:3000,maxMs:6000}};
const presetOf=(p:any)=>Object.keys(PACE_MS).find(k=>PACE_MS[k].minMs===p?.minMs&&PACE_MS[k].maxMs===p?.maxMs)||'custom';
const paceText=(p:any)=>{if(!p)return '—';const k=p.preset||presetOf(p);return (PACES()[k]||T('Tùy chỉnh ','Custom ')+Math.round(p.minMs/1000)+'–'+Math.round(p.maxMs/1000)+' s')+(Object.keys(p.byRetailer||{}).length?' · '+T('chậm lại hôm nay: ','slowed today: ')+Object.keys(p.byRetailer).map(r=>LABEL[r]||r).join(', '):'')};
const ago=(v:any)=>{if(!v)return T('chưa liên lạc','never seen');const m=Math.max(0,Math.round((Date.now()-Date.parse(v))/60000));return m<1?T('vừa xong','just now'):m<60?T(m+' phút trước',m+' min ago'):m<2880?T(Math.round(m/60)+' giờ trước',Math.round(m/60)+' h ago'):T(Math.round(m/1440)+' ngày trước',Math.round(m/1440)+' days ago')};
const stateText=(l:any)=>{const s=l.state;if(s==='running')return chip('green',T(`Đang chạy · ${l.run?.pages||0}/${l.run?.cap||0} trang`,`Running · ${l.run?.pages||0}/${l.run?.cap||0} pages`));if(s==='blocked')return chip('red',T('Bị chặn đến ','Blocked until ')+when(l.pausedUntil));if(s==='paused')return chip('amber',T('Tạm dừng','Paused')+(l.pausedUntil?' · '+when(l.pausedUntil):''));if(s==='offline')return chip('red',T('Mất liên lạc','Offline'));if(s==='run-now-waiting')return chip('amber',T('Chờ chạy ngay','Run now pending'));if(s==='waiting-window')return chip('amber',T('Chờ khung giờ','Waiting for window'));if(s==='waiting-user')return chip('amber',T('Chờ người dùng rời máy','Waiting for the user to step away'));if(s==='revoked')return chip('red',T('Đã thu hồi','Revoked'));return chip('green',T('Rảnh','Idle'))};
const cmdName=(t:string)=>(({'run-now':T('Chạy ngay','Run now'),stop:T('Dừng','Stop'),pause:T('Tạm dừng','Pause'),resume:T('Tiếp tục','Resume'),pace:T('Đổi nhịp','Change pace'),'refresh-config':T('Tải lại cấu hình','Refresh config'),'recheck-stores':T('Kiểm tra lại tên cửa hàng','Re-check store labels')}) as any)[t]||t;
const cmdStatus=(c:any)=>c.status==='pending'?T('Đang chờ máy nhận lệnh','Waiting for the computer'):c.status==='received'?T('Đã nhận','Received'):c.status==='done'?T('Xong','Done')+(c.result?': '+c.result:''):c.status==='failed'?T('Lỗi','Failed')+(c.result?': '+c.result:''):T('Hết hạn (máy không nhận trong 30 phút)','Expired (not picked up in 30 min)');
const tl:any={};
// Capture time, same wording as the app: "2 giờ trước" + "T4 01/11 06:42" / "2 h ago" + "Wed 1 Nov 06:42" (viewer's local time).
const capRel=(v:any)=>{const m=Math.max(0,Math.floor((Date.now()-Date.parse(v))/60000)),h=Math.floor(m/60),d=Math.floor(h/24);return m<1?T('vừa xong','just now'):m<60?T(m+' phút trước',m+' min ago'):h<24?T(h+' giờ trước',h+' h ago'):d===1?T('hôm qua','yesterday'):T(d+' ngày trước',d+' days ago')};
const capAbs=(v:any)=>{const t=new Date(v),dow=t.toLocaleDateString('en-US',{weekday:'short'}),p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(t).map(x=>[x.type,x.value]));return lang()==='en'?`${dow} ${p.day} ${p.month} ${p.hour}:${p.minute}`:`${['CN','T2','T3','T4','T5','T6','T7'][t.getDay()]} ${String(t.getDate()).padStart(2,'0')}/${String(t.getMonth()+1).padStart(2,'0')} ${p.hour}:${p.minute}`};
function remoteHtml(devs:any[]){const s=data.settings,n=s.notify||{};
 return `<section class="card" aria-labelledby="sc-rc"><h2 id="sc-rc">${T('Điều khiển từ xa','Remote control')}</h2>
  <p class="muted">${T('Lệnh được giao ở lần máy liên lạc tiếp theo (mỗi phút khi Chrome đang chạy). Máy đang ngủ, tắt hoặc đóng Chrome thì không thể đánh thức từ xa — lệnh chờ tối đa 30 phút.','Commands are delivered at the computer’s next check-in (every minute while Chrome runs). A computer that is asleep, off or has Chrome closed cannot be woken remotely — commands wait up to 30 minutes.')}</p>
  <div class="rc-btns"><button class="btn primary" type="button" id="sc-runall" ${s.autoScout!=='on'||s.paused?'disabled':''}>${T('▶ Chạy ngay mọi máy được phép','▶ Run now on all allowed computers')}</button></div>
  ${s.autoScout!=='on'?`<p class="note">${T('Chạy ngay cần bật chế độ tự động cho cả mạng.','Run now needs Auto mode switched on network-wide.')}</p>`:''}
  <div class="rc">${devs.map((d:any)=>{const l=d.live||{};return `<article class="rc-dev" aria-labelledby="rc-${esc(d.id)}"><h3 id="rc-${esc(d.id)}">${esc(d.name)} ${stateText(l)}</h3>
   <dl class="rc-kv"><dt>${T('Liên lạc','Last check-in')}</dt><dd>${l.online?chip('green',T('Trực tuyến','Online')):chip('red',T('Ngoại tuyến','Offline'))} ${esc(ago(l.lastHeartbeat))}</dd>
   <dt>Chrome</dt><dd>${l.chromeOpen==null?'—':l.chromeOpen?T('đang mở','open'):T('không có cửa sổ','no window')}${l.idle?' · '+esc(l.idle==='active'?T('đang dùng máy','in use'):l.idle==='locked'?T('máy khóa','locked'):T('không dùng','idle')):''}</dd>
   <dt>${T('Pin','Power')}</dt><dd>${l.battery?esc((l.battery.charging?T('đang sạc','charging'):T('dùng pin','on battery'))+(l.battery.level!=null?' · '+Math.round(l.battery.level*100)+'%':'')):'—'}</dd>
   <dt>${T('Nhịp','Pace')}</dt><dd>${esc(paceText(l.pace))}${l.pace?.source==='device'?' · '+esc(T('riêng máy này','this device')):''}</dd>
   <dt>${T('Lần chạy trước','Last run')}</dt><dd>${l.lastRun?esc(when(l.lastRun.at)+' · '+T(`${l.lastRun.pages} trang, ${l.lastRun.prices} giá đã lưu, bỏ qua ${l.lastRun.skipped}, lỗi ${l.lastRun.errors}`,`${l.lastRun.pages} pages, ${l.lastRun.prices} prices saved, ${l.lastRun.skipped} skipped, ${l.lastRun.errors} errors`)+(l.lastRun.stop?' · '+l.lastRun.stop:'')):'—'}</dd>
   <dt>${T('Lỗi gần nhất','Last error')}</dt><dd>${l.lastError?`<span class="alert">${esc((LABEL[l.lastError.retailer]||'')+' · '+(l.lastError.kind||'')+' · '+when(l.lastError.at))}</span>`:'—'}</dd>
   <dt>${T('Phiên bản','Version')}</dt><dd>${esc((l.version?'v'+l.version:'—')+(l.configVersion?' · '+T('cấu hình ','config ')+l.configVersion:''))}</dd></dl>
   <div class="rc-btns">${d.status==='revoked'?'':`${l.state==='running'?`<button class="btn danger" type="button" data-cmd="stop" data-id="${esc(d.id)}">⏹ ${T('Dừng','Stop')}</button>`:`<button class="btn primary" type="button" data-cmd="run-now" data-id="${esc(d.id)}" ${!d.autoAllowed||s.autoScout!=='on'||s.paused?'disabled':''}>▶ ${T('Chạy ngay','Run now')}</button>`}
    ${l.state==='paused'||l.state==='blocked'?`<button class="btn" type="button" data-cmd="resume" data-id="${esc(d.id)}">${T('Tiếp tục','Resume')}</button>`:`<button class="btn" type="button" data-cmd="pause" data-id="${esc(d.id)}">⏸ ${T('Tạm dừng','Pause')}</button>`}
    <label class="sr-only" for="pace-${esc(d.id)}">${T('Nhịp cho máy này','Pace for this device')}</label><select id="pace-${esc(d.id)}" data-pace-dev="${esc(d.id)}"><option value="">${T('Theo mạng','Network default')}</option>${Object.entries(PACES()).map(([k,v])=>`<option value="${k}" ${l.pace?.source==='device'&&l.pace?.studioLimit?.preset===k?'selected':''}>${esc(v)}</option>`).join('')}</select>
    <button class="btn" type="button" data-cmd="refresh-config" data-id="${esc(d.id)}">${T('Tải lại cấu hình','Refresh config')}</button><button class="btn" type="button" data-cmd="recheck-stores" data-id="${esc(d.id)}">${T('Kiểm tra lại cửa hàng','Re-check stores')}</button>`}</div>
   ${(l.commands||[]).length?`<ul class="rc-cmds" aria-label="${esc(T('Lệnh gần đây','Recent commands'))}">${l.commands.map((c:any)=>`<li><strong>${esc(cmdName(c.type))}</strong> · ${esc(when(c.createdAt))} · ${esc(cmdStatus(c))}</li>`).join('')}</ul>`:''}
   <details class="rc-tl" data-tl="${esc(d.id)}" ${tl[d.id]?'open':''}><summary>${T('Hoạt động gần đây','Recent activity')}</summary>${tl[d.id]?`<ul class="ev">${tl[d.id].map((e:any)=>`<li><strong>${esc(evName(e.type))}</strong> · ${esc(when(e.at))}${e.retailer?' · '+esc(LABEL[e.retailer]||e.retailer):''}${e.command?' · '+esc(cmdName(e.command)):''}${e.pages!=null?' · '+esc(T(e.pages+' trang',e.pages+' pages')):''}${e.prices!=null?' · '+esc(T(e.prices+' giá',e.prices+' prices')):''}${e.kind?' · '+esc(e.kind):''}</li>`).join('')||`<li class="muted">${T('Chưa có.','Nothing yet.')}</li>`}</ul>`:`<p class="muted">…</p>`}</details>
  </article>`}).join('')||`<p class="empty">${T('Chưa có máy nào.','No computers yet.')}</p>`}</div>
 </section>
 <section class="card" aria-labelledby="sc-nt"><h2 id="sc-nt">${T('Thông báo về điện thoại của chủ','Notifications to the owner’s phone')}</h2>
  <p class="muted">${T('Gửi qua thông báo của ứng dụng tới máy của tài khoản chủ Studio đã bật thông báo. Giờ yên lặng vẫn áp dụng.','Sent as app notifications to the Studio owner’s devices that have notifications on. Quiet hours still apply.')}</p>
  <form id="sc-notify" class="form">${[['runFinished',T('Chạy xong (tóm tắt)','Run finished (summary)')],['blocked',T('Máy bị chặn / trang xác minh','Computer blocked / check page')],['offline',T('Máy mất liên lạc trong khung giờ chạy','Computer offline during its window')],['parserBreakage',T('Tự dừng vì trình đọc lỗi','Parser breakage auto-pause')]].map(([k,l])=>`<label class="switch"><input type="checkbox" name="${k}" ${n[k]?'checked':''}><span>${esc(l)}</span></label>`).join('')}
  <div class="fields"><label>${T('Báo khi mất liên lạc quá (giờ)','Offline for more than (hours)')}<input type="number" name="offlineHours" min="1" max="48" value="${n.offlineHours||3}"></label></div>
  <div class="row"><button class="btn primary" type="submit">${T('Lưu thông báo','Save notifications')}</button></div></form>
 </section>`}
function render(){
 if(!data){host.innerHTML=`<header class="page-head"><div><h1 id="scout-h1" tabindex="-1">${T('Mạng So Giá','Price Check network')}</h1><p class="muted">…</p></div></header>`;return}
 const s=data.settings,auto=s.autoScout==='on',semi=s.semiAuto==='on';
 const devRows=data.devices.filter((d:any)=>d.status!=='revoked'),revoked=data.devices.length-devRows.length;
 host.innerHTML=`
 <header class="page-head"><div><h1 id="scout-h1" tabindex="-1">${T('Mạng So Giá','Price Check network')}</h1>
  <p class="muted">${T('Tiện ích FamTray So Giá trên máy tính của các gia đình: ghi giá trên trang họ xem (bán tự động) và, khi bạn cho phép, chạy tự động theo lịch với nhịp chậm như người dùng.','The FamTray Price Check extension on family computers: captures prices on pages they view (semi-auto) and, when you allow it, runs on a schedule at a human pace.')}</p></div>
</header>
 <section class="card" aria-labelledby="sc-ext"><h2 id="sc-ext">${T('Tài khoản được dùng tiện ích','Accounts allowed to use the extension')}</h2>
  <p class="muted">${T('Chỉ các tài khoản ở đây mới thấy và ghép được tiện ích (chủ gia đình cũng cần được thêm). Bỏ một tài khoản là các máy của tài khoản đó ngừng ngay; thêm lại thì các máy đó chạy lại, không cần ghép lại.','Only these accounts see and can pair the extension (family owners must be added too). Removing an account stops its computers at once; adding it back re-enables them without re-pairing.')}</p>
  <ul class="plain sc-ext-list">${(data.admins||[]).map((u:string)=>`<li>${esc(u)} <small class="muted">${T('quản trị · luôn được phép','admin · always allowed')}</small></li>`).join('')}${(data.extensionUsers||[]).filter((u:any)=>!(data.admins||[]).includes(u.username)).map((u:any)=>`<li>${esc(u.username)} <small class="muted">${esc(u.source==='trusted'||u.source==='paired-device'?T('chuyển tự động','migrated'):u.by)} · ${esc(when(u.at))}</small> <button class="btn small" type="button" data-ext-remove="${esc(u.username)}">${T('Bỏ','Remove')}<span class="sr-only"> ${esc(u.username)}</span></button></li>`).join('')}</ul>
  <form id="sc-ext-add" class="row" style="margin-top:8px"><label>${T('Tìm tài khoản (tên hoặc tên đăng nhập)','Find account (name or username)')} <input type="search" name="u" list="sc-ext-found" required minlength="3" maxlength="40" autocomplete="off" spellcheck="false"></label><datalist id="sc-ext-found"></datalist><button class="btn primary" type="submit">${T('Thêm','Add')}</button></form>
 </section>
 <details class="card sc-advanced" ${code?'open':''}><summary><h2 style="display:inline">${T('Nâng cao: mã ghép nối','Advanced: pairing code')}</h2></summary>
  <p class="muted">${T('Thường không cần: người dùng bấm “Ghép ngay” trong ứng dụng hoặc tiện ích. Mã gắn với tài khoản được chọn.','Usually not needed: people tap “Pair now” in the app or the extension. The code is bound to the chosen account.')}</p>
  <form id="sc-code-form" class="row"><label>${T('Tài khoản','Account')} <select name="u">${[...(data.admins||[]),...(data.extensionUsers||[]).map((u:any)=>u.username).filter((u:string)=>!(data.admins||[]).includes(u))].map((u:string)=>`<option value="${esc(u)}">${esc(u)}</option>`).join('')}</select></label><button class="btn" id="sc-code" type="submit">${T('Tạo mã ghép nối','Create pairing code')}</button></form>
  ${code?`<div aria-live="polite"><h3>${T('Mã ghép nối (dùng một lần, 15 phút)','Pairing code (one-time, 15 minutes)')}</h3><p class="code">${esc(code.code.slice(0,4)+'-'+code.code.slice(4))}</p><dl class="kv"><dt>${T('Tài khoản','Account')}</dt><dd>${esc(code.account||'')}</dd><dt>${T('Địa chỉ ứng dụng','App address')}</dt><dd>${esc(location.origin)}</dd><dt>${T('Hết hạn','Expires')}</dt><dd>${esc(when(code.expires))}</dd></dl></div>`:''}
 </details>
 <section class="card" aria-labelledby="sc-sw"><h2 id="sc-sw">${T('Công tắc','Switches')}</h2>
  ${!auto?`<p class="note">${T('Chế độ tự động đang TẮT cho cả mạng (mặc định). Máy chỉ nhận việc khi bạn bật ở đây, cho phép từng máy, VÀ người dùng bật trên máy đó.','Auto mode is OFF network-wide (default). A device only gets tasks when you switch it on here, allow that device, AND the user switches it on there.')}</p>`:''}
  <div class="switchrow">
   <button class="btn ${auto?'danger':'primary'}" id="sc-auto" type="button" aria-pressed="${auto}">${auto?T('Tắt chế độ tự động','Switch Auto off'):T('Bật chế độ tự động','Switch Auto on')}</button>
   <button class="btn" id="sc-semi" type="button" aria-pressed="${semi}">${semi?T('Tắt bán tự động','Switch semi-auto off'):T('Bật bán tự động','Switch semi-auto on')}</button>
   <button class="btn ${s.paused?'primary':'danger'}" id="sc-pause" type="button" aria-pressed="${!!s.paused}">${s.paused?T('▶ Tiếp tục cả mạng','▶ Resume network'):T('⏸ Tạm dừng cả mạng','⏸ Pause whole network')}</button>
  </div>
  <dl class="kv" style="margin-top:10px"><dt>${T('Tự động','Auto')}</dt><dd>${auto?chip('green',T('Bật','On')):chip('amber',T('Tắt','Off'))}</dd><dt>${T('Bán tự động','Semi-auto')}</dt><dd>${semi?chip('green',T('Bật','On')):chip('amber',T('Tắt','Off'))}</dd><dt>${T('Toàn mạng','Network')}</dt><dd>${s.paused?chip('red',T('Tạm dừng','Paused')):chip('green',T('Đang chạy','Running'))}</dd><dt>robots.txt</dt><dd>${T('Luôn tôn trọng (không tắt được)','Always respected (cannot be switched off)')}</dd><dt>${T('Cấu hình trình đọc','Parser config')}</dt><dd>${esc(data.configVersion||'—')}</dd><dt>${T('Việc hôm nay','Tasks today')}</dt><dd>${esc(Object.entries(data.tasks.byStatus).map(([k,v])=>(({queued:T('chờ','queued'),leased:T('đang làm','leased'),done:T('xong','done'),skipped:T('bỏ qua','skipped')} as any)[k]||k)+': '+v).join(' · ')||'0')}</dd></dl>
 </section>
 ${remoteHtml(devRows)}
 <section class="card" aria-labelledby="sc-ret"><h2 id="sc-ret">${T('Sức khỏe trình đọc theo cửa hàng','Parser health per retailer')}</h2>
  ${table([{label:T('Cửa hàng','Retailer'),render:(r:any)=>esc(r.label)},{label:T('Trạng thái','Status'),render:(r:any)=>r.paused?chip('red',r.reason==='parser-breakage'?T('Tự dừng: trình đọc lỗi','Auto-paused: parser breakage'):r.reason==='blocked-network'?T('Tự dừng: bị chặn','Auto-paused: blocked'):T('Tạm dừng','Paused'))+(r.until?` <small class="muted">${T('đến','until')} ${esc(when(r.until))}</small>`:''):chip('green',T('Hoạt động','Active'))},{label:T('Tỉ lệ đọc được','Parse success'),render:(r:any)=>esc(pct(r.successRate))+` <small class="muted">(${r.samples})</small>`},{label:T('Hôm nay','Today'),render:(r:any)=>esc(T(`${r.today.pages} trang · ${r.today.prices} giá · ${r.today.parseFail} lỗi · ${r.today.blocked} chặn · ${r.today.robots} robots`,`${r.today.pages} pages · ${r.today.prices} prices · ${r.today.parseFail} failed · ${r.today.blocked} blocked · ${r.today.robots} robots`))},{label:T('Giới hạn/ngày','Daily cap'),render:(r:any)=>esc(r.today.leased+' / '+r.cap)},{label:'',render:(r:any)=>`<button class="btn small" type="button" data-ret="${r.retailer}" data-act="${r.paused?'resume':'pause'}">${r.paused?T('Tiếp tục','Resume'):T('Tạm dừng','Pause')}</button>`}],data.retailers,T('Cửa hàng','Retailers'))}
 </section>
 <section class="card" aria-labelledby="sc-dev"><h2 id="sc-dev">${T('Thiết bị','Devices')} <small class="muted">(${devRows.length}${revoked?' · '+T('đã thu hồi','revoked')+' '+revoked:''})</small></h2>
  ${table([{label:T('Máy','Device'),render:(d:any)=>`<strong>${esc(d.name)}</strong><br><small class="muted">${esc(d.owner)}${d.version?' · v'+esc(d.version):''}${d.configVersion?' · '+esc(T('cấu hình','config'))+' '+esc(d.configVersion):''}</small>`},{label:T('Khu vực','Location'),render:(d:any)=>esc([d.suburb,d.postcode].filter(Boolean).join(' ')||'—')},{label:T('Cửa hàng','Stores'),render:(d:any)=>Object.entries(d.stores).map(([r,l]:any)=>`${esc(LABEL[r])}: ${esc(l)}${d.storeMismatch?.[r]?' <span class="alert" title="'+esc(T('Trang hiển thị cửa hàng khác','Site shows another store'))+'">!</span>':''}`).join('<br>')||'—'},{label:T('Lần chạy trước','Last run'),render:(d:any)=>esc(when(d.lastRunAt))+`<br><small class="muted">${T('liên lạc','seen')} ${esc(when(d.lastHeartbeat))}</small>`},{label:T('Trang / giá','Pages / prices'),render:(d:any)=>esc(d.pages+' / '+d.prices)+`<br><small class="muted">${T('hôm nay','today')} ${d.today.pages} / ${d.today.prices}</small>`},{label:T('Đọc được','Success'),render:(d:any)=>esc(pct(d.successRate))},{label:T('Bị chặn','Blocked'),render:(d:any)=>d.blocked?`<span class="alert">${d.blocked}</span>`:'0'},{label:T('Trạng thái','Status'),render:(d:any)=>statusChip(d.status)+'<br>'+(d.autoAllowed?chip('green',T('Được chạy tự động','Auto allowed')):chip('amber',T('Chưa cho tự động','Auto not allowed')))+(d.signedInWarning?.length?'<br>'+chip('red',T('Đang đăng nhập: ','Signed in: ')+d.signedInWarning.map((r:string)=>LABEL[r]).join(', ')):'')},{label:'',render:(d:any)=>`<div class="switchrow"><button class="btn small" type="button" data-dev="${d.id}" data-act="${d.autoAllowed?'deny-auto':'allow-auto'}">${d.autoAllowed?T('Không cho tự động','Disallow auto'):T('Cho phép tự động','Allow auto')}</button><button class="btn small" type="button" data-dev="${d.id}" data-act="${d.status==='active'?'pause':'resume'}">${d.status==='active'?T('Tạm dừng','Pause'):T('Tiếp tục','Resume')}</button><button class="btn small danger" type="button" data-dev="${d.id}" data-act="revoke">${T('Thu hồi','Revoke')}</button></div>`}],devRows,T('Thiết bị','Devices'))}
 </section>
 <section class="card" aria-labelledby="sc-cov"><h2 id="sc-cov">${T('Độ phủ (7 ngày)','Coverage (7 days)')}</h2>
  ${cov&&cov.rows.length?`<div class="covw" tabindex="0" role="region" aria-label="${T('Độ phủ','Coverage')}"><table class="cov"><caption class="sr-only">${T('Mặt hàng × cửa hàng','Items × stores')}</caption><thead><tr><th scope="col">${T('Mặt hàng','Item')}</th>${cov.columns.map((c:string)=>`<th scope="col">${esc(c)}</th>`).join('')}</tr></thead><tbody>${cov.rows.map((r:any)=>`<tr><th scope="row">${esc(r.name)}</th>${cov.columns.map((c:string)=>{const cell=r.cells[c];if(!cell)return `<td class="f2">—</td>`;const age=Math.floor((Date.now()-Date.parse(cell.at))/864e5);return `<td class="${age<=2?'f0':age<=5?'f1':'f2'}" data-captured="${esc(cell.at)}">${esc(capRel(cell.at))}<br><small>${esc(capAbs(cell.at))}</small></td>`}).join('')}</tr>`).join('')}</tbody></table></div><p class="muted">${T('Xanh: ≤2 ngày · vàng: 3–5 ngày · đỏ: cũ hoặc chưa có.','Green: ≤2 days · amber: 3–5 days · red: stale or missing.')}</p>`:`<p class="empty">${T('Chưa có kết quả tự động nào.','No auto results yet.')}</p>`}
 </section>
 <div class="scout-grid">
 <section class="card" aria-labelledby="sc-set"><h2 id="sc-set">${T('Giới hạn & lịch mặc định','Caps & default schedule')}</h2>
  <form id="sc-form" class="form">
   <div class="fields"><label>${T('Trang mỗi lần chạy (mỗi máy)','Pages per run (per device)')}<input type="number" name="run" min="1" max="200" value="${s.caps.devicePagesPerRun}"></label><label>${T('Trang mỗi ngày (mỗi máy)','Pages per day (per device)')}<input type="number" name="day" min="1" max="600" value="${s.caps.devicePagesPerDay}"></label>
   <label>${T('Nhịp mặc định (một trang mỗi lần)','Default pace (one page at a time)')}<select name="pace">${Object.entries(PACES()).map(([k,v])=>`<option value="${k}" ${presetOf(s.pacing)===k?'selected':''}>${esc(v)}</option>`).join('')}<option value="custom" ${presetOf(s.pacing)==='custom'?'selected':''}>${T('Tùy chỉnh','Custom')}</option></select></label>
   <label>${T('Tùy chỉnh: tối thiểu (giây, ≥3)','Custom: min (seconds, ≥3)')}<input type="number" name="pmin" min="3" max="120" value="${Math.round(s.pacing.minMs/1000)}"></label><label>${T('Tùy chỉnh: tối đa (giây)','Custom: max (seconds)')}<input type="number" name="pmax" min="3" max="180" value="${Math.round(s.pacing.maxMs/1000)}"></label>
   <label>${T('Ngưỡng tự dừng (tỉ lệ đọc được %)','Auto-pause below (parse success %)')}<input type="number" name="thr" min="10" max="95" value="${Math.round(s.parser.minSuccess*100)}"></label><label>${T('Số mẫu tối thiểu','Minimum samples')}<input type="number" name="smp" min="5" max="200" value="${s.parser.minSamples}"></label></div>
   <fieldset><legend>${T('Giới hạn cả mạng mỗi cửa hàng mỗi ngày','Network cap per retailer per day')}</legend><div class="fields">${RET.map(r=>`<label>${LABEL[r]}<input type="number" name="cap-${r}" min="0" max="3000" value="${s.caps.retailerPagesPerDay[r]??0}"></label>`).join('')}</div></fieldset>
   <fieldset><legend>${T('Khung giờ mặc định (giờ của từng máy)','Default windows (each device’s local time)')}</legend>${s.schedule.map((w:any,i:number)=>`<div class="win" role="group" aria-label="${T('Khung','Window')} ${i+1}">${days().map((d:string,k:number)=>`<label class="d"><input type="checkbox" name="w${i}d" value="${k}" ${w.days.includes(k)?'checked':''}>${d}</label>`).join('')}<label>${T('Từ','From')} <input type="time" name="w${i}s" value="${esc(w.start)}"></label><label>${T('Đến','To')} <input type="time" name="w${i}e" value="${esc(w.end)}"></label></div>`).join('')}</fieldset>
   <div class="row"><button class="btn primary" type="submit">${T('Lưu','Save')}</button></div>
  </form>
 </section>
 <section class="card" aria-labelledby="sc-inst"><h2 id="sc-inst">${T('Cài từ cửa hàng tiện ích','Store install links')}</h2>
  <p class="muted">${T('Khi tiện ích đã được duyệt trên Chrome Web Store / Edge Add-ons, dán đường dẫn trang tiện ích vào đây. Bếp của tôi sẽ hiện nút “Cài từ Chrome Web Store” (cài một chạm, không cần chế độ nhà phát triển). Nhớ thêm mã tiện ích của bản cửa hàng vào SCOUT_EXTENSION_IDS.','Once the extension is approved on the Chrome Web Store / Edge Add-ons, paste its listing link here. My kitchen then shows an “Install from Chrome Web Store” button (one click, no Developer mode). Also add the store build’s extension id to SCOUT_EXTENSION_IDS.')}</p>
  <form id="sc-install" class="form"><div class="fields"><label>Chrome Web Store<input type="url" name="chrome" maxlength="300" placeholder="https://chromewebstore.google.com/detail/…" value="${esc(s.install?.chrome||'')}" ${data.installInfo?.envStoreUrl?'disabled':''}></label><label>Edge Add-ons<input type="url" name="edge" maxlength="300" placeholder="https://microsoftedge.microsoft.com/addons/detail/…" value="${esc(s.install?.edge||'')}" ${data.installInfo?.envEdgeStoreUrl?'disabled':''}></label></div>
  ${data.installInfo?.envStoreUrl||data.installInfo?.envEdgeStoreUrl?`<p class="note">${T('Một đường dẫn đang được đặt bằng biến môi trường (SCOUT_STORE_URL / SCOUT_EDGE_STORE_URL) và được ưu tiên.','A link is set by an environment variable (SCOUT_STORE_URL / SCOUT_EDGE_STORE_URL) and takes priority.')}</p>`:''}
  <p class="muted">${T('Mã tiện ích được nhận:','Extension ids accepted:')} <code>${esc((data.installInfo?.extensionIds||[]).join(', '))}</code></p>
  <div class="row"><button class="btn primary" type="submit">${T('Lưu đường dẫn','Save links')}</button></div></form>
 </section>
 <section class="card" aria-labelledby="sc-tr"><h2 id="sc-tr">${T('Người dò giá tin cậy','Trusted price checkers')}</h2>
  <p class="muted">${T('Giá từ người dò tin cậy được xác nhận ngay; người khác cần đồng thuận cộng đồng. Chủ Studio luôn được tin cậy.','Prices from trusted price checkers are confirmed immediately; others go through community consensus. Studio owners are always trusted.')}</p>
  <ul class="plain">${data.trusted.map((t:any)=>`<li>${esc(t.username)} <small class="muted">${esc(when(t.at))}</small> <button class="btn small" type="button" data-untrust="${esc(t.username)}">${T('Bỏ','Remove')}</button></li>`).join('')||`<li class="muted">${T('Chưa có.','None yet.')}</li>`}</ul>
  <form id="sc-trust" class="row" style="margin-top:8px"><label>${T('Tên tài khoản','Username')} <input type="text" name="u" required minlength="3" maxlength="40" autocomplete="off" spellcheck="false"></label><button class="btn" type="submit">${T('Thêm','Add')}</button></form>
 </section>
 </div>
 <section class="card" aria-labelledby="sc-ev"><h2 id="sc-ev">${T('Nhật ký sự kiện','Event log')}</h2>
  <ul class="ev">${data.events.map((e:any)=>`<li>${e.alert?'<span class="alert">⚠ </span>':''}<strong>${esc(evName(e.type))}</strong> · ${esc(when(e.at))}${e.retailer?' · '+esc(LABEL[e.retailer]||e.retailer):''}${e.deviceId?' · '+esc(e.deviceId):''}${e.kind?' · '+esc(e.kind):''}</li>`).join('')||`<li class="muted">${T('Chưa có sự kiện.','No events yet.')}</li>`}</ul>
 </section>`;
 wire();navLink();
}
const evName=(t:string)=>({run_finished:T('Chạy xong','Run finished'),run_now:T('Chạy ngay','Run now'),command_queued:T('Gửi lệnh','Command sent'),command_done:T('Lệnh xong','Command done'),command_failed:T('Lệnh lỗi','Command failed'),pace_backoff:T('Tự chậm lại (Bình thường hôm nay)','Slowed down (Normal for today)'),device_offline:T('Mất liên lạc trong khung giờ','Offline during window'),device_paired:T('Ghép nối máy','Device paired'),device_revoked:T('Thu hồi máy','Device revoked'),device_blocked:T('Máy bị chặn — tạm dừng 24 giờ','Device blocked — paused 24 h'),parser_breakage:T('Trình đọc lỗi — tự dừng cửa hàng','Parser breakage — retailer auto-paused'),retailer_paused:T('Tạm dừng cửa hàng','Retailer paused'),retailer_resumed:T('Tiếp tục cửa hàng','Retailer resumed'),disagreement_hold:T('Giá lệch giữa các máy — giữ lại','Devices disagree — held')} as any)[t]||t;
function wire(){
 $('#sc-code-form',host).onsubmit=async(e:any)=>{e.preventDefault();const r=await act('studio-pair-code',{username:e.target.u.value},T('Đã tạo mã ghép nối.','Pairing code created.'));if(r){code=r;render()}};
 $('#sc-ext-add',host).onsubmit=(e:any)=>{e.preventDefault();act('studio-extension-users',{username:e.target.u.value.trim().toLowerCase(),grant:true},T('Đã cho phép tài khoản dùng tiện ích.','Account allowed to use the extension.'))};
 for(const b of host.querySelectorAll('[data-ext-remove]'))b.onclick=()=>{if(!confirm(T('Bỏ quyền dùng tiện ích của '+b.dataset.extRemove+'? Các máy của tài khoản này ngừng ngay.','Remove '+b.dataset.extRemove+' from the extension? Their computers stop at once.')))return;act('studio-extension-users',{username:b.dataset.extRemove,grant:false},T('Đã bỏ quyền.','Access removed.'))};
 {let t:any=null;const inp=$('#sc-ext-add input',host),dl=$('#sc-ext-found',host);if(inp&&dl)inp.oninput=()=>{clearTimeout(t);const q=inp.value.trim();if(q.length<2)return;t=setTimeout(async()=>{try{const r=await fetch('/.netlify/functions/studio?op=accounts&size=10&q='+encodeURIComponent(q),{credentials:'same-origin',headers:{Accept:'application/json'}});if(!r.ok)return;const d=await r.json();dl.innerHTML=(d.rows||[]).map((x:any)=>`<option value="${esc(x.username)}">${esc(x.name||'')}</option>`).join('')}catch{}},250)}}
 $('#sc-auto',host).onclick=()=>{const on=data.settings.autoScout!=='on';if(on&&!confirm(T('Bật chế độ tự động cho cả mạng? Từng máy vẫn cần được cho phép và người dùng phải tự bật.','Switch Auto on network-wide? Each device still needs your approval and the user must switch it on.')))return;act('studio-network',{patch:{autoScout:on?'on':'off'}},on?T('Đã bật tự động.','Auto switched on.'):T('Đã tắt tự động.','Auto switched off.'))};
 $('#sc-semi',host).onclick=()=>{const on=data.settings.semiAuto!=='on';act('studio-network',{patch:{semiAuto:on?'on':'off'}},T('Đã lưu.','Saved.'))};
 $('#sc-pause',host).onclick=()=>{const p=!data.settings.paused;act('studio-network',{patch:{paused:p}},p?T('Đã tạm dừng cả mạng.','Network paused.'):T('Mạng đã chạy lại.','Network resumed.'))};
 for(const b of host.querySelectorAll('[data-ret]'))b.onclick=()=>act('studio-retailer',{retailer:b.dataset.ret,action:b.dataset.act},T('Đã lưu.','Saved.'));
 for(const b of host.querySelectorAll('[data-dev]'))b.onclick=()=>{const id=b.dataset.dev,a=b.dataset.act;if(a==='revoke'){const why=prompt(T('Lý do thu hồi (ghi vào nhật ký kiểm tra):','Reason for revoking (written to the audit log):'));if(!why||why.trim().length<3)return;act('studio-revoke',{deviceId:id,reason:why},T('Đã thu hồi máy.','Device revoked.'));return}act('studio-device',{deviceId:id,action:a},T('Đã lưu.','Saved.'))};
 for(const b of host.querySelectorAll('[data-untrust]'))b.onclick=()=>act('studio-trusted',{username:b.dataset.untrust,grant:false},T('Đã bỏ quyền tin cậy.','Trusted price checker removed.'));
 for(const b of host.querySelectorAll('[data-cmd]'))b.onclick=async()=>{const type=b.dataset.cmd;if(type==='run-now'&&!confirm(T('Chạy ngay máy này (ngoài khung giờ, mọi giới hạn vẫn áp dụng)?','Run this computer now (outside the schedule; all limits still apply)?')))return;await act('studio-command',{deviceId:b.dataset.id,type},T('Đã gửi lệnh. Đang chờ máy nhận lệnh…','Command sent. Waiting for the computer…'));startLive()};
 for(const sel of host.querySelectorAll('[data-pace-dev]'))sel.onchange=async()=>{await act('studio-command',{deviceId:sel.dataset.paceDev,type:'pace',args:{pacing:sel.value||null}},T('Đã đổi nhịp.','Pace changed.'));startLive()};
 const all=$('#sc-runall',host);if(all)all.onclick=async()=>{if(!confirm(T('Chạy ngay mọi máy được phép?','Run now on every allowed computer?')))return;await act('studio-run-now',{all:true},T('Đã gửi lệnh chạy ngay.','Run now sent.'));startLive()};
 for(const det of host.querySelectorAll('details[data-tl]'))det.ontoggle=async()=>{const id=det.dataset.tl;if(!det.open){delete tl[id];return}if(tl[id])return;try{tl[id]=(await get('studio-device-timeline&deviceId='+encodeURIComponent(id))).events;render()}catch(e:any){toast(e.message,true)}};
 $('#sc-notify',host).onsubmit=(e:any)=>{e.preventDefault();const f=e.target,notify:any={offlineHours:parseInt(f.offlineHours.value,10)||3};for(const k of ['runFinished','blocked','offline','parserBreakage'])notify[k]=!!f[k].checked;act('studio-network',{patch:{notify}},T('Đã lưu thông báo.','Notifications saved.'))};
 $('#sc-install',host).onsubmit=(e:any)=>{e.preventDefault();const f=e.target,install:any={};for(const k of ['chrome','edge'])if(!f[k].disabled)install[k]=f[k].value.trim()||null;act('studio-network',{patch:{install}},T('Đã lưu đường dẫn cài đặt.','Install links saved.'))};
 $('#sc-trust',host).onsubmit=(e:any)=>{e.preventDefault();act('studio-trusted',{username:e.target.u.value.trim().toLowerCase(),grant:true},T('Đã thêm người dò giá tin cậy.','Trusted price checker added.'))};
 $('#sc-form',host).onsubmit=(e:any)=>{e.preventDefault();const f=e.target,n=(k:string)=>parseInt(f[k].value,10),s=data.settings;
  const schedule=s.schedule.map((_:any,i:number)=>({days:[...f.querySelectorAll(`input[name=w${i}d]:checked`)].map((x:any)=>+x.value),start:f[`w${i}s`].value,end:f[`w${i}e`].value})).filter((w:any)=>w.days.length);
  const retailerPagesPerDay:any={};for(const r of RET)retailerPagesPerDay[r]=n('cap-'+r);
  act('studio-network',{patch:{caps:{devicePagesPerRun:n('run'),devicePagesPerDay:n('day'),retailerPagesPerDay},pacing:f.pace.value==='custom'?{minMs:n('pmin')*1000,maxMs:Math.max(n('pmin'),n('pmax'))*1000}:PACE_MS[f.pace.value],parser:{minSuccess:n('thr')/100,minSamples:n('smp')},schedule}},T('Đã lưu giới hạn và lịch.','Caps and schedule saved.'))};
}
// While a command is waiting or a run is going, refresh the live status every 15 s.
let live:any=null;
function startLive(){if(live)return;live=setInterval(async()=>{if(!host.isConnected||document.hidden){if(!host.isConnected){clearInterval(live);live=null}return}const busyNow=(data?.devices||[]).some((d:any)=>d.live?.state==='running'||(d.live?.commands||[]).some((c:any)=>c.status==='pending'||c.status==='received'));
 if(!busyNow){clearInterval(live);live=null;return}if(document.activeElement&&host.contains(document.activeElement)&&document.activeElement.matches('select,input'))return;try{data=await get('studio-overview');render()}catch{}},15000)}
async function load(){try{[data,cov]=await Promise.all([get('studio-overview'),get('studio-coverage')]);if(host.isConnected)render()}catch(e:any){if(host.isConnected)host.innerHTML=`<div class="card notice"><h1 id="scout-h1" tabindex="-1">${T('Không tải được','Could not load')}</h1><p>${esc(e.message)}</p></div>`}}
// ---------- Studio → Settings: "Auto Scout" platform setting (flags.autoScout, off by default) ----------
async function autoScoutCard(el:any){
 const card=document.createElement('section');card.className='card';card.id='scout-auto-setting';card.setAttribute('aria-labelledby','scout-auto-h');
 const f=el.querySelector('#sf');if(f)f.after(card);else el.appendChild(card);await fillAuto(card)}
async function fillAuto(card:any){
 card.innerHTML=`<h2 id="scout-auto-h">${T('So Giá tự động','Automatic price check')}</h2><p class="muted">…</p>`;
 let a:any;try{a=await get('studio-auto')}catch(e:any){card.innerHTML=`<h2 id="scout-auto-h">${T('So Giá tự động','Automatic price check')}</h2><p class="muted">${esc(e.message)}</p>`;return}
 const on=a.autoScout==='on',env=a.source==='env';
 card.innerHTML=`<h2 id="scout-auto-h">${T('So Giá tự động','Automatic price check')}</h2>
 <p class="muted">${T('Tắt mặc định. Khi tắt, máy chủ từ chối mọi việc tự động; chế độ bán tự động (trang người dùng tự mở) không bị ảnh hưởng. Từng máy vẫn cần được cho phép trong Mạng So Giá.','Off by default. While off, the server refuses every Auto task; semi-auto (pages a person opens) is unaffected. Each device still needs approval in Price Check network.')}</p>
 <form id="scout-auto-form" class="form"><label class="check"><input type="checkbox" name="on" ${on?'checked':''} ${env?'disabled':''}> <span>${T('Cho phép So Giá tự động trên toàn mạng','Allow automatic price check network-wide')} <span class="src ${env?'env':a.source==='default'?'default':'stored'}">${env?T('biến môi trường','environment'):a.source==='default'?T('mặc định','default'):T('đã lưu','stored')}</span></span></label>
 <div class="row"><button class="btn primary" type="submit" ${env?'disabled':''}>${T('Lưu','Save')}</button> <a class="btn" href="#scout">${T('Mở Mạng So Giá','Open Price Check network')}</a></div></form>`;
 $('#scout-auto-form',card).onsubmit=async(e:any)=>{e.preventDefault();const want=!!e.target.on.checked;if(want&&!confirm(T('Bật chế độ tự động cho cả mạng? Từng máy vẫn cần được cho phép và người dùng phải tự bật.','Switch Auto on network-wide? Each device still needs your approval and the user must switch it on.')))return;try{await post('studio-network',{patch:{autoScout:want?'on':'off'}});toast(want?T('Đã bật tự động.','Auto switched on.'):T('Đã tắt tự động.','Auto switched off.'));fillAuto(card)}catch(x:any){toast(x.message,true)}};
}
if(registry){
 registry.scout={vi:'Mạng So Giá',en:'Price Check network',icon:'◎',async render(el:any){el.innerHTML='';el.appendChild(host);render();await load()}};
 const settings=registry.settings;if(settings&&typeof settings.render==='function'){const orig=settings.render;settings.render=async function(this:any,el:any){await orig.call(this,el);try{await autoScoutCard(el)}catch{}}}
}else{
 async function show(focus=false){const on=location.hash==='#scout';host.hidden=!on;$('#main').hidden=on;navLink();if(on){render();await load();if(focus)$('#scout-h1',host)?.focus?.()}}
 addEventListener('hashchange',()=>show(true));
 document.getElementById('lang')?.addEventListener('click',()=>setTimeout(()=>{if(location.hash==='#scout')render();navLink()},0));
 show();
}
})();
