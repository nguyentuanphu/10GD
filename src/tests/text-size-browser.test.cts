// v1.7.10 owner question (7 Nov 2026): “Bạn đã audit khi size chữ thay đổi thì có bị tràn, rớt etc chưa?”
// Every main screen and the common sheets at all three text sizes (Vừa / Lớn / Rất lớn), in Vietnamese and English, at narrow phone,
// phone, tablet and desktop sizes: no sideways scroll, no label cut off or sticking out of its button, no word broken in half, no
// column so narrow that each word sits on its own line, the bottom bar still fits, and buttons keep a ≥ 44 px height.
// All failures are collected and listed together. Screenshots at “Rất lớn” are the release evidence in docs/reviews/v1.7.10/text-size
// (Chromium viewport simulation, not physical devices).
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert');
const dir='docs/reviews/v1.7.10/text-size';fs.mkdirSync(dir,{recursive:true});
const SIZES:any[]=[['narrow',{width:320,height:740}],['mobile',{width:375,height:812}],['tablet',{width:820,height:1100}],['desktop',{width:1280,height:800}]];
const TEXT_SIZES=['medium','large','xlarge'];
const MEMBERS=[['m-phu','Ba Phú'],['m-mi','Mẹ Mi'],['m-chi','Chi'],['m-tien','Tiên'],['m-ti','Cậu Tí']];
const TEXT_CHECK=`(()=>{const out=[];const scope=document.querySelector('#modal-root .modal')||document.body;const vis=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'};
 for(const e of scope.querySelectorAll('button,a,label,summary,.pill,.chip,.more-label,select')){if(!vis(e)||e.closest('.sr-only,[aria-hidden="true"],.ladybug'))continue;const t=(e.innerText||'').trim();if(!t)continue;
  if(e.tagName==='SELECT')continue;const cs=getComputedStyle(e);if(e.scrollWidth>e.clientWidth+2&&cs.overflowX!=='visible'||cs.textOverflow==='ellipsis'&&e.scrollWidth>e.clientWidth+1)out.push('cut: '+t.slice(0,40));
  if(e.tagName==='BUTTON'||e.tagName==='A'){const r=e.getBoundingClientRect();for(const c of e.querySelectorAll('span,b')){const q=c.getBoundingClientRect();if(q.width&&(q.left<r.left-2||q.right>r.right+2)){out.push('sticks out: '+t.slice(0,40));break}}}}
 const tw=document.createTreeWalker(scope,NodeFilter.SHOW_TEXT);let n;while((n=tw.nextNode())){const p=n.parentElement;if(!p||!vis(p)||p.closest('script,style,.sr-only,textarea,select,option'))continue;const re=/[\\p{L}\\p{N}]{3,}/gu;let m;while((m=re.exec(n.nodeValue))){const rg=document.createRange();rg.setStart(n,m.index);rg.setEnd(n,m.index+m[0].length);const rs=[...rg.getClientRects()].filter(x=>x.width>0.5);if(rs.length>1&&new Set(rs.map(x=>Math.round(x.top))).size>1)out.push('word broken: '+m[0])}}
 // v1.7.9 (owner, 6 Nov 2026: "chữ chạy khắp nơi"): text squeezed into a column so narrow that each word sits on its own line
 {const seen=new Set();const tw2=document.createTreeWalker(scope,NodeFilter.SHOW_TEXT);let n2;while((n2=tw2.nextNode())){const p=n2.parentElement;if(!p||seen.has(p)||!vis(p)||p.closest('script,style,.sr-only,textarea,select,option,svg'))continue;const words=[...n2.nodeValue.matchAll(/\S+/g)];if(words.length<3)continue;const tops=new Set();for(const w of words){const rg=document.createRange();rg.setStart(n2,w.index);rg.setEnd(n2,w.index+w[0].length);const r=rg.getClientRects()[0];if(r&&r.width>0)tops.add(Math.round(r.top))}if(tops.size>=words.length&&tops.size>=3){seen.add(p);out.push('one word per line: '+n2.nodeValue.trim().slice(0,40))}}}
 return out})()`;
// any text cut off by its box (hidden overflow or “…”), and a drop-down whose chosen option does not fit
const CLIPPED=`(()=>{const out=[];const scope=document.querySelector('#modal-root .modal')||document.body;const vis=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'};
 for(const e of scope.querySelectorAll('*')){if(!vis(e)||e.closest('.sr-only,[aria-hidden="true"],svg,.ladybug,textarea,input'))continue;const own=[...e.childNodes].some(n=>n.nodeType===3&&n.nodeValue.trim());if(!own)continue;const cs=getComputedStyle(e);
  if((cs.overflowX!=='visible'||cs.textOverflow==='ellipsis')&&e.scrollWidth>e.clientWidth+2)out.push('text cut: '+(e.innerText||'').trim().slice(0,40));
  let a=e.parentElement;while(a&&a!==scope){const as=getComputedStyle(a);/* rows that scroll sideways on purpose (chip rows) are fine */if(as.overflowX==='hidden'||as.overflowX==='clip')if(a.scrollWidth>a.clientWidth+2&&e.getBoundingClientRect().right>a.getBoundingClientRect().right+2){out.push('text cut by box: '+(e.innerText||'').trim().slice(0,40));break}if(as.overflowX==='auto'||as.overflowX==='scroll')break;a=a.parentElement}}
 const cv=document.createElement('canvas').getContext('2d');for(const s of scope.querySelectorAll('select')){if(!vis(s))continue;const cs=getComputedStyle(s);cv.font=cs.font;const t=s.options[s.selectedIndex]?.text||'';const room=s.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight);if(cv.measureText(t).width>room+1)out.push('drop-down cut: '+t.slice(0,40))}
 return [...new Set(out)]})()`;
// buttons and nav items that a finger has to hit, measured where they are visible
const TARGETS=`(()=>{const out=[];const scope=document.querySelector('#modal-root .modal')||document;for(const e of scope.querySelectorAll('.bottom-nav a,.bottom-nav button,#main .btn,#modal-root .btn,summary')){const r=e.getBoundingClientRect();if(!r.width||!r.height||getComputedStyle(e).visibility==='hidden')continue;if(r.height<43.5)out.push('small target '+Math.round(r.height)+'px: '+(e.innerText||e.getAttribute('aria-label')||'').trim().slice(0,30))}return out})()`;
const SCREENS:[string,string][]=[['today',`view='today';render()`],['planner',`view='planner';render()`],['shopping',`view='shopping';render()`],['recipes',`view='recipes';render()`],['insights',`view='insights';render()`],
 ['recipe-sheet',`view='recipes';render();showRecipe('r1')`],['appearance',`otherSettingsModal('appearance');document.querySelector('#modal-root .theme-fold')?.setAttribute('open','')`],['settings',`otherSettingsModal('')`]];
(async()=>{const browser=await chromium.launch();const root=process.cwd();const failures:string[]=[];let checked=0;
for(const lang of ['vi','en'])for(const [size,viewport] of SIZES){
 const ctx=await browser.newContext({locale:'vi-VN',viewport,reducedMotion:'reduce',timezoneId:'Australia/Sydney',serviceWorkers:'block'});
 await ctx.addInitScript((l:string)=>{if(sessionStorage.getItem('qa'))return;sessionStorage.setItem('qa','1');localStorage.setItem('guest/bep-language',l)},lang);
 const page=await ctx.newPage();const errors:string[]=[];page.on('pageerror',(e:any)=>errors.push(e.message));
 await page.route('https://kitchen.test/**',async(route:any)=>{const url=new URL(route.request().url());if(url.pathname.startsWith('/.netlify/')){const op=url.searchParams.get('op');return route.fulfill({json:op==='status'?{configured:false,connected:false}:op==='state'?{state:null,etag:null}:op==='families'?{families:[]}:{announcements:[],devices:[]}})}const file=path.join(root,'dist',url.pathname==='/'?'index.html':url.pathname);try{await route.fulfill({body:fs.readFileSync(file),contentType:({'.html':'text/html','.js':'application/javascript','.json':'application/json','.css':'text/css','.webp':'image/webp','.svg':'image/svg+xml','.png':'image/png'} as any)[path.extname(file)]||'application/octet-stream'})}catch{await route.fulfill({status:404,body:'Missing'})}});
 await page.goto('https://kitchen.test/#today');await page.locator('#main h1').waitFor({timeout:15000});
 await page.evaluate(`(()=>{state.preferences.onboardingComplete=true;state.members=${JSON.stringify(MEMBERS)}.map(([id,name],i)=>({id,name,weight:i<2?1:0.75,emoji:''}));const w=currentWeek();
  for(const d of Object.keys(w.days))for(const t of MEAL_TYPES){const m=w.days[d][t];if(!m)continue;m.attendance={};for(const p of state.members)m.attendance[p.id]='home'}
  for(const d of Object.keys(w.days).slice(0,3))w.days[d].dinner.recipes=[clone(state.recipes.find(x=>x.id==='r1')),clone(state.recipes.find(x=>x.id==='r16'))];
  const today=sydneyDate();selectedDate=today;state.availability={'m-phu':{[today]:{lunch:{status:'away',deduct:true,remind:false,note:''}}}};state.packSchedule={members:{'m-chi':[1,2,3,4,5]}};
  save();closeModal();view='today';render()})()`);
 for(const ts of TEXT_SIZES){
  await page.evaluate((t:string)=>{localStorage.setItem('bep-text-size',t);(globalThis as any).eval('applyThemePreferences()')},ts);
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.textSize),ts);
  for(const [name,open] of SCREENS){
   await page.evaluate(`closeModal();${open}`);await page.waitForTimeout(250);await page.evaluate(()=>scrollTo(0,0));
   const where=`${lang} ${size} ${ts} ${name}`;checked++;
   for(const b of await page.evaluate(TEXT_CHECK) as string[])failures.push(`${where}: ${b}`);
   for(const b of await page.evaluate(CLIPPED) as string[])failures.push(`${where}: ${b}`);
   for(const b of await page.evaluate(TARGETS) as string[])failures.push(`${where}: ${b}`);
   const wide=await page.evaluate(()=>{const m=document.querySelector('#modal-root .modal');return [document.documentElement.scrollWidth-innerWidth,m?m.scrollWidth-m.clientWidth:0]});
   if(wide[0]>1)failures.push(`${where}: page scrolls sideways by ${wide[0]} px`);if(wide[1]>1)failures.push(`${where}: sheet scrolls sideways by ${wide[1]} px`);
   if(ts==='xlarge'&&size!=='narrow'&&['today','shopping','recipe-sheet','appearance'].includes(name))await page.screenshot({path:`${dir}/${lang}-${size}-xlarge-${name}.png`});
  }
 }
 if(errors.length)failures.push(`${lang} ${size}: runtime errors ${errors.join(' | ')}`);
 await ctx.close();
}
await browser.close();
if(failures.length){console.error(failures.join('\n'));assert.fail(`${failures.length} text-size problems in ${checked} screens`)}
console.log(`PASS text sizes Vừa / Lớn / Rất lớn: ${checked} screens (${SCREENS.map(s=>s[0]).join(', ')}) at 320 / 375 / 820 / 1280 in VI and EN — no sideways scroll, no cut or broken labels, targets ≥ 44 px`);
})().catch(e=>{console.error(e);process.exit(1)});
