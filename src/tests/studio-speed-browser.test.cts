// Studio speed in the browser: real Studio handler + seeded in-memory stores behind a slow
// network (every Studio request waits 1.5 s). Checks that switching to a visited tab shows the
// saved copy at once and then refreshes in the background, that a first visit shows skeleton
// rows, that fast tab switches abort superseded requests and never let an older tab overwrite
// a newer one, that `me` is fetched once, that a Studio change clears saved copies, and the
// "updated X ago" bar at 375×812, 820×1100 and 1280×800 in VI and EN (screenshots saved to
// docs/reviews/v1.5/studio/speed/). Browser viewport simulation only; synthetic data only.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const origin='https://kitchen.test',out='docs/reviews/v1.5/studio/speed';
const mime:any={'.js':'application/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
const sizes:any={mobile:{width:375,height:812},tablet:{width:820,height:1100},desktop:{width:1280,height:800}};
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
async function main(){
 mkdirSync(out,{recursive:true});
 const {createStudioHandler}=await import('../netlify/functions/studio.mjs' as any),{memoryStores}=await import('./helpers/accounts.mjs' as any),{seedStudioLoad}=await import('./helpers/studio-load.mjs' as any);
 const getStoreFn=memoryStores(),{cookie,people}=await seedStudioLoad(getStoreFn,{events:300});
 const studio=createStudioHandler({getStoreFn,env:{STUDIO_ADMINS:'henrynguyen'},mailer:{configured:()=>false,async send(){}},limits:{all:100000,mutate:100000}});
 let delay=1500;
 const browser=await chromium.launch();
 async function open({viewport=sizes.desktop,lang='vi',hash='#overview'}:any={}){
  const context=await browser.newContext({viewport,serviceWorkers:'block',reducedMotion:'reduce'});
  await context.addInitScript((l:string)=>{localStorage.setItem('studio-lang',l);localStorage.setItem('studio-theme','light')},lang);
  const page=await context.newPage(),errors:string[]=[],calls:string[]=[],aborted:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('requestfailed',r=>{if(r.url().includes('/studio?')&&/ABORT/i.test(r.failure()?.errorText||''))aborted.push(new URL(r.url()).searchParams.get('op')||'')});
  await page.route(origin+'/**',async route=>{const req=route.request(),url=new URL(req.url());
   if(url.pathname==='/.netlify/functions/studio'){calls.push(url.searchParams.get('op')+(url.searchParams.get('fresh')?'+fresh':''));await sleep(delay);
    const body=req.postData();const res=await studio(new Request(url.href,{method:req.method(),headers:{Cookie:cookie,Origin:origin,...(req.headers()['x-studio-csrf']?{'x-studio-csrf':req.headers()['x-studio-csrf']}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body}:{})}));
    try{await route.fulfill({status:res.status,headers:{'content-type':'application/json'},body:Buffer.from(await res.arrayBuffer())})}catch{}return}
   const file=resolve('dist',url.pathname.slice(1)||'studio.html');try{await route.fulfill({contentType:mime[extname(file)]||'application/octet-stream',body:readFileSync(file)})}catch{await route.fulfill({status:404,body:''})}});
  await page.goto(origin+'/studio.html'+hash);return{page,context,errors,calls,aborted};
 }
 const age=(page:any,ms:number)=>page.evaluate((ms:number)=>{for(const k of Object.keys(sessionStorage))if(k.startsWith('studio-view:')){const v=JSON.parse(sessionStorage.getItem(k)!);v.at-=ms;sessionStorage.setItem(k,JSON.stringify(v))}},ms);
 const overflow=(page:any)=>page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);

 // 1. First visit: skeleton rows while loading, then content; me fetched once.
 {const {page,context,errors,calls,aborted}=await open();
  await page.waitForSelector('#main .skel');assert.equal(await page.locator('#main .skel').count(),1,'skeleton on first load');
  await page.waitForSelector('#main .tiles',{timeout:15000});
  // Prefetch after first paint fills the next tab (accounts).
  await page.waitForFunction(()=>Object.keys(sessionStorage).some(k=>k.includes('op=accounts')),null,{timeout:15000});
  // 2. Switch to a prefetched tab: content shows without waiting for the 600 ms network.
  const t=Date.now();await page.evaluate(()=>{location.hash='#accounts'});await page.waitForSelector('#main table, #main .cards, #main .empty, #main [data-acct]');const shown=Date.now()-t;
  assert.ok(shown<1000,'cached tab shown in '+shown+' ms (network is 1500 ms)');assert.equal(await page.locator('#main .skel').count(),0);
  // 3. Older saved copy: shown at once, labelled, then refreshed in the background.
  await page.evaluate(()=>{location.hash='#overview'});await page.waitForSelector('#main .tiles');await age(page,60000);
  const before=calls.length,t2=Date.now();await page.evaluate(()=>{location.hash='#accounts'});await page.waitForSelector('#main [data-acct]');assert.ok(Date.now()-t2<1000,'stale copy shown at once');
  assert.match(await page.locator('.fresh').innerText(),/Bản đã lưu|đang làm mới/);
  await page.waitForFunction(()=>/Cập nhật/.test(document.querySelector('.fresh')?.textContent||'')&&!/đang làm mới/.test(document.querySelector('.fresh')?.textContent||''),null,{timeout:10000});
  assert.ok(calls.slice(before).includes('accounts'),'background refresh request');
  // 4. Changed data redraws the tab without a reload (index rebuilt by Refresh).
  await getStoreFn({name:'bep-accounts'}).setJSON('users/zz-newcomer',{username:'zz-newcomer',name:'Người mới (mẫu)',createdAt:new Date().toISOString(),epoch:'n'});
  await page.locator('[data-refresh]').click();await page.waitForFunction(()=>document.querySelector('#main')?.textContent?.includes('zz-newcomer'),null,{timeout:10000});
  assert.ok(calls.includes('accounts+fresh'),'Refresh asks the server to rebuild');
  // 5. Fast switching: superseded requests are aborted and the last tab wins.
  await page.evaluate(()=>{for(const k of Object.keys(sessionStorage))if(k.startsWith('studio-view:'))sessionStorage.removeItem(k)});
  aborted.length=0;for(const h of ['#families','#invites','#messages','#settings'])await page.evaluate((h:string)=>{location.hash=h},h);
  await page.waitForSelector('#sf',{timeout:15000});await sleep(1500);
  assert.match(await page.locator('#main h1').innerText(),/Cài đặt nền tảng/,'last tab stays on screen');assert.ok(aborted.length>=2,'aborted: '+aborted.join(','));
  assert.equal(calls.filter(c=>c==='me').length,1,'me fetched once');
  // 6. A Studio change clears saved copies (recompute on overview).
  await page.evaluate(()=>{location.hash='#overview'});await page.waitForSelector('#recompute');await page.locator('#recompute').click();await page.waitForSelector('#toast.show');
  assert.equal(await page.evaluate(()=>Object.keys(sessionStorage).filter(k=>k.startsWith('studio-view:')&&!k.includes('op=overview')).length),0,'saved copies cleared after a change');
  assert.ok(!(await page.evaluate(()=>JSON.stringify(sessionStorage))).includes('csrf'),'no CSRF token in saved copies');
  assert.deepEqual(errors,[]);await context.close()}

 // 7. Responsive: freshness bar at mobile / tablet / desktop, VI and EN, no overflow, 44 px target.
 for(const [size,lang] of [['mobile','vi'],['mobile','en'],['tablet','vi'],['tablet','en'],['desktop','vi'],['desktop','en']] as const){
  const {page,context,errors}=await open({viewport:sizes[size],lang,hash:'#families'});await page.waitForSelector('#main [data-fam]',{timeout:15000});
  await page.evaluate(()=>{location.hash='#accounts'});await page.waitForSelector('#main [data-acct]',{timeout:15000});await page.evaluate(()=>{location.hash='#families'});await page.waitForSelector('#main [data-fam]');
  await age(page,95000);await page.evaluate(()=>{location.hash='#accounts'});await page.waitForSelector('.fresh.stale');
  assert.match(await page.locator('.fresh').innerText(),lang==='vi'?/Bản đã lưu/:/Saved copy/);
  await page.screenshot({path:`${out}/stale-copy-${lang}-${size}-${sizes[size].width}x${sizes[size].height}.png`});
  await page.waitForFunction(()=>!document.querySelector('.fresh.stale'),null,{timeout:10000});
  assert.match(await page.locator('.fresh').innerText(),lang==='vi'?/Cập nhật/:/Updated/);
  assert.ok(await overflow(page)<=1,size+' overflow');const h=await page.locator('[data-refresh]').evaluate((e:any)=>e.getBoundingClientRect().height);if(size!=='desktop')assert.ok(h>=44,'refresh target '+h);
  await page.screenshot({path:`${out}/refreshed-${lang}-${size}-${sizes[size].width}x${sizes[size].height}.png`});
  if(lang==='vi'){delay=4000;await page.evaluate(()=>{for(const k of Object.keys(sessionStorage))if(k.includes('op=health'))sessionStorage.removeItem(k);location.hash='#health'});await page.waitForSelector('#main .skel');await page.screenshot({path:`${out}/skeleton-${lang}-${size}-${sizes[size].width}x${sizes[size].height}.png`});assert.ok(await overflow(page)<=1);delay=1500;await page.waitForSelector('#main .page-head',{timeout:15000})}
  assert.deepEqual(errors,[]);await context.close()}
 await browser.close();console.log('Studio speed browser tests passed.');
}
main().catch(e=>{console.error(e);process.exit(1)});
