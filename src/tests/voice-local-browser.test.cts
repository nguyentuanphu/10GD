// On-device speech + opt-in voice statistics, browser QA (Chromium, viewport simulation —
// not physical devices). Part A: the voice sheet in device-only mode — settings block
// (packs with exact sizes, off by default, consent off by default), download with
// progress into Cache Storage (synthetic files, routed), the REAL worker with a fake
// engine, a stub microphone, offline recognition from cache, capability fallback, consent
// gating + redaction of what is sent, opt-out deletion. Part B: Studio "Giọng nói / Voice"
// panel against the REAL accounts/studio/voice-stats handlers (in-memory stores).
// Sizes: 375×812, 820×1100, 1280×800 (+320×740 for the Studio nav); VI/EN, light/dark.
// Screenshots: docs/reviews/v1.6/voice-local/.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const origin='https://kitchen.test',out='docs/reviews/v1.6/voice-local';
const mime:Record<string,string>={'.js':'application/javascript','.css':'text/css','.html':'text/html','.webmanifest':'application/manifest+json','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
const sizes:any={narrow:{width:320,height:740},mobile:{width:375,height:812},tablet:{width:820,height:1100},desktop:{width:1280,height:800}};
const FAKE_ENGINE=`\n;self.__voiceLocalEngineFactory=async(o)=>{o.progress({status:'ready',file:'fake'});return{transcribe:async(a,{language})=>language==='english'?'two kilos of pork belly':'hai ký thịt ba chỉ',dispose(){}}};\n`;
const fakeFiles:any={'transformers.min.js':'export const env={}','asyncify.mjs':'ort-mjs','asyncify.wasm':'ort-wasm','encoder_model_quantized.onnx':'synthetic-encoder','decoder_model_merged_quantized.onnx':'synthetic-decoder','config.json':'{}'};
const b64=(s:string)=>createHash('sha256').update(s).digest('base64'),hex=(s:string)=>createHash('sha256').update(s).digest('hex');
let shots=0;
async function main(){
 mkdirSync(out,{recursive:true});
 const browser=await chromium.launch();
 const posts:any[]=[],external:string[]=[];
 // ---------------- Part A: the voice sheet ----------------
 async function open({viewport=sizes.mobile,lang='vi',theme='light',slowWorker=false}={} as any){
  const context=await browser.newContext({viewport,serviceWorkers:'block',reducedMotion:'reduce',colorScheme:theme,hasTouch:viewport.width<1000});
  await context.addInitScript(({lang,theme})=>{const w=window as any;
   if(!sessionStorage.getItem('qa-init')){sessionStorage.setItem('qa-init','1');localStorage.setItem('bep-theme-mode',theme);localStorage.setItem('guest/bep-language',lang);localStorage.setItem('bep-local-locked','yes');localStorage.setItem('bep-voice-slow','1')}
   w.__recs=[];class FakeRec{lang='';started=false;ended=false;onresult:any;onend:any;onerror:any;constructor(){w.__recs.push(this)}start(){this.started=true}stop(){this.end()}abort(){this.end()}end(){if(this.ended)return;this.ended=true;setTimeout(()=>this.onend&&this.onend(),0)}}
   w.SpeechRecognition=FakeRec;w.webkitSpeechRecognition=FakeRec;
   Object.defineProperty(navigator,'deviceMemory',{get:()=>8});
  },{lang,theme});
  const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await context.route(/^https:\/\/(cdn\.jsdelivr\.net|huggingface\.co)\//,async route=>{const u=route.request().url();external.push(u);const k=Object.keys(fakeFiles).find(k=>u.endsWith(k));await route.fulfill(k?{status:200,body:fakeFiles[k],headers:{'Access-Control-Allow-Origin':'*'}}:{status:404,body:''})});
  await context.route(origin+'/**',async route=>{const url=new URL(route.request().url()),path=url.pathname;
   if(path==='/.netlify/functions/voice-stats'){posts.push({op:url.searchParams.get('op'),headers:route.request().headers(),body:JSON.parse(route.request().postData()||'{}')});await route.fulfill({status:201,json:{ok:true}});return}
   if(path.startsWith('/.netlify/')){await route.fulfill({status:401,json:{error:'no'}});return}
   if(path==='/startup-scripts.json'){await route.fulfill({json:JSON.parse(readFileSync('dist/startup-scripts.json','utf8'))});return}
   if(path==='/voice-local-worker.js'){await route.fulfill({contentType:'application/javascript',body:readFileSync('dist/voice-local-worker.js','utf8')+FAKE_ENGINE});return}
   const file=resolve('dist',path==='/'?'index.html':path.slice(1));
   try{await route.fulfill({contentType:mime[extname(file)]||'application/octet-stream',body:readFileSync(file)})}catch{await route.fulfill({status:404,body:'Not found'})}});
  await page.goto(origin+'/#today',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof (globalThis as any).voiceModal==='function'&&typeof (globalThis as any).voiceLocalRecognizer==='function'&&typeof (globalThis as any).voiceStatsEvent==='function'&&document.querySelector('#main h1'),null,{timeout:20000});
  return{page,context,errors};
 }
 const openSheet=async(page:any)=>{await page.evaluate('closeModal();voiceModal()');await page.waitForSelector('#voice-local-settings',{state:'attached'});await page.waitForFunction(()=>document.querySelector('#voice-local-settings [data-vl-pack] .vl-state'));};
 // v1.6 integration: the on-device section lives inside the sheet's ONE "Cài đặt giọng nói" panel (#voice-settings),
 // and the recogniser is chosen in that panel's shared selector (stored in bep-voice-recognizer), not a separate radio list.
 const expand=async(page:any)=>{if(!(await page.locator('#voice-settings').evaluate((d:any)=>d.open)))await page.locator('#voice-settings > summary').click();await page.waitForTimeout(60)};
 const active=(page:any)=>page.evaluate('VoiceAPI.activeRecognizer()');
 async function check(page:any,label:string){
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.ok(overflow<=1,label+': horizontal overflow '+overflow+'px');
  const small=await page.evaluate(()=>[...document.querySelectorAll('#voice-settings > summary,#voice-recognizer,#voice-local-settings .vl-check,#voice-local-settings .btn,#voice-lang-settings .voice-lang-btn')].filter((e:any)=>e.offsetParent&&e.getBoundingClientRect().height<43.5).map((e:any)=>(e.textContent||'').trim().slice(0,30)));
  assert.deepEqual(small,[],label+': touch targets under 44px');
  const clipped=await page.evaluate(()=>[...document.querySelectorAll('#voice-local-settings *')].filter((e:any)=>e.offsetParent&&e.getBoundingClientRect().right>innerWidth+1).length);assert.equal(clipped,0,label+': content outside the viewport');
  const text=await page.locator('#voice-settings').innerText();assert.ok(!/netlify|blobs/i.test(text),label+': no hosting vendor named');
  assert.equal(await page.locator('#voice-settings').count(),1,label+': one voice settings panel');assert.equal(await page.locator('details#voice-local-settings').count(),0,label+': no second settings block');
 }
 const shot=async(page:any,name:string)=>{await page.locator('#voice-local-settings').scrollIntoViewIfNeeded();await page.waitForTimeout(60);await page.screenshot({path:`${out}/${name}.png`});shots++};
 try{
  // 1. Settings block: default OFF, exact sizes, consent OFF — screenshots across sizes/themes/languages.
  for(const [size,lang,theme] of [['mobile','vi','light'],['tablet','vi','light'],['desktop','vi','light'],['mobile','en','dark'],['tablet','en','dark'],['desktop','en','dark'],['mobile','vi','dark'],['mobile','en','light']]){
   const {page,context,errors}=await open({viewport:sizes[size],lang,theme});await openSheet(page);await expand(page);
   const t=await page.locator('#voice-settings').innerText();
   if(lang==='vi'){for(const want of ['Cài đặt giọng nói','Của trình duyệt','Nhẹ','Chính xác hơn','79,7 MB','252 MB','Chưa tải','Giúp cải thiện nhận giọng nói (chỉ gửi chữ, không gửi âm thanh)'])assert.ok(t.includes(want),size+' vi missing '+want)}
   else{for(const want of ['Voice settings','Browser','Light','More accurate','79.7 MB','252 MB','Not downloaded','Help improve voice recognition (sends text only, never audio)'])assert.ok(t.includes(want),size+' en missing '+want)}
   assert.equal(await active(page),'browser','browser recogniser by default');assert.equal(await page.locator('input[name=vl-choice]').count(),0,'no duplicate recogniser chooser');
   assert.equal(await page.locator('#voice-stats-consent').isChecked(),false,'consent off by default');
   assert.equal(await page.locator('[data-vl-download="base"]').isDisabled(),false);
   await check(page,`${size} ${lang} ${theme}`);await shot(page,`settings-${lang}-${theme}-${size}-${sizes[size].width}x${sizes[size].height}`);
   assert.deepEqual(errors,[]);await context.close();
  }
  // 2. Download (synthetic pinned files) → choose → recognise with the REAL worker + fake engine + stub mic.
  {const {page,context,errors}=await open({});await openSheet(page);await expand(page);
   await page.evaluate(({m1,m2,tf,mjs,wasm})=>{const w:any=globalThis;const P=(0,eval)('VOICE_LOCAL_PACKS'),TF=(0,eval)('VOICE_LOCAL_TF'),ORT=(0,eval)('VOICE_LOCAL_ORT');
    P.base.files=[{path:'onnx/encoder_model_quantized.onnx',size:17,sha256:m1},{path:'onnx/decoder_model_merged_quantized.onnx',size:17,sha256:m2},{path:'config.json',size:2}];TF.size=19;TF.sha256b64=tf;ORT.asyncify[0].size=7;ORT.asyncify[0].sha256b64=mjs;ORT.asyncify[1].size=8;ORT.asyncify[1].sha256b64=wasm;
    w.__frames=0;(0,eval)(`voiceLocalRecorder=async function(onFrame){let i=0;const t=setInterval(()=>{const a=i<30?0.2:0.001,f=new Float32Array(1600);for(let k=0;k<1600;k++)f[k]=a*Math.sin(k/3);onFrame(f);i++;globalThis.__frames++;if(i>60)clearInterval(t)},5);return{stop(){clearInterval(t)}}}`)},
    {m1:hex(fakeFiles['encoder_model_quantized.onnx']),m2:hex(fakeFiles['decoder_model_merged_quantized.onnx']),tf:b64(fakeFiles['transformers.min.js']),mjs:b64(fakeFiles['asyncify.mjs']),wasm:b64(fakeFiles['asyncify.wasm'])});
   await page.evaluate('voiceLocalRenderSettings()');await page.waitForTimeout(80);
   await page.locator('[data-vl-download="base"]').click();
   await page.waitForFunction(()=>document.querySelector('[data-vl-pack="base"] .vl-state')?.getAttribute('data-state')==='ready',null,{timeout:8000});
   await page.waitForFunction(()=>(document.querySelector('#voice-recognizer') as any)?.value==='local-base',null,{timeout:4000});
   assert.equal(await active(page),'local-base','downloaded pack becomes the recogniser, shown in the shared selector');
   assert.equal(await page.evaluate(()=>localStorage.getItem('bep-voice-recognizer')),'local-base');
   assert.equal(external.length,6,'pinned files only: '+external.join(' '));
   await shot(page,'settings-vi-light-mobile-downloaded-375x812');
   const before=external.length,recsBefore=await page.evaluate(()=>(window as any).__recs.length);
   await page.evaluate('closeModal();voiceModal()');
   await page.waitForFunction(()=>/hai ký thịt ba chỉ/.test((document.querySelector('#voice-text') as any)?.value||''),null,{timeout:8000});
   assert.equal(external.length,before,'recognition makes no network request to model hosts');
   assert.equal(await page.evaluate(()=>(window as any).__recs.length),recsBefore,'browser recogniser not started');
   assert.equal(await page.evaluate('voiceStatsRecognizer()'),'local-base');
   await page.locator('#voice-stop').click().catch(()=>{});
   // English toggle → English hint to Whisper.
   await page.evaluate('closeModal();voiceModal()');await expand(page);await page.locator('.voice-lang-btn[data-voice-lang="en-AU"]').click();
   await page.waitForFunction(()=>/two kilos of pork belly/.test((document.querySelector('#voice-text') as any)?.value||''),null,{timeout:8000});
   await page.screenshot({path:`${out}/sheet-local-listening-en-vi-light-375x812.png`});shots++;
   // 3. Offline: recognition still works; the worker comes from Cache Storage.
   await context.setOffline(true);await page.evaluate('voiceLocalEngine&&voiceLocalEngine.dispose();voiceLocalEngine=null;closeModal();voiceModal()');
   await page.waitForFunction(()=>/hai ký thịt ba chỉ|two kilos/.test((document.querySelector('#voice-text') as any)?.value||''),null,{timeout:8000});
   await context.setOffline(false);
   // 4. Consent gating: nothing is sent while OFF; ON sends one redacted text record.
   const member=await page.evaluate('state.members[0]?.name||""');
   await page.evaluate('closeModal();voiceModal()');await page.waitForTimeout(300);await page.evaluate('stopVoice()');await page.locator('#voice-text').fill(`mua 2 ký thịt ba chỉ cho ${member}, gọi 0412 345 678, một bó rau răm`);
   await page.locator('[data-personal="voice-preview"]').click();await page.waitForSelector('[data-personal="voice-apply-shopping"]');await page.locator('[data-personal="voice-apply-shopping"]').click();await page.waitForTimeout(150);
   assert.equal(posts.length,0,'consent OFF: nothing sent');
   await page.evaluate('closeModal();voiceModal()');await expand(page);await page.locator('#voice-stats-consent').check();await page.waitForTimeout(100);assert.equal(posts.length,0,'switching on sends nothing by itself');
   await page.evaluate('stopVoice()');await page.locator('#voice-text').fill(`mua 2 ký thịt ba chỉ cho ${member}, gọi 0412 345 678, một bó rau răm`);
   await page.locator('[data-personal="voice-preview"]').click();await page.waitForSelector('[data-personal="voice-apply-shopping"]');await page.locator('[data-personal="voice-apply-shopping"]').click();
   await page.waitForFunction(()=>true);for(let i=0;i<40&&!posts.length;i++)await page.waitForTimeout(50);
   assert.equal(posts.length,1);assert.equal(posts[0].op,'submit');const sent=posts[0].body;
   assert.ok(member.length>=2,'seed has a member name');assert.ok(!JSON.stringify(sent).includes(member),'member name stripped: '+sent.transcript);
   assert.ok(!/0412/.test(JSON.stringify(sent)),'phone stripped');assert.match(sent.transcript,/\[tên\]/);assert.match(sent.transcript,/\[số\]/);
   assert.equal(sent.recognizer,'local-base','recogniser used in this sheet session');assert.equal(sent.lang,'en','the EN toggle chosen earlier is remembered');assert.ok(sent.unrecognised.every((u:string)=>!u.includes(member)));
   assert.ok(sent.transcript.length<=300);assert.ok(!Object.keys(sent).some(k=>/audio|wav|pcm/i.test(k)));assert.match(posts[0].headers['x-voice-stats-device'],/^[A-Za-z0-9_-]{32}$/);
   // 5. Opt-out deletes.
   await page.evaluate('closeModal();voiceModal()');await expand(page);await page.locator('#voice-stats-consent').uncheck();for(let i=0;i<40&&posts.length<2;i++)await page.waitForTimeout(50);
   assert.equal(posts[1]?.op,'forget');await page.waitForFunction(()=>localStorage.getItem('bep-voice-stats-device')===null,null,{timeout:3000});
   // 6. Remove pack → back to browser recognition.
   await page.locator('[data-vl-remove="base"]').click();await page.waitForFunction(()=>document.querySelector('[data-vl-pack="base"] .vl-state')?.getAttribute('data-state')==='none');
   await page.waitForFunction(()=>(globalThis as any).VoiceAPI.activeRecognizer()==='browser');assert.equal(await page.evaluate(()=>localStorage.getItem('bep-voice-recognizer')),null);
   const n=await page.evaluate(()=>(window as any).__recs.length);await page.evaluate('closeModal();voiceModal()');await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>(window as any).__recs.length),n+1,'browser recogniser used again');
   assert.deepEqual(errors,[]);await context.close();
  }
  // 7. Capability fallback: no WebAssembly SIMD → download disabled, reason shown, browser recogniser kept.
  {const {page,context,errors}=await open({lang:'en'});
   await page.evaluate(()=>{(0,eval)("voiceLocalCap=null;voiceLocalProbe=async()=>voiceLocalCapability({wasm:true,simd:false,worker:true,mic:true,audioWorklet:true,caches:true,memoryGB:4,ua:navigator.userAgent})")});
   await openSheet(page);await expand(page);await page.waitForFunction(()=>/SIMD/.test(document.querySelector('#voice-local-settings')!.textContent||''));
   assert.equal(await page.locator('[data-vl-download="base"]').isDisabled(),true);assert.match(await page.locator('#voice-local-settings').innerText(),/Using browser speech recognition/);
   // A chosen pack that is not available falls back to the browser recogniser.
   await page.evaluate(()=>localStorage.setItem('bep-voice-local','base'));const n=await page.evaluate(()=>(window as any).__recs.length);await page.evaluate('closeModal();voiceModal()');await page.waitForFunction((n:number)=>(window as any).__recs.length>n,n);
   await page.waitForFunction(()=>localStorage.getItem('bep-voice-recognizer')===null,null,{timeout:3000});
   assert.equal(await page.evaluate(()=>localStorage.getItem('bep-voice-local')),null,'unavailable choice is cleared (legacy key migrated, shared key cleared)');
   await page.evaluate('closeModal();voiceModal()');await expand(page);await shot(page,'settings-en-light-mobile-unsupported-375x812');
   assert.deepEqual(errors,[]);await context.close();
  }
  // ---------------- Part B: Studio panel ----------------
  {const {memoryStores}=await import('./helpers/accounts.mjs');
   const {createAccountsHandler}=await import('../netlify/lib/accounts.mjs');
   const {createStudioHandler}=await import('../netlify/functions/studio.mjs');
   const {createVoiceStatsHandler}=await import('../netlify/functions/voice-stats.mjs');
   const {listLog}=await import('../netlify/lib/studio.mjs');
   const getStoreFn=memoryStores(),env:any={STUDIO_ADMINS:'henrynguyen'};
   const handlers:any={accounts:createAccountsHandler({getStoreFn}),studio:createStudioHandler({getStoreFn,env,limits:{all:5000,mutate:5000}}),'voice-stats':createVoiceStatsHandler({getStoreFn,env})};
   const reg=async(u:string)=>{const r=await handlers.accounts(new Request(origin+'/.netlify/functions/accounts?op=register',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','x-nf-client-connection-ip':'r-'+u},body:JSON.stringify({username:u,name:u,password:'synthetic-studio-voice-42',trust:true})}));assert.equal(r.status,201);return r.headers.get('set-cookie')!.split(';')[0]};
   const henry=await reg('henrynguyen');
   const seed=[['vi','browser',['rau răm','bánh tráng mè'],[{phrase:'rau răm',id:'vietnameseMint',kind:'ingredient'}]],['vi','browser',['rau răm','lá lốt'],[]],['vi','local-base',['lá lốt'],[{phrase:'lá lốt',id:'betelLeaf',kind:'ingredient'}]],['en','browser',['galangal'],[{phrase:'galangal',id:'galangal',kind:'ingredient'}]],['en','local-small',[],[]],['auto','local-base',['canh chua cá lóc'],[{phrase:'canh chua cá lóc',id:'canh-chua-ca',kind:'recipe'}]],['vi','typed',[],[]],['en','browser',['bok choy baby'],[]]];
   let i=0;for(const [lang,recognizer,unrecognised,corrections] of seed){const r=await handlers['voice-stats'](new Request(origin+'/.netlify/functions/voice-stats?op=submit',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','x-voice-stats-device':'studio-seed-device-'+String(i%3).padStart(8,'0'),'x-nf-client-connection-ip':'s'+(i++)},body:JSON.stringify({ts:new Date().toISOString(),lang,recognizer,transcript:'synthetic',unrecognised,corrections,items:1})}));assert.equal(r.status,201)}
   async function studio(size:string,lang:string,theme:string){
    const context=await browser.newContext({viewport:sizes[size],reducedMotion:'reduce',colorScheme:theme as any,hasTouch:size!=='desktop',acceptDownloads:true});
    await context.addInitScript(({lang,theme}:any)=>{localStorage.setItem('studio-lang',lang);localStorage.setItem('studio-theme',theme)},{lang,theme});
    await context.addCookies([{name:henry.split('=')[0],value:henry.split('=').slice(1).join('='),domain:'kitchen.test',path:'/',secure:true,httpOnly:true,sameSite:'Strict'}]);
    const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route(origin+'/**',async(route:any)=>{const req=route.request(),url=new URL(req.url());const fn=url.pathname.match(/^\/\.netlify\/functions\/([\w-]+)/);
     if(fn&&handlers[fn[1]]){const r=await handlers[fn[1]](new Request(url.href,{method:req.method(),headers:await req.allHeaders(),body:['GET','HEAD'].includes(req.method())?undefined:req.postDataBuffer()}));return route.fulfill({status:r.status,headers:Object.fromEntries(r.headers),body:Buffer.from(await r.arrayBuffer())})}
     if(fn)return route.fulfill({status:404,json:{error:'no'}});
     const file='dist'+(url.pathname==='/'?'/index.html':url.pathname);if(existsSync(file))return route.fulfill({status:200,contentType:mime[extname(file)]||'application/octet-stream',body:readFileSync(file)});return route.fulfill({status:404,body:''})});
    await page.goto(origin+'/studio.html#voice');await page.waitForSelector('#voice-h1');await page.waitForSelector('#voice-main .vs-kpis');
    return{context,page,errors};
   }
   for(const [size,lang,theme] of [['narrow','vi','light'],['mobile','vi','light'],['tablet','vi','light'],['desktop','vi','light'],['mobile','en','dark'],['tablet','en','dark'],['desktop','en','dark'],['desktop','vi','dark']]){
    const {context,page,errors}=await studio(size,lang,theme);
    const nav=page.locator('#nav a[href="#voice"]');await nav.waitFor();assert.equal(await nav.getAttribute('aria-current'),'page');assert.match(await nav.innerText(),lang==='en'?/Voice/:/Giọng nói/);
    // v1.6 integration: a normal Studio page in the panel registry, rendered inside #main (like the Scout network page).
    assert.equal(await page.locator('#main #voice-main').count(),1,'Voice renders inside Studio main');assert.equal(await page.locator('#nav a[href="#voice"]').count(),1,'one nav link');assert.equal(await page.locator('#nav a[href="#scout"]').count(),1,'Scout link still present');
    const body=await page.locator('#voice-main').innerText();
    for(const want of lang==='en'?['Unrecognised · Vietnamese','Unrecognised · English','Top corrections','Recognisers','rau răm','galangal','vietnameseMint','On device · Light','Export synonym suggestions (JSON)']:['Từ không nhận ra · Tiếng Việt','Sửa nhiều nhất','Cách nhận giọng nói','lá lốt','Trên máy · Chính xác hơn','Xuất gợi ý từ đồng nghĩa (JSON)'])assert.ok(body.includes(want),`${size} ${lang}: missing ${want}`);
    assert.ok(!/netlify|blobs/i.test(body));assert.ok(!body.includes('synthetic'),'no transcripts shown');
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.ok(overflow<=1,`studio overflow ${overflow} at ${size}`);
    if(size!=='desktop'){const small=await page.evaluate(()=>[...document.querySelectorAll('#voice-main button,#voice-main select')].filter((e:any)=>e.offsetParent&&e.getBoundingClientRect().height<43.5).length);assert.equal(small,0,'studio touch targets')}
    await page.waitForTimeout(80);await page.screenshot({path:`${out}/studio-voice-${lang}-${theme}-${size}-${sizes[size].width}x${sizes[size].height}.png`});shots++;
    if(size==='desktop'&&lang==='en'){const [dl]=await Promise.all([page.waitForEvent('download'),page.locator('#vs-export').click()]);const j=JSON.parse(readFileSync(await dl.path(),'utf8'));assert.equal(j.format,'bep-voice-synonyms');assert.ok(j.synonyms.some((s:any)=>s.phrase==='rau răm'&&s.id==='vietnameseMint'))}
    // Hash navigation away and back keeps Studio's main / Scout panel consistent.
    if(size==='desktop'&&lang==='vi'&&theme==='light'){await page.evaluate(()=>{location.hash='#overview'});await page.waitForTimeout(150);assert.equal(await page.locator('#voice-main').isHidden(),true);assert.equal(await page.locator('#main').isHidden(),false);
     await page.evaluate(()=>{location.hash='#scout'});await page.waitForTimeout(200);if(await page.locator('#scout-main').count()){assert.equal(await page.locator('#voice-main').isHidden(),true,'Voice panel hidden on #scout');
      // Since the v1.5 Studio panel registry, Scout renders INSIDE Studio's #main (older studio.js: its own <main> that hides #main).
      const inMain=await page.evaluate(()=>!!document.querySelector('#main #scout-main'));assert.equal(await page.locator('#main').isHidden(),!inMain,'Scout panel and Studio main stay consistent');if(inMain)assert.equal(await page.locator('#scout-main').isVisible(),true,'Scout panel shown')}
     await page.evaluate(()=>{location.hash='#voice'});await page.waitForSelector('#voice-main:not([hidden]) .vs-kpis')}
    assert.deepEqual(errors,[]);await context.close();
   }
   const audit=(await listLog(getStoreFn,'audit',{limit:100})).items.map((e:any)=>e.action);assert.ok(audit.filter((a:string)=>a==='voice_stats_view').length>=8,'every Studio view audited');assert.ok(audit.includes('voice_stats_export'));
  }
 }finally{await browser.close()}
 console.log(`voice-local browser QA: ${shots} screenshots in ${out}; on-device download/recognition (fake engine), offline, fallback, consent + redaction, Studio panel checked.`);
}
main().catch(e=>{console.error(e);process.exit(1)});
