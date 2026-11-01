// Studio · Giọng nói / Voice panel (v1.6). Separate classic script loaded by
// dist/studio.html after studio-scout.js, same approach as the Scout panel: adds a nav
// link and renders its own <main id="voice-main"> at #voice.
// Data comes from /.netlify/functions/voice-stats?op=studio-overview (owner only; every
// view and export is written to the Studio audit log by the server). It shows
// aggregates of opt-in, redacted text only: no transcripts, no audio, no account names.
(function studioVoice(){
'use strict';
if(!document.getElementById('nav')||!document.getElementById('main'))return;
const API='/.netlify/functions/voice-stats';
const lang=()=>{try{return localStorage.getItem('studio-lang')||(String(navigator.language||'').toLowerCase().startsWith('vi')?'vi':'en')}catch{return 'vi'}};
const T=(vi:string,en:string)=>lang()==='en'?en:vi;
const esc=(v:any)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'} as any)[c]);
const $=(s:string,r:any=document)=>r.querySelector(s) as any;
const pct=(v:any)=>v==null?'—':Math.round(v*1000)/10+'%';
const num=(v:any)=>Number(v||0).toLocaleString(lang()==='en'?'en-AU':'vi-VN');
let data:any=null,days=30,error='';

const css=`#voice-main .vs-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:12px;margin:12px 0}
#voice-main .vs-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,150px),1fr));gap:10px;margin:12px 0}
#voice-main .vs-kpi{border:1px solid var(--line);border-radius:12px;padding:10px 12px;background:var(--panel)}
#voice-main .vs-kpi b{display:block;font-size:1.5rem;line-height:1.2;font-variant-numeric:tabular-nums}
#voice-main .vs-kpi span{color:var(--muted);font-size:.9rem}
#voice-main .vs-tools{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
#voice-main .vs-tools select{min-height:44px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--panel);color:var(--text);font:inherit}
#voice-main .vs-list{list-style:none;margin:0;padding:0}
#voice-main .vs-list li{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid var(--line);overflow-wrap:anywhere;min-width:0}
#voice-main .vs-list li span:first-child{min-width:0}
#voice-main .vs-list .n{white-space:nowrap;font-variant-numeric:tabular-nums;color:var(--muted)}
#voice-main .vs-arrow{color:var(--muted)}
#voice-main code{font:600 .9em ui-monospace,Menlo,Consolas,monospace;overflow-wrap:anywhere}
#voice-main .vs-bar{height:8px;border-radius:4px;background:var(--line);overflow:hidden;margin-top:4px}
#voice-main .vs-bar i{display:block;height:100%;background:var(--accent)}
#voice-main .note{border-left:4px solid var(--accent);padding:8px 12px;background:var(--panel);border-radius:8px;margin:0 0 12px}`;
const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);

const host=document.createElement('main');host.id='voice-main';host.className='main';host.tabIndex=-1;host.hidden=true;host.setAttribute('aria-labelledby','voice-h1');
$('#main').after(host);
function navLink(){const nav=$('#nav');if(!nav||!nav.children.length)return;let a=$('a[href="#voice"]',nav);const on=location.hash==='#voice';
 if(!a){a=document.createElement('a');a.href='#voice';nav.appendChild(a)}
 const label=`<span aria-hidden="true">🎙</span>${esc(T('Giọng nói','Voice'))}`;if(a.innerHTML!==label)a.innerHTML=label;
 if(on){a.setAttribute('aria-current','page');for(const x of nav.querySelectorAll('a[aria-current]'))if(x!==a)x.removeAttribute('aria-current')}else a.removeAttribute('aria-current')}
new MutationObserver(navLink).observe($('#nav'),{childList:true,subtree:true,characterData:true});

async function handle(r:Response){let d:any={};try{d=await r.json()}catch{}if(!r.ok){throw new Error(lang()==='en'?d.errorEn||d.error||'Request failed':d.error||d.errorEn||'Lỗi')}return d}
const get=(op:string)=>fetch(`${API}?op=${op}&days=${days}`,{credentials:'same-origin',headers:{Accept:'application/json'}}).then(handle);
function toast(msg:string,bad=false){const t=$('#toast');if(!t)return;t.textContent=msg;t.className='toast show'+(bad?' bad':'');clearTimeout((toast as any).t);(toast as any).t=setTimeout(()=>t.className='toast',4200)}

const recName=(id:string)=>id==='browser'?T('Trình duyệt','Browser'):id==='typed'?T('Gõ tay','Typed'):id==='local-base'?T('Trên máy · Nhẹ','On device · Light'):id==='local-small'?T('Trên máy · Chính xác hơn','On device · More accurate'):id;
const list=(rows:any[],line:(r:any)=>string)=>rows.length?`<ul class="vs-list">${rows.map(r=>`<li>${line(r)}</li>`).join('')}</ul>`:`<p class="empty muted">${T('Chưa có dữ liệu.','Nothing here yet.')}</p>`;
const count=(r:any)=>`<span class="n">${num(r.count)}× · ${num(r.devices)} ${T('máy','devices')}</span>`;
function render(){
 const head=`<header class="page-head"><div><h1 id="voice-h1" tabindex="-1">${T('Giọng nói','Voice')}</h1>
  <p class="muted">${T('Thống kê nhận giọng nói từ các máy đã đồng ý (chỉ chữ đã lược bỏ thông tin riêng, không có âm thanh, không có tên). Lưu 90 ngày.','Voice recognition statistics from devices that opted in (redacted text only, no audio, no names). Kept for 90 days.')}</p></div>
  <div class="vs-tools"><label>${T('Khoảng','Range')} <select id="vs-days">${[7,30,90].map(d=>`<option value="${d}" ${d===days?'selected':''}>${d} ${T('ngày','days')}</option>`).join('')}</select></label>
  <button class="btn primary" id="vs-export" type="button" ${data?.total?'':'disabled'}>${T('Xuất gợi ý từ đồng nghĩa (JSON)','Export synonym suggestions (JSON)')}</button></div></header>`;
 if(error){host.innerHTML=head+`<div class="card notice"><p>${esc(error)}</p></div>`;wire();return}
 if(!data){host.innerHTML=head+`<p class="muted">…</p>`;wire();return}
 const d=data,u=d.unrecognised;
 host.innerHTML=head+`
 <p class="note">${T('Lượt xem và lượt xuất được ghi vào nhật ký kiểm tra Studio. Gợi ý chỉ để xem xét — không tự thêm vào từ điển.','Views and exports are written to the Studio audit log. Suggestions are for review only — nothing is added to the lexicon automatically.')}</p>
 <div class="vs-kpis">
  <div class="vs-kpi"><b>${num(d.total)}</b><span>${T('lượt xác nhận','confirmed previews')}</span></div>
  <div class="vs-kpi"><b>${num(d.devices)}</b><span>${T('máy đồng ý','opted-in devices')}</span></div>
  <div class="vs-kpi"><b>${pct(d.rates.unrecognised)}</b><span>${T('có từ không nhận ra','with unrecognised words')}</span></div>
  <div class="vs-kpi"><b>${pct(d.rates.corrected)}</b><span>${T('người dùng sửa lại','corrected by the person')}</span></div>
  <div class="vs-kpi"><b>${num(d.byLang.vi)} / ${num(d.byLang.en)} / ${num(d.byLang.auto)}</b><span>VI / EN / ${T('tự nhận','auto')}</span></div>
 </div>
 <div class="vs-grid">
  <section class="card" aria-labelledby="vs-uvi"><h2 id="vs-uvi">${T('Từ không nhận ra · Tiếng Việt','Unrecognised · Vietnamese')}</h2>${list(u.vi,r=>`<span lang="vi">${esc(r.phrase)}</span>${count(r)}`)}</section>
  <section class="card" aria-labelledby="vs-uen"><h2 id="vs-uen">${T('Từ không nhận ra · English','Unrecognised · English')}</h2>${list(u.en,r=>`<span lang="en">${esc(r.phrase)}</span>${count(r)}`)}${u.auto.length?`<h3>${T('Tự nhận ngôn ngữ','Auto-detected')}</h3>${list(u.auto,r=>`<span>${esc(r.phrase)}</span>${count(r)}`)}`:''}</section>
  <section class="card" aria-labelledby="vs-corr"><h2 id="vs-corr">${T('Sửa nhiều nhất','Top corrections')}</h2>${list(d.corrections,r=>`<span>“${esc(r.phrase)}” <span class="vs-arrow" aria-label="${T('thành','to')}">→</span> <code>${esc(r.id)}</code> <small class="muted">${r.kind==='recipe'?T('món','recipe'):T('nguyên liệu','ingredient')}</small></span>${count(r)}`)}</section>
  <section class="card" aria-labelledby="vs-rec"><h2 id="vs-rec">${T('Cách nhận giọng nói','Recognisers')}</h2>${list(d.recognizers,r=>`<span><b>${esc(recName(r.id))}</b><br><small class="muted">${T('Không nhận ra','Unrecognised')} ${pct(r.unrecognisedRate)} · ${T('Bị sửa','Corrected')} ${pct(r.correctionRate)}</small><span class="vs-bar" aria-hidden="true"><i style="width:${Math.round((r.share||0)*100)}%"></i></span></span><span class="n">${num(r.count)} · ${pct(r.share)}</span>`)}</section>
 </div>${d.truncated?`<p class="muted">${T('Chỉ tính 20 000 bản ghi đầu tiên.','Only the first 20,000 records were counted.')}</p>`:''}`;
 wire();
}
function wire(){
 const s=$('#vs-days',host);if(s)s.onchange=()=>{days=+s.value||30;load()};
 const x=$('#vs-export',host);if(x)x.onclick=async()=>{try{const j=await get('studio-export');const blob=new Blob([JSON.stringify(j,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`voice-synonym-suggestions-${new Date().toISOString().slice(0,10)}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2000);toast(T('Đã xuất gợi ý (ghi vào nhật ký).','Suggestions exported (audited).'))}catch(e:any){toast(e.message,true)}};
}
async function load(){error='';try{data=await get('studio-overview')}catch(e:any){data=null;error=e.message}render()}
let shown=false;
async function show(focus=false){const on=location.hash==='#voice';host.hidden=!on;if(on)$('#main').hidden=true;else if(shown)$('#main').hidden=!![...document.querySelectorAll('main.main[id$="-main"]')].some((m:any)=>m!==host&&!m.hidden);shown=on;navLink();if(on){render();await load();if(focus)$('#voice-h1',host)?.focus?.()}}
addEventListener('hashchange',()=>show(true));
document.getElementById('lang')?.addEventListener('click',()=>setTimeout(()=>{if(location.hash==='#voice')render();navLink()},0));
show();
})();
