// v1.7.9 system check (owner request, 7 Nov 2026: "dùng thử như người trong nhà"): one family's day, end to end, the way
// the family uses it, at phone, tablet and desktop sizes, in Vietnamese and English, light and dark:
//   report away for dinner → portions drop → the shopping amount drops → tick bought → store in the pantry →
//   cook the meal → the pantry is taken off → add a receipt → Spending shows it → quick-add a new dish and write it →
//   open a notification link (#planner?d=…) → go offline and come back.
// Every step checks the result in the family's data and on screen, that no script error happened, that nothing sticks
// out sideways, and that the text is in the chosen language. Screenshots go to docs/reviews/v1.7.9/journey
// (Chromium viewport simulation, not physical devices).
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert');
const dir='docs/reviews/v1.7.9/journey';fs.mkdirSync(dir,{recursive:true});
// v1.7.19 (rule 29): the row's unit is chosen in the shared unit picker (a sheet over the editor), not a plain list.
const pickRcUnit=async(page:any,row:any,unit:string)=>{await row.locator('.rc-ing-unit').click();const chip=page.locator(`#unit-sheet-layer .unit-chip[data-unit-choice="${unit}"]`).first();await page.locator('#unit-sheet-layer .unit-chip').first().waitFor();if(!(await chip.isVisible()))await page.locator('#unit-sheet-layer [data-unit-action="show-all"]').click();await chip.click();await page.locator('#unit-sheet-layer [data-unit-sheet-act="save"]').click();await page.locator('#unit-sheet-layer').waitFor({state:'detached'})};
const SIZES:any[]=[['mobile',{width:375,height:812},true],['tablet',{width:820,height:1100},true],['desktop',{width:1280,height:800},false]];
const MEMBERS=[['m-phu','Ba Phú',1],['m-mi','Mẹ Mi',1],['m-chi','Chi',.75],['m-tien','Tiên',.75]];
// Vietnamese words that must not show in English mode (family names, dish names and the reference recipes' own prep and
// steps — not translated yet, see the backlog — are removed first, as in the language audit)
const VI_WORDS=/(?<![\p{L}])(bữa|món|người|tủ|mua|giỏ|nấu|xem|thêm|lưu|hôm nay|ngày|tuần|vắng|bận|đã|chưa|của|và|không)(?![\p{L}])/iu;
(async()=>{const browser=await chromium.launch(process.env.BEP_CHROMIUM?{executablePath:process.env.BEP_CHROMIUM}:{});const root=process.cwd();
for(const lang of ['vi','en'])for(const mode of ['light','dark'])for(const [size,viewport,touch] of SIZES){
 if(mode==='dark'&&size==='tablet')continue; // dark: phone and desktop; light: every size
 const label=`${lang} ${mode} ${size}`,ctx=await browser.newContext({locale:'vi-VN',viewport,hasTouch:touch,isMobile:size==='mobile',reducedMotion:'reduce',timezoneId:'Australia/Sydney',serviceWorkers:'block',colorScheme:mode as any});
 await ctx.addInitScript(([l,m]:string[])=>{if(sessionStorage.getItem('qa'))return;sessionStorage.setItem('qa','1');localStorage.setItem('guest/bep-language',l);localStorage.setItem('bep-theme-mode',m)},[lang,mode]);
 const page=await ctx.newPage(),errors:string[]=[];page.on('pageerror',(e:any)=>errors.push(e.message));page.on('console',(m:any)=>{if(m.type()==='error'&&!/Failed to load resource|net::ERR/.test(m.text()))errors.push('console: '+m.text())});
 await page.route('https://kitchen.test/**',async(route:any)=>{const url=new URL(route.request().url());if(url.pathname.startsWith('/.netlify/')){const op=url.searchParams.get('op');return route.fulfill({json:op==='status'?{configured:false,connected:false}:op==='state'?{state:null,etag:null}:op==='families'?{families:[]}:{announcements:[],devices:[]}})}const file=path.join(root,'dist',url.pathname==='/'?'index.html':url.pathname);try{await route.fulfill({body:fs.readFileSync(file),contentType:({'.html':'text/html','.js':'application/javascript','.json':'application/json','.css':'text/css','.webp':'image/webp','.svg':'image/svg+xml','.png':'image/png'} as any)[path.extname(file)]||'application/octet-stream'})}catch{await route.fulfill({status:404,body:'Missing'})}});
 const tap=(loc:any)=>touch?loc.tap():loc.click(),E=(s:string)=>page.evaluate(s),shot=(n:string)=>(lang==='vi'&&mode==='light')||(lang==='en'&&mode==='dark'&&size==='mobile')?page.screenshot({path:`${dir}/${lang}-${mode}-${size}-${n}.png`}):Promise.resolve(); // evidence: VI light at every size, EN dark on the phone
 const check=async(step:string)=>{await page.waitForTimeout(150);assert.deepEqual(errors,[],`${label} ${step}: no script error`);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${label} ${step}: nothing sticks out sideways`);
  if(lang==='en'){const t:string=await page.evaluate(()=>{const st=(0,eval)('state'),names=[...st.members.map((m:any)=>m.name),...st.recipes.map((r:any)=>r.name),...st.recipes.map((r:any)=>r.prep),...st.recipes.flatMap((r:any)=>r.steps||[]),...Object.values(st.ingredientCatalog||{}).map((x:any)=>x.name)].filter(Boolean).sort((a:string,b:string)=>b.length-a.length);const scope=document.querySelector('#modal-root .modal')||document.querySelector('#main')!;const toast=document.querySelector('#toast.visible') as HTMLElement|null;let x=(scope as HTMLElement).innerText+'\n'+(toast?toast.innerText:'');for(const n of names)x=x.split(n).join(' ');return x});
   const bad=t.split('\n').filter(l=>VI_WORDS.test(l));assert.deepEqual(bad,[],`${label} ${step}: English only ${JSON.stringify(bad)}`)}};
 await page.goto('https://kitchen.test/#today');await page.locator('#main h1').waitFor({timeout:20000});
 const today:string=await E(`(()=>{state.preferences.onboardingComplete=true;state.members=${JSON.stringify(MEMBERS)}.map(([id,name,weight])=>({id,name,weight,emoji:''}));familyGenerate(state,weekStart,{sourceMode:'library'});const t=sydneyDate(),w=ensureWeek(state,monday(t));for(const wk of Object.values(state.weeks))for(const day of Object.values(wk.days))for(const m of Object.values(day))if(m&&m.attendance)for(const p of state.members)m.attendance[p.id]??='home';for(const p of state.members)w.days[t].dinner.attendance[p.id]='home';if(!w.days[t].lunch.recipes.length||w.days[t].lunch.recipes.some(r=>r.batchId))w.days[t].lunch.recipes=[clone(state.recipes.find(x=>x.id==='r1'))];for(const p of state.members)w.days[t].lunch.attendance[p.id]='home';save();closeModal();view='today';render();return t})()`);
 await check('today');await shot('1-today');
 // 1. Chi reports away for tonight's dinner (calendar form) → tonight's portions drop
 const before:any=await E(`(()=>{const m=currentWeek().days[sydneyDate()].dinner;return{portions:mealServings(m,state),dishes:m.recipes.length}})()`);assert.ok(before.dishes>0,`${label}: tonight has dishes`);
 await E(`availabilityModal({date:sydneyDate(),member:'m-chi'})`).catch(()=>E(`availabilityModal()`));
 await page.locator('#availability-form').waitFor();if(!(await page.locator('#availability-form.editing').count())){await tap(page.locator(`.calendar-day[data-date="${today}"]`));await tap(page.locator('.calendar-daylist > .btn'))}
 await page.locator('#availability-form.editing').waitFor();
 if(await page.locator('#calendar-member').count())await page.locator('#calendar-member').selectOption('m-chi');
 for(const box of await page.locator('#availability-form [name="types"]').all())await box.setChecked(false);await page.locator('#availability-form [name="types"][value="dinner"]').check();
 await page.locator('#calendar-status').selectOption('away');await page.locator('#calendar-from').fill('17:00');await page.locator('#calendar-to').fill('21:00');await check('report away');await shot('2-report-away');
 await tap(page.locator('#modal-root .modal-footer [data-action="submit-form"]'));await page.waitForFunction(()=>!!(0,eval)('state').availability?.['m-chi']);
 const entry:any=await E(`state.availability['m-chi'][sydneyDate()]?.dinner`);assert.equal(entry?.status,'away',`${label}: saved for tonight`);assert.equal(entry.from,'17:00');
 await E('closeModal();render()');const after:any=await E(`mealServings(currentWeek().days[sydneyDate()].dinner,state)`);assert.ok(after<before.portions,`${label}: portions drop (${before.portions} → ${after})`);
 assert.match(await page.locator('[data-who-busy]').innerText(),lang==='en'?/Chi\s+away\s+dinner 17:00–21:00/:/Chi\s+vắng\s+tối 17:00–21:00/,`${label}: who is busy shows the time`);await check('who busy');await shot('3-who-busy');
 // 2. Shopping follows; tick the first item bought, store it in the pantry
 await E(`view='shopping';render();scrollTo(0,0)`);await page.locator('#main .shop-purchase-row').first().waitFor();await check('shopping');await shot('4-shopping');
 const row=page.locator('#main .shop-purchase-row').first(),rid=await row.locator('[data-action="purchase-quantity"]').getAttribute('data-id');
 await row.scrollIntoViewIfNeeded();await tap(row.locator('.large-check-target, input[data-change="bought"]').first());await page.waitForFunction((id:string)=>((0,eval)('currentWeek()').bought?.[id]||0)>0,rid);
 const pantryBefore:number=await E(`state.pantry.filter(p=>p.ingredient===${JSON.stringify(rid)}).reduce((n,p)=>n+p.qty,0)`);
 await E('closeModal();scrollTo(0,0)');const store=page.locator('#main [data-action="store-purchases"]').first();if(!(await store.isVisible())){const d=page.locator('#main details:has([data-action="store-purchases"]) > summary').first();if(await d.count())await tap(d)}
 await tap(page.locator('#main [data-action="store-purchases"]').first());await page.locator('#modal-root .modal').waitFor();await check('store purchases');await shot('5-store-purchases');
 await tap(page.locator('#modal-root .modal-footer .btn.primary').first());await page.waitForTimeout(300);
 const pantryAfter:number=await E(`state.pantry.filter(p=>p.ingredient===${JSON.stringify(rid)}).reduce((n,p)=>n+p.qty,0)`);assert.ok(pantryAfter>pantryBefore,`${label}: the bought item is in the pantry (${pantryBefore} → ${pantryAfter})`);
 assert.equal(await E(`state.pantry.filter(p=>p.ingredient===${JSON.stringify(rid)}).every(p=>p.checkedAt===sydneyDate())`),true,`${label}: stored today = checked today`);
 await E(`view='pantry';render();scrollTo(0,0)`);await check('pantry');await shot('6-pantry');
 // 3. Cook tonight's dinner → the pantry is taken off; undo puts it back
 // a meal of today without a weekend-batch dish (those ask to cook the batch first — by design)
 const ct:string=await E(`(()=>{const d=currentWeek().days[sydneyDate()];return MEAL_TYPES.find(t=>d[t]?.recipes?.length&&!d[t].recipes.some(r=>r.batchId)&&mealServings(d[t],state)>0)||''})()`);assert.ok(ct,`${label}: a meal to cook today`);
 await E(`view='planner';selectedDate=sydneyDate();render()`);const cookBtn=()=>page.locator(`#main [data-fm="cook-meal"][data-date="${today}"][data-type="${ct}"]`),cook=cookBtn();await cook.scrollIntoViewIfNeeded();
 const pantryTotal=()=>E(`state.pantry.reduce((n,p)=>n+p.qty,0)`) as Promise<number>;const p0=await pantryTotal();
 await tap(cook);await page.waitForFunction((t:string)=>(0,eval)(`currentWeek().days[sydneyDate()].${t}.cooked`)===true,ct);const p1=await pantryTotal();assert.ok(p1<=p0,`${label}: cooking takes off the pantry (${p0} → ${p1})`);assert.equal(await cookBtn().evaluate((e:any)=>getComputedStyle(e).textDecorationLine+'|'+getComputedStyle(e).opacity),'none|1',`${label}: “Hoàn tác bữa” reads as a normal button, not struck through`);await check('cooked');await shot('7-cooked');
 await tap(cookBtn());await page.waitForFunction((t:string)=>(0,eval)(`currentWeek().days[sydneyDate()].${t}.cooked`)===false,ct);{const p2=await pantryTotal();assert.ok(Math.abs(p2-p0)<1e-6,`${label}: undo restores the pantry (${p0} → ${p1} → ${p2})`)}
 // 4. A receipt typed by hand → Spending
 await E(`newReceipt()`);await page.locator('#modal-root .modal').waitFor();await check('receipt editor');await shot('8-receipt');
 await page.locator('#receipt-store').fill('Coles');await page.locator('#receipt-total').fill('3.10');
 await tap(page.locator('#modal-root .modal-footer [data-feature="receipt-add-line"]'));const line=page.locator('#receipt-lines .receipt-line').last();await line.waitFor();
 await line.locator('.receipt-label').fill('Milk 2L');await line.locator('.receipt-price').fill('3.10');await check('receipt line');await shot('8b-receipt-line');
 await tap(page.locator('#modal-root .modal-footer [data-feature="receipt-save"]'));await page.waitForTimeout(500);
 // after saving, the "update shopping & pantry from this receipt" sheet opens (nothing to match for milk → its button stays off)
 if(await page.locator('#modal-root .modal').count()&&!(await page.locator('#receipt-store').count())){await check('receipt follow-up');await shot('8c-receipt-follow-up')}
 const receipts:number=await E('(state.receipts||[]).length');assert.ok(receipts>0,`${label}: the receipt is saved`);
 await E(`closeModal();view='expenses';render();scrollTo(0,0)`);await check('spending');await shot('9-spending');
 assert.match(await page.locator('#main').innerText(),/3[.,]10/,`${label}: Spending shows the receipt`);
 // 5. Quick-add a new dish → its recipe page opens → saved, and the meal has it
 const tomorrow:string=await E('addDays(sydneyDate(),1)');await E(`view='planner';selectedDate=${JSON.stringify(tomorrow)};weekStart=planStartOf(state,${JSON.stringify(tomorrow)});render();familyEditMeal(${JSON.stringify(tomorrow)},'lunch')`);
 const dish=`Cá kho thử ${lang} ${mode} ${size}`;await page.locator('#quick-dish-name').fill(dish);/* v1.7.19 (A22): the family chooses the dish role */await page.selectOption('#quick-dish-cat','main');await tap(page.locator('[data-fm="quick-add-dish"]'));await page.locator('#family-recipe-form').waitFor();
 const r0=page.locator('#rc-ing-list .rc-ing-row').first();await r0.locator('.rc-ing-name-input').fill('Cá thu');await r0.locator('.rc-ing-qty').fill('400');await pickRcUnit(page,r0,'g');await check('new dish');await shot('10-new-dish');
 await tap(page.locator('[data-action="submit-form"][data-id="family-recipe-form"]'));await page.waitForFunction(()=>!document.querySelector('#family-recipe-form'));
 assert.equal(await E(`currentWeek().days[${JSON.stringify(tomorrow)}]?.lunch.recipes.find(r=>r.name===${JSON.stringify(dish)})?.ingredients.length`),1,`${label}: the new dish is in the meal with its ingredient`);
 // 6. A notification link opens that day on the menu
 await E(`location.hash='planner?d='+${JSON.stringify(tomorrow)}`);await page.waitForFunction((d:string)=>(0,eval)('view')==='planner'&&!!document.querySelector(`#main .plan-day[open][data-plan-day="${d}"]`),tomorrow,{timeout:5000});await check('notification link');await shot('11-deep-link');
 // 7. Offline: the app says so and keeps working on this device; back online it says so again
 await ctx.setOffline(true);await E(`dispatchEvent(new Event('offline'))`);await page.waitForTimeout(300);await E(`view='today';render()`);
 const offlineText:string=await page.evaluate(()=>document.body.innerText);assert.match(offlineText,lang==='en'?/offline|Offline|no connection|on this device/i:/ngoại tuyến|mất mạng|Không có mạng|trên máy này|Ngoại tuyến/i,`${label}: offline is shown`);
 await E(`(()=>{const m=planWeek(state,planStartOf(state,sydneyDate())).days[sydneyDate()].lunch/* today's own week: the steps above opened tomorrow, which on a Sunday is next week */;m.note='offline note';save();render()})()`);assert.equal(await E(`Object.keys(localStorage).some(k=>(localStorage.getItem(k)||'').includes('offline note'))`),true,`${label}: offline edits are kept on this device`);
 await check('offline');await shot('12-offline');await ctx.setOffline(false);await E(`dispatchEvent(new Event('online'))`);await page.waitForTimeout(200);await check('online again');
 console.log('✓',label);await ctx.close()}
await browser.close();console.log('PASS family day end to end (away → portions → shopping → bought → pantry → cooked → undo → receipt → spending → new dish → notification link → offline) at 375 / 820 / 1280 px, VI and EN, light and dark')})().catch(e=>{console.error(e);process.exit(1)});
