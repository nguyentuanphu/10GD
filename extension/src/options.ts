// FamTray Scout — options page: pairing, onboarding checklist, stores, modes,
// schedule & caps, status, language/theme. Bilingual VI/EN; ≥44 px targets.
declare const chrome:any;
(async function scoutOptions(){
'use strict';
const G:any=globalThis,SC=G.ScoutClient,UI=G.ScoutUI,CORE=G.ScoutCore,T=UI.T,esc=UI.esc,$=UI.$;
await UI.init();
let msg='',msgBad=false;
const RET=['woolworths','coles','aldi','chemist','amazon'];
const say=(m:string,bad=false)=>{msg=m;msgBad=bad};
async function render(){
 const st=await SC.get(),v=st.device,paired=!!st.token,warn=UI.storeWarnings(st),sched=v?.schedule||CORE.DEFAULT_SCHEDULE,caps=v?.caps||{pagesPerRun:150,pagesPerDay:300};
 const ob=st.onboarding||{};
 document.title=T('Cài đặt FamTray So Giá','FamTray Price Check settings');
 $('#app').innerHTML=`
 <header class="bar"><h1><span class="logo" aria-hidden="true">◎</span> ${esc(T('FamTray So Giá','FamTray Price Check'))}</h1><div class="row"><button id="lang" class="btn ghost small" type="button">${UI.lang==='en'?'Tiếng Việt':'English'}</button><button id="theme" class="btn ghost small" type="button">${({auto:T('Giao diện: tự động','Theme: auto'),light:T('Giao diện: sáng','Theme: light'),dark:T('Giao diện: tối','Theme: dark')} as any)[UI.theme]}</button></div></header>
 <p class="lead">${T('Ghi lại giá trên kệ (tên, giá, giá theo đơn vị, giá cũ, khuyến mãi, quy cách, mã sản phẩm, cửa hàng) từ các trang siêu thị — không bao giờ lấy hình ảnh, mô tả, đánh giá hay thông tin cá nhân.','Records shelf facts (name, price, unit price, was-price, promotion, pack size, product id, store) from supermarket pages — never images, descriptions, reviews or personal data.')}</p>
 ${msg?`<p class="banner ${msgBad?'warn':'ok'}" role="${msgBad?'alert':'status'}">${esc(msg)}</p>`:''}
 ${warn.map((w:string)=>`<p class="banner warn" role="alert">${esc(w)}</p>`).join('')}
 <div class="grid">
 <section class="card" aria-labelledby="h-check"><h2 id="h-check">1. ${T('Chuẩn bị (bắt buộc)','Before you start (required)')}</h2>
  <ol class="check">
   <li><label class="switch"><input type="checkbox" data-ob="profile" ${ob.profile?'checked':''}><span>${T('Tôi dùng một hồ sơ Chrome RIÊNG cho FamTray So Giá (Chrome → biểu tượng hồ sơ → Thêm).','I use a SEPARATE Chrome profile for FamTray Price Check (Chrome → profile icon → Add).')}</span></label></li>
   <li><label class="switch"><input type="checkbox" data-ob="rewards" ${ob.rewards?'checked':''}><span>${T('Hồ sơ này KHÔNG đăng nhập Everyday Rewards, Flybuys hay tài khoản mua sắm nào.','This profile is NOT signed in to Everyday Rewards, Flybuys or any shopping account.')}</span></label>${Object.values(st.warnings?.signedIn||{}).some(Boolean)?`<p class="hint warn">${T('Phát hiện dấu hiệu đang đăng nhập — hãy đăng xuất hoặc dùng hồ sơ khác.','A signed-in indicator was detected — sign out or use another profile.')}</p>`:''}</li>
   <li><label class="switch"><input type="checkbox" data-ob="store" ${ob.store?'checked':''}><span>${T('Tôi đã mở từng trang siêu thị một lần và chọn cửa hàng gần nhà.','I opened each supermarket site once and selected my nearby store.')}</span></label></li>
  </ol>
 </section>
 <section class="card" aria-labelledby="h-pair"><h2 id="h-pair">2. ${T('Ghép nối','Pairing')}</h2>
 ${paired?`<p>${esc(T('Đã ghép nối: ','Paired: ')+(v?.name||st.deviceId))} ${v?.trusted?`<span class="chip">${T('Người dò giá tin cậy','Trusted price checker')}</span>`:''}</p><p class="muted">${esc(st.server)}</p><button id="unpair" class="btn danger" type="button">${T('Hủy ghép nối máy này','Unpair this device')}</button>`:`
  <p class="muted" data-easy-pair>${T('Cách dễ nhất: mở Bếp Gia Đình trên máy này → Bếp của tôi → Kết nối gia đình → “Ghép ngay”. Hoặc nhập mã bên dưới.','Easiest: open the family kitchen app on this computer → My kitchen → Family connection → “Pair now”. Or enter a code below.')}</p>
  <form id="pair" class="form">
   <label>${T('Địa chỉ ứng dụng','App address')}<input name="server" type="url" required placeholder="https://…" value="${esc(st.server)}" autocomplete="off"><small>${T('Địa chỉ bạn dùng để mở Bếp Gia Đình (hiện cạnh mã ghép nối).','The address you open the family kitchen app at (shown next to the pairing code).')}</small></label>
   <label>${T('Mã ghép nối (8 ký tự)','Pairing code (8 characters)')}<input name="code" required minlength="8" maxlength="9" autocomplete="one-time-code" autocapitalize="characters" spellcheck="false"></label>
   <label>${T('Tên máy','Device name')}<input name="name" maxlength="40" value="${esc(T('Máy tính ở nhà','Home computer'))}"></label>
   <div class="row2"><label>${T('Mã bưu điện','Postcode')}<input name="postcode" inputmode="numeric" pattern="\\d{4}" maxlength="4"></label><label>${T('Khu vực','Suburb')}<input name="suburb" maxlength="40"></label></div>
   <button class="btn primary" type="submit">${T('Ghép nối','Pair')}</button>
  </form>`}
 </section>
 <section class="card" aria-labelledby="h-stores"><h2 id="h-stores">3. ${T('Cửa hàng của máy này','Stores for this device')}</h2>
  <p class="muted">${T('Ghi đúng tên cửa hàng hiển thị trên trang siêu thị. Nếu trang hiển thị cửa hàng khác, giá sẽ bị gắn cờ.','Type the store name exactly as the supermarket site shows it. If the site shows another store, prices are flagged.')}</p>
  <form id="stores" class="form">${RET.map(r=>`<label>${UI.LABEL[r]}<input name="${r}" maxlength="60" value="${esc(v?.stores?.[r]||'')}" ${paired?'':'disabled'}>${st.warnings?.storesSeen?.[r]?`<small>${esc(T('Trang đang hiển thị: ','Site currently shows: ')+st.warnings.storesSeen[r])} <button type="button" class="link" data-use="${r}">${T('Dùng tên này','Use this')}</button></small>`:''}</label>`).join('')}
  <button class="btn" type="submit" ${paired?'':'disabled'}>${T('Lưu cửa hàng','Save stores')}</button></form>
 </section>
 <section class="card" aria-labelledby="h-modes"><h2 id="h-modes">4. ${T('Chế độ','Modes')}</h2>
  <label class="switch"><input type="checkbox" id="semi" ${st.semiEnabled!==false?'checked':''}><span><strong>${T('Bán tự động','Semi-auto')}</strong> — ${T('ghi giá trên trang BẠN mở.','captures prices on pages YOU open.')}</span></label>
  <fieldset class="sites"><legend>${T('Ghi giá trên các trang','Capture on these sites')}</legend>${RET.map(r=>`<label class="switch"><input type="checkbox" data-site="${r}" ${st.semiSites?.[r]!==false?'checked':''}><span>${UI.LABEL[r]}</span></label>`).join('')}</fieldset>
  <label class="switch"><input type="checkbox" id="auto" ${st.autoEnabled?'checked':''} ${paired?'':'disabled'}><span><strong>${T('Tự động','Auto')}</strong> — ${T('theo lịch, mở tối đa 1 trang mỗi 20–40 giây trong một cửa sổ riêng, chỉ khi bạn không dùng máy. Cần chủ Studio cho phép.','on schedule, at most 1 page every 20–40 seconds in its own window, only while you are away. Needs Studio approval.')}</span></label>
  <p class="muted">${v?esc(v.network?.autoScout!=='on'?T('Studio: tự động đang tắt cho cả mạng.','Studio: auto mode is off network-wide.'):v.autoAllowed?T('Studio: máy này được phép.','Studio: this device is allowed.'):T('Studio: chưa cho phép máy này.','Studio: this device is not allowed yet.')):''}</p>
 </section>
 <section class="card" aria-labelledby="h-sched"><h2 id="h-sched">5. ${T('Lịch & giới hạn','Schedule & limits')}</h2>
  <form id="sched" class="form">
   ${sched.map((w:any,i:number)=>`<fieldset class="win"><legend>${T('Khung giờ','Window')} ${i+1}</legend><div class="days">${UI.DAYS().map((d:string,k:number)=>`<label class="day"><input type="checkbox" name="d${i}" value="${k}" ${w.days.includes(k)?'checked':''}><span>${d}</span></label>`).join('')}</div><div class="row2"><label>${T('Từ','From')}<input type="time" name="s${i}" value="${esc(w.start)}"></label><label>${T('Đến','To')}<input type="time" name="e${i}" value="${esc(w.end)}"></label></div></fieldset>`).join('')}
   <div class="row2"><label>${T('Tối đa trang mỗi lần','Max pages per run')}<input type="number" name="run" min="1" max="200" value="${caps.pagesPerRun}"></label><label>${T('Tối đa trang mỗi ngày','Max pages per day')}<input type="number" name="day" min="1" max="600" value="${caps.pagesPerDay}"></label></div>
   <label>${T('Nhịp đọc trang của máy này','This computer’s page pace')}<select name="pace" ${paired?'':'disabled'}><option value="">${esc(T('Theo Studio','As Studio allows')+(v?.network?.pacing?' ('+UI.paceLabel(v.network.pacing.studioLimit||v.network.pacing)+')':''))}</option>${Object.entries<any>(UI.PACES()).filter(([k])=>!v?.network?.pacing?.studioLimit||UI.PACE_MS[k].minMs>=v.network.pacing.studioLimit.minMs).map(([k,l])=>`<option value="${k}" ${v?.network?.pacing?.deviceChoice===k?'selected':''}>${esc(l)}</option>`).join('')}</select><small>${T('Chỉ chọn được bằng hoặc chậm hơn mức Studio cho phép. Luôn một trang mỗi lần.','You can only choose the same as or slower than Studio allows. Always one page at a time.')}</small></label>
   <small>${T('Giờ theo máy này. Không chạy khi máy dùng pin (nếu trình duyệt cho biết), khi Chrome đóng, hoặc khi bạn đang dùng máy.','Times are this computer’s local time. Does not run on battery (when the browser can tell), when Chrome is closed, or while you are using the computer.')}</small>
   <button class="btn" type="submit" ${paired?'':'disabled'}>${T('Lưu lịch','Save schedule')}</button>
  </form>
 </section>
 <section class="card" aria-labelledby="h-status"><h2 id="h-status">${T('Trạng thái','Status')}</h2>
  <dl class="kv"><dt>${T('Lần chạy tới','Next run')}</dt><dd>${UI.nextRun(st)?esc(UI.when(UI.nextRun(st))):'—'}</dd>
  <dt>${T('Lần chạy trước','Last run')}</dt><dd>${st.lastRun?esc(UI.when(st.lastRun.at)+' · '+T(`${st.lastRun.pages} trang, ${st.lastRun.prices} giá`,`${st.lastRun.pages} pages, ${st.lastRun.prices} prices`)+' · '+UI.reason(st.lastRun.stop)):T('chưa có','never')}</dd>
  <dt>${T('Ghi giá gần nhất','Last capture')}</dt><dd>${st.lastSemi?.count?esc(T(`Đã lưu ${st.lastSemi.count} giá · ${st.lastSemi.retailerLabel||''}${st.lastSemi.store?' '+st.lastSemi.store:''}`,`Saved ${st.lastSemi.count} prices · ${st.lastSemi.retailerLabel||''}${st.lastSemi.store?' '+st.lastSemi.store:''}`)):'—'}</dd>
  <dt>${T('Phiên bản','Version')}</dt><dd data-scout-version>${esc('v'+SC.BUILD.version+' · '+T('cấu hình','config')+' '+(st.config?.version||SC.BUILD.configVersion||'—')+(st.config?.version&&SC.BUILD.configVersion&&st.config.version!==SC.BUILD.configVersion?' ('+T('kèm theo','bundled')+' '+SC.BUILD.configVersion+')':''))}</dd>
  <dt>${T('Bị chặn','Blocked events')}</dt><dd>${(st.blockedEvents||[]).length?esc((st.blockedEvents||[]).slice(0,3).map((b:any)=>UI.LABEL[b.retailer]+' · '+b.kind+' · '+UI.when(b.at)).join('; ')):'0'}</dd></dl>
  <div class="row"><button id="pause" class="btn big ${st.paused?'primary':'danger'}" type="button" aria-pressed="${st.paused?'true':'false'}">${st.paused?T('▶ Tiếp tục','▶ Resume'):T('⏸ Tạm dừng tất cả','⏸ Pause everything')}</button>${paired&&SC.BUILD.test?`<button id="runnow" class="btn" type="button">${T('Chạy thử ngay','Run now')}</button>`:''}</div>
 </section>
 <section class="card" aria-labelledby="h-rules"><h2 id="h-rules">${T('Cam kết','Our rules')}</h2>
  <ul class="plain">
   <li>${T('Không giả mạo trình duyệt, không proxy/VPN, không giải hay vượt CAPTCHA.','No browser spoofing, no proxies/VPN, never solves or bypasses CAPTCHAs.')}</li>
   <li>${T('Gặp trang xác minh, 403 hoặc 429: dừng ngay, tạm dừng 24 giờ và báo cho bạn.','On a check page, 403 or 429: stops at once, pauses for 24 hours and tells you.')}</li>
   <li>${T('Tôn trọng robots.txt của từng siêu thị cho các trang chạy tự động.','Respects each retailer’s robots.txt for the pages Auto mode visits.')}</li>
   <li>${T('Chỉ ghi dữ kiện giá; không đọc cookie hay thông tin tài khoản.','Records price facts only; never reads cookies or account details.')}</li>
  </ul>
 </section>
 </div>`;
 $('#lang').onclick=async()=>{UI.lang=UI.lang==='en'?'vi':'en';await SC.set({lang:UI.lang});document.documentElement.lang=UI.lang;render()};
 $('#theme').onclick=async()=>{UI.theme=({auto:'light',light:'dark',dark:'auto'} as any)[UI.theme];await SC.set({theme:UI.theme});UI.applyTheme();render()};
 document.querySelectorAll('[data-ob]').forEach((el:any)=>el.onchange=async()=>{const o=(await SC.get(['onboarding'])).onboarding;o[el.dataset.ob]=el.checked;await SC.set({onboarding:o})});
 document.querySelectorAll('[data-site]').forEach((el:any)=>el.onchange=async()=>{const s=(await SC.get(['semiSites'])).semiSites;s[el.dataset.site]=el.checked;await SC.set({semiSites:s})});
 document.querySelectorAll('[data-use]').forEach((el:any)=>el.onclick=()=>{const r=el.dataset.use;($('#stores') as any).elements[r].value=st.warnings.storesSeen[r]});
 $('#semi').onchange=async(e:any)=>SC.set({semiEnabled:e.target.checked});
 $('#auto').onchange=async(e:any)=>{const on=e.target.checked;if(on){const o=(await SC.get(['onboarding'])).onboarding;if(!o.profile||!o.rewards||!o.store){e.target.checked=false;say(T('Hãy hoàn tất danh sách chuẩn bị trước khi bật tự động.','Finish the checklist before switching Auto on.'),true);return render()}}await SC.set({autoEnabled:on});if(!on)chrome.runtime.sendMessage({type:'stop-run'}).catch(()=>{});chrome.runtime.sendMessage({type:'heartbeat'}).catch(()=>{});say(on?T('Đã bật tự động trên máy này.','Auto switched on for this device.'):T('Đã tắt tự động.','Auto switched off.'));render()};
 $('#pause').onclick=async()=>{const p=!(await SC.get(['paused'])).paused;await SC.set({paused:p});if(p)chrome.runtime.sendMessage({type:'stop-run'}).catch(()=>{});render()};
 $('#runnow')?.addEventListener('click',async()=>{const why=await chrome.runtime.sendMessage({type:'run-now',direct:true});say(why?UI.reason(why):T('Đã bắt đầu.','Started.'),!!why);render()});
 $('#unpair')?.addEventListener('click',async()=>{if(!confirm(T('Hủy ghép nối máy này?','Unpair this device?')))return;try{await SC.api('unpair',{})}catch{}await SC.set({token:'',deviceId:'',device:null,autoEnabled:false});say(T('Đã hủy ghép nối.','Unpaired.'));render()});
 $('#pair')?.addEventListener('submit',async(e:any)=>{e.preventDefault();const f=e.target,server=String(f.server.value||'').trim().replace(/\/+$/,'');
  if(!SC.serverOk(server)){say(T('Địa chỉ phải bắt đầu bằng https://','The address must start with https://'),true);return render()}
  await SC.set({server});
  try{const r=await SC.api('pair',{code:f.code.value,name:f.elements.namedItem('name').value,postcode:f.postcode.value,suburb:f.suburb.value,timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone,version:SC.BUILD.version},{token:''});await SC.set({token:r.token,deviceId:r.device.id,device:r.device});say(T('Đã ghép nối. Tiếp theo: nhập cửa hàng.','Paired. Next: enter your stores.'))}
  catch(err:any){say(T('Không ghép nối được: ','Could not pair: ')+(UI.lang==='en'?err.data?.errorEn||err.message:err.data?.error||err.message),true)}render()});
 $('#stores').onsubmit=async(e:any)=>{e.preventDefault();const stores:any={};for(const r of RET)stores[r]=e.target.elements[r].value.trim();try{const view=await SC.api('device-settings',{stores});await SC.set({device:view});const w=(await SC.get(['warnings'])).warnings;w.storeMismatch={};await SC.set({warnings:w});say(T('Đã lưu cửa hàng.','Stores saved.'))}catch(err:any){say(err.message,true)}render()};
 $('#sched').onsubmit=async(e:any)=>{e.preventDefault();const f=e.target,windows=sched.map((_:any,i:number)=>({days:[...f.querySelectorAll(`input[name=d${i}]:checked`)].map((x:any)=>+x.value),start:f[`s${i}`].value,end:f[`e${i}`].value})).filter((w:any)=>w.days.length);
  if(!CORE.validSchedule(windows)){say(T('Khung giờ không hợp lệ.','Invalid schedule.'),true);return render()}
  try{const view=await SC.api('device-settings',{schedule:windows,caps:{pagesPerRun:+f.run.value|0,pagesPerDay:+f.day.value|0},pacing:f.pace.value?f.pace.value:null});await SC.set({device:view});say(T('Đã lưu lịch.','Schedule saved.'))}catch(err:any){say(err.message,true)}render()};
}
chrome.storage.onChanged.addListener((_c:any,area:string)=>{if(area==='local'&&!document.activeElement?.matches?.('input,select,textarea'))render()});
render();
})();
