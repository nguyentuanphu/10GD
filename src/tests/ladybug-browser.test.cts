// Floating ladybug feedback (v1.7.1) in Chromium against the REAL feedback/studio/accounts handlers (in-memory stores,
// synthetic data; the app's own family sync is stubbed):
//  - visible/hidden per Studio mode (off / assigned / everyone) and role (owner, tester, other account, device-only);
//  - drag → snaps to the nearest side and is remembered; double-click and Home reset; long press tucks it away;
//    it stays above the bottom navigation (320/375) and moves off a dialog's primary button;
//  - send without and with a screenshot (preview, hide a part, JPEG stored); offline queue then send once;
//  - Studio "Góp ý / Feedback": mode, testers, inbox filters, detail, status, reply → reporter sees the reply
//    (badge dot + "My feedback"); VI/EN; light/dark; reduced motion; no horizontal overflow; ≥44 px targets.
// Browser viewport simulation at 320×740, 375×812, 820×1100, 1280×800 — not a claim of testing physical devices.
// Screenshots: docs/reviews/v1.7.1/ladybug/.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,existsSync} from 'node:fs';
import {extname} from 'node:path';
import {chromium} from 'playwright';
const origin='https://kitchen.test',out='docs/reviews/v1.7.1/ladybug';mkdirSync(out,{recursive:true});
const mime:any={'.js':'application/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.json':'application/json','.webmanifest':'application/manifest+json'};
const sizes:any={narrow:{width:320,height:740},mobile:{width:375,height:812},tablet:{width:820,height:1100},desktop:{width:1280,height:800}};
const dim=(s:string)=>`${sizes[s].width}x${sizes[s].height}`;
(async()=>{
 const {memoryStores}=await import('./helpers/accounts.mjs');
 const {createAccountsHandler}=await import('../netlify/lib/accounts.mjs');
 const {createStudioHandler}=await import('../netlify/functions/studio.mjs');
 const {createFeedbackHandler}=await import('../netlify/functions/feedback.mjs');
 const {feedbackStore}=await import('../netlify/lib/feedback.mjs');
 const {resetSettingsCache}=await import('../netlify/lib/studio.mjs');
 const getStoreFn=memoryStores(),env:any={STUDIO_ADMINS:'henrynguyen'};resetSettingsCache();
 const studio=createStudioHandler({getStoreFn,env,limits:{all:5000,mutate:5000}}),accounts=createAccountsHandler({getStoreFn}),feedback=createFeedbackHandler({getStoreFn,env,notify:async()=>({sent:0})});
 const handlers:any={studio,accounts,feedback};
 const call=(fn:any,ep:string,op:string,{method='POST',body,cookie='',headers={}}:any={})=>fn(new Request(`${origin}/.netlify/functions/${ep}?op=${op}`,{method,headers:{Origin:origin,'Content-Type':'application/json','x-nf-client-connection-ip':'b-'+Math.random(),...(cookie?{Cookie:cookie}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})}));
 const reg=async(u:string)=>{const r=await call(accounts,'accounts','register',{body:{username:u,name:u,password:'synthetic-ladybug-browser-42',trust:true}});assert.equal(r.status,201);return r.headers.get('set-cookie')!.split(';')[0]};
 const henry=await reg('henrynguyen'),tina=await reg('tina'),olive=await reg('olive');
 const csrf=(await (await call(studio,'studio','me',{method:'GET',cookie:henry})).json()).csrf;
 const studioPost=(op:string,body:any)=>call(feedback,'feedback',op,{body,cookie:henry,headers:{'x-studio-csrf':csrf}});
 const setMode=async(mode:string)=>assert.equal((await studioPost('studio-mode',{mode})).status,200);
 assert.equal((await studioPost('studio-tester',{username:'tina',grant:true})).status,200);
 const reports=async()=>{const S=feedbackStore(getStoreFn),rows:any[]=[];for await(const p of S.list({prefix:'r/',paginate:true}))for(const b of p.blobs)rows.push(await S.get(b.key,{type:'json'}));return rows};
 const browser=await chromium.launch();
 const route=(page:any,who:any)=>page.route(origin+'/**',async(r:any)=>{const req=r.request(),url=new URL(req.url()),fn=url.pathname.match(/^\/\.netlify\/functions\/([\w-]+)/),op=url.searchParams.get('op')||'';
  if(fn?.[1]==='studio'&&op==='banner')return r.fulfill({json:{banner:null,maintenance:null,minAppEdition:null,flags:{priceScout:true,voice:true,urgentMessages:true,usageAnalytics:false}}});
  if(fn?.[1]==='family'&&op==='status')return r.fulfill({json:who?{configured:true,connected:true,mode:'account',account:{username:who,name:who},household:{id:'qa',name:'QA kitchen',role:'owner'}}:{configured:true,connected:false,mode:'guest'}});
  if(fn&&handlers[fn[1]]&&!(fn[1]==='accounts'&&!['register','login'].includes(op)&&page.url().includes('/#'))){const res=await handlers[fn[1]](new Request(url.href,{method:req.method(),headers:await req.allHeaders(),body:['GET','HEAD'].includes(req.method())?undefined:req.postDataBuffer()}));
   return r.fulfill({status:res.status,headers:Object.fromEntries(res.headers),body:Buffer.from(await res.arrayBuffer())})}
  if(fn){if(op==='families')return r.fulfill({json:{families:[{id:'qa',name:'QA kitchen',role:'owner'}],account:{username:who,name:who},household:{id:'qa'}}});if(op==='members')return r.fulfill({json:{name:'QA kitchen',members:[{username:who,name:who,role:'owner'}],invites:[]}});return r.fulfill({json:op==='state'?{state:null,etag:null}:{announcements:[],devices:[],alerts:[]}})}
  const file='dist'+(url.pathname==='/'?'/index.html':url.pathname);if(existsSync(file))return r.fulfill({status:200,contentType:mime[extname(file)]||'application/octet-stream',body:readFileSync(file)});return r.fulfill({status:404,body:''})});
 const noOverflow=async(page:any,label:string)=>{const w=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.ok(w<=1,label+' horizontal overflow '+w)};
 const shot=async(page:any,name:string)=>{await page.waitForTimeout(120);await page.screenshot({path:`${out}/${name}.png`})};
 const cookieOf=(c:string)=>({name:c.split('=')[0],value:c.split('=').slice(1).join('='),domain:'kitchen.test',path:'/',secure:true,httpOnly:true,sameSite:'Strict' as const});
 async function openApp({who=null,size='mobile',lang='vi',theme='light',motion='reduce',hash='#today'}:any={}){
  const vp=sizes[size],context=await browser.newContext({viewport:vp,serviceWorkers:'block',reducedMotion:motion,colorScheme:theme,hasTouch:size!=='desktop'});
  const cookie=who==='henrynguyen'?henry:who==='tina'?tina:who==='olive'?olive:'';if(cookie)await context.addCookies([cookieOf(cookie)]);
  await context.addInitScript(({lang,theme,who}:any)=>{if(sessionStorage.getItem('qa-init'))return;sessionStorage.setItem('qa-init','1');localStorage.setItem('bep-theme-mode',theme);const scope=who?'account/qa/':'guest/';localStorage.setItem(scope+'bep-language',lang);if(who)localStorage.setItem('bep-account-present','yes');else localStorage.setItem('bep-local-locked','yes')},{lang,theme,who});
  const page=await context.newPage(),errors:string[]=[];page.on('pageerror',(e:any)=>errors.push(e.message));await route(page,who);
  await page.goto(origin+'/'+hash,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>(globalThis as any).bepLadybug&&document.querySelector('#main h1'),null,{timeout:25000});
  await page.evaluate('state.preferences.onboardingComplete=true;save();closeModal();render()');
  await page.evaluate(()=>(globalThis as any).bepLadybug.refresh());
  return{context,page,errors};
 }
 const bug=(page:any)=>page.locator('#ladybug');
 const box=async(page:any)=>(await bug(page).boundingBox())!;
 // Wait until the bug has finished any entrance/placement movement (two equal boxes 150 ms apart).
 const settled=async(page:any)=>{let a=await box(page);for(let i=0;i<40;i++){await page.waitForTimeout(150);const c=await box(page);if(Math.abs(c.x-a.x)<0.5&&Math.abs(c.y-a.y)<0.5)return c;a=c}return a};
 const openSheet=async(page:any)=>{await bug(page).click();await page.waitForSelector('.lb-sheet')};

 // ---------- 1. visible / hidden per mode and role ----------
 {const vis=async(who:any)=>{const {context,page,errors}=await openApp({who});await page.waitForTimeout(150);const v=await page.evaluate(()=>(globalThis as any).bepLadybug.state());assert.deepEqual(errors,[]);await context.close();return v.mounted};
  assert.equal(await vis('henrynguyen'),true,'owner sees it (assigned)');assert.equal(await vis('tina'),true,'tester sees it');assert.equal(await vis('olive'),false,'other account hidden');assert.equal(await vis(null),false,'device-only hidden in assigned');
  await setMode('everyone');assert.equal(await vis(null),true,'device-only sees it in everyone');assert.equal(await vis('olive'),true);
  await setMode('off');assert.equal(await vis('tina'),false,'off hides the tester');assert.equal(await vis('henrynguyen'),true,'owner still sees it when off');
  await setMode('assigned');
  console.log('PASS visibility per mode and role (owner, tester, other account, device-only)');}

 // ---------- 2. drag / snap / reset / tuck away / safe areas ----------
 {const {context,page,errors}=await openApp({who:'tina',size:'mobile'});await bug(page).waitFor();
  let b=await settled(page);const nav=await page.locator('.sidebar').boundingBox();assert.ok(b.y+b.height<=nav!.y-7,'default above the bottom navigation');assert.ok(b.width>=44&&b.height>=44,'≥44 px');assert.ok(b.x+b.width<=375-7,'inside the right edge');
  await page.mouse.move(b.x+26,b.y+26);await page.mouse.down();await page.mouse.move(150,300,{steps:8});await page.mouse.move(120,320,{steps:4});await page.mouse.up();await page.waitForFunction(()=>{const r=document.querySelector('#ladybug')?.getBoundingClientRect();return !!r&&r.x<=10},null,{timeout:3000}).catch(()=>{});
  b=await settled(page);assert.ok(b.x<=10,'snapped to the left side: '+b.x);assert.ok(Math.abs(b.y-294)<12,'kept the height: '+b.y);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('bep-ladybug-pos')||'null'));assert.equal(saved.side,'left');
  assert.equal(await page.locator('.lb-sheet').count(),0,'a drag never opens the sheet');
  // drag far down: never over the navigation
  await page.mouse.move(b.x+26,b.y+26);await page.mouse.down();await page.mouse.move(40,800,{steps:10});await page.mouse.up();await page.waitForTimeout(300);b=await box(page);assert.ok(b.y+b.height<=nav!.y-7,'clamped above the navigation');
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>(globalThis as any).bepLadybug?.state().mounted,null,{timeout:25000});await page.waitForTimeout(200);b=await box(page);assert.ok(b.x<=10,'remembered after reload');
  await bug(page).dblclick();await page.waitForTimeout(450);b=await box(page);assert.ok(b.x>=375-52-12,'double-click puts it back on the right');assert.equal(await page.evaluate(()=>localStorage.getItem('bep-ladybug-pos')),null);
  // long press tucks it away; tap brings it back (and opens the sheet)
  b=await box(page);await page.mouse.move(b.x+20,b.y+20);await page.mouse.down();await page.waitForTimeout(800);await page.mouse.up();await page.waitForTimeout(100);
  assert.equal(await page.evaluate(()=>(globalThis as any).bepLadybug.state().minimized),true,'long press tucks it away');b=await box(page);assert.ok(b.width>=44&&b.height>=44,'tucked tab still ≥44 px');assert.ok(b.x<=1||b.x+b.width>=375-1,'tucked against an edge: '+JSON.stringify(b));
  await shot(page,`bug-tucked-vi-light-mobile-${dim('mobile')}`);
  await bug(page).click();await page.waitForSelector('.lb-sheet');assert.equal(await page.evaluate(()=>(globalThis as any).bepLadybug.state().minimized),false,'tap brings it back');await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.lb-sheet'));
  assert.equal(await page.evaluate(()=>document.activeElement?.id),'ladybug','focus returns to the bug');
  // keyboard: Home resets, Enter opens
  await page.evaluate(()=>(globalThis as any).bepLadybug.setPosition('left',.2));await page.waitForTimeout(50);
  await bug(page).focus();await page.keyboard.press('Home');await page.waitForTimeout(100);b=await box(page);assert.ok(b.x>=375-64,'Home resets');await page.keyboard.press('Enter');await page.waitForSelector('.lb-sheet');await page.keyboard.press('Escape');
  // a dialog's primary button is never covered, even where you put it
  await page.evaluate(()=>{(globalThis as any).modal('Thử','<p>QA</p>','<button class="btn primary" style="position:fixed;right:8px;bottom:140px;width:150px;height:56px">Lưu QA</button>')});
  await page.evaluate(()=>{const b=document.getElementById('ladybug')!,p=document.querySelector('#modal-root .btn.primary')!.getBoundingClientRect(),nav=document.querySelector('.sidebar')!.getBoundingClientRect(),top=8,bottom=nav.top-b.offsetHeight-8;(globalThis as any).bepLadybug.setPosition('right',(p.top+4-top)/(bottom-top))});
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const covered=await page.evaluate(()=>{const b=document.getElementById('ladybug')!.getBoundingClientRect(),p=document.querySelector('#modal-root .btn.primary')!.getBoundingClientRect();return !(b.right<=p.left||b.left>=p.right||b.bottom<=p.top||b.top>=p.bottom)});
  assert.equal(await page.evaluate(()=>(globalThis as any).bepLadybug.state().yielded),true,'it yields');
  assert.equal(covered,false,'the primary button of the open dialog stays uncovered');
  await page.evaluate('closeModal()');assert.deepEqual(errors,[]);await context.close();
  console.log('PASS drag → snap + remember, reload, double-click/Home reset, long-press tuck away, above the navigation, primary button not covered');}

 // ---------- 3. send without a picture; with a screenshot (hide a part); VI/EN; light/dark ----------
 {const {context,page,errors}=await openApp({who:'tina',size:'mobile',lang:'vi',theme:'light'});await bug(page).waitFor();const before=(await reports()).length;
  await openSheet(page);await noOverflow(page,'sheet 375');
  for(const el of await page.locator('.lb-sheet button:visible, .lb-sheet summary:visible').all()){const b=await el.boundingBox();if(b)assert.ok(b.height>=44&&b.width>=44,'sheet target ≥44px: '+(await el.innerText()).slice(0,30))}
  assert.match(await page.locator('.lb-sheet').innerText(),/Gửi góp ý/);assert.ok(!/netlify|blobs/i.test(await page.locator('.lb-sheet').innerText()),'no vendor named');
  await page.locator('[data-type="idea"]').click();assert.equal(await page.locator('[data-type="idea"]').getAttribute('aria-checked'),'true');
  await page.locator('[data-act="send"]').click();assert.equal(await page.locator('#lb-note').getAttribute('aria-invalid'),'true','empty note refused');
  await page.locator('#lb-note').fill('Ý tưởng: thêm nút in danh sách đi chợ (thử nghiệm)');await page.locator('.lb-ctx summary').click();
  assert.match(await page.locator('.lb-ctx').innerText(),/#today/);await shot(page,`sheet-vi-light-mobile-${dim('mobile')}`);
  await page.locator('[data-act="send"]').click();await page.waitForFunction(()=>!document.querySelector('.lb-sheet'));await page.waitForFunction(()=>(globalThis as any).bepLadybug.outbox().length===0);
  let rows=await reports();assert.equal(rows.length,before+1);const r1=rows.find((r:any)=>r.note.includes('nút in'));assert.equal(r1.type,'idea');assert.equal(r1.hasShot,false);assert.equal(r1.ctx.route,'today');assert.equal(r1.ctx.platform,'mobile');assert.equal(r1.reporter.account,'tina');
  // with a screenshot
  await openSheet(page);await page.locator('[data-act="shot"]').click();await page.waitForSelector('#lb-canvas',{timeout:20000});
  assert.equal(await page.locator('#ladybug').evaluate((b:any)=>getComputedStyle(b).visibility),'visible','bug back after capture');
  await page.locator('[data-hide-band="0"]').click();assert.equal(await page.locator('[data-act="undo"]').isDisabled(),false);
  await page.locator('[data-act="hide"]').click();const cv=(await page.locator('#lb-canvas').boundingBox())!;await page.mouse.move(cv.x+20,cv.y+cv.height*.6);await page.mouse.down();await page.mouse.move(cv.x+cv.width*.6,cv.y+cv.height*.8,{steps:5});await page.mouse.up();
  await page.locator('[data-act="hide"]').click();
  await page.locator('#lb-note').fill('Màn hình Hôm nay: chữ bị chồng (thử nghiệm)');await shot(page,`sheet-screenshot-vi-light-mobile-${dim('mobile')}`);
  await page.locator('[data-act="send"]').click();await page.waitForFunction(()=>(globalThis as any).bepLadybug.outbox().length===0&&!document.querySelector('.lb-sheet'));
  rows=await reports();const r2=rows.find((r:any)=>r.note.includes('chồng'));assert.equal(r2.hasShot,true);const sh=await feedbackStore(getStoreFn).get('shot/'+r2.id,{type:'json'});assert.match(sh.data,/^data:image\/jpeg;base64,/);assert.ok(sh.data.length<400000*1.4,'small picture');
  // English, dark: the bug and sheet follow the language switch
  await page.locator('#app-language').click();await page.waitForTimeout(150);assert.match(await bug(page).getAttribute('aria-label'),/Send feedback/);
  await page.evaluate(()=>{localStorage.setItem('bep-theme-mode','dark');document.documentElement.dataset.theme='dark'});
  await openSheet(page);assert.match(await page.locator('.lb-sheet').innerText(),/Send feedback/);await page.locator('#lb-note').fill('draft');await page.locator('#app-language').evaluate((b:any)=>b.click()).catch(()=>{});
  await page.evaluate(()=>changeAppLanguage('vi'));await page.waitForTimeout(100);
  await shot(page,`sheet-vi-dark-mobile-${dim('mobile')}`);
  await page.evaluate(()=>changeAppLanguage('en'));await page.waitForSelector('.lb-sheet');assert.equal(await page.locator('#lb-note').inputValue(),'draft','draft kept across a language switch');
  await page.keyboard.press('Escape');assert.deepEqual(errors,[]);await context.close();
  console.log('PASS send without and with a screenshot (preview, hide parts, JPEG stored), validation, ≥44 px, VI/EN switch keeps the draft');}

 // ---------- 4. offline: queue then send once ----------
 {await setMode('everyone');const {context,page,errors}=await openApp({who:null,size:'narrow',lang:'en',theme:'dark'});await bug(page).waitFor();const before=(await reports()).length;
  let b=await box(page);const nav=await page.locator('.sidebar').boundingBox();assert.ok(b.y+b.height<=nav!.y-7,'320: above the navigation');assert.ok(b.x>=0&&b.x+b.width<=320,'320: on screen');
  await context.setOffline(true);await page.evaluate(()=>dispatchEvent(new Event('offline')));
  await openSheet(page);assert.match(await page.locator('.lb-net').innerText(),/Offline/);assert.match(await page.locator('#lb-status').innerText(),/offline/i);
  await page.locator('[data-type="looks"]').click();await page.locator('#lb-note').fill('Label cut off on a small phone (synthetic)');await noOverflow(page,'sheet 320');await shot(page,`sheet-offline-en-dark-narrow-${dim('narrow')}`);
  await page.locator('[data-act="send"]').click();await page.waitForFunction(()=>!document.querySelector('.lb-sheet'));
  assert.equal(await page.evaluate(()=>(globalThis as any).bepLadybug.outbox().length),1,'queued on the device');assert.equal(await page.locator('#ladybug .lb-n').innerText(),'1','badge shows the waiting report');assert.match(await bug(page).getAttribute('aria-label'),/1 waiting to send/);
  assert.equal((await reports()).length,before,'nothing sent while offline');
  await openSheet(page);await page.locator('[data-tab="mine"]').click();assert.match(await page.locator('#lb-panel-mine').innerText(),/Waiting to send/);await page.keyboard.press('Escape');
  await shot(page,`bug-queued-en-dark-narrow-${dim('narrow')}`);
  await context.setOffline(false);await page.evaluate(()=>{const g:any=globalThis;g.BEP_OFFLINE=false;dispatchEvent(new Event('online'));return Promise.all([g.bepLadybug.flush(),g.bepLadybug.flush()])});
  await page.waitForFunction(()=>(globalThis as any).bepLadybug.outbox().length===0);const rows=await reports();assert.equal(rows.length,before+1,'sent exactly once');const r=rows.find((x:any)=>x.note.includes('Label cut off'));assert.equal(r.ctx.queued,true);assert.equal(r.reporter.account,null);assert.equal(r.ctx.lang,'en');assert.equal(r.ctx.theme,'dark');
  assert.equal(await page.locator('#ladybug .lb-n').isHidden(),true,'badge cleared');assert.deepEqual(errors,[]);await context.close();await setMode('assigned');
  console.log('PASS offline: queued on the device with a badge, sent once when back online (device-only, everyone mode)');}

 // ---------- 5. Studio inbox workflow → reply visible to the reporter ----------
 const target=(await reports()).find((x:any)=>x.note.includes('chồng'));
 let shots=0;
 for(const [size,lang,theme] of [['desktop','vi','light'],['narrow','vi','light'],['mobile','en','dark'],['tablet','vi','dark'],['tablet','en','light'],['desktop','en','dark']] as const){
  const context=await browser.newContext({viewport:sizes[size],reducedMotion:'reduce',colorScheme:theme as any,hasTouch:size!=='desktop'});
  await context.addInitScript(({lang,theme}:any)=>{localStorage.setItem('studio-lang',lang);localStorage.setItem('studio-theme',theme)},{lang,theme});await context.addCookies([cookieOf(henry)]);
  const page=await context.newPage(),errors:string[]=[];page.on('pageerror',(e:any)=>errors.push(e.message));await route(page,'henrynguyen');
  await page.goto(origin+'/studio.html#feedback');await page.waitForSelector('#feedback-main .fb-list');
  const nav=page.locator('#nav a[href="#feedback"]');assert.equal(await nav.getAttribute('aria-current'),'page');assert.match(await nav.innerText(),lang==='en'?/Feedback/:/Góp ý/);
  const text=await page.locator('#feedback-main').innerText();assert.ok(!/netlify|blobs/i.test(text),'no vendor named');assert.match(text,/tina/);assert.match(text,lang==='en'?/Assigned testers/:/Người được chọn/);
  for(const el of await page.locator('#feedback-main select, #feedback-main button').all()){const b=await el.boundingBox();if(b)assert.ok(b.height>=44,'target ≥44px: '+(await el.innerText()).slice(0,30))}
  await noOverflow(page,`studio ${size} ${lang}`);await shot(page,`studio-feedback-${lang}-${theme}-${size}-${dim(size)}`);shots++;
  if(size==='desktop'&&lang==='vi'){
   await page.selectOption('#fb-f select[name=type]','bug');await page.waitForFunction(()=>[...document.querySelectorAll('#feedback-main .fb-kind')].every(k=>/Có lỗi/.test(k.textContent||'')));
   await page.selectOption('#fb-f select[name=type]','');await page.waitForTimeout(150);
   await page.locator(`[data-fb-open="${target.id}"]`).click();await page.waitForSelector('#fb-detail');assert.match(await page.locator('#fb-detail').innerText(),/chữ bị chồng/);
   await page.locator('#fb-shot').click();await page.waitForSelector('.fb-shot img');
   await page.selectOption('#fb-status select[name=status]','triaged');await page.locator('#fb-status button').click();await page.waitForFunction(()=>/Đã xem/.test(document.querySelector('#fb-detail .chip')?.textContent||''));
   await page.locator('#fb-internal textarea').fill('Chỉ xảy ra ở 375 px (nội bộ)');await page.locator('#fb-internal button').click();await page.waitForSelector('.fb-t-note');
   await page.locator('#fb-reply textarea').fill('Cảm ơn bạn! Đã sửa chữ bị chồng.');await page.locator('#fb-reply button').click();await page.waitForSelector('.fb-t-reply');
   await page.evaluate(()=>document.querySelector('#fb-detail')?.scrollIntoView());await shot(page,`studio-feedback-detail-vi-light-desktop-${dim('desktop')}`);shots++;
   // tester list: add + remove olive
   await page.locator('#fb-add input[name=username]').fill('olive');await page.locator('#fb-add button').click();await page.waitForSelector('[data-fb-remove="olive"]');await page.locator('[data-fb-remove="olive"]').click();await page.waitForFunction(()=>!document.querySelector('[data-fb-remove="olive"]'));
   // mode switch saved
   await page.locator('#fb-mode input[value="everyone"]').check();await page.locator('#fb-mode button[type=submit]').click();await page.waitForTimeout(200);await page.locator('#fb-mode input[value="assigned"]').check();await page.locator('#fb-mode button[type=submit]').click();await page.waitForTimeout(200);
   const audit=(await (await call(studio,'studio','audit',{method:'GET',cookie:henry})).json()).items.map((x:any)=>x.action);
   for(const a of ['feedback_view','feedback_view_shot','feedback_update','feedback_tester_add','feedback_tester_remove','feedback_mode'])assert.ok(audit.includes(a),'audited: '+a)}
  if(size==='tablet'&&lang==='en'){await page.locator('#lang').click();await page.waitForFunction(()=>/Hộp thư góp ý/.test(document.querySelector('#feedback-main')?.textContent||''));await noOverflow(page,'after switch')}
  assert.deepEqual(errors,[]);await context.close()}
 console.log(`PASS Studio Feedback: mode, testers add/remove, filters, detail + picture, status, internal note, reply, audit (${shots} screenshots)`);

 // the reporter sees the reply: a dot on the bug, then "My feedback"
 {const {context,page,errors}=await openApp({who:'tina',size:'mobile',lang:'vi',theme:'light',motion:'no-preference'});await bug(page).waitFor();
  await page.waitForFunction(()=>!document.querySelector('#ladybug .lb-new')?.hasAttribute('hidden'));assert.match(await bug(page).getAttribute('aria-label'),/cập nhật mới/);
  assert.equal(await page.locator('#ladybug .lb-art').evaluate((n:any)=>getComputedStyle(n).animationName),'lb-wiggle','gentle wiggle when motion is allowed');
  await shot(page,`bug-new-reply-vi-light-mobile-${dim('mobile')}`);
  await openSheet(page);assert.equal(await page.locator('#lb-tab-mine').getAttribute('aria-selected'),'true','opens on My feedback when there is news');await page.waitForSelector('.lb-replies');
  const mine=await page.locator('#lb-panel-mine').innerText();assert.match(mine,/Cảm ơn bạn! Đã sửa chữ bị chồng/);assert.ok(!mine.includes('nội bộ'),'internal note not shown');assert.match(mine,/Đã xem/);
  await noOverflow(page,'my feedback');await shot(page,`my-feedback-vi-light-mobile-${dim('mobile')}`);
  await page.waitForFunction(()=>document.querySelector('#ladybug .lb-new')?.hasAttribute('hidden'));
  await page.keyboard.press('Escape');assert.deepEqual(errors,[]);await context.close()}
 {const {context,page}=await openApp({who:'tina',size:'mobile',motion:'reduce'});await bug(page).waitFor();await call(feedback,'feedback','studio-update',{body:{id:target.id,reply:'Thêm một trả lời.'},cookie:henry,headers:{'x-studio-csrf':csrf}});await page.evaluate(()=>(globalThis as any).bepLadybug.refresh());
  await page.waitForFunction(()=>!document.querySelector('#ladybug .lb-new')?.hasAttribute('hidden'));assert.equal(await page.locator('#ladybug .lb-art').evaluate((n:any)=>getComputedStyle(n).animationName),'none','no animation with reduced motion');await context.close()}
 // fixed → "Yes, fixed" from the app
 {await call(feedback,'feedback','studio-update',{body:{id:target.id,status:'fixed'},cookie:henry,headers:{'x-studio-csrf':csrf}});const {context,page,errors}=await openApp({who:'tina',size:'tablet',lang:'en',theme:'dark'});await bug(page).waitFor();
  await openSheet(page);await page.waitForSelector('[data-confirm="1"]');await noOverflow(page,'tablet sheet');await shot(page,`my-feedback-fixed-en-dark-tablet-${dim('tablet')}`);
  await page.locator('[data-confirm="1"]').click();await page.waitForFunction(()=>!document.querySelector('[data-confirm="1"]'));assert.equal((await feedbackStore(getStoreFn).get('r/'+target.id,{type:'json'})).status,'closed');assert.deepEqual(errors,[]);await context.close()}
 console.log('PASS reporter sees the reply (dot, My feedback, no internal notes), reduced motion respected, "Yes, fixed" closes it');

 // ---------- 6. responsive evidence: bug + sheet at every size ----------
 for(const [size,lang,theme] of [['narrow','vi','light'],['tablet','vi','light'],['desktop','vi','light'],['desktop','en','dark'],['mobile','en','dark']] as const){
  const {context,page,errors}=await openApp({who:'henrynguyen',size,lang,theme});await bug(page).waitFor();const b=await box(page);
  const side=await page.locator('.sidebar').boundingBox();if(size==='desktop'||size==='tablet')assert.ok(b.x>=side!.x+side!.width,'not over the side navigation');else assert.ok(b.y+b.height<=side!.y-7,'above the bottom navigation');
  await noOverflow(page,'app '+size);await shot(page,`bug-${lang}-${theme}-${size}-${dim(size)}`);
  await openSheet(page);await noOverflow(page,'sheet '+size);const s=(await page.locator('.lb-sheet').boundingBox())!;assert.ok(s.x>=0&&s.x+s.width<=sizes[size].width+1,'sheet inside the screen');await shot(page,`sheet-${lang}-${theme}-${size}-${dim(size)}`);
  assert.deepEqual(errors,[]);await context.close()}
 console.log('PASS responsive: bug and sheet at 320×740, 375×812, 820×1100, 1280×800 (light/dark, VI/EN), no overflow');
 // privacy page section linked from the sheet
 for(const lang of ['vi','en']){const context=await browser.newContext({viewport:sizes.mobile});const page=await context.newPage();await route(page,null);await page.goto(origin+`/privacy.html?lang=${lang}#feedback`);await page.waitForSelector(`main[lang="${lang}"] h1`);
  const t=await page.locator(`main[lang="${lang}"] #${lang==='en'?'feedback-en':'feedback'}`).innerText();for(const w of lang==='en'?['only when you press','13 months','Network addresses are not stored']:['chỉ khi bạn bấm','13 tháng','Không lưu địa chỉ IP'])assert.ok(t.includes(w),lang+': '+w);assert.ok(!/netlify|blobs/i.test(t));await noOverflow(page,'privacy '+lang);await context.close()}
 console.log('PASS privacy page: Góp ý / Feedback section (VI/EN)');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
