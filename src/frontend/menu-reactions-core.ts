'use strict';
// v1.7.1 Menu reactions (👍 / 👎 per family member per dish) and the small preference model built from them.
// Storage: state.menuReactions = { "<memberId>|<recipeId>": entry }, synced with the rest of the family state.
//   entry = { m: memberId, r: recipeId, n: recipe name copy (display only), v: 'like' | 'dislike' | 'none',
//             why: reason codes, at: ms timestamp of the last change, d: meal/reaction date (YYYY-MM-DD),
//             by: memberId who recorded it ('' = the member themself), h: [{d, v, at}] change history (newest last) }
// Merge is last-write-wins per (member, recipe) on `at`; history is a union of events, so two offline devices never
// lose each other's reactions. Recipe content is never read for writing, copied or changed (only its id and name).
// The model is deterministic: weights use the entry date `d` against the date being planned, never the clock.
const MR_VALUES=['like','dislike','none'];
const MR_REASONS={dislike:[['spicy','Cay quá','Too spicy'],['ingredient','Không thích nguyên liệu','Don’t like an ingredient'],['often','Ăn nhiều rồi','Had it too often'],['hard','Khó ăn','Hard to eat']],like:[['tasty','Ngon','Tasty'],['again','Muốn ăn lại','Want again']]};
const MR_REASON_CODES={like:MR_REASONS.like.map(x=>x[0]),dislike:MR_REASONS.dislike.map(x=>x[0])};
const MR_MAX_ENTRIES=4000,MR_MAX_HISTORY=12,MR_HALF_LIFE=60;
const mrKey=(memberId,recipeId)=>memberId+'|'+recipeId;
const mrDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x));
function mrValidEntry(key,e){return !!e&&typeof e==='object'&&!Array.isArray(e)&&typeof e.m==='string'&&e.m.length>0&&e.m.length<=100&&typeof e.r==='string'&&e.r.length>0&&e.r.length<=150&&key===mrKey(e.m,e.r)&&MR_VALUES.includes(e.v)&&Number.isFinite(e.at)&&e.at>0&&mrDate(e.d)&&(e.n===undefined||typeof e.n==='string'&&e.n.length<=150)&&(e.by===undefined||typeof e.by==='string'&&e.by.length<=100)&&Array.isArray(e.why)&&e.why.length<=6&&e.why.every(w=>(MR_REASON_CODES[e.v]||[]).includes(w))&&Array.isArray(e.h)&&e.h.length<=MR_MAX_HISTORY&&e.h.every(x=>x&&mrDate(x.d)&&MR_VALUES.includes(x.v)&&Number.isFinite(x.at))}
// Drops malformed rows (never whole family states) so a bad row cannot block loading or syncing.
function mrSanitize(s){if(!s||typeof s!=='object')return{};const raw=s.menuReactions;if(raw===undefined)return{};if(!raw||typeof raw!=='object'||Array.isArray(raw)){delete s.menuReactions;return{}}for(const[k,e]of Object.entries(raw))if(!mrValidEntry(k,e))delete raw[k];return raw}
function validMenuReactionState(s){if(s?.menuReactions===undefined)return true;const raw=s.menuReactions;return !!raw&&typeof raw==='object'&&!Array.isArray(raw)&&Object.keys(raw).length<=MR_MAX_ENTRIES&&Object.entries(raw).every(([k,e])=>mrValidEntry(k,e))}
function mrEntries(s){const raw=s?.menuReactions;if(!raw||typeof raw!=='object')return[];const ids=new Set((s.members||[]).map(m=>m.id));return Object.entries(raw).filter(([k,e])=>ids.has(e?.m)&&mrValidEntry(k,e)).map(([,e])=>e)}
function mrEntry(s,memberId,recipeId){const e=s?.menuReactions?.[mrKey(memberId,recipeId)];return e&&mrValidEntry(mrKey(memberId,recipeId),e)?e:null}
function mrValue(s,memberId,recipeId){return mrEntry(s,memberId,recipeId)?.v||'none'}
// Set a member's reaction. value 'like' | 'dislike' | 'none'; toggle=true turns an equal value off (one-tap toggle).
function setMenuReaction(s,{member,recipe,value,reasons,date,by='',at=Date.now(),toggle=false}){
 if(!s?.members?.some(m=>m.id===member))throw Error(typeof tr==='function'?tr('Chọn thành viên trong gia đình.','Choose a family member.'):'Chọn thành viên trong gia đình.');
 const id=String(recipe?.id||'');if(!id||id.length>150)throw Error('Món ăn không hợp lệ.');if(!MR_VALUES.includes(value))throw Error('Invalid reaction');
 const d=mrDate(date)?date:sydneyDate(),key=mrKey(member,id),old=mrEntry(s,member,id),stamp=Math.max(Math.floor(at),(old?.at||0)+1);
 let v=value;if(toggle&&old?.v===value)v='none';
 const keep=old&&old.v===v?old.why:[],why=Array.isArray(reasons)?[...new Set(reasons)].filter(w=>(MR_REASON_CODES[v]||[]).includes(w)):keep.filter(w=>(MR_REASON_CODES[v]||[]).includes(w));
 const h=[...(old?.h||[])];if(!old||old.v!==v)h.push({d,v,at:stamp});
 s.menuReactions=mrSanitize(s);
 const e={m:member,r:id,n:String(recipe.name||old?.n||'').slice(0,150),v,why,at:stamp,d,by:by&&by!==member&&s.members.some(m=>m.id===by)?by:'',h:h.slice(-MR_MAX_HISTORY)};
 s.menuReactions[key]=e;
 // Size guard for the shared state: beyond the cap, the oldest cleared rows go first, then the oldest rows.
 const keys=Object.keys(s.menuReactions);if(keys.length>MR_MAX_ENTRIES){const order=keys.filter(k=>k!==key).sort((a,b)=>Number(s.menuReactions[a].v!=='none')-Number(s.menuReactions[b].v!=='none')||s.menuReactions[a].at-s.menuReactions[b].at);for(const k of order.slice(0,keys.length-MR_MAX_ENTRIES))delete s.menuReactions[k]}
 return e;
}
function toggleMenuReaction(s,member,recipe,value,opts={}){return setMenuReaction(s,{...opts,member,recipe,value,toggle:true})}
function setMenuReactionReasons(s,member,recipe,reasons,opts={}){const old=mrEntry(s,member,recipe.id);if(!old||old.v==='none')return null;return setMenuReaction(s,{...opts,member,recipe,value:old.v,reasons,date:opts.date||old.d})}
// Union of two reaction maps (two devices, offline edits): per key the newest `at` wins; ties resolve on content so
// both devices reach the same result; histories are merged event by event.
function mergeMenuReactions(a,b){
 const out={},A=a&&typeof a==='object'&&!Array.isArray(a)?a:{},B=b&&typeof b==='object'&&!Array.isArray(b)?b:{};
 for(const key of new Set([...Object.keys(A),...Object.keys(B)])){
  const x=mrValidEntry(key,A[key])?A[key]:null,y=mrValidEntry(key,B[key])?B[key]:null;if(!x&&!y)continue;
  const win=!x?y:!y?x:x.at!==y.at?(x.at>y.at?x:y):(JSON.stringify(x)>=JSON.stringify(y)?x:y);
  const seen=new Map();for(const ev of [...(x?.h||[]),...(y?.h||[])])seen.set(ev.at+'|'+ev.v+'|'+ev.d,{d:ev.d,v:ev.v,at:ev.at});
  out[key]={...JSON.parse(JSON.stringify(win)),h:[...seen.values()].sort((p,q)=>p.at-q.at||p.v.localeCompare(q.v)||p.d.localeCompare(q.d)).slice(-MR_MAX_HISTORY)};
 }
 return out;
}
function sameMenuReactions(a,b){const k=x=>JSON.stringify(Object.keys(x||{}).sort().map(key=>[key,x[key]]));return k(a)===k(b)}
// Members expected at a meal: at home / packed / not yet answered, minus calendar absences that deduct portions.
function mealEaters(s,m){if(!m||!m.attendance)return(s.members||[]).map(p=>p.id);return s.members.filter(p=>['home','packed','pending'].includes(m.attendance[p.id]??'home')&&!(m.scheduleDate&&typeof deductsBySchedule==='function'&&deductsBySchedule(s,p.id,m.scheduleDate,m.scheduleType))).map(p=>p.id)}
function mrMeal(s,date,type){return mrDate(date)&&s.weeks?.[monday(date)]?.days?.[date]?.[type]||null}
const MR_SPICY=/(^|[^\p{L}])(cay|ớt|sa tế|spicy|chil+i(es)?|kim ?chi|sriracha|tương ớt|mala)(?=$|[^\p{L}])/iu;
function mrRecipeSpicy(r){return MR_SPICY.test([r?.name,r?.nameEn,...(r?.tags||[]),...(r?.ingredients||[]).map(i=>typeof INGREDIENTS!=='undefined'&&INGREDIENTS[i.id]?INGREDIENTS[i.id][0]:'')].filter(Boolean).join(' · '))}
// Features a reaction teaches about: dish group, protein, spiciness and each ingredient (staples excluded).
function mrFeatures(r){if(!r)return[];const out=[];if(r.category)out.push('cat:'+r.category);if(r.protein&&r.protein!=='unknown')out.push('protein:'+r.protein);if(mrRecipeSpicy(r))out.push('spicy');const staples=typeof PANTRY_STAPLE_IDS!=='undefined'?PANTRY_STAPLE_IDS:new Set();for(const i of r.ingredients||[])if(!staples.has(i.id)&&!['rice','garlic','scallion','onion'].includes(i.id))out.push('ing:'+i.id);return [...new Set(out)]}
const mrAge=(d,asOf)=>Math.max(0,Math.round((parseDate(asOf)-parseDate(d))/86400000));
const mrWeight=(d,asOf)=>Math.pow(.5,mrAge(d,asOf)/MR_HALF_LIFE);
let mrModelMemo=null;
// Preference model: per member and per family recipe scores (likes − dislikes, recency-weighted) and feature affinity.
function menuTasteModel(s,asOf=sydneyDate()){
 const entries=mrEntries(s),sig=asOf+'#'+entries.length+'#'+entries.reduce((n,e)=>Math.max(n,e.at),0)+'#'+(s.recipes?.length||0);
 if(mrModelMemo&&mrModelMemo.s===s&&mrModelMemo.sig===sig)return mrModelMemo.model;
 const byId=new Map((s.recipes||[]).map(r=>[r.id,r])),members={},recipes={};
 for(const p of s.members||[])members[p.id]={id:p.id,likes:[],dislikes:[],features:{},featureCounts:{},reasons:{}};
 for(const e of entries){if(e.v==='none')continue;const w=mrWeight(e.d,asOf),sign=e.v==='like'?1:-1,mem=members[e.m],r=byId.get(e.r);
  (e.v==='like'?mem.likes:mem.dislikes).push(e);for(const why of e.why)mem.reasons[why]=(mem.reasons[why]||0)+1;
  const rec=recipes[e.r]??={id:e.r,name:e.n||r?.name||e.r,recipe:r||null,likes:[],dislikes:[],score:0};(e.v==='like'?rec.likes:rec.dislikes).push(e.m);rec.score+=sign*w;
  for(const f of mrFeatures(r)){const boost=f==='spicy'&&e.why.includes('spicy')?2:f.startsWith('ing:')&&e.why.includes('ingredient')?1.5:1;mem.features[f]=(mem.features[f]||0)+sign*w*boost;mem.featureCounts[f]=(mem.featureCounts[f]||0)+1}
  if(e.v==='dislike'&&e.why.includes('spicy')&&!mrFeatures(r).includes('spicy')){mem.features.spicy=(mem.features.spicy||0)-2*w;mem.featureCounts.spicy=(mem.featureCounts.spicy||0)+1}
 }
 const model={asOf,members,recipes,count:entries.filter(e=>e.v!=='none').length};mrModelMemo={s,sig,model};return model;
}
// Distinct dates on which each recipe was planned or cooked in [asOf − days, asOf).
function mrAppearances(s,asOf,days=28){const out=new Map();for(let i=1;i<=days;i++){const d=addDays(asOf,-i),day=s.weeks?.[monday(d)]?.days?.[d];if(!day)continue;for(const t of (typeof MEAL_TYPES!=='undefined'?MEAL_TYPES:['lunch','dinner'])){for(const r of day[t]?.recipes||[]){const list=out.get(r.id)||[];if(!list.includes(d))list.push(d);out.set(r.id,list)}}}return out}
function mrPatterns(mem){return Object.entries(mem.features).filter(([f,v])=>f!=='cat:main'&&((mem.featureCounts[f]||0)>=2&&Math.abs(v)>=1.4||f==='spicy'&&v<=-1.5)).map(([f,v])=>({feature:f,score:v})).sort((a,b)=>Math.abs(b.score)-Math.abs(a.score)||a.feature.localeCompare(b.feature))}
function mrMemberAvoidsSpicy(model,id){return (model.members[id]?.features.spicy||0)<=-1.5}
// Score breakdown for one recipe for the people eating (default: everyone). Higher = better; added to the planner's
// history bonus (historyRecipeAdjustment), so liked dishes rise, disliked ones sink, favourites are spread out.
function menuReactionInsight(s,r,{date=sydneyDate(),eaters=null,appearances=null}={}){
 const model=menuTasteModel(s,date),ids=(eaters||(s.members||[]).map(m=>m.id)).filter(id=>model.members[id]),res={score:0,likes:[],dislikes:[],fatigue:false,longGap:false,similar:null,spicySafe:[],spicyWarn:[],count:model.count};
 if(!model.count||!r)return res;
 const feats=mrFeatures(r),spicy=feats.includes('spicy');
 for(const id of ids){const e=mrEntry(s,id,r.id),mem=model.members[id];if(e&&e.v!=='none'){const w=mrWeight(e.d,date);if(e.v==='like'){res.likes.push(id);res.score+=3*w+(e.why.includes('again')?1:0)}else{res.dislikes.push(id);res.score-=14*w+(e.why.includes('hard')?1:0)}continue}
  let aff=0;for(const f of feats)aff+=(mem.features[f]||0)*(f.startsWith('ing:')?.5:f==='spicy'?1.5:.8);res.score+=Math.max(-4,Math.min(4,aff));
  if(mrMemberAvoidsSpicy(model,id)){if(spicy){res.spicyWarn.push(id);res.score-=6}else res.spicySafe.push(id)}
  if(aff>=1.2&&!res.similar)res.similar=feats.find(f=>f.startsWith('protein:')&&(mem.features[f]||0)>0)||feats.find(f=>f.startsWith('cat:')&&(mem.features[f]||0)>0)||null}
 if(res.dislikes.length)res.score-=8+2*(res.dislikes.length-1);
 if(res.likes.length&&res.likes.length===ids.length&&ids.length>1)res.score+=2;
 if(res.likes.length&&!res.dislikes.length){const app=(appearances||mrAppearances(s,date,28)).get(r.id)||[],recent=app.filter(d=>d>=addDays(date,-14)).length,often=mrEntries(s).some(e=>e.r===r.id&&e.v==='dislike'&&e.why.includes('often')&&e.d>=addDays(date,-21));
  if(recent>=2||often){res.fatigue=true;res.score-=6}else if(!app.length){res.longGap=true;res.score+=3}}
 res.score=Math.max(-30,Math.min(15,Math.round(res.score*100)/100));return res;
}
function reactionRecipeAdjustment(s,r,ctx={}){if(!s?.menuReactions)return 0;return menuReactionInsight(s,r,ctx).score}
const mrName=(s,id)=>{const m=s.members?.find(x=>x.id===id);return m?m.name:''};
const mrList=(s,ids)=>{const names=ids.map(id=>mrName(s,id)).filter(Boolean);return names.length<=2?names.join(typeof tr==='function'?tr(' và ',' and '):' và '):names.slice(0,2).join(', ')+' +'+(names.length-2)};
const MR_PROTEIN={pork:['thịt heo','pork'],chicken:['gà','chicken'],beef:['bò','beef'],fish:['cá','fish'],shrimp:['tôm','prawns'],egg:['trứng','eggs'],plant:['đậu hũ / chay','plant-based'],salmon:['cá hồi','salmon']};
const MR_CAT={main:['món mặn','mains'],soup:['canh','soups'],veg:['món rau','vegetables'],noodle:['món nước','noodle dishes']};
function mrFeatureLabel(f){const t=typeof tr==='function'?tr:(vi)=>vi;if(f==='spicy')return t('món cay','spicy food');const[k,v]=f.split(':');if(k==='protein')return MR_PROTEIN[v]?t(...MR_PROTEIN[v]):v;if(k==='cat')return MR_CAT[v]?t(...MR_CAT[v]):v;if(k==='ing')return typeof INGREDIENTS!=='undefined'&&INGREDIENTS[v]?(typeof shopIngName==='function'?shopIngName(v):INGREDIENTS[v][0])/* re-check 13 Nov 2026: ingredientName never existed, so EN showed the VI name */:v;return f}
// One short line explaining why a dish is (or is not) a good pick for these eaters; '' when reactions say nothing.
function menuReactionReason(s,r,ctx={}){const t=typeof tr==='function'?tr:(vi)=>vi,x=menuReactionInsight(s,r,ctx),ids=ctx.eaters||(s.members||[]).map(m=>m.id);if(!x.count)return'';
 if(x.dislikes.length)return t(`${mrList(s,x.dislikes)} không thích món này`,`${mrList(s,x.dislikes)} ${x.dislikes.length>1?'don’t':'doesn’t'} like this dish`);
 if(x.spicyWarn.length)return t(`${mrList(s,x.spicyWarn)} không thích cay — món này có vị cay`,`${mrList(s,x.spicyWarn)} ${x.spicyWarn.length>1?'avoid':'avoids'} spicy food — this dish is spicy`);
 const all=x.likes.length&&x.likes.length===ids.length&&ids.length>1,who=all?t('Cả nhà thích','Everyone likes it'):x.likes.length?t(`${mrList(s,x.likes)} thích`,`${mrList(s,x.likes)} ${x.likes.length>1?'like':'likes'} it`):'';
 if(who)return who+(x.fatigue?t(' · ăn nhiều gần đây, nên cho nghỉ',' · had often lately, give it a rest'):x.longGap?t(' · lâu rồi chưa ăn',' · not had for a while'):'');
 if(x.spicySafe.length)return t(`${mrList(s,x.spicySafe)} không thích cay — món này không cay`,`${mrList(s,x.spicySafe)} ${x.spicySafe.length>1?'avoid':'avoids'} spicy food — this dish isn’t spicy`);
 if(x.similar)return t(`Giống món nhà mình thích (${mrFeatureLabel(x.similar)})`,`Similar to dishes you like (${mrFeatureLabel(x.similar)})`);
 return'';
}
// Family tastes summary for the insights view (all derived from reactions + the meal plan; no new data leaves the family).
function familyTasteSummary(s,asOf=sydneyDate()){
 const model=menuTasteModel(s,asOf),all=Object.values(model.recipes),app=mrAppearances(s,asOf,28),byScore=(a,b)=>b.score-a.score||b.likes.length-a.likes.length||String(a.name).localeCompare(String(b.name))||a.id.localeCompare(b.id);
 const loved=all.filter(x=>x.likes.length&&x.score>0).sort(byScore);
 const longGap=loved.filter(x=>!x.dislikes.length&&!(app.get(x.id)||[]).length&&x.likes.length>=Math.min(2,(s.members||[]).length));
 const avoid=all.filter(x=>x.dislikes.length).sort((a,b)=>b.dislikes.length-a.dislikes.length||a.score-b.score||a.id.localeCompare(b.id));
 const members=(s.members||[]).map(p=>{const m=model.members[p.id],sort=(a,b)=>b.at-a.at||a.r.localeCompare(b.r);return{member:p,likes:[...m.likes].sort(sort),dislikes:[...m.dislikes].sort(sort),patterns:mrPatterns(m),reasons:m.reasons}});
 const familyFeatures={};for(const m of Object.values(model.members))for(const[f,v]of Object.entries(m.features))familyFeatures[f]=(familyFeatures[f]||0)+v;
 const patterns=Object.entries(familyFeatures).filter(([f,v])=>f!=='cat:main'&&Math.abs(v)>=1.4).map(([feature,score])=>({feature,score})).sort((a,b)=>Math.abs(b.score)-Math.abs(a.score)||a.feature.localeCompare(b.feature));
 const weekStartDate=addDays(asOf,-6),week=mrEntries(s).filter(e=>e.d>=weekStartDate&&e.d<=asOf&&e.v!=='none'),weekLikes=week.filter(e=>e.v==='like'),weekDislikes=week.filter(e=>e.v==='dislike');
 const counts=new Map();for(const e of weekLikes)counts.set(e.r,(counts.get(e.r)||0)+1);const topWeek=[...counts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0];
 return{model,count:model.count,loved,longGap,avoid,members,patterns,week:{from:weekStartDate,to:asOf,likes:weekLikes.length,dislikes:weekDislikes.length,people:new Set(week.map(e=>e.m)).size,top:topWeek?{id:topWeek[0],name:model.recipes[topWeek[0]]?.name||topWeek[0],likes:topWeek[1]}:null}};
}
// --- planner integration ----------------------------------------------------------------------------------------
// The weekly auto-plan (pickSlotRecipe in family-menu-core), "Gợi ý" on Today and Insights all rank through
// historyRecipeAdjustment; reactions add their bonus there. pickSlotRecipe passes the slot date/type so the people
// eating that meal decide (absent members' dislikes do not block a dish).
let mrSlotContext=null;
if(typeof historyRecipeAdjustment==='function'){const mrBaseHistory=historyRecipeAdjustment;historyRecipeAdjustment=function(s,r,date=sydneyDate()){const base=mrBaseHistory(s,r,date);if(base<=-100||!s?.menuReactions)return base;const ctx=mrSlotContext&&mrSlotContext.s===s?mrSlotContext:null;return base+reactionRecipeAdjustment(s,r,{date:ctx?.date||date,eaters:ctx?.eaters||null,appearances:ctx?.appearances||null})}}
if(typeof pickSlotRecipe==='function'){const mrBasePick=pickSlotRecipe;pickSlotRecipe=function(s,purpose,role,use,refDate,random,exclude,options={}){const prev=mrSlotContext;try{if(s?.menuReactions){const meal=options?.date?mrMeal(s,options.date,options.type):null,date=refDate||sydneyDate();mrSlotContext={s,date,eaters:meal?mealEaters(s,meal):null,appearances:mrAppearances(s,date,28)}}return mrBasePick.apply(this,arguments)}finally{mrSlotContext=prev}}}
if(typeof validImport==='function'){const mrBaseValid=validImport;validImport=function(s){if(s&&typeof s==='object'&&s.menuReactions!==undefined)mrSanitize(s);return mrBaseValid(s)}}
