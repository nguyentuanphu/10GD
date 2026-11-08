'use strict';
// v1.7.15 “Cài app” (owner, 8 Nov 2026: “Thêm option add to homescreen function, check my repo/tpn để làm theo”; pop-up: as recommended,
// with a small reminder). Same approach as tpn's js/install.ts: one tap on Android / Chrome / Edge (the browser's own install prompt),
// a three-step picture guide on iPhone / iPad (Apple does not let a web page install itself) and a short guide on other computers.
// Installed = opened from the home screen (display-mode standalone / navigator.standalone) or the browser said “appinstalled”; then
// every “Cài app” entry and the reminder disappear. Entries: the More sheet and the sidebar, Account & settings, the search
// (“cài app”), and a one-line reminder on Today with “Để sau” (hidden for 14 days). Pictures are our own drawings (rule 19).
(()=>{
const iT=(vi:string,en:string)=>typeof appLanguage!=='undefined'&&appLanguage==='en'?en:vi;
const INSTALLED_KEY='bep-installed',LATER_KEY='bep-install-later';
let deferred:any=null;
const store=(k:string,v?:string)=>{try{if(v===undefined)return localStorage.getItem(k);if(v==='')localStorage.removeItem(k);else localStorage.setItem(k,v)}catch{}return null};
const standalone=()=>{try{return matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: minimal-ui)').matches||(navigator as any).standalone===true}catch{return false}};
const ua=navigator.userAgent||'',isIOS=/iPad|iPhone|iPod/.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1),isAndroid=/Android/i.test(ua);
const installed=()=>standalone()||store(INSTALLED_KEY)==='1';
const canOffer=()=>!installed()&&/^https?:$/.test(location.protocol);
const refresh=()=>{try{decorate()}catch(e){console.warn('install',e)}};
addEventListener('beforeinstallprompt',(e:any)=>{e.preventDefault();deferred=e;refresh()});
addEventListener('appinstalled',()=>{deferred=null;store(INSTALLED_KEY,'1');refresh()});
if(standalone())store(INSTALLED_KEY,'1');
const art=(n:string,c='')=>typeof uiArt==='function'?uiArt(n,c):'';
function guideSteps():[string,string,string][]{
 if(isIOS)return[['share-up',iT('Bấm nút Chia sẻ','Tap the Share button'),iT('Ở cuối màn hình Safari (góc trên bên phải trên iPad).','At the bottom of Safari (top right on iPad).')],
  ['plus-square',iT('Chọn “Thêm vào MH chính”','Choose “Add to Home Screen”'),iT('Kéo danh sách xuống nếu chưa thấy.','Scroll down the list if you can’t see it.')],
  ['home-add',iT('Bấm “Thêm”','Tap “Add”'),iT('Rồi mở Bếp Nhà từ biểu tượng trên màn hình chính.','Then open Bếp Nhà from its home-screen icon.')]];
 if(isAndroid)return[['dots-v',iT('Bấm menu ⋮','Tap the ⋮ menu'),iT('Góc trên bên phải trình duyệt.','Top right of the browser.')],
  ['plus-square',iT('Chọn “Cài đặt ứng dụng” hoặc “Thêm vào màn hình chính”','Choose “Install app” or “Add to Home screen”'),''],
  ['home-add',iT('Bấm “Cài đặt”','Tap “Install”'),iT('Rồi mở từ màn hình chính.','Then open it from your home screen.')]];
 return[['plus-square',iT('Bấm biểu tượng cài đặt','Click the install icon'),iT('Trên thanh địa chỉ (Chrome / Edge), hoặc menu trình duyệt → “Cài đặt FamTray”.','In the address bar (Chrome / Edge), or the browser menu → “Install FamTray”.')],
  ['home-add',iT('Bấm “Cài đặt”','Click “Install”'),iT('Rồi mở từ biểu tượng ứng dụng riêng.','Then open it from its own app icon.')]]}
async function openInstall(){if(installed()){toast(iT('Bếp Nhà đã có trên màn hình chính.','Bếp Nhà is already on your home screen.'));return}
 if(deferred){const d=deferred;deferred=null;try{await d.prompt();const c=await d.userChoice;if(c?.outcome==='accepted'){store(INSTALLED_KEY,'1');toast(iT('Đã thêm Bếp Nhà vào màn hình chính.','Bếp Nhà was added to your home screen.'))}}catch{}refresh();return}
 const steps=guideSteps();
 modal(iT('Thêm vào màn hình chính','Add to your home screen'),`<p class="hint">${isIOS?iT('Trên iPhone / iPad, mở trang này bằng Safari rồi làm 3 bước:','On iPhone / iPad, open this page in Safari, then:'):iT('Mở Bếp Nhà nhanh như một app, kể cả khi mất mạng:','Open Bếp Nhà like an app, even offline:')}</p>
  <ol class="install-steps">${steps.map(([a,t,d],i)=>`<li class="install-step"><span class="install-art" aria-hidden="true">${art(a,'install-pic')}</span><div><b>${i+1}. ${esc(t)}</b>${d?`<small>${esc(d)}</small>`:''}</div></li>`).join('')}</ol>
  ${isIOS?`<p class="hint">${iT('Mở từ màn hình chính thì iPhone mới nhận được thông báo nhắc đi chợ, nấu ăn và tin khẩn của nhà.','Opened from the home screen, the iPhone can also get shopping, cooking and urgent family notifications.')}</p>`:''}`,
  `<button class="btn" type="button" data-action="close-modal">${iT('Đóng','Close')}</button>`);document.querySelector('#modal-root .modal')?.classList.add('install-modal')}
function decorate(){const show=canOffer();
 // sidebar (tablet / desktop)
 const side=document.querySelector('.side-bottom');let sb=side?.querySelector('.install-side-link') as HTMLElement|null;
 if(side&&show&&!sb){const after=side.querySelector('.guide-side-link');(after?after:side).insertAdjacentHTML(after?'afterend':'beforeend',`<button type="button" class="side-link install-side-link" data-install="open"><span aria-hidden="true">${typeof moreIcon==='function'?moreIcon('install'):''}</span><span>${iT('Cài app','Install the app')}</span></button>`)}
 else if(sb&&!show)sb.remove();else if(sb)sb.lastElementChild!.textContent=iT('Cài app','Install the app');
 // Today reminder
 const main=document.getElementById('main');const old=main?.querySelector('.install-nudge');const later=+(store(LATER_KEY)||0);
 if(view==='today'&&main&&show&&Date.now()>later&&!old){const html=`<section class="callout install-nudge" role="note"><span class="install-nudge-art" aria-hidden="true">${art('home-add','install-pic')}</span><p>${iT('Thêm Bếp Nhà vào màn hình chính để mở nhanh như một app.','Add Bếp Nhà to your home screen to open it like an app.')}</p><span class="nudge-actions"><button class="btn primary" type="button" data-install="open">${iT('Cài app','Install')}</button><button class="btn small" type="button" data-install="later">${iT('Để sau','Later')}</button></span></section>`;
  if(typeof flowBeforeMeals==='function'&&main.querySelector(':scope > .dashboard-grid'))flowBeforeMeals(main,html);else(main.querySelector('.day-actions')||main.querySelector('.page-heading'))?.insertAdjacentHTML('afterend',html)}
 else if(old&&(!show||view!=='today'||Date.now()<=later))old.remove()}
function settingsCardHtml(){if(!canOffer())return'';return `<section class="kitchen-section kitchen-card" id="settings-install"><h3>${iT('Cài app','Install the app')}</h3><p class="kitchen-desc">${iT('Thêm Bếp Nhà vào màn hình chính để mở nhanh, dùng cả khi mất mạng.','Add Bếp Nhà to your home screen to open it quickly, even offline.')}</p><button class="btn" type="button" data-install="open">${iT('Thêm vào màn hình chính','Add to home screen')}</button></section>`}
document.addEventListener('click',e=>{const b=(e.target as any)?.closest?.('[data-install]');if(b){e.preventDefault();if(b.dataset.install==='later'){store(LATER_KEY,String(Date.now()+14*86400000));b.closest('.install-nudge')?.remove();return}if(typeof closeModal==='function'&&b.closest('#modal-root'))closeModal();openInstall();return}
 // More sheet (phones): a row next to “Hướng dẫn sử dụng”
 if((e.target as any)?.closest?.('[data-ui-more]'))setTimeout(()=>{const tools=document.querySelector('#modal-root .more-tools');if(!tools||!canOffer()||tools.querySelector('.more-install'))return;tools.insertAdjacentHTML('beforeend',`<button type="button" class="more-row more-install" data-install="open">${typeof moreIcon==='function'?moreIcon('install'):''}<span class="more-label">${iT('Cài app vào màn hình chính','Add to home screen')}</span><span class="more-chev" aria-hidden="true">›</span></button>`)},0)},true);
if(typeof otherSettingsModal==='function'){const base=otherSettingsModal;otherSettingsModal=function(this:any,...a:any[]){const r=base.apply(this,a);try{const host=document.querySelector('#modal-root .modal-content')||document.querySelector('#modal-root .modal');const anchor=host?.querySelector('#settings-other-title');if(anchor&&!host!.querySelector('#settings-install'))anchor.insertAdjacentHTML('afterend',settingsCardHtml())}catch(err){console.warn('install settings',err)}return r}}
{const base=render;render=function(this:any,...a:any[]){const r=base.apply(this,a);refresh();return r}}
const feats=(globalThis as any).APP_FEATURES;if(Array.isArray(feats)&&!feats.some((f:any)=>f.id==='install'))feats.splice(feats.length-1,0,{id:'install',art:'home-add',vi:'Cài app vào màn hình chính',en:'Add to home screen',dvi:'Mở Bếp Nhà nhanh như một app, kể cả khi mất mạng.',den:'Open Bếp Nhà like an app, even offline.',kw:'cai app install them vao man hinh chinh add to home screen homescreen ung dung',go:()=>{if(typeof closeModal==='function')closeModal();setTimeout(openInstall,0)}});
(globalThis as any).openInstall=openInstall;(globalThis as any).installState=()=>({installed:installed(),canOffer:canOffer(),prompt:!!deferred,ios:isIOS,android:isAndroid});
refresh();
})();
