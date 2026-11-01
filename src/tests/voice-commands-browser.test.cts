// Voice v1.6 browser QA with mocked SpeechRecognition, speechSynthesis, getUserMedia and AudioContext (no audio,
// no network recognition): multi-card command preview → spoken read-back in the UI language → short listening window
// ("đồng ý"/"yes" confirms, "sửa"/"no" keeps editing, silence never confirms a removal) → undo; learned corrections
// from the "Means" control; push-to-talk by pointer and keyboard; mic meter + "too noisy" hint released after
// listening; pluggable recogniser. Device-only mode, browser viewport simulation at 375×812, 820×1100 and 1280×800
// (not physical devices). Saves screenshots to docs/reviews/v1.6/voice/.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const origin='https://kitchen.test',out='docs/reviews/v1.6/voice';
const mime:Record<string,string>={'.js':'application/javascript','.css':'text/css','.html':'text/html','.webmanifest':'application/manifest+json','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
const sizes={mobile:{width:375,height:812},tablet:{width:820,height:1100},desktop:{width:1280,height:800}};
async function main(){
 mkdirSync(out,{recursive:true});
 const browser=await chromium.launch();
 async function open({viewport=sizes.mobile,lang='vi',theme='light',prefs={} as Record<string,string>,voices=['vi-VN','en-AU']}={}){
  const context=await browser.newContext({viewport,serviceWorkers:'block',reducedMotion:'reduce',colorScheme:theme as any});
  await context.addInitScript(({lang,theme,prefs,voices})=>{const w=window as any;
   if(!sessionStorage.getItem('qa-init')){sessionStorage.setItem('qa-init','1');localStorage.setItem('bep-theme-mode',theme);localStorage.setItem('guest/bep-language',lang);localStorage.setItem('bep-local-locked','yes');localStorage.setItem('bep-voice-slow','1');for(const[k,v]of Object.entries(prefs))localStorage.setItem(k,v as string)}
   w.__recs=[];class FakeRec{lang='';n=0;started=false;ended=false;continuous:any;onresult:any;onend:any;onerror:any;constructor(){w.__recs.push(this)}start(){this.started=true}stop(){this.end()}abort(){this.end()}end(){if(this.ended)return;this.ended=true;setTimeout(()=>this.onend&&this.onend(),0)}}
   w.SpeechRecognition=FakeRec;w.webkitSpeechRecognition=FakeRec;
   w.__live=()=>w.__recs.filter((r:any)=>r.started&&!r.ended).pop();
   w.__say=(text:string,confidence=.9)=>{const r=w.__live();if(!r)throw Error('no live recogniser');const alt:any=[{transcript:text,confidence}];alt.isFinal=true;const results:any=[];results[r.n]=alt;r.onresult({resultIndex:r.n,results});r.n++};
   // Speech synthesis: records what would be spoken and finishes quickly.
   w.__spoken=[];const vs=voices.map((l:string)=>({lang:l,name:'Voice '+l}));
   Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{getVoices:()=>vs,speak(u:any){w.__spoken.push({text:u.text,lang:u.lang,voice:u.voice?.name||null});setTimeout(()=>u.onend&&u.onend(),20)},cancel(){},addEventListener(){}}});
   w.SpeechSynthesisUtterance=class{text:string;lang='';voice:any=null;rate=1;onend:any;onerror:any;constructor(t:string){this.text=t}};
   // Microphone level: a fake stream + analyser whose loudness the test controls.
   w.__amp=0;w.__tracksStopped=0;w.__ctxClosed=0;w.__gum=0;
   Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>{w.__gum++;return{getTracks:()=>[{stop(){w.__tracksStopped++}}]}}}});
   w.AudioContext=class{createMediaStreamSource(){return{connect(){}}}createAnalyser(){return{fftSize:512,getByteTimeDomainData(a:Uint8Array){for(let i=0;i<a.length;i++)a[i]=128+Math.round(w.__amp*127*(i%2?1:-1))}}}close(){w.__ctxClosed++}};
  },{lang,theme,prefs,voices});
  const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route(origin+'/**',async route=>{const url=new URL(route.request().url()),path=url.pathname;
   if(path.startsWith('/.netlify/')){await route.fulfill({status:401,json:{error:'no'}});return}
   if(path==='/startup-scripts.json'){await route.fulfill({json:JSON.parse(readFileSync('dist/startup-scripts.json','utf8'))});return}
   const file=resolve('dist',path==='/'?'index.html':path.slice(1));
   try{await route.fulfill({contentType:mime[extname(file)]||'application/octet-stream',body:readFileSync(file)})}catch{await route.fulfill({status:404,body:'Not found'})}});
  await page.goto(origin+'/#today',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof (globalThis as any).parseVoiceCommands==='function'&&typeof (globalThis as any).voiceModal==='function'&&document.querySelector('#main h1'),null,{timeout:20000});
  // A family with Phú, today's dinner planned and two extra lines on the list.
  await page.evaluate(()=>{const g=globalThis as any,s=(0,eval)('state');s.members[0].name='Phú';const w=(0,eval)('currentWeek()');w.extras=w.extras.filter((e:any)=>!['qa-egg','qa-onion'].includes(e.id));
   w.extras.push({id:'qa-egg',name:'Trứng',nameEn:'Eggs',qty:'10 quả',cost:0,currency:'AUD',costKnown:false,costUnknown:true,done:false,ingredient:'egg'},{id:'qa-onion',name:'Hành lá',nameEn:'Spring onions',qty:'1 bó',cost:0,currency:'AUD',costKnown:false,costUnknown:true,done:false,ingredient:'scallion'});
   g.VoiceAPI.listenWindowMs=1500;(0,eval)('save();render()')});
  await page.evaluate('closeModal();voiceModal()');await page.waitForSelector('#voice-text');
  return{page,context,errors};
 }
 const live=(page:any)=>page.evaluate(()=>{const r=(window as any).__live();return r?{continuous:r.continuous,lang:r.lang}:null});
 async function check(page:any,label:string){
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.ok(overflow<=1,label+': horizontal overflow '+overflow+'px');
  const inner=await page.evaluate(()=>{const m=document.querySelector('.modal-content');return m?m.scrollWidth-m.clientWidth:0});assert.ok(inner<=1,label+': modal content overflows '+inner+'px');
  const small=await page.evaluate(()=>[...document.querySelectorAll('.voice-card-include,.voice-card .checked-label,.voice-map,.voice-opt,.voice-learned .btn,.voice-settings>summary,.voice-readback-toggle,.voice-confirm-live .btn,.voice-controls .btn,.modal-footer .btn')].filter((e:any)=>e.offsetParent&&e.getBoundingClientRect().height<43.5).map((e:any)=>(e.className||e.tagName).slice(0,40)));
  assert.deepEqual(small,[],label+': touch targets under 44px');
 }
 let shots=0;const shot=async(page:any,name:string)=>{await page.screenshot({path:`${out}/${name}.png`,fullPage:false});shots++};
 const TODAY=async(page:any)=>page.evaluate('sydneyDate()');
 try{
  // 1. VI: three intents in one sentence → three cards; read back in Vietnamese; "đồng ý" in the short window confirms; one undo.
  {const {page,context,errors}=await open({lang:'vi',prefs:{'bep-voice-readback':'1'}});
   await page.evaluate(()=>(window as any).__say('tối nay anh Phú không ăn, tủ còn hai hộp trứng, còn thiếu gì'));
   await page.locator('[data-personal="voice-preview"]').click();await page.waitForSelector('.voice-card');
   assert.deepEqual(await page.$$eval('.voice-card',(els:any[])=>els.map(e=>e.dataset.type)),['attendance','pantry','answer']);
   assert.match(await page.locator('.voice-answer').innerText(),/^Còn cần mua \d+ món: .*Trứng 10 quả/);
   await page.waitForFunction(()=>(window as any).__spoken.length>0);const spoken=await page.evaluate(()=>(window as any).__spoken[0]);
   assert.equal(spoken.lang,'vi-VN');assert.equal(spoken.voice,'Voice vi-VN');assert.match(spoken.text,/Phú không ăn bữa tối/);assert.match(spoken.text,/Nói “đồng ý” để xác nhận/);
   await page.waitForFunction(()=>{const r=(window as any).__live();return r&&r.continuous===false});assert.equal((await live(page)).lang,'vi-VN');
   await page.locator('#voice-confirm-live').waitFor({state:'visible'});await check(page,'cards vi mobile');await shot(page,'confirm-listening-vi-light-mobile');
   const today=await TODAY(page);
   await page.evaluate(()=>(window as any).__say('đồng ý'));await page.waitForSelector('#voice-cmd-undo');
   assert.deepEqual(await page.evaluate((d:string)=>(0,eval)('state').availability?.dad?.[d]?.dinner,today),{status:'away',deduct:true,remind:false,note:'Báo bằng giọng nói'});
   const lots=await page.evaluate(()=>(0,eval)('state').pantry.filter((p:any)=>p.ingredient==='egg'));assert.equal(lots.length,1);assert.deepEqual(lots[0].purchase,{unit:'hộp',amount:2,basePerUnit:null,pricePerUnit:null},'boxes stay boxes; no egg count invented');assert.equal(lots[0].qty,0);
   await page.locator('#voice-cmd-undo').click();await page.waitForTimeout(100);
   assert.equal(await page.evaluate((d:string)=>(0,eval)('state').availability?.dad?.[d]?.dinner??null,today),null,'undo clears the away note');assert.equal(await page.evaluate(()=>(0,eval)('state').pantry.filter((p:any)=>p.ingredient==='egg').length),0,'undo restores the pantry');
   assert.deepEqual(errors,[]);await context.close()}
  // 2. EN: "no" keeps editing; the window timing out never confirms a removal; an explicit tap does; undo restores both lines.
  {const {page,context,errors}=await open({lang:'en',prefs:{'bep-voice-readback':'1'}});
   await page.evaluate(()=>(window as any).__say('mark eggs bought and remove spring onions'));
   await page.evaluate('previewVoice()');await page.waitForSelector('.voice-card');
   assert.deepEqual(await page.$$eval('.voice-card',(els:any[])=>els.map(e=>e.dataset.type)),['bought','remove']);
   await page.waitForFunction(()=>(window as any).__spoken.length>0);const sp=await page.evaluate(()=>(window as any).__spoken[0]);assert.equal(sp.lang,'en-AU');assert.match(sp.text,/Mark bought: eggs\. Remove from the list: spring onions/i);
   await page.waitForFunction(()=>{const r=(window as any).__live();return r&&r.continuous===false});
   await page.evaluate(()=>(window as any).__say('no'));await page.waitForTimeout(80);
   assert.equal(await page.locator('#voice-confirm-live').isVisible(),false);assert.match(await page.locator('#voice-readback').innerText(),/OK — edit, then tap Confirm/);assert.equal(await page.locator('.voice-card').count(),2,'still editing');
   const extras=()=>page.evaluate(()=>(0,eval)('currentWeek()').extras.filter((e:any)=>e.id.startsWith('qa-')).map((e:any)=>[e.id,!!e.done]));
   assert.deepEqual(await extras(),[['qa-egg',false],['qa-onion',false]]);
   // Silence: start another window and let it time out.
   await page.evaluate('VoiceAPI.listenForConfirm()');await page.waitForFunction(()=>{const r=(window as any).__live();return r&&r.continuous===false});
   await page.waitForTimeout(1700);assert.deepEqual(await extras(),[['qa-egg',false],['qa-onion',false]],'timeout never confirms');
   await check(page,'cards en mobile');
   await page.locator('[data-vc="confirm"]').click();await page.waitForSelector('#voice-cmd-undo');
   assert.deepEqual(await extras(),[['qa-egg',true]],'eggs bought, spring onions removed after the tap');
   await page.locator('#voice-cmd-undo').click();await page.waitForTimeout(100);assert.deepEqual(await extras(),[['qa-egg',false],['qa-onion',false]],'undo restores both');
   // A count in the ingredient's own unit ("6 eggs", shown as "pcs" in English) is stored as 6 eggs, not as an unknown pack.
   await page.evaluate('closeModal();voiceModal()');await page.evaluate(()=>(window as any).__say('we have 6 eggs left'));await page.evaluate('previewVoice()');await page.waitForSelector('.voice-card[data-type="pantry"]');
   assert.equal(await page.inputValue('.voice-card[data-type="pantry"] [data-vc-f="unit"]'),'pcs');await page.locator('[data-vc="confirm"]').click();await page.waitForSelector('#voice-cmd-undo');
   assert.deepEqual(await page.evaluate(()=>(0,eval)('state').pantry.filter((p:any)=>p.ingredient==='egg').map((p:any)=>[p.qty,p.purchase||null])),[[6,null]]);
   assert.deepEqual(errors,[]);await context.close()}
  // 3. No voice for the UI language → text-only read-back, confirmation buttons still work.
  {const {page,context,errors}=await open({lang:'vi',prefs:{'bep-voice-readback':'1'},voices:['en-US']});
   await page.evaluate(()=>(window as any).__say('nhắn cả nhà mua thêm đá'));await page.evaluate('previewVoice()');await page.waitForSelector('.voice-card[data-type="urgent"]');
   await page.locator('#voice-tts-note').waitFor({state:'visible'});assert.equal(await page.evaluate(()=>(window as any).__spoken.length),0,'nothing spoken with a wrong-language voice');
   assert.equal(await page.inputValue('[data-vc-f="message"]'),'Mua thêm đá');assert.match(await page.locator('#voice-readback').innerText(),/Tin khẩn cho cả nhà: Mua thêm đá/);
   assert.deepEqual(errors,[]);await context.close()}
  // 4. Learned correction: change "Means" on a classic preview line, the family word is remembered and reused; delete it in settings.
  {const {page,context,errors}=await open({lang:'vi'});
   await page.evaluate(()=>(window as any).__say('mua hai con cá quả'));await page.evaluate('previewVoice()');await page.waitForSelector('.voice-item .voice-map');
   assert.equal(await page.inputValue('.voice-item .voice-map'),'fish');await page.selectOption('.voice-item .voice-map','salmon');
   await page.locator('[data-personal="voice-apply-shopping"]').click();await page.waitForFunction(()=>location.hash==='#shopping');
   assert.deepEqual(await page.evaluate(()=>(0,eval)('state').voiceLearned.map((e:any)=>[e.p,e.k,e.id,e.w])),[['ca loc','i','salmon','cá quả']]);
   assert.equal(await page.evaluate(()=>(0,eval)('currentWeek()').extras.find((e:any)=>e.voice)?.ingredient),'salmon');
   await page.evaluate('closeModal();voiceModal()');await page.evaluate(()=>(window as any).__say('mua ba con cá lóc'));await page.evaluate('previewVoice()');await page.waitForSelector('.voice-item .voice-map');
   assert.equal(await page.inputValue('.voice-item .voice-map'),'salmon','cá lóc ≡ cá quả → learned salmon applied first');assert.match(await page.locator('.voice-item').first().innerText(),/Theo từ nhà mình đã dạy/);
   await page.evaluate('closeModal();voiceModal()');await page.locator('#voice-settings>summary').click();await page.locator('.voice-learned li').first().waitFor();
   assert.match(await page.locator('.voice-learned li').first().innerText(),/cá quả → Cá hồi/);await page.evaluate('voiceStopNow()');await page.locator('.voice-learned').scrollIntoViewIfNeeded();await page.waitForTimeout(4600);await check(page,'settings vi mobile');await shot(page,'settings-learned-vi-light-mobile');
   await page.locator('.voice-learned [data-vc="forget"]').click();await page.waitForTimeout(80);assert.equal(await page.evaluate(()=>(0,eval)('state').voiceLearned),undefined);
   assert.deepEqual(errors,[]);await context.close()}
  // 5. Push-to-talk: no autostart; hold = listen, release = stop (pointer and Space); meter on while listening, released after; noise hint.
  {const {page,context,errors}=await open({lang:'vi',prefs:{'bep-voice-ptt':'1','bep-voice-meter':'1'}});
   assert.equal(await page.evaluate(()=>(window as any).__recs.length),0,'push-to-talk does not start the mic on open');
   const btn=page.locator('#voice-continue');assert.equal(await btn.getAttribute('data-vc-ptt'),'');assert.match(await btn.innerText(),/Giữ để nói/);
   await page.evaluate(()=>{(globalThis as any).VoiceAPI.meterTiming={loudMs:300,quietMs:600,loud:.16,quiet:.02,heardGraceMs:100};(window as any).__amp=.5});
   const box=await btn.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
   await page.waitForFunction(()=>!!(window as any).__live());assert.equal(await btn.isVisible(),true,'the held button stays visible');assert.match(await btn.innerText(),/thả ra để dừng/);assert.equal(await btn.getAttribute('aria-pressed'),'true');
   await page.waitForFunction(()=>Number(document.querySelector('#voice-meter')?.getAttribute('aria-valuenow'))>0);
   await page.locator('#voice-noise-hint').waitFor({state:'visible',timeout:3000});assert.match(await page.locator('#voice-noise-hint').innerText(),/Ồn quá — nói gần máy hơn/);
   await check(page,'ptt holding');await shot(page,'ptt-meter-noisy-vi-light-mobile');
   await page.mouse.up();await page.waitForTimeout(80);assert.equal(await page.evaluate(()=>!!(window as any).__live()),false,'release stops');
   assert.deepEqual(await page.evaluate(()=>[(window as any).__tracksStopped,(window as any).__ctxClosed]),[1,1],'microphone stream and audio context released');assert.equal(await page.locator('#voice-noise-hint').isVisible(),false);
   await btn.focus();await page.keyboard.down('Space');await page.waitForFunction(()=>!!(window as any).__live());await page.keyboard.up('Space');await page.waitForTimeout(60);assert.equal(await page.evaluate(()=>!!(window as any).__live()),false,'keyboard hold/release');assert.equal(await page.evaluate(()=>document.activeElement?.id),'voice-continue','focus stays on the talk button');
   assert.equal(await page.evaluate(()=>(window as any).__recs.length),2);
   assert.deepEqual(errors,[]);await context.close()}
  // 6. Pluggable recogniser: an on-device recogniser registered from outside drives the same sheet, even offline.
  {const {page,context,errors}=await open({lang:'en'});
   await page.evaluate(()=>{const w=window as any;w.registerVoiceRecognizer({id:'qa-ondevice',label:'On-device (QA)',offline:true,start(lang:string,onResult:any,onEnd:any){w.__plug={lang,onResult,onEnd}},stop(){w.__plugStopped=true}});});
   await page.locator('#voice-settings>summary').click();await page.selectOption('#voice-recognizer','qa-ondevice');
   await context.setOffline(true);await page.evaluate('dispatchEvent(new Event("offline"));closeModal();voiceModal()');await page.waitForFunction(()=>!!(window as any).__plug);
   assert.equal(await page.evaluate(()=>(window as any).__plug.lang),'en-AU');
   await page.evaluate(()=>(window as any).__plug.onResult('two eggs',{isFinal:true,confidence:.8}));assert.match(await page.inputValue('#voice-text'),/two eggs/);
   await page.locator('#voice-stop').click();await page.waitForTimeout(50);assert.equal(await page.evaluate(()=>(window as any).__plugStopped),true);
   await context.setOffline(false);assert.deepEqual(errors,[]);await context.close()}
  // 7. Responsive screenshots: command cards VI/EN × light/dark × 3 sizes (+ the sheet with meter and settings).
  const MIX:Record<string,string>={vi:'tối nay anh Phú không ăn, tủ còn hai hộp trứng, tối thứ Ba đổi thành phở bò, còn thiếu gì, nhắn cả nhà mua thêm đá',en:"Phu won't be home for dinner tonight, we have 6 eggs left, change Tuesday dinner to beef pho, what do I still need, tell everyone to buy more ice"};
  for(const[size,viewport]of Object.entries(sizes))for(const lang of['vi','en'])for(const theme of['light','dark']){
   const {page,context,errors}=await open({viewport,lang,theme,prefs:{'bep-voice-meter':'1'}});const tag=`${lang}-${theme}-${size}`;
   await page.evaluate(()=>{(window as any).__amp=.25});await page.waitForFunction(()=>Number(document.querySelector('#voice-meter')?.getAttribute('aria-valuenow'))>0);
   if(size!=='tablet')await shot(page,'sheet-'+tag);await page.locator('#voice-settings>summary').click();await check(page,'sheet '+tag);
   await page.evaluate((t:string)=>(window as any).__say(t),MIX[lang]);await page.evaluate('previewVoice()');await page.waitForSelector('.voice-card');
   assert.deepEqual(await page.$$eval('.voice-card',(els:any[])=>els.map(e=>e.dataset.type)),['attendance','pantry','meal','answer','urgent'],tag);
   await check(page,'cards '+tag);await shot(page,'cards-'+tag);
   assert.deepEqual(errors,[]);await context.close()}
  console.log(`PASS voice commands browser: multi-card VI/EN preview, read-back in UI language + spoken confirm/edit, timeout never confirms, text-only fallback, learned corrections, push-to-talk (pointer+keyboard), meter + noise hint released, pluggable recogniser offline; ${shots} screenshots in ${out}`);
 }finally{await browser.close()}
}
main().catch(error=>{console.error(error);process.exit(1)});
