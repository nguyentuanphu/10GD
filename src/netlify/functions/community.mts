// Community Price Pilot API. The Studio flag `communityPrices` is ON by default; when the
// owner turns it off every operation except `status` answers 404 {disabled:true}.
//
// Public reads (no account needed, device-only users included): `prices` and `leaderboard`.
// They return no personal data, are rate-limited per salted IP hash and are cacheable for
// about a minute. Everything else uses the same account/household gate as grocery.mts and
// family.mts: a live session, same-origin for mutations, viewers read-only, disabled
// accounts refused.
import {getStore} from '@netlify/blobs';
import {resolveAccount,editRecord} from '../lib/accounts.mjs';
import {platformSettings} from '../lib/studio.mjs';
import {pilotConfig,eligibility,contributor,communityStore,communityPrices,contribute,report,acceptTerms,setShareDefault,shopApply,shopStatus,shopPost,storeHeldPhoto,ipHashOf,RULES,TERMS_VERSION,rewardsFor,setRewardsProfile,leaderboard,recordWanted,wantedFor,rewardConfig,saveProduct,productLinks,reportProduct} from '../lib/community-prices.mjs';
const json=(data:any,status=200,cache='no-store')=>Response.json(data,{status,headers:{'Cache-Control':cache,'X-Content-Type-Options':'nosniff'}});
const PUBLIC_CACHE='public, max-age=60, stale-while-revalidate=60';
/** Public reads allowed per IP hash per hour. */
export const PUBLIC_READS_PER_HOUR=240;

export function createCommunityHandler({getStoreFn=getStore,env=process.env,nowFn=()=>Date.now()}:any={}){
 return async(request:Request)=>{
  const url=new URL(request.url),op=url.searchParams.get('op')||'',method=request.method,isRead=['GET','HEAD'].includes(method),now=nowFn();
  try{
   if(!isRead&&request.headers.get('origin')!==url.origin)return json({error:'Yêu cầu phải từ cùng trang.',errorEn:'Same-origin request required.'},403);
   const settings=await platformSettings(getStoreFn,{env,now}),pilot=pilotConfig(settings.values),rewards=rewardConfig(settings.values.rewards);
   const ctx=await resolveAccount(request,getStoreFn,now);
   if(op==='status'&&isRead){
    if(!pilot.enabled)return json({enabled:false});
    if(!ctx)return json({enabled:true,signedIn:false,publicRead:true,states:pilot.states,rewards:{confirmed:rewards.confirmed,corroborate:rewards.corroborate}});
    const c=await contributor(communityStore(getStoreFn),ctx.account.username);
    return json({enabled:true,signedIn:true,publicRead:true,states:pilot.states,eligibility:eligibility(ctx.account,ctx.household,now),viewer:ctx.member?.role==='viewer',termsAcceptedAt:c?.termsAcceptedAt||null,termsVersion:TERMS_VERSION,shareDefault:c?.termsAcceptedAt?c.shareDefault!==false:false,shop:await shopStatus(getStoreFn,ctx.account.username),limits:{perDay:RULES.accountDaily,captureMaxDays:RULES.captureMaxDays},rewards:{confirmed:rewards.confirmed,corroborate:rewards.corroborate}});
   }
   if(!pilot.enabled)return json({error:'Tính năng chưa bật.',errorEn:'Not enabled.',disabled:true},404);
   // ---- public reads: no personal data, per-IP rate limit, short shared cache
   if(isRead&&(op==='prices'||op==='leaderboard'||op==='products')){
    const state=url.searchParams.get('state')||'';if(op!=='products'&&!pilot.states.includes(state))return json({error:'Bang chưa hỗ trợ.',errorEn:'State not in the pilot.',states:pilot.states},400);
    const store=communityStore(getStoreFn),hour=new Date(now).toISOString().slice(0,13),ip=ipHashOf(request,env);
    let ok=true;try{await editRecord(store,`rate/${hour}/read-${ip}`,(r:any)=>{const n=(r?.count||0)+1;if(n>PUBLIC_READS_PER_HOUR){ok=false;return undefined}return{count:n}})}catch{}
    if(!ok)return json({error:'Quá nhiều lượt xem từ mạng này. Thử lại sau ít phút.',errorEn:'Too many requests from this network. Try again in a few minutes.'},429);
    // Confirmed product-page links (facts only, no prices): for the app and a future browser extension.
    if(op==='products'){const retailer=url.searchParams.get('retailer')||null,itemId=url.searchParams.get('item')||null;if(retailer&&!/^[a-z-]{2,20}$/.test(retailer)||itemId&&!/^[a-z0-9-]{1,60}$/.test(itemId))return json({error:'Không hợp lệ.',errorEn:'Invalid.'},400);return json({products:await productLinks(getStoreFn,{retailer,itemId}),fetchedAt:new Date(now).toISOString()},200,PUBLIC_CACHE)}
    if(op==='leaderboard'){const me=ctx&&ctx.account.disabled!==true?ctx.account.username:null;return json({...await leaderboard(getStoreFn,{state,now,rewards,me}),fetchedAt:new Date(now).toISOString()},200,me?'private, no-store':PUBLIC_CACHE)}
    const branches=(url.searchParams.get('branch')||'').split(',').map(x=>x.trim()).filter(Boolean).slice(0,20);
    return json({...await communityPrices(getStoreFn,{state,branches,now,cache:true}),wanted:{counts:await wantedFor(store,state,now)},fetchedAt:new Date(now).toISOString(),notice:{vi:'Giá cộng đồng do các gia đình khác báo lại, không phải giá niêm yết đảm bảo.',en:'Community prices are reported by other families and are not guaranteed shelf prices.'}},200,PUBLIC_CACHE);
   }
   if(!ctx)return json({error:'Cần đăng nhập tài khoản.',errorEn:'Sign in first.'},401);
   if(ctx.account.disabled===true)return json({error:'Tài khoản đang tạm khóa.',errorEn:'Account disabled.'},403);
   if(!isRead&&ctx.member?.role==='viewer')return json({error:'Tài khoản chỉ xem không được gửi giá.',errorEn:'View-only accounts cannot send prices.'},403);
   const body=async(max=20000)=>{const raw=await request.text();if(raw.length>max)throw Object.assign(Error('Quá lớn.'),{status:413,en:'Too large.'});try{return raw?JSON.parse(raw):{}}catch{throw Object.assign(Error('Dữ liệu không hợp lệ.'),{status:400,en:'Invalid JSON.'})}};
   const username=ctx.account.username;
   if(op==='rewards'&&isRead)return json(await rewardsFor(getStoreFn,{username,now,rewards}));
   if(op==='rewards-profile'&&method==='POST')return json(await setRewardsProfile(getStoreFn,{username,familyName:ctx.household?.name||'',body:await body(2000)}));
   if(op==='share-default'&&method==='POST'){const b=await body(500);if(typeof b.shareDefault!=='boolean')return json({error:'Thiếu lựa chọn.',errorEn:'Missing choice.'},400);return json(await setShareDefault(getStoreFn,username,b.shareDefault,now))}
   if(op==='wanted'&&method==='POST'){const b=await body(8000);if(!pilot.states.includes(b.state))return json({error:'Bang chưa hỗ trợ.',errorEn:'State not in the pilot.'},400);if(!ctx.household)return json({error:'Chọn hoặc tạo gia đình trước.',errorEn:'Choose or create a family first.'},409);return json(await recordWanted(getStoreFn,{state:b.state,itemIds:b.itemIds,familyId:ctx.household.id,username,now}),201)}
   if(op==='product'&&method==='POST'){const gate=eligibility(ctx.account,ctx.household,now);if(!gate.ok)return json({error:'Tài khoản chưa đủ điều kiện chia sẻ.',errorEn:'This account is not yet eligible to share.',code:'not-eligible',reasons:gate.reasons},403);return json(await saveProduct(getStoreFn,{context:ctx,body:await body(4000),now}),201)}
   if(op==='product-report'&&method==='POST')return json(await reportProduct(getStoreFn,{context:ctx,body:await body(2000),now}),201);
   if(op==='accept-terms'&&method==='POST'){const b=await body();if(b.accept!==true||b.version!==TERMS_VERSION)return json({error:'Cần đồng ý điều khoản.',errorEn:'Terms must be accepted.'},400);return json(await acceptTerms(getStoreFn,username,now))}
   if(op==='contribute'&&method==='POST'){
    const b=await body();if(b.consent!==true)return json({error:'Cần chọn chia sẻ.',errorEn:'Sharing was not opted in.'},400);
    if(!ctx.household)return json({error:'Chọn hoặc tạo gia đình trước.',errorEn:'Choose or create a family first.'},409);
    return json(await contribute(getStoreFn,{context:ctx,observation:b.observation,branch:b.branch,ipHash:ipHashOf(request,env),now,states:pilot.states,rewards}),201);
   }
   if(op==='photo'&&method==='POST'){
    const id=url.searchParams.get('id')||'',state=url.searchParams.get('state')||'',itemId=url.searchParams.get('item')||'';
    if(!/^cp-[a-z0-9]+-[a-f0-9]{10}$/.test(id)||!pilot.states.includes(state)||!/^[a-z0-9-]{1,60}$/.test(itemId))return json({error:'Không hợp lệ.',errorEn:'Invalid.'},400);
    const bytes=await request.arrayBuffer();
    return json(await storeHeldPhoto(getStoreFn,{username,state,itemId,id,bytes,now}),201);
   }
   if(op==='report'&&method==='POST')return json(await report(getStoreFn,{context:ctx,body:await body(4000),now}),201);
   if(op==='shop-apply'&&method==='POST')return json(await shopApply(getStoreFn,{username,body:await body(4000),now}),201);
   if(op==='shop-price'&&method==='POST')return json(await shopPost(getStoreFn,{username,body:await body(8000),now}),201);
   return json({error:'Thao tác không hỗ trợ.',errorEn:'Unsupported operation.'},404);
  }catch(e:any){if(!e?.status)console.error('Community prices failed',e?.name);return json({error:e?.status?e.message:'Chưa xử lý được. Thử lại sau.',errorEn:e?.status?e.en||e.message:'Could not complete the request. Try again later.',...(e?.code?{code:e.code}:{}),...(e?.reasons?{reasons:e.reasons}:{})},e?.status||503)}
 };
}
export default createCommunityHandler();
