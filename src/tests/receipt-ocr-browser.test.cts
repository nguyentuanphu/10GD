// v1.7.1 receipt reading — browser test (Chromium, device-only mode, viewport simulation — not physical devices).
//  1. Full pipeline on SYNTHETIC receipt renders (text fixtures drawn on a canvas, tilted, with a shadow): photo →
//     on-device preparation → self-hosted OCR → shared parser → the "Chụp / nhập hóa đơn" form.
//  2. The receipt form (old-app OCR text of Henry's ALDI receipt), reconciliation with this week's shopping list and
//     the pantry (apply + undo, offline), duplicate prompt (same receipt photographed twice), refund, UK receipt.
//  3. So Giá photo capture of a receipt opens the same form with the same parse.
// Sizes: mobile 375×812 (VI + EN), tablet 820×1100, desktop 1280×800. Screenshots → docs/reviews/v1.7.1/receipt-ocr.
// Optional, LOCAL ONLY: RECEIPT_PHOTOS_DIR=<folder of real photos> also runs the pipeline on each photo and prints
// what was read (photos are never committed or uploaded).
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert');
const {RECEIPTS}=require('./fixtures/receipts.cjs');
const root=process.cwd(),dir='docs/reviews/v1.7.1/receipt-ocr';fs.mkdirSync(dir,{recursive:true});
const types={'.html':'text/html','.js':'application/javascript','.json':'application/json','.css':'text/css','.webp':'image/webp','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json','.gz':'application/gzip','.wasm':'application/wasm'};
async function route(page){await page.route('https://kitchen.test/**',async r=>{const url=new URL(r.request().url());if(url.pathname.startsWith('/.netlify/')){const op=url.searchParams.get('op');return r.fulfill({json:op==='status'?{configured:false,connected:false}:op==='state'?{state:null,etag:null}:op==='families'?{families:[]}:{announcements:[],devices:[]}})}
 const file=path.join(root,'dist',url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1)));if(!file.startsWith(path.join(root,'dist'))||!fs.existsSync(file)||fs.statSync(file).isDirectory())return r.fulfill({status:404,body:'missing'});return r.fulfill({body:fs.readFileSync(file),contentType:types[path.extname(file)]||'application/octet-stream'})})}
const noOverflow=async(page,label)=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'horizontal overflow: '+label);
const shot=async(page,file)=>{await page.evaluate(()=>{const t=document.querySelector('#toast');if(t)t.className=''});await page.screenshot({path:`${dir}/${file}.jpg`,type:'jpeg',quality:68});const kb=fs.statSync(`${dir}/${file}.jpg`).size/1024;assert.ok(kb<250,`${file}.jpg is ${kb.toFixed(0)} KB (limit 250)`)};
const targets=async(page,sel,label)=>{const small=await page.evaluate(s=>[...document.querySelectorAll(s)].filter(e=>e.offsetParent).map(e=>[e.textContent.trim().slice(0,30),e.getBoundingClientRect()]).filter(([,b])=>b.height<44).map(([n,b])=>n+' '+Math.round(b.width)+'×'+Math.round(b.height)),sel);assert.deepEqual(small,[],'≥44px targets: '+label+' '+JSON.stringify(small))};
// Synthetic family dinner using salmon and sweet corn this week (QA only), so the receipt can be reconciled.
const seed=()=>{const r={id:'qa-salmon',name:'QA Cá hồi áp chảo bắp',category:'main',protein:'fish',time:20,servings:4,yield:4,ingredients:[{id:'salmon',qty:400},{id:'corn',qty:300}],prep:'QA',steps:['QA'],custom:true,favorite:false,purposes:['main']};
 if(!state.recipes.some(x=>x.id===r.id))state.recipes.push(r);state.preferences.onboardingComplete=true;
 const w=currentWeek(),date=addDays(weekStart,2);w.days[date].dinner.recipes=[clone(r)];w.days[date].dinner.cooked=false;state.pantry=state.pantry.filter(p=>!['salmon','corn'].includes(p.ingredient));save();closeModal();view='expenses';location.hash='expenses';render()};
// Draws fixture text like a thermal receipt (monospace), slightly tilted with a soft shadow, returns a File.
const renderReceipt=async(page,text,{angle=1.2,width=560}={})=>page.evaluateHandle(async({text,angle,width})=>{const lines=text.split('\n'),lh=30,pad=40,c=document.createElement('canvas');c.width=width+120;c.height=lines.length*lh+pad*2+80;const g=c.getContext('2d');g.fillStyle='#6d6a64';g.fillRect(0,0,c.width,c.height);
 g.save();g.translate(c.width/2,c.height/2);g.rotate(angle*Math.PI/180);g.translate(-c.width/2,-c.height/2);g.fillStyle='#f7f5ef';g.fillRect(60,40,width,c.height-80);g.fillStyle='#1d1d1d';g.font='21px "DejaVu Sans Mono", "Courier New", monospace';
 lines.forEach((l,i)=>{const m=l.match(/^(.*?)\s+(-?\$?£?-?\d+\.\d{2}(?:\s[AB])?)$/);if(m){g.fillText(m[1],80,40+pad+i*lh);const w=g.measureText(m[2]).width;g.fillText(m[2],60+width-20-w,40+pad+i*lh)}else g.fillText(l,80,40+pad+i*lh)});g.restore();
 const sh=g.createLinearGradient(0,0,c.width,c.height);sh.addColorStop(0,'rgba(0,0,0,0)');sh.addColorStop(1,'rgba(0,0,0,0.28)');g.fillStyle=sh;g.fillRect(0,0,c.width,c.height);
 const blob=await new Promise(r=>c.toBlob(r,'image/png'));return new File([blob],'synthetic-receipt.png',{type:'image/png',lastModified:Date.now()})},{text,angle,width});
const draftSummary=page=>page.evaluate(()=>({n:receiptDraft.items.length,items:receiptDraft.items.map(i=>[i.label,i.total,i.match,i.qty,i.unit]),total:receiptDraft.total,store:receiptDraft.store,date:receiptDraft.date,warnings:(receiptDraft.meta?.warnings||[]).map(w=>w.code)}));
const parseIn=async(page,key)=>{await page.evaluate(t=>{newReceipt();document.querySelector('#receipt-raw').value=t},RECEIPTS[key].text);await page.locator('#modal-root [data-feature="receipt-parse"]').click();await page.locator('#modal-root .receipt-line').first().waitFor()};
const truth=key=>{const sum=RECEIPTS[key].expect;return sum};

(async()=>{const browser=await chromium.launch(process.env.BEP_CHROMIUM?{executablePath:process.env.BEP_CHROMIUM}:{});
 // ---------- 1. full pipeline on synthetic renders (desktop, once)
 {const context=await browser.newContext({locale:'vi-VN',viewport:{width:1280,height:800},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await route(page);
  await page.goto('https://kitchen.test/#expenses');await page.locator('#main .page-heading').waitFor({timeout:20000});await page.evaluate(seed);
  for(const key of ['aldi-wolli-creek','coles-16-waterloo']){
   const file=await renderReceipt(page,RECEIPTS[key].text);const t0=Date.now();
   await page.evaluate(async f=>{newReceipt();await readReceiptPhoto(f);/* v1.7.14: a photo opens “Cắt hóa đơn” first — “Đọc cả ảnh” reads the whole photo as before */if(document.querySelector('#modal-root [data-rcrop="whole"]'))await ReceiptCrop.read(true)},file);
   const d=await draftSummary(page),exp=truth(key),want=RECEIPTS[key].expect;
   const rp=await page.evaluate(t=>ReceiptParse.parseReceipt(t).items.filter(i=>i.kind==='item').map(i=>[i.name,i.price]),RECEIPTS[key].text);
   const got=d.items.map(i=>i[1]);let ok=0;const pool=[...got];for(const[,p]of rp){const k=pool.findIndex(x=>Math.abs(x-p)<0.005);if(k>=0){ok++;pool.splice(k,1)}}
   console.log(`pipeline ${key}: ${ok}/${rp.length} prices, total ${d.total} (printed ${exp.printedTotal}), store "${d.store}", ${Date.now()-t0} ms`);
   assert.ok(ok>=rp.length-1,`${key}: at most one line missed (${ok}/${rp.length})`);assert.equal(d.total,want.printedTotal,key+' printed total read');assert.equal(d.store,want.store,key+' store read');
   assert.ok(!(await page.evaluate(()=>receiptDraft.raw)).match(/CARD NO|AID|ARQC|TVR|TERMINAL|REFERENCE|AUTH CODE|Store Manager/i),'payment / staff lines never kept in the saved text');
  }
  if(process.env.RECEIPT_PHOTOS_DIR){// LOCAL ONLY — real photos, nothing saved or committed
   for(const f of fs.readdirSync(process.env.RECEIPT_PHOTOS_DIR).filter(f=>/\.(jpe?g|png|webp)$/i.test(f)).sort()){
    const bytes=fs.readFileSync(path.join(process.env.RECEIPT_PHOTOS_DIR,f)).toString('base64');const t0=Date.now();
    const r=await page.evaluate(async({bytes,f})=>{const b=Uint8Array.from(atob(bytes),c=>c.charCodeAt(0));const file=new File([b],f,{type:f.endsWith('png')?'image/png':f.endsWith('webp')?'image/webp':'image/jpeg'});await loadOCR();const res=await ReceiptParse.recognize(file);const p=ReceiptParse.parseReceipt(res.text);return{used:res.used,info:res.info,store:p.store,date:p.date,total:p.printedTotal,items:p.items.filter(i=>i.kind==='item').map(i=>i.name+' '+i.price),warnings:p.warnings.map(w=>w.code)}},{bytes,f});
    console.log('LOCAL photo',f,Date.now()-t0,'ms',JSON.stringify(r))}
  }
  assert.deepEqual(errors,[],'no page errors (pipeline)');await context.close();}

 // ---------- 2/3. form, reconciliation, duplicates, refund, UK, So Giá at three sizes
 for(const [name,width,height,langs] of [['mobile',375,812,['vi','en']],['tablet',820,1100,['vi']],['desktop',1280,800,['vi']]]){
  const phone=width<=760,context=await browser.newContext({locale:'vi-VN',viewport:{width,height},reducedMotion:'reduce',hasTouch:phone,isMobile:phone}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await route(page);
  await page.goto('https://kitchen.test/#expenses');await page.locator('#main .page-heading').waitFor({timeout:20000});await page.waitForTimeout(400);await page.evaluate(seed);
  for(const lang of langs){
   await page.evaluate(l=>{changeAppLanguage(l);state.receipts=[];state.pantry=state.pantry.filter(p=>!['salmon','corn'].includes(p.ingredient));const w=currentWeek();for(const id of ['salmon','corn']){delete w.bought[id];delete (w.boughtAt||{})[id]}save();closeModal();render()},lang);
   // The old app's OCR text for Henry's ALDI Wolli Creek receipt.
   await parseIn(page,'aldi-wolli-creek-old-app-ocr');
   const d=await draftSummary(page);
   assert.equal(d.n,16,'all 16 lines incl. the 2nd strawberries');assert.equal(d.total,88.37,'printed total, not the line sum');assert.equal(d.store,'ALDI Wolli Creek');
   assert.deepEqual(d.items.map(i=>i[0]).slice(0,4),['Rockmelon','Cut Wtrmelon Loose','Frz Salmon 1kg','ChpsThaiChilli 175g'],'junk prefixes and item codes removed');
   assert.equal(d.items[1][3],1.611,'weighed watermelon');assert.equal(d.items[0][3],1,'ea = 1 each');
   assert.equal(d.items[2][2],'salmon','Frz Salmon → Cá hồi');assert.equal(d.items.find(i=>/Sweet Corn/.test(i[0]))[2],'corn');assert.equal(d.items.find(i=>/HSChkn/.test(i[0]))[2],'','chicken chips are not chicken');
   assert.equal(await page.locator('#modal-root .receipt-line-hint').filter({hasText:'×2'}).count(),8,'×2 hints on the four duplicated pairs');
   assert.equal(+(await page.locator('#receipt-total').inputValue()),88.37);
   await noOverflow(page,name+' form');await targets(page,'#modal-root .modal-footer .btn',name+' form footer');
   await page.evaluate(()=>document.querySelector('#modal-root .receipt-line')?.scrollIntoView({block:'start'}));await shot(page,`${name}-receipt-form-${lang}`);
   // Save → reconciliation with this week's shopping need.
   await page.locator('#modal-root [data-feature="receipt-save"]').click();
   const rec=page.locator('#modal-root .reconcile-modal, #modal-root .modal.reconcile-modal');await rec.waitFor();
   const plan=await page.evaluate(()=>{const r=state.receipts[0];return ReceiptUI.reconcilePlan(state,r,currentWeek(),weekStart,addDays(weekStart,6))});
   const salmon=plan.rows.find(r=>r.ingredient==='salmon');assert.ok(salmon&&salmon.bought===1000,'1 kg salmon bought');assert.ok(plan.unknown.length===0||plan.unknown.every(u=>u.ingredient),'unknown-amount lines listed');
   assert.match(await rec.innerText(),lang==='en'?/Update shopping & pantry/:/Cập nhật đi chợ & kho/);
   await noOverflow(page,name+' reconcile');await targets(page,'#modal-root .modal-footer .btn, #modal-root .reconcile-row',name+' reconcile');await shot(page,`${name}-reconcile-${lang}`);
   // Offline: apply works on the device; then undo.
   await context.setOffline(true);await page.evaluate(()=>dispatchEvent(new Event('offline')));
   const before=await page.evaluate(()=>({pantry:state.pantry.length,bought:{...currentWeek().bought}}));
   await page.locator('#modal-root [data-rui="apply"]').click();await page.locator('.receipt-undo').waitFor();
   const after=await page.evaluate(()=>({pantry:state.pantry.filter(p=>p.receiptId===state.receipts[0].id).map(p=>[p.ingredient,p.qty,p.boughtOn,p.expiry,(globalThis as any).ReceiptList.receiptUseBy(p.ingredient,p.place,state.receipts[0],null)]),bought:currentWeek().bought.salmon,saved:JSON.parse(familyStorage.getItem('bep-gia-dinh-v1')).receipts[0].reconciled!=null}));
   assert.equal(after.bought,salmon.covered,'covered part marked bought');if(salmon.extra>0)assert.ok(after.pantry.some(p=>p[0]==='salmon'&&Math.abs(p[1]-salmon.extra)<1e-6),'extra salmon goes to the pantry');
   /* v1.7.19 owner decision (12 Nov 2026): the suggested use-by from the purchase date */assert.ok(after.pantry.every(p=>p[3]===p[4]&&/^\d{4}-\d{2}-\d{2}$/.test(p[2])),'pantry gets purchase date and the suggested use-by '+JSON.stringify(after.pantry));assert.ok(after.saved,'saved on this device while offline');
   if(name==='mobile'&&lang==='vi')await shot(page,`${name}-reconcile-undo-bar-vi`);
   await page.locator('.receipt-undo [data-rui="undo"]').click();
   assert.deepEqual(await page.evaluate(()=>({pantry:state.pantry.length,bought:{...currentWeek().bought}})),before,'undo restores the list and pantry');
   await context.setOffline(false);await page.evaluate(()=>dispatchEvent(new Event('online')));
   // Duplicate: the same receipt photographed twice (03 MAR 2025 a/b) → exact prompt, "Không lưu" is the default.
   await parseIn(page,'aldi-2025-03-03-a');await page.locator('#modal-root [data-feature="receipt-save"]').click();await page.locator('#modal-root .reconcile-modal').waitFor();await page.evaluate(()=>closeModal());
   await parseIn(page,'aldi-2025-03-03-b');
   assert.ok((await draftSummary(page)).warnings.includes('repaired-price'),'clipped prices repaired only with the total check');
   await page.locator('#modal-root [data-feature="receipt-save"]').click();const dup=page.locator('#modal-root .receipt-dup-modal');await dup.waitFor();
   assert.match(await dup.innerText(),lang==='en'?/seems to have been saved on .*ALDI Wolli Creek, \$135\.42, 8 items/:/Hoá đơn này có vẻ đã lưu ngày .*ALDI Wolli Creek, \$135\.42, 8 món/);
   assert.equal(await page.evaluate(()=>document.activeElement?.dataset?.rui),'dup-cancel','“Không lưu” is the default');
   await noOverflow(page,name+' duplicate');await targets(page,'#modal-root .modal-footer .btn',name+' duplicate');await shot(page,`${name}-duplicate-${lang}`);
   await page.locator('#modal-root [data-rui="dup-cancel"]').click();assert.equal(await page.evaluate(()=>state.receipts.length),2,'not saved twice');
   // Near duplicate: same store, date and total, different time → softer prompt; "save anyway" keeps both.
   await parseIn(page,'aldi-2025-03-03-a');await page.evaluate(()=>{receiptDraft.meta.time='18:02';receiptDraft.meta.txRaw=null});await page.locator('#modal-root [data-feature="receipt-save"]').click();
   await page.locator('#modal-root .receipt-dup-modal').waitFor();assert.match(await page.locator('#modal-root .receipt-dup-modal').innerText(),lang==='en'?/Possible duplicate/:/Có thể trùng/);
   await page.locator('#modal-root [data-rui="dup-save"]').click();await page.waitForFunction(()=>state.receipts.length===3);await page.evaluate(()=>closeModal());
   // Refund: negative, no pantry or shopping change, no reconciliation.
   const p0=await page.evaluate(()=>state.pantry.length);await parseIn(page,'aldi-2021-refund');
   assert.equal(+(await page.locator('#receipt-total').inputValue()),-50.23);await page.locator('#modal-root [data-feature="receipt-save"]').click();
   await page.waitForFunction(()=>state.receipts.some(r=>r.refund));assert.equal(await page.locator('#modal-root .reconcile-modal').count(),0,'refund: no reconciliation');
   assert.deepEqual(await page.evaluate(()=>{const r=state.receipts.find(r=>r.refund);return[r.total,validSpending(state),state.pantry.length]}),[-50.23,true,p0]);
   // UK receipt: GBP, spending only, never in So Giá.
   await parseIn(page,'ww-uk-12');assert.match(await page.locator('#modal-root .receipt-warnings').innerText(),lang==='en'?/outside Australia \(GBP\)/:/Hoá đơn ngoài Úc \(GBP\) — chỉ lưu chi tiêu, không chia sẻ giá/);
   await page.locator('#modal-root [data-feature="receipt-save"]').click();await page.waitForFunction(()=>state.receipts.some(r=>r.currency==='GBP'));
   assert.equal(await page.evaluate(()=>PriceScout.receiptObservations(state.receipts.filter(r=>r.currency==='GBP'),MASTER_CATALOG.items,{ingredientUnit:id=>INGREDIENTS[id]?.[1]}).length),0,'non-AUD never becomes a So Giá price');
   assert.ok(await page.evaluate(()=>state.receipts.every(r=>!/CARD NO|\bAID\b|ARQC|\bTVR\b|\bTSI\b|\bATC\b|TERMINAL|REFERENCE|AUTH CODE|Manager|0563\/001|TRANS \d/i.test(r.raw||''))),'saved receipts hold no payment or staff lines');
   await page.evaluate(()=>closeModal());
  }
  // So Giá: a photo of a receipt opens the receipt form with the same parse (one OCR run per size).
  for(const lang of (name==='mobile'?['vi','en']:['vi'])){
   await page.evaluate(l=>{changeAppLanguage(l);view='shopping';location.hash='shopping';render()},lang);await page.waitForFunction(()=>typeof scoutReadShot==='function');
   const file=await renderReceipt(page,RECEIPTS['coles-16-waterloo'].text,{angle:-1});
   await page.evaluate(async f=>{await scoutReadShot(f,'screenshot')},file);await page.locator('#modal-root .receipt-from-scout').waitFor({timeout:60000});
   const d=await draftSummary(page);assert.equal(d.store,'Coles Waterloo');assert.equal(d.total,31.2);assert.ok(d.n>=4,'So Giá receipt lines read: '+d.n);
   await noOverflow(page,name+' scout receipt');await shot(page,`${name}-so-gia-receipt-${lang}`);await page.evaluate(()=>{receiptDraft=null;closeModal()});
  }
  assert.deepEqual(errors,[],'no page errors '+name);await context.close();
 }
 await browser.close();console.log('PASS receipt OCR browser (synthetic renders, form, reconciliation, duplicates, refund, UK, So Giá)');
})().catch(e=>{console.error(e);process.exit(1)});
