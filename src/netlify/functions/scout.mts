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
import {platformSettings,roleFor,csrfFor,writeAudit,recordEvent} from '../lib/studio.mjs';
import {networkSettings,validateNetworkPatch,saveNetwork,scoutConfig,validateConfig,scoutStore,createDefaultAdapter,createPairCode,pairDevice,deviceFromRequest,deviceView,editDevice,getDevice,listDevices,revokeDevice,cleanStores,validSchedule,refusal,leaseTasks,releaseTasks,reportBlock,ingestResults,studioOverview,coverage,setTrusted,setRetailerPause,listEvents,rate,sha,RETAILERS} from '../lib/scout.mjs';

const BASE_HEADERS={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const ids=(env:any)=>String(env.SCOUT_EXTENSION_IDS||'').split(',').map((x:string)=>x.trim()).filter(Boolean);
export function extensionOriginAllowed(origin:string,env:any){if(!origin.startsWith('chrome-extension://'))return false;const id=origin.slice(19),list=ids(env);if(list.length)return list.includes(id);return env.SCOUT_DEV==='1'}
const REFUSALS:any={'auto-off':['Chế độ tự động đang tắt trong Studio.','Auto mode is switched off in Studio.'],'paused-global':['Mạng Scout đang tạm dừng.','The scout network is paused.'],'device-not-allowed':['Studio chưa cho phép máy này chạy tự động.','Studio has not allowed this device to run Auto mode.'],'device-toggle-off':['Chế độ tự động đang tắt trên máy này.','Auto mode is off on this device.'],'paused-device':['Máy này đang tạm dừng.','This device is paused.'],'outside-window':['Ngoài khung giờ chạy.','Outside the schedule window.']};

export function createScoutHandler({getStoreFn=getStore,env=process.env,nowFn=()=>Date.now(),adapter}:any={}){
 const ad=adapter||createDefaultAdapter(getStoreFn);
 return async(request:Request)=>{
  const url=new URL(request.url),op=url.searchParams.get('op')||'',method=request.method,now=nowFn(),origin=request.headers.get('origin')||'',isRead=['GET','HEAD'].includes(method);
  const ext=extensionOriginAllowed(origin,env),cors:any=ext?{'Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Max-Age':'600'}:{'Vary':'Origin'};
  const json=(data:any,status=200,headers:any={})=>Response.json(data,{status,headers:{...BASE_HEADERS,...cors,...headers}});
  try{
   if(method==='OPTIONS')return ext?new Response(null,{status:204,headers:{...cors}}):json({error:'Nguồn không được phép.',errorEn:'Origin not allowed.'},403);
   const body=async(max=200000)=>{const raw=await request.text();if(raw.length>max)throw Object.assign(Error('Quá lớn.'),{status:413,en:'Too large.'});try{return raw?JSON.parse(raw):{}}catch{throw Object.assign(Error('Dữ liệu không hợp lệ.'),{status:400,en:'Invalid JSON.'})}};
   const settings=await networkSettings(getStoreFn,env);

   // ----- public parser config (data only; versioned; cacheable) -----
   if(op==='config'&&isRead){const c=await scoutConfig(getStoreFn);if(url.searchParams.get('v')===c?.version)return json({version:c.version,unchanged:true},200,{'Cache-Control':'public, max-age=300'});return json({version:c?.version||null,config:c},200,{'Cache-Control':'public, max-age=300'})}

   // ----- extension (device token) -----
   const deviceOps=['pair','heartbeat','device','device-settings','tasks','results','release','block','unpair'];
   if(deviceOps.includes(op)){
    if(origin&&!ext&&origin!==url.origin)return json({error:'Nguồn không được phép.',errorEn:'Origin not allowed.'},403);
    // Cookies are never consulted for device ops: the bearer token is the only credential.
    if(op==='pair'&&method==='POST'){await rate(getStoreFn,'pair:'+(request.headers.get('x-nf-client-connection-ip')||'unknown'),10,now);const {device,token}=await pairDevice(getStoreFn,await body(4000),now);return json({token,device:await deviceView(getStoreFn,device,settings,now,env)},201)}
    const device=await deviceFromRequest(getStoreFn,request);await rate(getStoreFn,'dev:'+device.id,120,now);
    if((op==='device'&&isRead)||(op==='heartbeat'&&method==='POST')){
     if(op==='heartbeat'){const b=await body(8000),signedIn:any={},storeSeen:any={},mismatch:any={};for(const r of RETAILERS){if(typeof b.signedIn?.[r]==='boolean')signedIn[r]=b.signedIn[r];if(typeof b.storesSeen?.[r]==='string')storeSeen[r]=String(b.storesSeen[r]).slice(0,80);if(typeof b.storeMismatch?.[r]==='boolean')mismatch[r]=b.storeMismatch[r]}
      await editDevice(getStoreFn,device.id,d=>({...d,lastHeartbeat:new Date(now).toISOString(),client:{version:String(b.version||'').slice(0,20)||null,autoEnabled:b.autoEnabled===true,semiEnabled:b.semiEnabled!==false,running:b.running===true,signedIn,storesSeen:storeSeen,storeMismatch:mismatch,onBattery:b.onBattery===true}}))}
     return json(await deviceView(getStoreFn,{...device},settings,now,env))}
    if(op==='device-settings'&&method==='POST'){const b=await body(8000);const patch:any={};if(b.name!==undefined)patch.name=String(b.name||'').replace(/\s+/g,' ').trim().slice(0,40)||device.name;if(b.postcode!==undefined)patch.postcode=/^\d{4}$/.test(String(b.postcode||''))?String(b.postcode):null;if(b.suburb!==undefined)patch.suburb=String(b.suburb||'').trim().slice(0,40)||null;if(b.stores!==undefined)patch.stores=cleanStores(b.stores);
     if(b.schedule!==undefined){if(b.schedule!==null&&!validSchedule(b.schedule))return json({error:'Khung giờ không hợp lệ.',errorEn:'Invalid schedule.'},400);patch.schedule=b.schedule}
     if(b.caps!==undefined){const c:any={};for(const k of ['pagesPerRun','pagesPerDay'])if(Number.isInteger(b.caps?.[k])&&b.caps[k]>=1)c[k]=b.caps[k];patch.caps=c}
     if(b.timeZone!==undefined){try{new Intl.DateTimeFormat('en-US',{timeZone:String(b.timeZone)});patch.timeZone=String(b.timeZone).slice(0,60)}catch{}}
     const d=await editDevice(getStoreFn,device.id,x=>({...x,...patch}));return json(await deviceView(getStoreFn,d,settings,now,env))}
    if(op==='tasks'&&method==='POST'){const b=await body(4000),why=await refusal(getStoreFn,device,settings,b,now);
     if(why)return json({error:REFUSALS[why][0],errorEn:REFUSALS[why][1],code:why,tasks:[]},why==='outside-window'?200:403);
     const runId=/^[\w-]{6,40}$/.test(String(b.runId||''))?String(b.runId):'run-unknown';const r=await leaseTasks(getStoreFn,{device,settings,runId,max:b.max,now,adapter:ad});
     return json({...r,pacing:{minMs:Math.max(20000,settings.pacing.minMs),maxMs:Math.max(20000,settings.pacing.maxMs)},robots:'respect'})}
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
   if(op==='pair-code'&&method==='POST'){if(ctx.member?.role==='viewer')return json({error:'Tài khoản chỉ xem không ghép nối được.',errorEn:'View-only accounts cannot pair devices.'},403);await rate(getStoreFn,'code:'+actor,10,now);const r=await createPairCode(getStoreFn,actor,now,env);await recordEvent(getStoreFn,'scout_pair_code',{account:actor},now);return json(r,201)}
   if(op==='my-devices'&&isRead){const mine=(await listDevices(getStoreFn)).filter(d=>d.owner===actor&&!d.revokedAt);return json({devices:mine.map(d=>({id:d.id,name:d.name,stores:d.stores,lastHeartbeat:d.lastHeartbeat,lastRunAt:d.lastRunAt,paused:d.pausedUntil>now}))})}
   if(!op.startsWith('studio-'))return json({error:'Thao tác không hỗ trợ.',errorEn:'Unsupported operation.'},404);
   const ps=await platformSettings(getStoreFn,{env,now}),role=roleFor(actor,env,ps.values);
   if(!role)return json({error:'Tài khoản này không có quyền vào Studio.',errorEn:'This account does not have Studio access.'},403);
   let b:any={};
   if(!isRead){const token=request.headers.get('x-studio-csrf')||'',want=csrfFor(ctx.sessionKey);if(token.length!==want.length||!timingSafeEqual(Buffer.from(token),Buffer.from(want)))return json({error:'Phiên Studio đã hết hạn. Tải lại trang.',errorEn:'Studio session token mismatch. Reload the page.'},403);if(role!=='owner')return json({error:'Vai trò hỗ trợ chỉ được xem.',errorEn:'Support role is read-only.'},403);b=await body(150000)}
   const audit=(action:string,target:any=null,extra:any={})=>writeAudit(getStoreFn,{actor,role,action,target,...extra},now);
   const reasonOf=()=>String(b.reason||'').trim().slice(0,300);
   if(op==='studio-overview'&&isRead)return json(await studioOverview(getStoreFn,{now,env}));
   if(op==='studio-coverage'&&isRead)return json(await coverage(getStoreFn,{now}));
   if(op==='studio-events'&&isRead)return json({events:await listEvents(getStoreFn,{days:14,limit:200,now})});
   if(op==='studio-pair-code'&&method==='POST'){const r=await createPairCode(getStoreFn,actor,now,env);await audit('scout_pair_code',{type:'scout',id:'pair'});return json(r,201)}
   if(op==='studio-network'&&method==='POST'){const patch=validateNetworkPatch(b.patch||{},await scoutConfig(getStoreFn));await saveNetwork(getStoreFn,patch,actor,now);await audit('scout_network',{type:'scout',id:'network'},{details:patch,reason:reasonOf()||undefined});return json(await studioOverview(getStoreFn,{now,env}))}
   if(op==='studio-device'&&method==='POST'){const d=await getDevice(getStoreFn,b.deviceId),action=String(b.action||'');let patch:any;
    if(action==='pause')patch={pausedUntil:now+(Number.isInteger(b.hours)&&b.hours>0&&b.hours<=720?b.hours:24*30)*3600000,pauseReason:'studio'};
    else if(action==='resume')patch={pausedUntil:null,pauseReason:null};
    else if(action==='allow-auto')patch={autoAllowed:true};else if(action==='deny-auto')patch={autoAllowed:false};
    else if(action==='update'){patch={};if(b.name)patch.name=String(b.name).trim().slice(0,40);if(b.stores)patch.stores=cleanStores(b.stores);if(b.schedule!==undefined){if(b.schedule!==null&&!validSchedule(b.schedule))return json({error:'Khung giờ không hợp lệ.',errorEn:'Invalid schedule.'},400);patch.schedule=b.schedule}if(b.caps){const c:any={};for(const k of ['pagesPerRun','pagesPerDay'])if(Number.isInteger(b.caps[k])&&b.caps[k]>=1)c[k]=b.caps[k];patch.caps=c}}
    else return json({error:'Thao tác không hỗ trợ.',errorEn:'Unsupported action.'},400);
    await editDevice(getStoreFn,d.id,x=>({...x,...patch}));await audit('scout_device_'+action.replace(/-/g,'_'),{type:'scout-device',id:d.id},{reason:reasonOf()||undefined});return json({ok:true})}
   if(op==='studio-revoke'&&method==='POST'){const d=await getDevice(getStoreFn,b.deviceId);await revokeDevice(getStoreFn,d.id,actor,now);await audit('scout_device_revoke',{type:'scout-device',id:d.id},{reason:reasonOf()||undefined});return json({ok:true})}
   if(op==='studio-retailer'&&method==='POST'){await setRetailerPause(getStoreFn,String(b.retailer),b.action==='pause',actor,now);await audit('scout_retailer_'+(b.action==='pause'?'pause':'resume'),{type:'scout-retailer',id:String(b.retailer)});return json({ok:true})}
   if(op==='studio-trusted'&&method==='POST'){await setTrusted(getStoreFn,String(b.username||'').toLowerCase(),b.grant===true,actor,now);await audit(b.grant===true?'scout_trusted_grant':'scout_trusted_revoke',{type:'account',id:String(b.username||'').toLowerCase()});return json({ok:true})}
   if(op==='studio-config'&&method==='POST'){const store=scoutStore(getStoreFn);if(b.config===null){await store.delete('config/override');await audit('scout_config_reset',{type:'scout',id:'config'});return json({ok:true,version:(await scoutConfig(getStoreFn))?.version})}const c=validateConfig(b.config);await store.setJSON('config/override',{config:c,by:actor,at:new Date(now).toISOString()});await audit('scout_config_set',{type:'scout',id:'config'},{details:{version:c.version,hash:sha(JSON.stringify(c)).slice(0,12)}});return json({ok:true,version:c.version})}
   return json({error:'Thao tác không hỗ trợ.',errorEn:'Unsupported operation.'},404);
  }catch(e:any){if(!e?.status)console.error('Scout failed',e?.name,e?.message);return json({error:e?.status?e.message:'Chưa xử lý được. Thử lại sau.',errorEn:e?.status?e.en||e.message:'Could not complete the request. Try again later.',...(e?.code?{code:e.code}:{})},e?.status||503)}
 };
}
export default createScoutHandler();
