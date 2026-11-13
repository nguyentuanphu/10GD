// Price Scout API. Same account/household gate as family.mts: a live account
// session and a selected household are required; viewers are read-only; all
// mutations require a same-origin request. Observations never leave the household.
import {getStore} from '@netlify/blobs';
import {resolveAccount,scopedStore} from '../lib/accounts.mjs';
import {postcodeToState,supportedState} from '../lib/geo-resolver.mjs';
import {ONLINE_PHOTOS_KEY,cleanPhoto,stillMatches} from '../lib/online-prices.mjs';
import {addWanted} from '../lib/online-wanted.mjs';
import {cleanObservation,readObservations,mutateObservations,rateLimit,officialPrices,cycleId,sydneyDate,CACHE_STORE} from '../lib/grocery-pricing.mjs';
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export function createGroceryHandler({getStoreFn=getStore,now=()=>new Date()}={}){
 const familyStore=()=>getStoreFn({name:'bep-family-data',consistency:'strong',region:'ap-southeast-2'});
 const cacheStore=()=>{try{return getStoreFn({name:CACHE_STORE,consistency:'strong',region:'ap-southeast-2'})}catch{return null}};
 return async request=>{
  const url=new URL(request.url),op=url.searchParams.get('op'),method=request.method;
  if(op==='region'&&method==='GET')return json(postcodeToState(url.searchParams.get('postcode')));
  // v1.7.5: product photos of owner-confirmed products (public catalogue pictures, no family data; device-only too)
  if(op==='photos'&&method==='GET'){let ph:any=null;try{ph=await cacheStore()?.get(ONLINE_PHOTOS_KEY,{type:'json'})}catch{}const items:any={};for(const[k,v]of Object.entries(ph?.items||{}) as any){const photo=cleanPhoto(v?.photo);if(/^[a-z0-9-]{1,60}$/.test(k)&&photo&&stillMatches({itemId:k,label:v?.label}))items[k]={photo,retailer:String(v.retailer||'').slice(0,20),label:String(v.label||'').slice(0,160)}}return Response.json({updatedAt:ph?.updatedAt||null,items},{headers:{'Cache-Control':'public, max-age=3600'}})}
  if(!['GET','HEAD'].includes(method)&&request.headers.get('origin')!==url.origin)return json({error:'Same-origin request required.'},403);
  const context=await resolveAccount(request,getStoreFn);
  // v1.7.11 (owner, 7 Nov 2026: “So giá bây giờ chỉ nên có tài khoản đi cho chắc”): So Giá — online prices included — needs an
  // account; there are no guest tries.
  if(!context)return json({error:'Sign in to family storage.'},401);
  if(!context.household)return json({error:'Chọn hoặc tạo gia đình trước.'},409);
  if(context.member?.role==='viewer'&&!['GET','HEAD'].includes(method))return json({error:'Tài khoản chỉ xem không được sửa dữ liệu.'},403);
  try{
   const store=scopedStore(familyStore(),context.household.id,context.household.members),today=sydneyDate(now());
   if(op==='prices'&&method==='GET'){
    const state=url.searchParams.get('state');if(state&&!supportedState(state))return json({error:'Unsupported state.',supported:['NSW','QLD']},400);
    const cycle=cycleId(today),{rows}=await readObservations(store);
    const observations=state?rows.filter(o=>!o.state||o.state===state):rows;
    const official=await officialPrices(cacheStore(),state||null,cycle);
    return json({householdId:context.household.id,state:state||null,cycleId:cycle,today,observations,official,fetchedAt:now().toISOString()});
   }
   // v1.7.8 owner decision: "Tìm giá online" — only the supermarket search word is kept (no family, account or item name)
   if(op==='online-want'&&method==='POST'){let body:any;try{body=JSON.parse((await request.text()).slice(0,2000))}catch{return json({error:'Invalid JSON.'},400)}
    if(!await rateLimit(store,context.account.username,now().getTime(),1))return json({error:'Quá nhiều lần lưu, thử lại sau ít phút. / Too many saves, try again shortly.'},429);
    const cache=cacheStore();if(!cache)return json({error:'Unavailable.'},503);const r:any=await addWanted(cache,body?.query,now());
    if(r.error==='invalid')return json({error:'Hãy gõ tên tiếng Anh như trên web siêu thị (3–50 chữ cái, vd “gravy beef”). / Type the English supermarket name (3–50 letters, e.g. “gravy beef”).'},400);
    if(r.error==='full')return json({error:'Danh sách tìm giá đang đầy, hãy báo cho chủ app. / The search list is full; tell the app owner.'},409);
    return json({itemId:r.itemId,query:r.query})}
   if(op==='observe'&&method==='POST'){
    const raw=await request.text();if(raw.length>40000)return json({error:'Too large.'},413);
    let body;try{body=JSON.parse(raw)}catch{return json({error:'Invalid JSON.'},400)}
    const list=Array.isArray(body?.observations)?body.observations:body?.observation?[body.observation]:[];
    if(!list.length||list.length>25)return json({error:'Send 1–25 observations.'},400);
    const who=context.account.name||context.account.username;
    const clean=list.map(o=>cleanObservation({...o,observedBy:who},{today}));
    if(clean.some(o=>!o))return json({error:'Kiểm tra dữ liệu giá / Check the price details.'},400);
    if(!await rateLimit(store,context.account.username,now().getTime(),clean.length))return json({error:'Quá nhiều lần lưu, thử lại sau ít phút. / Too many saves, try again shortly.'},429);
    const stamped=clean.map(o=>({...o,createdBy:context.account.username,createdAt:now().toISOString()}));
    const result=await mutateObservations(store,rows=>{const ids=new Set(stamped.map(o=>o.id));return[...rows.filter(r=>!ids.has(r.id)),...stamped]});
    return json({saved:stamped.map(o=>o.id),count:result.rows.length},201);
   }
   if(op==='observe'&&method==='DELETE'){
    const id=url.searchParams.get('id')||'';if(!/^[\w:.-]{6,120}$/.test(id))return json({error:'Invalid id.'},400);
    let found=false;await mutateObservations(store,rows=>{const next=rows.filter(r=>r.id!==id);found=next.length!==rows.length;return found?next:null});
    return found?json({deleted:id}):json({error:'Not found.'},404);
   }
   return json({error:'Unknown operation.'},404);
  }catch(error){return json({error:error?.status?error.message:'Price data is temporarily unavailable.'},error?.status||503)}
 };
}
export default createGroceryHandler();
