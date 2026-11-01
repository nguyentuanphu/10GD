'use strict';
// ---- Voice v1.6: regional synonyms + per-family learned corrections (pure, no DOM) ----
// Loaded right after personal-core.js; also executed in node:vm by tests.
// Regional words (Bắc/Nam) are folded to one canonical spelling ONLY for matching; what the family said is kept as said.
// Learned corrections: when someone fixes a preview line's ingredient or dish, the phrase → id pair is stored in the
// family state as `voiceLearned` (optional, small, capped). In account mode it syncs with the family like any other
// field; for guests the whole state is device-only, so the list is too. Older clients ignore the unknown field.
// Order of matching for every heard phrase: learned correction → normal parser → regional-synonym retry.
const VOICE_LEARNED_CAP=300;
// [canonical, ...variants] — accented, lower case. "trái/quả" are units and handled by the unit parser (VOICE_UNITS).
const VOICE_REGIONAL=[
 ['heo','lợn'],['bắp','ngô'],['thơm','dứa','khóm'],['đậu phộng','lạc'],['mì','mỳ'],['ngò','rau mùi','ngò rí'],
 ['hành lá','hành hoa'],['mướp','mướp hương'],['bí xanh','bí đao'],['khoai mì','sắn'],['cá lóc','cá quả'],
 ['đậu hũ','đậu phụ'],['dưa leo','dưa chuột'],['bông cải','súp lơ'],['mè','vừng'],['chả lụa','giò lụa'],
 ['nước tương','xì dầu'],['bánh tráng','bánh đa nem'],['tàu hũ ky','váng đậu'],['củ cải trắng','củ cải']
];
// Unit pairs, documented for VoiceAPI users (the shopping parser already reads both).
const VOICE_REGIONAL_UNITS=[['quả','trái'],['muỗng','thìa'],['tô','bát'],['ly','cốc']];
// Phrases that must never be rewritten (different foods that share a word).
const VOICE_REGIONAL_PROTECT=['lá dứa','bí ngô','rau mùi tàu','sắn dây','củ cải đỏ','củ cải đường','bánh mì','bột mì','lúa mì','mì ý','dầu mè'];
let voiceRegionalRe=null;
function voiceRegionalRules(){if(voiceRegionalRe)return voiceRegionalRe;const B='(?<![\\p{L}\\p{M}\\d])',A='(?![\\p{L}\\p{M}\\d])',esc=w=>w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const rules=[];for(const[canon,...variants]of VOICE_REGIONAL)for(const v of variants)rules.push({v,canon,re:new RegExp(B+esc(v)+A,'gu')});rules.sort((a,b)=>b.v.length-a.v.length);return voiceRegionalRe=rules}
// Fold regional variants to the canonical word. Works on accented text; plain (accent-less) text is returned as is.
function voiceRegionalCanon(text){let t=String(text||'').normalize('NFC').toLowerCase().replace(/\s+/g,' ').trim();if(!t)return'';const masks=[];VOICE_REGIONAL_PROTECT.forEach((p,i)=>{if(t.includes(p)){t=t.split(p).join('\u0000'+i+'\u0000');masks.push(i)}});for(const r of voiceRegionalRules())t=t.replace(r.re,r.canon);for(const i of masks)t=t.split('\u0000'+i+'\u0000').join(VOICE_REGIONAL_PROTECT[i]);return t}
function voiceRegionalVariants(word){const w=String(word||'').normalize('NFC').toLowerCase().trim();const g=VOICE_REGIONAL.find(x=>x.includes(w))||VOICE_REGIONAL_UNITS.find(x=>x.includes(w));return g?g.slice():[w]}
// ---- Learned corrections ----
function voiceLearnKey(phrase){return normalizeText(voiceRegionalCanon(phrase)).replace(/\s+/g,' ').trim().slice(0,80)}
function validVoiceLearned(s){const v=s?.voiceLearned;if(v===undefined)return true;return Array.isArray(v)&&v.length<=1000&&v.every(e=>e&&typeof e==='object'&&!Array.isArray(e)&&typeof e.p==='string'&&e.p.length>0&&e.p.length<=80&&typeof e.k==='string'&&e.k.length>0&&e.k.length<=8&&typeof e.id==='string'&&e.id.length>0&&e.id.length<=80&&(e.at===undefined||typeof e.at==='string'&&e.at.length<=24)&&(e.by===undefined||typeof e.by==='string'&&e.by.length<=80)&&(e.w===undefined||typeof e.w==='string'&&e.w.length<=80))}
function voiceLearnedTargetExists(s,k,id){if(k==='i')return typeof INGREDIENTS!=='undefined'&&Object.hasOwn(INGREDIENTS,id);if(k==='r')return(s?.recipes||[]).some(r=>r.id===id);return false}
function voiceLearnedLookup(s,k,phrase){const list=s?.voiceLearned;if(!Array.isArray(list)||!list.length)return null;const key=voiceLearnKey(phrase);if(!key)return null;const e=list.find(x=>x&&x.k===k&&x.p===key);return e&&voiceLearnedTargetExists(s,k,e.id)?e:null}
// Remember phrase → id. Newest first, one entry per phrase+kind, capped. Returns the stored entry (or null when nothing to learn).
function voiceLearn(s,k,phrase,id,{by,at}={}){if(!s||!['i','r'].includes(k))return null;const key=voiceLearnKey(phrase);if(!key||key.length<2||!id||String(id).length>80||!voiceLearnedTargetExists(s,k,id))return null;const list=Array.isArray(s.voiceLearned)?s.voiceLearned.filter(e=>!(e&&e.k===k&&e.p===key)):[];const said=String(phrase).normalize('NFC').replace(/\s+/g,' ').trim().slice(0,80),entry={p:key,k,id:String(id),...(said&&said.toLowerCase()!==key?{w:said}:{}),at:at||(typeof sydneyDate==='function'?sydneyDate():new Date().toISOString().slice(0,10)),...(by?{by:String(by).slice(0,80)}:{})};list.unshift(entry);s.voiceLearned=list.slice(0,VOICE_LEARNED_CAP);return entry}
function voiceForget(s,k,phrase){if(!Array.isArray(s?.voiceLearned))return false;const key=voiceLearnKey(phrase),n=s.voiceLearned.length;s.voiceLearned=s.voiceLearned.filter(e=>!(e&&e.k===k&&e.p===key));if(!s.voiceLearned.length)delete s.voiceLearned;return(s.voiceLearned?.length||0)!==n}
function voiceLearnedList(s){return(Array.isArray(s?.voiceLearned)?s.voiceLearned:[]).filter(e=>e&&['i','r'].includes(e.k))}
// ---- Parser hooks (wrap, never replace, the v1.5 parser) ----
// Older/newer states with an invalid list are rejected like any other malformed field; a missing list is fine.
const beforeVoiceLearnValidImport=validImport;validImport=function(s){return beforeVoiceLearnValidImport(s)&&validVoiceLearned(s)};
const beforeVoiceLearnItem=voiceItem;voiceItem=function(c,s){const it=beforeVoiceLearnItem(c,s);if(!it||!it.label)return it;const learned=voiceLearnedLookup(s,'i',it.label);if(learned){const names=it.names&&it.ingredient===learned.id?it.names:null;return{...it,ingredient:learned.id,names,lexKey:names?it.lexKey:'',learned:true,needsReview:it.qty===null||!it.unit||!!it.unitNote}}if(!it.ingredient){const canon=voiceRegionalCanon(it.label);if(canon&&canon!==it.label.normalize('NFC').toLowerCase()){const lex=voiceLexiconFind(canon),id=lex?lex.id:voiceIngredient(canon,s);if(id)return{...it,ingredient:id,names:null,lexKey:lex?lex.key:'',regional:canon,needsReview:it.qty===null||!it.unit||!!it.unitNote}}}return it};
let voiceRegionalRecipeNames=null;
const beforeVoiceLearnMatch=matchVoiceRecipes;matchVoiceRecipes=function(clause,s){const learned=voiceLearnedLookup(s,'r',clause);const base=beforeVoiceLearnMatch(clause,s);if(learned){const r=(s.recipes||[]).find(x=>x.id===learned.id);return[r,...base.filter(x=>x.id!==r.id)]}const canon=voiceRegionalCanon(clause);if(!canon||base.some(ownRecipe))return base;voiceRegionalRecipeNames??=new Map();const n=normalizeText(canon),regional=(list)=>list.filter(r=>{let rn=voiceRegionalRecipeNames.get(r.name);if(rn===undefined){rn=normalizeText(voiceRegionalCanon(r.name)).replace(/\s+nhanh$/,'');voiceRegionalRecipeNames.set(r.name,rn)}return rn.length>=4&&(n===rn||n.includes(rn)||rn.startsWith(n+' '))}).sort((a,b)=>(Number(ownRecipe(b))-Number(ownRecipe(a)))||(b.name.length-a.name.length));
 // Family recipes named with the other region's word come first; then whatever already matched.
 const own=regional((s.recipes||[]).filter(ownRecipe));if(base.length)return[...own,...base.filter(r=>!own.includes(r))];const again=canon===String(clause).normalize('NFC').toLowerCase().trim()?[]:beforeVoiceLearnMatch(canon,s);if(again.length)return[...own,...again.filter(r=>!own.includes(r))];return own.length?own:regional(s.recipes||[])};
// The meal draft passes the accented dish so the regional retry can see the diacritics.
const beforeVoiceLearnMeal=voiceMealDraft;voiceMealDraft=function(c,s,baseDate,today){const d=beforeVoiceLearnMeal(c,s,baseDate,today);if(!d.dish||d.ownCandidates.length&&!voiceLearnedLookup(s,'r',d.dish))return d;const matches=matchVoiceRecipes(d.dish,s);if(!matches.length)return d;const own=matches.filter(ownRecipe),lib=matches.filter(r=>!ownRecipe(r));return{...d,candidates:[...own,...lib].map(r=>r.id),ownCandidates:own.map(r=>r.id),libraryCandidates:lib.map(r=>r.id),needsRecipe:false}};
// ---- Public, documented surface for other features (Price Scout "Nói giá", recipe dictation, on-device recogniser). ----
// See docs/reviews/v1.6/voice/review.md. Keep names stable; add, don't rename.
globalThis.VoiceAPI=Object.assign(globalThis.VoiceAPI||{},{
 version:'1.6',
 parseVoiceInput:(text,s,baseDate,today)=>parseVoiceInput(text,s,baseDate,today),
 regionalCanon:voiceRegionalCanon,regionalVariants:voiceRegionalVariants,REGIONAL:VOICE_REGIONAL,REGIONAL_UNITS:VOICE_REGIONAL_UNITS,
 learn:voiceLearn,forget:voiceForget,lookupLearned:voiceLearnedLookup,learnedList:voiceLearnedList,learnKey:voiceLearnKey,validLearned:validVoiceLearned,LEARNED_CAP:VOICE_LEARNED_CAP,
 ingredientName:(id,lang)=>voiceIngredientName(id,lang),itemView:(i,lang)=>voiceItemView(i,lang),recipeTitle:(r,lang)=>voiceRecipeTitle(r,lang)
});
