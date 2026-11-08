// v1.7.13 guest invitations — server side (lib/rsvp, family ops invite-create / invites / invite-cancel, public function rsvp).
// Tests are completely local: any unexpected network call fails immediately.
globalThis.fetch=async()=>{throw Error('Network is disabled in mocked tests')};
import assert from 'node:assert/strict';
import {createFamilyHandler} from '../netlify/functions/family.mjs';
import {createRsvpHandler} from '../netlify/functions/rsvp.mjs';
import {inviteFromRequest,replyFromRequest,forgettable,validToken} from '../netlify/lib/rsvp.mjs';
import {accountFixture,memoryStores} from './helpers/accounts.mjs';
const ok=(c:any,m:string)=>{assert.ok(c,m);console.log('PASS',m)};
const getStoreFn=memoryStores(),fixture=await accountFixture(getStoreFn),{cookie}=fixture;
const pushes:any[]=[];const pushSend=async(sub:any,payload:any)=>{pushes.push(JSON.parse(payload));return{statusCode:201}};
let clock=Date.parse('2026-11-10T00:00:00Z');
const family=createFamilyHandler({getStoreFn}),rsvp=createRsvpHandler({getStoreFn,pushSend,clock:()=>clock});
const freq=(op:string,body?:any,ck=cookie)=>new Request('https://test.example/.netlify/functions/family?op='+op,{method:body?'POST':'GET',headers:{Origin:'https://test.example',...(ck?{Cookie:ck}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
const rreq=(t:string,body?:any,origin='https://test.example')=>new Request('https://test.example/.netlify/functions/rsvp?t='+t,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json',Origin:origin}:{})},...(body?{body:JSON.stringify(body)}:{})});
await fixture.store.setJSON('state',{version:1,members:[{id:'dad',name:'Dad'},{id:'mum',name:'Mum'}],recipes:[],weeks:{},pantry:[],preferences:{}});
const sub=(n:number)=>({endpoint:'https://fcm.googleapis.com/fcm/send/synthetic-'+n,keys:{auth:'a'.repeat(22),p256dh:'b'.repeat(87)}});
const famPush=createFamilyHandler({getStoreFn,pushSend});assert.equal((await famPush(freq('push-key',{}))).status,200);
assert.equal((await famPush(freq('push-subscribe',{deviceId:'device-dad-0001',memberId:'dad',label:'Dad phone',subscription:sub(1),quietStart:'00:00',quietEnd:'00:00'}))).status,200);
assert.equal((await famPush(freq('push-subscribe',{deviceId:'device-mum-0001',memberId:'mum',label:'Mum phone',subscription:sub(2),shared:true,quietStart:'00:00',quietEnd:'00:00'}))).status,200);
const base={inviteId:'inv-tuan001',meals:[{date:'2026-11-14',type:'dinner'},{date:'2026-11-15',type:'lunch'}],guestName:'Nhà anh Tuấn',host:'Nhà Phú',adults:2,kids:1,deadline:'2026-11-13T10:00:00Z',expiresAt:'2026-11-15T12:59:00Z',maybe:'half',lang:'vi'};

// pure rules
ok(inviteFromRequest({...base,guestName:'  '},clock).error,'an invitation needs the guests\' name');
ok(inviteFromRequest({...base,expiresAt:'2026-11-12T00:00:00Z'},clock).reason==='expires_before_deadline','the link lasts at least until the answer deadline');
ok(inviteFromRequest({...base,expiresAt:'2026-12-30T00:00:00Z'},clock).reason==='expires_too_late','the link ends at most a week after the meal');
ok(inviteFromRequest({...base,meals:[{date:'2026-11-14',type:'tea'}]},clock).error,'only real meal types');
ok(inviteFromRequest({...base,guestName:'<b>Tuấn</b>'},clock).invite.guestName.indexOf('<')<0,'names cannot carry markup');

// the family creates an invitation (account required)
assert.equal((await family(freq('invite-create',base,''))).status,401);
let res=await family(freq('invite-create',base));assert.equal(res.status,200);const {token}=await res.json();ok(validToken(token)&&token.length===22,'the link carries an unguessable token (16 random bytes, 22 characters — owner: “link invite dài quá”)');ok(validToken('A'.repeat(32)),'links made before (24 bytes, 32 characters) still work');
res=await family(freq('invite-create',{...base,adults:3}));const again=await res.json();ok(again.token===token&&again.existing,'sending the same invitation again keeps the same link');
// the guest reads only the invitation's public part
res=await rsvp(rreq(token));assert.equal(res.status,200);const view=await res.json();
ok(view.guestName==='Nhà anh Tuấn'&&view.host==='Nhà Phú'&&view.meals.length===2&&view.adults===3,'the guest page shows the host, the meals and the expected numbers');
ok(!JSON.stringify(view).includes(fixture.household.id)&&!('householdId' in view)&&!('members' in view)&&!('writes' in view),'nothing else of the family is visible to the guest');
assert.equal(res.headers.get('cache-control'),'no-store');ok(res.headers.get('x-robots-tag')==='noindex','not indexed by search engines');
ok((await rsvp(rreq('A'.repeat(32)))).status===404&&(await rsvp(rreq('A'.repeat(22)))).status===404&&(await rsvp(rreq('short'))).status===404,'a wrong or malformed link finds nothing');
// answers
ok((await rsvp(rreq(token,{status:'yes',adults:2,kids:1},'https://evil.example'))).status===403,'answers only from the guest page (same origin)');
ok((await rsvp(rreq(token,{status:'yes',adults:0,kids:0}))).status===400,'“will come” needs at least one person');
ok((await rsvp(rreq(token,{status:'busy'}))).status===409,'“busy” only after saying yes / not sure');
res=await rsvp(rreq(token,{status:'yes',adults:2,kids:1,note:'đến muộn 30 phút'}));assert.equal(res.status,200);ok((await res.json()).view.response.status==='yes','the guest answers without an account');
ok(pushes.length===2&&pushes[0].title.includes('Nhà anh Tuấn')&&/Sẽ đến: 2 lớn, 1 bé/.test(pushes[0].body),'the family\'s phones are told (one per member device)');
res=await family(freq('invites'));const list=(await res.json()).invites;ok(list.length===1&&list[0].response.adults===2&&list[0].response.note==='đến muộn 30 phút'&&list[0].maybe==='half','the family sees the answer');
// after the deadline: only “can't come” / “busy”
clock=Date.parse('2026-11-13T12:00:00Z');
let r:any=await rsvp(rreq(token,{status:'maybe',adults:1,kids:0}));ok(r.status===409&&(await r.json()).reason==='deadline_passed','after the deadline the guest cannot change the numbers');
r=await rsvp(rreq(token,{status:'busy',note:'con ốm'}));ok(r.status===200&&(await r.json()).view.response.was==='yes','after the deadline the guest can still say something came up');
ok(pushes.at(-1).body.startsWith('Bận đột xuất'),'“busy” reaches the family at once');
// the link ends
clock=Date.parse('2026-11-16T00:00:00Z');r=await rsvp(rreq(token,{status:'no'}));ok(r.status===410,'an ended link takes no answers');ok((await rsvp(rreq(token))).status===200,'but still shows the invitation');
// withdrawn invitations
res=await family(freq('invite-create',{...base,inviteId:'inv-lan00001',guestName:'Chị Lan',expiresAt:'2026-11-21T12:00:00Z',deadline:'2026-11-20T12:00:00Z'}));const t2=(await res.json()).token;
assert.equal((await family(freq('invite-cancel',{inviteId:'inv-lan00001'}))).status,200);ok((await rsvp(rreq(t2,{status:'no'}))).status===410,'a withdrawn invitation takes no answers');
// too many changes in a day
res=await family(freq('invite-create',{...base,inviteId:'inv-spam0001',guestName:'Test',expiresAt:'2026-11-21T12:00:00Z',deadline:'2026-11-20T12:00:00Z'}));const t3=(await res.json()).token;
let last=0;for(let i=0;i<21;i++)last=(await rsvp(rreq(t3,{status:i%2?'yes':'maybe',adults:1,kids:0}))).status;ok(last===429,'at most 20 changes a day per invitation');
clock=Date.parse('2026-12-30T00:00:00Z');ok(forgettable({expiresAt:'2026-11-15T12:59:00Z'},clock),'records are deleted 30 days after the link ends');ok((await rsvp(rreq(token))).status===404,'a forgotten invitation is gone');
ok(replyFromRequest({...base,cancelled:false,response:null,writes:[]},{status:'yes',adults:31,kids:0},Date.parse('2026-11-10T00:00:00Z')).error,'at most 30 adults');
console.log('PASS v1.7.13 guest invitations: server');
