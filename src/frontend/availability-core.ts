'use strict';
function availabilityEntry(s,memberId,date,type){return s.availability?.[memberId]?.[date]?.[type]||null}
function deductsBySchedule(s,memberId,date,type){const a=availabilityEntry(s,memberId,date,type);return !!a&&a.deduct&&['away','busy'].includes(a.status)}
const availabilityEnsureWeek=ensureWeek;
ensureWeek=function(s,start){const w=availabilityEnsureWeek(s,start);for(const[date,day]of Object.entries(w.days))for(const type of MEAL_TYPES){if(day[type]){day[type].scheduleDate=date;day[type].scheduleType=type}}return w};
const attendanceServings=mealServings;
mealServings=function(m,s){if(m.servings!==null||m.cooked||!m.scheduleDate)return attendanceServings(m,s);return s.members.reduce((n,p)=>n+(['home','packed','pending'].includes(m.attendance[p.id])&&!deductsBySchedule(s,p.id,m.scheduleDate,m.scheduleType)?p.weight:0),0)};
// An availability entry: {status:'away'|'busy', deduct, remind, note ≤150, by?: reporter member id (v1.7.3, optional —
// older entries have none and stay valid)}. Sync stamps (updatedAt/updatedBy) may be present and are ignored here.
function validAvailabilityEntry(e){return !!e&&typeof e==='object'&&!Array.isArray(e)&&['away','busy'].includes(e.status)&&typeof e.deduct==='boolean'&&typeof e.remind==='boolean'&&typeof e.note==='string'&&e.note.length<=150&&(e.by===undefined||typeof e.by==='string'&&e.by.length>0&&e.by.length<=100)}
function setAvailability(s,memberId,dates,types,entry){
 if(!s.members.some(m=>m.id===memberId)||!dates.length||!types.length||dates.length>31||!dates.every(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d)))||!types.every(t=>MEAL_TYPES.includes(t)))throw Error('Chọn thành viên, ngày và bữa hợp lệ.');
 if(entry&&(!validAvailabilityEntry(entry)||entry.by!==undefined&&!s.members.some(m=>m.id===entry.by)))throw Error('Lịch chưa hợp lệ.');
 // Preserve the already-recorded portions of cooked meals before changing future availability.
 for(const w of Object.values(s.weeks))for(const day of Object.values(w.days))for(const t of MEAL_TYPES){const m=day[t];if(m?.cooked&&m.servings===null)m.servings=attendanceServings(m,s)}
 s.availability??={};s.availability[memberId]??={};for(const date of dates){s.availability[memberId][date]??={};for(const type of types){if(entry)s.availability[memberId][date][type]={...entry};else delete s.availability[memberId][date][type]}if(!Object.keys(s.availability[memberId][date]).length)delete s.availability[memberId][date]}
}
function scheduleSummary(s,m){if(!m?.scheduleDate)return[];return s.members.flatMap(p=>{const a=availabilityEntry(s,p.id,m.scheduleDate,m.scheduleType);if(!a)return[];return[{member:p,entry:a,deducted:a.deduct&&m.servings===null&&!m.cooked&&['home','packed','pending'].includes(m.attendance[p.id]),fixed:m.servings!==null||m.cooked}]})}
function validAvailability(s){if(s.availability===undefined)return true;return s.availability&&typeof s.availability==='object'&&!Array.isArray(s.availability)&&Object.values(s.availability).every(dates=>dates&&typeof dates==='object'&&!Array.isArray(dates)&&Object.entries(dates).every(([date,types])=>/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date))&&types&&typeof types==='object'&&!Array.isArray(types)&&Object.entries(types).every(([type,e])=>MEAL_TYPES.includes(type)&&validAvailabilityEntry(e))))}
// v1.7.3 family calendar (owner request): one shared notice of who is busy/away. Pure helpers, no DOM.
// The portion wording always follows the entry's own deduct flag: deduct → no portion is cooked for them.
function availabilityNoPortion(e){return !!e&&e.deduct===true&&['away','busy'].includes(e.status)}
function availabilityStatusLabel(e,lang='vi'){const en=lang==='en',none=availabilityNoPortion(e);return (e?.status==='away'?(en?'Away':'Vắng'):(en?'Busy':'Bận'))+' · '+(none?(en?'no portion':'không nấu phần'):(en?'still cooking their portion':'vẫn nấu phần'))}
const AVAILABILITY_MEAL_LETTER={vi:{breakfast:'S',lunch:'Tr',dinner:'T'},en:{breakfast:'B',lunch:'L',dinner:'D'}};
const AVAILABILITY_MEAL_WORD={vi:{breakfast:'sáng',lunch:'trưa',snack:'phụ',dinner:'tối'},en:{breakfast:'breakfast',lunch:'lunch',snack:'snack',dinner:'dinner'}};
const AVAILABILITY_WEEKDAY={vi:['CN','T2','T3','T4','T5','T6','T7'],en:['Sun','Mon','Tue','Wed','Thu','Fri','Sat']};
function availabilityWeekday(date,lang='vi'){return AVAILABILITY_WEEKDAY[lang==='en'?'en':'vi'][new Date(date+'T12:00:00Z').getUTCDay()]}
// Short, unique marker names for small calendar cells: word initials ("Bé lớn" → "BL", "Cậu Tí" → "CT", "Bố" → "B");
// a clash adds the next letter of the first word, then a number.
function memberShortNames(members){const out={},used=new Set();for(const m of members||[]){const words=String(m.name||'?').trim().split(/\s+/).filter(Boolean),first=Array.from(words[0]||'?');let short=(words.length>1?words.slice(0,2).map(w=>Array.from(w)[0]).join(''):first[0]).toUpperCase();if(used.has(short)&&words.length===1&&first.length>1)short=(first[0].toUpperCase()+first[1]);let n=2,base=short;while(used.has(short))short=base+n++;used.add(short);out[m.id]=short}return out}
// Every entry on one day, in family order then meal order.
function availabilityDay(s,date){return (s.members||[]).flatMap(member=>MEAL_TYPES.filter(type=>validAvailabilityEntry(s.availability?.[member.id]?.[date]?.[type])).map(type=>({date,type,member,entry:s.availability[member.id][date][type]})))}
// Entries for all members from `from` for `days` days (default the next 7 days including today), by date then meal.
function familyAvailabilityRange(s,from,days=7){const out=[];for(let i=0;i<days;i++){const d=new Date(from+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+i);const date=d.toISOString().slice(0,10),rows=availabilityDay(s,date);for(const type of MEAL_TYPES)out.push(...rows.filter(r=>r.type===type))}return out}
// "Who's busy this week": items grouped by day, meal and status, e.g. "T4 tối: Bố bận" / "Fri lunch: Mẹ, Bé away".
function familyWeekSummary(s,from,lang='vi',days=7){const en=lang==='en',groups=[];for(const r of familyAvailabilityRange(s,from,days)){const key=r.date+'|'+r.type+'|'+r.entry.status;let g=groups.find(x=>x.key===key);if(!g){g={key,date:r.date,type:r.type,status:r.entry.status,members:[]};groups.push(g)}g.members.push(r.member)}
 return groups.map(g=>({...g,text:availabilityWeekday(g.date,lang)+' '+AVAILABILITY_MEAL_WORD[en?'en':'vi'][g.type]+': '+g.members.map(m=>m.name).join(', ')+' '+(g.status==='away'?(en?'away':'vắng'):(en?'busy':'bận'))}))}
// v1.7.5 · Tuần này ai bận, one line per person (owner request 5 Nov 2026): the meals each person is away/busy in the next
// days, in date order; a day in another week also shows its date (the old list ended with an unexplained “T4 trưa”).
function availabilityDayMonth(date){return date.slice(8,10)+'/'+date.slice(5,7)}
function familyPersonSummary(s,from,lang='vi',days=7){const en=lang==='en',rows=[],weekOf=d=>{const x=new Date(d+'T12:00:00Z');x.setUTCDate(x.getUTCDate()-((x.getUTCDay()+6)%7));return x.toISOString().slice(0,10)},thisWeek=weekOf(from);
 for(const r of familyAvailabilityRange(s,from,days)){const key=r.member.id+'|'+r.entry.status;let g=rows.find(x=>x.key===key);if(!g){g={key,member:r.member,status:r.entry.status,first:r.date,slots:[]};rows.push(g)}g.slots.push({date:r.date,type:r.type})}
 rows.sort((a,b)=>a.first<b.first?-1:a.first>b.first?1:0);
 return rows.map(g=>({...g,slotsText:g.slots.map(x=>availabilityWeekday(x.date,lang)+(weekOf(x.date)!==thisWeek?' '+availabilityDayMonth(x.date):'')+' '+AVAILABILITY_MEAL_WORD[en?'en':'vi'][x.type]).join(' · '),statusText:g.status==='away'?(en?'away':'vắng'):(en?'busy':'bận')}))}

// v1.7.5 · Lịch mang cơm (packed lunch), per person, repeating by weekday (0 = Sunday … 6 = Saturday). Upcoming lunches of
// a scheduled person are set to “Mang đi” unless the meal is cooked/locked, the calendar has them away, or the family chose
// otherwise; taking a day out of the schedule only reverts what the schedule itself set (meal.autoPacked).
function validPackSchedule(p){return p===undefined||!!p&&typeof p==='object'&&!Array.isArray(p)&&!!p.members&&typeof p.members==='object'&&Object.entries(p.members).every(([id,d])=>typeof id==='string'&&Array.isArray(d)&&d.length<=7&&d.every(x=>Number.isInteger(x)&&x>=0&&x<=6))}
function packDays(s,memberId){return s.packSchedule?.members?.[memberId]||[]}
function isPackDay(s,memberId,date){return packDays(s,memberId).includes(new Date(date+'T12:00:00Z').getUTCDay())}
function anyPackDay(s,date){return (s.members||[]).some(m=>isPackDay(s,m.id,date))}
function applyPackSchedule(s,from,days=14){let changed=0;for(let i=0;i<days;i++){const d=new Date(from+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+i);const date=d.toISOString().slice(0,10),w=s.weeks?.[monday(date)],m=w?.days?.[date]?.lunch;if(!m||m.cooked||m.locked)continue;m.autoPacked=(m.autoPacked||[]).filter(id=>s.members.some(p=>p.id===id));
  for(const p of s.members){const want=isPackDay(s,p.id,date)&&!deductsBySchedule(s,p.id,date,'lunch'),cur=m.attendance[p.id],auto=m.autoPacked.includes(p.id);
   if(want&&!auto&&(cur===undefined||cur==='home'||cur==='pending')){m.attendance[p.id]='packed';m.autoPacked.push(p.id);changed++}
   else if(!want&&auto){if(cur==='packed'){m.attendance[p.id]='home';changed++}m.autoPacked=m.autoPacked.filter(x=>x!==p.id)}}
  if(!m.autoPacked.length)delete m.autoPacked}return changed}
/** Servings for “Món school lunch box” dishes: only the people packing lunch (whole family when nobody is marked). */
function packedServings(m,s){const n=(s.members||[]).reduce((t,p)=>t+(m.attendance?.[p.id]==='packed'&&!(m.scheduleDate&&deductsBySchedule(s,p.id,m.scheduleDate,m.scheduleType))?p.weight:0),0);return n>0?n:mealServings(m,s)}
function packSummary(s,lang='vi'){const en=lang==='en',names=en?['Sun','Mon','Tue','Wed','Thu','Fri','Sat']:['CN','T2','T3','T4','T5','T6','T7'],order=[1,2,3,4,5,6,0];return (s.members||[]).map(p=>{const d=order.filter(x=>packDays(s,p.id).includes(x));if(!d.length)return null;const runs=[];for(const x of d){const last=runs[runs.length-1];if(last&&order.indexOf(x)===order.indexOf(last[last.length-1])+1)last.push(x);else runs.push([x])}return {member:p,days:d,text:runs.map(r=>r.length>2?names[r[0]]+'–'+names[r[r.length-1]]:r.map(x=>names[x]).join(', ')).join(', ')}}).filter(Boolean)}
const scheduleConsume=consumeMeal,scheduleUndo=undoCook;
consumeMeal=function(s,m){const auto=m.servings===null,portions=mealServings(m,s),result=scheduleConsume(s,m);if(m.cooked&&auto){m.servings=portions;m.attendanceAutoBeforeCook=true}return result};
undoCook=function(s,m){scheduleUndo(s,m);if(m.attendanceAutoBeforeCook){m.servings=null;delete m.attendanceAutoBeforeCook}};
