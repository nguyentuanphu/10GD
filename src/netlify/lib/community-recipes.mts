// Community recipes ("Món cộng đồng") — v1.7.1, Studio flag `communityRecipes` (ON by default;
// Studio or STUDIO_FLAG_COMMUNITY_RECIPES can turn it off, which hides every community-recipe
// surface and makes the API answer 404 {disabled:true}).
//
// A signed-in family member (not a viewer) can share ONE of the family's own recipes, either the
// whole recipe (name, ingredients with the family's own quantities, method, photo) or only the
// photo + dish name. The family chooses to show the family's display name or "Ẩn danh / Anonymous".
// Shared items are PENDING until a Studio owner approves them; only approved items are public.
// Unsharing deletes the shared copy and its photo; the family's own recipe is never touched.
//
// Stored (store `bep-community`, namespace `recipes/`):
//   recipes/items/<id>        the shared copy + moderation state + reports. The account and a
//                             hashed family reference are kept for moderation/unshare only and are
//                             never returned by public reads.
//   recipes/photos/<id>       JPEG, metadata (EXIF/XMP/ICC/comments) stripped, ≤ 1.2 MB, ≤ 2400 px.
//   recipes/rate/<day>/<kind>-<account>   daily counters (share, report).
import {randomBytes} from 'node:crypto';
import {editRecord} from './accounts.mjs';
import {communityStore,familyRefOf,awardRecipePoints} from './community-prices.mjs';

const DAY=86400000;
export const RECIPE_RULES={sharesPerDay:10,reportsPerDay:20,maxPhotoBytes:1_200_000,maxUploadBytes:6_000_000,maxDim:2400,minDim:64,maxIngredients:60,maxSteps:40,maxPool:500,maxReports:50};
export const RECIPE_KINDS=['full','photo'];
export const RECIPE_REPORT_REASONS=['wrong','offensive','copyright','spam','other'];
const CATEGORIES=['main','soup','veg','noodle'];
const fail=(vi:string,en:string,status=400,extra:any={}):never=>{throw Object.assign(Error(vi),{status,en,...extra})};
const text=(v:any,max:number)=>typeof v==='string'?v.replace(/[\u0000-\u001f<>]/g,' ').replace(/\s+/g,' ').trim().slice(0,max):'';
const multiline=(v:any,max:number)=>typeof v==='string'?v.replace(/[\u0000-\u0009\u000b-\u001f<>]/g,' ').trim().slice(0,max):'';
const dayKey=(now:number)=>new Date(now).toISOString().slice(0,10);
const iso=(now:number)=>new Date(now).toISOString();
export const recipeFlagOn=(values:any)=>values?.flags?.communityRecipes!==false;
export const validRecipeId=(id:any)=>typeof id==='string'&&/^cr-[a-z0-9]{6,12}-[a-f0-9]{10}$/.test(id);
const itemKey=(id:string)=>'recipes/items/'+id,photoKey=(id:string)=>'recipes/photos/'+id;
async function readJSON(store:any,key:string){try{return await store.get(key,{type:'json'})}catch{return null}}
async function* listKeys(store:any,prefix:string){for await(const page of store.list({prefix,paginate:true}))for(const b of page.blobs)yield b.key as string}
async function bump(store:any,key:string,max:number,now:number){let ok=true;await editRecord(store,key,(r:any)=>{const n=(r?.count||0)+1;if(n>max){ok=false;return undefined}return{count:n,expires:iso(now+2*DAY)}});return ok}

// ---------- images ----------
/** Validates a baseline/progressive JPEG and rebuilds it without APP1–APP15 (EXIF, XMP, ICC,
 *  maker notes, GPS) and COM segments. Returns {bytes,width,height}. Throws on anything else. */
export function stripJpeg(input:ArrayBuffer|Uint8Array){
 const b=input instanceof Uint8Array?input:new Uint8Array(input);
 if(b.length<4||b[0]!==0xff||b[1]!==0xd8)fail('Ảnh phải là JPEG.','The photo must be a JPEG.',415);
 const out:number[][]=[[0xff,0xd8]];let i=2,width=0,height=0,sos=false;
 while(i<b.length){
  if(b[i]!==0xff)fail('Ảnh JPEG bị hỏng.','The JPEG is damaged.',422);
  let m=b[i+1];while(m===0xff){i++;m=b[i+1]}
  if(m===0xd9){out.push([0xff,0xd9]);i+=2;break}
  if(m>=0xd0&&m<=0xd7||m===0x01){out.push([0xff,m]);i+=2;continue}
  if(i+4>b.length)fail('Ảnh JPEG bị hỏng.','The JPEG is damaged.',422);
  const len=(b[i+2]<<8)|b[i+3];if(len<2||i+2+len>b.length)fail('Ảnh JPEG bị hỏng.','The JPEG is damaged.',422);
  const seg=b.subarray(i,i+2+len);
  if(m>=0xc0&&m<=0xcf&&m!==0xc4&&m!==0xc8&&m!==0xcc){height=(b[i+5]<<8)|b[i+6];width=(b[i+7]<<8)|b[i+8]}
  const drop=m>=0xe1&&m<=0xef||m===0xfe;
  if(!drop)out.push(Array.from(seg));
  i+=2+len;
  if(m===0xda){// entropy-coded data runs until the next non-RST marker
   let j=i;while(j<b.length-1&&!(b[j]===0xff&&b[j+1]!==0&&!(b[j+1]>=0xd0&&b[j+1]<=0xd7)))j++;
   out.push(Array.from(b.subarray(i,j)));i=j;sos=true}
 }
 if(!sos||!width||!height)fail('Ảnh JPEG không hợp lệ.','Invalid JPEG.',422);
 const total=out.reduce((n,x)=>n+x.length,0),bytes=new Uint8Array(total);let o=0;for(const x of out){bytes.set(x,o);o+=x.length}
 return{bytes,width,height};
}
/** Has an EXIF/XMP/comment segment (used by tests and as a final assertion). */
export function jpegHasMetadata(input:Uint8Array){let i=2;while(i+4<=input.length&&input[i]===0xff){const m=input[i+1];if(m===0xda||m===0xd9)return false;if(m>=0xe1&&m<=0xef||m===0xfe)return true;i+=2+((input[i+2]<<8)|input[i+3])}return false}

// ---------- validation ----------
/** Cleans the shared copy. Quantities are copied exactly as the family wrote them (or left empty);
 *  nothing is guessed or filled in. */
export function cleanSharedRecipe(body:any){
 const kind=RECIPE_KINDS.includes(body?.kind)?body.kind:fail('Chọn chia sẻ cả món hoặc chỉ ảnh.','Choose whole recipe or photo only.');
 const r=body?.recipe||{},name=text(r.name,150);if(name.length<2)fail('Thiếu tên món.','Missing dish name.');
 const category=CATEGORIES.includes(r.category)?r.category:'main';
 const out:any={kind,name,category};
 if(kind==='full'){
  const ings=Array.isArray(r.ingredients)?r.ingredients:[];if(ings.length>RECIPE_RULES.maxIngredients)fail('Quá nhiều nguyên liệu.','Too many ingredients.');
  out.ingredients=ings.map((i:any)=>{const n=text(i?.name,100);if(!n)return null;const q=typeof i?.qty==='number'&&Number.isFinite(i.qty)&&i.qty>0&&i.qty<1e6?Math.round(i.qty*1000)/1000:null;return{name:n,qty:q,unit:q==null?'':text(i?.unit,30)}}).filter(Boolean);
  out.missing=(Array.isArray(r.missing)?r.missing:[]).map((x:any)=>text(x,290)).filter(Boolean).slice(0,RECIPE_RULES.maxIngredients);
  out.steps=(Array.isArray(r.steps)?r.steps:[]).map((x:any)=>multiline(x,1000)).filter(Boolean).slice(0,RECIPE_RULES.maxSteps);
  out.prep=multiline(r.prep,1000);
  out.time=Number.isFinite(r.time)&&r.time>=0&&r.time<=600?Math.round(r.time):null;
  out.yield=Number.isFinite(r.yield)&&r.yield>0&&r.yield<=1000?r.yield:null;
  if(!out.ingredients.length&&!out.missing.length&&!out.steps.length)fail('Món chưa có nguyên liệu hay cách nấu để chia sẻ. Chọn “Chỉ ảnh + tên món”.','This recipe has no ingredients or method to share. Choose “Photo + name only”.');
 }
 return out;
}
/** Public shape: never the account, family id/ref, source recipe id or reports. */
export function publicRecipe(x:any){return{id:x.id,kind:x.kind,name:x.name,category:x.category,...(x.kind==='full'?{ingredients:x.ingredients||[],missing:x.missing||[],steps:x.steps||[],prep:x.prep||'',time:x.time??null,yield:x.yield??null}:{}),by:x.anonymous?null:x.displayName||null,anonymous:!!x.anonymous,hasPhoto:!!x.hasPhoto,photoVersion:x.photoVersion||0,approvedAt:x.decidedAt||null}}
const ownView=(x:any)=>({id:x.id,sourceId:x.sourceId,kind:x.kind,name:x.name,status:x.status,reason:x.status==='rejected'?x.reason||null:null,anonymous:!!x.anonymous,by:x.anonymous?null:x.displayName||null,hasPhoto:!!x.hasPhoto,submittedAt:x.submittedAt,decidedAt:x.decidedAt||null,points:x.awarded?x.awardPoints||null:null});

// ---------- family operations ----------
export async function shareRecipe(getStoreFn:any,{context,body,now}:any){
 if(body?.consent!==true)fail('Cần đồng ý điều khoản chia sẻ.','Sharing consent is required.');
 if(!context.household)fail('Chọn hoặc tạo gia đình trước.','Choose or create a family first.',409);
 const sourceId=text(body?.sourceId,120);if(!sourceId)fail('Thiếu món nguồn.','Missing source recipe.');
 const clean=cleanSharedRecipe(body),anonymous=body?.display==='anonymous',store=communityStore(getStoreFn),account=context.account.username,familyRef=familyRefOf(context.household.id);
 if(!await bump(store,`recipes/rate/${dayKey(now)}/share-${account}`,RECIPE_RULES.sharesPerDay,now))fail('Đã chia sẻ đủ số món hôm nay. Thử lại ngày mai.','Daily sharing limit reached. Try again tomorrow.',429);
 // Re-sharing the same family recipe replaces the earlier copy (back to pending) instead of duplicating it.
 let existing:any=null;let pool=0;for await(const k of listKeys(store,'recipes/items/')){pool++;const x=await readJSON(store,k);if(x&&x.familyRef===familyRef&&x.sourceId===sourceId){existing=x;break}}
 if(!existing&&pool>=RECIPE_RULES.maxPool*4)fail('Kho món cộng đồng đang đầy. Thử lại sau.','The community pool is full. Try again later.',503);
 const id=existing?.id||'cr-'+now.toString(36)+'-'+randomBytes(5).toString('hex');
 const displayName=anonymous?null:text(context.household.name,60)||null;
 const keepPhoto=!!existing?.hasPhoto&&body?.keepPhoto===true;
 if(existing&&!keepPhoto)try{await store.delete(photoKey(id))}catch{}
 const item={...clean,id,status:'pending',anonymous,displayName,account,familyRef,sourceId,hasPhoto:keepPhoto,photoVersion:keepPhoto?existing.photoVersion||1:0,submittedAt:iso(now),decidedAt:null,decidedBy:null,reason:null,reports:[],awarded:!!existing?.awarded,awardPoints:existing?.awardPoints||null,history:[...(existing?.history||[]).slice(-9),{at:iso(now),event:existing?'reshared':'shared'}]};
 await store.setJSON(itemKey(id),item);
 return{id,status:'pending',needsPhoto:clean.kind==='photo'};
}
export async function storeRecipePhoto(getStoreFn:any,{context,id,bytes,now}:any){
 if(!validRecipeId(id))fail('Mã món không hợp lệ.','Invalid id.');
 const store=communityStore(getStoreFn),x=await readJSON(store,itemKey(id));
 if(!x||x.account!==context.account.username&&x.familyRef!==familyRefOf(context.household?.id||''))fail('Không tìm thấy món đã chia sẻ.','Shared recipe not found.',404);
 if(!['pending','approved'].includes(x.status))fail('Món này không còn trong hàng chờ.','This recipe is no longer in the queue.',409);
 if(bytes.byteLength>RECIPE_RULES.maxUploadBytes)fail('Ảnh quá lớn.','Photo too large.',413);
 const {bytes:clean,width,height}=stripJpeg(new Uint8Array(bytes));
 if(clean.byteLength>RECIPE_RULES.maxPhotoBytes)fail('Ảnh tối đa 1,2 MB sau khi nén.','Photo must be under 1.2 MB after compression.',413);
 if(width>RECIPE_RULES.maxDim||height>RECIPE_RULES.maxDim||width<RECIPE_RULES.minDim||height<RECIPE_RULES.minDim)fail('Kích thước ảnh không hợp lệ (64–2400 px).','Photo size must be 64–2400 px.',422);
 await store.set(photoKey(id),clean.buffer.slice(clean.byteOffset,clean.byteOffset+clean.byteLength));
 // A new photo always goes back through moderation.
 await editRecord(store,itemKey(id),(cur:any)=>cur?{...cur,hasPhoto:true,photoVersion:(cur.photoVersion||0)+1,status:'pending',decidedAt:null,decidedBy:null,history:[...(cur.history||[]).slice(-9),{at:iso(now),event:'photo'}]}:undefined);
 return{stored:true,width,height,bytes:clean.byteLength,status:'pending'};
}
export async function unshareRecipe(getStoreFn:any,{context,id}:any){
 if(!validRecipeId(id))fail('Mã món không hợp lệ.','Invalid id.');
 const store=communityStore(getStoreFn),x=await readJSON(store,itemKey(id));
 if(!x||x.familyRef!==familyRefOf(context.household?.id||'')&&x.account!==context.account.username)fail('Không tìm thấy món đã chia sẻ.','Shared recipe not found.',404);
 try{await store.delete(photoKey(id))}catch{}await store.delete(itemKey(id));
 return{removed:true,id};
}
export async function myShares(getStoreFn:any,{context}:any){
 const store=communityStore(getStoreFn),ref=context.household?familyRefOf(context.household.id):null,out:any[]=[];
 for await(const k of listKeys(store,'recipes/items/')){const x=await readJSON(store,k);if(x&&(ref&&x.familyRef===ref||x.account===context.account.username))out.push(ownView(x))}
 return{shares:out};
}
export async function reportRecipe(getStoreFn:any,{context,body,now}:any){
 const id=String(body?.id||'');if(!validRecipeId(id))fail('Mã món không hợp lệ.','Invalid id.');
 const reason=RECIPE_REPORT_REASONS.includes(body?.reason)?body.reason:fail('Chọn lý do báo cáo.','Choose a reason.');
 const store=communityStore(getStoreFn),account=context.account.username;
 if(!await bump(store,`recipes/rate/${dayKey(now)}/report-${account}`,RECIPE_RULES.reportsPerDay,now))fail('Bạn đã báo cáo nhiều lần hôm nay.','Too many reports today.',429);
 let found=false,dup=false;
 await editRecord(store,itemKey(id),(x:any)=>{if(!x||x.status!=='approved')return undefined;found=true;const by=familyRefOf('report:'+account);if((x.reports||[]).some((r:any)=>r.by===by&&r.status==='open')){dup=true;return undefined}return{...x,reports:[...(x.reports||[]).slice(-(RECIPE_RULES.maxReports-1)),{id:'rr-'+randomBytes(4).toString('hex'),reason,note:text(body?.note,300),at:iso(now),by,status:'open'}]}});
 if(!found)fail('Không tìm thấy món.','Recipe not found.',404);
 return{reported:true,duplicate:dup};
}

// ---------- public reads ----------
export async function approvedRecipes(getStoreFn:any){
 const store=communityStore(getStoreFn),out:any[]=[];
 for await(const k of listKeys(store,'recipes/items/')){const x=await readJSON(store,k);if(x?.status==='approved')out.push(publicRecipe(x))}
 out.sort((a,b)=>String(b.approvedAt).localeCompare(String(a.approvedAt)));
 return out.slice(0,RECIPE_RULES.maxPool);
}
export async function recipePhoto(getStoreFn:any,id:string,{admin=false}:any={}){
 if(!validRecipeId(id))return null;const store=communityStore(getStoreFn);
 if(!admin){const x=await readJSON(store,itemKey(id));if(x?.status!=='approved'||!x.hasPhoto)return null}
 try{return await store.get(photoKey(id),{type:'arrayBuffer'})}catch{return null}
}

// ---------- Studio moderation ----------
export async function recipeModerationData(getStoreFn:any){
 const store=communityStore(getStoreFn),items:any[]=[],stats:any={pending:0,approved:0,rejected:0,removed:0,reportsOpen:0};
 for await(const k of listKeys(store,'recipes/items/')){const x=await readJSON(store,k);if(!x)continue;stats[x.status]=(stats[x.status]||0)+1;const open=(x.reports||[]).filter((r:any)=>r.status==='open');stats.reportsOpen+=open.length;
  items.push({...publicRecipe(x),status:x.status,account:x.account,displayName:x.displayName||null,submittedAt:x.submittedAt,decidedAt:x.decidedAt,decidedBy:x.decidedBy||null,reason:x.reason||null,awarded:!!x.awarded,reports:open.map((r:any)=>({id:r.id,reason:r.reason,note:r.note,at:r.at}))})}
 const rank=(x:any)=>x.status==='pending'?0:x.reports.length?1:2;
 items.sort((a,b)=>rank(a)-rank(b)||String(b.submittedAt).localeCompare(String(a.submittedAt)));
 return{stats,items};
}
/** approve | reject | remove | restore | dismiss-reports. Returns a summary for the audit log. */
export async function moderateRecipe(getStoreFn:any,{action,body,now,actor,rewards}:any){
 const id=String(body?.id||'');if(!validRecipeId(id))fail('Mã món không hợp lệ.','Invalid id.');
 const store=communityStore(getStoreFn);let before:any=null;
 const next=await editRecord(store,itemKey(id),(x:any)=>{if(!x)return undefined;before=x;const d={decidedAt:iso(now),decidedBy:actor};
  switch(action){
   case'approve':if(x.kind==='photo'&&!x.hasPhoto)fail('Món “chỉ ảnh” chưa có ảnh.','Photo-only item has no photo yet.',409);return{...x,...d,status:'approved',reason:null};
   case'reject':return{...x,...d,status:'rejected',reason:text(body?.reason,300)};
   case'remove':return{...x,...d,status:'removed',reason:text(body?.reason,300),reports:(x.reports||[]).map((r:any)=>r.status==='open'?{...r,status:'upheld'}:r)};
   case'restore':return{...x,...d,status:'approved'};
   case'dismiss-reports':return{...x,reports:(x.reports||[]).map((r:any)=>r.status==='open'?{...r,status:'dismissed'}:r)};
  }
  return fail('Thao tác không hỗ trợ.','Unsupported action.');
 });
 if(!next)fail('Không tìm thấy món.','Recipe not found.',404);
 if(['reject','remove'].includes(action))try{await store.delete(photoKey(id))}catch{}
 if(['reject','remove'].includes(action))await editRecord(store,itemKey(id),(x:any)=>x?{...x,hasPhoto:false}:undefined);
 let points:number|null=null;
 if(action==='approve'&&!before.awarded&&before.account){try{const r:any=await awardRecipePoints(getStoreFn,{account:before.account,recipeId:id,label:before.name,now,rewards});const e=r?.shard?.entries?.find((x:any)=>x.id==='award:recipe:'+id);points=e?.points??null;await editRecord(store,itemKey(id),(x:any)=>x?{...x,awarded:true,awardPoints:points}:undefined)}catch(e){console.error('Recipe points award failed',(e as any)?.name)}}
 return{target:id,account:before.account,status:next.status,...(points!=null?{points}:{})};
}
