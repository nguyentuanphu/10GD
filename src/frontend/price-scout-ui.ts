'use strict';
// Price Scout / So giá — Shopping screen panel. Prices come only from the
// family: screenshot OCR, pasted text, manual entry, the "Lưu giá" bookmark,
// confirmed receipts and catalogue deals. Account mode shares observations with
// the selected family only; device-only mode keeps them on this device. Device
// data is never merged into a family automatically.
const SCOUT_KEY='bep-price-scout-v1';
const scoutT=(vi,en)=>typeof tr==='function'?tr(vi,en):vi;
const PS=globalThis.PriceScout;
let scoutData=scoutLoad(),scoutDraft=null,scoutBusy=false,scoutRefreshing=false,scoutLast=null;
function scoutLoad(){try{const d=JSON.parse(familyStorage.getItem(SCOUT_KEY)||'null');if(d&&d.version===1)return{open:true,prefs:{},local:[],pending:[],pool:null,community:null,communityBranches:[],communityBranch:null,...d}}catch{}return{version:1,open:true,postcode:'',state:null,personaOverride:null,prefs:{},local:[],pending:[],pool:null}}
function scoutSave(){try{familyStorage.setItem(SCOUT_KEY,JSON.stringify(scoutData));return true}catch{toast(scoutT('Không lưu được trên thiết bị (bộ nhớ đầy?).','Could not save on this device (storage full?).'),true);return false}}
const scoutAccount=()=>globalThis.BEP_SESSION?.mode==='account'&&!!globalThis.BEP_SESSION.household;
const scoutViewer=()=>scoutAccount()&&globalThis.BEP_SESSION.household.role==='viewer';
const scoutOnline=()=>navigator.onLine&&!globalThis.BEP_OFFLINE;
const scoutCatalog=()=>globalThis.MASTER_CATALOG?.items||[];
const scoutItem=id=>scoutCatalog().find(i=>i.id===id)||null;
const scoutMoney=n=>n==null?'—':aud(n,'AUD');
const scoutRetailer=id=>{const r=PS.RETAILERS[id]||PS.RETAILERS.other;return(appLanguage==='en'?r.name:(r.vi||r.name))};
const scoutBasisLabel=b=>({per_kg:'/kg',per_100g:'/100g',per_L:'/L',per_100mL:'/100mL',per_each:scoutT('/cái','/each'),per_wash:scoutT('/lần giặt','/wash'),per_roll:scoutT('/cuộn','/roll'),per_sheet:scoutT('/tờ','/sheet')}[b]||'');
const scoutItems=n=>n+' '+(appLanguage==='en'?(n===1?'item':'items'):'món');
const scoutItemName=i=>i?(appLanguage==='en'?i.nameEn:i.nameVi):'';
const scoutPromoLabel=p=>({'half-price':scoutT('Giảm nửa giá','1/2 price'),special:scoutT('Khuyến mãi','Special'),'special-buy':'Special Buy','price-drop':scoutT('Giá hạ','Price drop'),multibuy:scoutT('Mua nhiều','Multi-buy'),deal:'Deal',clearance:scoutT('Xả hàng','Clearance')}[p]||'');
const scoutSourceIcon=s=>({'shelf-photo':'📸',community:'👥',shop:'🏪',screenshot:'📷',bookmark:'🔖',receipt:'🧾',catalogue:'🗞',manual:'✍️',official:'🏷'}[s]||'•');
const scoutConfidenceLabel=c=>({low:scoutT('tự nhập','self-entered'),medium:scoutT('đã đối chiếu ảnh','checked against capture'),high:scoutT('từ hóa đơn','from receipt')}[c]||'');
const SCOUT_PERSONA={learning:['🌱','Đang học thói quen','Learning your habits'],convenience:['🛒','Ưu tiên tiện lợi','Convenience-First'],'smart-saver':['💡','Tiết kiệm thông minh','Smart Saver'],'local-fresh':['🏮','Mê đồ tươi chợ Việt','Local Fresh Lover']};
function scoutIngredientUnit(id){const u=INGREDIENTS[id]?.[1];return u==='ml'?'ml':u}
function scoutReceiptObs(){return PS.receiptObservations(state.receipts||[],scoutCatalog(),{ingredientUnit:scoutIngredientUnit,state:scoutData.state||null})}
function scoutObservations(){
 const own=scoutAccount()?[...(scoutData.pool?.observations||[]),...scoutData.pending]:scoutData.local;
 const ids=new Set(),out=[];for(const o of [...own,...(scoutData.pool?.official?.observations||[]),...scoutReceiptObs()])if(o&&!ids.has(o.id)){ids.add(o.id);out.push(o)}
 return out;
}
function scoutBasket(){
 const cat=scoutCatalog(),byIngredient=new Map();for(const i of cat)if(i.ingredientId&&!byIngredient.has(i.ingredientId))byIngredient.set(i.ingredientId,i);
 const match=label=>PS.matchCatalog(label,cat,1)[0];
 const w=currentWeek(),[start,end]=shopDates(),items=[];
 for(const r of shopping(state,w,start,end)){if(r.skip||r.bought||!shoppingHasAmount(r))continue;const name=INGREDIENTS[r.id][0],item=byIngredient.get(r.id)||(match(name)?.score>=0.6?match(name).item:null);const unit=INGREDIENTS[r.id][1]==='quả'?'each':INGREDIENTS[r.id][1];
  items.push({key:'ing:'+r.id,ingredient:r.id,label:name,itemId:item?.id||null,...(r.qty>0?{qty:r.qty,unit}:{qty:r.purchase?.amount||1,unit:'pack'})})}
 for(const e of w.extras||[]){if(e.done)continue;const m=match(e.name),q=String(e.qty||'').match(/(\d+(?:[.,]\d+)?)\s*(kg|g|ml|l|cuộn|roll|gói|pack|hộp|chai|cái|quả)?/i);let qty=1,unit='pack';if(q){qty=+q[1].replace(',','.');const u=(q[2]||'').toLowerCase();unit=u==='kg'||u==='g'||u==='ml'||u==='l'?u:u==='quả'||u==='cái'?'each':u==='cuộn'||u==='roll'?'roll':'pack'}
  items.push({key:'extra:'+e.id,label:e.name,itemId:m?.score>=0.6?m.item.id:null,qty:qty>0?qty:1,unit})}
 return items;
}
function scoutTrips(){return PS.tripsFromReceipts(state.receipts||[],{ingredientGroup:id=>INGREDIENTS[id]?.[2]})}
function scoutCompute(){
 const persona=PS.detectPersona(scoutTrips(),{override:scoutData.personaOverride});
 const prefs={...persona.prefs,...(scoutData.prefs.minSavings!=null?{minSavings:scoutData.prefs.minSavings}:{}),catalog:scoutCatalog(),state:scoutData.state,...scoutCommunityPrefs()};
 const items=scoutBasket(),observations=scoutObservations();
 scoutLast={persona,items,observations,result:PS.optimizeBasket(items,observations,prefs)};return scoutLast;
}
function scoutFreshLabel(o){const f=PS.freshness(o);const age=f.ageDays===0?scoutT('hôm nay','today'):f.ageDays===1?scoutT('hôm qua','yesterday'):scoutT(f.ageDays+' ngày trước',f.ageDays+' days ago');
 if(f.status==='special')return{cls:'special',text:scoutT('KM đến ','Deal until ')+o.validUntil.slice(8)+'/'+o.validUntil.slice(5,7)};
 if(f.status==='expired')return{cls:'expired',text:scoutT('KM đã hết','Deal ended')};
 if(f.status==='stale')return{cls:'stale',text:age+' · '+scoutT('cũ, không tính','old, not used')};
 return{cls:f.status,text:age}}
function scoutStatusLine(){const parts=[];if(scoutData.state)parts.push('📍 '+esc(scoutData.postcode)+' · '+scoutData.state);
 parts.push(scoutOnline()?(scoutAccount()?'🟢 '+scoutT('Đồng bộ gia đình','Family sync'):'📱 '+scoutT('Chỉ trên thiết bị này','This device only')):'⚪ '+scoutT('Offline · dùng bản lưu trên máy','Offline · using the copy on this device'));
 if(scoutAccount()&&scoutData.pool?.at)parts.push(scoutT('Cập nhật ','Updated ')+new Date(scoutData.pool.at).toLocaleTimeString(appLanguage==='en'?'en-AU':'vi-VN',{hour:'2-digit',minute:'2-digit'}));
 if(scoutData.pending.length)parts.push('⏳ '+scoutData.pending.length+' '+scoutT('giá chờ đồng bộ','prices waiting to sync'));
 return parts.join(' · ')}
function scoutCaptureButtons(){if(scoutViewer())return`<p class="hint">${scoutT('Tài khoản chỉ xem: bạn xem được giá của gia đình nhưng không thêm giá.','View-only account: you can see family prices but not add them.')}</p>`;
 return`<div class="scout-capture" role="group" aria-label="${esc(scoutT('Thêm giá','Add a price'))}"><button class="btn primary scout-pulse" data-scout="shot">📷 ${scoutT('Chụp màn hình giá','Price screenshot')}</button><button class="btn" data-scout="paste">📋 ${scoutT('Dán chữ','Paste text')}</button><button class="btn" data-scout="manual">✍️ ${scoutT('Nhập tay','Enter by hand')}</button><button class="btn" data-scout="bookmark">🔖 ${scoutT('Nút “Lưu giá”','“Save price” button')}</button><button class="btn" data-scout="catalogue">🗞 ${scoutT('Catalogue & deal','Catalogues & deals')}</button><input type="file" id="scout-shot-input" accept="image/*" hidden>${scoutShelfButton()}</div>`}
function scoutPanel(){
 const open=scoutData.open!==false;
 const head=`<div class="scout-head"><button class="scout-toggle" data-scout="toggle" aria-expanded="${open}" aria-controls="scout-body"><span class="scout-title">🏷️ ${scoutT('So giá','Price Scout')}</span><span class="scout-sub">${scoutStatusLine()}</span><span class="scout-chevron" aria-hidden="true">${open?'▴':'▾'}</span></button><button class="btn soft scout-refresh" data-scout="refresh" ${scoutRefreshing?'disabled aria-busy="true"':''}>🔄 ${scoutT('Làm mới giá','Refresh prices')}</button></div>`;
 if(!open)return`<section class="card price-scout" aria-label="${esc(scoutT('So giá','Price Scout'))}">${head}</section>`;
 let body='';
 if(!scoutData.state){const check=scoutData.postcode?PS.postcodeState(scoutData.postcode):null;
  body=`<form id="scout-postcode-form" class="scout-postcode"><label for="scout-postcode">${scoutT('Mã bưu điện (postcode) của nhà mình','Your home postcode')}</label><div class="scout-row"><input class="input" id="scout-postcode" name="postcode" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="postal-code" value="${esc(scoutData.postcode||'')}" required><button class="btn primary">${scoutT('Lưu','Save')}</button></div><p class="hint">${scoutT('Dùng để so giá theo bang (hiện hỗ trợ NSW và QLD). Không gửi vị trí của bạn đi đâu.','Used to compare prices by state (NSW and QLD for now). Your location is not shared.')}</p>${check?.valid&&!check.supported?`<p class="callout scout-unsupported" role="status">🌏 ${esc(scoutT(check.message.vi,check.message.en))}</p>`:''}</form>`;
  return`<section class="card price-scout" aria-label="${esc(scoutT('So giá','Price Scout'))}">${head}<div id="scout-body">${body}</div></section>`}
 const {persona,result,observations,items}=scoutCompute();
 const own=observations.filter(o=>o.source!=='official');
 const p=SCOUT_PERSONA[persona.persona]||SCOUT_PERSONA.learning;
 const personaBar=`<div class="scout-persona"><span class="pill">${p[0]} ${scoutT(p[1],p[2])}${persona.persona==='learning'?` · ${persona.trips}/3 ${scoutT('chuyến','trips')}`:''}</span><details class="scout-settings"><summary>⚙️ ${scoutT('Tùy chỉnh','Settings')}</summary><div class="scout-settings-body"><label class="sr-only" for="scout-persona-select">${scoutT('Chọn kiểu đi chợ','Choose shopping style')}</label><select class="input" id="scout-persona-select"><option value="">${scoutT('Tự nhận biết','Auto-detect')}</option>${['convenience','smart-saver','local-fresh'].map(k=>`<option value="${k}" ${scoutData.personaOverride===k?'selected':''}>${SCOUT_PERSONA[k][0]} ${scoutT(SCOUT_PERSONA[k][1],SCOUT_PERSONA[k][2])}</option>`).join('')}</select><label class="sr-only" for="scout-threshold">${scoutT('Ngưỡng thêm điểm mua','Extra stop threshold')}</label><select class="input" id="scout-threshold">${[5,10,15,20].map(v=>`<option value="${v}" ${(result.split.minSavings)===v?'selected':''}>${scoutT('Thêm điểm khi tiết kiệm ≥ ','Extra stop if it saves ≥ ')}$${v}</option>`).join('')}</select><a class="btn soft" href="#scout-change-postcode" data-scout="postcode">📍 ${scoutT('Đổi postcode','Change postcode')}</a></div></details></div>`;
 const supported=PS.postcodeState(scoutData.postcode).supported;
 if(!supported)return`<section class="card price-scout">${head}<div id="scout-body"><p class="callout scout-unsupported" role="status">🌏 ${esc(scoutT(PS.UNSUPPORTED.vi,PS.UNSUPPORTED.en))}</p><button class="btn" data-scout="postcode">📍 ${scoutT('Đổi postcode','Change postcode')}</button></div></section>`;
 body+=scoutCaptureButtons()+personaBar;
 if(!own.length&&!(scoutData.pool?.official?.observations||[]).length){
  body+=`<div class="scout-empty"><h3>${scoutT('Chưa có giá nào','No prices yet')}</h3><p>${scoutT('Mỗi khi thấy giá trên app Woolworths, Coles, ALDI, Chemist Warehouse, Amazon hoặc ở chợ Việt: chụp màn hình rồi bấm “Chụp màn hình giá”. Hóa đơn đã xác nhận (có số lượng) cũng tự thành giá tham khảo.','Whenever you see a price in the Woolworths, Coles, ALDI, Chemist Warehouse or Amazon app, or at the Vietnamese grocer: take a screenshot and tap “Price screenshot”. Confirmed receipts with quantities also become price references.')}</p><p class="hint">${scoutT('Giá chỉ do gia đình bạn ghi lại để dùng riêng. Ứng dụng không tự lấy dữ liệu từ website cửa hàng.','Prices are recorded by your family for personal use. The app does not collect data from store websites.')}</p></div>`;
 }
 if(!items.length)body+=`<p class="hint">${scoutT('Danh sách đi chợ đang trống nên chưa có gì để so.','Your shopping list is empty, so there is nothing to compare yet.')}</p>`;
 else body+=scoutCards(result,persona);
 body+=scoutRecent(own);
 return`<section class="card price-scout" aria-label="${esc(scoutT('So giá','Price Scout'))}">${head}<div id="scout-body">${body}</div></section>`;
}
function scoutCards(r,persona){
 const o=r.oneStop,s=r.split;let html='<div class="scout-cards">';
 const unknownList=r.unknown.length?`<p class="scout-unknown"><b>${scoutT('Chưa có giá','No price yet')} (${r.unknown.length}):</b> ${r.unknown.slice(0,12).map(u=>esc(u.label)).join(', ')}${r.unknown.length>12?'…':''}</p>`:'';
 // One-stop
 html+=`<article class="scout-card"><h3>🛒 ${scoutT('Một điểm mua','One-stop')}</h3>`;
 if(o.commonCount){const w=o.cheaper==='woolworths',c=o.cheaper==='coles';html+=`<div class="scout-vs"><div class="${w?'win':''}"><span>${PS.RETAILERS.woolworths.icon} Woolworths</span><strong>${scoutMoney(o.woolworths)}</strong></div><div class="${c?'win':''}"><span>${PS.RETAILERS.coles.icon} Coles</span><strong>${scoutMoney(o.coles)}</strong></div></div><p>${o.cheaper?`<b>${scoutRetailer(o.cheaper)}</b> ${scoutT('rẻ hơn','is cheaper by')} <b>${scoutMoney(o.difference)}</b>`:scoutT('Hai nơi bằng giá','Both cost the same')} · ${scoutT('so trên','compared on')} ${o.commonCount} ${scoutT('món có giá ở cả hai nơi','items priced at both')}</p>`}
 else html+=`<p>${scoutT('Cần giá của cùng một món ở cả Woolworths và Coles để so.','Needs the same item priced at both Woolworths and Coles to compare.')}</p>`;
 html+=scoutMixLabel(o.sourceMix)+`<p class="hint">${scoutT('Đã có giá','Priced')}: ${r.pricedCount}/${scoutItems(r.itemCount)}${o.aldi?` · ${PS.RETAILERS.aldi.icon} ALDI: ${scoutMoney(o.aldi.total)} (${scoutItems(o.aldi.count)})`:''}</p>${unknownList}</article>`;
 // Smart split
 const extra=s.stops.filter(x=>x.retailer!==s.mainStore);
 html+=`<details class="scout-card" ${persona.prefs.splitOpen||extra.length?'open':''}><summary><h3>💡 ${scoutT('Chia điểm mua','Smart split')}</h3>${s.savings>0?`<span class="pill scout-save">−${scoutMoney(s.savings)} (${s.savingsPct}%)</span>`:''}</summary>`;
 if(!extra.length)html+=`<p>${scoutT('Mua hết ở ','Buy everything at ')}<b>${scoutRetailer(s.mainStore)}</b>. ${s.folded.length?scoutT('Điểm phụ không đủ ngưỡng nên đã gộp lại.','Extra stops did not meet the threshold so they were folded back.'):''}</p>`;
 else html+=`<p>${scoutT('Tiết kiệm','Saves')} <b>${scoutMoney(s.savings)}</b> (${s.savingsPct}%) ${scoutT('so với mua hết ở','vs buying everything at')} ${scoutRetailer(s.mainStore)} · ${scoutT('tính trên','on')} ${s.comparableCount} ${scoutT('món có giá ở đó','items priced there')}</p>`;
 html+=scoutMixLabel(s.sourceMix);
 html+=`<ul class="scout-stops">${s.stops.map(st=>`<li><span>${PS.RETAILERS[st.retailer]?.icon||'🏪'} <b>${scoutRetailer(st.retailer)}</b>${st.delivery?` · ${scoutT('giao tận nhà','home delivery')}`:''}</span><span>${scoutItems(st.items.length)} · ${scoutMoney(st.total)}${st.unknownCount?` + ${st.unknownCount} ${scoutT('chưa giá','unpriced')}`:''}</span></li>`).join('')}</ul>`;
 if(s.folded.length)html+=`<p class="hint">${s.folded.map(f=>`${scoutRetailer(f.retailer)}: ${scoutT('chỉ tiết kiệm','saves only')} ${scoutMoney(f.savings)} → ${scoutT('gộp về','folded into')} ${scoutRetailer(s.mainStore)}`).join(' · ')}</p>`;
 html+=`<p class="hint">${scoutT('Chỉ thêm điểm khi tiết kiệm ≥ ','Extra stop only if it saves ≥ ')}${scoutMoney(s.minSavings)} ${scoutT('hoặc đơn ở đó ≥ ','or that order is ≥ ')}${scoutMoney(s.minStopOrder)}.</p></details>`;
 // Route
 if(r.route.length){html+=`<article class="scout-card"><h3>🧭 ${scoutT('Thứ tự đi','Route order')}</h3><ol class="scout-route">${r.route.map(st=>`<li class="${st.delivery?'delivery':''}"><span class="scout-step" aria-hidden="true">${st.delivery?'📦':st.step}</span><div><b>${PS.RETAILERS[st.retailer]?.icon||''} ${scoutRetailer(st.retailer)}</b> · ${scoutItems(st.itemCount)}${st.delivery?`<small>${scoutT('Đặt giao hàng, không cần ghé','Order for delivery, no stop needed')}</small>`:''}${st.coldItems.length?`<small>🧊 ${scoutT('Đồ sống/đông lạnh, mua sau cùng','Raw/frozen, pick up last')}: ${st.coldItems.slice(0,6).map(esc).join(', ')}</small>`:''}${!st.coldItems.length&&st.chilledItems.length?`<small>❄️ ${scoutT('Lấy đồ mát cuối cùng tại đây','Grab chilled items last here')}</small>`:''}</div></li>`).join('')}</ol>${r.route.some(x=>x.coldItems.length)?`<p class="hint">${scoutT('Mang túi giữ lạnh; thịt cá về nhà cất tủ ngay.','Bring a cooler bag; refrigerate meat and fish as soon as you get home.')}</p>`:''}</article>`}
 // Local benchmark
 if(r.benchmark.length)html+=`<article class="scout-card"><h3>🏮 ${scoutT('Chợ Việt hay siêu thị?','Vietnamese grocer or supermarket?')}</h3><ul class="scout-bench">${r.benchmark.map(b=>`<li><span>${esc(b.label)}</span><span>${b.cheaper==='viet-grocer'?`<b class="good">${scoutT('Chợ Việt','Viet grocer')} ${scoutMoney(b.viet)}</b> · ${scoutRetailer(b.supermarket.retailer)} ${scoutMoney(b.supermarket.cost)}`:`<b class="good">${scoutRetailer(b.supermarket.retailer)} ${scoutMoney(b.supermarket.cost)}</b>${b.supermarket.promo?` (${scoutPromoLabel(b.supermarket.promo)})`:''} · ${scoutT('Chợ Việt','Viet grocer')} ${scoutMoney(b.viet)}`} <small>(${scoutT('chênh','diff')} ${scoutMoney(b.difference)}${b.approx?', ≈':''})</small></span></li>`).join('')}</ul></article>`;
 if(r.bulk.some(b=>b.prices.amazon))html+=`<button class="btn full scout-tray-open" data-scout="tray">📦 ${scoutT('Đồ gia dụng mua số lượng lớn (giao tận nhà)','Bulk household items (home delivery)')}</button>`;
 html+=scoutCommunityCard(r);
 return html+'</div>';
}
function scoutRecent(own){
 if(!own.length)return'';
 const rows=own.slice().sort((a,b)=>b.observedAt.localeCompare(a.observedAt)).slice(0,10);
 return`<details class="scout-recent"><summary>${scoutT('Giá đã ghi gần đây','Recently recorded prices')} (${own.length})</summary><ul>${rows.map(o=>{const f=scoutFreshLabel(o),canDelete=o.source!=='receipt'&&!scoutViewer(),canShare=scoutCommunityCanShare(o);return`<li class="fresh-${f.cls}"><span>${scoutSourceIcon(o.source)} <b>${esc(o.label)}</b><small>${scoutRetailer(o.retailer)} · ${scoutMoney(o.price)}${o.unitPrice!=null?` · ${scoutMoney(o.unitPrice)}${scoutBasisLabel(o.unitBasis)}`:''}${o.promo?` · ${scoutPromoLabel(o.promo)}`:''}${o.observedBy?` · ${esc(o.observedBy)}`:''}${o.confidence?` · ${scoutConfidenceLabel(o.confidence)}`:''}</small></span><span class="scout-age">${esc(f.text)}${scoutData.pending.some(p=>p.id===o.id)?' · ⏳':''}</span>${canShare?`<button class="btn soft scout-share-btn" data-community="share" data-id="${esc(o.id)}">👥 ${scoutT('Chia sẻ','Share')}<span class="sr-only"> ${esc(o.label)}</span></button>`:''}${canDelete?`<button class="icon scout-del" data-scout="delete" data-id="${esc(o.id)}" aria-label="${esc(scoutT('Xóa giá','Delete price'))} ${esc(o.label)}">×</button>`:''}</li>`}).join('')}</ul><p class="hint">${scoutT('Giá thường mờ dần sau 21 ngày và không tính vào tổng sau 35 ngày. Giá khuyến mãi hết hạn theo ngày kết thúc.','Regular prices fade after 21 days and stop counting after 35 days. Deals expire on their end date.')}</p></details>`;
}
function scoutDecorateList(){if(!scoutLast)return;for(const b of scoutLast.result.benchmark){if(b.cheaper!=='viet-grocer'||!b.key.startsWith('ing:'))continue;const input=document.querySelector(`#main input[data-change="bought"][data-id="${CSS.escape(b.key.slice(4))}"]`),row=input?.closest('.shop-row');if(!row||row.querySelector('.scout-viet-badge'))continue;const badge=document.createElement('span');badge.className='pill scout-viet-badge';badge.textContent='🏮 '+scoutT('Chợ Việt rẻ hơn ','Viet grocer saves ')+scoutMoney(b.difference);(row.querySelector('.item-label')||row).appendChild(badge)}}
function scoutMount(){
 if(view!=='shopping')return;const main=document.getElementById('main');if(!main||main.querySelector('.price-scout'))return;
 const holder=document.createElement('div');holder.innerHTML=scoutPanel();const panel=holder.firstElementChild;
 const anchor=main.querySelector('.week-tools');if(anchor)anchor.after(panel);else main.prepend(panel);
 scoutDecorateList();scoutCommunityAutoload();
}
function scoutRerender(){const old=document.querySelector('#main .price-scout');if(!old){scoutMount();return}const focus=document.activeElement?.dataset?.scout||document.activeElement?.id;const holder=document.createElement('div');holder.innerHTML=scoutPanel();old.replaceWith(holder.firstElementChild);scoutDecorateList();if(focus){const el=document.querySelector(`.price-scout [data-scout="${focus}"]`)||document.getElementById(focus);el?.focus?.()}}
const scoutBaseRender=render;
render=function(...args){const result=scoutBaseRender.apply(this,args);try{scoutMount()}catch(error){console.warn('Price Scout',error)}return result};

// ---------- Confirm sheet ----------
function scoutNewDraft(seed={}){
 const today=PS.sydneyToday();
 return{id:'obs-'+uid().replace(/[^\w-]/g,'').slice(0,40),itemId:null,label:'',retailer:'woolworths',branchId:null,state:scoutData.state,price:null,currency:'AUD',packQty:null,packUnit:null,units:null,unitPrice:null,unitBasis:null,wasPrice:null,promo:null,validUntil:null,observedAt:today,observedBy:globalThis.BEP_SESSION?.account?.name||scoutData.memberName||'',source:'manual',note:'',raw:'',...seed};
}
function scoutFromParsed(parsed,source,raw=''){return scoutNewDraft({itemId:parsed.itemId,label:parsed.label,retailer:parsed.retailer||'woolworths',price:parsed.price,packQty:parsed.packQty,packUnit:parsed.packUnit,units:parsed.units,unitPrice:parsed.unitPrice,unitBasis:parsed.unitBasis,wasPrice:parsed.wasPrice,promo:parsed.promo,validUntil:parsed.promo&&parsed.retailer?PS.defaultDealEnd(parsed.retailer):null,source,raw,url:parsed.url||'',matches:(parsed.matches||[]).map(m=>m.item.id),ocrPrice:source==='screenshot'||source==='bookmark'?parsed.price:null,capturedAt:new Date().toISOString()})}
function scoutConfirm(draft){
 scoutDraft=draft;const d=draft,cat=scoutCatalog(),suggestions=(d.matches||[]).map(scoutItem).filter(Boolean);
 const opt=(v,label,sel)=>`<option value="${esc(v)}" ${sel?'selected':''}>${esc(label)}</option>`;
 const groups=PS.CATEGORIES.map(c=>`<optgroup label="${esc(c)}">${cat.filter(i=>i.category===c).map(i=>opt(i.id,scoutItemName(i),d.itemId===i.id)).join('')}</optgroup>`).join('');
 const stores=(state.stores||[]);
 modal(scoutT('Xác nhận giá','Confirm price'),`<form id="scout-obs-form" class="scout-form" novalidate>
 ${d.source==='screenshot'||d.source==='bookmark'||d.raw?`<p class="hint">${scoutT('Kiểm tra lại các ô bên dưới, sửa nếu đọc sai rồi mới lưu.','Check the fields below and fix anything misread before saving.')}</p>`:''}
 ${suggestions.length?`<div class="scout-suggest" role="group" aria-label="${esc(scoutT('Gợi ý món','Suggested items'))}">${suggestions.map(i=>`<button type="button" class="btn ${i.id===d.itemId?'primary':''}" data-scout="pick-item" data-id="${esc(i.id)}">${esc(scoutItemName(i))}</button>`).join('')}</div>`:''}
 <div class="field"><label for="scout-item">${scoutT('Món trong danh mục','Catalogue item')}</label><select class="input" id="scout-item" name="itemId"><option value="">${scoutT('— Khác / chưa khớp —','— Other / no match —')}</option>${groups}</select></div>
 <div class="field"><label for="scout-label">${scoutT('Tên sản phẩm như trên nhãn','Product name as shown')}</label><input class="input" id="scout-label" name="label" maxlength="160" required value="${esc(d.label)}"></div>
 <div class="scout-grid"><div class="field"><label for="scout-retailer">${scoutT('Cửa hàng','Store')}</label><select class="input" id="scout-retailer" name="retailer">${['woolworths','coles','aldi','chemist','amazon','viet-grocer','other'].map(r=>opt(r,scoutRetailer(r),d.retailer===r)).join('')}</select></div>
 <div class="field"><label for="scout-branch">${scoutT('Chi nhánh của bạn','Your branch')}</label><select class="input" id="scout-branch" name="branchId"><option value="">${scoutT('Không chọn','Not set')}</option>${stores.map(s=>opt(s.id,s.name+(s.address?' · '+s.address:''),d.branchId===s.id)).join('')}</select></div></div>
 <div class="scout-grid"><div class="field"><label for="scout-price">${scoutT('Giá (AUD)','Price (AUD)')}</label><input class="input" id="scout-price" name="price" type="number" inputmode="decimal" step="0.01" min="0.01" max="10000" required value="${d.price??''}"></div>
 <div class="field"><label for="scout-was">${scoutT('Giá cũ (Was)','Was price')}</label><input class="input" id="scout-was" name="wasPrice" type="number" inputmode="decimal" step="0.01" min="0" value="${d.wasPrice??''}"></div></div>
 <div class="scout-grid three"><div class="field"><label for="scout-pack">${scoutT('Quy cách','Pack size')}</label><input class="input" id="scout-pack" name="packQty" type="number" inputmode="decimal" step="any" min="0" value="${d.packQty??''}"></div>
 <div class="field"><label for="scout-pack-unit">${scoutT('Đơn vị','Unit')}</label><select class="input" id="scout-pack-unit" name="packUnit">${opt('','—',!d.packUnit)}${['g','kg','mL','L','each','wash','roll','sheet'].map(u=>opt(u,u,d.packUnit===u)).join('')}</select></div>
 <div class="field"><label for="scout-units">${scoutT('Số cái/lần/cuộn','Count')}</label><input class="input" id="scout-units" name="units" type="number" inputmode="numeric" step="1" min="0" value="${d.units??''}"></div></div>
 <div class="scout-grid"><div class="field"><label for="scout-unit-price">${scoutT('Đơn giá','Unit price')}</label><input class="input" id="scout-unit-price" name="unitPrice" type="number" inputmode="decimal" step="0.0001" min="0" value="${d.unitPrice??''}"></div>
 <div class="field"><label for="scout-basis">${scoutT('Tính theo','Per')}</label><select class="input" id="scout-basis" name="unitBasis">${opt('','—',!d.unitBasis)}${Object.keys(PS.BASIS).map(b=>opt(b,scoutBasisLabel(b),d.unitBasis===b)).join('')}</select></div></div>
 <div class="scout-grid"><div class="field"><label for="scout-promo">${scoutT('Khuyến mãi','Deal')}</label><select class="input" id="scout-promo" name="promo">${opt('',scoutT('Giá thường','Regular price'),!d.promo)}${PS.PROMOS.map(p=>opt(p,scoutPromoLabel(p),d.promo===p)).join('')}</select></div>
 <div class="field"><label for="scout-until">${scoutT('KM đến ngày','Deal ends')}</label><input class="input" id="scout-until" name="validUntil" type="date" value="${d.validUntil||''}"></div></div>
 <div class="scout-grid"><div class="field"><label for="scout-date">${scoutT('Ngày thấy giá','Seen on')}</label><input class="input" id="scout-date" name="observedAt" type="date" max="${PS.sydneyToday()}" required value="${d.observedAt}"></div>
 <div class="field"><label for="scout-by">${scoutT('Người ghi','Recorded by')}</label>${scoutAccount()?`<input class="input" id="scout-by" value="${esc(d.observedBy)}" disabled>`:`<select class="input" id="scout-by" name="observedBy">${(state.members||[]).map(m=>opt(m.name,m.name,d.observedBy===m.name)).join('')}${opt('',scoutT('Không ghi tên','No name'),!d.observedBy)}</select>`}</div></div>
 <div class="field"><label for="scout-note">${scoutT('Ghi chú','Note')}</label><input class="input" id="scout-note" name="note" maxlength="300" value="${esc(d.note||'')}"></div>
 ${d.raw?`<details><summary>${scoutT('Chữ đọc được','Recognised text')}</summary><textarea class="input" id="scout-raw" rows="5" maxlength="20000">${esc(d.raw)}</textarea><button type="button" class="btn" data-scout="reparse">↻ ${scoutT('Đọc lại từ chữ này','Re-read this text')}</button></details>`:''}
 ${scoutCommunityFieldset(d)}
 <p id="scout-sanity" class="callout scout-sanity" role="status" hidden></p>
 <p class="hint">${scoutAccount()?scoutT('Giá được chia sẻ trong gia đình đang chọn, không chia sẻ với gia đình khác.','Shared with your selected family only, never with other families.'):scoutT('Chế độ chỉ trên thiết bị: giá chỉ lưu trên máy này.','Device-only mode: this price stays on this device.')}</p>
 </form>`,`<button class="btn" data-action="close-modal">${scoutT('Hủy','Cancel')}</button><button class="btn primary" type="submit" form="scout-obs-form">✓ ${scoutT('Lưu giá','Save price')}</button>`,true);
 scoutSanity();
}
function scoutSanity(){const f=document.getElementById('scout-obs-form'),box=document.getElementById('scout-sanity');if(!f||!box)return;const item=scoutItem(f.itemId.value);let unit=+f.unitPrice.value||null;if(item&&unit&&f.unitBasis.value&&f.unitBasis.value!==item.unitBasis)unit=PS.convertUnitPrice(unit,f.unitBasis.value,item.unitBasis);if(item&&!unit&&+f.price.value)unit=PS.unitPriceOf(+f.price.value,+f.packQty.value,f.packUnit.value,+f.units.value||null,item.unitBasis);
 const r=item&&unit?PS.priceSanity(item.id,unit,scoutObservations().filter(o=>o.id!==scoutDraft?.id),{catalog:scoutCatalog()}):{ok:true};
 box.hidden=r.ok;if(!r.ok)box.textContent='⚠️ '+scoutT('Giá này khác thường — kiểm tra lại? ','This price looks unusual — double-check? ')+scoutT('Giá thường gặp gần đây khoảng ','Recent typical price is about ')+scoutMoney(r.median)+scoutBasisLabel(item.unitBasis)+'. '+scoutT('Bạn vẫn có thể lưu.','You can still save it.')}
function scoutRecalc(){const f=document.getElementById('scout-obs-form');if(!f)return;if(f.dataset.manualUnit==='yes'){scoutSanity();return}const item=scoutItem(f.itemId.value),basis=f.unitBasis.value||item?.unitBasis;if(!basis)return;const v=PS.unitPriceOf(+f.price.value,+f.packQty.value,f.packUnit.value,+f.units.value||null,basis);if(v!=null){f.unitPrice.value=v;f.unitBasis.value=basis}scoutSanity()}
function scoutCollect(form){
 const v=Object.fromEntries(new FormData(form)),n=x=>x===''||x==null?null:+x;
 const item=scoutItem(v.itemId);
 const o={...scoutDraft,itemId:item?.id||null,label:String(v.label||'').trim()||scoutItemName(item),retailer:v.retailer,branchId:v.branchId||null,state:scoutData.state,price:n(v.price),wasPrice:n(v.wasPrice),packQty:n(v.packQty),packUnit:v.packUnit||null,units:n(v.units),unitPrice:n(v.unitPrice),unitBasis:v.unitBasis||null,promo:v.promo||null,validUntil:v.validUntil||null,observedAt:v.observedAt,note:String(v.note||'').trim()||null,observedBy:scoutAccount()?(globalThis.BEP_SESSION.account?.name||null):(v.observedBy||null)};
 if(o.unitPrice==null&&item&&o.price){const u=PS.unitPriceOf(o.price,o.packQty,o.packUnit,o.units,item.unitBasis);if(u!=null){o.unitPrice=u;o.unitBasis=item.unitBasis}}
 if(o.unitPrice!=null&&!o.unitBasis)o.unitPrice=null;
 if(o.promo&&!o.validUntil)o.validUntil=PS.defaultDealEnd(o.retailer,o.observedAt);
 const clean={id:o.id,itemId:o.itemId,label:o.label,retailer:o.retailer,branchId:o.branchId,storeBranchId:o.branchId,state:o.state,price:o.price,currency:'AUD',packQty:o.packQty,packUnit:o.packUnit,units:o.units,unitPrice:o.unitPrice,unitBasis:o.unitBasis,wasPrice:o.wasPrice,promo:o.promo,validUntil:o.validUntil,observedAt:o.observedAt,observedBy:o.observedBy,source:o.source,note:o.note};
 return PS.withProvenance(clean,{imageHash:o.imageHash||null,ocrPrice:o.ocrPrice??null,capturedAt:o.capturedAt||null,evidenceType:o.evidenceType||null});
}
async function scoutApi(op,options={}){if(!scoutOnline())throw Error(scoutT('Đang offline.','Offline.'));const r=await fetch('/.netlify/functions/grocery?op='+op,{credentials:'same-origin',cache:'no-store',...options,headers:{...(options.body?{'Content-Type':'application/json'}:{}),...options.headers}});const data=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(Error(data.error||('HTTP '+r.status)),{status:r.status});return data}
async function scoutStore(o){
 if(!scoutAccount()){scoutData.local=[o,...scoutData.local.filter(x=>x.id!==o.id)].slice(0,2000);scoutSave();return'local'}
 scoutData.pending=[o,...scoutData.pending.filter(x=>x.id!==o.id)].slice(0,200);scoutSave();
 try{await scoutFlush();return'synced'}catch{return'pending'}
}
async function scoutFlush(){
 if(!scoutAccount()||!scoutData.pending.length||!scoutOnline())return;
 const batch=scoutData.pending.slice(0,25);await scoutApi('observe',{method:'POST',body:JSON.stringify({observations:batch})});
 const ids=new Set(batch.map(o=>o.id));scoutData.pending=scoutData.pending.filter(o=>!ids.has(o.id));
 scoutData.pool={...(scoutData.pool||{}),observations:[...batch.map(o=>({...o,observedBy:globalThis.BEP_SESSION.account?.name||o.observedBy})),...(scoutData.pool?.observations||[]).filter(o=>!ids.has(o.id))]};scoutSave();
 if(scoutData.pending.length)await scoutFlush();
}
async function scoutRefresh(){
 if(scoutRefreshing)return;
 if(!scoutAccount()){toast(scoutT('Đã làm mới từ dữ liệu trên thiết bị.','Refreshed from this device.'));scoutRerender();return}
 if(!scoutOnline()){toast(scoutT('Đang offline: dùng bản giá đã lưu trên máy.','Offline: using the prices saved on this device.'));scoutRerender();return}
 scoutRefreshing=true;scoutRerender();
 try{await scoutFlush().catch(()=>{});const data=await scoutApi('prices'+(scoutData.state?'&state='+encodeURIComponent(scoutData.state):''));if(data.householdId!==globalThis.BEP_SESSION.household.id)throw Error('Family changed');scoutData.pool={at:Date.now(),cycleId:data.cycleId,observations:data.observations||[],official:data.official||null};scoutSave();await scoutCommunityRefresh().catch(()=>{});toast(scoutT('Đã cập nhật giá của gia đình.','Family prices updated.'))}
 catch(error){toast(scoutT('Chưa tải được giá mới, đang dùng bản lưu trên máy.','Could not load new prices; using the copy on this device.'),true)}
 finally{scoutRefreshing=false;scoutRerender()}
}
async function scoutDelete(id){
 if(scoutViewer())return;if(!confirm(scoutT('Xóa giá này?','Delete this price?')))return;
 if(!scoutAccount()){scoutData.local=scoutData.local.filter(o=>o.id!==id);scoutSave();scoutRerender();return}
 if(scoutData.pending.some(o=>o.id===id)){scoutData.pending=scoutData.pending.filter(o=>o.id!==id);scoutSave();scoutRerender();return}
 try{await scoutApi('observe&id='+encodeURIComponent(id),{method:'DELETE'});scoutData.pool.observations=scoutData.pool.observations.filter(o=>o.id!==id);scoutSave();scoutRerender()}catch(e){toast(e.message,true)}
}
async function scoutReadShot(file,kind='screenshot'){
 if(!file||scoutBusy)return;
 if(file.size>20000000){toast(scoutT('Ảnh tối đa 20 MB.','Image must be under 20 MB.'),true);return}
 if(!scoutOnline()||typeof loadOCR!=='function'){toast(scoutT('Đọc ảnh cần mạng lần đầu. Hãy dán chữ hoặc nhập tay.','Reading images needs a connection. Paste the text or enter it by hand.'),true);scoutConfirm(scoutNewDraft({source:'screenshot'}));return}
 scoutBusy=true;modal(scoutT('Đang đọc ảnh…','Reading screenshot…'),`<p id="scout-ocr-status" role="status" aria-live="polite">${scoutT('Đang tải bộ đọc chữ…','Loading text reader…')}</p><p class="hint">${scoutT('Ảnh được đọc ngay trên máy của bạn, không tải lên.','The image is read on your device and not uploaded.')}</p>`);
 let worker=null;
 try{await loadOCR();worker=await Tesseract.createWorker('eng',1,{logger:i=>{const el=document.getElementById('scout-ocr-status');if(el)el.textContent=`${i.status==='recognizing text'?scoutT('Đang đọc chữ','Reading text'):i.status} · ${Math.round((i.progress||0)*100)}%`}});const result=await worker.recognize(file);const text=result.data.text||'';const parsed=PS.parsePriceText(text,{catalog:scoutCatalog()});const draft=scoutFromParsed(parsed,'screenshot',text);draft.ocrPrice=parsed.price??null;draft.imageHash=await scoutHash(file);draft.capturedAt=new Date(file.lastModified||Date.now()).toISOString();if(kind==='shelf-photo'){draft.evidenceType='shelf-photo';draft.file=file;draft.capturedAt=new Date(Math.min(Date.now(),file.lastModified||Date.now())).toISOString()}scoutConfirm(draft)}
 catch(e){toast(scoutT('Không đọc được ảnh. Hãy dán chữ hoặc nhập tay.','Could not read the image. Paste the text or enter it by hand.'),true);scoutConfirm(scoutNewDraft({source:'screenshot'}))}
 finally{scoutBusy=false;if(worker)try{await worker.terminate()}catch{}}
}
// Only the SHA-256 of the image is kept (for future duplicate detection); the image itself is never stored or uploaded.
async function scoutHash(file){try{const d=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());return[...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,'0')).join('')}catch{return null}}
function scoutPasteSheet(){modal(scoutT('Dán chữ có giá','Paste price text'),`<form id="scout-paste-form"><p class="hint">${scoutT('Sao chép tên và giá từ app/website cửa hàng, tin nhắn hoặc catalogue rồi dán vào đây.','Copy the name and price from a store app/website, message or catalogue and paste it here.')}</p><label class="sr-only" for="scout-paste-text">${scoutT('Nội dung','Text')}</label><textarea class="input" id="scout-paste-text" name="text" rows="7" maxlength="20000" required placeholder="Finish Quantum 60 Pack  $24.99  $0.42 per wash"></textarea></form>`,`<button class="btn" data-action="close-modal">${scoutT('Hủy','Cancel')}</button><button class="btn primary" type="submit" form="scout-paste-form">${scoutT('Đọc giá','Read price')}</button>`)}
function scoutBookmarkSheet(){
 const code=PS.bookmarkletSource(location.origin);
 modal(scoutT('Nút “Lưu giá” trên trình duyệt','“Save price” browser button'),`<p>${scoutT('Nút này chạy trong trình duyệt của bạn khi bạn đang xem một trang sản phẩm (Woolworths, Coles, ALDI, Chemist Warehouse, Amazon). Nó đọc tên và giá trên trang đó rồi mở ứng dụng để bạn xác nhận. Ứng dụng không tự vào website cửa hàng.','This button runs in your own browser while you view a product page (Woolworths, Coles, ALDI, Chemist Warehouse, Amazon). It reads the name and price on that page, then opens the app so you can confirm. The app never visits store websites itself.')}</p>
 <p><a class="btn primary scout-bookmarklet" href="${esc(code)}" data-scout="bm-link" draggable="true">🔖 ${scoutT('Lưu giá','Save price')}</a> <span class="hint">${scoutT('Máy tính: kéo nút này lên thanh dấu trang.','Computer: drag this button to your bookmarks bar.')}</span></p>
 <div class="field"><label for="scout-bm-code">${scoutT('Mã nút (sao chép)','Button code (copy)')}</label><textarea class="input" id="scout-bm-code" rows="3" readonly>${esc(code)}</textarea><button class="btn" data-scout="bm-copy">📋 ${scoutT('Sao chép mã','Copy code')}</button></div>
 <details open><summary>📱 iPhone / iPad (Safari)</summary><ol><li>${scoutT('Bấm “Sao chép mã” ở trên.','Tap “Copy code” above.')}</li><li>${scoutT('Mở một trang bất kỳ, bấm nút Chia sẻ → “Thêm dấu trang”, đặt tên “Lưu giá”, Lưu.','Open any page, tap Share → “Add Bookmark”, name it “Save price”, Save.')}</li><li>${scoutT('Mở Dấu trang → Sửa → chọn “Lưu giá” → xóa địa chỉ cũ và dán mã vào ô địa chỉ → Xong.','Open Bookmarks → Edit → choose “Save price” → replace the address with the copied code → Done.')}</li><li>${scoutT('Khi xem sản phẩm: mở Dấu trang và bấm “Lưu giá”.','On a product page: open Bookmarks and tap “Save price”.')}</li></ol></details>
 <details><summary>🤖 Android (Chrome)</summary><ol><li>${scoutT('Bấm “Sao chép mã”. Bấm ⋮ → ☆ để tạo dấu trang cho trang hiện tại.','Tap “Copy code”. Tap ⋮ → ☆ to bookmark the current page.')}</li><li>${scoutT('Bấm “Sửa”, đặt tên “Luugia”, dán mã vào ô URL, lưu.','Tap “Edit”, name it “Luugia”, paste the code into the URL field, save.')}</li><li>${scoutT('Khi xem sản phẩm: gõ “Luugia” vào thanh địa chỉ và chọn dấu trang đó (không chọn kết quả tìm kiếm).','On a product page: type “Luugia” in the address bar and pick that bookmark (not a search result).')}</li></ol></details>
 <p class="hint">${scoutT('Một số trang có thể chặn nút này; khi đó hãy chụp màn hình giá.','Some pages may block this button; take a price screenshot instead.')}</p>`,`<button class="btn" data-action="close-modal">${scoutT('Đóng','Close')}</button>`,true)}
function scoutCatalogueSheet(){
 const today=PS.sydneyToday(),wed=PS.cycleId(today),end=PS.cycleEnd(today),aldi=PS.nextSpecialBuyDays(today);
 const link=(r,url)=>`<a class="btn full" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${PS.RETAILERS[r].icon} ${scoutRetailer(r)} ↗</a>`;
 modal(scoutT('Catalogue & deal tuần này','This week’s catalogues & deals'),`<p class="hint">${scoutT('Mở catalogue chính thức, thấy món cần mua đang giảm giá thì bấm “Thêm deal” và nhập giá kèm ngày kết thúc.','Open the official catalogue; when something you need is on special, tap “Add deal” and enter the price with its end date.')}</p>
 <div class="scout-links">${link('woolworths',PS.RETAILERS.woolworths.catalogue)}${link('coles',PS.RETAILERS.coles.catalogue)}${link('aldi',PS.RETAILERS.aldi.catalogue)}${link('chemist',PS.RETAILERS.chemist.catalogue)}${link('amazon',PS.RETAILERS.amazon.catalogue)}</div>
 <ul class="scout-cycle"><li>🟢🔴 Woolworths/Coles: ${scoutT('thứ Tư','Wed')} ${wed.slice(8)}/${wed.slice(5,7)} → ${scoutT('thứ Ba','Tue')} ${end.slice(8)}/${end.slice(5,7)}</li><li>🔷 ALDI Special Buys: ${aldi.map(d=>d.slice(8)+'/'+d.slice(5,7)).join(', ')} (${scoutT('thứ Tư & thứ Bảy','Wed & Sat')})</li></ul>`,`<button class="btn" data-action="close-modal">${scoutT('Đóng','Close')}</button><button class="btn primary" data-scout="deal">＋ ${scoutT('Thêm deal','Add deal')}</button>`)}
function scoutTray(){
 const r=scoutLast?.result;if(!r)return;document.querySelector('.scout-tray')?.remove();
 const rows=r.bulk.filter(b=>b.prices.amazon);
 const tray=document.createElement('div');tray.className='scout-tray';tray.setAttribute('role','dialog');tray.setAttribute('aria-modal','false');tray.setAttribute('aria-label',scoutT('Mua số lượng lớn','Bulk buy'));
 tray.innerHTML=`<div class="scout-tray-sheet"><header><h2>📦 Amazon AU · ${scoutT('giao tận nhà','home delivery')}</h2><button class="icon" data-scout="tray-close" aria-label="${esc(scoutT('Đóng','Close'))}">×</button></header><p class="hint">${scoutT('Đồ gia dụng mua nhiều thường rẻ hơn khi giao tận nhà. So theo đơn giá:','Bulk household items are often cheaper delivered. Compared by unit price:')}</p><ul>${rows.map(b=>{const item=scoutItem(b.itemId),best=Object.entries(b.prices).filter(([k])=>k!=='amazon').sort((x,y)=>(x[1].unitPrice??1e9)-(y[1].unitPrice??1e9))[0];return`<li><b>${esc(b.label)}</b><span>📦 ${b.prices.amazon.unitPrice!=null?scoutMoney(b.prices.amazon.unitPrice)+scoutBasisLabel(b.unitBasis):scoutMoney(b.prices.amazon.cost)}${best?` · ${scoutRetailer(best[0])} ${best[1].unitPrice!=null?scoutMoney(best[1].unitPrice)+scoutBasisLabel(b.unitBasis):scoutMoney(best[1].cost)}`:''}</span></li>`}).join('')||`<li>${scoutT('Chưa có giá Amazon cho món trong danh sách.','No Amazon prices for items on your list yet.')}</li>`}</ul><a class="btn primary full" href="${esc(PS.RETAILERS.amazon.catalogue)}" target="_blank" rel="noopener noreferrer">Amazon AU ↗</a></div>`;
 document.body.appendChild(tray);requestAnimationFrame(()=>tray.classList.add('open'));tray.querySelector('[data-scout="tray-close"]').focus();
}
function scoutCloseTray(){const t=document.querySelector('.scout-tray');if(!t)return;t.classList.remove('open');setTimeout(()=>t.remove(),matchMedia('(prefers-reduced-motion: reduce)').matches?0:220);document.querySelector('[data-scout="tray"]')?.focus()}

document.addEventListener('click',event=>{
 const b=event.target.closest('[data-scout]');if(!b)return;const action=b.dataset.scout;
 switch(action){
  case'toggle':scoutData.open=scoutData.open===false;scoutSave();scoutRerender();break;
  case'refresh':scoutRefresh();break;
  case'postcode':event.preventDefault();scoutData.state=null;scoutSave();scoutRerender();document.getElementById('scout-postcode')?.focus();break;
  case'shot':document.getElementById('scout-shot-input')?.click();break;
  case'paste':scoutPasteSheet();break;
  case'manual':scoutConfirm(scoutNewDraft());break;
  case'bookmark':scoutBookmarkSheet();break;
  case'bm-link':event.preventDefault();toast(scoutT('Kéo nút này lên thanh dấu trang, hoặc sao chép mã bên dưới.','Drag this button to your bookmarks bar, or copy the code below.'));break;
  case'bm-copy':{const t=document.getElementById('scout-bm-code');navigator.clipboard?.writeText(t.value).then(()=>toast(scoutT('Đã sao chép mã.','Code copied.')),()=>{t.select();toast(scoutT('Chọn và sao chép mã.','Select and copy the code.'))});break}
  case'catalogue':scoutCatalogueSheet();break;
  case'deal':scoutConfirm(scoutNewDraft({source:'catalogue',promo:'special',validUntil:PS.defaultDealEnd('woolworths')}));break;
  case'pick-item':{const f=document.getElementById('scout-obs-form');if(f){f.itemId.value=b.dataset.id;const item=scoutItem(b.dataset.id);if(item&&!f.unitBasis.value)f.unitBasis.value=item.unitBasis;scoutRecalc();document.querySelectorAll('[data-scout="pick-item"]').forEach(x=>x.classList.toggle('primary',x===b))}break}
  case'reparse':{const raw=document.getElementById('scout-raw')?.value||'';const parsed=PS.parsePriceText(raw,{catalog:scoutCatalog()});scoutConfirm(scoutFromParsed(parsed,scoutDraft?.source||'screenshot',raw));break}
  case'delete':scoutDelete(b.dataset.id);break;
  case'tray':scoutTray();break;
  case'tray-close':scoutCloseTray();break;
 }
});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&document.querySelector('.scout-tray'))scoutCloseTray()});
document.addEventListener('change',event=>{
 const t=event.target;
 if(t.id==='scout-shot-input'){const file=t.files?.[0];t.value='';scoutReadShot(file)}
 else if(t.id==='scout-shelf-input'){const file=t.files?.[0];t.value='';scoutReadShot(file,'shelf-photo')}
 else if(t.id==='scout-persona-select'){scoutData.personaOverride=t.value||null;scoutSave();scoutRerender()}
 else if(t.id==='scout-threshold'){scoutData.prefs.minSavings=+t.value;scoutSave();scoutRerender()}
 else if(t.id==='scout-item'){const item=scoutItem(t.value),f=t.form;if(item){if(!f.label.value)f.label.value=scoutItemName(item);f.unitBasis.value=item.unitBasis}scoutRecalc()}
 else if(t.id==='scout-retailer'){const f=t.form;if(f.promo.value&&!f.validUntil.value)f.validUntil.value=PS.defaultDealEnd(t.value)}
 else if(t.id==='scout-promo'){const f=t.form;if(t.value&&!f.validUntil.value)f.validUntil.value=PS.defaultDealEnd(f.retailer.value)}
});
document.addEventListener('input',event=>{const t=event.target;if(!t.closest?.('#scout-obs-form'))return;if(t.id==='scout-unit-price'){t.form.dataset.manualUnit=t.value?'yes':'';scoutSanity()}else if(['scout-price','scout-pack','scout-pack-unit','scout-units','scout-basis'].includes(t.id))scoutRecalc()});
document.addEventListener('submit',async event=>{
 const form=event.target;if(!['scout-postcode-form','scout-obs-form','scout-paste-form'].includes(form.id))return;event.preventDefault();
 if(form.id==='scout-postcode-form'){const pc=String(form.postcode.value||'').trim(),r=PS.postcodeState(pc);if(!r.valid){toast(scoutT('Postcode Úc gồm 4 chữ số.','An Australian postcode has 4 digits.'),true);return}scoutData.postcode=pc;scoutData.state=r.supported?r.state:null;scoutSave();scoutRerender();if(!r.supported)document.querySelector('.scout-unsupported')?.focus?.();return}
 if(form.id==='scout-paste-form'){const text=form.text.value.trim();if(!text)return;const parsed=PS.parsePriceText(text,{catalog:scoutCatalog()});scoutConfirm(scoutFromParsed(parsed,'manual',text));return}
 const o=scoutCollect(form);
 if(!PS.validObservation(o)){toast(scoutT('Kiểm tra tên, cửa hàng, giá và ngày.','Check the name, store, price and date.'),true);return}
 if(o.observedAt>PS.sydneyToday()){toast(scoutT('Ngày thấy giá không thể ở tương lai.','The date cannot be in the future.'),true);return}
 if(!scoutData.state){toast(scoutT('Nhập postcode trước.','Enter your postcode first.'),true);return}
 const share=scoutCommunityShareRequest(form,o,scoutDraft);if(share===false)return;
 const where=await scoutStore(o);closeModal();scoutDraft=null;
 toast(where==='local'?scoutT('Đã lưu giá trên thiết bị này.','Price saved on this device.'):where==='synced'?scoutT('Đã lưu và chia sẻ với gia đình.','Saved and shared with your family.'):scoutT('Đã lưu trên máy, sẽ đồng bộ khi có mạng.','Saved on this device; will sync when online.'));
 if(view==='shopping')scoutRerender();
 if(share)scoutCommunityStart(share);
});
addEventListener('online',()=>{if(scoutAccount()&&scoutData.pending.length)scoutFlush().then(()=>view==='shopping'&&scoutRerender()).catch(()=>{})});
// ---------- Community Price Pilot / Giá cộng đồng (feature-flagged; signed-in families only) ----------
// Off unless the owner turns on the pilot in Studio. Only shelf-tag photos and confirmed
// receipt lines can be shared, one observation at a time, opt-in (unchecked by default).
// Shared facts are anonymous ("Cộng đồng"). Community prices are hints, never guaranteed
// shelf prices; only CONFIRMED ones enter totals, after the family's own prices.
const COMMUNITY_API='/.netlify/functions/community';
let scoutCommunity={status:scoutData.communityStatus||null,loading:false,checkedAt:0,pending:null,held:null};
const scoutCommunityOn=()=>scoutAccount()&&scoutCommunity.status?.enabled===true&&scoutCommunity.status?.signedIn===true&&(scoutCommunity.status.states||[]).includes(scoutData.state);
const scoutCommunityEligible=()=>scoutCommunityOn()&&scoutCommunity.status.eligibility?.ok===true&&!scoutViewer();
async function communityApi(op,options={}){if(!scoutOnline())throw Error(scoutT('Đang offline.','Offline.'));const r=await fetch(COMMUNITY_API+'?op='+op,{credentials:'same-origin',cache:'no-store',...options,headers:{...(typeof options.body==='string'?{'Content-Type':'application/json'}:{}),...options.headers}});const data=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(Error((appLanguage==='en'?data.errorEn:data.error)||data.error||('HTTP '+r.status)),{status:r.status,code:data.code||null,data});return data}
async function scoutCommunityRefresh(){
 if(!scoutAccount()||!scoutOnline()||scoutCommunity.loading)return;
 scoutCommunity.loading=true;scoutCommunity.checkedAt=Date.now();
 try{const st=await communityApi('status');scoutCommunity.status=st;scoutData.communityStatus=st;
  if(st.enabled&&st.signedIn&&scoutData.state&&(st.states||[]).includes(scoutData.state)){const data=await communityApi('prices&state='+encodeURIComponent(scoutData.state));scoutData.community={at:Date.now(),state:data.state,items:data.items||[],shopPrices:data.shopPrices||[],householdId:globalThis.BEP_SESSION?.household?.id||null}}
  else scoutData.community=null;
  scoutSave();
 }finally{scoutCommunity.loading=false}
}
function scoutCommunityAutoload(){if(!scoutAccount()||!scoutOnline()||scoutCommunity.loading||scoutCommunity.checkedAt)return;scoutCommunityRefresh().then(()=>{if(view==='shopping')scoutRerender()}).catch(()=>{})}
// Cached community data ages while offline: re-check the 14-day window and deal end dates.
function scoutCommunityData(){const c=scoutData.community;if(!scoutCommunityOn()||!c||c.state!==scoutData.state||c.householdId&&c.householdId!==globalThis.BEP_SESSION?.household?.id)return null;const elapsed=Math.max(0,Math.floor((Date.now()-(c.at||0))/864e5)),today=PS.sydneyToday();
 const items=(c.items||[]).map(x=>{const age=(x.ageDays||0)+elapsed,live=x.validUntil?x.validUntil>=today:age<=21;return{...x,ageDays:age,faded:!x.validUntil&&age>14,usable:x.usable===true&&(x.validUntil?x.validUntil>=today:age<=14),live}}).filter(x=>x.live);
 const shopPrices=(c.shopPrices||[]).filter(p=>!p.expiresAt||Date.parse(p.expiresAt)>Date.now());
 return{...c,items,shopPrices,elapsed}}
function scoutCommunityPrefs(){const c=scoutCommunityData();if(!c)return{};const {confirmed,hints}=PS.communityObservations(c.items,{branches:scoutData.communityBranches||[]});return{community:confirmed,communityHints:hints,shopPrices:PS.shopObservations(c.shopPrices)}}
function scoutMixLabel(m){if(!m||!m.total||!scoutCommunityOn())return'';const parts=[];
 if(m.family)parts.push(scoutT(m.family+' giá của nhà mình',m.family+(m.family===1?' family price':' family prices')));
 if(m.official)parts.push(scoutT(m.official+' giá nguồn chính thức',m.official+' official'));
 if(m.community)parts.push(scoutT(m.community+' giá cộng đồng đã xác nhận',m.community+(m.community===1?' confirmed community price':' confirmed community prices')));
 if(m.shop)parts.push(scoutT(m.shop+' giá do tiệm đăng',m.shop+(m.shop===1?' shop-posted price':' shop-posted prices')));
 return`<p class="scout-mix">🧮 ${parts.join(' · ')}</p>`}
function scoutShelfButton(){return scoutCommunityOn()&&!scoutViewer()?`<button class="btn" data-community="shelf">📸 ${scoutT('Ảnh kệ giá ở cửa hàng','In-store shelf tag photo')}</button><input type="file" id="scout-shelf-input" accept="image/*" capture="environment" hidden>`:''}
function scoutIneligibleText(el){const r=el?.reasons||[];if(r.includes('disabled'))return scoutT('Tài khoản đang tạm khóa.','This account is disabled.');const parts=[];
 if(r.includes('account-too-new'))parts.push(scoutT(`tài khoản cần ít nhất 7 ngày (hiện ${el.accountDays??0} ngày)`,`the account must be at least 7 days old (now ${el.accountDays??0})`));
 if(r.includes('family-too-new'))parts.push(scoutT('gia đình cần ít nhất 7 ngày, hoặc tài khoản có email khôi phục đã xác minh','the family must be at least 7 days old, or the account needs a verified recovery email'));
 if(r.includes('no-family'))parts.push(scoutT('cần chọn một gia đình','a family must be selected'));
 return scoutT('Chưa chia sẻ với cộng đồng được: ','Community sharing is not available yet: ')+parts.join('; ')+'.'}
function scoutCommunityFieldset(d){if(!scoutCommunityOn()||scoutViewer())return'';
 if(d.evidenceType!=='shelf-photo')return`<p class="hint scout-community-note">👥 ${scoutT('Chỉ giá từ ảnh kệ giá chụp tại cửa hàng hoặc hóa đơn mới chia sẻ được với cộng đồng. Giá từ ảnh màn hình, website hay nút “Lưu giá” chỉ lưu trong gia đình.','Only prices from an in-store shelf-tag photo or a receipt can be shared with the community. Screenshot, website and “Save price” captures stay with your family.')}</p>`;
 const el=scoutCommunity.status?.eligibility;if(!el?.ok)return`<p class="hint scout-community-note" role="note">👥 ${esc(scoutIneligibleText(el))}</p>`;
 const b=scoutData.communityBranch||{};
 return`<fieldset class="scout-community-share"><legend>👥 ${scoutT('Giá cộng đồng (thử nghiệm)','Community prices (pilot)')}</legend><label class="scout-check" for="scout-share"><input type="checkbox" id="scout-share" name="communityShare"><span>${scoutT('Chia sẻ giá này với cộng đồng (ẩn danh)','Share this price with the community (anonymous)')}</span></label>
 <div class="scout-grid" id="scout-share-branch" hidden><div class="field"><label for="scout-share-suburb">${scoutT('Khu (suburb) của cửa hàng','Store suburb')}</label><input class="input" id="scout-share-suburb" name="shareSuburb" maxlength="40" autocomplete="off" value="${esc(b.suburb||'')}"></div><div class="field"><label for="scout-share-postcode">${scoutT('Postcode cửa hàng','Store postcode')}</label><input class="input" id="scout-share-postcode" name="sharePostcode" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" value="${esc(b.postcode||scoutData.postcode||'')}"></div></div>
 <p class="hint">${scoutT('Chỉ chia sẻ món, giá, quy cách, cửa hàng và chi nhánh, khuyến mãi, thời điểm chụp và dấu vân ảnh. Không bao giờ có tên bạn hay gia đình. Ảnh không gửi đi, trừ khi giá cần kiểm duyệt và bạn đồng ý.','Only the item, price, pack, store and branch, deal, capture time and a photo fingerprint are shared. Never your name or family. The photo is not sent unless the price needs review and you agree.')}</p></fieldset>`}
// Returns false to stop the save (invalid branch), null for family-only, or a share request.
function scoutCommunityShareRequest(form,o,draft){
 const box=form.querySelector('#scout-share');if(!box||!box.checked)return null;
 const suburb=String(form.shareSuburb?.value||'').trim(),postcode=String(form.sharePostcode?.value||'').trim(),pc=PS.postcodeState(postcode);
 if(!suburb||!pc.valid||!(scoutCommunity.status?.states||[]).includes(pc.state)){toast(scoutT('Nhập khu và postcode của cửa hàng (NSW/QLD) để chia sẻ.','Enter the store suburb and postcode (NSW/QLD) to share.'),true);form.shareSuburb?.focus();return false}
 if(!PS.canShareToCommunity(o)){toast(scoutT('Giá đọc từ ảnh khác giá đã nhập nên không chia sẻ được. Giá vẫn lưu cho gia đình.','The price read from the photo differs from the price entered, so it cannot be shared. It is still saved for your family.'),true);return null}
 scoutData.communityBranch={suburb,postcode};
 return{observation:scoutCommunityFacts(o),branch:{suburb,postcode},file:draft?.file||null};
}
// Only extracted price facts leave the device: never the recorder's name, notes or raw text.
function scoutCommunityFacts(o){const e=o.evidence||{};return{itemId:o.itemId,label:o.label,retailer:o.retailer,price:o.price,currency:'AUD',packQty:o.packQty??null,packUnit:o.packUnit??null,units:o.units??null,unitPrice:o.unitPrice??null,unitBasis:o.unitBasis??null,promo:o.promo||null,validUntil:o.validUntil||null,capturedAt:o.capturedAt||null,state:scoutData.state,evidence:{type:e.type,imageHash:e.imageHash||null,ocrPrice:e.ocrPrice??null,...(e.type==='receipt'?{receiptId:e.receiptId,lineId:e.lineId}:{})}}}
function scoutCommunityStart(share){if(!share)return;if(!scoutCommunityEligible()){toast(scoutIneligibleText(scoutCommunity.status?.eligibility),true);return}if(!scoutCommunity.status.termsAcceptedAt){scoutCommunity.pending=share;scoutTermsSheet();return}scoutContribute(share)}
function scoutTermsSheet(){
 modal(scoutT('Điều khoản chia sẻ giá cộng đồng','Community price sharing terms'),`<div class="scout-terms" id="scout-terms"><p class="hint">${scoutT('Bản nháp cho giai đoạn thử nghiệm.','Draft for the pilot.')}</p><ul>
 <li>${scoutT('Chỉ chia sẻ giá bạn thật sự thấy ở cửa hàng (ảnh kệ giá hoặc hóa đơn), đúng và còn hiệu lực.','Only share prices you actually saw in a store (shelf tag or receipt), accurate and current.')}</li>
 <li>${scoutT('Không đăng giá sai, giá bịa, hoặc giá để quảng cáo cho cửa hàng của mình hay hạ uy tín cửa hàng khác.','Do not post false or made-up prices, or prices meant to promote your own shop or harm another store.')}</li>
 <li>${scoutT('Chỉ dữ kiện giá được chia sẻ ẩn danh. Tên bạn và gia đình không bao giờ hiển thị; mọi người chỉ thấy “Cộng đồng”.','Only price facts are shared, anonymously. Your name and family are never shown; others only see “Community”.')}</li>
 <li>${scoutT('Giá có thể được kiểm duyệt. Nếu cần, bạn có thể chọn gửi ảnh; ảnh được xóa sau khi duyệt hoặc sau 14 ngày.','Prices may be moderated. If needed you may choose to send the photo; it is deleted after review or within 14 days.')}</li>
 <li>${scoutT('Giá có thể bị ẩn hoặc gỡ, và tài khoản đăng giá sai có thể bị giới hạn.','Prices may be hidden or removed, and accounts that post false prices may be limited.')}</li>
 <li>${scoutT('Giá cộng đồng chỉ để tham khảo, không phải giá niêm yết đảm bảo. Bạn có thể ngừng chia sẻ bất cứ lúc nào và nhờ hỗ trợ gỡ giá đã chia sẻ.','Community prices are a guide, not guaranteed shelf prices. You can stop sharing at any time and ask support to remove prices you shared.')}</li></ul></div>`,
 `<button class="btn" data-community="terms-decline">${scoutT('Không chia sẻ','Don’t share')}</button><button class="btn primary" data-community="terms-accept">✓ ${scoutT('Đồng ý & chia sẻ','Agree & share')}</button>`,true)}
async function scoutContribute(share){
 try{const r=await communityApi('contribute',{method:'POST',body:JSON.stringify({consent:true,observation:share.observation,branch:share.branch})});scoutSave();
  if(r.status==='held'){if(r.photoRequested&&share.file){scoutCommunity.held={id:r.id,state:share.observation.state,itemId:share.observation.itemId,file:share.file};scoutHeldSheet()}else toast(scoutT('Giá đã gửi và cần kiểm duyệt trước khi hiện cho cộng đồng.','Sent; the price needs review before the community sees it.'))}
  else toast(r.group?.status==='confirmed'?scoutT('Đã chia sẻ ẩn danh — giá đã được xác nhận.','Shared anonymously — the price is confirmed.'):scoutT('Đã chia sẻ ẩn danh. Giá hiện “Chờ xác nhận” tới khi một gia đình khác báo cùng giá.','Shared anonymously. It shows “Awaiting confirmation” until another family reports the same price.'));
  await scoutCommunityRefresh().catch(()=>{});if(view==='shopping')scoutRerender();
 }catch(e){toast(e.message,true)}
}
function scoutHeldSheet(){modal(scoutT('Giá cần kiểm duyệt','This price needs review'),`<p>${scoutT('Giá này khác nhiều so với giá thường gặp nên người kiểm duyệt cần xem trước khi hiện cho cộng đồng.','This price is far from the usual price, so a moderator will check it before the community sees it.')}</p><p>${scoutT('Gửi ảnh kệ giá để kiểm duyệt nhanh hơn? Ảnh chỉ người kiểm duyệt xem, không hiển thị công khai, và tự xóa sau khi duyệt hoặc sau 14 ngày.','Send the shelf photo to speed up the review? Only moderators see it, it is never shown publicly, and it is deleted after review or within 14 days.')}</p>`,`<button class="btn" data-community="photo-skip">${scoutT('Không gửi ảnh','Don’t send')}</button><button class="btn primary" data-community="photo-send">📤 ${scoutT('Gửi ảnh để duyệt','Send photo for review')}</button>`)}
async function scoutSendHeldPhoto(){const h=scoutCommunity.held;scoutCommunity.held=null;closeModal();if(!h)return;if(h.file.size>5_500_000){toast(scoutT('Ảnh quá lớn để gửi (tối đa 5,5 MB). Giá vẫn chờ kiểm duyệt.','The photo is too large to send (max 5.5 MB). The price still awaits review.'),true);return}
 try{await communityApi(`photo&id=${encodeURIComponent(h.id)}&state=${encodeURIComponent(h.state)}&item=${encodeURIComponent(h.itemId)}`,{method:'POST',body:h.file,headers:{'Content-Type':'application/octet-stream'}});toast(scoutT('Đã gửi ảnh để kiểm duyệt.','Photo sent for review.'))}catch(e){toast(e.message,true)}}
function scoutCommunityCanShare(o){if(!scoutCommunityEligible()||o.source!=='receipt'||!o.itemId||!o.evidence?.receiptId||!o.evidence?.lineId)return false;return PS.dayDiff(PS.sydneyToday(),o.observedAt)<=7}
function scoutReceiptShareSheet(id){const o=scoutObservations().find(x=>x.id===id);if(!o||!scoutCommunityCanShare(o))return;scoutCommunity.receipt=o;const b=scoutData.communityBranch||{};
 modal(scoutT('Chia sẻ giá từ hóa đơn','Share a receipt price'),`<form id="scout-share-receipt-form" class="scout-form"><p><b>${esc(o.label)}</b> · ${scoutRetailer(o.retailer)} · ${scoutMoney(o.price)}${o.unitPrice!=null?` · ${scoutMoney(o.unitPrice)}${scoutBasisLabel(o.unitBasis)}`:''}</p><p class="hint">${scoutT('Từ dòng hóa đơn đã xác nhận ngày ','From a confirmed receipt line on ')}${esc(o.observedAt)}.</p>
 <label class="scout-check" for="scout-share-r"><input type="checkbox" id="scout-share-r" name="consent"><span>${scoutT('Chia sẻ giá này với cộng đồng (ẩn danh)','Share this price with the community (anonymous)')}</span></label>
 <div class="scout-grid"><div class="field"><label for="scout-share-r-suburb">${scoutT('Khu (suburb) của cửa hàng','Store suburb')}</label><input class="input" id="scout-share-r-suburb" name="suburb" maxlength="40" required value="${esc(b.suburb||'')}"></div><div class="field"><label for="scout-share-r-postcode">${scoutT('Postcode cửa hàng','Store postcode')}</label><input class="input" id="scout-share-r-postcode" name="postcode" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" required value="${esc(b.postcode||scoutData.postcode||'')}"></div></div>
 <p class="hint">${scoutT('Chỉ chia sẻ món, giá, quy cách, cửa hàng, chi nhánh và ngày. Không gửi ảnh hóa đơn, tên cửa hàng ghi trên hóa đơn hay các dòng khác.','Only the item, price, pack, store, branch and date are shared. The receipt photo, other lines and notes are never sent.')}</p></form>`,`<button class="btn" data-action="close-modal">${scoutT('Hủy','Cancel')}</button><button class="btn primary" type="submit" form="scout-share-receipt-form">👥 ${scoutT('Chia sẻ','Share')}</button>`)}
function scoutAgeText(n){return n===0?scoutT('hôm nay','today'):n===1?scoutT('hôm qua','yesterday'):scoutT(n+' ngày trước',n+' days ago')}
function scoutCommunityRow(x){const ok=x.status==='confirmed',item=scoutItem(x.itemId),name=item?scoutItemName(item):x.label;
 return`<li class="scout-cp ${x.faded?'faded':''}"><div class="scout-cp-main"><b>${esc(name)}</b><small>${PS.RETAILERS[x.retailer]?.icon||'🏪'} ${scoutRetailer(x.retailer)} · ${esc(x.branchLabel||'')}</small></div>
 <div class="scout-cp-price"><strong>${scoutMoney(x.price)}</strong>${x.unitPrice!=null?`<small>${scoutMoney(x.unitPrice)}${scoutBasisLabel(x.unitBasis)}</small>`:''}${x.promo?`<small>${scoutPromoLabel(x.promo)}${x.validUntil?' · '+scoutT('đến ','until ')+x.validUntil.slice(8)+'/'+x.validUntil.slice(5,7):''}</small>`:''}</div>
 <div class="scout-cp-meta"><span class="scout-status ${ok?'ok':'wait'}">${ok?'✓ '+scoutT('Đã xác nhận','Confirmed'):'⏳ '+scoutT('Chờ xác nhận','Awaiting confirmation')}</span><small><span aria-hidden="true">${(x.sources||[]).map(scoutSourceIcon).join(' ')}</span> ${scoutT(x.families+' gia đình xác nhận',x.families+(x.families===1?' family confirmed':' families confirmed'))} · ${scoutAgeText(x.ageDays||0)}${x.faded?' · '+scoutT('cũ, không tính vào tổng','older, not in totals'):''}${ok?'':' · '+scoutT('chỉ tham khảo','hint only')}</small>
 <button class="btn soft scout-report" data-community="report" data-group="${esc(x.groupId)}" data-item="${esc(x.itemId)}">⚑ ${scoutT('Báo giá sai','Report wrong price')}<span class="sr-only"> ${esc(name)}</span></button></div></li>`}
function scoutShopRow(p){const item=scoutItem(p.itemId),name=item?scoutItemName(item):p.label;
 return`<li class="scout-cp scout-shop"><div class="scout-cp-main"><b>${esc(name)}</b><small>🏪 ${scoutT('Giá do tiệm đăng','Shop-posted price')} · ${esc(p.shop?.name||'')}, ${esc(p.shop?.suburb||'')}</small></div><div class="scout-cp-price"><strong>${scoutMoney(p.price)}</strong>${p.unitPrice!=null?`<small>${scoutMoney(p.unitPrice)}${scoutBasisLabel(p.unitBasis)}</small>`:''}</div>
 <div class="scout-cp-meta"><span class="scout-status shop">${scoutT('Tiệm tự đăng, chưa kiểm chứng','Posted by the shop, not verified')}</span><small>${scoutT('đăng ','posted ')}${scoutAgeText(Math.max(0,PS.dayDiff(PS.sydneyToday(),p.observedAt)))}</small><button class="btn soft scout-report" data-community="report" data-shop="${esc(p.shop?.id||'')}" data-price="${esc(p.id)}">⚑ ${scoutT('Báo giá sai','Report wrong price')}<span class="sr-only"> ${esc(name)}</span></button></div></li>`}
function scoutShopLinks(){if(scoutViewer())return'';const shop=scoutCommunity.status?.shop;
 if(shop?.status==='approved')return`<button class="btn" data-community="shop-post">🏪 ${scoutT('Đăng giá của tiệm','Post your shop’s prices')}</button>`;
 if(shop?.status==='pending')return`<p class="hint">🏪 ${scoutT('Đơn đăng ký tiệm đang chờ duyệt.','Your shop application is awaiting review.')}</p>`;
 return`<button class="btn soft" data-community="shop-apply">🏪 ${scoutT('Bạn là tiệm Chợ Việt? Đăng ký đăng giá','Run a Vietnamese grocer? Apply to post prices')}</button>`}
function scoutCommunityCard(r){if(!scoutCommunityOn())return'';const c=scoutCommunityData();
 const head=`<h3>👥 ${scoutT('Giá cộng đồng','Community prices')} <span class="pill scout-pilot">${scoutT('Thử nghiệm','Pilot')}</span></h3><p class="hint">${scoutT('Do các gia đình khác báo lại từ ảnh kệ giá hoặc hóa đơn. Không phải giá niêm yết đảm bảo — giá ở cửa hàng có thể khác.','Reported by other families from shelf-tag photos or receipts. Not guaranteed shelf prices — the store price may differ.')}</p>`;
 const el=scoutCommunity.status?.eligibility,gate=el&&!el.ok?`<p class="hint">${esc(scoutIneligibleText(el))}</p>`:'';
 if(!c)return`<article class="scout-card scout-community">${head}<p>${scoutT('Bấm “Làm mới giá” để tải giá cộng đồng.','Tap “Refresh prices” to load community prices.')}</p>${gate}${scoutShopLinks()}</article>`;
 const ids=new Set((scoutLast?.items||[]).map(i=>i.itemId).filter(Boolean)),mine=c.items.filter(x=>ids.has(x.itemId)),shops=c.shopPrices.filter(x=>ids.has(x.itemId));
 const rows=(mine.length?mine:c.items.slice().sort((a,b)=>(a.ageDays||0)-(b.ageDays||0)).slice(0,8)).slice(0,14),shopRows=(shops.length?shops:c.shopPrices.slice(0,4)).slice(0,6);
 const branches=[...new Map(c.items.map(x=>[x.branchId,x])).values()].slice(0,30);
 return`<article class="scout-card scout-community">${head}${c.elapsed?`<p class="hint">⚪ ${scoutT('Bản lưu ','Saved copy from ')}${scoutAgeText(c.elapsed)}</p>`:''}
 ${rows.length?`<p class="hint">${mine.length?scoutT('Món trong danh sách đi chợ:','Items on your shopping list:'):scoutT('Mới nhất trong bang:','Latest in your state:')}</p><ul class="scout-cp-list">${rows.map(scoutCommunityRow).join('')}</ul>`:`<p>${scoutT('Chưa có giá cộng đồng nào ở bang của bạn.','No community prices in your state yet.')}</p>`}
 ${shopRows.length?`<ul class="scout-cp-list">${shopRows.map(scoutShopRow).join('')}</ul>`:''}
 ${branches.length?`<details class="scout-branches"><summary>📍 ${scoutT('Chi nhánh tôi hay đi','Branches I shop at')} (${(scoutData.communityBranches||[]).length||scoutT('tất cả','all')})</summary><form id="scout-branch-form"><p class="hint">${scoutT('Chọn chi nhánh để chỉ dùng giá cộng đồng của các chi nhánh đó khi tính tổng. Không chọn = mọi chi nhánh trong bang.','Pick branches to only use their community prices in totals. None = every branch in your state.')}</p>${branches.map(x=>`<label class="scout-check"><input type="checkbox" name="branch" value="${esc(x.branchId)}" ${(scoutData.communityBranches||[]).includes(x.branchId)?'checked':''}><span>${PS.RETAILERS[x.retailer]?.icon||''} ${scoutRetailer(x.retailer)} · ${esc(x.branchLabel||'')}</span></label>`).join('')}<button class="btn">${scoutT('Lưu chi nhánh','Save branches')}</button></form></details>`:''}
 ${gate}${scoutShopLinks()}</article>`}
function scoutReportSheet(b){const shop=b.dataset.shop||'';
 modal(scoutT('Báo giá sai','Report wrong price'),`<form id="scout-report-form" class="scout-form"><input type="hidden" name="group" value="${esc(b.dataset.group||'')}"><input type="hidden" name="item" value="${esc(b.dataset.item||'')}"><input type="hidden" name="shop" value="${esc(shop)}"><input type="hidden" name="price" value="${esc(b.dataset.price||'')}">
 <div class="field"><label for="scout-report-reason">${scoutT('Lý do','Reason')}</label><select class="input" id="scout-report-reason" name="reason" required>${[['wrong-price',scoutT('Giá ở cửa hàng khác','The shelf price is different')],['expired',scoutT('Khuyến mãi đã hết / giá cũ','Deal ended / price is old')],['wrong-item',scoutT('Sai món hoặc quy cách','Wrong item or pack size')],['wrong-store',scoutT('Sai cửa hàng hoặc chi nhánh','Wrong store or branch')],['offensive',scoutT('Nội dung không phù hợp','Inappropriate content')],['other',scoutT('Lý do khác','Other')]].map(([v,l])=>`<option value="${v}">${esc(l)}</option>`).join('')}</select></div>
 <div class="field"><label for="scout-report-note">${scoutT('Ghi chú (không bắt buộc)','Note (optional)')}</label><textarea class="input" id="scout-report-note" name="note" rows="3" maxlength="300" placeholder="${esc(scoutT('Ví dụ: kệ ghi $16.00 ngày 2/11','e.g. shelf says $16.00 on 2 Nov'))}"></textarea></div>
 <p class="hint">${scoutT('Báo cáo được gửi tới người kiểm duyệt. Tên bạn không hiện cho ai khác.','Reports go to the moderators. Your name is not shown to anyone else.')}</p></form>`,`<button class="btn" data-action="close-modal">${scoutT('Hủy','Cancel')}</button><button class="btn primary" type="submit" form="scout-report-form">⚑ ${scoutT('Gửi báo cáo','Send report')}</button>`)}
function scoutShopApplySheet(){modal(scoutT('Đăng ký đăng giá cho tiệm','Apply to post shop prices'),`<form id="scout-shop-apply-form" class="scout-form"><p class="hint">${scoutT('Dành cho chợ Việt và tiệm địa phương. Giá tiệm đăng được ghi rõ “Giá do tiệm đăng”, tách riêng khỏi giá cộng đồng và hết hạn sau 14 ngày.','For Vietnamese grocers and local shops. Shop prices are labelled “Shop-posted price”, kept separate from community prices and expire after 14 days.')}</p>
 <div class="field"><label for="scout-shop-name">${scoutT('Tên tiệm','Shop name')}</label><input class="input" id="scout-shop-name" name="shopName" maxlength="80" required></div>
 <div class="field"><label for="scout-shop-abn">ABN</label><input class="input" id="scout-shop-abn" name="abn" inputmode="numeric" maxlength="14" placeholder="12 345 678 901"></div>
 <div class="scout-grid"><div class="field"><label for="scout-shop-suburb">${scoutT('Khu (suburb)','Suburb')}</label><input class="input" id="scout-shop-suburb" name="suburb" maxlength="40" required></div><div class="field"><label for="scout-shop-postcode">Postcode</label><input class="input" id="scout-shop-postcode" name="postcode" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" required></div></div>
 <p class="hint">${scoutT('Chủ ứng dụng sẽ xem và duyệt đơn.','The app owner reviews each application.')}</p></form>`,`<button class="btn" data-action="close-modal">${scoutT('Hủy','Cancel')}</button><button class="btn primary" type="submit" form="scout-shop-apply-form">${scoutT('Gửi đơn','Apply')}</button>`)}
function scoutShopPriceSheet(){const cat=scoutCatalog(),opt=(v,l)=>`<option value="${esc(v)}">${esc(l)}</option>`;
 modal(scoutT('Đăng giá của tiệm','Post a shop price'),`<form id="scout-shop-price-form" class="scout-form"><div class="field"><label for="scout-sp-item">${scoutT('Món','Item')}</label><select class="input" id="scout-sp-item" name="itemId" required><option value="">—</option>${PS.CATEGORIES.map(c=>`<optgroup label="${esc(c)}">${cat.filter(i=>i.category===c).map(i=>opt(i.id,scoutItemName(i))).join('')}</optgroup>`).join('')}</select></div>
 <div class="field"><label for="scout-sp-label">${scoutT('Tên trên bảng giá','Name on the price board')}</label><input class="input" id="scout-sp-label" name="label" maxlength="120"></div>
 <div class="scout-grid"><div class="field"><label for="scout-sp-price">${scoutT('Giá (AUD)','Price (AUD)')}</label><input class="input" id="scout-sp-price" name="price" type="number" inputmode="decimal" step="0.01" min="0.01" max="10000" required></div><div class="field"><label for="scout-sp-until">${scoutT('Đến ngày (không bắt buộc)','Until (optional)')}</label><input class="input" id="scout-sp-until" name="validUntil" type="date" min="${PS.sydneyToday()}"></div></div>
 <div class="scout-grid"><div class="field"><label for="scout-sp-unit">${scoutT('Đơn giá','Unit price')}</label><input class="input" id="scout-sp-unit" name="unitPrice" type="number" inputmode="decimal" step="0.01" min="0"></div><div class="field"><label for="scout-sp-basis">${scoutT('Tính theo','Per')}</label><select class="input" id="scout-sp-basis" name="unitBasis">${opt('','—')}${Object.keys(PS.BASIS).map(b=>opt(b,scoutBasisLabel(b))).join('')}</select></div></div>
 <p class="hint">${scoutT('Giá hiện với nhãn “Giá do tiệm đăng” và tự hết hạn sau 14 ngày.','Shown as “Shop-posted price” and expires automatically after 14 days.')}</p></form>`,`<button class="btn" data-action="close-modal">${scoutT('Hủy','Cancel')}</button><button class="btn primary" type="submit" form="scout-shop-price-form">${scoutT('Đăng giá','Post price')}</button>`)}
document.addEventListener('click',async event=>{
 const b=event.target.closest('[data-community]');if(!b)return;const a=b.dataset.community;
 if(a==='shelf'){document.getElementById('scout-shelf-input')?.click();return}
 if(a==='share'){scoutReceiptShareSheet(b.dataset.id);return}
 if(a==='report'){scoutReportSheet(b);return}
 if(a==='shop-apply'){scoutShopApplySheet();return}
 if(a==='shop-post'){scoutShopPriceSheet();return}
 if(a==='terms-decline'){scoutCommunity.pending=null;closeModal();toast(scoutT('Không chia sẻ. Giá vẫn lưu cho gia đình.','Not shared. The price is still saved for your family.'));return}
 if(a==='terms-accept'){b.disabled=true;try{const r=await communityApi('accept-terms',{method:'POST',body:JSON.stringify({accept:true,version:scoutCommunity.status?.termsVersion})});scoutCommunity.status={...scoutCommunity.status,termsAcceptedAt:r.termsAcceptedAt};scoutData.communityStatus=scoutCommunity.status;scoutSave();closeModal();const p=scoutCommunity.pending;scoutCommunity.pending=null;if(p)await scoutContribute(p)}catch(e){b.disabled=false;toast(e.message,true)}return}
 if(a==='photo-send'){scoutSendHeldPhoto();return}
 if(a==='photo-skip'){scoutCommunity.held=null;closeModal();toast(scoutT('Giá đang chờ kiểm duyệt.','The price awaits review.'));return}
});
document.addEventListener('change',event=>{const t=event.target;if(t.id==='scout-share'){const box=document.getElementById('scout-share-branch');if(box)box.hidden=!t.checked;if(t.checked)document.getElementById('scout-share-suburb')?.focus()}});
document.addEventListener('submit',async event=>{
 const form=event.target;if(!['scout-share-receipt-form','scout-report-form','scout-shop-apply-form','scout-shop-price-form','scout-branch-form'].includes(form.id))return;event.preventDefault();
 const v=Object.fromEntries(new FormData(form)),submit=document.querySelector(`[form="${form.id}"]`);
 if(form.id==='scout-branch-form'){scoutData.communityBranches=new FormData(form).getAll('branch').map(String).slice(0,20);scoutSave();toast(scoutT('Đã lưu chi nhánh.','Branches saved.'));scoutRerender();return}
 if(submit)submit.disabled=true;
 try{
  if(form.id==='scout-share-receipt-form'){if(!form.consent.checked){toast(scoutT('Đánh dấu “Chia sẻ giá này với cộng đồng” để gửi.','Tick “Share this price with the community” to send.'),true);return}const pc=PS.postcodeState(v.postcode);if(!String(v.suburb||'').trim()||!pc.valid){toast(scoutT('Nhập khu và postcode của cửa hàng.','Enter the store suburb and postcode.'),true);return}const o=scoutCommunity.receipt;closeModal();scoutData.communityBranch={suburb:String(v.suburb).trim(),postcode:String(v.postcode).trim()};scoutCommunityStart({observation:scoutCommunityFacts({...o,capturedAt:o.capturedAt||new Date(o.observedAt+'T12:00:00+10:00').toISOString()}),branch:scoutData.communityBranch,file:null});return}
  if(form.id==='scout-report-form'){const body=v.shop?{shop:v.shop,priceId:v.price,reason:v.reason,note:v.note}:{state:scoutData.state,itemId:v.item,groupId:v.group,reason:v.reason,note:v.note};const r=await communityApi('report',{method:'POST',body:JSON.stringify(body)});closeModal();toast(r.already?scoutT('Gia đình bạn đã báo giá này rồi.','Your family already reported this price.'):scoutT('Cảm ơn! Báo cáo đã gửi tới người kiểm duyệt.','Thanks! The report was sent to the moderators.'));return}
  if(form.id==='scout-shop-apply-form'){await communityApi('shop-apply',{method:'POST',body:JSON.stringify({shopName:v.shopName,abn:v.abn,suburb:v.suburb,postcode:v.postcode})});closeModal();toast(scoutT('Đã gửi đơn. Chủ ứng dụng sẽ duyệt.','Application sent for review.'));await scoutCommunityRefresh().catch(()=>{});scoutRerender();return}
  if(form.id==='scout-shop-price-form'){const n=x=>x===''||x==null?null:+x;await communityApi('shop-price',{method:'POST',body:JSON.stringify({price:{itemId:v.itemId,label:v.label,price:n(v.price),unitPrice:v.unitBasis?n(v.unitPrice):null,unitBasis:v.unitBasis||null,validUntil:v.validUntil||null}})});closeModal();toast(scoutT('Đã đăng giá của tiệm.','Shop price posted.'));await scoutCommunityRefresh().catch(()=>{});scoutRerender();return}
 }catch(e){toast(e.message,true)}finally{if(submit)submit.disabled=false}
});
// Bookmark landing: /?price-capture=<json>. Show the confirm sheet; never auto-save.
(function scoutCaptureLanding(){
 try{const params=new URLSearchParams(location.search),raw=params.get('price-capture');if(!raw)return;params.delete('price-capture');history.replaceState(null,'',location.pathname+(params.toString()?'?'+params:'')+'#shopping');
  const draft=raw.length<=20000?PS.captureToDraft(raw,scoutCatalog()):null;if(!draft){toast(scoutT('Không đọc được giá từ nút “Lưu giá”.','Could not read the price from the “Save price” button.'),true);return}
  if(view!=='shopping'){view='shopping';render()}
  setTimeout(()=>{if(scoutViewer()){toast(scoutT('Tài khoản chỉ xem không thêm được giá.','View-only accounts cannot add prices.'),true);return}scoutConfirm(scoutFromParsed(draft,'bookmark',[draft.label,draft.url].filter(Boolean).join('\n')))},50)}catch(e){console.warn('Price Scout capture',e)}
})();
if(view==='shopping')scoutMount();
