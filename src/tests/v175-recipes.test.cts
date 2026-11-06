// v1.7.5 owner feedback (4 Nov 2026): meal types vs dish types, amounts such as 1/2, counted units such as tép/đòn,
// the daily Bữa phụ slot and the opt-in school lunch box. Pure logic; the form itself is covered by the browser suite.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const c=vm.createContext({console,Intl,Date,Math,URL,structuredClone,crypto:require('node:crypto').webcrypto});
for(const f of ['seed.js','recipe-catalog.js','core.js','spending-core.js','purchase-units.js','planning-core.js','insights-core.js','family-menu-core.js'])vm.runInContext(fs.readFileSync('dist/'+f,'utf8'),c);
c.assert=assert;
vm.runInContext(`
// ---- amounts as typed (#13): fractions are read, and shown as fractions instead of being rounded up to 1
for(const [text,want] of [['2',2],['0.5',.5],['0,5',.5],['1/2',.5],['½',.5],['1 1/2',1.5],['1½',1.5],['¼',.25],['3/4',.75]])assert.equal(parseQty(text),want,text);
for(const text of ['','abc','1/0','2kg','-1'])assert.ok(Number.isNaN(parseQty(text)),'not an amount: '+text);
assert.equal(fmtQty(.5,'quả'),'½ quả');assert.equal(fmtQty(1.5,'quả'),'1½ quả');assert.equal(fmtQty(.25,'muỗng canh'),'¼ muỗng canh');
assert.equal(fmtQty(2,'tép'),'2 tép');assert.equal(fmtQty(1500,'g'),'1.5 kg');assert.equal(fmtQty(250,'g'),'250 g');
const half=recipeIngredientRows({ingredients:[{id:'lemon',qty:.5},{id:'egg',qty:.5}]},1,defaults());
assert.deepEqual(half.map(r=>r.qty),[.5,.5],'½ stays ½ in the recipe view');

// ---- Phân loại bữa ăn (#4): legacy values are read, never rewritten; nothing is ticked automatically
assert.deepEqual(recipeMeals({purposes:['main','friday']}).sort(),['dinner','lunch']);
assert.deepEqual(recipeMeals({purposes:['side']}).sort(),['dinner','lunch']);
assert.deepEqual(recipeMeals({purposes:['breakfast','feast']}).sort(),['breakfast','feast']);
assert.deepEqual(recipeTickedMeals({purposes:[]}),[],'an empty choice shows no ticks');
assert.deepEqual(recipeMeals({purposes:[],category:'noodle'}).sort(),['breakfast','dinner','feast','lunch'],'empty → dish-type default');
assert.deepEqual(recipeMeals({category:'dessert'}),['snack']);assert.deepEqual(recipeMeals({category:'lunchbox'}),['lunch']);
const legacy={purposes:['main','friday']};recipeMeals(legacy);assert.deepEqual(legacy.purposes,['main','friday'],'stored data untouched');
assert.equal(recipeFitsSlot({purposes:['main'],category:'main'},'main','dinner'),true);
assert.equal(recipeFitsSlot({purposes:['breakfast'],category:'main'},'main','dinner'),false);
assert.equal(recipeFitsSlot({purposes:['dinner'],category:'soup'},'friday'),false,'a soup is not a one-dish Friday dinner');
assert.equal(recipeFitsSlot({purposes:['friday'],category:'noodle'},'friday'),true);
assert.equal(recipeFitsSlot({purposes:[],category:'snack'},'snack'),true);

// ---- Phân loại món ăn (#5): new dish types are valid; labels follow the owner's list
assert.deepEqual(Object.values(CATEGORY),['Món chính','Món phụ','Món canh / soup','Món sợi','Món tráng miệng','Món ăn vặt','Món school lunch box']);

// ---- planner: daily Bữa phụ and the opt-in school lunch box
const fam=(id,name,category,purposes)=>({id,name,category,protein:'mixed',time:20,servings:4,yield:4,purposes,ingredients:[{id:'egg',qty:2}],missingIngredients:[],prep:'',steps:[],custom:true,origin:'family',favorite:false});
const s=defaults();s.preferences.maxTime=120;
s.recipes.push(fam('f-cake','Chè đậu xanh','dessert',[]),fam('f-snack','Bánh flan','snack',['snack']),fam('f-box','Cơm cuộn hộp','lunchbox',[]),
 fam('f-main','Thịt kho','main',['main','friday']),fam('f-soup','Canh chua','soup',['side']),fam('f-veg','Rau muống xào','veg',['side']),fam('f-noodle','Bún bò','noodle',['breakfast','friday','feast']));
const start=monday('2026-11-09');
// v1.7.7 owner decision: Bữa phụ is optional per day — the auto-plan fills it only on days the family added it
{const pre=ensureWeek(s,start);for(const d of ['2026-11-09','2026-11-11','2026-11-14'])pre.days[d].snack.on=true}
let res=familyGenerate(s,start,{random:()=>.4,sourceMode:'own'});
let w=s.weeks[start];
for(const[d,day]of Object.entries(w.days)){assert.ok(day.snack,'every day has a Bữa phụ meal slot');if(!day.snack.on){assert.equal(day.snack.recipes.length,0,'no Bữa phụ unless the family added it: '+d);continue}assert.equal(day.snack.recipes.length,1,'Bữa phụ is filled from family snack/dessert recipes');assert.ok(['dessert','snack'].includes(day.snack.recipes[0].category));assert.equal(day.snack.staple,'none','no rice with a snack')}
const mon=w.days[start];assert.ok(!mon.lunch.recipes.length,'no lunch box unless switched on');
assert.ok(mon.dinner.recipes.some(r=>r.id==='f-main'),'legacy Main dish recipes still plan into dinner');
assert.ok(!res.missing.some(x=>['snack','lunchbox'].includes(x.purpose)),'optional extras are not reported as missing');
const s2=defaults();s2.preferences.maxTime=120;s2.preferences.schoolLunchbox=true;s2.recipes.push(...s.recipes.filter(r=>r.origin==='family').map(r=>structuredClone(r)));
familyGenerate(s2,start,{random:()=>.4,sourceMode:'own'});w=s2.weeks[start];
for(let i=0;i<5;i++){const d=w.days[addDays(start,i)];assert.equal(d.lunch.recipes[0]?.id,'f-box','school-day lunch box Mon–Fri')}
assert.ok(!w.days[addDays(start,5)].lunch.recipes.some(r=>r.category==='lunchbox'),'no lunch box at the weekend');

// ---- data shape: edition 6 accepts the new meal, dish types and counted units; catalogue tombstones keep edition 5
assert.equal(APP_EDITION,6);assert.equal(CATALOG_EDITION,6/* v1.7.5: Vietnamese references halved */);
assert.equal(validFamilyState(s2),true,'snack meals and new dish types are valid');
const old=defaults();for(const w of Object.values(old.weeks||{}))for(const d of Object.values(w.days))delete d.snack;assert.equal(validFamilyState(old),true,'weeks saved before v1.7.5 (no snack) stay valid');
for(const unit of ['tép','đòn','muỗng canh','g'])assert.equal(hydrateFamilyIngredients({ingredientCatalog:{'family-ing-a':{name:'Tỏi',unit,group:'veg'}}}),true,unit);
assert.equal(hydrateFamilyIngredients({ingredientCatalog:{'family-ing-a':{name:'Tỏi',unit:'xyz',group:'veg'}}}),false,'unknown units are still refused');
console.log('PASS v1.7.5 amounts, fractions, meal/dish types, Bữa phụ, school lunch box, edition 6');
`,c);
// ---- owner, 5 Nov 2026: Vietnamese reference recipes halved (740 → 475). An existing family loses a retired recipe
// only when it never touched it; edited, favourite, photographed, planned or reacted-to copies stay.
vm.runInContext(`
{const all=[...RECIPES,...RETIRED_REFERENCE_RECIPES];assert.equal(RECIPES.length,475);assert.equal(RETIRED_REFERENCE_RECIPES.length,265);
 assert.ok(RETIRED_REFERENCE_RECIPES.every(r=>!/^(r|n)\\d/.test(r.id)&&!r.catalogEdition),'only expanded Vietnamese references retire; the 54 originals and Western/plant stay');
 const ids=[...RETIRED_REFERENCE_IDS].slice(0,6),copy=id=>clone(all.find(r=>r.id===id));
 const s=clone(defaults());s.seedVersion=5;s.recipes.push(...ids.map(copy));
 s.recipes.find(r=>r.id===ids[0]).favorite=true;                  // favourite
 Object.assign(s.recipes.find(r=>r.id===ids[1]),{custom:true,name:'Nhà mình sửa'}); // edited
 s.recipes.find(r=>r.id===ids[2]).photo={key:'p',updatedAt:'2026-11-01'}; // photo
 const wk=Object.keys(s.weeks||{})[0]||'2026-11-02';s.weeks??={};s.weeks[wk]??={days:{}};s.weeks[wk].days??={};s.weeks[wk].days['2026-11-03']={dinner:{recipes:[copy(ids[3])]}}; // planned
 s.preferences.reactions={[ids[4]]:'like'};                        // reacted to (any mention of the id)
 const before=s.recipes.length;upgradeReferenceCatalog(s);
 assert.equal(s.seedVersion,6);assert.equal(before-s.recipes.length,1,'only the untouched one leaves');
 for(const id of ids.slice(0,5))assert.ok(s.recipes.some(r=>r.id===id),'kept '+id);assert.ok(!s.recipes.some(r=>r.id===ids[5]),'untouched retired recipe removed');
 assert.ok(s.deletedRecipeIds.includes(ids[5]),'tombstoned so an older copy cannot bring it back');assert.ok(!s.deletedRecipeIds.includes(ids[0]));
 assert.equal(upgradeReferenceCatalog(s),0,'idempotent');
 // a family's own recipes are never touched
 const own={id:'fam-x',name:'Món nhà',category:'main',protein:'pork',time:20,servings:4,ingredients:[],prep:'',steps:['Nấu'],custom:true,origin:'family',favorite:false};const t=clone(defaults());t.seedVersion=5;t.recipes.push(own);upgradeReferenceCatalog(t);assert.ok(t.recipes.some(r=>r.id==='fam-x'));assert.ok(validImport(t),'upgraded state is valid');}
console.log('PASS v1.7.5 library halved: 475 offered, untouched retired recipes leave (tombstoned), favourite / edited / photo / planned / mentioned ones stay, family recipes untouched');
`,c);
