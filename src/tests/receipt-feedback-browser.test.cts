// v1.7.18 receipts the app has not seen — browser test (Chromium viewport simulation, NOT physical devices).
// Owner decision 12 Nov 2026 (Sydney time), plan docs/plans/receipts-v1.7.19-20261112.md A + B.
//  B. A photo read with lines that do not add up to the printed total shows ONE hint card (reasons + what to do):
//     “Chụp lại” (main, drawn) reopens the photo picker, “Vẫn dùng bản này” keeps the reading without moving the page;
//     a balanced receipt shows no card. The reader is a stand-in (window.Tesseract stub returns SYNTHETIC text) so the
//     reasons are exact; the real reader is covered by test:receipt-ocr:browser.
//  A. After a correction, “Gửi chữ hoá đơn để sửa cách đọc” opens a preview of exactly what is sent: the text with card /
//     member / receipt / phone numbers removed, read vs corrected lines, store, retailer id, date, build, language — no image.
//     “Gửi” posts to the REAL feedback handler (in-memory store, device-only sender) → toast; the sheet then says it was
//     sent; a saved receipt offers it too; offline the send button is off. Studio → “Hoá đơn gửi về” lists the report,
//     opens the read-vs-corrected diff and the redacted text, saves a status and downloads the text fixture.
//  Sizes 320×740, 375×812, 820×1100, 1280×800 in VI light and EN dark: no horizontal overflow, ≥44 px targets, no emoji,
//  drawings only on main buttons (rule 27). Screenshots → docs/reviews/v1.7.18/receipt-feedback.
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert');
const {RECEIPTS}=require('./fixtures/receipts.cjs');
const root=process.cwd(),dir='docs/reviews/v1.7.18/receipt-feedback',origin='https://kitchen.test';fs.mkdirSync(dir,{recursive:true});
const mime:any={'.html':'text/html','.js':'application/javascript','.json':'application/json','.css':'text/css','.webp':'image/webp','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json','.gz':'application/gzip','.wasm':'application/wasm'};
const SIZES:any={narrow:{width:320,height:740},mobile:{width:375,height:812},tablet:{width:820,height:1100},desktop:{width:1280,height:800}};
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
// SYNTHETIC receipts: the Coles fixture (balanced) and the same with one line lost and payment / member / receipt numbers.
const BALANCED=RECEIPTS['coles-16-waterloo'].text;
const PRIVATE=['4321','79354396400','P2611070038','A0000000041010','0412 345 678','Sample Person'];
const SHORT=BALANCED.replace('VEGEMITE 380GRAM 7.00\n','').replace('Description $','No: P2611070038\nDescription $')+'\nCARD NO XXXX XXXX XXXX 4321\nAID A0000000041010\nGoldstar 79354396400\nCustomer mobile 0412 345 678';
const EMOJI=/\p{Extended_Pictographic}/u;
const noOverflow=async(page:any,label:string)=>{const o=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);if(o>1)console.log(await page.evaluate(()=>[...document.querySelectorAll('body *')].filter((e:any)=>e.getBoundingClientRect().right>innerWidth+1).slice(0,6).map((e:any)=>e.tagName+'.'+e.className+' '+Math.round(e.getBoundingClientRect().right))));assert.ok(o<=1,label+': horizontal overflow '+o+'px')};
const targets=async(page:any,sel:string,label:string)=>{const small=await page.evaluate((s:string)=>[...document.querySelectorAll(s)].filter((e:any)=>e.offsetParent&&e.getBoundingClientRect().height<43.5).map((e:any)=>(e.textContent||e.id).trim().slice(0,30)+' '+Math.round(e.getBoundingClientRect().height)),sel);assert.deepEqual(small,[],'≥44px targets: '+label)};
const noEmoji=async(page:any,sel:string,label:string)=>{const t=await page.evaluate((s:string)=>[...document.querySelectorAll(s)].map(e=>(e as any).innerText).join('\n'),sel);assert.ok(!EMOJI.test(t),label+': no emoji '+(t.match(EMOJI)||[''])[0])};
let shots=0;const shot=async(page:any,name:string)=>{await page.evaluate(()=>{const t=document.querySelector('#toast');if(t)t.className=''});await sleep(120);const f=`${dir}/${name}.jpg`;await page.screenshot({path:f,type:'jpeg',quality:66});const kb=fs.statSync(f).size/1024;assert.ok(kb<250,`${name}.jpg ${kb.toFixed(0)} KB`);shots++};
// stand-in reader: whatever window.__ocr holds (text + confidence); the crop look-up finds no lines (frame stays as set)
const fakeReader=()=>{(window as any).__ocr={text:'',confidence:90};(window as any).Tesseract={createWorker:async()=>({setParameters:async()=>{},recognize:async()=>({data:{text:(window as any).__ocr.text,confidence:(window as any).__ocr.confidence,lines:[]}}),terminate:async()=>{}})}};
const seed=()=>{state.preferences.onboardingComplete=true;state.receipts=[];save();closeModal();view='expenses';location.hash='expenses';render()};

(async()=>{
 const {studioWorld,openStudio,ready}=await import('./helpers/studio-nav-harness.mjs');
 const world=await studioWorld({devices:false,feedback:false});
 const browser=await chromium.launch(process.env.BEP_CHROMIUM?{executablePath:process.env.BEP_CHROMIUM}:{});
 const posts:any[]=[];
 async function open({size='mobile',lang='vi',theme='light'}:any={}){
  const context=await browser.newContext({locale:'vi-VN',viewport:SIZES[size],reducedMotion:'reduce',colorScheme:theme,serviceWorkers:'block',hasTouch:size!=='desktop',isMobile:size==='narrow'||size==='mobile',acceptDownloads:true});
  await context.addInitScript(({lang,theme}:any)=>{if(sessionStorage.getItem('qa-init'))return;sessionStorage.setItem('qa-init','1');localStorage.setItem('bep-theme-mode',theme);localStorage.setItem('guest/bep-language',lang);localStorage.setItem('bep-local-locked','yes')},{lang,theme});
  await context.addInitScript(fakeReader);
  const page=await context.newPage(),errors:string[]=[];page.on('pageerror',(e:any)=>errors.push(e.message));
  await page.route(origin+'/**',async(route:any)=>{const req=route.request(),url=new URL(req.url()),p=url.pathname,op=url.searchParams.get('op')||'';
   if(p==='/.netlify/functions/feedback'){if(op==='receipt-report')posts.push(JSON.parse(req.postData()||'{}'));const hdr=await req.allHeaders();const r=await world.handlers.feedback(new Request(url.href,{method:req.method(),headers:hdr,body:['GET','HEAD'].includes(req.method())?undefined:req.postDataBuffer()}));await route.fulfill({status:r.status,headers:Object.fromEntries(r.headers),body:Buffer.from(await r.arrayBuffer())});return}
   if(p.startsWith('/.netlify/')){await route.fulfill({json:op==='status'?{configured:false,connected:false}:op==='state'?{state:null,etag:null}:op==='families'?{families:[]}:{announcements:[],devices:[]}});return}
   if(p==='/startup-scripts.json'){await route.fulfill({json:JSON.parse(fs.readFileSync('dist/startup-scripts.json','utf8'))});return}
   const file=path.join(root,'dist',p==='/'?'index.html':decodeURIComponent(p.slice(1)));if(!file.startsWith(path.join(root,'dist'))||!fs.existsSync(file)||fs.statSync(file).isDirectory())return route.fulfill({status:404,body:'missing'});return route.fulfill({body:fs.readFileSync(file),contentType:mime[path.extname(file)]||'application/octet-stream'})});
  await page.goto(origin+'/#expenses');await page.locator('#main .page-heading, #main h1').first().waitFor({timeout:20000});await sleep(400);
  for(let i=0;i<4;i++){try{await page.evaluate(seed);break}catch(e){if(i===3)throw e;await sleep(600)}}
  await page.evaluate((l:string)=>(globalThis as any).changeAppLanguage?.(l),lang);await sleep(150);
  return{context,page,errors};
 }
 // a photo is chosen with “Chụp hoá đơn”, then “Đọc cả ảnh” in the crop sheet; the stand-in reader returns `text`
 async function readPhoto(page:any,text:string,confidence=88){const t0=await page.evaluate(({text,confidence}:any)=>{(window as any).__ocr={text,confidence};if(!document.querySelector('#modal-root .receipt-modal'))newReceipt();return Date.now()},{text,confidence});
  await page.setInputFiles('#receipt-camera-file','dist/icon-192.png');await page.locator('#modal-root [data-rcrop="whole"]').waitFor();await sleep(200);await page.locator('#modal-root [data-rcrop="whole"]').click();
  await page.waitForFunction((t0:number)=>{const s=(globalThis as any).ReceiptQuality.session();return !!document.querySelector('#modal-root .receipt-modal')&&!!s&&s.at>=t0&&!ocrBusy},t0,{timeout:20000});await sleep(250)}
 const hintCodes=(page:any)=>page.$$eval('#modal-root .rq-hint [data-rq-reason]',(xs:any[])=>xs.map(x=>x.dataset.rqReason));

 // ---------- 1. mobile VI light: hint, retake, keep (rule 24), correct → preview → send → toast; saved receipt; offline
 {const {context,page,errors}=await open({size:'mobile'});
  await readPhoto(page,BALANCED,91);
  assert.equal(await page.locator('#modal-root .rq-hint').count(),0,'balanced receipt: no hint card');
  assert.equal(await page.locator('#modal-root [data-rshare-row]').isHidden(),true,'nothing corrected yet: no send button');
  await page.evaluate(()=>closeModal());
  await readPhoto(page,SHORT,62);
  const codes=await hintCodes(page);assert.deepEqual(codes,['blurry','short','count'],'reasons for a blurry short read '+codes);
  const card=page.locator('#modal-root .rq-hint');assert.match(await card.innerText(),/thiếu \$7\.00/);assert.match(await card.innerText(),/Chụp lại: để hoá đơn thẳng, đủ sáng, thấy cả cột giá và dòng TOTAL\./);
  assert.equal(await page.locator('#modal-root .rq-hint').count(),1,'ONE card');
  assert.equal(await page.locator('#modal-root [data-rq="retake"] svg.btn-art').count(),1,'“Chụp lại” is the main action and has its drawing');
  assert.equal(await page.locator('#modal-root [data-rq="keep"] svg').count(),0,'“Vẫn dùng bản này” is words only');
  assert.ok(await page.locator('#modal-root [data-feature="receipt-save"]').isEnabled(),'never blocks saving');
  await page.locator('#modal-root .rq-hint').scrollIntoViewIfNeeded();await shot(page,'hint-vi-light-mobile-375x812');
  // “Chụp lại” opens the photo picker again
  const [chooser]=await Promise.all([page.waitForEvent('filechooser',{timeout:5000}),page.locator('#modal-root [data-rq="retake"]').click()]);
  assert.ok(chooser,'file / camera picker opened');assert.equal(await page.locator('#modal-root .rq-hint').count(),0,'card gone after retake');
  // read again; “Vẫn dùng bản này” keeps the reading, the page does not move (rule 24)
  await readPhoto(page,SHORT,62);
  const before=await page.evaluate(()=>{const b=document.querySelector('#modal-root .modal-content') as any,c=document.querySelector('#modal-root .rq-hint') as any;c.scrollIntoView({block:'center'});return{top:c.getBoundingClientRect().top,scroll:b.scrollTop,y:scrollY}});
  await page.locator('#modal-root [data-rq="keep"]').click();await sleep(150);
  const after=await page.evaluate(()=>{const b=document.querySelector('#modal-root .modal-content') as any,c=document.querySelector('#modal-root .rq-kept') as any;return{top:c.getBoundingClientRect().top,scroll:b.scrollTop,y:scrollY}});
  assert.ok(Math.abs(after.top-before.top)<=1&&after.scroll===before.scroll&&after.y===before.y,'tapping “Vẫn dùng bản này” keeps the page still '+JSON.stringify({before,after}));
  // correct: type the missing VEGEMITE line's price into a new line → the send button appears at the end of the sheet
  assert.equal(await page.locator('#modal-root [data-rshare-row]').isHidden(),true);
  /* v1.7.19: the receipt-currency field makes the sheet taller, so the first line starts below the fold; bring it into view as the
     person does before typing, so Playwright's own scroll-to-type is not counted as a jump. The check below is unchanged. */
  await page.locator('#modal-root .receipt-label').first().scrollIntoViewIfNeeded();
  const y0=await page.evaluate(()=>(document.querySelector('#modal-root .receipt-label') as any).getBoundingClientRect().top);
  await page.locator('#modal-root .receipt-label').first().fill('WESTERN STAR SPREADABLE 375G');await sleep(300);
  assert.equal(await page.evaluate(()=>(document.querySelector('#modal-root .receipt-label') as any).getBoundingClientRect().top),y0,'showing the send button does not move what is being edited');
  const row=page.locator('#modal-root [data-rshare-row]');assert.equal(await row.isVisible(),true,'a correction shows “Gửi chữ hoá đơn để sửa cách đọc”');
  const openBtn=page.locator('#modal-root [data-rshare="open"]');assert.equal((await openBtn.innerText()).trim(),'Gửi chữ hoá đơn để sửa cách đọc');assert.equal(await openBtn.locator('svg').count(),0,'secondary: words only');
  await openBtn.scrollIntoViewIfNeeded();await shot(page,'send-button-vi-light-mobile-375x812');
  await openBtn.click();await page.locator('#modal-root .rshare-modal').waitFor();
  const pv=await page.locator('#modal-root .rshare-modal').innerText(),pre=await page.locator('#modal-root .rshare-text').innerText();
  for(const s of PRIVATE)assert.ok(!pv.includes(s),'preview never shows '+s);
  assert.ok(pre.includes('WESTERN STAR SPREADA 375GRAM 5.50')&&pre.includes('Total for 5 items: $31.20'),'items and total kept in the text');
  assert.match(pv,/Đã bỏ \d+ dòng có số thẻ/);assert.match(pv,/Ảnh hoá đơn không bao giờ được gửi/);
  assert.equal(await page.locator('#modal-root .rshare-modal img').count(),0,'no image in the preview');
  assert.match(await page.locator('#modal-root .rshare-sides').innerText(),/WESTERN STAR SPREADABLE 375G/,'corrected line shown');
  assert.equal(await page.locator('#modal-root .rshare-sides tr.rs-changed').count()>=2,true,'changed lines marked on both sides');
  assert.match(await page.locator('#modal-root .rshare-meta').innerText(),/coles[\s\S]*VI/,'retailer id and language listed');
  assert.equal(await page.locator('#modal-root [data-rshare="send"] svg.btn-art').count(),1,'Gửi: main action with its drawing');assert.equal(await page.locator('#modal-root [data-rshare="back"] svg').count(),0);
  await noEmoji(page,'#modal-root .rshare-modal','preview');await shot(page,'preview-vi-light-mobile-375x812');
  // the JSON shown is exactly what is posted
  const shown=JSON.parse(await page.locator('#modal-root .rshare-json pre').textContent());
  await page.locator('#modal-root [data-rshare="send"]').click();await page.waitForFunction(()=>/Đã gửi — cảm ơn, lần sau app đọc hoá đơn này tốt hơn/.test(document.querySelector('#toast')?.textContent||''));
  assert.equal(posts.length,1);assert.deepEqual(posts[0],shown,'the preview showed exactly what was sent');assert.ok(!/image|photo|data:/i.test(Object.keys(posts[0]).join(' '))&&!/data:image/.test(JSON.stringify(posts[0])),'never the photo');
  for(const s of PRIVATE)assert.ok(!JSON.stringify(posts[0]).includes(s),'never sent: '+s);
  await page.locator('#modal-root .rshare-sent').waitFor();assert.match(await page.locator('#modal-root .rshare-sent').innerText(),/Đã gửi chữ hoá đơn này \(mã [a-f0-9]{6}\)/);
  await page.evaluate(()=>{const t=document.querySelector('#toast') as any;t.className='visible'});await shot(page,'sent-toast-vi-light-mobile-375x812');
  // saved: the sent note stays on the saved receipt
  const id=await page.evaluate(async()=>{const id=receiptDraft.id;(document.querySelector('#receipt-total') as any).value='31.2';await saveReceipt(true);closeModal();return id});
  await page.evaluate((id:string)=>openReceipt(id),id);await page.locator('#modal-root .receipt-modal').waitFor();await page.locator('#modal-root .rshare-sent').waitFor();
  // a saved receipt (another one) can still be sent: its saved text is read again as the reader's version
  await page.evaluate(()=>{state.receipts.push({id:'qa-saved',store:'Coles Waterloo',date:'2023-05-24',currency:'AUD',total:31.2,createdAt:new Date().toISOString(),retailer:'coles',raw:'WESTERN STAR SPREADA 375GRAM 5.50\nA2 DAIRY FULL CREAM 1LITRE 3.80\nWNDER WHTE H FIBRE 700GRAM 4.40\nBEGA NATURAL D 500GRAM 10.50',items:[{id:'s1',label:'Western Star spreadable 375g',total:5.5,kind:'pending'},{id:'s2',label:'A2 full cream milk 1L',total:3.8,kind:'pending'},{id:'s3',label:'Wonder White hi-fibre 700g',total:4.4,kind:'pending'},{id:'s4',label:'Vegemite 380g',total:7,kind:'pending'},{id:'s5',label:'Bega natural 500g',total:10.5,kind:'pending'}]});save();closeModal()});
  await page.evaluate(()=>openReceipt('qa-saved'));await page.locator('#modal-root .receipt-modal').waitFor();await sleep(200);
  assert.equal(await page.locator('#modal-root [data-rshare="open"]').isVisible(),true,'a saved, corrected receipt offers the send button');
  await page.locator('#modal-root [data-rshare="open"]').click();await page.locator('#modal-root .rshare-modal').waitFor();
  assert.match(await page.locator('#modal-root .rshare-sides').innerText(),/Vegemite 380g/);
  // offline: nothing can be sent, the sheet says so
  await context.setOffline(true);await page.locator('#modal-root [data-rshare="back"]').click();await page.locator('#modal-root [data-rshare="open"]').click();
  assert.equal(await page.locator('#modal-root [data-rshare="send"]').isDisabled(),true,'offline: send is off');assert.match(await page.locator('#modal-root .rshare-offline').innerText(),/ngoại tuyến/);
  await shot(page,'preview-offline-vi-light-mobile-375x812');await context.setOffline(false);
  await page.locator('#modal-root [data-rshare="back"]').click();await page.locator('#modal-root .receipt-modal').waitFor();
  assert.deepEqual(errors,[],'no page errors (mobile)');await context.close();
  console.log('PASS mobile VI: hint, retake, keep (page still), correction → preview (redacted, no image) → send → toast; saved receipt; offline');}

 // ---------- 2. every size, VI light and EN dark: hint card and preview fit, targets, no emoji
 for(const [size,lang,theme] of [['narrow','vi','light'],['mobile','en','dark'],['tablet','vi','light'],['tablet','en','dark'],['desktop','vi','light'],['desktop','en','dark'],['narrow','en','dark'],['mobile','vi','dark']] as any){
  const {context,page,errors}=await open({size,lang,theme});const tag=`${lang}-${theme}-${size}-${SIZES[size].width}x${SIZES[size].height}`;
  await readPhoto(page,SHORT,91);
  assert.deepEqual(await hintCodes(page),['short','count'],tag+' reasons');
  if(lang==='en'){assert.match(await page.locator('#modal-root .rq-hint').innerText(),/This photo may not have read correctly[\s\S]*\$7\.00 short[\s\S]*Retake it: lay the receipt flat/);assert.equal((await page.locator('#modal-root [data-rq="keep"]').innerText()).trim(),'Use this reading')}
  await noOverflow(page,'hint '+tag);await targets(page,'#modal-root .rq-hint button','hint '+tag);await noEmoji(page,'#modal-root .rq-hint','hint '+tag);
  await page.locator('#modal-root .rq-hint').scrollIntoViewIfNeeded();if(!['tablet-vi-light'].includes(size+'-'+lang+'-'+theme)||true)await shot(page,'hint-'+tag);
  await page.locator('#modal-root .receipt-price').first().fill('5.6');await sleep(300);
  if(lang==='en')assert.equal((await page.locator('#modal-root [data-rshare="open"]').innerText()).trim(),'Send the text so the app reads it better');
  await targets(page,'#modal-root [data-rshare-row] button','send row '+tag);
  await page.locator('#modal-root [data-rshare="open"]').click();await page.locator('#modal-root .rshare-modal').waitFor();await sleep(150);
  await noOverflow(page,'preview '+tag);await targets(page,'#modal-root .rshare-modal .modal-footer button','preview footer '+tag);await noEmoji(page,'#modal-root .rshare-modal','preview '+tag);
  for(const s of PRIVATE)assert.ok(!(await page.locator('#modal-root .rshare-modal').innerText()).includes(s),tag+' preview never shows '+s);
  if(lang==='en')assert.match(await page.locator('#modal-root .rshare-modal').innerText(),/What will be sent[\s\S]*The receipt photo is never sent/);
  // sheet footer: two buttons side by side, same size (rule 25)
  const fb=await page.$$eval('#modal-root .rshare-modal .modal-footer > button',(bs:any[])=>bs.map(b=>{const r=b.getBoundingClientRect();return[Math.round(r.top),Math.round(r.height),Math.round(r.width)]}));
  assert.ok(fb.length===2&&Math.abs(fb[0][0]-fb[1][0])<=2&&Math.abs(fb[0][2]-fb[1][2])<=2,tag+' footer buttons side by side, same size '+JSON.stringify(fb));
  await shot(page,'preview-'+tag);
  assert.deepEqual(errors,[],'no page errors '+tag);await context.close();
 }
 console.log('PASS 320 / 375 / 820 / 1280 in VI light and EN dark: no overflow, ≥44 px, no emoji, footer side by side');

 // ---------- 3. Studio → Hoá đơn gửi về: list, diff, text, status, download (owner)
 for(const [size,lang,theme] of [['desktop','vi','light'],['tablet','en','dark'],['mobile','vi','light'],['narrow','en','dark']] as any){
  const {context,page,errors}=await openStudio(browser,world,{viewport:SIZES[size],lang,theme,hash:'#receipts',hasTouch:size!=='desktop'});const tag=`${lang}-${theme}-${size}-${SIZES[size].width}x${SIZES[size].height}`;
  await ready(page);await page.locator('#receipts-main .rr-open').first().waitFor();
  const rows=await page.locator('#receipts-main .rr-open').count();assert.equal(rows,1,'the one report sent is listed');
  assert.match(await page.locator('#receipts-main .rr-open').last().innerText(),lang==='en'?/Coles Waterloo[\s\S]*Sydney time[\s\S]*coles · date 2023-05-24 · read 4 → corrected 4/:/Coles Waterloo[\s\S]*giờ Sydney[\s\S]*coles · ngày 2023-05-24 · đọc 4 dòng → sửa còn 4/);
  await page.locator('#receipts-main .rr-open').last().click();await page.locator('#rr-detail').waitFor();
  const det=await page.locator('#rr-detail').innerText();for(const s of PRIVATE)assert.ok(!det.includes(s),'Studio never shows '+s);
  assert.ok(await page.locator('#rr-detail .rr-diff tr.rr-changed').count()>=1,'diff marks the corrected line');assert.match(await page.locator('#rr-detail .rr-diff').innerText(),/WESTERN STAR SPREADABLE 375G/);
  assert.match(await page.locator('#rr-detail .rr-text').innerText(),/Total for 5 items: \$31\.20/);
  await noOverflow(page,'Studio receipts '+tag);await noEmoji(page,'#receipts-main','Studio receipts '+tag);await targets(page,'#receipts-main .rr-actions .btn,#receipts-main .rr-open','Studio '+tag);
  await page.locator('#rr-detail').scrollIntoViewIfNeeded();await shot(page,'studio-'+tag);
  if(size==='desktop'){
   const [dl]=await Promise.all([page.waitForEvent('download'),page.locator('#rr-fixture').click()]);const fx=fs.readFileSync(await dl.path(),'utf8');
   assert.match(dl.suggestedFilename(),/^receipt-coles-[a-f0-9]{6}\.txt$/);assert.match(fx,/'coles-coles-waterloo-[a-f0-9]{6}':\{text:`[\s\S]*Total for 5 items: \$31\.20[\s\S]*`,expect:\{"retailer":"coles","printedTotal":31\.2,"date":"2023-05-24","goods":4,"names":\["WESTERN STAR SPREADABLE 375G"/);
   /* v1.7.20: a private value counts on its own, not inside the fixture's random hex id or a timestamp (CI once drew an id holding “4321”); a masked card “XXXX4321” / “**** 4321” is still caught */
   for(const s of PRIVATE)assert.ok(!new RegExp('(?<![0-9a-f])'+s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?![0-9a-f])').test(fx),'fixture never holds '+s);
   await page.locator('#rr-status select').selectOption('test-added');await page.locator('#rr-status button').click();await page.waitForFunction(()=>/Đã thêm test/.test(document.querySelector('#receipts-main .rr-list')?.textContent||'')&&/Đã thêm test/.test(document.querySelector('#rr-detail .rr-detail-top .chip')?.textContent||''));
   assert.match(await page.locator('#receipts-main .rr-list').innerText(),/Đã thêm test/);}
  assert.deepEqual(errors,[],'no Studio page errors '+tag);await context.close();
 }
 console.log('PASS Studio “Hoá đơn gửi về”: list (Sydney time), diff, redacted text, status, fixture download; 4 sizes');
 await browser.close();console.log(`receipt-feedback browser: all checks passed, ${shots} screenshots in ${dir}`);
})().catch(e=>{console.error(e);process.exit(1)});
