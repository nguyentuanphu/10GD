'use strict';
// v1.7.7 (owner, 6 Nov 2026): a round button next to each shopping quantity. A tap rounds the amount to a step a shop
// sells (1.88 kg → 1.9 kg; tap again → 2 kg …). A long press (or right-click) opens the options: round up or down, and
// the step — automatic (by size) or a fixed 50 g / 100 g / 250 g / 500 g / 1 kg (ml/L likewise, 1/2/5/10 for counted
// items). The choice is remembered for the family (preferences.qtyRound). It only changes the amount to buy for the
// dates shown, like the quantity picker; "Dùng lượng tự động" in the picker or the options undoes it.
type QRMode={dir:'up'|'down',step:'auto'|number};
function qrMode():QRMode{const m=(state as any).preferences?.qtyRound;return{dir:m?.dir==='down'?'down':'up',step:Number.isFinite(m?.step)&&m.step>0?m.step:'auto'}}
function qrKind(id:string){const u=INGREDIENTS[id]?.[1];return u==='g'?'g':u==='ml'?'ml':'count'}
function qrAutoStep(kind:string,v:number){if(kind==='count')return 1;return v<250?50:v<1000?100:v<3000?250:500}
function qrSteps(kind:string){return kind==='count'?[1,2,5,10]:[50,100,250,500,1000]}
function qrStepLabel(kind:string,s:number){return kind==='count'?String(s):kind==='g'?(s>=1000?s/1000+' kg':s+' g'):(s>=1000?s/1000+' L':s+' ml')}
/** Next amount: snap to the step in the chosen direction; when already on a step, move one step. */
function qrNext(v:number,kind:string,mode:QRMode){const step=mode.step==='auto'?qrAutoStep(kind,v):mode.step,eps=1e-9;
 if(mode.dir==='up'){const c=Math.ceil(v/step-eps)*step;return c>v+eps?c:c+step}
 const f=Math.floor(v/step+eps)*step;return Math.max(step,f<v-eps?f:f-step)}
function qrRow(id:string){const[start,end]=shopDates(),row=shopping(state,currentWeek(),start,end).find((r:any)=>r.id===id);return{start,end,row}}
function qrMeasured(row:any){if(!row)return false;const p=row.purchase;return !p||!p.unit||(typeof unitIsMeasured==='function'?unitIsMeasured(p.unit,INGREDIENTS[row.id][1]):['g','kg','ml','l'].includes(p.unit))}
function qrApply(id:string,mode=qrMode()){const{start,end,row}=qrRow(id);if(!row||!qrMeasured(row))return;const v=Number(row.qty??row.suggested)||0,kind=qrKind(id),next=+qrNext(v,kind,mode).toFixed(3);
 setPurchaseQuantity(currentWeek(),start,end,id,next);save(tr(`Đã làm tròn ${INGREDIENTS[id][0]}: ${fmtQty(next,INGREDIENTS[id][1])}.`,`Rounded to ${fmtQty(next,INGREDIENTS[id][1])}.`));render()}
function qrOptions(id:string){const{row}=qrRow(id);if(!row)return;const kind=qrKind(id),m=qrMode(),v=Number(row.qty??row.suggested)||0;
 const opt=(name:string,val:string,label:string,on:boolean)=>`<label class="qr-opt"><input type="radio" name="${name}" value="${val}" ${on?'checked':''}><span>${label}</span></label>`;
 modal(tr('Làm tròn lượng mua','Round the amount'),`<form id="qr-form" data-id="${esc(id)}"><p class="hint">${esc(INGREDIENTS[id][0])} · ${tr('đang là','now')} <b>${esc(fmtQty(v,INGREDIENTS[id][1]))}</b></p>
  <fieldset class="qr-group"><legend>${tr('Hướng','Direction')}</legend>${opt('dir','up',tr('Làm tròn lên','Round up'),m.dir==='up')}${opt('dir','down',tr('Làm tròn xuống','Round down'),m.dir==='down')}</fieldset>
  <fieldset class="qr-group"><legend>${tr('Bước','Step')}</legend>${opt('step','auto',tr('Tự động (theo lượng)','Automatic (by size)'),m.step==='auto')}${qrSteps(kind).map(s=>opt('step',String(s),qrStepLabel(kind,s),m.step===s)).join('')}</fieldset>
  <p class="hint">${tr('Chạm nút làm tròn: mỗi lần một bước theo lựa chọn này (nhớ cho cả nhà).','Tap the round button: one step each time, using this choice (remembered for the family).')}</p></form>`,
  `<button class="btn" type="button" data-qr="reset" data-id="${esc(id)}">${tr('Dùng lượng tự động','Use automatic amount')}</button><button class="btn primary" type="button" data-qr="apply" data-id="${esc(id)}">${tr('Làm tròn','Round')}</button>`)}
function qrReadForm():QRMode{const f=document.getElementById('qr-form') as any,dir=f?.querySelector('input[name=dir]:checked')?.value==='down'?'down':'up',s=f?.querySelector('input[name=step]:checked')?.value;return{dir,step:s&&s!=='auto'?+s:'auto'}}
function qrDecorate(){if(view!=='shopping')return;for(const b of document.querySelectorAll('#main button[data-action="purchase-quantity"]') as any){const id=b.dataset.id;if(!id||b.nextElementSibling?.classList?.contains('qty-round'))continue;const{row}=qrRow(id);if(!row||!qrMeasured(row))continue;const m=qrMode();
  const extra=(Number(row.qty)||0)-(Number(row.suggested)||0),[sd,ed]=shopDates(),why=typeof buyNoteGet==='function'?buyNoteGet(currentWeek(),sd,ed,id):'';
  if(row.custom&&extra>0.0001)(b.closest('.shop-row')?.querySelector('.item-label')||b).insertAdjacentHTML('beforeend',`<small class="buy-extra-note">${esc(tr('mua dư','extra'))} +${esc(fmtQty(extra,INGREDIENTS[id][1]))}${why?` · <span data-user-content>${esc(why)}</span>`:''}</small>`);
  b.insertAdjacentHTML('afterend',`<button type="button" class="qty-round" data-qr-id="${esc(id)}" aria-label="${esc(tr(`Làm tròn ${m.dir==='up'?'lên':'xuống'} (giữ để chọn cách làm tròn)`,`Round ${m.dir} (press and hold for options)`))}" title="${esc(tr('Chạm: làm tròn · Giữ: tuỳ chọn','Tap: round · Hold: options'))}"><span aria-hidden="true">≈</span><span class="qr-dir" aria-hidden="true">${m.dir==='up'?'↑':'↓'}</span></button>`)}}
// tap vs long press (500 ms); right-click / Shift+Enter open the options too
let qrTimer:any=0,qrLong=false;
document.addEventListener('pointerdown',e=>{const b=(e.target as any)?.closest?.('.qty-round');if(!b)return;qrLong=false;clearTimeout(qrTimer);qrTimer=setTimeout(()=>{qrLong=true;qrOptions(b.dataset.qrId)},500)});
for(const ev of ['pointerup','pointercancel','pointerleave'])document.addEventListener(ev,()=>clearTimeout(qrTimer),true);
document.addEventListener('click',e=>{const b=(e.target as any)?.closest?.('.qty-round');if(b){e.preventDefault();if(qrLong){qrLong=false;return}if((e as any).shiftKey){qrOptions(b.dataset.qrId);return}qrApply(b.dataset.qrId);return}
 const a=(e.target as any)?.closest?.('[data-qr]');if(!a)return;const id=a.dataset.id;
 if(a.dataset.qr==='apply'){const m=qrReadForm();state.preferences.qtyRound={dir:m.dir,step:m.step};closeModal();qrApply(id,m)}
 else if(a.dataset.qr==='reset'){const{start,end}=qrRow(id);resetPurchaseQuantity(currentWeek(),start,end,id);if(typeof buyNoteSet==='function')buyNoteSet(currentWeek(),start,end,id,'');closeModal();save(tr('Đã dùng lại lượng tự động.','Back to the automatic amount.'));render()}});
document.addEventListener('contextmenu',e=>{const b=(e.target as any)?.closest?.('.qty-round');if(!b)return;e.preventDefault();clearTimeout(qrTimer);qrLong=true;qrOptions(b.dataset.qrId)});
{const qrBaseRender=render;render=function(this:any,...a:any[]){const r=qrBaseRender.apply(this,a);try{qrDecorate()}catch(err){console.warn('qty round',err)}return r}}
(globalThis as any).qrNext=qrNext;
