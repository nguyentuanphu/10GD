// Unit registry browser QA (v1.5): grouped unit picker with icons, search, keyboard,
// recent units and shopping-row icons at 320/375/820/1280 px, VI/EN, light/dark.
// Saves screenshots and a generated icon sheet to docs/reviews/v1.5/units/.
// Device-only mode; the shopping list is a synthetic QA plan, not family data.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import vm from 'node:vm';
import {chromium} from 'playwright';
const origin='https://kitchen.test',out='docs/reviews/v1.5/units';
const mime:any={'.js':'application/javascript','.css':'text/css','.html':'text/html','.webmanifest':'application/manifest+json','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
const sizes:any={narrow:{width:320,height:740},mobile:{width:375,height:812},tablet:{width:820,height:1100},desktop:{width:1280,height:800}};
// Mixed buying units assigned to the first shopping rows (amounts only; no grams invented).
const ROW_UNITS=['chai','lọ','bó','cây','củ','khay','vỉ','hũ','gói','lon'];
const EXTRAS=[['Chao','2 lọ'],['Mắm tôm','1 hũ'],['Nước ngọt','1 két'],['Viên rửa chén','60 viên'],['Giấy vệ sinh','2 cuộn'],['Gạo thơm','1 bao'],['Dầu ăn','1 can'],['Sữa hộp','2 lốc'],['Bột giặt','40 lần giặt']];

function iconSheet(){
 const ctx=vm.createContext({});vm.runInContext(readFileSync('dist/unit-registry.js','utf8')+'\n;this.R={UNIT_REGISTRY,unitIconSvg,UNIT_CATEGORIES}',ctx);const R=(ctx as any).R;
 const cats=[['weight','Cân/đo · Weigh'],['volume','Cân/đo · Measure'],['count','Đếm · Count'],['container','Bao bì · Packaging'],['produce','Rau củ · Produce']];
 const esc=(s:string)=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
 const card=(u:any)=>`<figure><div class="big">${R.unitIconSvg(u.vi,{size:48})}</div><div class="small">${R.unitIconSvg(u.vi,{size:20})}${R.unitIconSvg(u.vi,{size:28})}</div><figcaption><b>${esc(u.viLabel)}</b><span>${esc(u.en)}</span><code>${u.id}</code>${u.approx?'<em>ước chừng / approx.</em>':''}</figcaption></figure>`;
 return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unit icons</title><style>
:root{--unit-accent:#c87649;--bg:#faf9f5;--ink:#273d33;--muted:#7b8379;--card:#fff;--line:#e7e7df}
html[data-theme="dark"]{--unit-accent:#eaa676;--bg:#121a16;--ink:#e6efe9;--muted:#97a99e;--card:#18221d;--line:#26352e}
body{margin:0;padding:16px;background:var(--bg);color:var(--ink);font:14px/1.4 system-ui,sans-serif}h1{font-size:20px;margin:0 0 4px}p{color:var(--muted);margin:0 0 12px}
h2{font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin:18px 0 8px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:10px}
figure{margin:0;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px;display:flex;flex-direction:column;align-items:center;gap:6px}
.small{display:flex;gap:10px;align-items:center}figcaption{display:flex;flex-direction:column;align-items:center;text-align:center}figcaption span{color:var(--muted);font-size:12px}code{font-size:11px;color:var(--muted)}em{font-size:11px;color:var(--unit-accent)}
</style></head><body><h1>Biểu tượng đơn vị · Unit icons</h1><p>${R.UNIT_REGISTRY.length} units + custom. Original 24×24 line icons (currentColor + one accent token), shown at 48, 20 and 28 px. Icons are decorative; the text label is always shown in the app.</p>
${cats.map(([c,t])=>`<h2>${t}</h2><div class="grid">${R.UNIT_REGISTRY.filter((u:any)=>u.category===c).map(card).join('')}</div>`).join('')}
<h2>Tự đặt · Custom</h2><div class="grid"><figure><div class="big">${R.unitIconSvg(null,{size:48})}</div><div class="small">${R.unitIconSvg(null,{size:20})}${R.unitIconSvg(null,{size:28})}</div><figcaption><b>đơn vị riêng</b><span>custom unit</span><code>custom</code></figcaption></figure></div></body></html>`;
}

async function main(){
 mkdirSync(out,{recursive:true});
 const sheet=iconSheet();writeFileSync(out+'/unit-icons.html',sheet);
 const browser=await chromium.launch();const shots:string[]=[];
 async function open({viewport=sizes.mobile,lang='vi',theme='light'}:any={}){
  const context=await browser.newContext({viewport,serviceWorkers:'block',reducedMotion:'reduce',colorScheme:theme});
  await context.addInitScript(({lang,theme})=>{if(sessionStorage.getItem('qa-init'))return;sessionStorage.setItem('qa-init','1');localStorage.setItem('bep-theme-mode',theme);localStorage.setItem('guest/bep-language',lang);localStorage.setItem('bep-local-locked','yes');localStorage.removeItem('guest/bep-recent-units')},{lang,theme});
  const page=await context.newPage(),errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route(origin+'/**',async route=>{const url=new URL(route.request().url()),path=url.pathname;
   if(path.startsWith('/.netlify/')){await route.fulfill({status:401,json:{error:'no'}});return}
   if(path==='/startup-scripts.json'){await route.fulfill({json:JSON.parse(readFileSync('dist/startup-scripts.json','utf8'))});return}
   const file=resolve('dist',path==='/'?'index.html':path.slice(1));
   try{await route.fulfill({contentType:mime[extname(file)]||'application/octet-stream',body:readFileSync(file)})}catch{await route.fulfill({status:404,body:'Not found'})}});
  await page.goto(origin+'/#shopping',{waitUntil:'domcontentloaded'});
  for(let attempt=0;;attempt++){try{await page.waitForFunction(()=>typeof (globalThis as any).findUnit==='function'&&typeof (globalThis as any).openPurchasePicker==='function'&&document.querySelector('#main h1'),null,{timeout:20000});await page.evaluate(`(()=>{state.preferences.onboardingComplete=true;const w=currentWeek();const day=w.days[selectedDate]||Object.values(w.days)[0];const r=state.recipes.find(x=>x.id==='r1')||state.recipes[0];day.dinner.recipes=[clone(r)];day.dinner.cooked=false;const [start,end]=shopDates();const units=${JSON.stringify(ROW_UNITS)};shopping(state,w,start,end).filter(x=>shoppingHasAmount(x)&&!x.skip).slice(0,units.length).forEach((x,i)=>setBuyingUnits(w,start,end,x.id,{unit:units[i],amount:i%3+1,basePerUnit:null,pricePerUnit:null,note:''}));w.extras=${JSON.stringify(EXTRAS)}.map(([name,qty],i)=>({id:'qa-extra-'+i,name,qty,cost:0,currency:'AUD',done:false}));save();closeModal();view='shopping';render()})()`);break}catch(e){if(attempt>3)throw e;await page.waitForTimeout(700)}}
  await page.waitForTimeout(250);
  return {page,context,errors};
 }
 const overflow=async(page:any,label:string)=>{const o=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.ok(o<=1,label+': horizontal overflow '+o+'px')};
 const shot=async(page:any,name:string)=>{await page.screenshot({path:`${out}/${name}.png`,fullPage:false});shots.push(name)};
 const scrollToRows=async(page:any)=>{await page.evaluate(()=>{const el=document.querySelector('.shopping-group');if(el)scrollTo(0,el.getBoundingClientRect().top+scrollY-70)});await page.waitForTimeout(150)};
 const visibleChips=(page:any)=>page.evaluate(()=>[...document.querySelectorAll('#purchase-unit-choice .unit-chip')].filter((c:any)=>!c.hidden&&c.offsetParent!==null&&c.closest('.unit-chip-group:not([hidden])')).map((c:any)=>c.dataset.unitChoice));
 const openPicker=async(page:any)=>{await page.locator('[data-action="purchase-quantity"]').first().click();await page.waitForSelector('#purchase-unit-choice .unit-chip');await page.waitForTimeout(100)};
 try{
  // 1. Shopping rows: icon + text label for registry units; custom units get the generic icon.
  for(const [lang,theme] of [['vi','light'],['en','dark'],['vi','dark'],['en','light']]){
   for(const size of ['mobile','tablet','desktop']){
    const {page,context,errors}=await open({viewport:sizes[size],lang,theme});
    const rows=await page.evaluate(()=>[...document.querySelectorAll('.shop-row .unit-qty')].map((el:any)=>({id:el.dataset.unitId,icon:el.querySelector('svg')?.getAttribute('data-unit-icon'),hidden:el.querySelector('svg')?.getAttribute('aria-hidden'),text:el.querySelector('.unit-qty-text')?.textContent.trim()})));
    assert.ok(rows.length>=EXTRAS.length+4,`${lang} ${size}: unit icons render in shopping rows (${rows.length})`);
    assert.ok(rows.every((r:any)=>r.icon&&r.hidden==='true'&&/\d/.test(r.text)&&r.text.length>2),'every row icon is decorative and keeps a text label');
    const texts=rows.map((r:any)=>r.text).join(' | ');
    if(lang==='en'){assert.match(texts,/bottles?|jars?|bunch|crate|tablets|rolls|sack|jerrycan|multipacks|washes/);assert.doesNotMatch(texts,/\d chai\b|\d lọ\b/,'EN rows use English unit labels')}
    else assert.match(texts,/\d chai|\d lọ/);
    for(const id of ['jar','tub','crate','tablet','roll','sack','jerrycan','multipack','wash'])assert.ok(rows.some((r:any)=>r.id===id),`${lang} ${size}: extra row with ${id} shows its icon`);
    await overflow(page,`rows ${lang} ${theme} ${size}`);
    if(theme==='light'&&lang==='vi'||theme==='dark'&&lang==='en'){await scrollToRows(page);await shot(page,`shopping-${lang}-${theme}-${size}`)}
    assert.deepEqual(errors,[]);await context.close();
   }
  }
  // 2. Unit picker: category groups, headings, touch targets, search, keyboard, save + recent.
  for(const [lang,theme,size] of [['vi','light','mobile'],['vi','light','tablet'],['vi','light','desktop'],['en','dark','mobile'],['en','dark','tablet'],['en','dark','desktop'],['vi','dark','mobile'],['en','light','mobile'],['vi','light','narrow'],['en','dark','narrow']] as const){
   const {page,context,errors}=await open({viewport:sizes[size],lang,theme});
   await openPicker(page);
   const groups=await page.evaluate(()=>[...document.querySelectorAll('#purchase-unit-choice .unit-chip-group')].map((g:any)=>[g.dataset.group,g.querySelector('h4').textContent]));
   const keys=groups.map((g:any)=>g[0]);
   for(const k of ['measure','count','container','produce','other'])assert.ok(keys.includes(k),`${size}: picker has ${k} group`);
   const heads=groups.map((g:any)=>g[1]).join('|');
   assert.match(heads,lang==='vi'?/Cân\/đo.*Đếm.*Bao bì.*Rau củ/:/Weigh \/ measure.*Count.*Packaging.*Produce/,'category headings follow the UI language');
   const small=await page.evaluate(()=>[...document.querySelectorAll('#purchase-unit-choice .unit-chip,#unit-search')].filter((e:any)=>e.offsetParent&&e.getBoundingClientRect().height<43.5).map((e:any)=>e.textContent));
   assert.deepEqual(small,[],`${size}: unit chips are at least 44px tall`);
   const iconless=await page.evaluate(()=>[...document.querySelectorAll('#purchase-unit-choice .unit-chip')].filter((c:any)=>!c.querySelector('svg[aria-hidden="true"]')||!c.textContent.trim()).length);
   assert.equal(iconless,0,'every chip has a decorative icon and a text label');
   if(lang==='en')assert.ok(await page.locator('.unit-chip[data-unit-choice="lọ"]',{hasText:'jar'}).count()>0,'EN chip label for lọ is "jar"');
   else assert.ok(await page.locator('.unit-chip[data-unit-choice="lọ"]',{hasText:'lọ'}).count()>0);
   await overflow(page,`picker ${lang} ${theme} ${size}`);
   const chipOverflow=await page.evaluate(()=>{const b=document.querySelector('#purchase-unit-choice') as any;return b.scrollWidth-b.clientWidth});assert.ok(chipOverflow<=1,size+': chip box does not scroll sideways');
   if(size!=='narrow'||lang==='vi')await shot(page,`picker-${lang}-${theme}-${size}`);
   // Search by EN and VI synonyms, with and without diacritics.
   for(const [q,expect] of [['jar','lọ'],['lọ','lọ'],['lo','lọ'],['bottle','chai'],['tub','hũ'],['crate','két'],['dozen','tá'],['lan giat','lần giặt'],['tin','lon']]){
    await page.fill('#unit-search',q);const vis=await visibleChips(page);assert.ok(vis.includes(expect),`search ${q} shows ${expect}: ${vis}`);assert.ok(vis.includes('__custom'),'custom unit stays available while searching');
    if(q==='jar')assert.deepEqual(vis.filter((v:string)=>v!=='__custom'),['lọ'],'jar only matches lọ');
   }
   if(size==='mobile'&&lang==='vi'){await page.fill('#unit-search','lọ');await shot(page,'picker-search-vi-light-mobile')}
   if(size==='mobile'&&lang==='en'&&theme==='dark'){await page.fill('#unit-search','jar');await shot(page,'picker-search-en-dark-mobile')}
   // Keyboard: arrow keys move between chips; Enter selects; focus stays on the chosen chip.
   await page.fill('#unit-search','');await page.locator('#purchase-unit-choice .unit-chip-group[data-group="container"] .unit-chip').first().focus();
   const first=await page.evaluate(()=>(document.activeElement as any).dataset.unitChoice);await page.keyboard.press('ArrowRight');const second=await page.evaluate(()=>(document.activeElement as any).dataset.unitChoice);assert.notEqual(first,second,'ArrowRight moves focus to the next chip');
   await page.locator('#purchase-unit-choice .unit-chip[data-unit-choice="lọ"]').first().focus();await page.keyboard.press('Enter');await page.waitForTimeout(100);
   assert.equal(await page.evaluate(()=>(document.activeElement as any)?.dataset?.unitChoice),'lọ','focus returns to the chosen chip after re-render');
   assert.equal(await page.locator('#purchase-unit-choice .unit-chip[data-unit-choice="lọ"][aria-pressed="true"]').count()>0,true,'chosen chip is pressed');
   assert.equal(await page.evaluate('purchasePicker.unit'),'lọ');if(lang==='en')assert.match(await page.locator('#purchase-wheel .weight-option.selected').innerText(),/\d+ jars?/,'EN wheel uses the English unit label');
   if(size==='mobile'){
    await page.fill('#weight-exact','2');await page.locator('[data-action="save-purchase-quantity"]').click();await page.waitForTimeout(150);
    const saved=await page.evaluate('Object.values(currentWeek().buyingUnits).flatMap(r=>Object.values(r)).map(p=>p.unit)');assert.ok(saved.includes('lọ'),'stored unit stays the plain VI string');
    await openPicker(page);const recent=await page.evaluate(()=>[...document.querySelectorAll('.unit-chip-group[data-group="recent"] .unit-chip')].map((c:any)=>c.dataset.unitChoice));assert.ok(recent.includes('lọ'),'recently used unit shows first: '+recent);
    // Custom unit with no registry match: generic icon, typed name carried into the field.
    await page.fill('#unit-search','nửa con');assert.equal(await page.locator('.unit-search-empty').isVisible(),true,'no-match hint shown');
    await page.locator('.unit-chip[data-unit-choice="__custom"]').click();await page.waitForSelector('#purchase-custom-unit');assert.equal(await page.inputValue('#purchase-custom-unit'),'nửa con');
    assert.equal(await page.locator('.unit-chip[data-unit-choice="__custom"] svg[data-unit-icon="custom"]').count(),1,'custom unit has the generic icon');
    if(lang==='vi'&&theme==='light')await shot(page,'picker-custom-vi-light-mobile');
   }
   assert.deepEqual(errors,[]);await context.close();
  }
  // 3. Icon sheet (generated from the registry) at the three sizes, light and dark.
  for(const theme of ['light','dark'])for(const size of ['mobile','tablet','desktop']){
   const context=await browser.newContext({viewport:sizes[size],colorScheme:theme as any});const page=await context.newPage();await page.setContent(sheet.replace('<html lang="vi">',`<html lang="vi" data-theme="${theme}">`));
   const n=await page.locator('figure svg').count();assert.ok(n>=41*3,'icon sheet lists every unit icon');await overflow(page,'icon sheet '+size);
   await shot(page,`icon-sheet-${theme}-${size}`);await context.close();
  }
  console.log('Units browser QA passed; screenshots:',shots.length);
 }finally{await browser.close()}
}
main().catch(error=>{console.error(error);process.exit(1)});
