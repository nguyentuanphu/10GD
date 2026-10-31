import {randomBytes,createHash} from 'node:crypto';
export const digestToken=(token:string):string=>createHash('sha256').update(token).digest('hex');
export interface Mailer {
 configured():boolean;
 send(kind:'reset',email:string,token:string):Promise<void>;
}
export function createAuthMailer({
 apiKeyFn=()=>process.env.RESEND_API_KEY||'',
 fromFn=()=>process.env.AUTH_EMAIL_FROM||'',
 originFn=()=>process.env.AUTH_PUBLIC_URL||'https://10gd.netlify.app',
 fetchFn=fetch,
}={}):Mailer {
 return {
  configured:()=>Boolean(apiKeyFn()&&fromFn()),
  async send(kind,email,token){
   const origin=new URL(originFn());
   if(origin.protocol!=='https:'||origin.username||origin.password)throw Error('Email link origin must be HTTPS');
   const link=new URL('/login',origin);link.searchParams.set('reset',token);link.searchParams.set('locked','1');
   const response=await fetchFn('https://api.resend.com/emails',{
    method:'POST',headers:{Authorization:'Bearer '+apiKeyFn(),'Content-Type':'application/json'},signal:AbortSignal.timeout(10000),
    body:JSON.stringify({from:fromFn(),to:[email],subject:'Đặt lại mật khẩu · Bếp Gia Đình',text:('Bạn vừa yêu cầu đặt lại mật khẩu. Liên kết hết hạn sau 15 phút và chỉ dùng một lần.\nReset your password. This link expires in 15 minutes and can only be used once.')+'\n\n'+link.href+'\n\nNếu bạn không yêu cầu, hãy bỏ qua thư này. Không gửi mật khẩu hoặc mã khôi phục cho người khác.\nIf you did not request this, ignore this email. Never share passwords or recovery codes.'}),
   });
   if(!response.ok)throw Error('Email delivery unavailable');
  },
 };
}
export function validEmail(value:unknown):value is string {
 return typeof value==='string'&&value.length<=254&&/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value)&&!/[\r\n]/.test(value);
}
export function newMailToken(){return randomBytes(32).toString('base64url')}
