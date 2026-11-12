// Permanent audit sweep (AGENTS.md rule 35) — owner, 12 Nov 2026 (Sydney time): “Vậy bài học ở đây sau khi bị nhiều lỗi là
// gì thêm vào skill và những thứ khác để không bị lặp lại.” The 12 Nov whole-app audit (docs/reviews/audit-20261112/) found its
// problems by hand: buttons that open empty sheets, counts that do not match, silent defaults, Vietnamese in English mode,
// emoji, small targets, device-zone times, weeks read by Monday and states the app cannot load back. This suite does the
// same walk automatically on every release.
//
// What it does, per pass (data set × language × size, plus a Saturday-start week and a Ho Chi Minh City phone):
//  - serves dist/ through page.route (no live server, every /.netlify/ call answered locally, other hosts refused), service
//    workers blocked, device-only mode;
//  - seeds realistic data with the app globals (full set) or nothing at all (empty set);
//  - on every screen (Hôm nay, Thực đơn, Đi chợ, Món ăn, Tủ, Chi tiêu, Thói quen, Giá / So Giá) and on the top bar and its
//    More / account items, taps every visible control that has a dispatcher (data-action, data-change, data-planning, data-fm …)
//    in a fresh page state, and every control inside each sheet that opens (two levels);
//  - after each tap checks: page errors, sheet content, “(n)” counts, page jumps (rule 24), sheet footers (rule 25), drawings
//    (rule 27), language, emoji (rule 19), ≥ 44 px targets, sideways overflow, Sydney time (rule 22), the validImport /
//    JSON / sync-merge round trip (rule 33), weeks read through the family's start day and stored under their Monday, never a hidden copy (rule 34) and, for every sheet that saves,
//    a save without touching any field (rule 32: no silent defaults).
// Output: one line per failure — screen › control › check: detail — grouped over the passes where it happened.
// Environment: AUDIT_PASSES=id,id (subset), AUDIT_SCREENS=today,shopping (subset), AUDIT_CONCURRENCY (default 3),
// AUDIT_LEVEL2=0 (screens only), AUDIT_JSON=path (write every failure and skip as JSON), AUDIT_DEBUG=1 (print each form
// check). Chromium viewport simulation only.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const origin='https://kitchen.test';
const mime:any={'.js':'application/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.webmanifest':'application/manifest+json','.woff2':'font/woff2'};

// ---------------------------------------------------------------------------------------------------------------------------
// Passes. The Sydney twin of the time-zone pass is full-vi-375 (same data and language; only the phone's zone differs).
// deep: also tap every control inside each sheet that opens (two levels). The 320 px and settings passes tap one level.
const ALL_PASSES:any[]=[
 {id:'full-vi-375',data:'full',lang:'vi',w:375,h:812,deep:true},
 {id:'full-en-375',data:'full',lang:'en',w:375,h:812,deep:true},
 {id:'full-vi-320',data:'full',lang:'vi',w:320,h:740},
 {id:'full-en-320',data:'full',lang:'en',w:320,h:740},
 {id:'empty-vi-375',data:'empty',lang:'vi',w:375,h:812,deep:true},
 {id:'empty-en-375',data:'empty',lang:'en',w:375,h:812,deep:true},
 {id:'empty-vi-320',data:'empty',lang:'vi',w:320,h:740},
 {id:'empty-en-320',data:'empty',lang:'en',w:320,h:740},
 {id:'full-vi-375-saturday',data:'full',lang:'vi',w:375,h:812,weekStartDay:6},
 {id:'full-vi-375-hcm',data:'full',lang:'vi',w:375,h:812,tz:'Asia/Ho_Chi_Minh',twin:'full-vi-375'},
];
const SCREENS=['today','planner','shopping','recipes','pantry','expenses','insights','products','topbar'];
const SCREEN_NAME:any={today:'Hôm nay',planner:'Thực đơn',shopping:'Đi chợ',recipes:'Món ăn',pantry:'Tủ',expenses:'Chi tiêu',insights:'Thói quen',products:'Giá / So Giá',topbar:'Thanh trên / Thêm / Tài khoản'};
const pickPasses=(process.env.AUDIT_PASSES||'').split(',').filter(Boolean),pickScreens=(process.env.AUDIT_SCREENS||'').split(',').filter(Boolean);
const PASSES=pickPasses.length?ALL_PASSES.filter(p=>pickPasses.includes(p.id)):ALL_PASSES;
const RUN_SCREENS=pickScreens.length?SCREENS.filter(s=>pickScreens.includes(s)):SCREENS;
const CONCURRENCY=Math.max(1,+(process.env.AUDIT_CONCURRENCY||4)),LEVEL2=process.env.AUDIT_LEVEL2!=='0';

// Seeded family content: names typed by the family (rule 21: never rewritten, so not app chrome). Marked so the language and
// emoji checks do not count them as interface text.
const SEED={recipe:'Gà luộc lá chanh nhà Bà Tư',prep:'Làm sạch gà nhà Bà Tư',step:'Luộc gà nhà Bà Tư khoảng 40 phút',ingredient:'Gà trống thả vườn',extraFree:'Giấy bếp cuộn lớn',extraFreeQty:'1 gói',guest:'Cô Hai Lan',store:'Chợ Cabramatta QA',receiptLine1:'PORK MINCE 500G',receiptLine2:'KITCHEN TOWEL'};
// Known timestamp: 2026-11-11T14:47Z is 01:47 on 12/11 in Sydney (AEDT) and 21:47 on 11/11 in Ho Chi Minh City.
const KNOWN_TS='2026-11-11T14:47:00.000Z',KNOWN_SYD='01:47',KNOWN_HCM='21:47';

// ---------------------------------------------------------------------------------------------------------------------------
// Skips: destructive or outward actions only. Every skip is printed with its reason.
const SKIPS:[RegExp,string][]=[
 [/sign-?in|sign-?up|register|login|log-?in|auth|magic-?link|otp|passkey/i,'sign-in / account creation (outward)'],
 [/sign-?out|log-?out|delete-account|account-delete|close-account|leave-family|leave\b|unpair|forget-device|revoke/i,'sign-out / leaves or deletes the account'],
 [/wipe|erase|reset-all|reset-data|reset-app|reset-family|clear-all-data|factory/i,'wipes every family record on the device'],
[/\bsend\b|send-|share(?!-request)|invite|rsvp-send|copy-link|copy-invite|feedback|ladybug|report-bug|github|^report|\bbug\b|mailto|tel:/i,'sends or shares outside the app'],
 [/export|download|backup-file|print/i,'writes a file that leaves the app'],
 [/install|platform-action|beforeinstall/i,'opens the system install prompt'],
 [/reload|apply-update|update-app|sw-update/i,'reloads the app'],
 [/device-only|switch-account|account-current|connect-family|cloud-connect|cloud-disconnect|join-family|use-family/i,'switches account or family connection'],
 [/next-language|set-lang|app-language/i,'switches the pass language (covered by test:language:browser)'],
 [/data-push-action=(subscribe|unsubscribe|test)\b|enable-push|notification-permission/i,'asks the system for notification permission or sends a test notification'],
 [/data-push-action=(share-request|resend-request)\b/i,'sends a shopping request to the family'],
];
const skipReason=(c:any)=>{if(c.external)return 'link to another site (outward)';const hay=`${c.sel} ${c.attrs} ${c.label}`;for(const [re,why] of SKIPS)if(re.test(hay))return why;return null};

// ---------------------------------------------------------------------------------------------------------------------------
// In-page library (installed before the app starts; uses the app globals at call time).
function qaLib(){
 const W:any=window as any;if(W.__qa)return;
 const G=(s:string)=>(0,eval)(s);
 const DISPATCH=['data-action','data-change','data-planning','data-fm','data-feature','data-personal','data-house','data-flow','data-kx','data-mr','data-mr-recipe','data-product','data-scout','data-push-action','data-guide','data-install','data-insight','data-community','data-group-toggle','data-screen-mode','data-unit-choice','data-unit-action','data-confirm','data-nav','data-close-nav','data-account-current','data-ui-more','data-search','data-plan-meal','data-meal-more','data-rc','data-rci','data-rq','data-rshare','data-section','data-change-tab','data-set-lang','data-text-size','data-theme','data-sort','data-offline-download','data-vl-check','data-guest-step','data-qr-dir','data-rcrop','data-house','data-next-language','data-platform-action','data-nav-arrow','data-voice-lang','data-vc-suggest','data-ext-remove','data-want','data-store','data-flow-row'];
 const CONTROL_SEL='button,a[href],summary,select,input[type=checkbox],input[type=radio],[role=button],[role=tab],'+DISPATCH.map(a=>'['+a+']').join(',');
 const VOL=new Set(['id','date','type','index','i','idx','key','ing','ingredient','recipe','item','store','member','name','d','k','v','mrDate','mrType','mrRecipe','mrName','orig','url','flowRow','vcItem','vcSuggest','unitChoice','btnArt','art','customId','lot','day','meal','week','scope','dirty','en','edge','want','group','face','ret','rm','i2','value','label','qty','n','count']);
 const vis=(el:any)=>{if(!el||!el.isConnected)return false;const r=el.getBoundingClientRect();if(!(r.width>0&&r.height>0))return false;const s=getComputedStyle(el);return s.visibility!=='hidden'&&s.display!=='none'&&+s.opacity!==0};
 const clean=(t:any)=>String(t||'').replace(/\s+/g,' ').trim();
 const labelOf=(el:any)=>clean(el.tagName==='SELECT'?(el.getAttribute('aria-label')||el.closest('label')?.innerText||el.id||'select'):(el.innerText||el.textContent||'')).slice(0,60)||clean(el.getAttribute('aria-label')||el.getAttribute('title')||'').slice(0,60);
 const q=(v:string)=>v.replace(/["\\]/g,'\\$&');
 const selOf=(el:any)=>{const attrs=[...el.attributes].filter((a:any)=>a.name.startsWith('data-')&&!/^data-(qa|btn-art|art$|dirty)/.test(a.name));let s=el.tagName.toLowerCase();
  if(attrs.length)return s+attrs.map((a:any)=>`[${a.name}="${q(a.value)}"]`).join('');
  if(el.id)return '#'+CSS.escape(el.id);
  const h=el.getAttribute('href');if(h)s+=`[href="${q(h)}"]`;if(el.getAttribute('name'))s+=`[name="${q(el.getAttribute('name'))}"]`;if(el.getAttribute('aria-label'))s+=`[aria-label="${q(el.getAttribute('aria-label'))}"]`;
  return s+[...el.classList].slice(0,3).map((c:string)=>'.'+CSS.escape(c)).join('')};
 const sigOf=(el:any,label:string)=>{const ds=Object.entries(el.dataset).filter(([k])=>!VOL.has(k)&&!k.startsWith('qa')).map(([k,v])=>k+'='+v).sort().join(' ');const n=/\(\d+\)/.test(label)?' (n)':'';
  return el.tagName+'|'+(ds||clean(label).replace(/\d+([.,]\d+)?/g,'#').slice(0,40)+'|'+[...el.classList].slice(0,2).join('.'))+n};
 const roots=(scope:string)=>{if(scope==='topbar'){const shell=document.querySelector('.app-shell')||document.body;return {root:shell,exclude:(el:any)=>!!el.closest('#main,#modal-root')||(!!el.closest('nav,.sidebar')&&!el.matches('[data-ui-more]'))}}
  return {root:document.querySelector(scope),exclude:(el:any)=>!!el.closest('#lb-root')&&scope!=='#lb-root'}};
 const controls=(scope:string)=>{const {root,exclude}=roots(scope);if(!root)return[];const all=[...root.querySelectorAll(CONTROL_SEL)].filter((e:any)=>vis(e)&&!exclude(e)&&!e.disabled&&e.getAttribute('aria-disabled')!=='true');
  // a control inside another control with the same dispatcher is the same tap
  const list=all.filter((e:any)=>!all.some((p:any)=>p!==e&&p.contains(e)&&selOf(p)===selOf(e)));
  const out:any[]=[];const counter=new Map();
  for(const el of list as any[]){const sel=selOf(el);const same=[...root.querySelectorAll(sel)].filter((e:any)=>vis(e)&&!exclude(e));const idx=same.indexOf(el);const label=labelOf(el);const h=el.getAttribute('href')||'';
   const m=label.match(/\((\d+)\)/);
   out.push({sel,idx,label,sig:sigOf(el,label),n:m?+m[1]:null,tag:el.tagName,kind:el.tagName==='SELECT'?'select':el.matches('input[type=checkbox],input[type=radio]')?'check':'tap',attrs:[...el.attributes].filter((a:any)=>a.name.startsWith('data-')).map((a:any)=>a.name+'='+a.value).join(' '),
    external:/^(https?:|mailto:|tel:)/.test(h)&&!h.startsWith(location.origin)||el.getAttribute('target')==='_blank',ctx:Object.values(el.dataset).map(String)})}
  return out};
 const find=(scope:string,sel:string,idx:number)=>{const {root,exclude}=roots(scope);if(!root)return null;const same=[...root.querySelectorAll(sel)].filter((e:any)=>vis(e)&&!exclude(e));return same[idx]||null};
 const container=()=>{const m=document.querySelector('#modal-root .modal');if(m&&vis(m))return {scope:'#modal-root .modal',title:clean(m.querySelector('#modal-title,h2')?.textContent||'(no title)').slice(0,70),kind:'sheet'};
  const a=document.querySelector('#account-menu');if(a&&vis(a))return {scope:'#account-menu',title:'Menu tài khoản',kind:'menu'};
  const d=[...document.querySelectorAll('[role=dialog],[role=menu]')].find((e:any)=>vis(e)&&!e.closest('#modal-root,#lb-root'));if(d)return {scope:(d as any).id?'#'+(d as any).id:'[role=dialog]',title:clean((d as any).getAttribute('aria-label')||(d as any).querySelector('h2,h3')?.textContent||'(dialog)').slice(0,70),kind:'dialog'};
  return null};
 const overlay=()=>!!document.querySelector('.cook-mode,.shop-flow,.flow-layer,[data-flow-layer],.cooking-mode');
 // what one tap left behind
 const toastText=()=>{const t=document.querySelector('#toast');return t&&vis(t)?clean(t.textContent):''};
 // sheet content, counts and footer (rules 25 / 31)
 const sheetInfo=(n:any)=>{const c=container();if(!c||c.kind!=='sheet')return null;const m:any=document.querySelector(c.scope);const head=m.querySelector(':scope>header'),foot=m.querySelector(':scope>.modal-footer');
  const inBody=(e:any)=>!(head&&head.contains(e))&&!(foot&&foot.contains(e));
  const bodyCtrls=[...m.querySelectorAll('input:not([type=hidden]),select,textarea,button,a[href],summary,[role=button],[role=tab],'+DISPATCH.map(a=>'['+a+']').join(','))].filter((e:any)=>inBody(e)&&vis(e)&&!e.matches('[data-action="close-modal"]'));
  const footBtns=foot&&vis(foot)?[...foot.querySelectorAll('button,a.btn')].filter((b:any)=>vis(b)):[];
  const dismiss=(b:any)=>/^(close|cancel)$/.test(b.dataset.art||'')||b.matches('[data-action="close-modal"]')||/^(Đóng|Xong|Huỷ|Hủy|Close|Done|Cancel|Giữ nguyên|Quay lại|Back)\b/i.test(clean(b.innerText));
  const footAct=footBtns.filter((b:any)=>!dismiss(b));
  const empties=[...m.querySelectorAll('[class*="empty"]')].filter((e:any)=>inBody(e)&&vis(e)&&clean(e.innerText).length>=10).map((e:any)=>clean(e.innerText).slice(0,90));
  const bodyText=clean([...m.children].filter((e:any)=>e!==head&&e!==foot).map((e:any)=>e.innerText).join(' '));
  // repeated sibling groups = list items
  const groups:any[]=[];for(const p of m.querySelectorAll('*')){if(!inBody(p))continue;const kids=[...p.children].filter((k:any)=>vis(k)&&!/^(BR|SCRIPT|STYLE|svg)$/i.test(k.tagName));const by=new Map();for(const k of kids as any[]){const key=k.tagName+'.'+(k.classList[0]||'');by.set(key,(by.get(key)||0)+1)}for(const [key,v] of by)if(v>=1)groups.push({key,v})}
  const sizes=[...new Set(groups.filter(g=>g.v>=1).map(g=>g.v))];
  const dataIds=new Set([...m.querySelectorAll('[data-id],[data-ing],[data-ingredient]')].filter((e:any)=>inBody(e)&&vis(e)).map((e:any)=>e.dataset.id||e.dataset.ing||e.dataset.ingredient)).size;
  let countOk=null;if(n!==null&&n!==undefined){countOk=n===0?(empties.length>0||dataIds===0):(sizes.includes(n)||dataIds===n)&&!empties.some((t:string)=>/chưa có|không có|no |nothing|empty|trống/i.test(t))}
  const x=head?.querySelector('[data-action="close-modal"]');
  let footer:any=null;if(footBtns.length){const fr=foot.getBoundingClientRect();const bs=footBtns.map((b:any)=>{const r=b.getBoundingClientRect(),s=getComputedStyle(b);return {txt:clean(b.innerText).slice(0,30),art:b.dataset.art||'',drawn:!!b.querySelector('svg'),pill:parseFloat(s.borderTopLeftRadius)>=r.height/2-1,top:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height)}});
   footer={inView:fr.bottom<=innerHeight+1&&fr.top>=0,stacked:new Set(bs.map((b:any)=>b.top)).size>1,sameSize:bs.length<2||(Math.max(...bs.map((b:any)=>b.w))-Math.min(...bs.map((b:any)=>b.w))<=2&&Math.max(...bs.map((b:any)=>b.h))-Math.min(...bs.map((b:any)=>b.h))<=2),buttons:bs}}
  const loose=[...m.querySelectorAll('button,a.btn')].filter((b:any)=>inBody(b)&&vis(b)&&/^(Lưu|Save(?! as)|Đóng|Close|Xong|Done)(\s|$)/i.test(clean(b.innerText))).map((b:any)=>clean(b.innerText).slice(0,30));
  const saveBtn=footBtns.find((b:any)=>b.dataset.art==='save')||footBtns.find((b:any)=>!dismiss(b)&&/^(Lưu|Save)/i.test(clean(b.innerText)))||footBtns.find((b:any)=>b.matches('.primary')&&/^(Thêm|Add|Cất|Put)/i.test(clean(b.innerText)));
  if(saveBtn)(saveBtn as any).dataset.qaSave='1';
  return {title:c.title,bodyCtrls:bodyCtrls.length,footAct:footAct.length,empties,bodyText:bodyText.slice(0,160),bodyLen:bodyText.length,sizes,dataIds,countOk,x:x?{drawn:!!x.querySelector('svg')}:null,footer,loose,save:saveBtn?clean((saveBtn as any).innerText).slice(0,30):null}};
 // language, emoji, targets, overflow and drawings for a scope (rules 8, 19, 26, 27)
 // Phone emoji (rule 19) = characters drawn as emoji by default (Emoji_Presentation) or forced to emoji with U+FE0F. Allowed:
 // text-presentation symbols such as ↗ ✓ ★ ‹ ›, which render as plain font glyphs (rule 27 checks icon-only symbols separately).
 const scan=({scope,lang,seeded,VIs,ENs,LOANs}:any)=>{const VI=new RegExp(VIs,'i'),EN=new RegExp(ENs,'i'),LOAN=new RegExp(LOANs,'gi'),EM=/\p{Emoji_Presentation}|\p{Extended_Pictographic}\u{FE0F}/u;
  const st=G('typeof state!=="undefined"?state:null');
  // protected: family content and the reference recipe content (names, preparation, steps; the English edition of the reference
  // recipes is a separate owner-approved release — same exception as test:language:browser)
  const names=[...seeded,...(st?.members||[]).map((m:any)=>m.name),...(st?.stores||[]).map((s:any)=>s.name),...(st?.recipes||[]).flatMap((r:any)=>[r.name,r.prep,...(r.steps||[])]),...Object.values(st?.ingredientCatalog||{}).map((x:any)=>x?.name),...(st?.receipts||[]).flatMap((r:any)=>[r.store,...(r.items||[]).map((i:any)=>i.label)])].filter((x:any)=>typeof x==='string'&&x.length>2).sort((a:string,b:string)=>b.length-a.length);
  const key=names.length+':'+names[0];if(W.__qaStripKey!==key){W.__qaStripKey=key;W.__qaStrip=new RegExp(names.map((n:string)=>n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g')}
  const strip=(t:string)=>names.length?t.replace(W.__qaStrip,' '):t;
  // the voice hint's example sentence deliberately mixes Vietnamese and English (same exception as test:language:browser)
  // and the receipt box's placeholder shows what an Australian supermarket receipt looks like (receipts are printed in English)
  const MIXED_EXAMPLE=/2 kg pork belly với một bó rau muống|^Chicken breast 500g 8\.50/;
  let allowed:any=null;try{allowed=G('typeof enAllowedViWords==="function"?enAllowedViWords():null')}catch{}
  const viLeft=(t:string)=>t.split(/[^\p{L}]+/u).filter(w=>w&&VI.test(w)&&!(allowed&&allowed.has(w.toLowerCase())));
  const wrong=(t0:string)=>{if(MIXED_EXAMPLE.test(t0))return null;const t=clean(strip(t0));if(t.length<2||!/[a-zA-Zà-ỹ]/.test(t))return null;if(lang==='en'){const l=viLeft(t);return l.length?clean(t0).slice(0,120):null}const m=t.replace(LOAN,' ').match(EN);return m?clean(t0).slice(0,120):null};
  const {root,exclude}=roots(scope);if(!root)return null;
  const user=(el:any)=>el.closest('[data-user-content],.recipe-name,.steps-text,script,style,code,[translate=no],.language-control,#app-language,textarea,input,svg');
  const out:any={emoji:[],lang:[],small:[],overflow:0,wide:[],drawings:[]};
  const tw=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let nd:any;
  while((nd=tw.nextNode())){const el=nd.parentElement;if(!el||exclude(el)||el.closest('svg'))continue;const opt=el.closest('option');if(opt){if(!vis(opt.closest('select')))continue}else if(!vis(el))continue;const v=nd.nodeValue;if(!v.trim())continue;const isUser=user(el);
   if(EM.test(strip(v))&&!isUser)out.emoji.push(clean(v).slice(0,60));if(!isUser){const b=wrong(v);if(b)out.lang.push((opt?'[option] ':'')+b)}}
  for(const el of root.querySelectorAll('[placeholder],[aria-label],[title],optgroup[label],img[alt]')){if(exclude(el)||el.closest('[data-user-content],svg'))continue;if(!vis(el)&&el.tagName!=='OPTGROUP')continue;for(const a of ['placeholder','aria-label','title','label','alt']){const v=el.getAttribute(a);if(!v)continue;if(a==='label'&&el.tagName!=='OPTGROUP')continue;if(EM.test(strip(v)))out.emoji.push('['+a+'] '+v.slice(0,60));const b=wrong(v);if(b)out.lang.push('['+a+'] '+b)}}
  // targets ≥ 44 px. Allowed: a link inside running text (WCAG 2.5.8 inline exception); a checkbox/radio whose label is the target.
  for(const el of root.querySelectorAll('button,a[href],input:not([type=hidden]),select,textarea,[role=button],[role=tab],summary,label.chip,.chip')){if(exclude(el)||!vis(el)||el.closest('svg'))continue;
   if(el.matches('input[type=checkbox],input[type=radio]')&&el.closest('label')){const l=el.closest('label').getBoundingClientRect();if(l.height>=43.5&&l.width>=43.5)continue}
   if(el.matches('a')&&el.closest('p,li')&&clean(el.closest('p,li').innerText).length>clean(el.innerText).length+15)continue;
   const r=el.getBoundingClientRect();if(r.width<43.5||r.height<43.5){const k=`${el.tagName.toLowerCase()}${el.className&&typeof el.className==='string'?'.'+el.className.trim().split(/\s+/).filter((c:string)=>!/^(active|on|done|checked|selected)$/.test(c)).slice(0,2).join('.'):''}${el.tagName==='SELECT'||el.tagName==='INPUT'||(typeof el.className==='string'&&el.className.trim())?'':' “'+(labelOf(el)||'').replace(/\d+([.,]\d+)?/g,'#').slice(0,24)+'”'} ${r.height<43.5?'height '+Math.round(r.height):'width '+Math.round(r.width)} px`;if(!out.small.includes(k))out.small.push(k)}}
  out.overflow=Math.max(0,document.documentElement.scrollWidth-innerWidth);
  out.wide=[...root.querySelectorAll('*')].filter((e:any)=>{if(exclude(e)||!vis(e))return false;const r=e.getBoundingClientRect();if(r.right<=innerWidth+1)return false;let p=e.parentElement;while(p&&p!==document.body){if(/(auto|scroll|hidden|clip)/.test(getComputedStyle(p).overflowX))return false;p=p.parentElement}return true}).map((e:any)=>String(e.getAttribute('class')||e.tagName).slice(0,40)+' right='+Math.round(e.getBoundingClientRect().right)).slice(0,3);
  // rule 27: main / icon-only buttons have a drawing; chips, tabs and disclosures are words only
  const SYM=/^[\s+−\-✧↶↷▧▤▦↓↑⇅⇵✗✓↗→←‹›×≈•·▾▴☀☾…⋯⋮⌄^<>✕✎✏︎★☆♥↻]+$/u;const contentPic='.ingredient-art,.dish-art,.pp-wrap,.recipe-visual,.composed-dish,img.pp-img,.product-photo,.lb-bug,.family-brand-mark,.avatar-img';
  for(const el of root.querySelectorAll('button,a.btn,a.chip,[role="tab"],summary,.chip')){if(exclude(el)||!vis(el)||el.closest('#lb-root,svg')||el.matches('.mr-btn,.voice-hold-btn'))continue;const txt=clean(el.innerText||el.textContent);const drawn=[...el.querySelectorAll('svg,img')].some((s:any)=>!s.closest(contentPic));
   const chip=el.matches('.chip,a.chip,[role="tab"],summary,.tab,.seg button,.segmented button,[role="radio"]');const nav=!!el.closest('nav,.sidebar,.bottom-nav');const pic=!!el.querySelector(contentPic);const iconOnly=(!txt&&!pic)||SYM.test(txt); // a button that is a dish / product picture already shows its drawing
   if(iconOnly&&!drawn)out.drawings.push(`icon-only button uses a text symbol, no drawing: “${txt||el.getAttribute('aria-label')||''}”`);
   else if(el.matches('.primary')&&!drawn&&!el.closest('.modal-footer'))out.drawings.push(`main button has no drawing: “${txt.slice(0,40)}”`);
   if(chip&&drawn&&!nav)out.drawings.push(`chip/tab/disclosure shows a drawing: “${txt.slice(0,40)}”`)}
  return out};
 const times=(scope:string)=>{const {root,exclude}=roots(scope);if(!root)return[];const out:string[]=[];const tw=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let nd:any;while((nd=tw.nextNode())){const el=nd.parentElement;if(!el||exclude(el)||!vis(el))continue;for(const m of String(nd.nodeValue).matchAll(/(?<![\d:])([01]?\d|2[0-3])[:h]([0-5]\d)(?![\d:])/g))out.push(m[1].padStart(2,'0')+':'+m[2])}return out};
 const greeting=()=>clean(document.querySelector('.home-greet h2,.home-greet h1,.home-greet .greet,.home-greet')?.textContent||'').slice(0,60);
 // data (rules 33 / 34)
 const roundTrip=()=>{const out:any={};try{out.valid=G('validImport(state)')===true}catch(e:any){out.valid='error '+e.message}
  try{out.json=G('validImport(JSON.parse(JSON.stringify(state)))')===true}catch(e:any){out.json='error '+e.message}
  try{out.merge=G('typeof mergeFamilyStates!=="function"?"no merge":validImport(mergeFamilyStates(JSON.parse(window.__qaSnap),JSON.parse(JSON.stringify(state)),JSON.parse(window.__qaSnap)).state)')}catch(e:any){out.merge='error '+e.message}
  try{const base=JSON.parse(W.__qaSnap);out.newWeeks=Object.keys(G('state').weeks||{}).filter(k=>!(base.weeks||{})[k]).map(k=>({k,start:G(`monday(${JSON.stringify(k)})`)})).filter((x:any)=>x.k!==x.start).map((x:any)=>x.k)}catch(e:any){out.newWeeks=[]}
  return out};
 const NOISY=/(^|\.)(updatedAt|createdAt|savedAt|at|ts|time|stamp|activity|syncMeta|revision|rev|lastSaved|checkedAt|seen|lastUsed|lastOpened|recent[A-Za-z]*|history|log|usage|_[a-z]+)(\.|$)/;
 const flat=(o:any,p:string,out:Map<string,any>)=>{if(o===null||typeof o!=='object'){out.set(p,o);return}if(Array.isArray(o)){o.forEach((v:any,i:number)=>flat(v,p+'.'+(v&&typeof v==='object'&&v.id!=null?'#'+v.id:i),out));return}for(const [k,v] of Object.entries(o))flat(v,p?p+'.'+k:k,out)};
 const markPre=()=>{W.__qaPre=JSON.stringify(G('state'))};
 const diff=()=>{const a=new Map(),b=new Map();flat(JSON.parse(W.__qaPre||'{}'),'',a);flat(G('state'),'',b);const out:any[]=[];for(const [k,v] of b){if(a.get(k)!==v&&!NOISY.test(k))out.push({path:k,before:a.has(k)?a.get(k):'(none)',after:v})}return out.slice(0,400)};
 const members=()=>{try{return (G('state').members||[]).map((m:any)=>m.id)}catch{return[]}};
 const restore=(v:string)=>{G(`(()=>{try{closeModal()}catch{};document.getElementById('account-menu')?.remove?.();state=JSON.parse(window.__qaSnap);selectedDate=window.__qaSD;weekStart=window.__qaWS;save();view=${JSON.stringify(v==='topbar'?'today':v)};if(location.hash!=='#'+view)history.replaceState(null,'','#'+view);render();scrollTo(0,0)})()`)};
 // the list row that holds a control, and what is around that row
 const neighbours=(e:any)=>{let p=e;while(p&&p.parentElement&&p!==document.body){const key=p.tagName+'.'+(p.classList[0]||'');const same=[...p.parentElement.children].filter((k:any)=>k.tagName+'.'+(k.classList[0]||'')===key);if(same.length>=2)break;p=p.parentElement}
  if(!p||p===document.body)return '';const t=(x:any)=>x?clean(x.textContent).slice(0,40):'';const par=p.parentElement;return t(p.previousElementSibling)+' / '+t(p.nextElementSibling)+' / in '+(par?selOf(par)+'#'+[...par.children].indexOf(p)+':'+clean(par.previousElementSibling?.textContent).slice(0,30):'')};
 const prevText=(e:any)=>{const tw=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let last:string[]=[];let nd:any;while((nd=tw.nextNode())){if(e.contains(nd))break;if(e.compareDocumentPosition(nd)&Node.DOCUMENT_POSITION_FOLLOWING)break;const t=clean(nd.nodeValue);if(t&&vis(nd.parentElement)){last.push(t.slice(0,30));if(last.length>2)last.shift()}}return last.join(' / ')};
 // place among the controls with the same dispatcher (a ticked row that joins “đã mua” changes place: content moving, not the page)
 const order=(e:any)=>{const a=DISPATCH.find(n=>e.hasAttribute(n));if(!a)return '';const v=e.getAttribute(a);return a+':'+[...document.querySelectorAll(`[${a}="${q(v)}"]`)].filter((x:any)=>vis(x)).indexOf(e)};
 const innerScroll=(e:any)=>{const out:number[]=[];let p=e.parentElement;while(p&&p!==document.body){if(!p.matches('.modal,.modal-content,#modal-root')&&p.scrollHeight>p.clientHeight+2&&/(auto|scroll)/.test(getComputedStyle(p).overflowY))out.push(Math.round(p.scrollTop));if(!p.matches('.modal,.modal-content,#modal-root')&&p.scrollWidth>p.clientWidth+2&&/(auto|scroll)/.test(getComputedStyle(p).overflowX))out.push(Math.round(p.scrollLeft));p=p.parentElement}return out.join(',')};
 W.__qa={order,prevText,neighbours,innerScroll,controls,find,container,overlay,toastText,sheetInfo,scan,times,greeting,roundTrip,markPre,diff,members,restore,vis};
}

// ---------------------------------------------------------------------------------------------------------------------------
// Language detection (copied from test:language:browser, with the same documented exceptions).
const VI=/[ăâđêôơưàáạảãằắặẳẵầấậẩẫèéẹẻẽềếệểễìíịỉĩòóọỏõồốộổỗờớợởỡùúụủũừứựửữỳýỵỷỹ]/i;
const EN=/(?<![\wà-ỹ])(the|and|your|you|for|with|add|save|cancel|delete|edit|open|close|dish|dishes|meal|meals|breakfast|lunch|dinner|weekly|week|shopping|family|price|prices|settings|recipe|recipes|today|plan|choose|photo|take|show|more|items?|list|not|this|from|sync|night|main|side|portion|portions|auto|unit|amount|name|search|all|new|done|back|next|help|guide|account|bought|cooked|standard|piece|slice|min|tick|estimate|budget|pork|chicken|beef|fish|shrimp|egg|eggs|plant|mixed|fridge|freezer|pantry|store|stores|receipt|receipts|total|other|none|yes|no|off|on|light|dark|default|daily|weekend|members?|people|servings?|minutes?|day|days|noodle|vegetables?|each|bunch|pack|bag|box|tray|bottle|clove|cup|spoon|tablespoon|teaspoon|handful|whole|morning|evening|afternoon|reminder|reminders|notification|notifications|urgent|message|send|share|copy|print|import|export|backup|restore|language|theme|currency|retailer|product|products|catalog|catalogue|library|reference|favourites?|filter|filters|sort|clear|reset|apply|confirm|remove|undo|lock|unlock|status|ready|loading|error|unknown|missing|optional|required|note|notes?)(?![\wà-ỹ])/i;
// Allowlist for English words in Vietnamese mode — each entry with its reason:
//  offline, online, bill, notes, app, ok, email, pin, wi-fi, push — owner-approved loanwords the family uses (test:language:browser);
//  weekends feast, feast, school lunch box, healthy — owner-approved menu style names;
//  so giá, famtray, studio — product names; csv, qr, pwa, ios, android, iphone, ipad, chrome, safari, whisper, messenger — format,
//  platform and app names; aud, vnd, usd — currency codes; google, apple, woolworths, coles, aldi, harris farm, costco, iga, amazon,
//  chemist warehouse, open-meteo — company / supermarket names (rule 19 names the photo source); vi, en — the language toggle;
//  kg, g, ml, l — units; soup — owner-approved loanword in menu styles.
const LOAN=/(?<![\wà-ỹ])(offline|online|bill|notes|weekends feast|feast|school lunch box|so giá|famtray|app|ok|email|pin|wi-fi|healthy|csv|qr|aud|vnd|usd|ios|android|iphone|ipad|chrome|safari|whisper|pwa|push|studio|google|apple|woolworths|coles|aldi|harris farm|costco|iga|amazon|chemist warehouse|vi|en|kg|g|ml|l|soup|open-meteo|messenger)(?![\wà-ỹ])/gi;

// ---------------------------------------------------------------------------------------------------------------------------
type Fail={pass:string,screen:string,control:string,check:string,detail:string};
const failures:Fail[]=[],skips=new Map<string,Set<string>>(),passTimes:any={},passGreeting:any={};let checks=0,taps=0;
const seenFail=new Set<string>();
const fail=(f:Fail)=>{const k=[f.pass,f.screen,f.control,f.check,f.detail].join('|');if(seenFail.has(k))return;seenFail.add(k);failures.push(f)};
const check=(ok:boolean,f:Fail)=>{checks++;if(!ok)fail(f)};

async function runPass(browser:any,P:any){
 const t0=Date.now();
 const context=await browser.newContext({locale:'vi-VN',viewport:{width:P.w,height:P.h},serviceWorkers:'block',reducedMotion:'reduce',colorScheme:'light',timezoneId:P.tz||'Australia/Sydney'});
 await context.addInitScript(({lang}:any)=>{if(sessionStorage.getItem('qa-init'))return;sessionStorage.setItem('qa-init','1');localStorage.setItem('bep-theme-mode','light');localStorage.setItem('guest/bep-language',lang);localStorage.setItem('bep-local-locked','yes')},{lang:P.lang});
 await context.addInitScript(()=>{try{Object.defineProperty(navigator,'clipboard',{value:{writeText:(t:string)=>{(window as any).__clip=t;return Promise.resolve()},readText:()=>Promise.resolve('')},configurable:true});(navigator as any).share=(d:any)=>{(window as any).__share=d;return Promise.resolve()}}catch{}});
 // the same generated week on every run: a fixed random sequence
 await context.addInitScript(()=>{let a=0x2f6b1d;Math.random=()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296}});
 await context.addInitScript(qaLib);
 await context.route('**/*',async(r:any)=>{const u=new URL(r.request().url());
  if(u.origin!==origin)return r.fulfill({status:404,body:''});
  if(u.pathname.startsWith('/.netlify/')){const op=u.searchParams.get('op');return r.fulfill({status:op==='status'||op==='state'?200:401,json:op==='status'?{configured:false,connected:false}:op==='state'?{state:null,etag:null}:{error:'audit-offline',announcements:[],devices:[],items:[]}})}
  if(u.pathname==='/startup-scripts.json')return r.fulfill({json:JSON.parse(readFileSync('dist/startup-scripts.json','utf8'))});
  const f=resolve('dist',u.pathname==='/'?'index.html':u.pathname.slice(1));try{await r.fulfill({contentType:mime[extname(f)]||'application/octet-stream',body:readFileSync(f)})}catch{await r.fulfill({status:404,body:'Not found'})}});
 const page=await context.newPage();const errors:string[]=[];page.on('pageerror',(e:any)=>errors.push(String(e.message).slice(0,180)));page.on('dialog',(d:any)=>d.dismiss().catch(()=>{}));
 const E=(s:string)=>page.evaluate(s) as Promise<any>;
 const Q=(fn:string,arg?:any)=>page.evaluate(({fn,arg}:any)=>(window as any).__qa[fn](arg),{fn,arg}) as Promise<any>;
 const boot=async()=>{await page.goto(origin+'/#today',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#main h1')&&typeof (globalThis as any).render==='function'&&(window as any).__qa,null,{timeout:30000});await page.waitForTimeout(600)};
 await boot();
 // seed
 const seedRes=await page.evaluate(({P,SEED,KNOWN_TS}:any)=>{const G=(s:string)=>(0,eval)(s);(window as any).__seedArg={P,SEED,KNOWN_TS};return G(`(()=>{const {P,SEED,KNOWN_TS}=window.__seedArg;
  state.preferences.onboardingComplete=true;if(P.weekStartDay!=null)state.preferences.weekStartDay=P.weekStartDay;weekStart=planStartOf(state,selectedDate);
  /* weeks are stored under their Monday whatever the start day (core.ts dayAt / menuWeekKey); the start day only places the 7-day window */
  const w=currentWeek();
  if(P.data==='empty'){for(const wk of Object.values(state.weeks))for(const day of Object.values(wk.days||{}))for(const m of Object.values(day))if(m&&Array.isArray(m.recipes)){m.recipes=[];m.cooked=false}for(const wk of Object.values(state.weeks))wk.extras=[];state.pantry=[];state.receipts=[]}
  else{familyGenerate(state,weekStart,{sourceMode:'library'});
   state.ingredientCatalog={...(state.ingredientCatalog||{}),'family-ing-qa-ga':{name:SEED.ingredient,unit:'con',group:'meat'}};hydrateFamilyIngredients(state);
   const fam={id:'qa-family-recipe',name:SEED.recipe,category:'main',protein:'chicken',time:50,servings:4,yield:6,custom:true,ingredients:[{id:'family-ing-qa-ga',qty:1},{id:'garlic',qty:20},{id:'fishSauce',qty:15}],prep:SEED.prep,steps:[SEED.step]};
   state.recipes.push(fam);const w2=currentWeek();const day=w2.days[selectedDate]||Object.values(w2.days)[0];day.dinner.recipes=[clone(fam),...day.dinner.recipes.slice(0,1)];day.dinner.cooked=false;day.dinner.guests=[{name:SEED.guest,adults:2,kids:1}];
   const rows=shopping(state,w2,...shopDates()).filter(r=>r.needed>0&&!String(r.id).startsWith('family-'));
   const lot=(ingredient,qty,place,expiry)=>pantryTouch({id:uid(),ingredient,qty,place,expiry});
   state.pantry=[lot(rows[0].id,200,'fridge',addDays(sydneyDate(),3)),lot(rows[1].id,1,'dry',''),lot('family-ing-qa-ga',1,'freezer',addDays(sydneyDate(),20))];
   const linked=Object.keys(INGREDIENTS).find(k=>INGREDIENTS[k][1]==='g'&&!rows.some(r=>r.id===k));
   w2.extras=[{id:'qa-x-linked',name:INGREDIENTS[linked][0],qty:'500 g',cost:6.5,currency:'AUD',done:false,storeId:''},{id:'qa-x-free',name:SEED.extraFree,qty:SEED.extraFreeQty,cost:4.5,currency:'AUD',done:false,storeId:''}];
   state.receipts=[{id:'qa-receipt',store:SEED.store,date:sydneyDate(),currency:'AUD',total:12.3,createdAt:KNOWN_TS,updatedAt:KNOWN_TS,hasPhoto:false,raw:'',items:[{id:'qa-r1',label:SEED.receiptLine1,total:7.5,ingredient:rows[0].id,recipe:null,kind:'ingredient',quantity:500,enteredQty:500,enteredUnit:'g',lineKind:'item'},{id:'qa-r2',label:SEED.receiptLine2,total:4.8,ingredient:null,recipe:null,kind:'other',quantity:null,enteredQty:null,enteredUnit:'',generic:true,genericKey:'l:towel',unknown:true,lineKind:'item'}]}];
   window.__qaLinkedName=INGREDIENTS[linked][0]}
  save();closeModal();view='today';render();window.__qaSnap=JSON.stringify(state);window.__qaSD=selectedDate;window.__qaWS=weekStart;
  return {valid:validImport(state),weekStart,selectedDate,linked:window.__qaLinkedName||''}})()`)},{P,SEED,KNOWN_TS});
 if(seedRes.valid!==true)throw new Error(`${P.id}: the seeded state does not pass validImport — fix the seed, not the app (${JSON.stringify(seedRes)})`);
 const seeded=[...Object.values(SEED),seedRes.linked].filter(Boolean);
 const timesBy:any={};passTimes[P.id]=timesBy;
 const scanOpts={lang:P.lang,seeded,VIs:VI.source,ENs:EN.source,LOANs:LOAN.source};
 const scannedSheets=new Set<string>(),formChecked=new Set<string>(),level2Done=new Set<string>();
 const restore=async(v:string)=>{try{await Q('restore',v)}catch{await boot();await Q('restore',v)}await page.waitForTimeout(70);
  if(!page.url().startsWith(origin)||await Q('overlay')){await boot();await Q('restore',v);await page.waitForTimeout(220)}};
 const scope=(v:string)=>v==='topbar'?'topbar':'#main';

 // static checks on a scope (screen or sheet)
 const staticChecks=async(screen:string,where:string,sc:string,ctl:string)=>{const s=await Q('scan',{...scanOpts,scope:sc});if(!s)return;
  const F=(check:string,detail:string)=>({pass:P.id,screen,control:ctl,check,detail:`${where}: ${detail}`});
  check(!s.emoji.length,F('emoji (rule 19)',s.emoji.slice(0,4).join(' | ')));
  check(!s.lang.length,F(P.lang==='en'?'language: Vietnamese in English mode':'language: English in Vietnamese mode',s.lang.slice(0,4).join(' | ')));
  for(const t of s.small)check(false,F('tap size < 44 px',t));checks++;
  check(s.overflow<=1&&!s.wide.length,F('horizontal overflow',`page ${s.overflow}px wider; ${s.wide.join(', ')}`));
  for(const d of s.drawings)check(false,F('drawings (rule 27)',d));checks++;
  const tl=await Q('times',sc);timesBy[where]??=new Set();for(const t of tl)timesBy[where].add(t)};

 const sheetChecks=async(screen:string,ctl:string,n:any,chainLabel:string)=>{const si=await Q('sheetInfo',n);if(!si)return null;const F=(check:string,detail:string)=>({pass:P.id,screen,control:chainLabel,check,detail:`sheet “${si.title}”: ${detail}`});
  check(si.bodyCtrls>0||si.footAct>0||si.empties.length>0,F('sheet has no content (rule 31)',`no control to act on and no empty-state message; body: “${si.bodyText}”`));
  check(!(si.bodyCtrls===0&&si.footAct===0&&si.empties.length===0&&si.bodyLen<200),F('sheet is only a hint (rule 31)',`“${si.bodyText}”`));
  if(n!==null&&n!==undefined)check(si.countOk===true,F('count on the control ≠ items in the sheet (rule 31)',`control says (${n}); sheet list sizes ${JSON.stringify(si.sizes.slice(0,8))}, ${si.dataIds} items with ids${si.empties.length?`, empty message “${si.empties[0]}”`:''}`));
  if(!scannedSheets.has(si.title)){scannedSheets.add(si.title);
   check(!si.x||si.x.drawn,F('sheet footer (rule 25)','the dismiss X has no drawing'));
   if(si.footer){const f=si.footer;check(!f.stacked,F('sheet footer (rule 25)',`footer buttons stack on separate rows: ${f.buttons.map((b:any)=>b.txt).join(' / ')}`));check(f.sameSize,F('sheet footer (rule 25)',`footer buttons differ in size: ${f.buttons.map((b:any)=>`${b.txt} ${b.w}×${b.h}`).join(' / ')}`));
    check(f.inView,F('sheet footer (rule 25)','footer is not visible without scrolling'));
    for(const b of f.buttons){check(b.pill,F('sheet footer (rule 25)',`“${b.txt}” is not a pill`));if(/^(close|save)$/.test(b.art)||/^(Lưu|Save|Đóng|Close|Xong|Done)(\s|$)/i.test(b.txt))check(b.drawn,F('sheet footer (rule 25)',`“${b.txt}” has no drawing`))}}
   check(!si.loose.length,F('sheet footer (rule 25)',`Lưu / Đóng inside the sheet body, not in the floating footer: ${si.loose.join(', ')}`));
   await staticChecks(screen,`sheet “${si.title}”`,'#modal-root .modal',chainLabel)}
  return si};

 const dataChecks=async(screen:string,ctl:string,after:string)=>{const rt=await Q('roundTrip');const F=(check:string,detail:string)=>({pass:P.id,screen,control:ctl,check,detail:`${after}: ${detail}`});
  check(rt.valid===true,F('round trip (rule 33)',`validImport(state) is ${rt.valid}`));check(rt.json===true,F('round trip (rule 33)',`JSON.stringify → parse → validImport is ${rt.json}`));
  check(rt.merge===true||rt.merge==='no merge',F('round trip (rule 33)',`sync merge → validImport is ${rt.merge}`));
  check(!rt.newWeeks.length,F('week start (rule 34)',`wrote a week keyed ${rt.newWeeks.join(', ')}, which is not the Monday the app stores weeks under — a hidden copy of the family's week (audit B1)`))};

 // forms: save without touching any field (rule 32)
 const formCheck=async(screen:string,ctl:string,si:any,ctx:string[])=>{if(!si?.save||formChecked.has(si.title))return;formChecked.add(si.title);
  const memberIds:string[]=await Q('members');const units:any=await page.evaluate(()=>{const I=(0,eval)('INGREDIENTS');return Object.fromEntries(Object.entries(I).map(([k,v]:any)=>[k,v[1]]))});await Q('markPre');const toastBefore=await Q('toastText');const errBefore=errors.length;
  try{await page.locator('#modal-root [data-qa-save="1"]').first().click({timeout:2500})}catch{return}
  taps++;await page.waitForTimeout(450);
  const F=(check:string,detail:string)=>({pass:P.id,screen,control:ctl,check,detail:`sheet “${si.title}” → “${si.save}” with no field changed: ${detail}`});
  check(errors.length===errBefore,F('page error',errors.slice(errBefore).join(' | ')));
  const c=await Q('container');const d:any[]=await Q('diff');const toast=await Q('toastText');
  const refusedMsg=await page.evaluate(()=>{const m=document.querySelector('#modal-root .modal');if(!m)return '';const v=(window as any).__qa.vis;const e=[...m.querySelectorAll('.error,.field-error,.form-error,[role=alert],.invalid,.warn,.warning,[aria-invalid=true]')].find((x:any)=>v(x)&&(x.textContent||'').trim());if(e)return (e as any).textContent.trim().slice(0,80);const inv=[...m.querySelectorAll('input,select,textarea')].find((x:any)=>v(x)&&!x.checkValidity());return inv?'(required field: '+((inv as any).name||(inv as any).id||'?')+')':''});
  const defaults:string[]=[];
  if(process.env.AUDIT_DEBUG)console.log(`    form ${P.id} “${si.title}” → “${si.save}”: open=${c?.title||'-'} refused=“${refusedMsg}” toast=“${toast}” diff=${JSON.stringify(d.slice(0,12))}`);
  for(const x of d){const key=x.path.split('.').pop()||'';const a=x.after;
   // g is fine when it is the ingredient's own unit (a suggestion from matched data, rule 32)
   const ownG=[...x.path.split('.'),...ctx].some((k:string)=>units[k.replace(/^#/,'')]==='g'||/\d\s*g\b/i.test(k)); // the ingredient's own unit, or grams printed in the item's own label (“500g”)
   if(/unit$/i.test(key)&&a==='g'&&x.before!=='g'&&!ownG)defaults.push(`${x.path} = "g"`);
   else if(/^(qty|quantity|amount|text)$/i.test(key)&&typeof a==='string'&&/\d\s*g$/.test(a)&&x.before!==a&&!ownG)defaults.push(`${x.path} = "${a}"`);
   if(/^(cost|price|unitPrice|pricePer|total)$/i.test(key)&&a===0&&x.before!==0)defaults.push(`${x.path} = 0 (a price nobody entered)`);
   if(/^(ingredient|ingredientId|ing)$/i.test(key)&&a&&a!==x.before&&!ctx.includes(String(a)))defaults.push(`${x.path} = "${a}" (ingredient not chosen)`);
   if(/^(member|memberId|requestedBy|by|person|who|from|owner|for|requester)$/i.test(key)&&memberIds.includes(a)&&a!==x.before&&!ctx.includes(String(a)))defaults.push(`${x.path} = "${a}" (person not chosen)`)}
  check(!defaults.length,F('silent default (rule 32)',defaults.slice(0,5).join('; ')));
  const sameOpen=c&&c.title===si.title;check(!(sameOpen&&!d.length&&!refusedMsg&&toast===toastBefore),F('save gives no response','the sheet stays open, nothing is saved and no message says why'));
  await dataChecks(screen,ctl,`after “${si.save}”`)};

 // one tap in a fresh state; chain = parent taps to reopen the sheet first
 const tapOne=async(screen:string,c:any,chain:any[],level:number)=>{
  const label=[...chain.map(x=>x.label),c.label||c.sel].map((s:string)=>`“${String(s).slice(0,40)}”`).join(' › ');
  await restore(screen);
  for(const p of chain){const ok=await page.evaluate(({p}:any)=>{const e=(window as any).__qa.find(p.scope,p.sel,p.idx);if(!e)return false;e.click();return true},{p});if(!ok)return;await page.waitForTimeout(260)}
  const sc=chain.length?(await Q('container'))?.scope:scope(screen);if(!sc)return;
  const before=await page.evaluate(({sc,c}:any)=>{const Q=(window as any).__qa;const e=Q.find(sc,c.sel,c.idx);if(!e)return null;const r0=e.getBoundingClientRect();const box=e.closest('.modal')||null;if(box){const m=box.getBoundingClientRect();if(r0.top<m.top+60||r0.bottom>m.bottom-90)e.scrollIntoView({block:'center'})}else scrollBy(0,r0.top-innerHeight/2);const r=e.getBoundingClientRect();
   return {top:r.top,y:scrollY,hash:location.hash,view:(0,eval)('view'),title:Q.container()?.title||null,near:Q.neighbours(e)+' | '+Q.prevText(e)+' | '+Q.order(e),inner:Q.innerScroll(e)}},{sc,c});
  if(!before)return;await page.waitForTimeout(60);
  const errBefore=errors.length,toastBefore=await Q('toastText');
  try{if(c.kind==='select'){const ok=await page.evaluate(({sc,c}:any)=>{const s=(window as any).__qa.find(sc,c.sel,c.idx);const next=[...s.options].find((o:any)=>!o.disabled&&o.value!==s.value);if(!next)return false;s.value=next.value;s.dispatchEvent(new Event('input',{bubbles:true}));s.dispatchEvent(new Event('change',{bubbles:true}));return true},{sc,c});if(!ok)return}
   else await page.evaluate(({sc,c}:any)=>{const e=(window as any).__qa.find(sc,c.sel,c.idx);e.click()},{sc,c})}catch(e:any){fail({pass:P.id,screen,control:label,check:'tap failed',detail:String(e.message).slice(0,120)});return}
  taps++;await page.waitForTimeout(260);
  if(!page.url().startsWith(origin)){await boot();return}
  check(errors.length===errBefore,{pass:P.id,screen,control:label,check:'page error',detail:errors.slice(errBefore).join(' | ')});
  await dataChecks(screen,label,'after the tap');
  const after=await page.evaluate(({sc,c}:any)=>{const Q=(window as any).__qa;const e=Q.find(sc,c.sel,c.idx);return {top:e?e.getBoundingClientRect().top:null,y:scrollY,hash:location.hash,view:(0,eval)('view'),cont:Q.container(),overlay:Q.overlay(),near:e?Q.neighbours(e)+' | '+Q.prevText(e)+' | '+Q.order(e):'',inner:e?Q.innerScroll(e):''}},{sc,c});
  const opened=after.cont&&after.cont.title!==before.title;
  // a row that moved to another place in its list (e.g. a ticked item joining “đã mua”) and a wheel that centres the chosen value
  // are content moving, not the page: only a control with the same neighbours and the same inner scroll position must stay put
  if(!opened&&!after.overlay&&after.hash===before.hash&&after.view===before.view&&after.top!==null&&c.tag!=='A'&&after.near===before.near&&after.inner===before.inner)check(Math.abs(after.top-before.top)<=3,{pass:P.id,screen,control:label,check:'page jump (rule 24)',detail:`the tapped control moved ${Math.round(before.top)} → ${Math.round(after.top)} px (scroll ${Math.round(before.y)} → ${Math.round(after.y)})`});
  // text the tap added (toasts, relabelled buttons)
  const toast=await Q('toastText');if(toast&&toast!==toastBefore){const s=await page.evaluate(({t}:any)=>({em:/\p{Emoji_Presentation}|\p{Extended_Pictographic}\u{FE0F}/u.test(t)}),{t:toast});check(!s.em,{pass:P.id,screen,control:label,check:'emoji (rule 19)',detail:`toast: ${toast.slice(0,80)}`});
   if(P.lang==='en')check(!VI.test(toast.split(new RegExp(seeded.map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g')).join(' ')),{pass:P.id,screen,control:label,check:'language: Vietnamese in English mode',detail:`toast: ${toast.slice(0,100)}`})}
  if(!opened&&!chain.length&&after.view===before.view){const em=await page.evaluate(({seeded}:any)=>{let t=(document.querySelector('#main') as any)?.innerText||'';for(const n of seeded)t=t.split(n).join(' ');return (t.match(/(\p{Emoji_Presentation}|\p{Extended_Pictographic}\u{FE0F})[^\n]{0,30}/gu)||[]).slice(0,3)},{seeded});check(!em.length,{pass:P.id,screen,control:label,check:'emoji (rule 19)',detail:`after the tap: ${em.join(' | ')}`})}
  if(!opened)return;
  if(after.cont.kind!=='sheet'){ // account menu or popover: scan it and sweep its items
   if(!scannedSheets.has(after.cont.title)){scannedSheets.add(after.cont.title);await staticChecks(screen,`“${after.cont.title}”`,after.cont.scope,label)}
  }else{const si=await sheetChecks(screen,label,c.n,label);if(si){await formCheck(screen,label,si,[...c.ctx,...chain.flatMap((x:any)=>x.ctx||[])]);
    // reopen for the inner controls listing below (the form check may have closed it)
    if(LEVEL2&&P.deep&&level===1&&!level2Done.has(si.title))await tapAgain(screen,chain,c,sc)}}
  if(LEVEL2&&P.deep&&level===1&&!level2Done.has(after.cont.title)){level2Done.add(after.cont.title);
   const cont=await Q('container');if(!cont||cont.title!==after.cont.title)return;const inner:any[]=await Q('controls',cont.scope);const seen=new Set<string>();
   for(const ic of inner){if(seen.has(ic.sig))continue;seen.add(ic.sig);
    if(/close-modal/.test(ic.attrs)||/^(Đóng|Xong|Huỷ|Hủy|Close|Done|Cancel)$/i.test(ic.label)||ic.attrs.includes('data-qa-save'))continue;
    const why=skipReason(ic);if(why){addSkip(screen,`${label} › “${ic.label||ic.sel}”`,why);continue}
    if(ic.kind==='tap'&&ic.tag==='INPUT')continue;
    await tapOne(screen,ic,[...chain,{scope:sc,sel:c.sel,idx:c.idx,label:c.label,ctx:c.ctx}],2)}}
 };
 const tapAgain=async(screen:string,chain:any[],c:any,sc:string)=>{await restore(screen);for(const p of [...chain,{scope:sc,sel:c.sel,idx:c.idx}]){await page.evaluate(({p}:any)=>{(window as any).__qa.find(p.scope,p.sel,p.idx)?.click()},{p});await page.waitForTimeout(260)}};
 const addSkip=(screen:string,ctl:string,why:string)=>{const k=`${SCREEN_NAME[screen]} › ${ctl} — ${why}`;if(!skips.has(k))skips.set(k,new Set());skips.get(k)!.add(P.id)};

 for(const screen of RUN_SCREENS){
  await restore(screen);
  const where=SCREEN_NAME[screen];
  await staticChecks(screen,`screen ${where}`,scope(screen),'(screen)');
  if(screen==='today'){const g=await Q('greeting');passGreeting[P.id]=g}
  const list:any[]=await Q('controls',scope(screen));const seen=new Set<string>();
  for(const c of list){if(seen.has(c.sig))continue;seen.add(c.sig);const why=skipReason(c);if(why){addSkip(screen,`“${c.label||c.sel}”`,why);continue}
   try{await tapOne(screen,c,[],1)}catch(e:any){fail({pass:P.id,screen,control:`“${c.label||c.sel}”`,check:'sweep error',detail:String(e.message).split('\n')[0].slice(0,160)});try{await boot()}catch{}}}
  await restore(screen);await dataChecks(screen,'(end of screen)','after the tap sequence');
 }
 // the known seeded timestamp, read on a phone in another zone
 if(P.tz&&P.tz!=='Australia/Sydney')for(const [where,set] of Object.entries(timesBy) as any)check(!set.has(KNOWN_HCM),{pass:P.id,screen:'(time)',control:'(seeded receipt time)',check:'Sydney time (rule 22)',detail:`${where}: shows ${KNOWN_HCM}, the device-zone time of a receipt saved at ${KNOWN_SYD} Sydney time`});
 await context.close();
 console.log(`  pass ${P.id}: done in ${Math.round((Date.now()-t0)/1000)} s`);
}

(async()=>{const browser=await chromium.launch(process.env.BEP_CHROMIUM?{executablePath:process.env.BEP_CHROMIUM}:{});const t0=Date.now();
 console.log(`Audit sweep: ${PASSES.length} passes × ${RUN_SCREENS.length} screens, ${CONCURRENCY} at a time${LEVEL2?', two levels':''}.`);
 try{const queue=[...PASSES];await Promise.all(Array.from({length:Math.min(CONCURRENCY,queue.length)},async()=>{while(queue.length){const P=queue.shift();try{await runPass(browser,P)}catch(e:any){fail({pass:P.id,screen:'(pass)',control:'(setup)',check:'sweep error',detail:String(e.message).split('\n')[0].slice(0,200)})}}}))}
 finally{await browser.close()}
 // Sydney time: compare each time-zone pass with its Sydney twin. A time shown 4 h earlier on the Ho Chi Minh phone (AEDT
 // UTC+11 vs ICT UTC+7) is the device zone leaking in.
 for(const P of PASSES.filter(p=>p.twin)){const a=passTimes[P.id],b=passTimes[P.twin];if(!a||!b){console.log(`  (time compare skipped: ${P.twin} not run)`);continue}
  const shift=(t:string,h:number)=>{const [H,M]=t.split(':').map(Number);return String((H+h+24)%24).padStart(2,'0')+':'+String(M).padStart(2,'0')};
  for(const [where,set] of Object.entries(a) as any){const syd=b[where];if(!syd)continue;for(const t of set){if(!t)continue;checks++;if(!syd.has(t)&&syd.has(shift(t,4)))fail({pass:P.id,screen:'(time)',control:'(compare with '+P.twin+')',check:'Sydney time (rule 22)',detail:`${where}: shows ${t} where the Sydney phone shows ${shift(t,4)}`})}}
  checks++;if(passGreeting[P.id]&&passGreeting[P.twin]&&passGreeting[P.id]!==passGreeting[P.twin])fail({pass:P.id,screen:'Hôm nay',control:'(greeting)',check:'Sydney time (rule 22)',detail:`greeting “${passGreeting[P.id]}” differs from the Sydney phone “${passGreeting[P.twin]}” at the same moment`})}
 // report
 const groups=new Map<string,{f:Fail,passes:string[]}>();for(const f of failures){const k=[f.screen,f.control,f.check,f.detail].join('|');if(!groups.has(k))groups.set(k,{f,passes:[]});groups.get(k)!.passes.push(f.pass)}
 const lines=[...groups.values()].sort((x,y)=>(x.f.check+x.f.screen).localeCompare(y.f.check+y.f.screen)).map(({f,passes})=>`FAIL ${SCREEN_NAME[f.screen]||f.screen} › ${f.control} › ${f.check}: ${f.detail}  [${passes.join(', ')}]`);
 console.log(`\nSkipped (destructive or outward), ${skips.size}:`);for(const [k,v] of skips)console.log(`  SKIP ${k}  [${[...v].length} passes]`);
 if(process.env.AUDIT_JSON)writeFileSync(process.env.AUDIT_JSON,JSON.stringify({failures,groups:[...groups.values()],skips:[...skips].map(([k,v])=>({k,passes:[...v]})),checks,taps},null,1));
 const byCheck=new Map<string,number>();for(const {f} of groups.values())byCheck.set(f.check,(byCheck.get(f.check)||0)+1);
 if(lines.length){console.log(`\n${lines.join('\n')}`);console.log(`\nAudit sweep FAILED: ${groups.size} distinct failures (${failures.length} over all passes) in ${checks} checks, ${taps} taps, ${Math.round((Date.now()-t0)/1000)} s.`);for(const [k,v] of [...byCheck].sort((a,b)=>b[1]-a[1]))console.log(`  ${String(v).padStart(4)}  ${k}`);process.exit(1)}
 console.log(`\nAudit sweep passed: ${checks} checks, ${taps} taps, ${PASSES.length} passes, ${Math.round((Date.now()-t0)/1000)} s.`)})().catch(e=>{console.error(e);process.exit(1)});
