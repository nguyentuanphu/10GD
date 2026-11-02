// FamTray Scout API (op routing like the other functions).
//
// Three kinds of callers:
//  1. The extension (device token in `Authorization: Bearer …`, no cookies). CORS is
//     answered for `chrome-extension://<id>` origins listed in SCOUT_EXTENSION_IDS
//     (comma separated). Any chrome-extension origin is accepted ONLY when the list is
//     empty and SCOUT_DEV=1 (local dev/tests). Requests without an Origin header (non
//     browser) are allowed for token ops because no ambient credential is involved.
//  2. Signed-in app accounts (cookie, same-origin required): pair-code, my-devices.
//  3. Studio (cookie + Studio role; POST needs same-origin + x-studio-csrf + owner):
//     studio-* ops. Every Studio mutation is written to the Studio audit log.
import {getStore} from '@netlify/blobs';
import {timingSafeEqual} from 'node:crypto';
import {resolveAccount} from '../lib/accounts.mjs';
import {platformSettings,roleFor,csrfFor,writeAudit,recordEvent,readIndex} from '../lib/studio.mjs';
import {networkSettings,validateNetworkPatch,saveNetwork,scoutConfig,validateConfig,scoutStore,createDefaultAdapter,createPairCode,pairDevice,replaceDevice,staleDuplicates,labelOf,scanList,replanToday,setPinned,setMatchWords,ownerProductLink,deviceFromRequest,deviceView,editDevice,getDevice,listDevices,revokeDevice,cleanStores,validSchedule,refusal,leaseTasks,releaseTasks,reportBlock,ingestResults,studioOverview,coverage,setTrusted,isTrusted,extensionAllowlist,isExtensionAllowed,setExtensionAllowed,NOT_ASSIGNED,setRetailerPause,listEvents,rate,sha,RETAILERS,publicInstallInfo,effectivePacing,validPacing,grantRunNow,stopRun,runNowActive,backoffRetailer,dayKey,queueCommand,takeCommands,commandResult,deviceTimeline,logEvent,scoutHooks} from '../lib/scout.mjs';
import {notifyOwners,notifyAssigned} from '../lib/scout-notify.mjs';

const BASE_HEADERS={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const ids=(env:any)=>String(env.SCOUT_EXTENSION_IDS||'').split(',').map((x:string)=>x.trim()).filter(Boolean);
export function extensionOriginAllowed(origin:string,env:any){if(!origin.startsWith('chrome-extension://'))return false;const id=origin.slice(19),list=ids(env);if(list.length)return list.includes(id);return env.SCOUT_DEV==='1'}
const REFUSALS:any={'auto-off':['Chế độ tự động đang tắt trong Studio.','Auto mode is switched off in Studio.'],'paused-global':['Mạng So Giá đang tạm dừng.','The Price Check network is paused.'],'device-not-allowed':['Studio chưa cho phép máy này chạy tự động.','Studio has not allowed this device to run Auto mode.'],'device-toggle-off':['Chế độ tự động đang tắt trên máy này.','Auto mode is off on this device.'],'paused-device':['Máy này đang tạm dừng.','This device is paused.'],'outside-window':['Ngoài khung giờ chạy.','Outside the schedule window.'],stopped:['Đã yêu cầu dừng lần chạy này.','This run was asked to stop.']};

export function createScoutHandler({getStoreFn=getStore,env=process.env,nowFn=()=>Date.now(),adapter,notify,assignedPush}:any={}){
 const pushAssigned=assignedPush||((u:string)=>notifyAssigned(getStoreFn,u));
 const ad=adapter||createDefaultAdapter(getStoreFn,{env,nowFn});
 if(notify)scoutHooks.notify=notify;else scoutHooks.notify=(type:string,data:any,gs:any)=>notifyOwners(gs,type,data,env);
 return async(request:Request)=>{
  const url=new URL(request.url),op=url.searchParams.get('op')||'',method=request.method,now=nowFn(),origin=request.headers.get('origin')||'',isRead=['GET','HEAD'].includes(method);
  const ext=extensionOriginAllowed(origin,env),cors:any=ext?{'Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Max-Age':'600'}:{'Vary':'Origin'};
  const json=(data:any,status=200,headers:any={})=>Response.json(data,{status,headers:{...BASE_HEADERS,...cors,...headers}});
  try{
   if(method==='OPTIONS')return ext?new Response(null,{status:204,headers:{...cors}}):json({error:'Nguồn không được phép.',errorEn:'Origin not allowed.'},403);
   const body=async(max=200000)=>{const raw=await request.text();if(raw.length>max)throw Object.assign(Error('Quá lớn.'),{status:413,en:'Too large.'});try{return raw?JSON.parse(raw):{}}catch{throw Object.assign(Error('Dữ liệu không hợp lệ.'),{status:400,en:'Invalid JSON.'})}};
   const settings=await networkSettings(getStoreFn,env);
   // v1.7.1 extension allowlist: the first request after the upgrade migrates trusted price checkers and accounts with paired devices (audited once).
   {const al=await extensionAllowlist(getStoreFn,now);if(al.migrated)await writeAudit(getStoreFn,{actor:'system',role:'system',action:'scout_extension_allowlist_migrated',target:{type:'scout',id:'extension-allowlist'},details:{accounts:al.migrated}},now)}
   const notAssigned=()=>json({error:NOT_ASSIGNED[0],errorEn:NOT_ASSIGNED[1],code:'not_assigned'},403);

   // ----- public parser config (data only; versioned; cacheable) -----
   if(op==='config'&&isRead){const c=await scoutConfig(getStoreFn);if(url.searchParams.get('v')===c?.version)return json({version:c.version,unchanged:true},200,{'Cache-Control':'public, max-age=300'});return json({version:c?.version||null,config:c},200,{'Cache-Control':'public, max-age=300'})}
   // ----- public install info for the app's "Pair this computer" card (non-secret) -----
   if(op==='public'&&isRead)return json(publicInstallInfo(settings,env),200,{'Cache-Control':'public, max-age=300'});

   // ----- extension (device token) -----
   // v1.7.2 the same computer paired again (extension removed and installed): replace the earlier pairing(s) of the same
   // account and label. Audited in the Studio log as device_replaced; the old token is refused from now on.
   const replaceAll=async(device:any,ids:any[])=>{const done:string[]=[];for(const id of (Array.isArray(ids)?ids:[]).slice(0,10)){let o:any;try{o=await getDevice(getStoreFn,id)}catch{continue}
     if(o.id===device.id||o.owner!==device.owner||o.revokedAt||labelOf(o)!==labelOf(device))continue;await replaceDevice(getStoreFn,o.id,device.id,'device:'+device.id,now);done.push(o.id);
     await writeAudit(getStoreFn,{actor:device.owner,role:'account',action:'device_replaced',target:{type:'scout-device',id:device.id},details:{replaced:o.id,via:'extension'}},now)}return done};
   const deviceOps=['pair','replace','heartbeat','device','device-settings','tasks','results','release','block','unpair','run-now','run-stop','backoff','command-result'];
   if(deviceOps.includes(op)){
    if(origin&&!ext&&origin!==url.origin)return json({error:'Nguồn không được phép.',errorEn:'Origin not allowed.'},403);
    // Cookies are never consulted for device ops: the bearer token is the only credential.
    if(op==='pair'&&method==='POST'){await rate(getStoreFn,'pair:'+(request.headers.get('x-nf-client-connection-ip')||'unknown'),10,now);const pb=await body(4000),{device,token,replaceCandidates}=await pairDevice(getStoreFn,pb,now,env);
     // v1.7.2: the extension may ask first (replaceCandidates → op=replace) or pass replace:'all' after asking.
     let replaced:string[]=[];if(pb?.replace==='all'&&replaceCandidates.length)replaced=await replaceAll(device,replaceCandidates.map((c:any)=>c.id));
     const fresh=replaced.length?await getDevice(getStoreFn,device.id):device;
     return json({token,device:await deviceView(getStoreFn,fresh,settings,now,env),replaceCandidates:replaced.length?[]:replaceCandidates,replaced},201)}
    const device=await deviceFromRequest(getStoreFn,request);await rate(getStoreFn,'dev:'+device.id,120,now);
    // Only accounts assigned in Studio may run the extension; unpair always works.
    if(op!=='unpair'&&!(await isExtensionAllowed(getStoreFn,device.owner,env,now)))return notAssigned();
    if(op==='replace'&&method==='POST'){const b=await body(2000),replaced=await replaceAll(device,b?.replace);return json({ok:true,replaced})}
    if((op==='device'&&isRead)||(op==='heartbeat'&&method==='POST')){
     if(op==='heartbeat'){const b=await body(8000),signedIn:any={},storeSeen:any={},mismatch:any={};for(const r of RETAILERS){if(typeof b.signedIn?.[r]==='boolean')signedIn[r]=b.signedIn[r];if(typeof b.storesSeen?.[r]==='string')storeSeen[r]=String(b.storesSeen[r]).slice(0,80);if(typeof b.storeMismatch?.[r]==='boolean')mismatch[r]=b.storeMismatch[r]}
      // v1.7 live status (no page contents): Chrome/idle/battery, current run, last run summary, last error.
      const int=(v:any,max=100000)=>Number.isInteger(v)&&v>=0&&v<=max?v:0,ts=(v:any)=>Number.isFinite(v)&&v>0&&v<=now+2*60000?new Date(v).toISOString():null;
      const lastRun=b.lastRun&&typeof b.lastRun==='object'&&ts(b.lastRun.at)?{at:ts(b.lastRun.at),pages:int(b.lastRun.pages),prices:int(b.lastRun.prices),skipped:int(b.lastRun.skipped),errors:int(b.lastRun.errors),stop:String(b.lastRun.stop||'').replace(/[^\w-]/g,'').slice(0,30)||null}:null;
      const lastError=b.lastError&&typeof b.lastError==='object'&&ts(b.lastError.at)?{at:ts(b.lastError.at),retailer:RETAILERS.includes(b.lastError.retailer)?b.lastError.retailer:null,kind:String(b.lastError.kind||'').replace(/[^\w-]/g,'').slice(0,30)||null}:null;
      const battery=b.battery&&typeof b.battery==='object'?{charging:b.battery.charging===true,level:typeof b.battery.level==='number'&&b.battery.level>=0&&b.battery.level<=1?Math.round(b.battery.level*100)/100:null,at:ts(b.battery.at)}:null;
      let prevRunAt:any=null;
      await editDevice(getStoreFn,device.id,d=>{prevRunAt=d.client?.lastRun?.at||null;return{...d,lastHeartbeat:new Date(now).toISOString(),client:{version:String(b.version||'').slice(0,20)||null,configVersion:/^[\w.-]{1,40}$/.test(String(b.configVersion||''))?String(b.configVersion):null,autoEnabled:b.autoEnabled===true,semiEnabled:b.semiEnabled!==false,running:b.running===true,signedIn,storesSeen:storeSeen,storeMismatch:mismatch,onBattery:battery?!battery.charging:b.onBattery===true,
       chromeOpen:b.chromeOpen!==false,idle:['active','idle','locked'].includes(b.idle)?b.idle:null,battery,paused:b.paused===true,why:typeof b.why==='string'?b.why.replace(/[^\w-]/g,'').slice(0,30)||null:null,run:b.running===true?{pages:int(b.run?.pages),prices:int(b.run?.prices),startedAt:ts(b.run?.startedAt)}:null,lastRun:lastRun||d.client?.lastRun||null,lastError:lastError||d.client?.lastError||null}}});
      if(lastRun&&lastRun.at!==prevRunAt)await logEvent(getStoreFn,'run_finished',{deviceId:device.id,account:device.owner,name:device.name,pages:lastRun.pages,prices:lastRun.prices,skipped:lastRun.skipped,stop:lastRun.stop},now);
      const view=await deviceView(getStoreFn,await getDevice(getStoreFn,device.id),settings,now,env);return json({...view,commands:await takeCommands(getStoreFn,device.id,now)})}
     return json(await deviceView(getStoreFn,{...device},settings,now,env))}
    if(op==='command-result'&&method==='POST')return json(await commandResult(getStoreFn,device.id,await body(2000),now));
    if(op==='device-settings'&&method==='POST'){const b=await body(8000);const patch:any={};if(b.name!==undefined)patch.name=String(b.name||'').replace(/\s+/g,' ').trim().slice(0,40)||device.name;if(b.postcode!==undefined)patch.postcode=/^\d{4}$/.test(String(b.postcode||''))?String(b.postcode):null;if(b.suburb!==undefined)patch.suburb=String(b.suburb||'').trim().slice(0,40)||null;if(b.stores!==undefined)patch.stores=cleanStores(b.stores);
     if(b.schedule!==undefined){if(b.schedule!==null&&!validSchedule(b.schedule))return json({error:'Khung giờ không hợp lệ.',errorEn:'Invalid schedule.'},400);patch.schedule=b.schedule}
     if(b.caps!==undefined){const c:any={};for(const k of ['pagesPerRun','pagesPerDay'])if(Number.isInteger(b.caps?.[k])&&b.caps[k]>=1)c[k]=b.caps[k];patch.caps=c}
     // The device may only choose the same pace as Studio allows or slower (effectivePacing takes the slower of the two).
     if(b.pacing!==undefined){if(b.pacing===null)patch.clientPacing=null;else{const v=validPacing(b.pacing);if(!v)return json({error:'Nhịp không hợp lệ (tối thiểu 3 giây).',errorEn:'Invalid pace (minimum 3 seconds).'},400);patch.clientPacing=v}}
     if(b.timeZone!==undefined){try{new Intl.DateTimeFormat('en-US',{timeZone:String(b.timeZone)});patch.timeZone=String(b.timeZone).slice(0,60)}catch{}}
     const d=await editDevice(getStoreFn,device.id,x=>({...x,...patch}));return json(await deviceView(getStoreFn,d,settings,now,env))}
    if(op==='tasks'&&method==='POST'){const b=await body(4000),why=await refusal(getStoreFn,device,settings,b,now);
     if(why)return json({error:REFUSALS[why][0],errorEn:REFUSALS[why][1],code:why,tasks:[]},why==='outside-window'?200:403);
     const runId=/^[\w-]{6,40}$/.test(String(b.runId||''))?String(b.runId):'run-unknown';const r=await leaseTasks(getStoreFn,{device,settings,runId,max:b.max,now,adapter:ad});
     return json({...r,pacing:effectivePacing(await getDevice(getStoreFn,device.id),settings,now),runNow:runNowActive(device,now,runId),robots:'respect'})}
    // Run now from the popup: only for an Auto-allowed device while Auto is on and nothing is paused.
    if(op==='run-now'&&method==='POST'){const why=settings.autoScout!=='on'?'auto-off':settings.paused?'paused-global':device.autoAllowed!==true?'device-not-allowed':device.pausedUntil&&device.pausedUntil>now?'paused-device':null;
     if(why)return json({error:REFUSALS[why][0],errorEn:REFUSALS[why][1],code:why},403);
     await rate(getStoreFn,'runnow:'+device.id,6,now);const d=await grantRunNow(getStoreFn,device.id,'device:'+device.id,now);await recordEvent(getStoreFn,'scout_run_now',{account:device.owner,by:'device'},now);await logEvent(getStoreFn,'run_now',{deviceId:device.id,by:'device'},now);return json(await deviceView(getStoreFn,d,settings,now,env))}
    if(op==='run-stop'&&method==='POST'){const d=await stopRun(getStoreFn,device.id,now);return json(await deviceView(getStoreFn,d,settings,now,env))}
    // Automatic back-off: 429 / slow pages (> 8 s) / challenge marker → Normal pace for that retailer today.
    if(op==='backoff'&&method==='POST'){const b=await body(2000),reason=['429','slow','challenge','403'].includes(b.reason)?b.reason:null;if(!reason||!RETAILERS.includes(b.retailer))return json({error:'Dữ liệu không hợp lệ.',errorEn:'Invalid back-off.'},400);
     const d=await backoffRetailer(getStoreFn,device.id,b.retailer,reason,now)||await getDevice(getStoreFn,device.id);await logEvent(getStoreFn,'pace_backoff',{deviceId:device.id,retailer:b.retailer,kind:reason},now);return json({pacing:effectivePacing(d,settings,now)})}
    if(op==='results'&&method==='POST')return json(await ingestResults(getStoreFn,{device,settings,body:await body(),now,adapter:ad,env}));
    if(op==='release'&&method==='POST'){const b=await body(8000);return json({released:await releaseTasks(getStoreFn,device,b.taskIds,now)})}
    if(op==='block'&&method==='POST'){const b=await body(4000),r=await reportBlock(getStoreFn,device,b,now);await recordEvent(getStoreFn,'scout_blocked',{retailer:b.retailer,kind:b.kind,account:device.owner},now);return json(r)}
    if(op==='unpair'&&method==='POST'){await revokeDevice(getStoreFn,device.id,'device:'+device.id,now);return json({ok:true})}
    return json({error:'Thao tác không hỗ trợ.',errorEn:'Unsupported operation.'},404);
   }

   // ----- signed-in accounts and Studio (cookie session) -----
   if(!isRead&&origin!==url.origin)return json({error:'Yêu cầu phải từ cùng trang.',errorEn:'Same-origin request required.'},403);
   const ctx=await resolveAccount(request,getStoreFn,now);if(!ctx)return json({error:'Cần đăng nhập tài khoản.',errorEn:'Sign in first.',login:'/login'},401);
   const actor=ctx.account.username;
   if(op==='pair-code'&&method==='POST'){if(!(await isExtensionAllowed(getStoreFn,actor,env,now)))return notAssigned();if(ctx.member?.role==='viewer')return json({error:'Tài khoản chỉ xem không ghép nối được.',errorEn:'View-only accounts cannot pair devices.'},403);await rate(getStoreFn,'code:'+actor,10,now);const r=await createPairCode(getStoreFn,actor,now,env);await recordEvent(getStoreFn,'scout_pair_code',{account:actor},now);return json(r,201)}
   if(op==='my-devices'&&isRead){const mine=(await listDevices(getStoreFn)).filter(d=>d.owner===actor&&!d.revokedAt);const assigned=await isExtensionAllowed(getStoreFn,actor,env,now);if(!assigned)return json({assigned:false,trusted:false,familyRole:ctx.member?.role||null,devices:[]});const grant=(await extensionAllowlist(getStoreFn,now)).users[actor];return json({assigned:true,grantedAt:grant?.source==='studio'?grant.at:null,trusted:await isTrusted(getStoreFn,actor,env),familyRole:ctx.member?.role||null,semiAuto:settings.semiAuto,autoScout:settings.autoScout,devices:mine.map(d=>({id:d.id,name:d.name,stores:d.stores,createdAt:d.createdAt||null,lastHeartbeat:d.lastHeartbeat,lastRunAt:d.lastRunAt,lastSemiAt:d.lastSemiAt||null,paused:d.pausedUntil>now}))})}
   // The account revokes one of its OWN paired computers (My kitchen → Pair this computer).
   if(op==='my-revoke'&&method==='POST'){const b=await body(2000),d=await getDevice(getStoreFn,b.deviceId);if(d.owner!==actor||d.revokedAt)return json({error:'Không tìm thấy máy.',errorEn:'Device not found.'},404);await revokeDevice(getStoreFn,d.id,actor,now);await recordEvent(getStoreFn,'scout_device_revoked_by_owner',{account:actor},now);return json({ok:true})}
   if(!op.startsWith('studio-'))return json({error:'Thao tác không hỗ trợ.',errorEn:'Unsupported operation.'},404);
   const ps=await platformSettings(getStoreFn,{env,now}),role=roleFor(actor,env,ps.values);
   if(!role)return json({error:'Tài khoản này không có quyền vào Studio.',errorEn:'This account does not have Studio access.'},403);
   let b:any={};
   if(!isRead){const token=request.headers.get('x-studio-csrf')||'',want=csrfFor(ctx.sessionKey);if(token.length!==want.length||!timingSafeEqual(Buffer.from(token),Buffer.from(want)))return json({error:'Phiên Studio đã hết hạn. Tải lại trang.',errorEn:'Studio session token mismatch. Reload the page.'},403);if(role!=='owner')return json({error:'Vai trò hỗ trợ chỉ được xem.',errorEn:'Support role is read-only.'},403);b=await body(150000)}
   const audit=(action:string,target:any=null,extra:any={})=>writeAudit(getStoreFn,{actor,role,action,target,...extra},now);
   const reasonOf=()=>String(b.reason||'').trim().slice(0,300);
   if(op==='studio-overview'&&isRead)return json(await studioOverview(getStoreFn,{now,env}));
   if(op==='studio-auto'&&isRead)return json({autoScout:settings.autoScout,source:settings.autoScoutSource||'default'});
   if(op==='studio-coverage'&&isRead)return json(await coverage(getStoreFn,{now}));
   // v1.7.2 Studio "Danh sách quét / Scan list": today's plan grouped by kind + store, and its editable sources.
   if(op==='studio-scanlist'&&isRead)return json(await scanList(getStoreFn,{now,env,adapter:ad}));
   if(op==='studio-replan'&&method==='POST'){const r=await replanToday(getStoreFn,{settings,now,adapter:ad});await audit('scout_replan',{type:'scout',id:'plan'},{details:{count:r.count,created:r.created??0}});return json({ok:true,...r})}
   if(op==='studio-pin'&&method==='POST'){const pin=b.pin!==false;await setPinned(getStoreFn,{itemId:b.itemId,retailers:b.retailers,pin,actor,now});await audit(pin?'scout_pin_item':'scout_unpin_item',{type:'catalog-item',id:String(b.itemId)},{details:{retailers:Array.isArray(b.retailers)?b.retailers:null}});return json({ok:true})}
   if(op==='studio-specials'&&method==='POST'){const r=String(b.retailer||''),cur=settings.specials||{},next:any={...cur};if(b.urls===null)delete next[r];else next[r]=Array.isArray(b.urls)?b.urls.map((u:any)=>String(u).trim()).filter(Boolean):[];
    const patch=validateNetworkPatch({specials:next},await scoutConfig(getStoreFn));await saveNetwork(getStoreFn,patch,actor,now);await audit('scout_specials',{type:'scout',id:r},{details:{urls:next[r]||null}});return json({ok:true})}
   if(op==='studio-mapping'&&method==='POST'){const action=String(b.action||''),r=await ownerProductLink(getStoreFn,{action,itemId:b.itemId,retailer:b.retailer,url:b.url,actor,now});await audit(action==='add'?'scout_mapping_add':'scout_mapping_remove',{type:'catalog-item',id:String(b.itemId)},{details:{retailer:b.retailer,...(r||{})}});return json({ok:true,...(r||{})})}
   if(op==='studio-synonyms'&&method==='POST'){await setMatchWords(getStoreFn,{itemId:b.itemId,add:b.add,exclude:b.exclude,actor,now});await audit('scout_match_words',{type:'catalog-item',id:String(b.itemId)},{details:{add:b.add,exclude:b.exclude}});return json({ok:true})}
   if(op==='studio-events'&&isRead)return json({events:await listEvents(getStoreFn,{days:14,limit:200,now})});
   if(op==='studio-pair-code'&&method==='POST'){const who=String(b.username||actor).toLowerCase();if(!(await isExtensionAllowed(getStoreFn,who,env,now)))return notAssigned();const r=await createPairCode(getStoreFn,who,now,env);await audit('scout_pair_code',{type:'scout',id:'pair'},{details:{account:who}});return json({...r,account:who},201)}
   // Accounts allowed to use the extension (owner-only POST, CSRF, audited). STUDIO_ADMINS are always allowed.
   if(op==='studio-extension-users'&&method==='POST'){const u=String(b.username||'').trim().toLowerCase();
    // Picked from the Studio accounts search; a grant must name an existing account.
    if(b.grant===true){const ix=await readIndex(getStoreFn,{now});const rows=ix.accounts?.rows||[];if(rows.length&&!rows.some((r:any)=>r.username===u))return json({error:'Không tìm thấy tài khoản.',errorEn:'Account not found.'},404)}
    const wasAllowed=b.grant===true&&await isExtensionAllowed(getStoreFn,u,env,now);await setExtensionAllowed(getStoreFn,u,b.grant===true,actor,now);
    // A new assignment tells the person once by push (their push settings and quiet hours apply); never blocks the save.
    if(b.grant===true&&!wasAllowed){try{await pushAssigned(u)}catch(e:any){console.warn('Assigned push failed',e?.message)}}await audit(b.grant===true?'scout_extension_access_grant':'scout_extension_access_remove',{type:'account',id:u},{reason:reasonOf()||undefined});return json(await studioOverview(getStoreFn,{now,env}))}
   if(op==='studio-network'&&method==='POST'){const patch=validateNetworkPatch(b.patch||{},await scoutConfig(getStoreFn));await saveNetwork(getStoreFn,patch,actor,now);await audit('scout_network',{type:'scout',id:'network'},{details:patch,reason:reasonOf()||undefined});return json(await studioOverview(getStoreFn,{now,env}))}
   // Remote control: queue a command for one device (delivered with its next heartbeat).
   if(op==='studio-command'&&method==='POST'){const d=await getDevice(getStoreFn,b.deviceId),type=String(b.type||'');if(d.revokedAt)return json({error:'Máy đã bị thu hồi.',errorEn:'Device revoked.'},409);
    if(type==='run-now'){if(settings.autoScout!=='on'||settings.paused)return json({error:REFUSALS[settings.paused?'paused-global':'auto-off'][0],errorEn:REFUSALS[settings.paused?'paused-global':'auto-off'][1],code:settings.paused?'paused-global':'auto-off'},409);if(d.autoAllowed!==true)return json({error:REFUSALS['device-not-allowed'][0],errorEn:REFUSALS['device-not-allowed'][1],code:'device-not-allowed'},409);await grantRunNow(getStoreFn,d.id,actor,now)}
    else if(type==='stop')await stopRun(getStoreFn,d.id,now);
    else if(type==='pause')await editDevice(getStoreFn,d.id,(x:any)=>({...x,pausedUntil:now+30*86400000,pauseReason:'studio',stopRequestedAt:now}));
    else if(type==='resume')await editDevice(getStoreFn,d.id,(x:any)=>({...x,pausedUntil:null,pauseReason:null}));
    else if(type==='pace'){if(b.args?.pacing===null)await editDevice(getStoreFn,d.id,(x:any)=>({...x,pacing:null}));else{const v=validPacing(b.args?.pacing);if(!v)return json({error:'Nhịp không hợp lệ (tối thiểu 3 giây).',errorEn:'Invalid pace (minimum 3 seconds).'},400);await editDevice(getStoreFn,d.id,(x:any)=>({...x,pacing:v}))}}
    const cmd=await queueCommand(getStoreFn,d.id,type,type==='pace'?{pacing:b.args?.pacing??null}:{},actor,now);
    await audit('scout_command_'+type.replace(/-/g,'_'),{type:'scout-device',id:d.id},{details:{commandId:cmd.id,...(type==='pace'?{pacing:b.args?.pacing??null}:{})},reason:reasonOf()||undefined});return json({ok:true,command:{id:cmd.id,type,status:cmd.status}},201)}
   if(op==='studio-device-timeline'&&isRead){const d=await getDevice(getStoreFn,url.searchParams.get('deviceId'));return json({deviceId:d.id,events:await deviceTimeline(getStoreFn,d.id,now)})}
   // Run now for one device or all Auto-allowed devices (time-boxed grant, audited).
   if(op==='studio-run-now'&&method==='POST'){if(settings.autoScout!=='on'||settings.paused)return json({error:settings.paused?REFUSALS['paused-global'][0]:REFUSALS['auto-off'][0],errorEn:settings.paused?REFUSALS['paused-global'][1]:REFUSALS['auto-off'][1],code:settings.paused?'paused-global':'auto-off'},409);
    const every=b.all===true?await listDevices(getStoreFn):[],dup=staleDuplicates(every,now);// v1.7.2: an old pairing of the same computer is not run twice
    const list=b.all===true?every.filter(d=>!d.revokedAt&&d.autoAllowed===true&&!(d.pausedUntil>now)&&!dup.has(d.id)):[await getDevice(getStoreFn,b.deviceId)];
    const ok:string[]=[];for(const d of list){if(d.revokedAt||d.autoAllowed!==true)continue;await grantRunNow(getStoreFn,d.id,actor,now);await queueCommand(getStoreFn,d.id,'run-now',{},actor,now);ok.push(d.id)}
    if(!ok.length)return json({error:'Không có máy nào được phép chạy tự động.',errorEn:'No device is allowed to run Auto.'},409);
    await audit('scout_run_now',{type:b.all===true?'scout':'scout-device',id:b.all===true?'all':ok[0]},{details:{devices:ok},reason:reasonOf()||undefined});return json({ok:true,devices:ok})}
   if(op==='studio-device'&&method==='POST'){const d=await getDevice(getStoreFn,b.deviceId),action=String(b.action||'');let patch:any;
    if(action==='merge-into'){const r=await replaceDevice(getStoreFn,d.id,String(b.targetId||''),actor,now);await audit('scout_device_replaced',{type:'scout-device',id:r.by},{details:{replaced:r.replaced,via:'studio'},reason:reasonOf()||undefined});return json({ok:true,...r})}
    if(action==='pause')patch={pausedUntil:now+(Number.isInteger(b.hours)&&b.hours>0&&b.hours<=720?b.hours:24*30)*3600000,pauseReason:'studio'};
    else if(action==='resume')patch={pausedUntil:null,pauseReason:null};
    else if(action==='stop-run')patch={stopRequestedAt:now,runNow:d.runNow?{...d.runNow,stoppedAt:now}:null};
    else if(action==='pace'){if(b.pacing===null)patch={pacing:null};else{const v=validPacing(b.pacing);if(!v)return json({error:'Nhịp không hợp lệ (tối thiểu 3 giây).',errorEn:'Invalid pace (minimum 3 seconds).'},400);patch={pacing:v}}}
    else if(action==='allow-auto')patch={autoAllowed:true};else if(action==='deny-auto')patch={autoAllowed:false};
    else if(action==='update'){patch={};if(b.name)patch.name=String(b.name).trim().slice(0,40);if(b.stores)patch.stores=cleanStores(b.stores);if(b.schedule!==undefined){if(b.schedule!==null&&!validSchedule(b.schedule))return json({error:'Khung giờ không hợp lệ.',errorEn:'Invalid schedule.'},400);patch.schedule=b.schedule}if(b.caps){const c:any={};for(const k of ['pagesPerRun','pagesPerDay'])if(Number.isInteger(b.caps[k])&&b.caps[k]>=1)c[k]=b.caps[k];patch.caps=c}}
    else return json({error:'Thao tác không hỗ trợ.',errorEn:'Unsupported action.'},400);
    await editDevice(getStoreFn,d.id,x=>({...x,...patch}));await audit('scout_device_'+action.replace(/-/g,'_'),{type:'scout-device',id:d.id},{reason:reasonOf()||undefined,...(action==='pace'?{details:{pacing:patch.pacing}}:{})});return json({ok:true})}
   if(op==='studio-revoke'&&method==='POST'){const d=await getDevice(getStoreFn,b.deviceId);await revokeDevice(getStoreFn,d.id,actor,now);await audit('scout_device_revoke',{type:'scout-device',id:d.id},{reason:reasonOf()||undefined});return json({ok:true})}
   if(op==='studio-retailer'&&method==='POST'){await setRetailerPause(getStoreFn,String(b.retailer),b.action==='pause',actor,now);await audit('scout_retailer_'+(b.action==='pause'?'pause':'resume'),{type:'scout-retailer',id:String(b.retailer)});return json({ok:true})}
   if(op==='studio-trusted'&&method==='POST'){await setTrusted(getStoreFn,String(b.username||'').toLowerCase(),b.grant===true,actor,now);await audit(b.grant===true?'scout_trusted_grant':'scout_trusted_revoke',{type:'account',id:String(b.username||'').toLowerCase()});return json({ok:true})}
   if(op==='studio-config'&&method==='POST'){const store=scoutStore(getStoreFn);if(b.config===null){await store.delete('config/override');await audit('scout_config_reset',{type:'scout',id:'config'});return json({ok:true,version:(await scoutConfig(getStoreFn))?.version})}const c=validateConfig(b.config);await store.setJSON('config/override',{config:c,by:actor,at:new Date(now).toISOString()});await audit('scout_config_set',{type:'scout',id:'config'},{details:{version:c.version,hash:sha(JSON.stringify(c)).slice(0,12)}});return json({ok:true,version:c.version})}
   return json({error:'Thao tác không hỗ trợ.',errorEn:'Unsupported operation.'},404);
  }catch(e:any){if(!e?.status)console.error('Scout failed',e?.name,e?.message);return json({error:e?.status?e.message:'Chưa xử lý được. Thử lại sau.',errorEn:e?.status?e.en||e.message:'Could not complete the request. Try again later.',...(e?.code?{code:e.code}:{})},e?.status||503)}
 };
}
export default createScoutHandler();
