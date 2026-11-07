// v1.7.13 — owner feedback 8 Nov 2026 (~09:50 Sydney time) on v1.7.12, with iPhone screenshots:
//  1. “Khu này chọn ngày tháng và bữa phải consistent với cả app design” — the guest sheet uses the app's own day and meal chips
//  2. “Nút chưa nấu bị đẩy xuống, nút còn dư nên để đâu hợp lý hơn?” — cook button stays top right; “Còn dư?” right under it
//  3. “Chào buổi sáng và giải phóng tủ lạnh… nằm phía dưới tin khẩn”
//  4. “Phần khoanh trong thực đơn các nút rời rạc và còn nhiều chỗ trống quá” — the week tools in tidy rows
//  5. Shopping mode: a way out (“Thoát”) besides “Đi chợ xong”; both big, with the glowing border; no motion when reduced
// 375×812, 320×740, 820×1100 (VI) and 1280×800 (EN). Chromium viewport simulation, not physical devices.
// Screenshots: docs/reviews/v1.7.13/.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const origin='https://kitchen.test',out='docs/reviews/v1.7.13';mkdirSync(out,{recursive:true});
const mime:any={'.js':'application/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'};
const sizes:any={mobile:{width:375,height:812},narrow:{width:320,height:740},tablet:{width:820,height:1100},desktop:{width:1280,height:800}};
const MEMBERS=[['m-phu','Ba Phú',1],['m-mi','Mẹ Mi',1],['m-chi','Chi',.75],['m-tien','Tiên',.75]];
(async()=>{
 const browser=await chromium.launch(process.env.BEP_CHROMIUM?{executablePath:process.env.BEP_CHROMIUM}:{});
 try{
  for(const [size,lang] of [['mobile','vi'],['narrow','vi'],['tablet','vi'],['desktop','en']] as const){
   const label=`${size} ${lang}`;
   for(const motion of (size==='mobile'?['no-preference','reduce']:['reduce']) as const){
   const context=await browser.newContext({locale:'vi-VN',viewport:sizes[size],serviceWorkers:'block',reducedMotion:motion,timezoneId:'Australia/Sydney'});
   await context.addInitScript((lang:string)=>{if(sessionStorage.getItem('qa-init'))return;sessionStorage.setItem('qa-init','1');localStorage.setItem('bep-local-locked','yes');localStorage.setItem('guest/bep-language',lang)},lang);
   const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route(origin+'/**',async(r:any)=>{const u=new URL(r.request().url());if(u.pathname.startsWith('/.netlify/'))return r.fulfill({status:401,json:{error:'no'}});if(u.pathname==='/startup-scripts.json')return r.fulfill({json:JSON.parse(readFileSync('dist/startup-scripts.json','utf8'))});const f=resolve('dist',u.pathname==='/'?'index.html':u.pathname.slice(1));try{await r.fulfill({contentType:mime[extname(f)]||'application/octet-stream',body:readFileSync(f)})}catch{await r.fulfill({status:404,body:''})}});
   await page.goto(origin+'/#today',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#main h1'),null,{timeout:20000});
   const E=(s:string)=>page.evaluate(s) as Promise<any>;
   const shot=(name:string)=>page.screenshot({path:`${out}/${name}-${lang}-${sizes[size].width}x${sizes[size].height}.png`});
   const noOverflow=async(where:string)=>{const ow=await E('document.documentElement.scrollWidth-innerWidth');assert.ok(ow<=1,`${label} ${where}: horizontal overflow ${ow}`)};
   await E(`(()=>{state.preferences.onboardingComplete=true;state.members=${JSON.stringify(MEMBERS)}.map(([id,name,weight])=>({id,name,weight,emoji:''}));familyGenerate(state,weekStart,{sourceMode:'library'});for(const wk of Object.values(state.weeks))for(const day of Object.values(wk.days))for(const m of Object.values(day))if(m&&m.attendance)for(const p of state.members)m.attendance[p.id]??='home';state.pantry=[{id:'qa-b',ingredient:'beef',qty:800,place:'fridge',expiry:''}];save();if(typeof closeModal==='function')closeModal();weekStart=planStartOf(state,sydneyDate());selectedDate=sydneyDate();view='today';render();scrollTo(0,0)})()`);

   if(motion==='no-preference'){ // 5b. the glowing border moves when motion is allowed (and stops below)
    await E(`view='shopping';render()`);await page.locator('#main [data-flow="shop-start"]').click();await page.locator('#main .shop-mode-bar').waitFor();
    const anim=await E(`getComputedStyle(document.querySelector('#main .shop-finish'),'::before').animationName`);assert.notEqual(anim,'none',`${label}: the glowing border moves when motion is allowed`);
    await page.locator('#main [data-flow="shop-exit"]').click();await context.close();continue}

   // 1. guest sheet: the app's own chips, no phone date box / drop-down
   {await page.locator('#main .guest-shortcut').click();await page.locator('#modal-root .guest-when .pick-day').first().waitFor();
    assert.equal(await page.locator('#modal-root .guest-when input[type="date"], #modal-root .guest-when select').count(),0,`${label}: no phone date box or drop-down`);
    const chips:any=await E(`[...document.querySelectorAll('#modal-root .guest-when .pick-day, #modal-root .guest-when .pick-meals .chip')].filter(b=>b.offsetParent).map(b=>{const r=b.getBoundingClientRect();return{h:r.height,w:r.width}})`);assert.ok(chips.length>4&&chips.every((c:any)=>c.h>=44&&c.w>=44),`${label}: day and meal chips ≥ 44 px`);
    const inside=await E(`(()=>{const f=document.querySelector('#modal-root .guest-when').getBoundingClientRect(),d=document.querySelector('#modal-root .guest-when .pick-days').getBoundingClientRect();return d.right<=f.right+1&&d.left>=f.left-1})()`);assert.ok(inside,`${label}: the day chips scroll inside the box`);
    const tomorrow=await E('addDays(sydneyDate(),1)');await page.locator(`#modal-root [data-guest-pick="to-date"][data-v="${tomorrow}"]`).click();
    assert.equal(await page.locator('#modal-root [name="to-date"]').inputValue(),tomorrow,`${label}: tapping a day chip picks it`);assert.ok(await page.locator(`#modal-root [data-guest-pick="to-date"][data-v="${tomorrow}"]`).evaluate((b:any)=>b.classList.contains('active')&&b.getAttribute('aria-pressed')==='true'),`${label}: the chosen chip is marked`);
    await page.locator(`#modal-root [data-guest-pick="from-date"][data-v="${await E('addDays(sydneyDate(),2)')}"]`).click();assert.equal(await page.locator('#modal-root [name="to-date"]').inputValue(),await E('addDays(sydneyDate(),2)'),`${label}: the last day never comes before the first`);
    await noOverflow('guest sheet');await shot('guest-chips');await E('closeModal()')}

   // 2. meal card: the cook button stays at the top right, “Còn dư?” right under it
   {const T=await E(`(()=>{const day=currentWeek().days[selectedDate];const t=MEAL_TYPES.find(x=>fmMealOn(day,x)&&day[x]&&!day[x].recipes.some(r=>r.batchId))||MEAL_TYPES.find(x=>fmMealOn(day,x));const m=day[t];m.recipes=[clone(state.recipes.find(r=>r.category==='main'&&r.ingredients.length))];m.cooked=false;consumeMeal(state,m);save();render();return t})()`);
    const card=page.locator(`#main .family-meal-card[data-meal-type="${T}"]`).first();await card.scrollIntoViewIfNeeded();
    const g:any=await card.evaluate((c:any)=>{const h=c.querySelector('header'),title=h.querySelector('h3').getBoundingClientRect(),cook=h.querySelector('.meal-cook-btn').getBoundingClientRect(),left=h.querySelector('.leftover-ask')?.getBoundingClientRect(),hr=h.getBoundingClientRect();return{cookTop:cook.top-title.top,cookRight:hr.right-cook.right,leftUnder:left?left.top>=cook.bottom-1&&Math.abs(left.left-cook.left)<=1&&Math.abs(left.width-cook.width)<=1:false,inHeader:left?left.bottom<=hr.bottom+1:false,h:left?.height}});
    assert.ok(g.cookTop<=12&&g.cookRight<=24,`${label}: “Chưa nấu” stays at the top right, level with the meal name ${JSON.stringify(g)}`);
    assert.ok(g.leftUnder&&g.inHeader&&g.h>=44,`${label}: “Còn dư?” sits right under it, same width, in the header ${JSON.stringify(g)}`);
    await noOverflow('meal card');await shot('meal-card-buttons')}

   // 3. Today: greeting and use-it-up right under the urgent notes
   {await E(`render();scrollTo(0,0)`);const order:any=await E(`(()=>{const kids=[...document.querySelector('#main').children];const i=kids.findIndex(c=>c.classList.contains('family-urgent'));const nx=kids[i+1];return{next:nx?.className,rows:nx?[...nx.querySelectorAll(':scope > details')].map(d=>d.dataset.flowRow):[],gridAfter:kids.slice(i+1).findIndex(c=>c.classList.contains('dashboard-grid'))>0}})()`);
    assert.match(order.next||'',/flow-rows-top/,`${label}: a row group right under the urgent notes`);assert.deepEqual(order.rows.filter((k:string)=>k==='greeting'||k==='fridge').sort(),['fridge','greeting'].filter(k=>order.rows.includes(k)).sort(),`${label}: greeting and use-it-up there`);assert.ok(order.rows.includes('fridge'),`${label}: “Giải phóng tủ lạnh” under the urgent notes`);assert.ok(order.gridAfter,`${label}: then the day's meals`);
    await page.locator('#main .family-urgent').scrollIntoViewIfNeeded();await shot('today-rows')}

   // 4. week tools: three tidy rows, small buttons together, little empty space
   {await E(`view='planner';render();scrollTo(0,0)`);await page.locator('#main .week-tools').waitFor();
    const w:any=await E(`(()=>{const t=document.querySelector('#main .week-tools'),q=s=>t.querySelector(s)?.getBoundingClientRect(),sw=q(':scope>.week-switch'),pl=q(':scope>[data-flow="plan-start"]'),sh=q(':scope>.share-btn'),pk=q(':scope>.week-start-pick'),pa=q(':scope>.plan-actions');return{order:sw.top<pl.top&&Math.abs(pl.top-sh.top)<=2&&pk.top>=pl.top-4&&pa.top>pk.top,gap:pl.top-sw.bottom,toolsAbove:pa.top-sw.top,labelShort:t.querySelector('.week-start-pick span').innerText.trim().length<=14}})()`);
    assert.ok(w.order,`${label}: week first, then the small buttons side by side, then the plan actions ${JSON.stringify(w)}`);assert.ok(w.gap<=12,`${label}: no big empty space under the week (${w.gap})`);assert.ok(w.labelShort,`${label}: short “Tuần bắt đầu” label`);
    assert.ok(w.toolsAbove<=(size==='narrow'?240:170),`${label}: the week tools take little room above the plan actions (${Math.round(w.toolsAbove)} px)`);
    await noOverflow('week tools');await shot('week-tools')}

   // 5. shopping mode: “Thoát” and “Đi chợ xong”, big and glowing; “Thoát” leaves without opening anything
   {await E(`view='shopping';render();scrollTo(0,0)`);await page.locator('#main [data-flow="shop-start"]').click();await page.locator('#main .shop-mode-bar').waitFor();
    const b:any=await E(`[...document.querySelectorAll('#main .shop-mode-actions .btn')].map(x=>{const r=x.getBoundingClientRect(),cs=getComputedStyle(x,'::before');return{t:x.innerText.trim(),h:r.height,glow:x.classList.contains('kitchen-glow'),anim:cs.animationName,art:!!x.querySelector('.btn-art'),top:r.top}})`);
    assert.deepEqual(b.map((x:any)=>x.t),lang==='en'?['Leave','Finished shopping']:['Thoát','Đi chợ xong'],`${label}: “Thoát” and “Đi chợ xong”`);
    assert.ok(b.every((x:any)=>x.h>=56&&x.glow&&x.art),`${label}: both big (≥ 56 px), glowing border, drawn ${JSON.stringify(b)}`);assert.ok(Math.abs(b[0].top-b[1].top)<=1,`${label}: side by side`);
    assert.ok(b.every((x:any)=>x.anim==='none'),`${label}: no moving border when reduced motion is requested`);
    await noOverflow('shopping bar');await shot('shopping-bar');
    await page.locator('#main [data-flow="shop-exit"]').click();await page.waitForTimeout(200);
    assert.ok(!(await E(`document.body.classList.contains('shop-mode')`))&&!(await E(`!!document.querySelector('#modal-root .modal')`)),`${label}: “Thoát” leaves shopping mode without opening a sheet`);
    assert.ok(await E(`!!document.querySelector('#main .shop-mode-start')`),`${label}: “Bắt đầu đi chợ” is back`)}

   assert.deepEqual(errors,[],`${label}: page errors`);
   await context.close();console.log('✓',label);
  }}
  console.log('PASS v1.7.13: guest chips, cook / leftovers buttons, rows under urgent notes, tidy week tools, shopping mode way out');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
