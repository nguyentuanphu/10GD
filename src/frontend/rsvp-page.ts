// v1.7.13 guest invitations — the guest's page (rsvp.html). Owner, 8 Nov 2026 (Sydney time): a family sends a link; the guests
// choose how many adults and children are coming on a simple screen and send it, without an account or the app; they can change it,
// say something came up, add the meal to their own calendar (their phone reminds them), and see a light introduction to the app.
// Everything is shown in Sydney time. Pictures follow the shared art kit (ui-art.ts): 48×48, outline #3b2a4f 2.6 px.
'use strict';
(()=>{
const O='#3b2a4f',W=`stroke="${O}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"`,circ=(f:string)=>`<circle cx="24" cy="24" r="17" fill="${f}" ${W}/>`;
const svg=(b:string)=>`<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">${b}</svg>`;
const ART:Record<string,string>={add:svg(`${circ('#8fd0b0')}<path d="M24 15v18M15 24h18" ${W} stroke-width="4" fill="none"/>`),minus:svg(`${circ('#f3c9a6')}<path d="M15 24h18" ${W} stroke-width="4" fill="none"/>`),
 save:svg(`${circ('#8fd0b0')}<path d="M15 25l6 6 12-13" ${W} stroke-width="4" fill="none"/>`),calendar:svg(`<rect x="9" y="12" width="30" height="27" rx="5" fill="#fff6e8" ${W}/><path d="M9 20h30" ${W}/><path d="M17 8v8M31 8v8" ${W} stroke-width="3.2"/><rect x="16" y="25" width="6" height="5" rx="1.5" fill="#e3a06b" ${W} stroke-width="1.8"/>`)};
const TZ='Australia/Sydney',MEAL_TIME:Record<string,string>={breakfast:'08:00',snackAm:'10:00',lunch:'12:00',snack:'15:30',dinner:'18:30'};
const T:any={vi:{loading:'Đang mở lời mời…',invites:(h:string)=>`${h} mời bạn`,to:(g:string)=>`Lời mời gửi tới: ${g}`,meals:{breakfast:'Bữa sáng',snackAm:'Bữa phụ sáng',lunch:'Bữa trưa',snack:'Bữa phụ chiều',dinner:'Bữa tối'},
  deadline:(d:string)=>`Vui lòng báo trước ${d} (giờ Sydney).`,late:'Đã quá hạn báo. Bạn vẫn có thể báo không đến được; muốn đổi số người, hãy liên hệ trực tiếp với gia đình.',ended:'Lời mời này đã kết thúc.',cancelled:'Gia đình đã huỷ lời mời này.',notFound:'Không tìm thấy lời mời. Link có thể đã hết hạn hoặc bị gõ sai.',
  q:'Bạn có đến được không?',yes:'Sẽ đến',maybe:'Chưa chắc',no:'Không đến được',adults:'Người lớn',kids:'Trẻ em',adultsHint:'',kidsHint:'',more:'Thêm',fewer:'Bớt',note:'Lời nhắn (không bắt buộc)',notePh:'Ví dụ: đến muộn 30 phút',send:'Gửi',sending:'Đang gửi…',
  thanks:'Cảm ơn bạn! Gia đình đã nhận được câu trả lời.',your:'Bạn đã báo',change:'Đổi câu trả lời',busy:'Báo bận đột xuất',busyConfirm:'Báo cho gia đình là bạn không đến được nữa?',busyDone:'Đã báo bận đột xuất',calendar:'Thêm vào lịch',calendarHint:'Điện thoại sẽ nhắc bạn trước 1 ngày và trước 2 giờ.',
  st:{yes:'Sẽ đến',maybe:'Chưa chắc',no:'Không đến được',busy:'Bận đột xuất, không đến được'},people:(a:number,k:number)=>[a?`${a} lớn`:'',k?`${k} bé`:''].filter(Boolean).join(', '),
  error:'Chưa gửi được. Kiểm tra mạng rồi thử lại.',intro:'Bếp Nhà giúp nhà bạn lên thực đơn, đi chợ và mời khách như thế này.',introCta:'Dùng thử Bếp Nhà',eventTitle:(m:string,h:string)=>`${m} ở ${h}`},
 en:{loading:'Opening the invitation…',invites:(h:string)=>`${h} invites you`,to:(g:string)=>`Invitation for: ${g}`,meals:{breakfast:'Breakfast',snackAm:'Morning snack',lunch:'Lunch',snack:'Afternoon snack',dinner:'Dinner'},
  deadline:(d:string)=>`Please answer by ${d} (Sydney time).`,late:'The answer deadline has passed. You can still say you can’t come; to change the numbers, please contact the family directly.',ended:'This invitation has ended.',cancelled:'The family withdrew this invitation.',notFound:'Invitation not found. The link may have ended or be mistyped.',
  q:'Can you come?',yes:'Coming',maybe:'Not sure',no:'Can’t come',adults:'Adults',kids:'Children',more:'More',fewer:'Fewer',note:'Message (optional)',notePh:'e.g. arriving 30 minutes late',send:'Send',sending:'Sending…',
  thanks:'Thank you! The family has your answer.',your:'Your answer',change:'Change answer',busy:'Something came up',busyConfirm:'Tell the family you can no longer come?',busyDone:'Told the family something came up',calendar:'Add to calendar',calendarHint:'Your phone will remind you a day before and 2 hours before.',
  st:{yes:'Coming',maybe:'Not sure',no:'Can’t come',busy:'Something came up, not coming'},people:(a:number,k:number)=>[a?`${a} adult${a>1?'s':''}`:'',k?`${k} child${k>1?'ren':''}`:''].filter(Boolean).join(', '),
  error:'Not sent yet. Check the connection and try again.',intro:'Bếp Nhà helps your family plan meals, shop and invite guests like this.',introCta:'Try Bếp Nhà',eventTitle:(m:string,h:string)=>`${m} at ${h}`}};
const $=(s:string)=>document.querySelector(s) as HTMLElement;
const esc=(s:any)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'} as any)[c]);
// the family's short link is /m#<token>; older links are rsvp.html#t=<token>
const token=(new URLSearchParams(location.hash.slice(1)).get('t')||(/^#(?:[A-Za-z0-9]{6}|[A-Za-z0-9_-]{22,32})$/.test(location.hash)?location.hash.slice(1):'')||new URLSearchParams(location.search).get('t')||'').trim().replace(/^[A-Za-z0-9]{6}$/,(s:string)=>s.toLowerCase());
let lang:'vi'|'en'=(()=>{try{const s=localStorage.getItem('rsvp-lang');if(s==='vi'||s==='en')return s}catch(e){}return /^vi/i.test(navigator.language||'')?'vi':'en'})();
let view:any=null,editing=false,draft={status:'',adults:1,kids:0,note:''},busy=false,errorMsg='';
const t=()=>T[lang];
const dayFmt=(d:string)=>new Intl.DateTimeFormat(lang==='vi'?'vi-VN':'en-AU',{weekday:'short',day:'numeric',month:'numeric',timeZone:'UTC'}).format(new Date(d+'T00:00:00Z'));
const timeFmt=(iso:string)=>new Intl.DateTimeFormat(lang==='vi'?'vi-VN':'en-AU',{weekday:'short',day:'numeric',month:'numeric',hour:'2-digit',minute:'2-digit',timeZone:TZ}).format(new Date(iso));
function sydneyUtc(date:string,hm:string){const [y,m,d]=date.split('-').map(Number),[h,mi]=hm.split(':').map(Number);let guess=Date.UTC(y,m-1,d,h,mi)-11*3600000;for(let i=0;i<2;i++){const p:any=Object.fromEntries(new Intl.DateTimeFormat('en-AU',{timeZone:TZ,hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).formatToParts(new Date(guess)).map(x=>[x.type,x.value]));const shown=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute);guess+=Date.UTC(y,m-1,d,h,mi)-shown}return new Date(guess)}
function ics(){const z=(d:Date)=>d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//FamTray Bep Nha//Invitation//VI','CALSCALE:GREGORIAN','METHOD:PUBLISH'];
 for(const [i,m] of (view.meals as any[]).entries()){const start=sydneyUtc(m.date,MEAL_TIME[m.type]||'18:30'),end=new Date(start.getTime()+90*60000),title=t().eventTitle(t().meals[m.type]||m.type,view.host).replace(/[,;\\]/g,' ');
  lines.push('BEGIN:VEVENT','UID:'+token.slice(0,12)+'-'+i+'@famtray','DTSTAMP:'+z(new Date()),'DTSTART:'+z(start),'DTEND:'+z(end),'SUMMARY:'+title,'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+title,'TRIGGER:-P1D','END:VALARM','BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+title,'TRIGGER:-PT2H','END:VALARM','END:VEVENT')}
 lines.push('END:VCALENDAR');return lines.join('\r\n')}
function intro(){$('#intro').innerHTML=`<p>${esc(t().intro)}</p><a href="/">${esc(t().introCta)} →</a><p class="legal"><a href="/terms.html#${lang==='vi'?'invitations':'invitations-en'}">${esc(lang==='vi'?'Điều khoản':'Terms')}</a><span aria-hidden="true"> · </span><a href="/privacy.html#${lang==='vi'?'invitations':'invitations-en'}">${esc(lang==='vi'?'Quyền riêng tư':'Privacy')}</a></p>`}
function stepper(k:'adults'|'kids'){return `<div class="step"><span><b>${esc(t()[k])}</b></span><button class="round" type="button" data-step="${k}" data-d="-1" aria-label="${esc(t().fewer+' '+t()[k])}">${ART.minus}</button><output aria-live="polite">${draft[k]}</output><button class="round" type="button" data-step="${k}" data-d="1" aria-label="${esc(t().more+' '+t()[k])}">${ART.add}</button></div>`}
function render(){document.documentElement.lang=lang;document.title=(lang==='vi'?'Lời mời':'Invitation')+' · FamTray · Bếp Nhà';
 for(const b of document.querySelectorAll('.lang button') as any)b.setAttribute('aria-pressed',String(b.dataset.lang===lang));intro();
 const main=$('#rsvp');if(!view){main.innerHTML=`<section class="card"><p class="${errorMsg?'error':'muted'}">${esc(errorMsg||t().loading)}</p></section>`;return}
 const head=`<section class="card"><h1>${esc(t().invites(view.host))}</h1><p class="muted">${esc(t().to(view.guestName))}</p><ul class="meals">${view.meals.map((m:any)=>`<li>${esc(t().meals[m.type]||m.type)} · ${esc(dayFmt(m.date))}</li>`).join('')}</ul>${view.cancelled||view.expired?'':`<p class="deadline muted">${esc(t().deadline(timeFmt(view.deadline)))}</p>`}</section>`;
 if(view.cancelled||view.expired){main.innerHTML=head+`<section class="card"><p class="notice">${esc(view.cancelled?t().cancelled:t().ended)}</p></section>`;return}
 const r=view.response,answered=r&&!editing;
 if(answered){const coming=r.status==='yes'||r.status==='maybe';main.innerHTML=head+`<section class="card"><h2>${esc(t().your)}</h2><p class="status ${esc(r.status)}">${esc(t().st[r.status])}${coming?' · '+esc(t().people(r.adults,r.kids)):''}</p>${r.note?`<p class="muted">${esc(r.note)}</p>`:''}<p class="muted">${esc(t().thanks)}</p>
  ${coming?`<button class="primary" type="button" data-act="ics">${ART.calendar}<span>${esc(t().calendar)}</span></button><p class="muted" style="margin:6px 0 0;font-size:.9em">${esc(t().calendarHint)}</p>`:''}
  <div class="row2">${view.deadlinePassed?'':`<button class="secondary" type="button" data-act="change">${esc(t().change)}</button>`}${coming?`<button class="secondary" type="button" data-act="busy">${esc(t().busy)}</button>`:''}</div>${view.deadlinePassed?`<p class="notice">${esc(t().late)}</p>`:''}${errorMsg?`<p class="error">${esc(errorMsg)}</p>`:''}</section>`;return}
 const late=view.deadlinePassed,options=(late?['no']:['yes','maybe','no']);
 main.innerHTML=head+`<section class="card"><h2>${esc(t().q)}</h2>${late?`<p class="notice">${esc(t().late)}</p>`:''}<div class="choices" role="group">${options.map(s=>`<button class="choice" type="button" data-status="${s}" aria-pressed="${draft.status===s}">${esc(t()[s])}</button>`).join('')}</div>
  ${draft.status==='yes'||draft.status==='maybe'?stepper('adults')+stepper('kids'):''}<label class="note"><span>${esc(t().note)}</span><textarea id="rsvp-note" maxlength="200" placeholder="${esc(t().notePh)}">${esc(draft.note)}</textarea></label>
  <button class="primary" type="button" data-act="send" ${draft.status&&!busy?'':'disabled'}>${ART.save}<span>${esc(busy?t().sending:t().send)}</span></button>${errorMsg?`<p class="error">${esc(errorMsg)}</p>`:''}</section>`}
async function load(){if(!/^(?:[a-hjkmnp-z2-9]{6}|[A-Za-z0-9_-]{22}(?:[A-Za-z0-9_-]{10})?)$/.test(token)){errorMsg=t().notFound;render();return}
 try{const res=await fetch('/.netlify/functions/rsvp?t='+encodeURIComponent(token),{cache:'no-store'});if(!res.ok){errorMsg=t().notFound;render();return}view=await res.json();
  const r=view.response;draft={status:r?.status&&r.status!=='busy'?r.status:'',adults:r&&(r.status==='yes'||r.status==='maybe')?r.adults:view.adults||1,kids:r&&(r.status==='yes'||r.status==='maybe')?r.kids:view.kids||0,note:r?.note||''};render()}catch(e){errorMsg=t().error;render()}}
async function send(status:string){busy=true;errorMsg='';render();const coming=status==='yes'||status==='maybe';
 try{const res=await fetch('/.netlify/functions/rsvp?t='+encodeURIComponent(token),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({status,...(coming?{adults:draft.adults,kids:draft.kids}:{}),note:draft.note})});const data=await res.json().catch(()=>({}));
  if(res.ok){view=data.view;editing=false}else{if(data.view)view=data.view;errorMsg=lang==='vi'&&data.reason==='deadline_passed'?t().late:data.error||t().error}}catch(e){errorMsg=t().error}busy=false;render()}
document.addEventListener('click',e=>{const b=(e.target as any)?.closest?.('button');if(!b)return;
 if(b.dataset.lang){lang=b.dataset.lang;try{localStorage.setItem('rsvp-lang',lang)}catch(err){}render();return}
 if(b.dataset.status){draft.status=b.dataset.status;if((draft.status==='yes'||draft.status==='maybe')&&draft.adults+draft.kids<1)draft.adults=1;render();return}
 if(b.dataset.step){const k=b.dataset.step as 'adults'|'kids';draft[k]=Math.max(0,Math.min(30,draft[k]+(+b.dataset.d)));const o=b.parentElement.querySelector('output');if(o)o.textContent=String(draft[k]);return}
 const a=b.dataset.act;if(a==='send'&&draft.status&&!busy){draft.note=($('#rsvp-note') as any)?.value||'';if((draft.status==='yes'||draft.status==='maybe')&&draft.adults+draft.kids<1){errorMsg=lang==='vi'?'Có bao nhiêu người lớn và trẻ em?':'How many adults and children?';render();return}send(draft.status)}
 if(a==='change'){editing=true;render()}
 if(a==='busy'&&confirm(t().busyConfirm)){draft.note=view.response?.note||'';send('busy')}
 if(a==='ics'){const blob=new Blob([ics()],{type:'text/calendar'}),u=URL.createObjectURL(blob),link=document.createElement('a');link.href=u;link.download='bep-nha-loi-moi.ics';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(u),2000)}});
document.addEventListener('input',e=>{const x=e.target as any;if(x?.id==='rsvp-note')draft.note=x.value});
render();load();
})();
