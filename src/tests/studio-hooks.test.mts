// Owner-console hooks wired into accounts, family sync, push, reminders and the Price Scout job.
// Real handlers with in-memory stores and synthetic data only.
import assert from 'node:assert/strict';
import {createAccountsHandler,resolveAccount} from '../netlify/lib/accounts.mjs';
import {createFamilyHandler} from '../netlify/functions/family.mjs';
import {runReminders} from '../netlify/functions/reminders.mjs';
import {createGroceryCron} from '../netlify/functions/grocery-cron.mjs';
import {saveSettings,resetSettingsCache,listLog,studioStore} from '../netlify/lib/studio.mjs';
import {memoryStores} from './helpers/accounts.mjs';

const origin='https://test.example',password='synthetic-hooks-passphrase-42';
let ipN=0;
const req=(endpoint:string,op:string,{method='GET',body,cookie='',raw}:any={})=>new Request(`${origin}/.netlify/functions/${endpoint}?${op}`,{method,headers:{Origin:origin,'x-nf-client-connection-ip':'hook-ip-'+(ipN++),...(cookie?{Cookie:cookie}:{}),...(body||raw?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:raw?{body:raw}:{})});
const cookieOf=(r:Response)=>r.headers.get('set-cookie')!.split(';')[0];
const sub=(n:number)=>({endpoint:'https://fcm.googleapis.com/fcm/send/synthetic-'+n,keys:{auth:'A'.repeat(22),p256dh:'B'.repeat(65)}});
const baseState=()=>({version:1,members:[{id:'m-owner',name:'Owner'},{id:'m-two',name:'Two'}],recipes:[{id:'fam-1',name:'Family recipe',custom:true}],weeks:{},pantry:[],preferences:{currency:'AUD'}});

function setup(getStoreFn=memoryStores(),sendFn:any=async()=>({statusCode:201})){
 const accounts=createAccountsHandler({getStoreFn}),family=createFamilyHandler({getStoreFn,pushSend:sendFn});
 const acc=(op:string,body:any,cookie='')=>accounts(req('accounts','op='+op,{method:'POST',body,cookie}));
 const fam=(op:string,o:any={})=>family(req('family','op='+op,o));
 async function register(username:string,extra:any={}){const r=await acc('register',{username,name:username,password,trust:true,...extra});assert.equal(r.status,201,username+' '+r.status);return cookieOf(r)}
 return{getStoreFn,accounts,family,acc,fam,register};
}
const events=async(getStoreFn:any,type:string)=>(await listLog(getStoreFn,'events',{type,limit:200})).items;

// ---- disabled account: blocked at login, existing session rejected everywhere
{
 resetSettingsCache();const {getStoreFn,acc,fam,accounts,register}=setup();
 const cookie=await register('dana');assert.ok(await resolveAccount(new Request(origin,{headers:{cookie}}),getStoreFn));
 const users=getStoreFn({name:'bep-accounts'}),rec=await users.get('users/dana');await users.setJSON('users/dana',{...rec,disabled:true,disabledAt:new Date().toISOString()});
 assert.equal(await resolveAccount(new Request(origin,{headers:{cookie}}),getStoreFn),null,'existing session stops resolving');
 const st=await (await accounts(req('accounts','op=status',{cookie}))).json();assert.equal(st.connected,false);
 assert.equal((await fam('state',{cookie})).status,401,'family data refused for a disabled account');
 const login=await acc('login',{username:'dana',password});assert.equal(login.status,403);const lj=await login.json();
 assert.match(lj.error,/tạm khóa/);assert.match(lj.errorEn,/locked/i);assert.equal(login.headers.get('set-cookie'),null,'no session issued');
 assert.doesNotMatch(JSON.stringify(lj),/netlify|blobs/i);
 const failed=await events(getStoreFn,'login_failed');assert.ok(failed.some((e:any)=>e.data.reason==='disabled'&&e.account==='dana'));
 const wrong=await acc('login',{username:'dana',password:'not-the-password-1'});assert.equal(wrong.status,401);assert.match((await wrong.json()).errorEn,/Incorrect/);
 assert.ok((await events(getStoreFn,'login_failed')).some((e:any)=>e.data.reason==='credentials'));
 console.log('PASS disabled account cannot sign in; existing session rejected; login_failed events');
}

// ---- sign-up policy: open / invite-only / closed
{
 resetSettingsCache();const {getStoreFn,acc,accounts,register}=setup();
 const owner=await register('olivia');assert.equal((await events(getStoreFn,'signup')).length,1,'signup event');
 const household=(await (await acc('create-family',{name:'Nhà thử'},owner)).json()).household;
 await saveSettings(getStoreFn,{signups:'invite-only'});
 let st=await (await accounts(req('accounts','op=status'))).json();assert.equal(st.signup,true);assert.equal(st.signupMode,'invite-only');
 let r=await acc('register',{username:'nocode',name:'No code',password});assert.equal(r.status,403);let j=await r.json();assert.match(j.errorEn,/invitation/);
 r=await acc('register',{username:'badcode',name:'Bad',password,invite:'ZZZZ-ZZZZ'});assert.equal(r.status,403,'unknown invite code refused');
 const targeted=await (await acc('invite',{role:'editor',username:'someoneelse'},owner)).json();
 r=await acc('register',{username:'wrongtarget',name:'Wrong',password,invite:targeted.code});assert.equal(r.status,403,'invite addressed to another username refused');
 const open=await (await acc('invite',{role:'viewer'},owner)).json();
 const invited=await register('invitee',{invite:`${origin}/login?invite=${open.code}`});
 assert.equal((await acc('join',{code:open.code},invited)).status,200,'invited account then joins');
 const ev=await events(getStoreFn,'signup');assert.ok(ev.some((e:any)=>e.account==='invitee'&&e.data.invited===true));
 assert.ok((await events(getStoreFn,'invite_created')).some((e:any)=>e.family===household.id));
 assert.ok((await events(getStoreFn,'invite_accepted')).some((e:any)=>e.account==='invitee'&&e.family===household.id));
 const fam=(await (await accounts(req('accounts','op=members',{cookie:owner}))).json());const invRow=fam.invites[0];
 assert.equal((await acc('revoke-invite',{id:invRow.id},owner)).status,200);assert.equal((await events(getStoreFn,'invite_revoked')).length,1);
 assert.equal((await events(getStoreFn,'family_created')).length,1);
 await saveSettings(getStoreFn,{signups:'closed'});
 st=await (await accounts(req('accounts','op=status'))).json();assert.equal(st.signup,false);assert.equal(st.signupMode,'closed');
 r=await acc('register',{username:'closedout',name:'Closed',password,invite:open.code});assert.equal(r.status,403);assert.match((await r.json()).errorEn,/turned off/);
 await saveSettings(getStoreFn,{signups:'open'});assert.equal((await acc('register',{username:'reopened',name:'Re',password})).status,201);
 assert.ok((await events(getStoreFn,'login')).length===0);assert.equal((await acc('login',{username:'reopened',password})).status,200);assert.equal((await events(getStoreFn,'login')).length,1,'login event');
 console.log('PASS sign-up policy open/invite-only/closed (valid invite required) + status.signup; signup/login/invite events');
}

// ---- limits: families per account, members per family, devices per family
{
 resetSettingsCache();const {getStoreFn,acc,fam,register}=setup();
 const owner=await register('limitowner');
 await saveSettings(getStoreFn,{maxFamiliesPerAccount:1,maxMembersPerFamily:3});
 const household=(await (await acc('create-family',{name:'Một'},owner)).json()).household;
 const second=await acc('create-family',{name:'Hai'},owner);assert.equal(second.status,403);assert.match((await second.json()).errorEn,/maximum of 1 famil/);
 // per-family override beats the platform setting
 await studioStore(getStoreFn).setJSON('family-flags/'+household.id,{limits:{maxMembers:2,maxDevices:1}});
 const code=(await (await acc('invite',{role:'editor'},owner)).json()).code;
 const a=await register('membera'),b=await register('memberb');
 assert.equal((await acc('join',{code},a)).status,200);
 const full=await acc('join',{code},b);assert.equal(full.status,400);const fj=await full.json();assert.match(fj.error,/đủ 2 tài khoản/);assert.match(fj.errorEn,/maximum of 2/);
 // a joined member re-using the code is not counted twice
 assert.equal((await acc('join',{code},a)).status,200);
 // devices
 assert.equal((await fam('state',{method:'PUT',cookie:owner,body:{state:baseState(),etag:null}})).status,200);
 const first=await fam('push-subscribe',{method:'POST',cookie:owner,body:{deviceId:'device-limit-1',memberId:'m-owner',subscription:sub(1)}});assert.equal(first.status,200);
 const over=await fam('push-subscribe',{method:'POST',cookie:owner,body:{deviceId:'device-limit-2',memberId:'m-owner',subscription:sub(2)}});assert.equal(over.status,400);assert.equal((await over.json()).reason,'device_limit');
 assert.equal((await fam('push-subscribe',{method:'POST',cookie:owner,body:{deviceId:'device-limit-1',memberId:'m-owner',subscription:sub(3)}})).status,200,'re-registering the same device is allowed');
 // without any setting the defaults stay 20 members / 50 devices
 await studioStore(getStoreFn).delete('family-flags/'+household.id);await saveSettings(getStoreFn,{maxMembersPerFamily:undefined});
 const s2=memoryStores();resetSettingsCache();const t=setup(s2);const o2=await t.register('defaultowner');const h2=(await (await t.acc('create-family',{name:'Mặc định'},o2)).json()).household;
 const {familyLimits}=await import('../netlify/lib/studio.mjs');const lim=await familyLimits(s2,h2.id,{});assert.equal(lim.maxMembers,20);assert.equal(lim.maxDevices,50);
 console.log('PASS limits: families per account, per-family members (override), per-family devices; defaults 20/50');
}

// ---- suspended family: writes 423, reads still work; sync + push events recorded
{
 resetSettingsCache();const gone:any=Object.assign(new Error('gone'),{statusCode:410});let mode='ok';
 const {getStoreFn,acc,fam,register}=setup(memoryStores(),async()=>{if(mode==='gone')throw gone;return{statusCode:201}});
 const owner=await register('suspowner');const household=(await (await acc('create-family',{name:'Tạm dừng'},owner)).json()).household;
 const put1=await fam('state',{method:'PUT',cookie:owner,body:{state:baseState(),etag:null}});assert.equal(put1.status,200);const etag=(await put1.json()).etag;
 let sync=await studioStore(getStoreFn).get('sync/'+household.id,{type:'json'});assert.equal(sync.writes,1);assert.ok(sync.bytes>0);assert.equal(sync.conflicts,0);
 assert.equal((await fam('state',{method:'PUT',cookie:owner,body:{state:baseState(),etag:'stale-etag'}})).status,409);
 sync=await studioStore(getStoreFn).get('sync/'+household.id,{type:'json'});assert.equal(sync.conflicts,1);assert.ok(sync.lastConflict);
 // push-test: accepted, then expired subscription (410) is counted and removed
 assert.equal((await fam('push-subscribe',{method:'POST',cookie:owner,body:{deviceId:'device-push-1',memberId:'m-owner',subscription:sub(9)}})).status,200);
 const ok=await (await fam('push-test',{method:'POST',cookie:owner,body:{deviceId:'device-push-1'}})).json();assert.equal(ok.accepted,1);assert.equal(ok.expired,0);
 mode='gone';const ex=await (await fam('push-test',{method:'POST',cookie:owner,body:{deviceId:'device-push-1'}})).json();assert.equal(ex.accepted,0);assert.equal(ex.expired,1);
 const sends=await events(getStoreFn,'push_send');assert.equal(sends.length,2);
 assert.ok(sends.some((e:any)=>e.data.reason==='sent'&&e.data.accepted===1&&e.data.type==='test'&&e.family===household.id));
 assert.ok(sends.some((e:any)=>e.data.reason==='expired'&&e.data.expired===1&&e.data.failed===1));
 assert.doesNotMatch(JSON.stringify(sends),/fcm\.googleapis|synthetic-9|AAAAAAAA/,'no endpoint or keys in events');
 // suspend
 await studioStore(getStoreFn).setJSON('family-flags/'+household.id,{suspended:true});
 const blocked=await fam('state',{method:'PUT',cookie:owner,body:{state:baseState(),etag}});assert.equal(blocked.status,423);const bj=await blocked.json();
 assert.equal(bj.error,'Gia đình đang tạm dừng (chỉ xem).');assert.equal(bj.errorEn,'This family is paused (read-only).');
 const read=await fam('state',{cookie:owner});assert.equal(read.status,200);assert.equal((await read.json()).state.recipes[0].name,'Family recipe','family data intact and readable');
 assert.equal((await fam('push-send',{method:'POST',cookie:owner,body:{type:'shopping',title:'x',body:'y',targets:['m-owner'],requestId:'request-123456'}})).status,423);
 assert.equal((await fam('alert-send',{method:'POST',cookie:owner,body:{id:'alert-1234567',message:'x',targets:['m-two']}})).status,423);
 assert.equal((await fam('alerts',{cookie:owner})).status,200,'reading messages still works');
 assert.equal((await acc('invite',{role:'viewer'},owner)).status,423,'no new invites while paused');
 await studioStore(getStoreFn).setJSON('family-flags/'+household.id,{suspended:false});
 assert.equal((await fam('state',{method:'PUT',cookie:owner,body:{state:baseState(),etag}})).status,200,'resumes after unsuspend');
 console.log('PASS suspended family: 423 bilingual on writes, reads work; recordSync on PUT/409; push_send events with expired');
}

// ---- scheduled jobs record their runs
{
 resetSettingsCache();const {getStoreFn,acc,register}=setup();const owner=await register('cronowner');await acc('create-family',{name:'Cron'},owner);
 const summary=await runReminders(getStoreFn,new Date('2026-11-03T01:00:00Z'));assert.equal(summary.families,1);
 const cron=await studioStore(getStoreFn).get('cron/reminders',{type:'json'});assert.equal(cron.result.families,1);assert.equal(cron.at,'2026-11-03T01:00:00.000Z');
 assert.equal((await listLog(getStoreFn,'events',{type:'cron_reminders',now:Date.parse('2026-11-03T02:00:00Z')})).items.length,1);
 const at6=new Date('2026-11-03T19:30:00Z');
 await createGroceryCron({getStoreFn,env:{},now:()=>at6,log:()=>{}})();
 let scout=await studioStore(getStoreFn).get('cron/price-scout',{type:'json'});assert.equal(scout.result.reason,'not-configured');assert.equal(scout.result.imported,false);
 const feed={version:1,states:{NSW:[{itemId:'milk-2l',retailer:'woolworths',price:3.1,unit:'2L',observedAt:'2026-11-03'}]}};
 await createGroceryCron({getStoreFn,env:{GROCERY_FEED_URL:'https://feed.example/p.json'},fetchFn:async()=>new Response(JSON.stringify(feed)),now:()=>at6,log:()=>{}})();
 scout=await studioStore(getStoreFn).get('cron/price-scout',{type:'json'});assert.equal(typeof scout.result.items,'number');assert.equal(typeof scout.result.stores,'number');
 const before=scout.at;await createGroceryCron({getStoreFn,env:{GROCERY_FEED_URL:'https://feed.example/p.json'},now:()=>new Date('2026-11-03T20:30:00Z'),log:()=>{}})();
 assert.equal((await studioStore(getStoreFn).get('cron/price-scout',{type:'json'})).at,before,'outside-window run is not logged');
 console.log('PASS reminders and Price Scout runs recorded for the owner console');
}

// ---- hooks never break the user path when console storage fails
{
 resetSettingsCache();const inner=memoryStores();let studioCalls=0;
 const broken=(o:any)=>{if(o.name==='bep-studio'){studioCalls++;const fail=async()=>{throw new Error('console storage down')};return{get:fail,getWithMetadata:fail,setJSON:fail,set:fail,delete:fail,async *list(){throw new Error('console storage down')}}}return inner(o)};
 const {acc,fam,accounts,register}=setup(broken as any);
 const owner=await register('resilient');
 assert.equal((await (await accounts(req('accounts','op=status',{cookie:owner}))).json()).connected,true);
 assert.equal((await acc('login',{username:'resilient',password})).status,200);
 assert.equal((await acc('login',{username:'resilient',password:'wrong-password-123'})).status,401);
 const household=(await (await acc('create-family',{name:'Bền'},owner)).json()).household;assert.ok(household.id);
 const code=(await (await acc('invite',{role:'editor'},owner)).json()).code;assert.ok(code);
 const other=await register('resilient2');assert.equal((await acc('join',{code},other)).status,200);
 const put=await fam('state',{method:'PUT',cookie:owner,body:{state:baseState(),etag:null}});assert.equal(put.status,200);
 assert.equal((await fam('state',{method:'PUT',cookie:owner,body:{state:baseState(),etag:'old'}})).status,409);
 assert.equal((await fam('push-subscribe',{method:'POST',cookie:owner,body:{deviceId:'device-res-1',memberId:'m-owner',subscription:sub(5)}})).status,200);
 assert.equal((await (await fam('push-test',{method:'POST',cookie:owner,body:{deviceId:'device-res-1'}})).json()).accepted,1);
 const summary=await runReminders(broken as any,new Date());assert.equal(summary.families,1);
 assert.equal((await createGroceryCron({getStoreFn:broken as any,env:{},now:()=>new Date('2026-11-03T19:30:00Z'),log:()=>{}})()).status,200);
 assert.ok(studioCalls>0,'hooks did try the console store');
 console.log('PASS sign-in, sync, push, reminders and Price Scout keep working when console storage throws');
}

// ---- waitUntil: events run after the response when the runtime offers it
{
 resetSettingsCache();const getStoreFn=memoryStores(),accounts=createAccountsHandler({getStoreFn});const pending:Promise<any>[]=[];
 const r=await accounts(req('accounts','op=register',{method:'POST',body:{username:'deferred',name:'Deferred',password}}),{waitUntil:(p:Promise<any>)=>pending.push(p)} as any);
 assert.equal(r.status,201);assert.equal(pending.length,1);await Promise.all(pending);assert.equal((await events(getStoreFn,'signup')).length,1);
 console.log('PASS events use runtime waitUntil when available');
}
console.log('Studio hook tests passed.');
