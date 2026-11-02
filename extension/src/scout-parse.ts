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
 const out:any[]=[],seen=new Set<any>(),stack=[rootNode];if(rootNode?.shadowRoot)stack.push(rootNode.shadowRoot);// v1.7.3: a tile that IS the shadow host (wc-product-tile)
 while(stack.length&&out.length<limit){const n=stack.pop();if(!n)continue;try{for(const el of n.querySelectorAll(selector)){if(!seen.has(el)){seen.add(el);out.push(el)}}}catch{return out}
  const walker=n.querySelectorAll?n.querySelectorAll('*'):[];for(const el of walker)if(el.shadowRoot)stack.push(el.shadowRoot)}
 return out;
}
/** Comma-separated selectors are tried IN ORDER (v1.7.3: the live-structure selector first, older guesses after). */
const splitSel=(sel:string)=>{const out:string[]=[];let depth=0,cur='',q='';for(const ch of sel){if(q){cur+=ch;if(ch===q)q='';continue}if(ch==='"'||ch==="'"){q=ch;cur+=ch;continue}if(ch==='('||ch==='[')depth++;if(ch===')'||ch===']')depth--;if(ch===','&&depth===0){if(cur.trim())out.push(cur.trim());cur='';continue}cur+=ch}if(cur.trim())out.push(cur.trim());return out};
const first=(node:any,selector?:string)=>{if(!selector)return null;for(const part of splitSel(selector)){let el:any=null;try{el=deepAll(node,part,1)[0]}catch{}if(el)return el}return null};
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
// v1.7.3 (live structure): Coles prints “$30.00/ 1kg | Was $8.00” — the unit price is the part before “|”;
// Amazon repeats the amount for screen readers (“$72.59$72.59/kg”).
const unitText=(el:any)=>text(el).split('|')[0].replace(/(\$\s?\d[\d,]*(?:\.\d+)?)\s*\1/g,'$1').trim();
// ---------- configured tiles ----------
function tileFact(tile:any,ctx:any,cfg:any){const s=cfg.tile||{};
 const nameEl=first(tile,s.name),link=first(tile,s.link)||(nameEl?.closest?.('a'))||null,name=text(nameEl)||C.clean(link?.getAttribute?.('aria-label')||link?.getAttribute?.('title'),160);
 const priceText=s.priceAttr?first(tile,s.price)?.getAttribute(s.priceAttr):text(first(tile,s.price));let price=C.parseMoney(priceText);
 if(price==null&&s.priceWhole){const w=text(first(tile,s.priceWhole)).replace(/[^\d]/g,''),f=text(first(tile,s.priceFraction)).replace(/[^\d]/g,'');if(w)price=C.round(+(w+'.'+(f||'00')))}
 const wasPrice=C.parseMoney(text(first(tile,s.wasPrice)).replace(/^.*?(was|rrp)\s*/i,'')),unit=C.parseUnitPrice(unitText(first(tile,s.unitPrice)));
 const promoText=[text(first(tile,s.promo)),wasPrice?'was $'+wasPrice:''].filter(Boolean).join(' ');let promoType=C.detectPromo(promoText,ctx.config.promo);if(!promoType&&wasPrice&&price&&price<=wasPrice/2+0.01)promoType='half-price';else if(!promoType&&wasPrice)promoType='special';
 const endText=text(first(tile,s.promoEnd))||(s.promoEndRe?(promoText.match(new RegExp(s.promoEndRe,'i'))||[])[0]:'');
 const href=absUrl(link?.getAttribute?.('href'),ctx.url),idAttr=s.idAttr?tile.getAttribute?.(s.idAttr):null;
 return C.factsOnly({name,price,wasPrice,...(unit||{}),promoType,promoText:text(first(tile,s.promo))||null,promoEnd:C.parsePromoEnd(endText,ctx.today),...(C.parsePackSize(name+' '+text(first(tile,s.size)))||{}),productId:idAttr||idFromUrl(href||'',ctx.r),productUrl:href,storeLabel:ctx.storeLabel});
}
// ---------- v1.7.3 store + signed-in detection on the visible header text (data-driven) ----------
// Text is read per element (one segment per element; light DOM + OPEN shadow roots; hidden
// elements, scripts, styles and form fields skipped) from the configured header/fulfilment areas
// and then from the top of the page. Only the captured store name is kept — never the text.
const SKIP_TAGS=new Set(['SCRIPT','STYLE','NOSCRIPT','TEMPLATE','SVG','INPUT','TEXTAREA','SELECT','OPTION','IFRAME']);
function visible(el:any){try{if(el.hidden)return false;if(typeof el.checkVisibility==='function')return el.checkVisibility({visibilityProperty:true,opacityProperty:false});return true}catch{return true}}
/** Visible text of `root`, one entry per element (adjacent text nodes of the same element joined). */
function segmentsOf(root:any,{maxSegs=600,maxNodes=6000}:any={}){const out:string[]=[];let nodes=0,cur:any=null,buf='';
 const flush=()=>{const t=C.clean(buf,200);if(t)out.push(t);buf='';cur=null};
 const walk=(n:any)=>{for(let c=n.firstChild;c&&out.length<maxSegs&&nodes<maxNodes;c=c.nextSibling){nodes++;
  if(c.nodeType===3){const p=c.parentNode;if(p!==cur){flush();cur=p}buf+=c.nodeValue;continue}
  if(c.nodeType!==1)continue;if(SKIP_TAGS.has(String(c.tagName).toUpperCase())||!visible(c))continue;
  flush();if(c.shadowRoot)walk(c.shadowRoot);walk(c);flush()}};
 try{walk(root);flush()}catch{}return out}
const NOT_A_STORE=/^(?:help|when|change|choose|select|set|find|store|stores|my store|your store|store locator|locator|delivery|deliver|online|specials?|catalogue|menu|account|my account|log ?in|login|sign ?(?:in|up)|lists?|cart|search|shop|shop products|now|today|tomorrow|pick ?up|direct to boot|click & collect|collect|none|not set|select a store|choose a store|set your store|find a store|choose store|select store)$/i;
/** A store name as shown by the site: brand/prefixes removed; never anything with digits (addresses, postcodes). */
function storeName(v:any){let t=C.clean(String(v||''),120).replace(/^(?:your store|my store|current store|selected store|store|shopping at|pick ?up(?: from)?|click & collect(?: from)?|direct to boot)\s*[:\-]?\s*/i,'').replace(/^\d{4}\s*,\s*/,'').replace(/\s*(?:change|›|>|\|)\s*$/i,'').replace(/[\s,.-]+$/,'').trim();
 if(t.length<2||t.length>40||/\d/.test(t)||/deliver/i.test(t)||NOT_A_STORE.test(t))return null;return t}
function areaRoots(doc:any,sels:any[]){const els:any[]=[];for(const s of sels||[]){let found:any[]=[];try{found=deepAll(doc,s,20)}catch{continue}for(const el of found)if(!els.some(x=>x===el||x.contains?.(el)))els.push(el)}return els.filter((el:any)=>!els.some(x=>x!==el&&x.contains?.(el))).slice(0,12)}
/** Candidate texts: each configured area, then the top of the page. */
function headerTexts(doc:any,r:any){const out:any[]=[],seen=new Set<string>();
 const add=(root:any,top:boolean)=>{const segs=segmentsOf(root,top?{maxSegs:400,maxNodes:5000}:{});if(!segs.length)return;const key=segs.slice(0,20).join('|');if(seen.has(key))return;seen.add(key);
  const labels:string[]=[];try{for(const el of deepAll(root,'[aria-label],[title]',200)){const v=C.clean(el.getAttribute('aria-label')||el.getAttribute('title')||'',120);if(v&&visible(el))labels.push(v)}}catch{}
  out.push({segments:'| '+segs.join(' | ')+' |',text:segs.join(' '),labels,top})};
 for(const el of areaRoots(doc,r.storeAreas||['header']))add(el,false);if(doc.body)add(doc.body,true);return out}
const reOf=(p:any)=>{try{return new RegExp(typeof p==='string'?p:p.re,typeof p==='string'?'i':(p.flags??'i'))}catch{return null}};
/** Returns {label, how} or null. Never reads a delivery address: a match that mentions delivery, or a name with digits, is skipped. */
function storeDetect(doc:any,r:any,texts?:any[]){
 if(r.online)return{label:'Online',how:'online'};
 // v1.7.3 (live Woolworths): the fulfilment ribbon shows a METHOD (“Direct to boot:”) and a VALUE (“Wolli Creek”). The value
 // is a store only for a pick-up method — for Delivery it is the home address, so it is never read.
 for(const m of r.storeMethod||[]){let roots:any[]=[];try{roots=deepAll(doc,m.root,10)}catch{continue}
  for(const root of roots){if(!visible(root))continue;const method=text(first(root,m.method)),allow=reOf({re:m.allow||'^(Direct to boot|Pick ?up|Click & Collect)',flags:'i'});
   if(method&&/deliver/i.test(method))return null;// delivery mode: no store on this page (and the value is an address)
   if(!method||!allow?.test(method))continue;const v=storeName(text(first(root,m.value)));if(v)return{label:v,how:'storeMethod'}}}
 for(const sel of r.store||[]){let el:any=null;try{el=first(doc,sel)}catch{}if(!el||!visible(el))continue;if(nearDelivery(el))return null;const v=storeName(text(el));if(v)return{label:v,how:'selector:'+sel}}
 const pats=(r.storeText||[]).map((p:any)=>({p,re:reOf(p),on:typeof p==='string'?'segments':p.on||'segments'})).filter((x:any)=>x.re);if(!pats.length)return null;
 for(const t of texts||headerTexts(doc,r))for(const [i,x] of pats.entries()){const srcs=x.on==='label'?t.labels:[x.on==='text'?t.text:t.segments];
  for(const src of srcs){const m=x.re.exec(src);if(!m||!m[1])continue;const before=src.slice(Math.max(0,m.index-40),m.index);if(/deliver/i.test(m[0])||/deliver(?:y|ing)?\s*(?:to|address)?\s*:?\s*\|?\s*$/i.test(before))continue;
   const v=storeName(m[1]);if(v)return{label:v,how:'storeText:'+i}}}
 return null}
/** True when the element or its nearest controls talk about delivery (then its text may be an address). */
function nearDelivery(el:any){let n=el;for(let i=0;i<4&&n&&n.nodeType===1;i++){const t=(n.getAttribute?.('aria-label')||'')+' '+(i<2?C.clean(n.textContent||'',200):'');if(/deliver/i.test(t))return true;n=n.parentNode?.host||n.parentNode}return false}
function storeLabelOf(doc:any,r:any){return storeDetect(doc,r)?.label||null}
/** v1.7.3: a store id from the page's own JSON (Coles __NEXT_DATA__ trolley.storeId) — read as data, never executed. */
function storeIdOf(doc:any,r:any){const c=r.storeIdJson;if(!c?.script||!c.path)return null;try{const el=doc.querySelector(c.script);if(!el)return null;let v:any=JSON.parse(el.textContent||'null');for(const k of String(c.path).split('.')){if(v==null)return null;v=v[k]}v=v==null?'':String(v);return /^[\w-]{1,20}$/.test(v)?v:null}catch{return null}}
/** Signed in? Strong markers (selectors, e.g. “Sign out”) anywhere; greetings (“Hi, Sam”) only in the
 *  header and only when the header does not show a log-in/sign-up link (“Login or Sign up” = signed out). */
function signedInOf(doc:any,r:any,texts?:any[]){const si=r.signedIn||{};if((si.selectors||[]).some((s:string)=>{try{return !!first(doc,s)}catch{return false}}))return true;
 const body=C.clean(doc.body?.innerText||doc.body?.textContent||'',20000).toLowerCase();if((si.text||[]).some((t:string)=>{const k=String(t).toLowerCase();return k&&body.includes(k)}))return true;
 // v1.7.3 (live Woolworths): the “Hello, <name>” heading of the quick-links panel is a real signed-in marker.
 for(const g of si.greet||[]){try{const re=new RegExp(g.re,g.flags||'');if(deepAll(doc,g.sel,5).some((el:any)=>visible(el)&&re.test(C.clean(el.textContent||'',80))))return true}catch{}}
 if(!(si.re||[]).length)return false;const ts=texts||headerTexts(doc,r),areas=ts.filter((t:any)=>!t.top),area=areas.length?areas:ts;// configured areas; the page top only if none was found
 const hay=area.map((t:any)=>t.text).join(' \n ');if((si.notText||[]).some((t:string)=>hay.toLowerCase().includes(String(t).toLowerCase())))return false;
 return (si.re||[]).some((p:any)=>{const re=(()=>{try{return new RegExp(typeof p==='string'?p:p.re,typeof p==='string'?'':(p.flags||''))}catch{return null}})();return !!re&&re.test(hay)})}
function challengeOf(doc:any,config:any,status:number){const ch=config.challenge||C.DEFAULT_CHALLENGE;let has=false;for(const s of ch.selectors||[]){try{if(doc.querySelector(s)){has=true;break}}catch{}}return C.detectChallenge({status,title:doc.title,text:(doc.body?.innerText||doc.body?.textContent||'').slice(0,6000),hasChallengeElement:has},ch)}
/** Main entry. Returns {retailer,pageType,url,storeLabel,signedIn,challenge,status,facts,method}. */
function extract(doc:any,href:string,config:any,{status=0,today=new Date().toISOString().slice(0,10),max}:any={}){
 const url=new URL(href),retailer=retailerFor(url.hostname,config);
 if(!retailer)return{retailer:null,status:'unsupported',facts:[]};
 const r=config.retailers[retailer],pageType=pageTypeFor(url,r),challenge=challengeOf(doc,config,status),texts=r.online&&!(r.signedIn?.re||[]).length?[]:headerTexts(doc,r),storeLabel=storeDetect(doc,r,texts)?.label||null,signedIn=signedInOf(doc,r,texts),storeId=storeLabel&&!r.online?storeIdOf(doc,r):null;
 const base={retailer,pageType,url:url.href.split('#')[0],storeLabel,storeId,signedIn,challenge,online:r.online===true};
 if(challenge)return{...base,status:'challenge',facts:[]};
 const ctx={url:url.href,r,storeLabel,today,config},limit=Math.min(500,max||config.limits?.maxFactsPerPage||200),facts:any[]=[],seen=new Set<string>();let method='none';
 const push=(f:any,m:string)=>{if(!f||facts.length>=limit)return;const k=(f.productId||f.name.toLowerCase())+'|'+f.price;if(seen.has(k))return;seen.add(k);facts.push(f);if(method==='none')method=m};
 for(const p of ldNodes(doc))push(ldFact(p,ctx),'json-ld');
 if(!facts.length&&pageType==='product')push(metaFact(doc,ctx),'meta');
 const cfg=(r.selectors||{})[pageType]||(r.selectors||{}).default;
 if(cfg){
  if(pageType==='product'&&!facts.length&&cfg.single){const s=cfg.single,name=text(first(doc,s.name)),price=C.parseMoney(text(first(doc,s.price)));const wasPrice=C.parseMoney(text(first(doc,s.wasPrice)).replace(/^.*?(was|rrp)\s*/i,''));const promoText=text(first(doc,s.promo));push(C.factsOnly({name,price,wasPrice,...(C.parseUnitPrice(unitText(first(doc,s.unitPrice)))||{}),promoType:C.detectPromo(promoText+(wasPrice?' was $':''),config.promo),promoText:promoText||null,promoEnd:C.parsePromoEnd(text(first(doc,s.promoEnd)),today),...(C.parsePackSize(name)||{}),productId:idFromUrl(url.href,r),productUrl:url.href.split('#')[0].split('?')[0],storeLabel}),'selectors')}
  if(cfg.tile?.root)for(const tile of deepAll(doc,cfg.tile.root,limit*2)){// v1.7.3: `require` = a real product tile (Coles ad tiles have no pricing); `skip` = sponsored (Amazon)
   if(cfg.tile.require&&!first(tile,cfg.tile.require))continue;if(cfg.tile.skip&&first(tile,cfg.tile.skip))continue;const f=tileFact(tile,ctx,cfg);if(f){const k=(f.productId||f.name.toLowerCase())+'|'+f.price;if(!seen.has(k))push(f,'selectors')}}
 }
 return{...base,status:facts.length?'ok':'parse-failed',method,facts};
}
// ---------- v1.7.2 “Gửi mẫu trang để sửa”: a sanitised description of the page STRUCTURE ----------
// Lets the owner fix selectors through the data-only config. Never includes form values, cookies,
// account menus, emails or phone numbers; texts are short and scrubbed; URL keeps origin + path
// (+ searchTerm/q only).
const EMAIL=/[\w.+-]+@[\w-]+\.[\w.-]+/g,PHONE=/(?:\+?61|0)[\s-]?\d(?:[\s-]?\d){7,9}/g,LONGNUM=/\b\d{9,}\b/g;
function scrub(v:any,max=120){return C.clean(String(v??''),400).replace(EMAIL,'[email]').replace(PHONE,'[phone]').replace(LONGNUM,'[number]').slice(0,max)}
function safeUrl(href:string){try{const u=new URL(href),keep=new URLSearchParams();for(const k of ['searchTerm','q','searchtext','k'])if(u.searchParams.get(k))keep.set(k,scrub(u.searchParams.get(k),60));const q=keep.toString();return u.origin+u.pathname+(q?'?'+q:'')}catch{return ''}}
const PRIVATE='input,textarea,select,option,[contenteditable="true"],form,[data-testid*="account" i],[class*="account" i],[aria-label*="account" i],[class*="user-name" i],[class*="username" i],header nav [class*="profile" i]';
function isPrivate(el:any){try{return !!el.closest?.(PRIVATE)}catch{return false}}
function cssPath(el:any){const parts:string[]=[];let n=el,i=0;while(n&&i<6){if(n.nodeType===11){parts.unshift('#shadow');n=n.host;i++;continue}if(n.nodeType!==1)break;const cls=[...(n.classList||[])].filter((c:string)=>/^[\w-]{1,30}$/.test(c)&&!/\d{4,}/.test(c)).slice(0,2);parts.unshift(n.localName+(cls.length?'.'+cls.join('.'):''));n=n.parentNode;i++}return parts.join(' > ')}
function headingNear(el:any){let n=el;for(let i=0;i<6&&n;i++){const h=n.querySelector?.('h1,h2,h3,h4,[class*="title" i],[data-testid*="title" i]');if(h&&!isPrivate(h))return scrub(h.textContent,80);n=n.parentNode?.host||n.parentNode}return ''}
function pickLd(v:any):any{const offer=(o:any)=>o?{'@type':o['@type'],price:o.price,lowPrice:o.lowPrice,priceCurrency:o.priceCurrency,priceValidUntil:o.priceValidUntil,priceSpecification:[].concat(o.priceSpecification||[]).slice(0,3).map((x:any)=>x&&{'@type':x['@type'],priceType:x.priceType,price:x.price,referenceQuantity:x.referenceQuantity})}:null;
 const t=[].concat(v?.['@type']||[]).map(String);if(t.includes('Product'))return{'@type':'Product',name:scrub(v.name,100),sku:scrub(v.sku,30),offers:[].concat(v.offers||[]).slice(0,2).map(offer)};
 if(t.includes('ItemList'))return{'@type':'ItemList',count:(v.itemListElement||[]).length,first:pickLd((v.itemListElement||[])[0]?.item||(v.itemListElement||[])[0])};return null}
function diagnose(doc:any,href:string,config:any,{timing=null,version=null,configVersion=null}:any={}){
 const url=new URL(href),retailer=retailerFor(url.hostname,config),r=config.retailers?.[retailer||'']||{},pageType=retailer?pageTypeFor(url,r):null;
 const types=new Set<string>();let ld:any=null;for(const sc of doc.querySelectorAll('script[type="application/ld+json"]')){let d:any;try{d=JSON.parse(sc.textContent||'')}catch{types.add('(invalid)');continue}const walk=(v:any,depth=0)=>{if(!v||depth>5||typeof v!=='object')return;if(Array.isArray(v))return v.forEach(x=>walk(x,depth+1));for(const t of [].concat(v['@type']||[]))types.add(String(t).slice(0,40));if(!ld){const p=pickLd(v);if(p)ld=p}if(v['@graph'])walk(v['@graph'],depth+1)};walk(d)}
 const metas:any={};for(const m of doc.querySelectorAll('meta[property],meta[name],meta[itemprop]')){const k=m.getAttribute('property')||m.getAttribute('name')||m.getAttribute('itemprop')||'';if(/price|product|currency|og:type|og:title|availability/i.test(k)&&Object.keys(metas).length<20)metas[k.slice(0,50)]=scrub(m.getAttribute('content'),80)}
 const sel:any={};const count=(s:any)=>{if(!s||typeof s!=='string')return;try{sel[s.slice(0,160)]=deepAll(doc,s,500).length}catch{sel[s.slice(0,160)]=-1}};
 for(const cfg of Object.values<any>(r.selectors||{})){for(const grp of [cfg.single,cfg.tile])for(const v of Object.values<any>(grp||{}))if(typeof v==='string'&&!/^\w+$/.test(v))count(v)}for(const s of r.store||[])count(s);for(const s of r.storeAreas||[])count(s);
 const custom=new Set<string>();for(const el of deepAll(doc,'*',6000))if(el.localName?.includes('-')&&custom.size<30)custom.add(el.localName.slice(0,40));
 const prices:any[]=[];const walkText=(root:any,cap=30)=>{const w=(doc.createTreeWalker?doc:root.ownerDocument||doc).createTreeWalker(root,4);let n:any;while((n=w.nextNode())&&prices.length<cap){const t=n.nodeValue||'';if(/\$\s?\d/.test(t)&&t.length<60){const el=n.parentNode;if(!el||isPrivate(el))continue;prices.push({text:scrub(t,40),path:cssPath(el),heading:headingNear(el)})}}};
 walkText(doc.body||doc,20);// light DOM first, then open shadow roots (web components)
 for(const el of deepAll(doc,'*',6000))if(el.shadowRoot&&prices.length<30)walkText(el.shadowRoot);
 // v1.7.3: where the store name is shown (to refine `storeText` patterns from a sample). Only short header
 // segments next to store words are kept; greetings, account links, delivery lines and anything with digits are dropped.
 let store:any=null;try{const ts=retailer?headerTexts(doc,r):[],det=retailer?storeDetect(doc,r,ts):null,hints:string[]=[],labels:string[]=[];
  const NEAR=/store|boot|pick ?up|collect|when|location|fulfil/i,BAD=/deliver|address|\b(?:hi|hello)\b|account|sign|log ?in|@|\d{2,}/i;
  for(const t of ts){const segs=t.segments.split(' | ').map((x:string)=>x.replace(/^\| ?| ?\|$/g,'').trim());segs.forEach((x:string,i:number)=>{if(hints.length<24&&NEAR.test(x))for(const y of segs.slice(Math.max(0,i-1),i+2))if(y&&!BAD.test(y)&&y.length<=60&&!hints.includes(y))hints.push(scrub(y,60))});
   for(const l of t.labels)if(labels.length<12&&NEAR.test(l)&&!BAD.test(l)&&!labels.includes(l))labels.push(scrub(l,80))}
  store={label:det?scrub(det.label,60):null,how:det?.how||null,hints:hints.slice(0,24),labels}}catch{}
 let parsed:any=null;try{const x=extract(doc,href,config,{});parsed={status:x.status,method:(x as any).method||null,facts:x.facts?.length||0,storeLabel:x.storeLabel?scrub(x.storeLabel,60):null}}catch(e:any){parsed={error:scrub(e?.message,80)}}
 return{v:1,url:safeUrl(href),retailer,pageType,title:scrub(doc.title,100),jsonLdTypes:[...types].slice(0,20),jsonLd:ld,meta:metas,selectors:sel,customElements:[...custom],prices,store,parsed,timing,version,configVersion}}
root.ScoutParse={extract,retailerFor,pageTypeFor,deepAll,diagnose,safeUrl,scrub,storeDetect,signedInOf,storeName,segmentsOf};
})(globalThis);
