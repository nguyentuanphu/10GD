import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync, mkdirSync} from 'node:fs';
import {resolve, extname} from 'node:path';
import {chromium} from 'playwright';
import {deployedBootstrap} from './fixtures/deployed-bootstrap.cjs';

async function main() {
 const {createAccountsHandler} = await import('../netlify/lib/accounts.mjs');
 const {createFamilyHandler} = await import('../netlify/functions/family.mjs');
 const {createGate} = await import('../netlify/lib/gate.mjs');
 const stores=new Map();let revision=0;
 function getStoreFn({name}) {
  if(stores.has(name))return stores.get(name);
  const rows=new Map(),store={
   async get(k){return structuredClone(rows.get(k)?.data??null)},
   async getWithMetadata(k){return structuredClone(rows.get(k)??null)},
   async setJSON(k,data,options={}){const previous=rows.get(k);if(options.onlyIfNew&&previous||options.onlyIfMatch&&options.onlyIfMatch!==previous?.etag)return{modified:false};const etag=String(++revision);rows.set(k,{data:structuredClone(data),etag});return{modified:true,etag}},
   async set(k,d,o){return this.setJSON(k,d,o)},async delete(k){rows.delete(k)},
   async *list({prefix=''}){yield{blobs:[...rows.keys()].filter(key=>key.startsWith(prefix)).map(key=>({key}))}},
  };stores.set(name,store);return store;
 }
 const mail=[];
 const accounts=createAccountsHandler({getStoreFn,mailer:{configured:()=>true,send:async(kind,email,token)=>{mail.push({kind,email,token})}}}),family=createFamilyHandler({getStoreFn});
 const counters={seed:0,pack:0,auth:0,privateReads:0,privateWrites:0};let origin='';
 const gate=createGate();
 const mime={'.js':'application/javascript','.json':'application/json','.css':'text/css','.html':'text/html','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'};
 const dist=resolve('dist');
 const pending=new Set();
 const server=createServer(async(req,res)=>{
  try {
   const chunks=[];for await(const part of req)chunks.push(part);
   const body=Buffer.concat(chunks),request=new Request(origin+req.url,{method:req.method,headers:req.headers,...(body.length?{body}: {})});
   const url=new URL(request.url);
   const response=await gate(request,{next:async()=>{
    if(url.pathname==='/.netlify/functions/accounts')return accounts(request);
    if(url.pathname==='/.netlify/functions/family'){if(url.searchParams.get('op')!=='status'){if(req.method==='GET')counters.privateReads++;else counters.privateWrites++;}return family(request);}
    if(url.pathname==='/seed.js'){
     counters.seed++;
     if((req.headers.cookie||'').includes('qa-baseline=1')){pending.add(res);res.on('close',()=>pending.delete(res));return new Promise(()=>{});}
    }
    if(url.pathname==='/startup-scripts.json')counters.pack++;
    if(url.pathname==='/bootstrap.js'&&(req.headers.cookie||'').includes('qa-baseline=1'))return new Response(deployedBootstrap,{headers:{'Content-Type':'application/javascript'}});
    if(url.pathname==='/stale-worker.js')return new Response(`self.addEventListener('install',e=>e.waitUntil(self.skipWaiting()));self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));self.addEventListener('fetch',e=>{if(new URL(e.request.url).pathname==='/startup-scripts.json'){e.respondWith(new Promise(()=>{}));e.waitUntil(self.clients.matchAll({includeUncontrolled:true}).then(list=>list.forEach(client=>client.postMessage({qa:'pack-pending'}))))}});`,{headers:{'Content-Type':'application/javascript'}});
    const file=resolve(dist,url.pathname==='/'?'index.html':'.'+url.pathname);
    if(!file.startsWith(dist+'/'))return new Response('',{status:404});
    try{return new Response(readFileSync(file),{headers:{'Content-Type':mime[extname(file)]||'application/octet-stream'}})}catch{return new Response('',{status:404})}
   }});
   res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
  } catch(error) {res.writeHead(500);res.end('Synthetic test server error');console.error(error)}
 });
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 origin='http://kitchen.localhost:'+server.address().port;
 const browser=await chromium.launch({args:['--host-resolver-rules=MAP kitchen.localhost 127.0.0.1']});
 const evidence='docs/reviews/family-hub';mkdirSync(evidence,{recursive:true});let number=0;
 async function newContext(baseline=false){
  const response=await accounts(new Request(origin+'/.netlify/functions/accounts?op=register',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','x-nf-client-connection-ip':'fixture-'+number},body:JSON.stringify({username:'startupqa'+(++number),name:'Synthetic QA',password:'synthetic-startup-passphrase-only',trust:true})}));
  assert.equal(response.status,201);const cookie=response.headers.get('set-cookie').split(';')[0],equal=cookie.indexOf('=');
  const context=await browser.newContext({viewport:{width:375,height:812},serviceWorkers:'allow',reducedMotion:'reduce'});
  await context.addCookies([{name:cookie.slice(0,equal),value:cookie.slice(equal+1),domain:'kitchen.localhost',path:'/'},...(baseline?[{name:'qa-baseline',value:'1',domain:'kitchen.localhost',path:'/'}]:[])]);
  await context.addInitScript(()=>{localStorage.setItem('qa-preserved','keep-family-data');localStorage.setItem('bep-account-present','yes')});
  return context;
 }
 try {
  // Anonymous visitors can work immediately and reload offline with no account.
  for(const [name,viewport] of Object.entries({mobile:{width:375,height:812},tablet:{width:820,height:1100},desktop:{width:1280,height:800}})){
   const context=await browser.newContext({viewport,serviceWorkers:'allow',reducedMotion:'reduce'}),page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   const reads=counters.privateReads,writes=counters.privateWrites;
   await page.goto(origin,{waitUntil:'domcontentloaded'});await page.locator('[data-device-mode]').waitFor();assert.equal(new URL(page.url()).pathname,'/');
   await page.locator('.top-avatar').click();await page.locator('#settings-form input[name=budget]').fill('321');await page.locator('[data-action=submit-form][data-id=settings-form]').click();
   await page.evaluate(()=>{location.hash='shopping'});await page.waitForTimeout(100);assert.match(await page.locator('#main').innerText(),/Đi chợ|Shopping/);
   assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('guest/bep-gia-dinh-v1')).preferences.budget),321);
   if(name==='mobile'){
    await page.goto(origin+'/login?locked=1');await page.getByRole('tab',{name:'Đăng ký',exact:true}).click();await page.locator('#username').fill('guestregistered');await page.locator('#password').fill('GuestSignupPassphrase42');await page.locator('#name').fill('Guest user');await page.locator('#submit').click();await page.locator('#recovery:not([hidden])').waitFor();assert.equal(mail.length,0);await page.locator('#continue').click();await page.locator('[data-device-mode]').waitFor();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('guest/bep-gia-dinh-v1')).preferences.budget),321,'sign-up without email must retain device work');
   }
   await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
   await page.waitForFunction(async()=>!!await(await caches.open('bep-family-v16-family-hub')).match('/startup-scripts.json'));
   await page.screenshot({path:evidence+'/'+name+'-guest.png',fullPage:true});
   await context.setOffline(true);await page.reload({waitUntil:'domcontentloaded'});await page.locator('[data-device-mode]').waitFor();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('guest/bep-gia-dinh-v1')).preferences.budget),321);
   assert.equal(counters.privateReads,reads);assert.equal(counters.privateWrites,writes);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
   await context.close();
  }
  const anonymousApi=await browser.newContext();const privateRead=await anonymousApi.request.get(origin+'/.netlify/functions/family?op=state');assert.equal(privateRead.status(),401);const privateWrite=await anonymousApi.request.put(origin+'/.netlify/functions/family?op=state',{headers:{Origin:origin},data:{state:{},etag:null}});assert.equal(privateWrite.status(),401);await anonymousApi.close();
  console.log('PASS anonymous device tools, real edits and offline reload at mobile/tablet/desktop without private API calls');

  // The authentication card and shared controls must not move between tabs.
  for(const [name,viewport] of Object.entries({narrow:{width:320,height:740},mobile:{width:375,height:812},tablet:{width:820,height:1100},desktop:{width:1280,height:800}})){
   const context=await browser.newContext({viewport,reducedMotion:'reduce'}),page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(origin+'/login?locked=1',{waitUntil:'domcontentloaded'});
   assert.equal(await page.getByRole('tab').count(),2);assert.equal(await page.getByText('Gia đình cũ',{exact:true}).count(),0);
   const geometry=async()=>page.evaluate(()=>Object.fromEntries(['main','#username-field','#password-field','#submit','.tabs'].map(selector=>{const b=document.querySelector(selector).getBoundingClientRect();return[selector,[b.x+scrollX,b.y+scrollY,b.width,b.height]]})));
   const initial=await geometry();await page.locator('#username').fill('typedowner');await page.locator('#password').fill('SyntheticPassphrase42');
   await page.getByRole('tab',{name:'Đăng ký',exact:true}).click();assert.deepEqual(await geometry(),initial,name+' register layout moved');
   await page.locator('#name').fill('Synthetic name');await page.locator('#email').fill('invalid-email');
   assert.equal(await page.locator('#email').evaluate(input=>input.required),false);await page.screenshot({path:evidence+'/'+name+'-register.png',fullPage:true});
   await page.getByRole('tab',{name:'Đăng nhập',exact:true}).click();assert.deepEqual(await geometry(),initial,name+' login layout moved');
   assert.equal(await page.locator('#username').inputValue(),'typedowner');assert.equal(await page.locator('#password').inputValue(),'SyntheticPassphrase42');
   assert.equal(await page.locator('#login').evaluate(form=>form.checkValidity()),true,'hidden registration fields must not block login');
   await page.screenshot({path:evidence+'/'+name+'-login.png',fullPage:true});
   await page.locator('#forgot').click();assert.deepEqual((await geometry()).main,initial.main,name+' reset card changed its document position');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
   await context.close();
  }
  console.log('PASS stable login/register/reset card and control coordinates, retained input, keyboard-safe fields, no overflow at 320/375/820/1280 widths');

  // Run the UI against real account handlers with a mocked mail transport.
  const emailContext=await browser.newContext(),emailPage=await emailContext.newPage();
  await emailPage.goto(origin+'/login?locked=1');await emailPage.getByRole('tab',{name:'Đăng ký',exact:true}).click();
  await emailPage.locator('#username').fill('browsermail');await emailPage.locator('#password').fill('SyntheticUiPassword42');await emailPage.locator('#name').fill('Synthetic UI');await emailPage.locator('#email').fill('ui@example.test');await emailPage.locator('#submit').click();
  await emailPage.locator('#recovery:not([hidden])').waitFor();assert.match(await emailPage.locator('#result-message').innerText(),/Tài khoản đã được tạo/);assert.equal(mail.length,0);
  await emailPage.locator('#forgot').click();await emailPage.locator('#username').fill('browsermail');await emailPage.locator('#submit').click();await emailPage.getByText(/Nếu tài khoản có email khôi phục, yêu cầu khôi phục/).waitFor();
  const resetMail=mail.at(-1);assert.equal(resetMail.kind,'reset');
  await emailPage.goto(origin+'/login?reset='+resetMail.token+'&locked=1');await emailPage.locator('#password').fill('SyntheticUiChangedPassword42');await emailPage.locator('#submit').click();await emailPage.locator('#recovery:not([hidden])').waitFor();assert.match(await emailPage.locator('#result-message').innerText(),/Mật khẩu đã được đổi/);
  await emailPage.goto(origin+'/login?locked=1&return='+encodeURIComponent('/\\evil.example/'));await emailPage.locator('#username').fill('browsermail');await emailPage.locator('#password').fill('SyntheticUiChangedPassword42');await emailPage.locator('#submit').click();await emailPage.waitForURL(url=>url.origin===origin&&url.pathname==='/',{waitUntil:'domcontentloaded'});assert.equal(new URL(emailPage.url()).origin,origin);
  await emailContext.close();
  console.log('PASS registration without verification and optional email reset (mail transport mocked)');

  const old=await newContext(true),oldPage=await old.newPage();await oldPage.clock.install();
  const previousSeeds=counters.seed;await oldPage.goto(origin,{waitUntil:'domcontentloaded'});const seedDeadline=Date.now()+10000;while(counters.seed===previousSeeds&&Date.now()<seedDeadline)await new Promise(r=>setTimeout(r,20));assert(counters.seed>previousSeeds,'seed request must actually be pending before advancing its timeout');await oldPage.clock.fastForward(16000);
  await oldPage.getByRole('alert').waitFor();assert.match(await oldPage.getByRole('alert').innerText(),/seed.js/);
  await oldPage.getByRole('link',{name:'Đăng nhập / Sign in'}).click();
  await oldPage.waitForURL(url=>url.pathname==='/login',{waitUntil:'domcontentloaded'});
  assert.equal(await oldPage.locator('input[type=password]').count(),1);
  await old.close();
  console.log('PASS previous loader seed timeout reproduced; public sign-in now opens directly');

  const context=await newContext(),page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const seedsBefore=counters.seed,packsBefore=counters.pack;
  await page.goto(origin,{waitUntil:'domcontentloaded'});await page.locator('[data-device-mode]').waitFor();
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  await page.waitForFunction(async()=>{
   const access=await caches.open('bep-family-access-v1');if(!await access.match('/offline-access'))return false;
   const cache=await caches.open('bep-family-v16-family-hub');return !!await cache.match('/startup-scripts.json');
  });
  assert.equal(counters.seed,seedsBefore,'startup and worker must not fetch seed.js separately');
  assert.ok(counters.pack>packsBefore);
  await page.reload({waitUntil:'domcontentloaded'});await page.locator('[data-device-mode]').waitFor();
  await page.screenshot({path:evidence+'/authenticated-worker.png',fullPage:true});
  await page.getByRole('button',{name:'Kết nối gia đình',exact:true}).click();await page.locator('.account-security > summary').click();await page.locator('#account-email-address').fill('existing-browser@example.test');await page.locator('#account-email-password').fill('synthetic-startup-passphrase-only');await page.locator('#account-email button').click();await page.getByText('Đã lưu email khôi phục. Không cần xác minh khi đăng ký.',{exact:true}).waitFor();await page.keyboard.press('Escape');
  await context.setOffline(true);await page.reload({waitUntil:'domcontentloaded'});await page.locator('[data-device-mode]').waitFor();
  assert.equal(await page.evaluate(()=>localStorage.getItem('qa-preserved')),'keep-family-data');
  assert.deepEqual(errors,[]);
  await context.setOffline(false);await page.goto(origin+'/?connect=1',{waitUntil:'domcontentloaded'});await page.locator('[data-device-mode]').waitFor();
  const guestBudget=await page.evaluate(()=>JSON.parse(localStorage.getItem('guest/bep-gia-dinh-v1')).preferences.budget);
  await page.getByRole('button',{name:'Kết nối gia đình',exact:true}).click();await page.locator('[data-personal=new-family]').click();await page.locator('#house-name').fill('Synthetic shared family');await page.locator('#account-create button').click();
  await page.waitForFunction(()=>globalThis.BEP_SESSION?.household?.id&&localStorage.getItem('account/'+globalThis.BEP_SESSION.household.id+'/bep-gia-dinh-v1'));
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('guest/bep-gia-dinh-v1')).preferences.budget),guestBudget);
  await page.waitForFunction(()=>!cloudConnection.checking&&!cloudConnection.syncing);await page.keyboard.press('Escape');
  await page.locator('.top-avatar').click();await page.locator('#settings-form input[name=budget]').fill('777');await page.locator('[data-action=submit-form][data-id=settings-form]').click();await page.waitForFunction(()=>!cloudConnection.dirty&&!cloudConnection.syncing);
  const familyId=await page.evaluate(()=>globalThis.BEP_SESSION.household.id),ownerUsername=await page.evaluate(()=>accountSession.account.username);
  for(const [size,viewport] of Object.entries({narrow:{width:320,height:740},mobile:{width:375,height:812},tablet:{width:820,height:1100},desktop:{width:1280,height:800}})){
   await page.setViewportSize(viewport);await page.evaluate(()=>{location.hash='today'});await page.waitForTimeout(100);
   await page.locator('.kitchen-action-dock [data-personal=invite]').waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,size+' header overflow');
   assert.equal(await page.locator('.kitchen-glow').first().evaluate(el=>getComputedStyle(el,'::before').animationName),'none');
   await page.screenshot({path:evidence+'/'+size+'-family-actions.png',fullPage:true});
   await page.locator('.kitchen-action-dock [data-personal=invite]').click();await page.locator('#account-invite button').click();await page.locator('#invite-result textarea').waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,size+' invitation overflow');assert.equal(await page.locator('.invite-share-grid .btn').count(),4);await page.screenshot({path:evidence+'/'+size+'-invitation.png',fullPage:true});await page.keyboard.press('Escape');
   await page.evaluate(()=>{void accountsModal()});await page.locator('.family-hub-summary [data-personal=invite]').waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,size+' family dialog overflow');await page.screenshot({path:evidence+'/'+size+'-family-dialog.png',fullPage:true});await page.keyboard.press('Escape');
   await page.evaluate(()=>{location.hash='shopping'});await page.waitForTimeout(100);const notes=await page.locator('.shopping-entry-actions [data-feature=notes-import]').boundingBox(),products=await page.locator('.shopping-entry-actions [href="#products"]').boundingBox();assert(Math.abs(notes.y-products.y)<1);assert(Math.abs(notes.height-products.height)<1);
   await page.screenshot({path:evidence+'/'+size+'-shopping-actions.png',fullPage:true});
   await page.evaluate(()=>{void pushSettings()});await page.locator('#push-label').waitFor();const person=await page.locator('#push-member').boundingBox(),device=await page.locator('#push-label').boundingBox();if(Math.abs(person.x-device.x)>10)assert(Math.abs(person.y-device.y)<1,size+' device fields misaligned');assert(Math.abs(person.height-device.height)<1);assert(!/netlify/i.test(await page.locator('body').innerText()));await page.screenshot({path:evidence+'/'+size+'-notifications.png',fullPage:true});await page.keyboard.press('Escape');
   await page.locator('#app-language').click();assert(!/netlify/i.test(await page.locator('body').innerText()));await page.locator('#app-language').click();
  }
  await page.emulateMedia({reducedMotion:'no-preference'});assert.equal(await page.locator('.kitchen-glow').first().evaluate(el=>getComputedStyle(el,'::before').animationName),'kitchen-orbit');await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(()=>{location.hash='today'});await page.waitForTimeout(100);await page.locator('.kitchen-action-dock [data-personal=invite]').click();await page.locator('#account-invite button').click();await page.locator('#invite-result textarea').waitFor();const invitation=await page.locator('#invite-result textarea').inputValue();
  assert((await page.getByRole('link',{name:'Email',exact:true}).getAttribute('href')).startsWith('mailto:'));assert((await page.getByRole('link',{name:'SMS',exact:true}).getAttribute('href')).startsWith('sms:'));
  await page.evaluate(()=>Object.defineProperty(navigator,'share',{configurable:true,value:async payload=>{globalThis.__sharedInvitation=payload}}));await page.getByRole('button',{name:'Messenger',exact:true}).click();const shared=await page.evaluate(()=>globalThis.__sharedInvitation);assert(new URL(shared.url).searchParams.get('invite')===invitation);
  await page.screenshot({path:evidence+'/owner-invitation.png',fullPage:true});await page.keyboard.press('Escape');
  const recipient=await browser.newContext({viewport:{width:375,height:812}}),recipientPage=await recipient.newPage();await recipientPage.goto(shared.url);assert.equal(await recipientPage.getByRole('tab',{name:'Đăng ký',exact:true}).getAttribute('aria-selected'),'true');assert.equal(await recipientPage.locator('#invitation-code').inputValue(),invitation);await recipientPage.locator('#username').fill('invitednewuser');await recipientPage.locator('#password').fill('InvitedUserPassphrase42');await recipientPage.locator('#name').fill('New family member');await recipientPage.locator('#submit').click();await recipientPage.locator('#recovery:not([hidden])').waitFor();assert.match(await recipientPage.locator('#result-message').innerText(),/Đã tham gia gia đình/);await recipientPage.locator('#continue').click();await recipientPage.waitForFunction(id=>globalThis.BEP_SESSION?.household?.id===id,familyId);assert.equal(await recipientPage.evaluate(()=>globalThis.BEP_SESSION.household.role),'editor');await recipient.close();
  const desktop=await browser.newContext({viewport:{width:1280,height:800}}),desktopPage=await desktop.newPage();await desktopPage.goto(origin+'/login');await desktopPage.locator('#username').fill(ownerUsername);await desktopPage.locator('#password').fill('synthetic-startup-passphrase-only');await desktopPage.locator('#submit').click();await desktopPage.waitForFunction(id=>globalThis.BEP_SESSION?.household?.id===id,familyId);await desktopPage.waitForFunction(id=>JSON.parse(localStorage.getItem('account/'+id+'/bep-gia-dinh-v1')||'{}').preferences?.budget===777,familyId);await desktop.close();
  console.log('PASS visible invitations, share composers, invitation-link signup/join and fresh desktop family sync');
  await page.goto(origin+'/?mode=guest',{waitUntil:'domcontentloaded'});await page.locator('[data-device-mode]').waitFor();assert.equal(await page.evaluate(()=>globalThis.BEP_SESSION.mode),'guest');assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('guest/bep-gia-dinh-v1')).preferences.budget),guestBudget);
  await context.close();
  console.log('PASS optional family creation and return to retained guest workspace');
  console.log('PASS real account/functions/gate and active service worker: online reload, signed offline launch, no separate seed request');

  async function stalledRecovery() {
   const context=await newContext(),page=await context.newPage();
   await page.goto(origin+'/login?locked=1');
   await page.evaluate(async()=>{await navigator.serviceWorker.register('/stale-worker.js');await navigator.serviceWorker.ready});
   await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
   await page.addInitScript(()=>navigator.serviceWorker.addEventListener('message',e=>{if(e.data?.qa==='pack-pending')globalThis.__qaPackStalled=true}));await page.clock.install();await page.goto(origin,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>globalThis.__qaPackStalled===true);
   // A partially initialized app can leave a backdrop over the failed page.
   await page.evaluate(()=>{const node=document.createElement('div');node.className='modal-backdrop';document.querySelector('#modal-root').append(node);document.body.style.overflow='hidden'});
   await page.clock.fastForward(31000);await page.getByRole('alert').waitFor();
   assert.equal(await page.locator('.modal-backdrop').count(),0);
   assert.equal(await page.evaluate(()=>localStorage.getItem('qa-preserved')),'keep-family-data');
   return{context,page};
  }
  const login=await stalledRecovery();
  await login.page.getByRole('link',{name:'Đăng nhập / Sign in'}).click();
  await login.page.waitForURL(url=>url.pathname==='/login'&&url.searchParams.get('locked')==='1');
  await login.page.locator('input[type=password]').waitFor();await login.context.close();
  const retry=await stalledRecovery();
  await retry.page.screenshot({path:evidence+'/worker-timeout-recovery.png',fullPage:true});
  await retry.page.getByRole('button',{name:'Thử lại / Retry'}).click();
  await retry.page.locator('[data-device-mode]').waitFor();
  assert.equal(await retry.page.evaluate(()=>localStorage.getItem('qa-preserved')),'keep-family-data');
  await retry.context.close();
  console.log('PASS both recovery actions work through real navigation; Retry escapes stalled worker without deleting device data');
 } finally {
  await browser.close();for(const res of pending)res.destroy();server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));
 }
}
main().catch(error=>{console.error(error);process.exitCode=1});
