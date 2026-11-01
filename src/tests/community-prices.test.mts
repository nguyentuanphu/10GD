// Community Price Pilot: flag-off no-op, eligibility gates, evidence checks, one vote per
// family, consensus, outlier hold, trust updates, low-trust not counted, conflict-of-interest
// flags, expiry, reports → moderation queue, moderator actions + audit, shop channel,
// concurrency and cross-family isolation. Real account/family/grocery/studio handlers with
// in-memory stores; synthetic prices only.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createAccountsHandler} from '../netlify/lib/accounts.mjs';
import {createFamilyHandler} from '../netlify/functions/family.mjs';
import {createGroceryHandler} from '../netlify/functions/grocery.mjs';
import {createStudioHandler} from '../netlify/functions/studio.mjs';
import {createCommunityHandler} from '../netlify/functions/community.mjs';
import {communityPrices,groupConsensus,pricesMatch,priceSanity,communityStore,RULES,TERMS_VERSION,cleanContribution} from '../netlify/lib/community-prices.mjs';
import {resetSettingsCache} from '../netlify/lib/studio.mjs';
import {memoryStores} from './helpers/accounts.mjs';

const DAY=86400000,origin='https://test.example',password='synthetic-community-passphrase-42';
const getStoreFn=memoryStores(),accounts=createAccountsHandler({getStoreFn}),family=createFamilyHandler({getStoreFn});
let clock=Date.now();const nowFn=()=>clock;
const envOn:any={STUDIO_ADMINS:'henrynguyen',STUDIO_FLAG_COMMUNITY_PRICES:'true'},envOff:any={STUDIO_ADMINS:'henrynguyen'};
const community=createCommunityHandler({getStoreFn,env:envOn,nowFn}),communityOff=createCommunityHandler({getStoreFn,env:envOff,nowFn});
const studio=createStudioHandler({getStoreFn,env:envOn,nowFn,mailer:{configured:()=>false,async send(){}},limits:{all:10000,mutate:10000}});
const grocery=createGroceryHandler({getStoreFn,now:()=>new Date(clock)});
const accountsStore=getStoreFn({name:'bep-accounts'}),cstore=communityStore(getStoreFn);
let ipN=0;
const req=(endpoint:string,op:string,{method='GET',body,cookie='',ip,csrf,from=origin,raw}:any={})=>new Request(`${origin}/.netlify/functions/${endpoint}?op=${op}`,{method,headers:{Origin:from,'x-nf-client-connection-ip':ip||'ip-'+(ipN++),...(cookie?{Cookie:cookie}:{}),...(csrf?{'x-studio-csrf':csrf}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:raw?{body:raw}:{})});
const acc=async(op:string,body:any,cookie='')=>accounts(req('accounts',op,{method:'POST',body,cookie}));
async function register(username:string){const r=await acc('register',{username,name:username,password,trust:true});assert.equal(r.status,201,username);return r.headers.get('set-cookie')!.split(';')[0]}
async function backdate(username:string,days:number){const u=await accountsStore.get('users/'+username,{type:'json'});u.createdAt=new Date(clock-days*DAY).toISOString();await accountsStore.setJSON('users/'+username,u)}
async function backdateFamily(id:string,days:number){const f=await accountsStore.get('families/'+id,{type:'json'});f.createdAt=new Date(clock-days*DAY).toISOString();await accountsStore.setJSON('families/'+id,f)}
/** A family with one owner account (aged 20 days, family aged 20 days) unless told otherwise. */
async function household(username:string,{accountDays=20,familyDays=20}:any={}){const cookie=await register(username);const fam=(await (await acc('create-family',{name:'Nhà '+username},cookie)).json()).household;await backdate(username,accountDays);await backdateFamily(fam.id,familyDays);return{username,cookie,fam}}
const C=(op:string,o:any={})=>community(req('community',op,o));
const hex=(s:string)=>createHash('sha256').update(s).digest('hex');
let hashN=0;
const obs=(extra:any={})=>({itemId:'gao-jasmine',label:'Jasmine rice 5kg',retailer:'coles',price:14,currency:'AUD',packQty:5,packUnit:'kg',units:null,unitPrice:2.8,unitBasis:'per_kg',promo:null,validUntil:null,state:'NSW',capturedAt:new Date(clock-3600000).toISOString(),...extra,evidence:{type:'shelf-photo',imageHash:hex('photo-'+(hashN++)),ocrPrice:extra.price??14,...(extra.evidence||{})}});
const branch={suburb:'Cabramatta',postcode:'2166'};
const share=(who:any,o:any=obs(),b:any=branch,ip?:string)=>C('contribute',{method:'POST',cookie:who.cookie,body:{consent:true,observation:o,branch:b},ip});
const prices=async(who:any,state='NSW',extra='')=>{const r=await C('prices&state='+state+extra,{cookie:who.cookie});assert.equal(r.status,200);return r.json()};
const terms=async(who:any)=>assert.equal((await C('accept-terms',{method:'POST',cookie:who.cookie,body:{accept:true,version:TERMS_VERSION}})).status,200);
const trustOf=async(u:string)=>(await cstore.get('contributors/'+u,{type:'json'}))?.trust;

// ---- pure helpers
assert.ok(pricesMatch({unitPrice:2.8,unitBasis:'per_kg'},{unitPrice:2.85,unitBasis:'per_kg'}),'±$0.05');
assert.ok(pricesMatch({unitPrice:20,unitBasis:'per_kg'},{unitPrice:20.4,unitBasis:'per_kg'}),'±2%');
assert.ok(!pricesMatch({unitPrice:20,unitBasis:'per_kg'},{unitPrice:20.5,unitBasis:'per_kg'}));
assert.ok(!pricesMatch({unitPrice:2.8,unitBasis:'per_kg'},{unitPrice:2.8,unitBasis:'per_100g'}),'different basis never matches');
assert.equal(priceSanity(1,[2.8,2.8,2.9]).ok,false);assert.equal(priceSanity(2.7,[2.8,2.8,2.9]).ok,true);assert.equal(priceSanity(1,[2.8,2.8]).reason,'insufficient-history');

// ---- flag off: nothing changes for users
const a=await household('annguyen');
assert.deepEqual(await (await communityOff(req('community','status',{cookie:a.cookie}))).json(),{enabled:false});
for(const op of ['prices&state=NSW','contribute','report','shop-apply','accept-terms']){const r=await communityOff(req('community',op,{cookie:a.cookie,...(op.startsWith('prices')?{}:{method:'POST',body:{}})}));assert.equal(r.status,404,'flag off '+op);assert.equal((await r.json()).disabled,true)}
assert.equal((await grocery(req('grocery','prices&state=NSW',{cookie:a.cookie}))).status,200,'Price Scout unaffected');
// stored Studio setting also works (default is OFF)
resetSettingsCache();

// ---- status & sign-in
let r=await C('status');let s=await r.json();assert.equal(s.enabled,true);assert.equal(s.signedIn,false);assert.deepEqual(s.states,['NSW','QLD']);
assert.equal((await C('prices&state=NSW')).status,401,'signed-in only for the pilot');
assert.equal((await C('prices&state=VIC',{cookie:a.cookie})).status,400);
assert.equal((await C('contribute',{method:'POST',cookie:a.cookie,body:{consent:true},from:'https://evil.example'})).status,403,'origin check');

// ---- eligibility gates
const young=await household('youngacct',{accountDays:2,familyDays:2});
s=await (await C('status',{cookie:young.cookie})).json();assert.equal(s.eligibility.ok,false);assert.ok(s.eligibility.reasons.includes('account-too-new'));
await terms(young);r=await share(young);assert.equal(r.status,403);assert.equal((await r.json()).code,'not-eligible');
const newFam=await household('newfamily',{accountDays:20,familyDays:3});await terms(newFam);r=await share(newFam);assert.equal(r.status,403);assert.deepEqual((await r.json()).reasons,['family-too-new'],'no verified email → family must be ≥7 days');
{const u=await accountsStore.get('users/newfamily',{type:'json'});u.email='nf@example.com';u.emailVerifiedAt=new Date(clock).toISOString();await accountsStore.setJSON('users/newfamily',u)}
assert.equal((await share(newFam,obs({itemId:'sua-tuoi',label:'Milk 2L',price:3.1,unitPrice:null,unitBasis:null,packQty:null,packUnit:null}))).status,201,'verified recovery email satisfies the gate');
// terms required, consent required
r=await share(a);assert.equal(r.status,428);assert.equal((await r.json()).code,'terms');
assert.equal((await C('accept-terms',{method:'POST',cookie:a.cookie,body:{accept:true,version:'old'}})).status,400);
await terms(a);assert.ok((await cstore.get('contributors/annguyen',{type:'json'})).termsAcceptedAt,'terms acceptance timestamp stored');
assert.equal((await C('contribute',{method:'POST',cookie:a.cookie,body:{consent:false,observation:obs(),branch}})).status,400,'opt-in per observation');

// ---- evidence checks
for(const [o,code] of [[obs({evidence:{type:'screenshot'}}),'family-only'],[obs({evidence:{type:'bookmark'}}),'family-only'],[obs({evidence:{type:'manual'}}),'family-only'],[obs({price:14,evidence:{ocrPrice:15}}),'ocr-mismatch'],[obs({capturedAt:new Date(clock-8*DAY).toISOString()}),'too-old'],[obs({capturedAt:new Date(clock+DAY).toISOString()}),'future']] as const){r=await share(a,o);assert.equal(r.status,422,code);assert.equal((await r.json()).code,code)}
assert.equal((await share(a,obs({price:14,evidence:{ocrPrice:14.01}}),{suburb:'Cabramatta',postcode:'2166'})).status,201,'OCR within $0.01 accepted');
const dupPhoto=obs();await share(a,dupPhoto);r=await share(a,{...dupPhoto});assert.equal(r.status,409);assert.equal((await r.json()).code,'duplicate','duplicate image hash rejected');
assert.equal((await share(a,obs(),{suburb:'Melbourne',postcode:'3000'})).status,400,'branch must be in a pilot state');
assert.equal(cleanContribution(obs(),branch,{now:clock,states:['NSW']}).branchLabel,'Cabramatta 2166');

// ---- consensus + one vote per family + trust up
let p=await prices(a);let g=p.items.find((x:any)=>x.itemId==='gao-jasmine'&&x.retailer==='coles');
assert.equal(g.status,'pending');assert.equal(g.families,1);
assert.ok(!JSON.stringify(p).includes('annguyen')&&!JSON.stringify(p).includes('familyRef')&&!JSON.stringify(p).includes('ipHash'),'no contributor identity in public data');
const inv=await (await acc('invite',{role:'editor'},a.cookie)).json();const a2cookie=await register('anpartner');assert.equal((await acc('join',{code:inv.code},a2cookie)).status,200);await backdate('anpartner',20);
const a2={username:'anpartner',cookie:a2cookie,fam:a.fam};await terms(a2);
assert.equal((await share(a2,obs({price:14.05,unitPrice:2.81}))).status,201);
g=(await prices(a)).items.find((x:any)=>x.itemId==='gao-jasmine'&&x.retailer==='coles');assert.equal(g.status,'pending','two members of one family count once');assert.equal(g.families,1);
const b=await household('binhtran');await terms(b);
r=await share(b,obs({price:14.1,unitPrice:2.82}));assert.equal(r.status,201);assert.equal((await r.json()).group.status,'confirmed');
g=(await prices(b)).items.find((x:any)=>x.itemId==='gao-jasmine'&&x.retailer==='coles');assert.equal(g.status,'confirmed');assert.equal(g.families,2);assert.equal(g.usable,true);assert.deepEqual(g.sources,['shelf-photo']);
assert.equal(await trustOf('annguyen'),0.55,'+0.05 when corroborated by another family');assert.equal(await trustOf('anpartner'),0.55);assert.equal(await trustOf('binhtran'),0.5);

// ---- outlier → held, photo upload only for held + hash match
const c=await household('chauvo');await terms(c);
for(const [i,v] of [[1,2.8],[2,2.9],[3,2.75]] as const)assert.equal((await grocery(req('grocery','observe',{method:'POST',cookie:c.cookie,body:{observation:{id:'obs-cv-000'+i,itemId:'gao-jasmine',label:'Rice',retailer:'woolworths',price:v*5,currency:'AUD',packQty:5,packUnit:'kg',unitPrice:v,unitBasis:'per_kg',observedAt:new Date(clock).toISOString().slice(0,10),source:'manual'}}}))).status,201);
const photo=Buffer.from('synthetic-shelf-photo-bytes');
r=await share(c,obs({retailer:'aldi',price:1,unitPrice:0.2,evidence:{imageHash:hex(photo.toString()),ocrPrice:1}}));assert.equal(r.status,201);let held=await r.json();
assert.equal(held.status,'held');assert.equal(held.holdReason,'too-low');assert.equal(held.photoRequested,true);
assert.ok(!(await prices(c)).items.some((x:any)=>x.retailer==='aldi'),'held items are not shown');
const up=(bytes:any,id=held.id)=>community(new Request(`${origin}/.netlify/functions/community?op=photo&id=${id}&state=NSW&item=gao-jasmine`,{method:'POST',headers:{Origin:origin,Cookie:c.cookie},body:bytes}));
assert.equal((await up(Buffer.from('other bytes'))).status,422,'photo must match the evidence hash');
assert.equal((await community(new Request(`${origin}/.netlify/functions/community?op=photo&id=${held.id}&state=NSW&item=gao-jasmine`,{method:'POST',headers:{Origin:origin,Cookie:b.cookie},body:photo}))).status,404,'only the contributor uploads');
assert.equal((await up(photo)).status,201);
const meta=await cstore.get('photo-meta/'+held.id,{type:'json'});assert.ok(Date.parse(meta.expiresAt)-clock<=14*DAY+1000,'photo auto-expires within 14 days');

// ---- receipts: confirmed line required; trust ≥0.7 receipt confirms alone
const d=await household('dungle');await terms(d);
const today=new Date(clock).toISOString().slice(0,10);
const stateDoc={version:1,members:[{id:'m-d',name:'Dung'}],weeks:{},pantry:[],preferences:{currency:'AUD'},recipes:[{id:'r1',name:'Family recipe',custom:true}],receipts:[{id:'rc-1',store:'Coles Cabramatta',date:today,currency:'AUD',total:20,items:[{id:'l1',label:'Jasmine rice',total:14.5,ingredient:'rice',quantity:5000},{id:'l2',label:'Fish sauce',total:5.5}]}]};
assert.equal((await family(req('family','state',{method:'PUT',cookie:d.cookie,body:{state:stateDoc,etag:null}}))).status,200);
const rcpt=(extra:any={})=>({...obs({retailer:'woolworths',price:14.5,unitPrice:2.9,...extra}),evidence:{type:'receipt',receiptId:'rc-1',lineId:'l1',...(extra.evidence||{})}});
r=await share(d,rcpt({price:13,unitPrice:2.6}));assert.equal(r.status,422);assert.equal((await r.json()).code,'receipt-unconfirmed');
r=await share(d,rcpt({evidence:{receiptId:'rc-missing'}}));assert.equal(r.status,422);
r=await share(d,rcpt());assert.equal(r.status,201);assert.equal((await r.json()).group.status,'pending','receipt from trust 0.5 alone is pending');
assert.equal((await share(d,rcpt())).status,409,'same receipt line cannot be shared twice');
{const x=await cstore.get('contributors/dungle',{type:'json'});x.trust=0.75;await cstore.setJSON('contributors/dungle',x)}
r=await share(d,{...obs({itemId:'nuoc-mam',label:'Fish sauce',retailer:'woolworths',price:5.5,unitPrice:null,unitBasis:null,packQty:null,packUnit:null}),evidence:{type:'receipt',receiptId:'rc-1',lineId:'l2'}});assert.equal(r.status,201);assert.equal((await r.json()).group.status,'confirmed','one receipt from trust ≥0.7 confirms');

// ---- low trust: accepted but never counted
const e=await household('emlow'),f=await household('phuongf');await terms(e);await terms(f);
{const x=await cstore.get('contributors/emlow',{type:'json'});x.trust=0.2;await cstore.setJSON('contributors/emlow',x)}
const lowBranch={suburb:'Bankstown',postcode:'2200'};
assert.equal((await share(e,obs({itemId:'nuoc-mam',retailer:'coles',price:6,unitPrice:null,unitBasis:null}),lowBranch)).status,201);
assert.equal((await share(f,obs({itemId:'nuoc-mam',retailer:'coles',price:6,unitPrice:null,unitBasis:null}),lowBranch)).status,201);
g=(await prices(f)).items.find((x:any)=>x.itemId==='nuoc-mam'&&x.retailer==='coles');assert.equal(g.status,'pending','low-trust report does not count toward confirmation');

// ---- contradiction: −0.15 when ≥2 other families disagree
const contraBranch={suburb:'Fairfield',postcode:'2165'};const solo=await household('soloreport');await terms(solo);
assert.equal((await share(solo,obs({itemId:'banh-pho',label:'Rice noodles',price:3,unitPrice:null,unitBasis:null,packQty:null,packUnit:null}),contraBranch)).status,201);
assert.equal((await share(b,obs({itemId:'banh-pho',label:'Rice noodles',price:4,unitPrice:null,unitBasis:null,packQty:null,packUnit:null}),contraBranch)).status,201);
assert.equal(await trustOf('soloreport'),0.5);
assert.equal((await share(c,obs({itemId:'banh-pho',label:'Rice noodles',price:4,unitPrice:null,unitBasis:null,packQty:null,packUnit:null}),contraBranch)).status,201);
assert.equal(await trustOf('soloreport'),0.35,'contradicted by 2 families');
g=(await prices(b)).items.find((x:any)=>x.itemId==='banh-pho');assert.equal(g.status,'confirmed');assert.equal(g.price,4);

// ---- conflict-of-interest signals (flag, never auto-ban)
const ip='203.0.113.9',ipAccounts:any[]=[];for(const n of ['ipone','iptwo','ipthree']){const h=await household(n);await terms(h);ipAccounts.push(h)}
for(const h of ipAccounts){r=await share(h,obs({itemId:'hanh-la',label:'Spring onion',retailer:'woolworths',price:2,unitPrice:null,unitBasis:null,packQty:null,packUnit:null}),{suburb:'Lakemba',postcode:'2195'},ip);assert.equal(r.status,201)}
assert.equal((await r.json()).flagged,true,'third account behind one network is flagged');
const newcomers:any[]=[];for(const n of ['newone','newtwo','newthree']){const h=await household(n,{accountDays:9,familyDays:9});await terms(h);newcomers.push(h)}
for(const h of newcomers)r=await share(h,obs({itemId:'ca-tim',label:'Eggplant',retailer:'coles',price:4,unitPrice:null,unitBasis:null,packQty:null,packUnit:null}),{suburb:'Marrickville',postcode:'2204'});
assert.equal((await r.json()).flagged,true,'burst from new accounts for one branch is flagged');
g=(await prices(b)).items.find((x:any)=>x.itemId==='ca-tim');assert.equal(g.status,'pending','flagged reports wait for a moderator before counting');
const shopper=await household('rivalshop');await terms(shopper);const comp=await household('competitor');await terms(comp);
const coiItems=['cai-thia','gung','toi','sa','ot'];
for(const it of coiItems)await share(comp,obs({itemId:it,label:it,retailer:'woolworths',price:10,unitPrice:null,unitBasis:null,packQty:null,packUnit:null}),{suburb:'Cabramatta',postcode:'2166'});
for(const it of coiItems)r=await share(shopper,obs({itemId:it,label:it,retailer:'viet-grocer',price:7,unitPrice:null,unitBasis:null,packQty:null,packUnit:null}),{suburb:'Canley Vale',postcode:'2166'});
assert.ok((await cstore.get('contributors/rivalshop',{type:'json'})).flags.includes('single-branch-low'),'single-branch, consistently below competitors');
assert.equal((await cstore.get('contributors/rivalshop',{type:'json'})).banned,false,'never auto-banned');

// ---- rate limits
const busy=await household('busyacct');await terms(busy);
for(let i=0;i<RULES.accountDaily;i++)assert.equal((await share(busy,obs({itemId:'dau-an',label:'Oil',price:8,unitPrice:null,unitBasis:null}),{suburb:'Ashfield',postcode:'2131'})).status,201);
assert.equal((await share(busy,obs({itemId:'dau-an',price:8,unitPrice:null,unitBasis:null}),{suburb:'Ashfield',postcode:'2131'})).status,429,'30/day per account');
const day=new Date(clock).toISOString().slice(0,10),ipHash=createHash('sha256').update('community-ip:bep-community:198.51.100.7').digest('hex').slice(0,32);
await cstore.setJSON(`rate/${day}/ip-${ipHash}`,{count:RULES.ipDaily});
assert.equal((await share(f,obs(),branch,'198.51.100.7')).status,429,'60/day per IP hash');

// ---- viewer and disabled accounts
const vinv=await (await acc('invite',{role:'viewer'},b.cookie)).json();const viewerCookie=await register('viewerguy');await acc('join',{code:vinv.code},viewerCookie);await backdate('viewerguy',20);
assert.equal((await C('contribute',{method:'POST',cookie:viewerCookie,body:{consent:true,observation:obs(),branch}})).status,403,'viewer read-only');
assert.equal((await C('prices&state=NSW',{cookie:viewerCookie})).status,200,'viewer can read');
{const u=await accountsStore.get('users/emlow',{type:'json'});u.disabled=true;await accountsStore.setJSON('users/emlow',u)}
assert.equal((await share(e,obs())).status,403,'disabled account');

// ---- reports → moderation queue
const gid=(await prices(b)).items.find((x:any)=>x.itemId==='gao-jasmine'&&x.retailer==='coles').groupId;
assert.equal((await C('report',{method:'POST',cookie:c.cookie,body:{state:'NSW',itemId:'gao-jasmine',groupId:gid,reason:'nope'}})).status,400);
r=await C('report',{method:'POST',cookie:c.cookie,body:{state:'NSW',itemId:'gao-jasmine',groupId:gid,reason:'wrong-price',note:'Shelf says $16'}});assert.equal(r.status,201);
assert.equal((await (await C('report',{method:'POST',cookie:c.cookie,body:{state:'NSW',itemId:'gao-jasmine',groupId:gid,reason:'wrong-price'}})).json()).already,true,'one open report per family');
const henry=await register('henrynguyen');const me=await (await studio(req('studio','me',{cookie:henry}))).json();
const S=(op:string,o:any={})=>studio(req('studio',op,{cookie:henry,csrf:me.csrf,...o}));
let mod=await (await S('community')).json();
assert.equal(mod.pilot.enabled,true);assert.ok(mod.stats.submissions>40);assert.ok(mod.stats.held>=1);assert.ok(mod.stats.reportsOpen>=1);assert.ok(mod.stats.contributors>=10);
const kinds=new Set(mod.queue.map((x:any)=>x.kind));for(const k of ['held','flagged','reported'])assert.ok(kinds.has(k),'queue has '+k);
const heldItem=mod.queue.find((x:any)=>x.id===held.id);assert.equal(heldItem.photo,true);assert.equal(heldItem.evidence.ocrMatches,true);assert.equal(heldItem.contributor.account,'chauvo');assert.equal(heldItem.contributor.trust,0.5);
assert.ok(mod.coi.some((x:any)=>x.account==='rivalshop'&&x.flags.includes('single-branch-low')));
// photo view (audited) then approve deletes it
assert.equal((await S('community-photo&id='+held.id)).status,200);
assert.equal((await S('community-action',{method:'POST',body:{action:'approve',state:'NSW',itemId:'gao-jasmine',id:held.id}})).status,200);
assert.equal(await cstore.get('photos/'+held.id),null,'photo deleted after moderation');assert.equal((await S('community-photo&id='+held.id)).status,404);
assert.ok((await prices(b)).items.some((x:any)=>x.retailer==='aldi'&&x.itemId==='gao-jasmine'),'approved item is shown');
// reject needs a reason and costs trust
assert.equal((await S('community-action',{method:'POST',body:{action:'reject',state:'NSW',itemId:'gao-jasmine',id:held.id}})).status,400,'reason required');
assert.equal((await S('community-action',{method:'POST',body:{action:'reject',state:'NSW',itemId:'gao-jasmine',id:held.id,reason:'Tag photo shows another product'}})).status,200);
assert.equal(await trustOf('chauvo'),0.35,'−0.15 when rejected by moderator');
// hide the reported group, then restore
assert.equal((await S('community-action',{method:'POST',body:{action:'hide',state:'NSW',itemId:'gao-jasmine',groupId:gid,reason:'Reported wrong'}})).status,200);
assert.ok(!(await prices(b)).items.some((x:any)=>x.groupId===gid),'hidden group gone');
assert.equal((await S('community-action',{method:'POST',body:{action:'restore',state:'NSW',itemId:'gao-jasmine',groupId:gid}})).status,200);
assert.ok((await prices(b)).items.some((x:any)=>x.groupId===gid),'restored');
// approve a flagged submission so it counts
const flagged=mod.queue.filter((x:any)=>x.kind==='flagged'&&x.itemId==='ca-tim');assert.ok(flagged.length>=1);
for(const x of mod.queue.filter((q:any)=>q.kind==='flagged'&&q.itemId==='ca-tim'))await S('community-action',{method:'POST',body:{action:'approve',state:'NSW',itemId:'ca-tim',id:x.id}});
assert.equal((await prices(b)).items.find((x:any)=>x.itemId==='ca-tim').status,'confirmed');
// ban (shadow-limit): their reports disappear; further submissions look accepted but never show
assert.equal((await S('community-action',{method:'POST',body:{action:'ban',account:'soloreport',reason:'Repeated false prices'}})).status,200);
r=await share(solo,obs({itemId:'rau-muong',label:'Water spinach',price:3,unitPrice:null,unitBasis:null}),{suburb:'Cabramatta',postcode:'2166'});assert.equal(r.status,201);assert.equal((await r.json()).status,'accepted');
assert.ok(!(await prices(b)).items.some((x:any)=>x.itemId==='rau-muong'),'banned contributor is shadow-limited');
assert.equal((await S('community-action',{method:'POST',body:{action:'unban',account:'soloreport',reason:'Appeal accepted'}})).status,200);
assert.ok((await prices(b)).items.some((x:any)=>x.itemId==='rau-muong'),'unban restores');
// audit log has every moderation action with who + reason
const audit=await (await S('audit&limit=100')).json();const actions=audit.items.map((x:any)=>x.action);
for(const act of ['view_community','view_community_photo','community_approve','community_reject','community_hide','community_restore','community_ban','community_unban'])assert.ok(actions.includes(act),'audited '+act);
assert.equal(audit.items.find((x:any)=>x.action==='community_ban').reason,'Repeated false prices');assert.equal(audit.items.find((x:any)=>x.action==='community_ban').actor,'henrynguyen');
// non-admin cannot moderate
assert.equal((await studio(req('studio','community',{cookie:b.cookie}))).status,403);

// ---- shop channel, kept separate from consensus
const shop=await household('chovietshop');
assert.equal((await C('shop-price',{method:'POST',cookie:shop.cookie,body:{price:{itemId:'rau-muong',price:2.5}}})).status,403,'needs approval');
assert.equal((await C('shop-apply',{method:'POST',cookie:shop.cookie,body:{shopName:'Chợ Việt Synthetic',abn:'12 345 678 901',suburb:'Cabramatta',postcode:'2166'}})).status,201);
mod=await (await S('community')).json();assert.equal(mod.applications.find((x:any)=>x.username==='chovietshop').status,'pending');
assert.equal((await S('community-action',{method:'POST',body:{action:'shop-approve',username:'chovietshop',reason:'ABN checked'}})).status,200);
assert.equal((await C('shop-price',{method:'POST',cookie:shop.cookie,body:{price:{itemId:'rau-muong',label:'Rau muống bó',price:2.5,unitPrice:null}}})).status,201);
p=await prices(b);assert.equal(p.shopPrices.length,1);assert.equal(p.shopPrices[0].channel,'shop');assert.equal(p.shopPrices[0].shop.name,'Chợ Việt Synthetic');
assert.ok(!p.items.some((x:any)=>x.itemId==='rau-muong'&&x.retailer==='viet-grocer'),'shop prices never enter community consensus');
r=await C('report',{method:'POST',cookie:b.cookie,body:{shop:'chovietshop',priceId:p.shopPrices[0].id,reason:'expired'}});assert.equal(r.status,201);
mod=await (await S('community')).json();const sr=mod.queue.find((x:any)=>x.kind==='shop-reported');assert.ok(sr);
assert.equal((await S('community-action',{method:'POST',body:{action:'shop-hide',shop:'chovietshop',priceId:sr.priceId,reason:'Price expired'}})).status,200);
assert.equal((await prices(b)).shopPrices.length,0);
await S('community-action',{method:'POST',body:{action:'shop-restore',shop:'chovietshop',priceId:sr.priceId}});
assert.equal((await communityPrices(getStoreFn,{state:'NSW',now:clock+15*DAY})).shopPrices.length,0,'shop prices expire after 14 days');

// ---- expiry of regular prices and specials
const nswNow=await communityPrices(getStoreFn,{state:'NSW',now:clock});const later=await communityPrices(getStoreFn,{state:'NSW',now:clock+16*DAY}),gone=await communityPrices(getStoreFn,{state:'NSW',now:clock+23*DAY});
const pick=(x:any)=>x.items.find((y:any)=>y.itemId==='banh-pho');
assert.equal(pick(nswNow).usable,true);assert.equal(pick(later).faded,true);assert.equal(pick(later).usable,false,'regular prices count 14 days, greyed until 21');assert.equal(pick(gone),undefined,'hidden after 21 days');
const special=[{id:'s1',groupId:'g',itemId:'x',status:'accepted',counted:true,flags:[],familyRef:'f1',price:5,unitPrice:null,promo:'special',validUntil:'2026-11-04',observedAt:'2026-11-01',capturedAt:'2026-11-01T01:00:00Z',evidence:{type:'shelf-photo'}}];
assert.ok(groupConsensus(special,'2026-11-04'));assert.equal(groupConsensus(special,'2026-11-05'),null,'specials end on validUntil');

// ---- concurrency: parallel contributions to one shard never lose writes
const crowd:any[]=[];for(let i=0;i<6;i++){const h=await household('crowd'+i);await terms(h);crowd.push(h)}
const results=await Promise.all(crowd.map((h,i)=>share(h,obs({itemId:'thit-heo',label:'Pork',retailer:'woolworths',price:12+i,unitPrice:null,unitBasis:null}),{suburb:'Parramatta',postcode:'2150'},'crowd-ip-'+i)));
assert.deepEqual(results.map(x=>x.status),[201,201,201,201,201,201]);
const shard=await cstore.get('items/NSW/thit-heo',{type:'json'});assert.equal(shard.submissions.length,6,'all parallel writes kept');

// ---- cross-family isolation of family data remains
const bFamily=await (await grocery(req('grocery','prices',{cookie:b.cookie}))).json();assert.equal(bFamily.observations.length,0,'family B cannot see family C observations');
const all=JSON.stringify(await communityPrices(getStoreFn,{state:'NSW',now:clock}));for(const secret of ['chauvo','binhtran','Family recipe','rc-1','ipHash','account'])assert.ok(!all.includes(secret),'public data leaks nothing: '+secret);
assert.equal((await prices(b,'QLD')).items.length,0,'state separation');
console.log('Community price pilot tests passed.');
