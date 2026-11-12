'use strict';
// v1.7.15 search (owner, 8 Nov 2026: “làm một cái magnify glass trên góc phải của mỗi trang làm tìm kiếm những thứ mà người ta cần”;
// plan approved by pop-up). A drawn magnifier at the top right of every screen opens one search over what is on this device:
// dishes, pantry, shopping list, the menu (this and the coming weeks), receipts / spending / prices, guests and invitations, and the
// app's features and settings. Owner pop-up: the switches that turn off usage or voice statistics are NOT offered by the search.
// No voice search (owner: “chưa cần”). Typed words never leave the device. Accents optional (“bun bo” → Bún bò), VI and EN names.
// The feature list (APP_FEATURES) is shared with the “Tính năng” tab of Hướng dẫn sử dụng.
(()=>{
const sT=(vi:string,en:string)=>typeof appLanguage!=='undefined'&&appLanguage==='en'?en:vi;
// v1.7.19 (audit B13): amounts in the record's own currency, with the app's one money formatter (VND 125.000 ₫, never $125000.00)
const sMoney=(n:any,c:any)=>typeof aud==='function'?aud(+n,c||undefined):'$'+(+n).toFixed(2);
const sNorm=(s:any)=>typeof normalizeText==='function'?normalizeText(s):String(s||'').toLowerCase();
type AppFeature={id:string,art:string,vi:string,en:string,dvi:string,den:string,kw:string,go:()=>void};
const goView=(v:string)=>()=>{if(typeof closeModal==='function')closeModal();location.hash=v};
const goToday=(after?:()=>void)=>()=>{if(typeof closeModal==='function')closeModal();if(typeof sydneyDate==='function'){selectedDate=sydneyDate();weekStart=planStartOf(state,selectedDate)}location.hash='today';if(typeof render==='function')render();if(after)setTimeout(after,60)};
const clickIn=(sel:string)=>()=>(document.querySelector(sel) as HTMLElement|null)?.click();
const call=(fn:string,...a:any[])=>()=>{const f=(globalThis as any)[fn];if(typeof closeModal==='function')closeModal();if(typeof f==='function')setTimeout(()=>f(...a),0)};
const APP_FEATURES:AppFeature[]=[
 {id:'today',art:'calendar',vi:'Hôm nay',en:'Today',dvi:'Bữa hôm nay, ai ăn bữa nào, đánh dấu đã nấu và đồ ăn còn dư.',den:'Today’s meals, who eats each one, marking a meal cooked and leftovers.',kw:'hom nay today bua an da nau cooked leftovers con du',go:goToday()},
 {id:'planner',art:'plan-week',vi:'Thực đơn tuần',en:'Weekly menu',dvi:'Lên thực đơn cả tuần, lặp tuần trước, kế hoạch tuần tới và khẩu vị gia đình.',den:'Plan the whole week, repeat last week, plan next week and the family’s tastes.',kw:'thuc don tuan menu planner len thuc don ke hoach tuan toi lap tuan truoc khau vi',go:goView('planner')},
 {id:'shopping',art:'cart',vi:'Đi chợ',en:'Shopping',dvi:'Danh sách mua tự tính từ thực đơn, trừ đồ trong tủ; chế độ đi chợ; cất đồ vào tủ.',den:'The list worked out from the menu minus the pantry; shopping mode; putting things away.',kw:'di cho shopping list danh sach mua che do di cho cat do put away',go:goView('shopping')},
 {id:'pantry',art:'fridge',vi:'Tủ đồ',en:'Pantry',dvi:'Đồ đang có trong ngăn mát, ngăn đông, tủ khô; hạn dùng và giải phóng tủ lạnh.',den:'What is in the fridge, freezer and cupboard; use-by dates and using things up.',kw:'tu do tu lanh pantry fridge freezer ngan mat ngan dong tu kho han dung use by giai phong',go:goView('pantry')},
 {id:'recipes',art:'book',vi:'Món ăn',en:'Recipes',dvi:'Kho món và món của nhà; viết món mới, ảnh món, chia sẻ cộng đồng.',den:'The recipe library and your own dishes; write a new one, dish photos, community sharing.',kw:'mon an recipes kho mon viet mon cong thuc nau an',go:goView('recipes')},
 {id:'receipt',art:'receipt',vi:'Hoá đơn',en:'Receipts',dvi:'Chụp hoá đơn, tự cắt và đọc từng dòng (tên · số lượng · giá), đối chiếu đi chợ và tủ.',den:'Snap a receipt; it is cropped and read line by line (name · amount · price) and checked against shopping and the pantry.',kw:'hoa don receipt chup scan quet cat crop ocr',go:goView('expenses')},
 {id:'spending',art:'money',vi:'Chi tiêu',en:'Spending',dvi:'Tiền chợ theo tuần, ngân sách và giá đã trả.',den:'Weekly grocery spending, budget and the prices you paid.',kw:'chi tieu spending ngan sach budget tien cho',go:goView('expenses')},
 {id:'insights',art:'idea',vi:'Thống kê & sở thích',en:'Insights & tastes',dvi:'Món nhà hay nấu, ai thích món nào, gợi ý cho nhà.',den:'What the family cooks most, who likes what, ideas for you.',kw:'thong ke so thich insights goi y thich khong thich',go:goView('insights')},
 {id:'prices',art:'money',vi:'So Giá',en:'Price Check',dvi:'Giá siêu thị và giá cộng đồng để so trước khi mua.',den:'Supermarket and community prices to compare before buying.',kw:'so gia gia price check sieu thi coles woolworths aldi khuyen mai specials',go:goView('products')},
 {id:'guests',art:'family',vi:'Có khách',en:'Guests',dvi:'Thêm khách cho một hay nhiều bữa; giỏ đi chợ tính theo tổng.',den:'Add guests to one or more meals; the shopping list counts them.',kw:'co khach guests khach moi them nguoi',go:goToday(clickIn('#main .guest-shortcut'))},
 {id:'invite',art:'share-msg',vi:'Mời khách qua link',en:'Invite guests by link',dvi:'Gửi link để khách tự báo bao nhiêu người đến, không cần tài khoản.',den:'Send a link so guests say how many are coming, no account needed.',kw:'moi khach invite link rsvp loi moi',go:goToday(clickIn('#main .guest-shortcut'))},
 {id:'calendar',art:'calendar',vi:'Lịch tháng',en:'Month calendar',dvi:'Ai bận, ai vắng trong tháng; bữa nào không ăn ở nhà.',den:'Who is busy or away this month; meals not eaten at home.',kw:'lich thang calendar ban vang away busy',go:goToday(clickIn('#main .calendar-shortcut'))},
 {id:'urgent',art:'urgent',vi:'Nhắn khẩn',en:'Urgent messages',dvi:'Nhắn nhanh cho cả nhà, hiện ngay trên điện thoại.',den:'A quick message to the whole family, shown on their phones at once.',kw:'nhan khan urgent tin nhan message thong bao',go:goToday(()=>{const d=document.querySelector('#main .family-urgent') as HTMLDetailsElement|null;if(d){d.open=true;d.scrollIntoView({block:'center'})}})},
 {id:'voice',art:'mic',vi:'Nhập bằng giọng nói',en:'Voice input',dvi:'Nói món cần mua, món ăn hay đồ cất tủ; app ghi lại.',den:'Say what to buy, a dish or what you put away; the app writes it down.',kw:'giong noi voice mic noi nhap',go:call('voiceModal')},
 {id:'reminders',art:'bell',vi:'Nhắc nhở & thông báo',en:'Reminders & notifications',dvi:'Nhắc đi chợ, nấu ăn; thông báo trên điện thoại.',den:'Reminders to shop and cook; notifications on your phone.',kw:'nhac nho reminders thong bao notifications push',go:call('remindersModal')},
 {id:'members',art:'whole-family',vi:'Thành viên & khẩu phần',en:'Members & portions',dvi:'Ai trong nhà, mỗi người ăn bao nhiêu.',den:'Who is in the family and how much each person eats.',kw:'thanh vien members khau phan portions nguoi',go:call('kitchenModal','members')},
 {id:'family',art:'family',vi:'Kết nối gia đình',en:'Family sync',dvi:'Dùng chung dữ liệu với người nhà trên nhiều máy; mời thành viên.',den:'Share the kitchen with your family on several devices; invite members.',kw:'ket noi gia dinh family sync dong bo moi thanh vien tai khoan account',go:call('kitchenModal','family')},
 {id:'currency',art:'money',vi:'Tiền tệ & giá',en:'Currency & prices',dvi:'Đổi tiền tệ và giá nguyên liệu.',den:'Change the currency and ingredient prices.',kw:'tien te currency gia price doi tien',go:call('otherSettingsModal','currency')},
 {id:'appearance',art:'theme-light',vi:'Giao diện sáng / tối',en:'Light / dark look',dvi:'Sáng, tối hoặc tự động; màu giao diện.',den:'Light, dark or automatic; colour theme.',kw:'giao dien sang toi dark light theme mau',go:call('otherSettingsModal','appearance')},
 {id:'data',art:'download',vi:'Sao lưu dữ liệu',en:'Back up your data',dvi:'Xuất và khôi phục bản sao lưu; nhập từ Notes.',den:'Export and restore a backup; import from Notes.',kw:'sao luu backup du lieu data xuat export khoi phuc restore notes',go:call('otherSettingsModal','data')},
 {id:'offline',art:'download',vi:'Dùng khi mất mạng',en:'Use offline',dvi:'Tải sẵn để dùng khi không có mạng.',den:'Download ahead to use without internet.',kw:'offline mat mang tai ve download khong co mang',go:call('otherSettingsModal','offline-downloads')},
 {id:'guide',art:'guide',vi:'Hướng dẫn sử dụng',en:'How to use',dvi:'Xem lại các bước bắt đầu và danh sách tính năng.',den:'The first steps again and the list of features.',kw:'huong dan how to use guide tour',go:call('openGuide',0)},
 {id:'terms',art:'note',vi:'Điều khoản & quyền riêng tư',en:'Terms & privacy',dvi:'Điều khoản sử dụng và cách app giữ dữ liệu.',den:'Terms of use and how the app keeps your data.',kw:'dieu khoan terms quyen rieng tu privacy',go:()=>{location.href='/terms.html'}},
];
(globalThis as any).APP_FEATURES=APP_FEATURES;

type Hit={g:string,title:string,sub:string,score:number,go:()=>void};
const GROUPS:[string,string,string][]=[['recipe','Món ăn','Recipes'],['pantry','Trong tủ','In the pantry'],['shopping','Đi chợ','Shopping'],['menu','Thực đơn','Menu'],['receipt','Hoá đơn & giá','Receipts & prices'],['guest','Khách','Guests'],['feature','Tính năng & cài đặt','Features & settings']];
function sScore(q:string,words:string[],hay:string){if(!q)return 0;const h=' '+hay+' ';if(!words.every(w=>h.includes(w)))return 0;if(hay.startsWith(q))return 3;if(h.includes(' '+q))return 2;return 1}
const sIng=(id:string)=>typeof shopIngName==='function'?shopIngName(id):(INGREDIENTS[id]?.[0]||id);
const sBoth=(id:string)=>`${INGREDIENTS[id]?.[0]||''} ${typeof INGREDIENT_EN!=='undefined'?(INGREDIENT_EN as any)[id]||'':''}`;
function sFocus(sel:string){setTimeout(()=>{const el=document.querySelector(sel) as HTMLElement|null;if(!el)return;el.scrollIntoView({block:'center'});el.classList.add('search-hit');setTimeout(()=>el.classList.remove('search-hit'),2400)},120)}
function sDay(d:string){return `${typeof dayShort==='function'?dayShort(d):''} ${typeof dateLabel==='function'?dateLabel(d):d}`.trim()}
function searchHits(raw:string):Hit[]{const q=sNorm(raw);if(!q)return[];const words=q.split(' ').filter(Boolean),out:Hit[]=[];const add=(g:string,title:string,sub:string,hay:string,go:()=>void)=>{const sc=sScore(q,words,sNorm(hay));if(sc)out.push({g,title,sub,score:sc,go})};
 const close=()=>{if(typeof closeModal==='function')closeModal()};
 // dishes
 for(const r of (state.recipes||[]) as any[]){if(!r?.name)continue;add('recipe',r.name,[typeof CATEGORY!=='undefined'?CATEGORY[r.category]:'',r.time?`${r.time} ${sT('phút','min')}`:''].filter(Boolean).join(' · '),String(r.name),()=>{close();setTimeout(()=>showRecipe(r.id),0)})}
 // pantry
 for(const p of (state.pantry||[]) as any[]){if(!INGREDIENTS[p.ingredient]||!(p.qty>0||p.purchase?.amount>0))continue;const name=sIng(p.ingredient);
  add('pantry',name,[typeof pantryBuyingDisplay==='function'?pantryBuyingDisplay(p):'',{fridge:sT('Ngăn mát','Fridge'),freezer:sT('Ngăn đông','Freezer'),dry:sT('Tủ khô','Pantry shelf')}[p.place as 'fridge'|'freezer'|'dry']||'',p.expiry?sT('hạn ','use by ')+(typeof dateLabel==='function'?dateLabel(p.expiry):p.expiry):''].filter(Boolean).join(' · '),`${name} ${sBoth(p.ingredient)}`,()=>{close();if(typeof pantryFilter!=='undefined')pantryFilter='all';location.hash='pantry';sFocus(`#main .inventory-card[data-ing="${CSS.escape(p.ingredient)}"]`)})}
 // shopping list in view
 try{const w=currentWeek(),[s,e]=shopDates();for(const r of shopping(state,w,s,e) as any[]){if(r.skip||!(typeof shoppingHasAmount!=='function'||shoppingHasAmount(r)))continue;const name=sIng(r.id);
  add('shopping',name,r.bought?sT('Đã mua','Bought'):sT('Cần mua','To buy')+(typeof fmtQty==='function'&&r.missing>0?' '+fmtQty(r.missing,INGREDIENTS[r.id][1]):''),`${name} ${sBoth(r.id)}`,()=>{close();location.hash='shopping';sFocus(`#main .shop-row:has([data-id="${CSS.escape(r.id)}"])`)})}}catch{}
 // menu: two weeks back to four weeks ahead
 if(typeof sydneyDate==='function'){const today=sydneyDate();for(let i=-14;i<=28;i++){const d=addDays(today,i),wk=state.weeks?.[monday(d)],day=wk?.days?.[d];if(!day)continue;
  for(const t of MEAL_TYPES){const m=day[t];if(!m?.recipes?.length)continue;for(const r of m.recipes as any[])add('menu',r.name,`${mealName(t)} · ${sDay(d)}${i===0?' · '+sT('hôm nay','today'):''}`,r.name,()=>{close();selectedDate=d;weekStart=planStartOf(state,d);location.hash='today';render();sFocus(`#main .family-meal-card[data-meal-date="${d}"][data-meal-type="${t}"]`)})}
  // guests on those meals
  for(const t of MEAL_TYPES){const m=day[t];for(const g of (typeof guestGroups==='function'?guestGroups(m):[]) as any[]){if(!g.name||i<0)continue;const st=typeof rsvpLabel==='function'&&g.invite?rsvpLabel(g):(typeof guestGroupShort==='function'?guestGroupShort(g):'');
   add('guest',g.name,`${st} · ${mealName(t).toLowerCase()} ${sDay(d)}`,g.name,()=>{close();setTimeout(()=>guestSheet(d,t),0)})}}}}
 // receipts, items and prices
 for(const r of (state.receipts||[]) as any[]){const when=r.date&&typeof dateLabel==='function'?dateLabel(r.date):(r.date||'');add('receipt',r.store||sT('Hoá đơn','Receipt'),[when,r.total!=null?sMoney(r.total,r.currency):''].filter(Boolean).join(' · '),`${r.store||''} hoa don receipt`,()=>{close();setTimeout(()=>openReceipt(r.id),0)});
  for(const it of (r.items||[]) as any[]){if(!it?.label)continue;const ing=it.ingredient&&INGREDIENTS[it.ingredient]?sIng(it.ingredient):'';add('receipt',it.label,[it.total!=null?sMoney(it.total,r.currency):'',r.store||'',when].filter(Boolean).join(' · '),`${it.label} ${ing?sBoth(it.ingredient):''}`,()=>{close();setTimeout(()=>openReceipt(r.id),0)})}}
 // features and settings (the usage / voice statistics switches are left out — owner pop-up, 8 Nov 2026)
 for(const f of APP_FEATURES)add('feature',sT(f.vi,f.en),sT(f.dvi,f.den),`${f.vi} ${f.en} ${f.kw}`,f.go);
 return out}
function searchResultsHtml(raw:string){const q=sNorm(raw);if(!q)return `<p class="hint search-empty">${sT('Gõ tên món, nguyên liệu, cửa hàng, tên khách hoặc việc cần làm (ví dụ: bun bo, thit ba chi, Coles, moi khach, sao luu).','Type a dish, ingredient, shop, guest or something to do (e.g. pho, pork belly, Coles, invite, backup).')}</p>`;
 const hits=searchHits(raw);if(!hits.length)return `<p class="hint search-empty">${sT('Không thấy gì khớp.','Nothing matches.')}</p>`;
 searchLast=[];let html='';for(const [g,vi,en] of GROUPS){const list=hits.filter(h=>h.g===g).sort((a,b)=>b.score-a.score||a.title.localeCompare(b.title)).filter((h,i,a)=>a.findIndex(x=>x.title===h.title&&x.sub===h.sub)===i).slice(0,6);if(!list.length)continue;
  html+=`<section class="search-group" aria-label="${esc(sT(vi,en))}"><h3>${esc(sT(vi,en))}</h3><ul>${list.map(h=>{searchLast.push(h);return `<li><button type="button" class="search-hit-row" data-search-go="${searchLast.length-1}"><b data-user-content>${esc(h.title)}</b>${h.sub?`<small data-user-content>${esc(h.sub)}</small>`:''}</button></li>`}).join('')}</ul></section>`}
 return html}
let searchLast:Hit[]=[],searchTimer:any=null;
function openSearch(){modal(sT('Tìm kiếm','Search'),`<div class="search-box"><label class="sr-only" for="app-search-input">${sT('Tìm trong app','Search the app')}</label><input id="app-search-input" type="search" autocomplete="off" enterkeyhint="search" placeholder="${esc(sT('Tìm món, đồ trong tủ, hoá đơn, khách…','Search dishes, pantry, receipts, guests…'))}"></div><div id="search-results" class="search-results" aria-live="polite">${searchResultsHtml('')}</div>`,`<button class="btn" type="button" data-action="close-modal">${sT('Đóng','Close')}</button>`,true);
 document.querySelector('#modal-root .modal')?.classList.add('search-modal');const input=document.getElementById('app-search-input') as HTMLInputElement|null;input?.focus()}
document.addEventListener('input',e=>{const t=e.target as HTMLInputElement;if(t?.id!=='app-search-input')return;clearTimeout(searchTimer);searchTimer=setTimeout(()=>{const box=document.getElementById('search-results');if(box)box.innerHTML=searchResultsHtml(t.value)},80)});
document.addEventListener('keydown',e=>{const t=e.target as HTMLInputElement;if(t?.id==='app-search-input'&&e.key==='Enter'){e.preventDefault();const box=document.getElementById('search-results');if(box)box.innerHTML=searchResultsHtml(t.value);searchLast[0]?.go()}});
document.addEventListener('click',e=>{const b=(e.target as any)?.closest?.('[data-search-go],[data-search="open"]');if(!b)return;e.preventDefault();if(b.dataset.search==='open'){openSearch();return}searchLast[+b.dataset.searchGo]?.go()});
function installSearchButton(){const top=document.querySelector('.topbar .top-actions');if(!top||top.querySelector('#app-search'))return;top.insertAdjacentHTML('afterbegin',`<button type="button" id="app-search" class="icon app-search" data-search="open" aria-label="${esc(sT('Tìm kiếm','Search'))}" title="${esc(sT('Tìm kiếm','Search'))}"></button>`);
 const b=top.querySelector('#app-search');if(b&&typeof uiArt==='function'){b.innerHTML=uiArt('search','btn-art');(b as HTMLElement).dataset.btnArt='search'}}
{const searchBaseRender=render;render=function(this:any,...a:any[]){const r=searchBaseRender.apply(this,a);try{installSearchButton();const b=document.getElementById('app-search');if(b){const l=sT('Tìm kiếm','Search');b.setAttribute('aria-label',l);b.title=l}}catch(err){console.warn('search button',err)}return r}}
installSearchButton();
(globalThis as any).openSearch=openSearch;(globalThis as any).searchHits=searchHits;

// ── “Tính năng” tab in Hướng dẫn sử dụng (owner: “trong how to use thì cần có 1 tab để cho người ta biết mình có features gì và nó là
//    như thế nào”): Bắt đầu (the steps, as before) │ Tính năng (every feature with its drawing, what it does and “Mở”).
function guideFeaturesHtml(){return `<ul class="feature-list">${APP_FEATURES.map((f,i)=>`<li class="feature-item">${typeof uiArt==='function'?`<span class="feature-art" aria-hidden="true">${uiArt(f.art,'feature-pic')}</span>`:''}<div class="feature-copy"><b>${esc(sT(f.vi,f.en))}</b><small>${esc(sT(f.dvi,f.den))}</small></div><button type="button" class="btn small feature-open" data-feature-go="${i}" aria-label="${esc(sT('Mở ','Open ')+sT(f.vi,f.en))}">${sT('Mở','Open')}</button></li>`).join('')}</ul>`}
function guideTabs(tab:'steps'|'features'){const tour=document.querySelector('#modal-root [data-guide-tour]') as HTMLElement|null;if(!tour)return;let bar=document.querySelector('#modal-root .guide-tabs') as HTMLElement|null;
 if(!bar){tour.insertAdjacentHTML('beforebegin',`<div class="guide-tabs chips" role="tablist" aria-label="${esc(sT('Hướng dẫn','Guide'))}"><button type="button" class="chip" role="tab" id="guide-tab-steps" data-guide-tab="steps" aria-controls="guide-panel-steps">${sT('Bắt đầu','Getting started')}</button><button type="button" class="chip" role="tab" id="guide-tab-features" data-guide-tab="features" aria-controls="guide-panel-features">${sT('Tính năng','Features')}</button></div><div id="guide-panel-features" class="guide-features" role="tabpanel" aria-labelledby="guide-tab-features" hidden>${guideFeaturesHtml()}</div>`);
  document.querySelector('#modal-root .modal')?.classList.add('guide-has-tabs');/* fixed height: switching tabs never moves the tabs (rule 24) */
  tour.id='guide-panel-steps';tour.setAttribute('role','tabpanel');tour.setAttribute('aria-labelledby','guide-tab-steps');bar=document.querySelector('#modal-root .guide-tabs') as HTMLElement}
 for(const b of bar!.querySelectorAll('[data-guide-tab]') as any){const on=b.dataset.guideTab===tab;b.setAttribute('aria-selected',String(on));b.classList.toggle('active',on);b.tabIndex=on?0:-1}
 tour.hidden=tab!=='steps';(document.getElementById('guide-panel-features') as HTMLElement).hidden=tab!=='features'}
if(typeof openGuide==='function'){const guideBase=openGuide;openGuide=function(this:any,...a:any[]){const r=guideBase.apply(this,a);try{guideTabs('steps');const md=document.querySelector('#modal-root .modal') as HTMLElement|null;if(md)md.scrollTop=0}catch(err){console.warn('guide tabs',err)}return r}}
document.addEventListener('click',e=>{const t=(e.target as any)?.closest?.('[data-guide-tab]');if(t){e.preventDefault();const y=t.getBoundingClientRect().top;guideTabs(t.dataset.guideTab);const dy=t.getBoundingClientRect().top-y;if(dy){for(let el=t.parentElement;el&&el!==document.body;el=el.parentElement){if(el.scrollHeight>el.clientHeight&&/auto|scroll/.test(getComputedStyle(el).overflowY)){el.scrollTop+=dy;break}}}return}
 const f=(e.target as any)?.closest?.('[data-feature-go]');if(f){e.preventDefault();APP_FEATURES[+f.dataset.featureGo]?.go()}});
(globalThis as any).guideTabs=guideTabs;
})();
