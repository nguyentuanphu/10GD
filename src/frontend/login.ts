type AuthMode = 'login'|'register'|'request-reset'|'reset'|'recover';
const node = <T extends HTMLElement>(id:string):T => {
 const element=document.getElementById(id);if(!element)throw Error('Missing authentication control');return element as T;
};
let mode:AuthMode='login',busy=false,resetToken='';
const form=node<HTMLFormElement>('login');
const tabs=[...document.querySelectorAll<HTMLButtonElement>('[data-mode]')];
const field=(id:string):HTMLInputElement=>node<HTMLInputElement>(id);
function changeMode(next:AuthMode):void {
 if(busy)return;mode=next;
 form.hidden=false;node('recovery').hidden=true;
 node('registration-fields').hidden=mode!=='register';field('name').disabled=mode!=='register';field('email').disabled=mode!=='register';field('name').required=mode==='register';field('email').required=mode==='register';
 node('recovery-field').hidden=mode!=='recover';field('recoveryCode').disabled=mode!=='recover';field('recoveryCode').required=mode==='recover';
 const requesting=mode==='request-reset';
 // Visibility reserves geometry: username/password/buttons stay in the same place.
 node('password-field').style.visibility=requesting?'hidden':'visible';
 field('trust').disabled=!['login','register'].includes(mode);field('trust').parentElement!.style.visibility=['login','register'].includes(mode)?'visible':'hidden';field('password').disabled=requesting;field('password').required=!requesting;
 node('username-field').style.visibility=mode==='reset'?'hidden':'visible';field('username').disabled=mode==='reset';
 node('password-label').textContent=['register','reset','recover'].includes(mode)?'Mật khẩu (12–128 ký tự)':'Mật khẩu / Password';
 field('password').minLength=['register','reset','recover'].includes(mode)?12:1;
 field('password').autocomplete=mode==='login'?'current-password':'new-password';
 node('mode-note').hidden=['register','recover'].includes(mode);
 node('mode-note').textContent=requesting?'Nhập tên đăng nhập. Nếu tài khoản có email đã xác minh, hướng dẫn đặt lại mật khẩu sẽ được gửi.':mode==='reset'?'Đặt mật khẩu mới. Các phiên đăng nhập cũ sẽ hết hiệu lực khi bạn hoàn tất.':'Mỗi người dùng một tài khoản riêng. Bạn có thể tạo hoặc tham gia gia đình sau khi đăng nhập.';
 node('submit').textContent=mode==='register'?'Tạo tài khoản':requesting?'Gửi email khôi phục':['reset','recover'].includes(mode)?'Đặt mật khẩu mới':'Đăng nhập';
 node('error').textContent='';
 tabs.forEach(tab=>tab.setAttribute('aria-selected',String(tab.dataset.mode===mode)));
}
interface AuthResponse {error?:unknown;recoveryCode?:string;emailVerification?:{sent?:boolean};message?:string;verified?:boolean}
async function request(op:string,body:Record<string,unknown>):Promise<AuthResponse> {
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
 try {
  const response=await fetch('/.netlify/functions/accounts?op='+op,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal});
  const data=await response.json() as AuthResponse;
  if(!response.ok)throw Error(typeof data.error==='string'?data.error:'Chưa xử lý được. Hãy thử lại.');return data;
 } catch(error){if(error instanceof DOMException&&error.name==='AbortError')throw Error('Kết nối quá lâu. Vui lòng thử lại khi có mạng.');if(error instanceof SyntaxError)throw Error('Chưa kết nối được dịch vụ tài khoản. Vui lòng thử lại.');throw error}
 finally {clearTimeout(timer)}
}
tabs.forEach(tab=>{
 tab.onclick=()=>changeMode(tab.dataset.mode==='register'?'register':'login');
 tab.onkeydown=event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();const other=tabs.find(t=>t!==tab);other?.focus();other?.click()}};
});
node('forgot').onclick=()=>changeMode('request-reset');node('backup').onclick=()=>changeMode('recover');
node('continue').onclick=()=>location.replace(mode==='recover'||mode==='reset'?'/login?locked=1':'/');
form.addEventListener('submit',async event=>{
 event.preventDefault();if(busy)return;const submittedMode=mode;
 busy=true;const button=node<HTMLButtonElement>('submit');button.disabled=true;tabs.forEach(t=>t.disabled=true);node('error').textContent='';
 try {
  const payload:Record<string,unknown>={};
  if(submittedMode!=='reset')payload.username=field('username').value;
  if(submittedMode!=='request-reset')payload.password=field('password').value;
  if(submittedMode==='register'){payload.name=field('name').value;payload.email=field('email').value;}
  if(submittedMode==='recover')payload.recoveryCode=field('recoveryCode').value;
  if(submittedMode==='login'||submittedMode==='register')payload.trust=field('trust').checked;
  if(submittedMode==='reset')payload.token=resetToken;
  const data=await request(submittedMode==='reset'?'complete-reset':submittedMode,payload);
  if(submittedMode==='request-reset'){node('error').textContent=String(data.message||'Nếu tài khoản có email đã xác minh, hướng dẫn sẽ được gửi.');return}
  field('password').value='';field('recoveryCode').value='';try{localStorage.removeItem('bep-local-locked')}catch{}
  if(typeof data.recoveryCode==='string'){
   form.hidden=true;node('recovery').hidden=false;node('recovery-value').textContent=data.recoveryCode;
   node('result-title').textContent='Lưu mã khôi phục dự phòng';
   node('result-message').textContent=data.emailVerification?.sent?'Đã gửi email xác minh. Mã dự phòng dưới đây chỉ hiện lần này; lưu riêng và không chia sẻ.':submittedMode==='register'?'Tài khoản đã được tạo. Chưa gửi được email xác minh; bạn có thể thêm/xác minh email trong Tài khoản sau. Hãy lưu mã dự phòng này.':'Mật khẩu đã được đổi và các phiên cũ đã bị thu hồi. Lưu mã dự phòng mới; mã trước đã hết hiệu lực.';
   return;
  }
  const target=new URLSearchParams(location.search).get('return')||'/';
  location.replace(target.startsWith('/')&&!target.startsWith('//')&&!target.startsWith('/login')&&!target.startsWith('/.netlify/')?target+location.hash:'/'+location.hash);
 } catch(error){node('error').textContent=error instanceof Error?error.message:'Chưa kết nối được. Hãy thử lại khi có mạng.'}
 finally{busy=false;button.disabled=false;tabs.forEach(t=>t.disabled=false)}
});
const parameters=new URLSearchParams(location.search),verificationToken=parameters.get('verify');resetToken=parameters.get('reset')||'';
if(verificationToken||resetToken){history.replaceState(null,'','/login?locked=1');}
changeMode(resetToken?'reset':'login');
if(verificationToken){
 busy=true;tabs.forEach(t=>t.disabled=true);node<HTMLButtonElement>('submit').disabled=true;
 void request('verify-email',{token:verificationToken}).then(()=>{node('error').textContent='Email đã được xác minh. Bạn có thể đăng nhập.'}).catch(error=>{node('error').textContent=error instanceof Error?error.message:'Chưa xác minh được email.'}).finally(()=>{busy=false;tabs.forEach(t=>t.disabled=false);node<HTMLButtonElement>('submit').disabled=false});
}
export {};
