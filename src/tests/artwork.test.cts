const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx=vm.createContext({foodArt:()=>'',appLanguage:'vi',normalizeText:s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase(),esc:s=>String(s).replace(/[&<>"']/g,'_')});
vm.runInContext(['seed','recipe-catalog','dish-composition','artwork'].map(f=>fs.readFileSync('dist/'+f+'.js','utf8')).join('\n')+`\nthis.data={ingredients:INGREDIENTS,recipes:RECIPES,all:[...RECIPES,...RETIRED_REFERENCE_RECIPES]}`,ctx);
for(const id of Object.keys(ctx.data.ingredients))assert.match(ctx.ingredientArtwork(id),/ingredient-sheet/);
for(const r of ctx.data.recipes){const svg=ctx.foodArt(r);assert.doesNotMatch(svg,/NaN|undefined/);assert.match(svg,/role="img"/);if(ctx.dishArtworkCell(r)===null){assert.match(svg,/composed-dish/);for(const match of svg.matchAll(/data-food="([^"]+)"/g))assert.ok(r.ingredients.some(i=>i.id===match[1]),r.id+' adds '+match[1]);}}
const pasta=ctx.data.recipes.find(r=>r.name.includes('Bolognese'));assert.equal(ctx.dishCompositionModel(pasta).liquid,false);assert.match(ctx.foodArt(pasta),/dish-sheet/);assert.notEqual(ctx.dishArtworkCell(pasta),ctx.dishArtworkCell(ctx.data.recipes.find(r=>r.id==='n2')));
assert.notEqual(ctx.ingredientArtwork('ribs'),ctx.ingredientArtwork('pork'));
assert.notEqual(ctx.ingredientArtwork('waterSpinach'),ctx.ingredientArtwork('bokchoy'));
const original=ctx.data.recipes.find(r=>r.id==='r2');assert.notEqual(ctx.dishArtworkCell(original),null);assert.equal(ctx.dishArtworkCell({...original,ingredients:[{id:'tofu',qty:100}]}),null);assert.equal(ctx.dishArtworkCell({...original,custom:true}),null);
assert.doesNotMatch(ctx.ingredientArtwork('family-unknown'),/ingredient-sheet/);
assert.doesNotMatch(ctx.foodArt({name:'<img src=x>',custom:true,ingredients:[]}),/<img/);
console.log('PASS artwork coverage, ingredient integrity, pasta form, changed/custom recipes and unknown ingredients');

const cells=ctx.data.recipes.map(r=>ctx.dishArtworkCell(r));/* v1.7.10: 125 recognised recipes */assert.equal(cells.filter(n=>n!==null).length,125);assert.equal(new Set(cells).size,125);for(const cell of cells)assert.ok(fs.existsSync('dist/artwork/dishes-v'+(Math.floor(cell/16)+1)+'.webp'));
assert.equal(ctx.dishArtworkCell({...original,prep:'Different cooking method'}),null);assert.equal(ctx.ingredientArtwork('Rau muống'),ctx.ingredientArtwork('waterSpinach'));

assert.equal(new Set(Object.keys(ctx.data.ingredients).map(id=>ctx.resolveIngredientArtCell(id))).size,106);for(const r of ctx.data.recipes)assert.ok(fs.existsSync("dist/"+ctx.dishArtPath(r)),r.id+" missing final artwork");

assert.notEqual(ctx.dishArtworkCell({...original,ingredients:original.ingredients.map(i=>({qty:i.qty,id:i.id})).reverse()}),null,"equivalent backup ingredient ordering keeps the same painting");

// Artwork correction rollout: update untouched samples (including menu copies), preserve all family edits.
{
 const legacy=JSON.parse(fs.readFileSync('docs/reviews/artwork-audit-20261102/source.json','utf8'));
 // v1.7.5: the owner halved the library; every current id is an original catalogue identity and the rest are exactly the retired ids
 {const now=new Set(ctx.data.recipes.map(r=>r.id)),retired=vm.runInContext('[...RETIRED_REFERENCE_IDS]',ctx);assert.ok([...now].every(id=>legacy.recipes.some(r=>r.id===id)),'artwork fixes preserve every catalog identity');assert.deepEqual(legacy.recipes.map(r=>r.id).filter(id=>!now.has(id)).sort(),[...retired].sort(),'only retired recipes left the catalogue')}
 const ids=['family-v3-1','family-v3-2','family-v3-3','family-v3-4','family-v3-7'];
 const copy=id=>JSON.parse(JSON.stringify(legacy.recipes.find(r=>r.id===id)));
 const state={recipes:ids.map(copy),weeks:{'2026-11-02':{days:{'2026-11-02':{lunch:{recipes:[copy('family-v3-2')]},dinner:{recipes:[copy('family-v3-4')]}}}}},deletedRecipeIds:['r1']};
 state.recipes[0].favorite=true;
 const beforeQty=state.recipes.map(r=>r.ingredients.map(i=>i.qty));
 assert.equal(ctx.repairArtworkReferenceState(state),7);
 assert.equal(ctx.repairArtworkReferenceState(state),0,'repair is idempotent');
 assert.equal(state.recipes[0].favorite,true,'family favourite metadata survives');
 assert.equal(JSON.stringify(state.recipes.map(r=>r.ingredients.map(i=>i.qty))),JSON.stringify(beforeQty),'no quantity is invented');
 assert.equal(state.deletedRecipeIds.join(','),'r1');
 for(const r of state.recipes){const reference=ctx.data.all.find(x=>x.id===r.id);assert.equal(ctx.dishArtSignature(r),ctx.dishArtSignature(reference),'repaired sample matches reference '+r.id);assert.notEqual(ctx.dishArtworkCell(r),null);}
 assert.equal(state.weeks['2026-11-02'].days['2026-11-02'].lunch.recipes[0].ingredients[0].id,'spaghetti');
 for(const field of ['name','prep','steps','ingredients','custom','protein','category','origin','stapleIncluded']){
  const r=copy('family-v3-2');
  if(field==='ingredients')r.ingredients[0].qty++;
  else if(field==='steps')r.steps[0]+=' Gia đình sửa.';
  else if(field==='custom')r.custom=true;
  else if(field==='origin')r.origin='family';
  else if(field==='stapleIncluded')r.stapleIncluded=false;
  else r[field]+=' gia đình';
  const before=JSON.stringify(r);assert.equal(ctx.repairArtworkReferenceRecipe(r),false,field+' edit is preserved');assert.equal(JSON.stringify(r),before);
 }
 for(const id of ids.slice(0,3)){const r=ctx.data.all.find(x=>x.id===id);assert.ok(r.ingredients.some(i=>i.id==='spaghetti'));assert.ok(!r.ingredients.some(i=>i.id==='pasta'));assert.equal(r.category,'main');assert.equal(r.stapleIncluded,true);}
 assert.doesNotMatch(ctx.data.all.find(r=>r.id==='family-v3-4').name,/bơ/);
 assert.doesNotMatch(ctx.data.all.find(r=>r.id==='family-v3-7').name,/kem/);
 assert.doesNotMatch(ctx.data.all.find(r=>r.id==='family-v3-2').steps.join(' '),/kem/);
 const changed=JSON.parse(fs.readFileSync('docs/reviews/artwork-fixes-20261102/replaced-ids.json','utf8'));
 for(const id of changed){const r=ctx.data.all.find(x=>x.id===id);/* v1.7.5: retired ids keep their corrected art for families that kept them */assert.equal(ctx.dishArtPath(r),'artwork/corrections/'+id+'.webp');assert.equal(ctx.dishArtCellPath(r),'artwork/cells/'+id+'.webp');assert.ok(fs.existsSync('dist/'+ctx.dishArtCellPath(r)));assert.match(ctx.foodArt(r),/--art-full-size:contain/,'detail uses entire standalone painting');assert.equal(ctx.dishArtworkCell({...r,prep:r.prep+' family edit'}),null);}
 console.log('PASS corrected artwork routing, exact-reference migration, menus, idempotence, family edits and unchanged quantities');
}

{const r=ctx.data.recipes.find(r=>r.id==='family-v3-1'),edited={...r,custom:true};assert.equal(ctx.dishCompositionModel(edited).liquid,false);assert.match(ctx.foodArt(edited),/data-food="spaghetti"/);assert.doesNotMatch(ctx.foodArt(edited),/data-food="pasta"/);}
