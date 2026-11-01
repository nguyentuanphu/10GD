// FamTray Scout extension in real Chromium (Manifest V3, --load-extension, new
// headless). Uses the TEST build (dist-extension-test), which only adds the
// *.scout.test hosts (mapped to 127.0.0.1) and allows a short pacing override.
// Verifies: options-page pairing, semi-auto capture + badge + popup summary on a
// fixture page, auto mode visiting tasks one at a time with pacing, robots.txt skip,
// and that a challenge page stops the run and pauses the device for 24 h.
// Saves popup/options screenshots to docs/reviews/v1.6/auto-scout/.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {createServer} from 'node:http';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {chromium} from 'playwright';
const out='docs/reviews/v1.6/auto-scout';mkdirSync(out,{recursive:true});
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
  if(host.endsWith('.scout.test')){
   if(path==='/robots.txt'){res.writeHead(200,{'Content-Type':'text/plain'});res.end(robotsTxt);return}
   if(path.startsWith('/favicon')){res.writeHead(404);res.end();return}
   visits.push({host,path,at:Date.now()});const p=pages[path.split('?')[0]];
   if(p){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(fixture(p));return}
  }
  res.writeHead(404,{'Content-Type':'text/plain'});res.end('not found')});
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',()=>r()));PORT=(server.address() as any).port;
 // Server config override with the test hosts and a specials URL on the local fixture host.
 const cfg=structuredClone(await scoutLib.scoutConfig(getStoreFn));for(const r of Object.keys(cfg.retailers))cfg.retailers[r].hosts.push(r+'.scout.test');
 cfg.version='e2e-1';cfg.retailers.woolworths.specials=[base('woolworths')+'/shop/browse/specials/half-price'];cfg.retailers.woolworths.searchUrl=base('woolworths')+'/shop/search/products?searchTerm={q}';
 const store=scoutLib.scoutStore(getStoreFn);await store.setJSON('config/override',{config:cfg});
 fake.wanted=[{itemId:'nuoc-mam',name:'Fish sauce',families:5},{itemId:'gao',name:'Jasmine rice',families:3}];
 fake.mappings=[{itemId:'nuoc-mam',retailer:'woolworths',productUrl:base('woolworths')+'/shop/productdetails/123456/squid-brand-fish-sauce',productId:'123456',confirmations:3}];
 // Account + pairing code (as Studio / My kitchen would create it).
 const reg=await accounts(new Request('https://app.test/.netlify/functions/accounts?op=register',{method:'POST',headers:{Origin:'https://app.test','Content-Type':'application/json','x-nf-client-connection-ip':'e2e'},body:JSON.stringify({username:'scoutfamily',name:'Scout family',password:'synthetic-e2e-passphrase-42',trust:true})}));assert.equal(reg.status,201);
 const {code}=await scoutLib.createPairCode(getStoreFn,'scoutfamily',Date.now(),env);

 const profile=mkdtempSync(join(tmpdir(),'scout-e2e-'));
 let ctx:any;
 try{ctx=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,viewport:{width:1280,height:800},args:['--disable-extensions-except='+ext,'--load-extension='+ext,'--host-resolver-rules=MAP *.scout.test 127.0.0.1']})}
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
 }finally{await ctx.close();server.close();rmSync(profile,{recursive:true,force:true})}
})().catch(e=>{console.error(e);process.exit(1)});
