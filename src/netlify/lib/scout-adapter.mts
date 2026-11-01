// FamTray Scout ↔ community price pool adapter.
//
// The Scout network needs five things from the community/price work that is being
// built concurrently (wanted list, confirmed product mappings, freshness, catalog,
// and the pool write path). Until that work is merged, this default adapter keeps
// everything inside the `bep-scout` store so the network is fully functional and
// testable on its own. Every TODO(merge) names the function to call instead.
//
// Contract (all methods async, never throw for read methods):
//   wantedItems()            → [{itemId, name, families}]           (most-wanted first)
//   productMappings()        → [{itemId, retailer, productUrl, productId, packQty, confirmations, name?}]
//   lastSeen()               → {"<itemId>|<retailer>": "YYYY-MM-DD"} latest observation day
//   catalogItems()           → [{itemId, name}]
//   publishObservation(obs, {confirmed, agreeing})   write one fact to the pool
//   holdObservation(obs, reason)                     cross-device disagreement: keep out of the pool
//   recordMappingCandidate({itemId, retailer, productUrl, productId, packQty, deviceId, account})
import {editRecord} from './accounts.mjs';
import {createHash} from 'node:crypto';
const REGION={consistency:'strong',region:'ap-southeast-2'} as const;
export const scoutStore=(getStoreFn:any)=>getStoreFn({name:'bep-scout',...REGION});
const h=(x:string)=>createHash('sha256').update(x).digest('hex').slice(0,20);
async function* keys(store:any,prefix:string){for await(const page of store.list({prefix,paginate:true}))for(const b of page.blobs)yield b.key as string}
async function readAll(store:any,prefix:string,max=2000){const out:any[]=[];for await(const k of keys(store,prefix)){if(out.length>=max)break;try{const v=await store.get(k,{type:'json'});if(v)out.push(v)}catch{}}return out}

export function createDefaultAdapter(getStoreFn:any){
 const store=()=>scoutStore(getStoreFn);
 return{
  // TODO(merge): replace with Agent I's "Cần săn giá" wanted list read (community-prices.mts),
  // e.g. `wantedList(getStoreFn,{state})` → map to {itemId,name,families: wantCount}.
  async wantedItems(){try{return (await readAll(store(),'wanted/')).filter(w=>w?.itemId).sort((a,b)=>(b.families||0)-(a.families||0))}catch{return[]}},
  // TODO(merge): replace with Agent I's PRODUCT MAPPING store public GET
  // ({itemId, retailer, productUrl, productId, packQty, confirmations…}) — only confirmed rows.
  async productMappings(){try{return (await readAll(store(),'mappings/confirmed/')).filter(m=>m?.itemId&&m?.retailer&&m?.productUrl)}catch{return[]}},
  // TODO(merge): replace with the community pool's latest observation day per item/retailer
  // (communityPrices(getStoreFn,{state,…}) rows → observedAt).
  async lastSeen(){const out:any={};try{for(const r of await readAll(store(),'pool/',5000)){if(!r.itemId)continue;const k=r.itemId+'|'+r.retailer,d=String(r.observedAt||'').slice(0,10);if(!out[k]||out[k]<d)out[k]=d}}catch{}return out},
  // TODO(merge): replace with the master catalog (data/master-catalog.json items {id,name}).
  async catalogItems(){return[]},
  // TODO(merge): replace with the community pool write used for screenshot/scout facts
  // (Agent I: observations with source 'scout-extension'; confirmed=true only for trusted scouts
  // or consensus). Keep the obs shape; it already uses the app's field names.
  async publishObservation(obs:any,{confirmed,agreeing}:any){const k='pool/'+obs.observedAt.slice(0,10)+'/'+obs.retailer+'/'+h(obs.key);await editRecord(store(),k,(cur:any)=>({...(cur||{}),...obs,status:confirmed?'confirmed':'pending',agreeing,updatedAt:new Date().toISOString()}))},
  // TODO(merge): route to the community moderation hold queue.
  async holdObservation(obs:any,reason:string){const k='pool-held/'+obs.observedAt.slice(0,10)+'/'+obs.retailer+'/'+h(obs.key);await store().setJSON(k,{...obs,reason,heldAt:new Date().toISOString()})},
  // TODO(merge): replace with Agent I's mapping store candidate write (confirmations++ for
  // the same itemId+retailer+productId; becomes confirmed after its own threshold).
  async recordMappingCandidate(c:any){const k='mappings/candidates/'+c.itemId+'/'+c.retailer+'-'+h(String(c.productId||c.productUrl));await editRecord(store(),k,(cur:any)=>{const by=new Set([...(cur?.by||[]),c.deviceId]);return{itemId:c.itemId,retailer:c.retailer,productUrl:c.productUrl,productId:c.productId||null,packQty:c.packQty||null,by:[...by].slice(-20),confirmations:by.size,lastAt:new Date().toISOString()}})}
 };
}
