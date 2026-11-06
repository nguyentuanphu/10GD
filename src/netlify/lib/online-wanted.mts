// v1.7.8 owner decision (6 Nov 2026, pop-up question): a family item with no catalogue match (e.g. "Thịt bò gravy") gets
// a "Tìm giá online" button; the family types or confirms the English supermarket name (e.g. "gravy beef"). Only that
// search word is stored here — no family, account or item name — and the next online run asks Pinch for it. The prices
// are shown to every family that searched the same word, and the owner can press "Sai món" or remove the word in Studio.
export const ONLINE_WANTED_KEY='online/wanted.json';
export const WANTED_MAX=50;
/** "Gravy  Beef!" → {query:'gravy beef', itemId:'w-gravy-beef'}; null when it is not a plain supermarket search word. */
export function wantedQuery(v:any){const q=String(v??'').normalize('NFKC').toLowerCase().replace(/[’']/g,"'").replace(/\s+/g,' ').trim();
 if(q.length<3||q.length>50||!/^[a-z0-9][a-z0-9 &'-]*$/.test(q)||!/[a-z]{3}/.test(q)||q.split(' ').length>6)return null;
 const slug=q.replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,50);return slug?{query:q,itemId:'w-'+slug}:null}
export function cleanWanted(v:any){const out:any={};const items=v?.items&&typeof v.items==='object'?v.items:{};
 for(const [id,x] of Object.entries(items).slice(0,WANTED_MAX*2) as any){const w=wantedQuery(x?.query);if(!w||w.itemId!==id)continue;out[id]={query:w.query,at:String(x.at||'').slice(0,30),n:Math.max(1,Math.min(100000,Math.round(+x.n||1)))}}
 return{version:1,items:out}}
export async function readWanted(cache:any){try{return cleanWanted(await cache.get(ONLINE_WANTED_KEY,{type:'json'}))}catch{return{version:1,items:{}}}}
/** Adds (or counts again) one search word. {itemId,query} or {error:'invalid'|'full'}. */
export async function addWanted(cache:any,raw:any,now=new Date()){const w=wantedQuery(raw);if(!w)return{error:'invalid'};const cur=await readWanted(cache);
 const have=cur.items[w.itemId];if(!have&&Object.keys(cur.items).length>=WANTED_MAX)return{error:'full'};
 cur.items[w.itemId]={query:w.query,at:have?.at||now.toISOString(),n:(have?.n||0)+1};await cache.setJSON(ONLINE_WANTED_KEY,cur);return w}
export async function removeWanted(cache:any,itemId:string){const cur=await readWanted(cache);if(!cur.items[itemId])return false;delete cur.items[itemId];await cache.setJSON(ONLINE_WANTED_KEY,cur);return true}
/** Catalogue-shaped items for the online run (searched at the three online supermarkets; no unit price basis). */
export function wantedItems(w:any){return Object.entries(w?.items||{}).map(([id,x]:any)=>({id,nameVi:x.query,nameEn:x.query,aliases:[],category:'wanted',channels:['woolworths','coles','aldi'],unitBasis:null,wanted:true}))}
