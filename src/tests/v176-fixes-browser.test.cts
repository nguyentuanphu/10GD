// v1.7.6 owner report (6 Nov 2026, iPhone screenshots): “Chi tiêu” left in Vietnamese in English mode; “hôm nay tôi away
// nhưng vẫn ghi là at home”; names in the packed-lunch table split over lines; “chữ bị wrap xuống… audit lại tất cả”.
// Exercised at phone, narrow phone, tablet and desktop sizes in VI and EN; screenshots are the release evidence in
// docs/reviews/v1.7.6 (Chromium viewport simulation, not physical devices).
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert');
const dir='docs/reviews/v1.7.6';fs.mkdirSync(dir,{recursive:true});
const SIZES:any[]=[['narrow',{width:320,height:740}],['mobile',{width:375,height:812}],['tablet',{width:820,height:1100}],['desktop',{width:1280,height:800}]];
// the owner's family: one member is called “Chi”, which used to block the translation of “Chi tiêu”
const MEMBERS=[['m-phu','Ba Phú'],['m-mi','Mẹ Mi'],['m-chi','Chi'],['m-tien','Tiên'],['m-ti','Cậu Tí']];
// text that is cut off, sticks out of its button, or a word broken in the middle — none allowed
const TEXT_CHECK=`(()=>{const out=[];const scope=document.querySelector('#modal-root .modal')||document.body;const vis=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'};
 for(const e of scope.querySelectorAll('button,a,label,summary,.pill,.chip,.more-label,select')){if(!vis(e)||e.closest('.sr-only,[aria-hidden="true"],.ladybug'))continue;const t=(e.innerText||'').trim();if(!t)continue;
  if(e.tagName==='SELECT')continue;const cs=getComputedStyle(e);if(e.scrollWidth>e.clientWidth+2&&cs.overflowX!=='visible'||cs.textOverflow==='ellipsis'&&e.scrollWidth>e.clientWidth+1)out.push('cut: '+t.slice(0,40));
  if(e.tagName==='BUTTON'||e.tagName==='A'){const r=e.getBoundingClientRect();for(const c of e.querySelectorAll('span,b')){const q=c.getBoundingClientRect();if(q.width&&(q.left<r.left-2||q.right>r.right+2)){out.push('sticks out: '+t.slice(0,40));break}}}}
 const tw=document.createTreeWalker(scope,NodeFilter.SHOW_TEXT);let n;while((n=tw.nextNode())){const p=n.parentElement;if(!p||!vis(p)||p.closest('script,style,.sr-only,textarea,select,option'))continue;const re=/[\\p{L}\\p{N}]{3,}/gu;let m;while((m=re.exec(n.nodeValue))){const rg=document.createRange();rg.setStart(n,m.index);rg.setEnd(n,m.index+m[0].length);const rs=[...rg.getClientRects()].filter(x=>x.width>0.5);if(rs.length>1&&new Set(rs.map(x=>Math.round(x.top))).size>1)out.push('word broken: '+m[0])}}
 return out})()`;
(async()=>{const browser=await chromium.launch();const root=process.cwd();
for(const lang of ['vi','en'])for(const [size,viewport] of SIZES){
 const ctx=await browser.newContext({viewport,reducedMotion:'reduce',timezoneId:'Australia/Sydney',serviceWorkers:'block'});
 await ctx.addInitScript((l:string)=>{if(sessionStorage.getItem('qa'))return;sessionStorage.setItem('qa','1');localStorage.setItem('guest/bep-language',l)},lang);
 const page=await ctx.newPage();const errors:string[]=[];page.on('pageerror',(e:any)=>errors.push(e.message));
 await page.route('https://kitchen.test/**',async(route:any)=>{const url=new URL(route.request().url());if(url.pathname.startsWith('/.netlify/')){const op=url.searchParams.get('op');return route.fulfill({json:op==='status'?{configured:false,connected:false}:op==='state'?{state:null,etag:null}:op==='families'?{families:[]}:{announcements:[],devices:[]}})}const file=path.join(root,'dist',url.pathname==='/'?'index.html':url.pathname);try{await route.fulfill({body:fs.readFileSync(file),contentType:({'.html':'text/html','.js':'application/javascript','.json':'application/json','.css':'text/css','.webp':'image/webp','.svg':'image/svg+xml','.png':'image/png'} as any)[path.extname(file)]||'application/octet-stream'})}catch{await route.fulfill({status:404,body:'Missing'})}});
 const label=`${lang} ${size}`,shot=(name:string)=>page.screenshot({path:`${dir}/${lang}-${size}-${name}.png`});
 const textOk=async(where:string)=>{await page.waitForTimeout(250);const bad=await page.evaluate(TEXT_CHECK);assert.deepEqual(bad,[],`${label} ${where}: text cut off or broken`);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${label} ${where}: no horizontal overflow`)};
 await page.goto('https://kitchen.test/#today');await page.locator('#main h1').waitFor({timeout:15000});
 await page.evaluate(`(()=>{state.preferences.onboardingComplete=true;state.members=${JSON.stringify(MEMBERS)}.map(([id,name],i)=>({id,name,weight:i<2?1:0.75,emoji:''}));const w=currentWeek();
  for(const d of Object.keys(w.days))for(const t of MEAL_TYPES){const m=w.days[d][t];if(!m)continue;m.attendance={};for(const p of state.members)m.attendance[p.id]='home'}
  for(const d of Object.keys(w.days).slice(0,3))w.days[d].dinner.recipes=[clone(state.recipes.find(x=>x.id==='r1')),clone(state.recipes.find(x=>x.id==='r16'))];
  const today=sydneyDate();selectedDate=today;state.availability={'m-phu':{[today]:{lunch:{status:'away',deduct:true,remind:false,note:''}}}};state.packSchedule={members:{'m-chi':[1,2,3,4,5]}};
  save();closeModal();view='today';render()})()`);
 // 1. Today: the calendar says Ba Phú is away for lunch → “Who is eating?” says Away too (it said At home)
 await page.locator('[data-action="attendance-tab"][data-type="lunch"]').click();
 const phu=page.locator('select[data-change="attendance"][data-id="m-phu"]');
 assert.equal(await phu.inputValue(),'away',`${label}: calendar away shows as Away in “Who is eating?”`);
 assert.match(await page.locator('[data-who-busy]').innerText(),lang==='en'?/Ba Phú\s+away/:/Ba Phú\s+vắng/,`${label}: Who’s busy lists the same`);
 await phu.scrollIntoViewIfNeeded();await textOk('today');await shot('today-away');
 if(size==='mobile'){ // back home for this lunch → the calendar entry for that one meal is lifted, both places agree
  await phu.selectOption('home');await page.waitForTimeout(200);
  assert.equal(await page.locator('select[data-change="attendance"][data-id="m-phu"]').inputValue(),'home');
  assert.equal(await page.evaluate(`!!state.availability?.['m-phu']?.[sydneyDate()]?.lunch`),false,'calendar away lifted for that meal');
  assert.ok(!/Ba Phú/.test(await page.locator('[data-who-busy]').innerText().catch(()=>'')),'Who’s busy no longer lists Ba Phú')}
 // 2. More tools: every row in the chosen language, on one line (owner: “Chi tiêu” in English mode)
 if(size==='narrow'||size==='mobile'){await page.locator('[data-ui-more]').first().click();const more=page.locator('.more-tools');await more.waitFor();
  const rows=await more.locator('.more-label').allInnerTexts();
  if(lang==='en'){assert.ok(rows.includes('Spending'),`${label}: “Chi tiêu” is translated (a member is called Chi): ${rows}`);for(const r of rows)assert.ok(!/[ăâđêôơưàáạảãấầẩẫậắằẳẵặèéẻẽẹếềểễệìíỉĩịòóỏõọốồổỗộớờởỡợùúủũụứừửữựỳýỷỹỵ]/i.test(r),`${label}: English row “${r}”`)}
  for(const h of await more.locator('.more-label').evaluateAll((a:any[])=>a.map(e=>Math.round(e.getBoundingClientRect().height))))assert.ok(h<34,`${label}: More row on one line (${h}px)`);
  await textOk('more');await shot('more');await page.evaluate('closeModal()')}
 // 3. Packed-lunch schedule: each name whole, on one line
 await page.locator('[data-house="pack-schedule"]').first().scrollIntoViewIfNeeded();await page.locator('[data-house="pack-schedule"]').first().click();await page.locator('.pack-table').waitFor();
 for(const r of await page.locator('.pack-table th[scope=row]').evaluateAll((a:any[])=>a.map(e=>{const rg=document.createRange();rg.selectNodeContents(e);return{t:e.textContent,lines:new Set([...rg.getClientRects()].filter(x=>x.width>1).map(x=>Math.round(x.top))).size}})))assert.equal(r.lines,1,`${label}: “${r.t}” on one line in the packed-lunch table`);
 await textOk('pack');await shot('pack');await page.evaluate('closeModal()');
 // 4. Weekly menu: meals are readable cards (≥ 200 px), not 60 px slivers
 await page.evaluate(`view='planner';render();scrollTo(0,0)`);await page.locator('#main .family-meal-card').first().waitFor();
 const widths=await page.locator('#main .family-meal-card').evaluateAll((a:any[])=>a.filter(e=>e.offsetParent).slice(0,8).map(e=>Math.round(e.getBoundingClientRect().width)));
 assert.ok(widths.length&&Math.min(...widths)>=200,`${label}: weekly menu meal cards ≥ 200 px wide, got ${widths}`);
 await textOk('planner');await shot('planner');
 // 5. the other screens: nothing cut off, no word broken in the middle
 for(const v of ['shopping','recipes','pantry','expenses','insights','products']){await page.evaluate(`view=${JSON.stringify(v)};render();scrollTo(0,0)`);await textOk(v);if(v==='shopping')await shot('shopping')}
 // 6. connection label in the chosen language (it said “Online” in Vietnamese)
 const net=await page.locator('#network-status').innerText().catch(()=>'');if(net.trim())assert.equal(net.trim(),lang==='en'?'Online':'Trực tuyến',`${label}: connection label`);
 assert.deepEqual(errors,[],label+': no page errors');await ctx.close()}
await browser.close();console.log('PASS v1.7.6: calendar away shown in “Who is eating?” and lifted when back home, “Chi tiêu” translated with a member called Chi, More / packed-lunch names on one line, weekly menu readable on desktop, no text cut off or word broken on 9 screens at 320 / 375 / 820 / 1280 in VI and EN')})().catch((e:any)=>{console.error(e);process.exit(1)});
