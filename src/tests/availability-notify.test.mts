// v1.7.3 family calendar: immediate family notification when someone saves or clears busy/away entries.
// Mock transport and in-memory stores only (no network). Covers the change detection, the message text (VI/EN, batching,
// on behalf, clear, derived portion wording), not sent to the reporter, the Availability & portions preference,
// quiet hours, dedupe on re-save, the per-family daily cap, delivery failure, and the op=state PUT trigger.
globalThis.fetch=async()=>{throw Error('Network is disabled in mocked tests')};
import assert from 'node:assert/strict';
import webPush from 'web-push';
import {availabilityChanges,availabilityMessage,notifyAvailabilityChange,cleanText} from '../netlify/lib/availability-notify.mjs';
import {createFamilyHandler} from '../netlify/functions/family.mjs';
import {memoryStores,accountFixture} from './helpers/accounts.mjs';
const members=[{id:'dad',name:'Bố'},{id:'mum',name:'Mẹ'},{id:'ti',name:'Cậu Tí'},{id:'big',name:'Bé Na'},{id:'little',name:'Bé Bi'}];
const base=()=>({version:1,members:structuredClone(members),recipes:[],weeks:{},pantry:[],preferences:{},availability:{}});
const MORNING=new Date('2026-11-02T23:00:00Z'),NIGHT=new Date('2026-11-03T11:30:00Z');// 10:00 and 22:30 in Sydney on 3 Nov
const busy=(by?:string,extra={})=>({status:'busy',deduct:false,remind:true,note:'Cầu lông',...(by?{by}:{}),...extra});
const away=(by?:string)=>({status:'away',deduct:true,remind:true,note:'',...(by?{by}:{})});
let passed=0;const ok=(name:string)=>{passed++;console.log('✓',name)};

// 1. Change detection.
{const prev=base(),next=base();next.availability={ti:{'2026-11-03':{dinner:busy('ti')}},mum:{'2026-11-06':{lunch:away()},'2026-11-07':{lunch:away()}},dad:{'2026-11-01':{dinner:busy()}}};
 const ch=availabilityChanges(prev,next,{from:'2026-11-03'});
 assert.deepEqual(ch.map(c=>[c.memberId,c.date,c.type]),[['ti','2026-11-03','dinner'],['mum','2026-11-06','lunch'],['mum','2026-11-07','lunch']],'past dates ignored, sorted by date');
 const same=structuredClone(next);same.availability.ti['2026-11-03'].dinner.note='Đổi ghi chú';same.availability.ti['2026-11-03'].dinner.updatedAt=99;same.availability.ti['2026-11-03'].dinner.by='mum';
 assert.equal(availabilityChanges(next,same,{from:'2026-11-03'}).length,0,'note/stamp/reporter-only edits and identical re-saves are quiet');
 const flipped=structuredClone(next);flipped.availability.ti['2026-11-03'].dinner.deduct=true;assert.equal(availabilityChanges(next,flipped,{from:'2026-11-03'}).length,1,'portion change is a change');
 const cleared=structuredClone(next);delete cleared.availability.ti;const c2=availabilityChanges(next,cleared,{from:'2026-11-03'});assert.equal(c2.length,1);assert.equal(c2[0].after,null);
 const ghost=structuredClone(next);ghost.availability.ghost={'2026-11-03':{dinner:busy()}};ghost.availability.ti['2026-11-03'].dinner={status:'weird'};assert.deepEqual(availabilityChanges(next,ghost,{from:'2026-11-03'}).map(c=>c.memberId),['ti'],'unknown members and invalid entries never produce text');
 ok('change detection: added / changed portion / cleared; note-only, stamps, past dates and unknown members ignored')}

// 2. Message text: one per save, batched days, derived portion wording, on behalf and clear.
{const prev=base(),next=base();next.availability={ti:{'2026-11-03':{dinner:busy('ti')}}};
 let m:any=availabilityMessage(availabilityChanges(prev,next,{from:'2026-11-03'}),next);
 assert.equal(m.body,'Cậu Tí báo bận bữa tối 3/11 — vẫn nấu phần');assert.equal(m.enBody,'Cậu Tí busy for dinner 3/11 — still cooking their portion');assert.equal(m.title,'Lịch gia đình: Cậu Tí');assert.deepEqual(m.reporters,['ti']);
 next.availability={mum:{'2026-11-06':{lunch:away('mum')},'2026-11-07':{lunch:away('mum')}}};
 m=availabilityMessage(availabilityChanges(prev,next,{from:'2026-11-03'}),next);assert.equal(m.body,'Mẹ báo vắng bữa trưa 6/11, 7/11 — không nấu phần');assert.equal(m.enBody,'Mẹ away for lunch 6/11, 7/11 — no portion');
 next.availability={dad:{'2026-11-04':{dinner:busy('dad',{deduct:true})}}};
 m=availabilityMessage(availabilityChanges(prev,next,{from:'2026-11-03'}),next);assert.match(m.body,/bận bữa tối 4\/11 — không nấu phần/,'busy with deduct=true says no portion');
 next.availability={big:{'2026-11-05':{lunch:away('mum'),dinner:away('mum')}}};
 m=availabilityMessage(availabilityChanges(prev,next,{from:'2026-11-03'}),next);assert.equal(m.body,'Mẹ báo hộ Bé Na: vắng trưa 5/11 · tối 5/11 — không nấu phần');assert.equal(m.enBody,'Mẹ on behalf of Bé Na: away lunch 5/11 · dinner 5/11 — no portion');assert.deepEqual(m.reporters,['mum']);
 const old=structuredClone(next);const none=base();m=availabilityMessage(availabilityChanges(old,none,{from:'2026-11-03'}),none,{accountMemberId:'mum'});assert.equal(m.body,'Mẹ xóa lịch của Bé Na: trưa 5/11 · tối 5/11');assert.equal(m.enBody,'Mẹ cleared Bé Na’s lunch 5/11 · dinner 5/11');
 const legacy=base();legacy.availability={ti:{'2026-11-03':{dinner:{status:'busy',deduct:false,remind:true,note:''}}}};m=availabilityMessage(availabilityChanges(base(),legacy,{from:'2026-11-03'}),legacy,{accountMemberId:'dad'});assert.deepEqual(m.reporters,['dad'],'an entry without `by` is attributed to the saving account member');assert.match(m.body,/^Bố báo hộ Cậu Tí/);
 const hostile=base();hostile.members[2].name='<b>Tí</b>\n\u0007'+'x'.repeat(80);hostile.availability={ti:{'2026-11-03':{dinner:busy('ti')}}};m=availabilityMessage(availabilityChanges(base(),hostile,{from:'2026-11-03'}),hostile);assert.doesNotMatch(m.body,/[<>\n\u0007]/);assert.ok(cleanText(hostile.members[2].name).length<=40);
 ok('message text: VI/EN, batched dates, derived portion label, on behalf, clear, legacy entries, plain bounded text')}

// 3. Delivery through the existing push pipeline (category, quiet hours, recipients, dedupe, daily cap, failures).
const makeStore=()=>{const data=new Map<string,any>([['push/vapid-keys',webPush.generateVAPIDKeys()]]);const store:any={data,get:async(k:string)=>structuredClone(data.get(k)??null),setJSON:async(k:string,v:any,o:any={})=>{if(o.onlyIfNew&&data.has(k))return{modified:false};data.set(k,v);return{modified:true}},delete:async(k:string)=>data.delete(k),list:async function*({prefix=''}={}){yield{blobs:[...data.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key}))}}};
 for(const id of ['dad','mum','ti','big'])data.set('push/subscriptions/dev-'+id+'-0001',{deviceId:'dev-'+id+'-0001',memberId:id,label:id,language:id==='dad'?'en':'vi',subscription:{endpoint:'https://fcm.googleapis.com/fcm/send/'+id,keys:{auth:'a'.repeat(22),p256dh:'a'.repeat(87)}},types:{calendar:true},quietStart:'21:00',quietEnd:'07:00'});return store};
{const store=makeStore(),sent:any[]=[],send=async(sub:any,payload:string)=>{sent.push({to:sub.endpoint.split('/').pop(),payload:JSON.parse(payload)});return{statusCode:201}};
 const prev=base(),next=base();next.availability={ti:{'2026-11-03':{dinner:busy('ti')}}};
 let r=await notifyAvailabilityChange(store,prev,next,{now:MORNING,send});
 assert.equal(r.accepted,3);assert.deepEqual(sent.map(s=>s.to).sort(),['big','dad','mum'],'everyone with a device except the reporter');
 assert.equal(sent.find(s=>s.to==='mum').payload.body,'Cậu Tí báo bận bữa tối 3/11 — vẫn nấu phần');assert.equal(sent.find(s=>s.to==='dad').payload.title,'Family calendar: Cậu Tí');assert.equal(sent[0].payload.type,'calendar');assert.equal(sent[0].payload.url,'/#today');
 ok('sent once to the other members, not to the reporter; language per device');
 sent.length=0;r=await notifyAvailabilityChange(store,prev,next,{now:new Date(MORNING.getTime()+60000),send});assert.equal(r.reason,'duplicate');assert.equal(sent.length,0);
 const resaved=structuredClone(next);resaved.availability.ti['2026-11-03'].dinner.updatedAt=Date.now();r=await notifyAvailabilityChange(store,next,resaved,{now:MORNING,send});assert.equal(r.reason,'no_change');assert.equal(sent.length,0);
 ok('no duplicates: the same change again, or re-saving identical entries, sends nothing');
 // The account member who saved is never notified either (adult reports for a child from their own phone).
 sent.length=0;const kid=base();kid.availability={little:{'2026-11-04':{breakfast:away('mum')}}};r=await notifyAvailabilityChange(store,base(),kid,{now:MORNING,send,accountMemberId:'mum'});assert.deepEqual(sent.map(s=>s.to).sort(),['big','dad','ti']);assert.match(sent.find(s=>s.to==='ti').payload.body,/^Mẹ báo hộ Bé Bi: vắng bữa sáng 4\/11/);
 ok('report on behalf of a child: reporter and saving member excluded');
 // Preference off for Mẹ.
 sent.length=0;const dev=store.data.get('push/subscriptions/dev-mum-0001');dev.types.calendar=false;const n2=base();n2.availability={dad:{'2026-11-05':{dinner:busy('dad')}}};r=await notifyAvailabilityChange(store,base(),n2,{now:MORNING,send});assert.deepEqual(sent.map(s=>s.to).sort(),['big','ti'],'device with Availability & portions off gets nothing');
 dev.types.calendar=true;
 ok('Availability & portions preference respected');
 // Quiet hours (22:30 Sydney): nothing sent, daily slot released.
 sent.length=0;const n3=base();n3.availability={big:{'2026-11-06':{dinner:away('big')}}};r=await notifyAvailabilityChange(store,base(),n3,{now:NIGHT,send});assert.equal(r.reason,'quiet_hours');assert.equal(sent.length,0);assert.ok(![...store.data.keys()].some(k=>k.startsWith('push/availability-daily/2026-11-03/3')),'slot released');
 ok('quiet hours respected (not urgent)');
 // Delivery failure: the dedupe marker is released so the next identical save may retry.
 const failing=async()=>{throw Object.assign(Error('down'),{statusCode:500})};const n4=base();n4.availability={ti:{'2026-11-07':{lunch:busy('ti')}}};r=await notifyAvailabilityChange(store,base(),n4,{now:MORNING,send:failing});assert.equal(r.reason,'delivery_failed');r=await notifyAvailabilityChange(store,base(),n4,{now:MORNING,send});assert.equal(r.accepted,3);
 ok('delivery failure releases the dedupe marker');
 // Daily cap per family.
 const capped=makeStore();let n=0;for(let i=0;i<4;i++){const s=base();s.availability={ti:{['2026-11-'+String(10+i)]:{dinner:busy('ti')}}};r=await notifyAvailabilityChange(capped,base(),s,{now:MORNING,send,maxPerDay:3});if(r.accepted)n++}assert.equal(n,3);assert.equal(r.reason,'daily_limit');
 ok('per-family daily cap');
 // Not configured / nobody else / no previous copy.
 const bare=makeStore();bare.data.delete('push/vapid-keys');assert.equal((await notifyAvailabilityChange(bare,base(),next,{now:MORNING,send})).reason,'not_configured');
 const solo={...base(),members:[members[0]]};solo.availability={dad:{'2026-11-03':{dinner:busy('dad')}}};assert.equal((await notifyAvailabilityChange(store,{...base(),members:[members[0]]},solo,{now:MORNING,send})).reason,'no_recipient');
 assert.equal((await notifyAvailabilityChange(store,null,next,{now:MORNING,send})).reason,'no_change');
 ok('not configured, single-member family and first write send nothing')}

// 4. Trigger: the family-state write (op=state PUT, merging client) notifies in the background; identical re-save is quiet.
{const getStoreFn=memoryStores(),fixture=await accountFixture(getStoreFn),sent:any[]=[],pushSend=async(sub:any,payload:string)=>{sent.push({to:sub.endpoint.split('/').pop(),payload:JSON.parse(payload)});return{statusCode:201}};
 const family=createFamilyHandler({getStoreFn,pushSend,reminderThrottleMs:1e12}),store=fixture.store;
 await store.setJSON('push/vapid-keys',webPush.generateVAPIDKeys());
 for(const id of ['dad','mum','ti'])await store.setJSON('push/subscriptions/dev-'+id+'-0002',{accountUsername:'fixtureowner',sharedMember:true,deviceId:'dev-'+id+'-0002',memberId:id,label:id,language:'vi',subscription:{endpoint:'https://fcm.googleapis.com/fcm/send/'+id,keys:{auth:'a'.repeat(22),p256dh:'a'.repeat(87)}},types:{calendar:true},quietStart:'00:00',quietEnd:'00:00'});
 const put=async(state:any,etag:any,sync=2)=>{const pending:any[]=[];const res=await family(new Request('https://test.example/.netlify/functions/family?op=state',{method:'PUT',headers:{Origin:'https://test.example',Cookie:fixture.cookie,'Content-Type':'application/json'},body:JSON.stringify({state,etag,...(sync?{sync}:{})})}),{waitUntil:(p:any)=>pending.push(p)});await Promise.all(pending);return{status:res.status,data:await res.json()}};
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Australia/Sydney',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),later=(n:number)=>{const d=new Date(today+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
 let s=base();let res=await put(s,null);assert.equal(res.status,200);assert.equal(sent.length,0,'first write: no previous copy, no notice');
 s=structuredClone(s);s.availability={ti:{[later(1)]:{dinner:busy('ti')}}};res=await put(s,res.data.etag);assert.equal(res.status,200);
 assert.deepEqual(sent.map(x=>x.to).sort(),['dad','mum']);assert.match(sent[0].payload.body,/^Cậu Tí báo bận bữa tối /);
 sent.length=0;s=structuredClone(s);s.availability.ti[later(1)].dinner.updatedAt=Date.now();res=await put(s,res.data.etag);assert.equal(res.status,200);assert.equal(sent.length,0,'identical re-save: quiet');
 s=structuredClone(s);s.availability.mum={[later(2)]:{lunch:away('mum')}};res=await put(s,res.data.etag,0);assert.equal(res.status,200);assert.equal(sent.length,0,'non-merging (older) clients do not trigger notices');
 ok('op=state PUT triggers one background notice; identical re-save and legacy writes are quiet')}
console.log(`Availability notification tests passed (${passed}).`);
