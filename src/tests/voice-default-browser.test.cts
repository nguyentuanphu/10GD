// v1.7.1 "More accurate" as the default, browser QA (Chromium 1243, viewport simulation — not physical devices).
// Synthetic pinned files are routed (nothing is downloaded from the model hosts). Covers: the background download
// starts only after the app is idle (not during startup) and switches the recogniser on with a one-time toast; the
// iPhone path (no Network Information API) shows the progress chip with Pause / Resume, the pause survives a reload and
// Resume continues; mobile data and low battery wait; an explicit removal is never auto-downloaded again.
// Screenshots: docs/reviews/v1.7.1/voice-default/ — chip and Downloads row at 375×812, 820×1100, 1280×800 (+320×740),
// VI/EN, light/dark.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const origin='https://kitchen.test',out='docs/reviews/v1.7.1/voice-default';
const mime:Record<string,string>={'.js':'application/javascript','.css':'text/css','.html':'text/html','.webmanifest':'application/manifest+json','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
const sizes:any={narrow:{width:320,height:740},mobile:{width:375,height:812},tablet:{width:820,height:1100},desktop:{width:1280,height:800}};
const IPHONE='Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1';
const fake:any={'transformers.min.js':'export const env={}','asyncify.mjs':'ort-mjs','asyncify.wasm':'ort-wasm','encoder_model_quantized.onnx':'synthetic-encoder','decoder_model_merged_quantized.onnx':'synthetic-decoder','config.json':'{}'};
const b64=(s:string)=>createHash('sha256').update(s).digest('base64'),hex=(s:string)=>createHash('sha256').update(s).digest('hex');
const PATCH={m1:hex(fake['encoder_model_quantized.onnx']),m2:hex(fake['decoder_model_merged_quantized.onnx']),c:hex(fake['config.json']),tf:b64(fake['transformers.min.js']),mjs:b64(fake['asyncify.mjs']),wasm:b64(fake['asyncify.wasm'])};
async function main(){
 mkdirSync(out,{recursive:true});
 const browser=await chromium.launch();let shots=0;
 async function open({viewport=sizes.mobile,lang='vi',theme='light',ios=false,delay=1500,net=null as any,battery=null as any,stall=false,storage=null as any}={}){
  const context=await browser.newContext({locale:'vi-VN',viewport,serviceWorkers:'block',reducedMotion:'reduce',colorScheme:theme,hasTouch:viewport.width<1000,...(ios?{userAgent:IPHONE,isMobile:true}:{})});
  await context.addInitScript(({lang,theme,ios,delay,net,battery,storage})=>{const w=window as any;
   if(!sessionStorage.getItem('qa-init')){sessionStorage.setItem('qa-init','1');if(storage){for(const [k,v] of Object.entries(storage))localStorage.setItem(k,String(v))}localStorage.setItem('bep-theme-mode',theme);localStorage.setItem('guest/bep-language',lang);localStorage.setItem('bep-local-locked','yes')}
   w.BEP_VOICE_AUTO_TEST=true;if(delay!==null)w.BEP_VOICE_AUTO_DELAY_MS=delay;w.__t0=Date.now();
   class FakeRec{start(){}stop(){}abort(){}}w.SpeechRecognition=FakeRec;w.webkitSpeechRecognition=FakeRec;
   Object.defineProperty(navigator,'deviceMemory',{get:()=>8});
   if(ios||net){const c=net?Object.assign(new EventTarget(),net):undefined;w.__conn=c;Object.defineProperty(Navigator.prototype,'connection',{get:()=>c,configurable:true})}
   if(battery){const b=Object.assign(new EventTarget(),battery);w.__battery=b;(navigator as any).getBattery=async()=>b}
  },{lang,theme,ios,delay,net,battery,storage});
  const page=await context.newPage(),errors:string[]=[],hits:{url:string,at:number}[]=[];page.on('pageerror',e=>errors.push(e.message));
  let unstall:any=()=>{};const gate=stall?new Promise(r=>{unstall=r}):Promise.resolve();
  await context.route(/^https:\/\/(cdn\.jsdelivr\.net|huggingface\.co)\//,async route=>{const u=route.request().url();hits.push({url:u,at:Date.now()});const k=Object.keys(fake).find(k=>u.endsWith(k));
   if(k==='decoder_model_merged_quantized.onnx')await gate;
   await route.fulfill(k?{status:200,body:fake[k],headers:{'Access-Control-Allow-Origin':'*'}}:{status:404,body:''}).catch(()=>{})});
  await context.route(origin+'/**',async route=>{const url=new URL(route.request().url()),path=url.pathname;
   if(path.startsWith('/.netlify/')){await route.fulfill({status:401,json:{error:'no'}});return}
   // v1.7.2: the iPhone self-test runs the REAL worker with a fake engine (no model).
   if(path==='/voice-local-worker.js'){await route.fulfill({contentType:'application/javascript',body:readFileSync('dist/voice-local-worker.js','utf8')+`\n;self.__voiceLocalEngineFactory=async()=>({transcribe:async()=>'',dispose(){}});\n`});return}
   if(path==='/startup-scripts.json'){await route.fulfill({json:JSON.parse(readFileSync('dist/startup-scripts.json','utf8'))});return}
   const file=resolve('dist',path==='/'?'index.html':path.slice(1));
   try{await route.fulfill({contentType:mime[extname(file)]||'application/octet-stream',body:readFileSync(file)})}catch{await route.fulfill({status:404,body:'Not found'})}});
  const go=async()=>{await page.goto(origin+'/#today',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>typeof (globalThis as any).voiceAutoRun==='function'&&typeof (globalThis as any).voiceModal==='function'&&document.querySelector('#main h1'),null,{timeout:20000,polling:10});
   await page.evaluate((p:any)=>{const P=(0,eval)('VOICE_LOCAL_PACKS'),TF=(0,eval)('VOICE_LOCAL_TF'),ORT=(0,eval)('VOICE_LOCAL_ORT');
    P.small.files=[{path:'onnx/encoder_model_quantized.onnx',size:17,sha256:p.m1},{path:'onnx/decoder_model_merged_quantized.onnx',size:17,sha256:p.m2},{path:'config.json',size:2,sha256:p.c}];TF.size=19;TF.sha256b64=p.tf;ORT.asyncify[0].size=7;ORT.asyncify[0].sha256b64=p.mjs;ORT.asyncify[1].size=8;ORT.asyncify[1].sha256b64=p.wasm;ORT.plain=ORT.asyncify},PATCH);
   return page.evaluate(()=>Date.now()-(window as any).__t0)};
  return{page,context,errors,hits,go,unstall:()=>unstall()};
 }
 const ls=(page:any,k:string)=>page.evaluate((k:string)=>localStorage.getItem(k),k);
 const toastText=(page:any)=>page.evaluate(()=>document.querySelector('#toast')?.textContent||'');
 const chip=(page:any)=>page.locator('#vl-auto-chip');
 async function check(page:any,label:string,sel:string){
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.ok(overflow<=1,label+': horizontal overflow '+overflow+'px');
  const small=await page.evaluate((sel:string)=>[...document.querySelectorAll(sel)].filter((e:any)=>e.offsetParent&&e.getBoundingClientRect().height<43.5).map((e:any)=>e.outerHTML.slice(0,60)),sel);assert.deepEqual(small,[],label+': touch targets under 44px');
  const out=await page.evaluate(()=>[...document.querySelectorAll('#vl-auto-chip *,.offline-pack[data-pack="voice-local-small"] *')].filter((e:any)=>e.offsetParent&&(e.getBoundingClientRect().right>innerWidth+1||e.getBoundingClientRect().left<-1)).length);assert.equal(out,0,label+': content outside the viewport');
  const text=await page.evaluate(()=>document.body.innerText);assert.ok(!/netlify|blobs/i.test(text),label+': no hosting vendor named');
 }
 try{
  // 1. Desktop Chrome (Network Information API, not cellular), default 10 s idle delay: nothing during startup;
  //    afterwards the pack downloads, becomes the recogniser and a one-time toast says so.
  {const {page,context,errors,hits,go}=await open({viewport:sizes.desktop,delay:null});const ready=await go();
   await page.waitForTimeout(4000);assert.equal(hits.length,0,'no pack request during startup / the first seconds');
   assert.equal(await page.evaluate('VoiceAPI.activeRecognizer()'),'browser','browser recogniser while the pack is not ready');
   await page.waitForFunction(()=>localStorage.getItem('bep-voice-recognizer')==='local-small',null,{timeout:20000});
   const t0=await page.evaluate(()=>(window as any).__t0),first=Math.min(...hits.map(h=>h.at))-t0;
   assert.ok(first>=10000,'first pack request '+first+' ms after navigation (app ready at '+ready+' ms)');
   assert.equal(await page.evaluate('VoiceAPI.activeRecognizer()'),'local-small','switched automatically');
   await page.waitForFunction(()=>/Đã bật giọng nói chính xác/.test(document.querySelector('#toast')?.textContent||''),null,{timeout:4000});
   assert.equal(await ls(page,'bep-voice-auto-toast'),'1');assert.equal(new Set(hits.map(h=>h.url)).size,6,'pinned files only');
   assert.equal(await page.locator('#vl-auto-chip').count(),0,'no chip left once ready');
   // Next launch: no download, no second toast.
   const n=hits.length;await page.evaluate('BEP_VOICE_AUTO_DELAY_MS=200');await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>typeof (globalThis as any).voiceAutoRun==='function');
   await page.waitForTimeout(1500);assert.equal(hits.length,n,'ready pack: nothing downloaded again');assert.ok(!/Đã bật giọng nói chính xác/.test(await toastText(page)),'toast only once');
   // The family switches back to the browser recogniser: kept after reload.
   await page.evaluate("localStorage.setItem('bep-voice-recognizer','browser')");await page.reload({waitUntil:'domcontentloaded'});await page.waitForTimeout(1200);
   assert.equal(await ls(page,'bep-voice-recognizer'),'browser','explicit choice respected');
   assert.deepEqual(errors,[]);await context.close();console.log('PASS idle start (not during startup), automatic switch + one-time toast, explicit browser choice kept');}

  // 2. iPhone (no Network Information API): starts with the chip; Pause persists across a reload; Resume finishes.
  {const {page,context,errors,hits,go,unstall}=await open({ios:true,stall:true});await go();
   await chip(page).waitFor({timeout:10000});
   assert.match(await chip(page).innerText(),/Đang tải bộ giọng chính xác[\s\S]*MB[\s\S]*4G\/5G[\s\S]*Tạm dừng/);
   await check(page,'iphone chip','#vl-auto-chip button');
   await page.locator('#vl-auto-chip [data-vl-auto-pause]').click();
   await page.waitForFunction(()=>document.querySelector('#vl-auto-chip')?.getAttribute('data-state')==='paused');
   assert.equal(await ls(page,'bep-voice-auto-paused'),'1');assert.match(await chip(page).innerText(),/Đã tạm dừng[\s\S]*Tiếp tục/);
   unstall();const before=hits.length;
   await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>typeof (globalThis as any).voiceAutoRun==='function');
   await chip(page).waitFor({timeout:10000});assert.equal(await chip(page).getAttribute('data-state'),'paused','paused chip on the next launch');
   await page.waitForTimeout(500);assert.equal(hits.length,before,'paused: nothing downloaded on launch');
   assert.equal(await page.evaluate("voiceLocalStatus('small')"),'partial','what was downloaded before the pause is kept');
   await page.evaluate((p:any)=>{const P=(0,eval)('VOICE_LOCAL_PACKS'),TF=(0,eval)('VOICE_LOCAL_TF'),ORT=(0,eval)('VOICE_LOCAL_ORT');P.small.files=[{path:'onnx/encoder_model_quantized.onnx',size:17,sha256:p.m1},{path:'onnx/decoder_model_merged_quantized.onnx',size:17,sha256:p.m2},{path:'config.json',size:2,sha256:p.c}];TF.size=19;TF.sha256b64=p.tf;ORT.asyncify[0].size=7;ORT.asyncify[0].sha256b64=p.mjs;ORT.asyncify[1].size=8;ORT.asyncify[1].sha256b64=p.wasm;ORT.plain=ORT.asyncify},PATCH);
   const seen=new Set(hits.map(h=>h.url.split('/').pop()));
   await page.locator('#vl-auto-chip [data-vl-auto-resume]').click();
   await page.waitForFunction(()=>localStorage.getItem('bep-voice-recognizer')==='local-small',null,{timeout:10000});
   const after=hits.slice(before).map(h=>h.url.split('/').pop());assert.ok(after.every(f=>f==='decoder_model_merged_quantized.onnx'||!seen.has(f)),'resume fetches only what is missing: '+after.join(','));
   assert.equal(JSON.parse(await ls(page,'bep-voice-local-selftest')||'null')?.ok,true,'v1.7.2: switched on only after the self-test passed on this iPhone');assert.equal(await ls(page,'bep-voice-local-busy'),null,'self-test model freed');
   assert.equal(await ls(page,'bep-voice-auto-paused'),null);assert.equal(await page.locator('#vl-auto-chip').count(),0);
   assert.deepEqual(errors,[]);await context.close();console.log('PASS iPhone: chip with 4G/5G note, Pause persisted across reload, Resume continues and switches on');}

  // 3. Android on mobile data waits; Wi-Fi starts it. Data Saver waits.
  {const {page,context,errors,hits,go}=await open({net:{type:'cellular',effectiveType:'4g',saveData:false}});await go();
   await page.waitForTimeout(2500);assert.equal(hits.length,0,'cellular: waits');assert.equal(await page.evaluate("voiceAuto.last&&voiceAuto.last.reason"),'cellular');
   await page.evaluate(()=>{const c=(window as any).__conn;c.type='wifi';c.dispatchEvent(new Event('change'))});
   await page.waitForFunction(()=>localStorage.getItem('bep-voice-recognizer')==='local-small',null,{timeout:10000});assert.ok(hits.length>0);
   assert.deepEqual(errors,[]);await context.close();}
  {const {page,context,hits,go}=await open({net:{type:'wifi',saveData:true}});await go();await page.waitForTimeout(2500);assert.equal(hits.length,0,'Data Saver: waits');await context.close();}
  console.log('PASS mobile data and Data Saver wait; switching to Wi-Fi starts the download');

  // 4. Low battery waits; plugging in starts it.
  {const {page,context,errors,hits,go}=await open({battery:{level:.12,charging:false}});await go();
   await page.waitForTimeout(2500);assert.equal(hits.length,0,'low battery: waits');assert.equal(await page.evaluate("voiceAuto.last.reason"),'battery');
   await page.evaluate(()=>{const b=(window as any).__battery;b.charging=true;b.dispatchEvent(new Event('chargingchange'))});
   await page.waitForFunction(()=>localStorage.getItem('bep-voice-recognizer')==='local-small',null,{timeout:10000});
   assert.deepEqual(errors,[]);await context.close();console.log('PASS low battery waits; charging starts the download');}

  // 5. Explicit removal in Downloads: the pack is never downloaded automatically again; the option turns it back on.
  {const {page,context,errors,hits,go}=await open({});await go();
   await page.waitForFunction(()=>localStorage.getItem('bep-voice-recognizer')==='local-small',null,{timeout:10000});
   await page.evaluate("closeModal();otherSettingsModal('offline-downloads')");const row=page.locator('.offline-pack[data-pack="voice-local-small"]');
   await row.locator('[data-offline-remove]').waitFor();
   assert.match(await row.innerText(),/Tự tải bộ giọng chính xác[\s\S]*Cập nhật app không cần tải lại gói này/);
   await row.locator('[data-offline-remove]').click();await page.locator('#confirm-root [data-confirm="yes"]').click();
   await page.waitForFunction(()=>localStorage.getItem('bep-voice-auto-removed')==='1');
   for(let i=0;i<40&&(await page.evaluate("voiceLocalStatus('small')"))!=='none';i++)await page.waitForTimeout(100);
   assert.equal(await page.evaluate("voiceLocalStatus('small')"),'none');await page.waitForTimeout(200);assert.equal(await page.evaluate('VoiceAPI.activeRecognizer()'),'browser');
   const n=hits.length;await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>typeof (globalThis as any).voiceAutoRun==='function',null,{polling:10});
   await page.evaluate((p:any)=>{const P=(0,eval)('VOICE_LOCAL_PACKS'),TF=(0,eval)('VOICE_LOCAL_TF'),ORT=(0,eval)('VOICE_LOCAL_ORT');P.small.files=[{path:'onnx/encoder_model_quantized.onnx',size:17,sha256:p.m1},{path:'onnx/decoder_model_merged_quantized.onnx',size:17,sha256:p.m2},{path:'config.json',size:2,sha256:p.c}];TF.size=19;TF.sha256b64=p.tf;ORT.asyncify[0].size=7;ORT.asyncify[0].sha256b64=p.mjs;ORT.asyncify[1].size=8;ORT.asyncify[1].sha256b64=p.wasm;ORT.plain=ORT.asyncify},PATCH);
   await page.waitForTimeout(2500);
   assert.equal(hits.length,n,'removed: no automatic download');assert.equal(await page.evaluate('voiceAuto.last&&voiceAuto.last.reason'),'removed');
   await page.evaluate("otherSettingsModal('offline-downloads')");const box=page.locator('#vl-auto-dl');assert.equal(await box.isChecked(),true);
   await box.uncheck();assert.equal(await ls(page,'bep-voice-auto-download'),'0');await box.check();
   await page.waitForFunction(()=>localStorage.getItem('bep-voice-recognizer')==='local-small',null,{timeout:10000});assert.ok(hits.length>n,'option on again: downloads');
   assert.deepEqual(errors,[]);await context.close();console.log('PASS explicit removal is respected; the option re-enables it');}

  // 6. Screenshots: chip while downloading (stalled at a realistic byte count) and the Downloads row.
  for(const [size,lang,theme] of [['mobile','vi','light'],['tablet','vi','light'],['desktop','vi','light'],['mobile','en','dark'],['tablet','en','dark'],['desktop','en','dark'],['narrow','vi','light'],['mobile','vi','dark'],['mobile','en','light']]){
   const {page,context,errors,go}=await open({viewport:sizes[size],lang,theme,ios:size!=='desktop',stall:true});await go();
   await chip(page).waitFor({timeout:10000});
   await page.evaluate(()=>{const a=(0,eval)('voiceAuto');a.job.done=120*1048576;a.job.total=279299677;(0,eval)('voiceAutoUpdateProgress()')});
   const t=await chip(page).innerText();
   if(lang==='vi')assert.match(t,/Đang tải bộ giọng chính xác · 120\/266 MB/);else assert.match(t,/Downloading accurate voice · 120\/266 MB[\s\S]*Pause/);
   const {width,height}=sizes[size];await check(page,`${size} ${lang} ${theme} chip`,'#vl-auto-chip button');
   if(sizes[size].width<=760){const nav=await page.evaluate(()=>{const c=document.querySelector('#vl-auto-chip')!.getBoundingClientRect(),n=document.querySelector('.sidebar')?.getBoundingClientRect();return{chip:c.bottom,nav:n?n.top:innerHeight}});assert.ok(nav.chip<=nav.nav+1,`${size}: chip sits above the bottom navigation (${nav.chip} vs ${nav.nav})`)}
   await page.screenshot({path:`${out}/chip-${lang}-${theme}-${width}x${height}.jpg`,type:'jpeg',quality:72});shots++;
   if(size!=='narrow'){await page.evaluate("otherSettingsModal('offline-downloads')");const row=page.locator('.offline-pack[data-pack="voice-local-small"]');await row.waitFor();await row.locator('.vl-auto-opt').waitFor();
    await page.waitForFunction(()=>/Đang tự tải…|Downloading automatically…/.test(document.querySelector('.offline-pack[data-pack="voice-local-small"] .offline-pack-status')?.textContent||''));await page.waitForTimeout(700);
    assert.equal(await row.locator('[data-offline-download]').count(),0,'no second Download button while the automatic download runs');
    await page.evaluate(()=>(0,eval)('voiceAutoUpdateProgress()'));
    const rt=await row.innerText();if(lang==='vi')assert.match(rt,/Tự tải bộ giọng chính xác[\s\S]*Cập nhật app không cần tải lại gói này[\s\S]*Đang tự tải · 120\/266 MB/);else assert.match(rt,/Download accurate voice automatically[\s\S]*App updates don’t re-download this pack[\s\S]*Downloading automatically · 120\/266 MB/);
    await check(page,`${size} ${lang} ${theme} row`,'.offline-pack[data-pack="voice-local-small"] .btn,.offline-pack[data-pack="voice-local-small"] .vl-auto-opt');
    await row.scrollIntoViewIfNeeded();await page.waitForTimeout(80);await page.screenshot({path:`${out}/downloads-row-${lang}-${theme}-${width}x${height}.jpg`,type:'jpeg',quality:72});shots++}
   assert.deepEqual(errors,[]);await context.close();
  }
  // Paused chip (EN, mobile) for the record.
  {const {page,context,go}=await open({ios:true,lang:'en',storage:{'bep-voice-auto-paused':'1','bep-voice-auto-progress':JSON.stringify({done:120*1048576,total:279299677})}});await go();
   await chip(page).waitFor({timeout:10000});assert.match(await chip(page).innerText(),/paused · 120\/266 MB[\s\S]*Resume/);await page.screenshot({path:`${out}/chip-paused-en-light-375x812.jpg`,type:'jpeg',quality:72});shots++;await context.close()}
  console.log(`PASS chip and Downloads row at 320/375/820/1280, VI/EN, light/dark (${shots} screenshots in ${out})`);
 }finally{await browser.close()}
}
main().catch(e=>{console.error(e);process.exit(1)});
