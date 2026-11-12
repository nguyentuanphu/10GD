// v1.7.18 “Gửi chữ hoá đơn để sửa cách đọc” (owner decision, 12 Nov 2026, Sydney time; plan docs/plans/receipts-v1.7.19-20261112.md A).
// After a family corrects what the receipt reader got wrong, one tap sends the receipt TEXT so the reader can learn that layout
// (each report becomes a text fixture + test). Sent only on the family's tap, never the photo.
//
// What is kept (store "bep-receipt-reports"):
//   r/<id>                          one report: the receipt text with payment / card / bank / member / terminal / receipt numbers
//                                   and people's phone numbers removed ON THE PHONE (and checked again here), the reader's lines
//                                   (name / qty / unit / price), the family's corrected lines, store, retailer id, date, total,
//                                   app build, language, reading confidence, warning codes, a read-vs-corrected diff, status.
//   once/<reporterKey>/<clientId>   {id,at}  the same report sent twice is stored once (30 days)
//   rate/<kind>/<day>/<key>         counters (per reporter, per network address hash), pruned after 2 days
// The reporter is kept only as a one-way key (account or device) plus whether an account sent it — no username, family,
// email, IP address or photo. Reports are deleted 180 days after they arrive (daily cleanup, functions/feedback-cleanup.mts),
// or earlier by the Studio owner on request (quote the code shown after sending).
import {createHash,randomBytes} from 'node:crypto';
import {editRecord} from './accounts.mjs';

const REGION={consistency:'strong',region:'ap-southeast-2'} as const;
export const receiptReportStore=(getStoreFn:any)=>getStoreFn({name:'bep-receipt-reports',...REGION});
const DAY=86400000;
export const RR_LIMITS={bytes:40000,text:20000,lines:150,name:120,unit:16,store:80,perReporterMinute:3,perReporterDay:20,perIpDay:60,keepDays:180,onceDays:30,listMax:2000};
export const RR_STATUSES=['new','test-added','ignored'] as const;
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const dayOf=(ms:number)=>new Date(ms).toISOString().slice(0,10);
const fail=(vi:string,en:string,status=400,code?:string):never=>{throw Object.assign(Error(vi),{status,en,...(code?{code}:{})})};
const ID_RE=/^[a-f0-9]{18}$/;
async function readJSON(store:any,key:string){try{return await store.get(key,{type:'json'})}catch{return null}}
async function keysOf(store:any,prefix:string,cap=20000){const out:string[]=[];for await(const page of store.list({prefix,paginate:true})){for(const b of page.blobs)out.push(b.key);if(out.length>=cap)break}return out}
async function pool<T,R>(items:T[],n:number,fn:(x:T)=>Promise<R>){const out:R[]=new Array(items.length);let i=0;await Promise.all(Array.from({length:Math.min(n,items.length)},async()=>{while(i<items.length){const j=i++;out[j]=await fn(items[j])}}));return out}

// ---------- second check of what the phone removed (the phone already did this; nothing sensitive should arrive) ----------
// Same rules as the app (receipt-parse.ts isSensitive + receipt-share.ts): card / AID / ARQC / TVR / terminal / approval /
// bank / account / reference lines, membership and loyalty numbers, receipt / transaction / invoice numbers, staff names.
const PAY_LINE=/\b(card\s*(no|num(ber)?|#)|aid\b|tvr\b|tsi\b|atc\b|arqc|arpc|terminal|term(inal)?\s*id|merch(ant)?\s*(id|no)\b|reference|ref\s*(no|#|:)|auth(ori[sz]ation)?\s*(code|no)?|approv(ed|al)\s*(code|no|#)?|pan\s*seq|account\s*(no|type)?|acct|bsb\b|stan\b|rrn\b|trans(action)?\s*(no|#|id|\d)|receipt\s*(no|#|:)|invoice\s*(no|#)|docket\s*(no|#)|register\s*:|served\s*by|store\s*manager|manager\s*:|cashier|operator|signature|surname|customer\s*(name|no|#|:)|commonwealth bank|westpac|anz\b|nab\b|st george|visa|mastercard|master card|amex|eftpos)/i;
const MEMBER_LINE=/\b(member(ship)?|loyalty|rewards?|flybuys|goldstar|points?\s*card|club\s*(no|card|#))\b.*(\d[\s-]?){5,}/i;
const MOBILE=/(?:\+?61[\s-]?4|\b04)\d{2}[\s-]?\d{3}[\s-]?\d{3}\b/g;
const LANDLINE=/(?:\(0[2378]\)|\b0[2378])[\s-]?\d{4}[\s-]?\d{4}\b/g;
const EMAIL=/[\w.+-]+@[\w-]+(\.[\w-]+)+/g;
const SHOP_LABEL=/\b(ph|phone|tel|t)\b\W*$/i;
const ABN_NO=/\bA\.?B\.?N\b[\s:.-]*\d{2}\s?\d{3}\s?\d{3}\s?\d{3}/gi;
// digits that count towards a long number: the shop's ABN and the shop phone printed after Ph / Tel are public, not counted
const longDigits=(s:string)=>/\d{10,}/.test(s.replace(ABN_NO,' ').replace(LANDLINE,(m:string,o:number,all:string)=>SHOP_LABEL.test(all.slice(0,o))?' ':m).replace(/\s+/g,''));
/** true when the line must never be kept (payment, card, bank, membership, receipt number, staff). */
export function sensitiveLine(line:any){const s=String(line??'');if(/\bA\.?B\.?N\b/i.test(s)&&!/card|acct|account|member|\baid\b|tvr|arqc|terminal/i.test(s)&&!longDigits(s))return false;/* the shop's ABN is public */
 
 return PAY_LINE.test(s)||MEMBER_LINE.test(s)||/[x*]{4}[\s-]*[x*]{4}/i.test(s)||longDigits(s)&&!/\d[.,]\d{2}\s*[A-Z]?\s*$/.test(s)||/\b[0-9A-F]{10,}\b/.test(s)||/\d{3,4}\/\d{3}\/\d{3}\/\d{3}/.test(s)||/^\W*[x*]{2,}\d{3,4}\b/i.test(s)||/\b(TRANS|POS)\s*\d+/i.test(s)||/\b(no|nr|number|#)\s*[:.#]?\s*[A-Z]{1,3}\d{6,}\b/i.test(s)}
/** Masks what may stay on a kept line: people's mobile numbers, e-mail, landlines not labelled as the shop's, digit runs ≥ 9. */
export function maskLine(line:any){let s=String(line??'');s=s.replace(EMAIL,'[email]').replace(MOBILE,'[phone]').replace(LANDLINE,(m:string,o:number,all:string)=>SHOP_LABEL.test(all.slice(0,o))?m:'[phone]');
 /* item lines (ending in a price) keep their item codes; a card-length number is masked anywhere */
 const priced=/\d[.,]\d{2}\s*[A-Z]?\s*$/.test(s);return s.replace(/\d{9,}/g,m=>/\bA\.?B\.?N\b/i.test(s)&&m.length===11||priced&&m.length<14?m:'#'.repeat(Math.min(m.length,12)))}
export function serverRedact(text:any){const lines=String(text??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').split(/\r?\n/);let removed=0;const kept:string[]=[];
 for(const l of lines){if(sensitiveLine(l)){removed++;continue}kept.push(maskLine(l).slice(0,200))}
 return{text:kept.join('\n').slice(0,RR_LIMITS.text),removed}}

// ---------- the report as it is kept (every field checked) ----------
const txt=(v:any,n:number)=>typeof v==='string'?v.replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,n):'';
const num=(v:any,lo:number,hi:number)=>typeof v==='number'&&Number.isFinite(v)&&v>=lo&&v<=hi?Math.round(v*1000)/1000:null;
const isoDate=(v:any)=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)?v:null;
function cleanLines(v:any){if(!Array.isArray(v))return null;return v.slice(0,RR_LIMITS.lines).map((x:any)=>{const raw=txt(x?.name,RR_LIMITS.name);return{name:sensitiveLine(raw)?'':maskLine(raw),qty:num(x?.qty,0,1e6),unit:txt(x?.unit,RR_LIMITS.unit),price:num(x?.price,-1e6,1e6)}}).filter((x:any)=>x.name||x.price!=null)}
function cleanSide(v:any){if(!v||typeof v!=='object')return null;const lines=cleanLines(v.lines);if(!lines)return null;const store=txt(v.store,RR_LIMITS.store);
 return{store:sensitiveLine(store)?'':maskLine(store),date:isoDate(v.date),total:num(v.total,-1e6,1e6),lines}}
export function cleanReceiptReport(b:any,now:number){
 if(!b||typeof b!=='object')return null;const clientId=/^[A-Za-z0-9_-]{16,64}$/.test(b.clientId||'')?b.clientId:null;if(!clientId)return null;
 if(typeof b.text!=='string'||b.text.trim().length<3)return null;
 const read=cleanSide(b.read),corrected=cleanSide(b.corrected);if(!read||!corrected||!corrected.lines.length&&!read.lines.length)return null;
 const red=serverRedact(b.text);
 return{clientId,text:red.text,serverRemoved:red.removed,phoneRemoved:Number.isInteger(b.removed)&&b.removed>=0&&b.removed<1000?b.removed:0,read,corrected,
  retailer:/^[a-z0-9-]{1,30}$/.test(String(b.retailer||''))?String(b.retailer):null,
  source:['photo','saved','text'].includes(b.source)?b.source:'photo',
  build:/^\d{8}T\d{6}Z-[a-f0-9]{6,20}$/.test(String(b.build||''))?String(b.build):null,edition:Number.isInteger(b.edition)&&b.edition>=0&&b.edition<1000?b.edition:null,
  lang:b.lang==='en'?'en':'vi',confidence:num(b.confidence,0,100),
  warnings:(Array.isArray(b.warnings)?b.warnings:[]).filter((w:any)=>typeof w==='string'&&/^[a-z-]{2,20}$/.test(w)).slice(0,12),
  clientAt:Number.isFinite(b.clientAt)&&Math.abs(b.clientAt-now)<45*DAY?new Date(b.clientAt).toISOString():null}}

// ---------- read vs corrected (for Studio: what the family had to change) ----------
const normName=(s:string)=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const near=(a:any,b:any)=>a==null&&b==null||a!=null&&b!=null&&Math.abs(a-b)<0.005;
/** Pairs the reader's lines with the family's: same name first, then same price in order, then by position. */
export function diffLines(read:any[],corrected:any[]){
 const used=new Set<number>(),pair:number[]=corrected.map(()=>-1);
 corrected.forEach((c,i)=>{const n=normName(c.name);const j=read.findIndex((r,k)=>!used.has(k)&&n&&normName(r.name)===n);if(j>=0){used.add(j);pair[i]=j}});
 corrected.forEach((c,i)=>{if(pair[i]>=0||c.price==null)return;const j=read.findIndex((r,k)=>!used.has(k)&&near(r.price,c.price));if(j>=0){used.add(j);pair[i]=j}});
 corrected.forEach((c,i)=>{if(pair[i]>=0)return;if(i<read.length&&!used.has(i)){used.add(i);pair[i]=i}});
 const rows:any[]=[];
 corrected.forEach((c,i)=>{const j=pair[i];if(j<0){rows.push({kind:'added',read:null,corrected:c,at:i});return}const r=read[j];
  const kinds=[normName(r.name)!==normName(c.name)?'name':'',!near(r.price,c.price)?'price':'',!near(r.qty,c.qty)||String(r.unit||'')!==String(c.unit||'')?'qty':''].filter(Boolean);
  rows.push({kind:kinds.length?kinds.join('+'):'same',read:r,corrected:c,at:i})});
 read.forEach((r,k)=>{if(!used.has(k))rows.push({kind:'removed',read:r,corrected:null,at:k+0.5})});
 rows.sort((a,b)=>a.at-b.at);for(const r of rows)delete r.at;
 return{rows,changed:rows.filter(r=>r.kind!=='same').length}}
function summaryOf(read:any,corrected:any){const d=diffLines(read.lines,corrected.lines);const head=['store','date','total'].filter(k=>k==='total'?!near(read[k],corrected[k]):String(read[k]||'')!==String(corrected[k]||''));return{diff:d.rows,changedLines:d.changed,changedFields:head}}

async function bump(store:any,key:string,max:number,now:number,ttl:number){let over=false;await editRecord(store,key,(n:any)=>{const c=n?.count||0;if(c>=max){over=true;return undefined}return{count:c+1,expires:now+ttl}});return !over}
const newId=()=>randomBytes(9).toString('hex');

/** A report from the app (account or device-only). Returns {status, body}. */
export async function submitReceiptReport(getStoreFn:any,{body,who,account=false,ip='',now=Date.now()}:any){
 if(!who)return{status:400,body:{error:'Thiếu mã thiết bị.',errorEn:'Missing device token.'}};
 const r=cleanReceiptReport(body,now);if(!r)return{status:400,body:{error:'Dữ liệu hoá đơn chưa hợp lệ.',errorEn:'The receipt report is not valid.',code:'invalid'}};
 const S=receiptReportStore(getStoreFn),onceKey=`once/${who}/${r.clientId}`,old=await readJSON(S,onceKey);
 if(old?.id)return{status:200,body:{ok:true,id:old.id,duplicate:true}};
 const day=dayOf(now),ipKey=ip?sha('ip:'+ip+':'+day).slice(0,24):'none';
 if(!await bump(S,`rate/m/${day}/${who}:${Math.floor(now/60000)}`,RR_LIMITS.perReporterMinute,now,2*60000)||!await bump(S,`rate/d/${day}/${who}`,RR_LIMITS.perReporterDay,now,2*DAY)||!await bump(S,`rate/i/${day}/${ipKey}`,RR_LIMITS.perIpDay,now,2*DAY))
  return{status:429,body:{error:'Đã gửi nhiều hoá đơn hôm nay. Thử lại sau.',errorEn:'Many receipts were sent today. Try again later.',code:'rate'}};
 const id=newId(),at=new Date(now).toISOString();
 const claim=await S.setJSON(onceKey,{id,at:now},{onlyIfNew:true});if(claim&&claim.modified===false){const again=await readJSON(S,onceKey);return{status:200,body:{ok:true,id:again?.id||id,duplicate:true}}}
 const {clientId,...kept}=r;
 const rec={id,at,status:'new',...kept,...summaryOf(r.read,r.corrected),reporter:{key:who,account:!!account},history:[{at,by:'reporter',action:'created'}],updatedAt:at};
 await S.setJSON('r/'+id,rec);
 return{status:201,body:{ok:true,id},record:rec};
}

// ---------- Studio ----------
const rowOf=(r:any)=>({id:r.id,at:r.at,status:r.status,store:r.corrected?.store||r.read?.store||'',retailer:r.retailer,date:r.corrected?.date||r.read?.date||null,readCount:r.read?.lines?.length||0,correctedCount:r.corrected?.lines?.length||0,changedLines:r.changedLines||0,changedFields:r.changedFields||[],lang:r.lang,source:r.source,account:!!r.reporter?.account});
export async function listReceiptReports(getStoreFn:any,{status='',page=1,size=25}:any={}){
 const S=receiptReportStore(getStoreFn),keys=await keysOf(S,'r/',RR_LIMITS.listMax);
 const all=(await pool(keys,16,(k:string)=>readJSON(S,k))).filter(Boolean).map(rowOf).sort((a:any,b:any)=>String(b.at).localeCompare(String(a.at)));
 const counts:any={};for(const s of RR_STATUSES)counts[s]=0;for(const r of all)counts[r.status]=(counts[r.status]||0)+1;
 const rows=all.filter((r:any)=>!status||r.status===status);const sz=Math.min(100,Math.max(5,+size||25)),pg=Math.max(1,Math.min(Math.ceil(rows.length/sz)||1,+page||1));
 return{total:rows.length,all:all.length,counts,page:pg,size:sz,rows:rows.slice((pg-1)*sz,pg*sz)}}
export async function receiptReportDetail(getStoreFn:any,id:any){if(!ID_RE.test(String(id||'')))fail('Mã không hợp lệ.','Invalid id.');const r=await readJSON(receiptReportStore(getStoreFn),'r/'+id);if(!r)fail('Không tìm thấy hoá đơn gửi về.','Receipt report not found.',404);
 return{...r,reporter:{account:!!r.reporter?.account}}}
export async function setReceiptReportStatus(getStoreFn:any,id:any,status:any,actor:string,now:number){if(!ID_RE.test(String(id||'')))fail('Mã không hợp lệ.','Invalid id.');if(!RR_STATUSES.includes(status))fail('Trạng thái không hợp lệ.','Invalid status.');
 const at=new Date(now).toISOString();let from:any=null;
 await editRecord(receiptReportStore(getStoreFn),'r/'+id,(r:any)=>{if(!r)fail('Không tìm thấy hoá đơn gửi về.','Receipt report not found.',404);if(r.status===status)return undefined;from=r.status;return{...r,status,updatedAt:at,history:[...(r.history||[]),{at,by:actor,action:'status',from:r.status,to:status}].slice(-50)}});
 return{detail:await receiptReportDetail(getStoreFn,id),from}}
export async function deleteReceiptReport(getStoreFn:any,id:any){if(!ID_RE.test(String(id||'')))fail('Mã không hợp lệ.','Invalid id.');const S=receiptReportStore(getStoreFn);if(!await readJSON(S,'r/'+id))fail('Không tìm thấy hoá đơn gửi về.','Receipt report not found.',404);await S.delete('r/'+id);return{deleted:id}}

// ---------- housekeeping (daily, with the feedback cleanup) ----------
export async function pruneReceiptReports(getStoreFn:any,now=Date.now(),max=20000){const S=receiptReportStore(getStoreFn),cutoff=new Date(now-RR_LIMITS.keepDays*DAY).toISOString(),rateDay=dayOf(now-2*DAY);let removed=0;
 for(const k of await keysOf(S,'rate/',max)){const d=k.split('/')[2]||'';if(d<rateDay){await S.delete(k);removed++}}
 for(const k of await keysOf(S,'r/',max)){const r=await readJSON(S,k);if(!r||String(r.at||'')<cutoff){await S.delete(k);removed++}}
 for(const k of await keysOf(S,'once/',max)){const x=await readJSON(S,k);if(!x?.at||x.at<now-RR_LIMITS.onceDays*DAY){await S.delete(k);removed++}}
 return{removed,cutoff}}
