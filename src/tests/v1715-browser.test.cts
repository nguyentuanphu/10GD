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
const route0=async(r:any)=>{const u=new URL(r.request().url());if(u.pathname.startsWith('/.netlify/'))return r.fulfill({status:401,json:{error:'no'}});const f=resolve('dist',u.pathname==='/'?'index.html':u.pathname.slice(1));try{await r.fulfill({contentType:mime[extname(f)]||'application/octet-stream',body:readFileSync(f)})}catch{await r.fulfill({status:404,body:''})}};
const groups0=async(page:any,q:string)=>{await page.locator('#app-search').click();const input=page.locator('#app-search-input');await input.fill(q);await page.waitForTimeout(200);return page.evaluate(`Object.fromEntries([...document.querySelectorAll('#search-results .search-group')].map(g=>[g.querySelector('h3').textContent.trim(),[...g.querySelectorAll('.search-hit-row b')].map(b=>b.textContent)]))`)};
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
   // “Cài app” (owner: “Thêm option add to homescreen function, check my repo/tpn để làm theo”; pop-up: with a small reminder)
   await E(`(()=>{localStorage.removeItem('bep-install-later');localStorage.removeItem('bep-installed');view='today';location.hash='today';render();scrollTo(0,0)})()`);await page.waitForTimeout(200);
   const nudge=page.locator('#main .install-nudge');await nudge.waitFor();const nb=nudge.locator('[data-install="open"]');
   assert.ok(await nb.evaluate((b:any)=>!!b.querySelector('svg.btn-art')&&b.getBoundingClientRect().height>=44),`${label}: “Cài app” drawn, ≥ 44 px`);assert.match(await nudge.innerText(),lang==='en'?/home screen/:/màn hình chính/);
   const later=nudge.locator('[data-install="later"]');const ly=(await later.boundingBox())!.y;await later.click();await page.waitForTimeout(100);assert.equal(await nudge.count(),0,`${label}: “Để sau” hides it`);
   await E('render()');await page.waitForTimeout(100);assert.equal(await page.locator('#main .install-nudge').count(),0,`${label}: and it stays hidden (14 days)`);void ly;
   await E(`otherSettingsModal('')`);assert.equal(await page.locator('#modal-root #settings-install [data-install="open"]').count(),1,`${label}: in Account & settings`);await E('closeModal()');
   if(size==='desktop'||size==='tablet')assert.equal(await page.locator('.side-bottom .install-side-link').count(),1,`${label}: in the sidebar`);
   // the browser's own install prompt (Android / Chrome / Edge): one tap
   await E(`(()=>{const e=new Event('beforeinstallprompt',{cancelable:true});e.prompt=async()=>{window.__qaPrompted=(window.__qaPrompted||0)+1};e.userChoice=Promise.resolve({outcome:'accepted'});dispatchEvent(e)})()`);
   await E(`otherSettingsModal('')`);await page.locator('#modal-root #settings-install [data-install="open"]').click();await page.waitForFunction(()=>(window as any).__qaPrompted===1);
   assert.ok(await E('installState().installed'),`${label}: installed after the prompt`);await E(`otherSettingsModal('')`);assert.equal(await page.locator('#modal-root #settings-install').count(),0,`${label}: nothing to install any more`);await E('closeModal()');
   assert.equal(await page.locator('.side-bottom .install-side-link').count(),0,`${label}: sidebar link gone once installed`);
   g=await groups0(page,lang==='en'?'add to home screen':'cai app');assert.ok(JSON.stringify(g).includes(lang==='en'?'Add to home screen':'Cài app vào màn hình chính'),`${label}: the search finds “Cài app” ${JSON.stringify(g)}`);await E('closeModal()');
   const ow=await E('document.documentElement.scrollWidth-innerWidth');assert.ok(ow<=1,`${label}: overflow ${ow}`);assert.deepEqual(errors,[],`${label}: page errors`);await context.close();console.log('✓',label)}
  // iPhone / iPad: Apple does not let a page install itself — a three-step picture guide (our drawings)
  {const context=await browser.newContext({viewport:{width:390,height:844},userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',locale:'vi-VN',serviceWorkers:'block',timezoneId:'Australia/Sydney'});
   await context.addInitScript(()=>{if(sessionStorage.getItem('qa-init'))return;sessionStorage.setItem('qa-init','1');localStorage.setItem('bep-local-locked','yes')});const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route(origin+'/**',route0);await page.goto(origin+'/#today',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#main h1'),null,{timeout:20000});
   await page.evaluate('state.preferences.onboardingComplete=true;closeModal();openInstall()');const steps=page.locator('#modal-root .install-step');await steps.first().waitFor();
   assert.equal(await steps.count(),3,'iPhone: three steps');assert.ok(await steps.evaluateAll((l:any[])=>l.every(x=>!!x.querySelector('.install-art svg'))),'iPhone: each step has its drawing');assert.match(await page.locator('#modal-root .install-steps').innerText(),/Chia sẻ[\s\S]*Thêm vào MH chính[\s\S]*Thêm/);
   assert.ok(await page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'iPhone guide fits');await page.screenshot({path:`${out}/install-guide-iphone-vi-390x844.png`});assert.deepEqual(errors,[]);await context.close();console.log('✓ iPhone install guide')}
  // opened from the home screen: no install entry, no reminder
  {const context=await browser.newContext({viewport:{width:375,height:812},locale:'vi-VN',serviceWorkers:'block',timezoneId:'Australia/Sydney'});
   await context.addInitScript(()=>{if(!sessionStorage.getItem('qa-init')){sessionStorage.setItem('qa-init','1');localStorage.setItem('bep-local-locked','yes')}const mm=window.matchMedia.bind(window);(window as any).matchMedia=(q:string)=>q.includes('standalone')?{matches:true,media:q,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}}:mm(q)});
   const page=await context.newPage();await page.route(origin+'/**',route0);await page.goto(origin+'/#today',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#main h1'),null,{timeout:20000});
   await page.evaluate('state.preferences.onboardingComplete=true;closeModal();render()');assert.equal(await page.locator('#main .install-nudge').count(),0,'standalone: no reminder');assert.equal(await page.evaluate('installState().installed'),true);await context.close();console.log('✓ installed (standalone): nothing offered')}
  // the manifest gives the home-screen icon its shortcuts
  {const m=JSON.parse(readFileSync('dist/manifest.webmanifest','utf8'));assert.deepEqual(m.shortcuts.map((x:any)=>x.url),['/#shopping','/#planner','/#expenses'],'home-screen shortcuts');console.log('✓ manifest shortcuts')}
  // Old devices (owner: “Làm app cho máy cũ hoạt động luôn được chứ”; iPad Air 1 / Safari 12 cannot be run here): the ES2017 copy parses
  // as ES2018 at most with no look-behind literal, and runs in Chromium with the newer pieces removed (no Object.hasOwn, .at, structuredClone,
  // Promise.allSettled, replaceChildren, PointerEvent; look-behind patterns throw) — the check at the top of index.html picks it
  {const acorn=require('acorn');const fs=require('node:fs');const p=JSON.parse(fs.readFileSync('dist/legacy/startup-scripts.json','utf8'));const files:[string,string][]=[...p.scripts.map((x:any)=>[x.name,x.code]),...['bootstrap.js','offline-access.js','polyfills.js'].map(f=>[f,fs.readFileSync('dist/legacy/'+f,'utf8')] as [string,string])];
   for(const [n,code] of files){acorn.parse(code,{ecmaVersion:2018,sourceType:'script',allowReturnOutsideFunction:true});for(const t of acorn.tokenizer(code,{ecmaVersion:2018}))if(t.type.label==='regexp')assert.ok(!/\(\?<[=!]/.test(t.value.pattern),n+': no look-behind literal')}
   assert.equal(p.hash,JSON.parse(fs.readFileSync('dist/startup-scripts.json','utf8')).hash,'same pack');console.log(`✓ old devices: ${files.length} files are ES2018 at most`);
   const context=await browser.newContext({viewport:{width:1024,height:768},locale:'vi-VN',serviceWorkers:'block',reducedMotion:'reduce',colorScheme:'light',timezoneId:'Australia/Sydney'});
   await context.addInitScript(()=>{if(!sessionStorage.getItem('qa-init')){sessionStorage.setItem('qa-init','1');localStorage.setItem('bep-local-locked','yes')}const w:any=window;delete w.Object.hasOwn;delete w.Array.prototype.at;delete w.String.prototype.at;delete w.structuredClone;delete w.PointerEvent;delete w.Promise.allSettled;delete w.Element.prototype.replaceChildren;
    const N=RegExp;const R:any=function(p:any,f?:any){if(typeof p==='string'&&p.indexOf('(?<')>=0)throw new SyntaxError('look-behind');return new N(p,f)};R.prototype=N.prototype;w.RegExp=R});
   const page=await context.newPage(),errors:string[]=[],got:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',(r:any)=>got.push(new URL(r.url()).pathname));await page.route(origin+'/**',route0);
   await page.goto(origin+'/#today',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#main h1'),null,{timeout:30000});
   assert.ok(await page.evaluate('window.BEP_LEGACY===true&&document.documentElement.classList.contains("legacy")'),'old device: the ES2017 copy is used');assert.ok(got.includes('/legacy/startup-scripts.json')&&!got.includes('/startup-scripts.json'),'old device: only the legacy pack is loaded');
   await page.evaluate(`(()=>{state.preferences.onboardingComplete=true;state.members=[['m-phu','Ba Phú',1],['m-mi','Mẹ Mi',1]].map(([id,name,weight])=>({id,name,weight,emoji:''}));familyGenerate(state,weekStart,{sourceMode:'library'});save();closeModal();render()})()`);
   for(const v of ['today','planner','shopping','pantry','recipes','expenses']){await page.evaluate(`location.hash='${v}'`);await page.waitForTimeout(250);assert.ok(await page.evaluate(`document.querySelector('#main h1')&&document.querySelector('#main').innerText.length>200`),`old device: ${v} shows`)}
   await page.locator('#app-search').click();await page.fill('#app-search-input','canh');await page.waitForTimeout(250);assert.ok(await page.evaluate(`document.querySelectorAll('#search-results .search-hit-row').length>0`),'old device: search works');await page.evaluate('closeModal()');
   await page.evaluate('newReceipt()');await page.locator('#modal-root .legacy-note').waitFor();assert.equal(await page.locator('#modal-root [data-feature="receipt-camera"]').count(),0,'old device: no photo reading, a short note instead');
   await page.waitForTimeout(300);await page.screenshot({path:`${out}/old-device-ipad-1024x768.png`});assert.deepEqual(errors,[],'old device: page errors');await context.close();console.log('✓ old devices: app runs with the newer pieces removed')}
  // Learned from other kitchen apps (owner: “Tất cả làm trong bản này luôn nhé”; pop-ups: family accounts for links, unknown ingredients
  // kept for the family, barcodes via the app's server): import a recipe from a link, scan a barcode into the pantry, timers in steps
  for(const [size,lang] of [['mobile','vi'],['desktop','en']] as const){const label=`kitchen extras ${size} ${lang}`;
   const context=await browser.newContext({locale:'vi-VN',viewport:sizes[size],serviceWorkers:'block',reducedMotion:'reduce',timezoneId:'Australia/Sydney'});
   await context.addInitScript((lang:string)=>{if(sessionStorage.getItem('qa-init'))return;sessionStorage.setItem('qa-init','1');localStorage.setItem('bep-local-locked','yes');localStorage.setItem('guest/bep-language',lang)},lang);
   const page=await context.newPage(),errors:string[]=[],sent:any[]=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route(origin+'/**',async(r:any)=>{const u=new URL(r.request().url());
    if(u.pathname==='/.netlify/functions/family'&&u.searchParams.get('op')==='recipe-import'){sent.push(JSON.parse(r.request().postData()||'{}'));return r.fulfill({json:{recipe:{name:'Thịt kho trứng',ingredients:['500 g pork belly, cubed','4 eggs','2 tbsp fish sauce','Salt to taste','1 cup something unknown'],steps:['Cut the pork.','Simmer for 45 minutes, then add the eggs.'],servings:4,time:75,source:'https://cook.example.com/r'}}})}
    if(u.pathname==='/.netlify/functions/family'&&u.searchParams.get('op')==='barcode'){sent.push({code:u.searchParams.get('code')});return r.fulfill({json:{found:true,name:'Free Range Eggs',brand:'Sunny',quantity:'700 g'}})}
    return route0(r)});
   await page.goto(origin+'/#recipes',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#main h1'),null,{timeout:20000});
   const E=(s:string)=>page.evaluate(s) as Promise<any>;const shot=(n:string)=>page.screenshot({path:`${out}/${n}-${lang}-${sizes[size].width}x${sizes[size].height}.png`});
   await E(`(()=>{state.preferences.onboardingComplete=true;closeModal();render()})()`);
   // without a family account: a short note, no request
   await page.locator('[data-kx="import-open"]').click();assert.equal(await page.locator('#modal-root [data-kx="import-go"]').count(),0,`${label}: no import without a family account`);assert.ok(await page.locator('#modal-root a[href="/login"]').count(),`${label}: sign-in link`);await E('closeModal()');
   await E(`(()=>{globalThis.BEP_SESSION={mode:'account',household:{id:'00000000-0000-4000-8000-000000000000',name:'Nhà Phú',role:'owner'}};render()})()`);
   await page.locator('[data-kx="import-open"]').click();const go=page.locator('#modal-root [data-kx="import-go"]');assert.ok(await go.evaluate((b:any)=>!!b.querySelector('svg.btn-art')&&b.getBoundingClientRect().height>=44),`${label}: “Nhập món” drawn, ≥ 44 px`);
   await page.fill('#kimp-url','https://cook.example.com/r');await shot('import-link');await go.click();await page.locator('#family-recipe-form').waitFor();
   // v1.7.19 (audit B23 / B11): the import opens for review and is saved only on Lưu; “2 tbsp” stays 2 muỗng canh (it was turned
   // into 30 ml of fish sauce and saved before the family saw it — the old assertions here checked that behaviour).
   assert.ok(!(await E(`state.recipes.some(r=>r.name==='Thịt kho trứng'&&r.source==='https://cook.example.com/r')`)),`${label}: nothing saved before Lưu`);
   const box=await E(`document.querySelector('#family-recipe-form [name="ingredients"]').value`);assert.ok(/Thịt heo \| 500 \| g/.test(box)&&/Trứng \| 4 \| quả/.test(box)&&/fish sauce \| 2 \| muỗng canh/.test(box)&&/Salt to taste/.test(box)&&/1 cup something unknown/.test(box),`${label}: every line, as the family would type it ${JSON.stringify(box)}`);await shot('import-editor');
   await E(`(()=>{const f=document.querySelector('#family-recipe-form');f.category.value='main';f.protein.value='pork'})()`);await page.locator('#modal-root .modal-footer [data-action="submit-form"]').click();await page.waitForTimeout(250);
   const rec:any=await E(`(()=>{const r=state.recipes.find(x=>x.source==='https://cook.example.com/r');return{ings:r.ingredients.map(i=>[i.id.startsWith('family-ing-')?INGREDIENTS[i.id][0]:i.id,i.qty]),missing:r.missingIngredients,steps:r.steps,servings:r.yield,time:r.time,own:r.custom===true&&r.origin==='family',source:r.source}})()`);
   /* owner decision, 12 Nov 2026: spoon amounts are notes, never bought */assert.deepEqual(rec.ings,[['pork',500],['egg',4]],`${label}: known ingredients; the spoon line is not counted ${JSON.stringify(rec)}`);
   assert.deepEqual([...rec.missing].sort(),['1 cup something unknown','Salt to taste','fish sauce 2 muỗng canh'],`${label}: every other line is kept as written for the family to match`);assert.ok(rec.servings===4&&rec.time===75&&rec.steps.length===2&&rec.own&&rec.source==='https://cook.example.com/r',`${label}: servings, time, steps, source; a family dish`);
   assert.deepEqual(sent[0],{url:'https://cook.example.com/r'});await E('closeModal()');
   // barcode: typed number (camera not available in the test), looked up, the pack size filled only in the ingredient's own unit
   await E(`location.hash='pantry'`);await page.waitForTimeout(200);const scan=page.locator('[data-kx="scan-open"]');assert.ok(await scan.evaluate((b:any)=>!!b.querySelector('svg.btn-art')&&b.getBoundingClientRect().height>=44),`${label}: “Quét mã vạch” drawn, ≥ 44 px`);
   await scan.click();await page.locator('#scan-code').waitFor();await page.fill('#scan-code','9300633603256');await page.locator('[data-kx="scan-typed"]').click();await page.locator('#scan-ing').waitFor();
   assert.equal(await page.locator('#scan-ing').inputValue(),'egg',`${label}: the product name suggests the ingredient`);assert.equal(await page.locator('#scan-qty').inputValue(),'',`${label}: 700 g is not filled in for eggs counted one by one`);
   await page.selectOption('#scan-ing','pork');assert.equal(await page.locator('#scan-qty').inputValue(),'700',`${label}: 700 g fits an ingredient in grams`);await page.selectOption('#scan-ing','egg');await page.fill('#scan-qty','10');
   assert.ok(await E('document.documentElement.scrollWidth<=innerWidth+1'),`${label}: fits`);await shot('barcode-confirm');await page.locator('#modal-root [data-kx="scan-save"]').click();await page.waitForTimeout(200);
   const lot:any=await E(`state.pantry.find(p=>p.barcode==='9300633603256')`);assert.ok(lot&&lot.ingredient==='egg'&&lot.qty===10&&lot.storedOn,`${label}: put in the pantry ${JSON.stringify(lot)}`);
   assert.equal(await E(`state.barcodeMap['9300633603256'].ingredient`),'egg',`${label}: the family's match is remembered`);
   // the second scan of the same code uses the family's match, no lookup
   const n=sent.length;await page.locator('[data-kx="scan-open"]').click();await page.fill('#scan-code','9300633603256');await page.locator('[data-kx="scan-typed"]').click();await page.locator('#scan-ing').waitFor();assert.equal(sent.length,n,`${label}: no second lookup`);assert.match(await page.locator('#modal-root').innerText(),lang==='en'?/matched by your family before/:/nhà mình đã ghép trước đây/);await E('closeModal()');
   // cooking: “45 minutes” in a step starts the timer; the end vibrates and tells the cook
   await E(`(()=>{window.__vib=0;navigator.vibrate=()=>{window.__vib++;return true};cooking={recipe:state.recipes.find(r=>r.source==='https://cook.example.com/r'),step:1};renderCooking()})()`);const st=page.locator('#modal-root .step-timer');await st.waitFor();
   assert.equal(await st.getAttribute('data-min'),'45');assert.ok((await st.boundingBox())!.height>=44,`${label}: the minutes are a button ≥ 44 px`);await st.click();await page.waitForTimeout(150);assert.match(await E(`document.querySelector('#timer-display').textContent`),/^4[45]:\d\d$/,`${label}: the 45-minute timer runs`);
   await E(`kitchenTimerDone()`);assert.ok(await E('window.__vib')>0,`${label}: the end vibrates`);await shot('cooking-step-timer');await E('closeModal()');
   assert.deepEqual(errors,[],`${label}: page errors`);await context.close();console.log('✓',label)}
  console.log('PASS v1.7.15: search at the top right of every screen (dishes, pantry, shopping, menu, receipts, guests, features; no statistics switches; offline) and the “Tính năng” tab in the guide; “Cài app” (prompt, iPhone guide, reminder, settings, sidebar, search, hidden once installed, shortcuts); old devices (ES2017 copy, polyfills); recipe import from a link, barcode into the pantry, timers in cooking steps');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
