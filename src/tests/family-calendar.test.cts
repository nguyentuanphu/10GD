// v1.7.3 family calendar: availability-core helpers (status/portion label, entry validation with and without `by`,
// short member names, day list, 7-day family summary) and the sync merge of availability entries (one entry = one item).
// Runs the real frontend scripts in a VM (no DOM). Synthetic family: 3 adults, 2 children.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const c=vm.createContext({console,Intl,Date,Math,URL,structuredClone,crypto:require('node:crypto').webcrypto});
for(const f of ['store-registry.js','seed.js','recipe-catalog.js','core.js','spending-core.js','purchase-units.js','planning-core.js','insights-core.js','family-menu-core.js','availability-core.js','personal-core.js','menu-reactions-core.js','sync-merge-core.js'])vm.runInContext(fs.readFileSync('dist/'+f,'utf8'),c);
const run=(code:string)=>vm.runInContext(code,c),J=(code:string)=>JSON.parse(JSON.stringify(run(code)));let passed=0;const ok=(n:string)=>{passed++;console.log('✓',n)};
run(`globalThis.fam=()=>{const s=defaults();s.weeks={};s.pantry=[];s.members=[{id:'dad',name:'Bố',weight:1},{id:'mum',name:'Mẹ',weight:1},{id:'ti',name:'Cậu Tí',weight:1},{id:'big',name:'Bé lớn',weight:.65},{id:'little',name:'Bé nhỏ',weight:.5}].map(m=>({...m,emoji:'🙂'}));return s}`);

// Labels follow the entry's own deduct flag.
assert.equal(run(`availabilityStatusLabel({status:'busy',deduct:false},'vi')`),'Bận · vẫn nấu phần');
assert.equal(run(`availabilityStatusLabel({status:'busy',deduct:true},'vi')`),'Bận · không nấu phần');
assert.equal(run(`availabilityStatusLabel({status:'away',deduct:true},'vi')`),'Vắng · không nấu phần');
assert.equal(run(`availabilityStatusLabel({status:'away',deduct:false},'en')`),'Away · still cooking their portion');
assert.equal(run(`availabilityStatusLabel({status:'busy',deduct:false},'en')`),'Busy · still cooking their portion');
assert.equal(run(`availabilityStatusLabel({status:'away',deduct:true},'en')`),'Away · no portion');
assert.equal(run(`availabilityNoPortion({status:'busy',deduct:true})`),true);assert.equal(run(`availabilityNoPortion({status:'busy',deduct:false})`),false);
ok('status label derived from deduct (busy with deduct=true says no portion), VI and EN');

// Validation: older entries without `by` stay valid; `by` must be a short string naming a family member when saving.
assert.equal(run(`validAvailabilityEntry({status:'busy',deduct:false,remind:true,note:''})`),true);
assert.equal(run(`validAvailabilityEntry({status:'busy',deduct:false,remind:true,note:'',by:'mum'})`),true);
assert.equal(run(`validAvailabilityEntry({status:'busy',deduct:false,remind:true,note:'',by:''})`),false);
assert.equal(run(`validAvailabilityEntry({status:'busy',deduct:false,remind:true,note:'',by:7})`),false);
assert.equal(run(`validAvailabilityEntry({status:'busy',deduct:false,remind:true,note:'',updatedAt:5,updatedBy:'x'})`),true,'sync stamps allowed');
run(`(()=>{const s=fam();setAvailability(s,'little',['2026-11-04'],['dinner'],{status:'away',deduct:true,remind:true,note:'Ngủ nhà bà',by:'mum'});
 setAvailability(s,'dad',['2026-11-04'],['lunch'],{status:'busy',deduct:false,remind:false,note:''});
 if(s.availability.little['2026-11-04'].dinner.by!=='mum')throw Error('by stored');if('by' in s.availability.dad['2026-11-04'].lunch)throw Error('no by added');
 if(!validImport(s))throw Error('state with and without by is valid');
 let threw=false;try{setAvailability(s,'little',['2026-11-05'],['dinner'],{status:'away',deduct:true,remind:true,note:'',by:'stranger'})}catch{threw=true}if(!threw)throw Error('unknown reporter rejected');
 s.availability.little['2026-11-04'].dinner.by=42;if(validImport(s))throw Error('invalid by rejected')})()`);
ok('validation with and without `by`; unknown reporter rejected; existing entries untouched');

// Short names for small cells are unique.
assert.deepEqual(J(`memberShortNames(fam().members)`),{dad:'B',mum:'M',ti:'CT',big:'BL',little:'BN'});
assert.deepEqual(Object.values(run(`memberShortNames([{id:'a',name:'Bố'},{id:'b',name:'Bà'},{id:'c',name:'Bố'},{id:'d',name:'Bố'}])`)),['B','Bà','Bố','Bố2']);
ok('unique short member names');

// Day list and 7-day family summary.
run(`globalThis.S=fam();setAvailability(S,'ti',['2026-11-04'],['dinner'],{status:'busy',deduct:false,remind:true,note:'Cầu lông',by:'ti'});
 setAvailability(S,'mum',['2026-11-06'],['lunch'],{status:'away',deduct:true,remind:true,note:''});setAvailability(S,'dad',['2026-11-06'],['lunch'],{status:'away',deduct:true,remind:true,note:''});
 setAvailability(S,'big',['2026-11-04'],['breakfast'],{status:'away',deduct:true,remind:true,note:'',by:'mum'});
 setAvailability(S,'dad',['2026-11-20'],['dinner'],{status:'busy',deduct:false,remind:true,note:''});setAvailability(S,'dad',['2026-11-01'],['dinner'],{status:'busy',deduct:false,remind:true,note:''});`);
assert.deepEqual(J(`availabilityDay(S,'2026-11-04').map(r=>r.member.id+':'+r.type)`),['ti:dinner','big:breakfast'],'family order, all members');
assert.deepEqual(J(`familyAvailabilityRange(S,'2026-11-02').map(r=>r.date+':'+r.type+':'+r.member.id)`),['2026-11-04:breakfast:big','2026-11-04:dinner:ti','2026-11-06:lunch:dad','2026-11-06:lunch:mum'],'next 7 days only, by date then meal');
assert.deepEqual(J(`familyWeekSummary(S,'2026-11-02','vi').map(g=>g.text)`),['T4 sáng: Bé lớn vắng','T4 tối: Cậu Tí bận','T6 trưa: Bố, Mẹ vắng']);
assert.deepEqual(J(`familyWeekSummary(S,'2026-11-02','en').map(g=>g.text)`),['Wed breakfast: Bé lớn away','Wed dinner: Cậu Tí busy','Fri lunch: Bố, Mẹ away']);
assert.equal(run(`familyWeekSummary(S,'2026-11-07','vi').length`),0,'nothing in range → empty (card hidden)');
assert.equal(run(`availabilityWeekday('2026-11-08','vi')+availabilityWeekday('2026-11-08','en')`),'CNSun');
ok('day list, next-7-days summary (VI/EN), empty when nothing');

// Sync merge: an availability entry merges whole (newest save wins) — never a mix of two devices' fields; other
// members' entries from both devices survive; a clear on one device and no change on the other stays cleared.
run(`(()=>{const base=fam();setAvailability(base,'ti',['2026-11-04'],['dinner'],{status:'busy',deduct:false,remind:true,note:'cũ',by:'ti'});
 const edit=(fn,now,by)=>{const s=clone(base);fn(s);syncStamp(base,s,{now,by});return s};
 const A=edit(s=>{s.availability.ti['2026-11-04'].dinner={status:'away',deduct:true,remind:true,note:'A',by:'ti'};setAvailability(s,'mum',['2026-11-05'],['lunch'],{status:'away',deduct:true,remind:true,note:'',by:'mum'})},1000,'ti');
 const B=edit(s=>{s.availability.ti['2026-11-04'].dinner.note='B';s.availability.ti['2026-11-04'].dinner.by='mum';setAvailability(s,'little',['2026-11-05'],['dinner'],{status:'away',deduct:true,remind:true,note:'',by:'mum'})},2000,'mum');
 if(!Number.isFinite(A.availability.ti['2026-11-04'].dinner.updatedAt))throw Error('entries are stamped items');
 for(const [l,r] of [[A,B],[B,A]]){const m=mergeFamilyStates(base,l,r,{now:3000}).state,e=m.availability.ti['2026-11-04'].dinner;
  if(e.status!=='busy'||e.note!=='B'||e.by!=='mum'||e.deduct!==false)throw Error('newest whole entry wins: '+JSON.stringify(e));
  if(!m.availability.mum?.['2026-11-05']?.lunch||!m.availability.little?.['2026-11-05']?.dinner)throw Error('both devices keep their other entries');
  if(!validImport(m))throw Error('merged state valid')}
 const C=edit(s=>{delete s.availability.ti['2026-11-04']},1500,'ti');const m2=mergeFamilyStates(base,C,clone(base),{now:3000}).state;if(m2.availability.ti?.['2026-11-04']?.dinner)throw Error('clear survives merge');
 const legacy=clone(base);delete legacy.availability.ti['2026-11-04'].dinner.by;if(!validImport(legacy))throw Error('legacy entry valid after merge code')})()`);
ok('sync merge: whole-entry last writer wins, both devices keep other entries, clears survive');
console.log(`Family calendar core tests passed (${passed}).`);
