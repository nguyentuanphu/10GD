import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync, mkdirSync} from 'node:fs';
import {resolve, extname} from 'node:path';
import {chromium} from 'playwright';
declare const cloudConnection:any,state:any,render:any,refreshFamilyAlerts:any,changeAppLanguage:any,appLanguage:any;declare let alertCache:any;
// v1.7 alerts & online state, in a real browser against the real gate + family handlers (in-memory stores, mocked push).
// Checks: a slow (3 s) or failing server never shows Offline; a blocked network does, and recovers by itself;
// an urgent alert shows as sent within 100 ms, is sent once, and rolls back cleanly on failure. Saves responsive evidence.
// MEASURE_ONLY=1 runs only the timing measurements (used to measure the v1.6 baseline build for the review record).
const measureOnly=process.env.MEASURE_ONLY==='1';
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
async function main(){
 const {createAccountsHandler}=await import('../netlify/lib/accounts.mjs');
 const {createFamilyHandler}=await import('../netlify/functions/family.mjs');
 const {createGate}=await import('../netlify/lib/gate.mjs');
 const stores=new Map();let revision=0;
 function getStoreFn({name}:any){if(stores.has(name))return stores.get(name);const rows=new Map(),store={async get(k:string){return structuredClone(rows.get(k)?.data??null)},async getWithMetadata(k:string){return structuredClone(rows.get(k)??null)},async setJSON(k:string,data:any,options:any={}){const previous=rows.get(k);if(options.onlyIfNew&&previous||options.onlyIfMatch&&options.onlyIfMatch!==previous?.etag)return{modified:false};const etag=String(++revision);rows.set(k,{data:structuredClone(data),etag});return{modified:true,etag}},async set(k:string,d:any,o:any){return this.setJSON(k,d,o)},async delete(k:string){rows.delete(k)},async *list({prefix=''}:any){yield{blobs:[...rows.keys()].filter((key:string)=>key.startsWith(prefix)).map((key:string)=>({key}))}}};stores.set(name,store);return store}
 const PUSH_MS=2000;const pushes:number[]=[];
 const accounts=createAccountsHandler({getStoreFn}),family=createFamilyHandler({getStoreFn,pushSend:async()=>{await sleep(PUSH_MS);pushes.push(Date.now());return{statusCode:201}}});
 const gate=createGate();
 const mime:Record<string,string>={'.js':'application/javascript','.json':'application/json','.css':'text/css','.html':'text/html','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'};
 const dist=resolve('dist');
 // Test controls: per-request delays, a blocked network (sockets reset) and one-shot failures.
 const ctl={familyDelay:0,alertDelay:0,blocked:false,dropNextStatus:false,failNextStatus:0,failAlert:false,alertPosts:0,alertReplyMs:[] as number[]};
 const background:Promise<any>[]=[];
 let origin='';
 const server=createServer(async(req,res)=>{
  try{
   if(ctl.blocked){req.socket.destroy();return}
   const url=new URL(req.url||'/',origin);const op=url.searchParams.get('op');
   if(url.pathname==='/.netlify/functions/family'&&op==='status'&&ctl.dropNextStatus){ctl.dropNextStatus=false;req.socket.destroy();return}
   const chunks:Buffer[]=[];for await(const part of req)chunks.push(part as Buffer);
   const body=Buffer.concat(chunks),request=new Request(origin+req.url,{method:req.method,headers:req.headers as any,...(body.length?{body}:{})});
   const response=await gate(request,{next:async()=>{
    if(url.pathname==='/.netlify/functions/accounts')return accounts(request);
    if(url.pathname==='/.netlify/functions/family'){
     if(op==='status'&&ctl.failNextStatus){const code=ctl.failNextStatus;ctl.failNextStatus=0;return new Response('busy',{status:code})}
     if(ctl.familyDelay)await sleep(ctl.familyDelay);
     if(op==='alert-send'){ctl.alertPosts++;if(ctl.alertDelay)await sleep(ctl.alertDelay);if(ctl.failAlert)return Response.json({error:'Synthetic storage failure.'},{status:503});const t=Date.now();const r=await family(request,{waitUntil:(p:Promise<any>)=>background.push(p)});ctl.alertReplyMs.push(Date.now()-t);return r}
     return family(request,{waitUntil:(p:Promise<any>)=>background.push(p)});
    }
    const file=resolve(dist,url.pathname==='/'?'index.html':'.'+url.pathname);
    if(!file.startsWith(dist+'/'))return new Response('',{status:404});
    try{return new Response(readFileSync(file),{headers:{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':url.pathname==='/health.json'?'no-store':'no-cache'}})}catch{return new Response('',{status:404})}
   }});
   const outHeaders:Record<string,any>=Object.fromEntries(response.headers);const cookies=response.headers.getSetCookie?.()||[];if(cookies.length)outHeaders['set-cookie']=cookies;res.writeHead(response.status,outHeaders);res.end(Buffer.from(await response.arrayBuffer()));
  }catch(error){try{res.writeHead(500);res.end('Synthetic test server error')}catch{}console.error(error)}
 });
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 origin='http://kitchen.localhost:'+(server.address() as any).port;
 const api=async(fn:'accounts'|'family',op:string,body:any,cookie:string)=>{const r=await (fn==='accounts'?accounts:family)(new Request(origin+'/.netlify/functions/'+fn+'?op='+op,{method:body?'POST':'GET',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json','x-nf-client-connection-ip':'alerts-qa'},...(body?{body:JSON.stringify(body)}:{})}));return{status:r.status,headers:r.headers,data:await r.json()}};
 const reg=await api('accounts','register',{username:'alertsqa',name:'Synthetic QA',password:'synthetic-alerts-passphrase-only',trust:true},'');assert.equal(reg.status,201);
 const cookie=reg.headers.get('set-cookie')!.split(';')[0];assert.equal((await api('accounts','create-family',{name:'Synthetic family'},cookie)).status,201);
 const browser=await chromium.launch({args:['--host-resolver-rules=MAP kitchen.localhost 127.0.0.1']});
 const evidence='docs/reviews/v1.7/alerts-online';mkdirSync(evidence,{recursive:true});
 const results:Record<string,any>={};
 try{
  const context=await browser.newContext({viewport:{width:375,height:812},serviceWorkers:'allow',reducedMotion:'reduce'});
  const eq=cookie.indexOf('=');await context.addCookies([{name:cookie.slice(0,eq),value:cookie.slice(eq+1),domain:'kitchen.localhost',path:'/'}]);
  await context.addInitScript(()=>{try{localStorage.setItem('bep-account-present','yes');localStorage.setItem('bep-theme-mode','light')}catch{}});
  const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/#today',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>(globalThis as any).BEP_STARTUP?.ready&&cloudConnection.connected&&!cloudConnection.dirty,null,{timeout:60000});
  const isOffline=()=>page.evaluate(()=>document.querySelector('#network-status')?.getAttribute('data-connection')==='offline'||!!document.querySelector('.offline-banner'));
  const watchNoOffline=async(ms:number)=>{const end=Date.now()+ms;let seen=false;while(Date.now()<end){if(await isOffline())seen=true;await sleep(150)}return seen};
  const wake=()=>page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
  if(!measureOnly){
   assert.equal(await isOffline(),false,'starts online');
   // 1. Server 3 s slow on every family request: never Offline.
   ctl.familyDelay=3000;await wake();await page.evaluate(()=>{void refreshFamilyAlerts()});
   assert.equal(await watchNoOffline(4500),false,'a 3 s slow server never shows Offline');ctl.familyDelay=0;await sleep(300);
   // 2. One failed status request (HTTP 502) and one dropped connection (fetch TypeError): never Offline.
   ctl.failNextStatus=502;await wake();assert.equal(await watchNoOffline(2500),false,'one 502 is not offline');
   ctl.dropNextStatus=true;await wake();assert.equal(await watchNoOffline(3500),false,'one dropped request is confirmed by the health ping: still online');
   console.log('PASS slow (3 s) server, one 502 and one dropped request never show Offline');
   // 3. Network really blocked (connections reset, navigator still online): Offline after the confirming retries,
   //    then automatic recovery when the network returns — no tap on "Thử kết nối".
   ctl.blocked=true;const blockedAt=Date.now();await wake();
   await page.waitForFunction(()=>document.querySelector('#network-status')?.getAttribute('data-connection')==='offline'&&!!document.querySelector('.offline-banner'),null,{timeout:10000});
   results.offlineDetectMs=Date.now()-blockedAt;
   ctl.blocked=false;const restoredAt=Date.now();
   await page.waitForFunction(()=>document.querySelector('#network-status')?.getAttribute('data-connection')==='online'&&!document.querySelector('.offline-banner'),null,{timeout:15000});
   results.recoverMs=Date.now()-restoredAt;
   console.log(`PASS blocked network shows Offline in ${results.offlineDetectMs} ms and recovers by itself in ${results.recoverMs} ms`);
   // 4. Browser offline (navigator.onLine false): immediate; back online: recovers.
   await context.setOffline(true);await page.waitForFunction(()=>!!document.querySelector('.offline-banner'),null,{timeout:3000});
   await context.setOffline(false);await page.waitForFunction(()=>!document.querySelector('.offline-banner')&&document.querySelector('#network-status')?.getAttribute('data-connection')==='online',null,{timeout:10000});
   console.log('PASS navigator offline/online is reflected immediately and recovers');
  }else{
   // Baseline measurement only: does one failed status request flip the app to Offline, and for how long?
   ctl.failNextStatus=502;await wake();results.offlineAfterOne502=await watchNoOffline(2500);
   ctl.dropNextStatus=true;await wake();results.offlineAfterOneDrop=await watchNoOffline(3500);
   ctl.familyDelay=3000;await wake();results.offlineWhileSlow3s=await watchNoOffline(4500);ctl.familyDelay=0;
   const t=Date.now();let still=await isOffline();while(still&&Date.now()-t<20000){await sleep(250);still=await isOffline()}results.offlineStuckMs=still?'>20000':Date.now()-t;
  }
  // 5. Urgent alert: register a (mocked, 2 s slow) push device so the server has real fan-out work.
  const members=await page.evaluate(()=>state.members.map((m:any)=>m.id));
  await api('family','push-key',{},cookie);
  for(const [i,m] of members.slice(0,3).entries())await api('family','push-subscribe',{deviceId:'alerts-qa-device-'+i,memberId:m,subscription:{endpoint:'https://fcm.googleapis.com/fcm/send/alerts-qa-'+i,keys:{auth:'a'.repeat(22),p256dh:'b'.repeat(87)}},shared:i>0,urgentPolicy:'v2',urgentBypass:true},cookie);
  // Subscribing links the account to a family member (identity change): reload once so the app uses it.
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>(globalThis as any).BEP_STARTUP?.ready&&cloudConnection.connected&&!cloudConnection.dirty&&(globalThis as any).BEP_SESSION?.household?.memberId,null,{timeout:60000});
  const openForm=async()=>{await page.evaluate(()=>{location.hash='today';window.scrollTo(0,0)});const button=page.locator('details.family-urgent [data-house="urgent-new"]').first();await page.locator('details.family-urgent').first().waitFor();if(!await button.isVisible())await page.locator('details.family-urgent>summary').first().click();await button.click();await page.locator('#family-urgent-form textarea[name=message]').waitFor()};
  const send=async(text:string)=>{await openForm();await page.locator('#family-urgent-form textarea[name=message]').fill(text);
   // Two clicks in the same task (a double tap): measure until the message is on screen.
   return page.evaluate(t=>new Promise<number>(resolve=>{const b=document.querySelector('.modal-footer [data-action="submit-form"]') as HTMLButtonElement;const t0=performance.now();b.click();b.click();const tick=()=>{const shown=[...document.querySelectorAll('.urgent-message p')].some(p=>p.textContent===t);if(shown)resolve(performance.now()-t0);else requestAnimationFrame(tick)};tick()}),text)};
  ctl.alertDelay=600;ctl.alertPosts=0;// a realistic function + storage round trip
  const shownMs=await send('Tắt bếp giúp mẹ — thử nghiệm');results.alertShownMs=Math.round(shownMs);
  // Old flow: the message appeared only after sync + send + push fan-out + reload. Wait until the server has answered.
  const answered=Date.now();await page.waitForFunction(()=>!document.querySelector('.urgent-message.sending'),null,{timeout:30000});results.alertConfirmedMs=Date.now()-answered+Math.round(shownMs);
  results.serverReplyMs=ctl.alertReplyMs.at(-1);
  console.log(`MEASURE alert visible after ${results.alertShownMs} ms; server reply (handler only) ${results.serverReplyMs} ms; confirmed in UI ~${results.alertConfirmedMs} ms`);
  if(!measureOnly){
   assert(shownMs<100,`sent state within 100 ms (got ${shownMs.toFixed(1)} ms)`);
   await sleep(1000);assert.equal(ctl.alertPosts,1,'double tap sends exactly once');
   assert(results.serverReplyMs<PUSH_MS,'server answers before the 2 s push fan-out completes');
   assert.equal(await page.locator('.urgent-message p',{hasText:'Tắt bếp giúp mẹ — thử nghiệm'}).count(),1,'one message, no duplicate');
   await Promise.all(background.splice(0));await page.evaluate(()=>refreshFamilyAlerts());
   await page.waitForFunction(()=>/thiết bị|devices/.test(document.querySelector('.urgent-message .urgent-status')?.textContent||''),null,{timeout:10000});
   console.log('PASS alert shown as sent within 100 ms, sent once, server replies before push fan-out, push outcome shown after refresh');
   // 6. Failure: the optimistic message is rolled back and the form reopens with the same text.
   ctl.failAlert=true;await send('Tin sẽ lỗi — thử nghiệm');
   await page.locator('#family-urgent-form textarea[name=message]').waitFor({timeout:10000});
   assert.equal(await page.locator('#family-urgent-form textarea[name=message]').inputValue(),'Tin sẽ lỗi — thử nghiệm','text kept for resend');
   assert.equal(await page.locator('.urgent-message p',{hasText:'Tin sẽ lỗi'}).count(),0,'optimistic message rolled back');
   ctl.failAlert=false;await page.locator('.modal-footer [data-action="submit-form"]').click();
   await page.waitForFunction(()=>[...document.querySelectorAll('.urgent-message:not(.sending) p')].some(p=>p.textContent==='Tin sẽ lỗi — thử nghiệm'),null,{timeout:10000});
   console.log('PASS failed send rolls back with a clear error and resends from the kept text');
   assert.deepEqual(errors,[],'no page errors');
   // 7. Responsive evidence: Today card offline/online + urgent panel (with one "sending" message), VI/EN, light/dark.
   ctl.alertDelay=0;
   const sizes:Record<string,{width:number,height:number}>={mobile:{width:375,height:812},tablet:{width:820,height:1100},desktop:{width:1280,height:800}};
   const sets=[{lang:'vi',theme:'light'},{lang:'en',theme:'dark'}];
   for(const [name,viewport] of Object.entries(sizes)){
    await page.setViewportSize(viewport);
    for(const {lang,theme} of sets){
     await page.evaluate(([l,t])=>{localStorage.setItem('bep-theme-mode',t);changeAppLanguage(l);location.hash='today'},[lang,theme]);
     await page.evaluate(()=>{alertCache=[{id:'qa-sending-01',fromId:state.members[0].id,fromName:state.members[0].name,message:appLanguage==='en'?'Please turn off the stove (sample)':'Tắt bếp giúp mẹ (mẫu)',targets:state.members.map((m:any)=>m.id),createdAt:new Date().toISOString(),readBy:{},pushStatus:'pending',localState:'sending'},...alertCache.filter((a:any)=>!a.localState)];render();const d=document.querySelector('details.family-urgent') as HTMLDetailsElement;d.open=true;d.scrollIntoView({block:'start'})});
     await sleep(250);await page.evaluate(()=>{const t=document.querySelector('#toast');if(t)t.className=''});
     const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert(overflow<=0,`${name} ${lang} ${theme}: no horizontal overflow (${overflow}px)`);
     const pill=await page.locator('#network-status').boundingBox();assert(pill&&pill.x+pill.width<=viewport.width,'status pill fully visible');
     await page.screenshot({path:`${evidence}/urgent-${name}-${lang}-${theme}.png`,type:'png'});
     await context.setOffline(true);await page.waitForFunction(()=>!!document.querySelector('.offline-banner'));await page.evaluate(()=>{window.scrollTo(0,0);const t=document.querySelector('#toast');if(t)t.className=''});await sleep(200);
     const banner=await page.locator('.offline-banner').boundingBox();assert(banner&&banner.width<=viewport.width,'offline card fits');
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)<=0,true,'offline: no horizontal overflow');
     await page.screenshot({path:`${evidence}/today-offline-${name}-${lang}-${theme}.png`,type:'png'});
     await context.setOffline(false);await page.waitForFunction(()=>!document.querySelector('.offline-banner'),null,{timeout:10000});
    }
   }
   // Narrow phone (header pill) check.
   await page.setViewportSize({width:320,height:740});await page.evaluate(()=>{changeAppLanguage('vi');window.scrollTo(0,0)});await sleep(200);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)<=0,'320 px: no horizontal overflow');
   await page.screenshot({path:`${evidence}/today-online-narrow-320-vi.png`,type:'png'});
   console.log('PASS responsive evidence saved (375×812, 820×1100, 1280×800, 320×740; VI/EN; light/dark)');
  }
  console.log('RESULTS '+JSON.stringify(results));
  await context.close();
 }finally{await Promise.allSettled(background);await browser.close();server.close()}
}
main().catch(error=>{console.error(error);process.exit(1)});
