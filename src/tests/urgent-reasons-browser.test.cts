// Studio · Tin khẩn / Urgent (v1.7.1) in Chromium against the REAL studio/accounts/family handlers (in-memory
// stores, synthetic data): Overview tile opens the page; reasons aggregated with plain-words reason + fix; list
// rows with counts; filters; owner-only audited family drill-down; support role sees no drill-down; no message
// text anywhere; app urgent panel shows the sender a one-line fix for a failed alert.
// Browser viewport simulation at 320×740, 375×812, 820×1100, 1280×800, VI/EN, light/dark; no horizontal
// overflow; ≥44 px targets. Screenshots: docs/reviews/v1.7.1/urgent-reasons/.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,existsSync} from 'node:fs';
import {extname} from 'node:path';
import {chromium} from 'playwright';
const origin='https://kitchen.test',out='docs/reviews/v1.7.1/urgent-reasons';mkdirSync(out,{recursive:true});
const mime:any={'.js':'application/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.json':'application/json','.webmanifest':'application/manifest+json'};
const sizes:any={narrow:{width:320,height:740},mobile:{width:375,height:812},tablet:{width:820,height:1100},desktop:{width:1280,height:800}};
(async()=>{
 const {memoryStores}=await import('./helpers/accounts.mjs');
 const {createAccountsHandler}=await import('../netlify/lib/accounts.mjs');
 const {createStudioHandler}=await import('../netlify/functions/studio.mjs');
 const {createFamilyHandler}=await import('../netlify/functions/family.mjs');
 const {resetSettingsCache}=await import('../netlify/lib/studio.mjs');
 const getStoreFn=memoryStores(),env:any={STUDIO_ADMINS:'henrynguyen',STUDIO_SUPPORT:'sam',STUDIO_FLAG_SUPPORT_ROLE:'true'};resetSettingsCache();
 let gone=new Set<string>();
 const studio=createStudioHandler({getStoreFn,env,limits:{all:5000,mutate:5000}}),accounts=createAccountsHandler({getStoreFn}),family=createFamilyHandler({getStoreFn,pushSend:async(s:any)=>{if(gone.has(s.endpoint))throw Object.assign(Error('gone'),{statusCode:410});return{statusCode:201}}});
 const handlers:any={studio,accounts};
 const call=(fn:any,ep:string,op:string,{method='POST',body,cookie=''}:any={})=>fn(new Request(`${origin}/.netlify/functions/${ep}?op=${op}`,{method,headers:{Origin:origin,'Content-Type':'application/json','x-nf-client-connection-ip':'b-'+Math.random(),...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})}));
 const reg=async(u:string)=>{const r=await call(accounts,'accounts','register',{body:{username:u,name:u,password:'synthetic-urgent-browser-42',trust:true}});assert.equal(r.status,201);return r.headers.get('set-cookie')!.split(';')[0]};
 const henry=await reg('henrynguyen'),sam=await reg('sam'),alice=await reg('alice'),bob=await reg('bob');
 const mk=async(cookie:string,name:string,members:any[])=>{const r=await call(accounts,'accounts','create-family',{body:{name},cookie});assert.equal(r.status,201);const id=(await r.json()).household.id;assert.equal((await call(family,'family','state',{method:'PUT',cookie,body:{state:{version:1,members,recipes:[],weeks:{},pantry:[],preferences:{},receipts:[]},etag:null}})).status,200);return id};
 const famA=await mk(alice,'Nhà Nguyễn (thử)',[{id:'mum',name:'Mẹ Lan'},{id:'grandma',name:'Bà Ngoại'},{id:'kid',name:'Bé Minh'}]);
 await mk(bob,'Bob test family',[{id:'b1',name:'Bob'}]);
 const sub=(n:string)=>({endpoint:'https://fcm.googleapis.com/fcm/send/ub-'+n,keys:{auth:'a'.repeat(22),p256dh:'b'.repeat(87)}});
 await call(family,'family','push-key',{body:{},cookie:alice});
 assert.equal((await call(family,'family','push-subscribe',{cookie:alice,body:{deviceId:'ub-device-mum',memberId:'mum',subscription:sub('mum')}})).status,200);
 assert.equal((await call(family,'family','push-subscribe',{cookie:alice,body:{deviceId:'ub-device-kid',memberId:'kid',subscription:sub('kid'),shared:true}})).status,200);
 const send=async(id:string,targets:string[])=>assert.equal((await call(family,'family','alert-send',{cookie:alice,body:{id,fromId:'mum',message:'NỘI DUNG BÍ MẬT '+id,targets}})).status,200);
 await send('ub-alert-0001',['grandma']);await send('ub-alert-0002',['kid']);gone=new Set([sub('kid').endpoint]);await send('ub-alert-0003',['kid']);gone=new Set();await send('ub-alert-0004',['grandma']);
 const data=getStoreFn({name:'bep-family-data'});
 await data.setJSON(`households/${famA}/family-alert/ub-old-0001`,{id:'ub-old-0001',fromId:'mum',fromName:'Mẹ Lan',message:'NỘI DUNG BÍ MẬT cũ',targets:['kid'],createdAt:new Date(Date.now()-3*86400000).toISOString(),pushStatus:'not_sent'});
 // a successful one: mum's own device (kid re-registered)
 assert.equal((await call(family,'family','push-subscribe',{cookie:alice,body:{deviceId:'ub-device-kid',memberId:'kid',subscription:sub('kid'),shared:true}})).status,200);await send('ub-alert-0005',['kid']);

 const browser=await chromium.launch();
 const route=(page:any,log?:string[])=>page.route(origin+'/**',async(r:any)=>{const req=r.request(),url=new URL(req.url()),fn=url.pathname.match(/^\/\.netlify\/functions\/([\w-]+)/);
  if(fn?.[1]==='studio'&&url.searchParams.get('op')==='banner')return r.fulfill({json:{banner:null,maintenance:null,minAppEdition:null,flags:{priceScout:true,voice:true,urgentMessages:true,usageAnalytics:false}}});
  if(fn&&handlers[fn[1]]){log?.push(fn[1]+':'+(url.searchParams.get('op')||''));const res=await handlers[fn[1]](new Request(url.href,{method:req.method(),headers:await req.allHeaders(),body:['GET','HEAD'].includes(req.method())?undefined:req.postDataBuffer()}));
   return r.fulfill({status:res.status,headers:Object.fromEntries(res.headers),body:Buffer.from(await res.arrayBuffer())})}
  if(fn)return r.fulfill({status:401,json:{error:'no'}});
  const file='dist'+(url.pathname==='/'?'/index.html':url.pathname);if(existsSync(file))return r.fulfill({status:200,contentType:mime[extname(file)]||'application/octet-stream',body:readFileSync(file)});return r.fulfill({status:404,body:''})});
 const noOverflow=async(page:any,label:string)=>{const w=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.ok(w<=1,label+' horizontal overflow '+w)};
 const shot=async(page:any,name:string)=>{await page.waitForTimeout(80);await page.screenshot({path:`${out}/${name}.png`})};
 const auditCount=async()=>{const r=await call(studio,'studio','audit&type=view_urgent_family',{method:'GET',cookie:henry});return (await r.json()).items.filter((x:any)=>x.action==='view_urgent_family').length};
 async function studioPage(size:string,lang:string,theme:string,cookie=henry){
  const context=await browser.newContext({viewport:sizes[size],reducedMotion:'reduce',colorScheme:theme as any,hasTouch:size!=='desktop'});
  await context.addInitScript(({lang,theme}:any)=>{localStorage.setItem('studio-lang',lang);localStorage.setItem('studio-theme',theme)},{lang,theme});
  await context.addCookies([{name:cookie.split('=')[0],value:cookie.split('=').slice(1).join('='),domain:'kitchen.test',path:'/',secure:true,httpOnly:true,sameSite:'Strict'}]);
  const page=await context.newPage(),errors:string[]=[],log:string[]=[];page.on('pageerror',(e:any)=>errors.push(e.message));await route(page,log);return{context,page,errors,log}}

 let shots=0;
 for(const [size,lang,theme] of [['narrow','vi','light'],['mobile','vi','light'],['mobile','en','dark'],['tablet','vi','dark'],['tablet','en','light'],['desktop','vi','light'],['desktop','en','dark']] as const){
  const {context,page,errors,log}=await studioPage(size,lang,theme);
  await page.goto(origin+'/studio.html#overview');const tile=page.locator('article.tile-urgent');await tile.waitFor();
  const link=tile.locator('.tile-more a');await link.waitFor();assert.equal(await link.getAttribute('href'),'#urgent');
  const lb=await link.boundingBox();assert.ok(lb!.height>=44,'tile link ≥44px');
  if(size==='mobile'&&lang==='vi'){await tile.scrollIntoViewIfNeeded();await shot(page,`overview-tile-${lang}-${theme}-${size}-${sizes[size].width}x${sizes[size].height}`);shots++}
  // the tile itself navigates (click on its heading, not the link)
  await tile.locator('h3').click();await page.waitForFunction(()=>location.hash==='#urgent');await page.waitForSelector('#urgent-main .ur-list, #urgent-main .empty');
  const nav=page.locator('#nav a[href="#urgent"]');assert.equal(await nav.getAttribute('aria-current'),'page');assert.match(await nav.textContent(),lang==='en'?/Urgent messages/:/Tin nhắn khẩn/);// v1.7.2: merged page; on phones/tablets the link sits in the closed menu sheet
  const text=await page.locator('#urgent-main').innerText(),html=await page.content();
  assert.ok(!html.includes('NỘI DUNG BÍ MẬT'),'message text never shown');assert.ok(!/netlify|blobs/i.test(text),'no vendor named');
  assert.ok(!text.includes('Mẹ Lan')&&!text.includes('Bà Ngoại'),'no member names in the list');
  assert.match(text,lang==='en'?/How to fix/:/Cách khắc phục/);
  assert.match(text,lang==='en'?/has not turned notifications on on any device/:/Người nhận chưa bật thông báo trên máy nào/);
  assert.match(text,lang==='en'?/Apple’s\/Google’s notification service refused/:/Dịch vụ thông báo của Apple\/Google từ chối/);
  assert.match(text,lang==='en'?/No details \(older message/:/Không có chi tiết \(tin cũ/);
  assert.match(text,lang==='en'?/Not delivered/:/Không gửi được/);
  const counts=await page.locator('#urgent-main .ur-reasons li .ur-n').allInnerTexts();assert.deepEqual(counts.map(Number).sort(),[1,1,2],'aggregated by reason: no_device ×2, delivery_failed, unknown');
  assert.equal(await page.locator('#urgent-main .ur-row').count(),4,'failed only by default');
  for(const el of await page.locator('#urgent-main select, #urgent-main button').all()){const b=await el.boundingBox();if(b)assert.ok(b.height>=44,'target ≥44px: '+(await el.innerText()).slice(0,30))}
  await noOverflow(page,`urgent ${size} ${lang}`);await page.evaluate(()=>scrollTo(0,0));await shot(page,`studio-urgent-${lang}-${theme}-${size}-${sizes[size].width}x${sizes[size].height}`);shots++;
  if(size==='desktop'&&lang==='vi'){
   // filter: all messages → includes the delivered one
   await page.selectOption('#ur-f select[name=status]','all');await page.waitForFunction(()=>document.querySelectorAll('#urgent-main .ur-row').length===6);assert.match(await page.locator('#urgent-main').innerText(),/Đã gửi/);
   // drill-down: owner-only, audited, shows names
   const before=await auditCount();await page.locator('[data-ur-family]').first().click();await page.waitForSelector('#ur-detail .ur-family');
   const det=await page.locator('#ur-detail').innerText();assert.match(det,/Mẹ Lan/);assert.match(det,/Bà Ngoại: chưa có máy nào bật thông báo/);assert.ok(!(await page.content()).includes('NỘI DUNG BÍ MẬT'));
   assert.equal(await auditCount(),before+1,'drill-down audited');assert.ok(log.includes('studio:urgent-family'));
   await noOverflow(page,'drill-down');await page.evaluate(()=>{const el=document.querySelector('#ur-detail');if(el)scrollTo(0,el.getBoundingClientRect().top+scrollY-20)});await shot(page,`studio-urgent-family-${lang}-${theme}-${size}-${sizes[size].width}x${sizes[size].height}`);shots++}
  if(size==='tablet'&&lang==='en'){// language switch re-renders the page in place
   await page.locator('#navbtn').click();// v1.7.2: on tablets the language button is in the menu sheet
   await page.locator('#lang').click();await page.waitForFunction(()=>/Cách khắc phục/.test(document.querySelector('#urgent-main')?.textContent||''));await noOverflow(page,'after switch')}
  if(size==='mobile'&&lang==='en'){// offline indicator in the shell
   await context.setOffline(true);await page.evaluate(()=>dispatchEvent(new Event('offline')));await page.waitForFunction(()=>/Offline/.test(document.querySelector('#net')?.textContent||''));await context.setOffline(false);await page.evaluate(()=>dispatchEvent(new Event('online')))}
  assert.deepEqual(errors,[]);await context.close();
 }
 // support role: list yes, no drill-down buttons; server refuses the drill-down
 {const {context,page,errors}=await studioPage('mobile','vi','light',sam);await page.goto(origin+'/studio.html#urgent');await page.waitForSelector('#urgent-main .ur-list');
  assert.equal(await page.locator('[data-ur-family]').count(),0,'support sees no drill-down');assert.match(await page.locator('#urgent-main').innerText(),/chỉ dành cho chủ Studio/);
  assert.equal((await call(studio,'studio','urgent-family&id='+famA,{method:'GET',cookie:sam})).status,403);assert.deepEqual(errors,[]);await context.close()}
 console.log(`PASS Studio Urgent: tile opens page, reasons + fixes VI/EN, filters, audited owner drill-down, support gated, no text/names in list (${shots} screenshots)`);

 // app urgent panel: the sender sees a one-line fix for a failed alert (device-only page, alert injected)
 for(const [size,lang,theme] of [['mobile','vi','light'],['tablet','en','dark'],['desktop','vi','dark']] as const){
  const context=await browser.newContext({viewport:sizes[size],serviceWorkers:'block',reducedMotion:'reduce',colorScheme:theme,hasTouch:size!=='desktop'});
  await context.addInitScript(({lang,theme}:any)=>{if(sessionStorage.getItem('qa-init'))return;sessionStorage.setItem('qa-init','1');localStorage.setItem('bep-theme-mode',theme);localStorage.setItem('guest/bep-language',lang);localStorage.setItem('bep-local-locked','yes')},{lang,theme});
  const page=await context.newPage(),errors:string[]=[];page.on('pageerror',(e:any)=>errors.push(e.message));await route(page);
  await page.goto(origin+'/#today',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>typeof (globalThis as any).urgentMarkup==='function'&&document.querySelector('#main h1'),null,{timeout:20000});
  await page.evaluate(`state.preferences.onboardingComplete=true;save();closeModal();const me=activeFamilyMember(),other=state.members.find(m=>m.id!==me.id)||me;alertCache=[{id:'qa-alert-0001',fromId:me.id,fromName:me.name,message:'Tin thử',targets:[other.id],createdAt:new Date().toISOString(),readBy:{},pushStatus:'not_sent',pushReason:'no_device',pushAccepted:0},{id:'qa-alert-0002',fromId:other.id,fromName:other.name,message:'Tin người khác',targets:[me.id],createdAt:new Date(Date.now()-60000).toISOString(),readBy:{},pushStatus:'not_sent',pushReason:'quiet_hours',pushAccepted:0}];familyStorage.setItem('bep-urgent-panel','open');render()`);
  await page.waitForSelector('details.family-urgent[open] .urgent-fix');
  assert.equal(await page.locator('.urgent-fix').count(),1,'only on the sender’s own failed alert');
  assert.match(await page.locator('.urgent-fix').innerText(),lang==='en'?/How to fix: The recipient has not turned notifications on/:/Cách khắc phục: Người nhận chưa bật thông báo trên máy nào/);
  await page.locator('details.family-urgent').scrollIntoViewIfNeeded();await noOverflow(page,'app panel '+size);await shot(page,`app-urgent-hint-${lang}-${theme}-${size}-${sizes[size].width}x${sizes[size].height}`);
  assert.deepEqual(errors,[]);await context.close()}
 console.log('PASS app urgent panel: one-line fix for the sender’s failed alert (VI/EN, 3 sizes)');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
