// Public owner-console notices in the app: banner (VI/EN, audience, dismiss), maintenance note, update prompt with
// reload, and feature switches (Price Scout / voice / urgent hidden). Device-only mode, browser viewport simulation
// at 375×812, 820×1100 and 1280×800 (+ 320×740 narrow). Screenshots go to docs/reviews/v1.5/studio-hooks/.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const origin='https://kitchen.test',out='docs/reviews/v1.5/studio-hooks';
const mime={'.js':'application/javascript','.css':'text/css','.html':'text/html','.webmanifest':'application/manifest+json','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
const sizes={mobile:{width:375,height:812},tablet:{width:820,height:1100},desktop:{width:1280,height:800},narrow:{width:320,height:740}};
const NOTICE={banner:{id:'qa-b1',vi:'Cuối tuần này có thêm 40 món mới trong kho món ăn.',en:'40 new recipes arrive in the recipe library this weekend.',severity:'info',audience:'all',start:null,end:null},maintenance:null,minAppEdition:'99',signups:'open',flags:{priceScout:true,voice:true,urgentMessages:true,supportRole:false}};
async function main(){
 if(process.env.SKIP_BROWSER_SHOTS!=='1')mkdirSync(out,{recursive:true});
 const browser=await chromium.launch();const shots:string[]=[];
 async function open({viewport=sizes.mobile,lang='vi',theme='light',notice=NOTICE as any,status=200,path='/#today'}={}){
  const context=await browser.newContext({viewport,serviceWorkers:'block',reducedMotion:'reduce',colorScheme:theme as any});
  await context.addInitScript(({lang,theme})=>{if(sessionStorage.getItem('qa-init'))return;sessionStorage.setItem('qa-init','1');localStorage.setItem('bep-theme-mode',theme);localStorage.setItem('guest/bep-language',lang);localStorage.setItem('bep-local-locked','yes')},{lang,theme});
  const page=await context.newPage(),errors:string[]=[],calls:{banner:number}={banner:0};
  page.on('pageerror',e=>errors.push(e.message));
  await page.route(origin+'/**',async route=>{const url=new URL(route.request().url()),p=url.pathname;
   if(p==='/.netlify/functions/studio'&&url.searchParams.get('op')==='banner'){calls.banner++;await route.fulfill(status===200?{json:notice,headers:{'Cache-Control':'public, max-age=60'}}:{status,json:{error:'x'}});return}
   if(p.startsWith('/.netlify/')){await route.fulfill({status:401,json:{error:'no'}});return}
   if(p==='/startup-scripts.json'){await route.fulfill({json:JSON.parse(readFileSync('dist/startup-scripts.json','utf8'))});return}
   const file=resolve('dist',p==='/'?'index.html':p.slice(1));
   try{await route.fulfill({contentType:(mime as any)[extname(file)]||'application/octet-stream',body:readFileSync(file)})}catch{await route.fulfill({status:404,body:'Not found'})}});
  await page.goto(origin+path,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof (globalThis as any).refreshPlatformNotice==='function'&&document.querySelector('#main h1'),null,{timeout:20000});
  await page.evaluate('state.preferences.onboardingComplete=true;save();closeModal();render()');
  await page.waitForTimeout(400);
  return{page,context,errors,calls};
 }
 const noOverflow=async(page:any,label:string)=>{const w=await page.evaluate(()=>[document.documentElement.scrollWidth,innerWidth]);assert.ok(w[0]<=w[1]+1,label+' horizontal overflow '+w)};
 const shot=async(page:any,name:string)=>{if(process.env.SKIP_BROWSER_SHOTS==='1')return;await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`${out}/${name}.png`,fullPage:false});shots.push(name)};

 // VI: banner + update prompt at every size; targets and overflow checked
 for(const [name,viewport] of Object.entries(sizes)){
  const {page,context,errors}=await open({viewport});
  const banner=page.locator('[data-platform-notice="banner"]'),update=page.locator('[data-platform-notice="update"]');
  await banner.waitFor({timeout:5000});assert.match(await banner.innerText(),/40 món mới/);assert.match(await update.innerText(),/Có bản cập nhật — tải lại/);
  assert.equal(await page.locator('#platform-notices').getAttribute('aria-label'),'Thông báo từ ứng dụng');
  for(const b of await page.locator('#platform-notices button').all()){const box=await b.boundingBox();assert.ok(box&&box.width>=44&&box.height>=44,name+' touch target '+JSON.stringify(box))}
  const main=await page.locator('#main').boundingBox(),host=await page.locator('#platform-notices').boundingBox();assert.ok(host&&main&&host.y+host.height<=main.y+1,'notices sit above main content');
  await noOverflow(page,name);await shot(page,`banner-vi-${name}-${viewport.width}x${viewport.height}`);
  assert.deepEqual(errors,[],name+' page errors');await context.close();
 }
 // EN + dark at tablet and desktop; language switch re-renders the banner
 for(const [name,viewport] of [['mobile',sizes.mobile],['tablet',sizes.tablet],['desktop',sizes.desktop]] as const){
  const {page,context,errors}=await open({viewport,lang:'en',theme:name==='mobile'?'light':'dark',notice:{...NOTICE,banner:{...NOTICE.banner,severity:name==='desktop'?'warning':'info'},maintenance:name==='desktop'?'Family sync pauses for 10 minutes at 22:00.':null}});
  await page.locator('[data-platform-notice="banner"]').waitFor();
  assert.match(await page.locator('[data-platform-notice="banner"]').innerText(),/40 new recipes/);
  assert.match(await page.locator('[data-platform-notice="update"]').innerText(),/An update is available — reload/);
  assert.equal(await page.locator('[data-platform-action="reload"]').innerText(),'Reload');
  if(name==='desktop')assert.match(await page.locator('[data-platform-notice="maintenance"]').innerText(),/Maintenance: Family sync pauses/);
  await noOverflow(page,'en '+name);await shot(page,`banner-en-${name==='mobile'?'light':'dark'}-${name}-${viewport.width}x${viewport.height}`);
  await page.evaluate('changeAppLanguage("vi")');await page.waitForTimeout(150);assert.match(await page.locator('[data-platform-notice="banner"]').innerText(),/40 món mới/,'language switch re-renders');
  assert.deepEqual(errors,[]);await context.close();
 }
 // dismiss: banner stays dismissed after reload (per-viewer convenience); update prompt "Later" for this session
 {const {page,context}=await open({viewport:sizes.mobile});
  await page.locator('[data-platform-notice="banner"] [data-platform-action="dismiss"]').click();
  assert.equal(await page.locator('[data-platform-notice="banner"]').count(),0);assert.equal(await page.locator('[data-platform-notice="update"]').count(),1);
  await page.locator('[data-platform-notice="update"] [data-platform-action="dismiss"]').click();assert.equal(await page.locator('#platform-notices').count(),0,'container removed when empty');
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>typeof (globalThis as any).refreshPlatformNotice==='function'&&document.querySelector('#main h1'));await page.waitForTimeout(600);
  assert.equal(await page.locator('[data-platform-notice="banner"]').count(),0,'dismissed banner stays hidden');await context.close()}
 // reload button reloads the app
 {const {page,context}=await open({viewport:sizes.desktop});
  const nav=page.waitForEvent('framenavigated');await page.locator('[data-platform-action="reload"]').click();await nav;await context.close()}
 // audience: account-only banner hidden in device-only mode; no update prompt when edition is current; endpoint failure is silent
 {const {page,context,errors}=await open({notice:{...NOTICE,minAppEdition:'1',banner:{...NOTICE.banner,audience:'account'}}});
  assert.equal(await page.locator('#platform-notices').count(),0);assert.deepEqual(errors,[]);await context.close()}
 {const {page,context,errors}=await open({notice:{...NOTICE,banner:{...NOTICE.banner,audience:'device-only'},minAppEdition:'v-next'}});
  assert.equal(await page.locator('[data-platform-notice="banner"]').count(),1,'device-only audience shown');assert.equal(await page.locator('[data-platform-notice="update"]').count(),0,'non-numeric minimum ignored');await context.close();assert.deepEqual(errors,[])}
 {const {page,context,errors}=await open({status:503});assert.equal(await page.locator('#platform-notices').count(),0);assert.deepEqual(errors,[]);await context.close()}
 // feature switches
 {const flags={priceScout:false,voice:false,urgentMessages:false,supportRole:false};
  const {page,context,errors}=await open({viewport:sizes.tablet,notice:{...NOTICE,banner:null,minAppEdition:null,flags},path:'/#today'});
  for(const cls of ['flag-off-priceScout','flag-off-voice','flag-off-urgentMessages'])assert.ok(await page.evaluate((c:string)=>document.body.classList.contains(c),cls),cls);
  const voice=page.locator('[data-personal="voice"]').first();if(await voice.count())assert.equal(await voice.isVisible(),false,'voice entry hidden');
  await page.evaluate('view="shopping";render()');await page.waitForTimeout(400);
  // Owner, 1 Nov 2026: Price Scout off in Studio hides everything for users — it is not even rendered.
  assert.equal(await page.locator(':is(.price-scout,.scout-tray,.scout-viet-badge)').count(),0,'no Price Scout surface rendered when the flag is off');
  assert.equal(await page.evaluate(()=>[...document.querySelectorAll('[data-scout],[data-voice-price]')].some(n=>(n as HTMLElement).offsetParent!==null)),false,'no visible Price Scout control');
  await shot(page,'flags-off-shopping-tablet-820x1100');
  // switches persist for the next start (applied before the network answers) and turn back on
  await context.close();
  const again=await open({viewport:sizes.tablet,notice:{...NOTICE,banner:null,minAppEdition:null},path:'/#shopping'});
  await again.page.waitForTimeout(300);assert.equal(await again.page.evaluate(()=>document.body.classList.contains('flag-off-priceScout')),false,'flag on again');
  assert.equal(await again.page.locator('.price-scout').first().isVisible(),true);await again.context.close();assert.deepEqual(errors,[])}
 // offline: no request, nothing shown
 {const {page,context,calls}=await open({notice:{...NOTICE}});const before=calls.banner;await context.setOffline(true);await page.evaluate('dispatchEvent(new Event("offline"));refreshPlatformNotice(true)');await page.waitForTimeout(200);assert.equal(calls.banner,before,'no fetch while offline');await context.close()}
 await browser.close();
 console.log('PASS platform notices: VI/EN banner, dismiss, update prompt + reload, audience, maintenance, flags, offline, failure-safe'+(shots.length?' · '+shots.length+' screenshots':''));
}
main().catch(e=>{console.error(e);process.exit(1)});
