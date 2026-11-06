'use strict';
// v1.7.7 (owner, 6 Nov 2026): a round button next to each shopping quantity. A tap rounds the amount to a step a shop
// sells (1.88 kg → 1.9 kg; tap again → 2 kg …). A long press (or right-click) opens the options: round up or down, and
// the step — automatic (by size) or a fixed 50 g / 100 g / 250 g / 500 g / 1 kg (ml/L likewise, 1/2/5/10 for counted
// items). The choice is remembered for the family (preferences.qtyRound). It only changes the amount to buy for the
// dates shown, like the quantity picker; "Dùng lượng tự động" in the picker or the options undoes it.
// v1.7.8 (ladybug #21, 6 Nov 2026, 14:37 Sydney time: "Làm tròn lên con số nhỏ nhất gần đấy chứ sao từ 3.8 lên 50 vậy? Bỏ
// phần có mấy cái suggestion 250-500-1000… Ko cần thiết"): the step follows the size of the amount, so a round goes to the
// nearest round number (3.8 g → 4 g, 47 g → 50 g, 1.88 kg → 1.9 kg); the step options sheet is gone — ≈↓ and ≈↑ are all.
type QRMode={dir:'up'|'down'};
function qrKind(id:string){const u=INGREDIENTS[id]?.[1];return u==='g'?'g':u==='ml'?'ml':'count'}
function qrAutoStep(kind:string,v:number){if(kind==='count')return 1;return v<10?1:v<100?5:v<250?10:v<1000?50:v<3000?100:250}
/** Next amount: snap to the nearest step in the chosen direction; when already on a step, move one step. */
function qrNext(v:number,kind:string,mode:QRMode){const step=qrAutoStep(kind,v),eps=1e-9;
 if(mode.dir==='up'){const c=Math.ceil(v/step-eps)*step;return c>v+eps?c:c+step}
 const f=Math.floor(v/step+eps)*step;if(f<v-eps)return Math.max(step,f);
 const below=qrAutoStep(kind,v-1e-6);return Math.max(below,Math.floor((v-1e-6)/below)*below)}
function qrRow(id:string){const[start,end]=shopDates(),row=shopping(state,currentWeek(),start,end).find((r:any)=>r.id===id);return{start,end,row}}
function qrMeasured(row:any){if(!row)return false;const p=row.purchase;return !p||!p.unit||(typeof unitIsMeasured==='function'?unitIsMeasured(p.unit,INGREDIENTS[row.id][1]):['g','kg','ml','l'].includes(p.unit))}
function qrApply(id:string,mode:QRMode={dir:'up'}){const{start,end,row}=qrRow(id);if(!row||!qrMeasured(row))return;const v=Number(row.qty??row.suggested)||0,kind=qrKind(id),next=+qrNext(v,kind,mode).toFixed(3);
 setPurchaseQuantity(currentWeek(),start,end,id,next);save(tr(`Đã làm tròn ${INGREDIENTS[id][0]}: ${fmtQty(next,INGREDIENTS[id][1])}.`,`Rounded to ${fmtQty(next,INGREDIENTS[id][1])}.`));qrKeepPlace(id,render)}
// v1.7.9 (owner, 6 Nov 2026: "khi tôi nhấn round up/down web nó nhảy khắp nơi"): the list is redrawn after a round, so keep
// the tapped row exactly where it was on screen (and the focus on the same button)
function qrKeepPlace(id:string,draw:()=>void){const sel=`#main .shop-row button[data-action="purchase-quantity"][data-id="${CSS.escape(id)}"]`,before=document.querySelector(sel)?.getBoundingClientRect().top,dir=(document.activeElement as any)?.dataset?.qrDir;
 const root=document.documentElement,prev=root.style.overflowAnchor;root.style.overflowAnchor='none';/* Chrome's own scroll anchoring would move it a second time; iPhone has none */
 draw();const el=document.querySelector(sel);if(el&&before!=null){const after=el.getBoundingClientRect().top;if(Math.abs(after-before)>1)window.scrollBy(0,after-before)}requestAnimationFrame(()=>requestAnimationFrame(()=>{root.style.overflowAnchor=prev}));if(dir)(document.querySelector(`.qty-round[data-qr-id="${CSS.escape(id)}"][data-qr-dir="${dir}"]`) as any)?.focus({preventScroll:true})}
function qrDecorate(){if(view!=='shopping')return;for(const b of document.querySelectorAll('#main button[data-action="purchase-quantity"]') as any){const id=b.dataset.id;if(!id||b.nextElementSibling?.classList?.contains('qty-round-pair'))continue;if(!b.closest('.shop-row'))continue;const{row}=qrRow(id);if(!row||!qrMeasured(row))continue;
  const extra=(Number(row.qty)||0)-(Number(row.suggested)||0),[sd,ed]=shopDates(),why=typeof buyNoteGet==='function'?buyNoteGet(currentWeek(),sd,ed,id):'';
  if(row.custom&&extra>0.0001)(b.closest('.shop-row')?.querySelector('.item-label')||b).insertAdjacentHTML('beforeend',`<small class="buy-extra-note">${esc(tr('mua dư','extra'))} +${esc(fmtQty(extra,INGREDIENTS[id][1]))}${why?` · <span data-user-content>${esc(why)}</span>`:''}</small>`);
  // v1.7.8 (owner, 6 Nov 2026: "không có nút round down?"): two buttons side by side — ≈↓ rounds down, ≈↑ rounds up
  const btn=(dir:'up'|'down')=>`<button type="button" class="qty-round" data-qr-id="${esc(id)}" data-qr-dir="${dir}" aria-label="${esc(tr(`Làm tròn ${dir==='up'?'lên':'xuống'}`,`Round ${dir}`))}" title="${esc(tr(`Làm tròn ${dir==='up'?'lên':'xuống'}`,`Round ${dir}`))}"><span aria-hidden="true">≈</span><span class="qr-dir" aria-hidden="true">${dir==='up'?'↑':'↓'}</span></button>`;
  // the amount and its two round buttons share one cell, so they wrap together and never sit under the store button
  if(!b.parentElement?.classList.contains('qty-cell')){const cell=document.createElement('span');cell.className='qty-cell';b.before(cell);cell.append(b)}
  b.insertAdjacentHTML('afterend',`<span class="qty-round-pair" role="group" aria-label="${esc(tr('Làm tròn lượng mua','Round the amount'))}">${btn('down')}${btn('up')}</span>`)}}
document.addEventListener('click',e=>{const b=(e.target as any)?.closest?.('.qty-round');if(!b)return;e.preventDefault();qrApply(b.dataset.qrId,{dir:b.dataset.qrDir==='down'?'down':'up'})});
{const qrBaseRender=render;render=function(this:any,...a:any[]){const r=qrBaseRender.apply(this,a);try{qrDecorate()}catch(err){console.warn('qty round',err)}return r}}
(globalThis as any).qrNext=qrNext;
