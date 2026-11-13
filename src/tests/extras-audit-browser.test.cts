// v1.7.19 · audit fixes for extra items (“Mua thêm”, “Đồ dùng khác”, “Nhờ mua thêm”) and the Viết món unit (12 Nov 2026 audit,
// Sydney time). Each check fails on the v1.7.18 code:
//  C2  a catalogue suggestion keeps the unit the family chose (it turned “1 con” into “1 g”); an empty unit is filled.
//  A3/C3  quick pick of a family ingredient counted in con: no invented amount, unit con; a typed catalogue name gets its unit.
//  A4/C13  an empty price is saved as unknown (“Chưa rõ giá”), never a known 0.
//  A5  “Nhờ mua thêm” uses the same amount + unit picker and makes the same extra (ingredient, amount, unit, unknown price),
//      in the family's own week (a week that starts on Saturday here).
//  A6/B5  × asks first (Giữ lại first), then “Hoàn tác” puts the item back where it was; × is drawn and ≥ 44 px.
//  A8  shopping mode does not say “Đã mua đủ” while an extra is unticked.
//  A9/B6  ticked extras that are ingredients go into the pantry with “Cất đồ đã mua vào tủ” (old text-only extras too, unchanged
//      text); non-ingredients are named as not put away.
//  A10  with nothing ticked the aside link is disabled and says why.  A11  no hard-coded “58”.  A12  the skip sheet names the
//      button that is on screen.  B8  the extra's store sheet has the store list (with “Chưa chọn”), a note, “remember” and the
//      footer, like an ingredient's.
// Every run ends with validImport and a sync merge round trip (rule 33). Week starts on Saturday; EN runs use VND and a phone in
// Los Angeles time (rule 34). 320×740, 375×812, 820×1100, 1280×800, VI light / EN dark. Chromium viewport simulation, QA data.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const origin='https://kitchen.test',out='docs/reviews/v1.7.19/extras';mkdirSync(out,{recursive:true});
const mime:any={'.js':'application/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'};
const sizes:any={narrow:{width:320,height:740},mobile:{width:375,height:812},tablet:{width:820,height:1100},desktop:{width:1280,height:800}};
const GA='family-ing-ga-trong',EMOJI=/\p{Extended_Pictographic}/u;
(async()=>{
 const browser=await chromium.launch(process.env.BEP_CHROMIUM?{executablePath:process.env.BEP_CHROMIUM}:{});let shots=0;
 try{
  const runs:[string,string,string][]=[['mobile','vi','light'],['narrow','vi','light'],['tablet','vi','light'],['desktop','vi','light'],['mobile','en','dark'],['narrow','en','dark'],['tablet','en','dark'],['desktop','en','dark']];
  for(const [size,lang,theme] of runs){const label=`${size} ${lang} ${theme}`,vi=lang==='vi',tz=vi?'Australia/Sydney':'America/Los_Angeles',cur=vi?'AUD':'VND';
   const context=await browser.newContext({locale:'vi-VN',viewport:sizes[size],serviceWorkers:'block',reducedMotion:'reduce',colorScheme:theme as any,timezoneId:tz});
   await context.addInitScript(({lang,theme}:any)=>{if(sessionStorage.getItem('qa-init'))return;sessionStorage.setItem('qa-init','1');localStorage.setItem('bep-theme-mode',theme);localStorage.setItem('guest/bep-language',lang);localStorage.setItem('bep-local-locked','yes');localStorage.setItem('bep-guide-done','1')},{lang,theme});
   const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route(origin+'/**',async(r:any)=>{const u=new URL(r.request().url());if(u.pathname.startsWith('/.netlify/'))return r.fulfill({status:401,json:{error:'no'}});if(u.pathname==='/startup-scripts.json')return r.fulfill({json:JSON.parse(readFileSync('dist/startup-scripts.json','utf8'))});const f=resolve('dist',u.pathname==='/'?'index.html':u.pathname.slice(1));try{await r.fulfill({contentType:mime[extname(f)]||'application/octet-stream',body:readFileSync(f)})}catch{await r.fulfill({status:404,body:'Not found'})}});
   await page.goto(origin+'/#shopping',{waitUntil:'domcontentloaded'});
   const E=(s:string)=>page.evaluate(s) as Promise<any>;
   for(let i=0;;i++){try{await page.waitForFunction(()=>typeof (globalThis as any).openUnitSheet==='function'&&typeof (globalThis as any).familyRecipeEditor==='function'&&typeof (globalThis as any).requestItemForm==='function'&&document.querySelector('#main h1'),null,{timeout:20000});break}catch(e){if(i>3)throw e;await page.waitForTimeout(700)}}
   // QA family: week starts on Saturday, a family ingredient counted in con, the currency of the run, a planned dinner.
   const MILK:string=await E(`Object.keys(INGREDIENTS).find(k=>INGREDIENTS[k][1]==='ml'&&!/^family-ing-/.test(k))`);const MILKNAME:string=await E(`INGREDIENTS['${MILK}'][0]`);
   await E(`(()=>{state.preferences.onboardingComplete=true;state.preferences.weekStartDay=6;state.preferences.currency='${cur}';state.ingredientCatalog={...(state.ingredientCatalog||{}),'${GA}':{name:'Gà trống',unit:'con',group:'meat'}};hydrateFamilyIngredients(state);ensureDefaultStores?.(state);selectedDate=sydneyDate();weekStart=planStartOf(state,selectedDate);const w=currentWeek();w.extras=[];save();closeModal();view='shopping';location.hash='shopping';render()})()`);
   await page.waitForTimeout(250);
   assert.equal(await E(`new Date(planStartOf(state,sydneyDate())+'T12:00').getDay()`),6,`${label}: the week starts on Saturday`);
   const shot=async(n:string)=>{await E(`document.querySelector('#toast')&&(document.querySelector('#toast').className='')`);await page.waitForTimeout(80);await page.screenshot({path:`${out}/${n}-${lang}-${theme}-${sizes[size].width}x${sizes[size].height}.png`});shots++};
   const overflow=async(where:string)=>{const o=await E(`(()=>{const ms=[...document.querySelectorAll('#modal-root .modal')];return{doc:document.documentElement.scrollWidth-innerWidth,modal:Math.max(0,...ms.map(m=>m.scrollWidth-m.clientWidth))}})()`);assert.ok(o.doc<=1&&o.modal<=1,`${label} ${where}: no sideways overflow ${JSON.stringify(o)}`)};
   const noEmoji=async(sel:string,where:string)=>{const t=await page.locator(sel).first().innerText();assert.ok(!EMOJI.test(t),`${label} ${where}: no emoji: ${(t.match(/\p{Extended_Pictographic}/gu)||[]).join(' ')}`)};
   const pickUnit=async(btn:string,unit:string)=>{await page.locator(btn).click();const chip=page.locator(`#unit-sheet-layer .unit-chip[data-unit-choice="${unit}"]`).first();await page.locator('#unit-sheet-layer .unit-chip').first().waitFor();if(!(await chip.isVisible()))await page.locator('#unit-sheet-layer [data-unit-action="show-all"]').click();await chip.click();await page.locator('#unit-sheet-layer [data-unit-sheet-act="save"]').click();await page.locator('#unit-sheet-layer').waitFor({state:'detached'})};
   const roundTrip=async(where:string)=>{const ok=await E(`(()=>{const s=JSON.parse(JSON.stringify(state));const m=mergeFamilyStates(clone(s),clone(s),clone(s),{now:Date.now()}).state;return validImport(s)&&validImport(JSON.parse(JSON.stringify(m)))&&JSON.stringify(m.weeks)===JSON.stringify(s.weeks)})()`);assert.equal(ok,true,`${label} ${where}: validImport and sync merge round trip`)};

   // ---- C2: Viết món keeps the family's unit when a suggestion is picked
   await E(`familyRecipeEditor()`);await page.waitForSelector('#family-recipe-form .rc-ing-row');await page.waitForTimeout(150);
   const r0=page.locator('#rc-ing-list .rc-ing-row').first();await r0.locator('.rc-ing-name-input').fill('Gà');await r0.locator('.rc-ing-qty').fill('1');await pickUnit('#rc-ing-list .rc-ing-row:first-child .rc-ing-unit','con');
   await r0.locator('.rc-ing-name-input').fill('');await r0.locator('.rc-ing-name-input').pressSequentially(vi?'Thịt g':'chicken',{delay:10});const opt=page.locator('#rc-ing-list .rc-ing-row:first-child .rc-sug-opt').first();await opt.waitFor();await opt.click();
   assert.equal(await r0.locator('.rc-ing-unit').getAttribute('value'),'con',`${label}: C2 the chosen unit stays after picking a suggestion`);
   const r1=page.locator('#rc-ing-list .rc-ing-row').nth(1);await r1.locator('.rc-ing-name-input').pressSequentially(vi?'Thịt g':'chicken',{delay:10});const opt1=page.locator('#rc-ing-list .rc-ing-row:nth-child(2) .rc-sug-opt').first();await opt1.waitFor();await opt1.click();
   assert.ok(await r1.locator('.rc-ing-unit').getAttribute('value'),`${label}: C2 an empty unit is filled from the catalogue`);await E('closeModal()');

   // ---- A11 / A3 / C3 / A4 / C13: the add form
   const addBtn=page.locator('#main [data-action="add-extra"]').first();await addBtn.scrollIntoViewIfNeeded();await addBtn.click();await page.waitForSelector('#extra-form');
   const quick=await page.locator('label[for="extra-catalog-ing"]').innerText();assert.ok(!/\d/.test(quick),`${label}: A11 no hard-coded count (${quick})`);
   assert.equal(await page.locator('#extra-cost').inputValue(),'',`${label}: A4 the price starts empty`);assert.equal(await page.locator('#extra-cost').getAttribute('required'),null,'A4 price is optional');
   await page.selectOption('#extra-catalog-ing',GA);await page.waitForTimeout(80);
   assert.equal(await page.locator('#extra-amount').inputValue(),'',`${label}: C3 no invented amount`);assert.equal(await page.locator('#extra-unit').inputValue(),'con',`${label}: C3 the ingredient's unit (con), not g`);
   await page.fill('#extra-amount','1');await page.locator('#extra-amount').dispatchEvent('input');if(size==='mobile')await shot('add-quick-pick');
   await page.locator('#modal-root [data-action="submit-form"][data-id="extra-form"]').click();await page.waitForTimeout(200);
   const ga=await E(`currentWeek().extras.find(e=>e.name==='Gà trống')`);assert.ok(ga,`${label}: added`);assert.equal(ga.qty,'1 con');assert.equal(ga.ingredient,GA,'A9 linked to the ingredient');assert.equal(ga.amount,1);assert.equal(ga.unit,'con');assert.equal(ga.costUnknown,true,`${label}: A4 empty price is unknown`);assert.equal(ga.cost,0);
   assert.match(await page.locator(`#main .shop-row:has([data-id="${ga.id}"]) .price`).innerText(),vi?/Chưa rõ giá/:/(Chưa rõ giá|unknown|not known)/i,`${label}: C13 shows “Chưa rõ giá”, not 0`);
   // re-check 13 Nov 2026 (Henry, pop-up “Sửa luôn trong v1.7.19”): in English the quick pick fills the English name, keeps the
   // ingredient link, and the pantry hint is English
   {const EN_NAME:string=await E(`INGREDIENT_EN['${MILK}']||''`);await E(`(()=>{state.pantry=(state.pantry||[]).filter(p=>p.id!=='qa-milk-lot');state.pantry.push({id:'qa-milk-lot',ingredient:'${MILK}',qty:500,place:'fridge',expiry:'2099-01-01'});save()})()`);
    await addBtn.scrollIntoViewIfNeeded();await addBtn.click();await page.waitForSelector('#extra-form');await page.selectOption('#extra-catalog-ing',MILK);await page.waitForTimeout(80);
    const nm=await page.locator('#extra-name').inputValue(),hint=await page.locator('#extra-pantry-hint').innerText();
    if(vi){assert.equal(nm,MILKNAME,`${label}: VI name`);assert.match(hint,/Trong tủ đang có sẵn/,`${label}: VI hint`)}
    else{assert.ok(EN_NAME,'the milk has an English name');assert.equal(nm,EN_NAME,`${label}: EN quick pick fills the English name`);assert.match(hint,/The pantry already has/,`${label}: EN hint (${hint})`);assert.ok(!/Trong tủ|Kiểm tra/.test(hint),`${label}: no Vietnamese in the EN hint`)}
    await page.fill('#extra-amount','1');await page.locator('#extra-amount').dispatchEvent('input');await page.locator('#modal-root [data-action="submit-form"][data-id="extra-form"]').click();await page.waitForTimeout(200);
    const mk=await E(`currentWeek().extras.find(e=>e.ingredient==='${MILK}')`);assert.ok(mk&&mk.ingredient===MILK,`${label}: the ${vi?'Vietnamese':'English'} name keeps the ingredient link ${JSON.stringify(mk)}`);
    await E(`(()=>{const w=currentWeek();w.extras=w.extras.filter(e=>e.ingredient!=='${MILK}');state.pantry=state.pantry.filter(p=>p.id!=='qa-milk-lot');save();render()})()`)}
   // a typed catalogue name gets its own unit
   await addBtn.click();await page.waitForSelector('#extra-form');await page.fill('#extra-name',MILKNAME);await page.locator('#extra-name').dispatchEvent('input');await page.waitForTimeout(60);assert.equal(await page.locator('#extra-unit').inputValue(),'ml',`${label}: A3 typed ${MILKNAME} gets ml, not g`);await E('closeModal()');

   // ---- A5: “Nhờ mua thêm” makes the same extra, in the family's own week
   await E(`requestItemForm()`);await page.waitForSelector('#errand-form #errand-amount');assert.equal(await page.locator('#errand-form #errand-unit-btn').count(),1,`${label}: A5 the same unit picker`);
   await page.fill('#errand-item','Gà trống');await page.locator('#errand-item').dispatchEvent('input');await page.fill('#errand-amount','2');await page.locator('#errand-amount').dispatchEvent('input');await page.waitForTimeout(60);
   assert.equal(await page.locator('#errand-unit').inputValue(),'con');if(size==='mobile')await shot('errand-form');
   /* v1.7.19 A24: who is asking is chosen, never assumed */if(await page.locator('#errand-from').inputValue()==='')await page.selectOption('#errand-from',await E('state.members[0].id'));
   await page.locator('#modal-root [data-action="submit-form"][data-id="errand-form"]').click().catch(async()=>{await E(`document.getElementById('errand-form').requestSubmit()`)});await page.waitForTimeout(400);
   const er=await E(`(()=>{const k=planStartOf(state,sydneyDate());const e=(currentWeek().extras||[]).find(x=>x.errandId);return e?{e,k,day:new Date(k+'T12:00').getDay(),cur:weekStart===k,stray:Object.keys(state.weeks).filter(x=>new Date(x+'T12:00').getDay()!==1)}:null})()`);
   assert.ok(er,`${label}: A5 the request is in the family's week`);assert.equal(er.day,6,'week starting Saturday');assert.equal(er.cur,true,'shown on the week the app opens');assert.deepEqual(er.stray,[],'no stray week stored under a non-Monday key');assert.equal(er.e.qty,'2 con');assert.equal(er.e.ingredient,GA);assert.equal(er.e.amount,2);assert.equal(er.e.unit,'con');assert.equal(er.e.costUnknown,true);
   await E(`(()=>{closeModal();view='shopping';location.hash='shopping';render()})()`);await page.waitForTimeout(200);

   // ---- A6 / B5: × asks, keep first, then undo puts it back at the same place
   await E(`(()=>{const w=currentWeek();w.extras.push({id:'qa-paper',name:'Giấy ăn',qty:'2 gói',cost:3,currency:'${cur}',done:false},{id:'qa-milk-old',name:'${MILKNAME}',qty:'2 l',cost:4,currency:'${cur}',done:false});save();render()})()`);await page.waitForTimeout(150);
   const order0:string[]=await E(`currentWeek().extras.map(e=>e.id)`);const x=page.locator('#main [data-action="delete-extra"][data-id="qa-paper"]');
   const xb=await x.evaluate((b:any)=>({svg:!!b.querySelector('svg.btn-art'),h:b.getBoundingClientRect().height,w:b.getBoundingClientRect().width}));assert.ok(xb.svg&&xb.h>=43.5&&xb.w>=43.5,`${label}: A6 × drawn, ≥ 44 px ${JSON.stringify(xb)}`);
   await x.click();await page.waitForSelector('[data-action="delete-extra-confirm"]');assert.match(await page.locator('#modal-title').innerText(),vi?/Bỏ Giấy ăn khỏi giỏ\?/:/Take Giấy ăn off the list\?/);
   const foot:string[]=await E(`[...document.querySelectorAll('#modal-root .modal>.modal-footer>button')].map(b=>b.dataset.action)`);assert.deepEqual(foot,['close-modal','delete-extra-confirm'],`${label}: keep comes first`);await noEmoji('#modal-root .modal','delete sheet');await overflow('delete sheet');
   await shot('delete-extra');await page.locator('#modal-root .modal-footer [data-action="close-modal"]').click();await page.waitForTimeout(100);assert.equal(await E(`currentWeek().extras.some(e=>e.id==='qa-paper')`),true,'Giữ lại keeps it');
   await x.click();await page.locator('[data-action="delete-extra-confirm"]').click();await page.waitForTimeout(150);assert.equal(await E(`currentWeek().extras.some(e=>e.id==='qa-paper')`),false,'removed');
   await page.locator('#undo-bar button').click();await page.waitForTimeout(150);assert.deepEqual(await E(`currentWeek().extras.map(e=>e.id)`),order0,`${label}: A6 Hoàn tác puts it back where it was`);

   // ---- A10: nothing ticked → the aside link is disabled with a reason; A12: the skip sheet names the on-screen button
   const aside=await E(`(()=>{const b=[...document.querySelectorAll('#main aside [data-action="store-purchases"],#main aside .text-btn')].find(x=>/Cất đồ|Put/.test(x.textContent));return b?{dis:b.disabled,why:document.getElementById('store-purchases-why')?.textContent||''}:null})()`);
   if(aside){assert.equal(aside.dis,true,`${label}: A10 disabled when nothing is ticked`);assert.ok(aside.why.length>5,'A10 says why')}
   else assert.equal(await page.locator('#main [data-action="store-purchases"]:not([disabled])').count(),0,`${label}: A10 no live put-away control with nothing ticked`);
   const skip=page.locator('#main [data-action="skip-row"]').first();if(await skip.count()){const lab=(await E(`(()=>{const b=document.querySelector('#main [data-action="check-pantry"]');return (b?.innerText||'')/* re-check 13 Nov 2026: the words on screen; the aria-label made this test unable to fail */.replace(/\\s*\\(\\d+\\)\\s*$/,'').replace(/^[^\\p{L}]+/u,'').trim()})()`)) as string;
    await skip.click();await page.waitForSelector('#modal-root .modal');const t=await page.locator('#modal-root .modal-content').innerText();assert.ok(lab&&t.includes(lab),`${label}: A12 names “${lab}” (${t.slice(-140)})`);assert.ok(!/Kiểm tra đồ đã có \/ bỏ qua|Check pantry \/ skipped items/.test(t),'A12 old label gone');await E('closeModal()')}

   // ---- B8: the extra's store sheet is the full one
   await page.locator(`#main [data-planning="extra-store"][data-id="qa-paper"]`).click();await page.waitForSelector('#extra-store-form');
   for(const s of ['#extra-item-store','#extra-store-note','#extra-store-form input[name="remember"]'])assert.equal(await page.locator(s).count(),1,`${label}: B8 ${s}`);
   assert.equal(await page.locator('#modal-root .modal>.modal-footer [data-id="extra-store-form"]').count(),1,'B8 footer save');await overflow('store sheet');if(size==='mobile'||size==='desktop')await shot('extra-store-sheet');
   const sid:string=await E(`sortedFrequentStores(state)[0].id`);await page.selectOption('#extra-item-store',sid);await page.fill('#extra-store-note','quầy QA');await page.locator('#extra-store-form input[name="remember"]').uncheck();await page.locator('#modal-root .modal-footer [data-id="extra-store-form"]').click();await page.waitForTimeout(150);
   let p=await E(`currentWeek().extras.find(e=>e.id==='qa-paper')`);assert.equal(p.storeId,sid);assert.equal(p.storeNote,'quầy QA');assert.match(await page.locator(`#main [data-planning="extra-store"][data-id="qa-paper"]`).innerText(),/quầy QA/);
   await page.locator(`#main [data-planning="extra-store"][data-id="qa-paper"]`).click();await page.waitForSelector('#extra-store-form');await page.selectOption('#extra-item-store','');await page.locator('#modal-root .modal-footer [data-id="extra-store-form"]').click();await page.waitForTimeout(150);
   p=await E(`currentWeek().extras.find(e=>e.id==='qa-paper')`);assert.ok(!p.storeId,`${label}: B8 the store can be cleared`);

   // ---- A8: shopping mode waits for the extras
   await E(`(()=>{const[s,e]=shopDates(),w=currentWeek();for(const r of shopping(state,w,s,e))if(shoppingHasAmount(r)&&!r.skip)setShoppingBought(w,s,e,r,true);for(const x of w.extras)x.done=x.id!=='qa-paper';save();setShopMode(true);render()})()`);await page.waitForTimeout(200);
   const bar=await page.locator('.shop-mode-bar small').first().innerText();assert.ok(!/Đã mua đủ|All bought/.test(bar),`${label}: A8 not “all bought” with an extra left (${bar})`);assert.match(bar,vi?/còn 1 \//:/1 of/);
   if(size==='mobile')await shot('shop-mode-extra-left');await E(`(()=>{setShopMode(false);render()})()`);

   // ---- A9 / B6: ticked extras go into the pantry
   await E(`(()=>{const w=currentWeek(),[s,e]=shopDates();for(const r of shopping(state,w,s,e))setShoppingBought(w,s,e,r,false);for(const x of w.extras)x.done=true;save();render()})()`);await page.waitForTimeout(150);
   const pantry0=await E(`state.pantry.length`);const put=page.locator('#main [data-action="store-purchases"]:not([disabled])').first();assert.ok(await put.count(),`${label}: A9 “Cất đồ đã mua vào tủ” offered for ticked extras`);
   await put.scrollIntoViewIfNeeded();await put.click();await page.waitForSelector('#store-form');const names:string[]=await E(`[...document.querySelectorAll('#store-form .store-row-extra .store-name')].map(x=>x.textContent)`);
   assert.ok(names.some(n=>n.includes('Gà trống'))&&names.some(n=>n.includes(MILKNAME)),`${label}: A9 extras listed (${names})`);assert.match(await page.locator('.store-extra-skipped').innerText(),/Giấy ăn/,'A9 non-ingredients named as not put away');
   await noEmoji('#modal-root .modal-content','store sheet');await overflow('put-away sheet');await shot('put-away-extras');
   await page.locator('#modal-root .modal-footer [data-id="store-form"]').click();await page.waitForTimeout(250);
   const after=await E(`(()=>{const w=currentWeek();return{n:state.pantry.length,ga:state.pantry.filter(p=>p.ingredient==='${GA}').map(p=>p.qty),milk:state.pantry.filter(p=>p.ingredient==='${MILK}').map(p=>p.qty),old:w.extras.find(e=>e.id==='qa-milk-old'),stored:w.extras.filter(e=>e.storedOn).length}})()`);
   assert.ok(after.ga.includes(1)&&after.ga.includes(2),`${label}: A9 Gà trống 1 + 2 con in the pantry (${after.ga}) ${JSON.stringify(await E("currentWeek().extras"))} ${await E("weekStart")} ${await E("planStartOf(state,sydneyDate())")}`);assert.ok(after.milk.includes(2000),`${label}: A9 the old “2 l” extra became 2000 ml (${after.milk})`);assert.equal(after.old.qty,'2 l','old text unchanged');assert.equal(after.old.amount,undefined,'old extra not rewritten');
   assert.equal(after.n-pantry0,3);assert.equal(after.stored,3);assert.equal(await page.locator('#main [data-action="store-purchases"]:not([disabled])').count(),0,`${label}: nothing left to put away (no second time)`);
   assert.ok(await page.locator('#main .extra-stored').count()>=3,'rows say they were put away');
   await roundTrip('end');
   assert.deepEqual(errors,[],`${label}: no page errors`);await context.close();
  }
  console.log(`Extras audit browser QA passed (${runs.length} runs, ${shots} screenshots).`);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
