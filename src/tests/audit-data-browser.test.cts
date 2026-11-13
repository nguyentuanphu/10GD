// v1.7.19 whole-app audit (12 Nov 2026, Sydney time), area “amounts, validators, sync” — the screens: C1 (a rooster in a family
// recipe is “1 con” on Đi chợ), C6 (re-opening a saved receipt keeps an unknown unit unknown), C12 (“Chưa rõ giá” in the
// buying sheet and the meal editor, never $0.00), C15 (discount lines are not “chưa đối ứng”), C16 (whole counted amounts in
// the buying sheet), C20 (weighing a pack clears “ước tính”). Every check failed before the fix. Runs in VI and EN, with the
// device in Sydney and in Ho Chi Minh City, at 320/375/820/1280 in light and dark; ends with validImport and a sync merge.
// Screenshots: docs/reviews/v1.7.19/amounts-validators-sync (Chromium viewport simulation, not physical devices).
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const DIST=path.resolve('dist'),origin='https://kitchen.test',shots='docs/reviews/v1.7.19/amounts-validators-sync';fs.mkdirSync(shots,{recursive:true});
const mime:any={'.js':'application/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'};
const SIZES:any[]=[['narrow',{width:320,height:740}],['mobile',{width:375,height:812}],['tablet',{width:820,height:1100}],['desktop',{width:1280,height:800}]];
async function openApp(browser:any,{viewport,lang,tz,scheme}:any){
 const context=await browser.newContext({locale:'vi-VN',viewport,serviceWorkers:'block',reducedMotion:'reduce',timezoneId:tz,colorScheme:scheme});
 await context.addInitScript(({lang}:any)=>{if(sessionStorage.getItem('qa-init'))return;sessionStorage.setItem('qa-init','1');localStorage.setItem('guest/bep-language',lang);localStorage.setItem('bep-local-locked','yes')},{lang});
 const page=await context.newPage();const errors:string[]=[];page.on('pageerror',(e:any)=>errors.push(e.message));
 await page.route(origin+'/**',async(r:any)=>{const u=new URL(r.request().url());if(u.pathname.startsWith('/.netlify/'))return r.fulfill({status:401,json:{error:'no'}});const f=path.resolve(DIST,u.pathname==='/'?'index.html':u.pathname.slice(1));try{await r.fulfill({contentType:mime[path.extname(f)]||'application/octet-stream',body:fs.readFileSync(f)})}catch{await r.fulfill({status:404,body:'Not found'})}});
 await page.route(/^https?:\/\/(?!kitchen\.test)/,(r:any)=>r.abort());
 await page.goto(origin+'/#shopping',{waitUntil:'domcontentloaded'});
 for(let i=0;;i++){try{await page.waitForFunction(()=>typeof render==='function'&&typeof state==='object'&&document.querySelector('#main h1'),null,{timeout:20000});break}catch(e){if(i>3)throw e;await page.waitForTimeout(700)}}
 // synthetic family data: a family recipe with a rooster, an unpriced ingredient, a receipt with a discount line, a pack lot
 await page.evaluate(()=>{const g:any=globalThis;state.preferences.onboardingComplete=true;state.ingredientCatalog={...(state.ingredientCatalog||{}),'family-ing-ga-trong':{name:'Gà trống',unit:'con',group:'meat'}};hydrateFamilyIngredients(state);
  const unpriced=Object.keys(INGREDIENTS).find(k=>!(seedPrices[k]>0)&&INGREDIENTS[k][1]==='g'&&!/^family-ing/.test(k));g.qaUnpriced=unpriced;
  const [start]=shopDates(),w=currentWeek(),d=Object.keys(w.days).find((x:string)=>x>=start)||Object.keys(w.days)[0];g.qaDay=d;
  w.days[d].dinner.recipes=[{id:'fam-ga',name:'Gà luộc',category:'main',protein:'chicken',time:30,prep:'',steps:[],servings:4,yield:4,custom:true,origin:'family',purposes:[],missingIngredients:[],ingredients:[{id:'family-ing-ga-trong',qty:1},{id:unpriced,qty:300}]},{id:'fam-rau',name:'Rau luộc',category:'veg',protein:'plant',time:10,prep:'',steps:[],servings:4,yield:4,custom:true,origin:'family',purposes:[],missingIngredients:[],ingredients:[{id:'spinach',qty:300}]}];w.days[d].dinner.servings=null;
  state.receipts=(state.receipts||[]).filter((r:any)=>!/^rc-qa/.test(r.id));const now=new Date().toISOString();
  state.receipts.push({currency:currentCurrency(state),id:'rc-qa-unit',store:'Coles',date:sydneyDate(),total:12,items:[{id:'it1',label:'CHICKEN THIGH',total:12,ingredient:'chicken',recipe:null,kind:'matched',quantity:null,enteredQty:2,enteredUnit:''}],createdAt:now,updatedAt:now,hasPhoto:false,raw:''});
  state.receipts.push({currency:currentCurrency(state),id:'rc-qa-disc',store:'Costco',date:sydneyDate(),total:27.29,items:[{id:'d1',label:'PORK',total:100,ingredient:'pork',recipe:null,kind:'matched',quantity:1000,enteredQty:1,enteredUnit:'kg',lineKind:'item'},{id:'d2',label:'Redeem rewards',total:-72.71,ingredient:null,recipe:null,kind:'pending',quantity:null,lineKind:'discount'}],createdAt:now,updatedAt:now,hasPhoto:false,raw:''});
  state.pantry=state.pantry.filter((p:any)=>p.id!=='lot-qa');state.pantry.push({id:'lot-qa',ingredient:'spinach',qty:200,qtyEstimated:true,place:'fridge',expiry:'',purchase:{unit:'túi',amount:1,basePerUnit:null,pricePerUnit:null}});
  (globalThis as any).shopRange='week';g.qaBase=JSON.parse(JSON.stringify(state));save();render()});
 return {context,page,errors,E:(s:any,a?:any)=>page.evaluate(s,a)};
}
const overflow=(page:any)=>page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);
(async()=>{const browser=await chromium.launch(process.env.BEP_CHROMIUM?{executablePath:process.env.BEP_CHROMIUM}:{});let checks=0;const ok=(x:any,n:string)=>{assert.ok(x,n);checks++};
 // ---------------- behaviour, VI and EN, device in Sydney and in Ho Chi Minh City
 for(const [lang,tz] of [['vi','Australia/Sydney'],['en','Asia/Ho_Chi_Minh']]){const {context,page,errors,E}=await openApp(browser,{viewport:{width:375,height:812},lang,tz,scheme:'light'});const T=(vi:string,en:string)=>lang==='en'?en:vi;
  // C1: Đi chợ shows the rooster as 1 con
  const ga=await E(()=>{const [s,e]=shopDates();const r=shopping(state,currentWeek(),s,e).find((x:any)=>x.id==='family-ing-ga-trong');return r&&{needed:r.needed,qty:r.qty}});ok(ga&&ga.needed===1&&ga.qty===1,`C1 ${lang}: list needs 1 con, got ${JSON.stringify(ga)}`);
  const gaRow=await E(()=>[...document.querySelectorAll('#main .shop-row, #main li, #main [data-id]')].map((x:any)=>x.textContent.replace(/\s+/g,' ')).find((t:string)=>/Gà trống/.test(t))||'');ok(new RegExp('(^|[^\\d.,])1 '+T('con','whole')).test(gaRow)&&!/0[.,]79/.test(gaRow),`C1 ${lang}: row text “${gaRow.slice(0,80)}”`);
  // C16 + C12: buying sheet — counted unit steps by 1; an unpriced ingredient is “Chưa rõ giá”
  await E(()=>openPurchasePicker('family-ing-ga-trong'));await page.waitForSelector('#weight-exact');ok(await page.locator('#weight-exact').getAttribute('step')==='1',`C16 ${lang}: whole con`);await E(()=>closeModal());
  await E(()=>openPurchasePicker((globalThis as any).qaUnpriced));await page.waitForSelector('#purchase-chosen-cost');const cost=(await page.locator('#purchase-chosen-cost').textContent()).trim();ok(cost===T('Chưa rõ giá','Price unknown'),`C12 ${lang}: sheet cost “${cost}”`);
  if(lang==='vi')await page.screenshot({path:`${shots}/buying-sheet-unpriced-vi-375x812.png`});await E(()=>closeModal());
  // C12: meal editor dish costs
  await E(()=>editMeal((globalThis as any).qaDay,'dinner'));await page.waitForSelector('.meal-editor-name small');const dishCosts=await E(()=>[...document.querySelectorAll('.meal-editor-name small')].map((x:any)=>x.textContent));
  ok(dishCosts[0].includes(T('Chưa rõ giá','Price unknown'))&&!/\$0[.,]00/.test(dishCosts[0]),`C12 ${lang}: dish cost “${dishCosts[0]}”`);ok(/\$\d/.test(dishCosts[1]),`C12 ${lang}: priced dish keeps its cost “${dishCosts[1]}”`);
  if(lang==='vi')await page.screenshot({path:`${shots}/meal-editor-unpriced-vi-375x812.png`});await E(()=>closeModal());
  // C15: a discount line is not “chưa đối ứng”
  await E(()=>{location.hash='expenses'});await page.waitForSelector('.receipt-card');const exp=await E(()=>{const cards=[...document.querySelectorAll('#main .stat-grid > .card')].map((c:any)=>c.textContent.replace(/\s+/g,' '));return{un:cards.find((t:string)=>/ĐỐI ỨNG|PHÂN BỔ|UNMATCHED|ALLOCAT/i.test(t))||'',costco:[...document.querySelectorAll('#main .receipt-card')].map((c:any)=>c.textContent.replace(/\s+/g,' ')).find((t:string)=>/Costco/.test(t))||''}});
  ok(/\$0[.,]00/.test(exp.un)&&!/72[.,]71/.test(exp.un),`C15 ${lang}: unallocated “${exp.un}”`);ok(/(\b0 chưa đối ứng|\b0 not matched)/.test(exp.costco),`C15 ${lang}: receipt card “${exp.costco}”`);
  // C6: open and save the receipt with an unknown unit
  const before=await E(()=>priceFor(state,'chicken'));await E(()=>openReceipt('rc-qa-unit'));/* v1.7.19: the unit is the shared picker's hidden value + button */await page.waitForSelector('.receipt-line .receipt-unit',{state:'attached'});
  ok(await page.locator('.receipt-line .receipt-unit').first().inputValue()==='',`C6 ${lang}: unit stays unknown`);ok(await page.locator('.receipt-line .receipt-qty').first().inputValue()==='2',`C6 ${lang}: amount kept`);
  await E(()=>saveReceipt(true));await page.waitForTimeout(400);const line=await E(()=>state.receipts.find((r:any)=>r.id==='rc-qa-unit').items[0]);ok(line.quantity===null&&line.enteredUnit===''&&line.enteredQty===2,`C6 ${lang}: saved ${JSON.stringify(line)}`);
  ok(await E(()=>priceFor(state,'chicken'))===before,`C6 ${lang}: chicken price unchanged`);if(await E(()=>!!document.querySelector('#modal-root .modal')))await E(()=>closeModal());
  // C20: weighing the pack clears the estimate
  await E(()=>stockForm('lot-qa'));await page.waitForSelector('#unit-stock-total');await page.fill('#unit-stock-total','350');await page.locator('[data-action="submit-form"][data-id="unit-stock-form"]').click();await page.waitForTimeout(300);
  const lot=await E(()=>{const p=state.pantry.find((x:any)=>x.id==='lot-qa');return{qty:p.qty,est:p.qtyEstimated,note:pantryBuyingNote(p)}});ok(lot.qty===350&&lot.est===undefined&&!/ước tính|estimated/.test(lot.note),`C20 ${lang}: ${JSON.stringify(lot)}`);
  // re-check 13 Nov 2026 (rule 32): “Nhập giá để dự toán” starts with no ingredient and refuses to save one nobody chose
  {const before=await E(()=>priceFor(state,'pork'));await E(()=>currencyModal());await page.waitForSelector('#ingredient-price-form');
   ok(await page.locator('#ingredient-price-form select[name="ingredient"]').inputValue()==='',`price form ${lang}: no ingredient chosen at first`);
   await page.fill('#ingredient-price-form input[name="price"]','0.02');await E(()=>(document.querySelector('#ingredient-price-form') as any).requestSubmit());await page.waitForTimeout(200);
   ok(await E(()=>priceFor(state,'pork'))===before,`price form ${lang}: nothing saved for an ingredient nobody chose`);if(await E(()=>!!document.querySelector('#modal-root .modal')))await E(()=>closeModal())}
  // re-check 13 Nov 2026 (audit S2): “Đánh dấu đã mua” marks the receipt's own menu week, not the week on screen
  {const r=await E(()=>{const g:any=globalThis,[start]=shopDates(),nextStart=addDays(planStartOf(state,start),7),cur=currentWeek(),nxt=planWeek(state,nextStart),dish=(id:string)=>({id,name:id,category:'main',protein:'pork',time:20,prep:'',steps:[],ingredients:[{id:'pork',qty:300}]});
    const d0=Object.keys(cur.days).find((x:string)=>x>=start)||Object.keys(cur.days)[0],d1=addDays(nextStart,2);cur.days[d0].lunch.recipes=[dish('qa-s2-a')];nxt.days[d1].lunch.recipes=[dish('qa-s2-b')];delete cur.bought?.pork;delete nxt.bought?.pork;save();
    newReceipt();closeModal();/* the draft is filled here, not through the sheet */const d:any=receiptDraft;d.date=addDays(nextStart,1);d.store='QA S2';d.total=9;d.markBought=true;d.currency=currentCurrency(state);d.items=[{id:'s2',label:'PORK MINCE',total:9,match:'pork',qty:500,unit:'g',confidence:'high'}];
    return saveReceipt(true).then(()=>({cur:+(currentWeek().bought?.pork||0),next:+(planWeek(state,nextStart).bought?.pork||0)}))});
   ok(r.next>0&&r.cur===0,`S2 ${lang}: marked in the receipt's week ${JSON.stringify(r)}`);if(await E(()=>!!document.querySelector('#modal-root .modal')))await E(()=>closeModal())}
  // re-check 13 Nov 2026 (receipt currency): a đồng receipt read in a dollar family is suggested as VND from the receipt itself (the
  // store, the amounts), with the reason; the family can change it, and the amounts stay as printed. A Coles receipt stays AUD.
  {const fam=await E(()=>currentCurrency(state));const prices=()=>page.locator('.receipt-line .receipt-price').evaluateAll((els:any[])=>els.map(e=>+e.value));
   for(const[text,want,why]of [['CO.OP MART\nTRUNG GA 10 QUA 35.000\nTHIT BA CHI 500G 125.000\nTONG CONG 160.000','VND',lang==='en'?/store name/:/tên cửa hàng/],['CHO BEN THANH\nCa hu 2 con 90000\nRau cai 15000\nTong cong 105000','VND',lang==='en'?/size of the amounts/:/cỡ các số tiền/],['COLES SUPERMARKETS\nBANANAS 3.50\nMILK 2L 3.10\nTOTAL $6.60','AUD',null]] as any[]){
    await E(()=>newReceipt());await page.waitForSelector('#receipt-raw');await page.fill('#receipt-raw',text);await page.locator('[data-feature="receipt-parse"]').click();await page.waitForTimeout(250);
    ok(await page.locator('#receipt-currency').inputValue()===want,`currency ${lang}: ${text.split('\n')[0]} → ${await page.locator('#receipt-currency').inputValue()}`);
    const hint=(await page.locator('#receipt-currency-hint').innerText()).trim();if(want!==fam){ok(why.test(hint)&&hint.includes(want)&&hint.includes(fam),`currency ${lang}: hint says why and that it is not the family's: “${hint}”`)}else ok(!/không cộng|not added/.test(hint),`currency ${lang}: no warning for the family's currency: “${hint}”`);
    ok((await page.locator('#receipt-total-currency').innerText()).trim()===want,`currency ${lang}: total label`);
    if(want==='VND'){const before=await prices();ok(before.includes(text.includes('35.000')?35000:90000),`currency ${lang}: đồng amounts read whole ${JSON.stringify(before)}`);
     await page.selectOption('#receipt-currency','AUD');await page.waitForTimeout(100);ok((await page.locator('#receipt-total-currency').innerText()).trim()==='AUD',`currency ${lang}: label follows the choice`);
     ok(JSON.stringify(await prices())===JSON.stringify(before),`currency ${lang}: changing the currency converts nothing`);
     await page.selectOption('#receipt-currency','VND');await page.waitForTimeout(100);
     const saved=await E(()=>{const id=receiptDraft.id;return saveReceipt(true).then(()=>{const r=state.receipts.find((x:any)=>x.id===id);return r?{cur:r.currency,total:r.total}:null})});
     ok(saved&&saved.cur==='VND'&&saved.total===(text.includes('35.000')?160000:105000),`currency ${lang}: saved as VND, total as printed ${JSON.stringify(saved)}`);
     ok(await E(()=>validImport(JSON.parse(JSON.stringify(state)))),`currency ${lang}: state with a VND receipt is valid`)}
    if(await E(()=>!!document.querySelector('#modal-root .modal')))await E(()=>closeModal())}}
  // Henry, 13 Nov 2026 (Orange Supermarket photo): receipt photo reading is marked Beta, and the crop frame keeps the items between
  // the receipt's head and the first item the quick pass recognised
  {await E(()=>{newReceipt()});await page.waitForSelector('#modal-root .receipt-beta');const beta=await page.locator('#modal-root .receipt-beta').innerText();
   ok(/Beta/.test(beta)&&(lang==='vi'?/thử nghiệm/.test(beta):/testing/.test(beta)),`beta ${lang}: the receipt sheet says reading photos is in testing (${beta})`);await E(()=>closeModal());
   const fr=await E(()=>{const L=(t:string,i:number)=>({t,y0:100+i*40,y1:130+i*40,x0:50,x1:500});const lines=['Orange Supermarke Wolli Creek','ABN: 13 601 298 917','TAX INVOICE','Date: 13/11/2026 No: P2611130238','LARGE SEEDLESS WATERMELON','2.430kg @ $2.99/kg $7.27','HK CHOY SUM / BUNCH $1.99','CARROT LOOSE $0.70','PRAWN WONTON 900G $18.99','TOTAL: $61.77'].map(L);
    return (globalThis as any).ReceiptUI.itemFrame(lines,[7,8],600,1000)});
   ok(fr&&fr.t<=(100+4*40)/1000+1e-9&&fr.b>=(130+9*40)/1000-1e-9,`crop frame ${lang}: from the first line after the head (watermelon) to TOTAL ${JSON.stringify(fr)}`);
   ok(fr.t>(100+3*40)/1000-0.02,`crop frame ${lang}: the head is not read as items ${JSON.stringify(fr)}`)}
  // round trip (rule 33): everything written loads, and merges
  ok(await E(()=>validImport(JSON.parse(JSON.stringify(state)))),`${lang}: state valid`);ok(await E(()=>{const g:any=globalThis;const r=mergeFamilyStates(g.qaBase,JSON.parse(JSON.stringify(state)),g.qaBase,{now:Date.now()});return validImport(JSON.parse(JSON.stringify(r.state)))&&r.state.pantry.find((p:any)=>p.id==='lot-qa')?.qty===350}),`${lang}: merged state valid and keeps the edit`);
  assert.deepEqual(errors,[],`${lang}: no page errors`);await context.close()}
 // ---------------- screens at every size, light and dark (changed UI: expenses card, buying sheet, meal editor)
 for(const [name,viewport] of SIZES)for(const scheme of ['light','dark']){const {context,page,errors,E}=await openApp(browser,{viewport,lang:'vi',tz:'Australia/Sydney',scheme});const tag=`${name}-${viewport.width}x${viewport.height}-${scheme}`;
  await E(()=>{location.hash='expenses'});await page.waitForSelector('.receipt-card');ok(!await overflow(page),`${tag}: expenses no sideways scroll`);await page.screenshot({path:`${shots}/expenses-${tag}.png`});
  await E(()=>openPurchasePicker((globalThis as any).qaUnpriced));await page.waitForSelector('#purchase-chosen-cost');ok((await page.locator('#purchase-chosen-cost').textContent()).trim()==='Chưa rõ giá',`${tag}: sheet`);ok(!await overflow(page),`${tag}: sheet no sideways scroll`);await page.screenshot({path:`${shots}/buying-sheet-${tag}.png`});await E(()=>closeModal());
  await E(()=>editMeal((globalThis as any).qaDay,'dinner'));await page.waitForSelector('.meal-editor-name small');ok(!await overflow(page),`${tag}: meal editor no sideways scroll`);await page.screenshot({path:`${shots}/meal-editor-${tag}.png`});await E(()=>closeModal());
  assert.deepEqual(errors,[],`${tag}: no page errors`);await context.close()}
 await browser.close();console.log(`PASS audit data browser: ${checks} checks (VI/EN, Sydney/Ho Chi Minh City, 4 sizes × light/dark)`);
})().catch(e=>{console.error(e);process.exit(1)});
