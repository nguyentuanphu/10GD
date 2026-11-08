// v1.7.15 — owner, 8 Nov 2026 (Sydney time): “Làm một cái magnify glass trên góc phải của mỗi trang làm tìm kiếm những thứ mà người ta cần” and
// “trong how to use thì cần có 1 tab để cho người ta biết mình có features gì và nó là như thế nào”. Plan approved by pop-up: search dishes,
// pantry, shopping, menu, receipts / spending / prices, guests and invitations, features and settings — but NOT the switches that turn off
// usage or voice statistics; no voice search. 375×812, 320×740, 820×1100 (VI) and 1280×800 (EN); Chromium simulation.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const origin='https://kitchen.test',out='docs/reviews/v1.7.15';mkdirSync(out,{recursive:true});
const mime:any={'.js':'application/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'};
const sizes:any={mobile:{width:375,height:812},narrow:{width:320,height:740},tablet:{width:820,height:1100},desktop:{width:1280,height:800}};
(async()=>{
 const browser=await chromium.launch(process.env.BEP_CHROMIUM?{executablePath:process.env.BEP_CHROMIUM}:{});
 try{
  for(const [size,lang] of [['mobile','vi'],['narrow','vi'],['tablet','vi'],['desktop','en']] as const){const label=`${size} ${lang}`;
   const context=await browser.newContext({locale:'vi-VN',viewport:sizes[size],serviceWorkers:'block',reducedMotion:'reduce',timezoneId:'Australia/Sydney'});
   await context.addInitScript((lang:string)=>{if(sessionStorage.getItem('qa-init'))return;sessionStorage.setItem('qa-init','1');localStorage.setItem('bep-local-locked','yes');localStorage.setItem('guest/bep-language',lang)},lang);
   const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route(origin+'/**',async(r:any)=>{const u=new URL(r.request().url());if(u.pathname.startsWith('/.netlify/'))return r.fulfill({status:401,json:{error:'no'}});if(u.pathname==='/startup-scripts.json')return r.fulfill({json:JSON.parse(readFileSync('dist/startup-scripts.json','utf8'))});const f=resolve('dist',u.pathname==='/'?'index.html':u.pathname.slice(1));try{await r.fulfill({contentType:mime[extname(f)]||'application/octet-stream',body:readFileSync(f)})}catch{await r.fulfill({status:404,body:''})}});
   await page.goto(origin+'/#today',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#main h1'),null,{timeout:20000});
   const E=(s:string)=>page.evaluate(s) as Promise<any>;const shot=(n:string)=>page.screenshot({path:`${out}/${n}-${lang}-${sizes[size].width}x${sizes[size].height}.png`});
   await E(`(()=>{state.preferences.onboardingComplete=true;state.members=[['m-phu','Ba Phú',1],['m-mi','Mẹ Mi',1]].map(([id,name,weight])=>({id,name,weight,emoji:''}));familyGenerate(state,weekStart,{sourceMode:'library'});
    state.pantry=[{id:'qa-p1',ingredient:'pork',qty:500,place:'fridge',expiry:addDays(sydneyDate(),2)}];state.receipts=[{id:'qa-r1',store:'Synthetic Butcher',date:sydneyDate(),total:30.21,currency:'AUD',items:[{id:'qa-i1',label:'PORK BELLY',total:30.21,ingredient:'pork'}]}];
    const d=addDays(sydneyDate(),2),day=ensureWeek(state,planStartOf(state,d)).days[d],t=MEAL_TYPES.find(x=>fmMealOn(day,x)&&day[x]);setMealGuests(day[t],[{name:'Nhà anh Tuấn',adults:3,kids:0}]);save();closeModal();view='today';render();scrollTo(0,0)})()`);
   // the magnifier: drawn, top right, ≥ 44 px, on every screen
   for(const v of ['today','planner','shopping','pantry','recipes']){await E(`location.hash='${v}'`);await page.waitForTimeout(150);const b=await page.locator('#app-search').boundingBox();
    assert.ok(b&&b.width>=44&&b.height>=44&&b.y<80&&b.x+b.width>sizes[size].width*0.35,`${label} ${v}: magnifier at the top right, ≥ 44 px ${JSON.stringify(b)}`);
    assert.ok(await E(`!!document.querySelector('#app-search svg')`),`${label} ${v}: drawn`);assert.equal(await page.locator('#app-search').getAttribute('aria-label'),lang==='en'?'Search':'Tìm kiếm')}
   await E(`location.hash='today'`);await page.waitForTimeout(150);await page.locator('#app-search').click();const input=page.locator('#app-search-input');await input.waitFor();
   assert.ok(await input.evaluate((i:any)=>document.activeElement===i),`${label}: the search box has the focus`);
   const groups=async(q:string)=>{await input.fill(q);await page.waitForTimeout(200);return E(`Object.fromEntries([...document.querySelectorAll('#search-results .search-group')].map(g=>[g.querySelector('h3').textContent.trim(),[...g.querySelectorAll('.search-hit-row b')].map(b=>b.textContent)]))`)};
   const P=lang==='en'?{pantry:'In the pantry',receipt:'Receipts & prices',guest:'Guests',feature:'Features & settings',menu:'Menu',recipe:'Recipes'}:{pantry:'Trong tủ',receipt:'Hoá đơn & giá',guest:'Khách',feature:'Tính năng & cài đặt',menu:'Thực đơn',recipe:'Món ăn'};
   let g:any=await groups('pork');assert.ok(g[P.pantry]?.length&&g[P.receipt]?.includes('PORK BELLY'),`${label}: “pork” finds the pantry lot and the receipt line ${JSON.stringify(g)}`);
   g=await groups('thit heo');assert.ok(g[P.pantry]?.length,`${label}: Vietnamese without accents finds it too ${JSON.stringify(g)}`);
   g=await groups('synthetic butcher');assert.ok(g[P.receipt]?.includes('Synthetic Butcher'),`${label}: a shop finds its receipt`);
   g=await groups('tuan');assert.ok(g[P.guest]?.includes('Nhà anh Tuấn'),`${label}: guests ${JSON.stringify(g)}`);
   const dish=await E(`(()=>{const d=sydneyDate(),day=currentWeek().days[d];const t=MEAL_TYPES.find(x=>day[x]?.recipes?.length);return day[t].recipes[0].name})()`);g=await groups(dish);assert.ok(g[P.menu]?.includes(dish)&&g[P.recipe]?.length,`${label}: a dish on the menu and in the library ${JSON.stringify(g)}`);
   g=await groups(lang==='en'?'backup':'sao luu');assert.ok(g[P.feature]?.length,`${label}: features and settings ${JSON.stringify(g)}`);
   for(const q of ['tat thong ke','thong ke su dung','usage statistics','voice statistics','thong ke giong noi','voice sharing']){g=await groups(q);const all=JSON.stringify(g);assert.ok(!/thống kê sử dụng|thống kê giọng nói|usage statistics|voice statistics/i.test(all),`${label}: “${q}” does not offer the statistics switches ${all}`)}
   await groups('pork');assert.ok(await E(`[...document.querySelectorAll('#search-results .search-hit-row')].every(b=>b.getBoundingClientRect().height>=44&&!b.querySelector('svg'))`),`${label}: result rows ≥ 44 px, words only`);
   assert.ok(await E('document.documentElement.scrollWidth<=innerWidth+1'),`${label}: search sheet fits`);await shot('search-results');
   // a result opens its place: the pantry lot is shown
   await page.locator(`#search-results .search-group:has(h3:text-is("${P.pantry}")) .search-hit-row`).first().click();await page.waitForFunction(()=>location.hash==='#pantry'&&!!document.querySelector('.search-hit'));
   assert.equal(await E(`document.querySelector('.search-hit')?.dataset.ing`),'pork',`${label}: the pantry card is shown`);
   // Enter opens the first result; a feature opens its screen
   await page.locator('#app-search').click();await input.fill(lang==='en'?'shopping':'di cho');await page.waitForTimeout(150);await input.press('Enter');await page.waitForFunction(()=>location.hash==='#shopping');
   // works offline (everything is on the device)
   await context.setOffline(true);await page.locator('#app-search').click();g=await groups('pork');assert.ok(g[P.pantry]?.length,`${label}: search works offline`);await E('closeModal()');await context.setOffline(false);
   // Hướng dẫn sử dụng: Bắt đầu │ Tính năng
   await E(`openGuide(0)`);const tabs=page.locator('#modal-root .guide-tabs [role="tab"]');assert.equal(await tabs.count(),2);assert.equal(await page.locator('#guide-tab-steps').getAttribute('aria-selected'),'true');
   const tb=page.locator('#guide-tab-features'),y0=(await tb.boundingBox())!.y;await tb.click();await page.waitForTimeout(150);assert.ok(Math.abs((await tb.boundingBox())!.y-y0)<2,`${label}: the tab does not move when tapped (rule 24)`);
   assert.equal(await tb.getAttribute('aria-selected'),'true');assert.equal(await page.locator('#modal-root [data-guide-tour]').isHidden(),true);
   const feats:any=await E(`[...document.querySelectorAll('#guide-panel-features .feature-item')].map(li=>({art:!!li.querySelector('.feature-art svg'),title:li.querySelector('b').textContent,desc:li.querySelector('small').textContent,btn:li.querySelector('.feature-open').getBoundingClientRect().height>=44,btnArt:!!li.querySelector('.feature-open svg')}))`);
   assert.ok(feats.length>=20&&feats.every((f:any)=>f.art&&f.title&&f.desc.length>20&&f.btn&&!f.btnArt),`${label}: every feature has a drawing, a name, what it does and “Mở” (words only, ≥ 44 px) ${feats.length}`);
   assert.ok(!feats.some((f:any)=>/thống kê sử dụng|thống kê giọng nói|usage statistics|voice statistics/i.test(f.title)),`${label}: the statistics switches are not listed`);
   assert.ok(await E('document.documentElement.scrollWidth<=innerWidth+1'),`${label}: guide fits`);await shot('guide-features');
   await page.locator(`#guide-panel-features .feature-item:has(b:text-is("${lang==='en'?'Pantry':'Tủ đồ'}")) .feature-open`).click();await page.waitForFunction(()=>location.hash==='#pantry'&&!document.querySelector('#modal-root .modal'));
   const ow=await E('document.documentElement.scrollWidth-innerWidth');assert.ok(ow<=1,`${label}: overflow ${ow}`);assert.deepEqual(errors,[],`${label}: page errors`);await context.close();console.log('✓',label)}
  console.log('PASS v1.7.15: search at the top right of every screen (dishes, pantry, shopping, menu, receipts, guests, features; no statistics switches; offline) and the “Tính năng” tab in the guide');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
