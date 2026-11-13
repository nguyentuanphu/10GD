// v1.7.21 (Henry, 14 Nov 2026: “Rất nhiều chỗ bị so giá sai … Kiểm tra lại cách thức ghép”): the online price matcher must
// pick a product whose KIND is the ingredient — not a product that only uses it as a flavour or a modifier (Lemon → “Lemon &
// Pepper Tuna”, Salt → “Salt Reduced Spreadable Butter”, Gravy beef → “Beef And Gravy Puff Pastry Parcel”). Every live label
// (public product-photo list) and the bug family are checked; saved data from earlier runs is re-checked when read.
import assert from 'node:assert/strict';
import {productIsItem,matchProduct,headIndex,plainRank} from '../netlify/lib/scout-match.mjs';
import {pinchPrices,refreshOnlinePrices,stillMatches,departmentFits,ONLINE_PHOTOS_KEY,ONLINE_KEY} from '../netlify/lib/online-prices.mjs';
import {officialPrices} from '../netlify/lib/grocery-pricing.mjs';
import {ONLINE_PRODUCTS_20261114 as FX} from './fixtures/online-products-20261114.mjs';

// ---- every reviewed label: right products match, wrong ones do not
{const bad:string[]=[];for(const r of FX){if(r.verdict==='doubtful')continue;const got=productIsItem(r.label,r.itemId);if(got!==(r.verdict==='right'))bad.push(`${r.itemId} ← “${r.label}”: ${got?'matched':'refused'}, expected ${r.verdict}`)}
 assert.deepEqual(bad,[],'reviewed product verdicts');
 assert.ok(FX.filter(r=>!r.corpus&&r.verdict==='wrong').length>=20,'the live list has the wrong matches Henry saw')}
// Henry's three examples, spelled out
assert.equal(productIsItem('Lemon & Pepper Tuna 95g','chanh-vang'),false,'lemon is a flavour of the tuna');
assert.equal(productIsItem('Lemons 5 Pack','chanh-vang'),true);
assert.equal(productIsItem('Dairy Soft Salt Reduced Spreadable Butter','muoi'),false,'“salt reduced” is a modifier');
assert.equal(productIsItem('Shredded Chicken Breast Springwater And Sea Salt 85g','muoi'),false,'“and sea salt” is a flavour of canned chicken');
assert.equal(productIsItem('Beef And Gravy Puff Pastry Parcel','bo-ham'),false,'a ready meal is not gravy beef');
assert.equal(productIsItem('Gravy Beef per kg','bo-ham'),true,'the raw cut is');
assert.equal(productIsItem('Whole RSPCA Approved Chicken per kg','ga-nguyen-con'),true,'a whole chicken sold per kg is the right product (its $ is per kg)');
// the head noun decides, a trailing list is contents
assert.equal(matchProduct('Lemon & Pepper Tuna 95g').itemId,'ca-ngu-hop');
assert.equal(matchProduct('Frozen Mixed Vegetables Carrot Peas & Corn').itemId,'rau-dong-lanh');
assert.equal(matchProduct('Free Range Pork Loin Chops').itemId,'suon-cot-let');
assert.equal(headIndex('Sauce Soy 500ml, Regular'),0,'a dominant form word is the head wherever it stands');
// fresh produce: plain / loose products come first
assert.ok(plainRank('Lemons Loose','chanh-vang')<=plainRank('Lemon Lime Bitters Drink','chanh-vang'));
assert.equal(plainRank('Brown Onions 1kg','hanh-tay'),0);
// store department, when the provider sends one
assert.equal(departmentFits('chanh-vang','Pantry > Canned Fish'),false);assert.equal(departmentFits('chanh-vang','Fruit & Veg'),true);assert.equal(departmentFits('chanh-vang',''),true,'unknown → the name decides');
console.log('PASS online match: head noun, modifiers, flavours, department forms over every reviewed live label');

// ---- Pinch: the wrong product is refused, so the store shows no price rather than a wrong one (rule 32)
const lemon={id:'chanh-vang',nameEn:'Lemon',aliases:['lemons','lemon'],channels:['woolworths','coles','aldi'],unitBasis:'per_each'};
{const fetchFn=async()=>new Response(JSON.stringify({data:{items:[{candidates:[
  {retailer:'ALDI',name:'Lemon & Pepper Tuna 95g',price:0.99,product_id:'a1',size:'95g'},
  {retailer:'Coles',name:'Lemons 5 Pack',price:4.5,product_id:'c1',size:'5 pack'},
  {retailer:'Woolworths',name:'Lemon Lime Bitters Drink 1.25L',price:2,product_id:'w0'},
  {retailer:'Woolworths',name:'Lemons Loose',price:1.2,product_id:'w1',category:'Fruit & Veg'},
  {retailer:'Woolworths',name:'Lemon Each',price:0.9,product_id:'w2',category:'Pantry'}]}]}}),{status:200});
 const p=await pinchPrices([lemon],{key:'pk_test',fetchFn,today:'2026-11-14'});const by=Object.fromEntries(p.observations.map((o:any)=>[o.retailer,o.label]));
 assert.equal(by.aldi,undefined,'ALDI has no lemon in this data: no price, not the tuna');assert.equal(by.coles,'Lemons 5 Pack');assert.equal(by.woolworths,'Lemons Loose','a product filed under another department is refused')}

// ---- saved data from earlier runs: re-checked when read (prices, photos) and when the next run merges
const memStore=()=>{const m=new Map<string,any>();return{m,async get(k:string){return m.has(k)?structuredClone(m.get(k)):null},async setJSON(k:string,v:any){m.set(k,structuredClone(v))}}};
const old=(itemId:string,retailer:string,label:string,price:number)=>({id:`online-pinch-${itemId}-${retailer}`,itemId,label,retailer,state:null,price,currency:'AUD',packQty:null,packUnit:null,units:null,unitPrice:null,unitBasis:null,observedAt:'2026-11-11',observedBy:'Pinch',source:'official',note:'online · auto',photo:'https://dm.apac.cms.aldi.cx/is/image/x.jpg'});
{const cache=memStore();await cache.setJSON(ONLINE_KEY('2026-11-11'),{version:1,cycle:'2026-11-11',observations:[old('chanh-vang','aldi','Lemon & Pepper Tuna 95g',0.99),old('chanh-vang','coles','Lemons 5 Pack',4.5),old('muoi','coles','Dairy Soft Salt Reduced Spreadable Butter',6.4),old('bo-ham','aldi','Gravy Beef per kg',18.49)]});
 const off:any=await officialPrices(cache,null,'2026-11-11');const labels=off.observations.map((o:any)=>o.label).sort();
 assert.deepEqual(labels,['Gravy Beef per kg','Lemons 5 Pack'],'wrong products saved before this release are not shown');
 assert.equal(stillMatches({itemId:'w-gravy-beef',label:'anything'}),true,'family search words keep their own check');
 // the next run: an old wrong photo is dropped even when no new product replaces it; old wrong observations are not merged back
 await cache.setJSON(ONLINE_PHOTOS_KEY,{version:1,items:{'chanh-vang':{photo:'https://dm.apac.cms.aldi.cx/is/image/tuna.jpg',retailer:'aldi',label:'Lemon & Pepper Tuna 95g'},'bo-ham':{photo:'https://dm.apac.cms.aldi.cx/is/image/beef.jpg',retailer:'aldi',label:'Gravy Beef per kg'}}});
 const pork={id:'thit-ba-chi',nameEn:'Pork belly',aliases:['pork belly'],channels:['coles'],unitBasis:'per_kg'};
 const fetchFn=async()=>new Response(JSON.stringify({data:{items:[{candidates:[{retailer:'Coles',name:'Pork Belly per kg',price:16,product_id:'p1',image_url:'https://productimages.coles.com.au/p1.jpg'}]}]}}),{status:200});
 await refreshOnlinePrices({items:[pork],env:{PINCH_API_KEY:'k'},settings:{flags:{onlinePinch:true}},fetchFn,cacheStore:cache,statusStore:cache,cycle:'2026-11-11',today:'2026-11-14'});
 const ph=(await cache.get(ONLINE_PHOTOS_KEY)).items;assert.equal(ph['chanh-vang'],undefined,'the tuna photo goes with the tuna');assert.equal(ph['bo-ham'].label,'Gravy Beef per kg');assert.ok(ph['thit-ba-chi']);
 const saved=(await cache.get(ONLINE_KEY('2026-11-11'))).observations.map((o:any)=>o.label).sort();assert.deepEqual(saved,['Gravy Beef per kg','Lemons 5 Pack','Pork Belly per kg'])}
console.log('PASS online match: wrong products refused per store (no price instead of a wrong one); saved wrong products and photos dropped when read and at the next run');
