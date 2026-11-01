import {loginPage} from './login-page.mjs';
// Application code/assets are public. Account/family APIs enforce their own live
// sessions and membership checks; no private household data is embedded here.
export function createGate(){return async(request,context)=>{
 const path=new URL(request.url).pathname;
 if(path.startsWith('/.netlify/'))return context.next();
 if(path==='/login')return new Response(loginPage(),{headers:{'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
 const response=await context.next();
 // Artwork, icons and fonts keep their static cache headers; documents, scripts and
 // the startup pack revalidate (ETag) so a new release is picked up immediately.
 if(/^(image|font)\//.test(response.headers.get('Content-Type')||''))return response;
 const headers=new Headers(response.headers);headers.set('Cache-Control','no-cache');
 return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}}
export default createGate();
