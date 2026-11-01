'use strict';
// Recipe dictation (v1.6): "🎙 Đọc công thức / Dictate a recipe" in the family recipe form.
// Pure part: segments a long spoken (or typed) recipe into title, servings, time, ingredients
// (quantity + unit only when actually said; "một ít", "vừa ăn", "to taste" … stay blank and are
// flagged "cần điền") and numbered steps (split on rồi / sau đó / xong / then / next …).
// UI part: several takes with pause/continue, a review screen to edit everything, then the
// existing recipe form is filled for saving as a NEW family recipe (never overwrites one).
// Uses VoicePrice tokens/numbers (voice-price.js) read-only.

const VR=globalThis.VoicePrice;
// Units: [phrase, display VI, display EN, form unit|null, factor]
const VR_UNITS=[
 ['muỗng canh','muỗng canh','tbsp',null,1],['thìa canh','muỗng canh','tbsp',null,1],['muỗng to','muỗng canh','tbsp',null,1],['thìa to','muỗng canh','tbsp',null,1],['tablespoons','muỗng canh','tbsp',null,1],['tablespoon','muỗng canh','tbsp',null,1],['tbsp','muỗng canh','tbsp',null,1],
 ['muỗng cà phê','muỗng cà phê','tsp',null,1],['thìa cà phê','muỗng cà phê','tsp',null,1],['muỗng nhỏ','muỗng cà phê','tsp',null,1],['thìa nhỏ','muỗng cà phê','tsp',null,1],['teaspoons','muỗng cà phê','tsp',null,1],['teaspoon','muỗng cà phê','tsp',null,1],['tsp','muỗng cà phê','tsp',null,1],
 ['muỗng','muỗng','spoon',null,1],['thìa','muỗng','spoon',null,1],['chén','chén','bowl',null,1],['bát','bát','bowl',null,1],['ly','ly','glass',null,1],['cốc','cốc','cup',null,1],['tách','tách','cup',null,1],['cups','cốc','cup',null,1],['cup','cốc','cup',null,1],
 ['ki lô gam','kg','kg','kg',1],['ki lô','kg','kg','kg',1],['kí lô','kg','kg','kg',1],['kilograms','kg','kg','kg',1],['kilogram','kg','kg','kg',1],['kilos','kg','kg','kg',1],['kilo','kg','kg','kg',1],['kg','kg','kg','kg',1],['ký','kg','kg','kg',1],['kí','kg','kg','kg',1],['cân','kg','kg','kg',1],
 ['lạng','g','g','g',100],['gam','g','g','g',1],['gram','g','g','g',1],['grams','g','g','g',1],['gờ ram','g','g','g',1],['gr','g','g','g',1],['g','g','g','g',1],
 ['mi li lít','ml','ml','ml',1],['mililít','ml','ml','ml',1],['millilitres','ml','ml','ml',1],['milliliters','ml','ml','ml',1],['ml','ml','ml','ml',1],
 ['lít','l','l','l',1],['litres','l','l','l',1],['litre','l','l','l',1],['liters','l','l','l',1],['liter','l','l','l',1],['l','l','l','l',1],
 ['quả','quả','each','quả',1],['trái','quả','each','quả',1],['cái','cái','piece','cái',1],['chiếc','cái','piece','cái',1],['pieces','cái','piece','cái',1],['piece','cái','piece','cái',1],
 ['bó','bó','bunch','bó',1],['bunches','bó','bunch','bó',1],['bunch','bó','bunch','bó',1],['gói','gói','packet','gói',1],['packets','gói','packet','gói',1],['packet','gói','packet','gói',1],['packs','gói','packet','gói',1],['pack','gói','packet','gói',1],
 ['miếng','miếng','slice','miếng',1],['lát','miếng','slice','miếng',1],['slices','miếng','slice','miếng',1],['slice','miếng','slice','miếng',1],
 ['củ','củ','bulb',null,1],['tép','tép','clove',null,1],['cloves','tép','clove',null,1],['clove','tép','clove',null,1],['nhánh','nhánh','sprig',null,1],['sprigs','nhánh','sprig',null,1],['sprig','nhánh','sprig',null,1],['cây','cây','stalk',null,1],['stalks','cây','stalk',null,1],['stalk','cây','stalk',null,1],['con','con','whole',null,1],['khúc','khúc','chunk',null,1],['hộp','hộp','box',null,1],['lon','lon','can',null,1],['cans','lon','can',null,1],['can','lon','can',null,1],['tins','lon','can',null,1],['tin','lon','can',null,1],['chai','chai','bottle',null,1],['bottle','chai','bottle',null,1],['xấp','xấp','stack',null,1],['bịch','bịch','bag',null,1],['túi','túi','bag',null,1]
];
// Vague amounts: kept as text, quantity left blank and flagged.
const VR_VAGUE=['một ít','một chút','chút xíu','một xíu','chút','ít','vừa đủ','vừa ăn','tùy thích','tùy ý','tùy khẩu vị','một nắm','nắm','vài','dăm','some','a little','a bit of','a bit','to taste','a pinch of','a pinch','pinch of','pinch','a dash of','a dash','dash','a handful of','a handful','handful','a few','as needed','enough'];
const VR_ING_MARK=['nguyên liệu gồm có','nguyên liệu gồm','nguyên liệu cần có','nguyên liệu cần','nguyên liệu có','nguyên liệu là','nguyên liệu','cần có','cần chuẩn bị','mình cần có','mình cần','ingredients are','ingredients','you will need',"you'll need",'youll need','you need','what you need'];
// Common Vietnamese kitchen words that help split names said back to back without pauses.
const VR_COMMON=['hành tím','hành lá','hành tây','hành','tỏi','ớt','sả','gừng','tiêu','muối','đường','đường phèn','nước mắm','bột ngọt','hạt nêm','dầu ăn','nước màu','me','giá','bạc hà','thơm','dứa','nước dừa','ngò','ngò gai','ngò rí','rau om','rau răm','húng quế','hẹ','chanh','nước tương','xì dầu','dầu hào','bún','bánh phở','bánh tráng','trứng','cà chua','quế','hồi','hạt ngò','spring onions','garlic','ginger','salt','pepper','sugar','fish sauce','soy sauce','oyster sauce','chilli','lime','coriander'];
const VR_STEP_MARK=['cách làm','cách nấu','cách chế biến','các bước','bước một','bước 1','đầu tiên','trước tiên','trước hết','method','directions','instructions','steps','first of all','firstly','first','to start','start by'];
const VR_SPLIT=['sau đó','xong rồi','xong','tiếp theo','tiếp đến','kế tiếp','kế đến','cuối cùng','rồi','after that','afterwards','and then','then','next','finally','lastly'];
const VR_COOK=['đập','đánh','gọt','lặt','nhặt','xay','giã','rang','trụng','chần','hầm','om','rim','đảo','khuấy','lọc','vo','bằm','khử','thắng','tráng','rắc','rưới','chan','rửa','ướp','phi','xào','nấu','luộc','chiên','rán','đun','cắt','thái','băm','trộn','nêm','hấp','nướng','kho','ngâm','bóc','lột','sơ chế','làm sạch','pha','đổ','bắc','vớt','nhúng','cuốn','gói','dọn','múc','wash','rinse','chop','slice','dice','marinate','fry','boil','add','heat','stir','cut','mix','bake','simmer','soak','peel','bring','preheat','combine','place','put','pour','season','cook','grill','steam','blend','whisk','serve','roll','dip'];
const VR_LINK=['và','với lại','với','cùng','cộng','thêm','and','plus','also','with','of','nữa','nha','nhé','có','gồm','là','loại','khoảng','chừng','tầm','about','around','approximately','roughly'];
const VR_LEAD=['thì','là','mình','con','các con','cháu','các cháu','bà','mẹ','em','ta','chúng ta','we','you','ok','okay','rồi','nhé','nha','và','and','then','xong'];
const VR_TAIL=['nhé','nha','nè','ạ','nhá','đó','nhen','okay','ok'];

function vrUnitAt(T,j){let best=null;for(const e of VR_UNITS){const end=VR.phrase(T,j,[e[0]]);if(!end||best&&end<=best.end)continue;
  const t=T[j];if(T.acc&&e[0]!==VR.fold(e[0])&&t.w!==e[0].split(' ')[0])continue;// accented VI unit must be spoken with accents
  if(['g','l','gr'].includes(e[0])&&!(T[j-1]&&/^\d/.test(T[j-1].w)))continue;
  if(T.acc&&e[0]==='can'&&t.w!=='can')continue;
  best={e,end}}
 return best?{vi:best.e[1],en:best.e[2],form:best.e[3],factor:best.e[4],end:best.end}:null}
function vrVagueAt(T,j){let best=0;for(const v of VR_VAGUE){const end=VR.phrase(T,j,[v]);if(!end||end<=best)continue;if(T.acc&&v!==VR.fold(v)&&T[j].w!==v.split(' ')[0])continue;if(!T.acc&&['it','nam','chut'].includes(VR.fold(v)))continue;best=end}return best}
// Quantity at j: number [unit] [rưỡi] | nửa/half [a] unit | a/an/một unit | vague words
function vrQtyAt(T,j){
 const t=T[j];if(!t||t.sep)return null;
 const vg=vrVagueAt(T,j);if(vg){const u=vrUnitAt(T,vg);return{qty:null,vague:true,unit:u,end:u?u.end:vg,said:T.slice(j,u?u.end:vg).map(x=>x.o).join(' ')}}
 let n=null,k=j;
 if(VR.phrase(T,j,['nửa','half a','half an','half'])){k=VR.phrase(T,j,['half a','half an','nửa','half']);n={v:0.5}}
 else if(VR.is(T,j,['a','an'])){if(!vrUnitAt(T,j+1))return null;n={v:1};k=j+1}
 else{const x=VR.number(T,j);if(!x)return null;n=x;k=x.end}
 let v=n.v;if(VR.half(T,k)){v+=0.5;k++}
 const u=vrUnitAt(T,k);let end=u?u.end:k;if(u&&VR.half(T,end)){v+=0.5;end++}
 if(!u&&n.frac)return null;
 return{qty:Math.round(v*1000)/1000,unit:u,end,said:T.slice(j,end).map(x=>x.o).join(' ')};
}
function vrKnownNames(opts){
 if(opts.names)return opts.names;
 const out=new Set();const add=s=>{const k=VR.key(s);if(k)out.add(k)};VR_COMMON.forEach(add);
 const ing=typeof INGREDIENTS!=="undefined"?INGREDIENTS:{},ingEn=typeof INGREDIENT_EN!=="undefined"?INGREDIENT_EN:{};for(const id of Object.keys(ing)){add(ing[id][0]);if(ingEn[id])add(ingEn[id])}
 for(const i of globalThis.MASTER_CATALOG?.items||[]){add(i.nameVi);add(i.nameEn);for(const a of i.aliases||[])add(a)}
 for(const c of Object.values(voiceAppState()?.ingredientCatalog||{}))if(c?.name)add(c.name);
 return out;
}
let vrLangNow='vi';
const vrCap=s=>{s=String(s||'').trim();return s?s.charAt(0).toUpperCase()+s.slice(1):s};
function vrText(T,a,b){if(a>=b)return'';return T.src.slice(T[a].at,T[b-1].end).replace(/\s+/g,' ').replace(/^[\s,;.:]+|[\s,;.:]+$/g,'').trim()}
function vrFind(T,list,from=0,to=T.length){for(let j=from;j<to;j++){const end=VR.phrase(T,j,list);if(end)return{start:j,end}}return null}
// Number of minutes in "khoảng bốn mươi lăm phút", "một tiếng rưỡi", "nửa tiếng", "an hour", "45 minutes"
function vrDurationAt(T,j){
 let k=j;if(VR.is(T,k,['khoảng','chừng','tầm','about','around','roughly','approximately','under']))k++;
 let v=null;if(VR.phrase(T,k,['nửa tiếng','nửa giờ','half an hour'])){return{min:30,end:VR.phrase(T,k,['nửa tiếng','nửa giờ','half an hour'])}}
 if(VR.is(T,k,['a','an'])&&VR.is(T,k+1,['hour'])){return{min:60,end:k+2}}
 const n=VR.number(T,k);if(!n||n.frac)return null;v=n.v;k=n.end;
 let mult=null;if(VR.is(T,k,['phút','minutes','minute','mins','min']))mult=1;else if(VR.is(T,k,['tiếng','giờ','hours','hour','hrs','hr']))mult=60;if(!mult)return null;k++;
 let min=v*mult;if(VR.half(T,k)){min+=mult/2;k++}else if(mult===60&&VR.phrase(T,k,['and a half'])){min+=30;k+=3}
 return{min:Math.round(min),end:k};
}
function vrServingsAt(T,j){
 // "cho bốn người (ăn)", "đủ cho 6 người", "serves four", "for 2 people", "4 servings"
 let k=j;const trig=VR.phrase(T,j,['đủ cho','dành cho','cho','serves','serving','feeds','makes','for']);
 if(trig){k=trig;const n=VR.number(T,k);if(!n||n.frac||n.v<1||n.v>100)return null;const e=n.end;const noun=VR.is(T,e,['người','suất','phần','đứa','people','persons','person','servings','portions','serves','adults']);const viTrig=['cho','đủ cho','dành cho','for'].some(x=>VR.phrase(T,j,[x])===trig);if(viTrig&&!noun)return null;let end=noun?e+1:e;if(VR.is(T,end,['ăn','eat']))end++;return{n:n.v,start:j,end}}
 const n=VR.number(T,j);if(n&&!n.frac&&n.v>=1&&n.v<=100&&VR.is(T,n.end,['người','suất','servings','portions'])){let end=n.end+1;if(VR.is(T,end,['ăn']))end++;return{n:n.v,start:j,end}}
 return null;
}
function vrTimeAt(T,j){const trig=VR.phrase(T,j,['tổng cộng mất','tổng cộng','tổng thời gian','thời gian','mất khoảng','mất','takes about','takes','took','total time','total','all up','in about']);if(!trig)return null;let k=trig;if(VR.is(T,k,['là','is','of','khoảng','about','around']))k++;const d=vrDurationAt(T,k);return d?{min:d.min,start:j,end:d.end}:null}
// Split an ingredient region into items.
function vrIngredients(T,a,b,known,consumed){
 const items=[];let cur=null;
 const en=vrLangNow==='en';
 const close=()=>{if(cur&&cur.name.length){const name=vrCap(cur.name.map(j=>T[j].o).join(' ').replace(/\s+/g,' ')).slice(0,100),u=cur.q?.unit,f=u?.factor||1;// "ba lạng" → 300 g
   items.push({name,qty:cur.q?.qty!=null?Math.round(cur.q.qty*f*1000)/1000:null,unit:u?(en?u.en:u.vi):'',formUnit:u?.form||null,vague:!!cur.q?.vague,note:cur.note.join(' ').trim(),said:cur.q?.said||''})}cur=null};
 const nameKey=()=>cur?VR.key(cur.name.map(j=>T[j].o).join(' ')):'';
 const prefixOf=k=>{for(const n of known)if(n===k||n.startsWith(k+' '))return true;return false};
 for(let j=a;j<b;j++){
  if(consumed.has(j))continue;const t=T[j];
  if(t.sep){close();continue}
  // Approximate words before a quantity are dropped ("khoảng một ký")
  let q=vrQtyAt(T,j);
  if(q&&!q.unit&&!q.vague&&cur&&cur.name.length)q=null;// "thịt ba chỉ": a bare number inside a name is a word
  if(q){const next=T[q.end];const nameFollows=next&&!next.sep&&q.end<b&&!VR.is(T,q.end,VR_LINK.filter(x=>!['of'].includes(x)))||next&&VR.is(T,q.end,['of'])&&q.end+1<b;
   if(cur&&cur.name.length&&!nameFollows){// name-first: "nước mắm hai muỗng", "đường vừa ăn", or a note after the quantity
    if(!cur.q)cur.q=q;else cur.note.push(q.said);j=q.end-1;continue}
   if(cur&&cur.name.length)close();
   if(cur&&cur.q&&!cur.name.length){cur.note.push(q.said);j=q.end-1;continue}
   cur={q,name:[],note:[]};j=q.end-1;if(VR.is(T,q.end,['of']))j++;continue}
  if(VR.is(T,j,['khoảng','chừng','tầm','about','around','approximately','roughly'])&&vrQtyAt(T,j+1)){if(cur&&cur.name.length){const q2=vrQtyAt(T,j+1);if(cur.q)cur.note.push(VR.is(T,j,['khoảng','chừng','tầm'])?t.o+' '+q2.said:t.o+' '+q2.said);else cur.q=q2;j=q2.end-1;continue}continue}
  if(VR.is(T,j,['và','với','cùng','and','plus','rồi','thêm','with'])&&!(cur&&!cur.name.length)){close();if(VR.phrase(T,j,['với lại']))j++;continue}
  if(VR.is(T,j,['nữa','nha','nhé','có','gồm','là','also','của','the','a','an'])&&!(cur&&cur.name.length&&VR.is(T,j,['của'])))continue;
  if(!cur)cur={q:null,name:[],note:[]};
  // Split names said back to back without a pause ("nước màu tiêu hành tím") when a known name starts here.
  const k=nameKey();if(cur.name.length&&(known.has(k)||cur.name.length>=2)&&!VR.is(T,cur.name[cur.name.length-1],['of','của'])&&!prefixOf(k+' '+VR.key(t.o))){const rest=VR.key(T.slice(j,Math.min(b,j+4)).filter(x=>!x.sep).map(x=>x.o).join(' '));let starts=false;for(const nm of known)if(rest===nm||rest.startsWith(nm+' ')){starts=true;break}if(starts){close();cur={q:null,name:[],note:[]}}}
  cur.name.push(j);
 }
 close();
 return items.map(i=>({...i,needs:i.qty==null?'qty':!i.unit?'unit':null}));
}
function vrSteps(T,a,b,consumed){
 const cuts=[a],soft=new Set();
 for(let j=a;j<b;j++){if(T[j].sep){cuts.push(j);if(T[j].o===','||!/[.!?\n;]/.test(T.src.slice(T[j].at,T[j].end)))soft.add(cuts.length-1);continue}const end=VR.phrase(T,j,VR_SPLIT);if(end){cuts.push(j);j=end-1}}
 cuts.push(b);
 const steps=[];
 for(let x=0;x<cuts.length-1;x++){let s=cuts[x],e=cuts[x+1];
  // a short tail after a comma ("…, stirring often") stays with its step
  const commaTail=soft.has(x);
  while(s<e&&(T[s].sep||VR.phrase(T,s,VR_SPLIT)||VR.phrase(T,s,VR_STEP_MARK)||VR.is(T,s,VR_LEAD)||consumed.has(s))){const p=VR.phrase(T,s,VR_SPLIT)||VR.phrase(T,s,VR_STEP_MARK);s=p||s+1;if(VR.phrase(T,s,['bước'])&&VR.number(T,s+1))s=VR.number(T,s+1).end}
  if(VR.is(T,s,['bước'])&&VR.number(T,s+1))s=VR.number(T,s+1).end;
  while(e>s&&(T[e-1].sep||VR.is(T,e-1,VR_TAIL)))e--;
  const text=vrText(T,s,e);if(!text)continue;
  const words=e-s;if((words<2||commaTail&&words<=2&&!VR.phrase(T,s,VR_COOK))&&steps.length){steps[steps.length-1]+=(commaTail?', ':' ')+text;continue}
  if(words<2&&!/\p{L}{3,}/u.test(text))continue;
  steps.push(vrCap(text));
 }
 return steps;
}
// segmentRecipe(text, {names, lang}) → {title, servings, time, ingredients[], steps[], raw}
function segmentRecipe(text,opts={}){
 vrLangNow=opts.lang||voiceUiLang()||'vi';
 const raw=String(text||'').trim(),T=VR.tokens(raw),n=T.length,consumed=new Set(),known=vrKnownNames(opts);
 const out={title:'',servings:null,time:null,ingredients:[],steps:[],raw,flags:[]};
 if(!n)return out;
 const ing=vrFind(T,VR_ING_MARK);
 let stepM=vrFind(T,VR_STEP_MARK,ing?ing.end:0);
 // Servings / total time anywhere before the steps (first mention wins)
 const limit=stepM?stepM.start:n;
 for(let j=0;j<n;j++){if(out.servings==null){const s=vrServingsAt(T,j);if(s&&(j<limit||!ing)){out.servings=s.n;for(let k=s.start;k<s.end;k++)consumed.add(k);j=s.end-1;continue}}if(out.time==null&&j<limit){const t=vrTimeAt(T,j);if(t){out.time=t.min;for(let k=t.start;k<t.end;k++)consumed.add(k);j=t.end-1}}}
 // Without a step marker the method starts at the first clause opening with a cooking verb.
 const clauseStarts=[];{let start=true;for(let j=ing?ing.end:0;j<n;j++){if(T[j].sep){start=true;continue}if(start&&!consumed.has(j))clauseStarts.push(j);start=false;const sp=VR.phrase(T,j,VR_SPLIT);if(sp){clauseStarts.push(sp);j=sp-1}}}
 const cookAt=j=>{let k=j;while(k<n&&(VR.is(T,k,VR_LEAD)||VR.phrase(T,k,VR_SPLIT)))k=VR.phrase(T,k,VR_SPLIT)||k+1;return!!VR.phrase(T,k,VR_COOK)};
 if(!stepM){const prepM=!ing?vrFind(T,['chuẩn bị','prepare']):null;
  for(const j of clauseStarts){if(j<=(ing?ing.end:prepM?prepM.end:0))continue;if(cookAt(j)){stepM={start:j,end:j};break}}
  if(!stepM&&prepM){stepM=null}
  if(!ing&&prepM)out._prep=prepM;
 }
 const ingRange=ing?[ing.end,stepM?stepM.start:n]:out._prep?[out._prep.end,stepM?stepM.start:n]:null;
 const preEnd=ing?ing.start:out._prep?out._prep.start:stepM?stepM.start:n;
 delete out._prep;
 // Title: after "món"/"công thức"/"cách nấu"/"recipe for"/"how to make", else the first clause before any marker.
 {let s=0,e=preEnd;const head=vrFind(T,['hôm nay','today'],0,Math.min(e,6));
  const m=vrFind(T,['công thức món','công thức','cách nấu món','cách làm món','cách nấu','cách làm','món','recipe for','how to make','how to cook','we are making','were making','we are cooking','we re making','making','make','cook'],0,e);
  if(m&&(!head||m.start>=head.start)&&m.start<12)s=m.end;
  while(s<e&&(T[s].sep||consumed.has(s)))s++;
  let k=s;while(k<e&&!T[k].sep&&!consumed.has(k)&&!VR.is(T,k,VR_TAIL)&&!VR.phrase(T,k,['cho','đủ cho','for','serves','gồm','includes','mất','takes']))k++;
  const words=k-s;const title=vrText(T,s,k);
  if(title&&words<=12&&!(VR.number(T,s)&&vrUnitAt(T,VR.number(T,s).end)))out.title=vrCap(title).slice(0,150);
  else out.flags.push('no-title');
  // Clauses in the preamble after the title that look like ingredients (no marker case)
  if(!ingRange&&k<e){const extra=vrIngredients(T,k,e,known,consumed).filter(i=>i.qty!=null||i.vague||known.has(VR.key(i.name)));out.ingredients.push(...extra)}
 }
 if(ingRange)out.ingredients.push(...vrIngredients(T,ingRange[0],ingRange[1],known,consumed));
 if(!out.ingredients.length)out.flags.push('no-ingredients');
 if(stepM)out.steps=vrSteps(T,stepM.start,n,consumed);
 if(!out.steps.length)out.flags.push('no-steps');
 return out;
}
// Ingredient → a line of the recipe form ("tên | lượng | đơn vị"), or the plain words when the amount
// was not said or the unit is not one the app stores (kept and flagged on save, never guessed).
function vrFormLine(i){
 const name=String(i.name||'').replace(/\|/g,' ').replace(/\s+/g,' ').trim();if(!name)return'';
 if(i.qty!=null&&i.formUnit){const q=+(i.qty*(i.factor||1)).toFixed(3);return`${name} | ${q} | ${i.formUnit}`}
 if(i.qty!=null&&i.unit)return`${name} (${i.qty} ${i.unit}${i.note?', '+i.note:''})`.slice(0,290);
 if(i.qty!=null)return`${name} (${i.qty})`.slice(0,290);
 return(i.note?`${name} (${i.note})`:name).slice(0,290);
}
globalThis.VoiceRecipe={segmentRecipe,formLine:vrFormLine};

// ---------- Dictation UI (browser) ----------
const vrT=(vi,en)=>typeof tr==='function'?tr(vi,en):vi;
const vrEsc=s=>typeof esc==='function'?esc(s):String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const VR_DRAFT_KEY='bep-recipe-dictation-v1';
let vrState={text:'',takes:0,lang:null,take:null,parsed:null};
function vrStore(){try{const st=typeof familyStorage!=='undefined'?familyStorage:localStorage;return st}catch{return null}}
function vrLoadDraft(){try{const d=JSON.parse(vrStore()?.getItem(VR_DRAFT_KEY)||'null');if(d&&typeof d.text==='string'){vrState.text=d.text;vrState.takes=d.takes||0}}catch{}}
function vrSaveDraft(){try{vrStore()?.setItem(VR_DRAFT_KEY,JSON.stringify({text:vrState.text,takes:vrState.takes}))}catch{}}
function vrClearDraft(){vrState={...vrState,text:'',takes:0,parsed:null};try{vrStore()?.removeItem(VR_DRAFT_KEY)}catch{}}
function vrDuplicate(title){if(!title||!voiceAppState()?.recipes)return null;const k=VR.key(title);return voiceAppState().recipes.find(r=>VR.key(r.name)===k)||null}
function vrSetMode(mode){const live=document.getElementById('vr-live'),st=document.getElementById('vr-state'),mic=document.getElementById('vr-mic');if(live)live.dataset.mode=mode==='listening'?'listening':'stopped';
 if(st)st.textContent=mode==='listening'?vrT('Đang nghe… cứ đọc chậm rãi','Listening… read at your own pace'):mode==='offline'?vrT('Đang offline — có thể gõ hoặc dán công thức.','Offline — you can type or paste the recipe.'):mode==='unsupported'?vrT('Trình duyệt chưa hỗ trợ mic trực tiếp — dùng mic bàn phím hoặc gõ.','Speech recognition is unsupported — use keyboard dictation or type.'):mode==='blocked'?vrT('Mic đang bị chặn — cho phép mic hoặc gõ.','Microphone blocked — allow it or type.'):vrState.text.trim()?vrT('Đã tạm dừng — bấm Đọc tiếp khi sẵn sàng.','Paused — tap Continue when ready.'):vrT('Chưa bắt đầu','Not started');
 if(mic){mic.textContent=mode==='listening'?'⏸ '+vrT('Tạm dừng','Pause'):vrState.text.trim()?'🎙 '+vrT('Đọc tiếp','Continue'):'🎙 '+vrT('Bắt đầu đọc','Start reading');mic.setAttribute('aria-pressed',String(mode==='listening'))}
 const tk=document.getElementById('vr-takes');if(tk)tk.textContent=vrState.takes?vrT(`Lần đọc: ${vrState.takes}`,`Takes: ${vrState.takes}`):''}
function voiceRecipeOpen(){
 if(!vrState.text)vrLoadDraft();vrState.lang=vrState.lang||VoiceTakeLang.defaultLang();
 modal(vrT('🎙 Đọc công thức','🎙 Dictate a recipe'),`<div class="vr-sheet"><p class="hint">${vrT('Đọc tự nhiên như kể cho con cháu: tên món, cho mấy người, nguyên liệu, rồi từng bước (“rồi…”, “sau đó…”). Có thể tạm dừng và đọc tiếp nhiều lần. Lượng nào nói không rõ sẽ để trống và đánh dấu “cần điền”.','Read it naturally: the dish name, how many it serves, the ingredients, then each step (“then…”, “next…”). Pause and continue as often as you like. Unclear amounts are left blank and marked “to fill in”.')}</p>
 ${typeof voiceTakeLangToggle==='function'?voiceTakeLangToggle('data-vr-lang',vrState.lang):''}
 <div class="voice-live vr-live" id="vr-live" data-mode="stopped"><span class="voice-dot" aria-hidden="true"></span><b id="vr-state" aria-live="polite"></b><small id="vr-takes"></small></div>
 <div class="field"><label for="vr-text">${vrT('Lời đọc (sửa, gõ hoặc dán được)','Transcript (edit, type or paste)')}</label><textarea class="input" id="vr-text" rows="7" maxlength="20000">${vrEsc(vrState.text)}</textarea></div>
 <div class="vp-controls"><button type="button" class="btn primary" id="vr-mic" data-vr="mic" aria-pressed="false">🎙 ${vrT('Bắt đầu đọc','Start reading')}</button><button type="button" class="btn" data-vr="review">📝 ${vrT('Tách & xem lại','Split & review')}</button><button type="button" class="btn soft" data-vr="clear">${vrT('Xóa lời đọc','Clear transcript')}</button></div>
 <div id="vr-review" aria-live="polite"></div></div>`,`<button class="btn" data-action="close-modal">${vrT('Đóng','Close')}</button><button class="btn primary" data-vr="use" id="vr-use" hidden>✓ ${vrT('Dùng bản này','Use this')}</button>`,true);
 vrState.take?.stop(true);
 vrState.take=createVoiceTake({owner:'voice-recipe',keep:true,lang:()=>vrState.lang,onState:vrSetMode,
  onInterim:t=>{const box=document.getElementById('vr-text');if(box&&t)box.value=vrState.text+(vrState.text&&!/\n$/.test(vrState.text)?', ':'')+t},
  onFinal:t=>{const box=document.getElementById('vr-text');if(!box){vrState.take?.stop(true);return}if(!t)return;vrState.text=vrState.text+(vrState.text&&!/\n$/.test(vrState.text)?', ':'')+t;box.value=vrState.text;vrSaveDraft()}});
 vrSetMode(VoiceTakeLang.online()?'stopped':'offline');
 if(vrState.parsed)vrRenderReview(vrState.parsed);
}
function vrStartTake(){if(vrState.text.trim()&&!/\n$/.test(vrState.text))vrState.text+='\n';if(vrState.take.start()){vrState.takes++;vrSaveDraft();vrSetMode('listening')}}
function vrIngRow(i,x){const flag=i.needs==='qty'?`<span class="pill vr-need" title="${vrT('Lượng chưa rõ — cần điền','Amount unclear — fill in')}">⚠ ${vrT('cần điền','to fill in')}</span>`:i.needs==='unit'?`<span class="pill vr-need">⚠ ${vrT('cần đơn vị','needs unit')}</span>`:i.qty!=null&&!i.formUnit?`<span class="pill vr-note" title="${vrT('Đơn vị này lưu dạng ghi chú','This unit is kept as a note')}">📝 ${vrT('ghi chú','note')}</span>`:'';
 return`<li class="vr-ing" data-x="${x}" data-note="${vrEsc(i.note||'')}"><input class="input vr-ing-name" aria-label="${vrT('Nguyên liệu','Ingredient')} ${x+1}" value="${vrEsc(i.name)}" maxlength="100"><input class="input vr-ing-qty" aria-label="${vrT('Lượng','Amount')} ${x+1}" inputmode="decimal" value="${i.qty??''}" placeholder="${vrT('cần điền','fill in')}"><input class="input vr-ing-unit" aria-label="${vrT('Đơn vị','Unit')} ${x+1}" list="vr-units" value="${vrEsc(i.unit||'')}" maxlength="20"><span class="vr-flag">${flag}</span><button type="button" class="icon vr-del" data-vr="del-ing" data-x="${x}" aria-label="${vrT('Bỏ dòng','Remove line')} ${x+1}">×</button>${i.note||i.vague?`<small class="vr-ing-note">${vrEsc(i.vague?vrT('Lời đọc: ','Said: ')+(i.said||''):i.note)}</small>`:''}</li>`}
function vrRenderReview(p){
 vrState.parsed=p;const box=document.getElementById('vr-review');if(!box)return;const dup=vrDuplicate(p.title);
 const need=p.ingredients.filter(i=>i.needs).length;
 box.innerHTML=`<section class="vr-review"><h3>${vrT('Xem lại trước khi lưu','Review before saving')}</h3>
 ${dup?`<p class="callout vr-dup" role="status">⚠️ ${vrT(`Đã có món “${vrEsc(dup.name)}”. Bản đọc này sẽ lưu thành món MỚI — món cũ không bị ghi đè. Đổi tên nếu cần.`,`“${vrEsc(dup.name)}” already exists. This will be saved as a NEW recipe — the existing one is not overwritten. Rename it if you like.`)}</p>`:''}
 <div class="field"><label for="vr-title">${vrT('Tên món','Recipe name')}</label><input class="input" id="vr-title" maxlength="150" value="${vrEsc(p.title)}" placeholder="${vrT('Chưa nghe tên món — điền vào đây','No name heard — type it here')}"></div>
 <div class="scout-grid"><div class="field"><label for="vr-servings">${vrT('Số suất','Servings')}</label><input class="input" id="vr-servings" type="number" min="1" max="100" step="1" value="${p.servings??''}" placeholder="${vrT('chưa nói','not said')}"></div><div class="field"><label for="vr-time">${vrT('Thời gian (phút)','Time (minutes)')}</label><input class="input" id="vr-time" type="number" min="0" max="600" value="${p.time??''}" placeholder="${vrT('chưa nói','not said')}"></div></div>
 <h4>${vrT('Nguyên liệu','Ingredients')} <small>${need?vrT(`· ${need} dòng cần điền`,`· ${need} to fill in`):''}</small></h4>
 <datalist id="vr-units">${['g','kg','ml','l','quả','cái','bó','gói','miếng','muỗng canh','muỗng cà phê','chén','củ','tép'].map(u=>`<option value="${u}">`).join('')}</datalist>
 <ul class="vr-ings">${p.ingredients.map(vrIngRow).join('')||`<li class="hint">${vrT('Chưa nghe ra nguyên liệu.','No ingredients heard.')}</li>`}</ul><button type="button" class="btn soft" data-vr="add-ing">＋ ${vrT('Thêm nguyên liệu','Add ingredient')}</button>
 <h4>${vrT('Các bước','Steps')}</h4><ol class="vr-steps">${p.steps.map((s,x)=>`<li><label class="sr-only" for="vr-step-${x}">${vrT('Bước','Step')} ${x+1}</label><textarea class="input" id="vr-step-${x}" rows="2" maxlength="1000">${vrEsc(s)}</textarea></li>`).join('')}</ol><button type="button" class="btn soft" data-vr="add-step">＋ ${vrT('Thêm bước','Add step')}</button>
 <details class="vr-raw"><summary>${vrT('Lời đọc gốc','Original transcript')}</summary><p data-user-content>${vrEsc(p.raw).replace(/\n/g,'<br>')}</p></details>
 <p class="hint">${vrT('Bấm “Dùng bản này” để mở form món gia đình đã điền sẵn, chọn nhóm bữa rồi Lưu. Dòng chưa có lượng được lưu kèm cờ “thiếu lượng”, không tự đoán.','Tap “Use this” to open the family recipe form pre-filled, pick the meal groups, then Save. Lines without amounts are saved flagged as missing, never guessed.')}</p></section>`;
 const use=document.getElementById('vr-use');if(use)use.hidden=false;
}
// Typed unit → the recipe form's unit (exact spelling first, so "can" (tin) is not "cân" (kg)).
function vrUnitInfo(u){const l=String(u||'').trim().toLowerCase();if(!l)return null;const e=VR_UNITS.find(e=>e[0]===l)||VR_UNITS.find(e=>(e[1]===l||e[2]===l)&&e[4]===1)||VR_UNITS.find(e=>VR.key(e[0])===VR.key(l));return e?{form:e[3],factor:e[4]}:null}
function vrCollect(){const p=vrState.parsed||{raw:vrState.text};const ings=[...document.querySelectorAll('.vr-ing')].map(li=>{const name=li.querySelector('.vr-ing-name').value.trim(),q=li.querySelector('.vr-ing-qty').value.trim().replace(',','.'),unit=li.querySelector('.vr-ing-unit').value.trim();const qty=q===''||!Number.isFinite(+q)||+q<=0?null:+q;const u=vrUnitInfo(unit);return{name,qty,unit,formUnit:u?.form||null,factor:u?.factor||1,note:li.dataset.note||''}}).filter(i=>i.name);
 return{title:(document.getElementById('vr-title')?.value||'').trim(),servings:+document.getElementById('vr-servings')?.value||null,time:document.getElementById('vr-time')?.value===''?null:+document.getElementById('vr-time')?.value,ingredients:ings,steps:[...document.querySelectorAll('.vr-steps textarea')].map(t=>t.value.trim()).filter(Boolean),raw:p.raw||vrState.text}}
function vrUse(){
 const c=vrCollect();vrState.take?.stop(true);
 if(typeof familyRecipeEditor!=='function')return;
 familyRecipeEditor();
 const f=document.getElementById('family-recipe-form');if(!f)return;
 f.dataset.dictated='yes';f.querySelector('.vr-entry')?.remove();
 if(c.title)f.name.value=c.title.slice(0,150);
 if(c.servings&&c.servings>0)f.yield.value=c.servings;
 if(c.time!=null&&c.time>=0&&c.time<=600)f.time.value=c.time;
 f.ingredients.value=c.ingredients.map(vrFormLine).filter(Boolean).join('\n');
 f.steps.value=c.steps.join('\n');
 const t=f.querySelector('input[name="transcript"]');if(t)t.value=String(c.raw||'').slice(0,20000);
 const dup=vrDuplicate(c.title);
 const note=document.createElement('div');note.className='vr-form-note';
 note.innerHTML=`<p class="callout" role="status">🎙 ${vrT('Đã điền từ lời đọc. Kiểm tra lại rồi bấm Lưu món gia đình.','Filled from your dictation. Check it, then tap Save family recipe.')}${dup?' '+vrT(`Đã có món “${vrEsc(dup.name)}” — món này sẽ lưu thành món mới, không ghi đè.`,`“${vrEsc(dup.name)}” already exists — this is saved as a new recipe, not overwritten.`):''}</p><details class="vr-raw"><summary>${vrT('Lời đọc gốc','Original transcript')}</summary><p data-user-content>${vrEsc(c.raw).replace(/\n/g,'<br>')}</p></details>`;
 f.prepend(note);
}
function voiceRecipeSaved(){vrState.take?.stop(true);vrClearDraft()}
if(typeof document!=='undefined'){
 document.addEventListener('click',e=>{
  const l=e.target.closest?.('[data-vr-lang]');if(l){vrState.lang=l.dataset.vrLang;VoiceTakeLang.setPref(vrState.lang);document.querySelectorAll('[data-vr-lang]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.vrLang===vrState.lang)));if(vrState.take?.listening){vrState.take.stop(true);vrStartTake()}return}
  const b=e.target.closest?.('[data-vr]');if(!b)return;
  switch(b.dataset.vr){
   case'open':e.preventDefault();voiceRecipeOpen();break;
   case'mic':if(vrState.take?.listening){vrState.take.stop(true);vrSetMode('stopped')}else vrStartTake();break;
   case'review':{vrState.take?.stop(true);vrSetMode('stopped');const box=document.getElementById('vr-text');if(box){vrState.text=box.value;vrSaveDraft()}vrRenderReview(segmentRecipe(vrState.text,{lang:voiceUiLang()}));document.getElementById('vr-title')?.focus();break}
   case'clear':if(vrState.text.trim()&&!confirm(vrT('Xóa toàn bộ lời đọc?','Clear the whole transcript?')))break;vrState.take?.stop(true);vrClearDraft();{const box=document.getElementById('vr-text');if(box)box.value=''}document.getElementById('vr-review').innerHTML='';document.getElementById('vr-use').hidden=true;vrSetMode('stopped');break;
   case'del-ing':b.closest('.vr-ing')?.remove();break;
   case'add-ing':{const ul=document.querySelector('.vr-ings');if(ul){ul.querySelector('.hint')?.remove();const x=ul.children.length;ul.insertAdjacentHTML('beforeend',vrIngRow({name:'',qty:null,unit:'',needs:'qty'},x));ul.lastElementChild.querySelector('input')?.focus()}break}
   case'add-step':{const ol=document.querySelector('.vr-steps');if(ol){const x=ol.children.length;ol.insertAdjacentHTML('beforeend',`<li><label class="sr-only" for="vr-step-${x}">${vrT('Bước','Step')} ${x+1}</label><textarea class="input" id="vr-step-${x}" rows="2" maxlength="1000"></textarea></li>`);ol.lastElementChild.querySelector('textarea').focus()}break}
   case'use':vrUse();break;
  }
 });
 document.addEventListener('input',e=>{if(e.target?.id==='vr-text'){vrState.text=e.target.value;vrSaveDraft()}});
 // The family recipe view shows the original transcript (collapsible) under a dictated recipe.
 if(typeof showRecipe==='function'){const vrShowRecipe=showRecipe;showRecipe=function(id,snapshot,mealContext){vrShowRecipe.apply(this,arguments);const r=snapshot||voiceAppState()?.recipes?.find(x=>x.id===id);if(r&&typeof r.transcript==='string'&&r.transcript.trim()){const c=document.querySelector('#modal-root .modal-content');if(c&&!c.querySelector('.vr-raw'))c.insertAdjacentHTML('beforeend',`<details class="vr-raw"><summary>${vrT('Lời đọc gốc','Original transcript')}</summary><p data-user-content>${vrEsc(r.transcript).replace(/\n/g,'<br>')}</p></details>`)}}}
}
globalThis.voiceRecipeOpen=voiceRecipeOpen;globalThis.voiceRecipeSaved=voiceRecipeSaved;
