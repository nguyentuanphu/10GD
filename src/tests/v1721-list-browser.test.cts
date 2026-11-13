// v1.7.21 shopping list (Henry, 14 Nov 2026, Sydney time: phone screenshots of the list; pop-up answers in docs/memory/decisions.md).
//  1. Row layout (Henry's own answer): the round ↓ / ↑ buttons sit INSIDE the amount button (44 px drawn steps, VI/EN labels),
//     step the amount like the old buttons, keep the amount still on screen (rule 24); tapping the amount still opens the
//     buying-unit sheet. The controls start under the tick column and the store sits next to the amount (wrapping only on
//     narrow phones); no separate round row. The same rows in shopping mode (“Bắt đầu đi chợ”).
//  2. “Xem nhanh” / “Quick view” per category: one short line per item (tick · name · amount), still tickable; tap again to
//     open; remembered on the device; the count does not change; the button does not move.
//  3. Extras aisle: guessed from the name (“Bánh chưng” → dry goods, “Đèn cầy đỏ” → household, “Thịt bò thêm” → meat, an
//     unknown word → “Khác” / “Other”); the add, edit and “Nhờ mua thêm” forms show the guess and let the family change it;
//     the family's choice is stored on the extra, remembered for the same name, passes validImport and the sync merge.
//  4. An extra with no price (or an old one saved as 0) shows “Chưa rõ giá” / “Price unknown”, never $0 / 0 ₫, in the row,
//     the total and the share text; its edit form shows an empty price.
//  5. Category counts say items (“món đồ” / “items”), equal the rows they hold; shopping mode counts items too.
//  6. Store pills: store and suburb separated by “ · ” (rows and extras).
//  7. The meat aisle heading has its own drawing (the old 🥩 drawing read as a stray dot).
//  8. “Mua thêm” and “Nhờ mua thêm” side by side (both drawn, 44 px, same line), “Nhờ mua thêm” no longer in Công cụ.
//  9. Usual shops: 4 first (plus the chosen one), “Xem thêm (n)”, a search field — the item sheet, the extra's sheet and
//     the add form.
// 10. (Henry, 14 Nov 2026, 08:38: “Finished shopping” ran past its button in shopping mode with a larger text size; rule 36
//     sweep) every button on the main screens, shopping mode and the common sheets, at 320 and 375 px with the app's largest
//     text size (“Rất lớn”) and again with a larger phone text size on top, in VI and EN: no label cut, sticking out of its
//     button or wider than its card, no sideways scroll.
// Every run: week starting on Saturday; EN runs in VND with the phone in Los Angeles time; empty data first, then a full
// week. 320×740, 375×812, 820×1100, 1280×800; VI and EN, light and dark. Chromium viewport simulation, not physical devices.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const origin='https://kitchen.test',out='docs/reviews/v1.7.21/list';mkdirSync(out,{recursive:true});
const mime:any={'.js':'application/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'};
const sizes:any={narrow:{width:320,height:740},mobile:{width:375,height:812},tablet:{width:820,height:1100},desktop:{width:1280,height:800}};
const MEMBERS=[['m-a','Ba',1],['m-b','Mẹ',1],['m-c','Chi',.75]];
const ZERO=/(\$\s?0[.,]00|\b0\s?₫|₫\s?0\b|\b0,00\b)/;
(async()=>{
 const browser=await chromium.launch(process.env.BEP_CHROMIUM?{executablePath:process.env.BEP_CHROMIUM}:{});let shots=0,runs0=0;
 try{
  const runs:[string,string,string][]=[['mobile','vi','light'],['narrow','en','dark'],['tablet','vi','dark'],['desktop','en','light'],['narrow','vi','light'],['mobile','en','dark']];
  for(const [size,lang,theme] of runs){const label=`${size} ${lang} ${theme}`,vi=lang==='vi',tz=vi?'Australia/Sydney':'America/Los_Angeles',cur=vi?'AUD':'VND',L=(a:string,b:string)=>vi?a:b;
   const context=await browser.newContext({locale:vi?'vi-VN':'en-AU',viewport:sizes[size],serviceWorkers:'block',reducedMotion:'reduce',colorScheme:theme as any,timezoneId:tz});
   await context.addInitScript(({lang,theme}:any)=>{if(sessionStorage.getItem('qa-init'))return;sessionStorage.setItem('qa-init','1');localStorage.setItem('bep-theme-mode',theme);localStorage.setItem('guest/bep-language',lang);localStorage.setItem('bep-local-locked','yes');localStorage.setItem('bep-guide-done','1')},{lang,theme});
   const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
   const dialogs:string[]=[];page.on('dialog',(d:any)=>{dialogs.push(d.message());d.dismiss().catch(()=>{})});
   await page.route(origin+'/**',async(r:any)=>{const u=new URL(r.request().url());if(u.pathname.startsWith('/.netlify/'))return r.fulfill({status:401,json:{error:'no'}});if(u.pathname==='/startup-scripts.json')return r.fulfill({json:JSON.parse(readFileSync('dist/startup-scripts.json','utf8'))});const f=resolve('dist',u.pathname==='/'?'index.html':u.pathname.slice(1));try{await r.fulfill({contentType:mime[extname(f)]||'application/octet-stream',body:readFileSync(f)})}catch{await r.fulfill({status:404,body:'Not found'})}});
   await page.goto(origin+'/#today',{waitUntil:'domcontentloaded'});
   const E=(s:string)=>page.evaluate(s) as Promise<any>;
   for(let i=0;;i++){try{await page.waitForFunction(()=>typeof (globalThis as any).KitchenExtras==='object'&&typeof (globalThis as any).decorateButtons==='function'&&document.querySelector('#main h1'),null,{timeout:20000});break}catch(e){if(i>3)throw e;await page.waitForTimeout(700)}}
   await E(`ensureCatalog()`);
   const name=(n:string)=>`${out}/${n}-${lang}-${theme}-${sizes[size].width}x${sizes[size].height}.png`;
   const shot=async(n:string)=>{await E(`document.querySelector('#toast')&&(document.querySelector('#toast').className='')`);await page.waitForTimeout(80);await page.screenshot({path:name(n)});shots++};
   const overflow=async(where:string)=>{const o=await E(`(()=>{const ms=[...document.querySelectorAll('#modal-root .modal')];return{doc:document.documentElement.scrollWidth-innerWidth,modal:Math.max(0,...ms.map(m=>m.scrollWidth-m.clientWidth))}})()`);assert.ok(o.doc<=1&&o.modal<=1,`${label} ${where}: no sideways overflow ${JSON.stringify(o)}`)};
   const shopping=async()=>{await E(`(()=>{view='shopping';location.hash='shopping';closeModal();render();scrollTo(0,0)})()`);await page.waitForTimeout(150)};
   const text=(sel:string)=>E(`[...document.querySelectorAll(${JSON.stringify(sel)})].map(e=>e.innerText.replace(/\\u00a0/g,' ').replace(/\\s+/g,' ').trim())`);

   // ── empty: no menu, no extras ───────────────────────────────────────────────────────────────────────────────────────
   await E(`(()=>{state.preferences.onboardingComplete=true;state.preferences.weekStartDay=6;state.preferences.currency='${cur}';state.members=${JSON.stringify(MEMBERS)}.map(([id,name,weight])=>({id,name,weight,emoji:''}));state.pantry=[];selectedDate=sydneyDate();weekStart=planStartOf(state,selectedDate);for(const w of Object.values(state.weeks)){w.extras=[];for(const d of Object.values(w.days))for(const m of Object.values(d))if(m&&m.recipes)m.recipes=[]}save();closeModal()})()`);
   await shopping();
   assert.equal(await E(`planStartOf(state,sydneyDate())===weekStart&&new Date(weekStart+'T12:00:00Z').getUTCDay()`),6,`${label}: the week starts on Saturday`);
   // 8. the two main actions, empty list too
   const mainActions=async(where:string)=>{const a:any=await E(`(()=>{const add=document.querySelector('#main .week-tools [data-action="add-extra"]'),req=document.querySelector('#main .week-tools [data-push-action="request-item"]');const box=b=>{const r=b.getBoundingClientRect();return{t:Math.round(r.top),h:r.height,w:r.width,art:!!b.querySelector('.btn-art'),txt:b.innerText.trim(),inTools:!!b.closest('.cl-tools'),shown:!!b.offsetParent,clip:b.scrollWidth>b.clientWidth+1}};return add&&req?{add:box(add),req:box(req),toolsReq:document.querySelectorAll('#main .cl-tools [data-push-action="request-item"]').length}:null})()`);
    assert.ok(a,`${label} ${where}: “${L('Mua thêm','Add item')}” and “${L('Nhờ mua thêm','Request item')}” are both on the screen`);
    assert.ok(a.add.shown&&a.req.shown&&!a.req.inTools&&a.toolsReq===0,`${label} ${where}: “${L('Nhờ mua thêm','Request item')}” is a button next to “${L('Mua thêm','Add item')}”, not in ${L('Công cụ','Tools')} ${JSON.stringify(a)}`);
    assert.ok(Math.abs(a.add.t-a.req.t)<=2,`${label} ${where}: both on the same line ${JSON.stringify(a)}`);
    assert.ok(a.add.h>=44&&a.req.h>=44&&a.add.art&&a.req.art,`${label} ${where}: both 44 px main buttons with their drawing ${JSON.stringify(a)}`);
    assert.ok(!a.add.clip&&!a.req.clip&&(vi?/Nhờ mua thêm/:/Request item/).test(a.req.txt),`${label} ${where}: the whole label shows ${JSON.stringify(a)}`)};
   await mainActions('empty list');await overflow('empty list');await shot('empty');
   assert.equal(await E(`document.querySelectorAll('#main .shopping-group').length`),0,`${label}: no empty categories`);
   await page.locator('#main .week-tools [data-push-action="request-item"]').click();await page.locator('#modal-root #errand-form').waitFor();
   assert.ok(await E(`!!document.querySelector('#modal-root #errand-aisle')`),`${label}: “${L('Nhờ mua thêm','Request item')}” asks for the aisle too`);
   await page.locator('#errand-item').fill(vi?'Sữa tươi':'Fresh milk');
   assert.equal(await E(`document.getElementById('errand-aisle').value`),'dry',`${label}: milk is guessed for eggs & dry goods`);
   assert.match(await E(`document.getElementById('errand-aisle-hint').innerText`),vi?/đoán/:/Guessed/,`${label}: the guess says it is a guess`);
   await overflow('request sheet');await shot('request-aisle');await E(`closeModal()`);

   // ── full: a week of meals, extras, stores ────────────────────────────────────────────────────────────────────────────
   await E(`(()=>{familyGenerate(state,weekStart,{sourceMode:'library'});for(const wk of Object.values(state.weeks))for(const day of Object.values(wk.days))for(const m of Object.values(day))if(m&&m.attendance)for(const p of state.members)m.attendance[p.id]??='home';ensureDefaultStores(state);state.stores.push({id:'qa-th',name:'Thái Hưng Grocery',address:'Marrickville'});for(let i=0;i<6;i++)state.stores.push({id:'qa-s'+i,name:'QA Shop '+i,address:i%2?'Bankstown':''});
    const w=currentWeek();w.extras=[{id:'x-banh',name:'Bánh chưng',qty:'2 cái',cost:0,costUnknown:true,currency:'${cur}',done:false},{id:'x-den',name:'Đèn cầy đỏ',qty:'1 gói',cost:0,currency:'${cur}',done:false,storeId:'qa-th'},{id:'x-bo',name:'Thịt bò thêm',qty:'500 g',cost:12,currency:'${cur}',done:false},{id:'x-odd',name:'Zorblax',qty:'1 cái',cost:0,costUnknown:true,currency:'${cur}',done:false},{id:'x-hoa',name:'Hoa cúc',qty:'1 bó',cost:5,currency:'${cur}',done:false,aisle:'veg'}];
    const[s,e]=shopDates(),rows=shopping(state,w,s,e).filter(r=>shoppingHasAmount(r));setShoppingStore(state,w,s,e,rows[1].id,'qa-th','',false);save()})()`);
   await shopping();
   // 7. the meat heading's own drawing (also after a fresh start)
   const meatArt=async(where:string)=>{const m:any=await E(`(()=>{const h=document.querySelector('#main .shopping-group[data-group="meat"] h2');return h?{own:!!h.querySelector('svg.sg-art'),old:/M7 26c0-10 9-17 19-16/.test(h.innerHTML),dot:[...h.querySelectorAll('.sg-title svg')].map(s=>s.getBoundingClientRect().width)}:null})()`);assert.ok(m&&m.own&&!m.old&&m.dot.every((w:number)=>w>=18),`${label} ${where}: the meat heading shows its own drawing, not the red dot ${JSON.stringify(m)}`)};
   await meatArt('list');
   // 5. counts say items and equal the rows
   const counts:any[]=await E(`[...document.querySelectorAll('#main .shopping-group')].map(g=>({key:g.dataset.group,txt:g.querySelector('h2 small').innerText.trim(),rows:g.querySelectorAll('.shop-row').length}))`);
   assert.ok(counts.length>=4,`${label}: categories ${JSON.stringify(counts)}`);
   for(const c of counts){const m=c.txt.match(vi?/^(\d+) món đồ$/:/^(\d+) items?$/);assert.ok(m,`${label}: “${c.txt}” counts items, not dishes`);assert.equal(+m[1],c.rows,`${label}: “${c.txt}” equals the ${c.rows} rows of ${c.key}`)}
   if(!vi)assert.ok(!/\bdish(es)?\b/i.test((await text('#main .shopping-group h2')).join(' ')+await E(`document.querySelector('#main .budget-card .callout')?.textContent||''`)),`${label}: no “dishes” on the list headings or the budget note`);
   // 3. extras in their aisles
   const aisleOf=(id:string)=>E(`document.querySelector('#main [data-change="extra-done"][data-id="${id}"]')?.closest('.shopping-group')?.dataset.group||''`);
   assert.equal(await aisleOf('x-banh'),'dry',`${label}: Bánh chưng is listed with eggs & dry goods (bakery)`);
   assert.equal(await aisleOf('x-den'),'other',`${label}: Đèn cầy đỏ is listed with household items`);
   assert.equal(await aisleOf('x-bo'),'meat',`${label}: Thịt bò thêm is listed with meat`);
   assert.equal(await aisleOf('x-odd'),'misc',`${label}: a name the app cannot place goes under ${L('Khác','Other')}`);
   assert.equal(await aisleOf('x-hoa'),'veg',`${label}: the family's own aisle choice wins`);
   assert.match((await text('#main .shopping-group[data-group="misc"] h2 .sg-title'))[0],vi?/Khác/:/Other/,`${label}: the “${L('Khác','Other')}” heading`);
   // 4. never $0 for an unknown price
   const priceOf=(id:string)=>E(`document.querySelector('#main [data-change="extra-done"][data-id="${id}"]').closest('.shop-row').querySelector('.price').innerText.trim()`);
   for(const id of ['x-banh','x-den','x-odd']){const p=await priceOf(id);assert.equal(p,L('Chưa rõ giá','Price unknown'),`${label}: ${id} shows “${L('Chưa rõ giá','Price unknown')}”, not ${p}`)}
   assert.ok(!ZERO.test((await text('#main .shop-row .price')).join(' | ')),`${label}: no $0 on any row`);
   const share:string=await E(`textShopping()`);assert.ok(!ZERO.test(share.split('\n').slice(-3).join(' ')),`${label}: the share total does not count an unknown price as 0`);
   assert.match(share,vi?/còn món chưa rõ giá/:/some prices are not known yet/,`${label}: the share text says some prices are unknown`);
   {const ls=share.split('\n'),i=ls.findIndex(l=>/Bánh chưng/.test(l)),head=ls.slice(0,i).reverse().find(l=>l&&!/^[✓□]/.test(l));assert.match(head||'',vi?/Trứng, gia vị & đồ khô/:/Eggs, seasonings & dry goods/,`${label}: the share text lists Bánh chưng under its aisle (${head})`)}
   assert.match(await E(`(document.querySelector('#main .budget-card .callout')?.textContent||'').trim()`),vi?/^\d+ món đồ chưa rõ giá/:/^\d+ items? ha(s|ve) no price yet/,`${label}: the budget note counts items with no price`);
   // 6. store and suburb apart
   const pills:string[]=await text('#main .shop-row .store-pill');
   assert.ok(pills.some(t=>/Thái Hưng Grocery · Marrickville/.test(t)),`${label}: the store pill reads “Thái Hưng Grocery · Marrickville” ${JSON.stringify(pills.filter(t=>/Thái/.test(t)))}`);
   assert.ok(!pills.some(t=>/GroceryMarrickville/.test(t.replace(/\s·\s/g,'·'))),`${label}: store and suburb never run together`);
   assert.ok(!(await E(`[...document.querySelectorAll('#main .store-pill')].some(p=>/\\n\\s*·/.test(p.innerText))`)),`${label}: a wrapped store pill never starts a line with “·”`);
   assert.ok(await E(`[...document.querySelectorAll('#main .store-pill')].every(p=>p.getBoundingClientRect().height>=44)`),`${label}: store pills are 44 px targets`);
   // 1. the row: steps inside the amount, controls under the tick, store next to the amount
   const rowInfo:any[]=await E(`[...document.querySelectorAll('#main .shop-row.shop-purchase-row')].filter(r=>r.querySelector('.qty-stepper')).map(r=>{const q=s=>r.querySelector(s)?.getBoundingClientRect();const tick=q('.large-check-target')||q('input.check'),c=q('.shop-row-controls'),a=q('button[data-action="purchase-quantity"]'),d=q('.qty-round[data-qr-dir="down"]'),u=q('.qty-round[data-qr-dir="up"]'),p=q('.store-pill'),st=r.querySelector('.qty-stepper').getBoundingClientRect();return{id:r.querySelector("input.check").dataset.id,txt:r.innerText.replace(/\\s+/g," "),kids:[...r.children].map(k=>k.className.split(" ")[0]+":"+Math.round(k.getBoundingClientRect().height)).join(","),h:r.getBoundingClientRect().height,lh:q('.item-label').height,ch:c.height,underTick:Math.abs(c.left-tick.left)<=2,inside:d.left>=st.left-1&&d.right<=a.left+1&&u.left>=a.right-1&&u.right<=st.right+1,oneLine:Math.abs(d.top-a.top)<=2&&Math.abs(u.top-a.top)<=2,tap:[d,u].every(b=>b.width>=44&&b.height>=44),storeNext:Math.abs(p.top-st.top)<=4&&p.left>st.right,storeBelow:p.top>=st.bottom-1,oldRow:!!r.querySelector('.qty-round-pair'),pantry:r.classList.contains('has-pantry')||!!r.querySelector('.online-line'),longStore:/Marrickville/.test(r.querySelector('.store-pill').innerText),labels:[...r.querySelectorAll('.qty-step')].map(b=>b.getAttribute('aria-label')),art:[...r.querySelectorAll('.qty-step')].every(b=>!!b.querySelector('.btn-art'))}})`);
   assert.ok(rowInfo.length>=5,`${label}: rows with the amount steps (${rowInfo.length})`);
   for(const r of rowInfo){assert.ok(r.underTick,`${label} ${r.id}: the controls start under the tick column`);assert.ok(r.inside&&r.oneLine&&!r.oldRow,`${label} ${r.id}: ↓ and ↑ sit inside the amount button, on its line, no separate round row ${JSON.stringify(r)}`);assert.ok(r.tap&&r.art,`${label} ${r.id}: 44 px drawn steps`);
    assert.ok(r.labels.length===2&&r.labels.every((l:string)=>(vi?/^Làm tròn (xuống|lên): /:/^Round .+ (down|up)$/).test(l)),`${label} ${r.id}: the steps say what they do ${JSON.stringify(r.labels)}`);
    if(sizes[size].width>=375&&!r.longStore)assert.ok(r.storeNext,`${label} ${r.id}: the store sits next to the amount ${JSON.stringify(r)}`);else assert.ok(r.storeNext||r.storeBelow,`${label} ${r.id}: the store wraps under the amount on a narrow phone`);
    // two lines at most: the name, then the controls (amount with its steps, store, price); nothing else stacked under them
    if(!r.pantry)assert.ok(r.ch<=(r.longStore||sizes[size].width<=320?150:100)&&r.h<=r.lh+r.ch+52,`${label} ${r.id}: a short row (${Math.round(r.h)} px: name ${Math.round(r.lh)} + controls ${Math.round(r.ch)}) ${r.txt} ${r.kids}`)}
   // stepping: like the old buttons, and the amount stays where it was (rule 24)
   {const id=rowInfo.find(r=>!r.pantry)?.id||rowInfo[0].id;const qOf=()=>E(`(()=>{const[s,e]=shopDates();const r=shopping(state,currentWeek(),s,e).find(x=>x.id==='${id}');return Number(r.qty??r.suggested)})()`);
    await E(`document.querySelector('#main .qty-round[data-qr-id="${id}"][data-qr-dir="up"]').scrollIntoView({block:'center'})`);await page.waitForTimeout(100);
    const amt=()=>E(`document.querySelector('#main button[data-action="purchase-quantity"][data-id="${id}"]').getBoundingClientRect().top`);
    const v0=await qOf(),y0=await amt();await page.locator(`#main .qty-round[data-qr-id="${id}"][data-qr-dir="up"]`).click();await page.waitForTimeout(250);const v1=await qOf(),y1=await amt();
    assert.ok(v1>v0,`${label}: ↑ rounds up (${v0} → ${v1})`);assert.ok(Math.abs(y1-y0)<=1,`${label}: ↑ keeps the amount in place (${y0} → ${y1})`);
    assert.equal(await E(`qrNext(${v0},qrKind('${id}'),{dir:'up'})`),v1,`${label}: ↑ steps exactly like the old round-up button`);
    await page.locator(`#main .qty-round[data-qr-id="${id}"][data-qr-dir="down"]`).click();await page.waitForTimeout(250);const v2=await qOf(),y2=await amt();
    assert.ok(v2<v1,`${label}: ↓ rounds down (${v1} → ${v2})`);assert.ok(Math.abs(y2-y0)<=1,`${label}: ↓ keeps the amount in place`);
    assert.equal(await E(`document.querySelectorAll('#modal-root .modal').length`),0,`${label}: a step does not open a sheet`);
    await page.locator(`#main button[data-action="purchase-quantity"][data-id="${id}"]`).click();await page.locator('#modal-root [data-action="save-purchase-quantity"]').waitFor();
    assert.ok(true,`${label}: tapping the amount itself still opens the buying-unit sheet`);await E(`closeModal()`)}
   await E(`document.querySelector('#main .shopping-group').scrollIntoView()`);await page.waitForTimeout(100);await overflow('list');await shot('rows');
   await E(`document.querySelector('#main [data-change="extra-done"][data-id="x-banh"]').closest('.shop-row').scrollIntoView({block:'center'})`);await page.waitForTimeout(80);await shot('extras');
   // 2. quick view
   {const g='#main .shopping-group[data-group="meat"]',btn=page.locator(`${g} [data-shop-quick]`);await btn.scrollIntoViewIfNeeded();const cnt0=await E(`document.querySelector('${g} h2 small').innerText`);
    assert.equal(await btn.getAttribute('aria-pressed'),'false',`${label}: quick view starts off`);assert.equal((await btn.innerText()).trim(),L('Xem nhanh','Quick view'),`${label}: “${L('Xem nhanh','Quick view')}”`);
    assert.ok(await btn.evaluate((b:any)=>{const r=b.getBoundingClientRect();return r.height>=44&&r.width>=44&&!b.querySelector('.btn-art')}),`${label}: a 44 px words-only toggle (rule 27)`);
    const y0=(await btn.boundingBox())!.y;await btn.click();await page.waitForTimeout(150);const y1=(await page.locator(`${g} [data-shop-quick]`).boundingBox())!.y;
    assert.ok(Math.abs(y1-y0)<=1,`${label}: the toggle does not move (${y0} → ${y1})`);
    const q:any=await E(`(()=>{const rows=[...document.querySelectorAll('${g} .shop-row')];const vis=(r,s)=>[...r.querySelectorAll(s)].some(e=>e.offsetParent&&e.getBoundingClientRect().width>0);return rows.map(r=>({h:r.getBoundingClientRect().height,tick:vis(r,'input.check'),name:vis(r,'.item-label'),amount:vis(r,'button[data-action="purchase-quantity"], .qty'),price:vis(r,'.price'),store:vis(r,'.store-pill'),steps:vis(r,'.qty-step'),art:vis(r,'.ingredient-art, .pp-wrap'),skip:vis(r,'.row-skip, .extra-delete')}))})()`);
    assert.ok(q.length>=2,`${label}: quick view rows`);
    for(const r of q){assert.ok(r.tick&&r.name&&r.amount,`${label}: quick view keeps tick · name · amount ${JSON.stringify(r)}`);assert.ok(!r.price&&!r.store&&!r.steps&&!r.art&&!r.skip,`${label}: quick view hides the rest ${JSON.stringify(r)}`);assert.ok(r.h<=64,`${label}: one short line (${Math.round(r.h)} px)`)}
    assert.equal(await E(`document.querySelector('${g} h2 small').innerText`),cnt0,`${label}: the count does not change`);
    assert.equal(await E(`JSON.parse(localStorage.getItem('bep-shop-quick')||'{}')['aisle:meat']`),true,`${label}: remembered on this device`);
    const tick=page.locator(`${g} .shop-row input.check[data-change="bought"]`).first(),tid=await tick.getAttribute('data-id');await page.locator(`${g} .shop-row .large-check-target`).first().click();await page.waitForTimeout(150);
    assert.equal(await E(`(()=>{const[s,e]=shopDates();return !!shopping(state,currentWeek(),s,e).find(x=>x.id==='${tid}').bought})()`),true,`${label}: a quick-view row can still be ticked`);
    assert.ok(await E(`document.querySelector('${g}').classList.contains('sg-quick-on')`),`${label}: still folded after the redraw`);
    await E(`document.querySelector('${g}').scrollIntoView()`);await page.waitForTimeout(80);await shot('quick-view');
    await page.locator(`${g} .shop-row .large-check-target`).first().click();await page.waitForTimeout(100);
    await page.locator(`${g} [data-shop-quick]`).click();await page.waitForTimeout(100);assert.ok(!(await E(`document.querySelector('${g}').classList.contains('sg-quick-on')`))&&await E(`document.querySelectorAll('${g} .store-pill').length>0`),`${label}: tap again to open the category fully`)}
   // 3. the add / edit forms: guess, choice, remembered
   {await page.locator('#main .week-tools [data-action="add-extra"]').click();await page.locator('#modal-root #extra-form').waitFor();
    const sel=page.locator('#extra-aisle');await page.locator('#extra-name').fill('Bánh mì');assert.equal(await sel.inputValue(),'dry',`${label}: Bánh mì is guessed as bakery & dry goods`);
    await page.locator('#extra-name').fill('Nến thơm');assert.equal(await sel.inputValue(),'other',`${label}: a candle is guessed as household`);
    assert.match(await E(`document.getElementById('extra-aisle-hint').innerText`),vi?/đoán/:/Guessed/,`${label}: shown as a guess`);
    await page.locator('#extra-name').fill('Qa thing');assert.equal(await sel.inputValue(),'misc',`${label}: nothing to go on → ${L('Khác','Other')}`);
    await sel.selectOption('veg');await page.locator('#extra-amount').fill('2');await E(`unitFieldSet(document.getElementById('extra-unit'),'cái',{byUser:true});syncExtraQty()`);
    await overflow('add form');await shot('add-form-aisle');
    await E(`document.querySelector('#modal-root [data-action="submit-form"][data-id="extra-form"]').click()`);await page.waitForTimeout(200);
    const added:any=await E(`currentWeek().extras.find(e=>e.name==='Qa thing')`);assert.ok(added&&added.aisle==='veg',`${label}: the family's choice is stored ${JSON.stringify(added)}`);
    await shopping();assert.equal(await aisleOf(added.id),'veg',`${label}: listed in the chosen aisle`);
    await page.locator('#main .week-tools [data-action="add-extra"]').click();await page.locator('#modal-root #extra-form').waitFor();await page.locator('#extra-name').fill('Qa thing');
    assert.equal(await page.locator('#extra-aisle').inputValue(),'veg',`${label}: the same name next time gets the family's aisle`);await E(`closeModal()`);
    // a guess is not stored when nobody picks
    await page.locator('#main .week-tools [data-action="add-extra"]').click();await page.locator('#modal-root #extra-form').waitFor();await page.locator('#extra-name').fill('Giấy ăn');await page.locator('#extra-amount').fill('1');await E(`unitFieldSet(document.getElementById('extra-unit'),'gói',{byUser:true});syncExtraQty()`);
    await E(`document.querySelector('#modal-root [data-action="submit-form"][data-id="extra-form"]').click()`);await page.waitForTimeout(200);
    const g2:any=await E(`currentWeek().extras.find(e=>e.name==='Giấy ăn')`);assert.ok(g2&&g2.aisle===undefined,`${label}: a guess the family did not choose is not stored ${JSON.stringify(g2)}`);await shopping();assert.equal(await aisleOf(g2.id),'other',`${label}: Giấy ăn is listed (by the guess) with household items`);
    // edit: the old $0 extra opens with an empty price; moving Bánh chưng to household
    await E(`extraFormModal(currentWeek().extras.find(e=>e.id==='x-den'))`);await page.locator('#modal-root #extra-form').waitFor();assert.equal(await page.locator('#extra-cost').inputValue(),'',`${label}: an unknown price opens empty, not 0`);await E(`closeModal()`);
    await page.locator('#main [data-action="edit-extra"][data-id="x-banh"]').click();await page.locator('#modal-root #extra-form').waitFor();
    assert.equal(await page.locator('#extra-aisle').inputValue(),'dry',`${label}: the edit form shows the guessed aisle`);await page.locator('#extra-aisle').selectOption('other');
    await E(`document.querySelector('#modal-root [data-action="submit-form"][data-id="extra-form"]').click()`);await page.waitForTimeout(200);await shopping();
    assert.equal(await E(`currentWeek().extras.find(e=>e.id==='x-banh').aisle`),'other',`${label}: an edited aisle is stored`);assert.equal(await aisleOf('x-banh'),'other',`${label}: and the list follows it`)}
   // 9. usual shops: 4 first, more, search
   const chips=async(where:string,chosen:string)=>{const c:any=await E(`(()=>{const box=document.querySelector('#modal-root [data-store-chips]');if(!box)return null;const all=[...box.querySelectorAll('[data-store-chip]')];return{shown:all.filter(b=>!b.hidden&&b.offsetParent).map(b=>b.dataset.store||b.dataset.id),total:all.length,more:box.querySelector('[data-store-chips-more]')?.innerText||'',search:!!box.querySelector('[data-store-chip-search]')}})()`);
    assert.ok(c,`${label} ${where}: usual shops`);assert.ok(c.total>=8&&c.shown.length<=5&&c.shown.length>=4,`${label} ${where}: 4 shops first (plus the chosen one) ${JSON.stringify(c)}`);
    if(chosen)assert.ok(c.shown.includes(chosen),`${label} ${where}: the chosen shop always shows ${JSON.stringify(c)}`);
    assert.equal(c.more,L(`Xem thêm (${c.total-c.shown.length})`,`Show more (${c.total-c.shown.length})`),`${label} ${where}: the more button counts what it opens`);assert.ok(c.search,`${label} ${where}: a search field`);
    await page.locator('#modal-root [data-store-chip-search]').fill('qa shop 3');const f:any=await E(`[...document.querySelectorAll('#modal-root [data-store-chip]')].filter(b=>!b.hidden).map(b=>b.innerText.trim())`);assert.ok(f.length===1&&/QA Shop 3/.test(f[0]),`${label} ${where}: the search finds a shop by name ${JSON.stringify(f)}`);
    await page.locator('#modal-root [data-store-chip-search]').fill('');await page.locator('#modal-root [data-store-chips-more]').click();
    assert.equal(await E(`[...document.querySelectorAll('#modal-root [data-store-chip]')].filter(b=>!b.hidden).length`),c.total,`${label} ${where}: “${L('Xem thêm','Show more')}” shows every shop`);await overflow(where)};
   {const rid=rowInfo.find(r=>r.longStore)?.id;assert.ok(rid,`${label}: a row with a chosen shop`);await E(`document.querySelector('#main [data-planning="item-store"][data-id="${rid}"]').click()`);await page.locator('#modal-root #item-store-form').waitFor();await shot('store-sheet');await chips('item store sheet','qa-th');await E(`closeModal()`)}
   {await E(`document.querySelector('#main [data-planning="extra-store"][data-id="x-den"]').click()`);await page.locator('#modal-root #extra-store-form').waitFor();await chips('extra store sheet','qa-th');await E(`closeModal()`)}
   {await page.locator('#main .week-tools [data-action="add-extra"]').click();await page.locator('#modal-root #extra-form').waitFor();await chips('add form','');await E(`closeModal()`)}
   // 1 + 5 in shopping mode: the same compact row; the bar counts items
   {await shopping();const st=page.locator('#main [data-flow="shop-start"]');await st.click();await page.locator('#main .shop-mode-bar').waitFor();
    {const hs:any[]=await E(`[...document.querySelectorAll('#main .shopping-group')].map(g=>({txt:g.querySelector('h2 small').innerText.trim(),rows:g.querySelectorAll('.shop-row').length}))`);for(const h of hs){const m=h.txt.match(vi?/^(\d+) món đồ$/:/^(\d+) items?$/);assert.ok(m&&+m[1]===h.rows,`${label}: shopping mode headings count items (“${h.txt}”, ${h.rows} rows)`)}}
    assert.match(await page.locator('#main .shop-mode-bar').innerText(),vi?/còn \d+ \/ \d+ món đồ/:/\d+ of \d+ left/,`${label}: shopping mode counts items`);
    const row=page.locator('#main .shopping-group[data-group="veg"] .shop-row.shop-purchase-row').first();await row.locator('.item-label').click();await page.waitForTimeout(150);
    const r:any=await row.evaluate((x:any)=>{const st=x.querySelector('.qty-stepper'),a=x.querySelector('button[data-action="purchase-quantity"]').getBoundingClientRect();const s=[...x.querySelectorAll('.qty-step')].map((b:any)=>b.getBoundingClientRect());return{open:x.classList.contains('flow-open'),inside:!!st&&s.length===2&&s[0].right<=a.left+1&&s[1].left>=a.right-1,shown:s.every(b=>b.width>=44)}});
    assert.ok(r.open&&r.inside&&r.shown,`${label}: shopping mode uses the same steps inside the amount ${JSON.stringify(r)}`);await overflow('shopping mode');await shot('shopping-mode');
    await E(`document.querySelector('#main [data-flow="shop-exit"]')?.click()`);await page.waitForTimeout(100)}
   // grouped by store: extras keep their own group; counts still match
   {await E(`(()=>{shopGrouping='store';render()})()`);const c:any[]=await E(`[...document.querySelectorAll('#main .shopping-group')].map(g=>({txt:g.querySelector('h2 small').innerText.trim(),rows:g.querySelectorAll('.shop-row').length}))`);for(const x of c)assert.equal(+x.txt.match(/\d+/)[0],x.rows,`${label}: by store, “${x.txt}” equals its rows`);await E(`(()=>{shopGrouping='aisle';render()})()`)}
   // after a reload: quick view and the meat drawing
   {await E(`(()=>{localStorage.setItem('bep-shop-quick',JSON.stringify({'aisle:veg':true}));save()})()`);await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>typeof (globalThis as any).KitchenExtras==='object'&&document.querySelector('#main h1'),null,{timeout:20000});await E(`ensureCatalog()`);await page.waitForTimeout(300);
    await E(`(()=>{if(view!=='shopping'){view='shopping';location.hash='shopping'}render()})()`);await page.waitForTimeout(150);
    assert.ok(await E(`document.querySelector('#main .shopping-group[data-group="veg"]').classList.contains('sg-quick-on')`),`${label}: quick view is remembered after a reload`);await meatArt('after a reload')}

   // ── rule 33: the aisle loads, survives the sync merge; old extras without it still load ──────────────────────────────
   const rt:any=await E(`(()=>{const s=JSON.parse(JSON.stringify(state));const bad=JSON.parse(JSON.stringify(state));Object.values(bad.weeks)[0].extras.push({id:'bad',name:'x',qty:'1',cost:0,aisle:'nope'});const old=JSON.parse(JSON.stringify(state));for(const w of Object.values(old.weeks))for(const e of w.extras)delete e.aisle;
    const wk=Object.keys(s.weeks).find(k=>s.weeks[k].extras.some(e=>e.id==='x-hoa'));const base=JSON.parse(JSON.stringify(s));delete base.weeks[wk].extras.find(e=>e.id==='x-hoa').aisle;const local=JSON.parse(JSON.stringify(base));local.weeks[wk].extras.find(e=>e.id==='x-hoa').aisle='meat';const remote=JSON.parse(JSON.stringify(base));remote.weeks[wk].extras.find(e=>e.id==='x-bo').done=true;
    const m=mergeFamilyStates(clone(base),clone(local),clone(remote),{now:Date.now()}).state,me=mergeFamilyStates(clone(s),clone(s),clone(s),{now:Date.now()}).state;
    return{ok:validImport(s),bad:validImport(bad),old:validImport(old),merged:validImport(JSON.parse(JSON.stringify(m))),aisle:m.weeks[wk].extras.find(e=>e.id==='x-hoa').aisle,done:m.weeks[wk].extras.find(e=>e.id==='x-bo').done,same:JSON.stringify(me.weeks)===JSON.stringify(s.weeks)}})()`);
   assert.ok(rt.ok&&rt.old&&!rt.bad,`${label}: validImport takes a chosen aisle and old extras, refuses an unknown aisle ${JSON.stringify(rt)}`);
   assert.ok(rt.merged&&rt.aisle==='meat'&&rt.done===true&&rt.same,`${label}: the sync merge keeps the aisle and the other device's change ${JSON.stringify(rt)}`);
   assert.deepEqual(dialogs,[],`${label}: no browser dialogs`);assert.deepEqual(errors,[],`${label}: no page errors`);
   await context.close();runs0++;console.log(`PASS ${label}`)}

  // ── 10. button rows at the largest text size (+ a larger phone text size), 320 / 375, VI / EN ────────────────────────
  const BUTTONS=()=>{const out:string[]=[];const modal=document.querySelector('#modal-root .modal');const scope:any=modal||document.querySelector('#main');const vis=(e:any)=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'&&!e.closest('[hidden]')};
   for(const e of scope.querySelectorAll('button,a.btn,a.chip,summary,.chip,[role="tab"],.store-pill') as any){if(!vis(e)||e.closest('.sr-only,.ladybug,#lb-root')||(e.closest('details:not([open])')&&!e.matches('details:not([open])>summary')))continue;
    const t=(e.innerText||e.getAttribute('aria-label')||'').replace(/\s+/g,' ').trim().slice(0,40)||e.tagName+'.'+e.className,r=e.getBoundingClientRect(),cs=getComputedStyle(e);
    if(e.scrollWidth>e.clientWidth+2&&(cs.overflowX!=='visible'||e.childElementCount===0))out.push('cut: '+t);
    for(const c of e.querySelectorAll('span,b,small,svg')){const q=c.getBoundingClientRect();if(q.width&&(q.left<r.left-2||q.right>r.right+2)){out.push('sticks out: '+t);break}}
    {const tw=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);let n:any;while((n=tw.nextNode())){if(!n.nodeValue.trim())continue;const rg=document.createRange();rg.selectNodeContents(n);if([...rg.getClientRects()].some(q=>q.width&&(q.right>r.right+2||q.left<r.left-2))){out.push('text outside its button: '+t);break}}}
    let p=e.parentElement;while(p&&p!==document.body){const ps=getComputedStyle(p);if(ps.overflowX==='auto'||ps.overflowX==='scroll')break;if(p.matches('.card,.modal,.shop-mode-bar,#main,.toolbar,.modal-actions,footer')){const pr=p.getBoundingClientRect();if(r.right>pr.right+2||r.left<pr.left-2)out.push('wider than its box: '+t);break}p=p.parentElement}}
   if(document.documentElement.scrollWidth>innerWidth+1)out.push('page scrolls sideways');if(modal&&modal.scrollWidth>modal.clientWidth+1)out.push('sheet scrolls sideways');return [...new Set(out)]};
  const SWEEP:[string,string][]=[['today',`view='today';render()`],['planner',`view='planner';render()`],['shopping',`view='shopping';render()`],['recipes',`view='recipes';render()`],['pantry',`view='pantry';render()`],['insights',`view='insights';render()`],['expenses',`view='expenses';render()`],['products',`view='products';render()`],
   ['shopping-mode',`view='shopping';render();document.querySelector('#main [data-flow="shop-start"]').click()`],['add-item',`view='shopping';render();extraFormModal()`],['edit-item',`view='shopping';render();extraFormModal(currentWeek().extras[0])`],['request-item',`view='shopping';render();requestItemForm()`],
   ['item-store',`view='shopping';render();document.querySelector('#main [data-planning="item-store"]').click()`],['extra-store',`view='shopping';render();document.querySelector('#main [data-planning="extra-store"]').click()`],['amount-sheet',`view='shopping';render();document.querySelector('#main [data-action="purchase-quantity"]').click()`],
   ['skip-sheet',`view='shopping';render();document.querySelector('#main [data-action="skip-row"]').click()`],['pantry-sheet',`view='shopping';render();document.querySelector('#main [data-action="check-pantry"]').click()`],['stores',`view='shopping';render();storesModal()`],
   ['recipe-sheet',`view='recipes';render();showRecipe('r1')`],['meal-editor',`view='planner';render();editMeal(Object.keys(currentWeek().days)[0],'dinner')`],['settings',`otherSettingsModal('')`],['appearance',`otherSettingsModal('appearance')`],
   ['put-away',`view='shopping';render();const[s,e]=shopDates();for(const r of shopping(state,currentWeek(),s,e).filter(shoppingHasAmount).slice(0,3))setShoppingBought(currentWeek(),s,e,r,true);save();render();document.querySelector('#main [data-action="store-purchases"]').click()`]];
  for(const lang of ['en','vi'])for(const width of [320,375])for(const mode of ['xlarge','phone']){const label=`sweep ${lang} ${width} ${mode==='xlarge'?'Rất lớn':'Rất lớn + larger phone text'}`;
   const context=await browser.newContext({viewport:{width,height:800},serviceWorkers:'block',reducedMotion:'reduce',timezoneId:'Australia/Sydney'});
   await context.addInitScript(({lang}:any)=>{if(sessionStorage.getItem('qa-init'))return;sessionStorage.setItem('qa-init','1');localStorage.setItem('guest/bep-language',lang);localStorage.setItem('bep-local-locked','yes');localStorage.setItem('bep-guide-done','1');localStorage.setItem('bep-text-size','xlarge')},{lang});
   const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',(d:any)=>d.dismiss().catch(()=>{}));
   await page.route(origin+'/**',async(r:any)=>{const u=new URL(r.request().url());if(u.pathname.startsWith('/.netlify/'))return r.fulfill({status:401,json:{error:'no'}});if(u.pathname==='/startup-scripts.json')return r.fulfill({json:JSON.parse(readFileSync('dist/startup-scripts.json','utf8'))});const f=resolve('dist',u.pathname==='/'?'index.html':u.pathname.slice(1));try{await r.fulfill({contentType:mime[extname(f)]||'application/octet-stream',body:readFileSync(f)})}catch{await r.fulfill({status:404,body:'Not found'})}});
   await page.goto(origin+'/#today',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>typeof (globalThis as any).KitchenExtras==='object'&&document.querySelector('#main h1'),null,{timeout:30000});await page.evaluate(`ensureCatalog()`);
   await page.evaluate(`(()=>{state.preferences.onboardingComplete=true;state.preferences.weekStartDay=6;selectedDate=sydneyDate();weekStart=planStartOf(state,selectedDate);state.members=${JSON.stringify(MEMBERS)}.map(([id,name,weight])=>({id,name,weight,emoji:''}));familyGenerate(state,weekStart,{sourceMode:'library'});for(const wk of Object.values(state.weeks))for(const day of Object.values(wk.days))for(const m of Object.values(day))if(m&&m.attendance)for(const p of state.members)m.attendance[p.id]??='home';state.pantry=[{id:'qa-rice',ingredient:'rice',qty:500,place:'dry',expiry:''}];ensureDefaultStores(state);state.stores.push({id:'qa-th',name:'Thái Hưng Grocery',address:'Marrickville'});currentWeek().extras=[{id:'x-banh',name:'Bánh chưng',qty:'2 cái',cost:0,costUnknown:true,currency:'AUD',done:false,storeId:'qa-th'}];save();localStorage.setItem('bep-text-size','xlarge');applyThemePreferences();closeModal()})()`);
   assert.equal(await page.evaluate(()=>document.documentElement.dataset.textSize),'xlarge',`${label}: the app's largest text size is on`);
   // a phone set to a larger text size on top of the app's largest (iPhone Larger Text): every size the app draws grows again
   if(mode==='phone')await page.evaluate(`(()=>{const s=document.documentElement.style;s.setProperty('--fs-mul','1.6');s.setProperty('--fs-floor','19px');s.setProperty('--fs-floor-small','16px');s.fontSize='21px'})()`);
   const found:string[]=[];
   for(const [n,js] of SWEEP){await page.evaluate(`(()=>{closeModal();scrollTo(0,0);${js}})()`);await page.waitForTimeout(n==='request-item'?600:300);for(const x of await page.evaluate(BUTTONS))found.push(`${n}: ${x}`);
    if(n==='shopping-mode'){await page.screenshot({path:`${out}/sweep-shopping-mode-${lang}-${mode}-${width}.png`});shots++;await page.evaluate(`document.querySelector('#main [data-flow="shop-exit"]')?.click()`)}}
   assert.deepEqual(found,[],`${label}: buttons keep their words inside, nothing wider than its card`);assert.deepEqual(errors,[],`${label}: no page errors`);
   await context.close();console.log(`PASS ${label}`)}
  console.log(`PASS v1.7.21 shopping list (${runs0} runs, ${shots} screenshots): steps inside the amount, quick view, extras aisle, no $0, item counts, store · suburb, meat drawing, Mua thêm + Nhờ mua thêm, 4 usual shops, button rows at the largest text sizes`);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
