// v1.7.7 owner report (6 Nov 2026, Sydney time): "Run price online bị fail nhiều lần" — Studio → Giá online showed
// "Request failed" because a full refresh takes over a minute. Against the REAL Studio handler (in-memory stores,
// synthetic proposals only): the switches sit on one line, "Run now" starts the background run and the page says
// "Đang chạy từ … (giờ Sydney)", and "Đúng hết" confirms the remaining proposals in one go. 375×812, 820×1100 and
// 1280×800 (VI light, EN dark); screenshots in docs/reviews/v1.7.8 (browser viewport simulation, not physical devices).
// v1.7.8 owner report (6 Nov 2026, 14:13 Sydney time): "nhìn không rõ cái nào là cái nào, và tại sao lại xác nhận thêm lần
// nữa?" — products are grouped one card per item with one line per supermarket; with auto-confirm on (the default) there is
// no ✓ / "Đúng hết", only "Sai món"; ✓ and "Đúng hết" come back when the owner turns auto-confirm off.
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';
const out='docs/reviews/v1.7.8';mkdirSync(out,{recursive:true});
(async()=>{
 const {studioWorld,openStudio}=await import('./helpers/studio-nav-harness.mjs');
 const {createStudioHandler}=await import('../netlify/functions/studio.mjs');
 const {CACHE_STORE}=await import('../netlify/lib/grocery-pricing.mjs');
 const {ONLINE_PROPOSALS_KEY,ONLINE_MAPPING_KEY}=await import('../netlify/lib/online-prices.mjs');
 const {ONLINE_RUN_KEY}=await import('../netlify/lib/online-run.mjs');
 const world=await studioWorld({devices:false,feedback:false});const browser=await chromium.launch();
 const started:any[]=[];
 world.handlers.studio=createStudioHandler({getStoreFn:world.getStoreFn,env:{...world.env,PINCH_API_KEY:'synthetic',WHICHGROCER_API_KEY:'synthetic',URL:'https://kitchen.test'},limits:{all:100000,mutate:100000},mailer:{configured:()=>false,async send(){}},refreshFetch:async(u:string)=>{started.push(u);return new Response(null,{status:202})}});
 const studioStore=world.getStoreFn({name:'bep-studio'}),cache=world.getStoreFn({name:CACHE_STORE});
 const cur=await studioStore.get('settings/platform',{type:'json'})||{};await studioStore.setJSON('settings/platform',{...cur,flags:{...(cur.flags||{}),onlinePinch:true,onlineWhichGrocer:true}});
 const seed=async()=>{await cache.delete?.(ONLINE_RUN_KEY);await cache.setJSON(ONLINE_RUN_KEY,{running:false,startedAt:new Date(Date.now()-3600000).toISOString(),by:'schedule',finishedAt:new Date(Date.now()-3500000).toISOString(),error:null});
  await cache.setJSON(ONLINE_MAPPING_KEY,{});await cache.setJSON(ONLINE_PROPOSALS_KEY,{at:new Date().toISOString(),items:[['rau-muong','woolworths','QA Kangkong bunch',2.5],['rau-thom','coles','QA Herb mix 40g',3],['ngo','aldi','QA Sweet corn 2 pack',2.99]].map(([itemId,retailer,label,price])=>({itemId,retailer,productId:'qa-'+itemId,label,price,provider:'Pinch'}))})};
 for(const [size,viewport,lang,theme] of [['mobile',{width:375,height:812},'vi','light'],['tablet',{width:820,height:1100},'en','dark'],['desktop',{width:1280,height:800},'vi','light']] as any[]){
  await seed();started.length=0;
  const {context,page,errors}=await openStudio(browser,world,{viewport,lang,theme,hash:'#onlinePrices'});await page.locator('#online-run').waitFor({timeout:20000});
  // switches: tick box and its words on one line
  for(const h of await page.locator('label.check:has([data-online-flag])').evaluateAll((a:any[])=>a.map(e=>Math.round(e.getBoundingClientRect().height))))assert.ok(h<=56,`${size}: switch on one line (${h}px)`);
  await page.locator('#online-run').click();const line=page.locator('.online-running');await line.waitFor();
  assert.match(await line.innerText(),lang==='vi'?/Đang chạy từ .*giờ Sydney/:/Running since .*Sydney time/);assert.equal(started.length,1,'background run started once');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`${size}: no horizontal overflow`);
  await page.screenshot({path:`${out}/online-running-${lang}-${theme}-${size}.png`,fullPage:true});
  // auto-confirm on (default): one card per item, one line per store, only "Sai món"
  assert.equal(await page.locator('.or-item').count(),3,`${size}: one card per item`);assert.equal(await page.locator('[data-online-ok], #online-ok-all').count(),0,`${size}: nothing to confirm again`);
  assert.match(await page.locator('.or-item').first().innerText(),/Woolworths|Coles|ALDI/i,`${size}: store named in full`);
  for(const r of await page.locator('.or-line').evaluateAll((a:any[])=>a.map(e=>{const b=e.getBoundingClientRect(),n=e.querySelector('.or-no').getBoundingClientRect();return{w:b.width,right:b.right,nr:n.right,nh:n.height}})))assert.ok(r.nr<=r.right+1&&r.nh>=44,`${size}: "Sai món" inside its line and 44 px`);
  await page.locator('.online-review-card').scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/online-products-${lang}-${theme}-${size}.png`,fullPage:true});
  await page.locator('[data-online-no="0"]').click();await page.waitForTimeout(300);assert.equal(await page.locator('.or-item').count(),2,`${size}: the wrong product's card is gone`);
  let mp=await cache.get(ONLINE_MAPPING_KEY,{type:'json'});assert.ok(mp['rau-muong']?.woolworths?.rejected?.includes('qa-rau-muong'),'Sai món rejects the product');
  // auto-confirm off: ✓ / ✗ and "Đúng hết" for the rest
  await studioStore.setJSON('settings/platform',{...(await studioStore.get('settings/platform',{type:'json'})),flags:{...((await studioStore.get('settings/platform',{type:'json'}))?.flags||{}),onlineAutoConfirm:false}});
  await seed();await page.evaluate(()=>location.reload());await page.locator('#online-ok-all').waitFor({timeout:20000});
  await page.locator('[data-online-no="0"]').click();await page.waitForTimeout(300);
  await page.locator('#online-ok-all').click();// the harness accepts confirm() dialogs
  await page.waitForTimeout(800);
  mp=await cache.get(ONLINE_MAPPING_KEY,{type:'json'});assert.equal(mp['rau-thom']?.coles?.ok,true);assert.equal(mp['ngo']?.aldi?.ok,true);assert.notEqual(mp['rau-muong']?.woolworths?.ok,true,'the ✗ row stays rejected');
  await studioStore.setJSON('settings/platform',{...(await studioStore.get('settings/platform',{type:'json'})),flags:{...((await studioStore.get('settings/platform',{type:'json'}))?.flags||{}),onlineAutoConfirm:true}});
  assert.deepEqual(errors,[],size+': no page errors');await context.close()}
 await browser.close();console.log('PASS Studio online prices: switches on one line, Run now starts the background run (“running since … Sydney time”), one card per item with only “Wrong” when auto-confirm is on; ✗ then “All correct” when it is off — 375/820/1280, VI/EN');
})().catch((e:any)=>{console.error(e);process.exit(1)});
