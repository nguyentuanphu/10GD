import {createAuthMailer,digestToken,newMailToken,validEmail} from './auth-email.mjs';
import {randomBytes,randomUUID,createHash,scrypt,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
// Owner-console hooks (studio.mts imports accountStore/editRecord from here; neither module calls the other at load time).
// Every studio helper used here swallows its own storage errors, so sign-in/sync never depends on the console store.
import {recordEvent,isAccountDisabled,signupPolicy,familyLimits,platformSettings,isFamilySuspended} from './studio.mjs';
export const ACCOUNT_COOKIE='bep_account_session';
const derive=promisify(scrypt),hash=x=>createHash('sha256').update(x).digest('hex');
const INVITE_CHARS='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function newShortInviteCode(){const b=randomBytes(8);let s='';for(let i=0;i<8;i++)s+=INVITE_CHARS[b[i]%INVITE_CHARS.length];return s.slice(0,4)+'-'+s.slice(4,8)}
export function parseInviteInput(input){
 const raw=String(input||'').trim();if(!raw)return null;
 try{if(/^https?:\/\//i.test(raw)){const u=new URL(raw),p=u.searchParams.get('invite');if(p)return parseInviteInput(p)}}catch{}
 const legacy=raw.match(/^([a-f0-9-]{36})\.([\w-]{32})$/);
 if(legacy)return{kind:'legacy',familyId:legacy[1],token:legacy[2],key:hash(legacy[2])};
 const clean=raw.toUpperCase().replace(/[^A-Z0-9]/g,'');
 if(/^[A-Z0-9]{6,12}$/.test(clean))return{kind:'short',code:clean.slice(0,4)+'-'+clean.slice(4),key:hash(clean)};
 return null;
}
export const cookieToken=request=>(request.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(ACCOUNT_COOKIE+'='))?.slice(ACCOUNT_COOKIE.length+1)||'';
export const accountStore=getStore=>getStore({name:'bep-accounts',consistency:'strong',region:'ap-southeast-2'});
export function scopedStore(store,householdId,accountMembers=null){if(!/^[a-f0-9-]{36}$/.test(householdId))throw Error('Invalid household');const prefix='households/'+householdId+'/';return{accountMembers,get:(k,o)=>store.get(prefix+k,o),getWithMetadata:(k,o)=>store.getWithMetadata(prefix+k,o),set:(k,d,o)=>store.set(prefix+k,d,o),setJSON:(k,d,o)=>store.setJSON(prefix+k,d,o),delete:k=>store.delete(prefix+k),async *list(o={}){for await(const page of store.list({...o,prefix:prefix+(o.prefix||''),paginate:true}))yield{...page,blobs:page.blobs.map(b=>({...b,key:b.key.slice(prefix.length)}))}}}}
export async function editRecord(store,key,fn){for(let i=0;i<8;i++){const row=await store.getWithMetadata(key,{type:'json'}),next=await fn(row?.data||null);if(next===undefined)return row?.data;const saved=await store.setJSON(key,next,row?.etag?{onlyIfMatch:row.etag}:{onlyIfNew:true});if(saved.modified)return next}throw Object.assign(Error('Có thay đổi đồng thời. Thử lại.'),{status:409})}
// users/<name>.households is a per-user membership index {familyId:{at}} so status never scans every family.
// Records created before the index existed are scanned once and lazily backfilled.
export const membershipIndex=a=>a&&a.households&&typeof a.households==='object'&&!Array.isArray(a.households)?a.households:null;
export async function updateMembershipIndex(store,user,id,{remove=false}={}){try{await editRecord(store,'users/'+user,a=>{if(!a)return undefined;const index=membershipIndex(a);if(remove){if(!index?.[id]&&a.lastHouseholdId!==id)return undefined;const next={...a};if(index){const h={...index};delete h[id];next.households=h}if(a.lastHouseholdId===id)delete next.lastHouseholdId;return next}return{...a,households:{...(index||{}),[id]:{at:new Date().toISOString()}}}})}catch{}}
async function scanMemberships(store,user){const mine=[];if(typeof store.list!=='function')return null;for await(const page of store.list({prefix:'families/',paginate:true}))for(const row of page.blobs){const family=await store.get(row.key,{type:'json'});if(family?.id&&family?.members?.[user])mine.push(family)}return mine}
export async function resolveAccount(request,getStore,now=Date.now()){
 const token=cookieToken(request);if(!/^[\w-]{43}$/.test(token))return null;const store=accountStore(getStore),sessionKey='sessions/'+hash(token),session=await store.get(sessionKey,{type:'json'});if(!session||session.expires<=now)return null;const account=await store.get('users/'+session.username,{type:'json'});if(!account||account.epoch!==session.epoch||isAccountDisabled(account))return null;const user=account.username;
 const load=async id=>{if(!/^[a-f0-9-]{36}$/.test(String(id||'')))return null;const f=await store.get('families/'+id,{type:'json'});return f?.members?.[user]?f:null};
 // Legacy user records (before the membership index) are scanned once and backfilled.
 if(!membershipIndex(account)){const mine=await scanMemberships(store,user);if(mine){const when=f=>String(f.members[user].joinedAt||f.createdAt||'');const households=Object.fromEntries(mine.map(f=>[f.id,{at:when(f)||new Date(0).toISOString()}]));account.households=households;try{await editRecord(store,'users/'+user,a=>a&&a.epoch===account.epoch&&!membershipIndex(a)?{...a,households}:undefined)}catch{}}}
 let household=session.householdId?await load(session.householdId):null;
 // An invalid/removed session household falls back to normal selection: last used, then most recently used/joined.
 if(!household){
  const index=membershipIndex(account),at=id=>String(index?.[id]?.at||''),seen=new Set(),stale=[];
  for(const id of [account.lastHouseholdId,...Object.keys(index||{}).sort((a,b)=>at(b).localeCompare(at(a)))]){if(!id||seen.has(id))continue;seen.add(id);household=await load(id);if(household)break;if(index?.[id])stale.push(id)}
  if(stale.length)try{await editRecord(store,'users/'+user,a=>{const h=membershipIndex(a);if(!h||a.epoch!==account.epoch)return undefined;const next={...h};stale.forEach(id=>delete next[id]);return{...a,households:next}})}catch{}
  if(household){session.householdId=household.id;try{await editRecord(store,sessionKey,current=>current?.epoch===account.epoch?{...current,householdId:household.id}:undefined)}catch{}}
 }
 // Persist the last-used family on every successful resolution (write only when it changes).
 if(household&&account.lastHouseholdId!==household.id){try{await editRecord(store,'users/'+user,a=>a&&a.epoch===account.epoch?{...a,lastHouseholdId:household.id}:undefined);account.lastHouseholdId=household.id}catch{}}
 const member=household?.members?.[user];return{store,session,account,household:member?household:null,member,sessionKey};
}
// Links the signed-in account to one family member. A member already linked to another account is a 409 conflict.
export async function linkAccountMember(context,memberId){const user=context.account.username;let conflict=false;await editRecord(context.store,'families/'+context.household.id,f=>{if(!f?.members?.[user])fail('Không còn quyền.',403);if(memberId!==null&&Object.entries(f.members).some(([name,m])=>name!==user&&m?.memberId===memberId)){conflict=true;return undefined}if(f.members[user].memberId===memberId)return undefined;f.members[user].memberId=memberId;return f});if(conflict)throw Object.assign(Error('Tên này đã gắn với tài khoản khác. / This member is already linked to another account.'),{status:409,reason:'member_linked_other'});if(context.household.members?.[user])context.household.members[user].memberId=memberId;if(context.member)context.member.memberId=memberId;return memberId}
const publicUser=a=>({username:a.username,name:a.name,email:a.email||null});
export const publicContext=c=>({connected:!!c,account:c?publicUser(c.account):null,household:c?.household?{id:c.household.id,name:c.household.name,role:c.member.role,memberId:c.member.memberId||null}:null});
async function passwordHash(password,salt=randomBytes(16).toString('hex')){const key=await derive(password,salt,64,{N:131072,r:8,p:1,maxmem:160*1024*1024});return{salt,key:key.toString('hex')}}
async function passwordMatches(password,record){const candidate=await passwordHash(password,record.salt);return timingSafeEqual(Buffer.from(candidate.key,'hex'),Buffer.from(record.key,'hex'))}
const json=(data,status=200,headers={})=>{const h=new Headers({'Cache-Control':'no-store'});for(const [name,value] of Object.entries(headers))for(const v of [].concat(value))h.append(name,v);return Response.json(data,{status,headers:h})};
// Non-HttpOnly presence hint (no secret): lets the app shell know an account exists even if the browser cleared localStorage.
export const ACCOUNT_HINT_COOKIE='bep-account';
export const accountHintCookie=trust=>`${ACCOUNT_HINT_COOKIE}=1; Path=/; ${trust?'Max-Age=2592000; ':''}Secure; SameSite=Strict`;
export const clearAccountCookies=()=>[`${ACCOUNT_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`,`${ACCOUNT_HINT_COOKIE}=; Path=/; Max-Age=0; Secure; SameSite=Strict`];
const fail=(message,status=400,en=undefined)=>{throw Object.assign(Error(message),{status,...(en?{en}:{})})};
// An invite is usable for sign-up when it exists, has not expired and is either open or addressed to this username.
async function inviteUsable(store,parsed,name,now=Date.now()){try{if(!parsed)return false;let id=parsed.familyId||(await store.get('invite-lookup/'+parsed.key,{type:'json'}))?.familyId;if(!id||!/^[a-f0-9-]{36}$/.test(id))return false;const f=await store.get('families/'+id,{type:'json'}),i=f?.invites?.[parsed.key];return!!i&&i.expires>now&&(!i.target||i.target===name)}catch{return false}}
const SUSPENDED={vi:'Gia đình đang tạm dừng (chỉ xem).',en:'This family is paused (read-only).'};
const username=x=>typeof x==='string'&&/^[a-z0-9][a-z0-9_.-]{2,39}$/.test(x)&&!['constructor','prototype','__proto__'].includes(x);
const validPassword=x=>typeof x==='string'&&x.length>=8&&x.length<=128;
async function rate(store,request,op,max,window){const ip=request.headers.get('x-nf-client-connection-ip')||'unknown',key='rate/'+hash(ip+':'+op)+':'+Math.floor(Date.now()/window);await editRecord(store,key,n=>{if((n?.count||0)>=max)fail('Thử quá nhiều lần. Vui lòng chờ rồi thử lại.',429);return{count:(n?.count||0)+1}})}
async function startSession(store,account,trust,householdId=null){const token=randomBytes(32).toString('base64url');await store.setJSON('sessions/'+hash(token),{username:account.username,epoch:account.epoch,householdId,trusted:trust,expires:Date.now()+(trust?30*86400000:8*3600000)});return `${ACCOUNT_COOKIE}=${token}; Path=/; ${trust?'Max-Age=2592000; ':''}HttpOnly; Secure; SameSite=Strict`}
export function createAccountsHandler({getStoreFn,signupFn=()=>process.env.ALLOW_ACCOUNT_SIGNUP!=='false',mailer=createAuthMailer(),nowFn=()=>Date.now()}={}){return async(request,runtime=undefined)=>{
 // Console events run after the response when the runtime supports waitUntil; otherwise they are awaited (they never throw).
 const track=(type,data)=>{const p=recordEvent(getStoreFn,type,data);if(typeof runtime?.waitUntil==='function'){runtime.waitUntil(p);return null}return p};
 const url=new URL(request.url),op=url.searchParams.get('op'),store=accountStore(getStoreFn);
 try{
 if(!['GET','HEAD'].includes(request.method)&&request.headers.get('origin')!==url.origin)return json({error:'Same-origin request required.'},403);
 if(['legacy-preview','legacy-migrate'].includes(op))return json({error:'Luồng gia đình cũ đã ngừng hoạt động.'},410);
 const context=await resolveAccount(request,getStoreFn);
 if(op==='status'&&request.method==='GET'){const policy=await signupPolicy(getStoreFn);return json({...publicContext(context),signup:signupFn()&&policy.reason!=='closed',signupMode:signupFn()?policy.reason==='invite-only'?'invite-only':policy.reason==='closed'?'closed':'open':'closed'})}
 if(op==='logout'&&request.method==='POST'){if(context)await store.delete(context.sessionKey);return json({connected:false},200,{'Set-Cookie':clearAccountCookies()})}
 let body={};if(request.method==='POST'){const raw=await request.text();if(raw.length>20000)fail('Yêu cầu quá lớn.',413);body=JSON.parse(raw)}
 // Mail tokens are random bearer credentials. Only hashes are stored server-side.
 async function mailToken(kind){
  const token=String(body.token||'');if(!/^[\w-]{43}$/.test(token))fail('Liên kết không hợp lệ hoặc đã hết hạn. Yêu cầu một liên kết mới.');
  const key='mail-tokens/'+digestToken(token),record=await store.get(key,{type:'json'});
  if(!record||record.kind!==kind||record.usedAt!==undefined||record.expires<=nowFn())fail('Liên kết không hợp lệ hoặc đã hết hạn. Yêu cầu một liên kết mới.');
  return{key,record};
 }
 if(op==='request-reset'&&request.method==='POST'){
  await rate(store,request,'request-reset',5,900000);
  if(!mailer.configured())return json({error:'Khôi phục qua email đang tạm ngưng. Vui lòng thử lại sau.'},503);
  const name=String(body.username||'').toLowerCase().trim(),user=username(name)?await store.get('users/'+name,{type:'json'}):null;
  // Always return the same accepted response; the emailed one-use link is the proof required to reset a password.
  if(user&&validEmail(user.email)){
   try{await rate(store,request,'reset-user-'+hash(name),3,900000)}catch(e){if(e.status===429)return json({accepted:true,message:'Nếu tài khoản có email khôi phục, yêu cầu khôi phục sẽ được xử lý. Kiểm tra hộp thư và thư rác; nếu chưa nhận được thư, hãy thử lại sau.'},202);throw e}
   const token=newMailToken(),key='mail-tokens/'+digestToken(token);
   await store.setJSON(key,{kind:'reset',username:name,email:user.email,epoch:user.epoch,expires:nowFn()+900000},{onlyIfNew:true});
   try{await mailer.send('reset',user.email,token)}catch{await store.delete(key)}
  }
  return json({accepted:true,message:'Nếu tài khoản có email khôi phục, yêu cầu khôi phục sẽ được xử lý. Kiểm tra hộp thư và thư rác; nếu chưa nhận được thư, hãy thử lại sau.'},202);
 }
 if(op==='verify-email')return json({error:'Không cần xác minh email để tạo tài khoản.'},410);
 if(op==='complete-reset'&&request.method==='POST'){
  await rate(store,request,'complete-reset',10,900000);if(!validPassword(body.password))fail('Mật khẩu phải dài từ 8 đến 128 ký tự.');
  const {key,record}=await mailToken('reset'),user=await store.get('users/'+record.username,{type:'json'});
  if(!user||user.epoch!==record.epoch||user.email!==record.email)fail('Liên kết đã được thay thế. Yêu cầu đặt lại mật khẩu.');
  const password=await passwordHash(body.password),recoveryCode=randomBytes(24).toString('base64url');
  await editRecord(store,key,t=>{if(!t||t.usedAt!==undefined||t.expires<=nowFn())fail('Liên kết đã dùng hoặc hết hạn.');return{...t,usedAt:nowFn()}});
  await editRecord(store,'users/'+record.username,a=>{if(a.epoch!==record.epoch||a.email!==record.email)fail('Liên kết đã được thay thế.');const next={...a,password,recoveryHash:hash(recoveryCode),epoch:randomUUID()};delete next.pendingEmail;delete next.pendingEmailVersion;return next});
  return json({recovered:true,recoveryCode});
 }
 if(['register','login','recover'].includes(op)&&request.method==='POST'){
 await rate(store,request,op,op==='register'?6:10,op==='register'?86400000:900000);
 const name=String(body.username||'').toLowerCase().trim();if(!username(name)||typeof body.password!=='string'||body.password.length>128)fail('Kiểm tra tên đăng nhập và mật khẩu.');
 let account=await store.get('users/'+name,{type:'json'});
 if(op==='register'){
 if(body.email!==undefined&&body.email!==''&&!validEmail(body.email))fail('Nhập địa chỉ email hợp lệ.');
 let policy=await signupPolicy(getStoreFn);if(!policy.allowed&&policy.reason==='invite-only'&&await inviteUsable(store,parseInviteInput(body.invite),name))policy={allowed:true,reason:'invite-only'};if(!signupFn()||policy.reason==='closed')fail('Đăng ký mới đang tắt.',403,'New sign-ups are turned off.');if(!policy.allowed)fail('Đăng ký mới cần mã mời hợp lệ từ người nhà.',403,'Sign-up needs a valid family invitation code.');if(!validPassword(body.password)||typeof body.name!=='string'||!body.name.trim()||body.name.length>80)fail('Tên hiển thị và mật khẩu từ 8–128 ký tự là bắt buộc.');
 const recoveryCode=randomBytes(24).toString('base64url');account={username:name,name:body.name.trim(),...(body.email?{email:body.email.trim().toLowerCase()}:{}),password:await passwordHash(body.password),recoveryHash:hash(recoveryCode),epoch:randomUUID(),createdAt:new Date().toISOString()};const saved=await store.setJSON('users/'+name,account,{onlyIfNew:true});if(!saved.modified)fail('Tên đăng nhập không khả dụng.',409);await track('signup',{account:name,invited:policy.reason==='invite-only'});return json({account:publicUser(account),recoveryCode},201,{'Set-Cookie':[await startSession(store,account,body.trust===true),accountHintCookie(body.trust===true)]});
 }
 if(op==='recover'){
 if(!validPassword(body.password)||!account||typeof body.recoveryCode!=='string'||!timingSafeEqual(Buffer.from(hash(body.recoveryCode)),Buffer.from(account.recoveryHash)))fail('Thông tin khôi phục không đúng.',401);
 const nextCode=randomBytes(24).toString('base64url'),newPassword=await passwordHash(body.password);await editRecord(store,'users/'+name,a=>{if(a.epoch!==account.epoch)fail('Mã đã thay đổi. Thử lại.',409);return{...a,password:newPassword,recoveryHash:hash(nextCode),epoch:randomUUID()}});return json({recovered:true,recoveryCode:nextCode});
 }
 // Do comparable password work for unknown users too.
 const record=account?.password||{salt:'00000000000000000000000000000000',key:'0'.repeat(128)};if(!await passwordMatches(body.password,record)||!account){await track('login_failed',{reason:'credentials'});fail('Tên đăng nhập hoặc mật khẩu không đúng.',401,'Incorrect username or password.')}
 if(isAccountDisabled(account)){await track('login_failed',{account:name,reason:'disabled'});fail('Tài khoản đang tạm khóa. Liên hệ chủ ứng dụng để được hỗ trợ.',403,'This account is temporarily locked. Contact the app owner for help.')}
 await track('login',{account:name});return json({account:publicUser(account)},200,{'Set-Cookie':[await startSession(store,account,body.trust===true),accountHintCookie(body.trust===true)]});
 }
 if(!context)fail('Cần đăng nhập tài khoản.',401);
 const {account}=context;
 const rememberFamily=async id=>editRecord(store,'users/'+account.username,a=>{if(a.epoch!==account.epoch)fail('Đăng nhập lại.',401);return{...a,lastHouseholdId:id,households:{...(membershipIndex(a)||{}),[id]:{at:new Date().toISOString()}}}});
 if(op==='set-email'&&request.method==='POST'){await rate(store,request,'set-email',5,900000);if((body.email!==''&&!validEmail(body.email))||typeof body.password!=='string'||body.password.length>128||!await passwordMatches(body.password,account.password))fail('Kiểm tra email và mật khẩu hiện tại.',400);const updated=await editRecord(store,'users/'+account.username,a=>{if(a.epoch!==account.epoch)fail('Đăng nhập lại.',401);const next={...a};if(body.email)next.email=body.email.trim().toLowerCase();else delete next.email;delete next.emailVerifiedAt;delete next.pendingEmail;delete next.pendingEmailVersion;return next});return json({saved:true,account:publicUser(updated)})}
 if(op==='families'&&request.method==='GET'){const index=membershipIndex(account);let rows;if(index)rows=(await Promise.all(Object.keys(index).map(id=>/^[a-f0-9-]{36}$/.test(id)?store.get('families/'+id,{type:'json'}):null))).filter(f=>f?.members?.[account.username]);else rows=await scanMemberships(store,account.username)||[];const families=rows.map(f=>({id:f.id,name:f.name,role:f.members[account.username].role}));return json({families,...publicContext(context)})}
 if(op==='create-family'&&request.method==='POST'){
 if(typeof body.name!=='string'||!body.name.trim()||body.name.length>80)fail('Nhập tên gia đình (tối đa 80 ký tự).');await rate(store,request,'create-family',5,86400000);
 const maxOwned=(await platformSettings(getStoreFn).catch(()=>null))?.values?.maxFamiliesPerAccount;if(Number.isInteger(maxOwned)){const ids=Object.keys(membershipIndex(account)||{}).filter(x=>/^[a-f0-9-]{36}$/.test(x));const owned=(await Promise.all(ids.map(x=>store.get('families/'+x,{type:'json'}).catch(()=>null)))).filter(f=>f?.members?.[account.username]?.role==='owner').length;if(owned>=maxOwned)fail(`Tài khoản đã tạo tối đa ${maxOwned} gia đình.`,403,`This account already owns the maximum of ${maxOwned} families.`)}
 const id=randomUUID(),family={id,name:body.name.trim(),createdAt:new Date().toISOString(),members:{[account.username]:{role:'owner',name:account.name,memberId:null,joinedAt:new Date().toISOString()}},invites:{}};await store.setJSON('families/'+id,family,{onlyIfNew:true});await editRecord(store,context.sessionKey,s=>({...s,householdId:id}));await rememberFamily(id);await track('family_created',{account:account.username,family:id});return json({household:{id,name:family.name,role:'owner'}},201)
 }
 if(op==='switch-family'&&request.method==='POST'){const f=await store.get('families/'+String(body.id),{type:'json'});if(!f?.members?.[account.username])fail('Không có quyền vào gia đình này.',403);await editRecord(store,context.sessionKey,s=>({...s,householdId:f.id}));await rememberFamily(f.id);return json({switched:true})}
 if(op==='join'&&request.method==='POST'){
 const parsed=parseInviteInput(body.code);if(!parsed)fail('Mã mời không đúng.');await rate(store,request,'join',12,900000);let id=parsed.familyId||null;if(!id){const lookup=await store.get('invite-lookup/'+parsed.key,{type:'json'});id=lookup?.familyId||null}if(!id&&typeof store.list==='function'){for await(const page of store.list({prefix:'families/',paginate:true}))for(const row of page.blobs){const f=await store.get(row.key,{type:'json'});if(f?.invites?.[parsed.key]){id=f.id;break}}}if(!id||!/^[a-f0-9-]{36}$/.test(id))fail('Mã mời hết hạn hoặc không dành cho tài khoản này.',403);
 if(await isFamilySuspended(getStoreFn,id))fail(SUSPENDED.vi,423,SUSPENDED.en);let maxMembers=20;try{maxMembers=(await familyLimits(getStoreFn,id)).maxMembers||20}catch{}
 let linkedMemberId=null,familyName='',singleUse=false;try{const dataStore=scopedStore(getStoreFn({name:'bep-family-data',consistency:'strong',region:'ap-southeast-2'}),id),stateRow=await dataStore.getWithMetadata('state',{type:'json'});if(stateRow?.data&&Array.isArray(stateRow.data.members)){const st=stateRow.data,norm=s=>String(s||'').trim().toLowerCase();const found=st.members.find(m=>norm(m.name)===norm(account.name)||norm(m.name)===norm(account.username));if(found)linkedMemberId=found.id}}catch{}await editRecord(store,'families/'+id,f=>{const invite=f?.invites?.[parsed.key];if(!invite||invite.expires<Date.now()||(invite.target&&invite.target!==account.username))fail('Mã mời hết hạn hoặc không dành cho tài khoản này.',403);if(!f.members[account.username]&&Object.keys(f.members).length>=maxMembers)fail(`Gia đình đã đủ ${maxMembers} tài khoản.`,400,`This family already has the maximum of ${maxMembers} accounts.`);familyName=f.name||'Gia đình';const taken=mid=>Object.entries(f.members).some(([n,m])=>n!==account.username&&m?.memberId===mid);const currentMemberId=f.members[account.username]?.memberId||(linkedMemberId&&!taken(linkedMemberId)?linkedMemberId:null);f.members[account.username]={role:f.members[account.username]?.role||invite.role,name:account.name,memberId:currentMemberId,joinedAt:f.members[account.username]?.joinedAt||new Date().toISOString()};linkedMemberId=currentMemberId;if(invite.target){singleUse=true;delete f.invites[parsed.key]}return f});if(singleUse)await store.delete('invite-lookup/'+parsed.key);await editRecord(store,context.sessionKey,s=>({...s,householdId:id}));await rememberFamily(id);await track('invite_accepted',{account:account.username,family:id});return json({joined:true,familyId:id,familyName,memberId:linkedMemberId,memberName:account.name})
 }
 const family=context.household;if(!family)fail('Chọn hoặc tạo gia đình trước.',409);
 if(op==='members'&&request.method==='GET')return json({name:family.name,members:Object.entries(family.members).map(([username,m])=>({username,...m})),invites:context.member.role==='owner'?Object.entries(family.invites).map(([id,i])=>({id,target:i.target,role:i.role,expires:i.expires,code:i.code||null})):[]});
 if(op==='link-member'&&request.method==='POST'){const dataStore=scopedStore(getStoreFn({name:'bep-family-data',consistency:'strong',region:'ap-southeast-2'}),family.id),state=await dataStore.get('state',{type:'json'});if(body.memberId!==null&&!state?.members?.some(m=>m.id===body.memberId))fail('Chọn thành viên trong gia đình.');await linkAccountMember(context,body.memberId);return json({saved:true})}
 if(context.member.role!=='owner')fail('Chỉ chủ gia đình thực hiện được.',403);
 if(op==='invite'&&request.method==='POST'){
 const target=String(body.username||'').toLowerCase().trim();if((target&&!username(target))||!['editor','viewer'].includes(body.role))fail('Chọn tài khoản nhận và quyền hợp lệ.');if(await isFamilySuspended(getStoreFn,family.id))fail(SUSPENDED.vi,423,SUSPENDED.en);const code=newShortInviteCode(),inviteKey=hash(code.replace(/-/g,'')),expires=Date.now()+7*86400000;await editRecord(store,'families/'+family.id,f=>{if(f.members[account.username]?.role!=='owner')fail('Không còn quyền.',403);f.invites=Object.fromEntries(Object.entries(f.invites||{}).filter(([,i])=>i.expires>Date.now()));if(Object.keys(f.invites).length>=30)fail('Hãy thu hồi bớt lời mời.');f.invites[inviteKey]={target:target||null,role:body.role,expires,code};return f});await store.setJSON('invite-lookup/'+inviteKey,{familyId:family.id,expires});await track('invite_created',{account:account.username,family:family.id,targeted:!!target});return json({code,expires},201)
 }
 if(op==='revoke-invite'&&request.method==='POST'){const inviteKey=String(body.id);await editRecord(store,'families/'+family.id,f=>{if(f.members[account.username]?.role!=='owner')fail('Không còn quyền.',403);delete f.invites[inviteKey];return f});await store.delete('invite-lookup/'+inviteKey);await track('invite_revoked',{account:account.username,family:family.id});return json({revoked:true})}
 if(op==='role'&&request.method==='POST'){if(body.username===account.username||!['editor','viewer','remove'].includes(body.role))fail('Không thay đổi chủ nhà bằng thao tác này.');await editRecord(store,'families/'+family.id,f=>{if(f.members[account.username]?.role!=='owner')fail('Không còn quyền.',403);if(!f.members[body.username])fail('Không tìm thấy thành viên.');if(body.role==='remove')delete f.members[body.username];else f.members[body.username].role=body.role;return f});if(body.role==='remove')await updateMembershipIndex(store,body.username,family.id,{remove:true});return json({saved:true})}
 return json({error:'Unsupported operation.'},405);
 }catch(e){if(!e.status)await track('error',{area:'accounts',op});return json({error:e.status?e.message:'Chưa xử lý được yêu cầu. Thử lại sau.',...(e.en?{errorEn:e.en}:e.status?{}:{errorEn:'Could not complete the request. Try again later.'}),...(e.reason?{reason:e.reason}:{})},e.status||503)}
}}
