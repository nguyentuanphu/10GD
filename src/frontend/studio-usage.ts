// Studio · Mức sử dụng / Usage (v1.7). Separate classic script loaded by dist/studio.html,
// registered into window.studioPages like studio-scout.js / studio-voice.js.
// One summary request (/.netlify/functions/usage?op=studio-usage-overview, cached 60 s on the
// server and here). Aggregates only by default; the inactive-family list and the per-family /
// per-account detail need an explicit click and are written to the Studio audit log by the server.
(function studioUsage(){
'use strict';
const registry=(window as any).studioPages;
if(!registry||!document.getElementById('main'))return;
const API='/.netlify/functions/usage',TTL=60000;
const lang=()=>{try{return localStorage.getItem('studio-lang')||(String(navigator.language||'').toLowerCase().startsWith('vi')?'vi':'en')}catch{return 'vi'}};
const T=(vi:string,en:string)=>lang()==='en'?en:vi;
const esc=(v:any)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'} as any)[c]);
const $=(s:string,r:any=document)=>r.querySelector(s) as any;
const loc=()=>lang()==='en'?'en-AU':'vi-VN';
const num=(v:any,d=0)=>v==null?'—':Number(v).toLocaleString(loc(),{maximumFractionDigits:d});
const pct=(v:any)=>v==null?'—':Math.round(v*100)+'%';
const dayLabel=(d:string)=>new Date(d+'T00:00:00Z').toLocaleDateString(loc(),{day:'2-digit',month:'short',timeZone:'UTC'});
const cache=new Map<number,{at:number,data:any}>();
let days=30,data:any=null,error='',extra='',host:any=null;

const css=`#usage-main .us-tools{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
#usage-main .us-tools select{min-height:44px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--panel);color:var(--text);font:inherit}
#usage-main .us-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,150px),1fr));gap:10px;margin:12px 0}
#usage-main .us-kpi{border:1px solid var(--line);border-radius:12px;padding:10px 12px;background:var(--panel);min-width:0}
#usage-main .us-kpi b{display:block;font-size:1.5rem;line-height:1.2;font-variant-numeric:tabular-nums}
#usage-main .us-kpi span{color:var(--muted);font-size:.9rem}
#usage-main .us-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:12px;margin:12px 0}
#usage-main .card{min-width:0}
#usage-main .us-series{display:flex;align-items:flex-end;gap:2px;height:90px;margin:8px 0 4px}
#usage-main .us-series i{flex:1 1 0;min-width:0;background:var(--brand2);border-radius:3px 3px 0 0}
#usage-main .us-heat{display:grid;grid-template-columns:auto repeat(24,minmax(0,1fr));gap:2px;font-size:11px;align-items:center}
#usage-main .us-heat .c{aspect-ratio:1/1;border-radius:3px;background:var(--brand2);min-width:0}
#usage-main .us-heat .h{color:var(--muted);text-align:center;overflow:hidden}
#usage-main .us-heat .w{color:var(--muted);padding-right:4px;white-space:nowrap}
#usage-main .us-list{list-style:none;margin:0;padding:0}
#usage-main .us-list li{display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid var(--line);min-width:0;overflow-wrap:anywhere}
#usage-main .us-list .n{white-space:nowrap;font-variant-numeric:tabular-nums;color:var(--muted)}
#usage-main .us-scroll{overflow-x:auto;max-width:100%}
#usage-main table.us-cohort{border-collapse:collapse;font-size:13px;font-variant-numeric:tabular-nums;min-width:100%}
#usage-main .us-cohort th,#usage-main .us-cohort td{padding:6px 8px;border-bottom:1px solid var(--line);text-align:right;white-space:nowrap}
#usage-main .us-cohort th:first-child,#usage-main .us-cohort td:first-child{text-align:left}
#usage-main .us-net{display:inline-block;font-size:12px;font-weight:700;padding:1px 8px;border-radius:999px;background:var(--warnbg);color:var(--warn)}
#usage-main .note{border-left:4px solid var(--accent);padding:8px 12px;background:var(--panel);border-radius:8px;margin:0 0 12px}
#usage-main .us-detail{margin-top:12px}
#usage-main .page-head p a{display:inline-flex;align-items:center;min-height:44px}`;
const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);

async function handle(r:Response){let d:any={};try{d=await r.json()}catch{}if(!r.ok)throw new Error(lang()==='en'?d.errorEn||d.error||'Request failed':d.error||d.errorEn||'Lỗi');return d}
const get=(q:string)=>fetch(`${API}?${q}`,{credentials:'same-origin',headers:{Accept:'application/json'}}).then(handle);
function toast(msg:string,bad=false){const t=$('#toast');if(!t)return;t.textContent=msg;t.className='toast show'+(bad?' bad':'');clearTimeout((toast as any).t);(toast as any).t=setTimeout(()=>t.className='toast',4200)}

const FEATURE:any={today:['Hôm nay','Today'],plan:['Thực đơn tuần','Weekly plan'],shopping:['Đi chợ','Shopping'],library:['Kho món ăn','Recipe library'],pantry:['Tủ thực phẩm','Pantry'],'recipe-edit':['Sửa món','Recipe editing'],voice:['Giọng nói','Voice'],'price-scout':['So Giá','Price Check'],'community-price':['Giá cộng đồng','Community prices'],'offline-download':['Tải offline','Offline downloads'],'family-connect':['Kết nối gia đình','Family connection'],reminders:['Nhắc nhở','Reminders'],spending:['Chi tiêu','Spending'],insights:['Thống kê','Insights'],settings:['Cài đặt','Settings']};
const fname=(id:string)=>FEATURE[id]?T(FEATURE[id][0],FEATURE[id][1]):id;
const WD=()=>lang()==='en'?['Mon','Tue','Wed','Thu','Fri','Sat','Sun']:['T2','T3','T4','T5','T6','T7','CN'];
const platName=(id:string)=>{const [p,m]=id.split('|');return ({mobile:T('Điện thoại','Phone'),tablet:T('Máy tính bảng','Tablet'),desktop:T('Máy tính','Computer'),unknown:T('Không rõ','Unknown')} as any)[p]+' · '+(m==='app'?T('app đã cài','installed app'):T('trình duyệt','browser'))};
const unk=(v:string)=>v==='unknown'?T('Không rõ','Unknown'):v;
const list=(rows:any[],line:(r:any)=>string)=>rows.length?`<ul class="us-list">${rows.map(r=>`<li>${line(r)}</li>`).join('')}</ul>`:`<p class="muted">${T('Chưa có dữ liệu.','Nothing here yet.')}</p>`;
function table(cols:[string,(r:any)=>string][],rows:any[],caption:string){if(!rows.length)return `<p class="muted">${T('Chưa có dữ liệu.','Nothing here yet.')}</p>`;return `<div class="tw"><table class="rt"><caption class="sr-only">${esc(caption)}</caption><thead><tr>${cols.map(c=>`<th scope="col">${esc(c[0])}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${cols.map(c=>`<td data-label="${esc(c[0])}">${c[1](r)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`}

function heatmap(h:number[][]){const max=Math.max(1,...h.flat()),wd=WD();
 const head=`<span></span>${Array.from({length:24},(_,i)=>`<span class="h" aria-hidden="true">${i%6===0?i:''}</span>`).join('')}`;
 const rows=h.map((row,d)=>`<span class="w">${wd[d]}</span>${row.map((m,hr)=>`<span class="c" style="opacity:${m?(0.15+0.85*m/max).toFixed(2):'0.06'}" title="${esc(wd[d]+' '+hr+':00 · '+m+' '+T('phút','min'))}"></span>`).join('')}`).join('');
 const summary=h.map((row,d)=>wd[d]+': '+row.map((m,hr)=>m?hr+'h '+m:'').filter(Boolean).join(', ')).join('; ');
 return `<div class="us-heat" role="img" aria-label="${esc(T('Phút sử dụng theo thứ và giờ','Minutes of use by weekday and hour')+'. '+summary)}">${head}${rows}</div>`}
function render(){
 if(!host)return;
 const head=`<header class="page-head"><div><h1 id="usage-h1" tabindex="-1">${T('Mức sử dụng','Usage')}</h1>
  <p class="muted">${T('Thống kê sử dụng ẩn danh: chỉ số phút, phiên và tính năng theo ngày; không có nội dung gia đình. Lưu 13 tháng.','Anonymous usage statistics: minutes, sessions and features per day only; no family content. Kept for 13 months.')} <a href="/privacy.html#usage" target="_blank" rel="noopener">${T('Quyền riêng tư','Privacy')}</a></p></div>
  <div class="us-tools"><label>${T('Khoảng','Range')} <select id="us-days">${[7,30,90].map(d=>`<option value="${d}" ${d===days?'selected':''}>${d} ${T('ngày','days')}</option>`).join('')}</select></label>
  <button class="btn" id="us-refresh" type="button">↻ ${T('Làm mới','Refresh')}</button></div></header>`;
 if(error){host.innerHTML=head+`<div class="card notice"><p>${esc(error)}</p></div>`;wire();return}
 if(!data){host.innerHTML=head+`<p class="muted">…</p>`;wire();return}
 const d=data,k=d.kpis,maxU=Math.max(1,...d.series.map((s:any)=>s.users));
 host.innerHTML=head+`
 ${d.collecting===false?`<p class="note">${T('Đang tắt thu thập cho mọi người (Cài đặt → Thống kê sử dụng ẩn danh).','Collection is switched off for everyone (Settings → Anonymous usage statistics).')}</p>`:''}
 <p class="note">${T('Người dùng = tài khoản nếu đã đăng nhập, nếu không thì một máy ẩn danh. Xem danh sách gia đình hoặc chi tiết một gia đình được ghi vào nhật ký kiểm tra.','A user is an account when signed in, otherwise one anonymous device. Opening the family list or one family’s detail is written to the audit log.')} · ${T('Tính lúc','Computed')} ${esc(new Date(d.computedAt).toLocaleTimeString(loc(),{hour:'2-digit',minute:'2-digit'}))}</p>
 <div class="us-kpis">
  <div class="us-kpi"><b>${num(k.dau)}</b><span>${T('Người dùng hôm nay (DAU)','Daily active (DAU)')}</span></div>
  <div class="us-kpi"><b>${num(k.wau)}</b><span>${T('7 ngày (WAU)','7 days (WAU)')}</span></div>
  <div class="us-kpi"><b>${num(k.mau)}</b><span>${T('30 ngày (MAU)','30 days (MAU)')}</span></div>
  <div class="us-kpi"><b>${num(k.avgMinutesPerUserDay,1)}</b><span>${T('phút / người / ngày dùng','min / user / active day')}</span></div>
  <div class="us-kpi"><b>${num(k.sessionsPerDay,1)}</b><span>${T('phiên / ngày','sessions / day')}</span></div>
  <div class="us-kpi"><b>${num(k.families)}</b><span>${T('gia đình có dùng','active families')} · ${num(k.accounts)} ${T('tài khoản','accounts')} · ${num(k.anonymous)} ${T('máy ẩn danh','anonymous')}</span></div>
 </div>
 <div class="us-grid">
  <section class="card" aria-labelledby="us-h-series"><h2 id="us-h-series">${T('Người dùng mỗi ngày','Users per day')}</h2>
   <div class="us-series" role="img" aria-label="${esc(d.series.map((s:any)=>dayLabel(s.day)+' '+s.users).join(', '))}">${d.series.map((s:any)=>`<i style="height:${Math.max(s.users?4:1,Math.round(s.users/maxU*90))}px" title="${esc(dayLabel(s.day)+': '+s.users+' · '+s.sessions+' '+T('phiên','sessions')+' · '+s.minutes+' '+T('phút','min'))}"></i>`).join('')}</div>
   <p class="muted">${dayLabel(d.from)} – ${dayLabel(d.today)} · ${num(k.sessions)} ${T('phiên','sessions')} · ${num(k.minutes)} ${T('phút','minutes')}</p></section>
  <section class="card" aria-labelledby="us-h-heat"><h2 id="us-h-heat">${T('Giờ cao điểm','Peak hours')}</h2>${heatmap(d.heatmap)}
   <p class="muted">${d.peakHours.length?d.peakHours.map((p:any)=>`${p.hour}:00–${p.hour+1}:00 (${num(p.minutes)} ${T('phút','min')})`).join(' · '):T('Chưa có dữ liệu.','Nothing here yet.')}</p></section>
  <section class="card" aria-labelledby="us-h-feat"><h2 id="us-h-feat">${T('Tính năng','Features')}</h2>
   ${table([[T('Tính năng','Feature'),r=>esc(fname(r.id))],[T('Lượt mở','Opens'),r=>num(r.count)],[T('Người dùng','Users'),r=>num(r.users)],[T('Gia đình','Families'),r=>num(r.families)]],d.features.filter((f:any)=>f.count),T('Tính năng','Features'))}</section>
  <section class="card" aria-labelledby="us-h-coh"><h2 id="us-h-coh">${T('Giữ chân theo tuần','Weekly retention')}</h2>
   <div class="us-scroll"><table class="us-cohort"><caption class="sr-only">${T('Nhóm theo tuần dùng lần đầu','Cohorts by week of first use')}</caption><thead><tr><th scope="col">${T('Tuần đầu','First week')}</th><th scope="col">${T('Số người','Users')}</th>${Array.from({length:8},(_,i)=>`<th scope="col">${T('T','W')}${i}</th>`).join('')}</tr></thead>
   <tbody>${d.cohorts.map((c:any)=>`<tr><td>${dayLabel(c.week)}</td><td>${num(c.size)}</td>${Array.from({length:8},(_,i)=>`<td>${c.size&&c.retention[i]!=null?pct(c.retention[i]):''}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>
  <section class="card" aria-labelledby="us-h-inact"><h2 id="us-h-inact">${T('Gia đình không hoạt động','Inactive families')}</h2>
   <ul class="us-list"><li><span>${T('Tổng số gia đình','All families')}</span><span class="n">${num(d.inactive.families)}</span></li><li><span>${T('Không dùng 14 ngày','No use in 14 days')}</span><span class="n">${num(d.inactive.inactive14)}</span></li><li><span>${T('Không dùng 30 ngày','No use in 30 days')}</span><span class="n">${num(d.inactive.inactive30)}</span></li><li><span>${T('Chưa từng ghi nhận','Never recorded')}</span><span class="n">${num(d.inactive.never)}</span></li></ul>
   <div class="us-tools" style="margin-top:8px"><button class="btn" type="button" data-us-inactive="14">${T('Xem danh sách 14 ngày','Show 14-day list')}</button><button class="btn" type="button" data-us-inactive="30">${T('Xem danh sách 30 ngày','Show 30-day list')}</button></div>
   <p class="muted">${T('Chỉ chủ Studio; được ghi vào nhật ký kiểm tra.','Studio owner only; written to the audit log.')}</p></section>
  <section class="card" aria-labelledby="us-h-loc"><h2 id="us-h-loc">${T('Vị trí','Location')}</h2>
   ${table([[T('Bang','State'),r=>esc(r.state||T('Không rõ','Unknown'))+(r.country&&r.country!=='AU'?' · '+esc(r.country):'')],[T('Postcode','Postcode'),r=>r.postcode?esc(r.postcode):'—'],[T('Nguồn','Source'),r=>r.source==='postcode'?T('Postcode gia đình','Family postcode'):r.source==='network'?`<span class="us-net">${T('Chỉ theo mạng','Network only')}</span>`:T('Không rõ','Unknown')],[T('Người dùng','Users'),r=>num(r.users)],[T('Gia đình','Families'),r=>num(r.families)]],d.locations,T('Vị trí','Location'))}
   <p class="muted">${T('Ưu tiên postcode So Giá của gia đình; nếu không có thì chỉ quốc gia và bang theo mạng. Không lưu IP, thành phố hay toạ độ.','Family Price Check postcode first; otherwise only country and state from the network. No IP, city or coordinates are stored.')}</p></section>
  <section class="card" aria-labelledby="us-h-plat"><h2 id="us-h-plat">${T('Thiết bị, phiên bản, ngôn ngữ','Devices, versions, languages')}</h2>
   <h3>${T('Thiết bị','Devices')}</h3>${list(d.platforms,r=>`<span>${esc(platName(r.id))}</span><span class="n">${num(r.users)}</span>`)}
   <h3>${T('Phiên bản','Versions')}</h3>${list(d.versions,r=>`<span><code>${esc(unk(r.id))}</code></span><span class="n">${num(r.users)}</span>`)}
   <h3>${T('Ngôn ngữ','Languages')}</h3>${list(d.languages,r=>`<span>${esc(r.id==='vi'?'Tiếng Việt':r.id==='en'?'English':unk(r.id))}</span><span class="n">${num(r.users)}</span>`)}</section>
 </div>
 <div id="us-extra" class="us-detail" aria-live="polite">${extra}</div>`;
 wire();
}
function wire(){
 const s=$('#us-days',host);if(s)s.onchange=()=>{days=+s.value||30;extra='';load()};
 const r=$('#us-refresh',host);if(r)r.onclick=()=>load(true);
 for(const b of host.querySelectorAll('[data-us-inactive]'))b.onclick=()=>inactive(+b.dataset.usInactive);
 for(const b of host.querySelectorAll('[data-us-family]'))b.onclick=()=>familyDetail(b.dataset.usFamily,b.dataset.usName||'');
}
async function inactive(threshold:number){
 try{const j=await get(`op=studio-usage-inactive&threshold=${threshold}`);
  extra=`<section class="card" aria-labelledby="us-h-list"><h2 id="us-h-list">${T(`Gia đình không dùng ${threshold} ngày`,`Families with no use in ${threshold} days`)} (${num(j.families.length)})</h2>
  ${table([[T('Gia đình','Family'),f=>esc(f.name||'—')],[T('Thành viên','Members'),f=>num(f.members)],[T('Lần cuối','Last seen'),f=>f.lastSeen?dayLabel(f.lastSeen):T('Chưa từng','Never')],['',f=>`<button class="btn small" type="button" data-us-family="${esc(f.id)}" data-us-name="${esc(f.name||'')}">${T('Chi tiết','Details')}</button>`]],j.families,T('Gia đình không hoạt động','Inactive families'))}
  <p class="muted">${T('Đã ghi vào nhật ký kiểm tra.','Written to the audit log.')}</p></section>`;render();$('#us-h-list',host)?.scrollIntoView?.({block:'start'});toast(T('Đã mở danh sách (ghi nhật ký).','List opened (audited).'))}catch(e:any){toast(e.message,true)}
}
async function familyDetail(id:string,name:string){
 try{const j=await get(`op=studio-usage-detail&family=${encodeURIComponent(id)}`);const l=j.location;
  extra+=`<section class="card" aria-labelledby="us-h-d-${esc(id)}"><h2 id="us-h-d-${esc(id)}">${esc(name||id)} · ${T('90 ngày','90 days')}</h2>
  <p class="muted">${num(j.installs)} ${T('máy','devices')} · ${l?esc((l.state||'—')+(l.postcode?' '+l.postcode:''))+(l.source==='network'?` <span class="us-net">${T('Chỉ theo mạng','Network only')}</span>`:''):'—'} · ${esc(j.platform?platName(j.platform+'|browser').split(' · ')[0]:'—')}</p>
  ${table([[T('Ngày','Day'),r=>dayLabel(r.day)],[T('Phút','Minutes'),r=>num(r.minutes)],[T('Phiên','Sessions'),r=>num(r.sessions)],[T('Tính năng','Features'),r=>esc(Object.entries(r.features).map(([k,n])=>fname(k)+' '+n).join(', ')||'—')]],j.rows,T('Chi tiết','Detail'))}
  <p class="muted">${T('Đã ghi vào nhật ký kiểm tra.','Written to the audit log.')}</p></section>`;render();toast(T('Đã mở chi tiết (ghi nhật ký).','Detail opened (audited).'))}catch(e:any){toast(e.message,true)}
}
async function load(fresh=false){
 error='';const c=cache.get(days);
 if(!fresh&&c&&Date.now()-c.at<TTL){data=c.data;render();return}
 if(!c)data=null;render();
 try{data=await get(`op=studio-usage-overview&days=${days}${fresh?'&fresh=1':''}`);cache.set(days,{at:Date.now(),data})}catch(e:any){data=null;error=e.message}
 render();
}
registry.usage={vi:'Mức sử dụng',en:'Usage',icon:'📈',async render(el:any){host=document.createElement('div');host.id='usage-main';el.innerHTML='';el.appendChild(host);extra='';await load()}};
})();
