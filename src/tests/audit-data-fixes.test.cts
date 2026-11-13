// v1.7.19 whole-app audit (12 Nov 2026, Sydney time), area “amounts, validators, sync”: findings B3, B4, C1, C4, C5, C6*, C7, C9,
// C10, C11, C12, C16, C17, C18, C19, C21, C22, C24 (* C6, C15 and C20 are browser checks in audit-data-browser). Each check
// failed on the code before the fix. Every scenario ends with validImport(state) true; the shared ones run through the family
// settings matrix of rule 34: weeks starting on Saturday, Sunday and Monday, AUD and VND, recipes with a yield and guests, and
// two devices merged with the sync merge. Runs the real frontend scripts in a VM (no DOM). Synthetic data only.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const FILES=['store-registry','seed','recipe-catalog','core','spending-core','unit-registry','purchase-units','planning-core','insights-core','family-menu-core','availability-core','personal-core','menu-reactions-core','sync-merge-core','receipt-parse','receipt-list'];
function make(){const store:any={};const c=vm.createContext({console,Intl,Date,Math,URL,structuredClone,crypto:require('node:crypto').webcrypto,familyStorage:{getItem:(k:string)=>store[k]??null,setItem:(k:string,v:any)=>store[k]=String(v),removeItem:(k:string)=>delete store[k]}});
 for(const f of FILES)vm.runInContext(fs.readFileSync('dist/'+f+'.js','utf8'),c,{filename:f+'.js'});return c}
let passed=0;const tests:[string,()=>any][]=[];const test=(name:string,fn:()=>any)=>tests.push([name,fn]);
const run=(code:string)=>{const c=make();vm.runInContext(`globalThis.ok=(x,n)=>{if(!x)throw Error(n)};globalThis.valid=s=>validImport(JSON.parse(JSON.stringify(s)));
 globalThis.fam=(over={})=>{const s=newHouseholdState();s.members=[{id:'a',name:'A',weight:1,emoji:''},{id:'b',name:'B',weight:1,emoji:''},{id:'c',name:'C',weight:.65,emoji:''},{id:'d',name:'D',weight:.5,emoji:''}];Object.assign(s.preferences,over);if(s.preferences.currency==='VND')s.currencyProfiles={VND:{prices:{},budget:1500000}};return s};
 globalThis.dish=(id,ings,extra={})=>({id,name:id,category:'main',protein:'chicken',time:20,prep:'',steps:[],ingredients:Object.entries(ings).map(([k,q])=>({id:k,qty:q})),...extra});
 globalThis.familyDish=(id,ings,yieldN,extra={})=>({...dish(id,ings,extra),servings:4,yield:yieldN,custom:true,origin:'family',purposes:[],missingIngredients:[]});
 globalThis.ga=s=>{s.ingredientCatalog={...(s.ingredientCatalog||{}),'family-ing-ga':{name:'Gà trống',unit:'con',group:'meat'},'family-ing-hanh':{name:'Hành lá',unit:'bó',group:'veg'},'family-ing-mam':{name:'Mắm nêm',unit:'muỗng canh',group:'dry'}};hydrateFamilyIngredients(s);return s};`,c);return vm.runInContext(code,c)};
const MATRIX=[{weekStartDay:6,currency:'AUD'},{weekStartDay:0,currency:'VND'},{weekStartDay:1,currency:'AUD'},{weekStartDay:6,currency:'VND'}];

// ---------------------------------------------------------------- C21 rounding by the unit registry
test('C21: measured units scale exactly, spoons go up to ¼, counted units are whole',()=>run(`(()=>{
 const cases=[['g',12.34,12.3],['ml',99.96,100],['kg',.25,.25],['kg',1.2345,1.235],['l',.333,.333],['lạng',2.5,2.5],['con',.79,1],['con',2,2],['quả',1.15,2],['bó',.3,1],['hộp',1.01,2],['túi lưới to',.2,1],['muỗng canh',.3,.5],['muỗng cà phê',1.25,1.25],['chén',.6,.75]];
 for(const[u,n,want]of cases){const got=roundNeed(n,u);if(Math.abs(got-want)>1e-9)throw Error(u+' '+n+' → '+got+' (want '+want+')')}
 ok(!wholeCountUnit('kg')&&!wholeCountUnit('l')&&!wholeCountUnit('lạng')&&!wholeCountUnit('g')&&!wholeCountUnit('muỗng canh'),'measured units are not whole-count');
 ok(wholeCountUnit('con')&&wholeCountUnit('quả')&&wholeCountUnit('bó')&&wholeCountUnit('túi')&&wholeCountUnit('cái'),'counted units are whole-count');
 const s=ga(fam()),w=ensureWeek(s,'2026-11-09'),m=w.days['2026-11-10'].dinner;m.recipes=[familyDish('mam',{'family-ing-mam':1},4)];m.servings=1.2;
 /* owner decision 12 Nov 2026 (pop-up): spoon and bowl amounts are notes, never bought or taken from the pantry */ok(!('family-ing-mam' in mealIngredients(m,s)),'a spoon measure is not an amount to buy: '+mealIngredients(m,s)['family-ing-mam']);ok(roundNeed(.3,'muỗng canh')===.5,'a spoon amount still shows to the next quarter where it is displayed');ok(valid(s),'valid')})()`));

// ---------------------------------------------------------------- C1 / B3 / B4 / C7: one formula
for(const pref of MATRIX)test(`C1: a counted ingredient in a recipe with a yield is whole on the list, when cooking and in the pantry (${JSON.stringify(pref)})`,()=>run(`(()=>{
 const s=ga(fam(${JSON.stringify(pref)})),today='2026-11-12',start=planStartOf(s,today),end=addDays(start,6),w=planWeek(s,start),d=addDays(start,2),m=w.days[d].dinner;
 m.recipes=[familyDish('ga-luoc',{'family-ing-ga':1,pork:300},4)];
 ok(mealServings(m,s)===3.15,'3.15 portions');ok(mealIngredients(m,s)['family-ing-ga']===1,'1 con, not 0.79: '+mealIngredients(m,s)['family-ing-ga']);
 const row=shopping(s,w,start,end).find(r=>r.id==='family-ing-ga');ok(row&&row.needed===1&&row.qty===1,'list row 1 con: '+JSON.stringify(row&&{n:row.needed,q:row.qty}));
 s.pantry.push({id:'lot-ga',ingredient:'family-ing-ga',qty:1,place:'fridge',expiry:''});consumeMeal(s,m);
 ok(!s.pantry.some(p=>p.id==='lot-ga'),'the rooster is used up (no “0.21 con” left)');ok(m.consumed.find(c=>c.lotId==='lot-ga').qty===1,'took 1 con');ok(valid(s),'valid')})()`));

test('B3: a dish cooked ahead in a family recipe (with yield) is not bought again for the later meal',()=>run(`(()=>{
 const s=fam(),w=ensureWeek(s,'2026-11-09'),m=w.days['2026-11-11'].dinner;
 m.recipes=[{...familyDish('suon',{ribs:300,garlic:12},2),cookedAhead:{date:'2026-11-10',type:'dinner'}},familyDish('canh',{spinach:200},4)];
 const need=mealIngredients(m,s);ok(!need.ribs&&!need.garlic,'cooked-ahead dish adds nothing: '+JSON.stringify(need));ok(need.spinach===+(200*3.15/4).toFixed(1),'the other dish still counts');
 const row=shopping(s,w,'2026-11-09','2026-11-15').find(r=>r.id==='ribs');ok(!row,'ribs not on the list');ok(valid(s),'valid')})()`));

test('B4/C7: “Nấu luôn cho bữa sau” takes what the list bought (yield, lunch boxes, rounding)',()=>run(`(()=>{
 const s=newHouseholdState();s.members=[{id:'a',name:'A',weight:1,emoji:''},{id:'b',name:'B',weight:1,emoji:''}];const w=ensureWeek(s,'2026-11-09');
 const r=familyDish('fam-kho',{pork:1000},2);s.recipes.push(r);const d1=w.days['2026-11-10'].dinner,d2=w.days['2026-11-11'].dinner;d1.recipes=[clone(r)];d2.recipes=[clone(r)];
 s.pantry=[{id:'p1',ingredient:'pork',qty:5000,place:'fridge',expiry:''}];const later=mealIngredients(d2,s).pork;ok(later===1000,'list need for the later meal '+later);
 cookMealAhead(s,'2026-11-10','dinner',cookAheadCandidates(s,'2026-11-10','dinner'));ok(5000-s.pantry[0].qty===2000,'taken 2000 g, not 1500: '+(5000-s.pantry[0].qty));
 ok(d2.cooked&&d2.cookedWith,'later meal closed');undoCook(s,d1);ok(s.pantry[0].qty===5000&&!d2.cooked,'undo gives it all back');
 // guests on the later meal and a counted ingredient
 ga(s);const g=familyDish('ga',{'family-ing-ga':1},4);d1.recipes=[clone(g)];d2.recipes=[clone(g)];setMealGuests(d2,[{name:'Khách',adults:3,kids:0}]);s.pantry.push({id:'p-ga',ingredient:'family-ing-ga',qty:5,place:'fridge',expiry:''});
 ok(dishNeeds(d2,s,d2.recipes)['family-ing-ga']===mealIngredients(d2,s)['family-ing-ga'],'dishNeeds and mealIngredients agree');
 cookMealAhead(s,'2026-11-10','dinner',cookAheadCandidates(s,'2026-11-10','dinner'));ok(5-s.pantry.find(p=>p.id==='p-ga').qty===1+2,'1 con + 2 con for 5 portions: '+(5-s.pantry.find(p=>p.id==='p-ga').qty));ok(valid(s),'valid')})()`));

test('B3/B4: lunch-box dish cooked ahead takes the packers’ portions, like the list',()=>run(`(()=>{
 const s=fam(),w=ensureWeek(s,'2026-11-09'),box=familyDish('box',{egg:4},4,{category:'lunchbox'});const l1=w.days['2026-11-10'].lunch,l2=w.days['2026-11-11'].lunch;
 for(const l of [l1,l2]){l.recipes=[clone(box)];l.attendance.c='packed';l.attendance.d='packed'}s.pantry=[{id:'e',ingredient:'egg',qty:12,place:'fridge',expiry:''}];
 const list=mealIngredients(l2,s).egg;ok(list===2,'packers 1.15 → 2 eggs: '+list);cookMealAhead(s,'2026-11-10','lunch',cookAheadCandidates(s,'2026-11-10','lunch'));ok(12-s.pantry[0].qty===4,'2 + 2 eggs taken: '+(12-s.pantry[0].qty));ok(valid(s),'valid')})()`));

// ---------------------------------------------------------------- C4 guests: what the app stores, it loads
for(const pref of MATRIX)test(`C4: a meal cooked with 30 guests (and the largest possible meal) stays valid and merges (${JSON.stringify(pref)})`,()=>run(`(()=>{
 const s=fam(${JSON.stringify(pref)}),start=planStartOf(s,'2026-11-12'),w=planWeek(s,start),m=w.days[addDays(start,1)].dinner;m.recipes=[familyDish('ga',{chicken:1000},4)];
 setMealGuests(m,[{name:'Họ hàng',adults:28,kids:2}]);syncStamp({},s,{now:1000,by:'x'});const base=clone(s);consumeMeal(s,m);ok(m.servings===32.15,'stored '+m.servings);ok(valid(s),'cooked meal with guests is valid');
 syncStamp(base,s,{now:2000,by:'A'});const merged=mergeFamilyStates(base,s,base,{now:3000}).state;ok(valid(merged),'merged state valid');
 const big=fam(${JSON.stringify(pref)});big.members=Array.from({length:12},(x,i)=>({id:'m'+i,name:'M'+i,weight:3,emoji:''}));const bw=planWeek(big,start),bm=bw.days[start].dinner;bm.recipes=[dish('x',{rice:100})];
 bm.attendance=Object.fromEntries(big.members.map(p=>[p.id,'home']));setMealGuests(bm,Array.from({length:10},()=>({adults:30,kids:30})));ok(mealServings(bm,big)===MEAL_SERVINGS_MAX,'max '+mealServings(bm,big));consumeMeal(big,bm);ok(valid(big),'largest meal valid')})()`));

// ---------------------------------------------------------------- C5 / C24 / C22 validators
test('C5: receipts in GBP or EUR are valid; the budget currency stays AUD or VND',()=>run(`(()=>{
 const s=fam(),text='Woolworths UK\\nVAT No 123\\nMILK 2L £1.45\\nBREAD £1.10\\nTOTAL £2.55',p=ReceiptParse.parseReceipt(text,{});ok(p.currency==='GBP','parsed GBP');
 for(const c of ['GBP','EUR'])s.receipts.push({currency:c,id:'r'+c,store:'Shop',date:'2026-11-10',total:2.55,items:[{id:'i1',label:'MILK',total:1.45,ingredient:null,recipe:null,kind:'pending',quantity:null}]});
 ok(valid(s),'GBP and EUR receipts valid');const bad=clone(s);bad.receipts[0].currency='gbp';ok(!valid(bad),'not an ISO code');const budget=clone(s);budget.preferences.currency='GBP';ok(!valid(budget),'budget currency still AUD/VND')})()`));
test('C24: a receipt line of 1500 kg (1.5e6 g) stays valid; the form limit (1,000,000 kg) is the validator limit',()=>run(`(()=>{
 const s=fam();s.receipts.push({currency:'AUD',id:'r1',store:'Bulk',date:'2026-11-10',total:900,items:[{id:'i1',label:'RICE',total:900,ingredient:'rice',recipe:null,kind:'matched',quantity:canonicalQuantity(1500,'kg','rice'),enteredQty:1500,enteredUnit:'kg'}]});
 ok(valid(s),'1.5e6 g valid');s.receipts[0].items[0].quantity=canonicalQuantity(1000000,'kg','rice');ok(valid(s),'1e9 g valid');s.receipts[0].items[0].quantity=2e9;ok(!valid(s),'beyond what the form can enter')})()`));
test('C22: recipe tags must be a list of words and a use-by a date or empty; normal states stay valid',()=>run(`(()=>{
 ok(valid(defaults())&&valid(newHouseholdState()),'starter states valid');
 const t=fam();t.recipes[0].tags='Healthy';ok(!valid(t),'tags as a string rejected');t.recipes[0].tags=['Healthy'];ok(valid(t),'tags as a list ok');
 const e=fam();e.pantry.push({id:'x',ingredient:'pork',qty:1,place:'fridge',expiry:'soon'});ok(!valid(e),'expiry “soon” rejected');e.pantry[0].expiry='2026-11-20';ok(valid(e),'date ok');e.pantry[0].expiry='';ok(valid(e),'empty ok')})()`));

// ---------------------------------------------------------------- C10 / C17 pantry lots
test('C10: a pack put away with an estimate is used up with it, and shrinks in step when partly used',()=>run(`(()=>{
 const s=fam(),start='2026-11-09',end='2026-11-15',w=ensureWeek(s,start),m=w.days['2026-11-10'].dinner,m2=w.days['2026-11-11'].dinner;
 m.recipes=[dish('rau',{spinach:400},{category:'veg'})];m.servings=2;setBuyingUnits(w,start,end,'spinach',{unit:'túi',amount:1,basePerUnit:null,pricePerUnit:null});
 setShoppingBought(w,start,end,shopping(s,w,start,end).find(r=>r.id==='spinach'),true);storeShoppingPurchases(s,w,start,end,'fridge');
 const lot=s.pantry.find(p=>p.ingredient==='spinach');ok(lot.qtyEstimated&&lot.qty===200&&lot.purchase.amount===1,'stored 1 túi ≈ 200 g');
 m2.recipes=[dish('rau2',{spinach:200},{category:'veg'})];m2.servings=2;consumeMeal(s,m2);ok(lot.qty===100&&lot.purchase.amount===.5,'half used → ½ túi: '+lot.qty+' / '+lot.purchase.amount);
 consumeMeal(s,m);ok(!s.pantry.some(p=>p.ingredient==='spinach'),'used up → leaves the pantry (not “1 túi”)');ok(valid(s),'valid');
 undoCook(s,m);const back=s.pantry.find(p=>p.id===lot.id);ok(back&&back.qty===100&&back.purchase.amount===.5&&back.qtyEstimated===true,'undo restores ½ túi: '+JSON.stringify(back));
 undoCook(s,m2);ok(back.qty===200&&back.purchase.amount===1,'second undo restores 1 túi');ok(valid(s),'valid')})()`));
test('C17: “Bỏ đánh dấu đã nấu” puts back a used-up lot with all its details',()=>run(`(()=>{
 const s=fam(),w=ensureWeek(s,'2026-11-09'),m=w.days['2026-11-10'].dinner;m.recipes=[dish('ga',{chicken:1000})];m.servings=4;
 const lot={id:'lot1',ingredient:'chicken',qty:500,place:'freezer',expiry:'2026-12-01',checkedAt:'2026-11-08',storedOn:'2026-11-08',boughtOn:'2026-11-08',receiptId:'rc1',forMeal:{date:'2026-11-10',type:'dinner'},qtyEstimated:true};
 s.pantry=[clone(lot)];consumeMeal(s,m);ok(!s.pantry.length,'used up');ok(valid(s),'valid while cooked');undoCook(s,m);
 const back=s.pantry.find(p=>p.id==='lot1');for(const k of Object.keys(lot))if(JSON.stringify(lot[k])!==JSON.stringify(back[k]))throw Error('lost '+k);ok(valid(s),'valid')})()`));

// ---------------------------------------------------------------- C11 / C19 receipt reconciliation
for(const day of [1,6,0])test(`C19: a receipt for an item already ticked on the list says “Đủ”, not “Dư”, and nothing is stored twice (week starts ${day})`,()=>run(`(()=>{
 const s=fam({weekStartDay:${day}}),start=planStartOf(s,'2026-11-12'),end=addDays(start,6),w=planWeek(s,start);w.days[addDays(start,2)].dinner.recipes=[dish('ga',{chicken:1000})];w.days[addDays(start,2)].dinner.servings=2;
 const row=shopping(s,w,start,end).find(r=>r.id==='chicken');setShoppingBought(w,start,end,row,true);
 const rec={id:'rc1',store:'Coles',date:'2026-11-12',total:12,currency:'AUD',items:[{id:'i1',label:'CHICKEN',total:12,ingredient:'chicken',quantity:500,kind:'matched'}]};s.receipts.push(rec);
 const pl=ReceiptList.plan(s,rec,w,start,end).rows[0];ok(pl.status==='enough'&&pl.extra===0&&pl.ticked===500,'status '+JSON.stringify(pl));
 ReceiptList.apply(s,rec,w,start,end,null,{});ok(!s.pantry.some(p=>p.ingredient==='chicken'),'receipt adds no extra lot');ok(w.bought.chicken===500,'tick unchanged');
 storeShoppingPurchases(s,w,start,end,'fridge');ok(s.pantry.filter(p=>p.ingredient==='chicken').reduce((n,p)=>n+p.qty,0)===500,'stored once: 500 g');ok(valid(s),'valid')})()`));
test('C11: a list row bought as “1 túi” is covered by a weighed receipt line; the row is ticked and the bag is stored once',()=>run(`(()=>{
 const s=fam(),start='2026-11-09',end='2026-11-15',w=ensureWeek(s,start);w.days['2026-11-12'].dinner.recipes=[dish('rau',{spinach:800},{category:'veg'})];w.days['2026-11-12'].dinner.servings=4;
 setBuyingUnits(w,start,end,'spinach',{unit:'túi',amount:1,basePerUnit:null,pricePerUnit:null});
 const rec={id:'rc',store:'Coles',date:'2026-11-10',total:4,currency:'AUD',items:[{id:'i',label:'SPINACH 400G',total:4,ingredient:'spinach',quantity:400,kind:'matched'}]};s.receipts.push(rec);
 const pl=ReceiptList.plan(s,rec,w,start,end).rows[0];ok(pl.status==='enough'&&pl.extra===0&&pl.covered===400&&pl.pack?.unit==='túi','plan '+JSON.stringify(pl));
 const before=clone(w);ReceiptList.apply(s,rec,w,start,end,null,{});let row=shopping(s,w,start,end).find(r=>r.id==='spinach');ok(row.bought,'list row ticked');
 ok(JSON.stringify(s.pantry.filter(p=>p.ingredient==='spinach').map(p=>p.qty))==='[400]','pantry 400 g from the receipt');ok(valid(s),'valid after receipt');
 storeShoppingPurchases(s,w,start,end,'fridge');ok(JSON.stringify(s.pantry.filter(p=>p.ingredient==='spinach').map(p=>p.qty))==='[400]','“Cất đồ” does not add a second bag');ok(valid(s),'valid after storing');
 // undo before storing: tick and lot go away
 const t=fam(),tw=ensureWeek(t,start);tw.days['2026-11-12'].dinner.recipes=[dish('rau',{spinach:800},{category:'veg'})];tw.days['2026-11-12'].dinner.servings=4;setBuyingUnits(tw,start,end,'spinach',{unit:'túi',amount:1,basePerUnit:null,pricePerUnit:null});
 const r2=clone(rec);t.receipts.push(r2);ReceiptList.apply(t,r2,tw,start,end,null,{});ok(ReceiptList.undo(t,r2),'undo');ok(!t.pantry.some(p=>p.ingredient==='spinach')&&!shopping(t,tw,start,end).find(r=>r.id==='spinach').bought,'undo removes the lot and the tick');ok(valid(t),'valid')})()`));

// ---------------------------------------------------------------- C12 unknown prices
for(const currency of ['AUD','VND'])test(`C12: an ingredient without a price is “Chưa rõ giá”, never $0.00 (${currency})`,()=>run(`(()=>{
 const s=fam({currency:'${currency}'});activatePrices(s);const id=Object.keys(INGREDIENTS).find(k=>!(seedPrices[k]>0)&&INGREDIENTS[k][1]==='g');ok(id,'an unpriced built-in');
 ok(priceFor(s,id)===null,'priceFor null, not 0');const w=ensureWeek(s,'2026-11-09'),m=w.days['2026-11-10'].dinner;m.recipes=[dish('x',{[id]:300}),dish('y',{rice:100})];
 const row=shopping(s,w,'2026-11-09','2026-11-15').find(r=>r.id===id);ok(row.costKnown===false,'row cost not known');
 ok(mealCostText(m,s)==='Chưa rõ giá','meal cost text '+mealCostText(m,s));ok(mealCostText(m,s,[m.recipes[0]])==='Chưa rõ giá','dish cost text');
 if('${currency}'==='AUD')ok(mealCostText(m,s,[m.recipes[1]])===aud(mealRecipeCost(m,m.recipes[1],s),'AUD'),'priced dish shows its cost');ok(valid(s),'valid')})()`));

// ---------------------------------------------------------------- C16 whole counted buying amounts
test('C16: fractions of counted units are refused as buying amounts; weights and measures are not',()=>run(`(()=>{
 const s=ga(fam()),start='2026-11-09',end='2026-11-15',w=ensureWeek(s,start);w.days['2026-11-10'].dinner.recipes=[dish('g',{'family-ing-ga':1,'family-ing-hanh':1,pork:300})];
 const tryIt=f=>{try{f();return 'ok'}catch(e){return 'no'}};
 ok(tryIt(()=>setPurchaseQuantity(w,start,end,'family-ing-ga',1.5))==='no','1.5 con refused');ok(tryIt(()=>setPurchaseQuantity(w,start,end,'family-ing-hanh',.3))==='no','0.3 bó refused');
 ok(tryIt(()=>setPurchaseQuantity(w,start,end,'egg',1.5))==='no','1.5 quả refused');ok(tryIt(()=>setPurchaseQuantity(w,start,end,'family-ing-ga',2))==='ok','2 con ok');ok(tryIt(()=>setPurchaseQuantity(w,start,end,'pork',250.5))==='ok','250.5 g ok');
 ok(tryIt(()=>setBuyingUnits(w,start,end,'pork',{unit:'túi',amount:1.5,basePerUnit:null,pricePerUnit:null}))==='no','1.5 túi refused');ok(tryIt(()=>setBuyingUnits(w,start,end,'pork',{unit:'kg',amount:1.5,basePerUnit:1000,pricePerUnit:null}))==='ok','1.5 kg ok');
 ok(tryIt(()=>setBuyingUnits(w,start,end,'family-ing-ga',{unit:'kg',amount:1.5,basePerUnit:null,pricePerUnit:null}))==='ok','a chicken by the kilo is fine');ok(valid(s),'valid')})()`));

// ---------------------------------------------------------------- C9 / C18 sync merge
test('C9: two devices cooking from one pantry lot keep both deductions; a hand edit still merges by last writer',()=>run(`(()=>{
 const mk=(qty)=>{const b=fam();const w=ensureWeek(b,'2026-11-09');w.days['2026-11-10'].dinner.recipes=[dish('d1',{chicken:1000})];w.days['2026-11-11'].dinner.recipes=[dish('d2',{chicken:1000})];w.days['2026-11-10'].dinner.servings=2;w.days['2026-11-11'].dinner.servings=2;
  b.pantry=[{id:'lot1',ingredient:'chicken',qty,place:'fridge',expiry:''}];syncStamp({},b,{now:1000,by:'x'});return b};
 const cook=(b,date,now,by)=>{const s=clone(b);consumeMeal(s,s.weeks['2026-11-09'].days[date].dinner);syncStamp(b,s,{now,by});return s};
 for(const qty of [1000,1500]){const b=mk(qty),A=cook(b,'2026-11-10',2000,'A'),B=cook(b,'2026-11-11',3000,'B');
  for(const m of [mergeFamilyStates(b,A,B,{now:4000}).state,mergeFamilyStates(b,B,A,{now:4000}).state]){const lot=m.pantry.find(p=>p.id==='lot1');const left=qty-1000;
   ok(left?lot&&lot.qty===left:!lot,'lot after both cooks: '+(lot&&lot.qty)+' want '+left);ok(m.weeks['2026-11-09'].days['2026-11-10'].dinner.cooked&&m.weeks['2026-11-09'].days['2026-11-11'].dinner.cooked,'both cooked');ok(valid(m),'valid')}}
 // the same meal cooked on both devices: one deduction
 {const b=mk(1500),A=cook(b,'2026-11-10',2000,'A'),B=cook(b,'2026-11-10',3000,'B'),m=mergeFamilyStates(b,A,B,{now:4000}).state;ok(m.pantry.find(p=>p.id==='lot1').qty===1000,'same meal → one deduction')}
 // one device cooks, the other undoes nothing: normal merge
 {const b=mk(1000),A=cook(b,'2026-11-10',2000,'A'),B=clone(b);B.preferences.budget=200;syncStamp(b,B,{now:3000,by:'B'});const m=mergeFamilyStates(b,A,B,{now:4000}).state;ok(m.pantry.find(p=>p.id==='lot1').qty===500&&m.preferences.budget===200,'one side cooked')}
 // a hand edit on one side, cooking on the other: last writer wins as before
 {const b=mk(1000),A=cook(b,'2026-11-10',2000,'A'),B=clone(b);B.pantry[0].qty=800;syncStamp(b,B,{now:3000,by:'B'});const m=mergeFamilyStates(b,A,B,{now:4000}).state;ok(m.pantry.find(p=>p.id==='lot1').qty===800,'hand edit kept')}})()`));
test('C18: the same family unit made on two devices is one unit and keeps its conversion',()=>run(`(()=>{
 const base=fam();syncStamp({},base,{now:1000,by:'x'});const A=clone(base),B=clone(base);
 const a=addCustomUnit(A,{name:'Túi lưới to',base:'g',perBase:2000,now:'2026-11-12T00:00:00Z'}),b=addCustomUnit(B,{name:'túi  lưới TO',now:'2026-11-12T00:00:01Z'});ok(a.id===b.id,'same id from the name: '+a.id+' / '+b.id);
 syncStamp(base,A,{now:5000,by:'A'});syncStamp(base,B,{now:5001,by:'B'});
 for(const m of [mergeFamilyStates(base,A,B,{now:6000}).state,mergeFamilyStates(base,B,A,{now:6000}).state]){ok(m.customUnits.length===1,'one unit: '+JSON.stringify(m.customUnits));ok(customUnitFactor(m,'spinach','túi lưới to')===2000,'conversion used');ok(valid(m),'valid')}
 // units already stored twice (older random ids): the merge keeps one, with the conversion
 const old=fam();old.customUnits=[{id:'cu-old1',name:'túi lưới to',createdAt:'2026-11-01T00:00:00Z'},{id:'cu-old2',name:'Túi lưới to',base:'g',perBase:2000,createdAt:'2026-11-02T00:00:00Z'}];ok(customUnitFactor(old,'spinach','Túi lưới to')===2000,'lookup prefers the copy with a conversion');
 const m2=mergeFamilyStates(null,old,fam(),{now:7000}).state;ok(m2.customUnits.length===1&&m2.customUnits[0].perBase===2000,'duplicates folded: '+JSON.stringify(m2.customUnits));ok(valid(m2),'valid')})()`));

// ---------------------------------------------------------------- re-check of every audit fix, 13 Nov 2026 (Sydney time)
test('re-check L6: a printed đồng total of 6–7 digits is read whole',()=>run(`(()=>{
 const r=ReceiptParse.parseReceipt("CO.OP MART\\nTRUNG GA 10 QUA 35000.00\\nTHIT BA CHI 500G 125000.00\\nTONG CONG 160000.00");ok(r.printedTotal===160000,'printed total '+r.printedTotal);
 const r2=ReceiptParse.parseReceipt("CO.OP MART\\nGAO 5KG 1394567.00\\nTONG CONG 1394567.00");ok(r2.printedTotal===1394567,'7 digits '+r2.printedTotal)})()`));
for(const pref of MATRIX)test(`re-check S1: a lot kept for one meal is not taken by another while other stock is there (${JSON.stringify(pref)})`,()=>run(`(()=>{
 const s=fam(${JSON.stringify(pref)}),start=planStartOf(s,'2026-11-12'),w=planWeek(s,start),d1=addDays(start,1),d3=addDays(start,3);
 w.days[d1].dinner.recipes=[dish('a',{pork:300})];w.days[d3].dinner.recipes=[dish('b',{pork:300})];
 s.pantry.push({id:'kept',ingredient:'pork',qty:400,place:'fridge',expiry:'2099-01-01',forMeal:{date:d3,type:'dinner'}},{id:'free',ingredient:'pork',qty:400,place:'fridge',expiry:'2098-01-01'});
 const need=mealIngredients(w.days[d1].dinner,s).pork;consumeMeal(s,w.days[d1].dinner);
 ok(s.pantry.find(p=>p.id==='kept').qty===400,'kept lot untouched: '+JSON.stringify(s.pantry));ok(Math.abs(s.pantry.find(p=>p.id==='free').qty-(400-need))<1e-6,'free lot used');
 consumeMeal(s,w.days[d3].dinner);ok(w.days[d3].dinner.consumed.some(c=>c.lotId==='kept'),'the kept lot goes to its own meal first');ok(valid(s),'valid')})()`));
test('re-check S1: a kept lot is still used when nothing else is in the pantry',()=>run(`(()=>{
 const s=fam(),w=ensureWeek(s,'2026-11-09');w.days['2026-11-10'].dinner.recipes=[dish('a',{pork:300})];
 s.pantry.push({id:'kept',ingredient:'pork',qty:400,place:'fridge',expiry:'',forMeal:{date:'2026-11-13',type:'dinner'}});
 const r=consumeMeal(s,w.days['2026-11-10'].dinner);ok(w.days['2026-11-10'].dinner.consumed.some(c=>c.lotId==='kept'),'used last, not refused');ok(valid(s),'valid')})()`));
// S4 (suspected in the audit; reproduced 13 Nov 2026): a "Đã mua" tick was one number per menu week, so ticking Saturday's pork
// with "Hôm nay" showed Tuesday's pork as bought although nothing was bought for Tuesday. Ticks now belong to their date range.
const {MAIN_INGREDIENTS,MAIN_VALID_IMPORT}=require('./fixtures/main-0bcef70-client.cjs');
const oldValid=(()=>{const o=vm.createContext({INGREDIENTS:structuredClone(MAIN_INGREDIENTS)});vm.runInContext(MAIN_VALID_IMPORT+'\nthis.validImport=validImport;',o);return(s:any)=>o.validImport(JSON.parse(JSON.stringify(s)))})();
for(const pref of MATRIX)test(`re-check S4: a tick belongs to its date range, across the two stored weeks (${JSON.stringify(pref)})`,()=>{const out=run(`(()=>{
 const s=fam(${JSON.stringify(pref)}),start=planStartOf(s,'2026-11-12'),end=addDays(start,6),d1=start,d3=addDays(start,3),d5=addDays(start,5),W=()=>planWeek(s,start);
 for(const d of Object.keys(W().days))for(const t of ['lunch','dinner'])W().days[d][t].recipes=[];
 W().days[d1].dinner.recipes=[dish('a',{pork:300})];W().days[d3].dinner.recipes=[dish('b',{pork:300})];W().days[d5].dinner.recipes=[dish('c',{pork:300})];
 const row=(a,b)=>shopping(s,W(),a,b).find(r=>r.id==='pork');syncStamp({},s,{now:1000,by:'x'});const base=clone(s);
 setShoppingBought(W(),d1,d1,row(d1,d1),true);
 ok(row(d1,d1).bought,'the day ticked is bought');ok(!row(d3,d3).bought,'another day is not bought: '+JSON.stringify(W().boughtScope));
 ok(!row(d3,addDays(d3,2)).bought,'a 3-day range without the ticked day is not bought');ok(!row(start,end).bought,'the whole week is not bought (one day of three)');
 ok(valid(s),'valid with a ranged tick');
 /* a second device ticks another day; the merge keeps both ticks */
 const B=clone(base);setShoppingBought(planWeek(B,start),d5,d5,shopping(B,planWeek(B,start),d5,d5).find(r=>r.id==='pork'),true);
 syncStamp(base,s,{now:2000,by:'A'});syncStamp(base,B,{now:2500,by:'B'});const m=mergeFamilyStates(base,s,B,{now:3000}).state;
 const mrow=(a,b)=>shopping(m,planWeek(m,start),a,b).find(r=>r.id==='pork');ok(mrow(d1,d1).bought&&mrow(d5,d5).bought&&!mrow(d3,d3).bought,'merged: both ticks, nothing else');ok(valid(m),'merged valid');
 /* ticking the whole week covers every day; unticking one day removes the whole-week tick only */
 setShoppingBought(W(),start,end,row(start,end),true);ok(row(d3,d3).bought&&row(start,end).bought,'whole-week tick covers each day');
 setShoppingBought(W(),d3,d3,row(d3,d3),false);ok(!row(d3,d3).bought&&!row(start,end).bought,'unticked day and week');ok(row(d1,d1).bought,'the first day keeps its own tick');
 ok(W().bought.pork===row(d1,d1).qty,'week.bought mirrors the largest tick for older app versions: '+W().bought.pork);
 /* changing the amount for a day unticks that day only */
 setPurchaseQuantity(W(),d1,d1,'pork',500);ok(!row(d1,d1).bought,'new amount → not bought');ok(W().bought.pork===0,'mirror 0');
 /* data saved before this change: one whole-week number, read as before */
 const old=fam(${JSON.stringify(pref)}),ow=planWeek(old,start);for(const d of Object.keys(ow.days))for(const t of ['lunch','dinner'])ow.days[d][t].recipes=[];
 ow.days[d1].dinner.recipes=[dish('a',{pork:300})];ow.days[d3].dinner.recipes=[dish('b',{pork:300})];ow.bought.pork=5000;const orow=(a,b)=>shopping(old,planWeek(old,start),a,b).find(r=>r.id==='pork');
 ok(orow(d1,d1).bought&&orow(d3,d3).bought&&orow(start,end).bought,'old whole-week tick still covers the week');ok(valid(old),'old state valid');
 setShoppingBought(planWeek(old,start),d3,d3,orow(d3,d3),true);ok(orow(d1,d1).bought&&orow(start,end).bought,'a new day tick keeps the old whole-week tick');
 setShoppingBought(planWeek(old,start),d1,d1,orow(d1,d1),false);ok(!orow(d1,d1).bought&&orow(d3,d3).bought,'unticking a day leaves the other day ticked');ok(valid(old),'valid after');
 return JSON.stringify({s,m,old})})()`);const {s,m,old}=JSON.parse(out);
 assert.ok(Object.values(m.weeks).some((w:any)=>w.boughtScope)&&Object.values(old.weeks).some((w:any)=>w.boughtScope),'ranged ticks are stored');
 /* an older app version receiving the synced weeks: its validator ignores the new field (same check as voice-commands' voiceLearned) */
 const legacy=JSON.parse(run('JSON.stringify(defaults())'));legacy.seedVersion=3;delete legacy.appEdition;legacy.recipes=JSON.parse(fs.readFileSync('docs/reviews/artwork-audit-20261102/source.json','utf8')).recipes.filter((r:any)=>!r.catalogEdition||r.catalogEdition<4);
 const wk='2026-11-09';legacy.weeks={[wk]:JSON.parse(run(`(()=>{const d=defaults();return JSON.stringify(ensureWeek(d,'${wk}'))})()`))};assert.equal(oldValid(legacy),true,'baseline');
 for(const st of [m,old])for(const w of Object.values(st.weeks) as any[])if(w.boughtScope){legacy.weeks[wk].boughtScope=w.boughtScope;legacy.weeks[wk].bought={...legacy.weeks[wk].bought,...w.bought};assert.equal(oldValid(legacy),true,'an older app version still accepts the synced week: '+JSON.stringify(w.boughtScope))}});

// B9: one store registry. Every place that offers or reads a store takes it from STORE_REGISTRY; stored ids are unchanged, the
// validator-bound views (saved products, So Giá observations) keep exactly their old ids, and other chains reach So Giá as 'other'.
test('re-check B9: one store registry; stored store ids stay valid for this and older versions',()=>{
 const c=vm.createContext({console,Intl,Date,Math,URL,JSON,structuredClone,crypto:require('node:crypto').webcrypto});
 for(const f of ['store-registry','seed','recipe-catalog','core','spending-core','unit-registry','purchase-units','planning-core','insights-core','receipt-parse','master-catalog','shopping-optimizer','voice-price'])vm.runInContext(fs.readFileSync('dist/'+f+'.js','utf8'),c,{filename:f+'.js'});
 const R=(code:string)=>JSON.parse(vm.runInContext('JSON.stringify('+code+')',c));
 const reg=R('STORE_REGISTRY'),ids=new Set(reg.map((s:any)=>s.id)),names=new Map(reg.map((s:any)=>[s.id,s.name]));
 assert.equal(ids.size,reg.length,'one entry per id');
 // the views: each id comes from the registry with the registry's name
 const products=R('RETAILERS');assert.deepEqual(Object.keys(products).sort(),['chemist','coles','woolworths'],'saved products keep their three ids (validProduct)');
 for(const[id,p]of Object.entries(products) as any)assert.equal(p.name,names.get(id));
 const scout=R('PriceScout.RETAILER_IDS');assert.deepEqual([...scout].sort(),['aldi','amazon','chemist','coles','other','viet-grocer','woolworths'],'So Giá keeps its seven ids (validObservation)');
 for(const id of scout)assert.equal(R(`PriceScout.RETAILERS[${JSON.stringify(id)}].name`),names.get(id));
 const receipt=R('ReceiptParse.RETAILERS');for(const id of ['aldi','woolworths','coles','woolworths-uk','iga','costco','harris-farm'])assert.ok(receipt[id],'receipt id kept: '+id);
 for(const[id,x]of Object.entries(receipt) as any){assert.ok(ids.has(id));assert.equal(x.name,names.get(id))}
 assert.equal(receipt.aldi.scout,'aldi');assert.equal(receipt.costco.scout,null,'receipt scout field as before');
 // suggestions: the family's own places first, then the registry chains (ALDI and Harris Farm everywhere)
 const choice=R(`storeChoiceNames({stores:[{name:'Chợ Cabramatta'},{name:'coles'}],preferences:{currency:'AUD'}})`);
 assert.equal(choice[0],'Chợ Cabramatta');assert.ok(choice.includes('ALDI')&&choice.includes('Harris Farm')&&choice.includes('Costco'),JSON.stringify(choice));assert.ok(!choice.includes('Coles'),'no duplicate of the family’s own coles');
 for(const n of R('storeChainNames()'))assert.ok([...names.values()].includes(n));
 assert.ok(R(`storeChoiceNames({stores:[],preferences:{currency:'VND'}})`).includes('Co.op Mart'),'a đồng family gets the Vietnamese chains');
 // alias layer: chains without their own So Giá id are saved as 'other', the value voice prices saved before
 for(const[id,want]of[['costco','other'],['iga','other'],['harris-farm','other'],['aldi','aldi'],['viet-grocer','viet-grocer'],['woolworths-uk',null]])assert.equal(R(`storeScoutId(${JSON.stringify(id)})`),want,id);
 assert.equal(R(`VoicePrice.parsePriceUtterance('bananas 3.90 a kilo at Harris Farm',{stores:[]}).rows[0].retailer`),'other');
 assert.equal(R(`storeFromName('ALDI Bankstown')?.id`),'aldi');assert.equal(R(`storeFromName('Woolies Metro')?.id`),'woolworths');assert.equal(R(`storeFromName('Tiệm Hưng Phát')`),null);
 // stored values: an observation and a product saved with the old ids are valid; a widened id would not be (older devices)
 const obs=(r:string)=>R(`PriceScout.validObservation(PriceScout.withProvenance({id:'obs-000001',itemId:'gao-jasmine',label:'Jasmine rice',retailer:${JSON.stringify(r)},price:22,currency:'AUD',observedAt:'2026-11-12',source:'manual'},{}))`);
 assert.equal(obs('coles'),true,'baseline observation');assert.equal(obs('other'),true,'other is stored like coles');assert.equal(obs('costco'),false,'costco is never stored as its own So Giá id');
 const prod=(r:string)=>R(`validProduct({id:'p1',retailer:${JSON.stringify(r)},name:'Milk',size:'2 L',branch:'',barcode:'',price:3.1,source:'manual',checkedAt:'2026-11-12',url:''})`);
 assert.equal(prod('coles'),true);assert.equal(prod('chemist'),true);assert.equal(prod('aldi'),false,'products stay on the three ids older versions accept');
 assert.equal(R(`retailerSearch('coles','milk')`),'https://www.coles.com.au/search?q=milk');assert.equal(R(`retailerSearch('aldi','milk')`),null);
 // no other file keeps its own list of chain names
 for(const f of ['insights-core','receipt-parse','shopping-optimizer','voice-price','price-scout-ui','shopping-planning']){const src=fs.readFileSync('src/frontend/'+f+'.ts','utf8');
  for(const n of ["'Harris Farm'","'harris farm'","'Chemist Warehouse'","'Costco'","name:'ALDI'","['woolworths','coles','aldi','chemist'","{id:'store-coles'"])assert.ok(!src.includes(n),f+' still has its own store list: '+n)}
});

(async()=>{for(const[name,fn]of tests){try{await fn();passed++;console.log('PASS',name)}catch(e:any){console.error('FAIL',name);throw e}}console.log(`audit data fixes: ${passed}/${tests.length} passed`)})().catch(e=>{console.error(e);process.exit(1)});
