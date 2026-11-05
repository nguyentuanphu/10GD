// v1.7.1 floating ladybug feedback (functions/feedback.mts, lib/feedback.mts): who may send per mode and role, the
// Studio tester list (owner-only, CSRF, audited), size and rate limits, offline-queue dedupe by clientId, picture
// validation (JPEG only, metadata stripped), replies vs internal notes, reporter confirm, retention cleanup, and that
// nothing beyond what the reporter wrote plus technical context is stored. Synthetic data, in-memory stores.
import assert from 'node:assert/strict';
import {createAccountsHandler} from '../netlify/lib/accounts.mjs';
import {createStudioHandler} from '../netlify/functions/studio.mjs';
import {createFeedbackHandler} from '../netlify/functions/feedback.mjs';
import {createFeedbackCleanup} from '../netlify/functions/feedback-cleanup.mjs';
import {feedbackStore,stripJpeg,cleanError,cleanShot,FB_LIMITS} from '../netlify/lib/feedback.mjs';
import {listLog,resetSettingsCache} from '../netlify/lib/studio.mjs';
import {memoryStores} from './helpers/accounts.mjs';

const getStoreFn=memoryStores(),origin='https://test.example',password='synthetic-feedback-passphrase-42';
const env:any={STUDIO_ADMINS:'henrynguyen'};resetSettingsCache();
let clock=Date.parse('2026-11-01T10:00:00Z');const nowFn=()=>clock;
const pushes:any[]=[];
const accounts=createAccountsHandler({getStoreFn}),studio=createStudioHandler({getStoreFn,env,limits:{all:1000,mutate:1000}});
const fb=createFeedbackHandler({getStoreFn,env,nowFn,notify:async(u:string,m:any)=>{pushes.push({u,m});return{sent:1}}});
let ip=0;
const req=(endpoint:string,q:string,{method='GET',body,cookie='',device='',headers={},raw}:any={})=>new Request(`${origin}/.netlify/functions/${endpoint}?${q}`,{method,headers:{Origin:origin,'x-nf-client-connection-ip':headers.ip||'u-'+(ip++),...(cookie?{Cookie:cookie}:{}),...(device?{'x-feedback-device':device}:{}),...(body||raw?{'Content-Type':'application/json'}:{}),...headers},...(raw!==undefined?{body:raw}:body?{body:JSON.stringify(body)}:{})});
async function register(username:string){const r=await accounts(req('accounts','op=register',{method:'POST',body:{username,name:'Synthetic '+username,password,trust:true}}));assert.equal(r.status,201);return r.headers.get('set-cookie')!.split(';')[0]}
const call=async(op:string,o:any={})=>{const r=await fb(req('feedback','op='+op,o));let d:any=null;try{d=await r.json()}catch{}return{status:r.status,d}};
const csrfOf=async(cookie:string)=>(await (await studio(req('studio','op=me',{cookie}))).json()).csrf;
const henry=await register('henrynguyen'),tina=await register('tina'),olive=await register('olive');
const H={cookie:henry,headers:{'x-studio-csrf':await csrfOf(henry)}};
const DEV='synthetic-device-token-AAAAAAAAAAAAAAAA',DEV2='synthetic-device-token-BBBBBBBBBBBBBBBB';
let n=0;const report=(extra:any={})=>({clientId:'client-'+String(++n).padStart(14,'0'),type:'bug',note:'Nút Lưu không phản hồi khi sửa món',ctx:{route:'planner',view:'recipe',modal:true,edition:5,build:'20261101T101010Z-abcdef12',platform:'mobile',standalone:true,lang:'vi',theme:'dark',viewport:'375x812',online:true,account:true,clientAt:clock},errors:['TypeError: x is undefined @ app.js:12'],...extra});

// ---------- 1. visibility per mode and role ----------
{const s=(o:any)=>call('access',o);
 assert.equal((await s({cookie:henry})).d.visible,true,'Studio owner sees it (default mode assigned)');
 assert.equal((await s({cookie:henry})).d.mode,'assigned','default mode is assigned');
 assert.equal((await s({cookie:tina})).d.visible,false,'not assigned yet');
 assert.equal((await s({device:DEV})).d.visible,false,'device-only: hidden in assigned mode');
 // tester list: owner-only, CSRF, audited
 assert.equal((await call('studio-tester',{method:'POST',cookie:henry,body:{username:'tina',grant:true}})).status,403,'CSRF required');
 assert.equal((await call('studio-tester',{method:'POST',cookie:tina,headers:{'x-studio-csrf':'x'.repeat(40)},body:{username:'tina',grant:true}})).status,403,'non-owner refused');
 assert.equal((await call('studio-tester',{method:'POST',...H,body:{username:'nobody-here',grant:true}})).status,404,'unknown account');
 const add=await call('studio-tester',{method:'POST',...H,body:{username:'tina',grant:true}});assert.equal(add.status,200);assert.deepEqual(add.d.testers.map((t:any)=>t.username),['tina']);assert.deepEqual(add.d.admins,['henrynguyen']);
 assert.equal((await s({cookie:tina})).d.visible,true,'assigned tester sees it');assert.equal((await s({cookie:tina})).d.role,'tester');
 assert.equal((await s({cookie:olive})).d.visible,false);
 // everyone
 assert.equal((await call('studio-mode',{method:'POST',...H,body:{mode:'nope'}})).status,400);
 assert.equal((await call('studio-mode',{method:'POST',...H,body:{mode:'everyone'}})).status,200);
 assert.equal((await s({cookie:olive})).d.visible,true,'everyone: any account');assert.equal((await s({device:DEV})).d.visible,true,'everyone: device-only');
 // off: only the owner
 await call('studio-mode',{method:'POST',...H,body:{mode:'off'}});
 assert.equal((await s({cookie:tina})).d.visible,false,'off hides testers');assert.equal((await s({device:DEV})).d.visible,false);assert.equal((await s({cookie:henry})).d.visible,true,'owner always');
 const off=await call('submit',{method:'POST',device:DEV,body:report()});assert.equal(off.status,403,'server refuses when off');assert.equal(off.d.code,'not_allowed');
 assert.equal((await call('submit',{method:'POST',cookie:tina,device:DEV,body:report()})).status,403,'tester refused when off');
 await call('studio-mode',{method:'POST',...H,body:{mode:'assigned'}});
 assert.equal((await call('submit',{method:'POST',cookie:olive,device:DEV,body:report()})).status,403,'unassigned account refused');
 assert.equal((await call('submit',{method:'POST',device:DEV,body:report()})).status,403,'device-only refused in assigned');
 const audit=(await listLog(getStoreFn,'audit',{now:clock,limit:100})).items.map((x:any)=>x.action);
 assert.ok(audit.includes('feedback_tester_add')&&audit.includes('feedback_mode'),'tester and mode changes audited');
 console.log('PASS visibility: owner always; tester unless off; everyone mode incl. device-only; server refuses (403); tester list owner-only, CSRF, audited');
}

// ---------- 2. submit, dedupe, privacy of what is stored ----------
let firstId='';
{const body=report();const a=await call('submit',{method:'POST',cookie:tina,device:DEV,body});assert.equal(a.status,201);firstId=a.d.id;
 const again=await call('submit',{method:'POST',cookie:tina,device:DEV,body});assert.equal(again.status,200,'same queued report again');assert.equal(again.d.id,firstId);assert.equal(again.d.duplicate,true);
 const keys:string[]=[];for await(const p of feedbackStore(getStoreFn).list({prefix:'r/',paginate:true}))for(const b of p.blobs)keys.push(b.key);assert.equal(keys.length,1,'stored once');
 const rec=await feedbackStore(getStoreFn).get('r/'+firstId,{type:'json'});
 assert.deepEqual(Object.keys(rec).sort(),['at','ctx','errors','hasShot','history','id','note','notes','replies','reporter','reporterSeen','status','type','updatedAt'].sort(),'only whitelisted fields');
 assert.deepEqual(Object.keys(rec.reporter).sort(),['account','key','role']);assert.equal(rec.reporter.account,'tina');
 const flat=JSON.stringify(rec);for(const bad of ['Synthetic tina','u-','x-nf','ip','email','household'])assert.ok(!flat.includes('"'+bad)&&!flat.includes(bad+'"'),'no '+bad);
 assert.ok(!/u-\d+/.test(flat),'no network address');
 // unknown fields are dropped; bad context values are cleaned
 const b2=await call('submit',{method:'POST',cookie:tina,device:DEV,body:report({email:'a@b.c',family:'x',ctx:{route:'<script>',viewport:'9x9x9',lang:'fr',build:'evil',clientAt:0},errors:['Failed for lan.nguyen@example.com id 1234567 "Phở bò của mẹ" at https://x.test/a?token=secret']})});assert.equal(b2.status,201);
 const r2=await feedbackStore(getStoreFn).get('r/'+b2.d.id,{type:'json'});assert.equal(r2.ctx.route,'');assert.equal(r2.ctx.viewport,null);assert.equal(r2.ctx.lang,'vi');assert.equal(r2.ctx.build,null);assert.equal(r2.ctx.clientAt,null);assert.ok(!('email' in r2)&&!('family' in r2));
 assert.ok(!/lan\.nguyen|1234567|Phở|token=secret/.test(r2.errors[0]),'error lines lose personal data: '+r2.errors[0]);
 // invalid input
 assert.equal((await call('submit',{method:'POST',cookie:tina,device:DEV,body:report({note:'a'})})).status,400,'note too short');
 assert.equal((await call('submit',{method:'POST',cookie:tina,device:DEV,body:report({type:'rant'})})).status,400,'unknown type');
 assert.equal((await call('submit',{method:'POST',cookie:tina,device:DEV,body:report({clientId:'x'})})).status,400,'clientId required');
 assert.equal((await call('submit',{method:'POST',cookie:tina,device:DEV,raw:'{"x":'+'"a"'.padEnd(FB_LIMITS.bytes+10,' ')+'}'})).status,413,'size limit');
 assert.equal((await call('submit',{method:'POST',cookie:tina,device:DEV,body:report({shot:'data:image/png;base64,iVBORw0KGgo='})})).status,400,'only JPEG pictures');
 assert.equal((await call('submit',{method:'POST',cookie:tina,device:DEV,headers:{Origin:'https://evil.example'},body:report()})).status,403,'same origin');
 assert.equal((await call('submit',{method:'POST',body:report()})).status,403,'no account, no device: not allowed in assigned');
 console.log('PASS submit: stored once per clientId (offline queue dedupe), whitelisted fields only, no IP/email/family/name, error lines scrubbed, invalid/oversized refused');
}

// ---------- 3. pictures: JPEG only, metadata stripped, dimensions limited ----------
{const seg=(m:number,payload:Buffer)=>Buffer.concat([Buffer.from([0xFF,m,(payload.length+2)>>8,(payload.length+2)&255]),payload]);
 const jpeg=(w:number,h:number)=>Buffer.concat([Buffer.from([0xFF,0xD8]),seg(0xE0,Buffer.from('JFIF\0\x01\x01\0\0\x01\0\x01\0\0','binary')),seg(0xE1,Buffer.from('Exif\0\0GPS -33.8688,151.2093 SECRET-CAMERA','binary')),seg(0xFE,Buffer.from('comment: owner phone','binary')),seg(0xDB,Buffer.alloc(65,1)),seg(0xC0,Buffer.from([8,h>>8,h&255,w>>8,w&255,1,1,0x11,0])),seg(0xDA,Buffer.from([1,1,0,0,63,0])),Buffer.alloc(40,0x55),Buffer.from([0xFF,0xD9])]);
 const clean=stripJpeg(jpeg(10,10))!;assert.ok(clean,'valid JPEG accepted');const s=clean.toString('binary');assert.ok(!s.includes('GPS')&&!s.includes('SECRET')&&!s.includes('comment'),'EXIF/comment removed');assert.ok(s.includes('JFIF'));
 assert.equal(stripJpeg(jpeg(5000,10)),null,'too large dimensions');assert.equal(stripJpeg(Buffer.from('not a jpeg at all, just text............')),null);
 assert.equal(cleanShot('data:image/jpeg;base64,'+Buffer.alloc(FB_LIMITS.shotBytes+10,1).toString('base64')),null,'too many bytes');
 const ok=await call('submit',{method:'POST',cookie:tina,device:DEV,body:report({shot:'data:image/jpeg;base64,'+jpeg(320,200).toString('base64')})});assert.equal(ok.status,201);
 const stored=(await feedbackStore(getStoreFn).get('shot/'+ok.d.id,{type:'json'})).data;assert.ok(stored.startsWith('data:image/jpeg;base64,'));assert.ok(!Buffer.from(stored.split(',')[1],'base64').toString('binary').includes('SECRET'),'stored picture has no metadata');
 const view=await call('studio-shot&id='+ok.d.id,{cookie:henry});assert.equal(view.status,200);assert.equal(view.d.shot,stored);
 assert.equal((await call('studio-shot&id='+ok.d.id,{cookie:tina})).status,403,'pictures are owner-only');
 assert.match(cleanError('Bad thing for "Mẹ Lan" in 99999999'),/"…"/);
 console.log('PASS pictures: JPEG only, EXIF/GPS/comments stripped server side, size and dimension limits, owner-only viewing');
}

// ---------- 4. rate limits ----------
{let minute=0;
 for(let i=0;i<FB_LIMITS.perReporterMinute+2;i++){const r=await call('submit',{method:'POST',cookie:olive,device:DEV2,body:report()});if(r.status===403)break;if(r.status===429){minute=i;break}}
 // olive is not assigned: add her, then flood
 await call('studio-tester',{method:'POST',...H,body:{username:'olive',grant:true}});
 const codes:number[]=[];for(let i=0;i<FB_LIMITS.perReporterMinute+1;i++)codes.push((await call('submit',{method:'POST',cookie:olive,device:DEV2,body:report()})).status);
 assert.deepEqual(codes,[...Array(FB_LIMITS.perReporterMinute).fill(201),429],'per-minute limit: '+codes.join(','));
 let daily=0;for(let i=0;i<FB_LIMITS.perReporterDay+2;i++){clock+=61000;const r=await call('submit',{method:'POST',cookie:olive,device:DEV2,body:report()});if(r.status===201)daily++;else{assert.equal(r.status,429);break}}
 assert.equal(daily+FB_LIMITS.perReporterMinute,FB_LIMITS.perReporterDay,'per-day limit per reporter');
 assert.equal(minute,0);
 // the same network address is limited too (many device tokens, everyone mode)
 await call('studio-mode',{method:'POST',...H,body:{mode:'everyone'}});let ipCodes:number[]=[];
 for(let i=0;i<FB_LIMITS.perIpDay+1;i++){clock+=61000;ipCodes.push((await call('submit',{method:'POST',device:'synthetic-flood-device-'+String(i).padStart(10,'0'),headers:{ip:'203.0.113.9'},body:report()})).status)}
 assert.equal(ipCodes.filter(c=>c===201).length,FB_LIMITS.perIpDay);assert.equal(ipCodes.at(-1),429,'per-address daily limit');
 await call('studio-mode',{method:'POST',...H,body:{mode:'assigned'}});
 console.log('PASS rate limits: per reporter per minute and per day, per network address per day');
}

// ---------- 5. Studio workflow: status, internal notes, replies; reporter sees replies only; audited ----------
{clock+=3600000;const before=(await listLog(getStoreFn,'audit',{now:clock,limit:100})).items.length;
 const inbox=await call('studio-inbox&status=open&reporter=tina',{cookie:henry});assert.equal(inbox.status,200);assert.ok(inbox.d.rows.some((r:any)=>r.id===firstId));assert.ok(inbox.d.rows.every((r:any)=>r.reporter==='tina'&&r.tester));assert.ok(inbox.d.routes.includes('planner'));
 assert.equal((await call('studio-inbox',{cookie:tina})).status,403,'inbox owner-only');
 // v1.7.5 “Sao chép cho dev”: open reports with text, context and errors, never the reporter; audited; Studio roles only
 const ex=await call('studio-export',{cookie:henry});assert.equal(ex.status,200);const it=ex.d.items.find((r:any)=>r.id===firstId);assert.ok(it,'open report exported');assert.equal(it.note,'Nút Lưu không phản hồi khi sửa món');assert.equal(it.ctx.route,'planner');
 assert.ok(!JSON.stringify(ex.d).includes('tina')&&ex.d.items.every((r:any)=>!('reporter' in r)&&!('notes' in r)&&!('replies' in r)),'no reporter, notes or replies in the export');
 assert.equal((await call('studio-export',{cookie:tina})).status,403,'export is Studio-only');
 assert.equal((await call('studio-inbox&type=idea',{cookie:henry})).d.rows.length,0,'type filter');
 const det=await call('studio-detail&id='+firstId,{cookie:henry});assert.equal(det.status,200);assert.equal(det.d.note,'Nút Lưu không phản hồi khi sửa món');assert.equal(det.d.reporter.tester,true);assert.ok(!('key' in det.d.reporter),'device key never leaves the server');
 assert.equal((await call('studio-update',{method:'POST',cookie:henry,body:{id:firstId,status:'triaged'}})).status,403,'CSRF on updates');
 assert.equal((await call('studio-update',{method:'POST',...H,body:{id:firstId,status:'bogus'}})).status,400);
 let u=await call('studio-update',{method:'POST',...H,body:{id:firstId,status:'triaged',note:'Repro on iPhone 13 only (internal)'}});assert.equal(u.status,200);assert.equal(u.d.status,'triaged');assert.equal(u.d.notes.length,1);
 pushes.length=0;u=await call('studio-update',{method:'POST',...H,body:{id:firstId,reply:'Cảm ơn bạn! Đã tìm ra lỗi.'}});assert.equal(u.d.replies.length,1);assert.deepEqual(pushes.map(p=>p.u),['tina'],'reporter account told by push');assert.ok(!JSON.stringify(pushes).includes('Đã tìm ra'),'push carries no reply text');
 let m=await call('mine',{cookie:tina,device:DEV});const item=m.d.items.find((x:any)=>x.id===firstId);assert.equal(item.replies.length,1);assert.equal(item.replies[0].text,'Cảm ơn bạn! Đã tìm ra lỗi.');assert.ok(!JSON.stringify(m.d).includes('internal'),'internal notes never reach the reporter');assert.ok(!('by' in item.replies[0]),'replies do not name the Studio account');
 assert.equal(item.unread,1);assert.ok(m.d.unread>=1);assert.ok((await call('access',{cookie:tina})).d.unread>=1,'badge count');
 await call('seen',{method:'POST',cookie:tina,device:DEV,body:{ids:[firstId]}});m=await call('mine',{cookie:tina,device:DEV});assert.equal(m.d.items.find((x:any)=>x.id===firstId).unread,0,'reply marked read');
 assert.equal((await call('mine',{cookie:olive,device:DEV2})).d.items.some((x:any)=>x.id===firstId),false,'others never see it');
 // fixed → reporter confirms (SV "Yes, fixed / Still wrong")
 await call('studio-update',{method:'POST',...H,body:{id:firstId,status:'fixed'}});m=await call('mine',{cookie:tina,device:DEV});assert.equal(m.d.items.find((x:any)=>x.id===firstId).canConfirm,true);
 assert.equal((await call('confirm',{method:'POST',cookie:olive,device:DEV2,body:{id:firstId,fixed:true}})).status,404,'only the reporter confirms');
 const c=await call('confirm',{method:'POST',cookie:tina,device:DEV,body:{id:firstId,fixed:false}});assert.equal(c.d.status,'back');
 await call('studio-update',{method:'POST',...H,body:{id:firstId,status:'fixed'}});assert.equal((await call('confirm',{method:'POST',cookie:tina,device:DEV,body:{id:firstId,fixed:true}})).d.status,'closed');
 const hist=(await call('studio-detail&id='+firstId,{cookie:henry})).d.history.map((h:any)=>h.action);assert.deepEqual(hist,['created','status','note','reply','status','still_wrong','status','confirmed_fixed']);
 const after=(await listLog(getStoreFn,'audit',{now:clock,limit:100})).items.filter((x:any)=>x.target?.type==='feedback').map((x:any)=>x.action);
 assert.ok(after.filter(a=>a==='feedback_update').length>=4&&after.includes('feedback_view'),'every change and view audited');assert.ok((await listLog(getStoreFn,'audit',{now:clock,limit:100})).items.length>before);
 console.log('PASS Studio workflow: filters, owner-only detail, status new→triaged→fixed→back→fixed→closed, internal notes hidden from reporter, reply + badge + read, push without text, audit for every change');
}

// ---------- 6. new feedback tells the Studio owner (no text on the lock screen) ----------
{pushes.length=0;await call('submit',{method:'POST',cookie:tina,device:DEV,body:report({type:'idea',note:'Thêm chế độ ăn chay cho cả tuần'})});assert.deepEqual(pushes.map(p=>p.u),['henrynguyen']);assert.match(pushes[0].m.body,/Ý tưởng · #planner/);assert.ok(!JSON.stringify(pushes).includes('ăn chay'));
 pushes.length=0;await call('submit',{method:'POST',cookie:henry,device:DEV,body:report()});assert.equal(pushes.length,0,'not for your own feedback');
 console.log('PASS owner push on new feedback: kind and page only');
}

// ---------- 7. device-only reporter (everyone mode) keeps its own list by device token ----------
{await call('studio-mode',{method:'POST',...H,body:{mode:'everyone'}});const r=await call('submit',{method:'POST',device:DEV2,body:report({note:'Chữ bị cắt trên điện thoại'})});assert.equal(r.status,201);
 assert.equal((await call('mine',{device:DEV2})).d.items[0].id,r.d.id);assert.equal((await call('mine',{device:DEV})).d.items.some((x:any)=>x.id===r.d.id),false,'another device does not see it');
 const rec=await feedbackStore(getStoreFn).get('r/'+r.d.id,{type:'json'});assert.equal(rec.reporter.account,null);assert.ok(!JSON.stringify(rec).includes(DEV2),'raw device token is never stored');
 assert.equal((await call('mine',{})).status,400);
 console.log('PASS device-only: anonymous reporter key (hash), own list only');
}

// ---------- 8. retention: older than 13 months removed with pictures and receipts; counters pruned ----------
{const S=feedbackStore(getStoreFn);const old=new Date(clock-(FB_LIMITS.keepDays+2)*86400000).toISOString();
 await S.setJSON('r/aaaaaaaaaaaaaaaaaa',{id:'aaaaaaaaaaaaaaaaaa',at:old,type:'bug',note:'old',status:'closed',reporter:{key:'a-x'}});await S.setJSON('shot/aaaaaaaaaaaaaaaaaa',{data:'x'});await S.setJSON('shot/bbbbbbbbbbbbbbbbbb',{data:'orphan'});
 await S.setJSON('receipt/a-x/old-client-000000000',{id:'aaaaaaaaaaaaaaaaaa',at:clock-40*86400000});await S.setJSON('rate/d/2020-01-01/a-x',{count:3});
 const cleanup=createFeedbackCleanup({getStoreFn,now:()=>clock});const res=await (await cleanup()).json();assert.ok(res.removed>=4,'removed '+res.removed);
 assert.equal(await S.get('r/aaaaaaaaaaaaaaaaaa'),null);assert.equal(await S.get('shot/aaaaaaaaaaaaaaaaaa'),null);assert.equal(await S.get('shot/bbbbbbbbbbbbbbbbbb'),null);assert.equal(await S.get('receipt/a-x/old-client-000000000'),null);assert.equal(await S.get('rate/d/2020-01-01/a-x'),null);
 assert.ok(await S.get('r/'+firstId),'recent kept');
 const cron=await getStoreFn({name:'bep-studio'}).get('cron/feedback-cleanup',{type:'json'});assert.ok(cron?.at,'cleanup run recorded');
 console.log('PASS retention: 13-month cleanup of reports, pictures, receipts and counters');
}
// ---------- v1.7.6: reports filed as issues in a PRIVATE GitHub repository ----------
{const {issueFor,githubConfig,resetGithubPrivacyCache}=await import('../netlify/lib/feedback-github.mjs');
 const calls:any[]=[];let issueNo=40;
 const fetchFn=async(url:string,init:any={})=>{calls.push({url,method:init.method||'GET',auth:init.headers?.Authorization,body:init.body?JSON.parse(init.body):null});
  if(/\/issues$/.test(url))return new Response(JSON.stringify({number:++issueNo,html_url:'https://github.com/qa-owner/famtray-feedback/issues/'+issueNo}),{status:201});
  return new Response('{}',{status:404})};
 const ghEnv={...env,FEEDBACK_GITHUB_REPO:'qa-owner/famtray-feedback',FEEDBACK_GITHUB_TOKEN:'synthetic-token-'+'x'.repeat(24)};
 assert.equal(githubConfig(env),null,'off unless the token is set');assert.equal(githubConfig({FEEDBACK_GITHUB_REPO:'not a repo',FEEDBACK_GITHUB_TOKEN:'x'.repeat(30)}),null);
 const fb2=createFeedbackHandler({getStoreFn,env:ghEnv,nowFn,notify:async()=>({sent:1}),fetchFn});
 const call2=async(op:string,o:any={})=>{const r=await fb2(req('feedback','op='+op,o));let d:any=null;try{d=await r.json()}catch{}return{status:r.status,d}};
 resetGithubPrivacyCache();clock+=3600000;
 const sent=await call2('submit',{method:'POST',cookie:henry,body:report({note:'Ô ngày và bữa đè lên nhau'})});assert.equal(sent.status,201);
 const issue=calls.find(c=>/\/issues$/.test(c.url));assert.ok(issue,'a new report is filed as an issue');assert.equal(issue.url,'https://api.github.com/repos/qa-owner/famtray-feedback/issues');
 assert.match(issue.auth,/^Bearer synthetic-token-/);assert.match(issue.body.title,/^\[bug\] Ô ngày và bữa đè lên nhau/);assert.match(issue.body.body,/> Ô ngày và bữa đè lên nhau/);assert.match(issue.body.body,/route=planner/);
 assert.doesNotMatch(JSON.stringify(issue.body),/henrynguyen|synthetic-device|u-\d|[\w.]+@[\w-]+\./,'no account, device key, IP or e-mail in the issue');assert.deepEqual(issue.body.labels,['feedback','bug']);
 const det=await call2('studio-detail&id='+sent.d.id,{cookie:henry});assert.equal(det.d.github.number,issueNo,'issue number kept on the report for Studio');
 // owner decision: the app repository by default (no repository setting needed)
 assert.equal(githubConfig({FEEDBACK_GITHUB_TOKEN:'synthetic-token-'+'x'.repeat(24)})!.repo,'nguyentuanphu/10GD','default repository is the app repository');
 // Studio: file the open reports that have no issue yet (owner only, CSRF)
 calls.length=0;
 assert.equal((await call2('studio-github',{method:'POST',cookie:henry,body:{}})).status,403,'CSRF required');
 let total=0;for(let i=0;i<20;i++){const sync=await call2('studio-github',{method:'POST',...H,body:{}});assert.equal(sync.status,200);assert.equal(sync.d.failed,0);assert.ok(sync.d.filed<=20,'at most 20 per press');total+=sync.d.filed;if(sync.d.filed<20)break}
 assert.ok(total>=1,'older open reports filed');const again=await call2('studio-github',{method:'POST',...H,body:{}});assert.equal(again.d.filed,0,'nothing left to file');
 const ids=calls.filter(c=>/\/issues$/.test(c.url)).map(c=>/feedback `([a-f0-9]{18})`/.exec(c.body.body)?.[1]);assert.equal(new Set(ids).size,ids.length,'no report filed twice');
 assert.equal((await call('studio-github',{method:'POST',...H,body:{}})).status,400,'not configured → clear message');
 console.log('PASS GitHub feed: new reports filed as GitHub issues (no personal identifiers), default repository 10GD, Studio files older open reports once');
}
console.log('feedback: all passed');
