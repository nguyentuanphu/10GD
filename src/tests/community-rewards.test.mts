// Community prices v1.5 owner decisions (1 Nov 2026): flag on by default, public read for
// device-only users (no personal data, per-IP limit), screenshot/bookmark prices shared as
// facts ("Giá online", OCR must match, always ≥2 families), share-by-default after consent,
// "prices wanted this week" aggregate, and rewards: points only on independent confirmation
// or moderator approval, never from your own family, daily cap, penalties, levels, badges,
// anonymous-by-default leaderboard with opt-in nickname, audited Studio adjust/revoke.
// Real account/family/studio handlers with in-memory stores; synthetic prices only.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createAccountsHandler} from '../netlify/lib/accounts.mjs';
import {createStudioHandler} from '../netlify/functions/studio.mjs';
import {createGroceryHandler} from '../netlify/functions/grocery.mjs';
import {createCommunityHandler,PUBLIC_READS_PER_HOUR} from '../netlify/functions/community.mjs';
import {communityStore,TERMS_VERSION,levelOf,REWARD_DEFAULTS,cleanNickname,anonId,ipHashOf,cleanProductUrl} from '../netlify/lib/community-prices.mjs';
import {resetSettingsCache} from '../netlify/lib/studio.mjs';
import {memoryStores} from './helpers/accounts.mjs';

const DAY=86400000,origin='https://test.example',password='synthetic-rewards-passphrase-42';
const getStoreFn=memoryStores(),accounts=createAccountsHandler({getStoreFn});
let clock=Date.parse('2026-11-04T01:00:00Z');const nowFn=()=>clock;
const env:any={STUDIO_ADMINS:'henrynguyen'};// no community flag: the default must be ON
resetSettingsCache();
const community=createCommunityHandler({getStoreFn,env,nowFn});
const studio=createStudioHandler({getStoreFn,env,nowFn,mailer:{configured:()=>false,async send(){}},limits:{all:10000,mutate:10000}});
const grocery=createGroceryHandler({getStoreFn,now:()=>new Date(clock)});
const accountsStore=getStoreFn({name:'bep-accounts'}),cstore=communityStore(getStoreFn);
let ipN=0;
const req=(endpoint:string,op:string,{method='GET',body,cookie='',ip,csrf}:any={})=>new Request(`${origin}/.netlify/functions/${endpoint}?op=${op}`,{method,headers:{Origin:origin,'x-nf-client-connection-ip':ip||'rw-ip-'+(ipN++),...(cookie?{Cookie:cookie}:{}),...(csrf?{'x-studio-csrf':csrf}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
const acc=async(op:string,body:any,cookie='')=>accounts(req('accounts',op,{method:'POST',body,cookie}));
async function register(username:string){const r=await acc('register',{username,name:username,password,trust:true});assert.equal(r.status,201,username);return r.headers.get('set-cookie')!.split(';')[0]}
async function age(username:string,famId:string){const u=await accountsStore.get('users/'+username,{type:'json'});u.createdAt=new Date(clock-30*DAY).toISOString();await accountsStore.setJSON('users/'+username,u);const f=await accountsStore.get('families/'+famId,{type:'json'});f.createdAt=new Date(clock-30*DAY).toISOString();await accountsStore.setJSON('families/'+famId,f)}
const C=(op:string,o:any={})=>community(req('community',op,o));
async function household(username:string,famName='Nhà '+username){const cookie=await register(username);const fam=(await (await acc('create-family',{name:famName},cookie)).json()).household;await age(username,fam.id);const h={username,cookie,fam};assert.equal((await C('accept-terms',{method:'POST',cookie,body:{accept:true,version:TERMS_VERSION}})).status,200);return h}
const hex=(s:string)=>createHash('sha256').update(s).digest('hex');let hn=0;
const fact=(extra:any={})=>({itemId:'gao-jasmine',label:'Jasmine rice 5kg',retailer:'coles',price:14,currency:'AUD',packQty:5,packUnit:'kg',units:null,unitPrice:null,unitBasis:null,promo:null,validUntil:null,state:'NSW',capturedAt:new Date(clock-3600000).toISOString(),...extra,evidence:{type:'shelf-photo',imageHash:hex('rw-'+(hn++)),ocrPrice:extra.price??14,...(extra.evidence||{})}});
const shot=(extra:any={})=>fact({...extra,evidence:{type:'screenshot',...(extra.evidence||{})}});
const store={suburb:'Cabramatta',postcode:'2166'};
const share=(who:any,o:any,b:any=store)=>C('contribute',{method:'POST',cookie:who.cookie,body:{consent:true,observation:o,branch:b}});
const pub=async(op='prices&state=NSW',cookie='')=>{const r=await C(op,{cookie});assert.equal(r.status,200,op);return r.json()};
const points=async(who:any)=>(await (await C('rewards',{cookie:who.cookie})).json());
const total=async(who:any)=>(await points(who)).total;
const setTrust=async(u:string,t:number)=>{const x=await cstore.get('contributors/'+u,{type:'json'});x.trust=t;await cstore.setJSON('contributors/'+u,x)};

// ---- pure helpers: levels and nickname rules
assert.equal(levelOf(0).level.id,'shopper');assert.equal(levelOf(99).level.id,'shopper');assert.equal(levelOf(100).level.id,'hunter');assert.equal(levelOf(500).level.id,'expert');assert.equal(levelOf(1500).level.id,'ambassador');assert.equal(levelOf(1500).next,null);
assert.equal(levelOf(300).progress,0.5,'progress between Thợ săn giá (100) and Chuyên gia giá (500)');assert.equal(levelOf(300).toNext,200);assert.equal(levelOf(-40).level.id,'shopper','negative balance stays at the first level');
assert.equal(levelOf(150,{...REWARD_DEFAULTS,levels:[200,600,2000]}).level.id,'shopper','levels follow Studio settings');
assert.equal(cleanNickname(' Mẹ Bin ',{username:'annguyen'}),'Mẹ Bin');
for(const bad of ['annguyen','AnNguyen 2','a@b.com','x','https://spam','Nhà Bếp Thơm'])assert.throws(()=>cleanNickname(bad,{username:'annguyen',familyName:'Nhà Bếp Thơm'}),/nickname|Biệt danh/i,bad);
assert.match(anonId('annguyen'),/^#\d{4}$/);assert.equal(anonId('annguyen'),anonId('annguyen'));

// ---- flag on by default; device-only status
let s=await (await C('status')).json();assert.equal(s.enabled,true,'default on');assert.equal(s.signedIn,false);assert.equal(s.publicRead,true);assert.equal(s.rewards.confirmed,10);

const a=await household('annguyen','Nhà Bếp Thơm'),b=await household('binhtran'),c=await household('chauvo'),d=await household('dungle');
// a second member of family A
const inv=await (await acc('invite',{role:'editor'},a.cookie)).json();const a2cookie=await register('anpartner');assert.equal((await acc('join',{code:inv.code},a2cookie)).status,200);
{const u=await accountsStore.get('users/anpartner',{type:'json'});u.createdAt=new Date(clock-30*DAY).toISOString();await accountsStore.setJSON('users/anpartner',u)}
const a2={username:'anpartner',cookie:a2cookie,fam:a.fam};assert.equal((await C('accept-terms',{method:'POST',cookie:a2.cookie,body:{accept:true,version:TERMS_VERSION}})).status,200);

// ---- share by default after the first consent (remembered per account, can be turned off)
s=await (await C('status',{cookie:b.cookie})).json();assert.equal(s.shareDefault,true,'after consent the share box defaults to on');
assert.equal((await C('share-default',{method:'POST',cookie:b.cookie,body:{shareDefault:false}})).status,200);
assert.equal((await (await C('status',{cookie:b.cookie})).json()).shareDefault,false,'user turned the default off');
await C('share-default',{method:'POST',cookie:b.cookie,body:{shareDefault:true}});
{const fresh=await register('nofirstconsent');s=await (await C('status',{cookie:fresh})).json();assert.equal(s.shareDefault,false,'before the first consent the box is not pre-ticked')}

// ---- screenshot / bookmark evidence: facts only, OCR must match, online label, ≥2 families always
let r=await share(a,shot({price:14,evidence:{ocrPrice:15}}),null);assert.equal(r.status,422);assert.equal((await r.json()).code,'ocr-mismatch','screenshot OCR mismatch rejected');
r=await share(a,fact({price:5,evidence:{type:'bookmark',imageHash:null,ocrPrice:5.5}}),null);assert.equal(r.status,422);assert.equal((await r.json()).code,'ocr-mismatch','bookmark page price must match');
r=await share(a,shot({evidence:{imageHash:null}}),null);assert.equal(r.status,400,'screenshot needs its image fingerprint');
r=await share(a,fact({evidence:{type:'manual'}}),null);assert.equal((await r.json()).code,'family-only','manual entries stay family-only');
await setTrust('annguyen',0.95);
r=await share(a,shot({itemId:'nuoc-mam',label:'Fish sauce 500mL',price:5.5}),null);assert.equal(r.status,201);let j=await r.json();assert.equal(j.group.status,'pending','high-trust screenshot alone is never confirmed');
let p=await pub();let g=p.items.find((x:any)=>x.itemId==='nuoc-mam');assert.equal(g.online,true,'app/website price is labelled online');assert.equal(g.branchLabel,'online');assert.equal(g.branchId,'coles:online:NSW','kept per retailer + state');assert.deepEqual(g.sources,['screenshot']);
assert.equal(await total(a),0,'no points before an independent family confirms');
r=await share(a2,shot({itemId:'nuoc-mam',label:'Fish sauce 500mL',price:5.5}),null);assert.equal(r.status,201);assert.equal((await r.json()).group.status,'pending','own family member does not confirm');
assert.equal(await total(a),0,'no points from your own family confirming you');assert.equal(await total(a2),0);
r=await share(b,fact({itemId:'nuoc-mam',label:'Fish sauce',price:5.5,evidence:{type:'bookmark',imageHash:null,ocrPrice:5.5}}),{online:true});assert.equal(r.status,201);assert.equal((await r.json()).group.status,'confirmed','two independent families confirm the online price');
assert.equal((await share(b,fact({itemId:'nuoc-mam',label:'Fish sauce',price:5.5,evidence:{type:'bookmark',imageHash:null,ocrPrice:5.5}}),{online:true})).status,409,'same bookmark capture twice is a duplicate');
let pa=await points(a);assert.equal(pa.total,10,'+10 confirmed price');assert.equal(pa.recent[0].type,'confirmed');assert.equal(pa.recent[0].online,true);
assert.equal(await total(b),3,'+3 for corroborating someone else’s price');assert.equal(await total(a2),0,'one award per family per price');
// The trusted-receipt shortcut never applies to online clusters (also tested in groupConsensus via the API above).
// Screenshot with a store branch: still an online/app price, per retailer + branch.
r=await share(c,shot({itemId:'dau-an',label:'Oil 2L',price:8}),store);assert.equal(r.status,201);g=(await pub()).items.find((x:any)=>x.itemId==='dau-an');assert.equal(g.online,true);assert.equal(g.branchLabel,'Cabramatta 2166');

// ---- shelf photo: special bonus, first-in-suburb badge, duplicates earn nothing
const dupe=fact({itemId:'tom',label:'Prawns 1kg',retailer:'woolworths',price:15,promo:'half-price',validUntil:'2026-11-10'});
assert.equal((await share(c,dupe,{suburb:'Bankstown',postcode:'2200'})).status,201);
assert.equal((await share(c,{...dupe},{suburb:'Bankstown',postcode:'2200'})).status,409,'duplicate capture refused');
assert.equal((await share(d,fact({itemId:'tom',label:'Prawns',retailer:'woolworths',price:15,promo:'half-price',validUntil:'2026-11-10'}),{suburb:'Bankstown',postcode:'2200'})).status,201);
let pc=await points(c);assert.equal(pc.total,15,'+10 confirmed +5 half-price special');assert.ok(pc.badges.some((x:any)=>x.id==='first-suburb'&&x.suburb==='Bankstown'),'badge: first confirmed price in the suburb');
assert.equal(await total(d),3);assert.ok(!(await points(d)).badges.some((x:any)=>x.id==='first-suburb'),'corroborator does not take the first-in-suburb badge');

// ---- "prices wanted this week": aggregate counts only; filling a ≥3-family gap earns +5
for(const h of [a,b,c])assert.equal((await C('wanted',{method:'POST',cookie:h.cookie,body:{state:'NSW',itemIds:['ca-tim','hanh-la']}})).status,201);
assert.equal((await C('wanted',{method:'POST',cookie:a2.cookie,body:{state:'NSW',itemIds:['ca-tim']}})).status,201,'second member of a family');
p=await pub();assert.deepEqual(p.wanted.counts,{'ca-tim':3,'hanh-la':2},'one family counts once; replacing a family list removes old items');
assert.equal((await C('wanted',{method:'POST',body:{state:'NSW',itemIds:['ca-tim']}})).status,401,'device-only users never write the aggregate');
const before=await total(d);
assert.equal((await share(d,fact({itemId:'ca-tim',label:'Eggplant',retailer:'coles',price:4}),store)).status,201);
assert.equal((await share(a,fact({itemId:'ca-tim',label:'Eggplant',retailer:'coles',price:4}),store)).status,201);
assert.equal(await total(d)-before,15,'+10 confirmed +5 for filling a gap 3 families needed');

// ---- daily cap (Studio setting) — later awards that day are capped, the next day resets
const henry=await register('henrynguyen');const me=await (await studio(req('studio','me',{cookie:henry}))).json();
const S=(op:string,o:any={})=>studio(req('studio',op,{cookie:henry,csrf:me.csrf,...o}));
assert.equal((await S('settings-save',{method:'POST',body:{patch:{rewards:{...REWARD_DEFAULTS,dailyCap:30}}}})).status,200);
assert.equal((await S('settings-save',{method:'POST',body:{patch:{rewards:{...REWARD_DEFAULTS,levels:[500,100,1500]}}}})).status,400,'levels must increase');
const capA=await total(a),todayA=(await points(a)).today;assert.equal(todayA,13,'a: +10 nuoc-mam, +3 ca-tim corroboration today');
for(const [i,item] of ['gung','toi'].entries()){assert.equal((await share(a,fact({itemId:item,label:item,retailer:'aldi',price:3+i}),store)).status,201);assert.equal((await share(b,fact({itemId:item,label:item,retailer:'aldi',price:3+i}),store)).status,201)}
pa=await points(a);assert.equal(pa.today,30,'capped at the daily limit');assert.equal(pa.total,capA+17);assert.equal(pa.recent[0].requested,10);assert.equal(pa.recent[0].points,7,'entry records requested vs granted');
clock+=DAY;
assert.equal((await share(a,fact({itemId:'sa',label:'Lemongrass',retailer:'aldi',price:2}),store)).status,201);assert.equal((await share(b,fact({itemId:'sa',label:'Lemongrass',retailer:'aldi',price:2}),store)).status,201);
assert.equal((await points(a)).today,10,'new Sydney day resets the cap');
await S('settings-save',{method:'POST',body:{patch:{rewards:REWARD_DEFAULTS}}});

// ---- held item: moderator approval awards points; rejection and contradiction cost points
for(let i=0;i<3;i++)await share([b,c,d][i],fact({itemId:'thit-heo',label:'Pork',retailer:'coles',price:12,unitPrice:12,unitBasis:'per_kg',packQty:1,packUnit:'kg'}),{suburb:'Parramatta',postcode:'2150'});
const e=await household('emlam');
for(let i=1;i<=3;i++)assert.equal((await grocery(req('grocery','observe',{method:'POST',cookie:e.cookie,body:{observation:{id:'obs-em-000'+i,itemId:'thit-heo',label:'Pork',retailer:'coles',price:12,currency:'AUD',packQty:1,packUnit:'kg',unitPrice:12,unitBasis:'per_kg',observedAt:new Date(clock).toISOString().slice(0,10),source:'manual'}}}))).status,201);
r=await share(e,fact({itemId:'thit-heo',label:'Pork',retailer:'coles',price:2,unitPrice:2,unitBasis:'per_kg',packQty:1,packUnit:'kg'}),{suburb:'Parramatta',postcode:'2150'});j=await r.json();assert.equal(j.status,'held');
assert.equal(await total(e),0,'held items earn nothing');
assert.equal((await S('community-action',{method:'POST',body:{action:'approve',state:'NSW',itemId:'thit-heo',id:j.id}})).status,200);
assert.equal(await total(e),10,'+10 when a moderator approves a held item');
assert.equal((await S('community-action',{method:'POST',body:{action:'reject',state:'NSW',itemId:'thit-heo',id:j.id,reason:'Photo shows another product'}})).status,200);
pa=await points(e);assert.equal(pa.total,-10,'−20 when rejected by a moderator');assert.equal(pa.level.id,'shopper');
const f=await household('phamfam');
assert.equal((await share(f,fact({itemId:'banh-pho',label:'Noodles',price:3}),{suburb:'Fairfield',postcode:'2165'})).status,201);
await share(b,fact({itemId:'banh-pho',label:'Noodles',price:4}),{suburb:'Fairfield',postcode:'2165'});await share(c,fact({itemId:'banh-pho',label:'Noodles',price:4}),{suburb:'Fairfield',postcode:'2165'});
assert.equal(await total(f),-20,'−20 when contradicted by ≥2 families');
// trust is separate from points
const trustB=(await cstore.get('contributors/binhtran',{type:'json'})).trust;

// ---- leaderboard: anonymous by default, nickname opt-in, never username/email/family name
let lb=await pub('leaderboard&state=NSW');
const lbText=JSON.stringify(lb);for(const secret of ['annguyen','binhtran','chauvo','dungle','Bếp Thơm','familyRef','account'])assert.ok(!lbText.includes(secret),'leaderboard leaks nothing: '+secret);
assert.ok(lb.weekly.rows.length>=3);assert.ok(lb.weekly.rows.every((x:any)=>x.name===null&&/^#\d{4}$/.test(x.anonId)),'default anonymous');assert.ok(lb.allTime.rows[0].points>=lb.allTime.rows[1].points);
assert.equal((await C('rewards-profile',{method:'POST',cookie:a.cookie,body:{nickname:'annguyen'}})).status,400,'username refused');
assert.equal((await C('rewards-profile',{method:'POST',cookie:a.cookie,body:{nickname:'Bếp Thơm'}})).status,400,'family name refused');
assert.equal((await C('rewards-profile',{method:'POST',cookie:a.cookie,body:{nickname:'Mẹ Bin'}})).status,200);
lb=await pub('leaderboard&state=NSW');assert.ok(!JSON.stringify(lb).includes('Mẹ Bin'),'nickname hidden until the user opts in');
assert.equal((await C('rewards-profile',{method:'POST',cookie:a.cookie,body:{showNickname:true}})).status,200);
lb=await pub('leaderboard&state=NSW');assert.ok(lb.allTime.rows.some((x:any)=>x.name==='Mẹ Bin'),'opted-in nickname shown');
lb=await pub('leaderboard&state=NSW',a.cookie);assert.equal(lb.allTime.rows.find((x:any)=>x.me)?.name,'Mẹ Bin','own row marked');
assert.equal((await pub('leaderboard&state=QLD')).allTime.rows.length,0,'per state');

// ---- device-only public read leaks nothing personal; per-IP limit
p=await pub();const all=JSON.stringify(p);
for(const secret of ['annguyen','anpartner','binhtran','chauvo','dungle','emlam','Bếp Thơm','familyRef','ipHash','account','imageHash','rw-',a.fam.id])assert.ok(!all.includes(secret),'public prices leak nothing: '+secret);
assert.ok(Object.values(p.wanted.counts).every(v=>typeof v==='number'));
{const ip='198.51.100.77',hour=new Date(clock).toISOString().slice(0,13),h=ipHashOf(new Request(origin,{headers:{'x-nf-client-connection-ip':ip}}),env);await cstore.setJSON(`rate/${hour}/read-${h}`,{count:PUBLIC_READS_PER_HOUR});assert.equal((await C('prices&state=NSW',{ip})).status,429,'public read rate-limited per IP hash')}

// ---- Studio rewards: leaderboard, ledger (audited view), adjust/revoke with reason (audited)
let mod=await (await S('community')).json();assert.ok(mod.rewards.contributors.some((x:any)=>x.account==='annguyen'));assert.ok(mod.rewards.leaderboards.NSW.allTime.rows.length>0);assert.equal(mod.rewards.config.dailyCap,100);
assert.equal((await S('community-action',{method:'POST',body:{action:'points-adjust',account:'binhtran',points:25}})).status,400,'adjust needs a reason');
const tb=await total(b);
assert.equal((await S('community-action',{method:'POST',body:{action:'points-adjust',account:'binhtran',points:25,reason:'Bonus for QA help'}})).status,200);
assert.equal(await total(b),tb+25);assert.equal((await cstore.get('contributors/binhtran',{type:'json'})).trust,trustB,'points never change trust');
let ledger=await (await S('community-ledger&account=binhtran')).json();const adj=ledger.entries.find((x:any)=>x.type==='adjust');assert.equal(adj.actor,'henrynguyen');assert.equal(adj.reason,'Bonus for QA help');
const award=ledger.entries.find((x:any)=>x.type==='corroborated');
assert.equal((await S('community-action',{method:'POST',body:{action:'points-revoke',account:'binhtran',entryId:award.id,reason:'Duplicate family device'}})).status,200);
assert.equal(await total(b),tb+25-award.points,'revoke appends a reversing entry');
assert.equal((await S('community-action',{method:'POST',body:{action:'points-revoke',account:'binhtran',entryId:award.id,reason:'again'}})).status,404,'cannot revoke twice');
ledger=await (await S('community-ledger&account=binhtran')).json();assert.ok(ledger.entries.some((x:any)=>x.id===award.id),'ledger is append-only: the revoked entry stays');
const audit=await (await S('audit&limit=200')).json(),acts=audit.items.map((x:any)=>x.action);
for(const act of ['community_points_adjust','community_points_revoke','view_rewards_ledger','save_settings'])assert.ok(acts.includes(act),'audited '+act);
assert.equal(audit.items.find((x:any)=>x.action==='community_points_adjust').reason,'Bonus for QA help');
assert.equal((await studio(req('studio','community-ledger&account=binhtran',{cookie:b.cookie}))).status,403,'non-admin cannot read ledgers');
assert.equal((await S('community-action',{method:'POST',body:{action:'nickname-clear',account:'annguyen',reason:'Unsuitable nickname'}})).status,200);
assert.ok(!JSON.stringify(await pub('leaderboard&state=NSW')).includes('Mẹ Bin'),'moderator can clear a nickname');
// own rewards need an account
assert.equal((await C('rewards')).status,401);

// ---- concurrent awards to one ledger never lose entries
const crowd:any[]=[];for(let i=0;i<5;i++)crowd.push(await household('crowd'+i));
const crowdItems=['rau-muong','hanh-la','ot','cai-thia','gung'];
await Promise.all(crowd.map((h,i)=>share(h,fact({itemId:crowdItems[i],label:crowdItems[i],retailer:'woolworths',price:3}),{suburb:'Ashfield',postcode:'2131'})));
await Promise.all(crowd.map((h,i)=>share(a,fact({itemId:crowdItems[i],label:crowdItems[i],retailer:'woolworths',price:3}),{suburb:'Ashfield',postcode:'2131'})));
await Promise.all(crowd.map(async h=>assert.equal(await total(h),10,'each crowd family confirmed by family A')));

// ---- product link memory: retailer product page only, confirmed by 2 families or Studio, stale on report
assert.deepEqual(cleanProductUrl('woolworths','https://www.woolworths.com.au/shop/productdetails/123456/sunrice-jasmine-5kg?utm_source=x&cid=9#reviews'),{productUrl:'https://www.woolworths.com.au/shop/productdetails/123456/sunrice-jasmine-5kg',productId:'123456'},'tracking/query stripped, id kept');
assert.equal(cleanProductUrl('coles','https://www.coles.com.au/product/sunrice-jasmine-rice-5kg-2345678?x=1')?.productId,'2345678');
assert.equal(cleanProductUrl('amazon','https://www.amazon.com.au/Some-Name/dp/B0ABCDEF12/ref=sr_1_1?tag=aff-22')?.productUrl,'https://www.amazon.com.au/dp/B0ABCDEF12','affiliate/tracking removed');
for(const [rt,u] of [['woolworths','http://www.woolworths.com.au/shop/productdetails/123456/x'],['woolworths','https://evil.example/shop/productdetails/123456'],['coles','https://www.woolworths.com.au/shop/productdetails/123456/x'],['woolworths','https://www.woolworths.com.au/shop/search/products?searchTerm=rice'],['woolworths','https://user:pw@www.woolworths.com.au/shop/productdetails/1234/x']])assert.equal(cleanProductUrl(rt,u),null,'rejected: '+u);
const link=(who:any,extra:any={})=>C('product',{method:'POST',cookie:who.cookie,body:{itemId:'gao-jasmine',retailer:'woolworths',url:'https://www.woolworths.com.au/shop/productdetails/123456/sunrice-jasmine-5kg?utm_source=app',name:'SunRice Jasmine 5kg',packQty:5,packUnit:'kg',...extra}});
assert.equal((await C('product',{method:'POST',body:{itemId:'gao-jasmine',retailer:'woolworths',url:'https://www.woolworths.com.au/shop/productdetails/123456/x'}})).status,401,'saving a link needs an account');
assert.equal((await link(a,{url:'https://example.com/p/1'})).status,422);
r=await link(a);assert.equal(r.status,201);j=await r.json();assert.equal(j.status,'candidate');assert.equal(j.confirmations,1);
assert.equal((await link(a2)).status,201);assert.equal((await pub('products')).products.length,0,'own family member does not confirm a link');
r=await link(b,{url:'https://www.woolworths.com.au/shop/productdetails/123456/sunrice-jasmine-5kg?cid=other'});j=await r.json();assert.equal(j.status,'confirmed','2 distinct families confirm the mapping');
let prods=(await pub('products')).products;assert.equal(prods.length,1);assert.equal(prods[0].productUrl,'https://www.woolworths.com.au/shop/productdetails/123456/sunrice-jasmine-5kg');assert.equal(prods[0].productId,'123456');assert.equal(prods[0].confirmations,2);
assert.ok(!/families|annguyen|binhtran|"price"/.test(JSON.stringify(prods)),'facts only: no family refs, no prices');
assert.equal((await pub('products&retailer=woolworths&item=gao-jasmine')).products.length,1);
assert.equal((await C('product-report',{method:'POST',cookie:c.cookie,body:{itemId:'gao-jasmine',retailer:'woolworths',key:prods[0].key,reason:'wrong-product'}})).status,201);
assert.equal((await pub('products')).products.length,0,'reported link is stale → the app falls back to search');
assert.equal((await link(d,{itemId:'tom',url:'https://www.woolworths.com.au/shop/productdetails/777777/prawns'})).status,201);
mod=await (await S('community')).json();const cand=mod.products.find((x:any)=>x.itemId==='tom');assert.equal(cand.status,'candidate');assert.equal(mod.products.find((x:any)=>x.itemId==='gao-jasmine').status,'stale');
assert.equal((await S('community-action',{method:'POST',body:{action:'product-approve',retailer:'woolworths',itemId:'tom',key:cand.key}})).status,400,'reason required');
assert.equal((await S('community-action',{method:'POST',body:{action:'product-approve',retailer:'woolworths',itemId:'tom',key:cand.key,reason:'Checked the page'}})).status,200);
assert.ok((await pub('products')).products.some((x:any)=>x.itemId==='tom'),'Studio approval confirms a mapping');
assert.equal((await S('community-action',{method:'POST',body:{action:'product-edit',retailer:'woolworths',itemId:'tom',key:cand.key,url:'https://evil.example/x',reason:'fix'}})).status,422);
assert.equal((await S('community-action',{method:'POST',body:{action:'product-edit',retailer:'woolworths',itemId:'tom',key:cand.key,url:'https://www.woolworths.com.au/shop/productdetails/777778/prawns-1kg',reason:'Updated stockcode'}})).status,200);
assert.equal((await pub('products&item=tom')).products[0].productId,'777778');
assert.equal((await S('community-action',{method:'POST',body:{action:'product-reject',retailer:'woolworths',itemId:'gao-jasmine',key:prods[0].key,reason:'Wrong product'}})).status,200);
assert.equal((await link(a)).status,201);assert.equal((await pub('products&item=gao-jasmine')).products.length,0,'a rejected mapping is never re-confirmed by new saves');
{const acts2=(await (await S('audit&limit=200')).json()).items.map((x:any)=>x.action);for(const act of ['community_product_approve','community_product_edit','community_product_reject'])assert.ok(acts2.includes(act),'audited '+act)}

// ---- Studio can still turn the pilot off
assert.equal((await S('settings-save',{method:'POST',body:{patch:{flags:{communityPrices:false}}}})).status,200);
assert.deepEqual(await (await C('status')).json(),{enabled:false});assert.equal((await C('prices&state=NSW')).status,404);
console.log('Community rewards / public read / online price tests passed.');
