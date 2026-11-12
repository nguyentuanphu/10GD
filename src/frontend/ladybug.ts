'use strict';
// Floating ladybug feedback (v1.7.1, owner 1 Nov 2026: "cho thêm cái floating lady bug, cách hoạt động và sử dụng giống
// SparkleValley"). Ported from Sparkle Valley's tester ladybird (js/tester-float.ts, js/tester.ts, js/report-outbox.ts,
// js/screencapture.ts there) and fitted to this app:
//  - who sees it: Studio → Góp ý decides (off / only assigned testers / everyone); the Studio owner always does.
//    The server answers op=access; the last answer is kept on this device so the bug also shows offline.
//  - the bug floats above the page, outside the app's own layers: drag it anywhere (it snaps to the nearest side and
//    remembers where, on this device); double-tap / double-click / Home puts it back; a long press tucks it into a
//    small tab at the edge (tap the tab to bring it back). It stays above the bottom navigation and safe areas, and
//    while it sits where you did not put it, it moves away from buttons on the screen (SV's collision ranking).
//  - tap: the feedback sheet: a kind, a note, an optional picture (taken only when you press "Take screenshot", or
//    chosen from your files) with a preview where you can hide parts before sending, and the technical details that
//    go with it listed in full. Send works offline: the report waits on this device and is sent later, once.
//  - "My feedback": what you sent, its status and the replies from the app team; a dot on the bug for a new reply,
//    a number for reports still waiting to send. When a report is marked fixed you can answer "Yes, fixed" or
//    "Still wrong" (SV's fixed tick and retest question).
// Privacy (feedback-privacy.html — v1.7.14, moved out of the public privacy page by owner pop-up): only what you write and choose to attach, plus page, app version/build, device
// class, language, screen size, theme, online state, time and recent app error lines without personal data.
(function ladybugFeedback(){
if(typeof window==='undefined'||typeof document==='undefined')return;
const API='/.netlify/functions/feedback';
const K={pos:'bep-ladybug-pos',min:'bep-ladybug-min',status:'bep-ladybug-status',out:'bep-feedback-outbox',device:'bep-feedback-device',mine:'bep-feedback-mine'};
const OUTBOX_MAX=10,HOLD_MS=600,TAP_MS=320,MOVE_PX=8,STATUS_EVERY=10*60000,FLUSH_EVERY=60000,REQ_MS=20000;
const T=(vi:string,en:string)=>typeof tr==='function'?tr(vi,en):(typeof appLanguage!=='undefined'&&appLanguage==='en'?en:vi);
const esc=(v:any)=>String(v??'').replace(/[&<>"']/g,(c:string)=>(({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}) as any)[c]);
const get=(k:string,d:any=null)=>{try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch{return d}};
const put=(k:string,v:any)=>{try{if(v==null)localStorage.removeItem(k);else localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}};
const accountMode=()=>(globalThis as any).BEP_SESSION?.mode==='account';
const online=()=>navigator.onLine!==false&&!(globalThis as any).BEP_OFFLINE;
const reduced=()=>{try{return matchMedia('(prefers-reduced-motion: reduce)').matches}catch{return false}};
const rid=(n=18)=>{const a=new Uint8Array(n);crypto.getRandomValues(a);return btoa(String.fromCharCode(...a)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')};
function deviceToken(){let t=get(K.device,'');if(typeof t!=='string'||!/^[A-Za-z0-9_-]{24,64}$/.test(t)){t=rid(24);put(K.device,t)}return t}

// ---------- recent app errors (kept in memory only; sent only with a report) ----------
const errors:string[]=[];
const resizeNotice=(m:string)=>/^(?:ResizeObserver loop limit exceeded|ResizeObserver loop completed with undelivered notifications\.?)$/.test(String(m||'').trim());
function noteError(msg:any,file:any='',line:any=0){const m=String(msg||'error');if(resizeNotice(m))return;const f=String(file||'').split('/').pop()?.split('?')[0]||'';const s=`${m.slice(0,140)}${f?' @ '+f+':'+(line||0):''}`;if(errors[errors.length-1]===s)return;errors.push(s);if(errors.length>10)errors.shift()}
addEventListener('error',(e:any)=>{if(e?.target&&e.target!==window)return;noteError(e?.message,e?.filename,e?.lineno)});
addEventListener('unhandledrejection',(e:any)=>{const r=e?.reason,m=/\/([\w.-]+\.js):(\d+)/.exec(String(r?.stack||''));noteError(r?.message||String(r),m?m[1]:'',m?m[2]:0)});
// Client side first pass; the server cleans again (emails, long numbers, quoted values, query strings).
const scrub=(s:string)=>s.replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g,'[email]').replace(/(["'`“”‘’])(?:(?!\1).){3,}?\1/g,'"…"').replace(/\b\d{5,}\b/g,'#').replace(/\?[^\s]*/g,'');

// ---------- the context that goes with a report ----------
function platformClass(){let cls='desktop';try{const w=Math.min(screen.width||innerWidth,screen.height||innerHeight)||innerWidth,coarse=matchMedia('(pointer: coarse)').matches;cls=w<600?'mobile':coarse&&w<1100?'tablet':(innerWidth<600?'mobile':innerWidth<1100&&coarse?'tablet':'desktop')}catch{}return cls}
function context(){
 const route=((location.hash||'#today').slice(1).split(/[?&/]/)[0]||'today').toLowerCase().replace(/[^a-z0-9-]/g,'').slice(0,30)||'today';
 const m=document.querySelector('#modal-root .modal') as any,kind=m?([...m.classList].find((c:string)=>/^[a-z][a-z0-9-]*-modal$/.test(c))||'modal').replace(/-modal$/,''):'';
 let standalone=false;try{standalone=matchMedia('(display-mode: standalone)').matches||(navigator as any).standalone===true}catch{}
 return{route:/^[a-z]/.test(route)?route:'today',view:kind.slice(0,30),modal:!!m,edition:typeof APP_EDITION==='number'?APP_EDITION:null,build:String((globalThis as any).BEP_BUILD||'')||null,platform:platformClass(),standalone,
  lang:typeof appLanguage!=='undefined'&&appLanguage==='en'?'en':'vi',theme:document.documentElement.dataset.theme==='dark'?'dark':'light',viewport:`${Math.round(innerWidth)}x${Math.round(innerHeight)}`,online:online(),account:accountMode(),clientAt:Date.now()};
}
function contextRows(c:any){const yes=T('có','yes'),no=T('không','no');return[[T('Trang','Page'),'#'+c.route+(c.view?' · '+c.view:'')],[T('Phiên bản','Version'),`${c.edition??'—'} · ${c.build||'—'}`],[T('Loại máy','Device class'),({mobile:T('điện thoại','phone'),tablet:T('máy tính bảng','tablet'),desktop:T('máy tính','computer')} as any)[c.platform]+(c.standalone?' · '+T('app đã cài','installed app'):'')],[T('Ngôn ngữ · giao diện','Language · theme'),`${c.lang.toUpperCase()} · ${c.theme==='dark'?T('tối','dark'):T('sáng','light')}`],[T('Kích thước màn hình','Screen size'),c.viewport],[T('Trực tuyến','Online'),c.online?yes:no],[T('Thời gian','Time'),new Date(c.clientAt).toLocaleString(c.lang==='en'?'en-AU':'vi-VN')]]}

// ---------- server ----------
async function call(op:string,{method='GET',body}:any={}){
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),REQ_MS);
 try{const r=await fetch(API+'?op='+op,{method,credentials:accountMode()?'same-origin':'omit',cache:'no-store',headers:{Accept:'application/json','x-feedback-device':deviceToken(),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:ctl.signal});
  let d:any={};try{d=await r.json()}catch{}
  if(!r.ok)throw Object.assign(new Error(T(d.error||'Chưa gửi được.',d.errorEn||d.error||'Could not send.')),{status:r.status,code:d.code||''});return d}
 finally{clearTimeout(timer)}}
let status:any=get(K.status,null);
async function refresh(){
 if(!online())return status;
 try{const d=await call('access');status={visible:d.visible===true,mode:d.mode,role:d.role,unread:+d.unread||0,at:Date.now()};put(K.status,status)}
 catch(e:any){if(e?.status===404||e?.status===405){/* this server has no feedback service: keep the last answer */}}
 apply();return status}
function visible(){return !!status?.visible}
function apply(){if(visible()){mount();paint()}else unmount()}

// ---------- the outbox (SV report-outbox: never lose text to save a picture) ----------
function outbox():any[]{const v=get(K.out,[]);return Array.isArray(v)?v.filter((x:any)=>x&&typeof x.clientId==='string'&&x.body&&typeof x.body.note==='string'):[]}
function keep(rows:any[]){if(put(K.out,rows))return{ok:true,withoutPictures:false};if(put(K.out,rows.map(r=>({...r,body:{...r.body,shot:null},droppedShot:!!r.body.shot}))))return{ok:true,withoutPictures:true};return{ok:false,withoutPictures:false}}
let flushing:Promise<any>|null=null,lastResult:any=null;
function enqueue(body:any){const q=outbox();if(q.length>=OUTBOX_MAX)return{ok:false,reason:'full'};const row={clientId:body.clientId,at:Date.now(),body};const k=keep([...q,row]);if(!k.ok)return{ok:false,reason:'storage'};paint();void flush();return{ok:true,withoutPictures:k.withoutPictures}}
function flush():Promise<any>{
 if(flushing)return flushing;
 if(!online()||!outbox().length){paint();return Promise.resolve({sent:0,queued:outbox().length})}
 flushing=(async()=>{let sent=0,refused=0;const tried=new Set<string>();
  while(online()){const row=outbox().find(r=>!tried.has(r.clientId));if(!row)break;tried.add(row.clientId);
   try{await call('submit',{method:'POST',body:row.body});sent++;keep(outbox().filter(r=>r.clientId!==row.clientId))}
   catch(e:any){if([400,403,413].includes(e?.status)){refused++;keep(outbox().filter(r=>r.clientId!==row.clientId));lastResult={refused:e.message};continue}break}}
  return{sent,refused,queued:outbox().length}})().then(r=>{lastResult={...(lastResult||{}),...r};if(r.sent){mineCache=null;void loadMine()}return r}).finally(()=>{flushing=null;paint();paintSheetStatus()});
 paintSheetStatus();return flushing}

// ---------- the floating bug (port of SV floatReportButton) ----------
const BUG_SVG='<svg class="lb-art" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path class="lb-leg" d="M10 20l-5-3M9 28H3M11 35l-5 4M38 20l5-3M39 28h6M37 35l5 4M19 9l-3-5M29 9l3-5"/><circle class="lb-head" cx="24" cy="12" r="6"/><path class="lb-shell" d="M24 13c-9 0-14 7-14 16 0 9 6 15 14 15s14-6 14-15c0-9-5-16-14-16z"/><path class="lb-split" d="M24 14v30"/><circle class="lb-dot" cx="17" cy="24" r="3"/><circle class="lb-dot" cx="31" cy="24" r="3"/><circle class="lb-dot" cx="16" cy="34" r="2.6"/><circle class="lb-dot" cx="32" cy="34" r="2.6"/><circle class="lb-dot" cx="24" cy="39" r="2"/></svg>';
let btn:any=null,saved:any=get(K.pos,null),minimized=get(K.min,false)===true,down:any=null,moved=false,held=false,lastTap=0,holdTimer:any=0,tapTimer:any=0,relayout=0,observer:any=null,yielded=false;
function label(){if(!btn)return;const q=outbox().length,u=+status?.unread||0;const parts=[];if(u)parts.push(T(`${u} cập nhật mới`,`${u} new update${u>1?'s':''}`));if(q)parts.push(T(`${q} đang chờ gửi`,`${q} waiting to send`));
 btn.setAttribute('aria-label',(minimized?T('Mở lại bọ rùa góp ý','Bring back the feedback ladybug'):T('Góp ý / báo lỗi','Send feedback or report a problem'))+(parts.length?' ('+parts.join(', ')+')':''));btn.title=minimized?T('Chạm để mở lại','Tap to bring back'):T('Chạm: góp ý · Kéo: di chuyển · Giữ: thu nhỏ · Chạm 2 lần: về chỗ cũ','Tap: feedback · Drag: move · Hold: tuck away · Double-tap: reset')}
function paint(){if(!btn)return;const q=outbox().length,u=+status?.unread||0,n=btn.querySelector('.lb-n'),d=btn.querySelector('.lb-new');n.textContent=q?String(q):'';n.hidden=!q;d.hidden=!u;btn.classList.toggle('lb-has-new',!!u);btn.classList.toggle('lb-min',minimized);label()}
// env(safe-area-inset-*) only resolves inside real properties: a hidden probe's padding reads them in px.
let probe:any=null;function safeProbe(){if(!probe||!probe.isConnected){probe=document.createElement('div');probe.className='lb-safe-probe';probe.setAttribute('aria-hidden','true');document.body.append(probe)}return probe}
function bounds(){
 const v:any=(globalThis as any).visualViewport,W=v?.width||innerWidth,H=v?.height||innerHeight,ox=v?.offsetLeft||0,oy=v?.offsetTop||0,s=getComputedStyle(safeProbe()),safe=(k:string)=>parseFloat(s.getPropertyValue('padding-'+k))||0,w=btn.offsetWidth||52,h=btn.offsetHeight||52,gap=minimized?0:8;
 let left=ox+gap+safe('left'),top=oy+8+safe('top'),right=ox+W-w-gap-safe('right'),bottom=oy+H-h-8-safe('bottom');
 const side=document.querySelector('.sidebar') as any;if(side){const r=side.getBoundingClientRect();if(r.height&&r.width>=W*.9&&r.top>H/2)bottom=Math.min(bottom,r.top-h-8);else if(r.width&&r.left<=1&&r.width<W/2&&r.height>H/2)left=Math.max(left,r.right+gap)}
 for(const sel of ['.app-update-notice']){const n=document.querySelector(sel) as any;if(n){const r=n.getBoundingClientRect();if(r.height&&r.top>H/2)bottom=Math.min(bottom,r.top-h-8)}}
 return{left,top,right:Math.max(left,right),bottom:Math.max(top,bottom)}}
function place(x:number,y:number){const b=bounds();btn.style.left=Math.round(Math.max(b.left,Math.min(b.right,x)))+'px';btn.style.top=Math.round(Math.max(b.top,Math.min(b.bottom,y)))+'px'}
// The top layer's controls: an open dialog/sheet/menu if there is one, otherwise the page.
function topLayer(){const layers=['.app-update-required','.confirm-backdrop','.account-menu','.scout-tray','#modal-root .modal'];for(const s of layers){const n=document.querySelector(s) as any;if(n&&n.getClientRects().length)return n}return document.getElementById('main')||document.body}
function controls(primaryOnly=false){const root=topLayer(),H=innerHeight,W=innerWidth,sel=primaryOnly?'.btn.primary,button[type=submit],.primary-action,[data-primary]':'button,[role=button],a[href],input,select,textarea,.btn';
 const out:any[]=[];for(const n of root.querySelectorAll(sel)){if(btn.contains(n))continue;const r=n.getBoundingClientRect();if(!r.width||!r.height||r.bottom<0||r.top>H||r.right<0||r.left>W)continue;out.push({r,w:primaryOnly||n.matches('.btn.primary,button[type=submit]')?6:1})}
 if(root!==document.getElementById('main')&&root!==document.body)return out;
 const side=document.querySelector('.sidebar') as any;if(side&&!primaryOnly)for(const n of side.querySelectorAll('a,button')){const r=n.getBoundingClientRect();if(r.width&&r.height)out.push({r,w:3})}
 return out}
const overlap=(p:any,list:any[])=>{const w=btn.offsetWidth,h=btn.offsetHeight;return list.reduce((s,{r,w:k}:any)=>s+k*Math.max(0,Math.min(r.right,p.x+w+4)-Math.max(r.left,p.x-4))*Math.max(0,Math.min(r.bottom,p.y+h+4)-Math.max(r.top,p.y-4)),0)};
function savedPoint(b:any){return{x:saved.side==='left'?b.left:b.right,y:b.top+Math.max(0,Math.min(1,+saved.y||0))*(b.bottom-b.top)}}
function layout(){
 if(!btn||down)return;const b=bounds();
 if(saved&&(saved.side==='left'||saved.side==='right')){const p=savedPoint(b);
  // A place you chose is kept, except that it never sits on the top layer's main (primary) button.
  if(!overlap(p,controls(true))){yielded=false;place(p.x,p.y);return}yielded=true}else yielded=false;
 const pref={x:b.right,y:b.top+.74*(b.bottom-b.top)},list=controls(false),prim=controls(true);
 const cands=[pref,...[b.right,b.left].flatMap(x=>[.74,.6,.88,.45,1,.3,.15,0].map(t=>({x,y:b.top+t*(b.bottom-b.top)})))];
 const ranked=cands.map(p=>({...p,hard:overlap(p,prim),soft:overlap(p,list),d:Math.hypot(p.x-pref.x,p.y-pref.y)})).sort((p,q)=>p.hard-q.hard||p.soft-q.soft||p.d-q.d);
 place(ranked[0].x,ranked[0].y)}
const queueLayout=()=>{if(down||relayout)return;relayout=requestAnimationFrame(()=>{relayout=0;layout()})};
// Scrolling only matters while the bug sits where you did not put it (it avoids buttons); settle first.
let scrollTimer:any=0;const scrollLayout=()=>{if(saved&&!yielded)return;clearTimeout(scrollTimer);scrollTimer=setTimeout(queueLayout,160)};
function remember(){const b=bounds(),r=btn.getBoundingClientRect(),side=r.left+r.width/2<(b.left+b.right+r.width)/2?'left':'right';saved={side,y:(r.top-b.top)/Math.max(1,b.bottom-b.top)};put(K.pos,saved);btn.classList.add('lb-snap');place(side==='left'?b.left:b.right,r.top);setTimeout(()=>btn?.classList.remove('lb-snap'),260)}
function resetPos(){clearTimeout(tapTimer);lastTap=0;saved=null;put(K.pos,null);if(minimized)setMin(false);layout();announce(T('Bọ rùa đã về chỗ cũ.','The ladybug is back in its place.'))}
function setMin(on:boolean){minimized=on;put(K.min,on);paint();layout()}
function announce(s:string){const t=document.getElementById('toast');if(t&&typeof toast==='function')toast(s)}
function onDown(e:any){if(down||e.button>0)return;e.preventDefault();clearTimeout(tapTimer);const r=btn.getBoundingClientRect();down={id:e.pointerId,x:e.clientX,y:e.clientY,left:r.left,top:r.top};moved=held=false;try{btn.setPointerCapture(e.pointerId)}catch{}
 holdTimer=setTimeout(()=>{held=true;lastTap=0;setMin(!minimized);announce(minimized?T('Đã thu nhỏ bọ rùa. Chạm vào để mở lại.','Ladybug tucked away. Tap it to bring it back.'):T('Đã mở lại bọ rùa.','Ladybug is back.'))},HOLD_MS)}
function onMove(e:any){if(!down||e.pointerId!==down.id)return;e.preventDefault();if(!moved&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>MOVE_PX){moved=true;clearTimeout(holdTimer);lastTap=0;btn.classList.add('lb-drag')}if(moved)place(down.left+e.clientX-down.x,down.top+e.clientY-down.y)}
function onUp(e:any){if(!down||e.pointerId!==down.id)return;e.preventDefault();clearTimeout(holdTimer);down=null;btn.classList.remove('lb-drag');try{btn.releasePointerCapture(e.pointerId)}catch{}
 if(moved){if(minimized)setMin(false);remember();return}
 if(held){layout();return}if(e.type!=='pointerup')return;const now=e.timeStamp||performance.now();
 if(lastTap&&now-lastTap<TAP_MS+30){lastTap=0;resetPos();return}
 lastTap=now;tapTimer=setTimeout(()=>{lastTap=0;if(minimized){setMin(false)}openSheet()},TAP_MS)}
function onClick(e:any){e.preventDefault();e.stopPropagation();if(e.detail===0){if(minimized)setMin(false);openSheet()}}
function onKey(e:any){if(e.key==='Home'){e.preventDefault();resetPos()}}
function mount(){
 if(btn)return;btn=document.createElement('button');btn.type='button';btn.id='ladybug';btn.className='lb-bug';btn.innerHTML=BUG_SVG+'<i class="lb-n" hidden></i><i class="lb-new" hidden></i>';
 document.body.append(btn);btn.addEventListener('pointerdown',onDown);btn.addEventListener('pointermove',onMove);btn.addEventListener('pointerup',onUp);btn.addEventListener('pointercancel',onUp);btn.addEventListener('lostpointercapture',onUp);
 btn.addEventListener('click',onClick);btn.addEventListener('dblclick',(e:any)=>{e.preventDefault();resetPos()});btn.addEventListener('keydown',onKey);btn.addEventListener('contextmenu',(e:any)=>e.preventDefault());
 addEventListener('resize',queueLayout);(globalThis as any).visualViewport?.addEventListener('resize',queueLayout);(globalThis as any).visualViewport?.addEventListener('scroll',queueLayout);addEventListener('scroll',scrollLayout,{passive:true,capture:true});
 observer=new MutationObserver(queueLayout);for(const n of [document.getElementById('modal-root'),document.getElementById('main'),document.body])if(n)observer.observe(n,{childList:true,subtree:n!==document.body});
 paint();layout()}
function unmount(){if(!btn)return;closeSheet(false);observer?.disconnect();observer=null;removeEventListener('resize',queueLayout);removeEventListener('scroll',scrollLayout,{capture:true} as any);(globalThis as any).visualViewport?.removeEventListener('resize',queueLayout);(globalThis as any).visualViewport?.removeEventListener('scroll',queueLayout);btn.remove();btn=null}

// ---------- the picture (port of SV screencapture: clone the visible page into an SVG, fallback painter) ----------
const imageOf=(src:string)=>new Promise<HTMLImageElement>((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=src});
const dataURL=(blob:Blob)=>new Promise<string>(ok=>{const f=new FileReader();f.onload=()=>ok(String(f.result));f.onerror=()=>ok('');f.readAsDataURL(blob)});
const isPrivate=(n:any)=>n.matches?.('input[type="password"],input[type="file"],[data-private],[data-capture-private]')||n.closest?.('[data-capture-private]');
const shown=(n:any)=>{const s=getComputedStyle(n),r=n.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&+s.opacity>0&&r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth};
const skip=(n:any)=>n.id==='ladybug'||n.classList?.contains('lb-layer')||n.classList?.contains('lb-safe-probe')||n.id==='toast';
async function inlineURLs(css:string,cache:Map<string,string>){const urls=[...css.matchAll(/url\("([^"]+)"\)/g)].map(m=>m[1]).filter(u=>!u.startsWith('data:'));for(const u of urls){if(!cache.has(u)){if(cache.size>40){cache.set(u,'');continue}try{const r=await fetch(u);cache.set(u,r.ok?await dataURL(await r.blob()):'')}catch{cache.set(u,'')}}css=css.split(`url("${u}")`).join(cache.get(u)?`url("${cache.get(u)}")`:'none')}return css}
async function cloneNode(n:any,cache:Map<string,string>):Promise<any>{
 if(n.nodeType===3)return document.createTextNode(n.textContent);
 if(n.nodeType!==1||/^(SCRIPT|STYLE|LINK|NOSCRIPT|TEMPLATE)$/.test(n.tagName)||skip(n))return document.createTextNode('');
 const s=getComputedStyle(n);if(s.display==='none')return document.createTextNode('');
 let css=Array.from(s,(k:string)=>`${k}:${s.getPropertyValue(k)}`).join(';');
 // Off-screen parts keep their box (so the visible part stays where it is) but nothing inside is copied.
 const r=n.getBoundingClientRect(),out=r.bottom<0||r.top>innerHeight||r.right<0||r.left>innerWidth;
 if(out&&s.position!=='fixed'&&n!==document.body&&!n.closest('svg')){const c=n.cloneNode(false);c.removeAttribute('id');c.setAttribute('style',css+';visibility:hidden;background:none');if(c.tagName==='IMG')c.removeAttribute('src');return c}
 let c:any;if(n instanceof HTMLCanvasElement){c=document.createElement('img');try{c.src=n.toDataURL()}catch{}}else c=n.cloneNode(false);
 if(/url\("/.test(css))css=await inlineURLs(css,cache);c.setAttribute('style',css+';animation:none;transition:none');c.removeAttribute?.('id');
 if(isPrivate(n)&&!(n instanceof HTMLInputElement)&&!(n instanceof HTMLTextAreaElement)){c.textContent='••••';return c}
 if(n instanceof HTMLImageElement){const src=n.currentSrc||n.src;try{c.src=src.startsWith('data:')?src:cache.get(src)||await dataURL(await (await fetch(src)).blob())}catch{c.removeAttribute('src')}c.removeAttribute('srcset');c.removeAttribute('loading')}
 if(n instanceof HTMLInputElement||n instanceof HTMLTextAreaElement||n instanceof HTMLSelectElement){const d=document.createElement('div');d.setAttribute('style',c.getAttribute('style')+';overflow:hidden;white-space:pre-wrap');d.textContent=isPrivate(n)?'••••':n instanceof HTMLSelectElement?(n.selectedOptions[0]?.textContent||''):(n.type==='checkbox'||n.type==='radio'?(n.checked?'☑':'☐'):(n.value||n.placeholder||''));return d}
 if(!(n instanceof HTMLCanvasElement))for(const ch of n.childNodes)c.appendChild(await cloneNode(ch,cache));
 if(n.scrollTop||n.scrollLeft){const inner=document.createElement('div');while(c.firstChild)inner.appendChild(c.firstChild);inner.setAttribute('style',`transform:translate(-${n.scrollLeft}px,-${n.scrollTop}px)`);c.style.overflow='hidden';c.appendChild(inner)}
 return c}
async function paintFallback(c:HTMLCanvasElement){
 const g=c.getContext('2d')!;g.fillStyle=getComputedStyle(document.body).backgroundColor||'#fff';g.fillRect(0,0,c.width,c.height);g.save();g.scale(c.width/innerWidth,c.height/innerHeight);
 const paint=async(n:any)=>{if(n.nodeType!==1||skip(n)||!shown(n))return;const r=n.getBoundingClientRect(),s=getComputedStyle(n);g.save();
  if(s.overflowX!=='visible'||s.overflowY!=='visible'){g.beginPath();g.rect(r.x,r.y,r.width,r.height);g.clip()}
  if(s.backgroundColor&&s.backgroundColor!=='rgba(0, 0, 0, 0)'){g.fillStyle=s.backgroundColor;g.beginPath();(g as any).roundRect?.(r.x,r.y,r.width,r.height,Math.min(parseFloat(s.borderRadius)||0,r.width/2,r.height/2));if(!(g as any).roundRect)g.rect(r.x,r.y,r.width,r.height);g.fill()}
  if(isPrivate(n)){g.font=`${s.fontSize} ${s.fontFamily}`;g.fillStyle=s.color;g.fillText('••••',r.x+8,r.y+16);g.restore();return}
  if(n instanceof HTMLImageElement&&n.complete&&n.naturalWidth){try{g.drawImage(n,r.x,r.y,r.width,r.height)}catch{}}
  else if(n instanceof HTMLInputElement||n instanceof HTMLTextAreaElement){g.font=`${s.fontSize} ${s.fontFamily}`;g.fillStyle=s.color;g.textBaseline='top';g.fillText(n.value||n.placeholder||'',r.x+8,r.y+8)}
  else for(const ch of n.childNodes){if(ch.nodeType===1)await paint(ch);else if(ch.nodeType===3&&ch.textContent!.trim()){const range=document.createRange();g.font=`${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;g.fillStyle=s.color;g.textBaseline='top';const text=ch.textContent!;let line='',x=0,y=-1;for(let i=0;i<text.length;i++){range.setStart(ch,i);range.setEnd(ch,i+1);const p=range.getBoundingClientRect();if(p.top!==y){if(line)g.fillText(line,x,y);line='';x=p.left;y=p.top}line+=text[i]}if(line)g.fillText(line,x,y)}}
  g.restore()};
 for(const n of document.body.children)await paint(n);g.restore()}
async function captureScreen():Promise<string>{
 const W=innerWidth,H=innerHeight,scale=Math.min(1,960/W),c=document.createElement('canvas');c.width=Math.round(W*scale);c.height=Math.round(H*scale);const g=c.getContext('2d')!;
 try{const cache=new Map<string,string>(),body=await cloneNode(document.body,cache);body.style.position='relative';body.style.margin='0';body.style.top=-scrollY+'px';body.style.left=-scrollX+'px';body.style.width=document.body.clientWidth+'px';
  const wrap=document.createElement('div');wrap.setAttribute('style',`width:${W}px;height:${H}px;overflow:hidden;position:relative;background:${getComputedStyle(document.body).backgroundColor}`);wrap.appendChild(body);
  const html=new XMLSerializer().serializeToString(wrap),svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><foreignObject width="100%" height="100%">${html}</foreignObject></svg>`;
  const img=await imageOf('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg));g.drawImage(img,0,0,c.width,c.height);
  const px=g.getImageData(0,0,c.width,c.height).data;let ink=false;for(let p=3;p<px.length;p+=97)if(px[p]){ink=true;break}if(!ink)throw Error('empty')}
 catch{c.width=c.width;await paintFallback(c)}
 return c.toDataURL('image/jpeg',.82)}
// Pictures are re-encoded here (strips camera/location metadata) and kept small: JPEG, ≤1280 px, ≤ ~280 KB.
async function shrink(src:string){const img=await imageOf(src),k=Math.min(1,1280/Math.max(img.naturalWidth,img.naturalHeight)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.naturalWidth*k));c.height=Math.max(1,Math.round(img.naturalHeight*k));c.getContext('2d')!.drawImage(img,0,0,c.width,c.height);return c}
function encode(c:HTMLCanvasElement){let q=.78,s=c.toDataURL('image/jpeg',q);while(s.length>380000&&q>.35){q-=.12;s=c.toDataURL('image/jpeg',q)}if(s.length>380000){const h=document.createElement('canvas');h.width=Math.round(c.width/2);h.height=Math.round(c.height/2);h.getContext('2d')!.drawImage(c,0,0,h.width,h.height);s=h.toDataURL('image/jpeg',.6)}return s}
// The picture after the parts the reporter hid (pixelated so nothing underneath can be read).
function rendered(base:HTMLCanvasElement,boxes:any[]){const c=document.createElement('canvas');c.width=base.width;c.height=base.height;const g=c.getContext('2d')!;g.drawImage(base,0,0);
 for(const b of boxes){const x=Math.round(b.x*c.width),y=Math.round(b.y*c.height),w=Math.max(1,Math.round(b.w*c.width)),h=Math.max(1,Math.round(b.h*c.height)),cell=Math.max(10,Math.round(Math.min(c.width,c.height)/40)),t=document.createElement('canvas');t.width=Math.max(1,Math.ceil(w/cell));t.height=Math.max(1,Math.ceil(h/cell));const tg=t.getContext('2d')!;tg.drawImage(c,x,y,w,h,0,0,t.width,t.height);g.imageSmoothingEnabled=false;g.drawImage(t,0,0,t.width,t.height,x,y,w,h);g.imageSmoothingEnabled=true;g.fillStyle='rgba(120,120,120,.35)';g.fillRect(x,y,w,h)}
 return c}

// ---------- the sheet ----------
const TYPES=[['bug','💥','Có lỗi','Something broke'],['looks','👀','Hiển thị sai','Looks wrong'],['words','💬','Chữ hoặc dịch','Words or translation'],['idea','💡','Ý tưởng','Idea'],['other','✳️','Khác','Other']];
const STATUS_WORDS:any={new:['Mới gửi','Sent'],triaged:['Đã xem','Seen'],fixing:['Đang sửa','Being fixed'],fixed:['Đã sửa — bạn thử lại nhé','Fixed — please check'],closed:['Đã xong','Done'],back:['Vẫn còn lỗi','Still wrong'],wontfix:['Không thay đổi','No change planned']};
let layer:any=null,tab='send',draft:any={type:'bug',note:'',base:null,boxes:[],hideMode:false},mineCache:any=get(K.mine,null),mineLoading=false,returnFocus:any=null,busy=false,notice='';
const typeName=(t:string)=>{const x=TYPES.find(y=>y[0]===t)||TYPES[4];return T(x[2],x[3])};
function sheetHTML(){const c=context(),q=outbox(),items=mineCache?.items||[],unread=+status?.unread||0;
 const tabs=`<div class="lb-tabs" role="tablist"><button type="button" role="tab" id="lb-tab-send" aria-controls="lb-panel-send" aria-selected="${tab==='send'}" tabindex="${tab==='send'?0:-1}" data-tab="send">${T('Gửi góp ý','Send feedback')}</button><button type="button" role="tab" id="lb-tab-mine" aria-controls="lb-panel-mine" aria-selected="${tab==='mine'}" tabindex="${tab==='mine'?0:-1}" data-tab="mine">${T('Góp ý của tôi','My feedback')}${unread?` <span class="lb-pill">${unread}</span>`:''}</button></div>`;
 const send=`<div class="lb-panel" role="tabpanel" id="lb-panel-send" aria-labelledby="lb-tab-send" ${tab==='send'?'':'hidden'}>
  <p class="lb-intro">${T('Thấy gì chưa ổn hay có ý tưởng? Viết vài dòng — nhóm làm app sẽ đọc và trả lời tại đây.','Something not right, or an idea? Write a few words — the app team reads every one and replies here.')}</p>
  <fieldset class="lb-types"><legend>${T('Loại góp ý','Kind of feedback')}</legend><div role="radiogroup" aria-label="${T('Loại góp ý','Kind of feedback')}">${TYPES.map(([id,ic,vi,en])=>`<button type="button" role="radio" class="lb-type" data-type="${id}" aria-checked="${draft.type===id}" tabindex="${draft.type===id?0:-1}"><span aria-hidden="true">${ic}</span>${esc(T(vi,en))}</button>`).join('')}</div></fieldset>
  <label class="lb-field"><span>${T('Chuyện gì xảy ra? Bạn mong điều gì?','What happened? What did you expect?')}</span><textarea id="lb-note" rows="4" maxlength="1000" required>${esc(draft.note)}</textarea><small class="lb-count" aria-live="polite">${draft.note.length}/1000</small></label>
  <div class="lb-pic">${draft.base?`<div class="lb-preview"><canvas id="lb-canvas" class="${draft.hideMode?'lb-hiding':''}" role="img" aria-label="${T('Ảnh sẽ gửi kèm','Picture to send')}"></canvas></div>
   <p class="lb-hint">${draft.hideMode?T('Kéo trên ảnh để che phần riêng tư (tên, ghi chú…). Phần che sẽ bị làm mờ hẳn.','Drag on the picture to hide private parts (names, notes…). Hidden parts are fully blurred.'):T('Chỉ gửi ảnh nếu bạn muốn. Che tên hoặc thông tin riêng trước khi gửi.','Only send a picture if you want to. Hide names or private details before sending.')}</p>
   <div class="lb-row"><button type="button" class="lb-btn" data-act="hide" aria-pressed="${draft.hideMode}">🫥 ${draft.hideMode?T('Xong che','Done hiding'):T('Che bớt','Hide parts')}</button>${['top','middle','bottom'].map((p,i)=>`<button type="button" class="lb-btn lb-small" data-hide-band="${i}">${esc([T('Che 1/3 trên','Hide top third'),T('Che 1/3 giữa','Hide middle third'),T('Che 1/3 dưới','Hide bottom third')][i])}</button>`).join('')}<button type="button" class="lb-btn" data-act="undo" ${draft.boxes.length?'':'disabled'}>↶ ${T('Bỏ che cuối','Undo hide')}</button><button type="button" class="lb-btn lb-danger" data-act="remove-shot">🗑 ${T('Xoá ảnh','Remove picture')}</button></div>`
  :`<div class="lb-row"><button type="button" class="lb-btn" data-act="shot">📷 ${T('Chụp màn hình','Take screenshot')}</button><label class="lb-btn lb-file">🖼 ${T('Chọn ảnh','Choose a picture')}<input type="file" id="lb-file" accept="image/*"></label></div><p class="lb-hint">${T('Không bắt buộc. Ảnh chỉ được chụp khi bạn bấm, và bạn xem lại trước khi gửi.','Optional. A picture is only taken when you press the button, and you see it before sending.')}</p>`}</div>
  <details class="lb-ctx"><summary>${T('Thông tin kỹ thuật gửi kèm','Technical details sent with it')}</summary><dl>${contextRows(c).map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}<div><dt>${T('Lỗi gần đây của app','Recent app errors')}</dt><dd>${errors.length?`<ul>${errors.map(e=>`<li>${esc(scrub(e))}</li>`).join('')}</ul>`:T('không có','none')}</dd></div></dl><p class="lb-hint">${T('Không gửi tên, email, công thức hay dữ liệu gia đình — trừ khi chúng hiện trong ảnh bạn chọn gửi.','No names, email, recipes or family data are sent — unless they appear in a picture you choose to send.')} <a href="/feedback-privacy.html" target="_blank" rel="noopener">${T('Quyền riêng tư','Privacy')}</a></p></details>
  <p class="lb-status" role="status" aria-live="polite" id="lb-status"></p>
  <div class="lb-foot"><button type="button" class="lb-btn" data-act="retry" ${q.length?'':'hidden'}>↻ ${T('Gửi lại','Retry')}</button><button type="button" class="lb-btn" data-act="close">${T('Huỷ','Cancel')}</button><button type="button" class="lb-btn lb-primary" data-act="send">${T('Gửi','Send')}</button></div></div>`;
 const waiting=q.map((r:any)=>`<li class="lb-item lb-waiting"><div class="lb-item-top"><span class="lb-chip">${T('Đang chờ gửi','Waiting to send')}</span><span class="lb-when">${esc(new Date(r.at).toLocaleString(c.lang==='en'?'en-AU':'vi-VN'))}</span></div><p><b>${esc(typeName(r.body.type))}</b> · ${esc(r.body.note.slice(0,160))}</p>${r.droppedShot?`<p class="lb-hint">${T('Ảnh không lưu được trên máy khi ngoại tuyến; chỉ gửi chữ.','The picture could not be kept offline; only the text will be sent.')}</p>`:''}</li>`).join('');
 const sent=items.map((x:any)=>`<li class="lb-item${x.unread?' lb-unread':''}" data-id="${esc(x.id)}"><div class="lb-item-top"><span class="lb-chip lb-s-${esc(x.status)}">${esc(T(...(STATUS_WORDS[x.status]||STATUS_WORDS.new) as [string,string]))}</span><span class="lb-when">${esc(new Date(x.at).toLocaleString(c.lang==='en'?'en-AU':'vi-VN'))}</span></div><p><b>${esc(typeName(x.type))}</b> · ${esc(x.note.slice(0,240))}${x.hasShot?' <span aria-label="'+T('có ảnh','with picture')+'">📷</span>':''}</p>
  ${x.replies.length?`<ul class="lb-replies">${x.replies.map((r:any)=>`<li><b>${T('Nhóm làm app','App team')}</b> <span class="lb-when">${esc(new Date(r.at).toLocaleDateString(c.lang==='en'?'en-AU':'vi-VN'))}</span><p>${esc(r.text)}</p></li>`).join('')}</ul>`:''}
  ${x.canConfirm?`<div class="lb-row"><button type="button" class="lb-btn lb-primary" data-confirm="1" data-id="${esc(x.id)}">✓ ${T('Đã ổn','Yes, fixed')}</button><button type="button" class="lb-btn" data-confirm="0" data-id="${esc(x.id)}">${T('Vẫn còn lỗi','Still wrong')}</button></div>`:''}</li>`).join('');
 const mine=`<div class="lb-panel" role="tabpanel" id="lb-panel-mine" aria-labelledby="lb-tab-mine" ${tab==='mine'?'':'hidden'}>${!online()&&!mineCache?`<p class="lb-hint">${T('Đang ngoại tuyến. Danh sách sẽ hiện khi có mạng.','Offline. The list appears when you are online.')}</p>`:''}${mineLoading&&!mineCache?`<p class="lb-hint">${T('Đang tải…','Loading…')}</p>`:''}
  ${waiting||sent?`<ul class="lb-list">${waiting}${sent}</ul>`:(mineCache?`<p class="lb-empty">${T('Chưa có góp ý nào. Chạm con bọ rùa khi thấy gì chưa ổn.','Nothing yet. Tap the ladybug when something looks wrong.')}</p>`:'')}
  <div class="lb-foot"><button type="button" class="lb-btn" data-act="min">⤡ ${T('Thu nhỏ bọ rùa','Tuck the ladybug away')}</button><button type="button" class="lb-btn" data-act="reset">⌂ ${T('Đặt lại vị trí','Reset its place')}</button><button type="button" class="lb-btn" data-act="close">${T('Đóng','Close')}</button></div></div>`;
 return `<div class="lb-backdrop" data-act="close"></div><section class="lb-sheet${entering?' lb-enter':''}" role="dialog" aria-modal="true" aria-labelledby="lb-title" tabindex="-1"><header class="lb-head"><span class="lb-head-bug" aria-hidden="true">${BUG_SVG}</span><h2 id="lb-title">${T('Góp ý','Feedback')}</h2><span class="lb-net ${online()?'on':'off'}">${online()?T('Trực tuyến','Online'):T('Ngoại tuyến','Offline')}</span><button type="button" class="lb-x" data-act="close" aria-label="${T('Đóng','Close')}">✕</button></header>${tabs}<div class="lb-body">${send}${mine}</div></section>`}
function paintSheetStatus(){const el=layer?.querySelector('#lb-status');if(!el)return;const q=outbox().length;const r=layer.querySelector('[data-act="retry"]');if(r)r.hidden=!q;
 el.textContent=notice||(!online()?T(`Đang ngoại tuyến. Góp ý sẽ được lưu trên máy này và tự gửi khi có mạng${q?` (${q} đang chờ)`:''}.`,`You are offline. Feedback is saved on this device and sent automatically when you are back online${q?` (${q} waiting)`:''}.`)
  :flushing?T('Đang gửi…','Sending…'):q?T(`${q} góp ý đang chờ gửi.`,`${q} waiting to send.`):lastResult?.refused?T('Một góp ý không được nhận: ','One report was not accepted: ')+lastResult.refused:'')}
function drawCanvas(){const cv=layer?.querySelector('#lb-canvas');if(!cv||!draft.base)return;const r=rendered(draft.base,draft.boxes);cv.width=r.width;cv.height=r.height;cv.getContext('2d').drawImage(r,0,0)}
// Redraws keep the focus where it was (a background refresh must not drop keyboard users out of the sheet).
function focusKey(){const a:any=document.activeElement;if(!layer||!a||!layer.contains(a))return '';if(a.id)return '#'+a.id;for(const k of ['act','type','tab','confirm','hideBand'])if(a.dataset?.[k]!==undefined){const attr='data-'+k.replace(/[A-Z]/g,(c:string)=>'-'+c.toLowerCase());return `[${attr}="${a.dataset[k]}"]${a.dataset.id?`[data-id="${a.dataset.id}"]`:''}`}return ''}
function render(focusSel?:string){if(!layer)return;const ta=layer.querySelector('#lb-note');if(ta)draft.note=ta.value;const keepFocus=focusSel||focusKey(),caret=ta&&document.activeElement===ta?[ta.selectionStart,ta.selectionEnd]:null;focusSel=keepFocus;const y=layer.querySelector('.lb-body')?.scrollTop||0;layer.innerHTML=sheetHTML();const body=layer.querySelector('.lb-body');if(body)body.scrollTop=y;drawCanvas();paintSheetStatus();wire();const f:any=focusSel?layer.querySelector(focusSel):null;if(f){f.focus({preventScroll:true});if(caret&&f.id==='lb-note')try{f.setSelectionRange(caret[0],caret[1])}catch{}}else layer.querySelector('.lb-sheet')?.focus?.()}
function focusables(){return [...layer.querySelectorAll('button:not([disabled]),[href],textarea,input,summary,[tabindex]:not([tabindex="-1"])')].filter((n:any)=>!n.closest('[hidden]')&&n.getClientRects().length)}
function onSheetKey(e:any){if(e.key==='Escape'){e.preventDefault();if(draft.hideMode){draft.hideMode=false;render('[data-act="hide"]');return}closeSheet();return}
 if(e.key==='Tab'){const f=focusables();if(!f.length)return;const first:any=f[0],last:any=f[f.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}}
// v1.7.16 (owner, 8 Nov 2026: “Khi ấn mấy cái nút này màn hình nó nhảy”): the sheet is drawn again on every tap; its slide-up
// played each time and the tab bar moved with the sheet's height. It slides up only when it opens, and keeps one height.
let entering=false;
function openSheet(which?:string){
 if(layer){if(which){tab=which;render()}return}
 returnFocus=document.activeElement;if(which)tab=which;else if((+status?.unread||0)>0)tab='mine';notice='';
 layer=document.createElement('div');layer.className='lb-layer';document.body.append(layer);document.documentElement.classList.add('lb-open');
 layer.addEventListener('keydown',onSheetKey);entering=true;render();entering=false;(layer.querySelector(tab==='send'?'#lb-note':'#lb-tab-mine') as any)?.focus?.();
 if(tab==='mine'||!mineCache)void loadMine()}
function closeSheet(restore=true){if(!layer)return;const ta=layer.querySelector('#lb-note');if(ta)draft.note=ta.value;draft.hideMode=false;layer.remove();layer=null;document.documentElement.classList.remove('lb-open');if(restore)(btn&&btn.isConnected?btn:returnFocus)?.focus?.()}
async function loadMine(){if(!online()||mineLoading)return;mineLoading=true;try{const d=await call('mine');mineCache={items:d.items||[],at:Date.now()};put(K.mine,mineCache);status={...(status||{}),unread:+d.unread||0};put(K.status,status);paint()}catch{}finally{mineLoading=false}
 if(layer){render();if(tab==='mine')void markSeen()}}
async function markSeen(){const ids=(mineCache?.items||[]).filter((x:any)=>x.unread&&!x.canConfirm).map((x:any)=>x.id);if(!ids.length)return;try{await call('seen',{method:'POST',body:{ids}});for(const x of mineCache.items)if(ids.includes(x.id))x.unread=0;put(K.mine,mineCache);status={...(status||{}),unread:mineCache.items.reduce((n:number,x:any)=>n+(x.unread||0),0)};put(K.status,status);paint();if(layer)render()}catch{}}
async function takeScreenshot(){
 if(busy)return;busy=true;const note=layer.querySelector('#lb-note');if(note)draft.note=note.value;
 layer.style.visibility='hidden';if(btn)btn.style.visibility='hidden';document.documentElement.classList.remove('lb-open');
 await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
 try{const shot=await captureScreen();draft.base=await shrink(shot);draft.boxes=[];notice=''}catch{notice=T('Chưa chụp được màn hình. Bạn có thể chọn ảnh từ máy.','Could not take a screenshot. You can choose a picture instead.')}
 finally{busy=false;if(btn)btn.style.visibility='';if(layer){layer.style.visibility='';document.documentElement.classList.add('lb-open');render('[data-act="hide"]')}}}
async function attachFile(file:any){if(!file||!/^image\//.test(file.type)||file.size>15e6){notice=T('Hãy chọn một ảnh (tối đa 15 MB).','Choose an image (up to 15 MB).');render();return}
 try{const url=URL.createObjectURL(file);try{draft.base=await shrink(url)}finally{URL.revokeObjectURL(url)}draft.boxes=[];notice=''}catch{notice=T('Không đọc được ảnh này.','Could not read this picture.')}render('[data-act="hide"]')}
function wireHiding(){const cv=layer.querySelector('#lb-canvas');if(!cv||!draft.hideMode)return;let start:any=null,box:any=null;
 const at=(e:any)=>{const r=cv.getBoundingClientRect();return{x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))}};
 cv.addEventListener('pointerdown',(e:any)=>{e.preventDefault();cv.setPointerCapture(e.pointerId);start=at(e);box={x:start.x,y:start.y,w:0,h:0};draft.boxes.push(box)});
 cv.addEventListener('pointermove',(e:any)=>{if(!start)return;const p=at(e);box.x=Math.min(start.x,p.x);box.y=Math.min(start.y,p.y);box.w=Math.abs(p.x-start.x);box.h=Math.abs(p.y-start.y);drawCanvas()});
 const end=()=>{if(!start)return;start=null;if(box.w<.01||box.h<.01)draft.boxes.pop();box=null;render()};cv.addEventListener('pointerup',end);cv.addEventListener('pointercancel',end)}
function send(){
 const ta=layer.querySelector('#lb-note');draft.note=ta.value;const note=draft.note.trim();
 if(note.length<3){notice=T('Viết ít nhất vài chữ nhé.','Please write at least a few words.');paintSheetStatus();ta.focus();ta.setAttribute('aria-invalid','true');return}
 const ctx=context();ctx.queued=!online();
 const body={clientId:rid(18),type:draft.type,note,ctx,errors:errors.map(scrub),shot:draft.base?encode(rendered(draft.base,draft.boxes)):null};
 const r=enqueue(body);
 if(!r.ok){notice=r.reason==='full'?T('Đã có 10 góp ý chờ gửi. Hãy kết nối mạng để gửi bớt.','10 reports are already waiting. Go online to send them first.'):T('Chưa lưu được góp ý trên máy này. Thử bỏ ảnh rồi gửi lại.','Could not save the feedback on this device. Try without the picture.');paintSheetStatus();return}
 draft={type:'bug',note:'',base:null,boxes:[],hideMode:false};notice='';
 const msg=online()?T('Cảm ơn bạn! Góp ý đang được gửi.','Thank you! Your feedback is on its way.'):T('Đã lưu. Góp ý sẽ tự gửi khi có mạng.','Saved. It will be sent when you are back online.');
 closeSheet();if(r.withoutPictures)announce(T('Đã lưu chữ; ảnh quá lớn để giữ trên máy khi ngoại tuyến.','Text saved; the picture was too large to keep offline.'));else announce(msg)}
function wire(){
 layer.querySelectorAll('[data-tab]').forEach((b:any)=>b.addEventListener('click',()=>{tab=b.dataset.tab;render('#lb-tab-'+tab);if(tab==='mine'){void loadMine();void markSeen()}}));
 const tl=layer.querySelector('.lb-tabs');tl?.addEventListener('keydown',(e:any)=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();tab=tab==='send'?'mine':'send';render('#lb-tab-'+tab);if(tab==='mine')void loadMine()}});
 const rg=layer.querySelector('[role=radiogroup]');rg?.addEventListener('keydown',(e:any)=>{const ids=TYPES.map(t=>t[0]),i=ids.indexOf(draft.type);let n=-1;if(e.key==='ArrowRight'||e.key==='ArrowDown')n=(i+1)%ids.length;else if(e.key==='ArrowLeft'||e.key==='ArrowUp')n=(i-1+ids.length)%ids.length;if(n<0)return;e.preventDefault();draft.type=ids[n];render(`[data-type="${ids[n]}"]`)});
 layer.querySelectorAll('[data-type]').forEach((b:any)=>b.addEventListener('click',()=>{draft.type=b.dataset.type;render(`[data-type="${draft.type}"]`)}));
 const ta=layer.querySelector('#lb-note');ta?.addEventListener('input',()=>{draft.note=ta.value;const c=layer.querySelector('.lb-count');if(c)c.textContent=ta.value.length+'/1000';if(ta.value.trim().length>=3)ta.removeAttribute('aria-invalid')});
 layer.querySelector('#lb-file')?.addEventListener('change',(e:any)=>attachFile(e.target.files?.[0]));
 layer.querySelectorAll('[data-hide-band]').forEach((b:any)=>b.addEventListener('click',()=>{const i=+b.dataset.hideBand;draft.boxes.push({x:0,y:i/3,w:1,h:1/3});render(`[data-hide-band="${i}"]`)}));
 layer.querySelectorAll('[data-confirm]').forEach((b:any)=>b.addEventListener('click',async()=>{b.disabled=true;try{await call('confirm',{method:'POST',body:{id:b.dataset.id,fixed:b.dataset.confirm==='1'}});announce(b.dataset.confirm==='1'?T('Cảm ơn bạn đã kiểm tra!','Thanks for checking!'):T('Cảm ơn — nhóm làm app sẽ xem lại.','Thanks — the app team will look again.'));mineCache=null;await loadMine()}catch(e:any){b.disabled=false;announce(e.message)}}));
 const acts:any={close:()=>closeSheet(),shot:()=>takeScreenshot(),send,retry:()=>{notice='';void flush()},min:()=>{closeSheet();setMin(true)},reset:()=>{closeSheet();resetPos()},
  hide:()=>{draft.hideMode=!draft.hideMode;render('[data-act="hide"]')},undo:()=>{draft.boxes.pop();render('[data-act="undo"]')},'remove-shot':()=>{draft.base=null;draft.boxes=[];draft.hideMode=false;render('[data-act="shot"]')}};
 layer.querySelectorAll('[data-act]').forEach((b:any)=>{if(b.tagName==='LABEL')return;b.addEventListener('click',(e:any)=>{e.preventDefault();acts[b.dataset.act]?.()})});
 wireHiding()}

// ---------- start (after load, when idle; never blocks startup) ----------
let started=false;
function start(){if(started)return;started=true;
 apply();void refresh().then(()=>{flush();openMineFromLink()});
 addEventListener('online',()=>{void refresh().then(()=>flush())});addEventListener('offline',()=>{paint();if(layer)render()});
 addEventListener('bep-connectivity',()=>{if(online()){void refresh().then(()=>flush())}if(layer)render()});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&status?.at&&Date.now()-status.at>STATUS_EVERY)void refresh()});
 setInterval(()=>{void refresh()},STATUS_EVERY);setInterval(()=>{if(outbox().length)void flush()},FLUSH_EVERY);
 // Language switch re-labels the bug and redraws an open sheet with the draft kept.
 if(typeof changeAppLanguage==='function'){const base=changeAppLanguage;changeAppLanguage=function(this:any,...a:any[]){const r=base.apply(this,a);paint();if(layer)render();return r}}}
// v1.7.16 (owner, 8 Nov 2026: “cái nào không dùng được nó sẽ tự pick lỗi”; pop-up: send automatically): the self-test sends what
// failed as one report, through the same outbox as a report the family writes (kept on the device when offline)
function autoReport(note:string,shot?:string|null){const ctx=context();ctx.queued=!online();(ctx as any).selfTest=true;return enqueue({clientId:rid(18),type:'bug',note:String(note).slice(0,1000),ctx,errors:errors.map(scrub),shot:shot||null})}
// v1.7.19 (owner pop-up, 12 Nov 2026: “mở thẳng Góp ý của tôi”): a reply notification links to #today?lb=mine — open the
// ladybug on that tab once we know it is shown for this person, and leave a plain #today behind
let mineLinkAtLoad=/^#today\?lb=mine$/.test(location.hash);
function openMineFromLink(){if(!mineLinkAtLoad&&!/^#today\?lb=mine$/.test(location.hash))return;mineLinkAtLoad=false;try{history.replaceState(history.state,'',location.pathname+location.search+'#today')}catch{}
 const go=()=>{if(visible()){apply();openSheet('mine')}};if(status?.visible)go();else void refresh().then(go)}
addEventListener('hashchange',openMineFromLink);
(globalThis as any).bepLadybug={autoReport,refresh,flush,open:openSheet,close:closeSheet,outbox,reset:resetPos,minimize:setMin,layout,setPosition:(side:string,y:number)=>{saved={side,y};put(K.pos,saved);layout()},state:()=>({visible:visible(),mounted:!!btn,minimized,saved,status,yielded,queued:outbox().length,sheet:!!layer,tab}),capture:captureScreen};
const idle=(f:any)=>typeof (globalThis as any).requestIdleCallback==='function'?(globalThis as any).requestIdleCallback(f,{timeout:3000}):setTimeout(f,1200);
if(document.readyState==='complete')idle(start);else addEventListener('load',()=>idle(start),{once:true});
})();
