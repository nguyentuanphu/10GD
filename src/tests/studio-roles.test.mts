// v1.7.5 owner request (5 Nov 2026): assign Studio admins and their level inside Studio. Owner (STUDIO_ADMINS) is the
// only level that assigns roles; admin manages everything except roles, deleting/transferring accounts or families and
// the forced-update build; moderator handles community and bug reports only; support is read-only. Real handlers,
// in-memory stores, synthetic accounts.
import assert from 'node:assert/strict';
import {createAccountsHandler} from '../netlify/lib/accounts.mjs';
import {createStudioHandler} from '../netlify/functions/studio.mjs';
import {roleFor,studioCan,sanitizeStudioRoles,resetSettingsCache} from '../netlify/lib/studio.mjs';
import {memoryStores} from './helpers/accounts.mjs';

const getStoreFn=memoryStores(),origin='https://test.example',password='synthetic-roles-passphrase-42';
const accounts=createAccountsHandler({getStoreFn});
const env:any={STUDIO_ADMINS:'henrynguyen',STUDIO_SUPPORT:''};
const studio=createStudioHandler({getStoreFn,env,mailer:{configured:()=>false,async send(){}},sendFn:async()=>({statusCode:201}),limits:{all:1000,mutate:1000}});
let ipN=0;
const req=(endpoint:string,op:string,{method='GET',body,cookie='',csrf=''}:any={})=>new Request(`${origin}/.netlify/functions/${endpoint}?${op}`,{method,headers:{Origin:origin,'x-nf-client-connection-ip':'ip-'+(ipN++),...(cookie?{Cookie:cookie}:{}),...(csrf?{'x-studio-csrf':csrf}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
async function register(username:string){const r=await accounts(req('accounts','op=register',{method:'POST',body:{username,name:username,password,trust:true}}));assert.equal(r.status,201,username);return r.headers.get('set-cookie')!.split(';')[0]}
const S=(op:string,o:any={})=>studio(req('studio','op='+op,o));
const meOf=async(cookie:string)=>(await (await S('me',{cookie})).json());

// ---- pure helpers
assert.deepEqual(sanitizeStudioRoles({Alice:'admin',bob:'god',' Carl ':'support','bad name!':'admin'}),{alice:'admin',carl:'support'});
assert.equal(roleFor('henrynguyen',env,{}),'owner');assert.equal(roleFor('alice',env,{studioRoles:{alice:'moderator'}}),'moderator');assert.equal(roleFor('alice',env,{}),null);
assert.equal(roleFor('henrynguyen',env,{studioRoles:{henrynguyen:'support'}}),'owner','an assignment can never demote an owner');
assert.equal(studioCan('admin','roles-save',false),false);assert.equal(studioCan('admin','account-disable',false),true);assert.equal(studioCan('admin','family-delete',false),false);
assert.equal(studioCan('moderator','community-action',false),true);assert.equal(studioCan('moderator','accounts',true),false);assert.equal(studioCan('support','accounts',true),true);assert.equal(studioCan('support','account-disable',false),false);

// ---- through the real Studio handler
const henry=await register('henrynguyen'),alice=await register('alice'),bob=await register('bob'),carl=await register('carl'),dina=await register('dina');
const hm=await meOf(henry);assert.equal(hm.role,'owner');assert.equal(hm.can.roles,true);
assert.equal((await S('accounts',{cookie:alice})).status,403,'no role → no Studio');
const save=(cookie:string,csrf:string,body:any)=>S('roles-save',{method:'POST',cookie,csrf,body});
for(const [u,l] of [['alice','admin'],['bob','moderator'],['carl','support']]){const r=await save(henry,hm.csrf,{username:u,level:l});assert.equal(r.status,200,u);resetSettingsCache()}
assert.equal((await save(henry,hm.csrf,{username:'henrynguyen',level:'support'})).status,400,'owners are not changed from Studio');
assert.equal((await save(henry,hm.csrf,{username:'nobody-here',level:'admin'})).status,404,'unknown account refused');
assert.equal((await save(henry,hm.csrf,{username:'dina',level:'superuser'})).status,400,'unknown level refused');
const list=await (await S('roles',{cookie:henry})).json();assert.deepEqual(list.owners,['henrynguyen']);assert.deepEqual(list.assigned.map((x:any)=>x.username+':'+x.level).sort(),['alice:admin','bob:moderator','carl:support']);
const audit=await (await S('audit',{cookie:henry})).json();assert.ok(JSON.stringify(audit).includes('studio_role_set'),'role changes are audited');

// admin: manages, but cannot assign roles or delete families/accounts
const am=await meOf(alice);assert.equal(am.role,'admin');assert.equal(am.can.roles,false);assert.equal(am.can.manage,true);
assert.equal((await S('accounts',{cookie:alice})).status,200);assert.equal((await S('roles',{cookie:alice})).status,200,'admin can see who has which role');
assert.equal((await save(alice,am.csrf,{username:'dina',level:'admin'})).status,403,'admin cannot assign roles');
assert.equal((await S('account-delete',{method:'POST',cookie:alice,csrf:am.csrf,body:{username:'dina',reason:'x'.repeat(12),confirm:'dina'}})).status,403,'admin cannot delete accounts');
assert.equal((await S('account-disable',{method:'POST',cookie:alice,csrf:am.csrf,body:{username:'dina',reason:'x'.repeat(12)}})).status,200,'admin can disable an account');
// moderator: community and overview only
const bm=await meOf(bob);assert.equal(bm.role,'moderator');
assert.equal((await S('overview',{cookie:bob})).status,200);assert.equal((await S('community',{cookie:bob})).status,200,'moderator opens community');
assert.equal((await S('accounts',{cookie:bob})).status,403,'moderator cannot list accounts');assert.equal((await S('audit',{cookie:bob})).status,403);
assert.equal((await S('account-enable',{method:'POST',cookie:bob,csrf:bm.csrf,body:{username:'dina',reason:'x'.repeat(12)}})).status,403);
// support: reads only
const cm=await meOf(carl);assert.equal(cm.role,'support');assert.equal(cm.can.write,false);
assert.equal((await S('accounts',{cookie:carl})).status,200);assert.equal((await S('account-enable',{method:'POST',cookie:carl,csrf:cm.csrf,body:{username:'dina',reason:'x'.repeat(12)}})).status,403);
// removal takes effect at once
assert.equal((await save(henry,hm.csrf,{username:'alice',level:null})).status,200);resetSettingsCache();assert.equal((await S('accounts',{cookie:alice})).status,403,'removed role → no Studio');
// app's Studio button: a quiet yes/no; ordinary users opening the app leave no audit entry
const auditBefore=JSON.stringify(await (await S('audit',{cookie:henry})).json()).split('access_denied').length;
const erin=await register('erin');assert.deepEqual(await (await S('access',{cookie:erin})).json(),{studio:false,role:null});assert.equal((await S('access',{cookie:henry})).status,200);
assert.equal((await (await S('access',{cookie:bob})).json()).studio,true,'moderator sees the Studio button');
assert.equal(JSON.stringify(await (await S('audit',{cookie:henry})).json()).split('access_denied').length,auditBefore,'no access_denied entries from the app check');
console.log('PASS Studio roles: owner from hosting settings assigns admin/moderator/support in Studio (audited, owners untouchable, unknown accounts/levels refused); each level limited as designed; removal immediate; app Studio button check is quiet');
