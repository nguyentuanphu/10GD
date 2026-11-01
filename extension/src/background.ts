// FamTray Scout — background service worker.
//  * Semi-auto: receives facts from pages the HUMAN opened, shows a badge count and
//    batch-sends them to the paired server ("scout-extension" observations).
//  * Auto: on a 1-minute alarm, starts a run only when every guardrail passes
//    (paired, Auto switched on here AND allowed in Studio, network on, not paused,
//    inside the schedule window, a normal Chrome window is open, the user is not
//    active). The run itself lives in runner.html inside one dedicated window.
declare const chrome:any,importScripts:any;
importScripts('build-info.js','default-config.js','scout-core.js','scout-client.js');
const SC=(globalThis as any).ScoutClient,CORE=(globalThis as any).ScoutCore;
const LABEL:any={woolworths:'Woolworths',coles:'Coles',aldi:'ALDI',chemist:'Chemist Warehouse',amazon:'Amazon AU'};

chrome.runtime.onInstalled.addListener(async()=>{const st=await chrome.storage.local.get(null);const init:any={};for(const [k,v] of Object.entries(SC.DEFAULTS))if(st[k]===undefined)init[k]=v;await chrome.storage.local.set(init);setup()});
chrome.runtime.onStartup.addListener(setup);
function setup(){chrome.alarms.create('scout-tick',{periodInMinutes:1});chrome.alarms.create('scout-heartbeat',{periodInMinutes:15});chrome.alarms.create('scout-flush',{periodInMinutes:1});SC.refreshConfig()}
setup();

async function heartbeat(){const st=await SC.get(['token','autoEnabled','semiEnabled','warnings','run']);if(!st.token)return null;
 try{const view=await SC.api('heartbeat',{version:SC.BUILD.version,configVersion:(await SC.get(['config'])).config?.version||SC.BUILD.configVersion||null,autoEnabled:st.autoEnabled===true,semiEnabled:st.semiEnabled!==false,running:!!st.run,signedIn:st.warnings.signedIn,storesSeen:st.warnings.storesSeen,storeMismatch:st.warnings.storeMismatch});await SC.set({device:view,deviceAt:Date.now()});if(view.configVersion)SC.refreshConfig();return view}catch{return null}}

// ---------- semi-auto ----------
let flushTimer:any=null;
async function queueSemi(result:any,tabId:number){
 const st=await SC.get(['token','semiEnabled','semiSites','paused','pendingSemi','warnings','run','device']);
 if(result.signedIn!==undefined||result.storeLabel){const w=st.warnings;if(result.signedIn===true)w.signedIn[result.retailer]=true;else if(result.signedIn===false&&w.signedIn[result.retailer])delete w.signedIn[result.retailer];if(result.storeLabel){w.storesSeen[result.retailer]=result.storeLabel;const want=st.device?.stores?.[result.retailer];w.storeMismatch[result.retailer]=!!want&&!CORE.storeMatches(result.storeLabel,want)}await SC.set({warnings:w})}
 if(st.run&&st.run.workTabId===tabId)return;// the auto runner reports its own pages
 if(result.challenge||!result.facts?.length){chrome.action.setBadgeText({tabId,text:''});return}
 chrome.action.setBadgeBackgroundColor({color:'#1f7a4d'});chrome.action.setBadgeText({tabId,text:String(Math.min(999,result.facts.length))});
 if(!st.token||st.paused||st.semiEnabled===false||st.semiSites[result.retailer]===false)return;
 const mismatch=!!st.warnings.storeMismatch[result.retailer];
 const pending=st.pendingSemi.filter((p:any)=>p.url!==result.url);pending.push({retailer:result.retailer,url:result.url,pageType:result.pageType,storeLabel:result.storeLabel||st.device?.stores?.[result.retailer]||null,storeMismatch:mismatch,status:result.status,facts:result.facts.slice(0,200),tabId});
 await SC.set({pendingSemi:pending.slice(-30)});clearTimeout(flushTimer);flushTimer=setTimeout(flushSemi,pending.reduce((n:number,p:any)=>n+p.facts.length,0)>=60?200:4000)}
async function flushSemi(){const st=await SC.get(['pendingSemi','token']);if(!st.token||!st.pendingSemi.length)return;await SC.set({pendingSemi:[]});
 const items=st.pendingSemi.map(({tabId,...x}:any)=>x);
 try{const r=await SC.api('results',{mode:'semi',items});const last=items[items.length-1];await SC.set({lastSemi:{at:Date.now(),count:(r.accepted||0)+(r.duplicates||0),accepted:r.accepted||0,retailer:last.retailer,retailerLabel:LABEL[last.retailer],store:last.storeLabel||null,pages:items.length}})}
 catch(e:any){if(e.status>=500||!e.status){const again=(await SC.get(['pendingSemi'])).pendingSemi;await SC.set({pendingSemi:[...items,...again].slice(-30)})}else await SC.set({lastSemi:{at:Date.now(),count:0,error:e.code||e.message}})}}

// ---------- auto ----------
async function canStart(){
 const st=await SC.get(['token','autoEnabled','paused','run','device']);if(!st.token||st.autoEnabled!==true||st.paused)return 'local-off';
 if(st.run&&Date.now()-st.run.heartbeatAt<5*60000)return 'running';
 const view=await heartbeat()||st.device;if(!view)return 'offline';
 if(view.network?.autoScout!=='on')return 'auto-off';if(view.network?.paused)return 'paused-global';if(!view.autoAllowed)return 'device-not-allowed';if(view.paused)return 'paused-device';
 if(!CORE.inWindow(Date.now(),view.schedule,view.timeZone))return 'outside-window';
 const wins=await chrome.windows.getAll({windowTypes:['normal']});if(!wins.length)return 'no-window';// only while Chrome is open with a window
 const idle=await chrome.idle.queryState(60);if(idle==='active'&&!SC.BUILD.test)return 'user-active';// wait for the user to step away
 return null}
async function startRun(){const why=await canStart();if(why)return why;
 const win=await chrome.windows.create({url:chrome.runtime.getURL('runner.html'),focused:false,type:'normal',width:900,height:700});
 await SC.set({run:{windowId:win.id,startedAt:Date.now(),heartbeatAt:Date.now(),workTabId:null}});return null}
chrome.alarms.onAlarm.addListener(async(a:any)=>{if(a.name==='scout-tick')startRun();else if(a.name==='scout-heartbeat')heartbeat();else if(a.name==='scout-flush')flushSemi()});
chrome.windows.onRemoved.addListener(async(id:number)=>{const st=await SC.get(['run']);if(st.run?.windowId===id)await SC.set({run:null})});

chrome.runtime.onMessage.addListener((msg:any,sender:any,reply:any)=>{
 (async()=>{
  if(msg?.type==='page-result'&&sender.tab)return queueSemi(msg.result,sender.tab.id);
  if(msg?.type==='run-now')return startRun();
  if(msg?.type==='flush')return flushSemi();
  if(msg?.type==='heartbeat')return heartbeat();
  if(msg?.type==='notify')return chrome.notifications.create('scout-'+Date.now(),{type:'basic',iconUrl:'icon-128.png',title:msg.title,message:msg.message,priority:2});
  // Graceful stop: the runner sees stopRun, releases its leases and closes its window.
  // If it does not answer within 10 s the window is closed; leases then expire server-side.
  if(msg?.type==='stop-run'){await SC.set({stopRun:Date.now()});setTimeout(async()=>{const st=await SC.get(['run']);if(st.run?.windowId)try{await chrome.windows.remove(st.run.windowId)}catch{}},10000);return true}
 })().then(reply,()=>reply(null));return true});
// ---------- one-click pairing from the app page (v1.7) ----------
// The app page (My kitchen → Pair this computer) may only: ping (is the extension here,
// is it paired with THIS app) and pair (hand over a one-time code it just created). The
// server address is ALWAYS the sender's own origin, never a value from the message. The
// device token stays in extension storage and is never sent to the page.
const sameServer=(a:any,b:any)=>{try{return new URL(a).origin===new URL(b).origin}catch{return false}};
async function external(msg:any,origin:string){
 const st=await SC.get(['token','server','device','deviceId']),here=!!st.token&&sameServer(st.server,origin);
 const status={ok:true,app:'famtray-scout',version:SC.BUILD.version,paired:!!st.token,pairedHere:here,deviceName:here?(st.device?.name||null):null,deviceId:here?(st.deviceId||null):null};
 if(msg?.type==='ping')return status;
 if(msg?.type==='pair'){
  // Already paired with this app: keep it, unless the server says the device was revoked
  // (api() clears the token on 401 revoked), in which case pair again below.
  if(here){try{await SC.api('device');return {...status,already:true}}catch(e:any){if(e.status!==401)return {...status,already:true}}}
  else if(st.token)return {ok:false,app:'famtray-scout',error:'paired-elsewhere'};
  const code=String(msg.code||'').toUpperCase().replace(/[^A-Z0-9]/g,'');if(code.length!==8)return {ok:false,app:'famtray-scout',error:'bad-code'};
  const name=String(msg.name||'').replace(/\s+/g,' ').trim().slice(0,40)||'Chrome',postcode=/^\d{4}$/.test(String(msg.postcode||''))?String(msg.postcode):'',suburb=String(msg.suburb||'').trim().slice(0,40);
  await SC.set({server:origin});
  try{const r=await SC.api('pair',{code,name,postcode,suburb,timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone,version:SC.BUILD.version},{token:''});
   await SC.set({token:r.token,deviceId:r.device.id,device:r.device,pairedVia:'app'});
   return {ok:true,app:'famtray-scout',version:SC.BUILD.version,paired:true,pairedHere:true,deviceName:r.device?.name||name,deviceId:r.device?.id||null}}
  catch(e:any){if(!(await SC.get(['token'])).token)await SC.set({server:st.server||''});return {ok:false,app:'famtray-scout',error:e.code||'pair-failed',message:e.message}}}
 return {ok:false,app:'famtray-scout',error:'unsupported'}}
chrome.runtime.onMessageExternal.addListener((msg:any,sender:any,reply:any)=>{
 const origin=sender?.origin||(()=>{try{return new URL(sender?.url).origin}catch{return ''}})();
 if(sender?.id&&sender.id!==chrome.runtime.id||!SC.appOriginAllowed(origin)){reply({ok:false,app:'famtray-scout',error:'origin-not-allowed'});return false}
 if(!msg||typeof msg!=='object'||JSON.stringify(msg).length>2000){reply({ok:false,app:'famtray-scout',error:'bad-message'});return false}
 external(msg,origin).then(reply,()=>reply({ok:false,app:'famtray-scout',error:'failed'}));return true});
// Right after install, an app tab that is waiting on the install steps (it marks its own
// URL with ?scout-wait=1) is reloaded so the page can see the new extension and offer
// "Pair now". Other tabs are never touched.
async function reloadWaitingTabs(){let n=0;try{for(const t of await chrome.tabs.query({})){let u:URL;try{u=new URL(t.url||'')}catch{continue}if(u.searchParams.get('scout-wait')==='1'&&SC.appOriginAllowed(u.origin)){await chrome.tabs.reload(t.id);n++}}}catch{}return n}
chrome.runtime.onInstalled.addListener((d:any)=>{if(d?.reason==='install')reloadWaitingTabs()});
(globalThis as any).scoutDebug={startRun,flushSemi,heartbeat,canStart,reloadWaitingTabs,originAllowed:(o:string)=>SC.appOriginAllowed(o)};
