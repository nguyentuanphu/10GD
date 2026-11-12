'use strict';
// v1.7.19 — owner, 12 Nov 2026 (Sydney time): “Trong bếp nhà mình nên có option chọn giờ ăn để dựa vào đó còn gửi noti báo nấu ăn etc”
// (pop-up: “Làm đủ 4 ý, gộp v1.7.19”). One time per meal the family uses, edited only in Bếp của nhà mình → Giờ ăn (rule 29).
// A meal without a time is “Chưa đặt” and gets no cooking reminder (rule 32: nothing is guessed).
// Data: state.preferences.mealTimes = {breakfast?, snackAm?, lunch?, snack?, dinner?}, each 'HH:MM' or '' (explicitly not set).
// Dinner keeps the older field: preferences.dinnerTime stays the dinner time older devices read and validate (always HH:MM), and
// is written together with mealTimes.dinner. mealTimes.dinner === '' means the family cleared it; any other dinner value is read
// from dinnerTime, so a change made on an older device still counts. The server copy is lib/push.mts mealTimeOf (same rules).
const MEAL_TIME_ORDER=['breakfast','snackAm','lunch','snack','dinner'];
const MEAL_CLOCK=/^([01]\d|2[0-3]):[0-5]\d$/;
const mtT=(vi:string,en:string)=>typeof tr==='function'?tr(vi,en):vi;
// Owner, 12 Nov 2026 (pop-up answers “Tuỳ chọn cho user” / “Để tuỳ chọn”): the thaw-reminder time and the earliest time a cooking
// reminder may come are family settings next to the meal times, starting at 20:00 and 08:00 (shown, editable). Same defaults in push.mts.
const MEAL_REMINDER_SETTINGS:Record<string,string>={thawReminderTime:'20:00',cookEarliestTime:'08:00'};
function reminderSettingOf(s:any,key:string):string{const v=s?.preferences?.[key];return typeof v==='string'&&MEAL_CLOCK.test(v)?v:MEAL_REMINDER_SETTINGS[key]}
function mealTimeOf(s:any,type:string):string{const p=s?.preferences||{},mt=p.mealTimes&&typeof p.mealTimes==='object'&&!Array.isArray(p.mealTimes)?p.mealTimes:{};
 if(type==='dinner'){if(Object.hasOwn(mt,'dinner')&&mt.dinner==='')return '';return MEAL_CLOCK.test(p.dinnerTime||'')?p.dinnerTime:MEAL_CLOCK.test(mt.dinner||'')?mt.dinner:''}
 return MEAL_CLOCK.test(mt[type]||'')?mt[type]:''}
// The meals this family uses: the meals chosen in the guided setup (family planner), lunch and dinner for the older two-meal menu,
// breakfast, lunch and dinner when nothing was chosen; plus any meal that already has a time, so a saved time is never hidden.
function mealTimeTypes(s:any):string[]{const p=s?.preferences||{};let use:string[];
 if(p.familyPlanner===false)use=['lunch','dinner'];
 else if(Array.isArray(p.enabledMeals)&&p.enabledMeals.length)use=p.enabledMeals;
 else use=['breakfast','lunch','dinner'];
 return MEAL_TIME_ORDER.filter(t=>use.includes(t)||!!mealTimeOf(s,t))}
// Writes only what changed. '' clears a meal's time; dinner also writes dinnerTime (kept as is when cleared: older devices need HH:MM).
function setMealTimes(s:any,values:Record<string,string>):number{const p=s.preferences;let n=0;
 for(const[key,raw]of Object.entries(values)){if(!Object.hasOwn(MEAL_REMINDER_SETTINGS,key))continue;const v=String(raw||'');
  if(!MEAL_CLOCK.test(v))throw Error(key==='thawReminderTime'?mtT('Chọn giờ nhắc rã đông.','Choose the thaw reminder time.'):mtT('Chọn giờ “Không nhắc nấu trước”.','Choose the “No cooking reminder before” time.'));
  if(reminderSettingOf(s,key)!==v){p[key]=v;n++}}
 for(const[t,raw]of Object.entries(values)){if(!MEAL_TIME_ORDER.includes(t))continue;const v=String(raw||'');if(v&&!MEAL_CLOCK.test(v))throw Error(mtT('Giờ ăn chưa đúng dạng giờ:phút.','Meal times must be hours:minutes.'));
  if(mealTimeOf(s,t)===v)continue;p.mealTimes={...(p.mealTimes&&typeof p.mealTimes==='object'&&!Array.isArray(p.mealTimes)?p.mealTimes:{}),[t]:v};if(t==='dinner'&&v)p.dinnerTime=v;n++}
 return n}
function validMealTimes(p:any):boolean{for(const key of Object.keys(MEAL_REMINDER_SETTINGS))if(p?.[key]!==undefined&&!(typeof p[key]==='string'&&MEAL_CLOCK.test(p[key])))return false;const mt=p?.mealTimes;if(mt===undefined)return true;if(!mt||typeof mt!=='object'||Array.isArray(mt))return false;
 return Object.entries(mt).every(([k,v])=>MEAL_TIME_ORDER.includes(k)&&typeof v==='string'&&(v===''||MEAL_CLOCK.test(v)))}
function mealTimeLabel(t:string){return typeof mealName==='function'?mealName(t):t}
function familyClockMinute(now=new Date()){const parts=new Intl.DateTimeFormat('en-GB',{timeZone:(globalThis as any).BEP_TIMEZONE||'Australia/Sydney',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);const g=(k:string)=>+(parts.find(x=>x.type===k)?.value||0);return g('hour')*60+g('minute')}
function mealTimeStateText(v:string){return v?mtT('Nhắc giờ nấu theo giờ này','Cooking reminder from this time'):mtT('Chưa đặt — không nhắc nấu','Not set — no cooking reminder')}
// Bếp của nhà mình → Giờ ăn
function kitchenMealTimesBody(){const edit=typeof canEdit!=='function'||canEdit(),dis=edit?'':'disabled';
 return `<form id="meal-times-form" class="meal-times-form" novalidate>${mealTimeTypes(state).map(t=>{const v=mealTimeOf(state,t);return `<div class="field meal-time-row" data-mt-row="${t}"><label for="mt-${t}">${esc(mealTimeLabel(t))}</label><div class="meal-time-input"><input id="mt-${t}" name="${t}" type="time" value="${v}" aria-describedby="mt-${t}-state" ${dis}><button type="button" class="btn small meal-time-clear" data-mt="clear" data-type="${t}" aria-label="${esc(mtT('Bỏ giờ','Clear the time for')+' '+mealTimeLabel(t))}" ${v&&edit?'':'disabled'}>${mtT('Bỏ giờ','Clear')}</button></div><small id="mt-${t}-state" class="meal-time-state${v?'':' unset'}">${mealTimeStateText(v)}</small></div>`}).join('')}${[['thawReminderTime','mt-thaw',mtT('Nhắc rã đông lúc (tối hôm trước)','Thaw reminder at (the evening before)'),mtT('Khi món ngày mai cần đồ trong ngăn đông.','When tomorrow’s dishes need something from the freezer.')],['cookEarliestTime','mt-earliest',mtT('Không nhắc nấu trước','No cooking reminder before'),mtT('Nhắc nấu không đến sớm hơn giờ này. Bữa quá sớm so với giờ này thì không có nhắc nấu. Giờ yên lặng của từng máy vẫn được giữ.','Cooking reminders never come earlier than this. A meal too early for it gets no cooking reminder. Each phone’s quiet hours still apply.')]].map(([key,id,label,note])=>`<div class="field meal-time-row meal-time-setting" data-mt-setting="${key}"><label for="${id}">${label}</label><div class="meal-time-input"><input id="${id}" name="${key}" type="time" required value="${reminderSettingOf(state,key)}" aria-describedby="${id}-note" ${dis}></div><small id="${id}-note" class="meal-time-note">${note}</small></div>`).join('')}<p class="hint">${mtT('App nhắc bắt đầu nấu lúc: giờ ăn − món lâu nhất − 15 phút, không sớm hơn giờ “Không nhắc nấu trước”. Mỗi máy tự chọn có nhận nhắc hay không trong Nhắc nhở & thông báo.','The cooking reminder comes at the meal time − the longest dish − 15 minutes, never before the “No cooking reminder before” time. Each device chooses whether it gets reminders in Reminders & notifications.')}</p>${edit?`<div class="toolbar topspace"><button type="button" class="btn small primary" data-mt="save">${mtT('Lưu giờ ăn','Save meal times')}</button></div>`:`<p class="hint">${mtT('Quyền chỉ xem: không đổi được giờ ăn.','View-only access: meal times cannot be changed.')}</p>`}</form>`}
// Inside the Thực đơn card (My kitchen keeps its four cards, owner decision 1 Nov 2026); kitchenModal('mealtimes') scrolls here
function kitchenMealTimesSection(){return `<section class="kitchen-subsection meal-times-section" id="kitchen-mealtimes" aria-labelledby="kitchen-mealtimes-title"><h4 id="kitchen-mealtimes-title">${mtT('Giờ ăn','Meal times')}</h4><p class="hint">${mtT('Giờ ăn của từng bữa. App nhắc bắt đầu nấu theo giờ này.','When each meal is eaten. Cooking reminders follow these times.')}</p>${kitchenMealTimesBody()}</section>`}
// Nhắc nhở & thông báo: a read-only summary and a way to the one place where the times are changed
function mealTimesSummaryHtml(){const rows=mealTimeTypes(state).map(t=>{const v=mealTimeOf(state,t);return `<li><span>${esc(mealTimeLabel(t))}</span><b class="${v?'':'unset'}">${v||mtT('Chưa đặt','Not set')}</b></li>`}).join('')+`<li class="meal-times-setting"><span>${mtT('Nhắc rã đông (tối hôm trước)','Thaw reminder (the evening before)')}</span><b>${reminderSettingOf(state,'thawReminderTime')}</b></li><li class="meal-times-setting"><span>${mtT('Không nhắc nấu trước','No cooking reminder before')}</span><b>${reminderSettingOf(state,'cookEarliestTime')}</b></li>`;
 return `<section class="meal-times-summary" id="push-meal-times" aria-labelledby="push-meal-times-title"><h3 id="push-meal-times-title">${mtT('Giờ ăn','Meal times')}</h3><ul class="meal-times-list">${rows}</ul><p class="hint">${mtT('Nhắc giờ nấu và nhắc rã đông dựa vào giờ ăn. Giờ ăn chỉ đổi trong Bếp của nhà mình.','Cooking and thawing reminders follow these meal times. Meal times are changed only in My kitchen.')}</p><button type="button" class="btn small" data-personal="settings" data-section="mealtimes">${mtT('Đổi giờ ăn','Change meal times')}</button></section>`}
if(typeof document!=='undefined'){
 document.addEventListener('input',event=>{const el=event.target as HTMLInputElement;if(!el?.closest?.('#meal-times-form')||el.type!=='time'||el.closest('.meal-time-setting'))return;const row=el.closest('.meal-time-row');const st=row?.querySelector('.meal-time-state');if(st){st.textContent=mealTimeStateText(el.value);st.classList.toggle('unset',!el.value)}const c=row?.querySelector<HTMLButtonElement>('[data-mt="clear"]');if(c)c.disabled=!el.value});
 document.addEventListener('click',event=>{const b=(event.target as Element)?.closest?.('[data-mt]') as HTMLElement|null;if(!b)return;const form=b.closest('#meal-times-form') as HTMLFormElement|null;if(!form)return;
  if(b.dataset.mt==='clear'){const input=form.querySelector<HTMLInputElement>(`#mt-${b.dataset.type}`);if(input){input.value='';input.dispatchEvent(new Event('input',{bubbles:true}))}return}
  if(b.dataset.mt==='save'){if(typeof canEdit==='function'&&!canEdit())return;const values:Record<string,string>={};for(const input of form.querySelectorAll<HTMLInputElement>('input[type="time"]'))values[input.name]=input.value;
   try{const n=setMealTimes(state,values);if(n&&typeof log==='function')log(mtT('Cập nhật giờ ăn','Meal times updated'));save(n?mtT('Đã lưu giờ ăn.','Meal times saved.'):mtT('Giờ ăn không đổi.','Meal times unchanged.'));if(n&&typeof render==='function'){const y=scrollY;render();scrollTo(0,y)}}catch(e:any){toast(e?.message||String(e),true)}}});
}
Object.assign(globalThis as any,{reminderSettingOf,MEAL_REMINDER_SETTINGS,kitchenMealTimesSection,mealTimeOf,mealTimeTypes,setMealTimes,validMealTimes,kitchenMealTimesBody,mealTimesSummaryHtml,familyClockMinute,MEAL_TIME_ORDER});
