// v1.7.16 — owner, 8 Nov 2026 (Sydney time):
//  • “Cái có khách có vẻ như để huỷ buổi tiệc hay huỷ invite cho ai đó không được, ví dụ tôi có tesr là khách, vào xoá mà nó vẫn báo
//    là có khách.” An invited group sits on every meal of its invitation; the sheet showed one meal, so removing and saving left
//    the other meals with the guest and Today kept listing it. Now removing an invited group and saving takes it off every meal of
//    the invitation and withdraws the link (the sheet says so before saving; “Đóng” changes nothing).
//  • “Nút bắt đầu đi chợ làm to ra và có viền màu flashing chạy viền ngoài.” A bigger “Bắt đầu đi chợ” with a colour ring running
//    around it; still under reduced motion.
// 375×812, 320×740, 820×1100 (VI) and 1280×800 (EN); Chromium viewport simulation.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const origin='https://kitchen.test',out='docs/reviews/v1.7.16';mkdirSync(out,{recursive:true});
const mime:any={'.js':'application/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'};
const sizes:any={mobile:{width:375,height:812},narrow:{width:320,height:740},tablet:{width:820,height:1100},desktop:{width:1280,height:800}};
(async()=>{
 const browser=await chromium.launch(process.env.BEP_CHROMIUM?{executablePath:process.env.BEP_CHROMIUM}:{});
 try{
  for(const [size,lang] of [['mobile','vi'],['narrow','vi'],['tablet','vi'],['desktop','en']] as const){const label=`${size} ${lang}`;
   const context=await browser.newContext({locale:'vi-VN',viewport:sizes[size],serviceWorkers:'block',reducedMotion:'reduce',timezoneId:'Australia/Sydney'});
   await context.addInitScript((lang:string)=>{if(sessionStorage.getItem('qa-init'))return;sessionStorage.setItem('qa-init','1');localStorage.setItem('bep-local-locked','yes');localStorage.setItem('guest/bep-language',lang)},lang);
   const page=await context.newPage(),errors:string[]=[],cancels:any[]=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route(origin+'/**',async(r:any)=>{const u=new URL(r.request().url());
    if(u.pathname==='/.netlify/functions/family'&&u.searchParams.get('op')==='invite-cancel'){cancels.push(JSON.parse(r.request().postData()||'{}'));return r.fulfill({json:{cancelled:true}})}
    if(u.pathname.startsWith('/.netlify/'))return r.fulfill({status:401,json:{error:'no'}});
    if(u.pathname==='/startup-scripts.json')return r.fulfill({json:JSON.parse(readFileSync('dist/startup-scripts.json','utf8'))});
    const f=resolve('dist',u.pathname==='/'?'index.html':u.pathname.slice(1));try{await r.fulfill({contentType:mime[extname(f)]||'application/octet-stream',body:readFileSync(f)})}catch{await r.fulfill({status:404,body:''})}});
   await page.goto(origin+'/#today',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#main h1'),null,{timeout:20000});
   const E=(s:string)=>page.evaluate(s) as Promise<any>;const shot=(n:string)=>page.screenshot({path:`${out}/${n}-${lang}-${sizes[size].width}x${sizes[size].height}.png`});
   await E(`(()=>{state.preferences.onboardingComplete=true;state.members=[['m-phu','Ba Phú',1],['m-mi','Mẹ Mi',1]].map(([id,name,weight])=>({id,name,weight,emoji:''}));familyGenerate(state,weekStart,{sourceMode:'library'});state.pantry=[];weekStart=planStartOf(state,sydneyDate());selectedDate=sydneyDate();closeModal();save();render()})()`);

   // 1. an invited group on three meals (breakfast, lunch and dinner two days from now)
   const meals:any=await E(`(()=>{const d=addDays(sydneyDate(),2),w=ensureWeek(state,planStartOf(state,d));if(!w.familyMode)familyGenerate(state,planStartOf(state,d),{sourceMode:'library'});const wk=ensureWeek(state,planStartOf(state,d)),types=MEAL_TYPES.filter(t=>wk.days[d][t]&&fmMealOn(wk.days[d],t)).slice(0,3);
    const g={name:'Tesr',adults:1,kids:0,invite:{id:'inv-tesr0001',token:'k7m4p9',deadline:new Date(Date.now()+86400000).toISOString(),expiresAt:new Date(Date.now()+3*86400000).toISOString()}};for(const t of types)setMealGuests(wk.days[d][t],[clone(g)]);
    state.weeks[planStartOf(state,d)]=wk;save();view='today';location.hash='today';render();scrollTo(0,0);return {d,types}})()`);
   assert.ok(meals.types.length>=2,`${label}: the invitation covers several meals (${meals.types})`);
   const withTesr=()=>E(`(()=>{const d=${JSON.stringify(meals.d)},day=ensureWeek(state,planStartOf(state,d)).days[d];return ${JSON.stringify(meals.types)}.filter(t=>(day[t].guests||[]).some(g=>g.name==='Tesr')).length})()`);
   const soon=page.locator('#main .invite-soon li',{hasText:'Tesr'});await soon.waitFor();
   // removing and closing with “Đóng” changes nothing
   await soon.locator('[data-fm="guests"]').click();await page.locator('#modal-root #guest-groups').waitFor();
   await page.locator('#modal-root #guest-groups [data-fm="guest-remove"]').first().click();
   const note=page.locator('#modal-root #guest-drop-note');await note.waitFor();
   assert.match(await note.innerText(),lang==='en'?/Tap Save to remove Tesr from every meal of the invitation and withdraw the link/:/Bấm Lưu để bỏ Tesr khỏi mọi bữa của lời mời và huỷ link đã gửi/,`${label}: the sheet says what saving does`);
   await note.scrollIntoViewIfNeeded();await shot('guest-remove-note');
   await page.locator('#modal-root [data-action="close-modal"]').last().click();await page.waitForTimeout(200);
   assert.equal(await withTesr(),meals.types.length,`${label}: “Đóng” keeps the guests`);assert.equal(cancels.length,0,`${label}: nothing withdrawn on “Đóng”`);
   // removing and saving: off every meal of the invitation, the link withdrawn, Today no longer lists the guest
   await page.locator('#main .invite-soon li',{hasText:'Tesr'}).locator('[data-fm="guests"]').click();await page.locator('#modal-root #guest-groups').waitFor();
   await page.locator('#modal-root #guest-groups [data-fm="guest-remove"]').first().click();await page.locator('#modal-root [data-fm="guests-save"]').click();
   await page.waitForFunction(()=>!document.querySelector('#modal-root #guest-groups'));await page.waitForTimeout(400);
   assert.equal(await withTesr(),0,`${label}: Tesr is off every meal of the invitation (owner's report)`);
   assert.deepEqual(cancels,[{inviteId:'inv-tesr0001'}],`${label}: the invitation link is withdrawn`);
   assert.equal(await page.locator('#main .invite-notices',{hasText:'Tesr'}).count(),0,`${label}: Today no longer says Tesr is coming`);
   assert.match(await E(`document.getElementById('toast').innerText`),lang==='en'?/Invitation withdrawn: Tesr/:/Đã huỷ lời mời: Tesr/,`${label}: the family is told the link was withdrawn`);
   await shot('guest-removed-today');

   // 2. “Bắt đầu đi chợ”: bigger, with a colour ring running around it (still under reduced motion)
   await E(`view='shopping';location.hash='shopping';render();scrollTo(0,0)`);const start=page.locator('#main [data-flow="shop-start"]');await start.waitFor();
   const box=(await start.boundingBox())!,wrap=(await page.locator('#main .shop-mode-start').boundingBox())!;
   assert.ok(box.height>=56,`${label}: the start button is big (${box.height} px)`);
   if(size==='mobile'||size==='narrow')assert.ok(box.width>=wrap.width-12,`${label}: full width on phones (${box.width} of ${wrap.width})`);
   const ring=(m:string)=>start.evaluate((b:any,m:string)=>{const s=getComputedStyle(b,'::before');return {anim:s.animationName,img:s.backgroundImage,m}},m);
   const still=await ring('reduce');assert.ok(/conic-gradient/.test(still.img)&&still.anim==='none',`${label}: the colour ring is there and still under reduced motion ${JSON.stringify(still)}`);
   await page.emulateMedia({reducedMotion:'no-preference'});const moving=await ring('motion');assert.equal(moving.anim,'shop-ring',`${label}: the ring runs around the button`);
   await page.emulateMedia({reducedMotion:'reduce'});
   assert.ok(await start.evaluate((b:any)=>!!b.querySelector('.btn-art')),`${label}: the main button keeps its drawing (rule 27)`);
   await shot('shop-start');
   await start.click();await page.locator('#main .shop-mode-bar').waitFor();assert.ok(true);
   // 3. receipt lines (owner, 8 Nov 2026: “Hình đơn vị bị chèn, nguyên liệu chưa đối ứng không có lựa chọn search hoặc thêm mà chỉ có
   //    dropdown”): the unit fits; the match box finds an ingredient by typing (no accents needed) and adds a new one
   await E(`(()=>{view='today';location.hash='today';render();newReceipt();receiptDraft.items=[{id:'l1',label:'18 XINH-XINH CHA SONG',total:10,match:'',qty:null,unit:'',confidence:'unknown'},{id:'l2',label:'SUNNY FROZEN PRAWN GP CUTLET',total:22.5,match:'',qty:null,unit:'',confidence:'unknown'}];receiptEditor()})()`);
   const line=(i:number)=>page.locator(`#modal-root .receipt-line[data-index="${i}"]`);await line(0).waitFor();
   const unitFits=await line(0).locator('.receipt-unit').evaluate((s:any)=>{const c=document.createElement('canvas').getContext('2d')!,cs=getComputedStyle(s);c.font=`${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;const text=c.measureText(s.options[s.selectedIndex].text).width;return {text:Math.round(text),room:Math.round(s.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight)-14)}});
   assert.ok(unitFits.text<=unitFits.room,`${label}: “${lang==='en'?'Unknown':'Chưa rõ'}” fits in the unit box ${JSON.stringify(unitFits)}`);
   assert.equal(await line(0).locator('select.receipt-match').isVisible(),false,`${label}: the long dropdown is replaced`);
   const mbox=line(1).locator('.rm-search');assert.ok((await mbox.boundingBox())!.height>=44,`${label}: match box ≥ 44 px`);
   const prawn:string=await E(`Object.keys(INGREDIENTS).find(id=>INGREDIENTS[id][0]==='Tôm')`);assert.ok(prawn,'Tôm exists');
   await mbox.click();await mbox.fill(lang==='en'?'prawn':'tom');const opt=line(1).locator(`.rm-opt[data-rm-value="${prawn}"]`);await opt.waitFor();
   assert.ok((await opt.boundingBox())!.height>=44,`${label}: suggestions ≥ 44 px`);await line(1).locator('.rm-list').scrollIntoViewIfNeeded();await shot('receipt-match-search');
   await opt.click();assert.equal(await line(1).locator('select.receipt-match').inputValue(),prawn,`${label}: typing “tom” finds Tôm (no accents needed)`);
   assert.equal(await mbox.inputValue(),await E(`shopIngName(${JSON.stringify(prawn)})`),`${label}: the box shows the chosen ingredient`);
   // a name the app does not know yet: add it, in the line's unit
   await line(0).locator('.receipt-unit').selectOption('kg');const b0=line(0).locator('.rm-search');await b0.click();await b0.fill('Chả song');
   const add=line(0).locator('.rm-new');await add.waitFor();assert.match(await add.innerText(),lang==='en'?/Add a new ingredient: “Chả song”/:/Thêm nguyên liệu mới: “Chả song”/,`${label}: offers to add a new ingredient`);
   await add.click();const made:any=await E(`(()=>{const v=document.querySelector('#modal-root .receipt-line[data-index="0"] select.receipt-match').value;return {v,cat:state.ingredientCatalog?.[v]}})()`);
   assert.ok(/^family-ing-/.test(made.v)&&made.cat?.name==='Chả song'&&made.cat.unit==='g',`${label}: “Chả song” added to the family's ingredients in grams ${JSON.stringify(made)}`);
   assert.equal(await E(`(collectReceipt(),receiptDraft.items[0].match)`),made.v,`${label}: the receipt line keeps the match`);
   await b0.click();await b0.fill('cha song');assert.ok(await line(0).locator(`.rm-opt[data-rm-value="${made.v}"]`).count()===1&&await line(0).locator('.rm-new').count()===0,`${label}: next time it is found, not added twice`);
   await page.keyboard.press('Escape');await E('closeModal()');
   const ow=await E('document.documentElement.scrollWidth-innerWidth');assert.ok(ow<=1,`${label}: overflow ${ow}`);assert.deepEqual(errors,[],`${label}: page errors`);await context.close();console.log('✓',label)}
  console.log('PASS v1.7.16: removing an invited guest takes it off every meal of the invitation and withdraws the link (“Đóng” keeps it); a bigger “Bắt đầu đi chợ” with a running colour ring, still under reduced motion; receipt unit fits and the match box finds or adds an ingredient — 375 / 320 / 820 / 1280, VI and EN');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
