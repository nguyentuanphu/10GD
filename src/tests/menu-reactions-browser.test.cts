// v1.7.1 owner request: in the Menu, family members can 👍 / 👎 dishes; the app learns from it, uses it in suggestions
// and shows "Khẩu vị gia đình / Family tastes". Device-only mode in Chromium with touch emulation at 320×740, 375×812,
// 820×1100 and 1280×800 (simulation only, not physical devices). Covers: react on Menu / Today / recipe view, toggle,
// reasons, on-behalf recording, aggregate + initials, Family tastes view, suggestions and explanations reflecting
// reactions, VI/EN, light/dark, offline, reduced motion, ≥44 px targets and no horizontal overflow.
// Screenshots → docs/reviews/v1.7.1/menu-reactions.
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert');
const root=process.cwd(),dir='docs/reviews/v1.7.1/menu-reactions';fs.mkdirSync(dir,{recursive:true});
const types={'.html':'text/html','.js':'application/javascript','.json':'application/json','.css':'text/css','.webp':'image/webp','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
async function route(page){await page.route('https://kitchen.test/**',async r=>{const url=new URL(r.request().url());if(url.pathname.startsWith('/.netlify/')){const op=url.searchParams.get('op');return r.fulfill({json:op==='status'?{configured:false,connected:false}:op==='state'?{state:null,etag:null}:op==='families'?{families:[]}:{announcements:[],devices:[]}})}const file=path.join(root,'dist',url.pathname==='/'?'index.html':url.pathname);try{await r.fulfill({body:fs.readFileSync(file),contentType:types[path.extname(file)]||'application/octet-stream'})}catch{await r.fulfill({status:404,body:'Missing'})}})}
const noOverflow=async(page,label)=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'horizontal overflow: '+label);
const shot=async(page,file)=>{await page.evaluate(()=>{const t=document.querySelector('#toast');if(t)t.classList.remove('visible')});await page.screenshot({path:`${dir}/${file}.jpg`,type:'jpeg',quality:70});const kb=fs.statSync(`${dir}/${file}.jpg`).size/1024;assert.ok(kb<250,`${file}.jpg is ${kb.toFixed(0)} KB (limit 250)`)};
const theme=(page,mode)=>page.evaluate(m=>{localStorage.setItem('bep-theme-mode',m);applyThemePreferences()},mode);
const targets=async(page,sel,label)=>{const small=await page.evaluate(s=>[...document.querySelectorAll(s)].filter(e=>e.offsetParent).map(e=>[e.className+' '+(e.dataset.mr||''),e.getBoundingClientRect()]).filter(([,b])=>b.width<44||b.height<44).map(([n,b])=>n+' '+Math.round(b.width)+'×'+Math.round(b.height)),sel);assert.deepEqual(small,[],'≥44px targets: '+label+' '+JSON.stringify(small))};
// Synthetic family recipes for this test only (two of each), planned for today so Menu and Today show them.
const seed=()=>{const mk=(id,name,cat,protein,ings)=>({id,name,category:cat,protein,time:20,servings:4,yield:4,ingredients:Object.entries(ings).map(([id,qty])=>({id,qty})),prep:'QA',steps:['QA'],custom:true,favorite:false,purposes:cat==='main'?['main']:['side']});
 const add=[mk('qa-ga','QA Gà kho gừng','main','chicken',{chicken:400,ginger:20}),mk('qa-bo','QA Bò xào cay','main','beef',{beef:300}),mk('qa-canh','QA Canh bí xanh','soup','pork',{gourd:300,pork:100}),mk('qa-rau','QA Rau muống xào tỏi','veg','plant',{waterSpinach:300,garlic:10})];
 for(const r of add)if(!state.recipes.some(x=>x.id===r.id))state.recipes.push(r);
 selectedDate=addDays(weekStart,1);const w=currentWeek(),day=w.days[selectedDate];w.familyMode=true;for(const t of MEAL_TYPES)if(day[t]){day[t].cooked=false;if(t!=='breakfast')day[t].recipes=[]}day.dinner.recipes=['qa-canh','qa-ga','qa-rau'].map(id=>clone(state.recipes.find(r=>r.id===id)));day.breakfast.recipes=[clone(state.recipes.find(r=>r.id==='qa-bo'))];save();view='planner';location.hash='planner';render()};
(async()=>{const browser=await chromium.launch(process.env.BEP_CHROMIUM?{executablePath:process.env.BEP_CHROMIUM}:{});
for(const [name,width,height] of [['narrow',320,740],['mobile',375,812],['tablet',820,1100],['desktop',1280,800]]){
 const phone=width<=760,context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',hasTouch:name!=='desktop',isMobile:phone}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await route(page);
 const tap=loc=>name!=='desktop'?loc.tap():loc.click();
 await page.goto('https://kitchen.test/#planner');await page.locator('#main .page-heading').waitFor({timeout:20000});await page.waitForTimeout(500);
 await page.evaluate(seed);await page.waitForTimeout(200);await theme(page,'light');
 const dinner=page.locator(`#main .mr-wrap[data-mr-recipe="qa-ga"][data-mr-type="dinner"]`).first();await dinner.waitFor();
 assert.ok(await page.locator('#main .mr-wrap').count()>=4,'bars under planned dishes');
 const like=dinner.locator('[data-mr="like"]'),dislike=dinner.locator('[data-mr="dislike"]');
 assert.equal(await like.getAttribute('aria-pressed'),'false');assert.match(await like.getAttribute('aria-label'),/Thích QA Gà kho gừng — Bố/);
 // Tap 👍 → pressed, count 1, reason chips; choose "Ngon".
 await tap(like);await page.waitForFunction(()=>document.querySelector('#main .mr-wrap[data-mr-recipe="qa-ga"][data-mr-type="dinner"] [data-mr="like"]')?.getAttribute('aria-pressed')==='true');
 assert.equal((await dinner.locator('[data-mr="like"] .mr-count').innerText()).trim(),'1');
 assert.equal(await page.evaluate(()=>document.activeElement?.dataset?.mr),'like','focus stays on the button');
 await dinner.locator('[data-reason="tasty"]').waitFor();await tap(dinner.locator('[data-reason="tasty"]'));
 assert.deepEqual(await page.evaluate(()=>state.menuReactions['dad|qa-ga'].why),['tasty']);
 await targets(page,'#main .mr-btn,#main .mr-who,#main .mr-chip,#main .mr-close',name+' menu');
 await noOverflow(page,name+' menu');
 if(name==='narrow'||name==='mobile'||name==='tablet'||name==='desktop'){await page.evaluate(()=>document.querySelector('#main .mr-wrap[data-mr-recipe="qa-ga"][data-mr-type="dinner"]').scrollIntoView({block:'center'}));await shot(page,`${name}-menu-vi-light`)}
 // Toggle off, then 👎 with a reason; the aggregate shows initials.
 await tap(like);await page.waitForFunction(()=>state.menuReactions['dad|qa-ga'].v==='none');assert.equal((await dinner.locator('[data-mr="like"] .mr-count').innerText()).trim(),'0');
 await tap(dinner.locator('[data-mr="dislike"]'));await dinner.locator('[data-reason="spicy"]').waitFor();await tap(dinner.locator('[data-reason="spicy"]'));
 assert.deepEqual(await page.evaluate(()=>[state.menuReactions['dad|qa-ga'].v,state.menuReactions['dad|qa-ga'].why]),['dislike',['spicy']]);
 await tap(dinner.locator('[data-mr="close-reasons"]'));assert.equal(await dinner.locator('.mr-reasons').count(),0);
 assert.match(await dinner.locator('.mr-avatars').innerText(),/B/);
 // On-behalf: "Cả nhà / Who?" panel — Mẹ and Bé nhỏ like it, Bé lớn dislikes; recorded by Bố.
 await tap(dinner.locator('[data-mr="who"]'));const panel=page.locator('#modal-root .mr-panel');await panel.waitFor();
 for(const [id,v] of [['mum','like'],['little','like'],['big','dislike']]){await tap(panel.locator(`.mr-person[data-mr-member="${id}"] [data-mr="${v}"]`));await page.waitForFunction(([id,v])=>state.menuReactions[id+'|qa-ga']?.v===v,[id,v])}
 assert.equal(await page.evaluate(()=>state.menuReactions['little|qa-ga'].by),'dad');assert.match(await panel.locator('.mr-person[data-mr-member="little"]').innerText(),/ghi bởi Bố/);
 await targets(page,'#modal-root .mr-btn,#modal-root .mr-chip',name+' panel');await noOverflow(page,name+' panel');
 if(name==='mobile'||name==='desktop')await shot(page,`${name}-family-panel-vi-light`);
 // Device-only: choose who is using this device.
 await panel.locator('#mr-as-member').selectOption('mum');await page.waitForFunction(()=>activeFamilyMember().id==='mum');
 await page.locator('#modal-root [data-action="close-modal"]').first().click();
 assert.equal((await dinner.locator('[data-mr="like"] .mr-count').innerText()).trim(),'2');assert.equal((await dinner.locator('[data-mr="dislike"] .mr-count').innerText()).trim(),'2');
 assert.equal(await dinner.locator('[data-mr="like"]').getAttribute('aria-pressed'),'true','pressed state follows Mẹ now');
  await page.evaluate(()=>{familyStorage.setItem('bep-active-member','dad');render()});
 // Recipe view: open the dish, react inside the recipe modal.
 await tap(page.locator('#main .family-dish[data-type="dinner"]').filter({hasText:'QA Rau muống'}).first());const rp=page.locator('#modal-root .mr-recipe .mr-panel');await rp.waitFor();
 for(const id of ['dad','mum','big','little']){await tap(rp.locator(`.mr-person[data-mr-member="${id}"] [data-mr="like"]`));await page.waitForFunction(id=>state.menuReactions[id+'|qa-rau']?.v==='like',id)}
 await noOverflow(page,name+' recipe');if(name==='tablet')await shot(page,`${name}-recipe-view-vi-light`);
 await page.keyboard.press('Escape');await page.locator('#modal-root .modal').waitFor({state:'detached',timeout:5000}).catch(async()=>{await page.evaluate(()=>closeModal())});
 // Everyone likes the vegetable dish → the plan explains it.
 assert.match(await page.locator('#main .mr-wrap[data-mr-recipe="qa-rau"][data-mr-type="dinner"] .mr-why').innerText(),/Cả nhà thích/);
 assert.match(await page.locator('#main .mr-wrap[data-mr-recipe="qa-ga"][data-mr-type="dinner"] .mr-why').innerText(),/Bố và Bé lớn không thích món này/);
 // Today view shows the same bars.
 await page.evaluate(()=>{view='today';location.hash='today';render()});await page.locator('#main .mr-wrap').first().waitFor();assert.ok(await page.locator('#main .mr-wrap[data-mr-recipe="qa-rau"]').count()>=1);
 await tap(page.locator('#main .mr-wrap[data-mr-recipe="qa-canh"] [data-mr="like"]').first());await page.waitForFunction(()=>state.menuReactions['dad|qa-canh']?.v==='like');
 await noOverflow(page,name+' today');if(name==='narrow'||name==='mobile'){await page.evaluate(()=>document.querySelector('#main .mr-wrap[data-mr-recipe="qa-canh"]').scrollIntoView({block:'center'}));await shot(page,`${name}-today-vi-light`)}
 // Suggestions reflect reactions: the liked dish ranks first among family recipes and its reason says so.
 const top=await page.evaluate(()=>recipeSuggestions(state,{limit:4}).map(x=>x.recipe.id));assert.equal(top[0],'qa-rau','liked dish first: '+top);
 assert.match(await page.evaluate(()=>suggestionReason(recipeSuggestions(state,{limit:1})[0])),/Cả nhà thích/);
 // Offline: reactions still save on this device.
 await context.setOffline(true);await page.evaluate(()=>{view='planner';location.hash='planner';render()});const off=page.locator('#main .mr-wrap[data-mr-recipe="qa-bo"] [data-mr="dislike"]').first();await off.waitFor();await tap(off);
 await page.waitForFunction(()=>JSON.parse(familyStorage.getItem('bep-gia-dinh-v1')).menuReactions['dad|qa-bo']?.v==='dislike');await context.setOffline(false);
 // Family tastes (Insights), linked from Menu; EN + dark.
 await tap(page.locator('#main [data-mr="open-tastes"]'));const tastes=page.locator('#family-tastes');await tastes.waitFor();
 const text=await tastes.innerText();assert.match(text,/Khẩu vị gia đình/);assert.match(text,/QA Rau muống xào tỏi/);assert.match(text,/Nên tránh/);assert.match(text,/Từng người/);assert.match(text,/7 ngày qua/);
 await noOverflow(page,name+' insights vi');await page.evaluate(()=>changeAppLanguage('en'));await theme(page,'dark');await page.locator('#family-tastes').waitFor();
 const en=await page.locator('#family-tastes').innerText();assert.match(en,/Family tastes/);assert.match(en,/Family favourites/);assert.match(en,/Dishes to avoid/);assert.doesNotMatch(en,/Khẩu vị/);
 await noOverflow(page,name+' insights en dark');await page.evaluate(()=>document.getElementById('family-tastes').scrollIntoView({block:'start'}));await shot(page,`${name}-tastes-en-dark`);
 await page.evaluate(()=>{view='planner';location.hash='planner';render()});const enBar=page.locator('#main .mr-wrap[data-mr-recipe="qa-ga"][data-mr-type="dinner"]');await enBar.waitFor();assert.match(await enBar.locator('[data-mr="like"]').getAttribute('aria-label'),/^Like QA .+ — Bố/);assert.match(await enBar.locator('.mr-why').innerText(),/Bố and Bé lớn don’t like this dish/);
 await noOverflow(page,name+' menu en dark');if(name==='mobile'||name==='desktop'||name==='tablet'){await enBar.scrollIntoViewIfNeeded();await shot(page,`${name}-menu-en-dark`)}
 // Reduced motion: no transition on the reaction buttons.
 assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('#main .mr-btn')).transitionDuration),'0s');
 // Empty state on a fresh device explains how to react.
 if(name==='mobile'){await page.evaluate(()=>{delete state.menuReactions;save();changeAppLanguage('vi');view='insights';location.hash='insights';render()});assert.match(await page.locator('#family-tastes').innerText(),/Chưa có cảm nhận nào/);await theme(page,'light');await page.evaluate(()=>document.getElementById('family-tastes').scrollIntoView({block:'start'}));await shot(page,`${name}-tastes-empty-vi-light`)}
 assert.deepEqual(errors,[],'no page errors at '+name);await context.close();console.log('✓',name,width+'×'+height);
}
await browser.close();console.log('Menu reactions browser tests passed.');})().catch(e=>{console.error(e);process.exit(1)});
