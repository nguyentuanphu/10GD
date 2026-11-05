const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');const c=vm.createContext({console,Intl,Date,Math,URL,structuredClone,crypto:require('node:crypto').webcrypto});for(const f of ['seed.js','recipe-catalog.js','core.js','spending-core.js','purchase-units.js','planning-core.js','insights-core.js','family-menu-core.js'])vm.runInContext(fs.readFileSync('dist/'+f,'utf8'),c);
vm.runInContext(`
const s=defaults();s.weeks={};s.pantry=[];s.recipes=[];
for(const[purpose,category,id]of [['breakfast','main','bf'],['main','main','main'],['side','soup','soup'],['side','veg','veg'],['friday','noodle','fri'],['feast','noodle','feast']])s.recipes.push({...recipe(id,id,category,'chicken',20,{chicken:400},'prep',['cook']),custom:true,purposes:[purpose],yield:4});
const start='2026-11-02',w=ensureWeek(s,start);const result=familyGenerate(s,start,{random:()=>.5});if(result.missing.length)throw Error('Unexpected gaps');
for(let i=0;i<4;i++){const day=w.days[addDays(start,i)];if(day.breakfast.recipes[0].id!=='bf'||day.dinner.recipes.map(r=>r.id).join(',')!=='soup,main,veg')throw Error('Weekday schedule')}
if(w.days['2026-11-06'].dinner.recipes[0].id!=='fri')throw Error('Friday');if(w.days['2026-11-07'].breakfast.recipes[0].id!=='bf'||w.days['2026-11-07'].lunch.recipes.length!==3)throw Error('Saturday auto');
const batch=Object.values(s.familyBatches)[0];if(batchLinks(s,batch.id).length!==5)throw Error('Five linked meals');const portions=s.members.reduce((n,m)=>n+m.weight,0);if(Math.abs(batchPortions(s,batch)-portions*5)>.001)throw Error('Five meal amounts');
const before=shopping(s,w,start,addDays(start,6)).find(r=>r.id==='chicken').needed;const batchQty=batchIngredients(s,batch).chicken;if(Math.abs(shopping(s,w,'2026-11-07','2026-11-07').find(r=>r.id==='chicken').needed-(batchQty+portions*400))>.001)throw Error('Saturday shopping includes all feast meals once');
const next=s.weeks['2026-11-09'].days['2026-11-09'].breakfast;familyGenerate(s,'2026-11-09',{random:()=>.5});if(next.recipes[0].batchId!==batch.id)throw Error('Preserve preceding feast Monday');
s.pantry=[{id:'lot',ingredient:'chicken',qty:10000,place:'fridge',expiry:''}];cookFamilyBatch(s,batch.id);if(Math.abs(s.pantry[0].qty-(10000-batchQty))>.001)throw Error('Deduct batch once');
const meal=w.days['2026-11-07'].dinner;consumeMeal(s,meal);if(Math.abs(s.pantry[0].qty-(10000-batchQty))>.001)throw Error('No second deduction on serving');let blocked=false;try{undoFamilyBatch(s,batch.id)}catch{blocked=true}if(!blocked)throw Error('Undo cooked batch while served');undoCook(s,meal);undoFamilyBatch(s,batch.id);if(Math.abs(s.pantry[0].qty-10000)>.001)throw Error('Batch undo stock');
if(!validImport(s))throw Error('Backup compatibility');
const oldId=w.days['2026-11-03'].dinner.recipes[0].id;w.days['2026-11-03'].dinner.locked=true;familyGenerate(s,start);if(w.days['2026-11-03'].dinner.recipes[0].id!==oldId)throw Error('Lock preserved');
const empty=defaults();empty.weeks={};const gaps=familyGenerate(empty,start);if(!gaps.missing.length||!gaps.libraryUsed||!Object.values(empty.weeks[start].days).every(d=>d.dinner.recipes.length))throw Error('Library fallback when no owned recipes exist');const trulyEmpty=defaults();trulyEmpty.weeks={};trulyEmpty.recipes=[];const gapsNone=familyGenerate(trulyEmpty,start);if(!gapsNone.missing.length||Object.values(trulyEmpty.weeks[start].days).some(d=>d.dinner.recipes.length))throw Error('Truly empty recipes');
`,c);console.log('PASS family-only categories, weekday/Friday/Saturday schedules, five linked feast meals, next Monday preservation, shopping, once-only cooking, undo, locks and backup validation');
vm.runInContext(`
const t=defaults();t.weeks={};t.recipes=[{...recipe('bf-only','Breakfast','main','egg',10,{egg:2},'prep',['cook']),custom:true,purposes:['breakfast'],yield:2}];const tw=ensureWeek(t,'2026-11-02');const gaps2=familyGenerate(t,'2026-11-02');if(!gaps2.missing.some(x=>x.purpose==='feast'))throw Error('Missing feast not reported');
const breakfast=tw.days['2026-11-02'].breakfast;breakfast.servings=2;if(mealIngredients(breakfast,t).egg!==2)throw Error('Yield scaling');breakfast.cooked=true;if(!validImport(t))throw Error('Breakfast backup rejected');breakfast.recipes[0].ingredients[0].qty=-2;if(validImport(t))throw Error('Invalid breakfast ingredients accepted');
const custom=defaults();custom.ingredientCatalog={'family-ing-test':{name:'Nguyên liệu riêng',unit:'bó',group:'veg'}};if(!hydrateFamilyIngredients(custom)||INGREDIENTS['family-ing-test'][1]!=='bó')throw Error('Custom ingredient hydration');
`,c);console.log('PASS missing pools, breakfast yield, strict breakfast validation and custom ingredient hydration');
// v1.7.6: the family's menu week can start on another day (ladybug report: shopping on Saturday → menu Sat–Fri).
vm.runInContext(`{
const s=defaults();s.weeks={};s.pantry=[];s.recipes=[];
for(const[purpose,category,id]of [['breakfast','main','bf'],['main','main','main'],['side','soup','soup'],['side','veg','veg'],['friday','noodle','fri'],['feast','noodle','feast']])s.recipes.push({...recipe(id,id,category,'chicken',20,{chicken:400},'prep',['cook']),custom:true,purposes:[purpose],yield:4});
if(weekStartDay(s)!==1||planStartOf(s,'2026-11-05')!=='2026-11-02')throw Error('default: Monday weeks as before');
if(planWeek(s,'2026-11-02')!==ensureWeek(s,'2026-11-02'))throw Error('Monday start: the stored week itself');
s.preferences.weekStartDay=6;
if(planStartOf(s,'2026-11-05')!=='2026-10-31'||planStartOf(s,'2026-11-07')!=='2026-11-07'||planStartOf(s,'2026-11-13')!=='2026-11-07')throw Error('Saturday start');
const start='2026-11-07',pw=planWeek(s,start);const dates=Object.keys(pw.days);
if(dates.join(',')!=='2026-11-07,2026-11-08,2026-11-09,2026-11-10,2026-11-11,2026-11-12,2026-11-13')throw Error('7 days from Saturday: '+dates);
if(Object.keys(s.weeks).some(k=>parseDate(k).getDay()!==1))throw Error('storage stays keyed by Monday');
const r=familyGenerate(s,start,{random:()=>.5});if(r.missing.length)throw Error('gaps');
const day=d=>s.weeks[monday(d)].days[d];
if(day('2026-11-09').dinner.recipes.map(x=>x.id).join(',')!=='soup,main,veg'||day('2026-11-12').dinner.recipes.map(x=>x.id).join(',')!=='soup,main,veg')throw Error('Mon–Thu dinner by weekday');
if(day('2026-11-13').dinner.recipes[0].id!=='fri')throw Error('Friday dinner');
const b=day('2026-11-07').dinner.recipes[0]?.batchId;if(!b||day('2026-11-08').lunch.recipes[0]?.batchId!==b||day('2026-11-09').breakfast.recipes[0]?.batchId!==b)throw Error('Weekends feast Sat dinner → Mon breakfast inside the Saturday week');
if(Object.keys(s.weeks).some(k=>parseDate(k).getDay()!==1))throw Error('auto-plan writes Monday-keyed weeks only');
// edits through the window change the stored day; shopping over the window counts both stored weeks
pw.days['2026-11-10'].note='qa';if(s.weeks['2026-11-09'].days['2026-11-10'].note!=='qa')throw Error('window edits the stored day');
const rows=shopping(s,pw,start,addDays(start,6)),chicken=rows.find(x=>x.id==='chicken');if(!chicken||!(chicken.needed>0))throw Error('shopping over the window');
const split=shopping(s,s.weeks['2026-11-02'],'2026-11-07','2026-11-08').find(x=>x.id==='chicken').needed+shopping(s,s.weeks['2026-11-09'],'2026-11-09','2026-11-13').find(x=>x.id==='chicken').needed;
if(Math.abs(split-chicken.needed)>.001)throw Error('window total = both stored weeks: '+split+' vs '+chicken.needed);
if(!validImport(s))throw Error('backup still valid');
}`,c);console.log('PASS menu week from the family’s shopping day: Saturday window over Monday-keyed weeks, weekday schedule, feast inside the window, shopping across both weeks');
