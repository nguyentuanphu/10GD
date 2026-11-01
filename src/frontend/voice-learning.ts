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
// ---- Vietlish / code-switching (v1.6) ----
// Overseas Vietnamese families mix languages in one breath ("1kg salmon, 2kg tuna", "một ký sa mơn với hai ký tu na").
// Every utterance is parsed with BOTH vocabularies whatever language the recogniser listened in. This curated list adds
// English food words and how a vi-VN recogniser tends to spell them; each maps to an EXISTING catalog id ('' = no
// catalog item: shown with a clean bilingual name, never mapped to a wrong ingredient). Same row shape as VOICE_LEXICON.
const VOICE_VIETLISH=[
 ['salmon','Cá hồi','Salmon','sa mơn','xa mông','sơ mơn','xa mơn','sa môn','sa mông','sam mơn','xá mơn','sơ mông','samon','sammon','xa môn','sà mơn','sam môn','sa mun','xa mun'],
 ['salmon','Phi lê cá hồi','Salmon fillet','phi lê cá hồi','phi lê sa mơn','salmon phi lê'],
 ['tuna','Cá ngừ','Tuna','tuna','tu na','tuy na','tiu na','tu-na','cá ngừ','tuna steak','fresh tuna'],
 ['beef','Thịt bò','Beef','bíp','bíf','bip'],
 ['beef','Bò bít tết','Beef steak','sờ tếch','xờ tếch','sơ tếch','sờ tết','xờ tết','bíp sờ tếch'],
 ['beef','Thịt bò xay','Beef mince','min bò','bíp min','beef min'],
 ['pork','Thịt ba chỉ','Pork belly','pót bé li','pót be li','pót bê li','po bé li','pót ben li','pót bel li'],
 ['pork','Thịt heo xay','Pork mince','min heo','thịt min','pork min'],
 ['chicken','Cánh gà','Chicken wings','chích ken uynh','chích ken uyn','chích ken quynh','chích ken wing','chích ken wings','chicken uynh','chích ken quinh'],
 ['chicken','Thịt gà','Chicken','chích ken','chích kèn','chít ken'],
 ['shrimp','Tôm','Prawns','s rim','sờ rim','sơ rim','xờ rim','sờ rim pờ','pờ ron','prôn','pron','tôm pờ ron'],
 ['broccoli','Bông cải xanh','Broccoli','bờ rốc cô li','bơ rốc cô li','bờ rô cô li','bro co li','brốc cô li','bờ rốc li','bông cải'],
 ['avocado','Quả bơ','Avocado','a vô ca đô','vô ca đô','a vô ca','avocado','avocados','trái bơ','quả bơ'],
 ['bokchoy','Cải thìa','Bok choy','bốc choi','bóc choi','bốc chôi','bok choi','bốc choy'],
 ['cream','Kem tươi','Cream','cream','kem tươi','kem nấu ăn','whipping cream','thickened cream','cooking cream','cờ rim','cờ ri'],
 ['butter','Bơ lạt','Butter','ba tơ','bơ tơ','bát tơ','bá tơ','bắt tơ'],
 ['fish','Phi lê cá','Fish fillet','phi lê','phi lê cá'],
 ['lemon','Chanh vàng','Lemons','lemon','lemons','chanh vàng','le mơn'],
 ['','Phô mai','Cheese','cheese','phô mai','chít','chi chít']
];
// Spoken forms that are too ambiguous to map silently: the preview asks "Có phải: … ?" (one tap) instead.
// [form, ingredient id or '', Vietnamese name, English name]
const VOICE_VIETLISH_ASK=[['kem','cream','Kem tươi','Cream'],['min','pork','Thịt heo xay','Pork mince'],['mince','pork','Thịt heo xay','Pork mince'],['mins','pork','Thịt heo xay','Pork mince'],['chi','','Phô mai','Cheese'],['bơ','avocado','Quả bơ','Avocado'],
 // v1.7.1: Vietnamese recognisers also write "salmon" as the real word "xa lông" (sofa) — ask, never map silently.
 ['sa lông','salmon','Cá hồi','Salmon'],['xa lông','salmon','Cá hồi','Salmon'],['sa long','salmon','Cá hồi','Salmon']];
const VOICE_LEXICON_BASE_LEN=VOICE_LEXICON.length;
VOICE_LEXICON.push(...VOICE_VIETLISH);voiceLexIndex=null;voiceAltRe2Cache=null;
// Extra Vietlish units: "1 cục ba tơ" (a block of butter).
if(!Object.hasOwn(VOICE_UNITS,'cục')){VOICE_UNITS['cục']='cục';VOICE_UNITS.block='cục';VOICE_UNITS.blocks='cục';VOICE_UNIT_EN['cục']=['block','blocks']}
// Fuzzy, phonetic matching: diacritic-stripped, edit distance ≤ 1 (short) / ≤ 2 (longer) on the joined syllables,
// against the Vietnamese AND English catalog names, the bilingual lexicon and the Vietlish list. Returns the best
// candidate with a confidence score in 0..1, or null. Exact hits never come here (the lexicon/parser handle them).
function voiceEditDistance(a,b){if(a===b)return 0;const m=a.length,n=b.length;if(!m||!n)return Math.max(m,n);let prev=Array.from({length:n+1},(_,j)=>j);for(let i=1;i<=m;i++){const cur=[i];for(let j=1;j<=n;j++)cur[j]=Math.min(prev[j]+1,cur[j-1]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));prev=cur}return prev[n]}
function voiceSyllables(t){return normalizeText(String(t||'').normalize('NFC')).replace(/[^a-z0-9 ]+/g,' ').split(/\s+/).filter(Boolean)}
let voiceFuzzyForms=null;
function voiceFuzzyIndex(){if(voiceFuzzyForms)return voiceFuzzyForms;const out=[],seen=new Set();const add=(form,id,vi,en,v)=>{const syl=voiceSyllables(form);if(!syl.length)return;const j=syl.join('');if(j.length<3)return;const k=j+'|'+id+'|'+vi;if(seen.has(k))return;seen.add(k);out.push({j,n:syl.length,id,vi,en,v:!!v})};
 VOICE_LEXICON.forEach(([id,vi,en,...alt],k)=>{const v=k>=VOICE_LEXICON_BASE_LEN;if(!id&&!v)return;if(id&&!Object.hasOwn(INGREDIENTS,id))return;for(const f of v?alt:[vi,en,...alt])add(f,id,vi,en,v)});
 for(const[id,v]of Object.entries(INGREDIENTS)){const vi=String(v[0]).split(/[,(]/)[0].trim(),en=typeof INGREDIENT_EN!=='undefined'&&INGREDIENT_EN[id]?String(INGREDIENT_EN[id]).split(/[,(]/)[0].trim():vi;add(vi,id,vi,en);add(en,id,vi,en)}
 return voiceFuzzyForms=out}
function voiceFuzzyMatch(label,{vietlishOnly=false}={}){const syl=voiceSyllables(label);if(!syl.length)return null;const j=syl.join('');if(j.length<4)return null;let best=null;
 for(const f of voiceFuzzyIndex()){if(vietlishOnly&&!f.v)continue;if(Math.abs(f.n-syl.length)>1)continue;const L=Math.max(j.length,f.j.length);if(Math.abs(j.length-f.j.length)>2)continue;const max=L<=6?1:2,d=voiceEditDistance(j,f.j);if(d>max)continue;const score=d===0?.92:Math.round((1-d/L)*100)/100;if(score<.72)continue;if(!best||score>best.score)best={id:f.id,vi:f.vi,en:f.en,score}}
 return best}
function voiceVietlishAsk(label){const n=normalizeText(String(label||'')).trim();const hit=VOICE_VIETLISH_ASK.find(([f])=>normalizeText(f)===n);if(!hit)return null;const[,id,vi,en]=hit;if(id&&!Object.hasOwn(INGREDIENTS,id))return null;return{id,vi,en,score:.6}}
// A low-confidence match is never applied silently: the line keeps what was heard, flagged for review, with
// `suggest` = {id, vi, en, score}; the preview offers "Có phải: cá hồi (salmon)?" and a confirmed choice is
// remembered through the family's learned corrections (VoiceAPI.learn), so it maps directly next time.
const beforeVietlishItem=voiceItem;voiceItem=function(c,s){return voiceListUnitFix(voiceVietlishItem(c,s),c)};
const VOICE_EGG_X=/^(?:x|ex|xs|x s|exes|x es|x's)$/i;
function voiceVietlishItem(c,s){let it=beforeVietlishItem(c,s);if(!it||!it.label)return it;
 // "5x chicken" / "5 x chicken": a multiplier the recogniser wrote as "x" is the count (the line still asks for a unit).
 {const m=it.qty===null&&/^(\d+(?:[.,]\d+)?)\s*x\s+(\S.*)$/iu.exec(it.label);if(m&&+m[1].replace(',','.')>0&&(it.ingredient||it.names))it={...it,label:m[2],qty:+m[1].replace(',','.'),needsReview:true}}
 if(it.lexKey&&!it.ingredient){const k=+String(it.lexKey).slice(3),e=VOICE_LEXICON[k];if(e&&k>=VOICE_LEXICON_BASE_LEN&&!e[0])return{...it,names:{vi:e[1],en:e[2]},vietlish:true}}
 if(it.lexKey||it.learned||it.names)return it;
 // The v1.5 parser's own fuzzy guess can grab a Vietnamese word inside a Vietlish spelling ("sa mờn" → sả). When the
 // words are clearly closer to a Vietlish form of another ingredient, ask instead of keeping the guess.
 if(it.ingredient){if(voiceSyllables(it.label).length<2)return it;const v=voiceFuzzyMatch(it.label,{vietlishOnly:true});return v&&v.id!==it.ingredient&&v.score>=.8?{...it,ingredient:'',guess:it.ingredient,suggest:v,needsReview:true}:it}
 // "10 galaxies": the v1.5 parser keeps an unknown counted word whole ("3 widgets"); when the rest sounds like a catalog
 // item, separate the count so the suggestion keeps it (the line still needs review).
 const lead=it.qty===null&&/^(\d+(?:[.,]\d+)?|[a-z]+)\s+(.+)$/i.exec(it.label);
 if(lead){const n=/^\d/.test(lead[1])?+lead[1].replace(',','.'):VOICE_EN_NUM[lead[1].toLowerCase()];const rest=lead[2];
  if(Number.isFinite(n)&&n>0){
   // v1.7.1: English recognisers write "5 eggs" as "5x" / "5 x" / "5 ex". Never added silently: the line asks
   // "Có phải: trứng (eggs)?" through the usual did-you-mean, and only right after a count.
   if(VOICE_EGG_X.test(rest.trim())&&Object.hasOwn(INGREDIENTS,'egg'))return{...it,label:rest,qty:n,unit:'quả',suggest:{id:'egg',vi:'Trứng',en:'Eggs',score:.55,heardAs:'x'},needsReview:true};
   const learned=voiceLearnedLookup(s,'i',rest);if(learned){let unit='';try{unit=VOICE_PIECE_IDS.has(learned.id)?'miếng':voiceCountUnit(rest,learned.id)||''}catch{}return{...it,label:rest,qty:n,unit,ingredient:learned.id,names:null,learned:true,needsReview:!unit}}
   const g=voiceVietlishAsk(rest)||voiceFuzzyMatch(rest)||voicePhoneticMatch(rest);if(g){let unit='';try{unit=VOICE_PIECE_IDS.has(g.id)?'miếng':g.id?voiceCountUnit(rest,g.id)||'':''}catch{}return{...it,label:rest,qty:n,unit,suggest:g,needsReview:true}}}}
 const sug=voiceVietlishAsk(it.label)||voiceFuzzyMatch(it.label)||voicePhoneticMatch(it.label);if(!sug)return it;return{...it,suggest:sug,needsReview:true}}
// ---- Spoken lists without "and"/commas, recogniser homophones, phonetic matches (v1.6) ----
// "5 chicken breast 8 tomatoes 6 potatoes …" — people list items in one breath, and recognisers write "eight" as "a"/"ate",
// "two" as "to", "salmons" as "sermons". The original parse is always a candidate; a re-segmented and a homophone-fixed
// reading compete with it and only win when they parse clearly better (more catalog matches, number/item alternation).
const VOICE_LIST_EN_NUM=new Set(['one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety','hundred','half']);
const VOICE_LIST_VI_NUM=new Set(['một','mốt','hai','ba','bốn','tư','năm','lăm','sáu','bảy','bẩy','tám','chín','mười','mươi','trăm','rưỡi','nửa']);
// Recogniser homophones → number word. 'a'/'an' → eight only before a plural noun inside a list (see below).
const VOICE_LIST_HOMOPHONES={to:'two',too:'two',for:'four',fore:'four',ate:'eight',won:'one',tree:'three',fife:'five',nein:'nine',sex:'six',sax:'six',hay:'hai'};
const VOICE_LIST_UNIT_WORDS=new Set(['ký','kí','kg','ki','kilo','kilos','kilô','gam','gram','grams','g','lạng','bó','quả','trái','củ','hộp','gói','con','chai','lon','túi','khay','vỉ','chục','miếng','cái','lít','ml','cây','bịch','cục','tép','nhánh','bunch','bunches','pack','packs','packet','packets','box','boxes','bottle','bottles','can','cans','bag','bags','dozen','tray','trays','piece','pieces','litre','litres','loaf','loaves','punnet','punnets','tin','tins','jar','jars']);
// A number after these words is a date, time, price or headcount, never the start of a new item.
const VOICE_LIST_NO_SPLIT_PREV=new Set(['thứ','ngày','tháng','lúc','giờ','cho','số','khoảng','tầm','giá','at','on','page','by','x','of','and','và','với','or','hoặc','hay','plus','with','then','rồi','mua','buy','get','need','add','thêm','cần','lấy','grab','also','cũng','please','want','order','đặt','still','còn']);
const VOICE_LIST_NO_SPLIT_NEXT=new Set(['người','people','person','giờ','h','pm','am','phút','tuổi','suất','portions','portion','servings','serves','đô','dollar','dollars','bucks','cents','xu','đồng','minutes','hours','o\'clock']);
const VOICE_LIST_STOP_NEXT=new Set(['the','my','list','me','it','this','that','danh','buy','get','be','do','go','make','cook','see','you','us','them']);
function voiceListTokens(text){return String(text||'').normalize('NFC').split(/(\s+|[,.;!?]+)/).filter(x=>x!=='')}
const voiceListWord=t=>/[\p{L}\d]/u.test(t);
function voiceListIsNum(t,next){const l=t.toLowerCase();if(/^\d+(?:[.,]\d+)?[\p{L}]*$/u.test(l))return true;if(VOICE_LIST_EN_NUM.has(l))return true;if(VOICE_LIST_VI_NUM.has(l))return !!next&&VOICE_LIST_UNIT_WORDS.has(next.toLowerCase());return false}
// Rewrite one transcript: optional homophone fixes, then a comma before every number that starts a new item.
function voiceListRewrite(text,{homophones=false}={}){const raw=voiceListTokens(text),idx=[];raw.forEach((t,i)=>{if(voiceListWord(t))idx.push(i)});
 const words=idx.map(i=>raw[i]);const nums=words.filter((w,k)=>voiceListIsNum(w,words[k+1])).length;
 if(homophones&&nums>=2)for(let k=0;k<words.length;k++){const l=words[k].toLowerCase(),next=words[k+1],prev=words[k-1];if(!next||!prev||voiceListIsNum(prev,words[k]))continue;const nl=next.toLowerCase();if(VOICE_LIST_STOP_NEXT.has(nl)||VOICE_LIST_NO_SPLIT_NEXT.has(nl)||voiceListIsNum(next,words[k+2]))continue;
  if(Object.hasOwn(VOICE_LIST_HOMOPHONES,l)){words[k]=VOICE_LIST_HOMOPHONES[l];continue}
  if((l==='a'||l==='an')&&/[^s]s$/i.test(next)&&!VOICE_LIST_UNIT_WORDS.has(nl))words[k]='eight'}
 const out=[];let w=0;for(let i=0;i<raw.length;i++){if(!voiceListWord(raw[i])){out.push(raw[i]);continue}const k=w++,cur=words[k],prev=words[k-1],next=words[k+1];
  if(prev&&voiceListIsNum(cur,next)&&!voiceListIsNum(prev,cur)&&!VOICE_LIST_NO_SPLIT_PREV.has(prev.toLowerCase())&&next&&!VOICE_LIST_NO_SPLIT_NEXT.has(next.toLowerCase())&&!/[,.;!?]\s*$/.test(out.join(''))){while(out.length&&/^\s+$/.test(out[out.length-1]))out.pop();out.push(', ')}
  out.push(cur)}
 return out.join('')}
function voiceListNumberish(label){return(String(label||'').toLowerCase().match(/[\p{L}\d]+/gu)||[]).filter(t=>/^\d/.test(t)||VOICE_LIST_EN_NUM.has(t)).length}
// How good is a parse? Catalog matches count most; lines whose name still holds numbers are what a missed split looks like.
function voiceParseQuality(p){if(!p)return-99;if(p.kind==='meal')return(p.candidates?.length?3:1);let sc=0;for(const i of p.items||[]){sc+=(i.ingredient||i.names?3:i.suggest?1.5:0)+(i.qty!==null?1:0);if(!i.ingredient&&!i.names)sc-=2.5*voiceListNumberish(i.label);const n=(String(i.label||'').match(/[\p{L}\d]+/gu)||[]).length;if(n>4)sc-=n-4}for(const m of p.mealDrafts||[])sc+=m.candidates?.length?2:0;return sc}
function voiceListCandidates(text){const t=String(text||''),a=voiceListRewrite(t),b=voiceListRewrite(t,{homophones:true});return[...new Set([t,a,b])]}
const beforeListParse=parseVoiceInput;parseVoiceInput=function(text,s,baseDate,today){const base=beforeListParse(text,s,baseDate,today);const cands=voiceListCandidates(text);if(cands.length<2)return base;
 let best=base,bestScore=voiceParseQuality(base);for(const c of cands.slice(1)){let p;try{p=beforeListParse(c,s,baseDate,today)}catch{continue}const sc=voiceParseQuality(p);if(sc>=bestScore+1){best=p;bestScore=sc}}
 return best===base?base:{...best,text:String(text),rewritten:true}};
// Recogniser alternatives: add the parse quality so "2 salmon" beats "to sermons" when the engine offers both.
const beforeListAltScore=voiceAltScore;voiceAltScore=function(t,index=0,confidence){const b=beforeListAltScore(t,index,confidence);if(b<0)return b;let q=0;try{const st=typeof state!=='undefined'&&state&&state.recipes?state:{recipes:[]};q=Math.max(-5,Math.min(30,voiceParseQuality(parseVoiceInput(t,st))))}catch{}return b+q*.5};
// A bare count of meat or fish is pieces, never "whole" (con) or an invented weight; a said unit always wins.
const VOICE_PIECE_IDS=new Set(['pork','beef','chicken','salmon','fish','ribs','tuna']);
function voiceListUnitFix(it,c){const q=c&&c.els&&c.els.find(e=>e.t==='qty');if(!it||!q||q.unit||!it.unit)return it;if(VOICE_PIECE_IDS.has(it.ingredient||it.suggest?.id||'')&&['con','cái'].includes(it.unit)&&!/\b(whole|nguyên con)\b/i.test(it.label))return{...it,unit:'miếng'};return it}
// Phonetic key: plural stripped, consonant skeleton with r/l merged ("sermons" ~ "salmon", "galaxies" ~ "garlic").
function voicePhoneticKey(word){let w=normalizeText(String(word||'')).replace(/[^a-z ]/g,'').replace(/\s+/g,'');if(w.length<3)return'';w=w.replace(/ies$/,'y').replace(/(ch|sh|x|s|z|o)es$/,'$1').replace(/([^s])s$/,'$1').replace(/'s$/,'');const first=w[0];w=w.replace(/ph/g,'f').replace(/ck/g,'k').replace(/c/g,'k').replace(/q/g,'k').replace(/x/g,'ks').replace(/z/g,'s').replace(/r/g,'l').replace(/w/g,'');let k=(/[aeiouy]/.test(first)?'a':'')+w.replace(/[aeiouyh]/g,'');k=k.replace(/(.)\1+/g,'$1');return k}
let voicePhoneticForms=null;
function voicePhoneticMatch(label){const key=voicePhoneticKey(label);if(key.length<3)return null;if(!voicePhoneticForms){voicePhoneticForms=[];for(const f of voiceFuzzyIndex()){if(!/^[a-z]+$/.test(f.j))continue;const k=voicePhoneticKey(f.j);if(k.length>=3)voicePhoneticForms.push({...f,k})}}
 let best=null;for(const f of voicePhoneticForms){const d=voiceEditDistance(key,f.k);if(d>1||d===1&&key.length<4)continue;const score=d===0?.8:.7;if(!best||score>best.score||score===best.score&&Math.abs(f.k.length-key.length)<Math.abs(best.k.length-key.length))best={...f,score}}
 return best&&{id:best.id,vi:best.vi,en:best.en,score:best.score}}
// ---- Public, documented surface for other features (Price Scout "Nói giá", recipe dictation, on-device recogniser). ----
// See docs/reviews/v1.6/voice/review.md. Keep names stable; add, don't rename.
globalThis.VoiceAPI=Object.assign(globalThis.VoiceAPI||{},{
 version:'1.6',
 parseVoiceInput:(text,s,baseDate,today)=>parseVoiceInput(text,s,baseDate,today),
 regionalCanon:voiceRegionalCanon,regionalVariants:voiceRegionalVariants,REGIONAL:VOICE_REGIONAL,REGIONAL_UNITS:VOICE_REGIONAL_UNITS,
 learn:voiceLearn,forget:voiceForget,lookupLearned:voiceLearnedLookup,learnedList:voiceLearnedList,learnKey:voiceLearnKey,validLearned:validVoiceLearned,LEARNED_CAP:VOICE_LEARNED_CAP,
 ingredientName:(id,lang)=>voiceIngredientName(id,lang),itemView:(i,lang)=>voiceItemView(i,lang),recipeTitle:(r,lang)=>voiceRecipeTitle(r,lang),
 VIETLISH:VOICE_VIETLISH,VIETLISH_ASK:VOICE_VIETLISH_ASK,fuzzyMatch:voiceFuzzyMatch,editDistance:voiceEditDistance,phoneticKey:voicePhoneticKey,phoneticMatch:voicePhoneticMatch,listRewrite:voiceListRewrite,parseQuality:voiceParseQuality,
 // "Có phải: cá hồi (salmon)?" text for a line's suggestion, in the UI language.
 suggestText:(sug,lang)=>!sug?'':lang==='en'?`Did you mean: ${String(sug.en).toLowerCase()} (${String(sug.vi).toLowerCase()})?`:`Có phải: ${String(sug.vi).toLowerCase()} (${String(sug.en).toLowerCase()})?`
});
