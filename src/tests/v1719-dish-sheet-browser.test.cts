// v1.7.19 dish sheet — owner, 12 Nov 2026 (Sydney time, pop-up): “Isn't it an added step to edit the dish but unable to delete?
// What's your plan here so it will be more streamlined and easier to understand and work on the dish?”
// Decisions: the same three buttons in every dish sheet, wherever it opens from — the main action (from a meal: “Nấu món này” with
// that meal's amounts; from the library: “Thêm vào bữa”), “Sửa món” (a family dish in place; a catalogue dish becomes the family's
// copy, which takes its place in the library; a dish typed into a meal in that meal, “Lưu vào kho món” off by default), and one
// remove that follows the place (take off this meal / delete a family dish / hide a catalogue dish — each with undo; hidden dishes
// come back from Kho món › Đã ẩn; meals keep what they have). Viết món has “Xoá món” for family dishes. Hidden dishes are family
// state (validImport and the sync merge). Paths: library card, global search, Hôm nay meal card, Thực đơn meal card, insights.
// 320×740, 375×812, 820×1100, 1280×800, light and dark, VI and EN, a week starting on Saturday. Chromium viewport simulation.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const origin='https://kitchen.test',out='docs/reviews/v1.7.19/dish-sheet';mkdirSync(out,{recursive:true});
const mime:any={'.js':'application/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'};
const RUNS=[{w:320,h:740,lang:'vi',theme:'light'},{w:375,h:812,lang:'en',theme:'dark'},{w:820,h:1100,lang:'vi',theme:'dark'},{w:1280,h:800,lang:'en',theme:'light'},{w:375,h:812,lang:'vi',theme:'light'},{w:1280,h:800,lang:'vi',theme:'dark'}];
(async()=>{
 const browser=await chromium.launch(process.env.BEP_CHROMIUM?{executablePath:process.env.BEP_CHROMIUM}:{});let checks=0;
 try{
  for(const run of RUNS){const {lang,theme}=run,en=lang==='en',label=`${run.w}×${run.h} ${lang} ${theme}`,L=(vi:string,e:string)=>en?e:vi;
   const context=await browser.newContext({locale:'vi-VN',viewport:{width:run.w,height:run.h},serviceWorkers:'block',reducedMotion:'reduce',colorScheme:theme as any,timezoneId:'Australia/Sydney'});
   await context.addInitScript(({lang,theme}:any)=>{if(sessionStorage.getItem('qa-init'))return;sessionStorage.setItem('qa-init','1');localStorage.setItem('bep-local-locked','yes');localStorage.setItem('guest/bep-language',lang);localStorage.setItem('bep-theme-mode',theme)},{lang,theme});
   const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route(origin+'/**',async(r:any)=>{const u=new URL(r.request().url());if(u.pathname.startsWith('/.netlify/'))return r.fulfill({status:401,json:{error:'no'}});if(u.pathname==='/startup-scripts.json')return r.fulfill({json:JSON.parse(readFileSync('dist/startup-scripts.json','utf8'))});const f=resolve('dist',u.pathname==='/'?'index.html':u.pathname.slice(1));try{await r.fulfill({contentType:mime[extname(f)]||'application/octet-stream',body:readFileSync(f)})}catch{await r.fulfill({status:404,body:''})}});
   await page.goto(origin+'/#today',{waitUntil:'domcontentloaded'});await page.waitForFunction("document.querySelector('#main h1')&&typeof familyRecipeEditor==='function'&&typeof tr==='function'",null,{timeout:20000});
   const E=(s:string)=>page.evaluate(s) as Promise<any>;const shot=(n:string)=>page.screenshot({path:`${out}/${n}-${lang}-${theme}-${run.w}x${run.h}.png`});
   const ok=(c:any,m:string)=>{assert.ok(c,`${label}: ${m}`);checks++};
   const go=async(v:string)=>{await E(`(()=>{closeModal();document.getElementById('undo-bar')?.remove();view='${v}';location.hash='${v}';render();scrollTo(0,0)})()`);await page.waitForTimeout(150)};
   const footer=()=>E(`[...document.querySelectorAll('#modal-root .modal-footer [data-action]')].map(b=>b.dataset.action)`);
   const sheetOpen=()=>page.locator('#modal-root .modal').waitFor();
   const undo=async()=>{await page.locator('#undo-bar button').click();await page.waitForTimeout(150)};
   // a family with a week starting on Saturday; tonight: a family dish, a catalogue dish and a dish typed only into the meal
   await E(`(()=>{state.preferences.onboardingComplete=true;state.preferences.weekStartDay=6;state.members=[['m-ba','Ba',1],['m-me','Mẹ',1]].map(([id,name,weight])=>({id,name,weight,emoji:''}));selectedDate=sydneyDate();weekStart=planStartOf(state,selectedDate);
    const fam={id:'fam-qa',name:'Cá kho bà nội QA',category:'main',protein:'fish',time:40,servings:4,yield:4,purposes:[],ingredients:[{id:'fish',qty:500}],missingIngredients:[],prep:'',steps:['Kho cá.'],custom:true,origin:'family',favorite:false};state.recipes.unshift(fam);
    const cat=state.recipes.find(r=>!ownRecipe(r)&&r.ingredients?.length&&r.steps?.length);window.__cat=cat.id;
    const typed={id:'typed-qa',name:'Canh chua tự nấu QA',category:'soup',protein:'unknown',time:0,servings:4,ingredients:[],missingIngredients:[],prep:'',steps:[],custom:true,origin:'family'};
    const m=dayAt(state,sydneyDate()).dinner;m.cooked=false;m.attendance={'m-ba':'home','m-me':'home'};m.recipes=[clone(fam),clone(cat),typed];closeModal();save();render()})()`);
   const cat=await E('window.__cat'),catName=await E(`state.recipes.find(r=>r.id===window.__cat).name`),today=await E('sydneyDate()');
   const pills=async(where:string)=>{const f=await E(`(()=>{const bs=[...document.querySelectorAll('#modal-root .modal-footer > .btn')],r=bs.map(b=>b.getBoundingClientRect());return{n:bs.length,row:r.every(x=>Math.abs(x.top-r[0].top)<=2),h:Math.min(...r.map(x=>x.height)),art:bs.map(b=>b.classList.contains('primary')?!!b.querySelector('svg'):!b.querySelector('svg')).every(Boolean),labels:bs.map(b=>b.getAttribute('aria-label')||b.textContent.trim()),over:document.documentElement.scrollWidth-innerWidth}})()`);
    ok(f.n===3&&f.row&&f.h>=44&&f.art&&f.over<=1,`${where}: three pills side by side, ≥ 44 px, a drawing only on the main one ${JSON.stringify(f)}`)};

   // ── from a meal (Hôm nay and Thực đơn): take off this meal, edit, cook ───────────────────────────────────────────────────────
   for(const v of ['today','planner']){await go(v);const t=page.locator(`#main [data-fm="recipe-snapshot"][data-date="${today}"][data-type="dinner"]`).first();await t.scrollIntoViewIfNeeded();await t.click();await sheetOpen();
    ok(JSON.stringify(await footer())===JSON.stringify(['dish-remove-meal','dish-edit','start-cooking']),`${v} meal: Bỏ khỏi bữa / Sửa món / Nấu món này ${JSON.stringify(await footer())}`);await pills(`${v} meal`);if(v==='today')await shot('meal-dish-sheet');await E('closeModal()')}
   // cook from the meal: the meal's amounts (and a dish with no steps still opens)
   await E(`(()=>{const m=dayAt(state,sydneyDate()).dinner;showRecipe('typed-qa',m.recipes[2],m)})()`);await sheetOpen();await page.locator('#modal-root [data-action="start-cooking"]').click();await page.locator('#modal-root .cooking-no-steps').waitFor();ok(true,'a dish without steps opens cooking mode and says what to add');await E('cooking=null;closeModal()');
   // take the catalogue dish off this meal → undo
   await E(`(()=>{const m=dayAt(state,sydneyDate()).dinner;showRecipe(window.__cat,m.recipes[1],m)})()`);await sheetOpen();await page.locator('#modal-root [data-action="dish-remove-meal"]').click();await page.waitForTimeout(150);
   ok(await E(`!dayAt(state,sydneyDate()).dinner.recipes.some(r=>r.id===window.__cat)&&state.recipes.some(r=>r.id===window.__cat)`),'Bỏ khỏi bữa takes it off this meal only');await undo();
   ok(await E(`dayAt(state,sydneyDate()).dinner.recipes[1].id===window.__cat`),'undo puts it back in its place');
   // the typed dish: Sửa món edits it in the meal; “Lưu vào kho món” off by default
   await E(`(()=>{const m=dayAt(state,sydneyDate()).dinner;showRecipe('typed-qa',m.recipes[2],m)})()`);await sheetOpen();await page.locator('#modal-root [data-action="dish-edit"]').click();await page.locator('#family-recipe-form').waitFor();await page.waitForTimeout(150);
   ok(await E(`document.querySelector('#family-recipe-form [name="saveLib"]').checked===false`),'“Lưu vào kho món” is off by default');await shot('editor-meal-dish');
   await E(`(()=>{const f=document.querySelector('#family-recipe-form');f.name.value='Canh chua bà nội QA';f.yield.value='4'})()`);await page.locator('#modal-root .modal-footer [data-action="submit-form"]').click();await page.waitForTimeout(250);
   ok(await E(`dayAt(state,sydneyDate()).dinner.recipes[2].name==='Canh chua bà nội QA'&&dayAt(state,sydneyDate()).dinner.recipes[2].id==='typed-qa'&&!state.recipes.some(r=>r.id==='typed-qa')`),'saved in this meal only');
   await E(`(()=>{const m=dayAt(state,sydneyDate()).dinner;familyRecipeEditor(undefined,clone(m.recipes[2]),{date:sydneyDate(),type:'dinner',dishId:'typed-qa'})})()`);await page.locator('#family-recipe-form').waitFor();await page.waitForTimeout(150);
   await page.locator('#family-recipe-form [name="saveLib"]').check();await page.locator('#modal-root .modal-footer [data-action="submit-form"]').click();await page.waitForTimeout(250);
   ok(await E(`state.recipes.some(r=>r.id==='typed-qa'&&r.name==='Canh chua bà nội QA'&&r.custom)`),'ticked: also saved to the library');

   // ── from the library: family dish → delete with undo; catalogue → hide, show again; edit makes the family's copy ─────────────
   await go('recipes');await page.fill('#family-recipe-search','Cá kho bà nội QA');await page.waitForTimeout(250);
   await page.locator('#family-recipe-results [data-action="recipe-detail"][data-id="fam-qa"]').first().click();await sheetOpen();
   ok(JSON.stringify(await footer())===JSON.stringify(['dish-delete','dish-edit','add-to-meal']),`library family dish: Xoá khỏi kho / Sửa món / Thêm vào bữa ${JSON.stringify(await footer())}`);await pills('library family dish');await shot('library-family-dish');
   await page.locator('#modal-root [data-action="dish-delete"]').click();await page.waitForTimeout(150);
   ok(await E(`!state.recipes.some(r=>r.id==='fam-qa')&&dayAt(state,sydneyDate()).dinner.recipes.some(r=>r.id==='fam-qa')`),'deleted from the library; tonight keeps it');ok(!(await E(`!!document.querySelector('#modal-root .modal')`)),'no confirm step');
   await undo();ok(await E(`state.recipes.some(r=>r.id==='fam-qa')`),'undo brings it back');
   // search → the same sheet
   const hit=await E(`(()=>{const h=searchHits('Cá kho bà nội QA').find(x=>x.g==='recipe'||/Cá kho bà nội QA/.test(x.title));if(!h)return false;h.go();return true})()`);ok(hit,'search finds the family dish');await sheetOpen();await page.waitForTimeout(100);
   ok(JSON.stringify(await footer())===JSON.stringify(['dish-delete','dish-edit','add-to-meal']),'search: the same three buttons');await E('closeModal()');
   // catalogue dish: hide → gone from the library and suggestions; Đã ẩn → show again
   await E(`showRecipe(window.__cat)`);await sheetOpen();ok(JSON.stringify(await footer())===JSON.stringify(['dish-hide','dish-edit','add-to-meal']),'library catalogue dish: Ẩn khỏi kho / Sửa món / Thêm vào bữa');await pills('library catalogue dish');
   await page.locator('#modal-root [data-action="dish-hide"]').click();await page.waitForTimeout(150);
   ok(await E(`recipeHidden(state,window.__cat)&&state.recipes.some(r=>r.id===window.__cat)&&!allowedRecipe(state.recipes.find(r=>r.id===window.__cat),state)&&!familyRecipePool('all').some(r=>r.id===window.__cat)&&dayAt(state,sydneyDate()).dinner.recipes.some(r=>r.id===window.__cat)`),'hidden: out of the library and suggestions, nothing lost, tonight keeps it');
   await E(`familyRecipeSearch=''`);await go('recipes');const tab=page.locator('#main [data-fm="hidden"]');ok(await tab.count()===1,'Kho món shows “Đã ẩn”');await tab.click();await page.waitForTimeout(150);await shot('library-hidden-tab');
   await page.locator(`#family-recipe-results [data-action="recipe-detail"][data-id="${cat}"]`).first().click();await sheetOpen();
   ok(JSON.stringify(await footer())===JSON.stringify(['dish-edit','dish-unhide']),'a hidden dish offers to show it again');await page.locator('#modal-root [data-action="dish-unhide"]').click();await page.waitForTimeout(150);
   ok(await E(`!recipeHidden(state,window.__cat)&&familyRecipePool('all').some(r=>r.id===window.__cat)`),'shown again');
   // Sửa món on a catalogue dish: the family's copy takes its place in the library; the original is hidden, not lost
   await E(`(()=>{familyLibraryMode='all';showRecipe(window.__cat)})()`);await sheetOpen();await page.locator('#modal-root [data-action="dish-edit"]').click();await page.locator('#family-recipe-form').waitFor();await page.waitForTimeout(150);
   await E(`(()=>{const f=document.querySelector('#family-recipe-form');f.name.value=f.name.value+' nhà mình'})()`);await page.locator('#modal-root .modal-footer [data-action="submit-form"]').click();await page.waitForTimeout(250);
   ok(await E(`state.recipes.some(r=>r.name===${JSON.stringify(catName+' nhà mình')}&&ownRecipe(r))&&recipeHidden(state,window.__cat)&&familyRecipePool('all').some(r=>r.name===${JSON.stringify(catName+' nhà mình')})`),'the family copy replaces the catalogue dish in the library');
   // Viết món: “Xoá món” for a family dish, with undo
   await E(`familyRecipeEditor('fam-qa')`);await page.locator('#family-recipe-form').waitFor();const del=page.locator('#family-recipe-form .recipe-delete-row [data-action="dish-delete"]');
   ok(await del.count()===1&&(await del.boundingBox())!.height>=44,'Viết món has “Xoá món”, ≥ 44 px');await del.scrollIntoViewIfNeeded();await shot('editor-delete');await del.click();await page.waitForTimeout(150);
   ok(await E(`!state.recipes.some(r=>r.id==='fam-qa')`),'Xoá món deletes it');await undo();ok(await E(`state.recipes.some(r=>r.id==='fam-qa')`),'and can be undone');
   // insights path
   await E(`(()=>{const b=document.createElement('button');b.dataset.insight='recipe';b.dataset.id='fam-qa';document.body.append(b);b.click();b.remove()})()`);await sheetOpen();await page.waitForTimeout(100);
   ok(JSON.stringify(await footer())===JSON.stringify(['dish-delete','dish-edit','add-to-meal']),'insights: the same three buttons');await E('closeModal()');
   ok(new RegExp(L('Nấu món này|Thêm vào bữa','Cook this|Add to a meal')).test(await E(`(()=>{showRecipe('fam-qa');return document.querySelector('#modal-root .modal-footer .primary').textContent})()`)),'situational wording');await E('closeModal()');

   // ── hidden dishes are family state: validImport, sync merge both ways ────────────────────────────────────────────────────────
   const sm=await E(`(()=>{const base=JSON.parse(JSON.stringify(state));setRecipeHidden(base,'qa-x',true);const a=JSON.parse(JSON.stringify(base)),b=JSON.parse(JSON.stringify(base));setRecipeHidden(a,'qa-a',true);setRecipeHidden(b,'qa-x',false);setRecipeHidden(b,'qa-b',true);
    const m=mergeFamilyStates(base,a,b).state,m2=mergeFamilyStates(base,b,a).state;const bad=JSON.parse(JSON.stringify(state));bad.hiddenRecipeIds=[5];
    return{h:(m.hiddenRecipeIds||[]).slice().sort(),h2:(m2.hiddenRecipeIds||[]).slice().sort(),valid:validImport(m)&&validImport(JSON.parse(JSON.stringify(state))),bad:validImport(bad)}})()`);
   ok(sm.valid&&!sm.bad,'validImport accepts the hidden list and rejects a broken one');ok(JSON.stringify(sm.h)===JSON.stringify([cat,'qa-a','qa-b'].sort())&&JSON.stringify(sm.h2)===JSON.stringify(sm.h),`sync merge: hide on one device and show on another both apply ${JSON.stringify(sm)}`);
   ok(!errors.length,'no page errors '+errors.join(' | '));await context.close();console.log('ok',label);
  }
  console.log(`PASS v1.7.19 dish sheet: the same three buttons everywhere, edit, delete / hide with undo (${checks} checks)`);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
