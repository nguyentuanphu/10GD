'use strict';
function availabilityEntry(s,memberId,date,type){return s.availability?.[memberId]?.[date]?.[type]||null}
function deductsBySchedule(s,memberId,date,type){const a=availabilityEntry(s,memberId,date,type);return !!a&&a.deduct&&['away','busy'].includes(a.status)}
const availabilityEnsureWeek=ensureWeek;
ensureWeek=function(s,start){const w=availabilityEnsureWeek(s,start);for(const[date,day]of Object.entries(w.days))for(const type of MEAL_TYPES){if(day[type]){day[type].scheduleDate=date;day[type].scheduleType=type}}return w};
const attendanceServings=mealServings;
mealServings=function(m,s){if(m.servings!==null||m.cooked||!m.scheduleDate)return attendanceServings(m,s);return s.members.reduce((n,p)=>n+(['home','packed'].includes(m.attendance[p.id])&&!deductsBySchedule(s,p.id,m.scheduleDate,m.scheduleType)?p.weight:0),0)};
function setAvailability(s,memberId,dates,types,entry){
 if(!s.members.some(m=>m.id===memberId)||!dates.length||!types.length||dates.length>31||!dates.every(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d)))||!types.every(t=>MEAL_TYPES.includes(t)))throw Error('Chọn thành viên, ngày và bữa hợp lệ.');
 if(entry&&(!['away','busy'].includes(entry.status)||typeof entry.deduct!=='boolean'||typeof entry.remind!=='boolean'||typeof entry.note!=='string'||entry.note.length>150))throw Error('Lịch chưa hợp lệ.');
 // Preserve the already-recorded portions of cooked meals before changing future availability.
 for(const w of Object.values(s.weeks))for(const day of Object.values(w.days))for(const t of MEAL_TYPES){const m=day[t];if(m?.cooked&&m.servings===null)m.servings=attendanceServings(m,s)}
 s.availability??={};s.availability[memberId]??={};for(const date of dates){s.availability[memberId][date]??={};for(const type of types){if(entry)s.availability[memberId][date][type]={...entry};else delete s.availability[memberId][date][type]}if(!Object.keys(s.availability[memberId][date]).length)delete s.availability[memberId][date]}
}
function scheduleSummary(s,m){if(!m?.scheduleDate)return[];return s.members.flatMap(p=>{const a=availabilityEntry(s,p.id,m.scheduleDate,m.scheduleType);if(!a)return[];return[{member:p,entry:a,deducted:a.deduct&&m.servings===null&&!m.cooked&&['home','packed'].includes(m.attendance[p.id]),fixed:m.servings!==null||m.cooked}]})}
function validAvailability(s){if(s.availability===undefined)return true;return s.availability&&typeof s.availability==='object'&&!Array.isArray(s.availability)&&Object.values(s.availability).every(dates=>dates&&typeof dates==='object'&&!Array.isArray(dates)&&Object.entries(dates).every(([date,types])=>/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date))&&types&&typeof types==='object'&&!Array.isArray(types)&&Object.entries(types).every(([type,e])=>MEAL_TYPES.includes(type)&&e&&['away','busy'].includes(e.status)&&typeof e.deduct==='boolean'&&typeof e.remind==='boolean'&&typeof e.note==='string'&&e.note.length<=150)))}
const scheduleConsume=consumeMeal,scheduleUndo=undoCook;
consumeMeal=function(s,m){const auto=m.servings===null,portions=mealServings(m,s),result=scheduleConsume(s,m);if(m.cooked&&auto){m.servings=portions;m.attendanceAutoBeforeCook=true}return result};
undoCook=function(s,m){scheduleUndo(s,m);if(m.attendanceAutoBeforeCook){m.servings=null;delete m.attendanceAutoBeforeCook}};
