// v1.7.14 — owner, 8 Nov 2026 (Sydney time): “Bạn kiểm tra giỏ đồ của tôi, hôm qua vừa mới đi chợ rồi, cất đồ rồi mà tại sao vẫn hiện
// đồ để đi mua?” Two causes, found by doing the same in the browser:
//  1. a box / pack bought without a known weight was put away as 0 g, so the list kept asking for it in full;
//  2. rounding leftovers (996.9 g needed, 996.9 g kept) showed as 0.1 g to buy.
// Now a box / pack covers what the list asked for when put away (an estimate, shown in the pantry); boxes / packs put away before
// this fix are not guessed — the list asks “Đủ rồi / Vẫn cần mua”. 375×812, 320×740, 820×1100 (VI) and 1280×800 (EN); Chromium simulation.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const origin='https://kitchen.test',out='docs/reviews/v1.7.14';mkdirSync(out,{recursive:true});
const mime:any={'.js':'application/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'};
const sizes:any={mobile:{width:375,height:812},narrow:{width:320,height:740},tablet:{width:820,height:1100},desktop:{width:1280,height:800}};
(async()=>{
 const browser=await chromium.launch(process.env.BEP_CHROMIUM?{executablePath:process.env.BEP_CHROMIUM}:{});
 try{
  for(const [size,lang] of [['mobile','vi'],['narrow','vi'],['tablet','vi'],['desktop','en']] as const){const label=`${size} ${lang}`;
   const context=await browser.newContext({locale:'vi-VN',viewport:sizes[size],serviceWorkers:'block',reducedMotion:'reduce',timezoneId:'Australia/Sydney'});
   await context.addInitScript((lang:string)=>{if(sessionStorage.getItem('qa-init'))return;sessionStorage.setItem('qa-init','1');localStorage.setItem('bep-local-locked','yes');localStorage.setItem('guest/bep-language',lang)},lang);
   const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route(origin+'/**',async(r:any)=>{const u=new URL(r.request().url());if(u.pathname.startsWith('/.netlify/'))return r.fulfill({status:401,json:{error:'no'}});if(u.pathname==='/startup-scripts.json')return r.fulfill({json:JSON.parse(readFileSync('dist/startup-scripts.json','utf8'))});const f=resolve('dist',u.pathname==='/'?'index.html':u.pathname.slice(1));try{await r.fulfill({contentType:mime[extname(f)]||'application/octet-stream',body:readFileSync(f)})}catch{await r.fulfill({status:404,body:''})}});
   await page.goto(origin+'/#shopping',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#main h1'),null,{timeout:20000});
   const E=(s:string)=>page.evaluate(s) as Promise<any>;const shot=(n:string)=>page.screenshot({path:`${out}/${n}-${lang}-${sizes[size].width}x${sizes[size].height}.png`});
   await E(`(()=>{state.preferences.onboardingComplete=true;state.members=[['m-phu','Ba Phú',1],['m-mi','Mẹ Mi',1],['m-chi','Chi',.75]].map(([id,name,weight])=>({id,name,weight,emoji:''}));familyGenerate(state,weekStart,{sourceMode:'library'});for(const wk of Object.values(state.weeks))for(const day of Object.values(wk.days))for(const m of Object.values(day))if(m&&m.attendance)for(const q of state.members)m.attendance[q.id]??='home';state.pantry=[];state.preferences.pantryDeduct=true;weekStart=planStartOf(state,sydneyDate());selectedDate=sydneyDate();view='shopping';render()})()`);
   const toBuy=()=>E(`(()=>{const w=currentWeek(),[s,e]=shopDates();return shopping(state,w,s,e).filter(r=>shoppingHasAmount(r)&&!r.skip).map(r=>r.id)})()`);
   // one item bought by the box, with no weight known
   const boxed=await E(`(()=>{const w=currentWeek(),[s,e]=shopDates(),r=shopping(state,w,s,e).find(r=>shoppingHasAmount(r)&&INGREDIENTS[r.id][1]==='g');const sc=purchaseScope(s,e);w.buyingUnits={...(w.buyingUnits||{}),[sc]:{...((w.buyingUnits||{})[sc]||{}),[r.id]:{unit:'hộp',amount:1,pricePerUnit:null}}};save();render();return r.id})()`);
   assert.ok((await toBuy()).length>5,`${label}: a week's list to buy`);
   // shop for everything, then put it away
   await E(`(()=>{const w=currentWeek(),[s,e]=shopDates();for(const r of shopping(state,w,s,e).filter(r=>shoppingHasAmount(r)&&!r.skip))setShoppingBought(w,s,e,r,true);save();render()})()`);
   await E(`document.querySelector('#main [data-action="store-purchases"]').click()`);await page.locator('#modal-root #store-form').waitFor();await page.locator('#modal-root [data-action="submit-form"][data-id="store-form"]').click();await page.waitForFunction(()=>!document.querySelector('#modal-root #store-form'));await page.waitForTimeout(300);
   assert.deepEqual(await toBuy(),[],`${label}: after shopping and putting away, nothing is left to buy (owner's report)`);
   const lot:any=await E(`state.pantry.find(p=>p.ingredient===${JSON.stringify(boxed)})`);assert.ok(lot.qty>0&&lot.qtyEstimated===true&&lot.purchase.unit==='hộp',`${label}: the box covers what the list asked for, marked as an estimate ${JSON.stringify(lot)}`);
   await E(`view='pantry';render()`);assert.match(await page.locator('#main').innerText(),lang==='en'?/estimated to cover the planned meals/:/ước tính đủ cho các bữa đã lên lịch/,`${label}: the pantry says it is an estimate`);
   // a box put away before this fix (0 g): not guessed; the list asks
   await E(`(()=>{state.pantry=state.pantry.filter(p=>p.ingredient!==${JSON.stringify(boxed)});state.pantry.push({id:'qa-old-box',ingredient:${JSON.stringify(boxed)},qty:0,place:'fridge',expiry:'',purchase:{unit:'hộp',amount:1,pricePerUnit:null,currency:'AUD'}});save();view='shopping';render();scrollTo(0,0)})()`);
   assert.deepEqual(await toBuy(),[boxed],`${label}: an old box of unknown weight still shows`);
   const ask=page.locator(`#main .shop-row:has([data-id="${boxed}"]) .pack-cover`);await ask.waitFor();assert.match(await ask.innerText(),lang==='en'?/already put away/:/Đã cất 1 hộp/,`${label}: the row says what was put away`);
   assert.ok(await ask.locator('.btn').evaluateAll((b:any[])=>b.every(x=>x.getBoundingClientRect().height>=44)),`${label}: buttons ≥ 44 px`);await ask.scrollIntoViewIfNeeded();await shot('pack-cover-ask');
   await ask.locator('[data-flow="pack-enough"]').click();await page.waitForTimeout(300);assert.deepEqual(await toBuy(),[],`${label}: “Đủ rồi” takes it off the list`);
   assert.ok(await E(`state.pantry.find(p=>p.id==='qa-old-box').qtyEstimated===true`),`${label}: counted as an estimate`);
   // “Vẫn cần mua” keeps it and stops asking
   await E(`(()=>{const p=state.pantry.find(p=>p.id==='qa-old-box');p.qty=0;delete p.qtyEstimated;delete p.coverAsked;save();render()})()`);await page.locator(`#main .shop-row:has([data-id="${boxed}"]) [data-flow="pack-need"]`).click();await page.waitForTimeout(300);
   assert.deepEqual(await toBuy(),[boxed],`${label}: “Vẫn cần mua” keeps it on the list`);assert.equal(await page.locator('#main .pack-cover').count(),0,`${label}: and stops asking`);
   // a receipt scanned after putting away (owner: “nếu đã cho vào kho sau đó mới scan receipt thì sẽ báo là mua thêm”): linked, not added again
   {const r:any=await E(`(()=>{const lots=state.pantry.filter(p=>p.storedOn&&p.qty>0&&INGREDIENTS[p.ingredient][1]==='g').slice(0,2);const rec={id:'qa-rc-1',store:'Synthetic Grocer',date:sydneyDate(),currency:'AUD',items:lots.map((p,i)=>({id:'qa-l'+i,label:'QA '+i,ingredient:p.ingredient,quantity:300,total:4}))};state.receipts.push(rec);
     const plan=ReceiptUI.reconcilePlan(state,rec,currentWeek(),weekStart,addDays(weekStart,6)),n=state.pantry.length;ReceiptUI.applyReconcile(state,rec,currentWeek(),weekStart,addDays(weekStart,6),null);
     const linked=state.pantry.filter(p=>p.receiptId==='qa-rc-1').length,after=state.pantry.length;ReceiptUI.undoReconcile(state,rec);return{lots:lots.length,status:plan.rows.map(x=>x.status),n,after,linked,unlinked:state.pantry.filter(p=>p.receiptId==='qa-rc-1').length}})()`);
    assert.ok(r.lots===2&&r.status.every((x:string)=>x==='stored')&&r.after===r.n&&r.linked===2&&r.unlinked===0,`${label}: the receipt links to what was put away, adds nothing, undo unlinks ${JSON.stringify(r)}`);
    // the receipt line suggestions come from what was bought, not the whole catalogue (owner: “suggest chung chung của cả kho”)
    const bk:any=await E(`(()=>{newReceipt();const keys=ReceiptMatchUI.basket().map(b=>b.key);closeModal();return{keys,bought:Object.keys(currentWeek().boughtAt||{}).length}})()`);assert.ok(bk.bought>0&&bk.keys.length>=bk.bought,`${label}: items bought this week are offered for the receipt lines ${JSON.stringify(bk).slice(0,200)}`);
    // the text box holds only the item lines (owner: “ô text chỉ nên thể hiện các dòng là ingredients”), and reading it again gives the same items
    const tb:any=await E(`(()=>{newReceipt();ReceiptUI.fillDraft('SYNTHETIC BUTCHER PTY LTD\\nABN: 00 000 000 000\\n1 SAMPLE ROAD SUBURB NSW 2000\\nTAX INVOICE\\nDate: 07/11/2026   No: P0000000001\\nCashier: STAFF   Reg.: POS01\\nBEEF BALL   $13.35\\n0.534kg @ $25.00/kg\\nPORK BELLY   $30.21\\n1.374kg @ $21.99/kg\\nTOTAL: $43.56\\nCASH: $43.56',{keepStore:false});const raw=receiptDraft.raw,n1=receiptDraft.items.filter(i=>i.lineKind!=='rounding').length,t1=receiptDraft.total;ReceiptUI.fillDraft(raw);const out={raw,n1,n2:receiptDraft.items.length,t1,t2:receiptDraft.total};closeModal();receiptDraft=null;return out})()`);
    assert.ok(!/TAX INVOICE|ABN|Cashier|SAMPLE ROAD|CASH/.test(tb.raw)&&/BEEF BALL/.test(tb.raw)&&/PORK BELLY/.test(tb.raw)&&tb.n1===2&&tb.n2===2&&tb.t1===43.56&&tb.t2===43.56,`${label}: item lines only, read again the same ${JSON.stringify(tb)}`)}
   // crop the receipt photo before reading (owner: “you should also have functions to crop the receipt so the OCR can read easier”)
   {await E(`(async()=>{view='expenses';render();newReceipt();const c=document.createElement('canvas');c.width=900;c.height=1400;const x=c.getContext('2d');x.fillStyle='#6b5a45';x.fillRect(0,0,900,1400);x.fillStyle='#fff';x.fillRect(150,100,600,1200);x.fillStyle='#000';x.font='bold 30px monospace';
     ['SYNTHETIC GROCER','TAX INVOICE','BEEF BALL        $13.35','PORK BELLY       $30.21','TOFU             $2.50','TOTAL: $46.06'].forEach((t,i)=>x.fillText(t,180,220+i*80));const b=await new Promise(r=>c.toBlob(r,'image/png'));window.__qaPhoto=new File([b],'qa.png',{type:'image/png'});ReceiptCrop.open(window.__qaPhoto)})()`);
    await page.locator('#modal-root .rcrop-box').waitFor();
    assert.ok(await E(`[...document.querySelectorAll('.rcrop-h')].every(h=>{const r=h.getBoundingClientRect();return r.width>=44&&r.height>=44})`),`${label}: crop edges ≥ 44 px`);
    const read=page.locator('#modal-root [data-rcrop="read"]'),whole=page.locator('#modal-root [data-rcrop="whole"]');
    assert.ok(await read.evaluate((b:any)=>!!b.querySelector('svg.btn-art'))&&!(await whole.evaluate((b:any)=>!!b.querySelector('svg'))),`${label}: “Đọc phần đã cắt” drawn, “Đọc cả ảnh” words only`);
    const [rb,wb]=[await read.boundingBox(),await whole.boundingBox()];assert.ok(rb&&wb&&Math.abs(rb.y-wb.y)<2&&Math.abs(rb.height-wb.height)<2&&rb.height>=44,`${label}: the two buttons side by side, same size, ≥ 44 px`);
    // drag the top edge down and the left edge in (pointer), then the right edge with the keyboard
    const st=(await page.locator('#modal-root .rcrop-stage').boundingBox())!;for(const [k,dx,dy] of [['t',0,0.05],['l',0.1,0]] as [string,number,number][]){const h=(await page.locator('#modal-root .rcrop-'+k).boundingBox())!;await page.mouse.move(h.x+h.width/2,h.y+h.height/2);await page.mouse.down();await page.mouse.move(h.x+h.width/2+dx*st.width,h.y+h.height/2+dy*st.height,{steps:4});await page.mouse.up()}
    await page.locator('#modal-root .rcrop-r').focus();for(let i=0;i<10;i++)await page.keyboard.press('ArrowLeft');
    const c:any=await E('ReceiptCrop.get()');assert.ok(c.t>0.06&&c.l>0.11&&c.r<0.88,`${label}: edges move by pointer and keyboard ${JSON.stringify(c)}`);
    await shot('receipt-crop');
    await E(`ReceiptCrop.set({l:0.15,t:0.05,r:0.85,b:0.95})`);await read.click();await page.waitForFunction(()=>/item line|dòng món/.test(document.querySelector('#ocr-status')?.textContent||''),null,{timeout:180000});
    const got:any=await E(`(async()=>{const bm=await createImageBitmap(receiptPhoto);return{w:bm.width,h:bm.height,items:receiptDraft.items.filter(i=>i.lineKind!=='rounding').map(i=>i.label),total:receiptDraft.total,again:!!document.querySelector('#modal-root [data-rcrop="again"]')}})()`);
    assert.ok(got.w===630&&got.h===1260,`${label}: only the cropped part is read and kept ${got.w}×${got.h}`);assert.ok(got.items.length===3&&got.total===46.06,`${label}: the cropped receipt reads its 3 items and total ${JSON.stringify(got)}`);assert.ok(got.again,`${label}: “Cắt lại ảnh” under the photo`);
    await page.locator('#modal-root [data-rcrop="again"]').click();await page.locator('#modal-root .rcrop-box').waitFor();await E('closeModal();receiptDraft=null;view="shopping";render()')}
   // English: names the family added are shown in English when the meaning is known (owner: “dù đã chọn tiếng anh mà không dịch”)
   if(lang==='en'){await E(`(()=>{state.ingredientCatalog={...(state.ingredientCatalog||{}),'family-ing-qa-caingot':{name:'Rau cải ngọt',unit:'g',group:'veg'},'family-ing-qa-tom':{name:'Tôm (còn đuôi)',unit:'g',group:'meat'},'family-ing-qa-bun':{name:'Bún khô',unit:'g',group:'dry'},'family-ing-qa-la':{name:'Món lạ nhà làm',unit:'g',group:'dry'}};hydrateFamilyIngredients(state);
     for(const [id,u] of [['family-ing-qa-caingot','bó'],['family-ing-qa-tom','túi'],['family-ing-qa-bun','gói'],['family-ing-qa-la','gói']])state.pantry.push({id:'qa-'+id,ingredient:id,qty:0,place:'dry',expiry:addDays(sydneyDate(),1),purchase:{unit:u,amount:1,pricePerUnit:null,currency:'AUD'}});save();view='pantry';pantryFilter='all';render()})()`);
    const pt=await page.locator('#main').innerText();for(const want of ['Choy sum','Prawns (tail on)','Dried rice vermicelli','1 bag','Use by','to use soon'])assert.ok(pt.includes(want),`${label}: pantry shows “${want}”`);
    for(const vi of ['Rau cải ngọt','Tôm (còn đuôi)','Bún khô','túi','Hạn dùng','Chưa rõ khối lượng','lô cần dùng sớm'])assert.ok(!pt.includes(vi),`${label}: no “${vi}” in English`);assert.ok(pt.includes('Món lạ nhà làm'),`${label}: a name the app does not know stays as written`);
    await shot('pantry-english');await E(`(()=>{state.pantry=state.pantry.filter(p=>!String(p.id).startsWith('qa-family-ing'));save();view='shopping';render()})()`)}
   // Today (owner, 8 Nov 2026, screenshot): “nhiều bữa random bị hiện lên trước alert, welcome và clear fridge” — urgent notes, then
   // the greeting / use-it-up rows, then the notices, and only then the meals — in their usual order (“các bữa vẫn nên hiện như thường”)
   await E(`(()=>{selectedDate=sydneyDate();weekStart=planStartOf(state,selectedDate);const d=addDays(sydneyDate(),2),day=ensureWeek(state,planStartOf(state,d)).days[d],t=MEAL_TYPES.find(x=>fmMealOn(day,x)&&day[x]&&!day[x].cooked);
    setMealGuests(day[t],[{name:'Nhà anh Tuấn',adults:3,kids:0,invite:{id:'inv-qa140001',token:'Q'.repeat(32),deadline:new Date(Date.now()+86400000).toISOString(),expiresAt:new Date(Date.now()+3*86400000).toISOString()},rsvp:{status:'yes',at:new Date().toISOString()}}]);save();view='today';render();scrollTo(0,0);window.__qa={d,t}})()`);
   const order:any=await E(`[...document.querySelector('#main').children].map(c=>c.classList.contains('family-urgent')?'urgent':c.classList.contains('flow-rows-top')?'top':c.classList.contains('invite-notices')?'guests':c.classList.contains('next-meal')?'next':c.classList.contains('dashboard-grid')?'grid':'').filter(Boolean)`);
   assert.deepEqual(order,['urgent','top','guests','grid'],`${label}: urgent notes, greeting rows, guest notice, then the day's meals in their usual order (${order})`);
   // guests who answered for a coming day are on Today, with their answer and the week that counts them (owner: “không thấy thông tin gì”)
   const notice=page.locator('#main .invite-notices');const nt=await notice.innerText();assert.match(nt,lang==='en'?/Guests coming up[\s\S]*Nhà anh Tuấn · coming · 3 adults/:/Khách sắp tới[\s\S]*Nhà anh Tuấn · sẽ đến · 3 lớn/,`${label}: upcoming guests with their answer (${nt})`);
   assert.ok(await notice.locator('[data-fm="guests"]').evaluate((b:any)=>b.getBoundingClientRect().height>=44&&!b.querySelector('svg')),`${label}: “Xem” ≥ 44 px, words only`);await notice.scrollIntoViewIfNeeded();await shot('today-guests');
   await notice.locator('[data-fm="guests"]').click();await page.locator('#modal-root .guest-invite-status').waitFor();assert.match(await page.locator('#modal-root .guest-invite-status').innerText(),lang==='en'?/coming · 3 adults/:/sẽ đến · 3 lớn/,`${label}: “Xem” opens that meal with the answer`);await E('closeModal()');
   // “Có khách” on a day without guests lists the guests already planned
   await page.locator('#main .guest-shortcut').click();const up=page.locator('#modal-root .guest-upcoming');await up.waitFor();assert.match(await up.innerText(),/Nhà anh Tuấn/,`${label}: the guest sheet lists guests already planned`);await shot('guest-sheet-planned');await E('closeModal()');
   // 👍 / 👎 on each dish show their drawing (they showed only “0” before)
   assert.ok(await E(`(()=>{const b=[...document.querySelectorAll('#main .mr-btn')];return b.length>0&&b.every(x=>x.querySelector('svg.btn-art')&&x.getBoundingClientRect().height>=44)})()`),`${label}: like / dislike buttons drawn, ≥ 44 px`);
   const ow=await E('document.documentElement.scrollWidth-innerWidth');assert.ok(ow<=1,`${label}: overflow ${ow}`);assert.deepEqual(errors,[],`${label}: page errors`);await context.close();console.log('✓',label)}
  console.log('PASS v1.7.14: nothing left to buy after shopping and putting away; boxes of unknown weight handled; Today order; guests coming up; drawn like / dislike; receipt after put-away linked; receipt text box item lines only; suggestions from what was bought; pantry in English; receipt crop');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
