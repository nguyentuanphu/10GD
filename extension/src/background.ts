// FamTray Scout — background service worker.
//  * Semi-auto: receives facts from pages the HUMAN opened, shows a badge count and
//    batch-sends them to the paired server ("scout-extension" observations).
//  * Auto: on a 1-minute alarm, starts a run only when every guardrail passes
//    (paired, Auto switched on here AND allowed in Studio, network on, not paused,
//    inside the schedule window, a normal Chrome window is open, the user is not
//    active). The run itself lives in runner.html inside one dedicated window.
declare const chrome:any;
// The build prepends build info, parser config, ScoutCore and ScoutClient to this file
// (one bundled background.js, v1.7.1); no importScripts.
const SC=(globalThis as any).ScoutClient,CORE=(globalThis as any).ScoutCore;
const LABEL:any={woolworths:'Woolworths',coles:'Coles',aldi:'ALDI',chemist:'Chemist Warehouse',amazon:'Amazon AU'};

chrome.runtime.onInstalled.addListener(async()=>{const st=await chrome.storage.local.get(null);const init:any={};for(const [k,v] of Object.entries(SC.DEFAULTS))if(st[k]===undefined)init[k]=v;await chrome.storage.local.set(init);setup()});
chrome.runtime.onStartup.addListener(setup);
// v1.7 remote control: heartbeat every minute while Chrome runs (the chrome.alarms
// minimum) and once right away on startup/wake, so Studio commands arrive within ~1 min.
function setup(){chrome.alarms.create('scout-tick',{periodInMinutes:1});chrome.alarms.create('scout-heartbeat',{periodInMinutes:1});chrome.alarms.create('scout-flush',{periodInMinutes:1});SC.refreshConfig();heartbeat()}
setup();
try{chrome.idle.onStateChanged.addListener((s:string)=>{if(s==='active')heartbeat()})}catch{}

var beating:Promise<any>|null=null;// var: setup() above calls heartbeat() before this line runs
function heartbeat(){beating=beating||beat().finally(()=>{beating=null});return beating}
async function beat(){const st=await SC.get(['token','autoEnabled','semiEnabled','warnings','run','lastRun','blockedEvents','paused','battery','lastWhy']);if(!st.token)return null;
 let chromeOpen=true,idle:any=null;try{chromeOpen=(await chrome.windows.getAll({windowTypes:['normal']})).length>0}catch{}try{idle=await chrome.idle.queryState(60)}catch{}
 const b=(st.blockedEvents||[])[0],lr=st.lastRun;
 try{const view=await SC.api('heartbeat',{version:SC.version(),configVersion:(await SC.get(['config'])).config?.version||SC.BUILD.configVersion||null,autoEnabled:st.autoEnabled===true,semiEnabled:st.semiEnabled!==false,running:!!st.run,signedIn:st.warnings.signedIn,storesSeen:st.warnings.storesSeen,storeMismatch:st.warnings.storeMismatch,
   chromeOpen,idle,paused:st.paused===true,why:st.run?null:st.lastWhy||null,battery:st.battery||null,run:st.run?{pages:st.run.pages||0,prices:st.run.prices||0,startedAt:st.run.startedAt}:null,
   lastRun:lr?{at:lr.at,pages:lr.pages,prices:lr.prices,skipped:lr.skipped,errors:lr.errors||0,stop:lr.stop}:null,lastError:b?{at:b.at,retailer:b.retailer,kind:b.kind}:null});
  const {commands,...dev}=view;await SC.set({device:dev,deviceAt:Date.now()});if(dev.configVersion)SC.refreshConfig();
  if(Array.isArray(commands)&&commands.length)await runCommands(commands);
  if(dev.stopRequestedAt&&st.run&&dev.stopRequestedAt>=st.run.startedAt)await stopNow();
  return dev}catch{return null}}
// ---------- remote commands from Studio (delivered with the heartbeat) ----------
async function stopNow(){await SC.set({stopRun:Date.now()});setTimeout(async()=>{const st=await SC.get(['run']);if(st.run?.windowId)try{await chrome.windows.remove(st.run.windowId)}catch{}},10000)}
async function recheckStores(){const w=(await SC.get(['warnings'])).warnings;w.storesSeen={};w.storeMismatch={};await SC.set({warnings:w});let n=0;
 for(const t of await chrome.tabs.query({}))try{const r=await chrome.tabs.sendMessage(t.id,{type:'extract'});if(r){await queueSemi(r,t.id);n++}}catch{}return n}
async function runCommands(list:any[]){for(const c of list.slice(0,10)){let ok=true,result='';
 try{if(c.type==='run-now'){const why=await startRun({explicit:true});ok=!why||why==='running';result=why||'started'}
  else if(c.type==='stop'||c.type==='pause'){const st=await SC.get(['run']);if(st.run)await stopNow();result=st.run?'stopping':'not-running'}
  else if(c.type==='resume'){result='resumed'}
  else if(c.type==='pace'){result='pace-updated'}
  else if(c.type==='refresh-config'){await SC.set({config:null});await SC.refreshConfig();result='config '+((await SC.get(['config'])).config?.version||'bundled')}
  else if(c.type==='recheck-stores'){result='tabs '+await recheckStores()}
  else{ok=false;result='unsupported'}}catch(e:any){ok=false;result=String(e?.message||e).slice(0,100)}
 try{await SC.api('command-result',{id:c.id,ok,result})}catch{}}}

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
 const pending=st.pendingSemi.filter((p:any)=>p.url!==result.url);pending.push({retailer:result.retailer,url:result.url,capturedAt:result.capturedAt||new Date().toISOString(),pageType:result.pageType,storeLabel:result.storeLabel||st.device?.stores?.[result.retailer]||null,storeMismatch:mismatch,status:result.status,facts:result.facts.slice(0,200),tabId});
 await SC.set({pendingSemi:pending.slice(-30)});clearTimeout(flushTimer);flushTimer=setTimeout(flushSemi,pending.reduce((n:number,p:any)=>n+p.facts.length,0)>=60?200:4000)}
async function flushSemi(){const st=await SC.get(['pendingSemi','token']);if(!st.token||!st.pendingSemi.length)return;await SC.set({pendingSemi:[]});
 const items=st.pendingSemi.map(({tabId,...x}:any)=>x);
 try{const r=await SC.api('results',{mode:'semi',items});const last=items[items.length-1];await SC.set({lastSemi:{at:Date.now(),count:(r.accepted||0)+(r.duplicates||0),accepted:r.accepted||0,retailer:last.retailer,retailerLabel:LABEL[last.retailer],store:last.storeLabel||null,pages:items.length}})}
 catch(e:any){if(e.status>=500||!e.status){const again=(await SC.get(['pendingSemi'])).pendingSemi;await SC.set({pendingSemi:[...items,...again].slice(-30)})}else await SC.set({lastSemi:{at:Date.now(),count:0,error:e.code||e.message}})}}

// ---------- auto ----------
// Run now (v1.7): an explicit, server-granted run skips ONLY the schedule window and the
// "user is active" wait. Kill switches, pauses, caps, pacing, robots.txt, challenge stop,
// battery and Chrome-open checks are unchanged (and enforced again by the server).
// v1.7.2: a person pressing Run now ON THIS COMPUTER (popup/Settings, `local`) is that person's consent,
// so it works once steps ①–④ are done (paired, Studio on + allowed, computer prepared) even while
// the local Auto switch (⑤, consent for scheduled and Studio-started runs) is off. Studio commands
// and the schedule still need ⑤.
async function canStart({explicit=false,local=false}:any={}){
 const st=await SC.get(['token','autoEnabled','paused','run','device','onboarding']);const ob=st.onboarding||{},prepared=!!(ob.profile&&ob.rewards&&ob.store);
 if(!st.token||st.paused)return 'local-off';if(st.autoEnabled!==true&&!(explicit&&local&&prepared))return 'local-off';
 if(st.run&&Date.now()-st.run.heartbeatAt<5*60000)return 'running';
 const view=(explicit?null:await heartbeat())||(await SC.get(['device'])).device||st.device;if(!view)return 'offline';
 if(view.network?.autoScout!=='on')return 'auto-off';if(view.network?.paused)return 'paused-global';if(!view.autoAllowed)return 'device-not-allowed';if(view.paused)return 'paused-device';
 const runNow=!!view.runNow&&!view.runNow.runId&&Date.parse(view.runNow.until)>Date.now();
 if(!runNow&&!CORE.inWindow(Date.now(),view.schedule,view.timeZone))return 'outside-window';
 const wins=await chrome.windows.getAll({windowTypes:['normal']});if(!wins.length)return 'no-window';// only while Chrome is open with a window
 if(!runNow){const idle=await chrome.idle.queryState(60);if(idle==='active'&&!SC.BUILD.test)return 'user-active'}// wait for the user to step away
 return null}
async function startRun(opts:any={}){const why=await canStart(opts);if(why!=='running')await SC.set({lastWhy:why||null});if(why)return why;
 const win=await chrome.windows.create({url:chrome.runtime.getURL('runner.html'),focused:false,type:'normal',width:900,height:700});
 await SC.set({run:{windowId:win.id,startedAt:Date.now(),heartbeatAt:Date.now(),workTabId:null,explicit:!!opts.explicit,local:!!(opts.explicit&&opts.local)}});heartbeat();return null}
// Popup "Run now": ask the server for a one-run grant (only works when allowed), then start.
async function requestRunNow(local=false){try{const view=await SC.api('run-now',{});await SC.set({device:view});return await startRun({explicit:true,local})}catch(e:any){return e.code||'refused'}}
chrome.alarms.onAlarm.addListener(async(a:any)=>{if(a.name==='scout-tick')startRun();else if(a.name==='scout-heartbeat')heartbeat();else if(a.name==='scout-flush')flushSemi()});
chrome.windows.onRemoved.addListener(async(id:number)=>{const st=await SC.get(['run']);if(st.run?.windowId===id)await SC.set({run:null})});

chrome.runtime.onMessage.addListener((msg:any,sender:any,reply:any)=>{
 (async()=>{
  if(msg?.type==='page-result'&&sender.tab)return queueSemi(msg.result,sender.tab.id);
  if(msg?.type==='run-now')return SC.BUILD.test&&msg.direct?startRun(msg.local?{explicit:true,local:true}:{}):requestRunNow(msg.local===true);
  if(msg?.type==='flush')return flushSemi();
  if(msg?.type==='heartbeat')return heartbeat();
  if(msg?.type==='notify')return chrome.notifications.create('scout-'+Date.now(),{type:'basic',iconUrl:'icon.png',title:msg.title,message:msg.message,priority:2});
  // Graceful stop: the runner sees stopRun, releases its leases and closes its window.
  // If it does not answer within 10 s the window is closed; leases then expire server-side.
  if(msg?.type==='stop-run'){await stopNow();try{if(msg.server)await SC.api('run-stop',{})}catch{}return true}
 })().then(reply,()=>reply(null));return true});
// ---------- one-click pairing from the app page (v1.7) ----------
// The app page (My kitchen → Pair this computer) may only: ping (is the extension here,
// is it paired with THIS app) and pair (hand over a one-time code it just created). The
// server address is ALWAYS the sender's own origin, never a value from the message. The
// device token stays in extension storage and is never sent to the page.
const sameServer=(a:any,b:any)=>{try{return new URL(a).origin===new URL(b).origin}catch{return false}};
async function external(msg:any,origin:string){
 const st=await SC.get(['token','server','device','deviceId']),here=!!st.token&&sameServer(st.server,origin);
 const status={ok:true,app:'famtray-scout',version:SC.version(),paired:!!st.token,pairedHere:here,deviceName:here?(st.device?.name||null):null,deviceId:here?(st.deviceId||null):null};
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
   return {ok:true,app:'famtray-scout',version:SC.version(),paired:true,pairedHere:true,deviceName:r.device?.name||name,deviceId:r.device?.id||null}}
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
(globalThis as any).scoutDebug={startRun,flushSemi,heartbeat,canStart,requestRunNow,reloadWaitingTabs,originAllowed:(o:string)=>SC.appOriginAllowed(o)};
