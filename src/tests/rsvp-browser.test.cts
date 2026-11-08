// v1.7.13 guest invitations in the browser (owner plan approved 8 Nov 2026, Sydney time): the guest's page (rsvp.html) and the
// family's side (invite from the guest sheet, answers back on the meal, Today notices). The server is mocked here; its rules are
// tested in rsvp.test (tokens, deadlines, expiry, withdrawal, limits, what a guest can see).
// Guest page: 375×812, 320×740, 820×1100 (VI) and 1280×800 (EN). Family side: 375×812 (VI) and 1280×800 (EN).
// Chromium viewport simulation, not physical devices. Screenshots: docs/reviews/v1.7.13/invite/.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const origin='https://kitchen.test',out='docs/reviews/v1.7.13/invite';mkdirSync(out,{recursive:true});
const mime:any={'.js':'application/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'};
const sizes:any={mobile:{width:375,height:812},narrow:{width:320,height:740},tablet:{width:820,height:1100},desktop:{width:1280,height:800}};
const TOKEN='Abc_-123456789012345678901234567';
const serve=async(page:any,handlers:Record<string,(r:any)=>any>)=>page.route(origin+'/**',async(r:any)=>{const u=new URL(r.request().url());for(const [k,h] of Object.entries(handlers))if((u.pathname+u.search).startsWith(k))return h(r);if(u.pathname.startsWith('/.netlify/'))return r.fulfill({status:401,json:{error:'no'}});if(u.pathname==='/startup-scripts.json')return r.fulfill({json:JSON.parse(readFileSync('dist/startup-scripts.json','utf8'))});const f=resolve('dist',u.pathname==='/'?'index.html':u.pathname==='/m'?'rsvp.html'/* netlify.toml: /m → /rsvp.html (short invitation link) */:u.pathname.slice(1));try{await r.fulfill({contentType:mime[extname(f)]||'application/octet-stream',body:readFileSync(f)})}catch{await r.fulfill({status:404,body:''})}});
(async()=>{
 const browser=await chromium.launch(process.env.BEP_CHROMIUM?{executablePath:process.env.BEP_CHROMIUM}:{});
 try{
  // ── the guest's page
  for(const [size,lang] of [['mobile','vi'],['narrow','vi'],['tablet','vi'],['desktop','en']] as const){const label=`guest ${size} ${lang}`;
   const context=await browser.newContext({locale:lang==='vi'?'vi-VN':'en-AU',viewport:sizes[size],reducedMotion:'reduce',timezoneId:'Australia/Sydney',acceptDownloads:true});
   const page=await context.newPage(),errors:string[]=[];page.on('pageerror',(e:any)=>errors.push(e.message));page.on('dialog',(d:any)=>d.accept());
   const posts:any[]=[];let view:any={host:'Nhà Phú',guestName:'Nhà anh Tuấn',meals:[{date:'2026-11-14',type:'dinner'},{date:'2026-11-15',type:'lunch'}],adults:2,kids:1,deadline:'2026-11-13T10:00:00Z',expiresAt:'2026-11-15T12:59:00Z',lang:'vi',cancelled:false,deadlinePassed:false,expired:false,response:null};
   await serve(page,{'/.netlify/functions/rsvp?t=':async(r:any)=>{const u=new URL(r.request().url());if(u.searchParams.get('t')!==TOKEN)return r.fulfill({status:404,json:{error:'Invitation not found.'}});
    if(r.request().method()==='POST'){const b=JSON.parse(r.request().postData());posts.push(b);if(view.deadlinePassed&&!['no','busy'].includes(b.status))return r.fulfill({status:409,json:{error:'late',reason:'deadline_passed',view}});view={...view,response:{status:b.status,adults:b.adults||0,kids:b.kids||0,note:b.note||'',at:new Date().toISOString(),...(b.status==='busy'?{was:view.response?.status}:{})}};return r.fulfill({json:{saved:true,view}})}return r.fulfill({json:view})}});
   const shot=(n:string)=>page.screenshot({path:`${out}/${n}-${lang}-${sizes[size].width}x${sizes[size].height}.png`,fullPage:true});
   const tidy=async(where:string)=>{const ow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.ok(ow<=1,`${label} ${where}: overflow ${ow}`);const small=await page.evaluate(()=>[...document.querySelectorAll('button,a')].filter((b:any)=>b.offsetParent).map((b:any)=>{const r=b.getBoundingClientRect();return{t:b.innerText.trim().slice(0,20),h:r.height,w:r.width}}).filter((x:any)=>x.h<44||x.w<44));assert.deepEqual(small,[],`${label} ${where}: touch targets ≥ 44 px`)};
   await page.goto(origin+'/m#'+TOKEN);await page.locator('h1').waitFor();/* v1.7.14: the short link /m#<token> opens the guest page */
   {const lg:any=await page.locator('#intro .legal a').evaluateAll((a:any[])=>a.map(x=>x.getAttribute('href')));assert.ok(lg.length===2&&lg[0].startsWith('/terms.html')&&lg[1].startsWith('/privacy.html'),`${label}: small Terms · Privacy links on the guest page ${lg}`)}/* v1.7.14 */
   const head=await page.locator('main').innerText();assert.match(head,lang==='vi'?/Nhà Phú mời bạn/:/Nhà Phú invites you/);assert.match(head,lang==='vi'?/Bữa tối/:/Dinner/);assert.match(head,lang==='vi'?/giờ Sydney/:/Sydney time/,`${label}: times in Sydney time`);
   assert.match(await page.locator('#intro').innerText(),lang==='vi'?/Dùng thử Bếp Nhà/:/Try Bếp Nhà/,`${label}: a light introduction to the app`);await tidy('open');await shot('guest-open');
   // answer
   await page.locator('[data-status="yes"]').click();assert.equal(await page.locator('.step output').first().innerText(),'2',`${label}: the family's estimate is the starting point`);
   await page.locator('[data-step="kids"][data-d="1"]').click();await page.fill('#rsvp-note',lang==='vi'?'đến muộn 30 phút':'running 30 min late');await tidy('answer');await shot('guest-answer');
   await page.locator('[data-act="send"]').click();await page.locator('.status').waitFor();
   assert.deepEqual({s:posts[0].status,a:posts[0].adults,k:posts[0].kids},{s:'yes',a:2,k:2},`${label}: the answer sent`);assert.match(await page.locator('.status').innerText(),lang==='vi'?/Sẽ đến · 2 lớn, 2 bé/:/Coming · 2 adults, 2 children/);await tidy('thanks');await shot('guest-thanks');
   // the guest's own calendar reminds them
   const [dl]=await Promise.all([page.waitForEvent('download'),page.locator('[data-act="ics"]').click()]);const ics=readFileSync(await dl.path(),'utf8');
   assert.ok(/BEGIN:VCALENDAR/.test(ics)&&(ics.match(/BEGIN:VEVENT/g)||[]).length===2&&/TRIGGER:-P1D/.test(ics)&&/TRIGGER:-PT2H/.test(ics),`${label}: calendar file with both meals and two reminders`);
   assert.ok(/DTSTART:20261114T073000Z/.test(ics),`${label}: dinner 18:30 Sydney time (AEDT) in the calendar`);
   // change, then something came up
   await page.locator('[data-act="change"]').click();assert.ok(await page.locator('[data-status="yes"][aria-pressed="true"]').count(),`${label}: changing keeps the earlier answer selected`);await page.locator('[data-status="maybe"]').click();await page.locator('[data-act="send"]').click();await page.locator('.status.maybe').waitFor();
   await page.locator('[data-act="busy"]').click();await page.locator('.status.busy').waitFor();assert.equal(posts.at(-1).status,'busy',`${label}: “Báo bận đột xuất” sent`);await shot('guest-busy');
   // after the deadline: only “can't come”
   view={...view,deadlinePassed:true,response:null};await page.reload();await page.locator('h1').waitFor();
   assert.deepEqual(await page.locator('[data-status]').evaluateAll((b:any[])=>b.map(x=>x.dataset.status)),['no'],`${label}: after the deadline only “can't come”`);assert.ok(await page.locator('.notice').count(),`${label}: the late note`);
   view={...view,expired:true};await page.reload();await page.locator('.notice').waitFor();assert.equal(await page.locator('[data-status]').count(),0,`${label}: an ended link takes no answers`);await shot('guest-ended');
   await page.goto(origin+'/rsvp.html?wrong=1#t=wrong');await page.locator('.error').waitFor();assert.match(await page.locator('.error').innerText(),lang==='vi'?/Không tìm thấy lời mời/:/Invitation not found/,`${label}: a wrong link`);
   // the language switch
   await page.goto(origin+'/rsvp.html#t='+TOKEN);await page.locator('h1').waitFor();await page.locator(`.lang [data-lang="${lang==='vi'?'en':'vi'}"]`).click();assert.match(await page.locator('h1').innerText(),lang==='vi'?/invites you/:/mời bạn/,`${label}: VI │ EN switch`);
   assert.deepEqual(errors,[],`${label}: page errors`);await context.close();console.log('✓',label)}

  // ── the family's side
  for(const [size,lang] of [['mobile','vi'],['desktop','en']] as const){const label=`family ${size} ${lang}`;
   const context=await browser.newContext({locale:'vi-VN',viewport:sizes[size],serviceWorkers:'block',reducedMotion:'reduce',timezoneId:'Australia/Sydney'});
   await context.addInitScript((lang:string)=>{if(sessionStorage.getItem('qa-init'))return;sessionStorage.setItem('qa-init','1');localStorage.setItem('bep-local-locked','yes');localStorage.setItem('guest/bep-language',lang)},lang);
   const page=await context.newPage(),errors:string[]=[];page.on('pageerror',(e:any)=>errors.push(e.message));const created:any[]=[];
   await serve(page,{'/.netlify/functions/family?op=invite-create':async(r:any)=>{const b=JSON.parse(r.request().postData());created.push({...b,token:TOKEN,response:null});return r.fulfill({json:{token:TOKEN,inviteId:b.inviteId}})},
    '/.netlify/functions/family?op=invites':async(r:any)=>r.fulfill({json:{invites:created.map(x=>({inviteId:x.inviteId,token:x.token,meals:x.meals,guestName:x.guestName,deadline:x.deadline,expiresAt:x.expiresAt,maybe:x.maybe,cancelled:false,response:x.response}))}})});
   const shot=(n:string)=>page.screenshot({path:`${out}/${n}-${lang}-${sizes[size].width}x${sizes[size].height}.png`});
   await page.goto(origin+'/#today',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#main h1'),null,{timeout:20000});
   const E=(s:string)=>page.evaluate(s) as Promise<any>;await page.exposeFunction('__qaShare',(t:string)=>{(page as any).__shared=t});
   await E(`(()=>{navigator.share=async d=>window.__qaShare(d.text);state.preferences.onboardingComplete=true;state.members=[['m-phu','Ba Phú',1],['m-mi','Mẹ Mi',1]].map(([id,name,weight])=>({id,name,weight,emoji:''}));familyGenerate(state,weekStart,{sourceMode:'library'});for(const wk of Object.values(state.weeks))for(const day of Object.values(wk.days))for(const m of Object.values(day))if(m&&m.attendance)for(const p of state.members)m.attendance[p.id]??='home';save();weekStart=planStartOf(state,sydneyDate());selectedDate=sydneyDate();view='today';render()})()`);
   // without a family account: a clear note, no link
   await page.locator('#main .guest-shortcut').click();await page.fill('#modal-root [data-guest-name="0"]','Nhà anh Tuấn');await page.locator('#modal-root [data-fm="guest-step"][data-k="adults"][data-d="1"]').click();
   assert.ok(await page.locator('#modal-root .guest-invite-hint a[href="/login"]').count(),`${label}: without an account the sheet says an account is needed`);assert.equal(await page.locator('#modal-root .guest-invite-send').count(),0,`${label}: no send button without an account`);await E('closeModal()');
   // with the family account
   await E(`(()=>{globalThis.BEP_SESSION={mode:'account',household:{id:'00000000-0000-4000-8000-000000000000',name:'Nhà Phú'},member:{role:'owner'}};render()})()`);
   await page.locator('#main .guest-shortcut').click();await page.fill('#modal-root [data-guest-name="0"]','Nhà anh Tuấn');await page.locator('#modal-root [data-fm="guest-step"][data-k="adults"][data-d="1"]').click();
   const tomorrow=await E('addDays(sydneyDate(),2)');await page.locator(`#modal-root [data-guest-pick="from-date"][data-v="${tomorrow}"]`).click();
   await page.locator('#modal-root .guest-invite summary').click();await page.locator('#modal-root [data-fm="guest-opt"][data-k="deadline"][data-v="1d"]').click();await page.locator('#modal-root [data-fm="guest-opt"][data-k="maybe"][data-v="half"]').click();
   // v1.7.14 (owner: “nên có option để ghi tên của tôi hay của gia đình mời”): who the invitation is from
   assert.ok(await page.locator('#modal-root [data-fm="guest-opt"][data-k="host"][data-v="family"]').count()&&await page.locator('#modal-root [data-fm="guest-opt"][data-k="host"][data-v="custom"]').count(),`${label}: “Lời mời từ” choices`);
   await page.locator('#modal-root [data-fm="guest-opt"][data-k="host"][data-v="custom"]').click();await page.fill('#modal-root [data-invite-host]','Gia đình anh Phú');await page.locator('#modal-root [data-fm="guest-opt"][data-k="deadline"][data-v="1d"]').click();
   assert.equal(await page.locator('#modal-root [data-invite-host]').inputValue(),'Gia đình anh Phú',`${label}: the typed name stays when another option is tapped`);
   assert.ok(await page.locator('#modal-root .guest-invite-send').evaluate((b:any)=>!!b.querySelector('.btn-art')&&b.getBoundingClientRect().height>=44),`${label}: “Gửi lời mời” drawn, ≥ 44 px`);
   const chips=await page.locator('#modal-root .guest-invite .chip').evaluateAll((b:any[])=>b.filter(x=>x.offsetParent).every(x=>x.getBoundingClientRect().height>=44));assert.ok(chips,`${label}: option chips ≥ 44 px`);
   await page.locator('#modal-root .guest-invite').scrollIntoViewIfNeeded();await shot('family-invite-options');
   await page.locator('#modal-root .guest-invite-send').click();await page.waitForFunction(()=>!document.querySelector('#modal-root .guest-group'));await page.waitForTimeout(300);
   const c=created[0];assert.ok(c&&c.guestName==='Nhà anh Tuấn'&&c.host==='Gia đình anh Phú'&&c.adults===2&&c.maybe==='half',`${label}: invitation created ${JSON.stringify(c)}`);
   const firstMeal=c.meals[0],dl=Date.parse(c.deadline),ex=Date.parse(c.expiresAt);assert.ok(firstMeal.date===tomorrow&&dl<Date.parse(firstMeal.date+'T00:00:00Z')&&ex>dl,`${label}: answer by the evening before (Sydney), link until after the meal`);
   const shared=(page as any).__shared||'';assert.ok(shared.includes('/m#'+TOKEN)&&!shared.includes('rsvp.html')&&(lang==='vi'?/không cần tài khoản/:/no account needed/).test(shared),`${label}: the share message carries the link (${shared})`);
   assert.ok(await E(`guestGroups(mealAt(state,${JSON.stringify(tomorrow)},${JSON.stringify(firstMeal.type)}))[0].invite?.token===${JSON.stringify(TOKEN)}`),`${label}: the group keeps its invitation`);
   // the answer comes back
   created[0].response={status:'yes',adults:3,kids:1,note:'',at:new Date().toISOString()};await E('invitesPull(true)');await page.waitForTimeout(500);
   const g=await E(`guestGroups(mealAt(state,${JSON.stringify(tomorrow)},${JSON.stringify(firstMeal.type)}))[0]`);assert.ok(g.rsvp?.status==='yes'&&g.adults===3&&g.kids===1,`${label}: the answer is on the meal ${JSON.stringify(g)}`);
   await E(`(()=>{selectedDate=${JSON.stringify(tomorrow)};weekStart=planStartOf(state,selectedDate);render()})()`);const line=page.locator(`#main .meal-guest-line[data-type="${firstMeal.type}"]`).first();await line.waitFor();
   assert.match(await line.innerText(),lang==='vi'?/Nhà anh Tuấn \(sẽ đến\)/:/Nhà anh Tuấn \(coming\)/,`${label}: the meal card shows the answer`);await line.scrollIntoViewIfNeeded();await shot('family-answer');
   // Today: guests today, and a reminder for guests who have not answered by the deadline
   await E(`(()=>{const today=sydneyDate(),day=ensureWeek(state,planStartOf(state,today)).days[today],t=MEAL_TYPES.find(x=>fmMealOn(day,x)&&day[x]&&!day[x].cooked);setMealGuests(day[t],[{name:'Chị Lan',adults:1,kids:0,invite:{id:'inv-late0001',token:'L'.repeat(32),deadline:new Date(Date.now()-3600000).toISOString(),expiresAt:new Date(Date.now()+86400000).toISOString()}}]);save();selectedDate=today;weekStart=planStartOf(state,today);view='today';render();scrollTo(0,0)})()`);
   const notes=page.locator('#main .invite-notices');await notes.waitFor();const nt=await notes.innerText();assert.match(nt,lang==='vi'?/Hôm nay có khách/:/Guests today/,`${label}: guests today`);assert.match(nt,lang==='vi'?/Chị Lan chưa trả lời/:/Chị Lan hasn’t answered/,`${label}: no answer by the deadline`);
   await notes.locator('[data-flow="invite-remind"]').click();await page.waitForTimeout(200);assert.ok(((page as any).__shared||'').includes('/m#'+'L'.repeat(32)),`${label}: “Nhắc lại” re-sends the same link`);
   await notes.scrollIntoViewIfNeeded();await shot('family-today-notices');const ow=await E('document.documentElement.scrollWidth-innerWidth');assert.ok(ow<=1,`${label}: overflow ${ow}`);
   assert.deepEqual(errors,[],`${label}: page errors`);await context.close();console.log('✓',label)}
  console.log('PASS v1.7.13 guest invitations: guest page (answer, change, busy, calendar, deadline, ended, language) and family side (invite, answer back, Today notices)');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
