// v1.7.4 browser QA for the iPhone memory fallback and the self-check page (Chromium, viewport simulation and an iPhone
// user agent — NOT a physical iPhone; iOS memory limits cannot be reproduced here). Covers: a memory crash → short notice
// with ONE guarded "Thử lại", no worker started, nothing loads it automatically; a second crash → no "Thử lại", off for
// this device; the iPhone dictation tip + "Mở bàn phím để nói" (focuses the text box) in the quick voice sheet and the
// price sheet, not when accurate voice is in use and never off iOS; the self-check page from Account & settings and from
// the voice sheet: pass (timings, model memory, phase), fail, page died in a phase → shown after the reload, offline run;
// "Gỡ gói" says how much it freed. Responsive screenshots 320/375/820/1280, VI/EN, light/dark (overflow, ≥44 px targets,
// no hosting vendor named): docs/reviews/v1.7.4/voice-ios-memory/.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const origin='https://kitchen.test',out='docs/reviews/v1.7.4/voice-ios-memory';
const IPHONE='Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1';
const mime:Record<string,string>={'.js':'application/javascript','.css':'text/css','.html':'text/html','.webmanifest':'application/manifest+json','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
const sizes:any={narrow:{width:320,height:740},mobile:{width:375,height:812},tablet:{width:820,height:1100},desktop:{width:1280,height:800}};
const fakeFiles:any={'transformers.min.js':'export const env={}','ort-wasm-simd-threaded.mjs':'ort-mjs','ort-wasm-simd-threaded.wasm':'ort-wasm','asyncify.mjs':'ort-mjs','asyncify.wasm':'ort-wasm','encoder_model_quantized.onnx':'synthetic-encoder','decoder_model_merged_quantized.onnx':'synthetic-decoder','config.json':'{}'};
const b64=(s:string)=>createHash('sha256').update(s).digest('base64'),hex=(s:string)=>createHash('sha256').update(s).digest('hex');
const PATCH={m1:hex(fakeFiles['encoder_model_quantized.onnx']),m2:hex(fakeFiles['decoder_model_merged_quantized.onnx']),c:hex('{}'),tf:b64(fakeFiles['transformers.min.js']),mjs:b64('ort-mjs'),wasm:b64('ort-wasm')};
// The fake engine reports the same shape as the real worker ('loaded'/'result' carry stats + WebAssembly memory).
const ENGINE=(mode:string,delay=0)=>`\n;self.__voiceLocalEngineFactory=async()=>{await new Promise(r=>setTimeout(r,${delay}));${mode==='fail'?"throw Object.assign(new Error('oom'),{code:'crash'})":"return{transcribe:async()=>{await new Promise(r=>setTimeout(r,"+delay+"));return ''},stats:{weights:[{file:'encoder_model_quantized.onnx',mb:88},{file:'decoder_model_merged_quantized.onnx',mb:149}],released:2,fallback:0},dispose(){}}"}};\n`;
let shots=0;
async function main(){
 mkdirSync(out,{recursive:true});
 const browser=await chromium.launch();
 async function open({viewport=sizes.mobile,lang='vi',theme='light',ios=true,init={} as Record<string,string>,engine='ok',delay=0}={}){
  const context=await browser.newContext({viewport,serviceWorkers:'block',reducedMotion:'reduce',colorScheme:theme as any,hasTouch:viewport.width<1000,...(ios?{userAgent:IPHONE,isMobile:viewport.width<1000}:{})});
  await context.addInitScript(({lang,theme,init})=>{const w=window as any;
   if(!sessionStorage.getItem('qa-init')){sessionStorage.setItem('qa-init','1');localStorage.setItem('bep-theme-mode',theme);localStorage.setItem('guest/bep-language',lang);localStorage.setItem('bep-local-locked','yes');for(const [k,v] of Object.entries(init))localStorage.setItem(k,v)}
   w.BEP_VOICE_AUTO_DELAY_MS=600000;
   w.__recs=[];class FakeRec{lang='';started=false;ended=false;onresult:any;onend:any;onerror:any;constructor(){w.__recs.push(this)}start(){this.started=true}stop(){this.end()}abort(){this.end()}end(){if(this.ended)return;this.ended=true;setTimeout(()=>this.onend&&this.onend(),0)}}
   w.SpeechRecognition=FakeRec;w.webkitSpeechRecognition=FakeRec;
   w.__workers=0;const W=w.Worker;w.Worker=function(url:any,o:any){if(String(o?.name||'')==='bep-voice-local')w.__workers++;return new W(url,o)};w.Worker.prototype=W.prototype;
   // The tests hold the mic button with a mouse: no microphone permission prompt in this browser.
   Object.defineProperty(navigator,'permissions',{get:()=>({query:async()=>({state:'granted',onchange:null})}),configurable:true});
  },{lang,theme,init});
  const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await context.route(/^https:\/\/(cdn\.jsdelivr\.net|huggingface\.co)\//,async route=>{const u=route.request().url();const k=Object.keys(fakeFiles).find(k=>u.endsWith(k));await route.fulfill(k?{status:200,body:fakeFiles[k],headers:{'Access-Control-Allow-Origin':'*'}}:{status:404,body:''}).catch(()=>{})});
  await context.route(origin+'/**',async route=>{const url=new URL(route.request().url()),path=url.pathname;
   if(path.startsWith('/.netlify/')){await route.fulfill({status:401,json:{error:'no'}});return}
   if(path==='/startup-scripts.json'){await route.fulfill({json:JSON.parse(readFileSync('dist/startup-scripts.json','utf8'))});return}
   if(path==='/voice-local-worker.js'){await route.fulfill({contentType:'application/javascript',body:readFileSync('dist/voice-local-worker.js','utf8')+ENGINE(engine,delay)});return}
   const file=resolve('dist',path==='/'?'index.html':path.slice(1));
   try{await route.fulfill({contentType:mime[extname(file)]||'application/octet-stream',body:readFileSync(file)})}catch{await route.fulfill({status:404,body:'Not found'})}});
  await page.goto(origin+'/#today',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof (globalThis as any).voiceModal==='function'&&typeof (globalThis as any).voiceLocalSelfCheck==='function'&&document.querySelector('#main h1'),null,{timeout:20000});
  return{page,context,errors};
 }
 const fakePack=async(page:any)=>{await page.evaluate((p:any)=>{const P=(0,eval)('VOICE_LOCAL_PACKS'),TF=(0,eval)('VOICE_LOCAL_TF'),ORT=(0,eval)('VOICE_LOCAL_ORT');P.small.files=[{path:'onnx/encoder_model_quantized.onnx',size:17,sha256:p.m1},{path:'onnx/decoder_model_merged_quantized.onnx',size:17,sha256:p.m2},{path:'config.json',size:2,sha256:p.c}];TF.size=19;TF.sha256b64=p.tf;for(const set of [ORT.asyncify,ORT.plain]){set[0].size=7;set[0].sha256b64=p.mjs;set[1].size=8;set[1].sha256b64=p.wasm}},PATCH);
  assert.equal(await page.evaluate("voiceLocalDownload('small',()=>{}).then(()=>voiceLocalStatus('small'))"),'ready')};
 const ls=(page:any,k:string)=>page.evaluate((k:string)=>localStorage.getItem(k),k);
 const CRASH={'bep-voice-recognizer':'local-small','bep-voice-local-busy':JSON.stringify({pack:'small',phase:'self-test',at:1,v:2}),'bep-voice-auto-toast':'1'};
 async function check(page:any,label:string,sel:string){
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.ok(overflow<=1,label+': horizontal overflow '+overflow+'px');
  const small=await page.evaluate((sel:string)=>[...document.querySelectorAll(sel+' button')].filter((e:any)=>e.offsetParent&&(e.getBoundingClientRect().height<43.5||e.getBoundingClientRect().width<43.5)).map((e:any)=>(e.textContent||'').trim()),sel);
  assert.deepEqual(small,[],label+': touch targets under 44px');
  const clipped=await page.evaluate((sel:string)=>[...document.querySelectorAll(sel+' button,'+sel+' dd,'+sel+' p')].filter((e:any)=>e.offsetParent&&e.scrollWidth>e.clientWidth+1).map((e:any)=>(e.textContent||'').trim().slice(0,40)),sel);
  assert.deepEqual(clipped,[],label+': clipped text');
  assert.ok(!/netlify|blobs/i.test(await page.locator(sel).innerText()),label+': no hosting vendor named');
 }
 const combos:[string,string,string][]=[['mobile','vi','light'],['mobile','vi','dark'],['mobile','en','light'],['mobile','en','dark'],['narrow','vi','light'],['tablet','vi','light'],['tablet','en','dark'],['desktop','en','light'],['desktop','vi','dark']];
 try{
  // 1. iPhone, after a memory crash: short notice with one guarded Thử lại; no worker; the voice sheet shows the
  //    dictation tip and "Mở bàn phím để nói" focuses the text box (own listening stopped).
  for(const [size,lang,theme] of combos){
   const {page,context,errors}=await open({viewport:sizes[size],lang,theme,init:CRASH});
   const notice=page.locator('#vl-crash-notice');await notice.waitFor({timeout:5000});
   assert.match(await notice.innerText(),lang==='vi'?/Giọng chính xác tạm tắt vì máy thiếu bộ nhớ[\s\S]*Thử lại[\s\S]*Gỡ gói/:/Accurate voice is paused[\s\S]*Try again[\s\S]*Remove pack/);
   assert.equal(JSON.parse(await ls(page,'bep-voice-local-crashes')).n,1);
   await page.evaluate('voiceModal()');await page.waitForSelector('#vl-dictate-voice-text');
   const tip=page.locator('#vl-dictate-voice-text');
   assert.match(await tip.innerText(),lang==='vi'?/Trên iPhone: chạm vào ô chữ rồi bấm\s+trên bàn phím để đọc chính tả \(tiếng Việt rất tốt\)\.[\s\S]*Mở bàn phím để nói/:/On iPhone: tap the text box, then tap\s+on the keyboard to dictate[\s\S]*Open the keyboard to talk/);
   await check(page,`sheet ${size} ${lang} ${theme}`,'#vl-dictate-voice-text');
   const box=await tip.boundingBox(),vw=sizes[size].width;assert.ok(box&&box.x>=0&&box.x+box.width<=vw+1,'tip inside the viewport');
   await tip.scrollIntoViewIfNeeded();await page.waitForTimeout(60);
   await page.screenshot({path:`${out}/sheet-dictation-tip-${lang}-${theme}-${size}-${vw}x${sizes[size].height}.png`});shots++;
   await tip.locator('[data-vl-dictate]').click();
   assert.equal(await page.evaluate(()=>document.activeElement?.id),'voice-text','keyboard opens on the text box');
   assert.match(await page.locator('#voice-status').innerText(),lang==='vi'?/Bấm\s+trên bàn phím/:/Tap\s+on the keyboard/);
   if(size==='mobile'&&lang==='vi'&&theme==='light'){
    // Language switch keeps the tip in the app language.
    await page.evaluate("appLanguage='en';render()");await page.waitForFunction(()=>/On iPhone/.test(document.getElementById('vl-dictate-voice-text')?.textContent||''));await page.evaluate("appLanguage='vi';render()");
    // The price sheet gets the same tip.
    await page.evaluate("closeModal();voicePriceOpen()");await page.waitForSelector('#vl-dictate-vp-text');
    await page.locator('#vl-dictate-vp-text [data-vl-dictate]').click();assert.equal(await page.evaluate(()=>document.activeElement?.id),'vp-text');
    await page.screenshot({path:`${out}/price-sheet-dictation-tip-vi-light-mobile-375x812.png`});shots++;
    await page.evaluate('closeModal()');
    // Nothing loads the pack by itself after the crash, even when it is downloaded and the automatic default runs.
    await fakePack(page);await page.evaluate("voiceAutoRun('test')");await page.waitForTimeout(400);
    assert.equal(await page.evaluate(()=>(window as any).__workers),0,'no automatic load after a memory crash');assert.equal(await ls(page,'bep-voice-recognizer'),null);
   }
   assert.deepEqual(errors,[]);await context.close();
  }
  console.log('PASS memory crash → short notice + one guarded try; iPhone dictation tip (quick voice + price sheets) at 4 sizes, VI/EN, light/dark; no automatic reload');

  // 2. Second crash → off for this device: no Thử lại anywhere, the self-check does not run.
  {let ver='';{const a=await open({lang:'vi'});ver=await a.page.evaluate("voiceLocalGuardVersion('small')");await a.context.close()}
   // This release already had one memory crash on this device (n=1), and the page died again with the model in memory.
   const {page,context,errors}=await open({lang:'vi',init:{...CRASH,'bep-voice-local-busy':JSON.stringify({pack:'small',phase:'transcribing',at:2,v:2}),'bep-voice-local-crashes':JSON.stringify({pack:'small',ver,n:1})}});
   const notice=page.locator('#vl-crash-notice');await notice.waitFor({timeout:5000});
   assert.match(await notice.innerText(),/đã tắt trên máy này vì máy thiếu bộ nhớ \(2 lần\)/);assert.equal(await notice.locator('[data-vl-retry]').count(),0,'no Thử lại after the second crash');
   await check(page,'disabled notice','#vl-crash-notice');
   await page.screenshot({path:`${out}/crash-notice-disabled-vi-light-mobile-375x812.png`});shots++;
   await page.evaluate('voiceModal()');await page.waitForSelector('#vl-fail');assert.equal(await page.locator('#vl-fail [data-vl-retry]').count(),0);assert.ok(await page.locator('#vl-dictate-voice-text').count());
   await fakePack(page);await page.evaluate('closeModal();voiceLocalCheckModal()');await page.waitForSelector('#vl-selfcheck');
   assert.equal(await page.locator('[data-vl-check-run]').count(),0,'the check cannot start');assert.match(await page.locator('#vl-selfcheck').innerText(),/2 lần/);
   assert.equal(await page.evaluate(()=>(window as any).__workers),0);
   assert.deepEqual(errors,[]);await context.close();}
  console.log('PASS second crash → off for this device (no Thử lại, no self-check)');

  // 3. Self-check page: opened from Account & settings, runs, passes; shown at all sizes/themes/languages.
  for(const [size,lang,theme] of combos){
   const {page,context,errors}=await open({viewport:sizes[size],lang,theme,ios:size!=='desktop',delay:300});
   await fakePack(page);
   await page.evaluate("otherSettingsModal()");await page.waitForSelector('#settings-voice [data-vl-check]');
   // v1.7.11 (owner: long button labels get a short name; the full wording stays for screen readers)
   assert.match(await page.locator('#settings-voice').innerText(),lang==='vi'?/Giọng nói trên máy[\s\S]*Thử giọng nói/:/On-device voice[\s\S]*Test voice/);
   assert.match(String(await page.locator('#settings-voice [data-vl-check]').getAttribute('aria-label')),lang==='vi'?/Kiểm tra giọng chính xác trên máy này/:/Check accurate voice on this device/);
   await page.locator('#settings-voice [data-vl-check]').click();await page.waitForSelector('#vl-selfcheck [data-vl-check-run]');
   assert.match(await page.locator('#modal-title').innerText(),lang==='vi'?/Kiểm tra giọng chính xác trên máy này/:/Check accurate voice on this device/);
   await page.locator('[data-vl-check-run]').click();
   await page.waitForSelector('#vl-selfcheck .vl-sc-status');
   assert.match(await page.locator('#vl-selfcheck .vl-sc-status').innerText(),lang==='vi'?/Nạp mô hình|Bắt đầu|Nhận dạng/:/Loading|Starting|Recognising/);
   if(size==='mobile'&&lang==='vi'&&theme==='light'){await page.screenshot({path:`${out}/self-check-running-vi-light-mobile-375x812.png`});shots++}
   await page.waitForSelector('#vl-selfcheck [data-vl-check-copy]',{timeout:10000});
   const text=await page.locator('#vl-selfcheck').innerText();
   assert.match(text,lang==='vi'?/Thiết bị[\s\S]*(iPhone|Linux)[\s\S]*Kết quả[\s\S]*Đạt[\s\S]*Bước đã tới[\s\S]*Xong[\s\S]*Thời gian nạp[\s\S]*Thời gian nhận dạng[\s\S]*Bộ nhớ cao nhất \(mô hình\)/:/Device[\s\S]*Result[\s\S]*Passed[\s\S]*Phase reached[\s\S]*Done[\s\S]*Load time[\s\S]*Transcription time[\s\S]*Peak memory \(model\)/);
   const rec=JSON.parse(await ls(page,'bep-voice-local-check'));assert.equal(rec.ok,true);assert.equal(rec.running,false);assert.equal(typeof rec.loadMs,'number');
   assert.equal(await ls(page,'bep-voice-local-busy'),null,'model freed after the check');
   await check(page,`check ${size} ${lang} ${theme}`,'#vl-selfcheck');
   await page.waitForTimeout(60);await page.screenshot({path:`${out}/self-check-passed-${lang}-${theme}-${size}-${sizes[size].width}x${sizes[size].height}.png`});shots++;
   if(size==='mobile'&&lang==='vi'&&theme==='light'){
    // "Dùng giọng chính xác" switches it on (explicit), then the iPhone tip disappears in the sheet.
    await page.locator('[data-vl-check-use]').click();await page.waitForFunction(()=>localStorage.getItem('bep-voice-recognizer')==='local-small');
    await page.evaluate('closeModal();voiceModal()');await page.waitForSelector('#vl-rec-note');await page.waitForTimeout(150);assert.equal(await page.locator('#vl-dictate-voice-text').count(),0,'no tip while accurate voice is in use');
    // The voice sheet's settings have the same entry.
    await page.evaluate("document.getElementById('voice-settings').open=true");await page.waitForSelector('#voice-local-settings [data-vl-check]');
    // Gỡ gói says how much it freed.
    await page.evaluate('closeModal();voiceLocalCheckModal()');await page.waitForSelector('#vl-selfcheck [data-vl-remove]');await page.locator('#vl-selfcheck [data-vl-remove]').click();
    await page.waitForFunction(()=>/Đã gỡ gói giọng chính xác — giải phóng [\d,.]+ MB/.test(document.body.innerText));
   }
   assert.deepEqual(errors,[]);await context.close();
  }
  console.log('PASS self-check page from Account & settings: run → passed with timings, memory and phase (9 size/theme/language views); Use accurate voice; Gỡ gói reports MB freed');

  // 4. Self-check fails (engine error) → "Không đạt" with the phase; offline: the check still runs from the stored pack.
  {const {page,context,errors}=await open({lang:'en',engine:'fail'});await fakePack(page);await page.evaluate('voiceLocalCheckModal()');await page.locator('[data-vl-check-run]').click();
   await page.waitForFunction(()=>/Did not pass/.test(document.getElementById('vl-selfcheck')?.textContent||''),null,{timeout:8000});
   assert.match(await page.locator('#vl-selfcheck').innerText(),/Did not pass \(crash\)[\s\S]*Phase reached[\s\S]*Loading the model/);assert.ok(await ls(page,'bep-voice-local-fail'));
   await check(page,'check failed','#vl-selfcheck');await page.screenshot({path:`${out}/self-check-failed-en-light-mobile-375x812.png`});shots++;
   assert.deepEqual(errors,[]);await context.close();}
  {const {page,context,errors}=await open({lang:'vi'});await fakePack(page);await context.setOffline(true);await page.evaluate("globalThis.BEP_OFFLINE=true");
   await page.evaluate('voiceLocalCheckModal()');await page.locator('[data-vl-check-run]').click();await page.waitForSelector('#vl-selfcheck [data-vl-check-copy]',{timeout:10000});
   assert.match(await page.locator('#vl-selfcheck').innerText(),/Đạt — chạy được trên máy này/,'works offline from the stored pack');
   await page.screenshot({path:`${out}/self-check-offline-passed-vi-light-mobile-375x812.png`});shots++;
   assert.deepEqual(errors,[]);await context.close();}
  console.log('PASS self-check failure shows the phase; the check runs offline from the stored pack');

  // 5. The page dies during the check (iOS kill): next start re-opens the check with the phase it died in.
  for(const lang of ['vi','en']){const {page,context,errors}=await open({lang,init:{'bep-voice-auto-toast':'1','bep-voice-local-check':JSON.stringify({pack:'small',v:1,running:true,phase:'transcribing',at:Date.now()-5000,device:{cls:'iphone',memoryGB:null,cores:6}}),'bep-voice-local-busy':JSON.stringify({pack:'small',phase:'self-test',at:Date.now()-5000,v:2})}});
   await page.waitForSelector('#vl-selfcheck .vl-sc-died',{timeout:6000});
   assert.match(await page.locator('#vl-selfcheck').innerText(),lang==='vi'?/trang bị tắt ở bước “Nhận dạng đoạn mẫu”[\s\S]*Trang bị tắt \(máy thiếu bộ nhớ\)[\s\S]*Bị tắt ở bước[\s\S]*Nhận dạng đoạn mẫu/:/page was closed at “Recognising the test clip”[\s\S]*Closed during[\s\S]*Recognising the test clip/);
   assert.equal(await page.locator('#vl-crash-notice').count(),0,'no second notice on top');assert.equal(JSON.parse(await ls(page,'bep-voice-local-crashes')).n,1);
   assert.equal(await page.locator('[data-vl-check-run]').count(),1,'one more guarded try is allowed');
   await check(page,'check died '+lang,'#vl-selfcheck');await page.screenshot({path:`${out}/self-check-died-${lang}-light-mobile-375x812.png`});shots++;
   await page.evaluate('closeModal()');await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>typeof (globalThis as any).voiceLocalSelfCheck==='function');await page.waitForTimeout(1500);
   assert.equal(await page.locator('#vl-selfcheck').count(),0,'shown once');assert.equal(await page.evaluate(()=>(window as any).__workers),0);
   assert.deepEqual(errors,[]);await context.close()}
  console.log('PASS page died during the check → re-opened once with the phase (VI/EN)');

  // 6. Not iPhone: no dictation tip.
  {const {page,context,errors}=await open({viewport:sizes.desktop,ios:false,lang:'vi'});await page.evaluate('voiceModal()');await page.waitForSelector('#voice-text');await page.waitForTimeout(200);
   assert.equal(await page.locator('.vl-dictate').count(),0);assert.deepEqual(errors,[]);await context.close()}
  console.log('PASS no iPhone tip on other devices');
 }finally{await browser.close()}
 console.log(`voice-ios-memory browser QA: ${shots} screenshots in ${out}`);
}
main().catch(e=>{console.error(e);process.exit(1)});
