// Floating ladybug feedback API (v1.7.1). See ../lib/feedback.mts for what is stored and who may send.
// App (cookie session when signed in; device-only use sends its random token in x-feedback-device, no cookie):
//  - GET  ?op=status        {visible, mode, role, unread}: should this person see the ladybug?
//  - POST ?op=submit        one report (≤600 KB JSON, picture optional). 403 when the mode excludes the sender,
//                           429 rate limits, 400 invalid, 413 too large. Same clientId again → the same id (offline queue).
//  - GET  ?op=mine          the reporter's own reports with Studio's replies (never the internal notes)
//  - POST ?op=seen {ids}    replies read;  POST ?op=confirm {id, fixed}  "Yes, fixed / Still wrong"
// Studio (cookie + Studio owner; POST also same-origin + x-studio-csrf; every change and every detail view audited):
//  - GET  ?op=studio-inbox&status&type&route&reporter&page    GET ?op=studio-detail&id    GET ?op=studio-shot&id
//  - POST ?op=studio-update {id,status?,note?,reply?}   POST ?op=studio-mode {mode}   POST ?op=studio-tester {username,grant}
// v1.7.18 receipt text to fix the reader (../lib/receipt-reports.mts), open to every family (account or device-only), not to the
// ladybug's mode: POST ?op=receipt-report (≤40 KB, 429 rate limits, 400 invalid, 413 too large; same clientId → same id).
// Studio (owner / admin / moderator, same checks as above): GET ?op=studio-receipts&status&page · GET ?op=studio-receipt&id ·
// POST ?op=studio-receipt-status {id,status} · POST ?op=studio-receipt-delete {id}.
import {getStore} from '@netlify/blobs';
import {timingSafeEqual} from 'node:crypto';
import {resolveAccount,accountStore} from '../lib/accounts.mjs';
import {platformSettings,roleFor,csrfFor,writeAudit,readIndex} from '../lib/studio.mjs';
import {notifyAccount} from '../lib/scout-notify.mjs';
import {access,submit,mine,markSeen,reporterConfirm,reporterKey,inbox,devExport,detail,shotOf,update,setMode,setTester,testerRows,feedbackConfig,ownerMessage,replyMessage,unreadCount,FB_LIMITS,setGithub,openWithoutGithub} from '../lib/feedback.mjs';
import {fileIssue,githubConfig} from '../lib/feedback-github.mjs';
import {submitReceiptReport,listReceiptReports,receiptReportDetail,setReceiptReportStatus,deleteReceiptReport,RR_LIMITS} from '../lib/receipt-reports.mjs';

const BASE_HEADERS={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const admins=(env:any)=>String(env?.STUDIO_ADMINS||'').split(',').map((x:string)=>x.trim().toLowerCase()).filter(Boolean);
export function createFeedbackHandler({getStoreFn=getStore,env=process.env,nowFn=()=>Date.now(),notify,fetchFn=fetch}:any={}){
 // notify(username, message): push to that account's own devices (quiet hours and per-device switches apply).
 const push=notify||((u:string,m:any)=>notifyAccount(getStoreFn,u,m));
 return async(request:Request,context?:any)=>{
  const url=new URL(request.url),op=url.searchParams.get('op')||'',method=request.method,now=nowFn(),origin=request.headers.get('origin')||'',isRead=['GET','HEAD'].includes(method);
  const json=(data:any,status=200)=>Response.json(data,{status,headers:BASE_HEADERS});
  const q=(k:string)=>url.searchParams.get(k)||'';
  try{
   if(!isRead&&origin&&origin!==url.origin)return json({error:'Yêu cầu phải từ cùng trang.',errorEn:'Same-origin request required.'},403);
   let body:any={};
   if(!isRead){const raw=await request.text();if(op==='receipt-report'&&raw.length>RR_LIMITS.bytes)return json({error:'Chữ hoá đơn quá dài.',errorEn:'The receipt text is too long.',code:'too_large'},413);if(raw.length>FB_LIMITS.bytes)return json({error:'Góp ý quá lớn (ảnh quá nặng).',errorEn:'Feedback too large (picture too big).',code:'too_large'},413);try{body=raw?JSON.parse(raw):{}}catch{return json({error:'Dữ liệu không hợp lệ.',errorEn:'Invalid JSON.'},400)}}
   const ctx=await resolveAccount(request,getStoreFn,now),username=ctx?.account?.username||null,device=request.headers.get('x-feedback-device')||'';

   // ----- app -----
   if(op==='access'&&isRead){const a=await access(getStoreFn,{username,env});const who=a.visible?reporterKey(username,device):null;return json({...a,unread:who?await unreadCount(getStoreFn,who):0,account:!!username})}
   if(op==='submit'&&method==='POST'){
    const ip=request.headers.get('x-nf-client-connection-ip')||context?.ip||'';
    const r:any=await submit(getStoreFn,{body,username,deviceToken:device,ip,env,now});
    if(r.status===201){// v1.7.6: also filed as an issue in the private feedback repository (never blocks the report)
     try{const gh:any=await fileIssue(r.record,{env,fetchFn});if(gh?.number)await setGithub(getStoreFn,r.record.id,gh,now);else if(gh?.error)console.warn('Feedback GitHub issue not filed',gh.error)}catch(e:any){console.warn('Feedback GitHub issue failed',e?.message)}
     const m=ownerMessage(r.record);for(const owner of admins(env))if(owner!==username){try{await push(owner,m)}catch(e:any){console.warn('Feedback owner push failed',e?.message)}}}
    return json(r.body,r.status)}
   if(op==='receipt-report'&&method==='POST'){const ip=request.headers.get('x-nf-client-connection-ip')||context?.ip||'';const r:any=await submitReceiptReport(getStoreFn,{body,who:reporterKey(username,device),account:!!username,ip,now});return json(r.body,r.status)}
   if(['mine','seen','confirm'].includes(op)){
    const a=await access(getStoreFn,{username,env}),who=reporterKey(username,device);
    // Replies stay readable after the switch is turned off only for what this reporter already sent.
    if(!who)return json({error:'Thiếu mã thiết bị.',errorEn:'Missing device token.'},400);
    if(op==='mine'&&isRead)return json({...await mine(getStoreFn,who),visible:a.visible});
    if(op==='seen'&&method==='POST')return json(await markSeen(getStoreFn,who,body.ids,now));
    if(op==='confirm'&&method==='POST')return json(await reporterConfirm(getStoreFn,who,body.id,body.fixed===true,now));
   }

   // ----- Studio -----
   if(op.startsWith('studio-')){
    if(!ctx)return json({error:'Cần đăng nhập tài khoản.',errorEn:'Sign in to your account first.',login:'/login'},401);
    const ps=await platformSettings(getStoreFn,{env,now}),role=roleFor(username!,env,ps.values);
    if(!(role==='owner'||role==='admin'||(role==='moderator'&&!['studio-mode','studio-tester'].includes(op)))){await writeAudit(getStoreFn,{actor:username!,role:role||'none',action:'access_denied',target:{type:'feedback',id:op},result:'denied'},now);return json({error:'Chỉ chủ Studio xem được góp ý.',errorEn:'Only the Studio owner can view feedback.'},403)}
    const audit=(action:string,target:any=null,extra:any={})=>writeAudit(getStoreFn,{actor:username!,role,action,target,...extra},now);
    if(!isRead){const token=request.headers.get('x-studio-csrf')||'',want=csrfFor(ctx.sessionKey);if(!origin||token.length!==want.length||!timingSafeEqual(Buffer.from(token),Buffer.from(want)))return json({error:'Phiên Studio đã hết hạn. Tải lại trang.',errorEn:'Studio session token mismatch. Reload the page.'},403)}
    if(op==='studio-receipts'&&isRead)return json(await listReceiptReports(getStoreFn,{status:q('status'),page:+q('page')||1,size:+q('size')||25}));
    if(op==='studio-receipt'&&isRead){const d=await receiptReportDetail(getStoreFn,q('id'));await audit('receipt_report_view',{type:'receipt-report',id:d.id});return json(d)}
    if(op==='studio-receipt-status'&&method==='POST'){const r=await setReceiptReportStatus(getStoreFn,body.id,body.status,username!,now);await audit('receipt_report_status',{type:'receipt-report',id:r.detail.id},{details:{from:r.from,to:body.status}});return json(r.detail)}
    if(op==='studio-receipt-delete'&&method==='POST'){const r=await deleteReceiptReport(getStoreFn,body.id);await audit('receipt_report_delete',{type:'receipt-report',id:r.deleted});return json(r)}
    const overview=async()=>({config:await feedbackConfig(getStoreFn),...await testerRows(getStoreFn,env),github:githubConfig(env)?{repo:githubConfig(env)!.repo}:null});
    if(op==='studio-inbox'&&isRead)return json({...await inbox(getStoreFn,{status:q('status'),type:q('type'),route:q('route'),reporter:q('reporter'),page:+q('page')||1,size:+q('size')||25}),...await overview()});
    // v1.7.6: file the open reports that have no GitHub issue yet (reports sent before the switch, or when GitHub was down)
    if(op==='studio-github'&&method==='POST'){if(role!=='owner'&&role!=='admin')return json({error:'Chỉ chủ Studio làm được việc này.',errorEn:'Owner only.'},403);if(!githubConfig(env))return json({error:'Chưa cài FEEDBACK_GITHUB_REPO / FEEDBACK_GITHUB_TOKEN.',errorEn:'FEEDBACK_GITHUB_REPO / FEEDBACK_GITHUB_TOKEN are not set.',code:'not_configured'},400);
     const list=await openWithoutGithub(getStoreFn,20);let filed=0,failed=0,lastError='';for(const rec of list){const gh:any=await fileIssue(rec,{env,fetchFn});if(gh?.number){await setGithub(getStoreFn,rec.id,gh,now);filed++}else{failed++;lastError=gh?.error||'';if(/^http-40[134]$/.test(gh?.error||''))break}}
     await audit('feedback_github_sync',{type:'feedback',id:'open'},{details:{filed,failed}});return json({filed,failed,error:lastError||null})}
    if(op==='studio-export'&&isRead){const items=await devExport(getStoreFn);await writeAudit(getStoreFn,{actor:username!,role,action:'feedback_export',target:{type:'feedback',id:'open'},count:items.length},now);return json({items})}
    if(op==='studio-detail'&&isRead){const d=await detail(getStoreFn,q('id'));await audit('feedback_view',{type:'feedback',id:d.id});return json(d)}
    if(op==='studio-shot'&&isRead){const s=await shotOf(getStoreFn,q('id'));if(!s)return json({error:'Không có ảnh.',errorEn:'No picture.'},404);await audit('feedback_view_shot',{type:'feedback',id:q('id')});return json({shot:s})}
    if(op==='studio-update'&&method==='POST'){
     const r=await update(getStoreFn,body.id,body,username!,now);
     await audit('feedback_update',{type:'feedback',id:r.record.id},{details:{status:r.changes.status||null,note:!!r.changes.note,reply:!!r.changes.reply}});
     if(r.changes.reply&&r.record.reporter?.account&&r.record.reporter.account!==username){try{await push(r.record.reporter.account,replyMessage)}catch(e:any){console.warn('Feedback reply push failed',e?.message)}}
     return json(await detail(getStoreFn,r.record.id))}
    if(op==='studio-mode'&&method==='POST'){const before=(await feedbackConfig(getStoreFn)).feedbackBug;await setMode(getStoreFn,body.mode,username!,now);await audit('feedback_mode',{type:'feedback',id:'feedbackBug'},{details:{from:before,to:body.mode}});return json(await overview())}
    if(op==='studio-tester'&&method==='POST'){const u=String(body.username||'').trim().toLowerCase(),grant=body.grant===true;
     if(grant){const accounts=accountStore(getStoreFn);if(!/^[a-z0-9][a-z0-9_.-]{2,39}$/.test(u)||!await accounts.get('users/'+u,{type:'json'})){const ix=await readIndex(getStoreFn,{now}).catch(()=>null);if(!ix?.accounts?.rows?.some((r:any)=>r.username===u))return json({error:'Không tìm thấy tài khoản.',errorEn:'Account not found.'},404)}}
     const r=await setTester(getStoreFn,u,grant,username!,now);await audit(grant?'feedback_tester_add':'feedback_tester_remove',{type:'account',id:r.username},{details:{changed:r.changed}});return json(await overview())}
   }
   return json({error:'Thao tác không hỗ trợ.',errorEn:'Unsupported operation.'},404);
  }catch(e:any){if(!e?.status)console.error('Feedback failed',e?.name,e?.message);return json({error:e?.status?e.message:'Chưa xử lý được. Thử lại sau.',errorEn:e?.status?e.en||e.message:'Could not complete the request. Try again later.',...(e?.code?{code:e.code}:{})},e?.status||503)}
 };
}
export default createFeedbackHandler();
