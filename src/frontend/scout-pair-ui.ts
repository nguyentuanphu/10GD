// FamTray Scout · "Ghép máy tính này / Pair this computer" (v1.6, easy install v1.7).
// Classic script loaded after personal-ui.js. Adds a card inside My kitchen →
// "Kết nối gia đình / Family connection" for family owners and trusted scouts.
// v1.7 — no commands, as few steps as possible:
//  * Phones and tablets (iPhone, Android, iPad incl. iPadOS's desktop-style UA, Android
//    tablets) cannot run browser extensions: the card says so, offers the price
//    screenshot / voice price entry and a copyable link to open on a computer. No zip.
//  * Desktop Chrome/Edge: the card pings the installed extension
//    (chrome.runtime.sendMessage(id,{type:'ping'}), ids from scout?op=public plus the
//    bundled id). Not installed → "Install from Chrome Web Store" (only when Studio/env
//    configured a store link) and illustrated unpacked-install steps, while it polls
//    for the extension. Installed → one "Ghép ngay / Pair now" button: the app creates a
//    one-time code (scout?op=pair-code) and hands it to the extension, which pairs with
//    THIS page's origin and replies — the device token never reaches the page.
//  * The manual 8-character code path stays as a fallback.
// Render hook: a MutationObserver re-adds the card whenever My kitchen is (re)rendered,
// so personal-ui.ts is not edited. Nothing here runs for device-only use.
(function scoutPairUi(){
'use strict';
const API='/.netlify/functions/scout',DOWNLOAD='/downloads/famtray-scout.zip',BUNDLED_ID='mjeoekikdicoojgoppnfibjbfpcfngja';
const T=(vi:string,en:string)=>typeof tr==='function'?tr(vi,en):vi;
const E=(v:any)=>String(v??'').replace(/[&<>"']/g,(c:string)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'} as any)[c]);
const online=()=>navigator.onLine&&!(globalThis as any).BEP_OFFLINE;
const session=()=>{try{return typeof accountSession!=='undefined'?accountSession:null}catch{return null}};
const say=(m:string,bad=false)=>{try{if(typeof toast==='function')toast(m,bad)}catch{}};
const locale=()=>{try{return appLanguage==='en'?'en-AU':'vi-VN'}catch{return 'vi-VN'}};
const when=(v:any)=>{if(!v)return T('chưa liên lạc','not seen yet');const d=new Date(v);return isNaN(+d)?'—':d.toLocaleString(locale(),{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})};
let mine:any=null,loading:Promise<any>|null=null,code:any=null,timer:any=null,poll:any=null,download:boolean|null=null;
let info:any=null,ext:any=null,extChecked=false,watch:any=null,pairing=false,manualOpen=false;
async function call(op:string,body?:any){const r=await fetch(API+'?op='+op,body===undefined?{credentials:'same-origin',headers:{Accept:'application/json'}}:{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(body)});let d:any={};try{d=await r.json()}catch{}if(!r.ok){const e:any=new Error(T(d.error||'Chưa làm được. Thử lại sau.',d.errorEn||d.error||'Could not complete. Try again later.'));e.status=r.status;throw e}return d}
function refresh(){if(!online()||!session()?.account)return Promise.resolve(null);loading=loading||call('my-devices').then(d=>{mine=d;return d}).catch(()=>null).finally(()=>{loading=null});return loading}
async function hasDownload(){if(download!==null)return download;try{const r=await fetch(DOWNLOAD,{method:'HEAD',credentials:'same-origin',cache:'no-store'});download=r.ok&&/zip|octet-stream/i.test(r.headers.get('content-type')||'')}catch{download=false}return download}
// v1.7.1 (owner): only accounts assigned in Studio see anything about the extension. The server says so in
// my-devices (`assigned`); unassigned accounts, view-only members and device-only use see no extension UI at all.
const allowed=()=>mine?.assigned===true&&mine?.familyRole!=='viewer'&&session()?.household?.role!=='viewer';
const fmt=(c:string)=>c.slice(0,4)+'-'+c.slice(4);
function left(){if(!code)return 0;return Math.max(0,Math.floor((Date.parse(code.expires)-Date.now())/1000))}
const mmss=(s:number)=>Math.floor(s/60)+':'+String(s%60).padStart(2,'0');

// ---------- platform ----------
// 'phone' | 'tablet' | 'chrome' | 'edge' | 'other' (desktop browser without MV3 extensions).
function platform(){const ua=navigator.userAgent||'',p=navigator.platform||'',touch=navigator.maxTouchPoints||0;
 if(/iPhone|iPod/.test(ua)||/Android/.test(ua)&&/Mobile/.test(ua)||/Mobi/.test(ua)&&!/Android/.test(ua))return 'phone';
 if(/iPad/.test(ua)||(p==='MacIntel'||/Macintosh/.test(ua))&&touch>1||/Android/.test(ua))return 'tablet';
 if(/Edg\//.test(ua))return 'edge';
 if(/(Chrome|Chromium)\//.test(ua)&&!/OPR\/|SamsungBrowser|YaBrowser/.test(ua))return 'chrome';
 return 'other'}
const desktopChromium=()=>['chrome','edge'].includes(platform());
const extPage=()=>platform()==='edge'?'edge://extensions':'chrome://extensions';
const appLink=()=>location.origin+'/';

// ---------- extension messaging ----------
async function publicInfo(){if(info)return info;try{const r=await fetch(API+'?op=public',{credentials:'same-origin',headers:{Accept:'application/json'}});info=r.ok?await r.json():{}}catch{info={}}
 info.extensionIds=[...new Set([...(Array.isArray(info.extensionIds)?info.extensionIds:[]),BUNDLED_ID])].filter((x:any)=>/^[a-p]{32}$/.test(String(x)));return info}
function extSend(id:string,msg:any,ms=1500):Promise<any>{return new Promise(res=>{const rt=(globalThis as any).chrome?.runtime;if(!rt||typeof rt.sendMessage!=='function')return res(null);let done=false;const t=setTimeout(()=>{done=true;res(null)},ms);
 try{rt.sendMessage(id,msg,(r:any)=>{void rt.lastError;if(done)return;done=true;clearTimeout(t);res(r&&r.app==='famtray-scout'?r:null)})}catch{done=true;clearTimeout(t);res(null)}})}
async function detect(){if(!desktopChromium())return null;const ids=(await publicInfo()).extensionIds;for(const id of ids){const r=await extSend(id,{type:'ping'});if(r?.ok)return {...r,id}}return null}
async function check(){const found=await detect();const changed=!!found!==!!ext||found?.pairedHere!==ext?.pairedHere;ext=found;extChecked=true;return changed}
// While the install steps are shown, the page marks its URL with ?scout-wait=1 (no
// navigation, no hash change). The extension reloads such tabs right after install so
// this page can see it; on load the card reopens by itself.
function markWaiting(on:boolean){try{const u=new URL(location.href);if((u.searchParams.get('scout-wait')==='1')===on)return;if(on)u.searchParams.set('scout-wait','1');else u.searchParams.delete('scout-wait');history.replaceState(history.state,'',u.pathname+u.search+u.hash)}catch{}}
function stopWatch(){clearInterval(watch);watch=null}
function startWatch(){if(watch)return;watch=setInterval(async()=>{const card=document.querySelector('.scout-pair-card');if(!card||state()!=='install'){stopWatch();if(!card)markWaiting(false);return}if(document.hidden)return;if(await check()){const c=document.querySelector('.scout-pair-card');if(c){paint(c);say(T('Đã thấy tiện ích FamTray So Giá.','FamTray Price Check extension found.'));(c.querySelector('[data-scout-pair-now]') as any)?.focus?.()}}},2500)}

// ---------- states ----------
function state(){const p=platform();if(p==='phone'||p==='tablet')return 'mobile';if(p==='other')return 'browser';if(!extChecked)return 'checking';if(!ext)return 'install';if(ext.pairedHere&&!(mine&&ext.deviceId&&!(mine.devices||[]).some((d:any)=>d.id===ext.deviceId)))return 'paired';return 'ready'}
const familyPostcode=()=>{try{const pc=typeof scoutData!=='undefined'?String(scoutData?.postcode||''):'';return /^\d{4}$/.test(pc)?pc:''}catch{return ''}};
const deviceName=()=>(platform()==='edge'?'Edge':'Chrome')+' · '+T('máy tính','computer');

// Simple inline illustrations (decorative; text carries the meaning).
const ART:any={
 download:`<svg viewBox="0 0 96 64" aria-hidden="true" focusable="false"><rect x="8" y="6" width="80" height="52" rx="6" class="a-frame"/><path d="M48 16v22m-9-9 9 9 9-9" class="a-ink"/><rect x="30" y="44" width="36" height="6" rx="3" class="a-accent"/></svg>`,
 unzip:`<svg viewBox="0 0 96 64" aria-hidden="true" focusable="false"><path d="M10 16h26l6 6h44v32a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4z" class="a-frame"/><path d="M40 30h6v4h-6zm6 4h6v4h-6zm-6 4h6v4h-6zm6 4h6v4h-6z" class="a-accent"/></svg>`,
 address:`<svg viewBox="0 0 96 64" aria-hidden="true" focusable="false"><rect x="6" y="10" width="84" height="44" rx="6" class="a-frame"/><rect x="12" y="16" width="72" height="12" rx="6" class="a-field"/><path d="M18 22h40" class="a-ink"/><path d="M14 38h50M14 46h34" class="a-soft"/></svg>`,
 devmode:`<svg viewBox="0 0 96 64" aria-hidden="true" focusable="false"><rect x="6" y="10" width="84" height="44" rx="6" class="a-frame"/><path d="M14 24h38M14 40h30" class="a-soft"/><rect x="58" y="16" width="26" height="14" rx="7" class="a-accent"/><circle cx="77" cy="23" r="5" class="a-knob"/></svg>`,
 unpacked:`<svg viewBox="0 0 96 64" aria-hidden="true" focusable="false"><rect x="6" y="10" width="84" height="44" rx="6" class="a-frame"/><rect x="12" y="18" width="34" height="12" rx="4" class="a-accent"/><path d="M58 44h22V30H68l-3-4h-7z" class="a-field"/><path d="M50 24l10 10" class="a-ink"/></svg>`};
function copyBox(value:string,label:string,attr:string){return `<div class="scout-copy-row"><input class="input" readonly value="${E(value)}" aria-label="${E(label)}" ${attr}><button type="button" class="btn small" data-scout-copy-value="${E(value)}">${T('Chép','Copy')}<span class="sr-only"> ${E(label)}</span></button></div>`}
function mobileHtml(){const tablet=platform()==='tablet';
 return `<div class="scout-pair-mobile" data-scout-state="mobile"><p class="callout" role="note">${tablet?T('FamTray So Giá chạy trên máy tính (Chrome hoặc Edge). Trên iPad/máy tính bảng, hãy chụp màn hình giá hoặc nói giá.','FamTray Price Check runs on a computer (Chrome or Edge). On iPad/tablets, use a price screenshot or say the price.'):T('FamTray So Giá chạy trên máy tính (Chrome hoặc Edge). Trên điện thoại, hãy chụp màn hình giá hoặc nói giá.','FamTray Price Check runs on a computer (Chrome or Edge). On a phone, use a price screenshot or say the price.')}</p>
 <div class="toolbar scout-pair-alt"><label class="btn primary scout-pair-file">📷 ${T('Chụp màn hình giá','Price screenshot')}<input type="file" accept="image/*" data-scout-pair-shot class="sr-only"></label><button type="button" class="btn" data-scout-pair-voice>🎙 ${T('Nói giá','Say a price')}</button></div>
 <h5>💻 ${T('Mở trên máy tính','Open on a computer')}</h5><p class="hint">${T('Mở địa chỉ này bằng Chrome hoặc Edge trên máy tính, vào Bếp của tôi → Kết nối gia đình để cài FamTray So Giá.','Open this address in Chrome or Edge on a computer, then My kitchen → Family connection to install FamTray Price Check.')}</p>${copyBox(appLink(),T('Địa chỉ ứng dụng','App address'),'data-scout-open-link')}</div>`}
function browserHtml(){return `<div data-scout-state="browser"><p class="callout" role="note">${T('Trình duyệt này chưa chạy được FamTray So Giá. Hãy mở trang này bằng Chrome hoặc Edge trên máy tính này.','This browser cannot run FamTray Price Check. Open this page in Chrome or Edge on this computer.')}</p>${copyBox(appLink(),T('Địa chỉ ứng dụng','App address'),'data-scout-open-link')}</div>`}
function storeButton(){const edge=platform()==='edge',url=edge?(info?.edgeStoreUrl||info?.storeUrl):info?.storeUrl;if(!url)return '';
 return `<p class="toolbar"><a class="btn primary scout-store-btn" data-scout-store href="${E(url)}" target="_blank" rel="noopener">⬇ ${edge&&info?.edgeStoreUrl?T('Cài từ Edge Add-ons','Install from Edge Add-ons'):T('Cài từ Chrome Web Store','Install from Chrome Web Store')}</a></p><p class="hint">${T('Cài một chạm, không cần chế độ nhà phát triển. Hoặc làm theo các bước dưới.','One click, no Developer mode. Or follow the steps below.')}</p>`}
function installHtml(){const dl=!!download,page=extPage();
 const steps=[
  ['download',dl?`<a class="btn primary small" href="${DOWNLOAD}" download data-scout-download>⬇ ${T('Tải tiện ích (.zip)','Download the extension (.zip)')}</a>`:T('Xin chủ nhà tệp FamTray So Giá (.zip).','Get the FamTray Price Check .zip file from the family owner.')],
  ['unzip',T('Mở thư mục Tải về, bấm chuột phải vào tệp famtray-scout.zip → Giải nén tất cả (Mac: bấm đúp).','Open your Downloads folder, right-click famtray-scout.zip → Extract all (Mac: double-click).')],
  ['address',`${T('Mở trang tiện ích: chép địa chỉ này, dán vào thanh địa chỉ rồi bấm Enter.','Open the extensions page: copy this address, paste it into the address bar and press Enter.')}${copyBox(page,T('Địa chỉ trang tiện ích','Extensions page address'),'data-scout-ext-page')}`],
  ['devmode',T('Bật “Chế độ dành cho nhà phát triển” (góc trên bên phải).','Turn on “Developer mode” (top right).')],
  ['unpacked',T('Bấm “Tải tiện ích đã giải nén” và chọn thư mục vừa giải nén.','Click “Load unpacked” and choose the folder you just extracted.')]];
 return `<div data-scout-state="install">${storeButton()}<ol class="scout-install-steps">${steps.map(([art,html],i)=>`<li><span class="scout-step-art">${ART[art]}</span><span class="scout-step-text"><b class="scout-step-n">${i+1}</b> ${html}</span></li>`).join('')}</ol>
 <p class="hint scout-wait" role="status" data-scout-waiting><span class="scout-wait-dot" aria-hidden="true"></span>${T('Đang chờ tiện ích… Trang sẽ tự chuyển sang bước ghép khi tiện ích được cài.','Waiting for the extension… This page moves on to pairing by itself once it is installed.')}</p>
 <p class="toolbar"><button type="button" class="btn small" data-scout-recheck>${T('Tôi đã cài xong — kiểm tra lại','I have installed it — check again')}</button></p></div>`}
function readyHtml(){const pc=familyPostcode(),other=ext?.paired&&!ext.pairedHere;// paired here but revoked → pair again
 return `<div data-scout-state="ready"><p class="callout ok" role="status">✅ ${T('Đã cài tiện ích FamTray So Giá trên máy này.','The FamTray Price Check extension is installed on this computer.')}</p>
 ${other?`<p class="hint" role="alert">${T('Tiện ích đang ghép với một địa chỉ khác. Mở Cài đặt của tiện ích → Hủy ghép nối, rồi quay lại đây.','The extension is paired with another address. Open the extension’s Settings → Unpair, then come back here.')}</p>`:''}
 ${off()?'':`<p class="toolbar"><button type="button" class="btn primary big scout-pair-now" data-scout-pair-now ${other||pairing?'disabled':''} ${pairing?'aria-busy="true"':''}>${pairing?T('Đang ghép…','Pairing…'):T('🔗 Ghép ngay','🔗 Pair now')}</button></p>`}
 <p class="hint">${T('Tiện ích tự nhận địa chỉ ứng dụng này','The extension receives this app’s address')}${pc?T(' và mã bưu điện '+pc+' của gia đình',' and the family postcode '+pc):''}. ${T('Không cần gõ mã.','No code to type.')}</p></div>`}
function pairedHtml(){return `<div data-scout-state="paired"><p class="callout ok scout-paired" role="status">✅ <b>${T('Đã ghép máy tính','Computer paired')}</b>${ext?.deviceName?` · <span data-user-content>${E(ext.deviceName)}</span>`:''}</p>
 <p class="hint">${T('Bước cuối tự đến: lần tới khi bạn mở Woolworths, Coles, ALDI… tiện ích đọc tên cửa hàng trên trang và hỏi bạn một lần — chỉ cần bấm “Dùng tên này” trong biểu tượng FamTray So Giá.','The last step comes by itself: next time you open Woolworths, Coles, ALDI… the extension reads the store name on the page and asks once — just tap “Use this name” in the FamTray Price Check icon.')}</p></div>`}
const off=()=>!online();
function mainHtml(){const s=state();if(s==='mobile')return mobileHtml();if(s==='browser')return browserHtml();if(s==='checking')return `<p class="hint" data-scout-state="checking" role="status">${T('Đang kiểm tra tiện ích trên máy này…','Checking this computer for the extension…')}</p>`;if(s==='install')return installHtml();if(s==='ready')return readyHtml();return pairedHtml()}
// v1.7 remote control: the computer cannot be woken remotely, so a few settings help.
function tipsHtml(){return `<details class="scout-pair-tips"><summary>${T('Mẹo để FamTray So Giá chạy ổn định khi bạn vắng nhà','Tips to keep FamTray Price Check running while you are away')}</summary><ul class="scout-tips">
 <li>${T('Cắm sạc máy tính.','Keep the computer plugged in.')}</li>
 <li>${T('Tắt chế độ ngủ trong khung giờ dò giá (Windows: Cài đặt → Hệ thống → Nguồn → Ngủ: Không bao giờ khi cắm sạc. Mac: Cài đặt hệ thống → Màn hình khóa / Pin → Ngăn máy tự ngủ khi cắm sạc).','Turn off sleep during price-check windows (Windows: Settings → System → Power → Sleep: Never when plugged in. Mac: System Settings → Lock Screen / Battery → prevent automatic sleeping on power adapter).')}</li>
 <li>${T('Cho Chrome chạy nền: chrome://settings/system → bật “Tiếp tục chạy ứng dụng nền khi đóng Chrome” (Edge: edge://settings/system).','Let Chrome run in the background: chrome://settings/system → turn on “Continue running background apps when Chrome is closed” (Edge: edge://settings/system).')}</li>
 <li>${T('Tự mở Chrome khi đăng nhập (Windows: Cài đặt → Ứng dụng → Khởi động, hoặc đặt lối tắt Chrome vào thư mục shell:startup. Mac: Cài đặt hệ thống → Cài đặt chung → Mục đăng nhập → thêm Google Chrome).','Open Chrome automatically at login (Windows: Settings → Apps → Startup, or put a Chrome shortcut in the shell:startup folder. Mac: System Settings → General → Login Items → add Google Chrome).')}</li>
 <li>${T('Không cần điều khiển máy từ xa: chủ nhà theo dõi và bấm Chạy ngay / Dừng trong Studio trên điện thoại. Máy đang ngủ, tắt hoặc đóng Chrome thì lệnh chờ đến khi máy hoạt động lại.','No remote desktop needed: the owner watches and taps Run now / Stop in Studio on a phone. If the computer is asleep, off or Chrome is closed, commands wait until it is back.')}</li></ul></details>`}
function manualHtml(){if(!desktopChromium())return '';
 return `${tipsHtml()}<details class="scout-pair-manual" ${manualOpen?'open':''}><summary>${T('Nâng cao: ghép bằng mã','Advanced: pair with a code')}</summary>
 <p class="hint">${T('Trong tiện ích: Cài đặt → nhập Địa chỉ ứng dụng và mã ghép nối → Ghép nối.','In the extension: Settings → enter the App address and the pairing code → Pair.')}</p>
 ${off()?'':`<div class="toolbar"><button type="button" class="btn" data-scout-pair>${code&&left()?T('Tạo mã mới','New code'):T('Tạo mã ghép nối','Create pairing code')}</button></div>`}
 <div data-scout-code-slot aria-live="polite">${codeHtml()}</div></details>`}
function devicesHtml(){const list=mine?.devices||[];if(!mine)return `<p class="hint">${online()?T('Đang tải máy đã ghép…','Loading paired computers…'):T('Cần mạng để xem máy đã ghép.','Connect to the internet to see paired computers.')}</p>`;
 if(!list.length)return `<p class="hint">${T('Chưa có máy nào được ghép.','No computers paired yet.')}</p>`;
 return `<ul class="scout-pair-devices">${list.map((d:any)=>`<li><span><b data-user-content>${E(d.name)}</b>${ext?.pairedHere&&ext.deviceId===d.id?` <span class="chip scout-this-pc">${T('máy này','this computer')}</span>`:''}<small>${T('Liên lạc','Seen')}: ${E(when(d.lastHeartbeat))}${d.paused?' · '+T('đang tạm dừng','paused'):''}</small></span><button type="button" class="btn small danger" data-scout-revoke="${E(d.id)}">${T('Thu hồi','Revoke')}<span class="sr-only" data-user-content> ${E(d.name)}</span></button></li>`).join('')}</ul>`}
function codeHtml(){if(!code)return '';const s=left();if(!s)return `<p class="hint" role="status">${T('Mã đã hết hạn. Tạo mã mới.','The code has expired. Create a new one.')}</p>`;
 return `<div class="scout-pair-code" role="group" aria-label="${E(T('Mã ghép nối','Pairing code'))}"><p class="scout-pair-big" data-scout-code tabindex="-1">${E(fmt(code.code))}</p><dl><dt>${T('Địa chỉ ứng dụng','App address')}</dt><dd><code>${E(location.origin)}</code></dd><dt>${T('Còn hiệu lực','Valid for')}</dt><dd><span data-scout-left aria-hidden="true">${mmss(s)}</span><span class="sr-only">${E(T('khoảng '+Math.ceil(s/60)+' phút, dùng một lần','about '+Math.ceil(s/60)+' minutes, one-time use'))}</span></dd></dl><button type="button" class="btn small" data-scout-copy>${T('Chép mã','Copy code')}</button></div>`}
function cardHtml(){
 return `<h4 id="scout-pair-title">💻 ${T('Ghép máy tính này','Pair this computer')}</h4><p class="hint">${T('FamTray So Giá là tiện ích Chrome/Edge trên máy tính: ghi giá trên trang siêu thị bạn mở và gửi về Giá cộng đồng.','FamTray Price Check is a Chrome/Edge extension for computers: it records prices on supermarket pages you open and shares them with Community prices.')}</p>
 ${off()&&desktopChromium()?`<p class="hint" data-scout-offline role="status">${T('Cần mạng để tạo mã ghép nối.','Connect to the internet to create a pairing code.')}</p>`:''}<div class="scout-pair-main" aria-live="polite">${mainHtml()}</div>${manualHtml()}<h5>${T('Máy đã ghép của bạn','Your paired computers')}</h5><div data-scout-devices>${devicesHtml()}</div>`}
function paint(card:any){const d=card.querySelector('.scout-pair-manual');if(d)manualOpen=d.open;card.innerHTML=cardHtml();card.dataset.scoutState=state();wire(card);const s=state();markWaiting(s==='install');if(s==='install')startWatch();else stopWatch()}
function tick(){const el=document.querySelector('.scout-pair-card');if(!el){clearInterval(timer);timer=null;return}const s=left();if(!s){clearInterval(timer);timer=null;stopPoll();for(const slot of document.querySelectorAll('.scout-pair-card [data-scout-code-slot]'))slot.innerHTML=codeHtml();return}for(const span of document.querySelectorAll('.scout-pair-card [data-scout-left]'))span.textContent=mmss(s)}
function stopPoll(){clearInterval(poll);poll=null}
function startPoll(){stopPoll();const before=(mine?.devices||[]).length;poll=setInterval(async()=>{const card=document.querySelector('.scout-pair-card');if(!card||!left()){stopPoll();return}const d=await refresh();if(d&&(d.devices||[]).length>before){stopPoll();code=null;clearInterval(timer);timer=null;await check();paint(card);say(T('Đã ghép máy tính.','Computer paired.'))}},8000)}
// One tap = a one-time code from the server (15 minutes, never shown) handed straight to the extension.
async function oneTapPair(){const c=await call('pair-code',{});
  const r=await extSend(ext.id,{type:'pair',code:c.code,postcode:familyPostcode(),name:deviceName()},20000);
  if(!r?.ok)throw new Error(r?.error==='paired-elsewhere'?T('Tiện ích đang ghép với địa chỉ khác.','The extension is paired with another address.'):r?.error==='origin-not-allowed'?T('Tiện ích này không nhận lệnh từ trang này.','This extension does not accept requests from this page.'):r?.message||T('Tiện ích chưa ghép được. Thử lại hoặc dùng mã.','The extension could not pair. Try again or use a code.'));
  ext={...ext,...r};await refresh();return r}
async function pairNow(card:any){if(pairing||!ext)return;pairing=true;paint(card);
 try{await oneTapPair();say(T('Đã ghép máy tính.','Computer paired.'))}
 catch(x:any){say(x.message,true)}
 finally{pairing=false;if(card.isConnected){paint(card);(card.querySelector('.scout-paired, [data-scout-pair-now]') as any)?.focus?.()}}}
async function copy(v:string,input?:any){try{await navigator.clipboard.writeText(v);say(T('Đã chép.','Copied.'))}catch{try{input?.select?.()}catch{}say(T('Không chép được, hãy chọn và chép bằng tay.','Could not copy; select it and copy by hand.'),true)}}
function wire(card:any){
 card.querySelector('[data-scout-pair]')?.addEventListener('click',async(e:any)=>{const b=e.currentTarget;b.disabled=true;try{code=await call('pair-code',{});manualOpen=true;paint(card);clearInterval(timer);timer=setInterval(tick,1000);startPoll();card.querySelector('[data-scout-code]')?.focus?.()}catch(x:any){say(x.message,true);b.disabled=false}});
 card.querySelector('[data-scout-copy]')?.addEventListener('click',()=>copy(code.code));
 for(const b of card.querySelectorAll('[data-scout-copy-value]'))b.addEventListener('click',()=>copy(b.dataset.scoutCopyValue,b.previousElementSibling));
 card.querySelector('[data-scout-pair-now]')?.addEventListener('click',()=>pairNow(card));
 card.querySelector('[data-scout-recheck]')?.addEventListener('click',async()=>{await check();if(ext){paint(card);return}say(T('Chưa thấy tiện ích. Nếu vừa cài, hãy tải lại trang này.','Extension not found yet. If you just installed it, reload this page.'),true)});
 card.querySelector('[data-scout-pair-voice]')?.addEventListener('click',()=>{if(typeof voicePriceOpen==='function'){try{closeModal()}catch{}voicePriceOpen(null)}else say(T('Mở So Giá để nói giá.','Open Price Check to say a price.'),true)});
 card.querySelector('[data-scout-pair-shot]')?.addEventListener('change',(e:any)=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;if(typeof scoutReadShot==='function'){try{closeModal()}catch{}scoutReadShot(file)}else say(T('Mở So Giá để thêm ảnh giá.','Open Price Check to add a price photo.'),true)});
 for(const b of card.querySelectorAll('[data-scout-revoke]'))b.addEventListener('click',async()=>{const d=(mine?.devices||[]).find((x:any)=>x.id===b.dataset.scoutRevoke);if(!confirm(T('Thu hồi máy “'+(d?.name||'')+'”? Máy đó sẽ ngừng gửi giá.','Revoke “'+(d?.name||'')+'”? It will stop sending prices.')))return;b.disabled=true;try{await call('my-revoke',{deviceId:b.dataset.scoutRevoke});await refresh();await check();paint(card);say(T('Đã thu hồi máy.','Computer revoked.'))}catch(x:any){say(x.message,true);b.disabled=false}});
}
async function inject(section:any){
 if(section.querySelector('.scout-pair-card')||!session()?.account||!session()?.household||!online())return;
 await refresh();if(!allowed()||section.querySelector('.scout-pair-card')||!section.isConnected)return;
 const card=document.createElement('div');card.className='scout-pair-card';card.setAttribute('role','group');card.setAttribute('aria-labelledby','scout-pair-title');section.appendChild(card);paint(card);
 if(code&&left()&&!timer)timer=setInterval(tick,1000);
 const tasks:Promise<any>[]=[];if(desktopChromium()){if(download===null&&online())tasks.push(hasDownload());tasks.push(publicInfo().then(check))}if(online())tasks.push(refresh());if(tasks.length){await Promise.all(tasks);if(card.isConnected)paint(card)}
 if(reopen){reopen=false;card.scrollIntoView({block:'start'});card.classList.add('scout-pair-highlight');setTimeout(()=>card.classList.remove('scout-pair-highlight'),4000);(card.querySelector('[data-scout-pair-now], h4') as any)?.focus?.()}
}
let queued=false,reopen=false;
function scan(){queued=false;const s=document.querySelector('.kitchen-hub #kitchen-family');if(s&&!s.querySelector('.scout-pair-card'))inject(s).catch(()=>{})}
new MutationObserver(()=>{if(!queued){queued=true;requestAnimationFrame(scan)}}).observe(document.body,{childList:true,subtree:true});
const reconnect=()=>{const c=document.querySelector('.scout-pair-card');if(c){paint(c);if(online())refresh().then(()=>c.isConnected&&paint(c))}};
addEventListener('online',reconnect);
// v1.7: the connectivity checker confirms online/offline after a health ping and announces it with this event.
addEventListener('bep-connectivity',reconnect);
addEventListener('offline',()=>{const c=document.querySelector('.scout-pair-card');if(c)paint(c)});
// Reopened by the extension right after install (?scout-wait=1): open My kitchen → Family.
try{if(new URL(location.href).searchParams.get('scout-wait')==='1'){reopen=true;let n=0;const t=setInterval(()=>{n++;const ready=session()?.household&&typeof kitchenModal==='function'&&!document.querySelector('#startup-progress')&&(document.querySelector('#main')?.textContent?.length||0)>200;
 if(ready||n>40){clearInterval(t);if(ready&&!document.querySelector('.kitchen-hub'))kitchenModal('family');else if(!ready){reopen=false;markWaiting(false)}}},500)}}catch{}

// ---------- v1.7.1 one-step pairing: "found on this computer" banner, #pair-extension, #kitchen-family-pair ----------
// Owner: pairing must take one tap. A signed-in, Studio-assigned account on desktop Chrome/Edge whose installed
// extension is not paired yet gets ONE inline banner at the top of Today (not a modal, dismissible for the day).
// Its button is the confirmation: code from the server → handed to the extension → paired. Never without that tap.
// The popup's "Pair now" opens <app>/#pair-extension, which shows the same banner (signing in first if needed).
// Unassigned accounts, view-only members and device-only use never see any of it.
const DISMISS_KEY='bep-scout-found-dismissed',REQ_KEY='bep-pair-extension';
const today=()=>{try{return typeof sydneyDate==='function'?sydneyDate():new Date().toISOString().slice(0,10)}catch{return ''}};
let requested=false,bannerState:'idle'|'pairing'|'done'|'error'='idle',bannerError='',bannerChecked=false,bannerBusy=false;
try{if(location.hash==='#pair-extension'){requested=true;sessionStorage.setItem(REQ_KEY,String(Date.now()))}else{const t=+(sessionStorage.getItem(REQ_KEY)||0);if(t&&Date.now()-t<30*60000)requested=true;else sessionStorage.removeItem(REQ_KEY)}}catch{}
const appReady=()=>typeof kitchenModal==='function'&&!document.querySelector('#startup-progress')&&(document.querySelector('#main')?.textContent?.length||0)>200;
const onToday=()=>{try{return typeof view==='undefined'||view==='today'}catch{return true}};
function dismissed(){try{return localStorage.getItem(DISMISS_KEY)===today()}catch{return false}}
function bannerWanted(){if(!desktopChromium()||!online()||!session()?.account||!session()?.household||!allowed()||!ext)return false;
 if(bannerState==='done'||bannerState==='pairing'||bannerState==='error')return true;
 if(ext.pairedHere||ext.paired)return false;// paired here, or paired with another address (Settings → Unpair first)
 return requested||!dismissed()}
function bannerHtml(){const busy=bannerState==='pairing';
 if(bannerState==='done')return `<p class="scout-found-text" role="status">✅ <b>${T('Đã ghép máy tính này với FamTray So Giá.','This computer is paired with FamTray Price Check.')}</b> ${T('Lần đầu bạn mở mỗi siêu thị, biểu tượng tiện ích sẽ hỏi tên cửa hàng một lần.','The first time you open each supermarket, the extension icon asks for the store name once.')}</p><button type="button" class="btn small" data-scout-found-close>${T('Đóng','Close')}</button>`;
 return `<p class="scout-found-text"><span aria-hidden="true">💻</span> <b>${T('Đã thấy FamTray So Giá trên máy này','Found FamTray Price Check on this computer')}</b>${requested?` · ${T('Bấm “Ghép ngay” để xác nhận ghép với tài khoản này.','Tap “Pair now” to confirm pairing with this account.')}`:''}${bannerState==='error'?`<span class="scout-found-error" role="alert">${E(bannerError)}</span>`:''}</p>
 <div class="scout-found-actions"><button type="button" class="btn primary" data-scout-found-pair ${busy?'disabled aria-busy="true"':''}>${busy?T('Đang ghép…','Pairing…'):T('🔗 Ghép ngay','🔗 Pair now')}</button><button type="button" class="btn ghost" data-scout-found-later ${busy?'disabled':''}>${T('Để sau','Not now')}</button></div>`}
function paintBanner(){const main=document.querySelector('#main');let b=document.querySelector('.scout-found-banner') as any;
 if(!main||!onToday()||!bannerWanted()){if(b)b.remove();return}
 if(!b||b.parentElement!==main||main.firstElementChild!==b){b?.remove();b=document.createElement('section');b.className='scout-found-banner';b.setAttribute('aria-label',T('Ghép máy tính','Pair this computer'));main.prepend(b)}
 const html=bannerHtml();if(b.dataset.html!==html){b.dataset.html=html;b.innerHTML=html;b.dataset.state=bannerState;
  b.querySelector('[data-scout-found-pair]')?.addEventListener('click',async()=>{if(bannerState==='pairing')return;bannerState='pairing';paintBanner();
   try{await oneTapPair();bannerState='done';requested=false;try{sessionStorage.removeItem(REQ_KEY)}catch{};say(T('Đã ghép máy tính.','Computer paired.'))}
   catch(x:any){bannerState='error';bannerError=x?.message||T('Chưa ghép được. Thử lại.','Could not pair. Try again.')}
   paintBanner();(document.querySelector('.scout-found-banner [data-scout-found-close], .scout-found-banner [data-scout-found-pair]') as any)?.focus?.();const c=document.querySelector('.scout-pair-card');if(c)paint(c)});
  b.querySelector('[data-scout-found-later]')?.addEventListener('click',()=>{try{localStorage.setItem(DISMISS_KEY,today());sessionStorage.removeItem(REQ_KEY)}catch{}requested=false;bannerState='idle';paintBanner()});
  b.querySelector('[data-scout-found-close]')?.addEventListener('click',()=>{bannerState='idle';paintBanner()});
  if(requested&&bannerState==='idle')(b.querySelector('[data-scout-found-pair]') as any)?.focus?.()}}
// Signed out but asked to pair from the popup: a plain sign-in prompt (no extension wording); the request survives sign-in.
function paintSignIn(){const main=document.querySelector('#main');let b=document.querySelector('.scout-signin-banner') as any;const want=requested&&!session()?.account&&onToday()&&desktopChromium();
 if(!main||!want){if(b)b.remove();return}if(b&&b.parentElement===main)return;b?.remove();b=document.createElement('section');b.className='scout-found-banner scout-signin-banner';b.setAttribute('aria-label',T('Đăng nhập','Sign in'));
 const href=typeof accountLoginUrl==='function'?accountLoginUrl():'/login';b.innerHTML=`<p class="scout-found-text">${T('Đăng nhập tài khoản gia đình để tiếp tục.','Sign in to your family account to continue.')}</p><div class="scout-found-actions"><a class="btn primary" href="${E(href)}">${T('Đăng nhập','Sign in')}</a></div>`;main.prepend(b)}
async function bannerCheck(){if(bannerBusy)return;bannerBusy=true;try{if(!bannerChecked&&desktopChromium()&&online()&&session()?.account&&session()?.household&&appReady()){await refresh();if(allowed()){await publicInfo();await check()}bannerChecked=true}}finally{bannerBusy=false}paintBanner();paintSignIn();
 if(requested&&bannerChecked&&ext?.pairedHere&&bannerState==='idle'){requested=false;try{sessionStorage.removeItem(REQ_KEY)}catch{}say(T('Máy này đã được ghép.','This computer is already paired.'))}}
let bannerQueued=false;new MutationObserver(()=>{if(bannerQueued)return;bannerQueued=true;requestAnimationFrame(()=>{bannerQueued=false;bannerCheck().catch(()=>{})})}).observe(document.body,{childList:true,subtree:true});
// #pair-extension and #kitchen-family-pair are one-shot links: Today renders underneath (unknown views fall back to Today).
function openPairCard(){if(!allowed())return;reopen=true;try{closeModal()}catch{}kitchenModal('family')}
function deepLink(){const h=location.hash;if(h!=='#pair-extension'&&h!=='#kitchen-family-pair')return;try{history.replaceState(history.state,'',location.pathname+location.search+'#today')}catch{}
 if(h==='#pair-extension'){requested=true;bannerState='idle';try{sessionStorage.setItem(REQ_KEY,String(Date.now()))}catch{}bannerCheck().catch(()=>{});return}
 let n=0;const t=setInterval(async()=>{n++;if(!(session()?.household&&appReady())&&n<=40)return;clearInterval(t);if(!session()?.household||!online())return;await refresh();openPairCard()},500)}
addEventListener('hashchange',deepLink);deepLink();
// Account & settings → "So Giá trên máy tính" (assigned accounts on desktop Chrome/Edge only) → the same card.
try{if(typeof otherSettingsModal==='function'){const baseOther=otherSettingsModal;
 // @ts-ignore reassigning the shared classic-script function
 otherSettingsModal=function(section=''){const r=baseOther.apply(this,arguments as any);(async()=>{if(!desktopChromium()||!online()||!session()?.account||!session()?.household)return;await refresh();if(!allowed())return;const host=document.querySelector('.modal.account-sheet .modal-content')||document.querySelector('.modal .modal-content');if(!host||host.querySelector('#settings-price-check'))return;
  const html=typeof settingsCard==='function'?settingsCard('settings','price-check',T('So Giá trên máy tính','Price Check on a computer'),T('Tiện ích Chrome/Edge ghi giá siêu thị cho gia đình.','The Chrome/Edge extension that records supermarket prices for your family.'),`<button type="button" class="btn small" data-scout-open-pair>💻 ${T('Mở thẻ ghép máy tính','Open the pairing card')}</button>`):'';
  const other=host.querySelector('#settings-other-title');if(other)other.insertAdjacentHTML('beforebegin',html);else host.insertAdjacentHTML('beforeend',html);
  host.querySelector('[data-scout-open-pair]')?.addEventListener('click',openPairCard)})().catch(()=>{});return r}}}catch{}

// ---------- "Scout" label on community prices (Price Scout) ----------
try{if(typeof scoutCommunityRow==='function'){const base=scoutCommunityRow;
 // @ts-ignore reassigning the shared classic-script function
 scoutCommunityRow=function(x:any){const html=base(x);if(!(x?.sources||[]).includes('scout'))return html;return html.replace('<span aria-hidden="true">',`<span class="scout-src-chip" title="${E(T('Giá đọc tự động trên trang cửa hàng','Price read automatically from the store page'))}">🔎 ${E(T('Máy So Giá','Price Checker'))}</span> <span aria-hidden="true">`)}}}catch{}
})();
