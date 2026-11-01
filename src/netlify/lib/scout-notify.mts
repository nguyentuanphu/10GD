// FamTray Scout (v1.7) — owner phone notifications. Reuses the app's own web push: a
// message goes only to the push-enabled app devices signed in as a Studio owner
// (STUDIO_ADMINS), in each family that owner belongs to. Which kinds are sent is opt-in in
// Studio → Scout network → Notifications (see NOTIFY_KINDS in scout.mts). Quiet hours of
// each phone still apply. No page contents are ever included.
import {accountStore,scopedStore,membershipIndex} from './accounts.mjs';
import {sendPushBatch,devices} from './push.mjs';

const LABEL:any={woolworths:'Woolworths',coles:'Coles',aldi:'ALDI',chemist:'Chemist Warehouse',amazon:'Amazon AU'};
/** Message text for one Scout event (VI + EN). */
export function scoutMessage(type:string,d:any){const name=String(d?.name||d?.deviceId||'FamTray').slice(0,40),shop=LABEL[d?.retailer]||'';
 if(type==='run_finished')return{title:'FamTray So sánh giá: đã chạy xong',enTitle:'FamTray Price Compare: run finished',body:`${name}: ${d.pages||0} trang, ${d.prices||0} giá${d.skipped?`, bỏ qua ${d.skipped}`:''}.`,enBody:`${name}: ${d.pages||0} pages, ${d.prices||0} prices${d.skipped?`, ${d.skipped} skipped`:''}.`};
 if(type==='device_blocked')return{title:'FamTray So sánh giá: bị chặn, tạm dừng 24 giờ',enTitle:'FamTray Price Compare: blocked, paused 24 h',body:`${shop||'Cửa hàng'} hiện trang xác minh/chặn (${d.kind||'?'}). Máy tự dừng; không cần làm gì.`,enBody:`${shop||'A retailer'} showed a check/block (${d.kind||'?'}). The computer paused itself; nothing to do.`};
 if(type==='device_offline')return{title:'FamTray So sánh giá: máy tính không liên lạc',enTitle:'FamTray Price Compare: computer offline',body:`${name} không liên lạc trong khung giờ chạy. Máy có thể đang ngủ, tắt hoặc Chrome đã đóng.`,enBody:`${name} has been silent during its price-compare window. It may be asleep, off, or Chrome is closed.`};
 if(type==='parser_breakage')return{title:'FamTray So sánh giá: tự dừng một cửa hàng',enTitle:'FamTray Price Compare: retailer auto-paused',body:`${shop}: trình đọc giá lỗi nhiều, đã tự dừng. Kiểm tra trong Studio.`,enBody:`${shop}: too many pages could not be read, auto-paused. Check Studio.`};
 return null}
const admins=(env:any)=>String(env?.STUDIO_ADMINS||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
/** Sends one Scout event to every Studio owner's own push devices. `send` is injectable for tests. */
export async function notifyOwners(getStoreFn:any,type:string,data:any,env:any=process.env,{send}:any={}){const m=scoutMessage(type,data);if(!m)return{sent:0};
 const accounts=accountStore(getStoreFn),root=getStoreFn({name:'bep-family-data',consistency:'strong',region:'ap-southeast-2'});let sent=0;
 for(const owner of admins(env)){let a:any=null;try{a=await accounts.get('users/'+owner,{type:'json'})}catch{}if(!a)continue;
  const ids=[...new Set([...Object.keys(membershipIndex(a)||{}),a.lastHouseholdId].filter((x:any)=>/^[a-f0-9-]{36}$/.test(String(x||''))))];
  for(const id of ids){try{const f=await accounts.get('families/'+id,{type:'json'});if(!f?.members?.[owner])continue;const store=scopedStore(root,id,f.members);
   const mine=(await devices(store)).filter((d:any)=>d.accountUsername===owner).map((d:any)=>d.deviceId);if(!mine.length)continue;
   const r=await sendPushBatch(store,{type:'scout',key:'scout-'+type,tag:'scout-'+type,url:'/#shopping',...m},{deviceIds:mine,...(send?{send}:{})});sent+=r.accepted||0}catch{}}}
 return{sent}}
