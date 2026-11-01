// Scheduled daily: removes usage rollups older than 13 months, stale install indexes and
// expired rate counters (see ../lib/usage.mts). The schedule is declared here (in-code
// function config), not in netlify.toml. Records a counts-only run for the Studio.
import {getStore} from '@netlify/blobs';
import {prune} from '../lib/usage.mjs';
import {recordCronRun} from '../lib/studio.mjs';
export function createUsageCleanup({getStoreFn=getStore,now=()=>Date.now(),log=console.log}:any={}){
 return async()=>{
  const at=now();
  try{const r=await prune(getStoreFn,at,20000);await recordCronRun(getStoreFn,'usage-cleanup',{removed:r.removed,cutoff:r.cutoff},at);return Response.json(r)}
  catch(e:any){log('usage-cleanup failed '+(e?.message||e));await recordCronRun(getStoreFn,'usage-cleanup',{removed:0,reason:'error'},at);return Response.json({removed:0,reason:'error'},{status:500})}
 };
}
export default createUsageCleanup();
export const config={schedule:'17 16 * * *'};// 03:17 Australia/Sydney (AEDT), 02:17 in winter
