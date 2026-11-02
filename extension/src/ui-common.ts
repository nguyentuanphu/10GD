// FamTray Scout — helpers shared by popup.html and options.html (bilingual VI/EN,
// theme, status wording). Classic script; defines globalThis.ScoutUI.
declare const chrome:any;
(function scoutUI(root:any){
'use strict';
const SC=root.ScoutClient,CORE=root.ScoutCore;
const ui:any={lang:'vi'};
ui.T=(vi:string,en:string)=>ui.lang==='en'?en:vi;
ui.esc=(v:any)=>String(v??'').replace(/[&<>"']/g,(c:string)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'} as any)[c]);
ui.$=(s:string,r:any=document)=>r.querySelector(s);
ui.LABEL={woolworths:'Woolworths',coles:'Coles',aldi:'ALDI',chemist:'Chemist Warehouse',amazon:'Amazon AU'};
ui.DAYS=()=>[ui.T('CN','Sun'),ui.T('T2','Mon'),ui.T('T3','Tue'),ui.T('T4','Wed'),ui.T('T5','Thu'),ui.T('T6','Fri'),ui.T('T7','Sat')];
ui.init=async()=>{try{ui.installType=(await chrome.management?.getSelf?.())?.installType||null}catch{ui.installType=null}ui.lang=await SC.lang();const st=await SC.get(['theme']);ui.theme=st.theme||'auto';ui.applyTheme();document.documentElement.lang=ui.lang;matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',ui.applyTheme)};
ui.applyTheme=()=>{const dark=ui.theme==='dark'||ui.theme==='auto'&&matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.dataset.theme=dark?'dark':'light'};
ui.when=(ms:any)=>{if(!ms)return ui.T('chưa có','never');const d=new Date(ms);return d.toLocaleString(ui.lang==='en'?'en-AU':'vi-VN',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})};
ui.reason=(code:any)=>({'auto-off':ui.T('Studio đang tắt chế độ tự động','Auto mode is off in Studio'),'paused-global':ui.T('Mạng So Giá đang tạm dừng','Price Check network paused'),'device-not-allowed':ui.T('Studio chưa cho phép máy này','Studio has not allowed this device'),'device-toggle-off':ui.T('Tự động đang tắt trên máy này','Auto is off on this device'),'paused-device':ui.T('Máy này đang tạm dừng','This device is paused'),'outside-window':ui.T('Ngoài khung giờ','Outside the schedule'),'no-tasks':ui.T('Hết việc','No more tasks'),'cap-run':ui.T('Đủ số trang mỗi lần chạy','Per-run page limit reached'),'cap-day':ui.T('Đủ số trang hôm nay','Daily page limit reached'),'cap-retailer':ui.T('Đủ giới hạn cửa hàng hôm nay','Retailer daily limit reached'),blocked:ui.T('Trang yêu cầu xác minh — đã dừng 24 giờ','Site check shown — paused 24 h'),'on-battery':ui.T('Máy đang dùng pin','Running on battery'),paused:ui.T('Bạn đã tạm dừng','You paused it'),'switched-off':ui.T('Bạn đã tắt tự động','You switched Auto off'),stopped:ui.T('Đã dừng','Stopped'),'user-active':ui.T('Đang chờ bạn rời máy','Waiting until you are away'),'no-window':ui.T('Cần mở Chrome','Chrome needs an open window'),'local-off':ui.T('Tự động đang tắt','Auto is off'),offline:ui.T('Không kết nối được','Cannot reach the server'),'run-now-refused':ui.T('Chưa được chạy ngay','Run now not allowed'),refused:ui.T('Máy chủ từ chối','Refused by the server'),rate:ui.T('Thử lại sau một phút','Try again in a minute')} as any)[code]||String(code||'');
ui.nextRun=(st:any)=>{const v=st.device;if(!v||!st.autoEnabled||!v.autoAllowed||v.network?.autoScout!=='on')return null;return CORE.nextWindowStart(Date.now(),v.schedule,v.timeZone)};
ui.storeWarnings=(st:any)=>{const out:string[]=[];for(const [r,on] of Object.entries<any>(st.warnings?.signedIn||{}))if(on)out.push(ui.T(`Có vẻ bạn đang đăng nhập tài khoản trên ${ui.LABEL[r]}. Hãy dùng một hồ sơ Chrome riêng, không đăng nhập Everyday Rewards/Flybuys.`,`You seem to be signed in on ${ui.LABEL[r]}. Use a separate Chrome profile that is not signed in to Everyday Rewards/Flybuys.`));for(const [r,on] of Object.entries<any>(st.warnings?.storeMismatch||{}))if(on)out.push(ui.T(`Cửa hàng trên ${ui.LABEL[r]} (“${st.warnings.storesSeen?.[r]||'?'}”) khác cửa hàng đã chọn (“${st.device?.stores?.[r]||'?'}”). Giá sẽ được gắn cờ.`,`The ${ui.LABEL[r]} store shown (“${st.warnings.storesSeen?.[r]||'?'}”) differs from the assigned store (“${st.device?.stores?.[r]||'?'}”). Prices are tagged.`));return out};
// v1.7 pace presets (labels only; the server decides and clamps).
ui.PACES=()=>({slow:ui.T('Chậm 30–60 giây','Slow 30–60 s'),normal:ui.T('Bình thường 20–40 giây','Normal 20–40 s'),fast:ui.T('Nhanh 8–15 giây','Fast 8–15 s'),veryfast:ui.T('Rất nhanh 3–6 giây','Very fast 3–6 s')});
ui.PACE_MS={slow:{minMs:30000,maxMs:60000},normal:{minMs:20000,maxMs:40000},fast:{minMs:8000,maxMs:15000},veryfast:{minMs:3000,maxMs:6000}};
ui.paceLabel=(p:any)=>{if(!p)return '—';const name=ui.PACES()[p.preset];return (name||ui.T('Tùy chỉnh','Custom')+' '+Math.round(p.minMs/1000)+'–'+Math.round(p.maxMs/1000)+(ui.lang==='en'?' s':' giây'))+(Object.keys(p.byRetailer||{}).length?' · '+ui.T('chậm lại hôm nay: ','slowed today: ')+Object.keys(p.byRetailer).map((r:string)=>ui.LABEL[r]).join(', '):'')};

// ---------- v1.7.2 (owner: “how do I turn Auto on?”): readiness checklist, one-line state, schedule presets, update banner ----------
const T=ui.T;
ui.onboarded=(st:any)=>{const o=st.onboarding||{};return !!(o.profile&&o.rewards&&o.store)};
ui.appBase=(st:any)=>{const s=String(st.server||SC.BUILD.server||'').replace(/\/+$/,'');return SC.serverOk(s)?s:''};
ui.studioUrl=(st:any)=>{const b=ui.appBase(st);return b?b+'/studio.html#scout':''};
/** Auto mode needs five things, in this order. Each missing one names its fix. */
ui.readiness=(st:any)=>{const v=st.device,paired=!!st.token,admin=!paired||!v||v.ownerStudio===true;// unknown until paired: no “admin only” note
 return [
  {id:'pair',ok:paired,title:T('Đã ghép máy','Computer paired'),todo:T('Ghép máy này với Bếp Gia Đình.','Pair this computer with the family kitchen app.'),fix:'pair',fixLabel:T('Ghép ngay','Pair now')},
  {id:'network',short:T('Studio: bật So Giá tự động','Studio: Auto price check on'),ok:paired&&v?.network?.autoScout==='on',title:T('Studio bật “So Giá tự động”','Studio: “Auto price check” on'),todo:T('Studio → Mạng So Giá → bật So Giá tự động cho cả mạng.','Studio → Price Check network → switch Auto price check on.'),fix:'studio',fixLabel:T('Mở Studio','Open Studio'),adminOnly:!admin},
  {id:'device',short:T('Studio: cho phép máy này','Studio: allow this computer'),ok:paired&&v?.autoAllowed===true,title:T('Studio “Cho phép tự động” cho máy này','Studio: “Allow auto” for this computer'),todo:T('Studio → Mạng So Giá → máy này → “Cho phép tự động”.','Studio → Price Check network → this computer → “Allow auto”.'),fix:'studio',fixLabel:T('Mở Studio','Open Studio'),adminOnly:!admin},
  {id:'prep',ok:ui.onboarded(st),title:T('Chuẩn bị máy','Prepare this computer'),todo:T('Hồ sơ Chrome riêng, không đăng nhập tài khoản mua sắm, đã chọn cửa hàng.','Separate Chrome profile, not signed in to shopping accounts, stores selected.'),fix:'prep',fixLabel:T('Chuẩn bị','Prepare')},
  {id:'toggle',ok:st.autoEnabled===true,title:T('Bật Tự động trên máy này','Auto on for this computer'),todo:T('Bật công tắc này khi bước ① và ④ đã xong.','Switch it on once steps ① and ④ are done.'),fix:'toggle',fixLabel:T('Bật','Switch on')}]};
ui.NUM=['①','②','③','④','⑤'];
/** Run now (a person at this computer) needs ①–④; it does not wait for the schedule. */
ui.runNowReady=(st:any)=>ui.readiness(st).slice(0,4).every((x:any)=>x.ok)&&!st.paused&&!st.device?.paused&&!st.device?.network?.paused;
ui.short=(ms:any)=>{if(!ms)return '—';const d=new Date(ms),hm=d.toLocaleTimeString(ui.lang==='en'?'en-AU':'vi-VN',{hour:'2-digit',minute:'2-digit',hour12:false});const far=Math.abs(+d-Date.now())>6*864e5;return ui.DAYS()[d.getDay()]+(far?' '+d.getDate()+'/'+(d.getMonth()+1):'')+' '+hm};
/** One line that says where things stand (popup header card and options status). */
ui.state=(st:any)=>{const v=st.device;
 if(!st.token)return{key:'unpaired',line:T('Chưa ghép','Not paired yet')};
 if(st.run)return{key:'running',line:T(`Đang chạy · ${st.run.pages||0}/${v?.caps?.pagesPerRun||150} trang`,`Running · ${st.run.pages||0}/${v?.caps?.pagesPerRun||150} pages`)};
 if(st.paused)return{key:'paused',line:T('Tạm dừng','Paused')};
 if(v?.paused){const until=ui.short(Date.parse(v.paused.until));return String(v.paused.reason||'').startsWith('blocked')?{key:'blocked',line:T('Bị chặn đến ','Blocked until ')+until}:{key:'device-paused',line:T('Tạm dừng đến ','Paused until ')+until}}
 if(v?.network?.paused)return{key:'network-paused',line:T('Mạng So Giá đang tạm dừng','Price Check network paused')};
 if(ui.readiness(st).every((x:any)=>x.ok)){const next=ui.nextRun(st);return{key:'ready',line:T('Tự động: sẵn sàng','Auto: ready')+(next?' · '+T('lần chạy tới ','next run ')+ui.short(next):'')}}
 return{key:'semi',line:T('Đã ghép · ','Paired · ')+(st.semiEnabled!==false?T('Bán tự động đang bật','Semi-auto on'):T('Bán tự động đang tắt','Semi-auto off'))}};
ui.lastCapture=(semi:any)=>semi?.count?T(`Đã lưu ${semi.count} giá · ${semi.retailerLabel||''}${semi.store?' '+semi.store:''}`,`Saved ${semi.count} prices · ${semi.retailerLabel||''}${semi.store?' '+semi.store:''}`):semi?.error?T('Chưa gửi được: ','Not sent: ')+semi.error:'';
// Schedule presets map to the SAME stored format ([{days:[0–6],start:'HH:MM',end:'HH:MM'}]).
ui.PRESETS={default:CORE.DEFAULT_SCHEDULE,daily:[{days:[0,1,2,3,4,5,6],start:'06:30',end:'09:00'}]};
ui.presetLabel=(k:string)=>(({default:T('T4 & T7 sáng (mặc định)','Wed & Sat mornings (default)'),daily:T('Mỗi sáng 06:30–09:00','Every morning 06:30–09:00'),custom:T('Tuỳ chỉnh','Custom')}) as any)[k];
const normSched=(w:any)=>JSON.stringify((w||[]).map((x:any)=>({days:[...x.days].sort((a:number,b:number)=>a-b),start:x.start,end:x.end})));
ui.presetOf=(sched:any)=>Object.keys(ui.PRESETS).find(k=>normSched(ui.PRESETS[k])===normSched(sched))||'custom';
ui.scheduleText=(sched:any)=>{const k=ui.presetOf(sched);return k!=='custom'?ui.presetLabel(k).replace(/ \((mặc định|default)\)$/,''):(sched||[]).map((w:any)=>w.days.map((d:number)=>ui.DAYS()[d]).join(', ')+' '+w.start+'–'+w.end).join(' · ')};
ui.PACE_SHORT=()=>({slow:[T('Chậm','Slow'),'30–60 s'],normal:[T('Bình thường','Normal'),'20–40 s'],fast:[T('Nhanh','Fast'),'8–15 s'],veryfast:[T('Rất nhanh','Very fast'),'3–6 s']});
/** The device may only pick Studio's pace or slower. */
ui.paceAllowed=(k:string,limit:any)=>!limit||ui.PACE_MS[k].minMs>=limit.minMs;
// ---------- update check (the server says which version this deploy ships) ----------
ui.update=(st:any)=>{const u=st.device?.update;if(!st.token||!u?.latest||CORE.versionCmp(SC.version(),u.latest)>=0)return null;const b=ui.appBase(st);return{...u,current:SC.version(),zipUrl:b&&u.zip?b+u.zip:'',store:ui.installType==='normal'}};
/** Popup: one line + a button that opens the guided steps in Settings. */
ui.updateLine=(st:any)=>{const u=ui.update(st);if(!u)return '';return `<p class="banner info upd-line" data-update role="status"><span>🆕 ${ui.esc(T('Có bản mới ','New version ')+u.latest)}</span><button type="button" class="btn small primary" id="upd-open">${u.store?T('Xem','Details'):T('Cập nhật (1 phút)','Update (1 min)')}</button></p>`};
/** Settings: the guided three-step update (unpacked install) or the store note. */
ui.updateHtml=(st:any)=>{const u=ui.update(st);if(!u)return '';const id=chrome.runtime?.id||'';
 const head=`<h2 id="h-update">🆕 ${ui.esc(T(`Có bản mới ${u.latest} · Cập nhật (1 phút)`,`New version ${u.latest} · Update (1 min)`))}</h2><p class="muted">${ui.esc(T(`Máy này đang dùng ${u.current}. Ghép nối, cửa hàng và cài đặt được giữ nguyên.`,`This computer has ${u.current}. Pairing, stores and settings are kept.`))}</p>`;
 if(u.store)return `<section class="card upd" id="update" aria-labelledby="h-update" data-update="store">${head}<p>${T('Bản cài từ cửa hàng tiện ích tự cập nhật trong vài giờ — bạn không cần làm gì.','The store version updates by itself within a few hours — nothing to do.')}</p></section>`;
 const store=u.storeUrl?`<p class="banner ok" data-update-store>${T('Cài từ Chrome Web Store một lần để từ nay tự cập nhật:','Install once from the Chrome Web Store and it updates by itself from now on:')} <a href="${ui.esc(u.storeUrl)}" target="_blank" rel="noopener">${T('Mở Chrome Web Store','Open Chrome Web Store')}</a></p>`:'';
 return `<section class="card upd" id="update" aria-labelledby="h-update" data-update="manual">${head}${store}
 <ol class="upd-steps">
  <li><span class="upd-n" aria-hidden="true">1</span><div><strong>${T('Tải bản mới','Download the new version')}</strong>${u.zipUrl?`<a class="btn primary small" data-upd-zip href="${ui.esc(u.zipUrl)}" download>⬇ ${T('Tải famtray-scout.zip','Download famtray-scout.zip')}</a>`:`<span class="muted">${T('Mở Bếp Gia Đình → Bếp của tôi → Ghép máy tính này → Tải tiện ích.','Open the family kitchen app → My kitchen → Pair this computer → Download.')}</span>`}</div></li>
  <li><span class="upd-n" aria-hidden="true">2</span><div><strong>${T('Giải nén đè lên thư mục cũ','Unzip over the old folder')}</strong><span class="muted">${T('Mở thư mục tải về, giải nén và chép đè vào đúng thư mục bạn đã “Tải tiện ích đã giải nén” lần trước.','Open your downloads, unzip, and copy over the same folder you loaded last time.')}</span><button type="button" class="btn small" data-upd-downloads>📂 ${T('Mở thư mục tải về','Open downloads')}</button></div></li>
  <li><span class="upd-n" aria-hidden="true">3</span><div><strong>${T('Bấm ↻ Tải lại','Press ↻ Reload')}</strong><span class="muted">${T('Không bấm “Xoá” — xoá sẽ mất ghép nối.','Do not press “Remove” — that loses the pairing.')}</span><span class="row"><button type="button" class="btn small primary" data-upd-reload>↻ ${T('Tải lại tiện ích','Reload extension')}</button><button type="button" class="btn small" data-upd-extensions data-ext-id="${ui.esc(id)}">${T('Mở chrome://extensions','Open chrome://extensions')}</button></span></div></li>
 </ol></section>`};
ui.bindUpdate=(root:any=document)=>{
 root.querySelector('[data-upd-downloads]')?.addEventListener('click',()=>chrome.tabs.create({url:'chrome://downloads'}));
 root.querySelector('[data-upd-extensions]')?.addEventListener('click',()=>chrome.tabs.create({url:'chrome://extensions/?id='+chrome.runtime.id}));
 root.querySelector('[data-upd-reload]')?.addEventListener('click',()=>chrome.runtime.reload())};
root.ScoutUI=ui;
})(globalThis);
