'use strict';
// v1.7.18 receipt ↔ shopping list in the receipt form (owner, 12 Nov 2026). Each item line says how sure the match is — “Chắc chắn”,
// “Gợi ý — kiểm tra” or “Chưa ghép” (words, no drawings: these are not main buttons) — and why (on this week's list, matched before at
// this store, from the ingredient list). A line that is not sure gets one-tap choices:
//  • Chọn từ danh sách đi chợ — this week's list (and the family's own list lines), nearest name first;
//  • Tìm món khác — the existing search box of the line (receipt-match-picker.ts);
//  • Thêm món mới vào kho — a new family ingredient named as on the receipt, in the line's unit;
//  • Không phải đồ nấu — spending only; • Để sau — stays unmatched (spending keeps the full receipt).
// The choice is remembered per store when the receipt is saved (state.aliases, receipt-ui.ts). A line matched to an ingredient
// whose amount the receipt does not print asks once for amount + unit and, for a bottle / pack, “1 chai ≈ … L”; it is remembered
// for this store item (state.receiptQty, receipt-list.ts). Nothing is guessed. Changes redraw only that line's box, so the tapped
// line stays where it is.
(function(){
const RL=(globalThis as any).ReceiptList;
if(!RL||typeof document==='undefined'||typeof receiptLineRows!=='function')return;
const T=(vi:string,en:string)=>typeof tr==='function'?tr(vi,en):vi;
const en=()=>typeof appLanguage!=='undefined'&&appLanguage==='en';
const hasIng=(id:any)=>!!id&&Object.hasOwn(INGREDIENTS,id);
const ingName=(id:string)=>hasIng(id)?(en()&&typeof INGREDIENT_EN!=='undefined'&&INGREDIENT_EN[id]||(typeof shopIngName==='function'?shopIngName(id):INGREDIENTS[id][0])):id;
const qtyText=(n:number,u:string)=>typeof fmtQty==='function'?fmtQty(n,u):n+' '+u;
let openList:number|null=null;

function weeks(){const d:any=receiptDraft;const rw=(globalThis as any).ReceiptUI?.receiptWeeks;return rw?rw(d?.date||''):[]}
function lineItem(i:number){return(receiptDraft as any)?.items?.[i]||null}
function eligible(it:any){const k=it?.extra?.lineKind;return!!it&&(!k||k==='item')&&!it.extra?.generic}
function stateOf(it:any){if(!it.match)return it.later?'later':'none';if(it.match==='other'&&!it.extra?.basket)return'other';return it.confidence==='suggested'?'check':'sure'}
const STATE:any={sure:['Chắc chắn','Sure'],check:['Gợi ý — kiểm tra','Suggestion — check it'],none:['Chưa ghép','Not matched'],later:['Để sau','Later'],other:['Không phải đồ nấu','Not for cooking']};
function reason(it:any,st:string){
 if(st==='other')return T('chỉ tính vào chi tiêu','counted in spending only');
 if(st==='later')return T('vẫn tính vào chi tiêu; ghép sau khi mở lại hoá đơn','still counted in spending; match it when you reopen the receipt');
 if(st==='none')return it.prepared?T('món làm sẵn — chọn bên dưới','ready-made — choose below'):T('chọn bên dưới','choose below');
 if(it.extra?.basket)return T('có trong danh sách: ','on the list: ')+it.extra.basket.name;
 return it.src==='list'?T('có trong danh sách đi chợ tuần này','on this week’s shopping list'):it.src==='memory'?T('đã ghép trước đây ở cửa hàng này','matched before at this store'):it.src==='family'?T('bạn đã chọn','your choice'):it.src==='nonfood'?T('không phải thực phẩm','not food'):T('từ danh mục nguyên liệu','from the ingredient list');
}
function baseOf(it:any){return hasIng(it.match)?INGREDIENTS[it.match][1]:null}
function perUnits(base:string){return base==='g'?['g','kg']:base==='ml'?['ml','l']:[base]}
function unitWord(u:string){return u==='l'?T('lít','L'):typeof unitLabel==='function'?unitLabel(u):u}
function qtyHtml(it:any){
 if(!hasIng(it.match))return'';const base=baseOf(it)!,qty=+it.qty,unit=it.unit||'';const per=it.extra?.per;
 const have=qty>0&&unit&&unit!=='pack'?RL.baseQuantity(qty,unit,it.match,{per,s:state}):null;
 if(!it.askQty&&have!=null)return'';
 const store=(receiptDraft as any)?.store||T('cửa hàng này','this store');
 let body='';
 if(!(qty>0)||!unit||unit==='pack')body=`<p class="rl-ask">${esc(T(`Hoá đơn không in lượng. Nhập lượng mua ở ô SL và Đơn vị một lần — lần sau món này ở ${store} tự điền.`,`The receipt prints no amount. Enter it once in Qty and Unit — next time this item at ${store} fills in by itself.`))}</p>`;
 else if(have==null){const pu=it._perUnit&&perUnits(base).includes(it._perUnit)?it._perUnit:perUnits(base)[perUnits(base).length-1];const shown=per>0?Math.round(per/factor(pu,base)*1000)/1000:'';
  body=`<div class="rl-per"><span>1 ${esc(unitWord(unit))} ≈</span><input class="input rl-per-qty" type="number" inputmode="decimal" min="0.001" max="1000000" step="any" value="${shown}" aria-label="${esc(T('Một '+unitWord(unit)+' bằng bao nhiêu','How much is one '+unitWord(unit)))}" placeholder="?"><select class="input rl-per-unit" aria-label="${esc(T('Đơn vị quy đổi','Conversion unit'))}">${perUnits(base).map(u=>`<option value="${esc(u)}" ${u===pu?'selected':''}>${esc(unitWord(u))}</option>`).join('')}</select></div><p class="rl-ask">${esc(T('Không bắt buộc — để trống thì đối chiếu theo '+unitWord(unit)+' nếu danh sách cũng mua bằng '+unitWord(unit)+'.','Optional — leave it empty to compare in '+unitWord(unit)+' when the list also buys in '+unitWord(unit)+'.'))}</p>`}
 const result=have!=null?`<p class="rl-have">= ${esc(qtyText(have,base))}${it.askQty?esc(T(' · app sẽ nhớ cho lần sau',' · remembered for next time')):''}</p>`:'';
 return`<div class="rl-qty">${body}${result}</div>`;
}
function factor(u:string,base:string){const a=typeof findUnit==='function'?findUnit(u):null,b=typeof findUnit==='function'?findUnit(base):null;return a&&b&&a.factor&&b.factor&&a.dim===b.dim?a.factor/b.factor:1}
function listHtml(it:any){
 const cands=RL.listFor(state,weeks()),ranked=RL.rankList(it,cands,ingName).slice(0,8);
 if(!ranked.length)return`<div class="rl-list"><p class="rl-ask">${esc(T('Danh sách đi chợ tuần này đang trống. Dùng “Tìm món khác”.','This week’s shopping list is empty. Use “Find another item”.'))}</p></div>`;
 return`<div class="rl-list" role="group" aria-label="${esc(T('Danh sách đi chợ, gần tên nhất trước','Shopping list, closest name first'))}">${ranked.map((c:any)=>`<button type="button" class="btn small rl-pick" data-rl="pick" data-kind="${c.kind}" data-id="${esc(c.id)}"><span data-user-content>${esc(c.name)}</span></button>`).join('')}</div>`;
}
function boxHtml(it:any,i:number){
 if(!eligible(it))return'';const st=stateOf(it);
 const opts=st==='sure'?'':`<div class="rl-options">${st==='check'?`<button type="button" class="btn small" data-rl="ok">${esc(T('Đúng, giữ gợi ý','Yes, keep it'))}</button>`:''}<button type="button" class="btn small" data-rl="list" aria-expanded="${openList===i}">${esc(T('Chọn từ danh sách đi chợ','Pick from the shopping list'))}</button><button type="button" class="btn small" data-rl="search">${esc(T('Tìm món khác','Find another item'))}</button><button type="button" class="btn small" data-rl="new">${esc(T('Thêm món mới vào kho','Add as a new item'))}</button>${st!=='other'?`<button type="button" class="btn small" data-rl="other">${esc(T('Không phải đồ nấu','Not for cooking'))}</button>`:''}${st!=='later'?`<button type="button" class="btn small" data-rl="later">${esc(T('Để sau','Decide later'))}</button>`:''}</div>`;
 return`<p class="rl-head"><span class="rl-state rl-${st}">${esc(T(STATE[st][0],STATE[st][1]))}</span><small>${esc(reason(it,st))}</small></p>${opts}${openList===i&&st!=='sure'?listHtml(it):''}${qtyHtml(it)}`;
}
function summaryHtml(){const items=((receiptDraft as any)?.items||[]).filter(eligible);if(!items.length)return'';const n:any={sure:0,check:0,none:0};for(const it of items){const s=stateOf(it);n[s==='other'?'sure':s==='later'?'none':s]++}
 return T(`${n.sure} dòng chắc chắn · ${n.check} gợi ý cần kiểm tra · ${n.none} chưa ghép`,`${n.sure} sure · ${n.check} to check · ${n.none} not matched`)}
function refresh(i:number){const line=document.querySelector(`#modal-root .receipt-line[data-index="${i}"]`);const box=line?.querySelector('.rl-box') as HTMLElement|null;if(box)box.innerHTML=boxHtml(lineItem(i),i);const sum=document.querySelector('#modal-root .rl-summary');if(sum)sum.textContent=summaryHtml()}

const oldRows=receiptLineRows;
receiptLineRows=function(){const html=oldRows();const d:any=receiptDraft;if(!d)return html;
 return html.replace(/(<article class="receipt-line[^"]*" data-index="(\d+)">)([\s\S]*?)(<\/article>)/g,(all:string,open:string,idx:string,inner:string,close:string)=>{const it=d.items[+idx];return eligible(it)?open+inner+`<div class="rl-box" data-i="${idx}" aria-live="polite">${boxHtml(it,+idx)}</div>`+close:all})};
const oldEditor=receiptEditor;
receiptEditor=function(...a:any[]){const d:any=receiptDraft;if(d&&d._rlId!==d.id){openList=null;d._rlId=d.id}const r=oldEditor.apply(this,a);const s=summaryHtml();const lines=document.querySelector('#modal-root #receipt-lines');
 if(s&&lines&&!document.querySelector('#modal-root .rl-summary'))lines.insertAdjacentHTML('beforebegin',`<p class="rl-summary" role="status">${esc(s)}</p>`);return r};

// ------------------------------------------------------------ actions
function select(i:number){return document.querySelector(`#modal-root .receipt-line[data-index="${i}"] select.receipt-match`) as HTMLSelectElement|null}
function setMatch(i:number,value:string,{basket=null,later=false}:any={}){const it=lineItem(i);if(!it)return;if(typeof collectReceipt==='function')collectReceipt();
 it.extra=it.extra||{};if(basket)it.extra.basket=basket;else delete it.extra.basket;it.match=value;it.confidence='';it.later=later;it.src=value?'family':'';
 if(value&&hasIng(value)&&it.qty==null){const w=it.extra.weightKg;if(w){it.qty=w;it.unit='kg'}}
 const sel=select(i);if(sel){if(value&&![...sel.options].some(o=>o.value===value)){const name=hasIng(value)?ingName(value):value;sel.insertAdjacentHTML('beforeend',`<option value="${esc(value)}">${esc(name)}</option>`)}sel.value=value;sel.dispatchEvent(new Event('change',{bubbles:true}))}
 const line=sel?.closest('.receipt-line');if(line&&it.qty!=null){const q=line.querySelector('.receipt-qty') as HTMLInputElement,u=line.querySelector('.receipt-unit') as HTMLSelectElement;if(q&&q.value==='')q.value=String(it.qty);if(u&&it.unit&&!u.value)u.value=it.unit}
 openList=null;refresh(i)}
// A new family ingredient named as on the receipt (size words left out), in the line's unit.
function newName(it:any){const raw=String(it.label||'').replace(/\b\d+(?:[.,]\d+)?\s?(?:kg|g|ml|l|pk|pack)\b/gi,'').replace(/\s+/g,' ').trim()||String(it.label||'').trim();return raw.toLowerCase().replace(/(^|[\s'/-])([a-zà-ỹ])/g,(m:string,a:string,b:string)=>a+b.toUpperCase()).slice(0,100)}
function newUnit(it:any){const u=it.unit||'';const units:string[]=typeof FAMILY_UNITS!=='undefined'?FAMILY_UNITS:['g','ml','quả','cái'];return u==='kg'||u==='g'?'g':u==='l'||u==='ml'?'ml':units.includes(u)?u:'cái'}
function addNew(i:number){const it=lineItem(i);if(!it)return;if(typeof collectReceipt==='function')collectReceipt();const s:any=state,name=newName(it);
 s.ingredientCatalog=s.ingredientCatalog&&typeof s.ingredientCatalog==='object'&&!Array.isArray(s.ingredientCatalog)?s.ingredientCatalog:{};
 const fold=(x:string)=>RL.norm(x);let id=Object.entries(s.ingredientCatalog).find(([,x]:any)=>fold(x.name)===fold(name))?.[0];
 if(!id){if(Object.keys(s.ingredientCatalog).length>=500){toast(T('Danh sách nguyên liệu riêng đã đầy (500).','Your own ingredient list is full (500).'),true);return}
  id='family-ing-'+uid();const unit=newUnit(it);s.ingredientCatalog[id]={name,unit,group:'dry'};(INGREDIENTS as any)[id]=[name,unit,'dry',0,'🌿',null]}
 setMatch(i,id!);toast(T(`Đã thêm “${name}” vào nguyên liệu của nhà — lưu hoá đơn để cất vào kho.`,`“${name}” added to your ingredients — save the receipt to put it in the pantry.`))}
document.addEventListener('click',e=>{const b=(e.target as any)?.closest?.('#modal-root [data-rl]') as HTMLElement|null;if(!b)return;const box=b.closest('.rl-box') as HTMLElement|null;if(!box)return;e.preventDefault();const i=+box.dataset.i!,it=lineItem(i);if(!it)return;const a=b.dataset.rl;
 if(a==='list'){openList=openList===i?null:i;refresh(i);(document.querySelector(`#modal-root .rl-box[data-i="${i}"] [data-rl="list"]`) as any)?.focus({preventScroll:true});return}
 if(a==='pick'){if(b.dataset.kind==='extra'){const x=RL.listFor(state,weeks()).extras.find((e:any)=>e.id===b.dataset.id);if(x)setMatch(i,'other',{basket:{key:'x:'+RL.norm(x.name),id:x.id,name:x.name}})}else setMatch(i,b.dataset.id||'');return}
 if(a==='ok'){it.confidence='';it.src=it.src||'family';refresh(i);return}
 if(a==='other'){setMatch(i,'other');return}
 if(a==='later'){setMatch(i,'',{later:true});return}
 if(a==='new'){addNew(i);return}
 if(a==='search'){const inp=document.querySelector(`#modal-root .receipt-line[data-index="${i}"] .rm-search`) as HTMLInputElement|null;if(inp){inp.focus({preventScroll:true});inp.value='';inp.dispatchEvent(new Event('input',{bubbles:true}))}else select(i)?.focus()}});
// A match chosen in the line's search box (or by voice) is the family's choice.
document.addEventListener('change',e=>{const t=e.target as any;const line=t?.closest?.('#modal-root .receipt-line');if(!line)return;const i=+line.dataset.index,it=lineItem(i);if(!eligible(it))return;
 if(t.classList.contains('receipt-match')){if(it.match!==t.value){it.match=t.value;it.confidence='';it.later=false;it.src=t.value?'family':'';if(it.extra&&t.value!=='other')delete it.extra.basket}refresh(i);return}
 if(t.classList.contains('receipt-unit')){if(typeof collectReceipt==='function')collectReceipt();refresh(i);return}
 if(t.classList.contains('rl-per-unit')){it._perUnit=t.value;setPer(line,it)}});
function setPer(line:Element,it:any){const v=+(line.querySelector('.rl-per-qty') as HTMLInputElement)?.value,u=(line.querySelector('.rl-per-unit') as HTMLSelectElement)?.value||'';it.extra=it.extra||{};
 if(v>0&&v<=1e6&&hasIng(it.match))it.extra.per=Math.round(v*factor(u,baseOf(it)!)*1000)/1000;else delete it.extra.per;
 const have=+it.qty>0&&it.unit?RL.baseQuantity(+it.qty,it.unit,it.match,{per:it.extra.per,s:state}):null;const box=line.querySelector('.rl-qty');if(!box)return;let p=box.querySelector('.rl-have');
 if(have==null){p?.remove();return}if(!p){box.insertAdjacentHTML('beforeend','<p class="rl-have"></p>');p=box.querySelector('.rl-have')}p!.textContent='= '+qtyText(have,baseOf(it)!)+(it.askQty?T(' · app sẽ nhớ cho lần sau',' · remembered for next time'):'')}
document.addEventListener('input',e=>{const t=e.target as any;const line=t?.closest?.('#modal-root .receipt-line');if(!line)return;const it=lineItem(+line.dataset.index);if(!eligible(it))return;
 if(t.classList.contains('rl-per-qty')){setPer(line,it);return}
 if(t.classList.contains('receipt-qty')){const had=!!line.querySelector('.rl-per, .rl-have');if(typeof collectReceipt==='function')collectReceipt();const now=+it.qty>0&&it.unit&&it.unit!=='pack';if(!had&&now||had&&!now)refresh(+line.dataset.index);else if(line.querySelector('.rl-have'))setPer(line,it)}});

// ------------------------------------------------------------ pantry: a lot kept for a meal says so
if(typeof renderPantry==='function'){const base=renderPantry;renderPantry=function(...a:any[]){let html=base.apply(this,a);for(const p of (state.pantry||[]) as any[]){if(!p.forMeal)continue;let day=p.forMeal.date;try{day=new Intl.DateTimeFormat(en()?'en-AU':'vi-VN',{weekday:'short',day:'numeric',month:'numeric'}).format(parseDate(p.forMeal.date))}catch{}
  const note=`<div class="stock-note rl-reserved">${esc(T('Dành cho ','Kept for ')+(typeof mealName==='function'?mealName(p.forMeal.type):p.forMeal.type).toLowerCase()+' '+day)}</div>`;
  html=html.replace(new RegExp(`(<div class="toolbar"><button class="btn small" data-action="edit-stock" data-id="${p.id.replace(/[^a-zA-Z0-9_-]/g,'')}")`),note+'$1')}return html}}
(globalThis as any).ReceiptListUI={stateOf,boxHtml,summaryHtml};
})();
