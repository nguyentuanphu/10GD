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
// v1.5 (owner decision): existing members are never asked to create/join again. With several memberships and no
// valid last-used family, the most recently used/joined membership is chosen; it is always one the account belongs to.
const selectedUser=await authStore.get('users/fixtureowner');delete selectedUser.lastHouseholdId;await authStore.setJSON('users/fixtureowner',selectedUser);
const ambiguous=await call('login',{username:'fixtureowner',password:f.password});assert.equal((await resolveAccount(get('status',ambiguous.headers.get('set-cookie')),getStoreFn)).household.id,household.id,'most recently used (switched) family');
assert.equal((await authStore.get('users/fixtureowner')).lastHouseholdId,household.id,'lastHouseholdId is persisted on status resolution');
const revoked=await call('login',{username:'fixtureowner',password:f.password}),revokedCookie=revoked.headers.get('set-cookie'),revokedKey='sessions/'+createHash('sha256').update(cookieToken(get('status',revokedCookie))).digest('hex');
const revokedSession=await authStore.get(revokedKey);revokedSession.householdId='00000000-0000-0000-0000-000000000000';await authStore.setJSON(revokedKey,revokedSession);const repaired=await resolveAccount(get('status',revokedCookie),getStoreFn);assert.equal(repaired.household.id,household.id,'invalid session household falls back to normal selection');assert.equal((await authStore.get(revokedKey)).householdId,household.id);
// A family the account was removed from is never selected, even if it is the remembered one.
const removedFrom=await authStore.get('families/'+household.id);const keepOwner=structuredClone(removedFrom);delete removedFrom.members.fixtureowner;await authStore.setJSON('families/'+household.id,removedFrom);
const afterRemoval=await call('login',{username:'fixtureowner',password:f.password});assert.equal((await resolveAccount(get('status',afterRemoval.headers.get('set-cookie')),getStoreFn)).household.id,anotherId,'falls back to the remaining membership');await authStore.setJSON('families/'+household.id,keepOwner);
// Legacy user records without a membership index are scanned once and backfilled.
const legacyUser=await authStore.get('users/fixtureowner');delete legacyUser.households;delete legacyUser.lastHouseholdId;await authStore.setJSON('users/fixtureowner',legacyUser);
const legacy=await call('login',{username:'fixtureowner',password:f.password});assert((await resolveAccount(get('status',legacy.headers.get('set-cookie')),getStoreFn)).household);const backfilled=await authStore.get('users/fixtureowner');assert.deepEqual(Object.keys(backfilled.households).sort(),[household.id,anotherId].sort());
await call('switch-family',{id:household.id});
// Login/register set a non-secret presence cookie with the session lifetime; logout clears it.
assert.match(legacy.headers.get('set-cookie'),/bep-account=1; Path=\/; Secure; SameSite=Strict/);assert(!/bep-account=1[^,]*HttpOnly/.test(legacy.headers.get('set-cookie')));
const trustedLogin=await call('login',{username:'fixtureowner',password:f.password,trust:true});assert.match(trustedLogin.headers.get('set-cookie'),/bep-account=1; Path=\/; Max-Age=2592000; Secure; SameSite=Strict/);
const loggedOut=await call('logout',{},trustedLogin.headers.get('set-cookie').split(';')[0]);assert.match(loggedOut.headers.get('set-cookie'),/bep-account=; Path=\/; Max-Age=0/);
console.log('PASS old-session repair, fresh-device restore, most-recent auto-pick, invalid-household fallback, membership index backfill and presence cookie');
// A recipient may receive a bearer code before creating their account.
const invitation=await call('invite',{role:'editor'});assert.equal(invitation.status,201);const code=(await invitation.json()).code;assert.match(code,/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
const registered=await call('register',{username:'newrecipient',name:'New recipient',password:'synthetic-recipient-passphrase-42'},'');assert.equal(registered.status,201);const recipientCookie=registered.headers.get('set-cookie').split(';')[0];
assert.equal((await call('join',{code},recipientCookie)).status,200);const context=await resolveAccount(get('status',recipientCookie),getStoreFn);assert.equal(context.household.id,household.id);assert.equal(context.member.role,'editor');
const secondRecipient=await call('register',{username:'secondrecipient',name:'Second recipient',password:'synthetic-recipient-passphrase-42'},'');assert.equal(secondRecipient.status,201);const secondRecipientCookie=secondRecipient.headers.get('set-cookie').split(';')[0];assert.equal((await call('join',{code},secondRecipientCookie)).status,200,'same 7-day family invite code can be used by multiple family members');assert.equal((await call('invite',{role:'editor'},recipientCookie)).status,403);
const invite2=await call('invite',{role:'viewer'}),code2=(await invite2.json()).code;
const expiry=await authStore.get('families/'+household.id),hash=code2.includes('.')?code2.split('.')[1]:code2.replace(/-/g,'');expiry.invites[createHash('sha256').update(hash).digest('hex')].expires=Date.now()-1;await authStore.setJSON('families/'+household.id,expiry);assert.equal((await call('join',{code:code2},recipientCookie)).status,403);
console.log('PASS invitation before signup, one-use consumption, expiry and owner-only invitation permissions');
