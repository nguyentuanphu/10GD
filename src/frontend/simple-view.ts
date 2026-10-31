'use strict';
// Display preferences are device-local: a shopper can use large text independently.
let screenPreferences={};
try{screenPreferences=JSON.parse(familyStorage.getItem('bep-screen-preferences')||'{}')||{}}catch(e){}
if(typeof screenPreferences!=='object'||Array.isArray(screenPreferences))screenPreferences={};
const disclosureState=new Map();
const fullRender=render;
function simpleDisclosure(node,title,key,extraClass=''){
  if(!node||node.closest('details.simple-disclosure'))return;
  const details=document.createElement('details');details.className='simple-disclosure'+(extraClass?' '+extraClass:'');details.dataset.disclosure=key;details.open=disclosureState.get(view+':'+key)||false;
  const summary=document.createElement('summary');summary.textContent=title;node.before(details);details.append(summary,node);
}
function applySimpleView(){
  const main=$('#main'),supported=['today','planner','shopping'].includes(view);
  if(!main)return;
  main.classList.remove('simple-screen','full-screen');main.removeAttribute('data-screen');
  main.querySelectorAll('.screen-switch').forEach(el=>el.remove());
  if(!supported)return;
  const simple=screenPreferences[view]!=='full';main.dataset.screen=view;
  const bar=document.createElement('div');bar.className='screen-switch';bar.innerHTML=`<span>${simple?(typeof tr==='function'?tr('Chế độ Đơn giản · Chữ to, ẩn bớt mục phụ để thao tác nhanh','Simple view · Larger text, secondary panels collapsed'):'Chế độ Đơn giản · Chữ to, thao tác nhanh'):(typeof tr==='function'?tr('Chế độ Đầy đủ · Mở toàn bộ bảng điều phối, ngân sách & thống kê','Full view · All coordination, budget & planning panels expanded'):'Hiển thị mọi tùy chọn')}</span><div role="group" aria-label="Chế độ hiển thị"><button class="btn ${simple?'primary':''}" data-screen-mode="simple" aria-pressed="${simple}">Đơn giản</button><button class="btn ${!simple?'primary':''}" data-screen-mode="full" aria-pressed="${!simple}">Đầy đủ</button></div>`;
  (main.querySelector('.kitchen-action-dock')||main.querySelector('.page-heading'))?.after(bar);
  if(!simple){main.classList.add('full-screen');return}
  main.classList.add('simple-screen');
  if(view==='today'){
    main.querySelector('.hero')?.remove();main.querySelector('.mini-stats')?.remove();main.querySelector('.pantry-peek')?.remove();
    simpleDisclosure(main.querySelector('.day-advice'),'Gợi ý ăn hôm nay','advice');
    simpleDisclosure(main.querySelector('.fridge-rescue-card'),'🌱 Giải phóng tủ lạnh & gợi ý món từ tủ','fridge-rescue');

    simpleDisclosure(main.querySelector('.home-coordination'),'🤝 Phân công ai nấu & ai đi chợ','coordination');
    const prep=main.querySelector('.prep-list');if(prep){const title=prep.previousElementSibling;const section=document.createElement('section');prep.before(section);if(title?.classList.contains('section-heading'))section.append(title);section.append(prep);simpleDisclosure(section,'Sơ chế & việc cần làm','prep')}
  }
  if(view==='planner'){
    const grid=main.querySelector('.week-grid, .family-week-grid');grid?.classList.add('meal-list-layout');
    main.querySelector('[data-action="planner-layout"]')?.remove();
    const weekend=main.querySelector('.weekend-panel');simpleDisclosure(weekend,'Ưu tiên món nước cuối tuần','weekend');
    main.querySelectorAll('.family-batch').forEach((b,idx)=>simpleDisclosure(b,'🍲 Chi tiết mẻ nấu cuối tuần (Weekends feast)','batch-'+idx));
    simpleDisclosure(main.querySelector('.summary-banner'),'Khẩu phần & dự tính chi phí','summary');
    const tools=main.querySelector('.week-tools .toolbar');simpleDisclosure(tools,'Tùy chọn thực đơn','planner-tools');
  }
  if(view==='shopping'){
    const tools=main.querySelector('.week-tools .toolbar');
    if(tools&&!tools.querySelector('.toolbar-disclosure')){const advanced=document.createElement('div');advanced.className='toolbar';tools.append(advanced);tools.querySelectorAll('[data-feature]:not([data-feature="notes-import"]), [data-planning="stores"]').forEach(n=>advanced.append(n));simpleDisclosure(advanced,'Nhập Notes, hóa đơn & cửa hàng','shopping-tools','toolbar-disclosure')}
    simpleDisclosure(main.querySelector('.pantry-cart-banner'),'🌱 Xem chi tiết nguyên liệu đang có sẵn trong tủ','pantry-banner');
    simpleDisclosure(main.querySelector('.budget-card'),'💰 Ngân sách dự kiến, chia sẻ & cất đồ vào tủ','budget');
    main.querySelectorAll('.shop-row').forEach((row,index)=>{
      const checkbox=row.querySelector('input[type="checkbox"]');if(!checkbox)return;
      if(!checkbox.id)checkbox.id='large-check-'+index;
      if(!row.querySelector('.large-check-target')){const label=document.createElement('label');label.className='large-check-target';label.htmlFor=checkbox.id;label.title=checkbox.getAttribute('aria-label')||'Đã mua';checkbox.before(label);label.append(checkbox)}
      row.classList.toggle('purchase-complete',checkbox.checked);
    });
    const groupTools=main.querySelector('.shopping-store-tools');
    if(groupTools&&!main.querySelector('.remaining-toggle')){const label=document.createElement('label');label.className='remaining-toggle';label.innerHTML=`<input type="checkbox" class="check" data-screen-remaining ${screenPreferences.remaining?'checked':''}> Chỉ hiện đồ chưa mua`;groupTools.after(label)}
    if(screenPreferences.remaining)main.classList.add('only-remaining');else main.classList.remove('only-remaining');
    const remaining=main.querySelectorAll('.shop-row:not(.purchase-complete) input[type="checkbox"]').length;
    if(screenPreferences.remaining&&!remaining&&!main.querySelector('.all-bought-note')){const note=document.createElement('p');note.className='callout all-bought-note';note.textContent='Không còn đồ chưa mua trong bộ lọc này. Bỏ “Chỉ hiện đồ chưa mua” để xem lại.';main.querySelector('.remaining-toggle')?.after(note)}
  }
}
render=function(){
  fullRender();
  applySimpleView();
};
document.addEventListener('toggle',event=>{const d=event.target;if(d.matches?.('details[data-disclosure]'))disclosureState.set(view+':'+d.dataset.disclosure,d.open)},true);
function saveScreenPreferences(){try{familyStorage.setItem('bep-screen-preferences',JSON.stringify(screenPreferences))}catch(e){toast('Không lưu được chế độ xem; lựa chọn vẫn dùng trong lần mở này.',true)}}
document.addEventListener('click',event=>{const b=event.target.closest('[data-screen-mode]');if(!b)return;screenPreferences[view]=b.dataset.screenMode;saveScreenPreferences();render();$('#main [data-screen-mode="'+b.dataset.screenMode+'"]').focus()});
document.addEventListener('change',event=>{if(!event.target.matches('[data-screen-remaining]'))return;screenPreferences.remaining=event.target.checked;saveScreenPreferences();render();$('#main [data-screen-remaining]')?.focus()});
render();
