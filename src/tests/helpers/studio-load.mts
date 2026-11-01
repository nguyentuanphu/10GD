// Shared synthetic load for the Studio speed benchmark and speed tests. Synthetic data only.
// Records are shaped like the real ones (accounts, sessions, families, family data, events,
// audit, community) but written directly so seeding does not run scrypt 50 times.
import {createHash,randomUUID} from 'node:crypto';
import {createAccountsHandler} from '../../netlify/lib/accounts.mjs';
import {recordEvent,recordSync,recordCronRun,writeAudit} from '../../netlify/lib/studio.mjs';
import {memoryStores} from './accounts.mjs';

const DAY=86400000;
const hash=(x:string)=>createHash('sha256').update(x).digest('hex');

/** Wrap a getStore function: count every blob call per store and optionally add latency. */
export function instrumentedStores(base:any=memoryStores(),{min=0,max=0,scale=1,seed=7}:any={}){
 let s=seed;const rnd=()=>{s=(s*1103515245+12345)%2147483648;return s/2147483648};
 const counts:any={get:0,list:0,set:0,delete:0},byStore:any={};let enabled=true,latency={min,max};
 const wait=()=>{if(!enabled||!latency.max)return null;const ms=(latency.min+rnd()*(latency.max-latency.min))/scale;return new Promise(r=>setTimeout(r,ms))};
 const tally=(name:string,kind:string)=>{if(!enabled)return;counts[kind]++;const b=byStore[name]||(byStore[name]={get:0,list:0,set:0,delete:0});b[kind]++};
 const wrapped=new Map<string,any>();
 const getStoreFn=(opts:any)=>{const name=opts.name;if(wrapped.has(name))return wrapped.get(name);const inner=base(opts);
  const store={
   async get(k:string,o?:any){tally(name,'get');await wait();return inner.get(k,o)},
   async getWithMetadata(k:string,o?:any){tally(name,'get');await wait();return inner.getWithMetadata(k,o)},
   async setJSON(k:string,d:any,o?:any){tally(name,'set');await wait();return inner.setJSON(k,d,o)},
   async set(k:string,d:any,o?:any){tally(name,'set');await wait();return inner.set(k,d,o)},
   async delete(k:string){tally(name,'delete');await wait();return inner.delete(k)},
   async *list(o:any){for await(const page of inner.list(o)){tally(name,'list');await wait();yield page}}};
  wrapped.set(name,store);return store};
 return{getStoreFn,counts,byStore,
  reset(){for(const k of Object.keys(counts))counts[k]=0;for(const k of Object.keys(byStore))delete byStore[k]},
  pause(){enabled=false},resume(){enabled=true},
  setLatency(a:number,b:number){latency={min:a,max:b}}};
}

const people=Array.from({length:49},(_,i)=>'user'+String(i).padStart(2,'0'));
/** Seed: 50 accounts, 20 families, ~200 sessions, 100 push devices, 2,000 events, 200 audit rows, community data. */
export async function seedStudioLoad(getStoreFn:any,{now=Date.now(),password='synthetic-bench-pass-42',events=2000}:any={}){
 const accounts=createAccountsHandler({getStoreFn});
 const reg=await accounts(new Request('https://bench.example/.netlify/functions/accounts?op=register',{method:'POST',headers:{Origin:'https://bench.example','Content-Type':'application/json','x-nf-client-connection-ip':'bench'},body:JSON.stringify({username:'henrynguyen',name:'Henry (synthetic)',password,email:'owner@example.com',trust:true})}));
 if(reg.status!==201)throw new Error('register failed '+reg.status);
 const cookie=reg.headers.get('set-cookie')!.split(';')[0];
 const acc=getStoreFn({name:'bep-accounts'}),data=getStoreFn({name:'bep-family-data'}),community=getStoreFn({name:'bep-community'});
 const pw={salt:'00',key:'00'};
 for(const [i,u] of people.entries()){await acc.setJSON('users/'+u,{username:u,name:'Synthetic '+i,...(i%3===0?{email:u+'@example.com',emailVerifiedAt:new Date(now-DAY).toISOString()}:{}),password:pw,recoveryHash:'x',epoch:'e'+i,createdAt:new Date(now-((i*37)%60)*DAY-i*3600000).toISOString(),...(i===7?{disabled:true}:{})})}
 // ~200 sessions: four per account, some expired, some trusted.
 for(let n=0;n<199;n++){const i=n%people.length,u=people[i],trusted=n%2===0,started=now-((n*7)%40)*DAY-3600000;await acc.setJSON('sessions/'+hash('bench-s'+n),{username:u,epoch:'e'+i,trusted,expires:started+(trusted?30*DAY:8*3600000)})}
 const families:any[]=[];
 for(let f=0;f<20;f++){const id=randomUUID(),members:any={},list=people.slice((f*2)%45,(f*2)%45+2+(f%3));list.forEach((u,j)=>members[u]={role:j===0?'owner':j%2?'editor':'viewer',name:'Synthetic',memberId:j<2?'m-'+j:null,joinedAt:new Date(now-f*DAY).toISOString()});
  const invites:any={};for(let k=0;k<(f%4);k++)invites[hash('inv'+f+'-'+k)]={target:k%2?people[k]:null,role:'editor',expires:now+(k%2?-1:1)*(k+1)*DAY,code:'SECRETCODE'+f+k};
  const fam={id,name:'Gia đình mẫu '+f,createdAt:new Date(now-f*3*DAY).toISOString(),members,invites};families.push(fam);await acc.setJSON('families/'+id,fam);
  const recipes=Array.from({length:40},(_,r)=>({id:'r'+r,name:'Synthetic dish '+r,custom:r<6,ingredients:[{name:'item',qty:null}],steps:['step one','step two']}));
  await data.setJSON(`households/${id}/state`,{version:1,members:[{id:'m-0',name:'A'},{id:'m-1',name:'B'},{id:'m-2',name:'C'}],recipes,weeks:{'2026-W44':{}},pantry:[],receipts:[{id:'x',total:12}],errands:[],preferences:{currency:'AUD'}});
  await data.setJSON(`households/${id}/push/vapid-keys`,{publicKey:'pub',privateKey:'PRIVATEKEY'});
  for(let d=0;d<5;d++)await data.setJSON(`households/${id}/push/subscriptions/dev-${f}-${d}`,{accountUsername:d<2?list[d]:null,deviceId:`dev-${f}-${d}`,memberId:'m-'+d,subscription:{endpoint:(d%2?'https://web.push.apple.com/':'https://fcm.googleapis.com/fcm/send/')+'ENDPOINT'+f+d,keys:{auth:'A',p256dh:'P'}},language:d%2?'en':'vi',types:{urgent:true}});
  for(let a=0;a<3;a++)await data.setJSON(`households/${id}/family-alert/a${a}`,{id:'a'+a,message:'PRIVATE',createdAt:new Date(now-a*DAY).toISOString(),pushStatus:a===2?'not_sent':'sent',targets:['m-1']});
  for(let p=0;p<8;p++)await data.set(`households/${id}/receipt-photo/p${p}`,new Uint8Array(30000+p*1000));
  await recordSync(getStoreFn,id,{bytes:5000},now-f*3600000);
 }
 const types=['push_send','push_send','push_send','push_send','family_state_write','login','invite_created','invite_accepted','cron_reminders','error'];
 for(let e=0;e<events;e++){const t=types[e%types.length],u=people[e%people.length],fam=families[e%families.length].id;await recordEvent(getStoreFn,t,{account:u,family:fam,reason:t==='push_send'?['accepted','quiet_hours','daily_limit'][e%3]:undefined},now-Math.floor((e/events)*29*DAY))}
 for(let a=0;a<200;a++)await writeAudit(getStoreFn,{actor:'henrynguyen',role:'owner',action:a%2?'view_account':'view_family',target:a%2?{type:'account',id:people[a%people.length]}:{type:'family',id:families[a%20].id}},now-a*3600000);
 await recordCronRun(getStoreFn,'reminders',{families:20,jobs:3},now-600000);await recordCronRun(getStoreFn,'price-scout',{items:10},now-3600000);
 // Community: contributors, item shards, points ledgers, product links, shop applications.
 const day=new Date(now).toISOString().slice(0,10);
 for(let c=0;c<40;c++)await community.setJSON('contributors/'+people[c],{account:people[c],trust:0.2+(c%8)/10,banned:c===5,submissions:3+c%5,flags:c%9===0?['shared-ip']:[],createdAt:new Date(now-30*DAY).toISOString()});
 for(let it=0;it<120;it++){const st=it%2?'QLD':'NSW',subs=Array.from({length:3},(_,k)=>({id:`cp-${it}${k}-${hash('s'+it+k).slice(0,10)}`,groupId:'g'+it,itemId:'item-'+it,label:'Item '+it,retailer:'coles',branchId:'b1',branchLabel:'Branch',state:st,price:3+k*0.01,observedAt:day,capturedAt:new Date(now-DAY).toISOString(),submittedAt:new Date(now-DAY).toISOString(),status:k===2&&it%10===0?'held':'accepted',holdReason:k===2&&it%10===0?'too-low':undefined,account:people[(it+k)%40],familyRef:'f'+((it+k)%20),evidence:{type:'shelf-photo'},flags:[],trustAtSubmit:0.6}));
  await community.setJSON(`items/${st}/item-${it}`,{state:st,itemId:'item-'+it,submissions:subs,reports:it%15===0?[{id:'rp'+it,groupId:'g'+it,status:'open',reason:'wrong-price',at:new Date(now-DAY).toISOString()}]:[],hiddenGroups:[]})}
 for(let p=0;p<30;p++)await community.setJSON('points/'+people[p],{account:people[p],state:p%2?'QLD':'NSW',entries:Array.from({length:6},(_,k)=>({id:'e'+p+k,type:'confirmed',points:10,day,state:p%2?'QLD':'NSW',at:new Date(now-k*DAY).toISOString(),capped:true})),nickname:p%3?null:'Nick'+p,showNickname:p%3===0});
 for(let p=0;p<20;p++)await community.setJSON(`products/coles/item-${p}`,{candidates:[{url:'https://www.coles.com.au/product/item-'+p+'-123456',status:p%2?'confirmed':'pending',families:['f1'],at:new Date(now-DAY).toISOString()}]});
 for(let a=0;a<3;a++)await community.setJSON('shops/applications/shop'+a,{username:'shop'+a,shopName:'Shop '+a,status:'pending',appliedAt:new Date(now-a*DAY).toISOString(),state:'NSW'});
 return{cookie,families,people};
}
