// v1.5 unit registry: completeness, synonym lookup, icons, backward compatibility with stored
// unit strings and the released main client, and Price Scout normalisation.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const {MAIN_INGREDIENTS,MAIN_VALID_IMPORT}=require('./fixtures/main-0bcef70-client.cjs');
const {MAIN_UNIT_CODE}=require('./fixtures/main-0bcef70-units.cjs');
const files=['seed','recipe-catalog','core','spending-core','unit-registry','purchase-units','planning-core'];
const ctx=vm.createContext({console,Intl,Date,Math:Object.create(Math),structuredClone,crypto:require('node:crypto').webcrypto});
vm.runInContext(files.map(f=>fs.readFileSync('dist/'+f+'.js','utf8')).join('\n')+'\n;this.api={UNIT_REGISTRY,UNIT_ICON_PATHS,UNIT_AMBIGUOUS,UNIT_CATEGORIES,findUnit,sameUnit,canonicalUnitLabel,unitLabel,unitAmountLabel,unitIconSvg,unitSynonymIndex,unitMatchAtStart,unitScoutQuantity,unitPriceBasisFor,unitChoicesFor,unitIsMeasured,unitNorm,BUYING_UNITS,validPurchaseUnitRecord,validUnitState,validImport,defaults,ensureWeek,monday,sydneyDate,addDays,shopping,setBuyingUnits,purchaseScope,INGREDIENTS};',ctx);
const a=ctx.api,json=x=>JSON.parse(JSON.stringify(x));
let n=0;const ok=(cond,msg)=>{assert.ok(cond,msg);n++};

// 1. Completeness: every unit has vi/en/icon/category, unique ids and stored labels.
const required=['g','kg','lạng','ml','l','cái','miếng','lát','quả','con','bó','nắm','cây','củ','tép','nhánh','bắp','cuộn','gói','túi','hộp','khay','vỉ','chục','tá','chai','lọ','hũ','lon','thùng','két','bao','can','bình','ống','tuýp','viên','tờ','lần giặt','lốc'];
for(const vi of required)ok(a.UNIT_REGISTRY.some(u=>u.vi===vi),'registry includes '+vi);
const cats=new Set(a.UNIT_CATEGORIES.map(c=>c[0]));
for(const u of a.UNIT_REGISTRY){
 ok(u.id&&u.vi&&u.viLabel&&u.en&&u.enPlural,'labels for '+u.id);ok(cats.has(u.category),'category for '+u.id);
 ok(typeof a.UNIT_ICON_PATHS[u.icon]==='string'&&a.UNIT_ICON_PATHS[u.icon].length>20,'icon for '+u.id);
 ok(u.vi.length<=40&&a.validPurchaseUnitRecord({unit:u.vi,amount:1,basePerUnit:null,pricePerUnit:null}),'stored label valid for '+u.id);
 ok([null,'mass','volume','count'].includes(u.dim),'dimension for '+u.id);
 if(u.category==='container')ok(u.dim===null&&u.factor===null&&!u.fixed,'container '+u.id+' never converts to g/ml on its own');
}
assert.equal(new Set(a.UNIT_REGISTRY.map(u=>u.id)).size,a.UNIT_REGISTRY.length,'unique ids');
assert.equal(new Set(a.UNIT_REGISTRY.map(u=>u.vi)).size,a.UNIT_REGISTRY.length,'unique stored labels');
assert.equal(new Set(a.UNIT_REGISTRY.map(u=>u.icon)).size,a.UNIT_REGISTRY.length,'every unit has a distinct icon');
ok(a.findUnit('nắm').approx,'handful is flagged approximate');
// Icons: 24×24, currentColor + accent token, decorative, no text or brand marks.
for(const [k,svg] of Object.entries(a.UNIT_ICON_PATHS)){ok(!/<text|<image|href=/.test(svg),'icon '+k+' has no text or external image')}
const svg=a.unitIconSvg('chai');ok(/viewBox="0 0 24 24"/.test(svg)&&/stroke="currentColor"/.test(svg)&&/aria-hidden="true"/.test(svg)&&/focusable="false"/.test(svg)&&/var\(--unit-accent/.test(svg),'icon markup is decorative, currentColor + accent');
ok(/data-unit-icon="custom"/.test(a.unitIconSvg('nửa con')),'custom units get the generic icon');

// 2. Synonyms: no ambiguous collisions except the documented one.
for(const [key,ids] of a.unitSynonymIndex())if(ids.size>1)assert.deepEqual([...ids].sort(),[...(a.UNIT_AMBIGUOUS[key]||[])].sort(),'ambiguous synonym '+key);
assert.equal(a.findUnit('can').id,'jerrycan','stored VI "can" stays the jerrycan');
const cases={'Chai':'bottle','chai':'bottle','bottle':'bottle','bottles':'bottle','lọ':'jar','lo':'jar','LỌ':'jar','jar':'jar','jars':'jar','hũ':'tub','hu':'tub','hủ':'tub','tub':'tub','lon':'tin','tin':'tin','cans':'tin','trái':'fruit','quả':'fruit','qua':'fruit','each':'fruit','kí':'kg','kilo':'kg','lít':'l','litre':'l','L':'l','lạng':'lang','lang':'lang','bó':'bunch','bo':'bunch','mớ':'bunch','bunches':'bunch','tép':'clove','cloves':'clove','vỉ':'card','blister':'card','két':'crate','crate':'crate','thùng':'case','case':'case','bao':'sack','sack':'sack','viên':'tablet','tabs':'tablet','lần giặt':'wash','lan giat':'wash','loads':'wash','cuộn':'roll','cuốn':'roll','rolls':'roll','tờ':'sheet','tá':'dozen','dozen':'dozen','chục':'ten','lốc':'multipack','tuýp':'tube','tube':'tube','ống':'canister','bình':'jug','khay':'tray','gói':'pack','packet':'pack','túi':'bag','bịch':'bag','hộp':'box','carton':'box','cái':'piece','pcs':'piece','miếng':'cut','lát':'slice','con':'whole','nắm':'handful','cây':'stalk','củ':'bulb','nhánh':'sprig','knob':'sprig','bắp':'head','cob':'head'};
for(const [text,id] of Object.entries(cases))assert.equal(a.findUnit(text)?.id,id,'findUnit('+text+')');
ok(a.findUnit('nửa con')===null&&a.findUnit('đùi')===null&&a.findUnit('')===null,'custom names are not forced onto registry units');
ok(a.sameUnit('Chai','chai')&&a.sameUnit('jar','lọ')&&!a.sameUnit('lọ','lon')&&a.sameUnit('đùi','đùi'),'sameUnit');
assert.equal(a.canonicalUnitLabel(' Bottles '),'chai');assert.equal(a.canonicalUnitLabel('nửa con'),'nửa con');
assert.equal(a.unitLabel('lọ',{lang:'en'}),'jar');assert.equal(a.unitLabel('lọ',{lang:'en',plural:true}),'jars');assert.equal(a.unitLabel('jar',{lang:'vi'}),'lọ');
assert.equal(a.unitAmountLabel(2,'chai','en'),'2 bottles');assert.equal(a.unitAmountLabel(1,'chai','en'),'1 bottle');
const m=a.unitMatchAtStart('2 chai nước mắm'.slice(2));assert.equal(m.unit.id,'bottle');assert.equal(m.rest,'nước mắm');
assert.equal(a.unitMatchAtStart('lần giặt bột').unit.id,'wash','multi-word units match before shorter ones');

// 3. Picker choices: measured units follow the recipe unit; definitional conversions only.
const gChoices=a.unitChoicesFor('g').map(u=>u.vi),mlChoices=a.unitChoicesFor('ml').map(u=>u.vi),eggChoices=a.unitChoicesFor('quả').map(u=>u.vi);
ok(gChoices.includes('kg')&&gChoices.includes('lạng')&&!gChoices.includes('ml')&&gChoices.includes('chai'),'gram ingredients: g/kg/lạng + packs');
ok(mlChoices.includes('l')&&!mlChoices.includes('kg')&&!mlChoices.includes('lạng'),'ml ingredients: ml/l');
ok(eggChoices.includes('tá')&&eggChoices.includes('vỉ')&&!eggChoices.includes('g'),'egg choices include dozen and cards');
ok(a.unitIsMeasured('kg','g')&&a.unitIsMeasured('l','ml')&&a.unitIsMeasured('quả','quả')&&!a.unitIsMeasured('lạng','g')&&!a.unitIsMeasured('chai','ml'),'measured vs pack units');
assert.equal(a.findUnit('lạng').fixed.g,100);assert.equal(a.findUnit('tá').fixed['quả'],12);assert.equal(a.findUnit('chục').fixed['quả'],10);

// 4. Backward compatibility: old stored strings keep working, shape unchanged.
const buying=[...a.BUYING_UNITS];
assert.deepEqual(buying.slice(0,10),['cái','miếng','bó','gói','hộp','khay','túi','chai','con','quả'],'original buying units keep their order');
for(const u of ['lọ','hũ','lon','két','bao','viên','lần giặt','tá'])ok(buying.includes(u),'BUYING_UNITS offers '+u);
ok(!buying.includes('g')&&!buying.includes('lạng'),'measured units are not pack units');
const s=a.defaults(),start=a.monday(a.sydneyDate()),end=a.addDays(start,6),w=a.ensureWeek(s,start);
const rows=a.shopping(s,w,start,end).filter(r=>r.qty>0&&a.INGREDIENTS[r.id][1]==='g');assert.ok(rows.length>=3,'sample plan has gram ingredients');
a.setBuyingUnits(w,start,end,rows[0].id,{unit:'lọ',amount:2,basePerUnit:null,pricePerUnit:null,note:''});
a.setBuyingUnits(w,start,end,rows[1].id,{unit:'lạng',amount:3,basePerUnit:100,pricePerUnit:null,note:''});
a.setBuyingUnits(w,start,end,rows[2].id,{unit:'Chai',amount:1,basePerUnit:null,pricePerUnit:null,note:'legacy custom spelling'});
const after=a.shopping(s,w,start,end);
const jarRow=after.find(r=>r.id===rows[0].id),langRow=after.find(r=>r.id===rows[1].id);
ok(jarRow.qty===null&&!jarRow.quantityKnown,'a jar never invents grams');ok(langRow.qty===300&&langRow.quantityKnown,'3 lạng = 300 g via the stored conversion');
s.purchaseUnitPreferences={[rows[0].id]:{unit:'lần giặt',amount:1,basePerUnit:null,pricePerUnit:null},[rows[1].id]:{unit:'nửa con',amount:1,basePerUnit:null,pricePerUnit:null}};
s.pantry.push({id:'qa-lot',ingredient:rows[0].id,qty:0,place:'dry',expiry:'',purchase:{unit:'hũ',amount:1,basePerUnit:null,pricePerUnit:null}});
ok(a.validUnitState(json(s))&&a.validImport(json(s)),'new client accepts old and new unit strings');
// Released main client (0bcef70): its validators read state written with new units.
const old=vm.createContext({INGREDIENTS:structuredClone(MAIN_INGREDIENTS)});vm.runInContext(MAIN_UNIT_CODE+'\n'+MAIN_VALID_IMPORT+'\nthis.validImport=validImport;this.validUnitState=validUnitState;this.purchaseUnitOptions=purchaseUnitOptions;',old);
const legacy=json(s);legacy.seedVersion=3;delete legacy.appEdition;legacy.recipes=legacy.recipes.filter(r=>!r.catalogEdition||r.catalogEdition<4);
for(const k of Object.keys(legacy.purchaseUnitPreferences))if(!MAIN_INGREDIENTS[k])delete legacy.purchaseUnitPreferences[k];
const ids=[rows[0].id,rows[1].id,rows[2].id].filter(id=>MAIN_INGREDIENTS[id]);ok(ids.length>=2,'test rows exist in the released ingredient table');
ok(old.validUnitState(legacy),'main validUnitState accepts lọ / lạng / lần giặt / hũ / custom unit strings');
ok(old.validImport(json(legacy)),'main validImport accepts a state written with new units');
ok(old.purchaseUnitOptions(legacy,ids[0]).includes('lần giặt')||!MAIN_INGREDIENTS[rows[0].id],'main client still lists the remembered new unit as a plain option');

// 5. Price Scout normalisation: containers convert only with a written pack size.
const q=t=>{const r=a.unitScoutQuantity(t);return [r.qty,r.unit]};
assert.deepEqual(q('2 chai 500 ml'),[1000,'ml']);assert.deepEqual(q('1 lọ 250g'),[250,'g']);
assert.deepEqual(q('2 chai'),[2,'pack'],'a bottle without a size stays a pack');assert.deepEqual(q('1 hũ'),[1,'pack']);
assert.deepEqual(q('60 viên'),[60,'wash']);assert.deepEqual(q('40 lần giặt'),[40,'wash']);assert.deepEqual(q('2 cuộn'),[2,'roll']);assert.deepEqual(q('10 tờ'),[10,'sheet']);
assert.deepEqual(q('2 lạng'),[200,'g']);assert.deepEqual(q('1 tá'),[12,'each']);assert.deepEqual(q('1.5 kg'),[1500,'g']);assert.deepEqual(q('2 L'),[2000,'ml']);assert.deepEqual(q('3 trái'),[3,'each']);
assert.deepEqual(q(''),[1,'pack']);assert.deepEqual(q('ít thôi'),[1,'pack']);
assert.equal(a.unitPriceBasisFor('chai',500,'ml'),'per_100mL');assert.equal(a.unitPriceBasisFor('bao',5,'kg'),'per_kg');assert.equal(a.unitPriceBasisFor('chai'),null,'no pack size → no unit-price basis');
assert.equal(a.unitPriceBasisFor('viên'),'per_wash');assert.equal(a.unitPriceBasisFor('lần giặt'),'per_wash');assert.equal(a.unitPriceBasisFor('cuộn'),'per_roll');
const ps=vm.createContext({console,Intl,Date,Math,URL});vm.runInContext(fs.readFileSync('dist/shopping-optimizer.js','utf8')+'\n;this.P=typeof PriceScout!=="undefined"?PriceScout:globalThis.PriceScout',ps);
assert.equal(typeof ps.P?.basisMultiplier,'function','Price Scout loaded');{const finish={commonPacks:[{packQty:60,packUnit:'wash',units:60}]};assert.equal(ps.P.basisMultiplier(...q('3 viên'),'per_wash',finish),3,'tablets feed per_wash');assert.equal(ps.P.basisMultiplier(...q('2 cuộn'),'per_roll',{}),2,'rolls feed per_roll');assert.equal(ps.P.basisMultiplier(...q('2 chai 500 ml'),'per_L',{}),1,'2×500 mL bottles = 1 L');n+=3}
console.log(`Unit registry: ${a.UNIT_REGISTRY.length} units, ${n}+ checks passed.`);
