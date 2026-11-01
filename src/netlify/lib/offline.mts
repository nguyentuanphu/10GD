// Signed offline access is separate from online authorization. APIs still check live membership.
// The grant is verified only against a public key that is public key is delivered separately (status.offlinePublicKey
// and op=offline-key) and pinned on the device, so a grant cannot vouch for itself with an attacker's key.
const encode=bytes=>Buffer.from(bytes).toString('base64url');
async function signingKeys(getStoreFn){
 const store=getStoreFn({name:'bep-family-auth',consistency:'strong',region:'ap-southeast-2'});let keys=await store.get('offline-signing-key',{type:'json'});
 if(!keys){const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']),fresh={privateKey:await crypto.subtle.exportKey('jwk',pair.privateKey),publicKey:await crypto.subtle.exportKey('jwk',pair.publicKey)};await store.setJSON('offline-signing-key',fresh,{onlyIfNew:true});keys=await store.get('offline-signing-key',{type:'json'})}
 return keys;
}
export const publicJwk=k=>k&&{kty:k.kty,crv:k.crv,x:k.x,y:k.y};
export async function offlinePublicKey(getStoreFn){const keys=await signingKeys(getStoreFn);return keys?publicJwk(keys.publicKey):null}
export async function issueOfflineGrant(getStoreFn,status,{expires,trusted=false,session}={}){
 const keys=await signingKeys(getStoreFn);
 if(!keys||!Number.isFinite(expires)||expires<=Date.now())return null;
 const payload=encode(new TextEncoder().encode(JSON.stringify({...status,version:1,expires,trusted,session}))),key=await crypto.subtle.importKey('jwk',keys.privateKey,{name:'ECDSA',namedCurve:'P-256'},false,['sign']),signature=await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},key,new TextEncoder().encode(payload));// publicKey stays in the grant only for older cached app versions; current verifiers ignore it except to reject a mismatch.
 return{payload,signature:encode(signature),publicKey:publicJwk(keys.publicKey)};
}
