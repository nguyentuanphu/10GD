// v1.7.3 owner report (iPhone, production v1.7.2): "Vẫn chưa thấy nguyên liệu" — Mỳ Quảng (Tôm - Thịt) opened from a
// meal showed the heading "Nguyên liệu cho phần món trong bữa này" over an empty box. Henry had entered the ingredients
// row by row with units in the v1.7.1 rows form and saved. Chromium with touch emulation and an iPhone user agent
// (simulation only, not physical devices):
//  (a) Henry's path: the dish is already in a meal while its recipe is empty → edit the recipe with rows by touch
//      (Mì Quảng 500 g, Tôm 300 g, Thịt heo 300 g, Tỏi 3 tép, Nước mắm 2 muỗng canh) → open the dish from Today →
//      every line shows (scaled where countable, verbatim + "không tính đi chợ" otherwise) and the shopping list follows.
//  (a′) data already saved under v1.7.2 (recipe has rows, the meal copy is still empty) shows without re-entering.
//  (b) a recipe saved before v1.7.1 with free-text lines; (c) zero ingredients → empty state + "Thêm nguyên liệu" opens
//      the form at the ingredient rows; (d) "Chép thành món nhà" from the library; (e) two signed-in devices: device A
//      saves, device B loads the family state and sees the same lines.
//  Screenshots 375×812 VI/EN light/dark, 820×1100 and 1280×800 → docs/reviews/v1.7.3/recipe-ingredients.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,existsSync,statSync} from 'node:fs';
import {extname} from 'node:path';
import {chromium,devices} from 'playwright';
const origin='https://kitchen.test',out='docs/reviews/v1.7.3/recipe-ingredients';mkdirSync(out,{recursive:true});
// v1.7.19 (rule 29): the row's unit is chosen in the shared unit picker (a sheet over the editor), not a plain list.
const pickRcUnit=async(page:any,row:any,unit:string)=>{await row.locator('.rc-ing-unit').click();const chip=page.locator(`#unit-sheet-layer .unit-chip[data-unit-choice="${unit}"]`).first();await page.locator('#unit-sheet-layer .unit-chip').first().waitFor();if(!(await chip.isVisible()))await page.locator('#unit-sheet-layer [data-unit-action="show-all"]').click();await chip.click();await page.locator('#unit-sheet-layer [data-unit-sheet-act="save"]').click();await page.locator('#unit-sheet-layer').waitFor({state:'detached'})};
const mime:any={'.js':'application/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.json':'application/json','.webmanifest':'application/manifest+json'};
const IPHONE=devices['iPhone 13'].userAgent,IPAD=devices['iPad Pro 11'].userAgent;
const sizes:any={mobile:{width:375,height:812},tablet:{width:820,height:1100},desktop:{width:1280,height:800}};
const ROWS=[['Mì Quảng','500','g'],['Tôm','300','g'],['Thịt heo','300','g'],['Tỏi','3','tép'],['Nước mắm','2','muỗng canh']];
const NOTES=['Tỏi 3 tép','Nước mắm 2 muỗng canh'];
(async()=>{
 const {memoryStores}=await import('./helpers/accounts.mjs');
 const {createAccountsHandler}=await import('../netlify/lib/accounts.mjs');
 const getStoreFn=memoryStores(),accounts=createAccountsHandler({getStoreFn});
 const reg=async(u:string)=>{const r=await accounts(new Request(origin+'/.netlify/functions/accounts?op=register',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','x-nf-client-connection-ip':'r-'+u},body:JSON.stringify({username:u,name:u,password:'synthetic-ingredients-42',trust:true})}));assert.equal(r.status,201);return r.headers.get('set-cookie')!.split(';')[0]};
 const fam=async(cookie:string,name:string)=>{const r=await accounts(new Request(origin+'/.netlify/functions/accounts?op=create-family',{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json','x-nf-client-connection-ip':'f'},body:JSON.stringify({name})}));assert.equal(r.status,201);return (await r.json()).household.id};
 const dadCookie=await reg('qa-dad'),householdId=await fam(dadCookie,'Nhà QA Mỳ Quảng');
 // Family state on the server is stored verbatim (src/netlify/functions/family.mts op=state); an in-memory copy here.
 const cloud:any={state:null,etag:0,puts:0};
 const browser=await chromium.launch();
 const cookieOf=(c:string)=>({name:c.split('=')[0],value:c.split('=').slice(1).join('='),domain:'kitchen.test',path:'/',secure:true,httpOnly:true,sameSite:'Strict' as const});
 const route=(page:any,{account}:{account:boolean})=>page.route(origin+'/**',async(r:any)=>{const req=r.request(),url=new URL(req.url()),fn=url.pathname.match(/^\/\.netlify\/functions\/([\w-]+)/),op=url.searchParams.get('op')||'';
  if(fn?.[1]==='studio'&&op==='banner')return r.fulfill({json:{banner:null,maintenance:null,minAppEdition:null,flags:{communityRecipes:true,voice:true}}});
  if(fn?.[1]==='accounts'&&!account){const res=await accounts(new Request(url.href,{method:req.method(),headers:await req.allHeaders(),body:['GET','HEAD'].includes(req.method())?undefined:req.postDataBuffer()}));return r.fulfill({status:res.status,headers:Object.fromEntries(res.headers),body:Buffer.from(await res.arrayBuffer())})}
  if(fn&&account){
   if(fn[1]==='accounts'&&op==='families')return r.fulfill({json:{families:[{id:householdId,name:'Nhà QA Mỳ Quảng',role:'owner'}],account:{username:'qa-dad',name:'Ba'}}});
   const st={configured:true,connected:true,mode:'account',account:{username:'qa-dad',name:'Ba'},household:{id:householdId,name:'Nhà QA Mỳ Quảng',role:'owner',memberId:null}};
   if(fn[1]==='family'&&op==='status')return r.fulfill({json:st});
   if(fn[1]==='family'&&op==='state'&&req.method()==='GET')return r.fulfill({json:{state:cloud.state,etag:cloud.state?'e'+cloud.etag:null}});
   if(fn[1]==='family'&&op==='state'&&req.method()==='PUT'){const body=JSON.parse(req.postData());cloud.state=body.state;cloud.etag++;cloud.puts++;return r.fulfill({json:{etag:'e'+cloud.etag}})}
   return r.fulfill({json:{announcements:[],devices:[],alerts:[]}})}
  if(fn)return r.fulfill({status:401,json:{error:'no'}});
  const file='dist'+(url.pathname==='/'?'/index.html':url.pathname);if(existsSync(file))return r.fulfill({status:200,contentType:mime[extname(file)]||'application/octet-stream',body:readFileSync(file)});return r.fulfill({status:404,body:''})});
 const noOverflow=async(page:any,label:string)=>{const w=await page.evaluate(()=>Math.max(document.documentElement.scrollWidth-innerWidth,...[...document.querySelectorAll('#modal-root .modal')].map((m:any)=>m.scrollWidth-m.clientWidth)));assert.ok(w<=1,label+' horizontal overflow '+w)};
 const shot=async(page:any,name:string)=>{await page.evaluate(()=>{const t=document.querySelector('#toast');if(t)t.className=''});await page.waitForTimeout(150);const f=`${out}/${name}.jpg`;await page.screenshot({path:f,type:'jpeg',quality:70});const kb=statSync(f).size/1024;assert.ok(kb<250,`${name}.jpg is ${kb.toFixed(0)} KB`)};
 // The app's “today” follows the family time zone (Australia/Sydney) while seeding uses the browser's local date, so the
// browser runs in Sydney time; in UTC the dates differ from 13:00 to 24:00 UTC and today's dinner was seeded on yesterday.
async function openApp({viewport=sizes.mobile,ua=IPHONE,touch=true,lang='vi',theme='light',account=false,hash='today',context:given}:any={}){
  const context=given||await browser.newContext({locale:'vi-VN',viewport,userAgent:ua,hasTouch:touch,isMobile:touch&&viewport.width<900,serviceWorkers:'block',reducedMotion:'reduce',colorScheme:theme==='dark'?'dark':'light',timezoneId:'Australia/Sydney'});
  if(!given){await context.addInitScript(({account}:any)=>{if(sessionStorage.getItem('qa-init'))return;sessionStorage.setItem('qa-init','1');localStorage.setItem('bep-guide-done','1');if(account)localStorage.setItem('bep-account-present','yes');else localStorage.setItem('bep-local-locked','yes')},{account});if(account)await context.addCookies([cookieOf(dadCookie)])}
  const page=await context.newPage(),errors:string[]=[];page.on('pageerror',(e:any)=>errors.push(e.message));await route(page,{account});
  await page.goto(origin+'/#'+hash);await page.locator('#main .page-heading').waitFor({timeout:30000});await page.waitForTimeout(account?1500:600);await page.waitForFunction(()=>typeof appLanguage!=='undefined'&&typeof rcEnabled==='function'&&typeof recipeIngredientRows==='function',null,{timeout:30000});
  await setLook(page,lang,theme);
  const tap=(loc:any)=>touch?loc.tap():loc.click();
  return{context,page,errors,tap}}
 const setLook=(page:any,lang:string,theme:string)=>page.evaluate(({lang,theme}:any)=>{localStorage.setItem('bep-theme-mode',theme);if(typeof applyThemePreferences==='function')applyThemePreferences();if(appLanguage!==lang)changeAppLanguage(lang);closeModal();render()},{lang,theme});
 const today=(page:any)=>page.evaluate(()=>isoDate(new Date()));
 // A meal dish exactly like the app adds it (clone of the recipe at that moment).
 const seedEmptyDishInMeal=(page:any,name='Mỳ Quảng (Tôm - Thịt)')=>page.evaluate((name:string)=>{const r={id:'qa-mq-'+Date.now(),name,category:'noodle',protein:'mixed',time:30,servings:4,yield:4,purposes:['breakfast','friday'],ingredients:[],missingIngredients:[],prep:'',steps:['Nấu theo cách quen của gia đình.'],custom:true,origin:'family',favorite:false};state.recipes.push(r);const d=isoDate(new Date()),m=ensureWeek(state,monday(d)).days[d].dinner;m.recipes=m.recipes.concat(clone(r));m.cooked=false;save();render();return r.id},name);
 const openDish=async(page:any,tap:any,name='Mỳ Quảng')=>{await page.evaluate(()=>{closeModal();location.hash='today'});await page.waitForTimeout(400);const b=page.locator('[data-fm="recipe-snapshot"]',{hasText:name}).first();await b.waitFor();await tap(b);await page.locator('#modal-root .modal-content').waitFor()};
 const detail=(page:any)=>page.evaluate(()=>{const c=document.querySelector('#modal-root .modal-content')!;return{counted:[...c.querySelectorAll('.ingredients li:not(.ing-note-line)')].map((li:any)=>li.querySelector('.ing-line-name').textContent.trim()+' = '+li.querySelector('b').textContent.trim()),notes:[...c.querySelectorAll('.ingredients li.ing-note-line')].map((li:any)=>li.querySelector('.ing-line-name').textContent.trim()+' | '+li.querySelector('.ing-not-counted').textContent.trim()),empty:c.querySelector('.ing-empty')?.textContent.trim()||'',emptyBoxes:[...c.querySelectorAll('.callout')].filter((x:any)=>!x.textContent.trim()).length}});
 async function fillRows(page:any,tap:any){const list=page.locator('#rc-ing-list .rc-ing-row');for(let i=0;i<ROWS.length;i++){if(i>=await list.count())await tap(page.locator('[data-rci="add"]'));const row=list.nth(i),[name,qty,unit]=ROWS[i];await tap(row.locator('.rc-ing-name-input'));await row.locator('.rc-ing-name-input').fill('');await page.keyboard.type(name);await page.waitForTimeout(80);const exact=row.locator(`.rc-sug-opt[data-name="${name}"]`);if(await exact.count())await tap(exact);else{if(await row.locator('.rc-sug-opt').count())await page.keyboard.press('Escape');await tap(row.locator('.rc-ing-qty'))}await page.keyboard.type(qty);await pickRcUnit(page,row,unit)}}
 const saveForm=async(page:any,tap:any)=>{await tap(page.locator('[data-action="submit-form"][data-id="family-recipe-form"]'));await page.waitForFunction(()=>!document.querySelector('#family-recipe-form'),null,{timeout:5000})};

 // ================= device-only iPhone 375×812, VI light =================
 {const {context,page,errors,tap}=await openApp();
  // (c) zero ingredients: the dish is in tonight's meal and its recipe is empty
  const id=await seedEmptyDishInMeal(page);const stored0=await page.evaluate(()=>JSON.stringify(state));
  await openDish(page,tap);let d=await detail(page);
  assert.deepEqual(d.counted,[]);assert.deepEqual(d.notes,[]);assert.match(d.empty,/Chưa có nguyên liệu/);assert.equal(d.emptyBoxes,0,'no empty box');
  const add=page.locator('#modal-root .ing-empty-add');const box=await add.boundingBox();assert.ok(box!.height>=44&&box!.width>=44,'tap target ≥44px');
  assert.equal(await page.evaluate(()=>JSON.stringify(state)),stored0,'opening the dish changes no stored data');
  await noOverflow(page,'empty state');await page.locator('#modal-root .ing-empty').scrollIntoViewIfNeeded();await shot(page,'mobile-empty-vi-light');
  await tap(add);await page.locator('#family-recipe-form').waitFor();await page.waitForTimeout(150);
  assert.equal(await page.locator('#family-recipe-form').getAttribute('data-id'),id,'edits this family recipe (not a copy)');
  assert.ok(await page.evaluate(()=>document.activeElement?.classList.contains('rc-ing-name-input')),'focus is in the first ingredient row');
  assert.ok(await page.evaluate(()=>{const r=document.querySelector('#rc-ing-list')!.getBoundingClientRect();return r.top<innerHeight&&r.bottom>0}),'ingredient rows are on screen');
  await shot(page,'mobile-empty-add-form-vi-light');
  // (a) Henry's path: rows by touch with units, save, open the dish from the meal
  await fillRows(page,tap);
  // v1.7.5: every row has a “Cộng vào đi chợ” tick (ticked by default); the family unticks the pantry seasonings
  for(const i of [3,4]){const box=page.locator('#rc-ing-list .rc-ing-row').nth(i).locator('.rc-ing-shop-input');assert.equal(await box.isChecked(),true,'ticked by default');await tap(box);assert.equal(await box.isChecked(),false)}
  assert.equal(await page.locator('textarea[name="ingredients"]').inputValue(),'Mì Quảng | 500 | g\nTôm | 300 | g\nThịt heo | 300 | g\nTỏi | 3 | tép | note\nNước mắm | 2 | muỗng canh | note','rows written to the saved box');
  await saveForm(page,tap);
  const saved=await page.evaluate((id:string)=>{const r=state.recipes.find((x:any)=>x.id===id);return{ing:r.ingredients.map((i:any)=>INGREDIENTS[i.id][0]+' '+i.qty+' '+INGREDIENTS[i.id][1]),missing:r.missingIngredients}},id);
  assert.deepEqual(saved,{ing:['Mì Quảng 500 g','Tôm 300 g','Thịt heo 300 g'],missing:NOTES},'the save stored every row');
  await openDish(page,tap);d=await detail(page);
  assert.deepEqual(d.counted.map((x:string)=>x.split(' = ')[0]),['Mì Quảng','Tôm','Thịt heo'],'catalogue lines in the meal view');
  assert.ok(d.counted.every((x:string)=>/\d/.test(x.split(' = ')[1])),'amounts scaled for this meal');
  /* v1.7.19 owner decision (12 Nov 2026): a spoon line also says whether it is in the pantry */assert.deepEqual(d.notes.length,2);assert.equal(d.notes[0],'Tỏi 3 tép | không tính đi chợ','non-countable lines exactly as typed');assert.match(d.notes[1],/^Nước mắm 2 muỗng canh \| (hết trong tủ · nhớ mua 1 \S+|còn trong tủ)$/,'the spoon line shows the pantry status');assert.equal(d.empty,'');assert.equal(d.emptyBoxes,0);
  const expected=await page.evaluate(()=>{const dd=isoDate(new Date()),m=ensureWeek(state,monday(dd)).days[dd].dinner,r=m.recipes[0];const sc=mealServings(m,state)*dishFactor(m,r)/familyYield(r);return recipeIngredientRows(r,sc,state).filter((x:any)=>x.kind==='counted').map((x:any)=>x.name+' = '+fmtQty(x.qty,x.unit))});
  assert.deepEqual(d.counted,expected,'scaled exactly like the shopping list');
  const plan=await page.evaluate((id:string)=>{const dd=isoDate(new Date()),w=ensureWeek(state,monday(dd)),m=w.days[dd].dinner;return{n:m.recipes.find((x:any)=>x.id===id).ingredients.length,shop:shopping(state,w,dd,dd).map((r:any)=>r.id)}},id);
  assert.equal(plan.n,3,'the planned meal follows the edited recipe');assert.ok(plan.shop.includes('shrimp')&&plan.shop.includes('pork'),'shopping list has the new ingredients');
  await noOverflow(page,'meal detail');await page.locator('#modal-root .ingredients').scrollIntoViewIfNeeded();await shot(page,'mobile-meal-detail-vi-light');
  // (a′) the v1.7.2 production data: recipe saved with rows, but the meal's copy is still the empty one
  await page.evaluate((id:string)=>{const dd=isoDate(new Date()),m=ensureWeek(state,monday(dd)).days[dd].dinner,r=state.recipes.find((x:any)=>x.id===id);m.recipes=[{...clone(r),ingredients:[],missingIngredients:[]}];save()},id);
  await page.reload();await page.locator('#main .page-heading').waitFor();await page.waitForFunction(()=>typeof recipeIngredientRows==='function'&&typeof rcEnabled==='function');await page.waitForTimeout(500);
  const stored1=await page.evaluate(()=>JSON.stringify(state));
  await openDish(page,tap);d=await detail(page);assert.equal(d.counted.length,3,'already-saved rows show without re-entering');assert.equal(d.notes.length,2);
  assert.equal(await page.evaluate(()=>JSON.stringify(state)),stored1,'shown without rewriting stored data');
  // (b) a recipe saved before v1.7.1 (free-text block → structured + kept lines), loaded from storage
  const legacy=await page.evaluate(()=>{const r={id:'qa-legacy-1',name:'Canh chua bà ngoại',category:'soup',protein:'fish',time:25,servings:4,yield:4,purposes:['side'],ingredients:[{id:'pork',qty:300}],missingIngredients:['Hành phi 1 chén','Me chua','Muối 1/2 thìa'],prep:'Rửa rau sạch',steps:['Nấu canh'],custom:true,origin:'family',favorite:false};state.recipes.push(r);save();return r.id});
  await page.reload();await page.locator('#main .page-heading').waitFor();await page.waitForFunction(()=>typeof recipeIngredientRows==='function');await page.waitForTimeout(400);
  const stored2=await page.evaluate(()=>JSON.stringify(state.recipes.find((x:any)=>x.id==='qa-legacy-1')));
  await page.evaluate((id:string)=>showRecipe(id),legacy);d=await detail(page);
  assert.deepEqual(d.counted,['Thịt heo = 300 g']);/* v1.7.19 owner decision: a spoon line with a known ingredient says whether it is in the pantry */assert.deepEqual(d.notes.slice(0,2),['Hành phi 1 chén | không tính đi chợ','Me chua | chưa có lượng']);assert.match(d.notes[2],/^Muối 1\/2 thìa \| (hết trong tủ · nhớ mua 1 \S+|còn trong tủ)$/);
  assert.equal(await page.evaluate(()=>JSON.stringify(state.recipes.find((x:any)=>x.id==='qa-legacy-1'))),stored2,'legacy recipe untouched');
  // (d) "Chép thành món nhà" from the library, unchanged save → the family copy shows every line
  await page.evaluate(()=>{closeModal();location.hash='recipes'});await page.waitForTimeout(400);
  await tap(page.locator('[data-fm="samples"]'));await page.locator('#family-recipe-results .lib-card').first().waitFor();
  const card=page.locator('#family-recipe-results .lib-card').first(),srcId=await card.getAttribute('data-id');await tap(card.locator('.lib-card-toggle'));await tap(card.locator('[data-fm="edit-recipe"]'));await page.locator('#family-recipe-form').waitFor();
  const srcN=await page.evaluate((id:string)=>{const r=state.recipes.find((x:any)=>x.id===id);return r.ingredients.length+(r.missingIngredients||[]).length},srcId);
  await saveForm(page,tap);
  const copyId=await page.evaluate((id:string)=>{const s=state.recipes.find((x:any)=>x.id===id);return state.recipes.filter((x:any)=>ownRecipe(x)&&x.name===s.name).at(-1).id},srcId);assert.notEqual(copyId,srcId);
  await page.evaluate((id:string)=>showRecipe(id),copyId);d=await detail(page);assert.ok(srcN>0);assert.equal(d.counted.length+d.notes.length,srcN,'every library line in the family copy');assert.equal(d.empty,'');
  assert.deepEqual(errors,[],'no page errors');
  // EN + dark at the phone size
  for(const [lang,theme] of [['en','dark'],['en','light'],['vi','dark']]){await setLook(page,lang,theme);await page.waitForTimeout(150);
   await openDish(page,tap);d=await detail(page);assert.equal(d.notes.length,2);if(lang==='en')assert.ok(d.notes.every((n:string)=>/\| (not counted for shopping|none in the pantry · remember to buy 1 \S+|in the pantry)$/.test(n))&&d.notes.some((n:string)=>n.endsWith('| not counted for shopping')),'EN note (a spoon line gives the pantry status, owner decision 12 Nov 2026) '+JSON.stringify(d.notes));
   await noOverflow(page,`meal detail ${lang} ${theme}`);await page.locator('#modal-root .ingredients').scrollIntoViewIfNeeded();await shot(page,`mobile-meal-detail-${lang}-${theme}`)}
  // empty state in EN dark
  await setLook(page,'en','dark');const id2=await seedEmptyDishInMeal(page,'Bún bò Huế QA');await openDish(page,tap,'Bún bò Huế QA');d=await detail(page);assert.match(d.empty,/No ingredients yet/);assert.equal(await page.locator('#modal-root .ing-empty-add').innerText(),'Add ingredients');
  await page.locator('#modal-root .ing-empty').scrollIntoViewIfNeeded();await shot(page,'mobile-empty-en-dark');
  // tablet + desktop
  for(const [name,viewport,lang,theme] of [['tablet',sizes.tablet,'vi','light'],['desktop',sizes.desktop,'en','dark']] as any[]){await page.setViewportSize(viewport);await setLook(page,lang,theme);
   await page.evaluate((id2:string)=>{state.recipes=state.recipes.filter((x:any)=>x.id!==id2);const dd=isoDate(new Date()),m=ensureWeek(state,monday(dd)).days[dd].dinner;m.recipes=m.recipes.filter((x:any)=>x.id!==id2);save();render()},id2);
   await openDish(page,tap);d=await detail(page);assert.equal(d.counted.length,3);assert.equal(d.notes.length,2);await noOverflow(page,name);await page.locator('#modal-root .ingredients').scrollIntoViewIfNeeded();await shot(page,`${name}-meal-detail-${lang}-${theme}`)}
  assert.deepEqual(errors,[],'no page errors');await context.close()}
 console.log('PASS device-only iPhone: (c) empty state + add opens the rows, (a) rows by touch → meal detail + shopping list, (a′) v1.7.2 data shows without re-entering, (b) pre-v1.7.1 lines, (d) library copy, VI/EN light/dark, tablet, desktop');

 // ================= (f) Henry's saved recipe: rows saved by name only (iPhone evidence, second report) =================
 {const {context,page,errors,tap}=await openApp({hash:'recipes'});
  const NAMES=['Thịt Ba Chỉ','Tôm','Bánh phở (sợi to)','Bánh tráng','Rau xà lách','Rau thơm (ăn kèm)','Dầu phụng'];
  const id=await page.evaluate((names:string[])=>{const r={id:'qa-hn-mq',name:'Mỳ Quảng (Tôm - Thịt)',category:'noodle',protein:'mixed',time:30,servings:4,yield:4,purposes:['breakfast','friday'],ingredients:[],missingIngredients:names,prep:'',steps:['Nấu theo cách quen của gia đình.'],custom:true,origin:'family',favorite:false};state.recipes.push(r);const d=isoDate(new Date()),m=ensureWeek(state,monday(d)).days[d].dinner;m.recipes=m.recipes.concat(clone(r));m.cooked=false;save();render();return r.id},NAMES);
  const stored=await page.evaluate(()=>JSON.stringify(state));
  // library card counts every row
  await page.evaluate(()=>{familyLibraryMode='own';familyRecipeSearch='Mỳ Quảng';render()});await page.waitForTimeout(300);
  const card=page.locator(`#family-recipe-results .lib-card[data-id="qa-hn-mq"]`);await card.waitFor();await tap(card.locator('.lib-card-toggle'));
  assert.match(await card.locator('.lib-card-more p').first().innerText(),/^7 nguyên liệu/,'card counts the 7 name-only rows');
  // detail (library + meal): every row, "chưa có lượng"
  await tap(card.locator('.lib-card-img'));await page.locator('#modal-root .modal-content').waitFor();let d=await detail(page);
  assert.deepEqual(d.notes,NAMES.map(n=>n+' | chưa có lượng'),'library detail lists every row');assert.equal(d.empty,'');assert.equal(d.emptyBoxes,0);
  /* v1.7.19 owner (12 Nov 2026): one “Sửa món” in the sheet footer, always visible (it replaced the edit bar at the top) */const edit=page.locator('#modal-root .modal-footer [data-action="dish-edit"]');assert.match(await edit.innerText(),/Sửa món/);const eb=await edit.boundingBox();assert.ok(eb!.height>=44&&eb!.width>=44,'edit button ≥44px');
  assert.ok(eb!.y+eb!.height<=(page.viewportSize()!.height)+1,'edit button visible without scrolling');await noOverflow(page,'name-only detail');await shot(page,'mobile-detail-edit-button-vi-light');
  await openDish(page,tap);d=await detail(page);assert.equal(d.notes.length,7,'meal detail lists every row');await page.locator('#modal-root .ingredients').scrollIntoViewIfNeeded();await shot(page,'mobile-meal-detail-name-only-vi-light');
  assert.equal(await page.evaluate(()=>JSON.stringify(state)),stored,'viewing changes no stored data');
  // meal card edit entry
  await page.evaluate(()=>closeModal());const mealEdit=page.locator(`.family-dish-row:has([data-fm="recipe-snapshot"]:has-text("Mỳ Quảng (Tôm - Thịt)")) .dish-edit-btn`).first();await mealEdit.waitFor();
  const mb=await mealEdit.boundingBox();assert.ok(mb!.height>=44&&mb!.width>=44,'meal card edit ≥44px');assert.match(await mealEdit.getAttribute('aria-label'),/Sửa món Mỳ Quảng/);
  await mealEdit.scrollIntoViewIfNeeded();await shot(page,'mobile-meal-card-edit-vi-light');
  await tap(mealEdit);await page.locator('#family-recipe-form').waitFor();assert.equal(await page.locator('#family-recipe-form').getAttribute('data-id'),id);
  assert.deepEqual(await page.locator('#rc-ing-list .rc-ing-name-input').evaluateAll((a:any[])=>a.map(x=>x.value)),NAMES);
  // amounts the way an iPhone delivers them: typed on the decimal keypad ("500", "0,5"), unit from the picker; and a
  // change iOS makes without an input event (keyboard dictation / QuickType / picker wheel) — value set, no event.
  const rows=page.locator('#rc-ing-list .rc-ing-row');
  /* v1.7.10: the sheet's footer floats (rule 25), so focusing a low field scrolls the sheet to keep it above the footer; a person
     types after that settles — wait until the sheet stops scrolling before typing */
  const settle=async()=>{let last=-1,still=0;for(let k=0;k<30&&still<4;k++){await page.waitForTimeout(80);const y=await page.evaluate(()=>document.querySelector('#modal-root .modal')?.scrollTop??0);still=y===last?still+1:0;last=y}};
  const typeRow=async(i:number,qty:string,unit:string)=>{const row=rows.nth(i);await tap(row.locator('.rc-ing-qty'));await settle();await page.keyboard.type(qty);await pickRcUnit(page,row,unit)};
  await typeRow(0,'500','g');await typeRow(1,'300','g');await typeRow(2,'0,5','kg');await typeRow(6,'2','muỗng canh');
  await rows.nth(3).evaluate((li:any)=>{li.querySelector('.rc-ing-qty').value='1';li.querySelector('.rc-ing-unit').value='gói'});
  await rows.nth(4).evaluate((li:any)=>{li.querySelector('.rc-ing-qty').value='200';li.querySelector('.rc-ing-unit').value='g'});
  await saveForm(page,tap);
  const saved=await page.evaluate((id:string)=>{const r=state.recipes.find((x:any)=>x.id===id);return{ing:r.ingredients.map((i:any)=>INGREDIENTS[i.id][0]+' '+i.qty+' '+INGREDIENTS[i.id][1]),missing:r.missingIngredients}},id);
  // v1.7.5: a name-only line opens ticked, so once it has an amount it is counted — kitchen measures as written
  // owner, 12 Nov 2026 (pop-up): spoon and bowl amounts are notes only — kept in the dish as written, never an amount to buy
  assert.deepEqual(saved.ing,['Thịt Ba Chỉ 500 g','Tôm 300 g','Bánh phở (sợi to) 500 g','Bánh tráng 1 gói','Rau xà lách 200 g'],'every amount and unit kept, including changes without input events '+JSON.stringify(saved));
  assert.ok(saved.missing.includes('Rau thơm (ăn kèm)'),'the untouched row (no amount) stays flagged, never guessed '+JSON.stringify(saved.missing));
  assert.ok(saved.missing.some((m:string)=>/Dầu phụng/.test(m)&&/\b2\b/.test(m)&&/muỗng canh/.test(m)),'the spoon line is kept in the dish as written, amount included '+JSON.stringify(saved.missing));
  assert.equal(saved.missing.length,2,'nothing else flagged '+JSON.stringify(saved.missing));
  // reload → reopen keeps them
  await page.reload();await page.locator('#main .page-heading').waitFor();await page.waitForFunction(()=>typeof rcEnabled==='function'&&typeof recipeIngredientRows==='function');await page.waitForTimeout(400);
  // straight after the reload the recipe library is not loaded yet, so the editor opens asynchronously (v1.7.2: without rows)
  await openDish(page,tap);/* v1.7.19 owner: “Sửa món” is in the sheet footer */await tap(page.locator('#modal-root .modal-footer [data-action="dish-edit"]'));await page.locator('#family-recipe-form #rc-ing-list').waitFor();
  assert.deepEqual(await rows.evaluateAll((a:any[])=>a.map(li=>[li.querySelector('.rc-ing-name-input').value,li.querySelector('.rc-ing-qty').value,li.querySelector('.rc-ing-unit').value].join('/'))),
   /* v1.7.19 (owner, spoon amounts are notes): amounts to buy first, then the lines kept as written, each group in the order typed */
   ['Thịt Ba Chỉ/500/g','Tôm/300/g','Bánh phở (sợi to)/500/g','Bánh tráng/1/gói','Rau xà lách/200/g','Rau thơm (ăn kèm)//','Dầu phụng/2/muỗng canh'],'reopened form shows the saved amounts');
  await rows.first().locator('.rc-ing-qty').scrollIntoViewIfNeeded();await shot(page,'mobile-edit-form-reopened-vi-light');
  // unchanged save of the reopened form keeps the recipe exactly
  const before=await page.evaluate((id:string)=>JSON.stringify(state.recipes.find((x:any)=>x.id===id)),id);await saveForm(page,tap);
  assert.equal(await page.evaluate((id:string)=>JSON.stringify(state.recipes.find((x:any)=>x.id===id)),id),before,'unchanged save keeps the recipe');
  await openDish(page,tap);d=await detail(page);/* owner, 12 Nov 2026: the spoon line is shown as written and not bought */assert.equal(d.counted.length,5,JSON.stringify(d));assert.deepEqual(d.notes,['Rau thơm (ăn kèm) | chưa có lượng','Dầu phụng 2 muỗng canh | không tính đi chợ'],JSON.stringify(d));
  await setLook(page,'en','dark');await openDish(page,tap);d=await detail(page);assert.equal(d.notes.length,2,JSON.stringify(d));assert.equal(d.notes[0],'Rau thơm (ăn kèm) | no amount yet');assert.match(d.notes[1],/^Dầu phụng 2 muỗng canh \| [a-z]/i,JSON.stringify(d));assert.doesNotMatch(d.notes[1],/không tính/,'English wording '+JSON.stringify(d));
  assert.match(await page.locator('#modal-root .modal-footer [data-action="dish-edit"]').innerText(),/Edit/);await noOverflow(page,'EN dark');await shot(page,'mobile-detail-edit-button-en-dark');
  // a library recipe offers Edit from its detail (the family's copy)
  const libId=await page.evaluate(()=>state.recipes.find((x:any)=>!ownRecipe(x)).id);await page.evaluate((i:string)=>showRecipe(i),libId);/* v1.7.19 owner: a catalogue dish has the same “Edit”; saving makes the family's copy (v1719-dish-sheet tests the copy) */assert.match(await page.locator('#modal-root .modal-footer [data-action="dish-edit"]').innerText(),/Edit/);
  assert.deepEqual(errors,[],'no page errors');await context.close()}
 console.log('PASS (f) name-only rows: card counts 7, detail lists every row, edit entry in detail + meal card, amounts typed on the decimal keypad and changed without input events survive save → reload → reopen');

 // ================= (g) the sheet stays still while the family types into a new row (intermittent “Tỏi3”, 13 Nov 2026) ==
 // The keep-in-place after “+ Thêm nguyên liệu” (app.ts, rule 24) re-checked the add button 250 and 600 ms later. Typing the
 // new row's name opens the suggestion list, which pushes the add button down, so the late check scrolled the sheet while
 // the family was about to tap a suggestion: the tap missed, and the amount went into the name (“Tỏi3”) or was lost. Once
 // the person types or touches again, nothing may scroll the sheet under them. Deterministic: the late checks are waited
 // out before tapping (on fc50523 the suggestion moved by ~22 px here).
 {const {context,page,errors,tap}=await openApp();
  const id=await seedEmptyDishInMeal(page,'Canh QA dòng mới');await page.evaluate((id:string)=>familyRecipeEditor(id),id);await page.locator('#family-recipe-form').waitFor();
  const list=page.locator('#rc-ing-list .rc-ing-row');
  for(let i=0;i<3;i++){const row=list.nth(i),[name,qty]=ROWS[i];await row.locator('.rc-ing-name-input').fill(name);await row.locator('.rc-ing-qty').fill(qty)}await page.waitForTimeout(250);
  for(const [name,qty] of [['Tỏi','3'],['Nước mắm','2']]){
   await tap(page.locator('[data-rci="add"]'));const row=list.last();await tap(row.locator('.rc-ing-name-input'));await page.keyboard.type(name);
   const opt=row.locator(`.rc-sug-opt[data-name="${name}"]`);await opt.waitFor();
   const where=()=>page.evaluate(()=>{const o=[...document.querySelectorAll('#rc-ing-list .rc-sug:not([hidden]) .rc-sug-opt')].at(0) as any,m=document.querySelector('#modal-root .modal') as any;return{opt:Math.round(o.getBoundingClientRect().top),scroll:Math.round(m.scrollTop)}});
   const before=await where();await page.waitForTimeout(750);const after=await where();
   assert.deepEqual(after,before,`${name}: the sheet does not move under the suggestion list after the family started typing`);
   await tap(opt);await page.keyboard.type(qty);
   assert.deepEqual(await row.evaluate((li:any)=>[li.querySelector('.rc-ing-name-input').value,li.querySelector('.rc-ing-qty').value]),[name,qty],`${name}: the suggestion is picked and the amount lands in the amount box`)}
  // rule 24 still holds when nothing else is touched: the add button stays where it was tapped
  const add=page.locator('[data-rci="add"]'),y0=(await add.boundingBox())!.y;await tap(add);await page.waitForTimeout(700);assert.ok(Math.abs((await add.boundingBox())!.y-y0)<2,'the add button keeps its place');
  assert.deepEqual(errors,[],'no page errors');await context.close()}
 console.log('PASS (g) typing into a new row: the sheet stays still, the tapped suggestion is picked and the amount lands in its box');


 // ================= (e) two signed-in devices of one family =================
 {const A=await openApp({account:true});
  const id=await seedEmptyDishInMeal(A.page);await A.page.evaluate((id:string)=>familyRecipeEditor(id),id);await A.page.locator('#family-recipe-form').waitFor();
  await fillRows(A.page,A.tap);for(const i of [3,4])await A.tap(A.page.locator('#rc-ing-list .rc-ing-row').nth(i).locator('.rc-ing-shop-input'));await saveForm(A.page,A.tap);
  await A.page.waitForFunction(()=>!cloudConnection.dirty&&!cloudConnection.syncing,null,{timeout:10000});
  assert.ok(cloud.puts>0,'device A uploaded the family state');
  const up=cloud.state.recipes.find((x:any)=>x.id===id);assert.equal(up.ingredients.length,3);assert.deepEqual(up.missingIngredients,NOTES,'lines travel with the family state');
  assert.ok(Object.values(cloud.state.ingredientCatalog||{}).some((x:any)=>x.name==='Mì Quảng'),'family ingredient travels too');
  assert.deepEqual(A.errors,[]);await A.context.close();
  const B=await openApp({account:true,ua:IPAD,viewport:sizes.tablet});
  await B.page.waitForFunction((id:string)=>state.recipes.some((x:any)=>x.id===id),id,{timeout:10000});
  await openDish(B.page,B.tap);const d=await detail(B.page);
  assert.deepEqual(d.counted.map((x:string)=>x.split(' = ')[0]),['Mì Quảng','Tôm','Thịt heo'],'device B: catalogue lines');/* owner, 12 Nov 2026: a spoon line of a pantry item also says whether the pantry has it (none here: remember to buy one) */assert.deepEqual(d.notes,['Tỏi 3 tép | không tính đi chợ','Nước mắm 2 muỗng canh | hết trong tủ · nhớ mua 1 chai'],'device B: kept lines');
  assert.deepEqual(B.errors,[]);await B.context.close()}
 console.log('PASS (e) two signed-in devices: rows saved on one device show on the other after the family sync');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
