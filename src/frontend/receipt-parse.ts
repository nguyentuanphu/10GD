'use strict';
// Receipt reading (v1.7.1) — ONE shared module for the spending receipt form ("Chụp / nhập hóa đơn")
// and the So Giá photo capture. Pure logic first (runs in node:vm for tests), then the on-device
// image preparation and OCR call.
//  • parseReceipt(): retailer detection (ALDI / Woolworths AU / Coles / Woolworths UK / generic),
//    line parsing with item codes, markers and OCR junk removed, continuation lines (weighed
//    "1.611kg Net @ 3.49 $/kg", "Qty 2 @ $4.20 each", "ea" = 1 each), duplicates kept as separate
//    lines with a ×2 hint, several subtotal blocks, discounts / surcharge / rounding as separate
//    non-ingredient lines, refunds, warranty and EFTPOS/bank blocks ignored, printed total and item
//    count compared with what was read (never silently adjusted).
//  • redact(): removes card / AID / ARQC / TVR / TSI / ATC / terminal / reference / auth / merchant /
//    transaction / staff-name lines from any text that is saved.
//  • size repair only inside the number next to a unit; nothing here invents a quantity or price.
//  • matching helpers (abbreviation table, confidence), duplicate-receipt fingerprint and the
//    shopping/pantry reconciliation maths used after a receipt is saved.
(function(root){

// ---------------------------------------------------------------- helpers
const round=(n,d=2)=>{const f=10**d;return Math.round(n*f)/f};
const fold=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D');
const norm=s=>fold(s).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const titleCase=s=>String(s).toLowerCase().replace(/(^|[\s'-])([a-z])/g,(m,a,b)=>a+b.toUpperCase());
const MONTHS='jan feb mar apr may jun jul aug sep oct nov dec'.split(' ');
const pad=n=>String(n).padStart(2,'0');
const MAX_YEAR=new Date().getFullYear()+1;

// ---------------------------------------------------------------- retailers
const RETAILERS={
 aldi:{name:'ALDI',currency:'AUD',scout:'aldi'},
 woolworths:{name:'Woolworths',currency:'AUD',scout:'woolworths'},
 coles:{name:'Coles',currency:'AUD',scout:'coles'},
 'woolworths-uk':{name:'Woolworths UK',currency:'GBP',scout:null},
 iga:{name:'IGA',currency:'AUD',scout:null},
 costco:{name:'Costco',currency:'AUD',scout:null},
 'harris-farm':{name:'Harris Farm',currency:'AUD',scout:null}
};
function detectCurrency(text){
 const t=String(text||''),pounds=(t.match(/£\s?\d/g)||[]).length;
 if(/\bVAT\s*(No|Reg|Number)\b|woolworths\.co\.uk|\.co\.uk\b/i.test(t)||pounds>=2||pounds>=1&&/\bVAT\b/i.test(t))return'GBP';
 if(/€\s?\d+[.,]\d{2}/.test(t)&&/\b(MwSt|TVA|IVA|USt)\b/i.test(t))return'EUR';
 return'AUD';
}
function detectRetailer(text){
 const t=String(text||''),cur=detectCurrency(t);let id=null;
 if(/woo\s?l\s?worths|woolies|ABN\s*:?\s*88\s*0{3}\s*014\s*675|fresh\s*food\s*people/i.test(t))id=cur==='GBP'?'woolworths-uk':'woolworths';
 else if(/\bcoles\b|ABN\s*:?\s*45\s*004\s*189\s*708|Store\s*:?\s*\d{1,4}\s*-\s*CS\b|\bfor\s+-?\d+\s+[il1t]?tems?\s*:/i.test(t))id='coles';
 else if(/\bAL[DO][IT1l|]\b|LIMITED\s+PARTNERSHIP|ALDI\.COM|\b9[0O]\s?196\s?5\d\d\s?019\b/i.test(t))id='aldi';
 else if(/\bIGA\b/.test(t))id='iga';else if(/\bcostco\b/i.test(t))id='costco';else if(/harris\s*farm/i.test(t))id='harris-farm';
 if(!id){const codeLines=t.split('\n').filter(l=>/(^|\s)\d{5,6}\s+[A-Za-z>*].*\d[.,]\d{2}\s*[AB8]?\s*$/.test(l)).length;if(codeLines>=3)id='aldi'}
 return id?{id,name:RETAILERS[id].name,currency:cur}:{id:null,name:'',currency:cur};
}

// ---------------------------------------------------------------- abbreviations (data, extendable)
// Lower-case receipt tokens (or two-token phrases) → plain English. Only confident expansions.
const ABBREVIATIONS={
 'hs chkn':'honey soy chicken','hs chicken':'honey soy chicken','bby spn':'baby spinach','s cream':'sour cream','f range':'free range','fr range':'free range','p towel':'paper towel','facial tis':'facial tissue','wnder whte':'wonder white','h fibre':'hi fibre','fl crm':'full cream','full crm':'full cream','le bag':'reusable bag',
 wtrmelon:'watermelon',wtrmln:'watermelon',watermln:'watermelon',rockmln:'rockmelon',hdew:'honeydew',
 frz:'frozen',frzn:'frozen',chps:'chips',chs:'cheese',chse:'cheese',strm:'stringers',strng:'string',
 srdough:'sourdough',sdough:'sourdough',sourdgh:'sourdough',linsd:'linseed',sy:'soy',chkn:'chicken',chk:'chicken',ckn:'chicken',
 hschkn:'honey soy chicken',crm:'cream',whipd:'whipped',cls:'coles',perkg:'per kg',bby:'baby',spn:'spinach',
 brst:'breast',bnls:'boneless',sknls:'skinless',thgh:'thigh',drmstk:'drumstick',mnc:'mince',sausg:'sausage',ssg:'sausage',
 pk:'pack',pkt:'packet',btl:'bottle',ctn:'carton',
 veg:'vegetable',vegs:'vegetables',org:'organic',wht:'white',whl:'whole',wholml:'wholemeal',wmeal:'wholemeal',mlk:'milk',
 btr:'butter',yog:'yoghurt',yght:'yoghurt',tmt:'tomato',tom:'tomato',pot:'potato',pots:'potatoes',
 strwb:'strawberries',strawb:'strawberries',bluebs:'blueberries',rasp:'raspberries',
 lett:'lettuce',cucmbr:'cucumber',caps:'capsicum',brocc:'broccoli',caul:'cauliflower',mshrm:'mushrooms',grlc:'garlic',gngr:'ginger',swt:'sweet',
 prwn:'prawn',prwns:'prawns',slmn:'salmon',lmb:'lamb',tna:'tuna',brd:'bread',rls:'rolls',noodl:'noodles',ndl:'noodles',
 juc:'juice',jce:'juice',choc:'chocolate',bisc:'biscuits',crkr:'crackers',aus:'australian',
 brshles:'brushless',brshless:'brushless',hamdril:'hammer drill',batt:'battery',chrgr:'charger',chrgrkit:'charger kit',tis:'tissue'
};
// Product types that are not cooking ingredients even when they name one ("honey soy chicken chips").
const SNACK_WORDS=/\b(chips|crisps|snacks?|biscuits?|cookies?|crackers?|chocolate|lollies|candy|soft drink|cola|cordial|ice cream|gum|popcorn|pretzels?|humbugs?|kulfi|drumstick 475|mousse)\b/;
const NONFOOD_WORDS=/\b(battery|batteries|drill|hammer|accessory|disc|blade|tools?|towel|tissues?|toilet|litter|bag|monitor|arm|hdmi|cable|hangers?|hooks?|holder|trimmer|energizer|lithium|mixer|fryer|spreader|pruner|hedge|charger|kit|paper|detergent|nappies|wipes|shampoo|soap|bleach|foil|cling|sponge|globe|candle)\b/;
function splitGlued(s){return String(s).replace(/([a-z])([A-Z])/g,'$1 $2').replace(/([A-Z]{2,})([A-Z][a-z])/g,'$1 $2').replace(/([A-Za-z]{2,})(\d)/g,'$1 $2').replace(/[/&]/g,' ')}
function expandAbbrev(name,table=ABBREVIATIONS){
 const words=norm(splitGlued(name)).split(' ').filter(Boolean),out=[];
 for(let i=0;i<words.length;i++){const two=words[i]+' '+(words[i+1]||'');if(words[i+1]&&Object.hasOwn(table,two)){out.push(table[two]);i++;continue}out.push(Object.hasOwn(table,words[i])?table[words[i]]:words[i])}
 return out.join(' ').replace(/\b(\d+(?:\.\d+)?) (kg|g|ml|l|gram|grams|litre|pk|pack)\b/g,'$1$2').replace(/\s+/g,' ').trim();
}
function isSnack(expanded){return SNACK_WORDS.test(' '+norm(expanded)+' ')}
function isNonFood(expanded){return NONFOOD_WORDS.test(' '+norm(expanded)+' ')&&!/\b(dog food|cat food)\b/.test(norm(expanded))?true:/\b(dog food|cat food|pet food)\b/.test(norm(expanded))}

// ---------------------------------------------------------------- size repair
// OCR confusions are only repaired inside the numeric part directly before a unit.
const CONFUSE={l:'1',I:'1','|':'1','!':'1',i:'1',O:'0',o:'0',D:'0',Q:'0',S:'5',s:'5',B:'8',Z:'2',z:'2',G:'6',q:'9'};
const PLAUSIBLE={g:[5,5000],kg:[0.05,25],ml:[5,5000],l:[0.1,10],pk:[1,500]};
function plausible(qty,unit){const r=PLAUSIBLE[unit];return !!r&&Number.isFinite(qty)&&qty>=r[0]&&qty<=r[1]}
function unitOf(raw){const u=String(raw).toLowerCase();return u==='kg'?'kg':/^(g|gm|gr|gram|grams)$/.test(u)?'g':u==='ml'?'ml':/^(l|lt|ltr|litre|litres|liter|liters)$/.test(u)?'l':/^(pk|pack)$/.test(u)?'pk':null}
function repairNumber(chars,standalone){
 let s='';for(const c of chars){if(/[0-9.,]/.test(c))s+=c===','?'.':c;else if(Object.hasOwn(CONFUSE,c)&&(standalone||!/[ioDQsGqz]/.test(c)))s+=CONFUSE[c];else return null}
 return/^\d+(\.\d+)?$/.test(s)?s:null;
}
const NUMCH='0-9.,lI|!iOoDQSsBZzGq';
// Words that end right before a glued size: decides whether a trailing "l"/"I" is a letter
// ("Chilli175g") or a misread 1 ("Burratal50g" → Burrata 150g). Extendable via addWords().
const KNOWN_WORDS=new Set(('chilli chili burrata oil caramel pastel mozzarella cheddar tasty feta parmesan haloumi ricotta '+
 'milk cream butter yoghurt yogurt cheese chicken chkn chk beef pork lamb salmon tuna prawn prawns fish basa barramundi '+
 'rice noodle noodles pasta bread sourdough linseed linsd soy honey chips crisps salt vinegar thai sweet sour '+
 'tomato tomatoes potato potatoes onion garlic ginger carrot carrots broccoli cabbage lettuce spinach corn peas beans '+
 'strawberries blueberries raspberries grapes apple apples banana bananas mango melon rockmelon watermelon wtrmelon '+
 'eggs egg flour sugar water juice coffee tea biscuits chocolate crackers sausages mince fillet fillets breast thigh '+
 'wings drumsticks stock broth sauce paste coconut tofu mushrooms capsicum cucumber zucchini pumpkin avocado lemon lime '+
 'cereal oats muesli granola spread jam peanut almond cashew walnut olive canola sunflower whipped strips stringers strm '+
 'mixed frozen fresh loose cut roll rolls wrap wraps pita naan bagel muffin cake pie pizza dumplings wonton gyoza kimchi '+
 'hschkn chkn beef320 angus tandoori crust').split(' '));
function addWords(words){for(const w of words||[])for(const t of norm(w).split(' '))if(t.length>2)KNOWN_WORDS.add(t)}
const isConf1=c=>/[lI|!]/.test(c);
function pickGlued(word,run){
 const out=[];for(let k=0;k<run.length;k++){if(/[0-9]/.test(run.slice(0,k)))break;const digits=run.slice(k),w=(word+run.slice(0,k)).toLowerCase();if(!/[0-9]/.test(digits))continue;const q=repairNumber(digits,false);if(q)out.push({q,digits,word:w,known:KNOWN_WORDS.has(w.replace(/^.*?([a-z]+)$/,'$1'))||KNOWN_WORDS.has(splitGlued(word+run.slice(0,k)).toLowerCase().split(' ').pop())})}
 return out;
}
const UNIT_ALT='kg|grams|gram|gm|gr|g|ml|litres|litre|liters|liter|ltr|lt|l';
// Returns {text, size:{qty,unit}|null, pack:count|null, repaired:boolean}
function extractSize(name){
 let text=String(name||''),repaired=false,size=null,pack=null;
 // "8pk/168g", "8Pk 160g", "12PK 700GRAM", "6 x 50g", "10pk", "2ply224pk"
 const packRe=new RegExp(`(^|[^0-9])([${NUMCH}]{1,3})\\s?(?:pk|pack|x)(?![a-z])\\s*/?\\s*(?:([${NUMCH}]{1,5})\\s?(${UNIT_ALT})(?![a-z])|([0-9]{3,5})(?![0-9a-z]))?`,'i');
 const pm=text.match(packRe);
 if(pm){const standalone=!/[A-Za-z]/.test(pm[1]||'');const c=standalone?repairNumber(pm[2],true):(/^[0-9]+$/.test(pm[2])?pm[2]:null);
  if(c&&plausible(+c,'pk')&&/\d/.test(pm[2])){pack=+c;if(c!==pm[2])repaired=true}
  if(pm[3]){const q=repairNumber(pm[3],true),u=unitOf(pm[4]);if(q&&plausible(+q,u)){size={qty:+q,unit:u};if(q!==pm[3])repaired=true}}
  else if(pm[5]&&/9$/.test(pm[5])&&plausible(+pm[5].slice(0,-1),'g')){size={qty:+pm[5].slice(0,-1),unit:'g'};repaired=true}// "168g" read as "1689"
  if(pack||size){const fixed=(pack?pack+'pk':'')+(size?(pack?'/':'')+fmtSize(size):'');const glue=pm[1]&&/[A-Za-z]/.test(pm[1])?pm[1]+' ':pm[1];text=text.slice(0,pm.index)+glue+fixed+text.slice(pm.index+pm[0].length)}
 }
 if(!size){
  const unitRe=new RegExp(`(${UNIT_ALT})(?![a-z])`,'gi');let m,best=null;
  while((m=unitRe.exec(text))){
   const end=m.index;let start=end;while(start>0&&end-start<6&&new RegExp(`[${NUMCH}]`).test(text[start-1]))start--;
   const run=text.slice(start,end);const lone=start===0||/[\s(/]/.test(text[start-1]||' ');if(!run||!/[0-9]/.test(run)&&!(lone&&run.length<=2&&/[lI|!iOo]/.test(run)))continue;
   if(/per$/i.test(text.slice(Math.max(0,start-3),start)))continue;// "PERKG"
   const u=unitOf(m[1]);if(!u)continue;
   let q=null,from=start;
   if(lone){q=repairNumber(run,true);if(!q||!plausible(+q,u)){const opts=pickGlued(text.slice(0,start),run).filter(o=>plausible(+o.q,u));const pick=opts.find(o=>o.known)||opts[0];if(pick){q=pick.q;from=end-pick.digits.length}else q=null}}
   else{let wstart=start;while(wstart>0&&/[A-Za-z]/.test(text[wstart-1]))wstart--;const word=text.slice(wstart,start);
    const opts=pickGlued(word,run).filter(o=>plausible(+o.q,u));
    if(opts.length){const known=opts.find(o=>o.known)||opts.find(o=>isConf1(o.digits[0])&&!KNOWN_WORDS.has(o.word))||opts[0];q=known.q;from=end-known.digits.length}}
   if(!q)continue;
   const digitsRaw=text.slice(from,end);
   best={qty:+q,unit:u,index:from,len:end-from+m[1].length,changed:q!==digitsRaw.replace(',','.')};
  }
  // "…1759"/"Blueberries 1709": the g was read as 9 (no unit left) — only 4 digits ending in 9, last token
  if(!best){const g9=text.match(/(^|[A-Za-z\s])(\d{3})9\s*$/);if(g9&&plausible(+g9[2],'g')&&+g9[2]%5===0){const at=g9.index+g9[1].length;best={qty:+g9[2],unit:'g',index:at,len:4,changed:true}}}
  if(best){size={qty:best.qty,unit:best.unit};if(best.changed)repaired=true;
   const glued=best.index>0&&/[A-Za-z]/.test(text[best.index-1]);
   text=text.slice(0,best.index)+(glued?' ':'')+fmtSize(size)+text.slice(best.index+best.len)}
 }
 return{text:text.replace(/\s+/g,' ').trim(),size,pack,repaired};
}
function fmtSize(s){return s?(s.unit==='l'?s.qty+'L':s.qty+s.unit):''}

// ---------------------------------------------------------------- line helpers
function tidy(line){
 let s=String(line).replace(/[\u00a0\t]+/g,' ').replace(/[“”]/g,'"').replace(/[‘’`´]/g,"'");
 s=s.replace(/(\d)\s?[°·•](\d{2})(?!\d)/g,'$1.$2').replace(/(\d)\.\s(\d{2})(?!\d)/g,'$1.$2');
 s=s.replace(/(\d[.,]\d)[)\]](?=\s?\/)/g,'$10').replace(/(\d)\.\s(\d{3})\s*kg/gi,'$1.$2 kg');
 s=s.replace(/^[\s|¦!\[\]{}~_'".,:;]+/,'').replace(/[\s|¦\[\]{}~_]+$/,'');
 return s.replace(/\s+/g,' ').trim();
}
// Last money amount at the end of the line (with an optional GST/marker flag after it).
function priceOf(line,aldi){
 const s=String(line);let last=null;
 for(const m of s.matchAll(/(-)?\s?\$?\s?(\d{1,4})[.,](\d{2})(-)?(?![\d%])/g))last=m;
 let tail=last?s.slice(last.index+last[0].length):'';
 if(last&&/^\d/.test(s.slice(last.index+last[0].length)))last=null;
 if(aldi){const g=s.match(/(-)?(\d{1,4})[.,](\d{2})[8B]\s*\W{0,2}$/);if(g&&(!last||g.index>=last.index-1)){last=g;tail=' B'}
  if(!last){const sp=s.match(/(\s)(\d{1,3}) (\d{2})\s+[AB8]\s*\W{0,2}$/);if(sp){last=Object.assign([sp[0],'',sp[2],sp[3],''],{index:sp.index});tail=' B'}}}
 if(!last)return null;
 const rest=tail.replace(/\s+/g,'');if(rest.length>5||/\d.*\d/.test(rest))return null;
 const flag=(tail.trim().match(/^([AB8E])\b/)||[])[1]||null;
 const neg=last[1]==='-'||last[4]==='-'||/-\s?\$?\s?$/.test(s.slice(Math.max(0,last.index-3),last.index+1));
 const price=round((neg?-1:1)*(+last[2]+ +last[3]/100));
 let label=s.slice(0,last.index).replace(/[\s$:-]+$/,'').trim();
 return{price,gst:flag==='8'?'B':flag==='E'?null:flag,label,index:last.index};
}
// A price whose last digits are cut off by the photo edge ("5.2?", "S.2¢").
function clippedPrice(line){
 const m=String(line).match(/(^|\s)\$?([0-9SsOoBZga€%]{1,3})[.,]\s?([0-9SsOoga]?)\s?([?¢]+|c(?=\W|$))(?:\s+\S{1,3}){0,2}\W{0,3}$/);
 if(!m)return null;const a=repairNumber(m[2],true),b=m[3]?repairNumber(m[3],true):'';
 return{pattern:a!=null&&b!=null?a+'.'+b:'',label:String(line).slice(0,m.index).trim()};
}
function amountIn(line){const all=[...String(line).matchAll(/(-)?\s?\$?\s?(\d{1,5})[.,](\d{2})(?![\d%])/g)];if(!all.length)return null;const m=all[all.length-1];const neg=m[1]==='-'||/-\s?\$?\s?$/.test(String(line).slice(Math.max(0,m.index-3),m.index+1));return round((neg?-1:1)*(+m[2]+ +m[3]/100))}

// Item code (ALDI 4–7 digits, Woolworths UK 9 digits): everything before it is OCR noise from the
// receipt edge / shadow ("Si", "hen", "STE ve", ":"), and the code itself is not part of the name.
function cleanLabel(label,retailer){
 let s=String(label).replace(/[—–~_=]+/g,' ').replace(/\s+/g,' ').trim(),code=null;
 for(const m of s.matchAll(/(?:^|[\s:;|'.,])[>*»«=+]?([0-9€£OoSIl]{4,9})\s+(?=\S)/g)){
  const raw=m[1],digits=raw.replace(/[€£]/g,'6').replace(/[Oo]/g,'0').replace(/[Il]/g,'1').replace(/S/g,'5');
  if((raw.match(/\d/g)||[]).length<3||!/^\d{4,9}$/.test(digits))continue;
  const rest=s.slice(m.index+m[0].length);if(!/[A-Za-z]{2}/.test(rest))continue;
  if(retailer!=='aldi'&&retailer!=='woolworths-uk'&&digits.length<5)continue;
  code=digits;s=rest;break;
 }
 if(!code)s=s.replace(/^[^A-Za-z0-9À-ỹ>*#^%]+/,'').replace(/^(?:[a-z]{1,2}|[A-Z][a-z]?)\s+(?=[A-Z0-9^#*%>][A-Za-z0-9])/,m=>/^(ea|Mt|St|Dr|Mr|No)\s$/.test(m)?m:'');
 s=s.replace(/^(?:[>*»«~=+#^%]+\s*)+/,'').replace(/^[xX×](?=\d)/,'');
 s=s.replace(/\s+[^\sA-Za-z0-9]{1,2}$/,'').replace(/[\s:;,'"`|\\$]+$/,'').replace(/\s+/g,' ').trim();
 return{label:s,code};
}

// ---------------------------------------------------------------- line classes
const PAY_RE=/^(commonwealth bank|westpac|anz\b|nab\b|st george|bank of|eftpos|eft\b|customer copy|merchant copy|cardholder copy|terminal|term id|merch|reference|ref\b|card no|card\b|pan seq|psn\b|aid\b|tvr\b|tsi\b|atc\b|arqc|arpc|auth|approved|declined|mastercard|master card|debit|visa|amex|savings|cheque|credit \d|credit account|cash|change\b|tender|paid\b|payment|purchase\b|refund\b|total aud|account|acct|gst included|thank you|visit|trading hours|you saved|total savings|your savings|surname|signature|pin verified|contactless)/;
const SKIP_RE=/^(abn\b|acn\b|vat\b|tax invoice|invoice|phone\b|ph\b|tel\b|description\b|served by|store manager|manager\b|register\b|cashier|operator|date\b|time\b|www\b|unit \d|cnr\b|a limited partnership|limited partnership|aldi stores|qty\b\s*$)/;
const SENSITIVE_RE=/\b(card\s*(no|num(ber)?|#)|aid\b|tvr\b|tsi\b|atc\b|arqc|arpc|terminal|term(inal)?\s*id|merch(ant)?\s*(id|no)?\b|reference|ref\s*(no|#|:)|auth(ori[sz]ation)?\s*(code|no)?|pan\s*seq|account\s*(no|type)?|acct|stan\b|rrn\b|trans(action)?\s*(no|#|id|\d)|receipt\s*(no|#|:)|register\s*:|served\s*by|store\s*manager|manager\s*:|cashier|operator|signature|surname)/i;
function isSensitive(line){const s=String(line);return SENSITIVE_RE.test(s)||/\d{10,}/.test(s)&&!/\d[.,]\d{2}\s*[A-Z]?\s*$/.test(s)||/\b[0-9A-F]{10,}\b/.test(s)||/\d{3,4}\/\d{3}\/\d{3}\/\d{3}/.test(s)||/^\W*[x*]\d{4}\b/.test(s)||/\b(TRANS|POS)\s*\d+/i.test(s)}
// Text that may be saved (receipt raw text, notes): sensitive payment / staff lines removed.
function redact(text){return String(text||'').split(/\r?\n/).filter(l=>!isSensitive(l)).join('\n').slice(0,20000)}

function classifyTotal(line){
 const n=norm(line);
 let m=n.match(/\bfor (-?\d{1,3}) [il1t]tems?\b/)||n.match(/\bfor (-?\d{1,3}) items?\b/);if(m&&/\d[.,]\d{2}/.test(line))return{p:4,count:+m[1]};
 m=n.match(/^(?:(-?\d{1,3}) )?sub ?-?total\b(.*)$/);if(m)return{p:/incl/.test(m[2])?3:2,count:m[1]!=null?+m[1]:null};
 if(/^(i |l |)total\b/.test(n)&&!/\b(surcharge|savings?|discount|gst included|included|tax|vat)\b/.test(n))return /\baud\b/.test(n)?{p:1}:{p:4};
 if(/\bincl\.? ?gst\b/.test(n)&&/\d[.,]\d{2}/.test(line))return{p:3};
 if(/^(grand total|amount due|balance due|total due|tong cong|tong tien)\b/.test(n))return{p:4};
 return null;
}

// ---------------------------------------------------------------- dates, store
function findDate(lines){
 const cands=[];
 lines.forEach((l,i)=>{
  for(const m of l.matchAll(/(?:^|[^\d/])(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})(?![\d/])/g)){const y=m[3].length===2?2000+ +m[3]:+m[3],mo=+m[2],d=+m[1];if(mo>=1&&mo<=12&&d>=1&&d<=31&&y>=2000&&y<=MAX_YEAR)cands.push({date:`${y}-${pad(mo)}-${pad(d)}`,line:i,score:/date/i.test(l)?3:/\d{1,2}:\d{2}/.test(l)?2:1})}
  for(const m of l.matchAll(/\b(\d{1,2})\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*(\d{4})\b/gi)){const d=+m[1],y=+m[3];if(d>=1&&d<=31&&y>=2000&&y<=MAX_YEAR)cands.push({date:`${y}-${pad(MONTHS.indexOf(m[2].toLowerCase())+1)}-${pad(d)}`,line:i,score:/\d{1,2}:\d{2}/.test(l)?2:1})}
 });
 if(!cands.length)return{date:null,time:null};
 cands.sort((a,b)=>b.score-a.score||a.line-b.line);const best=cands[0];
 const tm=l=>{const t=String(l||'').match(/(?:^|\D)([01]?\d|2[0-3])[:.]([0-5]\d)(?![\d.:/])(?!\s*(?:kg|%))/);return t?pad(+t[1])+':'+t[2]:null};
 let time=tm(lines[best.line])||tm(lines[best.line+1]);
 if(!time)for(const l of lines)if(/\btime\b/i.test(l)&&(time=tm(l)))break;
 return{date:best.date,time};
}
function findTransaction(lines,retailer){
 const all=lines.join('\n');let m;
 if((m=all.match(/(\d{3,4}\/\d{3}\/\d{3}\/\d{3})\s+(\d{2}[.]\d{2}[.]\d{2})\s+(\d{2}:\d{2})/)))return['aldi',m[1],m[2],m[3]].join('|');
 if((m=all.match(/STORE\s*(\d{2,5})\s*POS\s*(\d{1,4})\s*TRANS\s*(\d{1,7})/i)))return['ww',m[1],m[2],m[3]].join('|');
 if((m=all.match(/Receipt\s*:?\s*(\d{2,8})/i))){const r=(all.match(/Register\s*:?\s*(\d{1,4})/i)||[])[1]||'';return['coles',r,m[1]].join('|')}
 if((m=all.match(/\bTRANS(?:ACTION)?\s*(?:NO|#)?\s*:?\s*(\d{2,8})/i)))return[retailer||'any',m[1]].join('|');
 return null;
}
const STATES='NSW|VIC|QLD|SA|WA|TAS|ACT|NT';
function findStore(lines,head,retailer){
 let suburb='',storeNo=null;const rid=retailer?.id;
 const clean=t=>/^[A-Za-z][A-Za-z' -]{2,30}$/.test(t)&&!/\b(stores?|limited|partnership|tax|invoice|abn|aldi|coles|woolworths|eftpos|bank|copy|customer|the fresh|food|people)\b/i.test(t);
 if(rid==='aldi'){const i=head.findIndex(l=>/partnership/i.test(l));const cand=i>=0?head.slice(i+1,i+3).map(l=>l.trim()).find(clean):null;
  const eft=lines.map(l=>l.match(new RegExp(`^([A-Z][A-Z' ]{2,28}?)\\s+(${STATES})\\b`))).find(Boolean);
  suburb=cand||(eft?titleCase(eft[1]):'');if(cand&&eft&&norm(cand)!==norm(eft[1])&&/[^A-Za-z ]/.test(cand))suburb=titleCase(eft[1])}
 else if(rid==='woolworths'){for(const l of head){const m=l.match(/^\W*(\d{3,5})\s+(.+?)\s+P[HNY]\b/i);if(m){storeNo=m[1];suburb=m[2].replace(/^New\s*-\s*/i,'').trim();break}}
  if(!storeNo){const m=lines.join('\n').match(/STORE\s*(\d{2,5})\s*POS/i);if(m)storeNo=m[1]}}
 else if(rid==='coles'){for(const l of lines){const m=l.match(/Store\s*:?\s*(\d{1,5})\s*[-~&]+\s*(?:[CcOo0][Ss5]\s+)?([A-Za-z][A-Za-z' ]+)/i);if(m){storeNo=m[1];suburb=titleCase(m[2].trim());break}}}
 else if(rid==='woolworths-uk'){for(const l of head){const m=l.match(/^([A-Za-z][A-Za-z ]{2,30}),\s*[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/);if(m){suburb=m[1].trim();break}}}
 suburb=suburb.replace(/\s+/g,' ').trim();
 let store=retailer?.name?(retailer.name.replace(/ UK$/,'')+(suburb?' '+suburb:'')):'';
 if(!store){const first=head.find(l=>/[A-Za-z]{3}/.test(l)&&l.length<50&&!/\d[.,]\d{2}/.test(l)&&!SKIP_RE.test(norm(l))&&!isSensitive(l));store=first?first.trim():''}
 return{store,suburb,storeNo};
}

// ---------------------------------------------------------------- main parser
const WEIGHT_RE=/(\d+[.,]\s?\d{1,3})\s*kg\s*(?:net)?\s*[@©®€&]?\s*\$?\s?(\d+[.,]\d{2})\s*\$?\s*[/]\s*kg/i;
const MULTI_RE=/^\W*(?:[qo]ty\s*)?(\d{1,3})\s*(?:[@©®§&]\s*\$?|\s[08Oo]\s+\$)\s?(\d+[.,]\d{2})\s*(?:each|ea\b\.?)?/i;
function parseReceipt(text,opts={}){
 const raw=String(text||'').slice(0,40000);
 const lines=raw.split(/\r?\n/).map(tidy).filter(Boolean);
 const det=opts.retailer&&RETAILERS[opts.retailer]?{id:opts.retailer,name:RETAILERS[opts.retailer].name,currency:RETAILERS[opts.retailer].currency}:detectRetailer(raw);
 const aldi=det.id==='aldi';
 const items=[],totals=[],head=[];const payAmounts=[];let section='head',pending=null,refund=false,multiple=false,printedCount=null,lastItem=null;
 const add=it=>{items.push(it);if(it.kind==='item')lastItem=it;return it};
 // An unpriced line that names a product with a printed size (torn / clipped receipt) stays as a line
 // without a price, so nothing is silently lost; the price is never guessed.
 const keepPending=()=>{if(!pending||aldi)return;const c=cleanLabel(pending.text,det.id),sz=extractSize(c.label);if((sz.size||sz.pack)&&/[A-Za-z]{4}/.test(c.label))add(makeItem(c.label,c.code,null,null,pending.text,true));pending=null};
 const aldiCoded=aldi?lines.filter(l=>/(^|\s)[>*»«=+]?\d{4,7}\s+\S.*\d[.,]\d{2}/.test(l)).length:0;
 const bodyStart=lines.findIndex(l=>/tax\s*invoice|^\W*\$\W*$|^\W*description\b/i.test(l));
 for(let i=0;i<lines.length;i++){
  const line=lines[i],n=norm(line);
  if(section==='warranty')continue;
  if(/^\W*[wy]arrant(y|ies)\b/i.test(line)){section='warranty';pending=null;continue}
  if(section==='pay'&&totals.some(t=>t.p>=4)&&/tax\s*invoice/i.test(line)){multiple=true;break}
  if(/^\W*refund\b/i.test(line)&&!/\d[.,]\d{2}/.test(line)){refund=true;if(section==='head'&&i>=bodyStart)section='body';continue}
  // printed totals and item count
  const tot=classifyTotal(line);
  if(tot){let v=amountIn(line);if(v==null&&lines[i+1]&&/^\W*-?\$?\s?-?\d{1,5}[.,]\d{2}\W*$/.test(lines[i+1]))v=amountIn(lines[i+1]);
   if(tot.count!=null)printedCount=tot.count;
   if(v!=null)totals.push({value:v,p:tot.p,line:i,label:line.replace(/\s*-?\$?\s?-?\d[\d.,\s]*\W*$/,'').trim()});
   pending=null;if(section!=='pay')section=tot.p>=4?'pay':tot.p>=2?'sub':section;continue}
  const cnt=line.match(/^\W{0,2}?(-?\d{1,3})\s*[iIl1T|]tems?\b\W*$/i);if(cnt){printedCount=+cnt[1];continue}
  // adjustments that may appear anywhere after the items (ALDI prints them after the bank block)
  if(/surcharge/i.test(line)&&!/^\W*total\s+surcharge/i.test(line)){const v=amountIn(line);if(v!=null&&section!=='head')add(adjust('surcharge',line,v));continue}
  if(/^\W*total\s+surcharge/i.test(line))continue;
  if(/^\W*round(ing)?\b/i.test(line)){const v=amountIn(line);if(v!=null&&Math.abs(v)>=0.005)add(adjust('rounding',line,v));continue}
  if(/you have saved|^\W*D\d{3}\b/i.test(line)&&det.id==='woolworths-uk'){const v=amountIn(line);if(v!=null&&lastItem){lastItem.discount=round((lastItem.discount||0)-Math.abs(v));lastItem.raw+=' / '+line}continue}
  if(/^\W*(credit|discount|less|promo|coupon|voucher|member\s*(discount|saving)|multi\s*buy|saving)\b/i.test(line)&&!/surcharge/i.test(line)&&/-\s?\$?\s?\d|\d[.,]\d{2}\s*-/.test(line)){const v=amountIn(line);if(v!=null){add(adjust('discount',line,-Math.abs(v)));continue}}
  if(PAY_RE.test(n)){if(/^(purchase|refund|total aud|mastercard|master card|visa|eftpos|eft|debit|amex)\b/.test(n)){const v=amountIn(line);if(v!=null)payAmounts.push(v)}if(section!=='head'||i>bodyStart&&bodyStart>=0)section='pay';pending=null;continue}
  if(isSensitive(line)){pending=null;continue}
  if(/\bnet\b.*\b(gst|vat)\b|^\W*[ab]\s+\d+[.,]\d\s*%/i.test(line))continue;
  if(section==='head'){
   if(i<=bodyStart||bodyStart<0&&SKIP_RE.test(n)){head.push(line);if(i===bodyStart)section='body';continue}
   if(bodyStart<0){const p=priceOf(line,aldi);if(!(p&&/[A-Za-z]{2}/.test(p.label)||WEIGHT_RE.test(line))){head.push(line);if(/[A-Za-z]{3}/.test(line)&&!SKIP_RE.test(n))pending={text:line,head:true};continue}}
   section='body';
  }
  if(section==='pay')continue;
  if(SKIP_RE.test(n)||/^\W*\$\W*$/.test(line)){pending=null;continue}
  // continuation: weighed line → previous (or pending) item
  const w=line.match(WEIGHT_RE);
  if(w){const kg=+w[1].replace(/\s/g,'').replace(',','.'),per=+w[2].replace(',','.'),p=priceOf(line.slice(w.index+w[0].length),aldi);
   let target=null;
   if(pending&&section==='body'){const c=cleanLabel(pending.text,det.id);if(/[A-Za-z]{2}/.test(c.label))target=add(makeItem(c.label,c.code,p?p.price:null,p?.gst,pending.text,!p))}
   else if(lastItem&&lastItem.weight==null&&!(!det.id&&p&&lastItem.price!=null&&Math.abs(lastItem.price-p.price)>0.015))target=lastItem;
    // v1.7.2 local grocer: "0.850kg @ 12.99/kg 11.04" with its own price is its own (generic) line
    else if(!det.id&&p&&section==='body'){target=add(makeItem('',null,p.price,p.gst,line,false));target.genericKey='w'}
   pending=null;
   if(target&&kg>0&&kg<50){target.weight={qty:kg,unit:'kg'};target.perKg=per;target.raw+=' / '+line;if(target.price==null&&p){target.price=p.price;target.priceMissing=false}target.qty=kg;target.unit='kg';target.size=null}
   continue}
  const mm=line.match(MULTI_RE);
  if(mm&&!/[a-z]{3}/i.test(line.replace(/each|[qo]ty|ea\b/ig,''))){const count=+mm[1],each=+mm[2].replace(',','.'),p=priceOf(line.slice(mm.index+mm[0].length),aldi);
   let target=null;
   if(pending&&section==='body'){const c=cleanLabel(pending.text,det.id);if(/[A-Za-z]{2}/.test(c.label))target=add(makeItem(c.label,c.code,p?p.price:null,p?.gst,pending.text,!p))}
   else target=lastItem;
   pending=null;
   if(target&&count>=1&&count<100){target.multi={count,each};target.raw+=' / '+line;if(target.price==null&&p){target.price=p.price;target.priceMissing=false}
    if(target.price==null){target.price=round(count*each);target.priceMissing=false;target.priceDerived=true}
    if(target.size){target.qty=round(target.size.qty*count,3)}else if(target.each||target.qty==null){target.qty=count;target.unit='each'}}
   continue}
  const p=priceOf(line,aldi);
  if(!p||!/[A-Za-z]{2}/.test(p.label)){
   // v1.7.2 local grocer: a price on its own ("3.50") or a PLU only ("4011 2.10") is a generic line
    if(p&&!det.id&&section==='body'&&(!pending||pending.head)){const g=genericLabel(p.label);if(g){add(makeItem(p.label.replace(/[^0-9A-Za-z ]+/g,' ').trim(),null,p.price,p.gst,line,false));pending=null;continue}}
    if(p&&pending&&section==='body'){const c=cleanLabel(pending.text,det.id);if(/[A-Za-z]{2}/.test(c.label))add(makeItem(c.label,c.code,p.price,p.gst,pending.text+' '+line,false));pending=null;continue}
   const cp=clippedPrice(line);
   if(cp&&/[A-Za-z]{2}/.test(cp.label)){const c=cleanLabel(cp.label,det.id);if(c.label&&(section==='body'||c.code)){const it=add(makeItem(c.label,c.code,null,null,line,true));it.pricePattern=cp.pattern}pending=null;continue}
   keepPending();
   pending=/[A-Za-z]{3}/.test(line)&&line.length<130&&section==='body'?{text:line}:null;
   continue}
  const c=cleanLabel(p.label,det.id);
  if(!c.label||!/[A-Za-z]{2}/.test(c.label)||/\b(gst|vat)\b/i.test(c.label)){pending=null;continue}
  // ALDI prints an item code on every item line; a codeless priced line there is OCR noise from the bank block / edge
  if(aldi&&!c.code&&aldiCoded>=2){pending=null;continue}
  if(section==='sub'&&!c.code){pending=null;continue}
  if(section==='sub')section='body';
  pending=null;
  add(makeItem(c.label,c.code,p.price,p.gst,line,false));
 }
 if(section==='body')keepPending();
 // refunds: every line is money back
 const lastTotal=totals.filter(t=>t.p>=2).pop();
 if(!refund&&(printedCount!=null&&printedCount<0||lastTotal&&lastTotal.value<0))refund=true;
 if(refund)for(const it of items)if(it.price!=null&&it.price>0)it.price=-it.price;
 // duplicates (same code, or same name + price): separate lines, ×N hint; a twin read cleanly lends its name/size
 const key=it=>it.code?'c:'+it.code:'n:'+norm(it.name)+'|'+it.price;
 const groups=new Map();items.forEach((it,idx)=>{if(it.kind!=='item')return;const k=key(it);(groups.get(k)||groups.set(k,[]).get(k)).push(idx)});
 for(const idxs of groups.values())if(idxs.length>1){
  const best=idxs.map(i=>items[i]).sort((a,b)=>(+!!b.size-+!!a.size)||(+!b.repaired- +!a.repaired)||(+(b.price!=null)-+(a.price!=null)))[0];
  idxs.forEach((i,k)=>{const it=items[i];it.dup={count:idxs.length,n:k+1};
   if(it.code&&best!==it&&best.size&&(!it.size||norm(it.name)!==norm(best.name))){it.name=best.name;it.size=best.size;it.pack=best.pack;if(it.weight==null){it.qty=best.qty;it.unit=best.unit}it.expanded=best.expanded;it.fromTwin=true}});
 }
 // printed total: the last of the strongest kind (ALDI may print several subtotal blocks)
 const pick=[4,3,2,1].map(p=>totals.filter(t=>t.p===p).pop()).find(Boolean)||null;
 let printedTotal=pick?pick.value:null,totalConflict=null;
 // the printed total is cross-checked against the other printed amounts (payment, EFTPOS "TOTAL AUD",
 // subtotal): when they agree with each other and not with the total line, the total line was misread.
 if(printedTotal!=null){const sg=printedTotal<0?-1:1,others=[...payAmounts,...totals.filter(t=>t!==pick).map(t=>t.value)].map(v=>Math.abs(v)*sg).filter(v=>Math.abs(v-printedTotal)>=0.005);
  const goodsSum=round(items.reduce((n,i)=>n+(i.price!=null?lineValue(i):0),0));
  const agree=payAmounts.length?others.find(v=>others.filter(x=>Math.abs(x-v)<0.005).length>=2):undefined;
  if(agree!=null&&Math.abs(printedTotal-goodsSum)>=0.005){totalConflict={read:printedTotal,used:agree};printedTotal=agree}}
 // clipped prices: repaired only when the printed total confirms the result
 const missing=items.filter(i=>i.price==null);
 if(missing.length&&printedTotal!=null){
  const tentative=new Map();
  for(const it of missing){const twin=it.code&&items.find(x=>x!==it&&x.code===it.code&&x.price!=null);if(twin&&(!it.pricePattern||Math.abs(twin.price).toFixed(2).startsWith(it.pricePattern)))tentative.set(it,twin.price)}
  const left=missing.filter(i=>!tentative.has(i));
  if(left.length===1){const known=items.reduce((n,i)=>n+(i.price!=null?lineValue(i):tentative.has(i)?tentative.get(i):0),0);const v=round(printedTotal-known);if(v!==0&&Math.abs(v)<10000&&(!left[0].pricePattern||Math.abs(v).toFixed(2).startsWith(left[0].pricePattern)))tentative.set(left[0],v)}
  const sumAll=items.reduce((n,i)=>n+(i.price!=null?lineValue(i):tentative.has(i)?tentative.get(i):NaN),0);
  if(tentative.size===missing.length&&Math.abs(round(sumAll)-printedTotal)<0.015)for(const[it,v]of tentative){it.price=v;it.priceMissing=false;it.priceRepaired=true}
 }
 const lineSum=round(items.reduce((n,i)=>n+(i.price!=null?lineValue(i):0),0));
 const difference=printedTotal==null?null:round(printedTotal-lineSum);
 const countRead=items.filter(i=>i.kind==='item').reduce((n,i)=>n+(i.multi?i.multi.count:1),0)*(refund?-1:1);
 const{date,time}=findDate(lines);
 const where=findStore(lines,head,det);
 const out={retailer:det.id,retailerName:det.name,currency:det.currency,store:where.store,suburb:where.suburb,storeNo:where.storeNo,date,time,refund,items,lineSum,printedTotal,totalLabel:pick?.label||null,difference,printedCount,countRead,txRaw:findTransaction(lines,det.id),multiple,totalConflict,warnings:[]};
 out.warnings=warningsFor(out);
 return out;
}
function lineValue(i){return round((i.price||0)+(i.discount||0))}
function adjust(kind,line,value){const label=line.replace(/\s*-?\$?\s?-?\d[\d.,]*\s*[A-Z]?\s*$/,'').replace(/[:\s]+$/,'').trim()||kind;return{kind,name:label,code:null,price:round(value),gst:null,size:null,pack:null,repaired:false,qty:null,unit:null,weight:null,perKg:null,multi:null,each:false,expanded:'',snack:false,nonFood:true,raw:line,priceMissing:false,dup:null}}
function makeItem(label,code,price,gst,raw,missing){
 const s=extractSize(label);let name=s.text,qty=null,unit=null;
 const each=/\b(ea|each)$/i.test(name);if(each){name=name.replace(/\s*\b(ea|each)$/i,'').trim();qty=1;unit='each'}
 if(s.size){qty=s.size.qty;unit=s.size.unit}
 const expanded=expandAbbrev(name),g=genericLabel(name);
 return{kind:'item',name,code:code||null,price:price??null,gst:gst||null,size:s.size,pack:s.pack,repaired:s.repaired,qty,unit,weight:null,perKg:null,multi:null,each,expanded,snack:isSnack(expanded),nonFood:isNonFood(expanded),raw:String(raw||''),priceMissing:!!missing||price==null,dup:null,generic:!!g,genericKey:g?g.key:null,plu:g?g.plu:null};
}
// v1.7.2 generic / local-grocer lines: a department word ("GROCERY", "VEG", "MEAT", "DEPT 01", "MISC"), a PLU
// on its own, or only a price. They name no item, so they are never matched automatically ("Chưa rõ món").
// Returns {key, plu} (key = stable learning key: "l:veg", "d:01", "p:4011", "price") or null.
const GENERIC_WORDS='groceries|grocery|grocer|produce|veg|vege|veges|vegs|vegie|vegies|veggie|veggies|vegetable|vegetables|fruit|fruits|fruit veg|fruit and veg|fruit n veg|f v|fv|meat|meats|deli|delicatessen|seafood|sea food|misc|miscellaneous|sundry|sundries|general|item|items|open price|dept|department';
const GENERIC_RE=new RegExp(`^(${GENERIC_WORDS})(?: no)?(?: ?(\\d{1,6}))?$`);
function genericLabel(name){
 const n=norm(name).replace(/\b(x ?1|qty ?1|1 x)\b/g,'').replace(/\s+/g,' ').trim();
 if(!n)return{key:'price',plu:null};
 if(/^\d{1,4}(?: \d{2})?$/.test(n)&&/^\s*-?\$?\s?\d{1,4}[.,]\d{2}\s*$/.test(String(name)))return{key:'price',plu:null};
 let m=n.match(/^(?:plu|plu no|plu code|code) ?(\d{2,6})$/)||n.match(/^(\d{3,6})$/);if(m)return{key:'p:'+m[1],plu:m[1]};
 m=n.match(/^(?:dept|department|d) ?(\d{1,3})$/);if(m)return{key:'d:'+m[1].padStart(2,'0'),plu:null};
 m=n.match(GENERIC_RE);if(m){const w=m[1].replace(/^(groceries|grocer)$/,'grocery').replace(/^(vege|veges|vegs|vegie|vegies|veggie|veggies|vegetable|vegetables)$/,'veg').replace(/^(fruits)$/,'fruit').replace(/^(fruit veg|fruit and veg|fruit n veg|f v|fv)$/,'fruit veg').replace(/^meats$/,'meat').replace(/^delicatessen$/,'deli').replace(/^sea food$/,'seafood').replace(/^(miscellaneous|sundry|sundries|general|open price)$/,'misc').replace(/^items$/,'item').replace(/^department$/,'dept');
  return{key:w==='dept'&&m[2]?'d:'+m[2].padStart(2,'0'):'l:'+w+(m[2]&&w!=='dept'?' '+m[2]:''),plu:null}}
 return null;
}

// ---------------------------------------------------------------- warnings (VI/EN)
function warningsFor(r){
 const w=[],money=v=>Math.abs(v).toFixed(2),cur=r.currency||'AUD';
 const goods=r.items.filter(i=>i.kind==='item');
 if(r.multiple)w.push({code:'multiple',vi:'Ảnh có vẻ có hơn một hoá đơn — chỉ đọc hoá đơn đầu; chụp riêng từng hoá đơn',en:'The photo seems to hold more than one receipt — only the first was read; photograph each receipt separately'});
 if(r.totalConflict)w.push({code:'total-conflict',vi:`Dòng tổng đọc được ${r.totalConflict.read.toFixed(2)} nhưng các số in khác là ${r.totalConflict.used.toFixed(2)} — đã dùng ${r.totalConflict.used.toFixed(2)}, kiểm tra lại`,en:`The total line reads ${r.totalConflict.read.toFixed(2)} but the other printed amounts say ${r.totalConflict.used.toFixed(2)} — ${r.totalConflict.used.toFixed(2)} is used, please check`});
 if(cur!=='AUD')w.push({code:'non-aud',vi:`Hoá đơn ngoài Úc (${cur}) — chỉ lưu chi tiêu, không chia sẻ giá`,en:`Receipt from outside Australia (${cur}) — saved as spending only, prices are not shared`});
 if(r.refund)w.push({code:'refund',vi:'Hoá đơn hoàn tiền — ghi khoản âm, không thay đổi tủ thực phẩm',en:'Refund receipt — recorded as money back, the pantry is not changed'});
 if(!goods.length)w.push({code:'no-items',vi:'Không thấy dòng món nào — chụp cả phần trên hoá đơn',en:'No item lines found — photograph the top part of the receipt too'});
 if(r.printedTotal==null)w.push({code:'no-total',vi:'Không thấy tổng tiền in trên hoá đơn — nhập tổng thực trả',en:'No printed total found — enter the amount paid'});
 else if(r.difference!=null&&Math.abs(r.difference)>=0.015&&goods.length)w.push(r.difference>0?{code:'short',value:r.difference,vi:`Thiếu ${money(r.difference)} — có thể đọc sót một dòng`,en:`Short by ${money(r.difference)} — a line may have been missed`}:{code:'over',value:r.difference,vi:`Các dòng vượt tổng in ${money(r.difference)} — kiểm tra giá đọc sai`,en:`Lines exceed the printed total by ${money(r.difference)} — check for a misread price`});
 if(r.printedCount!=null&&goods.length&&Math.abs(r.printedCount)!==Math.abs(r.countRead))w.push({code:'count',vi:`Hoá đơn ghi ${Math.abs(r.printedCount)} món, đọc được ${Math.abs(r.countRead)}`,en:`The receipt says ${Math.abs(r.printedCount)} items, ${Math.abs(r.countRead)} were read`});
 const miss=goods.filter(i=>i.price==null).length;if(miss)w.push({code:'missing-price',value:miss,vi:`${miss} dòng chưa đọc được giá — nhập tay, không tự đoán`,en:`${miss} line(s) without a readable price — enter by hand, nothing is guessed`});
 const prices=goods.map(i=>Math.abs(i.price||0)).filter(Boolean).sort((a,b)=>a-b);
 if(prices.length>=4&&r.printedTotal==null){const med=prices[prices.length>>1];for(const it of goods)if(Math.abs(it.price||0)>=100&&Math.abs(it.price)>=25*med)w.push({code:'odd-price',value:it.price,vi:`Giá ${money(it.price)} của “${it.name}” có vẻ đọc sai — kiểm tra lại`,en:`${money(it.price)} for “${it.name}” looks misread — please check`})}
 const fixed=goods.filter(i=>i.priceRepaired).length;if(fixed)w.push({code:'repaired-price',value:fixed,vi:`${fixed} giá bị cắt mép đã được điền vì khớp tổng in — kiểm tra lại`,en:`${fixed} clipped price(s) filled in because they match the printed total — please check`});
 return w;
}
// How well a text reads as a receipt: priced item lines with a real word, +5 when the lines add up
// to the printed total. Used to choose between the prepared and the plain photo.
function readScore(text){const r=typeof text==='string'?parseReceipt(text):text;if(!r)return-1;return r.items.filter(i=>i.kind==='item'&&i.price!=null&&/[A-Za-z]{3}/.test(i.name)).length+(r.printedTotal!=null&&Math.abs(r.difference||0)<0.02&&r.items.length?5:0)+(r.printedTotal!=null?1:0)}
// Should the plain-photo reading replace the prepared one? Only when it adds up to its printed total and the
// prepared one does not, or it reads clearly more item lines (+3) — junk lines from a busy background must not win.
function preferOther(prepared,other){const p=typeof prepared==='string'?parseReceipt(prepared):prepared,o=typeof other==='string'?parseReceipt(other):other;if(!o)return false;const ok=r=>r&&r.printedTotal!=null&&r.items.some(i=>i.kind==='item')&&Math.abs(r.difference||0)<0.02;if(ok(o)!==ok(p))return ok(o);return readScore(o)>=readScore(p)+3}
function warningText(w,lang='vi'){return lang==='en'?w.en:w.vi}
// Backwards-compatible single message (used by older callers).
function differenceNote(r,lang='vi'){const w=(r.warnings||warningsFor(r)).find(x=>x.code==='short'||x.code==='over');return w?warningText(w,lang):null}
// Does this OCR text look like a multi-line shop receipt (vs a single shelf tag / product page)?
function looksLikeReceipt(text){const r=typeof text==='string'?parseReceipt(text):text;const priced=r.items.filter(i=>i.kind==='item'&&i.price!=null).length;return priced>=3||priced>=2&&(r.printedTotal!=null||!!r.retailer)||r.printedTotal!=null&&!!r.retailer&&/tax invoice|subtotal|total for/i.test(r.items.map(i=>i.raw).join(' ')+(typeof text==='string'?text:''))}

// ---------------------------------------------------------------- matching
// English receipt words → app ingredient ids (only for ids whose aliases are Vietnamese-only).
const EN_ALIASES={salmon:['salmon'],corn:['sweet corn','corn kernels','corn cob'],milk:['milk','full cream milk','lite milk','skim milk'],yogurt:['yogurt','yoghurt','greek yoghurt'],cream:['cream whipped','whipped cream','thickened cream','cooking cream','pure cream','whipping cream'],butter:['butter','unsalted butter'],mozzarella:['mozzarella'],parmesan:['parmesan'],feta:['feta'],bread:['bread','white bread','sourdough','rolls','bread rolls','wraps','white wraps'],wholeBread:['wholemeal bread','wholemeal','hi fibre','grain bread'],flour:['plain flour','flour'],oats:['rolled oats','oats'],lemon:['lemon','lemons'],lettuce:['lettuce','iceberg lettuce','cos lettuce'],zucchini:['zucchini'],eggplant:['eggplant'],bellPepper:['capsicum','capsicums'],asparagus:['asparagus'],avocado:['avocado','avocados'],apple:['apple','apples','apple jazz','apple pink lady'],orange:['orange','oranges','mandarins','mandarin'],tuna:['tuna'],spaghetti:['spaghetti'],penne:['penne'],chickpea:['chickpeas'],peanut:['peanuts'],almond:['almonds'],walnut:['walnuts'],oil:['canola oil','olive oil','vegetable oil','sunflower oil'],carrot:['carrots','carrot'],onion:['onions','brown onions','red onions'],potato:['potatoes','brushed potatoes','washed potatoes'],broccoli:['broccoli'],egg:['eggs','free range eggs','cage eggs','cage 12pk','cage free'],spinach:['baby spinach','spinach'],tomato:['tomato','tomatoes','tomato gourmet','cherry tomatoes'],mushroom:['mushrooms','mushroom oyster','mushroom']};
// Returns {match, confidence:'learned'|'high'|'suggested'|'unknown'} for one parsed line.
function matchIngredient(item,{ingredients={},aliases={},extraAliases={},memory={},retailer=null}={}){
 if(item.kind!=='item'||item.generic)return{match:'',confidence:'unknown'};
 for(const k of memoryKeys(item,retailer)){const v=memory[k];if(v&&(v==='other'||Object.hasOwn(ingredients,v)))return{match:v,confidence:'learned'}}
 if(item.snack||item.nonFood)return{match:'',confidence:'unknown'};
 const words=norm(item.expanded||item.name).replace(/\b\d+(\.\d+)?(kg|g|ml|l|pk|pack|gram|litre)?\b/g,' ').replace(/\b(pack|bag|each|loose|cut|bottle|carton|per kg|perkg|kg)\b/g,' ').replace(/\s+/g,' ').trim();
 if(!words)return{match:'',confidence:'unknown'};
 const n=' '+words+' ',nt=words.split(' ').length;let best='',score=0,cover=0;
 for(const[id,ing]of Object.entries(ingredients)){
  for(const alias of[norm(ing[0]),...(aliases[id]||[]),...(EN_ALIASES[id]||[]).map(norm),...(extraAliases[id]||[]).map(norm)]){
   if(!alias||alias.length<3)continue;
   if(n.includes(' '+alias+' ')){const at=alias.split(' ').length,s=alias.length+(n.trim()===alias?100:0);if(s>score){score=s;best=id;cover=at/nt}}
  }
 }
 if(!best)return{match:'',confidence:'unknown'};
 return{match:best,confidence:score>=100||cover>=0.6?'high':'suggested'};
}
// Key(s) for the family's confirmed mapping: retailer + item code when printed, and retailer + name.
function memoryKeys(item,retailer){if(item.generic)return[];const r=norm(retailer||'any')||'any',out=[];if(item.code)out.push('receipt '+r+' c '+item.code);const n=norm(item.name||item.label);if(n)out.push('receipt '+r+' n '+n);return out}

// Canonical quantity of one line (g / ml / each) — only from what is printed, else null.
function lineQuantity(item){
 if(item.weight)return{qty:round(item.weight.qty*1000,3),unit:'g'};
 const count=item.multi?item.multi.count:1;
 if(item.size){const u=item.size.unit,q=item.size.qty*count;return u==='kg'?{qty:round(q*1000,3),unit:'g'}:u==='l'?{qty:round(q*1000,3),unit:'ml'}:u==='pk'?null:{qty:round(q,3),unit:u}}
 if(item.each)return{qty:count,unit:'each'};
 return null;
}

// ---------------------------------------------------------------- duplicate receipts
// Fingerprint from non-sensitive printed data; the transaction number is only kept as a salted hash.
function fingerprint(r){return{retailer:r.retailer||null,store:r.store||'',storeNo:r.storeNo||null,date:r.date||null,time:r.time||null,total:r.printedTotal!=null?round(r.printedTotal):r.total!=null?round(r.total):null,count:r.printedCount!=null?Math.abs(r.printedCount):null}}
async function sha256Hex(text){const c=root.crypto?.subtle;if(!c)return null;const d=await c.digest('SHA-256',new TextEncoder().encode(text));return[...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,'0')).join('')}
// A stable key for "this exact printed receipt": salted hash of the transaction number, or of the
// printed retailer/store/date/time/total when no transaction number was read. Null when too little.
async function receiptKey(parsed,salt){
 const fp=fingerprint(parsed);
 if(parsed.txRaw)return(await sha256Hex('bep-receipt|'+salt+'|tx|'+(fp.retailer||'')+'|'+parsed.txRaw))?.slice(0,32)||null;
 if(fp.date&&fp.time&&fp.total!=null)return(await sha256Hex('bep-receipt|'+salt+'|fp|'+[fp.retailer,norm(fp.store),fp.storeNo,fp.date,fp.time,fp.total.toFixed(2)].join('|')))?.slice(0,32)||null;
 return null;
}
function sameStore(a,b){const x=norm(a),y=norm(b);if(!x||!y)return false;return x===y||x.length>=4&&y.length>=4&&(x.includes(y)||y.includes(x))}
// cand: {id,store,retailer,date,time,total,count,receiptKey}; saved: family receipts.
// Returns {kind:'exact'|'near'|null, match} — never drops or merges anything itself.
function findDuplicate(cand,saved){
 let near=null;
 for(const r of saved||[]){
  if(!r||r.id===cand.id)continue;
  if(cand.receiptKey&&r.receiptKey&&cand.receiptKey===r.receiptKey)return{kind:'exact',match:r};
  const total=r.total!=null&&cand.total!=null&&Math.abs(+r.total-+cand.total)<0.005;
  if(!total||r.date!==cand.date||!sameStore(r.store,cand.store))continue;
  const rt=r.printed?.time||null,ct=cand.time||null,rc=r.printed?.count??null,cc=cand.count??null;
  if(rt&&ct&&rt===ct&&(rc==null||cc==null||rc===cc))return{kind:'exact',match:r};
  if(!near)near=r;
 }
 return near?{kind:'near',match:near}:{kind:null,match:null};
}

// ---------------------------------------------------------------- reconciliation maths
// lines: [{ingredient, quantity (canonical g/ml/quả), label}]; needOf(id) → amount still needed this
// week (null/0 when not on the list). Returns one row per ingredient: bought, need, covered, extra, short.
function reconcile(lines,needOf){
 const groups=new Map();
 for(const l of lines||[]){if(!l.ingredient||!(l.quantity>0))continue;const g=groups.get(l.ingredient)||{ingredient:l.ingredient,parts:[],bought:0};g.parts.push(round(l.quantity,3));g.bought=round(g.bought+l.quantity,3);groups.set(l.ingredient,g)}
 return[...groups.values()].map(g=>{const need=Math.max(0,+(needOf(g.ingredient)||0));const covered=round(Math.min(g.bought,need),3),extra=round(g.bought-covered,3),short=round(Math.max(0,need-g.bought),3);
  return{...g,need,covered,extra,short,status:need<=0?'extra':short>0?'short':extra>0?'enough-extra':'enough',same:g.parts.length>1&&g.parts.every(p=>p===g.parts[0])}});
}
// ---------------------------------------------------------------- image preprocessing (pure)
// img = {width,height,data:RGBA}. Returns {width,height,gray:Uint8ClampedArray(0|255), info}.
function toGray(img){const{width:w,height:h,data}=img,g=new Float32Array(w*h),sat=new Float32Array(w*h);for(let i=0,p=0;i<w*h;i++,p+=4){const r=data[p],gg=data[p+1],b=data[p+2],mx=Math.max(r,gg,b),mn=Math.min(r,gg,b);g[i]=0.299*r+0.587*gg+0.114*b;sat[i]=mx?(mx-mn)/mx:0}return{g,sat}}
function otsu(values,step=1){const hist=new Float64Array(256);let n=0;for(let i=0;i<values.length;i+=step){hist[Math.max(0,Math.min(255,values[i]|0))]++;n++}let sum=0;for(let t=0;t<256;t++)sum+=t*hist[t];let sb=0,wb=0,best=0,th=128;for(let t=0;t<256;t++){wb+=hist[t];if(!wb)continue;const wf=n-wb;if(!wf)break;sb+=t*hist[t];const mb=sb/wb,mf=(sum-sb)/wf,v=wb*wf*(mb-mf)**2;if(v>best){best=v;th=t}}return th}
// Paper region: bright, unsaturated blocks. Returns per-row [left,right] in pixels (or null rows).
function paperExtents(g,sat,w,h){
 const B=Math.max(4,Math.round(Math.max(w,h)/160)),gw=Math.ceil(w/B),gh=Math.ceil(h/B);
 const lumT=otsu(g,7);
 const cell=new Uint8Array(gw*gh);
 for(let gy=0;gy<gh;gy++)for(let gx=0;gx<gw;gx++){let paper=0,n=0;for(let y=gy*B;y<Math.min(h,gy*B+B);y+=2)for(let x=gx*B;x<Math.min(w,gx*B+B);x+=2){const i=y*w+x;n++;if(sat[i]<0.28&&g[i]>=Math.min(lumT,170)*0.9)paper++}cell[gy*gw+gx]=paper/n>0.45?1:0}
 // close small holes (text) horizontally
 const rows=[];for(let gy=0;gy<gh;gy++){let bestL=-1,bestR=-1,len=0,start=0,gap=0;for(let gx=0;gx<=gw;gx++){const v=gx<gw&&cell[gy*gw+gx];if(v){if(!len)start=gx;len=gx-start+1;gap=0}else if(len&&gap<2&&gx<gw){gap++;continue}else{if(len>bestR-bestL+1||bestL<0){if(len){bestL=start;bestR=start+len-1}}len=0;gap=0}}rows.push(bestL<0?null:[bestL,bestR])}
 const widths=rows.map(r=>r?r[1]-r[0]+1:0),maxW=Math.max(...widths);
 const keep=rows.map(r=>r&&(r[1]-r[0]+1)>=maxW*0.35?r:null);
 const ys=keep.map((r,i)=>r?i:-1).filter(i=>i>=0);if(!ys.length)return null;
 // smooth edges with a running median over 7 grid rows
 const med=a=>a.slice().sort((x,y)=>x-y)[a.length>>1];
 const out=new Array(h).fill(null);
 for(let gy=ys[0];gy<=ys[ys.length-1];gy++){const win=[];for(let k=gy-3;k<=gy+3;k++)if(keep[k])win.push(keep[k]);if(!win.length)continue;const L=med(win.map(r=>r[0]))*B,R=(med(win.map(r=>r[1]))+1)*B;for(let y=gy*B;y<Math.min(h,gy*B+B);y++)out[y]=[L,Math.min(w,R)]}
 return{rows:out,top:ys[0]*B,bottom:Math.min(h,(ys[ys.length-1]+1)*B),coverage:ys.length/gh,fullWidth:maxW>=gw-1};
}
// Background estimate by block maximum (text is dark, paper bright), smoothed → divide.
function flatten(g,w,h,block){
 const bw=Math.ceil(w/block),bh=Math.ceil(h/block),bg=new Float32Array(bw*bh);
 for(let by=0;by<bh;by++)for(let bx=0;bx<bw;bx++){const vals=[];const st=Math.max(2,block>>3);for(let y=by*block;y<Math.min(h,by*block+block);y+=st)for(let x=bx*block;x<Math.min(w,bx*block+block);x+=st)vals.push(g[y*w+x]);vals.sort((a,b)=>a-b);bg[by*bw+bx]=vals[Math.floor(vals.length*0.9)]||255}
 // 3x3 max then 3x3 mean on the grid
 const mx=new Float32Array(bw*bh);for(let y=0;y<bh;y++)for(let x=0;x<bw;x++){let m=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const yy=y+dy,xx=x+dx;if(yy>=0&&yy<bh&&xx>=0&&xx<bw)m=Math.max(m,bg[yy*bw+xx])}mx[y*bw+x]=m}
 const sm=new Float32Array(bw*bh);for(let y=0;y<bh;y++)for(let x=0;x<bw;x++){let s=0,n=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const yy=y+dy,xx=x+dx;if(yy>=0&&yy<bh&&xx>=0&&xx<bw){s+=mx[yy*bw+xx];n++}}sm[y*bw+x]=s/n}
 const out=new Float32Array(w*h),X0=new Int32Array(w),X1=new Int32Array(w),TX=new Float32Array(w),row=new Float32Array(w);
 for(let x=0;x<w;x++){const fx=Math.min(Math.max(0,bw-1.001),Math.max(0,x/block-0.5)),x0=fx|0;X0[x]=x0;X1[x]=Math.min(bw-1,x0+1);TX[x]=fx-x0}
 for(let y=0;y<h;y++){const fy=Math.min(Math.max(0,bh-1.001),Math.max(0,y/block-0.5)),y0=fy|0,y1=Math.min(bh-1,y0+1),ty=fy-y0,r0=y0*bw,r1=y1*bw,o=y*w;
  for(let x=0;x<w;x++){const tx=TX[x],a=sm[r0+X0[x]],b=sm[r0+X1[x]],c=sm[r1+X0[x]],d=sm[r1+X1[x]];const bgv=(a+(b-a)*tx)*(1-ty)+(c+(d-c)*tx)*ty;const v=g[o+x]/(bgv>40?bgv:40)*255;out[o+x]=v>255?255:v}}
 return out;
}
// Sharpness of the horizontal projection when the band is sheared by slope t (on a small copy).
function shearScore(bin,w,h,y0,y1,t){const cx=w/2,off=Math.ceil(Math.abs(t)*w/2)+2,rows=new Float64Array(y1-y0+2*off+2);for(let y=y0;y<y1;y++){const r=y*w;for(let x=0;x<w;x++){if(!bin[r+x])continue;const yy=Math.round(y-y0+(x-cx)*t)+off;rows[yy]++}}let s=0;for(let i=1;i<rows.length;i++){const d=rows[i]-rows[i-1];s+=d*d}return s}
function bestSlope(bin,w,h,y0,y1,center,range,step){let best=center,bs=-1;for(let a=-range;a<=range+1e-9;a+=step){const t=center+Math.tan(a*Math.PI/180),s=shearScore(bin,w,h,y0,y1,t);if(s>bs){bs=s;best=t}}return{t:best,score:bs}}
function estimateSlopes(bin,w,h,bands){
 // work on a 1/3 copy for speed
 const k=3,sw=Math.floor(w/k),sh=Math.floor(h/k),small=new Uint8Array(sw*sh);
 for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){let v=0;for(let dy=0;dy<k;dy++)for(let dx=0;dx<k;dx++)v+=bin[(y*k+dy)*w+x*k+dx];small[y*sw+x]=v>=3?1:0}
 // drop solid blobs (fingers, thumbs, table edges): 16x16 cells denser than 40% ink are not text
 const C=16;for(let cy=0;cy<sh;cy+=C)for(let cx=0;cx<sw;cx+=C){let n=0,ink=0;for(let y=cy;y<Math.min(sh,cy+C);y++)for(let x=cx;x<Math.min(sw,cx+C);x++){n++;ink+=small[y*sw+x]}if(ink/n>0.4)for(let y=cy;y<Math.min(sh,cy+C);y++)for(let x=cx;x<Math.min(sw,cx+C);x++)small[y*sw+x]=0}
 const g=bestSlope(small,sw,sh,0,sh,0,5,0.25);const global=bestSlope(small,sw,sh,0,sh,g.t,0.25,0.05).t;
 const span=Math.ceil(sh/bands),out=[];
 for(let b=0;b<bands;b++){const y0=b*span,y1=Math.min(sh,y0+span);let ink=0;for(let i=y0*sw;i<y1*sw;i++)ink+=small[i];
  if(ink<sw*(y1-y0)*0.01){out.push({y:(y0+y1)/2*k,t:global,ink:0});continue}
  const c=bestSlope(small,sw,sh,y0,y1,global,1,0.25);const f=bestSlope(small,sw,sh,y0,y1,c.t,0.2,0.05);out.push({y:(y0+y1)/2*k,t:f.t,ink})}
 // 3-point median smoothing so one sparse band cannot flip the angle
 const ts=out.map(o=>o.t);for(let i=0;i<out.length;i++){const win=[ts[i-1],ts[i],ts[i+1]].filter(v=>v!==undefined).sort((a,b)=>a-b);out[i].t=win.length===3?win[1]:ts[i]}
 // neighbouring bands may differ by at most 0.4° (paper bends smoothly)
 const lim=Math.tan(0.4*Math.PI/180);for(let i=1;i<out.length;i++)out[i].t=Math.max(out[i-1].t-lim,Math.min(out[i-1].t+lim,out[i].t));
 out.global=global;return out;
}
// Vertical warp field: in each horizontal band, the row-ink profile of every vertical strip is
// aligned with its neighbour (cross-correlation, small shifts only), giving how far text lines
// in that strip sit above/below the centre strip. Smooth, bounded, interpolated over x and y.
function warpField(bin,W,H,{strips=12,bandH=200,maxShift=null}={}){
 const sw=Math.floor(W/strips),R=maxShift??Math.max(6,Math.round(W/110)),nb=Math.max(1,Math.round(H/bandH)),bh=H/nb;
 const grid=[];let maxAbs=0;
 for(let b=0;b<nb;b++){const y0=Math.floor(b*bh),y1=Math.min(H,Math.floor((b+1)*bh));const prof=[],ink=[];
  for(let s=0;s<strips;s++){const p=new Float32Array(y1-y0);let n=0;for(let y=y0;y<y1;y++){let c=0;const r=y*W+s*sw;for(let x=0;x<sw;x++)c+=bin[r+x];p[y-y0]=c;n+=c}prof.push(p);ink.push(n)}
  const enough=ink.map(n=>n>sw*(y1-y0)*0.015);
  const d=new Float32Array(strips);// d[s] = shift of strip s relative to strip s-1
  for(let s=1;s<strips;s++){if(!enough[s]||!enough[s-1])continue;let best=0,bv=-1;const A=prof[s-1],B=prof[s];for(let k=-R;k<=R;k++){let v=0;for(let y=R;y<A.length-R;y++)v+=A[y]*B[y+k];if(v>bv){bv=v;best=k}}d[s]=best}
  const c=Math.floor(strips/2);const off=new Float32Array(strips);
  for(let s=c+1;s<strips;s++)off[s]=off[s-1]+d[s];for(let s=c-1;s>=0;s--)off[s]=off[s+1]-d[s+1];
  grid.push({y:(y0+y1)/2,off,ok:enough.filter(Boolean).length>=strips/3})}
 // bands without enough text copy their neighbours; then 3-band median per strip
 for(let b=0;b<grid.length;b++)if(!grid[b].ok){const n=grid.slice(0,b).reverse().find(g=>g.ok)||grid.slice(b+1).find(g=>g.ok);grid[b].off=n?Float32Array.from(n.off):new Float32Array(strips)}
 const sm=grid.map((g,b)=>{const o=new Float32Array(strips);for(let s=0;s<strips;s++){const v=[grid[b-1]?.off[s],g.off[s],grid[b+1]?.off[s]].filter(x=>x!==undefined).sort((a,b)=>a-b);o[s]=v[v.length>>1]}return o});
 for(const o of sm)for(const v of o)maxAbs=Math.max(maxAbs,Math.abs(v));
 // offsets for a whole row (x = 0..W-1), interpolated between strips and bands
 const S0=new Int32Array(W),TXs=new Float32Array(W);for(let x=0;x<W;x++){const fx=Math.max(0,Math.min(strips-1,(x-sw/2)/sw)),s0=Math.min(strips-2,Math.floor(fx));S0[x]=Math.max(0,s0);TXs[x]=strips>1?fx-S0[x]:0}
 const vals=new Float32Array(strips),outRow=new Float32Array(W);
 const row=y=>{let b0=0;while(b0<grid.length-1&&grid[b0+1].y<y)b0++;const b1=Math.min(grid.length-1,b0+1),ty=b1===b0?0:Math.max(0,Math.min(1,(y-grid[b0].y)/(grid[b1].y-grid[b0].y)));
  for(let k=0;k<strips;k++)vals[k]=sm[b0][k]*(1-ty)+sm[b1][k]*ty;
  if(strips<2){outRow.fill(vals[0]);return outRow}for(let x=0;x<W;x++){const k=S0[x],t=TXs[x];outRow[x]=vals[k]+(vals[k+1]-vals[k])*t}return outRow};
 const at=(x,y)=>{const fx=Math.max(0,Math.min(strips-1,(x-sw/2)/sw)),s0=Math.min(strips-2,Math.floor(fx)),tx=strips>1?fx-s0:0;
  let b0=0;while(b0<grid.length-1&&grid[b0+1].y<y)b0++;const b1=Math.min(grid.length-1,b0+1),ty=b1===b0?0:Math.max(0,Math.min(1,(y-grid[b0].y)/(grid[b1].y-grid[b0].y)));
  const v=o=>strips>1?o[s0]*(1-tx)+o[s0+1]*tx:o[0];return v(sm[b0])*(1-ty)+v(sm[b1])*ty};
 return{at,row,maxAbs,grid:sm};
}
function preprocess(img,{maxSide=4600,targetWidth=1500,bands=14,mode='gray'}={}){const clock=Date.now(),lap=()=>Date.now()-clock;
 let{width:w,height:h}=img;const info={input:[w,h]};
 const{g,sat}=toGray(img);
 // 1. paper crop
 const paper=paperExtents(g,sat,w,h);let x0=0,x1=w,y0=0,y1=h;
 if(paper&&paper.coverage>0.2&&!paper.fullWidth){const ls=paper.rows.filter(Boolean);x0=Math.max(0,Math.min(...ls.map(r=>r[0])));x1=Math.min(w,Math.max(...ls.map(r=>r[1])));y0=paper.top;y1=paper.bottom;info.crop=[x0,y0,x1-x0,y1-y0]}
 const cw=x1-x0,ch=y1-y0;
 // 2. scale so the paper is ~targetWidth wide (upscales small text, downsizes huge photos)
 const scale=Math.min(maxSide/Math.max(cw,ch),Math.max(1,targetWidth/cw)*(cw>targetWidth*1.4?targetWidth/cw/Math.max(1,targetWidth/cw):1));
 const s=Math.max(0.5,Math.min(3,cw*scale<900?900/cw:scale));
 const W=Math.round(cw*s),H=Math.round(ch*s);info.scale=round(s,3);
 const G=new Float32Array(W*H);
 const SX=new Float32Array(W),XI=new Int32Array(W),TXr=new Float32Array(W);for(let x=0;x<W;x++){const sx=x0+(x+0.5)/s-0.5,xi=Math.max(0,Math.min(w-2,sx|0));SX[x]=sx;XI[x]=xi;TXr[x]=Math.max(0,Math.min(1,sx-xi))}
 for(let y=0;y<H;y++){const sy=y0+(y+0.5)/s-0.5,yi=Math.max(0,Math.min(h-2,sy|0)),ty=Math.max(0,Math.min(1,sy-yi));const ext=paper&&paper.rows[Math.min(h-1,Math.round(y0+y/s))];const r0=yi*w,r1=r0+w,o=y*W,crop=!!info.crop,L=ext?ext[0]+2:0,R=ext?ext[1]-2:0;
  for(let x=0;x<W;x++){const sx=SX[x];
   if(crop&&(!ext||sx<L||sx>R)){G[o+x]=-1;continue}
   const xi=XI[x],tx=TXr[x],a=g[r0+xi],b=g[r0+xi+1],c=g[r1+xi],d=g[r1+xi+1];G[o+x]=(a+(b-a)*tx)*(1-ty)+(c+(d-c)*tx)*ty}}
 // fill outside-paper with the local paper colour so it doesn't create edges
 for(let i=0;i<G.length;i++)if(G[i]<0)G[i]=230;
 // 3. flatten shadows and threshold
 const block=Math.max(16,Math.round(W/28));
 const F=flatten(G,W,H,block);info.msFlatten=lap();
 const T=Math.min(200,Math.max(120,otsu(F,3)+12));
 const bin=new Uint8Array(W*H);for(let i=0;i<F.length;i++)bin[i]=F[i]<T?1:0;
 // 4. straighten: global deskew, then a smooth vertical warp field (curl / perspective)
 const slopes=estimateSlopes(bin,W,H,1);const t0=slopes.global;info.global=round(Math.atan(t0)*180/Math.PI,2);info.msSlopes=lap();
 const cx=W/2,sheared=new Uint8Array(W*H);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const sy=Math.round(y-(x-cx)*t0);if(sy>=0&&sy<H)sheared[y*W+x]=bin[sy*W+x]}
 const field=bands>1?warpField(sheared,W,H,{strips:12,bandH:Math.max(160,Math.round(W/7))}):null;info.warp=field?field.maxAbs:0;
 const out=new Uint8ClampedArray(W*H).fill(255);
 const lo=T*0.55,span=255-lo,gray=mode==='gray';
 for(let y=0;y<H;y++){const offs=field?field.row(y):null,o=y*W;for(let x=0;x<W;x++){const fy=y+(offs?offs[x]:0)-(x-cx)*t0,sy=Math.floor(fy),f=fy-sy;if(sy<0||sy>=H-1)continue;const i=sy*W+x,v=F[i]*(1-f)+F[i+W]*f;out[o+x]=gray?(v<=lo?0:v>=255?255:(v-lo)/span*255):v<T?0:255}}
 // 5a. remove long vertical strokes (paper edges, folds): runs taller than 4 text lines
 const maxRun=Math.round(W/12);for(let x=0;x<W;x++){let run=0;for(let y=0;y<=H;y++){const ink=y<H&&out[y*W+x]<T*0.7;if(ink)run++;else{if(run>maxRun)for(let k=y-run;k<y;k++)out[k*W+x]=255;run=0}}}
 // 5. remove isolated specks (single pixels) – keeps punctuation that has 2+ neighbours
 const clean=new Uint8ClampedArray(out);for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){const i=y*W+x;if(mode==='gray'||out[i])continue;let nb=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if((dy||dx)&&!out[i+dy*W+dx])nb++;if(nb===0)clean[i]=255}
 info.size=[W,H];info.threshold=T;info.ms=lap();
 return{width:W,height:H,gray:clean,info};
}

// Character accuracy (1 - edit distance / reference length), lines compared as one text.
function charAccuracy(ocr,truth){
 const a=String(ocr).replace(/\s+/g,' ').trim(),b=String(truth).replace(/\s+/g,' ').trim();if(!b.length)return 0;
 let prev=new Uint32Array(b.length+1),cur=new Uint32Array(b.length+1);for(let j=0;j<=b.length;j++)prev[j]=j;
 for(let i=1;i<=a.length;i++){cur[0]=i;for(let j=1;j<=b.length;j++)cur[j]=Math.min(prev[j]+1,cur[j-1]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));[prev,cur]=[cur,prev]}
 return round(Math.max(0,1-prev[b.length]/b.length),4);
}

// ---------------------------------------------------------------- browser part
// Decodes a File/Blob, prepares it and returns a canvas for Tesseract (or the original file
// when canvas is unavailable). Everything runs on the device.
async function prepareImage(file){
 if(typeof document==='undefined'||typeof createImageBitmap!=='function')return{image:file,info:null};
 const bmp=await createImageBitmap(file);
 const maxIn=2400,k=Math.min(1,maxIn/Math.max(bmp.width,bmp.height));
 const c=document.createElement('canvas');c.width=Math.round(bmp.width*k);c.height=Math.round(bmp.height*k);
 const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(bmp,0,0,c.width,c.height);bmp.close?.();
 const data=ctx.getImageData(0,0,c.width,c.height);
 const p=preprocess(data);
 const o=document.createElement('canvas');o.width=p.width;o.height=p.height;const octx=o.getContext('2d');const id=octx.createImageData(p.width,p.height);
 for(let i=0,q=0;i<p.gray.length;i++,q+=4){const v=p.gray[i];id.data[q]=id.data[q+1]=id.data[q+2]=v;id.data[q+3]=255}
 octx.putImageData(id,0,0);
 return{image:o,info:p.info};
}

// Full OCR on the device: prepared image + receipt-friendly settings (single text block, keep
// spacing). Falls back to the plain photo when the prepared image reads worse (fewer priced lines).
// The caller loads Tesseract first (loadOCR); createWorker may be injected for tests.
async function recognize(file,{lang='eng',status=null,createWorker=null,original=false}={}){
 const T=root.Tesseract;const make=createWorker||(T&&T.createWorker.bind(T));if(!make)throw Error('OCR not loaded');
 let worker=null;
 try{
  worker=await make(lang,1,{logger:info=>{try{status&&status(info)}catch{}}});
  await worker.setParameters({tessedit_pageseg_mode:'6',preserve_interword_spaces:'1',user_defined_dpi:'300'});
  let prepared={image:file,info:null};try{prepared=await prepareImage(file)}catch{}
  const first=await worker.recognize(prepared.image);
  let text=first.data.text||'',confidence=first.data.confidence||0,used=prepared.info?'prepared':'original',originalText=null;
  const score=readScore;
  if(prepared.info&&(original||score(text)<3)){await worker.setParameters({tessedit_pageseg_mode:original?'3':'6'});const second=await worker.recognize(file);originalText=second.data.text||'';if(!original&&preferOther(text,originalText)){text=originalText;confidence=second.data.confidence||0;used='original'}}
  return{text,confidence,used,info:prepared.info,originalText};
 }finally{if(worker)try{await worker.terminate()}catch{}}
}

const api={genericLabel,GENERIC_WORDS,readScore,preferOther,RETAILERS,ABBREVIATIONS,EN_ALIASES,KNOWN_WORDS,addWords,detectRetailer,detectCurrency,expandAbbrev,splitGlued,isSnack,isNonFood,extractSize,repairNumber,plausible,tidy,cleanLabel,priceOf,clippedPrice,parseReceipt,warningsFor,warningText,looksLikeReceipt,differenceNote,redact,isSensitive,matchIngredient,memoryKeys,lineQuantity,fingerprint,receiptKey,sha256Hex,findDuplicate,sameStore,reconcile,findDate,preprocess,toGray,otsu,charAccuracy,prepareImage,recognize,norm,warpField};
root.ReceiptParse=api;
})(globalThis);
