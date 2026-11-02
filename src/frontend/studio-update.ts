// Studio · App updates card (v1.6). Separate classic script loaded by dist/studio.html after studio.js; it adds one card
// under Platform settings (#settings): "show update notice" switch and the minimum build every device must run, with a
// one-click "require the current build on every device". Saves go through the existing owner-only, audited
// settings-save operation (the server refuses these keys for non-owners).
(function studioUpdate(){
'use strict';
const main=document.getElementById('main');if(!main)return;
const STUDIO='/.netlify/functions/studio';
const lang=()=>{try{return localStorage.getItem('studio-lang')||(String(navigator.language||'').toLowerCase().startsWith('vi')?'vi':'en')}catch{return 'vi'}};
const T=(vi:string,en:string)=>lang()==='en'?en:vi;
const esc=(v:any)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'} as any)[c]);
let me:any=null,busy=false;
async function getJSON(url:string){const r=await fetch(url,{credentials:'same-origin',cache:'no-store'});if(!r.ok)throw Error(String(r.status));return r.json()}
async function save(patch:any){if(!me)me=await getJSON(STUDIO+'?op=me');const r=await fetch(STUDIO+'?op=settings-save',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','x-studio-csrf':me.csrf},body:JSON.stringify({patch})});const j=await r.json().catch(()=>({}));if(!r.ok)throw Error((lang()==='en'?j.errorEn:j.error)||String(r.status));return j}
async function render(){
 if(busy||location.hash!=='#settings'||!document.getElementById('sf')||document.getElementById('studio-update-card'))return;busy=true;
 try{
  const [settings,build,who]=await Promise.all([getJSON(STUDIO+'?op=settings'),getJSON('/build.json').catch(()=>null),me?Promise.resolve(me):getJSON(STUDIO+'?op=me')]);me=who;
  if(document.getElementById('studio-update-card')||!document.getElementById('sf'))return;
  const v=settings.values||{},owner=who.role==='owner',current=build?.build||'';
  const card=document.createElement('section');card.className='card form';card.id='studio-update-card';card.setAttribute('aria-labelledby','studio-update-title');
  card.innerHTML=`<h3 id="studio-update-title">${T('Cập nhật ứng dụng','App updates')}</h3>
  <label class="row"><input type="checkbox" id="su-notice" ${v.updateNotice!==false?'checked':''} ${owner?'':'disabled'}> ${T('Hiện thông báo cập nhật','Show the update notice')}</label>
  <small class="muted">${T('Tắt: bản mới vẫn tự cài khi không ai đang sửa gì, hoặc ở lần mở sau.','Off: new versions still install when nobody is editing, or at the next launch.')}</small>
  <p>${T('Bản đang phát hành','Current build')}: <code id="su-current">${esc(current||T('không đọc được','unavailable'))}</code></p>
  <label>${T('Bắt buộc cập nhật bản tối thiểu','Required minimum build')}<input id="su-min" readonly value="${esc(v.minBuild||'')}" placeholder="${T('(không bắt buộc)','(not required)')}"></label>
  <div class="row wrap"><button type="button" class="btn primary" id="su-require" ${owner&&current?'':'disabled'}>${T('Bắt buộc mọi máy lên bản hiện tại','Require the current build on every device')}</button><button type="button" class="btn" id="su-clear" ${owner&&v.minBuild?'':'disabled'}>${T('Bỏ yêu cầu','Remove requirement')}</button></div>
  <small class="muted">${owner?T('Máy chạy bản cũ hơn sẽ thấy màn hình "Cần cập nhật" sau khi lưu dữ liệu. Ghi vào nhật ký Studio.','Devices on an older build see an "Update required" screen after their data is saved. Written to the Studio audit log.'):T('Chỉ chủ Studio thay đổi được.','Owner only.')}</small>
  <p class="muted" id="su-status" role="status" aria-live="polite"></p>`;
  document.getElementById('sf')!.after(card);
  const status=(t:string)=>{const el=document.getElementById('su-status');if(el)el.textContent=t};
  const run=async(patch:any,ok:string)=>{try{status(T('Đang lưu…','Saving…'));const r=await save(patch);(document.getElementById('su-min') as HTMLInputElement).value=r.values?.minBuild||'';(document.getElementById('su-clear') as HTMLButtonElement).disabled=!r.values?.minBuild;status(ok)}catch(e:any){status(T('Chưa lưu được: ','Not saved: ')+e.message)}};
  (document.getElementById('su-notice') as HTMLInputElement).onchange=e=>run({updateNotice:(e.target as HTMLInputElement).checked},T('Đã lưu.','Saved.'));
  (document.getElementById('su-require') as HTMLButtonElement).onclick=()=>{if(!confirm(T(`Bắt buộc mọi máy lên bản ${current}? Máy cũ sẽ phải cập nhật trước khi dùng tiếp.`,`Require build ${current} on every device? Older devices must update before continuing.`)))return;run({minBuild:current},T('Đã bắt buộc bản hiện tại.','Current build is now required.'))};
  (document.getElementById('su-clear') as HTMLButtonElement).onclick=()=>run({minBuild:''},T('Đã bỏ yêu cầu.','Requirement removed.'));
 }catch{}finally{busy=false}
}
new MutationObserver(()=>{render()}).observe(main,{childList:true});
// v1.7.2: Studio loads this file when Settings opens and announces each drawn page (also after a background refresh).
document.addEventListener('studio:rendered',()=>{render()});
addEventListener('hashchange',()=>setTimeout(render,0));
})();
