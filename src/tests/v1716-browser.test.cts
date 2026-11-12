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
// v1.7.19 (owner, “Đổi cả 3 chỗ”, rule 29): a receipt line's unit is picked in the shared unit picker, not a plain list.
const pickLineUnit=async(page:any,line:any,unit:string)=>{await line.locator('.unit-field-btn').click();const chip=page.locator(`#unit-sheet-layer .unit-chip[data-unit-choice="${unit}"]`).first();await page.locator('#unit-sheet-layer .unit-chip').first().waitFor();if(!(await chip.isVisible()))await page.locator('#unit-sheet-layer [data-unit-action="show-all"]').click();await chip.click();await page.locator('#unit-sheet-layer [data-unit-sheet-act="save"]').click();await page.locator('#unit-sheet-layer').waitFor({state:'detached'})};
const origin='https://kitchen.test',out='docs/reviews/v1.7.16';mkdirSync(out,{recursive:true});
const mime:any={'.js':'application/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'};
// the ingredient lines of the page Henry imported (netspace.edu.vn, “Cách nấu phở bò ngon như quán”), as its recipe data writes them
const PHO=['Sợi phở: 700g','Xương ống bò: 0.5kg','Nạm bò: 0.5kg','Bò tái:1,2kg','Quế: 6g','Hoa hồi: 6g','Trần bì: 3g','Đinh hương: 1g','Thảo quả: 3g','Hành tím: 25g','Gừng: 25g','Rễ ngò rí','Hành tây','Húng quế: 50g','Ngò gai: 50g','Ngò rí: 20g','Hành lá: 30g','Giá: 200g','Chanh: 1 quả','Ớt sừng: 1 quả','Muối: 16g','Đường phèn: 15g','Bột nêm: 16g','Tương ớt/Tương đen'];
const sizes:any={mobile:{width:375,height:812},narrow:{width:320,height:740},tablet:{width:820,height:1100},desktop:{width:1280,height:800}};
(async()=>{
 const browser=await chromium.launch(process.env.BEP_CHROMIUM?{executablePath:process.env.BEP_CHROMIUM}:{});
 try{
  for(const [size,lang] of [['mobile','vi'],['narrow','vi'],['tablet','vi'],['desktop','en']] as const){const label=`${size} ${lang}`;
   const context=await browser.newContext({locale:'vi-VN',viewport:sizes[size],serviceWorkers:'block',reducedMotion:'reduce',timezoneId:'Australia/Sydney'});
   await context.addInitScript((lang:string)=>{if(sessionStorage.getItem('qa-init'))return;sessionStorage.setItem('qa-init','1');localStorage.setItem('bep-local-locked','yes');localStorage.setItem('guest/bep-language',lang)},lang);
   const page=await context.newPage(),errors:string[]=[],cancels:any[]=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route(origin+'/**',async(r:any)=>{const u=new URL(r.request().url());
    if(u.pathname==='/.netlify/functions/family'&&u.searchParams.get('op')==='recipe-import')return r.fulfill({json:{recipe:{name:'Cách nấu phở bò ngon như quán',ingredients:PHO,steps:['Chần xương.'],servings:5,time:240,source:'https://netspace.edu.vn/cach-nau-pho-bo-ngon-nhu-quan/'}}});
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
   /* v1.7.19: the unit is the shared picker's button; its words fit without being cut */const unitFits=await line(0).locator('.unit-field-btn').evaluate((b:any)=>({text:b.scrollWidth,room:b.clientWidth,words:b.textContent.trim()}));
   assert.ok(unitFits.text<=unitFits.room+1&&unitFits.words.length>0,`${label}: the unit button's words fit in the unit box ${JSON.stringify(unitFits)}`);
   assert.equal(await line(0).locator('select.receipt-match').isVisible(),false,`${label}: the long dropdown is replaced`);
   const mbox=line(1).locator('.rm-search');assert.ok((await mbox.boundingBox())!.height>=44,`${label}: match box ≥ 44 px`);
   const prawn:string=await E(`Object.keys(INGREDIENTS).find(id=>INGREDIENTS[id][0]==='Tôm')`);assert.ok(prawn,'Tôm exists');
   await mbox.click();await mbox.fill(lang==='en'?'prawn':'tom');const opt=line(1).locator(`.rm-opt[data-rm-value="${prawn}"]`);await opt.waitFor();
   assert.ok((await opt.boundingBox())!.height>=44,`${label}: suggestions ≥ 44 px`);await line(1).locator('.rm-list').scrollIntoViewIfNeeded();await shot('receipt-match-search');
   await opt.click();assert.equal(await line(1).locator('select.receipt-match').inputValue(),prawn,`${label}: typing “tom” finds Tôm (no accents needed)`);
   assert.equal(await mbox.inputValue(),await E(`shopIngName(${JSON.stringify(prawn)})`),`${label}: the box shows the chosen ingredient`);
   // a name the app does not know yet: add it, in the line's unit
   await pickLineUnit(page,line(0),'kg');const b0=line(0).locator('.rm-search');await b0.click();await b0.fill('Chả song');
   const add=line(0).locator('.rm-new');await add.waitFor();assert.match(await add.innerText(),lang==='en'?/Add a new ingredient: “Chả song”/:/Thêm nguyên liệu mới: “Chả song”/,`${label}: offers to add a new ingredient`);
   await add.click();const made:any=await E(`(()=>{const v=document.querySelector('#modal-root .receipt-line[data-index="0"] select.receipt-match').value;return {v,cat:state.ingredientCatalog?.[v]}})()`);
   assert.ok(/^family-ing-/.test(made.v)&&made.cat?.name==='Chả song'&&made.cat.unit==='g',`${label}: “Chả song” added to the family's ingredients in grams ${JSON.stringify(made)}`);
   assert.equal(await E(`(collectReceipt(),receiptDraft.items[0].match)`),made.v,`${label}: the receipt line keeps the match`);
   await b0.click();await b0.fill('cha song');assert.ok(await line(0).locator(`.rm-opt[data-rm-value="${made.v}"]`).count()===1&&await line(0).locator('.rm-new').count()===0,`${label}: next time it is found, not added twice`);
   await page.keyboard.press('Escape');await E('closeModal()');
   // 4. recipe import of “Tên: lượng” lines (owner, 8 Nov 2026: “những chỗ nào có : cũng bị mang vào, nhiều chỗ đọc định lượng không đúng”)
   await E(`(()=>{globalThis.BEP_SESSION={mode:'account',household:{id:'00000000-0000-4000-8000-000000000000',name:'Nhà Phú',role:'owner'}};view='recipes';location.hash='recipes';render()})()`);
   await page.locator('[data-kx="import-open"]').click();await page.fill('#kimp-url','https://netspace.edu.vn/cach-nau-pho-bo-ngon-nhu-quan/');await page.locator('#modal-root [data-kx="import-go"]').click();await page.locator('#family-recipe-form').waitFor();
   const rows:any[]=await page.locator('#family-recipe-form .rc-ing-row').evaluateAll((a:any[])=>a.map(li=>({name:li.querySelector('.rc-ing-name-input').value,qty:li.querySelector('.rc-ing-qty').value,unit:li.querySelector('.rc-ing-unit').value})));
   assert.equal(rows.length,PHO.length,`${label}: every line of the page is kept (${rows.length})`);
   assert.deepEqual(rows.filter(x=>/[:：]/.test(x.name)).map(x=>x.name),[],`${label}: no “:” left in a name`);
   const row=(n:string)=>rows.find(x=>x.name===n);
   for(const [n,q,u] of [['Xương ống bò','0.5','kg'],['Nạm bò','0.5','kg'],['Bò tái','1,2','kg'],['Hoa hồi','6','g'],['Ớt sừng','1','quả'],['Đường phèn','15','g']] as const){const x=row(n);const ok=!!x&&(x.qty===q||+String(x.qty).replace(',','.')===+q.replace(',','.')*(x.unit==='g'&&u==='kg'?1000:1))&&(x.unit===u||(u==='kg'&&x.unit==='g'));assert.ok(ok,`${label}: “${n}” reads ${q} ${u} (got ${JSON.stringify(x)})`)}
   const got:any=await E(`state.recipes[0].ingredients.map(i=>i.id)`);assert.ok(!got.includes('onion')&&!got.includes('herbs')&&got.includes('ginger')&&got.includes('salt'),`${label}: only lines naming an ingredient become ingredients — Hành tím is not Hành tây, Húng quế / Ngò rí are not added up as Rau thơm ${JSON.stringify(got)}`);
   for(const [n,q] of [['Hành tím','25'],['Húng quế','50'],['Ngò rí','20']] as const)assert.ok(row(n)?.qty===q,`${label}: “${n}” kept as its own line with ${q} g (${JSON.stringify(row(n))})`);
   for(const n of ['Rễ ngò rí','Hành tây','Tương ớt/Tương đen'])assert.ok(row(n)&&!row(n).qty,`${label}: “${n}” has no amount on the page, none is invented`);
   await page.locator('#family-recipe-form .rc-ing-row').nth(3).scrollIntoViewIfNeeded();await shot('import-name-colon');await E('closeModal()');
   // 5. the bottom bar slides sideways on phones (owner, 8 Nov 2026: “Phần bar ở dưới này nên làm chế độ trượt qua lại được như thế sẽ
   //    nhanh hơn là phải vào ‘thêm’”)
   if(size==='mobile'||size==='narrow'){await E(`(()=>{view='today';location.hash='today';render();scrollTo(0,0)})()`);await page.waitForTimeout(200);
    const items:any[]=await E(`[...document.querySelectorAll('#nav > *')].map(a=>({href:a.getAttribute('href'),shown:getComputedStyle(a).display!=='none',w:a.getBoundingClientRect().width,h:a.getBoundingClientRect().height,art:!!a.querySelector('.nav-icon svg:not(.emo-art)'),short:a.querySelector('.nav-short')?.textContent||a.innerText.trim(),label:a.getAttribute('aria-label')||a.innerText.trim()}))`);
    assert.deepEqual(items.map(x=>x.href),['#today','#planner','#shopping','#recipes','#pantry','#expenses','#insights','#products',null],`${label}: every section is in the bar, “Thêm” last`);
    assert.ok(items.every(x=>x.shown&&x.art&&x.h>=44&&x.w>=44),`${label}: each one shown with a line drawing, ≥ 44 px ${JSON.stringify(items)}`);
    assert.deepEqual(items.slice(3,8).map(x=>x.short),lang==='en'?['Recipes','Pantry','Spending','Habits','Prices']:['Món ăn','Tủ','Chi tiêu','Thói quen','Giá'],`${label}: short names that fit`);
    assert.equal(items[4].label,lang==='en'?'Pantry':'Tủ thực phẩm',`${label}: the full name stays for screen readers`);
    const bar:any=await E(`(()=>{const n=document.getElementById('nav');return {sw:n.scrollWidth,cw:n.clientWidth,ov:getComputedStyle(n).overflowX,fade:n.classList.contains('nav-more-right')}})()`);
    assert.ok(bar.sw>bar.cw+40&&bar.ov==='auto'&&bar.fade,`${label}: the bar slides sideways and shows there is more ${JSON.stringify(bar)}`);
    await shot('nav-slide-start');
    await E(`document.getElementById('nav').scrollLeft=1000`);await page.waitForTimeout(150);await shot('nav-slide-end');
    const y0=await E('scrollY');await page.locator('#nav a[href="#pantry"]').click();await page.waitForTimeout(400);
    const after:any=await E(`(()=>{const n=document.getElementById('nav'),a=n.querySelector('a.active'),r=a.getBoundingClientRect(),b=n.getBoundingClientRect();return {view,active:a.getAttribute('href'),inView:r.left>=b.left-1&&r.right<=b.right+1,left:n.scrollLeft}})()`);
    assert.ok(after.view==='pantry'&&after.active==='#pantry'&&after.inView&&after.left>0,`${label}: one tap opens Tủ; the bar keeps its place with Tủ in view ${JSON.stringify(after)}`);
    await page.locator('#nav a[href="#expenses"]').click();await page.waitForTimeout(400);assert.equal(await E('view'),'expenses',`${label}: Chi tiêu in one tap`);
    assert.ok(await E(`document.querySelector('#nav a.active').getBoundingClientRect().right<=document.getElementById('nav').getBoundingClientRect().right+1`),`${label}: still in view after the redraw`);
    void y0}
   else{const shown=await E(`[...document.querySelectorAll('#nav a')].filter(a=>getComputedStyle(a).display!=='none').length`);assert.ok(shown>=8,`${label}: the sidebar lists every section as before (${shown})`)}
   // 6. “Tự chạy thử” in the ladybug (owner, 8 Nov 2026: the app plays the scenarios like a user, picks the failures itself, and
   //    a list to watch each one run; pop-ups: a temporary sample family, family owners only, failures sent automatically)
   if(size==='mobile'||size==='desktop'){
    await E(`(()=>{closeModal();globalThis.BEP_SESSION=null;view='today';location.hash='today';render()})()`);await E('bepAutoplay.open()');assert.equal(await page.locator('#ap-panel').count(),0,`${label}: not offered without a family owner account`);
    await E(`(()=>{globalThis.BEP_SESSION={mode:'account',household:{id:'00000000-0000-4000-8000-000000000000',name:'Nhà Phú',role:'owner'},account:{username:'henry'}};state.recipes.push({...clone(state.recipes[0]),id:'fam-own-1',name:'Món riêng của nhà',custom:true});save();render()})()`);
    const snap=`JSON.stringify(Object.fromEntries(Object.keys(localStorage).filter(k=>!/^bep-(usage-|ladybug|feedback|autoplay)/.test(k)).sort().map(k=>[k,localStorage.getItem(k)])))`;
    const realBefore=await E('JSON.stringify(state)'),lsBefore=await E(snap);const calls:string[]=[];const onReq=(r:any)=>{if(r.url().includes('/.netlify/'))calls.push(r.method()+' '+r.url())};page.on('request',onReq);
    await E('bepAutoplay.open()');const panel=page.locator('#ap-panel .ap-sheet');await panel.waitFor();
    assert.ok(await page.locator('#ap-panel [data-ap="all"]').evaluate((b:any)=>!!b.querySelector('svg.btn-art')&&b.getBoundingClientRect().height>=44),`${label}: “Chạy tất cả” drawn, ≥ 44 px`);
    assert.ok(await page.locator('#ap-panel .ap-x svg').count()===1,`${label}: the X is a drawing`);
    const watch=await page.locator('#ap-panel [data-ap="watch"]').evaluateAll((a:any[])=>a.map(b=>({h:b.getBoundingClientRect().height,art:!!b.querySelector('svg')})));assert.ok(watch.length>=10&&watch.every(x=>x.h>=44&&!x.art),`${label}: a “Xem” per scenario, ≥ 44 px, words only`);
    await shot('autoplay-list');
    // run everything quickly
    await page.locator('#ap-panel [data-ap="all"]').click();await page.locator('#ap-bar').waitFor();await page.waitForFunction(()=>!(globalThis as any).bepAutoplay.running(),null,{timeout:240000});page.off('request',onReq);
    const res:any=await E('bepAutoplay.results()');const bad=Object.entries(res).filter(([,v]:any)=>!v.ok);assert.deepEqual(bad,[],`${label}: every scenario passes ${JSON.stringify(bad)}`);assert.ok(Object.keys(res).length>=12,`${label}: ${Object.keys(res).length} scenarios`);
    assert.equal(await E('JSON.stringify(state)'),realBefore,`${label}: the family's own data is untouched (its own recipe still there, nothing added)`);
    assert.equal(await E(snap),lsBefore,`${label}: everything stored on the device is back as it was`);
    assert.deepEqual(calls.filter(c=>!/feedback\?op=(access|status)/.test(c)),[],`${label}: nothing sent to the server while testing`);
    await page.locator('#ap-panel .ap-sum').waitFor();assert.match(await page.locator('#ap-panel .ap-sum').innerText(),lang==='en'?/(\d+) of \1 passed/:/Đạt (\d+)\/\1 kịch bản/,`${label}: the list shows the result`);await shot('autoplay-results');
    // watch one: a bar at the top and a ring around each tap
    await page.locator('#ap-panel [data-ap="watch"][data-id="shop"]').click();await page.locator('#ap-bar').waitFor();await page.locator('#ap-ring:not([hidden])').waitFor({timeout:15000});await shot('autoplay-watch');
    await page.waitForFunction(()=>!(globalThis as any).bepAutoplay.running(),null,{timeout:120000});
    // a failure is picked up and sent by itself
    const n0=await E('bepLadybug.outbox().length');await E(`(()=>{window.__og=openGuide;openGuide=()=>{}})()`);await E(`bepAutoplay.run(['guide'])`);await page.waitForFunction(()=>!(globalThis as any).bepAutoplay.running(),null,{timeout:60000});await E(`openGuide=window.__og`);
    assert.equal((await E('bepAutoplay.results()')).guide.ok,false,`${label}: a broken step is caught`);
    const out:any[]=await E('bepLadybug.outbox()');assert.ok(out.length===n0+1&&/Tự chạy thử|Self-test/.test(out[out.length-1].body.note)&&out[out.length-1].body.ctx.selfTest===true,`${label}: and sent to Feedback without a tap ${JSON.stringify(out.slice(-1).map(x=>x.body.note))}`);
    // owner, 8 Nov 2026: “Làm cho tôi luôn lựa chọn dùng trên dữ liệu thật nữa nhé” — the same scenarios on a copy of the family's
    // own data: never saved, synced or sent; afterwards the family's data and the device are exactly as before
    await E('bepAutoplay.open()');await page.locator('#ap-panel [data-ap="mode"][data-mode="real"]').click();
    assert.equal(await page.locator('#ap-panel [data-ap="mode"][data-mode="real"]').getAttribute('aria-checked'),'true',`${label}: “Dữ liệu của nhà (bản sao)” chosen`);
    assert.match(await page.locator('#ap-panel .ap-mode-note').innerText(),lang==='en'?/never saved, synced or sent/:/không được lưu, không đồng bộ, không gửi đi/,`${label}: the list says it is a copy that is dropped`);
    assert.ok(await page.locator('#ap-panel .ap-mode .chip').evaluateAll((a:any[])=>a.every(b=>b.getBoundingClientRect().height>=44&&!b.querySelector('svg'))),`${label}: the two choices are chips, words only, ≥ 44 px`);await shot('autoplay-real-choice');
    const real0=await E('JSON.stringify(state)'),ls0=await E(snap);const calls2:string[]=[];const onReq2=(r:any)=>{if(r.url().includes('/.netlify/'))calls2.push(r.method()+' '+r.url())};page.on('request',onReq2);
    await page.locator('#ap-panel [data-ap="all"]').click();await page.locator('#ap-bar').waitFor();await page.waitForFunction(()=>!(globalThis as any).bepAutoplay.running(),null,{timeout:240000});page.off('request',onReq2);
    const res2:any=await E('bepAutoplay.results()');const bad2=Object.entries(res2).filter(([,v]:any)=>!v.ok);assert.deepEqual(bad2,[],`${label}: every scenario passes or is skipped on the family's copy ${JSON.stringify(bad2)}`);
    assert.equal(await E('JSON.stringify(state)'),real0,`${label}: the family's own data is exactly as before`);assert.equal(await E(snap),ls0,`${label}: and so is everything on the device`);
    assert.deepEqual(calls2.filter(c=>!/feedback\?op=(access|status)/.test(c)),[],`${label}: nothing sent while testing on the copy`);
    assert.equal(await E('bepAutoplay.mode()'),'real',`${label}: the choice is remembered`);await shot('autoplay-real-results');
    await page.locator('#ap-panel [data-ap="mode"][data-mode="sample"]').click();
    await E(`(()=>{document.getElementById('ap-panel')?.remove();state.recipes=state.recipes.filter(r=>r.id!=='fam-own-1');save();render()})()`)}
   const ow=await E('document.documentElement.scrollWidth-innerWidth');assert.ok(ow<=1,`${label}: overflow ${ow}`);assert.deepEqual(errors,[],`${label}: page errors`);await context.close();console.log('✓',label)}
  console.log('PASS v1.7.16: removing an invited guest takes it off every meal of the invitation and withdraws the link (“Đóng” keeps it); a bigger “Bắt đầu đi chợ” with a running colour ring, still under reduced motion; receipt unit fits and the match box finds or adds an ingredient; “Tên: lượng” recipe lines read without the colon; the bottom bar slides sideways with every section; “Tự chạy thử” plays every scenario on a sample family, leaves the family’s data untouched and sends failures by itself — 375 / 320 / 820 / 1280, VI and EN');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
