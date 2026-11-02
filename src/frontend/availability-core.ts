'use strict';
function availabilityEntry(s,memberId,date,type){return s.availability?.[memberId]?.[date]?.[type]||null}
function deductsBySchedule(s,memberId,date,type){const a=availabilityEntry(s,memberId,date,type);return !!a&&a.deduct&&['away','busy'].includes(a.status)}
const availabilityEnsureWeek=ensureWeek;
ensureWeek=function(s,start){const w=availabilityEnsureWeek(s,start);for(const[date,day]of Object.entries(w.days))for(const type of MEAL_TYPES){if(day[type]){day[type].scheduleDate=date;day[type].scheduleType=type}}return w};
const attendanceServings=mealServings;
mealServings=function(m,s){if(m.servings!==null||m.cooked||!m.scheduleDate)return attendanceServings(m,s);return s.members.reduce((n,p)=>n+(['home','packed'].includes(m.attendance[p.id])&&!deductsBySchedule(s,p.id,m.scheduleDate,m.scheduleType)?p.weight:0),0)};
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
function scheduleSummary(s,m){if(!m?.scheduleDate)return[];return s.members.flatMap(p=>{const a=availabilityEntry(s,p.id,m.scheduleDate,m.scheduleType);if(!a)return[];return[{member:p,entry:a,deducted:a.deduct&&m.servings===null&&!m.cooked&&['home','packed'].includes(m.attendance[p.id]),fixed:m.servings!==null||m.cooked}]})}
function validAvailability(s){if(s.availability===undefined)return true;return s.availability&&typeof s.availability==='object'&&!Array.isArray(s.availability)&&Object.values(s.availability).every(dates=>dates&&typeof dates==='object'&&!Array.isArray(dates)&&Object.entries(dates).every(([date,types])=>/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date))&&types&&typeof types==='object'&&!Array.isArray(types)&&Object.entries(types).every(([type,e])=>MEAL_TYPES.includes(type)&&validAvailabilityEntry(e))))}
// v1.7.3 family calendar (owner request): one shared notice of who is busy/away. Pure helpers, no DOM.
// The portion wording always follows the entry's own deduct flag: deduct → no portion is cooked for them.
function availabilityNoPortion(e){return !!e&&e.deduct===true&&['away','busy'].includes(e.status)}
function availabilityStatusLabel(e,lang='vi'){const en=lang==='en',none=availabilityNoPortion(e);return (e?.status==='away'?(en?'Away':'Vắng'):(en?'Busy':'Bận'))+' · '+(none?(en?'no portion':'không nấu phần'):(en?'still cooking their portion':'vẫn nấu phần'))}
const AVAILABILITY_MEAL_LETTER={vi:{breakfast:'S',lunch:'Tr',dinner:'T'},en:{breakfast:'B',lunch:'L',dinner:'D'}};
const AVAILABILITY_MEAL_WORD={vi:{breakfast:'sáng',lunch:'trưa',dinner:'tối'},en:{breakfast:'breakfast',lunch:'lunch',dinner:'dinner'}};
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
const scheduleConsume=consumeMeal,scheduleUndo=undoCook;
consumeMeal=function(s,m){const auto=m.servings===null,portions=mealServings(m,s),result=scheduleConsume(s,m);if(m.cooked&&auto){m.servings=portions;m.attendanceAutoBeforeCook=true}return result};
undoCook=function(s,m){scheduleUndo(s,m);if(m.attendanceAutoBeforeCook){m.servings=null;delete m.attendanceAutoBeforeCook}};
