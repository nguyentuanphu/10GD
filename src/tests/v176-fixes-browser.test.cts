// v1.7.6 owner report (6 Nov 2026, iPhone screenshots): “Chi tiêu” left in Vietnamese in English mode; “hôm nay tôi away
// nhưng vẫn ghi là at home”; names in the packed-lunch table split over lines; “chữ bị wrap xuống… audit lại tất cả”.
// Exercised at phone, narrow phone, tablet and desktop sizes in VI and EN; screenshots are the release evidence in
// docs/reviews/v1.7.8 (since v1.7.8; earlier runs in v1.7.6) (Chromium viewport simulation, not physical devices).
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert');
const dir='docs/reviews/v1.7.8';fs.mkdirSync(dir,{recursive:true});
const SIZES:any[]=[['narrow',{width:320,height:740}],['mobile',{width:375,height:812}],['tablet',{width:820,height:1100}],['desktop',{width:1280,height:800}]];
// the owner's family: one member is called “Chi”, which used to block the translation of “Chi tiêu”
const MEMBERS=[['m-phu','Ba Phú'],['m-mi','Mẹ Mi'],['m-chi','Chi'],['m-tien','Tiên'],['m-ti','Cậu Tí']];
// text that is cut off, sticks out of its button, or a word broken in the middle — none allowed
const TEXT_CHECK=`(()=>{const out=[];const scope=document.querySelector('#modal-root .modal')||document.body;const vis=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'};
 for(const e of scope.querySelectorAll('button,a,label,summary,.pill,.chip,.more-label,select')){if(!vis(e)||e.closest('.sr-only,[aria-hidden="true"],.ladybug'))continue;const t=(e.innerText||'').trim();if(!t)continue;
  if(e.tagName==='SELECT')continue;const cs=getComputedStyle(e);if(e.scrollWidth>e.clientWidth+2&&cs.overflowX!=='visible'||cs.textOverflow==='ellipsis'&&e.scrollWidth>e.clientWidth+1)out.push('cut: '+t.slice(0,40));
  if(e.tagName==='BUTTON'||e.tagName==='A'){const r=e.getBoundingClientRect();for(const c of e.querySelectorAll('span,b')){const q=c.getBoundingClientRect();if(q.width&&(q.left<r.left-2||q.right>r.right+2)){out.push('sticks out: '+t.slice(0,40));break}}}}
 const tw=document.createTreeWalker(scope,NodeFilter.SHOW_TEXT);let n;while((n=tw.nextNode())){const p=n.parentElement;if(!p||!vis(p)||p.closest('script,style,.sr-only,textarea,select,option'))continue;const re=/[\\p{L}\\p{N}]{3,}/gu;let m;while((m=re.exec(n.nodeValue))){const rg=document.createRange();rg.setStart(n,m.index);rg.setEnd(n,m.index+m[0].length);const rs=[...rg.getClientRects()].filter(x=>x.width>0.5);if(rs.length>1&&new Set(rs.map(x=>Math.round(x.top))).size>1)out.push('word broken: '+m[0])}}
 // v1.7.9 (owner, 6 Nov 2026: "chữ chạy khắp nơi"): text squeezed into a column so narrow that each word sits on its own line
 {const seen=new Set();const tw2=document.createTreeWalker(scope,NodeFilter.SHOW_TEXT);let n2;while((n2=tw2.nextNode())){const p=n2.parentElement;if(!p||seen.has(p)||!vis(p)||p.closest('script,style,.sr-only,textarea,select,option,svg'))continue;const words=[...n2.nodeValue.matchAll(/\S+/g)];if(words.length<3)continue;const tops=new Set();for(const w of words){const rg=document.createRange();rg.setStart(n2,w.index);rg.setEnd(n2,w.index+w[0].length);const r=rg.getClientRects()[0];if(r&&r.width>0)tops.add(Math.round(r.top))}if(tops.size>=words.length&&tops.size>=3){seen.add(p);out.push('one word per line: '+n2.nodeValue.trim().slice(0,40))}}}
 return out})()`;
(async()=>{const browser=await chromium.launch();const root=process.cwd();
for(const lang of ['vi','en'])for(const [size,viewport] of SIZES){
 const ctx=await browser.newContext({viewport,reducedMotion:'reduce',timezoneId:'Australia/Sydney',serviceWorkers:'block'});
 await ctx.addInitScript((l:string)=>{if(sessionStorage.getItem('qa'))return;sessionStorage.setItem('qa','1');localStorage.setItem('guest/bep-language',l)},lang);
 const page=await ctx.newPage();const errors:string[]=[];page.on('pageerror',(e:any)=>errors.push(e.message));
 await page.route('https://kitchen.test/**',async(route:any)=>{const url=new URL(route.request().url());if(url.pathname.startsWith('/.netlify/')){const op=url.searchParams.get('op');return route.fulfill({json:op==='status'?{configured:false,connected:false}:op==='state'?{state:null,etag:null}:op==='families'?{families:[]}:{announcements:[],devices:[]}})}const file=path.join(root,'dist',url.pathname==='/'?'index.html':url.pathname);try{await route.fulfill({body:fs.readFileSync(file),contentType:({'.html':'text/html','.js':'application/javascript','.json':'application/json','.css':'text/css','.webp':'image/webp','.svg':'image/svg+xml','.png':'image/png'} as any)[path.extname(file)]||'application/octet-stream'})}catch{await route.fulfill({status:404,body:'Missing'})}});
 const label=`${lang} ${size}`,shot=(name:string)=>page.screenshot({path:`${dir}/${lang}-${size}-${name}.png`});
 const textOk=async(where:string)=>{await page.waitForTimeout(250);const bad=await page.evaluate(TEXT_CHECK);assert.deepEqual(bad,[],`${label} ${where}: text cut off or broken`);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${label} ${where}: no horizontal overflow`)};
 await page.goto('https://kitchen.test/#today');await page.locator('#main h1').waitFor({timeout:15000});
 await page.evaluate(`(()=>{state.preferences.onboardingComplete=true;state.members=${JSON.stringify(MEMBERS)}.map(([id,name],i)=>({id,name,weight:i<2?1:0.75,emoji:''}));const w=currentWeek();
  for(const d of Object.keys(w.days))for(const t of MEAL_TYPES){const m=w.days[d][t];if(!m)continue;m.attendance={};for(const p of state.members)m.attendance[p.id]='home'}
  for(const d of Object.keys(w.days).slice(0,3))w.days[d].dinner.recipes=[clone(state.recipes.find(x=>x.id==='r1')),clone(state.recipes.find(x=>x.id==='r16'))];
  const today=sydneyDate();selectedDate=today;state.availability={'m-phu':{[today]:{lunch:{status:'away',deduct:true,remind:false,note:''}}}};state.packSchedule={members:{'m-chi':[1,2,3,4,5]}};
  save();closeModal();view='today';render()})()`);
 // v1.7.10 (owner, 7 Nov 2026: “ấn nút bữa sáng / trưa / tối thì web nó nhảy… ấn nút là không được nhảy”): tapping a meal tab keeps
 // the tabs exactly where they were on screen
 {const tabs=page.locator('#main [data-action="attendance-tab"]');if(await tabs.count()>1){await tabs.first().scrollIntoViewIfNeeded();await page.evaluate(()=>scrollBy(0,-200));
  for(const i of [1,0,1]){const t=tabs.nth(i),y0=(await t.boundingBox())!.y;await t.click();await page.waitForTimeout(120);const y1=(await page.locator(`#main [data-action="attendance-tab"]`).nth(i).boundingBox())!.y;assert.ok(Math.abs(y1-y0)<3,`${label}: meal tab stays put (${y0} → ${y1})`)}}await shot('meal-tab-still')}
 // v1.7.10 (owner, 7 Nov 2026: “bữa phụ được thêm vào thì có hiện lên không?”): with both snacks on, “Who is eating?” shows all five
 // meals in order, each tab ≥ 44 px, and tapping a snack tab does not move the page either
 {await page.evaluate(`(()=>{const d=currentWeek().days[sydneyDate()];for(const t of ['snackAm','snack']){if(!d[t])d[t]={recipes:[],attendance:{}};d[t].on=true}save();view='today';render()})()`);
  const tabs=page.locator('#main [data-action="attendance-tab"]');await tabs.first().waitFor();
  assert.deepEqual(await tabs.evaluateAll((b:any[])=>b.map(x=>x.dataset.type)),['breakfast','snackAm','lunch','snack','dinner'],`${label}: snack tabs shown in meal order`);
  for(const t of await tabs.all())assert.ok((await t.boundingBox())!.height>=44,`${label}: meal tab ≥ 44 px`);
  /* put the tabs in the middle of the screen, so the click itself never has to scroll to reach a tab */
  await page.evaluate(()=>document.querySelector('#main .attendance .tabbar')!.scrollIntoView({block:'center'}));
  for(const i of [3,1,4]){const y0=(await tabs.nth(i).boundingBox())!.y;assert.ok(y0>0&&y0+44<page.viewportSize()!.height,`${label}: tab on screen before the tap`);await tabs.nth(i).click();await page.waitForTimeout(120);const y1=(await tabs.nth(i).boundingBox())!.y;assert.ok(Math.abs(y1-y0)<3,`${label}: snack tab ${i} stays put (${y0} → ${y1})`)}
  assert.equal(await tabs.nth(4).getAttribute('class'),'active');await textOk('snack tabs');await shot('snack-tabs');
  await page.evaluate(`(()=>{const d=currentWeek().days[sydneyDate()];for(const t of ['snackAm','snack'])if(d[t])d[t].on=false;save();render()})()`)}
 // v1.7.10 (owner, 7 Nov 2026: “chia sẻ và sao chép tuần … same word with icon so they know it’s sharing to sms or messenger”):
 // every send-to-someone button has the one share picture and starts with “Chia sẻ” / “Share”; the week is shared, not only copied
 {const EMO=/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/u,word=lang==='vi'?/^Chia sẻ/:/^Share/;
  await page.evaluate(`navigator.__sent=[];Object.defineProperty(navigator,'share',{configurable:true,value:async d=>{navigator.__sent.push(d)}})`);
  for(const [v,sel,want] of [['today','[data-fm="share-day"]','share-day'],['planner','[data-action="share-week"]','share-week'],['shopping','[data-action="share-shopping"]','share-shopping']] as [string,string,string][]){
   await page.evaluate(`closeModal();view='${v}';location.hash='${v}';render()`);const b=page.locator('#main '+sel).first();await b.waitFor();await b.scrollIntoViewIfNeeded();
   assert.equal(await b.locator('svg.share-art[aria-hidden="true"]').count(),1,`${label} ${v}: share picture`);const t=(await b.innerText()).trim();assert.match(t,word,`${label} ${v}: “${t}”`);assert.ok(!EMO.test(t),`${label} ${v}: no emoji`);
   assert.ok((await b.boundingBox())!.height>=44,`${label} ${v}: ≥ 44 px`);await b.click();await page.waitForTimeout(150);
   const sent:any=await page.evaluate(`navigator.__sent.pop()`);assert.ok(sent&&sent.text&&sent.text.length>10,`${label} ${v}: opens the phone's share sheet with the text`)}
  assert.equal(await page.locator('#main [data-action="copy-week"],#main [data-action="copy-shopping"]').count(),0,`${label}: no separate copy-only buttons`);
  // without a share sheet (desktop browsers): one “Chia sẻ” sheet with text message, Messenger and copy
  await page.evaluate(`Object.defineProperty(navigator,'share',{configurable:true,value:undefined});closeModal();view='planner';render()`);await page.locator('#main [data-action="share-week"]').click();
  const sheet=page.locator('#modal-root .modal');await sheet.waitFor();assert.match(await sheet.locator('h2,h3').first().innerText(),lang==='vi'?/Chia sẻ/:/Share/);
  assert.match((await sheet.locator('a.share-btn').first().getAttribute('href'))!,/^sms:[?&]body=./,`${label}: text-message link carries the week`);assert.equal(await sheet.locator('a.share-btn').count(),2);assert.equal(await sheet.locator('[data-action="copy-share"]').count(),1);
  await textOk('share sheet');await shot('share-sheet');await page.evaluate(`closeModal();view='today';location.hash='today';render()`);await page.locator('#main h1').waitFor()}
 // v1.7.10 (owner, 7 Nov 2026: “mua đồ xong bị mặc định cất là ngăn mát… tủ đông hay tủ khô tuỳ vào món”): a place for each item
 {const ids:string[]=await page.evaluate(`(()=>{const[st,en]=shopDates(),w=currentWeek();const rows=shopping(state,w,st,en).filter(r=>shoppingHasAmount(r)&&!r.skip).slice(0,4);for(const r of rows)setShoppingBought(w,st,en,r,true);save();closeModal();view='shopping';location.hash='shopping';render();return rows.map(r=>r.id)})()`);
  assert.ok(ids.length>=3,`${label}: items ticked as bought`);
  const open=page.locator('#main [data-action="store-purchases"]').first();if(!(await open.isVisible())){const d=page.locator('#main details:has([data-action="store-purchases"]) > summary').first();if(await d.count())await d.click()}
  await page.locator('#main [data-action="store-purchases"]').first().click();const sheet=page.locator('#modal-root .modal');await sheet.locator('.store-row').first().waitFor();
  assert.equal(await sheet.locator('#store-place').count(),0,`${label}: no single “usual place” any more`);assert.equal(await sheet.locator('.store-row').count(),ids.length,`${label}: one row per bought item`);
  for(const o of await sheet.locator('.store-opt span').all())assert.ok((await o.boundingBox())!.height>=44,`${label}: place choice ≥ 44 px`);
  assert.equal(await sheet.locator('.store-row').first().locator('input:checked').count(),1,`${label}: each item has a place picked`);
  await sheet.locator('[data-store-all="freezer"]').click();assert.equal(await sheet.locator('input[value="freezer"]:checked').count(),ids.length,`${label}: “Đặt tất cả: Ngăn đông”`);
  await sheet.locator(`.store-row:nth-child(2) .store-opt:has(input[value="dry"])`).click();await textOk('put-away sheet');await shot('put-away');
  const before:number=await page.evaluate('state.pantry.length');await sheet.locator('[data-action="submit-form"][data-id="store-form"]').click();await page.waitForTimeout(200);
  const placed:any=await page.evaluate(`state.pantry.slice(${before}).map(p=>[p.ingredient,p.place])`);const at=(id:string)=>placed.find((p:any)=>p[0]===id)?.[1];
  assert.equal(at(ids[0]),'freezer',`${label}: put in the freezer`);assert.equal(at(ids[1]),'dry',`${label}: changed to the shelf`);
  assert.equal(await page.evaluate(`suggestStorePlace(state,${JSON.stringify(ids[0])})`),'freezer',`${label}: remembered for next time`);
  await page.evaluate(`(()=>{state.pantry=state.pantry.slice(0,${before});delete state.preferences.storePlaces;save();closeModal();view='today';location.hash='today';render()})()`);await page.locator('#main h1').waitFor()}
 // 1. Today: the calendar says Ba Phú is away for lunch → “Who is eating?” says Away too (it said At home)
 await page.locator('[data-action="attendance-tab"][data-type="lunch"]').click();
 const phu=page.locator('select[data-change="attendance"][data-id="m-phu"]');
 assert.equal(await phu.inputValue(),'away',`${label}: calendar away shows as Away in “Who is eating?”`);
 assert.match(await page.locator('[data-who-busy]').innerText(),lang==='en'?/Ba Phú\s+away/:/Ba Phú\s+vắng/,`${label}: Who’s busy lists the same`);
 await phu.scrollIntoViewIfNeeded();await textOk('today');await shot('today-away');
 if(size==='mobile'){ // back home for this lunch → the calendar entry for that one meal is lifted, both places agree
  await phu.selectOption('home');await page.waitForTimeout(200);
  assert.equal(await page.locator('select[data-change="attendance"][data-id="m-phu"]').inputValue(),'home');
  assert.equal(await page.evaluate(`!!state.availability?.['m-phu']?.[sydneyDate()]?.lunch`),false,'calendar away lifted for that meal');
  assert.ok(!/Ba Phú/.test(await page.locator('[data-who-busy]').innerText().catch(()=>'')),'Who’s busy no longer lists Ba Phú')}
 // v1.7.9 (owner, 6 Nov 2026 22:14: "Tuần này ai bận… bận nhiều quá thì nhìn rối mắt… không báo được thời gian"): a busy
 // week like the family's (Chi and Tiên away breakfast + lunch on 4 days) reads as one short line per pattern, times included
 {const days:string[]=await page.evaluate(`(()=>{const t=sydneyDate(),out=[];for(let i=0;i<7;i++)out.push(addDays(t,i));return out})()`),pick=[days[0],days[3],days[5],days[6]];
  const saved=await page.evaluate('JSON.stringify(state.availability||{})');
  await page.evaluate(`(()=>{const e={status:'away',deduct:true,remind:false,note:'Đi học'};for(const id of ['m-chi','m-tien'])setAvailability(state,id,${JSON.stringify(pick)},['breakfast','lunch'],e);setAvailability(state,'m-ti',[${JSON.stringify(days[1])}],['dinner'],{status:'busy',deduct:false,remind:false,note:'',from:'17:00',to:'19:30'});save();view='today';render()})()`);
  const wb=page.locator('[data-who-busy]');await wb.scrollIntoViewIfNeeded();const chi=wb.locator('.who-busy-row',{hasText:'Chi'}).first();
  const lines=await chi.locator('.who-busy-line').allInnerTexts();assert.equal(lines.length,1,`${label}: Chi's 8 meals are one line (${lines})`);assert.match(lines[0],lang==='en'?/^breakfast \+ lunch: /:/^sáng \+ trưa: /,`${label}: meals once, then the days`);
  if(await wb.locator('.who-busy-row',{hasText:'Cậu Tí'}).count())assert.match(await wb.locator('.who-busy-row',{hasText:'Cậu Tí'}).innerText(),/17:00–19:30/,`${label}: the time shows`);
  for(const b of await wb.locator('.who-busy-row').all())assert.ok((await b.boundingBox())!.height>=44,`${label}: rows ≥ 44 px`);
  await textOk('who-busy');await shot('who-busy');
  await page.evaluate(`state.availability=JSON.parse(${JSON.stringify(saved)});save();render()`)}
 // v1.7.10 (Henry's choice, 7 Nov 2026): online estimate for items counted by the piece
 if(size==='mobile'&&lang==='vi')assert.deepEqual(await page.evaluate(`[scoutOnlineEstimate({qty:6,unit:'quả'},{unitBasis:'per_each',unitPrice:.5}),scoutOnlineEstimate({qty:14,unit:'quả'},{packQty:12,packUnit:'each',price:7}),scoutOnlineEstimate({qty:2,unit:'cái'},{packQty:3,packUnit:'ea',price:2}),scoutOnlineEstimate({qty:500,unit:'g'},{unitBasis:'per_kg',unitPrice:10}),scoutOnlineEstimate({qty:3,unit:'quả'},{packQty:500,packUnit:'g',price:4})]`),[3,14,2,5,null],'per-piece estimates: per each, whole packs, and no guess across units');
 // v1.7.10 (Henry, 7 Nov 2026): eight colour themes in Other settings → Appearance, light and dark, this device only; the
 // light / dark button in the top bar is our own drawing, no emoji
 {await page.evaluate(`otherSettingsModal('appearance')`);const fold=page.locator('#modal-root .theme-fold');await fold.waitFor();
  /* v1.7.10 (owner: “chỗ màu giao diện này nên cho collapsable”): folded by default, the closed row names the current colour and is a ≥ 44 px target */
  assert.equal(await fold.evaluate((d:any)=>d.open),false,`${label}: colours folded at first`);const sum=page.locator('#modal-root .theme-fold-summary');assert.ok((await sum.boundingBox())!.height>=44,`${label}: fold row ≥ 44 px`);
  assert.equal(await page.locator('#modal-root [data-color-theme]').first().isVisible(),false,`${label}: swatches hidden while folded`);
  await sum.focus();await page.keyboard.press('Enter');assert.equal(await fold.evaluate((d:any)=>d.open),true,`${label}: opens with the keyboard`);await page.keyboard.press('Enter');assert.equal(await fold.evaluate((d:any)=>d.open),false);await sum.click();
  const sw=page.locator('#modal-root [data-color-theme]');await sw.first().waitFor();assert.equal(await sw.count(),13,`${label}: auto + default + 8 colours + 3 seasonal`);
  for(const b of await sw.all())assert.ok((await b.boundingBox())!.height>=44,`${label}: swatch ≥ 44 px`);
  const before=await page.evaluate(`getComputedStyle(document.documentElement).getPropertyValue('--green').trim()`);await page.locator('#modal-root [data-color-theme="khoaimon"]').scrollIntoViewIfNeeded();await page.locator('#modal-root [data-color-theme="khoaimon"]').click();
  assert.equal(await page.evaluate(`document.documentElement.dataset.festival`),'khoaimon');assert.equal(await page.locator('#modal-root [data-color-theme="khoaimon"]').getAttribute('aria-checked'),'true');assert.equal(await fold.evaluate((d:any)=>d.open),true,`${label}: stays open after a tap`);assert.match(await page.locator('#modal-root [data-theme-current]').innerText(),/Khoai môn|Taro/,`${label}: closed row shows the new colour`);
  assert.notEqual(await page.evaluate(`getComputedStyle(document.documentElement).getPropertyValue('--green').trim()`),before,`${label}: colours change at once`);await textOk('appearance');if(size==='mobile')await shot('appearance-themes');
  await page.evaluate(`localStorage.setItem('bep-theme-mode','dark');applyThemePreferences()`);assert.ok(['#a98bd0'].includes(await page.evaluate(`getComputedStyle(document.documentElement).getPropertyValue('--green').trim()`)),`${label}: dark version`);
  const tg=page.locator('#theme-quick-toggle');if(await tg.count()){assert.equal(await tg.locator('svg.ui-art').count(),1,`${label}: drawn toggle`);assert.doesNotMatch(await tg.innerText(),/\p{Extended_Pictographic}/u,`${label}: no emoji`)}
  // v1.7.10 (owner: “auto option để màu tự chuyển giữa các theme”): one colour per day, the next one the next day
  await page.evaluate(`localStorage.setItem('bep-theme-mode','light');applyThemePreferences()`);await page.locator('#modal-root [data-color-theme="auto"]').click();
  {const r:any=await page.evaluate(`({now:document.documentElement.dataset.festival||'default',want:autoColorTheme(),a:autoColorTheme('2026-11-07'),b:autoColorTheme('2026-11-08'),cycle:AUTO_THEME_CYCLE})`);assert.equal(r.now,r.want,`${label}: today's colour applied`);assert.notEqual(r.a,r.b,`${label}: the next day has another colour`);assert.ok(r.cycle.includes(r.a)&&r.cycle.includes(r.b));assert.equal(await page.locator('#modal-root [data-color-theme="auto"]').getAttribute('aria-checked'),'true')}
  await page.evaluate(`localStorage.setItem('bep-festival-theme','default');localStorage.setItem('bep-theme-mode','light');applyThemePreferences();closeModal()`)}
 // 2. More tools: every row in the chosen language, on one line (owner: “Chi tiêu” in English mode)
 if(size==='narrow'||size==='mobile'){await page.locator('[data-ui-more]').first().click();const more=page.locator('.more-tools');await more.waitFor();
  const rows=await more.locator('.more-label').allInnerTexts();
  if(lang==='en'){assert.ok(rows.includes('Spending'),`${label}: “Chi tiêu” is translated (a member is called Chi): ${rows}`);for(const r of rows)assert.ok(!/[ăâđêôơưàáạảãấầẩẫậắằẳẵặèéẻẽẹếềểễệìíỉĩịòóỏõọốồổỗộớờởỡợùúủũụứừửữựỳýỷỹỵ]/i.test(r),`${label}: English row “${r}”`)}
  for(const h of await more.locator('.more-label').evaluateAll((a:any[])=>a.map(e=>Math.round(e.getBoundingClientRect().height))))assert.ok(h<34,`${label}: More row on one line (${h}px)`);
  await textOk('more');await shot('more');await page.evaluate('closeModal()')}
 // 3. Packed-lunch schedule: each name whole, on one line
 await page.locator('[data-house="pack-schedule"]').first().scrollIntoViewIfNeeded();await page.locator('[data-house="pack-schedule"]').first().click();await page.locator('.pack-table').waitFor();
 for(const r of await page.locator('.pack-table th[scope=row]').evaluateAll((a:any[])=>a.map(e=>{const rg=document.createRange();rg.selectNodeContents(e);return{t:e.textContent,lines:new Set([...rg.getClientRects()].filter(x=>x.width>1).map(x=>Math.round(x.top))).size}})))assert.equal(r.lines,1,`${label}: “${r.t}” on one line in the packed-lunch table`);
 await textOk('pack');await shot('pack');await page.evaluate('closeModal()');
 // 4. Weekly menu: meals are readable cards (≥ 200 px), not 60 px slivers
 await page.evaluate(`view='planner';render();scrollTo(0,0)`);await page.locator('#main .plan-day[open] .family-meal-card').first().waitFor();
 const widths=await page.locator('#main .family-meal-card').evaluateAll((a:any[])=>a.filter(e=>e.offsetParent).slice(0,8).map(e=>Math.round(e.getBoundingClientRect().width)));
 assert.ok(widths.length&&Math.min(...widths)>=200,`${label}: weekly menu meal cards ≥ 200 px wide, got ${widths}`);
 // ladybug #28 (6 Nov 2026: "đã đăng ảnh của món ăn lên rồi mà sao ở ngoài menu vẫn không hiển thị"): a dish already on the menu
 // shows the family recipe's photo added later
 if(size==='mobile'){const pd=await page.evaluate(`(()=>{const d=Object.keys(currentWeek().days).find(d=>currentWeek().days[d].dinner.recipes.length);const dish=currentWeek().days[d].dinner.recipes[0];const r=state.recipes.find(x=>x.id===dish.id);r.photo={key:'qa-photo-28',updatedAt:new Date().toISOString()};delete dish.photo;render();return dish.id})()`);
  assert.ok(await page.locator('#main img.rc-recipe-photo[data-rc-photo="qa-photo-28"]').count()>0,`${label}: menu card carries the recipe photo (ladybug #28)`);
  await page.evaluate(`(()=>{const r=state.recipes.find(x=>x.id===${JSON.stringify(pd)});delete r.photo;render()})()`)}
 // v1.7.9 (owner, 7 Nov 2026: "nút lên thực đơn nên được chuyển xuống cùng dòng mấy cái này"): one grid of week actions, the
 // plan button first; no Đơn giản / Đầy đủ switch any more; every tile ≥ 44 px and equal height per row
 {const acts=page.locator('#main .week-tools .plan-actions');await acts.waitFor();assert.equal(await acts.locator('> *').first().getAttribute('data-fm'),'generate',`${label}: plan button first`);
  assert.equal(await page.locator('#main .page-heading [data-fm="generate"]').count(),0,`${label}: not in the title row`);assert.equal(await page.locator('#main [data-screen-mode]').count(),0,`${label}: no Đơn giản / Đầy đủ switch`);
  assert.ok(await acts.locator('> *').count()>=4,`${label}: the week's actions are together`);for(const b of await acts.locator('> *').all())assert.ok((await b.boundingBox())!.height>=44,`${label}: tiles ≥ 44 px`)}
 await textOk('planner');await shot('planner');
 // 4a. the family chooses the first day of its menu week (ladybug report: shopping on Saturday → menu Saturday to Friday)
 if(size==='mobile'||size==='desktop'){const pick=page.locator('#week-start-day');await pick.waitFor();assert.equal(await pick.inputValue(),'1','Monday by default');
  await pick.selectOption('6');await page.waitForTimeout(250);
  const first=await page.evaluate(`Object.keys(currentWeek().days)[0]`),wd=await page.evaluate(`parseDate(Object.keys(currentWeek().days)[0]).getDay()`);assert.equal(wd,6,`${label}: menu week starts on Saturday (${first})`);
  assert.equal(await page.evaluate(`Object.keys(state.weeks).every(k=>parseDate(k).getDay()===1)`),true,'stored weeks stay keyed by Monday');
  assert.equal(await page.evaluate(`state.preferences.weekStartDay`),6,'family-wide setting saved');
  await textOk('planner-saturday');await shot('planner-saturday');
  await page.evaluate(`view='shopping';render()`);assert.equal(await page.evaluate(`shopDates().join(' ')`),await page.evaluate(`[weekStart,addDays(weekStart,6)].join(' ')`));assert.equal(await page.evaluate(`parseDate(shopDates()[0]).getDay()`),6,'whole-week shopping from Saturday');
  await page.evaluate(`view='planner';render()`);await page.locator('#week-start-day').selectOption('1');await page.waitForTimeout(200);assert.equal(await page.evaluate(`parseDate(Object.keys(currentWeek().days)[0]).getDay()`),1,'back to Monday')}
 // v1.7.7 (owner, 6 Nov): each day folds under one clear line; today is open; breakfast, lunch and dinner always show;
 // Bữa phụ is added / removed per day; the round button rounds a shopping amount one step at a time.
 {const days=page.locator('#main details.plan-day');assert.equal(await days.count(),7,`${label}: 7 day sections`);
  assert.equal(await page.locator('#main details.plan-day[open]').count(),1,`${label}: only today open at first`);
  const td=page.locator('#main details.plan-day.is-today');assert.equal(await td.evaluate((d:any)=>d.open),true);
  const types=await td.locator('.family-meal-card').evaluateAll((a:any[])=>a.map(e=>e.closest('[data-type]')?.dataset.type||e.dataset.type||e.querySelector('[data-type]')?.dataset.type||''));
  const labels=await td.locator('.family-meal-card h3').allInnerTexts();assert.ok(labels.length>=3,`${label}: breakfast, lunch, dinner shown (${labels})`);assert.ok(labels.some(t=>/trưa|lunch/i.test(t)),`${label}: lunch always shown`);
  // v1.7.8 (owner, 6 Nov 2026): the day line no longer lists breakfast / lunch / dinner — day, date, counts and a "Bữa ±"
  // button that adds or removes any meal; a meal card swiped left or right is removed.
  assert.equal(await page.locator('#main .plan-day-head .pd-sum, #main .plan-day-head .pd-meal').count(),0,`${label}: no meal lines on the day line`);
  const other=days.nth(await page.evaluate(`[...document.querySelectorAll('#main details.plan-day')].findIndex(d=>!d.open)`));const head=await other.locator('.plan-day-head').innerText();
  assert.doesNotMatch(head,lang==='en'?/Breakfast|Lunch|Dinner/:/Bữa sáng|Bữa trưa|Bữa tối/,`${label}: folded day line has no meal names (${head})`);assert.match(head,lang==='en'?/\d+ meals · \d+ dishes/:/\d+ bữa · \d+ món/);
  const mb=other.locator('.pd-meals');assert.ok((await mb.boundingBox())!.height>=44,`${label}: "Bữa ±" is a 44 px target`);
  const hb=await other.locator('.plan-day-head').boundingBox();assert.ok(hb!.height<=(size==='narrow'?110:80),`${label}: day line stays short (${hb!.height}px)`);
  if(size==='mobile'){const td2=()=>page.locator('#main details.plan-day.is-today'),slots=()=>td2().locator('.meal-slot'),slot=(t:string)=>td2().locator(`.meal-slot[data-slot="${t}"]`);
   const toggle=async(t:string,on:boolean)=>{await td2().locator('.pd-meals').click();const c=page.locator(`#modal-root [data-plan-meal-toggle="${t}"]`);await c.waitFor();await textOk('meals-sheet');assert.equal(await page.locator('#modal-root [data-plan-meal-toggle]').count(),5,'all five meals listed');
    if(on)await c.check();else await c.uncheck();await page.waitForTimeout(250);await page.evaluate('closeModal()')};
   // the "Bữa ±" button does not fold the day
   const before=await slots().count();await toggle('snack',true);assert.equal(await td2().evaluate((d:any)=>d.open),true,'day stays open');assert.equal(await slots().count(),before+1,'afternoon snack added');
   await toggle('snack',false);assert.equal(await slots().count(),before,'afternoon snack removed');
   await toggle('snackAm',true);assert.equal(await slot('snackAm').count(),1,'morning snack added');
   // swipe the (empty) morning snack to the left: removed
   const swipe=async(t:string,dir:number)=>{const card=slot(t);await card.scrollIntoViewIfNeeded();const bx=(await card.boundingBox())!;const y=bx.y+Math.min(40,bx.height/2),x0=bx.x+bx.width/2;
    await page.mouse.move(x0,y);await page.mouse.down();await page.mouse.move(x0+dir*bx.width*0.2,y,{steps:4});
    assert.equal(await card.evaluate((e:any)=>e.classList.contains('swiping')),true,'card follows the finger');await page.mouse.move(x0+dir*bx.width*0.45,y,{steps:4});await shot('swipe-meal');await page.mouse.up();await page.waitForTimeout(300)};
   await swipe('snackAm',-1);assert.equal(await slot('snackAm').count(),0,'morning snack swiped away');
   // a short swipe springs back
   {const card=slot('lunch'),bx=(await card.boundingBox())!;const y=bx.y+30,x0=bx.x+bx.width/2;await page.mouse.move(x0,y);await page.mouse.down();await page.mouse.move(x0+bx.width*0.2,y,{steps:4});await page.mouse.up();await page.waitForTimeout(300);assert.equal(await slot('lunch').count(),1,'short swipe keeps the meal')}
   // breakfast (with dishes): swipe right asks first, then it is gone for the day; "Bữa ±" brings it back
   const hasDishes=await page.evaluate(`currentWeek().days[sydneyDate()]?.breakfast?.recipes?.length||0`);if(hasDishes)page.once('dialog',(d:any)=>d.accept());
   await swipe('breakfast',1);assert.equal(await slot('breakfast').count(),0,'breakfast swiped away');
   await toggle('breakfast',true);assert.equal(await slot('breakfast').count(),1,'breakfast added back');
   assert.equal(await td2().locator('[data-plan-meal="remove"], .plan-day-tools').count(),0,'no extra remove buttons or add row under the meals')}
  await shot('planner-days')}
 // 4b. meal editor opens with the meal's ingredients (ladybug report: “không thấy nguyên liệu cho bữa ăn này”)
 if(size==='mobile'||size==='desktop'){const d=await page.evaluate(`Object.keys(currentWeek().days).find(d=>currentWeek().days[d].dinner.recipes.length)`);await page.evaluate(`familyEditMeal(${JSON.stringify(d)},'dinner')`);
  // v1.7.8 (ladybug #26): “+ Thêm món ăn” starts at “1. Tự thêm nhanh món ăn”; dishes already in the meal are not offered
  // again; 3 suggestions per section; the meal's ingredients are still there, folded at the end
  const first=await page.evaluate(`(()=>{const m=document.querySelector('#modal-root .modal-content, #modal-root .modal');const f=m.querySelector('#family-meal-form');return f&&f.querySelector('.soft-box b')?.textContent})()`);assert.match(first,/1\. (Tự thêm nhanh món ăn|Quick-add a dish)/);
  const box=page.locator('#modal-root .meal-ingredients');await box.waitFor();assert.equal(await box.evaluate((e:any)=>e.open),false,'ingredients folded');
  assert.equal(await box.evaluate((e:any)=>!!(document.getElementById('family-meal-form')!.compareDocumentPosition(e)&Node.DOCUMENT_POSITION_FOLLOWING)),true,'ingredients after the form');
  await box.locator('summary').click();assert.ok(await box.locator('.meal-ing-dish').count()>=2,`${label}: one section per dish`);assert.ok(await box.locator('ul.ingredients li').count()>=3,`${label}: ingredients listed for the meal`);
  const inMeal:string[]=await page.evaluate(`currentWeek().days[${JSON.stringify(d)}].dinner.recipes.map(r=>r.id)`);const offered:string[]=await page.locator('#family-meal-form input[name="recipe"]').evaluateAll((a:any[])=>a.map(i=>i.value));
  assert.equal(offered.filter(id=>inMeal.includes(id)).length,0,`${label}: dishes already in the meal are not offered`);
  assert.ok(await page.locator('#meal-lib-list .family-select-row').count()<=3,`${label}: 3 suggestions`);
  await textOk('meal-editor');await shot('meal-editor');
  // ladybug #27: tick one more dish and save — it joins the meal and shows on the menu at once, nothing else is lost
  if(size==='mobile'){const pickId=await page.locator('#meal-lib-list input[name="recipe"]').first().getAttribute('value');await page.locator(`#meal-lib-list input[name="recipe"][value="${pickId}"]`).check();
   await page.locator('[data-action="submit-form"][data-id="family-meal-form"]').click();await page.waitForTimeout(300);
   const after:string[]=await page.evaluate(`currentWeek().days[${JSON.stringify(d)}].dinner.recipes.map(r=>r.id)`);assert.deepEqual(after,[...inMeal,pickId],'added, nothing removed');
   // quick-add then save: the new dish stays (it used to vanish when its row was not ticked)
   await page.evaluate(`familyEditMeal(${JSON.stringify(d)},'dinner')`);await page.locator('#quick-dish-name').fill('Gỏi gà bắp cải nhà làm');await page.locator('#quick-dish-save').uncheck();await page.locator('[data-fm="quick-add-dish"]').click();await page.waitForTimeout(300);
   assert.match(await page.evaluate(`document.querySelector('#main [data-plan-day="${d}"]').textContent`),/Gỏi gà bắp cải nhà làm/,'quick-added dish on the menu behind the sheet');
   await page.locator('[data-action="submit-form"][data-id="family-meal-form"]').click();await page.waitForTimeout(300);
   assert.ok((await page.evaluate(`currentWeek().days[${JSON.stringify(d)}].dinner.recipes.map(r=>r.name)`)).includes('Gỏi gà bắp cải nhà làm'),'quick-added dish kept after Save');}
  await page.evaluate('closeModal()')}
 // v1.7.9, every size (owner, 6 Nov 2026 21:55: "lúc add thì nó phải mở một trang mới để tôi viết món"): a new dish opens the recipe page at once, then the written recipe is the dish in the meal
  {const d=await page.evaluate(`Object.keys(currentWeek().days).find(d=>currentWeek().days[d].dinner.recipes.length)`);const name=`Cá thu sốt cà ${lang} ${size}`;await page.evaluate(`familyEditMeal(${JSON.stringify(d)},'dinner')`);await page.locator('#quick-dish-name').fill(name);assert.equal(await page.locator('#quick-dish-save').isChecked(),true,`${label}: save to Family Recipes is on by default`);
   await page.locator('[data-fm="quick-add-dish"]').click();await page.locator('#family-recipe-form').waitFor({timeout:5000});assert.equal(await page.locator('#family-meal-form').count(),0,`${label}: the meal sheet gave way to the recipe page`);
   assert.equal(await page.locator('#family-recipe-form input[name="name"]').inputValue(),name,`${label}: the recipe page has the dish name`);
   await page.waitForFunction(()=>!!document.activeElement?.closest('#family-recipe-form .rc-ings, #family-recipe-form textarea[name="ingredients"]'),null,{timeout:3000});
   assert.ok((await page.evaluate(`currentWeek().days[${JSON.stringify(d)}].dinner.recipes.map(r=>r.name)`)).includes(name),`${label}: already in the meal`);
   await textOk('quick-add-recipe-page');await shot('quick-add-recipe-page');
   const row=page.locator('#rc-ing-list .rc-ing-row').first();await row.locator('.rc-ing-name-input').fill('Cá thu');await row.locator('.rc-ing-qty').fill('500');await row.locator('.rc-ing-unit').selectOption('g');
   await page.locator('[data-action="submit-form"][data-id="family-recipe-form"]').click();await page.waitForFunction(()=>!document.querySelector('#family-recipe-form'),null,{timeout:5000});
   const dish:any=await page.evaluate(`currentWeek().days[${JSON.stringify(d)}].dinner.recipes.find(r=>r.name===${JSON.stringify(name)})`);assert.equal(dish?.ingredients?.length,1,`${label}: the dish in the meal carries the written ingredient`);
   assert.equal(await page.evaluate(`state.recipes.filter(r=>r.name===${JSON.stringify(name)}).length`),1,`${label}: one family recipe, no duplicate`)}
  await page.evaluate('closeModal()')
 // v1.7.8 (ladybug #25): “Lịch tháng” right under the row of week days on Today
 {await page.evaluate(`view='today';render();scrollTo(0,0)`);const cal=page.locator('#main .calendar-shortcut');await cal.waitFor();assert.equal(await cal.evaluate((e:any)=>e.previousElementSibling?.classList.contains('day-strip')),true,`${label}: calendar button under the day strip`);assert.ok((await cal.boundingBox())!.height>=44)}
 // 5. the other screens: nothing cut off, no word broken in the middle
 // v1.7.7 buy extra on purpose: "+500 g" in the picker and a reason; the row says so; "Dùng lượng tự động" clears it
 if(size==='mobile'){await page.evaluate(`view='shopping';render();scrollTo(0,0)`);const qb=page.locator('#main button[data-action="purchase-quantity"]').first();const qid=await qb.getAttribute('data-id');await qb.click();
  // v1.7.8 (ladybug #21/#22): no "Bước cuộn" and no amount suggestion chips in the picker; the extra is typed or scrolled
  await page.locator('#purchase-extra-why').waitFor();assert.equal(await page.locator('#weight-step, [data-buy-plus], .weight-quick-picks button').count(),0,'no step choice or suggestion chips');assert.doesNotMatch(await page.locator('#modal-root').innerText(),/Bước cuộn/);
  await page.evaluate('setPickerQuantity(purchasePicker.qty+500)');await page.locator('#purchase-extra-why').fill('làm chả');await shot('buy-extra');
  await page.locator('[data-action="save-purchase-quantity"]').click();await page.waitForTimeout(300);
  const note=page.locator(`#main .shop-row:has(button[data-id="${qid}"]) .buy-extra-note`);assert.match(await note.innerText(),/\+500 g · làm chả/,'row shows the extra and why');
  await page.locator(`#main button[data-action="purchase-quantity"][data-id="${qid}"]`).click();await page.locator('[data-action="reset-purchase-quantity"]').click();await page.waitForTimeout(300);assert.equal(await note.count(),0,'automatic amount clears the extra')}
 // v1.7.7 round button on the shopping list (tap = one step)
 // v1.7.8 (owner: "không có nút round down?"): ≈↓ and ≈↑ side by side; tap = one step; hold = step options
 {await page.evaluate(`view='shopping';render();scrollTo(0,0)`);const up=page.locator('.qty-round[data-qr-dir="up"]').first();await up.waitFor();const id=await up.getAttribute('data-qr-id');const down=page.locator(`.qty-round[data-qr-dir="down"][data-qr-id="${id}"]`);const q=()=>page.evaluate(`(()=>{const[s,e]=shopDates();const r=shopping(state,currentWeek(),s,e).find(x=>x.id===${JSON.stringify(id)});return r.qty??r.suggested})()`);
  assert.equal(await down.count(),1,`${label}: a round-down button next to round-up`);const ub=(await page.locator('.qty-round[data-qr-dir="up"]').first().boundingBox())!,db=(await down.boundingBox())!;assert.ok(Math.abs(ub.y-db.y)<4&&db.x<ub.x,`${label}: ≈↓ then ≈↑ on one line`);await down.evaluate((e:any)=>e.closest('.shop-row').scrollIntoView({block:'center'}));await shot('round-buttons');
  // nothing covers the buttons (the store button sat on top of ≈↓ at 320 px before they shared a cell)
  assert.equal(await down.evaluate((e:any)=>{const r=e.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('.qty-round')===e}),true,`${label}: ≈↓ not covered`);
  const v0=await q();await page.locator('.qty-round[data-qr-dir="up"]').first().click();await page.waitForTimeout(200);const v1=await q();assert.ok(v1>v0,`${label}: ≈↑ rounds up (${v0} → ${v1})`);assert.ok(ub.height>=44&&db.width>=44,'round buttons are 44 px targets');
  await page.locator(`.qty-round[data-qr-dir="down"][data-qr-id="${id}"]`).click();await page.waitForTimeout(200);const v2=await q();assert.ok(v2<v1,`${label}: ≈↓ rounds down (${v1} → ${v2})`);
  // ladybug #21 (“từ 3.8 lên 50”): the step follows the amount — to the nearest round number; no options sheet any more
  assert.deepEqual(await page.evaluate(`[qrNext(3.8,'g',{dir:'up'}),qrNext(3.8,'g',{dir:'down'}),qrNext(47,'g',{dir:'up'}),qrNext(1880,'g',{dir:'up'}),qrNext(1880,'g',{dir:'down'}),qrNext(625,'g',{dir:'up'})]`),[4,3,50,1900,1800,650]);
  await down.dispatchEvent('contextmenu');await page.waitForTimeout(200);assert.equal(await page.locator('#qr-form').count(),0,'no options sheet');
  await page.evaluate(`(()=>{const[s,e]=shopDates();resetPurchaseQuantity(currentWeek(),s,e,${JSON.stringify(id)});save();render()})()`)}
 // v1.7.8 owner decisions on what the app did on its own: (1) the pantry deduction is said on the row and can be switched
 // off; (2) two dishes of the same kind are no longer halved; (3) each meal says “N người → X suất”
 {await page.evaluate(`view='shopping';(()=>{const id=shopping(state,currentWeek(),...shopDates()).find(r=>r.needed>1)?.id;state.pantry.push({id:'qa-pantry',ingredient:id,qty:1,place:'fridge',expiry:''});window.__qaPantry=id})();save();render();scrollTo(0,0)`);const pid=await page.evaluate('window.__qaPantry');
  // v1.7.9 (owner, 7 Nov 2026): "Tủ có … ▾" on the row opens the pantry details in the row; not checked for 7 days → "kiểm tra lại?"
  const peek=()=>page.locator(`#main [data-action="pantry-peek"][data-id="${pid}"]`),rowTxt=()=>page.locator(`#main .shop-row:has(button[data-action="purchase-quantity"][data-id="${pid}"]) .shop-pantry`).innerText();
  const calc=()=>page.evaluate(`(()=>{const r=shopping(state,currentWeek(),...shopDates()).find(r=>r.id===${JSON.stringify(pid)});return{needed:r.needed,missing:r.missing,have:r.have}})()`);
  assert.match(await peek().evaluate((b:any)=>{const c=b.cloneNode(true);c.querySelectorAll('.sr-only').forEach((x:any)=>x.remove());return c.textContent.replace(/\s+/g,' ').trim()}),lang==='en'?/^Fridge 1 g ▾$/:/^Tủ lạnh 1 g ▾$/,`${label}: label is only the place and amount (owner: “chỉ nên để tủ lạnh xxx g”)`);assert.equal(await peek().locator('.shop-pantry-dot').count(),1,`${label}: never checked → small dot`);assert.match(await peek().textContent(),/cần kiểm tra lại|needs a check/,`${label}: said to screen readers`);assert.ok((await peek().boundingBox())!.height>=44,`${label}: 44 px`);
  assert.equal(await page.locator(`#pp-${pid}`).isVisible(),false,`${label}: folded at first`);await peek().click();await page.locator(`#pp-${pid}`).waitFor();assert.equal(await peek().getAttribute('aria-expanded'),'true');
  assert.match(await rowTxt(),lang==='en'?/Fridge · .*\n?.*not checked yet[\s\S]*pantry has .* → buy/:/Tủ lạnh · .*\n?.*chưa rõ ngày kiểm tra[\s\S]*tủ có .* → mua/,`${label}: lots, then need → buy`);{const g:any=await page.evaluate((id:string)=>{const box=document.querySelector(`#pp-${id}`)!.closest('.shop-pantry')!,b=box.querySelector('.shop-pantry-btn')!.getBoundingClientRect(),p=box.querySelector('.shop-pantry-panel')!.getBoundingClientRect(),o=box.getBoundingClientRect(),bs=[...box.querySelectorAll('.shop-pantry-actions .btn')],h=bs.map(x=>Math.round(x.getBoundingClientRect().height)),hit=bs.map(x=>{const a=getComputedStyle(x,'::after');return Math.round(x.getBoundingClientRect().height-parseFloat(a.top)-parseFloat(a.bottom))});return{open:box.classList.contains('open'),bl:Math.round(b.left-o.left),pl:Math.round(p.left-o.left),bw:Math.round(b.width-p.width),h,hit}},pid);
   assert.ok(g.open&&Math.abs(g.bl)<=2&&Math.abs(g.pl)<=2&&Math.abs(g.bw)<=2,`${label}: open = one box, label and details aligned (${JSON.stringify(g)})`);assert.ok(g.h.every((h:number)=>h===g.h[0]&&h<=34),`${label}: small chips of one height (${g.h})`);assert.ok(g.hit.every((h:number)=>h>=44),`${label}: each still a 44 px tap (${g.hit})`)}
  assert.equal(await page.locator(`#pp-${pid} [data-action="edit-stock"]`).count(),0,`${label}: no edit button in the row (Henry, 7 Nov)`);await textOk('pantry-peek');await shot('pantry-peek');
  await page.locator(`#main [data-action="pantry-still"][data-id="${pid}"]`).click();await page.waitForTimeout(200);assert.equal(await page.evaluate(`state.pantry.find(p=>p.id==='qa-pantry').checkedAt`),await page.evaluate('sydneyDate()'),`${label}: “Vẫn còn” records today`);assert.equal(await peek().locator('.shop-pantry-dot').count(),0,`${label}: no longer asks`);
  const before=await calc();assert.ok(before.have>0&&before.missing<before.needed);await page.locator(`#main [data-action="pantry-fullbuy"][data-id="${pid}"]`).click();await page.waitForTimeout(200);
  const full=await calc();assert.equal(full.have,0);assert.ok(Math.abs(full.missing-full.needed)<1e-9,`${label}: “Mua đủ” buys the full amount for this item only`);assert.match(await peek().textContent(),/mua đủ|buying full/);assert.equal(await page.locator(`#main .shop-row:has([data-action="pantry-peek"][data-id="${pid}"]) .shop-pantry.unused`).count(),1);
  await page.locator(`#main [data-action="pantry-fullbuy"][data-id="${pid}"]`).click();await page.waitForTimeout(200);assert.deepEqual(await calc(),before,`${label}: back to using the pantry`);
  assert.equal(await page.evaluate('state.pantry.some(p=>p.id===\'qa-pantry\'&&p.qty===1)'),true,`${label}: the pantry itself is untouched`);
  assert.match(await page.locator('#main [data-pantry-effect]').innerText(),lang==='en'?/Taking off \d+ items? the pantry has/:/Đang trừ \d+ món có trong tủ/,`${label}: the switch says what it does`);
  assert.equal(await page.locator('#main .pantry-cart-banner').count(),0,`${label}: no second pantry panel at the top (Henry, 7 Nov: removed, rows show it)`);
  const sw=page.locator('#main [data-pantry-deduct]');assert.equal(await sw.isChecked(),true);
  // v1.7.9 (owner 22:01): the switch sits in the Giỏ đồ nhà mình card, and the card no longer also says "Đã trừ tồn" (wrong when off)
  assert.equal(await sw.evaluate((e:any)=>!!e.closest('.card')?.querySelector('.stock-note')),true,`${label}: pantry switch inside the cart card`);assert.doesNotMatch(await page.locator('#main .stock-note').first().innerText(),/Đã trừ tồn|stock deducted/,`${label}: no second, always-on pantry line`);await sw.uncheck();await page.waitForTimeout(250);assert.match(await peek().textContent(),/không trừ|not taken off/,`${label}: off → full amounts`);assert.equal((await calc()).have,0);
  await page.locator('#main [data-pantry-deduct]').check();await page.evaluate(`state.pantry=state.pantry.filter(p=>p.id!=='qa-pantry');save();render()`);
  const halves=await page.evaluate(`(()=>{const m={recipes:[{category:'main'},{category:'main'}],attendance:{},servings:4};return m.recipes.map(r=>dishFactor(m,r))})()`);assert.deepEqual(halves,[1,1],'two mains: each in full');
  await page.evaluate(`view='planner';render();scrollTo(0,0)`);assert.match(await page.locator('#main .plan-day[open] .meal-facts').first().innerText(),lang==='en'?/\d+ people → ≈?[\d.,]+ portions|portions \(set by hand\)/:/\d+ người → ≈?[\d.,]+ suất|suất \(đặt tay\)/,`${label}: people → portions on the meal`)}
 // v1.7.8 (owner: “chỗ giỏ đồ đi chợ, phải cho option để xoá nguyên liệu”): × on an ingredient row takes it off the list
 {await page.evaluate(`view='shopping';render();scrollTo(0,0)`);const x=page.locator('#main .shop-purchase-row .row-skip').first();await x.waitFor();const sid=await x.getAttribute('data-id');const bx=(await x.boundingBox())!;assert.ok(bx.height>=44&&bx.width>=44,`${label}: × is 44 px`);
  // v1.7.9: × asks first and names the dishes; Keep does nothing; after removing, “Hoàn tác” brings it back
  await x.click();await page.locator('#modal-root [data-action="skip-row-confirm"]').waitFor();assert.match(await page.locator('#modal-root').innerText(),lang==='en'?/used in|No dish/:/dùng cho|Không có món/,`${label}: says which dishes use it`);await textOk('skip-confirm');
  // CI 6 Nov 2026 (language audit): in English the sheet used the Vietnamese name ("Take Tôm off the list?")
  {const en=await page.evaluate(`INGREDIENT_EN[${JSON.stringify(sid)}]||''`),vi=await page.evaluate(`INGREDIENTS[${JSON.stringify(sid)}][0]`),head=await page.locator('#modal-title').innerText();
   if(lang==='en'&&en)assert.ok(head.includes(en),`${label}: the sheet names ${en} in English (${head})`);if(lang==='vi')assert.ok(head.includes(vi),`${label}: the sheet names ${vi}`)}if(size==='mobile')await shot('skip-confirm');
  await page.locator('#modal-root [data-action="close-modal"]').first().click();await page.waitForTimeout(200);assert.equal(await page.evaluate(`!!currentWeek().skip[${JSON.stringify(sid)}]`),false,'Keep leaves it');
  await page.locator(`#main .row-skip[data-id="${sid}"]`).click();await page.locator('#modal-root [data-action="skip-row-confirm"]').click();await page.waitForTimeout(250);assert.equal(await page.locator(`#main .shop-purchase-row button[data-action="purchase-quantity"][data-id="${sid}"]`).count(),0,`${label}: row removed`);assert.equal(await page.evaluate(`!!currentWeek().skip[${JSON.stringify(sid)}]`),true);
  const undo=page.locator('#undo-bar button');await undo.waitFor();{const en=await page.evaluate(`INGREDIENT_EN[${JSON.stringify(sid)}]||''`),bar=await page.locator('#undo-bar').innerText();if(lang==='en'&&en)assert.ok(bar.includes(en),`${label}: the undo bar names ${en} in English (${bar})`)}assert.ok((await undo.boundingBox())!.height>=44);if(size==='mobile')await shot('undo-bar');await undo.click();await page.waitForTimeout(250);assert.equal(await page.evaluate(`!!currentWeek().skip[${JSON.stringify(sid)}]`),false,'Hoàn tác brings it back');assert.equal(await page.locator(`#main .shop-purchase-row button[data-action="purchase-quantity"][data-id="${sid}"]`).count(),1)}
 // v1.7.9 (owner: "khi ấn vào noti thì nó đưa đến chỗ cần để xem"): a notification link #planner?d=… opens that day
 // the fallback path (service worker message) takes the same links, including the day; anything else is refused
 assert.deepEqual(await page.evaluate(`['/#planner?d=2026-11-07','/#today','/#pantry','/#planner?d=bad','https://x.test/#today','/#studio','/#today?d=2026-11-07&x=1'].map(pushOpenHash)`),['planner?d=2026-11-07','today','pantry',null,null,null,null]);
 {const d=await page.evaluate(`addDays(sydneyDate(),1)`);await page.evaluate(`location.hash='planner?d=${d}'`);await page.waitForTimeout(400);
  assert.equal(await page.evaluate('view'),'planner');assert.equal(await page.evaluate('selectedDate'),d);assert.equal(await page.locator(`#main details.plan-day[data-plan-day="${d}"]`).evaluate((e:any)=>e.open),true,`${label}: the linked day is open`);
  await page.evaluate(`location.hash='shopping'`);await page.waitForTimeout(200)}
 // v1.7.9 (owner: "không có số lượng và đơn vị… chỗ màu nâu là gì?"): extra items ask amount and unit separately; the empty
 // pantry note stays hidden
 {await page.evaluate(`view='shopping';render();scrollTo(0,0)`);await page.evaluate(`document.querySelector('[data-action="add-extra"]').click()`);await page.locator('#extra-amount').waitFor();
  assert.equal(await page.locator('#extra-pantry-hint').isVisible(),false,`${label}: empty pantry note hidden`);assert.equal(await page.locator('#extra-unit option').count()>=10,true);await textOk('extra-form');if(size==='mobile')await shot('extra-form');
  await page.fill('#extra-name','Sữa chua QA');await page.fill('#extra-amount','2');await page.selectOption('#extra-unit','hộp');await page.locator('#modal-root [data-action="submit-form"][data-id="extra-form"]').click();await page.waitForTimeout(300);
  assert.equal(await page.evaluate(`currentWeek().extras.find(e=>e.name==='Sữa chua QA')?.qty`),'2 hộp',`${label}: stored as “2 hộp”`);await page.evaluate(`currentWeek().extras=currentWeek().extras.filter(e=>e.name!=='Sữa chua QA');save();render()`)}
 // v1.7.9: the bought tick sits on the name's line; rounding keeps the row where it was on screen
 {await page.evaluate(`view='shopping';render()`);const row=page.locator('#main .shop-purchase-row').nth(2);await row.scrollIntoViewIfNeeded();const tick=await row.locator('input.check').boundingBox(),name=await row.locator('.item-label').boundingBox();assert.ok(Math.abs((tick!.y+tick!.height/2)-(name!.y+Math.min(name!.height,48)/2))<30,`${label}: tick on the name line`);
  // v1.7.9 (owner 22:01: "nút tick và tên nằm quá sát nhau"): ≥ 14 px between the tick square and the picture, ≥ 12 px to the name
  {const g:any=await row.evaluate((r:any)=>{const b=(e:any)=>e?.getBoundingClientRect();const t=b(r.querySelector('.large-check-target')),p=b(r.querySelector('.item-label .ingredient-art, .item-label .pp-wrap')),lab=r.querySelector('.item-label'),tn=lab&&[...lab.childNodes].find((c:any)=>c.nodeType===3&&c.nodeValue.trim());let nr:any=null;if(tn){const rg=document.createRange();rg.selectNodeContents(tn);nr=rg.getClientRects()[0]||null}return{tp:p&&t?p.left-t.right:null,pn:p&&nr?nr.left-p.right:null}});
   assert.ok(g.tp!==null&&g.pn!==null,`${label}: tick, picture and name measured`);assert.ok(g.tp>=14,`${label}: tick ↔ picture gap ${g.tp}`);assert.ok(g.pn>=12,`${label}: picture ↔ name gap ${g.pn}`)}
  const up=row.locator('.qty-round[data-qr-dir="up"]');if(await up.count()){const qid=await up.getAttribute('data-qr-id'),btn=()=>page.locator(`#main button[data-action="purchase-quantity"][data-id="${qid}"]`)/* the amount; the round buttons may move up next to a shorter amount */;const y0=(await btn().boundingBox())!.y;await up.click();await page.waitForTimeout(250);const y1=(await btn().boundingBox())!.y;assert.ok(Math.abs(y1-y0)<6,`${label}: the row's amount stays put after rounding (${y0} → ${y1})`)}}
 // v1.7.9 (owner, 6 Nov 2026: "ấn vào hình của ingredients thì hình phóng to lên"): a tap on a shopping picture opens it large
 {await page.evaluate(`view='shopping';render()`);const pic=page.locator('#main .shop-purchase-row .item-label .ingredient-art').first();await pic.scrollIntoViewIfNeeded();
  const nm=(await pic.evaluate((e:any)=>[...e.closest('.item-label').childNodes].find((n:any)=>n.nodeType===3&&n.nodeValue.trim())?.nodeValue||'')).trim();await pic.click();
  const z=page.locator('#modal-root .pic-zoom');await z.waitFor({timeout:3000});const zb=(await z.locator('.pic-zoom-art').boundingBox())!;assert.ok(zb.width>=200&&zb.height>=200,`${label}: the picture is large (${zb.width})`);
  assert.equal((await page.locator('#modal-root .modal h2, #modal-root .modal-title, #modal-root h2').first().innerText()).trim(),nm,`${label}: the sheet is named after the ingredient`);
  assert.equal(await page.locator('#modal-root [data-action="purchase-quantity"]').count(),0,`${label}: the picture tap did not open the amounts`);
  const det=page.locator('#modal-root [data-action="ingredient-detail"]');assert.ok((await det.boundingBox())!.height>=44,`${label}: 44 px button to the amounts`);await textOk('picture-zoom');await shot('picture-zoom');
  await det.click();await page.locator('#modal-root [data-action="purchase-quantity"]').first().waitFor({timeout:3000});await page.evaluate('closeModal()');
  if(size==='mobile'){await page.route('https://photos.test/**',(r:any)=>r.fulfill({body:fs.readFileSync(path.join(root,'dist/artwork/cells/i48.webp')),contentType:'image/webp'}));
   const ok=await page.evaluate(`(()=>{const id=document.querySelector('#main .shop-purchase-row .item-label').dataset.id,it=ppItemFor(id);if(!it)return false;ppData={at:Date.now(),items:{[it.id]:{photo:'https://photos.test/p.webp',retailer:'coles'}}};render();return true})()`);
   if(ok){const pw=page.locator('#main .shop-purchase-row .item-label .pp-wrap').first();await pw.scrollIntoViewIfNeeded();await pw.click();await page.locator('#modal-root .pic-zoom img.pp-img').waitFor({timeout:3000});
    assert.match(await page.locator('#modal-root .pic-zoom figcaption').innerText(),lang==='en'?/Product photo from Coles/:/Ảnh sản phẩm của Coles/,`${label}: the photo's supermarket is named`);await shot('picture-zoom-photo');await page.evaluate('closeModal()')}
   await page.evaluate(`ppData={at:Date.now(),items:{}};render()`)}}
 for(const v of ['shopping','recipes','pantry','expenses','insights','products']){await page.evaluate(`view=${JSON.stringify(v)};render();scrollTo(0,0)`);await textOk(v);if(v==='shopping')await shot('shopping')}
 // 7. voice sheet (owner: “nút hold to talk nằm quá sâu phía dưới”): the talk button sits under the status, above the words box
 await page.evaluate('closeModal();voiceModal()');await page.locator('#voice-text').waitFor();
 const pos=await page.evaluate(()=>{const r=(s:string)=>document.querySelector(s)!.getBoundingClientRect();return{btn:r('#voice-continue').top,box:r('#voice-text').top,bottom:r('#voice-continue').bottom}});
 assert.ok(pos.btn<pos.box,`${label}: talk button above the words box`);assert.ok(pos.bottom<viewport.height,`${label}: talk button visible without scrolling (${Math.round(pos.bottom)}px)`);
 await textOk('voice');await shot('voice');await page.evaluate('closeModal()');
 // 8. dish pictures show the whole plate (square picture fits inside the 4:3 card frame instead of being cut)
 await page.evaluate(`view='recipes';render();scrollTo(0,0)`);await page.locator('[data-fm="samples"]').first().click();await page.locator('#main .lib-card .lib-card-img .food-illustration').first().waitFor({timeout:15000});
 const fit=await page.locator('#main .lib-card .lib-card-img').first().evaluate((f:any)=>{const a=f.querySelector('.food-illustration').getBoundingClientRect(),b=f.getBoundingClientRect();return{inside:a.top>=b.top-0.5&&a.bottom<=b.bottom+0.5&&a.left>=b.left-0.5&&a.right<=b.right+0.5,square:Math.abs(a.width-a.height)<1}});
 assert.deepEqual(fit,{inside:true,square:true},`${label}: dish picture whole inside its card frame`);if(size==='mobile')await shot('recipes');
 // 6. connection label in the chosen language (it said “Online” in Vietnamese)
 const net=await page.locator('#network-status').innerText().catch(()=>'');if(net.trim())assert.equal(net.trim(),lang==='en'?'Online':'Trực tuyến',`${label}: connection label`);
 assert.deepEqual(errors,[],label+': no page errors');await ctx.close()}
await browser.close();console.log('PASS v1.7.6: menu week from the family’s chosen day, whole plate on dish cards, talk button in the middle of the voice sheet, calendar away shown in “Who is eating?” and lifted when back home, “Chi tiêu” translated with a member called Chi, More / packed-lunch names on one line, weekly menu readable on desktop, no text cut off or word broken on 9 screens at 320 / 375 / 820 / 1280 in VI and EN')})().catch((e:any)=>{console.error(e);process.exit(1)});
