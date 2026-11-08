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
 function fade(nav:HTMLElement){const more=nav.scrollWidth-nav.clientWidth-nav.scrollLeft>4,less=nav.scrollLeft>4;nav.classList.toggle('nav-more-right',more);nav.classList.toggle('nav-more-left',less)}
 function decorate(){const nav=document.getElementById('nav');if(!nav||!document.querySelector('.sidebar'))return;
  for(const a of nav.querySelectorAll('a[href^="#"]') as NodeListOf<HTMLAnchorElement>){const id=a.getAttribute('href')!.slice(1),icon=a.querySelector('.nav-icon');
   if(icon&&ICON[id]&&(!icon.querySelector('svg')||icon.querySelector('.emo-art')))icon.innerHTML=svg(ICON[id]);
   const s=SHORT[id];if(s&&!a.querySelector('.nav-short')){const full=String((typeof labels!=='undefined'&&(labels as any)[id]?.[1])||[...a.childNodes].filter(n=>!(n as any).classList?.contains?.('nav-icon')).map(n=>n.textContent).join(' ')).replace(/\s+/g,' ').trim();
    a.insertAdjacentHTML('beforeend',`<span class="nav-short" aria-hidden="true">${esc(nT(s[0],s[1]))}</span>`);if(full&&!a.getAttribute('aria-label'))a.setAttribute('aria-label',full)}}
  if(!(nav as any)._navScroll){(nav as any)._navScroll=true;nav.addEventListener('scroll',()=>{keepLeft=nav.scrollLeft;fade(nav)},{passive:true})}
  // keep where the family slid to; bring the open section into view sideways only (never scrolls the page)
  nav.scrollLeft=keepLeft;const on=nav.querySelector('a.active') as HTMLElement|null;
  if(on&&nav.scrollWidth>nav.clientWidth){const l=on.offsetLeft,r=l+on.offsetWidth;if(l<nav.scrollLeft)nav.scrollLeft=l-8;else if(r>nav.scrollLeft+nav.clientWidth)nav.scrollLeft=r-nav.clientWidth+8;keepLeft=nav.scrollLeft}
  fade(nav)}
 {const base=render;render=function(this:any,...a:any[]){const nav=document.getElementById('nav');if(nav)keepLeft=nav.scrollLeft;const r=base.apply(this,a);try{decorate()}catch(e){console.warn('nav scroll',e)}return r}}
 addEventListener('resize',()=>{const nav=document.getElementById('nav');if(nav)fade(nav)});
 try{decorate()}catch{}
})();
