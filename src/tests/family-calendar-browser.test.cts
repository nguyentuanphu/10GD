// v1.7.3 owner request (Henry): the monthly calendar is a shared family notice — who is busy/away and when, without
// first choosing the person. Family of 5 (3 adults, 2 children), device-only mode, Chromium with touch emulation at
// 320×740, 375×812, 820×1100 and 1280×800 (browser simulation only, not physical devices). Covers: "Cả nhà" view by
// default from Today, one adult busy for dinner visible without selecting them (markers + accessible names), the day
// list with note and derived portion wording, edit mode heading, reporting on behalf of a child (stored as `by`),
// selected (ring + ✓) vs saved (status label) looking different, the Today "who's busy this week" line and its tap,
// schedule notes, VI/EN month label + weekdays + nav labels, light/dark, offline save, reduced motion, ≥44 px targets and
// no horizontal overflow (page and dialog). Screenshots → docs/reviews/v1.7.3/family-calendar.
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert');
const root=process.cwd(),dir='docs/reviews/v1.7.3/family-calendar';fs.mkdirSync(dir,{recursive:true});
const types:any={'.html':'text/html','.js':'application/javascript','.json':'application/json','.css':'text/css','.webp':'image/webp','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
async function route(page:any){await page.route('https://kitchen.test/**',async(r:any)=>{const url=new URL(r.request().url());if(url.pathname.startsWith('/.netlify/')){const op=url.searchParams.get('op');return r.fulfill({json:op==='status'?{configured:false,connected:false}:op==='state'?{state:null,etag:null}:op==='families'?{families:[]}:{announcements:[],devices:[]}})}const file=path.join(root,'dist',url.pathname==='/'?'index.html':url.pathname);try{await r.fulfill({body:fs.readFileSync(file),contentType:types[path.extname(file)]||'application/octet-stream'})}catch{await r.fulfill({status:404,body:'Missing'})}})}
// Page never scrolls sideways, and nothing inside the dialog sticks out past its visible box (Henry's clipped Sun column,
// › button, member select and Note input).
const noOverflow=async(page:any,label:string)=>{const r=await page.evaluate(()=>{const out:string[]=[];if(document.documentElement.scrollWidth>innerWidth+1)out.push('page '+document.documentElement.scrollWidth);const m=document.querySelector('#modal-root .modal');if(m){if(m.scrollWidth>m.clientWidth+1)out.push('modal scroll '+m.scrollWidth+'>'+m.clientWidth);const mb=m.getBoundingClientRect();if(mb.right>innerWidth+1||mb.left<-1)out.push('modal outside viewport');const right=mb.left+m.clientLeft+m.clientWidth+1;for(const e of m.querySelectorAll('.modal-content *')){const b=e.getBoundingClientRect();if(b.width&&b.right>right)out.push((e.id||e.className||e.tagName)+' +'+Math.round(b.right-right))}}return out.slice(0,6)});assert.deepEqual(r,[],'no horizontal overflow: '+label+' '+JSON.stringify(r))};
const shot=async(page:any,file:string)=>{await page.evaluate(()=>{const t=document.querySelector('#toast');if(t)t.classList.remove('visible')});await page.screenshot({path:`${dir}/${file}.jpg`,type:'jpeg',quality:70});const kb=fs.statSync(`${dir}/${file}.jpg`).size/1024;assert.ok(kb<250,`${file}.jpg is ${kb.toFixed(0)} KB (limit 250)`)};
const theme=(page:any,mode:string)=>page.evaluate((m:string)=>{localStorage.setItem('bep-theme-mode',m);(0,eval)('applyThemePreferences')()},mode);
const targets=async(page:any,sel:string,label:string)=>{const small=await page.evaluate((s:string)=>[...document.querySelectorAll(s)].filter((e:any)=>e.offsetParent).map((e:any)=>[e.className+' '+(e.dataset.date||e.dataset.house||''),e.getBoundingClientRect()]).filter(([,b]:any)=>b.width<44||b.height<44).map(([n,b]:any)=>n+' '+Math.round(b.width)+'×'+Math.round(b.height)),sel);assert.deepEqual(small,[],'≥44px targets: '+label+' '+JSON.stringify(small))};
const G=(page:any,expr:string)=>page.evaluate((e:string)=>(0,eval)(e),expr);
// Synthetic family of five: Bố, Mẹ, Cậu Tí (adults), Bé lớn, Bé nhỏ (children). Mẹ is the person using this device.
const seed=()=>(0,eval)(`(()=>{state.members=[{id:'dad',name:'Bố',weight:1,emoji:'👨🏻'},{id:'mum',name:'Mẹ',weight:1,emoji:'👩🏻'},{id:'ti',name:'Cậu Tí',weight:1,emoji:'👨🏻'},{id:'big',name:'Bé lớn',weight:.65,emoji:'👧🏻'},{id:'little',name:'Bé nhỏ',weight:.5,emoji:'👧🏻'}];
 const D=addDays(sydneyDate(),1);setAvailability(state,'dad',[D],['dinner'],{status:'busy',deduct:false,remind:true,note:'Họp muộn, ăn sau 8 giờ',by:'dad'});
 familyStorage.setItem('bep-active-member','mum');save();render();return D})()`);
(async()=>{const browser=await chromium.launch(process.env.BEP_CHROMIUM?{executablePath:process.env.BEP_CHROMIUM}:{});
for(const [name,width,height] of [['narrow',320,740],['mobile',375,812],['tablet',820,1100],['desktop',1280,800]] as [string,number,number][]){
 const phone=width<=760,context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',hasTouch:name!=='desktop',isMobile:phone}),page=await context.newPage(),errors:string[]=[];page.on('pageerror',(e:any)=>errors.push(e.message));await route(page);
 const tap=(loc:any)=>name!=='desktop'?loc.tap():loc.click();
 await page.goto('https://kitchen.test/#today');await page.locator('#main .page-heading').waitFor({timeout:20000});await page.waitForTimeout(500);
 const D:string=await page.evaluate(seed);await theme(page,'light');await page.waitForTimeout(150);
 const [dm,dd]=[Number(D.slice(5,7)),Number(D.slice(8,10))];
 // Today: "Tuần này ai bận" names Bố for dinner without opening anything.
 const busy=page.locator('#main [data-who-busy]');await busy.waitFor();assert.match(await busy.innerText(),/Tuần này ai bận/);// v1.7.5 owner design (5 Nov 2026): one line per person — name, status, then the meals in date order
 // v1.7.9: name and status, then one line per pattern of meals: "tối: T6, T7"
 assert.match(await busy.locator('.who-busy-row').first().innerText(),/^\S.* (vắng|bận)\s+(sáng|phụ sáng|trưa|phụ|tối)( \+ [^:]+)?( [^:]*)?: (T[2-7]|CN)/);assert.match(await busy.innerText(),/Bố bận\s+tối/);assert.match(await busy.innerText(),/Xem cả tuần/);
 await targets(page,'#main .who-busy-row,#main .calendar-shortcut',name+' today');await noOverflow(page,name+' today');
 await busy.scrollIntoViewIfNeeded();await shot(page,`${name}-today-who-busy-vi-light`);
 // Open from Today's "Lịch tháng": whole-family view by default; the busy adult shows without choosing him.
 await tap(page.locator('#main .calendar-shortcut'));await page.locator('#availability-form.family-view').waitFor();
 assert.equal(await page.locator('#calendar-member').inputValue(),'','"Cả nhà" selected by default');
 assert.equal((await page.locator('#calendar-member option').first().innerText()).trim(),'Cả nhà');
 assert.match(await page.locator('#calendar-month-label').innerText(),/^Tháng \d{1,2}\/\d{4}$/);
 assert.deepEqual(await page.$$eval('.availability-weekdays span',(e:any[])=>e.map(x=>x.textContent)),['T2','T3','T4','T5','T6','T7','CN']);
 assert.equal(await page.locator('[data-house="calendar-prev"]').getAttribute('aria-label'),'Tháng trước');
 if(!D.startsWith(await G(page,'availabilityMonth'))){await tap(page.locator('[data-house="calendar-next"]'));await page.waitForFunction((m:string)=>(0,eval)('availabilityMonth')===m,D.slice(0,7))}
 const cell=page.locator(`.calendar-day[data-date="${D}"]`);
 assert.equal(await cell.getAttribute('aria-label'),`${dd} tháng ${dm}: Bố bận bữa tối`);
 assert.equal((await cell.locator('.cal-mark.busy').innerText()).replace(/\s/g,''),'BT','marker: initial + meal letter');
 assert.ok(await page.locator('.calendar-legend').isVisible());
 await targets(page,'#modal-root .calendar-day,#modal-root .calendar-month .btn',name+' grid');await noOverflow(page,name+' family vi light');
 // Day list: member, meal, derived status wording, note.
 await tap(cell);const list=page.locator('.calendar-daylist');await list.waitFor();const lt=await list.innerText();
 assert.match(lt,/Bố/);assert.match(lt,/Bữa tối/);assert.match(lt,/Bận · vẫn nấu phần/);assert.match(lt,/Họp muộn, ăn sau 8 giờ/);
 assert.equal(await cell.getAttribute('aria-pressed'),'true');await noOverflow(page,name+' day list');
 await targets(page,'#modal-root .calendar-daylist .btn',name+' day list');
 await list.scrollIntoViewIfNeeded();await shot(page,`${name}-family-day-vi-light`);
 // Edit mode: "Báo bận / vắng ngày này" → reporting for Mẹ (the device user); switch to Bé nhỏ → on behalf.
 await tap(list.locator('> .btn'));await page.locator('#availability-form.editing').waitFor();
 assert.match(await page.locator('#calendar-reporting').innerText(),/^Đang báo cho: Mẹ$/);
 await page.locator('#calendar-member').selectOption('little');await page.waitForFunction(()=>/Bé nhỏ/.test(document.querySelector('#calendar-reporting')?.textContent||''));
 assert.match(await page.locator('#calendar-reporting').innerText(),/Đang báo cho: Bé nhỏ.*\(báo hộ · người báo: Mẹ\)/s);
 const sel=page.locator(`.calendar-day[data-date="${D}"]`);assert.match(await sel.getAttribute('class'),/selected/);assert.equal(await sel.locator('.cal-check').count(),1,'selected = ✓');
 await page.locator('#calendar-status').selectOption('away');assert.equal(await page.locator('#calendar-deduct').isChecked(),true,'away → no portion by default');assert.equal((await page.locator('#calendar-preview').innerText()).trim(),'Vắng · không nấu phần');
 await page.locator('#calendar-note').fill('Ngủ nhà bà');
 // v1.7.9 (owner, 6 Nov 2026: "không báo được thời gian"): optional from / to times, 44 px tall
 await page.locator('#calendar-from').fill('18:00');await page.locator('#calendar-to').fill('21:00');for(const id of ['#calendar-from','#calendar-to'])assert.ok((await page.locator(id).boundingBox())!.height>=44,id+' 44 px');
 await noOverflow(page,name+' edit vi light');
 await targets(page,'#modal-root .calendar-day,#modal-root .modal-footer .btn',name+' edit');
 await page.locator('#availability-form [name="types"][value="dinner"]').scrollIntoViewIfNeeded();await shot(page,`${name}-edit-on-behalf-vi-light`);
 await tap(page.locator('#modal-root .modal-footer [data-action="submit-form"]'));
 await page.waitForFunction((d:string)=>(0,eval)('state').availability?.little?.[d]?.dinner?.by==='mum',D);
 assert.deepEqual(JSON.parse(JSON.stringify(await G(page,`state.availability.little['${D}'].dinner`))),{status:'away',deduct:true,remind:true,note:'Ngủ nhà bà',from:'18:00',to:'21:00',by:'mum'});
 assert.deepEqual(JSON.parse(JSON.stringify(await G(page,`state.availability.dad['${D}'].dinner`))),{status:'busy',deduct:false,remind:true,note:'Họp muộn, ăn sau 8 giờ',by:'dad'},'other family data untouched');
 // Selected vs saved look different: saved = grey "Away" label; selected = ring on the normal background, not solid green.
 const look=await page.evaluate((d:string)=>{const sel=document.querySelector(`.calendar-day[data-date="${d}"]`) as HTMLElement,other=[...document.querySelectorAll('.calendar-day:not(.selected)')][0] as HTMLElement,cs=getComputedStyle(sel);return{bg:cs.backgroundColor,otherBg:getComputedStyle(other).backgroundColor,shadow:cs.boxShadow,mark:sel.querySelector('.cal-mark.away')?.textContent}},D);
 assert.equal(look.bg,look.otherBg,'selected keeps the normal background');assert.match(look.shadow,/inset/);assert.equal(look.mark,'T');
 assert.match(await page.locator('.calendar-current').innerText(),/Bé nhỏ · Vắng 18:00–21:00 · không nấu phần · Ngủ nhà bà · Mẹ báo hộ/);
 // Back to the whole family: both people on that day, in the accessible name too.
 await tap(page.locator('[data-house="calendar-family"]'));await page.locator('#availability-form.family-view').waitFor();
 assert.equal(await page.locator(`.calendar-day[data-date="${D}"]`).getAttribute('aria-label'),`${dd} tháng ${dm}: Bố bận bữa tối; Bé nhỏ vắng bữa tối`);
 const lt2=await page.locator('.calendar-daylist').innerText();assert.match(lt2,/Bé nhỏ/);assert.match(lt2,/Vắng 18:00–21:00 · không nấu phần/);assert.match(lt2,/Mẹ báo hộ/);
 // Theme / language matrix: no overflow in VI+EN × light+dark (family view and edit view).
 for(const [lang,mode] of [['vi','dark'],['en','light'],['en','dark']]){
  await page.evaluate(()=>(0,eval)('closeModal')());await page.evaluate((l:string)=>(0,eval)('changeAppLanguage')(l),lang);await theme(page,mode);await page.waitForTimeout(120);
  await page.evaluate((d:string)=>{const b=document.createElement('button');b.dataset.house='calendar';b.dataset.date=d;document.body.append(b);b.click();b.remove()},D);await page.locator('#availability-form.family-view').waitFor();
  if(lang==='en'){assert.match(await page.locator('#calendar-month-label').innerText(),/^[A-Z][a-z]+ \d{4}$/);assert.deepEqual(await page.$$eval('.availability-weekdays span',(e:any[])=>e.map(x=>x.textContent)),['Mon','Tue','Wed','Thu','Fri','Sat','Sun']);
   assert.equal(await page.locator('[data-house="calendar-prev"]').getAttribute('aria-label'),'Previous month');assert.equal(await page.locator('[data-house="calendar-next"]').getAttribute('aria-label'),'Next month');
   assert.equal((await page.locator('#modal-title').innerText()).trim(),'Family monthly calendar');assert.equal((await page.locator('#calendar-member option').first().innerText()).trim(),'Whole family');
   assert.match(await page.locator(`.calendar-day[data-date="${D}"]`).getAttribute('aria-label'),/: Bố busy for dinner; Bé nhỏ away for dinner$/);
   const en=await page.locator('.calendar-daylist').innerText();assert.match(en,/Busy · still cooking their portion/);assert.match(en,/Away 18:00–21:00 · no portion/);assert.match(en,/reported by Mẹ on behalf/);assert.doesNotMatch(en,/Bận|Vắng|báo hộ/)}
  assert.match(await page.locator('.calendar-daylist').innerText(),lang==='en'?/Away 18:00–21:00 · no portion/:/Vắng 18:00–21:00 · không nấu phần/,'v1.7.9: the time shows on the day');
  await noOverflow(page,`${name} family ${lang} ${mode}`);
  if(mode==='dark')await shot(page,`${name}-family-${lang}-${mode}`);
  await tap(page.locator('.calendar-daylist [data-house="calendar-edit"][data-member="dad"]'));await page.locator('#availability-form.editing').waitFor();
  assert.match(await page.locator('#calendar-reporting').innerText(),lang==='en'?/Reporting for: Bố.*\(on behalf · reported by Mẹ\)/s:/Đang báo cho: Bố.*\(báo hộ/s);
  assert.equal(await page.locator('#calendar-status').inputValue(),'busy','edit starts from the saved entry');assert.equal(await page.locator('#calendar-note').inputValue(),'Họp muộn, ăn sau 8 giờ');
  await noOverflow(page,`${name} edit ${lang} ${mode}`);if(lang==='en'&&mode==='dark')await shot(page,`${name}-edit-${lang}-${mode}`);
 }
 // Today in EN/dark: the line lists both and opens the calendar on that day in family view.
 await page.evaluate(()=>(0,eval)('closeModal')());await page.waitForTimeout(100);
 const en=page.locator('#main [data-who-busy]');await en.waitFor();const et=await en.innerText();assert.match(et,/Who’s busy this week/);assert.match(et,/Bé nhỏ away\s+dinner/);assert.match(et,/Bố busy\s+dinner/);
 await noOverflow(page,name+' today en dark');await en.scrollIntoViewIfNeeded();await shot(page,`${name}-today-who-busy-en-dark`);
 await tap(en.locator('.who-busy-row.away').first());await page.locator('#availability-form.family-view .calendar-daylist').waitFor();assert.equal(await G(page,'availabilityFocus'),D);assert.equal(await page.locator('#calendar-member').inputValue(),'');
 await page.evaluate(()=>(0,eval)('closeModal')());
 // Schedule note on Today's attendance for that dinner uses the clearer wording.
 await page.evaluate((d:string)=>{const ev=(0,eval);ev(`selectedDate='${d}';attendanceType='dinner'`);(0,eval)('render')()},D);
 const note=page.locator('#main .attendance .schedule-note').first();await note.waitFor();const nt=await note.innerText();assert.match(nt,/Bố: Busy · still cooking their portion/);assert.match(nt,/Bé nhỏ: Away 18:00–21:00 · no portion/);
 // Offline (account-free device): saving still works and nothing errors.
 await context.setOffline(true);await page.evaluate(()=>{const ev=(0,eval);ev(`availabilityMember='ti';availabilitySelected=new Set([selectedDate]);availabilityMonth=selectedDate.slice(0,7)`);(0,eval)('availabilityModal')()});
 await page.locator('#availability-form.editing').waitFor();await page.locator('#calendar-status').selectOption('busy');await tap(page.locator('#modal-root .modal-footer [data-action="submit-form"]'));
 await page.waitForFunction((d:string)=>(0,eval)('state').availability?.ti?.[d]?.dinner?.status==='busy',D);await context.setOffline(false);
 // Reduced motion: the calendar adds no animation.
 assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('.calendar-day') as Element).animationName),'none');
 assert.deepEqual(errors,[],'no page errors at '+name);await context.close();console.log('✓',name,width+'×'+height);
}
await browser.close();console.log('Family calendar browser tests passed.');})().catch((e:any)=>{console.error(e);process.exit(1)});
