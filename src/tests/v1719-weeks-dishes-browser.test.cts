// v1.7.19 audit fixes — weeks, dishes and recipes, pantry entry, empty and misleading states (owner, 12 Nov 2026, Sydney time).
// Henry: the first day of the week is a family choice (each family shops on a different day) — never assume Monday. Every family
// here starts its week on Saturday or Sunday:
//  • B1 guests from the guest sheet reach the meal the menu shows (no hidden copy); B2 global search finds tonight's dish; voice undo
//    puts list lines back (EN) and the pantry back (VI); C8 receipt undo is covered in week-start.test.
//  • A7 Đi chợ with nothing planned says so and offers the menu; A16 Tủ counts equal what is listed; A13 dish × and “Bỏ hết món” undo;
//    A14 / B14 a dish typed only into a meal: every sheet button works or is not shown; cooking mode shows the meal's amounts;
//    A15 / B10 / C25 pantry entry: nothing chosen for the family, one place / use-by rule, voice keeps lots and use-by dates;
//    A21 every meal reachable in “Thêm vào bữa ăn”; A22 no silent dish role; A23 staples-only pantry explained; A24 no silent sender;
//    A19 / A20 receipt sheet entry points; B23 / B11 a page import opens for review and keeps spoons as written.
// 320×740, 375×812, 820×1100, 1280×800 in light and dark, VI and EN, a phone time zone other than Sydney on two runs.
// Chromium viewport simulation, not physical devices. Every run ends with validImport(state) true.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const origin='https://kitchen.test',out='docs/reviews/v1.7.19/weeks-dishes';mkdirSync(out,{recursive:true});
const mime:any={'.js':'application/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'};
const RUNS=[
 {w:320,h:740,lang:'vi',theme:'light',start:6,tz:'Australia/Sydney'},{w:375,h:812,lang:'vi',theme:'dark',start:0,tz:'Asia/Ho_Chi_Minh'},
 {w:820,h:1100,lang:'vi',theme:'light',start:0,tz:'Australia/Sydney'},{w:1280,h:800,lang:'en',theme:'light',start:6,tz:'Australia/Sydney'},
 {w:375,h:812,lang:'en',theme:'light',start:0,tz:'America/Los_Angeles'},{w:320,h:740,lang:'en',theme:'dark',start:6,tz:'Australia/Sydney'},
 {w:820,h:1100,lang:'en',theme:'dark',start:6,tz:'Australia/Sydney'},{w:1280,h:800,lang:'vi',theme:'dark',start:0,tz:'Australia/Sydney'},
];
(async()=>{
 const browser=await chromium.launch(process.env.BEP_CHROMIUM?{executablePath:process.env.BEP_CHROMIUM}:{});let checks=0;
 try{
  for(const run of RUNS){const {lang,theme,start}=run,en=lang==='en',label=`${run.w}×${run.h} ${lang} ${theme} start=${start}`,L=(vi:string,e:string)=>en?e:vi;
   const context=await browser.newContext({locale:'vi-VN',viewport:{width:run.w,height:run.h},serviceWorkers:'block',reducedMotion:'reduce',colorScheme:theme as any,timezoneId:run.tz});
   await context.addInitScript(({lang,theme}:any)=>{const w=window as any;if(!sessionStorage.getItem('qa-init')){sessionStorage.setItem('qa-init','1');localStorage.setItem('bep-local-locked','yes');localStorage.setItem('guest/bep-language',lang);localStorage.setItem('bep-theme-mode',theme);localStorage.setItem('bep-voice-ptt-v171','1');localStorage.setItem('bep-voice-ptt','0')}
    w.__recs=[];class FakeRec{lang='';n=0;started=false;ended=false;continuous:any;onresult:any;onend:any;onerror:any;constructor(){w.__recs.push(this)}start(){this.started=true}stop(){this.end()}abort(){this.end()}end(){if(this.ended)return;this.ended=true;setTimeout(()=>this.onend&&this.onend(),0)}}
    w.SpeechRecognition=FakeRec;w.webkitSpeechRecognition=FakeRec;w.__live=()=>w.__recs.filter((r:any)=>r.started&&!r.ended).pop();
    w.__say=(text:string)=>{const r=w.__live();if(!r)throw Error('no live recogniser');const alt:any=[{transcript:text,confidence:.9}];alt.isFinal=true;const results:any=[];results[r.n]=alt;r.onresult({resultIndex:r.n,results});r.n++};
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{getVoices:()=>[],speak(u:any){setTimeout(()=>u.onend&&u.onend(),5)},cancel(){},addEventListener(){}}});
    Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>({getTracks:()=>[{stop(){}}]})}});
    w.AudioContext=class{createMediaStreamSource(){return{connect(){}}}createAnalyser(){return{fftSize:512,getByteTimeDomainData(a:Uint8Array){a.fill(128)}}}close(){}};
   },{lang,theme});
   const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route(origin+'/**',async(r:any)=>{const u=new URL(r.request().url());if(u.pathname.startsWith('/.netlify/'))return r.fulfill({status:401,json:{error:'no'}});if(u.pathname==='/startup-scripts.json')return r.fulfill({json:JSON.parse(readFileSync('dist/startup-scripts.json','utf8'))});const f=resolve('dist',u.pathname==='/'?'index.html':u.pathname.slice(1));try{await r.fulfill({contentType:mime[extname(f)]||'application/octet-stream',body:readFileSync(f)})}catch{await r.fulfill({status:404,body:''})}});
   await page.goto(origin+'/#today',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#main h1')&&typeof (globalThis as any).familyRecipeEditor==='function',null,{timeout:20000});
   const E=(s:string)=>page.evaluate(s) as Promise<any>;const shot=(n:string)=>page.screenshot({path:`${out}/${n}-${lang}-${theme}-${run.w}x${run.h}.png`});
   const ok=(c:any,m:string)=>{assert.ok(c,`${label}: ${m}`);checks++};
   const noOverflow=async(where:string)=>{const o=await E(`(()=>{const m=document.querySelector('#modal-root .modal-content');return{page:document.documentElement.scrollWidth-innerWidth,sheet:m?m.scrollWidth-m.clientWidth:0}})()`);ok(o.page<=1&&o.sheet<=1,`${where}: no sideways scroll ${JSON.stringify(o)}`)};
   const toastText=()=>E(`document.querySelector('#toast')?.textContent||''`);
   const go=async(v:string)=>{await E(`(()=>{closeModal();view='${v}';location.hash='${v}';render();scrollTo(0,0)})()`);await page.waitForTimeout(120)};
   const allMonday=`Object.keys(state.weeks).every(k=>monday(k)===k)`;
   await E(`(()=>{state.preferences.onboardingComplete=true;state.preferences.weekStartDay=${start};state.members=[['m-ba','Ba',1],['m-me','Mẹ',1]].map(([id,name,weight])=>({id,name,weight,emoji:''}));state.pantry=[];selectedDate=sydneyDate();weekStart=planStartOf(state,selectedDate);attendanceType='dinner';closeModal();save();render()})()`);
   const today=await E('sydneyDate()');ok(await E(`parseDate(weekStart).getDay()===${start}`),'the menu week starts on the family day');

   // ── A7: nothing planned → the list says so and offers the menu ─────────────────────────────────────────────────────────────
   await E(`(()=>{for(const d of Object.values(currentWeek().days))for(const t of MEAL_TYPES)if(d[t])d[t].recipes=[];save()})()`);await go('shopping');
   const empty=await E(`(()=>{const c=document.querySelector('#main .shop-nothing-planned');return{c:!!c,text:c?.textContent||'',link:c?.querySelector('a[href="#planner"]')?.getBoundingClientRect().height||0,enough:/đã đủ nguyên liệu|already have everything/i.test(document.querySelector('#main').textContent)}})()`);
   ok(empty.c&&!empty.enough,`A7: no “đã đủ” when nothing is planned ${JSON.stringify(empty)}`);ok(new RegExp(L('Chưa có món nào','No dishes planned')).test(empty.text),'A7: says nothing is planned');ok(empty.link>=44,'A7: a ≥ 44 px way to the menu');
   await noOverflow('A7');await E(`document.querySelector('#main .shop-nothing-planned').scrollIntoView({block:'center'})`);await shot('a7-shopping-nothing-planned');
   await page.locator('#main .shop-nothing-planned a[href="#planner"]').click();await page.waitForTimeout(150);ok(await E(`view==='planner'`),'A7: the button opens the weekly menu');

   // ── B1 guests and B2 search, on a week that starts on Saturday / Sunday ───────────────────────────────────────────────────────
   await E(`(()=>{const r=clone(state.recipes.find(x=>x.ingredients?.length>1&&x.steps?.length));r.name='Món QA tuần riêng';const m=dayAt(state,sydneyDate()).dinner;m.recipes=[r];m.attendance={'m-ba':'home','m-me':'home'};m.servings=null;save();render()})()`);
   const servings0=await E(`mealServings(currentWeek().days[sydneyDate()].dinner,state)`);
   await go('today');await E(`guestSheet(sydneyDate(),'dinner')`);await page.locator('#modal-root [data-guest-name="0"]').waitFor();
   await page.locator('#modal-root [data-fm="guest-step"][data-i="0"][data-k="adults"][data-d="1"]').click();await page.locator('#modal-root [data-fm="guest-step"][data-i="0"][data-k="adults"][data-d="1"]').click();
   await page.fill('#modal-root [data-guest-name="0"]','Cô Lan QA');await page.locator('#modal-root [data-fm="guests-save"]').click();await page.waitForTimeout(200);
   const g=await E(`(()=>({keys:${allMonday},menu:mealServings(currentWeek().days[sydneyDate()].dinner,state),add:guestServings(dayAt(state,sydneyDate()).dinner),names:guestGroups(dayAt(state,sydneyDate()).dinner).map(x=>x.name)}))()`);
   ok(g.keys,'B1: no hidden copy of the week is created');ok(g.names.includes('Cô Lan QA'),'B1: the guest is on the meal the menu shows');ok(servings0===2&&g.add>=2&&Math.abs(g.menu-(servings0+g.add))<1e-6,`B1: the guests' portions count on the menu's meal (${servings0} + ${g.add} → ${g.menu})`);
   const hits=await E(`searchHits('Món QA tuần riêng').filter(h=>h.g==='planned'||/QA tuần riêng/.test(h.title)).map(h=>h.sub)`);
   ok(hits.some((s:string)=>new RegExp(L('hôm nay','today')).test(s)),`B2: global search finds tonight's dish ${JSON.stringify(hits)}`);

   // ── voice undo with the family's week (EN: list lines; VI: the pantry keeps its lots — B10) ────────────────────────────────────
   if(en){await E(`(()=>{const w=currentWeek();w.extras=w.extras.filter(e=>e.id!=='qa-egg');w.extras.push({id:'qa-egg',name:'Trứng',nameEn:'Eggs',qty:'10 quả',cost:0,currency:'AUD',costKnown:false,costUnknown:true,done:false,ingredient:'egg'});save();closeModal();voiceModal()})()`);
    await page.waitForSelector('#voice-text');await page.evaluate(()=>(window as any).__say('mark eggs bought'));await E('previewVoice()');await page.waitForSelector('.voice-card');
    await page.locator('[data-vc="confirm"]').click();await page.waitForSelector('#voice-cmd-undo');
    ok(await E(`currentWeek().extras.find(e=>e.id==='qa-egg').done===true`),'voice: eggs marked bought');
    await page.locator('#voice-cmd-undo').click();await page.waitForTimeout(150);
    ok(await E(`currentWeek().extras.find(e=>e.id==='qa-egg').done===false`),'B2: voice undo finds the list line in the family week');ok(!errors.length,'voice undo: no error '+errors.join(' | '))}
   else{await E(`(()=>{state.pantry=[{id:'qa-lot',ingredient:'egg',qty:10,place:'fridge',expiry:addDays(sydneyDate(),9)}];save();closeModal();voiceModal()})()`);
    await page.waitForSelector('#voice-text');await page.evaluate(()=>(window as any).__say('tủ còn 4 quả trứng'));await E('previewVoice()');await page.waitForSelector('.voice-card[data-type="pantry"]');
    await page.locator('[data-vc="confirm"]').click();await page.waitForSelector('#voice-cmd-undo');
    const lots=await E(`state.pantry.filter(p=>p.ingredient==='egg').map(p=>({id:p.id,qty:p.qty,expiry:p.expiry}))`);
    ok(lots.length===1&&lots[0].id==='qa-lot'&&lots[0].qty===4&&lots[0].expiry===await E(`addDays(sydneyDate(),9)`),`B10: voice adjusts the lot and keeps its use-by ${JSON.stringify(lots)}`);
    await page.locator('#voice-cmd-undo').click();await page.waitForTimeout(150);
    ok(await E(`state.pantry.filter(p=>p.ingredient==='egg').map(p=>p.qty).join()==='10'`),'voice undo restores the lot');ok(!errors.length,'voice: no error '+errors.join(' | '))}
   // more than the lots hold → a new lot with the shared suggestion; the old lot keeps its date
   const vb=await E(`(()=>{state.pantry=[{id:'old',ingredient:'egg',qty:4,place:'fridge',expiry:addDays(sydneyDate(),2)}];VoicePantry.setTotal('egg',10,VoicePantry.baseQty('egg',10,'quả'));const l=state.pantry.filter(p=>p.ingredient==='egg');return{n:l.length,old:l.find(p=>p.id==='old'),add:l.find(p=>p.id!=='old'),sug:pantryLotDefaults(state,'egg')}})()`);
   ok(vb.n===2&&vb.old.qty===4&&vb.old.expiry===await E(`addDays(sydneyDate(),2)`)&&vb.add.qty===6&&vb.add.place===vb.sug.place&&vb.add.expiry===vb.sug.expiry,`B10: a larger amount adds a lot with the shared place and use-by ${JSON.stringify(vb)}`);
   await E(`closeModal()`);

   // ── A13: dish × and “Bỏ hết món” can be undone; the page stays still ──────────────────────────────────────────────────────────
   await E(`(()=>{const m=dayAt(state,sydneyDate()).dinner;m.cooked=false;m.recipes=[...state.recipes.filter(x=>x.ingredients?.length).slice(0,2).map(clone),{id:'typed-qa',name:'Canh chua bà nội',category:'soup',protein:'unknown',time:0,servings:4,ingredients:[],missingIngredients:[],prep:'',steps:[],custom:true,origin:'family'}];save()})()`);
   await go('today');const before=await E(`dayAt(state,sydneyDate()).dinner.recipes.map(r=>r.id).join()`);
   const x=page.locator(`#main [data-fm="remove-dish"][data-date="${today}"][data-type="dinner"]`).last();await x.scrollIntoViewIfNeeded();const y0=await E('scrollY');await x.click();await page.waitForTimeout(150);
   {const y1=await E('scrollY'),mx=await E('document.documentElement.scrollHeight-innerHeight');ok(Math.abs(y1-y0)<=2||y1>=mx-1,`A13: removing a dish does not move the page (${y0} → ${y1}, max ${mx})`)}
   ok(await E(`dayAt(state,sydneyDate()).dinner.recipes.length`)===2,'A13: the dish is removed');ok(await page.locator('#undo-bar button').isVisible(),'A13: an undo bar is offered');await shot('a13-undo-dish');
   await page.locator('#undo-bar button').click();await page.waitForTimeout(150);ok(await E(`dayAt(state,sydneyDate()).dinner.recipes.map(r=>r.id).join()`)===before,'A13: undo puts the dish back in its place');
   const clear=page.locator(`#main [data-fm="clear-meal"][data-date="${today}"][data-type="dinner"]`).first();await clear.scrollIntoViewIfNeeded();await clear.click();await page.waitForTimeout(150);
   ok(await E(`dayAt(state,sydneyDate()).dinner.recipes.length`)===0,'A13: “Bỏ hết món” clears');await page.locator('#undo-bar button').click();await page.waitForTimeout(150);
   ok(await E(`dayAt(state,sydneyDate()).dinner.recipes.map(r=>r.id).join()`)===before,'A13: undo brings back every dish, the typed one included');

   // ── A14 / B14: the typed dish sheet and cooking mode ─────────────────────────────────────────────────────────────────────────
   await E(`(()=>{const m=dayAt(state,sydneyDate()).dinner;showRecipe('typed-qa',m.recipes.find(r=>r.id==='typed-qa'),m)})()`);await page.locator('#modal-root .modal').waitFor();
   const tf=await E(`[...document.querySelectorAll('#modal-root .modal-footer [data-action]')].map(b=>b.dataset.action)`);
   ok(!tf.includes('delete-recipe-dialog')&&!tf.includes('add-to-meal')&&!tf.includes('start-cooking'),`A14: no library-only or empty cooking button for a dish typed into a meal ${JSON.stringify(tf)}`);ok(tf.includes('meal-dish-to-library'),'A14: the dish can be saved and edited');
   await noOverflow('A14 sheet');await shot('a14-typed-dish-sheet');
   await page.locator('#modal-root [data-action="meal-dish-to-library"]').click();await page.locator('#family-recipe-form').waitFor();
   ok(await E(`state.recipes.some(r=>r.id==='typed-qa'&&r.custom&&r.origin==='family')`),'A14: saved to the library with the same id (the meal keeps it)');ok(await E(`document.querySelector('#family-recipe-form').dataset.id==='typed-qa'`),'A14: the editor opens on it');await E('closeModal()');
   // B14: a library dish in a meal for many portions — cooking mode shows the same amounts as the dish sheet
   const lib=await E(`(()=>{const m=dayAt(state,sydneyDate()).dinner;m.servings=8;const r=m.recipes.find(x=>x.ingredients?.length&&x.steps?.length);save();return r.id})()`);
   await E(`(()=>{const m=dayAt(state,sydneyDate()).dinner;showRecipe('${lib}',m.recipes.find(r=>r.id==='${lib}'),m)})()`);await page.locator('#modal-root .modal').waitFor();
   const sheetAmounts=await E(`(()=>{const h=[...document.querySelectorAll('#modal-root h3')].find(x=>/phần món trong bữa|Ingredients for this (dish|meal)’s portion/i.test(x.textContent));return h?.nextElementSibling?.textContent.replace(/\\s+/g,' ').trim()||''})()`);
   ok(sheetAmounts.length>0,'B14: the sheet lists the scaled amounts');
   await page.locator('#modal-root [data-action="start-cooking"]').click();await page.locator('#modal-root .cooking-ingredients').waitFor();
   const cookAmounts=await E(`document.querySelector('#modal-root .cooking-ingredients').lastElementChild.textContent.replace(/\\s+/g,' ').trim()`);
   ok(cookAmounts===sheetAmounts,`B14: cooking mode shows the meal's amounts\n sheet: ${sheetAmounts}\n cook:  ${cookAmounts}`);
   ok(new RegExp('8').test(await E(`document.querySelector('#modal-root .cooking-ingredients h4').textContent`)),'B14: and the portions');await noOverflow('B14 cooking');await shot('b14-cooking-amounts');await E('cooking=null;closeModal()');

   // ── A21: “Thêm vào bữa ăn” — the meal the family came from; every meal; nothing assumed ───────────────────────────────────────
   await E(`(()=>{const m=dayAt(state,sydneyDate()).breakfast;m.recipes=[clone(state.recipes.find(r=>r.id==='${lib}'))];showRecipe('${lib}',m.recipes[0],m)})()`);await page.locator('#modal-root [data-action="add-to-meal"]').click();await page.locator('#add-meal-type').waitFor();
   const a21=await E(`({v:document.querySelector('#add-meal-type').value,opts:[...document.querySelectorAll('#add-meal-type option')].map(o=>o.value).filter(Boolean)})`);
   ok(a21.v==='breakfast',`A21: preselects the meal it came from (${a21.v})`);ok(['breakfast','snackAm','lunch','snack','dinner'].every(t=>a21.opts.includes(t)),`A21: every meal incl. the snacks ${JSON.stringify(a21.opts)}`);
   await page.selectOption('#add-meal-type','snackAm');await page.locator('#modal-root [data-action="submit-form"]').click();await page.waitForTimeout(150);
   ok(await E(`dayAt(state,sydneyDate()).snackAm.recipes.some(r=>r.id==='${lib}')`),'A21: added to the morning snack');
   await E(`(()=>{const r=state.recipes.find(x=>!x.purposes?.length&&x.ingredients?.length);showRecipe(r.id)})()`);await page.locator('#modal-root [data-action="add-to-meal"]').click();await page.locator('#add-meal-type').waitFor();
   ok(await E(`document.querySelector('#add-meal-type').value===''`),'A21: a dish with no meal of its own leaves the meal for the family to choose');await noOverflow('A21');await shot('a21-add-to-meal');await E('closeModal()');

   // ── A22: no silent dish role in the quick add ────────────────────────────────────────────────────────────────────────────────
   await E(`familyEditMeal(sydneyDate(),'lunch')`);await page.locator('#quick-dish-name').waitFor();
   ok(await E(`document.querySelector('#quick-dish-cat').value===''`),'A22: the dish role starts unchosen');
   await page.fill('#quick-dish-name','Món lạ QA');await page.locator('[data-fm="quick-add-dish"]').click();await page.waitForTimeout(120);
   ok(!(await E(`dayAt(state,sydneyDate()).lunch.recipes.some(r=>r.name==='Món lạ QA')`)),'A22: not added without a role');ok(new RegExp(L('Chọn vai trò món','Choose the dish role')).test(await toastText()),'A22: asks for the role');
   await page.fill('#quick-dish-name','Canh bí QA');await page.waitForTimeout(50);ok(await E(`document.querySelector('#quick-dish-cat').value==='soup'`),'A22: “Canh …” suggests the soup role from the name');
   await noOverflow('A22');await shot('a22-quick-dish-role');await page.locator('[data-fm="quick-add-dish"]').click();await page.waitForTimeout(150);
   ok(await E(`state.recipes.some(r=>r.name==='Canh bí QA'&&r.category==='soup')`),'A22: saved with the role shown');await E('closeModal()');

   // ── A23: a pantry with only seasonings ───────────────────────────────────────────────────────────────────────────────────────
   await E(`(()=>{state.pantry=[{id:'s1',ingredient:'garlic',qty:50,place:'dry',expiry:''},{id:'s2',ingredient:'fishSauce',qty:300,place:'dry',expiry:''}];save()})()`);await go('today');
   const a23=await E(`(()=>{const c=document.querySelector('#main .fridge-rescue-card');return{card:!!c,btn:!!c?.querySelector('[data-fm="use-pantry"]'),hint:c?.querySelector('.fridge-rescue-staples')?.textContent||''}})()`);
   ok(a23.card&&!a23.btn&&a23.hint.length>10,`A23: staples only → no empty suggestion sheet, an explanation instead ${JSON.stringify(a23)}`);
   await E(`(()=>{state.pantry.push({id:'s3',ingredient:'pork',qty:500,place:'fridge',expiry:addDays(sydneyDate(),2)});state.recipes=state.recipes.filter(r=>!r.ingredients?.some(i=>i.id==='pork'));save();render()})()`);
   await E(`document.querySelector('#main [data-fm="use-pantry"]').click()`);await page.locator('#modal-root .use-pantry-empty').waitFor();
   ok(await page.locator('#modal-root .use-pantry-empty a[href="#pantry"]').count()===1,'A23: the empty sheet explains and offers a next step');await noOverflow('A23');await shot('a23-use-pantry-empty');
   await page.locator('#modal-root .use-pantry-empty a[href="#recipes"]').click();await page.waitForTimeout(150);ok(await E(`!document.querySelector('#modal-root .modal')&&view==='recipes'`),'A23: the link closes the sheet and opens the library');
   await E(`(()=>{state.recipes=defaults().recipes;save()})()`);

   // ── A16 / A15 / C25: Tủ counts and the manual form ───────────────────────────────────────────────────────────────────────────
   await E(`(()=>{state.pantry=[{id:'z0',ingredient:'chicken',qty:0,place:'freezer',expiry:''},{id:'z1',ingredient:'pork',qty:300,place:'fridge',expiry:addDays(sydneyDate(),1)}];save()})()`);await go('pantry');
   const a16=await E(`(()=>{const n=[...document.querySelectorAll('#main .stat-grid strong')].map(x=>+x.textContent);return{n,listed:document.querySelectorAll('#main .pantry-row,#main [data-action="edit-stock"]').length}})()`);
   ok(a16.n[0]===1&&a16.n[2]===0,`A16: the counts equal the lots listed ${JSON.stringify(a16)}`);await shot('a16-pantry-counts');
   await page.locator('#main [data-action="add-stock"]').first().click();await page.locator('#stock-ing').waitFor();
   const f0=await E(`({ing:document.querySelector('#stock-ing').value,place:document.querySelector('#stock-place').value})`);ok(f0.ing===''&&f0.place==='','A15: nothing is chosen for the family '+JSON.stringify(f0));
   await page.fill('#stock-qty','2');await page.locator('#modal-root [data-action="submit-form"]').click();await page.waitForTimeout(120);ok(await E(`state.pantry.length`)===2,'A15: nothing saved without an ingredient');
   await page.selectOption('#stock-ing','rice');await page.waitForTimeout(50);const fr=await E(`({place:document.querySelector('#stock-place').value,exp:document.querySelector('#stock-expiry').value,sug:pantryLotDefaults(state,'rice')})`);
   ok(fr.place==='dry'&&fr.place===fr.sug.place&&fr.exp===fr.sug.expiry,'A15: rice goes to the dry cupboard — the shared rule '+JSON.stringify(fr));
   await page.selectOption('#stock-ing','egg');await page.waitForTimeout(50);const fe=await E(`({place:document.querySelector('#stock-place').value,exp:document.querySelector('#stock-expiry').value,step:document.querySelector('#stock-qty').step,sug:pantryLotDefaults(state,'egg')})`);
   ok(fe.place==='fridge'&&fe.exp===fe.sug.expiry&&fe.exp!==''&&fe.step==='0.25','B10/C25: eggs stay cold with a use-by suggestion; counted in quarters, not 0.1 '+JSON.stringify(fe));
   await page.fill('#stock-qty','0');await page.locator('#modal-root [data-action="submit-form"]').click();await page.waitForTimeout(120);ok(new RegExp(L('lớn hơn 0','above 0')).test(await toastText()),'C25: a wrong amount says why');
   await noOverflow('A15');await shot('a15-stock-form');
   await page.fill('#stock-qty','6');await page.locator('#modal-root [data-action="submit-form"]').click();await page.waitForTimeout(150);
   const lot=await E(`state.pantry.find(p=>p.ingredient==='egg')`);ok(lot&&lot.qty===6&&lot.place==='fridge'&&lot.expiry===fe.sug.expiry&&lot.storedOn===today,'A15: saved with what the form showed '+JSON.stringify(lot));

   // ── A24: who asks for an extra item is never assumed ─────────────────────────────────────────────────────────────────────────
   ok(await E(`errandKnownSender(pushProfile())===''`),'A24: no device member known → nobody preselected');
   await E(`(()=>{try{localStorage.setItem('bep-active-member','m-me');familyStorage.setItem('bep-active-member','m-me')}catch{}})()`);ok(await E(`errandKnownSender(pushProfile())==='m-me'`),'A24: “Ai đang dùng máy này?” is used when set');
   await E(`(()=>{try{localStorage.removeItem('bep-active-member');familyStorage.removeItem('bep-active-member')}catch{}})()`);

   // ── A19 / A20: receipt entry points ─────────────────────────────────────────────────────────────────────────────────────────
   await E(`(()=>{state.receipts=[];save()})()`);await go('products');await E(`receiptProductPicker()`);await page.locator('#modal-root .receipt-lines-empty').waitFor();
   ok(await page.locator('#modal-root .receipt-lines-empty [data-feature="receipt-new"]').count()===1,'A19: the empty sheet offers to scan or enter a receipt');await noOverflow('A19');await shot('a19-products-receipt-empty');
   await page.locator('#modal-root .receipt-lines-empty [data-feature="receipt-new"]').click();await page.waitForTimeout(250);ok(await E(`!!document.querySelector('#modal-root .modal')&&!document.querySelector('#modal-root .receipt-lines-empty')`),'A19: it opens the receipt sheet');
   await go('expenses');const a20=await E(`[...document.querySelectorAll('#main [data-feature="receipt-new"]')].map(b=>b.getAttribute('aria-label')||b.textContent.trim())`);
   ok(a20.length===2,`A20: two entry points when there is no receipt (header and the empty card) ${JSON.stringify(a20)}`);await shot('a20-expenses-empty');

   // ── B23 / B11: a page import opens for review; spoons stay as written ────────────────────────────────────────────────────────
   const n0=await E('state.recipes.length');
   await E(`(()=>{const rec=KitchenExtras.recipeFromImport({name:'Thịt kho QA',ingredients:['500 g pork belly, cubed','4 eggs','2 tbsp fish sauce','1 cup coconut water','Salt to taste'],steps:['Cut the pork.','Simmer.'],time:75,source:'https://cook.example.com/r'});return KitchenExtras.importOpenDraft(rec)})()`);
   await page.locator('#family-recipe-form').waitFor();await page.waitForTimeout(150);
   ok(await E('state.recipes.length')===n0,'B23: nothing is saved before the family reviews it');
   const box=await E(`document.querySelector('#family-recipe-form [name="ingredients"]').value`);
   ok(/Thịt heo \| 500 \| g/.test(box)&&/Trứng \| 4 \| quả/.test(box),`B11: matched lines as typed lines ${JSON.stringify(box)}`);ok(/fish sauce \| 2 \| muỗng canh/.test(box)&&!/\| 30 \| ml/.test(box),'B11: “2 tbsp” stays 2 muỗng canh, never 30 ml');
   const sel=await E(`({c:document.querySelector('#family-recipe-form [name="category"]').value,p:document.querySelector('#family-recipe-form [name="protein"]').value,y:document.querySelector('#family-recipe-form [name="yield"]').value})`);
   ok(sel.c===''&&sel.p===''&&sel.y==='',`B23: type, protein and servings the page did not give are left for the family ${JSON.stringify(sel)}`);await noOverflow('B23');await shot('b23-import-review');
   await E(`(()=>{const f=document.querySelector('#family-recipe-form');f.category.value='main';f.protein.value='pork';f.yield.value='4'})()`);await page.locator('#modal-root [data-action="submit-form"]').click();await page.waitForTimeout(250);
   const saved=await E(`(()=>{const r=state.recipes.find(x=>x.name==='Thịt kho QA');return r&&{ings:r.ingredients.map(i=>[INGREDIENTS[i.id][0],i.qty,INGREDIENTS[i.id][1]]),source:r.source,cat:r.category}})()`);
   ok(saved&&saved.cat==='main'&&saved.source==='https://cook.example.com/r','B23: saved on Lưu, with its source');
   ok(saved.ings.some((i:any[])=>i[0]==='fish sauce'&&i[1]===2&&i[2]==='muỗng canh'),'B11: the spoon line counts the same as one typed in Viết món '+JSON.stringify(saved.ings));
   // the same line dictated is written the same way
   ok(await E(`(()=>{const u=vrUnitInfo('muỗng canh');return VoiceRecipe.formLine({name:'Nước mắm',qty:2,unit:'muỗng canh',formUnit:u.form,factor:u.factor})})()`)==='Nước mắm | 2 | muỗng canh','B11: dictation writes the same line as Viết món');

   // ── round trip ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
   await E('closeModal()');ok(await E(allMonday),'only Monday-keyed weeks are stored');ok(await E('validImport(JSON.parse(JSON.stringify(state)))'),'validImport(state) after every change');
   ok(!errors.length,'no page errors: '+errors.join(' | '));
   await context.close();console.log('ok',label);
  }
  console.log(`PASS v1.7.19 weeks, dishes, pantry entry and empty states (${checks} checks)`);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
