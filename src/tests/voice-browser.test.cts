// Bilingual voice input, browser QA with a mocked SpeechRecognition (no audio, no network recognition):
// the recogniser starts in the UI language, the Tiếng Việt | English toggle restarts it cleanly, the preview
// follows the UI language, and confirmed lines re-render when the UI language changes. Device-only mode,
// browser viewport simulation at mobile 375×812, tablet 820×1100 and desktop 1280×800 (not physical devices).
// v1.7.1: one-tap VI ⇄ EN toggle next to the mic, hold-to-talk default (sections 1–6 choose tap mode explicitly to
// test language behaviour; section 7 tests hold), "Chưa nghe rõ, nói lại?". Screenshots: docs/reviews/v1.7.1/voice-settings/.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const origin='https://kitchen.test',out='docs/reviews/v1.7.1/voice-settings';
const mime:Record<string,string>={'.js':'application/javascript','.css':'text/css','.html':'text/html','.webmanifest':'application/manifest+json','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
const sizes={mobile:{width:375,height:812},tablet:{width:820,height:1100},desktop:{width:1280,height:800}};
const MIXED='2 kg pork belly với một bó rau muống, mua 3 hộp eggs, a bunch of cilantro, two packets of bean sprouts';
async function main(){
 mkdirSync(out,{recursive:true});
 const browser=await chromium.launch();
 async function open({viewport=sizes.mobile,lang='vi',theme='light',voicePrefs=null as null|Record<string,string>,languages=null as null|string[],hold=false}={}){
  if(!hold)voicePrefs={'bep-voice-ptt-v171':'1','bep-voice-ptt':'0',...(voicePrefs||{})};
  const context=await browser.newContext({viewport,serviceWorkers:'block',reducedMotion:'reduce',colorScheme:theme as any});
  if(languages)await context.addInitScript((l:string[])=>{Object.defineProperty(navigator,'languages',{get:()=>l});Object.defineProperty(navigator,'language',{get:()=>l[0]})},languages);
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
 // v1.6: Auto is the default and needs no choice; the Tiếng Việt / English override lives in the collapsed "Cài đặt giọng nói".
 const settings=async(page:any)=>{if(!(await page.locator('#voice-settings').evaluate((d:any)=>d.open)))await page.locator('#voice-settings > summary').click();await page.waitForTimeout(40)};
 const pressed=(page:any)=>page.evaluate(()=>[...document.querySelectorAll('.voice-lang [data-voice-lang]')].map((b:any)=>b.dataset.voiceLang+':'+b.getAttribute('aria-pressed')));
 const labels=(page:any)=>page.evaluate(()=>[...document.querySelectorAll('.voice-item')].map((el:any)=>[el.querySelector('.voice-label').value,el.querySelector('.voice-unit').value]));
 async function check(page:any,label:string){
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.ok(overflow<=1,label+': horizontal overflow '+overflow+'px');
  const small=await page.evaluate(()=>[...document.querySelectorAll('.voice-lang-btn,.voice-auto,.voice-lang-hint .btn,.voice-controls .btn,.voice-lang-toggle,.voice-retry .btn')].filter((e:any)=>e.offsetParent&&e.getBoundingClientRect().height<43.5).map((e:any)=>(e.dataset.voiceLang||e.className||'').slice(0,30)));
  assert.deepEqual(small,[],label+': touch targets under 44px');
  const clipped=await page.evaluate(()=>[...document.querySelectorAll('.voice-lang-btn,.voice-lang-toggle')].filter((e:any)=>e.scrollWidth>e.clientWidth+1).length);assert.equal(clipped,0,label+': toggle labels clipped');
 }
 let shots=0;const shot=async(page:any,name:string)=>{await page.screenshot({path:`${out}/${name}.jpg`,type:'jpeg',quality:70,fullPage:false});shots++};
 const toggle=(page:any)=>page.locator('#voice-lang-toggle');
 const cur=(page:any)=>toggle(page).getAttribute('data-lang-current');
 try{
  // 1. English UI starts English recognition; the toggle switches to Vietnamese, restarts cleanly and keeps the words heard.
  {const {page,context,errors}=await open({lang:'en'});
   assert.deepEqual(await recLangs(page),['en-AU'],'English UI on an English-only device starts en-AU');
   // v1.7.1: one visible toggle next to the mic shows the language it listens in (Auto as a caption).
   assert.equal(await toggle(page).isVisible(),true,'VI/EN toggle visible next to the mic');assert.equal(await cur(page),'en-AU');
   assert.match(await toggle(page).innerText(),/VI\s*EN\s*Auto/);assert.match(await toggle(page).getAttribute('aria-label'),/English \(automatic\)\. Tap to switch to (Tiếng Việt|Vietnamese)/);
   assert.equal(await page.locator('.voice-controls select, #voice-mode-chip').count(),0,'no select, no misleading “Auto · Vietnamese + English” chip');
   assert.equal(await page.locator('.voice-lang-btn').first().isVisible(),false,'the old buttons stay inside Voice settings');
   await settings(page);assert.deepEqual(await pressed(page),['vi-VN:false','en-AU:true']);
   assert.equal(await page.locator('.voice-lang-btn[data-voice-lang="vi-VN"]').innerText(),'Tiếng Việt','language names are not translated');
   await page.evaluate(()=>(window as any).__say('two kilos of pork belly'));
   await toggle(page).click();await page.waitForTimeout(50);assert.equal(await cur(page),'vi-VN','one tap: EN → VI');assert.doesNotMatch(await toggle(page).innerText(),/Auto/);
   const st=await page.evaluate(()=>(window as any).__recs.map((r:any)=>[r.lang,r.ended]));assert.deepEqual(st,[['en-AU',true],['vi-VN',false]],'old recogniser stopped, one new vi-VN recogniser live');
   assert.match(await page.inputValue('#voice-text'),/two kilos of pork belly/,'heard text kept across the switch');
   assert.deepEqual(await pressed(page),['vi-VN:true','en-AU:false']);
   assert.deepEqual(await page.evaluate(()=>[localStorage.getItem('bep-voice-lang'),localStorage.getItem('bep-voice-auto')]),['vi-VN','0'],'manual choice remembered on this device');
   await page.evaluate(()=>(window as any).__say('và một bó rau muống'));assert.match(await page.inputValue('#voice-text'),/two kilos of pork belly, và một bó rau muống/);
   // Reopening uses the remembered choice; ticking Auto goes back to the UI language.
   await page.evaluate('closeModal();voiceModal()');assert.equal((await recLangs(page)).pop(),'vi-VN');assert.equal(await cur(page),'vi-VN','remembered choice shown on the toggle');
   await toggle(page).click();await page.waitForTimeout(50);assert.equal((await recLangs(page)).pop(),'en-AU','tap again: VI → EN');assert.equal(await cur(page),'en-AU');await toggle(page).click();await page.waitForTimeout(50);assert.equal(await cur(page),'vi-VN');
   assert.equal(await page.evaluate(()=>(document.activeElement as any)?.id),'voice-lang-toggle','focus stays on the toggle');
   await settings(page);await page.locator('#voice-auto').check();await page.waitForTimeout(50);assert.equal((await recLangs(page)).pop(),'en-AU');assert.equal(await page.evaluate(()=>localStorage.getItem('bep-voice-auto')),'1');assert.match(await toggle(page).innerText(),/Auto/,'Auto again from Voice settings');
   assert.deepEqual(errors,[]);await context.close()}
  // 2. Vietnamese UI starts Vietnamese recognition at once (Auto, no prompt).
  {const {page,context}=await open({lang:'vi'});assert.deepEqual(await recLangs(page),['vi-VN']);assert.equal(await cur(page),'vi-VN');assert.match(await toggle(page).innerText(),/Tự động/);await settings(page);assert.deepEqual(await pressed(page),['vi-VN:true','en-AU:false']);await context.close()}
  // 2b. Auto: English UI on a device that also lists Vietnamese listens in vi-VN (Vietlish), still with no prompt.
  {const {page,context}=await open({lang:'en',languages:['en-AU','vi-VN']});assert.deepEqual(await recLangs(page),['vi-VN'],'Auto prefers vi-VN for a Vietnamese device');
   assert.equal(await page.locator('.voice-lang-btn').first().isVisible(),false);await page.evaluate(()=>(window as any).__say('1kg salmon, 2kg tuna'));await page.evaluate('previewVoice()');await page.waitForSelector('.voice-item');
   assert.deepEqual(await labels(page),[['Salmon','kg'],['Tuna','kg']],'Vietlish parsed, shown in the UI language');await context.close()}
  // 2c. The owner's 10-item list as heard on production (no commas, "a"=eight, "to sermons", "galaxies"):
  //     ten lines, one-tap "Did you mean", and the confirmed choice is learned by the family.
  for(const lang of['en','vi']){const {page,context,errors}=await open({lang});
   await page.evaluate(()=>(window as any).__say('5 chicken breast a tomatoes 6 potatoes 4 carrots 3 beef five onions 12 eggs to sermons 3 broccolis 10 galaxies'));
   await page.evaluate('previewVoice()');await page.waitForSelector('.voice-item');
   assert.equal(await page.locator('.voice-item').count(),10,lang+': ten lines');
   const sug=page.locator('.voice-suggest');assert.equal(await sug.count(),2);
   assert.deepEqual(await sug.allInnerTexts(),lang==='en'?['Did you mean: salmon (cá hồi)?','Did you mean: garlic (tỏi)?']:['Có phải: cá hồi (salmon)?','Có phải: tỏi (garlic)?']);
   const h=await sug.first().evaluate((e:any)=>e.getBoundingClientRect().height);assert.ok(h>=43.5,'suggestion touch target '+h);
   await sug.last().click();assert.equal(await page.locator('.voice-item').nth(9).locator('.voice-map').inputValue(),'garlic');assert.equal(await page.locator('.voice-item').nth(9).locator('.voice-label').inputValue(),lang==='en'?'Garlic':'Tỏi');
   assert.deepEqual((await labels(page)).slice(0,2),lang==='en'?[['Chicken breast','pieces'],['Tomatoes','pcs']]:[['Ức gà','miếng'],['Cà chua','quả']],'no "whole", localised');
   await page.locator('[data-personal="voice-apply-shopping"]').click();await page.waitForFunction(()=>location.hash==='#shopping');
   assert.deepEqual(await page.evaluate('(state.voiceLearned||[]).map(e=>[e.p,e.id])'),[['galaxies','garlic']],'confirmed suggestion learned');
   await page.evaluate('closeModal();voiceModal()');await page.evaluate(()=>(window as any).__say('10 galaxies'));await page.evaluate('previewVoice()');await page.waitForSelector('.voice-item');
   assert.equal(await page.locator('.voice-item .voice-map').inputValue(),'garlic','learned word maps directly next time');assert.equal(await page.locator('.voice-suggest').count(),0);
   assert.deepEqual(errors,[]);await context.close()}
  // 3. Auto mode suggests (never forces) a switch when the words look Vietnamese under English recognition.
  {const {page,context}=await open({lang:'en'});
   await page.evaluate(()=>(window as any).__say('hai ky thit ba chi voi mot bo rau muong',.42));
   const hint=page.locator('#voice-lang-hint');await hint.waitFor({state:'visible'});assert.match(await hint.innerText(),/Sounds like Vietnamese/);assert.equal((await recLangs(page)).length,1,'no silent switch');
   await check(page,'hint mobile');
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
   await page.evaluate((t:string)=>(window as any).__say(t),MIXED);await check(page,'sheet '+tag);await shot(page,'voice-sheet-'+tag);
   await page.evaluate('previewVoice()');await page.waitForSelector('.voice-item');await check(page,'preview '+tag);
   const first=(await labels(page))[0][0];assert.equal(first,lang==='en'?'Pork belly':'Thịt ba chỉ');
   assert.deepEqual(errors,[]);await context.close()}
  // 7. v1.7.1 hold to talk is the default: no auto-start; hold starts, release stops and previews; a short tap only
  //    hints; sliding the finger off stops and sends; held Space works; tap mode still works when chosen.
  {const {page,context,errors}=await open({lang:'vi',hold:true});const mic=page.locator('#voice-continue');
   assert.deepEqual(await recLangs(page),[],'hold mode: nothing listens until the button is held');
   assert.equal(await mic.getAttribute('data-hold-mic'),'main');assert.match(await mic.innerText(),/Giữ để nói/);assert.match(await page.locator('#voice-status').innerText(),/Giữ nút/);
   assert.equal(await mic.evaluate((e:any)=>getComputedStyle(e).touchAction),'none','no page scroll while holding');assert.equal(await mic.evaluate((e:any)=>getComputedStyle(e).userSelect),'none');
   const box=await mic.boundingBox();if(!box)throw Error('no mic box');const cx=box.x+box.width/2,cy=box.y+box.height/2;
   await page.mouse.move(cx,cy);await page.mouse.down();await page.waitForTimeout(320);
   assert.equal(await mic.getAttribute('aria-pressed'),'true');assert.equal(await page.evaluate(()=>!!(window as any).__live()),true,'held: listening');
   await page.evaluate(()=>(window as any).__say('2 miếng salmon'));await page.mouse.up();await page.waitForTimeout(80);
   assert.equal(await page.evaluate(()=>!!(window as any).__live()),false,'released: stopped');
   await page.waitForSelector('.voice-item',{timeout:3000});assert.deepEqual(await labels(page),[['Cá hồi','miếng']],'release sends: preview after the last words');
   await shot(page,'hold-preview-vi-light-mobile');
   // Short tap → hint, no words.
   await page.evaluate('closeModal();voiceModal()');const mic2=page.locator('#voice-continue');const b2=await mic2.boundingBox();if(!b2)throw Error('no box');
   await page.mouse.move(b2.x+b2.width/2,b2.y+b2.height/2);await page.mouse.down();await page.waitForTimeout(60);await page.mouse.up();await page.waitForTimeout(60);
   assert.equal(await page.locator('.voice-hold-hint').isVisible(),true,'a quick tap shows “Giữ nút để nói”');assert.match(await page.locator('.voice-hold-hint').innerText(),/Giữ nút để nói/);assert.equal(await page.evaluate(()=>!!(window as any).__live()),false);
   await check(page,'hold hint mobile');await shot(page,'hold-hint-vi-light-mobile');
   // Slide off → stops (and sends).
   await page.mouse.down();await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>!!(window as any).__live()),true);await page.evaluate(()=>(window as any).__say('5 eggs'));
   await page.mouse.move(b2.x+b2.width/2,b2.y-200,{steps:4});await page.waitForTimeout(80);assert.equal(await page.evaluate(()=>!!(window as any).__live()),false,'slide-off stops');await page.mouse.up();
   await page.waitForSelector('.voice-item',{timeout:3000});
   // Keyboard: hold Space on the focused button.
   await page.evaluate('closeModal();voiceModal()');await page.locator('#voice-continue').focus();await page.keyboard.down(' ');await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>!!(window as any).__live()),true,'held Space listens');await page.keyboard.up(' ');await page.waitForTimeout(60);assert.equal(await page.evaluate(()=>!!(window as any).__live()),false);
   // Tap mode when chosen in Voice settings.
   await settings(page);await page.locator('#voice-ptt').uncheck();assert.equal(await page.evaluate(()=>localStorage.getItem('bep-voice-ptt')),'0');assert.equal(await page.locator('#voice-continue').getAttribute('data-personal'),'mic');
   const n=(await recLangs(page)).length;await page.locator('#voice-continue').click();await page.waitForTimeout(60);assert.equal((await recLangs(page)).length,n+1,'tap mode: one tap starts');
   assert.deepEqual(errors,[]);await context.close()}
  // 8. Nothing recognisable ("các bạn") is not added: "Chưa nghe rõ, nói lại?" with a one-tap switch to English.
  for(const[size,viewport]of Object.entries(sizes)){const {page,context,errors}=await open({lang:'vi',viewport});
   await page.evaluate(()=>(window as any).__say('các bạn'));await page.evaluate('previewVoice()');
   const retry=page.locator('#voice-retry');await retry.waitFor();assert.match(await retry.innerText(),/Chưa nghe rõ, nói lại\?[\s\S]*các bạn/);assert.equal(await page.locator('.voice-item').count(),0,'no junk line');
   await check(page,'retry '+size);await shot(page,'retry-vi-light-'+size);
   if(size==='mobile'){await retry.locator('[data-vc-retry="switch"]').click();await page.waitForTimeout(60);assert.equal((await recLangs(page)).pop(),'en-AU','one tap: listen in English');assert.equal(await cur(page),'en-AU');assert.equal(await page.inputValue('#voice-text'),'');
    await page.evaluate(()=>(window as any).__say('các bạn'));await page.evaluate('previewVoice()');await page.locator('#voice-retry [data-vc-retry="keep"]').click();await page.waitForSelector('.voice-item');assert.equal(await page.locator('.voice-item').count(),1,'“Keep as heard” still allows it');
    // Typed words are never second-guessed.
    await page.evaluate('closeModal();voiceModal()');await page.fill('#voice-text','giấy vệ sinh');await page.evaluate('previewVoice()');await page.waitForSelector('.voice-item');assert.equal(await page.locator('#voice-retry').count(),0)}
   assert.deepEqual(errors,[]);await context.close()}
  console.log(`PASS voice browser: en-AU/vi-VN start, one-tap VI/EN toggle restart keeps words, hold-to-talk default (hold/release/short tap/slide-off/Space/tap mode), “Chưa nghe rõ” retry, remembered choice, Auto suggestion, UI-language preview + re-render, offline; ${shots} screenshots in ${out}`);
 }finally{await browser.close()}
}
main().catch(error=>{console.error(error);process.exit(1)});
