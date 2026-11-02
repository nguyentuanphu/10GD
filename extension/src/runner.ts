// FamTray Scout — Auto-mode runner (runner.html, one dedicated unfocused window).
// Visits leased tasks ONE AT A TIME with the owner's pace (random within the server's
// min–max, default 20–40 s, never under 3 s; a retailer that answered 429, served pages
// slower than 8 s or showed a challenge marker drops to Normal for the rest of the day),
// respects robots.txt, stops immediately on any challenge / 403 / 429 / unusual page,
// pauses while the user is using this window, stops on battery (best effort), and
// releases unfinished leases when it stops. It never solves CAPTCHAs, never changes
// the user agent or any fingerprint, and uses no proxy: it is the user's own Chrome.
declare const chrome:any;
(function scoutRunner(){
'use strict';
const G:any=globalThis,SC=G.ScoutClient,CORE=G.ScoutCore,UI=G.ScoutUI;
const $=(s:string)=>document.querySelector(s) as any;
let T=(vi:string,en:string)=>vi;
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
// v1.7.2: the runner window opens minimized, and Chrome slows timers in hidden pages; the pauses
// between pages therefore wait in the background worker (not throttled), falling back to a timer.
const bgSleep=async(ms:number)=>{try{const r=await chrome.runtime.sendMessage({type:'sleep',ms});if(r===true)return}catch{}await sleep(ms)};
const state:any={runId:'run-'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),pages:0,prices:0,skipped:0,errors:0,blocked:null,stop:null,queue:[],leased:new Set<string>(),started:Date.now(),pacing:null,plan:null,marks:{},current:null,visits:[],empty:null};
function show(line:string){$('#status').textContent=line;$('#count').textContent=T(`${state.pages} trang · ${state.prices} giá · bỏ qua ${state.skipped} · lỗi ${state.errors}`,`${state.pages} pages · ${state.prices} prices · ${state.skipped} skipped · ${state.errors} errors`);renderPlan()}
// ---------- v1.7.2: the runner page explains itself: what it is looking at, today's list, each row's status ----------
const esc=(v:any)=>String(v??'').replace(/[&<>"']/g,(c:string)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'} as any)[c]);
const what=(t:any)=>t.kind==='specials'?T('trang khuyến mãi','specials page'):t.search!==false&&t.name&&!/productdetails|\/dp\/|\/buy\//.test(String(t.path||t.url||''))?T(`tìm “${t.name}”`,`search “${t.name}”`):(t.name||t.path||'');
const pathOf=(t:any)=>{if(t.host)return t.host+t.path;try{const u=new URL(t.url);return u.hostname.replace(/^www\./,'')+u.pathname}catch{return ''}};
function statusText(t:any){const m=state.marks[t.taskId];if(m?.st==='viewing')return['viewing',T('đang xem','viewing')];if(m?.st==='saved')return['saved',T(`đã lưu ${m.n} giá`,`saved ${m.n} prices`)];if(m?.st==='robots')return['skip',T('bỏ qua (robots.txt)','skipped (robots.txt)')];if(m?.st==='error')return['error',T('lỗi','error')];
 if(t.status==='done')return['saved',T('đã xem hôm nay','done today')];if(t.status==='skipped')return['skip',T('bỏ qua','skipped')];if(t.retailerPaused)return['skip',T('cửa hàng tạm dừng','retailer paused')];return['wait',T('chờ','waiting')]}
function renderPlan(){const host=$('#plan');if(!host)return;const p=state.plan;
 const empty=state.empty||(p&&!p.tasks?.length?p.planInfo?.reasonIfEmpty||'no-wanted-items':null);
 $('#empty').hidden=!empty;if(empty)$('#empty').textContent=UI.emptyReason(empty);
 if(!p){host.innerHTML=`<p class="muted">${T('Đang tải danh sách hôm nay…','Loading today’s list…')}</p>`;return}
 const tasks=[...p.tasks];for(const v of state.visits)if(!tasks.some((t:any)=>t.taskId===v.taskId))tasks.push(v);
 const groups=UI.KINDS();const by:any={};for(const t of tasks)(by[t.kind in groups?t.kind:'rest']=by[t.kind in groups?t.kind:'rest']||[]).push(t);
 host.innerHTML=Object.keys(groups).filter(k=>by[k]?.length).map(k=>`<details class="plan-group" ${k==='specials'||by[k].some((t:any)=>state.marks[t.taskId])?'open':''}><summary><strong>${esc(groups[k])}</strong> <span class="muted">· ${by[k].length}</span></summary><ul class="plan-list">${by[k].slice(0,120).map((t:any)=>{const [cls,txt]=statusText(t);return `<li data-task="${esc(t.taskId)}" data-status="${cls}"><span class="pl-main"><span><strong>${esc(UI.LABEL[t.retailer]||t.retailer)}</strong> · ${esc(what(t))}</span><small class="muted">${esc(pathOf(t))}</small></span><span class="pl-st st-${cls}">${esc(txt)}</span></li>`}).join('')}</ul></details>`).join('')||'';}
function setCurrent(task:any){const total=state.plan?.planInfo?.open||state.plan?.tasks?.length||0;state.current=task;state.marks[task.taskId]={st:'viewing'};
 show(T('Đang xem: ','Now viewing: ')+[UI.LABEL[task.retailer]||task.retailer,task.storeLabel,what(task),T(`trang ${state.pages+1}`,`page ${state.pages+1}`)+(total?'/'+total:'')].filter(Boolean).join(' · '))}
function visit(task:any,st:string,n=0){state.marks[task.taskId]={st,n};state.visits.push({taskId:task.taskId,retailer:task.retailer,kind:task.kind,name:task.name||null,host:pathOf(task).split('/')[0],path:'/'+pathOf(task).split('/').slice(1).join('/'),status:st,prices:n});if(state.visits.length>150)state.visits.shift()}
async function stopRequested(){const st=await SC.get(['paused','autoEnabled','stopRun']);if(st.paused)return 'paused';if(st.autoEnabled!==true&&!state.local)return 'switched-off';if(st.stopRun&&st.stopRun>state.started)return 'stopped';return null}
async function batteryBlock(){try{const b:any=await (navigator as any).getBattery?.();if(b){await SC.set({battery:{charging:b.charging===true,level:b.level,at:Date.now()}});if(b.charging===false&&b.dischargingTime!==Infinity)return true}}catch{}return false}
// The person is “using this window” only after Chrome reports focus moving INTO it (they restored or
// clicked it). A minimized / unfocused runner window never gets that event (v1.7.2), so it keeps going.
let focusedHere=false;try{chrome.windows.onFocusChanged.addListener((id:number)=>{focusedHere=!!state.winId&&id===state.winId})}catch{}
async function userInThisWindow(winId:number){try{state.winId=winId;if(!focusedHere)return false;const idle=await chrome.idle.queryState(60);return idle==='active'}catch{return false}}
// v1.7.3: start waiting BEFORE the navigation starts. Attaching after `tabs.update` resolved missed the
// 'complete' event of fast pages, so the run sat out the full 45 s timeout and counted an error.
// A 'complete' counts only after this navigation began ('loading' seen, or the tab shows the new URL);
// a status check every second covers events that fired before the listener was attached.
function waitComplete(tabId:number,url:string,ms=45000){let started=false;const sameUrl=(u:any)=>{try{const a=new URL(String(u)),b=new URL(url);return a.origin===b.origin&&a.pathname===b.pathname&&a.search===b.search}catch{return false}};
 return new Promise<boolean>(resolve=>{let done=false;const fin=(ok:boolean)=>{if(done)return;done=true;chrome.tabs.onUpdated.removeListener(on);clearTimeout(t);clearInterval(poll);resolve(ok)};
  const on=(id:number,info:any,tab:any)=>{if(id!==tabId)return;if(info.status==='loading'||info.url||sameUrl(tab?.url))started=true;if(info.status==='complete'&&started)fin(true)};
  const poll=setInterval(async()=>{try{const tab=await chrome.tabs.get(tabId);if(tab.status==='loading')started=true;if(tab.status==='complete'&&(started||sameUrl(tab.url)))fin(true)}catch{fin(false)}},1000);
  const t=setTimeout(()=>fin(false),ms);chrome.tabs.onUpdated.addListener(on)})}
async function extractFrom(tabId:number){for(let i=0;i<3;i++){try{const r=await chrome.tabs.sendMessage(tabId,{type:'extract'});if(r)return r}catch{}await sleep(1500)}return null}
async function heartbeatRun(extra:any={}){const st=await SC.get(['run']);await SC.set({run:{...(st.run||{}),...extra,heartbeatAt:Date.now(),pages:state.pages,prices:state.prices}})}
async function release(){const ids=[...state.leased];if(!ids.length)return;try{await SC.api('release',{taskIds:ids})}catch{}state.leased.clear()}
async function finish(reason:string,winId:number){state.stop=reason;await release();
 const st=await SC.get(['lastRun','blockedEvents']);const lastRun={at:Date.now(),startedAt:state.started,pages:state.pages,prices:state.prices,skipped:state.skipped,errors:state.errors,stop:reason,blocked:state.blocked,empty:state.empty||null,visits:state.visits.slice(-150)};
 // Tell the person it is done (the challenge path has already shown its own notice).
 if(reason!=='blocked'&&(state.pages||state.explicit))chrome.runtime.sendMessage({type:'notify',title:T('FamTray So Giá đã chạy xong','FamTray Price Check run finished'),message:T(`${state.pages} trang, ${state.prices} giá${state.skipped?`, bỏ qua ${state.skipped}`:''}. `,`${state.pages} pages, ${state.prices} prices${state.skipped?`, ${state.skipped} skipped`:''}. `)+UI_REASON(reason)}).catch(()=>{});
 await SC.set({lastRun,run:null,blockedEvents:state.blocked?[{...state.blocked,at:Date.now()},...(st.blockedEvents||[])].slice(0,20):st.blockedEvents});
 show(T('Đã dừng: ','Stopped: ')+UI_REASON(reason)+(state.empty?' '+UI.emptyReason(state.empty):''));if(!SC.BUILD.keepRunnerOpen)setTimeout(()=>closeRunner(winId),1500)}
// Close only the runner's own tabs: anything else that ended up in this window (a tab the person opened
// or dragged here) stays open. The window closes by itself once it is empty.
async function closeRunner(winId:number){try{const me=await chrome.tabs.getCurrent(),tabs=await chrome.tabs.query({windowId:winId}),mine=[state.workTabId,me?.id].filter(Boolean);if(tabs.every((t:any)=>mine.includes(t.id)))return void chrome.windows.remove(winId).catch(()=>{});if(state.workTabId)await chrome.tabs.remove(state.workTabId).catch(()=>{});if(me?.id)await chrome.tabs.remove(me.id)}catch{chrome.windows.remove(winId).catch(()=>{})}}
const UI_REASON=(r:string)=>({'no-stores':T('Chưa chọn cửa hàng.','No store chosen.'),'no-tasks':T('Hết việc.','No more tasks.'),'cap-run':T('Đủ số trang mỗi lần chạy.','Per-run limit reached.'),'cap-day':T('Đủ số trang hôm nay.','Daily limit reached.'),'cap-retailer':T('Đủ giới hạn cửa hàng.','Retailer limit reached.'),stopped:T('Đã dừng theo yêu cầu.','Stopped on request.'),paused:T('Đã tạm dừng.','Paused.'),'outside-window':T('Ngoài khung giờ.','Outside the schedule.')} as any)[r]||'';
const paceFor=(retailer:string)=>state.pacing?.byRetailer?.[retailer]||state.pacing;
async function run(){
 const lang=await SC.lang();T=(vi,en)=>lang==='en'?en:vi;UI.lang=lang;document.documentElement.lang=lang;try{UI.theme=(await SC.get(['theme'])).theme||'auto';UI.applyTheme()}catch{}
 document.title=T('So Giá đang xem giá','Price Check is checking prices');
 $('#title').textContent=T('So Giá đang xem giá giúp bạn · có thể thu nhỏ hoặc đóng','Price Check is checking prices for you · you can minimise or close this');
 $('#note').textContent=T('Trang siêu thị cần mở trong trình duyệt thật để hiện giá — tiện ích không chạy ẩn được, và không tải trang kiểu robot. Mỗi lần chỉ mở một trang, theo nhịp chậm; chỉ ghi tên, giá và khuyến mãi.','Supermarket pages only show prices in a real browser — the extension cannot run hidden and never fetches pages like a robot. One page at a time, at a slow pace; it records only names, prices and promotions.');
 $('#pause').textContent=T('⏸ Tạm dừng','⏸ Pause');$('#h-plan').textContent=T('Hôm nay sẽ xem','Today’s list');
 try{state.plan=await SC.api('plan')}catch{state.plan={tasks:[],planInfo:null}}renderPlan();
 if(state.plan?.planInfo?.reasonIfEmpty==='no-stores'){state.empty='no-stores';const w0=await chrome.windows.getCurrent();return finish('no-stores',w0.id)}
 const win=await chrome.windows.getCurrent(),st=await SC.get(['device','testPacing','run']);state.winId=win.id;state.explicit=!!st.run?.explicit;state.local=!!st.run?.local;if(st.run?.startedAt)state.started=st.run.startedAt;
 const work=await chrome.tabs.create({windowId:win.id,url:'about:blank',active:false});state.workTabId=work.id;await heartbeatRun({windowId:win.id,workTabId:work.id});
 $('#pause').onclick=async()=>{await SC.set({paused:true})};
 if(await batteryBlock())return finish('on-battery',win.id);
 const device=st.device||{},caps=device.caps||{pagesPerRun:150};
 while(true){
  const stopWhy=await stopRequested();if(stopWhy)return finish(stopWhy,win.id);
  if(state.pages>=caps.pagesPerRun)return finish('cap-run',win.id);
  // An explicit Run now was asked for by a person, so it does not wait for them to leave the window
  // (a just-opened window is often reported as focused and the run would never progress).
  while(!state.explicit&&await userInThisWindow(win.id)){show(T('Đang chờ — bạn đang dùng cửa sổ này.','Waiting — you are using this window.'));await sleep(SC.BUILD.test?500:30000);const w=await stopRequested();if(w)return finish(w,win.id)}
  if(!state.queue.length){let r:any;try{r=await SC.api('tasks',{runId:state.runId,autoEnabled:true,max:5,startedAt:state.started})}catch(e:any){return finish(e.code||'server-error',win.id)}
   if(r.code)return finish(r.code,win.id);if(!r.tasks?.length){state.empty=state.pages?null:(r.planInfo?.reasonIfEmpty||null);return finish(r.stop||'no-tasks',win.id)}
   for(const t of r.tasks){state.queue.push(t);state.leased.add(t.taskId)}state.pacing=r.pacing;await heartbeatRun({pace:r.pacing?.preset||null})}
  const task=state.queue.shift();
  // robots.txt: skip and report, without visiting the page.
  let allowed=true;try{allowed=await SC.robotsAllowed(task.url)}catch{allowed=false}
  if(!allowed){state.skipped++;visit(task,'robots');try{await SC.api('results',{mode:'auto',runId:state.runId,items:[{taskId:task.taskId,retailer:task.retailer,url:task.url,status:'robots-disallowed',facts:[]}]})}catch{}state.leased.delete(task.taskId);continue}
  setCurrent(task);
  const t0=Date.now();const loading=waitComplete(work.id,task.url);await chrome.tabs.update(work.id,{url:task.url});const loaded=await loading;const took=Date.now()-t0;
  const res=loaded?await extractFrom(work.id):null;state.pages++;if(!loaded||!res)state.errors++;
  // Automatic back-off: a slow page (> 8 s) drops this retailer to Normal for the rest of the day.
  if((took>8000||!loaded)&&!state.pacing?.byRetailer?.[task.retailer]){try{const b=await SC.api('backoff',{retailer:task.retailer,reason:'slow'});if(b.pacing)state.pacing=b.pacing}catch{}}
  if(res?.challenge){
   state.blocked={retailer:task.retailer,kind:res.challenge.kind,url:task.url};visit(task,'error');
   try{await SC.api('block',{retailer:task.retailer,kind:res.challenge.kind,url:task.url})}catch{}
   await chrome.runtime.sendMessage({type:'notify',title:T('FamTray So Giá đã dừng','FamTray Price Check stopped'),message:T('Trang yêu cầu xác minh hoặc chặn truy cập. Máy này tạm dừng 24 giờ. Không cần làm gì.','The site showed a check or blocked access. This device is paused for 24 hours. Nothing to do.')}).catch(()=>{});
   await chrome.tabs.update(work.id,{url:'about:blank'}).catch(()=>{});
   return finish('blocked',win.id)}
  const want=device.stores?.[task.retailer],mismatch=!!(res?.storeLabel&&want&&!CORE.storeMatches(res.storeLabel,want));
  const item={taskId:task.taskId,retailer:task.retailer,url:task.url,pageType:res?.pageType||null,storeLabel:res?.storeLabel||task.storeLabel||null,storeMismatch:mismatch,status:res?.status==='ok'?'ok':'parse-failed',facts:(res?.facts||[]).slice(0,200)};
  item.capturedAt=res?.capturedAt||new Date(t0).toISOString();
  try{const r=await SC.api('results',{mode:'auto',runId:state.runId,items:[item]});state.prices+=r.accepted||0;visit(task,item.status==='ok'?'saved':'error',r.accepted||0)}catch(e:any){visit(task,'error');if(e.status===403)return finish(e.code||'refused',win.id)}
  state.leased.delete(task.taskId);await heartbeatRun();
  if(mismatch){const w=(await SC.get(['warnings'])).warnings;w.storeMismatch[task.retailer]=true;w.storesSeen[task.retailer]=res.storeLabel;await SC.set({warnings:w})}
  // Pace: random within the server's min–max for this retailer (production clamps to 3–120 s).
  const delay=CORE.pacing(Math.random(),st.testPacing||paceFor(task.retailer),SC.BUILD.test);show(T(`Chờ ${Math.round(delay/1000)} giây trước trang tiếp theo…`,`Waiting ${Math.round(delay/1000)} s before the next page…`));
  const until=Date.now()+delay;while(Date.now()<until){await bgSleep(Math.min(1000,until-Date.now()));const w=await stopRequested();if(w)return finish(w,win.id)}
 }
}
(G as any).scoutRunnerState=state;
run().catch(async(e:any)=>{show('Error: '+(e?.message||e));await release();await SC.set({run:null})});
})();
