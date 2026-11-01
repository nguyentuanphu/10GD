'use strict';
// Public notices from the owner console: banner, maintenance note, update prompt and feature switches.
// The endpoint is public and holds no personal data. Offline or unreachable: nothing is shown and nothing breaks.
const PLATFORM_NOTICE_URL='/.netlify/functions/studio?op=banner',PLATFORM_NOTICE_TTL=10*60*1000,PLATFORM_FLAG_KEY='bep-platform-flags',PLATFORM_DISMISS_KEY='bep-platform-dismissed';
let platformNotice=null,platformNoticeAt=0,platformNoticeBusy=false;
const platformT=(vi,en)=>typeof tr==='function'?tr(vi,en):(typeof appLanguage!=='undefined'&&appLanguage==='en'?en:vi);
function platformStore(kind){try{return kind==='session'?sessionStorage:localStorage}catch{return null}}
function platformRead(kind,key){try{return platformStore(kind)?.getItem(key)||''}catch{return ''}}
function platformWrite(kind,key,value){try{platformStore(kind)?.setItem(key,value)}catch{}}
function platformDismissed(){try{return JSON.parse(platformRead('local',PLATFORM_DISMISS_KEY)||'[]')}catch{return[]}}
function platformAccountMode(){return typeof accountSession!=='undefined'&&!!accountSession||globalThis.BEP_SESSION?.mode==='account'}
// Feature switches: a body class per feature that is turned off; CSS hides the matching entry point.
function applyPlatformFlags(flags){const known={priceScout:'flag-off-priceScout',voice:'flag-off-voice',urgentMessages:'flag-off-urgentMessages'};let changed=false;for(const [flag,cls] of Object.entries(known)){const off=flags?.[flag]===false;if(document.body.classList.contains(cls)!==off){document.body.classList.toggle(cls,off);changed=true}}if(changed&&typeof render==='function'&&!document.querySelector('.modal'))try{render()}catch{}}
// Editions are whole numbers (APP_EDITION in core.ts). A non-numeric minimum is ignored rather than guessed.
function platformNeedsUpdate(min){if(min==null||!/^\d+$/.test(String(min)))return false;return typeof APP_EDITION==='number'&&Number(min)>APP_EDITION}
function platformNoticeItems(data){const items=[],dismissed=platformDismissed(),en=typeof appLanguage!=='undefined'&&appLanguage==='en';if(!data)return items;
 const b=data.banner,audience=b?.audience||'all';if(b&&(b.vi||b.en)&&!dismissed.includes(String(b.id||''))&&(audience==='all'||audience==='account'&&platformAccountMode()||audience==='device-only'&&!platformAccountMode()))items.push({kind:'banner',key:String(b.id||'banner'),severity:b.severity==='warning'?'warning':'info',text:en?(b.en||b.vi):(b.vi||b.en)});
 if(data.maintenance&&platformRead('session','bep-platform-maintenance')!==String(data.maintenance))items.push({kind:'maintenance',key:String(data.maintenance),severity:'warning',title:platformT('Bảo trì','Maintenance'),text:String(data.maintenance)});
 if(platformNeedsUpdate(data.minAppEdition)&&platformRead('session','bep-platform-update')!==String(data.minAppEdition))items.push({kind:'update',key:String(data.minAppEdition),severity:'info',text:platformT('Có bản cập nhật — tải lại','An update is available — reload')});
 return items}
function renderPlatformBanner(){let host=document.getElementById('platform-notices');const items=platformNoticeItems(platformNotice);
 if(!items.length){host?.remove();return}
 if(!host){host=document.createElement('div');host.id='platform-notices';host.className='platform-notices';const main=document.getElementById('main');if(main?.parentNode)main.parentNode.insertBefore(host,main);else document.body.prepend(host)}
 host.setAttribute('aria-label',platformT('Thông báo từ ứng dụng','App notices'));host.setAttribute('role','region');host.replaceChildren();
 for(const item of items){const box=document.createElement('div');box.className='platform-banner '+item.severity+' platform-'+item.kind;box.dataset.platformNotice=item.kind;box.setAttribute('role','status');box.setAttribute('aria-live','polite');
  const icon=document.createElement('span');icon.className='platform-banner-icon';icon.setAttribute('aria-hidden','true');icon.textContent=item.kind==='update'?'↻':item.severity==='warning'?'!':'i';
  const text=document.createElement('p');text.className='platform-banner-text';text.setAttribute('data-user-content','');if(item.title){const t=document.createElement('b');t.textContent=item.title+': ';text.append(t)}text.append(document.createTextNode(item.text));
  const actions=document.createElement('div');actions.className='platform-banner-actions';
  if(item.kind==='update'){const reload=document.createElement('button');reload.type='button';reload.className='btn small primary';reload.dataset.platformAction='reload';reload.textContent=platformT('Tải lại','Reload');actions.append(reload)}
  const close=document.createElement('button');close.type='button';close.className='platform-banner-close';close.dataset.platformAction='dismiss';close.dataset.platformKind=item.kind;close.dataset.platformKey=item.key;close.setAttribute('aria-label',item.kind==='update'?platformT('Để sau','Later'):platformT('Đóng thông báo','Dismiss notice'));close.textContent='×';actions.append(close);
  box.append(icon,text,actions);host.append(box)}}
async function refreshPlatformNotice(force=false){if(platformNoticeBusy||!navigator.onLine||globalThis.BEP_OFFLINE)return;if(!force&&Date.now()-platformNoticeAt<PLATFORM_NOTICE_TTL)return;platformNoticeBusy=true;platformNoticeAt=Date.now();
 try{const res=await fetch(PLATFORM_NOTICE_URL,{credentials:'omit',cache:'no-cache'});if(!res.ok)return;const data=await res.json();if(!data||typeof data!=='object')return;platformNotice=data;if(Array.isArray(data.priceScoutStates)&&globalThis.PriceScout?.setSupportedStates?.(data.priceScoutStates)&&typeof render==='function'&&!document.querySelector('.modal'))render();applyPlatformFlags(data.flags);platformWrite('local',PLATFORM_FLAG_KEY,JSON.stringify(data.flags||{}));renderPlatformBanner()}catch{}finally{platformNoticeBusy=false}}
document.addEventListener('click',event=>{const el=event.target.closest?.('[data-platform-action]');if(!el)return;if(el.dataset.platformAction==='reload'){location.reload();return}
 const kind=el.dataset.platformKind,key=el.dataset.platformKey||'';if(kind==='banner')platformWrite('local',PLATFORM_DISMISS_KEY,JSON.stringify([...platformDismissed().filter(x=>x!==key)].concat(key).slice(-20)));else platformWrite('session',kind==='update'?'bep-platform-update':'bep-platform-maintenance',key);
 renderPlatformBanner();document.getElementById('main')?.focus?.({preventScroll:true})});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refreshPlatformNotice()});
addEventListener('online',()=>refreshPlatformNotice());
if(typeof changeAppLanguage==='function'){const platformLanguageChange=changeAppLanguage;changeAppLanguage=function(next){platformLanguageChange(next);renderPlatformBanner()}}
// Last known switches apply immediately (no flash of a turned-off feature); fresh values follow from the network.
try{applyPlatformFlags(JSON.parse(platformRead('local',PLATFORM_FLAG_KEY)||'{}'))}catch{}
refreshPlatformNotice(true);
