// FamTray Scout — toolbar popup: status, last capture summary, big Pause button,
// per-site pause for the current tab, quick Auto/Semi switches.
declare const chrome:any;
(async function scoutPopup(){
'use strict';
const G:any=globalThis,SC=G.ScoutClient,UI=G.ScoutUI,T=UI.T,esc=UI.esc,$=UI.$;
await UI.init();
let tabRetailer:string|null=null;
try{const [tab]=await chrome.tabs.query({active:true,currentWindow:true});const cfg=await SC.config();if(tab?.url&&/^https?:/.test(tab.url))tabRetailer=G.ScoutParse?.retailerFor?.(new URL(tab.url).hostname,cfg)||null}catch{}
async function render(){
 const st=await SC.get(),v=st.device,paired=!!st.token,next=UI.nextRun(st),warn=UI.storeWarnings(st);
 const semi=st.lastSemi,last=st.lastRun;
 $('#app').innerHTML=`
 <header class="bar"><h1><span class="logo" aria-hidden="true">◎</span> FamTray Scout</h1><button id="lang" class="btn ghost small" type="button" lang="${UI.lang==='en'?'vi':'en'}">${UI.lang==='en'?'Tiếng Việt':'English'}</button></header>
 ${st.paused?`<p class="banner warn" role="status">${T('Đang tạm dừng — không ghi giá, không chạy tự động.','Paused — no capture and no auto runs.')}</p>`:''}
 <button id="pause" class="btn big ${st.paused?'primary':'danger'}" type="button" aria-pressed="${st.paused?'true':'false'}">${st.paused?T('▶ Tiếp tục','▶ Resume'):T('⏸ Tạm dừng tất cả','⏸ Pause everything')}</button>
 ${!paired?`<section class="card"><h2>${T('Chưa ghép nối','Not paired yet')}</h2><p>${T('Nhập mã 8 ký tự từ Studio hoặc Bếp của tôi để bắt đầu.','Enter the 8-character code from Studio or My kitchen to start.')}</p><button id="opts" class="btn primary" type="button">${T('Mở cài đặt','Open settings')}</button></section>`:`
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
  ${v?.paused?`<p class="banner warn">${esc(T('Máy tạm dừng đến ','Paused until ')+UI.when(Date.parse(v.paused.until)))}</p>`:''}
 </section>`}
 ${warn.map((w:string)=>`<p class="banner warn" role="alert">${esc(w)}</p>`).join('')}
 <p class="foot"><button id="opts2" class="btn ghost" type="button">${T('Cài đặt & hướng dẫn','Settings & setup guide')}</button></p>`;
 $('#lang').onclick=async()=>{UI.lang=UI.lang==='en'?'vi':'en';await SC.set({lang:UI.lang});document.documentElement.lang=UI.lang;render()};
 $('#pause').onclick=async()=>{const p=!(await SC.get(['paused'])).paused;await SC.set({paused:p});if(p)chrome.runtime.sendMessage({type:'stop-run'}).catch(()=>{});render()};
 for(const id of ['#opts','#opts2'])$(id)?.addEventListener('click',()=>chrome.runtime.openOptionsPage());
 $('#semi')?.addEventListener('change',async(e:any)=>{await SC.set({semiEnabled:e.target.checked});render()});
 $('#site')?.addEventListener('change',async(e:any)=>{const s=(await SC.get(['semiSites'])).semiSites;s[tabRetailer!]=e.target.checked;await SC.set({semiSites:s});render()});
 $('#auto')?.addEventListener('change',async(e:any)=>{await SC.set({autoEnabled:e.target.checked});if(!e.target.checked)chrome.runtime.sendMessage({type:'stop-run'}).catch(()=>{});chrome.runtime.sendMessage({type:'heartbeat'}).catch(()=>{});render()});
}
chrome.storage.onChanged.addListener(()=>render());
render();
})();
