// v1.7.16 (owner, 8 Nov 2026: “nguyên liệu chưa đối ứng không có lựa chọn search hoặc thêm mà chỉ có dropdown”): on each receipt
// line the long “Đối ứng” dropdown becomes a box to type in. It suggests matching ingredients (those to buy first), dishes on the
// menu and “Chi tiêu khác”, without needing accents, and offers “Thêm nguyên liệu mới” for a name the app does not know yet. A
// new name goes into the family's own ingredient list (state.ingredientCatalog, the same list recipe import uses), in the unit
// of the receipt line. The original <select class="receipt-match"> stays in the page, hidden, as the value the receipt reads.
(function(){
 const pT=(vi:string,en:string)=>typeof tr==='function'?tr(vi,en):vi;
 const norm=(s:any)=>typeof normalizeText==='function'?normalizeText(s):String(s||'').toLowerCase();
 const MAX=8;let seq=0;
 function labelOf(sel:HTMLSelectElement){const v=sel.value;if(!v)return '';const o=[...sel.options].find(x=>x.value===v);return o?o.textContent||'':v}
 function options(sel:HTMLSelectElement){return [...sel.options].filter(o=>o.value).map(o=>{const g=(o.parentElement as any)?.label||'';const id=o.value;const vi=(INGREDIENTS as any)[id]?.[0]||'';return {value:id,text:o.textContent||'',group:g,key:norm((o.textContent||'')+' '+vi),need:o.parentElement===sel.querySelector('optgroup')}})}
 function candidates(sel:HTMLSelectElement,q:string){const all=options(sel),n=norm(q);
  if(!n)return all.filter(o=>o.need||o.value==='other').slice(0,MAX);
  const words=n.split(' ').filter(Boolean),hit=all.filter(o=>words.every(w=>o.key.includes(w)));
  hit.sort((a,b)=>(+!norm(a.text).startsWith(n))-(+!norm(b.text).startsWith(n))||(+!a.need)-(+!b.need)||a.text.length-b.text.length);return hit.slice(0,MAX)}
 function lineUnit(line:Element){const u=(line.querySelector('.receipt-unit') as HTMLSelectElement|null)?.value||'';const units:string[]=typeof FAMILY_UNITS!=='undefined'?FAMILY_UNITS:['g','ml','quả'];
  return u==='kg'||u==='g'?'g':u==='l'||u==='ml'?'ml':units.includes(u)?u:'g'}
 function draw(pick:HTMLElement){const sel=pick.parentElement!.querySelector('select.receipt-match') as HTMLSelectElement,input=pick.querySelector('input') as HTMLInputElement,list=pick.querySelector('.rm-list') as HTMLElement;
  const q=input.value.trim(),c=candidates(sel,q),exact=c.some(o=>norm(o.text)===norm(q));
  list.innerHTML=c.map(o=>`<button type="button" class="rm-opt" role="option" data-rm-value="${esc(o.value)}"><span data-user-content>${esc(o.text)}</span>${o.group?`<small>${esc(o.group)}</small>`:''}</button>`).join('')+
   (q&&!exact?`<button type="button" class="rm-opt rm-new" role="option" data-rm-new="${esc(q.slice(0,100))}">${esc(pT(`Thêm nguyên liệu mới: “${q.slice(0,100)}”`,`Add a new ingredient: “${q.slice(0,100)}”`))}</button>`:'')+
   (!c.length&&!q?`<p class="rm-empty">${esc(pT('Gõ tên để tìm nguyên liệu.','Type a name to find an ingredient.'))}</p>`:'');
  list.hidden=false;input.setAttribute('aria-expanded','true')}
 function close(pick:HTMLElement){const sel=pick.parentElement!.querySelector('select.receipt-match') as HTMLSelectElement,input=pick.querySelector('input') as HTMLInputElement,list=pick.querySelector('.rm-list') as HTMLElement;list.hidden=true;input.setAttribute('aria-expanded','false');input.value=labelOf(sel)}
 function choose(pick:HTMLElement,value:string){const sel=pick.parentElement!.querySelector('select.receipt-match') as HTMLSelectElement;sel.value=value;close(pick);sel.dispatchEvent(new Event('change',{bubbles:true}))}
 function addNew(pick:HTMLElement,name:string){const s:any=state;const sel=pick.parentElement!.querySelector('select.receipt-match') as HTMLSelectElement,line=pick.closest('.receipt-line')!;
  s.ingredientCatalog=s.ingredientCatalog&&typeof s.ingredientCatalog==='object'?s.ingredientCatalog:{};
  const known=Object.entries(s.ingredientCatalog).find(([,x]:any)=>norm(x.name)===norm(name));let id=known?.[0];
  if(!id){if(Object.keys(s.ingredientCatalog).length>=500){toast(pT('Danh sách nguyên liệu riêng đã đầy (500).','Your own ingredient list is full (500).'),true);return}
   id='family-ing-'+uid();const unit=lineUnit(line);s.ingredientCatalog[id]={name:name.slice(0,100),unit,group:'dry'};(INGREDIENTS as any)[id]=[name.slice(0,100),unit,'dry',0,'🌿',null]}
  if(![...sel.options].some(o=>o.value===id)){const g=sel.querySelectorAll('optgroup')[1]||sel;g.insertAdjacentHTML('beforeend',`<option value="${esc(id)}">${esc(name.slice(0,100))}</option>`)}
  choose(pick,id!);toast(pT(`Đã thêm “${name.slice(0,100)}” vào nguyên liệu của nhà.`,`“${name.slice(0,100)}” added to your ingredients.`))}
 function enhance(root:ParentNode){for(const sel of root.querySelectorAll('select.receipt-match:not([data-rm])') as NodeListOf<HTMLSelectElement>){sel.dataset.rm='1';sel.hidden=true;sel.tabIndex=-1;
  const id='rm-list-'+(++seq),aria=sel.getAttribute('aria-label')||pT('Đối ứng','Match');
  sel.insertAdjacentHTML('beforebegin',`<div class="rm-pick"><input type="search" class="input rm-search" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="${id}" autocomplete="off" enterkeyhint="done" maxlength="100" aria-label="${esc(aria)}" placeholder="${esc(pT('Chưa đối ứng · gõ để tìm hoặc thêm','Not matched · type to find or add'))}" value="${esc(labelOf(sel))}"><div class="rm-list" id="${id}" role="listbox" hidden></div></div>`)}}
 const pickOf=(el:any)=>el?.closest?.('.rm-pick') as HTMLElement|null;
 document.addEventListener('focusin',e=>{const t=e.target as HTMLInputElement;if(t?.classList?.contains('rm-search')){t.select?.();draw(pickOf(t)!)}});
 document.addEventListener('input',e=>{const t=e.target as HTMLElement;if(t?.classList?.contains('rm-search'))draw(pickOf(t)!)});
 document.addEventListener('keydown',e=>{const t=e.target as HTMLElement;if(!t?.classList?.contains('rm-search'))return;const pick=pickOf(t)!;
  if(e.key==='Escape'){e.preventDefault();close(pick);return}
  if(e.key==='Enter'){e.preventDefault();const first=pick.querySelector('.rm-opt') as HTMLElement|null;if(first)first.click();return}
  if(e.key==='ArrowDown'){e.preventDefault();(pick.querySelector('.rm-opt') as HTMLElement|null)?.focus()}});
 document.addEventListener('mousedown',e=>{if((e.target as any)?.closest?.('.rm-list'))e.preventDefault()});
 document.addEventListener('click',e=>{const b=(e.target as any)?.closest?.('.rm-opt') as HTMLElement|null;if(!b)return;e.preventDefault();const pick=pickOf(b)!;
  if(b.dataset.rmNew!==undefined)addNew(pick,b.dataset.rmNew);else choose(pick,b.dataset.rmValue||'')});
 document.addEventListener('focusout',e=>{const pick=pickOf(e.target);if(!pick)return;setTimeout(()=>{if(!pick.contains(document.activeElement)&&pick.isConnected)close(pick)},0)});
 // matches set by suggestions or by voice show in the box too
 document.addEventListener('change',e=>{const sel=e.target as HTMLSelectElement;if(sel?.classList?.contains('receipt-match')){const pick=sel.parentElement?.querySelector('.rm-pick') as HTMLElement|null;const input=pick?.querySelector('input') as HTMLInputElement|null;if(input&&document.activeElement!==input)input.value=labelOf(sel)}});
 const root=document.getElementById('modal-root');if(root){enhance(root);new MutationObserver(()=>enhance(root)).observe(root,{childList:true,subtree:true})}
 (globalThis as any).receiptMatchPicker={candidates,enhance};
})();
