// v1.7.19 audit B1 / B2 / C8 (owner, 12 Nov 2026: each family chooses the first day of its week because each shops on a different
// day — never assume Monday). Weeks are stored under their Monday; the family's start day only places the 7-day window on screen.
// Families whose week starts on Saturday and on Sunday (and Monday for comparison): one accessor for a day (dayAt), one for the
// menu week's own fields (menuWeekKey); the hidden copies older releases wrote are folded back without losing guests, leftovers,
// plans or list lines; receipt reconciliation undo restores the bought marks; planning in "Nấu mỗi bữa" writes the shown days.
// Every changed state ends with validImport true.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const files=['seed','recipe-catalog','core','spending-core','unit-registry','purchase-units','planning-core','insights-core','family-menu-core','availability-core','personal-core','receipt-parse','receipt-list'];
function make(){const store:any={};const ctx=vm.createContext({console,Intl,Date,Math,URL,TextEncoder,structuredClone,crypto:require('node:crypto').webcrypto,familyStorage:{getItem:(k:string)=>store[k]??null,setItem:(k:string,v:string)=>store[k]=String(v),removeItem:(k:string)=>delete store[k]}});
 vm.runInContext(files.map(f=>fs.readFileSync('dist/'+f+'.js','utf8')).join('\n;\n'),ctx);return(c:string)=>JSON.parse(vm.runInContext('JSON.stringify('+c+')',ctx))}
let n=0;const check=(name:string,fn:()=>void)=>{fn();n++;console.log('PASS',name)};
const TODAY='2026-11-12';// a Thursday
for(const start of [6,0,1]){const label=['Sunday','Monday','','','','','Saturday'][start];
 check(`${label} start: one key for a day, one for the menu week`,()=>{const run=make();
  const r=(run(`(()=>{const s=newHouseholdState();s.preferences.weekStartDay=${start};const ps=planStartOf(s,'${TODAY}');
   const days=[0,1,2,3,4,5,6].map(i=>addDays(ps,i));for(const d of days)dayAt(s,d);
   return{ps,key:menuWeekKey(s,'${TODAY}'),keys:Object.keys(s.weeks).sort(),allMonday:Object.keys(s.weeks).every(k=>monday(k)===k),same:days.every(d=>dayAt(s,d)===planWeek(s,ps).days[d]),valid:validImport(s)}})()`));
  assert.equal(new Date(r.ps+'T12:00:00').getDay(),start,'the window starts on the family day');
  assert.equal(r.key,run(`monday('${r.ps}')`),'the menu week fields live in the stored week of its first day');
  assert.ok(r.allMonday,`only Monday keys are written ${JSON.stringify(r.keys)}`);assert.ok(r.same,'dayAt and the shown week are the same day objects');assert.ok(r.valid)});

 check(`${label} start: guests added to a day reach the menu and the portions`,()=>{const run=make();
  const r=(run(`(()=>{const s=newHouseholdState();s.preferences.weekStartDay=${start};const ps=planStartOf(s,'${TODAY}'),w=planWeek(s,ps),m=w.days['${TODAY}'].dinner;
   m.recipes=[clone(s.recipes.find(x=>x.ingredients?.length))];const before=mealServings(m,s);setMealGuests(dayAt(s,'${TODAY}').dinner,[{name:'Cô Lan',adults:2,kids:0}]);
   return{before,after:mealServings(planWeek(s,ps).days['${TODAY}'].dinner,s),allMonday:Object.keys(s.weeks).every(k=>monday(k)===k),valid:validImport(s)}})()`));
  assert.equal(r.after,r.before+2,'two adult guests add two portions to the meal the menu shows');assert.ok(r.allMonday);assert.ok(r.valid)});

 check(`${label} start: receipt reconciliation undo restores the bought marks (C8)`,()=>{const run=make();
  const r=(run(`(()=>{const s=newHouseholdState();s.preferences.weekStartDay=${start};s.members=[{id:'a',name:'A',weight:1,emoji:''},{id:'b',name:'B',weight:1,emoji:''}];
   const start=planStartOf(s,'${TODAY}'),end=addDays(start,6),w=planWeek(s,start);
   w.days['${TODAY}'].dinner.recipes=[{id:'x',name:'Gà',category:'main',protein:'chicken',time:10,prep:'',steps:[],servings:4,yield:4,ingredients:[{id:'chicken',qty:1000}]}];
   w.extras.push({id:'kim',name:'Kimchi',qty:'1 hộp',cost:0,costUnknown:true,currency:'AUD',done:false});
   const row=shopping(s,w,start,end).find(r=>r.id==='chicken');
   const rec={id:'rc',store:'Coles',date:'${TODAY}',total:15,currency:'AUD',items:[{id:'i1',label:'CHICKEN BREAST',total:12,ingredient:'chicken',quantity:row.qty,kind:'matched'},{id:'i2',label:'KIMCHI',total:3,quantity:null,basket:{key:'x:kim',id:'kim'}}]};s.receipts.push(rec);
   const before=JSON.stringify({bought:w.bought,boughtAt:w.boughtAt||null,extras:w.extras});ReceiptList.apply(s,rec,w,start,end,null,{});
   const mid={bought:w.bought.chicken||null,kim:w.extras.find(e=>e.id==='kim').done};const ok=ReceiptList.undo(s,rec);
   // a record written by an earlier release keeps only the menu-week start; it is read through its Monday
   ReceiptList.apply(s,rec,w,start,end,null,{});delete rec.reconciled.weekKey;const ok2=ReceiptList.undo(s,rec);
   return{mid,ok,ok2,same:JSON.stringify({bought:w.bought,boughtAt:w.boughtAt||null,extras:w.extras})===before,rowBought:shopping(s,w,start,end).find(r=>r.id==='chicken').bought,allMonday:Object.keys(s.weeks).every(k=>monday(k)===k),valid:validImport(s)}})()`));
  assert.ok(r.mid.bought>0&&r.mid.kim===true,'the receipt marked the chicken and the Kimchi line bought '+JSON.stringify(r.mid));
  assert.ok(r.ok&&r.ok2,'undo ran');assert.ok(r.same,'undo restored the bought marks and the list line');assert.ok(!r.rowBought,'the row is not bought after undo');assert.ok(r.allMonday);assert.ok(r.valid)});

 check(`${label} start: planning “Nấu mỗi bữa” fills the days on screen, no hidden copy`,()=>{const run=make();
  const r=(run(`(()=>{const s=newHouseholdState();s.preferences.weekStartDay=${start};s.preferences.routine='daily';s.preferences.enabledMeals=['dinner'];const ps=planStartOf(s,'${TODAY}');
   familyGenerate(s,ps,{sourceMode:'library',random:()=>.3});const w=planWeek(s,ps);
   return{filled:Object.values(w.days).filter(d=>d.dinner.recipes.length).length,keys:Object.keys(s.weeks),allMonday:Object.keys(s.weeks).every(k=>monday(k)===k),valid:validImport(s)}})()`));
  assert.ok(r.allMonday,`no hidden copy ${JSON.stringify(r.keys)}`);assert.ok(r.filled>=5,`the shown dinners are planned (${r.filled})`);assert.ok(r.valid)});
}

check('hidden copies written by earlier releases are folded back (guests, leftovers, plans, list lines) and removed',()=>{const run=make();
 const r=(run(`(()=>{const s=newHouseholdState();s.preferences.weekStartDay=6;const sat='2026-11-07',mon='2026-11-09',thu='${TODAY}';
  const own=dayAt(s,thu);own.dinner.recipes=[clone(s.recipes[0])];own.lunch.recipes=[];
  // the copy an earlier release created with ensureWeek(state, Saturday): a guest, a served leftover, a planned lunch, a list line
  const g=ensureWeek(s,sat);g.days[thu].dinner.guests=[{name:'Cô Lan',adults:2,kids:0}];g.days[thu].dinner.recipes.push({...clone(s.recipes[1]),fromLeftover:true});
  g.days[thu].lunch.recipes=[clone(s.recipes[2])];g.extras.push({id:'ghost-extra',name:'Sữa',qty:'1',cost:0,costUnknown:true,currency:'AUD',done:false});
  const servedBefore=mealServings(dayAt(s,thu).dinner,s);const merged=mergeGhostWeeks(s);
  const d=dayAt(s,thu),again=mergeGhostWeeks(s);
  // a second device still holding the copy merges it again without doubling anything
  const s2=clone(s);const g2=ensureWeek(s2,sat);g2.days[thu].dinner.guests=[{name:'Cô Lan',adults:2,kids:0}];mergeGhostWeeks(s2);
  return{merged,again,keys:Object.keys(s.weeks),guests:d.dinner.guests,servings:[servedBefore,mealServings(d.dinner,s)],leftover:d.dinner.recipes.filter(x=>x.fromLeftover).length,lunch:d.lunch.recipes.map(x=>x.id),extra:planWeek(s,planStartOf(s,thu)).extras.some(e=>e.id==='ghost-extra'),guests2:dayAt(s2,thu).dinner.guests.length,mealAtOwn:mealAt(s,thu,'dinner')===d.dinner,valid:validImport(s)&&validImport(s2)}})()`));
 assert.equal(r.merged,1);assert.equal(r.again,0,'nothing left to merge');assert.ok(r.keys.every((k:string)=>run(`monday('${k}')`)===k),'only Monday keys remain');
 assert.deepEqual(r.guests,[{name:'Cô Lan',adults:2,kids:0}],'the guest the family entered is kept');assert.equal(r.servings[1],r.servings[0]+2,'and now counts in the portions');
 assert.equal(r.leftover,1,'the served leftover is kept');assert.equal(r.lunch.length,1,'a meal planned only in the copy is kept');assert.ok(r.extra,'a list line in the copy is kept');
 assert.equal(r.guests2,1,'merging the same guest again does not double it');assert.ok(r.mealAtOwn,'mealAt reads the Monday-keyed day');assert.ok(r.valid)});

check('the merge runs when a saved or synced state is loaded',()=>{const run=make();
 const r=(run(`(()=>{const s=newHouseholdState();s.preferences.weekStartDay=0;ensureWeek(s,'2026-11-08').days['2026-11-10'].dinner.guests=[{name:'Bạn',adults:1,kids:0}];
  upgradeReferenceCatalog(s);return{keys:Object.keys(s.weeks),g:dayAt(s,'2026-11-10').dinner.guests,valid:validImport(s)}})()`));
 assert.ok(!r.keys.includes('2026-11-08'));assert.equal(r.g.length,1);assert.ok(r.valid)});

console.log(`PASS week start (${n} checks)`);
