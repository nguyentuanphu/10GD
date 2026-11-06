// v1.7.7: national online price refresh, run in the background (up to 15 minutes; the caller gets 202 at once).
// Started only by Studio "Run now" or the 06:xx schedule through a one-time token (lib/online-run.mts).
import {getStore} from '@netlify/blobs';
import {CACHE_STORE} from '../lib/grocery-pricing.mjs';
import {platformSettings} from '../lib/studio.mjs';
import {runOnlineInBackground} from '../lib/online-run.mjs';
import masterCatalog from '../../data/master-catalog.json' with {type:'json'};
import {readWanted,wantedItems} from '../lib/online-wanted.mjs';
export function createOnlinePricesBackground({getStoreFn=getStore,env=process.env,fetchFn=globalThis.fetch,now=()=>Date.now()}:any={}){
 return async(request:Request)=>{if(request.method!=='POST')return new Response(null,{status:405});
  const cache=getStoreFn({name:CACHE_STORE,consistency:'strong',region:'ap-southeast-2'}),ps=await platformSettings(getStoreFn,{env,fresh:true,now:now()});
  const r:any=await runOnlineInBackground({cache,token:request.headers.get('x-online-run'),items:[...((masterCatalog as any)?.items||[]),...wantedItems(await readWanted(cache))],/* v1.7.8: + family search words (after the catalogue, so they never crowd it out) */env,settings:ps.values,fetchFn,now});
  if(r.refused)return new Response(null,{status:403});console.log('online-prices-background: '+(r.error?'failed '+r.error:(r.status?.skipped||((r.status?.saved||0)+' saved'))));return new Response(null,{status:202})}}
export default createOnlinePricesBackground();
