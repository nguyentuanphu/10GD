import {loginPage} from './login-page.mjs';
// Application code/assets are public. Account/family APIs enforce their own live
// sessions and membership checks; no private household data is embedded here.
export function createGate(){return async(request,context)=>{
 const path=new URL(request.url).pathname;
 if(path.startsWith('/.netlify/'))return context.next();
 if(path==='/login')return new Response(loginPage(),{headers:{'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
 const response=await context.next(),headers=new Headers(response.headers);headers.set('Cache-Control','no-cache');
 return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}}
export default createGate();
