// v1.7.16 (owner, 8 Nov 2026: “Phần bar ở dưới này nên làm chế độ trượt qua lại được như thế sẽ nhanh hơn là phải vào ‘thêm’”):
// on phones the bottom bar slides sideways and holds every section — Hôm nay, Thực đơn, Đi chợ, Món ăn, Tủ, Chi tiêu, Thói quen,
// Giá — with “Thêm” (settings, guide, install) at the end. Four fit on the screen; a soft fade on the edge shows there is more.
// Each section has its own line drawing (the old text symbols ▤ ▧ ◷ ◴ ⌂ are replaced) and a short name that fits, with the full
// name kept for screen readers. The bar keeps its sideways position when the page redraws, and the open section is brought into
// view without moving the page (rule 24). Wider screens keep the sidebar as before.
(function(){
 const nT=(vi:string,en:string)=>typeof tr==='function'?tr(vi,en):vi;
 const ICON:Record<string,string>={
  today:'<path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 9.8V20h13V9.8"/><path d="M10 20v-5.5h4V20"/>',
  recipes:'<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11M9 8h6"/>',
  pantry:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M5 10h14M9 6.5v1M9 13v3"/>',
  expenses:'<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M16 15h2"/>',
  insights:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  products:'<path d="M20 12 12 20 4 12V4h8z"/><circle cx="8" cy="8" r="1.5"/>'};
 const SHORT:Record<string,[string,string]>={today:['Hôm nay','Today'],planner:['Thực đơn','Menu'],shopping:['Đi chợ','Shopping'],recipes:['Món ăn','Recipes'],pantry:['Tủ','Pantry'],expenses:['Chi tiêu','Spending'],insights:['Thói quen','Habits'],products:['Giá','Prices']};
 const svg=(p:string)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
 let keepLeft=0;

 // v1.7.17 (owner, 9 Nov 2026: “không có sign để biết là có thêm menu và cần quẹt trái phải… để khoảng vài giây… nếu không làm gì thì
 // nó sẽ trở lại”; pop-ups: arrows ‹ › at both ends, and the bar slides back after 5 seconds without a touch — the page stays):
 //  • a drawn arrow sits over each end that has more sections; tapping it slides the bar; the last tab peeks out half-way;
 //  • the first time on a device the bar nudges sideways once to show it moves (not under reduced motion);
 //  • 5 seconds after the family last slid it without choosing, the bar slides back to the start (keeping the open section in view).
 const IDLE_MS=5000;let idle:any=0,auto=false;
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 const phone=()=>matchMedia('(max-width:760px)').matches;
 // where the bar rests: the start, or as near it as keeps the open section clear of the right arrow (measured on screen)
 const ARROW_ROOM=48;
 function home(nav:HTMLElement){const on=nav.querySelector('a.active') as HTMLElement|null;if(!on)return 0;const b=nav.getBoundingClientRect(),a=on.getBoundingClientRect(),right=a.right-b.left-nav.clientLeft+nav.scrollLeft,max=nav.scrollWidth-nav.clientWidth;
  return right>nav.clientWidth-ARROW_ROOM?Math.min(max,Math.max(0,right-nav.clientWidth+ARROW_ROOM)):0}
 function slideTo(nav:HTMLElement,left:number){auto=true;nav.scrollTo({left,behavior:reduced()?'auto':'smooth'});setTimeout(()=>{auto=false;keepLeft=nav.scrollLeft;fade(nav)},reduced()?30:420)}
 function waitIdle(nav:HTMLElement){clearTimeout(idle);idle=setTimeout(()=>{if(!nav.isConnected)return;const h=home(nav);if(Math.abs(nav.scrollLeft-h)>4)slideTo(nav,h)},IDLE_MS)}
 function arrows(nav:HTMLElement){const bar=nav.parentElement as HTMLElement;if(!bar)return;
  for(const side of ['left','right']){let b=bar.querySelector(`.nav-arrow-${side}`) as HTMLButtonElement|null;
   if(!b){b=document.createElement('button');b.type='button';b.className=`nav-arrow nav-arrow-${side}`;b.dataset.navArrow=side;b.setAttribute('aria-label',side==='left'?nT('Xem các mục bên trái','Show the sections on the left'):nT('Xem thêm mục bên phải','Show more sections on the right'));
    b.innerHTML=typeof uiArt==='function'?uiArt(side==='left'?'arrow-left':'arrow-right','btn-art'):'';b.dataset.btnArt='own';bar.append(b);
    b.addEventListener('click',()=>{const step=Math.round(nav.clientWidth*.6);slideTo(nav,Math.max(0,Math.min(nav.scrollWidth-nav.clientWidth,nav.scrollLeft+(side==='left'?-step:step))));waitIdle(nav)})}
   b.style.top=nav.offsetTop+'px';b.style.height=nav.offsetHeight+'px'}
  const more=nav.scrollWidth-nav.clientWidth-nav.scrollLeft>4,less=nav.scrollLeft>4;const show=phone()&&nav.scrollWidth>nav.clientWidth+4;
  (bar.querySelector('.nav-arrow-right') as HTMLElement).hidden=!(show&&more);(bar.querySelector('.nav-arrow-left') as HTMLElement).hidden=!(show&&less)}
 function nudgeOnce(nav:HTMLElement){if(!phone()||reduced()||nav.scrollWidth<=nav.clientWidth+4)return;try{if(localStorage.getItem('bep-nav-nudged'))return;localStorage.setItem('bep-nav-nudged','1')}catch{return}
  setTimeout(()=>{if(!nav.isConnected||nav.scrollLeft>4)return;slideTo(nav,64);setTimeout(()=>slideTo(nav,home(nav)),900)},900)}
 function fade(nav:HTMLElement){const more=nav.scrollWidth-nav.clientWidth-nav.scrollLeft>4,less=nav.scrollLeft>4;nav.classList.toggle('nav-more-right',more);nav.classList.toggle('nav-more-left',less);try{arrows(nav)}catch{}}
 function decorate(){const nav=document.getElementById('nav');if(!nav||!document.querySelector('.sidebar'))return;
  for(const a of nav.querySelectorAll('a[href^="#"]') as NodeListOf<HTMLAnchorElement>){const id=a.getAttribute('href')!.slice(1),icon=a.querySelector('.nav-icon');
   if(icon&&ICON[id]&&(!icon.querySelector('svg')||icon.querySelector('.emo-art')))icon.innerHTML=svg(ICON[id]);
   const s=SHORT[id];if(s&&!a.querySelector('.nav-short')){const full=String((typeof labels!=='undefined'&&(labels as any)[id]?.[1])||[...a.childNodes].filter(n=>!(n as any).classList?.contains?.('nav-icon')).map(n=>n.textContent).join(' ')).replace(/\s+/g,' ').trim();
    const short=`<span class="nav-short" aria-hidden="true">${esc(nT(s[0],s[1]))}</span>`;if(icon)icon.insertAdjacentHTML('afterend',short);else a.insertAdjacentHTML('afterbegin',short);if(full&&!a.getAttribute('aria-label'))a.setAttribute('aria-label',full)}}
  if(!(nav as any)._navScroll){(nav as any)._navScroll=true;nav.addEventListener('scroll',()=>{keepLeft=nav.scrollLeft;fade(nav);if(!auto)waitIdle(nav)},{passive:true});
   nav.addEventListener('click',()=>clearTimeout(idle));nudgeOnce(nav)}
  // keep where the family slid to; bring the open section into view sideways only (never scrolls the page)
  nav.scrollLeft=keepLeft;const on=nav.querySelector('a.active') as HTMLElement|null;
  if(on&&nav.scrollWidth>nav.clientWidth){const b=nav.getBoundingClientRect(),a=on.getBoundingClientRect();if(a.left<b.left+ARROW_ROOM&&nav.scrollLeft>0)nav.scrollLeft=Math.max(0,nav.scrollLeft-(b.left+ARROW_ROOM-a.left));else if(a.right>b.right-ARROW_ROOM)nav.scrollLeft+=a.right-(b.right-ARROW_ROOM);keepLeft=nav.scrollLeft}
  fade(nav)}
 {const base=render;render=function(this:any,...a:any[]){const nav=document.getElementById('nav');if(nav)keepLeft=nav.scrollLeft;const r=base.apply(this,a);try{decorate()}catch(e){console.warn('nav scroll',e)}return r}}
 addEventListener('resize',()=>{const nav=document.getElementById('nav');if(nav)fade(nav)});
 try{decorate()}catch{}
})();
