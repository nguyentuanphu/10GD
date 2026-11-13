// v1.7.19 “do everything in this round” (owner, 13 Nov 2026, Sydney time): the UI items, each tapped in the browser.
//  1. Quiet hours (Henry's pop-up): Nhắc nhở → “Nhắc nấu cả trong giờ yên lặng” / “Cooking reminders during quiet hours”, on by
//     default and kept off when this device turned it off; the Giờ ăn hint says cooking reminders arrive in quiet hours.
//  2. Barcode sheet (rule 32): an empty amount is never stored as 1 pack — the field says what is missing (VI/EN), nothing is saved.
//  3. Tủ → Thêm thực phẩm: the “Nơi cất” select shows its whole first option at 320/375 px.
//  4. The browser's own “Please select an item in the list.” follows the app's language: every required field in the app's
//     forms gets its message in VI or EN from one shared helper (form-validity.ts), cleared when the field changes. The phone's
//     locale is the other language in every run, so a browser default can never pass.
//  6. Dark mode: the meal-row “Hoàn tác” in the “Bữa ±” sheet — text ≥ 4.5:1, and the button stands out from the sheet (≥ 3:1).
//  7. Viết món → Phân loại bữa ăn: Vietnamese labels in VI (no “Weekends feast”), English in EN.
//  8. Dish pictures on the Món ăn library cards, the meal cards (Hôm nay, Thực đơn) and the dish sheet: the whole plate shows —
//     each picture sits inside its frame, is square (not stretched), is not cut to a circle, and has no drawing on top of it.
// Every run: week starting on Saturday; EN runs in VND with the phone in Los Angeles time; validImport + sync merge round trip at
// the end. 320×740, 375×812, 820×1100, 1280×800; VI light and EN dark. Chromium viewport simulation, not physical devices.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const origin='https://kitchen.test',out='docs/reviews/v1.7.19/round-ui';mkdirSync(out,{recursive:true});
const mime:any={'.js':'application/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'};
const sizes:any={narrow:{width:320,height:740},mobile:{width:375,height:812},tablet:{width:820,height:1100},desktop:{width:1280,height:800}};
const EMOJI=/\p{Extended_Pictographic}/u;
const VI_MSG=/^(Hãy |Số |Cần |Tối đa |Giá trị |Nhập lượng )/,EN_MSG=/^(Please |The number |This |At most |Enter the amount )/;
(async()=>{
 const browser=await chromium.launch(process.env.BEP_CHROMIUM?{executablePath:process.env.BEP_CHROMIUM}:{});let shots=0,runs0=0;
 try{
  const runs:[string,string,string][]=[['mobile','vi','light'],['narrow','vi','light'],['tablet','vi','light'],['desktop','vi','light'],['mobile','en','dark'],['narrow','en','dark'],['tablet','en','dark'],['desktop','en','dark']];
  for(const [size,lang,theme] of runs){const label=`${size} ${lang} ${theme}`,vi=lang==='vi',tz=vi?'Australia/Sydney':'America/Los_Angeles',cur=vi?'AUD':'VND';
   // the phone speaks the other language, so the browser's own bubble text would be wrong in every run
   const context=await browser.newContext({locale:vi?'en-US':'vi-VN',viewport:sizes[size],serviceWorkers:'block',reducedMotion:'reduce',colorScheme:theme as any,timezoneId:tz});
   await context.addInitScript(({lang,theme}:any)=>{if(sessionStorage.getItem('qa-init'))return;sessionStorage.setItem('qa-init','1');localStorage.setItem('bep-theme-mode',theme);localStorage.setItem('guest/bep-language',lang);localStorage.setItem('bep-local-locked','yes');localStorage.setItem('bep-guide-done','1')},{lang,theme});
   const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
   const dialogs:string[]=[];page.on('dialog',(d:any)=>{dialogs.push(d.message());d.dismiss().catch(()=>{})});
   await page.route(origin+'/**',async(r:any)=>{const u=new URL(r.request().url());if(u.pathname.startsWith('/.netlify/'))return r.fulfill({status:401,json:{error:'no'}});if(u.pathname==='/startup-scripts.json')return r.fulfill({json:JSON.parse(readFileSync('dist/startup-scripts.json','utf8'))});const f=resolve('dist',u.pathname==='/'?'index.html':u.pathname.slice(1));try{await r.fulfill({contentType:mime[extname(f)]||'application/octet-stream',body:readFileSync(f)})}catch{await r.fulfill({status:404,body:'Not found'})}});
   await page.goto(origin+'/#today',{waitUntil:'domcontentloaded'});
   const E=(s:string)=>page.evaluate(s) as Promise<any>;
   for(let i=0;;i++){try{await page.waitForFunction(()=>typeof (globalThis as any).KitchenExtras==='object'&&typeof (globalThis as any).fmMealsSheet==='function'&&typeof (globalThis as any).pushSettings==='function'&&document.querySelector('#main h1'),null,{timeout:20000});break}catch(e){if(i>3)throw e;await page.waitForTimeout(700)}}
   await E(`ensureCatalog()`);
   await E(`(()=>{state.preferences.onboardingComplete=true;state.preferences.weekStartDay=6;state.preferences.currency='${cur}';state.pantry=[];selectedDate=sydneyDate();weekStart=planStartOf(state,selectedDate);save();closeModal();render()})()`);
   await page.waitForTimeout(200);
   const name=(n:string)=>`${out}/${n}-${lang}-${theme}-${sizes[size].width}x${sizes[size].height}.png`;
   const shot=async(n:string)=>{await E(`document.querySelector('#toast')&&(document.querySelector('#toast').className='')`);await page.waitForTimeout(80);await page.screenshot({path:name(n)});shots++};
   const overflow=async(where:string)=>{const o=await E(`(()=>{const ms=[...document.querySelectorAll('#modal-root .modal')];return{doc:document.documentElement.scrollWidth-innerWidth,modal:Math.max(0,...ms.map(m=>m.scrollWidth-m.clientWidth))}})()`);assert.ok(o.doc<=1&&o.modal<=1,`${label} ${where}: no sideways overflow ${JSON.stringify(o)}`)};
   const noEmoji=async(sel:string,where:string)=>{const t=await E(`[...document.querySelectorAll('${sel}')].map(e=>e.innerText).join(' ')`);assert.ok(!EMOJI.test(t),`${label} ${where}: no emoji`)};
   const msgOk=(m:string,where:string)=>assert.ok((vi?VI_MSG:EN_MSG).test(m)&&!(vi?EN_MSG:VI_MSG).test(m),`${label} ${where}: the message is in the app's language: “${m}”`);

   // ── 1. Quiet hours: the per-device switch ─────────────────────────────────────────────────────────────────────────
   await E(`pushSettings()`);await page.locator('#modal-root #push-meal-bypass').waitFor();
   assert.equal(await page.locator('#push-meal-bypass').isChecked(),true,`${label}: cooking reminders during quiet hours are on by default`);
   const qLabel=await E(`document.getElementById('push-meal-bypass').closest('label').innerText`);
   assert.ok(vi?/Nhắc nấu cả trong giờ yên lặng/.test(qLabel)&&/Nhắc giờ nấu và nhắc rã đông/.test(qLabel):/Cooking reminders during quiet hours/.test(qLabel)&&/Cooking-time and thaw reminders/.test(qLabel),`${label}: the switch says what it does (${qLabel})`);
   assert.ok(await E(`document.getElementById('push-meal-bypass').closest('label').getBoundingClientRect().height>=44`),`${label}: the switch is a ≥ 44 px target`);
   assert.ok((await E(`document.querySelector('#modal-root .modal').innerText`)).includes(vi?'trừ tin khẩn, nhắc giờ nấu và nhắc rã đông':'except to urgent messages, cooking-time and thaw reminders'),`${label}: the summary names the reminders that pass quiet hours`);
   await page.locator('#push-meal-bypass').scrollIntoViewIfNeeded();await overflow('push settings');await noEmoji('#modal-root .modal','push settings');await shot('push-quiet-switch');
   await E(`(()=>{closeModal();familyStorage.setItem('bep-push-profile',JSON.stringify({memberId:state.members[0].id,mealQuietBypass:false}));pushSettings()})()`);await page.locator('#modal-root #push-meal-bypass').waitFor();
   assert.equal(await page.locator('#push-meal-bypass').isChecked(),false,`${label}: a device that turned it off sees it off`);
   await E(`(()=>{closeModal();familyStorage.setItem('bep-push-profile',JSON.stringify({memberId:state.members[0].id,urgentPolicy:'v2',urgentBypass:true}));pushSettings()})()`);await page.locator('#modal-root #push-meal-bypass').waitFor();
   assert.equal(await page.locator('#push-meal-bypass').isChecked(),true,`${label}: a device saved before the switch existed shows it on`);
   await E(`closeModal()`);
   await E(`kitchenModal('mealtimes')`);await page.locator('#kitchen-mealtimes').waitFor();
   const mtText=await E(`document.getElementById('kitchen-mealtimes').innerText`);
   assert.ok(vi?mtText.includes('Nhắc nấu vẫn đến trong giờ yên lặng của máy')&&!mtText.includes('Giờ yên lặng của từng máy vẫn được giữ'):mtText.includes('They still arrive during a phone’s quiet hours')&&!mtText.includes('quiet hours still apply'),`${label}: the Giờ ăn hint says cooking reminders arrive in quiet hours`);
   await E(`closeModal()`);

   // ── 2. Barcode sheet: the amount is required ───────────────────────────────────────────────────────────────────────
   await E(`(()=>{state.barcodeMap={'9300000000031':{ingredient:'pork',name:'QA pork',quantity:''}};save()})()`);
   await E(`KitchenExtras.gotCode('9300000000031')`);await page.locator('#modal-root #scan-ing').waitFor();
   assert.equal(await page.locator('#scan-ing').inputValue(),'pork');assert.equal(await page.locator('#scan-qty').inputValue(),'',`${label}: no amount is filled in for the family`);
   const hint=await E(`document.querySelector('#modal-root .modal').innerText`);
   assert.ok(vi?/Lượng là bắt buộc/.test(hint)&&!/cất là 1 gói/.test(hint):/The amount is required/.test(hint)&&!/kept as 1 pack/.test(hint),`${label}: the sheet hint says the amount is required`);
   const n0=await E(`state.pantry.length`);
   await page.locator('#modal-root [data-kx="scan-save"]').click();await page.waitForTimeout(200);
   assert.equal(await E(`state.pantry.length`),n0,`${label}: an empty amount saves nothing`);
   assert.equal(await page.locator('#modal-root #scan-qty').count(),1,`${label}: the sheet stays open`);
   const sm=await E(`(()=>{const m=document.getElementById('scan-qty-msg');return{shown:!m.hidden&&m.getBoundingClientRect().height>0,text:m.textContent,invalid:document.getElementById('scan-qty').getAttribute('aria-invalid'),bubble:document.getElementById('scan-qty').validationMessage}})()`);
   assert.ok(sm.shown&&sm.invalid==='true',`${label}: the amount field says what is missing ${JSON.stringify(sm)}`);msgOk(sm.text,'barcode amount');assert.equal(sm.bubble,sm.text,`${label}: the bubble says the same`);
   await overflow('barcode empty amount');await shot('barcode-empty-amount');
   await page.fill('#scan-qty','2');await page.waitForTimeout(80);
   assert.equal(await E(`document.getElementById('scan-qty-msg').hidden`),true,`${label}: typing an amount clears the message`);
   await page.locator('#modal-root [data-kx="scan-save"]').click();await page.waitForTimeout(200);
   const lot=await E(`state.pantry.find(p=>p.barcode==='9300000000031')`);assert.ok(lot&&lot.qty===2&&!lot.purchase,`${label}: 2 g of pork saved, no pack invented ${JSON.stringify(lot)}`);
   await E(`closeModal()`);

   // ── 3 + 4. Tủ → Thêm thực phẩm: “Nơi cất” fits; the required-field messages follow the app's language ────────────────
   await E(`(()=>{view='pantry';location.hash='pantry';render();stockForm()})()`);await page.locator('#modal-root #stock-place').waitFor();await page.waitForTimeout(150);
   const fit=await E(`(()=>{const s=document.getElementById('stock-place'),cs=getComputedStyle(s),c=document.createElement('canvas').getContext('2d');c.font=cs.font;const t=s.options[s.selectedIndex].text;return{t,textW:c.measureText(t).width,avail:s.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight)-18}})()`);
   assert.ok(fit.textW<=fit.avail,`${label}: “${fit.t}” is not cut (${Math.round(fit.textW)} ≤ ${Math.round(fit.avail)} px)`);
   await page.locator('#modal-root [data-action="submit-form"][data-id="stock-form"]').click();await page.waitForTimeout(150);
   const ing=await E(`document.getElementById('stock-ing').validationMessage`);msgOk(ing,'ingredient select');assert.equal(ing,vi?'Hãy chọn một mục trong danh sách.':'Please choose an item from the list.');
   assert.equal(await E(`state.pantry.length`),n0+1,`${label}: nothing saved from an empty form`);
   await shot('stock-form-place');await overflow('stock form');
   await page.selectOption('#stock-ing','pork');await page.waitForTimeout(80);
   assert.equal(await E(`document.getElementById('stock-ing').validationMessage`),'',`${label}: choosing clears the message`);
   await page.locator('#modal-root [data-action="submit-form"][data-id="stock-form"]').click();await page.waitForTimeout(150);
   const qm=await E(`document.getElementById('stock-qty').validationMessage`);msgOk(qm,'amount');
   // “Nơi cất” was empty at the first save and the app filled it in by itself with the ingredient: no old message may block the save
   await page.fill('#stock-qty','2');await page.locator('#modal-root [data-action="submit-form"][data-id="stock-form"]').click();await page.waitForTimeout(250);
   assert.equal(await E(`state.pantry.length`),n0+2,`${label}: the form saves once every field is filled, including the place the app chose`);
   assert.equal(await page.locator('#modal-root #stock-form').count(),0,`${label}: the sheet closes after saving`);
   // the same without a second failed save in between: save empty, choose the ingredient (the app fills in “Nơi cất” itself), type the
   // amount, save — it must save at once (an old message left on “Nơi cất” blocked this form)
   await E(`stockForm()`);await page.locator('#modal-root #stock-place').waitFor();
   await page.locator('#modal-root [data-action="submit-form"][data-id="stock-form"]').click();await page.waitForTimeout(150);
   await page.selectOption('#stock-ing','egg');await page.waitForTimeout(80);assert.ok(await E(`document.getElementById('stock-place').value!==''`),`${label}: the app chose the place with the ingredient`);
   await page.fill('#stock-qty','3');await page.locator('#modal-root [data-action="submit-form"][data-id="stock-form"]').click();await page.waitForTimeout(250);
   assert.equal(await E(`state.pantry.length`),n0+3,`${label}: saved on the first try after the ingredient and amount were filled in`);
   // every required field in the app's forms: the message the browser would show is the app's own, in the app's language
   const openers=[`stockForm()`,`extraFormModal()`,`familyRecipeEditor()`,`pushSettings()`,`kitchenModal('menu')`,`kitchenModal('members')`,`typeof productForm==='function'&&productForm()`];let checked=0;
   for(const op of openers){await E(`closeModal()`);try{await E(op)}catch{continue}await page.waitForTimeout(250);
    const rows=await E(`(()=>{const out=[];for(const f of document.querySelectorAll('#modal-root form'))for(const el of f.querySelectorAll('input,select,textarea')){if(el.disabled||el.type==='hidden')continue;if(el.checkValidity())continue;out.push({id:el.id||el.name,msg:el.validationMessage,own:formValidityMessage(el)})}return out})()`);
    for(const r of rows){checked++;msgOk(r.msg,`${op} ${r.id}`)}}
   assert.ok(checked>=4,`${label}: required fields checked across the app's forms (${checked})`);
   await E(`closeModal()`);

   // ── 6. Dark-mode “Hoàn tác” on the meal row ──────────────────────────────────────────────────────────────────────
   await E(`(()=>{const d=selectedDate;const day=dayAt(state,d);day.lunch=day.lunch||{};day.lunch.recipes=[clone(state.recipes.find(r=>r.id==='r1'))];day.lunch.cooked=false;save();view='planner';location.hash='planner';render();fmMealsSheet(d)})()`);
   await page.locator('#modal-root [data-plan-meal-toggle="lunch"]').waitFor();await page.locator('#modal-root [data-plan-meal-toggle="lunch"]').click();await page.waitForTimeout(300);
   const undo=page.locator('#modal-root .pm-undo-btn');await undo.waitFor();
   const con=await E(`(()=>{const lum=c=>{const [r,g,b]=c.match(/[\\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)});return 0.2126*r+0.7152*g+0.0722*b},ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05)};const bgOf=el=>{while(el){const c=getComputedStyle(el).backgroundColor;if(!/rgba\\(0, 0, 0, 0\\)|transparent/.test(c))return c;el=el.parentElement}return 'rgb(255,255,255)'};const b=document.querySelector('#modal-root .pm-undo-btn'),cs=getComputedStyle(b);return{text:ratio(cs.color,bgOf(b)),edge:ratio(bgOf(b),bgOf(b.closest('.modal'))),h:b.getBoundingClientRect().height}})()`);
   assert.ok(con.text>=4.5,`${label}: “Hoàn tác” text contrast ${con.text.toFixed(2)} ≥ 4.5`);assert.ok(con.h>=44,`${label}: “Hoàn tác” ≥ 44 px`);
   if(theme==='dark')assert.ok(con.edge>=3,`${label}: “Hoàn tác” stands out from the sheet in dark mode (${con.edge.toFixed(2)} ≥ 3)`);
   await shot('meal-row-undo');await undo.click();await page.waitForTimeout(200);
   assert.equal(await page.locator('#modal-root [data-plan-meal-toggle="lunch"]').isChecked(),true,`${label}: Hoàn tác brings the lunch back`);
   await E(`closeModal()`);

   // ── 7. Phân loại bữa ăn labels ─────────────────────────────────────────────────────────────────────────────────────
   await E(`familyRecipeEditor()`);await page.locator('#modal-root input[name="purpose"]').first().waitFor();
   const purposes=await E(`[...document.querySelectorAll('#modal-root input[name="purpose"]')].map(i=>i.closest('label').innerText.trim())`);
   assert.deepEqual(purposes,vi?['Bữa sáng','Bữa trưa','Bữa tối','Bữa phụ','Mẻ nấu cuối tuần']:['Breakfast','Lunch','Dinner','Snack','Weekend batch cook'],`${label}: meal-group labels in the app's language`);
   await page.locator('#modal-root input[name="purpose"]').first().scrollIntoViewIfNeeded();await overflow('recipe form');await shot('recipe-meal-groups');
   {/* v1.7.20 (Henry, pop-up “Mẻ nấu cuối tuần”): one name everywhere — the batch card, its pills and the dish line */await page.evaluate(`(()=>{closeModal();const s=planStartOf(state,sydneyDate());familyGenerate(state,s,{sourceMode:'library'});save();view='planner';weekStart=s;render()})()`);await page.waitForTimeout(300);
    const txt=await page.evaluate(`(()=>{const b=document.querySelector('#main .family-batch');return {batch:b?b.innerText:'',all:document.querySelector('#main').innerText}})()`) as any;
    assert.ok(!/Weekends feast/.test(txt.all),`${label}: no “Weekends feast” left on the menu`);if(txt.batch)assert.match(txt.batch,vi?/Mẻ nấu cuối tuần/:/Weekend batch cook/,`${label}: the batch card says ${vi?'Mẻ nấu cuối tuần':'Weekend batch cook'}`)}
   {/* v1.7.20 (rule 24, found by the sweep on a Saturday): closing a day at the foot of the week menu does not pull the page */await page.evaluate(`(()=>{const days=[...document.querySelectorAll('#main details[data-plan-day]')];const last=days[days.length-1];if(last){last.open=true;fmOpenDays&&fmOpenDays.add(last.dataset.planDay)}scrollTo(0,document.documentElement.scrollHeight)})()`);await page.waitForTimeout(200);
    const lastSum=page.locator('#main details[data-plan-day]').last().locator('summary');if(await lastSum.count()){const t0=await lastSum.evaluate((e:any)=>e.getBoundingClientRect().top);await lastSum.click();await page.waitForTimeout(300);const t1=await lastSum.evaluate((e:any)=>e.getBoundingClientRect().top);
     assert.ok(Math.abs(t1-t0)<=2,`${label}: the closed day stays where it was tapped (${Math.round(t0)} → ${Math.round(t1)})`)}}
   await E(`closeModal()`);

   // ── 8. Dish pictures show the whole plate ────────────────────────────────────────────────────────────────────────────
   const plates=async(scope:string,where:string,min=1)=>{const res=await E(`(()=>{const out=[];for(const el of document.querySelectorAll('${scope} .food-illustration')){const r=el.getBoundingClientRect();if(r.width<2||r.bottom<0||r.top>innerHeight)continue;let p=el.parentElement,clip=null;while(p&&p!==document.body){const o=getComputedStyle(p);if(o.overflow!=='visible'||o.overflowX!=='visible'){clip=p.getBoundingClientRect();break}p=p.parentElement}const cs=getComputedStyle(el),rad=parseFloat(cs.borderTopLeftRadius)||0;out.push({cls:el.getAttribute('class'),w:r.width,h:r.height,inside:!clip||r.left>=clip.left-1&&r.right<=clip.right+1&&r.top>=clip.top-1&&r.bottom<=clip.bottom+1,round:rad/Math.min(r.width,r.height),cover:el.tagName==='svg'?null:cs.backgroundSize,drawnOver:!!el.parentElement.querySelector(':scope > .btn-art')})}return out})()`);
    assert.ok(res.length>=min,`${label} ${where}: dish pictures found (${res.length})`);
    for(const p of res){assert.ok(p.inside,`${label} ${where}: the picture sits inside its frame ${JSON.stringify(p)}`);
     if(/art-cell/.test(p.cls)){assert.ok(Math.abs(p.w-p.h)<=1,`${label} ${where}: the painting stays square ${JSON.stringify(p)}`);assert.ok(p.round<0.3,`${label} ${where}: not cut to a circle ${JSON.stringify(p)}`)}
     assert.ok(!p.drawnOver,`${label} ${where}: no drawing on top of the dish picture`)}};
   await E(`(()=>{view='recipes';location.hash='recipes';render()})()`);await page.waitForTimeout(500);
   const allTab=page.locator('#main button, #main [role="tab"]').filter({hasText:vi?/^Tất cả \(/:/^All \(/}).first();if(await allTab.count())await allTab.click();await page.waitForTimeout(700);
   await page.locator('#main .lib-card').first().scrollIntoViewIfNeeded();await page.waitForTimeout(300);
   await plates('#main .lib-card','Món ăn library',2);await overflow('library');await shot('plates-library');
   await E(`(()=>{const d=selectedDate;const day=dayAt(state,d);day.dinner.recipes=[clone(state.recipes.find(r=>r.id==='r1')),clone(state.recipes.find(r=>r.id==='n1'))];day.dinner.cooked=false;save();view='today';location.hash='today';render()})()`);await page.waitForTimeout(500);
   const todayArt=page.locator('#main .family-dish-art').first();if(await todayArt.count())await todayArt.scrollIntoViewIfNeeded();await page.waitForTimeout(200);
   await plates('#main','Hôm nay meal card');await shot('plates-today');
   await E(`(()=>{view='planner';location.hash='planner';render()})()`);await page.waitForTimeout(500);
   const planArt=page.locator('#main .family-dish-art').first();if(await planArt.count())await planArt.scrollIntoViewIfNeeded();await page.waitForTimeout(200);
   await plates('#main','Thực đơn meal card');await shot('plates-planner');
   await E(`showRecipe('r1')`);await page.locator('#modal-root .recipe-detail-hero').waitFor();await page.waitForTimeout(300);
   await plates('#modal-root','dish sheet');await overflow('dish sheet');await shot('plates-dish-sheet');
   await E(`closeModal()`);

   // ── rule 33: what was saved loads again, and survives the sync merge ────────────────────────────────────────────────
   assert.equal(await E(`validImport(JSON.parse(JSON.stringify(state)))`),true,`${label}: validImport after the changes`);
   const merged=await E(`(()=>{const a=JSON.parse(JSON.stringify(state)),b=JSON.parse(JSON.stringify(state));const st=mergeFamilyStates(clone(a),clone(a),clone(b),{now:Date.now()}).state;return{ok:validImport(JSON.parse(JSON.stringify(st))),lots:st.pantry.length,n:state.pantry.length}})()`);
   assert.ok(merged.ok&&merged.lots===merged.n,`${label}: sync merge keeps every lot ${JSON.stringify(merged)}`);
   assert.deepEqual(dialogs,[],`${label}: no browser dialogs`);assert.deepEqual(errors,[],`${label}: no page errors`);
   await context.close();runs0++;console.log(`PASS ${label}`)}
  console.log(`PASS round UI (${runs0} runs, ${shots} screenshots): quiet-hours switch, barcode amount required, “Nơi cất” fits, form messages in the app's language, dark “Hoàn tác” contrast, meal-group labels, whole plates`);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
