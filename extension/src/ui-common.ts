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
ui.init=async()=>{ui.lang=await SC.lang();const st=await SC.get(['theme']);ui.theme=st.theme||'auto';ui.applyTheme();document.documentElement.lang=ui.lang;matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',ui.applyTheme)};
ui.applyTheme=()=>{const dark=ui.theme==='dark'||ui.theme==='auto'&&matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.dataset.theme=dark?'dark':'light'};
ui.when=(ms:any)=>{if(!ms)return ui.T('chưa có','never');const d=new Date(ms);return d.toLocaleString(ui.lang==='en'?'en-AU':'vi-VN',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})};
ui.reason=(code:any)=>({'auto-off':ui.T('Studio đang tắt chế độ tự động','Auto mode is off in Studio'),'paused-global':ui.T('Mạng Scout đang tạm dừng','Scout network paused'),'device-not-allowed':ui.T('Studio chưa cho phép máy này','Studio has not allowed this device'),'device-toggle-off':ui.T('Tự động đang tắt trên máy này','Auto is off on this device'),'paused-device':ui.T('Máy này đang tạm dừng','This device is paused'),'outside-window':ui.T('Ngoài khung giờ','Outside the schedule'),'no-tasks':ui.T('Hết việc','No more tasks'),'cap-run':ui.T('Đủ số trang mỗi lần chạy','Per-run page limit reached'),'cap-day':ui.T('Đủ số trang hôm nay','Daily page limit reached'),'cap-retailer':ui.T('Đủ giới hạn cửa hàng hôm nay','Retailer daily limit reached'),blocked:ui.T('Trang yêu cầu xác minh — đã dừng 24 giờ','Site check shown — paused 24 h'),'on-battery':ui.T('Máy đang dùng pin','Running on battery'),paused:ui.T('Bạn đã tạm dừng','You paused it'),'switched-off':ui.T('Bạn đã tắt tự động','You switched Auto off'),stopped:ui.T('Đã dừng','Stopped'),'user-active':ui.T('Đang chờ bạn rời máy','Waiting until you are away'),'no-window':ui.T('Cần mở Chrome','Chrome needs an open window'),'local-off':ui.T('Tự động đang tắt','Auto is off'),offline:ui.T('Không kết nối được','Cannot reach the server'),'run-now-refused':ui.T('Chưa được chạy ngay','Run now not allowed'),refused:ui.T('Máy chủ từ chối','Refused by the server'),rate:ui.T('Thử lại sau một phút','Try again in a minute')} as any)[code]||String(code||'');
ui.nextRun=(st:any)=>{const v=st.device;if(!v||!st.autoEnabled||!v.autoAllowed||v.network?.autoScout!=='on')return null;return CORE.nextWindowStart(Date.now(),v.schedule,v.timeZone)};
ui.storeWarnings=(st:any)=>{const out:string[]=[];for(const [r,on] of Object.entries<any>(st.warnings?.signedIn||{}))if(on)out.push(ui.T(`Có vẻ bạn đang đăng nhập tài khoản trên ${ui.LABEL[r]}. Hãy dùng một hồ sơ Chrome riêng, không đăng nhập Everyday Rewards/Flybuys.`,`You seem to be signed in on ${ui.LABEL[r]}. Use a separate Chrome profile that is not signed in to Everyday Rewards/Flybuys.`));for(const [r,on] of Object.entries<any>(st.warnings?.storeMismatch||{}))if(on)out.push(ui.T(`Cửa hàng trên ${ui.LABEL[r]} (“${st.warnings.storesSeen?.[r]||'?'}”) khác cửa hàng đã chọn (“${st.device?.stores?.[r]||'?'}”). Giá sẽ được gắn cờ.`,`The ${ui.LABEL[r]} store shown (“${st.warnings.storesSeen?.[r]||'?'}”) differs from the assigned store (“${st.device?.stores?.[r]||'?'}”). Prices are tagged.`));return out};
// v1.7 pace presets (labels only; the server decides and clamps).
ui.PACES=()=>({slow:ui.T('Chậm 30–60 giây','Slow 30–60 s'),normal:ui.T('Bình thường 20–40 giây','Normal 20–40 s'),fast:ui.T('Nhanh 8–15 giây','Fast 8–15 s'),veryfast:ui.T('Rất nhanh 3–6 giây','Very fast 3–6 s')});
ui.PACE_MS={slow:{minMs:30000,maxMs:60000},normal:{minMs:20000,maxMs:40000},fast:{minMs:8000,maxMs:15000},veryfast:{minMs:3000,maxMs:6000}};
ui.paceLabel=(p:any)=>{if(!p)return '—';const name=ui.PACES()[p.preset];return (name||ui.T('Tùy chỉnh','Custom')+' '+Math.round(p.minMs/1000)+'–'+Math.round(p.maxMs/1000)+(ui.lang==='en'?' s':' giây'))+(Object.keys(p.byRetailer||{}).length?' · '+ui.T('chậm lại hôm nay: ','slowed today: ')+Object.keys(p.byRetailer).map((r:string)=>ui.LABEL[r]).join(', '):'')};
root.ScoutUI=ui;
})(globalThis);
