'use strict';
// v1.7.18 receipt ↔ shopping list (owner, 12 Nov 2026: “Make sure the lượng will reflect where it needs to be even when scanning the
// receipt; the names of items on the receipt may differ from the items on đi chợ … Sometimes user may buy more items than needed.”).
// Pure logic (no DOM; runs in node:vm for tests) shared by the receipt form and the “Đối chiếu đi chợ & kho” sheet:
//  • listFor(): what is on the shopping list for the receipt's week (ingredients to buy or already ticked, and the family's extras),
//    so matching looks there first; rankList() orders that list nearest first for “Chọn từ danh sách đi chợ”.
//  • quantity memory per store item (state.receiptQty, next to the name memory in state.aliases): amount + unit + an optional
//    “1 chai ≈ 1.5 L” the family entered once; nothing is guessed. baseQuantity() turns an amount into the ingredient's base unit.
//  • plan / apply / undo of the reconciliation: the list part is ticked bought, the extra goes to the pantry (owner default), is
//    kept for a later planned meal (the pantry lot carries forMeal and is not counted against other weeks' needs), or is not tracked.
//    Bought less → the rest stays on the list. Bottles / packs without a known size are compared in the list's own buying unit.
(function(root:any){
const round=(n:number,d=3)=>{const f=10**d;return Math.round(n*f)/f};
const fold=(s:any)=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D');
const norm=(s:any)=>fold(s).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const ING=()=>(typeof INGREDIENTS!=='undefined'?INGREDIENTS:{}) as any;
const hasIng=(id:any)=>!!id&&Object.hasOwn(ING(),id);
const DATE=/^\d{4}-\d{2}-\d{2}$/;

// ------------------------------------------------------------ quantity memory (family data, synced)
const QTY_MAX=600;
function validQtyEntry(v:any){return !!v&&typeof v==='object'&&!Array.isArray(v)&&Number.isFinite(v.qty)&&v.qty>0&&v.qty<=1e6&&typeof v.unit==='string'&&v.unit.trim().length>0&&v.unit.length<=40&&(v.per===undefined||Number.isFinite(v.per)&&v.per>0&&v.per<=1e6)&&(v.at===undefined||typeof v.at==='string'&&v.at.length<=40)}
function validQtyMemory(m:any){if(m===undefined)return true;if(!m||typeof m!=='object'||Array.isArray(m))return false;const e=Object.entries(m);return e.length<=QTY_MAX&&e.every(([k,v])=>k.length<=240&&/^receipt /.test(k)&&validQtyEntry(v))}
function recallQty(s:any,keys:string[]){for(const k of keys||[]){const v=s?.receiptQty?.[k];if(validQtyEntry(v))return{qty:v.qty,unit:v.unit,per:v.per,key:k}}return null}
// One amount per store item (the line's amount ÷ the printed count, so “2 × chai” fills 2 next time).
function rememberQty(s:any,keys:string[],{qty,unit,per}:any,at=new Date().toISOString()){
 const e:any={qty:round(+qty),unit:String(unit||'').slice(0,40)};if(+per>0)e.per=round(+per);e.at=at;if(!validQtyEntry(e)||!keys?.length)return 0;
 s.receiptQty=s.receiptQty&&typeof s.receiptQty==='object'&&!Array.isArray(s.receiptQty)?s.receiptQty:{};let n=0;
 for(const k of keys){const o=s.receiptQty[k];if(o&&o.qty===e.qty&&o.unit===e.unit&&(o.per??null)===(e.per??null))continue;s.receiptQty[k]=e;n++}
 const all=Object.entries(s.receiptQty);if(all.length>QTY_MAX){all.sort((a:any,b:any)=>String(a[1].at||'').localeCompare(String(b[1].at||'')));for(const[k]of all.slice(0,all.length-QTY_MAX))delete s.receiptQty[k]}
 return n;
}
// Amount in the ingredient's base unit (g / ml / quả / the family's own unit), or null. per = base units in 1 of `unit`.
function unitOf(u:any){return typeof findUnit==='function'?findUnit(u):null}
function baseQuantity(qty:any,unit:any,id:string,{per=null,s=null}:any={}){
 const q=+qty;if(!hasIng(id)||!(q>0)||!Number.isFinite(q))return null;const base=ING()[id][1];
 if(typeof canonicalQuantity==='function'){const c=canonicalQuantity(q,unit,id);if(c!=null)return round(c)}
 if(!unit)return null;
 if(unit===base||unit==='each'&&['quả','cái','con'].includes(base)||typeof sameUnit==='function'&&sameUnit(unit,base))return round(q);
 const u=unitOf(unit),b=unitOf(base);
 if(u&&b&&u.dim&&u.dim===b.dim&&u.factor&&b.factor&&!u.fixed)return round(q*u.factor/b.factor);
 if(u?.fixed&&Number.isFinite(u.fixed[base]))return round(q*u.fixed[base]);
 if(+per>0)return round(q*+per);
 const pref=s?.purchaseUnitPreferences?.[id];if(pref&&+pref.basePerUnit>0&&(pref.unit===unit||typeof sameUnit==='function'&&sameUnit(pref.unit,unit)))return round(q*+pref.basePerUnit);
 return null;
}
// Does an amount in `unit` need a “1 unit ≈ … base” to count against the list?
function needsConversion(unit:any,id:string){return !!unit&&hasIng(id)&&baseQuantity(1,unit,id)==null}

// ------------------------------------------------------------ the shopping list for a receipt
// weeks: [{week, start, end}] (the receipt's week and the week in view). ids: ingredients to buy or already ticked bought;
// extras: the family's own lines (“Kimchi”, “Giấy ăn”).
function listFor(s:any,weeks:any[]){
 const ids:string[]=[],extras:any[]=[],seen=new Set<string>();const add=(id:string)=>{if(hasIng(id)&&!seen.has(id)){seen.add(id);ids.push(id)}};
 for(const{week,start,end}of weeks||[]){if(!week)continue;
  let rows:any[]=[];try{rows=typeof shopping==='function'?shopping(s,week,start,end):[]}catch{}
  for(const r of rows)if(!r.skip&&(typeof shoppingHasAmount!=='function'||shoppingHasAmount(r)))add(r.id);
  for(const[id,at]of Object.entries(week.boughtAt||{}))if(at)add(id);
  for(const e of week.extras||[])if(e&&typeof e.name==='string'&&e.name.trim()&&!extras.some(x=>x.id===e.id))extras.push({id:e.id,name:e.name.slice(0,60),done:!!e.done})}
 return{ids,extras};
}
function grams(s:string){const t=' '+norm(s)+' ',out=new Set<string>();for(let i=0;i<t.length-2;i++)out.add(t.slice(i,i+3));return out}
function similar(a:string,b:string){const x=grams(a),y=grams(b);if(!x.size||!y.size)return 0;let n=0;for(const g of x)if(y.has(g))n++;return 2*n/(x.size+y.size)}
function namesOf(id:string){const RP=root.ReceiptParse,ing=ING()[id];if(!ing)return[];return[ing[0],typeof INGREDIENT_EN!=='undefined'?INGREDIENT_EN[id]:'',...(typeof INGREDIENT_ALIASES!=='undefined'?INGREDIENT_ALIASES[id]||[]:[]),...(RP?.EN_ALIASES?.[id]||[])].filter(Boolean)}
// Whole words of the receipt name against each name of the item, then letter similarity (“STRWBERRY” ~ “strawberries”).
function lineScore(name:string,names:string[]){const n=' '+norm(name)+' ';let best=0;for(const x of names){const a=norm(x);if(!a)continue;let s=similar(name,a)*50;const words=a.split(' ').filter(w=>w.length>2);if(words.length&&words.every(w=>n.includes(' '+w+' ')))s+=60;else if(words.some(w=>n.includes(' '+w+' ')))s+=25;if(s>best)best=s}return Math.round(best*10)/10}
// cands: {ids, extras} from listFor. Returns [{kind:'ingredient'|'extra', id, name, score}] nearest first.
function rankList(item:any,cands:any,nameOf=(id:string)=>ING()[id]?.[0]||id){
 const name=[item.label||item.name||'',item.expanded||''].join(' ');
 const out=[...(cands?.ids||[]).filter(hasIng).map((id:string)=>({kind:'ingredient',id,name:nameOf(id),score:lineScore(name,namesOf(id))})),
  ...(cands?.extras||[]).map((e:any)=>({kind:'extra',id:e.id,name:e.name,score:lineScore(name,[e.name])}))];
 return out.sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name));
}
// A family extra whose every word (3+ letters) is printed on the line: “Kimchi” ↔ “JONGGA KIMCHI 1.5K”.
function extraMatch(item:any,extras:any[]){const n=' '+norm([item.name||item.label||'',item.expanded||''].join(' '))+' ';
 return(extras||[]).find((e:any)=>{const w=norm(e.name).split(' ').filter(x=>x.length>2);return w.length>0&&w.every(x=>n.includes(' '+x+' '))})||null}

// ------------------------------------------------------------ later meals that use an ingredient
function mealTypes(){return typeof MEAL_TYPES!=='undefined'?MEAL_TYPES:['lunch','dinner']}
function mealsUsing(s:any,id:string,from:string,days=28){
 const out:any[]=[];if(!DATE.test(from||''))return out;const to=typeof addDays==='function'?addDays(from,days):'9999-12-31';
 for(const w of Object.values(s.weeks||{}) as any[])for(const[date,day]of Object.entries(w?.days||{}) as any)if(date>=from&&date<=to)for(const type of mealTypes()){const m=day?.[type];if(!m||m.cooked||!Array.isArray(m.recipes)||!m.recipes.length)continue;
  let need=0;try{need=+(mealIngredients(m,s)[id]||0)}catch{}if(need>0)out.push({date,type,need:round(need),names:m.recipes.map((r:any)=>r.name).filter(Boolean)})}
 return out.sort((a,b)=>a.date.localeCompare(b.date)||mealTypes().indexOf(a.type)-mealTypes().indexOf(b.type));
}

// ------------------------------------------------------------ reconciliation
const sydDay=(iso:string)=>{try{return new Intl.DateTimeFormat('en-CA',{timeZone:'Australia/Sydney',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(iso))}catch{return''}};
function shopRows(s:any,week:any,start:string,end:string){try{return typeof shopping==='function'?shopping(s,week,start,end):[]}catch{return[]}}
function weekNeed(s:any,week:any,start:string,end:string){const out:any={};for(const r of shopRows(s,week,start,end)){if(r.skip)continue;const already=+(week.bought?.[r.id]||0);out[r.id]=Math.max(0,(+r.qty||0)-already)}return out}
function receiptLines(s:any,rec:any){return(rec.items||[]).filter((i:any)=>i.ingredient&&hasIng(i.ingredient)&&(!i.lineKind||i.lineKind==='item')).map((i:any)=>{
 const q=Number.isFinite(i.quantity)&&i.quantity>0?i.quantity:baseQuantity(i.enteredQty,i.enteredUnit,i.ingredient,{per:i.per,s});
 return{ingredient:i.ingredient,quantity:q>0?q:null,label:i.label,id:i.id,enteredQty:i.enteredQty,enteredUnit:i.enteredUnit}})}
// v1.7.14: what was ticked bought and put away from the shopping list around the receipt's date is the same shopping
function storedFromShopping(s:any,id:string,rec:any){const d=DATE.test(rec?.date||'')?rec.date:null;if(!d)return[];const near=(day:string)=>!!day&&day>=addDays(d,-1)&&day<=addDays(d,3);
 const ticked=Object.values(s.weeks||{}).some((w:any)=>near(sydDay(w?.boughtAt?.[id]||'')));
 return(s.pantry||[]).filter((p:any)=>p.ingredient===id&&!p.receiptId&&(p.storedOn?near(p.storedOn):ticked&&!p.boughtOn))}
function plan(s:any,rec:any,week:any,start:string,end:string){
 const RP=root.ReceiptParse,need=weekNeed(s,week,start,end),lines=receiptLines(s,rec),rows0=shopRows(s,week,start,end);
 const rows=RP.reconcile(lines.filter((l:any)=>l.quantity),(id:string)=>need[id]??0).map((r:any)=>{const row:any={...r,onList:Object.hasOwn(need,r.ingredient)};
  if(row.extra>0){const lots=storedFromShopping(s,r.ingredient,rec);if(lots.length){row.status='stored';row.extra=0;row.lots=lots.map((p:any)=>p.id)}}return row});
 // Amount known only in a buying unit (“2 chai”, no size): compared with the list's own unit, never converted by a guess.
 const unknown:any[]=[];const scope=typeof purchaseScope==='function'?purchaseScope(start,end):start+'/'+end;
 for(const l of lines.filter((x:any)=>!x.quantity)){const r=rows0.find((x:any)=>x.id===l.ingredient&&!x.skip&&x.purchase);const u=l.enteredUnit;
  if(r&&+l.enteredQty>0&&u&&(r.purchase.unit===u||typeof sameUnit==='function'&&sameUnit(r.purchase.unit,u))&&!rows.some((x:any)=>x.ingredient===l.ingredient)){
   const prev=rows.find((x:any)=>x.ingredient===l.ingredient&&x.units);const done=week.unitBought?.[scope]?.[r.id]&&r.bought;
   if(prev){prev.parts.push(+l.enteredQty);prev.bought=round(prev.bought+(+l.enteredQty))}
   else rows.push({ingredient:l.ingredient,units:r.purchase.unit,parts:[+l.enteredQty],bought:+l.enteredQty,need:done?0:+r.purchase.amount,onList:true});continue}
  unknown.push(l)}
 for(const row of rows.filter((x:any)=>x.units)){row.covered=Math.min(row.bought,row.need);row.extra=round(row.bought-row.covered);row.short=round(Math.max(0,row.need-row.bought));row.status=row.need<=0?'extra':row.short>0?'short':row.extra>0?'enough-extra':'enough';row.same=row.parts.length>1&&row.parts.every((p:any)=>p===row.parts[0])}
 // the family's own list lines (“Kimchi”) matched on the receipt
 const ex:any[]=[];for(const i of rec.items||[]){const b=i.basket;if(!b||i.ingredient||!/^x:/.test(b.key||''))continue;const e=(week.extras||[]).find((x:any)=>x.id===b.id);if(e&&!ex.some(x=>x.id===e.id))ex.push({id:e.id,name:e.name,done:!!e.done,label:i.label})}
 return{rows,unknown,extras:ex};
}
function placeFor(s:any,id:string,rec:any){const lab=(rec.items||[]).filter((i:any)=>i.ingredient===id).map((i:any)=>i.label).join(' ');if(/\b(frz|frozen|frzn)\b/i.test(lab))return'freezer';if(typeof suggestStorePlace==='function')return suggestStorePlace(s,id);return ING()[id][2]==='dry'&&!['egg','tofu','milk','yogurt','cream','butter','parmesan','mozzarella','feta'].includes(id)?'dry':'fridge'}
// ticked: ingredient ids (and 'x:'+extra id) to update, or null for all. choices: {id: {mode:'pantry'|'meal'|'none', meal:{date,type}}}.
// Returns the undo record stored on the receipt.
function apply(s:any,rec:any,week:any,start:string,end:string,ticked:any,choices:any={}){
 const p=plan(s,rec,week,start,end),now=new Date().toISOString(),scope=typeof purchaseScope==='function'?purchaseScope(start,end):start+'/'+end;
 const undo:any={at:now,week:start,end,bought:{},boughtAt:{},pantryIds:[],choices:{}};if(!week.boughtAt)undo.newBoughtAt=true;if(!week.unitBought)undo.newUnitBought=true;const rows0=shopRows(s,week,start,end);
 for(const r of p.rows){if(ticked&&!ticked.includes(r.ingredient))continue;
  if(r.covered>0){week.boughtAt??={};undo.boughtAt[r.ingredient]=week.boughtAt[r.ingredient]??null;
   if(r.units){if(r.short<=0){const row=rows0.find((x:any)=>x.id===r.ingredient);week.unitBought??={};week.unitBought[scope]??={};undo.unitBought??={};undo.unitBought[r.ingredient]=week.unitBought[scope][r.ingredient]??null;undo.scope=scope;if(row&&typeof setShoppingBought==='function')setShoppingBought(week,start,end,row,true);week.boughtAt[r.ingredient]=now}}
   else{week.bought??={};undo.bought[r.ingredient]=Object.hasOwn(week.bought,r.ingredient)?week.bought[r.ingredient]:null;week.bought[r.ingredient]=round((+week.bought[r.ingredient]||0)+r.covered);week.boughtAt[r.ingredient]=now}}
  if(r.status==='stored'){undo.linked??=[];for(const lid of r.lots||[]){const x=s.pantry.find((y:any)=>y.id===lid);if(x&&!x.receiptId){x.receiptId=rec.id;x.boughtOn=rec.date;if(typeof pantryTouch==='function')pantryTouch(x);undo.linked.push(lid)}}continue}
  if(r.extra>0){const c=choices?.[r.ingredient]||{mode:'pantry'};const mode=['pantry','meal','none'].includes(c.mode)?c.mode:'pantry';undo.choices[r.ingredient]=mode==='meal'&&c.meal?{mode,meal:{date:c.meal.date,type:c.meal.type}}:{mode};
   if(mode==='none')continue;
   const lot:any={id:typeof uid==='function'?uid():'lot-'+Math.random().toString(36).slice(2),ingredient:r.ingredient,qty:r.units?0:r.extra,place:placeFor(s,r.ingredient,rec),expiry:'',boughtOn:rec.date,receiptId:rec.id};
   if(r.units)lot.purchase={unit:r.units,amount:r.extra,basePerUnit:null,pricePerUnit:null,note:'Từ hoá đơn'};
   if(mode==='meal'&&c.meal&&DATE.test(c.meal.date)&&typeof c.meal.type==='string')lot.forMeal={date:c.meal.date,type:c.meal.type.slice(0,20)};
   if(typeof pantryTouch==='function')pantryTouch(lot);s.pantry.push(lot);undo.pantryIds.push(lot.id)}}
 for(const e of p.extras){if(ticked&&!ticked.includes('x:'+e.id))continue;const x=(week.extras||[]).find((y:any)=>y.id===e.id);if(!x||x.done)continue;undo.extras??={};undo.extras[x.id]={done:!!x.done,boughtAt:x.boughtAt??null};x.done=true;x.boughtAt=now}
 rec.reconciled=undo;return undo;
}
function undo(s:any,rec:any){
 const u=rec.reconciled;if(!u)return false;const week=s.weeks?.[u.week];
 if(week){for(const[id,v]of Object.entries(u.bought||{})){if(v==null)delete week.bought[id];else week.bought[id]=v}
  for(const[id,v]of Object.entries(u.boughtAt||{})){if(!week.boughtAt)continue;if(v==null)delete week.boughtAt[id];else week.boughtAt[id]=v}
  for(const[id,v]of Object.entries(u.unitBought||{})){const rows=week.unitBought?.[u.scope];if(!rows)continue;if(v==null)delete rows[id];else rows[id]=v}
  if(u.newBoughtAt&&week.boughtAt&&!Object.keys(week.boughtAt).length)delete week.boughtAt;
  if(u.unitBought&&week.unitBought?.[u.scope]&&!Object.keys(week.unitBought[u.scope]).length)delete week.unitBought[u.scope];if(u.newUnitBought&&week.unitBought&&!Object.keys(week.unitBought).length)delete week.unitBought;
  for(const[id,v]of Object.entries(u.extras||{}) as any){const x=(week.extras||[]).find((y:any)=>y.id===id);if(!x)continue;x.done=v.done;if(v.boughtAt==null)delete x.boughtAt;else x.boughtAt=v.boughtAt}}
 const ids=new Set(u.pantryIds||[]);s.pantry=s.pantry.filter((p:any)=>!ids.has(p.id));for(const lid of u.linked||[]){const p=s.pantry.find((x:any)=>x.id===lid);if(p&&p.receiptId===rec.id){delete p.receiptId;delete p.boughtOn}}delete rec.reconciled;return true;
}

// ------------------------------------------------------------ validation and reservations
function validForMeal(p:any){return p.forMeal===undefined||!!p.forMeal&&typeof p.forMeal==='object'&&DATE.test(p.forMeal.date)&&typeof p.forMeal.type==='string'&&p.forMeal.type.length<=20}
if(typeof validSpending==='function'){const base=validSpending;root.validSpending=validSpending=function(s:any){return base(s)&&validQtyMemory(s.receiptQty)&&(!Array.isArray(s.pantry)||s.pantry.every(validForMeal))}}
// A pantry lot kept for a later meal is not counted against the list of a range that ends before that meal.
let reserveRange:any=null;
if(typeof stock==='function'&&typeof shopping==='function'){
 const baseStock=stock;root.stock=stock=function(s:any,id:string){const v=baseStock(s,id);if(!reserveRange)return v;const today=typeof sydneyDate==='function'?sydneyDate():'';
  const held=(s.pantry||[]).filter((p:any)=>p.ingredient===id&&p.forMeal&&p.forMeal.date>reserveRange[1]&&(!p.expiry||p.expiry>=today)).reduce((n:number,p:any)=>n+(+p.qty||0),0);return Math.max(0,v-held)};
 const baseShopping=shopping;root.shopping=shopping=function(s:any,w:any,start:string,end:string){const prev=reserveRange;reserveRange=[start,end];try{return baseShopping(s,w,start,end)}finally{reserveRange=prev}};
}
root.ReceiptList={QTY_MAX,validQtyEntry,validQtyMemory,recallQty,rememberQty,baseQuantity,needsConversion,listFor,rankList,extraMatch,lineScore,mealsUsing,weekNeed,receiptLines,plan,apply,undo,validForMeal,norm};
})(globalThis);
