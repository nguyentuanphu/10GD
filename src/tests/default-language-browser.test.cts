// v1.7.11 owner release (7 Nov 2026, Sydney time): “FamTray · Bếp Nhà”, tagline “One table, the whole family / Một mâm, cả nhà”,
// and English as the main language with Vietnamese fully supported.
//  • new device, no data, no saved choice → the phone/browser language (Vietnamese when “vi” comes first among VI/EN, else English)
//  • a device or account already in use with no saved choice → Vietnamese (the old default), saved — nothing in use flips to English
//  • a saved choice always wins; a VI │ EN tap is saved as a choice
//  • the sign-in page (first screen) follows the same rule and has its own VI │ EN switch
//  • the name and tagline show in the header in both languages; no “Bếp Gia Đình” left in the interface
// Sizes: narrow 320×640, mobile 375×812, tablet 820×1100, desktop 1280×800; VI and EN; online and offline. Screenshots in
// docs/reviews/v1.7.11 (Chromium viewport simulation, not physical devices).
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert');
const dir='docs/reviews/v1.7.11';fs.mkdirSync(dir,{recursive:true});
const root=process.cwd();
const TYPES:any={'.html':'text/html','.js':'application/javascript','.json':'application/json','.css':'text/css','.webp':'image/webp','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
(async()=>{const {loginPage}=await import(path.join(root,'netlify/lib/login-page.mjs'));const LOGIN=loginPage();
const browser=await chromium.launch();let n=0;
const open=async({locale,languages,viewport={width:375,height:812},storage={} as Record<string,string>,url='/#today'}:any)=>{
 const ctx=await browser.newContext({viewport,locale,reducedMotion:'reduce',timezoneId:'Australia/Sydney',serviceWorkers:'block'});
 await ctx.addInitScript(([langs,store]:any)=>{if(langs)Object.defineProperty(navigator,'languages',{get:()=>langs,configurable:true});if(!sessionStorage.getItem('qa-seeded')){sessionStorage.setItem('qa-seeded','1');localStorage.clear();for(const[k,v]of Object.entries(store))localStorage.setItem(k,v as string)}},[languages||null,storage]);
 const page=await ctx.newPage();const errors:string[]=[];page.on('pageerror',(e:any)=>errors.push(e.message));
 await page.route('https://kitchen.test/**',async(route:any)=>{const u=new URL(route.request().url());
  if(u.pathname==='/login')return route.fulfill({body:LOGIN,contentType:'text/html'});
  if(u.pathname.startsWith('/.netlify/')){const op=u.searchParams.get('op');return route.fulfill({json:op==='status'?{configured:false,connected:false}:op==='state'?{state:null,etag:null}:op==='families'?{families:[]}:{announcements:[],devices:[]}})}
  const file=path.join(root,'dist',u.pathname==='/'?'index.html':u.pathname);try{await route.fulfill({body:fs.readFileSync(file),contentType:TYPES[path.extname(file)]||'application/octet-stream'})}catch{await route.fulfill({status:404,body:'Missing'})}});
 await page.goto('https://kitchen.test'+url);
 if(!url.startsWith('/login'))await page.locator('#main h1').waitFor({timeout:20000});else await page.locator('#submit').waitFor();
 return{ctx,page,errors};
};
const lang=(page:any)=>page.evaluate(()=>typeof appLanguage!=='undefined'?appLanguage:document.documentElement.lang);
const saved=(page:any)=>page.evaluate(()=>({lang:localStorage.getItem('guest/bep-language'),auto:localStorage.getItem('guest/bep-language-auto')}));
const check=(name:string,ok:boolean,msg?:string)=>{assert.ok(ok,name+(msg?': '+msg:''));n++};
const OLD_DATA=JSON.stringify({version:1});// presence is what counts; the app replaces unreadable data with a fresh copy

// 1. new device, Vietnamese phone → Vietnamese, remembered as a guess (not a choice)
{const {ctx,page,errors}=await open({locale:'vi-VN',languages:['vi-VN','vi','en-US']});
 check('vi phone → Vietnamese',await lang(page)==='vi');assert.equal(await page.evaluate(()=>document.documentElement.lang),'vi');
 assert.deepEqual(await saved(page),{lang:'vi',auto:'1'},'guess saved for this device');assert.deepEqual(errors,[]);await ctx.close()}
// 2. new device, English phone → English; it stays English after the device has data and reloads (no flip to Vietnamese)
{const {ctx,page,errors}=await open({locale:'en-AU',languages:['en-AU','en']});
 check('en phone → English',await lang(page)==='en');assert.equal(await page.evaluate(()=>document.documentElement.lang),'en');
 await page.evaluate(()=>{state.preferences.onboardingComplete=true;save()});assert.ok(await page.evaluate(()=>!!localStorage.getItem('guest/bep-gia-dinh-v1')),'the device now has data');
 await page.reload();await page.locator('#main h1').waitFor();check('English device stays English after reload',await lang(page)==='en');
 // the name and tagline in English
 const brand=await page.locator('.sidebar .brand').innerText();assert.match(brand,/FamTray/);assert.match(brand,/ONE TABLE, THE WHOLE FAMILY/i);
 assert.ok(!/Bếp Gia Đình|BẾP GIA ĐÌNH|nhẹ lo/i.test(await page.locator('body').innerText()),'no old name or tagline in English');assert.deepEqual(errors,[]);await ctx.close()}
// 3. other phone languages: Vietnamese only when it comes first among VI/EN
{for(const [langs,want] of [[['fr-FR','vi-VN','en'],'vi'],[['de-DE','en-GB','vi'],'en'],[['fr-FR','ja-JP'],'en']] as [string[],string][]){const {ctx,page}=await open({locale:langs[0],languages:langs});check(`phone ${langs.join(',')} → ${want}`,await lang(page)===want);await ctx.close()}}
// 4. a device already in use (family data, no saved language) keeps Vietnamese even with an English phone, and it is saved
for(const [what,store] of [['guest data',{'guest/bep-gia-dinh-v1':OLD_DATA}],['legacy cache',{'bep-gia-dinh-v1':OLD_DATA}],['account cache',{'account/fam-1/bep-gia-dinh-v1':OLD_DATA}]] as [string,Record<string,string>][]){
 const {ctx,page}=await open({locale:'en-AU',languages:['en-AU','en'],storage:store});check(`${what} without a saved language → Vietnamese`,await lang(page)==='vi');
 assert.equal((await saved(page)).lang,'vi','kept as Vietnamese for next time');await page.reload();await page.locator('#main h1').waitFor();assert.equal(await lang(page),'vi','still Vietnamese after reload');await ctx.close()}
// 5. a saved choice wins over the phone and over “in use”
{const {ctx,page}=await open({locale:'vi-VN',languages:['vi-VN'],storage:{'guest/bep-language':'en'}});check('saved English beats a Vietnamese phone',await lang(page)==='en');await ctx.close()}
{const {ctx,page}=await open({locale:'en-AU',languages:['en-AU'],storage:{'guest/bep-language':'vi'}});check('saved Vietnamese beats an English phone',await lang(page)==='vi');await ctx.close()}
{const {ctx,page}=await open({locale:'en-AU',languages:['en-AU'],storage:{'guest/bep-gia-dinh-v1':OLD_DATA,'guest/bep-language':'en'}});check('saved English on a device in use stays English',await lang(page)==='en');await ctx.close()}
// 6. the VI │ EN switch is a saved choice
{const {ctx,page}=await open({locale:'vi-VN',languages:['vi-VN']});await page.locator('#app-language').click();await page.waitForTimeout(200);
 check('switch to English',await lang(page)==='en');assert.deepEqual(await saved(page),{lang:'en',auto:null},'saved as a choice');
 await page.reload();await page.locator('#main h1').waitFor();assert.equal(await lang(page),'en','choice survives reload');await ctx.close()}
// 7. the sign-in page follows the same rule and has its own switch
{const {ctx,page}=await open({locale:'en-AU',languages:['en-AU','en'],url:'/login'});check('sign-in page: English phone',await page.evaluate(()=>document.documentElement.lang)==='en');
 assert.equal((await page.locator('#submit').innerText()).trim(),'Sign in');assert.match(await page.locator('main').innerText(),/One table, the whole family/);assert.match(await page.title(),/^Sign in · FamTray · Bếp Nhà$/);
 assert.ok(!/Đăng nhập|Mật khẩu|Bếp Gia Đình/.test(await page.locator('main').innerText()),'no Vietnamese left on the English sign-in page');
 await page.locator('#register-tab').click();assert.equal((await page.locator('#submit').innerText()).trim(),'Create account');
 await page.locator('[data-set-lang="vi"]').click();await page.locator('#submit').waitFor();check('sign-in switch to Vietnamese',await page.evaluate(()=>document.documentElement.lang)==='vi');
 assert.equal((await page.locator('#submit').innerText()).trim(),'Đăng nhập');assert.deepEqual(await saved(page),{lang:'vi',auto:null},'the choice is saved for the app too');await ctx.close()}
{const {ctx,page}=await open({locale:'vi-VN',languages:['vi-VN'],url:'/login'});check('sign-in page: Vietnamese phone',await page.evaluate(()=>document.documentElement.lang)==='vi');assert.match(await page.locator('main').innerText(),/Một mâm, cả nhà/);await ctx.close()}
{const {ctx,page}=await open({locale:'en-AU',languages:['en-AU'],url:'/login',storage:{'guest/bep-gia-dinh-v1':OLD_DATA}});check('sign-in page: device in use → Vietnamese',await page.evaluate(()=>document.documentElement.lang)==='vi');await ctx.close()}
// 8. the manifest
{const m=JSON.parse(fs.readFileSync(path.join(root,'dist/manifest.webmanifest'),'utf8'));assert.equal(m.name,'FamTray · Bếp Nhà');assert.equal(m.short_name,'FamTray');assert.equal(m.lang,'en');assert.match(m.description,/One table, the whole family/);n++}

// 9. responsive evidence: header, welcome card and the switch at four sizes, VI and EN, online and offline; sign-in page
const SIZES:any[]=[['narrow',{width:320,height:640}],['mobile',{width:375,height:812}],['tablet',{width:820,height:1100}],['desktop',{width:1280,height:800}]];
for(const [size,viewport] of SIZES)for(const l of ['vi','en'])for(const net of ['online','offline']){
 const {ctx,page,errors}=await open({locale:l==='vi'?'vi-VN':'en-AU',languages:[l==='vi'?'vi-VN':'en-AU'],viewport});
 if(net==='offline'){await ctx.setOffline(true);await page.evaluate(()=>{window.dispatchEvent(new Event('offline'));render()});await page.waitForTimeout(300)}
 const label=`${size} ${l} ${net}`;
 const ok=await page.evaluate(()=>{const out:string[]=[];if(document.documentElement.scrollWidth>innerWidth+1)out.push('page scrolls sideways');
  for(const e of document.querySelectorAll('.sidebar .brand *, .topbar .mobile-brand, .topbar .mobile-brand *, .guide-card h2, .guide-card h3, #app-language')){const r=(e as HTMLElement).getBoundingClientRect();if(!r.width||!(e.textContent||'').trim())continue;const cs=getComputedStyle(e);if((cs.overflowX!=='visible'||cs.textOverflow==='ellipsis')&&(e as HTMLElement).scrollWidth>(e as HTMLElement).clientWidth+2)out.push('cut: '+(e.textContent||'').trim().slice(0,30));if(r.right>innerWidth+1)out.push('off screen: '+(e.textContent||'').trim().slice(0,30))}
  return out});
 assert.deepEqual(ok,[],label+': header / welcome card / switch fit '+JSON.stringify(ok));
 const heading=await page.evaluate(()=>[...document.querySelectorAll('.sidebar .brand, .topbar .mobile-brand, .guide-card')].filter(e=>(e as HTMLElement).offsetParent).map(e=>(e as HTMLElement).innerText).join(' | '));
 assert.ok(l==='vi'?/Bếp Nhà/.test(heading):/FamTray/.test(heading),label+': name shown ('+heading.slice(0,80)+')');assert.ok(!/Bếp Gia Đình|nhẹ lo/i.test(await page.locator('body').innerText()),label+': no old name');
 const sw=page.locator('#app-language');if(await sw.isVisible()){const b=(await sw.boundingBox())!;assert.ok(b.height>=40,label+': switch tappable')}
 await page.screenshot({path:`${dir}/${l}-${size}-${net}-today.png`});assert.deepEqual(errors,[],label+': no page errors');n++;await ctx.close();
 if(net==='online'){const s=await open({locale:l==='vi'?'vi-VN':'en-AU',languages:[l==='vi'?'vi-VN':'en-AU'],viewport,url:'/login'});
  assert.ok(await s.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),label+': sign-in page fits');
  for(const b of await s.page.locator('[data-set-lang]').all())assert.ok((await b.boundingBox())!.height>=44,label+': sign-in switch ≥ 44 px');
  await s.page.screenshot({path:`${dir}/${l}-${size}-signin.png`});await s.page.locator('#register-tab').click();await s.page.screenshot({path:`${dir}/${l}-${size}-signup.png`});n++;await s.ctx.close()}}
await browser.close();
console.log(`PASS v1.7.11 FamTray · Bếp Nhà: default language (vi phone, en phone, other phones, in-use devices stay Vietnamese, saved choice wins, VI │ EN switch, sign-in page), manifest, name/tagline at 320 / 375 / 820 / 1280 in VI and EN, online and offline (${n} checks)`);
})().catch(e=>{console.error(e);process.exit(1)});
