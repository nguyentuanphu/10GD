'use strict';
// Each signed-in household has its own device cache. The legacy cache is left intact.
const storageScope=globalThis.BEP_SESSION?.mode==='account'&&globalThis.BEP_SESSION.household?.id?'account/'+globalThis.BEP_SESSION.household.id+'/':'guest/';
const familyStorage={getItem:key=>localStorage.getItem(storageScope+key),setItem:(key,value)=>localStorage.setItem(storageScope+key,value),removeItem:key=>localStorage.removeItem(storageScope+key)};
// v1.7.11 (owner, 7 Nov 2026): English is the main language, Vietnamese fully supported. Decided here, before any other script
// builds default data, and saved for this scope:
//  1. a language already saved for this scope wins (an explicit VI │ EN choice is saved the same way);
//  2. else a language CHOSEN on this device in another scope (guest first), e.g. on the sign-in page — not one the app guessed;
//  3. else a device or account already in use (family data in any scope, the legacy cache, or a signed-in household) keeps
//     the old default, Vietnamese — no device that is in use flips to English after the update;
//  4. else (a new device) the phone/browser language: Vietnamese if “vi” comes first among VI/EN in navigator.languages,
//     otherwise English.
function phoneLanguage(langs?:readonly string[]){const list=langs&&langs.length?langs:(typeof navigator!=='undefined'?(navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language||'']):[]);for(const l of list){const b=String(l||'').toLowerCase().slice(0,2);if(b==='vi')return'vi';if(b==='en')return'en'}return'en'}
function decideAppLanguage(store:Storage,scope:string,session:any,langs?:readonly string[]){
 const ok=(v:any)=>v==='en'||v==='vi',own=store.getItem(scope+'bep-language');if(ok(own))return{lang:own,why:'saved'};
 const keys:string[]=[];for(let i=0;i<store.length;i++){const k=store.key(i);if(k)keys.push(k)}
 const chosen=(k:string)=>store.getItem(k+'-auto')!=='1'/* a language this app guessed is not a choice */,other=[...keys.filter(k=>k==='guest/bep-language'),...keys.filter(k=>k!=='guest/bep-language'&&/(^|\/)bep-language$/.test(k))].filter(chosen).map(k=>store.getItem(k)).find(ok);if(other)return{lang:other,why:'device'};
 if(keys.some(k=>/(^|\/)bep-gia-dinh-v1$/.test(k))||(session?.mode==='account'&&session?.household?.id))return{lang:'vi',why:'in-use'};
 return{lang:phoneLanguage(langs),why:'phone'}}
try{const d=decideAppLanguage(localStorage,storageScope,(globalThis as any).BEP_SESSION);if(d.why!=='saved'){localStorage.setItem(storageScope+'bep-language',d.lang);if(d.why==='phone'||d.why==='in-use')localStorage.setItem(storageScope+'bep-language-auto','1')}(globalThis as any).BEP_LANGUAGE_REASON=d.why;if(typeof document!=='undefined')document.documentElement.lang=d.lang}catch(e){}
(globalThis as any).decideAppLanguage=decideAppLanguage;(globalThis as any).phoneLanguage=phoneLanguage;
