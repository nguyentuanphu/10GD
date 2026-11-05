// Community recipes API (v1.7.1). Studio flag `communityRecipes` (ON by default); when it is off
// every operation except `status` answers 404 {disabled:true}.
//
//  - Public reads (no account, device-only users included): `list`, `photo` — approved items only,
//    no personal data beyond the display name a family chose, per-IP-hash rate limit, ~1 min cache.
//  - Signed-in family members (same-origin for mutations, viewers read-only, disabled refused):
//    `status`, `mine`, `share`, `share-photo`, `unshare`, `report`.
//  - Studio (cookie + Studio role; POST needs same-origin + x-studio-csrf + owner, like
//    Community prices): `studio-list`, `studio-photo`, `studio-action`. Every Studio view of the
//    queue and every action is written to the Studio audit log.
import {getStore} from '@netlify/blobs';
import {timingSafeEqual} from 'node:crypto';
import {resolveAccount,editRecord} from '../lib/accounts.mjs';
import {platformSettings,roleFor,csrfFor,writeAudit} from '../lib/studio.mjs';
import {communityStore,ipHashOf} from '../lib/community-prices.mjs';
import {recipeFlagOn,shareRecipe,storeRecipePhoto,unshareRecipe,myShares,reportRecipe,approvedRecipes,recipePhoto,recipeModerationData,moderateRecipe,RECIPE_RULES,RECIPE_REPORT_REASONS} from '../lib/community-recipes.mjs';

const json=(data:any,status=200,cache='no-store')=>Response.json(data,{status,headers:{'Cache-Control':cache,'X-Content-Type-Options':'nosniff'}});
const PUBLIC_CACHE='public, max-age=60, stale-while-revalidate=60';
export const RECIPE_PUBLIC_READS_PER_HOUR=600;
const image=(bytes:ArrayBuffer,cache:string)=>new Response(bytes,{headers:{'Content-Type':'image/jpeg','Cache-Control':cache,'X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'"}});

export function createCommunityRecipesHandler({getStoreFn=getStore,env=process.env,nowFn=()=>Date.now()}:any={}){
 return async(request:Request)=>{
  const url=new URL(request.url),op=url.searchParams.get('op')||'',method=request.method,isRead=['GET','HEAD'].includes(method),now=nowFn();
  try{
   if(!isRead&&request.headers.get('origin')!==url.origin)return json({error:'Yêu cầu phải từ cùng trang.',errorEn:'Same-origin request required.'},403);
   const settings=await platformSettings(getStoreFn,{env,now}),enabled=recipeFlagOn(settings.values);
   const ctx=await resolveAccount(request,getStoreFn,now);
   if(op==='status'&&isRead){if(!enabled)return json({enabled:false});return json({enabled:true,signedIn:!!ctx,viewer:ctx?.member?.role==='viewer',familyName:ctx?.household?.name||null,hasFamily:!!ctx?.household,limits:{sharesPerDay:RECIPE_RULES.sharesPerDay},reasons:RECIPE_REPORT_REASONS})}
   // Studio moderation works even while the flag is off (to clean up).
   if(op.startsWith('studio-')){
    if(!ctx)return json({error:'Cần đăng nhập tài khoản.',errorEn:'Sign in first.'},401);
    const actor=ctx.account.username,role=roleFor(actor,env,settings.values);
    if(!(role==='owner'||role==='admin'||role==='moderator')||ctx.account.disabled===true){await writeAudit(getStoreFn,{actor,role:role||'none',action:'access_denied',target:{type:'community-recipes',id:op},result:'denied'},now);return json({error:'Chỉ chủ Studio được xem mục này.',errorEn:'Owner only.'},403)}
    const audit=(action:string,target:any=null,extra:any={})=>writeAudit(getStoreFn,{actor,role,action,target,...extra},now);
    if(op==='studio-list'&&isRead){const d=await recipeModerationData(getStoreFn);await audit('view_community_recipes',null,{details:{items:d.items.length}});return json({...d,enabled,flagSource:settings.sources['flags.communityRecipes']||'default'})}
    if(op==='studio-photo'&&isRead){const id=url.searchParams.get('id')||'';const bytes=await recipePhoto(getStoreFn,id,{admin:true});await audit('view_community_recipe_photo',{type:'community-recipe',id},{result:bytes?'ok':'missing'});return bytes?image(bytes,'no-store'):json({error:'Không có ảnh.',errorEn:'No photo.'},404)}
    if(op==='studio-action'&&method==='POST'){
     const token=request.headers.get('x-studio-csrf')||'',want=csrfFor(ctx.sessionKey);if(token.length!==want.length||!timingSafeEqual(Buffer.from(token),Buffer.from(want)))return json({error:'Phiên Studio đã hết hạn. Tải lại trang.',errorEn:'Studio session token mismatch. Reload the page.'},403);
     const raw=await request.text();if(raw.length>4000)return json({error:'Quá lớn.',errorEn:'Too large.'},413);let b:any={};try{b=raw?JSON.parse(raw):{}}catch{return json({error:'Dữ liệu không hợp lệ.',errorEn:'Invalid JSON.'},400)}
     const action=String(b.action||''),reason=typeof b.reason==='string'?b.reason.trim().slice(0,300):'';
     if(['reject','remove'].includes(action)&&reason.length<3)return json({error:'Nhập lý do (bắt buộc cho thao tác này).',errorEn:'Enter a reason (required for this action).'},400);
     const r=await moderateRecipe(getStoreFn,{action,body:{...b,reason},now,actor,rewards:settings.values.rewards});
     await audit('community_recipe_'+action.replace(/-/g,'_'),{type:'community-recipe',id:r.target},{reason,details:{account:r.account||null,status:r.status,...(r.points!=null?{points:r.points}:{})}});
     return json({done:true,...r});
    }
    return json({error:'Thao tác không hỗ trợ.',errorEn:'Unsupported operation.'},404);
   }
   if(!enabled)return json({error:'Tính năng chưa bật.',errorEn:'Not enabled.',disabled:true},404);
   if(isRead&&(op==='list'||op==='photo')){
    const store=communityStore(getStoreFn),hour=new Date(now).toISOString().slice(0,13),ip=ipHashOf(request,env);let ok=true;
    try{await editRecord(store,`recipes/rate/${hour}/read-${ip}`,(r:any)=>{const n=(r?.count||0)+1;if(n>RECIPE_PUBLIC_READS_PER_HOUR){ok=false;return undefined}return{count:n}})}catch{}
    if(!ok)return json({error:'Quá nhiều lượt xem từ mạng này. Thử lại sau ít phút.',errorEn:'Too many requests from this network. Try again in a few minutes.'},429);
    if(op==='list')return json({recipes:await approvedRecipes(getStoreFn),fetchedAt:new Date(now).toISOString()},200,PUBLIC_CACHE);
    const bytes=await recipePhoto(getStoreFn,url.searchParams.get('id')||'');return bytes?image(bytes,'public, max-age=3600'):json({error:'Không có ảnh.',errorEn:'No photo.'},404);
   }
   if(!ctx)return json({error:'Cần đăng nhập tài khoản gia đình.',errorEn:'Sign in to your family account first.',code:'sign-in'},401);
   if(ctx.account.disabled===true)return json({error:'Tài khoản đang tạm khóa.',errorEn:'Account disabled.'},403);
   if(op==='mine'&&isRead)return json(await myShares(getStoreFn,{context:ctx}));
   if(!isRead&&ctx.member?.role==='viewer')return json({error:'Tài khoản chỉ xem không chia sẻ được.',errorEn:'View-only accounts cannot share.'},403);
   const body=async(max:number)=>{const raw=await request.text();if(raw.length>max)throw Object.assign(Error('Quá lớn.'),{status:413,en:'Too large.'});try{return raw?JSON.parse(raw):{}}catch{throw Object.assign(Error('Dữ liệu không hợp lệ.'),{status:400,en:'Invalid JSON.'})}};
   if(op==='share'&&method==='POST')return json(await shareRecipe(getStoreFn,{context:ctx,body:await body(60000),now}),201);
   if(op==='share-photo'&&method==='POST'){if(!String(request.headers.get('content-type')||'').startsWith('image/jpeg'))return json({error:'Ảnh phải là JPEG.',errorEn:'JPEG required.'},415);const len=+(request.headers.get('content-length')||0);if(len>RECIPE_RULES.maxUploadBytes)return json({error:'Ảnh quá lớn.',errorEn:'Photo too large.'},413);return json(await storeRecipePhoto(getStoreFn,{context:ctx,id:url.searchParams.get('id')||'',bytes:await request.arrayBuffer(),now}),201)}
   if(op==='unshare'&&method==='POST'){const b=await body(2000);return json(await unshareRecipe(getStoreFn,{context:ctx,id:String(b.id||'')}))}
   if(op==='report'&&method==='POST')return json(await reportRecipe(getStoreFn,{context:ctx,body:await body(4000),now}),201);
   return json({error:'Thao tác không hỗ trợ.',errorEn:'Unsupported operation.'},404);
  }catch(e:any){if(!e?.status)console.error('Community recipes failed',e?.name);return json({error:e?.status?e.message:'Chưa xử lý được. Thử lại sau.',errorEn:e?.status?e.en||e.message:'Could not complete the request. Try again later.'},e?.status||503)}
 };
}
export default createCommunityRecipesHandler();
