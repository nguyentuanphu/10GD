// v1.7.2 browser QA for the iPhone crash loop with on-device "More accurate" (Chromium, viewport simulation and an
// iPhone user agent — NOT a physical iPhone; iOS memory limits cannot be reproduced here). Covers: a crash marker left
// by a killed page → one-time notice (Thử lại / Gỡ gói), browser recogniser, no worker created; the notice at
// 320/375/820/1280, VI/EN, light/dark (overflow, ≥44px targets, no vendor name); Try again (warning → self-test →
// switched on) and Remove pack; iPhone self-test gating (browser recogniser and an honest footnote until the test passes);
// a clean page unload removes the marker; the iPhone permission-first tap (the first tap asks for the microphone, the
// next hold records, nothing stuck in "Đang nghe"). Screenshots: docs/reviews/v1.7.2/voice-ios-crash/.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const origin='https://kitchen.test',out='docs/reviews/v1.7.2/voice-ios-crash';
const IPHONE='Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1';
const mime:Record<string,string>={'.js':'application/javascript','.css':'text/css','.html':'text/html','.webmanifest':'application/manifest+json','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
const sizes:any={narrow:{width:320,height:740},mobile:{width:375,height:812},tablet:{width:820,height:1100},desktop:{width:1280,height:800}};
const fakeFiles:any={'transformers.min.js':'export const env={}','asyncify.mjs':'ort-mjs','asyncify.wasm':'ort-wasm','encoder_model_quantized.onnx':'synthetic-encoder','decoder_model_merged_quantized.onnx':'synthetic-decoder','config.json':'{}'};
const b64=(s:string)=>createHash('sha256').update(s).digest('base64'),hex=(s:string)=>createHash('sha256').update(s).digest('hex');
const PATCH={m1:hex(fakeFiles['encoder_model_quantized.onnx']),m2:hex(fakeFiles['decoder_model_merged_quantized.onnx']),c:hex('{}'),tf:b64(fakeFiles['transformers.min.js']),mjs:b64(fakeFiles['asyncify.mjs']),wasm:b64(fakeFiles['asyncify.wasm'])};
let shots=0;
async function main(){
 mkdirSync(out,{recursive:true});
 const browser=await chromium.launch();
 async function open({viewport=sizes.mobile,lang='vi',theme='light',ios=false,init={} as Record<string,string>,engineDelay=0,mic=null as null|{delay:number,deny?:boolean}}={}){
  const context=await browser.newContext({viewport,serviceWorkers:'block',reducedMotion:'reduce',colorScheme:theme as any,hasTouch:viewport.width<1000,...(ios?{userAgent:IPHONE,isMobile:true}:{})});
  await context.addInitScript(({lang,theme,init,mic})=>{const w=window as any;
   if(!sessionStorage.getItem('qa-init')){sessionStorage.setItem('qa-init','1');localStorage.setItem('bep-theme-mode',theme);localStorage.setItem('guest/bep-language',lang);localStorage.setItem('bep-local-locked','yes');localStorage.setItem('bep-voice-slow','1');for(const [k,v] of Object.entries(init))localStorage.setItem(k,v)}
   w.BEP_VOICE_AUTO_DELAY_MS=600000;   // the automatic run is started by the test where needed
   w.__recs=[];class FakeRec{lang='';started=false;ended=false;onresult:any;onend:any;onerror:any;constructor(){w.__recs.push(this)}start(){this.started=true}stop(){this.end()}abort(){this.end()}end(){if(this.ended)return;this.ended=true;setTimeout(()=>this.onend&&this.onend(),0)}}
   w.SpeechRecognition=FakeRec;w.webkitSpeechRecognition=FakeRec;
   // Count on-device workers: none may start after a crash.
   w.__workers=0;const W=w.Worker;w.Worker=function(url:any,o:any){if(String(o?.name||'')==='bep-voice-local')w.__workers++;return new W(url,o)};w.Worker.prototype=W.prototype;
   if(mic){w.__gum=0;Object.defineProperty(navigator,'permissions',{get:()=>({query:async()=>({state:w.__gumOk?'granted':'prompt',onchange:null})}),configurable:true});
    Object.defineProperty(navigator,'mediaDevices',{get:()=>({getUserMedia:()=>{w.__gum++;return new Promise((res,rej)=>setTimeout(()=>{if(mic.deny)rej(Object.assign(new Error('denied'),{name:'NotAllowedError'}));else{w.__gumOk=true;res({getTracks:()=>[{stop(){w.__gumStopped=(w.__gumStopped||0)+1}}]})}},mic.delay))}}),configurable:true})}
  },{lang,theme,init,mic});
  const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await context.route(/^https:\/\/(cdn\.jsdelivr\.net|huggingface\.co)\//,async route=>{const u=route.request().url();const k=Object.keys(fakeFiles).find(k=>u.endsWith(k));await route.fulfill(k?{status:200,body:fakeFiles[k],headers:{'Access-Control-Allow-Origin':'*'}}:{status:404,body:''}).catch(()=>{})});
  await context.route(origin+'/**',async route=>{const url=new URL(route.request().url()),path=url.pathname;
   if(path.startsWith('/.netlify/')){await route.fulfill({status:401,json:{error:'no'}});return}
   if(path==='/startup-scripts.json'){await route.fulfill({json:JSON.parse(readFileSync('dist/startup-scripts.json','utf8'))});return}
   if(path==='/voice-local-worker.js'){await route.fulfill({contentType:'application/javascript',body:readFileSync('dist/voice-local-worker.js','utf8')+`\n;self.__voiceLocalEngineFactory=async()=>{await new Promise(r=>setTimeout(r,${engineDelay}));return{transcribe:async()=>'hai ký thịt ba chỉ',dispose(){}}};\n`});return}
   const file=resolve('dist',path==='/'?'index.html':path.slice(1));
   try{await route.fulfill({contentType:mime[extname(file)]||'application/octet-stream',body:readFileSync(file)})}catch{await route.fulfill({status:404,body:'Not found'})}});
  await page.goto(origin+'/#today',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof (globalThis as any).voiceModal==='function'&&typeof (globalThis as any).voiceLocalSelfTest==='function'&&document.querySelector('#main h1'),null,{timeout:20000});
  return{page,context,errors};
 }
 // Synthetic pinned files (tiny, hashed) downloaded into Cache Storage = a "ready" pack without the real model.
 const fakePack=async(page:any)=>{await page.evaluate((p:any)=>{const P=(0,eval)('VOICE_LOCAL_PACKS'),TF=(0,eval)('VOICE_LOCAL_TF'),ORT=(0,eval)('VOICE_LOCAL_ORT');P.small.files=[{path:'onnx/encoder_model_quantized.onnx',size:17,sha256:p.m1},{path:'onnx/decoder_model_merged_quantized.onnx',size:17,sha256:p.m2},{path:'config.json',size:2,sha256:p.c}];TF.size=19;TF.sha256b64=p.tf;ORT.asyncify[0].size=7;ORT.asyncify[0].sha256b64=p.mjs;ORT.asyncify[1].size=8;ORT.asyncify[1].sha256b64=p.wasm;ORT.plain=ORT.asyncify},PATCH);
  assert.equal(await page.evaluate("voiceLocalDownload('small',()=>{}).then(()=>voiceLocalStatus('small'))"),'ready')};
 const ls=(page:any,k:string)=>page.evaluate((k:string)=>localStorage.getItem(k),k);
 const CRASH={'bep-voice-recognizer':'local-small','bep-voice-local-busy':JSON.stringify({pack:'small',phase:'transcribing',at:1,v:2}),'bep-voice-auto-toast':'1'};
 async function check(page:any,label:string){
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.ok(overflow<=1,label+': horizontal overflow '+overflow+'px');
  const small=await page.evaluate(()=>[...document.querySelectorAll('#vl-crash-notice button')].filter((e:any)=>e.offsetParent&&(e.getBoundingClientRect().height<43.5||e.getBoundingClientRect().width<43.5)).map((e:any)=>(e.textContent||'').trim()));
  assert.deepEqual(small,[],label+': touch targets under 44px');
  const r=await page.locator('#vl-crash-notice').boundingBox();assert.ok(r&&r.x>=0&&r.x+r.width<=sizes[label.split(' ')[0]].width+1,label+': notice inside the viewport');
  const nav=await page.evaluate(()=>{const n=document.querySelector('.bottom-nav,nav.tabs,#bottom-nav,.app-nav') as any;return n&&n.offsetParent?n.getBoundingClientRect().top:null});
  if(nav!==null&&r)assert.ok(r.y+r.height<=nav+1,label+': notice sits above the bottom navigation');
  assert.ok(!/netlify|blobs/i.test(await page.locator('#vl-crash-notice').innerText()),label+': no hosting vendor named');
 }
 try{
  // 1. The page died with the model in memory (marker left behind) → one-time notice, browser recogniser, no model load.
  for(const [size,lang,theme] of [['mobile','vi','light'],['mobile','vi','dark'],['mobile','en','light'],['mobile','en','dark'],['narrow','vi','light'],['tablet','vi','light'],['desktop','en','light']]){
   const {page,context,errors}=await open({viewport:sizes[size],lang,theme,init:CRASH});
   const notice=page.locator('#vl-crash-notice');await notice.waitFor({timeout:5000});
   const text=await notice.innerText();
   assert.match(text,lang==='vi'?/Bộ giọng chính xác làm máy hết bộ nhớ và trang bị tải lại — đã chuyển về giọng nói thường của máy\.[\s\S]*Thử lại[\s\S]*Gỡ gói/:/Accurate voice ran this device out of memory and the page reloaded — switched back to the device’s standard voice input\.[\s\S]*Try again[\s\S]*Remove pack/);
   assert.equal(await notice.getAttribute('role'),'status','non-blocking');
   assert.equal(await page.evaluate('VoiceAPI.activeRecognizer()'),'browser');assert.equal(await ls(page,'bep-voice-recognizer'),null);assert.equal(await ls(page,'bep-voice-local-busy'),null);
   assert.equal(JSON.parse(await ls(page,'bep-voice-local-fail')).phase,'transcribing');
   await check(page,`${size} ${lang} ${theme}`);
   await page.waitForTimeout(80);await page.screenshot({path:`${out}/crash-notice-${lang}-${theme}-${size}-${sizes[size].width}x${sizes[size].height}.png`});shots++;
   if(size==='mobile'&&lang==='vi'&&theme==='light'){
    // The voice sheet: fallback panel + footnote naming the recogniser really in use; holding uses the browser recogniser.
    await page.evaluate('closeModal();voiceModal()');await page.waitForSelector('#vl-rec-note');
    assert.match(await page.locator('#vl-rec-note').innerText(),/giọng nói thường của máy[\s\S]*đã tắt trên máy này/);await page.locator('#vl-fail').waitFor();
    await page.locator('#vl-rec-note').scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/sheet-after-crash-vi-light-mobile-375x812.png`});shots++;
    const mic=page.locator('#voice-continue');const box=await mic.boundingBox();if(!box)throw Error('no mic');await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.waitForTimeout(200);
    assert.equal(await page.evaluate(()=>(window as any).__recs.filter((r:any)=>r.started).length),1,'browser recogniser used');await page.mouse.up();await page.waitForTimeout(100);
    await page.evaluate('closeModal()');
    // One-time: a reload does not show it again; the device stays marked; still no worker.
    await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>typeof (globalThis as any).voiceLocalSelfTest==='function');await page.waitForTimeout(1500);
    assert.equal(await page.locator('#vl-crash-notice').count(),0,'shown once');assert.notEqual(await ls(page,'bep-voice-local-fail'),null);
    // Even the automatic default does not switch it back on.
    await fakePack(page);await page.evaluate("voiceAutoRun('test')");await page.waitForTimeout(300);assert.equal(await ls(page,'bep-voice-recognizer'),null,'auto-default does not re-enable after a failure');
    assert.equal(await page.evaluate(()=>(window as any).__workers),0,'the model was never loaded after the crash');
   }
   assert.deepEqual(errors,[]);await context.close();
  }
  console.log('PASS crash marker → one-time notice (7 sizes/themes/languages), browser recogniser, no model load, no auto re-enable');

  // 2. Try again: warning first, then the self-test, then switched on. Remove pack: notice gone, pack removed.
  {const {page,context,errors}=await open({lang:'vi',init:CRASH});await page.locator('#vl-crash-notice').waitFor();await fakePack(page);
   await page.locator('#vl-crash-notice [data-vl-retry]').click();await page.locator('#confirm-root').waitFor();
   assert.match(await page.locator('#confirm-body').innerText(),/hết bộ nhớ[\s\S]*tải lại thêm lần nữa/);
   await page.screenshot({path:`${out}/try-again-warning-vi-light-mobile-375x812.png`});shots++;
   await page.locator('#confirm-root [data-confirm="yes"]').click();
   await page.waitForFunction(()=>localStorage.getItem('bep-voice-recognizer')==='local-small',null,{timeout:8000});
   assert.equal(JSON.parse(await ls(page,'bep-voice-local-selftest')).ok,true);assert.equal(await ls(page,'bep-voice-local-fail'),null);assert.equal(await page.locator('#vl-crash-notice').count(),0);
   assert.equal(await ls(page,'bep-voice-local-busy'),null,'self-test model freed');assert.equal(await page.evaluate(()=>(window as any).__workers),1,'one explicit self-test load');
   assert.deepEqual(errors,[]);await context.close();}
  {const {page,context,errors}=await open({lang:'en',init:CRASH});await page.locator('#vl-crash-notice').waitFor();await fakePack(page);
   await page.locator('#vl-crash-notice [data-vl-remove]').click();await page.waitForFunction(()=>!document.getElementById('vl-crash-notice'));
   await page.waitForFunction(()=>(globalThis as any).voiceLocalStatus('small').then((s:string)=>s==='none'));assert.equal(await ls(page,'bep-voice-local-fail'),null);assert.equal(await ls(page,'bep-voice-auto-removed'),'1','never auto-downloaded again');
   assert.deepEqual(errors,[]);await context.close();}
  console.log('PASS Try again (warning → self-test → on) and Remove pack');

  // 3. iPhone: a downloaded pack (and a v1.7.1 stored choice) stays OFF until the background self-test passes.
  {const {page,context,errors}=await open({ios:true,lang:'vi',init:{'bep-voice-recognizer':'local-small','bep-voice-auto-toast':'1'},engineDelay:1500});
   await fakePack(page);await page.evaluate('voiceLocalSyncRecognizers()');
   assert.equal(await page.evaluate('VoiceAPI.activeRecognizer()'),'browser','v1.7.1 iPhone choice → browser recogniser until tested');
   await page.evaluate("void voiceAutoRun('test')");await page.waitForFunction(()=>JSON.parse(localStorage.getItem('bep-voice-local-busy')||'null')?.phase==='self-test');
   assert.equal(await page.evaluate('VoiceAPI.activeRecognizer()'),'browser','not active while the self-test runs');
   await page.evaluate('voiceModal()');await page.waitForSelector('#vl-rec-note');assert.match(await page.locator('#vl-rec-note').innerText(),/giọng nói thường của máy[\s\S]*Đang chạy thử bộ giọng chính xác/);
   await page.locator('#vl-rec-note').scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/ios-self-test-running-vi-light-mobile-375x812.png`});shots++;
   await page.waitForFunction(()=>localStorage.getItem('bep-voice-recognizer')==='local-small',null,{timeout:10000});
   assert.equal(JSON.parse(await ls(page,'bep-voice-local-selftest')).ok,true);assert.equal(await page.evaluate('VoiceAPI.activeRecognizer()'),'local-small');assert.equal(await ls(page,'bep-voice-local-busy'),null);
   await page.evaluate('closeModal();voiceModal()');await page.waitForSelector('#vl-rec-note');assert.match(await page.locator('#vl-rec-note').innerText(),/trên máy · Chính xác hơn/);
   // A clean unload with the model loaded removes the marker (a reload is not a crash).
   await page.evaluate('voiceLocalEnsureEngine("small")');assert.equal(JSON.parse(await ls(page,'bep-voice-local-busy')).phase,'resident');
   await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>typeof (globalThis as any).voiceLocalSelfTest==='function');
   assert.equal(await ls(page,'bep-voice-local-fail'),null,'normal reload is not a crash');assert.equal(await ls(page,'bep-voice-local-busy'),null,'pagehide removed the marker');assert.equal(JSON.parse(await ls(page,'bep-voice-local-selftest')).ok,true,'self-test result kept');
   assert.deepEqual(errors,[]);await context.close();}
  // Self-test that fails on the iPhone → marked, browser recogniser kept, honest footnote.
  {const {page,context,errors}=await open({ios:true,lang:'en',init:{'bep-voice-auto-toast':'1'}});await fakePack(page);
   await page.route(origin+'/voice-local-worker.js',route=>route.fulfill({contentType:'application/javascript',body:readFileSync('dist/voice-local-worker.js','utf8')+`\n;self.__voiceLocalEngineFactory=async()=>{throw Object.assign(new Error('oom'),{code:'crash'})};\n`}));
   await page.evaluate("void voiceAutoRun('test')");await page.waitForFunction(()=>!!localStorage.getItem('bep-voice-local-fail'),null,{timeout:8000});
   assert.equal(JSON.parse(await ls(page,'bep-voice-local-fail')).stage,'self-test');assert.equal(await page.evaluate('VoiceAPI.activeRecognizer()'),'browser');
   await page.evaluate('voiceModal()');await page.waitForSelector('#vl-rec-note');assert.match(await page.locator('#vl-rec-note').innerText(),/standard voice input[\s\S]*Accurate voice is off on this device/);
   assert.deepEqual(errors,[]);await context.close();}
  console.log('PASS iPhone self-test gating: off until the test passes, failed test marks the device, clean reload is not a crash');

  // 4. iPhone permission-first tap: the first press only asks for the microphone; the next hold records.
  for(const lang of ['vi','en']){const {page,context,errors}=await open({ios:true,lang,mic:{delay:400}});
   await page.evaluate('closeModal();voiceModal()');await page.waitForSelector('#voice-text');const mic=page.locator('#voice-continue');
   const press=async(ms:number)=>{const b=await mic.boundingBox();if(!b)throw Error('no mic');await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.waitForTimeout(ms);await page.mouse.up()};
   await press(150);
   assert.equal(await page.evaluate(()=>(window as any).__recs.length),0,'first press: no recognition started');
   assert.match(await page.locator('#voice-status').innerText(),lang==='vi'?/Cho phép micro/:/Allow the microphone/);
   assert.match(await page.locator('.voice-hold-hint').innerText(),lang==='vi'?/Cho phép micro/:/Allow the microphone/,'the hint next to the button explains the prompt (not “hold longer”)');
   assert.doesNotMatch(await mic.innerText(),/Đang nghe|Listening/,'not stuck in “listening”');
   await page.screenshot({path:`${out}/ios-permission-first-tap-${lang}-light-mobile-375x812.png`});shots++;
   await page.waitForFunction(()=>(window as any).__gumStopped===1);assert.match(await page.locator('#voice-status').innerText(),lang==='vi'?/Đã bật micro — giờ giữ nút để nói/:/Microphone on — now hold the button to talk/);
   const b=await mic.boundingBox();if(!b)throw Error('no mic');await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.waitForTimeout(250);
   assert.equal(await page.evaluate(()=>(window as any).__recs.filter((r:any)=>r.started&&!r.ended).length),1,'second hold records');assert.match(await mic.innerText(),lang==='vi'?/Đang nghe/:/Listening/);
   await page.mouse.up();await page.waitForTimeout(150);assert.doesNotMatch(await mic.innerText(),/Đang nghe|Listening/,'released');
   assert.equal(await page.evaluate(()=>(window as any).__gum),1,'asked once');
   assert.deepEqual(errors,[]);await context.close()}
  {const {page,context,errors}=await open({ios:true,lang:'vi',mic:{delay:100,deny:true}});await page.evaluate('closeModal();voiceModal()');await page.waitForSelector('#voice-text');
   const b=await page.locator('#voice-continue').boundingBox();if(!b)throw Error('no mic');await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.up();
   await page.waitForFunction(()=>/Micro đang bị chặn/.test(document.getElementById('voice-status')?.textContent||''));assert.equal(await page.evaluate(()=>(window as any).__recs.length),0);
   assert.deepEqual(errors,[]);await context.close()}
  // Desktop (not iOS): unchanged — the first hold records directly.
  {const {page,context,errors}=await open({viewport:sizes.desktop,lang:'vi'});await page.evaluate('closeModal();voiceModal()');await page.waitForSelector('#voice-text');
   const b=await page.locator('#voice-continue').boundingBox();if(!b)throw Error('no mic');await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.waitForTimeout(200);
   assert.equal(await page.evaluate(()=>(window as any).__recs.filter((r:any)=>r.started).length),1);await page.mouse.up();assert.deepEqual(errors,[]);await context.close()}
  console.log('PASS iPhone permission-first tap (VI/EN), denied microphone message, desktop unchanged');
 }finally{await browser.close()}
 console.log(`voice-ios-crash browser QA: ${shots} screenshots in ${out}`);
}
main().catch(e=>{console.error(e);process.exit(1)});
