'use strict';
// v1.7.21 (Henry, 14 Nov 2026, Sydney time: phone screenshots of the shopping list, pop-up answers in docs/memory/decisions.md).
// Shared helpers for the shopping list rows, used by app.ts (renderShopping, textShopping, the “Mua thêm” form), push-ui.ts
// (“Nhờ mua thêm”), shopping-planning.ts (store sheets) and qty-round.ts (the amount steppers):
//  - Extras aisle: an extra (Mua thêm, Nhờ mua thêm, voice, notes, products) goes into an aisle of the list. The family's own
//    choice (extra.aisle, also remembered for the same name on this device) wins; else the aisle of a matched ingredient;
//    else word rules on the name; else “Khác” / “Other”. The guess is shown in the add and edit forms and can be changed
//    there (rule 32: shown, never hidden); only a choice the family made is stored.
//  - Prices: an extra whose price is not known (costUnknown, costKnown:false, or an old item saved as 0) shows “Chưa rõ giá”
//    and is left out of totals, never “$0.00” (rule 32, audit C12 family).
//  - Quick view per category: one short line per item (tick · name · amount), remembered on this device.
//  - Usual-shop chips: the 4 most used first (plus the chosen one), “Xem thêm (n)” and a search field for the rest.
const slT=(vi:string,en:string)=>typeof tr==='function'?tr(vi,en):vi;
const SHOP_AISLES=['meat','veg','dry','other','misc'];
/** The aisle's name in the app language (GROUPS keeps the Vietnamese names; misc is the “cannot tell” aisle). */
function shopAisleName(key:string){if(key==='misc')return slT('Khác','Other');const g=(GROUPS as any)[key];if(!g)return slT('Khác','Other');return typeof englishUI==='function'&&typeof appLanguage!=='undefined'&&appLanguage==='en'?englishUI(g[1]):g[1]}
// Word rules, in order (the first that matches wins). Multi-word household and sauce names come before the single words that
// they contain (bột giặt before bột, fish sauce before fish, kem đánh răng before kem).
const SHOP_AISLE_WORDS:[RegExp,string][]=[
 [/(bột giặt|nước giặt|nước xả|nước rửa|kem đánh răng|bàn chải|dầu gội|sữa tắm|giấy|khăn|xà phòng|xà bông|đèn|nến|bóng đèn|nhang|pin |pin$|túi rác|màng bọc|giấy bạc|candle|paper|tissue|towel|soap|detergent|dishwash|shampoo|toothpaste|toothbrush|battery|batteries|foil|cling wrap|bin bag|light bulb|incense|sponge|bleach)/,'other'],
 [/(^|\s)(bánh|bread|cake|bun|buns|biscuit|biscuits|cookie|cookies|pastry|croissant|muffin|baguette)(\s|$)/,'dry'],
 [/(nước mắm|nước tương|xì dầu|dầu hào|tương ớt|fish sauce|soy sauce|oyster sauce|chilli sauce|chili sauce|ketchup|mayonnaise|sauce)/,'dry'],
 [/(^|\s)(thịt|cá|tôm|mực|cua|ghẹ|sò|nghêu|hến|gà|vịt|bò|heo|lợn|sườn|chả|giò|xúc xích|lạp xưởng|meat|beef|pork|chicken|fish|prawn|prawns|shrimp|salmon|tuna|lamb|sausage|sausages|ham|steak|duck|crab|squid|mince|bacon|seafood)(\s|$)/,'meat'],
 [/(^|\s)(rau|củ|quả|trái cây|trái|nấm|hành|tỏi|gừng|sả|ớt|khoai|cà chua|cà rốt|dưa|chanh|táo|cam|chuối|xoài|nho|lê|đào|bơ trái|fruit|fruits|vegetable|vegetables|veg|veggies|salad|herbs|herb|mushroom|mushrooms|onion|onions|garlic|ginger|potato|potatoes|tomato|tomatoes|carrot|carrots|lemon|lemons|lime|limes|apple|apples|banana|bananas|orange|oranges|mango|mangoes|grape|grapes|berries|strawberries|avocado|cucumber|lettuce|spinach|coriander|basil)(\s|$)/,'veg'],
 [/(^|\s)(sữa|trứng|phô mai|sữa chua|bơ|kem|milk|egg|eggs|cheese|yogurt|yoghurt|butter|cream)(\s|$)/,'dry'],
 [/(^|\s)(gạo|mì|miến|bún|phở|bột|đường|muối|tiêu|dầu ăn|giấm|hạt|đậu|ngũ cốc|trà|cà phê|kẹo|snack|rice|noodle|noodles|pasta|flour|sugar|salt|pepper|oil|vinegar|nuts|beans|cereal|oats|tea|coffee|candy|chips)(\s|$)/,'dry'],
 [/(^|\s)(túi|bao|ly|cốc|chén|đĩa|đũa|muỗng|bag|bags|cup|cups|plate|plates|chopsticks|bowl|bowls)(\s|$)/,'other'],
];
/** What the app can tell from the name alone: {key, how:'ingredient'|'words'|'none'}. */
function guessExtraAisle(name:string,ingredient?:string|null){
 const ing=ingredient&&typeof INGREDIENTS!=='undefined'&&INGREDIENTS[ingredient]?ingredient:(typeof unitMatchIngredient==='function'?unitMatchIngredient(name):null);
 if(ing&&INGREDIENTS[ing]&&SHOP_AISLES.includes(INGREDIENTS[ing][2]))return{key:INGREDIENTS[ing][2],how:'ingredient'};
 const n=String(name||'').normalize('NFC').toLocaleLowerCase('vi').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
 if(n)for(const[re,key]of SHOP_AISLE_WORDS)if(re.test(n))return{key,how:'words'};
 return{key:'misc',how:'none'}}
function shopAisleMapRead(){try{const m=JSON.parse(familyStorage.getItem('bep-extra-aisle-map')||'{}');return m&&typeof m==='object'&&!Array.isArray(m)?m:{}}catch{return{}}}
function rememberExtraAisle(name:string,key:string){if(!name||!SHOP_AISLES.includes(key))return;try{const m=shopAisleMapRead();m[normalizeText(name)]=key;familyStorage.setItem('bep-extra-aisle-map',JSON.stringify(m))}catch{}}
function rememberedExtraAisle(name:string){if(!name)return '';const k=shopAisleMapRead()[normalizeText(name)];return SHOP_AISLES.includes(k)?k:''}
/** The aisle an extra is listed under, and whether the family chose it. */
function extraAisleInfo(e:any){if(e&&SHOP_AISLES.includes(e.aisle))return{key:e.aisle,how:'chosen'};const r=rememberedExtraAisle(e?.name);if(r)return{key:r,how:'remembered'};return guessExtraAisle(e?.name,e?.ingredient)}
function extraAisle(e:any){return extraAisleInfo(e).key}
/** An extra's price is known only when the family or a product gave one; an old item saved as 0 is “not known” too. */
function extraCostKnown(e:any){return !!e&&!e.costUnknown&&e.costKnown!==false&&Number.isFinite(+e.cost)&&+e.cost>0}

// ── Aisle choice in the add / edit forms (“Mua thêm”, “Nhờ mua thêm”, editing an extra) ─────────────────────────────────
function shopAisleHint(info:any){return info.how==='chosen'||info.how==='remembered'?slT('Nhà mình đã chọn quầy này.','Your family chose this aisle.'):info.how==='ingredient'?slT('App đoán theo nguyên liệu cùng tên. Đổi nếu chưa đúng.','Guessed from the ingredient with this name. Change it if it is wrong.'):info.how==='words'?slT('App đoán theo tên. Đổi nếu chưa đúng.','Guessed from the name. Change it if it is wrong.'):slT('App chưa đoán được quầy, nên để ở “Khác”. Chọn quầy nếu muốn.','The app cannot tell the aisle, so it goes under “Other”. Pick one if you like.')}
/** A select with every aisle, preselected with the family's choice or the guess (said so underneath). */
function extraAisleFieldMarkup(id:string,item:any=null){const info=item?extraAisleInfo(item):{key:'misc',how:'none'},chosen=info.how==='chosen'||info.how==='remembered';
 return `<div class="field extra-aisle-field"><label for="${id}">${slT('Quầy trong danh sách','Aisle on the list')}</label><select id="${id}" name="aisle" data-aisle-field${chosen?' data-by-user="1"':''}>${SHOP_AISLES.map(k=>`<option value="${k}" ${k===info.key?'selected':''}>${esc(shopAisleName(k))}</option>`).join('')}</select><small class="hint" id="${id}-hint" data-aisle-hint>${esc(shopAisleHint(info))}</small></div>`}
/** The aisle to store from a form: only one the family picked (or picked before for this name); a guess is not stored. */
function extraAisleFromForm(id:string){const s=document.getElementById(id) as any;if(!s||!s.dataset.byUser||!SHOP_AISLES.includes(s.value))return '';return s.value}
// typing the name re-guesses (until the family picks); picking marks the choice as the family's
const SHOP_AISLE_NAME:Record<string,string>={'extra-name':'extra-aisle','errand-item':'errand-aisle'};
document.addEventListener('input',e=>{const t=e.target as any,sid=t?.id&&SHOP_AISLE_NAME[t.id];if(!sid)return;const s=document.getElementById(sid) as any;if(!s||s.dataset.byUser)return;const name=String(t.value||'').trim(),rem=rememberedExtraAisle(name),info=rem?{key:rem,how:'remembered'}:guessExtraAisle(name,typeof extraUnitMatch==='function'&&typeof EXTRA_FORMS!=='undefined'?extraUnitMatch(EXTRA_FORMS[t.id==='extra-name'?'extra-form':'errand-form']):null);s.value=info.key;const h=document.getElementById(sid+'-hint');if(h)h.textContent=shopAisleHint(info)});
document.addEventListener('change',e=>{const t=e.target as any;if(t?.id==='extra-catalog-ing'){const s=document.getElementById('extra-aisle') as any;if(s&&!s.dataset.byUser&&INGREDIENTS[t.value]){s.value=INGREDIENTS[t.value][2];const h=document.getElementById('extra-aisle-hint');if(h)h.textContent=shopAisleHint({how:'ingredient'})}return}if(!t?.matches?.('select[data-aisle-field]'))return;t.dataset.byUser='1';const h=document.getElementById(t.id+'-hint');if(h)h.textContent=slT('Nhà mình chọn quầy này; app nhớ cho lần sau.','Your choice; the app remembers it for next time.')});

// ── Quick view per category ───────────────────────────────────────────────────────────────────────────────────────────
function shopQuickRead():Record<string,boolean>{try{const m=JSON.parse(localStorage.getItem('bep-shop-quick')||'{}');return m&&typeof m==='object'&&!Array.isArray(m)?m:{}}catch{return{}}}
function shopQuickOn(key:string){return !!shopQuickRead()[key]}
function shopQuickKey(group:string){return(typeof shopGrouping!=='undefined'?shopGrouping:'aisle')+':'+group}
function shopQuickButton(key:string){const on=shopQuickOn(key);return `<button type="button" class="btn small chip sg-quick" data-shop-quick="${esc(key)}" aria-pressed="${on}">${on?slT('Mở đầy đủ','Show details'):slT('Xem nhanh','Quick view')}</button>`}
document.addEventListener('click',e=>{const b=(e.target as any)?.closest?.('[data-shop-quick]');if(!b)return;e.preventDefault();const key=b.dataset.shopQuick,m=shopQuickRead(),on=!m[key];if(on)m[key]=true;else delete m[key];try{localStorage.setItem('bep-shop-quick',JSON.stringify(m))}catch{}
 // rule 24: no redraw; the group folds in place and the button stays where it was on screen
 // (folding near the foot of the page makes it shorter, so the same spacer the app's buttons use keeps room below — audit sweep)
 const top=b.getBoundingClientRect().top,y=scrollY;b.closest('.shopping-group')?.classList.toggle('sg-quick-on',on);b.setAttribute('aria-pressed',String(on));b.textContent=on?slT('Mở đầy đủ','Show details'):slT('Xem nhanh','Quick view');
 const fix=()=>{const d=b.getBoundingClientRect().top-top;if(Math.abs(d)>1){if(typeof keepRoomFor==='function')keepRoomFor(scrollY+d);window.scrollTo({top:scrollY+d,behavior:'instant' as ScrollBehavior})}};if(typeof keepRoomFor==='function')keepRoomFor(y);fix();requestAnimationFrame(()=>{fix();requestAnimationFrame(fix)})});

// ── Usual-shop chips: 4 first, “Xem thêm (n)” and a search field for the rest ───────────────────────────────────────────
const SHOP_CHIPS_FIRST=4;
/** chips: the stores in usage order; chip(s) draws one chip; the chosen store always shows. */
function storeChipsMarkup(list:any[],selectedId:string,chip:(s:any)=>string){const first=list.slice(0,SHOP_CHIPS_FIRST).map(s=>s.id);if(selectedId&&list.some(s=>s.id===selectedId)&&!first.includes(selectedId))first.push(selectedId);
 const rest=list.filter(s=>!first.includes(s.id)).length,search=list.length>SHOP_CHIPS_FIRST;
 const one=(s:any)=>{const html=chip(s),hide=!first.includes(s.id);return html.replace(/^<button /,`<button data-store-chip data-store-name="${esc(normalizeText((s.name||'')+' '+(s.address||'')))}"${hide?' data-store-extra hidden':''} `)};
 return `<div class="store-chips" data-store-chips>${search?`<label class="store-chip-search"><span class="sr-only">${slT('Tìm cửa hàng','Find a shop')}</span><input type="search" class="input" data-store-chip-search autocomplete="off" enterkeyhint="search" placeholder="${esc(slT('Tìm cửa hàng theo tên…','Find a shop by name…'))}"></label>`:''}<div class="toolbar topspace store-chip-list">${list.map(one).join('')}${rest?`<button type="button" class="btn small soft store-chip-more" data-store-chips-more>${slT(`Xem thêm (${rest})`,`Show more (${rest})`)}</button>`:''}</div><p class="hint store-chip-none" hidden>${slT('Không có cửa hàng nào trùng tên này.','No shop matches that name.')}</p></div>`}
function storeChipsFilter(box:any){const q=normalizeText(box.querySelector('[data-store-chip-search]')?.value||''),open=box.classList.contains('expanded');let shown=0;
 for(const c of box.querySelectorAll('[data-store-chip]') as any){const hit=q?String(c.dataset.storeName||'').includes(q):(open||!c.hasAttribute('data-store-extra'));c.hidden=!hit;if(hit)shown++}
 const more=box.querySelector('[data-store-chips-more]');if(more)more.hidden=open||!!q;const none=box.querySelector('.store-chip-none');if(none)none.hidden=shown>0}
document.addEventListener('click',e=>{const b=(e.target as any)?.closest?.('[data-store-chips-more]');if(!b)return;e.preventDefault();const box=b.closest('[data-store-chips]');if(!box)return;box.classList.add('expanded');storeChipsFilter(box);(box.querySelector('[data-store-extra]') as any)?.focus({preventScroll:true})});
document.addEventListener('input',e=>{const t=e.target as any;if(!t?.matches?.('[data-store-chip-search]'))return;const box=t.closest('[data-store-chips]');if(box)storeChipsFilter(box)});

// ── Aisle header pictures ───────────────────────────────────────────────────────────────────────────────────────────────
// v1.7.21: the meat aisle's old picture (the 🥩 drawing) read as a stray red dot at heading size on a phone; the aisle gets
// its own clear drawing, and “Khác” gets one of its own (rule 20: a new picture gets a new drawing).
function shopAisleArt(key:string,emoji:string){if((key==='meat'||key==='misc')&&typeof uiArt==='function'){const a=uiArt('aisle-'+key,'emo-art sg-art');if(a)return `<span class="emo-art" aria-hidden="true">${a}</span>`}return emoji||''}
(globalThis as any).ShopList={guessExtraAisle,extraAisle,extraAisleInfo,extraCostKnown,rememberedExtraAisle,SHOP_AISLES};
