// Studio speed: index correctness vs a full scan, cache invalidation after admin mutations,
// server-side pagination, log filters (tagged and legacy keys), per-day aggregates, read-ahead
// equivalence, rate limit still enforced on reads, probe timeout and request-count budgets.
// Real handlers, in-memory stores, synthetic data only.
import assert from 'node:assert/strict';
import {createStudioHandler} from '../netlify/functions/studio.mjs';
import {collectAccounts,buildIndex,readIndex,listLog,dailyLog,countLog,recordEvent,studioStore,readAheadStores,storageProbe,maskEmail,mapLimit,resetSettingsCache,logTag} from '../netlify/lib/studio.mjs';
import {moderationData,rewardsAdmin,productAdmin} from '../netlify/lib/community-prices.mjs';
import {memoryStores} from './helpers/accounts.mjs';
import {instrumentedStores,seedStudioLoad} from './helpers/studio-load.mjs';

const DAY=86400000,now=Date.now(),password='synthetic-bench-pass-42';
const inst=instrumentedStores(memoryStores());const getStoreFn=inst.getStoreFn;
inst.pause();const {cookie,families,people}=await seedStudioLoad(getStoreFn,{now,password,events:400});inst.resume();
const env:any={STUDIO_ADMINS:'henrynguyen'};
let clock=now;const studio=createStudioHandler({getStoreFn,env,nowFn:()=>clock,mailer:{configured:()=>false,async send(){}},limits:{all:10000,mutate:10000}});
const origin='https://bench.example';
const S=async(op:string,o:any={})=>{const r=await studio(new Request(`${origin}/.netlify/functions/studio?op=${op}`,{method:o.method||'GET',headers:{Cookie:cookie,Origin:origin,...(o.csrf?{'x-studio-csrf':o.csrf}:{}),...(o.body?{'Content-Type':'application/json'}:{})},...(o.body?{body:JSON.stringify(o.body)}:{})}));return{status:r.status,body:await r.json().catch(()=>null)}};
const me=(await S('me')).body;assert.equal(me.role,'owner');const P=(op:string,body:any)=>S(op,{method:'POST',csrf:me.csrf,body});
const pass=(m:string)=>console.log('PASS '+m);

// ---- 1. index matches a full scan (the pre-index computation of the accounts list)
{const scan=await collectAccounts(getStoreFn,now),ix=await buildIndex(getStoreFn,now);
 const seen=new Map<string,number>(),count=new Map<string,number>();for(const s of scan.sessions)if(s.started<=now)seen.set(s.username,Math.max(seen.get(s.username)||0,s.started));for(const s of scan.live)count.set(s.username,(count.get(s.username)||0)+1);
 const expected=scan.users.map((u:any)=>({username:u.username,name:u.name,email:maskEmail(u.email),hasEmail:!!u.email,verified:!!u.emailVerifiedAt,createdAt:u.createdAt||null,lastSeen:seen.get(u.username)?new Date(seen.get(u.username)!).toISOString():null,families:scan.families.filter((f:any)=>f.members?.[u.username]).map((f:any)=>({id:f.id,name:f.name,role:f.members[u.username].role})),sessions:count.get(u.username)||0,status:u.disabled?'disabled':'active'}));
 assert.deepEqual(ix.accounts.rows.map(({liveSessions,...r}:any)=>r),expected,'account index = full scan');
 assert.deepEqual(ix.accounts.rows.map((r:any)=>r.liveSessions.length),expected.map((r:any)=>r.sessions));
 assert.equal(ix.families.rows.length,scan.families.length);
 for(const f of scan.families){const r=ix.families.rows.find((x:any)=>x.id===f.id);assert.equal(r.name,f.name);assert.deepEqual(r.members.map((m:any)=>m.username).sort(),Object.keys(f.members).sort());assert.equal(r.invites.length,Object.keys(f.invites||{}).length)}
 const stored=JSON.stringify([await studioStore(getStoreFn).get('index/accounts.json'),await studioStore(getStoreFn).get('index/families.json')]);
 for(const secret of ['SECRETCODE','"salt"','"epoch"','recoveryHash','@example.com','sessions/','ENDPOINT','PRIVATEKEY',...Object.keys(families[3].invites)])assert.ok(!stored.includes(secret),'index leaks '+secret);
 const again=await readIndex(getStoreFn,{now:now+1000});assert.equal(again.cached,true);const later=await readIndex(getStoreFn,{now:now+61000});assert.equal(later.cached,false,'60 s TTL');
 pass('index matches full scan, holds no secrets, 60 s TTL')}

// ---- 2. pagination (server-side, 25 rows) and only table fields
{const pages=[1,2,3].map(p=>S(`accounts&sort=username&dir=asc&size=25&page=${p}`));const [a,b,c]=(await Promise.all(pages)).map(x=>x.body);
 assert.equal(a.total,50);assert.equal(a.rows.length,25);assert.equal(b.rows.length,25);assert.equal(c.rows.length,0);
 const names=[...a.rows,...b.rows].map((r:any)=>r.username);assert.equal(new Set(names).size,50);assert.deepEqual(names,[...names].sort());
 assert.ok(a.rows.every((r:any)=>!('liveSessions' in r)),'list rows carry only table fields');
 const f1=(await S('families&size=5&page=1')).body,f4=(await S('families&size=5&page=4')).body;assert.equal(f1.total,20);assert.equal(f1.rows.length,5);assert.equal(f4.rows.length,5);assert.ok(!f1.rows.some((r:any)=>f4.rows.find((x:any)=>x.id===r.id)));
 pass('accounts/families paginate server-side')}

// ---- 3. cache invalidation: admin mutations are visible at once; outside changes after Refresh or 60 s
{const u=people[10];assert.equal((await S('accounts&q='+u)).body.rows[0].status,'active');
 assert.equal((await P('account-disable',{username:u,reason:'speed test'})).status,200);
 assert.equal((await S('accounts&q='+u)).body.rows[0].status,'disabled','disable reflected immediately');
 assert.equal((await S('accounts&status=disabled')).body.rows.some((r:any)=>r.username===u),true);
 assert.equal((await P('account-enable',{username:u,reason:'speed test'})).status,200);assert.equal((await S('accounts&q='+u)).body.rows[0].status,'active');
 const fam=families[4];assert.equal((await P('family-suspend',{id:fam.id,reason:'speed test'})).status,200);assert.equal((await S('families&q='+encodeURIComponent(fam.name))).body.rows.find((r:any)=>r.id===fam.id).suspended,true,'suspend reflected');
 await P('family-suspend',{id:fam.id,reason:'speed test',suspended:false});await S('accounts');
 // A sign-up outside Studio: not in the cached index until Refresh (fresh=1) or the TTL ends.
 await getStoreFn({name:'bep-accounts'}).setJSON('users/newcomer',{username:'newcomer',name:'New',createdAt:new Date(now).toISOString(),epoch:'x'});
 assert.equal((await S('accounts&q=newcomer')).body.total,0,'served from the 60 s index');
 assert.equal((await S('accounts&q=newcomer&fresh=1')).body.total,1,'Refresh rebuilds');
 await getStoreFn({name:'bep-accounts'}).delete('users/newcomer');clock=now+61000;assert.equal((await S('accounts&q=newcomer')).body.total,0,'TTL rebuild');clock=now;
 pass('mutations invalidate the index; Refresh and TTL pick up outside changes')}

// ---- 4. log filters: tagged keys skip non-matching reads; legacy keys still read; same result as a naive scan
{const studioS=studioStore(getStoreFn);
 // Legacy (pre-tag) keys for the same account.
 for(let i=0;i<5;i++){const t=now-i*3600000;await studioS.setJSON(`events/${new Date(t).toISOString().slice(0,10)}/${String(t).padStart(13,'0')}-legacy-0000000${i}`,{type:'legacy',account:people[1],family:null,data:{},at:new Date(t).toISOString()})}
 const naive=async(filter:(r:any)=>boolean,limit:number)=>{const keys:string[]=[];for await(const page of studioS.list({prefix:'events/',paginate:true}))for(const b of page.blobs)keys.push(b.key);keys.sort().reverse();const out:any[]=[];for(const k of keys){const r=await studioS.get(k,{type:'json'});if(r&&filter(r)&&Date.parse(r.at)>=now-30*DAY)out.push(k.split('/').pop());if(out.length>=limit)break}return out};
 const want=await naive((r:any)=>r.account===people[1]||r.actor===people[1],20);inst.reset();
 const got=await listLog(getStoreFn,'events',{account:people[1],limit:20,now});assert.deepEqual(got.items.map((x:any)=>x.id),want,'account filter = naive scan (tagged + legacy)');
 assert.ok(inst.counts.get<=40,'tagged keys skip non-matching reads: '+inst.counts.get);assert.ok(got.items.some((x:any)=>x.type==='legacy'));
 const p1=await listLog(getStoreFn,'events',{limit:30,now}),p2=await listLog(getStoreFn,'events',{limit:30,now,cursor:p1.next}),all=await listLog(getStoreFn,'events',{limit:60,now});
 assert.deepEqual([...p1.items,...p2.items].map((x:any)=>x.id),all.items.map((x:any)=>x.id),'cursor pages = one long page');
 const fam=families[2].id,fw=await naive((r:any)=>r.family===fam,15);assert.deepEqual((await listLog(getStoreFn,'events',{family:fam,limit:15,now})).items.map((x:any)=>x.id),fw);
 assert.ok(String(got.items[0].id).includes(logTag('a',people[1]))||got.items[0].type==='legacy');
 const c=await countLog(getStoreFn,'events',{now,type:'push_send'}),n=(await listLog(getStoreFn,'events',{now,type:'push_send',limit:3000})).items.length;assert.equal(c.total,n,'countLog = listLog count');
 pass('log filters match a naive scan; legacy keys still read; cursor stable; counts from keys')}

// ---- 5. per-day aggregates: settled days cached, today live
{const days=Array.from({length:7},(_,i)=>new Date(now-i*DAY).toISOString().slice(0,10)),red=(rows:any[])=>rows.length;
 const first=await dailyLog(getStoreFn,'events',{type:'push_send',name:'t-count',days,reduce:red,now});inst.reset();
 const second=await dailyLog(getStoreFn,'events',{type:'push_send',name:'t-count',days,reduce:red,now});assert.deepEqual(second,first);
 const before=(await S('notifications')).body;await recordEvent(getStoreFn,'push_send',{family:families[0].id,reason:'daily_limit'});const after=(await S('notifications')).body;
 assert.equal(after.byReason.daily_limit,before.byReason.daily_limit+1,'today is live');assert.equal(after.sendsLogged,before.sendsLogged+1);
 pass('per-day aggregates cached for settled days; today live')}

// ---- 6. read-ahead store returns the same community data
{const plain=await moderationData(getStoreFn,now),ra=readAheadStores(getStoreFn,['bep-community']),fast=await moderationData(ra,now);assert.deepEqual(fast,plain);
 assert.deepEqual(await productAdmin(readAheadStores(getStoreFn,['bep-community'])),await productAdmin(getStoreFn));
 assert.deepEqual((await rewardsAdmin(readAheadStores(getStoreFn,['bep-community']),{now})).contributors,(await rewardsAdmin(getStoreFn,{now})).contributors);
 pass('read-ahead store gives identical community results')}

// ---- 7. rate limit is still enforced on reads, and a refused read writes no audit entry
{resetSettingsCache();const later=now+10*60000,tight=createStudioHandler({getStoreFn,env,nowFn:()=>later,mailer:{configured:()=>false,async send(){}},limits:{all:3,mutate:3}});
 const T=(op:string)=>tight(new Request(`${origin}/.netlify/functions/studio?op=${op}`,{headers:{Cookie:cookie}}));
 const auditCount=async()=>(await listLog(getStoreFn,'audit',{now:later+DAY,type:'view_account',limit:3000})).items.length;
 const a0=await auditCount();const codes=[];for(let i=0;i<5;i++)codes.push((await T('account&username='+people[2])).status);
 assert.deepEqual(codes.slice(0,3),[200,200,200]);assert.ok(codes.slice(3).every(c=>c===429),'429 after the limit: '+codes);
 assert.equal(await auditCount(),a0+3,'refused reads write no audit entry');
 const r=await tight(new Request(`${origin}/.netlify/functions/studio?op=me`));assert.equal(r.status,401,'signed-out still 401');
 pass('rate limit and authorization still run on every read')}

// ---- 8. storage probe times out instead of hanging the health check
{const hang=(o:any)=>o.name==='bep-studio'?{setJSON:()=>new Promise(()=>{}),get:()=>new Promise(()=>{}),delete:()=>new Promise(()=>{})}:getStoreFn(o);const t=Date.now(),p=await storageProbe(hang,200);assert.equal(p.ok,false);assert.ok(Date.now()-t<1500);
 pass('storage probe has a short timeout')}

// ---- 9. request budgets (in-memory counts; no per-row reads on warm list views)
{clock=now+120000;await S('overview');await S('accounts');const budget:any={};
 for(const op of ['accounts','families','messages','overview','settings','rollout']){inst.reset();const r=await S(op);assert.equal(r.status,200,op);budget[op]={get:inst.counts.get,list:inst.counts.list}}
 for(const op of ['accounts','families','messages','overview'])assert.ok(budget[op].get<=8&&budget[op].list===0,op+' warm budget '+JSON.stringify(budget[op]));
 // Overview recompute counts events from the key listing: entry reads do not grow with the event log.
 inst.reset();await P('recompute',{});const studioGets=inst.byStore['bep-studio']?.get||0;assert.ok(studioGets<120,'overview recompute reads '+studioGets+' studio entries');
 const ids=Array.from({length:40},(_,i)=>i);let active=0,peak=0;await mapLimit(ids,16,async()=>{active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,2));active--});assert.equal(peak,16,'bounded parallelism');
 pass('warm list views read ≤8 documents; recompute does not read every event; concurrency bounded at 16')}
console.log('Studio speed tests passed.');
