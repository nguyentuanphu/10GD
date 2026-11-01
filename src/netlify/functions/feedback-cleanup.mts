// Scheduled daily: removes ladybug feedback (and its pictures) older than 13 months, receipts older than 30 days,
// orphaned pictures and expired rate counters (see ../lib/feedback.mts). Same pattern as usage-cleanup.mts; the
// schedule is declared in-code. Records a counts-only run for the Studio.
import {getStore} from '@netlify/blobs';
import {prune} from '../lib/feedback.mjs';
import {recordCronRun} from '../lib/studio.mjs';
export function createFeedbackCleanup({getStoreFn=getStore,now=()=>Date.now(),log=console.log}:any={}){
 return async()=>{
  const at=now();
  try{const r=await prune(getStoreFn,at,20000);await recordCronRun(getStoreFn,'feedback-cleanup',{removed:r.removed,cutoff:r.cutoff},at);return Response.json(r)}
  catch(e:any){log('feedback-cleanup failed '+(e?.message||e));await recordCronRun(getStoreFn,'feedback-cleanup',{removed:0,reason:'error'},at);return Response.json({removed:0,reason:'error'},{status:500})}
 };
}
export default createFeedbackCleanup();
export const config={schedule:'41 16 * * *'};// 03:41 Australia/Sydney (AEDT), 02:41 in winter
