'use strict';
// Voice price capture (v1.6): "🎙 Nói giá / Say a price" for Price Scout.
// Pure part: a small VI/EN grammar that turns one utterance into one or more price rows
// (item, price, pack/unit, retailer + branch, promo, was-price). It never invents a pack size:
// a pack is only filled when a number and a unit were actually said ("60 viên", "500 gam",
// "một ký"/"per kg"). Voice-only prices are family-only (evidence 'manual-voice').
// UI part (browser only): a small sheet with a mic + editable text that opens the existing
// Price Scout confirm sheet for each row. The recogniser wrapper is shared with voice-recipe.js.

// appLanguage / state are script-scope globals (not globalThis properties) in the app.
function voiceUiLang(){return typeof appLanguage!=='undefined'?appLanguage:(globalThis.appLanguage||'vi')}
function voiceAppState(){return typeof state!=='undefined'?state:globalThis.state}

// ---------- Tokens & numbers ----------
const VP_FOLD=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase();
const VP_KEY=s=>VP_FOLD(s).replace(/[^a-z0-9]+/g,' ').trim();
function vpTokens(text){
 const src=String(text||'').normalize('NFC').replace(/(\d),(\d{1,2})(?!\d)/g,'$1.$2').replace(/’/g,"'");
 const acc=/[̀-ͯ]|đ/i.test(src.normalize('NFD'));
 const out=[];
 for(const m of src.matchAll(/\$|%|\d+(?:\.\d+)?(?:\/\d+)?|[\p{L}\p{M}]+(?:'[\p{L}\p{M}]+)*|[,;.!?\n:…]+|[-–—]{1,2}(?=\s)/gu)){
  const o=m[0];
  if(/^[,;.!?\n:…\-–—]+$/.test(o)){if(out.length&&!out[out.length-1].sep)out.push({o:',',w:',',p:',',sep:true,at:m.index,end:m.index+o.length});continue}
  const w=o.toLowerCase();out.push({o,w,p:VP_FOLD(w),sep:false,at:m.index,end:m.index+o.length});
 }
 out.acc=acc;out.src=src;return out;
}
// Word lists compare accented words when the utterance has accents, folded words otherwise.
const vpKey=(T,j)=>T[j]&&!T[j].sep?(T.acc?T[j].w:T[j].p):undefined;
const vpIs=(T,j,list)=>{const k=vpKey(T,j);if(k===undefined)return false;return T.acc?list.includes(k):list.some(x=>VP_FOLD(x)===k)};
// Multi-word phrase match (folded) at j; returns the end index or 0.
function vpPhrase(T,j,phrases){let best=0;for(const ph of phrases){const parts=VP_FOLD(ph).split(' ');let ok=true;for(let k=0;k<parts.length;k++){const t=T[j+k];if(!t||t.sep||t.p!==parts[k]){ok=false;break}}if(ok&&j+parts.length>best)best=j+parts.length}return best}

const VP_VI_DIGIT={'không':0,'một':1,'hai':2,'ba':3,'bốn':4,'năm':5,'sáu':6,'bảy':7,'bẩy':7,'tám':8,'chín':9};
const VP_VI_AFTER_TEN={'mốt':1,'tư':4,'lăm':5,'nhăm':5};
const VP_PLAIN_DIGIT={khong:0,mot:1,hai:2,ba:3,bon:4,nam:5,sau:6,bay:7,tam:8,chin:9};
const VP_EN_ONES={zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19};
const VP_EN_TENS={twenty:20,thirty:30,forty:40,fourty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90};
function vpViDigit(T,j){const t=T[j];if(!t||t.sep)return null;if(T.acc)return Object.hasOwn(VP_VI_DIGIT,t.w)?VP_VI_DIGIT[t.w]:null;return Object.hasOwn(VP_PLAIN_DIGIT,t.p)?VP_PLAIN_DIGIT[t.p]:null}
function vpViAfterTen(T,j){const t=T[j];if(!t||t.sep)return null;const d=vpViDigit(T,j);if(d!==null&&d>0)return d;if(T.acc)return Object.hasOwn(VP_VI_AFTER_TEN,t.w)?VP_VI_AFTER_TEN[t.w]:null;return{tu:4,lam:5,nham:5}[t.p]??null}
const vpIsTen=(T,j)=>!!T[j]&&!T[j].sep&&(T.acc?T[j].w==='mười':T[j].p==='muoi');
const vpIsTens=(T,j)=>!!T[j]&&!T[j].sep&&(T.acc?T[j].w==='mươi':T[j].p==='muoi');
function vpViTens(T,i){
 const d=vpViDigit(T,i);
 if(vpIsTen(T,i)){const u=vpViAfterTen(T,i+1);return u!==null?{v:10+u,end:i+2}:{v:10,end:i+1}}
 if(d!==null&&d>=2&&vpIsTens(T,i+1)){const u=vpViAfterTen(T,i+2);return u!==null?{v:d*10+u,end:i+3}:{v:d*10,end:i+2}}
 if(d!==null)return{v:d,end:i+1,single:true};
 return null;
}
// One Vietnamese number (below 1000, optionally × nghìn) → {v,end,single}
function vpViBelow1000(T,i){
 const d=vpViDigit(T,i);
 if(d!==null&&T[i+1]&&!T[i+1].sep&&(T.acc?T[i+1].w==='trăm':T[i+1].p==='tram')){const v=d*100,j=i+2;
  if(vpIs(T,j,['linh','lẻ'])&&vpViDigit(T,j+1)!==null)return{v:v+vpViDigit(T,j+1),end:j+2};
  const r=vpViTens(T,j);if(r)return{v:v+(r.single?r.v*10:r.v),end:r.end};
  return{v,end:j};
 }
 return vpViTens(T,i);
}
function vpViNumber(T,i){const a=vpViBelow1000(T,i);if(!a)return null;if(vpIs(T,a.end,['nghìn','ngàn'])){const b=vpViBelow1000(T,a.end+1);return{v:a.v*1000+(b?b.v:0),end:b?b.end:a.end+1}}return a}
function vpEnTens(T,i){const k=T[i]&&!T[i].sep?T[i].p:null;if(!k)return null;if(Object.hasOwn(VP_EN_TENS,k)){const n=T[i+1]&&!T[i+1].sep?T[i+1].p:null;if(n&&Object.hasOwn(VP_EN_ONES,n)&&VP_EN_ONES[n]>0&&VP_EN_ONES[n]<10)return{v:VP_EN_TENS[k]+VP_EN_ONES[n],end:i+2};return{v:VP_EN_TENS[k],end:i+1}}if(Object.hasOwn(VP_EN_ONES,k))return{v:VP_EN_ONES[k],end:i+1,single:VP_EN_ONES[k]<10};return null}
function vpEnNumber(T,i){
 const k=T[i]&&!T[i].sep?T[i].p:null;if(!k)return null;
 if(Object.hasOwn(VP_EN_ONES,k)&&T[i+1]&&T[i+1].p==='hundred'){let v=VP_EN_ONES[k]*100,j=i+2;if(T[j]&&T[j].p==='and'&&vpEnTens(T,j+1))j++;const r=vpEnTens(T,j);if(r){v+=r.v;j=r.end}return{v,end:j}}
 return vpEnTens(T,i);
}
// Any number at i: digits, "1/2", Vietnamese or English words.
function vpNumber(T,i){
 const t=T[i];if(!t||t.sep)return null;
 if(/^\d+\/\d+$/.test(t.w)){const[a,b]=t.w.split('/').map(Number);return b?{v:a/b,end:i+1,frac:true}:null}
 if(/^\d/.test(t.w))return{v:+t.w,end:i+1,digits:true,dec:t.w.includes('.'),single:/^\d$/.test(t.w)};
 return vpViNumber(T,i)||vpEnNumber(T,i);
}

// ---------- Vocabulary ----------
const VP_CURRENCY=['đô','đồng','dollar','dollars','buck','bucks','dola','aud'];
const VP_CENTS=['cent','cents','xu','xen'];
// Mass/volume words → [phrase, packUnit, multiplier]
const VP_MASS=[['ki lô gam','kg',1],['ki lô','kg',1],['kí lô','kg',1],['kilogram','kg',1],['kilograms','kg',1],['kilos','kg',1],['kilo','kg',1],['kg','kg',1],['ký','kg',1],['kí','kg',1],['cân','kg',1],['lạng','g',100],['gam','g',1],['gram','g',1],['grams','g',1],['gờ ram','g',1],['g','g',1],['mi li lít','mL',1],['mililít','mL',1],['ml','mL',1],['millilitres','mL',1],['milliliters','mL',1],['lít','L',1],['litre','L',1],['litres','L',1],['liter','L',1],['liters','L',1],['l','L',1]];
// Count words → kind
const VP_COUNT=[['lần giặt','wash'],['viên','tab'],['tablets','tab'],['tablet','tab'],['tabs','tab'],['capsules','tab'],['caps','tab'],['pods','tab'],['washes','wash'],['wash','wash'],['cuộn','roll'],['rolls','roll'],['roll','roll'],['tờ','sheet'],['sheets','sheet'],['sheet','sheet'],['wipes','sheet'],['pack','pack'],['packs','pack'],['pk','pack'],['cái','each'],['chiếc','each'],['quả','each'],['trái','each'],['pieces','each'],['piece','each'],['pcs','each'],['eggs','each'],['trứng','each'],['each','each']];
// Containers: a price per container is kept in words only — its size is unknown and never guessed.
const VP_CONTAINER=[['bó','bó','bunch'],['bunch','bó','bunch'],['bunches','bó','bunch'],['hộp','hộp','box'],['box','hộp','box'],['gói','gói','packet'],['packet','gói','packet'],['bịch','bịch','bag'],['túi','túi','bag'],['bag','túi','bag'],['bao','bao','sack'],['chai','chai','bottle'],['bottle','chai','bottle'],['lon','lon','can'],['can','lon','can'],['vỉ','vỉ','tray'],['khay','khay','tray'],['tray','khay','tray'],['punnet','hộp','punnet'],['thùng','thùng','carton'],['carton','thùng','carton'],['nải','nải','hand'],['con','con','whole']];
const VP_PROMO=[['half-price',['nửa giá','1/2 giá','một nửa giá','giảm nửa giá','giảm một nửa','half price','half priced','1/2 price','50 % off','giảm 50 %']],['special-buy',['special buy','special buys']],['price-drop',['down down','price drop','price dropped','prices dropped','hạ giá']],['clearance',['clearance','xả hàng','thanh lý']],['multibuy',['mua hai tặng một','buy one get one','buy 1 get 1']],['special',['đang sale','on sale','sale','khuyến mãi','khuyến mại','giảm giá','on special','specials','special','đang giảm']],['deal',['deal']]];
const VP_RETAILERS=[['woolworths',['woolworths','woolworth','woolies','woollies','wool worths','wool worth']],['coles',['coles','cole s']],['aldi',['aldi','al di','andi']],['chemist',['chemist warehouse','chemist']],['amazon',['amazon']],['viet-grocer',['chợ việt','tiệm việt','asian grocer','asian grocery','asian supermarket','tiệm á châu','chợ á châu']],['other',['costco','iga','harris farm','harris farms','spudshed','foodworks']]];
const VP_PREP=['ở','tại','at','from','in','@','bên'];
const VP_WAS=['trước là','trước đây là','trước đây','lúc trước là','lúc trước','hồi trước','giá cũ là','giá cũ','giá gốc là','giá gốc','giá thường là','bình thường là','bình thường','thường là','was','normally','usually','regular price','regularly','down from','reduced from'];
const VP_SAVE=['tiết kiệm','bớt','save','saving','you save'];
const VP_FILLER=['là','thì','giá','có','mua','thấy','bán','được','đang','còn','và','với','rồi','nha','nhé','nhá','ạ','à','ờ','ừ','ơi','cho','mình','em','anh','chị','is','are','the','of','for','and','also','um','uh','like','price','priced','it','its','at','ở','tại','in','from','on','got','get','see','saw','so','oh','okay','ok','then','plus','with','bên','hôm','nay'];
const VP_LEAD_FILLER=VP_FILLER.concat(['mỗi','per','a','an','con','mẹ','bà']);

function vpListAt(T,j,list){let best=null;for(const e of list){const end=vpPhrase(T,j,[e[0]]);if(end&&(!best||end>best.end))best={e,end}}return best}
function vpCurrencyAt(T,j){const t=T[j];if(!t||t.sep)return 0;if(t.w==='$')return j+1;const ok=T.acc?VP_CURRENCY.includes(t.w)||['dollar','dollars','bucks','buck','aud'].includes(t.w):VP_CURRENCY.map(VP_FOLD).includes(t.p);if(!ok)return 0;const n=T[j+1];return n&&!n.sep&&n.p==='la'&&t.p==='do'?j+2:j+1}
const vpCentsAt=(T,j)=>T[j]&&!T[j].sep&&VP_CENTS.includes(T[j].p)?j+1:0;
const vpHalfAt=(T,j)=>T[j]&&!T[j].sep&&(T.acc?T[j].w==='rưỡi':T[j].p==='ruoi')?j+1:0;
function vpMassAt(T,j){const r=vpListAt(T,j,VP_MASS);if(!r)return null;
 if(['g','l'].includes(r.e[0])&&!(T[j-1]&&/^\d/.test(T[j-1].w)))return null;// single letters only straight after digits
 if(r.e[0]==='cân'&&!(T[j-1]&&vpNumber(T,j-1)))return null;
 if(T.acc&&['ký','kí','lít','lạng','cân'].includes(r.e[0])&&T[j].w!==r.e[0]&&!['ky','ki'].includes(T[j].w))return null;
 return{unit:r.e[1],mult:r.e[2],end:r.end}}
function vpCountAt(T,j){const r=vpListAt(T,j,VP_COUNT);if(!r)return null;if(T.acc&&r.e[0]!==VP_FOLD(r.e[0])&&T[j].w!==r.e[0].split(' ')[0])return null;return{kind:r.e[1],end:r.end}}
function vpContainerAt(T,j){const r=vpListAt(T,j,VP_CONTAINER);if(!r)return null;if(T.acc&&r.e[0]!==VP_FOLD(r.e[0])&&T[j].w!==r.e[0])return null;return{vi:r.e[1],en:r.e[2],end:r.end}}
const vpIsUnitAt=(T,j)=>!!(vpMassAt(T,j)||vpCountAt(T,j)||vpContainerAt(T,j));

// ---------- Price expressions ----------
// Cents after a price number: "rưỡi", "99", "chín mươi chín", "chín chín"; a lone VI digit = tenths ("hai đô năm" = 2.50).
function vpCents(T,j){
 const h=vpHalfAt(T,j);if(h)return{c:50,end:h,form:'half'};
 // "ba đô mốt" = 3.10, "hai đô tư" = 2.40
 if(T[j]&&!T[j].sep&&(T.acc?['mốt','tư'].includes(T[j].w):false)&&!vpIsUnitAt(T,j+1))return{c:T[j].w==='mốt'?10:40,end:j+1,form:'tenth'};
 const m=vpNumber(T,j);if(!m||m.frac||m.dec||m.v>=100)return null;
 // "mười đô năm mươi một ký" → 10.50 per kg, not 51 kg
 if(vpIsUnitAt(T,m.end)&&!m.digits&&m.end-j===3&&vpIsTens(T,j+1)&&vpViDigit(T,j+2)===1&&T.acc&&T[j+2].w==='một')return{c:vpViDigit(T,j)*10,end:j+2,form:'num'};
 if(vpIsUnitAt(T,m.end))return null;// "… 2 đô một bó", "24 đô 60 viên" → a quantity, not cents
 if(m.single&&!m.digits){const m2=vpNumber(T,m.end);if(m2&&m2.single&&!m2.digits&&!vpIsUnitAt(T,m2.end))return{c:m.v*10+m2.v,end:m2.end,form:'pair'};if(T.acc||Object.hasOwn(VP_PLAIN_DIGIT,T[j].p))return{c:m.v*10,end:m.end,form:'tenth'}}
 let end=m.end;const ce=vpCentsAt(T,end);if(ce)end=ce;
 return{c:m.v,end,form:'num'};
}
function vpPriceAt(T,i,skip){
 if(skip.has(i))return null;const t=T[i];if(!t||t.sep)return null;
 // "$24.99", "$6 50"
 if(t.w==='$'){const n=vpNumber(T,i+1);if(!n||n.frac||!n.digits)return null;let v=n.v,end=n.end;if(!n.dec&&T[end]&&/^\d/.test(T[end].w)){const c=vpCents(T,end);if(c&&c.form==='num'&&c.c>=10){v+=c.c/100;end=c.end}}return v>0?{v,start:i,end}:null}
 // "a dollar fifty"
 if(['a','an'].includes(t.p)&&vpCurrencyAt(T,i+1)&&T[i+1].w!=='$'){let end=vpCurrencyAt(T,i+1),v=1;const c=vpCents(T,end);if(c){v+=c.c/100;end=c.end}return{v,start:i,end}}
 const n=vpNumber(T,i);if(!n||n.frac||n.v<=0)return null;const k=n.end;
 // "N rưỡi [đô]" (but "N ký rưỡi" is a quantity)
 if(vpHalfAt(T,k)&&n.v<1000){let end=k+1;const c=vpCurrencyAt(T,end);if(c)end=c;return{v:n.v+0.5,start:i,end}}
 // "N đô [cents]"
 const cur=vpCurrencyAt(T,k);
 if(cur){let v=n.v,end=cur;if(!n.dec){const c=vpCents(T,end);if(c){v+=c.c/100;end=c.end}}return{v,start:i,end}}
 // "N cents / xu"
 const ce=vpCentsAt(T,k);if(ce&&n.v<100)return{v:n.v/100,start:i,end:ce};
 // "14.99" not followed by a unit
 if(n.dec){if(vpIsUnitAt(T,k))return null;let end=k;const cu=vpCurrencyAt(T,end);if(cu)end=cu;return{v:n.v,start:i,end}}
 // "mười bốn chín chín", "fourteen ninety nine", "24 99"
 if(n.v<1000&&!vpIsUnitAt(T,k)&&T[k]&&!T[k].sep){const c=vpCents(T,k);if(c&&(c.form==='pair'||c.form==='num'&&c.c>=10&&!!n.digits===/^\d/.test(T[k].w))){let end=c.end;const cu=vpCurrencyAt(T,end);if(cu)end=cu;return{v:n.v+c.c/100,start:i,end}}}
 return null;
}

// ---------- Modifiers (pack, promo, retailer, was) ----------
// after=false (before the price): a bare unit word without a number is part of the name ("mì gói").
function vpPackAt(T,j,basis,after=true){
 const t=T[j];if(!t||t.sep)return null;
 if(!after&&!vpNumber(T,j)&&!vpIs(T,j,['mỗi','per','a','an','every','nửa','half'])&&!vpPhrase(T,j,['a dozen','one dozen']))return null;const said=end=>T.slice(j,end).map(x=>x.o).join(' ');
 // "a dozen" = 12, "một chục" = 10
 const dz=vpPhrase(T,j,['a dozen','one dozen','1 dozen']),ch=vpPhrase(T,j,['một chục','1 chục']);
 if(dz||ch){const q=dz?12:10,end=dz||ch;return{kind:'count',packQty:q,packUnit:'each',units:q,end,said:said(end)}}
 let n=null,k=j;
 if(vpIs(T,j,['mỗi','per','a','an','every'])){k=j+1;n={v:1}}
 else{const x=vpNumber(T,j);if(x){n=x;k=x.end}}
 // "nửa ký", "half a kilo"
 if(!n&&vpPhrase(T,j,['nửa','half a','half'])){k=vpPhrase(T,j,['half a','nửa','half']);n={v:0.5}}
 const m=vpMassAt(T,k);
 if(m&&(n||k===j)){let q=n?n.v:1,end=m.end;if(vpHalfAt(T,end)){q+=0.5;end++}q=Math.round(q*(m.mult||1)*1000)/1000;return{kind:'size',packQty:q,packUnit:m.unit,units:null,end,said:said(end),perKg:m.unit==='kg'&&q===1}}
 if(n&&n.frac)return null;
 const c=vpCountAt(T,k);
 if(c&&n&&n.v>=1){const q=n.v;if(!(q<100000&&Number.isInteger(q)))return null;const unit=['roll','sheet','wash'].includes(c.kind)?c.kind:basis==='per_wash'&&(c.kind==='tab'||c.kind==='pack')?'wash':basis==='per_roll'&&c.kind==='pack'?'roll':basis==='per_sheet'&&c.kind==='pack'?'sheet':'each';return{kind:'count',packQty:q,packUnit:unit,units:q,end:c.end,said:said(c.end)}}
 if(c&&k===j&&T[j].p==='each')return{kind:'count',packQty:1,packUnit:'each',units:1,end:c.end,said:said(c.end),perEach:true};
 const box=vpContainerAt(T,k);
 if(box&&(n||k===j)){if(!n&&['con','can','bao'].includes(T[k].p))return null;return{kind:'container',count:n?n.v:1,vi:box.vi,en:box.en,end:box.end,said:said(box.end)}}
 return null;
}
function vpPromoAt(T,j){for(const[id,list]of VP_PROMO){const end=vpPhrase(T,j,list);if(end)return{promo:id,end}}return null}
const vpWordish=(T,j)=>!!T[j]&&!T[j].sep&&/^\p{L}/u.test(T[j].w);
function vpRetailerNameAt(T,k){for(const[id,list]of VP_RETAILERS){const end=vpPhrase(T,k,list);if(end)return{id,end}}return null}
function vpRetailerAt(T,j,{after=false}={}){
 let k=j,prep=false;if(vpIs(T,k,VP_PREP)){prep=true;k++}
 const named=vpRetailerNameAt(T,k);
 if(named){const branch=vpBranchAt(T,named.end,prep||after)||vpBranchAt(T,named.end,true,true);return{retailer:named.id,name:named.id==='other'?T.slice(k,named.end).map(x=>x.o).join(' '):null,branch:branch?.text||null,end:branch?branch.end:named.end}}
 // "chợ Cabramatta", "tiệm Hưng Phát" → Vietnamese/Asian grocer + branch/suburb
 const t=T[k];const market=t&&!t.sep&&(T.acc?['chợ','tiệm'].includes(t.w):t.p==='tiem'||t.p==='cho'&&/^\p{Lu}/u.test(T[k+1]?.o||''));
 if(market){const branch=vpBranchAt(T,k+1,true);return{retailer:'viet-grocer',name:null,branch:branch?.text||null,end:branch?branch.end:k+1,market:true}}
 return null;
}
function vpStopWord(T,j){return vpIs(T,j,VP_FILLER)||vpIs(T,j,VP_PREP)||!!vpPromoAt(T,j)||!!vpPhrase(T,j,VP_WAS)||!!vpPhrase(T,j,VP_SAVE)||!!vpNumber(T,j)||!!vpCurrencyAt(T,j)||vpIsUnitAt(T,j)||vpIs(T,j,['tuần','week','today','yesterday','mới','vừa','just'])}
// Does a catalogue name start at j? Accented utterances compare accented words ("Hưng" is not "húng").
function vpCatalogWordAt(T,j){for(const i of globalThis.MASTER_CATALOG?.items||[])for(const nm of[i.nameVi,i.nameEn,...(i.aliases||[])]){const parts=String(nm||'').normalize('NFC').toLowerCase().split(/\s+/).filter(Boolean);if(!parts.length)continue;let ok=true;for(let k=0;k<parts.length;k++){const t=T[j+k];if(!t||t.sep||(T.acc?t.w!==parts[k]:t.p!==VP_FOLD(parts[k]))){ok=false;break}}if(ok)return true}return false}
function vpBranchAt(T,j,allowed,strict=false){
 if(!allowed)return null;const words=[];let k=j;
 while(k<T.length&&words.length<3&&vpWordish(T,k)&&!vpStopWord(T,k)&&!vpCatalogWordAt(T,k)&&!vpRetailerNameAt(T,k)){words.push(T[k].o);k++}
 if(!words.length)return null;
 // A branch name closes its clause (separator, end, deal/was words or fillers) — never runs into an item or a number.
 // Without "ở/at/chợ" it must be followed by a pause (strict): "Woolworths Cabramatta, chuối …".
 const t=T[k];if(strict?t&&!t.sep:t&&!t.sep&&!(vpPromoAt(T,k)||vpPhrase(T,k,VP_WAS)||vpIs(T,k,VP_FILLER)))return null;
 return{text:words.map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' '),end:k};
}

// ---------- Utterance → rows ----------
function vpCatalog(opts){return opts.catalog||globalThis.MASTER_CATALOG?.items||[]}
function vpMatchItem(label,opts){
 const PS=globalThis.PriceScout,cat=vpCatalog(opts),key=VP_KEY(label);
 if(!key)return{itemId:null,matches:[]};
 const learned=opts.learned||{},hit=learned[key]&&cat.find(i=>i.id===learned[key]);
 if(hit)return{itemId:hit.id,matches:[{item:hit,score:1}],learned:true};
 const matches=PS?PS.matchCatalog(label,cat,4):[];
 const best=matches[0],second=matches[1];
 const ok=best&&(best.score>=0.5||best.score>=0.3&&(!second||best.score-second.score>=0.15));
 return{itemId:ok?best.item.id:null,matches};
}
const vpCap=s=>{s=String(s||'').trim();return s?s.charAt(0).toUpperCase()+s.slice(1):s};
const vpR2=n=>Math.round(n*100)/100;
// Parse a spoken/typed price utterance into rows. opts: {catalog, learned, stores, want, lang}
function parsePriceUtterance(text,opts={}){
 const T=vpTokens(text),n=T.length,skip=new Set();
 // Promo phrases first so "half price" / "1/2 giá" are never read as amounts.
 const promoAt=new Map();for(let j=0;j<n;j++){const p=vpPromoAt(T,j);if(p){promoAt.set(j,p);for(let k=j;k<p.end;k++)skip.add(k);j=p.end-1}}
 const spans=[],glue=k=>vpIs(T,k,['là','is','at','of','được','đã','có','từ','khoảng','about','around','giá','price']);
 for(let j=0;j<n;j++){const p=vpPriceAt(T,j,skip);if(!p)continue;
  // "trước là …", "was …" → was-price; "tiết kiệm …", "save …" → saving
  let kind='price';
  for(let b=Math.max(0,p.start-5);b<p.start&&kind==='price';b++){if(T[b].sep)continue;
   const w=vpPhrase(T,b,VP_WAS);if(w&&w<=p.start&&!(T[b].p==='was'&&vpIs(T,b-1,['it','that','this','they']))){let ok=true;for(let k=w;k<p.start;k++)if(T[k].sep||!glue(k))ok=false;if(ok){kind='was';p.trig=b;break}}
   const sv=vpPhrase(T,b,VP_SAVE);if(sv&&sv<=p.start){let ok=true;for(let k=sv;k<p.start;k++)if(T[k].sep||!glue(k))ok=false;if(ok){kind='save';p.trig=b}}}
  p.kind=kind;spans.push(p);j=p.end-1}
 const prices=spans.filter(s=>s.kind==='price');
 if(!prices.length)return{rows:[],tokens:n,error:'no-price'};
 const spanAt=new Map();for(const s of spans)spanAt.set(s.trig??s.start,s);
 function modAt(j,{after,basis}){
  const t=T[j];if(!t)return null;if(t.sep)return{type:'sep',end:j+1};
  const s=spanAt.get(j);if(s&&s.kind!=='price')return{type:s.kind,v:s.v,end:s.end};
  if(promoAt.has(j))return{type:'promo',promo:promoAt.get(j).promo,end:promoAt.get(j).end};
  const r=vpRetailerAt(T,j,{after});if(r)return{type:'retailer',...r};
  const pk=vpPackAt(T,j,basis,after);if(pk)return{type:'pack',pack:pk,end:pk.end};
  if(vpIs(T,j,VP_FILLER))return{type:'filler',end:j+1};
  return null;
 }
 const region=(a,b)=>{const out=[];for(let k=a;k<b;k++)out.push(k);return out};
 const segs=prices.map(p=>({p,pre:[],post:[]}));
 segs[0].pre=region(0,prices[0].start);
 for(let i=0;i<segs.length;i++){
  const a=prices[i].end,b=i+1<segs.length?prices[i+1].start:n;
  if(i+1>=segs.length){segs[i].post=region(a,b);break}
  // Modifiers right after a price belong to it; after a separator store/deal/was words still do, but a pack phrase or an item word starts the next row.
  let j=a,cut=b,afterSep=false;
  while(j<b){const m=modAt(j,{after:true});if(!m||m.end>b||afterSep&&m.type==='pack'){cut=j;break}if(m.type==='sep')afterSep=true;j=m.end}
  segs[i].post=region(a,cut);segs[i+1].pre=region(cut,b);
 }
 const rows=[];
 for(const seg of segs){
  const row={price:vpR2(seg.p.v),wasPrice:null,save:null,promo:null,retailer:null,retailerName:null,branch:null,branchId:null,packQty:null,packUnit:null,units:null,unitPrice:null,unitBasis:null,per:null,label:'',itemId:null,matches:[],warnings:[],said:[]};
  let packs=[];
  const apply=m=>{
   if(m.type==='was'){if(row.wasPrice==null)row.wasPrice=vpR2(m.v)}
   else if(m.type==='save')row.save=vpR2(m.v);
   else if(m.type==='promo'){if(!row.promo||row.promo==='special')row.promo=m.promo}
   else if(m.type==='retailer'){if(!row.retailer){row.retailer=m.retailer;row.retailerName=m.name||null}if(m.branch&&!row.branch)row.branch=m.branch}
   else if(m.type==='pack')packs.push(m.pack);
  };
  const scan=(idxs,after,basis)=>{const words=[];let k=0;while(k<idxs.length){const j=idxs[k],m=modAt(j,{after,basis});if(m&&m.type!=='filler'&&m.type!=='sep'){apply(m);while(k<idxs.length&&idxs[k]<m.end)k++;continue}words.push({j,filler:m?.type==='filler',sep:m?.type==='sep'});k++}return words};
  const trim=ws=>{const clauses=[[]];for(const w of ws){if(w.sep)clauses.push([]);else clauses[clauses.length-1].push(w)}
   const real=clauses.map(c=>{let a=0,b=c.length;while(a<b&&vpIs(T,c[a].j,VP_LEAD_FILLER))a++;while(b>a&&vpIs(T,c[b-1].j,VP_LEAD_FILLER))b--;return c.slice(a,b)}).filter(c=>c.length);
   return real.length?real[real.length-1]:[]};
  const preWords=scan(seg.pre,false,null),postWords=scan(seg.post,true,null);
  let lw=trim(preWords);if(!lw.length&&segs.length===1)lw=trim(postWords);
  row.label=vpCap(T.src.slice(T[lw[0]?.j]?.at??0,lw.length?T[lw[lw.length-1].j].end:0).replace(/\s+/g,' '));
  if(row.label){const mt=vpMatchItem(row.label,opts);row.itemId=mt.itemId;row.matches=mt.matches.map(m=>({id:m.item.id,score:m.score}));if(mt.learned)row.learned=true}
  if(!row.itemId&&opts.want&&segs.length===1){const it=vpCatalog(opts).find(i=>i.id===opts.want);if(it){row.itemId=it.id;row.fromWant=true;if(!row.label)row.label=(opts.lang||voiceUiLang())==='en'?it.nameEn:it.nameVi}}
  const item=vpCatalog(opts).find(i=>i.id===row.itemId)||null;
  // Count words depend on the item's unit basis (viên → washes for dishwasher tablets): re-read packs once it is known.
  if(item&&packs.length){packs=[];scan(seg.pre,false,item.unitBasis);scan(seg.post,true,item.unitBasis)}
  for(const pk of packs){
   if(pk.kind==='container'){if(!row.per)row.per={vi:pk.vi,en:pk.en,count:pk.count};row.said.push(pk.said);continue}
   if(row.packQty!=null)continue;row.packQty=pk.packQty;row.packUnit=pk.packUnit;row.units=pk.units;row.said.push(pk.said);
  }
  if(row.wasPrice==null&&row.save!=null)row.wasPrice=vpR2(row.price+row.save);
  if(row.wasPrice!=null&&row.wasPrice<=row.price)row.warnings.push('was-not-higher');
  if(row.wasPrice!=null&&!row.promo)row.promo='special';
  // Unit price only from what was said.
  if(item&&globalThis.PriceScout){const u=globalThis.PriceScout.unitPriceOf(row.price,row.packQty,row.packUnit,row.units,item.unitBasis);if(u!=null){row.unitPrice=u;row.unitBasis=item.unitBasis}}
  if(row.unitPrice==null&&row.packQty===1&&row.packUnit==='kg'){row.unitPrice=row.price;row.unitBasis='per_kg'}
  if(!row.label&&!row.itemId)row.warnings.push('no-item');else if(!row.itemId)row.warnings.push('no-match');
  if(row.packQty==null&&!row.per)row.warnings.push('pack-unknown');
  const first=T[seg.pre.length?seg.pre[0]:seg.p.start],last=T[seg.post.length?seg.post[seg.post.length-1]:seg.p.end-1];
  row.raw=T.src.slice(first.at,last.end).replace(/^[\s,;.]+|[\s,;.]+$/g,'');
  rows.push(row);
 }
 // A store said once applies to the rows that have none.
 const rets=[...new Set(rows.map(r=>r.retailer).filter(Boolean))];
 if(rets.length===1){const src=rows.find(x=>x.retailer);for(const r of rows)if(!r.retailer){r.retailer=src.retailer;r.retailerName=src.retailerName;if(!r.branch)r.branch=src.branch;r.sharedRetailer=true}}
 for(const r of rows){if(!r.retailer)r.warnings.push('no-retailer');
  if(r.branch&&opts.stores){const b=VP_FOLD(r.branch);const s=opts.stores.find(s=>VP_FOLD((s.name||'')+' '+(s.address||'')).includes(b));if(s)r.branchId=s.id}}
 return{rows,tokens:n};
}
// Row → seed for scoutNewDraft (the existing Price Scout confirm sheet). Voice-only = family-only evidence.
function voicePriceDraftSeed(row,raw,lang=voiceUiLang()){
 const en=lang==='en',per=row.per?(en?'per '+row.per.en:'mỗi '+row.per.vi):'';
 const notes=[per&&(en?'Price '+per:'Giá '+per),row.branch&&!row.branchId?(en?'Branch: ':'Chi nhánh: ')+row.branch:'',row.retailerName?(en?'Store: ':'Cửa hàng: ')+row.retailerName:''].filter(Boolean);
 return{itemId:row.itemId,label:row.label||'',retailer:row.retailer||'other',branchId:row.branchId||null,price:row.price,packQty:row.packQty,packUnit:row.packUnit,units:row.units,unitPrice:row.unitPrice??null,unitBasis:row.unitBasis??null,wasPrice:row.wasPrice,promo:row.promo,source:'voice',evidenceType:'manual-voice',raw:String(row.raw||raw||'').slice(0,20000),note:notes.join(' · ').slice(0,300),matches:(row.matches||[]).map(m=>m.id),capturedAt:new Date().toISOString()};
}
globalThis.VoicePrice={parsePriceUtterance,voicePriceDraftSeed,tokens:vpTokens,number:vpNumber,fold:VP_FOLD,key:VP_KEY,is:vpIs,phrase:vpPhrase,mass:vpMassAt,count:vpCountAt,container:vpContainerAt,half:vpHalfAt};

// ---------- Shared recogniser wrapper (browser) ----------
// Prefers a recogniser selected by the general voice layer (VoiceAPI.getRecognizer() / VoiceAPI.Recognizer),
// otherwise the browser's SpeechRecognition. Each live recogniser is announced through
// registerVoiceRecognizer() when that hook exists, so only one microphone session runs at a time.
function vpRecognizerCtor(){
 const api=globalThis.VoiceAPI;
 try{const r=api&&(typeof api.getRecognizer==='function'?api.getRecognizer():api.Recognizer||api.recognizer);if(typeof r==='function')return r}catch{}
 return globalThis.SpeechRecognition||globalThis.webkitSpeechRecognition||null;
}
function vpLangPrefs(){if(typeof voiceLangPrefs==='function')return voiceLangPrefs();let auto=true,lang='';try{auto=localStorage.getItem('bep-voice-auto')!=='0';lang=localStorage.getItem('bep-voice-lang')||''}catch{}return{auto,lang}}
function vpDefaultLang(){const ui=voiceUiLang()==='en'?'en':'vi';return typeof voiceDefaultRecLang==='function'?voiceDefaultRecLang(ui,vpLangPrefs()):(ui==='en'?'en-AU':'vi-VN')}
function vpSetLangPref(lang){try{localStorage.setItem('bep-voice-lang',lang);localStorage.setItem('bep-voice-auto','0')}catch{}}
const vpOnline=()=>navigator.onLine&&!globalThis.BEP_OFFLINE;
// createVoiceTake({lang:()=>'vi-VN', keep:boolean (restart after browser pauses), onFinal(text), onInterim(text), onState(mode)})
function createVoiceTake(o){
 let rec=null,keep=false,sid=0,restarts=0;
 const take={listening:false,
  start(){
   if(!vpOnline()){o.onState('offline');return false}
   const Ctor=vpRecognizerCtor();if(!Ctor){o.onState('unsupported');return false}
   if(typeof stopVoice==='function')try{stopVoice()}catch{}
   take.stop(true);keep=true;restarts=0;const my=++sid;
   const launch=()=>{if(my!==sid||!keep)return;let r;try{r=rec=new Ctor()}catch{keep=false;o.onState('unsupported');return}
    r.lang=o.lang();r.continuous=true;r.interimResults=true;r.maxAlternatives=3;
    r.onresult=e=>{if(my!==sid)return;let interim='';for(let i=e.resultIndex;i<e.results.length;i++){const res=e.results[i];if(!res)continue;const text=typeof pickBestVoiceAlt==='function'?pickBestVoiceAlt(res):(res[0]?.transcript||'');if(res.isFinal){restarts=0;o.onFinal(String(text||'').trim())}else interim+=text}if(o.onInterim)o.onInterim(interim)};
    r.onerror=e=>{if(my!==sid)return;if(e&&['not-allowed','service-not-allowed','audio-capture'].includes(e.error)){keep=false;o.onState('blocked')}};
    r.onend=()=>{if(my!==sid)return;rec=null;if(keep&&o.keep&&restarts++<30){setTimeout(launch,200);return}keep=false;take.listening=false;o.onState('stopped')};
    try{r.start()}catch{}
    try{if(typeof registerVoiceRecognizer==='function')registerVoiceRecognizer(r,{owner:o.owner||'voice-price',stop:()=>take.stop()})}catch{}
    take.listening=true;o.onState('listening')};
   launch();return true},
  stop(silent){keep=false;sid++;const r=rec;rec=null;if(r){try{r.stop()}catch{try{r.abort()}catch{}}}const was=take.listening;take.listening=false;if(!silent||was)o.onState(silent?'paused':'stopped')},
  restart(){if(take.listening){take.stop(true);take.start()}}
 };
 return take;
}
const VoiceTakeLang={defaultLang:vpDefaultLang,setPref:vpSetLangPref,name:l=>String(l).startsWith('en')?'English':'Tiếng Việt',online:vpOnline,supported:()=>!!vpRecognizerCtor()};
globalThis.createVoiceTake=createVoiceTake;globalThis.VoiceTakeLang=VoiceTakeLang;

// ---------- Price sheet UI (browser) ----------
const vpT=(vi,en)=>typeof tr==='function'?tr(vi,en):vi;
const vpEsc=s=>typeof esc==='function'?esc(s):String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
let vpState={rows:[],text:'',want:null,lang:null,take:null,current:null};
function vpLangToggle(attr,lang){return`<div class="voice-lang vt-lang" role="group" aria-label="${vpT('Ngôn ngữ đang nói','Language you speak')}"><span class="voice-lang-icon" aria-hidden="true">🎙</span>${['vi-VN','en-AU'].map(l=>`<button type="button" class="voice-lang-btn" ${attr}="${l}" aria-pressed="${l===lang}" lang="${l.slice(0,2)}" data-user-content>${VoiceTakeLang.name(l)}</button>`).join('')}</div>`}
globalThis.voiceTakeLangToggle=vpLangToggle;
const vpMoney=n=>n==null?'—':(typeof aud==='function'?aud(n,'AUD'):'$'+(+n).toFixed(2));
function vpRetailerName(id){const r=globalThis.PriceScout?.RETAILERS?.[id];return r?(voiceUiLang()==='en'?r.name:(r.vi||r.name)):''}
function vpItemName(id){const i=(globalThis.MASTER_CATALOG?.items||[]).find(x=>x.id===id);return i?(voiceUiLang()==='en'?i.nameEn:i.nameVi):''}
const vpPromoText=p=>typeof scoutPromoLabel==='function'?scoutPromoLabel(p):p;
function vpLearned(){try{return JSON.parse(localStorage.getItem('bep-voice-price-learned')||'{}')||{}}catch{return{}}}
function vpLearn(label,itemId){const k=VP_KEY(label);if(!k||!itemId)return;try{const m=vpLearned();delete m[k];m[k]=itemId;const keys=Object.keys(m);if(keys.length>300)delete m[keys[0]];localStorage.setItem('bep-voice-price-learned',JSON.stringify(m))}catch{}}
function vpRowHtml(r,i){
 const name=r.itemId?vpItemName(r.itemId):'',title=r.label||name||vpT('(chưa có tên)','(no name)'),chips=[];
 if(r.retailer)chips.push(`🏬 ${vpEsc(r.retailerName||vpRetailerName(r.retailer))}${r.branch?' · '+vpEsc(r.branch):''}`);
 if(r.packQty!=null)chips.push(`📦 ${vpEsc(r.packQty+' '+r.packUnit)}`);else if(r.per)chips.push(`📦 ${vpEsc(voiceUiLang()==='en'?'per '+r.per.en:'mỗi '+r.per.vi)}`);
 if(r.promo)chips.push(`🏷 ${vpEsc(vpPromoText(r.promo))}`);
 if(r.wasPrice!=null)chips.push(`${vpT('Trước','Was')} ${vpMoney(r.wasPrice)}`);
 const warn=[];
 if(r.warnings.includes('no-item'))warn.push(vpT('Chưa nghe tên món — điền ở bước sau.','No item heard — fill it in next.'));else if(r.warnings.includes('no-match'))warn.push(vpT('Chưa khớp danh mục — chọn món ở bước sau.','Not matched to the catalogue — pick the item next.'));
 if(r.warnings.includes('no-retailer'))warn.push(vpT('Chưa nghe tên cửa hàng.','No store heard.'));
 if(r.warnings.includes('pack-unknown'))warn.push(vpT('Chưa nói quy cách — để trống, không tự đoán.','No pack size said — left blank, never guessed.'));
 if(r.warnings.includes('was-not-higher'))warn.push(vpT('Giá trước không cao hơn — kiểm tra lại.','Was price is not higher — please check.'));
 const unit=r.unitPrice!=null&&r.unitBasis&&typeof scoutBasisLabel==='function'&&!(r.packQty===1&&r.packUnit==='kg')?` <small>(${vpMoney(r.unitPrice)}${scoutBasisLabel(r.unitBasis)})</small>`:r.packQty===1&&r.packUnit==='kg'?` <small>/kg</small>`:'';
 return`<li class="vp-row" data-vp-row="${i}"><div class="vp-row-main"><b data-user-content>${vpEsc(title)}</b>${name&&name!==r.label?`<small>✓ ${vpEsc(name)}</small>`:''}<span class="vp-price">${vpMoney(r.price)}${unit}</span>${chips.length?`<span class="vp-chips">${chips.map(c=>`<span class="pill">${c}</span>`).join('')}</span>`:''}${warn.length?`<small class="vp-warn">⚠️ ${warn.join(' ')}</small>`:''}</div><div class="vp-row-actions"><button type="button" class="btn primary" data-vp="confirm" data-i="${i}">✓ ${vpT('Xác nhận','Confirm')}<span class="sr-only"> ${vpEsc(title)}</span></button><button type="button" class="btn" data-vp="drop" data-i="${i}">${vpT('Bỏ','Drop')}<span class="sr-only"> ${vpEsc(title)}</span></button></div></li>`;
}
function vpRenderRows(){const box=document.getElementById('vp-rows');if(!box)return;const rows=vpState.rows;
 box.innerHTML=rows.length?`<p class="hint">${vpT(`Nghe được ${rows.length} giá. Bấm Xác nhận từng giá để kiểm tra rồi lưu.`,`Heard ${rows.length} price${rows.length>1?'s':''}. Confirm each one to check and save it.`)}</p><ul class="vp-list">${rows.map(vpRowHtml).join('')}</ul>`:(vpState.text.trim()?`<p class="hint">${vpT('Chưa nghe ra giá nào. Thử nói “… hai đô rưỡi” hoặc gõ “$2.50”.','No price heard yet. Try “… two dollars fifty” or type “$2.50”.')}</p>`:'')}
function vpParseNow(){const box=document.getElementById('vp-text');if(box)vpState.text=box.value;const res=parsePriceUtterance(vpState.text,{learned:vpLearned(),stores:voiceAppState()?.stores||[],want:vpState.want});vpState.rows=res.rows;vpRenderRows()}
function vpSetMode(mode){const live=document.getElementById('vp-live'),st=document.getElementById('vp-state'),mic=document.getElementById('vp-mic');if(live)live.dataset.mode=mode==='listening'?'listening':'stopped';
 if(st)st.textContent=mode==='listening'?vpT('Đang nghe…','Listening…'):mode==='offline'?vpT('Đang offline — hãy gõ giá vào ô bên dưới.','Offline — type the price below.'):mode==='unsupported'?vpT('Trình duyệt chưa hỗ trợ mic trực tiếp — dùng mic bàn phím hoặc gõ.','Speech recognition is unsupported — use keyboard dictation or type.'):mode==='blocked'?vpT('Mic đang bị chặn — cho phép mic hoặc gõ.','Microphone blocked — allow it or type.'):vpT('Đã dừng','Stopped');
 if(mic){mic.textContent=mode==='listening'?'⏹ '+vpT('Dừng','Stop'):'🎙 '+vpT('Bắt đầu nói','Start speaking');mic.setAttribute('aria-pressed',String(mode==='listening'))}
 if(mode==='stopped'&&vpState.text.trim())vpParseNow()}
function voicePriceOpen(want=null,keepRows=false){
 if(typeof scoutViewer==='function'&&scoutViewer())return;
 if(!keepRows){vpState.rows=[];vpState.text=''}
 vpState.want=want||null;vpState.lang=vpState.lang||vpDefaultLang();
 const wantName=want?vpItemName(want):'';
 modal(vpT('🎙 Nói giá','🎙 Say a price'),`<div class="vp-sheet"><p class="hint">${wantName?vpT(`Đang săn giá: <b>${vpEsc(wantName)}</b>. Chỉ cần nói giá và cửa hàng.`,`Hunting a price for <b>${vpEsc(wantName)}</b>. Just say the price and the store.`):vpT('Ví dụ: “Rau muống hai đô rưỡi một bó, chợ Cabramatta”. Nói nhiều giá liền cũng được.','e.g. “eggs twelve pack six dollars fifty at Aldi Bankstown”. Several prices in one go is fine.')}</p>
 ${vpLangToggle('data-vp-lang',vpState.lang)}
 <div class="voice-live vp-live" id="vp-live" data-mode="stopped"><span class="voice-dot" aria-hidden="true"></span><b id="vp-state" aria-live="polite">${vpT('Đã dừng','Stopped')}</b></div>
 <div class="field"><label for="vp-text">${vpT('Lời nói (sửa hoặc gõ được)','What you said (edit or type)')}</label><textarea class="input" id="vp-text" rows="3" maxlength="2000" placeholder="${vpT('thịt ba chỉ mười bốn đô chín mươi chín một ký ở Woolworths','pork belly fourteen ninety nine a kilo at Woolworths')}">${vpEsc(vpState.text)}</textarea></div>
 <div class="vp-controls"><button type="button" class="btn primary" id="vp-mic" data-vp="mic" aria-pressed="false">🎙 ${vpT('Bắt đầu nói','Start speaking')}</button><button type="button" class="btn" data-vp="read">🔎 ${vpT('Đọc giá','Read prices')}</button></div>
 <div id="vp-rows" aria-live="polite"></div>
 <p class="hint vp-family-note">👪 ${vpT('Giá nói bằng giọng chỉ lưu cho gia đình, không chia sẻ cộng đồng. Muốn chia sẻ, hãy dùng ảnh kệ giá hoặc ảnh màn hình.','Spoken prices stay with your family and are not shared with the community. To share, use a shelf-tag photo or a screenshot.')}</p></div>`,`<button class="btn" data-action="close-modal">${vpT('Đóng','Close')}</button>`,true);
 vpState.take?.stop(true);
 vpState.take=createVoiceTake({owner:'voice-price',keep:false,lang:()=>vpState.lang,onState:vpSetMode,
  onInterim:t=>{const box=document.getElementById('vp-text');if(box&&t)box.value=(vpState.text?vpState.text+', ':'')+t},
  onFinal:t=>{const box=document.getElementById('vp-text');if(!box){vpState.take?.stop(true);return}if(!t)return;vpState.text=(vpState.text?vpState.text+', ':'')+t;box.value=vpState.text;vpParseNow()}});
 vpRenderRows();
 if(!vpOnline())vpSetMode('offline');else if(!keepRows&&vpRecognizerCtor())vpState.take.start();
}
// Called by Price Scout after a voice price is saved: learn label → item, then return to the remaining rows.
function voicePriceSaved(o){
 const cur=vpState.current;if(!cur)return;
 if(o.itemId&&cur.label)vpLearn(cur.label,o.itemId);
 vpState.rows=vpState.rows.filter(r=>r!==cur);vpState.current=null;
 if(vpState.rows.length)setTimeout(()=>voicePriceOpen(vpState.want,true),0);else{vpState.text='';vpState.want=null}
}
if(typeof document!=='undefined'){
 document.addEventListener('click',e=>{
  const l=e.target.closest?.('[data-vp-lang]');if(l){vpState.lang=l.dataset.vpLang;vpSetLangPref(vpState.lang);document.querySelectorAll('[data-vp-lang]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.vpLang===vpState.lang)));vpState.take?.restart();return}
  const b=e.target.closest?.('[data-vp]');if(!b)return;
  switch(b.dataset.vp){
   case'mic':if(vpState.take?.listening)vpState.take.stop();else vpState.take?.start();break;
   case'read':vpState.take?.stop(true);vpSetMode('stopped');vpParseNow();break;
   case'drop':vpState.rows.splice(+b.dataset.i,1);vpRenderRows();break;
   case'confirm':{const r=vpState.rows[+b.dataset.i];if(!r||typeof scoutConfirm!=='function')break;vpState.take?.stop(true);vpState.current=r;const d=scoutNewDraft(voicePriceDraftSeed(r,vpState.text));if(d.promo&&globalThis.PriceScout)d.validUntil=globalThis.PriceScout.defaultDealEnd(d.retailer);scoutConfirm(d);break}
  }
 });
 document.addEventListener('input',e=>{if(e.target?.id==='vp-text')vpState.text=e.target.value});
}
globalThis.voicePriceOpen=voicePriceOpen;globalThis.voicePriceSaved=voicePriceSaved;
