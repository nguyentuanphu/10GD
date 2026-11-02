// Studio · Giá chưa gắn món / Unplaced prices (v1.7.2). Separate classic script, loaded by studio.js only when the
// page opens (So Giá group). Price facts the Price Check extension captured that were not attached to a catalogue
// item, with suggested items: attach to the suggestion [Gắn], pick another item [Món khác…], or skip [Bỏ qua];
// select several and confirm them together. Data: GET /.netlify/functions/scout?op=studio-unplaced →
// {items:[{factId,name,retailer,storeLabel,price,unitPrice,unitBasis,capturedAt,suggestions:[{itemId,name,confidence}]}]}.
// Changes: POST op=studio-unplaced-resolve {keys,itemId} (attach, grouped per item) or {keys,action:'reject'}
// (owner only, CSRF; the server writes the Studio audit log). Only facts are shown: name, store, price, time.
(function studioUnplaced(){
'use strict';
const registry=(window as any).studioPages;
if(!registry||!document.getElementById('main'))return;
const API='/.netlify/functions/scout',STUDIO='/.netlify/functions/studio';
const lang=()=>{try{return localStorage.getItem('studio-lang')||(String(navigator.language||'').toLowerCase().startsWith('vi')?'vi':'en')}catch{return 'vi'}};
const T=(vi:string,en:string)=>lang()==='en'?en:vi;
const esc=(v:any)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'} as any)[c]);
const $=(s:string,r:any=document)=>r.querySelector(s) as any;
const $$=(s:string,r:any=document)=>[...r.querySelectorAll(s)] as any[];
const when=(v:any)=>{if(!v)return '—';const d=new Date(v);return isNaN(+d)?'—':d.toLocaleString(lang()==='en'?'en-AU':'vi-VN',{timeZone:'Australia/Sydney',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})};
const money=(n:any)=>n==null||!isFinite(+n)?'—':'$'+Number(n).toFixed(2);
const LABEL:any={woolworths:'Woolworths',coles:'Coles',aldi:'ALDI',chemist:'Chemist Warehouse',amazon:'Amazon AU'};
const basis=(b:any)=>String(b||'').replace(/^per_/,'/').replace('_',' ');
let host:any=null,items:any[]=[],missing=false,error='',chosen:any={},catalog:any[]|null=null;
async function handle(r:Response){let d:any={};try{d=await r.json()}catch{}if(!r.ok){const e:any=new Error(lang()==='en'?d.errorEn||d.error||'Request failed':d.error||d.errorEn||'Lỗi');e.status=r.status;throw e}return d}
async function post(op:string,body:any){const m=await fetch(STUDIO+'?op=me',{credentials:'same-origin'}).then(handle);return fetch(`${API}?op=${op}`,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','x-studio-csrf':m.csrf},body:JSON.stringify(body)}).then(handle)}
function toast(msg:string,bad=false){const t=$('#toast');if(!t)return;t.textContent=msg;t.className='toast show'+(bad?' bad':'');clearTimeout((toast as any).t);(toast as any).t=setTimeout(()=>t.className='toast',4200)}
// The nav badge follows the list (Studio's own count arrives with its badges when the server sends one).
function badge(){const n=items.length;for(const b of $$('[data-badge="unplaced"]')){b.hidden=!n;b.innerHTML=n?`${n>99?'99+':n}<span class="sr-only"> ${esc(T('giá chưa gắn món','unplaced prices'))}</span>`:''}}
const pick=(x:any)=>chosen[x.factId]||x.suggestions?.[0]||null;
// Confidence: a 0–1 number, or the server matcher's level ('high' = one clear best item, 'low' = a tie) — v1.7.2
// integration fix: the level string used to render as “NaN%”.
const LEVEL:any={high:[0.9,'Khớp rõ','Clear match'],low:[0.5,'Chưa chắc','Unsure']};
function row(x:any){const s=pick(x),lv=typeof s?.confidence==='string'?LEVEL[s.confidence]:null,num=typeof s?.confidence==='number'?s.confidence:lv?lv[0]:null,conf=lv?T(lv[1],lv[2]):num!=null?Math.round(num*100)+'%':'';
 return `<li class="up-item" data-fact="${esc(x.factId)}"><label class="up-sel"><input type="checkbox" data-sel="${esc(x.factId)}" ${s?'':'disabled'}><span class="sr-only">${esc(T('Chọn ','Select ')+x.name)}</span></label>
  <div class="up-body"><h3>${esc(x.name)}</h3><p class="muted">${esc((LABEL[x.retailer]||x.retailer||'')+(x.storeLabel?' · '+x.storeLabel:''))} · ${esc(when(x.capturedAt))}</p>
  <p><strong>${esc(money(x.price))}</strong>${x.unitPrice!=null?` · ${esc(money(x.unitPrice))} ${esc(basis(x.unitBasis))}`:''}</p>
  <p class="up-sug">${s?`${T('Gợi ý','Suggested')}: <strong>${esc(s.name)}</strong>${conf?` <span class="chip ${num>=0.8?'green':num>=0.5?'amber':'red'}">${esc(conf)}</span>`:''}${chosen[x.factId]?` <small class="muted">(${T('bạn chọn','your choice')})</small>`:''}`:`<span class="muted">${T('Chưa có gợi ý — chọn “Món khác…”.','No suggestion — use “Other item…”.')}</span>`}${(x.suggestions||[]).length>1&&!chosen[x.factId]?` <small class="muted">${esc(T('khác: ','others: ')+x.suggestions.slice(1,3).map((y:any)=>y.name).join(', '))}</small>`:''}</p>
  <div class="up-actions"><button class="btn primary" type="button" data-attach="${esc(x.factId)}" ${s?'':'disabled'}>${T('Gắn','Attach')}</button><button class="btn" type="button" data-other="${esc(x.factId)}">${T('Món khác…','Other item…')}</button><button class="btn" type="button" data-skip="${esc(x.factId)}">${T('Bỏ qua','Skip')}</button></div></div></li>`}
function draw(){if(!host)return;const head=`<header class="page-head"><div><h1 tabindex="-1">${T('Giá chưa gắn món','Unplaced prices')}</h1><p class="muted">${T('Giá máy So Giá đã ghi nhưng chưa gắn vào món nào trong thư viện. Gắn đúng món thì giá mới được dùng; mọi thao tác được ghi vào nhật ký kiểm tra.','Prices the Price Check computers captured that are not attached to a catalogue item yet. Only attached prices are used; every action is written to the audit log.')}</p></div></header>`;
 if(missing){host.innerHTML=head+`<div class="card notice"><p>${T('Máy chủ chưa có danh sách này (cần bản cập nhật So Giá).','This server does not offer this list yet (needs the Price Check update).')}</p></div>`;return}
 if(error){host.innerHTML=head+`<div class="card notice"><p>${esc(error)}</p></div>`;return}
 host.innerHTML=head+(items.length?`<div class="up-bar card"><label class="up-all"><input type="checkbox" id="up-all"> <span>${T('Chọn tất cả có gợi ý','Select all with a suggestion')}</span></label><span id="up-count" class="muted" role="status"></span><button class="btn primary" type="button" id="up-confirm" disabled>${T('Gắn các mục đã chọn','Attach selected')}</button><button class="btn" type="button" id="up-skip" disabled>${T('Bỏ qua các mục đã chọn','Skip selected')}</button></div><ul class="up-list">${items.map(row).join('')}</ul>`:`<p class="empty">${T('Không còn giá nào chưa gắn món.','No unplaced prices.')}</p>`);
 badge();wire()}
function selected(){return $$('[data-sel]:checked',host).map((c:any)=>c.dataset.sel)}
function sync(){const n=selected().length,c=$('#up-count',host);if(c)c.textContent=n?T(`Đã chọn ${n}`,`${n} selected`):'';for(const id of ['#up-confirm','#up-skip']){const b=$(id,host);if(b)b.disabled=!n}}
// The server answers {results:[{key,ok,status|why}]} per fact: only facts it resolved (or that were already resolved
// elsewhere, why 'gone') leave the list; any other refusal keeps the row and is reported. A reply without results
// (older server) counts every key as done.
const settled=(keys:string[],r:any)=>Array.isArray(r?.results)?keys.filter(k=>{const x=r.results.find((y:any)=>y.key===k);return x&&(x.ok||x.why==='gone')}):keys;
const report=(okMsg:string,failed:number)=>toast(failed?okMsg+' '+T(`${failed} giá chưa xử lý được — thử lại.`,`${failed} could not be resolved — try again.`):okMsg,failed>0);
async function confirmFacts(ids:string[]){const list=ids.map(id=>{const x=items.find(i=>i.factId===id),s=x&&pick(x);return s?{factId:id,itemId:s.itemId}:null}).filter(Boolean);if(!list.length)return;
 try{const by:any={},done:string[]=[];for(const l of list as any[])(by[l.itemId]=by[l.itemId]||[]).push(l.factId);for(const [itemId,keys] of Object.entries(by))done.push(...settled(keys as string[],await post('studio-unplaced-resolve',{keys,itemId})));items=items.filter(i=>!done.includes(i.factId));for(const id of done)delete chosen[id];draw();report(T(`Đã gắn ${done.length} giá.`,`Attached ${done.length} price${done.length===1?'':'s'}.`),list.length-done.length)}catch(e:any){toast(e.message,true)}}
async function skipFacts(ids:string[]){if(!ids.length)return;try{const done=settled(ids,await post('studio-unplaced-resolve',{keys:ids,action:'reject'}));items=items.filter(i=>!done.includes(i.factId));draw();report(T(`Đã bỏ qua ${done.length} giá.`,`Skipped ${done.length} price${done.length===1?'':'s'}.`),ids.length-done.length)}catch(e:any){toast(e.message,true)}}
async function loadCatalog(){if(catalog)return catalog;if(!(window as any).MASTER_CATALOG)await new Promise((ok,no)=>{const s=document.createElement('script');s.src='master-catalog.js';s.onload=ok;s.onerror=no;document.head.appendChild(s)});const m=(window as any).MASTER_CATALOG;catalog=(Array.isArray(m)?m:m?.items||[]).map((x:any)=>({itemId:x.id,name:lang()==='en'?x.nameEn||x.nameVi:x.nameVi||x.nameEn}));return catalog}
async function other(id:string){const x=items.find(i=>i.factId===id);if(!x)return;let list:any[]=[];try{list=await loadCatalog()}catch{}
 const d=$('#ask');if(!d)return;d.innerHTML=`<form method="dialog" class="ask"><h2>${T('Gắn vào món khác','Attach to another item')}</h2><p>${esc(x.name)} · ${esc(money(x.price))}</p><label>${T('Món trong thư viện','Catalogue item')}<input name="item" list="up-items" required autocomplete="off" spellcheck="false"></label><datalist id="up-items">${list.map((c:any)=>`<option value="${esc(c.name)}"></option>`).join('')}</datalist><div class="row"><button class="btn" value="cancel">${T('Hủy','Cancel')}</button><button class="btn primary" value="ok">${T('Chọn','Choose')}</button></div></form>`;
 const f=$('form',d);f.addEventListener('submit',(ev:any)=>{if(ev.submitter?.value!=='ok')return;const v=String(f.item.value||'').trim().toLowerCase(),hit=list.find((c:any)=>c.name.toLowerCase()===v)||list.find((c:any)=>c.name.toLowerCase().includes(v));if(!hit){ev.preventDefault();toast(T('Không tìm thấy món đó trong thư viện.','That item is not in the catalogue.'),true);return}chosen[id]={itemId:hit.itemId,name:hit.name,confidence:null};draw()});d.showModal();$('input',d)?.focus()}
function wire(){for(const c of $$('[data-sel]',host))c.onchange=sync;const all=$('#up-all',host);if(all)all.onchange=()=>{for(const c of $$('[data-sel]:not(:disabled)',host))c.checked=all.checked;sync()};
 for(const b of $$('[data-attach]',host))b.onclick=()=>confirmFacts([b.dataset.attach]);for(const b of $$('[data-skip]',host))b.onclick=()=>skipFacts([b.dataset.skip]);for(const b of $$('[data-other]',host))b.onclick=()=>other(b.dataset.other);
 const c=$('#up-confirm',host);if(c)c.onclick=()=>{const ids=selected();if(ids.length>1&&!confirm(T(`Gắn ${ids.length} giá vào món đã gợi ý / đã chọn?`,`Attach ${ids.length} prices to the suggested / chosen items?`)))return;confirmFacts(ids)};
 const s=$('#up-skip',host);if(s)s.onclick=()=>{const ids=selected();if(ids.length>1&&!confirm(T(`Bỏ qua ${ids.length} giá?`,`Skip ${ids.length} prices?`)))return;skipFacts(ids)}}
async function load(){missing=false;error='';try{const d=await fetch(`${API}?op=studio-unplaced`,{credentials:'same-origin',headers:{Accept:'application/json'}}).then(handle);let cat:any[]=[];try{cat=await loadCatalog()}catch{}const nameOf=(id:string)=>cat.find((c:any)=>c.itemId===id)?.name||id;
  // Server shape (scout?op=studio-unplaced): {key,label,retailer,storeLabel,price,unitPrice,unitBasis,observedAt,suggested:[itemId],confidence}.
  items=(Array.isArray(d.items)?d.items:[]).map((x:any)=>x.factId?x:{factId:x.key,name:x.label,retailer:x.retailer,storeLabel:x.storeLabel,price:x.price,unitPrice:x.unitPrice,unitBasis:x.unitBasis,capturedAt:x.observedAt,productUrl:x.productUrl||null,suggestions:(x.suggested||[]).map((id:any,i:number)=>typeof id==='string'?{itemId:id,name:nameOf(id),confidence:i===0?x.confidence??null:null}:id)})}catch(e:any){items=[];if(e.status===404||e.status===405||e.status===400)missing=true;else error=e.message}draw()}
registry.unplaced={vi:'Giá chưa gắn món',en:'Unplaced prices',icon:'⧉',async render(el:any){host=document.createElement('div');host.id='unplaced-main';el.innerHTML='';el.appendChild(host);chosen={};await load()}};
})();
