type AuthMode = 'login'|'register'|'request-reset'|'reset'|'recover';
const node = <T extends HTMLElement>(id:string):T => {
 const element=document.getElementById(id);if(!element)throw Error('Missing authentication control');return element as T;
};
// v1.7.11 (owner, 7 Nov 2026): the first screen already speaks the right language. Same rule as the app (storage-context.ts):
// a language chosen on this device wins; else a device already in use keeps Vietnamese; else the phone/browser language.
const loginLang:'vi'|'en'=(()=>{try{const ok=(v:any)=>v==='en'||v==='vi',keys:string[]=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k)keys.push(k)}
 const chosen=[...keys.filter(k=>k==='guest/bep-language'),...keys.filter(k=>k!=='guest/bep-language'&&/(^|\/)bep-language$/.test(k))].filter(k=>localStorage.getItem(k+'-auto')!=='1').map(k=>localStorage.getItem(k)).find(ok);if(chosen)return chosen as 'vi'|'en';
 if(keys.some(k=>/(^|\/)bep-gia-dinh-v1$/.test(k)))return 'vi';const guessed=localStorage.getItem('guest/bep-language');if(ok(guessed))return guessed as 'vi'|'en';
 for(const l of (navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language||''])){const b=String(l||'').toLowerCase().slice(0,2);if(b==='vi')return 'vi';if(b==='en')return 'en'}return 'en'}catch{return 'en'}})();
const t=(vi:string,en:string)=>loginLang==='en'?en:vi;
document.documentElement.lang=loginLang;
if(loginLang==='en'){for(const el of document.querySelectorAll<HTMLElement>('[data-en]'))el.textContent=el.dataset.en||el.textContent;for(const el of document.querySelectorAll<HTMLInputElement>('[data-en-ph]'))el.placeholder=el.dataset.enPh||el.placeholder;for(const el of document.querySelectorAll<HTMLElement>('[data-en-label]'))el.setAttribute('aria-label',el.dataset.enLabel||'');const tt=document.querySelector<HTMLElement>('title[data-en]');if(tt)document.title=tt.dataset.en||document.title}
for(const b of document.querySelectorAll<HTMLButtonElement>('[data-set-lang]')){b.setAttribute('aria-pressed',String(b.dataset.setLang===loginLang));b.onclick=()=>{try{localStorage.setItem('guest/bep-language',b.dataset.setLang==='en'?'en':'vi');localStorage.removeItem('guest/bep-language-auto')}catch{}location.reload()}}
/* a new account on a new device keeps the language it was created in (the app would otherwise treat a signed-in family as an
   older Vietnamese one) */
function rememberLoginLanguage(){try{const keys:string[]=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k)keys.push(k)}if(keys.some(k=>/(^|\/)bep-gia-dinh-v1$/.test(k)))return;if(localStorage.getItem('guest/bep-language')&&localStorage.getItem('guest/bep-language-auto')!=='1')return;localStorage.setItem('guest/bep-language',loginLang);localStorage.removeItem('guest/bep-language-auto')}catch{}}

// server messages the sign-in page can show, in English when the page is English (the server answers in Vietnamese)
const SERVER_EN:Record<string,string>={"Kiểm tra tên đăng nhập và mật khẩu.": "Check your username and password.", "Tên đăng nhập hoặc mật khẩu không đúng.": "Wrong username or password.", "Tên đăng nhập không hợp lệ.": "That username is not valid.", "Tên đăng nhập không khả dụng.": "That username is taken.", "Tên hiển thị và mật khẩu từ 8–128 ký tự là bắt buộc.": "A display name and a password of 8–128 characters are needed.", "Tài khoản đang bị khoá.": "This account is locked.", "Tài khoản đang tạm khóa. Liên hệ chủ ứng dụng để được hỗ trợ.": "This account is paused. Contact the app owner for help.", "Tài khoản không hợp lệ.": "That account is not valid.", "Tài khoản chưa có email.": "This account has no email.", "Không tìm thấy tài khoản.": "Account not found.", "Mã mời không đúng.": "That invitation code is wrong.", "Mã mời hết hạn hoặc không dành cho tài khoản này.": "That invitation code has expired or is for another account.", "Đăng ký mới cần mã mời hợp lệ từ người nhà.": "A new account needs a valid invitation code from your family.", "Liên kết đã được thay thế. Yêu cầu đặt lại mật khẩu.": "That link was replaced. Ask to reset your password again.", "Đăng nhập lại.": "Please sign in again.", "Cần đăng nhập tài khoản.": "Please sign in.", "Khôi phục qua email đang tạm ngưng. Vui lòng thử lại sau.": "Email recovery is paused. Please try again later.", "Chưa xử lý được yêu cầu. Thử lại sau.": "That did not work. Please try again later.", "Nếu tài khoản có email khôi phục, yêu cầu khôi phục sẽ được xử lý. Kiểm tra hộp thư và thư rác; nếu chưa nhận được thư, hãy thử lại sau.": "If the account has a recovery email, the request will be handled. Check your inbox and spam; if nothing arrives, try again later.", "Đã đạt số máy tối đa cho tài khoản này.": "This account is on its maximum number of devices.", "Kiểm tra email và mật khẩu hiện tại.": "Check your email and current password."};
const serverText=(m:string)=>loginLang==='en'?(SERVER_EN[m]||m.replace(/^Gia đình đã đủ (\d+) tài khoản\.$/,'The family already has $1 accounts.')):m;
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
 if(!code){invitationMessage=t('Mã mời chưa hợp lệ. Bạn vẫn đã có tài khoản; có thể nhập lại mã trong Gia đình.','That invitation code is not valid. Your account is ready; you can enter the code again under Family.');return}
 try{const res=await request('join',{code});joinedFamily=true;const fname=typeof res.familyName==='string'&&res.familyName?res.familyName:t('nhà mình','your family');invitationMessage=t(`Đã tham gia gia đình (${fname}) và tự động đồng bộ! `,`Joined the family (${fname}); it now syncs by itself. `);invitationField.value='';try{sessionStorage.removeItem('bep-invite-draft');sessionStorage.setItem('bep-joined-family-notice',t(`Đã tham gia gia đình (${fname}) thành công`,`Joined the family (${fname})`))}catch{}}
 catch(error){invitationMessage=t('Đã tạo/đăng nhập tài khoản, nhưng chưa tham gia được: ','You are signed in, but joining the family did not work: ')+(error instanceof Error?serverText(error.message):t('Hãy kiểm tra mã mời.','Please check the invitation code.'));}
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
 node('password-label').textContent=['register','reset','recover'].includes(mode)?t('Mật khẩu (8–128 ký tự)','Password (8–128 characters)'):t('Mật khẩu / Password','Password');
 field('password').minLength=['register','reset','recover'].includes(mode)?8:1;
 field('password').autocomplete=mode==='login'?'current-password':'new-password';
 node('mode-note').hidden=['register','recover'].includes(mode);
 node('mode-note').textContent=requesting?t('Nhập tên đăng nhập. Nếu tài khoản có email khôi phục, hướng dẫn đặt lại mật khẩu sẽ được gửi.','Enter your username. If the account has a recovery email, instructions to reset your password will be sent.'):mode==='reset'?t('Đặt mật khẩu mới. Các phiên đăng nhập cũ sẽ hết hiệu lực khi bạn hoàn tất.','Set a new password. Older sign-ins stop working when you finish.'):t('Mỗi người dùng một tài khoản riêng. Bạn có thể tạo hoặc tham gia gia đình sau khi đăng nhập.','Everyone has their own account. You can create or join a family after signing in.');
 node('submit').textContent=mode==='register'?t('Tạo tài khoản','Create account'):requesting?t('Gửi email khôi phục','Send recovery email'):['reset','recover'].includes(mode)?t('Đặt mật khẩu mới','Set a new password'):t('Đăng nhập','Sign in');
 node('error').textContent='';
 tabs.forEach(tab=>tab.setAttribute('aria-selected',String(tab.dataset.mode===mode)));
}
interface AuthResponse {error?:unknown;recoveryCode?:string;message?:string;familyName?:string;memberName?:string}
async function request(op:string,body:Record<string,unknown>):Promise<AuthResponse> {
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
 try {
  const response=await fetch('/.netlify/functions/accounts?op='+op,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal});
  const data=await response.json() as AuthResponse;
  if(!response.ok)throw Error(typeof data.error==='string'?data.error:t('Chưa xử lý được. Hãy thử lại.','That did not work. Please try again.'));return data;
 } catch(error){if(error instanceof DOMException&&error.name==='AbortError')throw Error(t('Kết nối quá lâu. Vui lòng thử lại khi có mạng.','The connection took too long. Please try again when you are online.'));if(error instanceof SyntaxError)throw Error(t('Chưa kết nối được dịch vụ tài khoản. Vui lòng thử lại.','Could not reach the account service. Please try again.'));throw error}
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
  if(submittedMode==='register'){payload.name=field('name').value;if(field('email').value.trim())payload.email=field('email').value.trim();if(invitationField.value.trim())payload.invite=invitationField.value.trim();}
  if(submittedMode==='recover')payload.recoveryCode=field('recoveryCode').value;
  if(submittedMode==='login'||submittedMode==='register')payload.trust=field('trust').checked;
  if(submittedMode==='reset')payload.token=resetToken;
  const data=await request(submittedMode==='reset'?'complete-reset':submittedMode,payload);
  if(submittedMode==='request-reset'){node('error').textContent=serverText(String(data.message||t('Nếu tài khoản có email khôi phục, hướng dẫn sẽ được gửi.','If the account has a recovery email, instructions will be sent.')));return}
  if(submittedMode==='login'||submittedMode==='register')await connectInvitation();
  if(submittedMode==='register')rememberLoginLanguage();
  field('password').value='';field('recoveryCode').value='';try{localStorage.removeItem('bep-local-locked');if(submittedMode==='login'||submittedMode==='register')localStorage.setItem('bep-account-present','yes');else localStorage.removeItem('bep-account-present')}catch{}
  if(typeof data.recoveryCode==='string'){
   form.hidden=true;node('recovery').hidden=false;node('recovery-value').textContent=data.recoveryCode;
   node('result-title').textContent=t('Lưu mã khôi phục dự phòng','Save your backup recovery code');
   node('result-message').textContent=submittedMode==='register'?t('Tài khoản đã được tạo. ','Your account is ready. ')+invitationMessage+t(' Hãy lưu mã khôi phục dự phòng này.',' Keep this backup recovery code.'):t('Mật khẩu đã được đổi và các phiên cũ đã bị thu hồi. Lưu mã dự phòng mới; mã trước đã hết hiệu lực.','Your password is changed and older sessions are signed out. Save the new backup code; the previous one no longer works.');
   return;
  }
  if(invitationField.value.trim()&&invitationMessage){node('error').textContent=invitationMessage;return}
  const target=new URLSearchParams(location.search).get('return')||'/';
  const destination=target.startsWith('/')&&!target.startsWith('//')&&!target.startsWith('/login')&&!target.startsWith('/.netlify/')?target+location.hash:'/'+location.hash;let next=new URL(destination,location.origin);if(next.origin!==location.origin||next.pathname.startsWith('/login')||next.pathname.startsWith('/.netlify/'))next=new URL('/'+location.hash,location.origin);next.searchParams.set('connect','1');location.replace(next.href);
 } catch(error){node('error').textContent=error instanceof Error?serverText(error.message):t('Chưa kết nối được. Hãy thử lại khi có mạng.','Not connected. Please try again when you are online.')}
 finally{busy=false;button.disabled=false;tabs.forEach(t=>t.disabled=false)}
});
const parameters=new URLSearchParams(location.search);resetToken=parameters.get('reset')||'';
const incomingInvite=parameters.get('invite');
try{invitationField.value=incomingInvite||sessionStorage.getItem('bep-invite-draft')||'';if(incomingInvite)sessionStorage.setItem('bep-invite-draft',incomingInvite)}catch{invitationField.value=incomingInvite||''}
if(resetToken||incomingInvite)history.replaceState(null,'','/login?locked=1');
// ?mode= opens a tab directly (the app's “Create account” and “Change password” links).
const requestedMode=parameters.get('mode');
changeMode(resetToken?'reset':incomingInvite?'register':requestedMode==='register'||requestedMode==='request-reset'||requestedMode==='recover'?requestedMode:'login');
export {};
