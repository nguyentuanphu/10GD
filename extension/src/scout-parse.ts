// FamTray Scout — data-driven page parser. Runs inside the content script (and in
// the browser tests via addScriptTag). Order: JSON-LD Product/offers → meta tags →
// configured CSS selectors / regexes per retailer and page type. The config is DATA
// (selectors and regex strings) fetched from the server or bundled; never code.
// Only the whitelisted facts in ScoutCore.factsOnly() are returned.
(function scoutParse(root:any){
'use strict';
const C=root.ScoutCore;
const text=(el:any)=>el?C.clean(el.textContent||el.getAttribute?.('content')||'',300):'';
/** querySelectorAll that also walks OPEN shadow roots (retailer web components). Closed roots are not touched. */
function deepAll(rootNode:any,selector:string,limit=2000):any[]{
 const out:any[]=[],seen=new Set<any>(),stack=[rootNode];
 while(stack.length&&out.length<limit){const n=stack.pop();if(!n)continue;try{for(const el of n.querySelectorAll(selector)){if(!seen.has(el)){seen.add(el);out.push(el)}}}catch{return out}
  const walker=n.querySelectorAll?n.querySelectorAll('*'):[];for(const el of walker)if(el.shadowRoot)stack.push(el.shadowRoot)}
 return out;
}
const first=(node:any,selector?:string)=>selector?deepAll(node,selector,1)[0]||null:null;
function retailerFor(host:string,config:any){host=String(host||'').toLowerCase();for(const [id,r] of Object.entries<any>(config.retailers||{}))if((r.hosts||[]).some((h:string)=>host===h||host.endsWith('.'+h)))return id;return null}
function pageTypeFor(url:URL,r:any){for(const p of r.pageTypes||[]){try{if(new RegExp(p.path,'i').test(url.pathname+url.search))return p.type}catch{}}return 'other'}
function idFromUrl(href:string,r:any){if(!href||!r.productIdFromUrl)return null;try{const m=new RegExp(r.productIdFromUrl,'i').exec(href);return m?m[1]:null}catch{return null}}
// ---------- JSON-LD ----------
function ldNodes(doc:any){const out:any[]=[];for(const s of doc.querySelectorAll('script[type="application/ld+json"]')){let data:any;try{data=JSON.parse(s.textContent||'')}catch{continue}
 const walk=(v:any,depth=0)=>{if(!v||depth>6)return;if(Array.isArray(v)){v.forEach(x=>walk(x,depth+1));return}if(typeof v!=='object')return;const t=[].concat(v['@type']||[]).map(String);
  if(t.includes('Product'))out.push(v);if(v['@graph'])walk(v['@graph'],depth+1);if(t.includes('ItemList')&&Array.isArray(v.itemListElement))v.itemListElement.forEach((e:any)=>walk(e.item||e,depth+1));if(t.includes('ListItem')&&v.item)walk(v.item,depth+1)};
 walk(data)}return out}
function ldFact(p:any,ctx:any){
 const offers=[].concat(p.offers||[]).flatMap((o:any)=>o&&o['@type']==='AggregateOffer'&&o.offers?[].concat(o.offers):[o]).filter(Boolean),o:any=offers[0]||{};
 const cur=String(o.priceCurrency||'AUD').toUpperCase();if(cur!=='AUD')return null;
 const price=Number(o.price??o.lowPrice);let wasPrice:number|null=null,unit:any=null;
 for(const spec of [].concat(o.priceSpecification||[]) as any[]){if(!spec)continue;const type=String(spec.priceType||'');if(/Strikethrough|ListPrice|SRP/i.test(type))wasPrice=Number(spec.price);
  if(spec['@type']==='UnitPriceSpecification'&&spec.referenceQuantity){const q=spec.referenceQuantity,code=String(q.unitCode||q.unitText||'').toUpperCase(),qty=Number(q.value)||1,map:any={GRM:'g',KGM:'kg',MLT:'mL',LTR:'L',H87:'each',C62:'each',EA:'each',G:'g',KG:'kg',ML:'mL',L:'L'};if(map[code]&&!/Strikethrough|ListPrice/i.test(type))unit=C.parseUnitPrice('$'+spec.price+' / '+qty+map[code])}}
 const name=C.clean(p.name,160),url=p.url||o.url||ctx.url,pack=C.parsePackSize(name)||{};
 const promoEnd=wasPrice&&o.priceValidUntil?String(o.priceValidUntil).slice(0,10):null;
 const id=String(p.sku||p.productID||p.mpn||idFromUrl(url,ctx.r)||'')||null;
 return C.factsOnly({name,price,wasPrice,...(unit||{}),promoType:wasPrice?(price<=wasPrice/2+0.01?'half-price':'special'):null,promoEnd,...pack,productId:id,productUrl:absUrl(url,ctx.url),storeLabel:ctx.storeLabel});
}
const absUrl=(href:any,base:string)=>{try{return href?new URL(String(href),base).href:null}catch{return null}};
// ---------- meta tags ----------
function metaFact(doc:any,ctx:any){const m=(n:string)=>doc.querySelector(`meta[property="${n}"],meta[name="${n}"],meta[itemprop="${n}"]`)?.getAttribute('content')||'';
 const price=Number(m('product:price:amount')||m('og:price:amount')||m('price')),cur=(m('product:price:currency')||m('og:price:currency')||m('priceCurrency')||'AUD').toUpperCase();if(!(price>0)||cur!=='AUD')return null;
 const name=C.clean(m('og:title')||doc.title,160),url=m('og:url')||ctx.url;return C.factsOnly({name,price,...(C.parsePackSize(name)||{}),productId:idFromUrl(url,ctx.r),productUrl:absUrl(url,ctx.url),storeLabel:ctx.storeLabel})}
// ---------- configured tiles ----------
function tileFact(tile:any,ctx:any,cfg:any){const s=cfg.tile||{};
 const nameEl=first(tile,s.name),link=first(tile,s.link)||(nameEl?.closest?.('a'))||null,name=text(nameEl)||C.clean(link?.getAttribute?.('aria-label')||link?.getAttribute?.('title'),160);
 const priceText=s.priceAttr?first(tile,s.price)?.getAttribute(s.priceAttr):text(first(tile,s.price));let price=C.parseMoney(priceText);
 if(price==null&&s.priceWhole){const w=text(first(tile,s.priceWhole)).replace(/[^\d]/g,''),f=text(first(tile,s.priceFraction)).replace(/[^\d]/g,'');if(w)price=C.round(+(w+'.'+(f||'00')))}
 const wasPrice=C.parseMoney(text(first(tile,s.wasPrice)).replace(/^.*?(was|rrp)\s*/i,'')),unit=C.parseUnitPrice(text(first(tile,s.unitPrice)));
 const promoText=[text(first(tile,s.promo)),wasPrice?'was $'+wasPrice:''].filter(Boolean).join(' ');let promoType=C.detectPromo(promoText,ctx.config.promo);if(!promoType&&wasPrice&&price&&price<=wasPrice/2+0.01)promoType='half-price';else if(!promoType&&wasPrice)promoType='special';
 const endText=text(first(tile,s.promoEnd))||(s.promoEndRe?(promoText.match(new RegExp(s.promoEndRe,'i'))||[])[0]:'');
 const href=absUrl(link?.getAttribute?.('href'),ctx.url),idAttr=s.idAttr?tile.getAttribute?.(s.idAttr):null;
 return C.factsOnly({name,price,wasPrice,...(unit||{}),promoType,promoText:text(first(tile,s.promo))||null,promoEnd:C.parsePromoEnd(endText,ctx.today),...(C.parsePackSize(name+' '+text(first(tile,s.size)))||{}),productId:idAttr||idFromUrl(href||'',ctx.r),productUrl:href,storeLabel:ctx.storeLabel});
}
function storeLabelOf(doc:any,r:any){for(const sel of r.store||[]){const el=first(doc,sel);const t=text(el);if(t)return C.clean(t.replace(/^(your store|my store|store|shopping at|pick ?up from|delivering to)\s*[:\-]?\s*/i,''),80)}return null}
function signedInOf(doc:any,r:any){const si=r.signedIn||{};if((si.selectors||[]).some((s:string)=>{try{return !!first(doc,s)}catch{return false}}))return true;const body=C.clean(doc.body?.innerText||doc.body?.textContent||'',20000).toLowerCase();return (si.text||[]).some((t:string)=>body.includes(String(t).toLowerCase()))}
function challengeOf(doc:any,config:any,status:number){const ch=config.challenge||C.DEFAULT_CHALLENGE;let has=false;for(const s of ch.selectors||[]){try{if(doc.querySelector(s)){has=true;break}}catch{}}return C.detectChallenge({status,title:doc.title,text:(doc.body?.innerText||doc.body?.textContent||'').slice(0,6000),hasChallengeElement:has},ch)}
/** Main entry. Returns {retailer,pageType,url,storeLabel,signedIn,challenge,status,facts,method}. */
function extract(doc:any,href:string,config:any,{status=0,today=new Date().toISOString().slice(0,10),max}:any={}){
 const url=new URL(href),retailer=retailerFor(url.hostname,config);
 if(!retailer)return{retailer:null,status:'unsupported',facts:[]};
 const r=config.retailers[retailer],pageType=pageTypeFor(url,r),challenge=challengeOf(doc,config,status),storeLabel=storeLabelOf(doc,r),signedIn=signedInOf(doc,r);
 const base={retailer,pageType,url:url.href.split('#')[0],storeLabel,signedIn,challenge};
 if(challenge)return{...base,status:'challenge',facts:[]};
 const ctx={url:url.href,r,storeLabel,today,config},limit=Math.min(500,max||config.limits?.maxFactsPerPage||200),facts:any[]=[],seen=new Set<string>();let method='none';
 const push=(f:any,m:string)=>{if(!f||facts.length>=limit)return;const k=(f.productId||f.name.toLowerCase())+'|'+f.price;if(seen.has(k))return;seen.add(k);facts.push(f);if(method==='none')method=m};
 for(const p of ldNodes(doc))push(ldFact(p,ctx),'json-ld');
 if(!facts.length&&pageType==='product')push(metaFact(doc,ctx),'meta');
 const cfg=(r.selectors||{})[pageType]||(r.selectors||{}).default;
 if(cfg){
  if(pageType==='product'&&!facts.length&&cfg.single){const s=cfg.single,name=text(first(doc,s.name)),price=C.parseMoney(text(first(doc,s.price)));const wasPrice=C.parseMoney(text(first(doc,s.wasPrice)).replace(/^.*?(was|rrp)\s*/i,''));const promoText=text(first(doc,s.promo));push(C.factsOnly({name,price,wasPrice,...(C.parseUnitPrice(text(first(doc,s.unitPrice)))||{}),promoType:C.detectPromo(promoText+(wasPrice?' was $':''),config.promo),promoText:promoText||null,promoEnd:C.parsePromoEnd(text(first(doc,s.promoEnd)),today),...(C.parsePackSize(name)||{}),productId:idFromUrl(url.href,r),productUrl:url.href.split('#')[0].split('?')[0],storeLabel}),'selectors')}
  if(cfg.tile?.root)for(const tile of deepAll(doc,cfg.tile.root,limit*2)){const f=tileFact(tile,ctx,cfg);if(f){const k=(f.productId||f.name.toLowerCase())+'|'+f.price;if(!seen.has(k))push(f,'selectors')}}
 }
 return{...base,status:facts.length?'ok':'parse-failed',method,facts};
}
root.ScoutParse={extract,retailerFor,pageTypeFor,deepAll};
})(globalThis);
