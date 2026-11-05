// v1.7.5 Phase C in Chromium: national online prices (Pinch / WhichGrocer, mocked family API) on the shopping list —
// online price under each row, deal chips (real / not real / unverified / lowest / higher), price-history sheet with
// chart, So Giá "Deals this week" card — plus the release number in Account & settings.
// 320×740, 375×812, 820×1100, 1280×800; VI/EN; light/dark. Browser viewport simulation, not physical devices.
// Prices below are synthetic QA fixtures, not real prices. Screenshots: docs/reviews/v1.7.5/online-prices/.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const origin='https://kitchen.test',out='docs/reviews/v1.7.5/online-prices';
const mime:any={'.js':'application/javascript','.css':'text/css','.html':'text/html','.webmanifest':'application/manifest+json','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
const sizes:any={narrow:{width:320,height:740},mobile:{width:375,height:812},tablet:{width:820,height:1100},desktop:{width:1280,height:800}};
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Australia/Sydney',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const add=(d:string,n:number)=>new Date(Date.parse(d+'T00:00:00Z')+n*864e5).toISOString().slice(0,10);
const pts=(vals:number[],specialLast=false)=>vals.map((v,k)=>[add(today,-(vals.length-1-k)*4),v,specialLast&&k===vals.length-1?1:0]);
let n=0;const on=(itemId:string,label:string,retailer:string,price:number,extra:any={})=>({id:'online-pinch-'+itemId+'-'+retailer+(++n),itemId,label,retailer,branchId:null,state:'NSW',price,currency:'AUD',packQty:null,packUnit:null,units:null,unitPrice:null,unitBasis:null,wasPrice:null,promo:null,validUntil:null,observedAt:today,observedBy:'Pinch',source:'official',note:'online',confidence:'high',...extra});
const OFFICIAL={cycleId:today,importedAt:today+'T06:05:00.000Z',source:'online',attribution:['Price data by Pinch','Product data by WhichGrocer'],observations:[
 on('sua-tuoi','Coles Full Cream Milk 2L','coles',2.6,{unitPrice:1.3,unitBasis:'per_L',wasPrice:3.1,promo:'special',insight:{signal:'real',usual:3.1,low:3.1,high:3.2,pct:16,weeks:6,points:pts([3.1,3.1,3.2,3.1,3.1,3.1,3.1,2.6],true)}}),
 on('sua-tuoi','Woolworths Full Cream Milk 2L','woolworths',3.1,{unitPrice:1.55,unitBasis:'per_L',insight:{signal:'usual',usual:3.1,low:3.1,high:3.1,pct:0,weeks:6,points:pts([3.1,3.1,3.1,3.1,3.1,3.1,3.1,3.1])}}),
 on('gao-jasmine','Woolworths Jasmine Rice 5kg','woolworths',14,{unitPrice:2.8,unitBasis:'per_kg',wasPrice:19,promo:'special',insight:{signal:'fake',usual:14,low:13.5,high:14.5,pct:0,weeks:8,wasInflated:true,points:pts([14,13.5,14,14.5,14,14,13.5,14,14],true)}}),
 on('gao-jasmine','Coles Jasmine Rice 5kg','coles',14.5,{unitPrice:2.9,unitBasis:'per_kg',insight:{signal:'usual',usual:14.5,low:14,high:15,pct:0,weeks:8,points:pts([14.5,15,14.5,14,14.5,14.5])}}),
 on('tom','Coles Australian Green Prawns 1kg','coles',24,{unitPrice:24,unitBasis:'per_kg',insight:{signal:'lowest',usual:28,low:26,high:30,pct:14,weeks:12,points:pts([28,30,28,27,26,28,28,24])}}),
 on('finish-tablets','Finish Quantum Dishwasher Tablets 60 pack','chemist',24.99,{wasPrice:39.99,promo:'special',insight:{signal:'unverified',weeks:0,points:[[today,24.99,1]]}}),
 on('giay-ve-sinh','Quilton Toilet Tissue 24 pack','woolworths',16.5,{insight:{signal:'higher',usual:14,low:13,high:14.5,pct:-18,weeks:10,points:pts([14,14,13,14,14.5,14,16.5])}})
]};
const EXTRAS=[['Sữa tươi','2 L'],['Gạo thơm jasmine','5 kg'],['Tôm','500 g'],['Viên rửa chén Finish','1 hộp'],['Giấy vệ sinh','1 gói'],['Bánh tráng','2 gói']];
(async()=>{
 mkdirSync(out,{recursive:true});const browser=await chromium.launch();
 const version=JSON.parse(readFileSync('package.json','utf8')).version;assert.equal(JSON.parse(readFileSync('dist/build.json','utf8')).version,version,'build.json carries the release number (Studio reads it)');
 async function open(size:string,lang='vi',theme='light'){
  const context=await browser.newContext({viewport:sizes[size],serviceWorkers:'block',reducedMotion:'reduce',colorScheme:theme as any,timezoneId:'Australia/Sydney'});
  const scope='account/qa-household/',scout={version:1,open:true,postcode:'2166',state:'NSW',prefs:{},local:[],pending:[],pool:null};
  await context.addInitScript(({scope,lang,theme,scout}:any)=>{if(sessionStorage.getItem('qa-init'))return;sessionStorage.setItem('qa-init','1');localStorage.setItem('bep-theme-mode',theme);localStorage.setItem(scope+'bep-language',lang);localStorage.setItem('bep-account-present','yes');localStorage.setItem(scope+'bep-price-scout-v1',JSON.stringify(scout))},{scope,lang,theme,scout});
  const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route(origin+'/**',async(route:any)=>{const url=new URL(route.request().url()),path=url.pathname,op=url.searchParams.get('op');
   if(path.startsWith('/.netlify/')){
    if(path.endsWith('/grocery')){await route.fulfill({json:op==='prices'?{householdId:'qa-household',state:'NSW',cycleId:today,today,observations:[],official:OFFICIAL}:{}});return}
    if(path.includes('/accounts')&&op==='families'){await route.fulfill({json:{families:[{id:'qa-household',name:'QA',role:'owner'}],account:{username:'qa',name:'Mẹ'}}});return}
    const status={configured:true,connected:true,mode:'account',account:{username:'qa',name:'Mẹ'},household:{id:'qa-household',name:'QA kitchen',role:'owner',memberId:null}};
    await route.fulfill({json:op==='status'?status:op==='state'?{state:null,etag:null}:{announcements:[],devices:[],alerts:[]}});return}
   if(path==='/startup-scripts.json'){await route.fulfill({json:JSON.parse(readFileSync('dist/startup-scripts.json','utf8'))});return}
   const file=resolve('dist',path==='/'?'index.html':path.slice(1));
   try{await route.fulfill({contentType:mime[extname(file)]||'application/octet-stream',body:readFileSync(file)})}catch{await route.fulfill({status:404,body:'Not found'})}});
  await page.goto(origin+'/#shopping',{waitUntil:'domcontentloaded'});
  // the live account check can reload once at start; retry the setup until it settles
  for(let i=0;i<6;i++){try{await page.waitForTimeout(700);await page.waitForFunction(()=>typeof (globalThis as any).scoutMount==='function'&&document.querySelector('#main h1'),null,{timeout:15000});
   await page.evaluate(`(()=>{const extras=${JSON.stringify(EXTRAS)};const w=currentWeek();const day=w.days[selectedDate]||Object.values(w.days)[0];const r=state.recipes.find(x=>x.id==='r1')||state.recipes[0];day.dinner.recipes=[clone(r)];day.dinner.cooked=false;w.extras=extras.map(([name,qty],i)=>({id:'qa-extra-'+i,name,qty,cost:0,currency:'AUD',done:false}));state.preferences.onboardingComplete=true;save();closeModal();view='shopping';render()})()`);break}catch(e){if(i===5)throw e}}
  await page.locator('[data-scout="refresh"]').click();await page.waitForSelector('.online-line',{timeout:10000});await page.waitForTimeout(200);
  return{context,page,errors};
 }
 const noOverflow=async(page:any,label:string)=>{const w=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.ok(w<=1,label+': horizontal overflow '+w);const clipped=await page.evaluate(()=>[...document.querySelectorAll('.online-line,.deal-row')].flatMap((b:any)=>{const r=b.getBoundingClientRect();return[...b.querySelectorAll('.deal-chip,.ol-price,.ol-store,.ol-chev')].filter((c:any)=>{const q=c.getBoundingClientRect();return q.width&&(q.right>r.right+0.5||q.left<r.left-0.5)}).map((c:any)=>c.textContent.trim())}));assert.deepEqual(clipped,[],label+': nothing cut off inside the price line')};
 const targets=async(page:any,label:string)=>{const small=await page.evaluate(()=>[...document.querySelectorAll('.online-line,.deal-row,.modal .btn')].filter((e:any)=>e.offsetParent&&e.getBoundingClientRect().height<43.5).map((e:any)=>e.textContent.trim().slice(0,30)));assert.deepEqual(small,[],label+': touch targets under 44 px')};
 const rowOf=(page:any,name:string)=>page.locator('.shop-row.has-online',{hasText:name}).first();
 const shot=async(page:any,name:string,size:string)=>(await page.evaluate(()=>{const t=document.getElementById('toast');if(t)t.style.visibility='hidden'}),page.screenshot({path:`${out}/${name}-${sizes[size].width}x${sizes[size].height}.png`}));
 const scrollTo=async(page:any,sel:string)=>{await page.evaluate((sel:string)=>{const el=document.querySelector(sel);if(el)scrollTo(0,el.getBoundingClientRect().top+scrollY-80)},sel);await page.waitForTimeout(150)};
 try{
  // 1. shopping rows (VI, phone): cheapest online price per row and its deal check
  {const {context,page,errors}=await open('mobile');
   // the item name has the whole first line (owner, 5 Nov: “Gạo thơm jasmine” fell onto two lines next to the amount)
   for(const nm of ['Gạo thơm jasmine','Viên rửa chén Finish']){const r=await page.locator('.shop-row',{hasText:nm}).first().evaluate((row:any)=>{const l=row.querySelector('.item-label').getBoundingClientRect(),q=row.querySelector('.qty').getBoundingClientRect();return{lines:Math.round(l.height/parseFloat(getComputedStyle(row.querySelector('.item-label')).lineHeight)),qtyBelow:q.top>=l.bottom-2}});assert.equal(r.lines,1,nm+' on one line');assert.ok(r.qtyBelow,nm+': amount under the name')}
   const ing=await page.locator('.shop-purchase-row').count();assert.ok(ing>0,'ingredient rows from the planned dinner');
   const milk=await rowOf(page,'Sữa tươi').locator('.online-line').innerText();assert.match(milk,/Coles\s*\$2\.60/);assert.match(milk,/KM thật −16%/);assert.doesNotMatch(milk,/\/L|so 2 nơi|thường/,'one short line: details live in the history sheet');
   assert.match(await rowOf(page,'Sữa tươi').locator('.online-line').getAttribute('aria-label'),/Giá online rẻ nhất: Coles \$2\.60\. Khuyến mãi thật: rẻ hơn giá thường \(\$3\.10\) 16%\. Xem lịch sử giá\./);
   assert.equal(await page.locator('.online-line .ui-art').first().evaluate((e:any)=>e.tagName.toLowerCase()),'svg');assert.ok(!/\p{Extended_Pictographic}/u.test(await page.locator('.online-line').first().innerText()),'own art, no phone emoji');
   const oneLine=await rowOf(page,'Gạo').locator('.online-line').evaluate((e:any)=>e.getBoundingClientRect().height);assert.ok(oneLine<=72,'compact: at most two short lines on a phone ('+oneLine+' px)');
   const rice=await rowOf(page,'Gạo').locator('.online-line').innerText();assert.match(rice,/KM ảo/);assert.doesNotMatch(rice,/trước/);
   assert.match(await rowOf(page,'Tôm').locator('.online-line').innerText(),/Thấp nhất/);const lw=await rowOf(page,'Sữa tươi').evaluate((r:any)=>r.querySelector('.online-line').getBoundingClientRect().width/r.getBoundingClientRect().width);assert.ok(lw>0.8,'online line spans the row ('+lw.toFixed(2)+')');assert.match(await rowOf(page,'Finish').locator('.online-line').innerText(),/KM/);assert.match(await rowOf(page,'Giấy').locator('.online-line').innerText(),/\+18%/);
   assert.equal(await page.locator('.shop-row',{hasText:'Bánh tráng'}).locator('.online-line').count(),0,'no online price → nothing shown');
   const deals=await page.locator('.scout-deals').innerText();assert.match(deals,/Khuyến mãi tuần này/);assert.match(deals,/Sữa tươi/);assert.match(deals,/Tôm/);assert.match(deals,/không rẻ hơn thường lệ/);assert.match(deals,/Gạo/);
   await noOverflow(page,'list 375');await targets(page,'list 375');await scrollTo(page,'.shop-row.has-online');await shot(page,'shopping-list-vi-light',  'mobile');
   await scrollTo(page,'.scout-deals');await shot(page,'deals-card-vi-light','mobile');
   // 2. price history sheet with chart, usual / low / high, attribution
   await rowOf(page,'Sữa tươi').locator('.online-line').click();await page.waitForSelector('.modal .price-spark');const m=await page.locator('.modal').innerText();
   assert.match(m,/Lịch sử giá · Sữa tươi/);assert.match(m,/thường \$3\.10 · thấp nhất \$3\.10 · cao nhất \$3\.20/);assert.match(m,/Price data by Pinch/);assert.equal(await page.locator('.modal .price-history-store').count(),2,'both retailers');
   assert.ok(await page.locator('.modal .price-spark circle.special').count()>=1,'special marked on the chart');assert.match(await page.locator('.modal .price-meter').first().getAttribute('aria-label'),/Hôm nay \$2\.60; 6 tuần qua từ \$3\.10 đến \$3\.20, thường \$3\.10\./);assert.match(await page.locator('.modal').innerText(),/Khuyến mãi thật: rẻ hơn giá thường \(\$3\.10\) 16%/);assert.ok((await page.locator('.modal .price-spark svg').first().getAttribute('aria-label'))!.includes('thấp nhất'),'chart has a text description');
   await noOverflow(page,'history 375');await targets(page,'history 375');await shot(page,'price-history-vi-light','mobile');await page.locator('.modal [data-action="close-modal"]').last().click();
   // 3. release number at the end of Account & settings
   await page.locator('.top-avatar').click();await page.locator('#account-menu [data-personal="account-security"]').click();await page.waitForSelector('#app-version');
   assert.match(await page.locator('#app-version').innerText(),new RegExp('FamTray · Phiên bản '+version.replace(/\./g,'\\.')+' · bản dựng \\d{2}/\\d{2}/\\d{4}'));
   await page.locator('#app-version').scrollIntoViewIfNeeded();await shot(page,'settings-version-vi-light','mobile');
   assert.deepEqual(errors,[]);await context.close()}
  // 4. other sizes, English, dark
  for(const [size,lang,theme] of [['narrow','vi','light'],['tablet','en','dark'],['desktop','en','light'],['desktop','vi','dark']] as const){
   const {context,page,errors}=await open(size,lang,theme);await noOverflow(page,'list '+size);await targets(page,'list '+size);
   if(lang==='en'){const t=await rowOf(page,'Sữa tươi').locator('.online-line').innerText();assert.match(t,/Coles\s*\$2\.60/);assert.match(t,/Real deal −16%/);assert.match(await rowOf(page,'Gạo').locator('.online-line').innerText(),/Fake deal/);assert.match(await page.locator('.scout-deals').innerText(),/Deals this week/)}
   if(size==='tablet'||size==='desktop'){const h=await rowOf(page,'Gạo').locator('.online-line').evaluate((e:any)=>e.getBoundingClientRect().height);assert.ok(h<=50,'one line on '+size+' ('+h+' px)')}
   await scrollTo(page,'.shop-row.has-online');await shot(page,`shopping-list-${lang}-${theme}`,size);
   await rowOf(page,'Gạo').locator('.online-line').click();await page.waitForSelector('.modal .price-spark');await noOverflow(page,'history '+size);await targets(page,'history '+size);
   if(lang==='en')assert.match(await page.locator('.modal').innerText(),/Price history · .*Marked special, but the usual price is \$14\.00; the “was” price is higher than ever seen/s);
   await shot(page,`price-history-${lang}-${theme}`,size);await page.keyboard.press('Escape');
   if(lang==='en'){await page.locator('.top-avatar').click();await page.locator('#account-menu [data-personal="account-security"]').click();await page.waitForSelector('#app-version');assert.match(await page.locator('#app-version').innerText(),new RegExp('FamTray · Version '+version.replace(/\./g,'\\.')+' · build '))}
   assert.deepEqual(errors,[]);await context.close()}
  console.log('PASS online prices on the shopping list: cheapest online price per row, real / not real / unverified / lowest / higher deal chips, Deals this week card, price history sheet with chart (≥44 px, no overflow at 320/375/820/1280, VI/EN, light/dark), release number in Account & settings');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
