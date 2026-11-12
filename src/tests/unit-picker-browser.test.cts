// v1.7.18 buying-unit sheet — owner, 12 Nov 2026 (Sydney time): “lượng có rất nhiều nên cần thể hiện màn hình để chọn và show ra
// cách hợp lý nhất … Có nên cho lựa chọn tự cho thêm lượng vào không?” — pop-ups: “Gợi ý + Xem tất cả”, custom units with an optional
// conversion. Checks: suggestions without tapping “Đổi”, kg for an ingredient counted in con (no invented conversion), the
// counted wheel steps 1, 2, 3, “Xem tất cả” with every group and the search, the “nắm (ước chừng)” label, adding a family unit
// with a conversion that is suggested next time, hiding it, chip taps that do not move the page or the sheet (rule 24), sheet
// footer pills (rule 25), words-only secondary buttons (rule 27), no emoji, ≥ 44 px targets and no sideways overflow at
// 320×740, 375×812, 820×1100 and 1280×800 in VI / EN, light / dark. Chromium viewport simulation, device-only mode, QA data.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const origin='https://kitchen.test',out='docs/reviews/v1.7.18/unit-picker';mkdirSync(out,{recursive:true});
const mime:any={'.js':'application/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'};
const sizes:any={narrow:{width:320,height:740},mobile:{width:375,height:812},tablet:{width:820,height:1100},desktop:{width:1280,height:800}};
const GA='family-ing-ga-ta',EMOJI=/\p{Extended_Pictographic}/u;
(async()=>{
 const browser=await chromium.launch(process.env.BEP_CHROMIUM?{executablePath:process.env.BEP_CHROMIUM}:{});let shots=0;
 try{
  const runs:[string,string,string][]=[['mobile','vi','light'],['narrow','vi','light'],['tablet','vi','light'],['desktop','vi','light'],['mobile','en','dark'],['narrow','en','dark'],['tablet','en','dark'],['desktop','en','dark'],['mobile','vi','dark'],['mobile','en','light']];
  for(const [size,lang,theme] of runs){const label=`${size} ${lang} ${theme}`,vi=lang==='vi',full=theme==='light'&&lang==='vi'||theme==='dark'&&lang==='en';
   const context=await browser.newContext({locale:'vi-VN',viewport:sizes[size],serviceWorkers:'block',reducedMotion:'reduce',colorScheme:theme as any,timezoneId:'Australia/Sydney'});
   await context.addInitScript(({lang,theme}:any)=>{if(sessionStorage.getItem('qa-init'))return;sessionStorage.setItem('qa-init','1');localStorage.setItem('bep-theme-mode',theme);localStorage.setItem('guest/bep-language',lang);localStorage.setItem('bep-local-locked','yes');localStorage.removeItem('guest/bep-recent-units')},{lang,theme});
   const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route(origin+'/**',async(r:any)=>{const u=new URL(r.request().url());if(u.pathname.startsWith('/.netlify/'))return r.fulfill({status:401,json:{error:'no'}});if(u.pathname==='/startup-scripts.json')return r.fulfill({json:JSON.parse(readFileSync('dist/startup-scripts.json','utf8'))});const f=resolve('dist',u.pathname==='/'?'index.html':u.pathname.slice(1));try{await r.fulfill({contentType:mime[extname(f)]||'application/octet-stream',body:readFileSync(f)})}catch{await r.fulfill({status:404,body:'Not found'})}});
   await page.goto(origin+'/#shopping',{waitUntil:'domcontentloaded'});
   const E=(s:string)=>page.evaluate(s) as Promise<any>;
   for(let i=0;;i++){try{await page.waitForFunction(()=>typeof (globalThis as any).suggestedBuyingUnits==='function'&&typeof (globalThis as any).openPurchasePicker==='function'&&document.querySelector('#main h1'),null,{timeout:20000});break}catch(e){if(i>3)throw e;await page.waitForTimeout(700)}}
   // QA plan: one dinner with a family ingredient counted in “con” (a whole chicken) and a reference dish.
   await E(`(()=>{state.preferences.onboardingComplete=true;state.ingredientCatalog={...(state.ingredientCatalog||{}),'${GA}':{name:'Gà ta',unit:'con',group:'meat'}};hydrateFamilyIngredients(state);const w=currentWeek();const day=w.days[selectedDate]||Object.values(w.days)[0];const r=clone(state.recipes.find(x=>x.id==='r1')||state.recipes[0]);r.id='qa-ga-luoc';r.name='Gà luộc (QA)';r.custom=true;r.ingredients=[{id:'${GA}',qty:0.25},...r.ingredients.slice(0,2)];day.dinner.recipes=[r];day.dinner.cooked=false;save();closeModal();view='shopping';render()})()`);
   await page.waitForTimeout(250);
   const btn=page.locator(`#main [data-action="purchase-quantity"][data-id="${GA}"]`);await btn.first().waitFor({timeout:8000});
   const open=async()=>{await btn.first().scrollIntoViewIfNeeded();await btn.first().click();await page.waitForSelector('.unit-suggest .unit-chip');await page.waitForTimeout(120)};
   const shot=async(n:string)=>{await page.screenshot({path:`${out}/${n}-${lang}-${theme}-${sizes[size].width}x${sizes[size].height}.png`});shots++};
   const overflow=async(where:string)=>{const o=await E(`(()=>{const m=document.querySelector('.modal');return{doc:document.documentElement.scrollWidth-innerWidth,modal:m?m.scrollWidth-m.clientWidth:0,wide:[...document.querySelectorAll('.modal *')].filter(e=>e.offsetParent&&e.getBoundingClientRect().right>innerWidth+1).map(e=>e.className||e.tagName).slice(0,4)}})()`);assert.ok(o.doc<=1&&o.modal<=1&&!o.wide.length,`${label} ${where}: no sideways overflow ${JSON.stringify(o)}`)};
   const targets=async(sel:string,where:string)=>{const small=await E(`[...document.querySelectorAll(${JSON.stringify(sel)})].filter(e=>e.offsetParent&&(e.getBoundingClientRect().height<43.5||e.getBoundingClientRect().width<43.5)).map(e=>e.textContent.trim())`);assert.deepEqual(small,[],`${label} ${where}: ≥ 44 px targets`)};
   const noEmoji=async(where:string)=>{const t=await page.locator('.modal').innerText();assert.ok(!EMOJI.test(t),`${label} ${where}: no emoji in the sheet: ${(t.match(/\p{Extended_Pictographic}/gu)||[]).join(' ')}`)};
   const keepsPlace=async(sel:string,where:string)=>{const loc=page.locator(sel).first();await loc.evaluate((e:any)=>e.scrollIntoView({block:'center'}));await page.waitForTimeout(60);const before=await loc.evaluate((e:any)=>e.getBoundingClientRect().top),y=await E('scrollY');await loc.click();await page.waitForTimeout(150);const after=await page.locator(sel).first().evaluate((e:any)=>e.getBoundingClientRect().top);
    assert.equal(await E('scrollY'),y,`${label} ${where}: the page does not move`);assert.ok(Math.abs(after-before)<=1.5,`${label} ${where}: the tapped control stays where it was (${before} → ${after}, rule 24)`)};

   // 1. Suggestions straight away — no folded “Đổi” section; kg / g for a chicken counted in con.
   await open();
   assert.equal(await page.locator('.modal details.unit-change').count(),0,`${label}: no folded unit section`);
   const sug:string[]=await E(`[...document.querySelectorAll('.unit-suggest .unit-chip')].filter(c=>c.offsetParent).map(c=>c.dataset.unitChoice)`);
   assert.ok(sug.length>=6&&sug.length<=9,`${label}: 6–8 suggested units shown (${sug})`);for(const u of ['con','kg','g','miếng','khay'])assert.ok(sug.includes(u),`${label}: ${u} is suggested for Gà ta (${sug})`);
   assert.equal(await page.locator('.unit-suggest .unit-chip[data-unit-choice="con"]').getAttribute('aria-pressed'),'true','the recipe unit is chosen');
   assert.match(await page.locator('#unit-suggest-title').innerText(),vi?/Mua Gà ta theo/:/Buy .* by/);
   assert.equal(await page.locator('#purchase-unit-choice').count(),0,`${label}: the full list waits for “Xem tất cả”`);
   const more=page.locator('[data-unit-action="show-all"]');assert.match(await more.innerText(),vi?/Xem tất cả đơn vị \(\d+\)/:/See all units \(\d+\)/);
   assert.equal(await more.evaluate((b:any)=>!!b.querySelector('.btn-art,svg')),false,`${label}: “Xem tất cả” is words only (rule 27)`);
   assert.equal(await page.locator('.unit-suggest-actions [data-unit-choice="__custom"]').evaluate((b:any)=>!!b.querySelector('.btn-art,svg')),false,`${label}: “Tự thêm đơn vị” is words only (rule 27)`);
   await targets('.unit-suggest .unit-chip,.unit-suggest-actions .btn','suggestions');await overflow('suggestions');await noEmoji('suggestions');
   // rule 25: footer pills side by side with their drawings; the sheet X is drawn
   const foot=await E(`(()=>{const bs=[...document.querySelectorAll('.modal>.modal-footer>button')].map(b=>b.getBoundingClientRect());const save=document.querySelector('.modal-footer [data-action="save-purchase-quantity"]');return{n:bs.length,tops:bs.map(r=>Math.round(r.top)),hs:bs.map(r=>Math.round(r.height)),art:!!save?.querySelector('svg.sheet-art'),x:!!document.querySelector('.modal>header .close-x-btn svg')}})()`);
   assert.ok(foot.n===2&&Math.abs(foot.tops[0]-foot.tops[1])<=2&&Math.abs(foot.hs[0]-foot.hs[1])<=2,`${label}: footer buttons side by side, same size ${JSON.stringify(foot)}`);assert.ok(foot.art&&foot.x,`${label}: Lưu and X keep their drawings`);
   // counted wheel steps 0, 1, 2, 3 … (it had jumped 0 → 50)
   const wheel:number[]=await E('purchasePicker.values.slice(0,5)');assert.deepEqual(wheel,[0,1,2,3,4],`${label}: the con wheel steps one at a time`);
   if(full||size==='mobile')await shot('suggest');

   // 2. Tap kg: the chip stays put, the purchase stays in kg, the con conversion is not invented.
   await E(`(()=>{const m=document.querySelector('.modal'),c=document.querySelector('.unit-suggest');m.scrollTop+=Math.max(0,c.getBoundingClientRect().top-m.getBoundingClientRect().top-140)})()`);await page.waitForTimeout(80);
   await keepsPlace('.unit-suggest .unit-chip[data-unit-choice="kg"]','tap kg');
   assert.equal(await page.locator('.unit-suggest .unit-chip[data-unit-choice="kg"]').getAttribute('aria-pressed'),'true');
   assert.equal(await E('purchasePicker.basePerUnit'),null,`${label}: no conversion invented for kg of a chicken`);
   assert.match(await page.locator('label[for="buying-per-unit"]').innerText(),vi?/1 con ≈ bao nhiêu kg/:/1 con ≈ how many kg/);
   await page.fill('#weight-exact','1.6');await page.locator('#weight-exact').dispatchEvent('change');await page.waitForTimeout(80);
   assert.equal(await page.locator('#purchase-chosen-qty').innerText(),'1.6 kg',`${label}: amount shown in kg`);
   assert.match(await page.locator('#purchase-shortage').innerText(),vi?/Chưa biết 1 con bằng bao nhiêu kg/:/not known how many kg make 1 con/);
   if(full||size==='mobile')await shot('kg-unknown');
   // a tap on con brings back the counted wheel; keep it in place too
   await keepsPlace('.unit-suggest .unit-chip[data-unit-choice="con"]','tap con');assert.deepEqual(await E('purchasePicker.values.slice(0,4)'),[0,1,2,3]);

   // 3. “Xem tất cả”: every group, base count unit under “Đếm”, search, nắm label; the button stays where it was.
   await keepsPlace('[data-unit-action="show-all"]','open the full list');await page.waitForSelector('#purchase-unit-choice .unit-chip');
   assert.equal(await page.locator('[data-unit-action="show-all"]').getAttribute('aria-expanded'),'true');
   const groups:any=await E(`Object.fromEntries([...document.querySelectorAll('#purchase-unit-choice .unit-chip-group')].map(g=>[g.dataset.group,[...g.querySelectorAll('.unit-chip')].map(c=>c.dataset.unitChoice)]))`);
   for(const k of ['measure','count','container','produce','other'])assert.ok(groups[k]?.length,`${label}: full list has ${k}`);
   assert.ok(groups.measure.includes('kg')&&groups.measure.includes('g')&&!groups.measure.includes('con'),`${label}: Cân/đo has kg/g and not con (${groups.measure})`);assert.ok(groups.count.includes('con'),`${label}: con is listed under Đếm`);
   const nam=await page.locator('#purchase-unit-choice .unit-chip[data-unit-choice="nắm"]').innerText();assert.match(nam.replace(/\s+/g,' '),vi?/nắm \(ước chừng\)/:/handful \(approx\.\)/,`${label}: approximate note separated (${nam})`);
   await page.fill('#unit-search',vi?'lo':'jar');await page.waitForTimeout(60);const vis:string[]=await E(`[...document.querySelectorAll('#purchase-unit-choice .unit-chip')].filter(c=>!c.hidden&&c.offsetParent).map(c=>c.dataset.unitChoice)`);assert.ok(vis.includes('lọ'),`${label}: search finds lọ (${vis})`);
   await page.fill('#unit-search','');await page.waitForTimeout(60);
   await targets('#purchase-unit-choice .unit-chip,#unit-search','full list');await overflow('full list');await noEmoji('full list');
   const box=await E(`(()=>{const b=document.querySelector('#purchase-unit-choice');return b.scrollWidth-b.clientWidth})()`);assert.ok(box<=1,`${label}: the list does not scroll sideways`);
   // keyboard: arrows move between chips inside the full list and inside the suggestions
   await page.locator('#purchase-unit-choice .unit-chip-group[data-group="container"] .unit-chip').first().focus();const k1=await E('document.activeElement.dataset.unitChoice');await page.keyboard.press('ArrowRight');assert.notEqual(await E('document.activeElement.dataset.unitChoice'),k1,'ArrowRight moves in the list');
   await page.locator('.unit-suggest .unit-chip').first().focus();await page.keyboard.press('ArrowRight');assert.equal(await E('document.activeElement.closest(".unit-suggest")!==null'),true,'ArrowRight stays in the suggestions');
   // a chip tap deep in the list keeps its place (list and sheet)
   await page.locator('#purchase-unit-choice').evaluate((b:any)=>{b.scrollTop=b.scrollHeight});await page.waitForTimeout(60);
   const deepSel='#purchase-unit-choice .unit-chip-group[data-group="container"] .unit-chip[data-unit-choice="hộp"]';await page.locator(deepSel).scrollIntoViewIfNeeded();await keepsPlace(deepSel,'tap a chip in the full list');
   assert.equal(await E('purchasePicker.unit'),'hộp');
   if(full||size==='mobile')await shot('all-units');

   // 4. Family unit with a conversion: saved for the family, suggested next time, shown under “Đơn vị của nhà mình”.
   if(size==='mobile'||size==='narrow'&&lang==='vi'){
    await page.locator('.unit-suggest-actions [data-unit-choice="__custom"]').click();await page.waitForSelector('#purchase-custom-unit');
    assert.equal(await E('document.activeElement.id'),'purchase-custom-unit','focus goes to the unit name');
    await page.fill('#purchase-custom-unit','nửa con');await page.fill('#custom-unit-per','0.5');await page.selectOption('#custom-unit-base','con');await page.locator('#custom-unit-per').dispatchEvent('input');
    assert.equal(await page.locator('#custom-conv-name').innerText(),'nửa con');await overflow('custom unit form');await targets('#purchase-custom-unit,#custom-unit-per,#custom-unit-base','custom unit form');await noEmoji('custom unit form');
    if(size==='mobile')await shot('custom-unit');
    await page.fill('#weight-exact','2');await page.locator('[data-action="save-purchase-quantity"]').click();await page.waitForTimeout(200);
    const saved=await E(`({cu:state.customUnits,rec:Object.values(currentWeek().buyingUnits).map(r=>r['${GA}']).find(Boolean)})`);
    assert.equal(saved.cu.length,1);assert.equal(saved.cu[0].name,'nửa con');assert.equal(saved.cu[0].base,'con');assert.equal(saved.cu[0].perBase,0.5);assert.equal(saved.cu[0].ingredient,GA);
    assert.equal(saved.rec.unit,'nửa con');assert.equal(saved.rec.amount,2);assert.equal(saved.rec.basePerUnit,0.5,'conversion typed by the family is used');
    assert.equal(await E('validImport(JSON.parse(JSON.stringify(state)))'),true,'state with the family unit is valid');
    await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>typeof (globalThis as any).openPurchasePicker==='function'&&document.querySelector('#main h1'),null,{timeout:20000});await E(`view='shopping';render()`);await page.waitForTimeout(250);
    assert.equal(await E(`state.customUnits?.[0]?.name`),'nửa con','the family unit is still there after reopening the app');
    await open();const sug2:string[]=await E(`[...document.querySelectorAll('.unit-suggest .unit-chip')].map(c=>c.dataset.unitChoice)`);assert.ok(sug2.includes('nửa con'),`${label}: the family unit is suggested next time (${sug2})`);
    assert.equal(await page.locator('.unit-suggest .unit-chip[data-unit-choice="nửa con"]').getAttribute('aria-pressed'),'true');
    await more.click();await page.waitForSelector('.unit-chip-group[data-group="family"]');assert.match(await page.locator('.unit-chip-group[data-group="family"]').innerText(),/1 nửa con ≈ 0\.5 con/);
    await page.fill('#unit-search','nua');await page.waitForTimeout(60);assert.ok(await page.locator('.unit-chip-group[data-group="family"] .unit-chip[data-unit-choice="nửa con"]').isVisible(),'search finds the family unit');await page.fill('#unit-search','');
    const hide=page.locator('.unit-chip-group[data-group="family"] [data-unit-action="hide-custom"]');assert.equal(await hide.evaluate((b:any)=>!!b.querySelector('svg')),false,'hide is words only');await targets('.unit-hide-btn','hide button');
    await keepsPlace('.unit-chip-group[data-group="family"] [data-custom-id]','hide a family unit');assert.equal(await E('state.customUnits[0].hidden'),true);assert.equal(await page.locator('.unit-chip-group[data-group="family"] [data-unit-action="show-custom"]').count(),1,'can be shown again');
    if(size==='mobile')await shot('family-units');
    await page.evaluate('closeModal()');
    // after hiding, a purchase in another unit no longer gets it suggested; the stored purchase keeps it
    await E(`(()=>{const w=currentWeek();for(const r of Object.values(w.buyingUnits))delete r['${GA}'];delete state.purchaseUnitPreferences['${GA}'];save();render()})()`);
    await open();assert.ok(!(await E(`[...document.querySelectorAll('.unit-suggest .unit-chip')].map(c=>c.dataset.unitChoice)`)).includes('nửa con'),`${label}: a hidden unit leaves the suggestions`);assert.equal(await E('state.customUnits.length'),1,'never deleted');
    await page.evaluate('closeModal()');
    // the recipe editor lists the family's units as written-as-typed units
    await E(`setCustomUnitHidden(state,state.customUnits[0].id,false)`);const opts=await E(`rcUnitOptions('')`);assert.match(opts,/<optgroup label="[^"]*">.*nửa con/,'recipe editor offers the family unit (not counted)');
   }
   assert.deepEqual(errors,[],`${label}: no page errors`);await context.close();
  }
  console.log(`Unit picker browser QA passed (${runs.length} runs, ${shots} screenshots).`);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
