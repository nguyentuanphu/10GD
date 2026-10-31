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
 const counters={seed:0,pack:0,auth:0};let origin='';
 const gate=createGate({accountCheck:async request=>{
  counters.auth++;
  const response=await accounts(new Request(origin+'/.netlify/functions/accounts?op=status',{headers:request.headers}));
  return response.ok&&(await response.json()).connected;
 }});
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
    if(url.pathname==='/.netlify/functions/family')return family(request);
    if(url.pathname==='/seed.js'){
     counters.seed++;
     if((req.headers.cookie||'').includes('qa-baseline=1')){pending.add(res);res.on('close',()=>pending.delete(res));return new Promise(()=>{});}
    }
    if(url.pathname==='/startup-scripts.json')counters.pack++;
    if(url.pathname==='/bootstrap.js'&&(req.headers.cookie||'').includes('qa-baseline=1'))return new Response(deployedBootstrap,{headers:{'Content-Type':'application/javascript'}});
    if(url.pathname==='/stale-worker.js')return new Response(`self.addEventListener('install',e=>e.waitUntil(self.skipWaiting()));self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));self.addEventListener('fetch',e=>{if(new URL(e.request.url).pathname==='/startup-scripts.json')e.respondWith(new Promise(()=>{}))});`,{headers:{'Content-Type':'application/javascript'}});
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
 const evidence='docs/reviews/startup-pack';mkdirSync(evidence,{recursive:true});let number=0;
 async function newContext(baseline=false){
  const response=await accounts(new Request(origin+'/.netlify/functions/accounts?op=register',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({username:'startupqa'+(++number),name:'Synthetic QA',password:'synthetic-startup-passphrase-only',trust:true})}));
  assert.equal(response.status,201);const cookie=response.headers.get('set-cookie').split(';')[0],equal=cookie.indexOf('=');
  const context=await browser.newContext({viewport:{width:375,height:812},serviceWorkers:'allow',reducedMotion:'reduce'});
  await context.addCookies([{name:cookie.slice(0,equal),value:cookie.slice(equal+1),domain:'kitchen.localhost',path:'/'},...(baseline?[{name:'qa-baseline',value:'1',domain:'kitchen.localhost',path:'/'}]:[])]);
  await context.addInitScript(()=>localStorage.setItem('qa-preserved','keep-family-data'));
  return context;
 }
 try {
  // The authentication card and shared controls must not move between tabs.
  for(const [name,viewport] of Object.entries({narrow:{width:320,height:740},mobile:{width:375,height:812},tablet:{width:820,height:1100},desktop:{width:1280,height:800}})){
   const context=await browser.newContext({viewport,reducedMotion:'reduce'}),page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(origin+'/login?locked=1',{waitUntil:'domcontentloaded'});
   assert.equal(await page.getByRole('tab').count(),2);assert.equal(await page.getByText('Gia đình cũ',{exact:true}).count(),0);
   const geometry=async()=>page.evaluate(()=>Object.fromEntries(['main','#username-field','#password-field','#submit','.tabs'].map(selector=>{const b=document.querySelector(selector).getBoundingClientRect();return[selector,[b.x+scrollX,b.y+scrollY,b.width,b.height]]})));
   const initial=await geometry();await page.locator('#username').fill('typedowner');await page.locator('#password').fill('SyntheticPassphrase42');
   await page.getByRole('tab',{name:'Đăng ký',exact:true}).click();assert.deepEqual(await geometry(),initial,name+' register layout moved');
   await page.locator('#name').fill('Synthetic name');await page.locator('#email').fill('invalid-email');
   await page.screenshot({path:evidence+'/'+name+'-register.png',fullPage:true});
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
  await emailPage.locator('#recovery:not([hidden])').waitFor();assert.match(await emailPage.locator('#result-message').innerText(),/Đã gửi email xác minh/);
  const verifiedMail=mail.at(-1);assert.equal(verifiedMail.kind,'verify');
  await emailPage.goto(origin+'/login?verify='+verifiedMail.token+'&locked=1');await emailPage.getByText('Email đã được xác minh. Bạn có thể đăng nhập.',{exact:true}).waitFor();assert(!emailPage.url().includes(verifiedMail.token));
  await emailPage.locator('#forgot').click();await emailPage.locator('#username').fill('browsermail');await emailPage.locator('#submit').click();await emailPage.getByText(/Nếu tài khoản có email đã xác minh, yêu cầu khôi phục/).waitFor();
  const resetMail=mail.at(-1);assert.equal(resetMail.kind,'reset');
  await emailPage.goto(origin+'/login?reset='+resetMail.token+'&locked=1');await emailPage.locator('#password').fill('SyntheticUiChangedPassword42');await emailPage.locator('#submit').click();await emailPage.locator('#recovery:not([hidden])').waitFor();assert.match(await emailPage.locator('#result-message').innerText(),/Mật khẩu đã được đổi/);
  await emailContext.close();
  console.log('PASS real registration UI, email verification, email reset and new recovery code (mail transport mocked)');

  const old=await newContext(true),oldPage=await old.newPage();await oldPage.clock.install();
  await oldPage.goto(origin,{waitUntil:'domcontentloaded'});await oldPage.waitForTimeout(500);await oldPage.clock.fastForward(16000);
  await oldPage.getByRole('alert').waitFor();assert.match(await oldPage.getByRole('alert').innerText(),/seed.js/);
  await oldPage.getByRole('link',{name:'Đăng nhập / Sign in'}).click();
  await oldPage.waitForURL(url=>url.pathname==='/',{waitUntil:'domcontentloaded'});
  assert.equal(await oldPage.locator('input[type=password]').count(),0);
  await old.close();
  console.log('PASS reproduces production seed timeout and sign-in redirect loop with actual account gate');

  const context=await newContext(),page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const seedsBefore=counters.seed,packsBefore=counters.pack;
  await page.goto(origin,{waitUntil:'domcontentloaded'});await page.locator('#account-create').waitFor();
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  await page.waitForFunction(async()=>{
   const access=await caches.open('bep-family-access-v1');if(!await access.match('/offline-access'))return false;
   const cache=await caches.open('bep-family-v14-startup-pack');return !!await cache.match('/startup-scripts.json');
  });
  assert.equal(counters.seed,seedsBefore,'startup and worker must not fetch seed.js separately');
  assert.ok(counters.pack>packsBefore);
  await page.reload({waitUntil:'domcontentloaded'});await page.locator('#account-join').waitFor();
  await page.screenshot({path:evidence+'/authenticated-worker.png',fullPage:true});
  await page.getByRole('button',{name:'Tài khoản & email',exact:true}).click();await page.locator('#account-email-address').fill('existing-browser@example.test');await page.locator('#account-email-password').fill('synthetic-startup-passphrase-only');await page.locator('#account-email button').click();await page.getByText('Đã gửi liên kết xác minh. Kiểm tra hộp thư và thư rác.',{exact:true}).waitFor();await page.keyboard.press('Escape');
  await context.setOffline(true);await page.reload({waitUntil:'domcontentloaded'});await page.locator('#account-create').waitFor();
  assert.equal(await page.evaluate(()=>localStorage.getItem('qa-preserved')),'keep-family-data');
  assert.deepEqual(errors,[]);await context.close();
  console.log('PASS real account/functions/gate and active service worker: online reload, signed offline launch, no separate seed request');

  async function stalledRecovery() {
   const context=await newContext(),page=await context.newPage();
   await page.goto(origin+'/login?locked=1');
   await page.evaluate(async()=>{await navigator.serviceWorker.register('/stale-worker.js');await navigator.serviceWorker.ready});
   await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
   await page.clock.install();await page.goto(origin,{waitUntil:'domcontentloaded'});
   await page.waitForTimeout(500);
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
  await retry.page.locator('#account-create').waitFor();
  assert.equal(await retry.page.evaluate(()=>localStorage.getItem('qa-preserved')),'keep-family-data');
  await retry.context.close();
  console.log('PASS both recovery actions work through real navigation; Retry escapes stalled worker without deleting device data');
 } finally {
  await browser.close();for(const res of pending)res.destroy();server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));
 }
}
main().catch(error=>{console.error(error);process.exitCode=1});
