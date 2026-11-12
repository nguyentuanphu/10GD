// v1.7.19 (rule 36): a brand-new device opens every screen without a start-up error.
// Found 13 Nov 2026 (Sydney time): the planner banner called tr() while the planner was first drawn during start-up, before
// language.js had loaded; a new device opening on #planner saw “Chưa mở được Bếp Nhà”. Only test:menu-reactions caught it,
// by chance. This suite opens each screen first, on a device with nothing stored (no language, no family, no settings), with the
// phone set to Vietnamese and to English, at a phone and a desktop size. Chromium viewport simulation.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const origin='https://kitchen.test';
const mime:any={'.js':'application/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'};
const SCREENS=['today','planner','shopping','recipes','pantry','expenses','insights','products','habits'];
const RUNS=[{locale:'vi-VN',w:375,h:812},{locale:'en-AU',w:1280,h:800}];
(async()=>{
 const browser=await chromium.launch(process.env.BEP_CHROMIUM?{executablePath:process.env.BEP_CHROMIUM}:{});let checks=0;
 try{
  for(const run of RUNS)for(const screen of SCREENS){const label=`${screen} ${run.locale} ${run.w}×${run.h}`;
   const context=await browser.newContext({locale:run.locale,viewport:{width:run.w,height:run.h},serviceWorkers:'block',reducedMotion:'reduce',timezoneId:'Australia/Sydney'});
   const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(String(e.stack||e.message).split('\n').slice(0,3).join(' | ')));
   await page.route(origin+'/**',async(r:any)=>{const u=new URL(r.request().url());
    if(u.pathname.startsWith('/.netlify/')){const op=u.searchParams.get('op');return r.fulfill({json:op==='status'?{configured:false,connected:false}:op==='state'?{state:null,etag:null}:op==='families'?{families:[]}:{announcements:[],devices:[]}})}
    if(u.pathname==='/startup-scripts.json')return r.fulfill({json:JSON.parse(readFileSync('dist/startup-scripts.json','utf8'))});
    const f=resolve('dist',u.pathname==='/'?'index.html':u.pathname.slice(1));try{await r.fulfill({contentType:mime[extname(f)]||'application/octet-stream',body:readFileSync(f)})}catch{await r.fulfill({status:404,body:''})}});
   await page.goto(`${origin}/#${screen}`,{waitUntil:'domcontentloaded'});
   const opened=await page.locator('#main .page-heading').first().waitFor({timeout:20000}).then(()=>true,()=>false);
   const failed=await page.evaluate(()=>/Chưa mở được|Unable to open/.test(document.body.innerText));
   assert.ok(opened&&!failed,`${label}: the screen opens on a new device ${JSON.stringify(errors)}`);checks++;
   assert.deepEqual(errors,[],`${label}: no start-up error`);checks++;
   await context.close()}
  console.log(`PASS fresh start: ${SCREENS.length} screens × ${RUNS.length} devices open with nothing stored (${checks} checks)`);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
