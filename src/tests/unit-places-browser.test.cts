// v1.7.19 · Henry's answers, 12 Nov 2026 (Sydney time, pop-up):
//  1. “Đổi cả 3 chỗ”: the receipt line unit, the notes-import unit and the voice recipe preview use the shared unit picker (rule 29).
//     A family unit WITH a conversion goes into the pantry through it; a unit WITHOUT one is kept as a bought lot in that unit (no
//     guessed grams, rule 6).
//  2. “Như recommend, nhưng nếu user cố tình mua dư thì hỏi để cất vào pantry”: a ticked extra counts towards the planned row of the
//     same ingredient (the row says “Đủ” or what is still short, nothing is bought twice); buying more than the list needs asks
//     whether the extra part goes into the pantry, and the put-away sheet follows the answer.
// Each check fails on the code before these answers. Week starts on Saturday; EN runs use VND and a phone in Los Angeles time.
// 320×740, 375×812, 820×1100, 1280×800, VI light / EN dark; validImport + sync merge round trip at the end of every run.
// Chromium viewport simulation with QA data in device-only mode, not physical devices.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const origin='https://kitchen.test',out='docs/reviews/v1.7.19/unit-places';mkdirSync(out,{recursive:true});
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
   for(let i=0;;i++){try{await page.waitForFunction(()=>typeof (globalThis as any).openUnitSheet==='function'&&typeof (globalThis as any).receiptEditor==='function'&&typeof (globalThis as any).notesImporter==='function'&&document.querySelector('#main h1'),null,{timeout:20000});break}catch(e){if(i>3)throw e;await page.waitForTimeout(700)}}
   const MILK:string=await E(`Object.keys(INGREDIENTS).find(k=>INGREDIENTS[k][1]==='ml'&&!/^family-ing-/.test(k))`);
   // QA family: week from Saturday, a rooster counted in con, a family unit “túi QA” = 500 ml for the milk-like ingredient.
   await E(`(()=>{state.preferences.onboardingComplete=true;state.preferences.weekStartDay=6;state.preferences.currency='${cur}';state.ingredientCatalog={...(state.ingredientCatalog||{}),'${GA}':{name:'Gà trống',unit:'con',group:'meat'}};hydrateFamilyIngredients(state);ensureDefaultStores?.(state);state.customUnits=[{id:'cu-qa-tui',name:'túi QA',base:'ml',perBase:500,ingredient:'${MILK}',createdAt:new Date().toISOString()}];selectedDate=sydneyDate();weekStart=planStartOf(state,selectedDate);currentWeek().extras=[];save();closeModal();view='shopping';location.hash='shopping';render()})()`);
   await page.waitForTimeout(200);
   const shot=async(n:string)=>{await E(`document.querySelector('#toast')&&(document.querySelector('#toast').className='')`);await page.waitForTimeout(80);await page.screenshot({path:`${out}/${n}-${lang}-${theme}-${sizes[size].width}x${sizes[size].height}.png`});shots++};
   const overflow=async(where:string)=>{const o=await E(`(()=>{const ms=[...document.querySelectorAll('#modal-root .modal')];return{doc:document.documentElement.scrollWidth-innerWidth,modal:Math.max(0,...ms.map(m=>m.scrollWidth-m.clientWidth))}})()`);assert.ok(o.doc<=1&&o.modal<=1,`${label} ${where}: no sideways overflow ${JSON.stringify(o)}`)};
   const noEmoji=async(sel:string,where:string)=>{const t=await page.locator(sel).first().innerText();assert.ok(!EMOJI.test(t),`${label} ${where}: no emoji: ${(t.match(/\p{Extended_Pictographic}/gu)||[]).join(' ')}`)};
   const sugg=()=>E(`[...document.querySelectorAll('#unit-sheet-layer .unit-suggest .unit-chip')].filter(c=>c.offsetParent).map(c=>c.dataset.unitChoice)`) as Promise<string[]>;
   const pick=async(btn:any,unit:string,where:string,snap='')=>{await btn.click();await page.locator('#unit-sheet-layer .unit-chip').first().waitFor();assert.equal(await page.locator('#modal-root .modal').count(),2,`${label} ${where}: the picker opens over the sheet`);
    const pills=await E(`[...document.querySelectorAll('#unit-sheet-layer .modal-footer>button')].map(b=>!!b.querySelector('svg.sheet-art'))`);assert.deepEqual(pills,[true,true],`${label} ${where}: Đóng / Lưu pills`);await overflow(where+' picker');await noEmoji('#unit-sheet-layer',where+' picker');if(snap)await shot(snap);
    const chip=page.locator(`#unit-sheet-layer .unit-chip[data-unit-choice="${unit}"]`).first();if(!(await chip.isVisible()))await page.locator('#unit-sheet-layer [data-unit-action="show-all"]').click();await chip.click();await page.locator('#unit-sheet-layer [data-unit-sheet-act="save"]').click();await page.locator('#unit-sheet-layer').waitFor({state:'detached'})};
   const roundTrip=async(where:string)=>{const ok=await E(`(()=>{const s=JSON.parse(JSON.stringify(state));const m=mergeFamilyStates(clone(s),clone(s),clone(s),{now:Date.now()}).state;return validImport(s)&&validImport(JSON.parse(JSON.stringify(m)))&&JSON.stringify(m.weeks)===JSON.stringify(s.weeks)&&JSON.stringify(m.pantry)===JSON.stringify(s.pantry)})()`);assert.equal(ok,true,`${label} ${where}: validImport and sync merge round trip`)};

   // ======== 1a. Receipt line unit ========
   await E(`(()=>{newReceipt();receiptDraft.store='QA';receiptDraft.total=34;receiptDraft.items=[{id:'l1',label:'GA TRONG',total:20,match:'${GA}',qty:1,unit:'',confidence:'confirmed'},{id:'l2',label:'MILK BAG',total:6,match:'${MILK}',qty:2,unit:'',confidence:'confirmed'},{id:'l3',label:'GA NET BAG',total:8,match:'${GA}',qty:1,unit:'',confidence:'confirmed'}];receiptEditor();const mb=document.getElementById('receipt-mark-bought');if(mb)mb.checked=false})()`);
   const line=(i:number)=>page.locator(`#modal-root .receipt-line[data-index="${i}"]`);await line(0).waitFor();
   assert.equal(await page.locator('#modal-root select.receipt-unit').count(),0,`${label}: no plain unit list on receipt lines`);
   await line(0).locator('.unit-field-btn').click();await page.locator('#unit-sheet-layer .unit-chip').first().waitFor();assert.equal((await sugg())[0],'con',`${label}: a receipt line for Gà trống suggests con first`);
   await page.locator('#unit-sheet-layer [data-unit-action="show-all"]').click();assert.ok(await page.locator('#unit-sheet-layer .unit-chip-group[data-group="own"] .unit-chip[data-unit-choice="pack"]').count(),'“gói / hộp chưa rõ lượng” stays available');await page.keyboard.press('Escape');
   await pick(line(0).locator('.unit-field-btn'),'con','receipt line',size==='mobile'||size==='desktop'?'receipt-unit-picker':'');
   await pick(line(1).locator('.unit-field-btn'),'túi QA','receipt family unit');await pick(line(2).locator('.unit-field-btn'),'túi','receipt no conversion');
   assert.deepEqual(await E(`[...document.querySelectorAll('#modal-root .receipt-line .receipt-unit')].map(x=>x.value)`),['con','túi QA','túi']);
   await overflow('receipt editor');if(size==='mobile')await shot('receipt-lines');
   await E(`saveReceipt(true)`);await page.waitForTimeout(300);
   const rec=await E(`(()=>{const r=state.receipts.find(x=>x.store==='QA');return r?{id:r.id,units:r.items.map(i=>i.enteredUnit)}:null})()`);assert.ok(rec,`${label}: receipt saved`);assert.deepEqual(rec.units,['con','túi QA','túi'],'units stored as chosen');
   const applied=await E(`(()=>{const RL=globalThis.ReceiptList,w=currentWeek(),rc=state.receipts.find(x=>x.id==='${rec.id}'),p=RL.plan(state,rc,w,weekStart,addDays(weekStart,6));const before=state.pantry.length;RL.apply(state,rc,w,weekStart,addDays(weekStart,6),null,{});save();const lots=state.pantry.slice(before).map(l=>({i:l.ingredient,q:l.qty,u:l.purchase?.unit||null,a:l.purchase?.amount??null}));return{lots,noConv:p.rows.filter(r=>r.noConv).map(r=>r.units),unknown:p.unknown.length}})()`);
   assert.ok(applied.lots.some((l:any)=>l.i===MILK&&l.q===1000&&!l.u),`${label}: 2 túi QA (1 túi ≈ 500 ml) go into the pantry as 1000 ml ${JSON.stringify(applied.lots)}`);
   assert.ok(applied.lots.some((l:any)=>l.i===GA&&l.u==='túi'&&l.a===1&&l.q===0),`${label}: 1 túi of Gà trống (no conversion) is a bought lot “1 túi”, no grams ${JSON.stringify(applied.lots)}`);
   assert.deepEqual(applied.noConv,['túi']);assert.equal(applied.unknown,0,'nothing left “unknown”');
   await E('closeModal()');await roundTrip('receipt');

   // ======== 1b. Notes import unit ========
   await E(`notesImporter('Gà trống 2\\nSữa QA 3')`);await page.locator('[data-feature="notes-preview"]').click();await page.waitForSelector('#notes-preview-rows .note-import-row');
   assert.equal(await page.locator('#notes-preview-rows select.note-unit').count(),0,`${label}: no plain unit list in the notes import`);
   const nrow=(i:number)=>page.locator(`#notes-preview-rows .note-import-row[data-index="${i}"]`);
   await nrow(0).locator('.note-match').selectOption(GA);await nrow(0).locator('.note-qty').fill('2');await nrow(1).locator('.note-match').selectOption(MILK);await nrow(1).locator('.note-qty').fill('3');
   await nrow(0).locator('.unit-field-btn').click();await page.locator('#unit-sheet-layer .unit-chip').first().waitFor();assert.equal((await sugg())[0],'con',`${label}: notes row for Gà trống suggests con`);await page.keyboard.press('Escape');
   await pick(nrow(0).locator('.unit-field-btn'),'con','notes row',size==='mobile'?'notes-unit-picker':'');await pick(nrow(1).locator('.unit-field-btn'),'túi QA','notes family unit');
   await overflow('notes import');if(size==='mobile')await shot('notes-rows');
   await page.locator('#modal-root .modal-footer .btn.primary').click();await page.waitForTimeout(250);
   const notes=await E(`(()=>{const w=currentWeek(),recs=Object.values(w.buyingUnits||{}).map(sc=>sc['${MILK}']).filter(Boolean),ex=w.extras.find(e=>e.ingredient==='${MILK}'&&e.unit==='túi QA');return{rec:recs[0]||null,exQty:ex?extraBaseQty(ex).qty:null}})()`);
   assert.ok(notes.rec?.basePerUnit===500||notes.exQty===1500,`${label}: 3 túi QA from a note are counted through 1 túi ≈ 500 ml ${JSON.stringify(notes)} ${await E("document.querySelector('#toast')?.textContent")} ${JSON.stringify(await E("currentWeek().extras"))} ${await E("!!document.querySelector('#notes-preview-rows')")}`);
   await roundTrip('notes');

   // ======== 1c. Voice recipe preview ========
   await E(`familyRecipeEditor()`);await page.waitForSelector('#family-recipe-form');await page.locator('[data-vr="open"]').click();await page.waitForSelector('#vr-text');
   await page.fill('#vr-text',vi?'Gà luộc QA. Nguyên liệu: gà trống 1 con, muối 1 muỗng cà phê. Cách làm: luộc gà 40 phút.':'Boiled chicken QA. Ingredients: chicken 500 grams, salt 1 teaspoon. Method: boil the chicken for 40 minutes.');
   await page.locator('[data-vr="review"]').click();await page.waitForSelector('.vr-ing');
   assert.equal(await page.locator('.vr-ing input.vr-ing-unit[list]').count(),0,`${label}: no typed unit box with a list in the voice preview`);
   const vr0=page.locator('.vr-ing').filter({has:page.locator('input.vr-ing-unit:not([value=""])')}).first();const heard=await vr0.locator('.vr-ing-unit').inputValue();assert.ok(heard,`${label}: the heard unit is kept as written (${heard})`);
   await pick(vr0.locator('.unit-field-btn'),'muỗng canh','voice preview',size==='mobile'||size==='desktop'?'voice-unit-picker':'');
   assert.equal(await vr0.locator('.vr-ing-unit').inputValue(),'muỗng canh');assert.match(await vr0.locator('.unit-field-btn').innerText(),vi?/muỗng canh/:/tablespoon/);
   await overflow('voice preview');await E('closeModal()');await page.waitForTimeout(100);

   // ======== 2. A bought extra counts towards the planned row ========
   await E(`(()=>{const w=currentWeek(),d=Object.keys(w.days).find(x=>x>=selectedDate)||Object.keys(w.days)[0],m=w.days[d].dinner;const r=clone(state.recipes.find(x=>x.id==='r1')||state.recipes[0]);r.id='qa-ga-luoc';r.name='Gà luộc (QA)';r.custom=true;r.ingredients=[{id:'${GA}',qty:1}];m.recipes=[r];m.cooked=false;state.pantry=state.pantry.filter(p=>p.ingredient!=='${GA}');w.extras=[];save();view='shopping';render()})()`);
   await page.waitForTimeout(150);
   const need=await E(`(()=>{const[s,e]=shopDates();return shopping(state,currentWeek(),s,e).find(r=>r.id==='${GA}')?.missing||0})()`);assert.ok(need>=1,`${label}: Gà trống is on the list (${need})`);
   // partial: one less than the list needs → still short
   if(need>1){await E(`(()=>{currentWeek().extras=[{id:'qa-x1',name:'Gà trống',qty:'${need-1} con',amount:${need-1},unit:'con',ingredient:'${GA}',cost:0,costUnknown:true,currency:'${cur}',done:true}];save();render()})()`);await page.waitForTimeout(100);
    assert.match(await page.locator(`#main .shop-row:has(input[data-change="bought"][data-id="${GA}"]) .extra-covers`).innerText(),vi?/còn thiếu/:/still short/,`${label}: a smaller extra leaves the row short`)}
   // exactly enough → “Đủ”, ticked by the extra, not bought twice
   await E(`(()=>{currentWeek().extras=[{id:'qa-x1',name:'Gà trống',qty:'${need} con',amount:${need},unit:'con',ingredient:'${GA}',cost:0,costUnknown:true,currency:'${cur}',done:true}];save();render()})()`);await page.waitForTimeout(120);
   const rowSel=`#main .shop-row:has(input[data-change="bought"][data-id="${GA}"])`;
   assert.match(await page.locator(`${rowSel} .extra-covers`).innerText(),vi?/^Đủ/:/^Enough/,`${label}: the row says Đủ`);
   assert.equal(await page.locator(`${rowSel} input[data-change="bought"]`).isChecked(),true,'the row counts as bought');assert.equal(await page.locator(`${rowSel} input[data-change="bought"]`).isDisabled(),true,'it is ticked by the extra');
   assert.equal(await E(`(()=>{const[s,e]=shopDates();const r=shopping(state,currentWeek(),s,e).find(r=>r.id==='${GA}');return !!r.boughtByExtra})()`),true);
   await page.locator(rowSel).scrollIntoViewIfNeeded();await shot('row-covered-by-extra');
   // bought more than the list needs → asked; the answer drives the put-away sheet
   await E(`(()=>{currentWeek().extras=[{id:'qa-x1',name:'Gà trống',qty:'${need+1} con',amount:${need+1},unit:'con',ingredient:'${GA}',cost:0,costUnknown:true,currency:'${cur}',done:false}];save();render()})()`);await page.waitForTimeout(100);
   const tick=page.locator('#main input[data-change="extra-done"][data-id="qa-x1"]');await tick.scrollIntoViewIfNeeded();await tick.check();await page.waitForSelector('[data-planning="extra-surplus"]');
   assert.match(await page.locator('#modal-title').innerText(),vi?/Mua dư Gà trống\?/:/Bought more Gà trống\?/,`${label}: asked about the extra part`);assert.match(await page.locator('#modal-root .modal-content').innerText(),/1 con|1 whole/);
   await overflow('surplus question');await noEmoji('#modal-root .modal','surplus question');await shot('surplus-question');
   const y0=await E('scrollY');await page.locator('[data-planning="extra-surplus"][data-choice="skip"]').click();await page.waitForTimeout(150);assert.equal(await E(`currentWeek().extras[0].surplus`),'skip');assert.equal(await E('scrollY'),y0,'the page stays still (rule 24)');
   await tick.uncheck();await page.waitForTimeout(80);await tick.check();await page.waitForTimeout(150);assert.equal(await page.locator('[data-planning="extra-surplus"]').count(),0,'asked once');
   const put=page.locator('#main [data-action="store-purchases"]:not([disabled])').first();await put.scrollIntoViewIfNeeded();await put.click();await page.waitForSelector('#store-form');
   assert.equal(await page.locator(`#store-form input[name="place-${GA}"]`).count(),0,`${label}: the planned row is not put away a second time`);
   const keep=page.locator('#store-form input[name="surplus-x-qa-x1"]');assert.equal(await keep.isChecked(),false,`${label}: the answer “Không cất phần dư” is shown`);await overflow('put-away');if(size==='mobile')await shot('put-away-surplus');
   const p0=await E('state.pantry.length');await page.locator('#modal-root .modal-footer [data-id="store-form"]').click();await page.waitForTimeout(250);
   const lots=await E(`state.pantry.slice(${p0}).filter(p=>p.ingredient==='${GA}').map(p=>p.qty)`);assert.deepEqual(lots,[need],`${label}: only what the menu needs is put away (${lots})`);
   // changing the answer at put-away: keep the extra part
   await E(`(()=>{state.pantry=state.pantry.filter(p=>p.ingredient!=='${GA}');currentWeek().extras=[{id:'qa-x2',name:'Gà trống',qty:'${need+1} con',amount:${need+1},unit:'con',ingredient:'${GA}',cost:0,costUnknown:true,currency:'${cur}',done:true,surplus:'skip'}];save();render()})()`);await page.waitForTimeout(100);
   await page.locator('#main [data-action="store-purchases"]:not([disabled])').first().click();await page.waitForSelector('#store-form');await page.locator('#store-form input[name="surplus-x-qa-x2"]').check();await page.locator('#modal-root .modal-footer [data-id="store-form"]').click();await page.waitForTimeout(250);
   assert.deepEqual(await E(`state.pantry.filter(p=>p.ingredient==='${GA}').map(p=>p.qty)`),[need+1],`${label}: ticking “Cất cả phần dư” puts the whole amount away`);assert.equal(await E(`currentWeek().extras[0].surplus`),'pantry');
   await roundTrip('end');
   assert.deepEqual(errors,[],`${label}: no page errors`);await context.close();
  }
  console.log(`Unit places + extras-on-the-list browser QA passed (${runs.length} runs, ${shots} screenshots).`);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
