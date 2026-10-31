import {tokenFromRequest,verifySessionToken} from './session.mjs';
import {randomBytes,randomUUID,createHash,scrypt,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
export const ACCOUNT_COOKIE='bep_account_session';
const derive=promisify(scrypt),hash=x=>createHash('sha256').update(x).digest('hex');
export const cookieToken=request=>(request.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(ACCOUNT_COOKIE+'='))?.slice(ACCOUNT_COOKIE.length+1)||'';
export const accountStore=getStore=>getStore({name:'bep-accounts',consistency:'strong',region:'ap-southeast-2'});
export function scopedStore(store,householdId,accountMembers=null){if(!/^[a-f0-9-]{36}$/.test(householdId))throw Error('Invalid household');const prefix='households/'+householdId+'/';return{accountMembers,get:(k,o)=>store.get(prefix+k,o),getWithMetadata:(k,o)=>store.getWithMetadata(prefix+k,o),set:(k,d,o)=>store.set(prefix+k,d,o),setJSON:(k,d,o)=>store.setJSON(prefix+k,d,o),delete:k=>store.delete(prefix+k),async *list(o={}){for await(const page of store.list({...o,prefix:prefix+(o.prefix||''),paginate:true}))yield{...page,blobs:page.blobs.map(b=>({...b,key:b.key.slice(prefix.length)}))}}}}
export async function editRecord(store,key,fn){for(let i=0;i<8;i++){const row=await store.getWithMetadata(key,{type:'json'}),next=await fn(row?.data||null);if(next===undefined)return row?.data;const saved=await store.setJSON(key,next,row?.etag?{onlyIfMatch:row.etag}:{onlyIfNew:true});if(saved.modified)return next}throw Object.assign(Error('Có thay đổi đồng thời. Thử lại.'),{status:409})}
export async function resolveAccount(request,getStore,now=Date.now()){
 const token=cookieToken(request);if(!/^[\w-]{43}$/.test(token))return null;const store=accountStore(getStore),session=await store.get('sessions/'+hash(token),{type:'json'});if(!session||session.expires<=now)return null;const account=await store.get('users/'+session.username,{type:'json'});if(!account||account.epoch!==session.epoch)return null;const household=session.householdId?await store.get('families/'+session.householdId,{type:'json'}):null,member=household?.members?.[account.username];return{store,session,account,household:member?household:null,member,sessionKey:'sessions/'+hash(token)};
}
const publicUser=a=>({username:a.username,name:a.name});
export const publicContext=c=>({connected:!!c,account:c?publicUser(c.account):null,household:c?.household?{id:c.household.id,name:c.household.name,role:c.member.role,memberId:c.member.memberId||null}:null});
async function passwordHash(password,salt=randomBytes(16).toString('hex')){const key=await derive(password,salt,64,{N:131072,r:8,p:1,maxmem:160*1024*1024});return{salt,key:key.toString('hex')}}
async function passwordMatches(password,record){const candidate=await passwordHash(password,record.salt);return timingSafeEqual(Buffer.from(candidate.key,'hex'),Buffer.from(record.key,'hex'))}
const json=(data,status=200,headers={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}});
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status})};
const username=x=>typeof x==='string'&&/^[a-z0-9][a-z0-9_.-]{2,39}$/.test(x)&&!['constructor','prototype','__proto__'].includes(x);
const validPassword=x=>typeof x==='string'&&x.length>=12&&x.length<=128;
async function rate(store,request,op,max,window){const ip=request.headers.get('x-nf-client-connection-ip')||'unknown',key='rate/'+hash(ip+':'+op)+':'+Math.floor(Date.now()/window);await editRecord(store,key,n=>{if((n?.count||0)>=max)fail('Thử quá nhiều lần. Vui lòng chờ rồi thử lại.',429);return{count:(n?.count||0)+1}})}
async function startSession(store,account,trust,householdId=null){const token=randomBytes(32).toString('base64url');await store.setJSON('sessions/'+hash(token),{username:account.username,epoch:account.epoch,householdId,trusted:trust,expires:Date.now()+(trust?30*86400000:8*3600000)});return `${ACCOUNT_COOKIE}=${token}; Path=/; ${trust?'Max-Age=2592000; ':''}HttpOnly; Secure; SameSite=Strict`}
export function createAccountsHandler({getStoreFn,signupFn=()=>process.env.ALLOW_ACCOUNT_SIGNUP!=='false'}={}){return async request=>{
 const url=new URL(request.url),op=url.searchParams.get('op'),store=accountStore(getStoreFn);
 try{
 if(!['GET','HEAD'].includes(request.method)&&request.headers.get('origin')!==url.origin)return json({error:'Same-origin request required.'},403);
 const context=await resolveAccount(request,getStoreFn);
 if(op==='status'&&request.method==='GET')return json({...publicContext(context),signup:signupFn()});
 if(op==='logout'&&request.method==='POST'){if(context)await store.delete(context.sessionKey);return json({connected:false},200,{'Set-Cookie':`${ACCOUNT_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`})}
 let body={};if(request.method==='POST'){const raw=await request.text();if(raw.length>20000)fail('Yêu cầu quá lớn.',413);body=JSON.parse(raw)}
 if(['register','login','recover'].includes(op)&&request.method==='POST'){
 await rate(store,request,op,op==='register'?6:10,op==='register'?86400000:900000);
 const name=String(body.username||'').toLowerCase().trim();if(!username(name)||typeof body.password!=='string'||body.password.length>128)fail('Kiểm tra tên đăng nhập và mật khẩu.');
 let account=await store.get('users/'+name,{type:'json'});
 if(op==='register'){
 if(!signupFn())fail('Đăng ký mới đang tắt.',403);if(!validPassword(body.password)||typeof body.name!=='string'||!body.name.trim()||body.name.length>80)fail('Tên hiển thị và mật khẩu từ 12–128 ký tự là bắt buộc.');
 const recoveryCode=randomBytes(24).toString('base64url');account={username:name,name:body.name.trim(),password:await passwordHash(body.password),recoveryHash:hash(recoveryCode),epoch:randomUUID(),createdAt:new Date().toISOString()};const saved=await store.setJSON('users/'+name,account,{onlyIfNew:true});if(!saved.modified)fail('Tên đăng nhập không khả dụng.',409);return json({account:publicUser(account),recoveryCode},201,{'Set-Cookie':await startSession(store,account,body.trust===true)});
 }
 if(op==='recover'){
 if(!validPassword(body.password)||!account||typeof body.recoveryCode!=='string'||!timingSafeEqual(Buffer.from(hash(body.recoveryCode)),Buffer.from(account.recoveryHash)))fail('Thông tin khôi phục không đúng.',401);
 const nextCode=randomBytes(24).toString('base64url'),newPassword=await passwordHash(body.password);await editRecord(store,'users/'+name,a=>{if(a.epoch!==account.epoch)fail('Mã đã thay đổi. Thử lại.',409);return{...a,password:newPassword,recoveryHash:hash(nextCode),epoch:randomUUID()}});return json({recovered:true,recoveryCode:nextCode});
 }
 // Do comparable password work for unknown users too.
 const record=account?.password||{salt:'00000000000000000000000000000000',key:'0'.repeat(128)};if(!await passwordMatches(body.password,record)||!account)fail('Tên đăng nhập hoặc mật khẩu không đúng.',401);
 return json({account:publicUser(account)},200,{'Set-Cookie':await startSession(store,account,body.trust===true)});
 }
 if(!context)fail('Cần đăng nhập tài khoản.',401);
 const {account}=context;
 if(op==='families'&&request.method==='GET'){const families=[];for await(const page of store.list({prefix:'families/',paginate:true}))for(const row of page.blobs){const f=await store.get(row.key,{type:'json'});if(f?.members?.[account.username])families.push({id:f.id,name:f.name,role:f.members[account.username].role})}return json({families,...publicContext(context)})}
 if(op==='create-family'&&request.method==='POST'){
 if(typeof body.name!=='string'||!body.name.trim()||body.name.length>80)fail('Nhập tên gia đình (tối đa 80 ký tự).');await rate(store,request,'create-family',5,86400000);
 const id=randomUUID(),family={id,name:body.name.trim(),createdAt:new Date().toISOString(),members:{[account.username]:{role:'owner',name:account.name,memberId:null}},invites:{}};await store.setJSON('families/'+id,family,{onlyIfNew:true});await editRecord(store,context.sessionKey,s=>({...s,householdId:id}));return json({household:{id,name:family.name,role:'owner'}},201)
 }
 if(op==='switch-family'&&request.method==='POST'){const f=await store.get('families/'+String(body.id),{type:'json'});if(!f?.members?.[account.username])fail('Không có quyền vào gia đình này.',403);await editRecord(store,context.sessionKey,s=>({...s,householdId:f.id}));return json({switched:true})}
 if(op==='join'&&request.method==='POST'){
 const [id,code]=String(body.code||'').trim().split('.');if(!/^[a-f0-9-]{36}$/.test(id||'')||!/^[\w-]{32}$/.test(code||''))fail('Mã mời không đúng.');await rate(store,request,'join',12,900000);
 await editRecord(store,'families/'+id,f=>{const invite=f?.invites?.[hash(code)];if(!invite||invite.expires<Date.now()||invite.target!==account.username)fail('Mã mời hết hạn hoặc không dành cho tài khoản này.',403);if(!f.members[account.username]&&Object.keys(f.members).length>=20)fail('Gia đình đã đủ 20 tài khoản.');if(!f.members[account.username])f.members[account.username]={role:invite.role,name:account.name,memberId:null};delete f.invites[hash(code)];return f});await editRecord(store,context.sessionKey,s=>({...s,householdId:id}));return json({joined:true})
 }
 const family=context.household;if(!family)fail('Chọn hoặc tạo gia đình trước.',409);
 if(['legacy-preview','legacy-migrate'].includes(op)){
 const password=process.env.FAMILY_PASSWORD||'';if(password.length<5||!await verifySessionToken(tokenFromRequest(request),password))fail('Đăng nhập mật khẩu gia đình cũ trước khi chuyển dữ liệu.',403);
 if(context.member.role!=='owner')fail('Chỉ chủ gia đình chuyển dữ liệu.',403);
 const root=getStoreFn({name:'bep-family-data',consistency:'strong',region:'ap-southeast-2'}),source=await root.getWithMetadata('state',{type:'json'}),target=scopedStore(root,family.id);
 if(op==='legacy-preview'&&request.method==='GET')return json({state:source?.data||null,etag:source?.etag||null});
 if(op==='legacy-migrate'&&request.method==='POST'){
 if(!source?.data||body.etag!==source.etag)fail('Dữ liệu cũ đã đổi. Xem lại bản mới trước khi chuyển.',409);
 if(await target.get('state',{type:'json'}))fail('Gia đình đích đã có dữ liệu. Không ghi đè.',409);
 await root.setJSON('migration-backups/'+family.id,source.data,{onlyIfNew:true});
 // Copy photos before publishing the new snapshot. A failed attempt can be retried safely.
 for(const receipt of source.data.receipts||[]){if(!receipt.hasPhoto)continue;const bytes=await root.get('receipt-photo/'+receipt.id,{type:'arrayBuffer'});if(bytes)await target.set('receipt-photo/'+receipt.id,bytes,{onlyIfNew:true,metadata:{type:'image/jpeg'}})}
 const saved=await target.setJSON('state',source.data,{onlyIfNew:true});if(!saved.modified)fail('Gia đình đích vừa có dữ liệu. Không ghi đè.',409);return json({migrated:true,etag:saved.etag,photos:'copied',legacyRetained:true});
 }
 }
 if(op==='members'&&request.method==='GET')return json({name:family.name,members:Object.entries(family.members).map(([username,m])=>({username,...m})),invites:context.member.role==='owner'?Object.entries(family.invites).map(([id,i])=>({id,target:i.target,role:i.role,expires:i.expires})):[]});
 if(op==='link-member'&&request.method==='POST'){const dataStore=scopedStore(getStoreFn({name:'bep-family-data',consistency:'strong',region:'ap-southeast-2'}),family.id),state=await dataStore.get('state',{type:'json'});if(body.memberId!==null&&!state?.members?.some(m=>m.id===body.memberId))fail('Chọn thành viên trong gia đình.');await editRecord(store,'families/'+family.id,f=>{if(!f.members[account.username])fail('Không còn quyền.',403);f.members[account.username].memberId=body.memberId;return f});return json({saved:true})}
 if(context.member.role!=='owner')fail('Chỉ chủ gia đình thực hiện được.',403);
 if(op==='invite'&&request.method==='POST'){
 const target=String(body.username||'').toLowerCase().trim();if(!username(target)||!['editor','viewer'].includes(body.role))fail('Chọn tài khoản nhận và quyền hợp lệ.');const code=randomBytes(24).toString('base64url'),expires=Date.now()+7*86400000;await editRecord(store,'families/'+family.id,f=>{if(f.members[account.username]?.role!=='owner')fail('Không còn quyền.',403);f.invites=Object.fromEntries(Object.entries(f.invites||{}).filter(([,i])=>i.expires>Date.now()));if(Object.keys(f.invites).length>=30)fail('Hãy thu hồi bớt lời mời.');f.invites[hash(code)]={target,role:body.role,expires};return f});return json({code:family.id+'.'+code,expires},201)
 }
 if(op==='revoke-invite'&&request.method==='POST'){await editRecord(store,'families/'+family.id,f=>{if(f.members[account.username]?.role!=='owner')fail('Không còn quyền.',403);delete f.invites[String(body.id)];return f});return json({revoked:true})}
 if(op==='role'&&request.method==='POST'){if(body.username===account.username||!['editor','viewer','remove'].includes(body.role))fail('Không thay đổi chủ nhà bằng thao tác này.');await editRecord(store,'families/'+family.id,f=>{if(f.members[account.username]?.role!=='owner')fail('Không còn quyền.',403);if(!f.members[body.username])fail('Không tìm thấy thành viên.');if(body.role==='remove')delete f.members[body.username];else f.members[body.username].role=body.role;return f});return json({saved:true})}
 return json({error:'Unsupported operation.'},405);
 }catch(e){return json({error:e.status?e.message:'Chưa xử lý được yêu cầu. Thử lại sau.'},e.status||503)}
}}
