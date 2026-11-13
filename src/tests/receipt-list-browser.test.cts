// v1.7.18 receipt ↔ shopping list — browser test (Chromium viewport simulation, NOT physical devices).
// The owner's Costco receipt TEXT (OCR of his photo, personal numbers blanked; no photo kept) is read into the receipt form with a
// synthetic family week (QA data): list-first matches, the per-line state (Chắc chắn / Gợi ý — kiểm tra / Chưa ghép), each
// option for a line that is not sure (Chọn từ danh sách đi chợ, Tìm món khác, Thêm món mới vào kho, Không phải đồ nấu, Để sau),
// an amount entered once (1 chai ≈ 4 L) and remembered on a second receipt, then saving → “Đối chiếu đi chợ & kho” with Đủ /
// Dư → cất kho / Dành cho bữa … / Không theo dõi, the shopping list and pantry afterwards, and undo. Tapped controls do not move the
// page (rule 24); no emoji and no drawings on chips or secondary buttons (rules 19, 27). Sizes 320×740, 375×812, 820×1100,
// 1280×800; VI/EN, light/dark. Screenshots → docs/reviews/v1.7.18/receipt-list.
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert');
const {COSTCO}=require('./fixtures/receipt-list.cjs');
const root=process.cwd(),dir='docs/reviews/v1.7.18/receipt-list',origin='https://kitchen.test';fs.mkdirSync(dir,{recursive:true});
// v1.7.19 (owner, “Đổi cả 3 chỗ”, rule 29): a receipt line's unit is picked in the shared unit picker, not a plain list.
const pickLineUnit=async(page:any,line:any,unit:string)=>{await line.locator('.unit-field-btn').click();const chip=page.locator(`#unit-sheet-layer .unit-chip[data-unit-choice="${unit}"]`).first();await page.locator('#unit-sheet-layer .unit-chip').first().waitFor();if(!(await chip.isVisible()))await page.locator('#unit-sheet-layer [data-unit-action="show-all"]').click();await chip.click();await page.locator('#unit-sheet-layer [data-unit-sheet-act="save"]').click();await page.locator('#unit-sheet-layer').waitFor({state:'detached'})};
const mime:any={'.html':'text/html','.js':'application/javascript','.json':'application/json','.css':'text/css','.webp':'image/webp','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json','.gz':'application/gzip','.wasm':'application/wasm'};
const SIZES:any={narrow:{width:320,height:740},mobile:{width:375,height:812},tablet:{width:820,height:1100},desktop:{width:1280,height:800}};
const OIL_ONLY='Costco Wholesale Australia\nAUS FIELDS CAN OIL\n153701     1x 10.69     10.69\nTOTAL NUMBER OF ITEMS SOLD = 1\n';
const EMOJI=/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}]/u;
const noOverflow=async(page:any,label:string)=>{const o=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.ok(o<=1,label+': horizontal overflow '+o+'px')};
const targets=async(page:any,sel:string,label:string)=>{const small=await page.evaluate((s:string)=>[...document.querySelectorAll(s)].filter((e:any)=>e.offsetParent&&e.getBoundingClientRect().height<43.5).map((e:any)=>(e.textContent||e.id).trim().slice(0,30)+' '+Math.round(e.getBoundingClientRect().height)),sel);assert.deepEqual(small,[],'≥44px targets: '+label)};
const noEmoji=async(page:any,sel:string,label:string)=>{const t=await page.evaluate((s:string)=>[...document.querySelectorAll(s)].map(e=>(e as any).innerText).join('\n'),sel);assert.ok(!EMOJI.test(t),label+': no emoji');const svg=await page.locator(sel.split(',').map(x=>x.trim()+' svg').join(',')).count();assert.equal(svg,0,label+': chips and secondary buttons have no drawing (rule 27)')};
const shots:string[]=[];const shot=async(page:any,name:string)=>{await page.evaluate(()=>{const t=document.querySelector('#toast');if(t)t.className=''});await page.waitForTimeout(120);const f=`${dir}/${name}.jpg`;await page.screenshot({path:f,type:'jpeg',quality:66});const kb=fs.statSync(f).size/1024;assert.ok(kb<250,`${name}.jpg ${kb.toFixed(0)} KB`);shots.push(name)};
// Synthetic week (QA data): dinner in 2 days uses eggs, oil, corn and milk; next week's dinner uses eggs. The family's own list
// line “Kimchi”. Nothing in the pantry for those ingredients; no receipts, no memory.
const seed=()=>{const st:any=state;const dish=(id:string,ings:any[])=>({id,name:'QA '+id,category:'main',protein:'egg',time:20,servings:4,yield:4,ingredients:ings,prep:'QA',steps:['QA'],custom:true,favorite:false,purposes:['main']});
 st.preferences.onboardingComplete=true;const ids=['egg','oil','corn','milk'];
 const w=currentWeek(),date=addDays(weekStart,2),next=addDays(weekStart,7),nw=ensureWeek(st,next);
 for(const wk of[w,nw])for(const day of Object.values(wk.days) as any[])for(const m of Object.values(day) as any[])if(m&&Array.isArray(m.recipes)){m.recipes=[];m.cooked=false}
 w.days[date].dinner.recipes=[dish('qa-rl1',[{id:'egg',qty:6},{id:'oil',qty:200},{id:'corn',qty:400},{id:'milk',qty:300}])];
 nw.days[addDays(next,2)].dinner.recipes=[dish('qa-rl2',[{id:'egg',qty:4}])];
 w.bought={};w.boughtAt={};w.skip={};w.extras=[{id:'qa-x1',name:'Kimchi',qty:'1 hộp',cost:0,done:false}];
 st.pantry=st.pantry.filter((p:any)=>!ids.includes(p.ingredient));st.receipts=[];st.aliases={};delete st.receiptQty;st.receiptLearning={entries:[]};
 save();closeModal();view='expenses';location.hash='expenses';render()};
const draft=(page:any)=>page.evaluate(()=>(receiptDraft as any).items.map((i:any)=>({label:i.label,match:i.match,conf:i.confidence,qty:i.qty,unit:i.unit,src:i.src,basket:i.extra?.basket?.id||null,per:i.extra?.per||null,state:(globalThis as any).ReceiptListUI.stateOf(i)})));
const lineOf=async(page:any,re:RegExp)=>{const i=await page.evaluate((src:string)=>(receiptDraft as any).items.findIndex((x:any)=>new RegExp(src).test(x.label)),re.source);assert.ok(i>=0,'line '+re);return i};
const box=(i:number)=>`#modal-root .rl-box[data-i="${i}"]`;
const parse=async(page:any,text:string)=>{await page.evaluate((t:string)=>{newReceipt();(document.querySelector('#receipt-raw') as any).value=t},text);await page.locator('#modal-root [data-feature="receipt-parse"]').click();await page.locator('#modal-root .receipt-line').first().waitFor()};
// rule 24: the tapped control's line stays where it is on screen
const still=async(page:any,i:number,sel:string,label:string)=>{const loc=page.locator(sel).first();await loc.scrollIntoViewIfNeeded();await page.waitForTimeout(60);const y=async()=>page.evaluate((k:number)=>document.querySelector(`#modal-root .receipt-line[data-index="${k}"] .receipt-label`)!.getBoundingClientRect().top,i);const a=await y();await loc.click();await page.waitForTimeout(80);const b=await y();assert.ok(Math.abs(a-b)<=1,`${label}: the line stays where it was (${a} → ${b})`)};
const saveWithTotal=async(page:any)=>{await page.evaluate(()=>{collectReceipt();const d:any=receiptDraft;const sum=Math.round(d.items.reduce((n:number,i:any)=>n+(+i.total||0),0)*100)/100;(document.querySelector('#receipt-total') as any).value=String(sum)});
 await page.locator('#modal-root [data-feature="receipt-save"]').click();await page.locator('#modal-root .reconcile-modal').waitFor({timeout:8000})};

(async()=>{const browser=await chromium.launch(process.env.BEP_CHROMIUM?{executablePath:process.env.BEP_CHROMIUM}:{});
 async function open({size='mobile',lang='vi',theme='light'}:any={}){
  const context=await browser.newContext({locale:'vi-VN',viewport:SIZES[size],reducedMotion:'reduce',colorScheme:theme,serviceWorkers:'block',hasTouch:size!=='desktop',isMobile:size==='narrow'||size==='mobile'});
  await context.addInitScript(({lang,theme}:any)=>{if(sessionStorage.getItem('qa-init'))return;sessionStorage.setItem('qa-init','1');localStorage.setItem('bep-theme-mode',theme);localStorage.setItem('guest/bep-language',lang);localStorage.setItem('bep-local-locked','yes')},{lang,theme});
  const page=await context.newPage(),errors:string[]=[];page.on('pageerror',(e:any)=>errors.push(e.message));
  await page.route(origin+'/**',async(route:any)=>{const url=new URL(route.request().url()),p=url.pathname,op=url.searchParams.get('op')||'';
   if(p.endsWith('/community')){await route.fulfill(op==='status'?{json:{enabled:true,signedIn:false,publicRead:true,states:['NSW']}}:op.startsWith('prices')?{json:{state:'NSW',items:[],shopPrices:[],wanted:{counts:{}}}}:{status:401,json:{}});return}
   if(p.startsWith('/.netlify/')){await route.fulfill({status:401,json:{error:'no'}});return}
   if(p==='/startup-scripts.json'){await route.fulfill({json:JSON.parse(fs.readFileSync('dist/startup-scripts.json','utf8'))});return}
   const file=path.join(root,'dist',p==='/'?'index.html':decodeURIComponent(p.slice(1)));if(!file.startsWith(path.join(root,'dist'))||!fs.existsSync(file)||fs.statSync(file).isDirectory())return route.fulfill({status:404,body:'missing'});return route.fulfill({body:fs.readFileSync(file),contentType:mime[path.extname(file)]||'application/octet-stream'})});
  await page.goto(origin+'/#expenses');await page.locator('#main .page-heading, #main h1').first().waitFor({timeout:20000});await page.waitForTimeout(500);
  for(let i=0;i<4;i++){try{await page.evaluate(seed);break}catch(e){if(i===3)throw e;await page.waitForTimeout(600)}}
  await page.evaluate((l:string)=>(globalThis as any).changeAppLanguage?.(l),lang);await page.waitForTimeout(150);
  return{context,page,errors};
 }
 try{
  // ---------- 1. full flow (mobile 375, VI, light)
  {const{context,page,errors}=await open({size:'mobile'});
   await parse(page,COSTCO);let d=await draft(page);const by=(re:RegExp)=>d.find((x:any)=>re.test(x.label));
   // list first + stricter matching
   assert.deepEqual([by(/CAGE FREE/).match,by(/CAGE FREE/).qty,by(/CAGE FREE/).unit,by(/CAGE FREE/).src],['egg',30,'quả','list'],'eggs 30PK → Trứng 30 quả, from this week’s list');
   assert.deepEqual([by(/SWEETCORN/).match,by(/SWEETCORN/).src],['corn','list']);
   assert.deepEqual([by(/CAN OIL/).match,by(/CAN OIL/).state,by(/CAN OIL/).qty],['oil','check',null],'canola oil: a suggestion to check, amount not printed');
   assert.deepEqual([by(/KIMCHI/).match,by(/KIMCHI/).basket],['other','qa-x1'],'JONGGA KIMCHI ↔ the family’s list line “Kimchi”');
   assert.equal(by(/OMO TRIPLE CAPS/).match,'other','OMO: not food, spending only');assert.notEqual(by(/OMO TRIPLE CAPS/).match,'bellPepper');
   for(const re of[/APPLE JUICE/,/PRAWN HARGOW/,/ONION PANCAKE/,/ROAST BEEF/])assert.equal(by(re).match,'',re+' not matched to a raw ingredient');
   assert.match(await page.locator('#modal-root .rl-summary').innerText(),/chắc chắn · \d+ gợi ý cần kiểm tra · \d+ chưa ghép/);
   const hg=await lineOf(page,/PRAWN HARGOW/);assert.match(await page.locator(box(hg)).innerText(),/Chưa ghép/);assert.match(await page.locator(`#modal-root .receipt-line[data-index="${hg}"] .receipt-line-hint`).innerText(),/món làm sẵn/);
   assert.match(await page.locator(box(await lineOf(page,/CAGE FREE/))).innerText(),/Chắc chắn[\s\S]*có trong danh sách đi chợ tuần này/);
   await noOverflow(page,'mobile form');await targets(page,'#modal-root .rl-options .btn','mobile options');await noEmoji(page,'#modal-root .rl-box, #modal-root .rl-summary','form');
   await page.evaluate((k:number)=>document.querySelector(`#modal-root .receipt-line[data-index="${k}"]`)!.scrollIntoView({block:'start'}),hg);await shot(page,'mobile-375-form-states-vi-light');
   // Chọn từ danh sách đi chợ: STRWBERRY MILK → Sữa (nearest first)
   const sm=await lineOf(page,/^STRWBERRY MILK/);await page.evaluate((k:number)=>document.querySelector(`#modal-root .receipt-line[data-index="${k}"]`)!.scrollIntoView({block:'center'}),sm);
   await still(page,sm,`${box(sm)} [data-rl="list"]`,'Chọn từ danh sách');
   const first=await page.locator(`${box(sm)} .rl-pick`).first().innerText();assert.match(first,/Sữa/,'nearest first: '+first);
   await shot(page,'mobile-375-pick-from-list-vi-light');
   await still(page,sm,`${box(sm)} .rl-pick`,'pick from the list');
   d=await draft(page);assert.deepEqual([d[sm].match,d[sm].state],['milk','sure']);assert.equal(await page.locator(`#modal-root .receipt-line[data-index="${sm}"] select.receipt-match`).inputValue(),'milk');
   // Tìm món khác → the line's search box opens
   const pt=await lineOf(page,/POP TOPS/);await page.evaluate((k:number)=>document.querySelector(`#modal-root .receipt-line[data-index="${k}"]`)!.scrollIntoView({block:'center'}),pt);
   await still(page,pt,`${box(pt)} [data-rl="search"]`,'Tìm món khác');
   assert.equal(await page.evaluate((k:number)=>document.activeElement===document.querySelector(`#modal-root .receipt-line[data-index="${k}"] .rm-search`),pt),true,'search box focused');assert.equal(await page.locator(`#modal-root .receipt-line[data-index="${pt}"] .rm-list`).isVisible(),true);
   await page.evaluate(()=>(document.activeElement as any)?.blur());await page.waitForTimeout(50);
   // Không phải đồ nấu / Để sau
   const ks=await lineOf(page,/KEWPIE MAYO/);if(process.env.RL_DEBUG)console.log(await page.evaluate((k:number)=>[document.querySelector(`#modal-root .receipt-line[data-index="${k}"]`)?.outerHTML.slice(-1500),JSON.stringify((receiptDraft as any).items[k])],ks));await still(page,ks,`${box(ks)} [data-rl="other"]`,'Không phải đồ nấu');d=await draft(page);assert.deepEqual([d[ks].match,d[ks].state],['other','other']);
   const dj=await lineOf(page,/DJEA/);await still(page,dj,`${box(dj)} [data-rl="later"]`,'Để sau');d=await draft(page);assert.deepEqual([d[dj].match,d[dj].state],['','later']);
   // Thêm món mới vào kho: LKK OYSTER SAUCE → the family's own ingredient, amount asked once
   const oy=await lineOf(page,/OYSTER SAUCE/);await page.evaluate((k:number)=>document.querySelector(`#modal-root .receipt-line[data-index="${k}"]`)!.scrollIntoView({block:'center'}),oy);
   await still(page,oy,`${box(oy)} [data-rl="new"]`,'Thêm món mới');
   const fam=await page.evaluate(()=>Object.entries((state as any).ingredientCatalog||{}).map(([id,x]:any)=>[id,x.name,x.unit]));assert.ok(fam.some((f:any)=>f[1]==='Lkk Oyster Sauce'&&f[2]==='cái'),'family ingredient named as on the receipt: '+JSON.stringify(fam));
   d=await draft(page);assert.ok(/^family-ing-/.test(d[oy].match));assert.match(await page.locator(box(oy)).innerText(),/Hoá đơn không in lượng/);
   await page.locator(`#modal-root .receipt-line[data-index="${oy}"] .receipt-qty`).fill('1');await pickLineUnit(page,page.locator(`#modal-root .receipt-line[data-index="${oy}"]`),'cái');
   await page.locator(`${box(oy)} .rl-have`).waitFor();assert.match(await page.locator(`${box(oy)} .rl-have`).innerText(),/= 1 cái · app sẽ nhớ cho lần sau/);
   // the oil: confirm the suggestion, enter 1 chai, “1 chai ≈ 4 L”
   const oil=await lineOf(page,/CAN OIL/);await page.evaluate((k:number)=>document.querySelector(`#modal-root .receipt-line[data-index="${k}"]`)!.scrollIntoView({block:'center'}),oil);
   await still(page,oil,`${box(oil)} [data-rl="ok"]`,'Đúng, giữ gợi ý');
   await page.locator(`#modal-root .receipt-line[data-index="${oil}"] .receipt-qty`).fill('1');await pickLineUnit(page,page.locator(`#modal-root .receipt-line[data-index="${oil}"]`),'chai');
   await page.locator(`${box(oil)} .rl-per-qty`).waitFor();await page.locator(`${box(oil)} .rl-per-unit`).selectOption('l');await page.locator(`${box(oil)} .rl-per-qty`).fill('4');
   assert.match(await page.locator(`${box(oil)} .rl-have`).innerText(),/= 4[.,]?0*\s?(l|lít|L|000 ml)/i);d=await draft(page);assert.equal(d[oil].per,4000,'1 chai ≈ 4 L = 4000 ml per chai');
   await shot(page,'mobile-375-amount-once-vi-light');
   await noOverflow(page,'mobile form after choices');await targets(page,'#modal-root .rl-options .btn, #modal-root .rl-per .input','mobile options after');
   // save → reconciliation
   await saveWithTotal(page);const rec=page.locator('#modal-root .reconcile-modal');const txt=await rec.innerText();
   const saved=await page.evaluate(()=>{const r=(state as any).receipts[0];const it=(re:string)=>r.items.find((x:any)=>new RegExp(re).test(x.label));return{oil:[it('CAN OIL').quantity,it('CAN OIL').per],egg:it('CAGE FREE').quantity,omo:it('OMO TRIPLE CAPS').kind,later:it('DJEA').kind,mem:(state as any).receiptQty,alias:(state as any).aliases['receipt costco n kewpie mayo 1kg'],count:r.items.length}});
   assert.deepEqual(saved.oil,[4000,4000],'1 chai ≈ 4 L counts as 4000 ml');assert.equal(saved.egg,30);assert.equal(saved.omo,'other');assert.equal(saved.later,'pending','“Để sau” stays unmatched; spending keeps the line');
   assert.deepEqual(saved.mem['receipt costco n aus fields can oil'].per,4000,'amount remembered per store item');assert.equal(saved.alias,'other','“Không phải đồ nấu” remembered per store');
   assert.match(txt,/Trứng[\s\S]*Đủ · dư 2[0-9] quả[\s\S]*→ cất kho/,'eggs: list part first (Đủ), extra → pantry');assert.match(txt,/Kimchi[\s\S]*Trong danh sách → đã mua/);assert.match(txt,/Ngoài danh sách · 1 cái[\s\S]*→ cất kho/);
   await noOverflow(page,'mobile reconcile');await targets(page,'#modal-root .reconcile-row, #modal-root .rc-opt, #modal-root .reconcile-open .btn, #modal-root .modal-footer .btn','mobile reconcile');await noEmoji(page,'#modal-root .reconcile-choice','reconcile');
   await shot(page,'mobile-375-reconcile-vi-light');
   // eggs: Dành cho bữa (next week's dinner) — the tapped choice stays where it is
   const eggChoice='#modal-root .reconcile-choice[data-rlx="egg"]';await page.locator(`${eggChoice} .rc-opt`).nth(1).scrollIntoViewIfNeeded();await page.waitForTimeout(60);const y0=(await page.locator(`${eggChoice} .rc-opt`).nth(1).boundingBox()).y;
   if(process.env.RL_DEBUG)console.log(await page.evaluate((sel:string)=>{const r=document.querySelector(sel+' input[value="meal"]') as any;let info:any=[];const orig=Event.prototype.preventDefault;(Event.prototype as any).preventDefault=function(){info.push(this.type+' '+(new Error().stack||'').split('\n').slice(1,4).join('|'));return orig.call(this)};r.click();(Event.prototype as any).preventDefault=orig;return[r.checked,r.disabled,info]},eggChoice));
   await page.locator(`${eggChoice} input[value="meal"]`).check();await page.waitForTimeout(80);assert.ok(Math.abs((await page.locator(`${eggChoice} .rc-opt`).nth(1).boundingBox()).y-y0)<=1,'rule 24: the meal choice stays put');
   assert.equal(await page.locator(`${eggChoice} .rc-meal`).isVisible(),true);assert.match(await page.locator(`${eggChoice} .rc-dest`).innerText(),/dành cho bữa tối/);
   const oilChoice='#modal-root .reconcile-choice[data-rlx="oil"]';await page.locator(`${oilChoice} input[value="none"]`).check();assert.match(await page.locator(`${oilChoice} .rc-dest`).innerText(),/không theo dõi/);
   await shot(page,'mobile-375-reconcile-choices-vi-light');
   const before=await page.evaluate(()=>JSON.stringify({w:currentWeek(),p:(state as any).pantry}));
   await page.evaluate(()=>{const m:any={};for(const g of document.querySelectorAll('#modal-root .reconcile-choice[data-rlx]') as any){const i=g.querySelector('.rc-useby-input');m[g.dataset.rlx]=i?i.value:null}(window as any).__qaUseBy=m});
   assert.ok(await page.evaluate(()=>[...document.querySelectorAll('#modal-root .reconcile-choice:not([hidden]) .rc-useby:not([hidden]) .rc-useby-input')].every((i:any)=>i.getBoundingClientRect().height>=44)),'the use-by boxes are ≥ 44 px');
   await page.locator('#modal-root [data-rui="apply"]').click();await page.locator('.receipt-undo').waitFor();
   const after=await page.evaluate(()=>{const s:any=state,w=currentWeek(),r=s.receipts[0],lots=s.pantry.filter((p:any)=>p.receiptId===r.id);const[a,b]=shopDates();const rows=shopping(s,w,a,b);const row=(id:string)=>rows.find((x:any)=>x.id===id);
    return{egg:[w.bought.egg,row('egg').qty,row('egg').bought],lots:lots.map((p:any)=>[p.ingredient,p.qty,p.forMeal?.type||null,p.expiry]),oilLot:lots.some((p:any)=>p.ingredient==='oil'),kimchi:w.extras[0].done,corn:row('corn').bought,eggHave:row('egg').have,sug:(window as any).__qaUseBy}});
   assert.equal(after.egg[0],after.egg[1],'eggs: the list amount ticked bought');assert.equal(after.egg[2],true);assert.equal(after.eggHave,0,'the kept eggs are not counted against this week');
   assert.ok(after.lots.some((l:any)=>l[0]==='egg'&&l[2]==='dinner'&&l[1]===30-after.egg[0]),'extra eggs kept for next week’s dinner: '+JSON.stringify(after.lots));
   assert.equal(after.oilLot,false,'oil: not tracked');assert.equal(after.kimchi,true,'Kimchi ticked on the list');/* v1.7.19 owner decision (12 Nov 2026): the suggested use-by, shown and editable in the confirmation step */assert.ok(after.lots.every((l:any)=>l[3]===after.sug[l[0]]),'each lot has the suggested use-by shown in the sheet '+JSON.stringify(after));
   // shopping list and pantry afterwards
   await page.evaluate(()=>{closeModal();view='pantry';location.hash='pantry';render()});await page.locator('#main .rl-reserved').first().waitFor();assert.match(await page.locator('#main .rl-reserved').first().innerText(),/Dành cho bữa tối/);
   await page.locator('#main .rl-reserved').first().scrollIntoViewIfNeeded();await shot(page,'mobile-375-pantry-kept-for-meal-vi-light');await noOverflow(page,'pantry');
   await page.evaluate(()=>{view='shopping';location.hash='shopping';render()});await page.waitForTimeout(300);await noOverflow(page,'shopping');await shot(page,'mobile-375-shopping-after-vi-light');
   // undo restores everything
   await page.evaluate(()=>{view='expenses';location.hash='expenses';render()});await page.locator('.receipt-undo [data-rui="undo"]').click();
   assert.equal(await page.evaluate(()=>JSON.stringify({w:currentWeek(),p:(state as any).pantry})),before,'undo restores the list, extras and pantry');
   // lines not matched yet: from the reconciliation sheet, open the receipt and choose — remembered for this store
   await page.evaluate(()=>(globalThis as any).ReceiptUI.reconcileSheet((state as any).receipts[0].id));const op=page.locator('#modal-root .reconcile-open');assert.match(await op.innerText(),/\d+ dòng chưa ghép[\s\S]*ROAST BEEF[\s\S]*Mở hoá đơn để ghép/);
   await page.locator('#modal-root [data-rui="open-lines"]').click();await page.locator('#modal-root .receipt-line').first().waitFor();
   const hg2=await lineOf(page,/PRAWN HARGOW/);await page.locator(`${box(hg2)} [data-rl="other"]`).click();await page.locator('#modal-root [data-feature="receipt-save"]').click();
   await page.waitForFunction(()=>(state as any).aliases['receipt costco n prawn hargow 1kg']==='other');await page.evaluate(()=>closeModal());
   // a second Costco receipt fills the amount by itself
   await parse(page,OIL_ONLY);d=await draft(page);assert.deepEqual([d[0].match,d[0].qty,d[0].unit,d[0].per,d[0].state],['oil',1,'chai',4000,'sure'],'mapping and amount + “1 chai ≈ 4 L” remembered');
   assert.match(await page.locator('#modal-root .receipt-line-hint').first().innerText(),/lượng nhớ từ lần mua trước/);await page.locator(box(0)).scrollIntoViewIfNeeded();assert.match(await page.locator(box(0)).innerText(),/= 4/);
   await shot(page,'mobile-375-second-receipt-remembered-vi-light');
   assert.deepEqual(errors,[],'no page errors (flow)');await context.close()}

  // ---------- 1b. v1.7.19 audit sweep: “Đọc các dòng hóa đơn” never wipes confirmed lines (saved receipt with no text, text that
  // reads nothing); text that reads lines still replaces them. Failed before the fix: the two lines were lost.
  {const{context,page,errors}=await open({size:'mobile'});
   await page.evaluate(()=>{newReceipt();const d:any=receiptDraft;d.raw='';d.items=[{id:'k1',label:'Keep me one',total:7.5,match:'',qty:null,unit:'',confidence:'unknown'},{id:'k2',label:'Keep me two',total:4.8,match:'',qty:null,unit:'',confidence:'unknown'}];receiptEditor()});
   const labels=()=>page.evaluate(()=>(receiptDraft as any).items.map((i:any)=>i.label));
   // with lines already there the receipt text sits in a closed fold; open it the way a person would
   const unfold=async()=>{if(await page.locator('#modal-root details.receipt-raw-fold:not([open]) > summary').count())await page.locator('#modal-root details.receipt-raw-fold > summary').click()};await unfold();
   await page.evaluate(()=>{(document.querySelector('#receipt-raw') as any).value=''});await page.locator('#modal-root [data-feature="receipt-parse"]').click();await page.waitForTimeout(200);
   assert.deepEqual(await labels(),['Keep me one','Keep me two'],'empty receipt text keeps the confirmed lines');
   assert.match(await page.locator('#toast, .toast').first().innerText(),/Chưa có chữ hóa đơn để đọc/,'empty text says what to do');
   await unfold();await page.evaluate(()=>{(document.querySelector('#receipt-raw') as any).value='xin chao'});await page.locator('#modal-root [data-feature="receipt-parse"]').click();await page.waitForTimeout(200);
   {const l=await labels();assert.deepEqual(l,['Keep me one','Keep me two'],'text that reads no lines keeps the confirmed lines '+JSON.stringify({l,raw:await page.evaluate(()=>(receiptDraft as any).raw),toast:await page.locator('#toast').innerText()}))}
   await unfold();await page.evaluate((t:string)=>{(document.querySelector('#receipt-raw') as any).value=t},COSTCO);await page.locator('#modal-root [data-feature="receipt-parse"]').click();await page.locator('#modal-root .receipt-line').first().waitFor();
   assert.ok(!(await labels()).includes('Keep me one'),'text that reads lines replaces them');
   assert.ok(await page.evaluate(()=>validImport(clone(state))),'state still loads');
   assert.deepEqual(errors,[],'no page errors (1b)');console.log('PASS 1b receipt re-read keeps confirmed lines');await context.close()}
  // ---------- 1c. v1.7.19 (Tự chạy thử, Rà soát 12/11): đồng prices of 5–7 digits are read whole; a receipt is checked against the
  // menu week of its own date (the family's start day), not the week on screen. Both failed before the fix.
  {const{context,page,errors}=await open({size:'mobile'});
   const r:any=await page.evaluate(()=>{const p=parseReceiptText('TRUNG GA 10 QUA 35000.00\nTOTAL 35000.00',state);return p.items.map((i:any)=>({label:i.label,total:i.total}))});
   assert.equal(r.length,1,'one line for 35000.00 '+JSON.stringify(r));assert.equal(r[0].total,35000,'price read whole '+JSON.stringify(r));assert.ok(!/QUA 3$/.test(r[0].label),'no price digit left in the name '+JSON.stringify(r));
   const w:any=await page.evaluate(()=>{state.preferences.weekStartDay=6;const today=sydneyDate(),own=planStartOf(state,today);weekStart=addDays(own,7);selectedDate=weekStart;const rec={id:'qa-wk',date:today};
    const RW=(globalThis as any).ReceiptWeek;return{own,range:RW.range(rec),sameWeek:(()=>{const wk=RW.week(rec),pw=planWeek(state,own),ds=Object.keys(pw.days);return ds.length===7&&ds.every((d:string)=>wk.days[d]===pw.days[d]&&wk.days[d]===dayAt(state,d))})(),shown:weekStart}});
   assert.equal(w.range[0],w.own,'receipt checked against its own menu week, not the one on screen '+JSON.stringify(w));assert.ok(w.sameWeek,'the same stored week the list uses '+JSON.stringify(w));
   assert.deepEqual(errors,[],'no page errors (1c)');console.log('PASS 1c đồng prices and the receipt week');await context.close()}
  // ---------- 2. sizes, languages and themes: form + reconciliation
  for(const[size,lang,theme]of[['narrow','vi','light'],['mobile','en','dark'],['tablet','vi','light'],['tablet','en','dark'],['desktop','vi','dark'],['desktop','en','light']] as any){
   const{context,page,errors}=await open({size,lang,theme});const tag=`${size}-${SIZES[size].width}-${lang}-${theme}`;
   await parse(page,COSTCO);await noOverflow(page,tag+' form');await targets(page,'#modal-root .rl-options .btn',tag+' options');await noEmoji(page,'#modal-root .rl-box, #modal-root .rl-summary',tag);
   assert.match(await page.locator('#modal-root .rl-summary').innerText(),lang==='en'?/\d+ sure · \d+ to check · \d+ not matched/:/chắc chắn/);
   const hg=await lineOf(page,/PRAWN HARGOW/);await page.evaluate((k:number)=>document.querySelector(`#modal-root .receipt-line[data-index="${k}"]`)!.scrollIntoView({block:'start'}),hg);
   await still(page,hg,`${box(hg)} [data-rl="list"]`,tag+' list');await noOverflow(page,tag+' list open');await shot(page,`${tag}-form`);
   await page.locator(`${box(hg)} [data-rl="list"]`).click();
   await saveWithTotal(page);await noOverflow(page,tag+' reconcile');await targets(page,'#modal-root .reconcile-row, #modal-root .rc-opt, #modal-root .reconcile-open .btn, #modal-root .modal-footer .btn',tag+' reconcile');await noEmoji(page,'#modal-root .reconcile-choice',tag+' reconcile');
   assert.match(await page.locator('#modal-root .reconcile-modal').innerText(),lang==='en'?/Enough · extra \d+ each → pantry|Enough · extra \d+/:/Đủ · dư \d+ quả/);
   const eggChoice='#modal-root .reconcile-choice[data-rlx="egg"]';await page.locator(`${eggChoice} input[value="meal"]`).check();await noOverflow(page,tag+' meal choice');
   await page.locator(eggChoice).scrollIntoViewIfNeeded();await shot(page,`${tag}-reconcile`);
   assert.deepEqual(errors,[],'no page errors '+tag);await context.close()}
  console.log('screenshots:',shots.length,'→',dir);
  console.log('PASS receipt ↔ shopping list browser (list-first matches, line options, amount once + memory, extra → pantry / meal / not tracked, undo, 320/375/820/1280 VI/EN light/dark)');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
