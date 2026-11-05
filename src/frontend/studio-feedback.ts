// Studio · Góp ý / Feedback (v1.7.1). Separate classic script loaded by dist/studio.html after studio.js and
// registered into window.studioPages like studio-urgent.js. The inbox of the floating ladybug in the app:
//  - who sees the ladybug: off / only assigned testers / everyone (the Studio owner always does);
//  - "Người thử / Testers": accounts that see it in the "assigned" mode (add / remove; owner-only, audited);
//  - the inbox with filters (status, kind, page, reporter), a report's details (note, context, recent app errors,
//    the picture on request), the status workflow new → triaged → fixing → fixed → closed (or back / won't fix),
//    internal notes, and replies the reporter reads in the app (bug badge + "My feedback").
// Every change and every opened report is written to the Studio audit log by the server (functions/feedback.mts).
(function studioFeedback(){
'use strict';
const registry=(window as any).studioPages,main=document.getElementById('main');
if(!registry||!main)return;
const API='/.netlify/functions/feedback',STUDIO='/.netlify/functions/studio';
const lang=()=>{try{return localStorage.getItem('studio-lang')||(String(navigator.language||'').toLowerCase().startsWith('vi')?'vi':'en')}catch{return 'vi'}};
const T=(vi:string,en:string)=>lang()==='en'?en:vi;
const esc=(v:any)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'} as any)[c]);
const $=(s:string,r:any=document)=>r.querySelector(s) as any;
const loc=()=>lang()==='en'?'en-AU':'vi-VN';
const when=(v:string)=>{const d=new Date(v);return isNaN(+d)?'—':d.toLocaleString(loc(),{timeZone:'Australia/Sydney',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})};
const TYPES:any={bug:['💥','Có lỗi','Something broke'],looks:['👀','Hiển thị sai','Looks wrong'],words:['💬','Chữ hoặc dịch','Words or translation'],idea:['💡','Ý tưởng','Idea'],other:['✳️','Khác','Other']};
const STATUS:any={new:['amber','Mới','New'],triaged:['','Đã xem','Triaged'],fixing:['amber','Đang sửa','Fixing'],fixed:['green','Đã sửa (chờ người gửi thử)','Fixed (reporter to check)'],closed:['green','Đã xong','Closed'],back:['red','Vẫn còn lỗi','Came back'],wontfix:['','Không thay đổi','Won’t fix']};
const MODES:any={off:['Tắt','Off','Không ai thấy bọ rùa (trừ chủ Studio).','Nobody sees the ladybug (except the Studio owner).'],assigned:['Người được chọn','Assigned testers','Chỉ các tài khoản trong danh sách Người thử.','Only the accounts in the Testers list.'],everyone:['Mọi người','Everyone','Mọi người dùng app, kể cả dùng không cần tài khoản.','Everyone using the app, including without an account.']};
const chip=(s:string)=>{const x=STATUS[s]||['',s,s];return `<span class="chip ${x[0]}">${esc(T(x[1],x[2]))}</span>`};
const typeLabel=(t:string)=>{const x=TYPES[t]||TYPES.other;return `<span aria-hidden="true">${x[0]}</span> ${esc(T(x[1],x[2]))}`};
let filt={status:'open',type:'',route:'',reporter:'',page:1},data:any=null,error='',sel:any=null,shot='',host:any=null,csrf='',seq=0,busy=false;
async function handle(r:Response){let d:any={};try{d=await r.json()}catch{}if(!r.ok)throw Object.assign(new Error(lang()==='en'?d.errorEn||d.error||'Request failed':d.error||d.errorEn||'Lỗi'),{status:r.status});return d}
const get=(q:string)=>fetch(`${API}?${q}`,{credentials:'same-origin',headers:{Accept:'application/json'}}).then(handle);
async function post(op:string,body:any){if(!csrf)csrf=(await fetch(STUDIO+'?op=me',{credentials:'same-origin'}).then(handle)).csrf;return fetch(`${API}?op=${op}`,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','x-studio-csrf':csrf},body:JSON.stringify(body)}).then(handle)}
function toast(msg:string,bad=false){const t=$('#toast');if(!t)return;t.textContent=msg;t.className='toast show'+(bad?' bad':'');clearTimeout((toast as any).t);(toast as any).t=setTimeout(()=>t.className='toast',4200)}

function settingsCard(d:any){const mode=d.config.feedbackBug;
 return `<section class="card fb-card" aria-labelledby="fb-h-mode"><h2 id="fb-h-mode">🐞 ${T('Ai thấy bọ rùa góp ý','Who sees the feedback ladybug')}</h2>
 <form id="fb-mode" class="fb-modes"><fieldset><legend class="sr-only">${T('Chế độ','Mode')}</legend>${Object.entries(MODES).map(([k,m]:any)=>`<label class="fb-mode"><input type="radio" name="mode" value="${k}" ${mode===k?'checked':''}><span><b>${esc(T(m[0],m[1]))}</b><small>${esc(T(m[2],m[3]))}</small></span></label>`).join('')}</fieldset>
 <p class="muted">${T('Chủ Studio luôn thấy bọ rùa. Máy chủ từ chối góp ý từ người không được phép.','The Studio owner always sees the ladybug. The server refuses feedback from anyone not allowed.')}${d.config.updatedAt?' · '+T('Đổi lần cuối','Last changed')+' '+esc(when(d.config.updatedAt))+(d.config.updatedBy?' · '+esc(d.config.updatedBy):''):''}</p>
 <button class="btn primary" type="submit">${T('Lưu chế độ','Save mode')}</button></form></section>
 <section class="card fb-card" aria-labelledby="fb-h-testers"><h2 id="fb-h-testers">${T('Người thử','Testers')} <span class="chip">${d.testers.length}</span></h2>
 <p class="muted">${T('Tài khoản thấy bọ rùa khi chế độ là “Người được chọn”.','Accounts that see the ladybug in the “Assigned testers” mode.')} ${d.admins.length?T('Luôn thấy: ','Always: ')+d.admins.map(esc).join(', '):''}</p>
 ${d.testers.length?`<ul class="fb-testers">${d.testers.map((t:any)=>`<li><span><b>${esc(t.username)}</b><small>${t.at?esc(when(t.at)):''}${t.by?' · '+esc(t.by):''}</small></span><button class="btn" type="button" data-fb-remove="${esc(t.username)}" aria-label="${esc(T('Bỏ '+t.username+' khỏi người thử','Remove '+t.username+' from testers'))}">${T('Bỏ','Remove')}</button></li>`).join('')}</ul>`:`<p class="empty">${T('Chưa có người thử.','No testers yet.')}</p>`}
 <form id="fb-add" class="filters fb-add"><label>${T('Tên tài khoản','Username')}<input name="username" autocomplete="off" spellcheck="false" maxlength="40" required pattern="[a-z0-9][a-z0-9_.\\-]{2,39}" placeholder="vd: lan.nguyen"></label><button class="btn" type="submit">＋ ${T('Thêm người thử','Add tester')}</button></form></section>`}
function filters(d:any){const opt=(v:string,l:string,cur:string)=>`<option value="${esc(v)}" ${cur===v?'selected':''}>${esc(l)}</option>`;
 return `<form class="filters" id="fb-f" role="search"><label>${T('Trạng thái','Status')}<select name="status">${opt('open',T('Đang mở','Open'),filt.status)}${opt('',T('Tất cả','All'),filt.status)}${Object.keys(STATUS).map(s=>opt(s,T(STATUS[s][1],STATUS[s][2])+` (${d.counts?.[s]||0})`,filt.status)).join('')}</select></label>
 <label>${T('Loại','Kind')}<select name="type">${opt('',T('Tất cả','All'),filt.type)}${Object.keys(TYPES).map(t=>opt(t,T(TYPES[t][1],TYPES[t][2]),filt.type)).join('')}</select></label>
 <label>${T('Trang','Page')}<select name="route">${opt('',T('Tất cả','All'),filt.route)}${(d.routes||[]).map((r:string)=>opt(r,'#'+r,filt.route)).join('')}</select></label>
 <label>${T('Người gửi','Reporter')}<select name="reporter">${opt('',T('Tất cả','All'),filt.reporter)}${opt('~tester',T('Người thử','Testers'),filt.reporter)}${opt('~device',T('Không tài khoản','No account'),filt.reporter)}${(d.reporters||[]).map((r:string)=>opt(r,r,filt.reporter)).join('')}</select></label></form>`}
function detailHTML(r:any){const c=r.ctx||{},yes=T('có','yes'),no=T('không','no');
 const rows=[[T('Trang','Page'),'#'+(c.route||'—')+(c.view?' · '+c.view:'')+(c.modal?' · '+T('cửa sổ','dialog'):'')],[T('Phiên bản','Version'),`${c.edition??'—'} · ${c.build||'—'}`],[T('Thiết bị','Device'),`${c.platform||'—'}${c.standalone?' · '+T('app đã cài','installed'):''}`],[T('Ngôn ngữ · giao diện','Language · theme'),`${String(c.lang||'').toUpperCase()} · ${c.theme||'—'}`],[T('Màn hình','Viewport'),c.viewport||'—'],[T('Trực tuyến khi viết','Online when written'),c.online?yes:no],[T('Gửi từ hàng đợi','Sent from the offline queue'),c.queued?yes:no],[T('Giờ trên máy','Device time'),c.clientAt?when(c.clientAt):'—'],[T('Nhận lúc','Received'),when(r.at)]];
 const who=r.reporter?.account?`${esc(r.reporter.account)}${r.reporter.tester?' · '+T('người thử','tester'):''}${r.reporter.role==='admin'?' · '+T('chủ Studio','Studio owner'):''}`:T('Không tài khoản (dùng trên máy)','No account (device only)');
 const thread=[...(r.replies||[]).map((x:any)=>({...x,kind:'reply'})),...(r.notes||[]).map((x:any)=>({...x,kind:'note'}))].sort((a,b)=>a.at.localeCompare(b.at));
 return `<section class="card fb-detail" id="fb-detail" aria-labelledby="fb-h-detail"><div class="fb-detail-top"><h2 id="fb-h-detail" tabindex="-1">${typeLabel(r.type)}</h2>${chip(r.status)}<button class="btn" type="button" id="fb-close">${T('Đóng','Close')}</button></div>
 <p class="muted">${T('Người gửi','From')}: <b>${who}</b> · ${esc(when(r.at))}</p>
 <blockquote class="fb-note">${esc(r.note)}</blockquote>
 ${r.hasShot?(shot?`<figure class="fb-shot"><img src="${esc(shot)}" alt="${esc(T('Ảnh người gửi đính kèm','Picture attached by the reporter'))}"></figure>`:`<p><button class="btn" type="button" id="fb-shot">📷 ${T('Xem ảnh đính kèm','Show the attached picture')}</button></p>`):`<p class="muted">${T('Không có ảnh.','No picture.')}</p>`}
 <details class="fb-ctx" open><summary>${T('Bối cảnh kỹ thuật','Technical context')}</summary><dl>${rows.map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
 <h3>${T('Lỗi gần đây trong app','Recent app errors')}</h3>${(r.errors||[]).length?`<ol class="fb-errors">${r.errors.map((e:string)=>`<li><code>${esc(e)}</code></li>`).join('')}</ol>`:`<p class="muted">${T('Không có.','None.')}</p>`}</details>
 <form id="fb-status" class="filters"><label>${T('Trạng thái','Status')}<select name="status">${Object.keys(STATUS).map(s=>`<option value="${s}" ${r.status===s?'selected':''}>${esc(T(STATUS[s][1],STATUS[s][2]))}</option>`).join('')}</select></label><button class="btn primary" type="submit">${T('Lưu trạng thái','Save status')}</button></form>
 <form id="fb-reply" class="fb-form"><label>${T('Trả lời người gửi (họ thấy trong app)','Reply to the reporter (shown in their app)')}<textarea name="reply" rows="3" maxlength="2000"></textarea></label><button class="btn primary" type="submit">${T('Gửi trả lời','Send reply')}</button></form>
 <form id="fb-internal" class="fb-form"><label>${T('Ghi chú nội bộ (người gửi không thấy)','Internal note (the reporter never sees it)')}<textarea name="note" rows="2" maxlength="2000"></textarea></label><button class="btn" type="submit">${T('Thêm ghi chú','Add note')}</button></form>
 ${thread.length?`<h3>${T('Trao đổi','Thread')}</h3><ol class="fb-thread">${thread.map((x:any)=>`<li class="fb-t-${x.kind}"><span class="chip ${x.kind==='reply'?'green':''}">${x.kind==='reply'?T('Trả lời','Reply'):T('Nội bộ','Internal')}</span> <small>${esc(x.by)} · ${esc(when(x.at))}</small><p>${esc(x.text)}</p></li>`).join('')}</ol>`:''}
 <details class="fb-history"><summary>${T('Lịch sử thay đổi','Change history')} (${(r.history||[]).length})</summary><ol>${(r.history||[]).map((h:any)=>`<li><small>${esc(when(h.at))}</small> · ${esc(h.by)} · ${esc(h.action)}${h.to?` ${esc(h.from)} → ${esc(h.to)}`:''}</li>`).join('')}</ol></details></section>`}
function render(){
 if(!host)return;const d=data;
 const head=`<header class="page-head"><div><h1 tabindex="-1">${T('Góp ý','Feedback')}</h1><p class="muted">${T('Góp ý gửi từ con bọ rùa trong app: lời người gửi viết, ảnh họ chọn gửi và bối cảnh kỹ thuật. Mỗi lần mở và mỗi thay đổi đều được ghi nhật ký kiểm tra.','Feedback sent with the ladybug in the app: what the reporter wrote, the picture they chose to send and technical context. Every view and change is written to the audit log.')}</p></div><div class="row"><button class="btn" id="fb-refresh" type="button">↻ ${T('Làm mới','Refresh')}</button><button class="btn primary" id="fb-export" type="button">📋 ${T('Sao chép cho dev','Copy for developer')}</button></div></header>`;
 if(error){host.innerHTML=head+`<div class="card notice"><p>${esc(error)}</p></div>`;wire();return}
 if(!d){host.innerHTML=head+`<p class="muted">${T('Đang tải…','Loading…')}</p>`;return}
 const pages=Math.max(1,Math.ceil(d.total/d.size));
 host.innerHTML=head+`<div class="fb-grid">${settingsCard(d)}</div>
 <section class="card" aria-labelledby="fb-h-inbox"><h2 id="fb-h-inbox">${T('Hộp thư góp ý','Inbox')} <span class="chip amber">${d.open} ${T('đang mở','open')}</span> <span class="chip">${d.all} ${T('tổng','total')}</span></h2>${filters(d)}
 ${d.rows.length?`<ol class="fb-list">${d.rows.map((r:any)=>`<li class="fb-row${sel?.id===r.id?' fb-sel':''}"><button type="button" class="fb-open" data-fb-open="${esc(r.id)}" aria-current="${sel?.id===r.id}"><span class="fb-row-top">${chip(r.status)}<span class="fb-kind">${typeLabel(r.type)}</span><span class="fb-when">${esc(when(r.at))}</span></span><span class="fb-ex">${esc(r.excerpt)}</span><span class="fb-meta">#${esc(r.route||'—')} · ${esc(r.platform||'—')} · ${r.reporter?esc(r.reporter)+(r.tester?' 🐞':''):T('không tài khoản','no account')}${r.hasShot?' · 📷':''}${r.replies?` · ${r.replies} ${T('trả lời','replies')}`:''}${r.notes?` · ${r.notes} ${T('ghi chú','notes')}`:''}</span></button></li>`).join('')}</ol>`:`<p class="empty">${T('Không có góp ý nào khớp bộ lọc.','No feedback matches the filters.')}</p>`}
 ${pages>1?`<div class="pager"><button class="btn" type="button" data-fb-page="${d.page-1}" ${d.page<=1?'disabled':''}>← ${T('Trước','Previous')}</button><span>${d.page}/${pages}</span><button class="btn" type="button" data-fb-page="${d.page+1}" ${d.page>=pages?'disabled':''}>${T('Sau','Next')} →</button></div>`:''}</section>
 ${sel?detailHTML(sel):''}`;
 wire()}
async function devCopy(){try{const d=await get('op=studio-export'),items=d.items||[];
 const md=[`# FamTray bug reports (${items.length} open) · ${new Date().toISOString().slice(0,16).replace('T',' ')} UTC`,'',...items.map((r:any,i:number)=>[`## ${i+1}. ${r.type} · ${r.status} · ${String(r.at).slice(0,16).replace('T',' ')} · ${r.id}`,'',r.note?'> '+r.note.replace(/\n/g,'\n> '):'> (no text)','',`- Context: ${Object.entries(r.ctx||{}).map(([k,v])=>k+'='+v).join(', ')||'—'}`,...(r.errors?.length?['- Errors:',...r.errors.map((e:string)=>'  - `'+e.replace(/`/g,"'")+'`')]:[]),r.hasShot?'- Picture attached (open it in Studio)':'',''].filter(x=>x!=='').join('\n'))].join('\n\n');
 try{await navigator.clipboard.writeText(md);toast(T(`Đã sao chép ${items.length} góp ý. Dán vào cuộc trò chuyện với dev.`,`Copied ${items.length} reports. Paste them to the developer.`))}
 catch{const box=document.createElement('textarea');box.className='input';box.rows=14;box.readOnly=true;box.value=md;box.id='fb-export-text';host.querySelector('#fb-export-text')?.remove();host.prepend(box);box.focus();box.select();toast(T('Trình duyệt chặn sao chép tự động: nội dung đã được chọn, bấm Sao chép.','Automatic copying was blocked: the text is selected, copy it.'))}}
 catch(e:any){toast(e.message,true)}}
function wire(){$('#fb-export',host)?.addEventListener('click',devCopy);
 $('#fb-refresh',host)?.addEventListener('click',()=>load());
 const f=$('#fb-f',host);f?.addEventListener('change',()=>{filt={status:f.status.value,type:f.type.value,route:f.route.value,reporter:f.reporter.value,page:1};load()});
 host.querySelectorAll('[data-fb-page]').forEach((b:any)=>b.addEventListener('click',()=>{filt.page=+b.dataset.fbPage||1;load()}));
 host.querySelectorAll('[data-fb-open]').forEach((b:any)=>b.addEventListener('click',()=>open(b.dataset.fbOpen)));
 $('#fb-mode',host)?.addEventListener('submit',(e:any)=>{e.preventDefault();const m=e.target.querySelector('input[name=mode]:checked')?.value;act(()=>post('studio-mode',{mode:m}),T('Đã lưu chế độ.','Mode saved.'),(d:any)=>{data={...data,...d}})});
 $('#fb-add',host)?.addEventListener('submit',(e:any)=>{e.preventDefault();const u=String(e.target.username.value||'').trim().toLowerCase();if(!u)return;act(()=>post('studio-tester',{username:u,grant:true}),T('Đã thêm người thử.','Tester added.'),(d:any)=>{data={...data,...d}})});
 host.querySelectorAll('[data-fb-remove]').forEach((b:any)=>b.addEventListener('click',()=>act(()=>post('studio-tester',{username:b.dataset.fbRemove,grant:false}),T('Đã bỏ người thử.','Tester removed.'),(d:any)=>{data={...data,...d}})));
 $('#fb-close',host)?.addEventListener('click',()=>{const id=sel?.id;sel=null;shot='';render();($(`[data-fb-open="${id}"]`,host)||$('h1',host))?.focus()});
 $('#fb-shot',host)?.addEventListener('click',async()=>{try{shot=(await get('op=studio-shot&id='+encodeURIComponent(sel.id))).shot||'';render();$('.fb-shot img',host)?.scrollIntoView?.({block:'nearest'})}catch(e:any){toast(e.message,true)}});
 $('#fb-status',host)?.addEventListener('submit',(e:any)=>{e.preventDefault();upd({status:e.target.status.value},T('Đã lưu trạng thái.','Status saved.'))});
 $('#fb-reply',host)?.addEventListener('submit',(e:any)=>{e.preventDefault();const v=e.target.reply.value.trim();if(v)upd({reply:v},T('Đã gửi trả lời.','Reply sent.'))});
 $('#fb-internal',host)?.addEventListener('submit',(e:any)=>{e.preventDefault();const v=e.target.note.value.trim();if(v)upd({note:v},T('Đã thêm ghi chú.','Note added.'))});
}
async function act(fn:()=>Promise<any>,ok:string,then:(d:any)=>void){if(busy)return;busy=true;try{const d=await fn();then(d);toast(ok);render()}catch(e:any){toast(e.message,true)}finally{busy=false}}
async function upd(b:any,ok:string){await act(()=>post('studio-update',{id:sel.id,...b}),ok,(d:any)=>{sel=d});await load(false);$('#fb-h-detail',host)?.focus?.({preventScroll:true})}
async function open(id:string){try{sel=await get('op=studio-detail&id='+encodeURIComponent(id));shot='';render();const h=$('#fb-h-detail',host);h?.scrollIntoView?.({block:'start'});h?.focus?.({preventScroll:true})}catch(e:any){toast(e.message,true)}}
async function load(paint=true){
 const n=++seq;error='';if(paint&&!data)render();
 try{const d=await get(new URLSearchParams({op:'studio-inbox',status:filt.status,type:filt.type,route:filt.route,reporter:filt.reporter,page:String(filt.page),size:'20'}).toString());if(n!==seq)return;data=d;filt.page=d.page}
 catch(e:any){if(n!==seq)return;data=null;error=e.message}
 render()}
registry.feedback={vi:'Góp ý',en:'Feedback',icon:'🐞',async render(el:any){host=document.createElement('div');host.id='feedback-main';el.innerHTML='';el.appendChild(host);sel=null;shot='';await load()}};
})();
