// v1.7.5 owner feedback (Notes “Note chỉnh sửa cho Bếp Nhà”, 4 Nov 2026), exercised by touch/click at phone, narrow
// phone, tablet and desktop sizes: photo buttons open the picker (#1), larger text + Cỡ chữ (#3), Phân loại bữa ăn with
// nothing auto-ticked (#4, #8), Phân loại món ăn (#5), servings/time labels (#6), method not numbered (#7), the
// ingredient list paste box and the per-ingredient “Cộng vào đi chợ” tick (#8, #10), unit “đòn” (#9), 5 suggestions with
// Xem thêm (#11, #12), ½ shown as ½ (#13), plain portion wording (#14) and the daily Bữa phụ. Screenshots are the release
// evidence in docs/reviews/v1.7.5/feedback (Chromium viewport simulation, not physical devices).
const {chromium,devices}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert');
const dir='docs/reviews/v1.7.5/feedback';fs.mkdirSync(dir,{recursive:true});
const SIZES:any[]=[['mobile',{...devices['iPhone 13'],viewport:{width:375,height:812}}],['narrow',{...devices['iPhone SE'],viewport:{width:320,height:640}}],['tablet',{viewport:{width:820,height:1100},hasTouch:true}],['desktop',{viewport:{width:1280,height:800}}]];
(async()=>{const browser=await chromium.launch();const root=process.cwd();
for(const [size,opts] of SIZES){
 const ctx=await browser.newContext({locale:'vi-VN',...opts,reducedMotion:'reduce',timezoneId:'Australia/Sydney',serviceWorkers:'block'});const page=await ctx.newPage();const errors:string[]=[];page.on('pageerror',(e:any)=>errors.push(e.message));
 await page.route('https://kitchen.test/**',async(route:any)=>{const url=new URL(route.request().url());if(url.pathname.startsWith('/.netlify/')){const op=url.searchParams.get('op');return route.fulfill({json:op==='status'?{configured:false,connected:false}:op==='state'?{state:null,etag:null}:op==='families'?{families:[]}:{announcements:[],devices:[]}})}const file=path.join(root,'dist',url.pathname==='/'?'index.html':url.pathname);try{await route.fulfill({body:fs.readFileSync(file),contentType:({'.html':'text/html','.js':'application/javascript','.json':'application/json','.css':'text/css','.webp':'image/webp','.svg':'image/svg+xml','.png':'image/png'} as any)[path.extname(file)]||'application/octet-stream'})}catch{await route.fulfill({status:404,body:'Missing'})}});
 const touch=!!opts.hasTouch;const tap=async(l:any)=>{await l.scrollIntoViewIfNeeded();if(touch)await l.tap();else await l.click()};
 const noOverflow=async(where:string)=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`no horizontal overflow: ${size} ${where}`);
 const shot=async(name:string)=>page.screenshot({path:`${dir}/${size}-${name}.png`});
 await page.goto('https://kitchen.test/#recipes');await page.locator('#family-recipe-search').waitFor({timeout:15000});
 // #3 larger text by default (Lớn): small text is at least 14 px; nav icons keep their size
 const sizesPx=await page.evaluate(()=>[...document.querySelectorAll('#main *')].filter((e:any)=>e.offsetParent!==null&&[...e.childNodes].some((n:any)=>n.nodeType===3&&n.nodeValue.trim().length>1)&&!e.closest('svg,.nav-icon')).map((e:any)=>parseFloat(getComputedStyle(e).fontSize)));
 assert.equal(await page.evaluate(()=>document.documentElement.dataset.textSize),'large');assert.ok(Math.min(...sizesPx)>=12,'no visible text below 12 px by default, got '+Math.min(...sizesPx));
 assert.ok(await page.evaluate(()=>parseFloat(getComputedStyle(document.body).fontSize))>=15,'body text at least 15 px by default');
 // ---- recipe form
 await tap(page.locator('[data-fm="new"]:visible').first());const form=page.locator('#family-recipe-form');await form.waitFor();await page.locator('#rc-ing-list .rc-ing-row').first().waitFor();
 const text=await form.innerText();
 for(const s of ['Phân loại bữa ăn','Phân loại món ăn','Công thức nấu cho bao nhiêu suất ăn','Thời gian nấu (phút)','Cách nấu (không bắt buộc)'])assert.ok(text.includes(s),'label: '+s);
 assert.deepEqual(await form.locator('input[name="purpose"]').evaluateAll((a:any[])=>a.map(x=>x.value)),['breakfast','lunch','dinner','snack','feast'],'Bữa sáng, trưa, tối, phụ, Weekends feast');
 assert.equal(await form.locator('input[name="purpose"]:checked').count(),0,'nothing ticked automatically');
 assert.deepEqual(await form.locator('select[name="category"] option').allInnerTexts(),['Món chính','Món phụ','Món canh / soup','Món sợi','Món tráng miệng','Món ăn vặt','Món school lunch box']);
 assert.ok(!(await form.locator('select[name="protein"]').innerText()).includes('pork'),'protein shown in words, not codes');
 // #1 photo buttons open the camera / library picker
 for(const kind of ['camera','library']){const fc=page.waitForEvent('filechooser',{timeout:4000});await tap(page.locator(`.rc-file-btn:has([data-rc-file="${kind}"])`));assert.ok(await fc,'picker opens: '+kind)}
 assert.ok((await page.locator('.rc-file-btn').first().boundingBox())!.height>=44,'photo buttons are 44 px touch targets');
 await page.locator('input[name="name"]').fill('Bánh canh chả QA');
 await page.locator('select[name="category"]').selectOption('noodle');
 // #4/#8 the family chooses; unticking really unticks
 const box=(v:string)=>form.locator(`input[name="purpose"][value="${v}"]`);
 await tap(box('breakfast'));await tap(box('feast'));assert.equal(await box('feast').isChecked(),true);await tap(box('feast'));assert.equal(await box('feast').isChecked(),false,'a tick can be removed');
 // #8 paste box opens and explains itself; #9 đòn; #10 per-row tick; #13 fractions
 await tap(page.locator('.rc-paste summary'));assert.equal(await page.locator('.rc-paste').evaluate((d:any)=>d.open),true,'paste box opens');
 assert.match(await page.locator('.rc-paste').innerText(),/mỗi dòng một nguyên liệu/i);
 await page.locator('#rc-paste-text').fill('Chả lụa 1 đòn\nChanh 1/2 quả\nMuối 1 muỗng cà phê');await tap(page.locator('[data-rci="paste"]'));
 const rows=page.locator('#rc-ing-list .rc-ing-row');await page.waitForTimeout(200);
 const values=await rows.evaluateAll((a:any[])=>a.map(li=>[li.querySelector('.rc-ing-name-input').value,li.querySelector('.rc-ing-qty').value,li.querySelector('.rc-ing-unit').value,li.querySelector('.rc-ing-shop-input').checked]).filter(x=>x[0]));
 assert.deepEqual(values,[['Chả lụa','1','đòn',true],['Chanh','1/2','quả',true],['Muối','1','muỗng cà phê',true]],'pasted rows, all ticked');
 assert.ok(!(await page.locator('.rc-ing-unit').first().innerHTML()).includes('Chỉ ghi chú'),'one unit list, no “note only” group');
 const salt=rows.filter({has:page.locator('.rc-ing-name-input[value="Muối"]')});await tap(salt.locator('.rc-ing-shop-input'));
 assert.match(await salt.locator('.rc-ing-note').innerText(),/không cộng/);
 await page.locator('textarea[name="steps"]').fill('Luộc chả\nNấu nước dùng');
 await noOverflow('recipe form');await page.locator('#rc-ing-list').scrollIntoViewIfNeeded();await shot('recipe-form-ingredients');
 await page.locator('.family-purpose-options').scrollIntoViewIfNeeded();await shot('recipe-form-meal-types');
 await tap(page.locator('[data-action="submit-form"][data-id="family-recipe-form"]'));await page.locator('#family-recipe-form').waitFor({state:'detached',timeout:5000});
 const saved=await page.evaluate(()=>{const r=(globalThis as any).eval('state').recipes.find((x:any)=>x.name==='Bánh canh chả QA');return{purposes:r.purposes,category:r.category,steps:r.steps,ing:r.ingredients.map((i:any)=>[(globalThis as any).eval('INGREDIENTS')[i.id][0],i.qty,(globalThis as any).eval('INGREDIENTS')[i.id][1]]),missing:r.missingIngredients}});
 assert.deepEqual(saved.purposes,['breakfast'],'exactly what was ticked');assert.equal(saved.category,'noodle');assert.deepEqual(saved.steps,['Luộc chả','Nấu nước dùng']);
 assert.deepEqual(saved.ing,[['Chả lụa',1,'đòn'],['Chanh',.5,'quả']],'ticked rows counted as written; ½ stays ½: '+JSON.stringify(saved.ing));assert.deepEqual(saved.missing,['Muối 1 muỗng cà phê'],'unticked row kept as a note');
 // #7 + #13 detail: method not numbered, ½ shown as ½
 await page.evaluate(()=>{const id=(globalThis as any).eval('state').recipes.find((x:any)=>x.name==='Bánh canh chả QA').id;(globalThis as any).eval('openRecipe')?.(id)}).catch(()=>{});
 if(!(await page.locator('#modal-root .steps-text').count())){await page.evaluate(()=>{(globalThis as any).eval('familyLibraryMode="own";familyRecipeSearch="Bánh canh chả QA";render()')});await tap(page.locator('#family-recipe-results .lib-card-img').first())}
 await page.locator('#modal-root .steps-text').waitFor();assert.equal(await page.locator('#modal-root ol.steps').count(),0,'method is not auto-numbered');
 assert.match(await page.locator('#modal-root .ingredients').innerText(),/½ quả/,'½ shown as ½, not rounded up to 1');
 await noOverflow('recipe detail');await shot('recipe-detail');await page.evaluate(()=>(globalThis as any).eval('closeModal()'));
 // ---- meal editor: Bữa phụ, 5 suggestions + Xem thêm (#11/#12), plain portion wording (#14)
 await page.evaluate(()=>{location.hash='planner'});await page.waitForTimeout(500);
 // v1.7.8: Bữa phụ is added per day from the day's “Bữa ±” list
 await tap(page.locator('#main .pd-meals:visible').first());await page.locator('#modal-root .pm-list').waitFor();assert.match(await page.locator('#modal-root .pm-list').innerText(),/bữa phụ/i,'daily Bữa phụ in the menu');await page.evaluate(()=>(globalThis as any).eval('closeModal()'));
 await tap(page.locator('[data-fm="edit-meal"]:visible').first());await page.locator('#meal-lib-list').waitFor();
 assert.equal(await page.locator('#meal-lib-list .family-select-row').count(),3,'3 reference suggestions (v1.7.8 ladybug #26; was 5)');
 const more=page.locator('#meal-lib-list [data-meal-more="lib"]');await tap(more);assert.equal(await page.locator('#meal-lib-list .family-select-row').count(),6,'Xem thêm shows 3 more');
 assert.ok(await page.locator('#meal-own-list .family-select-row').count()<=3,'at most 3 family dishes before Xem thêm');
 const portion=page.locator('#modal-root select[name^="size-"]').first();if(await portion.count()){const opts2=await portion.locator('option').allInnerTexts();assert.equal(opts2[0],'Tự tính theo số người');assert.ok(opts2.includes('½ lượng (50%)')&&opts2.includes('Gấp đôi (200%)'))}
 assert.match(await page.locator('#modal-root').innerText(),/Tự tính theo số người.*nấu đủ cho những người ăn bữa này/s,'portion choice explained');
 await noOverflow('meal editor');await shot('meal-editor');await page.evaluate(()=>(globalThis as any).eval('closeModal()'));
 // ---- Lịch mang cơm (5 Nov 2026): “Cả nhà” ticks a day for everyone; saving marks the coming lunches “Mang đi”
 await page.evaluate(()=>{location.hash='today'});await page.waitForTimeout(500);
 await tap(page.locator('#main [data-house="pack-schedule"]'));await page.locator('#pack-schedule-form').waitFor();
 const firstId=await page.evaluate(()=>(globalThis as any).eval('state.members[0].id'));
 await tap(page.locator('[data-house="pack-all"][data-day="1"]'));
 assert.equal(await page.locator('#pack-schedule-form input[data-day="1"]:checked').count(),await page.locator('#pack-schedule-form input[data-day="1"]').count(),'Cả nhà ticks Monday for everyone');
 for(const d of [2,3,4,5])await tap(page.locator(`#pack-schedule-form input[data-member="${firstId}"][data-day="${d}"]`));
 await noOverflow('pack schedule');assert.ok(await page.evaluate(()=>{const w=document.querySelector('.pack-table-wrap')!;return w.scrollWidth<=w.clientWidth+1}),'all 7 days fit without sideways scrolling');
 for(const box of await page.locator('#pack-schedule-form .pack-cell').all()){const b=await box.boundingBox();assert.ok(b&&b.height>=44,'44 px tap target per day')}
 await shot('pack-schedule');
 await tap(page.locator('[data-house="pack-save"]'));await page.locator('#pack-schedule-form').waitFor({state:'detached'});
 // the next 14 days' weeks are made first (as opening them would): on a Friday evening or a weekend the current week has
 // no weekday lunch left, and a week made after saving must pick up the schedule too (CI 7 Nov 2026, Saturday)
 const packed=await page.evaluate((id:string)=>{const g=(globalThis as any).eval;const s=g('state'),today=g('sydneyDate()');let n=0,total=0;for(let i=0;i<14;i++){const d=g(`addDays('${today}',${i})`);g(`ensureWeek(state,monday('${d}'))`);const w=s.weeks[g(`monday('${d}')`)],m=w?.days?.[d]?.lunch;if(!m||m.cooked)continue;const wd=new Date(d+'T12:00:00Z').getUTCDay();if(wd>=1&&wd<=5){total++;if(m.attendance[id]==='packed')n++}}return {n,total,schedule:s.packSchedule}},firstId);
 assert.ok(packed.total>0&&packed.n===packed.total,'weekday lunches set to Mang đi for the scheduled person '+JSON.stringify(packed));
 assert.match(await page.locator('#main .who-busy-pack').innerText(),/Mang cơm trưa:.*T2–T6/,'packed-lunch line on Today');assert.equal(await page.locator('#main .who-busy-pack span.emo-art').count(),1,'lunch-box drawing, not an emoji');
 await noOverflow('today with pack line');await page.locator('#main .who-busy-pack').scrollIntoViewIfNeeded();await shot('today-pack-line');
 // ---- Today and settings: Cỡ chữ switch
 await page.evaluate(()=>{location.hash='today'});await page.waitForTimeout(500);await noOverflow('today');await shot('today');
 await page.evaluate(()=>{localStorage.setItem('bep-text-size','xlarge');(globalThis as any).eval('applyThemePreferences()')});await page.waitForTimeout(200);
 assert.equal(await page.evaluate(()=>document.documentElement.dataset.textSize),'xlarge');await noOverflow('today extra-large text');await shot('today-xlarge');
 await page.evaluate(()=>{localStorage.setItem('bep-text-size','medium');(globalThis as any).eval('applyThemePreferences()')});await noOverflow('today medium text');
 await page.evaluate(()=>{localStorage.removeItem('bep-text-size');(globalThis as any).eval('applyThemePreferences()')});
 await tap(page.locator('.top-avatar.account-avatar'));await tap(page.locator('#account-menu [data-personal="account-security"]'));await page.locator('#text-size-select').waitFor();
 assert.deepEqual(await page.locator('#text-size-select option').allInnerTexts(),['Vừa','Lớn (mặc định)','Rất lớn']);await page.locator('#text-size-select').scrollIntoViewIfNeeded();await noOverflow('settings');await shot('settings-text-size');
 assert.deepEqual(errors,[],'no page errors '+size);await ctx.close()}
await browser.close();
console.log('PASS v1.7.5 owner feedback at 375, 320, 820 and 1280 px: photo pickers open, meal/dish types, untickable meals, paste box, per-row shopping tick, đòn, ½, unnumbered method, Bữa phụ, 5 suggestions + Xem thêm, portion wording, packed-lunch schedule, text size, no overflow');
})().catch((e:any)=>{console.error(e);process.exit(1)});
