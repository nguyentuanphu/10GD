'use strict';
function cookedHistory(s,asOf=sydneyDate()){
 const events=[];
 for(const week of Object.values(s.weeks||{}))for(const[date,day]of Object.entries(week.days||{})){
  if(date>asOf)continue;
  for(const type of (typeof MEAL_TYPES!=='undefined'?MEAL_TYPES:['lunch','dinner'])){const m=day[type];if(!m?.cooked||!m.recipes?.length||mealServings(m,s)<=0)continue;
   for(const r of new Map(m.recipes.filter(r=>!r.batchId).map(r=>[r.id,r])).values())events.push({date,type,recipe:r});
  }
 }
 for(const b of Object.values(s.familyBatches||{}))if(b.cooked&&(b.cookedAt||b.ownerDate)<=asOf)events.push({date:b.cookedAt||b.ownerDate,type:'batch',recipe:b.recipe});
 return events.sort((a,b)=>b.date.localeCompare(a.date));
}
function recipeHistory(s,id,asOf=sydneyDate()){
 const events=cookedHistory(s,asOf).filter(e=>e.recipe.id===id),last=events[0]?.date||null;
 return{count:events.length,count30:events.filter(e=>e.date>=addDays(asOf,-29)).length,last,daysAgo:last?Math.round((parseDate(asOf)-parseDate(last))/86400000):null};
}
function historyRecipeAdjustment(s,r,date=sydneyDate()){
 const h=recipeHistory(s,r.id,date),feedback=s.recipeFeedback?.[r.id],gap=feedback?.repeatDays||14;
 if(feedback?.rating==='skip')return -100;
 return(h.daysAgo!==null&&h.daysAgo<gap?-12:0)-h.count30*2+(feedback?.rating==='like'?3:0)+(h.count===0?3:0);
}
function recipeSuggestions(s,{date=sydneyDate(),category=null,exclude=[],limit=4}={}){
 const ranked=s.recipes.filter(r=>r.recipeKind!=='dressing'&&(!s.preferences.familyPlanner||r.custom||r.origin==='family')&&(!category||r.category===category)&&!exclude.includes(r.id)&&r.ingredients.length&&r.time<=s.preferences.maxTime&&allowedRecipe(r,s)&&s.recipeFeedback?.[r.id]?.rating!=='skip').map(r=>{
  const h=recipeHistory(s,r.id,date),owned=r.ingredients.filter(i=>!PANTRY_STAPLE_IDS.has(i.id)&&s.pantry.some(p=>p.ingredient===i.id&&p.qty>0&&(!p.expiry||p.expiry>=date))).length;
  const expiring=r.ingredients.filter(i=>s.pantry.some(p=>p.ingredient===i.id&&p.qty>0&&p.expiry>=date&&p.expiry<=addDays(date,2))).length;
  return{recipe:r,history:h,owned,expiring,score:historyRecipeAdjustment(s,r,date)+owned*2+expiring*3+(r.favorite?2:0)-scoringRecipeCost(r)*.04};
 }).sort((a,b)=>b.score-a.score||a.recipe.id.localeCompare(b.recipe.id));
 const picks=[];while(ranked.length&&picks.length<limit){ranked.sort((a,b)=>{const adjusted=x=>x.score-picks.filter(p=>p.recipe.protein===x.recipe.protein).length*5-picks.filter(p=>p.recipe.category===x.recipe.category).length*3;return adjusted(b)-adjusted(a)||a.recipe.id.localeCompare(b.recipe.id)});picks.push(ranked.shift())}return picks;
}
function cookingStats(s,asOf=sydneyDate()){
 const history=cookedHistory(s,asOf),recent=history.filter(e=>e.date>=addDays(asOf,-29)),counts=new Map();
 for(const e of recent){const x=counts.get(e.recipe.id)||{recipe:e.recipe,count:0,last:e.date};x.count++;counts.set(e.recipe.id,x)}
 return{events:history,recent,meals:new Set(recent.map(e=>e.date+'/'+e.type)).size,unique:counts.size,top:[...counts.values()].sort((a,b)=>b.count-a.count||b.last.localeCompare(a.last)),protein:Object.fromEntries(['pork','chicken','beef','fish','shrimp','egg','plant'].map(p=>[p,recent.filter(e=>['main','noodle'].includes(e.recipe.category)&&e.recipe.protein===p).length]))};
}
function validInsightState(s){return s.recipeFeedback===undefined||s.recipeFeedback&&typeof s.recipeFeedback==='object'&&!Array.isArray(s.recipeFeedback)&&Object.values(s.recipeFeedback).every(x=>x&&['like','neutral','skip'].includes(x.rating)&&[7,14,21,30].includes(x.repeatDays))}
// Saved products (validProduct below checks product.retailer against these ids): the registry's `product` view, which stays
// Coles, Woolworths and Chemist Warehouse so older devices accept synced products (store-registry.ts, audit B9).
const RETAILERS=Object.fromEntries(STORE_REGISTRY.filter((s:any)=>s.product).sort((a:any,b:any)=>a.rank-b.rank).map((s:any)=>[s.id,{name:s.name,host:s.product.host}]));
function retailerSearch(retailer,query){const q=encodeURIComponent(String(query).slice(0,150)),s:any=Object.hasOwn(RETAILERS,retailer)?storeById(retailer):null;return s?.product?.search?s.product.search+q:null}/* v1.7.21 step 2: IGA, Spudshed and FoodWorks have no online search */
function safeProductURL(raw,retailer){if(!raw)return '';try{const u=new URL(raw),host=RETAILERS[retailer]?.host;return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&host&&(u.hostname===host||u.hostname==='www.'+host)?u.href:''}catch{return ''}}
// v1.7.19 (more stores, step 1): a product from another registry store (ALDI, Harris Farm, IGA, Costco …, saved by a newer
// device) is accepted and kept. Its link is kept only when it is a plain https address, and is shown only once this app knows
// that store's website (safeProductURL); the forms and the CSV import still offer only RETAILERS.
const productURLShape=(raw:any)=>{try{const u=new URL(raw);return typeof raw==='string'&&raw.length<=2000&&u.protocol==='https:'&&!u.username&&!u.password&&!u.port}catch{return false}};
const productStoreName=(id:string)=>RETAILERS[id]?.name||(typeof storeAcceptedName==='function'?storeAcceptedName(id):String(id||''));
function validProduct(p){return p&&typeof p.id==='string'&&p.id.length<=100&&(Object.hasOwn(RETAILERS,p.retailer)||typeof storeIdAccepted==='function'&&storeIdAccepted(p.retailer))&&typeof p.name==='string'&&p.name.trim().length>0&&p.name.length<=150&&typeof p.size==='string'&&p.size.trim().length>0&&p.size.length<=80&&typeof p.branch==='string'&&p.branch.length<=150&&typeof p.barcode==='string'&&p.barcode.length<=50&&(p.price===null||Number.isFinite(p.price)&&p.price>=0&&p.price<=999999999)&&['manual','receipt','csv'].includes(p.source)&&/^\d{4}-\d{2}-\d{2}$/.test(p.checkedAt)&&Number.isFinite(Date.parse(p.checkedAt))&&typeof p.url==='string'&&(!p.url||!!safeProductURL(p.url,p.retailer)||!PRODUCT_STORES_V1.includes(p.retailer)&&productURLShape(p.url))/* v1.7.21 step 2: stores other than the first three keep the step-1 rule (any plain https link), so nothing a v1.7.19 device saved is refused; the form asks for the store's own website, and a link is shown only when it is on that website (safeProductURL) */}
const PRODUCT_STORES_V1=['coles','woolworths','chemist'];
function validProductState(s){return s.products===undefined||Array.isArray(s.products)&&s.products.length<=2000&&s.products.every(validProduct)&&new Set(s.products.map(p=>p.id)).size===s.products.length}
function productTotal(product,amount){if(!Number.isInteger(amount)||amount<1||amount>1000)throw Error('Invalid product quantity');return product.price===null?null:Math.round(product.price*amount*100)/100}
function productPriceStale(p,asOf=sydneyDate()){return p.checkedAt>asOf||p.checkedAt<addDays(asOf,-7)}
// RFC4180-style quoted cells, including escaped quotes and embedded newlines.
function parseProductCSV(text){
 if(typeof text!=='string'||text.length>1000000)throw Error('CSV too large');const rows=[];let row=[],cell='',quoted=false;
 text=text.replace(/^\uFEFF/,'');for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++}else quoted=!quoted}else if(c===','&&!quoted){row.push(cell);cell=''}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v.trim()))rows.push(row);row=[];cell=''}else cell+=c}
 if(quoted)throw Error('Unclosed CSV quote');row.push(cell);if(row.some(v=>v.trim()))rows.push(row);if(rows.length>2001)throw Error('Maximum 2000 products');const headers=(rows.shift()||[]).map(x=>x.trim().toLowerCase());if(!['retailer','name','price','size','checkedat'].every(k=>headers.includes(k)))throw Error('Required columns: retailer,name,price,size,checkedAt');return rows.map((r,index)=>{const v=Object.fromEntries(headers.map((h,i)=>[h,(r[i]||'').trim()]));const p={id:'import-'+index,retailer:v.retailer,name:v.name,price:v.price===''?null:Number(v.price),size:v.size,branch:v.branch||'',barcode:v.barcode||'',checkedAt:v.checkedat,url:v.url||'',source:'csv'};if(!Object.hasOwn(RETAILERS,p.retailer)||!validProduct(p))throw Error('Invalid product at CSV row '+(index+2));return p})
}

// v1.7.19 (audit B9): the chains the app knows (the family's own places come first), offered wherever a store is typed or chosen.
// Taken from the one store registry (store-registry.ts). Display only — saved values and validators are unchanged.
function storeChoiceNames(st:any=(typeof state!=="undefined"?state:null)){const own=((st&&st.stores)||[]).map((s:any)=>String(s.name||'').trim()).filter(Boolean);const seen=new Set<string>();return [...own,...storeChainNames(st?.preferences?.currency==='VND'?'VND':'AUD')].filter(n=>{const k=n.toLowerCase();if(seen.has(k))return false;seen.add(k);return true})}
(globalThis as any).storeChoiceNames=storeChoiceNames;
