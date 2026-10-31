import assert from 'node:assert/strict';
import {createAccountsHandler,scopedStore} from '../../netlify/lib/accounts.mjs';
export function memoryStores(){const stores=new Map();let revision=0;return({name})=>{if(stores.has(name))return stores.get(name);const rows=new Map(),store={async get(k){return structuredClone(rows.get(k)?.data??null)},async getWithMetadata(k){return structuredClone(rows.get(k)??null)},async setJSON(k,data,o={}){const old=rows.get(k);if(o.onlyIfNew&&old||o.onlyIfMatch&&old.etag!==o.onlyIfMatch)return{modified:false};const etag=String(++revision);rows.set(k,{data:structuredClone(data),etag});return{modified:true,etag}},async set(k,d,o){return this.setJSON(k,d,o)},async delete(k){rows.delete(k)},async *list({prefix=''}){yield{blobs:[...rows.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key}))}}};stores.set(name,store);return store}}
export async function accountFixture(getStoreFn=memoryStores()){
 const accounts=createAccountsHandler({getStoreFn}),password='synthetic-fixture-password-42';
 const request=(op,body={},cookie='',ip='fixture')=>new Request('https://test.example/.netlify/functions/accounts?op='+op,{method:'POST',headers:{Origin:'https://test.example',Cookie:cookie,'x-nf-client-connection-ip':ip,'Content-Type':'application/json'},body:JSON.stringify(body)});
 const registered=await accounts(request('register',{username:'fixtureowner',name:'Fixture owner',password,trust:true}));assert.equal(registered.status,201);const cookieHeader=registered.headers.get('set-cookie'),cookie=cookieHeader.split(';')[0];
 const created=await accounts(request('create-family',{name:'Fixture family'},cookie));assert.equal(created.status,201);const household=(await created.json()).household;
 const store=scopedStore(getStoreFn({name:'bep-family-data'}),household.id);
 return{getStoreFn,accounts,request,password,cookie,cookieHeader,household,store};
}
