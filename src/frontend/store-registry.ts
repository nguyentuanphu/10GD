'use strict';
// v1.7.19 re-check, audit B9 (13 Nov 2026, Sydney time): ONE store registry. Before, six places kept their own store lists
// (insights RETAILERS, storeChoiceNames, the So Giá observation form, receipt reading, the optimiser, voice prices) and the
// starter family stores were a seventh. Each place now takes its view from STORE_REGISTRY below, so a chain added or renamed
// here is added or renamed everywhere.
//
// Stored values never change. Every id below is already in families' data (products, So Giá observations, receipts, stores)
// and in older app versions' validators, so:
//  • ids are never renamed or removed;
//  • a view that a validator checks keeps exactly its old ids: `product` (validProduct, insights-core) is still Coles,
//    Woolworths and Chemist Warehouse, and `scout` (So Giá observations, shopping-optimizer) is still woolworths, coles, aldi,
//    chemist, amazon, viet-grocer and other. Widening either set would let this version save a value that an older device
//    receiving it by sync rejects (its validImport would refuse the whole family state). Add a chain to those views only after
//    every device runs a version that accepts it;
//  • chains the scout does not track on their own (Harris Farm, IGA, Costco, Spudshed, FoodWorks) reach it through the alias
//    layer storeScoutId(): their scout id is 'other', exactly the value voice prices already saved for them.
// The family's own places (state.stores) are names the family typed; they stay free text and come first in every suggestion.
// Plain script, loaded before every module that reads it (bootstrap.ts), and in node:vm by the tests.
const STORE_REGISTRY=Object.freeze([
 {id:'chemist',name:'Chemist Warehouse',rank:4,words:['chemist warehouse','chemist'],
  product:{host:'chemistwarehouse.com.au',search:'https://www.chemistwarehouse.com.au/search?searchtext='},
  scout:{short:'Chemist',icon:'💊',order:0,kind:'pharmacy',catalogue:'https://www.chemistwarehouse.com.au/catalogue'}},
 {id:'aldi',name:'ALDI',rank:3,chain:true,receipt:{currency:'AUD'},words:['aldi','al di','andi'],starter:{id:'store-aldi',order:3,address:'Siêu thị'},
  scout:{short:'ALDI',icon:'🔷',order:1,kind:'supermarket',catalogue:'https://www.aldi.com.au/special-buys'}},
 {id:'woolworths',name:'Woolworths',rank:1,chain:true,receipt:{currency:'AUD'},words:['woolworths','woolworth','woolies','woollies','wool worths','wool worth'],starter:{id:'store-woolworths',order:2,address:'Siêu thị'},
  product:{host:'woolworths.com.au',search:'https://www.woolworths.com.au/shop/search/products?searchTerm='},
  scout:{short:'Woolies',icon:'🟢',order:2,kind:'supermarket',catalogue:'https://www.woolworths.com.au/shop/catalogue'}},
 {id:'coles',name:'Coles',rank:2,chain:true,receipt:{currency:'AUD'},words:['coles','cole s'],starter:{id:'store-coles',order:1,address:'Siêu thị'},
  product:{host:'coles.com.au',search:'https://www.coles.com.au/search?q='},
  scout:{short:'Coles',icon:'🔴',order:2,kind:'supermarket',catalogue:'https://www.coles.com.au/catalogues'}},
 {id:'other',name:'Other store',vi:'Cửa hàng khác',rank:9,words:['spudshed','foodworks'],
  scout:{short:'Khác',icon:'🏪',order:2.5,kind:'other',catalogue:null}},
 {id:'viet-grocer',name:'Vietnamese grocer',vi:'Chợ Việt',rank:6,words:['chợ việt','tiệm việt','asian grocer','asian grocery','asian supermarket','tiệm á châu','chợ á châu'],
  starter:{id:'store-viet',order:4,name:'Chợ Việt / Á Châu',nameEn:'Vietnamese / Asian grocer',address:'Thực phẩm tươi & gia vị Việt'},
  scout:{short:'Chợ Việt',icon:'🏮',order:3,kind:'local',catalogue:null}},
 {id:'amazon',name:'Amazon AU',rank:5,words:['amazon'],
  scout:{short:'Amazon',icon:'📦',order:-1,kind:'delivery',delivery:true,catalogue:'https://www.amazon.com.au/deals'}},
 {id:'harris-farm',name:'Harris Farm',rank:7,chain:true,receipt:{currency:'AUD'},words:['harris farm','harris farms']},
 {id:'iga',name:'IGA',rank:7,chain:true,receipt:{currency:'AUD'},words:['iga']},
 {id:'costco',name:'Costco',rank:7,chain:true,receipt:{currency:'AUD'},words:['costco']},
 {id:'woolworths-uk',name:'Woolworths UK',rank:99,receipt:{currency:'GBP'}},
 // v1.7.19 re-check (receipt currency): Vietnamese chains, so a receipt from them is read in đồng (receipt-parse detectCurrency).
 {id:'coopmart',name:'Co.op Mart',rank:20,receipt:{currency:'VND'},words:['co.op mart','coop mart','co op mart','coopmart','co.opmart','co.opxtra','coopxtra','co.op food','coop food']},
 {id:'bach-hoa-xanh',name:'Bách hoá Xanh',rank:20,receipt:{currency:'VND'},words:['bách hoá xanh','bách hóa xanh','bach hoa xanh','bachhoaxanh']},
 {id:'winmart',name:'WinMart',rank:20,receipt:{currency:'VND'},words:['winmart','vinmart','win mart','vin mart','winmart+','vinmart+']},
 {id:'lotte-mart',name:'Lotte Mart',rank:20,receipt:{currency:'VND'},words:['lotte mart','lottemart']},
 {id:'go-vn',name:'GO! / Big C',rank:20,receipt:{currency:'VND'},words:['big c','bigc','tops market']},
 {id:'mm-mega',name:'MM Mega Market',rank:20,receipt:{currency:'VND'},words:['mm mega market','mega market']},
 {id:'aeon-vn',name:'AEON',rank:20,receipt:{currency:'VND'},words:['aeon']},
 {id:'kingfood',name:'Kingfoodmart',rank:20,receipt:{currency:'VND'},words:['kingfoodmart','king food mart']}
].map(s=>Object.freeze(s)));
const storeById=(id:string)=>STORE_REGISTRY.find((s:any)=>s.id===id)||null;
const storeRanked=(list:any[])=>[...list].sort((a:any,b:any)=>a.rank-b.rank);
// Ids the So Giá scout stores (validated by shopping-optimizer). A chain without its own scout entry is 'other' (alias layer).
function storeScoutId(id:string){const s:any=storeById(id);if(!s)return null;return s.scout?s.id:s.chain?'other':null}
// The chains offered as typed-store suggestions (receipt store, family store names): the Australian chains, or the Vietnamese
// ones for a family whose money is in đồng.
function storeChainNames(currency:string='AUD'){return storeRanked(STORE_REGISTRY.filter((s:any)=>currency==='VND'?s.receipt?.currency==='VND':s.chain)).map((s:any)=>s.name)}
// A store name the family typed (or read off a receipt) → the registry entry it names, or null. Whole words only.
function storeFromName(name:string){const t=' '+String(name||'').normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}.!+]+/gu,' ').trim()+' ';if(t.trim()==='')return null;
 for(const s of storeRanked(STORE_REGISTRY) as any[]){for(const w of [s.name.toLowerCase(),...(s.words||[])]){const k=' '+w.trim()+' ';if(t.includes(k))return s}}return null}
(globalThis as any).STORE_REGISTRY=STORE_REGISTRY;(globalThis as any).storeById=storeById;(globalThis as any).storeScoutId=storeScoutId;(globalThis as any).storeChainNames=storeChainNames;(globalThis as any).storeFromName=storeFromName;
