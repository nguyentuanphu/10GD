// Postcode → state resolution for Price Scout. Mirrored client-side in
// src/frontend/shopping-optimizer.ts (PriceScout.postcodeState); keep in sync.
// NSW 1000–1999, 2000–2599, 2619–2899, 2921–2999; QLD 4000–4999, 9000–9999.
// ACT ranges (0200–0299, 2600–2618, 2900–2920) are NOT NSW.
export const SUPPORTED_STATES=['NSW','QLD'];
export const UNSUPPORTED_MESSAGE={vi:'Rất tiếc! Khu vực của bạn hiện chưa được hỗ trợ. Hệ thống hiện chỉ tối ưu giá cho NSW và QLD. Chúng tôi sẽ sớm mở rộng sang các khu vực khác!',en:'Sorry! Your area isn’t supported yet. Price compare currently optimises prices for NSW and QLD only. We’ll expand to other areas soon!'};
export function postcodeToState(input){
 const s=String(input??'').trim();
 if(!/^\d{4}$/.test(s))return{valid:false,postcode:null,state:null,supported:false};
 const n=+s;let state=null;
 if(n>=1000&&n<=1999||n>=2000&&n<=2599||n>=2619&&n<=2899||n>=2921&&n<=2999)state='NSW';
 else if(n>=200&&n<=299||n>=2600&&n<=2618||n>=2900&&n<=2920)state='ACT';
 else if(n>=4000&&n<=4999||n>=9000&&n<=9999)state='QLD';
 else if(n>=3000&&n<=3999||n>=8000&&n<=8999)state='VIC';
 else if(n>=5000&&n<=5999)state='SA';
 else if(n>=6000&&n<=6999)state='WA';
 else if(n>=7000&&n<=7999)state='TAS';
 else if(n>=800&&n<=999)state='NT';
 if(!state)return{valid:false,postcode:s,state:null,supported:false};
 const supported=SUPPORTED_STATES.includes(state);
 return{valid:true,postcode:s,state,supported,message:supported?null:UNSUPPORTED_MESSAGE};
}
export const supportedState=s=>SUPPORTED_STATES.includes(s);
