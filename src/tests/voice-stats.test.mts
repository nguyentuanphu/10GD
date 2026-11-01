// Voice statistics API: anonymous device token, same-origin, audio refused, server-side
// redaction + validation, rate limits (device/hour, device/day, IP/hour), opt-out
// deletion, 90-day retention, owner-only audited Studio views, aggregation and the
// "add as synonym" export. Synthetic data only.
import assert from 'node:assert/strict';
import {createAccountsHandler} from '../netlify/lib/accounts.mjs';
import {createVoiceStatsHandler} from '../netlify/functions/voice-stats.mjs';
import {voiceStatsStore,sanitizeEvent,redactText,prune,deviceHash,VOICE_STATS_LIMITS} from '../netlify/lib/voice-stats.mjs';
import {listLog,resetSettingsCache} from '../netlify/lib/studio.mjs';
import {memoryStores} from './helpers/accounts.mjs';

const getStoreFn=memoryStores(),origin='https://test.example',password='synthetic-voice-stats-42';
let clock=Date.parse('2026-11-02T08:00:00+11:00');
const env:any={STUDIO_ADMINS:'henrynguyen'};resetSettingsCache();
const api=createVoiceStatsHandler({getStoreFn,env,nowFn:()=>clock}),accounts=createAccountsHandler({getStoreFn});
const T1='synthetic-device-token-0001',T2='synthetic-device-token-0002';
let ip=0;
const call=(op:string,{method='POST',body,token='',from=origin,cookie='',ipAddr=''}:any={})=>api(new Request(`${origin}/.netlify/functions/voice-stats?op=${op}`,{method,headers:{...(from?{Origin:from}:{}),'x-nf-client-connection-ip':ipAddr||'ip-'+(ip++),...(token?{'x-voice-stats-device':token}:{}),...(cookie?{Cookie:cookie}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{})},...(body!==undefined?{body:typeof body==='string'?body:JSON.stringify(body)}:{})}));
const J=async(r:Response)=>({status:r.status,data:await r.json()});
async function register(username:string){const r=await accounts(new Request(origin+'/.netlify/functions/accounts?op=register',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','x-nf-client-connection-ip':'reg-'+username},body:JSON.stringify({username,name:username,password,trust:true})}));assert.equal(r.status,201);return r.headers.get('set-cookie')!.split(';')[0]}
const ev=(o:any={})=>({ts:new Date(clock).toISOString(),lang:'vi',recognizer:'browser',kind:'shopping',transcript:'mua rau răm',unrecognised:['rau răm'],corrections:[],items:1,household:'a'.repeat(24),...o});
const keys=async(prefix='ev/')=>{const out:string[]=[];for await(const p of voiceStatsStore(getStoreFn).list({prefix,paginate:true}))for(const b of p.blobs)out.push(b.key);return out};

// ---- pure validation / redaction
assert.equal(redactText('gọi 0412 345 678 hoặc a.b@c.com, www.x.com/y'),'gọi [số] hoặc [email] [link]');
{const s=sanitizeEvent({...ev(),transcript:'x'.repeat(400),lang:'fr',recognizer:'Local Base!!',unrecognised:['0412345678','ok',' OK ','a@b.co'],corrections:[{phrase:'rau ram',id:'vietnameseMint'},{phrase:'bad',id:'../../etc'},{phrase:'0412 345 678',id:'x'}],household:'not-hex',extra:'dropped'},clock);
 assert.equal(s.transcript.length,300);assert.equal(s.lang,'auto');assert.equal(s.recognizer,'localbase');assert.deepEqual(s.unrecognised,['ok']);
 assert.deepEqual(s.corrections,[{phrase:'rau ram',id:'vietnameseMint',kind:'ingredient'}]);assert.equal(s.household,null);assert.equal((s as any).extra,undefined)}
assert.throws(()=>sanitizeEvent({...ev(),audio:'UklGRg=='},clock),(e:any)=>e.code==='audio');

// ---- submit
{const r=await J(await call('submit',{body:ev()}));assert.equal(r.status,401,'device token required')}
{const r=await J(await call('submit',{body:ev(),token:'short'}));assert.equal(r.status,401)}
{const r=await J(await call('submit',{body:ev(),token:T1,from:'https://evil.example'}));assert.equal(r.status,403,'same-origin only')}
{const r=await J(await call('submit',{method:'GET',token:T1}));assert.equal(r.status,405)}
{const r=await J(await call('submit',{body:{...ev(),pcm:[1,2,3]},token:T1}));assert.equal(r.status,400);assert.equal(r.data.code,'audio')}
{const r=await J(await call('submit',{body:'{bad',token:T1}));assert.equal(r.status,400)}
{const r=await J(await call('submit',{body:{...ev(),transcript:'y'.repeat(9000)},token:T1}));assert.equal(r.status,413)}
{const r=await J(await call('submit',{body:ev({transcript:'mua tôm, gọi 0412 345 678'}),token:T1,from:''}));assert.equal(r.status,201,'no Origin (keepalive/beacon) is accepted')}
{const k=await keys();assert.equal(k.length,1);assert.ok(k[0].startsWith('ev/'+deviceHash(T1)+'/2026-11-01/'),'keyed by hashed device + UTC day');assert.ok(!k[0].includes(T1),'raw token never stored');
 const row=await voiceStatsStore(getStoreFn).get(k[0],{type:'json'});assert.equal(row.transcript,'mua tôm, gọi [số]','server repeats the redaction');assert.equal(row.account,undefined)}
// ---- rate limits
// The refused audio submission above also counted (limits apply before validation).
for(let i=2;i<VOICE_STATS_LIMITS.deviceHour;i++){const r=await call('submit',{body:ev(),token:T1});assert.equal(r.status,201,'submission '+i)}
{const r=await J(await call('submit',{body:ev(),token:T1}));assert.equal(r.status,429,'per-device hourly limit');assert.equal(r.data.code,'rate')}
{const r=await call('submit',{body:ev(),token:T2});assert.equal(r.status,201,'other devices unaffected')}
clock+=3600000;{const r=await call('submit',{body:ev(),token:T1});assert.equal(r.status,201,'next hour allowed again')}
// per-IP limit (many devices behind one address)
{let last=0;for(let i=0;i<=VOICE_STATS_LIMITS.ipHour;i++){last=(await call('submit',{body:ev(),token:'ip-device-token-'+String(i).padStart(10,'0'),ipAddr:'203.0.113.9'})).status}assert.equal(last,429,'per-IP hourly limit')}
// daily device cap
{const T3='synthetic-device-token-0003';let last=0;clock=Date.parse('2026-11-05T00:10:00Z');for(let h=0;h<12&&last!==429;h++){clock+=3600000;for(let i=0;i<VOICE_STATS_LIMITS.deviceHour;i++){last=(await call('submit',{body:ev(),token:T3})).status;if(last===429)break}}
 assert.equal(last,429);assert.equal((await keys('ev/'+deviceHash(T3)+'/')).length,VOICE_STATS_LIMITS.deviceDay,'daily cap per device')}

// ---- opt-out deletion
{const before=(await keys('ev/'+deviceHash(T2)+'/')).length;assert.equal(before,1);
 const r=await J(await call('forget',{body:{},token:T2}));assert.equal(r.status,200);assert.equal(r.data.deleted,1);
 assert.equal((await keys('ev/'+deviceHash(T2)+'/')).length,0);assert.ok((await keys('ev/'+deviceHash(T1)+'/')).length>0,'other devices kept')}
{const r=await J(await call('forget',{body:{}}));assert.equal(r.status,401)}

// ---- Studio: owner only, audited
const henry=await register('henrynguyen'),alice=await register('alice');
{const r=await J(await call('studio-overview',{method:'GET'}));assert.equal(r.status,401)}
{const r=await J(await call('studio-overview',{method:'GET',cookie:alice}));assert.equal(r.status,403,'not a Studio owner')}
{const r=await J(await call('studio-overview',{method:'POST',cookie:henry,body:{}}));assert.equal(r.status,405)}
// Reset to a small, known data set for aggregation.
for(const k of await keys())await voiceStatsStore(getStoreFn).delete(k);
const A='aggregate-device-token-A1',B='aggregate-device-token-B1',C='aggregate-device-token-C1';
clock=Date.parse('2026-11-20T09:00:00+11:00');
const seed=[[A,ev({unrecognised:['rau răm','bánh tráng mè'],corrections:[{phrase:'rau răm',id:'vietnameseMint',kind:'ingredient'}]})],[B,ev({unrecognised:['rau răm']})],[B,ev({lang:'en',recognizer:'local-base',unrecognised:['galangal'],corrections:[{phrase:'galangal',id:'galangal',kind:'ingredient'}]})],[C,ev({lang:'en',recognizer:'local-base',unrecognised:[],corrections:[]})],[C,ev({lang:'auto',recognizer:'local-small',unrecognised:['xyz'],corrections:[{phrase:'rau răm',id:'vietnameseMint',kind:'ingredient'}]})]];
for(const [tok,body] of seed){const r=await call('submit',{body,token:tok as string});assert.equal(r.status,201)}
// An old record (outside retention) and one outside the 30-day view.
const old=voiceStatsStore(getStoreFn);await old.setJSON(`ev/${deviceHash(A)}/2026-08-01/0000000000001-aaaa`,ev({unrecognised:['ancient']}));await old.setJSON(`ev/${deviceHash(A)}/2026-10-10/0000000000002-bbbb`,ev({unrecognised:['older']}));
{const r=await J(await call('studio-overview',{method:'GET',cookie:henry}));assert.equal(r.status,200);const d=r.data;
 assert.equal((await keys()).some(k=>k.includes('/2026-08-01/')),false,'records older than 90 days are pruned');
 assert.equal(d.total,5);assert.equal(d.devices,3);assert.deepEqual(d.byLang,{vi:2,en:2,auto:1});
 assert.equal(d.rates.unrecognised,0.8);assert.equal(d.rates.corrected,0.6);
 assert.deepEqual(d.unrecognised.vi.map((x:any)=>[x.phrase,x.count,x.devices]),[['rau răm',2,2],['bánh tráng mè',1,1]]);
 assert.deepEqual(d.unrecognised.en.map((x:any)=>x.phrase),['galangal']);assert.deepEqual(d.unrecognised.auto.map((x:any)=>x.phrase),['xyz']);
 assert.deepEqual(d.corrections.map((x:any)=>[x.phrase,x.id,x.count,x.devices]),[['rau răm','vietnameseMint',2,2],['galangal','galangal',1,1]]);
 const rec=Object.fromEntries(d.recognizers.map((r:any)=>[r.id,r]));assert.equal(rec.browser.count,2);assert.equal(rec['local-base'].count,2);assert.equal(rec['local-base'].unrecognisedRate,0.5);assert.equal(rec['local-small'].correctionRate,1);
 assert.ok(!JSON.stringify(d).includes('mua rau răm'),'no transcripts in the Studio view')}
{const r=await J(await call('studio-overview&days=60',{method:'GET',cookie:henry}));assert.equal(r.data.total,6,'60 days includes the October record');assert.equal(r.data.days,60)}
{const r=await J(await call('studio-export',{method:'GET',cookie:henry}));assert.equal(r.status,200);assert.equal(r.data.format,'bep-voice-synonyms');
 assert.deepEqual(r.data.synonyms[0],{phrase:'rau răm',id:'vietnameseMint',kind:'ingredient',lang:'vi',count:2,devices:2});assert.ok(r.data.unrecognised.some((u:any)=>u.phrase==='galangal'&&u.lang==='en'))}
{const audit=(await listLog(getStoreFn,'audit',{now:clock,limit:50})).items;const actions=audit.map((e:any)=>e.action);
 assert.equal(actions.filter((a:string)=>a==='voice_stats_view').length,2,'each Studio view is audited');assert.ok(actions.includes('voice_stats_export'),'export audited');assert.equal(audit.find((e:any)=>e.action==='voice_stats_export').actor,'henrynguyen')}
// Retention sweep directly
{await old.setJSON(`ev/${deviceHash(A)}/2026-01-01/0000000000003-cccc`,ev());const n=await prune(getStoreFn,clock);assert.ok(n>=1);assert.equal((await keys()).some(k=>k.includes('/2026-01-01/')),false)}
console.log('voice-stats API: validation, redaction, rate limits, opt-out deletion, retention, owner-only audited Studio views and export checked.');
