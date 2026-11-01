import {getStore} from '@netlify/blobs';
import {scheduledReminders} from '../lib/push.mjs';
import {accountStore,scopedStore} from '../lib/accounts.mjs';
// Runs every 15 minutes for every account household. Each household uses its own scoped data and its account
// members, so devices are filtered exactly like direct sends.
export async function runReminders(getStoreFn=getStore,now=new Date(),options={}){const root=getStoreFn({name:'bep-family-data',consistency:'strong',region:'ap-southeast-2'}),results=[];const accounts=accountStore(getStoreFn);for await(const page of accounts.list({prefix:'families/',paginate:true}))for(const row of page.blobs){const f=await accounts.get(row.key,{type:'json'});if(f?.id&&/^[a-f0-9-]{36}$/.test(f.id))try{results.push(await scheduledReminders(scopedStore(root,f.id,f.members),now,options))}catch(e){console.warn('Scheduled reminders failed for one household',e?.name);results.push({jobs:0,accepted:0,failed:true})}}return{families:results.length,jobs:results.reduce((n,r)=>n+r.jobs,0),accepted:results.reduce((n,r)=>n+r.accepted,0),failed:results.filter(r=>r.failed).length}}
export default async()=>Response.json(await runReminders());
