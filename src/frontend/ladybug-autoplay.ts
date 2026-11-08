// v1.7.16 — owner, 8 Nov 2026 (Sydney time): “ở lady bug bạn làm autoplay như một người dùng để nó tự test qua nhiều scenarios đi,
// để test hết các chức năng và work flow, cái nào không dùng được nó sẽ tự pick lỗi, song song cho sẵn một danh sách để khi tôi ấn
// thì để xem nó chạy và hoạt động như thế nào. Có nhiều cái cần giả lập như receipt hoặc barcode.”
// Pop-ups: a temporary sample family (the family's own data is never touched), family owners only, failures sent automatically.
//
// “Tự chạy thử” sits in the ladybug sheet. The app taps through each workflow the way a person would — pages, days, guests,
// shopping mode, putting away, a pretend receipt, a pretend barcode, importing a recipe page, cooking timers, search, language and
// the bottom bar — and checks the result after every step, including that a tapped tab or chip does not make the page jump.
// “Xem” plays one scenario slowly with a ring around each control it taps; “Chạy tất cả” runs them all quickly.
//
// While it runs: the family's state is put aside and a sample family is used; saving goes to memory only, family sync is off,
// every server call is answered by the app itself (pretend recipe page, product, invitation), analytics and sharing are stopped,
// and everything this device stored is put back exactly as it was afterwards. Failures are then sent as one feedback report.
// Owner, 8 Nov 2026: “Làm cho tôi luôn lựa chọn dùng trên dữ liệu thật nữa nhé” — a second choice runs the same scenarios on a
// COPY of the family's own data (closer to real life). The copy is never saved, synced or sent, and is dropped afterwards; a
// scenario whose starting point is missing in the family's data (an empty shopping list…) is marked “Bỏ qua”, not a failure.
(function(){
 const aT=(vi:string,en:string)=>typeof tr==='function'?tr(vi,en):vi;
 const G:any=globalThis;
 const isOwner=()=>G.BEP_SESSION?.mode==='account'&&G.BEP_SESSION.household?.role==='owner';
 const art=(n:string)=>typeof uiArt==='function'?uiArt(n,'btn-art'):'';
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));

 // ── the sample family and the pretend outside world ─────────────────────────────────────────────────────────────────────────
 const SAMPLE_RECIPE={name:'Phở bò thử',ingredients:['Gừng: 25g','Hành lá: 30g','Muối: 16g','Bò tái:1,2kg','Hành tím: 25g','Quế'],steps:['Chần xương 10 phút.','Ninh nước dùng.'],servings:4,time:120,source:'https://vi-du.example/pho-bo'};
 const SAMPLE_RECEIPT=['COLES SUPERMARKETS','EGGS FREE RANGE 12PK  6.50','RICE JASMINE 5KG  14.00','PRAWNS RAW 500G  12.90','SUBTOTAL  33.40','TOTAL  33.40'].join('\n');
 function sampleState(){const s:any=typeof newHouseholdState==='function'?newHouseholdState():defaults();if(!validImport(s))throw Error('sample family');if(typeof upgradeReferenceCatalog==='function')upgradeReferenceCatalog(s);s.preferences.onboardingComplete=true;s.members=[['ap-ba','Ba',1],['ap-me','Mẹ',1],['ap-be','Bé',.5]].map(([id,name,weight])=>({id,name,weight,emoji:''}));
  const today=sydneyDate(),wk=planStartOf(s,today);familyGenerate(s,wk,{sourceMode:'library'});
  for(const w of Object.values(s.weeks) as any[])for(const day of Object.values(w.days) as any[])for(const m of Object.values(day) as any[])if(m&&(m as any).attendance)for(const q of s.members)(m as any).attendance[q.id]??='home';
  // the same defaults the app fills in once when it opens (products-ui, family-features, family-menu-ui)
  s.products??=[];s.receipts??=[];s.aliases??={};s.preferences.familyPlanner??=true;s.pantry=[];return s}
 function json(data:any,status=200){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}})}
 function makeFetch(real:typeof fetch){return async(input:any,init?:any)=>{const url=new URL(typeof input==='string'?input:input?.url||String(input),location.href),method=String(init?.method||input?.method||'GET').toUpperCase();
  if(url.origin===location.origin&&url.pathname==='/.netlify/functions/family'){const op=url.searchParams.get('op');(G.__apCalls||=[]).push(op);
   if(op==='recipe-import')return json({recipe:SAMPLE_RECIPE});
   if(op==='barcode')return json({found:true,name:'Mì gói thử',brand:'Mẫu',quantity:'5 gói'});
   if(op==='invite-create'){let b:any={};try{b=JSON.parse(init?.body||'{}')}catch{}return json({token:'t3st9k',inviteId:b.inviteId})}
   if(op==='invite-cancel')return json({cancelled:true});if(op==='invites')return json({invites:G.__apInvites||[]});return json({ok:true})}
  if(url.origin===location.origin&&url.pathname.startsWith('/.netlify/'))return json({error:'Tự chạy thử: không gửi lên máy chủ.'},503);
  if(method!=='GET'&&method!=='HEAD')return json({error:'Tự chạy thử: không gửi đi.'},503);
  return real(input,init)}}

 // ── putting the family's things aside, and back ─────────────────────────────────────────────────────────────────────────────
 let saved:any=null;
 let mode:'sample'|'real'=(()=>{try{return localStorage.getItem('bep-autoplay-mode')==='real'?'real':'sample'}catch{return 'sample'}})();
 class Skip extends Error{}
 const skip=(msg:string)=>{throw new Skip(msg)};
 function enter(){const fs:any=familyStorage,mem=new Map<string,string>(),ls:Record<string,string>={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i)!;ls[k]=localStorage.getItem(k)!}
  saved={state,view,weekStart,selectedDate,session:G.BEP_SESSION,fs:{set:fs.setItem,get:fs.getItem,rem:fs.removeItem},qfs:G.queueFamilySync,fetch:G.fetch,beacon:navigator.sendBeacon,share:(navigator as any).share,ing:new Set(Object.keys(INGREDIENTS)),ls,hash:location.hash,y:scrollY,cooking:typeof cooking!=='undefined'?cooking:null};
  fs.setItem=(k:string,v:any)=>{mem.set(k,String(v))};const photos=new Map<string,any>();saved.localPhoto=G.localPhoto;if(typeof G.localPhoto==='function')G.localPhoto=async(id:string,value?:any)=>{if(value===undefined)return photos.get(id);photos.set(id,value);return id};G.__apCalls=[];G.__apInvites=[];fs.getItem=(k:string)=>mem.has(k)?mem.get(k)!:null;fs.removeItem=(k:string)=>{mem.delete(k)};
  G.queueFamilySync=()=>{};try{localStorage.setItem('bep-usage-optout','1')}catch{}/* no usage counted while the app tests itself; put back by the snapshot */G.fetch=makeFetch(saved.fetch);try{(navigator as any).sendBeacon=()=>true}catch{}try{(navigator as any).share=async()=>{}}catch{}
  // a family that is in the middle of shopping mode (a per-tab setting) comes back to it afterwards
  const ss:Record<string,string>={};try{for(let i=0;i<sessionStorage.length;i++){const k=sessionStorage.key(i)!;ss[k]=sessionStorage.getItem(k)!}}catch{}saved.ss=ss;
  if(typeof setShopMode==='function')setShopMode(false);
  G.BEP_SESSION={mode:'account',household:{id:'00000000-0000-4000-8000-00000000a7e5',name:'Nhà mẫu (tự chạy thử)',role:'owner'},account:{username:'tu-chay-thu',name:'Tự chạy thử'}};
  state=mode==='real'?clone(saved.state):sampleState();selectedDate=sydneyDate();weekStart=planStartOf(state,selectedDate);view='today';document.documentElement.classList.add('ap-running')}
 function leave(){if(!saved)return;const s=saved;saved=null;try{closeModal()}catch{}const fs:any=familyStorage;fs.setItem=s.fs.set;fs.getItem=s.fs.get;fs.removeItem=s.fs.rem;
  G.queueFamilySync=s.qfs;if(s.localPhoto)G.localPhoto=s.localPhoto;delete G.__apCalls;delete G.__apInvites;G.fetch=s.fetch;try{(navigator as any).sendBeacon=s.beacon}catch{}try{(navigator as any).share=s.share}catch{}G.BEP_SESSION=s.session;try{cooking=s.cooking}catch{}
  for(const k of Object.keys(INGREDIENTS))if(!s.ing.has(k))delete (INGREDIENTS as any)[k];
  // everything this device stored goes back exactly as it was (the ladybug's own outbox is left alone)
  const now:string[]=[];for(let i=0;i<localStorage.length;i++)now.push(localStorage.key(i)!);
  for(const k of now)if(!(k in s.ls)&&!k.startsWith('bep-ladybug'))localStorage.removeItem(k);
  for(const [k,v] of Object.entries(s.ls))if(!k.startsWith('bep-ladybug')&&localStorage.getItem(k)!==v)try{localStorage.setItem(k,v as string)}catch{}
  try{const now2:string[]=[];for(let i=0;i<sessionStorage.length;i++)now2.push(sessionStorage.key(i)!);for(const k of now2)if(!(k in s.ss))sessionStorage.removeItem(k);for(const [k,v] of Object.entries(s.ss))sessionStorage.setItem(k,v as string)}catch{}
  state=s.state;view=s.view;weekStart=s.weekStart;selectedDate=s.selectedDate;if(typeof setShopMode==='function')setShopMode(s.ss['bep-shop-mode']==='1');document.documentElement.classList.remove('ap-running','shop-mode');document.body.classList.remove('shop-mode');
  if(location.hash!==s.hash)history.replaceState(null,'',s.hash||'#'+s.view);render();scrollTo(0,s.y)}

 // ── what the scenarios use ──────────────────────────────────────────────────────────────────────────────────────────────────
 let run:any=null;
 const visible=(e:any)=>!!e&&e.getClientRects().length>0&&getComputedStyle(e).visibility!=='hidden';
 function find(sel:string){return [...document.querySelectorAll(sel)].find(visible) as HTMLElement|undefined}
 async function waitFor(sel:string,ms=5000){const end=Date.now()+ms;for(;;){const e=find(sel);if(e)return e;if(run?.stop)throw Error(aT('Đã dừng.','Stopped.'));if(Date.now()>end)throw Error(aT(`Không thấy “${sel}”.`,`“${sel}” did not appear.`));await sleep(50)}}
 async function waitGone(sel:string,ms=5000){const end=Date.now()+ms;while(find(sel)){if(Date.now()>end)throw Error(aT(`“${sel}” vẫn còn.`,`“${sel}” is still there.`));await sleep(50)}}
 function ring(e:HTMLElement|null){const r=document.getElementById('ap-ring');if(!r)return;if(!e){r.hidden=true;return}const b=e.getBoundingClientRect();Object.assign(r.style,{left:b.left-4+'px',top:b.top-4+'px',width:b.width+8+'px',height:b.height+8+'px'});r.hidden=false}
 async function show(e:HTMLElement){if(!run.watch)return;const b=e.getBoundingClientRect();if(b.bottom<60||b.top>innerHeight-90)e.scrollIntoView({block:'center',behavior:reduced()?'auto':'smooth'});await sleep(reduced()?120:260);ring(e);await sleep(run.slow)}
 function step(text:string){run.step=text;run.log.push(text);const b=document.getElementById('ap-step');if(b)b.textContent=text}
 function expect(ok:any,msg:string){if(!ok)throw Error(msg)}
 function noOverflow(where:string){const o=document.documentElement.scrollWidth-innerWidth;expect(o<=1,aT(`${where}: trang bị tràn ngang ${o}px.`,`${where}: the page scrolls sideways by ${o}px.`))}
 // a tap; with still:true the tapped control must stay where it was (owner rule: buttons, tabs and chips never make the page jump)
 async function tap(target:string|HTMLElement,{still=false,label=''}={}){const e=typeof target==='string'?await waitFor(target):target;await show(e);
  const name=label||(e.getAttribute('aria-label')||e.textContent||'').replace(/\s+/g,' ').trim().slice(0,40);const t0=e.getBoundingClientRect().top,key=typeof target==='string'?target:null;
  e.click();await sleep(run.watch?380:90);if(run.watch)ring(e.isConnected?e:null);
  if(still){const again=key?find(key):e.isConnected?e:null;if(again){const moved=Math.round(again.getBoundingClientRect().top-t0);expect(Math.abs(moved)<=2,aT(`Bấm “${name}” làm màn hình nhảy ${moved}px.`,`Tapping “${name}” moved the page by ${moved}px.`))}}
  return e}
 async function type(sel:string,text:string){const e=await waitFor(sel) as HTMLInputElement;await show(e);e.focus();e.value=text;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));await sleep(run.watch?300:60);return e}
 async function go(v:string){closeModal();const link=document.querySelector(`#nav a[href="#${v}"]`) as HTMLElement|null;if(link&&visible(link)&&run.watch)await tap(link);else{location.hash=v;await sleep(60)}if(view!==v){view=v;render()}await waitFor('#main h1');scrollTo(0,0)}

 // ── the scenarios ───────────────────────────────────────────────────────────────────────────────────────────────────────────
 const SC:{id:string,vi:string,en:string,dvi:string,den:string,run:()=>Promise<void>}[]=[
  {id:'pages',vi:'Mở các trang chính',en:'Open the main pages',dvi:'Hôm nay, Thực đơn, Đi chợ, Món ăn, Tủ, Chi tiêu, Thói quen, Giá.',den:'Today, Menu, Shopping, Recipes, Pantry, Spending, Habits, Prices.',run:async()=>{
   for(const v of ['today','planner','shopping','recipes','pantry','expenses','insights','products']){step(aT(`Mở “${labels[v]?.[1]||v}”`,`Open “${v}”`));await go(v);expect(view===v,aT(`Không mở được ${v}.`,`Could not open ${v}.`));noOverflow(v)}}},
  {id:'days',vi:'Chọn ngày trong tuần',en:'Pick days of the week',dvi:'Bấm từng ngày — trang không được nhảy.',den:'Tap each day — the page must not jump.',run:async()=>{
   await go('today');const days=[...document.querySelectorAll('#main .day-strip [data-action="select-day"]')] as HTMLElement[];if(mode==='real'&&!days.length)skip(aT('Trang Hôm nay của nhà chưa có dải ngày.','No day strip on your Today page.'));expect(days.length>=7,aT('Không thấy dải ngày.','No day strip.'));
   for(const d of days.slice(0,7)){const date=d.dataset.date!;step(aT(`Chọn ngày ${date}`,`Pick ${date}`));await tap(`#main .day-strip [data-date="${date}"]`,{still:true});expect(selectedDate===date,aT(`Ngày ${date} chưa được chọn.`,`${date} was not picked.`))}}},
  {id:'guests',vi:'Thêm và bỏ khách',en:'Add and remove guests',dvi:'Mở “Có khách”, thêm “Khách thử”, lưu; mở lại, bỏ, lưu.',den:'Open “Guests coming”, add “Test guests”, save; reopen, remove, save.',run:async()=>{
   await go('today');if(mode==='real'&&!find('#main .guest-shortcut'))skip(aT('Tuần này chưa có thực đơn gia đình.','No family menu this week.'));step(aT('Mở “Có khách”','Open “Guests coming”'));await tap('#main .guest-shortcut');await waitFor('#modal-root #guest-groups');
   step(aT('Nhập tên khách','Type the guests’ name'));await type('#modal-root [data-guest-name="0"]','Khách thử');step(aT('Thêm 1 người lớn','One more adult'));await tap('#modal-root [data-guest-step="1"][data-k="adults"]',{still:true});
   step(aT('Lưu','Save'));await tap('#modal-root [data-fm="guests-save"]');await waitGone('#modal-root #guest-groups');
   const n=()=>Object.values(state.weeks).flatMap((w:any)=>Object.values(w.days)).flatMap((d:any)=>MEAL_TYPES.map((t:string)=>d[t])).filter((m:any)=>m?.guests?.some((g:any)=>g.name==='Khách thử')).length;
   expect(n()>=1,aT('Khách chưa được lưu vào bữa.','The guests were not saved on a meal.'));
   step(aT('Mở lại và bỏ khách','Reopen and remove'));await tap('#main .guest-shortcut');await waitFor('#modal-root #guest-groups');await tap('#modal-root #guest-groups [data-fm="guest-remove"]');await tap('#modal-root [data-fm="guests-save"]');await waitGone('#modal-root #guest-groups');
   expect(n()===0,aT('Bỏ khách xong mà bữa vẫn còn khách.','Guests removed but a meal still has them.'))}},
  {id:'shop',vi:'Đi chợ và cất đồ',en:'Shop and put away',dvi:'Bắt đầu đi chợ, đánh dấu vài món, Xong, cất vào tủ.',den:'Start shopping, tick a few items, Done, put away.',run:async()=>{
   await go('shopping');step(aT('Bấm “Bắt đầu đi chợ”','Tap “Start shopping”'));await tap('#main [data-flow="shop-start"]');await waitFor('#main .shop-mode-bar');
   const boxes=[...document.querySelectorAll('#main .shopping-group .shop-row input.check[data-change="bought"]')].slice(0,3) as HTMLElement[];if(!boxes.length){if(mode==='real')skip(aT('Danh sách đi chợ của nhà đang trống.','Your shopping list is empty.'));expect(false,aT('Danh sách đi chợ trống.','The shopping list is empty.'))}
   for(const b of boxes){step(aT('Đánh dấu đã mua','Tick as bought'));await tap(b)}
   const before=state.pantry.length;step(aT('Bấm “Xong đi chợ”','Tap “Done shopping”'));await tap('#main [data-flow="shop-done"]');await waitFor('#modal-root #store-form');
   step(aT('Cất vào tủ','Put away'));await tap('#modal-root [data-action="submit-form"][data-id="store-form"]');await waitGone('#modal-root #store-form');
   expect(state.pantry.length>before,aT('Cất đồ xong mà tủ không có thêm gì.','Nothing was added to the pantry.'))}},
  {id:'receipt',vi:'Hoá đơn giả lập',en:'Pretend receipt',dvi:'Dán chữ của một hoá đơn mẫu, đọc dòng, ghép “tôm”, lưu.',den:'Paste a sample receipt, read the lines, match “prawn”, save.',run:async()=>{
   await go('expenses');step(aT('Mở “Chụp / nhập hóa đơn”','Open “Snap / enter a receipt”'));const nb=find('[data-feature="receipt-new"]');if(nb)await tap(nb);else newReceipt();await waitFor('#modal-root #receipt-raw');
   step(aT('Dán chữ hoá đơn mẫu (thay cho ảnh)','Paste the sample text (instead of a photo)'));await type('#modal-root #receipt-raw',SAMPLE_RECEIPT);
   step(aT('Đọc các dòng','Read the lines'));await tap('#modal-root [data-feature="receipt-parse"]');await waitFor('#modal-root .receipt-line');
   const lines=document.querySelectorAll('#modal-root .receipt-line').length;expect(lines>=3,aT(`Chỉ đọc được ${lines} dòng.`,`Only ${lines} lines read.`));
   const box=[...document.querySelectorAll('#modal-root .receipt-line')].find(l=>/PRAWN/i.test((l.querySelector('.receipt-label') as HTMLInputElement)?.value||''))?.querySelector('.rm-search') as HTMLElement|undefined;
   if(box){step(aT('Gõ “tom” để ghép Tôm','Type “tom” to match Tôm'));const line=box.closest('.receipt-line') as HTMLElement;await tap(box);await type(`#modal-root .receipt-line[data-index="${line.dataset.index}"] .rm-search`,'tom');const opt=await waitFor(`#modal-root .receipt-line[data-index="${line.dataset.index}"] .rm-opt[data-rm-value]`);await tap(opt);
    expect((line.querySelector('select.receipt-match') as HTMLSelectElement).value,aT('Gõ “tom” không ghép được nguyên liệu.','Typing “tom” matched nothing.'))}
   const before=state.receipts.length;step(aT('Lưu khoản chi','Save the spending'));await tap('#modal-root [data-feature="receipt-save"]');await sleep(300);
   if(find('#modal-root [data-feature="receipt-save"]'))await tap('#modal-root [data-feature="receipt-save"]');await sleep(300);
   expect(state.receipts.length>before,aT('Hoá đơn chưa được lưu.','The receipt was not saved.'))}},
  {id:'barcode',vi:'Mã vạch giả lập',en:'Pretend barcode',dvi:'Gõ một mã vạch, app tra giả lập, chọn nguyên liệu, cất vào tủ.',den:'Type a barcode, a pretend lookup, pick the ingredient, put away.',run:async()=>{
   await go('pantry');step(aT('Bấm “Quét mã vạch”','Tap “Scan a barcode”'));await tap('#main [data-kx="scan-open"]');await waitFor('#modal-root #scan-code');
   step(aT('Gõ mã (thay cho camera)','Type the code (instead of the camera)'));await type('#modal-root #scan-code','8934563138165');await tap('#modal-root [data-kx="scan-typed"]');
   const sel=await waitFor('#modal-root #scan-ing') as HTMLSelectElement;if(!sel.value){const o=[...sel.options].find(o=>o.value);expect(o,aT('Không có nguyên liệu để chọn.','No ingredient to pick.'));sel.value=o!.value;sel.dispatchEvent(new Event('change',{bubbles:true}))}
   const before=state.pantry.length;step(aT('Cất vào tủ','Put away'));await tap('#modal-root [data-kx="scan-save"]');await sleep(300);
   expect(state.pantry.length>before,aT('Quét mã xong mà tủ không có thêm gì.','Nothing was added after the scan.'));expect(Object.keys((state as any).barcodeMap||{}).length>0,aT('Mã vạch không được nhớ.','The barcode was not remembered.'))}},
  {id:'import',vi:'Nhập món từ link',en:'Import a recipe link',dvi:'Một trang công thức giả lập (“Gừng: 25g”, “Bò tái:1,2kg”…).',den:'A pretend recipe page (“Gừng: 25g”, “Bò tái:1,2kg”…).',run:async()=>{
   await go('recipes');step(aT('Bấm “Nhập món từ link”','Tap “Import from a link”'));await tap('#main [data-kx="import-open"]');await type('#modal-root #kimp-url','https://vi-du.example/pho-bo');
   step(aT('Nhập món','Import'));await tap('#modal-root [data-kx="import-go"]');await waitFor('#family-recipe-form');
   const names=[...document.querySelectorAll('#family-recipe-form .rc-ing-name-input')].map((i:any)=>i.value);
   expect(names.length===SAMPLE_RECIPE.ingredients.length,aT(`Có ${names.length}/${SAMPLE_RECIPE.ingredients.length} dòng nguyên liệu.`,`${names.length}/${SAMPLE_RECIPE.ingredients.length} ingredient lines.`));
   expect(!names.some(n=>/[:：]/.test(n)),aT('Còn dấu “:” trong tên nguyên liệu.','A “:” was left in a name.'));
   expect(names.includes('Hành tím'),aT('“Hành tím” bị đổi thành nguyên liệu khác.','“Hành tím” became another ingredient.'));closeModal()}},
  {id:'cooking',vi:'Nấu và hẹn giờ',en:'Cook with a timer',dvi:'Mở chế độ nấu, bấm hẹn giờ trong bước có “phút”.',den:'Open cooking mode, tap the timer in a step with minutes.',run:async()=>{
   await go('today');step(aT('Mở chế độ nấu','Open cooking mode'));const r=state.recipes.find((x:any)=>(x.steps||[]).some((s:string)=>/\d+\s*phút/.test(s)))||{...state.recipes[0],steps:['Luộc 10 phút.']};
   cooking={recipe:r,step:Math.max(0,(r.steps||[]).findIndex((s:string)=>/\d+\s*phút/.test(s)))};renderCooking();await waitFor('#modal-root .cooking-step');
   const t=find('#modal-root [data-kx="step-timer"]');expect(t,aT('Bước có “phút” không có nút hẹn giờ.','No timer button on a step with minutes.'));step(aT('Bấm hẹn giờ','Tap the timer'));await tap(t!);closeModal()}},
  {id:'search',vi:'Tìm kiếm',en:'Search',dvi:'Mở kính lúp, gõ “trứng”, mở kết quả đầu.',den:'Open the magnifier, type “egg”, open the first result.',run:async()=>{
   await go('today');const dish=Object.values(currentWeek().days).flatMap((d:any)=>MEAL_TYPES.flatMap((t:string)=>d[t]?.recipes||[]))[0] as any;const term=dish?String(dish.name).split(/\s+/).slice(0,2).join(' '):aT('trứng','egg');step(aT(`Bấm kính lúp, tìm “${term}”`,`Tap the magnifier, look for “${term}”`));await tap('#app-search');await type('#modal-root #app-search-input',term);const hit=await waitFor('#modal-root .search-hit-row');
   step(aT('Mở kết quả đầu','Open the first result'));await tap(hit);await sleep(300);expect(!find('#modal-root #app-search-input'),aT('Kết quả tìm kiếm không mở được.','The result did not open.'));closeModal()}},
  {id:'language',vi:'Đổi tiếng Việt / English',en:'Switch Vietnamese / English',dvi:'Đổi ngôn ngữ hai lần, chữ trên trang phải đổi theo.',den:'Switch twice; the page text must follow.',run:async()=>{
   await go('today');const before=(typeof appLanguage!=='undefined'?appLanguage:'vi');step(aT('Đổi ngôn ngữ','Switch language'));await tap('#app-language');await sleep(200);
   expect((typeof appLanguage!=='undefined'?appLanguage:'')!==before,aT('Ngôn ngữ không đổi.','The language did not change.'));step(aT('Đổi lại','Switch back'));await tap('#app-language');await sleep(200);expect(appLanguage===before,aT('Không đổi lại được.','Could not switch back.'))}},
  {id:'guide',vi:'Hướng dẫn: hai tab',en:'Guide: two tabs',dvi:'Mở hướng dẫn, đổi “Bắt đầu / Tính năng” — tab không được nhảy.',den:'Open the guide and switch tabs — they must not jump.',run:async()=>{
   await go('today');step(aT('Mở hướng dẫn','Open the guide'));openGuide(0);await waitFor('#modal-root [data-guide-tab="features"],#modal-root [data-tab="features"],#modal-root .guide-tabs button');
   const tabs=[...document.querySelectorAll('#modal-root .guide-tabs button,#modal-root [role="tab"]')].filter(visible) as HTMLElement[];expect(tabs.length>=2,aT('Không thấy hai tab.','Two tabs not found.'));
   for(const t of [tabs[1],tabs[0]]){step(aT(`Bấm “${t.textContent!.trim()}”`,`Tap “${t.textContent!.trim()}”`));await tap(t,{still:true})}closeModal()}},
  {id:'bar',vi:'Thanh dưới trượt (điện thoại)',en:'Bottom bar slide (phones)',dvi:'Trượt thanh dưới, mở Tủ rồi Chi tiêu bằng một chạm.',den:'Slide the bottom bar, open Pantry then Spending in one tap.',run:async()=>{
   const nav=document.getElementById('nav')!;if(innerWidth>760){step(aT('Màn hình rộng: dùng thanh bên','Wide screen: sidebar'));return}
   for(const v of ['pantry','expenses']){const a=nav.querySelector(`a[href="#${v}"]`) as HTMLElement;step(aT(`Trượt tới và mở ${v}`,`Slide to and open ${v}`));a.scrollIntoView({inline:'center',block:'nearest'});await tap(a);await waitFor('#main h1');expect(view===v,aT(`Không mở được ${v}.`,`Could not open ${v}.`))}
   const on=nav.querySelector('a.active')!.getBoundingClientRect(),b=nav.getBoundingClientRect();expect(on.left>=b.left-1&&on.right<=b.right+1,aT('Mục đang mở bị khuất trên thanh.','The open section is hidden on the bar.'))}}];

 // every scenario starts from a fresh sample family (or a fresh copy of the family's data), so one cannot disturb the next
 function fresh(){if(!saved)return;state=mode==='real'?clone(saved.state):sampleState();selectedDate=sydneyDate();weekStart=planStartOf(state,selectedDate);view='today';attendanceType='dinner';G.__apCalls=[];G.__apInvites=[];try{if(typeof setShopMode==='function')setShopMode(false)}catch{}render()}
 // one step of a workflow: a failure is written down and the next steps still run (owner, 9 Nov 2026: “Chạy hết các bước”)
 async function part(label:string,fn:()=>Promise<any>|any){step(label);try{await fn();run.parts++}catch(e:any){if(e instanceof Skip)throw e;if(run.stop)throw e;run.fails.push({step:label,msg:String(e?.message||e).slice(0,300)});try{closeModal()}catch{}}}
 // ── running ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 const results:Record<string,{ok:boolean,msg?:string,step?:string,skipped?:boolean,fails?:{step:string,msg:string}[],parts?:number}>={};
 async function runList(list:typeof SC,watch:boolean){if(run)return;run={watch,slow:reduced()?350:700,stop:false,log:[],step:'',errors:[] as string[]};drawBar();
  const onErr=(e:any)=>{run?.errors.push(String(e?.message||e?.reason?.message||e?.reason||'error').slice(0,200))};addEventListener('error',onErr);addEventListener('unhandledrejection',onErr);
  enter();render();const failed:any[]=[];
  try{for(const sc of list){if(run.stop)break;run.name=aT(sc.vi,sc.en);run.errors.length=0;const bar=document.getElementById('ap-name');if(bar)bar.textContent=run.name;
    run.fails=[];run.parts=0;
    try{closeModal();fresh();await sc.run();if(run.errors.length)run.fails.push({step:run.step,msg:aT('Lỗi trong app: ','App error: ')+run.errors[0]});
     if(run.fails.length){const f=run.fails[0];results[sc.id]={ok:false,msg:f.msg,step:f.step,fails:[...run.fails],parts:run.parts};failed.push({sc,...results[sc.id]})}else results[sc.id]={ok:true,parts:run.parts}}
    catch(e:any){if(e instanceof Skip){results[sc.id]={ok:true,skipped:true,msg:e.message};continue}if(run.stop&&/Đã dừng|Stopped/.test(e?.message))break;const all=[...run.fails,{step:run.step,msg:String(e?.message||e).slice(0,300)}];results[sc.id]={ok:false,msg:all[0].msg,step:all[0].step,fails:all,parts:run.parts};failed.push({sc,...results[sc.id]})}
    finally{ring(null)}}}
  finally{removeEventListener('error',onErr);removeEventListener('unhandledrejection',onErr);leave();run=null;document.getElementById('ap-bar')?.remove();openPanel()}
  if(failed.length)report(failed,list.length)}
 function report(failed:any[],total:number){const lines=failed.flatMap(f=>(f.fails&&f.fails.length?f.fails:[{step:f.step,msg:f.msg}]).map((x:any)=>`• ${aT(f.sc.vi,f.sc.en)} — ${aT('bước','step')} “${x.step}”: ${x.msg}`));
  const note=`${aT('Tự chạy thử','Self-test')} (${mode==='real'?aT('bản sao dữ liệu của nhà','copy of the family’s data'):aT('gia đình mẫu','sample family')}): ${failed.length}/${total} ${aT('kịch bản lỗi','scenarios failed')} (${innerWidth}×${innerHeight}, ${typeof appLanguage!=='undefined'?appLanguage:'vi'})\n${lines.join('\n')}`;
  let sent:any={};try{sent=JSON.parse(localStorage.getItem('bep-autoplay-sent')||'{}')}catch{}const key=String(note.length)+':'+lines.join('|').slice(0,200),day=sydneyDate();
  if(sent[key]===day){toastSafe(aT('Lỗi này đã được gửi hôm nay.','This was already sent today.'));return}
  const r=G.bepLadybug?.autoReport?.(note);if(r?.ok){sent={[key]:day};try{localStorage.setItem('bep-autoplay-sent',JSON.stringify(sent))}catch{}toastSafe(aT(`Đã tự gửi ${failed.length} lỗi vào Góp ý.`,`${failed.length} problem${failed.length>1?'s':''} sent to Feedback.`))}
  else toastSafe(aT('Chưa gửi được lỗi (Góp ý không sẵn sàng).','Could not send (feedback not available).'),true)}
 function toastSafe(m:string,bad=false){try{toast(m,bad)}catch{}}

 // ── the panel, the running bar and the ring ─────────────────────────────────────────────────────────────────────────────────
 function status(id:string){const r=results[id];return !r?`<span class="ap-st">${aT('Chưa chạy','Not run')}</span>`:r.skipped?`<span class="ap-st">${aT('Bỏ qua','Skipped')}</span>`:r.ok?`<span class="ap-st ok">${aT('Đạt','Passed')}</span>`:`<span class="ap-st bad">${aT('Lỗi','Failed')}</span>`}
 function openPanel(){if(!isOwner()&&!saved)return;let el=document.getElementById('ap-panel');if(!el){el=document.createElement('div');el.id='ap-panel';el.className='ap-layer';document.body.append(el)}
  const n=Object.values(results),ok=n.filter(r=>r.ok).length;
  el.innerHTML=`<div class="ap-backdrop" data-ap="close"></div><section class="ap-sheet" role="dialog" aria-modal="true" aria-labelledby="ap-title"><header class="ap-head"><h2 id="ap-title">${aT('Tự chạy thử','Self-test')}</h2><button type="button" class="ap-x" data-ap="close" aria-label="${aT('Đóng','Close')}">${typeof uiArt==='function'?uiArt('close-x','btn-art'):'×'}</button></header>
   <div class="ap-body"><p class="ap-intro">${aT('App tự bấm như một người dùng qua từng chức năng — dữ liệu thật của nhà mình không bị thay đổi. Bước nào hỏng sẽ tự gửi vào Góp ý. Bấm “Xem” để xem từng kịch bản chạy chậm.','The app taps through every feature like a person — your family’s real data is never changed. Failures are sent to Feedback automatically. Tap “Watch” to see one run slowly.')}</p>
   <div class="ap-mode" role="radiogroup" aria-label="${aT('Chạy trên','Run on')}"><span class="ap-mode-l">${aT('Chạy trên','Run on')}</span>${([['sample',aT('Gia đình mẫu','Sample family')],['real',aT('Dữ liệu của nhà (bản sao)','Your family’s data (a copy)')]] as [string,string][]).map(([m,l])=>`<button type="button" class="chip${mode===m?' active':''}" role="radio" aria-checked="${mode===m}" data-ap="mode" data-mode="${m}">${esc(l)}</button>`).join('')}</div>
   <p class="ap-mode-note">${mode==='real'?aT('Dùng một bản sao dữ liệu của nhà mình: món, thực đơn, tủ, đi chợ như thật. Bản sao không được lưu, không đồng bộ, không gửi đi; chạy xong là bỏ — dữ liệu thật giữ nguyên. Bước thiếu điều kiện (vd. danh sách đi chợ trống) ghi “Bỏ qua”.','Uses a copy of your family’s data: your recipes, menu, pantry and shopping. The copy is never saved, synced or sent and is dropped afterwards — your data stays as it is. Steps whose starting point is missing (an empty list…) are “Skipped”.'):aT('Dùng một gia đình mẫu tạm, giống nhau mỗi lần chạy.','Uses a temporary sample family, the same every time.')}</p>
   ${n.length?`<p class="ap-sum" role="status">${aT(`Đạt ${ok}/${n.length} kịch bản`,`${ok} of ${n.length} passed`)}${n.some(r=>r.skipped)?aT(` (${n.filter(r=>r.skipped).length} bỏ qua)`,` (${n.filter(r=>r.skipped).length} skipped)`):''}.</p>`:''}
   ${[[aT('Workflow trọn vẹn','Whole workflows'),SC.filter((x:any)=>x.workflow)],[aT('Kiểm tra nhanh','Quick checks'),SC.filter((x:any)=>!x.workflow)]].filter(([,l]:any)=>l.length).map(([h,list]:any)=>`<h3 class="ap-group">${esc(h)} <small>(${list.length})</small></h3><ol class="ap-list">${list.map((sc:any)=>{const r=results[sc.id];return `<li class="ap-item"><div class="ap-txt"><b>${esc(aT(sc.vi,sc.en))}</b><small>${esc(aT(sc.dvi,sc.den))}</small>${r?.skipped?`<small>${esc(r.msg||'')}</small>`:''}${r&&!r.ok?(r.fails&&r.fails.length?r.fails:[{step:r.step||'',msg:r.msg||''}]).map((x:any)=>`<small class="ap-err">${esc(aT('Bước','Step'))} “${esc(x.step)}”: ${esc(x.msg)}</small>`).join(''):''}${r?.ok&&!r.skipped&&r.parts?`<small>${esc(aT(`${r.parts} bước đạt`,`${r.parts} steps passed`))}</small>`:''}</div>${status(sc.id)}<button type="button" class="btn ap-watch" data-ap="watch" data-id="${sc.id}">${aT('Xem','Watch')}</button></li>`}).join('')}</ol>`).join('')}</div>
   <footer class="ap-foot"><button type="button" class="btn primary" data-ap="all">${art('play')}<span>${aT('Chạy tất cả','Run all')}</span></button></footer></section>`;
  (el.querySelector('[data-ap="all"]') as HTMLElement)?.focus()}
 function closePanel(){document.getElementById('ap-panel')?.remove()}
 function drawBar(){closePanel();let b=document.getElementById('ap-bar');if(!b){b=document.createElement('div');b.id='ap-bar';b.className='ap-bar';b.setAttribute('role','status');document.body.append(b)}
  b.innerHTML=`<div class="ap-bar-txt"><b id="ap-name">${aT('Tự chạy thử','Self-test')}</b><span id="ap-step" aria-live="polite"></span></div><button type="button" class="btn ap-stop" data-ap="stop">${aT('Dừng','Stop')}</button><div id="ap-ring" class="ap-ring" hidden></div>`}
 document.addEventListener('click',e=>{const b=(e.target as any)?.closest?.('[data-ap]') as HTMLElement|null;if(!b)return;const a=b.dataset.ap;
  if(a==='open'){e.preventDefault();G.bepLadybug?.close?.(false);openPanel()}
  else if(a==='close')closePanel();
  else if(a==='mode'){const m=b.dataset.mode==='real'?'real':'sample';if(m!==mode){mode=m;for(const k of Object.keys(results))delete results[k];try{localStorage.setItem('bep-autoplay-mode',m)}catch{}}openPanel();(document.querySelector(`#ap-panel [data-ap="mode"][data-mode="${m}"]`) as HTMLElement)?.focus()}
  else if(a==='all'){closePanel();void runList([...SC.filter((x:any)=>x.workflow),...SC.filter((x:any)=>!x.workflow)],false)}
  else if(a==='watch'){const sc=SC.find(x=>x.id===b.dataset.id);if(sc){closePanel();void runList([sc],true)}}
  else if(a==='stop'&&run)run.stop=true});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.getElementById('ap-panel'))closePanel()});
 // the entry inside the ladybug sheet, for family owners only
 function entry(){const tabs=document.querySelector('.lb-sheet .lb-tabs');if(!tabs||!isOwner()||document.querySelector('.lb-sheet [data-ap="open"]'))return;
  tabs.insertAdjacentHTML('afterend',`<div class="ap-entry"><button type="button" class="btn ap-open" data-ap="open">${aT('Tự chạy thử','Self-test')}</button><small>${aT('App tự bấm thử các chức năng trên gia đình mẫu.','The app tries every feature on a sample family.')}</small></div>`)}
 new MutationObserver(()=>entry()).observe(document.body,{childList:true,subtree:true});
 G.bepAutoplay={kit:{tap,type,waitFor,waitGone,find,step,expect,go,noOverflow,part,skip,sleep,aT,visible,watch:()=>!!run?.watch,mode:()=>mode},register:(sc:any)=>{if(!SC.some(x=>x.id===sc.id))SC.push(sc)},setMode:(m:'sample'|'real')=>{mode=m;for(const k of Object.keys(results))delete results[k]},mode:()=>mode,open:openPanel,run:(ids?:string[],watch=false)=>runList(ids?SC.filter(s=>ids.includes(s.id)):SC,watch),results:()=>({...results}),scenarios:()=>SC.map(s=>s.id),running:()=>!!run};
})();
