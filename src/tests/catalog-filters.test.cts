// Recipe library filter predicates (chips): expected counts are derived from the catalogue data itself, not hard-coded
// guesses, and the chip index must agree with the planner's cuisine index and the ingredient-computed diet labels.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const c=vm.createContext({console,Intl,Date,Math:Object.create(Math),structuredClone,crypto:require('node:crypto').webcrypto});
vm.runInContext(['seed','recipe-catalog','core','spending-core','purchase-units','planning-core','insights-core','family-menu-core'].map(f=>fs.readFileSync('dist/'+f+'.js','utf8')).join('\n')+'\nthis.api={RECIPES,RETIRED_REFERENCE_RECIPES,PLANT_RECIPES,WESTERN_HEALTHY_RECIPES,defaults,recipeDiet,recipeCuisine,ownRecipe,isVegetarianRecipe,isVeganRecipe,recipeNeedsDietCheck,recipeMatchesLibraryTag,recipeMatchesLibraryFilters,libraryRecipeMeta,LIBRARY_FILTER_TAGS}',c);
const a=c.api,recipes=a.defaults().recipes,by=tag=>recipes.filter(r=>a.recipeMatchesLibraryTag(r,tag)),names=list=>new Set(list.map(r=>r.name));
assert.equal(recipes.length,125,'fresh device holds the 125 recognised recipes (v1.7.10: template-built / invented ones retired)');
assert.deepEqual([...a.LIBRARY_FILTER_TAGS],['western','healthy','vegetarian','vegan','dressing'],'v1.7.10: no Salad hạt chip — those mixes were retired');

// Salad hạt and Dressing: exactly the catalogue's seed salads and dressings.
const seedSalads=a.PLANT_RECIPES.filter(r=>r.recipeKind==='seed-salad'),dressings=a.PLANT_RECIPES.filter(r=>r.recipeKind==='dressing');
assert.equal(seedSalads.length,0);assert.equal(dressings.length,7);
assert.deepEqual(by('seed-salad').map(r=>r.id).sort(),seedSalads.map(r=>r.id).sort());
assert.deepEqual(by('dressing').map(r=>r.id).sort(),dressings.map(r=>r.id).sort());

// Vegetarian ⊇ Thuần chay, strictly larger: adds egg/dairy dishes and the "Chay? Xem nhãn" (check the label) ones.
const vegetarian=by('vegetarian'),vegan=by('vegan'),vegIds=new Set(vegetarian.map(r=>r.id));
assert.ok(vegan.every(r=>vegIds.has(r.id)),'every vegan recipe is vegetarian');
assert.ok(vegetarian.length>vegan.length,`vegetarian ${vegetarian.length} > vegan ${vegan.length}`);
const dietCount=d=>recipes.filter(r=>a.recipeDiet(r)===d).length;
assert.equal(vegan.length,dietCount('vegan'));
assert.equal(vegetarian.length,dietCount('vegan')+dietCount('vegetarian')+dietCount('check'));
assert.ok(dietCount('vegetarian')>0&&dietCount('check')>0);
assert.ok(vegetarian.some(r=>r.ingredients.some(i=>i.id==='egg'))&&!vegan.some(r=>r.ingredients.some(i=>['egg','milk','yogurt','cream','butter','eggNoodle'].includes(i.id))),'egg/dairy dishes are vegetarian, never vegan');
assert.ok(vegetarian.some(r=>a.recipeNeedsDietCheck(r))&&!vegan.some(r=>a.recipeNeedsDietCheck(r)),'label-check dishes are vegetarian, never vegan');
assert.ok(!vegetarian.some(r=>r.ingredients.some(i=>['pork','chicken','beef','fish','shrimp','fishSauce','broth','salmon','tuna'].includes(i.id))),'no meat, fish or fish sauce in Vegetarian');

// Món Âu & Ý: the same index the planner uses (recipeCuisine), covering every Italian/Western collection dish.
const western=by('western');
assert.deepEqual(western.map(r=>r.id).sort(),recipes.filter(r=>a.recipeCuisine(r)==='western').map(r=>r.id).sort());
for(const r of a.WESTERN_HEALTHY_RECIPES.filter(r=>['Ý','Âu'].includes(r.collection)))assert.ok(names(western).has(r.name),'western chip includes '+r.name);
assert.ok(recipes.filter(r=>/Spaghetti|Penne|Mì Ý/.test(r.name)).every(r=>names(western).has(r.name)),'every spaghetti/penne/Mì Ý dish is under Âu & Ý');
assert.ok(western.length>=45);

// Healthy: the Healthy collection, healthy-tagged dishes and the seed salads; not ordinary Vietnamese stir-fries.
const healthy=by('healthy');
for(const r of a.WESTERN_HEALTHY_RECIPES.filter(r=>r.collection==='Healthy'))assert.ok(names(healthy).has(r.name),'healthy chip includes '+r.name);
assert.ok(seedSalads.every(r=>names(healthy).has(r.name)),'seed salads are healthy');
assert.ok(!healthy.some(r=>r.recipeKind==='dressing'),'dressings are not dishes');
for(const n of ['Rau muống xào tỏi','Bắp cải xào cà rốt','Đậu que xào tỏi'])assert.ok(!names(healthy).has(n),'regression: plain stir-fry is not tagged Healthy: '+n);
assert.ok(healthy.length<vegetarian.length&&healthy.length>=20);

// Category chips: Món nước / súp = noodle soups, porridge and soups served as a one-bowl meal.
const noodle=recipes.filter(r=>a.recipeMatchesLibraryFilters(r,{category:'noodle'}));
assert.equal(noodle.length,recipes.filter(r=>r.category==='noodle').length);
assert.ok(noodle.every(r=>/^(Phở|Bún|Hủ tiếu|Mì|Miến|Udon|Nui|Cháo|Súp|Bánh canh)/.test(r.name)),'Món nước holds noodle/porridge/soup bowls');
assert.ok(noodle.some(r=>/^Phở/.test(r.name))&&noodle.some(r=>/^Bún/.test(r.name)));
// Filters combine: category ∧ tag ∧ time.
const noodleVegan=recipes.filter(r=>a.recipeMatchesLibraryFilters(r,{category:'noodle',tag:'vegan'})),quickVeg=recipes.filter(r=>a.recipeMatchesLibraryFilters(r,{tag:'vegetarian',maxTime:'20'}));
assert.ok(noodleVegan.length>0&&noodleVegan.every(r=>r.category==='noodle'&&a.isVeganRecipe(r)));
assert.ok(quickVeg.length>0&&quickVeg.every(r=>r.time<=20)&&quickVeg.length<vegetarian.length);
assert.equal(recipes.filter(r=>a.recipeMatchesLibraryFilters(r,{})).length,125,'no filter keeps everything');

// A reference copy saved by an older edition without catalogue metadata still lands in the right chips; the stored
// copy is not mutated, and family-authored recipes are never re-labelled from the catalogue.
const stale=r=>{const x=JSON.parse(JSON.stringify(r));delete x.tags;delete x.recipeKind;delete x.collection;delete x.diet;return x};
/* v1.7.10: seed salads are retired; a family may still hold one */const oldSalad=stale(a.RETIRED_REFERENCE_RECIPES.find(r=>r.recipeKind==='seed-salad')),oldDressing=stale(dressings[0]),oldPasta=stale(a.WESTERN_HEALTHY_RECIPES.find(r=>r.collection==='Ý'&&/Spaghetti/.test(r.name))),oldHealthy=stale(a.WESTERN_HEALTHY_RECIPES.find(r=>r.collection==='Healthy'));
/* v1.7.10: no Salad hạt chip any more */assert.ok(a.recipeMatchesLibraryTag(oldDressing,'dressing')&&a.recipeMatchesLibraryTag(oldPasta,'western')&&a.recipeMatchesLibraryTag(oldHealthy,'healthy'));
assert.equal(oldSalad.recipeKind,undefined,'stored copy untouched');
const family={...stale(dressings[0]),custom:true,origin:'family'};
assert.equal(a.recipeMatchesLibraryTag(family,'dressing'),false,'family recipe keeps its own (missing) kind');
assert.equal(a.libraryRecipeMeta(family),family);
// Family recipes with ingredients get diet chips from their ingredients.
const tofu={id:'f1',name:'Đậu hũ chiên sả nhà mình',category:'main',protein:'plant',time:20,ingredients:[{id:'tofu',qty:300},{id:'lemongrass',qty:20}],custom:true,origin:'family'},omelette={...tofu,id:'f2',name:'Trứng chiên hành',ingredients:[{id:'egg',qty:4},{id:'scallion',qty:20}]};
assert.ok(a.recipeMatchesLibraryTag(tofu,'vegan')&&a.recipeMatchesLibraryTag(tofu,'vegetarian'));
assert.ok(!a.recipeMatchesLibraryTag(omelette,'vegan')&&a.recipeMatchesLibraryTag(omelette,'vegetarian'));
console.log(`PASS library filters: Âu/Ý ${western.length}, Healthy ${healthy.length}, Vegetarian ${vegetarian.length} ⊋ Thuần chay ${vegan.length}, Salad hạt ${seedSalads.length}, Dressing ${dressings.length}, Món nước ${noodle.length}; stale reference copies resolved by id`);
