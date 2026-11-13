// v1.7.21 (Henry, 14 Nov 2026, pop-up: “tìm món theo loại, theo bữa và Hay nấu”): wherever the family picks a dish from
// the library — the meal picker (“Thêm món” on a meal card, also the weekend batch-cook meals) and the Món ăn tab — chips
// narrow the dishes by kind (the app's CATEGORY list), by meal (the recipe's meals) and “Hay nấu” (cooked in the last 8
// weeks, most cooked first). Chips combine with typing; the status counts what matches; “Bỏ lọc / Clear” resets; words only
// (rule 27); ≥44 px; tapping does not move the page (rule 24). The portion select says “Tự tính” in full, not “Tự tính theo s…”.
// 320×740, 375×812, 820×1100, 1280×800; VI/EN; light/dark; a phone outside Sydney time. Browser viewport simulation only.
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert');
const root=process.cwd(),dir='docs/reviews/v1.7.21/prices';fs.mkdirSync(dir,{recursive:true});
const types={'.html':'text/html','.js':'application/javascript','.json':'application/json','.css':'text/css','.webp':'image/webp','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
async function route(page){await page.route('https://kitchen.test/**',async r=>{const url=new URL(r.request().url());if(url.pathname.startsWith('/.netlify/')){const op=url.searchParams.get('op');return r.fulfill({json:op==='status'?{configured:false,connected:false}:op==='state'?{state:null,etag:null}:op==='families'?{families:[]}:{announcements:[],devices:[]}})}const file=path.join(root,'dist',url.pathname==='/'?'index.html':url.pathname);try{await r.fulfill({body:fs.readFileSync(file),contentType:types[path.extname(file)]||'application/octet-stream'})}catch{await r.fulfill({status:404,body:'Not found'})}})}
const sizes=[['narrow',320,740,'vi','dark','Asia/Ho_Chi_Minh'],['mobile',375,812,'vi','light','Australia/Sydney'],['tablet',820,1100,'en','dark','Europe/London'],['desktop',1280,800,'en','light','Australia/Sydney']];
const EMOJI=/\p{Extended_Pictographic}/u;
(async()=>{const browser=await chromium.launch(process.env.BEP_CHROMIUM?{executablePath:process.env.BEP_CHROMIUM}:{});
try{for(const [name,width,height,lang,theme,tz] of sizes){
 const context=await browser.newContext({locale:lang==='en'?'en-AU':'vi-VN',viewport:{width,height},reducedMotion:'reduce',hasTouch:name!=='desktop',isMobile:name==='mobile'||name==='narrow',colorScheme:theme,timezoneId:tz});
 await context.addInitScript(({lang,theme})=>{if(sessionStorage.getItem('qa-init'))return;sessionStorage.setItem('qa-init','1');localStorage.setItem('bep-theme-mode',theme);localStorage.setItem('guest/bep-language',lang)},{lang,theme});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await route(page);
 await page.goto('https://kitchen.test/#planner');await page.locator('[data-fm="edit-meal"]').first().waitFor({state:'attached',timeout:20000});
 // family dishes and a cooking history: Phở nhà mình cooked 3× and Canh chua 1× in the last 8 weeks, Cơm tấm 10 weeks ago
 const setup=await page.evaluate(()=>{const fam=(id,name,category,purposes)=>({id,name,category,protein:'mixed',time:20,servings:4,yield:4,ingredients:[{id:'egg',qty:2}],prep:'',steps:['Nấu.'],favorite:false,custom:true,origin:'family',purposes});
  state.recipes.push(fam('qa-pho','Phở bò nhà mình','noodle',['breakfast']),fam('qa-canh','Canh chua nhà mình','soup',['dinner']),fam('qa-com','Cơm tấm nhà mình','main',['lunch','dinner']),fam('qa-che','Chè đậu nhà mình','dessert',[]));
  const today=sydneyDate(),cook=(date,type,id)=>{const w=ensureWeek(state,planStartOf(state,date)),m=w.days[date]?.[type];if(!m)return false;m.recipes=[clone(state.recipes.find(r=>r.id===id))];m.cooked=true;return true};
  const done=[cook(addDays(today,-3),'breakfast','qa-pho'),cook(addDays(today,-10),'breakfast','qa-pho'),cook(addDays(today,-24),'breakfast','qa-pho'),cook(addDays(today,-5),'dinner','qa-canh'),cook(addDays(today,-70),'lunch','qa-com')];
  const d=Object.keys(currentWeek().days).find(x=>x>today)||Object.keys(currentWeek().days).at(-1);currentWeek().days[d].dinner.recipes=[];currentWeek().days[d].dinner.cooked=false;save();render();familyEditMeal(d,'dinner');return{done,date:d}});
 assert.ok(setup.done.every(Boolean),'history seeded');
 await page.locator('#meal-dish-chips').waitFor();
 const status=()=>page.locator('#meal-search-status').innerText();
 const chip=(kind,key)=>page.locator(`#meal-dish-chips [data-dish-chip="${kind}"][data-key="${key}"]`);
 const ownRows=()=>page.locator('#meal-own-list .family-select-row').evaluateAll(a=>a.map(x=>x.dataset.id));
 // words only, ≥44 px, every chip labelled from the app's own lists
 const info=await page.locator('#meal-dish-chips .dish-chip').evaluateAll(a=>a.map(b=>({t:b.textContent.trim(),h:b.getBoundingClientRect().height,w:b.getBoundingClientRect().width,art:!!b.querySelector('svg,img'),pressed:b.getAttribute('aria-pressed')})));
 assert.ok(info.length>=8,'kind + meal + Hay nấu + Bỏ lọc chips');for(const c of info){assert.ok(c.h>=44&&c.w>=44,name+': chip ≥44 px '+c.t+' '+c.h);assert.ok(!c.art,'words only: '+c.t);assert.ok(!EMOJI.test(c.t),'no emoji: '+c.t)}
 const labels=info.map(c=>c.t.replace(/\d+$/,'').trim());
 for(const want of lang==='vi'?['Món chính','Món phụ','Món sợi','Bữa sáng','Bữa trưa','Bữa tối','Bữa phụ','Hay nấu','Bỏ lọc']:['Main dish','Side dish','Noodle dish','Breakfast','Lunch','Dinner','Snack','Cooked often','Clear'])assert.ok(labels.some(l=>l.startsWith(want)),name+': chip '+want+' in '+labels.join('|'));
 assert.equal(await chip('clear','clear').isDisabled(),true,'Bỏ lọc is off with nothing chosen');
 // a tap keeps the chip where it was (rule 24) and the page still
 const tapStill=async(kind,key)=>{const loc=chip(kind,key);await loc.scrollIntoViewIfNeeded();await page.waitForTimeout(80);const b0=await loc.boundingBox(),y0=await page.evaluate(()=>[scrollY,document.querySelector('#modal-root .modal-body, #modal-root .modal')?.scrollTop||0].join(','));if(name==='desktop')await loc.click();else await loc.tap();await page.waitForTimeout(120);const b1=await chip(kind,key).boundingBox(),y1=await page.evaluate(()=>[scrollY,document.querySelector('#modal-root .modal-body, #modal-root .modal')?.scrollTop||0].join(','));assert.ok(Math.abs(b1.y-b0.y)<1,`${name}: ${key} chip did not move vertically (${b0.y}→${b1.y})`);assert.equal(y1,y0,name+': page and sheet stay still')};
 // 1. Hay nấu: only dishes cooked in the last 8 weeks, most cooked first; the count says so
 await tapStill('often','often');assert.equal(await chip('often','often').getAttribute('aria-pressed'),'true');
 assert.deepEqual((await ownRows()).slice(0,2),['qa-pho','qa-canh'],'most cooked first (Phở 3×, Canh chua 1×); Cơm tấm 10 weeks ago is not “often”');
 assert.ok(!(await ownRows()).includes('qa-com'));
 assert.match(await status(),lang==='vi'?/^2 món: hay nấu \(8 tuần qua\)/:/^2 dishes: cooked often \(last 8 weeks\)/,'count of what matches');
 assert.equal(await chip('clear','clear').isDisabled(),false);
 // 2. + a meal: Bữa tối → only Canh chua
 await tapStill('meal','dinner');assert.deepEqual(await ownRows(),['qa-canh'],'Hay nấu + Bữa tối');assert.match(await status(),/^1 /);
 // 3. clear, then kind + typing: Món sợi + “phở”
 await tapStill('clear','clear');assert.equal(await chip('often','often').getAttribute('aria-pressed'),'false');assert.equal(await chip('meal','dinner').getAttribute('aria-pressed'),'false');assert.equal(await page.locator('#meal-dish-search').inputValue(),'');
 await tapStill('kind','noodle');const own=await ownRows();assert.ok(own.includes('qa-pho')&&!own.includes('qa-canh'),'Món sợi only');
 const libKinds=await page.locator('#meal-lib-list .family-select-row').evaluateAll(a=>a.map(x=>x.dataset.cat));assert.ok(libKinds.length&&libKinds.every(c=>c==='noodle'),'reference dishes filtered too: '+libKinds);
 const nNoodle=+(await status()).match(/^(\d+)/)[1];const expectN=await page.evaluate(()=>mealEditorCtx.own.concat(mealEditorCtx.lib).filter(r=>r.category==='noodle').length);assert.equal(nNoodle,expectN,'status count = noodle dishes');
 const chipN=+(await chip('kind','noodle').locator('.chip-count').innerText());assert.equal(chipN,expectN,'chip count = what it opens');
 await page.locator('#meal-dish-search').fill('phở');await page.waitForTimeout(300);assert.match(await status(),lang==='vi'?/khớp “phở” · Món sợi/:/match “phở” · Món sợi|match “phở” · Noodle/,'typing combines with the chip');
 assert.ok(await page.locator('#meal-lib-list .family-select-row').evaluateAll(a=>a.every(x=>x.dataset.cat==='noodle')));
 // 4. nothing matches: says so and how to get back
 await page.locator('#meal-dish-search').fill('zzqqxx');await page.waitForTimeout(300);assert.match(await status(),/\(0 /);
 await tapStill('clear','clear');assert.equal(await page.locator('#meal-dish-search').inputValue(),'','Bỏ lọc also clears the words');assert.match(await status(),lang==='vi'?/Gõ tên món/:/Type a dish/);
 // 5. a ticked dish survives a chip change and is saved with the meal
 await tapStill('kind','noodle');await page.locator('#meal-own-list input[value="qa-pho"]').check();await tapStill('kind','soup');assert.ok(await page.locator('#meal-own-list input[value="qa-pho"]:checked').count(),'ticked dish stays in the form');
 // 6. portion select: “Tự tính” is not cut; the full meaning is in its name
 const sel=page.locator('#meal-own-list select[name="size-qa-pho"]');const fit=await sel.evaluate(s=>{const c=document.createElement('canvas').getContext('2d'),cs=getComputedStyle(s);c.font=`${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;const txt=s.options[s.selectedIndex].text,pad=parseFloat(cs.paddingLeft)+parseFloat(cs.paddingRight)+18;return{txt,need:c.measureText(txt).width+pad,have:s.clientWidth,h:s.getBoundingClientRect().height,all:[...s.options].map(o=>c.measureText(o.text).width+pad)}});
 assert.equal(fit.txt,lang==='vi'?'Tự tính':'Auto');assert.ok(fit.need<=fit.have,`${name}: “${fit.txt}” fits (${fit.need}/${fit.have})`);assert.ok(fit.h>=44,'select ≥44 px');
 assert.match(await sel.getAttribute('aria-label'),lang==='vi'?/Tự tính = theo số người ăn bữa này/:/Auto = by who is eating/);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),name+': no horizontal overflow');
 await page.evaluate(()=>{const t=document.getElementById('toast');if(t)t.style.visibility='hidden'});await page.screenshot({path:`${dir}/meal-picker-chips-${lang}-${theme}-${width}x${height}.png`});
 await page.locator('#family-meal-form').evaluate(f=>f.requestSubmit());await page.waitForTimeout(300);
 const saved=await page.evaluate(d=>currentWeek().days[d].dinner.recipes.map(r=>r.id),setup.date);assert.deepEqual(saved,['qa-pho'],'saved with the meal');
 assert.ok(await page.evaluate(()=>validImport(JSON.parse(JSON.stringify(state)))),'round trip: the state still loads');
 // 7. the Món ăn tab: the same meal and “Hay nấu” chips
 await page.evaluate(()=>{location.hash='recipes'});await page.locator('#family-recipe-chips').waitFor();
 assert.equal(await page.locator('#family-recipe-chips button svg, #family-recipe-chips button img').count(),0,'Món ăn tab: chips are words only, no drawing or emoji (rule 27)');assert.ok(!/[\u{1F300}-\u{1FAFF}]/u.test(await page.locator('#family-recipe-chips').innerText()),'Món ăn tab: no emoji in the chips');
 const lib=(fm,key)=>page.locator(`#family-recipe-chips [data-fm="${fm}"][data-key="${key}"]`);
 await page.locator('[data-fm="own"]').first().click();await page.waitForTimeout(200);
 const b0=await lib('often-filter','often').boundingBox();assert.ok(b0.height>=44,'library chip ≥44 px');await lib('often-filter','often').click();await page.waitForTimeout(250);
 assert.equal(await lib('often-filter','often').getAttribute('aria-pressed'),'true');const titles=await page.locator('#family-recipe-results .recipe-card h3').allInnerTexts();
 assert.ok(/Phở bò nhà mình/.test(titles[0])&&titles.length===2,'library “Hay nấu”: most cooked first: '+titles);
 assert.match(await page.locator('#family-recipe-status').innerText(),lang==='vi'?/^2 món .*hay nấu/:/^2 recipes .*cooked often/);
 await lib('meal-filter','dinner').click();await page.waitForTimeout(250);assert.deepEqual((await page.locator('#family-recipe-results .recipe-card h3').allInnerTexts()).map(t=>t.trim()),['Canh chua nhà mình']);
 await lib('cat-filter','all').click();await page.waitForTimeout(250);assert.equal(await lib('often-filter','often').getAttribute('aria-pressed'),'false','Tất cả clears meal and Hay nấu');
 await page.evaluate(()=>{const t=document.getElementById('toast');if(t)t.style.visibility='hidden'});await page.screenshot({path:`${dir}/library-chips-${lang}-${theme}-${width}x${height}.png`});
 assert.deepEqual(errors,[],name+': no page errors');await context.close()}
 console.log('PASS v1.7.21 dish chips: kind / meal / Hay nấu (8 weeks, most cooked first) in the meal picker and the Món ăn tab, combined with typing, counts equal what they open, Bỏ lọc resets, words only, ≥44 px, page still; “Tự tính” fits with its full meaning for screen readers; saved meal round-trips (320/375/820/1280, VI/EN, light/dark, non-Sydney phones)');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
