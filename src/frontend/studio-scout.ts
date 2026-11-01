// Studio · Scout network panel (FamTray Scout). Separate classic script loaded by
// dist/studio.html after studio.js. studio.ts has no page-registration hook, so this
// adds a "Scout" nav link and renders its own <main id="scout-main"> at #scout,
// hiding Studio's #main while it is shown.
// TODO(merge): when studio.ts exposes a page registry, register {scout:{vi,en,icon,render}}
// instead of the MutationObserver/own-container approach below.
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
#scout-main .note{border-left:4px solid var(--warn);padding:8px 12px;background:var(--warnbg);border-radius:8px;margin:0 0 12px}`;
const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);

// ---------- container + nav ----------
const host=document.createElement('main');host.id='scout-main';host.className='main';host.tabIndex=-1;host.hidden=true;host.setAttribute('aria-labelledby','scout-h1');
$('#main').after(host);
function navLink(){const nav=$('#nav');if(!nav||!nav.children.length)return;let a=$('a[href="#scout"]',nav);const on=location.hash==='#scout';
 if(!a){a=document.createElement('a');a.href='#scout';nav.appendChild(a)}
 const label=`<span aria-hidden="true">◎</span>${esc(T('Mạng Scout','Scout network'))}`;if(a.innerHTML!==label)a.innerHTML=label;
 if(on){a.setAttribute('aria-current','page');for(const x of nav.querySelectorAll('a[aria-current]'))if(x!==a)x.removeAttribute('aria-current')}else a.removeAttribute('aria-current')}
new MutationObserver(navLink).observe($('#nav'),{childList:true,subtree:true,characterData:true});

// ---------- API ----------
async function handle(r:Response){let d:any={};try{d=await r.json()}catch{}if(!r.ok){const e:any=new Error(lang()==='en'?d.errorEn||d.error||'Request failed':d.error||d.errorEn||'Lỗi');e.status=r.status;e.data=d;throw e}return d}
const get=(op:string)=>fetch(API+'?op='+op,{credentials:'same-origin',headers:{Accept:'application/json'}}).then(handle);
async function post(op:string,body:any){if(!csrf)csrf=(await fetch(STUDIO+'?op=me',{credentials:'same-origin'}).then(handle)).csrf;return fetch(API+'?op='+op,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','x-studio-csrf':csrf},body:JSON.stringify(body)}).then(handle)}
function toast(msg:string,bad=false){const t=$('#toast');if(!t)return;t.textContent=msg;t.className='toast show'+(bad?' bad':'');clearTimeout((toast as any).t);(toast as any).t=setTimeout(()=>t.className='toast',4200)}
async function act(op:string,body:any,ok:string){if(busy)return;busy=true;try{const r=await post(op,body);toast(ok);await load();return r}catch(e:any){toast(e.message,true)}finally{busy=false}}

// ---------- render ----------
const chip=(cls:string,label:string)=>`<span class="chip ${cls}">${esc(label)}</span>`;
const statusChip=(s:string)=>s==='active'?chip('green',T('Hoạt động','Active')):s==='blocked'?chip('red',T('Bị chặn — tạm dừng 24 giờ','Blocked — paused 24 h')):s==='paused'?chip('amber',T('Tạm dừng','Paused')):chip('red',T('Đã thu hồi','Revoked'));
function table(cols:any[],rows:any[],caption:string){if(!rows.length)return `<p class="empty">${T('Chưa có dữ liệu.','Nothing here yet.')}</p>`;return `<div class="tw"><table class="rt"><caption class="sr-only">${esc(caption)}</caption><thead><tr>${cols.map(c=>`<th scope="col">${esc(c.label)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${cols.map(c=>`<td data-label="${esc(c.label)}"><div>${c.render(r)}</div></td>`).join('')}</tr>`).join('')}</tbody></table></div>`}
function render(){
 if(!data){host.innerHTML=`<header class="page-head"><div><h1 id="scout-h1" tabindex="-1">${T('Mạng Scout','Scout network')}</h1><p class="muted">…</p></div></header>`;return}
 const s=data.settings,auto=s.autoScout==='on',semi=s.semiAuto==='on';
 const devRows=data.devices.filter((d:any)=>d.status!=='revoked'),revoked=data.devices.length-devRows.length;
 host.innerHTML=`
 <header class="page-head"><div><h1 id="scout-h1" tabindex="-1">${T('Mạng Scout','Scout network')}</h1>
  <p class="muted">${T('Tiện ích FamTray Scout trên máy tính của các gia đình: ghi giá trên trang họ xem (bán tự động) và, khi bạn cho phép, chạy tự động theo lịch với nhịp chậm như người dùng.','The FamTray Scout extension on family computers: captures prices on pages they view (semi-auto) and, when you allow it, runs on a schedule at a human pace.')}</p></div>
  <div class="row switchrow"><button class="btn primary" id="sc-code" type="button">${T('Tạo mã ghép nối','Create pairing code')}</button></div></header>
 ${code?`<section class="card" aria-live="polite"><h2>${T('Mã ghép nối (dùng một lần, 15 phút)','Pairing code (one-time, 15 minutes)')}</h2><p class="code">${esc(code.code.slice(0,4)+'-'+code.code.slice(4))}</p><dl class="kv"><dt>${T('Địa chỉ ứng dụng','App address')}</dt><dd>${esc(location.origin)}</dd><dt>${T('Hết hạn','Expires')}</dt><dd>${esc(when(code.expires))}</dd></dl></section>`:''}
 <section class="card" aria-labelledby="sc-sw"><h2 id="sc-sw">${T('Công tắc','Switches')}</h2>
  ${!auto?`<p class="note">${T('Chế độ tự động đang TẮT cho cả mạng (mặc định). Máy chỉ nhận việc khi bạn bật ở đây, cho phép từng máy, VÀ người dùng bật trên máy đó.','Auto mode is OFF network-wide (default). A device only gets tasks when you switch it on here, allow that device, AND the user switches it on there.')}</p>`:''}
  <div class="switchrow">
   <button class="btn ${auto?'danger':'primary'}" id="sc-auto" type="button" aria-pressed="${auto}">${auto?T('Tắt chế độ tự động','Switch Auto off'):T('Bật chế độ tự động','Switch Auto on')}</button>
   <button class="btn" id="sc-semi" type="button" aria-pressed="${semi}">${semi?T('Tắt bán tự động','Switch semi-auto off'):T('Bật bán tự động','Switch semi-auto on')}</button>
   <button class="btn ${s.paused?'primary':'danger'}" id="sc-pause" type="button" aria-pressed="${!!s.paused}">${s.paused?T('▶ Tiếp tục cả mạng','▶ Resume network'):T('⏸ Tạm dừng cả mạng','⏸ Pause whole network')}</button>
  </div>
  <dl class="kv" style="margin-top:10px"><dt>${T('Tự động','Auto')}</dt><dd>${auto?chip('green',T('Bật','On')):chip('amber',T('Tắt','Off'))}</dd><dt>${T('Bán tự động','Semi-auto')}</dt><dd>${semi?chip('green',T('Bật','On')):chip('amber',T('Tắt','Off'))}</dd><dt>${T('Toàn mạng','Network')}</dt><dd>${s.paused?chip('red',T('Tạm dừng','Paused')):chip('green',T('Đang chạy','Running'))}</dd><dt>robots.txt</dt><dd>${T('Luôn tôn trọng (không tắt được)','Always respected (cannot be switched off)')}</dd><dt>${T('Cấu hình trình đọc','Parser config')}</dt><dd>${esc(data.configVersion||'—')}</dd><dt>${T('Việc hôm nay','Tasks today')}</dt><dd>${esc(Object.entries(data.tasks.byStatus).map(([k,v])=>(({queued:T('chờ','queued'),leased:T('đang làm','leased'),done:T('xong','done'),skipped:T('bỏ qua','skipped')} as any)[k]||k)+': '+v).join(' · ')||'0')}</dd></dl>
 </section>
 <section class="card" aria-labelledby="sc-ret"><h2 id="sc-ret">${T('Sức khỏe trình đọc theo cửa hàng','Parser health per retailer')}</h2>
  ${table([{label:T('Cửa hàng','Retailer'),render:(r:any)=>esc(r.label)},{label:T('Trạng thái','Status'),render:(r:any)=>r.paused?chip('red',r.reason==='parser-breakage'?T('Tự dừng: trình đọc lỗi','Auto-paused: parser breakage'):r.reason==='blocked-network'?T('Tự dừng: bị chặn','Auto-paused: blocked'):T('Tạm dừng','Paused'))+(r.until?` <small class="muted">${T('đến','until')} ${esc(when(r.until))}</small>`:''):chip('green',T('Hoạt động','Active'))},{label:T('Tỉ lệ đọc được','Parse success'),render:(r:any)=>esc(pct(r.successRate))+` <small class="muted">(${r.samples})</small>`},{label:T('Hôm nay','Today'),render:(r:any)=>esc(T(`${r.today.pages} trang · ${r.today.prices} giá · ${r.today.parseFail} lỗi · ${r.today.blocked} chặn · ${r.today.robots} robots`,`${r.today.pages} pages · ${r.today.prices} prices · ${r.today.parseFail} failed · ${r.today.blocked} blocked · ${r.today.robots} robots`))},{label:T('Giới hạn/ngày','Daily cap'),render:(r:any)=>esc(r.today.leased+' / '+r.cap)},{label:'',render:(r:any)=>`<button class="btn small" type="button" data-ret="${r.retailer}" data-act="${r.paused?'resume':'pause'}">${r.paused?T('Tiếp tục','Resume'):T('Tạm dừng','Pause')}</button>`}],data.retailers,T('Cửa hàng','Retailers'))}
 </section>
 <section class="card" aria-labelledby="sc-dev"><h2 id="sc-dev">${T('Thiết bị','Devices')} <small class="muted">(${devRows.length}${revoked?' · '+T('đã thu hồi','revoked')+' '+revoked:''})</small></h2>
  ${table([{label:T('Máy','Device'),render:(d:any)=>`<strong>${esc(d.name)}</strong><br><small class="muted">${esc(d.owner)}${d.version?' · v'+esc(d.version):''}</small>`},{label:T('Khu vực','Location'),render:(d:any)=>esc([d.suburb,d.postcode].filter(Boolean).join(' ')||'—')},{label:T('Cửa hàng','Stores'),render:(d:any)=>Object.entries(d.stores).map(([r,l]:any)=>`${esc(LABEL[r])}: ${esc(l)}${d.storeMismatch?.[r]?' <span class="alert" title="'+esc(T('Trang hiển thị cửa hàng khác','Site shows another store'))+'">!</span>':''}`).join('<br>')||'—'},{label:T('Lần chạy trước','Last run'),render:(d:any)=>esc(when(d.lastRunAt))+`<br><small class="muted">${T('liên lạc','seen')} ${esc(when(d.lastHeartbeat))}</small>`},{label:T('Trang / giá','Pages / prices'),render:(d:any)=>esc(d.pages+' / '+d.prices)+`<br><small class="muted">${T('hôm nay','today')} ${d.today.pages} / ${d.today.prices}</small>`},{label:T('Đọc được','Success'),render:(d:any)=>esc(pct(d.successRate))},{label:T('Bị chặn','Blocked'),render:(d:any)=>d.blocked?`<span class="alert">${d.blocked}</span>`:'0'},{label:T('Trạng thái','Status'),render:(d:any)=>statusChip(d.status)+'<br>'+(d.autoAllowed?chip('green',T('Được chạy tự động','Auto allowed')):chip('amber',T('Chưa cho tự động','Auto not allowed')))+(d.signedInWarning?.length?'<br>'+chip('red',T('Đang đăng nhập: ','Signed in: ')+d.signedInWarning.map((r:string)=>LABEL[r]).join(', ')):'')},{label:'',render:(d:any)=>`<div class="switchrow"><button class="btn small" type="button" data-dev="${d.id}" data-act="${d.autoAllowed?'deny-auto':'allow-auto'}">${d.autoAllowed?T('Không cho tự động','Disallow auto'):T('Cho phép tự động','Allow auto')}</button><button class="btn small" type="button" data-dev="${d.id}" data-act="${d.status==='active'?'pause':'resume'}">${d.status==='active'?T('Tạm dừng','Pause'):T('Tiếp tục','Resume')}</button><button class="btn small danger" type="button" data-dev="${d.id}" data-act="revoke">${T('Thu hồi','Revoke')}</button></div>`}],devRows,T('Thiết bị','Devices'))}
 </section>
 <section class="card" aria-labelledby="sc-cov"><h2 id="sc-cov">${T('Độ phủ (7 ngày)','Coverage (7 days)')}</h2>
  ${cov&&cov.rows.length?`<div class="covw" tabindex="0" role="region" aria-label="${T('Độ phủ','Coverage')}"><table class="cov"><caption class="sr-only">${T('Mặt hàng × cửa hàng','Items × stores')}</caption><thead><tr><th scope="col">${T('Mặt hàng','Item')}</th>${cov.columns.map((c:string)=>`<th scope="col">${esc(c)}</th>`).join('')}</tr></thead><tbody>${cov.rows.map((r:any)=>`<tr><th scope="row">${esc(r.name)}</th>${cov.columns.map((c:string)=>{const cell=r.cells[c];if(!cell)return `<td class="f2">—</td>`;const age=Math.floor((Date.now()-Date.parse(cell.at))/864e5);return `<td class="${age<=2?'f0':age<=5?'f1':'f2'}">${age===0?T('hôm nay','today'):esc(T(age+' ngày',age+' d'))}</td>`}).join('')}</tr>`).join('')}</tbody></table></div><p class="muted">${T('Xanh: ≤2 ngày · vàng: 3–5 ngày · đỏ: cũ hoặc chưa có.','Green: ≤2 days · amber: 3–5 days · red: stale or missing.')}</p>`:`<p class="empty">${T('Chưa có kết quả tự động nào.','No auto results yet.')}</p>`}
 </section>
 <div class="scout-grid">
 <section class="card" aria-labelledby="sc-set"><h2 id="sc-set">${T('Giới hạn & lịch mặc định','Caps & default schedule')}</h2>
  <form id="sc-form" class="form">
   <div class="fields"><label>${T('Trang mỗi lần chạy (mỗi máy)','Pages per run (per device)')}<input type="number" name="run" min="1" max="200" value="${s.caps.devicePagesPerRun}"></label><label>${T('Trang mỗi ngày (mỗi máy)','Pages per day (per device)')}<input type="number" name="day" min="1" max="600" value="${s.caps.devicePagesPerDay}"></label>
   <label>${T('Nhịp tối thiểu (giây, ≥20)','Min pace (seconds, ≥20)')}<input type="number" name="pmin" min="20" max="120" value="${Math.round(s.pacing.minMs/1000)}"></label><label>${T('Nhịp tối đa (giây)','Max pace (seconds)')}<input type="number" name="pmax" min="20" max="180" value="${Math.round(s.pacing.maxMs/1000)}"></label>
   <label>${T('Ngưỡng tự dừng (tỉ lệ đọc được %)','Auto-pause below (parse success %)')}<input type="number" name="thr" min="10" max="95" value="${Math.round(s.parser.minSuccess*100)}"></label><label>${T('Số mẫu tối thiểu','Minimum samples')}<input type="number" name="smp" min="5" max="200" value="${s.parser.minSamples}"></label></div>
   <fieldset><legend>${T('Giới hạn cả mạng mỗi cửa hàng mỗi ngày','Network cap per retailer per day')}</legend><div class="fields">${RET.map(r=>`<label>${LABEL[r]}<input type="number" name="cap-${r}" min="0" max="3000" value="${s.caps.retailerPagesPerDay[r]??0}"></label>`).join('')}</div></fieldset>
   <fieldset><legend>${T('Khung giờ mặc định (giờ của từng máy)','Default windows (each device’s local time)')}</legend>${s.schedule.map((w:any,i:number)=>`<div class="win" role="group" aria-label="${T('Khung','Window')} ${i+1}">${days().map((d:string,k:number)=>`<label class="d"><input type="checkbox" name="w${i}d" value="${k}" ${w.days.includes(k)?'checked':''}>${d}</label>`).join('')}<label>${T('Từ','From')} <input type="time" name="w${i}s" value="${esc(w.start)}"></label><label>${T('Đến','To')} <input type="time" name="w${i}e" value="${esc(w.end)}"></label></div>`).join('')}</fieldset>
   <div class="row"><button class="btn primary" type="submit">${T('Lưu','Save')}</button></div>
  </form>
 </section>
 <section class="card" aria-labelledby="sc-tr"><h2 id="sc-tr">${T('Người dò giá tin cậy','Trusted scouts')}</h2>
  <p class="muted">${T('Giá từ người dò tin cậy được xác nhận ngay; người khác cần đồng thuận cộng đồng. Chủ Studio luôn được tin cậy.','Prices from trusted scouts are confirmed immediately; others go through community consensus. Studio owners are always trusted.')}</p>
  <ul class="plain">${data.trusted.map((t:any)=>`<li>${esc(t.username)} <small class="muted">${esc(when(t.at))}</small> <button class="btn small" type="button" data-untrust="${esc(t.username)}">${T('Bỏ','Remove')}</button></li>`).join('')||`<li class="muted">${T('Chưa có.','None yet.')}</li>`}</ul>
  <form id="sc-trust" class="row" style="margin-top:8px"><label>${T('Tên tài khoản','Username')} <input type="text" name="u" required minlength="3" maxlength="40" autocomplete="off" spellcheck="false"></label><button class="btn" type="submit">${T('Thêm','Add')}</button></form>
 </section>
 </div>
 <section class="card" aria-labelledby="sc-ev"><h2 id="sc-ev">${T('Nhật ký sự kiện','Event log')}</h2>
  <ul class="ev">${data.events.map((e:any)=>`<li>${e.alert?'<span class="alert">⚠ </span>':''}<strong>${esc(evName(e.type))}</strong> · ${esc(when(e.at))}${e.retailer?' · '+esc(LABEL[e.retailer]||e.retailer):''}${e.deviceId?' · '+esc(e.deviceId):''}${e.kind?' · '+esc(e.kind):''}</li>`).join('')||`<li class="muted">${T('Chưa có sự kiện.','No events yet.')}</li>`}</ul>
 </section>`;
 wire();navLink();
}
const evName=(t:string)=>({device_paired:T('Ghép nối máy','Device paired'),device_revoked:T('Thu hồi máy','Device revoked'),device_blocked:T('Máy bị chặn — tạm dừng 24 giờ','Device blocked — paused 24 h'),parser_breakage:T('Trình đọc lỗi — tự dừng cửa hàng','Parser breakage — retailer auto-paused'),retailer_paused:T('Tạm dừng cửa hàng','Retailer paused'),retailer_resumed:T('Tiếp tục cửa hàng','Retailer resumed'),disagreement_hold:T('Giá lệch giữa các máy — giữ lại','Devices disagree — held')} as any)[t]||t;
function wire(){
 $('#sc-code',host).onclick=async()=>{const r=await act('studio-pair-code',{},T('Đã tạo mã ghép nối.','Pairing code created.'));if(r){code=r;render()}};
 $('#sc-auto',host).onclick=()=>{const on=data.settings.autoScout!=='on';if(on&&!confirm(T('Bật chế độ tự động cho cả mạng? Từng máy vẫn cần được cho phép và người dùng phải tự bật.','Switch Auto on network-wide? Each device still needs your approval and the user must switch it on.')))return;act('studio-network',{patch:{autoScout:on?'on':'off'}},on?T('Đã bật tự động.','Auto switched on.'):T('Đã tắt tự động.','Auto switched off.'))};
 $('#sc-semi',host).onclick=()=>{const on=data.settings.semiAuto!=='on';act('studio-network',{patch:{semiAuto:on?'on':'off'}},T('Đã lưu.','Saved.'))};
 $('#sc-pause',host).onclick=()=>{const p=!data.settings.paused;act('studio-network',{patch:{paused:p}},p?T('Đã tạm dừng cả mạng.','Network paused.'):T('Mạng đã chạy lại.','Network resumed.'))};
 for(const b of host.querySelectorAll('[data-ret]'))b.onclick=()=>act('studio-retailer',{retailer:b.dataset.ret,action:b.dataset.act},T('Đã lưu.','Saved.'));
 for(const b of host.querySelectorAll('[data-dev]'))b.onclick=()=>{const id=b.dataset.dev,a=b.dataset.act;if(a==='revoke'){const why=prompt(T('Lý do thu hồi (ghi vào nhật ký kiểm tra):','Reason for revoking (written to the audit log):'));if(!why||why.trim().length<3)return;act('studio-revoke',{deviceId:id,reason:why},T('Đã thu hồi máy.','Device revoked.'));return}act('studio-device',{deviceId:id,action:a},T('Đã lưu.','Saved.'))};
 for(const b of host.querySelectorAll('[data-untrust]'))b.onclick=()=>act('studio-trusted',{username:b.dataset.untrust,grant:false},T('Đã bỏ quyền tin cậy.','Trusted scout removed.'));
 $('#sc-trust',host).onsubmit=(e:any)=>{e.preventDefault();act('studio-trusted',{username:e.target.u.value.trim().toLowerCase(),grant:true},T('Đã thêm người dò giá tin cậy.','Trusted scout added.'))};
 $('#sc-form',host).onsubmit=(e:any)=>{e.preventDefault();const f=e.target,n=(k:string)=>parseInt(f[k].value,10),s=data.settings;
  const schedule=s.schedule.map((_:any,i:number)=>({days:[...f.querySelectorAll(`input[name=w${i}d]:checked`)].map((x:any)=>+x.value),start:f[`w${i}s`].value,end:f[`w${i}e`].value})).filter((w:any)=>w.days.length);
  const retailerPagesPerDay:any={};for(const r of RET)retailerPagesPerDay[r]=n('cap-'+r);
  act('studio-network',{patch:{caps:{devicePagesPerRun:n('run'),devicePagesPerDay:n('day'),retailerPagesPerDay},pacing:{minMs:n('pmin')*1000,maxMs:Math.max(n('pmin'),n('pmax'))*1000},parser:{minSuccess:n('thr')/100,minSamples:n('smp')},schedule}},T('Đã lưu giới hạn và lịch.','Caps and schedule saved.'))};
}
async function load(){try{[data,cov]=await Promise.all([get('studio-overview'),get('studio-coverage')]);render()}catch(e:any){host.innerHTML=`<div class="card notice"><h1 id="scout-h1" tabindex="-1">${T('Không tải được','Could not load')}</h1><p>${esc(e.message)}</p></div>`}}
async function show(focus=false){const on=location.hash==='#scout';host.hidden=!on;$('#main').hidden=on;navLink();if(on){render();await load();if(focus)$('#scout-h1',host)?.focus?.()}}
addEventListener('hashchange',()=>show(true));
document.getElementById('lang')?.addEventListener('click',()=>setTimeout(()=>{if(location.hash==='#scout')render();navLink()},0));
show();
})();
