// v1.7.12 — owner feedback 8 Nov 2026 (Sydney time) after v1.7.11:
//  1. "Nút round up và down không đồng đều" — the amount and its two round buttons sit the same way on every row and size
//  2. "Từ nút tất cả ấn sang ngăn mát… bị nhảy" / 3. "click vào trừ đồ trong tủ cũng bị nhảy" — a redraw that makes the page
//     shorter must not move the tapped control (rule 24), with the browser's scroll anchoring off as on iPhone Safari
//  4. "Nút xong không được căn chỉnh và không nằm ở giữa" — a lone sheet button is centred
//  5. "Chỗ giải phóng… cái nút hơi khó nhìn và dài dòng" — one short button under the words
//  6. Cook once for several meals (pop-up: ask when “Đã nấu” is tapped)
//  7. Guests — out of the way until needed: “Ai ăn bữa này?” on Today and “Có khách” on the week menu; several groups with
//     names, regular guests, one or several meals (pop-ups 8 Nov 2026)
// 320×740, 375×812, 430×932, 820×1100, 1280×800; VI (EN for the cook-ahead sheet). Chromium viewport simulation, not devices.
// Screenshots: docs/reviews/v1.7.12/.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const origin='https://kitchen.test',out='docs/reviews/v1.7.12';mkdirSync(out,{recursive:true});
const mime:any={'.js':'application/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'};
const sizes:any={narrow:{width:320,height:740},mobile:{width:375,height:812},wide:{width:430,height:932},tablet:{width:820,height:1100},desktop:{width:1280,height:800}};
const MEMBERS=[['m-phu','Ba Phú',1],['m-mi','Mẹ Mi',1],['m-chi','Chi',.75],['m-tien','Tiên',.75]];
(async()=>{
 const browser=await chromium.launch(process.env.BEP_CHROMIUM?{executablePath:process.env.BEP_CHROMIUM}:{});
 try{
  for(const [size,lang] of [['mobile','vi'],['narrow','vi'],['wide','vi'],['tablet','vi'],['desktop','en']] as const){
   const label=`${size} ${lang}`;
   const context=await browser.newContext({locale:'vi-VN',viewport:sizes[size],serviceWorkers:'block',reducedMotion:'reduce',timezoneId:'Australia/Sydney'});
   await context.addInitScript((lang:string)=>{if(sessionStorage.getItem('qa-init'))return;sessionStorage.setItem('qa-init','1');localStorage.setItem('bep-local-locked','yes');localStorage.setItem('guest/bep-language',lang)},lang);
   const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route(origin+'/**',async(r:any)=>{const u=new URL(r.request().url());if(u.pathname.startsWith('/.netlify/'))return r.fulfill({status:401,json:{error:'no'}});if(u.pathname==='/startup-scripts.json')return r.fulfill({json:JSON.parse(readFileSync('dist/startup-scripts.json','utf8'))});const f=resolve('dist',u.pathname==='/'?'index.html':u.pathname.slice(1));try{await r.fulfill({contentType:mime[extname(f)]||'application/octet-stream',body:readFileSync(f)})}catch{await r.fulfill({status:404,body:''})}});
   await page.goto(origin+'/#today',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#main h1'),null,{timeout:20000});
   const E=(s:string)=>page.evaluate(s) as Promise<any>;
   // iPhone Safari has no scroll anchoring: test without it, so a jump cannot be hidden by Chrome's own correction
   await page.addStyleTag({content:'*{overflow-anchor:none!important}'});
   const today:string=await E(`(()=>{state.preferences.onboardingComplete=true;state.members=${JSON.stringify(MEMBERS)}.map(([id,name,weight])=>({id,name,weight,emoji:''}));familyGenerate(state,weekStart,{sourceMode:'library'});for(const wk of Object.values(state.weeks))for(const day of Object.values(wk.days))for(const m of Object.values(day))if(m&&m.attendance)for(const p of state.members)m.attendance[p.id]??='home';state.pantry=[];save();if(typeof closeModal==='function')closeModal();weekStart=planStartOf(state,sydneyDate());selectedDate=sydneyDate();view='shopping';render();return sydneyDate()})()`);
   const shot=(name:string)=>page.screenshot({path:`${out}/${name}-${lang}-${sizes[size].width}x${sizes[size].height}.png`});
   const noOverflow=async(where:string)=>{const ow=await E('document.documentElement.scrollWidth-innerWidth');assert.ok(ow<=1,`${label} ${where}: horizontal overflow ${ow}`)};
   // the control stays where it was after the tap (rule 24); the tap itself is dispatched in place, without the test tool scrolling
   const stays=async(what:string,sel:string,place:number)=>{const top=await E(`document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect().top+scrollY`);await E(`scrollTo(0,${top}-${place})`);await page.waitForTimeout(150);
    const y0=await E(`document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect().top`);await E(`document.querySelector(${JSON.stringify(sel)}).click()`);await page.waitForTimeout(800);
    const y1=await E(`document.querySelector(${JSON.stringify(sel)})?.getBoundingClientRect().top`);assert.ok(Math.abs(y1-y0)<=2,`${label}: ${what} stays put (${Math.round(y0)} → ${Math.round(y1)})`)};

   // 1. round buttons: under the amount on every row, the same width as the amount, two equal halves, one arrow each
   {await page.waitForSelector('#main .qty-round-pair');const rows:any[]=await E(`[...document.querySelectorAll('#main .shop-row .qty-cell')].filter(c=>c.querySelector('.qty-round-pair')).map(c=>{const a=c.querySelector('button[data-action="purchase-quantity"]').getBoundingClientRect(),q=c.querySelector('.qty-round-pair').getBoundingClientRect(),bs=[...c.querySelectorAll('.qty-round')].map(b=>b.getBoundingClientRect());return{below:q.top>=a.bottom-1,sameW:Math.abs(q.width-a.width)<=1,left:Math.abs(q.left-a.left)<=1,halves:Math.abs(bs[0].width-bs[1].width)<=1,tall:bs.every(b=>b.height>=44&&b.width>=44),arrows:[...c.querySelectorAll('.qty-round')].every(b=>!b.querySelector('.btn-art')||getComputedStyle(b.querySelector('.qr-dir')).display==='none')}})`);
    assert.ok(rows.length>=3,`${label}: rows with round buttons (${rows.length})`);
    for(const k of ['below','sameW','left','halves','tall','arrows'])assert.ok(rows.every(r=>r[k]),`${label}: round buttons ${k} on every row ${JSON.stringify(rows.map(r=>r[k]))}`);
    await noOverflow('shopping');await page.locator('#main .qty-round-pair').nth(1).scrollIntoViewIfNeeded();await shot('round-buttons')}

   // 3. Trừ đồ đang có trong Tủ: stock that covers most of the list, so the list gets much shorter when it is ticked
   {await E(`(()=>{const [s,e]=shopDates();const rows=shopping(state,currentWeek(),s,e);state.pantry=rows.map((r,n)=>({id:'qa-'+n,ingredient:r.id,qty:r.needed*3+1,place:'fridge',expiry:''}));state.preferences.pantryDeduct=false;save();render()})()`);
    for(const place of [20,140])for(let i=0;i<2;i++)await stays(`“Trừ đồ” tick ${i?'off':'on'} near ${place}px`,'#main [data-pantry-deduct]',place);
    await E(`state.preferences.pantryDeduct=true;save();render();scrollTo(0,0)`)}

   // 4. a lone sheet button is centred (Đồ trong tủ → Xong)
   {await E(`scrollTo(0,0)`);await E(`[...document.querySelectorAll('#main button')].find(b=>/Đồ trong tủ|In stock|Pantry \\(/.test(b.innerText)||/pantry/i.test(b.dataset.action||''))?.click()`);await page.waitForSelector('#modal-root .modal-footer');
    const g:any=await E(`(()=>{const f=document.querySelector('#modal-root .modal-footer'),bs=[...f.children].filter(c=>c.matches('.btn,button,a.btn')),m=document.querySelector('#modal-root .modal').getBoundingClientRect(),b=bs[0].getBoundingClientRect();return{n:bs.length,off:(b.left+b.right)/2-(m.left+m.right)/2,visible:b.bottom<=innerHeight+1&&b.top>=0}})()`);
    assert.equal(g.n,1,`${label}: the stock sheet has one footer button`);assert.ok(Math.abs(g.off)<=1.5,`${label}: Xong is centred (${g.off.toFixed(1)} px off)`);assert.ok(g.visible,`${label}: Xong visible without scrolling`);
    await shot('done-centred');await E('closeModal()')}

   // 2. pantry chips: few things in the fridge, many on the shelf, chip near the top of the screen
   {await E(`(()=>{const ids=Object.keys(INGREDIENTS).filter(id=>!/^family-/.test(id));state.pantry=ids.slice(0,36).map((id,n)=>({id:'qa-p'+n,ingredient:id,qty:500,place:n<1?'fridge':n<2?'freezer':'dry',expiry:''}));save();view='pantry';pantryFilter='all';render();scrollTo(0,0)})()`);
    for(const id of ['fridge','all','freezer','dry','all'])await stays(`pantry chip ${id}`,`#main [data-action="pantry-filter"][data-id="${id}"]`,20);
    await stays('pantry chip fridge (mid-screen)','#main [data-action="pantry-filter"][data-id="fridge"]',300);
    // the spacer that kept it there goes when the person scrolls back up, and when the screen changes
    await E('scrollTo(0,0)');await page.waitForTimeout(100);assert.ok(await E(`parseFloat(document.getElementById('keep-place-spacer')?.style.height||'0')`)<=1,`${label}: spacer gone after scrolling up`);
    await E(`pantryFilter='all';render()`);await noOverflow('pantry');await shot('pantry-chips')}

   // 5. use-it-up card: the words full width, one short button and the pantry link underneath
   {await E(`view='today';render();scrollTo(0,0)`);const d=page.locator('#main details:has(.fridge-rescue-card)');if(await d.count())await d.first().evaluate((e:any)=>e.open=true);
    const card=page.locator('#main .fridge-rescue-card').first();await card.waitFor();const f:any=await card.evaluate((c:any)=>{const h=c.querySelector('h3').getBoundingClientRect(),b=c.querySelector('[data-fm="use-pantry"]'),r=b.getBoundingClientRect(),a=c.querySelector('a[href="#pantry"]').getBoundingClientRect(),cr=c.getBoundingClientRect();return{under:r.top>=h.bottom-1,text:b.innerText.trim(),h:r.height,linkH:a.height,wide:h.width>=cr.width*.7}});
    assert.ok(f.under,`${label}: the use-it-up button sits under the words`);assert.ok(f.wide,`${label}: the words use the card width`);assert.ok(f.text.length<=22,`${label}: short button label (${f.text})`);assert.ok(f.h>=44&&f.linkH>=44,`${label}: touch targets ≥ 44 px`);
    await card.scrollIntoViewIfNeeded();await shot('use-it-up')}

   // 6. cook once for several meals: today's dinner dish also in tomorrow's lunch
   {const tomorrow:string=await E('addDays(sydneyDate(),1)');
    await E(`(()=>{const src=mealAt(state,${JSON.stringify(today)},'dinner'),later=mealAt(state,${JSON.stringify(tomorrow)},'lunch')||(ensureWeek(state,planStartOf(state,${JSON.stringify(tomorrow)})),mealAt(state,${JSON.stringify(tomorrow)},'lunch'));src.recipes=[clone(state.recipes.find(r=>r.category==='main'&&r.ingredients.length))]/* an everyday dish (the weekend feast has its own batch) */;delete src.recipes[0].batchId;for(const p of state.members){src.attendance[p.id]='home';later.attendance[p.id]='home'}src.cooked=false;src.consumed=[];later.cooked=false;later.consumed=[];later.recipes=[clone(src.recipes[0])];
     const ids=[...new Set(src.recipes.concat(later.recipes).flatMap(r=>r.ingredients.map(i=>i.id)))];state.pantry=ids.map((id,n)=>({id:'qa-c'+n,ingredient:id,qty:100000,place:'fridge',expiry:''}));window.__qaBefore=Object.fromEntries(ids.map(id=>[id,stock(state,id)]));save();weekStart=planStartOf(state,${JSON.stringify(today)});selectedDate=${JSON.stringify(today)};view='today';attendanceType='dinner';render()})()`);
    const cook=page.locator(`#main [data-fm="cook-meal"][data-date="${today}"][data-type="dinner"]`);await cook.scrollIntoViewIfNeeded();await cook.click();
    const sheet=page.locator('#modal-root .cook-ahead-list');await sheet.waitFor();
    const opt:any=await E(`[...document.querySelectorAll('#modal-root [data-cook-ahead]')].map(x=>({...JSON.parse(x.value),checked:x.checked,text:x.closest('label').innerText}))`);
    assert.ok(opt.some((o:any)=>o.date===tomorrow&&o.type==='lunch'&&o.checked),`${label}: tomorrow's lunch is offered, ticked`);
    const foot:any=await E(`(()=>{const bs=[...document.querySelectorAll('#modal-root .modal-footer > .btn')];const r=bs.map(b=>b.getBoundingClientRect());return{n:bs.length,sameRow:Math.abs(r[0].top-r[1].top)<=1,sameSize:Math.abs(r[0].width-r[1].width)<=1,art:!!bs[1].querySelector('.btn-art'),labels:bs.map(b=>b.innerText.trim())}})()`);
    assert.ok(foot.n===2&&foot.sameRow&&foot.sameSize,`${label}: two footer buttons, side by side, same size ${JSON.stringify(foot)}`);assert.ok(foot.art,`${label}: “Nấu luôn” carries its drawing (rule 27)`);
    await noOverflow('cook-ahead sheet');await shot('cook-ahead-sheet');
    await page.locator('#modal-root [data-fm="cook-ahead"]:not([data-only])').click();await page.waitForFunction(()=>!document.querySelector('#modal-root .cook-ahead-list'));
    const st:any=await E(`(()=>{const src=mealAt(state,${JSON.stringify(today)},'dinner'),later=mealAt(state,${JSON.stringify(tomorrow)},'lunch');return{src:src.cooked,links:src.aheadFor?.length||0,laterCooked:later.cooked,ahead:later.recipes.every(r=>r.cookedAhead),need:Object.keys(mealIngredients(later,state)).length}})()`);
    assert.ok(st.src&&st.links===1,`${label}: tonight cooked, linked to tomorrow`);assert.ok(st.ahead&&st.laterCooked&&st.need===0,`${label}: tomorrow's lunch counts as cooked ahead, nothing left to buy or take ${JSON.stringify(st)}`);
    // tomorrow's card says so
    await E(`weekStart=planStartOf(state,${JSON.stringify(tomorrow)});selectedDate=${JSON.stringify(tomorrow)};view='today';attendanceType='lunch';render();scrollTo(0,0)`);
    const note=page.locator('#main .cooked-ahead-note').first();await note.waitFor();assert.match(await note.innerText(),lang==='en'?/Cooked ahead/:/Đã nấu sẵn/,`${label}: the later meal shows “cooked ahead”`);await note.scrollIntoViewIfNeeded();await shot('cooked-ahead-note');
    // undo on tonight gives everything back
    await E(`weekStart=planStartOf(state,${JSON.stringify(today)});selectedDate=${JSON.stringify(today)};view='today';attendanceType='dinner';render()`);
    const undo=page.locator(`#main [data-fm="cook-meal"][data-date="${today}"][data-type="dinner"]`);await undo.scrollIntoViewIfNeeded();await undo.click();await page.waitForTimeout(300);
    const back:any=await E(`(()=>{const later=mealAt(state,${JSON.stringify(tomorrow)},'lunch');return{diff:Object.entries(window.__qaBefore).filter(([id,q])=>Math.abs(stock(state,id)-q)>.11).map(([id])=>id),later:later.cooked,marks:later.recipes.some(r=>r.cookedAhead)}})()`);
    assert.deepEqual(back.diff,[],`${label}: undo gives back every ingredient`);assert.ok(!back.later&&!back.marks,`${label}: undo reopens tomorrow's lunch`);
    // “Chỉ bữa này” keeps the old behaviour: only tonight is cooked
    await page.locator(`#main [data-fm="cook-meal"][data-date="${today}"][data-type="dinner"]`).click();await sheet.waitFor();await page.locator('#modal-root [data-fm="cook-ahead"][data-only="1"]').click();await page.waitForTimeout(300);
    assert.equal(await E(`(()=>{const later=mealAt(state,${JSON.stringify(tomorrow)},'lunch');return mealAt(state,${JSON.stringify(today)},'dinner').cooked&&!later.cooked&&!later.recipes.some(r=>r.cookedAhead)})()`),true,`${label}: “Chỉ bữa này” cooks only tonight`)}

   // 7. guests (owner, 8 Nov 2026 — pop-ups: guests with a name; “nút thêm khách nên để gọn hơn, chỉ hiện khi cần”; several
   //    families or people; regular guests; today at short notice or a few days ahead)
   {const tomorrow:string=await E('addDays(sydneyDate(),1)');
    const T=await E(`(()=>{for(const w of Object.values(state.weeks))for(const day of Object.values(w.days))for(const m of Object.values(day))if(m&&typeof m==='object')delete m.guests;delete state.guestBook;const day=ensureWeek(state,planStartOf(state,sydneyDate())).days[sydneyDate()],t=MEAL_TYPES.find(x=>x!=='dinner'&&fmMealOn(day,x));const m=day[t];m.cooked=false;m.consumed=[];m.servings=null;for(const p of state.members)m.attendance[p.id]='home';if(!m.recipes.length)m.recipes=[clone(state.recipes.find(r=>r.category==='main'&&r.ingredients.length))];save();weekStart=planStartOf(state,sydneyDate());selectedDate=sydneyDate();view='today';attendanceType=t;render();scrollTo(0,0);window.__qaBase=mealServings(m,state);return t})()`);
    // out of the way: no guest button on meal cards while nobody is coming
    assert.equal(await page.locator('#main .family-meal-card [data-fm="guests"]').count(),0,`${label}: meal cards have no guest button without guests`);
    // one button (owner: “khách đột xuất vẫn là khách nên chỉ để trong một nút có khách”): Today, next to “Lịch tháng”
    assert.equal(await page.locator('#main [data-fm="guests"]:not(.meal-guest-line)').count(),1,`${label}: exactly one guest button on Today`);
    assert.equal(await page.locator('#main .attendance .guest-row').count(),0,`${label}: no guest row in “Ai ăn bữa này?”`);
    const add=page.locator('#main .guest-shortcut');assert.ok(await add.evaluate((b:any)=>b.previousElementSibling?.classList.contains('calendar-shortcut')),`${label}: “Có khách” sits next to “Lịch tháng”`);
    assert.equal(await add.getAttribute('data-type'),T,`${label}: it opens on the next meal not cooked yet`);await add.scrollIntoViewIfNeeded();assert.ok((await add.boundingBox())!.height>=44,`${label}: “Có khách” ≥ 44 px`);await add.click();await page.locator('#modal-root .guest-group').first().waitFor();
    const art:any=await E(`[...document.querySelectorAll('#modal-root [data-fm="guest-step"],#modal-root [data-fm="guest-remove"]')].map(b=>!!b.querySelector('.btn-art')&&!b.innerText.trim()&&b.getBoundingClientRect().width>=44&&b.getBoundingClientRect().height>=44)`);
    assert.ok(art.length===5&&art.every(Boolean),`${label}: − / + / × drawn, no leftover symbol, ≥ 44 px ${JSON.stringify(art)}`);
    const step=(i:number,k:string,d:number)=>page.locator(`#modal-root [data-fm="guest-step"][data-i="${i}"][data-k="${k}"][data-d="${d}"]`).click();
    await step(0,'adults',1);await step(0,'kids',1);await page.fill('#modal-root [data-guest-name="0"]','Nhà anh Tuấn');
    await page.locator('#modal-root [data-fm="guest-add"]').click();await page.fill('#modal-root [data-guest-name="1"]','Chị Lan');
    await page.locator('#modal-root [name="to-date"]').fill(tomorrow);await page.locator('#modal-root [name="to-date"]').dispatchEvent('change');await page.locator('#modal-root [name="to-type"]').selectOption('breakfast');
    assert.match(await page.locator('#guest-total').innerText(),lang==='en'?/Adds 3\.5 portions per meal/:/Thêm 3,5 suất mỗi bữa/,`${label}: the sheet adds up the portions`);
    const meals=await page.locator('#guest-meals').innerText();assert.match(meals,lang==='en'?/\d+ meals?:/:/\d+ bữa:/,`${label}: the sheet lists the meals (${meals})`);
    const foot:any=await E(`(()=>{const bs=[...document.querySelectorAll('#modal-root .modal-footer > .btn')],r=bs.map(b=>b.getBoundingClientRect());return{n:bs.length,row:Math.abs(r[0].top-r[1].top)<=1,size:Math.abs(r[0].width-r[1].width)<=1,art:bs.every(b=>!!b.dataset.art&&b.querySelectorAll('svg').length===1)}})()`);
    assert.ok(foot.n===2&&foot.row&&foot.size&&foot.art,`${label}: Đóng / Lưu side by side, same size, drawn (rule 25) ${JSON.stringify(foot)}`);
    await noOverflow('guest sheet');await shot('guests-sheet');
    await page.locator('#modal-root [data-fm="guests-save"]').click();await page.waitForFunction(()=>!document.querySelector('#modal-root .guest-group'));
    const g:any=await E(`(()=>{const range=mealsBetween(state,sydneyDate(),${JSON.stringify(T)},${JSON.stringify(tomorrow)},'breakfast').filter(x=>{const d=ensureWeek(state,planStartOf(state,x.date)).days[x.date];return fmMealOn(d,x.type)});const open=range.filter(x=>!mealAt(state,x.date,x.type).cooked),cooked=range.filter(x=>mealAt(state,x.date,x.type).cooked);const m=mealAt(state,sydneyDate(),${JSON.stringify(T)});return{n:open.length,all:open.every(x=>guestGroups(mealAt(state,x.date,x.type)).length===2),cookedKept:cooked.every(x=>!mealAt(state,x.date,x.type).guests),groups:m.guests,more:mealServings(m,state)-window.__qaBase,book:(state.guestBook||[]).map(b=>b.name)}})()`);
    assert.ok(g.n>=2&&g.all,`${label}: guests on every meal from today to tomorrow breakfast ${JSON.stringify(g)}`);assert.ok(g.cookedKept,`${label}: cooked meals left as they were`);
    assert.deepEqual(g.groups,[{name:'Nhà anh Tuấn',adults:2,kids:1},{name:'Chị Lan',adults:1,kids:0}],`${label}: two groups saved with their names`);assert.ok(Math.abs(g.more-3.5)<1e-9,`${label}: 3 adults + 1 child add 3.5 portions`);
    assert.deepEqual(g.book,['Nhà anh Tuấn','Chị Lan'],`${label}: both remembered as regular guests`);
    // the meal card shows one short line, which opens the same sheet
    const line=page.locator(`#main .family-meal-card .meal-guest-line[data-type="${T}"]`).first();await line.waitFor();const txt=await line.innerText();
    assert.match(txt,lang==='en'?/3 guests, 1 child/:/3 khách, 1 bé/,`${label}: the card line counts the guests`);assert.match(txt,/Nhà anh Tuấn, Chị Lan/,`${label}: and names them`);assert.ok((await line.boundingBox())!.height>=44,`${label}: the line is a ≥ 44 px target`);
    assert.ok(await line.evaluate((el:any)=>{const c=el.closest('.family-meal-card'),r=el.getBoundingClientRect(),cr=c.getBoundingClientRect();return r.right<=cr.right+1&&r.left>=cr.left-1&&c.scrollWidth<=c.clientWidth+1}),`${label}: the guest line stays inside its card`);
    await line.scrollIntoViewIfNeeded();await noOverflow('meal card with guests');await shot('guests-card');
    const sc=page.locator('#main .guest-shortcut');assert.match(await sc.innerText(),lang==='en'?/Guests: 4 · edit/:/Khách: 4 · sửa/,`${label}: the button shows the guests already coming`);await E('scrollTo(0,0)');await sc.scrollIntoViewIfNeeded();await shot('guests-button');
    // a few days ahead: “Có khách” on the week menu; regular guests in one tap
    /* a later visit: the meals have no guests any more, the regular guests are remembered */await E(`(()=>{for(const w of Object.values(state.weeks))for(const day of Object.values(w.days))for(const m of Object.values(day))if(m&&typeof m==='object')delete m.guests;save()})()`);
    assert.equal(await E(`(view='planner',render(),document.querySelectorAll('#main .week-tools [data-fm="guests"]').length)`),0,`${label}: no second guest button on the week menu`);
    await E(`view='today';render();scrollTo(0,0)`);const pl=page.locator('#main .guest-shortcut');await pl.waitFor();assert.match(await pl.innerText(),lang==='en'?/Guests coming/:/Có khách/,`${label}: the button reads “Có khách” when nobody is coming`);await pl.click();await page.locator('#modal-root #guest-book .chip').first().waitFor();
    assert.equal(await page.locator('#modal-root #guest-book .chip').count(),2,`${label}: two regular guests offered`);
    assert.equal(await page.locator('#modal-root .hint.warn').count(),0,`${label}: the button opens on a meal that can take guests`);await page.locator('#modal-root #guest-book .chip',{hasText:'Nhà anh Tuấn'}).click();
    assert.equal(await page.locator('#modal-root [data-guest-name="0"]').inputValue(),'Nhà anh Tuấn',`${label}: a regular guest fills the group in one tap`);
    assert.equal(await page.locator('#modal-root #guest-book .chip').count(),1,`${label}: the one already added is no longer offered`);
    await noOverflow('guest sheet from the week menu');await shot('guests-regular');await E('closeModal()')}

   assert.deepEqual(errors,[],`${label}: page errors`);
   await context.close();console.log('✓',label);
  }
  console.log('PASS v1.7.12: round buttons the same on every row, no jump on pantry chips and “Trừ đồ”, centred Xong, short use-it-up button, cook once for several meals, guests with a name');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
