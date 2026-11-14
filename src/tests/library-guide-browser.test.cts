// v1.7 owner feedback (iPhone, dark, EN): the recipe Library chips are consolidated into one scrollable row + a Filters
// sheet (diet, ≤20 min) with an active-filter badge and clear-all; page size 10/20/50/100 is remembered and "Xem thêm"
// loads more; cards show only image + name, tapping the name expands details (aria-expanded), tapping the image opens the
// recipe. Today shows an inline "Get started" card (never a startup modal) that opens a swipeable tour; steps follow the
// Studio feature flags, completion is remembered, and the guide re-opens from More (phone) / sidebar (tablet, desktop).
// Screenshots at 320×740, 375×812, 820×1100 and 1280×800 (VI/EN, light/dark) go to docs/reviews/v1.7/library-guide.
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert');
const root=process.cwd(),dir='docs/reviews/v1.7/library-guide';fs.mkdirSync(dir,{recursive:true});
const types={'.html':'text/html','.js':'application/javascript','.json':'application/json','.css':'text/css','.webp':'image/webp','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
async function route(page){await page.route('https://kitchen.test/**',async r=>{const url=new URL(r.request().url());if(url.pathname.startsWith('/.netlify/')){const op=url.searchParams.get('op');return r.fulfill({json:op==='status'?{configured:false,connected:false}:op==='state'?{state:null,etag:null}:op==='families'?{families:[]}:{announcements:[],devices:[]}})}const file=path.join(root,'dist',url.pathname==='/'?'index.html':url.pathname);try{await r.fulfill({body:fs.readFileSync(file),contentType:types[path.extname(file)]||'application/octet-stream'})}catch{await r.fulfill({status:404,body:'Missing'})}})}
const noOverflow=async(page,label)=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'horizontal overflow: '+label);
const quietToast=page=>page.locator('#toast.visible').waitFor({state:'hidden',timeout:10000}).catch(()=>{});
const shot=async(page,file)=>{await page.evaluate(()=>{const t=document.querySelector('#toast');if(t)t.classList.remove('visible')});await page.screenshot({path:`${dir}/${file}.jpg`,type:'jpeg',quality:72});const kb=fs.statSync(`${dir}/${file}.jpg`).size/1024;assert.ok(kb<250,`${file}.jpg is ${kb.toFixed(0)} KB (limit 250)`)};
const theme=(page,mode)=>page.evaluate(m=>{localStorage.setItem('bep-theme-mode',m);applyThemePreferences()},mode);
// Expected counts come from catalogue fields / ingredient diet labels, independent of the chip code (as in v1.6).
const expected=(page,{cat='all',key='all',diet='all',time='all'})=>page.evaluate(([cat,key,diet,time])=>{const meta=r=>libraryRecipeMeta(r),test={all:()=>true,western:r=>recipeCuisine(meta(r))==='western','seed-salad':r=>meta(r).recipeKind==='seed-salad',dressing:r=>meta(r).recipeKind==='dressing',healthy:r=>recipeMatchesLibraryTag(r,'healthy'),vegetarian:r=>['vegan','vegetarian','check'].includes(recipeDiet(r)),vegan:r=>recipeDiet(r)==='vegan'};return state.recipes.filter(r=>!ownRecipe(r)&&(cat==='all'||r.category===cat)&&test[key](r)&&test[diet](r)&&(time==='all'||(+r.time||0)<=20)).length},[cat,key,diet,time]);
const statusCount=async page=>+((await page.locator('#family-recipe-status').innerText()).match(/^(\d+)/)||[])[1];
const badge=async loc=>+(await loc.locator('.chip-count').innerText());
async function openPage(browser,{width,height,touch,mobile,storage}){const context=await browser.newContext({locale:'vi-VN',viewport:{width,height},reducedMotion:'reduce',hasTouch:touch,isMobile:mobile});if(storage)await context.addInitScript(s=>{if(!sessionStorage.getItem('qa-seeded')){for(const [k,v] of Object.entries(s))localStorage.setItem(k,v);sessionStorage.setItem('qa-seeded','1')}},storage);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await route(page);return {context,page,errors}}
(async()=>{const browser=await chromium.launch(process.env.BEP_CHROMIUM?{executablePath:process.env.BEP_CHROMIUM}:{});
for(const [name,width,height] of [['narrow',320,740],['mobile',375,812],['tablet',820,1100],['desktop',1280,800]]){
 const phone=width<=760,{context,page,errors}=await openPage(browser,{width,height,touch:name!=='desktop',mobile:phone});
 const tap=loc=>phone?loc.tap():loc.click();
 // ---------- Today: inline guide card, no blocking modal at startup ----------
 await page.goto('https://kitchen.test/');await page.locator('#main .page-heading').waitFor({timeout:20000});await page.waitForTimeout(800);
 assert.equal(await page.locator('#modal-root .modal').count(),0,'no startup modal');
 const card=page.locator('#main .guide-card');await card.waitFor();assert.match(await card.innerText(),/Bắt đầu với Bếp Nhà/);
 // v1.7.10 (owner, 7 Nov 2026): the kitchen / voice buttons stay right under the title on every page, so the welcome card comes right after them
 assert.ok(await page.evaluate(()=>{const h=document.querySelector('.page-heading'),n=h.nextElementSibling;return n.classList.contains('guide-card')||n.classList.contains('kitchen-action-dock')&&n.nextElementSibling.classList.contains('guide-card')}),'card sits right under the heading and its kitchen / voice buttons');
 const closeBox=await card.locator('.guide-card-close').boundingBox();assert.ok(closeBox.width>=44&&closeBox.height>=44,'dismiss target ≥44px');
 await quietToast(page);await noOverflow(page,name+' today');await theme(page,'light');await page.evaluate(()=>document.querySelector('.guide-card').scrollIntoView({block:'center'}));await shot(page,`${name}-today-card-vi-light`);
 // Tour: progress dots, Next/Back, keyboard arrows, swipe, Show me buttons.
 await tap(card.locator('[data-guide="open"]'));await page.locator('[data-guide-tour]').waitFor();
 const ids=()=>page.evaluate(()=>guideSteps.map(s=>s.id)),total=(await ids()).length;assert.deepEqual(await ids(),['welcome','menu','shopping','scout','family','voice','alerts']);
 assert.equal(await page.locator('.guide-dot').count(),total);assert.match(await page.locator('#guide-progress').innerText(),new RegExp(`1/${total}`,'i'));assert.ok(await page.locator('#guide-back').isDisabled(),'Back disabled on step 1');
 await page.locator('#guide-next').click();assert.equal(await page.locator('.guide-step').getAttribute('data-step-id'),'menu');assert.equal(await page.locator('.guide-dot.active').count(),1);assert.ok(await page.locator('.guide-show a[href="#recipes"]').count(),'menu step can show the Library');
 assert.match(await page.locator('.guide-step').innerText(),/125 món tham khảo/);
 await page.locator('#guide-back').click();assert.equal(await page.locator('.guide-step').getAttribute('data-step-id'),'welcome');
 await page.keyboard.press('ArrowRight');assert.equal(await page.locator('.guide-step').getAttribute('data-step-id'),'menu','ArrowRight moves on');
 const vp=await page.locator('#guide-viewport').boundingBox();await page.mouse.move(vp.x+vp.width*0.8,vp.y+40);await page.mouse.down();await page.mouse.move(vp.x+vp.width*0.2,vp.y+44,{steps:4});await page.mouse.up();assert.equal(await page.locator('.guide-step').getAttribute('data-step-id'),'shopping','swipe left = next');
 await page.locator('#guide-next').click();assert.equal(await page.locator('.guide-step').getAttribute('data-step-id'),'scout');
 await noOverflow(page,name+' tour');for(const b of await page.locator('.guide-nav .btn:visible').all()){const box=await b.boundingBox();assert.ok(box.height>=44,'tour buttons ≥44px')}
 if(name==='mobile'||name==='desktop')await shot(page,`${name}-tour-vi-light`);
 // "Show me" jumps to the tab and closes the tour without marking it complete.
 await page.locator('.guide-show a[href="#shopping"]').click();await page.waitForFunction(()=>location.hash==='#shopping'&&!document.querySelector('#modal-root .modal'));assert.equal(await page.evaluate(()=>localStorage.getItem('bep-guide-v1')),null);
 await page.evaluate(()=>{location.hash='today'});await card.waitFor();
 // Skip hides the card; it does not come back after reload.
 await tap(card.locator('[data-guide="open"]'));await page.locator('[data-guide-tour]').waitFor();await page.locator('#guide-skip').click();await page.waitForFunction(()=>!document.querySelector('#modal-root .modal'));assert.equal(await page.locator('.guide-card').count(),0);assert.equal(await page.evaluate(()=>localStorage.getItem('bep-guide-v1')),'skipped');
 await page.reload();await page.locator('#main .page-heading').waitFor();await page.waitForTimeout(600);assert.equal(await page.locator('.guide-card').count(),0,'card stays hidden after skip');
 // Re-open: More (phone) or sidebar (tablet/desktop); finish the tour.
 if(phone){await quietToast(page);await tap(page.locator('[data-ui-more]'));const more=page.locator('#modal-root .more-guide');await more.waitFor();assert.match(await more.innerText(),/Hướng dẫn sử dụng/);await tap(more)}else{const side=page.locator('.side-bottom .guide-side-link');assert.ok(await side.isVisible(),'sidebar link');await side.click()}
 await page.locator('[data-guide-tour]').waitFor();assert.equal(await page.locator('.guide-step').getAttribute('data-step-id'),'welcome','re-open starts at step 1');
 for(let i=1;i<total;i++)await page.locator('#guide-next').click();assert.equal(await page.locator('#guide-next').getAttribute('data-guide'),'finish');assert.ok(await page.locator('#guide-skip').isHidden(),'Skip hidden on the last step');assert.match(await page.locator('.guide-step').innerText(),/Thêm → Hướng dẫn sử dụng/);
 await page.locator('#guide-next').click();await page.waitForFunction(()=>!document.querySelector('#modal-root .modal'));assert.equal(await page.evaluate(()=>localStorage.getItem('bep-guide-v1')),'done');assert.equal(await page.locator('.guide-card').count(),0);
 // Studio flags: Price Scout, voice and urgent messages off → those steps/lines disappear.
 await page.evaluate(()=>{applyPlatformFlags({priceScout:false,voice:false,urgentMessages:false});openGuide(0)});assert.deepEqual(await ids(),['welcome','menu','shopping','family','alerts']);assert.equal(await page.locator('.guide-dot').count(),5);
 for(let i=1;i<5;i++)await page.locator('#guide-next').click();assert.doesNotMatch(await page.locator('.guide-step').innerText(),/khẩn/,'urgent line hidden when urgent messages are off');
 await page.evaluate(()=>{closeModal();applyPlatformFlags({priceScout:true,voice:true,urgentMessages:true})});
 // EN + dark tour (screenshot) and the card copy in English for a fresh device.
 await page.evaluate(()=>{localStorage.removeItem('bep-guide-v1');guideIndex=0;changeAppLanguage('en');location.hash='today'});await theme(page,'dark');await card.waitFor();assert.match(await card.innerText(),/Get started with FamTray/);
 await page.evaluate(()=>document.querySelector('.guide-card').scrollIntoView({block:'center'}));await shot(page,`${name}-today-card-en-dark`);
 await card.locator('[data-guide="open"]').click();await page.locator('[data-guide-tour]').waitFor();await page.locator('#guide-next').click();assert.match(await page.locator('.guide-step').innerText(),/Menu & recipe library/);assert.match(await page.locator('#guide-next').innerText(),/Next/);await noOverflow(page,name+' tour EN');await shot(page,`${name}-tour-en-dark`);
 await page.evaluate(()=>{closeModal();changeAppLanguage('vi')});await theme(page,'light');

 // ---------- Library ----------
 await page.evaluate(()=>{location.hash='recipes'});await page.locator('#family-recipe-search').waitFor();await page.locator('[data-fm="samples"]').first().click();await quietToast(page);
 const row=page.locator('#family-recipe-chips .lib-cat-row');
 // One row: every main chip on the same line; diet/time chips are not in the row.
 const tops=await row.locator('.chip').evaluateAll(els=>[...new Set(els.map(e=>Math.round(e.offsetTop)))]);assert.equal(tops.length,1,'category chips stay on one line');
 // v1.7.5 owner order (Phân loại món ăn): Món chính, Món phụ, Món canh / soup, Món sợi; empty dish types (dessert, snack,
 // lunch box) have no chip until the family has such a recipe.
 assert.deepEqual(await row.locator('.chip').evaluateAll(els=>els.map(e=>e.dataset.key)),['all','main','veg','soup','noodle','western','dressing','breakfast','lunch','dinner'],'v1.7.10: the Salad hạt chip went with the retired seed-salad mixes; v1.7.21 (Henry, 14 Nov 2026): meal chips follow, empty ones (Bữa phụ) and Hay nấu before anything is cooked have none');
 assert.equal(await page.locator('#family-recipe-chips [data-fm="diet-filter"],#family-recipe-chips [data-fm="time-filter"]').count(),0,'diet/time live in the Filters sheet');
 const rowBox=await page.locator('#family-recipe-chips').boundingBox();assert.ok(rowBox.height<=(phone?72:72),`chip area is compact (${rowBox.height}px)`);
 if(phone)assert.ok(await row.evaluate(e=>e.scrollWidth>e.clientWidth),'row scrolls sideways on a phone');
 // Category/kind counts in the row equal the catalogue.
 assert.equal(await badge(row.locator('[data-key="all"]')),await expected(page,{}));
 for(const cat of ['main','soup','veg','noodle'])assert.equal(await badge(row.locator(`[data-key="${cat}"]`)),await expected(page,{cat}),cat+' badge');
 for(const key of ['western','dressing'])assert.equal(await badge(row.locator(`[data-key="${key}"]`)),await expected(page,{key}),key+' badge');
 // Filters sheet: aria-expanded, diet counts, time label, badge, clear-all, Escape.
 const filterBtn=page.locator('#family-recipe-chips .lib-filter-btn');assert.equal(await filterBtn.getAttribute('aria-expanded'),'false');const fbBox=await filterBtn.boundingBox();assert.ok(fbBox.height>=44&&fbBox.width>=44);
 await tap(filterBtn);await page.locator('#family-filter-panel').waitFor();assert.equal(await filterBtn.getAttribute('aria-expanded'),'true');
 for(const diet of ['healthy','vegetarian','vegan'])assert.equal(await badge(page.locator(`#family-filter-panel [data-key="${diet}"]`)),await expected(page,{diet}),diet+' badge');
 assert.match(await page.locator('#family-filter-panel [data-fm="time-filter"]').innerText(),/≤20 phút/);
 await tap(page.locator('#family-filter-panel [data-key="vegan"]'));assert.equal(await statusCount(page),await expected(page,{diet:'vegan'}));await tap(page.locator('#family-filter-panel [data-fm="time-filter"]'));assert.equal(await statusCount(page),await expected(page,{diet:'vegan',time:'20'}),'vegan ∧ ≤20');
 assert.equal(await page.locator('.lib-filter-btn .lib-filter-badge').innerText(),'2','active-filter badge');
 await tap(row.locator('[data-key="noodle"]'));assert.equal(await statusCount(page),await expected(page,{cat:'noodle',diet:'vegan',time:'20'}),'row chip ∧ sheet filters');
 assert.equal(await badge(row.locator('[data-key="soup"]')),await expected(page,{cat:'soup',diet:'vegan',time:'20'}),'row counts follow the sheet filters');
 await tap(row.locator('[data-key="western"]'));assert.equal(await statusCount(page),await expected(page,{cat:'noodle',key:'western',diet:'vegan',time:'20'}));
 if(name==='mobile'||name==='tablet'){await page.evaluate(()=>{const el=document.querySelector('.filter-bar');window.scrollTo(0,el.getBoundingClientRect().top+scrollY-70)});await shot(page,`${name}-filters-sheet-vi-light`)}
 await tap(page.locator('#family-filter-panel [data-fm="clear-filters"]'));assert.equal(await statusCount(page),await expected(page,{}),'clear-all');assert.equal(await page.locator('.lib-filter-btn .lib-filter-badge').count(),0);assert.equal(await page.evaluate(()=>document.activeElement?.classList.contains('lib-filter-btn')),true,'focus returns to Filters');
 assert.ok(await page.locator('#family-filter-panel').isVisible(),'sheet stays open after clear-all');await page.locator('#family-filter-panel [data-key="healthy"]').focus();await page.keyboard.press('Escape');assert.equal(await page.locator('#family-filter-panel').count(),0,'Escape closes the sheet');assert.equal(await filterBtn.getAttribute('aria-expanded'),'false');
 // Page size 10/20/50/100, result count, load more, persistence.
 const cards=page.locator('#family-recipe-results .lib-card'),total740=await expected(page,{});assert.equal(await cards.count(),20,'default 20');assert.match(await page.locator('.lib-shown').innerText(),new RegExp(`Đang hiện 20/${total740} món`));
 for(const n of [10,50,100]){await tap(page.locator(`[data-fm="page-size"][data-id="${n}"]`));assert.equal(await cards.count(),n,'page size '+n);assert.equal(await page.locator(`[data-fm="page-size"][data-id="${n}"]`).getAttribute('aria-pressed'),'true')}
 await tap(page.locator('[data-fm="page-size"][data-id="10"]'));await page.locator('[data-fm="load-more"]').click();assert.equal(await cards.count(),20,'load more adds one page');assert.match(await page.locator('.lib-shown').innerText(),new RegExp(`20/${total740}`));assert.ok(await page.evaluate(()=>document.activeElement?.classList.contains('lib-card-toggle')),'focus moves to the first new card');
 assert.equal(await page.evaluate(()=>localStorage.getItem('bep-library-page-size')),'10');
 await page.reload();await page.locator('#family-recipe-search').waitFor();await page.locator('[data-fm="samples"]').first().click();assert.equal(await cards.count(),10,'page size remembered after reload');assert.equal(await page.locator('[data-fm="page-size"][data-id="10"]').getAttribute('aria-pressed'),'true');
 await page.locator('#family-recipe-search').fill('zzqqxx');await page.waitForTimeout(300);assert.equal(await page.locator('.lib-more-bar').count(),0);await page.locator('#family-recipe-search').fill('');await page.waitForTimeout(300);
 await tap(page.locator('[data-fm="page-size"][data-id="20"]'));
 // Collapsed card = image + name only; name toggles details (aria-expanded); image opens the recipe.
 const first=cards.first(),name0=await first.locator('h3').innerText();
 assert.equal((await first.innerText()).trim(),name0,'collapsed card shows only the name (plus image)');assert.ok(await first.locator('.lib-card-more').isHidden());
 assert.equal(await page.locator('#family-recipe-results .recipe-card .btn[data-action="recipe-detail"]').count(),0,'no separate View button');
 assert.equal(await first.locator('.lib-card-img').getAttribute('aria-label'),'Xem '+name0);assert.equal(await first.locator('.lib-card-img').evaluate(e=>e.tagName),'BUTTON');
 const toggle=first.locator('.lib-card-toggle');assert.equal(await toggle.getAttribute('aria-expanded'),'false');const tBox=await toggle.boundingBox();assert.ok(tBox.height>=44,'toggle ≥44px');
 await tap(toggle);assert.equal(await toggle.getAttribute('aria-expanded'),'true');assert.ok(await first.locator('.lib-card-more').isVisible());const more=await first.locator('.lib-card-more').innerText();assert.match(more,/nguyên liệu · \d+ phút · \d+ suất gốc/);assert.ok(await first.locator('[data-action="add-to-meal"]').isVisible(),'Add to meal in the expanded card');
 if(name!=='desktop'){await page.evaluate(()=>{const el=document.querySelector('.lib-results-head');window.scrollTo(0,el.getBoundingClientRect().top+scrollY-70)});await shot(page,`${name}-library-vi-light`)}
 await toggle.focus();await page.keyboard.press('Enter');assert.equal(await toggle.getAttribute('aria-expanded'),'false','keyboard toggles');await page.keyboard.press('Space');assert.equal(await toggle.getAttribute('aria-expanded'),'true');
 await tap(first.locator('[data-action="add-to-meal"]'));await page.locator('#add-to-meal-form').waitFor();await page.evaluate(()=>closeModal());
 await tap(cards.nth(1).locator('.lib-card-img'));await page.locator('.recipe-detail-hero').waitFor();assert.match(await page.locator('#modal-root').innerText(),new RegExp((await cards.nth(1).locator('h3').innerText()).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));await page.evaluate(()=>closeModal());
 const cols=await page.evaluate(()=>getComputedStyle(document.querySelector('.lib-grid')).gridTemplateColumns.split(' ').length);assert.ok(phone?cols===2:cols>=3,`${name}: ${cols} columns`);
 await noOverflow(page,name+' library');
 // EN + dark: "≤20 min", English labels, screenshot.
 await page.evaluate(()=>changeAppLanguage('en'));await theme(page,'dark');await page.locator('#family-recipe-search').waitFor();await tap(page.locator('#family-recipe-chips .lib-filter-btn'));await page.locator('#family-filter-panel').waitFor();assert.match(await page.locator('#family-filter-panel [data-fm="time-filter"]').innerText(),/≤20 min/);assert.match(await page.locator('#family-recipe-chips').innerText(),/Filters/);
 await tap(page.locator('#family-filter-panel [data-fm="time-filter"]'));assert.match(await page.locator('#family-recipe-status').innerText(),/≤20 min/);assert.doesNotMatch(await page.locator('#family-recipe-status').innerText(),/20p/);assert.match(await page.locator('.lib-page-size').innerText(),/Show/);
 await page.evaluate(()=>{const el=document.querySelector('.filter-bar');window.scrollTo(0,el.getBoundingClientRect().top+scrollY-70)});await noOverflow(page,name+' library EN');await shot(page,`${name}-library-en-dark`);
 await page.evaluate(()=>changeAppLanguage('vi'));
 assert.deepEqual(errors,[],name+' page errors');await context.close()}
// Storage blocked for these keys (private mode / blocked site data): defaults are used and nothing throws.
{const context=await browser.newContext({locale:'vi-VN',viewport:{width:375,height:812}});await context.addInitScript(()=>{const g=Storage.prototype.getItem,s=Storage.prototype.setItem,blocked=k=>/^bep-(guide|library)/.test(String(k));Storage.prototype.getItem=function(k){if(blocked(k))throw new Error('blocked');return g.call(this,k)};Storage.prototype.setItem=function(k,v){if(blocked(k))throw new Error('blocked');return s.call(this,k,v)}});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await route(page);
 await page.goto('https://kitchen.test/');await page.locator('#main .guide-card').waitFor({timeout:20000});await page.locator('#main .guide-card [data-guide="dismiss"]').click();assert.equal(await page.locator('.guide-card').count(),0,'dismiss works without storage');
 await page.evaluate(()=>{location.hash='recipes'});await page.locator('#family-recipe-search').waitFor();await page.locator('[data-fm="samples"]').first().click();assert.equal(await page.locator('#family-recipe-results .lib-card').count(),20,'default page size without storage');await page.locator('[data-fm="page-size"][data-id="50"]').click();assert.equal(await page.locator('#family-recipe-results .lib-card').count(),50);
 assert.deepEqual(errors,[],'no errors with blocked storage');await context.close()}
await browser.close();console.log('PASS library: one chip row + Filters sheet (badge, clear-all, Escape) with catalogue counts; page size 10/20/50/100 remembered + load more; image+name cards expand (aria-expanded) and image opens the recipe · guide: inline Today card (no startup modal), tour Next/Back/arrow/swipe/Show me/Skip/Finish, remembered, re-open from More/sidebar, flag-off steps hidden · VI/EN light/dark at 320/375/820/1280, no overflow')})().catch(e=>{console.error(e);process.exit(1)});
