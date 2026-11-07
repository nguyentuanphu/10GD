// v1.7.2 generic / local-grocer receipts — browser test (Chromium viewport simulation, NOT physical devices).
// SYNTHETIC receipts only ("TAN VIET GROCERY CABRAMATTA": GROCERY 4.50, VEG 3.20, MEAT 11.04 + 0.850kg @ 12.99/kg,
// VEG 8.40, 3.50, PLU 4011 2.10); a rendered photo goes through the real on-device OCR + shared parser once.
//  1. "Ghép giá với giỏ đi chợ": nothing auto-matched; suggestion with reason; tap price → tap item; one price →
//     several items (+ split by the family); undo; hold-to-talk voice "dòng 5 là đậu hũ" (mocked recogniser) and a
//     typed EN command; save → unmatched lines are "Đồ khác (chưa rõ)", not in the reconciliation; spending card;
//     per-store learning used next time + "Quên"; works OFFLINE.
//  2. Account mode (mocked APIs): "Báo giá cho cộng đồng" for a saved unmatched line (catalogue search, consent,
//     never sent without the tap; payload facts only), So Giá "Chưa xác minh · 1 người báo" vs verified, the
//     "Tôi cũng thấy giá này" one-tap confirm, and Studio moderation listing the unverified single report.
// Sizes 320×740, 375×812, 820×1100, 1280×800; VI/EN, light/dark. Screenshots → docs/reviews/v1.7.2/generic-receipts.
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert');
const {GENERIC_RECEIPTS}=require('./fixtures/generic-receipts.cjs');
const root=process.cwd(),dir='docs/reviews/v1.7.2/generic-receipts',origin='https://kitchen.test';fs.mkdirSync(dir,{recursive:true});
const mime={'.html':'text/html','.js':'application/javascript','.json':'application/json','.css':'text/css','.webp':'image/webp','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json','.gz':'application/gzip','.wasm':'application/wasm'};
const SIZES={narrow:{width:320,height:740},mobile:{width:375,height:812},tablet:{width:820,height:1100},desktop:{width:1280,height:800}};
const TEXT=GENERIC_RECEIPTS['tan-viet-cabramatta'].text;
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Australia/Sydney',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const STATUS={enabled:true,signedIn:true,publicRead:true,states:['NSW','QLD'],eligibility:{ok:true,reasons:[]},viewer:false,termsAcceptedAt:new Date(Date.now()-864e5).toISOString(),termsVersion:'2026-11-01',acceptedTermsVersion:'2026-11-01',shareDefault:true,shop:null,rewards:{confirmed:10,corroborate:3}};
const now=new Date(Date.now()-3*3600e3).toISOString();
const COMMUNITY={state:'NSW',today,items:[
 {groupId:'aaaa000011112222',itemId:'rau-muong',label:'Water spinach',retailer:'viet-grocer',branchId:'viet-grocer:2166:cabramatta',branchLabel:'Cabramatta 2166',state:'NSW',status:'unverified',price:3.2,unitPrice:null,unitBasis:null,packQty:null,packUnit:null,units:null,promo:null,validUntil:null,families:1,reports:1,lastObserved:today,ageDays:0,usable:false,faded:false,online:false,sources:['receipt'],generic:true,capturedAt:now,sourceCaptured:{receipt:now}},
 {groupId:'bbbb000011112222',itemId:'gao-jasmine',label:'Jasmine rice 5kg',retailer:'coles',branchId:'coles:2166:cabramatta',branchLabel:'Cabramatta 2166',state:'NSW',status:'confirmed',price:13.5,unitPrice:null,unitBasis:null,packQty:5,packUnit:'kg',units:null,promo:null,validUntil:null,families:3,reports:3,lastObserved:today,ageDays:0,usable:true,faded:false,online:false,sources:['shelf-photo'],capturedAt:now,sourceCaptured:{'shelf-photo':now}}],shopPrices:[],wanted:{counts:{}}};
const noOverflow=async(page,label)=>{const o=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.ok(o<=1,label+': horizontal overflow '+o+'px')};
const targets=async(page,sel,label)=>{const small=await page.evaluate(s=>[...document.querySelectorAll(s)].filter(e=>e.offsetParent&&e.getBoundingClientRect().height<43.5).map(e=>(e.textContent||e.id).trim().slice(0,30)+' '+Math.round(e.getBoundingClientRect().height)),sel);assert.deepEqual(small,[],'≥44px targets: '+label)};
const shots=[];const shot=async(page,name,sel)=>{await page.evaluate(()=>{const t=document.querySelector('#toast');if(t)t.className=''});if(sel)await page.evaluate(s=>{const el=document.querySelector(s);if(el)el.scrollIntoView({block:'start'})},sel);await page.waitForTimeout(120);const f=`${dir}/${name}.jpg`;await page.screenshot({path:f,type:'jpeg',quality:66});const kb=fs.statSync(f).size/1024;assert.ok(kb<250,`${name}.jpg ${kb.toFixed(0)} KB`);shots.push(name)};
// Synthetic family dinner this week + shopping ticks (rau muống 09:05, thịt 09:10, đậu hũ 09:20) + one earlier receipt
// from the same store (family price history). QA data only.
const seed=()=>{const S=globalThis as any,st=state;const r={id:'qa-generic',name:'QA Thịt kho, rau muống xào',category:'main',protein:'pork',time:30,servings:4,yield:4,ingredients:[{id:'pork',qty:500},{id:'waterSpinach',qty:300},{id:'scallion',qty:50},{id:'bokchoy',qty:250},{id:'tofu',qty:300},{id:'rice',qty:500}],prep:'QA',steps:['QA'],custom:true,favorite:false,purposes:['main']};
 st.recipes=st.recipes.filter(x=>x.id!==r.id);st.recipes.push(r);st.preferences.onboardingComplete=true;
 const w=currentWeek(),date=addDays(weekStart,2);w.days[date].dinner.recipes=[clone(r)];w.days[date].dinner.cooked=false;st.pantry=st.pantry.filter(p=>!r.ingredients.some(i=>i.id===p.ingredient));
 const day=new Date().toISOString().slice(0,10);w.bought={};w.boughtAt={waterSpinach:day+'T09:05:00.000Z',pork:day+'T09:10:00.000Z',tofu:day+'T09:20:00.000Z'};for(const id of ['waterSpinach','pork','tofu'])w.bought[id]=r.ingredients.find(i=>i.id===id).qty;
 st.receipts=[{id:'qa-hist',store:'TAN VIET GROCERY CABRAMATTA',date:addDays(day,-14),currency:'AUD',total:9.7,createdAt:new Date(Date.now()-14*864e5).toISOString(),items:[{id:'h1',label:'Rau muong',total:3.0,ingredient:'waterSpinach',kind:'matched',quantity:null},{id:'h2',label:'Rau muong',total:3.5,ingredient:'waterSpinach',kind:'matched',quantity:null},{id:'h3',label:'Hanh la',total:1.5,ingredient:'scallion',kind:'matched',quantity:null},{id:'h4',label:'Cai thia',total:1.7,ingredient:'bokchoy',kind:'matched',quantity:null}]}];
 st.receiptLearning={entries:[]};save();closeModal();view='expenses';location.hash='expenses';render()};
const draft=page=>page.evaluate(()=>receiptDraft.items.map(i=>({label:i.label,total:i.total,match:i.match,qty:i.qty,unit:i.unit,generic:!!i.extra?.generic,covers:(i.extra?.covers||[]).map(c=>c.key),unknown:!!i.extra?.unknown})));
const parse=async page=>{await page.evaluate(t=>{newReceipt();(document.querySelector('#receipt-raw') as any).value=t},TEXT);await page.locator('#modal-root [data-feature="receipt-parse"]').click();await page.locator('#rm-panel').waitFor()};
// Fake recogniser: hold → start, release → the phrase in window.__say arrives as a final result.
const fakeVoice=()=>{class FakeRec{constructor(){this.lang='vi-VN';this.continuous=true;this.interimResults=true;this.maxAlternatives=1;this.ended=false}start(){(window as any).__recStarted=((window as any).__recStarted||0)+1}stop(){if(this.ended)return;const r=this;setTimeout(()=>{const alt=[{transcript:(window as any).__say||'',confidence:.9}];(alt as any).isFinal=true;r.onresult&&r.onresult({resultIndex:0,results:[alt]});r.ended=true;r.onend&&r.onend()},20)}abort(){this.ended=true;this.onend&&this.onend()}}(window as any).SpeechRecognition=FakeRec;(window as any).webkitSpeechRecognition=FakeRec};

(async()=>{const browser=await chromium.launch(process.env.BEP_CHROMIUM?{executablePath:process.env.BEP_CHROMIUM}:{});
 async function open({size='mobile',lang='vi',theme='light',account=false,community=COMMUNITY,status=STATUS,hash='#expenses'}:any={}){
  const context=await browser.newContext({locale:'vi-VN',viewport:SIZES[size],reducedMotion:'reduce',colorScheme:theme,serviceWorkers:'block',hasTouch:size!=='desktop',isMobile:size==='narrow'||size==='mobile'});
  const scope=account?'account/qa-household/':'guest/';
  await context.addInitScript(({scope,lang,theme,account})=>{if(sessionStorage.getItem('qa-init'))return;sessionStorage.setItem('qa-init','1');localStorage.setItem('bep-theme-mode',theme);localStorage.setItem(scope+'bep-language',lang);if(account){localStorage.setItem('bep-account-present','yes');localStorage.setItem(scope+'bep-price-scout-v1',JSON.stringify({version:1,open:true,fold176:true,postcode:'2166',state:'NSW',prefs:{communityOpen:true,wantOpen:true},local:[],pending:[],pool:null,communityBranch:{suburb:'Cabramatta',postcode:'2166'}}))}else localStorage.setItem('bep-local-locked','yes')},{scope,lang,theme,account});
  await context.addInitScript(fakeVoice);
  const page=await context.newPage(),errors=[],calls=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route(origin+'/**',async route=>{const req=route.request(),url=new URL(req.url()),p=url.pathname,op=url.searchParams.get('op')||'';
   if(p.endsWith('/community')){calls.push({op,method:req.method(),body:req.postData()});if(!account){await route.fulfill(op==='status'?{json:{enabled:true,signedIn:false,publicRead:true,states:['NSW','QLD']}}:op.startsWith('prices')?{json:community}:{status:401,json:{}});return}
    await route.fulfill(op==='status'?{json:status}:op.startsWith('prices')?{json:community}:op==='rewards'?{json:{total:0,today:0,dailyCap:100,level:{id:'shopper',vi:'Người đi chợ',en:'Shopper',icon:'🧺'},badges:[],recent:[],profile:{anonId:'#1000'}}}:op.startsWith('products')?{json:{products:[]}}:op==='contribute'?{status:201,json:{id:'cp-x',status:'accepted',group:{status:'unverified',families:1}}}:op==='confirm'?{status:201,json:{id:'cp-y',status:'accepted',group:{status:'confirmed',families:2}}}:{status:201,json:{}});return}
   if(p.startsWith('/.netlify/')){if(!account){await route.fulfill({status:401,json:{error:'no'}});return}
    if(p.endsWith('/grocery')){await route.fulfill(op==='prices'?{json:{householdId:'qa-household',state:'NSW',cycleId:'x',today,observations:[],official:null}}:{status:201,json:{}});return}
    if(p.includes('/accounts')&&op==='families'){await route.fulfill({json:{families:[{id:'qa-household',name:'QA',role:'owner'}],account:{username:'qa',name:'Mẹ'}}});return}
    const st={configured:true,connected:true,mode:'account',account:{username:'qa',name:'Mẹ'},household:{id:'qa-household',name:'QA kitchen',role:'owner',memberId:null}};
    await route.fulfill({json:op==='status'?st:op==='state'?{state:null,etag:null}:{announcements:[],devices:[],alerts:[]}});return}
   if(p==='/startup-scripts.json'){await route.fulfill({json:JSON.parse(fs.readFileSync('dist/startup-scripts.json','utf8'))});return}
   const file=path.join(root,'dist',p==='/'?'index.html':decodeURIComponent(p.slice(1)));if(!file.startsWith(path.join(root,'dist'))||!fs.existsSync(file)||fs.statSync(file).isDirectory())return route.fulfill({status:404,body:'missing'});return route.fulfill({body:fs.readFileSync(file),contentType:mime[path.extname(file)]||'application/octet-stream'})});
  await page.goto(origin+'/'+hash);await page.locator('#main .page-heading, #main h1').first().waitFor({timeout:20000});await page.waitForTimeout(500);
  for(let i=0;i<4;i++){try{await page.evaluate(seed);break}catch(e){if(i===3)throw e;await page.waitForTimeout(600)}}
  await page.evaluate(l=>changeAppLanguage?.(l),lang);await page.waitForTimeout(150);
  return{context,page,errors,calls};
 }
 const panelRow=(page,i)=>page.locator(`#rm-panel .rm-price[data-i="${i}"]`);
 try{
  // ---------- 0. real OCR once: a rendered synthetic local-grocer photo → generic lines (desktop)
  {const {context,page,errors}=await open({size:'desktop'});
   const file=await page.evaluateHandle(async t=>{const lines=t.split('\n'),lh=30,c=document.createElement('canvas');c.width=640;c.height=lines.length*lh+140;const g=c.getContext('2d');g.fillStyle='#6d6a64';g.fillRect(0,0,c.width,c.height);g.save();g.translate(c.width/2,c.height/2);g.rotate(0.8*Math.PI/180);g.translate(-c.width/2,-c.height/2);g.fillStyle='#f7f5ef';g.fillRect(50,30,540,c.height-60);g.fillStyle='#1d1d1d';g.font='21px "DejaVu Sans Mono", monospace';
    lines.forEach((l,i)=>{const m=l.match(/^(.*?)\s+(\d+\.\d{2})$/);if(m){g.fillText(m[1],70,80+i*lh);const w=g.measureText(m[2]).width;g.fillText(m[2],570-w,80+i*lh)}else g.fillText(l,70,80+i*lh)});g.restore();const blob=await new Promise(r=>c.toBlob(r,'image/png'));return new File([blob as any],'synthetic-local-grocer.png',{type:'image/png',lastModified:Date.now()})},TEXT);
   await page.evaluate(async f=>{newReceipt();await readReceiptPhoto(f)},file);
   const d=await draft(page);const prices=d.filter(x=>x.generic).map(x=>x.total);console.log('OCR synthetic local grocer:',JSON.stringify(d.map(x=>[x.label,x.total,x.generic])));
   for(const p of [4.5,3.2,11.04,8.4,3.5,2.1])assert.ok(prices.includes(p),'OCR read generic line '+p);
   assert.ok(d.every(x=>!x.match),'nothing auto-matched after OCR');assert.equal(await page.evaluate(()=>receiptDraft.store),'TAN VIET GROCERY CABRAMATTA');
   assert.deepEqual(errors,[],'no page errors (OCR)');await context.close()}

  // ---------- 1. full match flow (mobile VI, light) + offline part
  {const {context,page,errors,calls}=await open({size:'mobile'});
   await parse(page);let d=await draft(page);
   assert.equal(d.length,6);assert.ok(d.every(x=>x.generic&&!x.match),'all six lines generic and unmatched — never auto-matched');
   assert.equal(await page.locator('#rm-panel .rm-line').count(),6);assert.match(await page.locator('#rm-panel').innerText(),/Chưa rõ món/);
   // basket: ticked first in tick order
   const basketNames=await page.locator('#rm-panel .rm-item .rm-item-name').allInnerTexts();assert.deepEqual(basketNames.slice(0,3).map(s=>s.replace(/^[☐☑]\s*/,'')),['Rau muống','Thịt heo','Đậu hũ'],'ticked “đã mua” first, in tick order');
   // suggestion for VEG 3.20 (line 2) from the family's history at this store
   const sug=page.locator('#rm-panel [data-rm="accept"][data-i="1"]').first();assert.match(await sug.innerText(),/Rau muống/);assert.match(await sug.innerText(),/Lần trước ở cửa hàng này/);
   await targets(page,'#rm-panel button, #rm-panel input, #rm-panel summary','match panel mobile');await noOverflow(page,'panel mobile');
   await shot(page,'mobile-match-panel-vi-light','#rm-panel');
   await sug.click();d=await draft(page);assert.equal(d[1].match,'waterSpinach','suggestion applied only on tap');
   // tap price → tap item (weighed MEAT line → pork, 0.85 kg)
   await panelRow(page,2).click();await page.locator('#rm-panel [data-rm="item"][data-key="i:pork"]').click();d=await draft(page);assert.equal(d[2].match,'pork');assert.equal(d[2].qty,0.85);assert.equal(d[2].unit,'kg');
   // one price → several items (VEG 8.40 = hành lá + cải thìa), then undo the last tap, then re-add
   await panelRow(page,3).click();await page.locator('#rm-panel [data-rm="item"][data-key="i:scallion"]').click();await page.locator('#rm-panel [data-rm="item"][data-key="i:bokchoy"]').click();
   d=await draft(page);assert.deepEqual(d[3].covers,['i:scallion','i:bokchoy']);assert.equal(d[3].match,'other');assert.match(await page.locator('#rm-panel .rm-line').nth(3).innerText(),/Hành lá \+ Cải thìa/);
   await shot(page,'mobile-multi-item-vi-light','#rm-panel .rm-line:nth-child(4)');
   await page.locator('#rm-panel [data-rm="undo"]').click();d=await draft(page);assert.equal(d[3].match,'scallion','undo removes the last item');
   await panelRow(page,3).click();await page.locator('#rm-panel [data-rm="item"][data-key="i:bokchoy"]').click();d=await draft(page);assert.deepEqual(d[3].covers,['i:scallion','i:bokchoy']);
   // hold-to-talk: "dòng 5 là đậu hũ"
   await page.evaluate(()=>{(window as any).__say='dòng 5 là đậu hũ'});const mic=page.locator('#rm-mic');await page.evaluate(()=>document.getElementById('rm-mic').scrollIntoView({block:'center'}));const box=await mic.boundingBox();
   await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.waitForTimeout(450);await page.mouse.up();await page.waitForFunction(()=>receiptDraft.items[4].match==='tofu',null,{timeout:4000});
   assert.match(await page.locator('#rm-say-state').innerText(),/Dòng 5 → Đậu hũ/);
   // typed EN-style command also works ("line 1 is rice")
   await page.fill('#rm-say','line 1 is rice');await page.press('#rm-say','Enter');d=await draft(page);assert.equal(d[0].match,'rice');
   await shot(page,'mobile-voice-vi-light','.rm-voice');
   // split the multi-item line: the family types the amounts (must add up to 8.40)
   await page.locator('#rm-panel [data-rm="split"][data-i="3"]').click();await page.fill('#rm-panel [data-rm-split="0"]','2.00');await page.fill('#rm-panel [data-rm-split="1"]','5.00');await page.locator('#rm-panel [data-rm="split-apply"]').click();
   d=await draft(page);assert.equal(d.length,6,'parts that do not add up are refused');
   await page.fill('#rm-panel [data-rm-split="1"]','6.40');await page.locator('#rm-panel [data-rm="split-apply"]').click();d=await draft(page);
   assert.equal(d.length,7);assert.deepEqual([d[3].match,d[3].total,d[4].match,d[4].total],['scallion',2,'bokchoy',6.4]);
   await page.locator('#rm-panel [data-rm="undo"]').click();d=await draft(page);assert.equal(d.length,6,'undo restores the unsplit line');assert.deepEqual(d[3].covers,['i:scallion','i:bokchoy']);
   // save: the PLU 4011 line stays unknown → "Đồ khác (chưa rõ)"; not in the reconciliation
   await page.locator('#modal-root [data-feature="receipt-save"]').click();await page.locator('.reconcile-modal').waitFor({timeout:5000});
   const rec=await page.evaluate(()=>{const s=state;const r=s.receipts.find(x=>x.store==='TAN VIET GROCERY CABRAMATTA'&&x.id!=='qa-hist');return{items:r.items.map(i=>({label:i.label,kind:i.kind,ingredient:i.ingredient,unknown:!!i.unknown,covers:(i.covers||[]).length,quantity:i.quantity,generic:!!i.generic})),learned:s.receiptLearning.entries.map(e=>[e.key,e.lo,e.target.key])}});
   const plu=rec.items.find(i=>i.label==='PLU 4011');assert.deepEqual([plu.kind,plu.unknown,plu.ingredient],['other',true,null],'unmatched line saved as Đồ khác (chưa rõ)');
   assert.equal(rec.items.find(i=>i.ingredient==='pork').quantity,850);assert.equal(rec.items.filter(i=>i.covers).length,1);assert.ok(rec.items.every(i=>i.generic));
   assert.deepEqual(rec.learned.map(x=>x[2]).sort(),['i:pork','i:rice','i:tofu','i:waterSpinach'],'single confirmed matches are learned for this store');
   const rtext=await page.locator('.reconcile-modal').innerText();assert.doesNotMatch(rtext,/PLU 4011/,'unknown lines are not reconciled');
   await shot(page,'mobile-reconcile-vi-light');
   await page.locator('.reconcile-modal .btn[data-action="close-modal"]').click();
   assert.equal(calls.filter(c=>c.op==='contribute'||c.op==='confirm').length,0,'nothing is shared automatically');
   // spending: "Đồ khác (chưa rõ)" card
   await page.evaluate(()=>{view='expenses';render()});const card=page.locator('.rm-unknown-card');await card.waitFor();assert.match(await card.innerText(),/ĐỒ KHÁC \(CHƯA RÕ\)[\s\S]*\$2\.10/);
   await shot(page,'mobile-spending-unknown-vi-light','.stat-grid');
   // per-store learning used next time; "Quên" forgets
   await parse(page);const s2=page.locator('#rm-panel [data-rm="accept"][data-i="1"]').first();assert.match(await s2.innerText(),/Đã ghép trước đây ở cửa hàng này/);
   await page.locator('#rm-panel .rm-learned summary').click();const nLearned=await page.locator('#rm-panel [data-rm="forget"]').count();assert.equal(nLearned,4);
   await shot(page,'mobile-learned-vi-light','.rm-foot');
   await page.locator('#rm-panel [data-rm="forget"]').first().click();assert.equal(await page.evaluate(()=>state.receiptLearning.entries.length),3,'forgotten mapping removed from family data');
   // offline: matching and typed commands keep working; the mic explains what to do
   await context.setOffline(true);await page.evaluate(()=>{(globalThis as any).BEP_OFFLINE=true;window.dispatchEvent(new Event('offline'))});
   await panelRow(page,5).click();await page.locator('#rm-panel [data-rm="item"][data-key="i:tofu"]').click();d=await draft(page);assert.equal(d[5].match,'tofu','tap-match works offline');
   await page.fill('#rm-say','dòng 4 là hành lá và cải thìa');await page.press('#rm-say','Enter');d=await draft(page);assert.deepEqual(d[3].covers,['i:scallion','i:bokchoy'],'typed command works offline');
   await page.evaluate(()=>document.getElementById('rm-mic').scrollIntoView({block:'center'}));const m2=await page.locator('#rm-mic').boundingBox();await page.mouse.move(m2.x+m2.width/2,m2.y+m2.height/2);await page.mouse.down();await page.waitForTimeout(400);await page.mouse.up();await page.waitForTimeout(150);
   assert.match(await page.locator('#rm-say-state').innerText(),/offline/i);
   await shot(page,'mobile-offline-vi-light','#rm-panel');
   await context.setOffline(false);await page.evaluate(()=>{(globalThis as any).BEP_OFFLINE=false});
   assert.deepEqual(errors,[],'no page errors (match flow)');await context.close()}

  // ---------- 2. responsive matrix of the match panel (VI/EN, light/dark)
  for(const [size,lang,theme] of [['narrow','vi','light'],['mobile','en','dark'],['tablet','vi','dark'],['tablet','en','light'],['desktop','vi','light'],['desktop','en','dark']]){
   const {context,page,errors}=await open({size,lang,theme});await parse(page);
   await panelRow(page,2).click();await page.locator('#rm-panel [data-rm="item"][data-key="i:pork"]').click();
   const t=await page.locator('#rm-panel').innerText();assert.match(t,lang==='vi'?/Ghép giá với giỏ đi chợ/:/Match prices to the shopping basket/);assert.match(t,lang==='vi'?/Thịt heo/:/Pork/);assert.doesNotMatch(t,/Netlify|Blobs/i);
   await noOverflow(page,`${size} ${lang}`);if(size!=='desktop')await targets(page,'#rm-panel button, #rm-panel input, #rm-panel summary',`${size} ${lang}`);
   await shot(page,`${size}-match-panel-${lang}-${theme}`,'#rm-panel');
   assert.deepEqual(errors,[],'no page errors '+size);await context.close()}

  // ---------- 3. account mode: community report of an unmatched line, So Giá unverified/verified, "Tôi cũng thấy giá này"
  for(const [size,lang,theme] of [['mobile','vi','light'],['tablet','en','dark'],['desktop','vi','dark']]){
   const {context,page,errors,calls}=await open({size,lang,theme,account:true});
   // a saved receipt (captured today) with one unknown generic line
   const id=await page.evaluate(()=>{const S=globalThis as any;const r={id:'qa-saved',store:'TAN VIET GROCERY CABRAMATTA',date:new Date().toISOString().slice(0,10),currency:'AUD',total:5.3,createdAt:new Date(Date.now()-3600e3).toISOString(),updatedAt:new Date().toISOString(),hasPhoto:false,raw:'',items:[{id:'s1',label:'VEG',total:3.2,ingredient:null,recipe:null,kind:'other',quantity:null,enteredQty:null,enteredUnit:'',generic:true,genericKey:'l:veg',unknown:true,lineKind:'item'},{id:'s2',label:'PLU 4011',total:2.1,ingredient:null,recipe:null,kind:'other',quantity:null,enteredQty:null,enteredUnit:'',generic:true,genericKey:'p:4011',plu:'4011',unknown:true,lineKind:'item'}]};state.receipts.push(r);save();return r.id});
   await page.waitForFunction(()=>typeof (globalThis as any).scoutCommunityOn==='function'&&scoutCommunity?.status?.signedIn,null,{timeout:15000}).catch(async()=>{await page.evaluate(()=>scoutCommunityRefresh())});
   await page.evaluate(i=>openReceipt(i),id);await page.locator('#rm-panel').waitFor();
   const rep=page.locator('#rm-panel [data-rm="report"][data-i="0"]');await rep.waitFor();assert.equal(calls.filter(c=>c.op==='contribute').length,0,'opening the receipt sends nothing');
   await rep.click();await page.locator('#rm-report-form').waitFor();await page.fill('#rm-report-q',lang==='vi'?'rau muống':'water spinach');await page.waitForTimeout(100);
   await page.locator('#rm-report-results input[type="radio"]').first().check();
   await page.locator('[form="rm-report-form"]').click();await page.waitForTimeout(150);assert.equal(calls.filter(c=>c.op==='contribute').length,0,'never sent without the consent tick');
   await targets(page,'.modal .btn, .modal input.input, .rm-report-item, .modal .scout-check',`report sheet ${size}`);await noOverflow(page,'report sheet '+size);
   await page.locator('#rm-report-consent').check();await shot(page,`${size}-report-sheet-${lang}-${theme}`);
   await page.locator('[form="rm-report-form"]').click();await page.waitForFunction(()=>true);await page.waitForTimeout(300);
   const sent=calls.filter(c=>c.op==='contribute');assert.equal(sent.length,1,'sent once after the tap');const b=JSON.parse(sent[0].body);
   assert.equal(b.consent,true);assert.deepEqual([b.observation.itemId,b.observation.price,b.observation.retailer,b.observation.evidence.type,b.observation.evidence.generic,b.observation.evidence.receiptId,b.observation.evidence.lineId],['rau-muong',3.2,'viet-grocer','receipt',true,'qa-saved','s1']);
   assert.deepEqual(b.branch,{suburb:'Cabramatta',postcode:'2166'});assert.ok(!sent[0].body.includes('PLU 4011')&&!sent[0].body.includes('TAN VIET'),'facts only: no other lines, no store text');
   // So Giá: unverified vs verified + "Tôi cũng thấy giá này"
   await page.evaluate(()=>{const S=globalThis as any;closeModal();const w=currentWeek();w.extras=[{id:'qa-x1',name:'Rau muống',qty:'1 bó',cost:0,currency:'AUD',done:false},{id:'qa-x2',name:'Gạo thơm jasmine',qty:'5 kg',cost:0,currency:'AUD',done:false}];save();view='shopping';location.hash='shopping';render()});
   await page.evaluate(()=>scoutCommunityRefresh?.()).catch(()=>{});await page.evaluate(()=>scoutRerender?.());
   const un=page.locator('.scout-cp:has(.scout-status.unverified)',{hasText:lang==='vi'?'Chưa xác minh · 1 người báo':'Not verified · 1 report'});await un.first().waitFor({timeout:10000});
   const ver=page.locator('.scout-cp:has(.scout-status.ok)',{hasText:lang==='vi'?'Đã xác nhận':'Confirmed'});assert.ok(await ver.count()>=1,'verified price shown');
   assert.equal(await ver.first().locator('[data-community="metoo"]').count(),0,'no “I saw this too” on verified prices');
   const mt=un.first().locator('[data-community="metoo"]');assert.match(await mt.innerText(),lang==='vi'?/Tôi cũng thấy giá này/:/I saw this price too/);
   await un.first().scrollIntoViewIfNeeded();await targets(page,'.scout-cp [data-community]',`So Giá rows ${size}`);await noOverflow(page,'So Giá '+size);
   await shot(page,`${size}-so-gia-unverified-${lang}-${theme}`,'.scout-community');
   await mt.click();await page.waitForTimeout(300);const conf=calls.filter(c=>c.op==='confirm');assert.equal(conf.length,1);const cb=JSON.parse(conf[0].body);
   assert.deepEqual([cb.consent,cb.state,cb.itemId,cb.groupId],[true,'NSW','rau-muong','aaaa000011112222']);assert.ok(Math.abs(Date.now()-Date.parse(cb.capturedAt))<60000,'fresh capture time');
   assert.deepEqual(errors,[],'no page errors (account '+size+')');await context.close()}

  // ---------- 4. Studio: unverified single reports shown distinctly
  for(const [size,lang,theme] of [['mobile','vi','light'],['desktop','en','dark']]){
   const context=await browser.newContext({locale:'vi-VN',viewport:SIZES[size],reducedMotion:'reduce',colorScheme:theme});await context.addInitScript(({lang,theme})=>{localStorage.setItem('studio-lang',lang);localStorage.setItem('studio-theme',theme)},{lang,theme});
   const page=await context.newPage(),errors=[],posts=[];page.on('pageerror',e=>errors.push(e.message));
   const sub={kind:'unverified',state:'NSW',id:'cp-qa-u1',groupId:'aaaa000011112222',itemId:'rau-muong',label:'Water spinach',retailer:'viet-grocer',branchLabel:'Cabramatta 2166',branchId:'viet-grocer:2166:cabramatta',price:3.2,unitPrice:null,unitBasis:null,capturedAt:now,submittedAt:now,status:'accepted',holdReason:null,flags:[],approved:false,shadow:false,counted:true,evidence:{type:'receipt',generic:true,of:null,ocrPrice:null,ocrMatches:null,hash:null},photo:false,families:1,reportsCount:1,contributor:{account:'qa-family-a',trust:0.62,banned:false,flags:[],submissions:4}};
   const MOD={stats:{submissions:12,confirmed:4,pending:3,unverified:1,held:0,reportsOpen:0,contributors:5,banned:0,trust:{'<0.3':0,'0.3–0.7':4,'≥0.7':1},hidden:0,rejected:0},queue:[sub],coi:[],applications:[],shopPrices:[],rewards:{contributors:[],leaderboards:{},config:{},defaults:{},levels:[]},products:[],pilot:{enabled:true,states:['NSW','QLD']},flagSource:'default',rules:{}};
   await page.route(origin+'/**',async route=>{const req=route.request(),url=new URL(req.url()),op=url.searchParams.get('op')||'';
    if(url.pathname.endsWith('/studio')){if(req.method()==='POST')posts.push({op,body:JSON.parse(req.postData()||'{}')});await route.fulfill({json:op==='me'?{username:'henrynguyen',name:'Henry',role:'owner',csrf:'qa'}:op==='community'?MOD:{done:true}});return}
    const file=path.resolve('dist',url.pathname.slice(1));try{await route.fulfill({contentType:mime[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)})}catch{await route.fulfill({status:404,body:''})}});
   await page.goto(origin+'/studio.html#community');await page.waitForSelector('#cptab');
   const t=await page.locator('#cptab').innerText();assert.match(t,lang==='vi'?/Chưa xác minh · 1 gia đình/:/Not verified · 1 family/);assert.match(t,lang==='vi'?/dòng chưa rõ món, gia đình tự đặt tên/:/unknown line, item named by the family/);
   assert.match(await page.locator('#main').innerText(),lang==='vi'?/Chưa xác minh/:/Not verified/);assert.ok(await page.locator('#cptab [data-ca="hide"]').count()>=1,'Studio removal still available');
   await noOverflow(page,'studio '+size);await page.evaluate(()=>{const el=document.querySelector('#cptab');if(el)scrollTo(0,el.getBoundingClientRect().top+scrollY-20)});await shot(page,`${size}-studio-unverified-${lang}-${theme}`);
   assert.deepEqual(errors,[],'no page errors (studio)');await context.close()}
  console.log('generic receipts browser test passed; screenshots:',shots.length);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
