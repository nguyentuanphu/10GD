'use strict';
// Anonymous usage statistics (v1.7). ON by default with an opt-out in "Cài đặt khác"
// ("Gửi thống kê sử dụng ẩn danh"); Studio can switch it off for everyone (flags.usageAnalytics).
// Counts only, never content: active seconds per day and per hour of day, sessions, and how often
// a fixed list of features was opened. Plus: a random install id (this device), app version,
// language, platform class (mobile / tablet / desktop, installed app or browser) and the family's
// Price Scout postcode if one is set. Never recipe content, names, free text, search terms, voice,
// prices or any personal data. Account and family are worked out by the server from the session.
// Active time counts only while the page is visible AND there was a pointer / key / scroll / touch
// in the last 60 s; a new session starts after 30 min without activity. Batches are kept on this
// device (max 14 days), sent every 5 minutes and when the page is hidden; offline they wait.
// Full description: /privacy.html#usage.
const USAGE_STATE_KEY='bep-usage-v1',USAGE_INSTALL_KEY='bep-usage-install',USAGE_OPTOUT_KEY='bep-usage-optout',USAGE_FORGET_KEY='bep-usage-forget',USAGE_API='/.netlify/functions/usage';
const USAGE_IDLE_MS=60000,USAGE_SESSION_GAP=30*60000,USAGE_TICK_MS=15000,USAGE_FLUSH_MS=5*60000,USAGE_MAX_DAYS=14,USAGE_MAX_TICK=20000;
const USAGE_FEATURES=['today','plan','shopping','library','pantry','recipe-edit','voice','price-scout','community-price','offline-download','family-connect','reminders','spending','insights','settings'];
const USAGE_VIEW_FEATURE={today:'today',planner:'plan',shopping:'shopping',recipes:'library',pantry:'pantry',expenses:'spending',insights:'insights'};
const usageT=(vi,en)=>typeof tr==='function'?tr(vi,en):(typeof appLanguage!=='undefined'&&appLanguage==='en'?en:vi);
let usageMem=null,usageLastInteraction=0,usageLastTick=0,usageLastView='',usageThrottle={},usageTimer=0,usageStarted=false;

function usageGet(k){try{return localStorage.getItem(k)}catch{return null}}
function usageSet(k,v){try{if(v==null)localStorage.removeItem(k);else localStorage.setItem(k,v)}catch{}}
function usageOptedOut(){return usageGet(USAGE_OPTOUT_KEY)==='1'}
function usageFlagOff(){try{return JSON.parse(usageGet('bep-platform-flags')||'{}')?.usageAnalytics===false}catch{return false}}
function usageEnabled(){return !usageOptedOut()&&!usageFlagOff()}
function usageEmpty(){return{v:1,days:{},lastActive:0,pending:null}}
function usageLoad(){if(usageMem)return usageMem;try{const s=JSON.parse(usageGet(USAGE_STATE_KEY)||'null');if(s&&s.v===1&&s.days&&typeof s.days==='object'){usageMem={...usageEmpty(),...s};return usageMem}}catch{}usageMem=usageEmpty();return usageMem}
function usageSave(){if(usageMem)usageSet(USAGE_STATE_KEY,JSON.stringify(usageMem))}
function usageClear(){usageMem=usageEmpty();usageSet(USAGE_STATE_KEY,null)}
function usageRandom(n){const a=new Uint8Array(n);crypto.getRandomValues(a);return btoa(String.fromCharCode(...a)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function usageInstall(){let t=usageGet(USAGE_INSTALL_KEY);if(!t||!/^[A-Za-z0-9_-]{24,64}$/.test(t)){try{t=usageRandom(24)}catch{return ''}usageSet(USAGE_INSTALL_KEY,t)}return t}
function usageDayOf(ms){const d=new Date(ms);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function usageBucket(st,day){let b=st.days[day];if(!b){b=st.days[day]={secs:0,sessions:0,hours:new Array(24).fill(0),features:{}};const keys=Object.keys(st.days).sort();while(keys.length>USAGE_MAX_DAYS)delete st.days[keys.shift()]}return b}
function usageVisible(){return typeof document==='undefined'||document.visibilityState==='visible'}

// Credits the time since the previous tick when the page is visible and someone interacted recently.
function usageTick(now=Date.now()){
 if(!usageEnabled()){if(usageFlagOff()&&(usageMem?.pending||Object.keys(usageLoad().days).length))usageClear();usageLastTick=now;return 0}
 const prev=usageLastTick||now;usageLastTick=now;
 if(!usageVisible()||now-usageLastInteraction>USAGE_IDLE_MS)return 0;
 const st=usageLoad();let left=Math.min(Math.max(0,now-prev),USAGE_MAX_TICK),t=now;let credited=0;
 // Split across hour (and day) boundaries so the hour-of-day histogram stays exact.
 while(left>0){const d=new Date(t-1),hourStart=new Date(d.getFullYear(),d.getMonth(),d.getDate(),d.getHours()).getTime(),part=Math.min(left,t-hourStart);const b=usageBucket(st,usageDayOf(t-1));b.secs+=part/1000;b.hours[d.getHours()]+=part/1000;credited+=part;left-=part;t-=part}
 st.lastActive=now;usageSave();return credited;
}
function usageInteract(now=Date.now()){
 if(!usageEnabled())return;
 if(usageVisible()&&now-usageLastInteraction<=USAGE_IDLE_MS)usageTick(now);else usageLastTick=now;
 const st=usageLoad();
 if(!st.lastActive||now-st.lastActive>USAGE_SESSION_GAP){usageBucket(st,usageDayOf(now)).sessions++}
 st.lastActive=now;usageLastInteraction=now;usageSave();
}
function usageFeature(id,{throttle=0,now=Date.now()}={}){
 if(!USAGE_FEATURES.includes(id)||!usageEnabled())return false;
 if(throttle&&now-(usageThrottle[id]||0)<throttle)return false;usageThrottle[id]=now;
 const b=usageBucket(usageLoad(),usageDayOf(now));b.features[id]=(b.features[id]||0)+1;usageSave();return true;
}
function usagePlatform(){
 let cls='desktop';try{const w=Math.min(screen.width||innerWidth,screen.height||innerHeight)||innerWidth,coarse=matchMedia('(pointer: coarse)').matches;cls=w<600?'mobile':coarse&&w<1100?'tablet':(innerWidth<600?'mobile':innerWidth<1100&&coarse?'tablet':'desktop')}catch{}
 let standalone=false;try{standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true}catch{}
 return{platform:cls,standalone};
}
function usagePostcode(){try{if(typeof familyStorage==='undefined')return null;const d=JSON.parse(familyStorage.getItem('bep-price-scout-v1')||'null');return /^\d{4}$/.test(String(d?.postcode||''))?String(d.postcode):null}catch{return null}}
function usageVersion(){const ed=typeof APP_EDITION!=='undefined'?String(APP_EDITION):'0',b=String(globalThis.BEP_BUILD||'').slice(0,8);return /^\d{8}$/.test(b)?ed+'/'+b:ed}
function usageDaysPayload(st){return Object.keys(st.days).sort().map(day=>{const b=st.days[day];const features={};for(const [k,n] of Object.entries(b.features||{}))if(USAGE_FEATURES.includes(k)&&n>0)features[k]=Math.min(2000,n|0);return{day,secs:Math.min(86400,Math.round(b.secs)),sessions:Math.min(500,b.sessions|0),hours:b.hours.map(h=>Math.min(3600,Math.round(h))),features}}).filter(d=>d.secs>0||d.sessions>0||Object.keys(d.features).length)}
function usageAccountMode(){return globalThis.BEP_SESSION?.mode==='account'}
function usageOnline(){return typeof navigator==='undefined'||navigator.onLine!==false&&!globalThis.BEP_OFFLINE}
// Sends the pending batch (creating it from the queue first). A batch keeps its id until the server
// confirms it, so a page-hide beacon followed by a retry is counted once.
let usageInflight=null;
function usageFlush(opts={}){if(opts.beacon)return usageSend(opts);if(usageInflight)return usageInflight;usageInflight=usageSend(opts).finally(()=>{usageInflight=null});return usageInflight}
async function usageSend({beacon=false,fetchFn}={}){
 if(!usageEnabled())return false;
 // v1.7.18: nothing is sent while the “Tự chạy thử” self-test panel is open — the 5-minute flush could fall between opening the
 // panel and starting the run (CI, desktop EN), outside the run's own sandbox; the counts wait for the next flush
 if(typeof document!=='undefined'&&(document.getElementById('ap-panel')||document.documentElement.classList.contains('ap-running')))return false;
 // v1.7: the app's offline flag can lag behind a restored network until the connectivity checker confirms it.
 if(!usageOnline()){const c=(globalThis as any).BepConnectivity;if(beacon||!c||(typeof navigator!=='undefined'&&navigator.onLine===false))return false;if(!(await c.wake().catch(()=>false))||!usageOnline())return false}
 const st=usageLoad(),install=usageInstall();if(!install)return false;
 if(!st.pending){const days=usageDaysPayload(st);if(!days.length)return false;const p=usagePlatform();
  st.pending={batch:usageRandom(12),body:{v:1,install,batch:'',ver:usageVersion(),lang:typeof appLanguage!=='undefined'&&appLanguage==='en'?'en':'vi',platform:p.platform,standalone:p.standalone,postcode:usagePostcode(),days}};
  st.pending.body.batch=st.pending.batch;st.days={};usageSave()}
 const body=JSON.stringify(st.pending.body),batch=st.pending.batch,url=USAGE_API+'?op=ingest',credentials=usageAccountMode()?'same-origin':'omit';
 if(beacon){
  // Device-only mode never attaches the account cookie (beacons always would), so it uses keepalive fetch.
  try{if(credentials!=='omit'&&navigator.sendBeacon&&navigator.sendBeacon(url,new Blob([body],{type:'application/json'})))return true}catch{}
  try{(fetchFn||fetch)(url,{method:'POST',keepalive:true,credentials,headers:{'Content-Type':'application/json'},body}).catch(()=>{})}catch{}
  return true}
 try{const r=await (fetchFn||fetch)(url,{method:'POST',credentials,headers:{'Content-Type':'application/json'},body});
  if(r.ok||r.status===400||r.status===413){const cur=usageLoad();if(cur.pending?.batch===batch){cur.pending=null;usageSave()}if(r.status===202)usageClear();return r.ok&&r.status!==202}}catch{}
 return false;
}
async function usageForget(install,fetchFn){
 if(!install)return true;
 try{const r=await (fetchFn||fetch)(USAGE_API+'?op=forget',{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify({install})});if(r.ok){usageSet(USAGE_FORGET_KEY,null);return true}}catch{}
 usageSet(USAGE_FORGET_KEY,install);return false;
}
// Off ⇒ nothing is sent, the local queue is cleared and the server deletes this install's data (once).
async function usageSetOptOut(off,{fetchFn}={}){
 if(off){const install=usageGet(USAGE_INSTALL_KEY);usageSet(USAGE_OPTOUT_KEY,'1');usageClear();usageSet(USAGE_INSTALL_KEY,null);await usageForget(install,fetchFn);return false}
 usageSet(USAGE_OPTOUT_KEY,null);return true;
}
function usageRetryForget(){const install=usageGet(USAGE_FORGET_KEY);if(install&&usageOnline())usageForget(install)}

// ---------- feature hooks (navigation + a few existing entry points) ----------
function usageNoteView(){try{const v=typeof view!=='undefined'?view:'';if(v&&v!==usageLastView){usageLastView=v;const f=USAGE_VIEW_FEATURE[v];if(f)usageFeature(f)}}catch{}}
const USAGE_CLICK_FEATURES=[
 ['[data-scout],[data-voice-price]','price-scout'],['[data-community]','community-price'],['[data-offline-download]','offline-download'],
 ['[data-personal="accounts"],[data-personal="invite"],[data-personal="new-family"],[data-personal="switch"],[data-feature="cloud-settings"],#hub-invite-code','family-connect'],
 ['[data-action="reminders"],[data-section="reminders"]','reminders'],['[data-personal="voice"]','voice'],['[data-personal="other-settings"],[data-personal="settings"],[data-action="settings"]','settings']];
function usageClick(e){const t=e.target;if(!t?.closest)return;for(const [sel,id] of USAGE_CLICK_FEATURES)if(t.closest(sel)){usageFeature(id,{throttle:20000});return}}
function usageHook(){
 if(typeof render==='function'){const usageBaseRender=render;render=function(...a){const r=usageBaseRender.apply(this,a);usageNoteView();return r}}
 if(typeof recipeForm==='function'){const usageBaseRecipeForm=recipeForm;recipeForm=function(...a){usageFeature('recipe-edit',{throttle:5000});return usageBaseRecipeForm.apply(this,a)}}
 if(typeof applyPlatformFlags==='function'){const usageBaseFlags=applyPlatformFlags;applyPlatformFlags=function(flags){const r=usageBaseFlags.apply(this,arguments);if(flags?.usageAnalytics===false)usageClear();return r}}
}

// ---------- settings card (Cài đặt khác) ----------
// v1.7.14 (owner pop-up, 8 Nov 2026: “giọng nói và analytics luôn bật sẵn và phần bật tắt này chữ nhỏ thôi và luôn luôn collapsed, wordings
// cần lược chung chung hơn”): on by default (unchanged), the switch sits in a small section that is closed every time settings open
function usageSettingsCard(){
 const on=!usageOptedOut(),off=usageFlagOff();
 const body=`<label class="usage-toggle" for="usage-optin"><input type="checkbox" role="switch" id="usage-optin" ${on?'checked':''} ${off?'disabled':''}><span>${usageT('Gửi thống kê sử dụng ẩn danh','Share anonymous usage statistics')}</span></label>
 <p class="hint usage-hint">${off?usageT('Hiện đang tạm ngừng cho mọi người.','Currently paused for everyone.')+' ':''}${usageT('Bật sẵn. Giúp làm app tốt hơn; không gửi nội dung của gia đình. Tắt là xoá dữ liệu đã gửi từ máy này.','On by default. Helps make the app better; nothing your family writes is sent. Turning it off deletes what this device sent.')} <a href="/privacy.html#usage" target="_blank" rel="noopener">${usageT('Xem chi tiết','Details')}</a></p>`;
 return `<section class="kitchen-section privacy-mini-section" id="settings-usage"><details class="privacy-mini"><summary>${usageT('Thống kê sử dụng','Usage statistics')}</summary>${body}</details></section>`;
}
function usageInstallSettings(){
 if(typeof otherSettingsModal!=='function')return;const usageBaseOther=otherSettingsModal;
 otherSettingsModal=function(section=''){const r=usageBaseOther.apply(this,arguments);const host=document.querySelector('.modal.other-settings .modal-content')||document.querySelector('.modal .modal-content');const data=document.getElementById('settings-data');
  if(!document.getElementById('settings-usage')){if(data)data.insertAdjacentHTML('afterend',usageSettingsCard());else host?.insertAdjacentHTML('beforeend',usageSettingsCard())}
  if(section==='usage')requestAnimationFrame(()=>{const d=document.querySelector('#settings-usage details') as HTMLDetailsElement|null;if(d)d.open=true;document.getElementById('settings-usage')?.scrollIntoView({block:'start'})});return r};
 document.addEventListener('change',e=>{if(e.target?.id!=='usage-optin')return;const on=!!e.target.checked;usageSetOptOut(!on).then(()=>{typeof toast==='function'&&toast(on?usageT('Đã bật thống kê sử dụng ẩn danh.','Anonymous usage statistics turned on.'):usageT('Đã tắt và yêu cầu xoá dữ liệu đã gửi.','Turned off and asked to delete what was sent.'))})});
}

// ---------- one-time "terms updated" notice for existing community price contributors ----------
const PRIVACY_TERMS_VERSION='2026-11-01',TERMS_NOTICE_KEY='bep-terms-notice';
function termsStatus(){try{if(typeof scoutCommunity!=='undefined'&&scoutCommunity?.status)return scoutCommunity.status}catch{}try{return typeof familyStorage!=='undefined'?JSON.parse(familyStorage.getItem('bep-price-scout-v1')||'null')?.communityStatus||null:null}catch{return null}}
function termsNoticeDue(){const s=termsStatus();if(!s?.termsAcceptedAt||usageGet(TERMS_NOTICE_KEY)===PRIVACY_TERMS_VERSION)return false;return (s.acceptedTermsVersion||'')!==PRIVACY_TERMS_VERSION}
function renderTermsNotice(){
 let box=document.getElementById('terms-notice');if(!termsNoticeDue()){box?.remove();return}
 if(!box){box=document.createElement('div');box.id='terms-notice';box.className='terms-notice';box.setAttribute('role','status');const main=document.getElementById('main');if(main?.parentNode)main.parentNode.insertBefore(box,main);else return}
 box.innerHTML=`<p><b>${usageT('Điều khoản đã cập nhật','Terms updated')}</b> · ${usageT('Điều khoản chia sẻ giá cộng đồng và quyền riêng tư đã có bản chính thức (1/11/2026).','The community price sharing terms and privacy notice are now final (1 Nov 2026).')} <a href="/privacy.html#community" target="_blank" rel="noopener">${usageT('Xem','View')}</a></p><button type="button" class="terms-notice-close" data-terms-dismiss aria-label="${usageT('Đóng thông báo','Dismiss notice')}">×</button>`;
}
document.addEventListener('click',e=>{if(!e.target?.closest?.('[data-terms-dismiss]'))return;usageSet(TERMS_NOTICE_KEY,PRIVACY_TERMS_VERSION);document.getElementById('terms-notice')?.remove();document.getElementById('main')?.focus?.({preventScroll:true})});

// ---------- start (after load, when idle; never blocks startup) ----------
function usageStart(){
 if(usageStarted)return;usageStarted=true;
 const opts={capture:true,passive:true},on=()=>usageInteract();
 for(const ev of ['pointerdown','keydown','scroll','touchstart','wheel'])addEventListener(ev,on,opts);
 document.addEventListener('click',usageClick,true);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){usageTick();usageFlush({beacon:true})}else usageLastTick=Date.now()});
 addEventListener('pagehide',()=>{usageTick();usageFlush({beacon:true})});
 addEventListener('online',()=>{usageRetryForget();usageFlush()});
 addEventListener('bep-connectivity',()=>{if(usageOnline()){usageRetryForget();usageFlush()}});
 usageTimer=setInterval(()=>usageTick(),USAGE_TICK_MS);setInterval(()=>usageFlush(),USAGE_FLUSH_MS);
 usageNoteView();usageRetryForget();renderTermsNotice();setTimeout(()=>usageFlush(),3000);
}
if(typeof document!=='undefined'&&typeof window!=='undefined'){
 usageHook();usageInstallSettings();
 if(typeof changeAppLanguage==='function'){const usageBaseLang=changeAppLanguage;changeAppLanguage=function(){const r=usageBaseLang.apply(this,arguments);if(document.getElementById('terms-notice'))renderTermsNotice();return r}}
 const idle=f=>typeof requestIdleCallback==='function'?requestIdleCallback(f,{timeout:4000}):setTimeout(f,1500);
 if(document.readyState==='complete')idle(usageStart);else addEventListener('load',()=>idle(usageStart),{once:true});
}
