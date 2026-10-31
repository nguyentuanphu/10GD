const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx=vm.createContext({foodArt:()=>'',appLanguage:'vi',normalizeText:s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase(),esc:s=>String(s).replace(/[&<>"']/g,'_')});
vm.runInContext(['seed','recipe-catalog','dish-composition','artwork'].map(f=>fs.readFileSync('dist/'+f+'.js','utf8')).join('\n')+`\nthis.data={ingredients:INGREDIENTS,recipes:RECIPES}`,ctx);
for(const id of Object.keys(ctx.data.ingredients))assert.match(ctx.ingredientArtwork(id),/ingredient-sheet/);
for(const r of ctx.data.recipes){const svg=ctx.foodArt(r);assert.doesNotMatch(svg,/NaN|undefined/);assert.match(svg,/role="img"/);if(ctx.dishArtworkCell(r)===null){assert.match(svg,/composed-dish/);for(const match of svg.matchAll(/data-food="([^"]+)"/g))assert.ok(r.ingredients.some(i=>i.id===match[1]),r.id+' adds '+match[1]);}}
const pasta=ctx.data.recipes.find(r=>r.name.includes('Bolognese'));assert.equal(ctx.dishCompositionModel(pasta).liquid,false);assert.match(ctx.foodArt(pasta),/data-food="pasta"/);assert.doesNotMatch(ctx.foodArt(pasta),/dish-sheet/);
assert.notEqual(ctx.ingredientArtwork('ribs'),ctx.ingredientArtwork('pork'));
assert.notEqual(ctx.ingredientArtwork('waterSpinach'),ctx.ingredientArtwork('bokchoy'));
const original=ctx.data.recipes.find(r=>r.id==='r2');assert.notEqual(ctx.dishArtworkCell(original),null);assert.equal(ctx.dishArtworkCell({...original,ingredients:[{id:'tofu',qty:100}]}),null);assert.equal(ctx.dishArtworkCell({...original,custom:true}),null);
assert.doesNotMatch(ctx.ingredientArtwork('family-unknown'),/ingredient-sheet/);
assert.doesNotMatch(ctx.foodArt({name:'<img src=x>',custom:true,ingredients:[]}),/<img/);
console.log('PASS artwork coverage, ingredient integrity, pasta form, changed/custom recipes and unknown ingredients');
