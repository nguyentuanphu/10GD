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
 // an item with no ingredient drawing gets its own drawing (ui-art 'item:<id>') instead of the generic bag
 g.ingredientArtwork=function(id:string){let drawn=base.apply(this,arguments as any);const item=ppItemFor(id),own=item&&typeof g.uiArt==='function'?g.uiArt('item:'+item.id,'item-art'):'';if(own&&/ingredient-vector/.test(drawn))drawn=`<span class="ingredient-art ingredient-own" aria-hidden="true">${own}</span>`;const p=productPhotoFor(id);return p?ppWrap(drawn,p):drawn};
 setTimeout(()=>ppRefresh(),1500);addEventListener('online',()=>ppRefresh())})();
// v1.7.9 (owner, 6 Nov 2026: "ấn vào hình của ingredients thì hình phóng to lên để con biết món nào là món nào và nhìn ra sao"):
// on Đi chợ, a tap on an ingredient's picture opens it large with the name and, for a supermarket photo, its source.
// The name itself still opens the amounts (ingredient-detail). Pictures stay decorative; the sheet's words carry the meaning.
const PP_STORE_NAMES:any={coles:'Coles',aldi:'ALDI',woolworths:'Woolworths','harris-farm':'Harris Farm',harrisfarm:'Harris Farm'};
function ppZoom(pic:Element,id:string,name:string){const g:any=globalThis,t=(vi:string,en:string)=>typeof tr==='function'?tr(vi,en):typeof g.tr==='function'?g.tr(vi,en):vi;
 const big=pic.cloneNode(true) as HTMLElement;big.removeAttribute('style');big.classList.add('pic-zoom-art');const drawn=big.matches('.ingredient-art')?big:big.querySelector('.ingredient-art');if(drawn&&(pic.matches('.ingredient-art')?pic:pic.querySelector('.ingredient-art'))){const src=(pic.matches('.ingredient-art')?pic:pic.querySelector('.ingredient-art')) as HTMLElement;(drawn as HTMLElement).setAttribute('style',src.getAttribute('style')||'')}
 const img=big.querySelector('img.pp-img') as HTMLImageElement|null;if(img){img.removeAttribute('loading');img.setAttribute('onerror','this.remove()')}
 const store=img?PP_STORE_NAMES[String(big.getAttribute('data-photo-store')||'')]||'':'',esc=(s:string)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'} as any)[c]);
 const cap=img?(store?t(`Ảnh sản phẩm của ${store}`,`Product photo from ${store}`):t('Ảnh sản phẩm của siêu thị','Supermarket product photo')):'',ING=typeof INGREDIENTS!=='undefined'?INGREDIENTS:g.INGREDIENTS;
 const detail=id&&ING?.[id]?`<button class="btn" data-action="ingredient-detail" data-id="${esc(id)}">${t('Xem lượng cần mua','See the amounts')}</button>`:'';
 g.modal(name,`<figure class="pic-zoom">${big.outerHTML}${cap?`<figcaption><small>${cap}</small></figcaption>`:''}</figure>`,detail)}
document.addEventListener('click',e=>{const el=e.target as Element|null,pic=el?.closest?.('.shop-row .pp-wrap, .shop-row .ingredient-art');if(!pic)return;const row=pic.closest('.shop-row');if(!row||!(globalThis as any).modal)return;
 const outer=(pic.closest('.pp-wrap')||pic) as Element,label=outer.closest('.item-label')||row.querySelector('.item-label'),id=(label as HTMLElement|null)?.dataset?.id||(row.querySelector('[data-id]') as HTMLElement|null)?.dataset?.id||'';
 const txt=label?[...label.childNodes].find(n=>n.nodeType===3&&n.nodeValue!.trim()):null,name=(txt?.nodeValue||(typeof INGREDIENTS!=='undefined'?INGREDIENTS:(globalThis as any).INGREDIENTS)?.[id]?.[0]||'').trim();if(!name)return;
 e.preventDefault();e.stopImmediatePropagation();ppZoom(outer,id,name)},true);
