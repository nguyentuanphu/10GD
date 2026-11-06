// Price Scout pure logic: catalog schema, postcodes, units, OCR/paste parser,
// bookmark extractor, optimizer, persona, receipts, provenance and sanity.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx=vm.createContext({console,Intl,Date,Math,URL,JSON,structuredClone});
vm.runInContext(fs.readFileSync('dist/master-catalog.js','utf8'),ctx);
vm.runInContext(fs.readFileSync('dist/shopping-optimizer.js','utf8'),ctx);
const P=ctx.PriceScout,catalog=JSON.parse(fs.readFileSync('data/master-catalog.json','utf8')).items;
const plain=(v:any)=>JSON.parse(JSON.stringify(v));

// ---- Catalog schema ----
{const ids=new Set();const ing=fs.readFileSync('src/frontend/seed.ts','utf8');
 // v1.7.8: 164 staples (owner, 6 Nov 2026: family items like Sườn bò / Thịt bò gravy had no online price). The ceiling is the
 // Pinch budget of one refresh: 40 requests × 5 items = 200 items sold at the online supermarkets.
 assert.ok(catalog.length>=120&&catalog.length<=200,'120–200 staples');assert.ok(catalog.filter((i:any)=>(i.channels||[]).some((c:string)=>['woolworths','coles','aldi','chemist'].includes(c))).length<=200,'one refresh covers every online item');
 assert.equal(ctx.MASTER_CATALOG.items.length,catalog.length,'shipped catalog matches source');
 for(const i of catalog){
  assert.match(i.id,/^[a-z0-9-]+$/);assert.ok(!ids.has(i.id),'unique '+i.id);ids.add(i.id);
  assert.ok(i.nameVi&&i.nameEn&&Array.isArray(i.aliases),'names '+i.id);
  assert.ok(P.CATEGORIES.includes(i.category),'category '+i.id);assert.ok(P.SAFETY.includes(i.foodSafety),'safety '+i.id);
  assert.ok(i.channels.length&&i.channels.every((c:string)=>['woolworths','coles','aldi','chemist','amazon','viet-grocer'].includes(c)),'channels '+i.id);
  assert.ok(Object.hasOwn(P.BASIS,i.unitBasis),'basis '+i.id);assert.equal(typeof i.bulkCandidate,'boolean');
  assert.ok(i.commonPacks.length&&i.commonPacks.every((p:any)=>p.packQty>0&&typeof p.packUnit==='string'&&(p.units===null||p.units>0)),'packs '+i.id);
  assert.equal(i.retailerRef,null,'no invented SKUs/ASINs');
  for(const k of Object.keys(i))assert.ok(!/price/i.test(k),'no prices in catalog '+i.id);
  if(i.ingredientId)assert.ok(new RegExp('\\b'+i.ingredientId+'\\s*:\\s*\\[|"'+i.ingredientId+'"\\s*:').test(ing),'ingredient link exists '+i.ingredientId);
 }
 for(const need of ['rau-muong','rau-thom','cai-thia','gia','hanh-la','chanh','ot','thit-ba-chi','suon-non','thit-bo-xao','dui-ga','ca-basa','tom','gao-jasmine','nuoc-mam','dau-an','bun-kho','banh-pho-kho','mi-goi','duong','muoi','xi-dau','sua-tuoi','trung','banh-mi','finish-tablets','nuoc-rua-chen','omo','giay-ve-sinh','dettol-spray'])assert.ok(ids.has(need),'staple '+need);
 console.log('PASS master catalog schema ('+catalog.length+' items, no prices/SKUs)');}

// ---- Postcodes ----
{const s=(pc:string)=>P.postcodeState(pc);
 for(const pc of ['1000','1999','2000','2166','2599','2619','2899','2921','2999'])assert.equal(s(pc).state,'NSW',pc);
 for(const pc of ['2600','2618','2900','2920','0200'])assert.deepEqual([s(pc).state,s(pc).supported],['ACT',false],pc);
 for(const pc of ['4000','4999','9000','9999'])assert.deepEqual([s(pc).state,s(pc).supported],['QLD',true],pc);
 for(const pc of ['3000','5000','6000','7000','0800'])assert.equal(s(pc).supported,false,pc);
 assert.match(s('3000').message.vi,/Rất tiếc! Khu vực của bạn hiện chưa được hỗ trợ\. Hệ thống hiện chỉ tối ưu giá cho NSW và QLD\./);assert.match(s('3000').message.en,/NSW and QLD/);
 for(const bad of ['abcd','123','12345','','0100'])assert.equal(s(bad).valid,false,bad);
 assert.equal(P.cycleId('2026-11-04'),'2026-11-04');assert.equal(P.cycleId('2026-11-03'),'2026-10-28');assert.equal(P.cycleEnd('2026-11-01'),'2026-11-03');
 assert.deepEqual(plain(P.nextSpecialBuyDays('2026-11-01')),['2026-11-04','2026-11-07']);
 console.log('PASS postcode boundaries (NSW/QLD supported, ACT excluded), price-week cycle and ALDI Special Buy days');}

// ---- Units ----
{assert.equal(P.unitPriceOf(4.5,500,'g',null,'per_100g'),0.9);assert.equal(P.unitPriceOf(12,5,'kg',null,'per_kg'),2.4);
 assert.equal(P.unitPriceOf(24.99,60,'wash',60,'per_wash'),0.4165);assert.equal(P.unitPriceOf(28,48,'roll',48,'per_roll'),0.5833);
 assert.equal(P.unitPriceOf(5,500,'mL',null,'per_100mL'),1);assert.equal(P.unitPriceOf(9,2,'L',null,'per_L'),4.5);
 assert.equal(P.unitPriceOf(10,2,'L',null,'per_wash'),null,'washes unknown without a count');assert.equal(P.unitPriceOf(3,1,'kg',null,'per_L'),null);
 assert.equal(P.convertUnitPrice(0.9,'per_100g','per_kg'),9);assert.equal(P.convertUnitPrice(1,'per_kg','per_L'),null);
 const tp=catalog.find((i:any)=>i.id==='giay-ve-sinh');assert.equal(P.basisMultiplier(1,'pack','per_roll',tp),12);assert.equal(P.basisMultiplier(500,'g','per_kg',{}),0.5);
 console.log('PASS unit normalisation (per 100g, per kg, per wash, per roll, per L) and incompatible units stay unknown');}

// ---- Screenshot / paste parser ----
{const parse=(t:string)=>plain(P.parsePriceText(t,{catalog}));
 let r=parse('Woolworths\nWoolworths Jasmine Rice 5kg\n$12.00\n$2.40 / 1KG\nWas $15.00');
 assert.deepEqual([r.retailer,r.price,r.unitPrice,r.unitBasis,r.wasPrice,r.promo,r.itemId,r.packQty,r.packUnit],['woolworths',12,2.4,'per_kg',15,'special','gao-jasmine',5,'kg']);
 r=parse('Coles\nColes Tasty Cheese Slices 500g\n1/2 Price\n$4.50\n$0.90 per 100g');
 assert.deepEqual([r.retailer,r.price,r.promo,r.wasPrice,r.itemId,r.unitPrice,r.unitBasis],['coles',4.5,'half-price',9,'pho-mai',9,'per_kg']);
 r=parse('Chemist Warehouse\nFinish Quantum 60 Pack\n$24.99\n$0.42 per wash');
 assert.deepEqual([r.retailer,r.price,r.unitPrice,r.unitBasis,r.units,r.itemId],['chemist',24.99,0.42,'per_wash',60,'finish-tablets']);
 r=parse('amazon.com.au\nQuilton 3 Ply Toilet Tissue 48 pack\n$28.00\n$0.58 per roll');
 assert.deepEqual([r.retailer,r.price,r.unitPrice,r.unitBasis,r.units,r.itemId],['amazon',28,0.58,'per_roll',48,'giay-ve-sinh']);
 r=parse('ALDI Special Buys\nRemano Rice Vermicelli 400g $1.99 $4.98 per 1kg');
 assert.deepEqual([r.retailer,r.price,r.promo,r.unitPrice,r.itemId],['aldi',1.99,'special-buy',4.98,'bun-kho']);
 r=parse('Woolworths Fairy Dishwashing Liquid 900mL $7.00 Save $3.00 $0.78 / 100ML');
 assert.deepEqual([r.price,r.wasPrice,r.unitPrice,r.unitBasis,r.itemId],[7,10,0.78,'per_100mL','nuoc-rua-chen']);
 r=parse('Chợ Việt Cabramatta\nRau muống 500g $3.50');assert.deepEqual([r.retailer,r.itemId,r.unitPrice],['viet-grocer','rau-muong',7]);
 r=parse('no price here at all');assert.equal(r.price,null,'unknown price stays null, never 0');
 console.log('PASS screenshot text parser for Woolworths, Coles, Chemist Warehouse, Amazon, ALDI and Chợ Việt samples');}

// ---- Bookmark extractor (runs in the user browser on the product page) ----
{const ld='<html><head><title>Woolworths Jasmine Rice 5kg | Woolworths</title><script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"BreadcrumbList"},{"@type":"Product","name":"Woolworths Jasmine Rice 5kg","size":"5kg","offers":{"@type":"Offer","price":"12.00","priceCurrency":"AUD"}}]}</script></head><body></body></html>';
 let d=plain(P.extractProductPage(ld,'Woolworths Jasmine Rice 5kg $12.00 $2.40 / 1KG Was $15.00','https://www.woolworths.com.au/shop/productdetails/123/jasmine-rice?utm=x','Woolworths Jasmine Rice 5kg | Woolworths'));
 assert.deepEqual([d.label,d.price,d.currency,d.wasPrice,d.unitText,d.url,d.packText],['Woolworths Jasmine Rice 5kg',12,'AUD',15,'$2.40 / 1KG','https://www.woolworths.com.au/shop/productdetails/123/jasmine-rice','5kg'],'query string dropped');
 const meta='<html><head><meta property="og:title" content="Finish Quantum Dishwasher Tablets 60 Pack | Chemist Warehouse"><meta property="product:price:amount" content="24.99"></head></html>';
 d=plain(P.extractProductPage(meta,'$24.99 $0.42 per wash','https://www.chemistwarehouse.com.au/buy/1/finish','x'));assert.deepEqual([d.label,d.price,d.unitText],['Finish Quantum Dishwasher Tablets 60 Pack',24.99,'$0.42 per wash']);
 d=plain(P.extractProductPage('<html></html>','Quilton Toilet Tissue 48 Pack\n$28.00\n$0.58 per roll','https://www.amazon.com.au/dp/x','Quilton Toilet Tissue 48 Pack'));assert.deepEqual([d.price,d.unitText,d.packText],[28,'$0.58 per roll','48 Pack']);
 const draft=plain(P.captureToDraft(JSON.stringify({...d,v:1,host:'amazon.com.au'}),catalog,'2026-11-01'));assert.deepEqual([draft.retailer,draft.itemId,draft.price,draft.unitBasis,draft.source],['amazon','giay-ve-sinh',28,'per_roll','bookmark']);
 assert.equal(P.captureToDraft('{"v":2}',catalog),null);assert.equal(P.captureToDraft('not json',catalog),null);
 const src=P.bookmarkletSource('https://family.example');assert.match(src,/^javascript:/);const code=decodeURIComponent(src.slice(11));
 assert.ok(code.includes('"https://family.example"+"/?price-capture="'));assert.doesNotMatch(code,/fetch\(|XMLHttpRequest|sendBeacon/);
 const fake:any={document:{documentElement:{outerHTML:ld},body:{innerText:'$12.00'},title:'t'},location:{href:'https://www.coles.com.au/product/a'},alert(){},window:null};fake.window={open:(u:string)=>{fake.opened=u;return{}}};
 vm.runInNewContext(code,{...fake,window:fake.window,encodeURIComponent,JSON,URL,Array,String,RegExp,parseFloat,isFinite,Math});
 assert.match(fake.opened,/^https:\/\/family\.example\/\?price-capture=/);assert.equal(JSON.parse(decodeURIComponent(fake.opened.split('=')[1])).price,12);
 console.log('PASS bookmarklet JSON-LD/meta/visible-text extractor, capture validation and self-contained bookmarklet');}

// ---- Optimizer ----
const today='2026-11-01';let seq=0;
const obs=(itemId:string,retailer:string,price:number,packQty:number,packUnit:string,extra:any={})=>({id:'t-obs-'+(++seq),itemId,label:itemId,retailer,branchId:null,state:'NSW',price,currency:'AUD',packQty,packUnit,units:['each','wash','roll','sheet'].includes(packUnit)?packQty:null,unitPrice:null,unitBasis:null,wasPrice:null,promo:null,validUntil:null,observedAt:'2026-10-30',observedBy:'T',source:'manual',note:null,...extra});
const prefs=(x:any={})=>({catalog,today,state:'NSW',...x});
{const items=[{key:'a',label:'Gạo',itemId:'gao-jasmine',qty:5,unit:'kg'},{key:'b',label:'Dầu ăn',itemId:'dau-an',qty:2,unit:'L'},{key:'c',label:'Đường',itemId:'duong',qty:1,unit:'kg'},{key:'d',label:'Bánh tráng',itemId:null,qty:1,unit:'pack'},{key:'e',label:'Nước mắm',itemId:'nuoc-mam',qty:500,unit:'ml'}];
 const o=[obs('gao-jasmine','woolworths',12,5,'kg',{promo:'special',validUntil:'2026-11-03'}),obs('gao-jasmine','coles',14,5,'kg'),obs('dau-an','woolworths',9,2,'L'),obs('dau-an','coles',8.5,2,'L'),obs('duong','coles',1.6,1,'kg'),obs('duong','aldi',1.19,1,'kg')];
 const r=plain(P.optimizeBasket(items,o,prefs()));
 assert.deepEqual([r.oneStop.commonCount,r.oneStop.woolworths,r.oneStop.coles,r.oneStop.cheaper,r.oneStop.difference],[2,21,22.5,'woolworths',1.5],'compare only items priced at both');
 assert.deepEqual(r.unknown.map((u:any)=>[u.label,u.reason]),[['Bánh tráng','no-match'],['Nước mắm','no-price']],'unknown items listed, not $0');
 assert.equal(r.stores.coles.count,3);assert.equal(r.split.mainStore,'woolworths');
 const mainStop=r.split.stops.find((s:any)=>s.retailer==='woolworths');assert.ok(mainStop.items.some((i:any)=>i.label==='Nước mắm'&&i.cost===null),'unpriced item kept at main store with null cost');
 // ALDI sugar saves nothing vs main (no main price) and order < $15 → folded; Coles oil saves $0.50 → folded.
 assert.equal(r.split.extraStops,0);assert.ok(r.split.folded.some((f:any)=>f.retailer==='coles'));
 const big=plain(P.optimizeBasket(items,o,prefs({minSavings:0.4})));assert.ok(big.split.stops.some((s:any)=>s.retailer==='coles'),'kept when savings ≥ threshold');assert.equal(big.split.savings,0.5);assert.equal(big.split.savingsPct,2.4);
 console.log('PASS one-stop comparison on common items, unknown prices, smart split and minimum-savings fold-back');}
{// Expired special and stale regular price are ignored; fading still used.
 const item=catalog.find((i:any)=>i.id==='duong');
 assert.equal(P.bestPrice(item,'coles',[obs('duong','coles',1,1,'kg',{validUntil:'2026-10-31',promo:'special'})],{today}),null,'expired special');
 assert.equal(P.bestPrice(item,'coles',[obs('duong','coles',1,1,'kg',{observedAt:'2026-09-25'})],{today}),null,'older than 35 days');
 const fading=P.bestPrice(item,'coles',[obs('duong','coles',2,1,'kg',{observedAt:'2026-10-05'})],{today});assert.equal(fading.freshness.status,'fading');
 const both=P.bestPrice(item,'coles',[obs('duong','coles',2,1,'kg'),obs('duong','coles',1.5,1,'kg',{promo:'special',validUntil:'2026-11-03',observedAt:'2026-10-29'})],{today});assert.equal(both.unitPrice,1.5,'active special preferred when cheaper');
 assert.equal(P.bestPrice(item,'coles',[obs('duong','coles',2,1,'kg',{state:'QLD'})],{today,state:'NSW'}),null,'other state ignored');
 console.log('PASS freshness: specials expire, regular prices fade after 21 days and drop after 35');}
{// Route: Chemist → ALDI → Amazon delivery (no stop) → supermarket → Chợ Việt; raw meat last.
 const items=[{key:'f',label:'Finish',itemId:'finish-tablets',qty:1,unit:'pack'},{key:'g',label:'Gạo',itemId:'gao-jasmine',qty:5,unit:'kg'},{key:'t',label:'Giấy vệ sinh',itemId:'giay-ve-sinh',qty:2,unit:'pack'},{key:'s',label:'Sườn',itemId:'suon-non',qty:1,unit:'kg'},{key:'r',label:'Rau muống',itemId:'rau-muong',qty:1,unit:'kg'},{key:'m',label:'Sữa',itemId:'sua-tuoi',qty:2,unit:'L'}];
 const o=[obs('finish-tablets','chemist',24.99,60,'wash'),obs('finish-tablets','coles',39,46,'wash'),obs('gao-jasmine','aldi',9,5,'kg'),obs('gao-jasmine','coles',25,5,'kg'),obs('giay-ve-sinh','amazon',22,48,'roll'),obs('giay-ve-sinh','coles',24,12,'roll'),obs('suon-non','coles',13,1,'kg'),obs('suon-non','viet-grocer',14,1,'kg'),obs('rau-muong','viet-grocer',3,500,'g'),obs('rau-muong','coles',30,1,'kg'),obs('sua-tuoi','coles',3.1,2,'L')];
 const r=plain(P.optimizeBasket(items,o,prefs()));
 const order=r.route.map((s:any)=>s.retailer);assert.deepEqual(order,['amazon','chemist','aldi','viet-grocer','coles'],'delivery first, Chemist→ALDI, supermarket with raw meat last');
 assert.ok(r.route[0].delivery);assert.deepEqual(r.route.at(-1).coldItems,['Sườn']);
 assert.ok(r.split.savings>0);
 const bench=r.benchmark.find((b:any)=>b.key==='r');assert.deepEqual([bench.cheaper,bench.viet,bench.supermarket.cost],['viet-grocer',6,30]);
 const bs=r.benchmark.find((b:any)=>b.key==='s');assert.equal(bs.cheaper,'coles');
 assert.ok(r.bulk.some((b:any)=>b.itemId==='giay-ve-sinh'&&b.prices.amazon.unitPrice===0.4583),'per-roll unit price for Amazon tray');
 const noViet=plain(P.optimizeBasket(items,[...o,obs('suon-non','viet-grocer',10,1,'kg',{observedAt:'2026-10-31'})],prefs()));assert.equal(noViet.route.at(-1).retailer,'viet-grocer');
 assert.equal(P.allowedChannel(catalog.find((i:any)=>i.id==='gao-jasmine'),'chemist'),false);assert.equal(P.allowedChannel(catalog.find((i:any)=>i.id==='gao-jasmine'),'viet-grocer'),false);assert.equal(P.allowedChannel(catalog.find((i:any)=>i.id==='suon-non'),'amazon'),false);
 console.log('PASS food-safety route order, Amazon as delivery, channel rules and Chợ Việt benchmark');}

// ---- Persona ----
{const trip=(date:string,retailers:string[],fresh=0,freshViet=0)=>({date,retailers,fresh,freshViet});
 assert.equal(P.detectPersona([trip('2026-10-30',['coles'])]).persona,'learning');
 const conv=P.detectPersona([trip('2026-10-10',['coles']),trip('2026-10-17',['coles']),trip('2026-10-24',['coles']),trip('2026-10-31',['woolworths'])]);assert.deepEqual([conv.persona,conv.prefs.minSavings,conv.prefs.defaultView],['convenience',15,'one-stop']);
 const saver=P.detectPersona([trip('2026-10-10',['coles','aldi']),trip('2026-10-17',['aldi','chemist']),trip('2026-10-24',['coles']),trip('2026-10-31',['woolworths','aldi'])]);assert.deepEqual([saver.persona,saver.prefs.splitOpen],['smart-saver',true]);
 const local=P.detectPersona([trip('2026-10-10',['viet-grocer','coles'],50,40),trip('2026-10-17',['viet-grocer','woolworths'],40,30),trip('2026-10-24',['coles','viet-grocer'],30,20)]);assert.deepEqual([local.persona,local.prefs.preferVietFresh],['local-fresh',true]);
 assert.equal(P.detectPersona([],{override:'smart-saver'}).persona,'smart-saver');
 const trips=plain(P.tripsFromReceipts([{date:'2026-10-30',store:'Coles Bankstown',items:[]},{date:'2026-10-30',store:'ALDI',items:[]},{date:'2026-09-01',store:'Coles',items:[]}],{today}));assert.equal(trips.length,1);assert.deepEqual(trips[0].retailers.sort(),['aldi','coles']);
 console.log('PASS persona detection (learning <3 trips, convenience, smart saver, local fresh, override)');}

// ---- Receipts → observations ----
{const unit=(id:string)=>({ribs:'g',egg:'quả',fishSauce:'ml'} as any)[id]||null;
 const rs=[{id:'r1',date:'2026-10-29',store:'Woolworths Parramatta',currency:'AUD',items:[{id:'l1',label:'PORK RIBS',total:13.5,ingredient:'ribs',quantity:900},{id:'l2',label:'EGGS 12PK',total:6,ingredient:'egg',quantity:12},{id:'l3',label:'FISH SAUCE',total:5,ingredient:'fishSauce'},{id:'l4',label:'MISC',total:3}]},{id:'r2',date:'2026-10-29',store:'Chợ',currency:'VND',items:[{id:'x',label:'Sườn',total:100000,ingredient:'ribs',quantity:1000}]}];
 const out=plain(P.receiptObservations(rs,catalog,{ingredientUnit:unit,state:'NSW'}));
 assert.equal(out.length,2,'only lines with known quantity and AUD');assert.deepEqual([out[0].itemId,out[0].retailer,out[0].unitPrice,out[0].unitBasis,out[0].source,out[0].confidence],['suon-non','woolworths',15,'per_kg','receipt','high']);
 assert.equal(out[1].unitPrice,0.5);assert.ok(out.every((o:any)=>P.validObservation(o)));
 console.log('PASS receipt-derived observations only when quantity is known; currency preserved');}

// ---- Provenance & sanity ----
{const base=obs('duong','coles',1.6,1,'kg');
 const manual=plain(P.withProvenance(base));assert.deepEqual([manual.visibility,manual.evidence.type,manual.confidence,manual.capturedAt],['family','manual','low',null]);
 const hash='a'.repeat(64);const shot=plain(P.withProvenance({...base,source:'screenshot'},{imageHash:hash,ocrPrice:1.6,capturedAt:'2026-10-30T01:02:03.000Z'}));assert.deepEqual([shot.evidence.type,shot.evidence.imageHash,shot.evidence.ocrMatches,shot.confidence,shot.capturedAt],['screenshot',hash,true,'medium','2026-10-30T01:02:03.000Z']);
 const edited=plain(P.withProvenance({...base,price:1.9,source:'screenshot'},{ocrPrice:1.6}));assert.deepEqual([edited.evidence.ocrMatches,edited.confidence],[false,'low'],'user changed the OCR price');
 assert.equal(P.withProvenance({...base,source:'bookmark'},{ocrPrice:1.6}).confidence,'medium');assert.equal(P.computeConfidence('receipt',null),'high');
 assert.ok(P.validObservation(shot));assert.equal(P.validObservation({...shot,visibility:'community'}),false,'community reserved');assert.equal(P.validObservation({...shot,evidence:{...shot.evidence,imageHash:'xyz'}}),false);assert.equal(P.validObservation({...shot,confidence:'certain'}),false);
 assert.ok(!('image' in shot)&&!JSON.stringify(shot).includes('data:image'),'no image stored');
 const hist=[obs('duong','coles',1.6,1,'kg'),obs('duong','woolworths',1.5,1,'kg'),obs('duong','aldi',1.2,1,'kg',{observedAt:'2026-10-20'}),obs('duong','aldi',9,1,'kg',{observedAt:'2026-09-01'})];
 assert.deepEqual(plain(P.priceSanity('duong',1.6,hist.slice(0,2),{today,catalog})),{ok:true,reason:'insufficient-history',count:2});
 assert.equal(P.priceSanity('duong',1.6,hist,{today,catalog}).count,3,'older than 35 days excluded');
 assert.deepEqual(['too-high','too-low','within-range'].map((_,i)=>P.priceSanity('duong',[4,0.5,2][i],hist,{today,catalog}).reason),['too-high','too-low','within-range']);
 assert.equal(P.priceSanity('duong',4,hist,{today,catalog}).ok,false);assert.equal(P.priceSanity('duong',3.75,hist,{today,catalog}).ok,true,'250% boundary inclusive');assert.equal(P.priceSanity('duong',0.6,hist,{today,catalog}).ok,true,'40% boundary inclusive');
 assert.equal(P.priceSanity('duong',15,[obs('duong','coles',16,1,'kg'),obs('duong','coles',0.15,100,'g'),obs('duong','coles',1.5,100,'g')],{today,catalog}).ok,true,'compares normalised unit prices');
 console.log('PASS provenance fields (visibility, evidence hash, capturedAt, confidence, storeBranchId) and rolling-median price sanity');}

// ---- Community Price Pilot: source priority, labels, pending hints, branches, flag-off no-op ----
{const items=[{key:'a',label:'Gạo',itemId:'gao-jasmine',qty:5,unit:'kg'},{key:'b',label:'Dầu ăn',itemId:'dau-an',qty:2,unit:'L'},{key:'c',label:'Rau muống',itemId:'rau-muong',qty:500,unit:'g'}];
 const own=[obs('gao-jasmine','woolworths',12,5,'kg'),obs('gao-jasmine','coles',14,5,'kg')];
 const cp=(itemId:string,retailer:string,price:number,packQty:number,packUnit:string,extra:any={})=>({groupId:'g'+(++seq),itemId,label:itemId,retailer,branchId:retailer+':2166:cabramatta',branchLabel:'Cabramatta 2166',state:'NSW',status:'confirmed',usable:true,price,unitPrice:null,unitBasis:null,packQty,packUnit,units:null,promo:null,validUntil:null,families:2,lastObserved:'2026-10-31',ageDays:1,faded:false,sources:['shelf-photo'],...extra});
 const server=[cp('gao-jasmine','coles',9,5,'kg'),cp('dau-an','coles',8,2,'L'),cp('dau-an','woolworths',8.4,2,'L',{status:'pending',usable:false,families:1}),cp('dau-an','woolworths',8.2,2,'L',{branchId:'woolworths:2200:bankstown',usable:false,faded:true,ageDays:16})];
 const split=P.communityObservations(server,{});
 assert.equal(split.confirmed.length,2,'only confirmed + usable enter totals');assert.equal(split.hints.length,2,'pending and greyed prices become hints');
 const base=plain(P.optimizeBasket(items,own,prefs()));
 const flagOff=plain(P.optimizeBasket(items,own,prefs({community:[],shopPrices:[],communityHints:[]})));
 assert.deepEqual(flagOff.oneStop,base.oneStop,'no community data → identical result');assert.deepEqual(flagOff.split.stops,base.split.stops);
 const shops=P.shopObservations([{id:'sp-1',itemId:'rau-muong',label:'Rau muống',price:2.5,unitPrice:null,unitBasis:null,packQty:500,packUnit:'g',observedAt:'2026-10-31',shop:{id:'shop1',name:'Chợ Việt',suburb:'Cabramatta',state:'NSW'}}]);
 const r=plain(P.optimizeBasket(items,own,prefs({minSavings:0,minStopOrder:0,community:split.confirmed,communityHints:split.hints,shopPrices:shops})));
 // Own-family Coles rice ($14) wins over the cheaper confirmed community Coles rice ($9).
 assert.equal(r.oneStop.coles,14,'own-family price first');assert.equal(r.oneStop.woolworths,12);
 assert.equal(r.stores.coles.total,22,'community fills the gap where the family has no price (oil $8)');
 assert.deepEqual([r.oneStop.sourceMix.family,r.oneStop.sourceMix.community],[2,0],'one-stop compares family prices only here');
 const assigned=r.split.stops.flatMap((s:any)=>s.items).filter((i:any)=>i.cost!=null);
 assert.ok(assigned.some((i:any)=>i.key==='b'&&i.origin==='community'),'oil priced from confirmed community');
 assert.ok(assigned.some((i:any)=>i.key==='c'&&i.origin==='shop'),'shop-posted price used last');
 assert.equal(r.sourceMix.total,assigned.length);assert.ok(r.sourceMix.family>=1&&r.sourceMix.community>=1&&r.sourceMix.shop>=1,'source mix label counts');
 assert.ok(!assigned.some((i:any)=>i.cost===8.4||i.cost===8.2),'pending/greyed never used in totals');
 assert.equal(r.hints.length,2,'pending prices surface as hints');
 // Branch preference: once a Coles branch is chosen, other Coles branches are ignored.
 const pref=P.communityObservations([...server,cp('dau-an','coles',7,2,'L',{branchId:'coles:2200:bankstown'})],{branches:['coles:2200:bankstown']});
 assert.deepEqual(pref.confirmed.filter((x:any)=>x.retailer==='coles').map((x:any)=>x.price),[7],'only the chosen Coles branch');
 // Users who never captured anything: confirmed community prices alone drive one-stop/split comparisons.
 {const onlyCommunity=P.communityObservations([cp('gao-jasmine','coles',13.5,5,'kg'),cp('gao-jasmine','woolworths',12.8,5,'kg',{online:true,branchId:'woolworths:online:NSW',branchLabel:'online'}),cp('dau-an','coles',8,2,'L'),cp('dau-an','woolworths',8.5,2,'L')],{});
  assert.equal(onlyCommunity.confirmed.find((x:any)=>x.retailer==='woolworths'&&x.itemId==='gao-jasmine').online,true,'online label survives into the optimizer rows');
  const fresh=plain(P.optimizeBasket(items,[],prefs({minSavings:0,minStopOrder:0,community:onlyCommunity.confirmed})));
  assert.equal(fresh.oneStop.commonCount,2,'one-stop comparison works with community prices only');assert.equal(fresh.oneStop.sourceMix.community,4);assert.equal(fresh.oneStop.sourceMix.family,0);assert.ok(fresh.split.stops.length>=1)}
 // Shareability: only shelf-photo with matching OCR or receipt.
 assert.equal(P.canShareToCommunity({itemId:'x',price:2,evidence:{type:'shelf-photo',ocrPrice:2.01}}),true);
 assert.equal(P.canShareToCommunity({itemId:'x',price:2,evidence:{type:'shelf-photo',ocrPrice:2.5}}),false);
 // Owner decision 1 Nov 2026: screenshots/bookmarks are shareable as facts when the read price matches.
 const H='a'.repeat(64);
 assert.equal(P.canShareToCommunity({itemId:'x',price:2,evidence:{type:'screenshot',imageHash:H,ocrPrice:2}}),true,'screenshot with matching OCR is shareable');
 assert.equal(P.canShareToCommunity({itemId:'x',price:2,evidence:{type:'screenshot',imageHash:H,ocrPrice:2.4}}),false,'OCR mismatch');
 assert.equal(P.canShareToCommunity({itemId:'x',price:2,evidence:{type:'screenshot',ocrPrice:2}}),false,'screenshot needs its fingerprint');
 assert.equal(P.canShareToCommunity({itemId:'x',price:2,evidence:{type:'bookmark'}}),false,'bookmark needs a page price');
 assert.equal(P.canShareToCommunity({itemId:'x',price:2,evidence:{type:'bookmark',ocrPrice:2}}),true);
 assert.equal(P.canShareToCommunity({itemId:'x',price:2,evidence:{type:'manual',ocrPrice:2}}),false,'manual stays family-only');
 assert.equal(P.canShareToCommunity({itemId:null,price:2,evidence:{type:'receipt'}}),false);
 assert.equal(P.withProvenance({...own[0],source:'screenshot'},{ocrPrice:12,evidenceType:'shelf-photo'}).evidence.type,'shelf-photo');
 assert.equal(P.validObservation(P.withProvenance({...own[0],source:'screenshot'},{ocrPrice:12,evidenceType:'shelf-photo'})),true,'shelf-photo observations are still valid family observations');
 console.log('PASS community pilot: own-family first, then confirmed community, then shop; pending as hints; source mix; branch filter; shareable evidence');}

// ---- Supported states follow Studio (owner report, 1 Nov 2026: unticking every state in Studio left Price Scout on) ----
{assert.deepEqual(plain(P.SUPPORTED_STATES),['NSW','QLD'],'default before Studio answers');
 assert.equal(P.postcodeState('2205').supported,true);
 assert.equal(P.setSupportedStates([]),true,'an empty Studio list is applied, not treated as missing');
 assert.equal(P.postcodeState('2205').supported,false,'NSW off when no state is ticked');
 assert.match(P.postcodeState('2205').message.en,/paused in every area/);
 P.setSupportedStates(['QLD']);
 assert.equal(P.postcodeState('2205').supported,false);assert.equal(P.postcodeState('4000').supported,true);
 assert.match(P.postcodeState('2205').message.vi,/QLD/);
 assert.equal(P.setSupportedStates(['QLD']),false,'no change reported when the list is the same');
 P.setSupportedStates(['VIC','NSW','XX']);assert.deepEqual(plain(P.SUPPORTED_STATES),['NSW','VIC'],'unknown states dropped, canonical order');
 assert.equal(P.setSupportedStates(null),false,'a missing list leaves the current states');
 P.setSupportedStates(['NSW','QLD']);
 console.log('PASS Price Scout supported states follow the Studio setting (incl. none ticked)');}

// ---- v1.7 capture time next to referenced prices ----
{const now=Date.parse('2026-11-01T08:42:00+11:00'),tz='Australia/Sydney',at='2026-11-01T06:42:00+11:00';
 const vi=P.capturedLabel(at,'vi',now,tz),en=P.capturedLabel(at,'en',now,tz);
 assert.equal(vi.text,'2 giờ trước · CN 01/11 06:42');assert.equal(en.text,'2 h ago · Sun 1 Nov 06:42');
 assert.equal(vi.iso,new Date(at).toISOString(),'shown time is the capture time');assert.equal(vi.old,false);
 const wed='2026-11-04T06:42:00+11:00',w=P.capturedLabel(wed,'vi',Date.parse('2026-11-04T06:47:30+11:00'),tz);assert.equal(w.text,'5 phút trước · T4 04/11 06:42');
 assert.equal(P.capturedLabel(wed,'en',Date.parse('2026-11-04T06:42:20+11:00'),tz).text,'just now · Wed 4 Nov 06:42');
 assert.equal(P.capturedLabel(wed,'en',Date.parse('2026-11-05T09:00:00+11:00'),tz).rel,'yesterday');
 const old=P.capturedLabel('2026-10-20T10:00:00+11:00','en',now,tz);assert.equal(old.old,true,'> 7 days is old');assert.equal(old.rel,'11 days ago');
 const day=P.capturedLabel('2026-10-31','vi',now,tz);assert.equal(day.day,true);assert.equal(day.rel,'hôm qua');assert.doesNotMatch(day.abs,/:/,'a day-only record shows no clock time');
 assert.equal(P.capturedLabel('nonsense','vi',now,tz),null);
 assert.equal(P.captureTimeOf({observedAt:'2026-10-31',evidence:{type:'screenshot',capturedAt:at}}),at,'evidence capture time wins over the day');
 assert.equal(P.captureTimeOf({observedAt:'2026-10-31'}),'2026-10-31');
 // Plan items carry the capture time of the price they use.
 const r=plain(P.optimizeBasket([{key:'a',label:'Gạo',itemId:'gao-jasmine',qty:5,unit:'kg'}],[obs('gao-jasmine','woolworths',12,5,'kg',{source:'screenshot',evidence:{type:'screenshot',capturedAt:at}}),obs('gao-jasmine','coles',14,5,'kg')],prefs()));
 const it=r.split.stops.flatMap((s:any)=>s.items)[0];assert.equal(it.capturedAt,at,'plan item keeps the capture time');
 console.log('PASS capture time label (VI/EN, relative + absolute, old > 7 days, day-only) and plan items keep the capture time')}

// ---- v1.7.5 trip plans: minutes per store, near / balanced / cheap (owner, 5 Nov 2026) ----
{const T='2026-10-31',items=[{key:'a',label:'Gạo',itemId:'gao-jasmine',qty:5,unit:'kg'},{key:'b',label:'Sữa',itemId:'sua-tuoi',qty:2,unit:'L'},{key:'c',label:'Dầu ăn',itemId:'dau-an',qty:2,unit:'L'}];
 const o=[obs('gao-jasmine','coles',14,5,'kg'),obs('gao-jasmine','aldi',11,5,'kg'),obs('sua-tuoi','coles',3.1,2,'L'),obs('sua-tuoi','aldi',2.6,2,'L'),obs('dau-an','coles',9,2,'L'),obs('dau-an','aldi',6.5,2,'L'),obs('dau-an','woolworths',8.8,2,'L')];
 const plan=(travel:any)=>plain(P.optimizeBasket(items,o,{catalog,state:'NSW',today:T,travel})).trips;
 // Coles 5 min, ALDI 25 min: nearest = Coles ($26.10, 10 min); cheapest = ALDI ($20.10, 50 min)
 let t=plan({coles:5,aldi:25,woolworths:12});
 assert.deepEqual(t.plans.near.stores.map((s:any)=>s.retailer),['coles']);assert.equal(t.plans.near.minutes,10,'one store: there and back');assert.equal(t.plans.near.total,26.1);
 assert.deepEqual(t.plans.cheap.stores.map((s:any)=>s.retailer),['aldi']);assert.equal(t.plans.cheap.total,20.1);assert.equal(t.plans.cheap.minutes,50);
 // balanced (owner: time is never priced in money): cheapest plan within halfway (30 min) → Coles + Woolworths (29 min, $25.90)
 assert.ok(t.plans.balanced.minutes<=30);assert.deepEqual(t.plans.balanced.stores.map((s:any)=>s.retailer).sort(),['coles','woolworths']);assert.equal(t.plans.balanced.total,25.9);assert.equal(t.timeValue,undefined,'no money value of time');
 // ALDI as close as Coles (5 min) → nearest, balanced and cheapest are all ALDI
 t=plan({coles:5,aldi:5});assert.deepEqual(t.plans.near.stores.map((s:any)=>s.retailer),['aldi']);assert.deepEqual(t.plans.balanced.stores.map((s:any)=>s.retailer),['aldi']);assert.deepEqual(t.plans.cheap.stores.map((s:any)=>s.retailer),['aldi']);
 // compared with the nearest on the same items only (owner: “Rẻ nhất” looked dearer because it bought one more item)
 {const v=plan({coles:5,aldi:25,woolworths:12}).plans.cheap.vsNear;assert.equal(v.commonCount,3);assert.equal(v.saving,6);assert.equal(v.minutes,40);assert.deepEqual(v.added,[]);assert.deepEqual(v.dropped,[]);}
 // unknown minutes → 10 min estimate, flagged; items grouped by store with totals
 t=plan({});assert.equal(t.defaultMinutes,10);assert.equal(t.plans.cheap.estimated,true);assert.equal(t.plans.cheap.stores[0].estimated,true);
 assert.deepEqual(t.plans.cheap.stores[0].items.map((x:any)=>x.label).sort(),['Dầu ăn','Gạo','Sữa']);
 // two stores: minutes = both one-way + the farthest way home
 assert.equal(P.tripMinutes(['coles','aldi'],{coles:5,aldi:25}),55);assert.equal(P.tripMinutes(['coles'],{coles:'x'}),20,'bad value → 10 min estimate');
 // an item only one store has: cheapest plan must include it; nearest may leave ≤ 20 % behind
 const o2=[...o,obs('nuoc-mam','woolworths',5,500,'mL')],items2=[...items,{key:'d',label:'Nước mắm',itemId:'nuoc-mam',qty:500,unit:'mL'}];
 const t2=plain(P.optimizeBasket(items2,o2,{catalog,state:'NSW',today:T,travel:{coles:5,aldi:25,woolworths:12}})).trips;
 assert.ok(t2.plans.cheap.stores.some((s:any)=>s.retailer==='woolworths'),'cheapest gets every priced item');assert.equal(t2.plans.cheap.covered,4);
 assert.ok(t2.plans.near.covered>=Math.ceil(4*0.8),'nearest still gets ≥ 80 %');
 {const v=t2.plans.cheap.vsNear;if(t2.plans.near.covered<4){assert.equal(v.added.length,4-t2.plans.near.covered,'the extra item is named');assert.ok(v.added.some((x:any)=>x.label==='Nước mắm'))}}assert.ok(t2.plans.near.minutes<=t2.plans.cheap.minutes);
 console.log('PASS trip plans: minutes per store (estimate when unknown), nearest / balanced (within halfway, never money per minute) / cheapest, items grouped by store, coverage rules')}
