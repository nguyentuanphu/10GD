'use strict';
// Price Scout / So giá — pure logic (no DOM). Loaded as a classic script before
// app.js and also executed in node:vm by tests. Everything hangs off one global.
// Prices only ever come from the family's own observations (screenshots, the
// "Lưu giá" bookmark, receipts, catalogue entries, manual entry) or an optional
// licensed feed. Nothing here fetches retailer websites.
(function(root){
const RETAILERS={
 chemist:{name:'Chemist Warehouse',short:'Chemist',icon:'💊',order:0,kind:'pharmacy',catalogue:'https://www.chemistwarehouse.com.au/catalogue'},
 aldi:{name:'ALDI',short:'ALDI',icon:'🔷',order:1,kind:'supermarket',catalogue:'https://www.aldi.com.au/special-buys'},
 woolworths:{name:'Woolworths',short:'Woolies',icon:'🟢',order:2,kind:'supermarket',catalogue:'https://www.woolworths.com.au/shop/catalogue'},
 coles:{name:'Coles',short:'Coles',icon:'🔴',order:2,kind:'supermarket',catalogue:'https://www.coles.com.au/catalogues'},
 other:{name:'Other store',vi:'Cửa hàng khác',short:'Khác',icon:'🏪',order:2.5,kind:'other',catalogue:null},
 'viet-grocer':{name:'Vietnamese grocer',vi:'Chợ Việt',short:'Chợ Việt',icon:'🏮',order:3,kind:'local',catalogue:null},
 amazon:{name:'Amazon AU',short:'Amazon',icon:'📦',order:-1,kind:'delivery',delivery:true,catalogue:'https://www.amazon.com.au/deals'}
};
const RETAILER_IDS=Object.keys(RETAILERS);
const CATEGORIES=['fresh','meat','seafood','pantry','dairy','frozen','bakery','household','personal'];
const SAFETY=['ambient','chilled','frozen','raw-meat','household'];
const SOURCES=['screenshot','bookmark','receipt','catalogue','manual','official','voice'];
const PROMOS=['half-price','special','special-buy','price-drop','multibuy','deal','clearance'];
const BASIS={per_kg:{dim:'mass',per:1000},per_100g:{dim:'mass',per:100},per_L:{dim:'vol',per:1000},per_100mL:{dim:'vol',per:100},per_each:{dim:'each',per:1},per_wash:{dim:'wash',per:1},per_roll:{dim:'roll',per:1},per_sheet:{dim:'sheet',per:1}};
const UNITS={g:['mass',1],gram:['mass',1],grams:['mass',1],kg:['mass',1000],kilo:['mass',1000],ml:['vol',1],l:['vol',1000],litre:['vol',1000],liter:['vol',1000],litres:['vol',1000],each:['each',1],ea:['each',1],'quả':['each',1],qua:['each',1],pc:['each',1],pcs:['each',1],bunch:['each',1],wash:['wash',1],washes:['wash',1],roll:['roll',1],rolls:['roll',1],sheet:['sheet',1],sheets:['sheet',1]};
const COUNT_DIMS=['each','wash','roll','sheet'];
const FRESH_DAYS=21,STALE_DAYS=35;
// Studio decides which states Price Scout serves (public banner `priceScoutStates`); NSW+QLD until it has answered.
// The array is updated in place so every reader sees the change; the last answer is cached for offline use.
const SUPPORTED_STATES=['NSW','QLD'];
const ALL_STATES=['NSW','QLD','VIC','SA','WA','TAS','ACT','NT'];
try{const cached=JSON.parse(localStorage.getItem('bep-scout-states')||'null');if(Array.isArray(cached))SUPPORTED_STATES.splice(0,SUPPORTED_STATES.length,...cached.filter(s=>ALL_STATES.includes(s)))}catch{}
function setSupportedStates(list){if(!Array.isArray(list))return false;const next=ALL_STATES.filter(s=>list.includes(s));if(next.join()===SUPPORTED_STATES.join())return false;SUPPORTED_STATES.splice(0,SUPPORTED_STATES.length,...next);try{localStorage.setItem('bep-scout-states',JSON.stringify(next))}catch{}return true}
function unsupportedMessage(){const join=(and:string)=>SUPPORTED_STATES.length>1?SUPPORTED_STATES.slice(0,-1).join(', ')+' '+and+' '+SUPPORTED_STATES[SUPPORTED_STATES.length-1]:SUPPORTED_STATES[0];return SUPPORTED_STATES.length?{vi:'Rất tiếc! Khu vực của bạn hiện chưa được hỗ trợ. Hệ thống hiện chỉ tối ưu giá cho '+join('và')+'. Chúng tôi sẽ sớm mở rộng sang các khu vực khác!',en:'Sorry! Your area isn’t supported yet. Price Check currently optimises prices for '+join('and')+' only. We’ll expand to other areas soon!'}:{vi:'So Giá đang tạm dừng ở mọi khu vực. Danh sách đi chợ vẫn dùng bình thường.',en:'Price Check is paused in every area for now. Your shopping list still works as usual.'}}
const UNSUPPORTED={vi:'Rất tiếc! Khu vực của bạn hiện chưa được hỗ trợ. Hệ thống hiện chỉ tối ưu giá cho NSW và QLD. Chúng tôi sẽ sớm mở rộng sang các khu vực khác!',en:'Sorry! Your area isn’t supported yet. Price Check currently optimises prices for NSW and QLD only. We’ll expand to other areas soon!'};

const round=(n,d=2)=>Math.round(n*10**d)/10**d;
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const isDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T00:00:00Z'));
const dayDiff=(a,b)=>Math.round((Date.parse(a+'T00:00:00Z')-Date.parse(b+'T00:00:00Z'))/864e5);
const addDays=(date,n)=>new Date(Date.parse(date+'T00:00:00Z')+n*864e5).toISOString().slice(0,10);
function sydneyToday(now=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Australia/Sydney',year:'numeric',month:'2-digit',day:'2-digit'}).format(now)}

// ---------- Geography ----------
// NSW 1000–1999, 2000–2599, 2619–2899, 2921–2999; QLD 4000–4999, 9000–9999.
// ACT (0200–0299, 2600–2618, 2900–2920) is NOT NSW.
function postcodeState(input){
 const s=String(input??'').trim();
 if(!/^\d{4}$/.test(s))return{valid:false,postcode:null,state:null,supported:false};
 const n=+s;let state=null;
 if(n>=1000&&n<=1999||n>=2000&&n<=2599||n>=2619&&n<=2899||n>=2921&&n<=2999)state='NSW';
 else if(n>=200&&n<=299||n>=2600&&n<=2618||n>=2900&&n<=2920)state='ACT';
 else if(n>=4000&&n<=4999||n>=9000&&n<=9999)state='QLD';
 else if(n>=3000&&n<=3999||n>=8000&&n<=8999)state='VIC';
 else if(n>=5000&&n<=5999)state='SA';
 else if(n>=6000&&n<=6999)state='WA';
 else if(n>=7000&&n<=7999)state='TAS';
 else if(n>=800&&n<=999)state='NT';
 if(!state)return{valid:false,postcode:s,state:null,supported:false};
 const supported=SUPPORTED_STATES.includes(state);
 return{valid:true,postcode:s,state,supported,message:supported?null:unsupportedMessage()};
}
// The price week starts on Wednesday (Woolworths/Coles specials run Wed→Tue).
function cycleId(date=sydneyToday()){const dow=new Date(date+'T00:00:00Z').getUTCDay();return addDays(date,-((dow-3+7)%7))}
function cycleEnd(date=sydneyToday()){return addDays(cycleId(date),6)}
// ALDI Special Buys drop on Wednesdays and Saturdays.
function nextSpecialBuyDays(date=sydneyToday(),count=2){const out=[];for(let i=0;out.length<count&&i<14;i++){const d=addDays(date,i),w=new Date(d+'T00:00:00Z').getUTCDay();if(w===3||w===6)out.push(d)}return out}
function defaultDealEnd(retailer,date=sydneyToday()){if(retailer==='woolworths'||retailer==='coles')return cycleEnd(date);if(retailer==='aldi'){const next=nextSpecialBuyDays(addDays(date,1),1)[0];return next?addDays(next,-1):addDays(date,6)}return addDays(date,6)}

// ---------- Units ----------
function unitInfo(unit){const u=String(unit||'').trim().toLowerCase();return UNITS[u]||null}
function unitPriceOf(price,packQty,packUnit,units,basis){
 const b=BASIS[basis];if(!b||!(price>0))return null;
 const u=unitInfo(packUnit);
 if(COUNT_DIMS.includes(b.dim)){
  let count=null;
  if(u&&u[0]===b.dim&&packQty>0)count=packQty*u[1];
  else if(units>0)count=units;
  else if(b.dim==='each'&&u&&u[0]==='each'&&packQty>0)count=packQty;
  return count>0?round(price/count,4):null;
 }
 if(!u||u[0]!==b.dim||!(packQty>0))return null;
 return round(price/(packQty*u[1])*b.per,4);
}
function convertUnitPrice(value,from,to){const a=BASIS[from],b=BASIS[to];if(!a||!b||a.dim!==b.dim||!(value>0))return null;return round(value/a.per*b.per,4)}
function basisFromText(qty,unit){
 const u=String(unit||'').toLowerCase().replace(/s$/,'');const q=qty?+qty:1;
 if(u==='g')return q===100?'per_100g':q===1000?'per_kg':null;
 if(u==='kg')return q===1?'per_kg':null;
 if(u==='ml')return q===100?'per_100mL':q===1000?'per_L':null;
 if(u==='l'||u==='litre'||u==='liter')return q===1?'per_L':null;
 if(u==='each'||u==='ea'||u==='unit')return'per_each';
 if(u==='wash')return'per_wash';if(u==='roll')return'per_roll';if(u==='sheet')return'per_sheet';
 return null;
}
// How many "basis units" of an item are needed for a shopping quantity, or null.
function basisMultiplier(qty,unit,basis,item){
 const b=BASIS[basis];if(!b||!(qty>0))return null;
 const u=unitInfo(unit);
 if(u&&u[0]===b.dim)return qty*u[1]/b.per;
 const pack=item?.commonPacks?.[0];
 if(String(unit||'').toLowerCase()==='pack'||(u&&u[0]==='each'&&COUNT_DIMS.includes(b.dim))){
  if(!pack)return null;
  if(COUNT_DIMS.includes(b.dim))return pack.units>0?qty*pack.units:(unitInfo(pack.packUnit)?.[0]===b.dim?qty*pack.packQty:null);
  const pu=unitInfo(pack.packUnit);return pu&&pu[0]===b.dim?qty*pack.packQty*pu[1]/b.per:null;
 }
 return null;
}

// ---------- Retailer detection & catalog matching ----------
const RETAILER_WORDS=[['chemist',/chemist\s*warehouse|chemistwarehouse|my chemist/],['woolworths',/woolworths|woolies|\bwoolw/],['coles',/\bcoles\b/],['aldi',/\baldi\b/],['amazon',/amazon|\bprime\b/],['viet-grocer',/\bcho\b|viet|asian grocer|asian supermarket|cabramatta|bankstown|inala|canley|marrickville|butcher|seafood market|fish market|\bfresh market\b|tan viet|thai kee/]];
function detectRetailer(text){const n=' '+norm(text)+' ';for(const[id,re]of RETAILER_WORDS)if(re.test(n))return id;return null}
function retailerFromHost(url){try{const h=new URL(url).hostname.replace(/^www\./,'');if(/(^|\.)woolworths\.com\.au$/.test(h))return'woolworths';if(/(^|\.)coles\.com\.au$/.test(h))return'coles';if(/(^|\.)aldi\.com\.au$/.test(h))return'aldi';if(/(^|\.)chemistwarehouse\.com\.au$/.test(h))return'chemist';if(/(^|\.)amazon\.com\.au$/.test(h))return'amazon';return null}catch{return null}}
function tokens(s){return norm(s).split(' ').filter(t=>t.length>1)}
function matchCatalog(label,catalog,limit=5){
 const n=' '+norm(label)+' ',lt=new Set(tokens(label));if(!lt.size)return[];
 const out=[];
 for(const item of catalog||[]){
  let best=0;
  for(const name of [item.nameVi,item.nameEn,...(item.aliases||[])]){
   const nn=norm(name);if(!nn)continue;
   if(n.includes(' '+nn+' ')){best=Math.max(best,0.75+Math.min(0.25,nn.length/40));continue}
   const nt=tokens(name);if(!nt.length)continue;const hit=nt.filter(t=>lt.has(t)).length;
   if(hit)best=Math.max(best,hit/nt.length*0.7*(hit/Math.max(nt.length,Math.min(lt.size,4))>0.3?1:0.6));
  }
  if(best>=0.3)out.push({item,score:round(best,3)});
 }
 return out.sort((a,b)=>b.score-a.score).slice(0,limit);
}

// ---------- Text parsing (screenshot OCR, paste, bookmark) ----------
const MONEY=/(?:\$\s?(\d{1,4}(?:[.,]\d{1,2})?)|(\d{1,3})\s?c\b)/gi;
const UNIT_PRICE=/(?:\$\s?(\d{1,4}(?:[.,]\d{1,4})?)|(\d{1,3}(?:\.\d+)?)\s?c)\s*(?:\/|per|a|ea\.?\s*\/)\s*(\d+(?:\.\d+)?)?\s*(kg|g|ml|l|litre|liter|each|ea|unit|wash(?:es)?|roll|sheet)\b/i;
function money(raw){return raw==null?null:+String(raw).replace(',','.')}
function parsePriceText(text,{catalog=null,retailer=null}={}){
 const raw=String(text||'').slice(0,20000);const flat=raw.replace(/[\u00a0\t]+/g,' ');
 const result={retailer:retailer||detectRetailer(flat),label:'',price:null,wasPrice:null,save:null,promo:null,unitPrice:null,unitBasis:null,packQty:null,packUnit:null,units:null,itemId:null,matches:[],validUntil:null,confidence:0};
 const used=new Set();
 const up=flat.match(UNIT_PRICE);
 if(up){const v=up[1]!=null?money(up[1]):+up[2]/100,basis=basisFromText(up[3]||(/^(kg|l|litre|liter)$/i.test(up[4])?1:/^(g|ml)$/i.test(up[4])?100:1),up[4]);if(basis&&v>0){result.unitPrice=round(v,4);result.unitBasis=basis;used.add(up.index)}}
 const was=flat.match(/\bwas\s*:?\s*\$\s?(\d{1,4}(?:[.,]\d{1,2})?)/i);if(was){result.wasPrice=money(was[1]);used.add(was.index+was[0].indexOf('$'))}
 const save=flat.match(/\bsave\s*:?\s*\$\s?(\d{1,4}(?:[.,]\d{1,2})?)/i);if(save){result.save=money(save[1]);used.add(save.index+save[0].indexOf('$'))}
 if(/1\s*\/\s*2\s*price|half\s*price|50\s*%\s*off/i.test(flat))result.promo='half-price';
 else if(/special\s*buys?/i.test(flat)&&(result.retailer==='aldi'||/aldi/i.test(flat)))result.promo='special-buy';
 else if(/\b\d+\s*for\s*\$\s?\d/i.test(flat))result.promo='multibuy';
 else if(/down\s*down|lower\s*shelf\s*price|price\s*drop(ped)?|prices?\s*dropped/i.test(flat))result.promo='price-drop';
 else if(/\bspecials?\b|\bon sale\b|\bsale\b|\bsave\b|\bwas\b/i.test(flat))result.promo='special';
 else if(/\bdeal\b|prime\s*day|limited\s*time/i.test(flat))result.promo='deal';
 // Main price: first money amount that is not the unit price, was-price or saving.
 const unitSpan=up?[up.index,up.index+up[0].length]:null;
 for(const m of flat.matchAll(MONEY)){
  const at=m.index;if(unitSpan&&at>=unitSpan[0]&&at<unitSpan[1])continue;if(used.has(at))continue;
  const before=flat.slice(Math.max(0,at-6),at).toLowerCase();if(/was\s*:?\s*$|save\s*:?\s*$/.test(before))continue;
  const after=flat.slice(at+m[0].length,at+m[0].length+12).toLowerCase();if(/^\s*(\/|per\b|off\b)/.test(after))continue;
  const v=m[1]!=null?money(m[1]):+m[2]/100;if(v>0&&v<10000){result.price=round(v);break}
 }
 if(result.price==null&&result.wasPrice&&result.save)result.price=round(result.wasPrice-result.save);
 if(result.wasPrice==null&&result.save&&result.price)result.wasPrice=round(result.price+result.save);
 if(result.promo==='half-price'&&result.wasPrice==null&&result.price)result.wasPrice=round(result.price*2);
 // Pack size
 const size=flat.match(/(\d+(?:[.,]\d+)?)\s?(kg|g|ml|l|litre|liter)\b(?!\s*(?:\/|per))/i);
 const count=flat.match(/(\d{1,4})\s?(?:x\s)?(?:pk|pack|tablets|tabs|capsules|caps|rolls?|sheets?|washes|wash|count|ct|pieces|pcs|nappies|wipes|bags)\b/i);
 if(size&&!(unitSpan&&size.index>=unitSpan[0]&&size.index<unitSpan[1])){result.packQty=+size[1].replace(',','.');result.packUnit=/^l|litre|liter$/i.test(size[2])?'L':/^ml$/i.test(size[2])?'mL':size[2].toLowerCase()}
 if(count){const c=+count[1],word=count[0].toLowerCase();const kind=/roll/.test(word)?'roll':/sheet|wipes/.test(word)?'sheet':/wash/.test(word)?'wash':null;
  if(result.unitBasis&&BASIS[result.unitBasis].dim!=='mass'&&BASIS[result.unitBasis].dim!=='vol'){result.units=c;if(!result.packQty){result.packQty=c;result.packUnit=BASIS[result.unitBasis].dim}}
  else{result.units=c;if(!result.packQty){result.packQty=c;result.packUnit=kind||'each'}}}
 // Label: the line that best matches the catalog, else the longest wordy line.
 const skip=/^(woolworths|coles|aldi|chemist|amazon|add to (cart|trolley)|add|buy now|in stock|save|was|special|price|per|each|qty|quantity|delivery|pick ?up|\d+%|prime)\b/i;
 const retailerWords=/\b(woolworths|woolies|coles|aldi|chemist warehouse|amazon(\.com\.au)?|prime)\b/gi;
 const lines=raw.split(/\r?\n|\s{3,}| [|•·] /).map(s=>s.replace(retailerWords,' ').replace(/\$\s?\d[\d.,]*/g,' ').replace(/\b(was|save|per|each|1\/2 price|half price|special buys?|special)\b.*$/i,'').replace(/\s+/g,' ').trim()).filter(s=>s.length>=3&&/[a-zA-Zà-ỹÀ-Ỹ]{3}/.test(s)&&!skip.test(s));
 let best=null;
 if(catalog)for(const line of lines){const m=matchCatalog(line,catalog,3);if(m[0]&&(!best||m[0].score>best.score))best={line,score:m[0].score,matches:m}}
 const longest=lines.map(l=>l.replace(retailerWords,'').trim()).filter(Boolean).sort((a,b)=>b.length-a.length)[0]||'';
 result.label=(best?.line||longest).replace(retailerWords,'').replace(/\s+/g,' ').trim().slice(0,120);
 if(catalog){result.matches=(best?.matches||matchCatalog(result.label,catalog,3));result.itemId=result.matches[0]?.score>=0.45?result.matches[0].item.id:null}
 const item=result.itemId&&catalog?.find(i=>i.id===result.itemId);
 if(item){
  if(result.unitPrice!=null&&result.unitBasis!==item.unitBasis){const c=convertUnitPrice(result.unitPrice,result.unitBasis,item.unitBasis);if(c!=null){result.unitPrice=c;result.unitBasis=item.unitBasis}}
  if(result.unitPrice==null&&result.price){const v=unitPriceOf(result.price,result.packQty,result.packUnit,result.units,item.unitBasis);if(v!=null){result.unitPrice=v;result.unitBasis=item.unitBasis}}
  if(COUNT_DIMS.includes(BASIS[item.unitBasis].dim)&&result.packUnit==='each'&&result.units)result.packUnit=BASIS[item.unitBasis].dim;
 }
 if(result.unitPrice==null&&result.price&&result.packQty&&result.packUnit){const dim=unitInfo(result.packUnit)?.[0];const basis=dim==='mass'?'per_kg':dim==='vol'?'per_L':dim==='each'?'per_each':dim?'per_'+dim:null;const v=basis&&unitPriceOf(result.price,result.packQty,result.packUnit,result.units,basis);if(v){result.unitPrice=v;result.unitBasis=basis}}
 result.confidence=round((result.price?0.4:0)+(result.unitPrice?0.2:0)+(result.retailer?0.15:0)+(result.itemId?0.25:0),2);
 return result;
}

// ---------- Bookmark ("Lưu giá") ----------
// SELF-CONTAINED: this function's source is embedded in the bookmarklet and runs
// in the user's own browser on the retailer page. It must not reference any
// outer variable. It only reads the page the user is already viewing.
function extractProductPage(html,text,href,title){
 var out={v:1,label:'',price:null,currency:'AUD',wasPrice:null,unitText:'',packText:'',url:'',host:'',source:'bookmark'};
 try{var u=new URL(href);out.url=(u.origin+u.pathname).slice(0,300);out.host=u.hostname.replace(/^www\./,'')}catch(e){}
 var num=function(v){var n=parseFloat(String(v==null?'':v).replace(/[^0-9.]/g,''));return isFinite(n)&&n>0&&n<100000?Math.round(n*100)/100:null};
 var products=[];
 var walk=function(node,depth){if(!node||depth>6)return;if(Array.isArray(node)){for(var i=0;i<node.length;i++)walk(node[i],depth+1);return}if(typeof node!=='object')return;var t=node['@type'];if(t==='Product'||(Array.isArray(t)&&t.indexOf('Product')>=0))products.push(node);if(node['@graph'])walk(node['@graph'],depth+1);if(node.mainEntity)walk(node.mainEntity,depth+1)};
 var re=/<script[^>]*type=["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi,m;
 while((m=re.exec(html||''))&&products.length<5){try{walk(JSON.parse(m[1].trim()),0)}catch(e){}}
 var p=products[0];
 if(p){out.label=String(p.name||'').slice(0,160);var offers=p.offers;if(Array.isArray(offers))offers=offers[0];if(offers){var price=offers.price!=null?offers.price:offers.lowPrice;if(price==null&&offers.priceSpecification){var ps=Array.isArray(offers.priceSpecification)?offers.priceSpecification[0]:offers.priceSpecification;price=ps&&ps.price}out.price=num(price);if(offers.priceCurrency)out.currency=String(offers.priceCurrency).slice(0,3).toUpperCase()}
  if(p.size)out.packText=String(p.size).slice(0,60);else if(p.weight)out.packText=String(p.weight.value||p.weight)+' '+String(p.weight.unitText||p.weight.unitCode||'');}
 var meta=function(name){var r=new RegExp('<meta[^>]+(?:property|name|itemprop)=["\']'+name.replace(/[:.]/g,'\\$&')+'["\'][^>]*>','i'),mm=(html||'').match(r);if(!mm)return null;var c=mm[0].match(/content=["']([^"']*)["']/i);return c?c[1]:null};
 if(!out.label)out.label=String(meta('og:title')||title||'').replace(/\s*[|\-–]\s*(Woolworths|Coles|ALDI|Chemist Warehouse|Amazon\.com\.au).*$/i,'').slice(0,160);
 if(out.price==null)out.price=num(meta('product:price:amount')||meta('og:price:amount')||meta('price'));
 var body=String(text||'').slice(0,200000);
 var unit=body.match(/\$\s?\d{1,4}(?:\.\d{1,4})?\s*(?:\/|per)\s*\d*\s*(?:kg|g|ml|l|litre|each|ea|wash(?:es)?|roll|sheet)\b/i);if(unit)out.unitText=unit[0].slice(0,40);
 var was=body.match(/\bwas\s*\$\s?(\d{1,4}(?:\.\d{1,2})?)/i);if(was)out.wasPrice=num(was[1]);
 if(/1\s*\/\s*2\s*price|half\s*price/i.test(body))out.promoText='half-price';else if(/special\s*buy/i.test(body))out.promoText='special-buy';else if(was)out.promoText='special';
 if(out.price==null){var first=body.replace(unit?unit[0]:'\u0000','').match(/\$\s?(\d{1,4}\.\d{2})/);if(first)out.price=num(first[1])}
 if(!out.packText){var size=(out.label+' '+body.slice(0,4000)).match(/\b\d+(?:\.\d+)?\s?(?:kg|g|ml|l|litre|pack|pk|rolls?|tablets|sheets)\b/i);if(size)out.packText=size[0]}
 return out;
}
function bookmarkletSource(origin){
 const code='(function(){var f='+extractProductPage.toString().replace(/\n\s+/g,'\n')+';var d=f(document.documentElement.outerHTML.slice(0,3000000),(document.body&&document.body.innerText||'+"''"+').slice(0,200000),location.href,document.title);if(!d.price&&!d.label){alert("Không tìm thấy giá trên trang này / No price found on this page");return}var u='+JSON.stringify(String(origin).replace(/\/$/,''))+'+"/?price-capture="+encodeURIComponent(JSON.stringify(d));var w=window.open(u,"_blank");if(!w)location.href=u})()';
 return'javascript:'+encodeURIComponent(code);
}
// Validate and normalise an incoming ?price-capture= payload into an editable draft.
function captureToDraft(raw,catalog,today=sydneyToday()){
 let d;try{d=typeof raw==='string'?JSON.parse(raw):raw}catch{return null}
 if(!d||typeof d!=='object'||d.v!==1)return null;
 const str=(v,n)=>String(v??'').replace(/[\u0000-\u001f<>]/g,' ').trim().slice(0,n);
 const retailer=retailerFromHost(str(d.url,300))||detectRetailer(str(d.host,80));
 const parsed=parsePriceText([str(d.label,160),str(d.packText,60),d.price?'$'+(+d.price).toFixed(2):'',str(d.unitText,40),d.wasPrice?'Was $'+(+d.wasPrice).toFixed(2):'',d.promoText==='half-price'?'1/2 Price':d.promoText==='special-buy'?'Special Buy':''].filter(Boolean).join('\n'),{catalog,retailer});
 const price=Number.isFinite(+d.price)&&+d.price>0?round(+d.price):parsed.price;
 return{...parsed,price,label:str(d.label,120)||parsed.label,currency:str(d.currency,3).toUpperCase()==='AUD'?'AUD':str(d.currency,3).toUpperCase()||'AUD',url:str(d.url,300),source:'bookmark',observedAt:today};
}

// ---------- Observations ----------
function validObservation(o){
 const num=(v,max)=>v==null||(typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=max);
 return !!o&&typeof o==='object'&&typeof o.id==='string'&&/^[\w:.-]{6,120}$/.test(o.id)&&(o.itemId==null||typeof o.itemId==='string'&&o.itemId.length<=60)&&typeof o.label==='string'&&o.label.trim().length>0&&o.label.length<=160&&RETAILER_IDS.includes(o.retailer)&&(o.branchId==null||typeof o.branchId==='string'&&o.branchId.length<=80)&&(o.state==null||['NSW','QLD'].includes(o.state))&&typeof o.price==='number'&&o.price>0&&o.price<=10000&&o.currency==='AUD'&&num(o.packQty,100000)&&(o.packUnit==null||typeof o.packUnit==='string'&&o.packUnit.length<=12)&&num(o.units,100000)&&num(o.unitPrice,100000)&&(o.unitBasis==null||Object.hasOwn(BASIS,o.unitBasis))&&num(o.wasPrice,10000)&&(o.promo==null||PROMOS.includes(o.promo))&&(o.validUntil==null||isDate(o.validUntil))&&isDate(o.observedAt)&&(o.observedBy==null||typeof o.observedBy==='string'&&o.observedBy.length<=80)&&SOURCES.includes(o.source)&&(o.note==null||typeof o.note==='string'&&o.note.length<=300)&&validProvenance(o);
}
function freshness(o,today=sydneyToday()){
 const age=Math.max(0,dayDiff(today,o.observedAt));
 if(o.validUntil){if(o.validUntil<today)return{status:'expired',ageDays:age,usable:false,faded:true};return{status:'special',ageDays:age,usable:true,faded:false,daysLeft:dayDiff(o.validUntil,today)}}
 if(age<=FRESH_DAYS)return{status:'fresh',ageDays:age,usable:true,faded:false};
 if(age<=STALE_DAYS)return{status:'fading',ageDays:age,usable:true,faded:true};
 return{status:'stale',ageDays:age,usable:false,faded:true};
}
function itemUnitPrice(o,item){
 if(!item)return o.unitPrice??null;
 if(o.unitPrice!=null&&o.unitBasis===item.unitBasis)return o.unitPrice;
 if(o.unitPrice!=null&&o.unitBasis){const c=convertUnitPrice(o.unitPrice,o.unitBasis,item.unitBasis);if(c!=null)return c}
 return unitPriceOf(o.price,o.packQty,o.packUnit,o.units,item.unitBasis);
}
// Freshest valid price for an item at a retailer: the latest regular price,
// unless an active special (validUntil not passed) is cheaper.
function bestPrice(item,retailer,observations,{today=sydneyToday(),state=null,includeStale=false}={}){
 const rows=(observations||[]).filter(o=>o&&o.itemId===item.id&&o.retailer===retailer&&o.currency==='AUD'&&(!state||!o.state||o.state===state)).map(o=>({o,f:freshness(o,today),unit:itemUnitPrice(o,item)})).filter(r=>r.f.usable||includeStale&&r.f.status==='stale');
 if(!rows.length)return null;
 rows.sort((a,b)=>b.o.observedAt.localeCompare(a.o.observedAt));
 const regular=rows.find(r=>!r.o.validUntil),specials=rows.filter(r=>r.o.validUntil);
 const pool=[regular,...specials].filter(Boolean);
 const cmp=r=>r.unit!=null?r.unit:Infinity;
 pool.sort((a,b)=>cmp(a)-cmp(b)||b.o.observedAt.localeCompare(a.o.observedAt));
 const pick=pool[0];return{observation:pick.o,unitPrice:pick.unit,freshness:pick.f};
}
function costFor(item,need,price){
 if(!price)return null;
 const mult=price.unitPrice!=null?basisMultiplier(need.qty,need.unit,item.unitBasis,item):null;
 if(mult!=null)return{cost:round(price.unitPrice*mult),approx:false};
 // Unknown conversion: assume one pack as seen (flagged as an estimate).
 return{cost:round(price.observation.price),approx:true};
}
const COLD=new Set(['raw-meat','frozen']);
function allowedChannel(item,retailer,prefs={}){
 if(prefs.allowed&&prefs.allowed[retailer]===false)return false;
 const personal=item.category==='household'||item.category==='personal';
 if(retailer==='chemist')return personal;
 if(retailer==='amazon')return personal&&!!item.bulkCandidate;
 if(retailer==='viet-grocer')return['fresh','meat','seafood'].includes(item.category);
 if(retailer==='other')return true;
 return true;
}
// v1.7.5 trip plans (owner, 5 Nov 2026): a cheap price far away is not always worth it. The family writes how many
// minutes it takes to reach each store (one way; unknown = 10 min, flagged as an estimate). Every combination of the
// in-person stores is costed, and three plans are offered to choose from each time:
//   near     — fewest minutes that still gets ≥ 80 % of the items that have a price anywhere;
//   balanced — (owner: time is never turned into money) the cheapest plan with ≥ 80 % of the items whose trip is
//              no longer than halfway between the nearest and the cheapest plan's minutes;
//   cheap    — lowest total that gets every item with a price, then fewest minutes.
// Trip minutes ≈ every store's one-way minutes + the farthest one's way home (one store = there and back).
const DEFAULT_TRAVEL_MIN=10;
function tripMinutes(stores,travel){const m=stores.map(r=>{const v=Number(travel?.[r]);return v>=0&&v<=240?v:DEFAULT_TRAVEL_MIN});return m.length?m.reduce((a,b)=>a+b,0)+Math.max(...m):0}
function tripPlans(lines,prefs={}){
 const travel=prefs.travel||{};
 const usable=l=>Object.keys(l.prices).filter(r=>!RETAILERS[r]?.delivery&&allowedChannel(l.item,r,prefs));
 const priced=lines.filter(l=>usable(l).length);if(!priced.length)return null;
 const stores=[...new Set(priced.flatMap(usable))].sort((a,b)=>RETAILERS[a].order-RETAILERS[b].order).slice(0,7);
 const plans=[];
 for(let mask=1;mask<1<<stores.length;mask++){const set=stores.filter((_,i)=>mask&1<<i),byStore=new Map(set.map(r=>[r,{retailer:r,items:[],total:0}])),missing=[];let total=0;
  for(const l of priced){const opts=usable(l).filter(r=>set.includes(r));if(!opts.length){missing.push(l.label);continue}const r=opts.sort((a,b)=>l.prices[a].cost-l.prices[b].cost)[0],c=l.prices[r].cost;total+=c;const st=byStore.get(r);st.items.push({key:l.key,label:l.label,itemId:l.item.id,cost:c,approx:l.prices[r].approx,cold:l.cold});st.total+=c}
  const used=[...byStore.values()].filter(s=>s.items.length);if(used.length!==set.length)continue; // a store with nothing to buy is not a stop
  const minutes=tripMinutes(used.map(s=>s.retailer),travel);
  plans.push({stores:used.map(s=>({...s,total:round(s.total),minutes:Number(travel?.[s.retailer])>=0&&Number(travel?.[s.retailer])<=240?Number(travel[s.retailer]):DEFAULT_TRAVEL_MIN,estimated:!(Number(travel?.[s.retailer])>=0&&travel?.[s.retailer]!==''&&travel?.[s.retailer]!=null)})),total:round(total),covered:priced.length-missing.length,missing,minutes,estimated:used.some(s=>!(travel?.[s.retailer]!=null&&travel[s.retailer]!==''))})}
 if(!plans.length)return null;
 const all=priced.length,maxCovered=Math.max(...plans.map(p=>p.covered)),enough=Math.ceil(maxCovered*0.8);
 const near=plans.filter(p=>p.covered>=enough).sort((a,b)=>a.minutes-b.minutes||b.covered-a.covered||a.total-b.total)[0];
 const cheap=plans.filter(p=>p.covered===maxCovered).sort((a,b)=>a.total-b.total||a.minutes-b.minutes)[0];
 const mid=(near.minutes+cheap.minutes)/2,balanced=plans.filter(p=>p.covered>=enough&&p.minutes<=mid+0.001).sort((a,b)=>a.total-b.total||a.minutes-b.minutes)[0]||near;
 const pack=(id,p)=>({id,stores:p.stores.map(s=>({...s,items:s.items.sort((a,b)=>Number(b.cold)-Number(a.cold))})).sort((a,b)=>a.minutes-b.minutes),total:p.total,covered:p.covered,itemCount:all,missing:p.missing,minutes:p.minutes,estimated:p.estimated});
 return{defaultMinutes:DEFAULT_TRAVEL_MIN,stores,plans:{near:pack('near',near),balanced:pack('balanced',balanced),cheap:pack('cheap',cheap)}}
}
function catalogMap(catalog){const m=new Map();for(const i of catalog||[])m.set(i.id,i);return m}
function optimizeBasket(items,observations,prefs={}){
 const opts={today:prefs.today||sydneyToday(),state:prefs.state||null,includeStale:!!prefs.includeStale};
 const minSavings=prefs.minSavings??5,minStopOrder=prefs.minStopOrder??15;
 const cat=catalogMap(prefs.catalog);
 const community=Array.isArray(prefs.community)?prefs.community:[],shopPosted=Array.isArray(prefs.shopPrices)?prefs.shopPrices:[],hints=Array.isArray(prefs.communityHints)?prefs.communityHints:[];
 const lines=[],unknown=[];
 for(const need of items||[]){
  const item=need.itemId&&cat.get(need.itemId);
  if(!item){unknown.push({key:need.key,label:need.label,reason:'no-match'});continue}
  const prices={};
  // Source priority: own-family prices first, then CONFIRMED community prices, then shop-posted prices.
  for(const r of RETAILER_IDS){let p=bestPrice(item,r,observations,opts),origin=p?(p.observation.source==='official'?'official':'family'):null;
   if(!p&&community.length){p=bestPrice(item,r,community,opts);origin=p?'community':null}
   if(!p&&shopPosted.length){p=bestPrice(item,r,shopPosted,opts);origin=p?'shop':null}
   if(!p)continue;const c=costFor(item,need,p);if(c)prices[r]={...c,unitPrice:p.unitPrice,observation:p.observation,freshness:p.freshness,origin}}
  const line={key:need.key,label:need.label||item.nameVi,item,need,prices,cold:COLD.has(item.foodSafety),chilled:item.foodSafety==='chilled',hints:hints.filter(h=>h.itemId===item.id)};
  lines.push(line);if(!Object.keys(prices).length)unknown.push({key:need.key,label:line.label,reason:'no-price',itemId:item.id});
 }
 // One-stop totals
 const stores={};
 for(const r of ['woolworths','coles','aldi']){const priced=lines.filter(l=>l.prices[r]);stores[r]={retailer:r,total:round(priced.reduce((n,l)=>n+l.prices[r].cost,0)),count:priced.length,coverage:lines.length?round(priced.length/lines.length,3):0,missing:lines.filter(l=>!l.prices[r]).map(l=>l.label),approx:priced.some(l=>l.prices[r].approx)}}
 const common=lines.filter(l=>l.prices.woolworths&&l.prices.coles);
 const w=round(common.reduce((n,l)=>n+l.prices.woolworths.cost,0)),c=round(common.reduce((n,l)=>n+l.prices.coles.cost,0));
 const oneStop={commonCount:common.length,itemCount:lines.length,woolworths:common.length?w:null,coles:common.length?c:null,cheaper:common.length&&w!==c?(w<c?'woolworths':'coles'):null,difference:common.length?round(Math.abs(w-c)):null,commonOnly:true,aldi:stores.aldi.count?{total:stores.aldi.total,count:stores.aldi.count}:null};
 const mainStore=prefs.mainStore&&['woolworths','coles'].includes(prefs.mainStore)?prefs.mainStore:oneStop.cheaper||(stores.coles.count>stores.woolworths.count?'coles':'woolworths');
 oneStop.best=oneStop.cheaper||null;
 // Smart split with minimum-savings fold-back
 const candidates=l=>Object.keys(l.prices).filter(r=>r===mainStore||allowedChannel(l.item,r,prefs));
 let retained=new Set(RETAILER_IDS);const folded=[];
 const assign=()=>{const a=new Map();for(const l of lines){const opts=candidates(l).filter(r=>retained.has(r)||r===mainStore);if(!opts.length){a.set(l,null);continue}
  let pick=opts.sort((x,y)=>l.prices[x].cost-l.prices[y].cost||(x===mainStore?-1:y===mainStore?1:0))[0];
  if(prefs.preferVietFresh&&opts.includes('viet-grocer')&&['fresh','meat','seafood'].includes(l.item.category))pick='viet-grocer';
  a.set(l,pick)}return a};
 let assignment=assign();
 for(let guard=0;guard<10;guard++){
  const stops=new Map();
  for(const[l,r]of assignment){if(!r||r===mainStore)continue;const s=stops.get(r)||{total:0,savings:0};s.total+=l.prices[r].cost;if(l.prices[mainStore])s.savings+=l.prices[mainStore].cost-l.prices[r].cost;stops.set(r,s)}
  const failing=[...stops.entries()].filter(([,s])=>round(s.savings)<minSavings&&round(s.total)<minStopOrder).sort((a,b)=>a[1].savings-b[1].savings);
  if(!failing.length)break;
  const[r,s]=failing[0];retained.delete(r);folded.push({retailer:r,savings:round(s.savings),total:round(s.total)});assignment=assign();
 }
 const stopMap=new Map();
 for(const[l,r]of assignment){const key=r||mainStore;const s=stopMap.get(key)||{retailer:key,delivery:!!RETAILERS[key].delivery,items:[],total:0,savings:0,unknownCount:0};
  if(r){s.items.push({key:l.key,label:l.label,itemId:l.item.id,origin:l.prices[r].origin,cost:l.prices[r].cost,unitPrice:l.prices[r].unitPrice,unitBasis:l.item.unitBasis,approx:l.prices[r].approx,cold:l.cold,chilled:l.chilled,promo:l.prices[r].observation.promo||null,capturedAt:captureTimeOf(l.prices[r].observation),source:l.prices[r].observation.source||null});s.total+=l.prices[r].cost;if(r!==mainStore&&l.prices[mainStore])s.savings+=l.prices[mainStore].cost-l.prices[r].cost}
  else{s.items.push({key:l.key,label:l.label,itemId:l.item.id,cost:null,cold:l.cold,chilled:l.chilled});s.unknownCount++}
  stopMap.set(key,s)}
 const splitStops=[...stopMap.values()].map(s=>({...s,total:round(s.total),savings:round(s.savings)}));
 const comparable=lines.filter(l=>l.prices[mainStore]);
 const base=round(comparable.reduce((n,l)=>n+l.prices[mainStore].cost,0));
 const splitComparable=round(comparable.reduce((n,l)=>{const r=assignment.get(l);return n+(r?l.prices[r].cost:l.prices[mainStore].cost)},0));
 const savings=round(base-splitComparable);
 const split={mainStore,stops:splitStops,total:round(splitStops.reduce((n,s)=>n+s.total,0)),comparableCount:comparable.length,comparableBase:base,comparableSplit:splitComparable,savings,savingsPct:base>0?round(savings/base*100,1):0,folded,minSavings,minStopOrder,extraStops:splitStops.filter(s=>s.retailer!==mainStore).length};
 const route=routeOrder(splitStops);
 const splitMix=sourceMix([...assignment].filter(([,r])=>r).map(([l,r])=>l.prices[r].origin));
 oneStop.sourceMix=sourceMix(common.flatMap(l=>[l.prices.woolworths.origin,l.prices.coles.origin]));split.sourceMix=splitMix;
 const benchmark=[];
 for(const l of lines){const v=l.prices['viet-grocer'];if(!v)continue;const sm=['woolworths','coles','aldi'].filter(r=>l.prices[r]).sort((a,b)=>l.prices[a].cost-l.prices[b].cost)[0];if(!sm)continue;const s=l.prices[sm];benchmark.push({key:l.key,label:l.label,itemId:l.item.id,viet:v.cost,supermarket:{retailer:sm,cost:s.cost,promo:s.observation.promo||null},cheaper:v.cost<=s.cost?'viet-grocer':sm,difference:round(Math.abs(s.cost-v.cost)),approx:v.approx||s.approx})}
 const bulk=lines.filter(l=>l.item.bulkCandidate&&(l.item.category==='household'||l.item.category==='personal')).map(l=>({key:l.key,label:l.label,itemId:l.item.id,unitBasis:l.item.unitBasis,prices:Object.fromEntries(Object.entries(l.prices).map(([r,p])=>[r,{cost:p.cost,unitPrice:p.unitPrice}]))}));
 const trips=tripPlans(lines,prefs);
 return{trips,currency:'AUD',today:opts.today,state:opts.state,itemCount:(items||[]).length,pricedCount:lines.filter(l=>Object.keys(l.prices).length).length,unknown,stores,oneStop,split,route,benchmark,bulk,sourceMix:splitMix,hints:lines.flatMap(l=>l.hints.map(h=>({...h,key:l.key,lineLabel:l.label})))};
}
function sourceMix(origins){const m={family:0,official:0,community:0,shop:0};for(const o of origins)if(o&&Object.hasOwn(m,o))m[o]++;m.total=m.family+m.official+m.community+m.shop;return m}

// ---------- Community Price Pilot (feature-flagged) ----------
// Server community items → observation-like rows for optimizeBasket. Only CONFIRMED and
// still-usable (regular ≤14 days, specials until validUntil) prices enter totals. PENDING
// prices are returned separately as hints. If the user picked branches for a retailer,
// only those branches are used for that retailer; otherwise any branch in the state.
// Shareable: shelf-tag photos and app/website screenshots (image fingerprint + OCR within $0.01),
// "Lưu giá" bookmark captures (page price within $0.01) and confirmed receipt lines. Manual entry never.
const COMMUNITY_SHAREABLE=['shelf-photo','receipt','screenshot','bookmark'];
function canShareToCommunity(o){if(!o||!o.itemId||!COMMUNITY_SHAREABLE.includes(o.evidence?.type))return false;const e=o.evidence;if(e.type==='receipt')return true;if(e.type==='screenshot'&&!(typeof e.imageHash==='string'&&/^[a-f0-9]{64}$/.test(e.imageHash)))return false;return typeof e.ocrPrice==='number'&&Math.abs(e.ocrPrice-o.price)<=0.01+1e-9}
function communityRow(c,origin){return{id:origin+':'+(c.groupId||c.id),groupId:c.groupId||null,itemId:c.itemId,label:c.label,retailer:c.retailer,branchId:c.branchId||null,branchLabel:c.branchLabel||null,state:c.state||null,price:c.price,currency:'AUD',packQty:c.packQty??null,packUnit:c.packUnit??null,units:c.units??null,unitPrice:c.unitPrice??null,unitBasis:c.unitBasis??null,wasPrice:null,promo:c.promo||null,validUntil:c.validUntil||null,observedAt:c.lastObserved||c.observedAt,source:origin,origin,families:c.families||0,status:c.status||null,ageDays:c.ageDays??null,faded:!!c.faded,online:c.online===true,sources:c.sources||[],shop:c.shop||null,capturedAt:c.capturedAt||null,sourceCaptured:c.sourceCaptured||null}}
function communityObservations(items,{branches=[]}={}){
 const preferred=new Set(branches||[]),byRetailer=new Set([...preferred].map(b=>String(b).split(':')[0]));
 const keep=c=>!byRetailer.has(c.retailer)||preferred.has(c.branchId);
 const all=(items||[]).filter(c=>c&&c.itemId&&c.price>0&&keep(c));
 return{confirmed:all.filter(c=>c.status==='confirmed'&&c.usable===true).map(c=>communityRow(c,'community')),hints:all.filter(c=>c.status!=='confirmed'||!c.usable).map(c=>communityRow(c,'community'))};
}
function shopObservations(list){return(list||[]).filter(p=>p&&p.itemId&&p.price>0).map(p=>({...communityRow({...p,lastObserved:p.observedAt,status:'shop'},'shop'),id:'shop:'+p.id,retailer:'viet-grocer'}))}
// Chemist → ALDI → (Amazon delivery, no stop) → Woolworths/Coles → Chợ Việt.
// Any stop carrying raw meat or frozen goods goes after the stops that don't.
function routeOrder(stops){
 const visit=stops.filter(s=>!RETAILERS[s.retailer]?.delivery&&s.items.length);
 const cold=s=>s.items.some(i=>i.cold);
 visit.sort((a,b)=>(cold(a)-cold(b))||(RETAILERS[a.retailer].order-RETAILERS[b.retailer].order));
 const steps=visit.map((s,i)=>({step:i+1,retailer:s.retailer,delivery:false,itemCount:s.items.length,coldItems:s.items.filter(x=>x.cold).map(x=>x.label),chilledItems:s.items.filter(x=>x.chilled).map(x=>x.label),last:i===visit.length-1}));
 const delivery=stops.filter(s=>RETAILERS[s.retailer]?.delivery&&s.items.length).map(s=>({step:0,retailer:s.retailer,delivery:true,itemCount:s.items.length,coldItems:[],chilledItems:[],last:false}));
 return[...delivery,...steps];
}

// ---------- Provenance (ready for a future, moderated community phase) ----------
// visibility: 'family' (only value accepted today); 'community' is reserved.
const VISIBILITY=['family','community'],EVIDENCE=['shelf-photo','receipt','screenshot','bookmark','manual','manual-voice'],CONFIDENCE=['low','medium','high'];
function evidenceType(source){return source==='receipt'?'receipt':source==='screenshot'?'screenshot':source==='bookmark'?'bookmark':'manual'}
// manual/catalogue = low; screenshot/bookmark/shelf-photo whose OCR price matched = medium; receipt/official = high.
function computeConfidence(source,evidence){if(source==='receipt'||source==='official'||evidence?.type==='receipt')return'high';if(['screenshot','bookmark','shelf-photo'].includes(evidence?.type||source)&&evidence?.ocrMatches===true)return'medium';return'low'}
function makeEvidence(source,{imageHash=null,ocrPrice=null,price=null,type=null}={}){const ocr=typeof ocrPrice==='number'&&ocrPrice>0?round(ocrPrice):null;return{type:type&&EVIDENCE.includes(type)?type:evidenceType(source),imageHash:typeof imageHash==='string'&&/^[a-f0-9]{64}$/.test(imageHash)?imageHash:null,ocrPrice:ocr,ocrMatches:ocr==null?null:price!=null&&Math.abs(ocr-price)<0.005}}
function withProvenance(o,{imageHash=null,ocrPrice=null,capturedAt=null,evidenceType=null}={}){const evidence=o.evidence&&EVIDENCE.includes(o.evidence.type)?{...o.evidence,ocrMatches:o.evidence.ocrPrice==null?null:Math.abs(o.evidence.ocrPrice-o.price)<0.005}:makeEvidence(o.source,{imageHash,ocrPrice,price:o.price,type:evidenceType});return{...o,visibility:'family',evidence,capturedAt:o.capturedAt||capturedAt||null,confidence:computeConfidence(o.source,evidence),storeBranchId:o.storeBranchId??o.branchId??null}}
function validProvenance(o){
 if(o.visibility!=null&&o.visibility!=='family')return false;
 const e=o.evidence;if(e!=null&&(typeof e!=='object'||!EVIDENCE.includes(e.type)||!(e.imageHash==null||typeof e.imageHash==='string'&&/^[a-f0-9]{64}$/.test(e.imageHash))||!(e.ocrPrice==null||typeof e.ocrPrice==='number'&&e.ocrPrice>=0&&e.ocrPrice<=10000)||!(e.ocrMatches==null||typeof e.ocrMatches==='boolean')))return false;
 if(o.capturedAt!=null&&(typeof o.capturedAt!=='string'||o.capturedAt.length>40||Number.isNaN(Date.parse(o.capturedAt))))return false;
 if(o.confidence!=null&&!CONFIDENCE.includes(o.confidence))return false;
 return o.storeBranchId==null||typeof o.storeBranchId==='string'&&o.storeBranchId.length<=80;
}
// Flags a unit price outside 40%–250% of the rolling median of the last 35 days
// for the same item (needs at least 3 observations).
function priceSanity(itemId,unitPrice,recentObservations,{today=sydneyToday(),catalog=null,days=STALE_DAYS}={}){
 if(!(unitPrice>0))return{ok:true,reason:'no-unit-price'};
 const item=catalog?catalog.find(i=>i.id===itemId):null,from=addDays(today,-days);
 const values=(recentObservations||[]).filter(o=>o&&o.itemId===itemId&&isDate(o.observedAt)&&o.observedAt>=from&&o.observedAt<=today).map(o=>item?itemUnitPrice(o,item):o.unitPrice).filter(v=>v>0).sort((a,b)=>a-b);
 if(values.length<3)return{ok:true,reason:'insufficient-history',count:values.length};
 const mid=values.length>>1,median=values.length%2?values[mid]:(values[mid-1]+values[mid])/2,ratio=round(unitPrice/median,3);
 if(ratio<0.4)return{ok:false,reason:'too-low',median:round(median,4),ratio,count:values.length};
 if(ratio>2.5)return{ok:false,reason:'too-high',median:round(median,4),ratio,count:values.length};
 return{ok:true,reason:'within-range',median:round(median,4),ratio,count:values.length};
}

// ---------- Persona ----------
function tripsFromReceipts(receipts,{today=sydneyToday(),days=28,ingredientGroup=null}={}){
 const from=addDays(today,-days),byDate=new Map();
 for(const r of receipts||[]){if(!isDate(r?.date)||r.date<from||r.date>today)continue;const retailer=detectRetailer(r.store)||'other';const t=byDate.get(r.date)||{date:r.date,retailers:new Set(),fresh:0,freshViet:0};t.retailers.add(retailer);
  for(const i of r.items||[]){const g=ingredientGroup&&i.ingredient?ingredientGroup(i.ingredient):null;if(g==='meat'||g==='veg'){const v=Math.abs(+i.total||0);t.fresh+=v;if(retailer==='viet-grocer')t.freshViet+=v}}
  byDate.set(r.date,t)}
 return[...byDate.values()].map(t=>({...t,retailers:[...t.retailers]}));
}
function detectPersona(trips,{override=null}={}){
 const n=(trips||[]).length;
 const base={minSavings:5,minStopOrder:15,defaultView:'one-stop',splitOpen:false,preferVietFresh:false};
 const presets={convenience:{...base,minSavings:15,defaultView:'one-stop'},'smart-saver':{...base,defaultView:'split',splitOpen:true},'local-fresh':{...base,defaultView:'split',splitOpen:true,preferVietFresh:true},learning:base};
 if(override&&presets[override])return{persona:override,overridden:true,trips:n,prefs:presets[override]};
 if(n<3)return{persona:'learning',trips:n,prefs:base};
 const single=trips.filter(t=>t.retailers.length<=1).length/n;
 const fresh=trips.reduce((s,t)=>s+(t.fresh||0),0),viet=trips.reduce((s,t)=>s+(t.freshViet||0),0);
 const used=new Set(trips.flatMap(t=>t.retailers));
 let persona;
 if(single>=0.7&&!(fresh>0&&viet/fresh>=0.6))persona='convenience';
 else if(fresh>0&&viet/fresh>=0.5)persona='local-fresh';
 else if(used.has('aldi')||used.has('chemist')||used.size>=2)persona='smart-saver';
 else persona='convenience';
 return{persona,trips:n,singleShare:round(single,2),freshVietShare:fresh?round(viet/fresh,2):null,prefs:presets[persona]};
}

// ---------- Receipts → observations ----------
function receiptObservations(receipts,catalog,{ingredientUnit=null,state=null}={}){
 const byIngredient=new Map();for(const i of catalog||[])if(i.ingredientId&&!byIngredient.has(i.ingredientId))byIngredient.set(i.ingredientId,i);
 const out=[];
 for(const r of receipts||[]){if((r.currency||'AUD')!=='AUD'||!isDate(r.date))continue;const retailer=detectRetailer(r.store)||'other';
  for(const line of r.items||[]){const item=line.ingredient&&byIngredient.get(line.ingredient);if(!item||!(line.total>0)||!(Number.isFinite(line.quantity)&&line.quantity>0))continue;
   const unit=ingredientUnit?ingredientUnit(line.ingredient):null;if(!unit)continue;const packUnit=unit==='quả'?'each':unit==='ml'?'mL':unit;
   const unitPrice=unitPriceOf(line.total,line.quantity,packUnit,packUnit==='each'?line.quantity:null,item.unitBasis);if(unitPrice==null)continue;
   out.push({id:('receipt:'+r.id+':'+(line.id||out.length)).replace(/[^\w:.-]/g,'').slice(0,120),itemId:item.id,label:String(line.label||item.nameVi).slice(0,160),retailer,branchId:null,state,price:round(line.total),currency:'AUD',packQty:line.quantity,packUnit,units:packUnit==='each'?line.quantity:null,unitPrice,unitBasis:item.unitBasis,wasPrice:null,promo:null,validUntil:null,observedAt:r.date,observedBy:r.createdBy||null,source:'receipt',note:String(r.store||'').slice(0,120),visibility:'family',evidence:{type:'receipt',imageHash:null,ocrPrice:null,ocrMatches:null,receiptId:String(r.id||''),lineId:line.id!=null?String(line.id):null},capturedAt:r.createdAt||null,confidence:'high',storeBranchId:null})}}
 return out;
}

// ---------- capture time (v1.7) ----------
// "2 giờ trước · T4 01/11 06:42" / "2 h ago · Wed 1 Nov 06:42", in the viewer's local time
// (timeZone only for tests). `at` is a capture time (ISO) or, for old rows, a day (YYYY-MM-DD,
// shown without a clock time). old = more than 7 days ago (muted "cũ / old" style).
const VI_DOW=['CN','T2','T3','T4','T5','T6','T7'];
function captureTimeOf(o){const e=o&&o.evidence||{};return e.capturedAt||o?.capturedAt||o?.observedAt||null}
function capturedLabel(at,lang='vi',now=Date.now(),timeZone){if(typeof at!=='string')return null;const day=/^\d{4}-\d{2}-\d{2}$/.test(at),t=day?Date.parse(at+'T12:00:00+10:00'):Date.parse(at);if(!Number.isFinite(t))return null;
 const en=lang==='en',diff=Math.max(0,now-t),min=Math.floor(diff/60000),hrs=Math.floor(min/60),days=day?Math.max(0,dayDiff(sydneyToday(new Date(now)),at)):Math.floor(hrs/24);
 const rel=day?(days===0?(en?'today':'hôm nay'):days===1?(en?'yesterday':'hôm qua'):en?days+' days ago':days+' ngày trước'):min<1?(en?'just now':'vừa xong'):min<60?(en?min+' min ago':min+' phút trước'):hrs<24?(en?hrs+' h ago':hrs+' giờ trước'):days===1?(en?'yesterday':'hôm qua'):en?days+' days ago':days+' ngày trước';
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone,weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(t)).map(p=>[p.type,p.value]));
 const dnum=new Intl.DateTimeFormat('en-GB',{timeZone,day:'2-digit',month:'2-digit'}).format(new Date(t)),dow=new Intl.DateTimeFormat('en-US',{timeZone,weekday:'short'}).format(new Date(t)),viDow=VI_DOW[['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(dow)];
 const clock=day?'':' '+parts.hour+':'+parts.minute,abs=en?`${dow} ${parts.day} ${parts.month}${clock}`:`${viDow} ${dnum}${clock}`;
 return{rel,abs,text:rel+' · '+abs,old:days>7,iso:new Date(t).toISOString(),day}}
const api={tripPlans,tripMinutes,setSupportedStates,unsupportedMessage,ALL_STATES,RETAILERS,RETAILER_IDS,CATEGORIES,SAFETY,SOURCES,PROMOS,BASIS,FRESH_DAYS,STALE_DAYS,SUPPORTED_STATES,UNSUPPORTED,norm,sydneyToday,addDays,dayDiff,postcodeState,cycleId,cycleEnd,nextSpecialBuyDays,defaultDealEnd,unitPriceOf,convertUnitPrice,basisMultiplier,detectRetailer,retailerFromHost,matchCatalog,parsePriceText,extractProductPage,bookmarkletSource,captureToDraft,validObservation,freshness,itemUnitPrice,bestPrice,allowedChannel,optimizeBasket,routeOrder,tripsFromReceipts,detectPersona,receiptObservations,VISIBILITY,EVIDENCE,CONFIDENCE,computeConfidence,makeEvidence,withProvenance,validProvenance,priceSanity,sourceMix,canShareToCommunity,communityObservations,shopObservations,COMMUNITY_SHAREABLE,capturedLabel,captureTimeOf};
root.PriceScout=api;
})(globalThis);
