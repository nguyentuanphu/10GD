'use strict';
// v1.7.5 (owner, 5 Nov 2026): "phải kéo xuống sâu mới biết cần mua gì" — every screen opens on what matters.
// Runs after every other render step (loaded last) and only rearranges what they produced:
//  - the device-only note becomes one slim line; on phones the page intro text and eyebrow give way to the content;
//  - “Bếp của nhà mình / Nhập bằng lời nói” stay large on Today only, small elsewhere; the Simple/Full switch loses
//    its description on phones;
//  - Shopping: the list comes first. Range + “+ Mua thêm” stay; the other tools fold into “Công cụ”. v1.7.6: So Giá
//    sits folded right above the list (one line with the chosen trip plan) and opens in place.
function clMain(){return document.getElementById('main')}
function clText(vi:string,en:string){return typeof tr==='function'?tr(vi,en):vi}
// the menu is one flat list of buttons: groups and nested disclosures added by other modules are opened up
function clFlattenTools(main:HTMLElement){const body=main.querySelector('.cl-tools-body');if(!body)return;const tools=main.querySelector('.week-tools .toolbar');
 // late additions (other modules render after us) join the menu too
 if(tools)for(const el of [...tools.children])if(!el.matches('[data-change="shop-range"],[data-action="add-extra"],.cl-tools'))body.appendChild(el);
 for(let i=0;i<3;i++)for(const g of [...body.children])if(!g.matches('button,a')){const inner=[...g.querySelectorAll('button,a.btn')].filter(x=>!x.closest('summary'));for(const x of inner)body.insertBefore(x,g);g.remove()}
 const seen=new Set<string>();for(const b of [...body.querySelectorAll('button,a')] as HTMLElement[]){const k=(b.dataset.action||b.dataset.feature||b.dataset.planning||b.dataset.pushAction||'')+'|'+b.textContent!.trim();if(!b.textContent!.trim()||seen.has(k)){b.remove();continue}seen.add(k);b.classList.add('btn','small')}}
function clCompactShopping(main:HTMLElement){
 const tools=main.querySelector('.week-tools .toolbar');
 if(tools&&!tools.querySelector('.cl-tools')){const keep=(b:Element)=>b.matches('[data-change="shop-range"],[data-action="add-extra"]');const moving=[...tools.children].filter(b=>!keep(b));
  if(moving.length){const d=document.createElement('details');d.className='cl-tools';d.innerHTML=`<summary class="btn small">${clText('Công cụ','Tools')} <span aria-hidden="true">▾</span></summary><div class="cl-tools-body"></div>`;const body=d.querySelector('.cl-tools-body')!;for(const b of moving)body.appendChild(b);
   // other tool buttons that sit between the week tools and the list (products, notes) join the same menu
   for(const b of main.querySelectorAll('.week-tools ~ .toolbar .btn, .shopping-extra-tools .btn'))body.appendChild(b);tools.appendChild(d)}}
 clFlattenTools(main)
 // v1.7.6 (owner, 6 Nov 2026): So Giá folds to one line, so it sits right above the list (folded by default; its header
 // carries the chosen trip plan) instead of below it.
 const layout=main.querySelector('.shopping-layout'),scout=main.querySelector('.price-scout');
 if(layout&&scout&&layout.compareDocumentPosition(scout)&Node.DOCUMENT_POSITION_FOLLOWING){layout.before(scout)}
 scout?.classList.add('cl-above');main.querySelector('.cl-scout-summary')?.remove()}
function compactLayout(){const main=clMain();if(!main)return;const v=typeof view==='string'?view:'';main.dataset.clScreen=v;main.classList.add('cl');
 const note=main.querySelector('.callout[data-device-mode]');if(note&&!note.classList.contains('cl-slim')){note.classList.add('cl-slim');const span=note.querySelector('span');if(span)span.textContent=clText('Đang dùng riêng trên máy này','Using this device only');const b=note.querySelector('button');if(b)b.textContent=clText('Kết nối gia đình','Connect family')}
 // the Simple/Full switch joins the title row (one row less on every screen but Today)
 if(v!=='today'&&innerWidth>=420){const sw=main.querySelector('.screen-switch'),acts=main.querySelector('.page-heading .heading-actions');if(sw&&acts&&!acts.contains(sw)){sw.classList.add('cl-in-heading');acts.prepend(sw)}}
 if(v==='shopping')clCompactShopping(main)}
(function installCompactLayout(){const g:any=globalThis;if(g.__bepCompact||typeof g.render!=='function')return;g.__bepCompact=true;const base=g.render;
 g.render=function(this:any,...args:any[]){const r=base.apply(this,args);try{compactLayout()}catch(err){console.warn('compact layout',err)}
  // some modules add their buttons a moment after render; fold those in too
  setTimeout(()=>{try{const m=clMain();if(m&&view==='shopping')clFlattenTools(m)}catch{}},0);return r};
 g.compactLayout=compactLayout;try{compactLayout()}catch{}})();
