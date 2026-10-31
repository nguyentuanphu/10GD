import assert from 'node:assert/strict';
import {accountFixture} from './helpers/accounts.mjs';
import {resolveAccount,cookieToken} from '../netlify/lib/accounts.mjs';
import {createHash} from 'node:crypto';
const f=await accountFixture(),{accounts,cookie,household,getStoreFn}=f;
const get=(op,c=cookie)=>new Request('https://test.example/.netlify/functions/accounts?op='+op,{headers:{Cookie:c}});
const call=(op,body={},c=cookie)=>accounts(f.request(op,body,c));
const authStore=getStoreFn({name:'bep-accounts'});
// Old sessions and fresh devices recover the existing family without recreating it.
const token=cookieToken(get('status')),sessionKey='sessions/'+createHash('sha256').update(token).digest('hex');
let user=await authStore.get('users/fixtureowner'),session=await authStore.get(sessionKey);delete user.lastHouseholdId;session.householdId=null;await authStore.setJSON('users/fixtureowner',user);await authStore.setJSON(sessionKey,session);
assert.equal((await resolveAccount(get('status'),getStoreFn)).household.id,household.id);
const second=await call('login',{username:'fixtureowner',password:f.password});assert.equal(second.status,200);const secondCookie=second.headers.get('set-cookie').split(';')[0];assert.equal((await(await accounts(get('status',secondCookie))).json()).household.id,household.id);
const another=await call('create-family',{name:'Another family'}),anotherId=(await another.json()).household.id;await call('switch-family',{id:household.id});
const fresh=await call('login',{username:'fixtureowner',password:f.password});assert.equal((await resolveAccount(get('status',fresh.headers.get('set-cookie')),getStoreFn)).household.id,household.id);
// Ambiguous membership and a revoked selected family must never select another workspace.
const selectedUser=await authStore.get('users/fixtureowner');delete selectedUser.lastHouseholdId;await authStore.setJSON('users/fixtureowner',selectedUser);
const ambiguous=await call('login',{username:'fixtureowner',password:f.password});assert.equal((await resolveAccount(get('status',ambiguous.headers.get('set-cookie')),getStoreFn)).household,null);
const revoked=await call('login',{username:'fixtureowner',password:f.password}),revokedCookie=revoked.headers.get('set-cookie'),revokedKey='sessions/'+createHash('sha256').update(cookieToken(get('status',revokedCookie))).digest('hex');
const revokedSession=await authStore.get(revokedKey);revokedSession.householdId='00000000-0000-0000-0000-000000000000';await authStore.setJSON(revokedKey,revokedSession);assert.equal((await resolveAccount(get('status',revokedCookie),getStoreFn)).household,null);
console.log('PASS old-session repair, fresh-device restore, remembered selection and safe ambiguous/revoked contexts');
// A recipient may receive a bearer code before creating their account.
const invitation=await call('invite',{role:'editor'});assert.equal(invitation.status,201);const code=(await invitation.json()).code;
const registered=await call('register',{username:'newrecipient',name:'New recipient',password:'synthetic-recipient-passphrase-42'},'');assert.equal(registered.status,201);const recipientCookie=registered.headers.get('set-cookie').split(';')[0];
assert.equal((await call('join',{code},recipientCookie)).status,200);const context=await resolveAccount(get('status',recipientCookie),getStoreFn);assert.equal(context.household.id,household.id);assert.equal(context.member.role,'editor');
assert.equal((await call('join',{code},recipientCookie)).status,403);assert.equal((await call('invite',{role:'editor'},recipientCookie)).status,403);
const invite2=await call('invite',{role:'viewer'}),code2=(await invite2.json()).code;
const expiry=await authStore.get('families/'+household.id),hash=code2.split('.')[1];expiry.invites[createHash('sha256').update(hash).digest('hex')].expires=Date.now()-1;await authStore.setJSON('families/'+household.id,expiry);assert.equal((await call('join',{code:code2},recipientCookie)).status,403);
console.log('PASS invitation before signup, one-use consumption, expiry and owner-only invitation permissions');
