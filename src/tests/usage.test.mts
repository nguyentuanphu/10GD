// Usage statistics API (v1.7): strict ingest whitelist, size/type validation, same-origin,
// rate limits, batch de-duplication, daily rollup merge, account/family from the cookie only,
// network location reduced to country + state (no IP / city / coordinates stored), postcode
// precedence, Studio flag off, forget, 13-month retention + scheduled cleanup, Studio ops
// role-gated, overview cached, drill-downs audited. Synthetic data only.
import assert from 'node:assert/strict';
import {createAccountsHandler} from '../netlify/lib/accounts.mjs';
import {createUsageHandler} from '../netlify/functions/usage.mjs';
import {createUsageCleanup} from '../netlify/functions/usage-cleanup.mjs';
import {usageStore,installHash,validateBatch,mergeRollup,locationOf,networkGeo,retentionCutoff,sydneyDay,USAGE_LIMITS,USAGE_FEATURES} from '../netlify/lib/usage.mjs';
import {listLog,resetSettingsCache,saveSettings,dayKey} from '../netlify/lib/studio.mjs';
import {memoryStores} from './helpers/accounts.mjs';

const getStoreFn=memoryStores(),origin='https://test.example',password='synthetic-usage-stats-42';
let clock=Date.parse('2026-11-20T09:00:00+11:00');
const env:any={STUDIO_ADMINS:'henrynguyen'};resetSettingsCache();
const api=createUsageHandler({getStoreFn,env,nowFn:()=>clock}),accounts=createAccountsHandler({getStoreFn});
const I1='synthetic-install-id-000001',I2='synthetic-install-id-000002',I3='synthetic-install-id-000003';
const IP='203.0.113.77';let ipn=0;
const GEO={city:'Hurstville',country:{code:'AU',name:'Australia'},subdivision:{code:'NSW',name:'New South Wales'},latitude:-33.96,longitude:151.1,timezone:'Australia/Sydney',postalCode:'2220'};
const call=(op:string,{method='POST',body,from=origin,cookie='',ip='',geo=undefined as any,query=''}:any={})=>api(new Request(`${origin}/.netlify/functions/usage?op=${op}${query}`,{method,headers:{...(from?{Origin:from}:{}),'x-nf-client-connection-ip':ip||'198.51.100.'+(ipn++%250),...(geo?{'x-nf-geo':Buffer.from(JSON.stringify(geo)).toString('base64')}:{}),...(cookie?{Cookie:cookie}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{})},...(body!==undefined?{body:typeof body==='string'?body:JSON.stringify(body)}:{})}));
const J=async(r:Response)=>({status:r.status,data:await r.json()});
async function register(username:string){const r=await accounts(new Request(origin+'/.netlify/functions/accounts?op=register',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','x-nf-client-connection-ip':'reg-'+username},body:JSON.stringify({username,name:username,password,trust:true})}));assert.equal(r.status,201);return r.headers.get('set-cookie')!.split(';')[0]}
async function family(cookie:string,name:string){const r=await accounts(new Request(origin+'/.netlify/functions/accounts?op=create-family',{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json','x-nf-client-connection-ip':'fam'},body:JSON.stringify({name})}));assert.equal(r.status,201);return (await r.json()).household.id as string}
const today=()=>sydneyDay(clock);
const addDay=(d:string,n:number)=>dayKey(Date.parse(d+'T00:00:00Z')+n*86400000);
const hours=(at:number[]=[],secs=60)=>{const h=new Array(24).fill(0);for(const i of at)h[i]=secs;return h};
let bn=0;const batch=(o:any={})=>({v:1,install:I1,batch:'batch-'+String(++bn).padStart(6,'0'),ver:'5/20261101',lang:'vi',platform:'mobile',standalone:true,postcode:null,days:[{day:today(),secs:600,sessions:2,hours:hours([8,19],300),features:{today:3,shopping:1}}],...o});
const allRows=async()=>{const out:any[]=[];for await(const p of usageStore(getStoreFn).list({prefix:'',paginate:true}))for(const b of p.blobs)out.push({key:b.key,data:await usageStore(getStoreFn).get(b.key,{type:'json'})});return out};

// ---- pure validation
{const v=validateBatch(batch(),clock);assert.equal(v.days.length,1);assert.deepEqual(v.days[0].features,{today:3,shopping:1})}
const rejects=(b:any,what:RegExp)=>assert.throws(()=>validateBatch(b,clock),(e:any)=>e.status===400&&what.test(e.en),String(what));
rejects({...batch(),account:'alice'},/field account/);
rejects({...batch(),family:'x'},/field family/);
rejects({...batch(),search:'phở bò'},/field search/);
rejects(batch({days:[{...batch().days[0],recipe:'Canh chua'}]}),/day field recipe/);
rejects(batch({days:[{...batch().days[0],features:{today:1,'recipe:canh-chua':1}}]}),/feature recipe/);
rejects(batch({days:[{...batch().days[0],secs:'600'}]}),/secs/);
rejects(batch({days:[{...batch().days[0],secs:90000}]}),/secs/);
rejects(batch({days:[{...batch().days[0],hours:new Array(23).fill(0)}]}),/hours/);
rejects(batch({days:[{...batch().days[0],hours:hours([1],4000)}]}),/hours/);
rejects(batch({days:[{...batch().days[0],features:{today:-1}}]}),/feature count/);
rejects(batch({days:[{...batch().days[0],day:addDay(today(),-30)}]}),/day/);
rejects(batch({days:[batch().days[0],batch().days[0]]}),/day/);
rejects(batch({lang:'fr'}),/lang/);rejects(batch({platform:'tv'}),/platform/);rejects(batch({standalone:'yes'}),/standalone/);
rejects(batch({postcode:'Hurstville'}),/postcode/);rejects(batch({v:2}),/v/);rejects(batch({batch:'x'}),/batch/);
rejects(batch({days:[]}),/days/);rejects(batch({days:Array.from({length:15},(_,i)=>({...batch().days[0],day:addDay(today(),-i)}))}),/days/);
assert.equal(USAGE_FEATURES.includes('studio' as any),false,'Studio is not a tracked feature');
// network geo: only country + state survive
assert.deepEqual(networkGeo(new Request(origin,{headers:{'x-nf-geo':Buffer.from(JSON.stringify(GEO)).toString('base64')}})),{c:'AU',r:'NSW'});
assert.deepEqual(networkGeo(new Request(origin),{geo:GEO}),{c:'AU',r:'NSW'});
assert.equal(networkGeo(new Request(origin)),null);
// location precedence
assert.deepEqual(locationOf({loc:{pc:'4000',st:'QLD'},net:{c:'AU',r:'NSW'}}),{country:'AU',state:'QLD',postcode:'4000',source:'postcode'});
assert.deepEqual(locationOf({loc:null,net:{c:'AU',r:'VIC'}}),{country:'AU',state:'VIC',postcode:null,source:'network'});
assert.equal(locationOf({}).source,'unknown');
// rollup merge adds and caps
{const add={day:'2026-11-20',secs:80000,sessions:3,hours:hours([9],3000),features:{plan:2}};const m1=mergeRollup(null,add,{i:'h',now:clock,platform:'tablet'}),m2=mergeRollup(m1,add,{i:'h',now:clock});
 assert.equal(m2.secs,86400,'day capped');assert.equal(m2.hours[9],3600,'hour capped');assert.equal(m2.sessions,6);assert.equal(m2.features.plan,4);assert.equal(m2.platform,'tablet')}

// ---- HTTP: method, origin, size, JSON
{const r=await J(await call('ingest',{method:'GET'}));assert.equal(r.status,405)}
{const r=await J(await call('ingest',{body:batch(),from:'https://evil.example'}));assert.equal(r.status,403)}
{const r=await J(await call('ingest',{body:'{bad'}));assert.equal(r.status,400)}
{const r=await J(await call('ingest',{body:batch({ver:'x'.repeat(10)}),query:''}));assert.equal(r.status,201)}
{const big=batch();(big as any).days[0].pad='x'.repeat(USAGE_LIMITS.bytes);const r=await J(await call('ingest',{body:big}));assert.equal(r.status,413,'oversize refused before parsing')}
{const r=await J(await call('ingest',{body:{...batch(),install:'short'}}));assert.equal(r.status,401)}
{const r=await J(await call('ingest',{body:{...batch(),account:'mallory'}}));assert.equal(r.status,400,'client cannot claim an account')}
// reset the store to a known state
for(const x of await allRows())await usageStore(getStoreFn).delete(x.key);

// ---- ingest: anonymous device, network location; no IP / city / coordinates / raw install stored
{const r=await J(await call('ingest',{body:batch(),from:'',ip:IP,geo:GEO}));assert.equal(r.status,201,'beacon without Origin accepted');assert.equal(r.data.ok,true)
 const rows=await allRows(),dump=JSON.stringify(rows);
 const key=`d/${today()}/${installHash(I1)}`;const row=rows.find(x=>x.key===key)?.data;assert.ok(row,'daily rollup keyed by day + hashed install');
 assert.equal(row.secs,600);assert.equal(row.sessions,2);assert.equal(row.hours[19],300);assert.deepEqual(row.features,{today:3,shopping:1});
 assert.equal(row.acct,null);assert.equal(row.fam,null);assert.deepEqual(row.net,{c:'AU',r:'NSW'});assert.equal(row.loc,null);
 for(const bad of [I1,IP,'Hurstville','151.1','-33.96','2220','Australia/Sydney'])assert.ok(!dump.includes(bad),'not stored: '+bad);
 assert.ok(rows.every(x=>!/event|log/.test(x.key)),'no raw event log')}
// same batch again (beacon + retry) counts once; a new batch merges into the same day
{const b=batch();assert.equal((await call('ingest',{body:b})).status,201);const r=await J(await call('ingest',{body:b}));assert.equal(r.data.duplicate,true);
 const row=await usageStore(getStoreFn).get(`d/${today()}/${installHash(I1)}`,{type:'json'});assert.equal(row.secs,1200,'duplicate batch not double counted');assert.equal(row.features.today,6)}
// postcode → state (family Price Scout postcode) takes precedence over network
{assert.equal((await call('ingest',{body:batch({install:I2,postcode:'4000'}),geo:GEO})).status,201);const row=await usageStore(getStoreFn).get(`d/${today()}/${installHash(I2)}`,{type:'json'});
 assert.deepEqual(row.loc,{pc:'4000',st:'QLD'});assert.equal(locationOf(row).source,'postcode');assert.equal(locationOf(row).state,'QLD')}
// signed in: account + family come from the cookie
const henry=await register('henrynguyen'),alice=await register('alice');
const aliceFam=await family(alice,'Nhà Alice');
{assert.equal((await call('ingest',{body:batch({install:I3,platform:'desktop',standalone:false,lang:'en'}),cookie:alice})).status,201);
 const row=await usageStore(getStoreFn).get(`d/${today()}/${installHash(I3)}`,{type:'json'});assert.equal(row.acct,'alice');assert.equal(row.fam,aliceFam)}
// ---- rate limit per install
{const T='synthetic-install-rate-0001';let last=0;for(let i=0;i<=USAGE_LIMITS.installHour;i++)last=(await call('ingest',{body:batch({install:T})})).status;assert.equal(last,429,'per-install hourly limit');
 const r=await J(await call('ingest',{body:batch({install:'synthetic-install-rate-0002'})}));assert.equal(r.status,201,'other installs unaffected')}
// ---- Studio switch off: nothing stored
{await saveSettings(getStoreFn,{flags:{usageAnalytics:false}});resetSettingsCache();const data=async()=>(await allRows()).filter(x=>/^(d|inst)\//.test(x.key)).length,before=await data();
 const r=await J(await call('ingest',{body:batch({install:'synthetic-install-flag-0001'})}));assert.equal(r.status,202);assert.equal(r.data.disabled,true);
 assert.equal(await data(),before,'nothing stored while the Studio switch is off');assert.ok(!(await allRows()).some(x=>x.key.includes(installHash('synthetic-install-flag-0001'))));
 await saveSettings(getStoreFn,{flags:{usageAnalytics:true}});resetSettingsCache()}
// ---- forget
{const ih=installHash(I2);assert.ok((await allRows()).some(x=>x.key.endsWith('/'+ih)));
 const r=await J(await call('forget',{body:{install:I2}}));assert.equal(r.status,200);assert.equal(r.data.deleted,1);
 assert.ok(!(await allRows()).some(x=>x.key.includes(ih)),'all rows + index for that install deleted');assert.ok((await allRows()).some(x=>x.key.includes(installHash(I1))),'others kept');
 assert.equal((await call('forget',{body:{install:'bad'}})).status,401)}

// ---- Studio ops: role-gated, cached, drill-down audited
{assert.equal((await call('studio-usage-overview',{method:'GET'})).status,401);
 assert.equal((await call('studio-usage-overview',{method:'GET',cookie:alice})).status,403,'not a Studio role');
 assert.equal((await call('studio-usage-overview',{method:'POST',cookie:henry,body:{}})).status,405);
 assert.equal((await call('studio-usage-detail',{method:'GET',cookie:alice,query:'&family='+aliceFam})).status,403)}
// a few more days of history for the aggregates: I1 used yesterday and 8 days ago (anonymous, network NSW)
for(const back of [1,8]){const d=addDay(today(),-back);assert.equal((await call('ingest',{body:batch({days:[{day:d,secs:300,sessions:1,hours:hours([20],300),features:{plan:1}}]}),geo:GEO})).status,201)}
{const r=await J(await call('studio-usage-overview',{method:'GET',cookie:henry,query:'&days=30'}));assert.equal(r.status,200);const d=r.data;
 assert.equal(d.collecting,true);assert.equal(d.kpis.dau,4,'I1 + alice + two rate-limit installs today (I2 forgotten)');
 assert.equal(d.kpis.wau,4);assert.equal(d.kpis.mau,4);assert.equal(d.kpis.anonymous,3);assert.equal(d.kpis.accounts,1);assert.equal(d.kpis.families,1);
 assert.equal(d.series.length,30);assert.equal(d.heatmap.length,7);assert.equal(d.heatmap[0].length,24);
 const f=Object.fromEntries(d.features.map((x:any)=>[x.id,x]));assert.ok(f.today.count>=6);assert.equal(f.plan.count,2);assert.equal(f.plan.users,1);
 const net=d.locations.find((l:any)=>l.source==='network');assert.ok(net&&net.state==='NSW'&&net.country==='AU'&&net.postcode===null,'network-only row');
 assert.ok(d.platforms.some((p:any)=>p.id==='desktop|browser')&&d.platforms.some((p:any)=>p.id==='mobile|app'));assert.ok(d.languages.some((l:any)=>l.id==='en'));
 assert.equal(d.inactive.families,1);assert.equal(d.inactive.inactive14,0);
 assert.equal(d.cohorts.length,8);assert.ok(d.cohorts.some((c:any)=>c.size>0));
 assert.ok(!JSON.stringify(d).includes('Nhà Alice'),'aggregates carry no family names');
 const again=await J(await call('studio-usage-overview',{method:'GET',cookie:henry,query:'&days=30'}));assert.equal(again.data.cached,true,'overview cached 60 s');
 const fresh=await J(await call('studio-usage-overview',{method:'GET',cookie:henry,query:'&days=30&fresh=1'}));assert.equal(fresh.data.cached,undefined)}
{const before=(await listLog(getStoreFn,'audit',{now:clock,limit:200,from:dayKey(clock-86400000)})).items.length;
 const r=await J(await call('studio-usage-detail',{method:'GET',cookie:henry,query:'&family='+aliceFam}));assert.equal(r.status,200);assert.equal(r.data.rows.length,1);assert.equal(r.data.rows[0].minutes,10);
 assert.equal((await call('studio-usage-detail',{method:'GET',cookie:henry,query:'&family=nope'})).status,400);
 const li=await J(await call('studio-usage-inactive',{method:'GET',cookie:henry,query:'&threshold=14'}));assert.equal(li.status,200);assert.deepEqual(li.data.families,[]);
 const log=(await listLog(getStoreFn,'audit',{now:clock,limit:200,from:dayKey(clock-86400000)})).items;assert.equal(log.length,before+2);
 const acts=log.map((x:any)=>x.action);assert.ok(acts.includes('usage_drilldown'));assert.ok(acts.includes('usage_inactive_list'));
 assert.ok(log.some((x:any)=>x.action==='usage_drilldown'&&x.target?.id===aliceFam&&x.actor==='henrynguyen'))}
// ---- retention: 13 months, via the scheduled cleanup
{const store=usageStore(getStoreFn),cutoff=retentionCutoff(clock);assert.equal(cutoff,'2025-10-20');
 await store.setJSON(`d/2025-10-19/oldoldoldoldoldoldoldold`,{day:'2025-10-19',i:'oldoldoldoldoldoldoldold',secs:5,sessions:1,hours:hours(),features:{}});
 await store.setJSON(`inst/oldoldoldoldoldoldoldold`,{i:'oldoldoldoldoldoldoldold',first:'2025-10-19',last:'2025-10-19',days:['2025-10-19'],batches:[]});
 await store.setJSON(`d/2025-10-21/keptkeptkeptkeptkeptkept`,{day:'2025-10-21',i:'keptkeptkeptkeptkeptkept',secs:5,sessions:1,hours:hours(),features:{}});
 await store.setJSON('rate/stale:1',{count:1,expires:clock-1});
 const runs:any[]=[];const cron=createUsageCleanup({getStoreFn,now:()=>clock,log:(m:string)=>runs.push(m)});const res=await (await cron()).json();
 assert.ok(res.removed>=3,'old day row, stale index and expired rate counter removed');assert.equal(res.cutoff,'2025-10-20');
 const keys=(await allRows()).map(x=>x.key);assert.ok(!keys.includes('d/2025-10-19/oldoldoldoldoldoldoldold'));assert.ok(!keys.includes('inst/oldoldoldoldoldoldoldold'));assert.ok(keys.includes('d/2025-10-21/keptkeptkeptkeptkeptkept'));assert.ok(!keys.includes('rate/stale:1'));
 const cronRow=await getStoreFn({name:'bep-studio'}).get('cron/usage-cleanup',{type:'json'});assert.ok(cronRow?.at,'cleanup run recorded for Studio')}
{const mod=await import('../netlify/functions/usage-cleanup.mjs');assert.match((mod as any).config.schedule,/^\d+ \d+ \* \* \*$/,'daily schedule declared in the function config')}
console.log('Usage statistics API: whitelist/size/type validation, origin, rate limit, batch dedupe, rollups, cookie-only identity, no IP/city/coords, postcode precedence, flag off, forget, 13-month retention + cleanup, Studio role gate, cache and audited drill-downs — passed.');
