// Usage statistics in Chromium (v1.7) against the REAL usage/studio/accounts handlers
// (in-memory stores, synthetic data):
//  app (device-only): active-minute counting (hidden tab and idle time do not count, 30-min
//  session split), flush sends only whitelisted counts, offline queue then flush, opt-out stops
//  sending + clears the queue + asks the server to forget, Studio switch off stops sending,
//  bilingual settings toggle, one-time non-modal "Terms updated" notice, privacy page;
//  Studio "Mức sử dụng / Usage" tab with audited drill-down.
// Browser viewport simulation at 375×812, 820×1100, 1280×800 (+320×740 for the Studio tab),
// light/dark, VI/EN, no horizontal overflow, ≥44 px touch targets. Screenshots: docs/reviews/v1.7/usage/.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,existsSync} from 'node:fs';
import {extname} from 'node:path';
import {chromium} from 'playwright';
const origin='https://kitchen.test',out='docs/reviews/v1.7/usage';mkdirSync(out,{recursive:true});
const mime:any={'.js':'application/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.json':'application/json','.webmanifest':'application/manifest+json'};
const sizes:any={narrow:{width:320,height:740},mobile:{width:375,height:812},tablet:{width:820,height:1100},desktop:{width:1280,height:800}};
(async()=>{
 const {memoryStores}=await import('./helpers/accounts.mjs');
 const {createAccountsHandler}=await import('../netlify/lib/accounts.mjs');
 const {createUsageHandler}=await import('../netlify/functions/usage.mjs');
 const {createStudioHandler}=await import('../netlify/functions/studio.mjs');
 const {usageStore,sydneyDay}=await import('../netlify/lib/usage.mjs');
 const {listLog,dayKey,saveSettings,resetSettingsCache}=await import('../netlify/lib/studio.mjs');
 const getStoreFn=memoryStores(),env:any={STUDIO_ADMINS:'henrynguyen'};resetSettingsCache();
 const usage=createUsageHandler({getStoreFn,env}),studio=createStudioHandler({getStoreFn,env,limits:{all:5000,mutate:5000}}),accounts=createAccountsHandler({getStoreFn});
 const handlers:any={usage,studio,accounts};
 const reg=async(u:string)=>{const r=await accounts(new Request(origin+'/.netlify/functions/accounts?op=register',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','x-nf-client-connection-ip':'r-'+u},body:JSON.stringify({username:u,name:u,password:'synthetic-usage-browser-42',trust:true})}));assert.equal(r.status,201);return r.headers.get('set-cookie')!.split(';')[0]};
 const fam=async(cookie:string,name:string)=>{const r=await accounts(new Request(origin+'/.netlify/functions/accounts?op=create-family',{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json','x-nf-client-connection-ip':'f'},body:JSON.stringify({name})}));assert.equal(r.status,201);return (await r.json()).household.id};
 const browser=await chromium.launch();
 const posts:any[]=[];let banner:any={banner:null,maintenance:null,minAppEdition:null,flags:{priceScout:true,voice:true,urgentMessages:true,usageAnalytics:true}};
 const route=(page:any,{log}:{log?:string[]}={})=>page.route(origin+'/**',async(r:any)=>{const req=r.request(),url=new URL(req.url()),fn=url.pathname.match(/^\/\.netlify\/functions\/([\w-]+)/);
  if(fn?.[1]==='studio'&&url.searchParams.get('op')==='banner')return r.fulfill({json:banner});
  if(fn&&handlers[fn[1]]){const op=url.searchParams.get('op')||'';log?.push(fn[1]+':'+op);if(fn[1]==='usage'&&req.method()==='POST')posts.push({op,body:JSON.parse(req.postData()||'{}'),cookie:!!(await req.allHeaders()).cookie});
   const res=await handlers[fn[1]](new Request(url.href,{method:req.method(),headers:await req.allHeaders(),body:['GET','HEAD'].includes(req.method())?undefined:req.postDataBuffer()}));
   return r.fulfill({status:res.status,headers:Object.fromEntries(res.headers),body:Buffer.from(await res.arrayBuffer())})}
  if(fn)return r.fulfill({status:401,json:{error:'no'}});
  const file='dist'+(url.pathname==='/'?'/index.html':url.pathname);if(existsSync(file))return r.fulfill({status:200,contentType:mime[extname(file)]||'application/octet-stream',body:readFileSync(file)});return r.fulfill({status:404,body:''})});
 const noOverflow=async(page:any,label:string)=>{const w=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.ok(w<=1,label+' horizontal overflow '+w)};
 const shot=async(page:any,name:string)=>{await page.waitForTimeout(80);await page.screenshot({path:`${out}/${name}.png`})};
 async function openApp({viewport=sizes.mobile,lang='vi',theme='light',init=''}:any={}){
  const context=await browser.newContext({viewport,serviceWorkers:'block',reducedMotion:'reduce',colorScheme:theme,hasTouch:viewport.width<1000});
  await context.addInitScript(({lang,theme,init}:any)=>{if(sessionStorage.getItem('qa-init'))return;sessionStorage.setItem('qa-init','1');localStorage.setItem('bep-theme-mode',theme);localStorage.setItem('guest/bep-language',lang);localStorage.setItem('bep-local-locked','yes');if(init)(0,eval)(init)},{lang,theme,init});
  const page=await context.newPage(),errors:string[]=[];page.on('pageerror',(e:any)=>errors.push(e.message));await route(page);
  await page.goto(origin+'/#today',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof (globalThis as any).usageTick==='function'&&document.querySelector('#main h1'),null,{timeout:20000});
  await page.evaluate('state.preferences.onboardingComplete=true;save();closeModal();render()');
  await page.waitForFunction('usageStarted===true',null,{timeout:10000});
  return{context,page,errors};
 }
 const today=sydneyDay(Date.now());

 // ---------- 1. active-minute counting (deterministic clock inside the page) ----------
 {const {context,page,errors}=await openApp();
  const r=await page.evaluate(()=>{const g:any=globalThis,t0=Date.now()+1000;g.usageClear();let hidden=false;Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>hidden?'hidden':'visible'});
   const res:any={};g.usageLastTick=0;g.usageInteract(t0);res.a=g.usageTick(t0+15000);           // visible + recent interaction: 15 s
   hidden=true;res.b=g.usageTick(t0+30000);                                                      // hidden tab: 0
   hidden=false;g.usageLastTick=t0+30000;res.c=g.usageTick(t0+45000);                             // visible, last interaction 45 s ago: 15 s
   res.d=g.usageTick(t0+120000);                                                                // idle > 60 s: 0
   g.usageInteract(t0+125000);res.e=g.usageTick(t0+140000);                                     // interaction again: 15 s
   g.usageInteract(t0+140000+31*60000);                                                         // > 30 min later: new session
   const st=g.usageLoad(),day=st.days[g.usageDayOf(t0)];res.secs=Math.round(day.secs);res.sessions=day.sessions;res.hours=day.hours.reduce((a:number,b:number)=>a+b,0);
   delete (document as any).visibilityState;return res});
  assert.equal(r.a,15000);assert.equal(r.b,0,'hidden tab does not count');assert.equal(r.c,15000);assert.equal(r.d,0,'idle time does not count');assert.equal(r.e,15000);
  assert.equal(r.secs,45);assert.equal(Math.round(r.hours),45,'hour histogram matches');assert.equal(r.sessions,2,'new session after 30 min');
  // real events: a tap marks interaction; feature hooks count navigation and entry points
  await page.evaluate('usageLastInteraction=0');await page.locator('#main').click({position:{x:5,y:5}});assert.ok(await page.evaluate('Date.now()-usageLastInteraction<5000'),'pointer interaction recorded');
  await page.evaluate('location.hash="#shopping"');await page.waitForTimeout(200);await page.evaluate('location.hash="#recipes"');await page.waitForTimeout(200);
  const feats=await page.evaluate(()=>{const g:any=globalThis;return g.usageLoad().days[g.usageDayOf(Date.now())]?.features||{}});assert.ok(feats.shopping>=1&&feats.library>=1,'view changes counted '+JSON.stringify(feats));
  // ---------- 2. flush: only whitelisted counts; device-only sends no cookie ----------
  await page.evaluate("state.recipes[0].name='Canh chua bí mật QA';save()");
  posts.length=0;assert.equal(await page.evaluate('usageFlush()'),true);
  const p=posts.find(x=>x.op==='ingest');assert.ok(p,'ingest sent');assert.deepEqual(Object.keys(p.body).sort(),['batch','days','install','lang','platform','postcode','standalone','v','ver']);
  assert.equal(p.cookie,false,'device-only: no account cookie');assert.ok(!JSON.stringify(p.body).includes('Canh chua'),'no recipe content');assert.equal(p.body.platform,'mobile');
  assert.equal(await page.evaluate('usageLoad().pending'),null,'confirmed batch cleared');
  const rows:string[]=[];for await(const pg of usageStore(getStoreFn).list({prefix:'d/',paginate:true}))for(const b of pg.blobs)rows.push(b.key);assert.ok(rows.length>=1,'rollup stored');
  // ---------- 3. offline: queue kept, sent later ----------
  await page.evaluate(()=>{const g:any=globalThis;g.usageFeature('plan')});await context.setOffline(true);posts.length=0;
  assert.equal(await page.evaluate('usageFlush()'),false);assert.equal(posts.length,0,'nothing sent offline');assert.ok(await page.evaluate(()=>{const g:any=globalThis;return Object.keys(g.usageLoad().days).length>0}),'queue kept offline');
  await context.setOffline(false);assert.equal(await page.evaluate('usageFlush()'),true);assert.equal(posts.filter(x=>x.op==='ingest').length,1,'sent after reconnect');assert.equal(posts[0].body.days[0].features.plan,1);
  assert.deepEqual(errors,[]);await context.close()}

 // ---------- 4. settings toggle (VI/EN, 3 sizes) and opt-out ----------
 for(const [size,lang,theme] of [['mobile','vi','light'],['tablet','en','dark'],['desktop','vi','dark']] as const){
  const {context,page,errors}=await openApp({viewport:sizes[size],lang,theme});
  await page.evaluate('otherSettingsModal()');const card=page.locator('#settings-usage');await card.waitFor();
  await card.scrollIntoViewIfNeeded();const box=page.locator('#usage-optin');assert.equal(await box.isChecked(),true,'on by default');
  const text=await card.innerText();assert.match(text,lang==='en'?/Share anonymous usage statistics/:/Gửi thống kê sử dụng ẩn danh/);assert.match(text,lang==='en'?/Details/:/Xem chi tiết/);
  assert.equal(await card.locator('a').getAttribute('href'),'/privacy.html#usage');assert.ok(!/netlify|blobs/i.test(text));
  const lb=await page.locator('label.usage-toggle').boundingBox(),lk=await card.locator('a').boundingBox();assert.ok(lb!.height>=44&&lk!.height>=44,'touch targets');
  await noOverflow(page,'settings '+size);await shot(page,`settings-usage-${lang}-${theme}-${size}-${sizes[size].width}x${sizes[size].height}`);
  if(size==='tablet'){// opt-out: stops sending, clears the queue, server told once to forget
   await page.evaluate(()=>{const g:any=globalThis;g.usageFeature('today');return g.usageFlush()});await page.evaluate(()=>{const g:any=globalThis;g.usageFeature('plan')});const install=await page.evaluate("localStorage.getItem('bep-usage-install')");assert.ok(install);
   posts.length=0;await box.uncheck();await page.waitForFunction(()=>/deletes?|xoá|delete/i.test(document.querySelector('#toast')?.textContent||''));
   assert.deepEqual(posts.map(x=>x.op),['forget']);assert.deepEqual(posts[0].body,{install});
   assert.equal(await page.evaluate("localStorage.getItem('bep-usage-v1')"),null,'local queue cleared');assert.equal(await page.evaluate("localStorage.getItem('bep-usage-install')"),null);
   posts.length=0;assert.equal(await page.evaluate("usageFeature('plan')"),false);assert.equal(await page.evaluate('usageInteract(Date.now()),usageTick(Date.now()+5000)'),0);assert.equal(await page.evaluate('usageFlush()'),false);await page.evaluate('usageFlush({beacon:true})');await page.waitForTimeout(150);assert.equal(posts.length,0,'nothing sent after opt-out');
   await page.evaluate("closeModal();otherSettingsModal()");assert.equal(await page.locator('#usage-optin').isChecked(),false,'stays off');
   await box.check();assert.equal(await page.evaluate("localStorage.getItem('bep-usage-optout')"),null,'turned back on')}
  assert.deepEqual(errors,[]);await context.close();
 }

 // ---------- 5. Studio switch off stops sending for everyone ----------
 {banner={...banner,flags:{...banner.flags,usageAnalytics:false}};const {context,page,errors}=await openApp({viewport:sizes.desktop});
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('bep-platform-flags')||'{}').usageAnalytics===false);
  posts.length=0;assert.equal(await page.evaluate("usageFeature('today')"),false);assert.equal(await page.evaluate('usageFlush()'),false);assert.equal(posts.length,0);
  await page.evaluate('otherSettingsModal()');assert.equal(await page.locator('#usage-optin').isDisabled(),true);assert.match(await page.locator('#settings-usage').innerText(),/tạm ngừng cho mọi người/);
  assert.deepEqual(errors,[]);await context.close();banner={...banner,flags:{...banner.flags,usageAnalytics:true}}}

 // ---------- 6. one-time "Terms updated" notice for existing contributors (non-modal) ----------
 {const init=`localStorage.setItem('guest/bep-price-scout-v1',JSON.stringify({version:1,open:true,postcode:'2220',state:'NSW',prefs:{},local:[],pending:[],pool:null,communityStatus:{termsAcceptedAt:'2026-10-20T00:00:00Z',termsVersion:'2026-11-01',acceptedTermsVersion:'2026-11-draft'}}))`;
  for(const [size,lang,theme] of [['mobile','vi','light'],['tablet','en','light'],['desktop','vi','dark']] as const){
   const {context,page,errors}=await openApp({viewport:sizes[size],lang,theme,init});const n=page.locator('#terms-notice');await n.waitFor({timeout:8000});
   assert.equal(await page.locator('.modal').count(),0,'no modal at startup');assert.match(await n.innerText(),lang==='en'?/Terms updated/:/Điều khoản đã cập nhật/);assert.equal(await n.locator('a').getAttribute('href'),'/privacy.html#community');
   const close=await n.locator('[data-terms-dismiss]').boundingBox();assert.ok(close!.width>=44&&close!.height>=44);await noOverflow(page,'notice '+size);await shot(page,`terms-notice-${lang}-${theme}-${size}-${sizes[size].width}x${sizes[size].height}`);
   // postcode → sent with the batch (state is derived on the server)
   if(size==='mobile'){posts.length=0;await page.evaluate("usageFeature('price-scout');usageFlush()");await page.waitForTimeout(200);assert.equal(posts.find(x=>x.op==='ingest')?.body.postcode,'2220')}
   await n.locator('[data-terms-dismiss]').click();assert.equal(await n.count(),0);
   await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction('typeof usageStarted!=="undefined"&&usageStarted===true',null,{timeout:15000});assert.equal(await page.locator('#terms-notice').count(),0,'dismissed for good');
   assert.deepEqual(errors,[]);await context.close()}}

 // ---------- 7. privacy page ----------
 for(const [size,lang,theme] of [['mobile','vi','light'],['tablet','en','dark'],['desktop','en','light'],['narrow','vi','dark']] as const){
  const context=await browser.newContext({viewport:sizes[size],reducedMotion:'reduce',colorScheme:theme});const page=await context.newPage();await route(page);
  await page.goto(origin+`/privacy.html?lang=${lang}#usage`);await page.waitForSelector(`main[lang="${lang}"] h1`);
  const visible=await page.locator(`main[lang="${lang}"]`).isVisible(),other=await page.locator(`main[lang="${lang==='vi'?'en':'vi'}"]`).isVisible();assert.ok(visible&&!other,'one language shown');
  const body=await page.locator(`main[lang="${lang}"]`).innerText();assert.match(body,lang==='en'?/Updated: 1 Nov 2026/:/Cập nhật: 1\/11\/2026/);
  for(const w of (lang==='en'?['13 months','country and state','Community','On device','FamTray Price Compare']:['13 tháng','quốc gia và bang','Cộng đồng','Trên máy','FamTray So sánh giá']))assert.ok(body.includes(w),'privacy '+lang+' missing '+w);
  assert.ok(!/netlify|blobs/i.test(await page.content()),'no hosting vendor named');assert.ok(!/@[a-z0-9-]+\.[a-z]{2,}/i.test(body),'no invented e-mail');
  await noOverflow(page,'privacy '+size);await shot(page,`privacy-${lang}-${theme}-${size}-${sizes[size].width}x${sizes[size].height}`);
  if(size==='tablet'){await page.locator('[data-set-lang="vi"]').click();assert.equal(await page.locator('main[lang="vi"]').isVisible(),true,'language switch')}
  await context.close()}

 // ---------- 8. Studio "Mức sử dụng / Usage" tab ----------
 const henry=await reg('henrynguyen'),alice=await reg('alice'),minh=await reg('minh');const famA=await fam(alice,'Nhà Alice');await fam(minh,'Nhà Minh');
 {const hrs=(h:number[],s:number)=>{const a=new Array(24).fill(0);for(const x of h)a[x]=s;return a};const geo=(c:string,r:string)=>Buffer.from(JSON.stringify({country:{code:c},subdivision:{code:r},city:'Synthetic'})).toString('base64');
  const send=async(install:string,o:any,{cookie='',g=''}:any={})=>{const r=await usage(new Request(origin+'/.netlify/functions/usage?op=ingest',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...(g?{'x-nf-geo':g}:{}),'x-nf-client-connection-ip':'192.0.2.'+install.length},body:JSON.stringify({v:1,install,batch:'b'+Math.random().toString(36).slice(2,12),ver:'5/20261101',lang:'vi',platform:'mobile',standalone:true,postcode:null,...o})}));assert.equal(r.status,201,await r.text())};
  const D=(n:number)=>dayKey(Date.parse(today+'T00:00:00Z')-n*86400000);
  for(let n=0;n<12;n++)await send('studio-install-alice-0001',{postcode:'2220',days:[{day:D(n),secs:900+n*30,sessions:2,hours:hrs([7,18,19],300),features:{today:2,plan:1,shopping:n%2}}]},{cookie:alice});
  for(let n=0;n<5;n++)await send('studio-install-anon-00001',{platform:'desktop',standalone:false,lang:'en',days:[{day:D(n*2),secs:400,sessions:1,hours:hrs([20,21],200),features:{library:3,'recipe-edit':1}}]},{g:geo('AU','QLD')});
  await send('studio-install-anon-00002',{platform:'tablet',days:[{day:D(3),secs:200,sessions:1,hours:hrs([12],200),features:{'price-scout':2,voice:1}}]},{g:geo('NZ','AUK')})}
 const log:string[]=[];
 for(const [size,lang,theme] of [['narrow','vi','light'],['mobile','vi','light'],['tablet','vi','light'],['desktop','vi','light'],['mobile','en','dark'],['tablet','en','dark'],['desktop','en','dark']] as const){
  const context=await browser.newContext({viewport:sizes[size],reducedMotion:'reduce',colorScheme:theme,hasTouch:size!=='desktop'});
  await context.addInitScript(({lang,theme}:any)=>{localStorage.setItem('studio-lang',lang);localStorage.setItem('studio-theme',theme)},{lang,theme});
  await context.addCookies([{name:henry.split('=')[0],value:henry.split('=').slice(1).join('='),domain:'kitchen.test',path:'/',secure:true,httpOnly:true,sameSite:'Strict'}]);
  const page=await context.newPage(),errors:string[]=[];page.on('pageerror',(e:any)=>errors.push(e.message));log.length=0;await route(page,{log});
  await page.goto(origin+'/studio.html#usage');await page.waitForSelector('#usage-h1');await page.waitForSelector('#usage-main .us-kpis');
  const nav=page.locator('#nav a[href="#usage"]');assert.equal(await nav.getAttribute('aria-current'),'page');assert.match(await nav.innerText(),lang==='en'?/Usage/:/Mức sử dụng/);
  assert.equal(log.filter(x=>x==='usage:studio-usage-overview').length,1,'single summary request');
  const body=await page.locator('#usage-main').innerText();
  for(const w of (lang==='en'?['Daily active (DAU)','Peak hours','Weekly retention','Inactive families','Network only','Family postcode','Devices, versions, languages','Recipe library']:['Người dùng hôm nay (DAU)','Giờ cao điểm','Giữ chân theo tuần','Gia đình không hoạt động','Chỉ theo mạng','Postcode gia đình','Kho món ăn']))assert.ok(body.includes(w),size+' '+lang+' missing '+w);
  assert.ok(!body.includes('Nhà Alice'),'aggregates only by default');assert.ok(!/netlify|blobs/i.test(body),'no hosting vendor named');
  assert.equal(await page.locator('#usage-main .us-heat .c').count(),168,'weekday × hour heatmap');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);if(overflow>1)console.log(await page.evaluate(()=>[...document.querySelectorAll('#usage-main *')].filter((e:any)=>e.getBoundingClientRect().right>innerWidth+1).slice(0,8).map((e:any)=>e.tagName+'.'+e.className+' '+Math.round(e.getBoundingClientRect().right))));assert.ok(overflow<=1,`overflow ${overflow} at ${size}`);
  if(size!=='desktop'){const small=await page.evaluate(()=>[...document.querySelectorAll('#usage-main button,#usage-main select,#usage-main a')].filter((e:any)=>{const r=e.getBoundingClientRect();return r.width&&r.height<44}).map((e:any)=>e.outerHTML.slice(0,80)));assert.deepEqual(small,[],'touch targets '+size)}
  await shot(page,`studio-usage-${lang}-${theme}-${size}-${sizes[size].width}x${sizes[size].height}`);
  if(size==='desktop'&&lang==='vi'){
   // explicit drill-down: inactive list (Nhà Minh never used) → one family's detail; both audited
   const before=(await listLog(getStoreFn,'audit',{now:Date.now(),limit:200,from:dayKey(Date.now()-86400000)})).items.length;
   await page.locator('[data-us-inactive="14"]').click();await page.locator('#us-h-list').waitFor();assert.match(await page.locator('#us-extra').innerText(),/Nhà Minh/);
   await page.evaluate(()=>{const el=document.querySelector('#us-extra');if(el)scrollTo(0,el.getBoundingClientRect().top+scrollY-20)});await shot(page,'studio-usage-inactive-vi-light-desktop-1280x800');
   const after=(await listLog(getStoreFn,'audit',{now:Date.now(),limit:200,from:dayKey(Date.now()-86400000)})).items;assert.equal(after.length,before+1);assert.equal(after.find((x:any)=>x.action==='usage_inactive_list')?.actor,'henrynguyen');
   const d=await (await usage(new Request(origin+`/.netlify/functions/usage?op=studio-usage-detail&family=${famA}`,{headers:{Cookie:henry}}))).json();assert.ok(d.rows.length>=10,'detail for Nhà Alice');
   assert.ok((await listLog(getStoreFn,'audit',{now:Date.now(),limit:200,from:dayKey(Date.now()-86400000)})).items.some((x:any)=>x.action==='usage_drilldown'&&x.target?.id===famA));
   // cached: switching away and back within 60 s does not refetch
   await page.evaluate(()=>{location.hash='#overview'});await page.waitForFunction(()=>!document.querySelector('#usage-main'));const n=log.filter(x=>x==='usage:studio-usage-overview').length;
   await page.evaluate(()=>{location.hash='#usage'});await page.waitForSelector('#usage-main .us-kpis');assert.equal(log.filter(x=>x==='usage:studio-usage-overview').length,n,'client cache ~60 s');
   // language switch re-renders
   await page.locator('#lang').click();await page.locator('#usage-h1:has-text("Usage")').waitFor();
   assert.equal(await page.locator('.privacy-link').getAttribute('href'),'/privacy.html','Studio footer links the privacy page');
  }
  assert.deepEqual(errors,[]);await context.close();
 }
 // Studio Settings shows the usage switch
 {await saveSettings(getStoreFn,{flags:{usageAnalytics:true}});resetSettingsCache()}
 await browser.close();
 console.log('Usage statistics browser: active minutes (hidden/idle excluded, session split), whitelisted flush, offline queue, opt-out + forget, Studio switch off, bilingual toggle, terms notice, privacy page, Studio Usage tab 320/375/820/1280 VI/EN light/dark + audited drill-down — passed.');
})().catch(e=>{console.error(e);process.exit(1)});
