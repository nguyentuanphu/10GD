// v1.7.3 store detection (owner: “bị hết ở tất cả các store” — no store found on any retailer).
// 1. The data-driven parser in Chromium against synthetic header fixtures modelled on the owner's
//    screenshots (no personal data; “Sam” is a placeholder): Woolworths “Direct to boot / Pick up /
//    Click & Collect: Wolli Creek” rendered late inside an open shadow root, Coles' store button next
//    to “When” (plus “Your store:” and aria-label variants), ALDI “Current store: 2205, Wolli Creek”,
//    Chemist Warehouse / Amazon AU = Online. A delivery address is never captured.
// 2. Signed-in markers: CW “My Account · Login or Sign up” = signed out; greetings count only in the header.
// 3. The page-structure sample shows where the store is (and never a greeting or an address).
// 4. Server: “Online” matching, effective stores (online retailers switched on), planner + leases for
//    “Online”, facts from online retailers stored as “Online”, online placement by postcode state,
//    config validation of the new regex lists, Studio “Sửa cửa hàng” (owner only, audited) picked up
//    by the device at its next heartbeat.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {chromium} from 'playwright';
const require=createRequire(import.meta.url);
const C=require('../.compiled/extension/scout-core.js');
const config=JSON.parse(readFileSync('extension/config/scout-config.json','utf8'));
const fx=(n:string)=>readFileSync('src/tests/fixtures/scout/'+n,'utf8');

// ---------- core matching ----------
assert.equal(C.storeMatches('Online','Trực tuyến'),true,'“Trực tuyến” is Online');assert.equal(C.storeMatches('Trực tuyến / Online','Online'),true);
assert.equal(C.storeMatches('Wolli Creek','Online'),false);assert.equal(C.storeMatches('Woolworths Wolli Creek','Wolli Creek'),true);

// ---------- parser in Chromium ----------
const browser=await chromium.launch();
try{
 const page=await browser.newPage();let body='';
 await page.route('**/*',(route:any)=>route.fulfill({status:200,contentType:'text/html; charset=utf-8',body}));
 async function parse(url:string,html:string,{wait}:any={}){body=html;await page.goto(url);if(wait)await page.waitForFunction(wait,null,{timeout:5000});await page.addScriptTag({path:'.compiled/extension/scout-core.js'});await page.addScriptTag({path:'.compiled/extension/scout-parse.js'});
  return page.evaluate(([cfg,href]:any)=>(globalThis as any).ScoutParse.extract(document,href,cfg,{status:200,today:'2026-11-02'}),[config,url])}
 const ww=(o:any={})=>fx('store-woolworths.html').replace('__ACCOUNT__',o.signedIn?'in':'out').replace('__ACCOUNT_TEXT__',o.signedIn?'':'<span>Log in or Sign up</span>').replace('__GREETING__',o.signedIn?'Hello, Sam':'Helping you find great value');
 const ribbonReady=()=>{const h=document.getElementById('fulfilment-host');return !!(h?.querySelector('[class*="fms-value"]')||h?.querySelector('wx-fulfilment-ribbon')?.shadowRoot?.querySelector('[class*="fms-value"]'))};
 // Woolworths (live structure): fulfilment ribbon METHOD + VALUE, rendered late; light DOM and open shadow root.
 let r:any=await parse('https://www.woolworths.com.au/?mode=boot',ww({signedIn:true}),{wait:ribbonReady});
 assert.equal(r.retailer,'woolworths');assert.equal(r.pageType,'other');assert.equal(r.storeLabel,'Wolli Creek','Direct to boot: Wolli Creek');assert.equal(r.signedIn,true,'“Hello, Sam” quick-links heading = signed in (real positive)');assert.equal(r.online,false);
 r=await parse('https://www.woolworths.com.au/?mode=pickup&shadow=1',ww(),{wait:ribbonReady});assert.equal(r.storeLabel,'Wolli Creek','Pick up: Wolli Creek (shadow root)');assert.equal(r.signedIn,false,'Log in or Sign up = signed out');
 r=await parse('https://www.woolworths.com.au/?mode=cc',ww(),{wait:ribbonReady});assert.equal(r.storeLabel,'Wolli Creek','Click & Collect: Wolli Creek');
 for(const sh of ['0','1']){r=await parse('https://www.woolworths.com.au/?mode=delivery&shadow='+sh,ww(),{wait:ribbonReady});assert.equal(r.storeLabel,null,'Delivery to: … is never a store');
  assert.ok(!/12 Sample|Sample Street|2205/.test(JSON.stringify(r)),'the delivery address is not captured anywhere')}
 // CSS-module hashes renamed (selectors miss) → the text patterns still find the store.
 {const c2=structuredClone(config);c2.retailers.woolworths.storeMethod=[];body=ww();await page.goto('https://www.woolworths.com.au/?mode=boot');await page.waitForFunction(ribbonReady);await page.addScriptTag({path:'.compiled/extension/scout-core.js'});await page.addScriptTag({path:'.compiled/extension/scout-parse.js'});
  assert.equal(await page.evaluate(([cfg]:any)=>(globalThis as any).ScoutParse.extract(document,location.href,cfg).storeLabel,[c2]),'Wolli Creek','text fallback');
  await page.goto('https://www.woolworths.com.au/?mode=delivery');await page.waitForFunction(ribbonReady);await page.addScriptTag({path:'.compiled/extension/scout-core.js'});await page.addScriptTag({path:'.compiled/extension/scout-parse.js'});
  assert.equal(await page.evaluate(([cfg]:any)=>(globalThis as any).ScoutParse.extract(document,location.href,cfg).storeLabel,[c2]),null,'text fallback never reads Delivery to')}
 // Before the SPA renders the ribbon: no store yet (the content script reads again on DOM changes).
 r=await parse('https://www.woolworths.com.au/?mode=boot&delay=60000',ww());assert.equal(r.storeLabel,null,'nothing rendered yet');
 // Coles (live structure): [data-testid=where-link] .coles-targeting-WhereAndWhenInfo next to “When”; store id from __NEXT_DATA__.
 const coles=(chip:string)=>fx('store-coles.html').replace('__CHIP__',chip);
 const where=(info:string,aria='')=>`<div data-testid="where-and-when-button" class="coles-targeting-WhereAndWhenButton"><button data-testid="where-link" class="coles-targeting-WhereLink fs-mask" ${aria?`aria-label="${aria}"`:''}><svg width="12" height="12"></svg><div class="coles-targeting-WhereAndWhenInfo css-1sg86vq e11zwolc5">${info}</div></button><button data-testid="when-link" aria-label="When, Select a time"><svg width="12" height="12"></svg>When</button></div>`;
 r=await parse('https://www.coles.com.au/',coles(where('Marrickville')));
 assert.equal(r.storeLabel,'Marrickville','where-link store');assert.equal(r.storeId,'7674','store id from the page JSON');assert.equal(r.signedIn,false,'Log in / Sign up = signed out');
 r=await parse('https://www.coles.com.au/',coles(where('Marrickville','Delivery to Marrickville. Change address')));assert.equal(r.storeLabel,null,'delivery mode: the suburb is not a store');assert.equal(r.storeId,null);
 r=await parse('https://www.coles.com.au/',coles(where('12 Sample St, Marrickville')));assert.equal(r.storeLabel,null,'an address is not a store');assert.ok(!JSON.stringify(r).includes('Sample St'));
 // Tolerant fallbacks (class names changed): chip before When, a “Your store:” dialog, an aria-label.
 r=await parse('https://www.coles.com.au/',coles('<button class="store-btn"><svg width="12" height="12"></svg><span>Marrickville</span></button><button class="time-btn"><svg width="12" height="12"></svg><span>When</span></button>'));assert.equal(r.storeLabel,'Marrickville','store chip before When');
 r=await parse('https://www.coles.com.au/',coles('<div role="dialog"><p>Your store: <strong>Marrickville</strong></p><button>Change</button></div>'));assert.equal(r.storeLabel,'Marrickville','Your store: … dialog');
 r=await parse('https://www.coles.com.au/',coles('<button aria-label="Selected store Marrickville. Change store"><svg width="12" height="12"></svg></button><button><span>When</span></button>'));assert.equal(r.storeLabel,'Marrickville','aria-label');
 r=await parse('https://www.coles.com.au/',coles('<button><span>Delivering to</span></button><button><span>Marrickville</span></button><button><span>When</span></button>'));assert.equal(r.storeLabel,null,'a suburb after “Delivering to” is not a store');
 r=await parse('https://www.coles.com.au/',coles('<button><span>Help</span></button><button><span>When</span></button>'));assert.equal(r.storeLabel,null,'menu words are not stores');
 // ALDI (live structure): button.select-merchant-feature-bar__service-address “2205, Wolli Creek” → “Wolli Creek”; no accounts.
 r=await parse('https://www.aldi.com.au/',fx('store-aldi.html'));assert.equal(r.storeLabel,'Wolli Creek');assert.equal(r.signedIn,false);
 // Chemist Warehouse / Amazon AU: national online prices.
 r=await parse('https://www.chemistwarehouse.com.au/',fx('store-chemist.html').replace('__ACCOUNT__','Login or Sign up'));
 assert.equal(r.storeLabel,'Online');assert.equal(r.online,true);assert.equal(r.signedIn,false,'CW “My Account · Login or Sign up” is NOT signed in (owner screenshot 37)');assert.equal(r.pageType,'other');
 r=await parse('https://www.chemistwarehouse.com.au/',fx('store-chemist.html').replace('__ACCOUNT__','Hi, Sam'));assert.equal(r.signedIn,true,'CW greeting without a log-in link = signed in');
 r=await parse('https://www.amazon.com.au/',fx('store-amazon.html').replace('__HELLO__','Hello, sign in'));
 assert.equal(r.storeLabel,'Online');assert.equal(r.signedIn,false,'“Hello, sign in” = signed out');assert.ok(!/Wolli Creek|2205/.test(JSON.stringify(r)),'“Deliver to Wolli Creek 2205” is never read');
 r=await parse('https://www.amazon.com.au/',fx('store-amazon.html').replace('__HELLO__','Hello, Sam'));assert.equal(r.signedIn,true);
 // Config patterns are data: a server override can fix a site without an extension update.
 {const c2=structuredClone(config);c2.retailers.coles.store=[];c2.retailers.coles.storeText=[{re:'Shop at\\s*:\\s*(?:\\|\\s*)?([A-Za-z ]{2,40}?)\\s*(?:\\||$)',on:'segments'}];body=coles('<p>Shop at: <b>Newtown</b></p>');await page.goto('https://www.coles.com.au/');await page.addScriptTag({path:'.compiled/extension/scout-core.js'});await page.addScriptTag({path:'.compiled/extension/scout-parse.js'});
  assert.equal(await page.evaluate(([cfg]:any)=>(globalThis as any).ScoutParse.extract(document,'https://www.coles.com.au/',cfg).storeLabel,[c2]),'Newtown','override pattern used')}
 // Page-structure sample: where the store is shown, no greeting, no address.
 {await parse('https://www.woolworths.com.au/?mode=boot',ww({signedIn:true}),{wait:ribbonReady});
  const d:any=await page.evaluate(([cfg]:any)=>(globalThis as any).ScoutParse.diagnose(document,location.href,cfg,{}),[config]);
  assert.equal(d.store.label,'Wolli Creek');assert.equal(d.store.how,'storeMethod');assert.ok(d.store.hints.some((h:string)=>/Direct to boot/.test(h)),'hints show the fulfilment line: '+JSON.stringify(d.store.hints));
  assert.ok(!JSON.stringify(d.store).includes('Sam'),'no greeting/name in the sample');
  await parse('https://www.woolworths.com.au/?mode=delivery',ww(),{wait:ribbonReady});
  const d2:any=await page.evaluate(([cfg]:any)=>(globalThis as any).ScoutParse.diagnose(document,location.href,cfg,{}),[config]);
  assert.ok(!/Sample|2205/.test(JSON.stringify(d2)),'no delivery address in the sample: '+JSON.stringify(d2.store));assert.equal(d2.store.label,null)}
 // ---------- live-structure price fields (search tiles, category, product pages) ----------
 const W=(n:string,u:string)=>parse(u,fx(n),{wait:()=>document.readyState==='complete'});
 r=await W('live-woolworths-search.html','https://www.woolworths.com.au/shop/search/products?searchTerm=salmon');
 assert.equal(r.pageType,'search');assert.equal(r.facts.length,3,'wc-product-tile shadow roots: '+r.facts.length);
 let f=r.facts.find((x:any)=>x.productId==='111111');assert.equal(f.price,10);assert.equal(f.wasPrice,12.5);assert.equal(f.unitPrice,100);assert.equal(f.unitBasis,'per_kg');assert.equal(f.promoType,'special');
 f=r.facts.find((x:any)=>x.productId==='222222');assert.equal(f.price,6);assert.equal(f.wasPrice,8.8);assert.equal(f.unitPrice,30);
 f=r.facts.find((x:any)=>x.productId==='333333');assert.equal(f.wasPrice,null);assert.equal(f.promoType,null);
 r=await W('live-coles-search.html','https://www.coles.com.au/search/products?q=salmon');
 assert.equal(r.facts.length,2,'ad tile without pricing skipped');assert.ok(!JSON.stringify(r).includes('SHOULD NOT'));
 f=r.facts.find((x:any)=>x.productId==='1234567');assert.equal(f.price,6);assert.equal(f.wasPrice,8);assert.equal(f.unitPrice,30);assert.equal(f.unitBasis,'per_kg');assert.ok(!/Was/.test(f.unitText||''),'unit text cut before “|”: '+f.unitText);
 f=r.facts.find((x:any)=>x.productId==='7654321');assert.equal(f.price,22);assert.equal(f.unitPrice,47.83);
 r=await W('live-coles-product.html','https://www.coles.com.au/product/coles-tasmanian-salmon-portions-skin-on-4-pack-460g-7654321');
 assert.equal(r.pageType,'product');assert.equal(r.facts[0].price,22,'main price, not the “Other options” tile');assert.equal(r.facts[0].unitPrice,47.83);
 r=await W('live-aldi-results.html','https://www.aldi.com.au/results?q=salmon');
 assert.equal(r.facts.length,2);f=r.facts.find((x:any)=>/Smoked/.test(x.name));assert.equal(f.price,9.99);assert.equal(f.unitPrice,49.95);assert.equal(f.unitBasis,'per_kg');assert.equal(f.packQty,200);
 f=r.facts.find((x:any)=>/Atlantic/.test(x.name));assert.equal(f.promoType,'special-buy');
 r=await W('live-chemist-category.html','https://www.chemistwarehouse.com.au/shop-online/542/fish-oil');
 assert.equal(r.pageType,'list');assert.equal(r.facts.length,2,'promo banner without a product link skipped');f=r.facts.find((x:any)=>x.productId==='12345');assert.equal(f.price,26.99);assert.equal(f.promoType,'half-price');assert.equal(f.storeLabel,'Online');
 r=await W('live-amazon-search.html','https://www.amazon.com.au/s?k=salmon+fillet');
 assert.equal(r.facts.length,2,'sponsored tile skipped');f=r.facts.find((x:any)=>x.productId==='B0G1BBJV92');assert.equal(f.price,32.67);assert.equal(f.unitPrice,72.59);assert.equal(f.unitBasis,'per_kg');assert.equal(f.wasPrice,null,'the unit price is not a was-price');
 f=r.facts.find((x:any)=>x.productId==='B0TESTWAS1');assert.equal(f.wasPrice,25,'struck price = was-price');
 console.log('PASS store detection + price fields on synthetic pages mirroring the live structure (Woolworths ribbon/shadow tiles, Coles where-link/ad tiles/PDP, ALDI, CW, Amazon; no address, signed-in markers, sample)');
}finally{await browser.close()}

// ---------- server ----------
const {memoryStores}=await import('./helpers/accounts.mjs');
const {createAccountsHandler}=await import('../netlify/lib/accounts.mjs');
const {createScoutHandler}=await import('../netlify/functions/scout.mjs');
const {createStudioHandler}=await import('../netlify/functions/studio.mjs');
const lib=await import('../netlify/lib/scout.mjs');
const {scoutPlacement,placementGap}=await import('../netlify/lib/scout-adapter.mjs');
const {listLog,dayKey}=await import('../netlify/lib/studio.mjs');
assert.equal(lib.storeMatches('Online','Trực tuyến'),true);assert.equal(lib.storeMatches('Wolli Creek','Online'),false);
assert.deepEqual(lib.effectiveStores({stores:{woolworths:'Wolli Creek'},client:{online:['amazon','chemist']}}),{woolworths:'Wolli Creek',chemist:'Online',amazon:'Online'});
assert.deepEqual(lib.effectiveStores({stores:{woolworths:'Wolli Creek'}}),{woolworths:'Wolli Creek'},'older extensions (no online list) keep their stores only');
assert.deepEqual(lib.effectiveStores({stores:{amazon:'Online'},client:{online:[]}}),{amazon:'Online'},'a typed store always counts');
assert.deepEqual(lib.storesOf({stores:{},client:{online:['amazon']}}),['amazon']);
// Placement: online prices by postcode state; never “no-store” for them.
assert.deepEqual(scoutPlacement({retailer:'amazon',postcode:'2205',storeLabel:'Online'},['NSW']),{state:'NSW',branchId:'amazon:online:NSW',branchLabel:'online',online:true});
assert.equal(placementGap({retailer:'chemist',postcode:'2205',storeLabel:null},['NSW']),'no-branch');assert.equal(placementGap({retailer:'coles',postcode:'2205',storeLabel:null},['NSW']),'no-store');
assert.equal(scoutPlacement({retailer:'woolworths',postcode:'2205',storeLabel:'Wolli Creek'},['NSW'])!.branchLabel,'Wolli Creek 2205');
// Config validation: the bundled config passes; bad patterns in the new lists are refused.
lib.validateConfig(structuredClone(config));
{const bad=structuredClone(config);bad.retailers.coles.storeText=[{re:'(',on:'segments'}];assert.throws(()=>lib.validateConfig(bad),/Invalid pattern|không hợp lệ/)}
{const bad=structuredClone(config);bad.retailers.chemist.signedIn.re=['('];assert.throws(()=>lib.validateConfig(bad),/Invalid pattern|không hợp lệ/)}

const getStoreFn=memoryStores(),env:any={STUDIO_ADMINS:'henrynguyen',SCOUT_DEV:'1'},origin='https://kitchen.test',EXT='chrome-extension://mjeoekikdicoojgoppnfibjbfpcfngja',published:any[]=[];
const adapter={async wantedItems(){return[{itemId:'nuoc-mam',name:'Fish sauce',families:3}]},async productMappings(){return[]},async lastSeen(){return{}},async catalogItems(){return[]},async publishObservation(o:any){published.push(o);return{placed:false,why:'no-item'}},async holdObservation(){},async recordMappingCandidate(){}};
const scout=createScoutHandler({getStoreFn,env,adapter}),studio=createStudioHandler({getStoreFn,env,limits:{all:5000,mutate:5000}}),accounts=createAccountsHandler({getStoreFn});
const reg=async(u:string)=>{const r=await accounts(new Request(origin+'/.netlify/functions/accounts?op=register',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','x-nf-client-connection-ip':'r-'+u},body:JSON.stringify({username:u,name:u,password:'synthetic-store-detect-42',trust:true})}));assert.equal(r.status,201);return r.headers.get('set-cookie')!.split(';')[0]};
const henry=await reg('henrynguyen'),alice=await reg('alice');
const dev=async(op:string,token:string,body?:any)=>{const r=await scout(new Request(origin+'/.netlify/functions/scout?op='+op,{method:body===undefined?'GET':'POST',headers:{Origin:EXT,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)}));return{status:r.status,...(await r.json())}};
await lib.setExtensionAllowed(getStoreFn,'alice',true,'henrynguyen',Date.now());
const {code}=await lib.createPairCode(getStoreFn,'alice',Date.now(),env);
const p=await dev('pair','',{code,name:'Alice PC',postcode:'2205',suburb:'Wolli Creek',version:'1.7.3'});assert.equal(p.status,201);const token=p.token,id=p.device.id;
await lib.saveNetwork(getStoreFn,{autoScout:'on',schedule:[{days:[0,1,2,3,4,5,6],start:'00:00',end:'24:00'}]},'henrynguyen',Date.now());
await lib.editDevice(getStoreFn,id,(x:any)=>({...x,autoAllowed:true}));
// No store, no online list yet → no stores (Run now refused with no-stores).
let v:any=await dev('heartbeat',token,{version:'1.7.3',autoEnabled:true});assert.deepEqual(v.storesEffective,{});assert.equal(v.planInfo.reasonIfEmpty,'no-stores');
assert.equal((await dev('run-now',token,{})).code,'no-stores');
// 1.7.3 reports the online-priced retailers switched on → they count as stores (“Online”).
v=await dev('heartbeat',token,{version:'1.7.3',autoEnabled:true,online:['amazon','chemist','woolworths']});
assert.deepEqual(v.storesEffective,{chemist:'Online',amazon:'Online'},'only online-priced retailers are added');assert.deepEqual(v.stores,{},'typed stores unchanged');assert.notEqual(v.planInfo.reasonIfEmpty,'no-stores');
assert.equal((await dev('run-now',token,{})).status,200,'Run now allowed with online retailers only');
const plan=await dev('plan',token);assert.ok(plan.tasks.some((t:any)=>t.retailer==='amazon'&&t.storeLabel==='Online'),'planner plans Amazon as Online');assert.ok(!plan.tasks.some((t:any)=>t.retailer==='woolworths'),'no store → no Woolworths tasks');
const leased=await dev('tasks',token,{runId:'run-online1',autoEnabled:true,max:5});assert.ok(leased.tasks.length>0&&leased.tasks.every((t:any)=>['amazon','chemist'].includes(t.retailer)),'leases for Online stores: '+JSON.stringify(leased.tasks.map((t:any)=>t.retailer)));
await dev('release',token,{taskIds:leased.tasks.map((t:any)=>t.taskId)});
// Facts from an online retailer are stored as Online even if a page sent a suburb.
await dev('results',token,{mode:'semi',items:[{retailer:'amazon',url:'https://www.amazon.com.au/dp/B0TEST0000',status:'ok',storeLabel:'Wolli Creek 2205',facts:[{name:'Synthetic laundry liquid 2L',price:19,storeLabel:'Wolli Creek 2205'}]}]});
assert.equal(published.at(-1).storeLabel,'Online');assert.equal(published.at(-1).retailer,'amazon');
// The extension saves a typed store (device-settings) — readiness ④ then has a supermarket store too.
v=await dev('device-settings',token,{stores:{woolworths:'Wolli Creek'}});assert.equal(v.stores.woolworths,'Wolli Creek');assert.equal(v.storesEffective.woolworths,'Wolli Creek');
// Studio “Sửa cửa hàng”: owner only, audited, picked up by the device at its next heartbeat.
const me=await (await studio(new Request(origin+'/.netlify/functions/studio?op=me',{headers:{cookie:henry}}))).json();
const studioPost=async(cookie:string,csrf:string,b:any)=>scout(new Request(origin+'/.netlify/functions/scout?op=studio-device',{method:'POST',headers:{Origin:origin,cookie,'x-studio-csrf':csrf,'Content-Type':'application/json'},body:JSON.stringify(b)}));
let res=await studioPost(alice,'x',{deviceId:id,action:'update',stores:{coles:'Hacker'}});assert.equal(res.status,403,'not a Studio account');
res=await studioPost(henry,me.csrf,{deviceId:id,action:'update',stores:{woolworths:'Wolli Creek',coles:'Marrickville',aldi:'Wolli Creek',chemist:'',amazon:''}});assert.equal(res.status,200);
assert.deepEqual((await lib.getDevice(getStoreFn,id)).stores,{woolworths:'Wolli Creek',coles:'Marrickville',aldi:'Wolli Creek'});
const log=await listLog(getStoreFn,'audit',{now:Date.now(),limit:50,from:dayKey(Date.now()-86400000)});const entry=log.items.find((x:any)=>x.action==='scout_device_update');
assert.ok(entry,'audited');assert.deepEqual(entry.details.stores,{coles:{from:null,to:'Marrickville'},aldi:{from:null,to:'Wolli Creek'}},'audit names what changed');assert.equal(entry.actor,'henrynguyen');
v=await dev('heartbeat',token,{version:'1.7.3',autoEnabled:true,online:['amazon','chemist']});assert.equal(v.stores.coles,'Marrickville','device picks the Studio edit up at its next heartbeat');assert.equal(v.storesEffective.amazon,'Online');
const ov=await (await scout(new Request(origin+'/.netlify/functions/scout?op=studio-overview',{headers:{cookie:henry}}))).json();const row=ov.devices.find((d:any)=>d.id===id);assert.equal(row.storesEffective.amazon,'Online');assert.equal(row.stores.amazon,undefined);
console.log('PASS server: Online matching, effective stores, planner/leases for online retailers, Online facts + placement, config validation, Studio store edit (owner only, audited, picked up at heartbeat)');
