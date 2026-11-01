// FamTray Scout parsing: pure helpers (unit price per 100g/1kg/each/per wash/per roll,
// pack size, promo end, robots.txt, challenge detection, pacing clamp, facts whitelist)
// in Node, then the data-driven DOM parser against synthetic fixture pages in Chromium
// (JSON-LD product, list page with many tiles incl. open shadow roots, specials with
// was-price & half-price, meta-tag product, Amazon list, store label, signed-in marker,
// challenge page). Live retailer sites are NOT reachable from CI; see review.md.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
const C=require('../dist-extension/scout-core.js');
const config=JSON.parse(readFileSync('extension/config/scout-config.json','utf8'));

// ---------- unit price ----------
const up=(s:string)=>C.parseUnitPrice(s);
assert.deepEqual([up('$1.20 / 100g').unitPrice,up('$1.20 / 100g').unitBasis],[1.2,'per_100g']);
assert.deepEqual([up('$12.00 per 1kg').unitPrice,up('$12.00 per 1kg').unitBasis],[12,'per_kg']);
assert.deepEqual([up('$6.00 per 500g').unitPrice,up('$6.00 per 500g').unitBasis],[12,'per_kg'],'per 500g normalised to per kg');
assert.deepEqual([up('$0.50 each').unitPrice,up('$0.50 each').unitBasis],[0.5,'per_each']);
assert.deepEqual([up('$0.30 / 1EA').unitPrice,up('$0.30 / 1EA').unitBasis],[0.3,'per_each']);
assert.deepEqual([up('$0.31 per wash').unitPrice,up('$0.31 per wash').unitBasis],[0.31,'per_wash']);
assert.deepEqual([up('($0.32/wash)').unitPrice,up('($0.32/wash)').unitBasis],[0.32,'per_wash']);
assert.deepEqual([up('$0.85 per 1 roll').unitPrice,up('$0.85 per 1 roll').unitBasis],[0.85,'per_roll']);
assert.deepEqual([up('$2.40/1L').unitPrice,up('$2.40/1L').unitBasis],[2.4,'per_L']);
assert.deepEqual([up('$3.50 per 100mL').unitPrice,up('$3.50 per 100mL').unitBasis],[3.5,'per_100mL']);
assert.equal(up('$4.50'),null);assert.equal(up('Save $1.00'),null);assert.equal(up(''),null);
// ---------- money / pack / promo ----------
assert.equal(C.parseMoney('$4.50'),4.5);assert.equal(C.parseMoney('Was $1,299.00'),1299);assert.equal(C.parseMoney('85c'),0.85);assert.equal(C.parseMoney('free'),null);
assert.deepEqual(C.parsePackSize('Fish Sauce 2 x 300mL'),{packQty:600,packUnit:'mL',packCount:2});
assert.deepEqual(C.parsePackSize('Jasmine Rice 5kg'),{packQty:5,packUnit:'kg'});
assert.deepEqual(C.parsePackSize('Toilet Paper 12 Rolls'),{packQty:12,packUnit:'roll'});
assert.deepEqual(C.parsePackSize('Laundry 40 Washes'),{packQty:40,packUnit:'wash'});
assert.equal(C.detectPromo('1/2 Price'),'half-price');assert.equal(C.detectPromo('Half price'),'half-price');assert.equal(C.detectPromo('2 for $9'),'multibuy');assert.equal(C.detectPromo('Down Down'),'price-drop');assert.equal(C.detectPromo('Special Buys'),'special-buy');assert.equal(C.detectPromo('Was $6.00'),'special');assert.equal(C.detectPromo('New'),null);
assert.equal(C.parsePromoEnd('Offer ends Tue 10 Nov','2026-11-04'),'2026-11-10');
assert.equal(C.parsePromoEnd('Ends 3 Jan','2026-12-28'),'2027-01-03','year rolls over');
assert.equal(C.parsePromoEnd('Valid until 2026-11-12'),'2026-11-12');
assert.equal(C.parsePromoEnd('ends 12/11','2026-11-04'),'2026-11-12','AU day/month order');
// ---------- facts only ----------
{const f=C.factsOnly({name:' Milk  2L ',price:3.1,image:'x',description:'y',review:'z',email:'a@b',rating:5,wasPrice:2});assert.deepEqual(Object.keys(f).sort(),[...C.FACT_FIELDS].sort());assert.equal(f.name,'Milk 2L');assert.equal(f.wasPrice,null,'was-price must exceed price')}
assert.equal(C.factsOnly({name:'x',price:0}),null);
// ---------- robots.txt ----------
const robots='User-agent: Googlebot\nDisallow: /\n\nUser-agent: *\nDisallow: /shop/search\nAllow: /shop/search/help$\nDisallow: /*?*sortBy=\nDisallow: /checkout\n';
assert.equal(C.robotsAllows(robots,'/shop/productdetails/123/x'),true);
assert.equal(C.robotsAllows(robots,'/shop/search/products?searchTerm=rice'),false,'search disallowed');
assert.equal(C.robotsAllows(robots,'/shop/search/help'),true,'longest Allow wins');
assert.equal(C.robotsAllows(robots,'/shop/browse/specials?sortBy=price'),false,'wildcards');
assert.equal(C.robotsAllows('','/anything'),true);assert.equal(C.robotsAllows('User-agent: *\nDisallow: /','/x'),false);
assert.equal(C.robotsAllows('User-agent: *\nDisallow:','/x'),true,'empty Disallow allows');
// ---------- challenge detection ----------
assert.deepEqual(C.detectChallenge({status:429}),{kind:'429'});assert.deepEqual(C.detectChallenge({status:403,title:'Shop'}),{kind:'403'});
assert.deepEqual(C.detectChallenge({status:200,title:'Pardon Our Interruption'}),{kind:'challenge'});
assert.deepEqual(C.detectChallenge({status:200,title:'Robot Check',text:'Enter the characters you see below'}),{kind:'challenge'});
assert.deepEqual(C.detectChallenge({status:200,title:'Shop',hasChallengeElement:true}),{kind:'challenge'});
assert.deepEqual(C.detectChallenge({status:500,title:'Error'}),{kind:'unusual'});
assert.equal(C.detectChallenge({status:200,title:'Half Price Specials | Woolworths',text:'Prices'}),null);
// ---------- pacing clamp ----------
for(const r of [0,0.3,0.99,1]){const d=C.pacing(r);assert.ok(d>=20000&&d<=40000,'production pacing 20–40 s')}
assert.equal(C.pacing(0,{minMs:10,maxMs:20},false),20000,'override ignored in production builds');
assert.equal(C.pacing(0,{minMs:10,maxMs:20},true),10,'test builds may shorten');
// ---------- schedule ----------
assert.equal(C.validSchedule(C.DEFAULT_SCHEDULE),true);assert.equal(C.validSchedule([{days:[9],start:'06:30',end:'07:00'}]),false);
{const wed0629=Date.parse('2026-11-04T06:29:00+11:00'),n=C.nextWindowStart(wed0629,C.DEFAULT_SCHEDULE,'Australia/Sydney');assert.equal(new Date(n).toISOString(),'2026-11-03T19:30:00.000Z','next window Wed 06:30 Sydney')}
assert.equal(C.storeMatches('Your store: Hurstville','Hurstville'),true);assert.equal(C.storeMatches('Coles Hurstville','Hurstville'),true);assert.equal(C.storeMatches('Kogarah','Hurstville'),false);

// ---------- DOM parsing in Chromium against fixtures ----------
(async()=>{
 const browser=await chromium.launch(),page=await browser.newPage();
 const fixtures:any={'https://www.woolworths.com.au/shop/productdetails/123456/squid-brand-fish-sauce':'woolworths-product.html','https://www.woolworths.com.au/shop/browse/specials/half-price':'woolworths-specials.html','https://www.coles.com.au/search/products?q=sauce':'coles-search.html','https://www.aldi.com.au/special-buys':'aldi-specials.html','https://www.chemistwarehouse.com.au/buy/98765/vitamin-c-500mg-120-tablets':'chemist-product.html','https://www.amazon.com.au/s?k=laundry':'amazon-search.html','https://www.woolworths.com.au/shop/search/products?searchTerm=challenge':'challenge.html','https://www.woolworths.com.au/shop/browse/empty':'empty.html'};
 await page.route('**/*',(route:any)=>{const u=route.request().url(),f=fixtures[u];if(f)return route.fulfill({status:200,contentType:'text/html; charset=utf-8',body:readFileSync('src/tests/fixtures/scout/'+f,'utf8')});return route.fulfill({status:204,body:''})});
 async function parse(url:string){await page.goto(url);await page.addScriptTag({path:'dist-extension/scout-core.js'});await page.addScriptTag({path:'dist-extension/scout-parse.js'});return page.evaluate(([cfg,href]:any)=>(globalThis as any).ScoutParse.extract(document,href,cfg,{status:200,today:'2026-11-04'}),[config,url])}
 // JSON-LD product
 let r:any=await parse('https://www.woolworths.com.au/shop/productdetails/123456/squid-brand-fish-sauce');
 assert.equal(r.retailer,'woolworths');assert.equal(r.pageType,'product');assert.equal(r.method,'json-ld');assert.equal(r.storeLabel,'Hurstville');assert.equal(r.signedIn,false);assert.equal(r.facts.length,1);
 let f=r.facts[0];assert.equal(f.name,'Squid Brand Fish Sauce 725mL');assert.equal(f.price,4.5);assert.equal(f.wasPrice,6);assert.equal(f.unitPrice,0.62);assert.equal(f.unitBasis,'per_100mL');assert.equal(f.productId,'123456');assert.equal(f.packQty,725);assert.equal(f.packUnit,'mL');assert.equal(f.promoType,'special');assert.equal(f.promoEnd,'2026-11-10');
 assert.ok(!JSON.stringify(r).includes('SHOULD NEVER'),'no descriptions/reviews collected');assert.ok(!JSON.stringify(r).includes('example.invalid'),'no images/personal data');
 // Specials list: 24 tiles, 12 inside open shadow roots
 r=await parse('https://www.woolworths.com.au/shop/browse/specials/half-price');
 assert.equal(r.pageType,'specials');assert.equal(r.facts.length,24,'all tiles incl. shadow DOM: '+r.facts.length);assert.equal(r.storeLabel,'Hurstville','store label prefix stripped');
 const half=r.facts.filter((x:any)=>x.promoType==='half-price'),drop=r.facts.filter((x:any)=>x.promoType==='price-drop');assert.equal(half.length,16);assert.equal(drop.length,8);
 f=r.facts.find((x:any)=>x.productId==='700000');assert.equal(f.price,7.5);assert.equal(f.wasPrice,15);assert.equal(f.unitPrice,1.5);assert.equal(f.unitBasis,'per_kg');assert.equal(f.promoEnd,'2026-11-10');assert.equal(f.packQty,5);assert.equal(f.packUnit,'kg');assert.match(f.productUrl,/^https:\/\/www\.woolworths\.com\.au\/shop\/productdetails\/700000\//);
 f=r.facts.find((x:any)=>x.productId==='700004');assert.equal(f.unitBasis,'per_wash');assert.equal(f.unitPrice,0.3);
 f=r.facts.find((x:any)=>x.productId==='700005');assert.equal(f.unitBasis,'per_roll');assert.equal(f.packUnit,'roll');assert.equal(f.packQty,12);
 // Coles search list: 30 tiles
 r=await parse('https://www.coles.com.au/search/products?q=sauce');
 assert.equal(r.retailer,'coles');assert.equal(r.pageType,'search');assert.equal(r.facts.length,30);assert.equal(r.storeLabel,'Coles Hurstville');
 f=r.facts.find((x:any)=>x.productId==='5000001');assert.equal(f.unitBasis,'per_each');assert.equal(f.unitPrice,0.85);assert.equal(f.promoType,'price-drop');
 f=r.facts.find((x:any)=>x.productId==='5000003');assert.equal(f.promoType,'multibuy');assert.equal(f.packQty,600);assert.equal(f.packCount,2);assert.equal(f.unitBasis,'per_100mL');
 f=r.facts.find((x:any)=>x.productId==='5000002');assert.equal(f.unitBasis,'per_kg');assert.equal(f.unitPrice,18);
 f=r.facts.find((x:any)=>x.productId==='5000000');assert.equal(f.unitBasis,'per_100g');assert.equal(f.unitPrice,1.2);
 // ALDI special buys + signed-in indicator
 r=await parse('https://www.aldi.com.au/special-buys');assert.equal(r.pageType,'specials');assert.equal(r.facts.length,8);assert.equal(r.signedIn,true,'signed-in marker detected');assert.equal(r.facts[0].promoType,'special-buy');assert.equal(r.facts[0].price,19.99);assert.equal(r.storeLabel,'ALDI Hurstville');
 // Chemist Warehouse product: meta tags only
 r=await parse('https://www.chemistwarehouse.com.au/buy/98765/vitamin-c-500mg-120-tablets');assert.equal(r.method,'meta');assert.equal(r.facts[0].price,14.99);assert.equal(r.facts[0].productId,'98765');assert.equal(r.facts[0].packQty,120);assert.equal(r.facts[0].packUnit,'each');
 // Amazon search results
 r=await parse('https://www.amazon.com.au/s?k=laundry');assert.equal(r.pageType,'search');assert.equal(r.facts.length,4);
 f=r.facts[0];assert.equal(f.productId,'B0TEST0000');assert.equal(f.unitBasis,'per_wash');assert.equal(f.unitPrice,0.32);assert.equal(f.wasPrice,25);assert.equal(f.price,19);
 assert.equal(r.facts[1].unitBasis,'per_roll');assert.equal(r.facts[2].unitBasis,'per_kg');assert.equal(r.facts[3].unitBasis,'per_100mL');assert.ok(!JSON.stringify(r).includes('SHOULD NEVER'));
 // Challenge page → no facts, kind challenge
 r=await parse('https://www.woolworths.com.au/shop/search/products?searchTerm=challenge');assert.equal(r.status,'challenge');assert.equal(r.challenge.kind,'challenge');assert.equal(r.facts.length,0);
 // Empty / broken page → parse-failed (feeds the parser-breakage detector)
 r=await parse('https://www.woolworths.com.au/shop/browse/empty');assert.equal(r.status,'parse-failed');assert.equal(r.challenge,null);
 // Unsupported site
 r=await page.evaluate(([cfg]:any)=>(globalThis as any).ScoutParse.extract(document,'https://example.org/',cfg),[config]);assert.equal(r.status,'unsupported');
 await browser.close();
 console.log('Scout parsing: unit prices, packs, promos, robots, challenges, pacing and 8 fixture pages passed.');
})().catch(e=>{console.error(e);process.exit(1)});
