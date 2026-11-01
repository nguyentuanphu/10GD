// Price Scout responsive/browser QA: device-only and (mocked) family account
// mode at mobile 375×812, tablet 820×1100 and desktop 1280×800, VI/EN and
// light/dark. Saves screenshots to docs/reviews/v1.5/price-scout/.
// Sample observations below are synthetic QA fixtures, not real prices.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const origin='https://kitchen.test',out='docs/reviews/v1.5/price-scout';
const mime={'.js':'application/javascript','.css':'text/css','.html':'text/html','.webmanifest':'application/manifest+json','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
const sizes={mobile:{width:375,height:812},tablet:{width:820,height:1100},desktop:{width:1280,height:800}};
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Australia/Sydney',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const add=(d,n)=>new Date(Date.parse(d+'T00:00:00Z')+n*864e5).toISOString().slice(0,10);
const dow=new Date(today+'T00:00:00Z').getUTCDay(),cycleEnd=add(add(today,-((dow-3+7)%7)),6);
let n=0;const o=(itemId,label,retailer,price,packQty,packUnit,extra={})=>({id:'qa-obs-'+(++n),itemId,label,retailer,branchId:null,state:'NSW',price,currency:'AUD',packQty,packUnit,units:['wash','roll','sheet','each'].includes(packUnit)?packQty:null,unitPrice:null,unitBasis:null,wasPrice:null,promo:null,validUntil:null,observedAt:add(today,-2),observedBy:'QA',source:'manual',note:null,...extra});
const SAMPLE=[
 o('suon-non','Pork spare ribs 1kg','woolworths',15,1,'kg'),o('suon-non','Pork ribs 1kg','coles',13.5,1,'kg',{promo:'special',wasPrice:16,validUntil:cycleEnd,source:'catalogue'}),o('suon-non','Sườn non','viet-grocer',11.99,1,'kg',{source:'receipt'}),
 o('toi','Garlic 250g','woolworths',3.5,250,'g'),o('toi','Garlic 250g','coles',3,250,'g'),o('toi','Tỏi','viet-grocer',2,250,'g'),
 o('nuoc-mam','Fish sauce 500mL','woolworths',5.5,500,'mL'),o('nuoc-mam','Fish sauce 500mL','coles',5,500,'mL'),
 o('duong','White sugar 1kg','woolworths',1.6,1,'kg'),o('duong','White sugar 1kg','coles',1.6,1,'kg'),o('duong','Sugar 1kg','aldi',1.19,1,'kg'),
 o('dau-an','Canola oil 2L','woolworths',9,2,'L'),o('dau-an','Canola oil 2L','coles',8.5,2,'L'),o('dau-an','Canola oil 2L','aldi',6.99,2,'L'),
 o('hanh-la','Spring onion bunch','woolworths',2.5,1,'each'),o('hanh-la','Hành lá','viet-grocer',1.5,1,'each'),
 o('rau-muong','Rau muống 500g','viet-grocer',3.5,500,'g',{source:'screenshot'}),
 o('giay-ve-sinh','Quilton 24 pack','woolworths',14,24,'roll'),o('giay-ve-sinh','Quilton 48 pack','amazon',22,48,'roll',{source:'bookmark'}),
 o('finish-tablets','Finish Quantum 60 Pack','chemist',24.99,60,'wash',{source:'screenshot'}),o('finish-tablets','Finish 46 pack','coles',27,46,'wash'),o('finish-tablets','Finish Quantum 90 pack','amazon',32,90,'wash'),
 o('sua-tuoi','Full cream milk 2L','woolworths',3.1,2,'L'),o('sua-tuoi','Full cream milk 2L','coles',3.1,2,'L'),o('sua-tuoi','Milk 2L','aldi',2.99,2,'L'),
 o('gao-jasmine','Jasmine rice 5kg','woolworths',12,5,'kg',{promo:'special',wasPrice:15,validUntil:cycleEnd}),o('gao-jasmine','Jasmine rice 5kg','coles',14,5,'kg'),o('gao-jasmine','Jasmine rice 5kg','aldi',11.49,5,'kg'),
 o('tom','Green prawns 1kg','coles',28,1,'kg'),o('tom','Tôm sú','viet-grocer',24,1,'kg'),
 o('trung','Eggs 12 pack','woolworths',7.5,12,'each',{observedAt:add(today,-40)})
];
const EXTRAS=[['Rau muống','500 g'],['Giấy vệ sinh','1 gói'],['Viên rửa chén Finish','1 hộp'],['Sữa tươi','2 L'],['Gạo thơm jasmine','5 kg'],['Tôm','500 g'],['Bánh tráng','2 gói']];
async function main(){
 mkdirSync(out,{recursive:true});
 const browser=await chromium.launch();const shots=[];
 async function open({viewport=sizes.mobile,lang='vi',theme='light',scout=null,account=false,offline=false,path='/#shopping',api=null}={}){
  const context=await browser.newContext({viewport,serviceWorkers:'block',reducedMotion:'reduce',colorScheme:theme});
  const scope=account?'account/qa-household/':'guest/';
  await context.addInitScript(({scope,lang,theme,scout,account})=>{if(sessionStorage.getItem('qa-init'))return;sessionStorage.setItem('qa-init','1');localStorage.setItem('bep-theme-mode',theme);localStorage.setItem(scope+'bep-language',lang);if(account)localStorage.setItem('bep-account-present','yes');else localStorage.setItem('bep-local-locked','yes');if(scout)localStorage.setItem(scope+'bep-price-scout-v1',JSON.stringify(scout));else localStorage.removeItem(scope+'bep-price-scout-v1')},{scope,lang,theme,scout,account});
  const page=await context.newPage(),errors=[],calls=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route(origin+'/**',async route=>{const url=new URL(route.request().url()),path=url.pathname,op=url.searchParams.get('op');
   if(path.startsWith('/.netlify/')){
    if(!account){await route.fulfill({status:401,json:{error:'no'}});return}
    if(path.endsWith('/grocery')){calls.push(route.request().method()+' '+op);await route.fulfill(api?api(route.request(),op):{json:{}});return}
    if(path.includes('/accounts')&&op==='families'){await route.fulfill({json:{families:[{id:'qa-household',name:'QA',role:'owner'}],account:{username:'qa',name:'Mẹ'}}});return}
    const status={configured:true,connected:true,mode:'account',account:{username:'qa',name:'Mẹ'},household:{id:'qa-household',name:'QA kitchen',role:'owner',memberId:null}};
    await route.fulfill({json:op==='status'?status:op==='state'?{state:null,etag:null}:{announcements:[],devices:[],alerts:[]}});return}
   if(path==='/startup-scripts.json'){await route.fulfill({json:JSON.parse(readFileSync('dist/startup-scripts.json','utf8'))});return}
   const file=resolve('dist',path==='/'?'index.html':path.slice(1));
   try{await route.fulfill({contentType:mime[extname(file)]||'application/octet-stream',body:readFileSync(file)})}catch{await route.fulfill({status:404,body:'Not found'})}});
  await page.goto(origin+path,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof (globalThis as any).scoutMount==='function'&&document.querySelector('#main h1'),null,{timeout:20000});
  // Build a realistic shopping list: one planned dinner + extras typed by the family.
  // A one-time startup reload (live account check adopting the household) can race the first evaluate; retry once it settles.
  for(let attempt=0;;attempt++){try{await page.waitForFunction(()=>typeof (globalThis as any).scoutMount==='function'&&document.querySelector('#main h1'),null,{timeout:20000});await page.evaluate(`(()=>{const extras=${JSON.stringify(EXTRAS)};const w=currentWeek();const day=w.days[selectedDate]||Object.values(w.days)[0];const r=state.recipes.find(x=>x.id==='r1')||state.recipes[0];day.dinner.recipes=[clone(r)];day.dinner.cooked=false;w.extras=extras.map(([name,qty],i)=>({id:'qa-extra-'+i,name,qty,cost:0,currency:'AUD',done:false}));save();view='shopping';render()})()`);break}catch(e){if(attempt>=3||!/context was destroyed|navigation/i.test(String((e as Error)?.message)))throw e;await page.waitForTimeout(700)}}
  if(account){for(let i=0;i<5;i++){await page.waitForTimeout(700);try{await page.waitForFunction(()=>typeof (globalThis as any).scoutMount==='function',null,{timeout:15000});await page.evaluate('state.preferences.onboardingComplete=true;save();closeModal();view="shopping";render()');break}catch(e){if(i===4)throw e}}}
  if(offline){await context.setOffline(true);await page.evaluate('dispatchEvent(new Event("offline"));render()')}
  await page.waitForTimeout(300);
  return{page,context,errors,calls};
 }
 async function check(page,label){
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.ok(overflow<=1,label+': horizontal overflow '+overflow+'px');
  const small=await page.evaluate(()=>[...document.querySelectorAll('.price-scout button,.price-scout select,.price-scout input:not([type=file]),.price-scout summary,.price-scout a.btn,.modal .scout-form .btn,.scout-tray button')].filter((e:any)=>e.offsetParent&&e.getBoundingClientRect().height<43.5).map((e:any)=>(e.dataset.scout||e.id||e.textContent).slice(0,30)));
  assert.deepEqual(small,[],label+': touch targets under 44px');
 }
 async function shot(page,name){await page.screenshot({path:`${out}/${name}.png`,fullPage:false});shots.push(name)}
 const scrollTo=async(page,sel)=>{await page.evaluate(sel=>{const el=document.querySelector(sel);if(el){const y=el.getBoundingClientRect().top+scrollY-70;scrollTo(0,y)}},sel);await page.waitForTimeout(150)};
 const withData={version:1,open:true,postcode:'2166',state:'NSW',prefs:{},local:SAMPLE,pending:[],pool:null};
 try{
  // 1. Setup / empty state (no postcode yet)
  for(const[size,viewport]of Object.entries(sizes)){const {page,context,errors}=await open({viewport});await scrollTo(page,'.price-scout');assert.ok(await page.locator('#scout-postcode').isVisible());await check(page,'setup '+size);await shot(page,`setup-vi-light-${size}`);assert.deepEqual(errors,[]);await context.close()}
  {const {page,context}=await open({lang:'en',theme:'dark'});await scrollTo(page,'.price-scout');await shot(page,'setup-en-dark-mobile');await context.close()}
  // 2. Unsupported postcode (Melbourne 3000; ACT 2600 is not NSW)
  for(const[lang,theme,size]of[['vi','light','mobile'],['en','dark','mobile'],['vi','light','desktop']]as const){const {page,context}=await open({lang,theme,viewport:sizes[size]});await page.fill('#scout-postcode',size==='desktop'?'2600':'3000');await page.locator('#scout-postcode-form button').click();await page.waitForTimeout(150);const msg=await page.locator('.scout-unsupported').innerText();assert.match(msg,lang==='vi'?/chưa được hỗ trợ.*NSW và QLD/s:/isn’t supported yet.*NSW and QLD/s);await scrollTo(page,'.price-scout');await check(page,'unsupported');await shot(page,`unsupported-${lang}-${theme}-${size}`);await context.close()}
  // Supported postcode saves state
  {const {page,context}=await open();await page.fill('#scout-postcode','4000');await page.locator('#scout-postcode-form button').click();await page.waitForTimeout(150);assert.match(await page.locator('.scout-sub').innerText(),/4000 · QLD/);await scrollTo(page,'.price-scout');await shot(page,'empty-vi-light-mobile');assert.match(await page.locator('.scout-empty').innerText(),/Chưa có giá/);await context.close()}
  // 3. With sample observations: comparison, split, route, benchmark
  for(const[lang,theme,size]of[['vi','light','mobile'],['vi','light','tablet'],['vi','light','desktop'],['en','dark','mobile'],['en','dark','tablet'],['en','dark','desktop'],['vi','dark','mobile'],['en','light','mobile']]as const){
   const {page,context,errors}=await open({lang,theme,viewport:sizes[size],scout:withData});
   await scrollTo(page,'.price-scout');await check(page,`data ${lang} ${theme} ${size}`);
   const text=await page.locator('.price-scout').innerText();
   assert.match(text,lang==='vi'?/Một điểm mua/:/One-stop/);assert.match(text,/Woolworths/);assert.match(text,/Coles/);
   assert.match(text,lang==='vi'?/Chưa có giá \(\d+\)/:/No price yet \(\d+\)/,'unknown items listed, never $0');
   assert.doesNotMatch(text,/Bánh tráng[^\n]*\$0\.00/);
   await shot(page,`compare-${lang}-${theme}-${size}`);
   if(lang==='vi'&&theme==='light'){await scrollTo(page,'.scout-route');await shot(page,`route-${lang}-${theme}-${size}`)}
   assert.deepEqual(errors,[]);await context.close();
  }
  // Route order and Chợ Việt badge
  {const {page,context}=await open({scout:withData});const route=await page.locator('.scout-route li').allInnerTexts();assert.ok(route.length>=2,'route has stops');const order=route.map(t=>/Chemist/.test(t)?0:/ALDI/.test(t)?1:/Woolworths|Coles/.test(t)?2:/Chợ Việt/.test(t)?3:9);const lastStop=route.at(-1);assert.match(lastStop,/🧊/,'raw meat stop is last');assert.ok(order.indexOf(0)<=0||order.indexOf(0)<order.indexOf(2),'chemist before supermarket');
   const badge=await page.locator('.scout-viet-badge').count();assert.ok(badge>=1,'Chợ Việt badge on list items');await context.close()}
  // 4. Capture confirm sheet via paste (and save) — all sizes
  for(const[size,viewport]of Object.entries(sizes)){const {page,context}=await open({viewport,scout:withData});await page.locator('[data-scout="paste"]').click();await page.fill('#scout-paste-text','Chemist Warehouse\nFinish Quantum 60 Pack\n$24.99\n$0.42 per wash');await page.locator('.modal-footer .btn.primary').click();await page.waitForSelector('#scout-obs-form');assert.equal(await page.inputValue('#scout-price'),'24.99');assert.equal(await page.inputValue('#scout-item'),'finish-tablets');assert.equal(await page.inputValue('#scout-retailer'),'chemist');assert.equal(await page.inputValue('#scout-unit-price'),'0.42');await check(page,'confirm '+size);await shot(page,`confirm-vi-light-${size}`);
   if(size==='mobile'){await page.locator('.modal-footer .btn.primary').click();await page.waitForTimeout(200);const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('guest/bep-price-scout-v1')!).local.length);assert.equal(saved,SAMPLE.length+1,'device-only save stays local')}
   await context.close()}
  {const {page,context}=await open({lang:'en',theme:'dark',scout:withData});await page.locator('[data-scout="manual"]').click();await page.waitForSelector('#scout-obs-form');await shot(page,'confirm-en-dark-mobile');
   await page.selectOption('#scout-item','gao-jasmine');await page.fill('#scout-price','60');await page.fill('#scout-pack','5');await page.selectOption('#scout-pack-unit','kg');await page.waitForTimeout(100);
   assert.ok(await page.locator('#scout-sanity').isVisible(),'unusual price warning');assert.match(await page.locator('#scout-sanity').innerText(),/unusual/);await page.locator('#scout-sanity').scrollIntoViewIfNeeded();await shot(page,'confirm-sanity-en-dark-mobile');
   await page.locator('.modal-footer .btn.primary').click();await page.waitForTimeout(200);const kept=await page.evaluate(()=>JSON.parse(localStorage.getItem('guest/bep-price-scout-v1')!).local[0]);assert.deepEqual([kept.price,kept.confidence,kept.visibility],[60,'low','family'],'still allowed to save');await context.close()}
  // 5. Bookmark landing: /?price-capture=<json>
  {const payload={v:1,label:'Coles Tasty Cheese Slices 500g',price:4.5,currency:'AUD',wasPrice:9,unitText:'$0.90 per 100g',packText:'500g',url:'https://www.coles.com.au/product/qa-cheese',host:'coles.com.au',source:'bookmark',promoText:'half-price'};
   const {page,context}=await open({scout:withData,path:'/?price-capture='+encodeURIComponent(JSON.stringify(payload))+'#shopping'});await page.waitForSelector('#scout-obs-form');assert.equal(await page.inputValue('#scout-retailer'),'coles');assert.equal(await page.inputValue('#scout-price'),'4.5');assert.equal(await page.inputValue('#scout-promo'),'half-price');assert.doesNotMatch(page.url(),/price-capture/);await shot(page,'bookmark-capture-vi-light-mobile');await context.close()}
  // 6. Bookmark help, catalogue sheet, Amazon tray
  {const {page,context}=await open({scout:withData});await page.locator('[data-scout="bookmark"]').click();const href=await page.locator('.scout-bookmarklet').getAttribute('href');assert.match(href!,/^javascript:/);{const code=decodeURIComponent(href!.slice(11));assert.ok(code.includes('"https://kitchen.test"')&&code.includes('/?price-capture='),'bookmarklet targets app origin');assert.doesNotMatch(code,/fetch\(|XMLHttpRequest/,'bookmarklet never fetches pages')}await shot(page,'bookmark-help-vi-light-mobile');await page.keyboard.press('Escape');await page.evaluate('closeModal()');
   await page.locator('[data-scout="catalogue"]').click();await shot(page,'catalogue-vi-light-mobile');await page.evaluate('closeModal()');
   await page.locator('[data-scout="tray"]').click();await page.waitForSelector('.scout-tray.open');const tray=await page.locator('.scout-tray').innerText();assert.match(tray,/cuộn|roll/);assert.match(tray,/lần giặt|wash/);await check(page,'tray');await shot(page,'amazon-tray-vi-light-mobile');await page.keyboard.press('Escape');await page.waitForTimeout(50);assert.equal(await page.locator('.scout-tray').count(),0);await context.close()}
  {const {page,context}=await open({theme:'dark',lang:'en',scout:withData,viewport:sizes.tablet});await page.locator('[data-scout="tray"]').click();await page.waitForSelector('.scout-tray.open');await shot(page,'amazon-tray-en-dark-tablet');await context.close()}
  // 7. Family account mode: refresh loads the family pool; saving posts to the family API
  {let posted:any=null;const api=(req:any,op:string)=>{if(op==='prices')return{json:{householdId:'qa-household',state:'NSW',cycleId:'x',today,observations:SAMPLE.slice(0,12),official:null}};if(op==='observe'&&req.method()==='POST'){posted=JSON.parse(req.postData());return{status:201,json:{saved:posted.observations.map((x:any)=>x.id)}}}return{status:404,json:{}}};
   const {page,context,calls,errors}=await open({account:true,api,scout:{version:1,open:true,postcode:'2166',state:'NSW',prefs:{},local:[],pending:[],pool:null}});
   await page.locator('[data-scout="refresh"]').click();await page.waitForFunction(()=>!document.querySelector('[data-scout="refresh"][disabled]'));await page.waitForTimeout(200);
   assert.ok(calls.includes('GET prices'));assert.match(await page.locator('.price-scout').innerText(),/Đồng bộ gia đình/);assert.doesNotMatch(await page.locator('.price-scout').innerText(),/Netlify|Blobs/i);
   await page.locator('[data-scout="manual"]').click();await page.fill('#scout-label','Bok choy');await page.selectOption('#scout-item','cai-thia');await page.fill('#scout-price','2.50');await page.fill('#scout-pack','500');await page.selectOption('#scout-pack-unit','g');await page.locator('.modal-footer .btn.primary').click();await page.waitForTimeout(300);
   assert.ok(posted&&posted.observations[0].itemId==='cai-thia','posted to family API');assert.equal(posted.observations[0].unitPrice,5);
   await scrollTo(page,'.price-scout');await shot(page,'account-family-vi-light-mobile');
   await context.setOffline(true);await page.evaluate('render()');await page.locator('[data-scout="refresh"]').click();await page.waitForTimeout(200);assert.match(await page.locator('.scout-sub').innerText(),/Offline/);await scrollTo(page,'.price-scout');await shot(page,'account-offline-vi-light-mobile');
   assert.deepEqual(errors,[]);await context.close()}
  console.log('PASS Price Scout responsive QA ('+shots.length+' screenshots): setup, unsupported postcode, comparison, route, confirm sheet, bookmark landing, Amazon tray, family refresh/save and offline');
 }finally{await browser.close()}
}
main().catch(error=>{console.error(error);process.exit(1)});
