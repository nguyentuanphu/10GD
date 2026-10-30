import { getStore } from '@netlify/blobs';
import { scheduledReminders } from '../lib/push.mjs';
export default async()=>{if((process.env.FAMILY_PASSWORD||'').length<12)return new Response('Family storage not configured');const store=getStore({name:'bep-family-data',consistency:'strong',region:'ap-southeast-2'});const result=await scheduledReminders(store);return Response.json(result)};
