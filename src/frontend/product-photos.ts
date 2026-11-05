'use strict';
// v1.7.5 owner decision (AGENTS.md rule 19): ingredient and product pictures use the supermarket's product photo of the
// product the owner confirmed in Studio (Coles / ALDI / Woolworths / Harris Farm via Pinch or WhichGrocer). The photo
// sits on top of our own drawing, so offline, blocked or removed photos fall back to the drawing — never an emoji.
// The list is public catalogue data (no family data), fetched at most every 12 hours and kept on this device.
const PP_KEY='bep-product-photos-v1',PP_MAX_AGE=12*3600*1000;
let ppData:any=(()=>{try{const d=JSON.parse(localStorage.getItem(PP_KEY)||'null');return d&&d.items&&typeof d.items==='object'?d:null}catch{return null}})()||{at:0,items:{}};
const ppCatalog=()=>(globalThis as any).MASTER_CATALOG?.items||[];
function ppItemFor(key:string){if(!key)return null;const cat=ppCatalog();
 const byIng=cat.find((i:any)=>i.ingredientId===key);if(byIng)return byIng;
 const byId=cat.find((i:any)=>i.id===key);if(byId)return byId;
 const PS=(globalThis as any).PriceScout;if(PS?.matchCatalog){const m=PS.matchCatalog(String(key),cat,1)[0];if(m&&m.score>=0.6)return m.item}return null}
function productPhotoFor(key:string){const item=ppItemFor(key),p=item&&ppData.items[item.id];return p&&/^https:\/\//.test(p.photo)?{...p,itemId:item.id}:null}
function ppWrap(drawn:string,p:any){const src=String(p.photo).replace(/"/g,'%22');return`<span class="pp-wrap" data-photo-store="${String(p.retailer||'').replace(/[^a-z-]/g,'')}"><img class="pp-img" src="${src}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.remove()">${drawn}</span>`}
async function ppRefresh(force=false){if(!navigator.onLine||(globalThis as any).BEP_OFFLINE)return;if(!force&&Date.now()-(ppData.at||0)<PP_MAX_AGE)return;
 try{const r=await fetch('/.netlify/functions/grocery?op=photos',{cache:'no-store'});if(!r.ok)return;const d=await r.json();ppData={at:Date.now(),items:d&&typeof d.items==='object'?d.items:{}};try{localStorage.setItem(PP_KEY,JSON.stringify(ppData))}catch{}
  if(typeof render==='function'&&Object.keys(ppData.items).length)try{render()}catch{}}catch{}}
(function installProductPhotos(){const g:any=globalThis;if(g.__bepProductPhotos||typeof g.ingredientArtwork!=='function')return;g.__bepProductPhotos=true;const base=g.ingredientArtwork;
 g.ingredientArtwork=function(id:string){const drawn=base.apply(this,arguments as any),p=productPhotoFor(id);return p?ppWrap(drawn,p):drawn};
 setTimeout(()=>ppRefresh(),1500);addEventListener('online',()=>ppRefresh())})();
