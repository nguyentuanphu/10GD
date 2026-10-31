type AuthMode = 'login'|'register'|'request-reset'|'reset'|'recover';
const node = <T extends HTMLElement>(id:string):T => {
 const element=document.getElementById(id);if(!element)throw Error('Missing authentication control');return element as T;
};
let mode:AuthMode='login',busy=false,resetToken='';
const form=node<HTMLFormElement>('login');
const tabs=[...document.querySelectorAll<HTMLButtonElement>('[data-mode]')];
const field=(id:string):HTMLInputElement=>node<HTMLInputElement>(id);
const invitationField=node<HTMLInputElement>('invitation-code');
function invitationCode(value:string):string {
 const raw=value.trim();if(!raw)return '';
 try{if(/^https?:\/\//i.test(raw)){const u=new URL(raw),p=u.searchParams.get('invite');if(p)return invitationCode(p)}}catch{}
 const legacy=raw.match(/[a-f0-9-]{36}\.[A-Za-z0-9_-]{32}/);if(legacy)return legacy[0];
 const clean=raw.toUpperCase().replace(/[^A-Z0-9]/g,'');
 if(/^[A-Z0-9]{6,12}$/.test(clean))return clean.slice(0,4)+'-'+clean.slice(4);
 return '';
}
invitationField.oninput=()=>{try{if(invitationField.value.trim())sessionStorage.setItem('bep-invite-draft',invitationField.value.trim());else sessionStorage.removeItem('bep-invite-draft')}catch{}};
let invitationMessage='',joinedFamily=false;
async function connectInvitation():Promise<void>{
 invitationMessage='';joinedFamily=false;if(!invitationField.value.trim())return;
 const code=invitationCode(invitationField.value);
 if(!code){invitationMessage='Mã mời chưa hợp lệ. Bạn vẫn đã có tài khoản; có thể nhập lại mã trong Gia đình.';return}
 try{const res=await request('join',{code});joinedFamily=true;const fname=typeof res.familyName==='string'&&res.familyName?res.familyName:'nhà mình';invitationMessage=`Đã tham gia gia đình (${fname}) và tự động đồng bộ! `;invitationField.value='';try{sessionStorage.removeItem('bep-invite-draft');sessionStorage.setItem('bep-joined-family-notice',`Đã tham gia gia đình (${fname}) thành công`)}catch{}}
 catch(error){invitationMessage='Đã tạo/đăng nhập tài khoản, nhưng chưa tham gia được: '+(error instanceof Error?error.message:'Hãy kiểm tra mã mời.');}
}
function changeMode(next:AuthMode):void {
 if(busy)return;mode=next;node('invitation-entry').style.visibility=['login','register'].includes(mode)?'visible':'hidden';
 form.hidden=false;node('recovery').hidden=true;
 node('registration-fields').hidden=mode!=='register';field('name').disabled=mode!=='register';field('email').disabled=mode!=='register';field('name').required=mode==='register';field('email').required=false;
 node('recovery-field').hidden=mode!=='recover';field('recoveryCode').disabled=mode!=='recover';field('recoveryCode').required=mode==='recover';
 const requesting=mode==='request-reset';
 // Visibility reserves geometry: username/password/buttons stay in the same place.
 node('password-field').style.visibility=requesting?'hidden':'visible';
 field('trust').disabled=!['login','register'].includes(mode);field('trust').parentElement!.style.visibility=['login','register'].includes(mode)?'visible':'hidden';field('password').disabled=requesting;field('password').required=!requesting;
 node('username-field').style.visibility=mode==='reset'?'hidden':'visible';field('username').disabled=mode==='reset';
 node('password-label').textContent=['register','reset','recover'].includes(mode)?'Mật khẩu (8–128 ký tự)':'Mật khẩu / Password';
 field('password').minLength=['register','reset','recover'].includes(mode)?8:1;
 field('password').autocomplete=mode==='login'?'current-password':'new-password';
 node('mode-note').hidden=['register','recover'].includes(mode);
 node('mode-note').textContent=requesting?'Nhập tên đăng nhập. Nếu tài khoản có email khôi phục, hướng dẫn đặt lại mật khẩu sẽ được gửi.':mode==='reset'?'Đặt mật khẩu mới. Các phiên đăng nhập cũ sẽ hết hiệu lực khi bạn hoàn tất.':'Mỗi người dùng một tài khoản riêng. Bạn có thể tạo hoặc tham gia gia đình sau khi đăng nhập.';
 node('submit').textContent=mode==='register'?'Tạo tài khoản':requesting?'Gửi email khôi phục':['reset','recover'].includes(mode)?'Đặt mật khẩu mới':'Đăng nhập';
 node('error').textContent='';
 tabs.forEach(tab=>tab.setAttribute('aria-selected',String(tab.dataset.mode===mode)));
}
interface AuthResponse {error?:unknown;recoveryCode?:string;message?:string;familyName?:string;memberName?:string}
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
node('continue').onclick=()=>location.replace(mode==='recover'||mode==='reset'?'/login?locked=1':'/?connect=1'+(joinedFamily?'&joined=1':invitationField.value.trim()?'&join=1':''));
form.addEventListener('submit',async event=>{
 event.preventDefault();if(busy)return;const submittedMode=mode;
 busy=true;const button=node<HTMLButtonElement>('submit');button.disabled=true;tabs.forEach(t=>t.disabled=true);node('error').textContent='';
 try {
  const payload:Record<string,unknown>={};
  if(submittedMode!=='reset')payload.username=field('username').value;
  if(submittedMode!=='request-reset')payload.password=field('password').value;
  if(submittedMode==='register'){payload.name=field('name').value;if(field('email').value.trim())payload.email=field('email').value.trim();}
  if(submittedMode==='recover')payload.recoveryCode=field('recoveryCode').value;
  if(submittedMode==='login'||submittedMode==='register')payload.trust=field('trust').checked;
  if(submittedMode==='reset')payload.token=resetToken;
  const data=await request(submittedMode==='reset'?'complete-reset':submittedMode,payload);
  if(submittedMode==='request-reset'){node('error').textContent=String(data.message||'Nếu tài khoản có email khôi phục, hướng dẫn sẽ được gửi.');return}
  if(submittedMode==='login'||submittedMode==='register')await connectInvitation();
  field('password').value='';field('recoveryCode').value='';try{localStorage.removeItem('bep-local-locked');if(submittedMode==='login'||submittedMode==='register')localStorage.setItem('bep-account-present','yes');else localStorage.removeItem('bep-account-present')}catch{}
  if(typeof data.recoveryCode==='string'){
   form.hidden=true;node('recovery').hidden=false;node('recovery-value').textContent=data.recoveryCode;
   node('result-title').textContent='Lưu mã khôi phục dự phòng';
   node('result-message').textContent=submittedMode==='register'?'Tài khoản đã được tạo. '+invitationMessage+' Hãy lưu mã khôi phục dự phòng này.':'Mật khẩu đã được đổi và các phiên cũ đã bị thu hồi. Lưu mã dự phòng mới; mã trước đã hết hiệu lực.';
   return;
  }
  if(invitationField.value.trim()&&invitationMessage){node('error').textContent=invitationMessage;return}
  const target=new URLSearchParams(location.search).get('return')||'/';
  const destination=target.startsWith('/')&&!target.startsWith('//')&&!target.startsWith('/login')&&!target.startsWith('/.netlify/')?target+location.hash:'/'+location.hash;let next=new URL(destination,location.origin);if(next.origin!==location.origin||next.pathname.startsWith('/login')||next.pathname.startsWith('/.netlify/'))next=new URL('/'+location.hash,location.origin);next.searchParams.set('connect','1');location.replace(next.href);
 } catch(error){node('error').textContent=error instanceof Error?error.message:'Chưa kết nối được. Hãy thử lại khi có mạng.'}
 finally{busy=false;button.disabled=false;tabs.forEach(t=>t.disabled=false)}
});
const parameters=new URLSearchParams(location.search);resetToken=parameters.get('reset')||'';
const incomingInvite=parameters.get('invite');
try{invitationField.value=incomingInvite||sessionStorage.getItem('bep-invite-draft')||'';if(incomingInvite)sessionStorage.setItem('bep-invite-draft',incomingInvite)}catch{invitationField.value=incomingInvite||''}
if(resetToken||incomingInvite)history.replaceState(null,'','/login?locked=1');
changeMode(resetToken?'reset':incomingInvite?'register':'login');
export {};
