// v1.7.18 receipt ↔ shopping list (owner, 12 Nov 2026: “Make sure the lượng will reflect where it needs to be even when scanning the
// receipt; the names of items on the receipt may differ from the items on đi chợ … Sometimes user may buy more items than needed.”).
// Unit tests on the owner's Costco and HP Meats receipt TEXT (no photo; personal numbers blanked): stricter matching (prepared
// products, non-food, whole words), pack counts and “1.5K” sizes, list-first matching, the family's memory of choices and
// amounts, and the reconciliation: list part bought, extra → pantry / kept for a later meal / not tracked, bought less keeps the
// rest on the list, buying-unit rows, the family's own list lines, and undo of every choice.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {COSTCO,HP_MEATS}=require('./fixtures/receipt-list.cjs');
const ctx=vm.createContext({console,Intl,Date,Math,TextEncoder,crypto:require('node:crypto').webcrypto});
vm.runInContext(['seed','core','spending-core','unit-registry','purchase-units','receipt-parse','receipt-list'].map(n=>fs.readFileSync('dist/'+n+'.js','utf8')).join('\n;\n')+
 '\n;this.R=ReceiptParse;this.L=ReceiptList;this.I=INGREDIENTS;this.AL=INGREDIENT_ALIASES;this.api={defaults,ensureWeek,addDays,shopping,stock,validSpending,purchaseScope,planStartOf};',ctx);
const R=ctx.R,L=ctx.L,A=ctx.api;let n=0;const check=(name:string,fn:()=>void)=>{fn();n++;console.log('PASS',name)};
const J=(x:any)=>JSON.parse(JSON.stringify(x));
const goods=(t:string)=>R.parseReceipt(t).items.filter((i:any)=>i.kind==='item');
const match=(it:any,o:any={})=>R.matchIngredient(it,{ingredients:ctx.I,aliases:ctx.AL,retailer:'costco',...o});
const costco=goods(COSTCO),find=(re:RegExp)=>costco.find((i:any)=>re.test(i.name));

check('Costco: prepared products never map to the raw ingredient (juice, hargow, pancake, roast beef, flavoured milk)',()=>{
 for(const[re,raw]of[[/APPLE JUICE/,'apple'],[/PRAWN HARGOW/,'shrimp'],[/ONION PANCAKE/,'onion'],[/ROAST BEEF/,'beef'],[/STRWBERRY MILK/,'milk']] as any){
  const it=find(re);assert.ok(it,'line '+re);const m=match(it);assert.notEqual(m.match,raw,re+' must not be '+raw);assert.equal(m.match,'',re+' is not matched by itself');}
 assert.equal(match(find(/APPLE JUICE/)).prepared,'juice','the reason is kept for the hint');
 // the ingredient that IS the prepared product still matches (alias names it)
 assert.equal(match({kind:'item',name:'COLES ROAST CHICKEN',expanded:'coles roast chicken'}).match,'cookedChicken');
 assert.equal(match({kind:'item',name:'MASTERFOODS FISH SAUCE',expanded:'masterfoods fish sauce'}).match,'fishSauce');
 // a generic word alone (“rolls”) is only a suggestion
 const rolls=match(find(/ROLLS/));assert.ok(rolls.match===''||rolls.confidence==='suggested','“… ROLLS …” is at most a suggestion');
});
check('Costco: OMO / Colgate / Finish are not food — spending only, never capsicum',()=>{
 for(const re of[/OMO TRIPLE CAPS/,/210 TRIPLE CAPS/,/COLGATE/,/^FINISH$/]){const it=find(re);assert.ok(it&&it.nonFood,re+' non-food');assert.equal(match(it).match,'',re+' unmatched');assert.notEqual(match(it).match,'bellPepper')}
 assert.equal(match({kind:'item',name:'CAPS RED',expanded:R.expandAbbrev('CAPS RED')}).match,'bellPepper','the Coles “CAPS” abbreviation still means capsicum on its own');
});
check('Costco: eggs “30PK” = 30 quả, “JONGGA KIMCHI 1.5K” = 1.5 kg, no size → unknown (never guessed)',()=>{
 const egg=find(/CAGE FREE/);assert.equal(match(egg).match,'egg');assert.equal(egg.pack,30);J(R.lineQuantity(egg,'quả'));
 assert.deepEqual(J(R.lineQuantity(egg,'quả')),{qty:30,unit:'each'});assert.equal(R.lineQuantity(egg,'g'),null,'a pack count is never a weight');
 const kim=find(/KIMCHI/);assert.deepEqual(J(kim.size),{qty:1.5,unit:'kg'});assert.deepEqual(J(R.lineQuantity(kim)),{qty:1500,unit:'g'});
 assert.equal(R.lineQuantity(find(/OYSTER SAUCE/)),null);assert.equal(R.lineQuantity(find(/MOO CHOCOLATE MILK/)),null);
 assert.deepEqual(J(R.extractSize('Thing 4K').size),{qty:4,unit:'kg'});assert.equal(R.extractSize('UHD TV 4K 55IN').size,null,'K only at the very end');
 assert.equal(match(find(/SWEETCORN/)).match,'corn','SWEETCORN still reads as corn');
});
check('HP Meats butcher lines keep their weights and matches',()=>{
 const g=goods(HP_MEATS),belly=g.find((i:any)=>/PORK BELLY/.test(i.name));assert.equal(match(belly).match,'pork');assert.deepEqual(J(R.lineQuantity(belly)),{qty:1374,unit:'g'});
 assert.equal(match(g.find((i:any)=>/SHORT RIB/.test(i.name))).match,'beef');
});
check('list first: what is on this week’s list wins over a closer catalogue name; memory wins over both',()=>{
 const it={kind:'item',name:'PORK SPARE RIBS 1KG',expanded:'pork spare ribs 1kg'};
 const cat=match(it);assert.equal(cat.match,'ribs');assert.equal(cat.source,'catalogue');
 const list=match(it,{list:['pork','egg']});assert.equal(list.match,'pork');assert.equal(list.source,'list');
 const mem=match(it,{list:['pork'],memory:{'receipt costco n pork spare ribs 1kg':'ribs'}});assert.deepEqual([mem.match,mem.confidence,mem.source],['ribs','learned','memory']);
 assert.equal(match({kind:'item',name:'OMO TRIPLE CAPS'},{memory:{'receipt costco n omo triple caps':'other'}}).match,'other','“Không phải đồ nấu” remembered per store');
 assert.deepEqual(J(match(it)),{match:'ribs',confidence:'high'},'{match, confidence} compares as before');
});
check('nearest first in “Chọn từ danh sách đi chợ” and the family’s own list lines',()=>{
 const r=L.rankList({label:'MOO STRWBERRY MILK'},{ids:['beef','egg','milk'],extras:[{id:'x1',name:'Kimchi'}]});assert.equal(r[0].id,'milk');assert.equal(r.length,4);
 assert.equal(L.rankList({label:'JONGGA KIMCHI 1.5kg'},{ids:['beef','milk'],extras:[{id:'x1',name:'Kimchi'}]})[0].id,'x1');
 assert.equal(L.extraMatch({name:'JONGGA KIMCHI 1.5kg'},[{id:'x1',name:'Kimchi'},{id:'x2',name:'Giấy ăn'}]).id,'x1');assert.equal(L.extraMatch({name:'KEWPIE MAYO'},[{id:'x1',name:'Kimchi'}]),null);
});
check('amount memory per store item: remembered once, recalled, validated; older states stay valid',()=>{
 const s=A.defaults();assert.equal(A.validSpending(s),true,'no receiptQty = valid');
 const keys=['receipt costco c 10686','receipt costco n lkk oyster sauce'];assert.equal(L.recallQty(s,keys),null);
 assert.equal(L.rememberQty(s,keys,{qty:1,unit:'chai',per:770}),2);assert.deepEqual(J(L.recallQty(s,keys)),{qty:1,unit:'chai',per:770,key:keys[0]});
 assert.equal(L.rememberQty(s,keys,{qty:1,unit:'chai',per:770}),0,'same again = no change');assert.equal(A.validSpending(s),true);
 assert.equal(L.rememberQty(s,keys,{qty:0,unit:'chai'}),0,'zero is never stored');assert.equal(L.rememberQty(s,keys,{qty:2,unit:''}),0,'no unit, nothing stored');
 for(const bad of[{x:{qty:1,unit:'g'}},{'receipt a':{qty:-1,unit:'g'}},{'receipt a':{qty:1,unit:'g',per:0}},[]]){const t=A.defaults();t.receiptQty=bad;assert.equal(A.validSpending(t),false,JSON.stringify(bad))}
 const big=A.defaults();for(let i=0;i<L.QTY_MAX+20;i++)L.rememberQty(big,['receipt x n item '+i],{qty:1,unit:'g'},new Date(Date.UTC(2026,0,1,0,0,i)).toISOString());
 assert.equal(Object.keys(big.receiptQty).length,L.QTY_MAX,'oldest dropped at the limit');assert.ok(!big.receiptQty['receipt x n item 0']);assert.equal(A.validSpending(big),true);
});
check('base quantity: registry units, dozens, “1 chai ≈ 1.5 L”, the family’s buying unit — never a guess',()=>{
 const s=A.defaults();assert.equal(L.baseQuantity(1.5,'kg','beef'),1500);assert.equal(L.baseQuantity(2,'lạng','beef'),200);assert.equal(L.baseQuantity(1,'tá','egg'),12);
 assert.equal(L.baseQuantity(30,'each','egg'),30);assert.equal(L.baseQuantity(1,'chai','oil'),null,'a bottle without a size is unknown');
 assert.equal(L.baseQuantity(2,'chai','oil',{per:1500}),3000);s.purchaseUnitPreferences={oil:{unit:'chai',amount:1,basePerUnit:750,pricePerUnit:null}};assert.equal(L.baseQuantity(2,'chai','oil',{s}),1500);
 assert.equal(L.needsConversion('chai','oil'),true);assert.equal(L.needsConversion('kg','beef'),false);
});

// ---------- reconciliation on a synthetic week (QA data)
function week(){
 const s=A.defaults(),start=A.planStartOf(s,'2026-11-09'),end=A.addDays(start,6),next=A.addDays(start,7);s.pantry=[];
 for(const k of[start,next]){const w=A.ensureWeek(s,k);for(const day of Object.values(w.days) as any[])for(const m of Object.values(day) as any[])if(m&&Array.isArray(m.recipes)){m.recipes=[];m.cooked=false}}
 const dish=(id:string,ings:any[])=>({id,name:'QA '+id,category:'main',protein:'beef',time:20,servings:4,ingredients:ings,prep:'QA',steps:['QA'],custom:true,favorite:false});
 const w=s.weeks[start];w.days[A.addDays(start,2)].dinner.recipes=[dish('qa1',[{id:'egg',qty:6},{id:'beef',qty:400},{id:'corn',qty:400},{id:'oil',qty:200},{id:'fishSauce',qty:50}])];
 s.weeks[next].days[A.addDays(next,2)].dinner.recipes=[dish('qa2',[{id:'beef',qty:500}])];
 return{s,w,start,end,next};
}
const need=(s:any,w:any,start:string,end:string,id:string)=>A.shopping(s,w,start,end).find((r:any)=>r.id===id);
check('reconcile: list part bought, extra → pantry / kept for a later meal / not tracked, bought less → “Còn thiếu”, not-on-list → pantry; undo',()=>{
 const{s,w,start,end,next}=week();const beefNeed=need(s,w,start,end,'beef').qty,eggNeed=need(s,w,start,end,'egg').qty,cornNeed=need(s,w,start,end,'corn').qty;
 assert.ok(beefNeed>0&&eggNeed>0&&Number.isInteger(eggNeed),'eggs counted in whole quả (rounded up)');
 const rec:any={id:'qa-rc',store:'Costco Casula',date:start,total:80,currency:'AUD',items:[
  {id:'a',label:'P/F CAGE FREE 30PK',total:12.49,ingredient:'egg',quantity:30,enteredQty:30,enteredUnit:'quả'},
  {id:'b',label:'BEEF 1KG',total:20,ingredient:'beef',quantity:1000,enteredQty:1,enteredUnit:'kg'},
  {id:'c',label:'SWEETCORN',total:6.99,ingredient:'corn',quantity:100,enteredQty:100,enteredUnit:'g'},
  {id:'d',label:'CAN OIL 4L',total:10.69,ingredient:'oil',quantity:null,enteredQty:1,enteredUnit:'chai',per:4000},
  {id:'e',label:'MILK 2L',total:4,ingredient:'milk',quantity:2000,enteredQty:2,enteredUnit:'l'},
  {id:'f',label:'OMO TRIPLE CAPS',total:43.99,ingredient:null,kind:'other',quantity:null}]};
 s.receipts=[rec];
 const p=L.plan(s,rec,w,start,end),row=(id:string)=>p.rows.find((r:any)=>r.ingredient===id);
 assert.equal(row('egg').covered,eggNeed);assert.equal(row('egg').extra,30-eggNeed);assert.equal(row('egg').status,'enough-extra');
 assert.equal(row('oil').bought,4000,'1 chai ≈ 4 L counts as 4000 ml');assert.equal(row('corn').status,'short');assert.equal(row('corn').short,cornNeed-100);
 assert.equal(row('milk').onList,false);assert.equal(row('milk').status,'extra');
 const meals=L.mealsUsing(s,'beef',start);assert.deepEqual(J(meals.map((m:any)=>[m.date,m.type])),[[A.addDays(start,2),'dinner'],[A.addDays(next,2),'dinner']]);
 const later=meals[1];const before=J({w,pantry:s.pantry});
 /* v1.7.19: the confirmation step always sends the use-by shown (the suggestion, or the family's own date); here the family set one past next week's meal */L.apply(s,rec,w,start,end,null,{beef:{mode:'meal',meal:{date:later.date,type:later.type},useBy:A.addDays(later.date,1)},oil:{mode:'none'}});
 assert.equal(w.bought.egg,eggNeed);assert.equal(w.bought.beef,beefNeed);assert.equal(w.bought.corn,100);assert.ok(w.boughtAt.egg&&w.boughtAt.corn);
 const lot=(id:string)=>s.pantry.filter((x:any)=>x.ingredient===id&&x.receiptId==='qa-rc');
 /* v1.7.19 owner decision (12 Nov 2026, “Gợi ý hạn dùng, cho sửa”): a receipt lot gets the shared use-by suggestion from the purchase date */assert.deepEqual(J(lot('egg').map((x:any)=>[x.qty,x.boughtOn,x.expiry,x.forMeal??null])),[[30-eggNeed,start,L.receiptUseBy('egg',lot('egg')[0].place,rec,null),null]],'extra eggs → pantry (default), with the suggested use-by');assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(lot('egg')[0].expiry),'a date is suggested for eggs');
 assert.deepEqual(J(lot('beef').map((x:any)=>[x.qty,x.forMeal])),[[1000-beefNeed,{date:later.date,type:'dinner'}]],'extra beef kept for next week’s dinner');
 assert.equal(lot('oil').length,0,'“Không theo dõi”: no pantry lot');assert.equal(lot('milk')[0].qty,2000,'not on the list → pantry');
 assert.deepEqual(J(rec.reconciled.choices),{egg:{mode:'pantry'},beef:{mode:'meal',meal:{date:later.date,type:'dinner'}},oil:{mode:'none'},milk:{mode:'pantry'}});
 // shopping list after: corn still short by the rest; this week's beef row ticked; the kept beef is not counted against this week…
 const corn=need(s,w,start,end,'corn');assert.equal(corn.bought,false,'bought less → stays on the list');assert.ok(corn.qty-w.bought.corn>0,'Còn thiếu the rest');
 assert.equal(need(s,w,start,end,'beef').bought,true);assert.equal(need(s,w,start,end,'beef').have,0,'the beef kept for next week is not counted against this week');assert.equal(A.stock(s,'beef'),1000-beefNeed,'pantry shows the kept beef');
 // … but covers next week's dinner
 const nb=need(s,s.weeks[next],next,A.addDays(next,6),'beef');assert.equal(nb.have,1000-beefNeed,'kept beef counts for the meal it is kept for');
 assert.equal(A.validSpending(s),true,'forMeal on a pantry lot is valid state');const bad=J(s);bad.pantry[0].forMeal={date:'soon',type:'dinner'};assert.equal(A.validSpending(bad),false);
 assert.equal(L.undo(s,rec),true);assert.deepEqual(J({w,pantry:s.pantry}),before,'undo restores the list and pantry exactly');assert.equal(rec.reconciled,undefined);
});
check('reconcile: unticked lines are left alone; already-ticked amounts add up',()=>{
 const{s,w,start,end}=week();const rec:any={id:'qa-2',store:'X',date:start,total:5,items:[{id:'a',label:'EGGS',total:5,ingredient:'egg',quantity:2,enteredQty:2,enteredUnit:'quả'},{id:'b',label:'BEEF',total:5,ingredient:'beef',quantity:100,enteredQty:100,enteredUnit:'g'}]};
 w.bought={egg:1};L.apply(s,rec,w,start,end,['egg']);assert.equal(w.bought.egg,3);assert.equal(w.bought.beef,undefined);L.undo(s,rec);assert.equal(w.bought.egg,1);
});
check('reconcile: a bottle with no size is compared in the list’s buying unit (2 chai = 2 chai), short stays short',()=>{
 const{s,w,start,end}=week();const scope=A.purchaseScope(start,end);w.buyingUnits={[scope]:{fishSauce:{unit:'chai',amount:2,basePerUnit:null,pricePerUnit:null}}};
 const row0=need(s,w,start,end,'fishSauce');assert.equal(row0.purchase.unit,'chai');assert.equal(row0.bought,false);
 const rec:any={id:'qa-3',store:'X',date:start,total:5,items:[{id:'a',label:'FISH SAUCE',total:5,ingredient:'fishSauce',quantity:null,enteredQty:3,enteredUnit:'chai'}]};
 const r=L.plan(s,rec,w,start,end).rows[0];assert.deepEqual([r.units,r.need,r.covered,r.extra,r.status],['chai',2,2,1,'enough-extra']);
 L.apply(s,rec,w,start,end,null);assert.equal(need(s,w,start,end,'fishSauce').bought,true,'list row ticked in its own unit');
 const lot=s.pantry.find((x:any)=>x.receiptId==='qa-3');assert.deepEqual(J([lot.qty,lot.purchase.unit,lot.purchase.amount]),[0,'chai',1],'1 extra chai in the pantry, weight unknown');
 L.undo(s,rec);assert.equal(need(s,w,start,end,'fishSauce').bought,false);assert.equal(s.pantry.length,0);
 const short:any={id:'qa-4',store:'X',date:start,total:5,items:[{id:'a',label:'FISH SAUCE',total:5,ingredient:'fishSauce',quantity:null,enteredQty:1,enteredUnit:'chai'}]};
 const r2=L.plan(s,short,w,start,end).rows[0];assert.deepEqual([r2.status,r2.short],['short',1]);L.apply(s,short,w,start,end,null);assert.equal(need(s,w,start,end,'fishSauce').bought,false,'1 of 2 chai: stays on the list');
});
check('reconcile: the family’s own list line (“Kimchi”) is ticked done; undo un-ticks it',()=>{
 const{s,w,start,end}=week();w.extras.push({id:'x1',name:'Kimchi',qty:'1 hộp',cost:0,done:false});
 const rec:any={id:'qa-5',store:'Costco',date:start,total:11.99,items:[{id:'a',label:'JONGGA KIMCHI 1.5kg',total:11.99,ingredient:null,kind:'other',quantity:null,basket:{key:'x:kimchi',id:'x1',name:'Kimchi'}}]};
 const p=L.plan(s,rec,w,start,end);assert.deepEqual(J(p.extras.map((e:any)=>[e.id,e.done])),[['x1',false]]);
 L.apply(s,rec,w,start,end,null);assert.equal(w.extras[0].done,true);L.undo(s,rec);assert.equal(w.extras[0].done,false);assert.equal(w.extras[0].boughtAt,undefined);
});
console.log(`receipt list tests passed (${n})`);
