'use strict';
// v1.7.15 (owner, 8 Nov 2026: “Tất cả làm trong bản này luôn nhé”; pop-ups: family accounts only for links, unknown ingredients kept for
// the family to match, barcodes looked up on Open Food Facts through the app's server). Learned from other family kitchen apps:
//  1. Nhập món từ link — paste a recipe page link; the server reads its standard recipe data; the dish opens in Viết món to check.
//     Lines the app can match with an amount it can convert become ingredients; every other line is kept as written (“chưa ghép”,
//     missingIngredients) for the family to match — an amount is never guessed.
//  2. Quét mã vạch vào tủ — camera (the browser's barcode reader, or the self-hosted ZXing reader), a photo, or the number typed;
//     a code the family matched before is remembered on the device / family; otherwise the name comes from Open Food Facts.
//  3. Chế độ nấu — “10 phút” in a step is a button that starts the timer; when it ends the phone vibrates, a short tone plays and a
//     notification shows if allowed; the screen is kept awake again when you come back to the app.
(()=>{
const kT=(vi:string,en:string)=>typeof appLanguage!=='undefined'&&appLanguage==='en'?en:vi;
const account=()=>{const s=(globalThis as any).BEP_SESSION;return s?.mode==='account'&&!!s.household&&s.household?.role!=='viewer'};
const ingLabel=(id:string)=>typeof shopIngName==='function'?shopIngName(id):(INGREDIENTS[id]?.[0]||id);
const signIn=()=>`<p class="hint">${kT('Cần tài khoản gia đình.','Needs a family account.')} <a href="/login">${kT('Đăng nhập','Sign in')}</a></p>`;

// ── 1. recipe import ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
const UNIT:Record<string,[string,number]>={g:['g',1],gr:['g',1],gram:['g',1],grams:['g',1],gam:['g',1],kg:['g',1000],kgs:['g',1000],kilo:['g',1000],ml:['ml',1],l:['ml',1000],litre:['ml',1000],liter:['ml',1000],litres:['ml',1000],liters:['ml',1000],lít:['ml',1000],tbsp:['ml',15],tablespoon:['ml',15],tablespoons:['ml',15],tsp:['ml',5],teaspoon:['ml',5],teaspoons:['ml',5],cup:['ml',250],cups:['ml',250],quả:['quả',1],trái:['quả',1],lạng:['g',100],each:['quả',1],pc:['quả',1],pcs:['quả',1],piece:['quả',1],pieces:['quả',1],whole:['quả',1],large:['quả',1],medium:['quả',1],small:['quả',1]};
const FRAC:Record<string,number>={'½':.5,'¼':.25,'¾':.75,'⅓':1/3,'⅔':2/3,'⅛':.125};
// v1.7.16: many Vietnamese pages write “Tên: lượng” (“Hành tím: 25g”, “Bò tái:1,2kg”, “Chanh: 1 quả”); turn that into the usual
// “lượng đơn vị tên” first, so it is read the same way (exact names only, amounts as written — never guessed)
function importCanon(raw:string){const line=String(raw||'').replace(/\s+/g,' ').trim();const m=line.match(/^([^:：\d][^:：]*?)\s*[:：]\s*(\d+(?:[.,]\d+)?|\d+\s*\/\s*\d+|[½¼¾⅓⅔⅛])\s*([a-zA-Zà-ỹÀ-Ỹ]+\.?)?\s*$/);return m?`${m[2]}${m[3]?' '+m[3]:''} ${m[1].trim()}`:line}
const kNorm=(x:any)=>(typeof normalizeText==='function'?normalizeText(x):String(x||'').toLowerCase()).split(' ').filter(Boolean).map((w:string)=>w.length>3?w.replace(/(es|s)$/,''):w);
function nameFits(id:string,name:string){const words=kNorm(name);const labels=[INGREDIENTS[id]?.[0],(globalThis as any).INGREDIENT_EN?.[id]??(typeof INGREDIENT_EN!=='undefined'?(INGREDIENT_EN as any)[id]:'')].filter(Boolean).map(kNorm);
 return labels.some((l:string[])=>l.length>0&&words.some((_:string,i:number)=>l.every((w,j)=>words[i+j]===w)))}
function importLine(raw:string){const line=importCanon(raw);const m=line.match(/^(\d+(?:[.,]\d+)?(?:\s*[½¼¾⅓⅔⅛])?|[½¼¾⅓⅔⅛]|\d+\s*\/\s*\d+)(?:\s*[-–]\s*\d+(?:[.,]\d+)?)?\s*([a-zA-Zà-ỹÀ-Ỹ]+\.?)?\s+(.+)$/);
 if(!m)return null;let q=0;const a=m[1].replace(',','.').replace(/\s+/g,'');if(/\//.test(a)){const [x,y]=a.split('/').map(Number);q=y?x/y:0}else{const f=a.match(/[½¼¾⅓⅔⅛]/);q=(parseFloat(a)||0)+(f?FRAC[f[0]]:0)}
 if(!(q>0))return null;let unitWord=(m[2]||'').toLowerCase().replace(/\.$/,''),rest=m[3];if(unitWord&&!UNIT[unitWord]){rest=m[2]+' '+rest;unitWord=''}
 const name=rest.replace(/\(.*?\)/g,' ').split(/,| - | – /)[0].replace(/\b(of|fresh|chopped|sliced|diced|minced|finely|roughly)\b/gi,' ').replace(/\s+/g,' ').trim();if(!name)return null;
 // an exact name or alias only (a near match is left for the family to choose — never a wrong ingredient)
 const exact=typeof voiceExactIngredient==='function'?voiceExactIngredient(name,state):'';const guess:any=typeof inferIngredient==='function'?inferIngredient(name,state):null;
 // v1.7.16 (owner, 8 Nov 2026: “nhiều chỗ đọc định lượng không đúng”): a spoken alias is not enough for a recipe page — “Hành tím”
 // became Hành tây and “Húng quế” + “Ngò rí” were added up as Rau thơm. The ingredient's own name (VI or EN) must be in the line
 // (“pork belly” → Thịt heo / Pork, “Thịt heo ba chỉ” → Thịt heo); a match the family taught the app still counts.
 const id=guess?.confidence==='learned'&&INGREDIENTS[guess.match]?guess.match:[exact,guess?.confidence==='name'?guess.match:''].find(x=>x&&INGREDIENTS[x]&&nameFits(x,name))||'';if(!id)return null;
 const base=INGREDIENTS[id][1];const u=unitWord?UNIT[unitWord]:['quả',1];if(!u||u[0]!==base)return null;const qty=Math.round(q*u[1]*100)/100;return qty>0&&qty<1e6?{id,qty}:null}
function recipeFromImport(r:any){const ings:any[]=[],missing:string[]=[];for(const line of r.ingredients||[]){const hit=importLine(line);if(hit){const same=ings.find(x=>x.id===hit.id);if(same)same.qty=Math.round((same.qty+hit.qty)*100)/100;else ings.push(hit)}else missing.push(String(line).slice(0,200))}
 const servings=r.servings>0&&r.servings<=50?Math.round(r.servings):4;
 return{id:'imp-'+Math.random().toString(36).slice(2,10),name:String(r.name).slice(0,150),category:'main',protein:'mixed',time:r.time>0&&r.time<=600?Math.round(r.time):30,servings,yield:servings,purposes:typeof defaultPurposesForCategory==='function'?defaultPurposesForCategory('main'):['dinner'],
  ingredients:ings,missingIngredients:missing,prep:'',steps:(r.steps||[]).map((s:any)=>String(s).slice(0,500)).slice(0,40),custom:true,origin:'family',favorite:false,source:typeof r.source==='string'?r.source.slice(0,500):undefined}}
function importSheet(msg=''){modal(kT('Nhập món từ link','Import a recipe from a link'),account()?`<p class="hint">${kT('Dán link trang công thức (ví dụ một trang nấu ăn). App đọc tên món, nguyên liệu, các bước, khẩu phần và thời gian; món mở ra trong Viết món để bạn xem lại trước khi dùng.','Paste a recipe page link. The app reads the name, ingredients, steps, servings and time; the dish opens in Write recipe for you to check.')}</p>
  <label class="field"><span>${kT('Link trang công thức','Recipe page link')}</span><input id="kimp-url" type="url" inputmode="url" autocomplete="off" placeholder="https://…"></label><p class="hint" id="kimp-status" role="status" aria-live="polite">${esc(msg)}</p>
  <p class="hint">${kT('Nguyên liệu app chưa ghép được sẽ giữ nguyên chữ, đánh dấu “chưa ghép” để bạn chọn; app không tự đoán định lượng.','Ingredients the app cannot match stay as written, marked “not matched” for you to choose; amounts are never guessed.')}</p>`:signIn(),
  `<button class="btn" type="button" data-action="close-modal">${kT('Đóng','Close')}</button>${account()?`<button class="btn primary" type="button" data-kx="import-go">${kT('Nhập món','Import')}</button>`:''}`);(document.getElementById('kimp-url') as HTMLInputElement|null)?.focus()}
async function importGo(){const input=document.getElementById('kimp-url') as HTMLInputElement|null,st=document.getElementById('kimp-status');const url=(input?.value||'').trim();if(!/^https?:\/\//i.test(url)){if(st)st.textContent=kT('Dán link bắt đầu bằng https://','Paste a link starting with https://');return}
 if(!navigator.onLine){if(st)st.textContent=kT('Cần mạng để mở trang này.','Needs internet to open the page.');return}if(st)st.textContent=kT('Đang đọc trang…','Reading the page…');
 try{const res=await fetch('/.netlify/functions/family?op=recipe-import',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({url})});const data=await res.json().catch(()=>({}));
  if(!res.ok||!data.recipe){if(st)st.textContent=kT(data.error||'Chưa nhập được món này.',data.errorEn||'Could not import this recipe.');return}
  const rec=recipeFromImport(data.recipe);state.recipes.unshift(rec);save(kT(`Đã nhập “${rec.name}”: ${rec.ingredients.length} nguyên liệu ghép được, ${rec.missingIngredients.length} dòng chưa ghép.`,`Imported “${rec.name}”: ${rec.ingredients.length} ingredients matched, ${rec.missingIngredients.length} lines to match.`));
  closeModal();render();setTimeout(()=>familyRecipeEditor(rec.id),0)}catch{if(st)st.textContent=kT('Chưa nhập được. Kiểm tra mạng rồi thử lại.','Could not import. Check the connection and try again.')}}

// ── 2. barcode into the pantry ───────────────────────────────────────────────────────────────────────────────────────────────────
let scanStream:MediaStream|null=null,scanTimer:any=null,scanBusy=false;
const stopScan=()=>{clearInterval(scanTimer);scanTimer=null;scanStream?.getTracks().forEach(t=>t.stop());scanStream=null};
function loadZXing():Promise<any>{const w:any=window;if(w.ZXing)return Promise.resolve(w.ZXing);return new Promise((ok,no)=>{const s=document.createElement('script');s.src='vendor/zxing/zxing.min.js';s.onload=()=>w.ZXing?ok(w.ZXing):no(Error('zxing'));s.onerror=()=>no(Error('zxing'));document.head.append(s)})}
async function decodeCanvas(cv:HTMLCanvasElement):Promise<string>{const w:any=window;
 if('BarcodeDetector' in w){try{const d=new w.BarcodeDetector({formats:['ean_13','ean_8','upc_a','upc_e']});const r=await d.detect(cv);if(r?.[0]?.rawValue)return r[0].rawValue}catch{}}
 try{const Z=await loadZXing();const src=new Z.HTMLCanvasElementLuminanceSource(cv);const bmp=new Z.BinaryBitmap(new Z.HybridBinarizer(src));const hints=new Map();hints.set(Z.DecodeHintType.POSSIBLE_FORMATS,[Z.BarcodeFormat.EAN_13,Z.BarcodeFormat.EAN_8,Z.BarcodeFormat.UPC_A,Z.BarcodeFormat.UPC_E]);hints.set(Z.DecodeHintType.TRY_HARDER,true);const reader=new Z.MultiFormatReader();reader.setHints(hints);return reader.decode(bmp).getText()}catch{return''}}
function scanSheet(){stopScan();modal(kT('Quét mã vạch vào tủ','Scan a barcode into the pantry'),`<p class="hint">${kT('Đưa mã vạch trên bao bì vào khung. Không quét được thì chụp ảnh mã hoặc gõ dãy số dưới mã.','Hold the barcode on the pack inside the frame. If it does not read, take a photo of it or type the number under it.')}</p>
  <div class="scan-box"><video id="scan-video" playsinline muted></video><div class="scan-aim" aria-hidden="true"></div></div><p class="hint" id="scan-status" role="status" aria-live="polite"></p>
  <div class="scan-alt"><button class="btn" type="button" data-kx="scan-photo">${kT('Chụp ảnh mã','Photo of the code')}</button><input type="file" id="scan-file" accept="image/*" capture="environment" hidden>
  <label class="field"><span>${kT('Hoặc gõ số mã vạch','Or type the barcode number')}</span><input id="scan-code" inputmode="numeric" pattern="[0-9]*" maxlength="14" autocomplete="off"></label><button class="btn" type="button" data-kx="scan-typed">${kT('Tìm mã này','Look up this code')}</button></div>`,
  `<button class="btn" type="button" data-action="close-modal">${kT('Đóng','Close')}</button>`);startCamera()}
async function startCamera(){const st=document.getElementById('scan-status'),video=document.getElementById('scan-video') as HTMLVideoElement|null;if(!video)return;
 if(!navigator.mediaDevices?.getUserMedia){if(st)st.textContent=kT('Máy này không mở được camera trong app — chụp ảnh mã hoặc gõ số.','This device cannot open the camera here — take a photo or type the number.');return}
 try{scanStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false});video.srcObject=scanStream;await video.play().catch(()=>{});if(st)st.textContent=kT('Đang tìm mã vạch…','Looking for a barcode…');
  const cv=document.createElement('canvas');scanTimer=setInterval(async()=>{if(scanBusy||!video.videoWidth||!document.getElementById('scan-video')){if(!document.getElementById('scan-video'))stopScan();return}scanBusy=true;cv.width=video.videoWidth;cv.height=video.videoHeight;cv.getContext('2d')!.drawImage(video,0,0);const code=await decodeCanvas(cv);scanBusy=false;if(code&&/^\d{8,14}$/.test(code)){stopScan();gotCode(code)}},350)}
 catch{if(st)st.textContent=kT('Chưa mở được camera — chụp ảnh mã hoặc gõ số.','The camera did not open — take a photo or type the number.')}}
async function decodeFile(file:File){const bmp=await createImageBitmap(file);const sc=Math.min(1,1600/Math.max(bmp.width,bmp.height));const cv=document.createElement('canvas');cv.width=Math.round(bmp.width*sc);cv.height=Math.round(bmp.height*sc);cv.getContext('2d')!.drawImage(bmp,0,0,cv.width,cv.height);bmp.close?.();return decodeCanvas(cv)}
const parseQuantity=(q:string)=>{const m=String(q||'').toLowerCase().replace(',','.').match(/(\d+(?:\.\d+)?)\s*(kg|g|ml|l|cl)\b/);if(!m)return null;const n=+m[1],u=m[2];return u==='kg'?{qty:n*1000,unit:'g'}:u==='g'?{qty:n,unit:'g'}:u==='l'?{qty:n*1000,unit:'ml'}:u==='cl'?{qty:n*10,unit:'ml'}:{qty:n,unit:'ml'}};
async function gotCode(code:string){const known=(state as any).barcodeMap?.[code];let product:any=known?{found:true,name:known.name,quantity:known.quantity||''}:null;
 if(!product){if(!account()||!navigator.onLine)product={found:false};else{try{const res=await fetch('/.netlify/functions/family?op=barcode&code='+encodeURIComponent(code),{credentials:'same-origin',cache:'no-store'});product=res.ok?await res.json():{found:false}}catch{product={found:false}}}}
 confirmSheet(code,product,known)}
function confirmSheet(code:string,p:any,known:any){const guess=known?.ingredient||(p?.found&&typeof inferIngredient==='function'?inferIngredient(p.name,state)?.match:'');const sel=guess&&INGREDIENTS[guess]?guess:'';
 const opts=Object.keys(INGREDIENTS).filter(id=>!String(id).startsWith('family-ing-')||(state as any).ingredientCatalog?.[id]).sort((a,b)=>ingLabel(a).localeCompare(ingLabel(b))).map(id=>`<option value="${esc(id)}" ${id===sel?'selected':''}>${esc(ingLabel(id))}</option>`).join('');
 const q=parseQuantity(p?.quantity||'');const fits=(id:string)=>q&&id&&INGREDIENTS[id]&&INGREDIENTS[id][1]===q.unit?q.qty:'';const place=sel&&typeof suggestStorePlace==='function'?suggestStorePlace(state,sel):'fridge';
 modal(kT('Thêm vào tủ','Add to the pantry'),`<p><b data-user-content>${esc(p?.found?p.name:kT('Chưa biết sản phẩm này','Product not known yet'))}</b>${p?.brand?` · <span data-user-content>${esc(p.brand)}</span>`:''}${p?.quantity?` · ${esc(p.quantity)}`:''}<br><small class="muted">${kT('Mã','Code')} ${esc(code)}${known?' · '+kT('nhà mình đã ghép trước đây','matched by your family before'):p?.found?' · Open Food Facts':''}</small></p>
  <label class="field"><span>${kT('Là nguyên liệu nào?','Which ingredient?')}</span><select id="scan-ing"><option value="">${kT('— Chọn —','— Choose —')}</option>${opts}</select></label>
  <div class="form-grid"><label class="field"><span>${kT('Lượng','Amount')} (<span id="scan-unit">${sel?esc(INGREDIENTS[sel][1]):'—'}</span>)</span><input id="scan-qty" type="number" min="0" step="any" value="${fits(sel)}" data-pq="${q?q.qty:''}" data-pu="${q?q.unit:''}" placeholder="${esc(kT('Chưa rõ','Unknown'))}"></label>
  <label class="field"><span>${kT('Cất ở','Kept in')}</span><select id="scan-place">${(['fridge','freezer','dry'] as const).map(k=>`<option value="${k}" ${k===place?'selected':''}>${esc(typeof placeName==='function'?placeName(k):k)}</option>`).join('')}</select></label></div>
  <p class="hint">${kT('Lượng tính theo đơn vị của nguyên liệu (g, ml hoặc quả). Để trống thì cất là 1 gói.','The amount is in the ingredient’s unit (g, ml or each). Left empty, it is kept as 1 pack.')}</p>`,
  `<button class="btn" type="button" data-action="close-modal">${kT('Đóng','Close')}</button><button class="btn primary" type="button" data-kx="scan-save" data-code="${esc(code)}" data-name="${esc(p?.found?p.name:'')}" data-quantity="${esc(p?.quantity||'')}">${kT('Lưu','Save')}</button>`)}
function scanSave(b:HTMLElement){const id=(document.getElementById('scan-ing') as HTMLSelectElement)?.value;if(!id||!INGREDIENTS[id]){toast(kT('Chọn nguyên liệu trước.','Choose the ingredient first.'),true);return}
 const qty=+(document.getElementById('scan-qty') as HTMLInputElement).value,place=(document.getElementById('scan-place') as HTMLSelectElement).value||'fridge',code=b.dataset.code||'';
 const lot:any={id:typeof uid==='function'?uid():'p'+Date.now(),ingredient:id,qty:qty>0?qty:0,place:['fridge','freezer','dry'].includes(place)?place:'fridge',expiry:typeof suggestUseBy==='function'?suggestUseBy(id,place):'',storedOn:sydneyDate(),barcode:code};
 if(!(qty>0))lot.purchase={unit:'gói',amount:1,pricePerUnit:null,currency:typeof currentCurrency==='function'?currentCurrency(state):'AUD'};if(typeof pantryTouch==='function')pantryTouch(lot);state.pantry.push(lot);
 const map:any=(state as any).barcodeMap&&typeof (state as any).barcodeMap==='object'?(state as any).barcodeMap:{};map[code]={ingredient:id,name:String(b.dataset.name||'').slice(0,120),quantity:String(b.dataset.quantity||'').slice(0,40)};const keys=Object.keys(map);if(keys.length>500)delete map[keys[0]];(state as any).barcodeMap=map;
 save(kT(`Đã cất ${ingLabel(id)} vào tủ.`,`${ingLabel(id)} put in the pantry.`));closeModal();if(view==='pantry')render()}

// ── 3. cooking: minutes in a step start the timer; the end is felt and heard ───────────────────────────────────────────────────
function stepTimers(){const el=document.querySelector('#modal-root .cooking-step');if(!el||el.querySelector('.step-timer'))return;
 el.innerHTML=el.innerHTML.replace(/(\d{1,3})\s*(phút|minutes?|mins?)\b/gi,(m,n)=>+n>=1&&+n<=180?`<button type="button" class="btn small step-timer" data-kx="step-timer" data-min="${+n}" aria-label="${esc(kT(`Hẹn giờ ${n} phút`,`Start a ${n}-minute timer`))}">${m}</button>`:m)}
function timerDone(){try{navigator.vibrate?.([300,150,300,150,300])}catch{}
 try{const A=(window as any).AudioContext||(window as any).webkitAudioContext;if(A){const ctx=new A(),o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=880;g.gain.value=.15;o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+.9)}}catch{}
 try{if('Notification' in window&&Notification.permission==='granted'&&document.visibilityState!=='visible')new Notification(kT('Hết giờ hẹn trong bếp','Kitchen timer done'),{body:kT('Xem lại món đang nấu.','Check the dish you are cooking.'),tag:'bep-timer'})}catch{}
 toast(kT('Hết giờ hẹn trong bếp!','Kitchen timer done!'))}
(globalThis as any).kitchenTimerDone=timerDone;
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&document.querySelector('#modal-root .cooking-step'))try{(navigator as any).wakeLock?.request?.('screen').then((l:any)=>{(globalThis as any).__bepWakeLock=l}).catch(()=>{})}catch{}});
if(typeof renderCooking==='function'){const base=renderCooking;renderCooking=function(this:any,...a:any[]){const r=base.apply(this,a);try{stepTimers()}catch(e){console.warn('step timers',e)}return r}}

// ── entries: Recipes (“Nhập từ link”), Pantry (“Quét mã vạch”), the search and the feature list ────────────────────────────────────
// the kitchen / voice buttons stay right under the title (owner, 7 Nov 2026), so these rows go after them
function decorate(){const main=document.getElementById('main');if(!main)return;const title=main.querySelector('.page-heading');const dock=title?.nextElementSibling;
 const head=dock&&dock.classList.contains('kitchen-action-dock')?dock:title;
 if(view==='recipes'&&head&&!main.querySelector('[data-kx="import-open"]'))head.insertAdjacentHTML('afterend',`<div class="kx-row"><button class="btn" type="button" data-kx="import-open">${kT('Nhập món từ link','Import from a link')}</button>${account()?'':`<small class="hint kx-needs-account">${kT('Cần tài khoản gia đình — chạm để xem cách kết nối.','Needs a family account — tap to see how to connect.')}</small>`}</div>`);
 if(view==='pantry'&&head&&!main.querySelector('[data-kx="scan-open"]'))head.insertAdjacentHTML('afterend',`<div class="kx-row"><button class="btn primary" type="button" data-kx="scan-open">${kT('Quét mã vạch','Scan a barcode')}</button></div>`)}
{const base=render;render=function(this:any,...a:any[]){const r=base.apply(this,a);try{decorate()}catch(e){console.warn('kitchen extras',e)}return r}}
document.addEventListener('click',e=>{const b=(e.target as any)?.closest?.('[data-kx]');if(!b)return;e.preventDefault();const k=b.dataset.kx;
 if(k==='import-open')importSheet();else if(k==='import-go')importGo();else if(k==='scan-open')scanSheet();else if(k==='scan-photo')(document.getElementById('scan-file') as HTMLInputElement)?.click();
 else if(k==='scan-typed'){const v=(document.getElementById('scan-code') as HTMLInputElement)?.value.replace(/\D/g,'')||'';if(!/^\d{8,14}$/.test(v)){toast(kT('Mã vạch có 8 đến 14 chữ số.','A barcode has 8 to 14 digits.'),true);return}stopScan();gotCode(v)}
 else if(k==='scan-save')scanSave(b);else if(k==='step-timer'){const inp=document.getElementById('timer-minutes') as HTMLInputElement|null;if(inp){inp.value=b.dataset.min;(document.querySelector('#modal-root [data-action="start-timer"]') as HTMLElement|null)?.click()}}});
document.addEventListener('change',async e=>{const t=e.target as HTMLInputElement;if(t?.id!=='scan-file'||!t.files?.[0])return;const st=document.getElementById('scan-status');if(st)st.textContent=kT('Đang đọc mã trong ảnh…','Reading the code in the photo…');const code=await decodeFile(t.files[0]).catch(()=>'');if(code&&/^\d{8,14}$/.test(code)){stopScan();gotCode(code)}else if(st)st.textContent=kT('Chưa đọc được mã trong ảnh — thử lại gần hơn hoặc gõ số.','Could not read the code in the photo — try closer or type the number.')});
document.addEventListener('keydown',e=>{const t=e.target as HTMLElement;if(e.key==='Enter'&&t?.id==='kimp-url'){e.preventDefault();importGo()}});
// the pack size is filled in only when it is in the chosen ingredient's own unit (700 g of eggs is not 700 eggs)
document.addEventListener('change',e=>{const t=e.target as HTMLSelectElement;if(t?.id!=='scan-ing')return;const q=document.getElementById('scan-qty') as HTMLInputElement|null,u=document.getElementById('scan-unit');const unit=INGREDIENTS[t.value]?.[1]||'';if(u)u.textContent=unit||'—';if(q)q.value=q.dataset.pu&&q.dataset.pu===unit?q.dataset.pq||'':''});
const close0=typeof closeModal==='function'?closeModal:null;if(close0){closeModal=function(this:any,...a:any[]){stopScan();return close0.apply(this,a)}}
const feats=(globalThis as any).APP_FEATURES;if(Array.isArray(feats)){const at=feats.findIndex((f:any)=>f.id==='receipt');feats.splice(at<0?feats.length:at,0,
 {id:'import',art:'link-in',vi:'Nhập món từ link',en:'Import a recipe from a link',dvi:'Dán link trang công thức; app đọc nguyên liệu và các bước, mở ra để bạn xem lại.',den:'Paste a recipe page link; the app reads the ingredients and steps and opens it for you to check.',kw:'nhap mon tu link import recipe url trang web cong thuc',go:()=>{location.hash='recipes';setTimeout(importSheet,80)}},
 {id:'barcode',art:'barcode',vi:'Quét mã vạch vào tủ',en:'Scan a barcode into the pantry',dvi:'Quét mã trên bao bì để thêm đồ vào tủ; app nhớ mã nhà mình đã ghép.',den:'Scan the code on a pack to add it to the pantry; the app remembers codes your family matched.',kw:'quet ma vach barcode scan tu do pantry',go:()=>{location.hash='pantry';setTimeout(scanSheet,80)}})}
(globalThis as any).KitchenExtras={importLine,recipeFromImport,importSheet,scanSheet,gotCode,parseQuantity,stepTimers,timerDone};
})();
