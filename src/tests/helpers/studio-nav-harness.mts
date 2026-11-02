// Shared harness for the v1.7.2 Studio navigation tests and the Studio navigation timing.
// Real Studio / Price Check / usage / voice / feedback / community-recipe handlers on in-memory
// stores with synthetic data only, served to Chromium through page.route() behind a simulated
// network (round trip + bandwidth). Browser viewport and network simulation only.
import {readFileSync,existsSync} from 'node:fs';
import {extname} from 'node:path';

export const origin='https://kitchen.test';
const mime:any={'.js':'application/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.json':'application/json','.webmanifest':'application/manifest+json'};
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
// "Typical" = a 4G / home-broadband connection; "slow" = a weak 3G connection. `server` is the
// extra time a server function takes to answer (cold storage reads), added to every API request.
export const PROFILES:any={typical:{rtt:100,bps:1_500_000,server:350},slow:{rtt:300,bps:200_000,server:700},none:{rtt:0,bps:0,server:0}};

export async function studioWorld({devices=true,feedback=true}:any={}){
 const {memoryStores}=await import('./accounts.mjs');
 const {seedStudioLoad}=await import('./studio-load.mjs');
 const {createAccountsHandler}=await import('../../netlify/lib/accounts.mjs');
 const {createStudioHandler}=await import('../../netlify/functions/studio.mjs');
 const {createScoutHandler}=await import('../../netlify/functions/scout.mjs');
 const {createUsageHandler}=await import('../../netlify/functions/usage.mjs');
 const {createVoiceStatsHandler}=await import('../../netlify/functions/voice-stats.mjs');
 const {createFeedbackHandler}=await import('../../netlify/functions/feedback.mjs');
 const {createCommunityRecipesHandler}=await import('../../netlify/functions/community-recipes.mjs');
 const lib=await import('../../netlify/lib/scout.mjs');
 const getStoreFn=memoryStores(),env:any={STUDIO_ADMINS:'henrynguyen',SCOUT_DEV:'1'};
 const {cookie}=await seedStudioLoad(getStoreFn,{events:300});
 const adapter={async wantedItems(){return[{itemId:'nuoc-mam',name:'Fish sauce',families:6}]},async productMappings(){return[]},async lastSeen(){return{}},async catalogItems(){return[]},async publishObservation(){},async holdObservation(){},async recordMappingCandidate(){},
  async listUnplaced(){return[]},async resolveUnplaced(){return{ok:false,why:'gone'}}};// v1.7.2 unplaced ops (the real adapter is used in section 3b-real)
 const handlers:any={
  accounts:createAccountsHandler({getStoreFn}),
  studio:createStudioHandler({getStoreFn,env,limits:{all:100000,mutate:100000},mailer:{configured:()=>false,async send(){}}}),
  scout:createScoutHandler({getStoreFn,env,adapter}),
  usage:createUsageHandler({getStoreFn,env}),
  'voice-stats':createVoiceStatsHandler({getStoreFn,env}),
  feedback:createFeedbackHandler({getStoreFn,env,notify:async()=>({sent:0})}),
  'community-recipes':createCommunityRecipesHandler({getStoreFn,env})};
 const EXT='chrome-extension://mjeoekikdicoojgoppnfibjbfpcfngja',ids:any={};
 if(devices){
  const dev=async(op:string,token:string,body?:any)=>(await handlers.scout(new Request(origin+'/.netlify/functions/scout?op='+op,{method:body===undefined?'GET':'POST',headers:{Origin:EXT,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)}))).json();
  const pair=async(name:string,version:string)=>{await lib.setExtensionAllowed(getStoreFn,'henrynguyen',true,'henrynguyen',Date.now());const {code}=await lib.createPairCode(getStoreFn,'henrynguyen',Date.now(),env);return dev('pair','',{code,name,suburb:'Hurstville',postcode:'2220',stores:{woolworths:'Hurstville'},version})};
  const old=await pair('Chrome · máy tính','1.6.0'),ok=await pair('Máy bàn mới','9.9.9');
  await lib.saveNetwork(getStoreFn,{autoScout:'on',schedule:[{days:[0,1,2,3,4,5,6],start:'00:00',end:'24:00'}]},'henrynguyen',Date.now());
  await lib.editDevice(getStoreFn,ok.device.id,(x:any)=>({...x,autoAllowed:true}));
  await dev('heartbeat',old.token,{autoEnabled:true,version:'1.6.0'});await dev('heartbeat',ok.token,{autoEnabled:true,version:'9.9.9'});
  ids.old=old.device.id;ids.ok=ok.device.id;
 }
 if(feedback){
  const fb=await import('../../netlify/lib/feedback.mjs');
  await fb.setMode(getStoreFn,'everyone','henrynguyen',Date.now());
  for(let i=0;i<3;i++)await fb.submit(getStoreFn,{body:{clientId:'synthetic-client-000'+i,type:'bug',note:'Synthetic note '+i,ctx:{route:'today'}},username:'henrynguyen',env,now:Date.now()-i*60000});
 }
 return{getStoreFn,env,handlers,cookie,ids,lib};
}

/** Open Studio in a fresh context. Every request is logged; static files and handlers wait for the simulated network. */
export async function openStudio(browser:any,world:any,{viewport={width:1280,height:800},lang='vi',theme='light',hash='#overview',profile='none',hasTouch=false,keepContext=null}:any={}){
 const context=keepContext||await browser.newContext({viewport,serviceWorkers:'block',reducedMotion:'reduce',colorScheme:theme,hasTouch});
 if(!keepContext){
  await context.addInitScript(({lang,theme}:any)=>{try{if(!sessionStorage.getItem('nav-test-init')){localStorage.setItem('studio-lang',lang);localStorage.setItem('studio-theme',theme);sessionStorage.setItem('nav-test-init','1')}}catch{}},{lang,theme});
  const [name,...rest]=world.cookie.split('=');await context.addCookies([{name,value:rest.join('='),domain:'kitchen.test',path:'/',secure:true,httpOnly:true,sameSite:'Strict'}]);
 }
 const page=await context.newPage(),log:any[]=[],errors:string[]=[],net=PROFILES[profile]||PROFILES.none;
 page.on('pageerror',(e:any)=>errors.push(e.message));page.on('dialog',(d:any)=>d.accept(d.type()==='prompt'?'QA':undefined));
 await page.route(origin+'/**',async(route:any)=>{const req=route.request(),url=new URL(req.url()),t0=Date.now();const fn=url.pathname.match(/^\/\.netlify\/functions\/([\w-]+)/);
  // Stand-in for the Price Check "unplaced prices" ops until the extension work lands (documented shape).
  if(fn&&fn[1]==='scout'&&world.unplaced&&/^studio-unplaced/.test(url.searchParams.get('op')||'')){const op=url.searchParams.get('op');log.push({kind:'api',fn:'scout',op,method:req.method(),at:t0});let body:any={items:world.unplaced.items};
   if(req.method()==='POST'){const b=JSON.parse(req.postData()||'{}');world.unplaced.posts.push({op,body:b});const gone=new Set(op==='studio-unplaced-resolve'?(b.keys||[]):[]);world.unplaced.items=world.unplaced.items.filter((x:any)=>!gone.has(x.factId));body={results:[...gone].map(key=>({key,ok:true,status:b.action==='reject'?'rejected':'placed'}))}}// the real op's answer shape
   if(net.rtt)await sleep(net.rtt);try{await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)})}catch{}return}
  if(fn&&world.handlers[fn[1]]){const entry={kind:'api',fn:fn[1],op:url.searchParams.get('op')||'',fresh:url.searchParams.get('fresh')==='1',method:req.method(),at:t0};log.push(entry);
   const hdr=await req.allHeaders();const r=await world.handlers[fn[1]](new Request(url.href,{method:req.method(),headers:hdr,body:['GET','HEAD'].includes(req.method())?undefined:req.postDataBuffer()}));const body=Buffer.from(await r.arrayBuffer());
   const wait=net.rtt+net.server+(net.bps?body.length/net.bps*1000:0)-(Date.now()-t0);if(wait>0)await sleep(wait);
   try{await route.fulfill({status:r.status,headers:Object.fromEntries(r.headers),body})}catch{}return}
  const file='dist'+(url.pathname==='/'?'/index.html':url.pathname);
  if(!existsSync(file)){log.push({kind:'static',path:url.pathname,bytes:0,at:t0});try{await route.fulfill({status:404,body:''})}catch{}return}
  const body=readFileSync(file);log.push({kind:'static',path:url.pathname,bytes:body.length,at:t0});
  const wait=net.rtt+(net.bps?body.length/net.bps*1000:0);if(wait>0)await sleep(wait);
  try{await route.fulfill({status:200,contentType:mime[extname(file)]||'application/octet-stream',body})}catch{}});
 const t0=Date.now();await page.goto(origin+'/studio.html'+hash);
 return{context,page,log,errors,t0};
}

/** A Studio page is ready when #main is no longer busy, shows no skeleton and has a heading. */
export const ready=(page:any,timeout=20000)=>page.waitForFunction(()=>{const m=document.querySelector('#main');return !!m&&!m.hasAttribute('aria-busy')&&!m.querySelector('.skel')&&!!m.querySelector('h1')&&!/^\s*…\s*$/.test(m.querySelector('.muted')?.textContent||'x')},null,{timeout});

export async function measure(browser:any,world:any,{profile='typical',pages=['overview','accounts','families','urgent','scout','usage','settings','community','feedback','voice']}:any={}){
 const out:any={profile,net:PROFILES[profile],cold:{},warmReload:{},switches:[]};
 const {context,page,log,t0}=await openStudio(browser,world,{profile});
 await ready(page,30000);const firstContent=Date.now()-t0;
 const paints=await page.evaluate(()=>Object.fromEntries(performance.getEntriesByType('paint').map((p:any)=>[p.name,Math.round(p.startTime)])));
 await sleep(4000);// let after-paint work (prefetch, badges) finish so the request count is complete
 const scripts=log.filter(x=>x.kind==='static'&&/\.js$/.test(x.path));
 out.cold={firstPaintMs:paints['first-contentful-paint']??paints['first-paint']??null,firstContentMs:firstContent,staticRequests:log.filter(x=>x.kind==='static').length,scriptRequests:scripts.length,scriptKB:Math.round(scripts.reduce((n,x)=>n+x.bytes,0)/1024),apiRequests:log.filter(x=>x.kind==='api').length,api:log.filter(x=>x.kind==='api').map(x=>x.fn+':'+x.op)};
 for(const key of pages){
  for(const visit of ['first','again']){
   const before=log.length,t=Date.now();await page.evaluate((k:string)=>{location.hash='#'+k},key);
   await sleep(30);await ready(page,30000);const ms=Date.now()-t;await sleep(visit==='first'?1500:600);
   const added=log.slice(before);out.switches.push({page:key,visit,ms,api:added.filter(x=>x.kind==='api').map(x=>x.fn+':'+x.op+(x.fresh?'+fresh':'')),scripts:added.filter(x=>x.kind==='static'&&/\.js$/.test(x.path)).map(x=>x.path)});
   if(visit==='first'){await page.evaluate(()=>{location.hash='#overview'});await sleep(30);await ready(page,30000);await sleep(300)}
  }
 }
 // Reload in the same tab: saved copies are shown at once.
 const t1=Date.now();const before=log.length;await page.reload();await ready(page,30000);out.warmReload={firstContentMs:Date.now()-t1,apiBeforeContent:log.slice(before).filter(x=>x.kind==='api'&&x.at<=Date.now()).length};
 await context.close();
 const sw=out.switches;out.summary={medianFirstVisitMs:median(sw.filter((x:any)=>x.visit==='first').map((x:any)=>x.ms)),medianCachedSwitchMs:median(sw.filter((x:any)=>x.visit==='again').map((x:any)=>x.ms)),maxCachedSwitchMs:Math.max(...sw.filter((x:any)=>x.visit==='again').map((x:any)=>x.ms))};
 return out;
}
const median=(a:number[])=>{const s=[...a].sort((x,y)=>x-y);return s.length?s[Math.floor(s.length/2)]:null};
