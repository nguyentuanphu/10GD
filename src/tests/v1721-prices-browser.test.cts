// v1.7.21 in Chromium (Henry, 14 Nov 2026 phone screenshots): online prices on the shopping list and in the So Giá price
// history. (1) Each store's line in the price-history sheet shows that store's product photo, source named, over our drawing;
// a photo that cannot load leaves the drawing (never an emoji); decorative (aria-hidden); lazy; a fixed box, so the words
// do not move when it loads. (2) A product sold by weight (“Whole … Chicken per kg”) shows “$3.99/kg”, not “$3.99”.
// 320×740, 375×812, 820×1100, 1280×800; VI/EN; light/dark. Browser viewport simulation, not physical devices.
// Prices below are synthetic QA fixtures, not real prices. Screenshots: docs/reviews/v1.7.21/prices/.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const origin='https://kitchen.test',out='docs/reviews/v1.7.21/prices';
const mime:any={'.js':'application/javascript','.css':'text/css','.html':'text/html','.webmanifest':'application/manifest+json','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
const sizes:any={narrow:{width:320,height:740},mobile:{width:375,height:812},tablet:{width:820,height:1100},desktop:{width:1280,height:800}};
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Australia/Sydney',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
let n=0;const on=(itemId:string,label:string,retailer:string,price:number,extra:any={})=>({id:'online-pinch-'+itemId+'-'+retailer+(++n),itemId,label,retailer,branchId:null,state:'NSW',price,currency:'AUD',packQty:null,packUnit:null,units:null,unitPrice:null,unitBasis:null,wasPrice:null,promo:null,validUntil:null,observedAt:today,observedBy:'Pinch',source:'official',note:'online',confidence:'high',...extra});
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFklEQVR42mNk+M9Qz0AEYBxVSF+FAP5FDvcfRYWgAAAAAElFTkSuQmCC','base64');
const OFFICIAL={cycleId:today,importedAt:today+'T06:05:00.000Z',source:'online',attribution:['Price data by Pinch'],observations:[
 on('chanh-vang','Lemons 5 Pack','coles',4.5,{packQty:5,packUnit:'each',unitPrice:0.9,unitBasis:'per_each',photo:'https://productimages.coles.com.au/productimages/1/qa-lemon.png'}),
 // ALDI's photo is gone (404): its line keeps our drawing
 on('chanh-vang','Lemons Bag 1kg','aldi',4.99,{photo:'https://dm.apac.cms.aldi.cx/is/image/qa-missing.png'}),
 // no photo at all from Woolworths
 on('chanh-vang','Lemons Loose','woolworths',1.2,{unitPrice:1.2,unitBasis:'per_each'}),
 on('ga-nguyen-con','Whole RSPCA Approved Chicken per kg','aldi',3.99,{unitPrice:3.99,unitBasis:'per_kg',photo:'https://dm.apac.cms.aldi.cx/is/image/qa-chicken.png'}),
 on('ga-nguyen-con','Coles RSPCA Approved Whole Chicken 1.6kg','coles',9.6,{packQty:1600,packUnit:'g',unitPrice:6,unitBasis:'per_kg'})]};
const EXTRAS=[['Chanh vàng','3 quả'],['Gà chạy bộ (nguyên con)','1 con']];
(async()=>{
 mkdirSync(out,{recursive:true});const browser=await chromium.launch();
 let photoLoads=0;
 async function open(size:string,lang='vi',theme='light'){
  const context=await browser.newContext({locale:'vi-VN',viewport:sizes[size],serviceWorkers:'block',reducedMotion:'reduce',colorScheme:theme as any,timezoneId:'Australia/Sydney'});
  const scope='account/qa-household/',scout={version:1,open:false,fold176:true,postcode:'2166',state:'NSW',prefs:{},local:[],pending:[],pool:{at:Date.now()-5*3600e3,observations:[],official:null}};
  await context.addInitScript(({scope,lang,theme,scout}:any)=>{if(sessionStorage.getItem('qa-init'))return;sessionStorage.setItem('qa-init','1');localStorage.setItem('bep-theme-mode',theme);localStorage.setItem(scope+'bep-language',lang);localStorage.setItem('bep-account-present','yes');localStorage.setItem(scope+'bep-price-scout-v1',JSON.stringify(scout))},{scope,lang,theme,scout});
  const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route(origin+'/**',async(route:any)=>{const url=new URL(route.request().url()),path=url.pathname,op=url.searchParams.get('op');
   if(path.startsWith('/.netlify/')){
    if(path.endsWith('/grocery')&&op==='photos'){await route.fulfill({json:{updatedAt:today,items:{}}});return}
    if(path.endsWith('/grocery')){await route.fulfill({json:op==='prices'?{householdId:'qa-household',state:'NSW',cycleId:today,today,observations:[],official:OFFICIAL}:{}});return}
    if(path.includes('/accounts')&&op==='families'){await route.fulfill({json:{families:[{id:'qa-household',name:'QA',role:'owner'}],account:{username:'qa',name:'Mẹ'}}});return}
    const status={configured:true,connected:true,mode:'account',account:{username:'qa',name:'Mẹ'},household:{id:'qa-household',name:'QA kitchen',role:'owner',memberId:null}};
    await route.fulfill({json:op==='status'?status:op==='state'?{state:null,etag:null}:{announcements:[],devices:[],alerts:[]}});return}
   if(path==='/startup-scripts.json'){await route.fulfill({json:JSON.parse(readFileSync('dist/startup-scripts.json','utf8'))});return}
   const file=resolve('dist',path==='/'?'index.html':path.slice(1));
   try{await route.fulfill({contentType:mime[extname(file)]||'application/octet-stream',body:readFileSync(file)})}catch{await route.fulfill({status:404,body:'Not found'})}});
  // the Coles photo loads after a short wait (a slow network), the ALDI lemon photo is missing
  await page.route('https://productimages.coles.com.au/**',async(r:any)=>{await new Promise(res=>setTimeout(res,400));photoLoads++;await r.fulfill({contentType:'image/png',body:PNG})});
  await page.route('https://dm.apac.cms.aldi.cx/**',async(r:any)=>/qa-missing/.test(r.request().url())?r.fulfill({status:404,body:''}):r.fulfill({contentType:'image/png',body:PNG}));
  await page.goto(origin+'/#shopping',{waitUntil:'domcontentloaded'});
  for(let i=0;i<6;i++){try{await page.waitForTimeout(700);await page.waitForFunction(()=>typeof (globalThis as any).scoutMount==='function'&&document.querySelector('#main h1'),null,{timeout:15000});
   await page.evaluate(`(()=>{const extras=${JSON.stringify(EXTRAS)};const w=currentWeek();w.extras=extras.map(([name,qty],i)=>({id:'qa-extra-'+i,name,qty,cost:null,currency:'AUD',done:false}));state.preferences.onboardingComplete=true;save();closeModal();view='shopping';render()})()`);break}catch(e){if(i===5)throw e}}
  await page.waitForSelector('.online-line',{timeout:15000});await page.waitForTimeout(200);
  return{context,page,errors}}
 const rowOf=(page:any,name:string|RegExp)=>page.locator('.shop-row.has-online',{hasText:name}).first();
 const shot=async(page:any,name:string,size:string)=>(await page.evaluate(()=>{const t=document.getElementById('toast');if(t)t.style.visibility='hidden'}),page.screenshot({path:`${out}/${name}-${sizes[size].width}x${sizes[size].height}.png`}));
 const EMOJI=/\p{Extended_Pictographic}/u;
 try{
  for(const [size,lang,theme] of [['mobile','vi','light'],['narrow','vi','dark'],['tablet','en','dark'],['desktop','en','light']] as const){
   const {context,page,errors}=await open(size,lang,theme);
   // (2) whole chicken sold per kg: the row says “/kg”
   const chicken=await rowOf(page,'Gà chạy bộ').locator('.online-line').innerText();assert.match(chicken,/ALDI\s*\$3\.99\/kg/,size+': the per-kg price says /kg');
   assert.match(await rowOf(page,'Gà chạy bộ').locator('.online-line').getAttribute('aria-label'),/\$3\.99\/kg/);
   // (1) price history: one picture per store
   await rowOf(page,/Chanh vàng|Lemon/).locator('.online-line').click();await page.waitForSelector('.modal .price-history-store');
   const before=await page.evaluate(()=>[...document.querySelectorAll('.modal .price-history-store h3')].map(h=>Math.round(h.getBoundingClientRect().top)));
   const pics=page.locator('.modal .price-history-store .ph-pic');assert.equal(await pics.count(),3,size+': a picture for each of the 3 stores');
   for(let k=0;k<3;k++){const pic=pics.nth(k);assert.equal(await pic.getAttribute('aria-hidden'),'true','decorative');const b=(await pic.boundingBox())!;assert.ok(b.width===64&&b.height===64,size+': fixed 64 px box ('+b.width+'×'+b.height+')');
    assert.ok(await pic.locator('.ph-drawn svg, .ph-drawn .ingredient-art, .ph-drawn img:not(.ph-img)').count()>=1,size+': our drawing under the photo');assert.ok(!EMOJI.test(await pic.innerText()),'never an emoji')}
   const sec=(store:string)=>page.locator('.modal .price-history-store',{hasText:store}).first();
   // Coles: its own product photo, lazy, source named
   const img=sec('Coles').locator('img.ph-img');assert.equal(await img.getAttribute('loading'),'lazy');assert.match(await img.getAttribute('src'),/qa-lemon\.png/,'the Coles line shows the Coles product photo');
   await page.waitForFunction(()=>{const i=document.querySelector('.modal .price-history-store img.ph-img[src*="qa-lemon"]') as HTMLImageElement|null;return!!i&&i.complete&&i.naturalWidth>0},null,{timeout:8000});
   assert.match(await sec('Coles').innerText(),lang==='vi'?/Ảnh sản phẩm của Coles/:/Product photo from Coles/,'source named');
   // ALDI: photo missing → drawing, no source line; Woolworths: no photo → drawing
   await page.waitForFunction(()=>[...document.querySelectorAll('.modal .price-history-store')].some(s=>/ALDI/.test(s.textContent||'')&&s.querySelector('.ph-pic.ph-nophoto')&&!s.querySelector('img.ph-img')),null,{timeout:8000});
   assert.equal(await sec('ALDI').locator('.ph-src').isVisible().catch(()=>false),false,'no source line without a photo');
   assert.equal(await sec('Woolworths').locator('img.ph-img').count(),0);assert.equal(await sec('Woolworths').locator('.ph-pic.ph-nophoto').count(),1);
   const after=await page.evaluate(()=>[...document.querySelectorAll('.modal .price-history-store h3')].map(h=>Math.round(h.getBoundingClientRect().top)));
   assert.deepEqual(after,before,size+': the words do not move when photos load or fail');
   const over=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.ok(over<=1,size+': horizontal overflow '+over);
   await shot(page,`price-history-photos-${lang}-${theme}`,size);await page.keyboard.press('Escape');await page.waitForTimeout(200);
   // the whole chicken's history: the ALDI line says /kg and keeps the per-kg price once
   await rowOf(page,'Gà chạy bộ').locator('.online-line').click();await page.waitForSelector('.modal .price-history-store');
   const h=await page.locator('.modal .price-history-store',{hasText:'ALDI'}).locator('h3').innerText();assert.match(h,/ALDI · \$3\.99\/kg/);assert.doesNotMatch(h,/\(\$3\.99\/kg\)/,'not said twice');
   assert.match(await page.locator('.modal .price-history-store',{hasText:'Coles'}).locator('h3').innerText(),/Coles · \$9\.60 \(\$6\.00\/kg\)/,'a pack keeps its pack price and per-kg price');
   await shot(page,`price-history-chicken-${lang}-${theme}`,size);await page.keyboard.press('Escape');
   assert.deepEqual(errors,[]);await context.close()}
  assert.ok(photoLoads>=4,'photos were requested');
  // offline: no photo can load, every line keeps its drawing
  {const {context,page,errors}=await open('mobile');await context.route('https://productimages.coles.com.au/**',(r:any)=>r.abort());await page.unroute('https://productimages.coles.com.au/**');await page.route('https://productimages.coles.com.au/**',(r:any)=>r.abort());
   await rowOf(page,/Chanh vàng|Lemon/).locator('.online-line').click();await page.waitForSelector('.modal .price-history-store');
   await page.waitForFunction(()=>document.querySelectorAll('.modal .price-history-store .ph-pic.ph-nophoto').length===3,null,{timeout:8000});
   assert.equal(await page.locator('.modal .price-history-store img.ph-img').count(),0);assert.equal(await page.locator('.modal .ph-src:visible').count(),0);
   await shot(page,'price-history-photos-offline-vi-light','mobile');assert.deepEqual(errors,[]);await context.close()}
  console.log('PASS v1.7.21 prices: each store line in the price history shows its own product photo (source named, lazy, decorative, fixed box, drawing when missing or offline, no emoji, nothing moves) at 320/375/820/1280 VI/EN light/dark; per-kg products show “/kg”');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
