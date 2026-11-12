'use strict';
// v1.7.2 "Ghép giá với giỏ đi chợ" in the receipt form (local / Asian grocer, butcher, greengrocer receipts that
// print only "GROCERY 4.50", "VEG 3.20", "MEAT 12.80", "DEPT 01" or a price). Builds on the shared receipt
// modules (receipt-parse.ts marks generic lines, receipt-ui.ts drafts them unmatched) and ReceiptMatch
// (receipt-match.ts: suggestions, learning, voice command parsing).
//  • Tap a price, then the item(s) in this week's shopping list (items ticked "đã mua" first, in tick order).
//    One price may cover several items; splitting the money between them is the family's choice, never guessed.
//  • Suggestions are only shown for confirmation, each with a one-line reason; nothing is matched automatically.
//  • Voice / typed: "dòng 3 là thịt ba chỉ" / "line 3 is pork belly" (existing voice pipeline, hold to talk).
//  • Undo for every change. Works offline (typing; voice needs the browser recogniser or the on-device pack).
//  • Saving: unmatched generic lines are kept in spending as "Đồ khác (chưa rõ)" and never touch the shopping
//    list / pantry reconciliation. Confirmed single matches teach the store mapping (family data, synced), which
//    the family can forget.
//  • "Báo giá cho cộng đồng" on a saved unmatched line: the family names/picks the item; never sent without
//    that tap. So Giá shows it as "Chưa xác minh · 1 người báo" until another family reports the same price.
(function(){
const RM=(globalThis as any).ReceiptMatch;
if(!RM||typeof document==='undefined'||typeof receiptEditor!=='function')return;
const T=(vi,en)=>typeof tr==='function'?tr(vi,en):vi;
const lang=()=>typeof appLanguage!=='undefined'&&appLanguage==='en'?'en':'vi';
const L=r=>r?(lang()==='en'?r.en:r.vi):'';
const money=n=>'$'+Math.abs(+n||0).toFixed(2);
const hasIng=id=>!!id&&typeof INGREDIENTS!=='undefined'&&Object.hasOwn(INGREDIENTS,id);
const ingName=id=>hasIng(id)?(lang()==='en'&&typeof INGREDIENT_EN!=='undefined'&&INGREDIENT_EN[id]||INGREDIENTS[id][0]):id;
state.receiptLearning=RM.cleanModel(state.receiptLearning);
let rm={sel:null,undo:[],sayState:'',take:null};

// ------------------------------------------------------------ model helpers
const isGeneric=it=>!!it?.extra?.generic;
const unmatched=it=>!it.match||it.extra?.unknown&&it.match==='other'&&!it.extra?.covers&&!it.extra?.basket;
function targetsOf(it){const e=it.extra||{};if(e.covers)return e.covers.map(c=>c.key);if(e.basket&&it.match==='other')return[e.basket.key];if(hasIng(it.match))return['i:'+it.match];return[]}
function rmRange(){return typeof shopDates==='function'?shopDates():[weekStart,addDays(weekStart,6)]}
// This week's shopping list: ingredient rows + extras; ticked "đã mua" first, in the order they were ticked.
function basket(){
 const[start,end]=rmRange(),w=currentWeek(),out=[];
 let rows=[];try{rows=shopping(state,w,start,end).filter(r=>(typeof shoppingHasAmount!=='function'||shoppingHasAmount(r))&&!r.skip)}catch{}
 for(const r of rows){if(!hasIng(r.id))continue;const at=w.boughtAt?.[r.id]||null;out.push({key:'i:'+r.id,kind:'ingredient',id:r.id,name:ingName(r.id),group:INGREDIENTS[r.id][2]||null,boughtAt:at})}
 // v1.7.14 (owner, 8 Nov 2026: “suggest chung chung của cả kho thay vì mấy món để mua”): after shopping and putting away, the list
 // has nothing left to buy, so the items ticked as bought this week (and in the receipt's week) are the ones a receipt line is about
 {const weeks=[w];const rd=receiptDraft?.date;if(rd&&/^\d{4}-\d{2}-\d{2}$/.test(rd)){const rw=state.weeks?.[menuWeekKey(state,rd)];if(rw&&rw!==state.weeks?.[menuWeekKey(state,weekStart)])weeks.push(rw)}
  for(const wk of weeks)for(const[id,at]of Object.entries(wk.boughtAt||{}))if(hasIng(id)&&at)out.push({key:'i:'+id,kind:'ingredient',id,name:ingName(id),group:INGREDIENTS[id][2]||null,boughtAt:at})}
 for(const e of w.extras||[]){if(!e?.name)continue;out.push({key:'x:'+RM.norm(e.name),kind:'extra',id:e.id,name:String(e.name).slice(0,60),group:'other',boughtAt:e.done?e.boughtAt||null:null})}
 const seen=new Set();const list=out.filter(b=>!seen.has(b.key)&&seen.add(b.key));
 return list.sort((a,b)=>(a.boughtAt?0:1)-(b.boughtAt?0:1)||String(a.boughtAt||'').localeCompare(String(b.boughtAt||''))||a.name.localeCompare(b.name));
}
function targetInfo(key,bk){const b=bk.find(x=>x.key===key);if(b)return b;if(key.startsWith('i:')&&hasIng(key.slice(2))){const id=key.slice(2);return{key,kind:'ingredient',id,name:ingName(id),group:INGREDIENTS[id][2]}}return null}
// Community prices for suggestions: So Giá items mapped to app ingredients through the catalogue.
function communityRows(){
 const items=(typeof scoutData!=='undefined'&&scoutData?.community?.items)||[],cat=globalThis.MASTER_CATALOG?.items||[],store=receiptDraft?.store||'';
 return items.map(x=>{const c=cat.find(i=>i.id===x.itemId);return c?.ingredientId?{targetKey:'i:'+c.ingredientId,price:x.price,status:x.status,area:RM.sameArea(store,x.branchLabel||'')}:null}).filter(Boolean);
}
function suggestionsFor(d,bk){
 const open=d.items.map((it,index)=>({it,index})).filter(({it})=>isGeneric(it)&&unmatched(it));
 const all=d.items.map((it,index)=>({it,index})).filter(({it})=>isGeneric(it)).map(x=>x.index);
 const lines=open.map(({it,index})=>({index,order:all.indexOf(index),orderN:all.length,price:+it.total,label:it.label,genericKey:it.extra.genericKey,plu:it.extra.plu||null,weightKg:it.extra.weightKg||null,perKg:it.extra.perKg||null}));
 const used=new Set(d.items.filter(i=>!unmatched(i)).flatMap(targetsOf));
 const known=Math.round(d.items.filter(i=>!(isGeneric(i)&&unmatched(i))).reduce((n,i)=>n+(+i.total||0),0)*100)/100;
 const printed=d.meta?.printedTotal??(Number.isFinite(d.total)&&d.total>0?d.total:null);
 return RM.suggest({lines,basket:bk,exclude:[...used],history:RM.familyHistory(state.receipts,{store:d.store,excludeId:d.id}),community:communityRows(),learned:RM.learnedAt(state.receiptLearning,d.store),printedTotal:printed,knownTotal:known});
}

// ------------------------------------------------------------ apply a match (with undo)
function snapshot(){collectReceipt();const d=receiptDraft;rm.undo.push(JSON.parse(JSON.stringify(d.items)));if(rm.undo.length>30)rm.undo.shift()}
function setSelect(index,value){const el=document.querySelector(`.receipt-line[data-index="${index}"] .receipt-match`);if(el){el.value=value;if(el.value!==value&&value)el.insertAdjacentHTML('beforeend',`<option value="${esc(value)}" selected>${esc(value)}</option>`);el.dispatchEvent(new Event('change',{bubbles:true}))}}
function applyTargets(index,keys,{record=true}={}){
 const d=receiptDraft,it=d?.items[index];if(!it)return false;if(record)snapshot();
 const bk=basket(),info=[...new Set(keys)].map(k=>targetInfo(k,bk)).filter(Boolean);it.extra=it.extra||{};
 delete it.extra.covers;delete it.extra.basket;
 if(!info.length){it.match='';it.extra.unknown=undefined}
 else if(info.length===1){const t=info[0];if(t.kind==='ingredient'){it.match=t.id;if(it.extra.weightKg&&!it.qty){it.qty=it.extra.weightKg;it.unit='kg'}}else{it.match='other';it.extra.basket={key:t.key,id:t.id,name:t.name}}delete it.extra.unknown}
 else{it.match='other';it.extra.covers=info.map(t=>({key:t.key,kind:t.kind,id:t.id,name:t.name}));delete it.extra.unknown}
 it.confidence='';setSelect(index,it.match);
 const qty=document.querySelector(`.receipt-line[data-index="${index}"] .receipt-qty`),unit=document.querySelector(`.receipt-line[data-index="${index}"] .receipt-unit`);if(qty&&it.qty!=null&&qty.value==='')qty.value=it.qty;if(unit&&it.unit&&!unit.value)unit.value=it.unit;
 return true;
}
function undo(){const prev=rm.undo.pop();if(!prev||!receiptDraft)return;collectReceipt();receiptDraft.items=prev;rm.sel=null;receiptEditor();say(T('Đã hoàn tác.','Undone.'))}

// ------------------------------------------------------------ panel
function tickTime(iso){if(!iso)return'';try{return new Date(iso).toLocaleTimeString(lang()==='en'?'en-AU':'vi-VN',{hour:'2-digit',minute:'2-digit'})}catch{return''}}
function targetNames(keys,bk){return keys.map(k=>targetInfo(k,bk)?.name||k.slice(2)).join(' + ')}
function savedRecord(d){return d.editing?state.receipts.find(r=>r.id===d.id)||null:null}
function canReport(d,it){const rec=savedRecord(d);if(!rec||rec.refund||(rec.currency||'AUD')!=='AUD'||!isGeneric(it))return false;const line=(rec.items||[]).find(x=>x.id===it.id);return!!line&&+line.total>0&&typeof scoutCommunityOn==='function'&&scoutCommunityOn()&&!(typeof scoutViewer==='function'&&scoutViewer())}
function panelHtml(){
 const d=receiptDraft;if(!d)return'';const lines=d.items.map((it,index)=>({it,index})).filter(({it})=>isGeneric(it));if(!lines.length)return'';
 const bk=basket(),sug=suggestionsFor(d,bk),byIndex=new Map(sug.lines.map(l=>[l.index,l]));
 const open=lines.filter(({it})=>unmatched(it)).length;
 if(rm.sel!=null&&!d.items[rm.sel])rm.sel=null;
 const sel=rm.sel!=null?d.items[rm.sel]:null,selKeys=sel?targetsOf(sel):[];
 const priceRows=lines.map(({it,index})=>{const keys=targetsOf(it),s=byIndex.get(index),on=rm.sel===index;
  const label=it.label&&!/^\d+[.,]\d{2}$/.test(it.label)?esc(it.label):T('Chỉ có giá','Price only');
  const state=keys.length?`→ ${esc(targetNames(keys,bk))}`:T('Chưa rõ món','Unknown item');
  const sugs=!keys.length&&s?.suggestions?.length?`<div class="rm-sugs" role="group" aria-label="${esc(T('Gợi ý cần xác nhận','Suggestions to confirm'))}">${s.suggestions.map(c=>`<button type="button" class="rm-sug${c.joint?' joint':''}" data-rm="accept" data-i="${index}" data-keys="${esc(c.targets.join(','))}"><span>✓ ${esc(targetNames(c.targets,bk))}</span><small>${esc(L(c.reasons[0])||T('Gợi ý','Suggestion'))}${c.reasons.length>1?' · '+esc(L(c.reasons[1])):''}</small></button>`).join('')}</div>`:'';
  const tools=[keys.length?`<button type="button" class="btn small" data-rm="clear" data-i="${index}">${T('Bỏ ghép','Unmatch')}</button>`:'',keys.length>1?`<button type="button" class="btn small" data-rm="split" data-i="${index}">${T('Chia tiền theo món','Split the money')}</button>`:'',canReport(d,it)?`<button type="button" class="btn small soft" data-rm="report" data-i="${index}">👥 ${T('Báo giá cho cộng đồng','Report price to the community')}</button>`:''].filter(Boolean).join('');
  return`<li class="rm-line${on?' selected':''}${keys.length?' rm-done':''}"><button type="button" class="rm-price" data-rm="line" data-i="${index}" aria-pressed="${on}"><span class="rm-no">${T('Dòng','Line')} ${index+1}</span><b class="rm-amount">${money(it.total)}</b><span class="rm-label">${label}${it.extra.weightKg?` · ${it.extra.weightKg} kg × ${money(it.extra.perKg)}/kg`:''}</span><span class="rm-state">${state}</span></button>${sugs}${tools?`<div class="rm-tools">${tools}</div>`:''}${rm.split===index?splitHtml(it,index,bk):''}</li>`}).join('');
 const items=bk.length?bk.map(b=>{const on=selKeys.includes(b.key);return`<li><button type="button" class="rm-item${on?' on':''}${b.boughtAt?' bought':''}" data-rm="item" data-key="${esc(b.key)}" aria-pressed="${on}" ${rm.sel==null?'aria-disabled="true"':''}><span class="rm-item-name">${on?'☑':'☐'} ${esc(b.name)}</span><small>${b.boughtAt?'✓ '+T('đã mua','bought')+' '+esc(tickTime(b.boughtAt)):T('chưa đánh dấu','not ticked')}</small></button></li>`}).join(''):`<li class="hint">${T('Danh sách đi chợ tuần này đang trống. Bạn vẫn có thể nói “dòng 3 là thịt ba chỉ” hoặc chọn ở ô đối ứng của từng dòng.','This week’s shopping list is empty. You can still say “line 3 is pork belly” or pick in each line’s match box.')}</li>`;
 const learned=RM.learnedAt(state.receiptLearning,d.store);
 const mic=typeof createVoiceTake==='function'&&typeof vpMicHtml==='function'?vpMicHtml('rm-mic','rm',T('Nói','Speak')):'';
 return`<section id="rm-panel" class="rm-panel" aria-labelledby="rm-title"><div class="rm-head"><h3 id="rm-title">🧺 ${T('Ghép giá với giỏ đi chợ','Match prices to the shopping basket')}</h3><span class="pill rm-count">${open?T(`${open} dòng chưa rõ món`,`${open} unknown ${open===1?'line':'lines'}`):T('Đã ghép hết','All matched')}</span></div>
 <p class="hint">${T('Hoá đơn này chỉ in giá hoặc nhóm hàng (GROCERY, VEG, MEAT…). Chạm một giá, rồi chạm món trong giỏ — chạm nhiều món nếu một giá gồm nhiều món. Không có gì được ghép tự động; dòng chưa ghép được lưu là “Đồ khác (chưa rõ)”.','This receipt prints only prices or departments (GROCERY, VEG, MEAT…). Tap a price, then the item in the basket — tap several items if one price covers several. Nothing is matched automatically; unmatched lines are saved as “Other (unknown)”.')}</p>
 ${sug.totalNote?`<p class="receipt-warning rm-total-note">${esc(L(sug.totalNote))}</p>`:''}
 <div class="rm-cols"><div class="rm-col"><h4>${T('Giá trên hoá đơn','Prices on the receipt')}</h4><ul class="rm-prices">${priceRows}</ul></div>
 <div class="rm-col"><h4>${T('Giỏ đi chợ tuần này','This week’s basket')}</h4><p class="hint rm-pick-hint" aria-live="polite">${sel?T(`Đang ghép dòng ${rm.sel+1} (${money(sel.total)}) — chạm món`,`Matching line ${rm.sel+1} (${money(sel.total)}) — tap items`):T('Chạm một giá trước','Tap a price first')}</p><ul class="rm-basket">${items}</ul></div></div>
 <div class="rm-voice"><label for="rm-say">${T('Nói hoặc gõ','Say or type')}: <span class="rm-example">${T('“dòng 3 là thịt ba chỉ”','“line 3 is pork belly”')}</span></label><div class="rm-voice-row"><input id="rm-say" class="input" autocomplete="off" maxlength="300" placeholder="${esc(T('dòng 4 là rau muống và hành lá','line 4 is water spinach and spring onion'))}"><button type="button" class="btn" data-rm="say">${T('Ghép','Match')}</button>${mic}</div><p id="rm-say-state" class="hint" role="status" aria-live="polite">${esc(rm.sayState)}</p></div>
 <div class="rm-foot"><button type="button" class="btn small" data-rm="undo" ${rm.undo.length?'':'disabled'}>↶ ${T('Hoàn tác','Undo')}</button>${learned.length?`<details class="rm-learned"><summary>${T(`Đã học ở cửa hàng này (${learned.length})`,`Learned at this store (${learned.length})`)}</summary><ul>${learned.map(e=>`<li><span>${esc(e.key.replace(/^l:/,'').replace(/^p:/,'PLU ').replace(/^d:/,'DEPT ').replace(/^price$/,T('chỉ giá','price only')).replace(/^w$/,T('hàng cân','weighed')).toUpperCase())} ${e.lo===e.hi?money(e.lo):money(e.lo)+'–'+money(e.hi)} → ${esc(e.target.kind==='ingredient'?ingName(e.target.id):e.target.name)} <small>×${e.n}</small></span><button type="button" class="btn small" data-rm="forget" data-id="${esc(e.id)}">${T('Quên','Forget')}</button></li>`).join('')}</ul></details>`:''}</div></section>`;
}
function splitHtml(it,index,bk){const keys=targetsOf(it);return`<div class="rm-split" role="group" aria-label="${esc(T('Chia tiền','Split'))}"><p class="hint">${T(`Nhập số tiền cho từng món; tổng phải bằng ${money(it.total)}. App không tự chia.`,`Enter the amount for each item; they must add up to ${money(it.total)}. The app does not split for you.`)}</p>${keys.map((k,j)=>`<label class="rm-split-row"><span>${esc(targetInfo(k,bk)?.name||k)}</span><input class="input" type="number" inputmode="decimal" step="0.01" min="0" data-rm-split="${j}" aria-label="${esc(targetInfo(k,bk)?.name||k)}"></label>`).join('')}<div class="rm-tools"><button type="button" class="btn small" data-rm="split-cancel" data-i="${index}">${T('Huỷ','Cancel')}</button><button type="button" class="btn small primary" data-rm="split-apply" data-i="${index}">${T('Chia','Split')}</button></div></div>`}
function renderPanel(){const el=document.getElementById('rm-panel');const html=panelHtml();if(el){if(!html){el.remove();return}const focus=document.activeElement?.dataset?.rm?{rm:document.activeElement.dataset.rm,i:document.activeElement.dataset.i,key:document.activeElement.dataset.key}:null;el.outerHTML=html;if(focus){const sel=`#rm-panel [data-rm="${focus.rm}"]${focus.i!=null?`[data-i="${focus.i}"]`:''}${focus.key?`[data-key="${CSS.escape(focus.key)}"]`:''}`;(document.querySelector(sel) as any)?.focus?.()}}else if(html){const at=document.getElementById('receipt-lines');at?.insertAdjacentHTML('beforebegin',html)}updateMic()}
function say(text){rm.sayState=text;const el=document.getElementById('rm-say-state');if(el)el.textContent=text}

const oldEditor=receiptEditor;
receiptEditor=function(){const d=receiptDraft;if(d&&d._rmId!==d.id){rm={sel:null,undo:[],sayState:'',take:rm.take};d._rmId=d.id}oldEditor();renderPanel()};

// ------------------------------------------------------------ voice / typed command
function voiceCandidates(){const bk=basket(),out=bk.map(b=>({key:b.key,names:[b.name,...(b.kind==='ingredient'?[INGREDIENTS[b.id][0],typeof INGREDIENT_EN!=='undefined'?INGREDIENT_EN[b.id]:'',...(typeof INGREDIENT_ALIASES!=='undefined'?INGREDIENT_ALIASES[b.id]||[]:[])]:[])].filter(Boolean)}));return out}
function resolveAny(name){const k=RM.resolveName(name,voiceCandidates());if(k)return k;if(typeof inferIngredient==='function'){const m=inferIngredient(name,state);if(m&&hasIng(m.match))return'i:'+m.match}return null}
function runCommand(text){
 const d=receiptDraft;if(!d)return 0;const cmds=RM.parseCommand(text);if(!cmds.length){say(T(`Chưa hiểu “${text}”. Thử: “dòng 3 là thịt ba chỉ”.`,`Did not understand “${text}”. Try: “line 3 is pork belly”.`));return 0}
 const done=[],missed=[];let first=true;
 for(const c of cmds){const index=c.line-1;if(!d.items[index]){missed.push(T(`không có dòng ${c.line}`,`there is no line ${c.line}`));continue}
  const keys=c.names.map(resolveAny);if(keys.some(k=>!k)){missed.push(c.names.filter((n,i)=>!keys[i]).map(n=>`“${n}”`).join(', '));continue}
  applyTargets(index,keys,{record:first});first=false;done.push(`${T('Dòng','Line')} ${c.line} → ${targetNames(keys,basket())}`)}
 rm.sel=null;say([done.join(' · '),missed.length?T('Chưa ghép: ','Not matched: ')+missed.join('; '):''].filter(Boolean).join(' — '));renderPanel();updateReceiptTotals?.();return done.length;
}
function rmLang(){return typeof vpDefaultLang==='function'?vpDefaultLang():(lang()==='en'?'en-AU':'vi-VN')}
function ensureTake(){if(rm.take||typeof createVoiceTake!=='function')return rm.take;rm.take=createVoiceTake({owner:'receipt-match',keep:false,lang:rmLang,onState:mode=>{rm.mode=mode;updateMic();if(mode==='offline')say(T('Đang offline: gõ lệnh vào ô, hoặc tải bộ giọng nói trên máy trong Cài đặt giọng nói.','Offline: type the command, or download the on-device voice pack in Voice settings.'));else if(mode==='unsupported')say(T('Trình duyệt chưa hỗ trợ giọng nói — gõ lệnh vào ô.','Voice is not supported in this browser — type the command.'));else if(mode==='blocked')say(T('Micrô bị chặn — gõ lệnh vào ô.','The microphone is blocked — type the command.'))},
 onInterim:t=>{const box=document.getElementById('rm-say');if(box&&t)box.value=t},onFinal:t=>{const box=document.getElementById('rm-say');if(!t)return;if(box)box.value=t;runCommand(t)}});return rm.take}
function updateMic(){const b=document.getElementById('rm-mic');if(!b)return;const on=rm.mode==='listening';b.classList.toggle('listening',on);b.setAttribute('aria-pressed',String(on))}
if(globalThis.VOICE_HOLD_HANDLERS)globalThis.VOICE_HOLD_HANDLERS.rm={down:()=>{ensureTake()?.start()},up:()=>{rm.take?.stop()},cancel:()=>{rm.take?.stop(true)}};

// ------------------------------------------------------------ split (the family's choice)
function applySplit(index){
 const d=receiptDraft,it=d?.items[index];if(!it)return;const keys=targetsOf(it),bk=basket();
 const vals=[...document.querySelectorAll('#rm-panel [data-rm-split]')].map(x=>(x as any).value===''?NaN:Math.round(+(x as any).value*100)/100);
 if(vals.length!==keys.length||vals.some(v=>!Number.isFinite(v)||v<0)){toast(T('Nhập số tiền cho từng món.','Enter an amount for each item.'),true);return}
 const sum=Math.round(vals.reduce((n,v)=>n+v,0)*100)/100;if(Math.abs(sum-(+it.total))>0.009){toast(T(`Các phần cộng lại ${money(sum)}, dòng là ${money(it.total)}.`,`The parts add up to ${money(sum)}; the line is ${money(it.total)}.`),true);return}
 snapshot();const parts=keys.map((k,j)=>{const t=targetInfo(k,bk);const n={...JSON.parse(JSON.stringify(it)),id:uid(),total:vals[j],label:`${it.label} · ${t?.name||k}`.slice(0,200)};n.extra={...n.extra,splitFrom:it.id};delete n.extra.covers;delete n.extra.basket;delete n.extra.unknown;delete n.extra.weightKg;delete n.extra.perKg;n.qty=null;n.unit='';if(t?.kind==='ingredient')n.match=t.id;else{n.match='other';n.extra.basket={key:t.key,id:t.id,name:t.name}}return n});
 d.items.splice(index,1,...parts);rm.split=null;rm.sel=null;receiptEditor();say(T(`Đã chia dòng ${index+1} thành ${parts.length} phần.`,`Line ${index+1} split into ${parts.length} parts.`));
}

// ------------------------------------------------------------ save: "Đồ khác (chưa rõ)" + learning
const prevSave=saveReceipt;
saveReceipt=async function(confirmed=false){
 const d=receiptDraft;if(!d||ocrBusy)return prevSave(confirmed);collectReceipt();
 let unknown=0;const teach=[];
 d.items.forEach((it,index)=>{if(!isGeneric(it))return;it.extra=it.extra||{};
  if(hasIng(it.match)){delete it.extra.covers;delete it.extra.basket;delete it.extra.unknown}
  if(!it.match||it.extra.unknown&&it.match==='other'&&!it.extra.covers&&!it.extra.basket){it.match='other';it.extra.unknown=true;setSelect(index,'other');unknown++;return}
  const keys=targetsOf(it);if(keys.length===1){const t=targetInfo(keys[0],basket())||(it.extra.basket?{...it.extra.basket,kind:'extra'}:null);if(t)teach.push({line:{price:+it.total,label:it.label,genericKey:it.extra.genericKey,plu:it.extra.plu},target:{key:t.key,kind:t.kind,id:t.id,name:t.name}})}});
 const id=d.id,store=d.store;
 await prevSave(confirmed);
 const rec=receiptDraft===null&&state.receipts.find(r=>r.id===id);if(!rec)return;
 if(teach.length){const at=new Date().toISOString();for(const x of teach)RM.learn(state.receiptLearning,{store:rec.store||store,line:x.line,target:x.target,at});save()}
 if(unknown)setTimeout(()=>toast(T(`${unknown} dòng chưa rõ món được lưu là “Đồ khác (chưa rõ)” — mở hoá đơn để ghép sau hoặc báo giá cho cộng đồng.`,`${unknown} unknown ${unknown===1?'line was':'lines were'} saved as “Other (unknown)” — open the receipt to match later or report the price to the community.`)),50);
};

// ------------------------------------------------------------ spending: "Đồ khác (chưa rõ)"
function unknownSpend(start){const end=addDays(start,6);let sum=0,n=0;for(const r of state.receipts||[]){if(r.date<start||r.date>end||(r.currency||'AUD')!==currentCurrency(state))continue;for(const i of r.items||[])if(i.unknown&&i.kind==='other'){sum+=+i.total||0;n++}}return{sum:Math.round(sum*100)/100,n}}
if(typeof renderExpenses==='function'){const oldRender=renderExpenses;renderExpenses=function(){let html=oldRender();const u=unknownSpend(weekStart);if(!u.n)return html;
 const card=`<div class="card rm-unknown-card"><small>${esc(T('ĐỒ KHÁC (CHƯA RÕ)','OTHER (UNKNOWN)'))}</small><strong>${aud(u.sum)}</strong><small>${esc(T(`${u.n} dòng hoá đơn chưa rõ món · không vào đi chợ / kho`,`${u.n} receipt ${u.n===1?'line':'lines'} without a known item · not in shopping / pantry`))}</small></div>`;
 return html.replace(/(<div class="stat-grid">)([\s\S]*?)(<\/div><\/div><div class="shopping-layout">)/,(m,a,b,c)=>a+b+'</div>'+card+c.slice(6))}}

// ------------------------------------------------------------ community report for an unmatched line
function catalogSearch(q){const items=globalThis.MASTER_CATALOG?.items||[];const n=RM.norm(q);if(!n)return[];const words=n.split(' ');
 return items.map(i=>{const names=[i.nameVi,i.nameEn,...(i.aliases||[])].map(RM.norm).filter(Boolean);let s=0;for(const x of names){if(x===n)s=Math.max(s,100);else if(x.startsWith(n))s=Math.max(s,60);else if(words.every(w=>(' '+x+' ').includes(' '+w)))s=Math.max(s,40)}return{i,s}}).filter(x=>x.s>0).sort((a,b)=>b.s-a.s||String(a.i.nameVi).localeCompare(String(b.i.nameVi))).slice(0,8).map(x=>x.i)}
let report=null;
function reportSheet(index){
 const d=receiptDraft,it=d?.items[index];if(!it||!canReport(d,it))return;collectReceipt();const rec=savedRecord(d),line=rec.items.find(x=>x.id===it.id);
 const keys=targetsOf(it),bk=basket(),guess=keys.length===1?targetInfo(keys[0],bk):null;
 const cat=guess?.kind==='ingredient'?(globalThis.MASTER_CATALOG?.items||[]).find(i=>i.ingredientId===guess.id):null;
 report={receiptId:rec.id,lineId:line.id,price:Math.abs(+line.total),label:line.label,store:rec.store,capturedAt:rec.createdAt||new Date(rec.date+'T12:00:00+10:00').toISOString(),itemId:cat?.id||null};
 const b=(typeof scoutData!=='undefined'&&scoutData.communityBranch)||{},when=new Date(report.capturedAt).toLocaleString(lang()==='en'?'en-AU':'vi-VN',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
 const q=cat?(lang()==='en'?cat.nameEn:cat.nameVi):'';
 modal(T('Báo giá cho cộng đồng','Report a price to the community'),`<form id="rm-report-form" class="scout-form rm-report"><p><b>${money(report.price)}</b> · ${esc(report.label)} · ${esc(report.store)}</p><p class="hint">${esc(T('Chụp lúc ','Captured ')+when)}</p>
 <div class="field"><label for="rm-report-q">${T('Đây là món gì? (tìm trong danh mục)','What item is this? (search the catalogue)')}</label><input class="input" id="rm-report-q" autocomplete="off" maxlength="60" value="${esc(q)}" placeholder="${esc(T('ví dụ: rau muống','e.g. water spinach'))}"></div>
 <div id="rm-report-results" class="rm-report-results" role="radiogroup" aria-label="${esc(T('Kết quả tìm','Search results'))}">${resultsHtml(q)}</div>
 <div class="scout-grid"><div class="field"><label for="rm-report-suburb">${T('Khu (suburb) của cửa hàng','Store suburb')}</label><input class="input" id="rm-report-suburb" name="suburb" maxlength="40" required value="${esc(b.suburb||RM.areaTokens(report.store).map(t=>t[0].toUpperCase()+t.slice(1)).pop()||'')}"></div><div class="field"><label for="rm-report-postcode">${T('Postcode cửa hàng','Store postcode')}</label><input class="input" id="rm-report-postcode" name="postcode" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" required value="${esc(b.postcode||scoutData?.postcode||'')}"></div></div>
 <label class="scout-check" for="rm-report-consent"><input type="checkbox" id="rm-report-consent" name="consent"><span>${T('Chia sẻ giá này với cộng đồng (ẩn danh)','Share this price with the community (anonymous)')}</span></label>
 <p class="hint">${T('So Giá sẽ hiện “Chưa xác minh · 1 người báo” kèm thời điểm chụp. Giá này chưa dùng để so giá và chưa có điểm cho tới khi một gia đình khác báo cùng giá ở cửa hàng / khu này. Chỉ gửi món, giá, cửa hàng, khu và thời điểm — không gửi ảnh hay các dòng khác.','Price Check will show “Not verified · 1 report” with the capture time. It is not used to compare prices and earns no points until another family reports the same price at this store / area. Only the item, price, store, area and time are sent — never the photo or other lines.')}</p></form>`,
 `<button class="btn" data-rm="report-cancel">${T('Huỷ','Cancel')}</button><button class="btn primary" type="submit" form="rm-report-form">👥 ${T('Báo giá','Report price')}</button>`);
 document.querySelector('.modal')?.classList.add('rm-report-modal');
}
function resultsHtml(q){const list=catalogSearch(q);if(!q)return`<p class="hint">${T('Gõ tên món để tìm.','Type an item name to search.')}</p>`;if(!list.length)return`<p class="hint">${T('Không thấy món trong danh mục.','No catalogue item found.')}</p>`;
 return list.map((i,k)=>`<label class="rm-report-item"><input type="radio" name="itemId" value="${esc(i.id)}" ${report?.itemId===i.id||!report?.itemId&&k===0&&RM.norm(q)===RM.norm(lang()==='en'?i.nameEn:i.nameVi)?'checked':''}><span>${esc(lang()==='en'?i.nameEn:i.nameVi)}<small>${esc(lang()==='en'?i.nameVi:i.nameEn)}</small></span></label>`).join('')}
async function submitReport(form){
 const r=report;if(!r)return;const item=(form.querySelector('input[name="itemId"]:checked') as any)?.value;
 if(!item){toast(T('Chọn món trong danh mục trước.','Pick a catalogue item first.'),true);return}
 if(!form.consent.checked){toast(T('Đánh dấu “Chia sẻ giá này với cộng đồng” để gửi.','Tick “Share this price with the community” to send.'),true);return}
 const suburb=String(form.suburb.value||'').trim(),postcode=String(form.postcode.value||'').trim();
 if(!suburb||!(typeof PS!=='undefined'&&PS.postcodeState(postcode).valid)){toast(T('Nhập khu và postcode của cửa hàng.','Enter the store suburb and postcode.'),true);return}
 if(Date.now()-Date.parse(r.capturedAt)>7*864e5){toast(T('Chỉ báo được giá chụp trong 7 ngày gần đây.','Only prices captured in the last 7 days can be reported.'),true);return}
 const cat=(globalThis.MASTER_CATALOG?.items||[]).find(i=>i.id===item);
 scoutData.communityBranch={suburb,postcode};
 const observation={itemId:item,label:(cat?.nameEn||cat?.nameVi||r.label).slice(0,120),retailer:RM.localRetailer(r.store),price:r.price,currency:'AUD',packQty:null,packUnit:null,units:null,unitPrice:null,unitBasis:null,promo:null,validUntil:null,capturedAt:r.capturedAt,state:scoutData.state,evidence:{type:'receipt',receiptId:r.receiptId,lineId:r.lineId,generic:true}};
 const back=r.receiptId;report=null;closeModal();
 await scoutCommunityStart({observation,branch:{suburb,postcode},file:null});
 if(state.receipts.some(x=>x.id===back))setTimeout(()=>{if(!document.querySelector('.modal'))openReceipt(back)},0);
}

// ------------------------------------------------------------ So Giá: "Tôi cũng thấy giá này"
async function meToo(btn){
 if(!(typeof scoutCommunityEligible==='function'&&scoutCommunityEligible())){toast(typeof scoutIneligibleText==='function'?scoutIneligibleText(scoutCommunity.status?.eligibility):T('Cần tài khoản đủ điều kiện để xác nhận giá.','An eligible account is needed to confirm prices.'),true);return}
 const share={metoo:{state:scoutData.state,itemId:btn.dataset.item,groupId:btn.dataset.group}};
 if(!scoutCommunity.status?.termsAcceptedAt){scoutCommunity.pending=share;scoutTermsSheet();return}
 btn.disabled=true;try{await sendMeToo(share.metoo)}finally{btn.disabled=false}
}
async function sendMeToo(m){
 try{const r=await communityApi('confirm',{method:'POST',body:JSON.stringify({...m,capturedAt:new Date().toISOString(),consent:true})});
  toast(r.group?.status==='confirmed'?T('Cảm ơn! Giá đã được xác minh nhờ bạn.','Thanks! The price is now verified.'):T('Cảm ơn! Đã ghi nhận bạn cũng thấy giá này.','Thanks! Your sighting was recorded.'));
  await scoutCommunityRefresh().catch(()=>{});if(typeof view!=='undefined'&&view==='shopping'&&typeof scoutRerender==='function')scoutRerender()}
 catch(e){toast(e.message,true)}
}
if(typeof scoutContribute==='function'){const oldContribute=scoutContribute;scoutContribute=async function(share){if(share&&share.metoo)return sendMeToo(share.metoo);return oldContribute(share)}}

// ------------------------------------------------------------ events
document.addEventListener('click',event=>{
 const el=(event.target as any).closest?.('[data-rm],[data-community="metoo"]');if(!el||el.disabled)return;
 if(el.dataset.community==='metoo'){meToo(el);return}
 const a=el.dataset.rm,i=el.dataset.i!=null?+el.dataset.i:null;
 try{
  if(a==='line'){rm.sel=rm.sel===i?null:i;renderPanel()}
  else if(a==='item'){if(rm.sel==null){say(T('Chạm một giá trên hoá đơn trước.','Tap a price on the receipt first.'));return}const it=receiptDraft.items[rm.sel];const keys=targetsOf(it),k=el.dataset.key;applyTargets(rm.sel,keys.includes(k)?keys.filter(x=>x!==k):[...keys,k]);renderPanel()}
  else if(a==='accept'){applyTargets(i,String(el.dataset.keys||'').split(',').filter(Boolean));rm.sel=null;renderPanel()}
  else if(a==='clear'){applyTargets(i,[]);renderPanel()}
  else if(a==='undo')undo();
  else if(a==='say'){const v=(document.getElementById('rm-say') as any)?.value||'';if(v.trim())runCommand(v.trim())}
  else if(a==='mic'){const t=ensureTake();if(!t){say(T('Trình duyệt chưa hỗ trợ giọng nói — gõ lệnh vào ô.','Voice is not supported in this browser — type the command.'));return}if(t.listening)t.stop();else t.start()}
  else if(a==='split'){rm.split=rm.split===i?null:i;renderPanel();(document.querySelector('#rm-panel [data-rm-split="0"]') as any)?.focus()}
  else if(a==='split-cancel'){rm.split=null;renderPanel()}
  else if(a==='split-apply')applySplit(i);
  else if(a==='forget'){const e=(state.receiptLearning.entries||[]).find(x=>x.id===el.dataset.id);if(e&&RM.forget(state.receiptLearning,e.id)){save(T('Đã quên cách ghép này.','Mapping forgotten.'));renderPanel()}}
  else if(a==='report')reportSheet(i);
  else if(a==='report-cancel'){const back=report?.receiptId;report=null;closeModal();if(back)openReceipt(back)}
 }catch(e){toast(e.message||String(e),true)}
});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.target as any)?.id==='rm-say'){e.preventDefault();const v=(e.target as any).value.trim();if(v)runCommand(v)}});
document.addEventListener('input',e=>{if((e.target as any)?.id==='rm-report-q'){const box=document.getElementById('rm-report-results');if(box)box.innerHTML=resultsHtml((e.target as any).value)}});
document.addEventListener('submit',e=>{const f=e.target as any;if(f?.id!=='rm-report-form')return;e.preventDefault();submitReport(f).catch(err=>toast(err.message||String(err),true))});

Object.assign(globalThis,{ReceiptMatchUI:{basket,suggestionsFor,applyTargets,runCommand,panelHtml,renderPanel,undo,unknownSpend,catalogSearch,state:()=>rm}});
})();
