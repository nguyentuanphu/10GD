// v1.7.19 — owner, 12 Nov 2026 (Sydney time): “i knew there would be this issues so thats why i asked you to create the autoplay to
// test all the scenarios, now based on what you learn and what you have audited, incorporate it in the autoplay”.
// “Tự chạy thử” gets the group “Rà soát 12/11” (ladybug-audit.ts): one scenario per family of problems the 12 Nov audit found, and the
// rule-33 round trip (validImport + sync merge) after EVERY scenario (ladybug-autoplay.ts). This suite:
//  1. runs “Chạy tất cả” on the sample family (375×812 VI) — every scenario, old and new, passes, the family's data and the device are
//     untouched and nothing is sent;
//  2. runs the audit group at 375×812, 820×1100 and 1280×800 in Vietnamese and in English, with screenshots of the list and results;
//  3. breaks the app on purpose, one bug family at a time (the bugs the audit found), and checks that the matching scenario fails at
//     the step that names it — so each check is proven to catch its bug.
// Chromium viewport simulation, not a physical phone.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const origin='https://kitchen.test',out='docs/reviews/v1.7.19/autoplay-audit';mkdirSync(out,{recursive:true});
const mime:any={'.js':'application/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'};
const sizes:any={mobile:{width:375,height:812},tablet:{width:820,height:1100},desktop:{width:1280,height:800}};
const AUDIT=['au-week-sat','au-week-sun','au-english','au-currency','au-yield','au-defaults','au-counts','au-counts-empty','au-extras','au-dish','au-spoon','au-useby','au-mealtimes','au-phone-tz'];
// one bug family at a time: [what is broken, scenarios to run, the patch, the failed step it must name]
const BREAKERS:[string,string[],string,RegExp][]=[
 // v1.7.19 (13 Nov 2026): the phone-time-zone pass. The suite's phone is on Sydney time; the scenario makes it act as Los Angeles
 // (or Kiritimati) time itself, so an app that reads the phone's zone or clock shows another date and is caught.
 ['Rule 34: the app takes the phone’s time zone instead of the family’s',['au-phone-tz'],`Object.defineProperty(globalThis,'BEP_TIMEZONE',{configurable:true,get(){return new Intl.DateTimeFormat().resolvedOptions().timeZone},set(){}})`,/Tuần này|This week/],
 ['Rule 34: times shown in the phone’s zone (toLocaleTimeString without a zone)',['au-phone-tz'],`appTimeLabel=function(at,o={}){const d=at instanceof Date?at:new Date(at),out=[];if(o.date!==false)out.push(d.toLocaleDateString('en-GB',{day:'numeric',month:'numeric'}));if(o.time!==false)out.push(d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',hourCycle:'h23'}));return out.join(' ')}`,/Giờ và ngày hiển thị|Times and dates shown/],
 ['B1: guests saved into a copy week keyed by the menu start day',['au-week-sat'],`dayAt=(s,d)=>ensureWeek(s,planStartOf(s,d)).days[d]`,/Có khách|Guests/],
 ['A3/C3: an unknown extra silently gets a unit',['au-defaults'],`unitMatchIngredient=()=>Object.keys(INGREDIENTS)[0]`,/không lưu “g”|no “g”/],
 ['A4/C13: an empty price saved as a known $0',['au-defaults'],`{const o=extraRecordFields;extraRecordFields=function(){const r=o.apply(this,arguments);if(r.costUnknown){delete r.costUnknown;r.cost=0}return r}}`,/không lưu “g”|no “g”/],
 ['A1: “Đồ trong tủ (27)” over a sheet that lists fewer',['au-counts'],`{const r0=render;render=function(){const x=r0.apply(this,arguments);document.querySelectorAll('#main [data-action="check-pantry"]').forEach(b=>{for(const n of b.childNodes)if(n.nodeType===3&&/\\(\\d+\\)/.test(n.textContent))n.textContent=n.textContent.replace(/\\(\\d+\\)/,'(27)')});return x}}`,/Đồ trong tủ|Pantry \(n\)/],
 ['A6/A13: removing has no undo',['au-extras','au-dish'],`undoBar=function(){}`,/Hoàn tác|Undo/],
 ['C1: a dish’s own yield ignored on the list',['au-yield'],`{const o=mealIngredients;mealIngredients=function(m,s){const n=o.apply(this,arguments);const r=(m?.recipes||[]).find(x=>/2 suất \\(thử\\)/.test(x.name));if(r)for(const i of r.ingredients||[])if(n[i.id])n[i.id]*=2;return n}}`,/định lượng|recipe ×/],
 ['C4: more than 30 portions rejected by the validator',['au-yield'],`{const o=validImport;validImport=function(s){for(const w of Object.values(s.weeks||{}))for(const d of Object.values(w.days||{}))for(const m of Object.values(d||{}))if(m&&m.guests&&m.guests.length&&mealServings(m,s)>30)return false;return o.apply(this,arguments)}}`,/hơn 30 suất|over 30 portions/],
 ['Spoon amounts counted on the list',['au-spoon'],`isSpoonUnit=()=>false`,/muỗng|tbsp|nhớ mua|remember/],
 ['Receipt lots without a suggested use-by',['au-useby'],`ReceiptList.receiptUseBy=()=>''`,/hạn dùng|use-by/i],
 ['A meal without a time gets an assumed one',['au-mealtimes'],`{const o=cookTiming;cookTiming=function(s,m,t){return o(s,m,t||'18:30')}}`,/Chưa đặt|Not set/],
 ['C12/B13: an unknown price shown as 0 ₫',['au-currency'],`priceFor=()=>0.0001`,/giá theo đồng|price in đồng/],
 ['D11–D17: a Vietnamese label left in English',['au-english'],`{const r0=render;render=function(){const x=r0.apply(this,arguments);const b=document.querySelector('#main h1');if(b&&appLanguage==='en')b.append(' Nhãn chưa được dịch');return x}}`,/English: today/],
 ['Rule 24: tapping a chip moves the page',['au-counts'],`window.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('#main [data-action="pantry-filter"]');if(t){t.setAttribute('data-keep-scroll-off','');setTimeout(()=>{const d=document.createElement('div');d.style.height='120px';document.getElementById('main').before(d)},20)}},true)`,/Tủ: số trên thẻ|Pantry: the numbers/],
 ['Rule 33: a sync merge that drops receipts (an old workflow)',['wf-receipt'],`{const o=mergeFamilyStates;mergeFamilyStates=function(){const r=o.apply(this,arguments);r.state.receipts=[];return r}}`,/Lưu rồi mở lại|Save and load again/],
 ['Rule 33: a state the validator refuses (old quick check and workflow)',['pages','wf-extra'],`{const o=validImport;validImport=function(s){if(globalThis.bepAutoplay.running()&&(s?.members||[]).some(m=>m.id==='ap-ba'))return false;return o.apply(this,arguments)}}`,/Lưu rồi mở lại|Save and load again/]];
(async()=>{
 const browser=await chromium.launch(process.env.BEP_CHROMIUM?{executablePath:process.env.BEP_CHROMIUM}:{});
 try{
  const open=async(size:string,lang:string,tz='Australia/Sydney')=>{const context=await browser.newContext({locale:'vi-VN',viewport:sizes[size],serviceWorkers:'block',reducedMotion:'reduce',timezoneId:tz});
   await context.addInitScript((lang:string)=>{if(sessionStorage.getItem('qa-init'))return;sessionStorage.setItem('qa-init','1');localStorage.setItem('bep-local-locked','yes');localStorage.setItem('guest/bep-language',lang)},lang);
   const page=await context.newPage(),errors:string[]=[],calls:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',(r:any)=>{if(r.url().includes('/.netlify/'))calls.push(r.method()+' '+r.url())});
   await page.route(origin+'/**',async(r:any)=>{const u=new URL(r.request().url());if(u.pathname.startsWith('/.netlify/'))return r.fulfill({status:401,json:{error:'no'}});if(u.pathname==='/startup-scripts.json')return r.fulfill({json:JSON.parse(readFileSync('dist/startup-scripts.json','utf8'))});const f=resolve('dist',u.pathname==='/'?'index.html':u.pathname.slice(1));try{await r.fulfill({contentType:mime[extname(f)]||'application/octet-stream',body:readFileSync(f)})}catch{await r.fulfill({status:404,body:''})}});
   await page.goto(origin+'/#today',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#main h1'),null,{timeout:20000});
   const E=(s:string)=>page.evaluate(s) as Promise<any>;
   await E(`(()=>{state.preferences.onboardingComplete=true;state.members=[['m-phu','Ba Phú',1],['m-mi','Mẹ Mi',1]].map(([id,name,weight])=>({id,name,weight,emoji:''}));familyGenerate(state,weekStart,{sourceMode:'library'});closeModal();save();globalThis.BEP_SESSION={mode:'account',household:{id:'00000000-0000-4000-8000-000000000000',name:'Nhà Phú',role:'owner'},account:{username:'henry'}};view='today';location.hash='today';render()})()`);
   return {context,page,E,errors,calls}};
  const done=(page:any,ms=600000)=>page.waitForFunction(()=>!(globalThis as any).bepAutoplay.running(),null,{timeout:ms});
  const snap=`JSON.stringify(Object.fromEntries(Object.keys(localStorage).filter(k=>!/^bep-(usage-|ladybug|feedback|autoplay)/.test(k)).sort().map(k=>[k,localStorage.getItem(k)])))`;
  const showGroup=async(page:any)=>{await page.locator('#ap-panel .ap-group').nth(1).evaluate((h:any)=>h.scrollIntoView({block:'start'}))};

  // 1. “Chạy tất cả” on the sample family: every scenario passes, old ones now end with the round trip too
  {const {context,page,E,errors,calls}=await open('mobile','vi');const label='mobile vi (Chạy tất cả)';
   const real0=await E('JSON.stringify(state)'),ls0=await E(snap);calls.length=0;
   await E('bepAutoplay.open()');await page.locator('#ap-panel .ap-group').nth(1).waitFor();
   const groups:string[]=await page.locator('#ap-panel .ap-group').allInnerTexts();
   assert.match(groups[0],/Workflow trọn vẹn \(15\)/,`${label}: workflows first`);assert.match(groups[1],new RegExp(`Rà soát 12/11 \\(${AUDIT.length}\\)`),`${label}: then the audit group, ${AUDIT.length} scenarios (${groups})`);assert.match(groups[2],/Kiểm tra nhanh/,`${label}: then the quick checks`);
   const items=await page.locator('#ap-panel .ap-list').nth(1).locator('.ap-item').evaluateAll((a:any[])=>a.map(li=>({t:li.querySelector('b').textContent,w:li.querySelector('[data-ap="watch"]').getBoundingClientRect().height,art:!!li.querySelector('[data-ap="watch"] svg'),id:li.querySelector('[data-ap="watch"]').dataset.id})));
   assert.deepEqual(items.map((x:any)=>x.id),AUDIT,`${label}: the audit scenarios, in order`);assert.ok(items.every((x:any)=>x.w>=44&&!x.art),`${label}: “Xem” ≥ 44 px, words only`);
   assert.ok(!(await page.locator('#ap-panel').innerText()).match(/\p{Extended_Pictographic}/u),`${label}: no emoji in the list`);
   await showGroup(page);await page.screenshot({path:`${out}/list-all-vi-375x812.png`});
   const t0=Date.now();await page.locator('#ap-panel [data-ap="all"]').click();await page.locator('#ap-bar').waitFor();await done(page);
   const res:any=await E('bepAutoplay.results()');const bad=Object.entries(res).filter(([,v]:any)=>!v.ok||v.skipped);
   assert.deepEqual(bad,[],`${label}: every scenario passes on the sample family, none skipped ${JSON.stringify(bad)}`);
   assert.equal(Object.keys(res).length,await E('bepAutoplay.scenarios().length'),`${label}: all ${Object.keys(res).length} scenarios ran`);
   assert.ok(AUDIT.every(id=>res[id]?.parts>=4),`${label}: each audit scenario is several checked steps ${JSON.stringify(AUDIT.map(id=>[id,res[id]?.parts]))}`);
   assert.ok(Object.values(res).every((v:any)=>v.parts>=1),`${label}: every scenario, old and new, ended with the round trip`);
   assert.equal(await E('JSON.stringify(state)'),real0,`${label}: the family's own data is untouched`);assert.equal(await E(snap),ls0,`${label}: everything on the device is back as it was`);
   assert.deepEqual(calls.filter(c=>!/feedback\?op=(access|status)/.test(c)),[],`${label}: nothing sent while testing`);
   assert.equal(await E('appLanguage'),'vi',`${label}: the language is back`);assert.equal(await E('currentCurrency(state)'),'AUD',`${label}: the currency is back`);
   await page.locator('#ap-panel .ap-sum').waitFor();await showGroup(page);await page.screenshot({path:`${out}/results-all-vi-375x812.png`});
   console.log(`✓ ${label}: ${Object.keys(res).length} scenarios in ${Math.round((Date.now()-t0)/1000)} s`);

   // 3. each check catches the bug it is for (the patch is undone by reloading the page afterwards)
   for(const [what,ids,patch,step] of BREAKERS){await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#main h1'),null,{timeout:20000});
    await E(`(()=>{state.preferences.onboardingComplete=true;closeModal();globalThis.BEP_SESSION={mode:'account',household:{id:'00000000-0000-4000-8000-000000000000',name:'Nhà Phú',role:'owner'},account:{username:'henry'}};render()})()`);
    await E(patch);await E(`bepAutoplay.run(${JSON.stringify(ids)})`);await done(page,240000);const r:any=await E('bepAutoplay.results()');
    for(const id of ids){const v=r[id];assert.ok(v&&!v.ok,`${what}: “${id}” fails ${JSON.stringify(v)}`);assert.ok((v.fails||[]).some((f:any)=>step.test(f.step)),`${what}: “${id}” names the step (${step}) ${JSON.stringify(v.fails)}`)}
    console.log(`✓ caught — ${what}`)}
   await E('bepAutoplay.open()');await page.locator('#ap-panel .ap-err').first().waitFor();await showGroup(page);await page.screenshot({path:`${out}/caught-vi-375x812.png`});
   assert.deepEqual(errors,[],`${label}: page errors`);await context.close()}

  // 2. the audit group at each size, in Vietnamese and in English
  for(const [size,lang] of [['mobile','en'],['tablet','vi'],['tablet','en'],['desktop','vi'],['desktop','en']] as const){const label=`${size} ${lang}`,{width,height}=sizes[size];
   const {context,page,E,errors,calls}=await open(size,lang);const real0=await E('JSON.stringify(state)'),ls0=await E(snap);calls.length=0;
   await E('bepAutoplay.open()');await page.locator('#ap-panel .ap-group').nth(1).waitFor();assert.match(await page.locator('#ap-panel .ap-group').nth(1).innerText(),lang==='en'?new RegExp(`Audit 12 Nov \\(${AUDIT.length}\\)`):new RegExp(`Rà soát 12/11 \\(${AUDIT.length}\\)`),`${label}: the audit heading`);
   const ow=await E('document.documentElement.scrollWidth-innerWidth');assert.ok(ow<=1,`${label}: the list does not scroll sideways (${ow})`);
   await showGroup(page);await page.screenshot({path:`${out}/list-${lang}-${width}x${height}.png`});
   await E('document.getElementById("ap-panel")?.remove()');await E(`bepAutoplay.run(${JSON.stringify(AUDIT)})`);await done(page);
   const res:any=await E('bepAutoplay.results()');const bad=Object.entries(res).filter(([,v]:any)=>!v.ok||v.skipped);assert.deepEqual(bad,[],`${label}: every audit scenario passes ${JSON.stringify(bad)}`);
   assert.equal(await E('JSON.stringify(state)'),real0,`${label}: the family's data is untouched`);assert.equal(await E(snap),ls0,`${label}: the device is as before`);assert.deepEqual(calls.filter(c=>!/feedback\?op=(access|status)/.test(c)),[],`${label}: nothing sent`);
   assert.equal(await E('appLanguage'),lang,`${label}: the language is back`);
   await page.locator('#ap-panel .ap-sum').waitFor();assert.match(await page.locator('#ap-panel .ap-sum').innerText(),lang==='en'?new RegExp(`${AUDIT.length} of ${AUDIT.length} passed`):new RegExp(`Đạt ${AUDIT.length}/${AUDIT.length} kịch bản`),`${label}: the summary`);
   await showGroup(page);await page.screenshot({path:`${out}/results-${lang}-${width}x${height}.png`});
   assert.deepEqual(errors,[],`${label}: page errors`);await context.close();console.log('✓',label)}
  // 4. v1.7.19: the phone-time-zone scenario on a phone really set to Los Angeles time (the clock functions of Date too), VI and EN
  for(const lang of ['vi','en']){const label=`mobile ${lang} (phone on Los Angeles time)`;const {context,page,E,errors,calls}=await open('mobile',lang,'America/Los_Angeles');/* start-up reads (product photos) finish before counting what the scenario sends */await page.waitForLoadState('networkidle').catch(()=>{});await page.waitForTimeout(500);const real0=await E('JSON.stringify(state)');calls.length=0;
   assert.equal(await E('Intl.DateTimeFormat().resolvedOptions().timeZone'),'America/Los_Angeles');
   await E(`bepAutoplay.run(['au-phone-tz'])`);await done(page,240000);const r:any=await E('bepAutoplay.results()');
   assert.ok(r['au-phone-tz']?.ok&&!r['au-phone-tz'].skipped&&r['au-phone-tz'].parts>=6,`${label}: passes ${JSON.stringify(r['au-phone-tz'])}`);
   assert.equal(await E('JSON.stringify(state)'),real0,`${label}: the family's data is untouched`);assert.equal(await E('Intl.DateTimeFormat().resolvedOptions().timeZone'),'America/Los_Angeles',`${label}: the phone's zone is back`);
   assert.deepEqual(calls.filter(c=>!/feedback\?op=(access|status)/.test(c)),[],`${label}: nothing sent`);assert.deepEqual(errors,[],`${label}: page errors`);await context.close();console.log('✓',label)}
  console.log(`PASS autoplay audit: “Rà soát 12/11” (${AUDIT.length} scenarios — week starting Saturday and Sunday, English, VND, own yield + guests, no silent defaults, counts equal content with data and empty, extras and dish-sheet add/edit/undo, spoon notes, receipt use-by, meal times, a phone not on Sydney time) passes on the sample family at 375 / 820 / 1280 in VI and EN; “Chạy tất cả” passes with the rule-33 round trip after every scenario; ${BREAKERS.length} deliberate bugs are each caught by the matching step`);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
