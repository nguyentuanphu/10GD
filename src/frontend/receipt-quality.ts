'use strict';
// v1.7.18 photo quality hints (owner decision, 12 Nov 2026, Sydney time; plan docs/plans/receipts-v1.7.19-20261112.md B).
// Right after a photo is read, before the family starts correcting: when the lines read do not add up to the printed total /
// payment, the printed item count differs, the reading confidence is low, no TOTAL / payment line was found, or lines have no
// price at the right edge (price column cut off), ONE short card says why and what to do — “Chụp lại” (main action, opens the
// camera / photo picker again like “Chụp hoá đơn”) or “Vẫn dùng bản này”. It never blocks saving and nothing leaves the phone:
// it uses only what the reader already measured (difference, printed count, confidence, the crop frame).
// This file also keeps the “reading session” of the open receipt (the text read, its confidence and the reader's own lines
// before the family edits them) that receipt-share.ts sends when the family asks (A). Hooks only — receipt-ui.ts is unchanged:
// ReceiptParse.recognize / parseReceipt and receiptEditor are wrapped like other modules do.
(function(){
const root:any=globalThis as any;const RP=root.ReceiptParse;if(!RP)return;
const L=()=>typeof appLanguage!=='undefined'&&appLanguage==='en'?'en':'vi';
const T=(vi:string,en:string)=>L()==='en'?en:vi;
// v1.7.19 (audit B13): the app's money formatter, in the receipt's currency (the difference is a size, so no sign)
const money=(v:number,c?:string)=>typeof aud==='function'?aud(Math.abs(v),c||'AUD'):'$'+Math.abs(v).toFixed(2);

// ------------------------------------------------------------ pure: which reasons apply (unit-tested)
// parsed: ReceiptParse.parseReceipt(); confidence: OCR 0–100 (null = typed / pasted text); frame: the crop frame used (0–1).
const HINT_MIN_DIFF=0.05,HINT_MIN_CONF=70;
function qualityReasons(parsed:any,{confidence=null,frame=null}:{confidence?:number|null,frame?:any}={}){
 const out:any[]=[];if(!parsed||!Array.isArray(parsed.items))return out;
 const goods=parsed.items.filter((i:any)=>i.kind==='item');
 if(confidence!=null&&Number.isFinite(confidence)&&confidence<HINT_MIN_CONF){const c=Math.round(confidence);out.push({code:'blurry',value:c,vi:`Chữ đọc chưa rõ (độ tin cậy ${c}%) — ảnh có thể mờ, tối hoặc nghiêng`,en:`The text is hard to read (${c}% confidence) — the photo may be blurry, dark or tilted`})}
 if(!goods.length){out.push({code:'no-items',vi:'Không thấy dòng món nào trong ảnh',en:'No item lines were found in the photo'});return out}
 const miss=goods.filter((i:any)=>i.price==null).length,fixed=goods.filter((i:any)=>i.priceRepaired).length,cut=miss+fixed;
 if(miss>=2||fixed>=1||miss>=1&&frame&&Number(frame.r)<0.9)out.push({code:'cut-off',value:cut,vi:`${cut} dòng không thấy giá ở mép phải — cột giá có thể bị cắt`,en:`${cut} line${cut>1?'s have':' has'} no price at the right edge — the price column may be cut off`});
 if(parsed.printedTotal==null)out.push({code:'no-total',vi:'Không thấy dòng TOTAL hay số tiền trả',en:'No TOTAL or amount paid was found'});
 else if(parsed.difference!=null&&Math.abs(parsed.difference)>=HINT_MIN_DIFF)out.push(parsed.difference>0?{code:'short',value:parsed.difference,vi:`Các dòng đọc được còn thiếu ${money(parsed.difference,parsed.currency)} so với tổng in`,en:`The lines read are ${money(parsed.difference,parsed.currency)} short of the printed total`}:{code:'over',value:parsed.difference,vi:`Các dòng đọc được nhiều hơn tổng in ${money(parsed.difference,parsed.currency)}`,en:`The lines read come to ${money(parsed.difference,parsed.currency)} more than the printed total`});
 if(parsed.printedCount!=null&&Math.abs(parsed.printedCount)!==Math.abs(parsed.countRead??goods.length))out.push({code:'count',vi:`Hoá đơn ghi ${Math.abs(parsed.printedCount)} món, app đọc được ${Math.abs(parsed.countRead??goods.length)}`,en:`The receipt says ${Math.abs(parsed.printedCount)} items; ${Math.abs(parsed.countRead??goods.length)} were read`});
 return out}
const ADVICE={vi:'Chụp lại: để hoá đơn thẳng, đủ sáng, thấy cả cột giá và dòng TOTAL.',en:'Retake it: lay the receipt flat in good light, with the whole price column and the TOTAL line in view.'};
const api:any={qualityReasons,ADVICE,HINT_MIN_DIFF,HINT_MIN_CONF};root.ReceiptQuality=api;
if(typeof document==='undefined'||typeof receiptEditor!=='function')return;

// ------------------------------------------------------------ the reading session of the open receipt
// lastRead: the latest on-device OCR result (text never leaves the phone here). session: tied to the draft the text filled.
let lastRead:any=null,session:any=null,cropMode='';
const baseRecognize=RP.recognize;
RP.recognize=async function(...a:any[]){const r=await baseRecognize.apply(this,a);try{lastRead={text:r?.text||'',originalText:r?.originalText||null,confidence:Number.isFinite(r?.confidence)?r.confidence:null,at:Date.now()}}catch{}return r};
const baseParse=RP.parseReceipt;
RP.parseReceipt=function(text:any,...a:any[]){const r=baseParse.call(this,text,...a);
 try{const d=typeof receiptDraft!=='undefined'?receiptDraft:null;if(d&&lastRead&&Date.now()-lastRead.at<120000&&typeof text==='string'&&text&&(text===lastRead.text||text===lastRead.originalText)){
  const frame=cropMode==='read'&&root.ReceiptCrop?.get?root.ReceiptCrop.get():null;
  session={draftId:d.id,source:'photo',text,parsed:r,confidence:lastRead.confidence,frame,retailer:r?.retailer||null,reader:null,touched:false,reasons:qualityReasons(r,{confidence:lastRead.confidence,frame}),hint:'open',at:Date.now()}}}catch(e){console.warn('receipt session',e)}
 return r};
document.addEventListener('click',e=>{const b=(e.target as any)?.closest?.('[data-rcrop]');if(b&&(b.dataset.rcrop==='read'||b.dataset.rcrop==='whole'))cropMode=b.dataset.rcrop},true);
const draftNow=()=>typeof receiptDraft!=='undefined'?receiptDraft:null;
const current=()=>{const d=draftNow();return session&&d&&session.draftId===d.id?session:null};
function snapshot(d:any){return{store:String(d.store||''),date:d.date||null,total:Number.isFinite(+d.total)?+d.total:null,lines:(d.items||[]).map((i:any)=>({name:String(i.label||''),qty:Number.isFinite(i.qty)&&i.qty!==null?+i.qty:null,unit:String(i.unit||''),price:Number.isFinite(+i.total)?+i.total:null}))}}
// the family's first edit ends the reader's version (until then a re-render — e.g. the shop / date kept from the crop sheet — refreshes it)
const markTouched=(e:any)=>{const s=current();if(!s)return;if(e.target?.closest?.('#modal-root .receipt-modal')&&!e.target.closest('.rq-hint,.rshare-row,.receipt-entry-tools,#ocr-language,input[type=file]'))s.touched=true};
document.addEventListener('input',markTouched,true);document.addEventListener('change',markTouched,true);
document.addEventListener('click',e=>{const b=(e.target as any)?.closest?.('[data-feature="receipt-remove-line"],[data-feature="receipt-add-line"]');if(b)markTouched(e)},true);
api.session=()=>current();api.snapshot=snapshot;api.reset=()=>{session=null;lastRead=null};

// ------------------------------------------------------------ the hint card
const esc2=(v:any)=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,(c:string)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'} as any)[c]);
function hintHTML(s:any){
 if(s.hint==='kept')return`<p class="rq-hint rq-kept" role="status">${esc2(T('Đang dùng bản đọc này — nhớ kiểm tra các dòng và tổng trước khi lưu.','Using this reading — check the lines and the total before saving.'))}</p>`;
 return`<section class="rq-hint" role="status" aria-live="polite" aria-labelledby="rq-hint-h"><h3 id="rq-hint-h">${esc2(T('Ảnh này có thể chưa đọc đúng','This photo may not have read correctly'))}</h3>
 <ul class="rq-reasons">${s.reasons.map((r:any)=>`<li data-rq-reason="${esc2(r.code)}">${esc2(L()==='en'?r.en:r.vi)}</li>`).join('')}</ul><p class="rq-advice">${esc2(L()==='en'?ADVICE.en:ADVICE.vi)}</p>
 <div class="rq-actions"><button class="btn primary" type="button" data-rq="retake">${esc2(T('Chụp lại','Retake'))}</button><button class="btn" type="button" data-rq="keep">${esc2(T('Vẫn dùng bản này','Use this reading'))}</button></div></section>`}
function placeHint(){const s=current(),m=document.querySelector('#modal-root .receipt-modal .modal-content');if(!m)return;m.querySelector('.rq-hint')?.remove();if(!s||!s.reasons.length||s.hint==='gone')return;
 const status=m.querySelector('#ocr-status');if(status)status.insertAdjacentHTML('afterend',hintHTML(s));else m.insertAdjacentHTML('afterbegin',hintHTML(s))}
{const base=receiptEditor;receiptEditor=function(this:any,...a:any[]){const r=base.apply(this,a);try{const s=current(),d=draftNow();if(s&&d&&!s.touched)s.reader=snapshot(d);placeHint()}catch(e){console.warn('receipt hint',e)}return r}}
document.addEventListener('click',e=>{const b=(e.target as any)?.closest?.('[data-rq]');if(!b)return;const s=current();e.preventDefault();
 if(b.dataset.rq==='keep'){if(s)s.hint='kept';const card=b.closest('.rq-hint'),box=document.querySelector('#modal-root .modal-content') as HTMLElement|null,y=box?.scrollTop||0;
  if(card&&s){card.outerHTML=hintHTML(s)}if(box)box.scrollTop=y;(document.querySelector('#modal-root .rq-kept') as any)?.focus?.({preventScroll:true});return}
 if(b.dataset.rq==='retake'){if(s)s.hint='gone';document.querySelector('#modal-root .rq-hint')?.remove();const input=document.getElementById('receipt-camera-file') as HTMLInputElement|null;if(input){input.value='';input.click()}}});

// ------------------------------------------------------------ styles (kept here so the shared stylesheet is not touched)
const css=`.rq-hint{margin:8px 0 12px;padding:12px 14px;border-radius:12px;border:1px solid #e8c98f;background:#fff7e8;color:#5b4012}
.rq-hint h3{margin:0 0 6px;font-size:1.02em;color:inherit}.rq-reasons{margin:0 0 8px;padding-left:1.2em}.rq-reasons li{margin:2px 0;overflow-wrap:anywhere}
.rq-advice{margin:0 0 10px;font-weight:600}.rq-actions{display:flex;flex-wrap:wrap;gap:8px}.rq-actions .btn{min-height:44px;flex:1 1 9em;white-space:normal}
.rq-kept{display:block;margin:8px 0 12px;padding:8px 12px;border-radius:10px;border:1px dashed #d9c39a;background:transparent;font-size:.92em}
html[data-theme="dark"] .rq-hint{background:#2e2717;border-color:#5a4a26;color:#f1d9a6}html[data-theme="dark"] .rq-kept{background:transparent;border-color:#5a4a26}
.rshare-row{margin:16px 0 4px;padding:12px 0 0;border-top:1px solid var(--line,#e7e7df)}.rshare-row[hidden]{display:none}.rshare-row .btn{min-height:44px;white-space:normal;max-width:100%}.rshare-row p{margin:6px 0 0}
.rshare-sent{color:var(--green,#174e3c);font-weight:600}html[data-theme="dark"] .rshare-sent{color:#8fd6b0}
.rshare-text{max-height:16em;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;margin:0 0 12px;padding:10px 12px;border-radius:10px;border:1px solid var(--line,#e7e7df);background:var(--mint,#edf3e9);font:.86em/1.45 ui-monospace,SFMono-Regular,Menlo,monospace}
html[data-theme="dark"] .rshare-text{background:#18231e;border-color:#2c3a33;color:#e6efe9}
.rshare-sides{display:grid;grid-template-columns:1fr;gap:12px;margin:0 0 12px}@media(min-width:720px){.rshare-sides{grid-template-columns:1fr 1fr}}
.rshare-sides table{width:100%;border-collapse:collapse;font-size:.9em;table-layout:fixed}.rshare-sides th,.rshare-sides td{padding:4px 6px;border-bottom:1px solid var(--line,#e7e7df);text-align:left;vertical-align:top;overflow-wrap:anywhere}
.rshare-sides td.n,.rshare-sides th.n{text-align:right;width:5.2em}.rshare-sides tr.rs-changed td{background:#fff4e0}html[data-theme="dark"] .rshare-sides tr.rs-changed td{background:#2e2717}
.rshare-meta{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;margin:0 0 12px}.rshare-meta dt{color:var(--muted,#7b8379)}.rshare-meta dd{margin:0;overflow-wrap:anywhere}
.rshare-json pre{max-height:14em;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;font:.8em/1.4 ui-monospace,SFMono-Regular,Menlo,monospace}
.rshare-modal h3{margin:12px 0 6px}`;
if(!document.getElementById('receipt-quality-css')){const st=document.createElement('style');st.id='receipt-quality-css';st.textContent=css;document.head.append(st)}
})();
