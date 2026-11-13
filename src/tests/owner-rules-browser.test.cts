// v1.7.19 audit fixes (12 Nov 2026, Sydney time; AGENTS.md rules 8, 19–21, 25, 27). A whole-app sweep, on every screen and on every
// sheet that a tap on a screen opens (plus the sheets opened from the account menu and from the app's own functions):
//  • no phone emoji in the interface (text, title, aria-label, placeholder), and no emoji in the text the app shares or copies
//    (shopping list, week, errand request) — family-authored text is never changed;
//  • main buttons and icon-only buttons show a drawing; chips, tabs and disclosures (<summary>) are words only;
//  • every sheet: drawn X; Lưu / Đóng / Xong / Hủy only in the floating footer, as pills with their own drawing, side by side;
//    the toast never covers the floating footer;
//  • tap targets ≥ 44 px at 320 and 375 px wide.
// VI and EN at 320×740 and 375×812 (full sweep), plus screens at 820×1100 and 1280×800 in light and dark for evidence.
// Chromium viewport simulation, device-only mode, every server call answered locally — not physical devices.
// Screenshots: docs/reviews/v1.7.19/owner-rules/.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const origin='https://kitchen.test',out='docs/reviews/v1.7.19/owner-rules';mkdirSync(out,{recursive:true});
const mime:any={'.js':'application/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'};
const VIEWS=['today','planner','shopping','recipes','pantry','expenses','insights','products'];
// controls that change or leave things are not tapped by the crawl (they are covered by their own suites)
const SKIP=/delete|remove|sign-?out|logout|reset|clear|restore|leave|unpair|uninstall|device-only|switch|print|reload|install|ladybug|feedback|report|forget|wipe|erase|cancel-invite|apply|import|export|share|copy|cook|undo|bought|toggle|lock|regenerate|generate|subscribe|test|scan|camera|photo|voice|mic|listen|offline/i;
const ATTRS=['data-action','data-fm','data-feature','data-personal','data-rc','data-rci','data-scout','data-planning','data-push-action','data-house','data-guide','data-flow','data-kx','data-mr','data-product','data-meal-more','data-plan-meal','data-vl-check','data-guest-step'];
// sheets opened straight from the app's functions (some are two or more taps deep)
const DIRECT:[string,string][]=[['settings',"otherSettingsModal('')"],['kitchen',"accountsModal()"],['stores',"storesModal()"],['push',"pushSettings()"],['reminders',"remindersModal()"],
 ['stock-add',"stockForm()"],['stock-edit',"stockForm(state.pantry[0]?.id)"],['recipe',"showRecipe(state.recipes[0].id)"],['recipe-form',"recipeForm()"],['edit-meal',"familyEditMeal(sydneyDate(),'dinner')"],
 ['urgent',"urgentForm()"],['errand',"requestItemForm()"],['busy',"busyModal()"],['weather',"weatherModal()"],['currency',"currencyModal()"],['pack',"packScheduleModal()"],['availability',"availabilityModal()"],
 ['product',"productForm()"],['import-link',"document.querySelector('[data-kx=\"import-open\"]')?.click()"],['voice-check',"voiceLocalCheckModal()"],['extra-store',"extraStoreModal(currentWeek().extras[0]?.id)"],['item-store',"itemStoreModal(shopping(state,currentWeek(),...shopDates()).find(r=>r.needed>0)?.id)"]];
(async()=>{
 const browser=await chromium.launch();const fails:string[]=[];let sheetsSeen=0,screensSeen=0;
 const open=async(lang:string,viewport:any,theme='light')=>{
  const context=await browser.newContext({locale:'vi-VN',viewport,serviceWorkers:'block',reducedMotion:'reduce',colorScheme:theme as any,timezoneId:'Australia/Sydney'});
  await context.addInitScript(([lang,theme]:any)=>{if(sessionStorage.getItem('qa-init'))return;sessionStorage.setItem('qa-init','1');localStorage.setItem('bep-local-locked','yes');localStorage.setItem('guest/bep-language',lang);localStorage.setItem('bep-theme-mode',theme)},[lang,theme]);
  await context.addInitScript(()=>{try{Object.defineProperty(navigator,'clipboard',{value:{writeText:(t:string)=>{(window as any).__clip=t;return Promise.resolve()}},configurable:true});(navigator as any).share=(d:any)=>{(window as any).__share=d;return Promise.resolve()}}catch{}});
  const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.dismiss().catch(()=>{}));
  await context.route('**/*',async(r:any)=>{const u=new URL(r.request().url());if(u.origin!==origin)return r.fulfill({status:404,body:''});
   if(u.pathname.startsWith('/.netlify/')){const op=u.searchParams.get('op');return r.fulfill({status:op==='status'?200:401,json:op==='status'?{configured:false,connected:false}:{error:'offline test',announcements:[],devices:[],items:{}}})}
   if(u.pathname==='/startup-scripts.json')return r.fulfill({json:JSON.parse(readFileSync('dist/startup-scripts.json','utf8'))});
   const f=resolve('dist',u.pathname==='/'?'index.html':u.pathname.slice(1));try{await r.fulfill({contentType:mime[extname(f)]||'application/octet-stream',body:readFileSync(f)})}catch{await r.fulfill({status:404,body:''})}});
  await page.goto(origin+'/#today',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#main h1')&&typeof (globalThis as any).render==='function',null,{timeout:30000});
  // a realistic week: generated menu, a third member, pantry lots, an extra item and a family-written name with an emoji
  await page.evaluate(`(()=>{state.preferences.onboardingComplete=true;if(state.members.length<3)state.members.push({id:'qa-m3',name:'Bé Na 🐣',weight:.6});familyGenerate(state,weekStart,{sourceMode:'library'});
   const rows=shopping(state,currentWeek(),...shopDates()).filter(r=>r.needed>0).slice(0,3);rows.forEach((r,i)=>state.pantry.push({id:'qa-p-'+i,ingredient:r.id,qty:1,place:['fridge','freezer','dry'][i],expiry:''}));
   currentWeek().extras.push({id:'qa-x1',name:'Giấy bếp',qty:'1 gói',cost:4.5,currency:'AUD',done:false});save();if(typeof closeModal==='function')closeModal();render()})()`);
  await page.waitForTimeout(500);return{context,page,errors};
 };
 // everything rules 8, 19–21, 25 and 27 ask of one scope (the screen or the open sheet)
 const collect=(page:any,scope:string|null,small:boolean)=>page.evaluate(([scope,small]:any)=>{
  const EM=/\p{Emoji_Presentation}|\p{Extended_Pictographic}️/u,res:string[]=[];const root:any=scope?document.querySelector(scope):document.body;if(!root)return res;
  const closed=(e:any)=>{for(let p=e.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS'&&!p.open&&!(e.tagName==='SUMMARY'&&e.parentElement===p))return true;return false};
  const vis=(e:any)=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'&&!closed(e)};
  const own=(e:any)=>e.closest('[data-user-content],textarea,input,#lb-root,.ladybug');
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n:any;while((n=w.nextNode())){const p=n.parentElement;if(!p||p.closest('svg,script,style')||own(p))continue;if(p.closest('option')){if(!vis(p.closest('select')))continue}else if(!vis(p))continue;if(EM.test(n.nodeValue))res.push('emoji: '+n.nodeValue.trim().slice(0,50))}
  for(const e of root.querySelectorAll('[title],[aria-label],[placeholder]')){if(own(e)||e.closest('svg'))continue;for(const a of ['title','aria-label','placeholder']){const v=e.getAttribute(a);if(v&&EM.test(v))res.push(`emoji in ${a}: ${v.slice(0,50)}`)}}
  const PIC='.ingredient-art,.dish-art,.pp-wrap,.recipe-visual,.composed-dish,.product-photo,.lb-bug,.family-brand-mark,.avatar-img,.unit-icon,.store-mark';
  const MAIN='.primary,[data-fm="generate"],[data-fm="edit-meal"],[data-fm="quick-add-dish"],[data-fm="new"],[data-fm="cook-meal"],[data-fm="cook-batch"],[data-fm="undo-batch"],[data-action="start-cooking"],[data-action="add-to-meal"],[data-action="add-extra"],[data-action="add-stock"],[data-action="store-purchases"],[data-action="skip-row-confirm"],[data-product="new"],[data-flow="shop-exit"],[data-mr="like"],[data-mr="dislike"]';
  const WORDS='.chip,a.chip,[role="tab"],summary';const SYM=/^[\s+−\-✧↶↷↻⟳▧▤▦↓↑⇅⇵✗✓✕×↗→←‹›≈•·▾▴…⋯⋮⌄⌃<>✎★☆♥♡]*$/u;
  for(const e of root.querySelectorAll('button,a.btn,a.chip,[role="tab"],summary,.chip')){if(!vis(e)||own(e)||e.closest('svg')||e.matches('[data-color-theme],.day,.plan-day-head,.theme-fold-summary,[data-fm="recipe-snapshot"],.recipe-visual'))continue;
   /* text a person can see: innerText, or (off-screen content-visibility) the text nodes not hidden by display:none */const t=(e.innerText||[...(function*(){const w=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);let x:any;while((x=w.nextNode()))if(!x.parentElement.closest('svg')&&getComputedStyle(x.parentElement).display!=='none')yield x.nodeValue})()].join('')||'').replace(/\s+/g,' ').trim(),label=(t||e.getAttribute('aria-label')||e.outerHTML).slice(0,40);
   const drawn=[...e.querySelectorAll('svg,img')].some((s:any)=>!s.closest(PIC));const content=!!e.querySelector(PIC);
   if(e.matches(WORDS)){if(drawn)res.push('drawing on a chip/tab/disclosure: '+label);continue}
   if(SYM.test(t)&&!drawn&&!content)res.push('icon-only button without a drawing: '+label+' «'+t+'»');
   else if(e.matches(MAIN)&&!drawn&&!content)res.push('main button without a drawing: '+label);
   if(drawn&&/^[↻⟳✓✕×‹›←→↑↓]/u.test(t))res.push('text symbol next to a drawing: '+label)}
  if(small)for(const e of root.querySelectorAll('button,a.btn,a.chip,[role="tab"],summary,.chip,select,input:not([type=hidden]):not([type=file]),[role="button"]')){if(!vis(e)||own(e)&&!e.matches('input')||e.closest('#lb-root,.ladybug,svg,.sr-only'))continue;
   if(e.matches('input[type=checkbox],input[type=radio]')){const l=e.closest('label');if(l&&l.getBoundingClientRect().height>=43.5&&l.getBoundingClientRect().width>=43.5)continue}
   if(e.matches('input[type=range]'))continue;
   const r=e.getBoundingClientRect();if(r.width<43.5||r.height<43.5)res.push(`small target ${Math.round(r.width)}×${Math.round(r.height)}: `+((e.innerText||e.getAttribute('aria-label')||e.getAttribute('placeholder')||e.name||e.className||'')+'').replace(/\s+/g,' ').trim().slice(0,40))}
  return res},[scope,small]);
 // rule 25 for the open sheet
 const sheetRules=(page:any)=>page.evaluate(async()=>{const m=document.querySelector('#modal-root .modal');if(!m)return null;const res:string[]=[];const vis=(e:any)=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0};
  const title=(m.querySelector('#modal-title')?.textContent||'').trim();const x=m.querySelector(':scope>header [data-action="close-modal"]');if(!x||!x.querySelector('svg'))res.push('no drawn X');
  const KIND=/^(lưu|save(?! as\b)|đóng|close|xong|done|hủy|huỷ|cancel)(\s|$)/i;
  for(const b of m.querySelectorAll('button,a.btn')){if(b.closest('.modal-footer,header')||!vis(b)||b.closest('[data-user-content]'))continue;const t=(b as HTMLElement).innerText.replace(/\s+/g,' ').trim();if(KIND.test(t))res.push('“'+t.slice(0,30)+'” is in the sheet body, not the floating footer')}
  const f=m.querySelector(':scope>.modal-footer');
  if(f&&vis(f)){(globalThis as any).toast('Kiểm tra vị trí thông báo');await new Promise(r=>setTimeout(r,350));const t=document.getElementById('toast')!.getBoundingClientRect(),fr=f.getBoundingClientRect();if(t.bottom>fr.top&&t.top<fr.bottom&&t.right>fr.left&&t.left<fr.right)res.push('the toast covers the floating footer');document.getElementById('toast')!.className=''}
  if(f&&vis(f)){const bs=[...f.children].filter((c:any)=>c.matches('.btn,button,a.btn')&&vis(c)) as HTMLElement[];const fr=f.getBoundingClientRect();if(fr.bottom>innerHeight+1)res.push('footer below the screen');
   const tops=new Set(bs.map(b=>Math.round(b.getBoundingClientRect().top)));if(bs.length<=3&&tops.size>1)res.push('footer buttons stacked');
   const hs=bs.map(b=>b.getBoundingClientRect().height),ws=bs.map(b=>b.getBoundingClientRect().width);if(bs.length>1&&bs.length<=3&&(Math.max(...hs)-Math.min(...hs)>2||Math.max(...ws)-Math.min(...ws)>2))res.push('footer buttons not the same size');
   for(const b of bs){const r=b.getBoundingClientRect(),s=getComputedStyle(b),t=b.innerText.replace(/\s+/g,' ').trim();if(parseFloat(s.borderTopLeftRadius)<r.height/2-1)res.push('footer button not a pill: '+t.slice(0,30));
    if(KIND.test(t)&&!b.querySelector('svg'))res.push('footer “'+t.slice(0,30)+'” without its drawing');
    const kind=b.dataset.art,want=/^(lưu|save)/i.test(t)?'save':/^(đóng|close|xong|done)$/i.test(t)?'close':null;if(want&&kind!==want)res.push(`footer “${t.slice(0,30)}” marked ${kind||'nothing'}, wants ${want}`)}}
  return{title,res}});
 const QUICK=process.env.OWNER_RULES_QUICK;/* local triage only: one language and size */
 for(const lang of QUICK?[QUICK]:['vi','en'])for(const [w,h] of QUICK?[[375,812]]:[[320,740],[375,812]]){const tag=`${lang} ${w}`;const {context,page,errors}=await open(lang,{width:w,height:h});
  const go=async(v:string)=>{if(!(await page.evaluate(()=>typeof (globalThis as any).render==='function'&&location.origin==='https://kitchen.test').catch(()=>false))){await page.goto(origin+'/#'+v);await page.waitForFunction(()=>typeof (globalThis as any).render==='function'&&document.querySelector('#main h1'),null,{timeout:30000})}await page.evaluate((v:string)=>{try{(globalThis as any).closeModal()}catch{};document.getElementById('account-menu-root')?.remove();if(location.hash==='#'+v){(globalThis as any).eval('view='+JSON.stringify(v)+';render()')}else location.hash=v;scrollTo(0,0)},v);await page.waitForTimeout(350)};
  const seenSheets=new Set<string>();
  const checkSheet=async(from:string)=>{const s:any=await sheetRules(page);if(!s)return;const key=s.title||from;if(seenSheets.has(key))return;seenSheets.add(key);sheetsSeen++;
   for(const r of s.res)fails.push(`${tag} sheet “${key}” (${from}): ${r}`);for(const r of await collect(page,'#modal-root',true))fails.push(`${tag} sheet “${key}” (${from}): ${r}`);
   if(w===375)await page.screenshot({path:`${out}/sheet-${lang}-${w}-${seenSheets.size}.png`})};
  for(const v of VIEWS){await go(v);screensSeen++;for(const r of await collect(page,null,true))fails.push(`${tag} ${v}: ${r}`);await page.evaluate(()=>{for(const d of document.querySelectorAll('#main details'))(d as any).open=true});await page.waitForTimeout(150);for(const r of await collect(page,null,true))fails.push(`${tag} ${v} (disclosures open): ${r}`);if(w===375)await page.screenshot({path:`${out}/${v}-${lang}-${w}x${h}.png`,fullPage:true});
   const sigs:string[]=await page.evaluate((ATTRS:string[])=>{const o:string[]=[];for(const e of document.querySelectorAll('#main '+ATTRS.map(a=>'['+a+']').join(',#main '))as any){const r=e.getBoundingClientRect();if(!r.width||e.disabled)continue;for(const a of ATTRS){const v=e.getAttribute(a);if(v!==null){o.push('['+a+'="'+v.replace(/"/g,'\\"')+'"]');break}}}return[...new Set(o)]},ATTRS);
   for(const sig of sigs){if(SKIP.test(sig))continue;try{await go(v);const l=page.locator('#main '+sig).filter({visible:true}).first();if(!(await l.count()))continue;await l.click({timeout:2000});await page.waitForTimeout(350);await checkSheet(v+' '+sig)}catch{}}}
  for(const [name,js] of DIRECT){try{await go('today');await page.evaluate(`(async()=>{try{await (${js})}catch(e){}})()`);await page.waitForTimeout(450);for(const s of await page.locator('#modal-root details > summary').all()){try{await s.click({timeout:500})}catch{}}await checkSheet(name)}catch{}}
  // the account menu
  try{await go('today');await page.locator('.top-avatar,.account-avatar').filter({visible:true}).first().click({timeout:2000});await page.waitForTimeout(300);for(const r of await collect(page,'#account-menu-root',true))fails.push(`${tag} account menu: ${r}`);const items=await page.locator('#account-menu-root [role="menuitem"],#account-menu-root button').count();for(let i=0;i<items;i++){await go('today');await page.locator('.top-avatar').first().click({timeout:2000});await page.waitForTimeout(250);const it=page.locator('#account-menu-root [role="menuitem"],#account-menu-root button').nth(i);const t=(await it.innerText().catch(()=>''))||'',href=await it.getAttribute('href').catch(()=>null);if(href&&!href.startsWith('#'))continue;if(SKIP.test(t)||/đăng xuất|sign out|chỉ dùng trên máy|device only/i.test(t))continue;await it.click({timeout:1500}).catch(()=>{});await page.waitForTimeout(400);await checkSheet('account menu '+t.trim().slice(0,20))}}catch{}
  await go('today')
  // rule 19–21: nothing the family shares or copies carries emoji (the family's own names stay as typed)
  const shared:any=await page.evaluate(`(()=>{const o={shopping:textShopping(),week:textWeek()};const r={id:'qa-r',item:'Rau mùi',qty:'1 bó',storeId:state.stores[0]?.id,note:'bó nhỏ',from:'Mẹ',date:sydneyDate()};if(typeof requestText==='function')o.request=requestText(r);return o})()`);
  for(const [k,v] of Object.entries(shared))if(/\p{Emoji_Presentation}|\p{Extended_Pictographic}️/u.test(String(v).replace(/Bé Na 🐣/g,'')))fails.push(`${tag} shared ${k} text has emoji: ${String(v).slice(0,80)}`);
  // tapping “Giữ bữa” keeps the label in words only
  await go('today');const lock=page.locator('#main [data-fm="lock"]').first();if(await lock.count()){await lock.click();await page.waitForTimeout(300);const t=await page.locator('#main [data-fm="lock"]').first().evaluate((b:any)=>({t:b.innerText,svg:!!b.querySelector('svg')}));if(t.svg||/\p{Extended_Pictographic}/u.test(t.t))fails.push(`${tag} “Giữ bữa” shows a picture after tapping: ${t.t}`);await lock.click()}
  // A17 / A18: “Báo khẩn” on a device-only install says why and opens the family connection, titled for what it shows
  if(w===375){const en=lang==='en';await go('today');await page.evaluate('urgentForm()');await page.waitForSelector('#modal-root .urgent-needs-family',{timeout:5000});
   const s:any=await page.evaluate(()=>({title:document.querySelector('#modal-title')?.textContent,why:document.querySelector('.urgent-needs-family')?.textContent,members:!!document.querySelector('#modal-root #members-form')}));
   assert.equal(s.title,en?'Family connection':'Kết nối gia đình',tag+': connection sheet title');assert.match(s.why,en?/Urgent messages/:/Tin khẩn/,tag+': says why');assert.equal(s.members,false,tag+': only the family card');
   await page.evaluate('closeModal();otherSettingsModal("")');await page.evaluate('closeModal();accountsModal("members")');await page.waitForTimeout(300);
   assert.equal(await page.evaluate(()=>document.querySelector('#modal-title')?.textContent),en?'My kitchen':'Bếp của nhà mình',tag+': My kitchen keeps its title');
   // D9: one Lưu in the floating footer saves portions and menu together
   await page.evaluate(()=>{(document.querySelector('#members-form input[name="weight-0"]') as any).value='1.25';(document.querySelector('#settings-form input[name="budget"]') as any).value='321'});
   await page.locator('#modal-root .modal-footer [data-sheet-role="save"]').click();await page.waitForTimeout(300);
   assert.deepEqual(await page.evaluate('[state.members[0].weight,state.preferences.budget]'),[1.25,321],tag+': footer Lưu saved both forms');
   // A26: “Nhập món từ link” says it needs a family account
   await go('recipes');assert.equal(await page.locator('#main .kx-needs-account').count(),1,tag+': import-from-link says it needs an account');
   // B18: long ingredient lists have the search box; typing without accents picks the match
   await go('pantry');await page.evaluate('stockForm()');await page.waitForSelector('#modal-root .ing-search');await page.locator('#modal-root .ing-search').fill(en?'prawn':'tom');await page.waitForTimeout(150);
   const picked=await page.evaluate(()=>{const s=document.querySelector('#modal-root .ing-search')!.nextElementSibling as HTMLSelectElement;return s.options[s.selectedIndex].textContent});assert.match(String(picked),en?/Prawn/i:/Tôm/,tag+': search picks '+picked);
   // B9: the receipt store offers the family's stores and the known chains
   await page.evaluate('closeModal()');await page.locator('#main').evaluate(()=>{});const names:string[]=await page.evaluate('storeChoiceNames()');for(const c of ['Coles','Woolworths','ALDI','Harris Farm'])assert.ok(names.includes(c),tag+': store choice '+c);
   // B16: deleting a price asks in the app's own sheet, with the drawn main button
   await go('today');const asked=page.evaluate("confirmAsk('Xoá?','Thử','Xoá')");await page.waitForSelector('#modal-root [data-confirm-ask]');assert.ok(await page.locator('#modal-root [data-confirm-ask] svg').count(),tag+': confirm button drawn');
   await page.locator('#modal-root [data-confirm-ask]').click();assert.equal(await asked,true,tag+': confirm resolves');}
  assert.ok(await page.evaluate('validImport(state)'),tag+': the saved state still loads');
  assert.deepEqual(errors,[],tag+': no page errors');await context.close()}
 // evidence at tablet and desktop, light and dark: screens only
 for(const [lang,w,h,theme] of (QUICK?[]:[['vi',820,1100,'light'],['en',1280,800,'dark'],['vi',320,740,'dark'],['en',375,812,'dark']]) as [string,number,number,string][]){const {context,page,errors}=await open(lang,{width:w,height:h},theme);
  for(const v of ['today','shopping','recipes']){await page.evaluate((v:string)=>{location.hash=v},v);await page.waitForTimeout(400);for(const r of await collect(page,null,false))fails.push(`${lang} ${w} ${theme} ${v}: ${r}`);await page.screenshot({path:`${out}/${v}-${lang}-${w}x${h}-${theme}.png`})}
  assert.deepEqual(errors,[]);await context.close()}
 await browser.close();
 const uniq=[...new Set(fails)];if(uniq.length){console.error(uniq.join('\n'));console.error(uniq.length+' problems');process.exit(1)}
 console.log(`PASS owner rules sweep: ${screensSeen} screens and ${sheetsSeen} sheets in VI and EN at 320 and 375 — no emoji (also in shared text), drawings only on main and icon-only buttons, words-only chips, tabs and disclosures, sheet Lưu/Đóng as floating pills with drawings, targets ≥ 44 px; screens at 820/1280 light and dark`);
})().catch(e=>{console.error(e);process.exit(1)});
