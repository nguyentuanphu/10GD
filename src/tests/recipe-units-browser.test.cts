// v1.7.19 · one unit picker for every place that chooses a unit (AGENTS.md rule 29). Owner, 12 Nov 2026 (Sydney time): “nhớ lần sau
// khi update thì phải update những cái liên quan”. Viết món rows and the extra items on Đi chợ open the same picker as the v1.7.18
// buying-unit sheet. Henry also reported (12 Nov 2026, 16:19 Sydney time) “Gà trống … 1 g” and that tapping the item did nothing:
// the add form saved the first unit (g) silently, and extras could not be edited.
// Checks, at 320×740, 375×812, 820×1100 and 1280×800 in VI / EN, light / dark (Chromium viewport simulation, device-only mode, QA data):
//  Viết món — the row's unit opens the picker over the editor (the editor stays open, its scroll and the row's focus are kept), con
//  suggested first for an ingredient counted in con, “Xem tất cả” with the recipe units group, search, a recipe unit chosen and saved
//  on the row, an old recipe's unknown unit shown and kept exactly, “Tự thêm đơn vị” saved in state.customUnits like on Đi chợ, Escape
//  closes only the picker, the saved recipe keeps the text.
//  Đi chợ extras — no unit until one is picked for a name that matches nothing (inline message, nothing added), a matched name gets
//  its unit (con), the picker from the add form, tapping the name or the amount opens the edit sheet, “Lưu” without changes keeps
//  “1 g” exactly, a new unit is saved in place keeping id, done and store; the × delete is unchanged.
//  Every sheet: X / Đóng / Lưu pills with drawings side by side (rule 25), chips and secondary buttons words only (rule 27), taps
//  that do not move the page or the tapped control (rule 24), no emoji, ≥ 44 px targets, no sideways overflow.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const origin='https://kitchen.test',out='docs/reviews/v1.7.19/recipe-units';mkdirSync(out,{recursive:true});
const mime:any={'.js':'application/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'};
const sizes:any={narrow:{width:320,height:740},mobile:{width:375,height:812},tablet:{width:820,height:1100},desktop:{width:1280,height:800}};
const GA='family-ing-ga-trong',EMOJI=/\p{Extended_Pictographic}/u;
(async()=>{
 const browser=await chromium.launch(process.env.BEP_CHROMIUM?{executablePath:process.env.BEP_CHROMIUM}:{});let shots=0;
 try{
  const runs:[string,string,string][]=[['mobile','vi','light'],['narrow','vi','light'],['tablet','vi','light'],['desktop','vi','light'],['mobile','en','dark'],['narrow','en','dark'],['tablet','en','dark'],['desktop','en','dark']];
  for(const [size,lang,theme] of runs){const label=`${size} ${lang} ${theme}`,vi=lang==='vi';
   const context=await browser.newContext({locale:'vi-VN',viewport:sizes[size],serviceWorkers:'block',reducedMotion:'reduce',colorScheme:theme as any,timezoneId:'Australia/Sydney'});
   await context.addInitScript(({lang,theme}:any)=>{if(sessionStorage.getItem('qa-init'))return;sessionStorage.setItem('qa-init','1');localStorage.setItem('bep-theme-mode',theme);localStorage.setItem('guest/bep-language',lang);localStorage.setItem('bep-local-locked','yes');localStorage.setItem('bep-guide-done','1');localStorage.removeItem('guest/bep-recent-units')},{lang,theme});
   const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route(origin+'/**',async(r:any)=>{const u=new URL(r.request().url());if(u.pathname.startsWith('/.netlify/'))return r.fulfill({status:401,json:{error:'no'}});if(u.pathname==='/startup-scripts.json')return r.fulfill({json:JSON.parse(readFileSync('dist/startup-scripts.json','utf8'))});const f=resolve('dist',u.pathname==='/'?'index.html':u.pathname.slice(1));try{await r.fulfill({contentType:mime[extname(f)]||'application/octet-stream',body:readFileSync(f)})}catch{await r.fulfill({status:404,body:'Not found'})}});
   await page.goto(origin+'/#shopping',{waitUntil:'domcontentloaded'});
   const E=(s:string)=>page.evaluate(s) as Promise<any>;
   for(let i=0;;i++){try{await page.waitForFunction(()=>typeof (globalThis as any).openUnitSheet==='function'&&typeof (globalThis as any).familyRecipeEditor==='function'&&typeof (globalThis as any).rcRowMarkup==='function'&&document.querySelector('#main h1'),null,{timeout:20000});break}catch(e){if(i>3)throw e;await page.waitForTimeout(700)}}
   // QA data: a family ingredient counted in con, a family recipe with an old line in a unit no list knows, and Henry's extra item.
   const RID='qa-ga-luoc-units',OLD='Hành phi 2 muỗng súp';
   await E(`(()=>{state.preferences.onboardingComplete=true;state.ingredientCatalog={...(state.ingredientCatalog||{}),'${GA}':{name:'Gà trống',unit:'con',group:'meat'}};hydrateFamilyIngredients(state);ensureDefaultStores?.(state);const r={id:'${RID}',name:'Gà luộc (QA)',category:'soup',protein:'chicken',time:40,servings:4,yield:4,purposes:['dinner'],ingredients:[{id:'${GA}',qty:1}],missingIngredients:['${OLD}'],prep:'',steps:['Luộc gà.'],custom:true,origin:'family',favorite:false};state.recipes.push(r);const w=currentWeek();w.extras=[{id:'qa-extra-ga',name:'Gà trống',qty:'1 g',cost:0,costUnknown:true,currency:currentCurrency(state),done:false,storeId:(state.stores||[])[0]?.id||''},{id:'qa-extra-paper',name:'Giấy ăn',qty:'2 gói',cost:4,currency:currentCurrency(state),done:true,storeId:''}];save();closeModal();view='shopping';render()})()`);
   await page.waitForTimeout(250);
   const shot=async(n:string)=>{await E(`document.querySelector('#toast')&&(document.querySelector('#toast').className='')`);await page.waitForTimeout(80);await page.screenshot({path:`${out}/${n}-${lang}-${theme}-${sizes[size].width}x${sizes[size].height}.png`});shots++};
   const overflow=async(where:string)=>{const o=await E(`(()=>{const ms=[...document.querySelectorAll('#modal-root .modal')];return{doc:document.documentElement.scrollWidth-innerWidth,modal:Math.max(0,...ms.map(m=>m.scrollWidth-m.clientWidth)),wide:[...document.querySelectorAll('#modal-root .modal *')].filter(e=>e.offsetParent&&e.getBoundingClientRect().right>innerWidth+1).map(e=>e.className||e.tagName).slice(0,4)}})()`);assert.ok(o.doc<=1&&o.modal<=1&&!o.wide.length,`${label} ${where}: no sideways overflow ${JSON.stringify(o)}`)};
   const targets=async(sel:string,where:string)=>{const small=await E(`[...document.querySelectorAll(${JSON.stringify(sel)})].filter(e=>e.offsetParent&&!e.closest('[hidden]')&&(e.getBoundingClientRect().height<43.5||e.getBoundingClientRect().width<43.5)).map(e=>e.textContent.trim()||e.getAttribute('aria-label'))`);assert.deepEqual(small,[],`${label} ${where}: ≥ 44 px targets`)};
   const noEmoji=async(sel:string,where:string)=>{const t=await page.locator(sel).first().innerText();assert.ok(!EMOJI.test(t),`${label} ${where}: no emoji: ${(t.match(/\p{Extended_Pictographic}/gu)||[]).join(' ')}`)};
   const keepsPlace=async(sel:string,where:string)=>{const loc=page.locator(sel).first();await loc.evaluate((e:any)=>e.scrollIntoView({block:'center'}));await page.waitForTimeout(60);const before=await loc.evaluate((e:any)=>e.getBoundingClientRect().top),y=await E('scrollY');await loc.click();await page.waitForTimeout(150);const after=await page.locator(sel).first().evaluate((e:any)=>e.getBoundingClientRect().top);
    assert.equal(await E('scrollY'),y,`${label} ${where}: the page does not move`);assert.ok(Math.abs(after-before)<=1.5,`${label} ${where}: the tapped control stays where it was (${before} → ${after}, rule 24)`)};
   const pills=async(sheet:string,where:string)=>{const f=await E(`(()=>{const s=document.querySelector(${JSON.stringify(sheet)});const bs=[...s.querySelectorAll(':scope>.modal-footer>button')];const r=bs.map(b=>b.getBoundingClientRect());return{n:bs.length,tops:r.map(x=>Math.round(x.top)),hs:r.map(x=>Math.round(x.height)),ws:r.map(x=>Math.round(x.width)),art:bs.map(b=>!!b.querySelector('svg.sheet-art')),round:bs.map(b=>parseFloat(getComputedStyle(b).borderTopLeftRadius)>=r[0].height/2-1),x:!!s.querySelector(':scope>header .close-x-btn svg'),inView:r.every(x=>x.bottom<=innerHeight+1&&x.top>=0)}})()`);
    assert.ok(f.n===2&&Math.abs(f.tops[0]-f.tops[1])<=2&&Math.abs(f.hs[0]-f.hs[1])<=2&&Math.abs(f.ws[0]-f.ws[1])<=2,`${label} ${where}: footer buttons side by side, same size ${JSON.stringify(f)}`);assert.deepEqual(f.art,[true,true],`${label} ${where}: Đóng and Lưu show their drawings`);assert.deepEqual(f.round,[true,true],`${label} ${where}: pill-shaped`);assert.ok(f.x,`${label} ${where}: the X is drawn`);assert.ok(f.inView,`${label} ${where}: footer visible without scrolling`)};
   const wordsOnly=async(sel:string,where:string)=>{const drawn=await E(`[...document.querySelectorAll(${JSON.stringify(sel)})].filter(b=>b.offsetParent&&b.querySelector('svg,.btn-art')).map(b=>b.textContent.trim())`);assert.deepEqual(drawn,[],`${label} ${where}: words only (rule 27)`)};
   const sugg=()=>E(`[...document.querySelectorAll('#unit-sheet-layer .unit-suggest .unit-chip')].filter(c=>c.offsetParent).map(c=>c.dataset.unitChoice)`) as Promise<string[]>;

   // ======== Viết món ========
   await E(`familyRecipeEditor('${RID}')`);await page.waitForSelector('#family-recipe-form .rc-ing-row');await page.waitForTimeout(200);
   const rows=page.locator('#family-recipe-form .rc-ing-row'),rowOf=(name:string)=>rows.filter({has:page.locator(`.rc-ing-name-input[value="${name}"]`)}).first();
   const gaRow=rowOf('Gà trống'),oldRow=rowOf('Hành phi'),gaBtn=gaRow.locator('.rc-ing-unit'),oldBtn=oldRow.locator('.rc-ing-unit');
   assert.equal(await page.locator('#family-recipe-form select.rc-ing-unit').count(),0,`${label}: no plain unit list left in Viết món`);
   assert.equal(await gaBtn.getAttribute('value'),'con');assert.equal(await oldBtn.getAttribute('value'),'muỗng súp',`${label}: the old recipe's unknown unit shows as written`);
   assert.match(await oldBtn.innerText(),/muỗng súp/);await wordsOnly('#family-recipe-form .rc-ing-unit','row unit button');await targets('#family-recipe-form .rc-ing-unit','row unit button');
   // open from a row — the editor stays; remember where it was
   await gaBtn.evaluate((e:any)=>e.scrollIntoView({block:'center'}));await page.waitForTimeout(60);
   const before=await E(`({top:document.querySelector('#modal-root .modal:not(.unit-sheet) .modal-content').scrollTop,y:scrollY,btn:document.querySelector('#family-recipe-form .rc-ing-row .rc-ing-unit[value="con"]').getBoundingClientRect().top})`);
   await gaBtn.click();await page.waitForSelector('#unit-sheet-layer .unit-suggest .unit-chip');await page.waitForTimeout(100);
   assert.equal(await page.locator('#family-recipe-form').count(),1,`${label}: the editor stays open under the picker`);
   const s1=await sugg();assert.equal(s1[0],'con',`${label}: con is suggested first for Gà trống (${s1})`);for(const u of ['kg','g'])assert.ok(s1.includes(u),`${label}: ${u} suggested (${s1})`);
   assert.equal(await page.locator('#unit-sheet-layer .unit-chip[data-unit-choice="con"]').first().getAttribute('aria-pressed'),'true');
   assert.match(await page.locator('#unit-suggest-title').innerText(),vi?/Đơn vị cho Gà trống/:/Unit for Gà trống/);
   await pills('#unit-sheet-layer .unit-sheet','unit picker');await wordsOnly('#unit-sheet-layer .unit-chip,#unit-sheet-layer .unit-more-btn','chips and secondary buttons');
   await targets('#unit-sheet-layer .unit-chip,#unit-sheet-layer .unit-more-btn,#unit-sheet-layer button','unit picker');await overflow('unit picker');await noEmoji('#unit-sheet-layer','unit picker');
   await shot('recipe-suggest');
   await keepsPlace('#unit-sheet-layer .unit-suggest .unit-chip[data-unit-choice="kg"]','tap kg');assert.equal(await page.locator('#unit-sheet-layer .unit-suggest .unit-chip[data-unit-choice="kg"]').getAttribute('aria-pressed'),'true');
   // “Xem tất cả”: recipe units as their own group, search, the button keeps its place
   await keepsPlace('#unit-sheet-layer [data-unit-action="show-all"]','open the full list');await page.waitForSelector('#unit-sheet-layer #purchase-unit-choice .unit-chip');
   const groups:any=await E(`Object.fromEntries([...document.querySelectorAll('#unit-sheet-layer .unit-chip-group')].map(g=>[g.dataset.group,[...g.querySelectorAll('.unit-chip')].map(c=>c.dataset.unitChoice)]))`);
   for(const k of ['own','measure','count','container','produce','other'])assert.ok(groups[k]?.length,`${label}: full list has ${k} (${Object.keys(groups)})`);
   for(const u of ['tép','khoanh','muỗng canh','muỗng cà phê','chén','đòn'])assert.ok(groups.own.includes(u),`${label}: recipe unit ${u} kept in its group`);
   assert.match(await page.locator('#unit-sheet-layer .unit-chip-group[data-group="own"] h4').innerText(),vi?/công thức/i:/recipes/i);
   await page.fill('#unit-sheet-layer #unit-search',vi?'muong':'tablespoon');await page.waitForTimeout(60);const found:string[]=await E(`[...document.querySelectorAll('#unit-sheet-layer #purchase-unit-choice .unit-chip')].filter(c=>!c.hidden&&c.offsetParent).map(c=>c.dataset.unitChoice)`);assert.ok(found.includes('muỗng canh'),`${label}: search finds muỗng canh (${found})`);
   await page.fill('#unit-sheet-layer #unit-search','');await page.waitForTimeout(60);
   await targets('#unit-sheet-layer #purchase-unit-choice .unit-chip,#unit-sheet-layer #unit-search','full list');await overflow('full list');await noEmoji('#unit-sheet-layer','full list');
   const own='#unit-sheet-layer .unit-chip-group[data-group="own"] .unit-chip[data-unit-choice="muỗng canh"]';await page.locator(own).scrollIntoViewIfNeeded();await keepsPlace(own,'choose a recipe unit');
   assert.equal(await page.locator(own).getAttribute('aria-pressed'),'true');assert.equal(await page.locator('#unit-sheet-layer .unit-chip[data-unit-choice="lát"][aria-pressed="true"]').count(),0,'exact choice only');
   await shot('recipe-all-units');
   await page.locator('#unit-sheet-layer [data-unit-sheet-act="save"]').click();await page.waitForTimeout(120);
   assert.equal(await page.locator('#unit-sheet-layer').count(),0,`${label}: Lưu closes the picker`);assert.equal(await page.locator('#family-recipe-form').count(),1,'editor still open');
   const after=await E(`({top:document.querySelector('#modal-root .modal .modal-content').scrollTop,y:scrollY,focus:document.activeElement?.classList.contains('rc-ing-unit')&&document.activeElement.value,btn:document.activeElement.getBoundingClientRect().top})`);
   assert.equal(after.focus,'muỗng canh',`${label}: focus is back on the row's unit, which now reads muỗng canh`);assert.equal(after.y,before.y,'page did not move');assert.ok(Math.abs(after.top-before.top)<=1,`${label}: the editor keeps its scroll (${before.top} → ${after.top})`);assert.ok(Math.abs(after.btn-before.btn)<=1.5,`${label}: the row stays where it was (rule 24)`);
   assert.match(await gaBtn.innerText(),vi?/muỗng canh/:/tablespoon/);
   await shot('recipe-row-chosen');
   // the old unknown unit: shown in the picker as written, Escape / X leave it unchanged and close only the picker
   await oldBtn.click();await page.waitForSelector('#unit-sheet-layer .unit-chip');const s2=await sugg();assert.equal(s2[0],'muỗng súp',`${label}: the unknown unit is offered as written (${s2})`);assert.equal(await page.locator('#unit-sheet-layer .unit-chip[data-unit-choice="muỗng súp"]').getAttribute('aria-pressed'),'true');
   await page.keyboard.press('Escape');await page.waitForTimeout(80);assert.equal(await page.locator('#unit-sheet-layer').count(),0,'Escape closes the picker');assert.equal(await page.locator('#family-recipe-form').count(),1,`${label}: Escape leaves the editor open`);assert.equal(await oldBtn.getAttribute('value'),'muỗng súp');
   await oldBtn.click();await page.waitForSelector('#unit-sheet-layer .unit-chip');await page.locator('#unit-sheet-layer .unit-chip[data-unit-choice="g"]').first().click();await page.locator('#unit-sheet-layer header .close-x-btn').click();await page.waitForTimeout(80);
   assert.equal(await oldBtn.getAttribute('value'),'muỗng súp',`${label}: closing with X changes nothing`);
   // a new row with a name the catalogue does not know: sensible defaults, then a family unit with a conversion
   await page.locator('#family-recipe-form [data-rci="add"]').click();const nr=rows.last();await nr.locator('.rc-ing-name-input').fill('Lá dứa QA');await nr.locator('.rc-ing-qty').fill('2');await page.waitForTimeout(60);
   assert.equal(await page.locator('#family-recipe-form').count(),1,'still in the editor');
   await nr.locator('.rc-ing-unit').click();await page.waitForSelector('#unit-sheet-layer .unit-chip');const s3=await sugg();for(const u of ['g','tép','muỗng canh'])assert.ok(s3.includes(u),`${label}: default ${u} for an unknown name (${s3})`);
   await page.locator('#unit-sheet-layer .unit-suggest-actions [data-unit-choice="__custom"]').click();await page.waitForSelector('#unit-sheet-layer #purchase-custom-unit');assert.equal(await E('document.activeElement.id'),'purchase-custom-unit','focus goes to the unit name');
   await page.fill('#purchase-custom-unit','bó nhỏ QA');await page.fill('#custom-unit-per','50');await page.selectOption('#custom-unit-base','g');
   await overflow('custom unit');await targets('#purchase-custom-unit,#custom-unit-per,#custom-unit-base','custom unit');await noEmoji('#unit-sheet-layer','custom unit');await shot('recipe-custom-unit');
   await page.locator('#unit-sheet-layer [data-unit-sheet-act="save"]').click();await page.waitForTimeout(150);
   assert.equal(await nr.locator('.rc-ing-unit').getAttribute('value'),'bó nhỏ QA');const cu=await E('state.customUnits');assert.equal(cu.length,1);assert.equal(cu[0].name,'bó nhỏ QA');assert.equal(cu[0].base,'g');assert.equal(cu[0].perBase,50);assert.equal(cu[0].ingredient,undefined,'no ingredient for an unmatched name');
   assert.equal(await E('validImport(JSON.parse(JSON.stringify(state)))'),true,'state with the family unit is valid');
   // save the recipe: the chosen unit and the old line are kept as written
   await page.locator('[data-action="submit-form"][data-id="family-recipe-form"]').click();await page.waitForFunction(()=>!document.querySelector('#family-recipe-form'),null,{timeout:5000});
   const saved=await E(`(()=>{const r=state.recipes.find(x=>x.id==='${RID}');return{miss:r.missingIngredients,ings:r.ingredients.map(i=>[(INGREDIENTS[i.id]||[])[0]||state.ingredientCatalog?.[i.id]?.name,(INGREDIENTS[i.id]||[])[1]||state.ingredientCatalog?.[i.id]?.unit,i.qty].join('|'))}})()`);
   assert.ok(saved.miss.some((l:string)=>/Hành phi.*2.*muỗng súp/.test(l)),`${label}: old line kept (${saved.miss})`);
   assert.ok(saved.ings.includes('Gà trống|muỗng canh|1')||saved.miss.some((l:string)=>/Gà trống.*1.*muỗng canh/.test(l)),`${label}: Gà trống saved in muỗng canh (${saved.ings} / ${saved.miss})`);assert.ok(saved.miss.some((l:string)=>/Lá dứa QA.*2.*bó nhỏ QA/.test(l)),`${label}: the family unit is saved as written (${saved.miss})`);
   await E(`familyRecipeEditor('${RID}')`);await page.waitForSelector('#family-recipe-form .rc-ing-row');await page.waitForTimeout(150);
   assert.equal(await rowOf('Hành phi').locator('.rc-ing-unit').getAttribute('value'),'muỗng súp','reopened: unknown unit still as written');assert.equal(await rowOf('Gà trống').locator('.rc-ing-unit').getAttribute('value'),'muỗng canh','reopened: chosen unit');
   // the family unit is offered in the next row's picker under “Đơn vị của nhà mình”
   await rowOf('Hành phi').locator('.rc-ing-unit').click();await page.waitForSelector('#unit-sheet-layer .unit-chip');await page.locator('#unit-sheet-layer [data-unit-action="show-all"]').click();await page.waitForSelector('#unit-sheet-layer .unit-chip-group[data-group="family"]');
   assert.match(await page.locator('#unit-sheet-layer .unit-chip-group[data-group="family"]').innerText(),/bó nhỏ QA/);await page.keyboard.press('Escape');await E('closeModal()');

   // ======== Đi chợ · extra items ========
   await E(`view='shopping';location.hash='shopping';render()`);await page.waitForTimeout(250);
   const addBtn=page.locator('#main [data-action="add-extra"]').first();await addBtn.scrollIntoViewIfNeeded();await addBtn.click();await page.waitForSelector('#extra-form');
   assert.equal(await page.locator('#extra-form select#extra-unit').count(),0,`${label}: no plain unit list in the add form`);assert.equal(await page.locator('#extra-unit').inputValue(),'',`${label}: no unit chosen yet (it was “g”)`);
   await page.fill('#extra-name','Giấy bạc QA');await page.locator('#extra-name').dispatchEvent('input');await page.fill('#extra-amount','1');await page.locator('#extra-amount').dispatchEvent('input');
   const n0=await E('currentWeek().extras.length');await page.locator('#modal-root [data-action="submit-form"][data-id="extra-form"]').click();await page.waitForTimeout(120);
   assert.equal(await E('currentWeek().extras.length'),n0,`${label}: nothing added without a unit`);assert.ok(await page.locator('#extra-unit-msg').isVisible(),'inline message shown');assert.match(await page.locator('#extra-unit-msg').innerText(),vi?/Chọn đơn vị/:/Pick a unit/);
   if(size==='mobile')await shot('extra-needs-unit');
   await page.locator('#extra-unit-btn').click();await page.waitForSelector('#unit-sheet-layer .unit-chip');const s4=await sugg();for(const u of ['cái','gói','cuộn'])assert.ok(s4.includes(u),`${label}: household defaults (${s4})`);
   await pills('#unit-sheet-layer .unit-sheet','extra unit picker');await overflow('extra unit picker');await noEmoji('#unit-sheet-layer','extra unit picker');
   await page.locator('#unit-sheet-layer .unit-suggest .unit-chip[data-unit-choice="cuộn"]').click();await page.locator('#unit-sheet-layer [data-unit-sheet-act="save"]').click();await page.waitForTimeout(100);
   assert.equal(await page.locator('#extra-unit').inputValue(),'cuộn');assert.ok(!(await page.locator('#extra-unit-msg').isVisible()),'message cleared');assert.equal(await E('document.activeElement.id'),'extra-unit-btn','focus back on the unit');
   await page.locator('#modal-root [data-action="submit-form"][data-id="extra-form"]').click();await page.waitForTimeout(200);
   assert.equal(await E(`currentWeek().extras.find(e=>e.name==='Giấy bạc QA')?.qty`),'1 cuộn',`${label}: added with the unit picked`);
   // a matched name (an ingredient counted in con) gets con, and the picker suggests con first
   await addBtn.click();await page.waitForSelector('#extra-form');await page.fill('#extra-name','Gà trống');await page.locator('#extra-name').dispatchEvent('input');await page.waitForTimeout(60);
   assert.equal(await page.locator('#extra-unit').inputValue(),'con',`${label}: Gà trống is counted in con`);await page.locator('#extra-unit-btn').click();await page.waitForSelector('#unit-sheet-layer .unit-chip');assert.equal((await sugg())[0],'con');
   await page.keyboard.press('Escape');await page.waitForTimeout(60);assert.equal(await page.locator('#extra-form').count(),1,'Escape leaves the add form');await E('closeModal()');await page.waitForTimeout(100);
   // edit Henry's item: tap the name (the page stays still), “Lưu” without changes keeps “1 g”
   const name=page.locator('#main .extra-edit-name[data-id="qa-extra-ga"]');assert.equal(await name.count(),1,'the name can be tapped');await targets('#main .extra-edit-name','extra name');
   await name.evaluate((e:any)=>e.scrollIntoView({block:'center'}));await page.waitForTimeout(80);const y0=await E('scrollY'),t0=await name.evaluate((e:any)=>e.getBoundingClientRect().top);
   await name.click();await page.waitForSelector('#extra-form[data-edit-id="qa-extra-ga"]');
   assert.equal(await page.locator('#extra-name').inputValue(),'Gà trống');assert.equal(await page.locator('#extra-amount').inputValue(),'1');assert.equal(await page.locator('#extra-unit').inputValue(),'g');assert.equal(await page.locator('#extra-catalog-ing').count(),0);
   assert.match(await page.locator('#modal-title').innerText(),vi?/Sửa đồ cần mua/:/Edit this item/);await pills('#modal-root .modal','edit sheet');await overflow('edit sheet');await targets('#modal-root .modal>.modal-footer button,#extra-unit-btn,#extra-amount,#extra-name','edit sheet');await noEmoji('#modal-root .modal','edit sheet');
   await shot('extra-edit');
   await page.locator('#modal-root .modal-footer [data-action="submit-form"][data-id="extra-form"]').click();await page.waitForTimeout(200);
   const e1=await E(`currentWeek().extras.find(e=>e.id==='qa-extra-ga')`);assert.equal(e1.qty,'1 g',`${label}: saved without changes, the stored text stays exactly (rule 6)`);assert.equal(e1.name,'Gà trống');assert.equal(e1.costUnknown,true);
   assert.equal(await E('scrollY'),y0,`${label}: closing the edit sheet does not move the page`);assert.ok(Math.abs(await page.locator('#main .extra-edit-name[data-id="qa-extra-ga"]').evaluate((e:any)=>e.getBoundingClientRect().top)-t0)<=1.5,`${label}: the item stays where it was (rule 24)`);
   // tap the amount → edit → pick con in the shared picker → Lưu keeps id, done, store
   const store0=e1.storeId;await page.locator('#main .shop-row:has([data-id="qa-extra-ga"]) .qty').click();await page.waitForSelector('#extra-form[data-edit-id="qa-extra-ga"]');
   await page.locator('#extra-unit-btn').click();await page.waitForSelector('#unit-sheet-layer .unit-chip');assert.equal(await page.locator('#modal-root .modal').count(),2,'picker over the edit sheet');const s5=await sugg();assert.ok(s5.indexOf('con')>=0&&s5.indexOf('con')<=1,`${label}: con near the top (${s5})`);
   await page.locator('#unit-sheet-layer .unit-suggest .unit-chip[data-unit-choice="con"]').click();await page.locator('#unit-sheet-layer [data-unit-sheet-act="save"]').click();await page.waitForTimeout(80);
   if(size==='mobile')await shot('extra-edit-con');
   await page.locator('#modal-root .modal-footer [data-action="submit-form"][data-id="extra-form"]').click();await page.waitForTimeout(200);
   const e2=await E(`({e:currentWeek().extras.find(e=>e.id==='qa-extra-ga'),n:currentWeek().extras.length,paper:currentWeek().extras.find(e=>e.id==='qa-extra-paper')})`);
   assert.equal(e2.e.qty,'1 con',`${label}: the unit is changed in place`);assert.equal(e2.e.done,false);assert.equal(e2.e.storeId,store0,'store kept');assert.equal(e2.paper.qty,'2 gói','other items untouched');assert.equal(e2.paper.done,true);
   assert.match(await page.locator('#main .shop-row:has([data-id="qa-extra-ga"]) .qty').innerText(),/1\s*con|1\s*whole/);
   // the × delete is unchanged
   assert.equal(await page.locator('#main [data-action="delete-extra"][data-id="qa-extra-ga"]').count(),1,'× delete still there');
   await wordsOnly('#main .extra-edit-name','extra name');
   assert.equal(await E('validImport(JSON.parse(JSON.stringify(state)))'),true,'state stays valid');
   assert.deepEqual(errors,[],`${label}: no page errors`);await context.close();
  }
  console.log(`Recipe / extra unit picker browser QA passed (${runs.length} runs, ${shots} screenshots).`);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
