// v1.7.1 Studio · Urgent message delivery reasons. Metadata only: the message text is never read into a
// response here (fields are picked explicitly). Shared by family.mts (what is stored with each alert),
// lib/studio.mts (the overview's per-family alert rows) and functions/studio.mts (ops `urgent`, `urgent-family`).
import {deviceBelongs,urgentBypasses} from './push.mjs';

const DAY=86400000,WINDOW_DAYS=30,PENDING_MS=15*60000,MAX_ALERTS=300;
export const DETAIL_KEYS=['recipients','devices','selected','accepted','failed','expired','suppressed','needsResubscribe','typeOff','quiet'] as const;
const int=(v:any)=>Number.isFinite(+v)&&+v>=0?Math.round(+v):null;
const pick=(d:any)=>{if(!d||typeof d!=='object')return null;const out:any={};for(const k of DETAIL_KEYS){const v=int(d[k]);if(v!==null)out[k]=v}return Object.keys(out).length?out:null};

/** What family.mts stores with an alert after the push fan-out (counts only; target member ids are already on the record). */
export function pushDetailOf(result:any,targets:any[]=[]){return{v:1,recipients:Array.isArray(targets)?targets.length:0,devices:int(result?.devices),selected:int(result?.recipients)??0,accepted:int(result?.accepted)??0,failed:int(result?.failed)??0,expired:int(result?.expired)??0,suppressed:int(result?.suppressed)??0,needsResubscribe:int(result?.needsResubscribe)??0,typeOff:int(result?.typeOff)??0,quiet:int(result?.quiet)??0}}

/** One overview row per stored alert (lib/studio.mts scanFamily). Keeps the v1.7 fields; adds time, reason and counts. */
export function alertRow(a:any){return{day:String(a?.createdAt||'').slice(0,10),pushStatus:a?.pushStatus||'unknown',accepted:a?.pushAccepted||0,targets:(a?.targets||[]).length,id:typeof a?.id==='string'?a.id.slice(0,100):null,at:typeof a?.createdAt==='string'?a.createdAt:null,reason:typeof a?.pushReason==='string'?a.pushReason.slice(0,40):null,detail:pick(a?.pushDetail)}}

/** sent | failed | pending | unknown, plus the reason code shown to the owner. */
export function classify(a:any,now:number){const t=Date.parse(a?.at||a?.createdAt||a?.day||'');const s=a?.pushStatus;
 if(s==='accepted')return{status:'sent',reason:'sent'};
 if(s==='not_sent')return{status:'failed',reason:a?.reason||a?.pushReason||'unknown'};
 if(s==='pending'||s==='retrying')return{status:'pending',reason:t&&now-t>PENDING_MS?'unfinished':'pending'};
 return{status:'unknown',reason:a?.reason||a?.pushReason||'unknown'}}

/** List for every Studio read role: family name, time, counts, status and reason — no member names, no text. */
export function urgentList(o:any,names:Map<string,string>,{now=Date.now(),failedOnly=false,familyId='',page=1,size=25}:any={}){
 const from=now-WINDOW_DAYS*DAY,all:any[]=[],fams=new Map<string,any>();
 for(const [id,p] of Object.entries(o?.perFamily||{}) as any){for(const a of p?.alertRows||[]){const t=Date.parse(a.at||a.day||'');if(!t||t<from||t>now+DAY)continue;
  const c=classify(a,now),f=fams.get(id)||{id,name:names.get(id)||'—',total:0,failed:0};f.total++;if(c.status==='failed')f.failed++;fams.set(id,f);
  if(familyId&&id!==familyId)continue;all.push({id:a.id||null,familyId:id,family:names.get(id)||'—',at:a.at||a.day,dateOnly:!a.at,t,status:c.status,reason:c.reason,recipients:a.targets??null,accepted:a.accepted||0,detail:a.detail||null})}}
 all.sort((x,y)=>y.t-x.t);
 const totals={total:all.length,sent:0,failed:0,pending:0,unknown:0} as any,reasons:any={};
 for(const r of all){totals[r.status]++;if(r.status==='failed'||r.reason==='unfinished')reasons[r.reason]=(reasons[r.reason]||0)+1}
 const rows=failedOnly?all.filter(r=>r.status==='failed'||r.reason==='unfinished'):all,sz=Math.min(100,Math.max(5,+size||25)),pg=Math.max(1,Math.min(Math.ceil(rows.length/sz)||1,+page||1));
 return{days:WINDOW_DAYS,from:new Date(from).toISOString(),computedAt:o?.computedAt||null,totals,reasons:Object.entries(reasons).map(([reason,count])=>({reason,count})).sort((a:any,b:any)=>b.count-a.count),
  families:[...fams.values()].sort((a,b)=>b.failed-a.failed||b.total-a.total),total:rows.length,page:pg,size:sz,rows:rows.slice((pg-1)*sz,pg*sz).map(({t,...r})=>r)}}

async function keys(store:any,prefix:string,max:number){const out:string[]=[];for await(const page of store.list({prefix,paginate:true})){for(const b of page.blobs){out.push(b.key);if(out.length>=max)return out}}return out}
const readJSON=async(store:any,k:string)=>{try{return await store.get(k,{type:'json'})}catch{return null}};

/** Owner-only drill-down for one family (the caller checks the role and writes the audit entry). Fresh from storage:
 *  sender display name, recipient display names, and each recipient's devices as they are now. Never the text. */
export async function urgentFamily(root:any,f:any,{now=Date.now()}:any={}){
 const prefix='households/'+f.id+'/',from=now-WINDOW_DAYS*DAY;
 const [alertKeys,deviceKeys,state]=await Promise.all([keys(root,prefix+'family-alert/',MAX_ALERTS),keys(root,prefix+'push/subscriptions/',500),readJSON(root,prefix+'state')]);
 const read=async(list:string[])=>{const out:any[]=[];for(let i=0;i<list.length;i+=8)out.push(...await Promise.all(list.slice(i,i+8).map(k=>readJSON(root,k))));return out.filter(Boolean)};
 const [alerts,devices]=await Promise.all([read(alertKeys),read(deviceKeys)]);
 const members=new Map<string,string>((Array.isArray(state?.members)?state.members:[]).filter((m:any)=>m&&typeof m.id==='string').map((m:any)=>[m.id,String(m.name||'').slice(0,80)]));
 const byMember=new Map<string,any>();
 for(const d of devices){if(typeof d?.memberId!=='string')continue;const m=byMember.get(d.memberId)||{devices:0,ready:0,needsResubscribe:0,urgentOff:0,quietNoBypass:0,inactive:0};m.devices++;
  if(!deviceBelongs(d,f.members||null))m.inactive++;else if(d.needsResubscribe===true)m.needsResubscribe++;else if(d.types?.urgent===false)m.urgentOff++;else{m.ready++;if(!urgentBypasses(d))m.quietNoBypass++}byMember.set(d.memberId,m)}
 const none={devices:0,ready:0,needsResubscribe:0,urgentOff:0,quietNoBypass:0,inactive:0};
 const rows=alerts.map(a=>({a,t:Date.parse(a.createdAt||'')})).filter(x=>x.t&&x.t>=from).sort((x,y)=>y.t-x.t).map(({a})=>{const row=alertRow(a),c=classify(row,now),targets=Array.isArray(a.targets)?a.targets.filter((x:any)=>typeof x==='string'):[];
  return{id:row.id,at:row.at,status:c.status,reason:c.reason,detail:row.detail,sender:String(a.fromName||members.get(a.fromId)||'—').slice(0,80),readCount:targets.filter((id:string)=>a.readBy?.[id]).length,
   recipients:targets.map((id:string)=>({name:members.get(id)||'—',known:members.has(id),now:byMember.get(id)||none}))}});
 return{family:{id:f.id,name:f.name},days:WINDOW_DAYS,rows}}
