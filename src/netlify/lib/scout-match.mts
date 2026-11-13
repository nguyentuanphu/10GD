// v1.7.2 product → catalogue item matching for Price Check facts (owner: “auto runs never ask”).
// A retailer product name is attached to a catalogue item ONLY with high confidence:
// every word of one of the item's names (VI/EN/aliases/synonyms) is in the product name, and none
// of the "variant" words (smoked, canned, cat food, chips, …) appears unless that item IS the variant.
// Anything else stays unplaced ("Chưa gắn món") — never guessed. Pure functions, no I/O.
//
// v1.7.21 (Henry, 14 Nov 2026: “Rất nhiều chỗ bị so giá sai … Kiểm tra lại cách thức ghép”): containing the item's
// words is not enough. Online prices showed Lemon → “Lemon & Pepper Tuna”, Salt → “Salt Reduced Spreadable Butter”,
// Gravy beef → “Beef And Gravy Puff Pastry Parcel”, Lime → “Lime & Chilli Tuna”. For food items the product's KIND
// must be the item:
//  1. head noun — the product's head (its last kind word, or a dominant form word such as sauce/stock/parcel/bread,
//     before “with/in/from/per/for”; a trailing list “Carrot Peas & Corn” is contents, not the head) must be one of the
//     item's own words;
//  2. compound — the word right before the head may not name a food of another department (almond milk is not milk,
//     banana prawns are named as such in SYNONYMS);
//  3. modifier — an item word next to reduced/free/flavour(ed)/infused/style (“Salt Reduced”, “Sugar Free”) is a
//     modifier, not the product;
//  4. department forms — fresh produce is not ground/dried/crystallised/pickled/frozen/“with …”; raw meat and seafood
//     are not cooked/roasted/BBQ/deli/crumbed/offal; anything is not a ready meal (parcel, pastry, pie, kebab, bowl, …).
// When several items fit, the one naming more words wins, then the one whose words reach the head (rightmost).
import masterCatalog from '../../data/master-catalog.json' with {type:'json'};

export type MatchItem={itemId:string,names:string[],exclude?:string[],nameVi?:string,nameEn?:string,category?:string};
/** Words that turn a product into a different thing from the plain ingredient. */
export const VARIANT_WORDS=['smoked','canned','tinned','tin','can','cat','kitten','dog','puppy','pet','treat','treats','flavour','flavoured','flavored','chips','crisps','crackers','cracker','oil','jerky','dip','spread','pate','sushi','snack','snacks','seasoning','stock','soup','baby','infant','supplement','capsules','vitamin','shampoo','wipes','candle','toy',
 // v1.7.5: false matches seen in a live run of the national online price providers (5 Nov 2026)
 'microwave','cups','cleaner','pod','pods','mash','tea','drink','drinks','juice','marinated','brine','kit','sauce','paste','powder','flour','cooked','conditioner','hydralyte','liquid','lozenges','soap',
 // v1.7.21: ready meals, other product kinds and toiletries seen in the live online prices (14 Nov 2026); singular (stemmed) forms
 'parcel','pastry','pie','kebab','skewer','bowl','papadam','pappadum','poppadom','pouch','infusion','herbal','burger','patty','schnitzel','kiev','nugget','biscuit','cookie','muffin','cereal','muesli','granola','pizza','sandwich','spreadable','springwater','cistern','baked','body','shower','lotion','moisturiser','moisturizer'];
/** Variant words that belong together: an item named with one of them (canned tuna, roast chicken) accepts the others. */
const FAMILIES=[['canned','tinned','tin','can','springwater','brine'],['cooked','roasted','roast','bbq','barbecue','rotisserie','deli']];
/** Department forms (rule 4): words that make a product a different thing for items of these departments only. */
const DEPT_VARIANTS:Record<string,string[]>={
 fresh:['ground','dried','dry','crystallised','crystalised','crystallized','candied','pickled','minced','crushed','puree','frozen','with','yoghurt','yogurt','jam','salsa','chutney','relish','pesto','smoothie','pouch'],
 meat:['roasted','bbq','barbecue','rotisserie','deli','crumbed','seasoned','kidney','liver','heart','tongue','tripe','offal','sausage','frankfurt','frankfurter','bacon','ham','salami','nugget'],
 seafood:['roasted','bbq','deli','crumbed','battered','seasoned','nugget','finger','cake','ball']};
/** Departments whose products are food (rules 1–4 apply). Household and personal items keep the plain word match. */
const FOOD=new Set(['fresh','meat','seafood','pantry','dairy','bakery','frozen']);
/** Item-specific extra names and exclusions (small, reviewed table; ids from data/master-catalog.json). */
export const SYNONYMS:Record<string,{names?:string[],exclude?:string[]}>={
 'ca-hoi':{names:['salmon fillet','salmon fillets','salmon portion','salmon portions','atlantic salmon'],exclude:['pink salmon','red salmon','salmon roe','caviar']},
 'hung-que':{exclude:['sweet chilli','stir fry']},
 'dau-an':{exclude:['coconut']},
 // v1.7.21: “Chinese broccoli” is gai lan, a different vegetable; banana prawns are a prawn, not a banana
 'bong-cai':{exclude:['chinese broccoli','gai lan']},
 'tom':{names:['banana prawns']},
 'tom-dong-lanh':{names:['banana prawns']},
};
/** Words that describe a product but never are its kind (adjectives, origins, cuts and pack words). */
const ADJ=new Set(['fresh','frozen','whole','raw','red','green','white','black','brown','sweet','mixed','mix','plain','full','light','baby','free','range','cage','dried','ground','roasted','sliced','thin','extra','virgin','short','large','small','mini','organic','australian','cooking','instant','soft','regular','natural','unsalted','sweetened','canned','tinned','premium','thawed','fat','reduced','lean','boneless','skinless','approved','rspca','value','big','medium','hot','mild','asian','thai','chinese','vietnamese','lebanese','greek','tasty','grated','shredded','chopped','diced','washed','loose','rolled','raw','added','hormone']);
/** Cut, piece and pack words: a head only when nothing else names the kind (Green Beans, Sesame Seeds). */
const NEUTRAL=new Set(['fillet','cutlet','portion','piece','strip','chunk','slice','bean','seed','bunch','pack','punnet','steak','roast','leaf','bag','head','stick','sheet','half','pk','bonein','skin']);
/** Product-form words that are the head wherever they stand (“Sauce Soy”, “Real Stock Beef”, “… Pastry Parcel”). */
const DOMINANT=new Set(['stock','sauce','paste','powder','soup','juice','bread','noodle','yoghurt','yogurt','parcel','pastry','pie','kebab','skewer','bowl','papadam','pappadum','poppadom','pouch','infusion','burger','patty','schnitzel','kiev','nugget','biscuit','cookie','muffin','cereal','muesli','granola','pizza','sandwich','spread','chip','crisp','cracker','dip','jerky','salad','wrap','sausage']);
const MODIFIER=new Set(['reduced','free','flavour','flavoured','flavored','infused','style','scented']);
const CUT=new Set(['with','in','from','per','for']);
const BRAND=/\b(woolworths|coles|aldi|macro|community co|essentials|simply|select|finest|specially selected)\b/g;
export function norm(s:any){return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d').replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').replace(BRAND,' ').replace(/\b(bone|skin) (in|on)\b/g,'$1in').replace(/\s+/g,' ').trim()}
const stem=(w:string)=>w.length>3&&w.endsWith('ies')?w.slice(0,-3)+'y':w.length>3&&w.endsWith('es')&&/(ch|sh|x|o)es$/.test(w)?w.slice(0,-2):w.length>3&&w.endsWith('s')&&!w.endsWith('ss')?w.slice(0,-1):w;
const words=(s:string)=>norm(s).split(' ').filter(Boolean).map(stem);
const hasPhrase=(hay:string[],phrase:string[])=>{if(!phrase.length)return false;for(let i=0;i+phrase.length<=hay.length;i++)if(phrase.every((w,j)=>hay[i+j]===w))return true;return false};

let CACHE:MatchItem[]|null=null;
export function catalogItems():MatchItem[]{if(CACHE)return CACHE;CACHE=((masterCatalog as any)?.items||[]).filter((x:any)=>x&&typeof x.id==='string').map((x:any)=>({itemId:x.id,category:String(x.category||''),nameVi:String(x.nameVi||x.nameEn||x.id),nameEn:String(x.nameEn||x.nameVi||x.id),names:[x.nameEn,x.nameVi,...(x.aliases||[]),...(SYNONYMS[x.id]?.names||[])].filter(Boolean).map(String),exclude:SYNONYMS[x.id]?.exclude||[]}));return CACHE}

// Kind words of the food departments (English names, aliases and synonyms): word → departments that use it.
let KIND:Map<string,Set<string>>|null=null;
function kinds(){if(KIND)return KIND;KIND=new Map();for(const x of ((masterCatalog as any)?.items||[])){if(!FOOD.has(x?.category))continue;for(const n of [x.nameEn,...(x.aliases||[]),...(SYNONYMS[x.id]?.names||[])])for(const w of words(String(n||''))){if(ADJ.has(w)||/\d/.test(w)||w.length<3)continue;if(!KIND.has(w))KIND.set(w,new Set());KIND.get(w)!.add(x.category)}}return KIND}
const isKind=(w:string)=>!ADJ.has(w)&&(DOMINANT.has(w)||kinds().has(w));
/** The product's head word index (rule 1), or -1 when nothing in the name names a kind. */
export function headIndex(product:string|string[]){const p=Array.isArray(product)?product:words(product);let end=p.length;
 for(let i=1;i<p.length;i++)if(CUT.has(p[i])&&p.slice(0,i).some(w=>isKind(w)&&!NEUTRAL.has(w))){end=i;break}
 const seg=p.slice(0,end);for(let i=seg.length-1;i>=0;i--)if(DOMINANT.has(seg[i]))return i;
 let h=-1;for(let i=seg.length-1;i>=0;i--)if(isKind(seg[i])&&!NEUTRAL.has(seg[i])){h=i;break}
 if(h<0){for(let i=seg.length-1;i>=0;i--)if(kinds().has(seg[i])){h=i;break}return h}
 // a trailing list “Vegetables Carrot Peas & Corn”: the head is the noun the list starts from
 if(h>=2&&seg[h-1]==='and'&&isKind(seg[h-2])){let k=h-2;while(k>0&&(seg[k-1]==='and'||isKind(seg[k-1])&&!NEUTRAL.has(seg[k-1])))k--;if(seg[k]!=='and')h=k}
 return h}

/** How well one item matches a product name: 0 (no), or the number of words of the best matching name. */
export function itemScore(product:string,item:MatchItem){const p=words(product);if(!p.length)return 0;
 const itemWords=new Set(item.names.flatMap(words));
 // An excluded phrase or a variant word that is not part of the item's own names → not this item.
 for(const ex of item.exclude||[])if(hasPhrase(p,words(ex)))return 0;
 const fam=(w:string)=>FAMILIES.some(f=>f.includes(w)&&f.some(x=>itemWords.has(x)));
 const food=FOOD.has(String(item.category||''));
 if(p.some(w=>VARIANT_WORDS.includes(w)&&!itemWords.has(w)&&!fam(w)))return 0;
 if(food)for(const w of DEPT_VARIANTS[String(item.category)]||[])if(p.includes(w)&&!itemWords.has(w)&&!fam(w))return 0;
 let best=0,bestNames:string[][]=[];for(const n of item.names){const nw=words(n);if(nw.length&&nw.every(w=>p.includes(w))){if(nw.length>best){best=nw.length;bestNames=[nw]}else if(nw.length===best)bestNames.push(nw)}}
 if(!best||!food)return best;
 // rule 3: an item word next to a modifier (“Salt Reduced”, “Sugar Free”, “Lemon Flavoured”) is not the product
 for(let i=0;i<p.length;i++)if(itemWords.has(p[i])&&!MODIFIER.has(p[i])&&(MODIFIER.has(p[i+1])&&!itemWords.has(p[i+1])&&!(p[i+1]==='free'&&p[i+2]==='range')||MODIFIER.has(p[i-1])&&!itemWords.has(p[i-1])&&p[i-1]!=='free'))return 0;
 // rule 1: the product's head must be one of the item's words
 const h=headIndex(p);if(h>=0&&!itemWords.has(p[h]))return 0;
 // rule 2: the word before the head may not be a food of another department (almond milk, garlic bread)
 if(h>0){const pre=p[h-1],dept=kinds().get(pre);if(dept&&!itemWords.has(pre)&&!NEUTRAL.has(pre)&&!dept.has(String(item.category)))return 0}
 return best}

/** Rightmost position of the item's matched words: the item that reaches the product's head wins a tie. */
function reach(product:string,item:MatchItem){const p=words(product);let r=-1;for(const n of item.names){const nw=words(n);if(nw.length&&nw.every(w=>p.includes(w)))for(const w of nw)r=Math.max(r,p.lastIndexOf(w))}return r}

/** Best catalogue item for a product name, only when unambiguous. {itemId, confidence:'high'|'low'|'none', candidates}. */
export function matchProduct(product:string,items:MatchItem[]=catalogItems()){
 const scored=items.map(it=>({itemId:it.itemId,score:itemScore(product,it),reach:0,it})).filter(x=>x.score>0);for(const s of scored)s.reach=reach(product,s.it);
 scored.sort((a,b)=>b.score-a.score||b.reach-a.reach||a.itemId.localeCompare(b.itemId));
 if(!scored.length)return{itemId:null,confidence:'none' as const,candidates:[] as string[]};
 const top=scored[0],tie=scored.length>1&&scored[1].score===top.score&&scored[1].reach===top.reach;
 return{itemId:tie?null:top.itemId,confidence:tie?'low' as const:'high' as const,candidates:scored.slice(0,5).map(x=>x.itemId)}}

/** Does this product confidently belong to THIS item (auto task on a search page)? */
export function productIsItem(product:string,itemId:string,items:MatchItem[]=catalogItems()){const it=items.find(x=>x.itemId===itemId);if(!it)return false;const s=itemScore(product,it);if(!s)return false;const m=matchProduct(product,items);if(m.itemId===itemId)return true;if(m.confidence!=='low'||!m.candidates.includes(itemId))return false;
 // a true tie (same number of words, reaching the same head) keeps both items, as before
 const top=items.find(x=>x.itemId===m.candidates[0])!;return itemScore(product,top)===s&&reach(product,top)===reach(product,it)}

/** For a fresh or meat item, a plain product (loose, per kg, each, bunch — no other kind words) is preferred. */
export function plainRank(product:string,itemId:string,items:MatchItem[]=catalogItems()){const it=items.find(x=>x.itemId===itemId);if(!it||!['fresh','meat','seafood'].includes(String(it.category)))return 0;const p=words(product),own=new Set(it.names.flatMap(words));
 const extra=p.filter(w=>isKind(w)&&!own.has(w)&&!NEUTRAL.has(w)).length;return /\b(loose|per kg|each|bunch|punnet)\b/.test(norm(product))||!extra?0:1}
