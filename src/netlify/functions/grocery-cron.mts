// Scheduled (netlify.toml: 30 19,20 * * 2,5 UTC). Runs twice so exactly one run
// lands at 06:xx Australia/Sydney on Wednesday and Saturday across daylight
// saving. Imports ONLY from a licensed feed configured via GROCERY_FEED_URL
// (+ optional GROCERY_FEED_TOKEN). Without configuration it logs and exits.
// There is deliberately no retailer scraping here.
import {getStore} from '@netlify/blobs';
import {importLicensedFeed,sydneyHour,CACHE_STORE} from '../lib/grocery-pricing.mjs';
import {recordCronRun} from '../lib/studio.mjs';
// Owner-console run record (counts only). recordCronRun never throws.
const logRun=(getStoreFn,at,result)=>recordCronRun(getStoreFn,'price-scout',{imported:result?.imported===true,reason:result?.reason||result?.skipped||null,stores:Object.keys(result?.counts||{}).length,items:Object.values(result?.counts||{}).reduce((n,v)=>n+(Number(v)||0),0)},at.getTime());
export function createGroceryCron({getStoreFn=getStore,env=process.env,fetchFn=globalThis.fetch,now=()=>new Date(),log=console.log}={}){
 return async()=>{
  const at=now();
  if(sydneyHour(at)!==6){log('grocery-cron: not 06:xx in Australia/Sydney; skipped.');return Response.json({skipped:'outside-window'})}
  if(!env.GROCERY_FEED_URL){log('grocery-cron: GROCERY_FEED_URL not configured; nothing imported.');await logRun(getStoreFn,at,{skipped:'not-configured'});return Response.json({skipped:'not-configured'})}
  try{const result=await importLicensedFeed({env,fetchFn,cacheStore:getStoreFn({name:CACHE_STORE,consistency:'strong',region:'ap-southeast-2'}),now:at,log});await logRun(getStoreFn,at,result);return Response.json(result)}
  catch(error){log('grocery-cron: import failed '+(error?.message||error));await logRun(getStoreFn,at,{imported:false,reason:'error'});return Response.json({imported:false,reason:'error'},{status:500})}
 };
}
export default createGroceryCron();
