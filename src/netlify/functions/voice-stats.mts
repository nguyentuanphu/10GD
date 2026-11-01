// Opt-in voice statistics API (text only, never audio).
//  - POST ?op=submit   app, anonymous device token in `x-voice-stats-device`; same-origin
//                      when an Origin is sent. Rate-limited per device and per IP.
//  - POST ?op=forget   app, same token: deletes everything sent from that device (opt-out).
//  - GET  ?op=studio-overview&days=N   Studio owner only; audited read.
//  - GET  ?op=studio-export&days=N     Studio owner only; audited; "add as synonym" JSON.
// Account cookies are never required to submit and no account name is stored.
import {getStore} from '@netlify/blobs';
import {resolveAccount} from '../lib/accounts.mjs';
import {platformSettings,roleFor,writeAudit} from '../lib/studio.mjs';
import {submitEvent,forgetDevice,aggregate,suggestions,prune} from '../lib/voice-stats.mjs';

const BASE_HEADERS={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
export function createVoiceStatsHandler({getStoreFn=getStore,env=process.env,nowFn=()=>Date.now()}:any={}){
 return async(request:Request)=>{
  const url=new URL(request.url),op=url.searchParams.get('op')||'',method=request.method,now=nowFn(),origin=request.headers.get('origin')||'';
  const json=(data:any,status=200)=>Response.json(data,{status,headers:BASE_HEADERS});
  try{
   if(op==='submit'||op==='forget'){
    if(method!=='POST')return json({error:'Phương thức không hỗ trợ.',errorEn:'Method not allowed.'},405);
    if(origin&&origin!==url.origin)return json({error:'Yêu cầu phải từ cùng trang.',errorEn:'Same-origin request required.'},403);
    const raw=await request.text();if(raw.length>8000)return json({error:'Quá lớn.',errorEn:'Too large.'},413);
    let body:any={};try{body=raw?JSON.parse(raw):{}}catch{return json({error:'Dữ liệu không hợp lệ.',errorEn:'Invalid JSON.'},400)}
    const token=request.headers.get('x-voice-stats-device')||'';
    if(op==='forget')return json(await forgetDevice(getStoreFn,token));
    return json(await submitEvent(getStoreFn,{token,ip:request.headers.get('x-nf-client-connection-ip')||'unknown',body,now}),201);
   }
   if(op==='studio-overview'||op==='studio-export'){
    if(method!=='GET')return json({error:'Phương thức không hỗ trợ.',errorEn:'Method not allowed.'},405);
    const ctx=await resolveAccount(request,getStoreFn,now);if(!ctx)return json({error:'Cần đăng nhập tài khoản.',errorEn:'Sign in first.',login:'/login'},401);
    const actor=ctx.account.username,ps=await platformSettings(getStoreFn,{env,now}),role=roleFor(actor,env,ps.values);
    if(role!=='owner')return json({error:'Chỉ chủ Studio xem được thống kê giọng nói.',errorEn:'Only the Studio owner can view voice statistics.'},403);
    const days=Math.max(1,Math.min(90,parseInt(url.searchParams.get('days')||'30',10)||30));
    await prune(getStoreFn,now,500);
    const agg=await aggregate(getStoreFn,{days,now});
    await writeAudit(getStoreFn,{actor,role,action:op==='studio-export'?'voice_stats_export':'voice_stats_view',target:{type:'voice-stats',id:'aggregate'},details:{days,total:agg.total}},now);
    return json(op==='studio-export'?suggestions(agg):agg);
   }
   return json({error:'Thao tác không hỗ trợ.',errorEn:'Unsupported operation.'},404);
  }catch(e:any){if(!e?.status)console.error('Voice stats failed',e?.name,e?.message);return json({error:e?.status?e.message:'Chưa xử lý được. Thử lại sau.',errorEn:e?.status?e.en||e.message:'Could not complete the request. Try again later.',...(e?.code?{code:e.code}:{})},e?.status||503)}
 };
}
export default createVoiceStatsHandler();
