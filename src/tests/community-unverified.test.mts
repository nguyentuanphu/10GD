// v1.7.2 community reports of generic receipt lines ("VEG 3.20", item named by the family) and the one-tap
// "Tôi cũng thấy giá này / I saw this price too" confirmation. Real account/family/community handlers with
// in-memory stores; synthetic prices only.
//  • accepted as "unverified" (never confirms alone, even from a trusted receipt), visible, not usable, no points;
//  • the generic flag comes from the SAVED receipt line, not from the client;
//  • the same family (or a member of it) can never confirm its own price; a fresh capture time is required;
//  • another family's confirmation verifies it: the first reporter gets the confirmed points, the confirmer the
//    corroborate points; a family confirms once (duplicate refused);
//  • Studio moderation lists unverified single reports distinctly; hiding a group still works.
import assert from 'node:assert/strict';
import {createAccountsHandler} from '../netlify/lib/accounts.mjs';
import {createFamilyHandler} from '../netlify/functions/family.mjs';
import {createCommunityHandler} from '../netlify/functions/community.mjs';
import {communityStore,TERMS_VERSION,moderationData,moderate,groupConsensus} from '../netlify/lib/community-prices.mjs';
import {memoryStores} from './helpers/accounts.mjs';

const DAY=86400000,origin='https://test.example',password='synthetic-community-passphrase-42';
const getStoreFn=memoryStores(),accounts=createAccountsHandler({getStoreFn}),family=createFamilyHandler({getStoreFn});
let clock=Date.parse('2026-11-02T01:00:00Z');const nowFn=()=>clock;
const community=createCommunityHandler({getStoreFn,env:{STUDIO_ADMINS:'henrynguyen',STUDIO_FLAG_COMMUNITY_PRICES:'true'},nowFn});
const accountsStore=getStoreFn({name:'bep-accounts'}),cstore=communityStore(getStoreFn);
let ipN=0;
const req=(endpoint:string,op:string,{method='GET',body,cookie=''}:any={})=>new Request(`${origin}/.netlify/functions/${endpoint}?op=${op}`,{method,headers:{Origin:origin,'x-nf-client-connection-ip':'ip-u'+(ipN++),...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
const acc=async(op:string,body:any,cookie='')=>accounts(req('accounts',op,{method:'POST',body,cookie}));
async function register(username:string){const r=await acc('register',{username,name:username,password,trust:true});assert.equal(r.status,201,username);return r.headers.get('set-cookie')!.split(';')[0]}
async function backdate(username:string,days:number){const u=await accountsStore.get('users/'+username,{type:'json'});u.createdAt=new Date(clock-days*DAY).toISOString();await accountsStore.setJSON('users/'+username,u)}
async function backdateFamily(id:string,days:number){const f=await accountsStore.get('families/'+id,{type:'json'});f.createdAt=new Date(clock-days*DAY).toISOString();await accountsStore.setJSON('families/'+id,f)}
async function household(username:string){const cookie=await register(username);const fam=(await (await acc('create-family',{name:'Nhà '+username},cookie)).json()).household;await backdate(username,20);await backdateFamily(fam.id,20);return{username,cookie,fam}}
const C=(op:string,o:any={})=>community(req('community',op,o));
const terms=async(who:any)=>assert.equal((await C('accept-terms',{method:'POST',cookie:who.cookie,body:{accept:true,version:TERMS_VERSION}})).status,200);
const total=async(who:any)=>(await (await C('rewards',{cookie:who.cookie})).json()).total;
const prices=async()=>(await (await C('prices&state=NSW')).json()).items;
const branch={suburb:'Cabramatta',postcode:'2166'};
const today='2026-11-02',captured='2026-11-02T00:40:00Z';
// Family A saved a TAN VIET GROCERY receipt: "VEG 3.20" (generic, unmatched → "Đồ khác (chưa rõ)") and a named line.
const receipt={id:'rc-g',store:'TAN VIET GROCERY CABRAMATTA',date:today,currency:'AUD',total:7.7,createdAt:captured,items:[
 {id:'g1',label:'VEG',total:3.2,ingredient:null,kind:'other',quantity:null,generic:true,genericKey:'l:veg',unknown:true},
 {id:'n1',label:'Nuoc mam 500ml',total:4.5,ingredient:null,kind:'other',quantity:null}]};
const stateDoc={version:1,members:[{id:'m-a',name:'An'}],weeks:{},pantry:[],preferences:{currency:'AUD'},recipes:[{id:'r1',name:'Family recipe',custom:true}],receipts:[receipt]};
const report=(line='g1',extra:any={})=>({itemId:'rau-muong',label:'Water spinach',retailer:'viet-grocer',price:line==='g1'?3.2:4.5,currency:'AUD',packQty:null,packUnit:null,units:null,unitPrice:null,unitBasis:null,promo:null,validUntil:null,state:'NSW',capturedAt:captured,...extra,evidence:{type:'receipt',receiptId:'rc-g',lineId:line,...(extra.evidence||{})}});
const share=(who:any,o:any)=>C('contribute',{method:'POST',cookie:who.cookie,body:{consent:true,observation:o,branch}});
const meToo=(who:any,g:any,at=new Date(clock-60000).toISOString())=>C('confirm',{method:'POST',cookie:who.cookie,body:{consent:true,state:'NSW',itemId:g.itemId,groupId:g.groupId,capturedAt:at}});
let n=0;const ok=(m:string)=>{n++;console.log('PASS',m)};

const a=await household('anvo');await terms(a);
assert.equal((await family(req('family','state',{method:'PUT',cookie:a.cookie,body:{state:stateDoc,etag:null}}))).status,200);
// A is a trusted contributor (trust ≥ 0.7): a normal receipt line would confirm alone — a generic one must not.
await cstore.setJSON('contributors/anvo',{...(await cstore.get('contributors/anvo',{type:'json'})),trust:0.8});

// ---- generic line accepted as "unverified" (client did NOT claim generic: the saved line decides)
let r=await share(a,report('g1'));assert.equal(r.status,201);let body=await r.json();
assert.equal(body.status,'accepted');assert.equal(body.group.status,'unverified','generic receipt line is unverified even from a trusted contributor');assert.equal(body.group.families,1);
let g=(await prices()).find((x:any)=>x.itemId==='rau-muong');
assert.equal(g.status,'unverified');assert.equal(g.usable,false,'not used as the main comparison price');assert.equal(g.reports,1);assert.equal(g.generic,true);assert.equal(g.capturedAt,new Date(captured).toISOString(),'capture time shown');assert.equal(g.branchLabel,'Cabramatta 2166');
assert.ok(!JSON.stringify(g).includes('anvo')&&!JSON.stringify(g).includes('rc-g'),'no identity or receipt id in public data');
assert.equal(await total(a),0,'no points while unverified');ok('generic line → unverified, visible, not usable, no points');

// ---- a named (non-generic) line from the same trusted family still confirms alone (unchanged rule), even if the client claims generic
r=await share(a,report('n1',{itemId:'nuoc-mam',label:'Fish sauce',evidence:{generic:true}}));assert.equal(r.status,201);assert.equal((await r.json()).group.status,'confirmed','the generic flag comes from the saved line');
ok('generic flag decided by the saved receipt line');

// ---- self-confirm refused (same family, any member), fresh capture time required
r=await meToo(a,g);assert.equal(r.status,409);assert.equal((await r.json()).code,'self-confirm');
const inv=await (await acc('invite',{role:'editor'},a.cookie)).json();const a2cookie=await register('anpartner');assert.equal((await acc('join',{code:inv.code},a2cookie)).status,200);await backdate('anpartner',20);
const a2={username:'anpartner',cookie:a2cookie};await terms(a2);
r=await meToo(a2,g);assert.equal(r.status,409,'another member of the same family cannot confirm either');assert.equal((await r.json()).code,'self-confirm');
const b=await household('binhle');await terms(b);
r=await meToo(b,g,new Date(clock-2*DAY).toISOString());assert.equal(r.status,422);assert.equal((await r.json()).code,'too-old');
r=await meToo(b,g,new Date(clock+DAY).toISOString());assert.equal(r.status,422);assert.equal((await r.json()).code,'future');
r=await C('confirm',{method:'POST',cookie:b.cookie,body:{state:'NSW',itemId:g.itemId,groupId:g.groupId,capturedAt:new Date(clock).toISOString()}});assert.equal(r.status,400,'never sent without the tap (consent)');
r=await C('confirm',{method:'POST',body:{consent:true,state:'NSW',itemId:g.itemId,groupId:g.groupId,capturedAt:new Date(clock).toISOString()}});assert.equal(r.status,401,'needs an account');
ok('self-confirm refused; fresh capture time and consent required');

// ---- Studio: unverified single reports listed distinctly
let mod=await moderationData(getStoreFn,clock);
const q=mod.queue.filter((x:any)=>x.kind==='unverified');assert.equal(q.length,1);assert.equal(q[0].itemId,'rau-muong');assert.equal(q[0].evidence.generic,true);assert.equal(q[0].families,1);assert.equal(q[0].contributor.account,'anvo');assert.equal(mod.stats.unverified,1);
ok('Studio moderation shows the unverified single report');

// ---- another family confirms → verified; points to the first reporter (+10) and the confirmer (+3)
r=await meToo(b,g);assert.equal(r.status,201);body=await r.json();assert.equal(body.group.status,'confirmed');assert.equal(body.group.families,2);
g=(await prices()).find((x:any)=>x.itemId==='rau-muong');assert.equal(g.status,'confirmed');assert.equal(g.usable,true);assert.equal(g.families,2);assert.deepEqual(g.sources.sort(),['confirm','receipt']);
assert.equal(await total(a),10,'first reporter earns the confirmed points on verification');assert.equal(await total(b),3,'the confirmer earns the corroborate points');assert.equal(await total(a2),0);
r=await meToo(b,g);assert.equal(r.status,409,'one family confirms once');
mod=await moderationData(getStoreFn,clock);assert.equal(mod.queue.filter((x:any)=>x.kind==='unverified').length,0,'verified → leaves the unverified list');
ok('unverified → verified by another family; points only after verification; duplicate refused');

// ---- a price that does not match is not a confirmation (another family reports 4.00 for the same item/store)
const c=await household('chautran');await terms(c);
const stateC={...stateDoc,members:[{id:'m-c',name:'Chau'}],receipts:[{...receipt,id:'rc-c',items:[{...receipt.items[0],id:'g9',total:4}]}]};
assert.equal((await family(req('family','state',{method:'PUT',cookie:c.cookie,body:{state:stateC,etag:null}}))).status,200);
r=await share(c,{...report('g9',{price:4}),evidence:{type:'receipt',receiptId:'rc-c',lineId:'g9'}});assert.equal(r.status,201);
g=(await prices()).find((x:any)=>x.itemId==='rau-muong');assert.equal(g.price,3.2,'a single different report does not replace the verified price');assert.equal(g.families,2);assert.equal(await total(c),0,'a non-matching report earns nothing');
ok('non-matching price is not a confirmation');
const stateC2={...stateC,receipts:[...stateC.receipts,{...receipt,id:'rc-c2',items:[{...receipt.items[0],id:'g8',total:1.5}]}]};
assert.equal((await family(req('family','state',{method:'PUT',cookie:c.cookie,body:{state:stateC2,etag:(await (await family(req('family','state',{cookie:c.cookie}))).json()).etag}}))).status,200);
r=await share(c,{...report('g8',{itemId:'hanh-la',label:'Spring onion',price:1.5}),evidence:{type:'receipt',receiptId:'rc-c2',lineId:'g8'}});assert.equal(r.status,201);assert.equal((await r.json()).group.status,'unverified');

// ---- moderation: hiding an unverified group removes it; it can no longer be confirmed
const g2=(await prices()).find((x:any)=>x.itemId==='hanh-la'&&x.status==='unverified');assert.ok(g2);
await moderate(getStoreFn,{action:'hide',body:{state:'NSW',itemId:'hanh-la',groupId:g2.groupId},now:clock});
assert.ok(!(await prices()).some((x:any)=>x.groupId===g2.groupId),'hidden group not shown');
const d=await household('dunghoang');await terms(d);r=await meToo(d,g2);assert.equal(r.status,404,'hidden price cannot be confirmed');
ok('Studio hide still applies');

// pure: a lone generic receipt (trusted) never confirms; a second family does
const sub=(fam:string,generic:boolean)=>({id:fam,groupId:'g',itemId:'x',status:'accepted',counted:true,familyRef:fam,price:3.2,capturedAt:captured,observedAt:today,trustAtSubmit:0.9,evidence:{type:'receipt',generic}});
assert.equal(groupConsensus([sub('f1',true)],today).status,'unverified');assert.equal(groupConsensus([sub('f1',false)],today).status,'confirmed');assert.equal(groupConsensus([sub('f1',true),sub('f2',true)],today).status,'confirmed');
ok('groupConsensus rules');
console.log(`community unverified tests passed (${n})`);
