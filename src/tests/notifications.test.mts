import assert from 'node:assert/strict';
import {accountFixture,memoryStores} from './helpers/accounts.mjs';
import {createFamilyHandler} from '../netlify/functions/family.mjs';
import {runReminders} from '../netlify/functions/reminders.mjs';
import {trimToBytes,pushPayload,PUSH_PAYLOAD_LIMIT,deviceBelongs,urgentBypasses} from '../netlify/lib/push.mjs';
// All push transport is mocked; no network traffic. Synthetic family data only.
const base=memoryStores();let failIndex=false,failList=false;
const getStoreFn=opts=>{const s=base(opts);if(opts.name!=='bep-family-data')return s;return{...s,get:s.get.bind(s),getWithMetadata:s.getWithMetadata.bind(s),delete:s.delete.bind(s),set:s.set.bind(s),async setJSON(k,v,o){if(failIndex&&k.endsWith('/family-alert-index'))return{modified:false};return s.setJSON(k,v,o)},list(o){if(failList)throw Error('list unavailable');return s.list(o)}}};
const f=await accountFixture(getStoreFn),authStore=getStoreFn({name:'bep-accounts'});
let mode='ok';const sent=[];const pushSend=async(sub,payload)=>{if(mode==='403')throw Object.assign(Error('forbidden'),{statusCode:403,body:'invalid credentials'});if(mode==='410')throw Object.assign(Error('gone'),{statusCode:410});if(mode==='boom')throw Error('socket hang up');sent.push({endpoint:sub.endpoint,payload:JSON.parse(payload),bytes:Buffer.byteLength(payload)});return{statusCode:201}};
const handler=createFamilyHandler({getStoreFn,pushSend});
const call=async(op,body,cookie=f.cookie)=>{const r=await handler(new Request('https://test.example/.netlify/functions/family?op='+op,{method:body?'POST':'GET',headers:{Origin:'https://test.example',Cookie:cookie,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}));return{status:r.status,data:await r.json()}};
const accounts=(op,body,cookie=f.cookie)=>f.accounts(f.request(op,body,cookie));
await f.store.setJSON('state',{version:1,members:[{id:'dad',name:'Bố'},{id:'mum',name:'Mẹ'},{id:'grandma',name:'Bà'}],recipes:[],weeks:{},pantry:[],preferences:{},receipts:[]});
const sub=n=>({endpoint:'https://fcm.googleapis.com/fcm/send/synthetic-'+n,keys:{auth:'a'.repeat(22),p256dh:'b'.repeat(87)}});
// Precise reasons before configuration and before a device exists.
let r=await call('push-test',{deviceId:'device-owner-01'});assert.equal(r.data.reason,'not_configured');
assert.equal((await call('push-key',{})).status,200);
r=await call('push-test',{deviceId:'device-owner-01'});assert.equal(r.data.reason,'no_device');
// Root cause: an owner created the family, so the account has no linked member. Subscribing links it, and the test arrives.
assert.equal((await authStore.get('families/'+f.household.id)).members.fixtureowner.memberId,null);
r=await call('push-subscribe',{deviceId:'device-owner-01',memberId:'dad',label:'Owner phone',subscription:sub(1),urgentPolicy:'v2',urgentBypass:true});assert.equal(r.status,200);assert.equal(r.data.linkedMemberId,'dad');
assert.equal((await authStore.get('families/'+f.household.id)).members.fixtureowner.memberId,'dad','account linked server-side');
r=await call('push-test',{deviceId:'device-owner-01'});assert.equal(r.data.reason,'sent');assert.equal(r.data.accepted,1);const firstTag=sent.at(-1).payload.tag;
r=await call('push-test',{deviceId:'device-owner-01'});assert.notEqual(sent.at(-1).payload.tag,firstTag,'each test notification has a unique tag');
console.log('PASS unlinked owner is linked on subscribe and receives the test push; reasons not_configured/no_device/sent');
// A phone for a member without an account (shared/grandparent) is registered explicitly by an owner/editor and receives.
r=await call('push-subscribe',{deviceId:'device-grandma-01',memberId:'grandma',subscription:sub(2)});assert.equal(r.status,409);assert.equal(r.data.reason,'member_mismatch');
r=await call('push-subscribe',{deviceId:'device-grandma-01',memberId:'grandma',label:'Máy của Bà',subscription:sub(2),shared:true});assert.equal(r.status,200);assert.equal(r.data.shared,true);
r=await call('alert-send',{id:'alert-grandma-0001',message:'Bà ơi, con về muộn 😊',targets:['grandma']});assert.equal(r.status,200);assert.equal(r.data.saved,true);assert.equal(r.data.push.reason,'sent');assert(sent.at(-1).endpoint.endsWith('synthetic-2'));
const status=await call('push-status');assert.deepEqual(status.data.memberDevices.sort(),['dad','grandma']);assert.equal(status.data.linkedMemberId,'dad');
console.log('PASS account-free member device registered by the owner receives urgent messages');
// A second account cannot claim a member already linked to someone else.
const invite=await (await accounts('invite',{role:'editor'})).json();const reg=await accounts('register',{username:'mumacct',name:'Mum account',password:'synthetic-recipient-passphrase-42'},'');const mumCookie=reg.headers.get('set-cookie').split(';')[0];assert.equal((await accounts('join',{code:invite.code},mumCookie)).status,200);
r=await call('push-subscribe',{deviceId:'device-mum-0001',memberId:'dad',subscription:sub(3)},mumCookie);assert.equal(r.status,409);assert.equal(r.data.reason,'member_linked_other');
r=await call('push-subscribe',{deviceId:'device-mum-0001',memberId:'mum',subscription:sub(3)},mumCookie);assert.equal(r.status,200);assert.equal(r.data.linkedMemberId,'mum');
r=await call('push-subscribe',{deviceId:'device-mum-0002',memberId:'dad',subscription:sub(4),shared:true},mumCookie);assert.equal(r.status,409);assert.equal(r.data.reason,'member_has_account','shared device cannot impersonate a member with an account');
assert.equal((await accounts('link-member',{memberId:'dad'},mumCookie)).status,409,'link-member is conflict-safe too');
console.log('PASS member linking is conflict-safe (409 member_linked_other / member_has_account)');
// Delivery failures: 403 marks the device for re-registration; 410 deletes it; payload trimmed by bytes.
mode='403';r=await call('push-test',{deviceId:'device-owner-01'});assert.equal(r.data.reason,'needs_resubscribe');
mode='ok';r=await call('push-test',{deviceId:'device-owner-01'});assert.equal(r.data.reason,'needs_resubscribe','no send until the device re-registers');assert((await call('push-status')).data.devices.find(d=>d.deviceId==='device-owner-01').needsResubscribe);
r=await call('push-subscribe',{deviceId:'device-owner-01',memberId:'dad',label:'Owner phone',subscription:sub(1),urgentPolicy:'v2',urgentBypass:true});assert.equal(r.status,200);r=await call('push-test',{deviceId:'device-owner-01'});assert.equal(r.data.reason,'sent');
mode='boom';r=await call('push-test',{deviceId:'device-owner-01'});assert.equal(r.data.reason,'delivery_failed');assert.equal(r.data.failed,1);
mode='410';r=await call('push-test',{deviceId:'device-grandma-01'});assert.equal(r.data.reason,'delivery_failed');mode='ok';r=await call('push-test',{deviceId:'device-grandma-01'});assert.equal(r.data.reason,'no_device','410 removes the subscription');
const long='Nhờ mua rau thơm, hành lá 🥬🧄🍜 '.repeat(200),payload=pushPayload({type:'urgent',title:'Bố nhắn khẩn 🚨',body:long,url:'/#today'},'vi');assert(Buffer.byteLength(payload)<=PUSH_PAYLOAD_LIMIT);const parsed=JSON.parse(payload);assert(parsed.body.endsWith('…'));assert(!/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(parsed.body),'no split surrogate pair');assert.equal(trimToBytes('ngắn',100),'ngắn');
r=await call('alert-send',{id:'alert-long-000001',message:'😊'.repeat(240),targets:['dad']});assert.equal(r.data.push.reason,'sent');assert(sent.at(-1).bytes<=PUSH_PAYLOAD_LIMIT);
console.log('PASS 403 needs re-registration, 410 removal, delivery_failed count and byte-safe payload trimming');
{const {replyMessage}=await import('../netlify/lib/feedback.mjs');const vi=JSON.parse(pushPayload({...replyMessage},'vi')),en=JSON.parse(pushPayload({...replyMessage},'en'));
 assert.equal(vi.url,'/#today?lb=mine','feedback reply opens “Góp ý của tôi”');assert.equal(en.url,'/#today?lb=mine');assert.equal(vi.body,'Chạm để đọc câu trả lời.');assert.equal(en.body,'Tap to read the reply.');
 for(const bad of ['/#today?lb=other','/#today?lb=mine&x=1','/#studio?lb=mine'])assert.equal(JSON.parse(pushPayload({type:'feedback',title:'x',body:'y',url:bad},'vi')).url,'/#shopping',bad+' is not passed on (server fallback)')}
console.log('PASS feedback reply link opens “Góp ý của tôi”; other links are not passed on');
// Urgent message persistence: an index write failure still saves + pushes; a same-id retry re-indexes it. Push failure is never 503.
failIndex=true;r=await call('alert-send',{id:'alert-flaky-00001',message:'Tắt bếp giúp mẹ',targets:['dad']});assert.equal(r.status,200);assert.equal(r.data.saved,true);assert.equal(r.data.indexed,false);
failIndex=false;assert(!(await call('alerts')).data.alerts.some(a=>a.id==='alert-flaky-00001'));
r=await call('alert-send',{id:'alert-flaky-00001',message:'Tắt bếp giúp mẹ',targets:['dad']});assert.equal(r.status,200);assert.equal(r.data.duplicate,true);assert((await call('alerts')).data.alerts.some(a=>a.id==='alert-flaky-00001'),'duplicate retry re-adds the saved message to the index');
mode='boom';r=await call('alert-send',{id:'alert-pushfail-01',message:'Mất mạng push',targets:['dad']});assert.equal(r.status,200);assert.equal(r.data.push.reason,'delivery_failed');assert.equal(r.data.alert.pushStatus,'not_sent');mode='ok';
failList=true;r=await call('alert-send',{id:'alert-pushfail-02',message:'Thiết bị không đọc được',targets:['dad']});failList=false;assert.equal(r.status,200);assert.equal(r.data.push.reason,'delivery_failed');assert((await call('alerts')).data.alerts.some(a=>a.id==='alert-pushfail-02'));
console.log('PASS urgent messages are committed before push; push failure returns saved:true; duplicate retry re-indexes');
// Scheduled reminders run for account households (Sunday 18:05 Sydney weekly plan reminder).
const before=sent.length,run=await runReminders(getStoreFn,new Date('2026-11-01T07:05:00Z'),{send:pushSend});assert.equal(run.families,1);assert(run.accepted>=1,'weekly reminder reaches the account household');assert(sent.slice(before).every(x=>x.payload.type==='weekly'));
console.log('PASS scheduled reminders loop account households with scoped devices');
// Removing an account from the family stops its devices and its membership index.
await accounts('role',{username:'mumacct',role:'remove'});r=await call('alert-send',{id:'alert-after-remove',message:'Thử',targets:['mum']});assert.equal(r.data.push.reason,'no_device');assert(!(await authStore.get('users/mumacct')).households?.[f.household.id]);
assert.equal(deviceBelongs({accountUsername:'x',memberId:'a'},{x:{memberId:'b'}}),false);assert.equal(deviceBelongs({accountUsername:'x',memberId:'a',sharedMember:true},{x:{memberId:'b'}}),true);assert.equal(urgentBypasses({}),true);assert.equal(urgentBypasses({urgentPolicy:'v2',urgentBypass:false}),false);
console.log('PASS removed accounts stop receiving; membership index maintained on removal');
