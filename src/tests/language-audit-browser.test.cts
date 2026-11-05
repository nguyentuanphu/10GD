// Deep language crawl: every screen, every dialog reachable by one click, every <select> option list.
// v1.7.5 owner reports (4–5 Nov 2026): “khi dùng tiếng Việt vẫn thấy tiếng Anh, và nhiều chỗ vẫn show tiếng Việt khi đang dùng
// tiếng Anh … cần kiểm tra lại kỹ hết” (with a photo of the recipe form's protein list). Deep audit, both languages, phone and
// desktop, with a generated week of meals: every screen, every dialog one click away, every action inside those dialogs
// (two levels), every visible <select> option list, placeholders, titles and accessible labels. Fails on text in the other
// language, including half-translated sentences. Documented exceptions, nothing else:
//  - family content (member, store, own-recipe and own-ingredient names) and reference-recipe content (names, preparation,
//    steps): the English edition of the 740 reference recipes is a separate, owner-approved release;
//  - owner-approved loanwords (offline, online, bill, Weekends feast, school lunch box, soup, brand and unit names);
//  - the voice hint's example sentence, which deliberately mixes Vietnamese and English.
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert');const root=process.cwd();
const VI=/[ăâđêôơưàáạảãằắặẳẵầấậẩẫèéẹẻẽềếệểễìíịỉĩòóọỏõồốộổỗờớợởỡùúụủũừứựửữỳýỵỷỹ]/i;
const EN=/(?<![\wà-ỹ])(the|and|your|you|for|with|add|save|cancel|delete|edit|open|close|dish|dishes|meal|meals|breakfast|lunch|dinner|weekly|week|shopping|family|price|prices|settings|recipe|recipes|today|plan|choose|photo|take|show|more|items?|list|not|this|from|sync|night|main|side|portion|portions|auto|unit|amount|name|search|all|new|done|back|next|help|guide|account|bought|cooked|standard|piece|slice|min|tick|estimate|budget|pork|chicken|beef|fish|shrimp|egg|eggs|plant|mixed|fridge|freezer|pantry|store|stores|receipt|receipts|total|other|none|yes|no|off|on|light|dark|default|daily|weekend|members?|people|servings?|minutes?|day|days|soup|noodle|vegetables?|each|bunch|pack|bag|box|tray|bottle|clove|cup|spoon|tablespoon|teaspoon|handful|whole|morning|evening|afternoon|reminder|reminders|notification|notifications|urgent|message|send|share|copy|print|import|export|backup|restore|language|theme|currency|retailer|product|products|catalog|catalogue|library|reference|favourites?|filter|filters|sort|clear|reset|apply|confirm|remove|undo|lock|unlock|status|ready|loading|error|unknown|missing|optional|required|note|notes?)(?![\wà-ỹ])/i;
const LOAN=/(?<![\wà-ỹ])(offline|online|bill|notes|weekends feast|feast|school lunch box|so giá|famtray|app|ok|email|pin|wi-fi|healthy|csv|qr|aud|vnd|usd|ios|android|iphone|ipad|chrome|safari|whisper|pwa|push|studio|google|apple|woolworths|coles|aldi|harris farm|costco|iga|amazon|chemist warehouse|vi|en|kg|g|ml|l|soup|open-meteo|messenger)(?![\wà-ỹ])/gi;
const SKIP=/delete|remove|sign-?out|logout|reset|clear-all|import|export|restore|leave|unpair|uninstall|device-only|switch|close-modal|print|download|reload|install|ladybug|feedback|report/i;
(async()=>{const browser=await chromium.launch();const failures=[];let actions=0;
for(const WIDTH of [375,1280])for(const lang of ['vi','en']){
 const ctx=await browser.newContext({viewport:{width:WIDTH,height:900},reducedMotion:'reduce',timezoneId:'Australia/Sydney',serviceWorkers:'block'});const page=await ctx.newPage();
 page.on('dialog',d=>d.dismiss().catch(()=>{}));const errors=new Set();page.on('pageerror',e=>errors.add(e.message.slice(0,160)));
 await page.route('https://kitchen.test/**',async route=>{const url=new URL(route.request().url());if(url.pathname.startsWith('/.netlify/')){const op=url.searchParams.get('op');return route.fulfill({json:op==='status'?{configured:false,connected:false}:op==='state'?{state:null,etag:null}:op==='families'?{families:[]}:{announcements:[],devices:[],items:[]}})}const file=path.join(root,'dist',url.pathname==='/'?'index.html':url.pathname);try{await route.fulfill({body:fs.readFileSync(file),contentType:({'.html':'text/html','.js':'application/javascript','.json':'application/json','.css':'text/css','.webp':'image/webp','.svg':'image/svg+xml','.png':'image/png'})[path.extname(file)]||'application/octet-stream'})}catch{await route.fulfill({status:404,body:'Missing'})}});
 await page.addInitScript(l=>{try{localStorage.setItem('guest/bep-language',l)}catch{}},lang);
 await page.goto('https://kitchen.test/#today');await page.locator('#main .page-heading').waitFor({timeout:15000});await page.waitForTimeout(1500);
 // realistic data: a generated week from the library, pantry lots and a receipt
 await page.evaluate(()=>{try{const g=globalThis.eval;g("familyGenerate(state,weekStart,{sourceMode:'library'});save();render()")}catch(e){}});await page.waitForTimeout(800);
 const hits=new Map();const add=(t,where)=>{if(!hits.has(t))hits.set(t,new Set());hits.get(t).add(where)};
 const collect=async(where,scope)=>{const found=await page.evaluate(({lang,VIs,ENs,LOANs,scope})=>{const VI=new RegExp(VIs,'i'),EN=new RegExp(ENs,'i'),LOAN=new RegExp(LOANs,'gi');const st=globalThis.eval('typeof state!=="undefined"?state:null');
   const names=[...(st?.members||[]).map(m=>m.name),...(st?.recipes||[]).filter(r=>r.custom).map(r=>r.name),...(st?.stores||[]).map(s=>s.name),...(st?.recipes||[]).map(r=>r.name),...(st?.recipes||[]).map(r=>r.prep),...Object.values(st?.ingredientCatalog||{}).map(x=>x.name)].filter(Boolean).sort((a,b)=>b.length-a.length);
   const strip=t=>{let x=t;for(const n of names)x=x.split(n).join(' ');return x};
   const bad=t0=>{if(/2 kg pork belly với một bó rau muống/.test(t0))return null;const t=strip(t0).replace(/\s+/g,' ').trim();if(t.length<2||!/[a-zA-Zà-ỹ]/.test(t))return null;return lang==='en'?(VI.test(t)?t0.trim():null):(EN.test(t.replace(LOAN,' '))?t0.trim():null)};
   const rootEl=scope?document.querySelector(scope):document.body;if(!rootEl)return[];
   const visible=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'};
   const skip=el=>el.closest('[data-user-content],script,style,svg,code,[translate=no],.steps-text,.language-control,#toast,.recipe-name');
   const out=[];const w=document.createTreeWalker(rootEl,NodeFilter.SHOW_TEXT);let n;while((n=w.nextNode())){const el=n.parentElement;if(!el||skip(el))continue;if(el.closest('option')){const sel=el.closest('select');if(!sel||!visible(sel))continue}else if(!visible(el))continue;const b=bad(n.nodeValue);if(b)out.push((el.closest('option')?'[option] ':'')+b)}
   for(const el of rootEl.querySelectorAll('[placeholder],[aria-label],[title],optgroup[label]')){if(skip(el)||(!visible(el)&&el.tagName!=='OPTGROUP'))continue;for(const a of ['placeholder','aria-label','title','label']){if(a==='label'&&el.tagName!=='OPTGROUP')continue;const v=el.getAttribute(a);const b=v&&bad(v);if(b)out.push('['+a+'] '+b)}}
   return out},{lang,VIs:VI.source,ENs:EN.source,LOANs:LOAN.source,scope});for(const t of found)add(t,where)};
 const go=async h=>{await page.evaluate(h=>{try{globalThis.eval('closeModal()')}catch{};location.hash=h},h);await page.waitForTimeout(450)};
 const clicked=new Set();
 for(const hash of ['today','planner','shopping','recipes','pantry','expenses','insights','products']){
  await go(hash);await collect('#'+hash);
  const sigs=await page.evaluate(()=>[...document.querySelectorAll('[data-action],[data-fm],[data-feature],[data-personal],[data-rc],[data-change-tab],[data-section]')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&!e.disabled}).map(e=>{for(const a of ['data-action','data-fm','data-feature','data-personal','data-rc']){const v=e.getAttribute(a);if(v)return a+'="'+v+'"'+(e.dataset.section?'[data-section="'+e.dataset.section+'"]':'')}return null}).filter(Boolean));
  for(const sig of [...new Set(sigs)]){if(clicked.has(sig)||SKIP.test(sig))continue;clicked.add(sig);
   try{await go(hash);const l=page.locator('['+sig.replace(/\]\[/,'][')+']'.replace(/^\[\[/,'[')).first();
    const sel=sig.startsWith('data')?'['+sig.split('[')[0]+']'+(sig.includes('[data-section')?'['+sig.split('[')[1]:''):sig;
    const loc=page.locator(sel).filter({visible:true}).first();if(!(await loc.count()))continue;await loc.click({timeout:2500});await page.waitForTimeout(500);
    await collect(hash+' → '+sig);
    // level 2: every action inside the dialog that just opened
    const inner=await page.evaluate(()=>[...document.querySelectorAll('#modal-root [data-action],#modal-root [data-fm],#modal-root [data-feature],#modal-root [data-personal],#modal-root [data-rc],#modal-root [data-rci],#modal-root summary')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&!e.disabled}).map(e=>{for(const a of ['data-action','data-fm','data-feature','data-personal','data-rc','data-rci']){const v=e.getAttribute(a);if(v)return '['+a+'="'+v+'"]'}return 'summary'}));
    for(const isel of [...new Set(inner)]){const key=sig+' » '+isel;if(clicked.has(key)||SKIP.test(isel)||/submit-form|save|send|cook|copy/.test(isel))continue;clicked.add(key);
     try{const il=page.locator('#modal-root '+isel).filter({visible:true}).first();if(!(await il.count()))continue;await il.click({timeout:2000});await page.waitForTimeout(400);await collect(key)}catch(e){}}
   }catch(e){}
  }
 }
 // account menu + settings
 try{await go('today');await page.locator('.top-avatar.account-avatar').filter({visible:true}).first().click();await page.waitForTimeout(300);await collect('account menu');await page.locator('#account-menu [data-personal="account-security"]').first().click();await page.waitForTimeout(600);await collect('settings');
  const cards=await page.locator('#modal-root details, #modal-root [data-settings-card], #modal-root .settings-card summary').count();for(let i=0;i<cards;i++){try{await page.locator('#modal-root .settings-card summary, #modal-root details > summary').nth(i).click({timeout:1000});await page.waitForTimeout(150)}catch{}}await collect('settings (all cards open)')}catch(e){}
 actions+=clicked.size;for(const [t,w] of hits)failures.push(`${lang} ${WIDTH}px · ${[...w][0]}: ${t.split('\n')[0].slice(0,150)}`);assert.deepEqual([...errors],[],`no page errors ${lang} ${WIDTH}`);await ctx.close()}
await browser.close();
assert.deepEqual(failures,[],'wrong-language text:\n'+failures.join('\n'));
console.log(`PASS deep language audit: VI and EN at 375 and 1280 px, ${actions} screens/dialogs/actions opened (two levels) with a generated week, option lists and accessible labels included — no text in the other language`);
})().catch(e=>{console.error(e);process.exit(1)});
