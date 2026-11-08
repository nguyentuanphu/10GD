// v1.7.12 — owner, 8 Nov 2026 (Sydney time): “Tất cả việc trên làm trong round này luôn” after the pop-up choosing
// “Hôm nay gọn lại, Chế độ đi chợ, Cất đồ đúng chỗ tự động, Kế hoạch tuần + đồ còn dư”.
//  1. Put-away: meat / fish / fresh vegetables / chilled never suggested for the shelf (even when remembered there); use-by
//     suggested by kind and place and following the place; stock already kept on the shelf is flagged, moved only on a tap
//  2. Shopping mode: big list, extra buttons only on a tapped row, bought items sink, counter, “Xong đi chợ” → put away
//  3. Today, compact: the next meal first, extras as one-line rows
//  4. Leftovers: “Còn dư?” on a cooked meal → offered for the next meal → eat / throw out
//  5. Weekly plan: away days and guests for next week, then the menu preview
// 375×812, 320×740, 820×1100 (VI) and 1280×800 (EN). Chromium viewport simulation, not physical devices.
// Screenshots: docs/reviews/v1.7.12/flow/.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const origin='https://kitchen.test',out='docs/reviews/v1.7.12/flow';mkdirSync(out,{recursive:true});
const mime:any={'.js':'application/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'};
const sizes:any={mobile:{width:375,height:812},narrow:{width:320,height:740},tablet:{width:820,height:1100},desktop:{width:1280,height:800}};
const MEMBERS=[['m-phu','Ba Phú',1],['m-mi','Mẹ Mi',1],['m-chi','Chi',.75],['m-tien','Tiên',.75]];
(async()=>{
 const browser=await chromium.launch(process.env.BEP_CHROMIUM?{executablePath:process.env.BEP_CHROMIUM}:{});
 try{
  for(const [size,lang] of [['mobile','vi'],['narrow','vi'],['tablet','vi'],['desktop','en']] as const){
   const label=`${size} ${lang}`;
   const context=await browser.newContext({locale:'vi-VN',viewport:sizes[size],serviceWorkers:'block',reducedMotion:'reduce',timezoneId:'Australia/Sydney'});
   await context.addInitScript((lang:string)=>{if(sessionStorage.getItem('qa-init'))return;sessionStorage.setItem('qa-init','1');localStorage.setItem('bep-local-locked','yes');localStorage.setItem('guest/bep-language',lang)},lang);
   const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route(origin+'/**',async(r:any)=>{const u=new URL(r.request().url());if(u.pathname.startsWith('/.netlify/'))return r.fulfill({status:401,json:{error:'no'}});if(u.pathname==='/startup-scripts.json')return r.fulfill({json:JSON.parse(readFileSync('dist/startup-scripts.json','utf8'))});const f=resolve('dist',u.pathname==='/'?'index.html':u.pathname.slice(1));try{await r.fulfill({contentType:mime[extname(f)]||'application/octet-stream',body:readFileSync(f)})}catch{await r.fulfill({status:404,body:''})}});
   await page.goto(origin+'/#today',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#main h1'),null,{timeout:20000});
   const E=(s:string)=>page.evaluate(s) as Promise<any>;
   await E(`(()=>{state.preferences.onboardingComplete=true;state.members=${JSON.stringify(MEMBERS)}.map(([id,name,weight])=>({id,name,weight,emoji:''}));familyGenerate(state,weekStart,{sourceMode:'library'});for(const wk of Object.values(state.weeks))for(const day of Object.values(wk.days))for(const m of Object.values(day))if(m&&m.attendance)for(const p of state.members)m.attendance[p.id]??='home';state.pantry=[];save();if(typeof closeModal==='function')closeModal();weekStart=planStartOf(state,sydneyDate());selectedDate=sydneyDate();view='today';render()})()`);
   const shot=(name:string)=>page.screenshot({path:`${out}/${name}-${lang}-${sizes[size].width}x${sizes[size].height}.png`});
   const noOverflow=async(where:string)=>{const ow=await E('document.documentElement.scrollWidth-innerWidth');assert.ok(ow<=1,`${label} ${where}: horizontal overflow ${ow}`)};
   const targets=async(sel:string,where:string)=>{const small:any=await E(`[...document.querySelectorAll(${JSON.stringify(sel)})].filter(b=>b.offsetParent).map(b=>{const r=b.getBoundingClientRect();return{t:b.innerText.trim().slice(0,30),h:r.height,w:r.width}}).filter(x=>x.h<44||x.w<44)`);assert.deepEqual(small,[],`${label} ${where}: touch targets ≥ 44 px`)};

   // 1. put-away: beef remembered on the shelf goes to the fridge; dates follow the place; saved onto the lots
   {await E(`(()=>{state.preferences.storePlaces={beef:'dry'};const w=currentWeek(),[s,e]=shopDates();const rows=shopping(state,w,s,e).filter(r=>shoppingHasAmount(r));const pick=['beef','tomato','rice'].filter(id=>rows.some(r=>r.id===id));const ids=pick.length>=2?pick:rows.slice(0,3).map(r=>r.id);if(!rows.some(r=>r.id==='beef')){/* v1.7.17: an uncooked dinner in the list's days, everyone home, no beef already in the pantry (the plan made for the day and the hour decided this before, CI 9 Nov) */const k=Object.keys(w.days).filter(k=>k>=s&&k<=e).find(k=>w.days[k].dinner&&!w.days[k].dinner.cooked)||Object.keys(w.days).find(k=>k>=s&&k<=e);const m=w.days[k].dinner||w.days[k].lunch;for(const p of state.members)m.attendance[p.id]='home';state.pantry=state.pantry.filter(p=>p.ingredient!=='beef');m.recipes.push(clone(state.recipes.find(r=>r.ingredients.some(i=>i.id==='beef'))));ids.unshift('beef')}if(!shopping(state,w,s,e).some(r=>r.id==='beef'&&shoppingHasAmount(r)))throw Error('QA set-up: beef is not on the list');for(const id of ids){const row=shopping(state,w,s,e).find(r=>r.id===id);if(row)setShoppingBought(w,s,e,row,true)}save();view='shopping';render();window.__qaIds=ids})()`);
    await E(`document.querySelector('#main [data-action="store-purchases"]').click()`);await page.locator('#modal-root #store-form').waitFor();
    const rows:any=await E(`[...document.querySelectorAll('#modal-root .store-row')].map(r=>({id:r.querySelector('[data-store-useby]').dataset.storeUseby,place:r.querySelector('input[type=radio]:checked')?.value,use:r.querySelector('[data-store-useby]').value}))`);
    const beef=rows.find((r:any)=>r.id==='beef');assert.ok(beef,`${label}: beef is in the put-away sheet`);assert.equal(beef.place,'fridge',`${label}: beef remembered on the shelf is suggested for the fridge`);
    assert.equal(beef.use,await E(`addDays(sydneyDate(),2)`),`${label}: meat in the fridge: use by in 2 days`);
    await page.locator('#modal-root input[name="place-beef"][value="freezer"]').check();assert.equal(await page.locator('#modal-root [data-store-useby="beef"]').inputValue(),await E(`addDays(sydneyDate(),90)`),`${label}: the date follows the freezer`);
    await noOverflow('put-away sheet');await targets('#modal-root .store-useby input','put-away dates');await shot('put-away');
    await page.locator('#modal-root [data-action="submit-form"][data-id="store-form"]').click();await page.waitForFunction(()=>!document.querySelector('#modal-root #store-form'));
    const lot:any=await E(`state.pantry.find(p=>p.ingredient==='beef')`);assert.ok(lot&&lot.place==='freezer'&&lot.expiry===await E(`addDays(sydneyDate(),90)`),`${label}: beef put away in the freezer with its date ${JSON.stringify(lot)}`)}

   // 1b. stock already on the shelf is flagged, not moved; moved or kept on a tap
   {await E(`(()=>{state.pantry.push({id:'qa-dry-meat',ingredient:'chicken',qty:800,place:'dry',expiry:''},{id:'qa-dry-rice',ingredient:'rice',qty:800,place:'dry',expiry:''},{id:'qa-dry-pork',ingredient:'pork',qty:800,place:'dry',expiry:''});save();view='pantry';render();scrollTo(0,0)})()`);
    const note=page.locator('#main .misplaced-callout');await note.waitFor();assert.match(await note.innerText(),lang==='en'?/2 items may be in the wrong place/:/2 món có thể đang để sai chỗ/,`${label}: two perishables flagged (rice is fine on the shelf)`);
    assert.equal(await E(`state.pantry.find(p=>p.id==='qa-dry-meat').place`),'dry',`${label}: nothing moved by itself`);await noOverflow('pantry notice');await shot('misplaced-notice');
    await page.locator('#main [data-flow="misplaced"]').click();await page.locator('#modal-root .misplaced-row').first().waitFor();await targets('#modal-root .misplaced-actions .btn','misplaced sheet');await shot('misplaced-sheet');
    await page.locator('#modal-root [data-flow="move-lot"][data-id="qa-dry-meat"][data-place="fridge"]').click();await page.locator('#modal-root [data-flow="keep-lot"][data-id="qa-dry-pork"]').click();
    const st:any=await E(`({meat:state.pantry.find(p=>p.id==='qa-dry-meat').place,pork:state.pantry.find(p=>p.id==='qa-dry-pork'),notice:!!document.querySelector('#main .misplaced-callout')})`);
    assert.equal(st.meat,'fridge',`${label}: moved to the fridge on a tap`);assert.ok(st.pork.place==='dry'&&st.pork.placeOk,`${label}: “Giữ ở Tủ khô” keeps it and stops the warning`);assert.ok(!st.notice,`${label}: notice gone when everything is checked`);await E('closeModal()')}

   // 2. shopping mode
   {await E(`(()=>{const w=currentWeek(),[s,e]=shopDates();for(const row of shopping(state,w,s,e))setShoppingBought(w,s,e,row,false);state.preferences.pantryDeduct=false;save();view='shopping';render();scrollTo(0,0)})()`);
    const start=page.locator('#main [data-flow="shop-start"]');await start.waitFor();assert.ok(await start.evaluate((b:any)=>!!b.querySelector('.btn-art')),`${label}: “Bắt đầu đi chợ” has its drawing`);await start.click();
    const bar=page.locator('#main .shop-mode-bar');await bar.waitFor();assert.ok(await E(`document.body.classList.contains('shop-mode')`),`${label}: shopping mode on`);
    const vis:any=await E(`(()=>{const r=document.querySelector('#main .shopping-group .shop-row');const shown=s=>{const e=r.querySelector(s);return !!e&&!!e.offsetParent};return{check:shown('input.check'),name:shown('.item-label'),amount:shown('button[data-action="purchase-quantity"]'),round:shown('.qty-round-pair'),store:shown('.store-pill'),skip:shown('.row-skip'),heading:!!document.querySelector('#main .page-heading')?.offsetParent||!!document.querySelector('#main .kitchen-action-dock')?.offsetParent}})()`);
    assert.ok(vis.check&&vis.name&&vis.amount,`${label}: tick, name and amount shown ${JSON.stringify(vis)}`);assert.ok(!vis.round&&!vis.store&&!vis.skip&&!vis.heading,`${label}: extra buttons hidden until a row is tapped ${JSON.stringify(vis)}`);
    const total=await page.locator('#main .shopping-group .shop-row input.check[data-change="bought"]').count();assert.ok(total>=3,`${label}: rows to tick (${total})`);
    const firstGroup=page.locator('#main .shopping-group').first(),firstId=await firstGroup.locator('.shop-row input.check[data-change="bought"]').first().getAttribute('data-id');
    await firstGroup.locator(`.shop-row input.check[data-id="${firstId}"]`).check();await page.waitForTimeout(300);
    assert.match(await bar.innerText(),lang==='en'?new RegExp(`${total-1} of ${total} left`):new RegExp(`còn ${total-1} / ${total} món`),`${label}: the counter follows the ticks`);
    const order:any=await E(`(()=>{const g=document.querySelector('#main .shopping-group'),rows=[...g.querySelectorAll('.shop-row')].filter(r=>r.querySelector('input.check[data-change="bought"]'));const ys=rows.map(r=>({b:r.querySelector('input.check').checked,y:r.getBoundingClientRect().top}));const bought=ys.filter(x=>x.b),open=ys.filter(x=>!x.b);return !open.length||!bought.length||Math.min(...bought.map(x=>x.y))>Math.max(...open.map(x=>x.y))})()`);
    assert.ok(order,`${label}: a bought item sinks to the bottom of its aisle`);
    const row2=page.locator('#main .shopping-group .shop-row:not(.is-bought)').first();await row2.locator('.item-label').click();await page.waitForTimeout(200);
    assert.ok(await row2.evaluate((r:any)=>r.classList.contains('flow-open')&&!!r.querySelector('.qty-round-pair')?.offsetParent),`${label}: a tapped row shows its extra buttons`);assert.equal(await E(`document.querySelector('#modal-root .modal')?1:0`),0,`${label}: the tap does not open the ingredient sheet in shopping mode`);
    await noOverflow('shopping mode');await targets('#main .shop-mode-bar .btn','shopping bar');await E('scrollTo(0,0)');await shot('shopping-mode');
    await page.locator('#main [data-flow="shop-done"]').click();await page.locator('#modal-root #store-form').waitFor();assert.ok(!(await E(`document.body.classList.contains('shop-mode')`)),`${label}: “Xong đi chợ” leaves shopping mode`);await E('closeModal()')}

   // 3. Today compact: next meal first, extras as one-line rows
   {await E(`(()=>{state.pantry.push({id:'qa-today',ingredient:'beef',qty:500,place:'fridge',expiry:''});const day=currentWeek().days[selectedDate];for(const t of MEAL_TYPES)if(day[t]){day[t].cooked=false;day[t].consumed=[]}save();view='today';render();scrollTo(0,0)})()`);
    const order:any=await E(`[...document.querySelector('#main').children].map(c=>c.classList.contains('next-meal')?'next':c.classList.contains('dashboard-grid')?'grid':c.classList.contains('flow-rows')?'rows':c.classList.contains('day-strip')?'strip':'').filter(Boolean)`);
    /* v1.7.13 (owner): the greeting and “Giải phóng tủ lạnh” rows sit right under the urgent notes, the other extras at the bottom */ /* v1.7.14 (owner, 8 Nov 2026): “các bữa vẫn nên hiện như thường, không nên đẩy bữa tiếp theo lên trước” */assert.deepEqual(order,['strip','rows','grid','rows'],`${label}: day strip, greeting + use-it-up rows, the day's meals in their usual order, then the other extras`);
    const types:any=await E(`(()=>{const t=[...document.querySelectorAll('#main .dashboard-grid .family-meal-card[data-meal-type]')].map(c=>c.dataset.mealType);return{shown:t.join(),usual:MEAL_TYPES.filter(x=>t.includes(x)).join()}})()`);assert.ok(types.shown&&types.shown===types.usual,`${label}: the day's meals in their usual order (${types.shown})`);assert.equal(await E(`document.querySelectorAll('#main .next-meal').length`),0,`${label}: no meal pulled out as “Bữa tiếp theo”`);
    const rows:any=await E(`[...document.querySelectorAll('#main .flow-rows > details')].map(d=>({k:d.dataset.flowRow,open:d.open}))`);assert.ok(rows.length>=2&&rows.every((r:any)=>!r.open),`${label}: extras closed as one-line rows ${JSON.stringify(rows)}`);
    await noOverflow('today');await page.locator('#main .dashboard-grid').scrollIntoViewIfNeeded();await shot('today-meals');await page.locator('#main .flow-rows:not(.flow-rows-top)').scrollIntoViewIfNeeded();await shot('today-rows')}

   // 4. leftovers: cooked meal → “Còn dư?” → offered for the next meal → serve → eat / throw out
   {const T=await E(`(()=>{const day=currentWeek().days[selectedDate];const t=MEAL_TYPES.find(x=>fmMealOn(day,x)&&day[x]);const m=day[t];m.recipes=[clone(state.recipes.find(r=>r.category==='main'&&r.ingredients.length))];m.cooked=false;consumeMeal(state,m);delete state.leftovers;save();render();return t})()`);
    const ask=page.locator(`#main .family-meal-card[data-meal-type="${T}"] [data-flow="leftover-add"]`);await ask.scrollIntoViewIfNeeded();assert.ok((await ask.boundingBox())!.height>=44,`${label}: “Còn dư?” ≥ 44 px`);await ask.click();await page.locator('#modal-root [data-flow="leftover-save"]').waitFor();
    await page.locator('#modal-root [data-flow="leftover-step"][data-d="0.5"]').click();await page.locator('#modal-root [data-flow="leftover-step"][data-d="0.5"]').click();
    assert.match(await page.locator('#modal-root .guest-step output').innerText(),/^2$/,`${label}: two portions`);await noOverflow('leftover sheet');await shot('leftover-sheet');
    await page.locator('#modal-root [data-flow="leftover-save"]').click();await page.waitForFunction(()=>!document.querySelector('#modal-root [data-flow="leftover-save"]'));
    const lo:any=await E(`state.leftovers?.[0]`);assert.ok(lo&&lo.portions===2&&lo.place==='fridge'&&lo.useBy===await E(`addDays(selectedDate,3)`),`${label}: leftover kept, fridge, use by in 3 days ${JSON.stringify(lo)}`);
    await E(`(()=>{const day=currentWeek().days[selectedDate];for(const t of MEAL_TYPES)if(day[t]&&t!==${JSON.stringify(T)}){day[t].cooked=false}render();scrollTo(0,0)})()`);
    const offer=page.locator('#main .dashboard-grid .leftover-offer');if(await offer.count()){await offer.scrollIntoViewIfNeeded();await shot('leftover-offer');const btn=offer.locator('[data-flow="leftover-serve"]');const d=await btn.getAttribute('data-date'),t=await btn.getAttribute('data-type');await btn.click();await page.waitForTimeout(300);
     assert.ok(await E(`mealAt(state,${JSON.stringify(d)},${JSON.stringify(t)}).recipes.some(r=>r.fromLeftover)`),`${label}: the leftover dish is in the next meal`)}
    await E(`(()=>{delete state.leftovers;addLeftover(state,{name:'Canh chua',portions:2,place:'fridge',cookedOn:selectedDate});save();render()})()`);
    const row=page.locator('#main [data-flow-row="leftovers"]');await row.evaluate((d:any)=>d.open=true);await row.locator('[data-flow="leftover-eat"]').click();await page.waitForTimeout(200);
    assert.equal(await E(`state.leftovers[0].portions`),1,`${label}: “Ăn 1 suất” takes one portion`);await page.locator('#main [data-flow-row="leftovers"] [data-flow="leftover-drop"]').click();await page.waitForTimeout(200);assert.equal(await E(`state.leftovers`),undefined,`${label}: “Bỏ” throws it out`)}

   // 5. weekly plan: away days and guests for next week, then the menu preview
   {await E(`(()=>{state.guestBook=[{name:'Nhà anh Tuấn',adults:2,kids:1}];try{localStorage.removeItem('bep-week-plan-done')}catch(e){}save();view='today';render()})()`);
    const weekend=await E(`[0,6].includes(parseDate(sydneyDate()).getDay())`);assert.equal(await page.locator('#main .week-plan-nudge').count(),weekend?1:0,`${label}: the weekly plan is offered on Today on Saturday and Sunday only`);
    if(weekend){await page.locator('#main [data-flow="plan-later"]').click();assert.equal(await page.locator('#main .week-plan-nudge').count(),0,`${label}: “Để sau” hides it`);await E('render()');assert.equal(await page.locator('#main .week-plan-nudge').count(),0,`${label}: and it stays hidden for that week`)}
    await E(`view='planner';render();scrollTo(0,0)`);await page.locator('#main [data-flow="plan-start"]').click();await page.locator('#modal-root .plan-member').first().waitFor();
    const start=await E('addDays(planStartOf(state,sydneyDate()),7)'),day3=await E(`addDays(addDays(planStartOf(state,sydneyDate()),7),2)`);
    await page.locator(`#modal-root [data-flow="plan-away"][data-id="m-chi"][data-date="${day3}"]`).click();await targets('#modal-root .plan-days .chip','plan days');await noOverflow('weekly plan step 1');await shot('week-plan-1');
    await page.locator('#modal-root [data-flow="plan-next"]').click();await page.locator('#modal-root [data-flow="plan-guest-known"]').click();await page.locator('#modal-root select[name="pg-date"]').selectOption(start);await page.locator('#modal-root [data-flow="plan-guest-add"]').click();
    assert.equal(await page.locator('#modal-root .plan-guests li').count(),1,`${label}: one guest group listed`);await noOverflow('weekly plan step 2');await shot('week-plan-2');
    await page.locator('#modal-root [data-flow="plan-next"]').click();await shot('week-plan-3');await page.locator('#modal-root [data-flow="plan-preview"]').click();await page.waitForTimeout(600);
    const res:any=await E(`({away:MEAL_TYPES.every(t=>availabilityEntry(state,'m-chi',${JSON.stringify(day3)},t)?.status==='away'),guests:guestGroups(mealAt(state,${JSON.stringify(start)},'dinner')),view,weekStart,preview:document.querySelector('#modal-title')?.innerText||''})`);
    assert.ok(res.away,`${label}: Chi away all day`);assert.deepEqual(res.guests,[{name:'Nhà anh Tuấn',adults:2,kids:1}],`${label}: guests on next week's first dinner`);assert.ok(res.view==='planner'&&res.weekStart===start,`${label}: the menu opens on next week`);
    assert.match(res.preview,lang==='en'?/Preview/:/Xem trước/,`${label}: the menu preview is open`);await E('closeModal()')}

   assert.deepEqual(errors,[],`${label}: page errors`);
   await context.close();console.log('✓',label);
  }
  console.log('PASS v1.7.12 flow: put-away places and dates, misplaced notice, shopping mode, compact Today, leftovers, weekly plan');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
