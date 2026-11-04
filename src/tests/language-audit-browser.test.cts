// v1.7.5 owner report (4 Nov 2026): “khi dùng tiếng Việt vẫn thấy tiếng Anh, và nhiều chỗ vẫn show tiếng Việt khi đang
// dùng tiếng Anh”. Walks the main screens and dialogs in both languages and fails on any visible text or accessible
// label in the other language, including half-translated sentences. Exceptions are listed here, not hidden:
//  - names the family typed (members, their own recipes) — never translated;
//  - loanwords the owner chose to keep in Vietnamese (offline, online, bill, Notes, Weekends feast, school lunch box…);
//  - cooking steps of the 740 reference recipes: their English edition is a separate release (owner decision, 4 Nov 2026).
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert');
const VI=/[ăâđêôơưàáạảãằắặẳẵầấậẩẫèéẹẻẽềếệểễìíịỉĩòóọỏõồốộổỗờớợởỡùúụủũừứựửữỳýỵỷỹ]/i;
const EN_WORDS=/(?<![\wà-ỹ])(the|and|your|you|for|with|add|save|cancel|delete|edit|open|close|dish|dishes|meal|meals|breakfast|lunch|dinner|weekly|week|shopping|family|price|prices|settings|recipe|recipes|today|plan|choose|photo|take|show|more|items?|list|not|this|from|sync|night|main|side|portion|portions|auto|unit|amount|name|search|all|new|done|back|next|help|guide|account|bought|cooked|standard|piece|slice|min|tick|estimate|budget)(?![\wà-ỹ])/i;
const VI_LOANWORDS=/(?<![\wà-ỹ])(offline|online|bill|notes|weekends feast|feast|school lunch box|so giá|famtray|app|ok|email|pin|wi-fi|healthy)(?![\wà-ỹ])/gi;
const sizes:any={mobile:{width:375,height:812},tablet:{width:820,height:1100},desktop:{width:1280,height:800}};
(async()=>{const browser=await chromium.launch();const root=process.cwd(),dir='docs/reviews/v1.7.5/language';fs.mkdirSync(dir,{recursive:true});const failures:string[]=[];
for(const lang of ['vi','en'])for(const size of ['mobile','tablet','desktop']){
 const page=await browser.newPage({viewport:sizes[size],reducedMotion:'reduce',timezoneId:'Australia/Sydney'});const errors:string[]=[];page.on('pageerror',(e:any)=>errors.push(e.message));
 await page.route('https://kitchen.test/**',async(route:any)=>{const url=new URL(route.request().url());if(url.pathname.startsWith('/.netlify/')){const op=url.searchParams.get('op');return route.fulfill({json:op==='status'?{configured:false,connected:false}:op==='state'?{state:null,etag:null}:op==='families'?{families:[]}:{announcements:[],devices:[]}})}const file=path.join(root,'dist',url.pathname==='/'?'index.html':url.pathname);try{await route.fulfill({body:fs.readFileSync(file),contentType:({'.html':'text/html','.js':'application/javascript','.json':'application/json','.css':'text/css','.webp':'image/webp','.svg':'image/svg+xml','.png':'image/png'} as any)[path.extname(file)]||'application/octet-stream'})}catch{await route.fulfill({status:404,body:'Missing'})}});
 await page.addInitScript((l:string)=>{try{localStorage.setItem('guest/bep-language',l)}catch{}},lang);
 await page.goto('https://kitchen.test/#today');await page.locator('#main .page-heading').waitFor({timeout:15000});await page.waitForTimeout(800);
 const collect=async(where:string)=>{await page.waitForTimeout(500);const found:string[]=await page.evaluate(({lang,VIs,ENs,LOANs}:any)=>{const VI=new RegExp(VIs,'i'),EN=new RegExp(ENs,'i'),LOAN=new RegExp(LOANs,'gi');const st:any=typeof (globalThis as any).eval==='function'?(globalThis as any).eval('typeof state!=="undefined"?state:null'):null,names=new Set<string>([...(st?.members||[]).map((m:any)=>m.name),...(st?.recipes||[]).filter((r:any)=>r.custom).map((r:any)=>r.name)]);
   const visible=(el:any)=>{if(!el)return false;const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'};
   const skip=(el:any)=>el.closest('[data-user-content],script,style,svg,code,[translate=no],.steps-text,.language-control,#toast');
   const strip=(t:string)=>{let x=t;for(const n of names)if(n)x=x.split(n).join(' ');return x};
   const bad=(t0:string)=>{const t=strip(t0).replace(/\s+/g,' ').trim();if(t.length<3||!/[a-zA-Zà-ỹ]/.test(t))return null;return lang==='en'?(VI.test(t)?t0.trim():null):(EN.test(t.replace(LOAN,' '))?t0.trim():null)};
   const out:string[]=[];const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n:any;while((n=w.nextNode())){const el=n.parentElement;if(!visible(el)||skip(el))continue;const b=bad(n.nodeValue);if(b)out.push(b)}
   for(const el of document.querySelectorAll('[placeholder],[aria-label],[title]')){if(!visible(el)||skip(el))continue;for(const a of ['placeholder','aria-label','title']){const v=el.getAttribute(a);const b=v&&bad(v);if(b)out.push('['+a+'] '+b)}}
   return out},{lang,VIs:VI.source,ENs:EN_WORDS.source,LOANs:VI_LOANWORDS.source});
  for(const t of new Set(found))failures.push(`${lang} ${size} ${where}: ${t.slice(0,140)}`)};
 const go=async(hash:string)=>{await page.evaluate((h:string)=>{(window as any).closeModal?.();location.hash=h},hash);await page.waitForTimeout(600)};
 const open=async(sel:string,hash:string,where:string,first?:string)=>{await go(hash);if(first){const f=page.locator(first+':visible').first();if(await f.count()){await f.click();await page.waitForTimeout(300)}}const l=page.locator(sel+':visible').first();if(!(await l.count()))return failures.push(`${lang} ${size} ${where}: control ${sel} not found`);await l.click();await page.locator('#modal-root .modal').first().waitFor({timeout:5000}).catch(()=>{});await collect(where);if(size==='mobile')await page.screenshot({path:`${dir}/${lang}-mobile-${where}.png`})};
 for(const hash of ['today','planner','shopping','recipes','pantry','expenses','insights','products']){await go(hash);await collect('#'+hash);if(size==='mobile'&&['today','shopping','expenses'].includes(hash))await page.screenshot({path:`${dir}/${lang}-mobile-${hash}.png`})}
 await open('[data-fm="new"]','recipes','recipe-form');
 await open('[data-fm="edit-meal"]','planner','meal-editor');
 await open('#account-menu [data-personal="account-security"]','today','settings','.top-avatar.account-avatar');
 assert.deepEqual(errors,[],'no page errors '+lang+' '+size);await page.close()}
await browser.close();
assert.deepEqual(failures,[],'wrong-language text:\n'+failures.join('\n'));
console.log('PASS language audit: Today, Menu, Shopping, Recipes, Pantry, Spending, Insights, Products, recipe form, meal editor and settings — VI and EN at mobile 375×812, tablet 820×1100 and desktop 1280×800, no text in the other language');
})().catch((e:any)=>{console.error(e);process.exit(1)});
