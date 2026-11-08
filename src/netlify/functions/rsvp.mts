// v1.7.13 guest invitations — the public side. A guest opens the link the family shared (/rsvp.html#t=TOKEN); this function
// reads the invitation's public part and takes the guest's answer, without an account. Only the token reaches it; nothing else of
// the family is readable here. Answers notify the family's phones (lib/push), in the background.
import {getStore} from '@netlify/blobs';
import {scopedStore} from '../lib/accounts.mjs';
import {sendPushBatch} from '../lib/push.mjs';
import {validToken,normalToken,shortToken,guessKey,GUESS_PER_IP_HOUR,GUESS_ALL_HOUR,publicView,replyFromRequest,forgettable,replyMessage} from '../lib/rsvp.mjs';
const json=(data:any,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex','Referrer-Policy':'no-referrer'}});
export function createRsvpHandler({getStoreFn=getStore as any,pushSend=null as any,clock=()=>Date.now()}={}){
 const rsvpStore=()=>getStoreFn({name:'bep-rsvp',consistency:'strong',region:'ap-southeast-2'}),familyStore=()=>getStoreFn({name:'bep-family-data',consistency:'strong',region:'ap-southeast-2'});
 return async(request:Request,runtime:any=undefined)=>{
  const url=new URL(request.url),token=normalToken(url.searchParams.get('t'));
  if(!validToken(token))return json({error:'Invitation not found.'},404);
  if(!['GET','HEAD','POST'].includes(request.method))return json({error:'Unsupported.'},405);
  try{const rs=rsvpStore(),key='invite/'+token,now=clock(),hour=Math.floor(now/3600000);
   // short codes can be guessed: too many wrong codes from one network address (or overall) in an hour → wait
   const guarded=shortToken(token),ipKey=guarded?guessKey(String(runtime?.ip||request.headers.get('x-nf-client-connection-ip')||'unknown')):'';
   const counts=guarded?await Promise.all([rs.get(ipKey,{type:'json'}),rs.get('guess/all',{type:'json'})]).catch(()=>[null,null]):[null,null];
   const n=(c:any)=>c&&c.hour===hour?c.n:0;
   if(guarded&&(n(counts[0])>=GUESS_PER_IP_HOUR||n(counts[1])>=GUESS_ALL_HOUR))return json({error:'Too many wrong codes. Please try again in an hour.',reason:'too_many'},429);
   const got=await rs.getWithMetadata(key,{type:'json'}),rec=got?.data;
   if(!rec||forgettable(rec,now)){if(rec)await rs.delete(key).catch(()=>{});
    if(guarded&&!rec)await Promise.all([rs.setJSON(ipKey,{hour,n:n(counts[0])+1}),rs.setJSON('guess/all',{hour,n:n(counts[1])+1})]).catch(()=>{});
    return json({error:'Invitation not found.'},404)}
   if(request.method!=='POST')return json(publicView(rec,now));
   if(request.headers.get('origin')!==url.origin)return json({error:'Same-origin request required.'},403);
   const raw=await request.text();if(raw.length>2000)return json({error:'Too large.'},413);let body;try{body=JSON.parse(raw)}catch{return json({error:'Invalid JSON.'},400)}
   const r:any=replyFromRequest(rec,body,now);if(r.error)return json({error:r.error,reason:r.reason||'invalid',view:publicView(rec,now)},r.status||400);
   const saved=await rs.setJSON(key,r.record,got?.etag?{onlyIfMatch:got.etag}:{});if(saved&&saved.modified===false)return json({error:'The answer changed meanwhile. Please try again.',reason:'stale'},409);
   const notify=async()=>{try{const fam=scopedStore(familyStore(),rec.householdId,null),state=await fam.get('state',{type:'json'}),targets=(state?.members||[]).map((m:any)=>m.id).slice(0,12);if(targets.length)await sendPushBatch(fam,replyMessage(r.record),{targets,subject:url.origin,family:state,...(pushSend?{send:pushSend}:{})})}catch(e:any){console.warn('RSVP push failed',e?.name)}};
   if(typeof runtime?.waitUntil==='function')runtime.waitUntil(notify());else await notify();
   return json({saved:true,view:publicView(r.record,now)})
  }catch(e:any){console.error('RSVP failed',e?.name);return json({error:'Invitations are unavailable right now. Please try again later.'},503)}
 };
}
export default createRsvpHandler();
