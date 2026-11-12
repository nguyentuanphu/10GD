// Studio · Hoá đơn gửi về / Receipts sent (v1.7.18, owner decision 12 Nov 2026). Separate classic script loaded on demand by
// studio.js (MODULES) and registered into window.studioPages like studio-feedback.js. Receipt TEXTS families sent from the app
// after correcting what the reader got wrong (never photos; card / member / receipt / phone numbers were removed on the phone and
// again by the server). For each report: the redacted text, the reader's lines next to the family's corrected lines, a status
// (mới → đã thêm test / bỏ qua) and “Tải chữ hoá đơn” — a text fixture a developer adds to src/tests/fixtures/receipts.cts.
// Owner / admin / moderator only (the server checks, functions/feedback.mts); every opened report and change is audited.
(function studioReceipts(){
'use strict';
const registry=(window as any).studioPages,main=document.getElementById('main');
if(!registry||!main)return;
const API='/.netlify/functions/feedback',STUDIO='/.netlify/functions/studio';
const lang=()=>{try{return localStorage.getItem('studio-lang')||(String(navigator.language||'').toLowerCase().startsWith('vi')?'vi':'en')}catch{return 'vi'}};
const T=(vi:string,en:string)=>lang()==='en'?en:vi;
const esc=(v:any)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'} as any)[c]);
const $=(s:string,r:any=document)=>r.querySelector(s) as any;
// owner instruction 6 Nov 2026: Sydney time, zone shown
const when=(v:string)=>{const d=new Date(v);return isNaN(+d)?'—':d.toLocaleString(lang()==='en'?'en-AU':'vi-VN',{timeZone:'Australia/Sydney',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})+(lang()==='en'?' Sydney time':' giờ Sydney')};
const STATUS:any={'new':['amber','Mới','New'],'test-added':['green','Đã thêm test','Test added'],'ignored':['','Bỏ qua','Ignored']};
const KIND:any={same:['Giống','Same'],name:['Sửa tên','Name fixed'],price:['Sửa giá','Price fixed'],qty:['Sửa lượng','Amount fixed'],added:['Gia đình thêm','Added by the family'],removed:['Gia đình bỏ','Removed by the family']};
const chip=(s:string)=>{const x=STATUS[s]||['',s,s];return `<span class="chip ${x[0]}">${esc(T(x[1],x[2]))}</span>`};
const kindText=(k:string)=>k.split('+').map(p=>T((KIND[p]||[p,p])[0],(KIND[p]||[p,p])[1])).join(' · ');
const money=(v:any)=>v==null?'—':(+v).toFixed(2);
let filt={status:'',page:1},data:any=null,error='',sel:any=null,host:any=null,csrf='',seq=0,busy=false;
async function handle(r:Response){let d:any={};try{d=await r.json()}catch{}if(!r.ok)throw Object.assign(new Error(lang()==='en'?d.errorEn||d.error||'Request failed':d.error||d.errorEn||'Lỗi'),{status:r.status});return d}
const get=(q:string)=>fetch(`${API}?${q}`,{credentials:'same-origin',headers:{Accept:'application/json'}}).then(handle);
async function post(op:string,body:any){if(!csrf)csrf=(await fetch(STUDIO+'?op=me',{credentials:'same-origin'}).then(handle)).csrf;return fetch(`${API}?op=${op}`,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','x-studio-csrf':csrf},body:JSON.stringify(body)}).then(handle)}
function toast(msg:string,bad=false){const t=$('#toast');if(!t)return;t.textContent=msg;t.className='toast show'+(bad?' bad':'');clearTimeout((toast as any).t);(toast as any).t=setTimeout(()=>t.className='toast',4200)}
const line=(l:any)=>l?`<b>${esc(l.name||'—')}</b><small>${l.qty==null?'':esc(l.qty+(l.unit?' '+l.unit:''))+' · '}${esc(money(l.price))}</small>`:'<span class="muted">—</span>';
function diffHTML(r:any){const rows=r.diff||[];
 return `<div class="rr-diff-wrap"><table class="rr-diff"><caption class="sr-only">${T('App đọc so với gia đình sửa','Read vs corrected')}</caption><thead><tr><th scope="col">${T('App đọc','The app read')}</th><th scope="col">${T('Gia đình sửa thành','Corrected by the family')}</th><th scope="col">${T('Khác gì','What changed')}</th></tr></thead>
 <tbody>${rows.map((x:any)=>`<tr class="rr-${esc(x.kind==='same'?'same':'changed')}"><td>${line(x.read)}</td><td>${line(x.corrected)}</td><td>${esc(kindText(x.kind))}</td></tr>`).join('')||`<tr><td colspan="3" class="muted">${T('Không có dòng.','No lines.')}</td></tr>`}</tbody></table></div>`}
function detailHTML(r:any){const fields=(r.changedFields||[]).map((k:string)=>({store:T('cửa hàng','store'),date:T('ngày','date'),total:T('tổng','total')} as any)[k]||k);
 const rows=[[T('Nhận lúc','Received'),when(r.at)],[T('Cửa hàng','Store'),`${r.read?.store||'—'} → ${r.corrected?.store||'—'}`],[T('Mã chuỗi','Retailer id'),r.retailer||'—'],[T('Ngày trên hoá đơn','Receipt date'),`${r.read?.date||'—'} → ${r.corrected?.date||'—'}`],[T('Tổng','Total'),`${money(r.read?.total)} → ${money(r.corrected?.total)}`],
  [T('Độ tin cậy khi đọc','Reading confidence'),r.confidence==null?'—':r.confidence+'%'],[T('Cảnh báo lúc đọc','Reader warnings'),(r.warnings||[]).join(', ')||'—'],[T('Phiên bản app','App build'),`${r.edition??'—'} · ${r.build||'—'}`],[T('Ngôn ngữ','Language'),String(r.lang||'').toUpperCase()],
  [T('Gửi từ','Sent from'),(r.source==='saved'?T('hoá đơn đã lưu','a saved receipt'):T('ảnh vừa đọc','a photo just read'))+' · '+(r.reporter?.account?T('có tài khoản','account'):T('dùng trên máy, không tài khoản','device only, no account'))],
  [T('Số dòng đã bỏ','Lines removed'),T(`${r.phoneRemoved||0} trên điện thoại · ${r.serverRemoved||0} ở máy chủ`,`${r.phoneRemoved||0} on the phone · ${r.serverRemoved||0} by the server`)]];
 return `<section class="card rr-detail" id="rr-detail" aria-labelledby="rr-h-detail"><div class="rr-detail-top"><h2 id="rr-h-detail" tabindex="-1">${esc(r.corrected?.store||r.read?.store||T('Hoá đơn','Receipt'))}</h2>${chip(r.status)}<button class="btn" type="button" id="rr-close">${T('Đóng','Close')}</button></div>
 <p class="muted">${T(`App đọc ${r.read?.lines?.length||0} dòng, gia đình sửa còn ${r.corrected?.lines?.length||0} dòng; ${r.changedLines||0} dòng khác`,`Read ${r.read?.lines?.length||0} lines, corrected to ${r.corrected?.lines?.length||0}; ${r.changedLines||0} lines differ`)}${fields.length?T(' · sửa ',' · fixed ')+esc(fields.join(', ')):''}.</p>
 <dl class="rr-meta">${rows.map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
 <h3>${T('App đọc và gia đình sửa','Read vs corrected')}</h3>${diffHTML(r)}
 <h3>${T('Chữ hoá đơn (đã che số)','Receipt text (numbers removed)')}</h3><pre class="rr-text" tabindex="0">${esc(r.text)}</pre>
 <div class="rr-actions"><button class="btn primary" type="button" id="rr-fixture">${T('Tải chữ hoá đơn','Download the receipt text')}</button>
 <form id="rr-status" class="filters"><label>${T('Trạng thái','Status')}<select name="status">${Object.keys(STATUS).map(s=>`<option value="${s}" ${r.status===s?'selected':''}>${esc(T(STATUS[s][1],STATUS[s][2]))}</option>`).join('')}</select></label><button class="btn" type="submit">${T('Lưu trạng thái','Save status')}</button></form>
 <button class="btn" type="button" id="rr-delete">${T('Xoá báo cáo này','Delete this report')}</button></div>
 <p class="muted">${T('Tệp tải về là một mục mẫu cho src/tests/fixtures/receipts.cts: chữ hoá đơn và điều gia đình đã sửa (tên các dòng, tổng). Thêm vào, chạy thử bộ đọc, rồi đánh dấu “Đã thêm test”.','The download is a fixture entry for src/tests/fixtures/receipts.cts: the receipt text and what the family corrected (line names, total). Add it, run the reader tests, then mark it “Test added”.')}</p></section>`}
function render(){
 if(!host)return;const d=data;
 const head=`<header class="page-head"><div><h1 tabindex="-1">${T('Hoá đơn gửi về','Receipts sent')}</h1><p class="muted">${T('Chữ hoá đơn gia đình gửi sau khi sửa chỗ app đọc sai — không bao giờ có ảnh; số thẻ, thành viên, số hoá đơn và số điện thoại đã bị bỏ trên điện thoại. Tự xoá sau 180 ngày. Mỗi lần mở và thay đổi được ghi nhật ký kiểm tra.','Receipt texts families sent after fixing what the app misread — never photos; card, member, receipt and phone numbers were removed on the phone. Deleted after 180 days. Every view and change is audited.')}</p></div><button class="btn" type="button" id="rr-refresh">${T('Làm mới','Refresh')}</button></header>`;
 if(error){host.innerHTML=head+`<div class="card notice"><p>${esc(error)}</p></div>`;wire();return}
 if(!d){host.innerHTML=head+`<p class="muted">${T('Đang tải…','Loading…')}</p>`;return}
 const pages=Math.max(1,Math.ceil(d.total/d.size)),opt=(v:string,l:string)=>`<option value="${esc(v)}" ${filt.status===v?'selected':''}>${esc(l)}</option>`;
 host.innerHTML=head+`<section class="card" aria-labelledby="rr-h-list"><h2 id="rr-h-list">${T('Danh sách','Reports')} <span class="chip amber">${d.counts?.new||0} ${T('mới','new')}</span> <span class="chip">${d.all} ${T('tổng','total')}</span></h2>
 <form class="filters" id="rr-f" role="search"><label>${T('Trạng thái','Status')}<select name="status">${opt('',T('Tất cả','All'))}${Object.keys(STATUS).map(s=>opt(s,T(STATUS[s][1],STATUS[s][2])+` (${d.counts?.[s]||0})`)).join('')}</select></label></form>
 ${d.rows.length?`<ol class="rr-list">${d.rows.map((r:any)=>`<li class="rr-row${sel?.id===r.id?' rr-sel':''}"><button type="button" class="rr-open" data-rr-open="${esc(r.id)}" aria-current="${sel?.id===r.id}"><span class="rr-row-top">${chip(r.status)}<b class="rr-store">${esc(r.store||T('Không rõ cửa hàng','Unknown store'))}</b><span class="rr-when">${esc(when(r.at))}</span></span><span class="rr-meta-line">${esc(r.retailer||'—')} · ${T('ngày','date')} ${esc(r.date||'—')} · ${T(`đọc ${r.readCount} dòng → sửa còn ${r.correctedCount} · ${r.changedLines} dòng khác`,`read ${r.readCount} → corrected ${r.correctedCount} · ${r.changedLines} differ`)}${(r.changedFields||[]).length?' · '+T('sửa','fixed')+' '+esc(r.changedFields.join(', ')):''}</span></button></li>`).join('')}</ol>`:`<p class="empty">${T('Chưa có hoá đơn nào được gửi về.','No receipts have been sent yet.')}</p>`}
 ${pages>1?`<div class="pager"><button class="btn" type="button" data-rr-page="${d.page-1}" ${d.page<=1?'disabled':''}>${T('Trước','Previous')}</button><span>${d.page}/${pages}</span><button class="btn" type="button" data-rr-page="${d.page+1}" ${d.page>=pages?'disabled':''}>${T('Sau','Next')}</button></div>`:''}</section>
 ${sel?detailHTML(sel):''}`;
 wire()}
// a fixture entry like the ones in src/tests/fixtures/receipts.cts (text + what the family's corrections say)
function fixtureText(r:any){const sydDay=(v:string)=>{try{return new Intl.DateTimeFormat('en-CA',{timeZone:'Australia/Sydney',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(v))}catch{return ''}};
 const key=[(r.retailer||'shop'),String(r.corrected?.store||r.read?.store||'receipt').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,30)||'receipt',r.id.slice(0,6)].join('-');
 const tick=(s:string)=>String(s).replace(/\\/g,'\\\\').replace(/`/g,'\\`').replace(/\$\{/g,'\\${');
 const goods=(r.corrected?.lines||[]).filter((l:any)=>l.name&&(l.price==null||l.price>=0));
 const expect:any={};if(r.retailer)expect.retailer=r.retailer;if(r.corrected?.total!=null)expect.printedTotal=r.corrected.total;if(r.corrected?.date)expect.date=r.corrected.date;expect.goods=goods.length;expect.names=goods.slice(0,8).map((l:any)=>l.name);
 return `// Receipt text sent from the app ${sydDay(r.at)} (Sydney time), report ${r.id}${r.retailer?', retailer '+r.retailer:''}.\n// Card, member, receipt and phone numbers were removed on the phone. Check “expect” against the family's corrected lines below,\n// add the entry to RECEIPTS in src/tests/fixtures/receipts.cts and run node tests/receipt-parse.test.cjs.\n`+
  ` '${key}':{text:\`${tick(r.text)}\`,expect:${JSON.stringify(expect)}},\n\n// Family's corrected lines (name · qty · price):\n`+(r.corrected?.lines||[]).map((l:any)=>`//   ${String(l.name).replace(/\n/g,' ')} · ${l.qty==null?'—':l.qty+(l.unit?' '+l.unit:'')} · ${money(l.price)}`).join('\n')+'\n'}
function download(){if(!sel)return;const blob=new Blob([fixtureText(sel)],{type:'text/plain;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`receipt-${sel.retailer||'shop'}-${sel.id.slice(0,6)}.txt`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);toast(T('Đã tải chữ hoá đơn.','Receipt text downloaded.'))}
function wire(){$('#rr-refresh',host)?.addEventListener('click',()=>load());
 const f=$('#rr-f',host);f?.addEventListener('change',()=>{filt={status:f.status.value,page:1};load()});
 host.querySelectorAll('[data-rr-page]').forEach((b:any)=>b.addEventListener('click',()=>{filt.page=+b.dataset.rrPage||1;load()}));
 host.querySelectorAll('[data-rr-open]').forEach((b:any)=>b.addEventListener('click',()=>open(b.dataset.rrOpen)));
 $('#rr-close',host)?.addEventListener('click',()=>{const id=sel?.id;sel=null;render();($(`[data-rr-open="${id}"]`,host)||$('h1',host))?.focus()});
 $('#rr-fixture',host)?.addEventListener('click',download);
 $('#rr-status',host)?.addEventListener('submit',(e:any)=>{e.preventDefault();act(()=>post('studio-receipt-status',{id:sel.id,status:e.target.status.value}),T('Đã lưu trạng thái.','Status saved.'),(d:any)=>{sel=d})});
 $('#rr-delete',host)?.addEventListener('click',()=>{if(!confirm(T('Xoá hẳn báo cáo này? Không khôi phục được.','Delete this report for good? It cannot be restored.')))return;act(()=>post('studio-receipt-delete',{id:sel.id}),T('Đã xoá báo cáo.','Report deleted.'),()=>{sel=null})});
}
async function act(fn:()=>Promise<any>,ok:string,then:(d:any)=>void){if(busy)return;busy=true;try{const d=await fn();then(d);toast(ok);await load(false);if(sel)$('#rr-h-detail',host)?.focus?.({preventScroll:true})}catch(e:any){toast(e.message,true)}finally{busy=false}}
async function open(id:string){try{sel=await get('op=studio-receipt&id='+encodeURIComponent(id));render();const h=$('#rr-h-detail',host);h?.scrollIntoView?.({block:'start'});h?.focus?.({preventScroll:true})}catch(e:any){toast(e.message,true)}}
async function load(paint=true){
 const n=++seq;error='';if(paint&&!data)render();
 try{const d=await get(new URLSearchParams({op:'studio-receipts',status:filt.status,page:String(filt.page),size:'20'}).toString());if(n!==seq)return;data=d;filt.page=d.page}
 catch(e:any){if(n!==seq)return;data=null;error=e.message}
 render()}
const css=`.rr-list{list-style:none;margin:0;padding:0;display:grid;gap:8px}.rr-open{display:grid;gap:4px;width:100%;min-height:44px;text-align:left;padding:10px 12px;border-radius:10px;border:1px solid var(--line,#e2e2da);background:transparent;color:inherit;font:inherit;cursor:pointer}
.rr-sel .rr-open{border-color:var(--green,#174e3c);box-shadow:0 0 0 2px #174e3c22}.rr-row-top{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center}.rr-store{overflow-wrap:anywhere}.rr-when,.rr-meta-line{color:var(--muted,#7b8379);font-size:.9em;overflow-wrap:anywhere}
.rr-detail-top{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.rr-detail-top h2{margin:0;flex:1 1 12em;overflow-wrap:anywhere}
.rr-meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(14em,1fr));gap:6px 16px;margin:10px 0}.rr-meta dt{color:var(--muted,#7b8379);font-size:.88em}.rr-meta dd{margin:0;overflow-wrap:anywhere}
.rr-diff-wrap{overflow-x:auto;max-width:100%}.rr-diff{width:100%;border-collapse:collapse;table-layout:fixed;min-width:0}.rr-diff th,.rr-diff td{padding:6px 8px;border-bottom:1px solid var(--line,#e2e2da);text-align:left;vertical-align:top;overflow-wrap:anywhere}
.rr-diff td b{display:block;font-weight:600}.rr-diff td small{color:var(--muted,#7b8379)}.rr-diff tr.rr-changed td{background:#fff4e0}html[data-theme="dark"] .rr-diff tr.rr-changed td{background:#2e2717}
.rr-text{max-height:24em;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;padding:10px 12px;border-radius:10px;border:1px solid var(--line,#e2e2da);font:.85em/1.45 ui-monospace,SFMono-Regular,Menlo,monospace}
.rr-actions{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;margin:12px 0}.rr-actions .btn{min-height:44px}.rr-actions .filters{margin:0}`;
if(!document.getElementById('studio-receipts-css')){const st=document.createElement('style');st.id='studio-receipts-css';st.textContent=css;document.head.append(st)}
registry.receipts={vi:'Hoá đơn gửi về',en:'Receipts sent',icon:'▤',async render(el:any){host=document.createElement('div');host.id='receipts-main';el.innerHTML='';el.appendChild(host);sel=null;await load()}};
(window as any).StudioReceipts={fixtureText};
})();
