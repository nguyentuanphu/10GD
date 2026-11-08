// v1.7.17 — owner, 9 Nov 2026 (Sydney time):
//  • “Phần menu ở dưới này không có sign để biết là có thêm menu và cần quẹt trái phải, khi ấn vào nút thêm 1 mớ menu đã ra ngoài bar
//    nhưng vẫn liệt kê. Với cả để khoảng vài giây … nếu không làm gì thì nó sẽ trở lại” — pop-ups: drawn arrows ‹ › at the ends, and
//    the bar slides back after 5 seconds without a touch (the page stays); More no longer repeats the sections of the bar.
//  • “… báo noti là sẽ cần bao lâu để chuẩn bị và nấu cho bữa tối” — pop-ups: start time from the dishes, optional preparation
//    minutes on family dishes; Today shows tonight's start time.
// 375×812, 320×740, 820×1100 (VI) and 1280×800 (EN); Chromium viewport simulation.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const origin='https://kitchen.test',out='docs/reviews/v1.7.17';mkdirSync(out,{recursive:true});
const mime:any={'.js':'application/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'};
const sizes:any={mobile:{width:375,height:812},narrow:{width:320,height:740},tablet:{width:820,height:1100},desktop:{width:1280,height:800}};
(async()=>{
 const browser=await chromium.launch(process.env.BEP_CHROMIUM?{executablePath:process.env.BEP_CHROMIUM}:{});
 try{
  for(const [size,lang] of [['mobile','vi'],['narrow','vi'],['tablet','vi'],['desktop','en']] as const){const label=`${size} ${lang}`;const phone=size==='mobile'||size==='narrow';
   const context=await browser.newContext({locale:'vi-VN',viewport:sizes[size],serviceWorkers:'block',reducedMotion:'reduce',timezoneId:'Australia/Sydney'});
   await context.addInitScript((lang:string)=>{if(sessionStorage.getItem('qa-init'))return;sessionStorage.setItem('qa-init','1');localStorage.setItem('bep-local-locked','yes');localStorage.setItem('guest/bep-language',lang)},lang);
   const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route(origin+'/**',async(r:any)=>{const u=new URL(r.request().url());if(u.pathname.startsWith('/.netlify/'))return r.fulfill({status:401,json:{error:'no'}});if(u.pathname==='/startup-scripts.json')return r.fulfill({json:JSON.parse(readFileSync('dist/startup-scripts.json','utf8'))});const f=resolve('dist',u.pathname==='/'?'index.html':u.pathname.slice(1));try{await r.fulfill({contentType:mime[extname(f)]||'application/octet-stream',body:readFileSync(f)})}catch{await r.fulfill({status:404,body:''})}});
   await page.goto(origin+'/#today',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#main h1'),null,{timeout:20000});
   const E=(s:string)=>page.evaluate(s) as Promise<any>;const shot=(n:string)=>page.screenshot({path:`${out}/${n}-${lang}-${sizes[size].width}x${sizes[size].height}.png`});
   await E(`(()=>{state.preferences.onboardingComplete=true;state.members=[['m-phu','Ba Phú',1],['m-mi','Mẹ Mi',1]].map(([id,name,weight])=>({id,name,weight,emoji:''}));familyGenerate(state,weekStart,{sourceMode:'library'});closeModal();save();view='today';location.hash='today';render();scrollTo(0,0)})()`);

   // 1. the bottom bar: arrows at the ends, a tap on an arrow slides it, 5 seconds later it slides back; More lists only the rest
   if(phone){const nav=page.locator('#nav'),right=page.locator('.nav-arrow-right'),left=page.locator('.nav-arrow-left');
    await right.waitFor();assert.ok(await left.isHidden(),`${label}: no left arrow at the start`);
    const rb=(await right.boundingBox())!;assert.ok(rb.width>=44&&rb.height>=44,`${label}: the arrow is a ≥ 44 px target (${rb.width}×${rb.height})`);
    assert.ok(await right.evaluate((b:any)=>!!b.querySelector('svg.btn-art')&&!!b.getAttribute('aria-label')),`${label}: the arrow is drawn and named for screen readers`);
    await shot('nav-arrow-start');
    const y0=await E('scrollY'),top0=(await page.locator('#main h1').boundingBox())!.y;await right.click();await page.waitForTimeout(250);
    const moved=await nav.evaluate((n:any)=>n.scrollLeft);assert.ok(moved>40,`${label}: the arrow slides the bar (${moved})`);await left.waitFor();
    assert.equal(await E('scrollY'),y0,`${label}: the page does not move`);assert.ok(Math.abs((await page.locator('#main h1').boundingBox())!.y-top0)<=1,`${label}: nothing on the page jumps (rule 24)`);
    assert.equal(await E('view'),'today',`${label}: an arrow does not change the screen`);await shot('nav-arrow-slid');
    await page.waitForTimeout(5600);assert.equal(await nav.evaluate((n:any)=>Math.round(n.scrollLeft)),0,`${label}: 5 seconds without a touch, the bar is back at the start`);
    assert.equal(await E('view'),'today',`${label}: and the screen is still Today`);assert.ok(await left.isHidden()&&await right.isVisible(),`${label}: arrows follow`);
    // when the open section is further along, the bar comes back to show it
    await page.locator('#nav a[href="#insights"]').evaluate((a:any)=>a.click());await page.waitForTimeout(300);await nav.evaluate((n:any)=>{n.scrollLeft=0;n.dispatchEvent(new Event('scroll'))});
    await page.waitForTimeout(5600);{const v:any=await E(`(()=>{const n=document.getElementById('nav'),el=n.querySelector('a.active'),a=el.getBoundingClientRect(),b=n.getBoundingClientRect();return {ok:a.left>=b.left-1&&a.right<=b.right+1,href:el.getAttribute('href'),sl:n.scrollLeft,al:a.left,ar:a.right,bl:b.left,br:b.right}})()`);assert.ok(v.ok&&v.href==='#insights',`${label}: after 5 seconds the open section (Thói quen) is in view again ${JSON.stringify(v)}`)}
    await E(`(()=>{view='today';location.hash='today';render()})()`);await page.waitForTimeout(200);
    // More: no section that is already in the bar
    await page.locator('#nav .mobile-more').click();await page.locator('.more-tools').waitFor();
    const rows:string[]=await page.locator('.more-tools .more-row').evaluateAll((a:any[])=>a.map(r=>r.getAttribute('href')||r.className));
    assert.ok(!rows.some(r=>/#(recipes|pantry|expenses|insights|products)$/.test(r)),`${label}: More does not repeat the bar (${rows})`);assert.ok(await page.locator('.more-tools .more-guide').count()===1,`${label}: the guide is still there`);
    assert.ok(!(await page.locator('#nav .mobile-more').getAttribute('class'))!.includes('active'),`${label}: “Thêm” is never shown as the open section`);
    await shot('more-menu');await E('closeModal()')}
   else assert.equal(await page.locator('.nav-arrow:not([hidden])').count(),0,`${label}: no arrows next to the sidebar`);

   // 2. tonight's start time on Today, from the dishes (preparation + cooking), and the preparation field on family dishes
   const today:string=await E('sydneyDate()');
   await E(`(()=>{state.preferences.dinnerTime='18:30';const r1={...clone(state.recipes.find(r=>r.category==='main'&&r.ingredients.length)),id:'qa-pho',name:'Phở bò nhà làm',time:90,prepTime:30,custom:true,origin:'family'};const r2={...clone(state.recipes.find(r=>r.category==='veg')||state.recipes[1]),id:'qa-rau',name:'Rau xào',time:10,custom:true,origin:'family'};delete r2.prepTime;
    state.recipes=state.recipes.filter(r=>!['qa-pho','qa-rau'].includes(r.id)).concat([r1,r2]);const m=mealAt(state,${JSON.stringify(today)},'dinner');m.recipes=[clone(r1),clone(r2)];m.cooked=false;save();view='today';location.hash='today';render();scrollTo(0,0)})()`);
   const line=page.locator(`#main .family-meal-card[data-meal-date="${today}"][data-meal-type="dinner"] .cook-timing`);await line.waitFor();
   assert.equal(await line.innerText(),lang==='en'?'Start cooking around 16:15 · 2 dishes, longest Phở bò nhà làm 120 min (prep 30 + cook 90)':'Bắt đầu nấu khoảng 16:15 · 2 món, lâu nhất Phở bò nhà làm 120 phút (chuẩn bị 30 + nấu 90)',`${label}: tonight's start time and how long it takes`);
   await line.scrollIntoViewIfNeeded();await shot('cook-timing-today');
   // a dish without a time is named, never guessed
   await E(`(()=>{const m=mealAt(state,${JSON.stringify(today)},'dinner');const r3={...clone(state.recipes.find(r=>r.id==='qa-rau')),id:'qa-notime',name:'Canh chưa ghi giờ'};delete r3.time;state.recipes.push(r3);m.recipes.push(clone(r3));save();render()})()`);
   assert.match(await line.innerText(),lang==='en'?/· 1 without a time$/:/· 1 món chưa ghi thời gian$/,`${label}: a dish without a time is said, not guessed`);
   // the family recipe editor: “Chuẩn bị (phút)” saved only when written
   await E(`familyRecipeEditor('qa-rau')`);const prep=page.locator('#family-recipe-form [name="prepTime"]');await prep.waitFor();assert.equal(await prep.inputValue(),'',`${label}: empty when not written`);
   assert.ok((await prep.boundingBox())!.height>=44,`${label}: ≥ 44 px`);await prep.fill('5');await prep.scrollIntoViewIfNeeded();await shot('prep-field');
   await page.locator('#family-recipe-form').evaluate((f:any)=>f.requestSubmit());await page.waitForTimeout(300);
   const saved:any=await E(`(()=>{const r=state.recipes.find(r=>r.id==='qa-rau'||r.name==='Rau xào');return {prep:r?.prepTime,time:r?.time}})()`);assert.ok(saved.prep===5&&saved.time===10,`${label}: preparation saved next to the cooking time ${JSON.stringify(saved)}`);
   await E(`familyRecipeEditor(state.recipes.find(r=>r.name==='Rau xào').id)`);await prep.waitFor();await prep.fill('');await page.locator('#family-recipe-form').evaluate((f:any)=>f.requestSubmit());await page.waitForTimeout(300);
   assert.equal(await E(`'prepTime' in state.recipes.find(r=>r.name==='Rau xào')`),false,`${label}: emptied, it is removed (nothing invented)`);
   await E('closeModal()');
   // 3. “Tự chạy thử” plays whole workflows (owner, 9 Nov 2026: “phải làm cả workflow… viết món, chụp ảnh… lên món cho các bữa,
   //    nấu, đi chợ, đi chợ về cất đồ check stock… mọi thứ phải hoạt động như dự tính”; pop-up: every step runs even after one fails)
   if(size==='mobile'||size==='desktop'){
    await E(`(()=>{closeModal();globalThis.BEP_SESSION={mode:'account',household:{id:'00000000-0000-4000-8000-000000000000',name:'Nhà Phú',role:'owner'},account:{username:'henry'}};view='today';location.hash='today';render()})()`);
    const real0=await E('JSON.stringify(state)');await E('bepAutoplay.open()');await page.locator('#ap-panel .ap-group').first().waitFor();
    assert.match(await page.locator('#ap-panel .ap-group').first().innerText(),lang==='en'?/Whole workflows \(15\)/:/Workflow trọn vẹn \(15\)/,`${label}: the workflows come first, 15 of them`);await shot('autoplay-workflows');
    await page.locator('#ap-panel [data-ap="all"]').click();await page.locator('#ap-bar').waitFor();await page.waitForFunction(()=>!(globalThis as any).bepAutoplay.running(),null,{timeout:300000});
    const res:any=await E('bepAutoplay.results()');const wf=Object.entries(res).filter(([k]:any)=>k.startsWith('wf-'));
    assert.equal(wf.length,15,`${label}: 15 workflows ran`);const bad=wf.filter(([,v]:any)=>!v.ok);assert.deepEqual(bad,[],`${label}: every workflow does what it should ${JSON.stringify(bad)}`);
    assert.ok(wf.every(([,v]:any)=>v.skipped||v.parts>=3),`${label}: each workflow is several checked steps ${JSON.stringify(wf.map(([k,v]:any)=>[k,v.parts]))}`);
    assert.ok(Object.values(res).every((v:any)=>v.ok),`${label}: the quick checks pass too`);assert.equal(await E('JSON.stringify(state)'),real0,`${label}: the family's own data is untouched`);
    await page.locator('#ap-panel .ap-sum').waitFor();await shot('autoplay-workflows-done');
    // a step that fails does not stop the rest of the workflow, and every failed step is reported
    await E(`(()=>{const st=document.createElement('style');st.id='qa-break';st.textContent='[data-action="add-stock"]{display:none!important}';document.head.append(st);window.__n0=bepLadybug.outbox().length})()`);
    await E(`bepAutoplay.run(['wf-cook'])`);await page.waitForFunction(()=>!(globalThis as any).bepAutoplay.running(),null,{timeout:120000});await E(`document.getElementById('qa-break').remove()`);
    const ck:any=(await E('bepAutoplay.results()'))['wf-cook'];assert.ok(!ck.ok&&ck.fails.length>=1&&ck.parts>=1,`${label}: the broken step is caught and later steps still ran ${JSON.stringify(ck)}`);
    assert.ok(ck.fails.some((f:any)=>/Thêm đồ|Stock tonight/.test(f.step)),`${label}: the failed step is named`);const out:any[]=await E('bepLadybug.outbox()');
    assert.ok(out.length===await E('window.__n0')+1&&out[out.length-1].body.note.split('\n').length>=2,`${label}: one report lists every failed step`);
    assert.ok(await page.locator('#ap-panel .ap-err').count()>=1,`${label}: the list shows the failed steps`);await E(`document.getElementById('ap-panel')?.remove()`)}
   const ow=await E('document.documentElement.scrollWidth-innerWidth');assert.ok(ow<=1,`${label}: overflow ${ow}`);assert.deepEqual(errors,[],`${label}: page errors`);await context.close();console.log('✓',label)}
  console.log('PASS v1.7.17: arrows at the ends of the sliding bar (drawn, ≥ 44 px), a tap slides it without moving the page, 5 seconds later it slides back keeping the open section in view; More no longer repeats the bar; tonight’s start-cooking time on Today from preparation + cooking minutes, dishes without a time named, the optional “Chuẩn bị (phút)” field; “Tự chạy thử” plays 15 whole workflows that all do what they should, and keeps going after a failed step — 375 / 320 / 820 / 1280, VI and EN');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
