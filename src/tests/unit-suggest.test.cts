// v1.7.18 buying units (owner, 12 Nov 2026: “Gợi ý + Xem tất cả”, custom units with an optional conversion): the
// suggestion list per ingredient kind, weight units for counted ingredients without an invented conversion, the family's
// own units (state.customUnits) and their validation, and compatibility with older states and the released client.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const {MAIN_INGREDIENTS,MAIN_VALID_IMPORT}=require('./fixtures/main-0bcef70-client.cjs');
const {MAIN_UNIT_CODE}=require('./fixtures/main-0bcef70-units.cjs');
const files=['seed','recipe-catalog','core','spending-core','unit-registry','purchase-units','planning-core','family-menu-core'];
const ctx=vm.createContext({console,Intl,Date,Math:Object.create(Math),structuredClone,crypto:require('node:crypto').webcrypto});
vm.runInContext(files.map(f=>fs.readFileSync('dist/'+f+'.js','utf8')).join('\n')+'\n;this.a={suggestedBuyingUnits,unitKindFor,unitAllowedFor,validCustomUnit,validCustomUnits,validUnitState,validImport,addCustomUnit,setCustomUnitHidden,customUnitByName,customUnitFactor,familyCustomUnits,buyingUnitFactor,setBuyingUnits,applyBuyingUnits,shopping,purchaseScope,defaults,ensureWeek,monday,sydneyDate,hydrateFamilyIngredients,findUnit,INGREDIENTS};',ctx);
const a=ctx.a,json=x=>JSON.parse(JSON.stringify(x));let n=0;const ok=(c,m)=>{assert.ok(c,m);n++};
const fresh=()=>{const s=a.defaults();s.ingredientCatalog={'family-ing-ga-ta':{name:'Gà ta',unit:'con',group:'meat'},'family-ing-ca-loc':{name:'Cá lóc',unit:'con',group:'meat'},'family-ing-coca':{name:'Coca cola',unit:'chai',group:'dry'},'family-ing-trung-vit':{name:'Trứng vịt',unit:'quả',group:'dry'}};assert.ok(a.hydrateFamilyIngredients(s));return s};
const s=fresh(),sug=(id,o={})=>a.suggestedBuyingUnits(s,id,o);

// 1. Kinds and suggestions: 6–8 units, the recipe unit always offered, units that suit the kind.
const kinds={pork:'meat','family-ing-ga-ta':'meat',spinach:'veg',egg:'egg','family-ing-trung-vit':'egg',fishSauce:'sauce',milk:'dairy',rice:'dry',lime:'fruit','family-ing-coca':'drink'};
for(const [id,k] of Object.entries(kinds))assert.equal(a.unitKindFor(id),k,'kind of '+id);
for(const id of Object.keys(kinds)){const l=sug(id,{current:a.INGREDIENTS[id][1]});ok(l.length>=6&&l.length<=8,id+': 6–8 suggestions ('+l+')');ok(l.includes(a.INGREDIENTS[id][1]),id+': recipe unit offered');ok(new Set(l).size===l.length,id+': no duplicates')}
const want={pork:['kg','g','miếng','khay'],'family-ing-ga-ta':['con','kg','g','miếng','khay'],spinach:['bó','kg','củ','cây'],egg:['quả','vỉ','chục'],'family-ing-coca':['chai','lon','lốc','thùng'],rice:['gói','kg','túi'],fishSauce:['chai','lọ','ml']};
for(const [id,units] of Object.entries(want)){const l=sug(id,{current:a.INGREDIENTS[id][1]});for(const u of units)ok(l.includes(u),`${id} suggests ${u}: ${l}`)}
// 2. Counted ingredients sold by weight get kg / g; the conversion stays unknown (never guessed).
for(const id of ['family-ing-ga-ta','family-ing-ca-loc']){const l=sug(id);ok(l.includes('kg')&&l.includes('g'),id+' (counted in con) can be bought in kg / g');ok(a.unitAllowedFor(id,'kg')&&a.unitAllowedFor(id,'lạng'),'weight units allowed for '+id)}
ok(!a.unitAllowedFor('egg','kg'),'eggs are not offered by the kilo');ok(!a.unitAllowedFor('fishSauce','kg'),'no weight for a sauce measured in ml (no density invented)');ok(!a.unitAllowedFor('pork','ml'),'no volume for meat in g');
ok(a.unitAllowedFor('family-ing-coca','l'),'a bottled drink can be bought by the litre');ok(!sug('egg').includes('kg'),'egg suggestions have no kg');
assert.equal(a.buyingUnitFactor('family-ing-ga-ta',{unit:'kg',basePerUnit:null}),null,'1.6 kg of a chicken counted in con has no invented conversion');
{const w=a.ensureWeek(s,a.monday(a.sydneyDate())),start=a.monday(a.sydneyDate()),end=start;a.setBuyingUnits(w,start,end,'family-ing-ga-ta',{unit:'kg',amount:1.6,basePerUnit:null,pricePerUnit:null,note:''});
 const row=a.applyBuyingUnits(s,w,start,end,{id:'family-ing-ga-ta',qty:1,suggested:1,missing:1});ok(row.purchase.unit==='kg'&&row.purchase.amount===1.6,'purchase kept in kg as written');ok(row.qty===null&&row.quantityKnown===false,'quantity in con stays unknown');
 a.setBuyingUnits(w,start,end,'family-ing-ga-ta',{unit:'kg',amount:1.6,basePerUnit:0.625,pricePerUnit:null,note:''});const r2=a.applyBuyingUnits(s,w,start,end,{id:'family-ing-ga-ta',qty:1,suggested:1,missing:1});ok(r2.qty===1,'with the family’s “1 con ≈ 1.6 kg” it counts as 1 con');
 delete w.buyingUnits}
// 3. Preference and history come first, in that order.
s.purchaseUnitPreferences={pork:{unit:'khay',amount:2,basePerUnit:null,pricePerUnit:null,note:''}};
{const l=sug('pork',{current:'g'});assert.equal(l[0],'g','current unit first');assert.equal(l[1],'khay','remembered unit second')}
{const w=a.ensureWeek(s,'2026-11-02');w.buyingUnits={'2026-11-02/2026-11-08':{pork:{unit:'túi',amount:1,basePerUnit:null,pricePerUnit:null,note:''}}};const l=sug('pork',{current:'g'});ok(l.indexOf('túi')===2,'unit bought before comes right after the remembered one: '+l);delete w.buyingUnits}
ok(sug('pork',{recent:['lon']}).includes('lon')||sug('pork',{recent:['lon']}).length===8,'device recent units fill the remaining places');
delete s.purchaseUnitPreferences;

// 4. Family units: saved once, suggested next time, hidden on request, conversions only as typed.
const cu=a.addCustomUnit(s,{name:'  nửa   con ',base:'con',perBase:0.5,ingredient:'family-ing-ga-ta',now:'2026-11-12T01:00:00.000Z'});
assert.equal(cu.name,'nửa con');ok(/^cu-/.test(cu.id)&&a.validCustomUnit(cu),'custom unit record is valid');
ok(sug('family-ing-ga-ta').includes('nửa con'),'saved family unit is suggested for its ingredient');ok(sug('family-ing-ca-loc').includes('nửa con'),'a unit converted into con suits other con ingredients');
assert.equal(a.customUnitFactor(s,'family-ing-ga-ta','nửa con'),0.5,'conversion used when it is in the ingredient’s own unit');assert.equal(a.customUnitFactor(s,'pork','nửa con'),null,'no conversion for an ingredient counted in g');
const plain=a.addCustomUnit(s,{name:'rổ',ingredient:'lime'});ok(plain.base===undefined&&plain.perBase===undefined,'conversion stays absent when none was typed');
ok(sug('lime').includes('rổ'),'unit made for limes is suggested for limes');
const again=a.addCustomUnit(s,{name:'Rổ',base:'quả',perBase:12});ok(again===plain&&plain.perBase===12&&s.customUnits.length===2,'same name reuses the record; a typed conversion fills a missing one');
a.addCustomUnit(s,{name:'rổ',base:'g',perBase:999});assert.equal(plain.perBase,12,'an existing conversion is never overwritten');
ok(a.setCustomUnitHidden(s,plain.id,true)&&!sug('lime').includes('rổ'),'hidden unit leaves the suggestions');ok(s.customUnits.some(u=>u.id===plain.id),'hiding never deletes the record');
ok(sug('lime',{current:'rổ'})[0]==='rổ','a hidden unit still shows when the purchase uses it');a.setCustomUnitHidden(s,plain.id,false);ok(sug('lime').includes('rổ'),'shown again');
assert.equal(a.addCustomUnit(s,{name:'túi lưới'}),null,'a name the app already knows is not a new unit');assert.throws(()=>a.addCustomUnit(s,{name:'x'.repeat(41)}));assert.throws(()=>a.addCustomUnit(s,{name:'   '}));

// 5. Validation: older states stay valid, bad records are refused, the released client still opens the state.
const old=a.defaults();ok(a.validUnitState(old)&&a.validImport(json(old)),'state without customUnits is valid');
ok(a.validImport(json(s)),'state with family units is valid');
const stamped=json(s);stamped.customUnits[0].updatedAt=Date.now();stamped.customUnits[0].updatedBy='m1';ok(a.validImport(stamped),'sync stamps on a unit are accepted');
const bad=[{id:'x',name:'a',createdAt:''},{id:'cu-a',name:'',createdAt:''},{id:'cu-a',name:'a'.repeat(41),createdAt:''},{id:'cu-a',name:'a',base:'g',createdAt:''},{id:'cu-a',name:'a',perBase:2,createdAt:''},{id:'cu-a',name:'a',base:'g',perBase:0,createdAt:''},{id:'cu-a',name:'a',base:'g',perBase:-1,createdAt:''},{id:'cu-a',name:'a',base:'g',perBase:2e6,createdAt:''},{id:'cu-a',name:'a',createdAt:5},{id:'cu-a',name:'a',createdAt:'',hidden:'yes'},{id:'cu-a',name:'a',createdAt:'',ingredient:7},null,'nửa con'];
for(const b of bad){const t=json(old);t.customUnits=[b];ok(!a.validImport(t),'refuses '+JSON.stringify(b))}
{const t=json(old);t.customUnits={};ok(!a.validImport(t),'customUnits must be a list')}
{const t=json(old);t.customUnits=[cu,cu];ok(!a.validImport(json(t)),'duplicate ids refused')}
{const t=json(old);t.customUnits=Array.from({length:201},(_,i)=>({id:'cu-'+i,name:'u'+i,createdAt:''}));ok(!a.validImport(t),'at most 200 family units')}
{const t=json(old);t.customUnits=[{id:'cu-a',name:'a',base:null,perBase:null,createdAt:''}];ok(a.validImport(t),'null conversion counts as none')}
const released=vm.createContext({INGREDIENTS:structuredClone(MAIN_INGREDIENTS)});vm.runInContext(MAIN_UNIT_CODE+'\n'+MAIN_VALID_IMPORT+'\nthis.validImport=validImport;this.validUnitState=validUnitState;',released);
{const t=json(a.defaults());t.customUnits=json(s.customUnits);t.seedVersion=3;delete t.appEdition;t.recipes=JSON.parse(fs.readFileSync('docs/reviews/artwork-audit-20261102/source.json','utf8')).recipes.filter(r=>!r.catalogEdition||r.catalogEdition<4);for(const k of Object.keys(t.purchaseUnitPreferences||{}))if(!MAIN_INGREDIENTS[k])delete t.purchaseUnitPreferences[k];
 ok(released.validUnitState(t),'released client accepts a state with family units (unknown list ignored)')}
console.log(`Buying-unit suggestions and family units: ${n} checks passed.`);
