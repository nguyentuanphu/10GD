// Community Price Pilot responsive/browser QA (mocked APIs): contribute opt-in + consent,
// community price badges + source-mix labels, report dialog, ineligible/flag-off states and
// the Studio moderation queue at mobile 375×812, tablet 820×1100 and desktop 1280×800,
// VI/EN and light/dark, reduced motion. Saves screenshots to docs/reviews/v1.5/community/.
// All prices and accounts below are synthetic QA fixtures, not real prices.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const origin='https://kitchen.test',out='docs/reviews/v1.5/community';
const mime:any={'.js':'application/javascript','.css':'text/css','.html':'text/html','.webmanifest':'application/manifest+json','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
const sizes:any={mobile:{width:375,height:812},tablet:{width:820,height:1100},desktop:{width:1280,height:800}};
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Australia/Sydney',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const add=(d:string,n:number)=>new Date(Date.parse(d+'T00:00:00Z')+n*864e5).toISOString().slice(0,10);
let n=0;const o=(itemId:string,label:string,retailer:string,price:number,packQty:number,packUnit:string,extra:any={})=>({id:'qa-obs-'+(++n),itemId,label,retailer,branchId:null,state:'NSW',price,currency:'AUD',packQty,packUnit,units:['roll','wash','each'].includes(packUnit)?packQty:null,unitPrice:null,unitBasis:null,wasPrice:null,promo:null,validUntil:null,observedAt:add(today,-2),observedBy:'QA',source:'manual',note:null,visibility:'family',evidence:{type:'manual',imageHash:null,ocrPrice:null,ocrMatches:null},capturedAt:null,confidence:'low',storeBranchId:null,...extra});
const FAMILY=[o('gao-jasmine','Jasmine rice 5kg','woolworths',12,5,'kg'),o('sua-tuoi','Milk 2L','woolworths',3.1,2,'L'),o('sua-tuoi','Milk 2L','coles',3.1,2,'L'),o('tom','Prawns 1kg','woolworths',30,1,'kg'),o('giay-ve-sinh','Toilet paper 24','woolworths',14,24,'roll'),o('giay-ve-sinh','Toilet paper 24','coles',13,24,'roll')];
const cp=(itemId:string,label:string,retailer:string,price:number,packQty:number,packUnit:string,extra:any={})=>({groupId:(++n).toString(16).padStart(16,'a'),itemId,label,retailer,branchId:retailer+':2166:cabramatta',branchLabel:'Cabramatta 2166',state:'NSW',status:'confirmed',price,unitPrice:null,unitBasis:null,packQty,packUnit,units:null,promo:null,validUntil:null,families:3,reports:3,lastObserved:add(today,-1),ageDays:1,usable:true,faded:false,sources:['shelf-photo','receipt'],...extra});
const COMMUNITY={state:'NSW',today,items:[cp('gao-jasmine','Jasmine rice 5kg','coles',13.5,5,'kg'),cp('tom','Green prawns 1kg','coles',27,1,'kg',{families:2,sources:['shelf-photo']}),cp('sua-tuoi','Milk 2L','aldi',2.99,2,'L',{status:'pending',usable:false,families:1,sources:['receipt'],ageDays:3}),cp('rau-muong','Rau muống 500g','woolworths',4,500,'g',{faded:true,usable:false,ageDays:17,families:2,branchLabel:'Bankstown 2200',branchId:'woolworths:2200:bankstown'}),cp('giay-ve-sinh','Toilet paper 24','aldi',9.99,24,'roll',{promo:'special-buy',validUntil:add(today,3),families:2})],shopPrices:[{id:'sp-qa-1',itemId:'rau-muong',label:'Rau muống bó',retailer:'viet-grocer',price:2.5,currency:'AUD',unitPrice:null,unitBasis:null,packQty:500,packUnit:'g',observedAt:add(today,-1),openReports:0,shop:{id:'qashop',name:'Chợ Việt QA',suburb:'Cabramatta',state:'NSW'},expiresAt:new Date(Date.now()+12*864e5).toISOString(),channel:'shop'}]};
const STATUS=(x:any={})=>({enabled:true,signedIn:true,states:['NSW','QLD'],eligibility:{ok:true,reasons:[],accountDays:42,familyDays:40,verifiedEmail:false},viewer:false,termsAcceptedAt:null,termsVersion:'2026-11-draft',shop:null,limits:{perDay:30,captureMaxDays:7},...x});
const EXTRAS=[['Rau muống','500 g'],['Giấy vệ sinh','1 gói'],['Sữa tươi','2 L'],['Gạo thơm jasmine','5 kg'],['Tôm','500 g']];
const sub=(id:string,extra:any={})=>({kind:'held',state:'NSW',id,groupId:'aaaabbbbccccdddd',itemId:'gao-jasmine',label:'Jasmine rice 5kg',retailer:'aldi',branchLabel:'Cabramatta 2166',branchId:'aldi:2166:cabramatta',price:1,unitPrice:0.2,unitBasis:'per_kg',packQty:5,packUnit:'kg',promo:null,validUntil:null,capturedAt:new Date().toISOString(),submittedAt:new Date().toISOString(),status:'held',holdReason:'too-low',flags:[],approved:false,shadow:false,counted:true,evidence:{type:'shelf-photo',ocrPrice:1,ocrMatches:true,hash:'3f9a1c22b0e4'},photo:true,contributor:{account:'qa-contrib-1',trust:0.5,banned:false,flags:[],submissions:4},...extra});
const MOD={stats:{submissions:128,confirmed:31,pending:44,held:3,reportsOpen:4,contributors:27,banned:1,trust:{'<0.3':2,'0.3–0.7':21,'≥0.7':4},hidden:2,rejected:3},queue:[sub('cp-qa-1'),sub('cp-qa-2',{kind:'flagged',status:'accepted',holdReason:null,flags:['new-account-burst'],photo:false,retailer:'coles',price:4,itemId:'ca-tim',label:'Eggplant',evidence:{type:'receipt',ocrPrice:null,ocrMatches:null,hash:null},contributor:{account:'qa-new-3',trust:0.5,banned:false,flags:['new-account-burst','shared-ip'],submissions:2}}),{kind:'reported',state:'NSW',itemId:'tom',groupId:'1234123412341234',label:'Green prawns 1kg',retailer:'coles',branchLabel:'Cabramatta 2166',price:27,status:'confirmed',families:2,hiddenGroup:false,reports:[{id:'rp-1',reason:'wrong-price',note:'Shelf says $29',at:new Date().toISOString()}],submissions:[sub('cp-qa-3',{status:'accepted',price:27,holdReason:null,photo:false})]},{kind:'shop-reported',state:'NSW',shop:'qashop',shopName:'Chợ Việt QA',priceId:'sp-qa-1',itemId:'rau-muong',label:'Rau muống bó',price:2.5,hidden:false,reports:[{id:'rp-2',reason:'expired',note:'',at:new Date().toISOString()}]}],coi:[{account:'qa-rival',trust:0.45,banned:false,flags:['single-branch-low'],submissions:9}],applications:[{username:'qashop',shopName:'Chợ Việt QA',abn:'12 345 678 901',suburb:'Cabramatta',postcode:'2166',state:'NSW',status:'pending',appliedAt:new Date().toISOString()}],shopPrices:COMMUNITY.shopPrices,pilot:{enabled:true,states:['NSW','QLD']},flagSource:'stored',rules:{}};
async function main(){
 mkdirSync(out,{recursive:true});
 const browser=await chromium.launch();const shots:string[]=[];
 async function open({viewport=sizes.mobile,lang='vi',theme='light',status=STATUS(),api}:any={}){
  const context=await browser.newContext({viewport,serviceWorkers:'block',reducedMotion:'reduce',colorScheme:theme});
  const scope='account/qa-household/',scout={version:1,open:true,postcode:'2166',state:'NSW',prefs:{},local:[],pending:[],pool:{at:Date.now(),observations:FAMILY,official:null}};
  await context.addInitScript(({scope,lang,theme,scout}:any)=>{if(sessionStorage.getItem('qa-init'))return;sessionStorage.setItem('qa-init','1');localStorage.setItem('bep-theme-mode',theme);localStorage.setItem(scope+'bep-language',lang);localStorage.setItem('bep-account-present','yes');localStorage.setItem(scope+'bep-price-scout-v1',JSON.stringify(scout))},{scope,lang,theme,scout});
  const page=await context.newPage(),errors:string[]=[],calls:any[]=[];let linked:any=null;
  page.on('pageerror',e=>errors.push(e.message));
  await page.route(origin+'/**',async route=>{const req=route.request(),url=new URL(req.url()),path=url.pathname,op=url.searchParams.get('op')||'';
   if(path.endsWith('/community')){calls.push({op,method:req.method(),body:req.postData()});const r=api?.(req,op);if(r){await route.fulfill(r);return}await route.fulfill(op==='status'?{json:status}:op==='prices'?{json:COMMUNITY}:{status:201,json:{}});return}
   if(path.endsWith('/grocery')){await route.fulfill(op==='prices'?{json:{householdId:'qa-household',state:'NSW',cycleId:'x',today,observations:FAMILY,official:null}}:{status:201,json:{}});return}
   if(path.startsWith('/.netlify/')){
    if(path.includes('/accounts')&&op==='link-member'){linked=JSON.parse(req.postData()||'{}').memberId||null;await route.fulfill({json:{linked:true}});return}
    if(path.includes('/accounts')&&op==='families'){await route.fulfill({json:{families:[{id:'qa-household',name:'QA',role:'owner'}],account:{username:'qa',name:'Mẹ'}}});return}
    const st={configured:true,connected:true,mode:'account',account:{username:'qa',name:'Mẹ'},household:{id:'qa-household',name:'QA kitchen',role:'owner',memberId:linked}};
    await route.fulfill({json:op==='status'?st:op==='state'?{state:null,etag:null}:{announcements:[],devices:[],alerts:[]}});return}
   if(path==='/startup-scripts.json'){await route.fulfill({json:JSON.parse(readFileSync('dist/startup-scripts.json','utf8'))});return}
   const file=resolve('dist',path==='/'?'index.html':path.slice(1));
   try{await route.fulfill({contentType:mime[extname(file)]||'application/octet-stream',body:readFileSync(file)})}catch{await route.fulfill({status:404,body:'Not found'})}});
  await page.goto(origin+'/#shopping',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof (globalThis as any).scoutMount==='function'&&document.querySelector('#main h1'),null,{timeout:20000});
  const setup=`(()=>{const extras=${JSON.stringify(EXTRAS)};const w=currentWeek();w.extras=extras.map(([name,qty],i)=>({id:'qa-extra-'+i,name,qty,cost:0,currency:'AUD',done:false}));state.preferences.onboardingComplete=true;save();closeModal();view='shopping';render()})()`;
  for(let i=0;i<6;i++){await page.waitForTimeout(700);try{await page.waitForFunction(()=>typeof (globalThis as any).scoutMount==='function'&&document.querySelector('#main h1'),null,{timeout:15000});await page.evaluate(setup);await page.waitForTimeout(300);await page.evaluate(setup);break}catch(e){if(i===5)throw e}}
  await page.waitForTimeout(400);
  return{page,context,errors,calls};
 }
 async function check(page:any,label:string,scope='.price-scout'){
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.ok(overflow<=1,label+': horizontal overflow '+overflow+'px');
  const small=await page.evaluate((scope:string)=>[...document.querySelectorAll(`${scope} button,${scope} select,${scope} input:not([type=file]):not([type=hidden]):not([type=checkbox]),${scope} summary,.modal .scout-form .btn,[data-community]`)].filter((e:any)=>e.offsetParent&&e.getBoundingClientRect().height<43.5).map((e:any)=>(e.dataset.community||e.dataset.scout||e.id||e.textContent).slice(0,30)),scope);
  assert.deepEqual(small,[],label+': touch targets under 44px');
 }
 async function shot(page:any,name:string){await page.screenshot({path:`${out}/${name}.png`,fullPage:false});shots.push(name)}
 const scrollTo=async(page:any,sel:string)=>{await page.evaluate((sel:string)=>{const el=document.querySelector(sel);if(el){const y=el.getBoundingClientRect().top+scrollY-70;scrollTo(0,y)}},sel);await page.waitForTimeout(150)};
 const shelfDraft=`scoutConfirm(scoutNewDraft({source:'screenshot',evidenceType:'shelf-photo',itemId:'gao-jasmine',label:'Jasmine rice 5kg',retailer:'coles',price:13.5,packQty:5,packUnit:'kg',unitPrice:2.7,unitBasis:'per_kg',ocrPrice:13.5,imageHash:'a'.repeat(64),capturedAt:new Date().toISOString(),file:new File([new Uint8Array([255,216,255,224])],'shelf.jpg',{type:'image/jpeg'})}))`;
 try{
  // 1. Community card: status badges, "N gia đình xác nhận · X ngày trước", source icons, branch, report button, shop label, mix label.
  for(const [lang,theme,size] of [['vi','light','mobile'],['en','dark','mobile'],['vi','light','tablet'],['en','dark','tablet'],['vi','dark','desktop'],['en','light','desktop']] as const){
   const {page,context,errors}=await open({lang,theme,viewport:sizes[size]});
   await page.waitForSelector('.scout-community .scout-cp',{timeout:10000});
   const text=await page.locator('.scout-community').innerText();
   if(lang==='vi'){assert.match(text,/Đã xác nhận/);assert.match(text,/Chờ xác nhận/);assert.match(text,/3 gia đình xác nhận · hôm qua/);assert.match(text,/Giá do tiệm đăng/);assert.match(text,/không phải giá niêm yết đảm bảo/i);assert.match(text,/Báo giá sai/);assert.match(text,/Cabramatta 2166/)}
   else{assert.match(text,/Confirmed/);assert.match(text,/Awaiting confirmation/);assert.match(text,/3 families confirmed · yesterday/);assert.match(text,/Shop-posted price/);assert.match(text,/Not guaranteed shelf prices/i)}
   assert.doesNotMatch(text,/qa-contrib|Netlify|Blobs/i,'no identity, no vendor names');
   const mix=await page.locator('.scout-mix').allInnerTexts();assert.ok(mix.length>=1,'totals carry a source-mix label');assert.match(mix.join(' '),lang==='vi'?/giá của nhà mình/:/family price/);
   assert.match(mix.join(' '),lang==='vi'?/giá cộng đồng đã xác nhận/:/confirmed community price/,'confirmed community price used in totals');
   assert.equal(await page.locator('[data-community="shelf"]').count(),1,'shelf photo capture button shown');
   await check(page,`badges ${lang} ${theme} ${size}`);
   await scrollTo(page,'.scout-cards');await shot(page,`totals-mix-${lang}-${theme}-${size}`);
   await scrollTo(page,'.scout-community');await shot(page,`community-badges-${lang}-${theme}-${size}`);
   assert.deepEqual(errors,[]);await context.close();
  }
  // 2. Contribute opt-in (unchecked by default) + bilingual consent on first opt-in; only facts are posted.
  for(const [lang,theme,size] of [['vi','light','mobile'],['en','dark','mobile'],['vi','light','tablet'],['en','light','desktop']] as const){
   let posted:any=null;const api=(req:any,op:string)=>{if(op==='accept-terms')return{json:{termsAcceptedAt:new Date().toISOString(),termsVersion:'2026-11-draft'}};if(op==='contribute'){posted=JSON.parse(req.postData());return{status:201,json:{id:'cp-qa-x',status:'held',holdReason:'too-low',photoRequested:true,group:{status:'pending',families:1}}}}if(op==='photo')return{status:201,json:{stored:true}};return null};
   const {page,context,errors,calls}=await open({lang,theme,viewport:sizes[size],api});await page.waitForSelector('.scout-community');
   await page.evaluate(shelfDraft);await page.waitForSelector('#scout-share');
   assert.equal(await page.locator('#scout-share').isChecked(),false,'opt-in is unchecked by default');assert.equal(await page.locator('#scout-share-branch').isHidden(),true);
   await page.locator('#scout-share').check();assert.equal(await page.locator('#scout-share-branch').isVisible(),true);
   await page.fill('#scout-share-suburb','Cabramatta');
   await page.locator('.scout-community-share').scrollIntoViewIfNeeded();await check(page,'opt-in '+size,'.modal .scout-form');await shot(page,`contribute-optin-${lang}-${theme}-${size}`);
   await page.locator('.modal-footer .btn.primary').click();await page.waitForSelector('#scout-terms');
   const terms=await page.locator('.modal').innerText();assert.match(terms,lang==='vi'?/ẩn danh/:/anonymously/);assert.match(terms,lang==='vi'?/14 ngày/:/14 days/);
   await check(page,'consent '+size,'.modal .scout-terms');await shot(page,`consent-${lang}-${theme}-${size}`);
   await page.locator('[data-community="terms-accept"]').click();await page.waitForSelector('[data-community="photo-send"]');
   assert.ok(posted,'contribution posted after consent');assert.equal(posted.consent,true);assert.equal(posted.observation.evidence.type,'shelf-photo');assert.deepEqual(posted.branch,{suburb:'Cabramatta',postcode:'2166'});
   for(const k of ['observedBy','note','raw','id','source','confidence'])assert.ok(!(k in posted.observation),'not shared: '+k);
   await check(page,'held '+size,'.modal .scout-form');if(size==='mobile')await shot(page,`held-photo-ask-${lang}-${theme}-${size}`);
   await page.locator('[data-community="photo-send"]').click();await page.waitForTimeout(300);assert.ok(calls.some((c:any)=>c.op.startsWith('photo')&&c.method==='POST'),'photo only sent after the user agrees');
   assert.ok(calls.findIndex((c:any)=>c.op==='accept-terms')<calls.findIndex((c:any)=>c.op==='contribute'),'terms accepted before the first contribution');
   assert.deepEqual(errors,[]);await context.close();
  }
  // Screenshot-sourced prices stay family-only (no checkbox).
  {const {page,context}=await open();await page.waitForSelector('.scout-community');await page.evaluate(`scoutConfirm(scoutNewDraft({source:'screenshot',itemId:'gao-jasmine',label:'Rice',retailer:'coles',price:13.5,ocrPrice:13.5}))`);await page.waitForSelector('#scout-obs-form');assert.equal(await page.locator('#scout-share').count(),0);assert.match(await page.locator('.scout-community-note').innerText(),/chỉ lưu trong gia đình/);await page.locator('.scout-community-note').scrollIntoViewIfNeeded();await shot(page,'screenshot-family-only-vi-light-mobile');await context.close()}
  // Ineligible account: explains the gate instead of offering the checkbox.
  {const {page,context}=await open({lang:'en',status:STATUS({eligibility:{ok:false,reasons:['account-too-new'],accountDays:3,familyDays:3}})});await page.waitForSelector('.scout-community');await page.evaluate(shelfDraft);await page.waitForSelector('#scout-obs-form');assert.equal(await page.locator('#scout-share').count(),0);assert.match(await page.locator('.scout-community-note').innerText(),/at least 7 days old \(now 3\)/);await page.locator('.scout-community-note').scrollIntoViewIfNeeded();await shot(page,'ineligible-en-light-mobile');await context.close()}
  // 3. Report dialog
  for(const [lang,theme,size] of [['vi','light','mobile'],['en','dark','tablet'],['vi','dark','desktop']] as const){
   let reported:any=null;const api=(req:any,op:string)=>op==='report'?(reported=JSON.parse(req.postData()),{status:201,json:{reported:true}}):null;
   const {page,context,errors}=await open({lang,theme,viewport:sizes[size],api});await page.waitForSelector('.scout-community [data-community="report"]');
   await page.locator('.scout-community [data-community="report"]').first().click();await page.waitForSelector('#scout-report-form');
   await page.selectOption('#scout-report-reason','wrong-price');await page.fill('#scout-report-note',lang==='vi'?'Kệ ghi $14,50':'Shelf says $14.50');
   await check(page,'report '+size,'.modal .scout-form');await shot(page,`report-dialog-${lang}-${theme}-${size}`);
   await page.locator('.modal-footer .btn.primary').click();await page.waitForTimeout(250);assert.equal(reported?.reason,'wrong-price');assert.equal(reported.state,'NSW');assert.match(reported.groupId,/^[a-f0-9]{16}$/);
   assert.deepEqual(errors,[]);await context.close();
  }
  // 4. Flag off: nothing changes for users.
  {const {page,context,errors}=await open({status:{enabled:false}});await page.waitForTimeout(600);assert.equal(await page.locator('.scout-community').count(),0);assert.equal(await page.locator('[data-community]').count(),0);assert.equal(await page.locator('.scout-mix').count(),0,'no source-mix label when the pilot is off');await page.evaluate(shelfDraft);await page.waitForSelector('#scout-obs-form');assert.equal(await page.locator('.scout-community-share,.scout-community-note').count(),0);assert.deepEqual(errors,[]);await context.close()}
  // Offline: the cached copy is labelled and still used.
  {const {page,context}=await open({lang:'en'});await page.waitForSelector('.scout-community .scout-cp');await context.setOffline(true);await page.evaluate('dispatchEvent(new Event("offline"));scoutRerender()');await page.waitForTimeout(200);assert.match(await page.locator('.scout-sub').innerText(),/Offline/);assert.ok(await page.locator('.scout-community .scout-cp').count()>0);await scrollTo(page,'.scout-community');await shot(page,'community-offline-en-light-mobile');await context.close()}
  // 5. Studio moderation queue
  for(const [lang,theme,size] of [['vi','light','mobile'],['en','dark','mobile'],['vi','light','tablet'],['en','dark','tablet'],['en','light','desktop'],['vi','dark','desktop']] as const){
   const context=await browser.newContext({viewport:sizes[size],reducedMotion:'reduce',colorScheme:theme});await context.addInitScript(({lang,theme}:any)=>{localStorage.setItem('studio-lang',lang);localStorage.setItem('studio-theme',theme)},{lang,theme});
   const page=await context.newPage(),errors:string[]=[],posts:any[]=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route(origin+'/**',async route=>{const req=route.request(),url=new URL(req.url()),op=url.searchParams.get('op')||'';
    if(url.pathname.endsWith('/studio')){if(req.method()==='POST')posts.push({op,body:JSON.parse(req.postData()||'{}')});await route.fulfill({json:op==='me'?{username:'henrynguyen',name:'Henry',role:'owner',csrf:'qa'}:op==='community'?MOD:{done:true}});return}
    const file=resolve('dist',url.pathname.slice(1));try{await route.fulfill({contentType:mime[extname(file)]||'application/octet-stream',body:readFileSync(file)})}catch{await route.fulfill({status:404,body:''})}});
   await page.goto(origin+'/studio.html#community');await page.waitForSelector('#cptab');
   const text=await page.locator('#main').innerText();
   assert.match(text,lang==='vi'?/Hàng đợi kiểm duyệt/:/Moderation queue/);assert.match(text,lang==='vi'?/Thấp bất thường/:/Unusually low/);assert.match(text,/qa-contrib-1/);assert.match(text,/OCR \$1\.00/);
   assert.doesNotMatch(text,/Netlify|Blobs/i);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.ok(overflow<=1,'studio overflow '+overflow);
   const small=await page.evaluate(()=>[...document.querySelectorAll('#main button,#main input:not([type=checkbox])')].filter((e:any)=>e.offsetParent&&e.getBoundingClientRect().height<43.5).map((e:any)=>e.textContent.slice(0,20)));
   if(size!=='desktop')assert.deepEqual(small,[],'studio touch targets '+size);
   await shot(page,`studio-overview-${lang}-${theme}-${size}`);
   await page.evaluate(()=>{const el=document.querySelector('#cptab');if(el)scrollTo(0,el.getBoundingClientRect().top+scrollY-20)});await page.waitForTimeout(100);await shot(page,`studio-queue-${lang}-${theme}-${size}`);
   if(size==='mobile'&&lang==='vi'){await page.locator('[data-ca="ban"]').first().click();await page.waitForSelector('#ask[open]');await page.fill('#ask textarea','QA: lặp lại giá sai');await shot(page,'studio-ban-dialog-vi-light-mobile');await page.locator('#ask button[value="ok"]').click();await page.waitForTimeout(200);assert.equal(posts.find(p=>p.op==='community-action')?.body.action,'ban');assert.equal(posts[0].body.account,'qa-contrib-1');assert.equal(posts[0].body.reason,'QA: lặp lại giá sai')}
   if(size==='tablet'&&lang==='vi'){await page.locator('[data-tab="shops"]').click();await page.waitForTimeout(200);await shot(page,'studio-shops-vi-light-tablet')}
   assert.deepEqual(errors,[]);await context.close();
  }
  console.log('PASS community pilot responsive QA ('+shots.length+' screenshots): badges + source mix, opt-in + consent, facts-only payload, held photo consent, report dialog, family-only screenshots, ineligible, flag off, offline, Studio moderation');
 }finally{await browser.close()}
}
main().catch(error=>{console.error(error);process.exit(1)});
