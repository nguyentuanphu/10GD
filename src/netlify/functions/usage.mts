// Anonymous usage statistics API (v1.7). See ../lib/usage.mts for what is stored.
//  - POST ?op=ingest   app; JSON body (≤8 KB, strict whitelist) with the random install id.
//                      Same-origin when an Origin is sent (sendBeacon/keepalive may omit it).
//                      Account/family come only from the session cookie; network location is
//                      reduced to country + state here. Refused quietly when Studio switched
//                      flags.usageAnalytics off. Rate-limited per install and per network address
//                      (the address is only hashed into a short-lived counter key, never stored).
//  - POST ?op=forget   app; {install}: deletes everything recorded for that install (opt-out).
//  - GET  ?op=studio-usage-overview&days=7|30|90[&fresh=1]  Studio owner/support; aggregates only; cached 60 s.
//  - GET  ?op=studio-usage-inactive&threshold=14|30          Studio owner; family names; audited.
//  - GET  ?op=studio-usage-detail&family=<id>|&account=<u>   Studio owner; one family/account; audited.
import {getStore} from '@netlify/blobs';
import {resolveAccount} from '../lib/accounts.mjs';
import {platformSettings,roleFor,writeAudit} from '../lib/studio.mjs';
import {ingest,forgetInstall,overview,inactiveFamilies,detail,networkGeo,USAGE_LIMITS} from '../lib/usage.mjs';

const BASE_HEADERS={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
export function createUsageHandler({getStoreFn=getStore,env=process.env,nowFn=()=>Date.now()}:any={}){
 return async(request:Request,context?:any)=>{
  const url=new URL(request.url),op=url.searchParams.get('op')||'',method=request.method,now=nowFn(),origin=request.headers.get('origin')||'';
  const json=(data:any,status=200)=>Response.json(data,{status,headers:BASE_HEADERS});
  try{
   if(op==='ingest'||op==='forget'){
    if(method!=='POST')return json({error:'Phương thức không hỗ trợ.',errorEn:'Method not allowed.'},405);
    if(origin&&origin!==url.origin)return json({error:'Yêu cầu phải từ cùng trang.',errorEn:'Same-origin request required.'},403);
    const raw=await request.text();if(raw.length>USAGE_LIMITS.bytes)return json({error:'Quá lớn.',errorEn:'Too large.'},413);
    let body:any={};try{body=raw?JSON.parse(raw):{}}catch{return json({error:'Dữ liệu không hợp lệ.',errorEn:'Invalid JSON.'},400)}
    if(op==='forget')return json(await forgetInstall(getStoreFn,body?.install));
    const settings=await platformSettings(getStoreFn,{env,now});
    if(settings.values.flags?.usageAnalytics===false)return json({ok:false,disabled:true},202);
    const ctx=await resolveAccount(request,getStoreFn,now);
    const ip=request.headers.get('x-nf-client-connection-ip')||context?.ip||'unknown';
    return json(await ingest(getStoreFn,{body,account:ctx?.account?.username||null,family:ctx?.household?.id||null,net:networkGeo(request,context),ip,now}),201);
   }
   if(op.startsWith('studio-usage-')){
    if(method!=='GET')return json({error:'Phương thức không hỗ trợ.',errorEn:'Method not allowed.'},405);
    const ctx=await resolveAccount(request,getStoreFn,now);if(!ctx)return json({error:'Cần đăng nhập tài khoản.',errorEn:'Sign in first.',login:'/login'},401);
    const actor=ctx.account.username,ps=await platformSettings(getStoreFn,{env,now}),role=roleFor(actor,env,ps.values);
    if(!role)return json({error:'Không có quyền Studio.',errorEn:'No Studio access.'},403);
    if(op==='studio-usage-overview'){const days=parseInt(url.searchParams.get('days')||'30',10)||30;return json({...await overview(getStoreFn,{days,fresh:url.searchParams.get('fresh')==='1',now}),collecting:ps.values.flags?.usageAnalytics!==false})}
    if(!(role==='owner'||role==='admin'))return json({error:'Chỉ chủ Studio xem được chi tiết từng gia đình.',errorEn:'Only the Studio owner can view individual families.'},403);
    if(op==='studio-usage-inactive'){const threshold=url.searchParams.get('threshold')==='30'?30:14;const list=await inactiveFamilies(getStoreFn,{threshold,now});
     await writeAudit(getStoreFn,{actor,role,action:'usage_inactive_list',target:{type:'usage',id:'inactive-'+threshold},details:{threshold,count:list.length}},now);return json({threshold,families:list})}
    if(op==='studio-usage-detail'){const family=url.searchParams.get('family'),account=url.searchParams.get('account');
     if(family&&!/^[a-f0-9-]{36}$/.test(family)||account&&!/^[a-z0-9._-]{1,40}$/.test(account)||!family===!account)return json({error:'Thiếu gia đình hoặc tài khoản.',errorEn:'Choose one family or account.'},400);
     const d=await detail(getStoreFn,{family,account,now});
     await writeAudit(getStoreFn,{actor,role,action:'usage_drilldown',target:family?{type:'family',id:family}:{type:'account',id:account},details:{days:d.days,rows:d.rows.length}},now);
     return json({...d,family,account})}
   }
   return json({error:'Thao tác không hỗ trợ.',errorEn:'Unsupported operation.'},404);
  }catch(e:any){if(!e?.status)console.error('Usage stats failed',e?.name,e?.message);return json({error:e?.status?e.message:'Chưa xử lý được. Thử lại sau.',errorEn:e?.status?e.en||e.message:'Could not complete the request. Try again later.',...(e?.code?{code:e.code}:{})},e?.status||503)}
 };
}
export default createUsageHandler();
