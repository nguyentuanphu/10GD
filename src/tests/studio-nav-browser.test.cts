// Studio v1.7.2 navigation in Chromium against the REAL Studio / Price Check / usage / voice / feedback /
// community-recipe handlers (in-memory stores, synthetic data only):
//  - 6 menu groups with every page, collapsible (remembered), current page highlighted, attention badges;
//  - page scripts are not requested until their page opens (or its link is hovered / focused);
//  - old hashes redirect (#messages → #urgent/daily) and the two urgent pages are one page with tabs;
//  - Ctrl+K page finder; phone/tablet menu sheet (open, Escape, link closes it); reduced motion;
//  - Platform settings: the "Price Check is off" note follows the checkbox live (v1.7.1 bug: it always showed);
//  - Price Check device cards: Auto readiness with the audited "Allow auto" fix, the reason each disabled action is
//    off, extension version vs latest with "Update needed";
//  - 320×740, 375×812, 820×1100, 1280×800 in VI light and EN dark: no horizontal overflow, ≥44 px targets;
//    screenshots in docs/reviews/v1.7.2/studio-nav/ (browser viewport simulation, not physical devices);
//  - timing on a simulated network (docs/reviews/v1.7.2/studio-nav/perf-after.json): page switch with saved data
//    < 300 ms, first Studio content < 1 s on the "typical" profile. Simulation only.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {chromium} from 'playwright';
const out='docs/reviews/v1.7.2/studio-nav';mkdirSync(out,{recursive:true});
const sizes:any={narrow:{width:320,height:740},mobile:{width:375,height:812},tablet:{width:820,height:1100},desktop:{width:1280,height:800}};
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const {studioWorld,openStudio,ready,measure}=await import('./helpers/studio-nav-harness.mjs');
 const {listLog,dayKey}=await import('../netlify/lib/studio.mjs');
 // v1.7.2 integration: the latest extension version has ONE source — EXTENSION_VERSION in scout-version.mts (the build
 // checks it against extension/manifest.json); the server sends it on every device row as latestVersion/outdated.
 const {EXTENSION_VERSION}=await import('../netlify/lib/scout-version.mjs');const LATEST=EXTENSION_VERSION.replace(/\./g,'\\.');
 const world=await studioWorld();const browser=await chromium.launch();
 const scripts=(log:any[])=>log.filter(x=>x.kind==='static'&&/\.js$/.test(x.path)).map(x=>x.path);
 const hashIs=async(page:any,h:string)=>{await page.waitForFunction((h:string)=>location.hash===h,h);await sleep(80)};// hashchange runs after the hash updates
 const noOverflow=async(page:any,what:string)=>{const o=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);if(o>1)console.log(await page.evaluate(()=>[...document.querySelectorAll('body *')].filter((e:any)=>e.getBoundingClientRect().right>innerWidth+1).slice(0,6).map((e:any)=>e.tagName+'.'+e.className+' '+Math.round(e.getBoundingClientRect().right))));assert.ok(o<=1,`horizontal overflow ${o}px: ${what}`)};
 const smallTargets=(page:any,sel:string)=>page.evaluate((sel:string)=>[...document.querySelectorAll(sel)].filter((e:any)=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width&&r.height&&s.visibility!=='hidden'&&r.height<44&&e.type!=='checkbox'&&e.type!=='radio'}).map((e:any)=>e.outerHTML.slice(0,80)),sel);
 // Chromium occasionally refuses one capture right after a new context opens; one retry, then fail.
 let shots=0;const shot=async(page:any,name:string)=>{await sleep(120);try{await page.screenshot({path:`${out}/${name}.png`})}catch{await sleep(500);await page.screenshot({path:`${out}/${name}.png`})}shots++};

 // 1. Desktop: groups, lazy modules, badges, collapse, hover prefetch, old hashes, merged urgent page, Ctrl+K.
 {const {context,page,log,errors}=await openStudio(browser,world,{hash:'#overview',profile:'typical'});await ready(page);await sleep(3500);
  // v1.7.5: the release number sits under the Studio name and in the side panel (from /build.json)
  {const v=JSON.parse(readFileSync('package.json','utf8')).version;await page.waitForFunction((v:string)=>document.querySelector('#studio-ver')?.textContent===' · v'+v,v,{timeout:5000});assert.match(await page.locator('#studio-version').textContent(),new RegExp('FamTray · (Phiên bản|Version) '+v.replace(/\./g,'\\.')))}
  const groups=await page.$$eval('#nav .ngroup',(gs:any[])=>gs.map(g=>[g.dataset.group,[...g.querySelectorAll('a[data-nav]')].map((a:any)=>a.dataset.nav)]));
  assert.deepEqual(groups,[['home',['overview','urgent','notifications','health']],['people',['accounts','families','invites']],['content',['community','recipes','feedback','receipts']],['price',['scout','onlinePrices','scanlist','unplaced','catalog']],['stats',['usage','voice']],['release',['settings','roles','broadcast','rollout','logs']]],'6 groups, every page once (v1.7.5: Quyền Studio under Settings & release)');
  assert.equal(await page.locator('#nav a[href="#messages"]').count(),0,'old daily urgent page is not a separate menu item');
  assert.equal(await page.locator('#nav a[aria-current="page"]').getAttribute('href'),'#overview');
  /* v1.7.11: the tiny light/dark script that used to be inline in studio.html is now studio-theme.ts (TypeScript only) */assert.deepEqual(scripts(log),['/studio-theme.js','/studio.js'],'only the theme script and studio.js before any page module opens: '+scripts(log).join(' '));
  // Badges (counts only): 20 failed urgent messages, 20 community items in moderation, 3 new feedback reports.
  const badge=(k:string)=>page.locator(`#nav [data-badge="${k}"]`).evaluate((b:any)=>b.hidden?'':b.firstChild?.textContent||'');
  assert.equal(await badge('urgent'),'20');assert.equal(await badge('community'),'20');assert.equal(await badge('feedback'),'3');assert.equal(await badge('recipes'),'');
  assert.ok(log.some(x=>x.op==='nav-badges'),'badges loaded after first paint');
  assert.match(await page.locator('#nav [data-badge="feedback"]').textContent(),/góp ý mới/,'badge has a spoken label');
  // Collapse "Content & community": the group shows the sum; remembered after reload.
  await page.locator('[data-group-toggle="content"]').click();assert.equal(await page.locator('#ng-content').isHidden(),true);
  assert.equal(await page.locator('[data-gbadge="content"]').evaluate((b:any)=>getComputedStyle(b).display!=='none'&&b.firstChild?.textContent),'23');
  await shot(page,'nav-collapsed-vi-light-desktop-1280x800');
  await page.reload();await ready(page);assert.equal(await page.locator('[data-group-toggle="content"]').getAttribute('aria-expanded'),'false','collapsed group remembered');
  await page.locator('[data-group-toggle="content"]').click();assert.equal(await page.locator('#ng-content').isVisible(),true);
  // Hovering a link downloads that page's script before the click; other page scripts stay unrequested.
  log.length=0;await page.locator('#nav a[href="#usage"]').hover();await page.waitForFunction(()=>!!document.querySelector('script[src="studio-usage.js"]'));await sleep(300);
  assert.ok(scripts(log).includes('/studio-usage.js'),'hover prefetch');assert.ok(!scripts(log).includes('/studio-voice.js'));
  await page.locator('#nav a[href="#usage"]').click();await hashIs(page,'#usage');await ready(page);assert.equal(await page.locator('#main #usage-main').count(),1);
  assert.equal(await page.locator('#nav a[href="#usage"]').getAttribute('aria-current'),'page');
  assert.equal(log.filter(x=>x.path==='/studio-usage.js').length,1,'script downloaded once');
  // Old hashes keep working.
  log.length=0;await page.evaluate(()=>{location.hash='#messages'});await hashIs(page,'#urgent/daily');await ready(page);
  assert.equal(await page.locator('.subtabs a[aria-current="page"]').getAttribute('href'),'#urgent/daily');assert.match(await page.locator('#main h1').innerText(),/Tin nhắn khẩn/);
  assert.ok(!scripts(log).includes('/studio-urgent.js'),'daily tab needs no extra script');
  assert.equal(await page.locator('#nav a[href="#urgent"]').getAttribute('aria-current'),'page','merged page highlighted');
  await page.locator('.subtabs a[href="#urgent"]').click();await hashIs(page,'#urgent');await ready(page);await page.waitForSelector('#urgent-main .ur-list, #urgent-main .empty');
  assert.ok(scripts(log).includes('/studio-urgent.js'));assert.equal(await page.locator('.subtabs [data-badge="urgent"]').evaluate((b:any)=>b.hidden),false);
  await shot(page,'urgent-merged-vi-light-desktop-1280x800');
  for(const [from,to] of [['#urgentReasons','#urgent'],['#no-such-page','#overview']]){await page.evaluate((h:string)=>{location.hash=h},from);await hashIs(page,to);await ready(page)}
  assert.equal(await page.locator('article.tile-urgent .tile-more a').getAttribute('href'),'#urgent','Overview tile opens the merged page');
  // Ctrl+K page finder (accents optional).
  await page.keyboard.press('Control+k');await page.locator('#jump[open] #jump-q').waitFor();await page.keyboard.type('gop y');
  assert.equal(await page.locator('#jump-list a').first().getAttribute('href'),'#feedback');await shot(page,'jump-vi-light-desktop-1280x800');
  await page.keyboard.press('Enter');await hashIs(page,'#feedback');await ready(page);assert.equal(await page.locator('#jump').evaluate((d:any)=>d.open),false);
  // Saved copies for page scripts too: an older copy shows at once, labelled, then refreshes in the background.
  await page.evaluate(()=>{location.hash='#scout'});await ready(page);await page.waitForSelector('#sc-rc');
  await page.evaluate(()=>{location.hash='#overview'});await ready(page);
  await page.evaluate(()=>{for(const k of Object.keys(sessionStorage))if(k.startsWith('studio-view:')){const v=JSON.parse(sessionStorage.getItem(k)!);v.at-=120000;sessionStorage.setItem(k,JSON.stringify(v))}});
  // Record every freshness label shown (the background refresh can finish quickly).
  await page.evaluate(()=>{(window as any).__fresh=[];new MutationObserver(()=>{const f=document.querySelector('#main .fresh-label');if(f)(window as any).__fresh.push(f.textContent)}).observe(document.querySelector('#main')!,{childList:true,subtree:true,characterData:true})});
  log.length=0;const t=Date.now();await page.evaluate(()=>{location.hash='#scout'});await page.waitForSelector('#main #sc-rc');const ms=Date.now()-t;
  assert.ok(ms<300,'saved Price Check page shown in '+ms+' ms');await page.waitForFunction(()=>(window as any).__fresh.length>0);assert.match((await page.evaluate(()=>(window as any).__fresh)).join(' | '),/Bản đã lưu[^|]*đang làm mới/);
  await page.waitForFunction(()=>/Cập nhật/.test(document.querySelector('#main .fresh')?.textContent||''),null,{timeout:10000});
  assert.ok(log.some(x=>x.fn==='scout'&&x.op==='studio-overview'),'background refresh of the module request');
  assert.ok(!log.some(x=>x.fn==='studio'&&x.op==='me'),'page scripts reuse Studio’s account check');
  assert.deepEqual(errors,[]);await context.close()}

 // 2. Platform settings: the "Price Check is off" note follows the checkbox; both setting cards load with the page.
 {const {context,page,log,errors}=await openStudio(browser,world,{hash:'#settings'});await ready(page);await page.waitForSelector('#studio-update-card');await page.waitForSelector('#scout-auto-setting #scout-auto-form');
  const box=page.locator('#sf input[name="flag-priceScout"]'),note=page.locator('#sf .scout-states-off');
  assert.equal(await box.isChecked(),true,'Price Check stored on');assert.equal(await note.isVisible(),false,'no "is off" note while it is on');
  assert.equal(await page.locator('#sf .scout-states').evaluate((f:any)=>f.disabled||f.classList.contains('is-off')),false,'states not greyed while on');
  await box.uncheck();assert.equal(await note.isVisible(),true,'note shows when switched off');assert.equal(await page.locator('#sf .scout-states').evaluate((f:any)=>f.disabled),true);
  await box.check();assert.equal(await note.isVisible(),false,'note hides again');assert.equal(await page.locator('#sf input[name="state-NSW"]').isEnabled(),true);
  assert.equal(log.filter(x=>x.fn==='studio'&&x.op==='settings').length,1,'settings fetched once (the App updates card reuses it)');
  assert.deepEqual(errors,[]);await context.close()}

 // 3. Price Check device cards: readiness, the audited "Allow auto" fix, reasons for disabled actions, version.
 {const {context,page,errors}=await openStudio(browser,world,{hash:'#scout'});await ready(page);await page.waitForSelector('#sc-rc');
  const card=(id:string)=>page.locator(`article.rc-dev:has([data-id="${id}"])`),run=(id:string)=>page.locator(`[data-cmd="run-now"][data-id="${id}"]`);
  await page.waitForFunction((v:string)=>new RegExp('v'+v).test(document.querySelector('[aria-labelledby="sc-rc"]')?.textContent||''),LATEST,{timeout:5000});
  const old=await card(world.ids.old).innerText();
  assert.match(old,/Tự động cho máy này:\s*Chưa cho phép/);assert.match(old,/Cần cho phép tự động cho máy này/);assert.match(old,new RegExp('tiện ích cũ v1\\.6\\.0 — cần cập nhật \\(mới nhất v'+LATEST+'\\)'));assert.match(old,/Cần cập nhật/);
  assert.equal(await run(world.ids.old).isDisabled(),true);assert.equal(await run(world.ids.old).getAttribute('aria-describedby'),'why-'+world.ids.old);
  const ok=await card(world.ids.ok).innerText();assert.match(ok,/Đã cho phép/);assert.match(ok,/Sẵn sàng chạy ngay/);assert.match(ok,/Mới nhất/);assert.equal(await run(world.ids.ok).isEnabled(),true);
  await page.evaluate(()=>{const el=document.querySelector('#sc-rc');if(el)scrollTo(0,el.getBoundingClientRect().top+scrollY-10)});await shot(page,'scout-readiness-vi-light-desktop-1280x800');
  await card(world.ids.old).locator('[data-allow-auto]').click();await page.waitForFunction(()=>/Đã cho phép tự động/.test(document.querySelector('#toast')?.textContent||''));
  await page.waitForFunction((id:string)=>!(document.querySelector(`[data-cmd="run-now"][data-id="${id}"]`) as any)?.disabled,world.ids.old);
  assert.match(await card(world.ids.old).innerText(),/Đã cho phép/);
  const acts=(await listLog(world.getStoreFn,'audit',{now:Date.now(),limit:200,from:dayKey(Date.now()-86400000)})).items.map((x:any)=>x.action);assert.ok(acts.includes('scout_device_allow_auto'),'allow auto audited');
  await page.locator('#sc-pause').click();await page.locator('#sc-pause[aria-pressed="true"]').waitFor();
  assert.equal(await run(world.ids.ok).isDisabled(),true);assert.match(await card(world.ids.ok).innerText(),/Cả mạng đang tạm dừng/);
  await page.locator('#sc-pause').click();await page.locator('#sc-pause[aria-pressed="false"]').waitFor();assert.equal(await run(world.ids.ok).isEnabled(),true);
  assert.equal(await page.locator('#sc-access').evaluate((d:any)=>d.open),false,'Access & pairing collapsed');
  await world.lib.editDevice(world.getStoreFn,world.ids.old,(x:any)=>({...x,autoAllowed:false}));
  // Same computer paired again (extension removed and installed): the older card says so and offers merge / revoke;
  // owner rename; pairing date + short id tell the cards apart.
  {const {code}=await world.lib.createPairCode(world.getStoreFn,'henrynguyen',Date.now(),world.env);
   const r=await world.handlers.scout(new Request('https://kitchen.test/.netlify/functions/scout?op=pair',{method:'POST',headers:{Origin:'chrome-extension://mjeoekikdicoojgoppnfibjbfpcfngja','Content-Type':'application/json'},body:JSON.stringify({code,name:'Máy bàn mới',version:'9.9.9'})}));const p=await r.json();
   assert.deepEqual(p.replaceCandidates.map((c:any)=>c.id),[world.ids.ok],'pairing answer offers the earlier pairing');
   await page.reload();await ready(page);await page.waitForSelector('#sc-rc');
   const dup=card(world.ids.ok).locator('.rc-dup');await dup.waitFor();assert.match(await dup.innerText(),/Trùng tên với một máy ghép sau/);assert.match(await dup.innerText(),new RegExp('#'+p.device.id.slice(4,10)));
   assert.match((await card(world.ids.ok).locator('.rc-id').textContent()).replace(/\s+/g,' '),/Ghép ngày .* · #[a-f0-9]{6}/);
   await page.evaluate((id:string)=>document.querySelector(`[data-merge="${id}"]`)?.scrollIntoView({block:'center'}),world.ids.ok);await shot(page,'scout-duplicate-vi-light-desktop-1280x800');
   // The new pairing has no stores yet: Run now is off and the card says why and how to fix it.
   assert.match(await card(p.device.id).innerText(),/Chưa có cửa hàng nào — máy sẽ không có việc để chạy/);assert.equal(await run(p.device.id).isDisabled(),true);
   assert.match(await card(world.ids.ok).locator('.rc-stores').innerText(),/Woolworths: Hurstville/);
   await card(world.ids.ok).locator('[data-merge]').click();await page.waitForFunction(()=>/Đã gộp vào máy mới/.test(document.querySelector('#toast')?.textContent||''));
   await page.waitForFunction((id:string)=>!document.querySelector(`[data-cmd][data-id="${id}"]`),world.ids.ok);
   const nc=card(p.device.id);assert.match(await nc.innerText(),/Đã cho phép/,'auto permission carried over');assert.match(await nc.innerText(),/thay cho 1 lần ghép trước/);assert.match(await nc.locator('.rc-stores').innerText(),/Woolworths: Hurstville/,'stores carried over');assert.equal(await run(p.device.id).isEnabled(),true,'ready after the merge');
   await nc.locator('[data-rename]').click();await page.waitForFunction(()=>/Đã đổi tên/.test(document.querySelector('#toast')?.textContent||''));await page.waitForFunction((id:string)=>/^QA/.test(document.querySelector(`#rc-${id}`)?.textContent||''),p.device.id);
   const acts=(await listLog(world.getStoreFn,'audit',{now:Date.now(),limit:300,from:dayKey(Date.now()-86400000)})).items.map((x:any)=>x.action);assert.ok(acts.includes('scout_device_replaced')&&acts.includes('scout_device_update'),'merge + rename audited')}
  assert.deepEqual(errors,[]);await context.close()}

 // 3b. Unplaced Price Check prices: batch review against the documented shape (stand-in server until merged).
 {const now=new Date().toISOString();world.unplaced={posts:[],items:[
   {factId:'f1',name:'Woolworths Fish Sauce 500ml',retailer:'woolworths',storeLabel:'Hurstville',price:4.5,unitPrice:0.9,unitBasis:'per_100ml',capturedAt:now,suggestions:[{itemId:'nuoc-mam',name:'Nước mắm',confidence:0.92}]},
   {factId:'f2',name:'Coles Water Spinach Bunch',retailer:'coles',storeLabel:'Kogarah',price:2.9,capturedAt:now,suggestions:[{itemId:'rau-thom',name:'Rau thơm các loại',confidence:0.41}]},
   {factId:'f3',name:'ALDI Jasmine Rice 5kg',retailer:'aldi',storeLabel:'Hurstville',price:11,capturedAt:now,suggestions:[{itemId:'gao',name:'Gạo',confidence:0.7}]},
   {factId:'f4',name:'Mystery item',retailer:'coles',storeLabel:'Kogarah',price:1,capturedAt:now,suggestions:[]}]};
  const {context,page,errors,log}=await openStudio(browser,world,{hash:'#overview'});await ready(page);
  assert.ok(!scripts(log).includes('/studio-unplaced.js'),'not loaded before it opens');
  await page.locator('#nav a[href="#unplaced"]').click();await hashIs(page,'#unplaced');await ready(page);await page.waitForSelector('#unplaced-main .up-item');
  assert.equal(await page.locator('#unplaced-main .up-item').count(),4);assert.equal(await page.locator('#nav [data-badge="unplaced"]').evaluate((b:any)=>b.hidden?'':b.firstChild?.textContent),'4','badge follows the list');
  const t=await page.locator('#unplaced-main').innerText();assert.match(t,/Woolworths · Hurstville/);assert.match(t,/\$4\.50/);assert.match(t,/\$0\.90 \/100ml/);assert.match(t,/Nước mắm/);assert.match(t,/92%/);assert.match(t,/Chưa có gợi ý/);
  assert.equal(await page.locator('[data-attach="f4"]').isDisabled(),true,'no suggestion: choose another item first');
  await shot(page,'unplaced-vi-light-desktop-1280x800');
  await page.locator('[data-attach="f1"]').click();await page.waitForFunction(()=>!document.querySelector('[data-fact="f1"]'));
  assert.deepEqual(world.unplaced.posts.at(-1),{op:'studio-unplaced-resolve',body:{keys:['f1'],itemId:'nuoc-mam'}});
  await page.locator('[data-other="f2"]').click();await page.locator('#ask[open] input[name=item]').fill('Rau muống');await page.locator('#ask button[value=ok]').click();
  await page.waitForFunction(()=>/bạn chọn/.test(document.querySelector('[data-fact="f2"]')?.textContent||''));
  await page.locator('#up-all').check();assert.match(await page.locator('#up-count').innerText(),/Đã chọn 2/,'f2 + f3 (f4 has no item)');await page.locator('#up-confirm').click();
  await page.waitForFunction(()=>document.querySelectorAll('#unplaced-main .up-item').length===1);
  assert.deepEqual(world.unplaced.posts.slice(-2),[{op:'studio-unplaced-resolve',body:{keys:['f2'],itemId:'rau-muong'}},{op:'studio-unplaced-resolve',body:{keys:['f3'],itemId:'gao'}}],'bulk confirm with the chosen item (one request per item)');
  await page.locator('[data-skip="f4"]').click();await page.waitForFunction(()=>!!document.querySelector('#unplaced-main .empty'));
  assert.deepEqual(world.unplaced.posts.at(-1),{op:'studio-unplaced-resolve',body:{keys:['f4'],action:'reject'}});assert.equal(await page.locator('#nav [data-badge="unplaced"]').evaluate((b:any)=>b.hidden),true);
  await page.setViewportSize(sizes.mobile);await noOverflow(page,'unplaced mobile');
  assert.deepEqual(errors,[]);await context.close();delete world.unplaced}

 // 3b-real (v1.7.2 integration). The same page against the REAL Price Check ops — scout handler with the default adapter on
 // the shared in-memory stores: a paired computer captures two prices the matcher cannot place (a tie, and no match),
 // studio-unplaced lists them, the page shows suggestion NAMES from the catalogue (not ids, no “NaN%”), Attach and Skip
 // resolve them on the server, and both are in the Studio audit log. Synthetic products and prices only.
 {const {createScoutHandler}=await import('../netlify/functions/scout.mjs');const stub=world.handlers.scout;world.handlers.scout=createScoutHandler({getStoreFn:world.getStoreFn,env:world.env});
  try{const A='https://kitchen.test/.netlify/functions/scout?op=',EXT='chrome-extension://mjeoekikdicoojgoppnfibjbfpcfngja';
   const send=async(op:string,token:string,body:any)=>(await world.handlers.scout(new Request(A+op,{method:'POST',headers:{Origin:EXT,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)}))).json();
   const list=async()=>(await (await world.handlers.scout(new Request(A+'studio-unplaced',{headers:{Cookie:world.cookie}}))).json()).items;
   const {code}=await world.lib.createPairCode(world.getStoreFn,'henrynguyen',Date.now(),world.env);
   const p=await send('pair','',{code,name:'QA giá chưa gắn',suburb:'Hurstville',postcode:'2220',stores:{woolworths:'Hurstville'},version:EXTENSION_VERSION});
   const pg=(id:string,name:string,price:number)=>{const url='https://www.woolworths.com.au/shop/productdetails/'+id+'/synthetic';return{retailer:'woolworths',url,status:'ok',storeLabel:'Hurstville',facts:[{name,price,productId:id,productUrl:url}]}};
   const r=await send('results',p.token,{mode:'semi',items:[pg('660001','Synthetic Pork and Beef Mince 500g',7.5),pg('660002','Synthetic Smoked Salmon Slices 100g',6.5)]});
   assert.deepEqual(r.placement?.unplaced,{'no-item':2},'both stay unplaced: '+JSON.stringify(r.placement));
   const before=await list(),mince=before.find((x:any)=>x.productId==='660001'),salmon=before.find((x:any)=>x.productId==='660002');
   assert.ok(mince&&salmon,'listed by the real op');assert.deepEqual(mince.suggested,['thit-bo-xay','thit-heo-xay']);assert.equal(mince.confidence,'low');assert.deepEqual(salmon.suggested,[]);
   const {context,page,errors}=await openStudio(browser,world,{hash:'#unplaced'});await ready(page);await page.waitForSelector('#unplaced-main .up-item');
   assert.equal(await page.locator('#unplaced-main .up-item').count(),2);
   const row=(k:string)=>page.locator(`li.up-item[data-fact="${k}"]`);const mt=await row(mince.key).innerText();
   assert.match(mt,/Synthetic Pork and Beef Mince 500g/);assert.match(mt,/Woolworths · Hurstville/);assert.match(mt,/\$7\.50/);
   assert.match(mt,/Gợi ý: Thịt bò xay Chưa chắc/,'suggestion name + matcher level');assert.match(mt,/khác: Thịt heo xay/);assert.doesNotMatch(await page.locator('#unplaced-main').innerText(),/NaN|thit-/);
   assert.match(await row(salmon.key).innerText(),/Chưa có gợi ý/);assert.equal(await row(salmon.key).locator('[data-attach]').isDisabled(),true);
   await row(mince.key).locator('[data-attach]').click();await page.waitForFunction(()=>/Đã gắn 1 giá\./.test(document.querySelector('#toast')?.textContent||''));await row(mince.key).waitFor({state:'detached'});
   await row(salmon.key).locator('[data-skip]').click();await page.waitForFunction(()=>/Đã bỏ qua 1 giá\./.test(document.querySelector('#toast')?.textContent||''));await page.waitForSelector('#unplaced-main .empty');
   assert.deepEqual((await list()).filter((x:any)=>['660001','660002'].includes(x.productId)),[],'resolved on the server');
   const log=(await listLog(world.getStoreFn,'audit',{now:Date.now(),limit:300,from:dayKey(Date.now()-86400000)})).items;
   const att=log.find((x:any)=>x.action==='scout_unplaced_attach'),rej=log.find((x:any)=>x.action==='scout_unplaced_reject');
   assert.ok(att&&rej,'attach + reject audited');assert.equal(att.details.itemId,'thit-bo-xay');assert.equal(att.details.done,1);assert.equal(rej.details.done,1);
   assert.deepEqual(errors,[]);await context.close();
  }finally{world.handlers.scout=stub}}

 // 3c. Scan list: today's plan (re-plan), sources (pin, specials validation, keywords), owner audit.
 {const {context,page,errors}=await openStudio(browser,world,{hash:'#scanlist'});await ready(page);await page.waitForSelector('#scanlist-main .sl-totals');
  await page.locator('#sl-replan').click();await page.waitForFunction(()=>/Đã lập lại kế hoạch/.test(document.querySelector('#toast')?.textContent||''));await page.waitForSelector('#scanlist-main .sl-group');
  const today=await page.locator('#scanlist-main').innerText();assert.match(today,/Khuyến mãi/);assert.match(today,/Woolworths · Hurstville/);assert.match(today,/chờ/);
  await shot(page,'scanlist-today-vi-light-desktop-1280x800');
  await page.locator('[data-sl-tab="sources"]').click();await page.waitForSelector('#sl-pin');
  await page.locator('#sl-pin input[name=item]').fill('rau-muong');await page.locator('#sl-pin input[value=woolworths]').check();await page.locator('#sl-pin button').click();
  await page.waitForFunction(()=>/Đã ghim món/.test(document.querySelector('#toast')?.textContent||''));await page.locator('[data-sl-tab="sources"]').click();await page.waitForSelector('[data-unpin="rau-muong"]');
  await page.locator('.sl-sp-add[data-ret="coles"] input').fill('https://www.woolworths.com.au/shop/browse/specials');await page.locator('.sl-sp-add[data-ret="coles"] button').click();
  await page.waitForFunction(()=>document.querySelector('#toast')?.classList.contains('bad'));
  await page.locator('#sl-q').fill('ngo');assert.ok(await page.locator('[data-words="ngo"]').count()===1,'search finds the item');await page.locator('[data-words="ngo"]').click();
  await page.locator('#ask[open] input[name=add]').fill('coriander, cilantro');await page.locator('#ask button[value=ok]').click();await page.waitForFunction(()=>/Đã lưu từ khoá/.test(document.querySelector('#toast')?.textContent||''));
  const acts=(await listLog(world.getStoreFn,'audit',{now:Date.now(),limit:500,from:dayKey(Date.now()-86400000)})).items.map((x:any)=>x.action);for(const x of ['scout_replan','scout_pin_item','scout_match_words'])assert.ok(acts.includes(x),'audited '+x);
  await page.locator('[data-sl-tab="sources"]').click();await page.waitForSelector('[data-unpin="rau-muong"]');await shot(page,'scanlist-sources-vi-light-desktop-1280x800');
  await page.setViewportSize(sizes.mobile);await noOverflow(page,'scanlist sources mobile');assert.deepEqual(await smallTargets(page,'#scanlist-main button,#scanlist-main input:not([type=checkbox]),#scanlist-main summary'),[],'scan list targets on a phone');
  await page.locator('[data-sl-tab="today"]').click();await noOverflow(page,'scanlist today mobile');await shot(page,'scanlist-today-vi-light-mobile-375x812');
  await page.locator('[data-unpin]').count();assert.deepEqual(errors,[]);await context.close()}

 // 4. Phones/tablets: menu sheet; every size in VI light and EN dark: no overflow, ≥44 px targets, screenshots.
 for(const [size,lang,theme] of [['narrow','vi','light'],['mobile','vi','light'],['tablet','vi','light'],['desktop','vi','light'],['narrow','en','dark'],['mobile','en','dark'],['tablet','en','dark'],['desktop','en','dark']] as any[]){
  const touch=size!=='desktop',{context,page,errors}=await openStudio(browser,world,{viewport:sizes[size],lang,theme,hash:'#overview',hasTouch:touch});await ready(page);await sleep(600);
  const dim=`${sizes[size].width}x${sizes[size].height}`,tag=`${lang}-${theme}-${size}-${dim}`;
  await noOverflow(page,'overview '+tag);
  if(touch){assert.equal(await page.locator('#nav').isVisible(),false,'menu closed on '+size);assert.equal(await page.locator('#navbtn').isVisible(),true);
   assert.match(await page.locator('#navcur').innerText(),lang==='en'?/Overview/:/Tổng quan/);assert.equal(await page.locator('#net').isVisible(),true,'online state in the top bar');
   // v1.7.6 (owner: no way back to the app from Studio): “← App” always visible in the top bar, 44 px, back to Today
   {const back=page.locator('#back-app');assert.equal(await back.isVisible(),true,'back to the app visible without opening the menu');assert.equal(await back.getAttribute('href'),'/#today');assert.ok((await back.boundingBox())!.height>=44,'back button is a 44 px target')}
   assert.deepEqual(await smallTargets(page,'#navbtn,.topbar button'),[],'top bar targets '+tag);
   await shot(page,'overview-'+tag);
   await page.locator('#navbtn').click();await page.locator('#nav a[href="#scout"]').waitFor();assert.equal(await page.locator('#navbtn').getAttribute('aria-expanded'),'true');
   assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('#side-panel')!).transitionDuration.split(',').every(s=>parseFloat(s)===0)),true,'reduced motion: no slide');
   assert.deepEqual(await smallTargets(page,'#nav a,#nav button,.side-foot button'),[],'menu targets '+tag);await noOverflow(page,'menu open '+tag);
   await shot(page,'menu-open-'+tag);
   await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('#side')!.classList.contains('open'));
   await page.locator('#navbtn').click();await page.locator('#nav a[href="#scout"]').click();await hashIs(page,'#scout');await ready(page);await page.waitForSelector('#sc-rc');
   assert.equal(await page.locator('#nav').isVisible(),false,'menu closes after choosing a page');assert.match(await page.locator('#navcur').innerText(),lang==='en'?/Price Check network/:/Mạng So Giá/);
  }else{await shot(page,'overview-'+tag);await page.locator('#nav a[href="#scout"]').click();await hashIs(page,'#scout');await ready(page);await page.waitForSelector('#sc-rc')}
  await noOverflow(page,'scout '+tag);if(touch)assert.deepEqual(await smallTargets(page,'#scout-main button,#scout-main select,#scout-main summary'),[],'Price Check targets '+tag);
  await page.evaluate(()=>{const el=document.querySelector('#sc-rc');if(el)scrollTo(0,el.getBoundingClientRect().top+scrollY-70)});await shot(page,'scout-'+tag);
  await page.evaluate(()=>{location.hash='#settings'});await ready(page);await page.waitForSelector('#studio-update-card');await noOverflow(page,'settings '+tag);
  if(size==='desktop'||size==='mobile'){await page.evaluate(()=>{const el=document.querySelector('.scout-states');if(el)scrollTo(0,el.getBoundingClientRect().top+scrollY-260)});await shot(page,'settings-'+tag)}
  await page.evaluate(()=>{location.hash='#urgent'});await ready(page);await page.waitForSelector('#urgent-main .ur-list, #urgent-main .empty');await noOverflow(page,'urgent '+tag);
  if(touch)assert.deepEqual(await smallTargets(page,'.subtabs a'),[],'tab targets '+tag);
  for(const k of ['accounts','community','feedback','usage','voice','recipes','logs','scanlist','unplaced']){await page.evaluate((k:string)=>{location.hash='#'+k},k);await ready(page);await noOverflow(page,k+' '+tag)}
  if(size==='mobile'&&lang==='en'){await context.setOffline(true);await page.evaluate(()=>dispatchEvent(new Event('offline')));await page.waitForFunction(()=>/Offline/.test(document.querySelector('#net')?.textContent||''));await shot(page,'offline-'+tag);await context.setOffline(false);await page.evaluate(()=>dispatchEvent(new Event('online')))}
  assert.deepEqual(errors,[],tag);await context.close()}

 // 5. Timing on a simulated network (simulation only; numbers for the release record).
 const perf:any={};for(const p of (process.env.STUDIO_NAV_PROFILES||'typical').split(','))perf[p]=await measure(browser,world,{profile:p});
 writeFileSync(`${out}/perf-after.json`,JSON.stringify(perf,null,1)+'\n');
 const ty=perf.typical;if(ty){console.log('typical:',JSON.stringify(ty.cold),JSON.stringify(ty.warmReload),JSON.stringify(ty.summary));
  // Targets: switch with saved data < 300 ms, first content < 1 s. The median carries the target; single samples get
  // headroom because shared CI machines pause the page now and then (the measured values go into perf-after.json).
  assert.ok(ty.summary.medianCachedSwitchMs<300,'page switch with saved data < 300 ms (median): '+ty.summary.medianCachedSwitchMs);assert.ok(ty.summary.maxCachedSwitchMs<1000,'no saved-data switch waits for the network: '+ty.summary.maxCachedSwitchMs);
  assert.ok(ty.cold.firstContentMs<1500,'first Studio content (target < 1 s): '+ty.cold.firstContentMs);assert.ok(ty.warmReload.firstContentMs<1000,'reload < 1 s: '+ty.warmReload.firstContentMs);
  /* v1.7.11: studio.js plus the 0.3 KB light/dark script that was inline before and is TypeScript now (studio-theme.ts) */assert.equal(ty.cold.scriptRequests,2,'two scripts at start: studio-theme.js and studio.js')}
 await browser.close();
 console.log(`PASS Studio navigation: groups, lazy pages, badges, old hashes, merged urgent page, Ctrl+K, menu sheet, settings note, device readiness, 4 sizes VI/EN light/dark (${shots} screenshots), timing`);
})().catch(e=>{console.error(e);process.exit(1)});
