import assert from 'node:assert/strict';
import {createAccountsHandler,resolveAccount} from '../netlify/lib/accounts.mjs';
import {createFamilyHandler} from '../netlify/functions/family.mjs';
import {createStudioHandler} from '../netlify/functions/studio.mjs';
import {recordEvent,recordSync,recordCronRun,isAccountDisabled,isFamilySuspended,signupPolicy,platformSettings,maskEmail,maskEndpoint,resetSettingsCache} from '../netlify/lib/studio.mjs';
import {memoryStores} from './helpers/accounts.mjs';

const getStoreFn=memoryStores(),origin='https://test.example',password='synthetic-studio-passphrase-42';
const accounts=createAccountsHandler({getStoreFn}),family=createFamilyHandler({getStoreFn});
const sent:any[]=[];const env:any={STUDIO_ADMINS:'HenryNguyen , other',STUDIO_SUPPORT:'sam',COMMIT_REF:'abc123def4567890'};
const mailer={configured:()=>true,async send(kind:string,email:string){sent.push({kind,email})}};
const studio=createStudioHandler({getStoreFn,env,mailer,sendFn:async()=>({statusCode:201}),limits:{all:1000,mutate:1000}});
let ipN=0;
const req=(endpoint:string,op:string,{method='GET',body,cookie='',csrf='',from=origin}:any={})=>new Request(`${origin}/.netlify/functions/${endpoint}?${op}`,{method,headers:{Origin:from,'x-nf-client-connection-ip':'ip-'+(ipN++),...(cookie?{Cookie:cookie}:{}),...(csrf?{'x-studio-csrf':csrf}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
const acc=async(op:string,body:any,cookie='')=>accounts(req('accounts','op='+op,{method:'POST',body,cookie}));
async function register(username:string,email?:string){const r=await acc('register',{username,name:username[0].toUpperCase()+username.slice(1),password,trust:true,...(email?{email}:{})});assert.equal(r.status,201,username);return r.headers.get('set-cookie')!.split(';')[0]}
const S=(op:string,o:any={})=>studio(req('studio','op='+op,o));

// ---- seed synthetic data with real handlers
const henry=await register('henrynguyen','henry.owner@example.com'),alice=await register('alice','alice.private@example.com'),bob=await register('bob'),sam=await register('sam');
const fam=(await (await acc('create-family',{name:'Nhà Synthetic'},alice)).json()).household;
const inv=await (await acc('invite',{role:'editor'},alice)).json();assert.ok(inv.code);
assert.equal((await acc('join',{code:inv.code},bob)).status,200);
const henryFam=(await (await acc('create-family',{name:'Henry test family'},henry)).json()).household;
const state={version:1,members:[{id:'m-alice',name:'Alice'},{id:'m-bob',name:'Bob'}],recipes:[{id:'r1',name:'SECRET FAMILY RECIPE',custom:true},{id:'r2',name:'Phở',custom:false}],weeks:{},pantry:[],preferences:{currency:'AUD'},receipts:[{id:'x',total:12,note:'PRIVATE RECEIPT'}]};
assert.equal((await family(req('family','op=state',{method:'PUT',cookie:alice,body:{state,etag:null}}))).status,200);
const data=getStoreFn({name:'bep-family-data'});
await data.setJSON(`households/${fam.id}/push/vapid-keys`,{publicKey:'pub',privateKey:'PRIVATEKEY'});
await data.setJSON(`households/${henryFam.id}/push/vapid-keys`,{publicKey:'pub',privateKey:'PRIVATEKEY'});
await data.setJSON(`households/${fam.id}/push/subscriptions/device-alice-1`,{accountUsername:'alice',deviceId:'device-alice-1',memberId:'m-alice',subscription:{endpoint:'https://fcm.googleapis.com/fcm/send/SECRETENDPOINTabcdef',keys:{auth:'AUTHSECRET',p256dh:'P256SECRET'}},language:'vi',types:{urgent:true}});
await data.setJSON(`households/${henryFam.id}/push/subscriptions/device-henry-1`,{accountUsername:'henrynguyen',deviceId:'device-henry-1',memberId:null,subscription:{endpoint:'https://web.push.apple.com/HENRYENDPOINT123456',keys:{auth:'a',p256dh:'b'}},language:'en',types:{}});
await data.setJSON(`households/${fam.id}/family-alert/a1`,{id:'a1',message:'PRIVATE ALERT TEXT',createdAt:new Date().toISOString(),pushStatus:'not_sent',targets:['m-bob']});

// ---- access control
const off=createStudioHandler({getStoreFn,env:{}});
const disabled=await off(req('studio','op=me',{cookie:henry}));assert.equal(disabled.status,403);const dj=await disabled.json();assert.equal(dj.disabled,true);assert.match(dj.errorEn,/STUDIO_ADMINS=henrynguyen/);assert.doesNotMatch(dj.error+dj.errorEn,/netlify|blobs/i);
assert.equal((await S('me')).status,401);
const denied=await S('me',{cookie:alice});assert.equal(denied.status,403);
assert.equal((await S('me',{cookie:sam})).status,403,'support needs feature flag');
const me=await (await S('me',{cookie:henry})).json();assert.equal(me.role,'owner');assert.ok(me.csrf);const csrf=me.csrf;
const P=(op:string,body:any,o:any={})=>S(op,{method:'POST',cookie:henry,csrf,body,...o});

// ---- CSRF / Origin
assert.equal((await S('recompute',{method:'POST',cookie:henry,body:{}})).status,403,'missing csrf');
assert.equal((await S('recompute',{method:'POST',cookie:henry,csrf:'x'.repeat(40),body:{}})).status,403,'bad csrf');
assert.equal((await P('recompute',{},{from:'https://evil.example'})).status,403,'cross origin');

// ---- overview & lists with secrets redacted
const ov=await (await P('recompute',{})).json();assert.equal(ov.totals.accounts,4);assert.equal(ov.totals.families,2);assert.equal(ov.totals.pushDevices,2);assert.equal(ov.totals.recipesFamily,1);assert.equal(ov.totals.recipesCatalog,1);assert.equal(ov.signupsDaily.length,30);assert.equal(ov.perFamily,undefined);assert.equal(ov.totals.alertsFailed,1);
const list=await (await S('accounts&q=ali',{cookie:henry})).text();const lj=JSON.parse(list);assert.equal(lj.total,1);assert.equal(lj.rows[0].email,maskEmail('alice.private@example.com'));
const full=await (await S('accounts&sort=username&dir=asc',{cookie:henry})).text();
for(const secret of ['salt','"key"','recoveryHash','epoch','alice.private@example.com','password'])assert.ok(!full.includes(secret),'accounts list leaks '+secret);
assert.deepEqual(JSON.parse(full).rows.map((r:any)=>r.username),['alice','bob','henrynguyen','sam']);
const detail=await (await S('account&username=alice',{cookie:henry})).text();for(const secret of ['SECRETENDPOINT','AUTHSECRET','P256SECRET','alice.private@','sessions/'])assert.ok(!detail.includes(secret),'account detail leaks '+secret);assert.match(detail,/fcm\.googleapis\.com …abcdef/);
const fams=await (await S('families',{cookie:henry})).text();assert.ok(!fams.includes('SECRET FAMILY RECIPE'));assert.equal(JSON.parse(fams).total,2);
const fd=await (await S('family&id='+fam.id,{cookie:henry})).text();for(const secret of [inv.code,'SECRET FAMILY RECIPE','PRIVATE RECEIPT','PRIVATE ALERT','PRIVATEKEY'])assert.ok(!fd.includes(secret),'family detail leaks '+secret);const fdj=JSON.parse(fd);assert.equal(fdj.family.members.length,2);assert.equal(fdj.recipes.family,1);assert.equal(fdj.family.invites.length,1);
const msgs=await (await S('messages',{cookie:henry})).text();assert.ok(!msgs.includes('PRIVATE ALERT'));assert.equal(JSON.parse(msgs).rows[0].failed,1);
const notif=await (await S('notifications',{cookie:henry})).json();assert.equal(notif.total,2);assert.equal(notif.platforms['chrome-android'],1);
const reveal=await (await P('reveal-email',{username:'alice',reason:'support ticket 12'})).json();assert.equal(reveal.email,'alice.private@example.com');

// ---- support view gated behind reason + time limit, summary only
assert.equal((await S('support-view&id='+fam.id,{cookie:henry})).status,403);
assert.equal((await P('support-start',{id:fam.id,reason:'x'})).status,400,'reason required');
assert.equal((await P('support-start',{id:fam.id,reason:'Family reported sync issue',minutes:15})).status,200);
const sv=await (await S('support-view&id='+fam.id,{cookie:henry})).text();assert.ok(!sv.includes('SECRET FAMILY RECIPE')&&!sv.includes('PRIVATE RECEIPT'));assert.equal(JSON.parse(sv).summary.counts.receipts,1);assert.equal(JSON.parse(sv).shape.recipes.items,2);

// ---- disable / enable
const aliceCtx=()=>resolveAccount(new Request(origin,{headers:{Cookie:alice}}),getStoreFn);
assert.ok(await aliceCtx());
assert.equal((await P('account-disable',{username:'alice'})).status,400,'reason required');
assert.equal((await P('account-disable',{username:'henrynguyen',reason:'self'})).status,409);
const dis=await (await P('account-disable',{username:'alice',reason:'abuse report'})).json();assert.equal(dis.revoked,1);
assert.equal(await aliceCtx(),null,'sessions revoked');const aliceRecord=await getStoreFn({name:'bep-accounts'}).get('users/alice');assert.equal(isAccountDisabled(aliceRecord),true);
assert.equal((await (await S('accounts&status=disabled',{cookie:henry})).json()).total,1);
assert.equal((await P('account-enable',{username:'alice',reason:'resolved'})).status,200);assert.equal(isAccountDisabled(await getStoreFn({name:'bep-accounts'}).get('users/alice')),false);

// ---- force sign-out
const bobCtx=()=>resolveAccount(new Request(origin,{headers:{Cookie:bob}}),getStoreFn);assert.ok(await bobCtx());
assert.equal((await P('account-signout',{username:'bob',reason:'lost phone'})).status,200);assert.equal(await bobCtx(),null);

// ---- recovery code + reset link
const rc=await (await P('account-recovery-code',{username:'bob',reason:'user lost code'})).json();assert.ok(rc.recoveryCode);
assert.equal((await acc('recover',{username:'bob',recoveryCode:rc.recoveryCode,password:password+'x'})).status,200,'issued recovery code works with existing recover flow');
assert.equal((await P('account-reset-link',{username:'alice',reason:'forgot password'})).status,200);assert.equal(sent[0].email,'alice.private@example.com');
assert.equal((await P('account-reset-link',{username:'bob',reason:'forgot password'})).status,409,'no email');

// ---- delete account requires password; sole-owner protection
assert.equal((await P('account-delete',{username:'bob',reason:'requested',password:'wrong-password'})).status,401);
const blocked=await P('account-delete',{username:'alice',reason:'requested',password});assert.equal(blocked.status,409);assert.equal((await blocked.json()).blocked[0].name,'Nhà Synthetic');
assert.equal((await P('account-delete',{username:'bob',reason:'requested by user',password})).status,200);
const famRecord=await getStoreFn({name:'bep-accounts'}).get('families/'+fam.id);assert.equal(famRecord.members.bob,undefined);assert.ok(famRecord.members.alice);assert.equal(await getStoreFn({name:'bep-accounts'}).get('users/bob'),null);
const famState=await data.get(`households/${fam.id}/state`);assert.equal(famState.recipes[0].name,'SECRET FAMILY RECIPE','family data preserved');

// ---- invites revoke, limits, suspend, export
const ref=fdj.family.invites[0].ref;assert.equal((await P('invite-revoke',{id:fam.id,ref})).status,200);assert.equal(Object.keys((await getStoreFn({name:'bep-accounts'}).get('families/'+fam.id)).invites).length,0);
assert.equal((await P('family-limits',{id:fam.id,maxMembers:6,maxDevices:10,reason:''})).status,200);
assert.equal((await P('family-suspend',{id:fam.id,reason:'chargeback review'})).status,200);assert.equal(await isFamilySuspended(getStoreFn,fam.id),true);
assert.equal((await P('family-suspend',{id:fam.id,reason:'cleared',suspended:false})).status,200);assert.equal(await isFamilySuspended(getStoreFn,fam.id),false);
assert.equal((await P('family-export',{id:fam.id,reason:'short'})).status,400);
const exp=await P('family-export',{id:fam.id,reason:'Owner requested a backup copy'});assert.match(exp.headers.get('content-disposition')!,/attachment/);const expJ=await exp.json();assert.equal(expJ.state.recipes.length,2);assert.ok(!JSON.stringify(expJ).includes(inv.code));
assert.equal((await P('family-transfer',{id:fam.id,to:'henrynguyen',reason:'not member'})).status,400);

// ---- push test to own device + broadcast dry run
const pt=await (await P('push-test-self',{})).json();assert.equal(pt.accepted,1);
const dry=await (await P('broadcast',{titleVi:'Tiêu đề',titleEn:'Title',vi:'Nội dung',en:'Body'})).json();assert.equal(dry.dryRun,true);assert.equal(dry.devices,1,'only account-linked devices');
assert.equal((await P('broadcast',{titleVi:'T',titleEn:'T',vi:'N',en:'B',dryRun:false,confirm:'no',reason:'launch notice'})).status,400);

// ---- delete family: typed name + password
assert.equal((await P('family-delete',{id:henryFam.id,reason:'test family cleanup',confirmName:'wrong',password})).status,400);
assert.equal((await P('family-delete',{id:henryFam.id,reason:'test family cleanup',confirmName:'Henry test family',password:'nope-nope'})).status,401);
const del=await (await P('family-delete',{id:henryFam.id,reason:'test family cleanup',confirmName:'Henry test family',password})).json();assert.equal(del.deleted,true);
assert.equal(await getStoreFn({name:'bep-accounts'}).get('families/'+henryFam.id),null);assert.ok(await getStoreFn({name:'bep-studio'}).get('trash/families/'+henryFam.id),'recoverable copy kept');

// ---- banner public endpoint + settings env override
assert.equal((await P('banner-save',{banner:{vi:'Bảo trì tối nay',en:'Maintenance tonight',severity:'warning',audience:'all'}})).status,200);
const pub=await studio(new Request(origin+'/.netlify/functions/studio?op=banner'));assert.equal(pub.status,200);assert.match(pub.headers.get('cache-control')!,/public, max-age=60/);const pj=await pub.json();assert.equal(pj.banner.en,'Maintenance tonight');assert.equal(pj.banner.severity,'warning');assert.ok(Array.isArray(pj.priceScoutStates),'public banner tells the app which Price Scout states are on');
const offPub=await off(new Request(origin+'/.netlify/functions/studio?op=banner'));assert.equal(offPub.status,200,'banner works even when studio disabled');
assert.equal((await P('banner-save',{banner:{vi:'x',en:'y',end:new Date(Date.now()-1000).toISOString()}})).status,200);resetSettingsCache();assert.equal((await (await studio(new Request(origin+'/.netlify/functions/studio?op=banner'))).json()).banner,null,'expired banner hidden');
assert.equal((await P('settings-save',{patch:{signups:'invite-only',maxMembersPerFamily:8,flags:{voice:false}}})).status,200);
const envStudio=createStudioHandler({getStoreFn,env:{...env,STUDIO_SIGNUPS:'closed',STUDIO_FLAG_VOICE:'true'},mailer});
const limited=createStudioHandler({getStoreFn,env,mailer,limits:{all:1000,mutate:1}});await limited(req('studio','op=prune',{method:'POST',cookie:henry,csrf,body:{}}));assert.equal((await limited(req('studio','op=prune',{method:'POST',cookie:henry,csrf,body:{}}))).status,429,'mutation rate limit');
const st=await (await envStudio(req('studio','op=settings',{cookie:henry}))).json();assert.equal(st.values.signups,'closed');assert.equal(st.sources.signups,'env');assert.equal(st.values.maxMembersPerFamily,8);assert.equal(st.sources.maxMembersPerFamily,'stored');assert.equal(st.values.flags.voice,true);assert.equal(st.sources['flags.voice'],'env');
assert.equal((await P('settings-save',{patch:{signups:'nope'}})).status,400);
resetSettingsCache();assert.deepEqual(await signupPolicy(getStoreFn,{env:{}}),{allowed:false,reason:'invite-only'});assert.equal((await signupPolicy(getStoreFn,{env:{},invite:{kind:'short'}})).allowed,true);
assert.equal((await platformSettings(getStoreFn,{env:{ALLOW_ACCOUNT_SIGNUP:'false'},fresh:true})).values.signups,'closed');

// ---- support role is read-only once enabled
assert.equal((await P('settings-save',{patch:{flags:{supportRole:true}}})).status,200);resetSettingsCache();
const samMe=await (await S('me',{cookie:sam})).json();assert.equal(samMe.role,'support');
assert.equal((await S('accounts',{cookie:sam})).status,200);assert.equal((await S('audit',{cookie:sam})).status,403);
assert.equal((await S('account-disable',{method:'POST',cookie:sam,csrf:samMe.csrf,body:{username:'alice',reason:'x'.repeat(10)}})).status,403);

// ---- hooks & logs
await recordEvent(getStoreFn,'push_send',{family:fam.id,reason:'accepted',token:'TOKENSECRET',password:'PW'});await recordEvent(getStoreFn,'push_send',{family:fam.id,reason:'daily_limit'});
await recordSync(getStoreFn,fam.id,{bytes:1234});await recordSync(getStoreFn,fam.id,{conflict:true});await recordCronRun(getStoreFn,'reminders',{families:2,jobs:1,accepted:1});
const events=await (await S('events&type=push_send',{cookie:henry})).text();assert.ok(!events.includes('TOKENSECRET')&&!events.includes('"PW"'));assert.equal(JSON.parse(events).items.length,2);
const n2=await (await S('notifications',{cookie:henry})).json();assert.equal(n2.byReason.sent,1);assert.equal(n2.byReason.daily_limit,1);assert.ok(n2.cron.at);
const fd2=await (await S('family&id='+fam.id,{cookie:henry})).json();assert.equal(fd2.health.writes,2,'seed state PUT (hooked) + manual recordSync');assert.equal(fd2.health.conflicts,1);assert.equal(fd2.limits.maxMembers,6);
const health=await (await S('health',{cookie:henry})).json();const byId=Object.fromEntries(health.checks.map((c:any)=>[c.id,c]));assert.equal(byId.storage.status,'green');assert.equal(byId.reminders.status,'green');assert.equal(byId.email.status,'green');assert.equal(byId.release.value.build,'abc123def456');assert.ok(!JSON.stringify(health).match(/netlify|resend/i));
const audit=await (await S('audit&limit=100',{cookie:henry})).json(),actions=new Set(audit.items.map((a:any)=>a.action));
for(const a of ['access_denied','reveal_email','support_view_start','support_view','account_disable','account_enable','account_signout','issue_recovery_code','delete_account','export_family','delete_family','save_banner','save_settings','view_family','view_account','push_test_self','revoke_invite','suspend_family'])assert.ok(actions.has(a),'audit missing '+a);
assert.ok(audit.items.find((a:any)=>a.action==='delete_account'&&a.result==='bad_password'),'failed password attempts audited');
assert.ok(audit.items.every((a:any)=>a.actor&&a.at),'who/when recorded');
const fam2=await (await S('audit&family='+fam.id,{cookie:henry})).json();assert.ok(fam2.items.length>0&&fam2.items.every((a:any)=>a.family===fam.id));
assert.equal(maskEndpoint('https://fcm.googleapis.com/fcm/send/abcdefghijk123456'),'fcm.googleapis.com …123456');
assert.equal((await S('rollout',{cookie:henry})).status,200);
// v1.7.6: "Run now" for online prices. A skipped run (switches off) must not start the 10-minute wait, and the
// switches shown and used are read fresh (the owner pressed Run now right after switching on and got "Ran recently").
{const r1=await P('online-prices-run',{});assert.equal(r1.status,200);assert.equal((await r1.json()).status.skipped,'disabled');
 const r2=await P('online-prices-run',{});assert.equal(r2.status,200,'a skipped run does not block the next one');
 await (await S('settings',{cookie:henry})).json();// warm the 60 s settings cache with the switches off
 const flip=createStudioHandler({getStoreFn,env:{...env,PINCH_API_KEY:'synthetic'},limits:{all:1000,mutate:1000}});
 await getStoreFn({name:'bep-studio'}).setJSON('settings/platform',{...(await getStoreFn({name:'bep-studio'}).get('settings/platform',{type:'json'})||{}),flags:{...((await getStoreFn({name:'bep-studio'}).get('settings/platform',{type:'json'}))?.flags||{}),onlinePinch:true}});
 const st=await (await flip(req('studio','op=online-prices',{cookie:henry}))).json();assert.equal(st.flags.onlinePinch,true,'switches are read fresh, not from the cache');
 await P('settings-save',{patch:{flags:{onlinePinch:false}}});resetSettingsCache()}
console.log('Studio tests passed.');
