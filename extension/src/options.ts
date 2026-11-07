// FamTray So Giá / Price Check — Settings page. v1.7.2 (owner: “hard to understand, scattered”):
// ONE column (max 720 px) and a clear step flow: 1. Ghép máy → 2. Cửa hàng → 3. Tự động
// (readiness checklist ①–⑤ with a fix for each missing step, schedule presets, pace) →
// Trạng thái & nhật ký → Quy tắc an toàn (collapsed). Finished steps collapse to one line with
// “Sửa”. Version/config in the footer; Unpair under “Nâng cao”. Bilingual VI/EN; ≥44 px targets.
declare const chrome:any;
(async function scoutOptions(){
'use strict';
const G:any=globalThis,SC=G.ScoutClient,UI=G.ScoutUI,CORE=G.ScoutCore,T=UI.T,esc=UI.esc,$=UI.$;
await UI.init();
let msg='',msgBad=false,dirty=false;
const RET=['woolworths','coles','aldi','chemist','amazon'];
const say=(m:string,bad=false)=>{msg=m;msgBad=bad};
const open=new Set<string>();// finished steps the person re-opened with “Sửa”
let edit:any=null;
let preview:any=null;// today's plan for this computer (loaded when “Xem trước” opens)
const CFG=await SC.config();// unsaved schedule editor state {preset, windows}
const hashTarget=()=>String(location.hash||'').slice(1);
{const h=hashTarget();if(h==='step-pair')open.add('pair');if(h==='prep'||h==='step-auto')open.add('auto');if(h==='step-stores')open.add('stores')}
const clone=(x:any)=>JSON.parse(JSON.stringify(x));
function stepHead(id:string,n:string,title:string,done:boolean,collapsed:boolean){
 return `<header class="step-head"><span class="step-n ${done?'done':''}" aria-hidden="true">${done?'✓':n}</span><h2 id="h-${id}">${n?`<span class="sr-only">${n}. </span>`:''}${esc(title)}</h2>${done?`<span class="chip">${T('Xong','Done')}</span>`:''}${done?`<button type="button" class="btn small ghost step-edit" data-edit="${id}" aria-expanded="${collapsed?'false':'true'}" aria-controls="body-${id}">${collapsed?T('Sửa','Edit'):T('Thu gọn','Collapse')}<span class="sr-only"> ${esc(title)}</span></button>`:''}</header>`}
function readyHtml(st:any){const steps=UI.readiness(st),studio=UI.studioUrl(st),ob=st.onboarding||{},paired=!!st.token,prepOk=UI.toggleReady(st);
 return `<ol class="ready-list" id="ready" aria-label="${T('Điều kiện để chạy tự động','What Auto mode needs')}">${steps.map((s:any,i:number)=>{
  let fix='';
  if(!s.ok&&s.fix==='pair')fix=`<button type="button" class="btn small primary" data-goto="step-pair">${esc(s.fixLabel)}</button>`;
  if(!s.ok&&s.fix==='studio')fix=studio&&paired?`<a class="btn small ${steps.findIndex((x:any)=>!x.ok)===i?'primary':''}" href="${esc(studio)}" target="_blank" rel="noopener" data-fix-studio="${s.id}">${esc(s.fixLabel)} ↗</a>`:`<span class="muted">${T('Ghép máy trước','Pair first')}</span>`;
  if(s.fix==='stores'&&paired){const mine=st.device?.stores||{};fix=`<ul class="store-chips" data-store-status>${RET.map(r=>mine[r]||UI.onlineOn(st).includes(r)?`<li class="chip" data-ready="${r}">✓ ${esc(UI.LABEL[r])}: ${esc(mine[r]?UI.storeText(mine[r]):UI.ONLINE())}</li>`:`<li><button type="button" class="btn small" data-open-retailer="${r}">${esc(T('Mở ','Open ')+UI.LABEL[r])} ↗</button></li>`).join('')}</ul>${s.ok?'':`<button type="button" class="btn small primary" data-goto="step-stores">${esc(s.fixLabel)}</button>`}`}
  if(s.fix==='prep')fix=`<details class="prep-d" id="prep-d" ${s.ok&&hashTarget()!=='prep'?'':'open'}><summary>${s.ok?T('Xem 3 xác nhận','See the 3 confirmations'):T('3 xác nhận','3 confirmations')}</summary><div class="prep-list">
   <label class="switch"><input type="checkbox" data-ob="profile" ${ob.profile?'checked':''}><span>${T('Tôi dùng một hồ sơ Chrome RIÊNG cho FamTray So Giá (Chrome → biểu tượng hồ sơ → Thêm).','I use a SEPARATE Chrome profile for FamTray Price Check (Chrome → profile icon → Add).')}</span></label>
   <label class="switch"><input type="checkbox" data-ob="rewards" ${ob.rewards?'checked':''}><span>${T('Hồ sơ này KHÔNG đăng nhập Everyday Rewards, Flybuys hay tài khoản mua sắm nào.','This profile is NOT signed in to Everyday Rewards, Flybuys or any shopping account.')}</span></label>${Object.values(st.warnings?.signedIn||{}).some(Boolean)?`<p class="hint warn">${T('Phát hiện dấu hiệu đang đăng nhập — hãy đăng xuất hoặc dùng hồ sơ khác.','A signed-in indicator was detected — sign out or use another profile.')}</p>`:''}
   <label class="switch"><input type="checkbox" data-ob="store" ${ob.store?'checked':''}><span>${T('Tôi đã mở từng trang siêu thị một lần và chọn cửa hàng gần nhà (bước 2).','I opened each supermarket site once and selected my nearby store (step 2).')}</span></label></div></details>`;
  if(s.fix==='toggle')fix=`<label class="switch"><input type="checkbox" id="auto" ${st.autoEnabled?'checked':''} ${paired?'':'disabled'}><span>${T('Tự động trên máy này','Auto on this computer')}${prepOk?'':` <small class="muted">${T('(cần ①, ④ và ⑤)','(needs ①, ④ and ⑤)')}</small>`}</span></label>`;
  return `<li data-step="${s.id}" data-ok="${s.ok}" ${s.id==='prep'?'id="prep"':''}><span class="n ${s.ok?'ok':''}" aria-hidden="true">${s.ok?'✓':UI.NUM[i]}</span><div class="t"><strong>${esc(s.title)}</strong><span class="sr-only"> — ${s.ok?T('xong','done'):T('còn thiếu','missing')}</span>${s.adminOnly&&!s.ok?` <small class="tag">${T('chỉ quản trị viên','admin only')}</small>`:''}${s.ok||s.fix==='prep'||s.fix==='toggle'?'':`<small class="muted" data-todo>${esc(s.todo)}</small>`}${s.adminOnly&&!s.ok?`<small class="muted">${T('Tài khoản này không phải quản trị viên Studio — nhờ quản trị viên bật giúp.','This account is not a Studio admin — ask the admin to do this.')}</small>`:''}${fix?`<div class="fix">${fix}</div>`:''}</div></li>`}).join('')}</ol>
 ${steps.every((s:any)=>s.ok)?`<p class="banner ok" data-auto-ready role="status">${esc(T('Tự động đã sẵn sàng. ','Auto is ready. ')+(UI.nextRun(st)?T('Lần chạy tới: ','Next run: ')+UI.short(UI.nextRun(st)):''))}</p>`:''}
 <p class="hint" data-runnow-note>${T('Chạy ngay dùng được khi ①–⑤ xong, kể cả ngoài lịch (không cần bật ⑥). Lịch chạy tự động cần đủ ①–⑥.','Run now works once ①–⑤ are done, even outside the schedule (⑥ not needed). Scheduled runs need ①–⑥.')}</p>`}
function schedHtml(st:any){const v=st.device,saved=v?.schedule||CORE.DEFAULT_SCHEDULE,caps=v?.caps||{pagesPerRun:150,pagesPerDay:300};
 if(!edit)edit={preset:UI.presetOf(saved),windows:clone(saved)};
 const custom=edit.preset==='custom';
 return `<form id="sched" class="form" novalidate>
  <fieldset class="presets"><legend>${T('Lịch chạy','Schedule')}</legend><div class="chips" role="radiogroup" aria-label="${T('Lịch chạy','Schedule')}">${['default','daily','custom'].map(k=>`<label class="chip-opt"><input type="radio" name="preset" value="${k}" ${edit.preset===k?'checked':''}><span>${esc(UI.presetLabel(k))}</span></label>`).join('')}</div>
  <div id="custom" ${custom?'':'hidden'}>${edit.windows.map((w:any,i:number)=>`<fieldset class="win" data-win="${i}"><legend class="sr-only">${T('Khung giờ','Window')} ${i+1}</legend><div class="days" role="group" aria-label="${T('Ngày','Days')} · ${T('khung','window')} ${i+1}">${UI.DAYS().map((d:string,k:number)=>`<label class="day"><input type="checkbox" name="d${i}" value="${k}" ${w.days.includes(k)?'checked':''}><span>${d}</span></label>`).join('')}</div>
   <div class="win-times"><label>${T('Từ','From')}<input type="time" name="s${i}" value="${esc(w.start)}"></label><label>${T('Đến','To')}<input type="time" name="e${i}" value="${esc(w.end)}"></label>${edit.windows.length>1?`<button type="button" class="btn small ghost" data-del-win="${i}">✕<span class="sr-only"> ${T('Xoá khung giờ','Remove window')} ${i+1}</span></button>`:''}</div></fieldset>`).join('')}
   ${edit.windows.length<4?`<button type="button" class="btn small" id="add-win">+ ${T('Thêm khung giờ','Add a window')}</button>`:''}</div>
  <p class="hint" id="sched-now">${esc(T('Đang lưu: ','Saved: ')+UI.scheduleText(saved))}</p></fieldset>
  <details class="caps-d" id="caps-d"><summary>${T('Giới hạn trang','Page limits')} · ${caps.pagesPerRun}/${T('lần','run')} · ${caps.pagesPerDay}/${T('ngày','day')}</summary><div class="row2"><label>${T('Tối đa trang mỗi lần','Max pages per run')}<input type="number" name="run" min="1" max="200" value="${caps.pagesPerRun}"></label><label>${T('Tối đa trang mỗi ngày','Max pages per day')}<input type="number" name="day" min="1" max="600" value="${caps.pagesPerDay}"></label></div></details>
  <small class="hint">${T('Giờ theo máy này. Không chạy khi máy dùng pin (nếu trình duyệt cho biết), khi Chrome đóng, hoặc khi bạn đang dùng máy.','Times are this computer’s local time. Does not run on battery (when the browser can tell), when Chrome is closed, or while you are using the computer.')}</small>
  <button class="btn primary" type="submit">${T('Lưu lịch','Save schedule')}</button>
 </form>`}
function paceHtml(st:any){const p=st.device?.network?.pacing,limit=p?.studioLimit||null,choice=p?.deviceChoice||'',cur=choice||p?.preset||'normal',names=UI.PACE_SHORT();
 return `<fieldset class="pace" id="pace"><legend>${T('Nhịp đọc trang','Page pace')}</legend>
  <div class="seg pace-seg" role="group" aria-label="${T('Nhịp đọc trang','Page pace')}">${Object.keys(names).map(k=>{const ok=UI.paceAllowed(k,limit);return `<button type="button" class="seg-btn pace-btn" data-pace="${k}" aria-pressed="${cur===k}" ${ok?'':`disabled aria-describedby="pace-limit"`}><span>${esc(names[k][0])}</span><small>${names[k][1]}</small></button>`}).join('')}</div>
  <small class="hint" id="pace-limit">${esc(T('Chỉ chọn được bằng hoặc chậm hơn mức Studio cho phép','Only Studio’s pace or slower')+(limit?' ('+UI.paceLabel(limit)+')':'')+'. '+T('Luôn một trang mỗi lần.','Always one page at a time.'))}${choice?` <button type="button" class="link" data-pace="">${T('Theo Studio','As Studio allows')}</button>`:` <span data-pace-source>${T('Đang theo Studio.','Following Studio.')}</span>`}</small></fieldset>`}
function storesHtml(st:any){const v=st.device,seen=st.warnings?.storesSeen||{},mine=v?.stores||{};
 return `<label class="switch"><input type="checkbox" id="semi" ${st.semiEnabled!==false?'checked':''}><span><strong>${T('Ghi giá khi bạn xem trang','Capture while you browse')}</strong> — ${T('bán tự động, chỉ trên trang BẠN mở.','semi-auto, only on pages YOU open.')}</span></label>
 <ul class="stores">${RET.map(r=>{const s=seen[r],m=mine[r],suggest=s&&s!==m,online=UI.isOnline(r,st)&&!m;
  // v1.7.3: Amazon AU / Chemist Warehouse — national online prices, no store to choose.
  const body=online?`<span data-store-current data-online="${r}">✓ ${esc(UI.ONLINE())}</span><small class="muted">${esc(T('Giá trực tuyến toàn quốc — không cần chọn cửa hàng.','National online prices — no store needed.'))}</small>`
   :`<span class="${m?'':'muted'}" data-store-current>${m?'✓ '+esc(UI.storeText(m)):T('Chưa chọn cửa hàng','No store yet')}</span>
   ${suggest?`<span class="store-seen">${esc(T('Trang đang hiển thị: ','Site shows: '))}“${esc(s)}”</span><button type="button" class="btn small primary" data-use="${r}">${T('Dùng tên này','Use this name')}<span class="sr-only"> ${esc(UI.LABEL[r]+' '+s)}</span></button>`
    :m?'':`<small class="muted">${esc(T(`Mở trang ${UI.LABEL[r]} — tên cửa hàng bạn chọn trên trang sẽ tự hiện ở đây.`,`Open ${UI.LABEL[r]} — the store chosen on the site appears here by itself.`))}</small><button type="button" class="btn small" data-open-retailer="${r}">${esc(T('Mở ','Open ')+UI.LABEL[r])} ↗</button>
    <form class="store-inline" data-store-form="${r}" novalidate><label for="st-in-${r}">${esc(T('Nhập tên cửa hàng','Type the store name'))}<span class="sr-only"> ${esc(UI.LABEL[r])}</span></label><span class="store-inline-row"><input id="st-in-${r}" name="store" maxlength="60" autocomplete="off" spellcheck="false" placeholder="${esc(T('ví dụ: Wolli Creek','e.g. Wolli Creek'))}"><button class="btn small primary" type="submit">${T('Lưu','Save')}<span class="sr-only"> ${esc(UI.LABEL[r])}</span></button></span></form>`}`;
  return `<li class="store-row" data-retailer="${r}"><div class="store-main"><strong>${UI.LABEL[r]}</strong>${body}</div>
   <label class="switch mini site-sw"><input type="checkbox" id="site-${r}" data-site="${r}" ${st.semiSites?.[r]!==false?'checked':''}><span>${T('Ghi giá','Capture')}<span class="sr-only"> ${UI.LABEL[r]}</span></span></label></li>`}).join('')}</ul>
 <details class="store-manual" id="store-manual"><summary>${T('Sửa tên cửa hàng bằng tay','Edit store names by hand')}</summary>
  <form id="stores" class="form"><p class="hint">${T('Gõ đúng như trang siêu thị ghi. Nếu trang hiển thị cửa hàng khác, giá sẽ bị gắn cờ. Để trống Amazon AU / Chemist Warehouse = trực tuyến.','Type it exactly as the site shows. If the site shows another store, prices are flagged. Leave Amazon AU / Chemist Warehouse empty = online.')}</p>${RET.map(r=>`<label for="sm-${r}">${UI.LABEL[r]}<input id="sm-${r}" name="${r}" maxlength="60" autocomplete="off" value="${esc(mine[r]||'')}" ${UI.isOnline(r,st)?`placeholder="${esc(UI.ONLINE())}"`:''}></label>`).join('')}
  <button class="btn" type="submit">${T('Lưu cửa hàng','Save stores')}</button></form></details>`}
async function render(){
 const st=await SC.get(),v=st.device,paired=!!st.token,warn=UI.storeWarnings(st),steps=UI.readiness(st),state=UI.state(st);
 document.title=T('Cài đặt FamTray So Giá','FamTray Price Check settings');
 // Step 2 stays open until a supermarket store is set (online-only retailers satisfy Auto step ④ but the
 // store boxes for Woolworths/Coles/ALDI stay visible) — or until capture is off for every store-based retailer.
 const physical=RET.filter(r=>!UI.isOnline(r,st)&&st.semiSites?.[r]!==false);
 const storesDone=paired&&(RET.some(r=>!UI.isOnline(r,st)&&v?.stores?.[r])||!physical.length&&UI.onlineOn(st).length>0)&&!RET.some(r=>st.warnings?.storesSeen?.[r]&&!v?.stores?.[r]&&!UI.isOnline(r,st));
 const autoDone=steps.every((s:any)=>s.ok);
 const c={pair:paired&&!open.has('pair'),stores:storesDone&&!open.has('stores'),auto:autoDone&&!open.has('auto')};
 const pace=v?.network?.pacing;
 const storeSum=RET.filter(r=>v?.stores?.[r]||UI.onlineOn(st).includes(r)).map(r=>UI.LABEL[r]+': '+(v?.stores?.[r]?UI.storeText(v.stores[r]):UI.ONLINE())).join(' · ');
 const nav=[['step-pair','1',T('Ghép máy','Pair'),paired],['step-stores','2',T('Cửa hàng','Stores'),storesDone],['step-auto','3',T('Tự động','Auto'),autoDone],['step-status','',T('Trạng thái','Status'),false],['rules','',T('Quy tắc','Rules'),false]];
 // Re-renders (storage changes) keep every disclosure as the person left it.
 const disclosures=new Map([...document.querySelectorAll('#app details[id]')].map((d:any)=>[d.id,d.open]));
 // v1.7.3 (owner: “it won't let me type and save Wolli Creek”): typed text, focus and caret survive re-renders.
 const typed=new Map([...document.querySelectorAll('#app input[id]:not([type=checkbox]):not([type=radio])')].filter((i:any)=>i.value!==i.defaultValue).map((i:any)=>[i.id,i.value]));
 const ae:any=document.activeElement,focusId=ae&&ae.id&&ae.closest?.('#app')?ae.id:'',caret=focusId&&typeof ae.selectionStart==='number'?[ae.selectionStart,ae.selectionEnd]:null;
 $('#app').innerHTML=`
 <header class="bar opt-bar"><h1><span class="logo" aria-hidden="true">◎</span> ${esc(T('FamTray So Giá','FamTray Price Check'))}</h1>
  <div class="row opt-tools"><div class="seg" role="group" aria-label="${T('Ngôn ngữ','Language')}"><button type="button" class="seg-btn" data-lang="vi" lang="vi" aria-pressed="${UI.lang!=='en'}">VI</button><button type="button" class="seg-btn" data-lang="en" lang="en" aria-pressed="${UI.lang==='en'}">EN</button></div>
  <div class="seg" role="group" aria-label="${T('Giao diện','Theme')}">${[['auto','🌓',T('Tự động','Auto')],['light','☀️',T('Sáng','Light')],['dark','🌙',T('Tối','Dark')]].map(([k,i,l])=>`<button type="button" class="seg-btn" data-theme="${k}" aria-pressed="${UI.theme===k}" title="${esc(l)}"><span aria-hidden="true">${i}</span><span class="sr-only">${esc(T('Giao diện: ','Theme: ')+l)}</span></button>`).join('')}</div></div></header>
 <p class="lead">${T('Ghi giá trên kệ từ các trang siêu thị bạn xem cho Bếp Nhà. Làm lần lượt 3 bước dưới đây.','Saves shelf prices from the supermarket pages you view for your family kitchen. Do the 3 steps below in order.')}</p>
 <nav class="step-nav" aria-label="${T('Các bước','Steps')}"><ol>${nav.map(([id,n,l,d])=>`<li><a href="#${id}" data-nav="${id}" class="${d?'done':''}">${d?'✓':n?`<span aria-hidden="true">${n}</span>`:''} ${esc(l as string)}</a></li>`).join('')}</ol></nav>
 ${msg?`<p class="banner ${msgBad?'warn':'ok'}" role="${msgBad?'alert':'status'}" data-msg>${esc(msg)}</p>`:''}
 ${st.notAssigned?`<p class="banner warn" role="alert" data-not-assigned>${T('Tài khoản này chưa được cấp quyền dùng tiện ích. Liên hệ quản trị.','This account isn’t allowed to use the extension yet. Contact the admin.')}</p>`:''}
 ${warn.map((w:string)=>`<p class="banner warn" role="alert">${esc(w)}</p>`).join('')}
 ${UI.updateHtml(st)}
 <section class="card step ${c.pair?'collapsed':''}" id="step-pair" aria-labelledby="h-pair">${stepHead('pair','1',T('Ghép máy','Pair this computer'),paired,c.pair)}
  ${c.pair?`<p class="step-sum">${esc(T('Đã ghép nối: ','Paired: ')+(v?.name||st.deviceId))}</p>`:`<div id="body-pair" class="step-body">
  ${paired?`<p>${esc(T('Đã ghép nối: ','Paired: ')+(v?.name||st.deviceId))} ${v?.trusted?`<span class="chip">${T('Người dò giá tin cậy','Trusted price checker')}</span>`:''}</p><p class="muted">${esc(st.server)}</p><p class="hint">${T('Hủy ghép nối nằm ở “Nâng cao” cuối trang.','Unpair is under “Advanced” at the bottom.')}</p>`:`
  <p class="muted" data-easy-pair>${T('Cách dễ nhất: mở Bếp Nhà trên máy này → Bếp của tôi → Kết nối gia đình → “Ghép ngay”. Hoặc nhập mã bên dưới.','Easiest: open the family kitchen app on this computer → My kitchen → Family connection → “Pair now”. Or enter a code below.')}</p>
  ${UI.appBase(st)?`<button type="button" class="btn primary" id="open-app">🔗 ${T('Mở Bếp Nhà để ghép','Open FamTray to pair')}</button>`:''}
  <form id="pair" class="form pair-form"><p class="sub">${T('Hoặc nhập mã','Or enter a code')}</p>
   <label>${T('Địa chỉ ứng dụng','App address')}<input name="server" type="url" required placeholder="https://…" value="${esc(st.server)}" autocomplete="off"><small>${T('Địa chỉ bạn dùng để mở Bếp Nhà (hiện cạnh mã ghép nối).','The address you open the family kitchen app at (shown next to the pairing code).')}</small></label>
   <label>${T('Mã ghép nối (8 ký tự)','Pairing code (8 characters)')}<input name="code" required minlength="8" maxlength="9" autocomplete="one-time-code" autocapitalize="characters" spellcheck="false"></label>
   <label>${T('Tên máy','Device name')}<input name="name" maxlength="40" value="${esc(T('Máy tính ở nhà','Home computer'))}"></label>
   <div class="row2"><label>${T('Mã bưu điện','Postcode')}<input name="postcode" inputmode="numeric" pattern="\\d{4}" maxlength="4"></label><label>${T('Khu vực','Suburb')}<input name="suburb" maxlength="40"></label></div>
   <button class="btn primary" type="submit">${T('Ghép nối','Pair')}</button>
  </form>`}</div>`}
 </section>
 <section class="card step ${c.stores?'collapsed':''}" id="step-stores" aria-labelledby="h-stores">${stepHead('stores','2',T('Cửa hàng','Stores'),storesDone,c.stores)}
  ${c.stores?`<p class="step-sum">${esc(storeSum)}</p>`:`<div id="body-stores" class="step-body">${paired?storesHtml(st):`<p class="muted">${T('Ghép máy ở bước 1 trước.','Pair this computer in step 1 first.')}</p>`}</div>`}
 </section>
 <section class="card step ${c.auto?'collapsed':''}" id="step-auto" aria-labelledby="h-auto">${stepHead('auto','3',T('Tự động','Auto mode'),autoDone,c.auto)}
  ${c.auto?`<p class="step-sum">${esc(T('Sẵn sàng','Ready')+' · '+UI.scheduleText(v?.schedule||CORE.DEFAULT_SCHEDULE)+(pace?' · '+(UI.PACE_SHORT()[pace.preset]?.[0]||UI.paceLabel(pace)):''))}</p>`:`<div id="body-auto" class="step-body">
  <p class="muted">${T('Tự động mở tối đa 1 trang mỗi lần trong một cửa sổ riêng, theo lịch, chỉ khi bạn không dùng máy. Cần đủ 5 điều kiện:','Auto opens at most one page at a time in its own window, on schedule, only while you are away. It needs all 5:')}</p>
  ${readyHtml(st)}
  ${paired?schedHtml(st)+paceHtml(st):''}</div>`}
 </section>
 <section class="card step" id="step-status" aria-labelledby="h-status"><header class="step-head"><h2 id="h-status">${T('Trạng thái & nhật ký','Status & log')}</h2></header>
  <p class="summary" data-state="${state.key}" role="status">${esc(state.line)}</p>
  <dl class="kv"><dt>${T('Lần chạy tới','Next run')}</dt><dd>${UI.nextRun(st)?esc(UI.when(UI.nextRun(st))):'—'}</dd>
  <dt>${T('Lần chạy trước','Last run')}</dt><dd data-last-run>${esc(UI.lastRunText(st.lastRun))}</dd>
  <dt>${T('Ghi giá gần nhất','Last capture')}</dt><dd>${st.lastSemi?.count?esc(UI.lastCapture(st.lastSemi)):'—'}</dd>
  <dt>${T('Nhịp','Pace')}</dt><dd data-pace-label>${esc(UI.paceLabel(pace))}</dd>
  <dt>${T('Bị chặn','Blocked events')}</dt><dd>${(st.blockedEvents||[]).length?esc((st.blockedEvents||[]).slice(0,3).map((b:any)=>UI.LABEL[b.retailer]+' · '+b.kind+' · '+UI.when(b.at)).join('; ')):'0'}</dd></dl>
  ${st.lastRun?UI.visitsHtml(st.lastRun,'last-run'):''}
  ${paired?`<details class="visits" id="preview"><summary>${T('Xem trước hôm nay sẽ xem gì','Preview what it will look at today')}</summary><div id="preview-body">${UI.previewHtml(preview)}</div></details>`:''}
  <div class="row"><button id="pause" class="btn ${st.paused?'primary':'danger'}" type="button" aria-pressed="${st.paused?'true':'false'}">${st.paused?T('▶ Tiếp tục','▶ Resume'):T('⏸ Tạm dừng tất cả','⏸ Pause everything')}</button>${paired&&UI.runNowReady(st)&&!st.run?`<button id="runnow" class="btn" type="button">▶ ${T('Chạy ngay','Run now')}</button>`:''}</div>
 </section>
 <details class="card step rules" id="rules"><summary><h2 id="h-rules">${T('Quy tắc an toàn','Safety rules')}</h2></summary>
  <p class="muted">${T('Chỉ ghi dữ kiện trên kệ (tên, giá, giá theo đơn vị, giá cũ, khuyến mãi, quy cách, mã sản phẩm, cửa hàng) — không bao giờ lấy hình ảnh, mô tả, đánh giá hay thông tin cá nhân.','Records shelf facts only (name, price, unit price, was-price, promotion, pack size, product id, store) — never images, descriptions, reviews or personal data.')}</p>
  <ul class="plain">
   <li>${T('Không giả mạo trình duyệt, không proxy/VPN, không giải hay vượt CAPTCHA.','No browser spoofing, no proxies/VPN, never solves or bypasses CAPTCHAs.')}</li>
   <li>${T('Gặp trang xác minh, 403 hoặc 429: dừng ngay, tạm dừng 24 giờ và báo cho bạn.','On a check page, 403 or 429: stops at once, pauses for 24 hours and tells you.')}</li>
   <li>${T('Tôn trọng robots.txt của từng siêu thị cho các trang chạy tự động.','Respects each retailer’s robots.txt for the pages Auto mode visits.')}</li>
   <li>${T('Chỉ ghi dữ kiện giá; không đọc cookie hay thông tin tài khoản.','Records price facts only; never reads cookies or account details.')}</li>
  </ul></details>
 <footer class="opt-foot"><p class="muted" data-scout-version>${esc('v'+SC.version()+' · '+T('cấu hình','config')+' '+(st.config?.version||SC.BUILD.configVersion||'—')+(st.config?.version&&SC.BUILD.configVersion&&st.config.version!==SC.BUILD.configVersion?' ('+T('kèm theo','bundled')+' '+SC.BUILD.configVersion+')':''))}</p>
  <details id="advanced"><summary>${T('Nâng cao','Advanced')}</summary>
   ${paired?`<p class="muted">${esc(T('Máy: ','Device: ')+(v?.name||'')+' · '+st.deviceId)}<br>${esc(st.server)}</p><button id="unpair" class="btn danger" type="button">${T('Hủy ghép nối máy này','Unpair this device')}</button>`:`<p class="muted">${T('Chưa ghép nối.','Not paired.')}</p>`}
  </details></footer>`;
 for(const [k,isOpen] of disclosures){const d=document.getElementById(k) as any;if(d)d.open=isOpen}
 for(const [k,val] of typed){const i=document.getElementById(k) as any;if(i)i.value=val}
 if(focusId){const f=document.getElementById(focusId) as any;if(f){f.focus({preventScroll:true});if(caret)try{f.setSelectionRange(caret[0],caret[1])}catch{}}}
 const rerender=()=>{dirty=false;render()};
 document.querySelectorAll('[data-lang]').forEach((b:any)=>b.onclick=async()=>{if(UI.lang===b.dataset.lang)return;UI.lang=b.dataset.lang;await SC.set({lang:UI.lang});document.documentElement.lang=UI.lang;rerender()});
 // v1.7.3 root cause: '[data-theme]' also matched <html data-theme>, so EVERY click re-rendered the page
 // (the typed store name vanished and focus was lost). Only the theme buttons inside the page.
 document.querySelectorAll('#app button[data-theme]').forEach((b:any)=>b.onclick=async()=>{UI.theme=b.dataset.theme;await SC.set({theme:UI.theme});UI.applyTheme();rerender()});
 document.querySelectorAll('[data-edit]').forEach((b:any)=>b.onclick=()=>{const id=b.dataset.edit;if(open.has(id))open.delete(id);else open.add(id);if(id==='auto')edit=null;rerender();$('#step-'+id)?.scrollIntoView({block:'start'});($('#step-'+id+' [data-edit]') as any)?.focus()});
 document.querySelectorAll('[data-goto]').forEach((b:any)=>b.onclick=()=>{const t=$('#'+b.dataset.goto);t?.scrollIntoView({block:'start'});(t?.querySelector('input,button,a') as any)?.focus()});
 document.querySelectorAll('[data-ob]').forEach((el:any)=>el.onchange=async()=>{const o=(await SC.get(['onboarding'])).onboarding;o[el.dataset.ob]=el.checked;await SC.set({onboarding:o});rerender()});
 document.querySelectorAll('[data-site]').forEach((el:any)=>el.onchange=async()=>{const s=(await SC.get(['semiSites'])).semiSites;s[el.dataset.site]=el.checked;await SC.set({semiSites:s})});
 const saveStores=async(stores:any,done:string,clear?:()=>void)=>{try{const view=await SC.api('device-settings',{stores});await SC.set({device:view});const w=(await SC.get(['warnings'])).warnings;w.storeMismatch={};await SC.set({warnings:w});clear?.();say(done)}catch(err:any){say(T('Chưa lưu được cửa hàng: ','Store not saved: ')+(UI.lang==='en'?err.data?.errorEn||err.message:err.data?.error||err.message),true)}rerender()};
 document.querySelectorAll('[data-store-form]').forEach((f:any)=>f.addEventListener('submit',async(e:any)=>{e.preventDefault();const r=f.dataset.storeForm,inp=f.elements.store,name=String(inp.value||'').replace(/\s+/g,' ').trim();
  if(name.length<2){say(T(`Nhập tên cửa hàng ${UI.LABEL[r]} (ít nhất 2 ký tự).`,`Type the ${UI.LABEL[r]} store name (at least 2 characters).`),true);return rerender()}
  f.querySelector('button').disabled=true;const cur=await SC.get(['device']);await saveStores({...(cur.device?.stores||{}),[r]:name},T(`Đã lưu cửa hàng ${UI.LABEL[r]}: ${name}.`,`Saved the ${UI.LABEL[r]} store: ${name}.`),()=>{inp.value=inp.defaultValue})}));
 document.querySelectorAll('[data-use]').forEach((el:any)=>el.onclick=async()=>{el.disabled=true;const cur=await SC.get(['device','warnings']),r=el.dataset.use;await saveStores({...(cur.device?.stores||{}),[r]:cur.warnings.storesSeen[r]},T('Đã lưu cửa hàng.','Stores saved.'))});
 $('#semi')?.addEventListener('change',async(e:any)=>SC.set({semiEnabled:e.target.checked}));
 $('#open-app')?.addEventListener('click',()=>chrome.tabs.create({url:UI.appBase(st)+'/#pair-extension'}));
 $('#auto')?.addEventListener('change',async(e:any)=>{const on=e.target.checked;if(on){if(!UI.toggleReady(await SC.get())){e.target.checked=false;say(T('Cần ① ghép máy, ④ ít nhất 1 cửa hàng và ⑤ chuẩn bị máy trước khi bật tự động.','Needs ① paired, ④ at least one store and ⑤ a prepared computer before Auto can be switched on.'),true);return rerender()}}await SC.set({autoEnabled:on});if(!on)chrome.runtime.sendMessage({type:'stop-run'}).catch(()=>{});chrome.runtime.sendMessage({type:'heartbeat'}).catch(()=>{});say(on?T('Đã bật tự động trên máy này.','Auto switched on for this device.'):T('Đã tắt tự động.','Auto switched off.'));rerender()});
 $('#pause').onclick=async()=>{const p=!(await SC.get(['paused'])).paused;await SC.set({paused:p});if(p)chrome.runtime.sendMessage({type:'stop-run'}).catch(()=>{});rerender()};
 $('#runnow')?.addEventListener('click',async()=>{const why=await chrome.runtime.sendMessage({type:'run-now',local:true,direct:!!SC.BUILD.test});say(why?UI.reason(why):T('Đã bắt đầu.','Started.'),!!why);rerender()});
 $('#unpair')?.addEventListener('click',async()=>{if(!confirm(T('Hủy ghép nối máy này?','Unpair this device?')))return;try{await SC.api('unpair',{})}catch{}await SC.set({token:'',deviceId:'',device:null,autoEnabled:false});open.clear();edit=null;say(T('Đã hủy ghép nối.','Unpaired.'));rerender()});
 $('#pair')?.addEventListener('submit',async(e:any)=>{e.preventDefault();const f=e.target,server=String(f.server.value||'').trim().replace(/\/+$/,'');
  if(!SC.serverOk(server)){say(T('Địa chỉ phải bắt đầu bằng https://','The address must start with https://'),true);return rerender()}
  await SC.set({server});
  try{const r=await SC.api('pair',{code:f.code.value,name:f.elements.namedItem('name').value,postcode:f.postcode.value,suburb:f.suburb.value,timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone,version:SC.BUILD.version},{token:''});await SC.set({token:r.token,deviceId:r.device.id,device:r.device});say(T('Đã ghép nối. Tiếp theo: bước 2 — cửa hàng.','Paired. Next: step 2 — stores.'))}
  catch(err:any){say(T('Không ghép nối được: ','Could not pair: ')+(UI.lang==='en'?err.data?.errorEn||err.message:err.data?.error||err.message),true)}rerender()});
 $('#stores')?.addEventListener('submit',async(e:any)=>{e.preventDefault();const f=e.target,stores:any={};for(const r of RET)stores[r]=f.elements[r].value.replace(/\s+/g,' ').trim();await saveStores(stores,T('Đã lưu cửa hàng.','Stores saved.'),()=>{for(const r of RET)f.elements[r].defaultValue=f.elements[r].value})});
 // Schedule editor: presets write the same stored format as the custom editor.
 const sched=$('#sched');
 if(sched){const readCustom=()=>edit.windows.map((_:any,i:number)=>({days:[...sched.querySelectorAll(`input[name=d${i}]:checked`)].map((x:any)=>+x.value),start:sched[`s${i}`].value,end:sched[`e${i}`].value}));
  sched.addEventListener('input',()=>{dirty=true;if(edit.preset==='custom')edit.windows=readCustom()});
  sched.querySelectorAll('input[name=preset]').forEach((r:any)=>r.addEventListener('change',()=>{dirty=true;if(edit.preset==='custom')edit.windows=readCustom();edit.preset=r.value;if(r.value!=='custom')edit.windows=clone(UI.PRESETS[r.value]);$('#custom').hidden=r.value!=='custom'}));
  $('#add-win')?.addEventListener('click',()=>{edit.windows=[...readCustom(),{days:[0],start:'06:30',end:'08:00'}];render().then(()=>{dirty=true;($(`#sched [data-win="${edit.windows.length-1}"] input`) as any)?.focus()})});
  sched.querySelectorAll('[data-del-win]').forEach((b:any)=>b.addEventListener('click',()=>{const w=readCustom();w.splice(+b.dataset.delWin,1);edit.windows=w;render().then(()=>{dirty=true})}));
  sched.addEventListener('submit',async(e:any)=>{e.preventDefault();const f=e.target,windows=(edit.preset==='custom'?readCustom():clone(UI.PRESETS[edit.preset])).filter((w:any)=>w.days.length);
   if(!CORE.validSchedule(windows)||!windows.length){say(T('Khung giờ không hợp lệ: chọn ít nhất một ngày, giờ kết thúc sau giờ bắt đầu.','Invalid schedule: pick at least one day, and an end time after the start.'),true);return render()}
   try{const view=await SC.api('device-settings',{schedule:windows,caps:{pagesPerRun:+f.run.value|0,pagesPerDay:+f.day.value|0}});await SC.set({device:view});edit=null;say(T('Đã lưu lịch.','Schedule saved.'))}catch(err:any){say(err.message,true)}rerender()})}
 document.querySelectorAll('[data-pace]').forEach((b:any)=>b.onclick=async()=>{if(b.disabled)return;const k=b.dataset.pace||null;try{const view=await SC.api('device-settings',{pacing:k});await SC.set({device:view});say(k?T('Đã đổi nhịp: ','Pace set: ')+UI.PACE_SHORT()[k][0]:T('Nhịp theo Studio.','Pace follows Studio.'))}catch(err:any){say(err.message,true)}rerender()});
 ['#stores','#pair','[data-store-form]'].forEach(s=>document.querySelectorAll('#app '+s).forEach((el:any)=>el.addEventListener('input',()=>{dirty=true})));
 UI.bindUpdate(document);
 document.querySelectorAll('[data-open-retailer]').forEach((b:any)=>b.onclick=()=>chrome.tabs.create({url:UI.retailerUrl(b.dataset.openRetailer,CFG)}));
 const pv=$('#preview');pv?.addEventListener('toggle',async()=>{if(!pv.open)return;try{preview=await SC.api('plan')}catch(e:any){preview={tasks:[],planInfo:null,error:e.message}}const body=$('#preview-body');if(body)body.innerHTML=UI.previewHtml(preview)});
}
// Typed text, focus and caret are kept by render() (v1.7.3); still no redraw while the person is mid-way in a text box.
chrome.storage.onChanged.addListener((_c:any,area:string)=>{if(area==='local'&&!dirty&&!document.activeElement?.matches?.('input:not([type=checkbox]):not([type=radio]),select,textarea'))render()});
await render();
{const h=hashTarget();if(h){const el=document.getElementById(h);el?.scrollIntoView({block:'start'})}}
})();
