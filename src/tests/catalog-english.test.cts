// v1.7.19 re-check (13 Nov 2026, Sydney time): every built-in catalogue dish has an English name, so the English app and the
// English week share never show a catalogue dish in Vietnamese. Before this check 86 dishes had none: the Western v4 set, the
// plant v5 set and the cooked-rice porridges (“Cháo … từ cơm chín”). Family-authored dishes are never translated (rule 26) and
// are not part of this check.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const c=vm.createContext({console,Intl,Date,Math,URL,structuredClone,crypto:require('node:crypto').webcrypto});
for(const f of ['seed.js','recipe-catalog.js','core.js','spending-core.js','purchase-units.js','planning-core.js','insights-core.js','family-menu-core.js','availability-core.js','personal-core.js'])vm.runInContext(fs.readFileSync('dist/'+f,'utf8'),c);
{const lang=fs.readFileSync('dist/language.js','utf8');vm.runInContext('var familyStorage={getItem(){return null},setItem(){}};'+lang.slice(0,lang.indexOf('function applyLanguage(')),c)}
const VI=/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ]/i;
const lists:Record<string,any[]>=vm.runInContext(`({seed:typeof RECIPES!=='undefined'?RECIPES:[],plant:PLANT_RECIPES,western:WESTERN_HEALTHY_RECIPES,expanded:EXPANDED_RECIPES,defaults:defaults().recipes})`,c);
let n=0;const missing:string[]=[];
for(const [set,list] of Object.entries(lists)){assert.ok(Array.isArray(list)&&list.length>0,`${set}: the catalogue list loads`);
 for(const r of list){c.__n=r.name;const en=vm.runInContext('translateRecipeViToEn(__n)',c);n++;if(!en||typeof en!=='string'||VI.test(en)||en.trim()===r.name.trim()&&VI.test(r.name))missing.push(`${set} ${r.id} “${r.name}” → ${JSON.stringify(en)}`)}}
assert.deepEqual(missing,[],`every built-in dish has an English name (${missing.length} missing):\n${missing.join('\n')}`);
// a few names read the way a cook would say them, not word for word
c.__n='Cháo gà bí đỏ từ cơm chín';assert.equal(vm.runInContext('translateRecipeViToEn(__n)',c),'Quick chicken & pumpkin rice porridge');
c.__n='Cháo gà từ cơm chín';assert.equal(vm.runInContext('translateRecipeViToEn(__n)',c),'Quick chicken rice porridge');
c.__n='Dressing tahini chanh tỏi';assert.equal(vm.runInContext('translateRecipeViToEn(__n)',c),'Lemon, garlic & tahini dressing');
console.log(`catalog english: ${n} built-in dishes checked, all have an English name`);
