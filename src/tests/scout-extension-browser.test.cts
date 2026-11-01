// FamTray Scout extension in real Chromium (Manifest V3, --load-extension, new
// headless). Uses the TEST build (dist-extension-test), which only adds the
// *.scout.test hosts (mapped to 127.0.0.1) and allows a short pacing override.
// Verifies: options-page pairing, semi-auto capture + badge + popup summary on a
// fixture page, auto mode visiting tasks one at a time with pacing, robots.txt skip,
// and that a challenge page stops the run and pauses the device for 24 h.
// Saves popup/options screenshots to docs/reviews/v1.7/easy-scout/extension/ (v1.6 evidence stays as recorded).
// v1.7 easy install: the REAL app page (served on http://kitchen.localhost, a test-build
// externally_connectable host) detects the installed extension, "Pair now" pairs it in
// one click through the real scout handler (device appears, the token never reaches the
// page), the manual code path still works, a connectable-but-not-allowlisted page
// (other.scout.test) is refused by the extension itself, a page Chrome does not connect
// (127.0.0.1) has no extension messaging at all, and a tab marked ?scout-wait=1 is
// reloaded on install and reopens the card. SCOUT_STORE_SCREENSHOTS=1 refreshes the
// Web Store screenshots in docs/scout-store/.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {createServer} from 'node:http';
import {join,resolve,extname} from 'node:path';
import {tmpdir} from 'node:os';
import {chromium} from 'playwright';
const out='docs/reviews/v1.7/easy-scout/extension';mkdirSync(out,{recursive:true});
const ext=resolve('dist-extension-test');
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
async function until(fn:()=>Promise<any>,ms=30000,label='condition'){const end=Date.now()+ms;let last:any;while(Date.now()<end){last=await fn();if(last)return last;await sleep(250)}throw new Error('Timed out waiting for '+label)}

(async()=>{
 const {memoryStores}=await import('./helpers/accounts.mjs');
 const {createAccountsHandler}=await import('../netlify/lib/accounts.mjs');
 const {createScoutHandler}=await import('../netlify/functions/scout.mjs');
 const scoutLib=await import('../netlify/lib/scout.mjs');
 const getStoreFn=memoryStores(),published:any[]=[];
 let PORT=0;const base=(h:string)=>`http://${h}.scout.test:${PORT}`;
 const fake:any={wanted:[],mappings:[]};
 const adapter={async wantedItems(){return fake.wanted},async productMappings(){return fake.mappings},async lastSeen(){return{}},async catalogItems(){return[]},async publishObservation(o:any,m:any){published.push({o,m})},async holdObservation(){},async recordMappingCandidate(){}};
 const env:any={SCOUT_DEV:'1',STUDIO_ADMINS:'henrynguyen'};
 const scout=createScoutHandler({getStoreFn,env,adapter}),accounts=createAccountsHandler({getStoreFn});
 const visits:any[]=[];let robotsTxt='User-agent: *\nDisallow: /shop/search\n';
 const fixture=(name:string)=>readFileSync('src/tests/fixtures/scout/'+name,'utf8');
 const pages:any={'/shop/browse/specials/half-price':'woolworths-specials.html','/shop/productdetails/123456/squid-brand-fish-sauce':'woolworths-product.html','/shop/browse/challenge':'challenge.html','/shop/search/products':'empty.html'};
 const server=createServer(async(req,res)=>{
  const host=String(req.headers.host||'').split(':')[0],path=String(req.url||'/');
  if(host==='api.scout.test'){const chunks:any[]=[];for await(const c of req)chunks.push(c);const body=Buffer.concat(chunks);
   const r=await scout(new Request('http://api.scout.test:'+PORT+path,{method:req.method,headers:req.headers as any,body:['GET','HEAD'].includes(req.method!)?undefined:body}));
   res.writeHead(r.status,Object.fromEntries(r.headers));res.end(Buffer.from(await r.arrayBuffer()));return}
  if(host==='kitchen.localhost'||host==='127.0.0.1'){await appServe(req,res,path);return}
  if(host==='other.scout.test'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end('<!doctype html><title>Other site</title><p>Not the family app</p>');return}
  if(host.endsWith('.scout.test')){
   if(path==='/robots.txt'){res.writeHead(200,{'Content-Type':'text/plain'});res.end(robotsTxt);return}
   if(path.startsWith('/favicon')){res.writeHead(404);res.end();return}
   visits.push({host,path,at:Date.now()});const p=pages[path.split('?')[0]];
   if(p){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(fixture(p));return}
  }
  res.writeHead(404,{'Content-Type':'text/plain'});res.end('not found')});
 // ---------- the family app on http://localhost (real scout handler, signed-in owner) ----------
 let appCookie='';const appPosts:any[]=[],appBodies:string[]=[];
 const mime:any={'.js':'application/javascript','.css':'text/css','.html':'text/html','.webmanifest':'application/manifest+json','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.zip':'application/zip'};
 async function appServe(req:any,res:any,path:string){
  const url=new URL(path,'http://kitchen.localhost:'+PORT),op=url.searchParams.get('op');
  if(url.pathname==='/.netlify/functions/scout'){const chunks:any[]=[];for await(const c of req)chunks.push(c);const body=Buffer.concat(chunks);
   // The browser session cookie of the signed-in owner (cookies are injected here because the test app runs on plain http).
   const headers:any={...req.headers};if(!String(headers.origin||'').startsWith('chrome-extension://'))headers.cookie=appCookie;
   if(req.method==='POST'&&!String(req.headers.origin||'').startsWith('chrome-extension://'))appPosts.push({op,body:body.toString()});
   const r=await scout(new Request('http://'+req.headers.host+path,{method:req.method,headers,body:['GET','HEAD'].includes(req.method)?undefined:body}));
   const out=Buffer.from(await r.arrayBuffer());if(!String(req.headers.origin||'').startsWith('chrome-extension://'))appBodies.push(out.toString());
   res.writeHead(r.status,Object.fromEntries(r.headers));res.end(out);return}
  if(url.pathname.startsWith('/.netlify/')){const household={id:'qa',name:'QA kitchen',role:'owner'};let data:any={announcements:[],devices:[]};
   if(url.pathname.includes('/accounts')&&op==='families')data={families:[household],account:{username:'scoutfamily',name:'Scout family'},household:{id:'qa'}};
   else if(url.pathname.includes('/accounts')&&op==='members')data={name:'QA kitchen',members:[{username:'scoutfamily',name:'Scout family',role:'owner'}],invites:[]};
   else if(op==='status')data={configured:true,connected:true,mode:'account',account:{username:'scoutfamily',name:'Scout family'},household};
   else if(op==='state')data={state:null,etag:null};
   res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(data));return}
  const file=resolve('dist',url.pathname==='/'?'index.html':url.pathname.slice(1));
  try{const b=readFileSync(file);res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream'});res.end(b)}catch{res.writeHead(404,{'Content-Type':'text/plain'});res.end('not found')}}
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',()=>r()));PORT=(server.address() as any).port;
 // Server config override with the test hosts and a specials URL on the local fixture host.
 const cfg=structuredClone(await scoutLib.scoutConfig(getStoreFn));for(const r of Object.keys(cfg.retailers))cfg.retailers[r].hosts.push(r+'.scout.test');
 cfg.version='e2e-1';cfg.retailers.woolworths.specials=[base('woolworths')+'/shop/browse/specials/half-price'];cfg.retailers.woolworths.searchUrl=base('woolworths')+'/shop/search/products?searchTerm={q}';
 const store=scoutLib.scoutStore(getStoreFn);await store.setJSON('config/override',{config:cfg});
 fake.wanted=[{itemId:'nuoc-mam',name:'Fish sauce',families:5},{itemId:'gao',name:'Jasmine rice',families:3}];
 fake.mappings=[{itemId:'nuoc-mam',retailer:'woolworths',productUrl:base('woolworths')+'/shop/productdetails/123456/squid-brand-fish-sauce',productId:'123456',confirmations:3}];
 // Account + pairing code (as Studio / My kitchen would create it).
 const reg=await accounts(new Request('https://app.test/.netlify/functions/accounts?op=register',{method:'POST',headers:{Origin:'https://app.test','Content-Type':'application/json','x-nf-client-connection-ip':'e2e'},body:JSON.stringify({username:'scoutfamily',name:'Scout family',password:'synthetic-e2e-passphrase-42',trust:true})}));assert.equal(reg.status,201);
 appCookie=(reg.headers.getSetCookie?.()||[String(reg.headers.get('set-cookie')||'')]).map((c:string)=>c.split(';')[0]).join('; ');assert.ok(appCookie.length>20,'session cookie');
 const {code}=await scoutLib.createPairCode(getStoreFn,'scoutfamily',Date.now(),env);

 const profile=mkdtempSync(join(tmpdir(),'scout-e2e-'));
 let ctx:any;
 try{ctx=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,viewport:{width:1280,height:800},args:['--disable-extensions-except='+ext,'--load-extension='+ext,'--host-resolver-rules=MAP *.scout.test 127.0.0.1, MAP kitchen.localhost 127.0.0.1']})}
 catch(e:any){if(process.env.CI){throw e}console.log('SKIP scout-extension-browser: extensions cannot be loaded in this environment: '+String(e?.message||e).split('\n')[0]);server.close();return}
 try{
  let [sw]=ctx.serviceWorkers();if(!sw)sw=await ctx.waitForEvent('serviceworker',{timeout:20000});
  const id=new URL(sw.url()).host;assert.equal(id,'mjeoekikdicoojgoppnfibjbfpcfngja','pinned extension id from the manifest key');
  const storage=(keys:any)=>sw.evaluate((k:any)=>(globalThis as any).chrome.storage.local.get(k),keys);
  const setStorage=(v:any)=>sw.evaluate((x:any)=>(globalThis as any).chrome.storage.local.set(x),v);
  await until(async()=>(await storage(['semiSites'])).semiSites,10000,'install defaults');await setStorage({lang:'vi'});
  // ---------- pairing via the options page ----------
  const opt=await ctx.newPage();await opt.goto(`chrome-extension://${id}/options.html`);
  await opt.getByText('Chuẩn bị (bắt buộc)',{exact:false}).waitFor();
  await opt.fill('input[name=server]',`http://api.scout.test:${PORT}`);await opt.fill('input[name=code]',code);await opt.fill('input[name=name]','E2E Chrome');await opt.fill('input[name=postcode]','2220');await opt.fill('input[name=suburb]','Hurstville');
  await opt.click('#pair button[type=submit]');
  await opt.getByText('Đã ghép nối',{exact:false}).first().waitFor({timeout:15000});
  const paired=await storage(['token','deviceId']);assert.match(paired.token,/^[\w-]{43}$/);const deviceId=paired.deviceId;
  await opt.fill('input[name=woolworths]','Hurstville');await opt.click('#stores button[type=submit]');await opt.getByText('Đã lưu cửa hàng',{exact:false}).waitFor();
  // Auto toggle is refused until the onboarding checklist is complete.
  await opt.click('#auto');await opt.getByText('Hãy hoàn tất danh sách chuẩn bị',{exact:false}).waitFor();assert.equal((await storage(['autoEnabled'])).autoEnabled,false);
  for(const k of ['profile','rewards','store'])await opt.check(`[data-ob=${k}]`);
  await opt.check('#auto');await opt.getByText('Đã bật tự động',{exact:false}).waitFor();assert.equal((await storage(['autoEnabled'])).autoEnabled,true);

  // ---------- semi-auto: the human opens a specials page ----------
  const shop=await ctx.newPage();await shop.goto(base('woolworths')+'/shop/browse/specials/half-price');
  await until(async()=>published.filter(p=>p.o.mode==='semi').length>=24,30000,'semi-auto facts at the server');
  const semi=published.filter(p=>p.o.mode==='semi');assert.equal(semi[0].o.source,'scout-extension');assert.equal(semi[0].o.storeLabel,'Hurstville');assert.ok(semi.some(p=>p.o.promo==='half-price'&&p.o.wasPrice));
  for(const p of semi)for(const k of Object.keys(p.o))assert.ok(!/image|description|review|email/i.test(k),'facts only');
  const badge=await sw.evaluate(async()=>{const c=(globalThis as any).chrome;const [t]=await c.tabs.query({url:'http://woolworths.scout.test/*'});return c.action.getBadgeText({tabId:t.id})});assert.equal(badge,'24','badge count');
  const lastSemi=await until(async()=>(await storage(['lastSemi'])).lastSemi,10000,'lastSemi');assert.equal(lastSemi.count,24);
  const pop=await ctx.newPage();await pop.setViewportSize({width:375,height:812});await pop.goto(`chrome-extension://${id}/popup.html`);
  await pop.getByText('Đã lưu 24 giá · Woolworths Hurstville').waitFor();
  // ---------- auto mode: Studio enables the network and this device ----------
  await scoutLib.saveNetwork(getStoreFn,{autoScout:'on'},'henrynguyen',Date.now());
  await scoutLib.editDevice(getStoreFn,deviceId,(d:any)=>({...d,autoAllowed:true,schedule:[{days:[0,1,2,3,4,5,6],start:'00:00',end:'24:00'}]}));
  await setStorage({testPacing:{minMs:1500,maxMs:1800}});
  const before=visits.length;
  const why=await sw.evaluate(()=>(globalThis as any).scoutDebug.startRun());assert.equal(why,null,'run started: '+why);
  const lastRun=await until(async()=>(await storage(['lastRun'])).lastRun,90000,'auto run to finish');
  assert.equal(lastRun.stop,'no-tasks',JSON.stringify(lastRun));assert.equal(lastRun.pages,2,'two pages visited');assert.equal(lastRun.skipped,1,'robots-disallowed search skipped');
  const autoVisits=visits.slice(before).filter(v=>v.host==='woolworths.scout.test');
  assert.equal(autoVisits.length,2,'only the two allowed pages were requested: '+JSON.stringify(autoVisits));assert.ok(!autoVisits.some(v=>v.path.startsWith('/shop/search')),'robots Disallow respected');
  assert.ok(autoVisits[1].at-autoVisits[0].at>=1500,'paced: '+(autoVisits[1].at-autoVisits[0].at)+' ms');
  const tasks=await scoutLib.listTasks(getStoreFn,scoutLib.dayKey(Date.now()));const st:any={};for(const t of tasks)st[t.status]=(st[t.status]||0)+1;assert.equal(st.done,2);assert.equal(st.skipped,1);
  assert.ok(published.some(p=>p.o.mode==='auto'&&p.o.productId==='123456'),'auto result published');
  await until(async()=>(await ctx.pages()).every((p:any)=>!p.url().includes('runner.html')),15000,'runner window closed');

  // ---------- challenge page → stop immediately, pause 24 h ----------
  cfg.version='e2e-2';cfg.retailers.woolworths.specials=[base('woolworths')+'/shop/browse/challenge',base('woolworths')+'/shop/browse/specials/half-price?page=2'];await store.setJSON('config/override',{config:cfg});
  await setStorage({lastRun:null});const before2=visits.length;
  assert.equal(await sw.evaluate(()=>(globalThis as any).scoutDebug.startRun()),null);
  const lr2=await until(async()=>(await storage(['lastRun'])).lastRun,60000,'challenge run to stop');
  assert.equal(lr2.stop,'blocked');assert.equal(lr2.blocked.kind,'challenge');
  const v2=visits.slice(before2).filter(v=>v.host==='woolworths.scout.test');assert.ok(v2.length>=1&&v2[v2.length-1].path==='/shop/browse/challenge','no page after the challenge: '+JSON.stringify(v2));
  const dev=await scoutLib.getDevice(getStoreFn,deviceId);assert.ok(dev.pausedUntil-Date.now()>23*3600000,'device paused ~24 h');assert.match(dev.pauseReason,/^blocked:challenge/);
  const events=await scoutLib.listEvents(getStoreFn,{now:Date.now()});assert.ok(events.some((e:any)=>e.type==='device_blocked'));
  assert.equal((await scoutLib.listTasks(getStoreFn,scoutLib.dayKey(Date.now()))).filter((t:any)=>t.status==='leased').length,0,'leases released after block');
  assert.ok((await storage(['blockedEvents'])).blockedEvents.length>=1);

  // ---------- screenshots (popup-like 375 width; options at tablet and desktop; VI/EN, light/dark) ----------
  await setStorage({lastRun:{...lr2},theme:'light',lang:'vi'});
  const shot=async(page:any,name:string)=>{const w=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth);assert.equal(w,false,'no horizontal overflow: '+name);await page.screenshot({path:`${out}/${name}.png`})};
  for(const [lang,theme] of [['vi','light'],['en','dark']] as const){await setStorage({lang,theme});
   await pop.setViewportSize({width:375,height:812});await pop.reload();await pop.waitForSelector('#pause');await shot(pop,`popup-${lang}-${theme}-375x812`);
   for(const [w,h] of [[820,1100],[1280,800]]){await opt.setViewportSize({width:w,height:h});await opt.reload();await opt.waitForSelector('#h-check');await shot(opt,`options-${lang}-${theme}-${w}x${h}`)}}
  await setStorage({lang:'en',theme:'light'});await opt.setViewportSize({width:375,height:812});await opt.reload();await opt.waitForSelector('#h-check');await shot(opt,'options-en-light-375x812');
  // touch targets ≥44 px on the popup
  const small=await pop.evaluate(()=>[...document.querySelectorAll('button,.switch')].filter((e:any)=>e.getBoundingClientRect().height<44).map((e:any)=>e.textContent.trim().slice(0,30)));assert.deepEqual(small,[],'touch targets');
  console.log('Scout extension (Chromium MV3): pairing, semi-auto capture + badge + popup, paced auto run, robots skip, challenge stop/24 h pause, screenshots — passed.');

  // ================= v1.7 easy install: the app page talks to the extension =================
  const APP=`http://kitchen.localhost:${PORT}`;// localhost itself is device-only mode in the app
  // Start from an unpaired extension (as right after install).
  await setStorage({token:'',deviceId:'',device:null,server:'',autoEnabled:false,lang:'vi',theme:'light',paused:false});
  await ctx.addInitScript(()=>{if(location.hostname!=='kitchen.localhost')return;if(!sessionStorage.getItem('qa-init')){sessionStorage.setItem('qa-init','1');localStorage.setItem('bep-theme-mode','light');localStorage.setItem('bep-account-present','yes')}
   // Record every reply the page receives from the extension (to prove no token leaks).
   const rt=(globalThis as any).chrome?.runtime;if(rt?.sendMessage){const orig=rt.sendMessage.bind(rt);(globalThis as any).__scoutReplies=[];rt.sendMessage=(id:any,msg:any,cb:any)=>orig(id,msg,(r:any)=>{(globalThis as any).__scoutReplies.push(JSON.stringify(r??null));cb&&cb(r)})}});
  const app=await ctx.newPage();await app.setViewportSize({width:1280,height:800});
  const pageErrors:string[]=[];app.on('pageerror',(e:any)=>pageErrors.push(e.message));
  const openKitchen=async()=>{await app.waitForFunction(()=>(document.querySelector('#main')?.textContent?.length||0)>500&&!document.querySelector('#startup-progress'),null,{timeout:30000});await app.waitForTimeout(300);if(await app.evaluate(()=>document.querySelector('#modal-title')?.textContent||''))await app.keyboard.press('Escape');
   for(let i=0;i<2;i++){await app.evaluate(()=>(globalThis as any).settingsModal('family'));try{await app.locator('.kitchen-hub .scout-pair-card').waitFor({timeout:10000});return}catch(e){if(i)throw e;await app.keyboard.press('Escape');await app.waitForTimeout(300)}}};
  await app.goto(APP+'/',{waitUntil:'domcontentloaded'});await openKitchen();
  const card=app.locator('.kitchen-hub .scout-pair-card');
  // 1. Install detection: the card finds the installed extension and offers Pair now.
  await card.locator('[data-scout-state="ready"]').waitFor({timeout:15000});
  assert.match(await card.innerText(),/Đã cài tiện ích FamTray Scout/);assert.equal(await card.locator('[data-scout-pair-now]').count(),1);
  assert.equal(await card.locator('[data-scout-state="install"]').count(),0,'no install steps once installed');
  // 2. Manual fallback still works: code from the card, typed into the extension's settings.
  await card.locator('.scout-pair-manual summary').click();await card.locator('[data-scout-pair]').click();
  const manualCode=(await card.locator('[data-scout-code]').innerText()).replace('-','');assert.match(manualCode,/^[A-Z0-9]{8}$/);
  const opt2=await ctx.newPage();await opt2.goto(`chrome-extension://${id}/options.html`);await opt2.locator('[data-easy-pair]').waitFor();
  assert.equal(await opt2.inputValue('input[name=server]'),'','test build: no baked-in address');
  await opt2.fill('input[name=server]',APP);await opt2.fill('input[name=code]',manualCode);await opt2.fill('input[name=name]','Manual Chrome');await opt2.click('#pair button[type=submit]');
  await opt2.getByText('Đã ghép nối',{exact:false}).first().waitFor({timeout:15000});
  const manualId=(await storage(['deviceId'])).deviceId;assert.ok((await scoutLib.listDevices(getStoreFn)).some((d:any)=>d.id===manualId&&d.name==='Manual Chrome'&&!d.revokedAt),'manual pairing created the device');
  opt2.once('dialog',(d:any)=>d.accept());await opt2.click('#unpair');await opt2.getByText('Đã hủy ghép nối',{exact:false}).waitFor();await opt2.close();
  assert.ok((await scoutLib.getDevice(getStoreFn,manualId)).revokedAt,'unpair revoked the manual device');
  // 3. One click: Pair now (with the family postcode) → the extension pairs with THIS origin.
  await app.reload({waitUntil:'domcontentloaded'});await openKitchen();
  await app.evaluate(()=>{(globalThis as any).eval('scoutData.postcode="2220"')});
  await card.locator('[data-scout-state="ready"]').waitFor({timeout:15000});
  const beforeIds=new Set((await scoutLib.listDevices(getStoreFn)).map((d:any)=>d.id));
  await card.locator('[data-scout-pair-now]').click();
  await card.locator('[data-scout-state="paired"]').waitFor({timeout:20000});
  assert.match(await card.innerText(),/Đã ghép máy tính/);assert.match(await card.innerText(),/Dùng tên này/,'store-name step explained');
  const extSt=await storage(['token','deviceId','server','device']);assert.match(extSt.token,/^[\w-]{43}$/);assert.equal(extSt.server,APP,'server is the sender origin');
  const fresh=(await scoutLib.listDevices(getStoreFn)).filter((d:any)=>!beforeIds.has(d.id));assert.equal(fresh.length,1,'exactly one device appeared');
  assert.equal(fresh[0].id,extSt.deviceId);assert.equal(fresh[0].owner,'scoutfamily');assert.equal(fresh[0].postcode,'2220','family postcode handed over');assert.match(fresh[0].name,/^Chrome · máy tính$/);
  await card.locator('.scout-this-pc').waitFor();assert.equal(appPosts.filter(p=>p.op==='pair-code').length,2,'one code for manual, one for Pair now');
  // The device token never reaches the page: not in replies, API responses, DOM or storage.
  const leak=await app.evaluate((t:string)=>[...(globalThis as any).__scoutReplies||[]].join('\n').includes(t)||document.documentElement.outerHTML.includes(t)||JSON.stringify({...localStorage}).includes(t)||JSON.stringify({...sessionStorage}).includes(t),extSt.token);
  assert.equal(leak,false,'token not visible to the page');assert.ok(!appBodies.some(b=>b.includes(extSt.token)),'token not in any app API response');
  assert.ok((await app.evaluate(()=>(globalThis as any).__scoutReplies.length))>=2,'replies were recorded');
  if(process.env.SCOUT_STORE_SCREENSHOTS==='1'||process.env.SCOUT_PAIR_SCREENSHOTS==='1'){mkdirSync('docs/reviews/v1.7/easy-scout',{recursive:true});await app.evaluate(()=>document.querySelector('.scout-pair-card')?.scrollIntoView({block:'start'}));await app.screenshot({path:'docs/reviews/v1.7/easy-scout/e2e-paired-1280x800-vi-light.png'})}
  // Popup: one tap “Dùng tên này” confirms the store name read from the retailer page.
  await setStorage({warnings:{signedIn:{},storesSeen:{coles:'Coles Hurstville'},storeMismatch:{}}});
  const pop2=await ctx.newPage();await pop2.setViewportSize({width:375,height:700});await pop2.goto(`chrome-extension://${id}/popup.html`);
  await pop2.locator('[data-use-store="coles"]').click();
  await until(async()=>(await scoutLib.getDevice(getStoreFn,extSt.deviceId)).stores?.coles==='Coles Hurstville',10000,'store saved from the popup');
  await until(async()=>(await pop2.locator('[data-store-ask]').count())===0,5000,'store question disappears');await pop2.close();
  // A second Pair now is a no-op (already paired here).
  assert.deepEqual(await app.evaluate((id:string)=>new Promise(r=>(globalThis as any).chrome.runtime.sendMessage(id,{type:'pair',code:'AAAABBBB'},(x:any)=>r({ok:x.ok,already:x.already,token:'token' in x}))),id),{ok:true,already:true,token:false});
  // 4. Sender origin: a connectable page that is NOT on the extension's allowlist is refused.
  const other=await ctx.newPage();await other.goto(`http://other.scout.test:${PORT}/`);
  const refused=await other.evaluate((id:string)=>Promise.all([{type:'ping'},{type:'pair',code:'ABCD2345'}].map(m=>new Promise(r=>(globalThis as any).chrome.runtime.sendMessage(id,m,(x:any)=>r(x))))),id);
  assert.deepEqual(refused,[{ok:false,app:'famtray-scout',error:'origin-not-allowed'},{ok:false,app:'famtray-scout',error:'origin-not-allowed'}]);
  assert.equal((await storage(['server'])).server,APP,'refused page changed nothing');await other.close();
  // A page Chrome does not connect at all (not in externally_connectable) has no messaging.
  const ip=await ctx.newPage();await ip.goto(`http://127.0.0.1:${PORT}/manifest.webmanifest`);
  assert.equal(await ip.evaluate(()=>typeof (globalThis as any).chrome?.runtime?.sendMessage),'undefined','non-listed origin cannot message the extension');await ip.close();
  assert.equal(await sw.evaluate(()=>(globalThis as any).scoutDebug.originAllowed('http://evil.example')),false);
  assert.equal(await sw.evaluate(()=>(globalThis as any).scoutDebug.originAllowed('http://localhost:1234')),true);
  // 5. Right after install the extension reloads app tabs waiting on the install steps (?scout-wait=1), and the card reopens.
  const wait=await ctx.newPage();await wait.goto(APP+'/?scout-wait=1',{waitUntil:'domcontentloaded'});
  const reloaded=await sw.evaluate(()=>(globalThis as any).scoutDebug.reloadWaitingTabs());assert.ok(reloaded>=1,'waiting tab reloaded: '+reloaded);
  await wait.locator('.kitchen-hub .scout-pair-card [data-scout-state="paired"]').waitFor({timeout:30000});
  await until(async()=>!new URL(wait.url()).searchParams.has('scout-wait'),5000,'scout-wait marker removed');await wait.close();
  assert.deepEqual(pageErrors,[]);
  console.log('PASS v1.7 easy install: detection, Pair now end-to-end (device appears, token never on the page), manual code fallback, sender-origin refusal, one-tap store name, reopen after install');

  // ================= v1.7 remote control: Studio Run now + Stop, fast pace still one page at a time =================
  {const devId=extSt.deviceId,dow=new Date(Date.now()+3*86400000).getDay();
   await scoutLib.saveNetwork(getStoreFn,{autoScout:'on'},'henrynguyen',Date.now());
   await scoutLib.editDevice(getStoreFn,devId,(d:any)=>({...d,autoAllowed:true,stores:{woolworths:'Hurstville'},schedule:[{days:[dow],start:'00:00',end:'00:30'}],pacing:{minMs:3000,maxMs:3500}}));// outside its window; Very fast pace
   await setStorage({autoEnabled:true,testPacing:null,lastRun:null,stopRun:0});
   cfg.version='e2e-3';cfg.retailers.woolworths.specials=[3,4,5,6].map(n=>base('woolworths')+'/shop/browse/specials/half-price?page='+n);await store.setJSON('config/override',{config:cfg});
   // Retire the earlier challenge fixture task (released when the first device was blocked).
   {const day=scoutLib.dayKey(Date.now());await scoutLib.ensurePlan(getStoreFn,{settings:await scoutLib.networkSettings(getStoreFn,env),now:Date.now(),adapter});for(const t of await scoutLib.listTasks(getStoreFn,day))if(t.url.includes('/challenge'))await store.setJSON(`tasks/${day}/${t.taskId}`,{...t,status:'done'})}
   assert.equal(await sw.evaluate(()=>(globalThis as any).scoutDebug.canStart()),'outside-window','no grant → waits for its window');
   // Studio: Run now (grant + queued command), delivered with the next heartbeat.
   await scoutLib.grantRunNow(getStoreFn,devId,'henrynguyen',Date.now());const cmd=await scoutLib.queueCommand(getStoreFn,devId,'run-now',{},'henrynguyen',Date.now());
   const v0=visits.length;await sw.evaluate(()=>(globalThis as any).scoutDebug.heartbeat());
   await until(async()=>(await storage(['run'])).run,15000,'run started by the Run now command');
   await until(async()=>((await scoutLib.getDevice(getStoreFn,devId)).commands||[]).find((c:any)=>c.id===cmd.id)?.status==='done',15000,'command acknowledged');
   await until(async()=>visits.slice(v0).filter(v=>v.host==='woolworths.scout.test').length>=2||(await storage(['lastRun'])).lastRun,40000,'two pages at the fast pace');
   {const early=(await storage(['lastRun'])).lastRun;assert.equal(early,null,'run ended before two pages: '+JSON.stringify(early)+' tasks '+JSON.stringify((await scoutLib.listTasks(getStoreFn,scoutLib.dayKey(Date.now()))).map((t:any)=>[t.status,t.url.slice(-30),t.leasedBy===devId])))}
   const pop3=await ctx.newPage();await pop3.setViewportSize({width:375,height:700});await pop3.goto(`chrome-extension://${id}/popup.html`);await pop3.locator('[data-run-status]').waitFor();assert.match(await pop3.locator('[data-run-status]').innerText(),/Đang chạy · \d+\/150 trang/);assert.equal(await pop3.locator('#stoprun').count(),1);
   // Studio: Stop → obeyed within one heartbeat.
   await scoutLib.stopRun(getStoreFn,devId,Date.now());await scoutLib.queueCommand(getStoreFn,devId,'stop',{},'henrynguyen',Date.now());await sw.evaluate(()=>(globalThis as any).scoutDebug.heartbeat());
   const lr=await until(async()=>(await storage(['lastRun'])).lastRun,20000,'run stopped');assert.equal(lr.stop,'stopped',JSON.stringify(lr));
   const fast=visits.slice(v0).filter(v=>v.host==='woolworths.scout.test');assert.ok(fast.length>=2&&fast.length<4,'stopped before the end: '+fast.length);
   for(let i=1;i<fast.length;i++){const gap=fast[i].at-fast[i-1].at;assert.ok(gap>=3000,'still paced ≥ 3 s, one page at a time: '+gap)}
   assert.equal(new Set(fast.map(v=>v.path)).size,fast.length,'each page once');
   await until(async()=>(await ctx.pages()).every((p:any)=>!p.url().includes('runner.html')),15000,'runner window closed');
   // The live status reached the server (heartbeat each minute; here forced).
   await sw.evaluate(()=>(globalThis as any).scoutDebug.heartbeat());const live=scoutLib.liveStatus(await scoutLib.getDevice(getStoreFn,devId),await scoutLib.networkSettings(getStoreFn,env),Date.now());
   assert.equal(live.online,true);assert.equal(live.lastRun.stop,'stopped');assert.equal(live.pace.minMs,3000);assert.equal(live.pace.source,'device');assert.equal(live.chromeOpen,true);
   await pop3.close();
   console.log('PASS v1.7 remote control in the extension: Run now command → run outside the window, Very fast pace still sequential (≥ 3 s), Stop obeyed within one heartbeat, popup status, live status')}

  // ---------- Chrome Web Store / Edge Add-ons screenshots (1280×800) + promo tile ----------
  if(process.env.SCOUT_STORE_SCREENSHOTS==='1'){const dir='docs/scout-store/screenshots';mkdirSync(dir,{recursive:true});
   const st=await ctx.newPage();await st.setViewportSize({width:1280,height:800});
   const frame=async(lang:string,title:string,lead:string,file:string)=>{await setStorage({lang,theme:'light',lastSemi:{at:Date.now(),count:24,accepted:24,retailer:'woolworths',retailerLabel:'Woolworths',store:'Hurstville',pages:1}});await st.goto(`chrome-extension://${id}/options.html`);await st.waitForSelector('#h-check');
    await st.evaluate(([title,lead]:string[])=>{document.body.innerHTML=`<div style="display:flex;gap:56px;align-items:center;justify-content:center;height:800px;background:linear-gradient(135deg,#eaf5ee,#f7f8f6)"><div style="max-width:520px"><p style="font-size:64px;margin:0;color:#1f7a4d">◎</p><h1 style="font-size:44px;margin:8px 0">FamTray Scout</h1><p style="font-size:26px;line-height:1.35;margin:0 0 12px">${title}</p><p style="font-size:19px;color:#56625b;line-height:1.5">${lead}</p></div><iframe src="popup.html" title="popup" style="width:360px;height:620px;border:1px solid #d6ddd8;border-radius:14px;box-shadow:0 12px 40px #0002;background:#fff"></iframe></div>`},[title,lead]);await st.waitForTimeout(800);await st.screenshot({path:`${dir}/${file}`})};
   await frame('vi','Ghi giá kệ siêu thị bạn đang xem cho bếp gia đình.','Chỉ ghi tên, giá, giá theo đơn vị, khuyến mãi và cửa hàng. Không lấy thông tin cá nhân. Tạm dừng bất cứ lúc nào.','1-popup-vi-1280x800.png');
   await frame('en','Saves the shelf prices you view for your family kitchen.','Records name, price, unit price, promotion and store only. No personal data. Pause any time.','2-popup-en-1280x800.png');
   for(const lang of ['vi','en']){await setStorage({lang});await st.goto(`chrome-extension://${id}/options.html`);await st.waitForSelector('#h-check');await st.screenshot({path:`${dir}/${lang==='vi'?3:4}-settings-${lang}-1280x800.png`})}
   await app.setViewportSize({width:1280,height:800});await app.evaluate(()=>document.querySelector('.scout-pair-card')?.scrollIntoView({block:'start'}));await app.screenshot({path:`${dir}/5-pair-now-vi-1280x800.png`});
   await st.setViewportSize({width:440,height:280});await st.evaluate(()=>{document.body.innerHTML='<div style="width:440px;height:280px;display:flex;align-items:center;gap:18px;padding:24px;box-sizing:border-box;background:#1f7a4d;color:#fff"><span style="font-size:96px;line-height:1">◎</span><div><div style="font:700 34px system-ui">FamTray Scout</div><div style="font:18px/1.35 system-ui;margin-top:6px">Shelf prices for your family kitchen · Giá kệ cho bếp gia đình</div></div></div>'});await st.screenshot({path:`${dir}/promo-small-440x280.png`});await st.close();
   console.log('Store screenshots written to '+dir)}
 }finally{await ctx.close();server.close();rmSync(profile,{recursive:true,force:true})}
})().catch(e=>{console.error(e);process.exit(1)});
