import {getStore} from '@netlify/blobs';
import {scheduledReminders} from '../lib/push.mjs';
import {accountStore,scopedStore} from '../lib/accounts.mjs';
export default async()=>{const root=getStore({name:'bep-family-data',consistency:'strong',region:'ap-southeast-2'}),results=[];const accounts=accountStore(getStore);for await(const page of accounts.list({prefix:'families/',paginate:true}))for(const row of page.blobs){const f=await accounts.get(row.key,{type:'json'});if(f?.id)try{results.push(await scheduledReminders(scopedStore(root,f.id,f.members)))}catch{results.push({jobs:0,accepted:0,failed:true})}}return Response.json({families:results.length,jobs:results.reduce((n,r)=>n+r.jobs,0),accepted:results.reduce((n,r)=>n+r.accepted,0)})};
