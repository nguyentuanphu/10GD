// Opt-in voice statistics, app side: consent gating (nothing sent while OFF, the
// default), redaction (member names incl. without accents, e-mails, phone and long
// numbers, links), the record built from a confirmed preview (unrecognised words,
// user corrections → catalogue ids only), hashed household, and opt-out deletion.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const webcrypto=require('node:crypto').webcrypto;
function storage(){const m=new Map<string,string>();return{m,getItem:(k:string)=>m.has(k)?m.get(k)!:null,setItem:(k:string,v:string)=>{m.set(k,String(v))},removeItem:(k:string)=>{m.delete(k)}}}
function ctx(){const ls=storage(),c=vm.createContext({console,Date,Math,JSON,TextEncoder,crypto:webcrypto,btoa,localStorage:ls,navigator:{onLine:true}});vm.runInContext(fs.readFileSync('dist/voice-stats.js','utf8'),c);return{c,ls}}
const J=(c:any,src:string)=>JSON.parse(vm.runInContext('JSON.stringify('+src+')',c));
let n=0;const tests:any[]=[];const t=(name:string,fn:any)=>tests.push([name,fn]);

t('redaction',()=>{const {c}=ctx();const r=(text:string,names:string[]=[])=>{c.__t=text;c.__n=names;return vm.runInContext('voiceStatsRedact(__t,__n)',c)};
 assert.equal(r('gọi Bà Ngoại số 0412 345 678 rồi mua 2 kg thịt',['Bà Ngoại']),'gọi [tên] số [số] rồi mua 2 kg thịt');
 assert.equal(r('mua cho ba ngoai hai bo rau muong',['Bà Ngoại']),'mua cho [tên] hai bo rau muong','accent-insensitive');
 assert.equal(r('Minh thích canh chua, gửi minh.nguyen@example.com',['Nguyễn Văn Minh']),'[tên] thích canh chua, gửi [email]','single given name and e-mail');
 assert.equal(r('call +61 412 345 678 or (02) 9876 5432',[]),'call [số] or [số]');
 assert.equal(r('mã thẻ 4111111111111111 và https://example.com/x?y=1',[]),'mã thẻ [số] và [link]');
 assert.equal(r('mua 500 gam sườn non, 3 hộp trứng, 1,5 kg gạo',[]),'mua 500 gam sườn non, 3 hộp trứng, 1,5 kg gạo','quantities survive');
 assert.equal(r('Henry wants pho',['Henry']),'[tên] wants pho');
 assert.equal(r('henrychef soup',['Henry']),'henrychef soup','only whole words');
});
t('record from a confirmed preview',()=>{const {c}=ctx();
 c.__in={draft:{kind:'shopping',text:'mua 2 ký thịt ba chỉ cho Lan, một bó rau răm, ba gói bánh tráng mè đen',items:[{label:'thịt ba chỉ',ingredient:'pork'},{label:'rau răm',ingredient:''},{label:'bánh tráng mè đen',ingredient:''},{label:'Lan bánh',ingredient:''}],mealDraft:null},
  confirmed:{items:[{index:0,ingredient:'pork'},{index:1,ingredient:'vietnameseMint'},{index:2,ingredient:''},{index:3,ingredient:''}],meal:{phrase:'canh chua cá',originalId:'own-1',id:'canh-chua-ca'}},lang:'vi',recognizer:'local-base',names:['Lan'],now:Date.parse('2026-11-02T08:00:00Z'),isCatalogId:(id:string)=>id!=='own-2'};
 const e=J(c,'voiceStatsEvent(__in)');
 assert.equal(e.ts,'2026-11-02T08:00:00.000Z');assert.equal(e.lang,'vi');assert.equal(e.recognizer,'local-base');
 assert.equal(e.transcript,'mua 2 ký thịt ba chỉ cho [tên], một bó rau răm, ba gói bánh tráng mè đen');
 assert.deepEqual(e.unrecognised,['rau răm','bánh tráng mè đen','[tên] bánh']);
 assert.deepEqual(e.corrections,[{phrase:'rau răm',id:'vietnameseMint',kind:'ingredient'},{phrase:'canh chua cá',id:'canh-chua-ca',kind:'recipe'}]);
 assert.ok(!JSON.stringify(e).includes('Lan'),'member name never present');
 c.__in.confirmed.meal.id='own-2';assert.deepEqual(J(c,'voiceStatsEvent(__in)').corrections.map((x:any)=>x.id),['vietnameseMint'],'family recipe ids are not sent');
 c.__in.draft.text='x'.repeat(500);assert.equal(J(c,'voiceStatsEvent(__in)').transcript.length,300,'truncated to 300 chars');
});
t('consent gating: nothing is sent while off',async()=>{const {c,ls}=ctx();const calls:any[]=[];c.__f=async(u:string,o:any)=>{calls.push({u,o});return{ok:true}};
 assert.equal(vm.runInContext('voiceStatsConsent()',c),false,'off by default');
 assert.equal(await vm.runInContext("voiceStatsSend({transcript:'a'},{fetchFn:__f,household:'h-1'})",c),false);assert.equal(calls.length,0);assert.equal(ls.getItem('bep-voice-stats-device'),null,'no device token is even created');
 await vm.runInContext('voiceStatsSetConsent(true,{fetchFn:__f})',c);assert.equal(calls.length,0,'switching on sends nothing by itself');
 c.navigator.onLine=false;assert.equal(await vm.runInContext("voiceStatsSend({transcript:'a'},{fetchFn:__f})",c),false);assert.equal(calls.length,0,'offline: dropped, not queued');c.navigator.onLine=true;
 assert.equal(await vm.runInContext("voiceStatsSend({ts:'x',transcript:'mua tôm'},{fetchFn:__f,household:'1b6f2a7c-0000-4000-8000-000000000001'})",c),true);
 assert.equal(calls.length,1);const {u,o}=calls[0];assert.equal(u,'/.netlify/functions/voice-stats?op=submit');assert.equal(o.method,'POST');
 const token=ls.getItem('bep-voice-stats-device');assert.match(token,/^[A-Za-z0-9_-]{32}$/);assert.equal(o.headers['x-voice-stats-device'],token);
 const body=JSON.parse(o.body);assert.match(body.household,/^[a-f0-9]{24}$/);assert.ok(!o.body.includes('1b6f2a7c'),'household id is hashed');
 assert.ok(!/audio|wav|pcm/i.test(Object.keys(body).join(',')),'no audio fields');
 // Opt-out deletes server-side records and forgets the token.
 calls.length=0;await vm.runInContext('voiceStatsSetConsent(false,{fetchFn:__f})',c);
 assert.equal(calls.length,1);assert.equal(calls[0].u,'/.netlify/functions/voice-stats?op=forget');assert.equal(calls[0].o.headers['x-voice-stats-device'],token);
 assert.equal(ls.getItem('bep-voice-stats-device'),null);assert.equal(ls.getItem('bep-voice-stats'),null);
 calls.length=0;assert.equal(await vm.runInContext("voiceStatsSend({transcript:'a'},{fetchFn:__f})",c),false);assert.equal(calls.length,0);
});
t('opt-out while the server is unreachable retries the deletion later',async()=>{const {c,ls}=ctx();let up=false;const calls:string[]=[];c.__f=async(u:string)=>{calls.push(u);if(!up)throw Error('offline');return{ok:true}};
 ls.setItem('bep-voice-stats','1');ls.setItem('bep-voice-stats-device','A'.repeat(32));
 await vm.runInContext('voiceStatsSetConsent(false,{fetchFn:__f})',c);assert.equal(ls.getItem('bep-voice-stats-forget'),'1');assert.equal(ls.getItem('bep-voice-stats-device'),'A'.repeat(32));
 up=true;await vm.runInContext('voiceStatsRetryForget(__f)',c);assert.equal(ls.getItem('bep-voice-stats-forget'),null);assert.equal(ls.getItem('bep-voice-stats-device'),null);assert.equal(calls.length,2);
});
(async()=>{for(const [name,fn] of tests){try{await fn();n++}catch(e:any){e.message=name+': '+e.message;throw e}}console.log(`voice-stats client: ${n} checks passed.`)})().catch(e=>{console.error(e);process.exit(1)});
