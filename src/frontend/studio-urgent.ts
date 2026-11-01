// Studio · Tin khẩn / Urgent (v1.7.1). Separate classic script loaded by dist/studio.html after studio.js and
// registered into window.studioPages like studio-usage.js. Answers "why did these urgent messages fail?":
// recent urgent messages (30 days, newest first) with time, family, recipient and device counts, status, the
// reason in plain words and a concrete fix. Metadata only — the message text never reaches this page.
// The list (op=urgent) follows the normal Studio read roles; one family's drill-down (op=urgent-family: sender and
// recipient display names, recipients' devices as they are now) is owner-only and written to the audit log.
// It also makes the Overview "Urgent messages" tile open this page.
(function studioUrgent(){
'use strict';
const registry=(window as any).studioPages,main=document.getElementById('main');
if(!registry||!main)return;
const API='/.netlify/functions/studio';
const lang=()=>{try{return localStorage.getItem('studio-lang')||(String(navigator.language||'').toLowerCase().startsWith('vi')?'vi':'en')}catch{return 'vi'}};
const T=(vi:string,en:string)=>lang()==='en'?en:vi;
const esc=(v:any)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'} as any)[c]);
const $=(s:string,r:any=document)=>r.querySelector(s) as any;
const loc=()=>lang()==='en'?'en-AU':'vi-VN';
const num=(v:any)=>v==null?'—':Number(v).toLocaleString(loc());
const when=(v:string,dateOnly=false)=>{const d=new Date(v);if(isNaN(+d))return '—';return d.toLocaleString(loc(),{timeZone:'Australia/Sydney',day:'2-digit',month:'short',...(dateOnly?{}:{hour:'2-digit',minute:'2-digit'})})};
const ago=(v:string)=>{const s=(Date.now()-new Date(v).getTime())/1000;if(!isFinite(s))return '';if(s<90)return T('vừa xong','just now');const m=s/60,h=m/60,d=h/24;return d>=1?T(Math.round(d)+' ngày trước',Math.round(d)+' d ago'):h>=1?T(Math.round(h)+' giờ trước',Math.round(h)+' h ago'):T(Math.round(m)+' phút trước',Math.round(m)+' min ago')};

// Reason wording follows the app's pushReasonText (src/frontend/push-ui.ts); the fix is what to do about it.
const REASONS:any={
 sent:['Đã chuyển tới dịch vụ thông báo; chưa xác nhận đã đọc.','Handed to the notification service; reading not confirmed.','',''],
 not_configured:['Thông báo gia đình chưa được thiết lập.','Family notifications are not set up yet.','Gia đình chưa ai bật thông báo. Một người mở app → Nhắc nhở → Bật / lưu nhận push.','Nobody in the family has turned notifications on yet. Someone opens the app → Reminders → Enable / save push.'],
 no_device:['Người nhận chưa có thiết bị đăng ký nhận thông báo.','The recipient has no registered device.','Người nhận chưa bật thông báo trên máy nào. Trên iPhone: mở app từ màn hình chính → Nhắc nhở → Bật / lưu nhận push.','The recipient has not turned notifications on on any device. On iPhone: open the app from the Home Screen → Reminders → Enable / save push.'],
 needs_resubscribe:['Thiết bị cần đăng ký lại.','The device must register again.','Máy cần bật lại thông báo: trên máy người nhận mở Nhắc nhở → Bật / lưu nhận push.','The device needs notifications turned on again: on the recipient’s device open Reminders → Enable / save push.'],
 no_recipient:['Người nhận đã tắt loại thông báo này trên máy của họ.','The recipient has turned this notification type off on their device.','Trên máy người nhận: Nhắc nhở → bật “Tin khẩn trong gia đình” → Lưu.','On the recipient’s device: Reminders → turn on “Urgent family messages” → Save.'],
 quiet_hours:['Người nhận đang trong giờ yên lặng nên chưa báo; nội dung vẫn được lưu trong app.','The recipient is in quiet hours, so no alert was shown; the content is saved in the app.','Người nhận đang giờ yên lặng; tin khẩn chỉ vượt giờ yên lặng nếu họ cho phép (Nhắc nhở → tin khẩn vẫn báo trong giờ yên lặng).','The recipient is in quiet hours; urgent messages only break through quiet hours if they allow it (Reminders → urgent messages alert during quiet hours).'],
 daily_limit:['Đã đạt giới hạn nhắc tự động trong ngày cho thiết bị này.','The daily automatic reminder limit for this device was reached.','Giới hạn chỉ áp dụng cho nhắc tự động và tự hết vào ngày hôm sau.','The limit only applies to automatic reminders and resets the next day.'],
 delivery_failed:['Dịch vụ thông báo chưa nhận.','The notification service did not accept it.','Dịch vụ thông báo của Apple/Google từ chối; thường do đăng ký cũ — bật lại thông báo trên máy người nhận.','Apple’s/Google’s notification service refused it; usually an old registration — turn notifications on again on the recipient’s device.'],
 family_suspended:['Gia đình đang tạm dừng (chỉ xem).','This family is paused (read-only).','Bỏ tạm dừng trong Studio → Gia đình nếu phù hợp.','Unsuspend it in Studio → Families if appropriate.'],
 unknown_member:['Người nhận không còn trong gia đình.','The recipient is no longer in the family.','Chọn lại người nhận có trong danh sách gia đình.','Choose recipients who are in the family list.'],
 pending:['Đang gửi thông báo…','Sending the notification…','',''],
 unfinished:['Việc gửi thông báo chưa hoàn tất.','The notification send never finished.','Thường tự hết. Nếu lặp lại, gửi tin mới hoặc dùng SMS / chia sẻ, rồi báo lỗi.','Usually transient. If it repeats, send a new message or use SMS / share, and report it.'],
 unknown:['Không có chi tiết (tin cũ, trước khi lưu lý do).','No details (older message, from before reasons were stored).','Mở “Chi tiết gia đình” để xem thiết bị hiện tại của người nhận.','Open “Family details” to see the recipients’ devices as they are now.']};
const reasonText=(r:string)=>{const x=REASONS[r]||REASONS.unknown;return T(x[0],x[1])};
const fixText=(r:string)=>{const x=REASONS[r]||REASONS.unknown;return T(x[2],x[3])};
const STATUS:any={sent:['green','Đã gửi','Sent'],failed:['red','Không gửi được','Not delivered'],pending:['amber','Đang gửi','Sending'],unknown:['','Chưa rõ','Unknown']};
const chip=(s:string)=>{const x=STATUS[s]||STATUS.unknown;return `<span class="chip ${x[0]}">${esc(T(x[1],x[2]))}</span>`};

let filt={status:'failed',family:'',page:1},data:any=null,error='',detail='',host:any=null,me:any=null,seq=0;
async function get(q:string){const r=await fetch(`${API}?${q}`,{credentials:'same-origin',headers:{Accept:'application/json'}});let d:any={};try{d=await r.json()}catch{}if(!r.ok)throw new Error(lang()==='en'?d.errorEn||d.error||'Request failed':d.error||d.errorEn||'Lỗi');return d}
function toast(msg:string,bad=false){const t=$('#toast');if(!t)return;t.textContent=msg;t.className='toast show'+(bad?' bad':'');clearTimeout((toast as any).t);(toast as any).t=setTimeout(()=>t.className='toast',4200)}

function devices(d:any){if(!d)return `<span class="muted">${T('Không có chi tiết thiết bị (tin cũ).','No device details (older message).')}</span>`;
 const parts=[`${num(d.devices)} ${T('máy phù hợp','devices matched')}`,`${num(d.accepted)} ${T('nhận','accepted')}`,`${num(d.failed)} ${T('lỗi','failed')}`,`${num(d.expired)} ${T('hết hạn','expired')}`];
 if(d.needsResubscribe)parts.push(`${num(d.needsResubscribe)} ${T('cần bật lại','need re-enabling')}`);if(d.typeOff)parts.push(`${num(d.typeOff)} ${T('tắt tin khẩn','urgent off')}`);if(d.quiet)parts.push(`${num(d.quiet)} ${T('giờ yên lặng','quiet hours')}`);if(d.suppressed)parts.push(`${num(d.suppressed)} ${T('bị giới hạn','limited')}`);
 return parts.map(esc).join(' · ')}
const fixLine=(r:string)=>{const f=fixText(r);return f?`<p class="ur-fix"><b>${T('Cách khắc phục','How to fix')}:</b> ${esc(f)}</p>`:''};

function render(){
 if(!host)return;const owner=me?.role==='owner',d=data;
 const head=`<header class="page-head"><div><h1 tabindex="-1">${T('Tin khẩn','Urgent')}</h1><p class="muted">${T('Vì sao tin khẩn không gửi được thông báo, 30 ngày gần nhất. Chỉ thông tin gửi (giờ, số máy, lý do) — nội dung tin là riêng tư và không hiển thị.','Why urgent messages did not deliver a notification, last 30 days. Delivery metadata only (time, device counts, reason) — message text is private and never shown.')}</p></div>
  <div class="row"><button class="btn" id="ur-refresh" type="button">↻ ${T('Làm mới','Refresh')}</button></div></header>`;
 if(error){host.innerHTML=head+`<div class="card notice"><p>${esc(error)}</p></div>`;wire();return}
 if(!d){host.innerHTML=head+`<p class="muted">${T('Đang tải…','Loading…')}</p>`;wire();return}
 const t=d.totals,pages=Math.max(1,Math.ceil(d.total/d.size));
 host.innerHTML=head+`
 <form class="filters" id="ur-f" role="search"><label>${T('Hiển thị','Show')}<select name="status"><option value="failed">${T('Chỉ tin lỗi','Failed only')}</option><option value="all" ${filt.status==='all'?'selected':''}>${T('Tất cả tin khẩn','All urgent messages')}</option></select></label>
  <label>${T('Gia đình','Family')}<select name="family"><option value="">${T('Tất cả gia đình','All families')}</option>${d.families.map((f:any)=>`<option value="${esc(f.id)}" ${filt.family===f.id?'selected':''}>${esc(f.name)} (${num(f.failed)}/${num(f.total)})</option>`).join('')}</select></label></form>
 <p class="ur-totals">${T('30 ngày','30 days')}: <b>${num(t.total)}</b> ${T('tin','messages')} · ${num(t.sent)} ${T('đã gửi','sent')} · <b>${num(t.failed)}</b> ${T('không gửi được','not delivered')}${t.pending?` · ${num(t.pending)} ${T('đang gửi','sending')}`:''}${t.unknown?` · ${num(t.unknown)} ${T('chưa rõ','unknown')}`:''}${d.computedAt?` · <span class="muted">${T('Tính lúc','Computed')} ${esc(when(d.computedAt))}</span>`:''}</p>
 <section aria-labelledby="ur-h-why"><h2 id="ur-h-why">${T('Lý do không gửi được','Why not delivered')}</h2>
  ${d.reasons.length?`<ul class="ur-reasons">${d.reasons.map((r:any)=>`<li class="card" data-reason="${esc(r.reason)}"><b class="ur-n">${num(r.count)}</b><div><p class="ur-reason">${esc(reasonText(r.reason))}</p>${fixLine(r.reason)}</div></li>`).join('')}</ul>`:`<p class="empty">${T('Không có tin nào bị lỗi trong 30 ngày.','No failed messages in the last 30 days.')}</p>`}</section>
 <section aria-labelledby="ur-h-list"><h2 id="ur-h-list">${filt.status==='failed'?T('Tin không gửi được','Not delivered'):T('Tin khẩn gần đây','Recent urgent messages')} <small class="muted">(${num(d.total)})</small></h2>
  ${d.rows.length?`<ol class="ur-list">${d.rows.map((r:any)=>`<li class="card ur-row" data-status="${esc(r.status)}">
   <div class="ur-top">${chip(r.status)}<span class="ur-when"><time datetime="${esc(r.at)}">${esc(when(r.at,r.dateOnly))}</time>${r.dateOnly?'':` · ${esc(ago(r.at))}`}</span></div>
   <p class="ur-meta"><b>${esc(r.family)}</b> · ${T('Người nhận','Recipients')}: ${r.recipients==null?'—':num(r.recipients)}</p>
   <p class="ur-dev">${devices(r.detail)}</p>
   ${r.status==='sent'?'':`<p class="ur-reason"><b>${T('Lý do','Reason')}:</b> ${esc(reasonText(r.reason))}</p>${fixLine(r.reason)}`}
   ${owner?`<p class="ur-act"><button class="btn small" type="button" data-ur-family="${esc(r.familyId)}">${T('Chi tiết gia đình','Family details')}</button></p>`:''}</li>`).join('')}</ol>`:`<p class="empty">${T('Không có tin nào.','No messages.')}</p>`}
  ${pages>1?`<nav class="pager" aria-label="${T('Trang','Pages')}"><button class="btn" type="button" data-ur-page="${d.page-1}" ${d.page<=1?'disabled':''}>‹ ${T('Trước','Previous')}</button><span>${T('Trang','Page')} ${d.page} / ${pages}</span><button class="btn" type="button" data-ur-page="${d.page+1}" ${d.page>=pages?'disabled':''}>${T('Sau','Next')} ›</button></nav>`:''}
  <p class="muted">${owner?T('Chi tiết gia đình hiện tên người gửi, người nhận và thiết bị hiện tại; chỉ chủ Studio, có ghi nhật ký kiểm tra.','Family details show sender and recipient names and current devices; Studio owner only, written to the audit log.'):T('Chi tiết theo gia đình chỉ dành cho chủ Studio.','Per-family details are for the Studio owner only.')}</p></section>
 <div id="ur-detail" aria-live="polite">${detail}</div>`;
 wire();
}
function wire(){
 $('#ur-refresh',host)?.addEventListener('click',()=>load(true));
 const f=$('#ur-f',host);if(f)f.addEventListener('change',()=>{filt={status:f.status.value,family:f.family.value,page:1};detail='';load()});
 for(const b of host.querySelectorAll('[data-ur-page]'))b.addEventListener('click',()=>{filt.page=+b.dataset.urPage||1;load()});
 for(const b of host.querySelectorAll('[data-ur-family]'))b.addEventListener('click',()=>familyDetail(b.dataset.urFamily));
}
function deviceNow(n:any){if(!n.devices)return T('chưa có máy nào bật thông báo','no device with notifications on');
 const p=[`${num(n.ready)} ${T('sẵn sàng','ready')}`];if(n.needsResubscribe)p.push(`${num(n.needsResubscribe)} ${T('cần bật lại','need re-enabling')}`);if(n.urgentOff)p.push(`${num(n.urgentOff)} ${T('tắt tin khẩn','urgent off')}`);if(n.quietNoBypass)p.push(`${num(n.quietNoBypass)} ${T('không báo trong giờ yên lặng','silent in quiet hours')}`);if(n.inactive)p.push(`${num(n.inactive)} ${T('của tài khoản đã rời','from an account that left')}`);
 return `${num(n.devices)} ${T('máy','devices')} (${p.join(', ')})`}
async function familyDetail(id:string){
 try{const j=await get(`op=urgent-family&id=${encodeURIComponent(id)}`);
  detail=`<section class="card ur-family" aria-labelledby="ur-h-fam"><h2 id="ur-h-fam" tabindex="-1">${esc(j.family.name)} · ${T('30 ngày','30 days')}</h2>
  <p class="muted">${T('Thiết bị là tình trạng hiện tại, không phải lúc gửi. Đã ghi vào nhật ký kiểm tra.','Devices show the current state, not the state at send time. Written to the audit log.')}</p>
  ${j.rows.length?`<ol class="ur-list">${j.rows.map((r:any)=>`<li class="ur-row" data-status="${esc(r.status)}"><div class="ur-top">${chip(r.status)}<span class="ur-when">${esc(when(r.at))} · ${esc(ago(r.at))}</span></div>
   <p class="ur-meta">${T('Người gửi','From')}: <b>${esc(r.sender)}</b> · ${T('đã đọc','read')} ${num(r.readCount)}/${num(r.recipients.length)}</p>
   <ul class="ur-recips">${r.recipients.map((x:any)=>`<li><b>${esc(x.known?x.name:T('(không còn trong gia đình)','(no longer in the family)'))}</b>: ${esc(deviceNow(x.now))}</li>`).join('')}</ul>
   <p class="ur-dev">${devices(r.detail)}</p>${r.status==='sent'?'':`<p class="ur-reason"><b>${T('Lý do','Reason')}:</b> ${esc(reasonText(r.reason))}</p>${fixLine(r.reason)}`}</li>`).join('')}</ol>`:`<p class="empty">${T('Không có tin nào.','No messages.')}</p>`}</section>`;
  render();const h=$('#ur-h-fam',host);h?.scrollIntoView?.({block:'start'});h?.focus?.({preventScroll:true});toast(T('Đã mở chi tiết (ghi nhật ký).','Details opened (audited).'))}catch(e:any){toast(e.message,true)}
}
async function load(fresh=false){
 const n=++seq;error='';render();
 try{const [d,who]=await Promise.all([get(new URLSearchParams({op:'urgent',status:filt.status,family:filt.family,page:String(filt.page),size:'20',...(fresh?{fresh:'1'}:{})}).toString()),me?Promise.resolve(me):get('op=me').catch(()=>null)]);if(n!==seq)return;data=d;me=who;filt.page=d.page}
 catch(e:any){if(n!==seq)return;data=null;error=e.message}
 render();
}
registry.urgent={vi:'Tin khẩn',en:'Urgent',icon:'!',async render(el:any){host=document.createElement('div');host.id='urgent-main';el.innerHTML='';el.appendChild(host);detail='';await load()}};

// Overview: the "Urgent messages" tile opens this page (the whole tile is clickable; the link is the keyboard target).
function wireTile(){const tile=main!.querySelector('article.tile-urgent:not([data-ur-wired])') as any;if(!tile)return;tile.dataset.urWired='1';tile.classList.add('tile-link');
 const p=document.createElement('p');p.className='tile-more';p.innerHTML=`<a href="#urgent">${esc(T('Xem lý do không gửi được →','See why not delivered →'))}</a>`;tile.appendChild(p);
 tile.addEventListener('click',(e:any)=>{if(e.target.closest('a'))return;location.hash='#urgent'})}
new MutationObserver(wireTile).observe(main,{childList:true,subtree:true});wireTile();
})();
