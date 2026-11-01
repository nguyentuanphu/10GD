// Seeds synthetic data with real handlers + in-memory stores, serves dist/, screenshots Studio.
import http from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
const W=new URL('../../../../',import.meta.url).pathname.replace(/\/$/,''); // repo root
const {createStudioHandler}=await import(W+'/netlify/functions/studio.mjs');
const {createAccountsHandler}=await import(W+'/netlify/lib/accounts.mjs');
const {createFamilyHandler}=await import(W+'/netlify/functions/family.mjs');
const {memoryStores}=await import(W+'/tests/helpers/accounts.mjs');
const {recordEvent,recordSync,recordCronRun}=await import(W+'/netlify/lib/studio.mjs');
const {chromium}=await import(W+'/node_modules/playwright/index.mjs');
const getStoreFn=memoryStores(),env={STUDIO_ADMINS:'henrynguyen',COMMIT_REF:'8d7a7a7c0ffee',URL:'https://10gd.netlify.app',GROCERY_FEED_URL:'x'};
const mailer={configured:()=>false,async send(){}};
const studio=createStudioHandler({getStoreFn,env,mailer,sendFn:async()=>({}),limits:{all:5000,mutate:500}}),accounts=createAccountsHandler({getStoreFn}),family=createFamilyHandler({getStoreFn});
const DAY=86400000,now=Date.now(),hash=x=>createHash('sha256').update(x).digest('hex');
const acc=getStoreFn({name:'bep-accounts'}),data=getStoreFn({name:'bep-family-data'});
const reg=await accounts(new Request('http://127.0.0.1/.netlify/functions/accounts?op=register',{method:'POST',headers:{Origin:'http://127.0.0.1','Content-Type':'application/json','x-nf-client-connection-ip':'seed'},body:JSON.stringify({username:'henrynguyen',name:'Henry Nguyen',password:'synthetic-owner-pass-42',email:'henry@example.com',trust:true})}));
const henryToken=reg.headers.get('set-cookie').split(';')[0].split('=')[1];
const people=['anh','binh','chi','dung','giang','hoa','khanh','lan','minh','ngoc','phuong','quang','thao','trang','tuan','uyen','vinh','xuan','yen','bao','cuong','duy','hai','linh','mai','nam'];
const pw={salt:'00',key:'00'};
for(const [i,u] of people.entries()){const created=new Date(now-((i*37)%60)*DAY-i*3600000).toISOString();await acc.setJSON('users/'+u,{username:u,name:u[0].toUpperCase()+u.slice(1)+' (synthetic)',...(i%3===0?{email:u+'@example.com'}:{}),password:pw,recoveryHash:'x',epoch:'e'+i,createdAt:created,...(i===7?{disabled:true,disabledAt:new Date(now-2*DAY).toISOString(),disabledReason:'Synthetic test'}:{})});
 const trusted=i%2===0,started=now-((i*5)%35)*DAY-3600000;if(i%4!==3)await acc.setJSON('sessions/'+hash('s'+i),{username:u,epoch:'e'+i,trusted,expires:started+(trusted?30*DAY:8*3600000)})}
const famNames=['Nhà Nguyễn (mẫu)','Gia đình Trần (mẫu)','Lê family (synthetic)','Phạm house (synthetic)','Nhà Võ (mẫu)','Đỗ family (synthetic)','Nhà Bùi (mẫu)','Hoàng family (synthetic)'];
const fams=[];
for(const [i,name] of famNames.entries()){const id=randomUUID(),members={},list=people.slice(i*3,i*3+1+(i%4)+1);list.forEach((u,j)=>members[u]={role:j===0?'owner':j%2?'editor':'viewer',name:u,memberId:'m-'+u});if(i===0)members.henrynguyen={role:'editor',name:'Henry',memberId:'m-henry'};
 const invites={};for(let k=0;k<(i%3);k++)invites[hash('inv'+i+k)]={target:k?null:people[(i+5)%people.length],role:'editor',expires:now+(k?-DAY:3*DAY),code:'SYNT-'+i+k};
 await acc.setJSON('families/'+id,{id,name,createdAt:new Date(now-(50-i*6)*DAY).toISOString(),members,invites});fams.push(id);
 const state={version:1,members:list.map(u=>({id:'m-'+u,name:u})).concat(i===0?[{id:'m-henry',name:'Henry'}]:[]),recipes:Array.from({length:20+i*15},(_,k)=>({id:'r'+k,name:'Synthetic recipe '+k,custom:k%5===0})),weeks:{'2026-10-26':{}},pantry:Array.from({length:i*4},(_, k)=>({id:'p'+k})),preferences:{currency:'AUD',timezone:'Australia/Sydney'},receipts:Array.from({length:i*2},(_,k)=>({id:'x'+k,total:10}))};
 await data.setJSON(`households/${id}/state`,state);if(i%2===0)await data.setJSON(`households/${id}/push/vapid-keys`,{publicKey:'p',privateKey:'k'});
 for(let k=0;k<(i%2===0?i%4+1:0);k++){const hosts=['https://fcm.googleapis.com/fcm/send/abc','https://web.push.apple.com/xyz','https://updates.push.services.mozilla.com/wpush/v2/q','https://wns2.notify.windows.com/w/'];const u=list[k%list.length];await data.setJSON(`households/${id}/push/subscriptions/dev-${i}-${k}`,{accountUsername:u,deviceId:`dev-${i}-${k}`,memberId:'m-'+u,subscription:{endpoint:hosts[(i+k)%4]+'Q'+i+k+'Zx9k2'},language:k%2?'en':'vi',types:{urgent:true,shopping:true}})}
 for(let k=0;k<i%3*2;k++)await data.setJSON(`households/${id}/family-alert/a${k}`,{id:'a'+k,message:'(private)',createdAt:new Date(now-k*DAY).toISOString(),pushStatus:k===1?'not_sent':'accepted',targets:['x']});
 for(let k=0;k<i%3;k++)await data.set(`households/${id}/receipt-photo/ph${k}`,new ArrayBuffer(180000+k*20000));
 await recordSync(getStoreFn,id,{bytes:5000+i*800},now-i*3600000);if(i===2)await recordSync(getStoreFn,id,{conflict:true})}
await data.setJSON(`households/${fams[0]}/push/subscriptions/dev-henry`,{accountUsername:'henrynguyen',deviceId:'dev-henry',memberId:'m-henry',subscription:{endpoint:'https://web.push.apple.com/henryZZ1234'},language:'en',types:{}});
for(let i=0;i<40;i++)await recordEvent(getStoreFn,'push_send',{family:fams[i%8],reason:['accepted','accepted','accepted','no_recipient_or_quiet','daily_limit','delivery_failed'][i%6]},now-i*3*3600000);
for(let i=0;i<6;i++)await recordEvent(getStoreFn,i%2?'invite_accepted':'invite_created',{family:fams[i],account:people[i]},now-i*DAY);
await recordEvent(getStoreFn,'error',{area:'family',op:'state'},now-5*3600000);
for(let i=0;i<4;i++)await recordCronRun(getStoreFn,'reminders',{families:8,jobs:3-i%2,accepted:4-i},now-i*15*60000);
await getStoreFn({name:'bep-studio'}).setJSON('settings/platform',{banner:{vi:'Bảo trì ngắn lúc 22:00 tối nay.',en:'Short maintenance at 22:00 tonight.',severity:'warning',audience:'all',start:null,end:null,id:'b1'},links:{privacy:'',terms:'',supportEmail:'support@example.com'}});

const types={'.html':'text/html;charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.webp':'image/webp'};
const server=http.createServer(async(req,res)=>{const u=new URL(req.url,'http://127.0.0.1:'+server.address().port);
 if(u.pathname.startsWith('/.netlify/functions/')){const chunks=[];for await(const c of req)chunks.push(c);const r=new Request(u,{method:req.method,headers:req.headers,...(chunks.length?{body:Buffer.concat(chunks)}:{})});const h=u.pathname.endsWith('/studio')?studio:family;const out=await h(r);res.writeHead(out.status,Object.fromEntries(out.headers));res.end(Buffer.from(await out.arrayBuffer()));return}
 try{const p=u.pathname==='/'?'/index.html':u.pathname,b=await readFile(W+'/dist'+decodeURIComponent(p));res.writeHead(200,{'Content-Type':types[p.slice(p.lastIndexOf('.'))]||'application/octet-stream'});res.end(b)}catch{res.writeHead(404);res.end('nf')}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const OUT=W+'/docs/reviews/v1.5/studio/';await mkdir(OUT,{recursive:true});
const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1243/chrome-linux64/chrome'});
const sizes={mobile:[375,812],tablet:[820,1100],desktop:[1280,800]},report=[],errors=[];
async function ctx(size,lang,theme,reduced=false){const c=await browser.newContext({viewport:{width:size[0],height:size[1]},reducedMotion:reduced?'reduce':'no-preference',colorScheme:theme});await c.addCookies([{name:'bep_account_session',value:henryToken,url:base}]);await c.addInitScript(([l,t])=>{localStorage.setItem('studio-lang',l);localStorage.setItem('studio-theme',t)},[lang,theme]);const p=await c.newPage();p.on('pageerror',e=>errors.push(String(e)));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});return{c,p}}
const overflow=p=>p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
async function shot(p,name,clip){await p.waitForSelector('#main:not([aria-busy])');await p.waitForTimeout(150);const of=await overflow(p);report.push(`${name}: overflowX=${of}`);await p.screenshot({path:OUT+name+'.jpg',type:'jpeg',quality:72})}
const plan=[['overview',null],['accounts',null],['families','family'],['notifications',null],['settings',null],['health',null]];
const combos=[['mobile','vi','light'],['mobile','en','dark'],['tablet','en','light'],['tablet','vi','dark'],['desktop','en','light'],['desktop','vi','dark']];
for(const [sz,lang,theme] of combos){const {c,p}=await ctx(sizes[sz],lang,theme);
 for(const [page,extra] of plan){if(theme==='dark'&&!['overview','families','settings','health'].includes(page))continue;await p.goto(base+'/studio.html#'+page);await shot(p,`${page}-${sz}-${lang}-${theme}`);
  if(extra==='family'){await p.click('[data-fam]');await p.waitForSelector('#drawer[open] .drawer-body');await p.waitForTimeout(200);report.push(`family-detail-${sz}: overflowX=${await overflow(p)} drawerW=${await p.$eval('#drawer',d=>Math.round(d.getBoundingClientRect().width))}`);await p.screenshot({path:OUT+`family-detail-${sz}-${lang}-${theme}.jpg`,type:"jpeg",quality:72});await p.keyboard.press('Escape')}}
 await c.close()}
// interaction checks: narrow phone nav, keyboard, account drawer, modal, language switch, offline, reduced motion
{const {c,p}=await ctx([320,740],'vi','light',true);await p.goto(base+'/studio.html#accounts');await shot(p,'accounts-narrow-320-vi-light');
 const targets=await p.$$eval('.nav a, .btn, select, input',els=>els.filter(e=>e.offsetParent).map(e=>[Math.round(e.getBoundingClientRect().height),e.className,e.textContent.slice(0,15)]).filter(h=>h[0]<44));report.push('narrow: targets<44px='+JSON.stringify(targets));
 await p.click('[data-acct="anh"]');await p.waitForSelector('#drawer[open]');await p.screenshot({path:OUT+'account-detail-narrow-320-vi-light.jpg',type:'jpeg',quality:72});
 await p.click('#drawer [data-a="account-signout"]');await p.waitForSelector('#ask[open]');await p.screenshot({path:OUT+'confirm-modal-narrow-320-vi-light.jpg',type:'jpeg',quality:72});await p.keyboard.press('Escape');await p.waitForTimeout(100);report.push('modal closes on Esc: '+!(await p.$eval('#ask',d=>d.open)));await p.keyboard.press('Escape');
 await p.click('#lang');await p.waitForSelector('#main:not([aria-busy])');report.push('lang switch -> '+await p.$eval('html',h=>h.lang)+' heading='+await p.$eval('#main h1',h=>h.textContent));
 await c.setOffline(true);await p.evaluate(()=>dispatchEvent(new Event('offline')));report.push('offline label: '+await p.$eval('#net',n=>n.textContent));await c.setOffline(false);
 report.push('reduced-motion toast transition: '+await p.$eval('#toast',t=>getComputedStyle(t).transitionDuration));await c.close()}
{const {c,p}=await ctx(sizes.desktop,'en','light');await p.goto(base+'/studio.html#overview');await p.waitForSelector('#main:not([aria-busy])');await p.focus('#nav a[href="#accounts"]');await p.keyboard.press('Enter');await p.waitForSelector('#main:not([aria-busy]) table');report.push('keyboard nav focus after route: '+await p.evaluate(()=>document.activeElement.tagName+':'+document.activeElement.textContent));
 for(const page of ['invites','messages','broadcast','logs','catalog','rollout']){await p.goto(base+'/studio.html#'+page);await p.waitForSelector('#main:not([aria-busy])');await p.waitForTimeout(page==='catalog'?1500:200);await p.screenshot({path:OUT+`${page}-desktop-en-light.jpg`,type:"jpeg",quality:72});report.push(`${page}: overflowX=${await overflow(p)}`)}
 await p.goto(base+'/studio.html#logs');await p.waitForSelector('#main:not([aria-busy])');await p.click('[data-kind="audit"]');await p.waitForTimeout(300);await p.screenshot({path:OUT+'audit-desktop-en-light.jpg',type:'jpeg',quality:72});await c.close()}
// access-denied + disabled states
{const off=createStudioHandler({getStoreFn,env:{}});const r=await off(new Request(base+'/.netlify/functions/studio?op=me'));report.push('disabled status '+r.status)}
console.log(report.join('\n'));console.log('ERRORS',errors.length,errors.slice(0,5));await browser.close();server.close();
