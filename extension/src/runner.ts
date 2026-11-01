// FamTray Scout — Auto-mode runner (runner.html, one dedicated unfocused window).
// Visits leased tasks ONE AT A TIME with human pacing (random 20–40 s between pages),
// respects robots.txt, stops immediately on any challenge / 403 / 429 / unusual page,
// pauses while the user is using this window, stops on battery (best effort), and
// releases unfinished leases when it stops. It never solves CAPTCHAs, never changes
// the user agent or any fingerprint, and uses no proxy: it is the user's own Chrome.
declare const chrome:any;
(function scoutRunner(){
'use strict';
const G:any=globalThis,SC=G.ScoutClient,CORE=G.ScoutCore;
const $=(s:string)=>document.querySelector(s) as any;
let T=(vi:string,en:string)=>vi;
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const state:any={runId:'run-'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),pages:0,prices:0,skipped:0,blocked:null,stop:null,queue:[],leased:new Set<string>(),started:Date.now()};
function show(line:string){$('#status').textContent=line;$('#count').textContent=T(`${state.pages} trang · ${state.prices} giá`,`${state.pages} pages · ${state.prices} prices`)}
async function stopRequested(){const st=await SC.get(['paused','autoEnabled','stopRun']);if(st.paused)return 'paused';if(st.autoEnabled!==true)return 'switched-off';if(st.stopRun&&st.stopRun>state.started)return 'stopped';return null}
async function batteryBlock(){try{const b:any=await (navigator as any).getBattery?.();if(b&&b.charging===false&&b.dischargingTime!==Infinity)return true}catch{}return false}
async function userInThisWindow(winId:number){try{const idle=await chrome.idle.queryState(60);if(idle!=='active')return false;const w=await chrome.windows.getLastFocused();return w?.id===winId&&w.focused}catch{return false}}
function waitComplete(tabId:number,ms=45000){return new Promise<boolean>(resolve=>{let done=false;const fin=(ok:boolean)=>{if(done)return;done=true;chrome.tabs.onUpdated.removeListener(on);clearTimeout(t);resolve(ok)};const on=(id:number,info:any)=>{if(id===tabId&&info.status==='complete')fin(true)};const t=setTimeout(()=>fin(false),ms);chrome.tabs.onUpdated.addListener(on)})}
async function extractFrom(tabId:number){for(let i=0;i<3;i++){try{const r=await chrome.tabs.sendMessage(tabId,{type:'extract'});if(r)return r}catch{}await sleep(1500)}return null}
async function heartbeatRun(extra:any={}){const st=await SC.get(['run']);await SC.set({run:{...(st.run||{}),...extra,heartbeatAt:Date.now(),pages:state.pages,prices:state.prices}})}
async function release(){const ids=[...state.leased];if(!ids.length)return;try{await SC.api('release',{taskIds:ids})}catch{}state.leased.clear()}
async function finish(reason:string,winId:number){state.stop=reason;await release();
 const st=await SC.get(['lastRun','blockedEvents']);const lastRun={at:Date.now(),startedAt:state.started,pages:state.pages,prices:state.prices,skipped:state.skipped,stop:reason,blocked:state.blocked};
 await SC.set({lastRun,run:null,blockedEvents:state.blocked?[{...state.blocked,at:Date.now()},...(st.blockedEvents||[])].slice(0,20):st.blockedEvents});
 show(T('Đã dừng: ','Stopped: ')+reason);if(!SC.BUILD.keepRunnerOpen)setTimeout(()=>chrome.windows.remove(winId).catch(()=>{}),1500)}
async function run(){
 const lang=await SC.lang();T=(vi,en)=>lang==='en'?en:vi;document.documentElement.lang=lang;$('#title').textContent=T('FamTray Scout đang chạy tự động','FamTray Scout auto run');
 $('#note').textContent=T('Cửa sổ này do FamTray Scout mở. Bạn có thể đóng hoặc bấm Tạm dừng bất cứ lúc nào.','FamTray Scout opened this window. You can close it or press Pause at any time.');
 const win=await chrome.windows.getCurrent(),st=await SC.get(['device','testPacing','run']);
 const work=await chrome.tabs.create({windowId:win.id,url:'about:blank',active:false});await heartbeatRun({windowId:win.id,workTabId:work.id});
 $('#pause').onclick=async()=>{await SC.set({paused:true})};
 if(await batteryBlock())return finish('on-battery',win.id);
 const device=st.device||{},caps=device.caps||{pagesPerRun:150};
 while(true){
  const stopWhy=await stopRequested();if(stopWhy)return finish(stopWhy,win.id);
  if(state.pages>=caps.pagesPerRun)return finish('cap-run',win.id);
  while(await userInThisWindow(win.id)){show(T('Đang chờ — bạn đang dùng cửa sổ này.','Waiting — you are using this window.'));await sleep(SC.BUILD.test?500:30000);const w=await stopRequested();if(w)return finish(w,win.id)}
  if(!state.queue.length){let r:any;try{r=await SC.api('tasks',{runId:state.runId,autoEnabled:true,max:5})}catch(e:any){return finish(e.code||'server-error',win.id)}
   if(r.code)return finish(r.code,win.id);if(!r.tasks?.length)return finish(r.stop||'no-tasks',win.id);
   for(const t of r.tasks){state.queue.push(t);state.leased.add(t.taskId)}state.pacing=r.pacing}
  const task=state.queue.shift();
  // robots.txt: skip and report, without visiting the page.
  let allowed=true;try{allowed=await SC.robotsAllowed(task.url)}catch{allowed=false}
  if(!allowed){state.skipped++;try{await SC.api('results',{mode:'auto',runId:state.runId,items:[{taskId:task.taskId,retailer:task.retailer,url:task.url,status:'robots-disallowed',facts:[]}]})}catch{}state.leased.delete(task.taskId);continue}
  show(T('Đang đọc: ','Reading: ')+task.retailer+' · '+(task.name||task.kind));
  await chrome.tabs.update(work.id,{url:task.url});const loaded=await waitComplete(work.id);
  const res=loaded?await extractFrom(work.id):null;state.pages++;
  if(res?.challenge){
   state.blocked={retailer:task.retailer,kind:res.challenge.kind,url:task.url};
   try{await SC.api('block',{retailer:task.retailer,kind:res.challenge.kind,url:task.url})}catch{}
   await chrome.runtime.sendMessage({type:'notify',title:T('FamTray Scout đã dừng','FamTray Scout stopped'),message:T('Trang yêu cầu xác minh hoặc chặn truy cập. Máy này tạm dừng 24 giờ. Không cần làm gì.','The site showed a check or blocked access. This device is paused for 24 hours. Nothing to do.')}).catch(()=>{});
   await chrome.tabs.update(work.id,{url:'about:blank'}).catch(()=>{});
   return finish('blocked',win.id)}
  const want=device.stores?.[task.retailer],mismatch=!!(res?.storeLabel&&want&&!CORE.storeMatches(res.storeLabel,want));
  const item={taskId:task.taskId,retailer:task.retailer,url:task.url,pageType:res?.pageType||null,storeLabel:res?.storeLabel||task.storeLabel||null,storeMismatch:mismatch,status:res?.status==='ok'?'ok':'parse-failed',facts:(res?.facts||[]).slice(0,200)};
  try{const r=await SC.api('results',{mode:'auto',runId:state.runId,items:[item]});state.prices+=r.accepted||0}catch(e:any){if(e.status===403)return finish(e.code||'refused',win.id)}
  state.leased.delete(task.taskId);await heartbeatRun();
  if(mismatch){const w=(await SC.get(['warnings'])).warnings;w.storeMismatch[task.retailer]=true;w.storesSeen[task.retailer]=res.storeLabel;await SC.set({warnings:w})}
  // Human pace: one page per 20–40 s (test builds may shorten it; production clamps).
  const delay=CORE.pacing(Math.random(),st.testPacing||state.pacing,SC.BUILD.test);show(T(`Chờ ${Math.round(delay/1000)} giây trước trang tiếp theo…`,`Waiting ${Math.round(delay/1000)} s before the next page…`));
  const until=Date.now()+delay;while(Date.now()<until){await sleep(Math.min(1000,until-Date.now()));const w=await stopRequested();if(w)return finish(w,win.id)}
 }
}
(G as any).scoutRunnerState=state;
run().catch(async(e:any)=>{show('Error: '+(e?.message||e));await release();await SC.set({run:null})});
})();
