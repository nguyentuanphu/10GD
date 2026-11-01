// FamTray Scout · "Ghép máy tính này / Pair this computer" (v1.6).
// Classic script loaded after personal-ui.js. Adds a small card inside My kitchen →
// "Kết nối gia đình / Family connection" for family owners and trusted scouts:
// one-time 8-character pairing code (scout?op=pair-code) with an expiry countdown,
// install steps for the Chrome/Edge extension (a download link only when the app serves
// the built zip), and the list of this account's paired computers with revoke.
// It also labels Scout-sourced community prices "Scout" in Price Scout.
// Render hook: a MutationObserver re-adds the card whenever My kitchen is (re)rendered,
// so personal-ui.ts is not edited. Nothing here runs for device-only use.
(function scoutPairUi(){
'use strict';
const API='/.netlify/functions/scout',DOWNLOAD='/downloads/famtray-scout.zip';
const T=(vi:string,en:string)=>typeof tr==='function'?tr(vi,en):vi;
const E=(v:any)=>String(v??'').replace(/[&<>"']/g,(c:string)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'} as any)[c]);
const online=()=>navigator.onLine&&!(globalThis as any).BEP_OFFLINE;
const session=()=>{try{return typeof accountSession!=='undefined'?accountSession:null}catch{return null}};
const say=(m:string,bad=false)=>{try{if(typeof toast==='function')toast(m,bad)}catch{}};
const locale=()=>{try{return appLanguage==='en'?'en-AU':'vi-VN'}catch{return 'vi-VN'}};
const when=(v:any)=>{if(!v)return T('chưa liên lạc','not seen yet');const d=new Date(v);return isNaN(+d)?'—':d.toLocaleString(locale(),{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})};
let mine:any=null,loading:Promise<any>|null=null,code:any=null,timer:any=null,poll:any=null,download:boolean|null=null;
async function call(op:string,body?:any){const r=await fetch(API+'?op='+op,body===undefined?{credentials:'same-origin',headers:{Accept:'application/json'}}:{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(body)});let d:any={};try{d=await r.json()}catch{}if(!r.ok){const e:any=new Error(T(d.error||'Chưa làm được. Thử lại sau.',d.errorEn||d.error||'Could not complete. Try again later.'));e.status=r.status;throw e}return d}
function refresh(){if(!online()||!session()?.account)return Promise.resolve(null);loading=loading||call('my-devices').then(d=>{mine=d;return d}).catch(()=>null).finally(()=>{loading=null});return loading}
async function hasDownload(){if(download!==null)return download;try{const r=await fetch(DOWNLOAD,{method:'HEAD',credentials:'same-origin',cache:'no-store'});download=r.ok&&/zip|octet-stream/i.test(r.headers.get('content-type')||'')}catch{download=false}return download}
const isOwner=()=>session()?.household?.role==='owner';
const allowed=()=>isOwner()||mine?.trusted===true;
const fmt=(c:string)=>c.slice(0,4)+'-'+c.slice(4);
function left(){if(!code)return 0;return Math.max(0,Math.floor((Date.parse(code.expires)-Date.now())/1000))}
const mmss=(s:number)=>Math.floor(s/60)+':'+String(s%60).padStart(2,'0');
function stepsHtml(dl:boolean){return `<details class="scout-pair-steps"><summary>${T('Cách cài tiện ích (Chrome / Edge trên máy tính)','How to install the extension (Chrome / Edge on a computer)')}</summary><ol>
 <li>${T('Tạo một hồ sơ Chrome riêng, không đăng nhập tài khoản mua sắm hay tích điểm.','Create a separate Chrome profile; do not sign in to shopping or rewards accounts in it.')}</li>
 <li>${dl?`<a class="btn small" href="${DOWNLOAD}" download>⬇ ${T('Tải tiện ích (.zip)','Download the extension (.zip)')}</a> ${T('rồi giải nén.','then unzip it.')}`:T('Xin chủ nhà tệp tiện ích FamTray Scout (thư mục dist-extension hoặc tệp .zip) rồi giải nén.','Get the FamTray Scout extension files (the dist-extension folder or the .zip) from the family owner and unzip them.')}</li>
 <li>${T('Mở chrome://extensions (Edge: edge://extensions), bật Chế độ nhà phát triển, chọn Tải tiện ích đã giải nén và chọn thư mục vừa giải nén.','Open chrome://extensions (Edge: edge://extensions), turn on Developer mode, choose Load unpacked and pick the unzipped folder.')}</li>
 <li>${T('Trong tiện ích: Cài đặt → nhập Địa chỉ ứng dụng và mã ghép nối bên dưới → Ghép nối.','In the extension: Settings → enter the App address and the pairing code below → Pair.')}</li></ol></details>`}
function devicesHtml(){const list=mine?.devices||[];if(!mine)return `<p class="hint">${online()?T('Đang tải máy đã ghép…','Loading paired computers…'):T('Cần mạng để xem máy đã ghép.','Connect to the internet to see paired computers.')}</p>`;
 if(!list.length)return `<p class="hint">${T('Chưa có máy nào được ghép.','No computers paired yet.')}</p>`;
 return `<ul class="scout-pair-devices">${list.map((d:any)=>`<li><span><b data-user-content>${E(d.name)}</b><small>${T('Liên lạc','Seen')}: ${E(when(d.lastHeartbeat))}${d.paused?' · '+T('đang tạm dừng','paused'):''}</small></span><button type="button" class="btn small danger" data-scout-revoke="${E(d.id)}">${T('Thu hồi','Revoke')}<span class="sr-only" data-user-content> ${E(d.name)}</span></button></li>`).join('')}</ul>`}
function codeHtml(){if(!code)return '';const s=left();if(!s)return `<p class="hint" role="status">${T('Mã đã hết hạn. Tạo mã mới.','The code has expired. Create a new one.')}</p>`;
 return `<div class="scout-pair-code" role="group" aria-label="${E(T('Mã ghép nối','Pairing code'))}"><p class="scout-pair-big" data-scout-code>${E(fmt(code.code))}</p><dl><dt>${T('Địa chỉ ứng dụng','App address')}</dt><dd><code>${E(location.origin)}</code></dd><dt>${T('Còn hiệu lực','Valid for')}</dt><dd><span data-scout-left aria-hidden="true">${mmss(s)}</span><span class="sr-only">${E(T('khoảng '+Math.ceil(s/60)+' phút, dùng một lần','about '+Math.ceil(s/60)+' minutes, one-time use'))}</span></dd></dl><button type="button" class="btn small" data-scout-copy>${T('Chép mã','Copy code')}</button></div>`}
function cardHtml(){const off=!online();
 return `<h4 id="scout-pair-title">💻 ${T('Ghép máy tính này','Pair this computer')}</h4><p class="hint">${T('FamTray Scout là tiện ích Chrome/Edge trên máy tính: ghi giá trên trang siêu thị bạn mở và gửi về Giá cộng đồng.','FamTray Scout is a Chrome/Edge extension for computers: it records prices on supermarket pages you open and shares them with Community prices.')}</p>
 ${off?`<p class="hint" data-scout-offline>${T('Cần mạng để tạo mã ghép nối.','Connect to the internet to create a pairing code.')}</p>`:`<div class="toolbar"><button type="button" class="btn primary" data-scout-pair>${code&&left()?T('Tạo mã mới','New code'):T('Tạo mã ghép nối','Create pairing code')}</button></div>`}
 <div data-scout-code-slot aria-live="polite">${codeHtml()}</div>${stepsHtml(!!download)}<h5>${T('Máy đã ghép của bạn','Your paired computers')}</h5><div data-scout-devices>${devicesHtml()}</div>`}
function paint(card:any){card.innerHTML=cardHtml();wire(card)}
function tick(){const el=document.querySelector('.scout-pair-card');if(!el){clearInterval(timer);timer=null;return}const s=left();if(!s){clearInterval(timer);timer=null;stopPoll();for(const slot of document.querySelectorAll('.scout-pair-card [data-scout-code-slot]'))slot.innerHTML=codeHtml();return}for(const span of document.querySelectorAll('.scout-pair-card [data-scout-left]'))span.textContent=mmss(s)}
function stopPoll(){clearInterval(poll);poll=null}
function startPoll(){stopPoll();const before=(mine?.devices||[]).length;poll=setInterval(async()=>{const card=document.querySelector('.scout-pair-card');if(!card||!left()){stopPoll();return}const d=await refresh();if(d&&(d.devices||[]).length>before){stopPoll();code=null;clearInterval(timer);timer=null;paint(card);say(T('Đã ghép máy tính.','Computer paired.'))}},8000)}
function wire(card:any){
 card.querySelector('[data-scout-pair]')?.addEventListener('click',async(e:any)=>{const b=e.currentTarget;b.disabled=true;try{code=await call('pair-code',{});paint(card);clearInterval(timer);timer=setInterval(tick,1000);startPoll();card.querySelector('[data-scout-code]')?.focus?.()}catch(x:any){say(x.message,true);b.disabled=false}});
 card.querySelector('[data-scout-copy]')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(code.code);say(T('Đã chép mã.','Code copied.'))}catch{say(T('Không chép được, hãy gõ mã.','Could not copy; type the code instead.'),true)}});
 for(const b of card.querySelectorAll('[data-scout-revoke]'))b.addEventListener('click',async()=>{const d=(mine?.devices||[]).find((x:any)=>x.id===b.dataset.scoutRevoke);if(!confirm(T('Thu hồi máy “'+(d?.name||'')+'”? Máy đó sẽ ngừng gửi giá.','Revoke “'+(d?.name||'')+'”? It will stop sending prices.')))return;b.disabled=true;try{await call('my-revoke',{deviceId:b.dataset.scoutRevoke});await refresh();paint(card);say(T('Đã thu hồi máy.','Computer revoked.'))}catch(x:any){say(x.message,true);b.disabled=false}});
}
async function inject(section:any){
 if(section.querySelector('.scout-pair-card')||!session()?.account||!session()?.household)return;
 if(!isOwner()){if(!online())return;await refresh();if(!allowed()||section.querySelector('.scout-pair-card')||!section.isConnected)return}
 const card=document.createElement('div');card.className='scout-pair-card';card.setAttribute('role','group');card.setAttribute('aria-labelledby','scout-pair-title');section.appendChild(card);paint(card);
 if(code&&left()&&!timer)timer=setInterval(tick,1000);
 const tasks:Promise<any>[]=[];if(download===null&&online())tasks.push(hasDownload());if(online())tasks.push(refresh());if(tasks.length){await Promise.all(tasks);if(card.isConnected)paint(card)}
}
let queued=false;
function scan(){queued=false;const s=document.querySelector('.kitchen-hub #kitchen-family');if(s&&!s.querySelector('.scout-pair-card'))inject(s).catch(()=>{})}
new MutationObserver(()=>{if(!queued){queued=true;requestAnimationFrame(scan)}}).observe(document.body,{childList:true,subtree:true});
addEventListener('online',()=>{const c=document.querySelector('.scout-pair-card');if(c){paint(c);refresh().then(()=>c.isConnected&&paint(c))}});
addEventListener('offline',()=>{const c=document.querySelector('.scout-pair-card');if(c)paint(c)});

// ---------- "Scout" label on community prices (Price Scout) ----------
try{if(typeof scoutCommunityRow==='function'){const base=scoutCommunityRow;
 // @ts-ignore reassigning the shared classic-script function
 scoutCommunityRow=function(x:any){const html=base(x);if(!(x?.sources||[]).includes('scout'))return html;return html.replace('<span aria-hidden="true">',`<span class="scout-src-chip" title="${E(T('Giá do tiện ích FamTray Scout đọc trên trang cửa hàng','Price read from the store page by the FamTray Scout extension'))}">🔎 Scout</span> <span aria-hidden="true">`)}}}catch{}
})();
