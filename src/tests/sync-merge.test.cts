// v1.7.3 Automatic family sync merge (sync-merge-core): three-way merge of every collection, field-level last-writer-wins,
// deletes vs edits, recipe dual revisions, tombstones, menu reactions, idempotence/commutativity, stamping, migration and
// the client push/merge/retry loop. Runs the real frontend scripts in a VM (no DOM). Synthetic data only.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const c=vm.createContext({console,Intl,Date,Math,URL,structuredClone,crypto:require('node:crypto').webcrypto});
for(const f of ['store-registry.js','seed.js','recipe-catalog.js','core.js','spending-core.js','purchase-units.js','planning-core.js','insights-core.js','family-menu-core.js','availability-core.js','personal-core.js','menu-reactions-core.js','sync-merge-core.js'])vm.runInContext(fs.readFileSync('dist/'+f,'utf8'),c);
const run=(code:string)=>vm.runInContext(code,c);
let passed=0;const tests:[string,()=>any][]=[];const test=(name:string,fn:()=>any)=>tests.push([name,fn]);
// Base family: two custom recipes, a week with a shopping extra, pantry, receipts, members, preferences.
run(`globalThis.mk=()=>{const s=defaults();s.recipes=[];s.pantry=[];s.weeks={};
 s.recipes.push({...recipe('fam-ga','Gà kho gừng','main','chicken',20,{chicken:400,ginger:20},'prep',['Ướp gà','Kho 20 phút']),custom:true,favorite:false});
 s.recipes.push({...recipe('fam-canh','Canh bí','soup','pork',15,{pork:100},'prep',['Nấu']),custom:true,favorite:false});
 s.pantry.push({id:'p-egg',ingredient:'egg',qty:6,place:'fridge',expiry:''},{id:'p-rice',ingredient:'rice',qty:2000,place:'dry',expiry:''});
 s.receipts.push({id:'rc-1',date:'2026-11-01',store:'Chợ',total:12,items:[{id:'ri-1',label:'Trứng',total:5,quantity:null},{id:'ri-2',label:'Gạo',total:7,quantity:null}]});
 const w=ensureWeek(s,'2026-11-02');w.extras.push({id:'x-milk',name:'Sữa',qty:'1 l',cost:0,done:false});return s};
 globalThis.canon=x=>{const sort=v=>Array.isArray(v)?(v.every(e=>e&&typeof e==='object'&&'id' in e)?[...v].sort((a,b)=>String(a.id)<String(b.id)?-1:1):v).map(sort):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,sort(v[k])])):v;return JSON.stringify(sort(x))};
 globalThis.edit=(base,fn,now,by)=>{const s=clone(base);fn(s);syncStamp(base,s,{now,by});return s};`);
test('different collections edited on both devices: everything survives and the state stays valid',()=>run(`(()=>{const b=mk();
 const A=edit(b,s=>{s.recipes[0].favorite=true;s.pantry.push({id:'p-new',ingredient:'milk',qty:1000,place:'fridge',expiry:''});s.preferences.budget=200;s.members[0].name='Ba'},1000,'dad');
 const B=edit(b,s=>{s.weeks['2026-11-02'].extras.push({id:'x-bread',name:'Bánh mì',qty:'1',cost:0,done:false});s.receipts.push({id:'rc-2',date:'2026-11-02',store:'Coles',total:9,items:[]});s.recipes.push({...recipe('fam-new','Rau xào','veg','plant',10,{garlic:10},'p',['Xào']),custom:true});s.settings.reminders=true},2000,'mum');
 const r=mergeFamilyStates(b,A,B,{now:3000}),m=r.state;
 if(!m.recipes[0].favorite||!m.recipes.some(x=>x.id==='fam-new'))throw Error('recipes');if(!m.pantry.some(p=>p.id==='p-new'))throw Error('pantry');
 if(m.preferences.budget!==200||m.members[0].name!=='Ba'||m.settings.reminders!==true)throw Error('prefs/members/settings');
 if(m.weeks['2026-11-02'].extras.map(x=>x.id).join()!=='x-milk,x-bread')throw Error('extras '+m.weeks['2026-11-02'].extras.map(x=>x.id));
 if(!m.receipts.some(x=>x.id==='rc-2'))throw Error('receipts');if(r.conflicts.length||r.notes.length)throw Error('no conflicts');
 if(!validImport(clone(m)))throw Error('merged state valid');if(m.updatedAt!==2000||m.updatedBy!=='mum')throw Error('root stamp max')})()`));
test('shopping item checked on one device and renamed on the other: both applied',()=>run(`(()=>{const b=mk();
 const A=edit(b,s=>{s.weeks['2026-11-02'].extras[0].done=true},1000,'dad'),B=edit(b,s=>{s.weeks['2026-11-02'].extras[0].name='Sữa tươi'},2000,'mum');
 for(const m of [mergeFamilyStates(b,A,B).state,mergeFamilyStates(b,B,A).state]){const x=m.weeks['2026-11-02'].extras[0];if(x.done!==true||x.name!=='Sữa tươi')throw Error(JSON.stringify(x));if(x.updatedAt!==2000)throw Error('item stamp')}
 const A2=edit(b,s=>{s.weeks['2026-11-02'].bought={egg:true}},1000,'dad'),B2=edit(b,s=>{s.weeks['2026-11-02'].bought={rice:true}},1100,'mum');
 const bt=mergeFamilyStates(b,A2,B2).state.weeks['2026-11-02'].bought;if(!bt.egg||!bt.rice)throw Error('bought flags from both devices '+JSON.stringify(bt))})()`));
test('same field changed differently: newer updatedAt wins; equal changes agree; ties are deterministic',()=>run(`(()=>{const b=mk();
 const A=edit(b,s=>{s.pantry[0].qty=4},5000,'dad'),B=edit(b,s=>{s.pantry[0].qty=2},3000,'mum');
 let m=mergeFamilyStates(b,A,B).state;if(m.pantry[0].qty!==4||m.pantry[0].updatedBy!=='dad')throw Error('newer wins');
 m=mergeFamilyStates(b,B,A).state;if(m.pantry[0].qty!==4||m.pantry[0].updatedBy!=='dad')throw Error('newer wins (swapped)');
 const S=edit(b,s=>{s.pantry[0].qty=3},4000,'mum'),T=edit(b,s=>{s.pantry[0].qty=3},4500,'dad');const r=mergeFamilyStates(b,S,T);if(r.state.pantry[0].qty!==3||r.conflicts.length)throw Error('same value');
 const P=edit(b,s=>{s.preferences.budget=150},7000,'dad'),Q=edit(b,s=>{s.preferences.budget=190},7000,'mum');
 if(mergeFamilyStates(b,P,Q).state.preferences.budget!==mergeFamilyStates(b,Q,P).state.preferences.budget)throw Error('tie deterministic')})()`));
test('meals: dishes on one device, attendance on the other both apply; both changing dishes → newer meal wins',()=>run(`(()=>{const b=mk(),d='2026-11-03';
 const A=edit(b,s=>{s.weeks['2026-11-02'].days[d].dinner.recipes=[clone(s.recipes[0])]},1000,'dad'),B=edit(b,s=>{s.weeks['2026-11-02'].days[d].dinner.attendance.little='away'},2000,'mum');
 let m=mergeFamilyStates(b,A,B).state.weeks['2026-11-02'].days[d].dinner;if(m.recipes.map(r=>r.id).join()!=='fam-ga'||m.attendance.little!=='away')throw Error('meal fields');
 const C=edit(b,s=>{s.weeks['2026-11-02'].days[d].dinner.recipes=[clone(s.recipes[1])]},3000,'mum');
 m=mergeFamilyStates(b,A,C).state.weeks['2026-11-02'].days[d].dinner;if(m.recipes.map(r=>r.id).join()!=='fam-canh')throw Error('newer dish choice wins, not a mix '+m.recipes.map(r=>r.id))})()`));
test('deleted on one device, edited on the other: kept (edited) with a note; unchanged + deleted → deleted',()=>run(`(()=>{const b=mk();
 const A=edit(b,s=>{s.pantry=s.pantry.filter(p=>p.id!=='p-egg');s.weeks['2026-11-02'].extras=[];s.receipts[0].items.splice(1,1)},1000,'dad');
 if(!A.syncTombstones['pantry/p-egg']||!A.syncTombstones['weeks/2026-11-02/extras/x-milk']||!A.syncTombstones['receipts/rc-1/items/ri-2'])throw Error('tombstones '+JSON.stringify(A.syncTombstones));
 const B=edit(b,s=>{s.pantry[0].qty=12},2000,'mum');
 const r=mergeFamilyStates(b,A,B,{now:3000});if(r.state.pantry.find(p=>p.id==='p-egg')?.qty!==12)throw Error('edited item kept');
 if(!r.notes.some(n=>n.type==='kept-edited'&&n.path==='pantry/p-egg'))throw Error('note');
 if(r.state.syncTombstones?.['pantry/p-egg'])throw Error('tombstone of a kept item is dropped');
 if(r.state.weeks['2026-11-02'].extras.length)throw Error('unchanged + deleted → deleted');if(r.state.receipts[0].items.length!==1)throw Error('nested delete');
 if(!r.state.syncTombstones['weeks/2026-11-02/extras/x-milk'])throw Error('tombstone kept for a real delete')})()`));
test('family recipe content edited on both devices: newer stays, the other is kept as an open revision (never discarded)',()=>run(`(()=>{const b=mk();
 const A=edit(b,s=>{s.recipes[0].name='Gà kho gừng (bà nội)';s.recipes[0].steps=['Ướp gà 30 phút','Kho lửa nhỏ']},1000,'dad');
 const B=edit(b,s=>{s.recipes[0].name='Gà kho gừng mới';s.recipes[0].favorite=true},2000,'mum');
 const r=mergeFamilyStates(b,A,B,{now:3000}),g=r.state.recipes[0];
 if(g.name!=='Gà kho gừng mới')throw Error('newer name wins '+g.name);if(JSON.stringify(g.steps)!=='["Ướp gà 30 phút","Kho lửa nhỏ"]')throw Error('steps changed only on one side still apply');if(!g.favorite)throw Error('non-content field');
 if(r.conflicts.length!==1||r.conflicts[0].recipeId!=='fam-ga'||r.conflicts[0].fields.join()!=='name')throw Error('conflict report '+JSON.stringify(r.conflicts));
 const rev=r.state.recipeRevisions[0];if(!rev.open||rev.recipeId!=='fam-ga'||rev.name!=='Gà kho gừng (bà nội)'||rev.by!=='dad'||rev.editedAt!==1000)throw Error('revision '+JSON.stringify(rev));
 if(JSON.stringify(rev.ingredients)!==JSON.stringify(A.recipes[0].ingredients)||JSON.stringify(rev.steps)!==JSON.stringify(A.recipes[0].steps))throw Error('the other version is kept exactly (no invented quantities)');
 const r2=mergeFamilyStates(b,B,A,{now:3000});if(r2.state.recipes[0].name!==g.name||r2.state.recipeRevisions[0].id!==rev.id)throw Error('commutative revision id');
 const again=mergeFamilyStates(b,r.state,B,{now:4000});if(again.state.recipeRevisions.length!==1)throw Error('idempotent: no duplicate revision');
 if(!validImport(clone(r.state)))throw Error('valid with revisions')})()`));
test('idempotence and commutativity of the whole merge',()=>run(`(()=>{const b=mk();
 const A=edit(b,s=>{s.recipes[0].favorite=true;s.pantry[1].qty=1500;s.activity.unshift({text:'A',at:'2026-11-02T01:00:00Z'});s.deletedRecipeIds=['r1']},1000,'dad');
 const B=edit(b,s=>{s.pantry[1].qty=1800;s.pantry.push({id:'p-b',ingredient:'milk',qty:1,place:'fridge',expiry:''});s.activity.unshift({text:'B',at:'2026-11-02T02:00:00Z'});s.deletedRecipeIds=['r2'];s.recipes[1].name='Canh bí đỏ'},2000,'mum');
 const ab=mergeFamilyStates(b,A,B,{now:9}).state,ba=mergeFamilyStates(b,B,A,{now:9}).state;if(canon(ab)!==canon({...ba,activity:ab.activity,deletedRecipeIds:ab.deletedRecipeIds})||[...ab.deletedRecipeIds].sort().join()!==[...ba.deletedRecipeIds].sort().join()||canon([...ab.activity].sort((x,y)=>x.at<y.at?-1:1))!==canon([...ba.activity].sort((x,y)=>x.at<y.at?-1:1)))throw Error('commutative (lists equal as sets)');
 if(ab.activity.length!==2||ab.deletedRecipeIds.sort().join()!=='r1,r2')throw Error('lists merge as sets '+JSON.stringify([ab.activity,ab.deletedRecipeIds]));
 if(canon(mergeFamilyStates(b,ab,ab,{now:9}).state)!==canon(ab))throw Error('merge(x,x)=x');
 if(canon(mergeFamilyStates(b,ab,B,{now:9}).state)!==canon(ab)||canon(mergeFamilyStates(b,ab,A,{now:9}).state)!==canon(ab))throw Error('re-merging a side is a no-op');
 if(mergeFamilyStates(b,ab,ab).changedLocal)throw Error('no change reported')})()`));
test('no base copy: nothing present on either side is dropped unless tombstoned after its last edit',()=>run(`(()=>{const b=mk();
 const A=edit(b,s=>{s.pantry=s.pantry.filter(p=>p.id!=='p-egg');s.recipes.push({...recipe('fam-a','Món A','main','pork',10,{pork:100},'p',['x']),custom:true})},5000,'dad');
 const B=edit(b,s=>{s.receipts.push({id:'rc-b',date:'2026-11-03',store:'Aldi',total:3,items:[]})},2000,'mum');
 let m=mergeFamilyStates(null,A,B,{now:9000}).state;if(m.pantry.some(p=>p.id==='p-egg'))throw Error('tombstone newer than the copy → deleted');if(!m.recipes.some(r=>r.id==='fam-a')||!m.receipts.some(r=>r.id==='rc-b'))throw Error('union');
 const C=edit(b,s=>{s.pantry[0].qty=9},8000,'mum');m=mergeFamilyStates(null,A,C,{now:9000}).state;if(m.pantry.find(p=>p.id==='p-egg')?.qty!==9)throw Error('edited after the delete → kept')})()`));
test('menu reactions merge per member+dish inside the family merge',()=>run(`(()=>{const b=mk(),r=b.recipes[0];
 const A=clone(b);toggleMenuReaction(A,'dad',r,'like',{date:'2026-11-02',at:100});syncStamp(b,A,{now:100,by:'dad'});
 const B=clone(b);toggleMenuReaction(B,'mum',r,'dislike',{date:'2026-11-02',at:200});syncStamp(b,B,{now:200,by:'mum'});
 const m=mergeFamilyStates(b,A,B).state;if(m.menuReactions['dad|fam-ga'].v!=='like'||m.menuReactions['mum|fam-ga'].v!=='dislike')throw Error('reactions')})()`));
test('stamping: only changed items get updatedAt/updatedBy; re-adding clears a tombstone; unstamped (older) states are a baseline',()=>run(`(()=>{const b=mk();
 if(b.recipes[0].updatedAt!==undefined||b.updatedAt!==undefined)throw Error('baseline has no stamps');
 const s=clone(b);s.recipes[1].name='Canh';const n=syncStamp(b,s,{now:42,by:'dad'});
 if(s.recipes[1].updatedAt!==42||s.recipes[1].updatedBy!=='dad'||s.recipes[0].updatedAt!==undefined||s.pantry[0].updatedAt!==undefined)throw Error('only the changed item');if(s.updatedAt!==42||!(n>=2))throw Error('root');
 if(syncStamp(clone(s),s,{now:50})!==0||s.recipes[1].updatedAt!==42)throw Error('no change → no stamp');
 const t=clone(s);t.pantry.shift();syncStamp(s,t,{now:60});if(!t.syncTombstones['pantry/p-egg'])throw Error('tombstone');
 const u=clone(t);u.pantry.unshift({id:'p-egg',ingredient:'egg',qty:1,place:'fridge',expiry:''});syncStamp(t,u,{now:70});if(u.syncTombstones?.['pantry/p-egg'])throw Error('re-added clears tombstone');
 const old=mk(),other=edit(old,x=>{x.pantry[0].qty=1},10,'mum');const local=clone(old);local.recipes[0].favorite=true;// device on an older edition, never stamped
 const m=mergeFamilyStates(old,local,other).state;if(m.pantry[0].qty!==1||!m.recipes[0].favorite)throw Error('unstamped edits still merge field by field')})()`));
test('tombstones are pruned by age and capped',()=>run(`(()=>{const now=Date.UTC(2026,10,2),old=now-200*86400000;const a={version:1,syncTombstones:{'pantry/a':old,'pantry/b':now}};const m=mergeFamilyStates(null,a,{version:1,syncTombstones:{'pantry/c':now-1}},{now}).state;
 if(m.syncTombstones['pantry/a']||!m.syncTombstones['pantry/b']||!m.syncTombstones['pantry/c'])throw Error(JSON.stringify(m.syncTombstones))})()`));
// ---- client push loop: 409 → merge → retry, bounded, with jitter
const loop=(code:string)=>run(code);
test('push loop: a stale write is merged with the stored copy and retried; no dialog',async()=>{await loop(`(async()=>{const b=mk();globalThis.server={etag:'e1',state:edit(b,s=>{s.pantry[0].qty=1},2000,'mum'),puts:0};
 let local=edit(b,s=>{s.recipes[0].favorite=true},1000,'dad'),base=clone(b),etag='e0',sleeps=[];
 const out=await syncPushLoop({local:()=>local,etag:()=>etag,base:()=>base,put:async body=>{server.puts++;if(body.sync!==2)throw Error('sync flag');if(body.etag!==server.etag)return{status:409,data:{reason:'stale',state:clone(server.state),etag:server.etag}};server.state=clone(body.state);server.etag='e'+(server.puts+1);server.merge=body.merge;return{status:200,data:{etag:server.etag}}},
  fetchRemote:async()=>{throw Error('state came with the 409')},apply:({state,etag:e,remote})=>{local=state;etag=e;base=remote},synced:({etag:e,sent})=>{etag=e;base=sent},sleep:async ms=>{sleeps.push(ms)},random:()=>0.5});
 if(!out.ok||out.merged!==1||out.attempts!==2||server.puts!==2)throw Error(JSON.stringify(out));if(!server.state.recipes[0].favorite||server.state.pantry[0].qty!==1)throw Error('both changes stored');
 if(!server.merge?.merged||sleeps.length!==1||sleeps[0]!==190)throw Error('merge report / jitter '+JSON.stringify([server.merge,sleeps]))})()`)});
test('push loop: bounded retries when another device keeps writing; would_drop → union retry; newer edition stops',async()=>{await loop(`(async()=>{const b=mk();let local=edit(b,s=>{s.recipes[0].favorite=true},1000,'dad'),etag='e0',base=clone(b),n=0,sleeps=[];
 const deps={local:()=>local,etag:()=>etag,base:()=>base,put:async()=>{n++;return{status:409,data:{state:edit(b,s=>{s.pantry[0].qty=n},2000+n,'mum'),etag:'busy'+n}}},fetchRemote:async()=>null,apply:({state,etag:e,remote})=>{local=state;etag=e;base=remote},synced:()=>{},sleep:async ms=>{sleeps.push(ms)},random:()=>1,maxAttempts:4};
 const out=await syncPushLoop(deps);if(out.ok||out.reason!=='retries'||n!==4||out.merged!==4||sleeps.join()!=='300,600,900')throw Error(JSON.stringify([out,n,sleeps]));if(!local.recipes[0].favorite)throw Error('local change kept through retries');
 // Guard refusal: merge again without a base (union), then succeed.
 let calls=0,bases=[];local=edit(b,s=>{s.recipes[0].favorite=true},1000,'dad');etag='e0';
 const stored=edit(b,s=>{s.pantry.push({id:'p-other',ingredient:'milk',qty:1,place:'fridge',expiry:''})},1500,'mum');
 const out2=await syncPushLoop({...deps,base:()=>{bases.push('base');return clone(b)},put:async body=>{calls++;if(calls===1)return{status:409,data:{reason:'would_drop',state:stored,etag:'s1'}};if(!body.state.pantry.some(p=>p.id==='p-other'))return{status:409,data:{reason:'would_drop',state:stored,etag:'s1'}};return{status:200,data:{etag:'s2'}}}});
 if(!out2.ok||calls!==2)throw Error('would_drop retry '+JSON.stringify(out2));
 const out3=await syncPushLoop({...deps,blocked:r=>r.state.appEdition>APP_EDITION,put:async()=>({status:409,data:{state:{...clone(b),appEdition:APP_EDITION+1},etag:'x'}})});if(out3.ok||out3.reason!=='blocked')throw Error('newer edition is the one blocking case')})()`)});
// v1.7.16 (owner, 8 Nov 2026: “vào xoá mà nó vẫn báo là có khách”): a meal's guest groups merge as one value, so guests removed on
// one device are not brought back by a change to the same group on another device (the newer meal wins)
test('meal guests: removed on one device while changed on another → the newer change wins, no resurrection',()=>run(`(()=>{const b=mk(),d='2026-11-03';
 const g={name:'Tesr',adults:1,kids:0,invite:{id:'inv-tesr0001',token:'k7m4p9',deadline:'2026-11-09T10:00:00Z',expiresAt:'2026-11-12T12:00:00Z'}};
 const base=edit(b,s=>{s.weeks['2026-11-02'].days[d].dinner.guests=[clone(g)]},500,'dad');
 const A=edit(base,s=>{delete s.weeks['2026-11-02'].days[d].dinner.guests},2000,'dad'),B=edit(base,s=>{s.weeks['2026-11-02'].days[d].dinner.guests[0].rsvp={status:'maybe',at:'2026-11-08T09:00:00Z'}},1000,'mum');
 for(const m of [mergeFamilyStates(base,A,B).state,mergeFamilyStates(base,B,A).state]){const x=m.weeks['2026-11-02'].days[d].dinner;if(x.guests&&x.guests.length)throw Error('removed guests came back '+JSON.stringify(x.guests))}
 const C=edit(base,s=>{s.weeks['2026-11-02'].days[d].dinner.guests[0].adults=3},3000,'mum');
 const m2=mergeFamilyStates(base,A,C).state.weeks['2026-11-02'].days[d].dinner;if(!m2.guests||m2.guests.length!==1||m2.guests[0].adults!==3)throw Error('a newer edit keeps the group whole '+JSON.stringify(m2.guests))})()`));
(async()=>{for(const[name,fn] of tests){try{await fn();passed++}catch(e){console.error('FAIL',name);throw e}}console.log(`PASS sync-merge: ${passed} tests (three-way merge per collection/field, deletes vs edits, recipe revisions, tombstones, reactions, stamping, push loop)`)})().catch(e=>{console.error(e);process.exit(1)});
