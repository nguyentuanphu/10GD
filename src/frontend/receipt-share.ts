'use strict';
// v1.7.18 “Gửi chữ hoá đơn để sửa cách đọc” (owner decision, 12 Nov 2026, Sydney time; plan docs/plans/receipts-v1.7.19-20261112.md A).
// After the family corrects what the reader got wrong (lines, prices, names, store, date, total) — in the receipt sheet right
// after a photo, or later from a saved receipt — a secondary button opens a preview of EXACTLY what would be sent: the text read
// from the photo with sensitive lines removed on this phone, the reader's lines, the family's corrected lines, store, retailer
// id, date, total, app build and language. Never the photo. Nothing is sent until the family taps “Gửi”.
// Removed on the phone before the preview (and checked again by the server, lib/receipt-reports.mts): card / PAN / AID / ARQC /
// TVR / terminal / approval / bank / account lines (ReceiptParse.isSensitive), membership and loyalty numbers (“Goldstar
// 79354396400”), receipt / transaction / invoice numbers (“No: P2611070038”), staff names, people's phone numbers and e-mail.
// The shop's ABN and address are public and stay. Server op: feedback?op=receipt-report (Studio → Hoá đơn gửi về).
(function(){
const root:any=globalThis as any;const RP=root.ReceiptParse;
const L=()=>typeof appLanguage!=='undefined'&&appLanguage==='en'?'en':'vi';
const T=(vi:string,en:string)=>L()==='en'?en:vi;

// ------------------------------------------------------------ pure: what may leave the phone (unit-tested)
const PAY_LINE=/\b(card\s*(no|num(ber)?|#)|aid\b|tvr\b|tsi\b|atc\b|arqc|arpc|terminal|term(inal)?\s*id|merch(ant)?\s*(id|no)\b|reference|ref\s*(no|#|:)|auth(ori[sz]ation)?\s*(code|no)?|approv(ed|al)\s*(code|no|#)?|pan\s*seq|account\s*(no|type)?|acct|bsb\b|stan\b|rrn\b|trans(action)?\s*(no|#|id|\d)|receipt\s*(no|#|:)|invoice\s*(no|#)|docket\s*(no|#)|register\s*:|served\s*by|store\s*manager|manager\s*:|cashier|operator|signature|surname|customer\s*(name|no|#|:)|commonwealth bank|westpac|anz\b|nab\b|st george|visa|mastercard|master card|amex|eftpos)/i;
const MEMBER_LINE=/\b(member(ship)?|loyalty|rewards?|flybuys|goldstar|points?\s*card|club\s*(no|card|#))\b.*(\d[\s-]?){5,}/i;
const MOBILE=/(?:\+?61[\s-]?4|\b04)\d{2}[\s-]?\d{3}[\s-]?\d{3}\b/g;
const LANDLINE=/(?:\(0[2378]\)|\b0[2378])[\s-]?\d{4}[\s-]?\d{4}\b/g;
const EMAIL=/[\w.+-]+@[\w-]+(\.[\w-]+)+/g;
const SHOP_LABEL=/\b(ph|phone|tel|t)\b\W*$/i;
const ABN_NO=/\bA\.?B\.?N\b[\s:.-]*\d{2}\s?\d{3}\s?\d{3}\s?\d{3}/gi;
// digits that count towards a long number: the shop's ABN and the shop phone printed after Ph / Tel are public, not counted
const longDigits=(s:string)=>/\d{10,}/.test(s.replace(ABN_NO,' ').replace(LANDLINE,(m:string,o:number,all:string)=>SHOP_LABEL.test(all.slice(0,o))?' ':m).replace(/\s+/g,''));
function sensitiveLine(line:any){const s=String(line??'');if(/\bA\.?B\.?N\b/i.test(s)&&!/card|acct|account|member|\baid\b|tvr|arqc|terminal/i.test(s)&&!longDigits(s))return false;/* the shop's ABN is public */
 
 if(RP?.isSensitive&&RP.isSensitive(s))return true;
 return PAY_LINE.test(s)||MEMBER_LINE.test(s)||/[x*]{4}[\s-]*[x*]{4}/i.test(s)||longDigits(s)&&!/\d[.,]\d{2}\s*[A-Z]?\s*$/.test(s)||/\b[0-9A-F]{10,}\b/.test(s)||/\d{3,4}\/\d{3}\/\d{3}\/\d{3}/.test(s)||/^\W*[x*]{2,}\d{3,4}\b/i.test(s)||/\b(TRANS|POS)\s*\d+/i.test(s)||/\b(no|nr|number|#)\s*[:.#]?\s*[A-Z]{1,3}\d{6,}\b/i.test(s)}
function maskLine(line:any){let s=String(line??'');s=s.replace(EMAIL,'[email]').replace(MOBILE,'[phone]').replace(LANDLINE,(m:string,o:number,all:string)=>SHOP_LABEL.test(all.slice(0,o))?m:'[phone]');
 /* item lines (ending in a price) keep their item codes; a card-length number is masked anywhere */
 const priced=/\d[.,]\d{2}\s*[A-Z]?\s*$/.test(s);return s.replace(/\d{9,}/g,m=>/\bA\.?B\.?N\b/i.test(s)&&m.length===11||priced&&m.length<14?m:'#'.repeat(Math.min(m.length,12)))}
/** {text, removed}: the receipt text as it may be sent — sensitive lines dropped, people's numbers masked. */
function redactForReport(text:any){let removed=0;const kept:string[]=[];
 for(const l of String(text??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').split(/\r?\n/)){if(sensitiveLine(l)){removed++;continue}kept.push(maskLine(l).replace(/\s+$/,''))}
 return{text:kept.join('\n').replace(/^\n+|\n+$/g,'').slice(0,20000),removed}}
const cleanSide=(s:any)=>({store:maskLine(sensitiveLine(s?.store)?'':String(s?.store||'')).slice(0,80),date:/^\d{4}-\d{2}-\d{2}$/.test(String(s?.date||''))?s.date:null,total:Number.isFinite(s?.total)?Math.round(s.total*100)/100:null,
 lines:(s?.lines||[]).slice(0,150).map((x:any)=>({name:maskLine(sensitiveLine(x.name)?'':String(x.name||'')).slice(0,120),qty:Number.isFinite(x.qty)?x.qty:null,unit:String(x.unit||'').slice(0,16),price:Number.isFinite(x.price)?Math.round(x.price*100)/100:null}))});
const normName=(s:string)=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const same=(a:any,b:any)=>a==null&&b==null||a!=null&&b!=null&&Math.abs(a-b)<0.005;
/** true when the family changed anything the reader produced (a line, name, price, amount, the store, date or total). */
function corrected(read:any,now:any){if(!read||!now)return false;if(normName(read.store)!==normName(now.store)||String(read.date||'')!==String(now.date||'')||!same(read.total,now.total))return true;
 if(read.lines.length!==now.lines.length)return true;return read.lines.some((r:any,i:number)=>{const c=now.lines[i];return normName(r.name)!==normName(c.name)||!same(r.price,c.price)||!same(r.qty,c.qty)||String(r.unit||'')!==String(c.unit||'')})}
/** The exact body sent to the server. */
function buildReport({text,read,now,retailer=null,source='photo',confidence=null,warnings=[],clientId,lang='vi',build=null,edition=null,clientAt=Date.now()}:any){
 const red=redactForReport(text);return{clientId,source,text:red.text,removed:red.removed,read:cleanSide(read),corrected:cleanSide(now),retailer:/^[a-z0-9-]{1,30}$/.test(String(retailer||''))?retailer:null,
  build:build||null,edition:Number.isInteger(edition)?edition:null,lang:lang==='en'?'en':'vi',confidence:Number.isFinite(confidence)?Math.round(confidence):null,warnings:(warnings||[]).map((w:any)=>w?.code||w).filter((w:any)=>typeof w==='string').slice(0,12),clientAt}}
const api:any={redactForReport,sensitiveLine,maskLine,corrected,buildReport};root.ReceiptShare=api;
if(typeof document==='undefined'||typeof receiptEditor!=='function'||!RP)return;

// ------------------------------------------------------------ app part
const Q=()=>root.ReceiptQuality;
const esc2=(v:any)=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,(c:string)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'} as any)[c]);
const API='/.netlify/functions/feedback';
const READS='bep-receipt-reads',SENT='bep-receipt-reports-sent',DEVICE='bep-feedback-device';
const scoped=(k:string)=>(typeof storageScope==='string'?storageScope:'')+k;
const getLS=(k:string,d:any)=>{try{const v=localStorage.getItem(scoped(k));return v?JSON.parse(v):d}catch{return d}};
const putLS=(k:string,v:any)=>{try{localStorage.setItem(scoped(k),JSON.stringify(v))}catch{}};
const rid=(n:number)=>{const a=new Uint8Array(n);crypto.getRandomValues(a);return [...a].map(b=>'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'[b&63]).join('')};
// the same random device token the in-app feedback uses (device-only use has no account to send with)
function deviceToken(){let t='';try{t=JSON.parse(localStorage.getItem(DEVICE)||'""')}catch{t=localStorage.getItem(DEVICE)||''}if(typeof t!=='string'||!/^[A-Za-z0-9_-]{24,64}$/.test(t)){t=rid(24);try{localStorage.setItem(DEVICE,JSON.stringify(t))}catch{}}return t}
const accountMode=()=>root.BEP_SESSION?.mode==='account';
const draftNow=()=>typeof receiptDraft!=='undefined'?receiptDraft:null;
const snap=(d:any)=>Q()?.snapshot?Q().snapshot(d):{store:d.store,date:d.date,total:d.total,lines:(d.items||[]).map((i:any)=>({name:i.label,qty:i.qty,unit:i.unit,price:i.total}))};
// What the reader produced for the open receipt: the live reading session (photo just read), or for a saved receipt the reading
// kept on this phone when it was saved (already without sensitive lines), or its saved item text read again.
function sourceFor(d:any){if(!d)return null;const s=Q()?.session?.();
 if(s&&s.reader)return{source:'photo',text:s.text,read:s.reader,retailer:s.retailer||d.extra?.retailer||null,confidence:s.confidence,warnings:s.parsed?.warnings||[]};
 if(!d.editing)return null;const kept=getLS(READS,{})[d.id];
 if(kept?.text&&kept.read)return{source:'saved',text:kept.text,read:kept.read,retailer:kept.retailer||d.extra?.retailer||null,confidence:kept.confidence??null,warnings:kept.warnings||[]};
 const rec=(state.receipts||[]).find((r:any)=>r.id===d.id),raw=String(rec?.raw||'');if(raw.trim().length<3)return null;
 const p=RP.parseReceipt(raw,rec?.retailer?{retailer:rec.retailer}:{});const lines=(p.items||[]).map((it:any)=>({name:String(it.name||''),qty:null,unit:'',price:it.price==null?null:Math.round(((it.price||0)+(it.discount||0))*100)/100}));
 return{source:'saved',text:raw,read:{store:p.store||'',date:p.date||null,total:p.printedTotal??null,lines},retailer:rec?.retailer||p.retailer||null,confidence:null,warnings:p.warnings||[]}}
let sentFor:any={};// draft id → report code sent from this sheet
function rowHTML(d:any,src:any){const done=sentFor[d.id]||getLS(SENT,{})[d.id];
 if(done)return`<div class="rshare-row" data-rshare-row><p class="rshare-sent" role="status">${esc2(T(`Đã gửi chữ hoá đơn này (mã ${done}). Cảm ơn — lần sau app đọc loại hoá đơn này tốt hơn.`,`This receipt's text was sent (code ${done}). Thank you — the app will read this kind of receipt better.`))}</p></div>`;
 const changed=corrected(src.read,snap(d));
 return`<div class="rshare-row" data-rshare-row ${changed?'':'hidden'}><button class="btn" type="button" data-rshare="open">${esc2(T('Gửi chữ hoá đơn để sửa cách đọc','Send the text so the app reads it better'))}</button><p class="hint">${esc2(T('Bạn đã sửa chỗ app đọc sai. Gửi chữ trên hoá đơn (không gửi ảnh, đã che số thẻ và số thành viên) để lần sau app đọc đúng loại hoá đơn này. Bạn xem trước những gì được gửi.','You fixed what the app misread. Send the receipt text (never the photo; card and member numbers removed) so the app reads this kind of receipt right next time. You see exactly what is sent first.'))}</p></div>`}
function placeRow(){const d=draftNow(),m=document.querySelector('#modal-root .receipt-modal .modal-content');if(!m)return;m.querySelector('[data-rshare-row]')?.remove();const src=sourceFor(d);if(!src)return;m.insertAdjacentHTML('beforeend',rowHTML(d,src))}
{const base=receiptEditor;receiptEditor=function(this:any,...a:any[]){const r=base.apply(this,a);try{placeRow()}catch(e){console.warn('receipt share row',e)}return r}}
// typing a fix shows the button (the row sits at the end of the sheet, so nothing above it moves)
let tick:any=0;const refresh=()=>{clearTimeout(tick);tick=setTimeout(()=>{const d=draftNow(),row=document.querySelector('#modal-root [data-rshare-row]') as HTMLElement|null;if(!d||!row||row.querySelector('.rshare-sent'))return;const src=sourceFor(d);if(!src)return;try{collectReceipt()}catch{}row.hidden=!corrected(src.read,snap(d))},120)};
document.addEventListener('input',e=>{if((e.target as any)?.closest?.('#modal-root .receipt-modal'))refresh()});document.addEventListener('change',e=>{if((e.target as any)?.closest?.('#modal-root .receipt-modal'))refresh()});

// ------------------------------------------------------------ preview sheet
let pending:any=null;
const money=(v:any)=>v==null?'—':(typeof aud==='function'?aud(v,draftNow()?.currency):(+v).toFixed(2));
function linesTable(title:string,side:any,other:any){const rows=side.lines.map((l:any,i:number)=>{const o=other.lines[i];const ch=!o||normName(o.name)!==normName(l.name)||!same(o.price,l.price)||!same(o.qty,l.qty)||String(o.unit||'')!==String(l.unit||'');
  return`<tr class="${ch?'rs-changed':''}"><td>${esc2(l.name||'—')}</td><td class="n">${l.qty==null?'—':esc2(l.qty+(l.unit?' '+l.unit:''))}</td><td class="n">${esc2(l.price==null?'—':(+l.price).toFixed(2))}</td></tr>`}).join('');
 return`<section><h3>${esc2(title)} <small>(${side.lines.length} ${esc2(T('dòng','lines'))})</small></h3><table><thead><tr><th>${esc2(T('Tên','Name'))}</th><th class="n">${esc2(T('SL','Qty'))}</th><th class="n">${esc2(T('Giá','Price'))}</th></tr></thead><tbody>${rows||`<tr><td colspan="3">${esc2(T('Không có dòng','No lines'))}</td></tr>`}</tbody></table></section>`}
function openPreview(){const d=draftNow();if(!d)return;try{collectReceipt()}catch{}const src=sourceFor(d);if(!src){toast(T('Không còn chữ đọc từ ảnh của hoá đơn này.','The text read from this receipt is no longer available.'),true);return}
 const body=buildReport({text:src.text,read:src.read,now:snap(d),retailer:src.retailer,source:src.source,confidence:src.confidence,warnings:src.warnings,clientId:rid(24),lang:L(),build:String(root.BEP_BUILD||'')||null,edition:typeof APP_EDITION==='number'?APP_EDITION:null});
 pending={body,draftId:d.id};const online=navigator.onLine&&!root.BEP_OFFLINE;
 const meta:[string,string][]= [[T('Cửa hàng','Store'),body.corrected.store||'—'],[T('Mã chuỗi cửa hàng','Retailer id'),body.retailer||'—'],[T('Ngày mua','Date'),body.corrected.date||'—'],[T('Tổng','Total'),money(body.corrected.total)],[T('Độ tin cậy khi đọc','Reading confidence'),body.confidence==null?'—':body.confidence+'%'],[T('Phiên bản app','App build'),(body.edition??'—')+' · '+(body.build||'—')],[T('Ngôn ngữ','Language'),body.lang.toUpperCase()]];
 const html=`<p class="hint">${esc2(T('Chỉ những gì dưới đây được gửi, và chỉ khi bạn bấm Gửi. Ảnh hoá đơn không bao giờ được gửi.','Only what is shown below is sent, and only when you tap Send. The receipt photo is never sent.'))}</p>
 <p class="callout rshare-removed">${esc2(body.removed?T(`Đã bỏ ${body.removed} dòng có số thẻ, ngân hàng, thành viên, số hoá đơn hoặc số điện thoại ngay trên máy này.`,`${body.removed} line${body.removed>1?'s':''} with card, bank, member, receipt or phone numbers ${body.removed>1?'were':'was'} removed on this phone.`):T('Không có dòng nào chứa số thẻ, ngân hàng, thành viên hay số hoá đơn.','No line held card, bank, member or receipt numbers.'))}</p>
 <h3>${esc2(T('Chữ đọc được từ ảnh (đã che số)','Text read from the photo (numbers removed)'))}</h3><pre class="rshare-text" tabindex="0" aria-label="${esc2(T('Chữ sẽ gửi','Text to be sent'))}">${esc2(body.text)}</pre>
 <div class="rshare-sides">${linesTable(T('App đọc','The app read'),body.read,body.corrected)}${linesTable(T('Bạn đã sửa thành','Your corrected lines'),body.corrected,body.read)}</div>
 <dl class="rshare-meta">${meta.map(([k,v])=>`<dt>${esc2(k)}</dt><dd>${esc2(v)}</dd>`).join('')}</dl>
 <details class="simple-disclosure rshare-json"><summary>${esc2(T('Dữ liệu gửi đi, đúng từng chữ','The data sent, word for word'))}</summary><pre>${esc2(JSON.stringify(body,null,1))}</pre></details>
 <p class="hint">${esc2(T('Dùng để sửa cách app đọc loại hoá đơn này (thành một bài kiểm tra). Lưu 180 ngày rồi tự xoá. Muốn xoá sớm: báo mã hiện ra sau khi gửi.','Used to fix how the app reads this kind of receipt (it becomes a test). Kept 180 days, then deleted. To have it deleted sooner, quote the code shown after sending.'))} <a href="/privacy.html#receipt-text" target="_blank" rel="noopener">${esc2(T('Quyền riêng tư','Privacy'))}</a></p>
 ${online?'':`<p class="callout rshare-offline">${esc2(T('Đang ngoại tuyến — có mạng rồi mở lại để gửi.','You are offline — open this again when you are online to send.'))}</p>`}`;
 modal(T('Xem trước chữ sẽ gửi','What will be sent'),html,`<button class="btn" type="button" data-rshare="back">${esc2(T('Quay lại hoá đơn','Back to the receipt'))}</button><button class="btn primary" type="button" data-rshare="send" ${online?'':'disabled'}>${esc2(T('Gửi chữ đã che số','Send the text'))}</button>`,true);
 document.querySelector('#modal-root .modal')?.classList.add('rshare-modal')}
function back(){if(draftNow())receiptEditor();else closeModal()}
async function send(btn:any){if(!pending)return;btn.disabled=true;const {body,draftId}=pending;
 try{const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),15000);
  const r=await fetch(API+'?op=receipt-report',{method:'POST',credentials:accountMode()?'same-origin':'omit',cache:'no-store',headers:{Accept:'application/json','Content-Type':'application/json','x-feedback-device':deviceToken()},body:JSON.stringify(body),signal:ctl.signal});clearTimeout(t);
  let d:any={};try{d=await r.json()}catch{}
  if(!r.ok){toast(L()==='en'?d.errorEn||d.error||'Could not send. Try again later.':d.error||'Chưa gửi được. Thử lại sau.',true);btn.disabled=false;return}
  const code=String(d.id||'').slice(0,6);sentFor[draftId]=code;const all=getLS(SENT,{});all[draftId]=code;const keys=Object.keys(all);if(keys.length>50)for(const k of keys.slice(0,keys.length-50))delete all[k];putLS(SENT,all);pending=null;
  back();toast(T(`Đã gửi — cảm ơn, lần sau app đọc hoá đơn này tốt hơn. Mã: ${code}`,`Sent — thank you, the app will read this receipt better next time. Code: ${code}`))}
 catch{toast(T('Chưa gửi được — kiểm tra mạng rồi thử lại.','Not sent — check the connection and try again.'),true);btn.disabled=false}}
document.addEventListener('click',e=>{const b=(e.target as any)?.closest?.('[data-rshare]');if(!b||b.disabled)return;e.preventDefault();const a=b.dataset.rshare;if(a==='open')openPreview();else if(a==='back'){pending=null;back()}else if(a==='send')send(b)});

// ------------------------------------------------------------ keep the reading of a saved receipt on this phone (sensitive lines removed)
const baseSave=saveReceipt;
saveReceipt=async function(this:any,...a:any[]){const d=draftNow(),s=Q()?.session?.(),id=d?.id;const r=await baseSave.apply(this,a);
 try{if(s&&s.reader&&id&&!draftNow()&&(state.receipts||[]).some((x:any)=>x.id===id)){const reads=getLS(READS,{});reads[id]={text:redactForReport(s.text).text,read:cleanSide(s.reader),retailer:s.retailer||null,confidence:s.confidence??null,warnings:(s.parsed?.warnings||[]).map((w:any)=>w.code),at:Date.now()};
  const ks=Object.keys(reads).sort((x,y)=>(reads[x].at||0)-(reads[y].at||0));while(ks.length>20)delete reads[ks.shift()!];putLS(READS,reads);if(sentFor[id]){const all=getLS(SENT,{});all[id]=sentFor[id];putLS(SENT,all)}}}catch(e){console.warn('receipt read keep',e)}
 return r};
})();
