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
   const toggle=async(t:string,on:boolean)=>{await td2().locator('.pd-meals').click();const c=page.locator(`#modal-root [data-plan-meal-toggle="${t}"]`);await c.waitFor();assert.equal(await page.locator('#modal-root [data-plan-meal-toggle]').count(),5,'all five meals listed');
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
  const rowTxt=()=>page.locator(`#main .shop-row:has(button[data-action="purchase-quantity"][data-id="${pid}"]) .item-label`).innerText();assert.match(await rowTxt(),lang==='en'?/pantry has/:/tủ có .* → mua/,`${label}: the row says the pantry was taken off`);
  const sw=page.locator('#main [data-pantry-deduct]');assert.equal(await sw.isChecked(),true);await sw.uncheck();await page.waitForTimeout(250);assert.doesNotMatch(await rowTxt(),/tủ có|pantry has/,`${label}: off → full amounts`);
  await page.locator('#main [data-pantry-deduct]').check();await page.evaluate(`state.pantry=state.pantry.filter(p=>p.id!=='qa-pantry');save();render()`);
  const halves=await page.evaluate(`(()=>{const m={recipes:[{category:'main'},{category:'main'}],attendance:{},servings:4};return m.recipes.map(r=>dishFactor(m,r))})()`);assert.deepEqual(halves,[1,1],'two mains: each in full');
  await page.evaluate(`view='planner';render();scrollTo(0,0)`);assert.match(await page.locator('#main .plan-day[open] .meal-facts').first().innerText(),lang==='en'?/\d+ people → ≈?[\d.,]+ portions|portions \(set by hand\)/:/\d+ người → ≈?[\d.,]+ suất|suất \(đặt tay\)/,`${label}: people → portions on the meal`)}
 // v1.7.8 (owner: “chỗ giỏ đồ đi chợ, phải cho option để xoá nguyên liệu”): × on an ingredient row takes it off the list
 {await page.evaluate(`view='shopping';render();scrollTo(0,0)`);const x=page.locator('#main .shop-purchase-row .row-skip').first();await x.waitFor();const sid=await x.getAttribute('data-id');const bx=(await x.boundingBox())!;assert.ok(bx.height>=44&&bx.width>=44,`${label}: × is 44 px`);
  await x.click();await page.waitForTimeout(250);assert.equal(await page.locator(`#main .shop-purchase-row button[data-action="purchase-quantity"][data-id="${sid}"]`).count(),0,`${label}: row removed`);assert.equal(await page.evaluate(`!!currentWeek().skip[${JSON.stringify(sid)}]`),true);
  await page.evaluate(`delete currentWeek().skip[${JSON.stringify(sid)}];save();render()`)}
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
