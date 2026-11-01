// v1.7.1 owner report (iPhone, production v1.7.0): "in the create-dish form I cannot type or choose ingredients, and
// cannot upload a photo"; "let us share a dish or its photo to the community"; "the dish search should show 5 results
// and Show more". Chromium with touch emulation and iPhone / iPad user agents (simulation only, not physical devices).
//  A. Device-only: new recipe, "Chép thành món nhà" from the library and editing a family recipe — typing name/amount/
//     unit, choosing catalogue suggestions (touch + keyboard), add/remove/reorder rows, lines in non-shopping units
//     (the v1.7.0 save error), photo via setInputFiles (JPEG downscaled, HEIC-like file → graceful message), replace and
//     remove, unchanged saves keep family data byte-for-byte; meal-editor search 5 + "Xem thêm".
//  B. Signed-in family against the REAL community-recipes / studio / accounts handlers (in-memory stores): share →
//     pending → Studio approve (+points) → visible in Community → copy to family → report → unshare; reject with
//     reason; anonymous; flag off hides everything.
//  C. Screenshots at 375×812, 820×1100, 1280×800 (VI light / EN dark) + Studio page → docs/reviews/v1.7.1/recipe-community.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,existsSync,statSync} from 'node:fs';
import {extname} from 'node:path';
import {chromium,devices} from 'playwright';
const origin='https://kitchen.test',out='docs/reviews/v1.7.1/recipe-community';mkdirSync(out,{recursive:true});
const mime:any={'.js':'application/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.json':'application/json','.webmanifest':'application/manifest+json'};
const IPHONE=devices['iPhone 13'].userAgent,IPAD=devices['iPad Pro 11'].userAgent;
const sizes:any={mobile:{width:375,height:812},tablet:{width:820,height:1100},desktop:{width:1280,height:800}};
(async()=>{
 const {memoryStores}=await import('./helpers/accounts.mjs');
 const {createAccountsHandler}=await import('../netlify/lib/accounts.mjs');
 const {createStudioHandler}=await import('../netlify/functions/studio.mjs');
 const {createCommunityRecipesHandler}=await import('../netlify/functions/community-recipes.mjs');
 const {communityStore,rewardsFor}=await import('../netlify/lib/community-prices.mjs');
 const {listLog,resetSettingsCache}=await import('../netlify/lib/studio.mjs');
 const getStoreFn=memoryStores(),env:any={STUDIO_ADMINS:'henrynguyen'};resetSettingsCache();
 const accounts=createAccountsHandler({getStoreFn}),studio=createStudioHandler({getStoreFn,env,limits:{all:5000,mutate:5000}}),recipes=createCommunityRecipesHandler({getStoreFn,env});
 const handlers:any={studio,accounts,'community-recipes':recipes},cstore=communityStore(getStoreFn);
 const reg=async(u:string)=>{const r=await accounts(new Request(origin+'/.netlify/functions/accounts?op=register',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','x-nf-client-connection-ip':'r-'+u},body:JSON.stringify({username:u,name:u,password:'synthetic-recipe-browser-42',trust:true})}));assert.equal(r.status,201);return r.headers.get('set-cookie')!.split(';')[0]};
 const fam=async(cookie:string,name:string)=>{const r=await accounts(new Request(origin+'/.netlify/functions/accounts?op=create-family',{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json','x-nf-client-connection-ip':'f'},body:JSON.stringify({name})}));assert.equal(r.status,201);return (await r.json()).household.id};
 const mumCookie=await reg('qa-mum'),householdId=await fam(mumCookie,'Nhà Bếp QA'),henry=await reg('henrynguyen');
 const me=await (await studio(new Request(origin+'/.netlify/functions/studio?op=me',{headers:{Cookie:henry}}))).json();
 const studioAct=async(action:string,id:string,reason='')=>{const r=await recipes(new Request(origin+'/.netlify/functions/community-recipes?op=studio-action',{method:'POST',headers:{Origin:origin,Cookie:henry,'x-studio-csrf':me.csrf,'Content-Type':'application/json'},body:JSON.stringify({action,id,reason})}));assert.equal(r.status,200,action);return r.json()};
 const items=async()=>{const out:any[]=[];for await(const p of cstore.list({prefix:'recipes/items/',paginate:true}))for(const b of p.blobs)out.push(await cstore.get(b.key,{type:'json'}));return out};
 const browser=await chromium.launch();
 let flags:any={priceScout:true,voice:true,urgentMessages:true,usageAnalytics:true,communityRecipes:true};
 const familyPhotos:string[]=[];
 const cookieOf=(c:string)=>({name:c.split('=')[0],value:c.split('=').slice(1).join('='),domain:'kitchen.test',path:'/',secure:true,httpOnly:true,sameSite:'Strict' as const});
 const route=(page:any,{account}:{account:boolean})=>page.route(origin+'/**',async(r:any)=>{const req=r.request(),url=new URL(req.url()),fn=url.pathname.match(/^\/\.netlify\/functions\/([\w-]+)/),op=url.searchParams.get('op')||'';
  if(fn?.[1]==='studio'&&op==='banner')return r.fulfill({json:{banner:null,maintenance:null,minAppEdition:null,flags}});
  if(fn&&handlers[fn[1]]&&!(fn[1]==='accounts'&&account)){const res=await handlers[fn[1]](new Request(url.href,{method:req.method(),headers:await req.allHeaders(),body:['GET','HEAD'].includes(req.method())?undefined:req.postDataBuffer()}));return r.fulfill({status:res.status,headers:Object.fromEntries(res.headers),body:Buffer.from(await res.arrayBuffer())})}
  if(fn&&account){if(fn[1]==='family'&&op.startsWith('photo')&&req.method()==='PUT'){familyPhotos.push(url.searchParams.get('id')!);return r.fulfill({json:{saved:true}})}
   if(fn[1]==='accounts'&&op==='families')return r.fulfill({json:{families:[{id:householdId,name:'Nhà Bếp QA',role:'owner'}],account:{username:'qa-mum',name:'Mẹ'}}});
   const st={configured:true,connected:true,mode:'account',account:{username:'qa-mum',name:'Mẹ'},household:{id:householdId,name:'Nhà Bếp QA',role:'owner',memberId:null}};
   return r.fulfill({json:fn[1]==='family'&&op==='status'?st:op==='state'&&req.method()==='GET'?{state:null,etag:null}:{announcements:[],devices:[],alerts:[]}})}
  if(fn)return r.fulfill({status:401,json:{error:'no'}});
  const file='dist'+(url.pathname==='/'?'/index.html':url.pathname);if(existsSync(file))return r.fulfill({status:200,contentType:mime[extname(file)]||'application/octet-stream',body:readFileSync(file)});return r.fulfill({status:404,body:''})});
 const noOverflow=async(page:any,label:string)=>{const w=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.ok(w<=1,label+' horizontal overflow '+w)};
 const shot=async(page:any,name:string)=>{await page.evaluate(()=>{const t=document.querySelector('#toast');if(t)t.className=''});await page.waitForTimeout(120);const f=`${out}/${name}.jpg`;await page.screenshot({path:f,type:'jpeg',quality:70});const kb=statSync(f).size/1024;assert.ok(kb<250,`${name}.jpg is ${kb.toFixed(0)} KB`)};
 async function openApp({viewport=sizes.mobile,ua=IPHONE,touch=true,lang='vi',theme='light',account=false,hash='recipes'}:any={}){
  const context=await browser.newContext({viewport,userAgent:ua,hasTouch:touch,isMobile:touch&&viewport.width<900,serviceWorkers:'block',reducedMotion:'reduce',colorScheme:theme==='dark'?'dark':'light'});
  await context.addInitScript(({account,lang}:any)=>{if(sessionStorage.getItem('qa-init'))return;sessionStorage.setItem('qa-init','1');localStorage.setItem('bep-guide-done','1');if(account)localStorage.setItem('bep-account-present','yes');else localStorage.setItem('bep-local-locked','yes')},{account,lang});
  if(account)await context.addCookies([cookieOf(mumCookie)]);
  const page=await context.newPage(),errors:string[]=[];page.on('pageerror',(e:any)=>errors.push(e.message));await route(page,{account});
  await page.goto(origin+'/#'+hash);await page.locator('#main .page-heading').waitFor({timeout:30000});await page.waitForTimeout(account?1500:600);await page.waitForFunction(()=>typeof appLanguage!=='undefined'&&typeof rcEnabled==='function'&&!!document.querySelector('#main .page-heading'),null,{timeout:30000});
  await page.evaluate(({lang,theme}:any)=>{localStorage.setItem('bep-theme-mode',theme);if(typeof applyThemePreferences==='function')applyThemePreferences();if(appLanguage!==lang)changeAppLanguage(lang);closeModal();render()},{lang,theme});
  const tap=(loc:any)=>touch?loc.tap():loc.click();
  return{context,page,errors,tap}}
 const jpegOf=async(page:any,w:number,h:number)=>Buffer.from(await page.evaluate(([w,h]:number[])=>{const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d')!;const gr=g.createLinearGradient(0,0,w,h);gr.addColorStop(0,'#c87649');gr.addColorStop(1,'#2f7054');g.fillStyle=gr;g.fillRect(0,0,w,h);g.fillStyle='#fff6';g.beginPath();g.arc(w/2,h/2,h/3,0,7);g.fill();return c.toDataURL('image/jpeg',.9).split(',')[1]},[w,h]),'base64');
 const heicLike=Buffer.concat([Buffer.from([0,0,0,24]),Buffer.from('ftypheic\0\0\0\0mif1heic'),Buffer.alloc(200,7)]);
 const waitModalGone=(page:any)=>page.waitForFunction(()=>!document.querySelector('#family-recipe-form'),null,{timeout:5000});
 const rowNames=(page:any)=>page.locator('#rc-ing-list .rc-ing-name-input').evaluateAll((els:any[])=>els.map(e=>e.value));
 async function fillRow(page:any,tap:any,i:number,name:string,qty:string,unit:string){const row=page.locator('#rc-ing-list .rc-ing-row').nth(i);await tap(row.locator('.rc-ing-name-input'));await row.locator('.rc-ing-name-input').fill('');await page.keyboard.type(name);await page.keyboard.press('Escape');await tap(row.locator('.rc-ing-qty'));await page.keyboard.type(qty);await row.locator('.rc-ing-unit').selectOption(unit)}

 // ================= A. device-only, iPhone UA, touch, 375×812 (+ iPad UA 820×1100) =================
 for(const [label,viewport,ua] of [['iphone',sizes.mobile,IPHONE],['ipad',sizes.tablet,IPAD]] as any[]){
  const {context,page,errors,tap}=await openApp({viewport,ua});
  // A1 new recipe
  await tap(page.locator('[data-fm="new"]').first());await page.locator('#family-recipe-form').waitFor();
  assert.equal(await page.locator('textarea[name="ingredients"]').isVisible(),false,'the raw box is replaced by rows');
  assert.equal(await page.locator('#rc-ing-list .rc-ing-row').count(),3,'three empty rows to start');
  const files=page.locator('.rc-file-input');assert.equal(await files.count(),2,'camera + library inputs');
  for(const f of await files.all()){assert.equal(await f.getAttribute('accept'),'image/*','accept=image/* so iOS converts HEIC to JPEG');assert.notEqual(await f.evaluate((e:any)=>getComputedStyle(e).display),'none','file input is not display:none (iOS)');assert.ok(await f.evaluate((e:any)=>!e.disabled&&!e.readOnly))}
  assert.equal(await files.first().getAttribute('capture'),'environment');
  const rowBox=await page.locator('#rc-ing-list .rc-ing-row').first().locator('.rc-ing-name-input').boundingBox();assert.ok(rowBox!.height>=44,'name input ≥44px');
  await tap(page.locator('#family-recipe-form input[name="name"]'));await page.keyboard.type('Gà kho gừng QA');
  // choose a catalogue ingredient by touch
  const r0=page.locator('#rc-ing-list .rc-ing-row').first();await tap(r0.locator('.rc-ing-name-input'));await page.keyboard.type('thịt g');
  const opt=page.locator('#rc-ing-list .rc-sug-opt[data-name="Thịt gà"]');await opt.waitFor();assert.equal(await r0.locator('.rc-ing-name-input').getAttribute('aria-expanded'),'true');
  await tap(opt);assert.equal(await r0.locator('.rc-ing-name-input').inputValue(),'Thịt gà');assert.equal(await r0.locator('.rc-ing-unit').inputValue(),'g','unit from the catalogue');
  assert.ok(await r0.locator('.rc-ing-qty').evaluate((e:any)=>document.activeElement===e),'focus moves to the amount');
  await page.keyboard.type('0,5');await r0.locator('.rc-ing-unit').selectOption('kg');
  // a unit the shopping list cannot count (the v1.7.0 save error) and a kitchen measure
  await fillRow(page,tap,1,'Tỏi','3','tép');assert.match(await page.locator('#rc-ing-list .rc-ing-row').nth(1).locator('.rc-ing-note').innerText(),/tép.*(chưa cộng|not added)/);
  await fillRow(page,tap,2,'Nước mắm','2','muỗng canh');
  // add + choose by keyboard, add + remove, reorder
  await tap(page.locator('[data-rci="add"]'));await page.keyboard.type('hành l');await page.locator('#rc-ing-list .rc-ing-row').nth(3).locator('.rc-sug-opt').first().waitFor();await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
  assert.equal(await page.locator('#rc-ing-list .rc-ing-row').nth(3).locator('.rc-ing-name-input').inputValue(),'Hành lá','keyboard choice');await page.keyboard.type('50');
  await tap(page.locator('[data-rci="add"]'));await page.keyboard.type('Dòng thừa');assert.equal(await page.locator('#rc-ing-list .rc-ing-row').count(),5);
  await tap(page.locator('#rc-ing-list .rc-ing-row').nth(4).locator('[data-rci="remove"]'));assert.equal(await page.locator('#rc-ing-list .rc-ing-row').count(),4,'row removed');
  await tap(page.locator('#rc-ing-list .rc-ing-row').nth(2).locator('[data-rci="up"]'));assert.deepEqual(await rowNames(page),['Thịt gà','Nước mắm','Tỏi','Hành lá'],'row moved up');
  // photo: HEIC-like file that Chromium cannot decode → clear message; then a large JPEG → downscaled preview
  await page.locator('[data-rc-file="library"]').setInputFiles({name:'IMG_0001.HEIC',mimeType:'image/heic',buffer:heicLike});
  await page.waitForFunction(()=>/HEIC/.test(document.querySelector('#rc-photo-status')?.textContent||''));
  await page.locator('[data-rc-file="camera"]').setInputFiles({name:'IMG_0002.JPG',mimeType:'image/jpeg',buffer:await jpegOf(page,2400,1800)});
  await page.waitForFunction(()=>/1600×1200/.test(document.querySelector('#rc-photo-status')?.textContent||''));assert.equal(await page.locator('#rc-photo-preview img').count(),1,'preview');
  await noOverflow(page,label+' form');if(label==='iphone'){await page.locator('#rc-ing-list').scrollIntoViewIfNeeded();await shot(page,'mobile-form-rows-vi')}
  await tap(page.locator('[data-action="submit-form"][data-id="family-recipe-form"]'));await waitModalGone(page);await page.waitForFunction(()=>!!state.recipes.find((x:any)=>x.name==='Gà kho gừng QA')?.photo,null,{timeout:5000}).catch(()=>{});
  const saved=await page.evaluate(()=>{const r=state.recipes.find((x:any)=>x.name==='Gà kho gừng QA');return{ing:r.ingredients,missing:r.missingIngredients,photo:r.photo?.key}});
  assert.deepEqual(saved.ing,[{id:'chicken',qty:500},{id:'scallion',qty:50}],'catalogue ingredients counted (0,5 kg → 500 g)');
  assert.deepEqual(saved.missing,['Nước mắm 2 muỗng canh','Tỏi 3 tép'],'non-shopping units kept verbatim in the family’s order, not converted');
  assert.match(saved.photo,/^recipe-/);
  const blob=await page.evaluate(async(k:string)=>{const v:any=await localPhoto(k);return v?{size:v.blob.size,type:v.blob.type,uploaded:v.uploaded}:null},saved.photo);assert.ok(blob&&blob.size>1000&&blob.type==='image/jpeg'&&blob.uploaded===false,'photo stored on the device '+JSON.stringify(blob));
  await page.waitForFunction(()=>[...document.querySelectorAll('img.rc-recipe-photo')].some((i:any)=>i.src.startsWith('blob:')&&!i.hidden));
  // A2 "Chép thành món nhà" from the library: rows prefilled, unchanged save copies quantities exactly
  await tap(page.locator('[data-fm="samples"]'));await page.locator('#family-recipe-results .lib-card').first().waitFor();
  const card=page.locator('#family-recipe-results .lib-card').first(),srcId=await card.getAttribute('data-id');await tap(card.locator('.lib-card-toggle'));await tap(card.locator('[data-fm="edit-recipe"]'));await page.locator('#family-recipe-form').waitFor();
  const src=await page.evaluate((id:string)=>{const r=state.recipes.find((x:any)=>x.id===id);return{n:r.ingredients.length,ing:r.ingredients.map((i:any)=>({id:i.id,qty:i.qty}))}},srcId);
  assert.equal(await page.locator('#rc-ing-list .rc-ing-row').count(),src.n,'one row per library ingredient');
  await tap(page.locator('[data-action="submit-form"][data-id="family-recipe-form"]'));await waitModalGone(page);
  const copy=await page.evaluate((id:string)=>{const s=state.recipes.find((x:any)=>x.id===id);const c=state.recipes.filter((x:any)=>x.custom&&x.name===s.name).at(-1);return c.ingredients.map((i:any)=>({id:i.id,qty:i.qty}))},srcId);assert.deepEqual(copy,src.ing,'library quantities copied exactly');
  // A3 edit an existing family recipe with an unusual line: unchanged save keeps every field; replace + remove photo
  const fid=await page.evaluate(()=>{const r={id:'qa-fam-'+Date.now(),name:'Canh bà nội QA',category:'soup',protein:'pork',time:25,servings:4,yield:4,purposes:['side'],ingredients:[{id:'pork',qty:300}],missingIngredients:['Muối 1/2 thìa','Rau thơm'],prep:'Rửa rau',steps:['Nấu canh'],custom:true,origin:'family',favorite:false};state.recipes.push(r);save();render();return r.id});
  const before=await page.evaluate((id:string)=>JSON.stringify(state.recipes.find((x:any)=>x.id===id)),fid);
  await page.evaluate((id:string)=>familyRecipeEditor(id),fid);await page.locator('#family-recipe-form').waitFor();
  assert.deepEqual(await rowNames(page),['Thịt heo','Muối','Rau thơm']);
  await tap(page.locator('[data-action="submit-form"][data-id="family-recipe-form"]'));await waitModalGone(page);
  assert.equal(await page.evaluate((id:string)=>JSON.stringify(state.recipes.find((x:any)=>x.id===id)),fid),before,'unchanged save leaves the family recipe exactly as it was');
  await page.evaluate((id:string)=>familyRecipeEditor(id),fid);await page.locator('#family-recipe-form').waitFor();
  await page.locator('[data-rc-file="library"]').setInputFiles({name:'a.png',mimeType:'image/png',buffer:Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=300;c.height=200;c.getContext('2d')!.fillRect(0,0,300,200);return c.toDataURL('image/png').split(',')[1]}),'base64')});
  await page.waitForFunction(()=>/300×200/.test(document.querySelector('#rc-photo-status')?.textContent||''));await tap(page.locator('[data-action="submit-form"][data-id="family-recipe-form"]'));await waitModalGone(page);await page.waitForTimeout(200);
  const k1=await page.evaluate((id:string)=>state.recipes.find((x:any)=>x.id===id).photo?.key,fid);assert.ok(k1,'PNG accepted, re-encoded to JPEG');
  await page.evaluate((id:string)=>familyRecipeEditor(id),fid);await page.locator('#family-recipe-form').waitFor();await page.waitForFunction(()=>!!document.querySelector('#rc-photo-preview img[src^="blob:"]'));
  await page.locator('[data-rc-file="library"]').setInputFiles({name:'b.jpg',mimeType:'image/jpeg',buffer:await jpegOf(page,800,600)});await page.waitForFunction(()=>/800×600/.test(document.querySelector('#rc-photo-status')?.textContent||''));
  await tap(page.locator('[data-action="submit-form"][data-id="family-recipe-form"]'));await waitModalGone(page);await page.waitForTimeout(200);
  const k2=await page.evaluate((id:string)=>state.recipes.find((x:any)=>x.id===id).photo?.key,fid);assert.ok(k2&&k2!==k1,'photo replaced');
  await page.evaluate((id:string)=>familyRecipeEditor(id),fid);await page.locator('#family-recipe-form').waitFor();await tap(page.locator('[data-rci="photo-remove"]'));await tap(page.locator('[data-action="submit-form"][data-id="family-recipe-form"]'));await waitModalGone(page);await page.waitForTimeout(200);
  assert.equal(await page.evaluate((id:string)=>state.recipes.find((x:any)=>x.id===id).photo,fid),undefined,'photo removed');
  const after=JSON.parse(await page.evaluate((id:string)=>JSON.stringify(state.recipes.find((x:any)=>x.id===id)),fid));assert.deepEqual(after,JSON.parse(before),'only the photo the user changed was touched');
  // A4 meal editor search: top 5 + "Xem thêm" (5 more each tap, keyboard accessible), empty state unchanged
  await page.evaluate(()=>{location.hash='planner'});await page.locator('[data-fm="edit-meal"]').first().waitFor();
  await page.evaluate(()=>{const d=Object.keys(currentWeek().days)[0];currentWeek().days[d].breakfast.recipes=[];currentWeek().days[d].breakfast.cooked=false;save();render();familyEditMeal(d,'breakfast')});await page.locator('#meal-dish-search').waitFor();
  const libRows=()=>page.locator('#meal-lib-list .family-select-row').count();assert.equal(await libRows(),30,'unchanged before typing');
  await tap(page.locator('#meal-dish-search'));await page.keyboard.type('gà');await page.waitForTimeout(400);
  assert.equal(await libRows(),5,'top 5 results');const more=page.locator('#meal-lib-list [data-meal-more="lib"]');assert.match(await more.innerText(),/Xem thêm 5 món/);
  assert.match(await page.locator('#meal-lib-list .meal-more-bar').innerText(),/Đang hiện 5\/\d+ món/);assert.match(await page.locator('#meal-search-status').innerText(),/đang hiện/);
  if(label==='iphone'){await more.scrollIntoViewIfNeeded();await shot(page,'mobile-meal-search-vi')}
  await tap(more);assert.equal(await libRows(),10,'5 more');
  await page.locator('#meal-lib-list [data-meal-more="lib"]').focus();await page.keyboard.press('Enter');assert.equal(await libRows(),15,'keyboard Enter shows 5 more');
  assert.ok(await page.evaluate(()=>!!document.activeElement?.closest('#meal-lib-list')),'focus stays in the list');
  await page.locator('#meal-dish-search').fill('xyzkhongco');await page.waitForTimeout(400);assert.match(await page.locator('#meal-search-status').innerText(),/Không tìm thấy món ăn khớp.*\(0 món\)/);assert.equal(await page.locator('[data-meal-more]').count(),0,'no Show more on an empty result');
  await page.locator('#meal-dish-search').fill('');await page.waitForTimeout(400);assert.equal(await libRows(),30);
  await noOverflow(page,label+' meal');assert.deepEqual(errors,[]);await context.close();
 }

 // ================= B. signed-in family, real community-recipes handler =================
 {const {context,page,errors,tap}=await openApp({account:true});
  const seed=async(name:string,withPhoto=true)=>page.evaluate(async([name,withPhoto]:any)=>{const r:any={id:'qa-'+Math.random().toString(36).slice(2),name,category:'main',protein:'chicken',time:35,servings:4,yield:4,purposes:['main'],ingredients:[{id:'chicken',qty:500},{id:'scallion',qty:50}],missingIngredients:['Gừng 1 nhánh'],prep:'Ướp 20 phút',steps:['Phi hành','Kho gà nhỏ lửa'],custom:true,origin:'family',favorite:false};
   if(withPhoto){const c=document.createElement('canvas');c.width=640;c.height=480;const g=c.getContext('2d')!;g.fillStyle='#c87649';g.fillRect(0,0,640,480);const blob:any=await new Promise(res=>c.toBlob(res,'image/jpeg',.8));const key='recipe-qa'+Math.random().toString(36).slice(2);await localPhoto(key,{blob,uploaded:false});r.photo={key,updatedAt:new Date().toISOString()}}
   state.recipes.push(r);save();render();return r.id},[name,withPhoto]);
  const openDetail=async(id:string)=>{await page.evaluate((id:string)=>showRecipe(id),id);await page.locator('.rc-share-card').waitFor()};
  const r1=await seed('Gà kho QA cộng đồng'),orig=await page.evaluate((id:string)=>JSON.stringify(state.recipes.find((x:any)=>x.id===id)),r1);
  await openDetail(r1);await page.locator('.rc-share-card [data-rc="share"]').waitFor();await tap(page.locator('.rc-share-card [data-rc="share"]'));await page.locator('#rc-share-form').waitFor();
  assert.equal(await page.locator('#rc-share-form a[href="/privacy.html#community-recipes"]').count(),1,'privacy link');assert.match(await page.locator('#rc-share-form').innerText(),/Nhà Bếp QA/);
  await shot(page,'mobile-share-modal-vi');
  await tap(page.locator('[data-rc="share-send"]'));assert.match(await page.locator('#rc-share-status').innerText(),/đồng ý|consent/i,'consent required');
  await tap(page.locator('#rc-share-form [name="consent"]'));await tap(page.locator('[data-rc="share-send"]'));await page.waitForFunction(()=>!document.querySelector('#rc-share-form'));
  let all=await items();assert.equal(all.length,1);assert.equal(all[0].status,'pending');assert.equal(all[0].hasPhoto,true,'photo uploaded with the share');assert.equal(all[0].displayName,'Nhà Bếp QA');
  assert.deepEqual(all[0].ingredients,[{name:'Thịt gà',qty:500,unit:'g'},{name:'Hành lá',qty:50,unit:'g'}],'family quantities shared exactly');
  await openDetail(r1);await page.waitForFunction(()=>/Đang chờ duyệt/.test(document.querySelector('.rc-share-card')?.textContent||''));
  // pending is not public
  await page.evaluate(()=>closeModal());await page.evaluate(()=>{location.hash='recipes'});await tap(page.locator('[data-rc="tab"]'));await page.locator('#rc-results').waitFor();await page.waitForFunction(()=>/Chưa có món ăn cộng đồng/.test(document.querySelector('#rc-results')?.textContent||''));
  // Studio approve (owner, audited) → points
  const ok=await studioAct('approve',all[0].id);assert.equal(ok.points,5);assert.equal((await rewardsFor(getStoreFn,{username:'qa-mum',now:Date.now(),rewards:null})).total,5);
  assert.ok((await listLog(getStoreFn,'audit',{now:Date.now()})).items.some((e:any)=>e.action==='community_recipe_approve'));
  await page.evaluate(()=>{rcList.at=0});await tap(page.locator('[data-fm="own"]'));await tap(page.locator('[data-rc="tab"]'));
  const ccard=page.locator(`.rc-card[data-rc-id="${all[0].id}"]`);await ccard.waitFor();assert.match(await ccard.innerText(),/Nhà Bếp QA/);
  await page.waitForFunction((id:string)=>{const i:any=document.querySelector(`.rc-card[data-rc-id="${id}"] img.rc-community-photo`);return i&&i.complete&&i.naturalWidth>0},all[0].id);
  await tap(ccard.locator('summary'));assert.match(await ccard.innerText(),/Thịt gà — 500 g/);
  await shot(page,'mobile-community-vi');await noOverflow(page,'community tab');
  // copy to my family: marked with its source, quantities as shared
  const n0=await page.evaluate(()=>state.recipes.length);await tap(ccard.locator('[data-rc="copy"]'));await page.waitForTimeout(400);
  const copied=await page.evaluate(()=>state.recipes.at(-1));assert.equal(await page.evaluate(()=>state.recipes.length),n0+1);assert.equal(copied.source.type,'community');assert.equal(copied.source.id,all[0].id);
  assert.deepEqual(copied.ingredients,[{id:'chicken',qty:500},{id:'scallion',qty:50}]);assert.deepEqual(copied.missingIngredients,['Gừng 1 nhánh']);
  await page.waitForFunction(()=>state.recipes.at(-1).photo?.key);
  await page.locator(`.rc-card[data-rc-id="${all[0].id}"] [data-action="recipe-detail"]`).waitFor();
  // report
  await tap(page.locator(`.rc-card[data-rc-id="${all[0].id}"] [data-rc="report"]`));await page.locator('#rc-report-form').waitFor();await page.locator('#rc-report-reason').selectOption('offensive');await tap(page.locator('[data-rc="report-send"]'));await page.waitForFunction(()=>!document.querySelector('#rc-report-form'));
  all=await items();assert.equal(all[0].reports.length,1);assert.equal(all[0].reports[0].reason,'offensive');
  // unshare → removed from the pool, family recipe untouched
  await openDetail(r1);await page.waitForFunction(()=>!!document.querySelector('.rc-share-card [data-rc="unshare"]'));await tap(page.locator('[data-rc="unshare"]'));await tap(page.locator('[data-confirm="yes"]'));await page.waitForTimeout(400);
  assert.equal((await items()).length,0,'unshare deletes the shared copy');assert.equal(await page.evaluate((id:string)=>JSON.stringify(state.recipes.find((x:any)=>x.id===id)),r1),orig,'family recipe untouched');
  // reject (photo only, anonymous) → reason shown, no points
  const r2=await seed('Bánh xèo QA');await openDetail(r2);await tap(page.locator('.rc-share-card [data-rc="share"]'));await page.locator('#rc-share-form').waitFor();
  await tap(page.locator('#rc-share-form [name="kind"][value="photo"]'));await tap(page.locator('#rc-share-form [name="display"][value="anonymous"]'));await tap(page.locator('#rc-share-form [name="consent"]'));await tap(page.locator('[data-rc="share-send"]'));await page.waitForFunction(()=>!document.querySelector('#rc-share-form'));
  all=await items();const it2=all.find((x:any)=>x.name==='Bánh xèo QA');assert.equal(it2.kind,'photo');assert.equal(it2.anonymous,true);assert.equal(it2.displayName,null);assert.equal(it2.ingredients,undefined,'photo-only shares no ingredients');
  await studioAct('reject',it2.id,'Ảnh chưa rõ món');assert.equal((await rewardsFor(getStoreFn,{username:'qa-mum',now:Date.now(),rewards:null})).total,5,'rejected earns nothing');
  await page.evaluate(()=>{rcMine.at=0});await openDetail(r2);await page.waitForFunction(()=>/Ảnh chưa rõ món/.test(document.querySelector('.rc-share-card')?.textContent||''));
  // anonymous whole recipe → approved → card says "Ẩn danh"
  const r3=await seed('Canh chua QA ẩn danh',false);await openDetail(r3);await tap(page.locator('.rc-share-card [data-rc="share"]'));await page.locator('#rc-share-form').waitFor();assert.equal(await page.locator('#rc-share-form [name="kind"][value="photo"]').isDisabled(),true,'photo-only needs a photo');
  await tap(page.locator('#rc-share-form [name="display"][value="anonymous"]'));await tap(page.locator('#rc-share-form [name="consent"]'));await tap(page.locator('[data-rc="share-send"]'));await page.waitForFunction(()=>!document.querySelector('#rc-share-form'));
  const it3=(await items()).find((x:any)=>x.name==='Canh chua QA ẩn danh');await studioAct('approve',it3.id);
  await page.evaluate(()=>{closeModal();rcList.at=0;location.hash='recipes'});await tap(page.locator('[data-fm="own"]'));await tap(page.locator('[data-rc="tab"]'));const c3=page.locator(`.rc-card[data-rc-id="${it3.id}"]`);await c3.waitFor();assert.match(await c3.innerText(),/Ẩn danh/);assert.ok(!/Nhà Bếp QA/.test(await c3.innerText()));
  assert.deepEqual(errors,[]);await context.close()}
 // ================= flag off hides every community-recipe surface =================
 {flags={...flags,communityRecipes:false};const {context,page,errors}=await openApp({account:true});await page.waitForTimeout(800);
  await page.evaluate(()=>{render()});assert.equal(await page.locator('[data-rc="tab"]').count(),0,'no Community source');
  const id=await page.evaluate(()=>{const r=state.recipes.find((x:any)=>ownRecipe(x));return r?.id});if(id){await page.evaluate((id:string)=>showRecipe(id),id);await page.waitForTimeout(400);assert.equal(await page.locator('.rc-share-card').count(),0,'no share card')}
  assert.deepEqual(errors,[]);await context.close();flags={...flags,communityRecipes:true}}

 // ================= C. responsive evidence (VI light / EN dark) =================
 for(const [name,viewport] of Object.entries(sizes) as any[])for(const [lang,theme] of [['vi','light'],['en','dark']]){
  const touch=name!=='desktop',{context,page,errors,tap}=await openApp({viewport,lang,theme,touch,ua:name==='tablet'?IPAD:name==='mobile'?IPHONE:undefined,account:true});
  await tap(page.locator('[data-fm="new"]').first());await page.locator('#family-recipe-form').waitFor();
  await tap(page.locator('#rc-ing-list .rc-ing-name-input').first());await page.keyboard.type(lang==='en'?'chick':'thịt g');await page.locator('.rc-sug-opt').first().waitFor();
  await page.locator('#rc-ing-list').scrollIntoViewIfNeeded();await noOverflow(page,`${name} ${lang} form`);await shot(page,`${name}-form-${lang}-${theme}`);
  const sug=await page.locator('.rc-sug-opt').first().boundingBox();assert.ok(sug!.height>=44,'suggestion ≥44px');
  await page.evaluate(()=>closeModal());await page.evaluate(()=>{rcList.at=0});await tap(page.locator('[data-rc="tab"]'));await page.locator('.rc-card').first().waitFor();await noOverflow(page,`${name} community`);await shot(page,`${name}-community-${lang}-${theme}`);
  await page.evaluate(()=>{location.hash='planner'});await page.locator('[data-fm="edit-meal"]').first().waitFor();await page.evaluate(()=>{const d=Object.keys(currentWeek().days)[0];familyEditMeal(d,'dinner')});await page.locator('#meal-dish-search').fill(lang==='en'?'chicken':'gà');await page.waitForTimeout(400);
  await page.locator('#meal-lib-list').scrollIntoViewIfNeeded();await noOverflow(page,`${name} meal`);await shot(page,`${name}-meal-search-${lang}-${theme}`);
  assert.deepEqual(errors,[]);await context.close()}
 // Studio page (owner), three sizes
 for(const [name,viewport] of Object.entries(sizes) as any[]){const context=await browser.newContext({viewport,serviceWorkers:'block',reducedMotion:'reduce'});await context.addCookies([cookieOf(henry)]);const page=await context.newPage(),errors:string[]=[];page.on('pageerror',(e:any)=>errors.push(e.message));await route(page,{account:false});
  await page.goto(origin+'/studio.html#recipes');await page.locator('#recipes-main .cr-tabs').waitFor({timeout:20000});await page.locator('[data-cr-tab="all"]').click();await page.locator('#recipes-main .cr-item').first().waitFor();
  assert.match(await page.locator('#nav').innerText(),/Món ăn cộng đồng|Community recipes/);await noOverflow(page,'studio '+name);await shot(page,`${name}-studio-vi`);assert.deepEqual(errors,[]);await context.close()}
 await browser.close();console.log('Recipe form, photos, community recipes and meal search: browser checks passed.');
})().catch(e=>{console.error(e);process.exit(1)});
