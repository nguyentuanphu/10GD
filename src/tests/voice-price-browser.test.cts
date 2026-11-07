// Voice price + recipe dictation (v1.6), browser QA with a mocked SpeechRecognition (no audio,
// no network recognition). Device-only mode, browser viewport simulation at mobile 375×812,
// tablet 820×1100 and desktop 1280×800 (not physical devices), VI/EN, light/dark, online/offline.
// v1.7.4 (section 8): "Use this" while the recipe library is still loading on a fresh start — screenshots in
// docs/reviews/v1.7.4/voice-recipe-loading/.
// Sample prices below are synthetic QA fixtures, not real prices. Saves screenshots to docs/reviews/v1.6/voice-price/.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const origin='https://kitchen.test',out='docs/reviews/v1.6/voice-price';
const mime:Record<string,string>={'.js':'application/javascript','.css':'text/css','.html':'text/html','.webmanifest':'application/manifest+json','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
const sizes={mobile:{width:375,height:812},tablet:{width:820,height:1100},desktop:{width:1280,height:800}} as const;
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Australia/Sydney',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const add=(d:string,n:number)=>new Date(Date.parse(d+'T00:00:00Z')+n*864e5).toISOString().slice(0,10);
let n=0;const o=(itemId:string,label:string,retailer:string,price:number,packQty:number,packUnit:string)=>({id:'qa-obs-'+(++n),itemId,label,retailer,branchId:null,state:'NSW',price,currency:'AUD',packQty,packUnit,units:null,unitPrice:null,unitBasis:null,wasPrice:null,promo:null,validUntil:null,observedAt:add(today,-2),observedBy:'QA',source:'manual',note:null});
const SCOUT={version:1,open:true,fold176:true,postcode:'2166',state:'NSW',prefs:{communityOpen:true,wantOpen:true},local:[o('thit-ba-chi','Pork belly 1kg','woolworths',15,1,'kg'),o('thit-ba-chi','Pork belly 1kg','coles',14.5,1,'kg'),o('thit-ba-chi','Ba chỉ','viet-grocer',13.99,1,'kg'),o('thit-ba-chi','Pork belly','aldi',14,1,'kg')],pending:[],pool:null};
const MULTI='Rau muống hai đô rưỡi một bó, chợ Cabramatta';
const MULTI2='thịt ba chỉ mười bốn đô chín mươi chín một ký ở Woolworths, đang sale, trước là mười tám đô';
const RECIPE1='Hôm nay bà dạy các con nấu món canh chua cá lóc nhé, cho bốn người ăn, mất khoảng bốn mươi lăm phút. Nguyên liệu gồm có một con cá lóc khoảng một ký, hai trăm gam bạc hà, ba quả cà chua, một ít me chua, hai muỗng canh nước mắm, đường vừa ăn.';
const RECIPE2='Cách làm: đầu tiên làm sạch cá rồi cắt khúc. Sau đó phi thơm hành tỏi rồi cho cà chua vào xào. Cuối cùng cho cá vào nấu khoảng mười phút.';
const RECIPE_EN='Recipe for beef stir fry for 2 people. Ingredients: 300g beef, 1 onion, 2 cloves garlic, a little soy sauce. Slice the beef thinly. Heat the wok then fry the onion and beef for three minutes.';
async function main(){
 mkdirSync(out,{recursive:true});
 const browser=await chromium.launch();let shots=0;
 async function open({viewport=sizes.mobile as {width:number,height:number},lang='vi',theme='light',offline=false,hold=false,gated=false}={}){
  // gated: the recipe library request fails while gate.mode is 'fail', waits for gate.release() while 'hold'
  const gate:any={mode:gated?'fail':'serve',hits:0,release:()=>{}};gate.wait=new Promise(r=>{gate.release=()=>{gate.mode='serve';r(null)}});
  const context=await browser.newContext({locale:'vi-VN',viewport,serviceWorkers:'block',reducedMotion:'reduce',colorScheme:theme as any});
  await context.addInitScript(({lang,theme,scout,hold})=>{const w=window as any;
   if(!sessionStorage.getItem('qa-init')){sessionStorage.setItem('qa-init','1');localStorage.setItem('bep-voice-ptt-v171','1');localStorage.setItem('bep-voice-ptt',hold?'1':'0');localStorage.setItem('bep-theme-mode',theme);localStorage.setItem('guest/bep-language',lang);localStorage.setItem('bep-local-locked','yes');localStorage.removeItem('bep-voice-lang');localStorage.removeItem('bep-voice-auto');localStorage.setItem('guest/bep-price-scout-v1',JSON.stringify(scout))}
   w.__recs=[];class FakeRec{lang='';n=0;started=false;ended=false;continuous=false;onresult:any;onend:any;onerror:any;constructor(){w.__recs.push(this)}start(){this.started=true}stop(){this.end()}abort(){this.end()}end(){if(this.ended)return;this.ended=true;setTimeout(()=>this.onend&&this.onend(),0)}}
   w.SpeechRecognition=FakeRec;w.webkitSpeechRecognition=FakeRec;
   w.__live=()=>w.__recs.filter((r:any)=>r.started&&!r.ended).pop();
   w.__say=(text:string)=>{const r=w.__live();if(!r)throw Error('no live recogniser');const alt:any=[{transcript:text,confidence:.9}];alt.isFinal=true;const results:any=[];results[r.n]=alt;r.onresult({resultIndex:r.n,results});r.n++};
   // the browser ends a recognition session after a pause; the dictation wrapper must restart it
   w.__pauseEnd=()=>{const r=w.__live();if(r){r.ended=true;r.onend&&r.onend()}};
  },{lang,theme,scout:SCOUT,hold});
  const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route(origin+'/**',async route=>{const url=new URL(route.request().url()),path=url.pathname;
   if(path==='/recipe-catalog-data.js'&&gate.mode!=='serve'){gate.hits++;if(gate.mode==='fail'){await route.abort('failed');return}await gate.wait}
   if(path.startsWith('/.netlify/')){await route.fulfill({status:401,json:{error:'no'}});return}
   if(path==='/startup-scripts.json'){await route.fulfill({json:JSON.parse(readFileSync('dist/startup-scripts.json','utf8'))});return}
   const file=resolve('dist',path==='/'?'index.html':path.slice(1));
   try{await route.fulfill({contentType:mime[extname(file)]||'application/octet-stream',body:readFileSync(file)})}catch{await route.fulfill({status:404,body:'Not found'})}});
  await page.goto(origin+'/#shopping',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof (globalThis as any).voicePriceOpen==='function'&&typeof (globalThis as any).voiceRecipeOpen==='function'&&typeof (globalThis as any).scoutMount==='function'&&document.querySelector('#main h1'),null,{timeout:20000});
  await page.evaluate('closeModal();view="shopping";render()');await page.waitForTimeout(200);
  if(offline){await context.setOffline(true);await page.evaluate('dispatchEvent(new Event("offline"))')}
  return{page,context,errors,gate};
 }
 const recLangs=(page:any)=>page.evaluate(()=>(window as any).__recs.map((r:any)=>r.lang));
 async function check(page:any,label:string,sel:string){
  const overflow=await page.evaluate(()=>Math.max(document.documentElement.scrollWidth-innerWidth,...[...document.querySelectorAll('.modal-content')].map((m:any)=>m.scrollWidth-m.clientWidth)));
  assert.ok(overflow<=1,label+': horizontal overflow '+overflow+'px');
  const small=await page.evaluate((sel:string)=>[...document.querySelectorAll(sel)].filter((e:any)=>e.offsetParent&&e.getBoundingClientRect().height<43.5).map((e:any)=>(e.textContent||e.className||'').trim().slice(0,30)),sel);
  assert.deepEqual(small,[],label+': touch targets under 44px');
  const clipped=await page.evaluate(()=>[...document.querySelectorAll('.voice-lang-toggle,.vp-row-actions .btn,.vp-controls .btn')].filter((e:any)=>e.offsetParent&&e.scrollWidth>e.clientWidth+1).map((e:any)=>e.textContent));
  assert.deepEqual(clipped,[],label+': clipped labels');
  const shownSr=await page.evaluate(()=>[...document.querySelectorAll('.vp-sheet .sr-only,.vr-sheet .sr-only,.price-scout .sr-only')].filter((e:any)=>e.getBoundingClientRect().width>1).length);
  assert.equal(shownSr,0,label+': screen-reader-only text is visually hidden');
 }
 // v1.7.1: the language is a one-tap toggle next to the mic (no collapsed select); sections 1–6 choose tap mode, 7 tests hold.
 const PRICE_TARGETS='.voice-lang-toggle,.vp-controls .btn,.vp-row-actions .btn,.scout-voice-btn';
 const RECIPE_TARGETS='.voice-lang-toggle,.vp-controls .btn,.vr-ing .input,.vr-del,.vr-entry-btn,.vr-steps textarea';
 const shot=async(page:any,name:string)=>{await page.screenshot({path:`${out}/${name}.png`,fullPage:false});shots++};
 const scrollModal=(page:any,sel:string)=>page.evaluate((sel:string)=>document.querySelector(sel)?.scrollIntoView({block:'start'}),sel);
 try{
  // 1. Price Scout: VI, "🎙 Nói giá" opens the sheet, recognition starts in Vietnamese, two prices → two rows,
  //    each confirm opens the existing confirm sheet (source voice, family-only), then the sheet returns.
  for(const[size,lang,theme]of[['mobile','vi','light'],['tablet','en','dark'],['desktop','vi','dark']]as const){
   const {page,context,errors}=await open({viewport:sizes[size],lang,theme});
   const btn=page.locator('.scout-capture [data-scout="voice"]');await btn.scrollIntoViewIfNeeded();assert.equal((await btn.innerText()).trim(),lang==='en'?'Say a price':'Nói giá');assert.equal(await btn.locator('span.emo-art').count(),1,'microphone drawing, not an emoji');
   await check(page,'capture '+size,PRICE_TARGETS);
   await btn.click();await page.waitForSelector('#vp-text');
   assert.deepEqual(await recLangs(page),[lang==='en'?'en-AU':'vi-VN'],'recognition starts in the UI language');
   await page.evaluate((t:string)=>(window as any).__say(t),MULTI);await page.evaluate((t:string)=>(window as any).__say(t),MULTI2);
   await page.waitForSelector('.vp-row');assert.equal(await page.locator('.vp-row').count(),2,'two prices → two rows');
   const row0=await page.locator('.vp-row').nth(0).innerText(),row1=await page.locator('.vp-row').nth(1).innerText();
   assert.match(row0,/Rau muống/);assert.match(row0,/2[.,]50/);assert.match(row0,/Cabramatta/);assert.match(row0,lang==='en'?/per bunch/:/mỗi bó/);
   assert.match(row1,/14[.,]99/);assert.match(row1,/Woolworths/);assert.match(row1,lang==='en'?/Was/:/Trước/);assert.match(row1,/18[.,]00/);
   await page.locator('[data-vp="mic"]').click();await page.waitForTimeout(30);
   await check(page,'sheet '+size,PRICE_TARGETS);await shot(page,`price-sheet-${lang}-${theme}-${size}`);
   await page.locator('[data-vp="confirm"]').first().click();await page.waitForSelector('#scout-obs-form');
   const f=await page.evaluate(()=>{const f=document.getElementById('scout-obs-form') as any;return{item:f.itemId.value,price:f.price.value,retailer:f.retailer.value,pack:f.packQty.value,unit:f.packUnit.value,note:f.note.value,was:f.wasPrice.value}});
   assert.deepEqual([f.item,f.price,f.retailer,f.pack,f.unit],['rau-muong','2.5','viet-grocer','',''],'prefilled; no invented pack size');
   assert.match(f.note,lang==='en'?/per bunch.*Branch: Cabramatta/:/mỗi bó.*Chi nhánh: Cabramatta/);
   assert.match(await page.locator('#scout-obs-form details summary').innerText(),lang==='en'?/What you said/:/Lời nói/);
   if(size==='mobile'){await check(page,'confirm '+size,'.modal-footer .btn');await shot(page,`price-confirm-${lang}-${theme}-${size}`)}
   await page.locator('.modal-footer .btn.primary').click();await page.waitForSelector('.vp-row');
   assert.equal(await page.locator('.vp-row').count(),1,'sheet returns with the remaining row');
   const saved=await page.evaluate('scoutData.local[0]');
   assert.equal(saved.source,'voice');assert.equal(saved.evidence.type,'manual-voice');assert.equal(saved.visibility,'family');assert.equal(saved.packQty,null);assert.equal(saved.itemId,'rau-muong');
   assert.equal(await page.evaluate('PriceScout.canShareToCommunity(scoutData.local[0])'),false,'voice-only price is not community-shareable');
   await page.locator('[data-vp="confirm"]').first().click();await page.waitForSelector('#scout-obs-form');
   const f2=await page.evaluate(()=>{const f=document.getElementById('scout-obs-form') as any;return[f.itemId.value,f.price.value,f.retailer.value,f.packQty.value,f.packUnit.value,f.wasPrice.value,f.promo.value]});
   assert.deepEqual(f2,['thit-ba-chi','14.99','woolworths','1','kg','18','special']);
   assert.equal(await page.locator('#scout-sanity').isVisible(),false,'a normal price raises no sanity warning');
   await page.locator('.modal-footer .btn.primary').click();await page.waitForTimeout(150);
   assert.equal(await page.evaluate('scoutData.local.filter(o=>o.source==="voice").length'),2);
   assert.equal(await page.evaluate('learned=JSON.parse(localStorage.getItem("bep-voice-price-learned")||"{}");learned["rau muong"]'),'rau-muong','label learned for next time');
   assert.deepEqual(errors,[]);await context.close();
  }
  // 2. Price sanity applies to spoken prices; "Cần săn giá" rows carry a voice button that prefills the item.
  {const {page,context,errors}=await open({viewport:sizes.desktop});
   await page.evaluate('voicePriceOpen()');await page.evaluate(()=>(window as any).__say('thịt ba chỉ hai đô một ký ở Coles'));
   await page.locator('[data-vp="confirm"]').first().click();await page.waitForSelector('#scout-obs-form');
   assert.equal(await page.locator('#scout-sanity').isVisible(),true,'unusual spoken price → sanity warning');assert.match(await page.locator('#scout-sanity').innerText(),/khác thường/);
   await page.locator('[data-action="close-modal"]').first().click();
   const html=await page.evaluate(`scoutWantedRow({item:scoutItem('rau-muong'),missing:['woolworths','coles'],count:2,none:true})`);
   assert.match(html,/data-scout="voice" data-want="rau-muong"/,'wanted rows have a voice button');
   await page.evaluate(`document.body.insertAdjacentHTML('beforeend','<ul id="qa-want">'+${JSON.stringify(html)}+'</ul>')`);
   await page.locator('#qa-want [data-scout="voice"]').click();await page.waitForSelector('#vp-text');
   assert.match(await page.locator('.vp-sheet .hint').first().innerText(),/Rau muống/);
   await page.evaluate(()=>(window as any).__say('ba đô rưỡi ở Coles'));await page.waitForSelector('.vp-row');
   await page.locator('[data-vp="confirm"]').click();await page.waitForSelector('#scout-obs-form');
   assert.deepEqual(await page.evaluate(()=>{const f=document.getElementById('scout-obs-form') as any;return[f.itemId.value,f.price.value,f.retailer.value]}),['rau-muong','3.5','coles'],'wanted item prefilled');
   assert.deepEqual(errors,[]);await context.close()}
  // 3. Language toggle restarts recognition in the chosen language and remembers it (same convention as voice input).
  {const {page,context}=await open({lang:'en'});await page.evaluate('voicePriceOpen()');
   assert.deepEqual(await recLangs(page),['en-AU']);
   // v1.7.1: one visible VI/EN toggle next to the mic; one tap switches and restarts recognition.
   const tg=page.locator('.vp-controls .voice-lang-toggle');assert.equal(await tg.isVisible(),true);assert.equal(await tg.getAttribute('data-lang-current'),'en-AU');assert.match(await tg.innerText(),/Auto/);
   assert.equal(await page.locator('.vp-sheet select, .vt-lang-settings').count(),0,'no select / hidden panel');
   await tg.click();await page.waitForTimeout(50);
   const st=await page.evaluate(()=>(window as any).__recs.map((r:any)=>[r.lang,r.ended]));assert.deepEqual(st,[['en-AU',true],['vi-VN',false]]);
   assert.deepEqual(await page.evaluate(()=>[localStorage.getItem('bep-voice-lang'),localStorage.getItem('bep-voice-auto')]),['vi-VN','0']);
   assert.equal(await page.locator('.vp-controls .voice-lang-toggle').getAttribute('data-lang-current'),'vi-VN');
   await page.evaluate('closeModal();voiceRecipeOpen()');assert.equal(await page.locator('.vr-sheet .voice-lang-toggle').getAttribute('data-lang-current'),'vi-VN','the recipe sheet follows the same choice');
   await page.locator('.vr-sheet .voice-lang-toggle').click();assert.equal(await page.locator('.vr-sheet .voice-lang-toggle').getAttribute('data-lang-current'),'en-AU');assert.equal(await page.evaluate(()=>localStorage.getItem('bep-voice-lang')),'en-AU');
   await context.close()}
  // 4. Offline: no recogniser is started; typing still works and rows still open the confirm sheet.
  for(const[lang,theme]of[['en','light'],['vi','dark']]as const){const {page,context,errors}=await open({lang,theme,offline:true});
   await page.evaluate('voicePriceOpen()');assert.equal((await recLangs(page)).length,0,'offline: no recognition');
   assert.match(await page.locator('#vp-state').innerText(),lang==='en'?/Offline/:/offline/);
   await page.fill('#vp-text','eggs twelve pack six dollars fifty at Aldi Bankstown');await page.locator('[data-vp="read"]').click();
   await page.waitForSelector('.vp-row');assert.match(await page.locator('.vp-row').innerText(),/6[.,]50/);
   await check(page,'offline '+lang,PRICE_TARGETS);await shot(page,`price-offline-${lang}-${theme}-mobile`);
   assert.deepEqual(errors,[]);await context.close()}
  // 5. Recipe dictation: two takes (pause / continue, browser pauses restart the recogniser), review, edit, fill the form, save as a NEW family recipe.
  for(const[size,lang,theme]of[['mobile','vi','light'],['tablet','en','dark'],['desktop','vi','dark']]as const){
   const {page,context,errors}=await open({viewport:sizes[size],lang,theme});
   // an existing family recipe with the same name must never be overwritten
   await page.evaluate(`state.recipes.push({id:'qa-own-canh',name:'Canh chua cá lóc',category:'soup',protein:'fish',time:30,servings:4,yield:4,purposes:['side'],ingredients:[{id:'fish',qty:400}],missingIngredients:[],prep:'',steps:['Nấu theo cách nhà mình.'],custom:true,origin:'family',favorite:false});save()`);
   const before=await page.evaluate('JSON.stringify(state.recipes.find(r=>r.id==="qa-own-canh"))'),count0=await page.evaluate('state.recipes.length');
   await page.evaluate('familyRecipeEditor()');await page.waitForSelector('#family-recipe-form [data-vr="open"]');
   await check(page,'recipe form '+size,'.vr-entry-btn');
   await page.locator('[data-vr="open"]').click();await page.waitForSelector('#vr-text');
   assert.equal((await recLangs(page)).length,0,'dictation waits for the tap');
   await page.locator('#vr-mic').click();assert.deepEqual(await recLangs(page),[lang==='en'?'en-AU':'vi-VN']);
   const t1=lang==='en'?RECIPE_EN.split('. Slice')[0]+'.':RECIPE1,t2=lang==='en'?'Slice'+RECIPE_EN.split('. Slice')[1]:RECIPE2;
   await page.evaluate((t:string)=>(window as any).__say(t),t1);
   await page.evaluate(()=>(window as any).__pauseEnd());await page.waitForTimeout(400);assert.equal((await recLangs(page)).length,2,'a browser pause restarts recognition while dictating');
   await page.locator('#vr-mic').click();await page.waitForTimeout(30);assert.match(await page.locator('#vr-state').innerText(),lang==='en'?/Paused/:/tạm dừng/i);
   assert.equal(await page.evaluate('JSON.parse(familyStorage.getItem("bep-recipe-dictation-v1")).takes'),1,'draft kept on this device between takes');
   await page.locator('#vr-mic').click();assert.match(await page.locator('#vr-takes').innerText(),/2/);
   await page.evaluate((t:string)=>(window as any).__say(t),t2);await page.locator('#vr-mic').click();
   assert.match(await page.inputValue('#vr-text'),/\n/,'each take starts on a new line');
   await page.locator('[data-vr="review"]').click();await page.waitForSelector('#vr-title');
   const title=await page.inputValue('#vr-title');assert.equal(title,lang==='en'?'Beef stir fry':'Canh chua cá lóc');
   assert.equal(await page.inputValue('#vr-servings'),lang==='en'?'2':'4');
   if(lang==='vi'){assert.equal(await page.inputValue('#vr-time'),'45');assert.match(await page.locator('.vr-dup').innerText(),/món MỚI/,'duplicate warned')}
   const needs=await page.locator('.vr-need').count();assert.ok(needs>=(lang==='en'?2:2),'unclear amounts flagged');
   const qtys=await page.evaluate(()=>[...document.querySelectorAll('.vr-ing')].map((li:any)=>[li.querySelector('.vr-ing-name').value,li.querySelector('.vr-ing-qty').value]));
   if(lang==='vi'){assert.deepEqual(qtys.find((q:any)=>q[0]==='Me chua'),['Me chua',''],'"một ít" stays blank');assert.deepEqual(qtys.find((q:any)=>q[0]==='Bạc hà'),['Bạc hà','200'])}
   else{assert.deepEqual(qtys.find((q:any)=>q[0]==='Soy sauce'),['Soy sauce','']);assert.deepEqual(qtys.find((q:any)=>q[0]==='Beef'),['Beef','300'])}
   assert.ok(await page.locator('.vr-steps textarea').count()>=3);
   assert.equal(await page.locator('.vr-raw').count(),1);
   await check(page,'review '+size,RECIPE_TARGETS);
   await scrollModal(page,'.vr-review');await shot(page,`recipe-review-${lang}-${theme}-${size}`);
   // edit in review: fill one blank amount
   const blankRow=page.locator('.vr-ing').filter({has:page.locator(`.vr-ing-name[value="${lang==='en'?'Soy sauce':'Đường'}"]`)});
   await blankRow.locator('.vr-ing-qty').fill('10');await blankRow.locator('.vr-ing-unit').fill('g');
   await page.locator('#vr-use').click();await page.waitForSelector('#family-recipe-form .vr-form-note');
   const form=await page.evaluate(()=>{const f=document.getElementById('family-recipe-form') as any;return{name:f.name.value,yield:f.yield.value,ing:f.ingredients.value,steps:f.steps.value,tr:f.transcript.value,d:f.dataset.dictated}});
   assert.equal(form.d,'yes');assert.equal(form.name,title);assert.match(form.tr,/\n/);
   if(lang==='vi'){assert.match(form.ing,/Bạc hà \| 200 \| g/);assert.match(form.ing,/Đường \| 10 \| g/);assert.match(form.ing,/^Me chua$/m);assert.match(form.ing,/Nước mắm \(2 muỗng canh\)/);assert.match(form.steps,/^Làm sạch cá$/m)}
   else{assert.match(form.ing,/Beef \| 300 \| g/);assert.match(form.ing,/Soy sauce \| 10 \| g/);assert.match(form.steps,/^Heat the wok$/m)}
   if(size==='mobile'){await check(page,'filled form '+size,'.vr-entry-btn,.modal-footer .btn');await shot(page,`recipe-form-${lang}-${theme}-${size}`)}
   await page.locator('.modal-footer .btn.primary').click();await page.waitForTimeout(200);
   assert.equal(await page.evaluate('state.recipes.length'),count0+1,'saved as one new recipe');
   assert.equal(await page.evaluate('JSON.stringify(state.recipes.find(r=>r.id==="qa-own-canh"))'),before,'existing family recipe untouched');
   const saved=await page.evaluate(`(()=>{const r=state.recipes[state.recipes.length-1];return{name:r.name,origin:r.origin,custom:r.custom,tr:r.transcript,missing:r.missingIngredients,ing:r.ingredients.length,named:r.ingredients.map(i=>[INGREDIENTS[i.id][0],i.qty,INGREDIENTS[i.id][1]]),steps:r.steps}})()`);
   assert.equal(saved.origin,'family');assert.equal(saved.custom,true);assert.equal(saved.name,title);assert.ok(saved.tr.length>50,'raw transcript attached');
   assert.ok(saved.ing>=2,'measured ingredients saved');
   // v1.7.5: an amount with no number stays missing (never guessed); a kitchen unit with a number (“2 cloves garlic”) is
   // counted as written — 2 tép, never converted to grams
   if(lang==='vi')assert.ok(saved.missing.length>=1,'unclear amounts saved as missing, not guessed');
   else assert.ok(saved.named.some((x:any)=>/garlic|tỏi/i.test(x[0])&&x[1]===2&&x[2]==='tép')||saved.missing.some((m:string)=>/garlic/i.test(m)),'garlic kept as 2 cloves, never converted: '+JSON.stringify(saved.named)+' '+JSON.stringify(saved.missing));
   if(lang==='vi')assert.ok(saved.missing.some((m:string)=>/Me chua/.test(m)));
   assert.equal(await page.evaluate('familyStorage.getItem("bep-recipe-dictation-v1")'),null,'draft cleared after saving');
   await page.evaluate(`showRecipe(state.recipes[state.recipes.length-1].id)`);await page.waitForSelector('.modal-content .vr-raw');
   assert.match(await page.locator('.modal-content .vr-raw summary').innerText(),lang==='en'?/Original transcript/:/Lời đọc gốc/);
   assert.deepEqual(errors,[]);await context.close();
  }
  // 6. Typed recipe (no microphone at all) + offline.
  {const {page,context,errors}=await open({offline:true});await page.evaluate('voiceRecipeOpen()');
   assert.match(await page.locator('#vr-state').innerText(),/offline/);
   await page.fill('#vr-text','Món trứng chiên, cho hai người. Nguyên liệu: ba quả trứng, hành lá, nước mắm. Đập trứng ra tô rồi đánh đều, sau đó chiên vàng.');
   await page.locator('[data-vr="review"]').click();assert.equal(await page.inputValue('#vr-title'),'Trứng chiên');assert.equal(await page.locator('.vr-steps textarea').count(),3);
   assert.equal((await recLangs(page)).length,0);assert.deepEqual(errors,[]);await context.close()}
 // 7. v1.7.1 hold to talk (default) in the price and recipe sheets: no auto-start, hold listens, release stops and
  //    keeps the last words (a normal stop no longer drops the final result), a quick tap only hints.
  // 8. v1.7.4: the recipe library is still loading on a fresh start (its first request failed, the retry is slow).
  //    "Use this" waits with "Đang tải kho món ăn…", then the form holds the dictated name, servings, every
  //    ingredient exactly as recognised (rows too), the steps and the transcript; v1.7.3 opened an empty form.
  {const lout='docs/reviews/v1.7.4/voice-recipe-loading';mkdirSync(lout,{recursive:true});
   for(const[size,lang,theme]of[['mobile','vi','light'],['tablet','en','dark'],['desktop','vi','light']]as const){
    const {page,context,errors,gate}=await open({viewport:sizes[size],lang,theme,gated:true});
    assert.equal(await page.evaluate('catalogLoaded()'),false,'fresh start: library not loaded');
    await page.evaluate('familyRecipeEditor()');await page.waitForSelector('#family-recipe-form [data-vr="open"]');
    gate.mode='hold';const hits=gate.hits;
    await page.locator('[data-vr="open"]').click();await page.waitForSelector('#vr-text');
    await page.locator('#vr-mic').click();
    await page.evaluate((t:string)=>(window as any).__say(t),lang==='en'?RECIPE_EN:RECIPE1+' '+RECIPE2);await page.locator('#vr-mic').click();
    await page.locator('[data-vr="review"]').click();await page.waitForSelector('#vr-title');
    const want=await page.evaluate(()=>{const c=(globalThis as any).vrCollect();return{title:c.title,servings:String(c.servings),ing:c.ingredients.map((globalThis as any).VoiceRecipe.formLine).filter(Boolean).join('\n'),steps:c.steps.join('\n')}});
    assert.ok(want.ing.split('\n').length>=4&&want.steps.split('\n').length>=2,'dictation recognised');
    assert.equal(await page.evaluate('catalogLoaded()'),false,'library still loading');
    await page.locator('#vr-use').click();await page.waitForTimeout(500);
    assert.ok(gate.hits>hits,'the library is being fetched again');
    const use=page.locator('#vr-use');assert.equal(await use.isDisabled(),true,'Use waits');assert.match(await use.innerText(),lang==='en'?/Loading the recipe library/:/Đang tải kho món ăn/);
    assert.equal(await page.locator('#family-recipe-form').count(),0,'form waits for the library');
    await use.click({force:true});assert.equal(await page.locator('#vr-review').count(),1,'a second tap does nothing');
    await check(page,'loading '+size,'#vr-use,.modal-footer .btn');
    await page.evaluate(()=>{const t=document.querySelector('#toast');if(t)t.className=''});await page.locator('#vr-use').scrollIntoViewIfNeeded();
    await page.screenshot({path:`${lout}/${size}-loading-${lang}-${theme}.jpg`,type:'jpeg',quality:70});
    gate.release();await page.waitForSelector('#family-recipe-form .vr-form-note',{timeout:10000});
    assert.equal(await page.evaluate('catalogLoaded()'),true);await page.waitForTimeout(100);
    const form=await page.evaluate(()=>{const f=document.getElementById('family-recipe-form') as any;return{name:f.name.value,yield:f.yield.value,ing:f.ingredients.value,steps:f.steps.value,tr:f.transcript.value,d:f.dataset.dictated,
     rows:[...f.querySelectorAll('#rc-ing-list .rc-ing-row')].map((li:any)=>[li.querySelector('.rc-ing-name-input').value,li.querySelector('.rc-ing-qty').value,li.querySelector('.rc-ing-unit').value])}});
    assert.equal(form.d,'yes');assert.equal(form.name,want.title);assert.equal(form.yield,want.servings);assert.equal(form.ing,want.ing,'ingredients exactly as recognised');assert.equal(form.steps,want.steps);assert.ok(form.tr.length>50,'transcript kept');
    assert.equal(form.rows.length,want.ing.split('\n').length,'one ingredient row per dictated line');
    if(lang==='vi'){assert.deepEqual(form.rows.find((r:any)=>r[0]==='Bạc hà'),['Bạc hà','200','g']);assert.equal(form.rows.find((r:any)=>r[0]==='Me chua')?.[1],'','no amount invented')}
    else{assert.deepEqual(form.rows.find((r:any)=>r[0]==='Beef'),['Beef','300','g']);assert.equal(form.rows.find((r:any)=>r[0]==='Soy sauce')?.[1],'','no amount invented')}
    assert.match(await page.locator('#family-recipe-form .vr-form-note').innerText(),lang==='en'?/Filled from your dictation/:/Đã điền từ lời đọc/);
    await check(page,'filled after loading '+size,'.modal-footer .btn');
    await page.evaluate(()=>{const t=document.querySelector('#toast');if(t)t.className='';document.querySelector('#family-recipe-form .vr-form-note')?.scrollIntoView({block:'start'})});
    await page.screenshot({path:`${lout}/${size}-filled-${lang}-${theme}.jpg`,type:'jpeg',quality:70});
    await page.evaluate(()=>document.querySelector('#family-recipe-form #rc-ing-list')?.scrollIntoView({block:'start'}));await page.screenshot({path:`${lout}/${size}-filled-rows-${lang}-${theme}.jpg`,type:'jpeg',quality:70});
    const own0=await page.evaluate('state.recipes.filter(r=>ownRecipe(r)).length');
    await page.locator('.modal-footer .btn.primary').click();await page.waitForFunction(()=>!document.querySelector('#family-recipe-form'),null,{timeout:5000});
    const saved=await page.evaluate(`(()=>{const r=state.recipes.filter(x=>ownRecipe(x)&&x.name===${JSON.stringify(want.title)}).at(-1);return{n:r.ingredients.length+(r.missingIngredients||[]).length,missing:r.missingIngredients||[],tr:r.transcript}})()`);
    assert.equal(await page.evaluate('state.recipes.filter(r=>ownRecipe(r)).length'),own0+1,'saved as one new family recipe');assert.equal(saved.n,want.ing.split('\n').length,'every dictated line saved');
    assert.ok(saved.missing.some((m:string)=>lang==='en'?/^Soy sauce$/.test(m):/^Me chua$/.test(m)),'line without amount saved as missing, not guessed');
    assert.deepEqual(errors,[]);await context.close()}}
  {const {page,context,errors}=await open({lang:'vi',hold:true});await page.evaluate('voicePriceOpen()');
   assert.equal((await recLangs(page)).length,0,'hold mode: the price sheet does not start listening by itself');
   const mic=page.locator('#vp-mic');assert.equal(await mic.getAttribute('data-hold-mic'),'vp');assert.match(await mic.innerText(),/Giữ để nói/);
   await page.evaluate(()=>{const w=window as any;const P=w.SpeechRecognition.prototype;P.stop=function(){if(this.ended)return;const r=this;setTimeout(()=>{const alt:any=[{transcript:'rau muống hai đô rưỡi một bó',confidence:.9}];alt.isFinal=true;const res:any=[];res[r.n]=alt;r.onresult&&r.onresult({resultIndex:r.n,results:res});r.n++;r.end()},20)}});
   const b=await mic.boundingBox();if(!b)throw Error('no box');await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.waitForTimeout(300);
   assert.equal(await page.evaluate(()=>!!(window as any).__live()),true,'held: listening');assert.match(await mic.innerText(),/thả ra/);
   await check(page,'price hold',PRICE_TARGETS);await page.screenshot({path:'docs/reviews/v1.7.1/voice-settings/price-hold-vi-light-mobile.jpg',type:'jpeg',quality:70});
   await page.mouse.up();await page.waitForSelector('.vp-row',{timeout:2000});assert.match(await page.locator('.vp-row').first().innerText(),/Rau muống/,'the words delivered after stop() are kept');
   {const b2=await mic.boundingBox();if(!b2)throw Error('no box');await page.mouse.move(b2.x+b2.width/2,b2.y+b2.height/2)}await page.mouse.down();await page.waitForTimeout(50);await page.mouse.up();await page.waitForTimeout(80);assert.match(await page.locator('.vp-sheet .voice-hold-hint').innerText(),/Giữ nút để nói/,'quick tap → hint');
   await page.evaluate('closeModal();voiceRecipeOpen()');const vr=page.locator('#vr-mic');assert.equal(await vr.getAttribute('data-hold-mic'),'vr');
   const n=(await recLangs(page)).length;const rb=await vr.boundingBox();if(!rb)throw Error('no box');await page.mouse.move(rb.x+rb.width/2,rb.y+rb.height/2);await page.mouse.down();await page.waitForTimeout(300);
   assert.equal((await recLangs(page)).length,n+1,'recipe: hold starts a take');await page.mouse.up();await page.waitForTimeout(150);assert.match(await page.inputValue('#vr-text'),/rau muống/,'recipe: last words kept on release');
   assert.deepEqual(errors,[]);await context.close()}
 }finally{await browser.close()}
 console.log(`PASS voice price + recipe dictation browser QA (incl. v1.7.1 VI/EN toggle and hold to talk) (${shots} screenshots in ${out})`);
}
main().catch(e=>{console.error(e);process.exit(1)});
