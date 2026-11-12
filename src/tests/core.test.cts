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
check(fmtQty(1500,'g')==='1.5 kg','grams present as kilograms');
/* Issue #38: counted units (con, cái, bó, …) are bought in whole numbers after scaling, like 'quả'. */
{INGREDIENTS.qaCon=['Gà ta QA','con','meat',0,'',null];INGREDIENTS.qaBo=['Hành lá QA','bó','veg',0,'',null];
 const cm=clone(m);cm.cooked=false;cm.recipes=[{id:'qa38',name:'QA',ingredients:[{id:'qaCon',qty:1},{id:'qaBo',qty:1},{id:'chicken',qty:500}],servings:4,yield:4}];cm.servings=3.2;
 const need=mealIngredients(cm,s);check(need.qaCon===1&&need.qaBo===1,'counted units round up after scaling (1 con stays 1, not 0.8)');
 check(need.chicken===400,'weighed units still scale exactly');
 cm.servings=4.4;check(mealIngredients(cm,s).qaCon===2,'counted units round up, never down (1.1 con buys 2)');
 delete INGREDIENTS.qaCon;delete INGREDIENTS.qaBo}check(addDays('2026-10-31',1)==='2026-11-01','calendar crosses month boundary');check(monday('2026-11-01')==='2026-10-26','Sunday belongs to the preceding Monday');
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
check(mealIngredients(multiMeal,multi).ribs===initialRibs,'two mains each cook in full (v1.7.8 owner decision; before: halved automatically)');
check(mealIngredients(multiMeal,multi).salmon===600,'second main cooks the full four-person recipe by default (v1.7.8)');
multiMeal.recipes.find(r=>r.id==='r3').portionFactor=.5;
check(mealIngredients(multiMeal,multi).salmon===300,'per-dish portion override (½) controls ingredient demand');
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
// v1.7.12 (owner, 8 Nov 2026 — pop-up: ask when “Đã nấu” is tapped): one pot for the same dish in the next meals
{const s2=defaults(),w2=ensureWeek(s2,monday(sydneyDate())),days=Object.keys(w2.days).sort(),d0=days[0],d1=days[1];
 const src=w2.days[d0].dinner,dish=clone(src.recipes[0]);w2.days[d1].lunch.recipes=[clone(dish),clone(s2.recipes.find(r=>r.id!==dish.id&&r.category==='veg'))];w2.days[d1].lunch.servings=null;
 const ids=[...new Set(src.recipes.concat(w2.days[d1].lunch.recipes).flatMap(r=>r.ingredients.map(i=>i.id)))];s2.pantry=ids.map((id,n)=>({id:'p'+n,ingredient:id,qty:100000,place:'fridge',expiry:''}));
 const cand=cookAheadCandidates(s2,d0,'dinner');const hit=cand.find(c=>c.date===d1&&c.type==='lunch');
 check(!!hit&&hit.recipeIds.length===1&&hit.recipeIds[0]===dish.id,'cook ahead offers the next meal with the same dish (only that dish)');
 check(cand.length>0&&cand.every(c=>c.date>d0&&c.date<=addDays(d0,3)),'cook ahead only offers later meals, up to 3 days on (dinner is the last meal of its day)');
 const later=w2.days[d1].lunch,ownNeed=mealIngredients(src,s2),aheadNeed=dishNeeds(later,s2,later.recipes.filter(r=>r.id===dish.id)),fullLater=mealIngredients(later,s2);
 const before=Object.fromEntries(ids.map(id=>[id,stock(s2,id)]));cookMealAhead(s2,d0,'dinner',[hit]);
 check(src.cooked&&src.aheadFor?.length===1,'the cooked meal records the meals it cooked for');
 check(ids.every(id=>Math.abs(before[id]-stock(s2,id)-((ownNeed[id]||0)+(aheadNeed[id]||0)))<.11),'pantry taken once: this meal plus the later portion of the same dish');
 check(later.recipes[0].cookedAhead?.date===d0&&!later.recipes[1].cookedAhead&&!later.cooked,'later meal: the shared dish is cooked ahead, the other dish still to cook');
 const after=mealIngredients(later,s2);check(Object.keys(aheadNeed).every(id=>(after[id]||0)<=(fullLater[id]||0)-(aheadNeed[id]||0)+.11),'a dish cooked ahead leaves the later meal’s needs (pantry and shopping list)');
 consumeMeal(s2,later);let blocked=false;try{undoCook(s2,src)}catch(e){blocked=true}check(blocked&&src.cooked,'undo waits while a later meal was cooked on its own');
 undoCook(s2,later);undoCook(s2,src);check(!src.cooked&&!src.aheadFor&&!later.recipes[0].cookedAhead,'undo clears the cooked-ahead marks');
 check(ids.every(id=>Math.abs(before[id]-stock(s2,id))<.11),'undo gives back everything that was taken');
 w2.days[d1].lunch.recipes=[clone(dish)];const c2=cookAheadCandidates(s2,d0,'dinner').filter(c=>c.date===d1&&c.type==='lunch');cookMealAhead(s2,d0,'dinner',c2);
 check(later.cooked&&later.cookedWith?.date===d0&&later.consumed.length===0,'a later meal whose every dish was cooked ahead counts as cooked');
 check(Object.keys(shoppingMealIngredientsSafe(s2,later)).length===0,'a meal cooked ahead is not on the shopping list');
 undoCook(s2,src);check(!later.cooked&&!later.cookedWith,'undo also reopens the meal that was fully cooked ahead');
 check(validImport(JSON.parse(JSON.stringify(s2))),'cook-ahead marks pass backup validation')}
// v1.7.12 (owner, 8 Nov 2026 — pop-ups: guests with a name; several families or people; regular guests; several meals)
{const s3=defaults(),w3=ensureWeek(s3,monday(sydneyDate())),d=Object.keys(w3.days)[0],m=w3.days[d].dinner;m.servings=null;const base=mealServings(m,s3),need0=mealIngredients(m,s3);
 setMealGuests(m,[{name:'  Nhà anh Tuấn  ',adults:2,kids:1},{name:'',adults:1,kids:0},{name:'Trống',adults:0,kids:0}]);
 check(m.guests.length===2&&m.guests[0].name==='Nhà anh Tuấn'&&m.guests[1].name===undefined,'guest groups stored, names trimmed, empty groups dropped');
 check(Math.abs(mealServings(m,s3)-(base+3.5))<1e-9,'every group counts: an adult 1 portion, a child ½');
 const need1=mealIngredients(m,s3),k=Object.keys(need0)[0];check(need1[k]>need0[k],'guests raise the amounts to buy');
 check(validImport(JSON.parse(JSON.stringify(s3))),'guests pass backup validation');
 const bad=JSON.parse(JSON.stringify(s3));Object.values(bad.weeks)[0].days[d].dinner.guests=[{adults:-1,kids:0}];check(!validImport(bad),'negative guests rejected');
 const bad2=JSON.parse(JSON.stringify(s3));Object.values(bad2.weeks)[0].days[d].dinner.guests=[{adults:1.5}];check(!validImport(bad2),'fractional guests rejected');
 const bad3=JSON.parse(JSON.stringify(s3));Object.values(bad3.weeks)[0].days[d].dinner.guests={adults:1};check(!validImport(bad3),'guests must be a list of groups');
 m.servings=6;check(mealServings(m,s3)===6,'portions set by hand stay as typed');m.servings=null;
 setMealGuests(m,[{adults:99}]);check(m.guests[0].adults===30,'guests capped at 30 per group');setMealGuests(m,Array.from({length:14},()=>({adults:1})));check(m.guests.length===10,'at most 10 groups');
 setMealGuests(m,[]);check(m.guests===undefined,'no guests removes the record');check(Math.abs(mealServings(m,s3)-base)<1e-9,'without guests the meal is back to the family’s portions');
 rememberGuests(s3,[{name:'Nhà anh Tuấn',adults:2,kids:1},{name:'',adults:3}]);rememberGuests(s3,[{name:'Chị Lan',adults:1}]);rememberGuests(s3,[{name:'nhà anh tuấn',adults:2,kids:2}]);
 check(s3.guestBook.length===2&&s3.guestBook[0].kids===2&&s3.guestBook[1].name==='Chị Lan','regular guests remembered by name, newest first, no duplicates, unnamed groups not kept');
 check(validImport(JSON.parse(JSON.stringify(s3))),'regular guests pass backup validation');const bb=JSON.parse(JSON.stringify(s3));bb.guestBook.push({name:'',adults:1});check(!validImport(bb),'a regular guest needs a name');
 forgetGuest(s3,'Chị Lan');check(s3.guestBook.length===1,'a regular guest can be forgotten');
 const r=mealsBetween(s3,'2026-11-14','dinner','2026-11-15','lunch');check(JSON.stringify(r.map(x=>x.date.slice(8)+x.type))==='["14dinner","15breakfast","15snackAm","15lunch"]','meals from Saturday dinner to Sunday lunch, in order');
 check(mealsBetween(s3,'2026-11-15','lunch','2026-11-14','dinner').length===0&&mealsBetween(s3,'2026-11-14','dinner','2026-11-14','lunch').length===0,'a last meal before the first gives nothing');
 check(mealsBetween(s3,'2026-11-14','lunch','2026-11-14','lunch').length===1,'one meal')}
// v1.7.12 (owner, 8 Nov 2026 — “đồ còn dư”): cooked food kept for later
{const s4=defaults(),w4=ensureWeek(s4,monday(sydneyDate())),d=Object.keys(w4.days)[1],m=w4.days[d].dinner,dish=m.recipes[0];
 const lo=addLeftover(s4,{name:dish.name,recipeId:dish.id,portions:2.3,place:'fridge',cookedOn:'2026-11-08'});check(lo.portions===2.5&&lo.useBy==='2026-11-11','leftover: portions in halves, fridge use-by 3 days');
 const fz=addLeftover(s4,{name:'Canh',portions:1,place:'freezer',cookedOn:'2026-11-08'});check(fz.useBy==='2026-12-08','leftover: freezer use-by 30 days');
 check(validImport(JSON.parse(JSON.stringify(s4))),'leftovers pass backup validation');const bl=JSON.parse(JSON.stringify(s4));bl.leftovers[0].portions=-1;check(!validImport(bl),'negative leftovers rejected');
 const now=leftoversNow(s4,'2026-11-12');check(now.find(x=>x.id===lo.id).expired&&!now.find(x=>x.id===fz.id).expired,'leftover past its date is flagged');
 const later=w4.days[d].lunch;later.recipes=[];later.cooked=false;later.servings=2;const took=serveLeftover(s4,lo.id,later);
 check(took===2&&later.recipes[0].fromLeftover?.id===lo.id&&s4.leftovers.find(x=>x.id===lo.id).portions===.5,'serving leftovers adds the dish and takes the portions');
 check(Object.keys(mealIngredients(later,s4)).length===0,'a dish served from leftovers is not bought or taken from the pantry again');
 eatLeftover(s4,lo.id,1);check(!s4.leftovers.some(x=>x.id===lo.id),'eaten up leftovers disappear');dropLeftover(s4,fz.id);check(s4.leftovers===undefined,'thrown out leftovers disappear');
 check(validImport(JSON.parse(JSON.stringify(s4))),'meals with leftover dishes pass backup validation')}
// v1.7.13 guest invitations: a group the family invited counts by its answer
{const s6=defaults(),w6=ensureWeek(s6,monday(sydneyDate())),days=Object.keys(w6.days).sort(),m1=w6.days[days[0]].dinner,m2=w6.days[days[1]].lunch;m1.servings=null;m2.servings=null;const b1=mealServings(m1,s6);
 const inv={id:'inv-abc12345',token:'A'.repeat(32),deadline:'2026-11-13T10:00:00Z',expiresAt:'2026-11-15T12:59:00Z'};
 setMealGuests(m1,[{name:'Nhà anh Tuấn',adults:2,kids:0,invite:inv,maybe:'half'}]);setMealGuests(m2,[{name:'Nhà anh Tuấn',adults:2,kids:0,invite:inv,maybe:'half'}]);
 check(m1.guests[0].invite.token===inv.token&&m1.guests[0].maybe==='half','an invited group keeps its invitation and the family’s “not sure” choice');
 check(Math.abs(mealServings(m1,s6)-(b1+2))<1e-9,'no answer yet: the family’s own estimate counts');
 const ch=applyInviteReplies(s6,[{inviteId:'inv-abc12345',response:{status:'maybe',adults:3,kids:2,note:'muộn',at:'2026-11-10T00:00:00Z'}}]);
 check(ch===2&&m1.guests[0].adults===3&&m2.guests[0].kids===2&&m1.guests[0].rsvp.note==='muộn','an answer is written into every meal of that group');
 check(applyInviteReplies(s6,[{inviteId:'inv-abc12345',response:{status:'maybe',adults:3,kids:2,at:'2026-11-10T00:00:00Z'}}])===0,'the same answer is applied once');
 check(Math.abs(mealServings(m1,s6)-(b1+(3+1)*.5))<1e-9,'“not sure” counted half when the family chose half');
 m1.guests[0].maybe='none';check(Math.abs(mealServings(m1,s6)-b1)<1e-9,'“not sure” not counted when the family chose so');m1.guests[0].maybe='full';check(Math.abs(mealServings(m1,s6)-(b1+4))<1e-9,'“not sure” counted fully by default');
 applyInviteReplies(s6,[{inviteId:'inv-abc12345',response:{status:'busy',adults:0,kids:0,at:'2026-11-12T00:00:00Z'}}]);check(Math.abs(mealServings(m1,s6)-b1)<1e-9&&m1.guests[0].adults===3,'busy / can’t come: not counted, the last numbers kept for reference');
 check(validImport(JSON.parse(JSON.stringify(s6))),'invitations and answers pass backup validation');
 const bad=JSON.parse(JSON.stringify(s6));Object.values(bad.weeks)[0].days[days[0]].dinner.guests[0].invite.token='short';check(!validImport(bad),'a malformed invitation is rejected');
 const bad2=JSON.parse(JSON.stringify(s6));Object.values(bad2.weeks)[0].days[days[0]].dinner.guests[0].rsvp.status='party';check(!validImport(bad2),'an unknown answer is rejected')}
// v1.7.14 (owner, 8 Nov 2026: “cất đồ rồi mà tại sao vẫn hiện đồ để đi mua?”): rounding leftovers are not something to buy
{const s7=defaults(),w7=ensureWeek(s7,monday(sydneyDate())),d=Object.keys(w7.days)[0];s7.preferences.pantryDeduct=true;const rows0=shopping(s7,w7,d,d),r0=rows0.find(r=>INGREDIENTS[r.id][1]==='g'&&r.needed>1);
 s7.pantry=[{id:'eps',ingredient:r0.id,qty:r0.needed-1e-9,place:'fridge',expiry:''}];const r1=shopping(s7,w7,d,d).find(r=>r.id===r0.id);check(r1.missing===0&&r1.suggested===0,'a rounding leftover after putting away is not on the list');
 s7.pantry=[{id:'eps',ingredient:r0.id,qty:r0.needed-1,place:'fridge',expiry:''}];check(shopping(s7,w7,d,d).find(r=>r.id===r0.id).missing>0,'a real shortfall still is')}
function shoppingMealIngredientsSafe(s,m){return m.cooked?{}:mealIngredients(m,s)}
`,ctx);
// v1.7.12 (owner, 8 Nov 2026 — “cất đồ đúng chỗ tự động”): put-away places and use-by suggestions
{const ctx2=vm.createContext({console,Intl,Date,Math,crypto:require('node:crypto').webcrypto});vm.runInContext(['seed','core','unit-registry','purchase-units'].map(f=>fs.readFileSync('dist/'+f+'.js','utf8')).join('\n'),ctx2);
 vm.runInContext(`function check(t,n){if(!t)throw Error(n);console.log('PASS',n)}
 const st={preferences:{storePlaces:{beef:'dry',garlic:'dry',rice:'fridge'}}};
 check(suggestStorePlace(st,'beef')==='fridge','meat remembered on the dry shelf is suggested for the fridge');
 check(suggestStorePlace(st,'garlic')==='dry','garlic may stay on the shelf as the family keeps it');
 check(suggestStorePlace(st,'rice')==='fridge','a cold place the family chose is kept');
 check(suggestStorePlace({},'tomato')==='fridge'&&suggestUseBy('tomato','fridge','2026-11-08')==='2026-11-13','tomato: fridge, 5 days (not read as fish)');
 check(suggestUseBy('beef','fridge','2026-11-08')==='2026-11-10'&&suggestUseBy('beef','freezer','2026-11-08')==='2027-02-06','meat: 2 days in the fridge, 90 in the freezer');
 check(suggestUseBy('egg','fridge','2026-11-08')==='2026-11-29'&&suggestUseBy('rice','dry','2026-11-08')==='','eggs 21 days; dry goods no date');
 const s5={pantry:[{id:'a',ingredient:'beef',qty:500,place:'dry',expiry:''},{id:'b',ingredient:'rice',qty:500,place:'dry',expiry:''},{id:'c',ingredient:'chicken',qty:0,place:'dry',expiry:''}]};
 check(JSON.stringify(misplacedLots(s5).map(p=>p.id))==='["a"]','only perishable stock on the shelf is flagged (nothing moved)');`,ctx2)}

