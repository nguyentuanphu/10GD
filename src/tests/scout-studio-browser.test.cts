// Studio · Scout network panel in Chromium against the REAL studio/scout/accounts
// handlers (in-memory stores, synthetic data). Checks the nav link, devices table,
// parser health with auto-pause indicator, coverage, switches (audited), device
// actions, the Studio → Settings "Auto Scout" platform setting (v1.6: Scout is a
// registered Studio page, so the overview no longer loads behind it), VI/EN, light/dark, at 320×740, 375×812, 820×1100 and 1280×800 with no
// horizontal overflow and ≥44 px touch targets on touch-size layouts.
// Screenshots go to docs/reviews/v1.6/auto-scout/.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,existsSync} from 'node:fs';
import {extname} from 'node:path';
import {chromium} from 'playwright';
const origin='https://kitchen.test',out='docs/reviews/v1.6/auto-scout';mkdirSync(out,{recursive:true});
const mime:any={'.js':'application/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.json':'application/json','.webmanifest':'application/manifest+json'};
const sizes:any={narrow:{width:320,height:740},mobile:{width:375,height:812},tablet:{width:820,height:1100},desktop:{width:1280,height:800}};
(async()=>{
 const {memoryStores}=await import('./helpers/accounts.mjs');
 const {createAccountsHandler}=await import('../netlify/lib/accounts.mjs');
 const {createScoutHandler}=await import('../netlify/functions/scout.mjs');
 const {createStudioHandler}=await import('../netlify/functions/studio.mjs');
 const lib=await import('../netlify/lib/scout.mjs');
 const {listLog,dayKey}=await import('../netlify/lib/studio.mjs');
 const getStoreFn=memoryStores(),env:any={STUDIO_ADMINS:'henrynguyen',SCOUT_DEV:'1'},EXT='chrome-extension://mjeoekikdicoojgoppnfibjbfpcfngja';
 const adapter={async wantedItems(){return[{itemId:'nuoc-mam',name:'Fish sauce',families:6},{itemId:'gao',name:'Jasmine rice',families:4},{itemId:'toi',name:'Garlic',families:2}]},async productMappings(){return[]},async lastSeen(){return{}},async catalogItems(){return[]},async publishObservation(){},async holdObservation(){},async recordMappingCandidate(){}};
 const scout=createScoutHandler({getStoreFn,env,adapter}),studio=createStudioHandler({getStoreFn,env,limits:{all:5000,mutate:5000}}),accounts=createAccountsHandler({getStoreFn});
 const handlers:any={scout,studio,accounts};
 const reg=async(u:string)=>{const r=await accounts(new Request(origin+'/.netlify/functions/accounts?op=register',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','x-nf-client-connection-ip':'r-'+u},body:JSON.stringify({username:u,name:u,password:'synthetic-studio-scout-42',trust:true})}));assert.equal(r.status,201);return r.headers.get('set-cookie')!.split(';')[0]};
 const henry=await reg('henrynguyen');await reg('alice');await reg('minh');
 const dev=async(op:string,token:string,body?:any)=>(await scout(new Request(origin+'/.netlify/functions/scout?op='+op,{method:body===undefined?'GET':'POST',headers:{Origin:EXT,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)}))).json();
 const pair=async(user:string,name:string,suburb:string,postcode:string,stores:any)=>{const {code}=await lib.createPairCode(getStoreFn,user,Date.now(),env);return dev('pair','',{code,name,suburb,postcode,stores,version:'1.6.0'})};
 const a=await pair('alice','Máy bàn nhà Alice','Hurstville','2220',{woolworths:'Hurstville',coles:'Hurstville'}),m=await pair('minh','Minh laptop','Cabramatta','2166',{woolworths:'Cabramatta',aldi:'Cabramatta'}),h=await pair('henrynguyen','Henry PC','Hurstville','2220',{woolworths:'Hurstville'});
 const now=Date.now();await lib.saveNetwork(getStoreFn,{autoScout:'on',schedule:[{days:[0,1,2,3,4,5,6],start:'00:00',end:'24:00'}],parser:{minSamples:5,minSuccess:0.5}},'henrynguyen',now);
 for(const d of [a,m,h])await lib.editDevice(getStoreFn,d.device.id,(x:any)=>({...x,autoAllowed:d!==m}));
 await dev('heartbeat',a.token,{autoEnabled:true,version:'1.6.0',signedIn:{coles:true},storesSeen:{coles:'Coles Kogarah'},storeMismatch:{coles:true}});
 const t=await dev('tasks',a.token,{runId:'run-seed01',autoEnabled:true,max:6});
 for(const task of t.tasks)await dev('results',a.token,{mode:'auto',runId:'run-seed01',items:[{taskId:task.taskId,retailer:task.retailer,url:task.url,status:'ok',storeLabel:task.storeLabel,facts:[{name:'Synthetic '+(task.name||task.kind),price:4.5,storeLabel:task.storeLabel}]}]});
 for(let i=0;i<6;i++)await dev('results',m.token,{mode:'semi',items:[{retailer:'aldi',url:'https://www.aldi.com.au/results?q='+i,status:'parse-failed',facts:[]}]});
 await dev('block',h.token,{retailer:'woolworths',kind:'challenge',url:'https://www.woolworths.com.au/shop/search/products?searchTerm=x'});
 await lib.setTrusted(getStoreFn,'alice',true,'henrynguyen',now);

 const browser=await chromium.launch();const posts:any[]=[],studioOps:string[]=[];
 async function open(size:string,lang:string,theme:string){
  const context=await browser.newContext({viewport:sizes[size],reducedMotion:'reduce',colorScheme:theme as any,hasTouch:size!=='desktop'});
  await context.addInitScript(({lang,theme}:any)=>{localStorage.setItem('studio-lang',lang);localStorage.setItem('studio-theme',theme)},{lang,theme});
  await context.addCookies([{name:henry.split('=')[0],value:henry.split('=').slice(1).join('='),domain:'kitchen.test',path:'/',secure:true,httpOnly:true,sameSite:'Strict'}]);
  studioOps.length=0;const page=await context.newPage();page.on('dialog',(d:any)=>d.accept(d.type()==='prompt'?'QA: thiết bị thử nghiệm':undefined));
  await page.route(origin+'/**',async(route:any)=>{const req=route.request(),url=new URL(req.url());const fn=url.pathname.match(/^\/\.netlify\/functions\/(\w+)/);
   if(fn&&handlers[fn[1]]){const hdr=await req.allHeaders();if(req.method()==='POST'&&fn[1]==='scout')posts.push({op:url.searchParams.get('op'),body:JSON.parse(req.postData()||'{}')});if(fn[1]==='studio')studioOps.push(url.searchParams.get('op')||'');
    const r=await handlers[fn[1]](new Request(url.href,{method:req.method(),headers:hdr,body:['GET','HEAD'].includes(req.method())?undefined:req.postDataBuffer()}));
    return route.fulfill({status:r.status,headers:Object.fromEntries(r.headers),body:Buffer.from(await r.arrayBuffer())})}
   const file='dist'+(url.pathname==='/'?'/index.html':url.pathname);if(existsSync(file))return route.fulfill({status:200,contentType:mime[extname(file)]||'application/octet-stream',body:readFileSync(file)});return route.fulfill({status:404,body:''})});
  await page.goto(origin+'/studio.html#scout');await page.waitForSelector('#scout-h1');await page.waitForSelector('#sc-dev');
  return {context,page};
 }
 const shot=async(page:any,name:string)=>{await page.waitForTimeout(80);await page.screenshot({path:`${out}/${name}.png`})};
 for(const [size,lang,theme] of [['narrow','vi','light'],['mobile','vi','light'],['tablet','vi','light'],['desktop','vi','light'],['mobile','en','dark'],['tablet','en','dark'],['desktop','en','dark']]){
  const {context,page}=await open(size,lang,theme);
  const nav=page.locator('#nav a[href="#scout"]');await nav.waitFor();assert.equal(await nav.getAttribute('aria-current'),'page');assert.equal(await page.locator('#main #scout-main').count(),1,'Scout renders as a normal Studio page inside #main');assert.equal(studioOps.includes('overview'),false,'the overview is not loaded behind the Scout page');
  assert.match(await nav.innerText(),lang==='en'?/Scout network/:/Mạng Scout/);
  const body=await page.locator('#scout-main').innerText();
  for(const want of (lang==='en'?['Máy bàn nhà Alice','Minh laptop','Henry PC','Auto-paused: parser breakage','Blocked — paused 24 h','Signed in: Coles','Coverage (7 days)','Trusted scouts','alice','Device blocked — paused 24 h']:['Máy bàn nhà Alice','Tự dừng: trình đọc lỗi','Bị chặn — tạm dừng 24 giờ','Độ phủ (7 ngày)','Người dò giá tin cậy'])) assert.ok(body.includes(want),size+' '+lang+' missing: '+want);
  assert.ok(!/netlify|blobs/i.test(body),'no hosting vendor named in UI');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);if(overflow>1)console.log(await page.evaluate(()=>[...document.querySelectorAll('#scout-main *')].filter((e:any)=>e.getBoundingClientRect().right>innerWidth+1).slice(0,8).map((e:any)=>e.tagName+'.'+e.className+' '+Math.round(e.getBoundingClientRect().right)+' '+(e.textContent||'').slice(0,40))));assert.ok(overflow<=1,`overflow ${overflow} at ${size}`);
  if(size!=='desktop'){const small=await page.evaluate(()=>[...document.querySelectorAll('#scout-main button,#scout-main input,#scout-main a')].filter((e:any)=>{const r=e.getBoundingClientRect();return r.width&&r.height<44&&e.type!=='checkbox'}).map((e:any)=>e.outerHTML.slice(0,60)));assert.deepEqual(small,[],'touch targets '+size)}
  await shot(page,`studio-scout-${lang}-${theme}-${size}-${sizes[size].width}x${sizes[size].height}`);
  if(size==='desktop'&&lang==='vi'){await page.evaluate(()=>{const el=document.querySelector('#sc-cov');if(el)scrollTo(0,el.getBoundingClientRect().top+scrollY-20)});await shot(page,'studio-scout-coverage-vi-light-desktop-1280x800')}
  if(size==='desktop'&&lang==='en'){
   // Actions: allow Minh's device, pause the network and resume, create a pairing code, revoke (with reason).
   await page.locator(`[data-dev="${m.device.id}"][data-act="allow-auto"]`).click();await page.waitForFunction(()=>document.querySelector('#toast')?.textContent?.includes('Saved'));
   await page.locator('#sc-pause').click();await page.locator('#sc-pause[aria-pressed="true"]').waitFor();
   await page.locator('#sc-pause').click();await page.locator('#sc-pause[aria-pressed="false"]').waitFor();
   await page.locator('#sc-code').click();await page.locator('#scout-main .code').waitFor();assert.match(await page.locator('#scout-main .code').innerText(),/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);await shot(page,'studio-scout-paircode-en-dark-desktop-1280x800');
   await page.locator(`[data-ret="aldi"][data-act="resume"]`).click();await page.locator(`[data-ret="aldi"][data-act="pause"]`).waitFor();
   await page.locator(`[data-dev="${h.device.id}"][data-act="revoke"]`).click();await page.waitForFunction(()=>document.querySelector('#toast')?.textContent?.includes('revoked'));
   assert.equal((await dev('device',h.token)).code,'revoked','revoked from Studio');
   assert.deepEqual(posts.map(p=>p.op),['studio-device','studio-network','studio-network','studio-pair-code','studio-retailer','studio-revoke']);
   const log=await listLog(getStoreFn,'audit',{now:Date.now(),limit:100,from:dayKey(Date.now()-86400000)});const acts=log.items.map((x:any)=>x.action);for(const x of ['scout_device_allow_auto','scout_network','scout_pair_code','scout_retailer_resume','scout_device_revoke'])assert.ok(acts.includes(x),'audited '+x);
   // language switch re-renders the panel
   await page.locator('#lang').click();await page.locator('#scout-h1:has-text("Mạng Scout")').waitFor();
   // leaving #scout restores Studio's own page
   await page.evaluate(()=>{location.hash='#overview'});await page.waitForFunction(()=>!document.querySelector('#scout-main')&&!!document.querySelector('#main h1'));assert.equal(await page.locator('#nav a[href="#scout"]').getAttribute('aria-current'),null);
   // Studio → Settings shows the Auto Scout platform setting (currently on) and saving it off is audited.
   await page.evaluate(()=>{location.hash='#settings'});const card=page.locator('#scout-auto-setting');await card.locator('input[name=on]').waitFor();
   assert.equal(await card.locator('input[name=on]').isChecked(),true,'Auto Scout setting reflects the network state');assert.match(await card.innerText(),/semi-auto|bán tự động/i);
   await card.locator('input[name=on]').uncheck();await card.locator('button[type=submit]').click();await page.waitForFunction(()=>/Auto switched off|Đã tắt tự động/.test(document.querySelector('#toast')?.textContent||''));
   assert.deepEqual(posts.at(-1),{op:'studio-network',body:{patch:{autoScout:'off'}}});assert.equal((await lib.networkSettings(getStoreFn,env)).autoScout,'off');
   await card.locator('input[name=on]:not(:checked)').waitFor();await shot(page,'studio-settings-autoscout-vi-dark-desktop-1280x800');
  }
  await context.close();
 }
 await browser.close();
 console.log('Studio Scout panel: nav, devices, health/auto-pause, coverage, actions + audit, VI/EN, light/dark, 320/375/820/1280 — passed.');
})().catch(e=>{console.error(e);process.exit(1)});
