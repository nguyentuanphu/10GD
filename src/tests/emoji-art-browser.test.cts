// v1.7.5 owner rule 19–21: no phone emoji in the interface. Every screen of the app is rendered (device-only state with a
// generated week), the visible text is scanned for emoji presentation characters, and our drawings must be there instead.
// 320×740, 375×812, 820×1100, 1280×800; VI/EN. Browser viewport simulation, not physical devices.
// Screenshots: docs/reviews/v1.7.5/emoji-art/.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const origin='https://kitchen.test',out='docs/reviews/v1.7.5/emoji-art';mkdirSync(out,{recursive:true});
const mime:any={'.js':'application/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'};
const sizes:any={narrow:{width:320,height:740},mobile:{width:375,height:812},tablet:{width:820,height:1100},desktop:{width:1280,height:800}};
// emoji drawn in colour by phones; plain text glyphs (✓ ✕ ▾ ●) are allowed
const EMOJI=/\p{Emoji_Presentation}|\p{Extended_Pictographic}️/u;
(async()=>{
 const browser=await chromium.launch();
 try{
  for(const [size,lang] of [['mobile','vi'],['narrow','vi'],['tablet','en'],['desktop','vi']] as const){
   const context=await browser.newContext({locale:'vi-VN',viewport:sizes[size],serviceWorkers:'block',reducedMotion:'reduce',timezoneId:'Australia/Sydney'});
   await context.addInitScript((lang:string)=>{if(sessionStorage.getItem('qa-init'))return;sessionStorage.setItem('qa-init','1');localStorage.setItem('bep-local-locked','yes');localStorage.setItem('guest/bep-language',lang)},lang);
   const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route(origin+'/**',async(r:any)=>{const u=new URL(r.request().url());if(u.pathname.startsWith('/.netlify/'))return r.fulfill({status:401,json:{error:'no'}});if(u.pathname==='/startup-scripts.json')return r.fulfill({json:JSON.parse(readFileSync('dist/startup-scripts.json','utf8'))});const f=resolve('dist',u.pathname==='/'?'index.html':u.pathname.slice(1));try{await r.fulfill({contentType:mime[extname(f)]||'application/octet-stream',body:readFileSync(f)})}catch{await r.fulfill({status:404,body:''})}});
   await page.goto(origin+'/#today',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#main h1'),null,{timeout:20000});
   await page.evaluate('state.preferences.onboardingComplete=true;save();if(typeof closeModal==="function")closeModal()');
   for(const v of ['today','planner','shopping','recipes','insights']){
    await page.evaluate(`view=${JSON.stringify(v)};render()`);await page.waitForTimeout(400);
    const bad=await page.evaluate((src:string)=>{const re=new RegExp(src,'u'),hits:string[]=[];const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);while(w.nextNode()){const n:any=w.currentNode,p=n.parentElement;if(!p||p.closest('[data-user-content],script,style,textarea')||!p.getClientRects().length)continue;if(re.test(n.nodeValue))hits.push(n.nodeValue.trim().slice(0,40))}return hits},EMOJI.source);
    assert.deepEqual(bad,[],`${size} ${v}: emoji left in the interface`);
    assert.ok(await page.locator('.emo-art svg').count()>0,`${size} ${v}: drawings shown`);
    const ow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.ok(ow<=1,`${size} ${v}: overflow ${ow}`);
    await page.screenshot({path:`${out}/${v}-${lang}-${sizes[size].width}x${sizes[size].height}.png`});
   }
   // dialogs too: settings and the add-to-list sheet
   await page.evaluate('otherSettingsModal("")');await page.waitForTimeout(300);
   const badModal=await page.evaluate((src:string)=>{const re=new RegExp(src,'u');return [...document.querySelectorAll('.modal *')].filter((e:any)=>e.childNodes.length&&[...e.childNodes].some((n:any)=>n.nodeType===3&&re.test(n.nodeValue))&&!e.closest('[data-user-content]')).map((e:any)=>e.textContent.trim().slice(0,40))},EMOJI.source);
   assert.deepEqual(badModal,[],size+' settings dialog');await page.screenshot({path:`${out}/settings-${lang}-${sizes[size].width}x${sizes[size].height}.png`});
   assert.deepEqual(errors,[]);await context.close();
  }
  // family-authored text is never rewritten: an emoji the family typed stays as typed
  {const context=await browser.newContext({locale:'vi-VN',viewport:sizes.mobile,serviceWorkers:'block'});const page=await context.newPage();await page.setContent(`<div id="a">Đi chợ 🛒 <b data-user-content>Món của Bố 🍜</b><select><option>🛒 Đi chợ</option></select><button title="🛒 Mở">x</button></div><script>${readFileSync('dist/emoji-art.js','utf8')}</script>`);await page.waitForTimeout(100);
   assert.equal(await page.locator('[data-user-content]').innerText(),'Món của Bố 🍜');assert.equal(await page.locator('#a span.emo-art').count(),1,'interface emoji drawn');assert.equal((await page.locator('option').innerText()).trim(),'Đi chợ','options drop emoji');assert.equal(await page.locator('button').getAttribute('title'),'Mở');await context.close()}
  console.log('PASS no emoji in the interface: today, planner, shopping, recipes, insights and settings at 320/375/820/1280 (VI/EN), drawings shown, no overflow; family text kept as typed; options and titles without emoji');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
