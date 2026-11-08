const fs=require('node:fs'),vm=require('node:vm');const ctx=vm.createContext({console,Intl,Date,Math,crypto:require('node:crypto').webcrypto});
vm.runInContext(['seed','recipe-catalog','core','spending-core','purchase-units','planning-core'].map(f=>fs.readFileSync('dist/'+f+'.js','utf8')).join('\n'),ctx);
vm.runInContext(`
const check=(x,n)=>{if(!x)throw Error(n);console.log('PASS',n)};
const s=defaults(),start=monday(sydneyDate()),end=addDays(start,6),w=ensureWeek(s,start);
// v1.7.5: owner halved the Vietnamese reference recipes (740 → 475)
// v1.7.10: only recognised dishes stay (Henry, 7 Nov 2026): 475 → 125
check(s.recipes.length===125&&new Set(s.recipes.map(r=>r.name)).size===125,'125 distinct named recipes');
check(s.recipes.every(r=>r.ingredients.length&&r.steps.length>=3&&r.prep&&r.time>0),'all catalog entries include ingredients, preparation, steps and time');
check(validImport(s),'expanded catalog is backup compatible');
const original=shopping(s,w,start,end).find(r=>r.id==='chicken');const needs=original.needed;
setBuyingUnits(w,start,end,'chicken',{unit:'cái',amount:2,basePerUnit:null,pricePerUnit:null,note:'đùi gà'});
let row=shopping(s,w,start,end).find(r=>r.id==='chicken');check(row.qty===null&&!row.quantityKnown&&!row.costKnown&&row.cost===0,'two pieces do not fabricate grams or price');
check(buyingDisplay(row)==='2 cái'&&shoppingHasAmount(row),'sale quantity remains displayable and purchasable without grams');
check(row.needed===needs,'sale unit does not change recipe requirements');
setShoppingBought(w,start,end,row,true);check(shopping(s,w,start,end).find(r=>r.id==='chicken').bought,'unweighed pieces can be marked purchased');
check(storeShoppingPurchases(s,w,start,end,'fridge')===1,'unweighed pieces can be stored');
const lot=s.pantry.find(p=>p.purchase?.note==='đùi gà');/* v1.7.14 owner decision (8 Nov 2026, pop-up “Tự tính là đủ (ước tính)”; was: no mass at all, which kept the item on the list after putting it away): the count is kept and the lot covers what the list asked for, marked as an estimate */check(lot.purchase.amount===2&&lot.qtyEstimated===true&&Math.abs(lot.qty-row.missing)<1e-9,'pantry keeps the count and marks the mass as an estimate covering what the list asked for');
const before=stock(s,'chicken');check(before===400,'unmeasured pantry pieces do not subtract gram demand');
const cooked=createMeal(s,'r2');consumeMeal(s,cooked);check(s.pantry.some(p=>p.id===lot.id&&p.purchase.amount===2),'cooking another meal does not discard unmeasured pantry pieces');undoCook(s,cooked);
s.purchaseUnitPreferences={spinach:{unit:'bó',amount:1,basePerUnit:250,pricePerUnit:3,note:'bó nhỏ'}};
row=shopping(s,w,start,end).find(r=>r.id==='spinach');check(row.purchase.unit==='bó'&&row.purchase.amount===Math.ceil(row.suggested/250),'remembered known bunch size rounds automatic purchase to whole bunches');
check(row.cost===row.purchase.amount*3&&row.qty===row.purchase.amount*250,'unit price and explicit gram estimate remain separate');
setBuyingUnits(w,start,end,'spinach',{unit:'bó',amount:2,basePerUnit:250,pricePerUnit:3,note:'bó nhỏ'});row=shopping(s,w,start,end).find(r=>r.id==='spinach');setShoppingBought(w,start,end,row,true);storeShoppingPurchases(s,w,start,end,'fridge');const bunch=s.pantry.find(p=>p.purchase?.unit==='bó');check(bunch.qty===500&&bunch.purchase.amount===2,'known conversion stores both bunch count and estimate');
// v1.7.10 (owner, 7 Nov 2026: beef from the butcher went to the shelf): an item the family added gets a careful guess from its name
{const g=n=>(guessFood(n)||{}).place;check(g('Sườn bò')==='fridge'&&g('Thịt bò gravy')==='fridge'&&g('Bò viên')==='fridge'&&g('Trứng gà')==='fridge'&&g('Đậu hũ')==='fridge','meat, eggs and tofu → fridge');
 check(g('Tôm đông lạnh')==='freezer'&&g('Sunny frozen prawn cutlet')==='freezer','frozen → freezer');check(g('Mỳ trứng')==='dry'&&g('Xốt bò kho')==='dry'&&g('Nước mắm')==='dry'&&g('Gạo nếp')==='dry','noodles, sauces, rice → shelf');
 check(g('Bún tươi')==='fridge'&&g('Rau muống')==='fridge','fresh noodles and greens → fridge');check(guessFood('Giấy bạc')===null,'no guess when the name says nothing');
 const id='family-ing-qa-ribs';INGREDIENTS[id]=['Sườn bò','g','dry',0,'',null];check(suggestStorePlace(s,id)==='fridge','a family-added item called “Sườn bò” is suggested for the fridge, not the shelf');delete INGREDIENTS[id]}
// v1.7.10 (owner, 7 Nov 2026): each bought item has its own place (fridge / freezer / shelf); the family's last choice is remembered
{check(suggestStorePlace(s,'pork')==='fridge'&&suggestStorePlace(s,'fishSauce')==='dry'&&suggestStorePlace(s,'egg')==='fridge','suggested places: fresh → fridge, dry goods → shelf, eggs stay cold');
 const rows=shopping(s,w,start,end).filter(r=>shoppingHasAmount(r)&&!r.bought&&!r.skip).slice(0,3);check(rows.length===3,'three items to put away');for(const r of rows)setShoppingBought(w,start,end,r,true);
 const before=s.pantry.length,per={};per[rows[0].id]='freezer';per[rows[1].id]='dry';
 check(storeShoppingPurchases(s,w,start,end,'fridge',per)===3,'three items put away');const added=s.pantry.slice(before);const at=id=>added.find(p=>p.ingredient===id).place;
 check(at(rows[0].id)==='freezer'&&at(rows[1].id)==='dry','each item goes where it was put');check(at(rows[2].id)===suggestStorePlace(s,rows[2].id),'an item left alone gets its suggested place');
 check(s.preferences.storePlaces[rows[0].id]==='freezer'&&suggestStorePlace(s,rows[0].id)==='freezer','the freezer choice is remembered for next time');
 check(!(rows[2].id in s.preferences.storePlaces),'nothing is remembered for an item that was not chosen')}
const vegMeal=createMeal(s,'r28');vegMeal.servings=2;consumeMeal(s,vegMeal);check(bunch.qty===250&&bunch.purchase.amount===1,'consumption updates remaining count from explicit conversion');undoCook(s,vegMeal);check(bunch.qty===500&&bunch.purchase.amount===2,'undo restores count and estimate');
setBuyingUnits(w,start,end,'beef',{unit:'miếng',amount:1,basePerUnit:300,pricePerUnit:9,note:'thịt nạc'});const next=ensureWeek(s,addDays(start,7));check(!next.buyingUnits,'week-specific quantities do not leak to next week');
check(validImport(JSON.parse(JSON.stringify(s))),'sale units and pantry counts survive backup validation');
const bad=JSON.parse(JSON.stringify(s));bad.weeks[start].buyingUnits[purchaseScope(start,end)].beef.amount=-2;check(!validImport(bad),'negative sale quantities rejected on import');
const priceA={ingredient:'spinach',quantity:null,total:6,enteredQty:2,enteredUnit:'bó'};check(unitPrice(priceA).value===3&&unitPrice(priceA).unit==='bó','receipt can track actual price per bunch without grams');
s.stores=[{id:'shop-one',name:'Chợ thử',address:'Quầy thử nghiệm'}];setShoppingStore(s,w,start,end,'chicken','shop-one','Chọn đùi',true);check(shoppingStore(s,w,start,end,'chicken').store.address==='Quầy thử nghiệm','store address is retained with ingredient');check(shoppingStore(s,next,addDays(start,7),addDays(start,13),'chicken').storeId==='shop-one','remembered store applies to future week');
s.preferences.dayThemes={1:'fish'};check(dayTheme(start,s).id==='fish','weekday preference is configurable');
check(plannerRecipeBonus(start,s.recipes.find(r=>r.protein==='fish'),s)>plannerRecipeBonus(start,s.recipes.find(r=>r.protein==='pork'),s),'fish day influences recipe ranking without changing constraints');
check(validImport(s),'stores and day themes remain backup compatible');
`,ctx);
