// Studio speed benchmark (not part of npm test): real Studio handler, in-memory stores with
// simulated per-call latency (default 40–120 ms, like a cross-region round trip).
// Run: npm run build && node tests/studio-bench.mjs [out.json]
// Simulated ms = (wall time with latency − wall time without) × scale + wall time without,
// so CPU time is not inflated by the time scale.
import {writeFileSync} from 'node:fs';
import {createStudioHandler} from '../netlify/functions/studio.mjs';
import {resetSettingsCache} from '../netlify/lib/studio.mjs';
import {memoryStores} from './helpers/accounts.mjs';
import {instrumentedStores,seedStudioLoad} from './helpers/studio-load.mjs';

const MIN=+(process.env.BENCH_MIN_MS||40),MAX=+(process.env.BENCH_MAX_MS||120),SCALE=+(process.env.BENCH_SCALE||4);
const base=memoryStores(),inst=instrumentedStores(base,{min:0,max:0,scale:SCALE});
inst.pause();const now=Date.now();const {cookie,families,people}=await seedStudioLoad(inst.getStoreFn,{now});inst.resume();
const env:any={STUDIO_ADMINS:'henrynguyen',COMMIT_REF:'bench',URL:'https://bench.example',GROCERY_FEED_URL:'x'};
const studio=createStudioHandler({getStoreFn:inst.getStoreFn,env,mailer:{configured:()=>true,async send(){}},limits:{all:1e6,mutate:1e6}});
const call=async(op:string)=>{const r=await studio(new Request('https://bench.example/.netlify/functions/studio?op='+op,{headers:{Cookie:cookie}}));const body=await r.text();if(r.status!==200)throw new Error(op+' → '+r.status+' '+body.slice(0,200));return body.length};
async function clearCaches(){inst.pause();const s=base({name:'bep-studio'});for(const p of ['cache/','index/','view/'])for await(const page of s.list({prefix:p}))for(const b of page.blobs)await s.delete(b.key);resetSettingsCache();inst.resume()}
const ops:[string,string][]=[['me','me'],['overview','overview'],['accounts','accounts'],['families','families'],['invitations','invites'],['notifications','notifications'],['messages','messages'],['settings','settings'],['health','health'],['logs (events)','events'],['logs (audit)','audit'],['community','community'],['rollout','rollout'],['account drawer','account&username='+people[3]],['family drawer','family&id='+families[2].id]];
async function measure(op:string,lat:boolean){if(lat)inst.setLatency(MIN,MAX);else inst.setLatency(0,0);inst.reset();const t=performance.now();const bytes=await call(op);const wall=performance.now()-t;return{wall,bytes,get:inst.counts.get,list:inst.counts.list,set:inst.counts.set,del:inst.counts.delete}}
const rows:any[]=[];
for(const [label,op] of ops){
 await clearCaches();const c0=await measure(op,false),w0=await measure(op,false);
 await clearCaches();const c1=await measure(op,true),w1=await measure(op,true);
 const sim=(a:any,b:any)=>Math.round((b.wall-a.wall)*SCALE+a.wall);
 rows.push({tab:label,op:op.split('&')[0],cold:{get:c1.get,list:c1.list,set:c1.set,delete:c1.del,ms:sim(c0,c1)},warm:{get:w1.get,list:w1.list,set:w1.set,delete:w1.del,ms:sim(w0,w1)},bytes:c1.bytes});
 console.log(`${label.padEnd(16)} cold ${String(c1.get).padStart(5)} get ${String(c1.list).padStart(4)} list ${String(c1.set+c1.del).padStart(4)} write ${String(sim(c0,c1)).padStart(7)} ms | warm ${String(w1.get).padStart(5)} get ${String(w1.list).padStart(4)} list ${String(w1.set+w1.del).padStart(4)} write ${String(sim(w0,w1)).padStart(7)} ms | ${c1.bytes} B`);
}
const out={latency:`${MIN}-${MAX} ms per call`,scale:SCALE,data:'50 accounts, 20 families, 200 sessions, 100 push devices, 2,000 events, 200 audit rows, 40 contributors, 120 price shards',rows};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(out,null,1));
console.log('Studio benchmark done.');
