// v1.7.2 product → catalogue item matching for Price Check facts (owner: “auto runs never ask”).
// A retailer product name is attached to a catalogue item ONLY with high confidence:
// every word of one of the item's names (VI/EN/aliases/synonyms) is in the product name, and none
// of the "variant" words (smoked, canned, cat food, chips, …) appears unless that item IS the variant.
// Anything else stays unplaced ("Chưa gắn món") — never guessed. Pure functions, no I/O.
import masterCatalog from '../../data/master-catalog.json' with {type:'json'};

export type MatchItem={itemId:string,names:string[],exclude?:string[],nameVi?:string,nameEn?:string};
/** Words that turn a product into a different thing from the plain ingredient. */
export const VARIANT_WORDS=['smoked','canned','tinned','tin','can','cat','kitten','dog','puppy','pet','treat','treats','flavour','flavoured','flavored','chips','crisps','crackers','cracker','oil','jerky','dip','spread','pate','sushi','snack','snacks','seasoning','stock','soup','baby','infant','supplement','capsules','vitamin','shampoo','wipes','candle','toy',
 // v1.7.5: false matches seen in a live run of the national online price providers (5 Nov 2026)
 'microwave','cups','cleaner','pod','pods','mash','tea','drink','drinks','juice','marinated','brine','kit','sauce','paste','powder','flour','cooked','conditioner','hydralyte','liquid','lozenges','soap'];
/** Item-specific extra names and exclusions (small, reviewed table; ids from data/master-catalog.json). */
export const SYNONYMS:Record<string,{names?:string[],exclude?:string[]}>={
 'ca-hoi':{names:['salmon fillet','salmon fillets','salmon portion','salmon portions','atlantic salmon'],exclude:['pink salmon','red salmon','salmon roe','caviar']},
 'hung-que':{exclude:['sweet chilli','stir fry']},
 'dau-an':{exclude:['coconut']},
};
const BRAND=/\b(woolworths|coles|aldi|macro|community co|essentials|simply|select|finest|specially selected)\b/g;
export function norm(s:any){return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d').replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').replace(BRAND,' ').replace(/\s+/g,' ').trim()}
const stem=(w:string)=>w.length>3&&w.endsWith('ies')?w.slice(0,-3)+'y':w.length>3&&w.endsWith('es')&&/(ch|sh|x|o)es$/.test(w)?w.slice(0,-2):w.length>3&&w.endsWith('s')&&!w.endsWith('ss')?w.slice(0,-1):w;
const words=(s:string)=>norm(s).split(' ').filter(Boolean).map(stem);
const hasPhrase=(hay:string[],phrase:string[])=>{if(!phrase.length)return false;for(let i=0;i+phrase.length<=hay.length;i++)if(phrase.every((w,j)=>hay[i+j]===w))return true;return false};

let CACHE:MatchItem[]|null=null;
export function catalogItems():MatchItem[]{if(CACHE)return CACHE;CACHE=((masterCatalog as any)?.items||[]).filter((x:any)=>x&&typeof x.id==='string').map((x:any)=>({itemId:x.id,nameVi:String(x.nameVi||x.nameEn||x.id),nameEn:String(x.nameEn||x.nameVi||x.id),names:[x.nameEn,x.nameVi,...(x.aliases||[]),...(SYNONYMS[x.id]?.names||[])].filter(Boolean).map(String),exclude:SYNONYMS[x.id]?.exclude||[]}));return CACHE}

/** How well one item matches a product name: 0 (no), or the number of words of the best matching name. */
export function itemScore(product:string,item:MatchItem){const p=words(product);if(!p.length)return 0;
 const itemWords=new Set(item.names.flatMap(words));
 // An excluded phrase or a variant word that is not part of the item's own names → not this item.
 for(const ex of item.exclude||[])if(hasPhrase(p,words(ex)))return 0;
 if(p.some(w=>VARIANT_WORDS.includes(w)&&!itemWords.has(w)))return 0;
 let best=0;for(const n of item.names){const nw=words(n);if(nw.length&&nw.every(w=>p.includes(w)))best=Math.max(best,nw.length)}return best}

/** Best catalogue item for a product name, only when unambiguous. {itemId, confidence:'high'|'low'|'none', candidates}. */
export function matchProduct(product:string,items:MatchItem[]=catalogItems()){
 const scored=items.map(it=>({itemId:it.itemId,score:itemScore(product,it)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.itemId.localeCompare(b.itemId));
 if(!scored.length)return{itemId:null,confidence:'none' as const,candidates:[] as string[]};
 const top=scored[0],tie=scored.length>1&&scored[1].score===top.score;
 return{itemId:tie?null:top.itemId,confidence:tie?'low' as const:'high' as const,candidates:scored.slice(0,5).map(x=>x.itemId)}}

/** Does this product confidently belong to THIS item (auto task on a search page)? */
export function productIsItem(product:string,itemId:string,items:MatchItem[]=catalogItems()){const it=items.find(x=>x.itemId===itemId);if(!it||!itemScore(product,it))return false;const m=matchProduct(product,items);return m.itemId===itemId||m.confidence==='low'&&m.candidates.includes(itemId)&&itemScore(product,it)>=Math.max(...m.candidates.map(id=>itemScore(product,items.find(x=>x.itemId===id)!)))}
