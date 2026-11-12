// v1.7.19 — owner, 12 Nov 2026 (Sydney time): “Trong bếp nhà mình nên có option chọn giờ ăn để dựa vào đó còn gửi noti báo nấu ăn etc”
// (pop-up “Làm đủ 4 ý, gộp v1.7.19”). Bếp của nhà mình → Giờ ăn is the one place to set meal times; Nhắc nhở shows them read-only with a
// link; the meal cards and Today's start-cooking line read them. 320×740, 375×812, 820×1100, 1280×800; VI and EN; light and dark;
// a week starting on Saturday; a phone outside Sydney. Chromium viewport simulation, not physical devices.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const origin='https://kitchen.test',out='docs/reviews/v1.7.19/meal-times';mkdirSync(out,{recursive:true});
const mime:any={'.js':'application/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'};
const runs:[number,number,'vi'|'en','light'|'dark',string,number][]=[
 [320,740,'vi','light','Australia/Sydney',1],[375,812,'vi','dark','Australia/Sydney',6],[375,812,'en','light','America/Los_Angeles',6],
 [820,1100,'en','dark','Australia/Sydney',1],[1280,800,'vi','light','Asia/Ho_Chi_Minh',1],[1280,800,'en','dark','Australia/Sydney',6]];
(async()=>{
 const browser=await chromium.launch(process.env.BEP_CHROMIUM?{executablePath:process.env.BEP_CHROMIUM}:{});
 try{
  for(const [w,h,lang,theme,tz,ws] of runs){const label=`${w}×${h} ${lang} ${theme} ${tz} week from ${ws===6?'Saturday':'Monday'}`;const name=(n:string)=>`${out}/${n}-${lang}-${theme}-${w}x${h}.png`;
   const context=await browser.newContext({locale:lang==='en'?'en-AU':'vi-VN',viewport:{width:w,height:h},serviceWorkers:'block',reducedMotion:'reduce',timezoneId:tz});
   await context.addInitScript(([lang,theme]:string[])=>{if(sessionStorage.getItem('qa-init'))return;sessionStorage.setItem('qa-init','1');localStorage.setItem('bep-local-locked','yes');localStorage.setItem('guest/bep-language',lang);localStorage.setItem('bep-theme-mode',theme)},[lang,theme]);
   const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route(origin+'/**',async(r:any)=>{const u=new URL(r.request().url());if(u.pathname.startsWith('/.netlify/'))return r.fulfill({status:401,json:{error:'no'}});if(u.pathname==='/startup-scripts.json')return r.fulfill({json:JSON.parse(readFileSync('dist/startup-scripts.json','utf8'))});const f=resolve('dist',u.pathname==='/'?'index.html':u.pathname.slice(1));try{await r.fulfill({contentType:mime[extname(f)]||'application/octet-stream',body:readFileSync(f)})}catch{await r.fulfill({status:404,body:''})}});
   await page.goto(origin+'/#today',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#main h1'),null,{timeout:20000});
   const E=(s:string)=>page.evaluate(s) as Promise<any>;const T=(vi:string,en:string)=>lang==='en'?en:vi;
   const noOverflow=async(where:string)=>{const o=await E(`(()=>{const d=document.scrollingElement,m=document.querySelector('.modal');return{page:d.scrollWidth-innerWidth,modal:m?m.scrollWidth-m.clientWidth:0}})()`);assert.ok(o.page<=1&&o.modal<=1,`${label}: no sideways scroll in ${where} ${JSON.stringify(o)}`)};
   // an older family: only dinnerTime (18:30), meals breakfast · lunch · dinner, a planned week
   await E(`(()=>{state.preferences.onboardingComplete=true;state.preferences.weekStartDay=${ws};state.preferences.enabledMeals=['breakfast','lunch','dinner'];state.preferences.dinnerTime='18:30';delete state.preferences.mealTimes;applyThemePreferences?.();
    state.members=[['m-phu','Ba Phú',1],['m-mi','Mẹ Mi',1]].map(([id,name,weight])=>({id,name,weight,emoji:''}));weekStart=planStartOf(state,sydneyDate());selectedDate=sydneyDate();familyGenerate(state,weekStart,{sourceMode:'library'});closeModal();save();view='today';location.hash='today';render();scrollTo(0,0)})()`);
   const today:string=await E('sydneyDate()');
   assert.equal(await E(`[...document.querySelectorAll('#main .family-meal-card[data-meal-date="${today}"]')].length>0`),true,`${label}: Today shows today's meals`);
   const clock=(type:string)=>E(`document.querySelector('#main .family-meal-card[data-meal-date="${today}"][data-meal-type="${type}"] .meal-clock')?.textContent||''`);
   assert.equal(await clock('dinner'),' · 18:30',`${label}: the dinner card shows the family's dinner time (from the older dinnerTime)`);
   assert.equal(await clock('lunch'),'',`${label}: lunch has no time yet, so none is shown (no 12:00)`);

   // 1. Bếp của nhà mình → Giờ ăn
   await E(`kitchenModal('mealtimes')`);const card=page.locator('#kitchen-mealtimes');await card.waitFor();await page.waitForTimeout(250);
   assert.equal(await card.locator('h4').innerText(),T('Giờ ăn','Meal times'),`${label}: the section is called Giờ ăn`);
   assert.equal(await page.locator('#kitchen-menu #kitchen-mealtimes').count(),1,`${label}: inside the Thực đơn card (My kitchen keeps its four cards)`);
   const vis=await card.evaluate((el:any)=>{const r=el.getBoundingClientRect();return r.top<innerHeight&&r.bottom>0});assert.ok(vis,`${label}: opening at Giờ ăn scrolls to it`);
   const rows:string[]=await card.locator('.meal-time-row[data-mt-row]').evaluateAll((a:any[])=>a.map(r=>r.dataset.mtRow));assert.deepEqual(rows,['breakfast','lunch','dinner'],`${label}: one time per meal the family uses`);
   assert.equal(await page.locator('#mt-dinner').inputValue(),'18:30',`${label}: the older dinner time is carried over`);
   assert.equal(await page.locator('#mt-breakfast').inputValue(),'',`${label}: breakfast empty`);
   assert.equal(await card.locator('[data-mt-row="breakfast"] .meal-time-state').innerText(),T('Chưa đặt — không nhắc nấu','Not set — no cooking reminder'),`${label}: a meal without a time says “Chưa đặt” and gets no reminder`);
   assert.equal(await page.locator('#settings-form [name="dinnerTime"]').count(),0,`${label}: the old dinner-time field is gone from Thực đơn (one place only)`);
   assert.equal(await page.locator('#mt-thaw').inputValue(),'20:00',`${label}: the thaw time starts at 20:00, visible and editable`);assert.equal(await page.locator('#mt-earliest').inputValue(),'08:00',`${label}: “Không nhắc nấu trước” starts at 08:00`);
   assert.equal(await page.locator('label[for="mt-earliest"]').innerText(),T('Không nhắc nấu trước','No cooking reminder before'));assert.equal(await page.locator('label[for="mt-thaw"]').innerText(),T('Nhắc rã đông lúc (tối hôm trước)','Thaw reminder at (the evening before)'));
   for(const sel of ['#mt-thaw','#mt-earliest','#mt-breakfast','#mt-lunch','#mt-dinner','[data-mt-row="dinner"] [data-mt="clear"]','#modal-root .modal-footer [data-sheet-role="save"]']){const b=(await page.locator(sel).boundingBox())!;assert.ok(b.height>=44,`${label}: ${sel} is a ≥ 44 px target (${b.height})`)}
   /* v1.7.19 audit D9 (rule 25): Giờ ăn is saved by My kitchen's one floating-footer Lưu (pill with its tick drawing), not a Lưu in the sheet body */assert.equal(await page.locator('#kitchen-mealtimes [data-mt="save"]').count(),0,`${label}: no Lưu inside the sheet body`);{const f:any=await page.locator('#modal-root .modal-footer [data-sheet-role="save"]').evaluate((b:any)=>{const r=b.getBoundingClientRect();return{svg:!!b.querySelector('svg'),inView:r.bottom<=innerHeight&&r.top>=0}});assert.ok(f.svg&&f.inView,`${label}: the footer Lưu is drawn and visible without scrolling ${JSON.stringify(f)}`)}
   assert.equal(await page.locator('[data-mt="clear"] svg.btn-art').count(),0,`${label}: Bỏ giờ (secondary) is words only`);
   assert.ok(!/\p{Extended_Pictographic}/u.test(await card.innerText()),`${label}: no emoji`);
   await noOverflow('Giờ ăn');await card.scrollIntoViewIfNeeded();await page.screenshot({path:name('kitchen-meal-times-before')});
   // fill two meals, clear dinner: the tapped control does not move (rule 24)
   await page.locator('#mt-breakfast').fill('07:00');await page.locator('#mt-thaw').fill('19:30');await page.locator('#mt-earliest').fill('06:00');await page.locator('#mt-lunch').fill('12:30');
   assert.equal(await card.locator('[data-mt-row="lunch"] .meal-time-state').innerText(),T('Nhắc giờ nấu theo giờ này','Cooking reminder from this time'),`${label}: the line under a set time says what happens`);
   const clear=page.locator('[data-mt-row="dinner"] [data-mt="clear"]');await clear.evaluate((el:any)=>el.scrollIntoView({block:'center'}));const y0=(await clear.boundingBox())!.y;await clear.click();await page.waitForTimeout(150);
   assert.ok(Math.abs((await clear.boundingBox())!.y-y0)<=1,`${label}: Bỏ giờ stays where it was`);assert.equal(await page.locator('#mt-dinner').inputValue(),'',`${label}: Bỏ giờ empties dinner`);
   assert.equal(await clear.isDisabled(),true,`${label}: nothing left to clear`);
   const before:any=await E('clone(state)');
   const save=page.locator('#modal-root .modal-footer [data-sheet-role="save"]');await save.click();await page.waitForTimeout(250);
   assert.match(await page.locator('#toast').innerText(),/./,`${label}: the save says so in a toast`);
   const p:any=await E(`({thaw:state.preferences.thawReminderTime,early:state.preferences.cookEarliestTime,mt:state.preferences.mealTimes,dt:state.preferences.dinnerTime,d:mealTimeOf(state,'dinner'),valid:validImport(clone(state))})`);
   assert.ok(p.thaw==='19:30'&&p.early==='06:00',`${label}: thaw time and earliest cooking time saved ${JSON.stringify(p)}`);assert.deepEqual(p.mt,{breakfast:'07:00',lunch:'12:30',dinner:''},`${label}: saved shape ${JSON.stringify(p.mt)}`);
   assert.ok(p.dt==='18:30'&&p.d==='',`${label}: dinner “Chưa đặt”; dinnerTime kept valid for older devices`);assert.ok(p.valid,`${label}: validImport accepts the new shape`);
   // a second device changed something else at the same time: the sync merge keeps both
   const merged:any=await E(`(()=>{const base=${JSON.stringify(before)},remote=clone(base);remote.preferences.budget=777;remote.preferences.updatedAt=Date.now()-5;const m=mergeFamilyStates(base,clone(state),remote);return{mt:m.state.preferences.mealTimes,budget:m.state.preferences.budget,valid:validImport(clone(m.state))}})()`);
   assert.ok(merged.mt?.lunch==='12:30'&&merged.mt?.dinner===''&&merged.budget===777&&merged.valid,`${label}: the sync merge keeps the meal times and the other device's change ${JSON.stringify(merged)}`);
   const merged2:any=await E(`(()=>{const base=${JSON.stringify(before)},remote=clone(base);remote.preferences.mealTimes={snack:'15:30'};remote.preferences.updatedAt=Date.now()-5;const m=mergeFamilyStates(base,clone(state),remote);return{mt:m.state.preferences.mealTimes,valid:validImport(clone(m.state))}})()`);
   assert.ok(merged2.mt?.lunch==='12:30'&&merged2.mt?.snack==='15:30'&&merged2.valid,`${label}: two devices setting different meals: both times kept ${JSON.stringify(merged2)}`);
   await E(`kitchenModal('mealtimes')`);await card.waitFor();assert.equal(await page.locator('#mt-lunch').inputValue(),'12:30',`${label}: the saved time shows when My kitchen opens again`);await card.scrollIntoViewIfNeeded();await page.screenshot({path:name('kitchen-meal-times-saved')});
   await E('closeModal()');await page.waitForTimeout(150);
   assert.equal(await clock('breakfast'),' · 07:00',`${label}: the breakfast card shows 07:00`);assert.equal(await clock('lunch'),' · 12:30',`${label}: the lunch card shows 12:30`);assert.equal(await clock('dinner'),'',`${label}: no time on the dinner card once cleared`);

   // 2. Today's start-cooking line goes on the next meal with a time; with only dinner left to cook it is on dinner
   await E(`(()=>{setMealTimes(state,{dinner:'18:30'});const r1={...clone(state.recipes.find(r=>r.category==='main'&&r.ingredients.length)),id:'qa-pho',name:'Phở bò nhà làm',time:90,prepTime:30,custom:true,origin:'family'};state.recipes=state.recipes.filter(r=>r.id!=='qa-pho').concat([r1]);
    for(const t of ['breakfast','lunch','dinner']){const m=mealAt(state,sydneyDate(),t);if(m){m.recipes=[clone(r1)];m.cooked=false;m.off=false}}save();render();scrollTo(0,0)})()`);
   const where:any=await E(`(()=>{const el=document.querySelector('#main .cook-timing');const card=el?.closest('.family-meal-card');const type=card?.dataset.mealType;const t=type?cookTiming(state,mealAt(state,sydneyDate(),type),mealTimeOf(state,type)):null;return{type,text:el?.textContent||'',want:t?.start||null,early:!!t?.early}})()`);
   assert.ok(where.type&&['breakfast','lunch','dinner'].includes(where.type),`${label}: the start time is on one of today's timed meals ${JSON.stringify(where)}`);
   assert.ok(where.early?where.text.includes('06:00'):where.text.includes(where.want),`${label}: and it is that meal's own start (${where.text})`);
   await E(`(()=>{for(const t of ['breakfast','lunch'])mealAt(state,sydneyDate(),t).cooked=true;save();render();scrollTo(0,0)})()`);
   const line=page.locator(`#main .family-meal-card[data-meal-date="${today}"][data-meal-type="dinner"] .cook-timing`);await line.waitFor();
   assert.equal(await line.innerText(),T('Bắt đầu nấu khoảng 16:15 · 1 món, lâu nhất Phở bò nhà làm 120 phút (chuẩn bị 30 + nấu 90)','Start cooking around 16:15 · 1 dish, longest Phở bò nhà làm 120 min (prep 30 + cook 90)'),`${label}: dinner 18:30 − 120 − 15`);
   await line.scrollIntoViewIfNeeded();await page.screenshot({path:name('today-cards')});
   await E(`(()=>{for(const t of ['breakfast','lunch'])mealAt(state,sydneyDate(),t).cooked=false;save();render();scrollTo(0,0)})()`);

   // 3. Nhắc nhở: a read-only summary and a link, no time field of its own for meals
   await E('remindersModal()');const sum=page.locator('#push-meal-times');await sum.waitFor();
   const list:string[]=await sum.locator('li').evaluateAll((a:any[])=>a.map(li=>li.innerText.replace(/\s+/g,' ').trim()));
   assert.deepEqual(list,lang==='en'?['Breakfast 07:00','Lunch 12:30','Dinner 18:30','Thaw reminder (the evening before) 19:30','No cooking reminder before 06:00']:['Bữa sáng 07:00','Bữa trưa 12:30','Bữa tối 18:30','Nhắc rã đông (tối hôm trước) 19:30','Không nhắc nấu trước 06:00'],`${label}: Nhắc nhở lists the meal times (${list})`);
   assert.equal(await page.locator('.modal input[name="dinnerTime"],.modal input[name^="mt-"],.modal #meal-times-form').count(),0,`${label}: no meal-time field in Nhắc nhở`);
   assert.equal(await page.locator('.modal input[name="thawReminderTime"],.modal input[name="cookEarliestTime"]').count(),0,`${label}: thaw time and earliest cooking time are only read here (one place to change them)`);
   const types:string=await page.locator('.push-type-list').innerText();assert.ok(types.includes(T('Nhắc giờ nấu','Cooking time'))&&types.includes(T('Nhắc rã đông','Thaw reminder')),`${label}: each device chooses Nhắc giờ nấu and Nhắc rã đông`);
   const link=page.locator('#push-meal-times [data-section="mealtimes"]');assert.equal(await link.innerText(),T('Đổi giờ ăn','Change meal times'));assert.ok((await link.boundingBox())!.height>=44,`${label}: the link is a ≥ 44 px target`);
   assert.equal(await link.locator('svg.btn-art').count(),0,`${label}: the link (secondary) is words only`);
   await noOverflow('Nhắc nhở');await sum.scrollIntoViewIfNeeded();await page.screenshot({path:name('reminders-summary')});
   await link.click();await page.locator('#kitchen-mealtimes').waitFor();await page.waitForTimeout(300);
   assert.ok(await page.locator('#kitchen-mealtimes').evaluate((el:any)=>{const r=el.getBoundingClientRect();return r.top<innerHeight&&r.bottom>0}),`${label}: “Đổi giờ ăn” opens Bếp của nhà mình at Giờ ăn`);
   await page.screenshot({path:name('reminders-link-opens-kitchen')});
   // view-only access cannot change them
   await E(`(()=>{window.__as=accountSession;accountSession={household:{role:'viewer'}};document.getElementById('modal-root').innerHTML=kitchenMealTimesBody()})()`);await page.locator('#meal-times-form').waitFor();
   assert.ok(await page.locator('#mt-lunch').isDisabled()&&await page.locator('#modal-root .modal-footer [data-sheet-role="save"]').count()===0,`${label}: view-only: times shown, not editable`);
   await E(`(()=>{accountSession=window.__as;closeModal()})()`);
   // the Thực đơn form still saves without touching meal times
   await E(`kitchenModal('menu')`);await page.locator('#settings-form').waitFor();await E(`document.querySelector('[data-action="submit-form"][data-id="settings-form"]').click()`);await page.waitForTimeout(200);
   const after:any=await E(`({dt:state.preferences.dinnerTime,mt:state.preferences.mealTimes,valid:validImport(clone(state))})`);assert.ok(after.dt==='18:30'&&after.mt.lunch==='12:30'&&after.valid,`${label}: saving Thực đơn keeps the meal times ${JSON.stringify(after)}`);
   await E('closeModal()');
   assert.deepEqual(errors,[],`${label}: no page errors`);console.log('PASS',label);await context.close()}
 }finally{await browser.close()}
 console.log('meal times browser: passed');
})().catch(e=>{console.error(e);process.exit(1)});
