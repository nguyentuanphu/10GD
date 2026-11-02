// v1.7.3 store detection + manual store entry in the REAL extension (Chromium MV3, test build) and the
// Studio “Sửa cửa hàng” editor, against the real scout/studio/accounts handlers (in-memory stores).
//  * Root cause (owner: “không cho tôi bấm và lưu Wolli Creek vào”): Settings bound its theme handler to
//    every [data-theme] element — including <html data-theme> — so every click re-drew the page and the
//    typed name vanished. Here the name is TYPED with the keyboard (not filled) while the background keeps
//    writing storage, then saved → on the server → readiness ④ ✓.
//  * Inline “Nhập tên cửa hàng” per retailer (error + success), the popup's own box on a supermarket tab.
//  * Detection on fixture pages modelled on the owner's screenshots: ALDI “Current store: 2205, Wolli Creek”
//    → “Use this name”; Woolworths “Pick up: Wolli Creek” rendered 3 s late in a shadow root (re-checked on
//    DOM changes); Coles delivery header → no store (address never read).
//  * Amazon AU / Chemist Warehouse = Online (④ satisfied, heartbeat reports them); warnings only for the
//    current tab's retailer; CW “Login or Sign up” clears a stale signed-in flag.
//  * Studio device card: “Sửa cửa hàng” (owner, audited) at 320/375/820/1280, VI/EN, light/dark.
// Screenshots: docs/reviews/v1.7.3/store-detect/ (browser viewport simulation, not physical devices).
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,mkdtempSync,existsSync} from 'node:fs';
import {createServer} from 'node:http';
import {join,resolve,extname} from 'node:path';
import {tmpdir} from 'node:os';
import {chromium} from 'playwright';
const out='docs/reviews/v1.7.3/store-detect';mkdirSync(out,{recursive:true});
const ext=resolve('dist-extension-test');
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
async function until(fn:()=>Promise<any>,ms=30000,label='condition'){const end=Date.now()+ms;let last:any;while(Date.now()<end){last=await fn();if(last)return last;await sleep(200)}throw new Error('Timed out waiting for '+label+' · last: '+JSON.stringify(last))}
const fx=(n:string)=>readFileSync('src/tests/fixtures/scout/'+n,'utf8');
const mime:any={'.js':'application/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.json':'application/json','.webmanifest':'application/manifest+json'};

(async()=>{
 const {memoryStores}=await import('./helpers/accounts.mjs');
 const {createAccountsHandler}=await import('../netlify/lib/accounts.mjs');
 const {createScoutHandler}=await import('../netlify/functions/scout.mjs');
 const {createStudioHandler}=await import('../netlify/functions/studio.mjs');
 const lib=await import('../netlify/lib/scout.mjs');
 const {listLog,dayKey}=await import('../netlify/lib/studio.mjs');
 const getStoreFn=memoryStores(),env:any={SCOUT_DEV:'1',STUDIO_ADMINS:'henrynguyen'};
 const adapter={async wantedItems(){return[]},async productMappings(){return[]},async lastSeen(){return{}},async catalogItems(){return[]},async publishObservation(){return{placed:false,why:'no-item'}},async holdObservation(){},async recordMappingCandidate(){}};
 const scout=createScoutHandler({getStoreFn,env,adapter}),studio=createStudioHandler({getStoreFn,env,limits:{all:5000,mutate:5000}}),accounts=createAccountsHandler({getStoreFn});
 let PORT=0;
 const page=(host:string,q:URLSearchParams)=>{
  if(host==='woolworths')return fx('store-woolworths.html').replace('__ACCOUNT__','out').replace('__ACCOUNT_TEXT__','<span>Log in or Sign up</span>').replace('__GREETING__','Helping you find great value');// ribbon: ?mode=…&delay=…&shadow=1
  // Coles header as in the owner's live structure; delivery mode labels the same button “Delivery to …”.
  if(host==='coles'){const del=q.get('mode')==='delivery';return fx('store-coles.html').replace('__CHIP__',`<div data-testid="where-and-when-button" class="coles-targeting-WhereAndWhenButton"><button data-testid="where-link" class="coles-targeting-WhereLink fs-mask" ${del?'aria-label="Delivery to Marrickville. Change address"':''}><div class="coles-targeting-WhereAndWhenInfo">Marrickville</div></button><button data-testid="when-link" aria-label="When, Select a time">When</button></div>`)}
  if(host==='aldi')return fx('store-aldi.html');
  if(host==='chemist')return fx('store-chemist.html').replace('__ACCOUNT__','Login or Sign up');
  if(host==='amazon')return fx('store-amazon.html').replace('__HELLO__','Hello, sign in');
  return null};
 const server=createServer(async(req,res)=>{const host=String(req.headers.host||'').split(':')[0],path=String(req.url||'/');
  if(host==='api.scout.test'){const chunks:any[]=[];for await(const c of req)chunks.push(c);const r=await scout(new Request('http://api.scout.test:'+PORT+path,{method:req.method,headers:req.headers as any,body:['GET','HEAD'].includes(req.method!)?undefined:Buffer.concat(chunks)}));res.writeHead(r.status,Object.fromEntries(r.headers));res.end(Buffer.from(await r.arrayBuffer()));return}
  if(host.endsWith('.scout.test')&&!path.startsWith('/robots')&&!path.startsWith('/favicon')){const u=new URL(path,'http://x'),html=page(host.split('.')[0],u.searchParams);if(html){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html);return}}
  res.writeHead(404,{'Content-Type':'text/plain'});res.end('not found')});
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',()=>r()));PORT=(server.address() as any).port;
 const base=(h:string)=>`http://${h}.scout.test:${PORT}`;
 const cfg=structuredClone(await lib.scoutConfig(getStoreFn));for(const r of Object.keys(cfg.retailers))cfg.retailers[r].hosts.push(r+'.scout.test');cfg.version='store-e2e-1';
 await lib.scoutStore(getStoreFn).setJSON('config/override',{config:cfg});
 const reg=async(u:string)=>{const r=await accounts(new Request('https://kitchen.test/.netlify/functions/accounts?op=register',{method:'POST',headers:{Origin:'https://kitchen.test','Content-Type':'application/json','x-nf-client-connection-ip':'r-'+u},body:JSON.stringify({username:u,name:u,password:'synthetic-store-e2e-42',trust:true})}));assert.equal(r.status,201);return r.headers.get('set-cookie')!.split(';')[0]};
 const henry=await reg('henrynguyen');await reg('scoutfamily');
 await lib.setExtensionAllowed(getStoreFn,'scoutfamily',true,'henrynguyen',Date.now());
 const {code}=await lib.createPairCode(getStoreFn,'scoutfamily',Date.now(),env);
 const profile=mkdtempSync(join(tmpdir(),'scout-store-'));let ctx:any;
 try{ctx=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,viewport:{width:1280,height:800},reducedMotion:'reduce',args:['--disable-extensions-except='+ext,'--load-extension='+ext,'--host-resolver-rules=MAP *.scout.test 127.0.0.1']})}
 catch(e:any){if(process.env.CI)throw e;console.log('SKIP scout-store-browser (extension part): extensions cannot be loaded here: '+String(e?.message||e).split('\n')[0]);ctx=null}
 let deviceId='';
 if(ctx)try{
  let [sw]=ctx.serviceWorkers();if(!sw)sw=await ctx.waitForEvent('serviceworker',{timeout:20000});const id=new URL(sw.url()).host;
  const storage=(keys:any)=>sw.evaluate((k:any)=>(globalThis as any).chrome.storage.local.get(k),keys);
  const setStorage=(v:any)=>sw.evaluate((x:any)=>(globalThis as any).chrome.storage.local.set(x),v);
  await until(async()=>(await storage(['semiSites'])).semiSites,10000,'install defaults');await setStorage({lang:'vi',theme:'light'});
  const opt=await ctx.newPage();const errors:string[]=[];opt.on('pageerror',(e:any)=>errors.push(e.message));
  await opt.goto(`chrome-extension://${id}/options.html`);await opt.locator('[data-easy-pair]').waitFor();
  await opt.fill('input[name=server]',`http://api.scout.test:${PORT}`);await opt.fill('input[name=code]',code);await opt.fill('input[name=name]','Store E2E');await opt.fill('input[name=postcode]','2205');await opt.fill('input[name=suburb]','Wolli Creek');
  await opt.click('#pair button[type=submit]');await opt.getByText('Đã ghép nối',{exact:false}).first().waitFor({timeout:15000});
  deviceId=(await storage(['deviceId'])).deviceId;
  const step4=()=>opt.locator('#ready li[data-step="stores"]').getAttribute('data-ok');
  // Amazon AU / Chemist Warehouse capture is on by default → ④ is done without any store; their rows say Online.
  assert.equal(await step4(),'true','④ satisfied by online-priced retailers');
  assert.match(await opt.locator('.store-row[data-retailer="amazon"]').innerText(),/Trực tuyến/);assert.equal(await opt.locator('.store-row[data-retailer="amazon"] [data-store-form]').count(),0,'no store box for online retailers');
  // Switch them off → ④ needs a store.
  await opt.click('#site-chemist');await opt.click('#site-amazon');await until(async()=>(await step4())==='false',10000,'④ open without online retailers');
  assert.equal(await opt.locator('#site-amazon').evaluate((e:any)=>e===document.activeElement),true,'focus stays on the switch after the re-render');
  // Background noise like open supermarket tabs: storage writes every 700 ms.
  await sw.evaluate(()=>{(globalThis as any).__noise=setInterval(()=>(globalThis as any).chrome.storage.local.set({qaNoise:Date.now()}),700)});
  // Responsive evidence: the Stores step with the inline boxes (VI light / EN dark; 375, 820, 1280).
  const shot=async(p:any,name:string)=>{assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth),false,'no horizontal overflow: '+name);await p.screenshot({path:`${out}/${name}.png`})};
  for(const [lang,theme] of [['vi','light'],['en','dark']] as const){await setStorage({lang,theme});
   for(const [w,h] of [[375,812],[820,1100],[1280,800]]){await opt.setViewportSize({width:w,height:h});await opt.reload();await opt.locator('#st-in-woolworths').waitFor();
    if(w===375){const small=await opt.evaluate(()=>[...document.querySelectorAll('#step-stores button,#step-stores input:not([type=checkbox]),#step-stores summary')].filter((e:any)=>{const r=e.getBoundingClientRect();return r.height&&r.height<44}).map((e:any)=>e.outerHTML.slice(0,60)));assert.deepEqual(small,[],'touch targets ≥44 px')}
    await opt.evaluate(()=>document.querySelector('#step-stores')!.scrollIntoView({block:'start'}));await shot(opt,`options-stores-${lang}-${theme}-${w}x${h}`)}}
  await setStorage({lang:'vi',theme:'light'});await opt.setViewportSize({width:1280,height:800});await opt.reload();await opt.locator('#st-in-woolworths').waitFor();
  // Error: too short → message, typed text kept.
  await opt.click('#st-in-coles');await opt.keyboard.type('x');await opt.click('[data-store-form="coles"] button[type=submit]');
  await opt.locator('[data-msg]').getByText('Nhập tên cửa hàng Coles',{exact:false}).waitFor();assert.equal(await opt.inputValue('#st-in-coles'),'x','typed text survives the re-render');
  await opt.fill('#st-in-coles','');
  // THE owner's case: click the box, type “Wolli Creek” key by key while storage keeps changing, press Lưu.
  await opt.click('#st-in-woolworths');await opt.keyboard.type('Wolli Creek',{delay:70});
  assert.equal(await opt.inputValue('#st-in-woolworths'),'Wolli Creek','typed text was not wiped by a re-render');
  await opt.click('[data-store-form="woolworths"] button[type=submit]');
  await opt.locator('[data-msg]').getByText('Đã lưu cửa hàng Woolworths: Wolli Creek.',{exact:true}).waitFor();
  assert.equal((await lib.getDevice(getStoreFn,deviceId)).stores.woolworths,'Wolli Creek','saved on the server');
  await until(async()=>(await step4())==='true',10000,'readiness ④ ✓ after typing a store');
  await opt.locator('#ready [data-ready="woolworths"]').getByText('Woolworths: Wolli Creek').waitFor();
  await opt.screenshot({path:`${out}/options-saved-vi-light-1280x800.png`});
  // The full “Edit store names by hand” form also works with real typing.
  await opt.click('#step-stores [data-edit="stores"]');await opt.click('#store-manual summary');await opt.click('#sm-aldi');await opt.keyboard.type('Wolli Creek',{delay:40});await opt.click('#stores button[type=submit]');
  await opt.locator('[data-msg]').getByText('Đã lưu cửa hàng.',{exact:true}).waitFor();assert.equal((await lib.getDevice(getStoreFn,deviceId)).stores.aldi,'Wolli Creek');
  await lib.editDevice(getStoreFn,deviceId,(x:any)=>({...x,stores:{woolworths:'Wolli Creek'}}));await sw.evaluate(()=>(globalThis as any).scoutDebug.heartbeat());
  // ALDI page: “Current store: 2205, Wolli Creek” → detected → “Use this name”.
  const aldi=await ctx.newPage();await aldi.goto(base('aldi')+'/');
  await until(async()=>(await storage(['warnings'])).warnings.storesSeen.aldi==='Wolli Creek',20000,'ALDI store detected');
  await opt.bringToFront();await opt.reload();await opt.locator('[data-use="aldi"]').click();await until(async()=>(await lib.getDevice(getStoreFn,deviceId)).stores.aldi==='Wolli Creek',10000,'ALDI saved via Use this name');
  // Woolworths SPA: the fulfilment bar appears 3 s after load inside a shadow root → read again on DOM change.
  await setStorage({warnings:{...(await storage(['warnings'])).warnings,storesSeen:{}}});
  const ww=await ctx.newPage();await ww.goto(base('woolworths')+'/?mode=pickup&delay=3000&shadow=1');
  await until(async()=>(await storage(['warnings'])).warnings.storesSeen.woolworths==='Wolli Creek',25000,'late-rendered Woolworths store');
  // Coles delivery header: no store, and the popup offers its own box.
  const coles=await ctx.newPage();await coles.goto(base('coles')+'/?mode=delivery');
  const colesTab=await sw.evaluate(async(u:string)=>(await (globalThis as any).chrome.tabs.query({url:u+'/*'}))[0].id,base('coles'));
  await until(async()=>(await storage(['tabStatus'])).tabStatus?.[colesTab],15000,'Coles tab read');
  assert.equal((await storage(['tabStatus'])).tabStatus[colesTab].storeLabel,null,'delivery header → no store');assert.equal((await storage(['warnings'])).warnings.storesSeen.coles,undefined);
  const pop=await ctx.newPage();await pop.setViewportSize({width:375,height:812});await pop.goto(`chrome-extension://${id}/popup.html?tab=${colesTab}`);
  await pop.locator('#pop-store-in').waitFor();
  assert.equal(await pop.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth),false,'popup: no horizontal overflow');await pop.screenshot({path:`${out}/popup-store-box-vi-light-375x812.png`});
  await pop.click('#pop-store-in');await pop.keyboard.type('Marrickville',{delay:50});await pop.click('#pop-store button[type=submit]');
  await until(async()=>(await lib.getDevice(getStoreFn,deviceId)).stores.coles==='Marrickville',10000,'popup store saved');
  await pop.locator('[data-pop-note]').getByText('Đã lưu cửa hàng Coles: Marrickville.').waitFor();
  // Online retailers + warning scoping.
  await opt.bringToFront();await opt.reload();if(await opt.locator('#step-stores.collapsed').count())await opt.click('#step-stores [data-edit="stores"]');await opt.click('#site-amazon');await opt.click('#site-chemist');
  await sw.evaluate(()=>(globalThis as any).scoutDebug.heartbeat());
  await until(async()=>((await lib.getDevice(getStoreFn,deviceId)).client?.online||[]).includes('amazon'),10000,'heartbeat reports online retailers');
  const dv=await lib.getDevice(getStoreFn,deviceId);assert.deepEqual(lib.effectiveStores(dv).amazon,'Online');
  {const w=(await storage(['warnings'])).warnings;w.signedIn={chemist:true};await setStorage({warnings:w})}
  const cw=await ctx.newPage();await cw.goto(base('chemist')+'/');
  await until(async()=>(await storage(['warnings'])).warnings.signedIn.chemist===undefined,15000,'CW “Login or Sign up” clears the signed-in flag');
  const amz=await ctx.newPage();await amz.goto(base('amazon')+'/');
  const amzTab=await sw.evaluate(async(u:string)=>(await (globalThis as any).chrome.tabs.query({url:u+'/*'}))[0].id,base('amazon'));
  await until(async()=>(await storage(['tabStatus'])).tabStatus?.[amzTab],15000,'Amazon tab read');assert.equal((await storage(['tabStatus'])).tabStatus[amzTab].storeLabel,'Online');
  {const w=(await storage(['warnings'])).warnings;w.signedIn={chemist:true};await setStorage({warnings:w})}
  await pop.goto(`chrome-extension://${id}/popup.html?tab=${amzTab}`);await pop.locator('[data-online-tab]').waitFor();
  assert.ok(!/Chemist Warehouse\. Use|Chemist Warehouse\. Hãy|đăng nhập tài khoản trên Chemist/.test(await pop.locator('#app').innerText()),'CW warning is NOT shown on the Amazon tab');
  assert.equal(await pop.locator('#pop-store').count(),0,'no store box for Amazon');await pop.screenshot({path:`${out}/popup-amazon-online-vi-light-375x812.png`});
  const cwTab=await sw.evaluate(async(u:string)=>(await (globalThis as any).chrome.tabs.query({url:u+'/*'}))[0].id,base('chemist'));
  await pop.goto(`chrome-extension://${id}/popup.html?tab=${cwTab}`);await pop.getByText('Có vẻ bạn đang đăng nhập tài khoản trên Chemist Warehouse',{exact:false}).waitFor();
  await sw.evaluate(()=>clearInterval((globalThis as any).__noise));
  assert.deepEqual(errors,[],'no page errors in Settings');
  // The page text never names the hosting vendor.
  assert.ok(!/netlify|blobs/i.test(await opt.locator('body').innerText()));
  console.log('PASS extension: typed store saved under storage noise → ④ ✓, inline errors, ALDI/Woolworths(late, shadow) detected, Coles delivery not read, popup store box, online retailers, warnings scoped');
 }finally{await ctx.close()}

 // ---------- Studio: “Sửa cửa hàng” on the device card ----------
 if(!deviceId){const {code:c2}=await lib.createPairCode(getStoreFn,'scoutfamily',Date.now(),env);const r=await scout(new Request('https://kitchen.test/.netlify/functions/scout?op=pair',{method:'POST',headers:{Origin:'chrome-extension://mjeoekikdicoojgoppnfibjbfpcfngja','Content-Type':'application/json'},body:JSON.stringify({code:c2,name:'Store E2E',postcode:'2205',version:'1.7.3'})}));deviceId=(await r.json()).device.id}
 await lib.editDevice(getStoreFn,deviceId,(x:any)=>({...x,stores:{woolworths:'Wolli Creek'},client:{...(x.client||{}),online:['amazon','chemist'],version:'1.7.3'}}));
 const browser=await chromium.launch();const origin='https://kitchen.test',handlers:any={scout,studio,accounts};
 const sizes:any={narrow:[320,740],mobile:[375,812],tablet:[820,1100],desktop:[1280,800]};
 try{
  for(const [size,lang,theme] of [['narrow','vi','light'],['mobile','vi','light'],['tablet','en','dark'],['desktop','vi','light'],['desktop','en','dark']]){
   const [w,h]=sizes[size];const context=await browser.newContext({viewport:{width:w,height:h},reducedMotion:'reduce',colorScheme:theme as any,hasTouch:size!=='desktop'});
   await context.addInitScript(({lang,theme}:any)=>{localStorage.setItem('studio-lang',lang);localStorage.setItem('studio-theme',theme)},{lang,theme});
   await context.addCookies([{name:henry.split('=')[0],value:henry.split('=').slice(1).join('='),domain:'kitchen.test',path:'/',secure:true,httpOnly:true,sameSite:'Strict'}]);
   const p=await context.newPage();const errs:string[]=[];p.on('pageerror',(e:any)=>errs.push(e.message));
   await p.route(origin+'/**',async(route:any)=>{const req=route.request(),url=new URL(req.url()),fn=url.pathname.match(/^\/\.netlify\/functions\/(\w+)/);
    if(fn&&handlers[fn[1]]){const r=await handlers[fn[1]](new Request(url.href,{method:req.method(),headers:await req.allHeaders(),body:['GET','HEAD'].includes(req.method())?undefined:req.postDataBuffer()}));return route.fulfill({status:r.status,headers:Object.fromEntries(r.headers),body:Buffer.from(await r.arrayBuffer())})}
    const file='dist'+(url.pathname==='/'?'/index.html':url.pathname);if(existsSync(file))return route.fulfill({status:200,contentType:mime[extname(file)]||'application/octet-stream',body:readFileSync(file)});return route.fulfill({status:404,body:''})});
   await p.goto(origin+'/studio.html#scout');await p.waitForSelector('#sc-rc');
   const card=p.locator(`.rc-dev:has([data-stedit="${deviceId}"])`);await card.waitFor();
   assert.match(await card.locator('.rc-stores').innerText(),lang==='en'?/Amazon AU: Online/:/Amazon AU: Trực tuyến/,'online retailers shown as Trực tuyến / Online');
   await card.locator(`[data-stedit="${deviceId}"] summary`).click();
   const overflow=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.ok(overflow<=1,'Studio overflow '+overflow+' at '+size);
   if(size!=='desktop'){const small=await card.evaluate((c:any)=>[...c.querySelectorAll('.rc-stedit summary,.rc-stform input,.rc-stform button')].filter((e:any)=>e.getBoundingClientRect().height<44).map((e:any)=>e.outerHTML.slice(0,60)));assert.deepEqual(small,[],'Studio touch targets '+size)}
   await card.locator('.rc-stedit').scrollIntoViewIfNeeded();await p.screenshot({path:`${out}/studio-store-edit-${lang}-${theme}-${size}-${w}x${h}.png`});
   if(size==='desktop'&&lang==='vi'){
    await card.locator('input[name="coles"]').click();await p.keyboard.type('Marrickville',{delay:30});
    await card.locator('.rc-stform button[type=submit]').click();await p.waitForFunction(()=>/Đã lưu cửa hàng/.test(document.querySelector('#toast')?.textContent||''));
    assert.equal((await lib.getDevice(getStoreFn,deviceId)).stores.coles,'Marrickville');
    const log=await listLog(getStoreFn,'audit',{now:Date.now(),limit:50,from:dayKey(Date.now()-86400000)});const e=log.items.find((x:any)=>x.action==='scout_device_update');assert.ok(e&&e.details.stores.coles.to==='Marrickville','Studio store edit audited');
    await p.locator(`.rc-dev:has([data-stedit="${deviceId}"]) .rc-stores`).getByText('Coles: Marrickville').waitFor()}
   assert.deepEqual(errs,[],'no Studio page errors');await context.close()}
 }finally{await browser.close();server.close()}
 console.log('PASS Studio: “Sửa cửa hàng” at 320/375/820/1280 (VI/EN, light/dark), saved + audited, Online shown as Trực tuyến');
})().catch(e=>{console.error(e);process.exit(1)});
