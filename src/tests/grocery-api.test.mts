// Price Scout API + cron: account/household gate, viewer read-only, origin
// check, validation, household isolation, rate limit, official cache, and the
// cron's no-op without a licensed feed. In-memory stores only.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {accountFixture,memoryStores} from './helpers/accounts.mjs';
import {createGroceryHandler} from '../netlify/functions/grocery.mjs';
import {createGroceryCron} from '../netlify/functions/grocery-cron.mjs';
import {postcodeToState} from '../netlify/lib/geo-resolver.mjs';
import {cacheKey,cycleId,cleanObservation,RATE_MAX} from '../netlify/lib/grocery-pricing.mjs';
const getStoreFn=memoryStores(),f=await accountFixture(getStoreFn),grocery=createGroceryHandler({getStoreFn,now:()=>new Date('2026-11-01T01:00:00Z')});
const req=(op,method='GET',body=null,cookie=f.cookie,origin='https://test.example')=>new Request('https://test.example/.netlify/functions/grocery?op='+op,{method,headers:{Origin:origin,...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
const obs=(id,extra={})=>({id,itemId:'gao-jasmine',label:'Jasmine rice 5kg',retailer:'coles',branchId:null,state:'NSW',price:14,currency:'AUD',packQty:5,packUnit:'kg',units:null,unitPrice:2.8,unitBasis:'per_kg',wasPrice:null,promo:null,validUntil:null,observedAt:'2026-10-31',observedBy:'spoofed',source:'manual',note:null,...extra});
// Auth
assert.equal((await grocery(req('prices','GET',null,''))).status,401);
assert.equal((await grocery(req('observe','POST',{observation:obs('obs-unauth')},''))).status,401);
assert.equal((await grocery(req('observe','POST',{observation:obs('obs-foreign')},f.cookie,'https://evil.example'))).status,403,'origin check');
// Save + read
let r=await grocery(req('observe','POST',{observation:obs('obs-one-0001',{source:'screenshot',evidence:{type:'screenshot',imageHash:'b'.repeat(64),ocrPrice:14,ocrMatches:false},capturedAt:'2026-10-31T09:00:00+11:00',confidence:'high'})}));assert.equal(r.status,201);
r=await grocery(req('prices&state=NSW'));assert.equal(r.status,200);let data=await r.json();
assert.equal(data.householdId,f.household.id);assert.equal(data.observations.length,1);const saved=data.observations[0];
assert.equal(saved.observedBy,'Fixture owner','server sets the member name');assert.equal(saved.createdBy,'fixtureowner');
assert.deepEqual([saved.visibility,saved.evidence.imageHash,saved.evidence.ocrMatches,saved.confidence,saved.capturedAt],['family','b'.repeat(64),true,'medium','2026-10-30T22:00:00.000Z'],'server recomputes provenance; only the hash is stored');
assert.equal(data.cycleId,'2026-10-28');assert.equal(data.official,null);
assert.equal((await grocery(req('prices&state=VIC'))).status,400);
// Validation
for(const bad of [obs('bad-price',{price:0}),obs('bad-curr',{currency:'USD'}),obs('bad-retailer',{retailer:'costco'}),obs('bad-official',{source:'official'}),obs('bad-future',{observedAt:'2027-01-01'}),obs('bad-community',{visibility:'community'}),obs('bad-hash',{evidence:{type:'screenshot',imageHash:'nothex'}}),obs('x'),obs('bad-state',{state:'VIC'})])
 assert.equal((await grocery(req('observe','POST',{observation:bad}))).status,400,'rejects '+bad.id);
assert.equal((await grocery(req('observe','POST',{observations:Array.from({length:26},(_,i)=>obs('obs-many-'+i))}))).status,400);
assert.equal((await grocery(new Request('https://test.example/.netlify/functions/grocery?op=observe',{method:'POST',headers:{Origin:'https://test.example',Cookie:f.cookie},body:'x'.repeat(40001)}))).status,413);
// Batch upsert is idempotent by id
r=await grocery(req('observe','POST',{observations:[obs('obs-one-0001',{price:13}),obs('obs-two-0002',{retailer:'woolworths',state:null})]}));assert.equal(r.status,201);
data=await(await grocery(req('prices'))).json();assert.equal(data.observations.length,2);assert.equal(data.observations.find(o=>o.id==='obs-one-0001').price,13);
// Household isolation: another family sees nothing and cannot delete ours.
const other=await f.accounts(f.request('register',{username:'otherfamily',name:'Other',password:'synthetic-other-passphrase-42'},'','other-ip'));const otherCookie=other.headers.get('set-cookie').split(';')[0];
await f.accounts(f.request('create-family',{name:'Other family'},otherCookie,'other-ip'));
data=await(await grocery(req('prices','GET',null,otherCookie))).json();assert.notEqual(data.householdId,f.household.id);assert.equal(data.observations.length,0,'no cross-family sharing');
assert.equal((await grocery(req('observe&id=obs-one-0001','DELETE',null,otherCookie))).status,404);
// Viewer: read-only
const invite=await f.accounts(f.request('invite',{role:'viewer'},f.cookie));const code=(await invite.json()).code;
const viewer=await f.accounts(f.request('register',{username:'familyviewer',name:'Viewer',password:'synthetic-viewer-passphrase-42'},'','viewer-ip'));const viewerCookie=viewer.headers.get('set-cookie').split(';')[0];
assert.equal((await f.accounts(f.request('join',{code},viewerCookie,'viewer-ip'))).status,200);
assert.equal((await grocery(req('prices','GET',null,viewerCookie))).status,200);
assert.equal((await grocery(req('observe','POST',{observation:obs('obs-viewer-1')},viewerCookie))).status,403);
assert.equal((await grocery(req('observe&id=obs-one-0001','DELETE',null,viewerCookie))).status,403);
// Delete
assert.equal((await grocery(req('observe&id=obs-two-0002','DELETE'))).status,200);assert.equal((await grocery(req('observe&id=obs-two-0002','DELETE'))).status,404);
// Official cache slot for the current cycle
const cache=getStoreFn({name:'bep-grocery-cache'});await cache.setJSON(cacheKey('NSW','2026-10-28'),{importedAt:'2026-10-28T19:30:00Z',observations:[obs('official-1',{source:'official'})]});
data=await(await grocery(req('prices&state=NSW'))).json();assert.equal(data.official.observations.length,1);assert.equal(data.official.observations[0].source,'official');
data=await(await grocery(req('prices&state=QLD'))).json();assert.equal(data.official,null);
// v1.7.8 (owner, 6 Nov 2026: "Giá online cũng chưa hiện"): online supermarket prices are national — a family with no postcode
// (no state) still gets them, and a state family gets them alongside its state feed
await cache.setJSON('online/2026-10-28.json',{version:1,importedAt:'2026-10-28T20:00:00Z',source:'online',attribution:['Price data by Pinch'],observations:[obs('online-pinch-suon-bo-coles',{source:'official',itemId:'suon-bo',retailer:'coles',observedBy:'Pinch',state:null})]});
data=await(await grocery(req('prices'))).json();assert.equal(data.official?.observations?.length,1,'no state: online prices still returned');assert.equal(data.official.observations[0].observedBy,'Pinch');assert.equal(data.official.observations[0].state,null);
data=await(await grocery(req('prices&state=NSW'))).json();assert.equal(data.official.observations.length,2,'NSW: state feed + online');
data=await(await grocery(req('prices&state=QLD'))).json();assert.equal(data.official.observations.length,1,'QLD: online only');
// v1.7.8 owner decision: "Tìm giá online" keeps ONLY the supermarket search word (no family, account or item name)
{const {ONLINE_WANTED_KEY,wantedQuery,wantedItems,readWanted}=await import('../netlify/lib/online-wanted.mjs');
 let r=await grocery(req('online-want','POST',{query:'  Gravy  BEEF '}));assert.equal(r.status,200);let j=await r.json();assert.deepEqual(j,{itemId:'w-gravy-beef',query:'gravy beef'});
 r=await grocery(req('online-want','POST',{query:'gravy beef'}));assert.equal((await r.json()).itemId,'w-gravy-beef','same word, same item');
 const raw=JSON.stringify(await cache.get(ONLINE_WANTED_KEY,{type:'json'}));assert.doesNotMatch(raw,/qa|household|family|username|Thịt/i,'only the word is stored: '+raw);assert.equal((await readWanted(cache)).items['w-gravy-beef'].n,2);
 for(const bad of ['ab','thịt bò','<script>','x'.repeat(51),'1234','a b c d e f g'])assert.equal((await grocery(req('online-want','POST',{query:bad}))).status,400,'rejected: '+bad);
 assert.equal(wantedQuery('Rice paper & noodles')?.itemId,'w-rice-paper-and-noodles');assert.equal(wantedItems(await readWanted(cache))[0].wanted,true);}
// Rate limit
const burst=createGroceryHandler({getStoreFn,now:()=>new Date('2026-11-01T02:00:00Z')});let limited=false;
for(let i=0;i<Math.ceil(RATE_MAX/25)+2&&!limited;i++){const res=await burst(req('observe','POST',{observations:Array.from({length:25},(_,j)=>obs(`obs-rate-${i}-${j}`))}));if(res.status===429)limited=true}
assert.ok(limited,'rate limited');
// Public region lookup and client/server postcode mirror
assert.deepEqual((await(await grocery(req('region&postcode=2600'))).json()).state,'ACT');
const ctx=vm.createContext({Intl,Date,Math,URL,JSON});vm.runInContext(readFileSync('dist/shopping-optimizer.js','utf8'),ctx);
for(let n=0;n<=9999;n++){const pc=String(n).padStart(4,'0'),a=postcodeToState(pc),b=ctx.PriceScout.postcodeState(pc);assert.equal(a.state,b.state,pc);assert.equal(a.supported,b.supported,pc)}
assert.equal(cycleId('2026-11-07'),'2026-11-04');assert.equal(cleanObservation({...obs('obs-clean-1'),extra:'dropped'}).extra,undefined);
console.log('PASS grocery API: session + household gate, origin check, viewer read-only, validation, provenance, isolation, delete, official cache, rate limit, postcode mirror');
// Cron: no feed configured → logs and exits; outside 06:xx Sydney → skipped; licensed feed imported.
const logs=[];const at6=new Date('2026-11-03T19:30:00Z');// 06:30 Wed AEDT
let fetched=0;const fetchFn=async()=>{fetched++;return new Response(JSON.stringify({version:1,states:{NSW:[obs('feed-1',{source:'official'})],QLD:[]}}))};
let res=await(await createGroceryCron({getStoreFn,env:{},fetchFn,now:()=>at6,log:m=>logs.push(m)})()).json();assert.equal(res.skipped,'not-configured');assert.equal(fetched,0);assert.match(logs.join(),/not configured/);
res=await(await createGroceryCron({getStoreFn,env:{GROCERY_FEED_URL:'https://feed.example/prices.json'},fetchFn,now:()=>new Date('2026-11-03T20:30:00Z'),log:()=>{}})()).json();assert.equal(res.skipped,'outside-window','07:30 AEDT run skipped');assert.equal(fetched,0);
res=await(await createGroceryCron({getStoreFn,env:{GROCERY_FEED_URL:'https://feed.example/prices.json',GROCERY_FEED_TOKEN:'t'},fetchFn,now:()=>at6,log:()=>{}})()).json();assert.deepEqual([res.imported,res.cycleId,res.counts.NSW],[true,'2026-11-04',1]);
assert.equal((await cache.get(cacheKey('NSW','2026-11-04'))).observations[0].source,'official');
res=await(await createGroceryCron({getStoreFn,env:{GROCERY_FEED_URL:'http://insecure.example'},fetchFn,now:()=>at6,log:()=>{}})()).json();assert.equal(res.reason,'invalid-url');
assert.doesNotMatch(readFileSync('src/netlify/functions/grocery-cron.mts','utf8')+readFileSync('src/netlify/lib/grocery-pricing.mts','utf8'),/woolworths\.com|coles\.com|aldi\.com|chemistwarehouse|amazon\.com/,'no retailer scraping endpoints');
console.log('PASS grocery cron: no-op without GROCERY_FEED_URL, Sydney 06:xx window, licensed feed import only');
// v1.7.11 (owner decision, 7 Nov 2026): without an account, 5 online-price tries per device, counted on the server, then an account
{const g=createGroceryHandler({getStoreFn,now:()=>new Date('2026-11-07T01:00:00Z')});
 const guest=(op:string,id:string,method='GET',body:any=null,ip='203.0.113.7')=>g(new Request('https://test.example/.netlify/functions/grocery?op='+op,{method,headers:{Origin:'https://test.example','X-Bep-Trial':id,'x-nf-client-connection-ip':ip,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}));
 assert.equal((await guest('prices','short')).status,401,'no valid device id → sign in');
 const id='trial-device-aaaaaaaaaaaa';const lefts:number[]=[];
 for(let i=0;i<5;i++){const r=await guest(i===2?'online-want':'prices',id,i===2?'POST':'GET',i===2?{query:'gravy beef'}:null);assert.equal(r.status,200,'try '+(i+1));const d:any=await r.json();lefts.push(d.trial.left);
  if(i!==2){assert.equal(d.guest,true);assert.deepEqual(d.observations,[],'a guest never gets any family\'s own prices');assert.equal(d.householdId,null)}}
 assert.deepEqual(lefts,[4,3,2,1,0],'each try counts, refresh and find alike');
 const no=await guest('prices',id);assert.equal(no.status,403);const nd:any=await no.json();assert.equal(nd.error,'trial-used');assert.equal(nd.trial.left,0);
 assert.equal((await guest('online-want',id,'POST',{query:'gravy beef'})).status,403,'find online price also stops');
 // clearing the browser gives a new device id, but the network's daily cap still holds
 let ok=0;for(let i=0;i<30;i++){const r=await guest('prices','trial-device-'+String(i).padStart(12,'b'));if(r.status===200)ok++}
 assert.equal(ok,15,'20 tries a day per network in all (5 used above + 15 here)');
 assert.equal((await guest('prices','trial-device-zzzzzzzzzzzz','GET',null,'198.51.100.9')).status,200,'another network is not affected');
 assert.equal((await guest('observe','trial-device-yyyyyyyyyyyy','POST',{observation:obs('obs-guest')},'198.51.100.10')).status,401,'saving prices still needs an account');
 console.log('PASS online prices without an account: 5 server-counted tries per device (refresh or find), shared supermarket prices only, then 403 trial-used; per-network daily cap; saving still needs an account')}
