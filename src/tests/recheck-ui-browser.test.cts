// v1.7.19 re-check of the audit fixes (13 Nov 2026, Sydney time): the items the re-check left open, fixed and tapped here.
//  A1 note — both buttons on Đi chợ that open the pantry sheet carry one name, “Kiểm tra đồ trong tủ (n)”, and n is what it lists.
//  B12 — So Giá pack units show the shared unit registry's words (VI and EN) while the stored values stay g/kg/mL/L/each/wash/roll/
//        sheet; a value from older data (tab) is kept. Tủ → Thêm thực phẩm and the barcode sheet take the amount in any unit through
//        the shared unit picker: kg → g converted, a family unit with a conversion → a bought lot plus the converted amount, a unit
//        without one → a bought lot in that unit with no guessed grams; counted units keep ¼ steps (Henry, 13 Nov: “Giữ bước ¼”).
//  B16 — removing a meal and clearing a dictated transcript never open the browser's confirm(); both offer “Hoàn tác”; deleting a
//        pantry lot offers “Hoàn tác” and brings back the same lot; the app writes “Xoá” / “Huỷ”.
//  B19 — a bought lot's amount is written like the other pantry amounts (2½ túi, not 2.5 / 2.37); portions say “suất” with a
//        decimal comma in Vietnamese, as on the meal cards.
// Every run: week starting on Saturday, EN runs in VND with the phone in Los Angeles time; validImport + sync merge round trip at
// the end. 320×740, 375×812, 820×1100, 1280×800; VI light and EN dark. Chromium viewport simulation, not physical devices.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const origin='https://kitchen.test',out='docs/reviews/v1.7.19/recheck-ui';mkdirSync(out,{recursive:true});
const mime:any={'.js':'application/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'};
const sizes:any={narrow:{width:320,height:740},mobile:{width:375,height:812},tablet:{width:820,height:1100},desktop:{width:1280,height:800}};
const EMOJI=/\p{Extended_Pictographic}/u;
(async()=>{
 const browser=await chromium.launch(process.env.BEP_CHROMIUM?{executablePath:process.env.BEP_CHROMIUM}:{});let shots=0,runs0=0;
 try{
  const runs:[string,string,string][]=[['mobile','vi','light'],['narrow','vi','light'],['tablet','vi','light'],['desktop','vi','light'],['mobile','en','dark'],['narrow','en','dark'],['tablet','en','dark'],['desktop','en','dark']];
  for(const [size,lang,theme] of runs){const label=`${size} ${lang} ${theme}`,vi=lang==='vi',tz=vi?'Australia/Sydney':'America/Los_Angeles',cur=vi?'AUD':'VND';
   const context=await browser.newContext({locale:'vi-VN',viewport:sizes[size],serviceWorkers:'block',reducedMotion:'reduce',colorScheme:theme as any,timezoneId:tz});
   await context.addInitScript(({lang,theme}:any)=>{if(sessionStorage.getItem('qa-init'))return;sessionStorage.setItem('qa-init','1');localStorage.setItem('bep-theme-mode',theme);localStorage.setItem('guest/bep-language',lang);localStorage.setItem('bep-local-locked','yes');localStorage.setItem('bep-guide-done','1')},{lang,theme});
   const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
   const dialogs:string[]=[];page.on('dialog',(d:any)=>{dialogs.push(d.message());d.dismiss().catch(()=>{})});
   await page.route(origin+'/**',async(r:any)=>{const u=new URL(r.request().url());if(u.pathname.startsWith('/.netlify/'))return r.fulfill({status:401,json:{error:'no'}});if(u.pathname==='/startup-scripts.json')return r.fulfill({json:JSON.parse(readFileSync('dist/startup-scripts.json','utf8'))});const f=resolve('dist',u.pathname==='/'?'index.html':u.pathname.slice(1));try{await r.fulfill({contentType:mime[extname(f)]||'application/octet-stream',body:readFileSync(f)})}catch{await r.fulfill({status:404,body:'Not found'})}});
   await page.goto(origin+'/#pantry',{waitUntil:'domcontentloaded'});
   const E=(s:string)=>page.evaluate(s) as Promise<any>;
   for(let i=0;;i++){try{await page.waitForFunction(()=>typeof (globalThis as any).openUnitSheet==='function'&&typeof (globalThis as any).KitchenExtras==='object'&&typeof (globalThis as any).voiceRecipeOpen==='function'&&document.querySelector('#main h1'),null,{timeout:20000});break}catch(e){if(i>3)throw e;await page.waitForTimeout(700)}}
   const MILK:string=await E(`Object.keys(INGREDIENTS).find(k=>INGREDIENTS[k][1]==='ml'&&!/^family-ing-/.test(k))`);
   assert.equal(await E(`INGREDIENTS.pork[1]`),'g');assert.equal(await E(`INGREDIENTS.egg[1]`),'quả');
   // QA family: week from Saturday, the family unit “túi QA” = 500 ml for a milk-like ingredient, no pantry yet.
   await E(`(()=>{state.preferences.onboardingComplete=true;state.preferences.weekStartDay=6;state.preferences.currency='${cur}';state.customUnits=[{id:'cu-qa-tui',name:'túi QA',base:'ml',perBase:500,ingredient:'${MILK}',createdAt:new Date().toISOString()}];state.pantry=[];selectedDate=sydneyDate();weekStart=planStartOf(state,selectedDate);save();closeModal();view='pantry';location.hash='pantry';render()})()`);
   await page.waitForTimeout(200);
   const shot=async(n:string)=>{await E(`document.querySelector('#toast')&&(document.querySelector('#toast').className='')`);await page.waitForTimeout(80);await page.screenshot({path:`${out}/${n}-${lang}-${theme}-${sizes[size].width}x${sizes[size].height}.png`});shots++};
   const overflow=async(where:string)=>{const o=await E(`(()=>{const ms=[...document.querySelectorAll('#modal-root .modal')];return{doc:document.documentElement.scrollWidth-innerWidth,modal:Math.max(0,...ms.map(m=>m.scrollWidth-m.clientWidth))}})()`);assert.ok(o.doc<=1&&o.modal<=1,`${label} ${where}: no sideways overflow ${JSON.stringify(o)}`)};
   const noEmoji=async(sel:string,where:string)=>{const t=await page.locator(sel).first().innerText();assert.ok(!EMOJI.test(t),`${label} ${where}: no emoji: ${(t.match(/\p{Extended_Pictographic}/gu)||[]).join(' ')}`)};
   const pickUnit=async(field:string,unit:string,where:string)=>{const b=page.locator(`#modal-root #${field}-btn`);assert.ok((await b.boundingBox())!.height>=44,`${label} ${where}: the unit button is a 44 px target`);await b.click();await page.locator('#unit-sheet-layer .unit-chip').first().waitFor();
    assert.equal(await page.locator('#modal-root .modal').count(),2,`${label} ${where}: the shared picker opens over the sheet`);
    let chip=page.locator(`#unit-sheet-layer .unit-chip[data-unit-choice="${unit}"]`).first();if(!(await chip.isVisible().catch(()=>false))){await page.locator('#unit-sheet-layer [data-unit-action="show-all"]').click();chip=page.locator(`#unit-sheet-layer .unit-chip[data-unit-choice="${unit}"]`).first()}
    await chip.click();await page.locator('#unit-sheet-layer [data-unit-sheet-act="save"]').click();await page.waitForTimeout(120);assert.equal(await E(`document.getElementById('${field}').value`),unit,`${label} ${where}: ${unit} chosen`)};
   const lot=(f:string)=>E(`(()=>{const l=state.pantry.find(${f});return l?JSON.parse(JSON.stringify(l)):null})()`);

   // ── B12: Tủ → Thêm thực phẩm in any unit ─────────────────────────────────────────────────────────────────────────────
   const addStock=async(ing:string,qty:string,unit:string|null,where:string,snap='')=>{await E(`closeModal()`);await page.locator('#main [data-action="add-stock"]').first().click();await page.locator('#modal-root #stock-form').waitFor();
    assert.equal(await E(`document.getElementById('stock-unit').value`),'',`${label} ${where}: no unit before an ingredient is chosen (rule 32)`);
    await page.selectOption('#stock-ing',ing);await page.waitForTimeout(80);assert.equal(await E(`document.getElementById('stock-unit').value`),await E(`INGREDIENTS['${ing}'][1]`),`${label} ${where}: the ingredient's own unit to start with`);
    if(unit)await pickUnit('stock-unit',unit,where);await page.fill('#stock-qty',qty);if(snap){await overflow(snap);await noEmoji('#modal-root .modal',snap);await shot(snap)}
    await page.locator('#modal-root [data-action="submit-form"][data-id="stock-form"]').click();await page.waitForTimeout(200);assert.equal(await page.locator('#modal-root #stock-form').count(),0,`${label} ${where}: saved and closed`)};
   await addStock('pork','1.5','kg','pork in kg','stock-form-kg');
   let l=await lot(`p=>p.ingredient==='pork'`);assert.ok(l&&l.qty===1500&&!l.purchase,`${label}: 1.5 kg of pork is 1500 g in the pantry ${JSON.stringify(l)}`);
   await addStock('pork','2','hộp','pork in boxes');
   l=await lot(`p=>p.ingredient==='pork'&&p.purchase`);assert.ok(l&&l.qty===0&&l.purchase.unit==='hộp'&&l.purchase.amount===2&&l.purchase.basePerUnit===null,`${label}: 2 hộp without a conversion is a bought lot with no guessed grams ${JSON.stringify(l)}`);
   await addStock(MILK,'3','túi QA','milk in the family unit');
   l=await lot(`p=>p.ingredient==='${MILK}'`);assert.ok(l&&l.qty===1500&&l.purchase?.unit==='túi QA'&&l.purchase.basePerUnit===500,`${label}: 3 túi QA × 500 ml through the family's conversion ${JSON.stringify(l)}`);
   // counted units keep ¼ steps
   await E(`closeModal()`);await page.locator('#main [data-action="add-stock"]').first().click();await page.locator('#modal-root #stock-form').waitFor();await page.selectOption('#stock-ing','egg');await page.waitForTimeout(80);
   assert.equal(await page.locator('#stock-qty').getAttribute('step'),'0.25',`${label}: eggs in quả go by ¼`);await pickUnit('stock-unit','kg',"eggs by the kilo");assert.equal(await page.locator('#stock-qty').getAttribute('step'),'0.01',`${label}: kg goes by 0.01`);
   await pickUnit('stock-unit','chục','eggs by the ten');assert.equal(await page.locator('#stock-qty').getAttribute('step'),'0.25',`${label}: chục is counted, ¼ steps`);
   await page.fill('#stock-qty','1.5');await page.locator('#modal-root [data-action="submit-form"][data-id="stock-form"]').click();await page.waitForTimeout(200);
   l=await lot(`p=>p.ingredient==='egg'`);assert.ok(l&&l.purchase?.unit==='chục'&&l.purchase.amount===1.5&&l.qty===15,`${label}: 1½ chục = 15 quả through the fixed conversion ${JSON.stringify(l)}`);
   // B19: the bought lot reads like the other pantry amounts
   const card=await E(`[...document.querySelectorAll('#main .stock-qty')].map(e=>e.innerText).join(' | ')`);assert.match(card,/1½ /,`${label}: “1½ chục” on the pantry card, not 1.5 (${card})`);assert.ok(!/\d\.\d\d? (hộp|chục|box|ten)/.test(card),`${label}: no decimal point on counted lots (${card})`);
   if(size==='mobile'||size==='desktop'){await E(`[...document.querySelectorAll('#main .stock-qty')].find(e=>/chục|ten/.test(e.innerText))?.scrollIntoView({block:'center'})`);await shot('pantry-lots')}

   // ── B16: deleting a pantry lot comes back with “Hoàn tác” ───────────────────────────────────────────────────────────
   const pid:string=await E(`state.pantry.find(p=>p.ingredient==='pork'&&!p.purchase).id`);const n0:number=await E(`state.pantry.length`);
   await E(`stockForm('${pid}')`);await page.locator('#modal-root [data-action="delete-stock-dialog"]').click();await page.locator('#modal-root [data-action="delete-stock-confirm"]').waitFor();
   const sheet=await page.locator('#modal-root .modal').innerText();assert.match(sheet,vi?/Xoá lô/:/Delete/,`${label}: “Xoá” spelling`);assert.ok(!/Xóa|Hủy/.test(sheet),`${label}: no “Xóa / Hủy” (${sheet})`);
   await page.locator('#modal-root [data-action="delete-stock-confirm"]').click();await page.waitForTimeout(150);assert.equal(await E(`state.pantry.length`),n0-1,`${label}: the lot is gone`);
   const bar=page.locator('#undo-bar button');assert.equal(await bar.count(),1,`${label}: “Hoàn tác” after deleting a lot`);assert.ok((await bar.boundingBox())!.height>=44,'undo is a 44 px target');
   if(size==='mobile')await shot('lot-undo');await bar.click();await page.waitForTimeout(150);l=await lot(`p=>p.id==='${pid}'`);assert.ok(l&&l.qty===1500,`${label}: the same lot is back ${JSON.stringify(l)}`);

   // ── B12: barcode sheet in any unit ──────────────────────────────────────────────────────────────────────────────────
   await E(`closeModal();KitchenExtras.gotCode('9300000000017')`);await page.locator('#modal-root #scan-ing').waitFor();
   await page.selectOption('#scan-ing',MILK);await page.waitForTimeout(80);assert.equal(await E(`document.getElementById('scan-unit').value`),'ml',`${label}: the scan starts on the ingredient's unit`);
   await pickUnit('scan-unit','túi QA','barcode');await page.fill('#scan-qty','2');await overflow('barcode');await noEmoji('#modal-root .modal','barcode');await shot('barcode-unit');
   await page.locator('#modal-root [data-kx="scan-save"]').click();await page.waitForTimeout(200);
   l=await lot(`p=>p.barcode==='9300000000017'`);assert.ok(l&&l.qty===1000&&l.purchase?.unit==='túi QA'&&l.purchase.basePerUnit===500,`${label}: 2 túi QA scanned = 1000 ml ${JSON.stringify(l)}`);
   await E(`KitchenExtras.gotCode('9300000000024')`);await page.locator('#modal-root #scan-ing').waitFor();await page.selectOption('#scan-ing','pork');await pickUnit('scan-unit','khay','barcode tray');await page.fill('#scan-qty','1');await page.locator('#modal-root [data-kx="scan-save"]').click();await page.waitForTimeout(200);
   l=await lot(`p=>p.barcode==='9300000000024'`);assert.ok(l&&l.qty===0&&l.purchase?.unit==='khay'&&l.purchase.basePerUnit===null,`${label}: a tray without a conversion keeps no guessed grams ${JSON.stringify(l)}`);

   // ── A1 note: one name for the buttons that open the pantry sheet, and the number is what it lists ───────────────────
   await E(`(()=>{closeModal();const w=currentWeek(),day=w.days[selectedDate]||Object.values(w.days)[0];const r=clone(state.recipes.find(x=>x.ingredients.some(i=>i.id==='pork'))||state.recipes[0]);r.id='qa-dish';r.custom=true;day.dinner.recipes=[r];day.dinner.cooked=false;view='shopping';location.hash='shopping';save();render()})()`);
   await page.waitForTimeout(250);
   const btns=await E(`[...document.querySelectorAll('#main [data-action="check-pantry"]')].map(b=>({t:b.innerText.replace(/\\s+/g,' ').trim(),n:+((b.textContent.match(/\\((\\d+)\\)/)||[])[1]??-1)}))`);
   assert.ok(btns.length>=2,`${label}: both pantry buttons on Đi chợ (${JSON.stringify(btns)})`);assert.equal(new Set(btns.map((b:any)=>b.t)).size,1,`${label}: the buttons use one name ${JSON.stringify(btns)}`);
   assert.match(btns[0].t,vi?/Đồ trong tủ|Kiểm tra đồ trong tủ/:/Pantry|Check the pantry/,`${label}: named “Đồ trong tủ” (${btns[0].t})`);
   await page.locator('#main [data-action="check-pantry"]').last().scrollIntoViewIfNeeded();await page.locator('#main [data-action="check-pantry"]').last().click();await page.waitForSelector('.modal .section-mini');await page.waitForTimeout(120);
   const listed=await E(`document.querySelectorAll('.modal label.shop-row').length+document.querySelectorAll('.modal .pantry-check-lot').length`);assert.ok(listed>0&&btns.every((b:any)=>b.n===listed),`${label}: every button shows what the sheet lists (${listed}): ${JSON.stringify(btns)}`);
   // every lot is in the list above here, so the sheet must not call the pantry empty (rule 31)
   const rest=await page.locator('.modal [data-pantry-rest-none]').innerText().catch(()=>'');assert.ok(!/Tủ đang trống|pantry is empty/.test(rest),`${label}: the pantry is not called empty (${rest})`);if(size==='mobile')await shot('pantry-sheet');await E('closeModal()');

   // ── B19: portions say “suất” with a decimal comma in Vietnamese ─────────────────────────────────────────────────────
   assert.equal(await E(`portionNumber(3.15)`),vi?'3,15':'3.15');assert.equal(await E(`recipePortionLabel({name:'x',ingredients:[]},4)`),vi?'4 suất':'4 portions');

   // ── B16: removing a meal — no confirm(), “Hoàn tác” brings it back with its dishes (bar, and inside the “Bữa ±” sheet) ──
   await E(`(()=>{closeModal();view='planner';location.hash='planner';render()})()`);await page.waitForTimeout(300);
   const date:string=await E(`selectedDate`);const day=page.locator(`#main details.plan-day[data-plan-day="${date}"]`);await day.waitFor();await E(`document.querySelector('#main details.plan-day[data-plan-day="${date}"]').open=true`);
   const dishes=async()=>E(`(ensureWeek(state,monday('${date}')).days['${date}'].dinner.recipes||[]).map(r=>r.id)`);assert.deepEqual(await dishes(),['qa-dish']);
   await day.locator('.pd-meals').click();const tog=page.locator(`#modal-root [data-plan-meal-toggle="dinner"]`);await tog.waitFor();const top0=await E(`document.querySelector('#modal-root [data-plan-meal-toggle=breakfast]').getBoundingClientRect().top`);await tog.uncheck();await page.waitForTimeout(250);
   assert.deepEqual(dialogs,[],`${label}: no browser confirm() when a meal is removed`);assert.deepEqual(await dishes(),[],`${label}: dinner removed`);
   const inSheet=page.locator('#modal-root [data-plan-meal-toggle="dinner"]').locator('xpath=..').locator('[data-fm-undo-meal]');assert.equal(await inSheet.count(),1,`${label}: “Hoàn tác” inside the Bữa ± sheet`);assert.ok(Math.abs(top0-(await E(`document.querySelector('#modal-root [data-plan-meal-toggle=breakfast]').getBoundingClientRect().top`)))<=1,`${label}: removing a meal in the sheet does not move it (rule 24)`);assert.ok((await inSheet.boundingBox())!.height>=44,'undo in the sheet is 44 px');
   await overflow('meals sheet');await noEmoji('#modal-root .modal','meals sheet');await shot('meal-removed-undo');
   const y0=await E('scrollY');await inSheet.click();await page.waitForTimeout(250);assert.deepEqual(await dishes(),['qa-dish'],`${label}: dinner and its dish are back`);assert.equal(await E(`!!document.querySelector('#modal-root [data-plan-meal-toggle="dinner"]').checked`),true,`${label}: the sheet shows dinner on again`);
   assert.ok(Math.abs((await E('scrollY'))-y0)<=2,`${label}: undo does not move the page (rule 24)`);
   await E('closeModal()');

   // ── B16: clearing a dictated transcript — no confirm(), “Hoàn tác” inside the sheet ─────────────────────────────────
   await E(`voiceRecipeOpen()`);await page.locator('#modal-root #vr-text').waitFor();const said=vi?'Canh bí đỏ cho 4 người, 500 gam bí đỏ, rồi nấu 20 phút':'Pumpkin soup for 4, 500 grams pumpkin, then cook 20 minutes';
   await page.fill('#vr-text',said);await page.locator('#modal-root [data-vr="clear"]').click();await page.waitForTimeout(120);
   assert.deepEqual(dialogs,[],`${label}: no browser confirm() when the transcript is cleared`);assert.equal(await page.locator('#vr-text').inputValue(),'',`${label}: cleared`);
   const vu=page.locator('#modal-root #vr-undo [data-vr="undo-clear"]');assert.equal(await vu.count(),1,`${label}: “Hoàn tác” in the dictation sheet`);assert.ok((await vu.boundingBox())!.height>=44,'transcript undo is 44 px');
   assert.match(await page.locator('#modal-root #vr-undo').innerText(),vi?/Đã xoá lời đọc/:/Transcript cleared/);await overflow('dictation');await shot('transcript-undo');
   await vu.click();await page.waitForTimeout(100);assert.equal(await page.locator('#vr-text').inputValue(),said,`${label}: the words are back`);assert.equal(await E(`vrState.text`),said,`${label}: and kept as the draft`);
   assert.ok(!/Xóa|Hủy/.test(await page.locator('#modal-root .modal').innerText()),`${label}: “Xoá” spelling in the dictation sheet`);await E('closeModal()');

   // ── B12: So Giá pack units in the family's words; stored values unchanged; an old value kept ─────────────────────────
   await E(`(()=>{closeModal();scoutConfirm(scoutNewDraft())})()`);await page.locator('#modal-root #scout-pack-unit').waitFor();
   const opts=await E(`[...document.querySelectorAll('#scout-pack-unit option')].map(o=>[o.value,o.textContent])`);
   assert.deepEqual(opts.map((o:any)=>o[0]),['','g','kg','mL','L','each','wash','roll','sheet'],`${label}: stored values unchanged`);
   const words=opts.slice(1).map((o:any)=>o[1]);assert.deepEqual(words,vi?['g','kg','ml','lít','cái','lần giặt','cuộn','tờ']:['g','kg','mL','L','each','wash','roll','sheet'],`${label}: the registry's words (${words})`);
   await overflow('So Giá form');if(size==='mobile'||size==='desktop'){await page.locator('#scout-pack-unit').scrollIntoViewIfNeeded();await shot('scout-units')}
   const old=await E(`(()=>{closeModal();scoutConfirm(scoutNewDraft({label:'Viên rửa bát QA',price:12,packQty:30,packUnit:'tab',units:30}));const s=document.querySelector('#scout-pack-unit');return{v:s.value,t:s.selectedOptions[0]?.textContent}})()`);
   assert.equal(old.v,'tab',`${label}: an older “tab” value stays chosen, so saving keeps it`);assert.equal(old.t,vi?'viên':'tablet',`${label}: and reads in the family's words`);await E('closeModal()');

   // ── rule 33: whatever was saved loads back and merges ───────────────────────────────────────────────────────────────
   assert.equal(await E(`validImport(JSON.parse(JSON.stringify(state)))`),true,`${label}: validImport after the changes`);
   const merged=await E(`(()=>{const a=JSON.parse(JSON.stringify(state)),b=JSON.parse(JSON.stringify(state));const st=mergeFamilyStates(clone(a),clone(a),clone(b),{now:Date.now()}).state;return{ok:validImport(JSON.parse(JSON.stringify(st))),lots:st.pantry.length,n:state.pantry.length}})()`);
   assert.ok(merged.ok&&merged.lots===merged.n,`${label}: sync merge keeps every lot ${JSON.stringify(merged)}`);
   assert.deepEqual(errors,[],`${label}: no page errors`);runs0++;await context.close()}
  console.log(`recheck-ui browser: ${runs0} runs (320/375/820/1280, VI light, EN dark), ${shots} screenshots in ${out}`);
 }finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
