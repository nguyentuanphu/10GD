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
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
const out='docs/reviews/v1.7.2/studio-nav';mkdirSync(out,{recursive:true});
const sizes:any={narrow:{width:320,height:740},mobile:{width:375,height:812},tablet:{width:820,height:1100},desktop:{width:1280,height:800}};
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const {studioWorld,openStudio,ready,measure}=await import('./helpers/studio-nav-harness.mjs');
 const {listLog,dayKey}=await import('../netlify/lib/studio.mjs');
 const world=await studioWorld();const browser=await chromium.launch();
 const scripts=(log:any[])=>log.filter(x=>x.kind==='static'&&/\.js$/.test(x.path)).map(x=>x.path);
 const hashIs=async(page:any,h:string)=>{await page.waitForFunction((h:string)=>location.hash===h,h);await sleep(80)};// hashchange runs after the hash updates
 const noOverflow=async(page:any,what:string)=>{const o=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);if(o>1)console.log(await page.evaluate(()=>[...document.querySelectorAll('body *')].filter((e:any)=>e.getBoundingClientRect().right>innerWidth+1).slice(0,6).map((e:any)=>e.tagName+'.'+e.className+' '+Math.round(e.getBoundingClientRect().right))));assert.ok(o<=1,`horizontal overflow ${o}px: ${what}`)};
 const smallTargets=(page:any,sel:string)=>page.evaluate((sel:string)=>[...document.querySelectorAll(sel)].filter((e:any)=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width&&r.height&&s.visibility!=='hidden'&&r.height<44&&e.type!=='checkbox'&&e.type!=='radio'}).map((e:any)=>e.outerHTML.slice(0,80)),sel);
 let shots=0;const shot=async(page:any,name:string)=>{await sleep(120);await page.screenshot({path:`${out}/${name}.png`});shots++};

 // 1. Desktop: groups, lazy modules, badges, collapse, hover prefetch, old hashes, merged urgent page, Ctrl+K.
 {const {context,page,log,errors}=await openStudio(browser,world,{hash:'#overview',profile:'typical'});await ready(page);await sleep(3500);
  const groups=await page.$$eval('#nav .ngroup',(gs:any[])=>gs.map(g=>[g.dataset.group,[...g.querySelectorAll('a[data-nav]')].map((a:any)=>a.dataset.nav)]));
  assert.deepEqual(groups,[['home',['overview','urgent','notifications','health']],['people',['accounts','families','invites']],['content',['community','recipes','feedback']],['price',['scout','catalog']],['stats',['usage','voice']],['release',['settings','broadcast','rollout','logs']]],'6 groups, every page once');
  assert.equal(await page.locator('#nav a[href="#messages"]').count(),0,'old daily urgent page is not a separate menu item');
  assert.equal(await page.locator('#nav a[aria-current="page"]').getAttribute('href'),'#overview');
  assert.deepEqual(scripts(log),['/studio.js'],'only studio.js before any page module opens: '+scripts(log).join(' '));
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
  await page.waitForFunction(()=>/v1\.7\.0/.test(document.querySelector('[aria-labelledby="sc-rc"]')?.textContent||''),null,{timeout:5000});
  const old=await card(world.ids.old).innerText();
  assert.match(old,/Tự động cho máy này:\s*Chưa cho phép/);assert.match(old,/Cần cho phép tự động cho máy này/);assert.match(old,/tiện ích cũ v1\.6\.0 — cần cập nhật \(mới nhất v1\.7\.0\)/);assert.match(old,/Cần cập nhật/);
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
  assert.deepEqual(errors,[]);await context.close()}

 // 4. Phones/tablets: menu sheet; every size in VI light and EN dark: no overflow, ≥44 px targets, screenshots.
 for(const [size,lang,theme] of [['narrow','vi','light'],['mobile','vi','light'],['tablet','vi','light'],['desktop','vi','light'],['narrow','en','dark'],['mobile','en','dark'],['tablet','en','dark'],['desktop','en','dark']] as any[]){
  const touch=size!=='desktop',{context,page,errors}=await openStudio(browser,world,{viewport:sizes[size],lang,theme,hash:'#overview',hasTouch:touch});await ready(page);await sleep(600);
  const dim=`${sizes[size].width}x${sizes[size].height}`,tag=`${lang}-${theme}-${size}-${dim}`;
  await noOverflow(page,'overview '+tag);
  if(touch){assert.equal(await page.locator('#nav').isVisible(),false,'menu closed on '+size);assert.equal(await page.locator('#navbtn').isVisible(),true);
   assert.match(await page.locator('#navcur').innerText(),lang==='en'?/Overview/:/Tổng quan/);assert.equal(await page.locator('#net').isVisible(),true,'online state in the top bar');
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
  for(const k of ['accounts','community','feedback','usage','voice','recipes','logs']){await page.evaluate((k:string)=>{location.hash='#'+k},k);await ready(page);await noOverflow(page,k+' '+tag)}
  if(size==='mobile'&&lang==='en'){await context.setOffline(true);await page.evaluate(()=>dispatchEvent(new Event('offline')));await page.waitForFunction(()=>/Offline/.test(document.querySelector('#net')?.textContent||''));await shot(page,'offline-'+tag);await context.setOffline(false);await page.evaluate(()=>dispatchEvent(new Event('online')))}
  assert.deepEqual(errors,[],tag);await context.close()}

 // 5. Timing on a simulated network (simulation only; numbers for the release record).
 const perf:any={};for(const p of (process.env.STUDIO_NAV_PROFILES||'typical').split(','))perf[p]=await measure(browser,world,{profile:p});
 writeFileSync(`${out}/perf-after.json`,JSON.stringify(perf,null,1)+'\n');
 const ty=perf.typical;if(ty){console.log('typical:',JSON.stringify(ty.cold),JSON.stringify(ty.warmReload),JSON.stringify(ty.summary));
  assert.ok(ty.summary.maxCachedSwitchMs<300,'every page switch with saved data < 300 ms: '+ty.summary.maxCachedSwitchMs);
  assert.ok(ty.cold.firstContentMs<1000,'first Studio content < 1 s: '+ty.cold.firstContentMs);assert.ok(ty.warmReload.firstContentMs<1000,'reload < 1 s');
  assert.equal(ty.cold.scriptRequests,1,'one script at start')}
 await browser.close();
 console.log(`PASS Studio navigation: groups, lazy pages, badges, old hashes, merged urgent page, Ctrl+K, menu sheet, settings note, device readiness, 4 sizes VI/EN light/dark (${shots} screenshots), timing`);
})().catch(e=>{console.error(e);process.exit(1)});
