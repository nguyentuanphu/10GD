// Studio · Món cộng đồng / Community recipes (v1.7.1). Separate classic script loaded by dist/studio.html after
// studio.js and registered into window.studioPages like studio-scout.js / studio-usage.js (studio.ts is not edited).
// Shared family recipes stay pending until approved here. Approve / reject (reason) / remove (reason) / restore /
// dismiss reports go to /.netlify/functions/community-recipes?op=studio-action (owner only, CSRF, audited). The card
// at the top switches the platform flag `communityRecipes` through Studio's audited settings-save.
(function studioRecipes(){
'use strict';
const registry=(window as any).studioPages;
if(!registry||!document.getElementById('main'))return;
const API='/.netlify/functions/community-recipes',STUDIO='/.netlify/functions/studio';
const lang=()=>{try{return localStorage.getItem('studio-lang')||(String(navigator.language||'').toLowerCase().startsWith('vi')?'vi':'en')}catch{return 'vi'}};
const T=(vi:string,en:string)=>lang()==='en'?en:vi;
const esc=(v:any)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'} as any)[c]);
const $=(s:string,r:any=document)=>r.querySelector(s) as any;
const $$=(s:string,r:any=document)=>[...r.querySelectorAll(s)] as any[];
const when=(v:any)=>{if(!v)return '—';const d=new Date(v);return isNaN(+d)?'—':d.toLocaleString(lang()==='en'?'en-AU':'vi-VN',{timeZone:'Australia/Sydney',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})};
let me:any=null,filter='pending';
const css=`#recipes-main .cr-tabs{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0}
#recipes-main .cr-tabs .btn,#recipes-main .cr-actions .btn{min-height:44px}
#recipes-main .cr-list{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr))}
#recipes-main .cr-item{border:1px solid var(--line);border-radius:12px;padding:12px;background:var(--panel);min-width:0;overflow-wrap:anywhere}
#recipes-main .cr-item img{width:100%;max-height:220px;object-fit:cover;border-radius:8px;display:block;margin-bottom:8px}
#recipes-main .cr-item h3{margin:0 0 4px}
#recipes-main .cr-item ul,#recipes-main .cr-item ol{padding-left:18px;margin:4px 0}
#recipes-main .cr-item textarea{width:100%;min-height:60px;font:inherit;padding:8px;border:1px solid var(--line);border-radius:8px;background:var(--panel);color:var(--text)}
#recipes-main .cr-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
#recipes-main .cr-flag{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
#recipes-main .cr-flag label{display:flex;flex-direction:row;gap:8px;align-items:center;min-height:44px;font-weight:600}
#recipes-main .cr-flag input[type=checkbox]{width:22px;height:22px;min-height:0;margin:0;flex:none}
#recipes-main .cr-item summary{min-height:44px;display:flex;align-items:center;cursor:pointer}`;
const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);
async function handle(r:Response){let d:any={};try{d=await r.json()}catch{}if(!r.ok)throw new Error(lang()==='en'?d.errorEn||d.error||'Request failed':d.error||d.errorEn||'Lỗi');return d}
const get=(op:string)=>fetch(`${API}?op=${op}`,{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}}).then(handle);
async function who(){if(!me)me=await fetch(STUDIO+'?op=me',{credentials:'same-origin',cache:'no-store'}).then(handle);return me}
async function act(body:any){const m=await who();return fetch(`${API}?op=studio-action`,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','x-studio-csrf':m.csrf},body:JSON.stringify(body)}).then(handle)}
async function saveFlag(on:boolean){const m=await who();return fetch(`${STUDIO}?op=settings-save`,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','x-studio-csrf':m.csrf},body:JSON.stringify({patch:{flags:{communityRecipes:on}}})}).then(handle)}
function toast(msg:string,bad=false){const t=$('#toast');if(!t)return;t.textContent=msg;t.className='toast show'+(bad?' bad':'');clearTimeout((toast as any).t);(toast as any).t=setTimeout(()=>t.className='toast',4200)}
const statusName=(s:string)=>({pending:T('Chờ duyệt','Pending'),approved:T('Đã duyệt','Approved'),rejected:T('Từ chối','Rejected'),removed:T('Đã gỡ','Removed')} as any)[s]||s;
const reasonName=(r:string)=>({wrong:T('Sai thông tin','Wrong'),offensive:T('Không phù hợp','Offensive'),copyright:T('Của người khác','Not theirs'),spam:'Spam',other:T('Khác','Other')} as any)[r]||r;
function item(x:any){const actions:string[]=[];const b=(a:string,l:string,cls='')=>`<button type="button" class="btn ${cls}" data-cr="${a}" data-id="${esc(x.id)}">${l}</button>`;
 if(x.status==='pending')actions.push(b('approve',T('Duyệt','Approve'),'primary'),b('reject',T('Từ chối','Reject')));
 if(x.status==='approved')actions.push(b('remove',T('Gỡ','Remove')));
 if(x.status==='removed'||x.status==='rejected')actions.push(b('restore',T('Khôi phục (duyệt)','Restore (approve)')));
 if(x.reports.length)actions.push(b('dismiss-reports',T('Bỏ qua báo cáo','Dismiss reports')));
 return `<article class="cr-item" aria-labelledby="cr-${esc(x.id)}">${x.hasPhoto?`<img alt="${esc(T('Ảnh do gia đình gửi: ','Photo sent by a family: ')+x.name)}" data-cr-photo="${esc(x.id)}">`:`<p class="muted">${T('Không có ảnh','No photo')}</p>`}
 <h3 id="cr-${esc(x.id)}">${esc(x.name)}</h3><p class="muted">${statusName(x.status)} · ${x.kind==='full'?T('Cả món','Whole recipe'):T('Chỉ ảnh + tên','Photo + name')} · ${x.by?esc(x.by):T('Ẩn danh','Anonymous')} · <code>${esc(x.account)}</code><br>${T('Gửi','Sent')} ${when(x.submittedAt)}${x.decidedAt?` · ${T('Xử lý','Decided')} ${when(x.decidedAt)} (${esc(x.decidedBy||'')})`:''}${x.reason?`<br>${T('Lý do','Reason')}: ${esc(x.reason)}`:''}${x.awarded?' · ✓ '+T('đã cộng điểm','points awarded'):''}</p>
 ${x.kind==='full'?`<details><summary>${T('Nguyên liệu & cách nấu','Ingredients & method')}</summary><ul>${(x.ingredients||[]).map((i:any)=>`<li>${esc(i.name)}${i.qty!=null?` — ${esc(i.qty)} ${esc(i.unit)}`:''}</li>`).join('')}${(x.missing||[]).map((m:string)=>`<li>${esc(m)}</li>`).join('')}</ul>${x.prep?`<p>${esc(x.prep)}</p>`:''}<ol>${(x.steps||[]).map((s:string)=>`<li>${esc(s)}</li>`).join('')}</ol></details>`:''}
 ${x.reports.length?`<p><strong>${T('Báo cáo','Reports')} (${x.reports.length})</strong>: ${x.reports.map((r:any)=>`${esc(reasonName(r.reason))}${r.note?' — '+esc(r.note):''}`).join('; ')}</p>`:''}
 ${actions.length?`<label>${T('Lý do (bắt buộc khi từ chối / gỡ, ghi vào nhật ký)','Reason (required to reject / remove, written to the audit log)')}<textarea data-cr-reason="${esc(x.id)}" maxlength="300"></textarea></label><div class="cr-actions">${actions.join('')}</div>`:''}</article>`}
async function render(el:any){const host=document.createElement('div');host.id='recipes-main';el.innerHTML='';el.appendChild(host);
 host.innerHTML=`<p class="muted">${T('Đang tải…','Loading…')}</p>`;let d:any;try{d=await get('studio-list')}catch(e:any){host.innerHTML=`<div class="card notice"><h1>${T('Không tải được','Could not load')}</h1><p>${esc(e.message)}</p></div>`;return}
 const rows=d.items.filter((x:any)=>filter==='all'||filter==='reported'?filter==='all'||x.reports.length:x.status===filter),locked=d.flagSource==='env',tabs=[['pending',T('Chờ duyệt','Pending'),d.stats.pending||0],['reported',T('Bị báo cáo','Reported'),d.items.filter((x:any)=>x.reports.length).length],['approved',T('Đã duyệt','Approved'),d.stats.approved||0],['rejected',T('Từ chối','Rejected'),d.stats.rejected||0],['removed',T('Đã gỡ','Removed'),d.stats.removed||0],['all',T('Tất cả','All'),d.items.length]];
 host.innerHTML=`<header class="page-head"><div><h1 tabindex="-1">${T('Món cộng đồng','Community recipes')}</h1><p class="muted">${T('Món gia đình chia sẻ chỉ hiện công khai sau khi duyệt. Mọi thao tác được ghi nhật ký kiểm tra. Duyệt món cộng +5 điểm cho người gửi (một lần).','Shared family recipes are public only after approval. Every action is audited. Approving gives the sender +5 points (once).')} <a href="/privacy.html#community-recipes" target="_blank" rel="noopener">${T('Quyền riêng tư','Privacy')}</a></p></div></header>
 <section class="card cr-flag" aria-label="${T('Công tắc tính năng','Feature switch')}"><label><input type="checkbox" id="cr-flag" ${d.enabled?'checked':''} ${locked?'disabled':''}> ${T('Bật Món cộng đồng trong ứng dụng','Community recipes on in the app')}</label><small class="muted">${locked?T('Đang đặt bằng biến môi trường.','Set by an environment variable.'):T('Tắt: ẩn mọi nút chia sẻ và nguồn Cộng đồng trong kho món.','Off: hides every share button and the Community source in the library.')}</small></section>
 <div class="cr-tabs" role="tablist">${tabs.map(([k,l,n])=>`<button role="tab" class="btn ${filter===k?'primary':''}" aria-selected="${filter===k}" data-cr-tab="${k}">${l} (${n})</button>`).join('')}</div>
 ${rows.length?`<div class="cr-list">${rows.map(item).join('')}</div>`:`<p class="empty">${T('Chưa có món nào ở đây.','Nothing here.')}</p>`}`;
 $$('[data-cr-tab]',host).forEach(b=>b.onclick=()=>{filter=b.dataset.crTab;render(el)});
 $('#cr-flag',host)?.addEventListener('change',async(e:any)=>{try{await saveFlag(e.target.checked);toast(T('Đã lưu.','Saved.'))}catch(x:any){toast(x.message,true);e.target.checked=!e.target.checked}});
 $$('[data-cr-photo]',host).forEach(async img=>{try{const r=await fetch(`${API}?op=studio-photo&id=${encodeURIComponent(img.dataset.crPhoto)}`,{credentials:'same-origin'});if(r.ok)img.src=URL.createObjectURL(await r.blob())}catch{}});
 $$('[data-cr]',host).forEach(b=>b.onclick=async()=>{const a=b.dataset.cr,id=b.dataset.id,reason=($(`[data-cr-reason="${CSS.escape(id)}"]`,host)?.value||'').trim();if(['reject','remove'].includes(a)&&reason.length<3){toast(T('Nhập lý do (ít nhất 3 ký tự).','Enter a reason (at least 3 characters).'),true);$(`[data-cr-reason="${CSS.escape(id)}"]`,host)?.focus();return}
  b.disabled=true;try{const r=await act({action:a,id,reason});toast(r.points?T(`Đã duyệt · +${r.points} điểm`,`Approved · +${r.points} points`):T('Đã xong.','Done.'));render(el)}catch(x:any){b.disabled=false;toast(x.message,true)}});}
registry.recipes={vi:'Món cộng đồng',en:'Community recipes',icon:'🍲',render};
})();
