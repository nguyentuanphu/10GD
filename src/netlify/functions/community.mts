// Community Price Pilot API. Same account/household gate as grocery.mts and family.mts:
// a live account session is required (device-only users cannot read or write in the
// pilot), mutations require a same-origin request, viewers are read-only, disabled
// accounts are refused. When the Studio flag `communityPrices` is off every operation
// except `status` answers 404 {disabled:true}, so nothing changes for users.
import {getStore} from '@netlify/blobs';
import {resolveAccount} from '../lib/accounts.mjs';
import {platformSettings} from '../lib/studio.mjs';
import {pilotConfig,eligibility,contributor,communityStore,communityPrices,contribute,report,acceptTerms,shopApply,shopStatus,shopPost,storeHeldPhoto,ipHashOf,RULES,TERMS_VERSION} from '../lib/community-prices.mjs';
const json=(data:any,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});

export function createCommunityHandler({getStoreFn=getStore,env=process.env,nowFn=()=>Date.now()}:any={}){
 return async(request:Request)=>{
  const url=new URL(request.url),op=url.searchParams.get('op')||'',method=request.method,isRead=['GET','HEAD'].includes(method),now=nowFn();
  try{
   if(!isRead&&request.headers.get('origin')!==url.origin)return json({error:'Yêu cầu phải từ cùng trang.',errorEn:'Same-origin request required.'},403);
   const settings=await platformSettings(getStoreFn,{env,now}),pilot=pilotConfig(settings.values);
   const ctx=await resolveAccount(request,getStoreFn,now);
   if(op==='status'&&isRead){
    if(!pilot.enabled)return json({enabled:false});
    if(!ctx)return json({enabled:true,signedIn:false,states:pilot.states});
    const c=await contributor(communityStore(getStoreFn),ctx.account.username);
    return json({enabled:true,signedIn:true,states:pilot.states,eligibility:eligibility(ctx.account,ctx.household,now),viewer:ctx.member?.role==='viewer',termsAcceptedAt:c?.termsAcceptedAt||null,termsVersion:TERMS_VERSION,shop:await shopStatus(getStoreFn,ctx.account.username),limits:{perDay:RULES.accountDaily,captureMaxDays:RULES.captureMaxDays}});
   }
   if(!pilot.enabled)return json({error:'Tính năng chưa bật.',errorEn:'Not enabled.',disabled:true},404);
   if(!ctx)return json({error:'Cần đăng nhập tài khoản.',errorEn:'Sign in first.'},401);
   if(ctx.account.disabled===true)return json({error:'Tài khoản đang tạm khóa.',errorEn:'Account disabled.'},403);
   if(!isRead&&ctx.member?.role==='viewer')return json({error:'Tài khoản chỉ xem không được gửi giá.',errorEn:'View-only accounts cannot send prices.'},403);
   const body=async(max=20000)=>{const raw=await request.text();if(raw.length>max)throw Object.assign(Error('Quá lớn.'),{status:413,en:'Too large.'});try{return raw?JSON.parse(raw):{}}catch{throw Object.assign(Error('Dữ liệu không hợp lệ.'),{status:400,en:'Invalid JSON.'})}};
   if(op==='prices'&&isRead){
    const state=url.searchParams.get('state')||'';if(!pilot.states.includes(state))return json({error:'Bang chưa hỗ trợ.',errorEn:'State not in the pilot.',states:pilot.states},400);
    const branches=(url.searchParams.get('branch')||'').split(',').map(x=>x.trim()).filter(Boolean).slice(0,20);
    return json({...await communityPrices(getStoreFn,{state,branches,now}),fetchedAt:new Date(now).toISOString(),notice:{vi:'Giá cộng đồng do các gia đình khác báo lại, không phải giá niêm yết đảm bảo.',en:'Community prices are reported by other families and are not guaranteed shelf prices.'}});
   }
   if(op==='accept-terms'&&method==='POST'){const b=await body();if(b.accept!==true||b.version!==TERMS_VERSION)return json({error:'Cần đồng ý điều khoản.',errorEn:'Terms must be accepted.'},400);return json(await acceptTerms(getStoreFn,ctx.account.username,now))}
   if(op==='contribute'&&method==='POST'){
    const b=await body();if(b.consent!==true)return json({error:'Cần chọn chia sẻ.',errorEn:'Sharing was not opted in.'},400);
    if(!ctx.household)return json({error:'Chọn hoặc tạo gia đình trước.',errorEn:'Choose or create a family first.'},409);
    return json(await contribute(getStoreFn,{context:ctx,observation:b.observation,branch:b.branch,ipHash:ipHashOf(request,env),now,states:pilot.states}),201);
   }
   if(op==='photo'&&method==='POST'){
    const id=url.searchParams.get('id')||'',state=url.searchParams.get('state')||'',itemId=url.searchParams.get('item')||'';
    if(!/^cp-[a-z0-9]+-[a-f0-9]{10}$/.test(id)||!pilot.states.includes(state)||!/^[a-z0-9-]{1,60}$/.test(itemId))return json({error:'Không hợp lệ.',errorEn:'Invalid.'},400);
    const bytes=await request.arrayBuffer();
    return json(await storeHeldPhoto(getStoreFn,{username:ctx.account.username,state,itemId,id,bytes,now}),201);
   }
   if(op==='report'&&method==='POST')return json(await report(getStoreFn,{context:ctx,body:await body(4000),now}),201);
   if(op==='shop-apply'&&method==='POST')return json(await shopApply(getStoreFn,{username:ctx.account.username,body:await body(4000),now}),201);
   if(op==='shop-price'&&method==='POST')return json(await shopPost(getStoreFn,{username:ctx.account.username,body:await body(8000),now}),201);
   return json({error:'Thao tác không hỗ trợ.',errorEn:'Unsupported operation.'},404);
  }catch(e:any){if(!e?.status)console.error('Community prices failed',e?.name);return json({error:e?.status?e.message:'Chưa xử lý được. Thử lại sau.',errorEn:e?.status?e.en||e.message:'Could not complete the request. Try again later.',...(e?.code?{code:e.code}:{}),...(e?.reasons?{reasons:e.reasons}:{})},e?.status||503)}
 };
}
export default createCommunityHandler();

