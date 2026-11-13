'use strict';
// v1.7.1 receipt reading in the app — wires the shared ReceiptParse module (receipt-parse.ts) into
//  • the spending receipt form "Chụp / nhập hóa đơn" (photo → prepared image → OCR → parse → match),
//  • the So Giá photo capture (a photo that is a receipt opens the same form, same parser),
//  • the duplicate-receipt check before saving (both flows),
//  • the reconciliation after saving ("Kiểm tra & lưu khoản chi"): bought vs this week's shopping
//    need, one tap to mark shopping items bought and add the extra to the pantry, with undo.
// Payment / card / staff lines are never saved; the receipt / transaction number is kept only as a
// salted hash. Unknown quantities and prices stay unknown.
(function(){
const RP=(globalThis as any).ReceiptParse;
if(!RP||typeof document==='undefined'||typeof receiptEditor!=='function')return;
const T=(vi,en)=>typeof tr==='function'?tr(vi,en):vi;
const lang=()=>typeof appLanguage!=='undefined'&&appLanguage==='en'?'en':'vi';
const SALT='famtray-receipt-v1';
const hasIng=id=>!!id&&typeof INGREDIENTS!=='undefined'&&Object.hasOwn(INGREDIENTS,id);
const ingName=id=>hasIng(id)?INGREDIENTS[id][0]:id;
const baseUnit=id=>hasIng(id)?INGREDIENTS[id][1]:null;
const money=(n,c)=>typeof aud==='function'?aud(n,c):(+n).toFixed(2);
const qtyText=(n,u)=>typeof fmtQty==='function'?fmtQty(n,u):n+' '+u;
const RL=(globalThis as any).ReceiptList;
const DAY=/^\d{4}-\d{2}-\d{2}$/;
// v1.7.18: the shopping list a receipt is matched against — the receipt's week and the week in view
function receiptWeeks(date){const out=[];const add=(w,start,end)=>{const key=typeof menuWeekKey==='function'?menuWeekKey(state,start):start;if(w&&!out.some(x=>x.week===w||x.key===key))out.push({week:w,start,end,key})};
 try{if(DAY.test(date||'')&&typeof planStartOf==='function'){const k=planStartOf(state,date);add(planWeek(state,k),k,addDays(k,6))}}catch{}
 try{const[a,b]=typeof shopDates==='function'?shopDates():[weekStart,addDays(weekStart,6)];add(currentWeek(),a,b)}catch{}
 return out}

// ------------------------------------------------------------ parse → draft
function formQuantity(it,match){
 const count=it.multi?it.multi.count:1;
 if(it.weight)return{qty:it.weight.qty,unit:'kg'};
 const bu=baseUnit(match);if(bu&&RP.COUNTED_BASE.includes(bu)){if(it.pack&&it.pack>1&&!it.size)return{qty:it.pack*count,unit:bu};if(it.each)return{qty:count,unit:bu}}
 if(it.size&&it.size.unit!=='pk')return{qty:Math.round(it.size.qty*count*1000)/1000,unit:it.size.unit};
 if(it.each)return{qty:count,unit:'cái'};
 return{qty:null,unit:''};
}
function lineHint(it){
 const h=[];
 if(it.kind==='discount')h.push(T('Giảm giá / credit — không phải nguyên liệu','Discount / credit — not an ingredient'));
 if(it.kind==='surcharge')h.push(T('Phụ phí thẻ — không phải nguyên liệu','Card surcharge — not an ingredient'));
 if(it.kind==='rounding')h.push(T('Làm tròn','Rounding'));
 if(it.dup)h.push(`×${it.dup.count} (${T('dòng','line')} ${it.dup.n}/${it.dup.count})`);
 if(it.weight)h.push(`${it.weight.qty} kg × ${(+it.perKg).toFixed(2)}/kg`);
 if(it.multi)h.push(`${it.multi.count} × ${(+it.multi.each).toFixed(2)}`);
 if(it.discount)h.push(T('đã trừ giảm giá ','discount applied ')+Math.abs(it.discount).toFixed(2));
 if(it.repaired)h.push(T('cỡ đã sửa từ chữ đọc nhầm','size repaired from a misread'));
 if(it.fromTwin)h.push(T('tên/cỡ lấy từ dòng giống hệt','name/size from the identical line'));
 if(it.priceRepaired)h.push(T('giá cắt mép, điền theo tổng in — kiểm tra','clipped price filled from the printed total — check'));
 if(it.priceMissing&&it.price==null)h.push(T('chưa đọc được giá — nhập tay','price not read — enter it'));
 if(it.kind==='item'&&it.generic)h.push(T('Hoá đơn không ghi tên món — ghép ở “Ghép giá với giỏ đi chợ”, app không tự đoán','The receipt prints no item name — match it in “Match prices to the shopping basket”; nothing is guessed'));
 if(it.kind==='item'&&it.prepared&&!it.nonFood&&!it.snack)h.push(T('món làm sẵn — không tự ghép với nguyên liệu tươi','ready-made — not matched to a raw ingredient by itself'));
 if(it.kind==='item'&&(it.nonFood||it.snack))h.push(it.nonFood?T('không phải thực phẩm — chỉ tính chi tiêu','not food — spending only'):T('đồ ăn vặt — không đối ứng nguyên liệu','snack — not matched to an ingredient'));
 return h;
}
function draftFromParsed(parsed,text){
 const memory=state.aliases||{};
 // v1.7.18: memory → this week's shopping list → the whole catalogue → none (receipt-list.ts)
 const cands=RL?RL.listFor(state,receiptWeeks(parsed.date||receiptDraft?.date||(typeof sydneyDate==='function'?sydneyDate():''))):{ids:[],extras:[]};
 const items=parsed.items.map(it=>{
  let m=RP.matchIngredient(it,{ingredients:INGREDIENTS,aliases:typeof INGREDIENT_ALIASES!=='undefined'?INGREDIENT_ALIASES:{},memory,retailer:parsed.retailer,list:cands.ids});let src=m.source||'',basket=null;const prepared=m.prepared||null;
  if(!m.match&&it.kind==='item'&&!it.snack&&!it.nonFood&&!it.generic&&typeof inferIngredient==='function'){const old=inferIngredient(it.name,state);if(old.confidence==='learned'){m={match:old.match,confidence:'learned'};src='memory'}}
  if(!m.match&&it.kind==='item'&&!it.snack&&!it.nonFood&&!it.generic&&RL){const x=RL.extraMatch(it,cands.extras);if(x){basket={key:'x:'+RL.norm(x.name),id:x.id,name:x.name};m={match:'other',confidence:'suggested'};src='list'}}
  if(!m.match&&it.kind==='item'&&it.nonFood&&!it.generic){m={match:'other',confidence:''};src='nonfood'}
  const mk=it.kind==='item'?RP.memoryKeys(it,parsed.retailer):[];let q=formQuantity(it,m.match);const askQty=q.qty==null&&it.kind==='item'&&!it.generic;let per,qtyFrom='';
  if(askQty&&RL){const r=RL.recallQty(state,mk);if(r){const count=it.multi?it.multi.count:1;q={qty:Math.round(r.qty*count*1000)/1000,unit:r.unit};per=r.per;qtyFrom='memory'}}
  const value=it.price==null?0:Math.round(((it.price||0)+(it.discount||0))*100)/100;
  const extra:any={lineKind:it.kind};if(it.code)extra.code=it.code;if(it.size)extra.size=it.size;if(it.weight){extra.weightKg=it.weight.qty;extra.perKg=it.perKg}if(it.multi)extra.multi=it.multi;if(it.discount)extra.discount=it.discount;if(it.nonFood)extra.nonFood=true;if(it.generic){extra.generic=true;extra.genericKey=it.genericKey||'price';if(it.plu)extra.plu=it.plu}if(basket)extra.basket=basket;if(per)extra.per=per;
  const hint=lineHint({...it,prepared});if(qtyFrom)hint.push(T('lượng nhớ từ lần mua trước ở cửa hàng này','amount remembered from the last time at this store'));
  return{id:uid(),label:(it.name||(it.generic?(it.weight?`${it.weight.qty} kg @ ${(+it.perKg).toFixed(2)}/kg`:(it.price!=null?(+it.price).toFixed(2):'?')):'')).slice(0,200),total:value,match:it.kind==='item'?(m.match.startsWith?.('recipe:')?'':m.match):'',confidence:m.confidence==='suggested'?'suggested':'',qty:q.qty,unit:q.unit,include:true,extra,hint,memKeys:mk,src,prepared,askQty,qtyFrom,expanded:it.expanded||''};
 });
 return{items,meta:{retailer:parsed.retailer,storeNo:parsed.storeNo,time:parsed.time,printedCount:parsed.printedCount,countRead:parsed.countRead,printedTotal:parsed.printedTotal,refund:parsed.refund,warnings:parsed.warnings,txRaw:parsed.txRaw,store:parsed.store,date:parsed.date,currency:parsed.currency}};
}
// Apply a parse to the open draft. Raw text is kept only after payment / staff lines are removed.
// v1.7.14 (owner, 8 Nov 2026: “ô text chỉ nên thể hiện các dòng là ingredients”): the text box shows only the lines that make the
// items (name, weight / count lines, discounts) — no shop header, address, card or payment lines. Reading it again gives the same items.
function receiptItemText(text,parsed){const raws=(parsed.items||[]).filter((i:any)=>i.kind==='item'||i.kind==='discount').map((i:any)=>String(i.raw||'').replace(/\s+/g,' '));if(!raws.length)return '';
 return String(text||'').split(/\r?\n/).filter(l=>{const t=RP.tidy(l).replace(/\s+/g,' ').trim();return t.length>1&&!RP.isSensitive(t)&&raws.some((r:string)=>r.includes(t))}).map(l=>l.replace(/\s{3,}/g,'   ').trim()).join('\n')}
function fillDraft(text,{keepStore=true}={}){
 const d=receiptDraft;if(!d)return null;
 const prevRetailer=keepStore&&!RP.detectRetailer(String(text||'')).id?d.extra?.retailer:null,parsed=RP.parseReceipt(text,prevRetailer?{retailer:prevRetailer}:{});const built=draftFromParsed(parsed,text);
 /* v1.7.19 (audit sweep, rule 36): reading text or a photo that gives no lines never wipes the lines already on the receipt */
 if(!built.items.length&&(d.items||[]).length){toast(T('Không đọc được dòng nào; các dòng đang có vẫn giữ nguyên.','No lines could be read; the lines already here stay as they are.'),true);return parsed}
 d.raw=receiptItemText(text,parsed)||RP.redact(text);d.items=built.items;d.meta=built.meta;
 d.store=keepStore&&d.store?d.store:parsed.store||d.store||'';
 if(parsed.date)d.date=parsed.date;
 d.total=parsed.printedTotal!=null?parsed.printedTotal:keepStore&&d.total!=null?d.total:null;/* v1.7.14: the text box holds item lines only, so a re-read keeps the total already read */
 /* v1.7.19 re-check (receipt currency): the receipt says its currency (store, sign, amounts) → suggested; a currency the family chose
    in the editor is kept; a receipt that does not say keeps the family's (as before). Amounts are never converted. */
 const said=!!parsed.currencyFrom;d.currency=d.currencyChosen&&d.currency?d.currency:said?parsed.currency:(d.currency&&d.currency!=='GBP'&&d.currency!=='EUR'?d.currency:currentCurrency(state));d.currencySuggested=said&&!d.currencyChosen?parsed.currencyFrom:null;
 d.refund=!!parsed.refund;d.dupDecided=false;d.allowDuplicate=false;
 d.extra={retailer:parsed.retailer||null,refund:parsed.refund||undefined,printed:{time:parsed.time||null,count:parsed.printedCount??null,storeNo:parsed.storeNo||null},source:'ocr'};
 return parsed;
}
// "Đọc các dòng hóa đơn" (pasted / edited text) and every other caller of the old parser use the
// shared module too; the returned shape stays compatible.
const oldParseText=parseReceiptText;
parseReceiptText=function(text,s){
 try{if(receiptDraft&&s===state&&typeof text==='string'&&text===receiptDraft.raw){const before={store:receiptDraft.store};const p=fillDraft(text);return{store:before.store||p.store,date:receiptDraft.date,total:receiptDraft.total,items:receiptDraft.items}}}catch(e){console.warn('receipt parse',e)}
 return oldParseText(text,s);
};

// ------------------------------------------------------------ photo → OCR (shared with So Giá)
async function ocrText(file,{original=false,status=null,lang='eng'}={}){
 await loadOCR();
 return RP.recognize(file,{lang,original,status});
}
const oldRead=readReceiptPhoto;
readReceiptPhoto=async function(file){
 if(!file||ocrBusy)return;
 if((!navigator.onLine||globalThis.BEP_OFFLINE)&&!(typeof ocrOfflineReady==='function'&&ocrOfflineReady()))return oldRead(file);
 collectReceipt();const language=$('#ocr-language')?.value||'eng';ocrBusy=true;
 const status=text=>{const el=$('#ocr-status');if(el)el.textContent=text};
 try{
  receiptPhoto=await photoBlob(file);if(receiptPhotoURL)URL.revokeObjectURL(receiptPhotoURL);receiptPhotoURL=URL.createObjectURL(receiptPhoto);
  status(T('Đang tải bộ đọc hóa đơn…','Loading the receipt reader…'));
  const res=await ocrText(file,{lang:language,status:info=>status(`${info.status==='recognizing text'?T('Đang đọc chữ','Reading text'):info.status} · ${Math.round((info.progress||0)*100)}%`)});
  const parsed=fillDraft(res.text,{keepStore:false});receiptEditor();
  status(summaryText(parsed,res.confidence));
 }catch(error){toast(error.message||T('Chưa đọc được ảnh. Bạn có thể dán chữ hoặc nhập thủ công.','Could not read the photo. Paste the text or enter it by hand.'),true);status(T('OCR chưa hoàn tất. Không có khoản chi nào được tự ghi nhận.','Reading did not finish. Nothing was recorded.'))}
 finally{ocrBusy=false}
};
// v1.7.14 (owner, 8 Nov 2026: “for scanning receipt you should also have functions to crop the receipt so the OCR can read easier”):
// a chosen photo opens “Cắt hóa đơn” first — a frame with four edges to drag (or move with the arrow keys) around the printed
// lines; “Đọc phần đã cắt” reads only that part, “Đọc cả ảnh” the whole photo. “Cắt lại ảnh” under the photo opens it again.
const ocrRead=readReceiptPhoto;
let cropSrc:any=null,cropURL='',cropLang='eng',crop={l:.04,t:.03,r:.96,b:.97};
const ocrReady=()=>navigator.onLine&&!globalThis.BEP_OFFLINE||typeof ocrOfflineReady==='function'&&ocrOfflineReady();
// v1.7.14 (owner pop-up, 8 Nov 2026: “Tự cắt, vẫn cho chỉnh”): while the sheet is open, a quick look at the photo (smaller copy, line
// positions) finds the item lines; the frame is set from the first item to the TOTAL line, and the shop, date and total read there
// are kept for when the cropped part leaves the header out. The family can still drag the edges.
let cropTouched=false,cropMeta:any=null,cropSeq=0;
// The frame around the item lines (quick first pass). Henry, 13 Nov 2026 (Orange Supermarket photo): the quick pass did not
// recognise the first items (a faint price, a Chinese line under each name), so the frame started at the 4th item and the
// first ones were never read. The frame now starts right after the receipt's head (date, cashier, register, ABN, TAX
// INVOICE, address) — every line between the head and the first recognised item is kept — and runs to TOTAL as before.
const HEAD_RE=/\b(tax\s*invoice|invoice|receipt|date|cashier|operator|reg(?:ister)?\b|pos\s*\d|abn|acn|phone|tel|ph\s*[:.]|trans(?:action)?|store\s*(?:no|#)|nsw|vic|qld|wa|sa|tas|act|nt)\b|\b\d{4}\s*$|^no\s*[:.]/i;
function itemFrame(lines:any[],idx:number[],W:number,H:number){if(!idx.length)return null;const first=idx[0];
 let start=first;for(let i=first-1;i>=0;i--){if(HEAD_RE.test(lines[i].t))break;if(first-i>8)break;if(/[A-Za-zÀ-ỹ㐀-鿿]{2}/.test(lines[i].t)||/\d[.,]\d{2}/.test(lines[i].t))start=i}
 let last=idx[idx.length-1];for(let i=last+1;i<lines.length&&i<=last+7;i++){const tt=lines[i].t;if(/\btotal\b/i.test(tt)&&!/total\s*items?/i.test(tt)){last=i;if(!/sub/i.test(tt))break}}
 const keep=new Set(idx);for(let i=start;i<first;i++)keep.add(i);for(let i=idx[idx.length-1]+1;i<=last;i++)keep.add(i);
 const pick=[...keep].sort((a,b)=>a-b).map(i=>lines[i]);
 const y0=Math.min(...pick.map(l=>l.y0)),y1=Math.max(...pick.map(l=>l.y1)),x0=Math.min(...pick.map(l=>l.x0)),x1=Math.max(...pick.map(l=>l.x1)),py=H*.015,px=W*.025;
 const f={l:Math.max(0,(x0-px)/W),t:Math.max(0,(y0-py)/H),r:Math.min(1,(x1+px)/W),b:Math.min(1,(y1+py)/H)};return f.r-f.l>=.2&&f.b-f.t>=.08?f:null}
async function suggestCrop(file:any){await loadOCR();const TS=(globalThis as any).Tesseract;if(!TS?.createWorker)return null;const bmp=await createImageBitmap(file);const sc=Math.min(1,1400/Math.max(bmp.width,bmp.height));
 const cv=document.createElement('canvas');cv.width=Math.max(1,Math.round(bmp.width*sc));cv.height=Math.max(1,Math.round(bmp.height*sc));cv.getContext('2d')!.drawImage(bmp,0,0,cv.width,cv.height);bmp.close?.();const W=cv.width,H=cv.height;
 let w:any=null;try{w=await TS.createWorker('eng',1);await w.setParameters({tessedit_pageseg_mode:'6',preserve_interword_spaces:'1'});const {data}=await w.recognize(cv,{},{blocks:true,text:true});
  const lines=((data.lines||[]) as any[]).map(l=>{const ws=(l.words||[]).filter((x:any)=>/[A-Za-z0-9$]/.test(x.text||''));const xs=ws.length?ws.map((x:any)=>x.bbox):[l.bbox];return{t:String(l.text||'').replace(/\s+/g,' ').trim(),y0:l.bbox.y0,y1:l.bbox.y1,x0:Math.min(...xs.map((b:any)=>b.x0)),x1:Math.max(...xs.map((b:any)=>b.x1))}}).filter(l=>l.t);
  const parsed=RP.parseReceipt(lines.map(l=>l.t).join('\n'));const meta={store:parsed.store||'',date:parsed.date||'',total:parsed.printedTotal??null,retailer:parsed.retailer||null};
  const raws=(parsed.items||[]).filter((i:any)=>i.kind==='item'||i.kind==='discount').map((i:any)=>String(i.raw||'').replace(/\s+/g,' '));
  const idx=lines.map((l,i)=>{const t=RP.tidy(l.t).replace(/\s+/g,' ').trim();return t.length>1&&raws.some((r:string)=>r.includes(t))?i:-1}).filter(i=>i>=0);if(!idx.length)return{frame:null,meta};
  return{frame:itemFrame(lines,idx,W,H),meta,items:idx.length}}
 finally{try{await w?.terminate()}catch{}}}
readReceiptPhoto=async function(file){if(!file||ocrBusy)return;if(!ocrReady())return ocrRead(file);collectReceipt();cropLang=$('#ocr-language')?.value||cropLang;cropSrc=file;crop={l:.04,t:.03,r:.96,b:.97};cropTouched=false;cropMeta=null;cropSheet();
 const seq=++cropSeq,say=(t:string)=>{const el=document.querySelector('#modal-root .rcrop-status');if(el)el.textContent=t};say(T('Đang tìm vùng các dòng hàng…','Finding the item lines…'));
 try{const r=await suggestCrop(file);if(seq!==cropSeq||cropSrc!==file)return;cropMeta=r?.meta||null;
  if(r?.frame&&!cropTouched){crop=r.frame;cropPlace();say(T(`Đã đặt khung sát ${r.items} dòng hàng. Kéo cạnh để chỉnh nếu cần, rồi bấm Đọc.`,`The frame is set around ${r.items} item lines. Drag an edge if needed, then tap Read.`))}
  else say(r?.frame?T('Bạn đã chỉnh khung.','You set the frame.'):T('Chưa tìm thấy dòng hàng — kéo khung sát các dòng chữ.','No item lines found yet — drag the frame close to the printed lines.'))}
 catch{if(seq===cropSeq)say(T('Kéo khung sát các dòng chữ của hóa đơn.','Drag the frame close to the printed lines.'))}};
const pct=(v:number)=>Math.round(v*1000)/10+'%';
function cropPlace(){const box=document.querySelector('.rcrop-box') as HTMLElement|null;if(!box)return;box.style.left=pct(crop.l);box.style.top=pct(crop.t);box.style.width=pct(crop.r-crop.l);box.style.height=pct(crop.b-crop.t);
 for(const h of document.querySelectorAll('.rcrop-h') as any){const k=h.dataset.edge;h.setAttribute('aria-valuenow',String(Math.round((crop as any)[k]*100)))}}
function cropSheet(){if(cropURL)URL.revokeObjectURL(cropURL);cropURL=URL.createObjectURL(cropSrc);
 const edge=(k:string,vi:string,en:string)=>`<div class="rcrop-h rcrop-${k}" data-edge="${k}" role="slider" tabindex="0" aria-label="${esc(T(vi,en))}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span aria-hidden="true"></span></div>`;
 modal(T('Cắt hóa đơn','Crop the receipt'),`<p class="hint receipt-beta"><span class="pill beta-pill">Beta</span> ${T('Đọc hoá đơn từ ảnh đang thử nghiệm.','Reading receipts from a photo is in testing.')}</p><p class="hint">${T('Kéo 4 cạnh khung xanh sát các dòng chữ của hóa đơn (bỏ mặt bàn, ngón tay, phần trống). Đọc phần đã cắt sẽ đúng hơn.','Drag the four edges of the green frame close to the printed lines (leave out the bench, fingers and blank paper). Reading the cropped part is more accurate.')}</p>
  <p class="hint rcrop-status" role="status" aria-live="polite"></p><div class="rcrop-wrap"><div class="rcrop-stage"><img class="rcrop-img" src="${cropURL}" alt="${esc(T('Ảnh hóa đơn để cắt','Receipt photo to crop'))}" draggable="false"><div class="rcrop-box" data-edge="move">${edge('t','Cạnh trên','Top edge')}${edge('b','Cạnh dưới','Bottom edge')}${edge('l','Cạnh trái','Left edge')}${edge('r','Cạnh phải','Right edge')}</div></div></div>`,
  `<button class="btn" type="button" data-rcrop="whole">${T('Đọc cả ảnh','Read the whole photo')}</button><button class="btn primary" type="button" data-rcrop="read">${T('Đọc phần đã cắt','Read the cropped part')}</button>`,true);
 document.querySelector('.modal')?.classList.add('rcrop-modal');cropPlace()}
let cropDrag:any=null;
document.addEventListener('pointerdown',e=>{const t=(e.target as any)?.closest?.('.rcrop-h,.rcrop-box');if(!t)return;const stage=document.querySelector('.rcrop-stage') as HTMLElement;if(!stage)return;e.preventDefault();const k=t.classList.contains('rcrop-h')?t.dataset.edge:'move';
 cropTouched=true;cropDrag={k,id:e.pointerId,x:e.clientX,y:e.clientY,start:{...crop},rect:stage.getBoundingClientRect()};try{t.setPointerCapture(e.pointerId)}catch{}});
document.addEventListener('pointermove',e=>{const d=cropDrag;if(!d||d.id!==e.pointerId)return;const dx=(e.clientX-d.x)/d.rect.width,dy=(e.clientY-d.y)/d.rect.height,s=d.start,MIN=.08,c=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
 if(d.k==='move'){const w=s.r-s.l,h=s.b-s.t,l=c(s.l+dx,0,1-w),t=c(s.t+dy,0,1-h);crop={l,t,r:l+w,b:t+h}}
 else if(d.k==='l')crop.l=c(s.l+dx,0,crop.r-MIN);else if(d.k==='r')crop.r=c(s.r+dx,crop.l+MIN,1);else if(d.k==='t')crop.t=c(s.t+dy,0,crop.b-MIN);else if(d.k==='b')crop.b=c(s.b+dy,crop.t+MIN,1);cropPlace()});
const cropEnd=(e:any)=>{if(cropDrag&&cropDrag.id===e.pointerId)cropDrag=null};document.addEventListener('pointerup',cropEnd);document.addEventListener('pointercancel',cropEnd);
document.addEventListener('keydown',e=>{const h=(e.target as any)?.closest?.('.rcrop-h');if(!h)return;const k=h.dataset.edge,step=e.shiftKey?.05:.01,dir=({ArrowLeft:-1,ArrowUp:-1,ArrowRight:1,ArrowDown:1} as any)[e.key];if(!dir)return;e.preventDefault();cropTouched=true;
 const MIN=.08,c=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));if(k==='l')crop.l=c(crop.l+dir*step,0,crop.r-MIN);if(k==='r')crop.r=c(crop.r+dir*step,crop.l+MIN,1);if(k==='t')crop.t=c(crop.t+dir*step,0,crop.b-MIN);if(k==='b')crop.b=c(crop.b+dir*step,crop.t+MIN,1);cropPlace()});
async function croppedFile(){const bmp=await createImageBitmap(cropSrc);const sx=Math.round(crop.l*bmp.width),sy=Math.round(crop.t*bmp.height),sw=Math.max(1,Math.round((crop.r-crop.l)*bmp.width)),sh=Math.max(1,Math.round((crop.b-crop.t)*bmp.height));
 const cv=document.createElement('canvas');cv.width=sw;cv.height=sh;cv.getContext('2d')!.drawImage(bmp,sx,sy,sw,sh,0,0,sw,sh);bmp.close?.();
 const blob:Blob=await new Promise((ok,no)=>cv.toBlob(b=>b?ok(b):no(Error('crop')),'image/jpeg',.92));return new File([blob],'receipt-cropped.jpg',{type:'image/jpeg'})}
async function cropRead(whole:boolean){if(!cropSrc||ocrBusy)return;let file=cropSrc;if(!whole){try{file=await croppedFile()}catch{file=cropSrc}}
 const m=!whole&&cropMeta?cropMeta:null;if(m&&receiptDraft){if(!receiptDraft.store&&m.store)receiptDraft.store=m.store;if(m.date)receiptDraft.date=m.date}
 receiptEditor();const sel=$('#ocr-language');if(sel)sel.value=cropLang;await ocrRead(file);
 /* the cropped part may leave out the shop, date and total: keep what the quick look read there */
 if(m&&receiptDraft){let changed=false;if(m.store&&receiptDraft.store!==m.store){receiptDraft.store=m.store;changed=true}if(m.date&&receiptDraft.date!==m.date){receiptDraft.date=m.date;changed=true}if((receiptDraft.total==null||receiptDraft.total===0)&&m.total!=null){receiptDraft.total=m.total;changed=true}
  if(changed){const st=$('#ocr-status')?.textContent||'';receiptEditor();const s2=$('#ocr-status');if(s2)s2.textContent=st}}}
document.addEventListener('click',e=>{const b=(e.target as any)?.closest?.('[data-rcrop]');if(!b)return;e.preventDefault();const a=b.dataset.rcrop;if(a==='again'){if(!cropSrc)return;collectReceipt();cropLang=$('#ocr-language')?.value||cropLang;cropSheet();return}cropRead(a==='whole')});
// v1.7.14 (owner, 8 Nov 2026: “tại sao khi scan receipt lại ra đống chữ khó đọc? … scan xong trong text đó scrollable, từng dòng table 1 ô
// tên sp, số lượng và giá”): once there are lines, they show as a table that scrolls — name, amount, unit and price on each row, what it
// matches underneath — and the text read from the photo folds away under “Chữ đọc được từ ảnh” (open it to fix or paste).
function receiptTableLayout(){const root=document.getElementById('modal-root');const lines=root?.querySelector('#receipt-lines') as HTMLElement|null;const raw=root?.querySelector('#receipt-raw');if(!lines||!raw)return;
 const has=!!root!.querySelector('#receipt-lines .receipt-line');lines.classList.toggle('receipt-table',has);
 if(has&&!lines.querySelector('.receipt-table-head'))lines.insertAdjacentHTML('afterbegin',`<div class="receipt-table-head" aria-hidden="true"><span class="rt-name">${T('Tên sản phẩm','Item')}</span><span class="rt-qty">${T('SL','Qty')}</span><span class="rt-unit">${T('Đơn vị','Unit')}</span><span class="rt-price">${T('Giá','Price')}</span></div>`);
 if(has)for(const q of root!.querySelectorAll('#receipt-lines .receipt-qty') as any)q.placeholder=T('SL','Qty');
 const field=raw.closest('.field'),tools=root!.querySelector('[data-feature="receipt-parse"]')?.closest('.toolbar');if(!field||root!.querySelector('.receipt-raw-fold'))return;
 const det=document.createElement('details');det.className='simple-disclosure receipt-raw-fold';det.open=!has;det.innerHTML=`<summary>${T('Chữ đọc được từ ảnh (sửa hoặc dán nếu cần)','Text read from the photo (fix or paste if needed)')}</summary>`;
 field.before(det);det.append(field);if(tools)det.append(tools);if(has)lines.after(det)}
{const editorBase=receiptEditor;receiptEditor=function(...a:any[]){const r=editorBase.apply(this,a);try{receiptTableLayout();/* Henry, 13 Nov 2026: “nếu bị lỗi như vầy thì nên ghi chữ beta hoặc testing mode để user biết” */{const tools=document.querySelector('#modal-root .receipt-entry-tools');if(tools&&!(globalThis as any).BEP_LEGACY&&!document.querySelector('#modal-root .receipt-beta'))tools.insertAdjacentHTML('afterend',`<p class="hint receipt-beta"><span class="pill beta-pill">Beta</span> ${T('Đọc hoá đơn từ ảnh đang thử nghiệm và có thể đọc sai. Kiểm tra từng dòng, ngày và tổng trước khi lưu.','Reading receipts from a photo is still in testing and can get things wrong. Check each line, the date and the total before saving.')}</p>`)}if((globalThis as any).BEP_LEGACY){const tools=document.querySelector('#modal-root .receipt-entry-tools');if(tools&&!document.querySelector('#modal-root .legacy-note')){for(const b of tools.querySelectorAll('[data-feature="receipt-camera"],[data-feature="receipt-file"],#ocr-language') as any)b.remove();tools.insertAdjacentHTML('afterend',`<p class="legacy-note">${T('Máy này chưa đọc được ảnh hoá đơn. Bạn dán hoặc gõ các dòng hàng ở dưới.','This device cannot read receipt photos yet. Paste or type the item lines below.')}</p>`)}}const img=document.querySelector('#modal-root .receipt-image');if(img&&cropSrc&&!document.querySelector('#modal-root [data-rcrop="again"]'))img.insertAdjacentHTML('afterend',`<button class="btn small soft rcrop-again" type="button" data-rcrop="again">${T('Cắt lại ảnh','Crop the photo again')}</button>`)}catch(err){console.warn('crop again',err)}return r}}
(globalThis as any).ReceiptCrop={get:()=>({...crop}),set:(c:any)=>{crop={...crop,...c};cropPlace()},open:(file:any)=>readReceiptPhoto(file),read:(whole:boolean)=>cropRead(!!whole)};
function summaryText(p,conf){const n=p.items.filter(i=>i.kind==='item').length;return T(`Đọc ảnh hoá đơn đang thử nghiệm (Beta) · Đã đọc ${n} dòng món${p.store?' · '+p.store:''}${p.date?' · '+p.date:''}${p.time?' '+p.time:''} · độ tin cậy OCR ${Math.round(conf||0)}%. Kiểm tra tên, khối lượng, ngày và tổng tiền trước khi lưu.`,`Reading receipt photos is in testing (beta) · Read ${n} item line(s)${p.store?' · '+p.store:''}${p.date?' · '+p.date:''}${p.time?' '+p.time:''} · OCR confidence ${Math.round(conf||0)}%. Check names, amounts, date and total before saving.`)}

// ------------------------------------------------------------ form decorations
const oldRows=receiptLineRows;
receiptLineRows=function(){
 let html=oldRows();const d=receiptDraft;if(!d)return html;
 return html.replace(/(<article class="receipt-line" data-index="(\d+)">)([\s\S]*?)(<\/article>)/g,(all,open,idx,inner,close)=>{const it=d.items[+idx];const h=it?.hint||[];const kind=it?.extra?.lineKind;return(kind&&kind!=='item'?open.replace('class="receipt-line"',`class="receipt-line receipt-line-${kind}"`):open)+inner+(h.length?`<p class="receipt-line-hint">${h.map(x=>`<span>${esc(x)}</span>`).join('')}</p>`:'')+close});
};
function warningsHtml(d){
 const w=(d.meta?.warnings||[]);if(!w.length)return'';
 return`<div class="receipt-warnings" role="status" aria-live="polite">${w.map(x=>`<p class="receipt-warning receipt-warning-${esc(x.code)}">${esc(RP.warningText(x,lang()))}</p>`).join('')}</div>`;
}
const oldEditor=receiptEditor;
receiptEditor=function(){
 const d=receiptDraft;oldEditor();if(!d)return;
 const status=$('#ocr-status');
 if(status){status.insertAdjacentHTML('afterend',warningsHtml(d));if(d.meta?.source==='scout')status.insertAdjacentHTML('beforebegin',`<p class="callout receipt-from-scout">${esc(T('Hoá đơn chụp từ So Giá: lưu khoản chi để giá vào So Giá; chia sẻ từng dòng ở “Giá đã ghi gần đây”.','Receipt captured from Price Check: save it as spending to add its prices; share single lines from “Recently recorded prices”.'))}</p>`)}
 const total=$('#receipt-total');if(total){if(d.total==null||Number.isNaN(d.total))total.value='';if(d.refund){total.removeAttribute('min');total.min='-999999999'}}
 const mark=$('#receipt-mark-bought');
 if(mark){const label=mark.closest('label'),hint=label?.nextElementSibling;mark.checked=false;label?.remove();if(hint&&hint.classList.contains('hint'))hint.textContent=d.refund?T('Hoá đơn hoàn tiền không thay đổi danh sách đi chợ hay tủ thực phẩm.','A refund does not change the shopping list or the pantry.'):T('Sau khi lưu, app đối chiếu với danh sách đi chợ tuần này và tủ thực phẩm; bạn chọn dòng nào được cập nhật.','After saving, the app compares this receipt with this week’s shopping list and pantry; you choose what to update.')}
 const saved=d.editing&&state.receipts.find(r=>r.id===d.id);
 const foot=document.querySelector('.receipt-modal footer, .receipt-modal .modal-footer, .modal.receipt-modal > footer');
 if(saved&&!saved.refund&&foot&&!foot.querySelector('[data-rui="reconcile"]'))foot.insertAdjacentHTML('afterbegin',`<button class="btn" data-rui="reconcile" data-id="${esc(saved.id)}">${esc(T('Đối chiếu đi chợ & kho','Check shopping & pantry'))}</button>`);
};

// Editing a saved receipt keeps its receipt facts (refund, printed time / count, hash, reconciliation).
const RECORD_KEYS=['retailer','refund','printed','source','receiptKey','reconciled'],LINE_KEYS=['lineKind','code','size','weightKg','perKg','multi','discount','nonFood','generic','genericKey','plu','unknown','covers','basket','splitFrom','per'];
const oldOpen=openReceipt;
openReceipt=async function(id){
 await oldOpen(id);const r=state.receipts.find(x=>x.id===id),d=receiptDraft;if(!r||!d||d.id!==id)return;
 d.extra={};for(const k of RECORD_KEYS)if(r[k]!==undefined)d.extra[k]=r[k];d.refund=!!r.refund;d.dupDecided=true;
 for(const it of d.items){const src=(r.items||[]).find(x=>x.id===it.id);if(!src)continue;const e={};for(const k of LINE_KEYS)if(src[k]!==undefined)e[k]=src[k];it.extra=e;
  it.hint=lineHint({kind:e.lineKind||'item',weight:e.weightKg?{qty:e.weightKg}:null,perKg:e.perKg,multi:e.multi,discount:e.discount,nonFood:e.nonFood,generic:e.generic});
  // v1.7.18: a choice made when the receipt is opened again is remembered for this store too
  if((!e.lineKind||e.lineKind==='item')&&!e.generic){it.memKeys=RP.memoryKeys({name:it.label,code:e.code||null},r.retailer||null);it.askQty=!e.size&&!e.weightKg}
   // v1.7.2: a generic line saved as "Đồ khác (chưa rõ)" opens unmatched again, so it can still be matched
   if(e.generic&&e.unknown&&it.match==='other')it.match=''}
 receiptEditor();
};

// ------------------------------------------------------------ save: duplicate check, memory, reconciliation
const oldSave=saveReceipt;
saveReceipt=async function(confirmed=false){
 collectReceipt();const d=receiptDraft;
 if(!d||ocrBusy)return oldSave(confirmed);
 if(d.meta&&d.meta.printedTotal==null&&!d.editing&&!(d.total>0||d.total<0)){toast(T('Không thấy tổng tiền in trên hoá đơn — nhập tổng thực trả trước khi lưu.','No printed total was found — enter the amount paid before saving.'),true);$('#receipt-total')?.focus();return}
 if(d.refund&&d.total>0)d.total=-d.total;
 if(!d.editing&&!d.dupDecided){
  d.extra=d.extra||{};
  try{if(d.meta)d.extra.receiptKey=await RP.receiptKey({...d.meta,store:d.store,date:d.date,printedTotal:d.total},SALT)||undefined}catch{}
  const dup=RP.findDuplicate({id:d.id,store:d.store,retailer:d.meta?.retailer,date:d.date,time:d.meta?.time||null,total:d.total,count:d.meta?.printedCount!=null?Math.abs(d.meta.printedCount):null,receiptKey:d.extra.receiptKey||null},state.receipts||[]);
  if(dup.kind){duplicateSheet(dup);return}
  d.dupDecided=true;
 }
 if(d.extra&&d.extra.receiptKey===undefined)delete d.extra.receiptKey;
 const id=d.id,editing=d.editing,pairs=d.items.filter(i=>i.match&&i.memKeys?.length).map(i=>[i.memKeys,i.match]);
 const lines=d.items.map(i=>({id:i.id,keys:i.memKeys||[],ask:!!i.askQty,qty:i.qty,unit:i.unit,per:i.extra?.per,count:i.extra?.multi?.count||1,match:i.match}));
 await oldSave(confirmed);
 const rec=receiptDraft===null&&state.receipts.find(r=>r.id===id);if(!rec)return;
 // remember the family's confirmed mapping (retailer + code / name → ingredient)
 let learned=0;for(const[keys,match]of pairs)for(const k of keys)if(state.aliases[k]!==match){state.aliases[k]=match;learned++}
 // v1.7.18: an amount in a bottle / pack / the family's unit counts in the ingredient's base unit when it can be converted
 // (registry units, “1 chai ≈ 1.5 L” entered once); an amount the receipt did not print is remembered for this store item
 if(RL)for(const l of lines){const it=(rec.items||[]).find(x=>x.id===l.id);if(!it||!hasIng(it.ingredient))continue;
  if(it.quantity==null){const q=RL.baseQuantity(it.enteredQty,it.enteredUnit,it.ingredient,{per:it.per,s:state});if(q>0&&q<=1e6){it.quantity=q;learned++}}
  if(l.ask&&l.keys.length&&+l.qty>0&&l.unit&&l.unit!=='pack')learned+=RL.rememberQty(state,l.keys,{qty:+l.qty/l.count,unit:l.unit,per:l.per})}
 if(learned)save();
 if(!editing&&!rec.refund&&(rec.currency||'AUD')===currentCurrency(state))reconcileSheet(rec.id);
};
function duplicateSheet(dup){
 const r=dup.match,count=r.printed?.count??(r.items||[]).filter(i=>!i.lineKind||i.lineKind==='item').length;
 const when=r.createdAt?appTimeLabel(r.createdAt,{time:false,year:true,lang:lang()}):r.date;
 const what=`${r.store}, ${money(r.total,r.currency)}, ${count} ${T('món','items')}`;
 const body=dup.kind==='exact'?`<p>${esc(T(`Hoá đơn này có vẻ đã lưu ngày ${when} (${what}). Vẫn lưu?`,`This receipt seems to have been saved on ${when} (${what}). Save it anyway?`))}</p>`:`<p>${esc(T(`Có thể trùng: đã có hoá đơn ${what} ngày ${r.date}${r.printed?.time?' lúc '+r.printed.time:''}. Đây là lần mua khác?`,`Possible duplicate: a receipt for ${what} on ${r.date}${r.printed?.time?' at '+r.printed.time:''} is already saved. Is this a different purchase?`))}</p>`;
 modal(dup.kind==='exact'?T('Hoá đơn có vẻ đã lưu','Receipt may already be saved'):T('Có thể trùng hoá đơn','Possible duplicate receipt'),body+`<p class="hint">${esc(T('Không có gì bị xoá hay gộp tự động.','Nothing is deleted or merged automatically.'))}</p>`,
  `<button class="btn" data-rui="dup-view" data-id="${esc(r.id)}">${esc(T('Xem hoá đơn đã lưu','View saved receipt'))}</button><button class="btn" data-rui="dup-save">${esc(T('Vẫn lưu (lần mua khác)','Save anyway (another purchase)'))}</button><button class="btn primary" data-rui="dup-cancel">${esc(T('Không lưu','Don’t save'))}</button>`);
 document.querySelector('.modal')?.classList.add('receipt-dup-modal');
 (document.querySelector('[data-rui="dup-cancel"]') as any)?.focus();
}

// ------------------------------------------------------------ reconciliation (pure logic in receipt-list.ts)
function weekNeed(s,week,start,end){return RL.weekNeed(s,week,start,end)}
function reconcilePlan(s,rec,week,start,end){return RL.plan(s,rec,week,start,end)}
function applyReconcile(s,rec,week,start,end,ticked,choices){return RL.apply(s,rec,week,start,end,ticked,choices)}
function undoReconcile(s,rec){return RL.undo(s,rec)}
const unitAmt=(n,u)=>typeof unitAmountLabel==='function'?unitAmountLabel(n,u):n+' '+u;
const amt=(r,n)=>r.units?unitAmt(n,r.units):qtyText(n,baseUnit(r.ingredient));
function mealLabel(m){let day=m.date;try{day=new Intl.DateTimeFormat(lang()==='en'?'en-AU':'vi-VN',{weekday:'short',day:'numeric',month:'numeric'}).format(parseDate(m.date))}catch{}return(typeof mealName==='function'?mealName(m.type):m.type)+' '+day}
function destText(c){return!c||c.mode==='pantry'?T(' → cất kho',' → pantry'):c.mode==='none'?T(' → không theo dõi',' → not tracked'):T(' → dành cho ',' → kept for ')+(c.meal?(lang()==='en'?mealLabel(c.meal):mealLabel(c.meal).toLowerCase()):T('một bữa','a meal'))}
function statusText(r,c=null,dest=true){const destText2=(c)=>dest?destText(c):'';if(r.noConv)return T('Chưa quy đổi được · giữ theo ','No conversion · kept as ')+amt(r,r.extra)+destText2(c);if(r.status==='stored')return T('Đã cất vào tủ lúc đi chợ · không cộng thêm','Already put away after shopping · not added again');return r.status==='short'?T('Còn thiếu ','Still short ')+amt(r,r.short):r.status==='enough'?T('Đủ','Enough'):r.status==='enough-extra'?T('Đủ · dư ','Enough · extra ')+amt(r,r.extra)+destText2(c):(r.onList?T('Dư ','Extra '):T('Ngoài danh sách · ','Not on the list · '))+amt(r,r.extra)+destText2(c)}
function boughtText(r){return r.same?`${r.parts.length} × ${amt(r,r.parts[0])} = ${amt(r,r.bought)}`:r.parts.length>1?r.parts.map(p=>amt(r,p)).join(' + ')+' = '+amt(r,r.bought):amt(r,r.bought)}
/* v1.7.19 (Tự chạy thử, Rà soát 12/11; rule 34): a receipt is checked against the family's menu week that holds the receipt's own
   date (the family's start day), not the week on screen */
function receiptWeekStart(rec){const d=DAY.test(rec?.date||'')?rec.date:(typeof sydneyDate==='function'?sydneyDate():weekStart);return typeof planStartOf==='function'?planStartOf(state,d):weekStart}
function weekRange(rec){const s=receiptWeekStart(rec);return[s,addDays(s,6)]}
function receiptWeek(rec){const s=receiptWeekStart(rec);return typeof planWeek==='function'?planWeek(state,s):currentWeek()}
(globalThis as any).ReceiptWeek={range:weekRange,week:receiptWeek};
function reconcileSheet(id){
 const rec=state.receipts.find(r=>r.id===id);if(!rec)return;
 const[start,end]=weekRange(rec),week=receiptWeek(rec),plan=reconcilePlan(state,rec,week,start,end);
 // v1.7.18: what is on the list comes first (“Đủ”), then extras. The extra part goes to the pantry by default; per line it can be
 // kept for a later planned meal or not tracked (spending only). Undo covers every choice.
 const done=rec.reconciled?.choices||{},from=DAY.test(rec.date||'')&&rec.date>(typeof sydneyDate==='function'?sydneyDate():'')?rec.date:(typeof sydneyDate==='function'?sydneyDate():rec.date);
 const ordered=plan.rows.map((r,i)=>({r,i})).sort((a,b)=>(+!a.r.onList)-(+!b.r.onList)||a.i-b.i).map(x=>x.r);
 const rows=ordered.map((r,i)=>{const meals=r.extra>0&&!rec.reconciled?RL.mealsUsing(state,r.ingredient,from):[];
  const choice=r.extra>0&&!rec.reconciled?`<div class="reconcile-choice" role="radiogroup" data-rlx="${esc(r.ingredient)}" aria-label="${esc(T('Phần dư của ','Extra of ')+ingName(r.ingredient))}"><span class="rc-label">${esc(T('Phần dư','Extra'))}</span>`+
   `<label class="rc-opt"><input type="radio" name="rc-${i}" value="pantry" checked><span>${esc(T('Cất kho','Pantry'))}</span></label>`+
   `<label class="rc-opt${meals.length?'':' rc-off'}"><input type="radio" name="rc-${i}" value="meal" ${meals.length?'':'disabled'}><span>${esc(T('Dành cho bữa…','Keep for a meal…'))}</span></label>`+
   `<label class="rc-opt"><input type="radio" name="rc-${i}" value="none"><span>${esc(T('Không theo dõi','Don’t track'))}</span></label>`+
   (meals.length?`<select class="input rc-meal" aria-label="${esc(T('Bữa dùng phần dư','Meal that uses the extra'))}" hidden>${meals.map(m=>`<option value="${esc(m.date+'|'+m.type)}">${esc(mealLabel(m)+(m.names.length?' · '+m.names.join(', '):''))}</option>`).join('')}</select>`:`<small class="rc-note">${esc(T('Chưa có bữa sắp tới dùng món này','No upcoming meal uses this yet'))}</small>`)+(()=>{const pl=RL.placeFor?RL.placeFor(state,r.ingredient,rec):'fridge',u=RL.receiptUseBy?RL.receiptUseBy(r.ingredient,pl,rec,null):'';return`<label class="rc-useby"><span>${esc(T('Hạn dùng (ước tính, sửa được)','Use-by (estimate, you can change it)'))}</span><input type="date" class="input rc-useby-input" value="${esc(u)}" aria-label="${esc(T('Hạn dùng ước tính của ','Estimated use-by of ')+ingName(r.ingredient))}"></label>`})()+`<small class="rc-dest">${esc(destText(null).trim())}</small></div>`:'';
  return`<label class="reconcile-row reconcile-${r.status}" data-rlx-row="${esc(r.ingredient)}"><input type="checkbox" class="check" data-rui-tick="${esc(r.ingredient)}" ${rec.reconciled?'disabled':'checked'}><span class="reconcile-name"><b>${esc(ingName(r.ingredient))}</b><small>${esc(T('Mua','Bought'))}: ${esc(boughtText(r))}${r.onList&&r.need>0?' · '+esc(T('Cần tuần này','Needed this week'))+': '+esc(amt(r,r.need)):''}</small></span><span class="reconcile-status">${esc(statusText(r,done[r.ingredient],!!rec.reconciled))}</span></label>`+choice}).join('')+
  (plan.extras||[]).map(e=>`<label class="reconcile-row reconcile-enough"><input type="checkbox" class="check" data-rui-tick="${esc('x:'+e.id)}" ${rec.reconciled||e.done?'disabled':'checked'}><span class="reconcile-name"><b data-user-content>${esc(e.name)}</b><small>${esc(T('Trên hoá đơn','On the receipt'))}: ${esc(e.label)}</small></span><span class="reconcile-status">${esc(e.done?T('Đã đánh dấu mua','Ticked bought'):T('Trong danh sách → đã mua','On the list → bought'))}</span></label>`).join('');
 // v1.7.18: lines not matched yet — open the receipt to choose (Chọn từ danh sách đi chợ, Tìm món khác, …); the choice is remembered
 const open=(rec.items||[]).filter(i=>!i.ingredient&&!i.recipe&&i.kind==='pending'&&(!i.lineKind||i.lineKind==='item')&&!i.generic);
 const pending=open.length&&!rec.reconciled?`<div class="reconcile-unknown reconcile-open"><p><b>${esc(T(`${open.length} dòng chưa ghép`,`${open.length} line${open.length>1?'s':''} not matched yet`))}</b> · ${esc(T('vẫn tính vào chi tiêu','still counted in spending'))}</p><ul>${open.slice(0,6).map(l=>`<li>${esc(l.label)}</li>`).join('')}${open.length>6?'<li>…</li>':''}</ul><button class="btn small" data-rui="open-lines" data-id="${esc(rec.id)}">${esc(T('Mở hoá đơn để ghép','Open the receipt to match'))}</button></div>`:'';
 const unknown=plan.unknown.length?`<div class="reconcile-unknown"><p><b>${esc(T('Chưa rõ lượng — mở hoá đơn, nhập lượng một lần; lần sau app tự điền','Amount unknown — open the receipt and enter it once; next time it fills in by itself'))}</b></p><ul>${plan.unknown.map(l=>`<li>${esc(l.label)} → ${esc(ingName(l.ingredient))}</li>`).join('')}</ul></div>`:'';
 const body=`<p class="hint">${esc(T(`So hoá đơn ${rec.store} (${rec.date}) với danh sách đi chợ tuần ${start.slice(8)}/${start.slice(5,7)}–${end.slice(8)}/${end.slice(5,7)} (bữa đã lên × khẩu phần, trừ đồ trong tủ).`,`Compares the ${rec.store} receipt (${rec.date}) with the shopping list for the week ${start.slice(8)}/${start.slice(5,7)}–${end.slice(8)}/${end.slice(5,7)} (planned meals × portions, minus the pantry).`))}</p>`+
  (rows?`<div class="reconcile-list">${rows}</div>`:`<div class="callout">${esc(T('Chưa có dòng nào đối ứng nguyên liệu với khối lượng rõ ràng.','No line is matched to an ingredient with a known amount.'))}</div>`)+unknown+pending+
  `<p class="hint">${esc(T('Phần đã có trong danh sách được đánh dấu đã mua (mua thiếu thì giữ phần còn lại). Phần dư được thêm vào tủ với ngày mua; hạn dùng để trống. Mua hàng không bao giờ trừ tủ.','The part on the list is marked bought (a partial buy keeps the rest on the list). Extra goes into the pantry with the purchase date; expiry is left blank. A purchase never subtracts from the pantry.'))}</p>`+
  (rec.reconciled?`<p class="callout">${esc(T('Đã cập nhật đi chợ & kho từ hoá đơn này.','Shopping & pantry were already updated from this receipt.'))}</p>`:'');
 const actions=rec.reconciled?`<button class="btn" data-action="close-modal">${esc(T('Đóng','Close'))}</button><button class="btn primary" data-rui="undo" data-id="${esc(rec.id)}">${esc(T('Hoàn tác cập nhật','Undo the update'))}</button>`:`<button class="btn" data-action="close-modal">${esc(T('Để sau','Later'))}</button><button class="btn primary" data-rui="apply" data-id="${esc(rec.id)}" ${plan.rows.length||plan.extras?.length?'':'disabled'}>${esc(T('Cập nhật đi chợ & kho','Update shopping & pantry'))}</button>`;
 modal(T('Đối chiếu đi chợ & tủ thực phẩm','Check against shopping & pantry'),body,actions,true);
 document.querySelector('.modal')?.classList.add('reconcile-modal');
}
function undoBar(id){
 document.querySelector('.receipt-undo')?.remove();
 const bar=document.createElement('div');bar.className='receipt-undo';bar.setAttribute('role','status');
 bar.innerHTML=`<span>${esc(T('Đã cập nhật đi chợ & kho','Shopping & pantry updated'))}</span><button class="btn small" data-rui="undo" data-id="${esc(id)}">${esc(T('Hoàn tác','Undo'))}</button>`;
 document.body.appendChild(bar);clearTimeout(undoBar.t);undoBar.t=setTimeout(()=>bar.remove(),20000);
}

// ------------------------------------------------------------ So Giá: a receipt photo opens the same form
if(typeof scoutReadShot==='function'){
 const oldShot=scoutReadShot;
 scoutReadShot=async function(file,kind='screenshot'){
  if(!file||scoutBusy||file.size>20000000||!scoutOnline()||typeof loadOCR!=='function')return oldShot(file,kind);
  scoutBusy=true;modal(scoutT('Đang đọc ảnh…','Reading screenshot…'),`<p id="scout-ocr-status" role="status" aria-live="polite">${scoutT('Đang tải bộ đọc chữ…','Loading text reader…')}</p><p class="hint">${scoutT('Ảnh được đọc ngay trên máy của bạn, không tải lên.','The image is read on your device and not uploaded.')}</p>`);
  let res=null;
  try{res=await ocrText(file,{original:true,status:i=>{const el=document.getElementById('scout-ocr-status');if(el)el.textContent=`${i.status==='recognizing text'?scoutT('Đang đọc chữ','Reading text'):i.status} · ${Math.round((i.progress||0)*100)}%`}})}
  catch(e){scoutBusy=false;toast(scoutT('Không đọc được ảnh. Hãy dán chữ hoặc nhập tay.','Could not read the image. Paste the text or enter it by hand.'),true);scoutConfirm(scoutNewDraft({source:'screenshot'}));return}
  scoutBusy=false;
  const a=RP.parseReceipt(res.text),b=res.originalText?RP.parseReceipt(res.originalText):null;
  const isReceipt=RP.looksLikeReceipt(a)||b&&RP.looksLikeReceipt(b);
  if(isReceipt){
   const text=b&&RP.preferOther(a,b)?res.originalText:res.text;
   closeModal();newReceipt();try{receiptPhoto=await photoBlob(file);receiptPhotoURL=URL.createObjectURL(receiptPhoto)}catch{}
   const parsed=fillDraft(text,{keepStore:false});receiptDraft.meta.source='scout';receiptEditor();const st=$('#ocr-status');if(st)st.textContent=summaryText(parsed,res.confidence);return;
  }
  // a single shelf tag / product screenshot: the existing single-price flow on the plain photo text
  try{const text=res.originalText||res.text||'';const parsed=PS.parsePriceText(text,{catalog:scoutCatalog()});const draft=scoutFromParsed(parsed,'screenshot',text);scoutApplyWant(draft);draft.ocrPrice=parsed.price??null;draft.imageHash=await scoutHash(file);draft.capturedAt=new Date(file.lastModified||Date.now()).toISOString();if(kind==='shelf-photo'){draft.evidenceType='shelf-photo';draft.file=file;draft.capturedAt=new Date(Math.min(Date.now(),file.lastModified||Date.now())).toISOString()}scoutConfirm(draft)}
  catch{scoutConfirm(scoutNewDraft({source:'screenshot'}))}
 };
}

document.addEventListener('click',async event=>{
 const el=event.target.closest?.('[data-rui]');if(!el||el.disabled)return;const a=el.dataset.rui,id=el.dataset.id;
 try{
  if(a==='dup-cancel'){receiptDraft=null;receiptPhoto=null;closeModal();toast(T('Chưa lưu hoá đơn này.','This receipt was not saved.'))}
  else if(a==='dup-save'){if(receiptDraft){receiptDraft.dupDecided=true;receiptDraft.allowDuplicate=true;await saveReceipt(false)}}
  else if(a==='dup-view'){receiptDraft=null;closeModal();await openReceipt(id)}
  else if(a==='reconcile'){collectReceipt();reconcileSheet(id)}
  else if(a==='open-lines'){closeModal();await openReceipt(id);const first=document.querySelector('#modal-root .rl-box .rl-options');first?.closest('.receipt-line')?.scrollIntoView({block:'start'})}
  else if(a==='apply'){const rec=state.receipts.find(r=>r.id===id);if(!rec)return;const ticked=[...document.querySelectorAll('[data-rui-tick]')].filter(x=>(x as any).checked).map(x=>(x as any).dataset.ruiTick);const choices={};for(const g of document.querySelectorAll('#modal-root .reconcile-choice[data-rlx]') as any){const v=g.querySelector('input[type=radio]:checked')?.value||'pantry';const ms=g.querySelector('.rc-meal')?.value||'';const[date,type]=ms.split('|');choices[g.dataset.rlx]=v==='meal'&&date?{mode:'meal',meal:{date,type}}:{mode:v==='meal'?'pantry':v};const ub=g.querySelector('.rc-useby-input');if(ub)choices[g.dataset.rlx].useBy=ub.value||''}const[start,end]=weekRange(rec);applyReconcile(state,rec,receiptWeek(rec),start,end,ticked,choices);if(typeof log==='function')log(T('Cập nhật đi chợ & kho từ hoá đơn ','Shopping & pantry updated from receipt ')+rec.store);save();closeModal();render();undoBar(id)}
  else if(a==='undo'){const rec=state.receipts.find(r=>r.id===id);if(rec&&undoReconcile(state,rec)){save(T('Đã hoàn tác cập nhật đi chợ & kho.','Shopping & pantry update undone.'));document.querySelector('.receipt-undo')?.remove();if(document.querySelector('.reconcile-modal'))closeModal();render()}}
 }catch(e){toast(e.message||String(e),true)}
});

// v1.7.18: choosing what happens to an extra updates its line in place (the tapped choice stays where it is)
document.addEventListener('change',e=>{const t=e.target as any,g=t?.closest?.('.reconcile-choice[data-rlx]');if(!g)return;const id=g.dataset.rlx,rec=state.receipts.find(r=>r.id===document.querySelector('#modal-root [data-rui="apply"]')?.getAttribute('data-id'));if(!rec)return;
 const v=g.querySelector('input[type=radio]:checked')?.value||'pantry',sel=g.querySelector('.rc-meal');if(sel)sel.hidden=v!=='meal';const ubl=g.querySelector('.rc-useby');if(ubl)ubl.hidden=v==='none';const[date,type]=(sel?.value||'').split('|');
 const dst=g.querySelector('.rc-dest');if(dst)dst.textContent=destText(v==='meal'?{mode:'meal',meal:date?{date,type}:null}:{mode:v}).trim()});
Object.assign(globalThis,{ReceiptUI:{itemFrame,suggestCrop,receiptWeeks,statusText,draftFromParsed,fillDraft,reconcilePlan,applyReconcile,undoReconcile,weekNeed,duplicateSheet,reconcileSheet,SALT}});
})();
