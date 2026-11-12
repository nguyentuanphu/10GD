import webPush from 'web-push';
import { createHash } from 'node:crypto';
export const pushTypes=['calendar','attendance','prep','thaw','shopping','expiry','receipt','budget','weekly','urgent'];
// v1.7.19 (owner, 12 Nov 2026): the cooking reminder of each planned meal and the thaw reminder do not use up the 2 automatic
// reminders a device gets per day; each comes at most once per meal (its own dedupe key below), and each device can turn it off.
export const MEAL_REMINDER_TYPES=['prep','thaw'];
export function allowedEndpoint(endpoint){try{const u=new URL(endpoint),h=u.hostname;return u.protocol==='https:'&&!u.username&&!u.password&&(!u.port||u.port==='443')&&(h==='fcm.googleapis.com'||h==='web.push.apple.com'||h.endsWith('.push.apple.com')||h==='updates.push.services.mozilla.com'||h.endsWith('.push.services.mozilla.com')||h.endsWith('.notify.windows.com'))}catch{return false}}
export function validDevice(data){return data&&typeof data.deviceId==='string'&&/^[a-zA-Z0-9-]{8,100}$/.test(data.deviceId)&&typeof data.memberId==='string'&&data.memberId.length<=100&&data.subscription&&typeof data.subscription.endpoint==='string'&&data.subscription.endpoint.length<4096&&allowedEndpoint(data.subscription.endpoint)&&/^[A-Za-z0-9_-]{20,150}$/.test(data.subscription.keys?.auth||'')&&/^[A-Za-z0-9_-]{40,150}$/.test(data.subscription.keys?.p256dh||'')}
export async function pushKeys(store,{create=false}={}){let keys=await store.get('push/vapid-keys',{type:'json'});if(!keys&&create){const fresh=webPush.generateVAPIDKeys();await store.setJSON('push/vapid-keys',fresh,{onlyIfNew:true});keys=await store.get('push/vapid-keys',{type:'json'})}return keys}
export function sydneyClock(now=new Date(),timezone='Australia/Sydney'){const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:['Australia/Sydney','Asia/Ho_Chi_Minh'].includes(timezone)?timezone:'Australia/Sydney',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).filter(x=>x.type!=='literal').map(p=>[p.type,p.value]));return{date:`${parts.year}-${parts.month}-${parts.day}`,minute:+parts.hour*60+(+parts.minute),weekday:new Date(`${parts.year}-${parts.month}-${parts.day}T12:00:00Z`).getUTCDay()}}
const minute=t=>/^\d{2}:\d{2}$/.test(t||'')?+t.slice(0,2)*60+(+t.slice(3)):null;
export function isQuiet(clock,settings){const a=minute(settings?.quietStart||'21:00'),b=minute(settings?.quietEnd||'07:00');if(a===b)return false;return a<b?clock.minute>=a&&clock.minute<b:clock.minute>=a||clock.minute<b}
// v1.7.9 (owner, 6 Nov 2026: "notification cần có thông tin rõ hơn, ngày nào khi nào"): every reminder names the day and date
const VI_DAY=['CN','T2','T3','T4','T5','T6','T7'],EN_DAY=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
export function dayLabel(date:string,en=false){const d=new Date(date+'T12:00:00Z'),dd=d.getUTCDate(),mm=d.getUTCMonth()+1;return en?`${EN_DAY[d.getUTCDay()]} ${dd}/${mm}`:`${VI_DAY[d.getUTCDay()]} ${dd}/${mm}`}
function addDay(date,n){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
function monday(date){const d=new Date(date+'T12:00:00Z').getUTCDay();return addDay(date,-((d+6)%7))}
function dueAt(clock,time){const m=minute(time);return m!==null&&clock.minute>=m&&clock.minute<m+15}
// v1.7.17 (owner, 9 Nov 2026: “trước đó báo noti là sẽ cần bao lâu để chuẩn bị và nấu cho bữa tối”; pop-ups: time from the dishes,
// optional preparation minutes): the dinner reminder comes at dinner time − the longest dish (preparation + cooking) − 15 minutes,
// never before 08:00, and says how many dishes, the longest one and the dishes without a time. Without any time: 17:00 as before.
// Same sum as frontend/cook-timing.ts.
// v1.7.19 (owner, 12 Nov 2026, pop-up “Làm đủ 4 ý, gộp v1.7.19”): every planned meal with a time in Bếp của nhà mình → Giờ ăn gets
// “Đến giờ nấu [bữa] — bắt đầu lúc …”. No time, no reminder (nothing assumed). When the 08:00 bound puts the start at or after the meal
// (an early breakfast), no start is given (early) and no reminder is sent, rather than one after the meal.
export function cookTiming(state:any,meal:any,mealTime?:string){if(!meal||meal.cooked||!Array.isArray(meal.recipes)||!meal.recipes.length)return null;
 if(!MEAL_CLOCK.test(mealTime||''))return null;
 const dishes=meal.recipes.map((r:any)=>{const src=(state?.recipes||[]).find((x:any)=>x.id===r.id)||r;const cook=Number.isFinite(+src.time)&&+src.time>0?Math.round(+src.time):null,prep=Number.isFinite(+src.prepTime)&&+src.prepTime>0?Math.round(+src.prepTime):0;return{name:String(src.name||r.name||''),cook,prep,total:cook==null?null:cook+prep}});
 const timed=dishes.filter((d:any)=>d.total!=null),unknown=dishes.length-timed.length;if(!timed.length)return{dishes:dishes.length,unknown,longest:null,sum:0,start:null};
 const longest=timed.reduce((a:any,b:any)=>b.total>a.total?b:a),sum=timed.reduce((n:number,d:any)=>n+d.total,0);
 const [h,m]=String(mealTime).split(':').map(Number),meal0=h*60+m,raw=Math.max(480,meal0-longest.total-15),at=Math.floor(raw/15)*15;
 if(at>=meal0)return{dishes:dishes.length,unknown,longest,sum,start:null,early:true};
 return{dishes:dishes.length,unknown,longest,sum,start:`${String(Math.floor(at/60)).padStart(2,'0')}:${String(at%60).padStart(2,'0')}`}}
// Meal times (same rules as frontend/meal-times.ts mealTimeOf): preferences.mealTimes[type] 'HH:MM' or '' (not set); dinner reads
// preferences.dinnerTime (older devices write only that) unless the family cleared it (mealTimes.dinner === '').
const MEAL_CLOCK=/^([01]\d|2[0-3]):[0-5]\d$/;
export const MEAL_ORDER=['breakfast','snackAm','lunch','snack','dinner'];
export function mealTimeOf(state:any,type:string):string{const p=state?.preferences||{},mt=p.mealTimes&&typeof p.mealTimes==='object'&&!Array.isArray(p.mealTimes)?p.mealTimes:{};
 if(type==='dinner'){if(Object.hasOwn(mt,'dinner')&&mt.dinner==='')return '';return MEAL_CLOCK.test(p.dinnerTime||'')?p.dinnerTime:MEAL_CLOCK.test(mt.dinner||'')?mt.dinner:''}
 return MEAL_CLOCK.test(mt[type]||'')?mt[type]:''}
const MEAL_VI:any={breakfast:'bữa sáng',snackAm:'bữa phụ sáng',lunch:'bữa trưa',snack:'bữa phụ chiều',dinner:'bữa tối'},MEAL_EN:any={breakfast:'breakfast',snackAm:'morning snack',lunch:'lunch',snack:'afternoon snack',dinner:'dinner'};
// A day is read from the week stored under its Monday (as the app stores it), or from any stored week that holds that date.
function dayOf(state:any,date:string){const w=state?.weeks?.[monday(date)];if(w?.days?.[date])return w.days[date];for(const x of Object.values(state?.weeks||{}))if((x as any)?.days?.[date])return(x as any).days[date];return null}
const planned=(m:any)=>!!m&&!m.cooked&&Array.isArray(m.recipes)&&m.recipes.length>0;
// Thaw: dishes of a planned meal that need an ingredient kept in the freezer (a pantry lot with an amount, usable on that day).
// Dishes cooked with an earlier meal, served from leftovers or part of a weekend batch are left out, as on the shopping list.
export function thawNeeds(state:any,date:string){const day=dayOf(state,date),out:any[]=[];if(!day)return out;
 const frozen=(state?.pantry||[]).filter((p:any)=>p&&p.place==='freezer'&&Number(p.qty)>0&&(!p.expiry||p.expiry>=date));if(!frozen.length)return out;
 for(const type of MEAL_ORDER){const m=day[type];if(!planned(m))continue;const dishes=m.recipes.filter((r:any)=>!r.batchId&&!r.cookedAhead&&!r.fromLeftover&&(Array.isArray(r.ingredients)?r.ingredients:[]).some((i:any)=>frozen.some((p:any)=>p.ingredient===i.id))).map((r:any)=>String(r.name||''));
  if(dishes.length)out.push({type,dishes})}
 return out}
export function automaticMessages(state,now=new Date()){
 const clock=sydneyClock(now,state.preferences?.timezone),date=clock.date,start=monday(date),week=state.weeks?.[start],day=week?.days?.[date]||dayOf(state,date),prefs=state.preferences||{},jobs=[];
 const add=(type,title,body,enTitle,enBody,url='/#today',key=date,targets=[])=>jobs.push({type,title,body,enTitle,enBody,url,targets,key:`${type}/${key}`});
 if(day&&dueAt(clock,prefs.attendanceTime||'10:30')){const pending=Object.entries(day.dinner?.attendance||{}).filter(([id,v])=>v==='pending'&&!state.availability?.[id]?.[date]?.dinner?.deduct).map(([id])=>id);if(pending.length)add('attendance',`Tối nay ${dayLabel(date)}: ăn cơm nhà không?`,`${pending.length} người chưa báo. Chạm để báo.`,`Tonight ${dayLabel(date,true)}: home for dinner?`,`${pending.length} still to answer. Tap to reply.`,`/#today?d=${date}`,date,pending)}
 for(const type of MEAL_ORDER){const meal=day?.[type],at=mealTimeOf(state,type);if(!planned(meal)||!at)continue;const t=cookTiming(state,meal,at);if(!t||t.early)continue;
  /* dinner keeps its v1.7.17 key, so a reminder already sent on the day of the update is not sent again */const key=type==='dinner'?date:`${date}/${type}`,vi=MEAL_VI[type],en=MEAL_EN[type];
  if(t.start&&dueAt(clock,t.start)){const L=t.longest,split=L.prep?` (chuẩn bị ${L.prep} + nấu ${L.cook})`:'',splitEn=L.prep?` (prep ${L.prep} + cook ${L.cook})`:'';
   add('prep',`Đến giờ nấu ${vi} ${dayLabel(date)} — bắt đầu lúc ${t.start}`,`Ăn lúc ${at} · ${t.dishes} món · lâu nhất ${L.name} ${L.total} phút${split} · tổng ${t.sum} phút${t.unknown?` · ${t.unknown} món chưa ghi thời gian`:''}.`,`Time to cook ${en} ${dayLabel(date,true)} — start at ${t.start}`,`Eating at ${at} · ${t.dishes} dish${t.dishes>1?'es':''} · longest ${L.name} ${L.total} min${splitEn} · ${t.sum} min in all${t.unknown?` · ${t.unknown} without a time`:''}.`,`/#today?d=${date}`,key)}
  // no cooking time on any dish: dinner keeps the family's “dinner with no cooking times” reminder (17:00) with the dish names
  else if(!t.start&&type==='dinner'&&dueAt(clock,prefs.prepReminderTime||'17:00')){const names=meal.recipes.slice(0,3).map(r=>r.name).join(', ');add('prep',`Tối nay ${dayLabel(date)}: chuẩn bị nấu`,`${names}.`,`Tonight ${dayLabel(date,true)}: get cooking`,`${names}.`,`/#planner?d=${date}`,key)}}
 // Thaw: the evening before (preferences.thawReminderTime, 20:00 when not chosen), once for tomorrow's meals that need the freezer
 if(dueAt(clock,MEAL_CLOCK.test(prefs.thawReminderTime||'')?prefs.thawReminderTime:'20:00')){const tomorrow=addDay(date,1),needs=thawNeeds(state,tomorrow);
  if(needs.length){const vi=needs.map((n:any)=>`${MEAL_VI[n.type]}${mealTimeOf(state,n.type)?' '+mealTimeOf(state,n.type):''}: ${n.dishes.join(', ')}`).join(' · '),en=needs.map((n:any)=>`${MEAL_EN[n.type]}${mealTimeOf(state,n.type)?' '+mealTimeOf(state,n.type):''}: ${n.dishes.join(', ')}`).join(' · ');
   add('thaw',`Rã đông tối nay cho ngày mai ${dayLabel(tomorrow)}`,`Chuyển đồ ngăn đông xuống ngăn mát cho ${vi}.`,`Thaw tonight for tomorrow ${dayLabel(tomorrow,true)}`,`Move freezer food to the fridge for ${en}.`,`/#today?d=${tomorrow}`,tomorrow)}}
 if(dueAt(clock,prefs.shoppingReminderTime||'09:00')){const requests=(state.errands||[]).filter(r=>!r.done&&r.date>=addDay(date,-2)&&r.date<=date);if(requests.length){const target=[...new Set(requests.flatMap(r=>r.targets||[]))];add('shopping',`Còn ${requests.length} yêu cầu mua đồ`,requests.slice(0,3).map(r=>r.qty+' '+r.item).join('; ')+'.',`${requests.length} shopping requests remain`,requests.slice(0,3).map(r=>r.qty+' '+r.item).join('; ')+'.','/#shopping',date,target)}}
 if(dueAt(clock,prefs.expiryReminderTime||'08:30')){const soon=(state.pantry||[]).filter(p=>(p.qty>0||p.purchase?.amount>0)&&p.expiry&&p.expiry>=date&&p.expiry<=addDay(date,1));if(soon.length)add('expiry',`${soon.length} món trong Tủ hết hạn ${dayLabel(date)}–${dayLabel(addDay(date,1))}`,'Kiểm tra trước khi dùng.',`${soon.length} pantry items expire ${dayLabel(date,true)}–${dayLabel(addDay(date,1),true)}`,'Check them before use.','/#pantry')}
 if(dueAt(clock,prefs.receiptReminderTime||'19:30')){const hasReceipt=(state.receipts||[]).some(r=>r.date===date),bought=Object.values(week?.boughtAt||{}).some(at=>sydneyClock(new Date(at),prefs.timezone).date===date)||week?.extras?.some(e=>e.done&&e.boughtAt&&sydneyClock(new Date(e.boughtAt),prefs.timezone).date===date);if(bought&&!hasReceipt)add('receipt',`Đi chợ ${dayLabel(date)}: ghi hoá đơn?`,'Chạm để chụp hoá đơn.',`Shopping ${dayLabel(date,true)}: add the receipt?`,'Tap to scan it.','/#expenses');const actual=(state.receipts||[]).filter(r=>(r.currency||'AUD')===(prefs.currency||'AUD')&&r.date>=start&&r.date<=addDay(start,6)).reduce((n,r)=>n+r.total,0);if(actual>(prefs.budget||180))add('budget',`Tuần ${dayLabel(start)}: chi đã qua mục tiêu`,`Đã ghi ${prefs.currency||'AUD'} ${actual.toFixed(prefs.currency==='VND'?0:2)} / mục tiêu ${prefs.currency||'AUD'} ${(prefs.budget||180).toFixed(prefs.currency==='VND'?0:2)}.`,'Weekly spending is above your target',`Recorded ${prefs.currency||'AUD'} ${actual.toFixed(prefs.currency==='VND'?0:2)} / target ${prefs.currency||'AUD'} ${(prefs.budget||180).toFixed(prefs.currency==='VND'?0:2)}. Tap to review.`,'/#expenses',start)}
 if(dueAt(clock,prefs.calendarReminderTime||'19:00')){const tomorrow=addDay(date,1),entries=(state.members||[]).flatMap(member=>Object.entries(state.availability?.[member.id]?.[tomorrow]||{}).filter(([,e])=>e.remind).map(([type,e])=>({member,type,e})));if(entries.length){const vn:any={breakfast:'bữa sáng',snackAm:'bữa phụ sáng',lunch:'bữa trưa',snack:'bữa phụ chiều',dinner:'bữa tối'},en:any={breakfast:'breakfast',snackAm:'morning snack',lunch:'lunch',snack:'afternoon snack',dinner:'dinner'},order=['breakfast','snackAm','lunch','snack','dinner'];
  const away=entries.filter(x=>x.e.deduct),kept=entries.filter(x=>!x.e.deduct),total=(state.members||[]).length,people=new Set(entries.map(x=>x.member.id)).size;
  const who=(list:any[],map:any)=>order.filter(t=>list.some(x=>x.type===t)).map(t=>list.filter(x=>x.type===t).map(x=>x.member.name).join(', ')+' – '+map[t]);
  const left=(t:string)=>total-away.filter(x=>x.type===t).length;
  const meals=(list:any[],map:any,strip=false)=>order.filter(t=>list.some(x=>x.type===t)).map(t=>strip?map[t].replace('bữa ',''):map[t]).join(', ');const title=people===1?`Ngày mai ${dayLabel(tomorrow)}: ${entries[0].member.name} ${[away.length?'vắng '+meals(away,vn,true):'',kept.length?'bận '+meals(kept,vn,true):''].filter(Boolean).join(', ')}`:`Ngày mai ${dayLabel(tomorrow)}: ${people} người vắng/bận`;
  const enTitle=people===1?`Tomorrow ${dayLabel(tomorrow,true)}: ${entries[0].member.name} ${[away.length?'away for '+meals(away,en):'',kept.length?'busy at '+meals(kept,en):''].filter(Boolean).join(', ')}`:`Tomorrow ${dayLabel(tomorrow,true)}: ${people} people away/busy`;
  // one short line: who is away (portion off) / busy (still counted), then how many eat each affected meal
  // v1.7.9: a reported time is part of the line ("Cậu Tí 17:00–19:30")
  const hhmm=(x:any)=>typeof x==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(x)?x:'',tt=(e:any,isEn:boolean)=>{const f=hhmm(e.from),t=hhmm(e.to);return f&&t?f+'–'+t:f?(isEn?'from ':'từ ')+f:t?(isEn?'until ':'đến ')+t:''};
  const times=(isEn:boolean)=>[...new Set(entries.filter(x=>tt(x.e,isEn)).map(x=>x.member.name+' '+tt(x.e,isEn)))];
  const body=[...times(false),...(people>1?who(away,vn).map(x=>x+' vắng'):[]),...(kept.length?[(people>1?who(kept,vn).join(', ')+' ':'')+'Bận: vẫn tính phần ăn']:[]),...order.filter(t=>away.some(x=>x.type===t)).map(t=>`${vn[t][0].toUpperCase()+vn[t].slice(1)} còn ${left(t)}/${total} người ăn`)].join(' · ');
  const enBody=[...times(true),...(people>1?who(away,en).map(x=>x+' away'):[]),...(kept.length?[(people>1?who(kept,en).join(', ')+' ':'')+'Busy: portion still counted']:[]),...order.filter(t=>away.some(x=>x.type===t)).map(t=>`${en[t][0].toUpperCase()+en[t].slice(1)}: ${left(t)}/${total} eating`)].join(' · ');
  add('calendar',title,body,enTitle,enBody,`/#planner?d=${tomorrow}`)}}
 if(clock.weekday===(Number.isInteger(prefs.weeklyReminderDay)&&prefs.weeklyReminderDay>=0&&prefs.weeklyReminderDay<=6?prefs.weeklyReminderDay:0)&&dueAt(clock,prefs.weeklyReminderTime||'18:00')){/* v1.7.9 system check: next week starts on the family's own first day (preferences.weekStartDay, default Monday), not always tomorrow */const ws=Number.isInteger(prefs.weekStartDay)&&prefs.weekStartDay>=0&&prefs.weekStartDay<=6?prefs.weekStartDay:1;let next=addDay(date,1);for(let i=1;i<=7;i++){const d=addDay(date,i);if(new Date(d+'T12:00:00Z').getUTCDay()===ws){next=d;break}}add('weekly',`Lên thực đơn tuần tới (từ ${dayLabel(next)})`,'Chạm để chọn món.',`Plan next week (from ${dayLabel(next,true)})`,'Tap to pick dishes.',`/#planner?d=${next}`)}
 return jobs;
}
// Upper bound matches the largest per-family device limit the owner console allows (registration enforces the family's own limit).
export const MAX_DEVICES_LISTED=500;
export async function devices(store){const keys=[];for await(const page of store.list({prefix:'push/subscriptions/',paginate:true})){for(const item of page.blobs){keys.push(item.key);if(keys.length>=MAX_DEVICES_LISTED)break}if(keys.length>=MAX_DEVICES_LISTED)break}const records=await Promise.all(keys.map(async key=>{const record=await store.get(key,{type:'json'});return record?{...record,key}:null}));return records.filter(Boolean)}
// A device belongs to the household member it was registered for. In account households it stays valid while the
// registering account is still a household member and either is linked to that member (or not linked yet), or registered
// it as a shared device for a member without their own account (owner/editor only, checked at registration).
export function deviceBelongs(d,accountMembers){if(!accountMembers)return true;const owner=typeof d.accountUsername==='string'&&Object.prototype.hasOwnProperty.call(accountMembers,d.accountUsername)?accountMembers[d.accountUsername]:null;if(!owner)return false;if(d.sharedMember===true)return true;return!owner.memberId||owner.memberId===d.memberId}
// Urgent messages pass quiet hours by default (owner decision, v1.5). A device opts out with urgentPolicy 'v2' + urgentBypass:false.
export const urgentBypasses=d=>d?.urgentPolicy==='v2'?d.urgentBypass!==false:true;
const utf8=s=>Buffer.byteLength(s,'utf8');
// Trim by encoded JSON bytes (Vietnamese diacritics and emoji are multi-byte), never splitting a code point.
export function trimToBytes(text,max){const s=String(text??'');if(utf8(JSON.stringify(s))<=max)return s;const chars=Array.from(s);let lo=0,hi=chars.length;while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(utf8(JSON.stringify(chars.slice(0,mid).join('')+'…'))<=max)lo=mid;else hi=mid-1}return chars.slice(0,lo).join('')+'…'}
export const PUSH_PAYLOAD_LIMIT=3000;
export function pushPayload(message,language){const english=language==='en',url=/^\/#(today|shopping|planner|expenses|pantry)(\?(?:d=\d{4}-\d{2}-\d{2}|lb=mine))?$/.test(String(message.url||''))?message.url:'/#shopping',base={title:trimToBytes(String(english?(message.enTitle||message.title):message.title),360),body:'',tag:String(message.tag||message.key||'family-message').slice(0,120),type:message.type,url};const budget=PUSH_PAYLOAD_LIMIT-utf8(JSON.stringify(base));base.body=trimToBytes(String(english?(message.enBody||message.body):message.body),Math.max(16,budget));return JSON.stringify(base)}
// Results include expired = subscriptions the push service reported gone (404/410); those records are removed.
// Reasons: not_configured, no_device, needs_resubscribe, no_recipient (types/roles off), quiet_hours, daily_limit, delivery_failed, sent.
// v1.7 delivery: keys, device list and family settings are read in parallel (a caller that already holds the family
// document passes it as `family`); every device is sent to at once (allSettled), urgent with Urgency: high.
export const URGENT_TTL=7200,NORMAL_TTL=7200,AUTOMATIC_TTL=1800;
export function pushOptions(message,{automatic=false}={}){return{TTL:automatic?AUTOMATIC_TTL:message.type==='urgent'?URGENT_TTL:NORMAL_TTL,urgency:message.type==='urgent'?'high':'normal',timeout:5000}}
export async function sendPushBatch(store,message,{targets=[],automatic=false,now=new Date(),subject,deviceIds=[],family:knownFamily,send=webPush.sendNotification.bind(webPush)}={}){
 const keysRead=pushKeys(store),devicesRead=devices(store),familyRead=knownFamily!==undefined?Promise.resolve(knownFamily):store.get('state',{type:'json'});devicesRead.catch(()=>{});familyRead.catch(()=>{});
 const keys=await keysRead;if(!keys)return{accepted:0,failed:0,recipients:0,reason:'not_configured'};
 const [all,family]=await Promise.all([devicesRead,familyRead]),clock=sydneyClock(now,family?.preferences?.timezone);
 const candidates=all.filter(d=>deviceBelongs(d,store.accountMembers)&&(!targets.length||targets.includes(d.memberId))&&(!deviceIds.length||deviceIds.includes(d.deviceId)));
 const live=candidates.filter(d=>d.needsResubscribe!==true);
 const wanted=live.filter(d=>(message.type==='test'||d.types?.[message.type]!==false)&&(!automatic||d.role!=='shopper'||!['prep','thaw','expiry','weekly'].includes(message.type))&&(!automatic||d.role!=='cook'||!['shopping','receipt','budget'].includes(message.type)));
 const seenEndpoints=new Set<string>();/* v1.7.9 (owner: the same reminder arrived 4 times): one send per push address */const selected=wanted.filter(d=>!isQuiet(clock,d)||message.type==='test'||message.type==='urgent'&&urgentBypasses(d)).filter(d=>{const e=d.subscription?.endpoint;if(!e)return true;if(seenEndpoints.has(e))return false;seenEndpoints.add(e);return true});
 // v1.7.1: devices = matching registered devices; needsResubscribe / typeOff / quiet say why some were skipped.
 const skipped={devices:candidates.length,needsResubscribe:candidates.length-live.length,typeOff:live.length-wanted.length,quiet:wanted.length-selected.length};
 if(!selected.length)return{accepted:0,failed:0,recipients:0,...skipped,reason:!candidates.length?'no_device':!live.length?'needs_resubscribe':!wanted.length?'no_recipient':'quiet_hours'};
 let accepted=0,failed=0,suppressed=0,resubscribe=0,expired=0;const origin=subject||process.env.URL||'https://bep-gia-dinh.example';
 const options=pushOptions(message,{automatic});
 await Promise.allSettled(selected.map(async device=>{let dailySlot=null;if(automatic&&!MEAL_REMINDER_TYPES.includes(message.type)){for(let n=0;n<2;n++){const key='push/daily/'+clock.date+'/'+device.deviceId+'/'+n,claim=await store.setJSON(key,{at:now.toISOString()},{onlyIfNew:true});if(claim.modified){dailySlot=key;break}}if(!dailySlot){suppressed++;return}}const payload=pushPayload(message,device.language);try{await send(device.subscription,payload,{vapidDetails:{subject:origin,publicKey:keys.publicKey,privateKey:keys.privateKey},...options});accepted++}catch(error){failed++;const status=Number(error?.statusCode)||0;if([404,410].includes(status))expired++;console.warn('Push delivery failed',JSON.stringify({status,type:message.type,body:String(error?.body||error?.message||'').slice(0,200)}));try{if(dailySlot)await store.delete(dailySlot);if([404,410].includes(status))await store.delete(device.key);else if(status===403){resubscribe++;const{key:_key,...record}=device;await store.setJSON(device.key,{...record,needsResubscribe:true,failedAt:now.toISOString()})}}catch{}}}));
 return{accepted,failed,expired,recipients:selected.length,suppressed,...skipped,needsResubscribe:skipped.needsResubscribe+resubscribe,reason:accepted?'sent':suppressed&&!failed?'daily_limit':resubscribe?'needs_resubscribe':'delivery_failed'};
}
export async function scheduledReminders(store,now=new Date(),{state:knownState,...options}={}){const state=knownState!==undefined?knownState:await store.get('state',{type:'json'});if(!state||!await pushKeys(store))return{jobs:0,accepted:0};let jobs=0,accepted=0;for(const message of automaticMessages(state,now)){const key='push/sent/'+createHash('sha256').update(message.key).digest('hex');const claim=await store.setJSON(key,{at:now.toISOString()},{onlyIfNew:true});if(!claim.modified)continue;const result=await sendPushBatch(store,message,{...options,automatic:true,now,targets:message.targets||[],family:state});if(!result.accepted)await store.delete(key);else{jobs++;accepted+=result.accepted}}return{jobs,accepted}}
