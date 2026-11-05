// Community prices responsive/browser QA (mocked APIs) at mobile 375×812, tablet 820×1100 and
// desktop 1280×800, VI/EN and light/dark, reduced motion. Covers the owner's 1 Nov 2026
// decisions: device-only users read community prices (new empty state + comparisons work
// without own prices), first-contributor empty state with points incentive, "prices wanted
// this week", share box ticked by default after the first consent, screenshot = "Giá online"
// facts-only payload, points widget + toast, leaderboard (anonymous by default, nickname
// opt-in), and Studio rewards (leaderboard, ledger, audited adjust). Also keeps the earlier
// checks: badges + source mix, first-time consent, held photo consent, report dialog,
// ineligible, flag off, offline and the moderation queue. Saves screenshots to
// docs/reviews/v1.5/community/. All prices and accounts are synthetic QA fixtures.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,readdirSync,unlinkSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const origin='https://kitchen.test',out='docs/reviews/v1.5/community';
const mime:any={'.js':'application/javascript','.css':'text/css','.html':'text/html','.webmanifest':'application/manifest+json','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
const sizes:any={mobile:{width:375,height:812},tablet:{width:820,height:1100},desktop:{width:1280,height:800}};
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Australia/Sydney',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const add=(d:string,n:number)=>new Date(Date.parse(d+'T00:00:00Z')+n*864e5).toISOString().slice(0,10);
let n=0;const o=(itemId:string,label:string,retailer:string,price:number,packQty:number,packUnit:string,extra:any={})=>({id:'qa-obs-'+(++n),itemId,label,retailer,branchId:null,state:'NSW',price,currency:'AUD',packQty,packUnit,units:['roll','wash','each'].includes(packUnit)?packQty:null,unitPrice:null,unitBasis:null,wasPrice:null,promo:null,validUntil:null,observedAt:add(today,-2),observedBy:'QA',source:'manual',note:null,visibility:'family',evidence:{type:'manual',imageHash:null,ocrPrice:null,ocrMatches:null},capturedAt:null,confidence:'low',storeBranchId:null,...extra});
const FAMILY=[o('gao-jasmine','Jasmine rice 5kg','woolworths',12,5,'kg'),o('sua-tuoi','Milk 2L','woolworths',3.1,2,'L'),o('sua-tuoi','Milk 2L','coles',3.1,2,'L'),o('tom','Prawns 1kg','woolworths',30,1,'kg'),o('giay-ve-sinh','Toilet paper 24','woolworths',14,24,'roll'),o('giay-ve-sinh','Toilet paper 24','coles',13,24,'roll')];
const cp=(itemId:string,label:string,retailer:string,price:number,packQty:number,packUnit:string,extra:any={})=>({groupId:(++n).toString(16).padStart(16,'a'),itemId,label,retailer,branchId:retailer+':2166:cabramatta',branchLabel:'Cabramatta 2166',state:'NSW',status:'confirmed',price,unitPrice:null,unitBasis:null,packQty,packUnit,units:null,promo:null,validUntil:null,families:3,reports:3,lastObserved:add(today,-1),ageDays:1,usable:true,faded:false,online:false,sources:['shelf-photo','receipt'],...extra});
const SHOP=[{id:'sp-qa-1',itemId:'rau-muong',label:'Rau muống bó',retailer:'viet-grocer',price:2.5,currency:'AUD',unitPrice:null,unitBasis:null,packQty:500,packUnit:'g',observedAt:add(today,-1),openReports:0,shop:{id:'0123456789abcdef',name:'Chợ Việt QA',suburb:'Cabramatta',state:'NSW'},expiresAt:new Date(Date.now()+12*864e5).toISOString(),channel:'shop'}];
const COMMUNITY={state:'NSW',today,items:[cp('gao-jasmine','Jasmine rice 5kg','coles',13.5,5,'kg'),cp('gao-jasmine','Jasmine rice 5kg','woolworths',12.9,5,'kg',{online:true,branchId:'woolworths:online:NSW',branchLabel:'online',sources:['screenshot'],families:2}),cp('tom','Green prawns 1kg','coles',27,1,'kg',{families:2,sources:['shelf-photo']}),cp('tom','Green prawns 1kg','woolworths',29,1,'kg',{families:2,sources:['screenshot'],online:true,branchId:'woolworths:online:NSW',branchLabel:'online'}),cp('sua-tuoi','Milk 2L','aldi',2.99,2,'L',{status:'pending',usable:false,families:1,sources:['receipt'],ageDays:3}),cp('sua-tuoi','Milk 2L','coles',3.1,2,'L',{families:2}),cp('sua-tuoi','Milk 2L','woolworths',3.1,2,'L',{families:2,sources:['bookmark'],online:true,branchId:'woolworths:online:NSW',branchLabel:'online'}),cp('rau-muong','Rau muống 500g','woolworths',4,500,'g',{faded:true,usable:false,ageDays:17,families:2,branchLabel:'Bankstown 2200',branchId:'woolworths:2200:bankstown'}),cp('giay-ve-sinh','Toilet paper 24','aldi',9.99,24,'roll',{promo:'special-buy',validUntil:add(today,3),families:2})],shopPrices:SHOP,wanted:{counts:{'ca-tim':7,'dau-an':4,'hanh-la':2,'rau-muong':3}}};
const EMPTY_COMMUNITY={state:'NSW',today,items:[],shopPrices:[],wanted:{counts:{'ca-tim':3,'dau-an':1}}};
const STATUS=(x:any={})=>({enabled:true,signedIn:true,publicRead:true,states:['NSW','QLD'],eligibility:{ok:true,reasons:[],accountDays:42,familyDays:40,verifiedEmail:false},viewer:false,termsAcceptedAt:null,termsVersion:'2026-11-draft',shareDefault:false,shop:null,limits:{perDay:30,captureMaxDays:7},rewards:{confirmed:10,corroborate:3},...x});
const GUEST={enabled:true,signedIn:false,publicRead:true,states:['NSW','QLD'],rewards:{confirmed:10,corroborate:3}};
const LEVELS=[{id:'shopper',vi:'Người đi chợ',en:'Shopper',icon:'🧺',min:0},{id:'hunter',vi:'Thợ săn giá',en:'Price hunter',icon:'🔎',min:100},{id:'expert',vi:'Chuyên gia giá',en:'Price expert',icon:'🎓',min:500},{id:'ambassador',vi:'Đại sứ chợ Việt',en:'Viet market ambassador',icon:'🏮',min:1500}];
const REWARDS={total:230,week:40,today:20,dailyCap:100,level:LEVELS[1],next:LEVELS[2],toNext:270,progress:0.325,badges:[{id:'half-price',icon:'🏷️',vi:'Săn deal 1/2 giá',en:'Half-price hunter'},{id:'first-suburb',icon:'📍',suburb:'Cabramatta',vi:'Người đầu tiên ở Cabramatta',en:'First in Cabramatta'}],recent:[{id:'award:cp-qa',type:'confirmed',points:10,requested:10,itemId:'tom',label:'Prawns',at:new Date().toISOString()}],profile:{nickname:null,showNickname:false,anonId:'#4821'},rules:{confirmed:10,specialBonus:5,corroborate:3,gapBonus:5,penalty:20,dailyCap:100}};
const LB=(me=true)=>({state:'NSW',weekStart:today,weekly:{rows:[{rank:1,name:'Mẹ Bin',anonId:'#1234',points:120,level:'expert',badges:3},{rank:2,name:null,anonId:'#4821',points:40,level:'hunter',badges:2,...(me?{me:true}:{})},{rank:3,name:null,anonId:'#7310',points:25,level:'shopper',badges:0},{rank:4,name:'Bố Tí',anonId:'#2290',points:13,level:'shopper',badges:1}]},allTime:{rows:[{rank:1,name:'Mẹ Bin',anonId:'#1234',points:1620,level:'ambassador',badges:4},{rank:2,name:null,anonId:'#4821',points:230,level:'hunter',badges:2,...(me?{me:true}:{})}]},levels:LEVELS});
const EXTRAS=[['Rau muống','500 g'],['Giấy vệ sinh','1 gói'],['Sữa tươi','2 L'],['Gạo thơm jasmine','5 kg'],['Tôm','500 g'],['Dầu ăn','2 L'],['Cà tím','500 g'],['Hành lá','1 bó']];
const PRODUCTS=[{itemId:'ca-tim',retailer:'woolworths',key:'a1b2c3d4e5f6',productUrl:'https://www.woolworths.com.au/shop/productdetails/123456/eggplant-each',productId:'123456',productName:'Eggplant each',packQty:null,packUnit:null,status:'confirmed',confirmations:2,firstSeen:new Date().toISOString(),lastConfirmed:new Date().toISOString()}];
const sub=(id:string,extra:any={})=>({kind:'held',state:'NSW',id,groupId:'aaaabbbbccccdddd',itemId:'gao-jasmine',label:'Jasmine rice 5kg',retailer:'aldi',branchLabel:'Cabramatta 2166',branchId:'aldi:2166:cabramatta',price:1,unitPrice:0.2,unitBasis:'per_kg',packQty:5,packUnit:'kg',promo:null,validUntil:null,capturedAt:new Date().toISOString(),submittedAt:new Date().toISOString(),status:'held',holdReason:'too-low',flags:[],approved:false,shadow:false,counted:true,evidence:{type:'shelf-photo',ocrPrice:1,ocrMatches:true,hash:'3f9a1c22b0e4'},photo:true,contributor:{account:'qa-contrib-1',trust:0.5,banned:false,flags:[],submissions:4},...extra});
const RW={contributors:[{account:'qa-contrib-1',state:'NSW',total:230,week:40,today:20,level:'hunter',badges:['🏷️ Half-price hunter','📍 First in Cabramatta'],entries:24,nickname:null,showNickname:false,anonId:'#4821',trust:0.62},{account:'qa-mebin',state:'NSW',total:1620,week:120,today:30,level:'ambassador',badges:['🏮 Viet grocer regular'],entries:170,nickname:'Mẹ Bin',showNickname:true,anonId:'#1234',trust:0.81},{account:'qa-new-3',state:'NSW',total:-10,week:-10,today:10,level:'shopper',badges:[],entries:2,nickname:null,showNickname:false,anonId:'#7310',trust:0.35}],leaderboards:{NSW:{weekly:{rows:LB(false).weekly.rows.map((r:any,i:number)=>({...r,account:['qa-mebin','qa-contrib-1','qa-new-3','qa-boti'][i]}))},allTime:{rows:LB(false).allTime.rows.map((r:any,i:number)=>({...r,account:['qa-mebin','qa-contrib-1'][i]}))}},QLD:{weekly:{rows:[]},allTime:{rows:[]}}},config:{confirmed:10,specialBonus:5,corroborate:3,gapBonus:5,gapFamilies:3,penalty:20,dailyCap:100,levels:[100,500,1500]},levels:LEVELS,source:'default'};
const LEDGER={account:'qa-contrib-1',anonId:'#4821',entries:[{id:'adj-1',type:'adjust',points:25,reason:'QA help',actor:'henrynguyen',at:new Date().toISOString()},{id:'award:cp-1',type:'confirmed',points:15,requested:15,label:'Prawns 1kg',promo:'half-price',firstSuburb:'Cabramatta',at:new Date().toISOString()},{id:'award:cp-2',type:'corroborated',points:3,requested:3,label:'Milk 2L',at:new Date().toISOString()},{id:'penalty:cp-3',type:'penalty',points:-20,reason:'rejected',label:'Jasmine rice',at:new Date().toISOString()}]};
const MOD={stats:{submissions:128,confirmed:31,pending:44,held:3,reportsOpen:4,contributors:27,banned:1,trust:{'<0.3':2,'0.3–0.7':21,'≥0.7':4},hidden:2,rejected:3},queue:[sub('cp-qa-1'),sub('cp-qa-2',{kind:'flagged',status:'accepted',holdReason:null,flags:['new-account-burst'],photo:false,retailer:'coles',price:4,itemId:'ca-tim',label:'Eggplant',evidence:{type:'screenshot',ocrPrice:4,ocrMatches:true,hash:'77aa01c2b3d4'},contributor:{account:'qa-new-3',trust:0.5,banned:false,flags:['new-account-burst','shared-ip'],submissions:2}}),{kind:'reported',state:'NSW',itemId:'tom',groupId:'1234123412341234',label:'Green prawns 1kg',retailer:'coles',branchLabel:'Cabramatta 2166',price:27,status:'confirmed',families:2,hiddenGroup:false,reports:[{id:'rp-1',reason:'wrong-price',note:'Shelf says $29',at:new Date().toISOString()}],submissions:[sub('cp-qa-3',{status:'accepted',price:27,holdReason:null,photo:false})]},{kind:'shop-reported',state:'NSW',shop:'qashop',shopName:'Chợ Việt QA',priceId:'sp-qa-1',itemId:'rau-muong',label:'Rau muống bó',price:2.5,hidden:false,reports:[{id:'rp-2',reason:'expired',note:'',at:new Date().toISOString()}]}],coi:[{account:'qa-rival',trust:0.45,banned:false,flags:['single-branch-low'],submissions:9}],applications:[{username:'qashop',shopName:'Chợ Việt QA',abn:'12 345 678 901',suburb:'Cabramatta',postcode:'2166',state:'NSW',status:'pending',appliedAt:new Date().toISOString()}],shopPrices:SHOP,rewards:RW,products:[{...PRODUCTS[0],itemId:'tom',productName:'Green prawns 1kg',key:'0f0e0d0c0b0a',productUrl:'https://www.coles.com.au/product/green-prawns-1kg-2345678',productId:'2345678',retailer:'coles',status:'candidate',confirmations:1,staleReason:null},{...PRODUCTS[0],status:'stale',staleReason:'wrong-product'},{...PRODUCTS[0],itemId:'gao-jasmine',productName:'SunRice Jasmine 5kg',key:'111122223333',productUrl:'https://www.woolworths.com.au/shop/productdetails/123456/sunrice-jasmine-5kg'}],pilot:{enabled:true,states:['NSW','QLD']},flagSource:'default',rules:{}};
async function main(){
 mkdirSync(out,{recursive:true});
 for(const f of readdirSync(out))if(f.endsWith('.png'))unlinkSync(`${out}/${f}`);// replace outdated screenshots
 const browser=await chromium.launch();const shots:string[]=[];
 async function open({viewport=sizes.mobile,lang='vi',theme='light',status=STATUS(),api,account=true,community=COMMUNITY,family=FAMILY,rewards=REWARDS,scoutExtra={}}:any={}){
  const context=await browser.newContext({viewport,serviceWorkers:'block',reducedMotion:'reduce',colorScheme:theme});
  const scope=account?'account/qa-household/':'guest/',scout={version:1,open:true,fold176:true,postcode:'2166',state:'NSW',prefs:{communityOpen:true,wantOpen:true},local:[],pending:[],pool:account?{at:Date.now(),observations:family,official:null}:null,...scoutExtra};
  await context.addInitScript(({scope,lang,theme,scout,account}:any)=>{if(sessionStorage.getItem('qa-init'))return;sessionStorage.setItem('qa-init','1');localStorage.setItem('bep-theme-mode',theme);localStorage.setItem(scope+'bep-language',lang);if(account)localStorage.setItem('bep-account-present','yes');else localStorage.setItem('bep-local-locked','yes');localStorage.setItem(scope+'bep-price-scout-v1',JSON.stringify(scout))},{scope,lang,theme,scout,account});
  const page=await context.newPage(),errors:string[]=[],calls:any[]=[];let linked:any=null;
  page.on('pageerror',e=>errors.push(e.message));
  await page.route(origin+'/**',async route=>{const req=route.request(),url=new URL(req.url()),path=url.pathname,op=url.searchParams.get('op')||'';
   if(path.endsWith('/community')){calls.push({op,method:req.method(),body:req.postData()});const r=api?.(req,op);if(r){await route.fulfill(r);return}
    await route.fulfill(op==='status'?{json:status}:op.startsWith('prices')?{json:community}:op==='rewards'?(account?{json:rewards}:{status:401,json:{}}):op.startsWith('leaderboard')?{json:LB(account)}:op.startsWith('products')?{json:{products:PRODUCTS}}:{status:201,json:{}});return}
   if(path.startsWith('/.netlify/')){
    if(!account){await route.fulfill({status:401,json:{error:'no'}});return}
    if(path.endsWith('/grocery')){await route.fulfill(op==='prices'?{json:{householdId:'qa-household',state:'NSW',cycleId:'x',today,observations:family,official:null}}:{status:201,json:{}});return}
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
  // Checkbox/radio inputs are excluded because their whole label row is the ≥44px target (checked below).
  const small=await page.evaluate((scope:string)=>[...document.querySelectorAll(`${scope} button,${scope} a.btn,${scope} select,${scope} input:not([type=file]):not([type=hidden]):not([type=checkbox]):not([type=radio]),${scope} summary,${scope} .scout-check,.modal .scout-form .btn,[data-community]`)].filter((e:any)=>e.offsetParent&&e.getBoundingClientRect().height<43.5).map((e:any)=>(e.dataset.community||e.dataset.scout||e.id||e.textContent).slice(0,30)),scope);
  assert.deepEqual(small,[],label+': touch targets under 44px');
  const text=await page.evaluate(()=>document.body.innerText);assert.doesNotMatch(text,/Netlify|Blobs/i,label+': no vendor names');
 }
 async function shot(page:any,name:string){await page.screenshot({path:`${out}/${name}.png`,fullPage:false});shots.push(name)}
 const scrollTo=async(page:any,sel:string)=>{await page.evaluate((sel:string)=>{const el=document.querySelector(sel);if(el){const y=el.getBoundingClientRect().top+scrollY-70;scrollTo(0,y)}},sel);await page.waitForTimeout(150)};
 const shelfDraft=`scoutConfirm(scoutNewDraft({source:'screenshot',evidenceType:'shelf-photo',itemId:'gao-jasmine',label:'Jasmine rice 5kg',retailer:'coles',price:13.5,packQty:5,packUnit:'kg',unitPrice:2.7,unitBasis:'per_kg',ocrPrice:13.5,imageHash:'a'.repeat(64),capturedAt:new Date().toISOString(),file:new File([new Uint8Array([255,216,255,224])],'shelf.jpg',{type:'image/jpeg'})}))`;
 const screenDraft=`scoutConfirm(scoutNewDraft({source:'screenshot',itemId:'gao-jasmine',label:'Jasmine rice 5kg',retailer:'coles',price:13.5,packQty:5,packUnit:'kg',ocrPrice:13.5,imageHash:'b'.repeat(64),raw:'Jasmine rice 5kg $13.50',capturedAt:new Date().toISOString()}))`;
 const ALL3=[['vi','light','mobile'],['en','dark','tablet'],['vi','dark','desktop']] as const;
 try{
  // 1. Device-only user, no own prices: "N community prices in NSW this week", comparisons from community prices, sign-in prompt.
  for(const [lang,theme,size] of [['vi','light','mobile'],['en','dark','mobile'],['vi','light','tablet'],['en','light','desktop'],['vi','dark','desktop']] as const){
   const {page,context,errors,calls}=await open({lang,theme,viewport:sizes[size],account:false,status:GUEST});
   await page.waitForSelector('.scout-empty-community',{timeout:10000});
   const empty=await page.locator('.scout-empty-community').innerText();
   assert.match(empty,lang==='vi'?/7 giá cộng đồng ở NSW tuần này/:/7 community prices in NSW this week/);assert.doesNotMatch(empty,/Chưa có giá nào/);
   assert.match(await page.locator('.scout-points.guest').innerText(),lang==='vi'?/Đăng nhập để chia sẻ giá và nhận điểm/:/Sign in to share prices and earn points/);
   const onestop=await page.locator('.scout-cards .scout-card:not(.scout-trips)').first().innerText()/* v1.7.5: the trip-plan card now comes first; this checks the one-stop card */;assert.match(onestop,/Woolworths/);assert.match(onestop,lang==='vi'?/rẻ hơn|bằng giá/:/cheaper|same/,'one-stop comparison works without own prices');
   assert.match((await page.locator('.scout-mix').allInnerTexts()).join(' '),lang==='vi'?/giá cộng đồng đã xác nhận/:/confirmed community price/);
   assert.equal(await page.locator('[data-community="report"]').count(),0,'device-only users cannot report');assert.equal(await page.locator('[data-community="shelf"]').count(),0);
   assert.match(await page.locator('.scout-community').innerText(),lang==='vi'?/Giá online/:/Online price/);
   assert.ok(calls.every((c:any)=>c.method==='GET'),'device-only never writes community data');assert.ok(!calls.some((c:any)=>c.op==='rewards'||c.op==='wanted'));
   await check(page,`guest ${lang} ${theme} ${size}`);
   await scrollTo(page,'.scout-points');await shot(page,`empty-community-${lang}-${theme}-${size}`);
   if(size!=='mobile'){await scrollTo(page,'.scout-cards');await shot(page,`guest-compare-${lang}-${theme}-${size}`)}
   assert.deepEqual(errors,[]);await context.close();
  }
  // 2. First contributor: no community prices yet → invite with points incentive + 3 steps; device-only variant shows sign-in.
  for(const [lang,theme,size,account] of [['vi','light','mobile',true],['en','dark','mobile',true],['vi','light','tablet',true],['en','light','desktop',true],['vi','dark','mobile',false]] as const){
   const {page,context,errors,calls}=await open({lang,theme,viewport:sizes[size],account,status:account?STATUS({termsAcceptedAt:new Date().toISOString(),shareDefault:true}):GUEST,community:EMPTY_COMMUNITY,family:[],rewards:{...REWARDS,total:0,progress:0,level:LEVELS[0],next:LEVELS[1],toNext:100,badges:[],recent:[]}});
   await page.waitForSelector('.scout-empty-first',{timeout:10000});
   const t=await page.locator('.scout-empty-first').innerText();
   assert.match(t,lang==='vi'?/Hãy là người đầu tiên chia sẻ giá ở NSW/:/Be the first to share prices in NSW/);assert.match(t,/\+10/);assert.equal(await page.locator('.scout-steps li').count(),3,'3-step how-to');
   assert.ok(t.length<420,'short, no long paragraph ('+t.length+')');
   if(!account)assert.match(await page.locator('.scout-points.guest').innerText(),/Đăng nhập để chia sẻ giá và nhận điểm/);
   // Prices wanted this week: own list items without a confirmed price, most-needed first.
   const wanted=page.locator('.scout-wanted');assert.equal(await wanted.count(),1);const rows=await wanted.locator('.scout-want-main b').allInnerTexts();
   assert.equal(rows[0],lang==='vi'?'Cà tím':'Eggplant','ordered by how many families need it');assert.match(await wanted.innerText(),lang==='vi'?/3 gia đình cần/:/3 families need it/);
   // Confirmed product mapping → open the exact product page; other rows use the store search.
   const first=wanted.locator('.scout-want').first();assert.equal(await first.locator('a.scout-exact-link').getAttribute('href'),PRODUCTS[0].productUrl,'“Mở đúng sản phẩm” uses the confirmed mapping');assert.match(await first.locator('a.scout-exact-link').getAttribute('title')||'',lang==='vi'?/Mở đúng sản phẩm/:/Open the exact product/);
   assert.match(await first.locator('a[href*="coles.com.au/search"]').getAttribute('href')||'',/^https:\/\/www\.coles\.com\.au\/search\/products\?q=Eggplant/);
   const href=await wanted.locator('.scout-want').nth(1).locator('a[href*="woolworths.com.au"]').first().getAttribute('href');assert.match(href||'',/^https:\/\/www\.woolworths\.com\.au\/shop\/search\/products\?searchTerm=/);
   assert.equal(await first.locator('[data-community="product-report"]').count(),account?1:0,'only accounts report links');
   assert.equal(await wanted.locator('a[href*="coles.com.au/search"]').count()>0,true);assert.ok(await wanted.locator('[data-scout="shot"][data-want]').count()>0,'“Chụp giá” shortcut');
   await check(page,`first ${lang} ${theme} ${size}`);
   await scrollTo(page,'.scout-empty-first');await shot(page,`empty-first-${account?'':'guest-'}${lang}-${theme}-${size}`);
   await scrollTo(page,'.scout-wanted');await shot(page,`wanted-${account?'':'guest-'}${lang}-${theme}-${size}`);
   if(account&&size==='mobile'&&lang==='vi'){// "link hỏng/sản phẩm khác" → stale, falls back to search
    page.once('dialog',(dl:any)=>dl.accept());
    await first.locator('[data-community="product-report"]').click();await page.waitForTimeout(400);
    const rep=calls.find((c:any)=>c.op==='product-report');assert.deepEqual(JSON.parse(rep.body),{itemId:'ca-tim',retailer:'woolworths',key:PRODUCTS[0].key,reason:'broken'});
    assert.equal(await page.locator('.scout-want').first().locator('a.scout-exact-link').count(),0,'reported link falls back to search');
    assert.match(await page.locator('.scout-want').first().locator('a[href*="woolworths.com.au"]').getAttribute('href')||'',/searchTerm=Eggplant/);
   }
   assert.deepEqual(errors,[]);await context.close();
  }
  // 3. Capture sheet: after the first consent "Share" starts ticked; screenshot = online price, facts only, no consent sheet again.
  for(const [lang,theme,size] of [['vi','light','mobile'],['en','dark','mobile'],['vi','light','tablet'],['en','light','desktop']] as const){
   let posted:any=null;const api=(req:any,op:string)=>op==='contribute'?(posted=JSON.parse(req.postData()),{status:201,json:{id:'cp-qa-y',status:'accepted',group:{status:'pending',families:1},counted:true}}):null;
   const {page,context,errors,calls}=await open({lang,theme,viewport:sizes[size],api,status:STATUS({termsAcceptedAt:new Date().toISOString(),shareDefault:true})});
   await page.waitForSelector('.scout-points');await page.evaluate(screenDraft);await page.waitForSelector('#scout-share');
   assert.equal(await page.locator('#scout-share').isChecked(),true,'share box defaults to on after the first consent');
   assert.equal(await page.locator('input[name="shareWhere"][value="online"]').isChecked(),true);assert.equal(await page.locator('#scout-share-branch').isHidden(),true,'online price needs no branch');
   assert.match(await page.locator('.scout-community-share').innerText(),lang==='vi'?/Ảnh màn hình, hình và mô tả của cửa hàng không bao giờ được gửi/:/screenshot and any store pictures or descriptions are never sent/);
   await page.locator('.scout-community-share').scrollIntoViewIfNeeded();await check(page,'share default '+size,'.modal .scout-form');await shot(page,`capture-share-default-${lang}-${theme}-${size}`);
   await page.locator('.modal-footer .btn.primary').click();await page.waitForTimeout(500);
   assert.ok(posted,'contribution posted');assert.equal(calls.some((c:any)=>c.op==='accept-terms'),false,'no consent sheet after the first time');
   assert.equal(posted.observation.evidence.type,'screenshot');assert.deepEqual(posted.branch,{online:true});assert.equal(posted.observation.evidence.ocrPrice,13.5);
   for(const k of ['observedBy','note','raw','id','source','confidence','url','file'])assert.ok(!(k in posted.observation),'not shared: '+k);
   assert.ok(!JSON.stringify(posted).includes('Jasmine rice 5kg $13.50'),'recognised text never sent');
   if(size==='mobile'&&lang==='vi'){// user can untick for this one price; manual entries stay family-only
    await page.evaluate(screenDraft);await page.waitForSelector('#scout-share');await page.locator('#scout-share').uncheck();assert.equal(await page.locator('#scout-share-where').isHidden(),true);await page.locator('[data-action="close-modal"]').first().click();
    // "Lưu giá" bookmark capture: price facts go to contribute (no URL); the product page goes to the separate link memory.
    posted=null;await page.evaluate(`scoutConfirm(scoutNewDraft({source:'bookmark',itemId:'gao-jasmine',label:'SunRice Jasmine 5kg',retailer:'woolworths',price:12.5,packQty:5,packUnit:'kg',ocrPrice:12.5,url:'https://www.woolworths.com.au/shop/productdetails/123456/sunrice-jasmine-5kg',raw:'SunRice',capturedAt:new Date().toISOString()}))`);await page.waitForSelector('#scout-share');assert.equal(await page.locator('#scout-share').isChecked(),true);
    await page.locator('.modal-footer .btn.primary').click();await page.waitForTimeout(500);assert.equal(posted?.observation.evidence.type,'bookmark');assert.ok(!JSON.stringify(posted).includes('woolworths.com.au'),'no URL in the price facts');
    const prod=calls.find((c:any)=>c.op==='product');assert.ok(prod,'product mapping candidate saved');assert.deepEqual(JSON.parse(prod.body),{itemId:'gao-jasmine',retailer:'woolworths',url:'https://www.woolworths.com.au/shop/productdetails/123456/sunrice-jasmine-5kg',name:'SunRice Jasmine 5kg',packQty:5,packUnit:'kg'});
    await page.evaluate(`scoutConfirm(scoutNewDraft({source:'manual',itemId:'gao-jasmine',label:'Rice',retailer:'coles',price:13.5}))`);await page.waitForSelector('#scout-obs-form');assert.equal(await page.locator('#scout-share').count(),0);assert.match(await page.locator('.scout-community-note').innerText(),/chỉ lưu trong gia đình/);await page.locator('.scout-community-note').scrollIntoViewIfNeeded();await shot(page,'manual-family-only-vi-light-mobile');
   }
   assert.deepEqual(errors,[]);await context.close();
  }
  // 4. First time: shelf photo, box unticked, bilingual consent; held → ask before sending the photo.
  for(const [lang,theme,size] of [['vi','light','mobile'],['en','dark','tablet'],['en','light','desktop']] as const){
   let posted:any=null;const api=(req:any,op:string)=>{if(op==='accept-terms')return{json:{termsAcceptedAt:new Date().toISOString(),termsVersion:'2026-11-draft',shareDefault:true}};if(op==='contribute'){posted=JSON.parse(req.postData());return{status:201,json:{id:'cp-qa-x',status:'held',holdReason:'too-low',photoRequested:true,group:{status:'pending',families:1}}}}if(op==='photo')return{status:201,json:{stored:true}};return null};
   const {page,context,errors,calls}=await open({lang,theme,viewport:sizes[size],api});await page.waitForSelector('.scout-community');
   await page.evaluate(shelfDraft);await page.waitForSelector('#scout-share');
   assert.equal(await page.locator('#scout-share').isChecked(),false,'before the first consent the box is unticked');assert.equal(await page.locator('#scout-share-branch').isHidden(),true);
   await page.locator('#scout-share').check();assert.equal(await page.locator('#scout-share-branch').isVisible(),true,'shelf photo needs the store branch');
   await page.fill('#scout-share-suburb','Cabramatta');
   await page.locator('.modal-footer .btn.primary').click();await page.waitForSelector('#scout-terms');
   const terms=await page.locator('.modal').innerText();assert.match(terms,lang==='vi'?/ẩn danh/:/anonymously/);assert.match(terms,lang==='vi'?/14 ngày/:/14 days/);assert.match(terms,lang==='vi'?/không có giá trị tiền mặt/:/no cash value/);assert.match(terms,lang==='vi'?/Ảnh, hình và mô tả của cửa hàng/:/store pictures or descriptions/);
   await check(page,'consent '+size,'.modal .scout-terms');await shot(page,`consent-${lang}-${theme}-${size}`);
   await page.locator('[data-community="terms-accept"]').click();await page.waitForSelector('[data-community="photo-send"]');
   assert.ok(posted);assert.equal(posted.consent,true);assert.equal(posted.observation.evidence.type,'shelf-photo');assert.deepEqual(posted.branch,{suburb:'Cabramatta',postcode:'2166'});
   await check(page,'held '+size,'.modal-footer');if(size==='mobile')await shot(page,`held-photo-ask-${lang}-${theme}-${size}`);
   await page.locator('[data-community="photo-send"]').click();await page.waitForTimeout(300);assert.ok(calls.some((c:any)=>c.op.startsWith('photo')&&c.method==='POST'),'photo only sent after the user agrees');
   assert.ok(calls.findIndex((c:any)=>c.op==='accept-terms')<calls.findIndex((c:any)=>c.op==='contribute'),'terms accepted before the first contribution');
   assert.deepEqual(errors,[]);await context.close();
  }
  // 5. Points widget + "+N points" toast on refresh; badges + source mix + community card; leaderboard with nickname opt-in.
  for(const [lang,theme,size] of [['vi','light','mobile'],['en','dark','mobile'],['vi','light','tablet'],['en','dark','tablet'],['vi','dark','desktop'],['en','light','desktop']] as const){
   let profile:any=null;const api=(req:any,op:string)=>op==='rewards-profile'?(profile=JSON.parse(req.postData()),{json:{nickname:profile.nickname,showNickname:profile.showNickname,anonId:'#4821'}}):null;
   const {page,context,errors,calls}=await open({lang,theme,viewport:sizes[size],api,status:STATUS({termsAcceptedAt:new Date().toISOString(),shareDefault:true}),scoutExtra:{rewardsSeen:{qa:220}}});
   await page.waitForSelector('.scout-points .scout-points-total');await page.waitForFunction(()=>/10/.test(document.getElementById('toast')?.textContent||''),null,{timeout:5000});
   const toastText=await page.locator('#toast').innerText();assert.match(toastText,lang==='vi'?/\+10 điểm/:/\+10 points/,'toast when points were earned since last refresh');
   const w=await page.locator('.scout-points').innerText();assert.match(w,lang==='vi'?/Điểm của bạn: 230/:/Your points: 230/);assert.match(w,lang==='vi'?/Thợ săn giá/:/Price hunter/);assert.match(w,lang==='vi'?/còn 270 điểm tới Chuyên gia giá/:/270 to Price expert/);assert.match(w,lang==='vi'?/Săn deal 1\/2 giá/:/Half-price hunter/);assert.match(w,lang==='vi'?/Người đầu tiên ở Cabramatta/:/First in Cabramatta/);
   assert.equal(await page.locator('.scout-progress').getAttribute('aria-valuenow'),'33');
   assert.ok(calls.some((c:any)=>c.op==='wanted'&&c.method==='POST'),'own list item ids feed the anonymous wanted count');const wantedBody=JSON.parse(calls.find((c:any)=>c.op==='wanted').body);assert.deepEqual(Object.keys(wantedBody).sort(),['itemIds','state']);
   const text=await page.locator('.scout-community').innerText();
   if(lang==='vi'){assert.match(text,/Đã xác nhận/);assert.match(text,/Chờ xác nhận/);assert.match(text,/3 gia đình xác nhận · hôm qua/);assert.match(text,/Giá do tiệm đăng/);assert.match(text,/Giá online/);assert.match(text,/Báo giá sai/)}
   else{assert.match(text,/Confirmed/);assert.match(text,/Awaiting confirmation/);assert.match(text,/Shop-posted price/);assert.match(text,/Online price/)}
   assert.doesNotMatch(text,/qa-contrib/,'no identity');
   assert.match((await page.locator('.scout-mix').allInnerTexts()).join(' '),lang==='vi'?/giá của nhà mình/:/family price/);
   await check(page,`points ${lang} ${theme} ${size}`);
   await scrollTo(page,'.scout-points');await shot(page,`points-toast-${lang}-${theme}-${size}`);
   if(['mobile','desktop'].includes(size)&&theme!=='dark'||size==='tablet'&&lang==='en'){await scrollTo(page,'.scout-community');await shot(page,`community-badges-${lang}-${theme}-${size}`)}
   // leaderboard
   await page.locator('.scout-points [data-community="leaderboard"]').click();await page.waitForSelector('.scout-board-list');
   const lb=await page.locator('.scout-board').innerText();assert.match(lb,/Mẹ Bin/);assert.match(lb,lang==='vi'?/Ẩn danh #4821/:/Anonymous #4821/);assert.match(lb,lang==='vi'?/Bạn/:/You/);assert.doesNotMatch(lb,/qa-|@/,'never usernames or emails');
   await check(page,'leaderboard '+size,'.modal .scout-board');await check(page,'leaderboard footer '+size,'.modal-footer');if(!(size==='mobile'&&lang==='en'))await shot(page,`leaderboard-${lang}-${theme}-${size}`);
   if(size==='mobile'&&lang==='vi'){await page.fill('#scout-nick','Mẹ Tí');await page.locator('#scout-nick-show').check();await page.locator('.modal-footer .btn.primary').click();await page.waitForTimeout(300);assert.deepEqual(profile,{nickname:'Mẹ Tí',showNickname:true},'nickname is opt-in');
    await page.locator('.scout-board [data-board="allTime"]').click();await page.waitForTimeout(200);assert.match(await page.locator('.scout-board').innerText(),/1620/);await shot(page,'leaderboard-alltime-vi-light-mobile')}
   assert.deepEqual(errors,[]);await context.close();
  }
  // 6. Report dialog (signed-in only)
  for(const [lang,theme,size] of ALL3){
   let reported:any=null;const api=(req:any,op:string)=>op==='report'?(reported=JSON.parse(req.postData()),{status:201,json:{reported:true}}):null;
   const {page,context,errors}=await open({lang,theme,viewport:sizes[size],api});await page.waitForSelector('.scout-community [data-community="report"]');
   await page.locator('.scout-community [data-community="report"]').first().click();await page.waitForSelector('#scout-report-form');
   await page.selectOption('#scout-report-reason','wrong-price');await page.fill('#scout-report-note',lang==='vi'?'Kệ ghi $14,50':'Shelf says $14.50');
   await check(page,'report '+size,'.modal .scout-form');await shot(page,`report-dialog-${lang}-${theme}-${size}`);
   await page.locator('.modal-footer .btn.primary').click();await page.waitForTimeout(250);assert.equal(reported?.reason,'wrong-price');assert.equal(reported.state,'NSW');assert.match(reported.groupId,/^[a-f0-9]{16}$/);
   assert.deepEqual(errors,[]);await context.close();
  }
  // Ineligible account: explains the gate instead of offering the checkbox.
  {const {page,context}=await open({lang:'en',status:STATUS({eligibility:{ok:false,reasons:['account-too-new'],accountDays:3,familyDays:3}})});await page.waitForSelector('.scout-community');await page.evaluate(shelfDraft);await page.waitForSelector('#scout-obs-form');assert.equal(await page.locator('#scout-share').count(),0);assert.match(await page.locator('.scout-community-note').innerText(),/at least 7 days old \(now 3\)/);await page.locator('.scout-community-note').scrollIntoViewIfNeeded();await shot(page,'ineligible-en-light-mobile');await context.close()}
  // 7. Flag off (Studio): nothing community-related shows.
  {const {page,context,errors}=await open({status:{enabled:false}});await page.waitForTimeout(600);assert.equal(await page.locator('.scout-community,.scout-points,.scout-wanted').count(),0);assert.equal(await page.locator('[data-community]').count(),0);assert.equal(await page.locator('.scout-mix').count(),0);await page.evaluate(shelfDraft);await page.waitForSelector('#scout-obs-form');assert.equal(await page.locator('.scout-community-share,.scout-community-note').count(),0);assert.deepEqual(errors,[]);await context.close()}
  // Offline: the cached copy is labelled and still used.
  {const {page,context}=await open({lang:'en'});await page.waitForSelector('.scout-community .scout-cp');await context.setOffline(true);await page.evaluate('dispatchEvent(new Event("offline"));scoutRerender()');await page.waitForTimeout(200);assert.match(await page.locator('.scout-sub').innerText(),/Offline/);assert.ok(await page.locator('.scout-community .scout-cp').count()>0);await scrollTo(page,'.scout-community');await shot(page,'community-offline-en-light-mobile');await context.close()}
  // 8. Studio: moderation queue + rewards (leaderboard, ledger drawer, audited adjust with reason)
  for(const [lang,theme,size] of [['vi','light','mobile'],['en','dark','mobile'],['vi','light','tablet'],['en','dark','tablet'],['en','light','desktop'],['vi','dark','desktop']] as const){
   const context=await browser.newContext({viewport:sizes[size],reducedMotion:'reduce',colorScheme:theme});await context.addInitScript(({lang,theme}:any)=>{localStorage.setItem('studio-lang',lang);localStorage.setItem('studio-theme',theme)},{lang,theme});
   const page=await context.newPage(),errors:string[]=[],posts:any[]=[],gets:string[]=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route(origin+'/**',async route=>{const req=route.request(),url=new URL(req.url()),op=url.searchParams.get('op')||'';
    if(url.pathname.endsWith('/studio')){if(req.method()==='POST')posts.push({op,body:JSON.parse(req.postData()||'{}')});else gets.push(op);await route.fulfill({json:op==='me'?{username:'henrynguyen',name:'Henry',role:'owner',csrf:'qa'}:op==='community'?MOD:op==='community-ledger'?LEDGER:{done:true}});return}
    const file=resolve('dist',url.pathname.slice(1));try{await route.fulfill({contentType:mime[extname(file)]||'application/octet-stream',body:readFileSync(file)})}catch{await route.fulfill({status:404,body:''})}});
   await page.goto(origin+'/studio.html#community');await page.waitForSelector('#cptab');
   const studioCheck=async(label:string)=>{const text=await page.locator('#main').innerText();assert.doesNotMatch(text,/Netlify|Blobs/i);const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.ok(overflow<=1,label+' studio overflow '+overflow);
    const small=await page.evaluate(()=>[...document.querySelectorAll('#main button,#main input:not([type=checkbox])')].filter((e:any)=>e.offsetParent&&e.getBoundingClientRect().height<43.5).map((e:any)=>e.textContent.slice(0,20)));if(size!=='desktop')assert.deepEqual(small,[],label+' studio touch targets '+size)};
   const text=await page.locator('#main').innerText();
   assert.match(text,lang==='vi'?/Hàng đợi kiểm duyệt/:/Moderation queue/);assert.match(text,lang==='vi'?/Thấp bất thường/:/Unusually low/);assert.match(text,/qa-contrib-1/);assert.match(text,/OCR \$1\.00/);
   await studioCheck('queue');
   if(size!=='tablet'||lang==='vi'){await shot(page,`studio-overview-${lang}-${theme}-${size}`);await page.evaluate(()=>{const el=document.querySelector('#cptab');if(el)scrollTo(0,el.getBoundingClientRect().top+scrollY-20)});await page.waitForTimeout(100);await shot(page,`studio-queue-${lang}-${theme}-${size}`)}
   if(size==='mobile'&&lang==='vi'){await page.locator('[data-ca="ban"]').first().click();await page.waitForSelector('#ask[open]');await page.fill('#ask textarea','QA: lặp lại giá sai');await page.locator('#ask button[value="ok"]').click();await page.waitForTimeout(200);assert.equal(posts.find(p=>p.op==='community-action')?.body.action,'ban');posts.length=0}
   // Product links tab (approve / reject / edit, audited server-side with a reason)
   if(size==='mobile'&&lang==='en'||size==='desktop'&&lang==='vi'){
    await page.locator('[data-tab="products"]').click();await page.waitForSelector('[data-pa]');assert.match(await page.locator('#cptab').innerText(),/productdetails\/123456/);await studioCheck('products');
    await page.evaluate(()=>{const el=document.querySelector('#cptab');if(el)scrollTo(0,el.getBoundingClientRect().top+scrollY-20)});await page.waitForTimeout(100);await shot(page,`studio-products-${lang}-${theme}-${size}`);
    posts.length=0;await page.locator('[data-pa="product-approve"]').first().click();await page.waitForSelector('#ask[open]');await page.fill('#ask textarea','QA: checked page');await page.locator('#ask button[value="ok"]').click();await page.waitForTimeout(200);
    assert.equal(posts.find(p=>p.op==='community-action')?.body.action,'product-approve');assert.equal(posts[0].body.reason,'QA: checked page');posts.length=0;
   }
   // Rewards tab
   await page.locator('[data-tab="rewards"]').click();await page.waitForSelector('#main:not([aria-busy]) #rwf');
   const rt=await page.locator('#main').innerText();assert.match(rt,/Mẹ Bin/);assert.match(rt,lang==='vi'?/Ẩn danh #4821/:/Anonymous #4821/);assert.match(rt,/qa-contrib-1/);assert.match(rt,lang==='vi'?/Đổi điểm lấy quà: chưa có/:/Redeeming points: not built/);
   await studioCheck('rewards');
   await page.evaluate(()=>{const el=document.querySelector('#cptab');if(el)scrollTo(0,el.getBoundingClientRect().top+scrollY-20)});await page.waitForTimeout(100);await shot(page,`studio-rewards-${lang}-${theme}-${size}`);
   if(lang==='vi'&&size!=='desktop'||lang==='en'&&size==='desktop'){
    await page.locator('[data-ledger="qa-contrib-1"]').click();await page.waitForSelector('#drawer[open]');assert.ok(gets.includes('community-ledger'));assert.match(await page.locator('#drawer').innerText(),/QA help/);await page.waitForTimeout(150);await shot(page,`studio-ledger-${lang}-${theme}-${size}`);await page.locator('#drawer [data-close]').click();
    await page.locator('[data-adjust="qa-contrib-1"]').click();await page.waitForSelector('#ask[open]');await page.fill('#ask input[name="points"]','-15');await page.fill('#ask textarea','QA: điều chỉnh thử');if(size==='mobile')await shot(page,`studio-adjust-dialog-${lang}-${theme}-${size}`);await page.locator('#ask button[value="ok"]').click();await page.waitForTimeout(200);
    const adj=posts.find(p=>p.op==='community-action');assert.deepEqual(adj?.body,{action:'points-adjust',account:'qa-contrib-1',points:-15,reason:'QA: điều chỉnh thử'},'adjust posts amount + reason (audited server-side)');
    posts.length=0;await page.waitForSelector('#main:not([aria-busy])');await page.locator('[data-tab="rewards"]').click().catch(()=>{});await page.waitForSelector('#main:not([aria-busy]) #rwf');await page.fill('#rwf input[name="dailyCap"]','80');await page.locator('#rwf button.primary').click();await page.waitForSelector('#ask[open]');await page.locator('#ask button[value="ok"]').click();await page.waitForTimeout(200);
    assert.deepEqual(posts.find(p=>p.op==='settings-save')?.body.patch.rewards,{confirmed:10,specialBonus:5,corroborate:3,gapBonus:5,gapFamilies:3,penalty:20,dailyCap:80,levels:[100,500,1500]});
   }
   assert.deepEqual(errors,[]);await context.close();
  }
  console.log('PASS community prices + rewards responsive QA ('+shots.length+' screenshots): device-only read + comparisons, empty states, wanted list, share-by-default, online facts-only payload, consent, held photo, points + toast, leaderboard + nickname, report, ineligible, flag off, offline, Studio moderation + rewards');
 }finally{await browser.close()}
}
main().catch(error=>{console.error(error);process.exit(1)});
