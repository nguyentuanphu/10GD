// v1.7.14 — owner, 8 Nov 2026 (Sydney time): “Bạn kiểm tra giỏ đồ của tôi, hôm qua vừa mới đi chợ rồi, cất đồ rồi mà tại sao vẫn hiện
// đồ để đi mua?” Two causes, found by doing the same in the browser:
//  1. a box / pack bought without a known weight was put away as 0 g, so the list kept asking for it in full;
//  2. rounding leftovers (996.9 g needed, 996.9 g kept) showed as 0.1 g to buy.
// Now a box / pack covers what the list asked for when put away (an estimate, shown in the pantry); boxes / packs put away before
// this fix are not guessed — the list asks “Đủ rồi / Vẫn cần mua”. 375×812 (VI) and 1280×800 (EN); Chromium simulation.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const origin='https://kitchen.test',out='docs/reviews/v1.7.14';mkdirSync(out,{recursive:true});
const mime:any={'.js':'application/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'};
const sizes:any={mobile:{width:375,height:812},desktop:{width:1280,height:800}};
(async()=>{
 const browser=await chromium.launch(process.env.BEP_CHROMIUM?{executablePath:process.env.BEP_CHROMIUM}:{});
 try{
  for(const [size,lang] of [['mobile','vi'],['desktop','en']] as const){const label=`${size} ${lang}`;
   const context=await browser.newContext({locale:'vi-VN',viewport:sizes[size],serviceWorkers:'block',reducedMotion:'reduce',timezoneId:'Australia/Sydney'});
   await context.addInitScript((lang:string)=>{if(sessionStorage.getItem('qa-init'))return;sessionStorage.setItem('qa-init','1');localStorage.setItem('bep-local-locked','yes');localStorage.setItem('guest/bep-language',lang)},lang);
   const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route(origin+'/**',async(r:any)=>{const u=new URL(r.request().url());if(u.pathname.startsWith('/.netlify/'))return r.fulfill({status:401,json:{error:'no'}});if(u.pathname==='/startup-scripts.json')return r.fulfill({json:JSON.parse(readFileSync('dist/startup-scripts.json','utf8'))});const f=resolve('dist',u.pathname==='/'?'index.html':u.pathname.slice(1));try{await r.fulfill({contentType:mime[extname(f)]||'application/octet-stream',body:readFileSync(f)})}catch{await r.fulfill({status:404,body:''})}});
   await page.goto(origin+'/#shopping',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#main h1'),null,{timeout:20000});
   const E=(s:string)=>page.evaluate(s) as Promise<any>;const shot=(n:string)=>page.screenshot({path:`${out}/${n}-${lang}-${sizes[size].width}x${sizes[size].height}.png`});
   await E(`(()=>{state.preferences.onboardingComplete=true;state.members=[['m-phu','Ba Phú',1],['m-mi','Mẹ Mi',1],['m-chi','Chi',.75]].map(([id,name,weight])=>({id,name,weight,emoji:''}));familyGenerate(state,weekStart,{sourceMode:'library'});for(const wk of Object.values(state.weeks))for(const day of Object.values(wk.days))for(const m of Object.values(day))if(m&&m.attendance)for(const q of state.members)m.attendance[q.id]??='home';state.pantry=[];state.preferences.pantryDeduct=true;weekStart=planStartOf(state,sydneyDate());selectedDate=sydneyDate();view='shopping';render()})()`);
   const toBuy=()=>E(`(()=>{const w=currentWeek(),[s,e]=shopDates();return shopping(state,w,s,e).filter(r=>shoppingHasAmount(r)&&!r.skip).map(r=>r.id)})()`);
   // one item bought by the box, with no weight known
   const boxed=await E(`(()=>{const w=currentWeek(),[s,e]=shopDates(),r=shopping(state,w,s,e).find(r=>shoppingHasAmount(r)&&INGREDIENTS[r.id][1]==='g');const sc=purchaseScope(s,e);w.buyingUnits={...(w.buyingUnits||{}),[sc]:{...((w.buyingUnits||{})[sc]||{}),[r.id]:{unit:'hộp',amount:1,pricePerUnit:null}}};save();render();return r.id})()`);
   assert.ok((await toBuy()).length>5,`${label}: a week's list to buy`);
   // shop for everything, then put it away
   await E(`(()=>{const w=currentWeek(),[s,e]=shopDates();for(const r of shopping(state,w,s,e).filter(r=>shoppingHasAmount(r)&&!r.skip))setShoppingBought(w,s,e,r,true);save();render()})()`);
   await E(`document.querySelector('#main [data-action="store-purchases"]').click()`);await page.locator('#modal-root #store-form').waitFor();await page.locator('#modal-root [data-action="submit-form"][data-id="store-form"]').click();await page.waitForFunction(()=>!document.querySelector('#modal-root #store-form'));await page.waitForTimeout(300);
   assert.deepEqual(await toBuy(),[],`${label}: after shopping and putting away, nothing is left to buy (owner's report)`);
   const lot:any=await E(`state.pantry.find(p=>p.ingredient===${JSON.stringify(boxed)})`);assert.ok(lot.qty>0&&lot.qtyEstimated===true&&lot.purchase.unit==='hộp',`${label}: the box covers what the list asked for, marked as an estimate ${JSON.stringify(lot)}`);
   await E(`view='pantry';render()`);assert.match(await page.locator('#main').innerText(),lang==='en'?/estimated to cover the planned meals/:/ước tính đủ cho các bữa đã lên lịch/,`${label}: the pantry says it is an estimate`);
   // a box put away before this fix (0 g): not guessed; the list asks
   await E(`(()=>{state.pantry=state.pantry.filter(p=>p.ingredient!==${JSON.stringify(boxed)});state.pantry.push({id:'qa-old-box',ingredient:${JSON.stringify(boxed)},qty:0,place:'fridge',expiry:'',purchase:{unit:'hộp',amount:1,pricePerUnit:null,currency:'AUD'}});save();view='shopping';render();scrollTo(0,0)})()`);
   assert.deepEqual(await toBuy(),[boxed],`${label}: an old box of unknown weight still shows`);
   const ask=page.locator(`#main .shop-row:has([data-id="${boxed}"]) .pack-cover`);await ask.waitFor();assert.match(await ask.innerText(),lang==='en'?/already put away/:/Đã cất 1 hộp/,`${label}: the row says what was put away`);
   assert.ok(await ask.locator('.btn').evaluateAll((b:any[])=>b.every(x=>x.getBoundingClientRect().height>=44)),`${label}: buttons ≥ 44 px`);await ask.scrollIntoViewIfNeeded();await shot('pack-cover-ask');
   await ask.locator('[data-flow="pack-enough"]').click();await page.waitForTimeout(300);assert.deepEqual(await toBuy(),[],`${label}: “Đủ rồi” takes it off the list`);
   assert.ok(await E(`state.pantry.find(p=>p.id==='qa-old-box').qtyEstimated===true`),`${label}: counted as an estimate`);
   // “Vẫn cần mua” keeps it and stops asking
   await E(`(()=>{const p=state.pantry.find(p=>p.id==='qa-old-box');p.qty=0;delete p.qtyEstimated;delete p.coverAsked;save();render()})()`);await page.locator(`#main .shop-row:has([data-id="${boxed}"]) [data-flow="pack-need"]`).click();await page.waitForTimeout(300);
   assert.deepEqual(await toBuy(),[boxed],`${label}: “Vẫn cần mua” keeps it on the list`);assert.equal(await page.locator('#main .pack-cover').count(),0,`${label}: and stops asking`);
   const ow=await E('document.documentElement.scrollWidth-innerWidth');assert.ok(ow<=1,`${label}: overflow ${ow}`);assert.deepEqual(errors,[],`${label}: page errors`);await context.close();console.log('✓',label)}
  console.log('PASS v1.7.14: nothing left to buy after shopping and putting away; boxes of unknown weight handled');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
