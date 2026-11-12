// Floating ladybug feedback (v1.7.1, owner request 1 Nov 2026), ported from Sparkle Valley's tester reports
// (js/tester.ts + netlify/lib/tester.mts there) and adapted to a family meal-planning app.
//
// Store "bep-feedback" (keys):
//   config                          {feedbackBug:'off'|'assigned'|'everyone', updatedAt, updatedBy}  (default 'assigned')
//   testers                         {users:{[username]:{by,at}}}   accounts Henry assigned in Studio
//   r/<id>                          one report (no picture inside)
//   shot/<id>                       {data:'data:image/jpeg;base64,…'}  the reporter's chosen picture, metadata stripped
//   mine/<reporterKey>              {ids:[…]}  the reporter's own reports (for "My feedback")
//   receipt/<reporterKey>/<client>  {id,at}  an offline-queued report sent twice is stored once
//   rate/<kind>/<day>/<key>         counters (per reporter, per network address hash), pruned after 2 days
//
// Who sees the bug: STUDIO_ADMINS always; testers while the mode is not 'off'; everyone else (and device-only use
// without an account) only in mode 'everyone'. The server refuses (403) submissions from anyone the mode excludes.
// What is kept: what the reporter wrote and chose to attach, plus technical context (page, app version/build,
// platform class, language, viewport, theme, online state, time, recent client error lines without personal data).
// Never kept: IP address, email, family id, names, recipe data, the account's other data. Reports older than
// 13 months are removed by the daily cleanup (functions/feedback-cleanup.mts).
import {createHash,randomBytes} from 'node:crypto';
import {editRecord} from './accounts.mjs';

const REGION={consistency:'strong',region:'ap-southeast-2'} as const;
export const feedbackStore=(getStoreFn:any)=>getStoreFn({name:'bep-feedback',...REGION});
const DAY=86400000;
export const FB_LIMITS={bytes:600000,note:1000,shotBytes:400000,shotSide:2400,errors:10,errorLen:160,perReporterDay:20,perIpDay:60,perReporterMinute:4,reply:2000,internal:2000,replies:50,notes:50,history:100,mineKeep:200,keepDays:396,receiptDays:30,inboxMax:2000};
export const MODES=['off','assigned','everyone'] as const;
export const TYPES=['bug','looks','words','idea','other'] as const;
export const STATUSES=['new','triaged','fixing','fixed','closed','back','wontfix'] as const;
const OPEN=['new','triaged','fixing','back'];
const PLATFORMS=['mobile','tablet','desktop'];
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const dayOf=(ms:number)=>new Date(ms).toISOString().slice(0,10);
const txt=(v:any,n:number)=>typeof v==='string'?v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').trim().slice(0,n):'';
const validUser=(u:any)=>typeof u==='string'&&/^[a-z0-9][a-z0-9_.-]{2,39}$/.test(u);
const fail=(vi:string,en:string,status=400,code?:string):never=>{throw Object.assign(Error(vi),{status,en,...(code?{code}:{})})};
export const NOT_ALLOWED=['Góp ý đang không mở cho tài khoản này.','Feedback is not open for this account.'];
const admins=(env:any)=>String(env?.STUDIO_ADMINS||'').split(',').map((x:string)=>x.trim().toLowerCase()).filter(Boolean);
async function readJSON(store:any,key:string){try{return await store.get(key,{type:'json'})}catch{return null}}
async function keysOf(store:any,prefix:string,cap=20000){const out:string[]=[];for await(const page of store.list({prefix,paginate:true})){for(const b of page.blobs)out.push(b.key);if(out.length>=cap)break}return out}
async function pool<T,R>(items:T[],n:number,fn:(x:T)=>Promise<R>){const out:R[]=new Array(items.length);let i=0;await Promise.all(Array.from({length:Math.min(n,items.length)},async()=>{while(i<items.length){const j=i++;out[j]=await fn(items[j])}}));return out}

// ---------- visibility (the Studio switch and the tester list) ----------
export async function feedbackConfig(getStoreFn:any){const c=await readJSON(feedbackStore(getStoreFn),'config');return{feedbackBug:MODES.includes(c?.feedbackBug)?c.feedbackBug:'assigned',updatedAt:c?.updatedAt||null,updatedBy:c?.updatedBy||null}}
export async function setMode(getStoreFn:any,mode:any,actor:string,now:number){if(!MODES.includes(mode))fail('Chế độ không hợp lệ.','Invalid mode.');return editRecord(feedbackStore(getStoreFn),'config',(c:any)=>({...(c||{}),feedbackBug:mode,updatedAt:new Date(now).toISOString(),updatedBy:actor}))}
export async function testerList(getStoreFn:any){const t=await readJSON(feedbackStore(getStoreFn),'testers');return t?.users&&typeof t.users==='object'?t.users:{}}
export async function setTester(getStoreFn:any,username:any,grant:boolean,actor:string,now:number){const u=String(username||'').trim().toLowerCase();if(!validUser(u))fail('Tên tài khoản không hợp lệ.','Invalid username.');
 let changed=false;await editRecord(feedbackStore(getStoreFn),'testers',(cur:any)=>{const users={...(cur?.users||{})};changed=grant?!users[u]:!!users[u];if(!changed)return undefined;if(grant)users[u]={by:actor,at:new Date(now).toISOString()};else delete users[u];return{users}});return{username:u,changed}}
/** role: admin (always), tester (unless off), everyone (mode everyone), none. Anonymous = no username. */
export async function access(getStoreFn:any,{username=null,env=process.env}:{username?:string|null,env?:any}={}){
 const {feedbackBug:mode}=await feedbackConfig(getStoreFn),u=String(username||'').toLowerCase();
 if(u&&admins(env).includes(u))return{visible:true,mode,role:'admin'};
 if(u&&mode!=='off'&&(await testerList(getStoreFn))[u])return{visible:true,mode,role:'tester'};
 if(mode==='everyone')return{visible:true,mode,role:'everyone'};
 return{visible:false,mode,role:'none'};
}
/** Reporter identity: the account, or a hash of the device's random feedback token (device-only use). */
export function reporterKey(username:string|null,deviceToken:any){if(username)return 'a-'+sha('acct:'+username).slice(0,24);const t=String(deviceToken||'');if(!/^[A-Za-z0-9_-]{24,64}$/.test(t))return null;return 'd-'+sha('dev:'+t).slice(0,24)}

// ---------- the report as it is kept (every field checked) ----------
// Recent client error lines: no email addresses, long numbers, query strings or quoted values (they could hold names).
export function cleanError(s:any){let v=txt(s,400);if(!v)return '';v=v.replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g,'[email]').replace(/https?:\/\/[^\s'")]+/g,m=>{try{const u=new URL(m);return u.origin+u.pathname.split('/').map(p=>p.length>40?'…':p).join('/')}catch{return '[url]'}}).replace(/(["'`“”‘’])(?:(?!\1).){3,}?\1/g,'"…"').replace(/\b\d{5,}\b/g,'#').replace(/\s+/g,' ');return v.slice(0,FB_LIMITS.errorLen)}
/** Validates a JPEG data URL and drops metadata segments (EXIF/XMP/comments); null when it is not a clean small JPEG. */
export function cleanShot(v:any){if(typeof v!=='string'||!v)return null;const m=/^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(v);if(!m)return null;const buf=Buffer.from(m[1],'base64');if(buf.length<100||buf.length>FB_LIMITS.shotBytes)return null;const out=stripJpeg(buf);return out?'data:image/jpeg;base64,'+out.toString('base64'):null}
export function stripJpeg(buf:Buffer):Buffer|null{
 if(buf.length<4||buf[0]!==0xFF||buf[1]!==0xD8)return null;const out:Buffer[]=[buf.subarray(0,2)];let i=2,size=false;
 while(i+4<=buf.length){if(buf[i]!==0xFF)return null;const m=buf[i+1];if(m===0xFF){i++;continue}
  if(m===0xD9){out.push(buf.subarray(i,i+2));return size?Buffer.concat(out):null}
  if(m>=0xD0&&m<=0xD7||m===0x01){out.push(buf.subarray(i,i+2));i+=2;continue}
  const len=buf.readUInt16BE(i+2);if(len<2||i+2+len>buf.length)return null;const seg=buf.subarray(i,i+2+len);
  if(m>=0xC0&&m<=0xCF&&![0xC4,0xC8,0xCC].includes(m)){if(len<7)return null;const h=seg.readUInt16BE(5),w=seg.readUInt16BE(7);if(!h||!w||h>FB_LIMITS.shotSide||w>FB_LIMITS.shotSide)return null;size=true}
  if(m===0xDA){if(!size)return null;out.push(buf.subarray(i));return Buffer.concat(out)}
  if(!(m>=0xE1&&m<=0xEF||m===0xFE))out.push(seg);i+=2+len}
 return null}
export function cleanReport(b:any,now:number){
 if(!b||typeof b!=='object')return null;const clientId=/^[A-Za-z0-9_-]{16,64}$/.test(b.clientId||'')?b.clientId:null;if(!clientId)return null;
 const type=TYPES.includes(b.type)?b.type:null;if(!type)return null;const note=txt(b.note,FB_LIMITS.note);if(note.length<3)return null;
 const c=b.ctx&&typeof b.ctx==='object'?b.ctx:{},int=(v:any,lo:number,hi:number)=>Number.isInteger(v)&&v>=lo&&v<=hi?v:null;
 const vp=/^(\d{2,5})x(\d{2,5})$/.exec(String(c.viewport||''));
 const ctx={route:/^[a-z][a-z0-9-]{0,30}$/.test(c.route||'')?c.route:'',view:/^[a-z][a-z0-9-]{0,30}$/.test(c.view||'')?c.view:'',modal:c.modal===true,
  edition:int(c.edition,0,999),build:/^\d{8}T\d{6}Z-[a-f0-9]{6,20}$/.test(String(c.build||''))?String(c.build):null,
  platform:PLATFORMS.includes(c.platform)?c.platform:null,standalone:c.standalone===true,lang:c.lang==='en'?'en':'vi',theme:c.theme==='dark'?'dark':'light',
  viewport:vp?`${Math.min(+vp[1],20000)}x${Math.min(+vp[2],20000)}`:null,online:c.online!==false,account:c.account===true,queued:c.queued===true,
  clientAt:Number.isFinite(c.clientAt)&&Math.abs(c.clientAt-now)<45*DAY?new Date(c.clientAt).toISOString():null};
 const errors=(Array.isArray(b.errors)?b.errors:[]).slice(-FB_LIMITS.errors).map(cleanError).filter(Boolean);
 return{clientId,type,note,ctx,errors,shot:b.shot===undefined||b.shot===null||b.shot===''?null:b.shot};
}
const newId=()=>randomBytes(9).toString('hex');
async function bump(store:any,key:string,max:number,now:number,ttl:number){let over=false;await editRecord(store,key,(n:any)=>{const c=n?.count||0;if(c>=max){over=true;return undefined}return{count:c+1,expires:now+ttl}});return !over}

/** A report from the app. Returns {status, body}. */
export async function submit(getStoreFn:any,{body,username=null,deviceToken=null,ip='',env=process.env,now=Date.now()}:any){
 const a=await access(getStoreFn,{username,env});if(!a.visible)return{status:403,body:{error:NOT_ALLOWED[0],errorEn:NOT_ALLOWED[1],code:'not_allowed'}};
 const who=reporterKey(username,deviceToken);if(!who)return{status:400,body:{error:'Thiếu mã thiết bị.',errorEn:'Missing device token.'}};
 const r=cleanReport(body,now);if(!r)return{status:400,body:{error:'Góp ý chưa hợp lệ (cần loại và ít nhất 3 ký tự).',errorEn:'Invalid feedback (choose a type and write at least 3 characters).'}};
 const S=feedbackStore(getStoreFn),receiptKey=`receipt/${who}/${r.clientId}`,old=await readJSON(S,receiptKey);
 if(old?.id)return{status:200,body:{ok:true,id:old.id,duplicate:true}};
 let shot:string|null=null;if(r.shot!==null){shot=cleanShot(r.shot);if(!shot)return{status:400,body:{error:'Ảnh chưa hợp lệ hoặc quá lớn.',errorEn:'The picture is invalid or too large.',code:'bad_shot'}}}
 const day=dayOf(now),ipKey=ip?sha('ip:'+ip+':'+day).slice(0,24):'none';
 if(!await bump(S,`rate/m/${day}/${who}:${Math.floor(now/60000)}`,FB_LIMITS.perReporterMinute,now,2*60000)||!await bump(S,`rate/d/${day}/${who}`,FB_LIMITS.perReporterDay,now,2*DAY)||!await bump(S,`rate/i/${day}/${ipKey}`,FB_LIMITS.perIpDay,now,2*DAY))
  return{status:429,body:{error:'Đã gửi nhiều góp ý. Thử lại sau.',errorEn:'Too much feedback for now. Try again later.',code:'rate'}};
 const id=newId(),at=new Date(now).toISOString();
 // Claim the receipt first so a parallel retry of the same queued report cannot store it twice.
 const claim=await S.setJSON(receiptKey,{id,at:now},{onlyIfNew:true});if(claim&&claim.modified===false){const again=await readJSON(S,receiptKey);return{status:200,body:{ok:true,id:again?.id||id,duplicate:true}}}
 const rec={id,at,type:r.type,note:r.note,ctx:r.ctx,errors:r.errors,hasShot:!!shot,status:'new',reporter:{key:who,account:username||null,role:a.role},replies:[],notes:[],history:[{at,by:'reporter',action:'created'}],reporterSeen:at,updatedAt:at};
 if(shot)await S.setJSON('shot/'+id,{data:shot});
 await S.setJSON('r/'+id,rec);
 await editRecord(S,'mine/'+who,(m:any)=>({ids:[...((m?.ids)||[]),id].slice(-FB_LIMITS.mineKeep)}));
 return{status:201,body:{ok:true,id},record:rec};
}

// ---------- the reporter's own list ("Góp ý của tôi / My feedback") ----------
const publicReply=(x:any)=>({at:x.at,text:x.text});
const unreadOf=(r:any)=>(r.replies||[]).filter((x:any)=>x.at>(r.reporterSeen||'')).length+(r.status==='fixed'&&!r.reporterChecked?1:0);
export async function mine(getStoreFn:any,who:string){const S=feedbackStore(getStoreFn),ids=((await readJSON(S,'mine/'+who))?.ids||[]).slice(-100);
 const rows=(await pool(ids,8,(id:string)=>readJSON(S,'r/'+id))).filter((r:any)=>r&&r.reporter?.key===who);
 const items=rows.reverse().map((r:any)=>({id:r.id,at:r.at,type:r.type,note:r.note,status:r.status,hasShot:!!r.hasShot,replies:(r.replies||[]).map(publicReply),unread:unreadOf(r),canConfirm:r.status==='fixed'&&!r.reporterChecked}));
 return{items,unread:items.reduce((n:number,x:any)=>n+x.unread,0)}}
export async function unreadCount(getStoreFn:any,who:string|null){if(!who)return 0;return (await mine(getStoreFn,who)).unread}
export async function markSeen(getStoreFn:any,who:string,ids:any,now:number){const S=feedbackStore(getStoreFn),list=(Array.isArray(ids)?ids:[]).filter((x:any)=>/^[a-f0-9]{18}$/.test(x)).slice(0,100),at=new Date(now).toISOString();let n=0;
 for(const id of list)await editRecord(S,'r/'+id,(r:any)=>{if(!r||r.reporter?.key!==who)return undefined;n++;return{...r,reporterSeen:at}});return{seen:n}}
/** SV's "Yes, fixed / Still wrong" after Studio marks it fixed: closed (confirmed) or back. */
export async function reporterConfirm(getStoreFn:any,who:string,id:any,fixed:boolean,now:number){if(!/^[a-f0-9]{18}$/.test(String(id||'')))fail('Mã không hợp lệ.','Invalid id.');const at=new Date(now).toISOString();let out:any=null;
 await editRecord(feedbackStore(getStoreFn),'r/'+id,(r:any)=>{if(!r||r.reporter?.key!==who)fail('Không tìm thấy góp ý.','Feedback not found.',404);if(r.status!=='fixed')fail('Góp ý chưa ở trạng thái đã sửa.','This feedback is not marked fixed.',409);
  out={...r,status:fixed?'closed':'back',reporterChecked:at,reporterSeen:at,updatedAt:at,history:[...(r.history||[]),{at,by:'reporter',action:fixed?'confirmed_fixed':'still_wrong'}].slice(-FB_LIMITS.history)};return out});return{id,status:out.status}}

// ---------- Studio ----------
const row=(r:any,testers:any)=>({id:r.id,at:r.at,type:r.type,status:r.status,route:r.ctx?.route||'',platform:r.ctx?.platform||null,lang:r.ctx?.lang||'vi',hasShot:!!r.hasShot,replies:(r.replies||[]).length,notes:(r.notes||[]).length,
 reporter:r.reporter?.account||null,reporterRole:r.reporter?.role||'none',tester:!!(r.reporter?.account&&testers[r.reporter.account]),excerpt:String(r.note||'').slice(0,120),github:r.github?.number||null,updatedAt:r.updatedAt||r.at});
export async function inbox(getStoreFn:any,{status='',type='',route='',reporter='',page=1,size=25}:any={}){
 const S=feedbackStore(getStoreFn),keys=(await keysOf(S,'r/',FB_LIMITS.inboxMax)),testers=await testerList(getStoreFn);
 const all=(await pool(keys,16,(k:string)=>readJSON(S,k))).filter(Boolean).map((r:any)=>row(r,testers)).sort((a:any,b:any)=>b.at.localeCompare(a.at));
 const counts:any={};for(const s of STATUSES)counts[s]=0;for(const r of all)counts[r.status]=(counts[r.status]||0)+1;
 const routes=[...new Set(all.map((r:any)=>r.route).filter(Boolean))].sort(),reporters=[...new Set(all.map((r:any)=>r.reporter).filter(Boolean))].sort();
 const rows=all.filter((r:any)=>(!status||(status==='open'?OPEN.includes(r.status):r.status===status))&&(!type||r.type===type)&&(!route||r.route===route)&&(!reporter||(reporter==='~device'?!r.reporter:reporter==='~tester'?r.tester:r.reporter===reporter)));
 const sz=Math.min(100,Math.max(5,+size||25)),pg=Math.max(1,Math.min(Math.ceil(rows.length/sz)||1,+page||1));
 return{total:rows.length,all:all.length,open:all.filter((r:any)=>OPEN.includes(r.status)).length,counts,routes,reporters,page:pg,size:sz,rows:rows.slice((pg-1)*sz,pg*sz)}}
/** v1.7.5 “Sao chép cho dev”: open reports for the developer — what was written, technical context and page errors.
 *  Never the reporter (account, key, role), team notes or replies, and no pictures. Newest first, at most 100. */
export async function devExport(getStoreFn:any){const S=feedbackStore(getStoreFn),keys=await keysOf(S,'r/',FB_LIMITS.inboxMax);
 const all=(await pool(keys,16,(k:string)=>readJSON(S,k))).filter((r:any)=>r&&OPEN.includes(r.status)).sort((a:any,b:any)=>String(b.at).localeCompare(String(a.at))).slice(0,100);
 const ctxKeys=['route','view','modal','platform','viewport','lang','theme','online','build','edition','standalone','textSize'];
 return all.map((r:any)=>({id:r.id,at:r.at,type:r.type,status:r.status,note:String(r.note||'').slice(0,2000),ctx:Object.fromEntries(ctxKeys.filter(k=>r.ctx?.[k]!==undefined&&r.ctx?.[k]!==null).map(k=>[k,r.ctx[k]])),errors:(Array.isArray(r.errors)?r.errors:[]).slice(0,5).map((e:any)=>String(e?.message||e||'').slice(0,300)),hasShot:!!r.hasShot}))}
export async function detail(getStoreFn:any,id:any){if(!/^[a-f0-9]{18}$/.test(String(id||'')))fail('Mã không hợp lệ.','Invalid id.');const r=await readJSON(feedbackStore(getStoreFn),'r/'+id);if(!r)fail('Không tìm thấy góp ý.','Feedback not found.',404);
 const testers=await testerList(getStoreFn);return{...r,reporter:{account:r.reporter?.account||null,role:r.reporter?.role||'none',tester:!!(r.reporter?.account&&testers[r.reporter.account])}}}
export async function shotOf(getStoreFn:any,id:any){if(!/^[a-f0-9]{18}$/.test(String(id||'')))return null;return (await readJSON(feedbackStore(getStoreFn),'shot/'+id))?.data||null}
/** Studio change: {status?, note? (internal), reply? (the reporter sees it)}. Returns the record and what changed. */
export async function update(getStoreFn:any,id:any,b:any,actor:string,now:number){if(!/^[a-f0-9]{18}$/.test(String(id||'')))fail('Mã không hợp lệ.','Invalid id.');
 const status=b?.status===undefined||b?.status===''?null:STATUSES.includes(b.status)?b.status:fail('Trạng thái không hợp lệ.','Invalid status.');
 const note=txt(b?.note,FB_LIMITS.internal),reply=txt(b?.reply,FB_LIMITS.reply);if(!status&&!note&&!reply)fail('Không có thay đổi.','Nothing to change.');
 const at=new Date(now).toISOString(),changes:any={};let out:any=null;
 await editRecord(feedbackStore(getStoreFn),'r/'+id,(r:any)=>{if(!r)fail('Không tìm thấy góp ý.','Feedback not found.',404);const n={...r,history:[...(r.history||[])]};
  if(status&&status!==r.status){changes.status={from:r.status,to:status};n.status=status;if(status==='fixed')delete n.reporterChecked;n.history.push({at,by:actor,action:'status',from:r.status,to:status})}
  if(note){n.notes=[...(r.notes||[]),{at,by:actor,text:note}].slice(-FB_LIMITS.notes);changes.note=true;n.history.push({at,by:actor,action:'note'})}
  if(reply){n.replies=[...(r.replies||[]),{at,by:actor,text:reply}].slice(-FB_LIMITS.replies);changes.reply=true;n.history.push({at,by:actor,action:'reply'})}
  if(!Object.keys(changes).length)return undefined;n.history=n.history.slice(-FB_LIMITS.history);n.updatedAt=at;out=n;return n});
 return{record:out||await detail(getStoreFn,id),changes}}
export async function testerRows(getStoreFn:any,env:any=process.env){const users=await testerList(getStoreFn);return{admins:admins(env),testers:Object.entries(users).map(([username,g]:any)=>({username,by:g.by||null,at:g.at||null})).sort((a,b)=>a.username.localeCompare(b.username))}}

// ---------- housekeeping (daily) ----------
export async function prune(getStoreFn:any,now=Date.now(),max=20000){const S=feedbackStore(getStoreFn),cutoff=new Date(now-FB_LIMITS.keepDays*DAY).toISOString(),rateDay=dayOf(now-2*DAY);let removed=0;
 for(const k of await keysOf(S,'rate/',max)){const d=k.split('/')[2]||'';if(d<rateDay){await S.delete(k);removed++}}
 const gone=new Set<string>();
 for(const k of await keysOf(S,'r/',max)){const r=await readJSON(S,k);if(!r||String(r.at||'')<cutoff){const id=k.slice(2);await S.delete(k);await S.delete('shot/'+id);gone.add(id);removed++}}
 for(const k of await keysOf(S,'shot/',max)){const id=k.slice(5);if(gone.has(id))continue;if(!await readJSON(S,'r/'+id)){await S.delete(k);removed++}}
 for(const k of await keysOf(S,'receipt/',max)){const x=await readJSON(S,k);if(!x?.at||x.at<now-FB_LIMITS.receiptDays*DAY){await S.delete(k);removed++}}
 if(gone.size)for(const k of await keysOf(S,'mine/',max))await editRecord(S,k,(m:any)=>{const ids=(m?.ids||[]).filter((x:string)=>!gone.has(x));return m&&ids.length!==m.ids.length?{ids}:undefined});
 return{removed,cutoff}}

// ---------- push to the Studio owner on new feedback (no feedback text on the lock screen) ----------
const TYPE_WORD:any={bug:['Lỗi','Bug'],looks:['Hiển thị sai','Looks wrong'],words:['Chữ / dịch','Words'],idea:['Ý tưởng','Idea'],other:['Khác','Other']};
export function ownerMessage(rec:any){const t=TYPE_WORD[rec.type]||TYPE_WORD.other,where=rec.ctx?.route?' · #'+rec.ctx.route:'';return{type:'feedback',key:'feedback-new',tag:'feedback-new',url:'/#today',title:'Góp ý mới',enTitle:'New feedback',body:`${t[0]}${where}. Mở Studio → Góp ý.`,enBody:`${t[1]}${where}. Open Studio → Feedback.`}}
export const replyMessage={type:'feedback',key:'feedback-reply',tag:'feedback-reply',url:'/#today?lb=mine',title:'Có trả lời góp ý của bạn',enTitle:'Your feedback has a reply',body:'Chạm để đọc câu trả lời.',enBody:'Tap to read the reply.'};/* v1.7.19 (owner pop-up, 12 Nov 2026): the tap opens the ladybug on “Góp ý của tôi” */

// v1.7.6: the GitHub issue a report was filed as (lib/feedback-github.mts); kept on the report for Studio's link
export async function setGithub(getStoreFn:any,id:string,gh:{number:number,url:string},now:number){if(!/^[a-f0-9]{18}$/.test(String(id||''))||!Number.isInteger(gh?.number))return null;
 return editRecord(feedbackStore(getStoreFn),'r/'+id,(r:any)=>r?{...r,github:{number:gh.number,url:/^https:\/\/github\.com\//.test(gh.url)?gh.url:'',at:new Date(now).toISOString()}}:undefined)}
export async function openWithoutGithub(getStoreFn:any,max=20){const S=feedbackStore(getStoreFn),keys=await keysOf(S,'r/',FB_LIMITS.inboxMax);
 const all=(await pool(keys,16,(k:string)=>readJSON(S,k))).filter((r:any)=>r&&OPEN.includes(r.status)&&!r.github?.number).sort((a:any,b:any)=>String(a.at).localeCompare(String(b.at)));return all.slice(0,max)}
