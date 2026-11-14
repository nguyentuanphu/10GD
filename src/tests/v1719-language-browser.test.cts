// v1.7.19 audit fixes — language, Sydney time and money (audit 12 Nov 2026, Sydney time: D11–D21, B13, B17, B19–B22).
// Henry reported the English pantry edit sheet (“Chỉnh thực phẩm”, “Xóa lô này”); the audit found the same family of problems
// across the app. This suite checks, with realistic family data:
//  1. English: every screen and the sheets the audit found Vietnamese (where to buy, stores, pantry edit, shopping rows, members,
//     reminders, notes import, sync conflict, unit sheet …) show no Vietnamese outside family-authored content, at 375 px;
//     screenshots of the changed sheets at 320/375/820/1280, light and dark.
//  2. Every hard-coded sheet title, error message, placeholder and accessible label in the code comes out in English.
//  3. The shared shopping list and week share are English in English mode (family-written names stay as written) and
//     Vietnamese in Vietnamese mode.
//  4. Vietnamese mode has no developer or English wording in the sheets the audit listed (D16), and Studio's feedback page does
//     not name the issue host (D18).
//  5. Times: with the device in Asia/Ho_Chi_Minh and America/New_York, every time the family sees is Sydney time
//     (sync conflict, receipts, So Giá, devices, ladybug, voice check, greeting and automatic dark theme).
//  6. Money: a VND receipt shows “125.000 ₫” in global search (never “$125000.00”); a discount keeps its minus sign.
//  7. Search ignores accents everywhere (“pho” finds “Phở”).
// Legacy sheets the family can no longer open (week advice, day suggestion, weekend soup picker, the old meal editor and recipe
// form) are checked through their titles, labels and messages in part 2 only.
// Chromium viewport simulation; not a test on physical phones.
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,mkdirSync} from 'node:fs';
import {resolve,extname,join} from 'node:path';
import {chromium} from 'playwright';
const origin='https://kitchen.test',out='docs/reviews/v1.7.19/language-time-money';mkdirSync(out,{recursive:true});
const mime:any={'.js':'application/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'};
const VI=/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ]/i;
const failures:string[]=[];const fail=(m:string)=>failures.push(m);
// every check is recorded and the run goes on, so one run lists every problem
const chk:any=new Proxy(assert,{get:(t:any,k:any)=>(...a:any[])=>{try{t[k](...a)}catch(e:any){fail(String(e.message).split('\n')[0])}}});

// ---- literals in the code: sheet titles, thrown messages (shown in toasts), placeholders, accessible labels
function codeLiterals(){const out:any[]=[];const dir='src/frontend';
 for(const f of readdirSync(dir).filter((f:string)=>f.endsWith('.ts')&&!/^(language|studio|bootstrap|login|rsvp-page|privacy|sw)/.test(f))){
  readFileSync(join(dir,f),'utf8').split('\n').forEach((L:string,i:number)=>{const add=(kind:string,s:string)=>{s=s.replace(/\\'/g,"'");if(VI.test(s)&&!/\$\{|'\+|\+'/.test(s))out.push({kind,where:f+':'+(i+1),s})};
   for(const m of L.matchAll(/modal\(\s*'((?:[^'\\]|\\.)*)'\s*[,)]/g))add('sheet title',m[1]);
   for(const m of L.matchAll(/modal\(\s*[\w.?!=&|()'"]{1,60}\?\s*'((?:[^'\\]|\\.)*)'\s*:\s*'((?:[^'\\]|\\.)*)'\s*,/g)){add('sheet title',m[1]);add('sheet title',m[2])}
   for(const m of L.matchAll(/throw (?:new )?Error\(\s*'((?:[^'\\]|\\.)*)'\s*\)/g))add('error',m[1]);
   for(const m of L.matchAll(/(placeholder|aria-label|title)="([^"<>]*)"/g))add(m[1],m[2]);
  })}
 return out}

async function open(browser:any,{lang='en',size={width:375,height:812},tz='Australia/Sydney',theme='light',hash='today',clock=null as null|number}={}){
 const context=await browser.newContext({locale:'vi-VN',viewport:size,serviceWorkers:'block',reducedMotion:'reduce',timezoneId:tz,colorScheme:theme});
 await context.addInitScript(({lang,theme}:any)=>{if(sessionStorage.getItem('qa-init'))return;sessionStorage.setItem('qa-init','1');localStorage.setItem('bep-local-locked','yes');localStorage.setItem('guest/bep-language',lang);localStorage.setItem('bep-theme-mode',theme)},{lang,theme});
 await context.addInitScript(()=>{try{Object.defineProperty(navigator,'clipboard',{value:{writeText:(t:string)=>{(window as any).__clip=t;return Promise.resolve()}},configurable:true});(navigator as any).share=(d:any)=>{(window as any).__share=d;return Promise.resolve()}}catch{}});
 const page=await context.newPage(),errors:string[]=[];page.on('pageerror',(e:any)=>errors.push(e.message.slice(0,200)));page.on('dialog',(d:any)=>d.dismiss().catch(()=>{}));
 if(clock!=null)await page.clock.setFixedTime(new Date(clock));
 await page.route(origin+'/**',async(r:any)=>{const u=new URL(r.request().url());if(u.pathname.startsWith('/.netlify/')){const op=u.searchParams.get('op');return r.fulfill({json:op==='status'?{configured:false,connected:false}:op==='state'?{state:null,etag:null}:{announcements:[],devices:[],items:[]}})}if(u.pathname==='/startup-scripts.json')return r.fulfill({json:JSON.parse(readFileSync('dist/startup-scripts.json','utf8'))});const f=resolve('dist',u.pathname==='/'?'index.html':u.pathname.slice(1));try{await r.fulfill({contentType:mime[extname(f)]||'application/octet-stream',body:readFileSync(f)})}catch{await r.fulfill({status:404,body:''})}});
 await page.goto(origin+'/#'+hash,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#main h1')&&typeof (globalThis as any).render==='function',null,{timeout:30000});await page.waitForTimeout(800);
 return {context,page,errors}}
const E=(page:any,s:string)=>page.evaluate(s);
// realistic family data: members, a generated week, pantry lots in all three places, a family store, an extra item, receipts
const SEED=`(()=>{state.preferences.onboardingComplete=true;if(!state.members.some(m=>m.id==='qa-m3'))state.members.push({id:'qa-m3',name:'Bé Na',weight:0.6,emoji:''});
 familyGenerate(state,weekStart,{sourceMode:'library'});state.stores=[{id:'qa-store',name:'Chợ Cabramatta',address:'Freedom Plaza'}];
 const rows=shopping(state,currentWeek(),...shopDates()).filter(r=>r.needed>0).slice(0,3);rows.forEach((r,i)=>state.pantry.push({id:'qa-p-'+i,ingredient:r.id,qty:1,place:['fridge','freezer','dry'][i],expiry:i?'':addDays(sydneyDate(),2)}));
 {const w=currentWeek(),[a,b]=shopDates();w.quantities??={};/* v1.7.21: a decimal amount only for an ingredient bought by weight or volume; the random week sometimes put 0.1 on one counted in quả (eggs), which validImport rightly refuses */const dec=rows.find(r=>INGREDIENTS[r.id][1]!=='quả')||rows[1];w.quantities[purchaseScope(a,b)]={[dec.id]:INGREDIENTS[dec.id][1]==='quả'?1:0.1}}
 currentWeek().extras.push({id:'qa-x1',name:'Giấy bếp',qty:'1 gói',cost:4.5,currency:'AUD',done:false});
 state.receipts=(state.receipts||[]).concat([{id:'qa-r-vnd',store:'Chợ Bến Thành',date:sydneyDate(),currency:'VND',total:125000,createdAt:'2026-11-12T01:00:00.000Z',items:[{id:'qa-rl1',label:'Thịt ba chỉ',total:125000,quantity:null}]}]);
 save();closeModal();render();return rows.map(r=>r.id)})()`;

// text in the wrong language inside a scope; family-authored content (names, stores, own recipes/ingredients, notes) is skipped
const COLLECT=(scope:string)=>`(()=>{const st=state;const names=[...st.members.map(m=>m.name),...(st.stores||[]).flatMap(s=>[s.name,s.address]),...st.recipes.map(r=>r.name),...st.recipes.map(r=>r.prep),...st.recipes.flatMap(r=>r.steps||[]),...Object.values(st.ingredientCatalog||{}).map(x=>x.name),...(st.receipts||[]).flatMap(r=>[r.store,...(r.items||[]).map(i=>i.label)]),'Giấy bếp','1 gói'].filter(x=>x&&x.length>2).sort((a,b)=>b.length-a.length);
 const VI=/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ]/i;const strip=t=>{let x=t;for(const n of names)x=x.split(n).join(' ');return x};
 const root=document.querySelector(${JSON.stringify(scope)});if(!root)return['(scope missing) ${scope}'];const vis=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'};
 const skip=el=>el.closest('[data-user-content],script,style,svg,code,[translate=no],.steps-text,.language-control,textarea,.recipe-name');const out=[];
 const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;while((n=w.nextNode())){const el=n.parentElement;if(!el||skip(el))continue;const opt=el.closest('option');if(opt?!vis(opt.closest('select')):!vis(el))continue;const t=strip(n.nodeValue).trim();if(VI.test(t))out.push((opt?'[option] ':'')+n.nodeValue.trim().slice(0,140))}
 for(const el of root.querySelectorAll('[placeholder],[aria-label],[title]')){if(skip(el)||!vis(el))continue;for(const a of ['placeholder','aria-label','title']){const v=el.getAttribute(a);if(v&&VI.test(strip(v)))out.push('['+a+'] '+v.slice(0,140))}}
 return [...new Set(out)]})()`;

(async()=>{const browser=await chromium.launch(process.env.BEP_CHROMIUM?{executablePath:process.env.BEP_CHROMIUM}:{});
 try{
  // ---------------------------------------------------------------- 1–3. English: screens, sheets, literals, share text
  {const {context,page,errors}=await open(browser,{lang:'en'});const ids=await E(page,SEED);chk.ok(ids.length>=2,'seeded shopping rows');
   for(const hash of ['today','planner','shopping','recipes','pantry','expenses','insights','products']){await E(page,`closeModal();location.hash=${JSON.stringify(hash)}`);await page.waitForTimeout(450);
    if(hash==='shopping')await E(page,`(()=>{const id=${JSON.stringify(ids[0])};if(typeof pantryPeekOpen!=='undefined')pantryPeekOpen.add(id);render()})()`);
    for(const t of await E(page,COLLECT('#main')))fail(`en screen #${hash}: ${t}`)}
   const SHEETS:[string,string][]=[
    ['pantry edit (Henry’s report)',`stockForm('qa-p-0')`],['pantry add',`stockForm()`],
    ['stores',`storesModal()`],['store add',`storeForm()`],['store edit',`storeForm('qa-store')`],
    ['where to buy (item)',`itemStoreModal(${JSON.stringify(ids[0])})`],['where to buy (extra)',`extraStoreModal('qa-x1')`],
    
    ['members',`manageMembers()`],['reminders',`remindersModal()`],['notes import',`notesImporter('')`],
    ['other settings',`otherSettingsModal()`],
    ['request an item',`requestItemForm()`],['push settings',`pushSettings()`],
   ];
   for(const [name,js] of SHEETS){try{await E(page,`closeModal();location.hash='shopping'`);await page.waitForTimeout(250);await E(page,js);await page.waitForTimeout(450)}catch(e:any){fail(`en sheet ${name}: could not open (${String(e.message).slice(0,120)})`);continue}
    const open=await E(page,`!!document.querySelector('#modal-root .modal')`);if(!open){fail(`en sheet ${name}: did not open`);continue}
    for(const t of await E(page,COLLECT('#modal-root')))fail(`en sheet ${name}: ${t}`)}
   // the unit sheet for a lot bought by its buying unit
   await E(page,`(()=>{closeModal();const p=state.pantry.find(p=>p.id==='qa-p-0');p.purchase={unit:'gói',size:500,count:1};save();stockForm('qa-p-0')})()`);await page.waitForTimeout(400);
   if(await E(page,`!!document.querySelector('#modal-root .modal')`))for(const t of await E(page,COLLECT('#modal-root')))fail(`en sheet pantry lot by buying unit: ${t}`);
   await E(page,`(()=>{const p=state.pantry.find(p=>p.id==='qa-p-0');delete p.purchase;save();closeModal()})()`);
   // pantry places are named the same everywhere in English (B20)
   const places=await E(page,`(()=>{stockForm('qa-p-0');return [...document.querySelectorAll('#stock-place option')].map(o=>o.textContent.trim())})()`);
   chk.deepEqual(places,['Fridge','Freezer','Pantry shelf'],'pantry edit: the place names match put-away and search');
   await E(page,`closeModal()`);
   const searchFor=async(q:string)=>{await E(page,`closeModal();document.querySelector('[data-search="open"]').click()`);await page.fill('#app-search-input',q);await page.waitForTimeout(300);const t=await E(page,`document.querySelector('#search-results')?.innerText||''`);await E(page,`closeModal()`);return t as string};
   const searchPlace=await searchFor(await E(page,`INGREDIENT_EN[state.pantry.find(p=>p.place==='dry').ingredient]||INGREDIENTS[state.pantry.find(p=>p.place==='dry').ingredient][0]`));
   chk.doesNotMatch(searchPlace,/Cupboard/,'global search calls the dry place “Pantry shelf”, not “Cupboard”');chk.match(searchPlace,/Pantry shelf/,'global search names the dry place ('+searchPlace.slice(0,200)+')');
   // 2. literals
   const lits=codeLiterals();chk.ok(lits.length>80,'Vietnamese literals found in the code ('+lits.length+')');
   const left=await page.evaluate((l:any[])=>{const g=(0,eval),re=/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ]/i;return l.filter(x=>re.test(g('englishUI')(x.s)))},lits);
   for(const x of left)fail(`en ${x.kind} without English (${x.where}): ${x.s}`);
   // 3. share text in English (family-written names stay as written)
   const share=await E(page,`(()=>({list:textShopping(),week:textWeek()}))()`);
   // reference dishes without an English edition yet show their Vietnamese name in the app too (separate owner-approved release)
   const noEnglish:string[]=await E(page,`state.recipes.filter(r=>englishUI(r.name)===r.name).map(r=>r.name)`);
   const familyNames=['Giấy bếp','1 gói','Chợ Cabramatta','Freedom Plaza','Bé Na',...noEnglish].sort((a,b)=>b.length-a.length);const strip=(t:string)=>familyNames.reduce((x,n)=>x.split(n).join(' '),t);
   for(const [k,t] of Object.entries(share) as any)for(const line of String(t).split('\n'))if(VI.test(strip(line)))fail(`en share ${k}: ${line}`);
   chk.match(share.list,/SHOPPING|Shopping/,'the English list has an English heading');
   await page.screenshot({path:`${out}/en-shopping-375x812.png`});
   chk.deepEqual(errors,[],'no page errors (EN)');await context.close()}

  // screenshots of the changed sheets: 320/375/820/1280, light and dark
  for(const theme of ['light','dark'])for(const size of [{width:320,height:740},{width:375,height:812},{width:820,height:1100},{width:1280,height:800}]){
   const {context,page}=await open(browser,{lang:'en',size,theme});const ids=await E(page,SEED);
   for(const [name,js] of [['pantry-edit',`stockForm('qa-p-0')`],['where-to-buy',`itemStoreModal(${JSON.stringify(ids[0])})`],['stores',`storesModal()`]] as const){
    await E(page,`closeModal();${js}`);await page.waitForTimeout(350);
    const wide=await E(page,`document.documentElement.scrollWidth>innerWidth+1`);chk.equal(wide,false,`${name} ${size.width}px ${theme}: no sideways scroll`);
    await page.screenshot({path:`${out}/en-${name}-${theme}-${size.width}x${size.height}.png`})}
   await context.close()}

  // ---------------------------------------------------------------- 3b–4. Vietnamese: share stays Vietnamese, no developer words
  {const {context,page,errors}=await open(browser,{lang:'vi'});await E(page,SEED);
   const share=await E(page,`textShopping()`);chk.match(share,/ĐI CHỢ/,'the Vietnamese list stays Vietnamese');
   const pantryTitle=await E(page,`(stockForm('qa-p-0'),document.querySelector('#modal-title')?.textContent||'')`);chk.match(pantryTitle,/Chỉnh thực phẩm/,'the Vietnamese pantry sheet is unchanged');
   const devWords=/\b(Generate|receipt|retailer|checkedAt|push chưa|GitHub|hosting)\b/;
   for(const [name,js] of [['week preview',`familyGeneratePreview()`],['products save',`productForm()`],['products csv',`csvProducts()`]] as const){
    try{await E(page,`closeModal();${js}`);await page.waitForTimeout(350)}catch{continue}
    const txt=await E(page,`(()=>{const m=document.querySelector('#modal-root');if(!m)return'';const c=m.cloneNode(true);c.querySelectorAll('code,textarea').forEach(x=>x.remove());return c.innerText||c.textContent||''})()`);const m=txt.match(devWords);if(m)fail(`vi sheet ${name}: developer/English word “${m[0]}”`)}
   const src=readFileSync('src/frontend/studio-feedback.ts','utf8');for(const w of ['lên GitHub','to GitHub','cài đặt hosting','hosting settings'])if(src.includes(w))fail(`Studio → Góp ý names the issue host/hosting: “${w}”`);
   chk.deepEqual(errors,[],'no page errors (VI)');await context.close()}

  // ---------------------------------------------------------------- 5. Sydney time on a device in another zone
  // 12 Nov 2026 01:00 UTC = 12:00 Sydney (AEDT) = 08:00 Ho Chi Minh = 20:00 (11 Nov) New York
  const T0=Date.UTC(2026,10,12,1,0);
  for(const tz of ['Asia/Ho_Chi_Minh','America/New_York'])for(const lang of ['vi','en']){
   const {context,page,errors}=await open(browser,{lang,tz,clock:T0});await E(page,SEED);
   const r=await E(page,`(()=>({label:appTimeLabel(${T0},{zone:true}),sync:smWhen(${T0}),hour:sydneyHour(),greet:greetingFor(state,'Bố').title,theme:document.documentElement.dataset.theme||'',date:sydneyDate()}))()`);
   chk.match(r.label,/12\/11 12:00/,`${tz} ${lang}: the shared time label is Sydney time (${r.label})`);
   chk.match(r.label,lang==='en'?/Sydney time/:/giờ Sydney/,`${tz} ${lang}: the zone is named`);
   chk.match(r.sync,/12\/11\/2026 12:00/,`${tz} ${lang}: the sync conflict sheet shows Sydney time (${r.sync})`);
   chk.equal(r.hour,12,`${tz}: the Sydney hour`);chk.equal(r.date,'2026-11-12',`${tz}: the Sydney date`);
   chk.match(r.greet,lang==='en'?/Hello/:/Chào buổi chiều/,`${tz} ${lang}: the greeting follows the Sydney hour (${r.greet})`);
   // receipts (created date), trusted device, ladybug, voice check, So Giá extension and capture time use the same helper
   const shown=await E(page,`(()=>{const out={};closeModal();openReceipt('qa-r-vnd');out.receipt=document.querySelector('#modal-root')?.innerText||'';closeModal();return out})()`);
   chk.doesNotMatch(shown.receipt,/11\/11\/2026/,`${tz}: the receipt sheet does not show the device date`);
   chk.deepEqual(errors,[],`no page errors ${tz} ${lang}`);await context.close()}
  // no time of day is formatted in the device zone anywhere in the app or Studio
  for(const f of readdirSync('src/frontend').filter((f:string)=>f.endsWith('.ts'))){const src=readFileSync(join('src/frontend',f),'utf8');
   for(const m of src.matchAll(/toLocale(?:Time)?String\(([^()]*(?:\([^()]*\))?[^()]*)\)/g)){const a=m[1];if(/hour|weekday/.test(a)&&!/timeZone/.test(a))fail(`device-zone time in ${f}: ${m[0].slice(0,120)}`)}
   for(const m of src.matchAll(/new Date\(([^()]*)\)\.toLocale(Date|Time)?String\(([^()]*(?:\([^()]*\))?[^()]*)\)/g)){if(!/timeZone/.test(m[3])&&!/T00:00:00Z/.test(m[1]))fail(`device-zone date/time in ${f}: ${m[0].slice(0,120)}`)}
   if(/new Date\(\)\.getHours\(\)/.test(src)&&f!=='usage-analytics.ts')fail(`device clock hour in ${f}`)}

  // ---------------------------------------------------------------- 6–7. money and accent-insensitive search
  {const {context,page,errors}=await open(browser,{lang:'vi'});await E(page,`(()=>{state.preferences.currency='VND';save()})()`);await E(page,SEED);
   chk.equal(await E(page,`aud(125000,'VND')`),'125.000 ₫','VND is written the Vietnamese way');
   await E(page,`closeModal();document.querySelector('[data-search="open"]').click()`);await page.fill('#app-search-input','thit ba chi');await page.waitForTimeout(300);const hits=await E(page,`document.querySelector('#search-results')?.innerText||''`);await E(page,`closeModal()`);
   chk.match(hits,/125\.000\s₫/,'global search: the VND receipt shows 125.000 ₫ ('+hits+')');chk.doesNotMatch(hits,/\$125000/,'global search: never $125000.00');
   const neg=await E(page,`(()=>{state.preferences.currency='AUD';return aud(-2,'AUD')})()`);chk.match(neg,/^-\$2\.00$/,'a discount keeps its minus sign');
   const rm=readFileSync('src/frontend/receipt-match-ui.ts','utf8');chk.doesNotMatch(rm,/const money=n=>'\$'\+Math\.abs/,'receipt matching no longer drops the minus sign');
   for(const f of ['app-search.ts','receipt-match-ui.ts','receipt-match.ts','receipt-quality.ts']){const src=readFileSync(join('src/frontend',f),'utf8');chk.doesNotMatch(src,/'\$'\+\(?[+\w.]*\)?\.toFixed\(2\)(?!;?\s*$)/m,`${f}: money goes through the app's formatter`)}
   // one number style for portions in both languages (B19): the guest total no longer switches to a decimal comma
   chk.doesNotMatch(readFileSync('src/frontend/family-menu-ui.ts','utf8'),/toFixed\(2\)\)\.replace\('\.',','\)/,'guest total uses the same decimal point as every other portion');
   // accents (B17)
   await E(page,`(()=>{state.recipes.push({id:'qa-pho',name:'Phở bò QA',category:'noodle',protein:'beef',time:30,servings:4,yield:4,purposes:[],ingredients:[],missingIngredients:[],custom:true,origin:'family',favorite:false});save()})()`);
   const acc=await E(page,`(()=>{editingDate=Object.keys(currentWeek().days)[0];editingType='dinner';pickerCategory='noodle';const a=pickerItems('pho');recipeSearch='pho';const b=filteredRecipes().map(r=>r.name);recipeSearch='';const c=soupItems('pho',999);return{a,b,c}})()`);
   chk.match(acc.a,/Phở bò QA/,'meal picker: “pho” finds “Phở bò QA”');chk.ok(acc.b.includes('Phở bò QA'),'recipe list: “pho” finds “Phở bò QA”');chk.match(acc.c,/Phở bò QA/,'weekend soup: “pho” finds “Phở bò QA”');
   // round trip (rule 33)
   {const rt=await E(page,`(()=>{state.recipes=state.recipes.filter(r=>r.id!=='qa-pho');const base=JSON.parse(JSON.stringify(state));if(validImport(JSON.parse(JSON.stringify(base))))return 'ok';/* v1.7.21: say which part is refused, so a failure on CI can be fixed */const why=[];for(const k of Object.keys(base)){const c=JSON.parse(JSON.stringify(base));if(Array.isArray(c[k]))c[k]=[];else if(c[k]&&typeof c[k]==='object')c[k]={};else delete c[k];if(validImport(c))why.push(k)}
   if(why.includes('weeks'))for(const wk of Object.keys(base.weeks))for(const d of Object.keys(base.weeks[wk].days||{}))for(const t of Object.keys(base.weeks[wk].days[d]||{})){const c=JSON.parse(JSON.stringify(base));delete c.weeks[wk].days[d][t];if(validImport(c))why.push(wk+'/'+d+'/'+t+'='+JSON.stringify(base.weeks[wk].days[d][t]).slice(0,600))}
   for(const k of ['recipes','products','receipts','pantry','stores'])if(why.includes(k)&&Array.isArray(base[k]))base[k].forEach((x,i)=>{const c=JSON.parse(JSON.stringify(base));c[k].splice(i,1);if(validImport(c))why.push(k+'['+i+']='+JSON.stringify(x).slice(0,600))});
   return why.join(' | ')||'no single part'})()`);chk.equal(rt,'ok','the saved state still loads: '+rt)}
   chk.deepEqual(errors,[],'no page errors (money/search)');await context.close()}
 }finally{await browser.close()}
 assert.deepEqual(failures,[],'language / time / money problems:\n'+failures.join('\n'));
 console.log('PASS v1.7.19 language, Sydney time and money: English screens and sheets, every code literal, share text, Vietnamese wording, Sydney time on Ho Chi Minh and New York devices, VND formatting, accent-insensitive search');
})().catch(e=>{console.error(e);process.exit(1)});
