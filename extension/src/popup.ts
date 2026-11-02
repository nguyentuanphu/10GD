// FamTray So Giá / Price Check — toolbar popup (360 px wide, ≤ 480 px tall in every state).
// v1.7.2 (owner: “how do I turn Auto on? it looks too long”): status + ONE primary action.
// One card: the state line (Chưa ghép / Đã ghép · Bán tự động đang bật / Tự động: sẵn sàng ·
// lần chạy tới … / Đang chạy · 12/150 trang / Tạm dừng / Bị chặn đến …), the last capture,
// and one primary button by state (Ghép ngay → Chạy ngay → Dừng). While Auto is not ready the
// card lists ONLY the missing readiness steps (①–⑤), each with its own fix. Secondary: small
// Pause in the header, “Cài đặt” in the footer, VI│EN toggle. Everything else lives in Settings.
declare const chrome:any;
(async function scoutPopup(){
'use strict';
const G:any=globalThis,SC=G.ScoutClient,UI=G.ScoutUI,T=UI.T,esc=UI.esc,$=UI.$;
await UI.init();
let tabRetailer:string|null=null,tabId:number|null=null,CFG:any=null,catalog:any=null,diag:any=null;
try{const [tab]=await chrome.tabs.query({active:true,currentWindow:true});CFG=await SC.config();tabId=tab?.id??null;let url=tab?.url;
 // Test builds only: popup.html?tab=<id> inspects that tab (a popup opened as a tab is itself the active tab).
 {const q=SC.BUILD.test?new URLSearchParams(location.search).get('tab'):null;if(q){tabId=+q;url=(await chrome.tabs.get(tabId))?.url}}
 if(url&&/^https?:/.test(url))tabRetailer=G.ScoutParse?.retailerFor?.(new URL(url).hostname,CFG)||null}catch{}
// v1.7: the store-name step happens by itself. When a supermarket page shows a store and
// this device has no store for that retailer yet, the popup asks once: “Dùng tên này”.
const RET=['woolworths','coles','aldi','chemist','amazon'];
function storeAsk(st:any){const seen=st.warnings?.storesSeen||{},mine=st.device?.stores||{},ask=RET.filter(r=>seen[r]&&!mine[r]);if(!ask.length)return '';
 return `<section class="card" aria-labelledby="h-store" data-store-ask><h2 id="h-store">${T('Cửa hàng gần nhà','Your nearby store')}</h2>
 ${ask.map(r=>`<div class="row store-ask"><span><strong>${esc(UI.LABEL[r])}</strong>: “${esc(seen[r])}”</span><button class="btn primary small" type="button" data-use-store="${r}">${T('Dùng tên này','Use this name')}<span class="sr-only"> ${esc(UI.LABEL[r]+' '+seen[r])}</span></button></div>`).join('')}</section>`}
// v1.7.2: on a supermarket tab, say what happened on THIS page and why prices are not shown yet (passive).
function tabHtml(st:any){if(!tabRetailer)return '';const info=st.tabStatus?.[tabId!],L=UI.LABEL[tabRetailer];
 const line=!info?T(`Chưa đọc trang ${L} này — đợi trang tải xong hoặc tải lại trang.`,`This ${L} page has not been read yet — wait for it to load or reload it.`)
  :info.count&&!info.why?T(`Đã đọc ${info.count} giá trên trang này`,`Read ${info.count} prices on this page`)
  :info.count?T(`Đã đọc ${info.count} giá nhưng chưa gửi: `,`Read ${info.count} prices but not sent: `)+UI.tabWhy(info.why):T('Chưa đọc được giá trên trang này: ','No prices read on this page: ')+UI.tabWhy(info.why);
 const pl=st.lastSemi?.url&&info?.url&&st.lastSemi.url===info.url?st.lastSemi.placement:null,un=pl?.unplaced||{},gaps=Object.keys(un).filter(k=>k!=='no-item');
 const noStore=info&&info.count&&!info.storeLabel;
 const why=[...(noStore&&!gaps.includes('no-store')?['no-store']:[]),...gaps];
 const unplacedFacts=(pl?.facts||[]).filter((f:any)=>f.why==='no-item');
 return `<div class="pop-tab" data-tab-status="${info?(info.count&&!info.why?'read':'not-read'):'waiting'}"><p class="pop-sub" id="tab-line">${esc(line)}</p>
  ${why.length?`<p class="hint" data-not-shown>${esc(T('Chưa hiện cho gia đình vì: ','Not shown to families yet: ')+why.map((k:string)=>UI.placeWhy(k)+(un[k]?` (${un[k]})`:'')).join(' · '))}${why.includes('no-store')?` <button type="button" class="link" data-open-retailer="${tabRetailer}">${esc(T('Chọn cửa hàng trên ','Choose a store on ')+L)}</button>`:''}</p>`:''}
  ${unplacedFacts.length?`<details id="pop-unplaced" class="visits"><summary>${esc(T(`${unplacedFacts.length} giá chưa gắn món · Xem`,`${unplacedFacts.length} price${unplacedFacts.length>1?'s':''} not linked to an item · View`))}</summary><ul class="plan-list">${unplacedFacts.map((f:any,i:number)=>`<li data-unplaced="${i}"><span class="pl-main"><span><strong>${esc(f.name)}</strong></span><small class="muted">$${esc(Number(f.price).toFixed(2))}</small><span class="row attach-row"><label class="sr-only" for="att-${i}">${T('Món','Item')}</label><input id="att-${i}" list="cat-list" placeholder="${esc(T('Gắn với món…','Link to item…'))}" value="${esc(f.suggested?.[0]||'')}"><button type="button" class="btn small" data-attach="${i}">${T('Gắn','Link')}</button></span></span></li>`).join('')}</ul><datalist id="cat-list"></datalist></details>`:''}
  <details id="pop-diag" class="visits"><summary>${T('Gửi mẫu trang để sửa','Send this page’s structure')}</summary><div id="diag-body"><p class="hint">${T('Chỉ gửi cấu trúc trang (loại trang, bộ chọn, vị trí giá) để sửa cách đọc giá — không gửi thông tin cá nhân, cookie hay ô nhập. Xem trước bên dưới.','Sends only the page structure (page type, selectors, where prices are) so reading can be fixed — no personal data, cookies or form values. Preview below.')}</p></div></details></div>`}
function note(m:string){document.querySelector('[data-pop-note]')?.remove();$('#app').insertAdjacentHTML('afterbegin',`<p class="banner warn" role="alert" data-pop-note>${esc(m)}</p>`)}
const openSettings=(hash='')=>{if(hash)chrome.tabs.create({url:chrome.runtime.getURL('options.html#'+hash)});else chrome.runtime.openOptionsPage();window.close?.()};
// Missing readiness steps only (the full checklist is in Settings → 3. Tự động).
function missingHtml(st:any){const steps=UI.readiness(st),miss=steps.map((s:any,i:number)=>({...s,n:i})).filter((s:any)=>!s.ok);if(!miss.length)return '';
 const first=miss[0].id,prepOk=UI.toggleReady(st);
 return `<div class="pop-ready" data-readiness><p class="pop-ready-head">${esc(T(`Để bật Tự động còn ${miss.length} bước:`,`${miss.length} step${miss.length>1?'s':''} left for Auto:`))}</p><ol class="ready-list compact">${miss.map((s:any)=>{
  const fix=s.fix==='toggle'?`<label class="switch mini"><input type="checkbox" id="auto" ${prepOk?'':'disabled'} aria-describedby="r-toggle"><span class="sr-only">${esc(s.title)}</span></label>`
   :`<button type="button" class="btn small ${s.id===first?'primary':''}" data-fix="${s.fix}" data-fix-step="${s.id}">${esc(s.fixLabel)}<span class="sr-only"> · ${esc(s.title)}</span></button>`;
  return `<li data-step="${s.id}" data-ok="false"><span class="n" aria-hidden="true">${UI.NUM[s.n]}</span><span class="t" id="r-${s.id}">${esc(s.short||s.title)}${s.adminOnly?` <small class="tag">${T('chỉ quản trị viên','admin only')}</small>`:''}</span>${fix}</li>`}).join('')}</ol>
  ${steps.slice(0,5).every((s:any)=>s.ok)?`<p class="hint">${T('Chạy ngay vẫn dùng được, kể cả ngoài lịch.','Run now works already, even outside the schedule.')}</p>`:''}</div>`}
async function render(){
 const st=await SC.get(),v=st.device,paired=!!st.token,warn=UI.storeWarnings(st),state=UI.state(st),steps=UI.readiness(st);
 const server=String(st.server||SC.BUILD.server||'');
 // Storage changes re-render the popup; keep what the person is typing in the code form.
 const keep={unOpen:!!($('#pop-unplaced') as any)?.open,diagOpen:!!($('#pop-diag') as any)?.open,lastOpen:!!($('#pop-last') as any)?.open,code:($('#pc-code') as any)?.value||'',server:($('#pc-server') as any)?.value||'',focus:(document.activeElement as any)?.id||'',codeOpen:!!($('#pc-details') as any)?.open};
 const capture=UI.lastCapture(st.lastSemi);
 const canRun=paired&&UI.runNowReady(st)&&!st.run;
 let primary='';
 if(!paired)primary=`<button id="pairnow" class="btn primary pop-wide" type="button">🔗 ${T('Ghép ngay','Pair now')}</button>`;
 else if(st.run)primary=`<button id="stoprun" class="btn danger pop-wide" type="button">⏹ ${T('Dừng','Stop')}<span class="sr-only"> ${T('lần chạy này','this run')}</span></button>`;
 else if(st.paused)primary=`<button id="resume" class="btn primary pop-wide" type="button">▶ ${T('Tiếp tục','Resume')}</button>`;
 else if(canRun)primary=`<button id="runnow" class="btn primary pop-wide" type="button" aria-describedby="runnow-hint">▶ ${T('Chạy ngay','Run now')}</button>`;
 $('#app').innerHTML=`
 <header class="bar pop-bar"><h1 class="pop-title"><span class="logo" aria-hidden="true">◎</span><span class="pop-name"><small>FamTray</small><span>${T('So Giá','Price Check')}</span></span></h1>
  <div class="pop-tools"><div class="seg" role="group" aria-label="${T('Ngôn ngữ','Language')}"><button type="button" class="seg-btn" data-lang="vi" lang="vi" aria-pressed="${UI.lang!=='en'}">VI</button><button type="button" class="seg-btn" data-lang="en" lang="en" aria-pressed="${UI.lang==='en'}">EN</button></div>
  ${paired&&!st.paused?`<button id="pause" class="btn small ghost pop-pause" type="button" aria-pressed="false">⏸<span class="pop-pause-t"> ${T('Tạm dừng','Pause')}</span><span class="sr-only"> ${T('tất cả','everything')}</span></button>`:''}</div></header>
 ${st.notAssigned?`<p class="banner warn" role="alert" data-not-assigned>${T('Tài khoản này chưa được cấp quyền dùng tiện ích. Liên hệ quản trị.','This account isn’t allowed to use the extension yet. Contact the admin.')}</p>`:''}
 ${st.notAssigned?'':UI.updateLine(st)}
 <section class="card pop-card" aria-labelledby="pop-state" data-pop-state="${state.key}">
  <h2 id="pop-state" class="pop-state" ${state.key==='running'?'data-run-status':''} role="status"><span class="dot dot-${state.key}" aria-hidden="true"></span>${esc(state.line)}</h2>
  ${paired?`<p class="muted pop-sub" id="semi-summary">${capture?esc(capture):T('Chưa ghi giá — mở trang siêu thị để bắt đầu.','No prices yet — open a supermarket page.')}</p>`
   :`<p class="muted pop-sub">${T('Ghép một chạm với Bếp Gia Đình của bạn.','Pair in one tap with your family kitchen app.')}</p>`}
  ${state.key==='paused'?`<p class="muted pop-sub">${T('Không ghi giá, không chạy tự động.','No capture and no auto runs.')}</p>`:''}
  ${state.key==='blocked'?`<p class="muted pop-sub">${T('Trang siêu thị yêu cầu xác minh nên đã tự dừng 24 giờ. Không cần làm gì.','A supermarket site asked for a check, so it stopped for 24 hours by itself. Nothing to do.')}</p>`:''}
  ${primary}
  ${canRun?`<p class="hint" id="runnow-hint">${T('Chạy một lần ngay, ngoài lịch. Mọi giới hạn vẫn áp dụng.','Runs once now, outside the schedule. All limits still apply.')}</p>`:''}
  ${paired&&!st.notAssigned&&!st.run&&!st.paused&&state.key!=='blocked'&&state.key!=='device-paused'?missingHtml(st):''}
  ${paired&&!st.run&&st.lastRun&&!missingHtml(st)?UI.visitsHtml(st.lastRun,'pop-last'):''}
  ${paired&&steps.find((x:any)=>x.id==='toggle').ok?`<label class="switch pop-switch"><input type="checkbox" id="auto" checked><span>${T('Tự động trên máy này','Auto on this computer')}</span></label>`:''}
  ${!paired?`<details id="pc-details" class="pop-code-d" ${keep.codeOpen?'open':''}><summary>${T('Hoặc nhập mã ghép','Or enter a pairing code')}</summary>
   <form id="popcode" class="form pop-code" autocomplete="off">
    <label for="pc-code" class="sr-only">${T('Mã ghép nối','Pairing code')}</label><div class="pop-code-row"><input id="pc-code" name="code" required minlength="8" maxlength="9" autocapitalize="characters" spellcheck="false" placeholder="ABCD-2345" aria-describedby="pc-hint"><button class="btn" type="submit">${T('Ghép','Pair')}</button></div>
    <small id="pc-hint" class="hint">${T('Mã 8 ký tự do quản trị đưa.','The 8-character code from the admin.')}</small>
    <label for="pc-server" class="pop-server">${T('Địa chỉ ứng dụng','App address')}<input id="pc-server" name="server" type="url" required placeholder="https://…" value="${esc(server)}"></label></form></details>`:''}
 </section>
 ${tabHtml(st)}
 ${paired?storeAsk(st):''}
 ${warn.map((w:string)=>`<p class="banner warn" role="alert">${esc(w)}</p>`).join('')}
 <div class="pop-foot"><button id="opts2" class="btn ghost small" type="button">⚙ ${T('Cài đặt','Settings')}</button>${paired&&tabRetailer?`<label class="switch pop-switch pop-site"><input type="checkbox" id="site" ${st.semiSites?.[tabRetailer]!==false?'checked':''}><span>${esc(T('Ghi giá trên ','Capture on ')+UI.LABEL[tabRetailer])}</span></label>`:''}</div>`;
 if(keep.lastOpen&&$('#pop-last'))$('#pop-last').open=true;if(keep.unOpen&&$('#pop-unplaced'))$('#pop-unplaced').open=true;if(keep.diagOpen&&$('#pop-diag')){$('#pop-diag').open=true;showDiag()}
 if($('#pc-code')){if(keep.code)$('#pc-code').value=keep.code;if(keep.server)$('#pc-server').value=keep.server}if(keep.focus&&document.getElementById(keep.focus))document.getElementById(keep.focus)!.focus();
 document.querySelectorAll('[data-lang]').forEach((b:any)=>b.addEventListener('click',async()=>{if(UI.lang===b.dataset.lang)return;UI.lang=b.dataset.lang;await SC.set({lang:UI.lang});document.documentElement.lang=UI.lang;render()}));
 // Pair now: open the family app's one-tap pairing (#pair-extension; the app asks for a tap to confirm). No address known → Settings.
 const pairNow=()=>{if(SC.serverOk(server))chrome.tabs.create({url:server.replace(/\/+$/,'')+'/#pair-extension'});else chrome.runtime.openOptionsPage();window.close?.()};
 $('#pairnow')?.addEventListener('click',pairNow);
 $('#popcode')?.addEventListener('submit',async(e:any)=>{e.preventDefault();const f=e.target,srv=String(f.server.value||'').trim().replace(/\/+$/,''),btn=f.querySelector('button');
  if(!SC.serverOk(srv)){note(T('Địa chỉ phải bắt đầu bằng https://','The address must start with https://'));return}
  btn.disabled=true;await SC.set({server:srv});
  try{const r=await SC.api('pair',{code:f.code.value,name:(/Edg\//.test(navigator.userAgent)?'Edge':'Chrome')+' · '+T('máy tính','computer'),timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone,version:SC.BUILD.version},{token:''});await SC.set({token:r.token,deviceId:r.device.id,device:r.device,pairedVia:'popup',notAssigned:false})}
  catch(err:any){btn.disabled=false;note(err.code==='not_assigned'?T('Tài khoản này chưa được cấp quyền dùng tiện ích. Liên hệ quản trị.','This account isn’t allowed to use the extension yet. Contact the admin.'):T('Không ghép nối được: ','Could not pair: ')+(UI.lang==='en'?err.data?.errorEn||err.message:err.data?.error||err.message))}});
 const togglePause=async()=>{const p=!(await SC.get(['paused'])).paused;await SC.set({paused:p});if(p)chrome.runtime.sendMessage({type:'stop-run'}).catch(()=>{});render()};
 $('#pause')?.addEventListener('click',togglePause);$('#resume')?.addEventListener('click',togglePause);
 document.querySelectorAll('[data-use-store]').forEach((b:any)=>b.addEventListener('click',async()=>{b.disabled=true;const cur=await SC.get(['device','warnings']),r=b.dataset.useStore,stores={...(cur.device?.stores||{}),[r]:cur.warnings.storesSeen[r]};
  try{const view=await SC.api('device-settings',{stores});const w=(await SC.get(['warnings'])).warnings;w.storeMismatch[r]=false;await SC.set({device:view,warnings:w})}catch(e:any){b.disabled=false;note(e.message)}}));
 // Readiness fixes: ① pair, ②③ Studio (admin), ④ the three confirmations in Settings, ⑤ the switch.
 document.querySelectorAll('[data-fix]').forEach((b:any)=>b.addEventListener('click',()=>{const k=b.dataset.fix;
  if(k==='pair')return pairNow();
  if(k==='studio'){const u=UI.studioUrl(st);if(u){chrome.tabs.create({url:u});window.close?.()}else openSettings('step-pair');return}
  if(k==='prep')return openSettings('prep');
  if(k==='stores')return openSettings('step-stores')}));
 $('#runnow')?.addEventListener('click',async(e:any)=>{e.target.disabled=true;const why=await chrome.runtime.sendMessage({type:'run-now',local:true});if(why){note(UI.reason(why));e.target.disabled=false}});
 $('#stoprun')?.addEventListener('click',async(e:any)=>{e.target.disabled=true;await chrome.runtime.sendMessage({type:'stop-run',server:true})});
 document.querySelectorAll('[data-open-retailer]').forEach((b:any)=>b.addEventListener('click',()=>{chrome.tabs.create({url:UI.retailerUrl(b.dataset.openRetailer,CFG)});window.close?.()}));
 $('#pop-unplaced')?.addEventListener('toggle',async()=>{if(!$('#pop-unplaced')?.open||catalog)return fillCatalog();try{catalog=(await SC.api('catalog')).items||[]}catch{catalog=[]}fillCatalog()});
 document.querySelectorAll('[data-attach]').forEach((b:any)=>b.addEventListener('click',async()=>{const i=+b.dataset.attach,want=String(($('#att-'+i) as any).value||'').trim();const cur=await SC.get(['lastSemi','tabStatus']),info=cur.tabStatus?.[tabId!],pf=(cur.lastSemi?.placement?.facts||[]).filter((f:any)=>f.why==='no-item')[i];
  const item=(catalog||[]).find((c:any)=>c.itemId===want||c.nameVi===want||c.nameEn===want)?.itemId||(/^[a-z0-9-]{1,60}$/.test(want)?want:null);const fact=(info?.facts||[]).find((f:any)=>pf&&(f.productId&&f.productId===pf.productId||f.name===pf.name));
  if(!item||!fact||!info){note(T('Chọn một món trong danh sách.','Pick an item from the list.'));return}b.disabled=true;
  try{const r=await SC.api('results',{mode:'semi',attach:{itemId:item},items:[{retailer:info.retailer,url:info.url,status:'ok',pageType:info.pageType,storeLabel:info.storeLabel||st.device?.stores?.[info.retailer]||null,facts:[fact]}]});const placed=r.placement?.placed>0;
   const ls=cur.lastSemi;ls.placement.facts=ls.placement.facts.filter((f:any)=>f!==pf&&!(f.name===pf.name&&f.price===pf.price));ls.placement.unplaced['no-item']=Math.max(0,(ls.placement.unplaced['no-item']||1)-1);if(!ls.placement.unplaced['no-item'])delete ls.placement.unplaced['no-item'];if(!placed&&r.placement?.unplaced)for(const [k,n] of Object.entries<any>(r.placement.unplaced))ls.placement.unplaced[k]=(ls.placement.unplaced[k]||0)+n;await SC.set({lastSemi:ls});
   note(placed?T('Đã gắn món và hiện giá cho gia đình.','Linked — the price is now shown to families.'):T('Đã gắn món. Giá sẽ hiện khi đủ điều kiện: ','Linked. The price shows once: ')+Object.keys(r.placement?.unplaced||{}).map(UI.placeWhy).join(' · '))}catch(e:any){b.disabled=false;note(e.message)}}));
 $('#pop-diag')?.addEventListener('toggle',()=>{if($('#pop-diag')?.open)showDiag()});
 $('#opts2')?.addEventListener('click',()=>openSettings());
 $('#upd-open')?.addEventListener('click',()=>openSettings('update'));
 $('#site')?.addEventListener('change',async(e:any)=>{const s=(await SC.get(['semiSites'])).semiSites;s[tabRetailer!]=e.target.checked;await SC.set({semiSites:s});render()});
 $('#auto')?.addEventListener('change',async(e:any)=>{const on=e.target.checked;if(on&&!UI.toggleReady(await SC.get())){e.target.checked=false;note(T('Cần ① ghép máy, ④ ít nhất 1 cửa hàng và ⑤ chuẩn bị máy trước khi bật tự động.','Needs ① paired, ④ at least one store and ⑤ a prepared computer before Auto can be switched on.'));return}
  await SC.set({autoEnabled:on});if(!on)chrome.runtime.sendMessage({type:'stop-run'}).catch(()=>{});chrome.runtime.sendMessage({type:'heartbeat'}).catch(()=>{});render()});
}
function fillCatalog(){const dl=$('#cat-list');if(dl&&catalog&&!dl.children.length)dl.innerHTML=catalog.map((c:any)=>`<option value="${esc(c.itemId)}">${esc((UI.lang==='en'?c.nameEn:c.nameVi)+' · '+(UI.lang==='en'?c.nameVi:c.nameEn))}</option>`).join('')}
// “Gửi mẫu trang để sửa”: build the sanitised sample in the page, show it, send only on an explicit tap.
async function showDiag(){const body=$('#diag-body');if(!body||!tabId)return;if(!diag){try{diag=await chrome.tabs.sendMessage(tabId,{type:'diagnose'})}catch{diag=null}}
 if(!diag){body.insertAdjacentHTML('beforeend',`<p class="banner warn" data-diag-error>${T('Không đọc được trang — tải lại trang rồi thử lại.','Could not read the page — reload it and try again.')}</p>`);return}
 if(body.querySelector('[data-diag-preview]'))return;
 body.insertAdjacentHTML('beforeend',`<pre class="diag-pre" data-diag-preview tabindex="0">${esc(JSON.stringify(diag,null,1).slice(0,6000))}</pre><button type="button" class="btn primary small" id="diag-send">${T('Gửi mẫu này','Send this sample')}</button>`);
 $('#diag-send').addEventListener('click',async(e:any)=>{e.target.disabled=true;try{await SC.api('diagnose',diag);e.target.replaceWith(Object.assign(document.createElement('p'),{className:'banner ok',textContent:T('Đã gửi — cảm ơn! Quản trị sẽ sửa cách đọc trang này.','Sent — thank you! The admin will fix how this page is read.')}))}catch(err:any){e.target.disabled=false;note(err.message)}})}
chrome.storage.onChanged.addListener(()=>render());
render();
})();
