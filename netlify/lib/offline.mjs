// Signed offline access is separate from online authorization. APIs still check live membership.
const encode=bytes=>Buffer.from(bytes).toString('base64url');
export async function issueOfflineGrant(getStoreFn,status,{expires,trusted=false,session}={}){
 const store=getStoreFn({name:'bep-family-auth',consistency:'strong',region:'ap-southeast-2'});let keys=await store.get('offline-signing-key',{type:'json'});
 if(!keys){const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']),fresh={privateKey:await crypto.subtle.exportKey('jwk',pair.privateKey),publicKey:await crypto.subtle.exportKey('jwk',pair.publicKey)};await store.setJSON('offline-signing-key',fresh,{onlyIfNew:true});keys=await store.get('offline-signing-key',{type:'json'})}
 if(!keys||!Number.isFinite(expires)||expires<=Date.now())return null;
 const payload=encode(new TextEncoder().encode(JSON.stringify({...status,version:1,expires,trusted,session}))),key=await crypto.subtle.importKey('jwk',keys.privateKey,{name:'ECDSA',namedCurve:'P-256'},false,['sign']),signature=await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},key,new TextEncoder().encode(payload));return{payload,signature:encode(signature),publicKey:keys.publicKey};
}
