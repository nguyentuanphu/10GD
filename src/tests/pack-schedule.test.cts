// v1.7.5 owner request (5 Nov 2026): “Có lịch báo là trong tuần ngày nào mang đồ ăn trưa theo?”, a compact “Tuần này ai
// bận”, and “Chưa báo” counted like eating at home. Runs the real frontend scripts in a VM (no DOM).
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const c=vm.createContext({console,Intl,Date,Math,URL,structuredClone,crypto:require('node:crypto').webcrypto});
for(const f of ['seed.js','recipe-catalog.js','core.js','spending-core.js','purchase-units.js','planning-core.js','insights-core.js','family-menu-core.js','availability-core.js','personal-core.js'])vm.runInContext(fs.readFileSync('dist/'+f,'utf8'),c);
c.assert=assert;
vm.runInContext(`
const s=defaults();s.preferences.maxTime=120;const mon='2026-11-09',day=i=>addDays(mon,i);ensureWeek(s,mon);
const lunch=i=>s.weeks[mon].days[day(i)].lunch;
// ---- schedule: Chi (big) packs Mon–Fri, Tiên (little) Mon/Wed; the family chose “Ăn ở nhà” for little on Wednesday by hand
s.packSchedule={members:{big:[1,2,3,4,5],little:[1,3]}};assert.equal(validPackSchedule(s.packSchedule),true);
lunch(2).attendance.little='away';                                   // family's own choice for Wednesday
setAvailability(s,'big',[day(1)],['lunch'],{status:'away',deduct:true,remind:false,note:''});   // Chi away on Tuesday (calendar)
applyPackSchedule(s,mon,7);
assert.equal(lunch(0).attendance.big,'packed');assert.equal(lunch(0).attendance.little,'packed');assert.equal(lunch(0).attendance.dad,'home','others unchanged');
assert.notEqual(lunch(1).attendance.big,'packed','calendar absence wins over the schedule');
assert.equal(lunch(2).attendance.little,'away','the family’s own choice is never overwritten');
assert.equal(lunch(5).attendance.big,'home','no packed lunch on Saturday');
// ---- taking a day out only reverts what the schedule set
lunch(4).attendance.dad='packed';                                     // dad packs on Friday by hand
s.packSchedule.members.big=[1,2,3,4];applyPackSchedule(s,mon,7);
assert.equal(lunch(4).attendance.big,'home','Friday removed → back to home');assert.equal(lunch(4).attendance.dad,'packed','hand-set Mang đi kept');
assert.equal(validFamilyState(s),true,'schedule and autoPacked are valid state');
assert.equal(validPackSchedule({members:{big:[7]}}),false);assert.equal(validPackSchedule({members:{big:'mon'}}),false);
// ---- cooked meals are never changed
lunch(3).cooked=true;lunch(3).attendance.big='home';applyPackSchedule(s,mon,7);assert.equal(lunch(3).attendance.big,'home','cooked meal untouched');lunch(3).cooked=false;
// ---- summary line
assert.deepEqual(JSON.parse(JSON.stringify(packSummary(s,'vi').map(x=>[x.member.id,x.text]))),[['big','T2–T5'],['little','T2, T4']]);
assert.deepEqual(JSON.parse(JSON.stringify(packSummary(s,'en').map(x=>x.text))),['Mon–Thu','Mon, Wed']);
// ---- “Chưa báo” counts like eating at home
const m=lunch(5);for(const p of s.members)m.attendance[p.id]='home';const all=mealServings(m,s);m.attendance.mum='pending';assert.equal(mealServings(m,s),all,'pending is counted');m.attendance.mum='away';assert.ok(mealServings(m,s)<all,'away is not');
// ---- lunch-box dishes are cooked for the people packing only
const box={id:'f-box',name:'Cơm cuộn',category:'lunchbox',protein:'mixed',time:20,servings:4,yield:4,purposes:[],ingredients:[{id:'egg',qty:4}],missingIngredients:[],prep:'',steps:[],custom:true,origin:'family'};
const l0=lunch(0);l0.recipes=[structuredClone(box)];const big=s.members.find(p=>p.id==='big').weight,little=s.members.find(p=>p.id==='little').weight;
assert.equal(+mealIngredients(l0,s).egg.toFixed(3),+(4*(big+little)/4).toFixed(3),'eggs for Chi and Tiên only');
// ---- planner: lunch box on scheduled days even without the family-wide switch
s.recipes.push(box);familyGenerate(s,mon,{random:()=>.4,sourceMode:'own'});
assert.equal(lunch(0).recipes[0]?.id,'f-box');assert.equal(lunch(5).recipes.some(r=>r.category==='lunchbox'),false);
// ---- Tuần này ai bận: one line per person, date order, the date shown for a day in another week
const t=defaults();ensureWeek(t,'2026-11-02');ensureWeek(t,'2026-11-09');
setAvailability(t,'dad',['2026-11-05','2026-11-06','2026-11-11'],['lunch'],{status:'away',deduct:true,remind:false,note:''});
setAvailability(t,'little',['2026-11-06','2026-11-07'],['dinner'],{status:'away',deduct:true,remind:false,note:''});
const rows=familyPersonSummary(t,'2026-11-05','vi');
assert.deepEqual(rows.map(r=>[r.member.id,r.statusText,r.slotsText]),[['dad','vắng','trưa: T5, T6, T4 11/11'],['little','vắng','tối: T6, T7']]);
assert.equal(familyPersonSummary(t,'2026-11-05','en')[0].slotsText,'lunch: Thu, Fri, Wed 11/11');
// v1.7.9 (owner, 6 Nov 2026: "bận nhiều quá thì nhìn rối mắt… không báo được thời gian"): days with the same meals are
// written once; a reported time is part of the pattern; another week's day shows d/m without a leading zero
setAvailability(t,'big',['2026-11-06','2026-11-09','2026-11-11','2026-11-12'],['breakfast','lunch'],{status:'away',deduct:true,remind:false,note:''});
setAvailability(t,'big',['2026-11-12'],['lunch'],{status:'away',deduct:true,remind:false,note:'',from:'11:00',to:'14:00'});
assert.deepEqual(familyPersonSummary(t,'2026-11-05','vi',8).find(r=>r.member.id==='big').lines,['sáng + trưa: T6, T2 9/11, T4 11/11','sáng + trưa 11:00–14:00: T5 12/11']);
assert.equal(availabilityStatusLabel({status:'busy',deduct:false,from:'17:00',to:'19:30'},'vi'),'Bận 17:00–19:30 · vẫn nấu phần');
assert.equal(availabilityStatusLabel({status:'away',deduct:true,from:'17:00'},'en'),'Away from 17:00 · no portion');
assert.equal(validAvailabilityEntry({status:'busy',deduct:false,remind:false,note:'',from:'19:00',to:'17:00'}),false,'end after start');
assert.equal(validAvailabilityEntry({status:'busy',deduct:false,remind:false,note:'',from:'7pm'}),false,'HH:MM only');
assert.equal(validAvailabilityEntry({status:'busy',deduct:false,remind:false,note:'',to:'14:00'}),true,'until on its own');
setAvailability(t,'mum',['2026-11-05'],['snack'],{status:'busy',deduct:false,remind:false,note:''});
assert.equal(familyPersonSummary(t,'2026-11-05','vi').find(r=>r.member.id==='mum').slotsText,'phụ: T5','snack has a word');
console.log('PASS packed-lunch schedule (calendar and family choices win, removal reverts only its own), Chưa báo counted, lunch boxes for packers only, planner, one-line-per-person week summary');
`,c);
