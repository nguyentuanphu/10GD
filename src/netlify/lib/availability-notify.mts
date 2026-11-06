// v1.7.3 family calendar (owner request): when someone saves or clears busy/away entries, the rest of the family gets one
// push at once. Triggered on the server by the family-state write itself (op=state PUT, merging clients): the change is
// the difference between the stored copy and the new copy, so the text is built only from family data (member names,
// meals, dates, the entry's own portion flag) — never from client-supplied message text — and works with the automatic
// sync merge (a merged write only differs from the stored copy by this device's own changes).
// v1.7.9: a changed time (from / to) also counts as a change.
// Rules: category "calendar" (Availability & portions) — a device that turned it off gets nothing; quiet hours apply (not
// urgent); never sent to the reporter (entry.by) or the account's own member; one notification per save (all days and
// meals batched); the same change is announced once per day (dedupe key), with at most MAX_PER_DAY notices per family per
// day; only today and future dates; only status / portion changes (a note-only edit or re-saving identical entries is quiet).
import {createHash} from 'node:crypto';
import {sendPushBatch,sydneyClock,pushKeys} from './push.mjs';
const MEALS=['breakfast','snackAm','lunch','snack','dinner'];
const WORD:any={vi:{breakfast:'sáng',snackAm:'phụ sáng',lunch:'trưa',snack:'phụ',dinner:'tối'},en:{breakfast:'breakfast',snackAm:'morning snack',lunch:'lunch',snack:'snack',dinner:'dinner'}};
export const AVAILABILITY_MAX_PER_DAY=20;
const isObj=(x:any)=>!!x&&typeof x==='object'&&!Array.isArray(x);
const validEntry=(e:any)=>isObj(e)&&['away','busy'].includes(e.status)&&typeof e.deduct==='boolean';
// Plain text for a notification: no control characters or angle brackets, collapsed spaces, bounded length.
export const cleanText=(s:any,n=40)=>Array.from(String(s??'').replace(/[\u0000-\u001f\u007f<>]/g,' ').replace(/\s+/g,' ').trim()).slice(0,n).join('');
// v1.7.9: optional reported times ("HH:MM", Sydney time) are part of the message
const HHMM=/^([01]\d|2[0-3]):[0-5]\d$/;
const timeOf=(e:any)=>({f:typeof e?.from==='string'&&HHMM.test(e.from)?e.from:'',t:typeof e?.to==='string'&&HHMM.test(e.to)?e.to:''});
const timeText=(x:{f:string,t:string},lang:'vi'|'en')=>x.f&&x.t?x.f+'–'+x.t:x.f?(lang==='vi'?'từ ':'from ')+x.f:x.t?(lang==='vi'?'đến ':'until ')+x.t:'';
const dm=(date:string)=>{const [,m,d]=date.split('-');return (+d)+'/'+(+m)};
export type AvailabilityChange={memberId:string,date:string,type:string,before:any,after:any};
// Entries whose status or portion flag changed (added, changed or cleared) on or after `from`.
export function availabilityChanges(prev:any,next:any,{from}:{from:string}):AvailabilityChange[]{
 const out:AvailabilityChange[]=[],a=isObj(prev?.availability)?prev.availability:{},b=isObj(next?.availability)?next.availability:{},members=new Set((next?.members||[]).map((m:any)=>m?.id));
 for(const memberId of new Set([...Object.keys(a),...Object.keys(b)])){if(!members.has(memberId))continue;const da=isObj(a[memberId])?a[memberId]:{},db=isObj(b[memberId])?b[memberId]:{};
  for(const date of new Set([...Object.keys(da),...Object.keys(db)])){if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date<from)continue;
   for(const type of MEALS){const x=validEntry(da[date]?.[type])?da[date][type]:null,y=validEntry(db[date]?.[type])?db[date][type]:null;if(!x&&!y)continue;if(x&&y&&x.status===y.status&&x.deduct===y.deduct&&timeOf(x).f===timeOf(y).f&&timeOf(x).t===timeOf(y).t)continue;out.push({memberId,date,type,before:x,after:y})}}}
 return out.sort((p,q)=>p.date<q.date?-1:p.date>q.date?1:MEALS.indexOf(p.type)-MEALS.indexOf(q.type)||(p.memberId<q.memberId?-1:1))}
// One message for one save. Groups by member, reporter and outcome; meals and dates are batched.
export function availabilityMessage(changes:AvailabilityChange[],state:any,{accountMemberId=null}:{accountMemberId?:string|null}={}){
 if(!changes.length)return null;const members=state?.members||[],name=(id:string)=>cleanText(members.find((m:any)=>m.id===id)?.name||'?'),known=(id:any)=>typeof id==='string'&&members.some((m:any)=>m.id===id);
 const groups:any[]=[];
 for(const c of changes){const reporter=known(c.after?.by)?c.after.by:known(accountMemberId)?accountMemberId:c.memberId,kind=c.after?c.after.status:'clear',noPortion=!!c.after?.deduct,time=timeOf(c.after),key=[c.memberId,reporter,kind,noPortion,time.f,time.t].join('|');let g=groups.find(x=>x.key===key);if(!g){g={key,memberId:c.memberId,reporter,kind,noPortion,time,slots:[]};groups.push(g)}g.slots.push(c)}
 const meals=(g:any,lang:'vi'|'en')=>{const types=MEALS.filter(t=>g.slots.some((s:any)=>s.type===t)),dates=(t:string)=>{const list=g.slots.filter((s:any)=>s.type===t).map((s:any)=>dm(s.date));return list.length>4?list.slice(0,4).join(', ')+' +'+(list.length-4):list.join(', ')};
  if(types.length===1)return (lang==='vi'?'bữa ':'')+WORD[lang][types[0]]+' '+dates(types[0]);return types.map(t=>WORD[lang][t]+' '+dates(t)).join(' · ')};
 const line=(g:any,lang:'vi'|'en')=>{const who=name(g.memberId),by=g.reporter!==g.memberId?name(g.reporter):null,m=meals(g,lang);
  if(lang==='vi'){if(g.kind==='clear')return (by?by+' xóa lịch của '+who+': ':who+' xóa lịch ')+m;const tv=timeText(g.time,'vi'),what=(g.kind==='away'?'vắng ':'bận ')+m+(tv?' '+tv:'')+' — '+(g.noPortion?'không nấu phần':'vẫn nấu phần');return by?by+' báo hộ '+who+': '+what:who+' báo '+what}
  if(g.kind==='clear')return (by?by+' cleared '+who+'’s ':who+' cleared ')+m;const te=timeText(g.time,'en'),what=(g.kind==='away'?'away ':'busy ')+(m.includes(' · ')?'':'for ')+m+(te?' '+te:'')+' — '+(g.noPortion?'no portion':'still cooking their portion');return by?by+' on behalf of '+who+': '+what:who+' '+what};
 const shown=groups.slice(0,4),more=groups.length-shown.length,names=[...new Set(groups.map(g=>name(g.memberId)))],who=names.slice(0,2).join(', ')+(names.length>2?' +'+(names.length-2):'');
 const body=(lang:'vi'|'en')=>shown.map(g=>line(g,lang)).join('\n')+(more?'\n+'+more+(lang==='vi'?' thay đổi khác':' more changes'):'');
 const signature=changes.map(c=>[c.memberId,c.date,c.type,c.after?c.after.status:'clear',!!c.after?.deduct,timeOf(c.after).f,timeOf(c.after).t].join(':')).join(',');
 return{title:'Lịch gia đình: '+who,enTitle:'Family calendar: '+who,body:body('vi'),enBody:body('en'),reporters:[...new Set(groups.map(g=>g.reporter))],signature}}
// Called after a successful family-state write. Never throws.
export async function notifyAvailabilityChange(store:any,prev:any,next:any,{accountMemberId=null,now=new Date(),subject,send,maxPerDay=AVAILABILITY_MAX_PER_DAY}:{accountMemberId?:string|null,now?:Date,subject?:string,send?:any,maxPerDay?:number}={}):Promise<any>{
 try{if(!isObj(prev)||!isObj(next))return{reason:'no_change'};
  const clock=sydneyClock(now,next.preferences?.timezone),changes=availabilityChanges(prev,next,{from:clock.date});if(!changes.length)return{reason:'no_change'};
  const message=availabilityMessage(changes,next,{accountMemberId});if(!message)return{reason:'no_change'};
  const skip=new Set([...message.reporters,...(accountMemberId?[accountMemberId]:[])]),targets=(next.members||[]).map((m:any)=>m.id).filter((id:any)=>typeof id==='string'&&!skip.has(id));
  if(!targets.length)return{reason:'no_recipient',changes:changes.length};
  if(!await pushKeys(store))return{reason:'not_configured',changes:changes.length};
  const key=createHash('sha256').update(clock.date+'|'+message.signature).digest('hex'),marker='push/availability/'+key;
  const claim=await store.setJSON(marker,{at:now.toISOString()},{onlyIfNew:true});if(!claim.modified)return{reason:'duplicate',key};
  let slot:string|null=null;for(let n=0;n<maxPerDay;n++){const k='push/availability-daily/'+clock.date+'/'+n,c=await store.setJSON(k,{at:now.toISOString()},{onlyIfNew:true});if(c.modified){slot=k;break}}
  if(!slot)return{reason:'daily_limit',key};
  const result=await sendPushBatch(store,{type:'calendar',title:message.title,enTitle:message.enTitle,body:message.body,enBody:message.enBody,url:'/#today',tag:'family-calendar-'+key.slice(0,16)},{targets,subject,family:next,now,...(send?{send}:{})});
  // Nothing delivered: free the daily slot; a delivery failure may be retried by the next identical save.
  if(!result.accepted){try{await store.delete(slot);if(result.reason==='delivery_failed')await store.delete(marker)}catch{}}
  return{...result,key,targets}}
 catch(e:any){console.warn('Availability notice failed',e?.name);return{reason:'error'}}}
