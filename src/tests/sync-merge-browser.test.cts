import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync, mkdirSync, statSync} from 'node:fs';
import {resolve, extname} from 'node:path';
import {chromium} from 'playwright';
declare const cloudConnection:any,state:any,save:any,render:any,currentWeek:any,changeAppLanguage:any,recipe:any,closeModal:any,applyThemePreferences:any;
// v1.7.3 two devices, one family, in real Chromium against the real gate + accounts + family handlers (in-memory stores).
// Both devices edit at the same time (online and offline): every change survives, no "two devices changed" dialog.
// Same recipe renamed on both → newer name wins, the other is kept as a revision with a notice, and can be restored.
// Shopping item checked on one, renamed on the other → both applied. Screenshots of the status/notice: 375×812 VI/EN,
// plus 320×740, 820×1100 and 1280×800 (viewport simulation only, not physical devices). Synthetic data only.
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
async function main(){
 const {createAccountsHandler}=await import('../netlify/lib/accounts.mjs');
 const {createFamilyHandler}=await import('../netlify/functions/family.mjs');
 const {createGate}=await import('../netlify/lib/gate.mjs');
 const stores=new Map();let revision=0;
 function getStoreFn({name}:any){if(stores.has(name))return stores.get(name);const rows=new Map(),store={async get(k:string){return structuredClone(rows.get(k)?.data??null)},async getWithMetadata(k:string){return structuredClone(rows.get(k)??null)},async getMetadata(k:string){const r=rows.get(k);return r?{etag:r.etag,metadata:{}}:null},async setJSON(k:string,data:any,options:any={}){const previous=rows.get(k);if(options.onlyIfNew&&previous||options.onlyIfMatch&&options.onlyIfMatch!==previous?.etag)return{modified:false};const etag=String(++revision);rows.set(k,{data:structuredClone(data),etag});return{modified:true,etag}},async set(k:string,d:any,o:any){return this.setJSON(k,d,o)},async delete(k:string){rows.delete(k)},async *list({prefix=''}:any){yield{blobs:[...rows.keys()].filter((key:string)=>key.startsWith(prefix)).map((key:string)=>({key}))}}};stores.set(name,store);return store}
 const accounts=createAccountsHandler({getStoreFn}),family=createFamilyHandler({getStoreFn,pushSend:async()=>({statusCode:201})}),gate=createGate();
 const mime:Record<string,string>={'.js':'application/javascript','.json':'application/json','.css':'text/css','.html':'text/html','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'};
 const dist=resolve('dist'),background:Promise<any>[]=[],stats={puts:0,conflicts409:0,versions:0,fullReads:0};let origin='';
 const server=createServer(async(req,res)=>{try{const url=new URL(req.url||'/',origin),op=url.searchParams.get('op');const chunks:Buffer[]=[];for await(const part of req)chunks.push(part as Buffer);
  const body=Buffer.concat(chunks),request=new Request(origin+req.url,{method:req.method,headers:req.headers as any,...(body.length?{body}:{})});
  const response=await gate(request,{next:async()=>{if(url.pathname==='/.netlify/functions/accounts')return accounts(request);
   if(url.pathname==='/.netlify/functions/family'){if(op==='state-version')stats.versions++;if(op==='state'&&req.method==='GET')stats.fullReads++;const r=await family(request,{waitUntil:(p:Promise<any>)=>background.push(p)});if(op==='state'&&req.method==='PUT'){stats.puts++;if(r.status===409)stats.conflicts409++;if(process.env.SM_TRACE){try{const b=JSON.parse(body.toString());const w=b.state.weeks[Object.keys(b.state.weeks).sort().pop()];console.log('PUT',b.etag,'->',r.status,(w?.extras||[]).map((x:any)=>x.id).join('+'),'budget',b.state.preferences.budget,'merge',JSON.stringify(b.merge||null))}catch{}}}return r}
   const file=resolve(dist,url.pathname==='/'?'index.html':'.'+url.pathname);if(!file.startsWith(dist+'/'))return new Response('',{status:404});
   try{return new Response(readFileSync(file),{headers:{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-cache'}})}catch{return new Response('',{status:404})}}});
  const out:Record<string,any>=Object.fromEntries(response.headers);const cookies=response.headers.getSetCookie?.()||[];if(cookies.length)out['set-cookie']=cookies;res.writeHead(response.status,out);res.end(Buffer.from(await response.arrayBuffer()))}catch(error){try{res.writeHead(500);res.end('Synthetic test server error')}catch{}console.error(error)}});
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));origin='http://kitchen.localhost:'+(server.address() as any).port;
 const api=async(op:string,body:any,cookie:string)=>{const r=await accounts(new Request(origin+'/.netlify/functions/accounts?op='+op,{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json','x-nf-client-connection-ip':'sync-qa'},body:JSON.stringify(body)}));return{status:r.status,headers:r.headers}};
 const reg=await api('register',{username:'syncqa',name:'Synthetic QA',password:'synthetic-sync-passphrase-only',trust:true},'');assert.equal(reg.status,201);
 const cookie=reg.headers.get('set-cookie')!.split(';')[0];assert.equal((await api('create-family',{name:'Synthetic family'},cookie)).status,201);
 const browser=await chromium.launch({args:['--host-resolver-rules=MAP kitchen.localhost 127.0.0.1'],...(process.env.BEP_CHROMIUM?{executablePath:process.env.BEP_CHROMIUM}:{})});
 const evidence='docs/reviews/v1.7.3/sync-merge';mkdirSync(evidence,{recursive:true});
 const shot=async(page:any,file:string)=>{await page.evaluate(()=>{const t=document.querySelector('#toast');if(t)t.className=''});await page.screenshot({path:`${evidence}/${file}.jpg`,type:'jpeg',quality:72});const kb=statSync(`${evidence}/${file}.jpg`).size/1024;assert.ok(kb<250,`${file}.jpg is ${kb.toFixed(0)} KB`)};
 const noOverflow=async(page:any,label:string)=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'horizontal overflow: '+label);
 const device=async(label:string)=>{const context=await browser.newContext({viewport:{width:375,height:812},isMobile:true,hasTouch:true,reducedMotion:'reduce',serviceWorkers:'block'});const eq=cookie.indexOf('=');await context.addCookies([{name:cookie.slice(0,eq),value:cookie.slice(eq+1),domain:'kitchen.localhost',path:'/'}]);
  await context.addInitScript(()=>{try{localStorage.setItem('bep-account-present','yes');localStorage.setItem('bep-theme-mode','light')}catch{}
   // Record any appearance of the blocking two-device dialog.
   document.addEventListener('DOMContentLoaded',()=>new MutationObserver(()=>{const t=document.querySelector('#modal-title')?.textContent||'';if(/Hai thiết bị|Two devices changed/.test(t))(window as any).__clash=true}).observe(document.body,{childList:true,subtree:true}))});
  const page=await context.newPage(),errors:string[]=[];page.on('pageerror',(e:any)=>errors.push(e.message));await page.goto(origin+'/#shopping',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>(globalThis as any).BEP_STARTUP?.ready&&cloudConnection.connected&&!cloudConnection.dirty&&!cloudConnection.syncing&&!!cloudConnection.etag,null,{timeout:60000});return{label,context,page,errors}};
 const settled=(d:any)=>d.page.waitForFunction(()=>cloudConnection.connected&&!cloudConnection.dirty&&!cloudConnection.syncing&&!cloudConnection.pulling,null,{timeout:30000});
 // Pull now on the other device the way the app does when it is focused (no waiting for the 15 s timer).
 const focus=async(d:any)=>{await d.page.evaluate(()=>window.dispatchEvent(new Event('focus')));await sleep(400);await settled(d)};
 const both=async(fn:string,arg:any={})=>{const [a,b]=[A,B];await Promise.all([a.page.evaluate(new Function('arg','return ('+fn+')(arg,"A")') as any,arg),b.page.evaluate(new Function('arg','return ('+fn+')(arg,"B")') as any,arg)])};
 const read=(d:any,fn:string)=>d.page.evaluate(new Function('return ('+fn+')()') as any);
 const A=await device('A');const B=await device('B');
 try{
  assert.equal(await read(A,'()=>cloudConnection.etag'),await read(B,'()=>cloudConnection.etag'),'both devices start on the same family copy');
  if(process.env.SM_DEBUG)for(const d of [A,B]){d.page.on('console',(m:any)=>console.log(d.label,m.text()));await d.page.evaluate(()=>{const ids=(s:any)=>s?((s.weeks||{})[Object.keys(s.weeks||{}).sort().pop()!]?.extras||[]).map((x:any)=>x.id).join('+')+'/b'+s.preferences?.budget:'null';const m=(globalThis as any).mergeFamilyStates;(globalThis as any).mergeFamilyStates=function(b:any,l:any,r:any,o:any){const out=m(b,l,r,o);console.log('merge base',ids(b),'local',ids(l),'remote',ids(r),'=>',ids(out.state));return out}})}
  // 1. Online, same moment: A adds a shopping item + pantry, B adds a shopping item + changes the budget.
  await both(`(x,who)=>{const w=currentWeek();w.extras.push({id:'qa-extra-'+who,name:'QA món '+who,qty:'1',cost:0,done:false});if(who==='A')state.pantry.push({id:'qa-pantry-A',ingredient:'egg',qty:4,place:'fridge',expiry:''});else state.preferences.budget=222;save();render()}`);
  await Promise.all([settled(A),settled(B)]);await focus(A);await focus(B);
  const check1=`()=>{const ids=currentWeek().extras.map(x=>x.id);return ids.includes('qa-extra-A')&&ids.includes('qa-extra-B')&&state.pantry.some(p=>p.id==='qa-pantry-A')&&state.preferences.budget===222}`;
  assert.ok(await read(A,check1),'A has both devices’ changes');assert.ok(await read(B,check1),'B has both devices’ changes');
  console.log('PASS online concurrent edits on two devices: both survive on both devices, no dialog');
  // 2. Offline on both, then back online together.
  await A.context.setOffline(true);await B.context.setOffline(true);
  await both(`(x,who)=>{const w=currentWeek();w.extras.push({id:'qa-off-'+who,name:'QA offline '+who,qty:'2',cost:0,done:false});if(who==='B')state.pantry.find(p=>p.id==='qa-pantry-A').qty=9;save();render()}`);
  await Promise.all([A.context.setOffline(false),B.context.setOffline(false)]);await Promise.all([settled(A),settled(B)]);await focus(A);await focus(B);
  const check2=`()=>{const ids=currentWeek().extras.map(x=>x.id);return ids.includes('qa-off-A')&&ids.includes('qa-off-B')&&state.pantry.find(p=>p.id==='qa-pantry-A').qty===9}`;
  assert.ok(await read(A,check2),'A after offline');assert.ok(await read(B,check2),'B after offline');
  console.log('PASS offline edits on both devices merge when they reconnect');
  // 3. Shopping item checked on A, renamed on B at the same time → both applied.
  await A.context.setOffline(true);
  await both(`(x,who)=>{const e=currentWeek().extras.find(x=>x.id==='qa-extra-A');if(who==='A')e.done=true;else e.name='QA sữa tươi';save();render()}`);
  await A.context.setOffline(false);await settled(A);await settled(B);await focus(B);await focus(A);
  const check3=`()=>{const e=currentWeek().extras.find(x=>x.id==='qa-extra-A');return e.done===true&&e.name==='QA sữa tươi'}`;
  assert.ok(await read(A,check3),'A: checked + renamed');assert.ok(await read(B,check3),'B: checked + renamed');
  // The device that merged shows the short status.
  assert.match(await read(A,`()=>cloudStatusText()`),/Đã gộp thay đổi từ thiết bị khác|Đã đồng bộ/);
  console.log('PASS shopping item checked on one device and renamed on the other: both applied');
  // Merged status pill (VI then EN) on A: make A merge a B change once more.
  await A.context.setOffline(true);await both(`(x,who)=>{const w=currentWeek();w.extras.push({id:'qa-pill-'+who,name:'QA '+who,qty:'1',cost:0,done:false});save();render()}`);await settled(B);await A.context.setOffline(false);
  await A.page.waitForFunction(()=>{const p=document.getElementById('sync-pill');return p&&!p.hidden&&p.dataset.kind==='merged'},null,{timeout:15000});
  assert.match(await A.page.locator('#sync-pill').innerText(),/Đã gộp thay đổi từ thiết bị khác/);await noOverflow(A.page,'merged pill');await shot(A.page,'mobile-375-merged-vi');
  await settled(A);await focus(B);
  // 4. Same family recipe renamed on both (B is newer): newer wins, the other is kept as a revision with a notice.
  await A.page.evaluate(()=>{state.recipes.push({...recipe('qa-fam-ga','QA Gà kho gừng','main','chicken',20,{chicken:400,ginger:20},'QA',['Ướp','Kho']),custom:true,favorite:false});save()});await settled(A);await focus(B);
  assert.ok(await read(B,`()=>state.recipes.some(r=>r.id==='qa-fam-ga')`),'recipe reached B');
  await A.context.setOffline(true);await B.context.setOffline(true);
  await A.page.evaluate(()=>{state.recipes.find(r=>r.id==='qa-fam-ga').name='QA Gà kho gừng (bản A)';save()});await sleep(30);
  await B.page.evaluate(()=>{const r=state.recipes.find(r=>r.id==='qa-fam-ga');r.name='QA Gà kho gừng (bản B)';r.steps=['Ướp 30 phút','Kho lửa nhỏ'];save()});
  await A.context.setOffline(false);await settled(A);await B.context.setOffline(false);await settled(B);await focus(A);await focus(B);
  for(const d of [A,B]){const r=await read(d,`()=>({name:state.recipes.find(r=>r.id==='qa-fam-ga').name,revs:(state.recipeRevisions||[]).filter(x=>x.recipeId==='qa-fam-ga'&&x.open).map(x=>x.name)})`);
   assert.equal(r.name,'QA Gà kho gừng (bản B)',d.label+': newer name wins');assert.deepEqual(r.revs,['QA Gà kho gừng (bản A)'],d.label+': the other version is kept')}
  await A.page.evaluate(()=>render());const pill=A.page.locator('#sync-pill[data-kind="conflict"]');await pill.waitFor();assert.match(await pill.innerText(),/Có 2 bản chỉnh sửa/);assert.match(await pill.innerText(),/Xem bản kia/);
  const small=await A.page.evaluate(()=>[...document.querySelectorAll('#sync-pill button')].map(b=>b.getBoundingClientRect()).filter(r=>r.width<44||r.height<44).length);assert.equal(small,0,'≥44 px targets');
  await noOverflow(A.page,'conflict pill');await shot(A.page,'mobile-375-two-versions-vi');
  await A.page.locator('#sync-pill [data-sync-rev="open"]').tap();await A.page.locator('#modal-root .sync-rev').waitFor();assert.match(await A.page.locator('#modal-root').innerText(),/Bản kia/);await noOverflow(A.page,'revision dialog');await shot(A.page,'mobile-375-two-versions-dialog-vi');
  await A.page.evaluate(()=>{closeModal();changeAppLanguage('en');render()});await A.page.locator('#sync-pill[data-kind="conflict"]').waitFor();assert.match(await A.page.locator('#sync-pill').innerText(),/Two edited versions/);await shot(A.page,'mobile-375-two-versions-en');
  await A.page.locator('#sync-pill [data-sync-rev="open"]').tap();await A.page.locator('#modal-root .sync-rev').waitFor();assert.match(await A.page.locator('#modal-root').innerText(),/Other version/);await shot(A.page,'mobile-375-two-versions-dialog-en');
  // Other sizes (simulated viewports): narrow phone, tablet, desktop; then restore the other version.
  for(const [name,w,h] of [['narrow-320',320,740],['tablet-820',820,1100],['desktop-1280',1280,800]] as const){await A.page.setViewportSize({width:w,height:h});await A.page.evaluate(()=>{closeModal();render()});await A.page.locator('#sync-pill[data-kind="conflict"]').waitFor();await noOverflow(A.page,name);await shot(A.page,`${name}-two-versions-en`);
   await A.page.locator('#sync-pill [data-sync-rev="open"]').click();await A.page.locator('#modal-root .sync-rev').waitFor();await noOverflow(A.page,name+' dialog');await shot(A.page,`${name}-two-versions-dialog-en`)}
  await A.page.setViewportSize({width:375,height:812});await A.page.evaluate(()=>{closeModal();changeAppLanguage('vi');render()});
  await A.page.locator('#sync-pill [data-sync-rev="open"]').tap();await A.page.locator('#modal-root [data-sync-rev="restore"]').first().tap();await settled(A);await focus(B);
  for(const d of [A,B]){const r=await read(d,`()=>({name:state.recipes.find(r=>r.id==='qa-fam-ga').name,open:(state.recipeRevisions||[]).filter(x=>x.open).length,kept:(state.recipeRevisions||[]).filter(x=>x.recipeId==='qa-fam-ga').map(x=>x.name).sort()})`);
   assert.equal(r.name,'QA Gà kho gừng (bản A)',d.label+': restored');assert.equal(r.open,0);assert.deepEqual(r.kept,['QA Gà kho gừng (bản A)','QA Gà kho gừng (bản B)'],d.label+': both versions remain stored')}
  console.log('PASS same recipe renamed on two devices: newer wins, other kept + notice, restore works on both devices');
  // No device ever showed the blocking dialog; no page errors.
  for(const d of [A,B]){assert.equal(await d.page.evaluate(()=>!!(window as any).__clash),false,d.label+' never showed the clash dialog');assert.equal(await read(d,'()=>cloudConnection.conflict'),false);assert.deepEqual(d.errors,[],d.label+' page errors')}
  assert.ok(stats.conflicts409>=1,'at least one write raced and was merged ('+stats.conflicts409+')');assert.ok(stats.versions>=1,'cheap version checks used');
  console.log(`PASS no clash dialog on either device (${stats.puts} writes, ${stats.conflicts409} merged-and-retried, ${stats.versions} version checks, ${stats.fullReads} full reads)`);
 }finally{await Promise.allSettled(background);await browser.close();server.close()}
}
main().catch(error=>{console.error(error);process.exit(1)});
