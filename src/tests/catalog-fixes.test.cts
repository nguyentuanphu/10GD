// v1.5 catalog review fixes: mixed-version sync, tombstones, menu balance, rice rule, pricing for scoring and diet labels.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const {MAIN_INGREDIENTS,MAIN_VALID_IMPORT}=require('./fixtures/main-0bcef70-client.cjs');
const load=()=>{const c=vm.createContext({console,Intl,Date,Math:Object.create(Math),structuredClone,crypto:require('node:crypto').webcrypto});vm.runInContext(['seed','recipe-catalog','core','spending-core','purchase-units','planning-core','insights-core','family-menu-core','availability-core','personal-core'].map(f=>fs.readFileSync('dist/'+f+'.js','utf8')).join('\n')+'\nthis.api={RECIPES,INGREDIENTS,WESTERN_HEALTHY_RECIPES,PLANT_RECIPES,APP_EDITION,defaults,validImport,upgradeReferenceCatalog,recordDeletedReferenceRecipes,mergeDeletedRecipeIds,stateEdition,generateWeek,familyGenerate,ensureWeek,monday,addDays,mealHasRice,recipeCuisine,recipeCost,scoringPrice,scoringRecipeCost,pantryMatchCount,recipeDiet,isVegetarianRecipe,isVeganRecipe,recipeNeedsDietCheck,recipeSuggestions,clone}',c);return c};
const c=load(),a=c.api,json=x=>JSON.parse(JSON.stringify(x));

// 1. Mixed-version sync. The released main client validates every ingredient id against its own table.
const old=vm.createContext({INGREDIENTS:structuredClone(MAIN_INGREDIENTS)});vm.runInContext(MAIN_VALID_IMPORT+'\nthis.validImport=validImport;',old);
const fresh=json(a.defaults());
assert.equal(old.validImport(fresh),false,'documented one-time risk: the main client rejects a state containing the new catalogue ingredients');
const legacy=json(a.defaults());legacy.seedVersion=3;delete legacy.appEdition;legacy.recipes=JSON.parse(fs.readFileSync('docs/reviews/artwork-audit-20261102/source.json','utf8')).recipes.filter(r=>!r.catalogEdition||r.catalogEdition<4); // frozen pre-correction recipes: current defaults now contain spaghetti, introduced in edition 4.
assert.equal(old.validImport(json(legacy)),true,'a v3 state without new ingredients is still readable by main');
assert.equal(a.validImport(legacy),true);assert.equal(a.upgradeReferenceCatalog(legacy),200);assert.equal(legacy.appEdition,a.APP_EDITION);
// The new client keeps unknown ids written by a newer edition instead of rejecting or dropping them.
const future=json(a.defaults());future.appEdition=a.APP_EDITION+1;future.seedVersion=a.APP_EDITION+1;future.recipes.push({...json(a.RECIPES[0]),id:'future-1',ingredients:[{id:'yuzu',qty:2},{id:'pork',qty:300}]});future.pantry.push({id:'lot-yuzu',ingredient:'yuzu',qty:3,place:'fridge',expiry:''});future.newerField={kept:true};
assert.equal(a.stateEdition(future),a.APP_EDITION+1);assert.equal(a.validImport(future),true,'newer edition: unknown ingredient ids are tolerated');
assert.ok(a.INGREDIENTS.yuzu,'placeholder registered so the UI can render until reload');assert.equal(a.INGREDIENTS.yuzu[3],0,'no price is invented');
assert.equal(future.recipes.find(r=>r.id==='future-1').ingredients[0].id,'yuzu');assert.equal(future.newerField.kept,true);
const c2=load(),same=json(c2.api.defaults());same.recipes.push({...json(c2.api.RECIPES[0]),id:'odd',ingredients:[{id:'notAnIngredient',qty:1}]});
assert.equal(c2.api.validImport(same),false,'unknown ids from the same edition remain invalid data');
const bad=json(a.defaults());bad.deletedRecipeIds=[42];assert.equal(a.validImport(bad),false);bad.deletedRecipeIds=['r1'];bad.appEdition=1.5;assert.equal(a.validImport(bad),false);

// 2. Tombstones: deleted reference recipes never come back through an older copy, sync or backup.
const s=json(a.defaults());s.recipes=s.recipes.filter(r=>r.id!=='west-v4-001'&&r.id!=='plant-v5-041');a.recordDeletedReferenceRecipes(s);
assert.equal(JSON.stringify([...s.deletedRecipeIds].sort()),JSON.stringify(['plant-v5-041','west-v4-001']));assert.ok(a.validImport(s));
const olderCopy=json(a.defaults());olderCopy.seedVersion=3;delete olderCopy.appEdition;olderCopy.recipes=olderCopy.recipes.filter(r=>!r.catalogEdition||r.catalogEdition<4);
assert.equal(a.upgradeReferenceCatalog(olderCopy,s.deletedRecipeIds),198,'union with tombstones known on this device');
assert.ok(!olderCopy.recipes.some(r=>r.id==='west-v4-001'||r.id==='plant-v5-041'));assert.equal(a.upgradeReferenceCatalog(olderCopy),0,'idempotent');assert.ok(olderCopy.deletedRecipeIds.includes('west-v4-001'));
const backup=json(olderCopy);backup.seedVersion=4;backup.recipes=backup.recipes.filter(r=>!r.id.startsWith('plant-v5-'));assert.ok(a.validImport(backup));assert.equal(a.upgradeReferenceCatalog(backup),99,'backup import keeps its own tombstones');assert.ok(!backup.recipes.some(r=>r.id==='plant-v5-041'));
const restored=json(s);restored.recipes.push(json(a.RECIPES.find(r=>r.id==='west-v4-001')));a.recordDeletedReferenceRecipes(restored);assert.ok(!restored.deletedRecipeIds.includes('west-v4-001'),'a recipe the family restores clears its tombstone');
const merged={deletedRecipeIds:['a']};a.mergeDeletedRecipeIds(merged,['b','a']);assert.equal(merged.deletedRecipeIds.join(),'a,b');
const authored=json(a.defaults());authored.recipes.push({...json(a.RECIPES[5]),id:'family-own-1',custom:true,origin:'family',name:'Cá kho bà nội'});authored.seedVersion=3;a.upgradeReferenceCatalog(authored);assert.equal(authored.recipes.find(r=>r.id==='family-own-1').name,'Cá kho bà nội','family recipes untouched');

// 3. Menu distribution on defaults: 50 seeded weeks of the family planner and of the classic planner.
let seed=20261101;const rnd=()=>{seed=(seed*1103515245+12345)%2147483648;return seed/2147483648};c.Math.random=rnd;
const tally={},bump=(k,r)=>{const t=tally[k]??={n:0,viet:0};t.n++;if(a.recipeCuisine(r)==='viet')t.viet++};let dressings=0,vietNoRice=0,maxForeign=0;
for(const mode of ['family','classic'])for(let k=0;k<50;k++){const st=a.defaults();if(mode==='classic')st.preferences.familyPlanner=false;st.weeks={};const start=a.addDays(a.monday('2026-11-02'),k*7),w=a.ensureWeek(st,start);if(mode==='family')a.familyGenerate(st,start,{random:rnd});else a.generateWeek(st,w,rnd);let foreign=0;
 for(const day of Object.values(w.days))for(const t of ['breakfast','lunch','dinner']){const m=day[t];if(!m?.recipes.length)continue;for(const r of m.recipes){if(r.recipeKind==='dressing')dressings++;bump(mode+':'+(t==='breakfast'?'breakfast':r.batchId?'feast':r.category),r)}const main=m.recipes.find(r=>r.category==='main'&&!r.batchId);if(t!=='breakfast'&&main&&!m.recipes.some(r=>r.batchId)){if(a.recipeCuisine(main)==='viet'&&main.stapleIncluded!==true&&!a.mealHasRice(m))vietNoRice++;if(a.recipeCuisine(main)!=='viet')foreign++}else if(t!=='breakfast'&&m.recipes.find(r=>r.category==='noodle'&&!r.batchId)&&a.recipeCuisine(m.recipes.find(r=>r.category==='noodle'))!=='viet')foreign++}
 maxForeign=Math.max(maxForeign,foreign)}
for(const[k,t]of Object.entries(tally))assert.ok(t.viet/t.n>=.8,`${k}: ${t.viet}/${t.n} Vietnamese`);
assert.equal(dressings,0,'dressings are never planned');assert.equal(vietNoRice,0,'every Vietnamese rice meal keeps rice');assert.ok(maxForeign<=2,'at most two Western/healthy meals a week, got '+maxForeign);
const d0=a.defaults();assert.ok(a.recipeSuggestions(d0,{limit:30}).every(x=>x.recipe.recipeKind!=='dressing'));

// 4. Rice is decided by the main dish only.
const R=id=>json(a.RECIPES.find(r=>r.id===id));const meal=recipes=>({recipes,staple:'auto',servings:4,attendance:{}});
const westSoup=a.RECIPES.find(r=>r.category==='soup'&&r.stapleIncluded===true),salad=a.RECIPES.find(r=>r.recipeKind==='seed-salad'&&r.stapleIncluded===true),pasta=a.RECIPES.find(r=>r.category==='main'&&r.stapleIncluded===true);
assert.ok(westSoup&&salad&&pasta);assert.equal(a.mealHasRice(meal([R('r1'),json(westSoup)])),true);assert.equal(a.mealHasRice(meal([R('r1'),json(salad)])),true);assert.equal(a.mealHasRice(meal([json(pasta),json(salad)])),false);assert.equal(a.mealHasRice(meal([R('n1')])),false);assert.equal(a.mealHasRice(meal([R('r13'),R('r23')])),true);assert.equal(a.mealHasRice({...meal([json(pasta)]),staple:'rice'}),true);

// 5. Unknown prices are only estimated for scoring; displayed cost is unchanged and staples are no pantry bonus.
assert.equal(a.INGREDIENTS.spaghetti[3],0);assert.ok(a.scoringPrice('spaghetti')>0);assert.equal(a.scoringPrice('pork'),a.INGREDIENTS.pork[3]);
const pastaDish=json(a.WESTERN_HEALTHY_RECIPES[0]);assert.ok(a.scoringRecipeCost(pastaDish)>a.recipeCost(pastaDish));
const pan=a.defaults();assert.equal(a.pantryMatchCount(pan,{ingredients:[{id:'salt',qty:2},{id:'oil',qty:5},{id:'sugar',qty:3},{id:'fishSauce',qty:4}]}),0);assert.equal(a.pantryMatchCount(pan,{ingredients:[{id:'chicken',qty:200}]}),1);

// 6. Diet labels match ingredients, using lists written independently here.
const ANIMAL=['pork','ribs','chicken','beef','salmon','fish','shrimp','fishSauce','broth','wonton','fishBall','cookedChicken','tuna'],DAIRY_EGG=['egg','eggNoodle','milk','yogurt','cream','butter'],CHECK=['miso','parmesan','mozzarella','feta','bread','wholeBread','pasta','lasagne'];
let vegan=0,veg=0,check=0;for(const r of a.RECIPES){const ids=r.ingredients.map(i=>i.id);if(a.isVeganRecipe(r)){vegan++;assert.ok(ids.every(id=>!ANIMAL.includes(id)&&!DAIRY_EGG.includes(id)&&!CHECK.includes(id)),r.name+' wrongly vegan')}if(a.isVegetarianRecipe(r)){veg++;assert.ok(ids.every(id=>!ANIMAL.includes(id)&&!CHECK.includes(id)),r.name+' wrongly vegetarian')}if(a.recipeNeedsDietCheck(r)){check++;assert.ok(ids.some(id=>CHECK.includes(id))&&!ids.some(id=>ANIMAL.includes(id)))}if(ids.some(id=>ANIMAL.includes(id)))assert.equal(a.recipeDiet(r),'meat',r.name)}
assert.equal(a.isVeganRecipe({ingredients:[{id:'eggNoodle',qty:200},{id:'bokchoy',qty:200}]}),false);assert.equal(a.isVegetarianRecipe({ingredients:[{id:'eggNoodle',qty:200},{id:'bokchoy',qty:200}]}),true);
assert.equal(a.isVegetarianRecipe({ingredients:[{id:'miso',qty:20},{id:'tofu',qty:200}]}),false);assert.equal(a.recipeNeedsDietCheck({ingredients:[{id:'miso',qty:20}]}),true);assert.equal(a.isVegetarianRecipe({ingredients:[{id:'family-ing-x',qty:1}]}),false);
const vietMeatless=a.RECIPES.filter(r=>!r.catalogEdition&&a.isVegetarianRecipe(r)).length;/* v1.7.5: the owner halved the Vietnamese references, 140+ → 78 */assert.ok(vietMeatless>=75,'meatless Vietnamese dishes now carry diet labels: '+vietMeatless);
console.log(`PASS mixed-version sync guard (main rejects new state; newer-edition ids kept), tombstones across older copies/backups, 50-week Vietnamese-first menus (0 dressings, rice kept, <=2 treats/week), main-dish rice rule, scoring-only prices, ingredient-checked diet labels (${vegan} vegan, ${veg} vegetarian, ${check} need label check)`);
