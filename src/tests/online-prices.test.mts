// v1.7.5 national online prices: Pinch (primary) and WhichGrocer (cross-check), with mocked providers (CI needs no keys
// and spends no credits). Matching guard, size/unit parsing, budget, cross-check hold, switches, failure keeps old data,
// and the merge into the existing official-price path used by So Giá.
import assert from 'node:assert/strict';
import {parseSize,unitPriceFor,nameMatches,isItem,pinchPrices,whichGrocerPrices,crossCheck,refreshOnlinePrices,ONLINE_KEY,ONLINE_STATUS_KEY,ONLINE_MAPPING_KEY,ONLINE_PROPOSALS_KEY} from '../netlify/lib/online-prices.mjs';
import {officialPrices} from '../netlify/lib/grocery-pricing.mjs';

const porkBelly={id:'thit-ba-chi',nameEn:'Pork belly',aliases:['pork belly','ba roi'],channels:['woolworths','coles','aldi'],unitBasis:'per_kg'};
const waterSpinach={id:'rau-muong',nameEn:'Water spinach',aliases:['kangkong','ong choy','morning glory'],channels:['woolworths','coles'],unitBasis:'per_kg'};
const milk={id:'sua-tuoi',nameEn:'Full cream milk',aliases:['full cream milk'],channels:['woolworths','coles','aldi'],unitBasis:'per_L'};
const memStore=()=>{const m=new Map<string,any>();return{m,async get(k:string){return m.has(k)?structuredClone(m.get(k)):null},async setJSON(k:string,v:any){m.set(k,structuredClone(v))}}};

// ---- parsing
assert.deepEqual(parseSize('900g - 1.5kg'),{packQty:900,packUnit:'g'});assert.deepEqual(parseSize('approx. 1.3kg'),{packQty:1300,packUnit:'g'});
assert.deepEqual(parseSize('2L'),{packQty:2000,packUnit:'mL'});assert.deepEqual(parseSize('6 pack'),{packQty:6,packUnit:'each'});assert.deepEqual(parseSize('bunch'),{packQty:null,packUnit:null});
assert.equal(unitPriceFor('per_kg',16.49,'1KG'),16.49);assert.equal(unitPriceFor('per_kg','$18.00 / 1KG',null),18);assert.equal(unitPriceFor('per_kg',0.9988,'100G'),9.99);
assert.equal(unitPriceFor('per_L','$1.55 / 1L',null),1.55);assert.equal(unitPriceFor('per_kg','$1.55 / 1L',null),null,'never mixes kg and litres');
// ---- matching guard
assert.equal(nameMatches(porkBelly,'Coles Pork Belly Roast Boneless'),true);assert.equal(nameMatches(porkBelly,'Pork Loin Chops'),false);
assert.equal(nameMatches(waterSpinach,'Baby Spinach Leaves 120g'),false,'baby spinach is not water spinach');assert.equal(nameMatches(waterSpinach,'Kangkong Bunch'),true);
// the reviewed matcher refuses processed products found in the live run (5 Nov 2026)
for(const [id,name] of [['muc','Squid Brand Fish Sauce'],['ngo','Tilda Microwave Coriander & Lime Rice Cups'],['muoi','Flora Margarine Spread Salt Reduced'],['tieu',"Captain's Table Cracked Black Pepper Water Crackers"],['sa','Resolv Kitchen Cleaner Pod Lemongrass & Lime'],['bo','Holy Moly Smashed Avocado Dip']])assert.equal(isItem({id},name),false,id+' ← '+name);
assert.equal(isItem({id:'thit-ba-chi'},'Woolworths Pork Belly Roast'),true);

// ---- Pinch basket compare (mocked)
let pinchCalls=0;
const pinchFetch=async(url:string,init:any)=>{pinchCalls++;assert.match(url,/\/basket\/compare$/);assert.match(init.headers.Authorization,/^Bearer /);const q=JSON.parse(init.body).items.map((x:any)=>x.query);
 const items=q.map((query:string)=>query==='Pork belly'?{query,cheapest:{Woolworths:{product_id:'764465',name:'Woolworths Pork Belly Roast',price:27,size:'900g - 1.5kg'},Coles:{product_id:'c1',name:'Pork Belly Roast Boneless',price:18.2,size:'approx. 1.3kg'},'Harris Farm':{product_id:'h1',name:'Cisco Pork Belly',price:7.99,size:'800g'},Aldi:{product_id:'a9',name:'Pork Loin Steaks',price:9,size:'500g'}},
   candidates:[{product_id:'764465',retailer:'Woolworths',name:'Woolworths Pork Belly Roast',price:27,was_price:30,is_on_special:true,size:'900g - 1.5kg',cup_price:18,cup_measure:'1KG'},{product_id:'c1',retailer:'Coles',name:'Pork Belly Roast Boneless',price:18.2,size:'approx. 1.3kg',cup_price:14,cup_measure:'1KG'}]}
  :{query,cheapest:{Woolworths:{product_id:'w2',name:'Baby Spinach 120g',price:3,size:'120g'}},candidates:[]});
 return new Response(JSON.stringify({data:{items},meta:{tier:'free'}}),{status:200})};
const p=await pinchPrices([porkBelly,waterSpinach],{key:'pk_test',fetchFn:pinchFetch,today:'2026-11-05'});
assert.equal(pinchCalls,1,'≤ 5 items per request');
assert.deepEqual(p.observations.map((o:any)=>o.retailer).sort(),['coles','woolworths'],'Harris Farm (not a So Giá retailer) and the wrong ALDI product are skipped; baby spinach is not water spinach');
const ww=p.observations.find((o:any)=>o.retailer==='woolworths');assert.equal(ww.unitPrice,18);assert.equal(ww.unitBasis,'per_kg');assert.equal(ww.wasPrice,30);assert.equal(ww.promo,'special');assert.equal(ww.observedBy,'Pinch');assert.equal(ww.observedAt,'2026-11-05');assert.equal(ww.source,'official');
assert.deepEqual(ww.packQty,900);

// ---- WhichGrocer search (mocked): budget, 5 s pacing, stale/out-of-stock skipped, cheapest unit price per retailer
let wgCalls=0,waits=0;
const wgFetch=async(url:string)=>{wgCalls++;const q=new URL(url).searchParams.get('q');const data=q==='Pork belly'?[
 {id:'w1',name:'woolworths pork belly roast 900g 1.5kg',store:'woolworths',price:27,cup_price:'$18.00 / 1KG',weight:900,uom:'g'},
 {id:'c1',name:'coles pork belly roast',store:'coles',price:24,cup_price:'$19.00 / 1KG',weight:1300,uom:'g'},
 {id:'c2',name:'coles pork belly slices',store:'coles',price:9,cup_price:'$30.00 / 1KG',weight:300,uom:'g',is_stale:true},
 {id:'a1',name:'aldi pork belly per kg',store:'aldi',price:16.49,cup_price:'$16.49 / 1KG',weight:1000,uom:'g',out_of_stock:true}]:[];
 return new Response(JSON.stringify({data,meta:{credits_remaining:150}}),{status:200})};
const w=await whichGrocerPrices([porkBelly,waterSpinach,milk],{key:'wg_test',fetchFn:wgFetch,today:'2026-11-05',maxCredits:2,wait:async()=>{waits++}});
assert.equal(wgCalls,2,'stops at the credit budget');assert.equal(waits,1,'1 request per 5 s');assert.equal(w.remaining,150);
assert.deepEqual(w.observations.map((o:any)=>o.retailer+':'+o.unitPrice).sort(),['coles:19','woolworths:18']);

// ---- cross-check: Woolworths agrees (18 vs 18) → checked; Coles 14 vs 19 (26 %) → held, not shown
const cc=crossCheck(p.observations,w.observations);
assert.equal(cc.held.length,1);assert.equal(cc.held[0].retailer,'coles');assert.equal(cc.held[0].diff,26);
assert.ok(cc.kept.some((o:any)=>o.retailer==='woolworths'&&/2 sources/.test(o.note)));assert.ok(!cc.kept.some((o:any)=>o.retailer==='coles'),'disagreeing price is not shown');

// ---- refresh: switches off → nothing fetched or written
const cache=memStore();let fetched=0;const anyFetch=async(u:string,i:any)=>{fetched++;return String(u).includes('pinch')?pinchFetch(u,i):wgFetch(u)};
const off=await refreshOnlinePrices({items:[porkBelly],env:{PINCH_API_KEY:'k'},settings:{flags:{}},fetchFn:anyFetch,cacheStore:cache,statusStore:cache,cycle:'2026-11-04',today:'2026-11-05'});
assert.equal(off.skipped,'disabled');assert.equal(fetched,0);assert.ok(!cache.m.has(ONLINE_KEY('2026-11-04')));
// on → saved for the cycle with attribution; the owner-facing status never contains a key
const env={PINCH_API_KEY:'pk_live_SECRET',WHICHGROCER_API_KEY:'wg_live_SECRET'};
const on=await refreshOnlinePrices({items:[porkBelly,waterSpinach],env,settings:{flags:{onlinePinch:true,onlineWhichGrocer:true}},fetchFn:anyFetch,cacheStore:cache,statusStore:cache,cycle:'2026-11-04',today:'2026-11-05',wait:async()=>{}});
// nothing is confirmed yet → no prices for families, proposals for Studio review
assert.ok(!cache.m.has(ONLINE_KEY('2026-11-04')),'unreviewed products are never shown');const props=cache.m.get(ONLINE_PROPOSALS_KEY).items;assert.ok(props.some((x:any)=>x.itemId==='thit-ba-chi'&&x.retailer==='woolworths'&&x.productId==='764465'));assert.equal(on.confirmed,0);
// the owner confirms the Woolworths product → the next run saves its price
cache.m.set(ONLINE_MAPPING_KEY,{'thit-ba-chi':{woolworths:{productId:'764465',ok:true,label:'Woolworths Pork Belly Roast',by:'henry',at:'2026-11-05',rejected:[]}}});
const on2=await refreshOnlinePrices({items:[porkBelly,waterSpinach],env,settings:{flags:{onlinePinch:true,onlineWhichGrocer:true}},fetchFn:anyFetch,cacheStore:cache,statusStore:cache,cycle:'2026-11-04',today:'2026-11-05',wait:async()=>{}});
assert.equal(on2.confirmed,1);const file=cache.m.get(ONLINE_KEY('2026-11-04'));assert.deepEqual(file.observations.map((o:any)=>o.retailer+':'+o.productId),['woolworths:764465'],'only the confirmed product');assert.deepEqual(file.attribution,['Price data by Pinch','Product data by WhichGrocer']);
assert.equal(on2.held.length,1);assert.ok(!JSON.stringify(cache.m.get(ONLINE_STATUS_KEY)).includes('SECRET'),'keys never stored');
// provider down → previous prices kept, nothing invented
const down=async()=>new Response('{}',{status:503});
const keep=await refreshOnlinePrices({items:[porkBelly],env,settings:{flags:{onlinePinch:true}},fetchFn:down,cacheStore:cache,statusStore:cache,cycle:'2026-11-04',today:'2026-11-06'});
assert.equal(keep.kept,'previous');assert.deepEqual(cache.m.get(ONLINE_KEY('2026-11-04')),file,'last saved prices untouched');

// ---- So Giá's official path: online prices for NSW and QLD, falling back to the previous cycle with their dates
const offNow=await officialPrices(cache,'NSW','2026-11-04');assert.ok(offNow.observations.some((o:any)=>o.observedBy==='Pinch'&&o.state==='NSW'));assert.deepEqual(offNow.attribution,['Price data by Pinch','Product data by WhichGrocer']);
const nextWeek=await officialPrices(cache,'QLD','2026-11-11');assert.ok(nextWeek.observations.length>0,'previous cycle used until the next run');assert.ok(nextWeek.observations.every((o:any)=>o.observedAt==='2026-11-05'),'dates kept, never refreshed by display');
assert.equal(await officialPrices(memStore(),'NSW','2026-11-04'),null,'nothing → nothing');
console.log('PASS online prices: parsing, matching guard, Pinch basket ≤5/request, WhichGrocer budget + pacing, cross-check hold, switches, failure keeps old prices, keys never stored, only owner-confirmed products shown, merge into official prices');
