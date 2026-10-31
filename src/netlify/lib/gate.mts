import {tokenFromRequest,verifySessionToken} from './session.mjs';
import {loginPage} from './login-page.mjs';
export function createGate({passwordFn=()=>Netlify.env.get('FAMILY_PASSWORD')||'',accountCheck=async request=>{const endpoint=new URL('/.netlify/functions/accounts?op=status',request.url),res=await fetch(endpoint,{headers:{Cookie:request.headers.get('cookie')||''},cache:'no-store'});return res.ok&&(await res.json()).connected}}={}){return async(request,context)=>{
 const url=new URL(request.url),path=url.pathname;
 if(['/.netlify/functions/family','/.netlify/functions/accounts'].includes(path)||['/sw.js','/manifest.webmanifest','/icon.svg','/icon-192.png','/icon-512.png','/notification-icon.png'].includes(path))return context.next();
 const accountCookie=(request.headers.get('cookie')||'').includes('bep_account_session=');let accountSigned=false;if(accountCookie)try{accountSigned=await accountCheck(request)}catch{}
 const password=passwordFn();
 const signedIn=accountSigned||!accountCookie&&await verifySessionToken(tokenFromRequest(request),password);
 if(path==='/login'){if(signedIn&&url.searchParams.get('locked')!=='1')return Response.redirect(new URL('/',url),303);return new Response(loginPage(),{status:200,headers:{'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'}})}
 if(!signedIn){if(request.headers.get('accept')?.includes('text/html')||path==='/'||path.endsWith('.html'))return Response.redirect(new URL('/login?return='+encodeURIComponent(path+url.search),url),303);return new Response('Sign in required',{status:401,headers:{'Cache-Control':'no-store','Content-Type':'text/plain;charset=utf-8'}})}
 const response=await context.next();const headers=new Headers(response.headers);headers.set('Cache-Control','private, no-store');headers.set('Vary','Cookie');return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}}
export default createGate();
