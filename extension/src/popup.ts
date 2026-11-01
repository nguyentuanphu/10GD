// FamTray So Giá / Price Check — toolbar popup (360 px wide): status, last capture summary,
// small Pause, VI│EN toggle, one-tap Pair now (opens the app's #pair-extension) or an inline
// code, per-site pause for the current tab, quick Auto/Semi switches.
declare const chrome:any;
(async function scoutPopup(){
'use strict';
const G:any=globalThis,SC=G.ScoutClient,UI=G.ScoutUI,T=UI.T,esc=UI.esc,$=UI.$;
await UI.init();
let tabRetailer:string|null=null;
try{const [tab]=await chrome.tabs.query({active:true,currentWindow:true});const cfg=await SC.config();if(tab?.url&&/^https?:/.test(tab.url))tabRetailer=G.ScoutParse?.retailerFor?.(new URL(tab.url).hostname,cfg)||null}catch{}
// v1.7: the store-name step happens by itself. When a supermarket page shows a store and
// this device has no store for that retailer yet, the popup asks once: “Dùng tên này”.
const RET=['woolworths','coles','aldi','chemist','amazon'];
function storeAsk(st:any){const seen=st.warnings?.storesSeen||{},mine=st.device?.stores||{},ask=RET.filter(r=>seen[r]&&!mine[r]);if(!ask.length)return '';
 return `<section class="card" aria-labelledby="h-store" data-store-ask><h2 id="h-store">${T('Cửa hàng gần nhà','Your nearby store')}</h2><p class="muted">${T('Trang siêu thị đang hiển thị cửa hàng này. Đúng cửa hàng bạn hay mua?','The supermarket site shows this store. Is it the one you shop at?')}</p>
 ${ask.map(r=>`<div class="row store-ask"><span><strong>${esc(UI.LABEL[r])}</strong>: “${esc(seen[r])}”</span><button class="btn primary small" type="button" data-use-store="${r}">${T('Dùng tên này','Use this name')}<span class="sr-only"> ${esc(UI.LABEL[r]+' '+seen[r])}</span></button></div>`).join('')}</section>`}
function note(m:string){document.querySelector('[data-pop-note]')?.remove();$('#app').insertAdjacentHTML('afterbegin',`<p class="banner warn" role="alert" data-pop-note>${esc(m)}</p>`)}
async function render(){
 const st=await SC.get(),v=st.device,paired=!!st.token,next=UI.nextRun(st),warn=UI.storeWarnings(st);
 const semi=st.lastSemi,last=st.lastRun;
 const server=String(st.server||SC.BUILD.server||'');
 // Storage changes re-render the popup; keep what the person is typing in the code form.
 const keep={code:($('#pc-code') as any)?.value||'',server:($('#pc-server') as any)?.value||'',focus:(document.activeElement as any)?.id||''};
 $('#app').innerHTML=`
 <header class="bar pop-bar"><h1 class="pop-title"><span class="logo" aria-hidden="true">◎</span><span class="pop-name"><small>FamTray</small><span>${T('So Giá','Price Check')}</span></span></h1>
  <div class="pop-tools"><div class="seg" role="group" aria-label="${T('Ngôn ngữ','Language')}"><button type="button" class="seg-btn" data-lang="vi" lang="vi" aria-pressed="${UI.lang!=='en'}">VI</button><button type="button" class="seg-btn" data-lang="en" lang="en" aria-pressed="${UI.lang==='en'}">EN</button></div>
  ${paired?`<button id="pause" class="btn small ${st.paused?'primary':'ghost'} pop-pause" type="button" aria-pressed="${st.paused?'true':'false'}">${st.paused?T('▶ Tiếp tục','▶ Resume'):T('⏸ Tạm dừng','⏸ Pause')}<span class="sr-only"> ${T('tất cả','everything')}</span></button>`:''}</div></header>
 ${paired&&st.paused?`<p class="banner warn" role="status">${T('Đang tạm dừng — không ghi giá, không chạy tự động.','Paused — no capture and no auto runs.')}</p>`:''}
 ${st.notAssigned?`<p class="banner warn" role="alert" data-not-assigned>${T('Tài khoản này chưa được cấp quyền dùng tiện ích. Liên hệ quản trị.','This account isn’t allowed to use the extension yet. Contact the admin.')}</p>`:''}
 ${!paired?`<section class="card pop-unpaired" aria-labelledby="h-unpaired"><h2 id="h-unpaired">${T('Chưa ghép nối','Not paired yet')}</h2><p class="muted pop-lead">${T('Ghép một chạm với Bếp Gia Đình của bạn.','Pair in one tap with your family kitchen app.')}</p>
  <button id="pairnow" class="btn primary pop-wide" type="button">🔗 ${T('Ghép ngay','Pair now')}</button>
  <form id="popcode" class="form pop-code" autocomplete="off"><p class="pop-or"><span>${T('hoặc','or')}</span></p>
   <label for="pc-code">${T('Nhập mã','Enter code')}</label><div class="pop-code-row"><input id="pc-code" name="code" required minlength="8" maxlength="9" autocapitalize="characters" spellcheck="false" placeholder="ABCD-2345" aria-describedby="pc-hint"><button class="btn" type="submit">${T('Ghép','Pair')}</button></div>
   <small id="pc-hint" class="hint">${T('Mã 8 ký tự do quản trị đưa.','The 8-character code from the admin.')}</small>
   <label for="pc-server" class="pop-server">${T('Địa chỉ ứng dụng','App address')}<input id="pc-server" name="server" type="url" required placeholder="https://…" value="${esc(server)}"></label></form></section>
 `:`
 <section class="card" aria-labelledby="h-semi"><h2 id="h-semi">${T('Ghi giá khi bạn xem','Capture while you browse')}</h2>
  <p class="summary" id="semi-summary" role="status">${semi?.count?esc(T(`Đã lưu ${semi.count} giá · ${semi.retailerLabel||''}${semi.store?' '+semi.store:''}`,`Saved ${semi.count} prices · ${semi.retailerLabel||''}${semi.store?' '+semi.store:''}`)):semi?.error?esc(T('Chưa gửi được: ','Not sent: ')+semi.error):T('Mở trang sản phẩm hoặc khuyến mãi của siêu thị để ghi giá.','Open a supermarket product or specials page to capture prices.')}</p>
  <label class="switch"><input type="checkbox" id="semi" ${st.semiEnabled!==false?'checked':''}><span>${T('Bật ghi giá bán tự động','Semi-auto capture on')}</span></label>
  ${tabRetailer?`<label class="switch"><input type="checkbox" id="site" ${st.semiSites?.[tabRetailer]!==false?'checked':''}><span>${esc(T('Ghi giá trên ','Capture on ')+UI.LABEL[tabRetailer])}</span></label>`:''}
 </section>
 <section class="card" aria-labelledby="h-auto"><h2 id="h-auto">${T('Tự động theo lịch','Scheduled auto mode')}</h2>
  <label class="switch"><input type="checkbox" id="auto" ${st.autoEnabled?'checked':''}><span>${T('Bật tự động trên máy này','Auto on this device')}</span></label>
  <dl class="kv"><dt>${T('Studio','Studio')}</dt><dd>${v?(v.network?.autoScout!=='on'?T('Tự động đang tắt','Auto is off'):v.autoAllowed?T('Đã cho phép','Allowed'):T('Chưa cho phép máy này','This device not allowed yet')):'—'}</dd>
  <dt>${T('Lần chạy tới','Next run')}</dt><dd>${next?esc(UI.when(next)):'—'}</dd>
  <dt>${T('Lần chạy trước','Last run')}</dt><dd>${last?esc(UI.when(last.at)+' · '+T(`${last.pages} trang, ${last.prices} giá`,`${last.pages} pages, ${last.prices} prices`)+' · '+UI.reason(last.stop)):T('chưa có','never')}</dd>
  <dt>${T('Bị chặn','Blocked')}</dt><dd>${(st.blockedEvents||[]).length}</dd></dl>
  ${st.run?`<p class="banner ok" role="status" data-run-status>${esc(T(`Đang chạy · ${st.run.pages||0}/${v?.caps?.pagesPerRun||150} trang`,`Running · ${st.run.pages||0}/${v?.caps?.pagesPerRun||150} pages`))}</p><button id="stoprun" class="btn danger" type="button">${T('⏹ Dừng lần chạy này','⏹ Stop this run')}</button>`
   :st.autoEnabled&&v?.autoAllowed&&v?.network?.autoScout==='on'&&!v?.paused&&!st.paused?`<button id="runnow" class="btn primary" type="button">${T('▶ Chạy ngay','▶ Run now')}</button><p class="muted">${T('Chạy một lần ngay bây giờ, ngoài khung giờ. Mọi giới hạn vẫn áp dụng.','Runs once now, outside the schedule. All limits still apply.')}</p>`:''}
  ${v?.network?.pacing?`<p class="muted" data-pace>${esc(T('Nhịp: ','Pace: ')+UI.paceLabel(v.network.pacing))}</p>`:''}
  ${v?.paused?`<p class="banner warn">${esc(T('Máy tạm dừng đến ','Paused until ')+UI.when(Date.parse(v.paused.until)))}</p>`:''}
 </section>`}
 ${paired?storeAsk(st):''}
 ${warn.map((w:string)=>`<p class="banner warn" role="alert">${esc(w)}</p>`).join('')}
 <p class="foot"><button id="opts2" class="btn ghost small" type="button">${T('Cài đặt & hướng dẫn','Settings & setup guide')}</button></p>`;
 if($('#pc-code')){if(keep.code)$('#pc-code').value=keep.code;if(keep.server)$('#pc-server').value=keep.server}if(keep.focus&&document.getElementById(keep.focus))document.getElementById(keep.focus)!.focus();
 document.querySelectorAll('[data-lang]').forEach((b:any)=>b.addEventListener('click',async()=>{if(UI.lang===b.dataset.lang)return;UI.lang=b.dataset.lang;await SC.set({lang:UI.lang});document.documentElement.lang=UI.lang;render()}));
 // Pair now: open the family app's one-tap pairing (#pair-extension; the app asks for a tap to confirm). No address known → Settings.
 $('#pairnow')?.addEventListener('click',()=>{if(SC.serverOk(server))chrome.tabs.create({url:server.replace(/\/+$/,'')+'/#pair-extension'});else chrome.runtime.openOptionsPage();window.close?.()});
 $('#popcode')?.addEventListener('submit',async(e:any)=>{e.preventDefault();const f=e.target,srv=String(f.server.value||'').trim().replace(/\/+$/,''),btn=f.querySelector('button');
  if(!SC.serverOk(srv)){note(T('Địa chỉ phải bắt đầu bằng https://','The address must start with https://'));return}
  btn.disabled=true;await SC.set({server:srv});
  try{const r=await SC.api('pair',{code:f.code.value,name:(/Edg\//.test(navigator.userAgent)?'Edge':'Chrome')+' · '+T('máy tính','computer'),timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone,version:SC.BUILD.version},{token:''});await SC.set({token:r.token,deviceId:r.device.id,device:r.device,pairedVia:'popup',notAssigned:false})}
  catch(err:any){btn.disabled=false;note(err.code==='not_assigned'?T('Tài khoản này chưa được cấp quyền dùng tiện ích. Liên hệ quản trị.','This account isn’t allowed to use the extension yet. Contact the admin.'):T('Không ghép nối được: ','Could not pair: ')+(UI.lang==='en'?err.data?.errorEn||err.message:err.data?.error||err.message))}});
 $('#pause')?.addEventListener('click',async()=>{const p=!(await SC.get(['paused'])).paused;await SC.set({paused:p});if(p)chrome.runtime.sendMessage({type:'stop-run'}).catch(()=>{});render()});
 document.querySelectorAll('[data-use-store]').forEach((b:any)=>b.addEventListener('click',async()=>{b.disabled=true;const cur=await SC.get(['device','warnings']),r=b.dataset.useStore,stores={...(cur.device?.stores||{}),[r]:cur.warnings.storesSeen[r]};
  try{const view=await SC.api('device-settings',{stores});const w=(await SC.get(['warnings'])).warnings;w.storeMismatch[r]=false;await SC.set({device:view,warnings:w})}catch(e:any){b.disabled=false;$('#app').insertAdjacentHTML('afterbegin',`<p class="banner warn" role="alert">${esc(e.message)}</p>`)}}));
 $('#runnow')?.addEventListener('click',async(e:any)=>{e.target.disabled=true;const why=await chrome.runtime.sendMessage({type:'run-now'});if(why){$('#app').insertAdjacentHTML('afterbegin',`<p class="banner warn" role="alert">${esc(UI.reason(why))}</p>`);e.target.disabled=false}});
 $('#stoprun')?.addEventListener('click',async(e:any)=>{e.target.disabled=true;await chrome.runtime.sendMessage({type:'stop-run',server:true})});
 for(const id of ['#opts2'])$(id)?.addEventListener('click',()=>chrome.runtime.openOptionsPage());
 $('#semi')?.addEventListener('change',async(e:any)=>{await SC.set({semiEnabled:e.target.checked});render()});
 $('#site')?.addEventListener('change',async(e:any)=>{const s=(await SC.get(['semiSites'])).semiSites;s[tabRetailer!]=e.target.checked;await SC.set({semiSites:s});render()});
 $('#auto')?.addEventListener('change',async(e:any)=>{await SC.set({autoEnabled:e.target.checked});if(!e.target.checked)chrome.runtime.sendMessage({type:'stop-run'}).catch(()=>{});chrome.runtime.sendMessage({type:'heartbeat'}).catch(()=>{});render()});
}
chrome.storage.onChanged.addListener(()=>render());
render();
})();
