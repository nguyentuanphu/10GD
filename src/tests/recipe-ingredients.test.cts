// v1.7.3 owner report (iPhone, production v1.7.2): "Vẫn chưa thấy nguyên liệu" — a family recipe opened from a meal
// showed an empty ingredient box although the ingredient rows had been saved. Root causes covered here:
//  1. a dish in a meal is a copy taken when it was added; editing the recipe afterwards never reached that copy;
//  2. lines the shopping list cannot count (missingIngredients) were never shown in the detail view.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const c=vm.createContext({console,Intl,Date,Math,URL,structuredClone,crypto:require('node:crypto').webcrypto});
for(const f of ['store-registry.js','seed.js','recipe-catalog.js','core.js','spending-core.js','purchase-units.js','planning-core.js','insights-core.js','family-menu-core.js'])vm.runInContext(fs.readFileSync('dist/'+f,'utf8'),c);
c.assert=assert;
vm.runInContext(`
// ---- recipeIngredientRows: counted lines scaled, other lines verbatim, nothing invented
const myQuang={id:'mq',name:'Mỳ Quảng (Tôm - Thịt)',category:'noodle',protein:'mixed',time:30,servings:4,yield:4,purposes:['breakfast'],
 ingredients:[{id:'family-ing-mq',qty:500},{id:'shrimp',qty:300},{id:'pork',qty:300}],missingIngredients:['Tỏi 3 tép','Nước mắm 2 muỗng canh'],prep:'',steps:['Nấu theo cách quen của gia đình.'],custom:true,origin:'family'};
const s=defaults();s.weeks={};s.recipes=[myQuang];s.ingredientCatalog={'family-ing-mq':{name:'Mì Quảng',unit:'g',group:'dry'}};
assert.ok(hydrateFamilyIngredients(s));
let rows=recipeIngredientRows(myQuang,1,s);
assert.deepEqual(rows.map(r=>r.kind==='counted'?r.name+' '+r.qty+' '+r.unit:'note:'+r.text),['Mì Quảng 500 g','Tôm 300 g','Thịt heo 300 g','note:Tỏi 3 tép','note:Nước mắm 2 muỗng canh']);
rows=recipeIngredientRows(myQuang,0.5,s);assert.equal(rows[1].qty,150,'counted lines scale');assert.equal(rows[3].text,'Tỏi 3 tép','note lines are never scaled or rewritten');
// v1.7.5 (owner feedback #13: “ghi 1/2 hay 0.5 … vẫn là 1”): the recipe view shows the exact amount — no rounding up of
// whole items (the shopping list does its own purchase rounding); unknown ids are skipped instead of breaking the view
rows=recipeIngredientRows({ingredients:[{id:'egg',qty:3},{id:'lemon',qty:1},{id:'family-ing-gone',qty:2}]},0.5,s);
assert.deepEqual(rows.map(r=>[r.id,r.qty]),[['egg',1.5],['lemon',0.5]]);
// (b) a recipe saved before v1.7.1 (free-text block → structured + missing lines, or no missingIngredients field at all)
rows=recipeIngredientRows({ingredients:[{id:'pork',qty:300}],missingIngredients:['Hành phi 1 chén','Muối','  ']},1,s);
assert.deepEqual(rows.map(r=>r.kind==='counted'?r.id:r.text),['pork','Hành phi 1 chén','Muối'],'blank lines dropped, others verbatim');
assert.deepEqual(recipeIngredientRows({ingredients:[{id:'pork',qty:300}]},1,s).length,1,'older recipes without missingIngredients');
// (c) zero ingredients → empty (the view shows the empty state)
assert.deepEqual(recipeIngredientRows({ingredients:[],missingIngredients:[]},1,s),[]);
assert.deepEqual(recipeIngredientRows({},1,s),[]);
`,c);console.log('PASS recipe ingredient rows: catalogue lines scaled, non-countable lines verbatim, unknown ids skipped, empty recipes');
vm.runInContext(`
// ---- Henry's path: dish added to a meal while the recipe was still empty, ingredients entered later
const empty={id:'mq',name:'Mỳ Quảng (Tôm - Thịt)',category:'noodle',protein:'mixed',time:30,servings:4,yield:4,purposes:['breakfast'],ingredients:[],missingIngredients:[],prep:'',steps:['Nấu theo cách quen của gia đình.'],custom:true,origin:'family'};
const t=defaults();t.weeks={};t.pantry=[];t.recipes=[clone(empty)];t.ingredientCatalog={'family-ing-mq':{name:'Mì Quảng',unit:'g',group:'dry'}};hydrateFamilyIngredients(t);
const start='2026-11-02',w=ensureWeek(t,start),meal=w.days['2026-11-03'].dinner,cooked=w.days['2026-11-02'].dinner;
meal.recipes=[{...clone(empty),portionFactor:0.5}];cooked.recipes=[clone(empty)];cooked.cooked=true;
const batchDish={...clone(empty),batchId:'b1'};w.days['2026-11-04'].dinner.recipes=[batchDish];
// the family edits the recipe (what the form save does)
const live=t.recipes[0];Object.assign(live,{ingredients:[{id:'family-ing-mq',qty:500},{id:'shrimp',qty:300},{id:'pork',qty:300}],missingIngredients:['Tỏi 3 tép','Nước mắm 2 muỗng canh']});
// liveMealDish: view-only, no write
const before=JSON.stringify(t);
const shown=liveMealDish(t,meal,meal.recipes[0]);
assert.equal(shown.ingredients.length,3);assert.deepEqual(shown.missingIngredients,['Tỏi 3 tép','Nước mắm 2 muỗng canh']);assert.equal(shown.portionFactor,0.5,'meal portion kept');
assert.notEqual(shown,live,'a copy, never the stored recipe');
assert.equal(liveMealDish(t,cooked,cooked.recipes[0]).ingredients.length,0,'cooked meals keep what was cooked');
assert.equal(liveMealDish(t,w.days['2026-11-04'].dinner,batchDish),batchDish,'batch dishes keep their copy');
const lib={...clone(empty),id:'lib',custom:false,origin:undefined};t.recipes.push(lib);const libSnap=clone(lib);assert.equal(liveMealDish(t,meal,libSnap),libSnap,'library recipes keep the meal copy');t.recipes.pop();
assert.equal(liveMealDish(t,meal,{...clone(empty),id:'deleted'}).id,'deleted','deleted recipe → meal copy');
assert.equal(JSON.stringify(t),before,'viewing changes no stored data');
// refreshPlannedDishes after the family's save: planned meals follow, cooked and batch meals do not
assert.equal(shopping(t,w,'2026-11-03','2026-11-03').some(r=>r.id==='shrimp'),false,'v1.7.2: shopping list missed the new ingredients');
assert.equal(refreshPlannedDishes(t,live),1);
assert.equal(meal.recipes[0].ingredients.length,3);assert.equal(meal.recipes[0].portionFactor,0.5,'portion kept');assert.notEqual(meal.recipes[0],live,'copy, not shared reference');
assert.equal(cooked.recipes[0].ingredients.length,0,'cooked meal untouched');assert.equal(w.days['2026-11-04'].dinner.recipes[0].ingredients.length,0,'batch untouched');
assert.ok(shopping(t,w,'2026-11-03','2026-11-03').some(r=>r.id==='shrimp'),'shopping list now has the shrimp');
assert.equal(shopping(t,w,'2026-11-03','2026-11-03').some(r=>/Tỏi|Nước mắm/.test(INGREDIENTS[r.id]?.[0]||'')),false,'non-countable lines are not counted');
assert.equal(refreshPlannedDishes(t,{id:'nope'}),0);
// (e) sync round trip: the saved state survives JSON (what the family sync uploads/downloads) and still validates
w.days['2026-11-04'].dinner.recipes=[];const round=JSON.parse(JSON.stringify(t));assert.ok(validImport(round),'synced state validates');
assert.deepEqual(round.recipes[0].missingIngredients,['Tỏi 3 tép','Nước mắm 2 muỗng canh']);assert.equal(recipeIngredientRows(round.recipes[0],1,round).length,5);
`,c);console.log('PASS meal copies: planned meals show and shop the edited recipe, cooked/batch/library copies kept, view writes nothing, sync round trip');
