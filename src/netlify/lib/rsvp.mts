// v1.7.13 guest invitations (owner, 8 Nov 2026, Sydney time: “có link invite để tôi gửi đến gia đình đó để họ tự chọn bao nhiêu
// lớn bao nhiêu trẻ con… reminder… báo bận… chủ yếu khi gửi link vầy là 1 cách để giới thiệu app”; pop-ups: the host family has an
// account, guests answer without one; “chưa chắc” counted as the host chooses; reminders by the guest's own calendar and by the host
// re-sending; deadline and link expiry chosen by the host).
//
// One invitation = one guest group for one or more meals of one family. It lives in a store of its own, keyed by an unguessable
// token (24 random bytes, base64url) that is only ever in the link the host shares. The guest page can read the invitation's own
// public part and answer; nothing else of the family is reachable through it. The family keeps an index of its invitations.
// Records are deleted 30 days after the link expires.
import {randomBytes} from 'node:crypto';
export const RSVP_STATUSES=['yes','maybe','no','busy'] as const;
export const RSVP_MEALS=['breakfast','snackAm','lunch','snack','dinner'];
export const RSVP_KEEP_MS=30*86400000,RSVP_WRITES_PER_DAY=20,RSVP_INDEX_MAX=100;
const ISO_DAY=/^\d{4}-\d{2}-\d{2}$/,TOKEN=/^[A-Za-z0-9_-]{22}(?:[A-Za-z0-9_-]{10})?$/,ID=/^inv-[a-z0-9]{6,40}$/;
const clean=(s:any,max:number)=>String(s??'').replace(/[\u0000-\u001f\u007f<>]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
const count=(v:any)=>Number.isInteger(v)&&v>=0&&v<=30;
// v1.7.14 (owner: “link invite dài quá”): 16 random bytes (128 bits, 22 characters) — still unguessable; links made before (24 bytes) keep working
export const newToken=()=>randomBytes(16).toString('base64url');
export const validToken=(t:any)=>typeof t==='string'&&TOKEN.test(t);
const validTime=(t:any)=>typeof t==='string'&&Number.isFinite(Date.parse(t));

// what the host app sends to create an invitation
export function inviteFromRequest(body:any,now=Date.now()){
 if(!body||typeof body!=='object')return {error:'Invalid invitation.'};
 const meals=Array.isArray(body.meals)?body.meals.slice(0,20):[];
 if(!ID.test(body.inviteId||''))return {error:'Invalid invitation id.'};
 if(!meals.length||!meals.every((m:any)=>m&&ISO_DAY.test(m.date)&&RSVP_MEALS.includes(m.type)))return {error:'Choose the meals.'};
 const guestName=clean(body.guestName,60),host=clean(body.host,60)||'Bếp Nhà';
 if(!guestName)return {error:'Name the guests first.',reason:'name_required'};
 if(!count(body.adults)||!count(body.kids))return {error:'Invalid guest numbers.'};
 if(!validTime(body.deadline)||!validTime(body.expiresAt))return {error:'Choose when guests answer and when the link ends.'};
 const deadline=Date.parse(body.deadline),expires=Date.parse(body.expiresAt),last=Date.parse(meals[meals.length-1].date+'T00:00:00Z');
 if(expires<deadline)return {error:'The link must last until the answer deadline.',reason:'expires_before_deadline'};
 if(expires<now)return {error:'The link would already be closed.',reason:'expired'};
 if(expires>last+9*86400000)return {error:'The link may last at most a week after the meal.',reason:'expires_too_late'};
 const maybe=['full','half','none'].includes(body.maybe)?body.maybe:'full';
 return {invite:{inviteId:body.inviteId,meals:meals.map((m:any)=>({date:m.date,type:m.type})),guestName,host,adults:body.adults,kids:body.kids,deadline:new Date(deadline).toISOString(),expiresAt:new Date(expires).toISOString(),maybe,lang:body.lang==='en'?'en':'vi'}};
}

// the part a guest sees: no family id, no members, no menu
export function publicView(rec:any,now=Date.now()){
 return {host:rec.host,guestName:rec.guestName,meals:rec.meals,adults:rec.adults,kids:rec.kids,deadline:rec.deadline,expiresAt:rec.expiresAt,lang:rec.lang||'vi',
  cancelled:rec.cancelled===true,deadlinePassed:now>Date.parse(rec.deadline),expired:now>Date.parse(rec.expiresAt),response:rec.response||null}
}

// a guest's answer: will come / not sure / can't come; “busy” = can't come any more after saying yes / not sure
export function replyFromRequest(rec:any,body:any,now=Date.now()){
 if(rec.cancelled===true)return {error:'This invitation was withdrawn.',reason:'cancelled',status:410};
 if(now>Date.parse(rec.expiresAt))return {error:'This invitation link has ended.',reason:'expired',status:410};
 if(!body||!RSVP_STATUSES.includes(body.status))return {error:'Choose an answer.',status:400};
 const late=now>Date.parse(rec.deadline);
 if(late&&!['no','busy'].includes(body.status))return {error:'The answer deadline has passed; contact the family directly.',reason:'deadline_passed',status:409};
 if(body.status==='busy'&&!['yes','maybe'].includes(rec.response?.status))return {error:'Nothing to cancel yet.',reason:'not_coming_yet',status:409};
 const coming=body.status==='yes'||body.status==='maybe';
 if(coming&&(!count(body.adults)||!count(body.kids)||body.adults+body.kids<1))return {error:'How many adults and children?',reason:'numbers',status:400};
 const writes=(rec.writes||[]).filter((t:number)=>now-t<86400000);
 if(writes.length>=RSVP_WRITES_PER_DAY)return {error:'Too many changes today. Please contact the family.',reason:'rate_limited',status:429};
 const response={status:body.status,adults:coming?body.adults:0,kids:coming?body.kids:0,note:clean(body.note,200),at:new Date(now).toISOString(),...(body.status==='busy'&&rec.response?.status?{was:rec.response.status}:{})};
 return {record:{...rec,response,writes:[...writes,now]}};
}
export const forgettable=(rec:any,now=Date.now())=>!rec||now>Date.parse(rec.expiresAt)+RSVP_KEEP_MS;

// the push the family gets when a guest answers
export function replyMessage(rec:any){const r=rec.response,n=(vi:boolean)=>[r.adults?(vi?`${r.adults} lớn`:`${r.adults} adult${r.adults>1?'s':''}`):'',r.kids?(vi?`${r.kids} bé`:`${r.kids} child${r.kids>1?'ren':''}`):''].filter(Boolean).join(', ');
 const vi={yes:`Sẽ đến: ${n(true)}`,maybe:`Chưa chắc: ${n(true)}`,no:'Không đến được',busy:'Bận đột xuất, không đến được nữa'}[r.status as string],en={yes:`Coming: ${n(false)}`,maybe:`Not sure: ${n(false)}`,no:"Can't come",busy:'Something came up, no longer coming'}[r.status as string];
 return {type:r.status==='busy'?'urgent':'attendance',title:rec.guestName+' trả lời lời mời',enTitle:rec.guestName+' answered your invitation',body:vi+(r.note?' · '+r.note:''),enBody:en+(r.note?' · '+r.note:''),url:'/#today',tag:'rsvp-'+rec.inviteId}}
