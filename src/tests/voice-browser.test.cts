// Bilingual voice input, browser QA with a mocked SpeechRecognition (no audio, no network recognition):
// the recogniser starts in the UI language, the Tiếng Việt | English toggle restarts it cleanly, the preview
// follows the UI language, and confirmed lines re-render when the UI language changes. Device-only mode,
// browser viewport simulation at mobile 375×812, tablet 820×1100 and desktop 1280×800 (not physical devices).
// Saves screenshots to docs/reviews/v1.5/voice/.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const origin='https://kitchen.test',out='docs/reviews/v1.5/voice';
const mime:Record<string,string>={'.js':'application/javascript','.css':'text/css','.html':'text/html','.webmanifest':'application/manifest+json','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
const sizes={mobile:{width:375,height:812},tablet:{width:820,height:1100},desktop:{width:1280,height:800}};
const MIXED='2 kg pork belly với một bó rau muống, mua 3 hộp eggs, a bunch of cilantro, two packets of bean sprouts';
async function main(){
 mkdirSync(out,{recursive:true});
 const browser=await chromium.launch();
 async function open({viewport=sizes.mobile,lang='vi',theme='light',voicePrefs=null as null|Record<string,string>}={}){
  const context=await browser.newContext({viewport,serviceWorkers:'block',reducedMotion:'reduce',colorScheme:theme as any});
  await context.addInitScript(({lang,theme,voicePrefs})=>{const w=window as any;
   if(!sessionStorage.getItem('qa-init')){sessionStorage.setItem('qa-init','1');localStorage.setItem('bep-theme-mode',theme);localStorage.setItem('guest/bep-language',lang);localStorage.setItem('bep-local-locked','yes');localStorage.removeItem('bep-voice-lang');localStorage.removeItem('bep-voice-auto');localStorage.setItem('bep-voice-slow','1');if(voicePrefs)for(const[k,v]of Object.entries(voicePrefs))localStorage.setItem(k,v)}
   w.__recs=[];class FakeRec{lang='';n=0;started=false;ended=false;onresult:any;onend:any;onerror:any;constructor(){w.__recs.push(this)}start(){this.started=true}stop(){this.end()}abort(){this.end()}end(){if(this.ended)return;this.ended=true;setTimeout(()=>this.onend&&this.onend(),0)}}
   w.SpeechRecognition=FakeRec;w.webkitSpeechRecognition=FakeRec;
   w.__live=()=>w.__recs.filter((r:any)=>r.started&&!r.ended).pop();
   w.__say=(text:string,confidence=.9)=>{const r=w.__live();if(!r)throw Error('no live recogniser');const alt:any=[{transcript:text,confidence}];alt.isFinal=true;const results:any=[];results[r.n]=alt;r.onresult({resultIndex:r.n,results});r.n++};
  },{lang,theme,voicePrefs});
  const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route(origin+'/**',async route=>{const url=new URL(route.request().url()),path=url.pathname;
   if(path.startsWith('/.netlify/')){await route.fulfill({status:401,json:{error:'no'}});return}
   if(path==='/startup-scripts.json'){await route.fulfill({json:JSON.parse(readFileSync('dist/startup-scripts.json','utf8'))});return}
   const file=resolve('dist',path==='/'?'index.html':path.slice(1));
   try{await route.fulfill({contentType:mime[extname(file)]||'application/octet-stream',body:readFileSync(file)})}catch{await route.fulfill({status:404,body:'Not found'})}});
  await page.goto(origin+'/#today',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof (globalThis as any).voiceModal==='function'&&typeof (globalThis as any).voiceItemView==='function'&&document.querySelector('#main h1'),null,{timeout:20000});
  await page.evaluate('closeModal();voiceModal()');await page.waitForSelector('#voice-text');
  return{page,context,errors};
 }
 const recLangs=(page:any)=>page.evaluate(()=>(window as any).__recs.map((r:any)=>r.lang));
 const pressed=(page:any)=>page.evaluate(()=>[...document.querySelectorAll('.voice-lang [data-voice-lang]')].map((b:any)=>b.dataset.voiceLang+':'+b.getAttribute('aria-pressed')));
 const labels=(page:any)=>page.evaluate(()=>[...document.querySelectorAll('.voice-item')].map((el:any)=>[el.querySelector('.voice-label').value,el.querySelector('.voice-unit').value]));
 async function check(page:any,label:string){
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.ok(overflow<=1,label+': horizontal overflow '+overflow+'px');
  const small=await page.evaluate(()=>[...document.querySelectorAll('.voice-lang-btn,.voice-auto,.voice-lang-hint .btn,.voice-controls .btn')].filter((e:any)=>e.offsetParent&&e.getBoundingClientRect().height<43.5).map((e:any)=>(e.dataset.voiceLang||e.className||'').slice(0,30)));
  assert.deepEqual(small,[],label+': touch targets under 44px');
  const clipped=await page.evaluate(()=>[...document.querySelectorAll('.voice-lang-btn')].filter((e:any)=>e.scrollWidth>e.clientWidth+1).length);assert.equal(clipped,0,label+': toggle labels clipped');
 }
 let shots=0;const shot=async(page:any,name:string)=>{await page.screenshot({path:`${out}/${name}.png`,fullPage:false});shots++};
 try{
  // 1. English UI starts English recognition; the toggle switches to Vietnamese, restarts cleanly and keeps the words heard.
  {const {page,context,errors}=await open({lang:'en'});
   assert.deepEqual(await recLangs(page),['en-AU'],'English UI starts en-AU');assert.deepEqual(await pressed(page),['vi-VN:false','en-AU:true']);
   assert.equal(await page.locator('.voice-lang-btn[data-voice-lang="vi-VN"]').innerText(),'Tiếng Việt','language names are not translated');
   await page.evaluate(()=>(window as any).__say('two kilos of pork belly'));
   await page.locator('.voice-lang-btn[data-voice-lang="vi-VN"]').click();await page.waitForTimeout(50);
   const st=await page.evaluate(()=>(window as any).__recs.map((r:any)=>[r.lang,r.ended]));assert.deepEqual(st,[['en-AU',true],['vi-VN',false]],'old recogniser stopped, one new vi-VN recogniser live');
   assert.match(await page.inputValue('#voice-text'),/two kilos of pork belly/,'heard text kept across the switch');
   assert.deepEqual(await pressed(page),['vi-VN:true','en-AU:false']);
   assert.deepEqual(await page.evaluate(()=>[localStorage.getItem('bep-voice-lang'),localStorage.getItem('bep-voice-auto')]),['vi-VN','0'],'manual choice remembered on this device');
   await page.evaluate(()=>(window as any).__say('và một bó rau muống'));assert.match(await page.inputValue('#voice-text'),/two kilos of pork belly, và một bó rau muống/);
   // Reopening uses the remembered choice; ticking Auto goes back to the UI language.
   await page.evaluate('closeModal();voiceModal()');assert.equal((await recLangs(page)).pop(),'vi-VN');
   await page.locator('#voice-auto').check();await page.waitForTimeout(50);assert.equal((await recLangs(page)).pop(),'en-AU');assert.equal(await page.evaluate(()=>localStorage.getItem('bep-voice-auto')),'1');
   assert.deepEqual(errors,[]);await context.close()}
  // 2. Vietnamese UI starts Vietnamese recognition.
  {const {page,context}=await open({lang:'vi'});assert.deepEqual(await recLangs(page),['vi-VN']);assert.deepEqual(await pressed(page),['vi-VN:true','en-AU:false']);await context.close()}
  // 3. Auto mode suggests (never forces) a switch when the words look Vietnamese under English recognition.
  {const {page,context}=await open({lang:'en'});
   await page.evaluate(()=>(window as any).__say('hai ky thit ba chi voi mot bo rau muong',.42));
   const hint=page.locator('#voice-lang-hint');await hint.waitFor({state:'visible'});assert.match(await hint.innerText(),/Sounds like Vietnamese/);assert.equal((await recLangs(page)).length,1,'no silent switch');
   await check(page,'hint mobile');await shot(page,'hint-en-light-mobile');
   await hint.locator('[data-voice-suggest]').click();await page.waitForTimeout(50);assert.equal((await recLangs(page)).pop(),'vi-VN');assert.equal(await hint.isVisible(),false);
   assert.equal(await page.evaluate(()=>localStorage.getItem('bep-voice-auto')),null,'a one-tap suggestion keeps Auto on');await context.close()}
  // 4. Preview follows the UI language; confirmed lines re-render after switching the UI language.
  for(const lang of['en','vi']){const {page,context,errors}=await open({lang});
   await page.evaluate((t:string)=>(window as any).__say(t),'two kilos of pork belly and a bunch of water spinach, a bunch of cilantro and two packets of bean sprouts');
   await page.evaluate('previewVoice()');await page.waitForSelector('.voice-item');
   const got=await labels(page);
   assert.deepEqual(got,lang==='en'?[['Pork belly','kg'],['Water spinach','bunch'],['Coriander','bunch'],['bean sprouts','packs']]:[['Thịt ba chỉ','kg'],['Rau muống','bó'],['Ngò rí','bó'],['bean sprouts','gói']],lang+' preview labels');
   if(lang==='vi')assert.match(await page.locator('.voice-item').first().innerText(),/Nghe được: “pork belly”/);
   await page.locator('[data-personal="voice-apply-shopping"]').click();await page.waitForFunction(()=>location.hash==='#shopping');await page.waitForTimeout(150);
   const extras=await page.evaluate('currentWeek().extras.filter(e=>e.voice).map(e=>[e.name,e.ingredient,e.qty])');
   assert.deepEqual(extras,[['Thịt ba chỉ','pork','2 kg'],['Rau muống','waterSpinach','1 bó'],['Ngò rí','herbs','1 bó'],['bean sprouts',null,'2 gói']],'stored under catalog names + ids');
   const txt=async()=>page.locator('#main').innerText();
   await page.evaluate('changeAppLanguage("en")');await page.waitForTimeout(150);let t=await txt();assert.match(t,/Pork belly/);assert.match(t,/Water spinach/);assert.match(t,/bean sprouts/);
   await page.evaluate('changeAppLanguage("vi")');await page.waitForTimeout(150);t=await txt();assert.match(t,/Thịt ba chỉ/);assert.match(t,/Rau muống/);assert.doesNotMatch(t,/Pork belly/);
   assert.deepEqual(errors,[]);await context.close()}
  // 5. Offline: no recogniser starts, the sheet says to type or use keyboard dictation.
  {const {page,context}=await open({lang:'en'});await context.setOffline(true);await page.evaluate('dispatchEvent(new Event("offline"));closeModal();voiceModal()');await page.waitForTimeout(100);assert.match(await page.locator('#voice-status').innerText(),/Offline|type/i);await context.close()}
  // 6. Responsive screenshots: sheet with the toggle and a bilingual preview, VI/EN × light/dark × 3 sizes.
  for(const[size,viewport]of Object.entries(sizes))for(const lang of['vi','en'])for(const theme of['light','dark']){
   const {page,context,errors}=await open({viewport,lang,theme});const tag=`${lang}-${theme}-${size}`;
   await page.evaluate((t:string)=>(window as any).__say(t),MIXED);await check(page,'sheet '+tag);await shot(page,'sheet-'+tag);
   await page.evaluate('previewVoice()');await page.waitForSelector('.voice-item');await check(page,'preview '+tag);
   const first=(await labels(page))[0][0];assert.equal(first,lang==='en'?'Pork belly':'Thịt ba chỉ');await shot(page,'preview-'+tag);
   assert.deepEqual(errors,[]);await context.close()}
  console.log(`PASS voice browser: en-AU/vi-VN start, toggle restart keeps words, remembered choice, Auto suggestion, UI-language preview + re-render, offline; ${shots} screenshots in ${out}`);
 }finally{await browser.close()}
}
main().catch(error=>{console.error(error);process.exit(1)});
