// v1.7.19 — owner, 12 Nov 2026 (Sydney time): meal times in Bếp của nhà mình, a cooking reminder for every planned meal with a time,
// a thaw reminder the evening before, and one place to edit the times (pop-up “Làm đủ 4 ý, gộp v1.7.19”). Synthetic data only;
// all push transport is mocked.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import webPush from 'web-push';
import {cookTiming,mealTimeOf,thawNeeds,automaticMessages,scheduledReminders,pushTypes} from '../netlify/lib/push.mjs';
const ok=(c:any,m:string)=>{assert.ok(c,m);console.log('PASS',m)};
const EMOJI=/\p{Extended_Pictographic}/u;
// the browser copy (dist/meal-times.js) with the few globals it needs
const ctx:any=vm.createContext({console,Intl,Date,globalThis:{} as any,MEAL_TYPES:['breakfast','snackAm','lunch','snack','dinner'],mealName:(t:string)=>t,esc:(t:string)=>String(t)});
ctx.globalThis=ctx;vm.runInContext(fs.readFileSync('dist/meal-times.js','utf8'),ctx);
const recipes=[{id:'pho',name:'Phở bò',time:90,prepTime:30,ingredients:[{id:'beef',qty:500}]},{id:'ga',name:'Gà kho gừng',time:35,ingredients:[{id:'chicken',qty:650},{id:'ginger',qty:30}]},{id:'rau',name:'Rau muống xào',time:10,ingredients:[{id:'morningGlory',qty:300}]},{id:'chao',name:'Cháo',time:20,ingredients:[{id:'rice',qty:100}]}];
const dish=(id:string,extra:any={})=>({...JSON.parse(JSON.stringify(recipes.find(r=>r.id===id))),...extra});
const meal=(ids:string[],extra:any={})=>({recipes:ids.map(id=>dish(id)),cooked:false,...extra});

// 1. data shape: old states, migration of dinnerTime, clearing, older devices, both copies agree
{const old={preferences:{dinnerTime:'18:30'}};
 ok(mealTimeOf(old,'dinner')==='18:30'&&mealTimeOf(old,'lunch')===''&&mealTimeOf(old,'breakfast')==='','an older state: dinner from dinnerTime, other meals not set (no 12:00 assumed)');
 const cleared={preferences:{dinnerTime:'18:30',mealTimes:{dinner:''}}};ok(mealTimeOf(cleared,'dinner')==='','dinner cleared by the family: not set, although dinnerTime stays for older devices');
 const olderDevice={preferences:{dinnerTime:'19:15',mealTimes:{dinner:'18:30',lunch:'12:30'}}};ok(mealTimeOf(olderDevice,'dinner')==='19:15','a dinner time changed on an older device (dinnerTime only) still counts');
 const states=[old,cleared,olderDevice,{preferences:{}},{preferences:{dinnerTime:'bad',mealTimes:{dinner:'07:00',snack:'25:00',snackAm:'10:00'}}},{preferences:{mealTimes:[]}},{}];
 for(const s of states)for(const t of ['breakfast','snackAm','lunch','snack','dinner'])assert.equal(ctx.mealTimeOf(s,t),mealTimeOf(s,t),JSON.stringify(s)+' '+t);
 ok(true,'the app and the server read meal times the same way')}
{const s:any={preferences:{dinnerTime:'18:30'}};
 assert.equal(ctx.setMealTimes(s,{breakfast:'07:00',lunch:'',dinner:'19:00'}),2);ok(s.preferences.mealTimes.breakfast==='07:00'&&!('lunch' in s.preferences.mealTimes)&&s.preferences.dinnerTime==='19:00'&&s.preferences.mealTimes.dinner==='19:00','saving writes only what changed; dinner also writes dinnerTime for older devices');
 ctx.setMealTimes(s,{dinner:''});ok(ctx.mealTimeOf(s,'dinner')===''&&s.preferences.dinnerTime==='19:00','clearing dinner: “Chưa đặt”, dinnerTime kept valid (HH:MM) for older devices');
 assert.throws(()=>ctx.setMealTimes(s,{lunch:'12h'}));ok(!('lunch' in s.preferences.mealTimes),'a time that is not hours:minutes is refused, nothing saved');
 ok(ctx.validMealTimes(s.preferences)&&ctx.validMealTimes({})&&!ctx.validMealTimes({mealTimes:{tea:'15:00'}})&&!ctx.validMealTimes({mealTimes:{lunch:'24:00'}})&&!ctx.validMealTimes({mealTimes:'18:30'})&&!ctx.validMealTimes({thawReminderTime:'8pm'})&&ctx.validMealTimes({thawReminderTime:'20:30'}),'validator: known meals, HH:MM or empty; old states without it stay valid');
{const r:any={preferences:{}};ok(ctx.reminderSettingOf(r,'thawReminderTime')==='20:00'&&ctx.reminderSettingOf(r,'cookEarliestTime')==='08:00','thaw time and “Không nhắc nấu trước” start at 20:00 and 08:00');
  assert.equal(ctx.setMealTimes(r,{thawReminderTime:'20:00',cookEarliestTime:'08:00'}),0);ok(!('thawReminderTime' in r.preferences)&&!('cookEarliestTime' in r.preferences),'left at the starting values: nothing written');
  assert.equal(ctx.setMealTimes(r,{thawReminderTime:'19:30',cookEarliestTime:'06:00'}),2);ok(r.preferences.thawReminderTime==='19:30'&&r.preferences.cookEarliestTime==='06:00'&&ctx.validMealTimes(r.preferences),'the family changes both');
  assert.throws(()=>ctx.setMealTimes(r,{cookEarliestTime:''}));assert.throws(()=>ctx.setMealTimes(r,{thawReminderTime:''}));ok(r.preferences.cookEarliestTime==='06:00','both are required: an empty value is refused');
  ok(!ctx.validMealTimes({cookEarliestTime:'6am'})&&ctx.validMealTimes({cookEarliestTime:'05:45'}),'validator checks “Không nhắc nấu trước”')}
 ok(JSON.stringify(ctx.mealTimeTypes({preferences:{enabledMeals:['breakfast','dinner']}}))===JSON.stringify(['breakfast','dinner'])&&JSON.stringify(ctx.mealTimeTypes({preferences:{familyPlanner:false,dinnerTime:'18:30'}}))===JSON.stringify(['lunch','dinner'])&&JSON.stringify(ctx.mealTimeTypes({preferences:{enabledMeals:['dinner'],mealTimes:{snack:'15:30'}}}))===JSON.stringify(['snack','dinner']),'only the meals the family uses are listed, plus any meal that already has a time')}

// 2. the start time for any meal; an early breakfast gets no start after the meal
ok(cookTiming({recipes},meal(['pho']),'12:30').start==='10:15','lunch 12:30 − 120 − 15 = 10:15');
ok(cookTiming({recipes},meal(['chao']),'')===null&&cookTiming({recipes},meal(['chao']),undefined)===null,'a meal without a time: nothing is computed (no 18:30 assumed)');
{const t:any=cookTiming({recipes},meal(['chao']),'07:30');ok(t.start===null&&t.early===true,'breakfast 07:30: the 08:00 bound would be after the meal, so no start is given');
 const c:any=vm.createContext({console});vm.runInContext(fs.readFileSync('dist/cook-timing.js','utf8').replace(/\(function\s*\(\)\s*\{[\s\S]*$/,''),c);
 for(const prefs of [{},{cookEarliestTime:'06:00'},{cookEarliestTime:'09:30'},{cookEarliestTime:'bad'}])for(const [ids,at] of [[['pho'],'12:30'],[['chao'],'07:30'],[['chao'],'08:40'],[['rau','ga'],'18:00'],[['pho'],'']] as const)assert.deepEqual(JSON.parse(JSON.stringify(c.cookTiming({recipes,preferences:prefs},meal([...ids]),at))),JSON.parse(JSON.stringify(cookTiming({recipes,preferences:prefs},meal([...ids]),at))));
 const e6:any=cookTiming({recipes,preferences:{cookEarliestTime:'06:00'}},meal(['chao']),'07:30');ok(e6.start==='06:45'&&!e6.early,'“Không nhắc nấu trước” 06:00: breakfast 07:30 − 20 − 15 = 06:55 → 06:45');
 ok(cookTiming({recipes,preferences:{cookEarliestTime:'09:30'}},meal(['pho']),'12:30').start==='10:15'&&cookTiming({recipes,preferences:{cookEarliestTime:'11:00'}},meal(['pho']),'12:30').start==='11:00','a later bound moves the start to that time, never before it');
 ok(true,'the app and the server make the same sum for every meal')}

// 3. the scheduled run: a store, one device, a day swept every 15 minutes
const sub=(n:number)=>({endpoint:'https://fcm.googleapis.com/fcm/send/synthetic-mt-'+n,keys:{auth:'a'.repeat(22),p256dh:'b'.repeat(87)}});
function memory(state:any,devs:any[]=[{deviceId:'dev-mt-1',memberId:'mum',subscription:sub(1),types:{}}]){const data=new Map<string,any>([['push/vapid-keys',webPush.generateVAPIDKeys()],['state',state]]);for(const d of devs)data.set('push/subscriptions/'+d.deviceId,d);
 return{data,store:{get:async(k:string)=>data.get(k)??null,setJSON:async(k:string,v:any,o:any={})=>{if(o.onlyIfNew&&data.has(k))return{modified:false};data.set(k,v);return{modified:true}},delete:async(k:string)=>data.delete(k),list:async function*(o:any={}){yield{blobs:[...data.keys()].filter(k=>k.startsWith(o.prefix||'')).map(key=>({key}))}}} as any}}
async function sweep(state:any,fromUtc:string,hours=24,devs?:any[]){const {store,data}=memory(state,devs);const sent:any[]=[];const send=async(s:any,p:string)=>{sent.push({at:null,endpoint:s.endpoint,...JSON.parse(p)});return{statusCode:201}};
 const t0=Date.parse(fromUtc);for(let i=0;i<=hours*4;i++){const now=new Date(t0+i*15*60000);const before=sent.length;await scheduledReminders(store,now,{send});for(let k=before;k<sent.length;k++)sent[k].at=now.toISOString()}
 // a second pass over the same day sends nothing again
 const n=sent.length;for(let i=0;i<=hours*4;i+=2)await scheduledReminders(store,new Date(t0+i*15*60000),{send});return{sent,again:sent.length-n,data}}
const base=(weeks:any,prefs:any={},extra:any={})=>({members:[{id:'mum',name:'Mẹ'}],recipes,preferences:{quietStart:'00:00',quietEnd:'00:00',...prefs},weeks,pantry:[],receipts:[],...extra});
{// Mon 9 Nov 2026 (AEDT, +11): breakfast 07:30 (early, no reminder), lunch 12:30, snack planned without a time, dinner 18:30
 const date='2026-11-09',st=base({'2026-11-09':{days:{[date]:{breakfast:meal(['chao']),lunch:meal(['pho']),snack:meal(['rau'],{on:true}),dinner:meal(['ga','rau'])}}}},{dinnerTime:'18:30',mealTimes:{breakfast:'07:30',lunch:'12:30',dinner:'18:30'}});
 const {sent,again}=await sweep(st,'2026-11-08T13:00:00Z');const prep=sent.filter(x=>x.type==='prep');
 ok(prep.length===2,`two cooking reminders that day (${prep.map(p=>p.title).join(' | ')})`);
 ok(prep[0].title==='Đến giờ nấu bữa trưa T2 9/11 — bắt đầu lúc 10:15'&&prep[0].at==='2026-11-08T23:15:00.000Z'&&/^Ăn lúc 12:30 · 1 món · lâu nhất Phở bò 120 phút \(chuẩn bị 30 \+ nấu 90\)/.test(prep[0].body),'lunch: “Đến giờ nấu bữa trưa — bắt đầu lúc 10:15”, at 10:15 Sydney');
 ok(prep[1].title==='Đến giờ nấu bữa tối T2 9/11 — bắt đầu lúc 17:30'&&prep[1].at==='2026-11-09T06:30:00.000Z','dinner 18:30 − 45 − 15 = 17:30, at 17:30 Sydney');
 ok(!prep.some(p=>/bữa sáng|bữa phụ chiều/.test(p.title)),'no reminder for the early breakfast or for the snack without a time');
 ok(again===0,'no duplicates when the run repeats');ok(sent.every(p=>!EMOJI.test(p.title+p.body)),'no emoji');
 const {sent:en}=await sweep(st,'2026-11-08T13:00:00Z',24,[{deviceId:'dev-mt-en',memberId:'mum',subscription:sub(9),types:{},language:'en'}]);
 ok(en.filter(x=>x.type==='prep').map(x=>x.title).join(' | ')==='Time to cook lunch Mon 9/11 — start at 10:15 | Time to cook dinner Mon 9/11 — start at 17:30','English device: “Time to cook lunch — start at 10:15”')}
{const date='2026-11-09',st=base({'2026-11-09':{days:{[date]:{breakfast:meal(['chao'])}}}},{dinnerTime:'18:30',mealTimes:{breakfast:'07:30'},cookEarliestTime:'06:00'});
 // v1.7.19 (owner pop-up, 13 Nov 2026): cooking reminders arrive during quiet hours by default; a phone that turned the switch off is not woken
 const {sent:dflt}=await sweep(st,'2026-11-08T13:00:00Z');const dp=dflt.filter(x=>x.type==='prep');ok(dp.length===1&&dp[0].at==='2026-11-08T19:45:00.000Z','a phone in its quiet hours (21:00–07:00) still gets the 06:45 cooking reminder by default');
 const {sent:quiet}=await sweep(st,'2026-11-08T13:00:00Z',24,[{deviceId:'dev-mt-quiet',memberId:'mum',subscription:sub(8),types:{},mealQuietBypass:false}]);ok(!quiet.some(x=>x.type==='prep'),'a phone that turned off “Nhắc nấu cả trong giờ yên lặng” is not woken at 06:45 in its quiet hours');
 const {sent}=await sweep(st,'2026-11-08T13:00:00Z',24,[{deviceId:'dev-mt-early',memberId:'mum',subscription:sub(7),types:{},quietStart:'22:00',quietEnd:'06:00'}]);const p=sent.filter(x=>x.type==='prep');ok(p.length===1&&p[0].at==='2026-11-08T19:45:00.000Z'&&p[0].title==='Đến giờ nấu bữa sáng T2 9/11 — bắt đầu lúc 06:45',`the family set “Không nhắc nấu trước” 06:00: breakfast 07:30 is reminded at 06:45 Sydney ${JSON.stringify(p.map(x=>[x.at,x.title]))}`)}
{const date='2026-11-09',st=base({'2026-11-09':{days:{[date]:{breakfast:meal(['chao']),lunch:meal(['pho']),dinner:meal(['ga'])}}}},{dinnerTime:'18:30',mealTimes:{dinner:''}});
 const {sent}=await sweep(st,'2026-11-08T13:00:00Z');ok(!sent.some(x=>x.type==='prep'),'no meal has a time (dinner cleared): no cooking reminder at all, not even the 17:00 one')}
{// DST: AEDT starts Sun 4 Oct 2026 (02:00 → 03:00); AEST returns Sun 4 Apr 2027 (03:00 → 02:00)
 for(const [date,week,utc] of [['2026-10-04','2026-09-28','2026-10-04T05:15:00.000Z'],['2027-04-04','2027-03-29','2027-04-04T06:15:00.000Z'],['2026-10-03','2026-09-28','2026-10-03T06:15:00.000Z']] as const){
  const st=base({[week]:{days:{[date]:{dinner:meal(['pho'])}}}},{dinnerTime:'18:30'});const {sent}=await sweep(st,new Date(Date.parse(date+'T00:00:00Z')-14*3600000).toISOString(),26);
  const p=sent.filter(x=>x.type==='prep');ok(p.length===1&&p[0].at===utc&&/bắt đầu lúc 16:15$/.test(p[0].title),`${date}: 16:15 Sydney time (${p[0]?.at}) on a daylight-saving change day`)}}
{// a family in Việt Nam time: 18:30 in Ho Chi Minh City is 11:30 UTC
 const date='2026-11-10',st=base({'2026-11-09':{days:{[date]:{dinner:meal(['pho'])}}}},{dinnerTime:'18:30',timezone:'Asia/Ho_Chi_Minh'});const {sent}=await sweep(st,'2026-11-09T17:00:00Z');
 const p=sent.filter(x=>x.type==='prep');ok(p.length===1&&p[0].at==='2026-11-10T09:15:00.000Z','the family time zone (Việt Nam): 16:15 local')}
{// week starting on Saturday: a day kept under a Saturday key is still found
 const date='2026-11-14',st=base({'2026-11-14':{days:{[date]:{lunch:meal(['pho'])}}}},{weekStartDay:6,mealTimes:{lunch:'12:30'},dinnerTime:'18:30'});const {sent}=await sweep(st,'2026-11-13T13:00:00Z');
 ok(sent.filter(x=>x.type==='prep').length===1,'a week starting on Saturday: the Saturday lunch reminder comes')}

// 4. thaw: the evening before, only when a planned dish needs something in the freezer
{const tomorrow='2026-11-10',freezer=[{id:'lot-1',ingredient:'chicken',qty:400,place:'freezer',expiry:'2026-12-01'}];
 const days=(d:any)=>({'2026-11-09':{days:{'2026-11-09':{dinner:meal(['rau'])},[tomorrow]:d}}});
 const st=base(days({lunch:meal(['pho']),dinner:meal(['ga','rau'])}),{dinnerTime:'18:30'},{pantry:freezer});
 ok(JSON.stringify(thawNeeds(st,tomorrow))===JSON.stringify([{type:'dinner',dishes:['Gà kho gừng']}]),'only the dish that needs a freezer item is named');
 const {sent,again}=await sweep(st,'2026-11-08T13:00:00Z',30);const th=sent.filter(x=>x.type==='thaw');
 ok(th.length===1&&th[0].at==='2026-11-09T09:00:00.000Z','one thaw reminder, at 20:00 Sydney the evening before');
 ok(th[0].title==='Rã đông tối nay cho ngày mai T3 10/11'&&th[0].body==='Chuyển đồ ngăn đông xuống ngăn mát cho bữa tối 18:30: Gà kho gừng.'&&!EMOJI.test(th[0].title+th[0].body)&&th[0].url==='/#today?d=2026-11-10',`thaw text in Vietnamese, no emoji (${th[0].title} — ${th[0].body})`);
 ok(again===0,'sent once');
 const {sent:en}=await sweep(st,'2026-11-09T08:00:00Z',2,[{deviceId:'dev-mt-en',memberId:'mum',subscription:sub(9),types:{},language:'en'}]);const e=en.find(x=>x.type==='thaw');
 ok(e&&e.title==='Thaw tonight for tomorrow Tue 10/11'&&e.body==='Move freezer food to the fridge for dinner 18:30: Gà kho gừng.','thaw text in English');
 const {sent:t2}=await sweep({...st,preferences:{...st.preferences,thawReminderTime:'19:00'}},'2026-11-09T07:00:00Z',3);ok(t2.find(x=>x.type==='thaw')?.at==='2026-11-09T08:00:00.000Z','the family can choose the thaw time (19:00)');
 const fridge=base(days({dinner:meal(['ga'])}),{dinnerTime:'18:30'},{pantry:[{...freezer[0],place:'fridge'}]}),expired=base(days({dinner:meal(['ga'])}),{dinnerTime:'18:30'},{pantry:[{...freezer[0],expiry:'2026-11-09'}]}),empty=base(days({dinner:meal(['ga'])}),{dinnerTime:'18:30'},{pantry:[{...freezer[0],qty:0}]});
 const cooked=base(days({dinner:meal(['ga'],{cooked:true})}),{dinnerTime:'18:30'},{pantry:freezer}),batch=base(days({dinner:{recipes:[dish('ga',{batchId:'b1'})],cooked:false}}),{dinnerTime:'18:30'},{pantry:freezer});
 for(const [name,s] of [['in the fridge',fridge],['expired before the meal',expired],['used up',empty],['already cooked',cooked],['a weekend batch dish',batch]] as const)assert.equal(thawNeeds(s,tomorrow).length,0,name);
 ok(true,'no thaw reminder when the item is in the fridge, expired, used up, the meal is cooked, or the dish is from a batch');
 const noTime=base(days({breakfast:meal(['ga'])}),{dinnerTime:'18:30'},{pantry:freezer});ok(thawNeeds(noTime,tomorrow).length===1,'thawing is about the freezer: a planned breakfast without a time is still reminded the evening before')}

// 5. each device chooses; shoppers do not get it; meal reminders do not use up the two daily automatic reminders
{ok(pushTypes.includes('thaw')&&pushTypes.includes('prep'),'“Nhắc giờ nấu” (prep) and “Nhắc rã đông” (thaw) are per-device types');
 const date='2026-11-09',st=base({'2026-11-09':{days:{[date]:{dinner:meal(['ga'])},'2026-11-10':{dinner:meal(['ga'])}}}},{dinnerTime:'18:30'},{pantry:[{id:'lot-1',ingredient:'chicken',qty:400,place:'freezer',expiry:''}]});
 const devs=[{deviceId:'dev-off',memberId:'mum',subscription:sub(2),types:{prep:false,thaw:false}},{deviceId:'dev-old',memberId:'mum',subscription:sub(3),types:{prep:true}},{deviceId:'dev-shop',memberId:'mum',subscription:sub(4),types:{},role:'shopper'}];
 const {sent,data}=await (async()=>{const m=memory(st,devs);const sent:any[]=[];const send=async(s:any,p:string)=>{sent.push({endpoint:s.endpoint,...JSON.parse(p)});return{statusCode:201}};
  for(const d of devs)for(const n of [0,1])m.data.set(`push/daily/${date}/${d.deviceId}/${n}`,{at:'x'});
  await scheduledReminders(m.store,new Date('2026-11-09T06:30:00Z'),{send});await scheduledReminders(m.store,new Date('2026-11-09T09:00:00Z'),{send});return{sent,data:m.data}})();
 const to=(n:number)=>sent.filter(x=>x.endpoint.endsWith('-'+n)).map(x=>x.type).sort().join(',');
 ok(to(2)==='','a device that turned both off gets neither');ok(to(3)==='prep,thaw','a device registered before “thaw” existed gets it (on until turned off), even with both daily reminders used');
 ok(to(4)==='','a shopper device gets no cooking or thaw reminder')}
// automaticMessages keys: one per meal and day, dinner keeps its older key
{const date='2026-11-09',st=base({'2026-11-09':{days:{[date]:{lunch:meal(['pho']),dinner:meal(['pho'])}}}},{dinnerTime:'13:30',mealTimes:{lunch:'13:30'}});
 const m=automaticMessages(st,new Date('2026-11-09T00:15:00Z'));ok(m.filter((x:any)=>x.type==='prep').map((x:any)=>x.key).join(',')==='prep/2026-11-09/lunch,prep/2026-11-09','lunch and dinner at the same time: two reminders with their own keys')}
console.log('meal times: passed');
