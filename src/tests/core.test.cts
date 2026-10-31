const fs=require('node:fs');const vm=require('node:vm');const assert=require('node:assert/strict');
const ctx=vm.createContext({console,Intl,Date,Math,crypto:require('node:crypto').webcrypto});
vm.runInContext(fs.readFileSync('dist/seed.js','utf8')+'\n'+fs.readFileSync('dist/core.js','utf8'),ctx);
vm.runInContext(`
function check(test,name){if(!test)throw Error(name);console.log('PASS',name)}
let s=defaults(),w=ensureWeek(s,monday(sydneyDate()));
check(validImport(s),'seed state passes backup validation');
const date=Object.keys(w.days)[0],m=w.days[date].dinner;
const initial=mealIngredients(m,s);m.attendance.dad='away';const reduced=mealIngredients(m,s);
check(reduced.chicken<initial.chicken,'attendance scales only the affected meal');
check(mealServings(w.days[date].lunch,s)===3.15,'other meal attendance stays unchanged');
m.servings=4;check(mealIngredients(m,s).chicken===650,'manual serving override uses reference quantities');
s.pantry=[{id:'a',ingredient:'chicken',qty:400,place:'freezer',expiry:''},{id:'b',ingredient:'chicken',qty:500,place:'fridge',expiry:'2020-01-01'}];
let rows=shopping(s,w,date,date),ch=rows.find(r=>r.id==='chicken');
check(ch.have===400,'expired stock is excluded');check(Math.abs(ch.missing-(ch.needed-400))<.01,'stock is subtracted once from aggregated requirements');
s.preferences.packed=true;rows=shopping(s,w,date,date);ch=rows.find(r=>r.id==='chicken');check(ch.qty%500===0&&ch.qty>=ch.missing,'pack rounding never underbuys');
let before=JSON.stringify(s.pantry);const missing=consumeMeal(s,m);check(m.cooked,'cook records meal completion');check(stock(s,'chicken')===0,'cook consumes usable stock');check(missing.length>0,'cook reports untracked ingredient amounts');undoCook(s,m);check(stock(s,'chicken')===400,'undo restores consumed quantities');check(!m.cooked,'undo restores meal status');
const locked=w.days[date].lunch;locked.locked=true;const saved=JSON.stringify(locked.recipes);s.preferences.avoid='tôm';s.preferences.maxTime=30;const result=generateWeek(s,w);check(JSON.stringify(locked.recipes)===saved,'generator preserves locked meals');
for(const day of Object.values(w.days))for(const type of ['lunch','dinner']){const mm=day[type];if(mm.locked)continue;check(mm.recipes.every(r=>r.time<=30&&!r.ingredients.some(i=>i.id==='shrimp')),'generator applies time and avoidance rules')}
check(validImport(JSON.parse(JSON.stringify(s))),'exported state can be reimported');let bad=JSON.parse(JSON.stringify(s));bad.pantry[0].qty=-3;check(!validImport(bad),'negative inventory rejected on import');
check(fmtQty(1500,'g')==='1.5 kg','grams present as kilograms');check(addDays('2026-10-31',1)==='2026-11-01','calendar crosses month boundary');check(monday('2026-11-01')==='2026-10-26','Sunday belongs to the preceding Monday');
`,ctx);
vm.runInContext(`
let soupState=defaults(),soupWeek=ensureWeek(soupState,monday(sydneyDate()));
const sat=addDays(monday(sydneyDate()),5),sun=addDays(monday(sydneyDate()),6);
check(soupState.recipes.filter(r=>r.category==='noodle').length===24,'24 weekend soup recipes available');
check(soupWeek.days[sat].lunch.recipes.length===1&&soupWeek.days[sat].lunch.recipes[0].category==='noodle','new weekend plan starts with a complete soup meal');
let soupMeal=createMeal(soupState,'n1');let soupIngredients=mealIngredients(soupMeal,soupState);
check(!('rice'in soupIngredients),'no automatic rice added to soup meals');
check(soupIngredients.riceNoodle>0&&soupIngredients.broth>0,'noodles and ready broth included in grocery quantities');
const porridge=createMeal(soupState,'n17');check(mealIngredients(porridge,soupState).cookedRice>0&&!mealIngredients(porridge,soupState).rice,'quick porridge tracks cooked rice instead of raw rice');
soupState.preferences.weekendMeals='both';generateWeek(soupState,soupWeek);
check([sat,sun].every(d=>['lunch','dinner'].every(t=>soupWeek.days[d][t].recipes.length===1&&soupWeek.days[d][t].recipes[0].category==='noodle')),'weekend generator respects both-meals preference');
check(validImport(soupState),'soup plans pass backup validation');
`,ctx);
vm.runInContext(`
const qState=defaults(),qStart=monday(sydneyDate()),qEnd=addDays(qStart,6),qWeek=ensureWeek(qState,qStart);
let qOriginal=shopping(qState,qWeek,qStart,qEnd).find(r=>r.id==='chicken');
qWeek.bought.chicken=qOriginal.qty;
setPurchaseQuantity(qWeek,qStart,qEnd,'chicken',1000);
let qCustom=shopping(qState,qWeek,qStart,qEnd).find(r=>r.id==='chicken');
check(qCustom.custom&&qCustom.qty===1000,'manual purchase amount replaces suggested amount');
check(qCustom.cost===1000*INGREDIENTS.chicken[3],'manual amount controls grocery cost');
check(qCustom.needed===qOriginal.needed&&qCustom.missing===qOriginal.missing,'recipe needs stay unchanged by purchase edits');
check(!qCustom.bought,'quantity edit clears bought status for rechecking');
check(shopping(qState,qWeek,qStart,qStart).find(r=>r.id==='chicken').custom===false,'override is scoped to selected date range');
qWeek.days[qStart].dinner.attendance.dad='away';
check(shopping(qState,qWeek,qStart,qEnd).find(r=>r.id==='chicken').qty===1000,'chosen amount survives attendance recalculation');
let roundtrip=JSON.parse(JSON.stringify(qState));check(validImport(roundtrip),'manual amounts survive valid backup export/import');
setPurchaseQuantity(qWeek,qStart,qEnd,'egg',0);let eggs=shopping(qState,qWeek,qStart,qEnd).find(r=>r.id==='egg');check(eggs.custom&&eggs.qty===0&&eggs.cost===0,'zero quantity is an explicit no-purchase choice');
let threw=false;try{setPurchaseQuantity(qWeek,qStart,qEnd,'egg',1.5)}catch(e){threw=true}check(threw,'fractional count quantities rejected');
let qBad=JSON.parse(JSON.stringify(qState));qBad.weeks[qStart].quantities[purchaseScope(qStart,qEnd)].chicken=-1;check(!validImport(qBad),'negative manual quantities rejected in backups');
const qBefore=JSON.stringify(qState.pantry);setPurchaseQuantity(qWeek,qStart,qEnd,'chicken',250);check(JSON.stringify(qState.pantry)===qBefore,'selecting purchase quantity does not change actual stock');
resetPurchaseQuantity(qWeek,qStart,qEnd,'chicken');qCustom=shopping(qState,qWeek,qStart,qEnd).find(r=>r.id==='chicken');check(!qCustom.custom&&qCustom.qty===qCustom.suggested,'reset returns to recalculated automatic amount');
let oldBackup=JSON.parse(JSON.stringify(qState));delete oldBackup.weeks[qStart].quantities;check(validImport(oldBackup),'old backups without manual quantity field remain compatible');
`,ctx);
vm.runInContext(`
const multi=defaults(),multiMeal=createMeal(multi,'r1','r13','r23');multiMeal.servings=4;
const initialRibs=mealIngredients(multiMeal,multi).ribs;multiMeal.recipes.push(clone(multi.recipes.find(r=>r.id==='r3')));
check(multiMeal.recipes.filter(r=>r.category==='main').length===2,'one meal supports multiple mains');
check(mealIngredients(multiMeal,multi).ribs===initialRibs/2,'two mains automatically share standard portion');
check(mealIngredients(multiMeal,multi).salmon===300,'second main gets half of four-person recipe by default');
multiMeal.recipes.find(r=>r.id==='r3').portionFactor=1;
check(mealIngredients(multiMeal,multi).salmon===600,'per-dish portion override controls ingredient demand');
const savedSoup=multiMeal.recipes.find(r=>r.category==='soup').name;multiMeal.recipes[0]=clone(multi.recipes.find(r=>r.id==='r2'));
check(multiMeal.recipes.length===4&&multiMeal.recipes.some(r=>r.name===savedSoup),'replacing one dish preserves other dishes');
multiMeal.staple='none';check(!mealIngredients(multiMeal,multi).rice,'meal can explicitly omit rice');
multiMeal.staple='rice';check(mealIngredients(multiMeal,multi).rice===300,'meal can explicitly include rice');
const mw=ensureWeek(multi,monday(sydneyDate()));multi.preferences.weekendSoup=false;multi.preferences.mainCount=2;multi.preferences.soupCount=1;multi.preferences.vegCount=2;generateWeek(multi,mw);
check(Object.values(mw.days).every(day=>Object.values(day).every(m=>m.recipes.length===5&&m.recipes.filter(r=>r.category==='main').length===2&&m.recipes.filter(r=>r.category==='veg').length===2)),'generator respects five-dish family composition');
check(validImport(multi),'multi-dish plans remain backup compatible');
`,ctx);
vm.runInContext(`
const missingSeed=defaults();missingSeed.recipes=missingSeed.recipes.filter(r=>r.id!=='r2');
check(!!ensureWeek(missingSeed,monday(sydneyDate())),'deleting a built-in recipe does not break a new week');
check(!validImport(null),'null backup is rejected without throwing');
`,ctx);
