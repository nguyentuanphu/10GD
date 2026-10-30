import { getStore } from '@netlify/blobs';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
const COOKIE='bep_family_session';
const json=(data,status=200,extra={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store',...extra}});
const digest=x=>createHash('sha256').update(x).digest();
function constantEqual(a,b){return timingSafeEqual(digest(a),digest(b))}
function sessionToken(password){const payload=Buffer.from(JSON.stringify({exp:Date.now()+14*86400000,nonce:randomBytes(12).toString('hex')})).toString('base64url');return payload+'.'+createHmac('sha256',password).update(payload).digest('base64url')}
function sessionOK(request,password){try{const cookie=request.headers.get('cookie')||'';const value=cookie.split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);if(!value)return false;const [payload,signature]=value.split('.');if(!payload||!signature||!constantEqual(signature,createHmac('sha256',password).update(payload).digest('base64url')))return false;return JSON.parse(Buffer.from(payload,'base64url').toString()).exp>Date.now()}catch(e){return false}}
function validState(s){return s&&s.version===1&&Array.isArray(s.members)&&s.members.length>0&&s.members.length<=12&&Array.isArray(s.recipes)&&s.weeks&&typeof s.weeks==='object'&&Array.isArray(s.pantry)&&s.preferences&&(!s.receipts||Array.isArray(s.receipts))}
export function createFamilyHandler({getStoreFn=getStore,passwordFn=()=>process.env.FAMILY_PASSWORD||''}={}){
const familyStore=()=>getStoreFn({name:'bep-family-data',consistency:'strong',region:'ap-southeast-2'});
return async(request)=>{
 const url=new URL(request.url),op=url.searchParams.get('op'),password=passwordFn(),configured=password.length>=12,connected=configured&&sessionOK(request,password);
 if(op==='status')return json({configured,connected});
 if(!configured)return json({error:'Set FAMILY_PASSWORD (12+ characters) with Functions scope and redeploy.'},503);
 if(!['GET','HEAD'].includes(request.method)&&request.headers.get('origin')!==url.origin)return json({error:'Same-origin request required.'},403);
 if(op==='login'&&request.method==='POST'){try{const raw=await request.text();if(raw.length>1000)return json({error:'Invalid login.'},400);const body=JSON.parse(raw);if(typeof body.password!=='string'||!constantEqual(body.password,password))return json({error:'Invalid password.'},401);return json({connected:true},200,{'Set-Cookie':`${COOKIE}=${sessionToken(password)}; Path=/; Max-Age=1209600; HttpOnly; Secure; SameSite=Strict`})}catch(e){return json({error:'Invalid login.'},400)}}
 if(op==='logout'&&request.method==='POST')return json({connected:false},200,{'Set-Cookie':`${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`});
 if(!connected)return json({error:'Sign in to family storage.'},401);
 try{const store=familyStore();
 if(op==='state'&&request.method==='GET'){const result=await store.getWithMetadata('state',{type:'json'});return json({state:result?.data||null,etag:result?.etag||null})}
 if(op==='state'&&request.method==='PUT'){const raw=await request.text();if(Buffer.byteLength(raw)>4000000)return json({error:'State exceeds 4 MB. Export an archive and remove old history.'},413);let body;try{body=JSON.parse(raw)}catch(e){return json({error:'Invalid JSON.'},400)}if(!validState(body.state)||!(body.etag===null||typeof body.etag==='string'))return json({error:'Invalid family state.'},400);const options=body.etag?{onlyIfMatch:body.etag}:{onlyIfNew:true};const result=await store.setJSON('state',body.state,options);if(!result.modified)return json({error:'Another device changed this data. Reload and resolve.'},409);return json({etag:result.etag})}
 if(op==='photo'){const id=url.searchParams.get('id');if(!id||!/^[a-zA-Z0-9-]{1,100}$/.test(id))return json({error:'Invalid receipt id.'},400);const key='receipt-photo/'+id;if(request.method==='PUT'){if(!request.headers.get('content-type')?.startsWith('image/jpeg'))return json({error:'JPEG required.'},400);const bytes=await request.arrayBuffer();if(bytes.byteLength>3500000)return json({error:'Image exceeds 3.5 MB.'},413);const view=new Uint8Array(bytes);if(view[0]!==255||view[1]!==216||view[2]!==255)return json({error:'Invalid JPEG.'},400);await store.set(key,bytes,{metadata:{type:'image/jpeg'}});return json({saved:true})}if(request.method==='GET'){const bytes=await store.get(key,{type:'arrayBuffer'});return bytes?new Response(bytes,{headers:{'Content-Type':'image/jpeg','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}}):json({error:'Image not found.'},404)}}
 return json({error:'Unsupported operation.'},405);
 }catch(e){console.error('Family storage operation failed',e.name);return json({error:'Family storage unavailable. Local data is retained.'},503)}
};
}
export default createFamilyHandler();
