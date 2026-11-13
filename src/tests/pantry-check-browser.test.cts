// v1.7.19 “Đồ trong tủ” sheet on Đi chợ — owner, 12 Nov 2026 (Sydney time), screenshot: “Nút này ấn vào vô dụng vậy?”
// The button counted every pantry lot (27) but the sheet listed only this week's needs, so it was empty when nothing was
// planned. Pop-up: “Sửa cho đúng”. Checks: the number on the button equals what the sheet lists; with no meals the sheet
// says so and still lists the pantry; with a planned need the need · have · “Bỏ qua” row comes first and ticking it hides
// the row from the list; a pantry lot opens its edit form; footer pill, ≥ 44 px targets, no emoji, no sideways overflow at
// 320×740, 375×812, 820×1100 and 1280×800 in VI / EN, light / dark. Chromium viewport simulation, device-only mode, QA data.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const origin='https://kitchen.test',out='docs/reviews/v1.7.19/pantry-check';mkdirSync(out,{recursive:true});
const mime:any={'.js':'application/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'};
const sizes:any={narrow:{width:320,height:740},mobile:{width:375,height:812},tablet:{width:820,height:1100},desktop:{width:1280,height:800}};
const EMOJI=/\p{Extended_Pictographic}/u;
(async()=>{
 const browser=await chromium.launch(process.env.BEP_CHROMIUM?{executablePath:process.env.BEP_CHROMIUM}:{});let shots=0;
 try{
  const runs:[string,string,string][]=[['mobile','vi','light'],['narrow','vi','light'],['tablet','vi','light'],['desktop','vi','light'],['mobile','en','dark'],['narrow','en','dark'],['tablet','en','dark'],['desktop','en','dark']];
  for(const [size,lang,theme] of runs){const label=`${size} ${lang} ${theme}`,vi=lang==='vi';
   const context=await browser.newContext({locale:'vi-VN',viewport:sizes[size],serviceWorkers:'block',reducedMotion:'reduce',colorScheme:theme as any,timezoneId:'Australia/Sydney'});
   await context.addInitScript(({lang,theme}:any)=>{if(sessionStorage.getItem('qa-init'))return;sessionStorage.setItem('qa-init','1');localStorage.setItem('bep-theme-mode',theme);localStorage.setItem('guest/bep-language',lang);localStorage.setItem('bep-local-locked','yes')},{lang,theme});
   const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route(origin+'/**',async(r:any)=>{const u=new URL(r.request().url());if(u.pathname.startsWith('/.netlify/'))return r.fulfill({status:401,json:{error:'no'}});if(u.pathname==='/startup-scripts.json')return r.fulfill({json:JSON.parse(readFileSync('dist/startup-scripts.json','utf8'))});const f=resolve('dist',u.pathname==='/'?'index.html':u.pathname.slice(1));try{await r.fulfill({contentType:mime[extname(f)]||'application/octet-stream',body:readFileSync(f)})}catch{await r.fulfill({status:404,body:'Not found'})}});
   await page.goto(origin+'/#shopping',{waitUntil:'domcontentloaded'});
   const E=(s:string)=>page.evaluate(s) as Promise<any>;
   for(let i=0;;i++){try{await page.waitForFunction(()=>typeof (globalThis as any).shopping==='function'&&document.querySelector('#main h1'),null,{timeout:20000});break}catch(e){if(i>3)throw e;await page.waitForTimeout(700)}}
   // QA data: no meals this week; three pantry lots (one without an expiry date).
   await E(`(()=>{state.preferences.onboardingComplete=true;const w=currentWeek();for(const d of Object.values(w.days))for(const t of Object.keys(d))if(d[t]&&Array.isArray(d[t].recipes))d[t].recipes=[];const ids=Object.keys(INGREDIENTS);state.pantry=[{id:'qa-l1',ingredient:ids[0],qty:2,place:'fridge',expiry:addDays(sydneyDate(),2)},{id:'qa-l2',ingredient:ids[1],qty:500,place:'freezer',expiry:addDays(sydneyDate(),20)},{id:'qa-l3',ingredient:ids[2],qty:1,place:'dry'}];save();closeModal();view='shopping';render()})()`);
   await page.waitForTimeout(250);
   const btn=page.locator('#main [data-action="check-pantry"]').first();await btn.waitFor({timeout:8000});
   const open=async()=>{await btn.scrollIntoViewIfNeeded();await btn.click();await page.waitForSelector('.modal .pantry-check-list, .modal [data-pantry-none]');await page.waitForTimeout(120)};
   const count=async()=>+(((await btn.innerText()).match(/\((\d+)\)/)||[])[1]??-1);
   const listed=()=>E(`document.querySelectorAll('.modal label.shop-row').length+document.querySelectorAll('.modal .pantry-check-lot').length`);
   const checks=async(where:string)=>{
    const o=await E(`(()=>{const m=document.querySelector('.modal');return{doc:document.documentElement.scrollWidth-innerWidth,modal:m?m.scrollWidth-m.clientWidth:0}})()`);assert.ok(o.doc<=0&&o.modal<=0,`${label} ${where}: no sideways overflow ${JSON.stringify(o)}`);
    const small=await E(`[...document.querySelectorAll('.modal button,.modal input[type=checkbox]')].filter(e=>e.offsetParent&&!e.closest('label')&&(e.getBoundingClientRect().height<43.5||e.getBoundingClientRect().width<43.5)).map(e=>e.textContent.trim()||e.className)`);assert.deepEqual(small,[],`${label} ${where}: targets ≥ 44 px`);
    const t=await page.locator('.modal').innerText();assert.ok(!EMOJI.test(t),`${label} ${where}: no emoji`)};
   const shot=async(n:string)=>{await page.screenshot({path:`${out}/${n}-${lang}-${theme}-${sizes[size].width}x${sizes[size].height}.png`});shots++};

   // 1. No meals: the button counts the pantry and the sheet lists exactly that, saying nothing on the list is in the pantry.
   const n0=await count();await open();
   assert.equal(await listed(),n0,`${label}: the button's number (${n0}) is what the sheet lists`);assert.equal(n0,3,`${label}: three pantry lots`);
   assert.match(await page.locator('.modal [data-pantry-none]').innerText(),vi?/chưa cần mua món nào tủ đã có/:/Nothing on this week’s list/);
   assert.equal(await page.locator('.modal .modal-actions .btn.primary, .modal footer .btn.primary, .modal .btn.primary').count()>=1,true,`${label}: Xong pill`);
   await checks('no meals');await shot('1-khong-co-mon');
   // a lot opens its edit form
   await page.locator('.modal .pantry-check-lot').first().click();await page.waitForSelector('.modal #stock-form, .modal form');assert.match(await page.locator('.modal').innerText(),vi?/Chỉnh thực phẩm/:/Ingredient/,`${label}: the lot's edit form opens`);
   await E('closeModal()');await page.waitForTimeout(100);

   // 2. A planned need that the pantry covers: need · have · Skip row first; ticking Skip keeps the pantry amount.
   await E(`(()=>{const ids=Object.keys(INGREDIENTS);const w=currentWeek();const day=w.days[selectedDate]||Object.values(w.days)[0];const r=clone(state.recipes[0]);r.id='qa-dish';r.custom=true;r.ingredients=[{id:ids[0],qty:1}];day.dinner.recipes=[r];day.dinner.cooked=false;save();render()})()`);
   await page.waitForTimeout(200);const n1=await count();await open();
   const need=page.locator('.modal label.shop-row').first();await need.waitFor();assert.match(await need.innerText(),vi?/Cần .* · Có /:/Need .* · Have /);
   assert.equal(await listed(),n1,`${label}: with a need, the number (${n1}) still matches the sheet`);await checks('with need');await shot('2-co-mon-trung');
   const before=await E(`state.pantry.find(p=>p.id==='qa-l1').qty`);await need.locator('input[type=checkbox]').check();await page.waitForTimeout(150);
   assert.equal(await E(`state.pantry.find(p=>p.id==='qa-l1').qty`),before,`${label}: “Bỏ qua” does not change the pantry`);
   assert.ok(await E(`shopping(state,currentWeek(),...shopDates()).some(r=>r.skip)`),`${label}: the row is skipped this week`);
   // both buttons on Đi chợ open this sheet and show the same number as it lists (rule 29)
   await E('closeModal()');await page.waitForTimeout(150);const nums=await E(`[...document.querySelectorAll('#main [data-action="check-pantry"]')].map(b=>+((b.textContent.match(/\\((\\d+)\\)/)||[])[1]??-1))`);
   await open();const now=await listed();assert.ok(nums.length>=1&&nums.every((x:number)=>x===now),`${label}: every “đồ trong tủ” button shows ${now}: ${JSON.stringify(nums)}`);
   const borders=await E(`[...document.querySelectorAll('.modal .pantry-check-lot')].map(e=>getComputedStyle(e).borderTopWidth)`);assert.ok(borders.every((b:string)=>b!=='0px'),`${label}: every lot row has its border`);
   assert.deepEqual(errors,[],`${label}: no page errors`);await context.close()}
  console.log(`PASS “Đồ trong tủ”: the number matches the sheet, empty week explained, need · have · Skip first, lots open their form, ≥44 px, no emoji, no overflow (${shots} screenshots)`);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
