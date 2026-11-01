// On-device speech recognition (v1.6): pack registry and exact sizes, capability check
// and fallback, Whisper language hints, hallucination clean-up, resampling, the speech
// segmenter, recognizer + offline-pack registration with stubbed hooks, Cache Storage
// download/verify/remove with fake files, and the worker message protocol with a fake
// engine (no model is downloaded; no audio is used).
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const webcrypto=require('node:crypto').webcrypto;
let count=0;const tests:any[]=[];const t=(name:string,fn:any)=>tests.push([name,fn]);
function fakeCaches(){const stores=new Map<string,Map<string,any>>();return{stores,async open(name:string){if(!stores.has(name))stores.set(name,new Map());const m=stores.get(name)!;return{async match(u:any){const r=m.get(String(u?.url||u));return r?r.clone():undefined},async put(u:any,res:any){m.set(String(u?.url||u),res)},async delete(u:any){return m.delete(String(u?.url||u))}}}}}
function ctx(extra:any={}){const c=vm.createContext({console,Intl,Date,Math,URL,TextEncoder,Response,Blob,crypto:webcrypto,btoa,atob,setTimeout,clearTimeout,queueMicrotask,structuredClone,...extra});vm.runInContext(fs.readFileSync('dist/voice-local.js','utf8'),c);return c}
const run=(c:any,src:string)=>vm.runInContext(src,c);
const J=(c:any,src:string)=>JSON.parse(vm.runInContext('JSON.stringify('+src+')',c));

t('packs list exact pinned sizes and stay off by default',()=>{const c=ctx({localStorage:{getItem:()=>null,setItem(){},removeItem(){}}});
 assert.equal(run(c,"voiceLocalPackBytes('base')"),23201314+53693315+2243+3832+339+2480466+282682);
 assert.equal(run(c,"voiceLocalPackBytes('small')"),92326160+156750845+2227+3893+339+2480466+282683);
 assert.equal(run(c,"voiceLocalBytes(voiceLocalRuntimeFiles('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36',false))"),586230+53057+26861777);
 assert.equal(run(c,"voiceLocalBytes(voiceLocalRuntimeFiles('Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',false))"),586230+24381+14264838,'Safari < 26 without WebGPU uses the plain runtime');
 assert.equal(run(c,"voiceLocalIsOldSafari('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15',false)"),false);
 assert.equal(run(c,"voiceLocalChoice()"),'','no recognizer chosen by default');
 const urls=run(c,"voiceLocalPackFiles('base').map(f=>f.url)");
 for(const u of urls)assert.match(u,/^https:\/\/huggingface\.co\/onnx-community\/whisper-base\/resolve\/1846881b6b3a3024392c1eea3ad983695bc23925\//,'pinned revision');
 assert.equal(run(c,"VOICE_LOCAL_TF.url"),'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.1/dist/transformers.min.js','pinned exact library version');
 assert.ok(run(c,"voiceLocalPackFiles('small').filter(f=>f.url.endsWith('.onnx')).every(f=>/^[a-f0-9]{64}$/.test(f.sha256))"),'model weights carry sha256');
 assert.equal(run(c,"voiceLocalFormatBytes(79664191,'en')"),'79.7 MB');assert.equal(run(c,"voiceLocalFormatBytes(251846613,'vi')"),'252 MB');
});
t('capability check and per-pack limits',()=>{const c=ctx();const cap=(f:any)=>{c.__f=f;return JSON.parse(run(c,'JSON.stringify(voiceLocalCapability(__f))'))};
 const good={wasm:true,simd:true,worker:true,mic:true,audioWorklet:true,caches:true,memoryGB:8,ua:'Chrome/141',touchPoints:0};
 let r=cap(good);assert.equal(r.ok,true);assert.equal(r.packs.base.ok,true);assert.equal(r.packs.small.ok,true);
 r=cap({...good,simd:false});assert.equal(r.ok,false);assert.deepEqual(r.reasons,['simd']);assert.equal(r.packs.base.ok,false);
 r=cap({...good,memoryGB:2});assert.equal(r.packs.base.ok,true);assert.equal(r.packs.small.ok,false);assert.deepEqual(r.packs.small.reasons,['memory']);
 r=cap({...good,memoryGB:1});assert.equal(r.packs.base.ok,false);
 r=cap({...good,memoryGB:undefined,ua:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) Version/18.5 Mobile/15E148 Safari/604.1'});assert.equal(r.packs.base.ok,true);assert.equal(r.packs.small.ok,false);assert.deepEqual(r.packs.small.reasons,['ios-memory']);
 r=cap({...good,memoryGB:undefined,ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Version/18.5 Safari/605.1.15',touchPoints:5});assert.equal(r.ios,true,'iPadOS desktop UA is still iOS');
 r=cap({...good,memoryGB:undefined});assert.equal(r.packs.small.ok,true);assert.equal(r.packs.small.warn,'memory-unknown');
 r=cap({...good,audioWorklet:false,mic:false});assert.deepEqual(r.reasons,['mic','audio']);
 assert.match(run(c,"voiceLocalReasonText('ios-memory')"),/iPhone\/iPad/);
});
t('language hint, hallucination clean-up, downmix and resampling',()=>{const c=ctx();
 assert.equal(run(c,"voiceLocalWhisperLang('vi-VN','toggle')"),'vietnamese');assert.equal(run(c,"voiceLocalWhisperLang('en-AU','toggle')"),'english');assert.equal(run(c,"voiceLocalWhisperLang('vi-VN','auto')"),null);
 assert.equal(run(c,"voiceLocalCleanText(' Mua hai ký thịt ba chỉ. Hãy subscribe cho kênh Ghiền Mì Gõ để không bỏ lỡ những video hấp dẫn. ')"),'Mua hai ký thịt ba chỉ.');
 assert.equal(run(c,"voiceLocalCleanText('[Âm nhạc]')"),'');assert.equal(run(c,"voiceLocalCleanText('Two kilos of pork belly. Thanks for watching!')"),'Two kilos of pork belly.');
 assert.equal(run(c,"voiceLocalCleanText('Cảm ơn các bạn đã theo dõi')"),'');
 assert.equal(run(c,"voiceLocalResample(new Float32Array(48000),48000,16000).length"),16000);
 assert.deepEqual(J(c,"Array.from(voiceLocalResample(new Float32Array([0,1,2,3,4,5]),48000,16000))"),[0,3]);
 assert.deepEqual(J(c,"Array.from(voiceLocalDownmix([new Float32Array([1,0]),new Float32Array([0,1])]))"),[.5,.5]);
});
t('segmenter: final after a pause, partials while speaking, cap at max length',()=>{const c=ctx();
 const r=JSON.parse(run(c,`(()=>{const s=voiceLocalSegmenter({partialMs:1000}),ev=[];const frame=a=>{const f=new Float32Array(160);for(let i=0;i<160;i++)f[i]=a*Math.sin(i/3);return f};
  for(let i=0;i<50;i++)ev.push(...s.push(frame(0.001)));            // 0.5 s room noise
  for(let i=0;i<250;i++)ev.push(...s.push(frame(0.2)));             // 2.5 s speech
  for(let i=0;i<100;i++)ev.push(...s.push(frame(0.001)));           // 1 s pause
  const long=voiceLocalSegmenter({maxMs:3000,partialMs:99999}),ev2=[];for(let i=0;i<400;i++)ev2.push(...long.push(frame(0.3)));
  const tail=voiceLocalSegmenter();for(let i=0;i<60;i++)tail.push(frame(0.3));const fl=tail.flush();
  return JSON.stringify({types:ev.map(e=>e.type),final:ev.filter(e=>e.type==='final').map(e=>e.audio.length),cap:ev2.map(e=>e.type+':'+e.audio.length),flush:fl.map(e=>e.audio.length)})})()`));
 assert.deepEqual(r.types,['partial','partial','final'],'two partial snapshots then one final');
 assert.ok(r.final[0]>=2.5*16000&&r.final[0]<=3.4*16000,'final holds the speech (+ the pause) only: '+r.final[0]);
 assert.deepEqual(r.cap,['final:48000'],'segments are capped at maxMs');
 assert.deepEqual(r.flush,[9600],'stop flushes buffered speech');
});
t('registers recognizers and offline packs only when the hooks exist',async()=>{
 const c=ctx({caches:fakeCaches(),navigator:{userAgent:'Chrome/141',onLine:true}});
 assert.equal(run(c,'voiceLocalRegisterHooks()'),0,'standalone: nothing to register, no error');
 // v1.6 integration: R's registry returns an unregister function; only DOWNLOADED + usable packs become recognisers
 // (so the shared selector never offers one that cannot start). Offline packs register at once.
 run(c,"globalThis.__recs=[];globalThis.__packs=[];globalThis.registerVoiceRecognizer=r=>{__recs.push(r);return()=>{__recs.splice(__recs.indexOf(r),1)}};globalThis.registerOfflinePack=p=>__packs.push(p);voiceLocalProbe=async()=>({ok:true,packs:{base:{ok:true},small:{ok:true}}})");
 assert.equal(run(c,'voiceLocalRegisterHooks()'),2);assert.equal(run(c,'voiceLocalRegisterHooks()'),0,'idempotent');
 await run(c,'voiceLocalSyncRecognizers()');assert.equal(run(c,'__recs.length'),0,'nothing downloaded: no recogniser offered');
 run(c,"voiceLocalStatus=async id=>id==='base'?'ready':'none'");assert.equal(await run(c,'voiceLocalSyncRecognizers()'),1);await run(c,'voiceLocalSyncRecognizers()');
 const recs=run(c,'__recs'),packs=run(c,'__packs');
 assert.deepEqual([...recs].map((r:any)=>r.id),['local-base'],'ready pack registered once');
 for(const r of recs){assert.equal(typeof r.start,'function');assert.equal(typeof r.stop,'function');assert.equal(typeof r.abort,'function');assert.ok(r.label);assert.equal(r.offline,true,'works offline');assert.equal(r.flushOnStop,true)}
 // onResult(text, final) from the engine is delivered in R's shape onResult(text, {isFinal}).
 run(c,"globalThis.__got=[];voiceLocalRecognizer=id=>({id:'local-'+id,label:'x',start:async(lang,onResult)=>{onResult('một',false);onResult('một ký',true)},stop(){},abort(){}})");
 await run(c,"voiceLocalAdapter('base').start('vi-VN',(t,i)=>__got.push([t,i.isFinal]),()=>{})");assert.deepEqual(JSON.parse(JSON.stringify(run(c,'__got'))),[['một',false],['một ký',true]]);
 run(c,"voiceLocalStatus=async()=>'none'");await run(c,'voiceLocalSyncRecognizers()');assert.equal(run(c,'__recs.length'),0,'removed pack is unregistered');
 assert.deepEqual([...packs].map((p:any)=>p.id),['voice-local-base','voice-local-small']);
 assert.equal(packs[0].sizeBytes,79664191+27501064,'pack size includes the shared runtime');
 for(const p of packs){assert.equal(typeof p.download,'function');assert.equal(typeof p.remove,'function');assert.equal((await p.status()).state,'none')}
});
t('download → verify → cache, integrity failure, status and remove (fake files)',async()=>{
 const caches=fakeCaches(),fetched:string[]=[];
 const c=ctx({caches,navigator:{userAgent:'Chrome/141',onLine:true,storage:{estimate:async()=>({quota:1e9,usage:0}),persist:async()=>true}},location:{href:'https://kitchen.test/'},fetch:async()=>new Response('worker code')});
 const bytes=(s:string)=>new TextEncoder().encode(s);
 const hex=async(s:string)=>Buffer.from(await webcrypto.subtle.digest('SHA-256',bytes(s))).toString('hex'),b64=async(s:string)=>Buffer.from(await webcrypto.subtle.digest('SHA-256',bytes(s))).toString('base64');
 // Shrink the pinned files to synthetic content so the test needs no download.
 c.__m=await hex('model-bytes');c.__tf=await b64('tf-module');c.__mjs=await b64('ort-mjs');c.__wasm=await b64('ort-wasm');
 run(c,"VOICE_LOCAL_PACKS.base.files=[{path:'onnx/encoder_model_quantized.onnx',size:11,sha256:__m},{path:'config.json',size:2}];VOICE_LOCAL_TF.size=9;VOICE_LOCAL_TF.sha256b64=__tf;VOICE_LOCAL_ORT.asyncify[0].size=7;VOICE_LOCAL_ORT.asyncify[0].sha256b64=__mjs;VOICE_LOCAL_ORT.asyncify[1].size=8;VOICE_LOCAL_ORT.asyncify[1].sha256b64=__wasm");
 const body:any={'transformers.min.js':'tf-module','asyncify.mjs':'ort-mjs','asyncify.wasm':'ort-wasm','encoder_model_quantized.onnx':'model-bytes','config.json':'{}'};
 c.__fetch=async(u:string)=>{fetched.push(u);const k=Object.keys(body).find(k=>u.endsWith(k));return k?new Response(body[k]):new Response('',{status:404})};
 const progress:number[]=[];c.__p=(f:number)=>progress.push(f);
 assert.equal(await run(c,"voiceLocalStatus('base')"),'none');
 assert.equal(await run(c,"voiceLocalDownload('base',__p,{fetchFn:__fetch})"),'ready');
 assert.equal(fetched.length,5);assert.ok(fetched.every(u=>/^https:\/\/(cdn\.jsdelivr\.net|huggingface\.co)\//.test(u)),'only the pinned hosts are contacted');
 assert.equal(progress.at(-1),1);assert.ok(progress.every((p,i)=>i===0||p>=progress[i-1]),'progress is monotonic');
 assert.equal(await run(c,"voiceLocalStatus('base')"),'ready');
 const cached=[...caches.stores.get('bep-voice-models-v1')!.keys()];assert.ok(cached.includes('https://kitchen.test/voice-local-worker.js'),'worker copy kept for offline start');
 assert.equal(await run(c,"voiceLocalStatus('small')"),'none','shared runtime alone does not count as the other pack');
 // A second download is a no-op (all present).
 fetched.length=0;await run(c,"voiceLocalDownload('base',null,{fetchFn:__fetch})");assert.equal(fetched.length,0);
 run(c,"voiceLocalSetChoice=function(v){globalThis.__choice=v};voiceLocalChoice=()=>'base'");
 assert.equal(await run(c,"voiceLocalRemove('base')"),'none');assert.equal(await run(c,"voiceLocalStatus('base')"),'none');assert.equal(run(c,'__choice'),'','removing the chosen pack switches back to the browser recogniser');
 assert.equal(caches.stores.get('bep-voice-models-v1')!.size,0,'runtime removed when no pack is left');
 // Integrity: tampered weights are rejected and not cached.
 body['encoder_model_quantized.onnx']='model-byteZ';
 await assert.rejects(()=>run(c,"voiceLocalDownload('base',null,{fetchFn:__fetch})"),(e:any)=>e.code==='integrity');
 assert.equal(await caches.open('bep-voice-models-v1').then((x:any)=>x.match(run(c,"voiceLocalPackFiles('base')[0].url"))),undefined);
 // Not enough storage.
 run(c,"navigator.storage.estimate=async()=>({quota:10,usage:9})");body['encoder_model_quantized.onnx']='model-bytes';
 await assert.rejects(()=>run(c,"voiceLocalDownload('base',null,{fetchFn:__fetch})"),(e:any)=>e.code==='quota');
});
t('recognizer: segments to text with the language hint, stop/abort, fallback when unavailable',async()=>{
 const c=ctx({localStorage:{getItem:()=>null,setItem(){},removeItem(){}}});
 const calls:any[]=[];let onFrame:any=null,stopped=0;
 c.__deps={probe:async()=>({packs:{base:{ok:true},small:{ok:false}}}),status:async()=>'ready',langMode:()=>'toggle',segmenter:{partialMs:99999},
  ensure:async()=>({transcribe:async(audio:any,lang:any,final:boolean)=>{calls.push({n:audio.length,lang,final});return{text:final?' hai ký thịt ba chỉ ':'hai'}}}),
  record:async(cb:any)=>{onFrame=cb;return{stop(){stopped++}}}};
 const results:any[]=[],ends:any[]=[];c.__r=(t:string,f:boolean)=>results.push([t,f]);c.__e=(i:any)=>ends.push(i.reason);
 const rec=run(c,"voiceLocalRecognizer('base',__deps)");assert.equal(rec.id,'local-base');assert.equal(await rec.available(),true);
 const ctl=await rec.start('vi-VN',c.__r,c.__e);
 const frame=(a:number)=>{const f=new Float32Array(160);for(let i=0;i<160;i++)f[i]=a*Math.sin(i/3);return f};
 for(let i=0;i<20;i++)onFrame(frame(0.001));for(let i=0;i<80;i++)onFrame(frame(0.2));for(let i=0;i<90;i++)onFrame(frame(0.001));
 await new Promise(r=>setTimeout(r,10));
 assert.deepEqual(results,[['hai ký thịt ba chỉ',true]]);assert.equal(calls[0].lang,'vietnamese');assert.equal(calls[0].final,true);
 for(let i=0;i<40;i++)onFrame(frame(0.2));await ctl.stop(false);await new Promise(r=>setTimeout(r,10));
 assert.equal(stopped,1);assert.equal(results.length,2,'stop flushes the last words');assert.deepEqual(ends,['stopped']);
 // Auto language → no hint.
 c.__deps.langMode=()=>'auto';const r2=run(c,"voiceLocalRecognizer('base',__deps)");const ctl2=await r2.start('en-AU',c.__r,c.__e);for(let i=0;i<40;i++)onFrame(frame(0.2));await ctl2.stop(true);
 assert.equal(ends.at(-1),'aborted');
 const r3=run(c,"voiceLocalRecognizer('base',__deps)");const ctl3=await r3.start('en-AU',c.__r,c.__e);for(let i=0;i<40;i++)onFrame(frame(0.2));for(let i=0;i<90;i++)onFrame(frame(0.001));await new Promise(r=>setTimeout(r,10));assert.equal(calls.at(-1).lang,null);await ctl3.stop(true);
 // Unavailable → caller falls back; engine failure reports an error end.
 c.__deps.status=async()=>'none';assert.equal(await run(c,"voiceLocalRecognizer('base',__deps)").available(),false);
 c.__deps.status=async()=>'ready';c.__deps.probe=async()=>({packs:{base:{ok:false},small:{ok:false}}});assert.equal(await run(c,"voiceLocalRecognizer('base',__deps)").available(),false);
 c.__deps.ensure=async()=>{throw Object.assign(new Error('boom'),{code:'load'})};
 await assert.rejects(()=>run(c,"voiceLocalRecognizer('base',__deps)").start('vi-VN',c.__r,c.__e));assert.equal(ends.at(-1),'error');
});
t('worker protocol with a fake engine (handler + client over a fake Worker)',async()=>{
 const w=vm.createContext({console,Date,Math,URL,Float32Array,Promise,setTimeout});vm.runInContext(fs.readFileSync('dist/voice-local-worker.js','utf8'),w);
 assert.equal(typeof w.voiceLocalWorkerHandler,'function');
 const posted:any[]=[];let loads=0;
 const engine=async(o:any)=>{loads++;o.progress({status:'progress',file:'onnx/encoder_model_quantized.onnx',progress:50});assert.equal(o.pack.model,'onnx-community/whisper-base');assert.equal(o.cacheName,'bep-voice-models-v1');return{transcribe:async(a:Float32Array,{language,final}:any)=>{await new Promise(r=>setTimeout(r,final?5:1));return `len=${a.length} lang=${language} final=${final}`},dispose(){posted.push({type:'engine-disposed'})}}};
 const h=w.voiceLocalWorkerHandler({createEngine:engine,post:(m:any)=>posted.push(JSON.parse(JSON.stringify(m))),now:()=>1000});
 await h({type:'hello',id:1,v:1});assert.deepEqual(posted.pop(),{type:'hello',id:1,v:1});
 await h({type:'hello',id:2,v:9});assert.equal(posted.pop().code,'version');
 await h({type:'transcribe',id:3,v:1,audio:new Float32Array(16000),language:'vietnamese'});assert.equal(posted.pop().code,'not-loaded');
 await h({type:'load',id:4,v:1,pack:{id:'base',model:'onnx-community/whisper-base',revision:'x'},runtime:{},cacheName:'bep-voice-models-v1'});
 assert.deepEqual(posted.splice(0),[{type:'progress',id:4,status:'progress',file:'onnx/encoder_model_quantized.onnx',progress:50},{type:'loaded',id:4,ms:0}]);
 const a=h({type:'transcribe',id:5,v:1,audio:new Float32Array(32000),language:'vietnamese',final:true}),b=h({type:'transcribe',id:6,v:1,audio:new Float32Array(8000),language:null,final:false});await Promise.all([a,b]);
 assert.deepEqual(posted.splice(0).map((m:any)=>[m.type,m.id,m.text,m.seconds]),[['result',5,'len=32000 lang=vietnamese final=true',2],['result',6,'len=8000 lang=null final=false',0.5]],'serial, in order');
 await h({type:'transcribe',id:7,v:1,audio:[1,2,3]});assert.equal(posted.pop().code,'audio');
 await h({type:'nope',id:8,v:1});assert.equal(posted.pop().code,'unknown');
 await h({type:'dispose',id:9,v:1});assert.deepEqual(posted.splice(0).map((m:any)=>m.type),['engine-disposed','disposed']);
 // Engine load failure is reported, not thrown.
 const h2=w.voiceLocalWorkerHandler({createEngine:async()=>{throw Object.assign(new Error('pack not downloaded'),{code:'not-downloaded'})},post:(m:any)=>posted.push(m)});
 await h2({type:'load',id:1,v:1,pack:{},runtime:{}});assert.equal(posted.pop().code,'not-downloaded');
 // Client ↔ handler through a fake Worker (structured messages, transferred audio buffer).
 const c=ctx();const fake:any={terminated:false,postMessage(m:any,transfer:any[]){assert.ok(Array.isArray(transfer));queueMicrotask(()=>h3(m))},terminate(){this.terminated=true}};
 const h3=w.voiceLocalWorkerHandler({createEngine:engine,post:(m:any)=>queueMicrotask(()=>fake.onmessage({data:m}))});
 c.__w=fake;const client=run(c,'voiceLocalClient(__w)');
 assert.equal((await client.hello()).v,1);const prog:any[]=[];
 await client.load({id:'base',model:'onnx-community/whisper-base',revision:'r'},{},(p:any)=>prog.push(p.file));assert.deepEqual(prog,['onnx/encoder_model_quantized.onnx']);
 const res=await client.transcribe(new Float32Array(1600),'english',true);assert.equal(res.text,'len=1600 lang=english final=true');
 const pending=client.transcribe(new Float32Array(1600),'english',true);client.dispose();await assert.rejects(pending,(e:any)=>e.code==='stopped');assert.equal(fake.terminated,true);
 assert.equal(loads,2);
});
t('worker real engine refuses a tampered runtime and never fetches the network',async()=>{
 const caches=fakeCaches(),w=vm.createContext({console,Date,Math,URL,Blob,Response,crypto:webcrypto,btoa,caches,fetch:()=>{throw Error('network used')}});vm.runInContext(fs.readFileSync('dist/voice-local-worker.js','utf8'),w);
 await assert.rejects(()=>w.voiceLocalTransformersEngine({pack:{},runtime:{module:{url:'https://cdn.jsdelivr.net/x.js',sha256b64:'x'}},cacheName:'bep-voice-models-v1',progress(){}}),(e:any)=>e.code==='not-downloaded');
 (await caches.open('bep-voice-models-v1')).put('https://cdn.jsdelivr.net/x.js',new Response('export const env={}'));
 await assert.rejects(()=>w.voiceLocalTransformersEngine({pack:{},runtime:{module:{url:'https://cdn.jsdelivr.net/x.js',sha256b64:'not-the-hash'}},cacheName:'bep-voice-models-v1',progress(){}}),(e:any)=>e.code==='integrity');
});
(async()=>{for(const [name,fn] of tests){try{await fn();count++}catch(e:any){e.message=name+': '+e.message;throw e}}console.log(`voice-local: ${count} checks passed (stub engine, no model download).`)})().catch(e=>{console.error(e);process.exit(1)});
