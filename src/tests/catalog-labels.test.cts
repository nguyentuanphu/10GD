// v1.7.19 (owner, 13 Nov 2026: “do everything in this round” — cháo labelled “Món sợi”): catalogue dish types match the dish.
// Cháo (rice porridge) is a main dish, súp a soup; neither is in the noodle group (“Món sợi”). Both still suit breakfast, the
// reference copies already stored in a family's data are repaired on load, and recipes the family wrote are never changed.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const c=vm.createContext({console,Intl,Date,Math:Object.create(Math),structuredClone,crypto:require('node:crypto').webcrypto});
vm.runInContext(['store-registry','seed','recipe-catalog','core','spending-core','purchase-units','planning-core','insights-core','family-menu-core'].map(f=>fs.readFileSync('dist/'+f+'.js','utf8')).join('\n')+'\nthis.api={RECIPES,EXPANDED_RECIPES,WESTERN_HEALTHY_RECIPES,PLANT_RECIPES,CATEGORY,defaults,validImport,upgradeReferenceCatalog,fallbackCandidates,recipeMeals,clone}',c);
const a=c.api,json=(x:any)=>JSON.parse(JSON.stringify(x));
const lists:any={RECIPES:a.RECIPES,EXPANDED_RECIPES:a.EXPANDED_RECIPES,WESTERN_HEALTHY_RECIPES:a.WESTERN_HEALTHY_RECIPES,PLANT_RECIPES:a.PLANT_RECIPES,'defaults().recipes':a.defaults().recipes};
let chao=0,sup=0;
for(const [where,list] of Object.entries(lists))for(const r of list as any[]){const name=String(r.name||'').trim();
 if(/^Cháo\b/u.test(name)){chao++;assert.notEqual(r.category,'noodle',`${where}: “${name}” (${r.id}) is rice porridge, not “Món sợi”`);assert.equal(r.category,'main',`${where}: “${name}” is a main dish`);assert.ok(a.recipeMeals(r).includes('breakfast'),`${where}: “${name}” still suits breakfast`)}
 if(/^Súp\b/u.test(name)){sup++;assert.notEqual(r.category,'noodle',`${where}: “${name}” (${r.id}) is a soup, not “Món sợi”`);assert.equal(r.category,'soup')}}
assert.ok(chao>=27,'every cháo in the catalogue was checked: '+chao);assert.ok(sup>=3,'every súp was checked: '+sup);
assert.equal(a.CATEGORY.noodle,'Món sợi');
// Stored data: a family whose state still holds the old reference copies (category noodle) gets them repaired on load; the cháo
// the family wrote itself stays exactly as written.
const s=json(a.defaults());
for(const r of s.recipes)if(/^(Cháo|Súp)\s/.test(r.name)&&/^(n\d+|family-v3-\d+)$/.test(r.id)){r.category='noodle';delete r.purposes;delete r.stapleIncluded}
s.recipes.push({id:'family-chao-1',name:'Cháo nhà làm',category:'noodle',protein:'chicken',time:30,servings:4,ingredients:[{id:'cookedRice',qty:500}],prep:'',steps:['Nấu.'],favorite:false,custom:true,origin:'family'});
const before=s.recipes.filter((r:any)=>/^Cháo\s/.test(r.name)&&r.category==='noodle').length;assert.ok(before>=4,'the old stored copies are in the noodle group: '+before);
a.upgradeReferenceCatalog(s,[]);
for(const r of s.recipes){if(r.id==='family-chao-1'){assert.equal(r.category,'noodle','the family’s own recipe is never rewritten');assert.equal(r.purposes,undefined);continue}
 if(/^Cháo\s/.test(r.name)){assert.equal(r.category,'main',r.name);assert.deepEqual(json(r.purposes),['breakfast','lunch','dinner']);assert.equal(r.stapleIncluded,true)}
 if(/^Súp\s/.test(r.name))assert.equal(r.category,'soup',r.name)}
assert.equal(a.validImport(json(s)),true,'the repaired state passes the app’s own validator (rule 33)');
const again=json(s);a.upgradeReferenceCatalog(again,[]);assert.deepEqual(json(again.recipes),json(s.recipes),'the repair runs once; loading again changes nothing');
// The menu still finds cháo for breakfast from the library when the family has no breakfast dish of its own.
const lib=json(a.defaults());lib.preferences.maxTime=60;const pool=a.fallbackCandidates(lib,'breakfast',null,'library').pool;
assert.ok(pool.some((r:any)=>/^Cháo\s/.test(r.name)),'breakfast from the library still offers cháo');
assert.ok(!a.fallbackCandidates(lib,'friday',null,'library').pool.some((r:any)=>/^Cháo\s/.test(r.name)&&r.category==='noodle'),'no cháo left in the noodle pool');
console.log(`PASS catalogue labels: ${chao} cháo are main dishes and ${sup} súp are soups (none in “Món sợi”), stored reference copies repaired once, family recipes untouched, validImport, breakfast still offers cháo`);
