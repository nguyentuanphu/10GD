// v1.7.4 iPhone memory work for on-device "More accurate" voice (Henry, iPhone 14 Pro Max: the page was reloaded for
// memory). Checks, with fakes (no model, no audio):
//  - the worker serves each weight file ONCE as one buffer, one file at a time (decoder first), and frees (detaches) it
//    as soon as ONNX Runtime has copied it into WebAssembly memory; a fallback never lets loading hang;
//  - transformers.js gets the low-memory session options, single thread, no proxy, its own browser cache off;
//  - iPhone/iPad load options (one thread, no WebGPU, plain runtime) and unchanged decode settings (accuracy);
//  - a progress message never settles the load (v1.7.3 bug: "loaded" at the first progress message);
//  - the WebAssembly memory meter used by the self-check page;
//  - crash counting: one guarded "Thử lại" after a memory crash, disabled after the second until the version changes;
//    no automatic load/switch after a crash; the iPhone dictation tip; "Gỡ gói" reports the space freed;
//  - the self-check: pass (timings, memory), error, page died in a phase → shown after the reload.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const webcrypto=require('node:crypto').webcrypto;
let count=0;const tests:any[]=[];const t=(name:string,fn:any)=>tests.push([name,fn]);
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const IPHONE='Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1';
const DESKTOP='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36';
function lsOf(store:Map<string,string>){return{getItem:(k:string)=>store.has(k)?store.get(k)!:null,setItem:(k:string,v:string)=>{store.set(k,String(v))},removeItem:(k:string)=>{store.delete(k)}}}
function pageCtx(store:Map<string,string>,extra:any={}){const c=vm.createContext({console,Intl,Date,Math,URL,TextEncoder,Response,Headers,Blob,crypto:webcrypto,btoa,atob,setTimeout,clearTimeout,setInterval,clearInterval,queueMicrotask,structuredClone,AbortController,DOMException,navigator:{onLine:true,userAgent:DESKTOP,maxTouchPoints:0},Float32Array,localStorage:lsOf(store),...extra});vm.runInContext(fs.readFileSync('dist/voice-local.js','utf8'),c);return c}
const run=(c:any,src:string)=>vm.runInContext(src,c);
const J=(c:any,src:string)=>JSON.parse(vm.runInContext('JSON.stringify('+src+')',c));
// The worker script in its own context (its own Uint8Array/WebAssembly, like a real worker).
function workerCtx(extra:any={}){const w=vm.createContext({console,Date,Math,URL,Response,Headers,Blob,Promise,setTimeout,clearTimeout,queueMicrotask,structuredClone,crypto:webcrypto,btoa,atob,...extra});vm.runInContext(fs.readFileSync('dist/voice-local-worker.js','utf8'),w);return w}
async function sha256b64(text:string){return Buffer.from(await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode(text))).toString('base64')}

t('weights: one buffer each, one file at a time, freed after ONNX Runtime copied it',async()=>{
 const w=workerCtx();
 // Pack files in a fake Cache Storage (byte sizes stand in for 92 MB / 157 MB).
 const ENC='https://huggingface.co/m/resolve/r/onnx/encoder_model_quantized.onnx',DEC='https://huggingface.co/m/resolve/r/onnx/decoder_model_merged_quantized.onnx',CFG='https://huggingface.co/m/resolve/r/config.json',MOD='https://cdn.example/transformers.min.js';
 const code='/* fake transformers */';const bodies:any={[ENC]:new Uint8Array(4096).fill(1),[DEC]:new Uint8Array(8192).fill(2),[CFG]:new TextEncoder().encode('{"model_type":"whisper"}'),[MOD]:new TextEncoder().encode(code)};
 const reads:any={};const events:string[]=[];
 const cache={async match(u:string){if(!bodies[u])return undefined;const r=new Response(bodies[u].slice(),{headers:{'Content-Length':String(bodies[u].length)}});const orig=r.arrayBuffer.bind(r);(r as any).arrayBuffer=async()=>{reads[u]=(reads[u]||0)+1;events.push('read '+u.split('/').pop());return orig()};
  const body:any=r.body,gr=body.getReader.bind(body);body.getReader=(...a:any[])=>{reads[u]=(reads[u]||0)+1;events.push('read '+u.split('/').pop());return gr(...a)};return r}};
 w.caches={open:async()=>cache};
 w.__events=events;w.__ENC=ENC;w.__DEC=DEC;
 // Installed first, as in the real worker (before the runtime creates its WebAssembly memory).
 const meter=run(w,'voiceLocalWorkerMemMeter(globalThis)');
 // A fake transformers.js: like 4.3.1 it fetches BOTH weight files at once (Promise.all) and reads them with arrayBuffer()
 // (no progress callback), and "ONNX Runtime" copies each model into WebAssembly memory with HEAPU8.set.
 const fakeModule=vm.runInContext(`(()=>{const env={backends:{onnx:{wasm:{}}}};const seen={};
  const mem=new WebAssembly.Memory({initial:1,maximum:16});const HEAPU8=()=>new Uint8Array(mem.buffer);
  async function getFile(u){const r=await env.fetch(u,{headers:new Headers()});return new Uint8Array(await r.arrayBuffer())}
  async function create(name,bytes){__events.push('create '+name+' '+bytes.byteLength);HEAPU8().set(bytes,0);seen[name]=bytes;await new Promise(r=>setTimeout(r,5))}
  async function pipeline(task,model,opts){seen.opts=opts;seen.envAtLoad={useBrowserCache:env.useBrowserCache,numThreads:env.backends.onnx.wasm.numThreads,proxy:env.backends.onnx.wasm.proxy};
   const probe=await env.fetch(__ENC,{headers:new Headers({Range:'bytes=0-0'})});seen.probe={status:probe.status,range:probe.headers.get('Content-Range')};
   await getFile('https://huggingface.co/m/resolve/main/config.json');
   let chain=Promise.resolve();await Promise.all([['encoder',__ENC],['decoder',__DEC]].map(async([n,u])=>{const b=await getFile(u);chain=chain.then(()=>create(n,b));await chain}));
   return Object.assign(async()=>({text:'ok'}),{dispose(){}})}
  return{env,pipeline,seen,mem}})()`,w);
 w.__mod=fakeModule;
 assert.equal(meter().wasmMB,0,'64 KB fake memory rounds to 0 MB');assert.equal(run(w,'WebAssembly.Memory.__bepMeter.length'),1,'the runtime memory is seen');
 const t0=Date.now();
 const eng=await run(w,`voiceLocalTransformersEngine({pack:{id:'small',model:'m',revision:'r'},runtime:{module:{url:'${MOD}',sha256b64:'${await sha256b64(code)}'},mjs:'a.mjs',wasm:'a.wasm',threads:1,gpu:false,lowMemory:true},cacheName:'bep-voice-models-v1',importer:async()=>__mod})`);
 const ev=events.join(' | ');assert.ok(Date.now()-t0<5000,'released by the seen copy, not by the 20 s fallback');
 assert.equal(reads[ENC],1,'encoder read once');assert.equal(reads[DEC],1,'decoder read once');
 assert.ok(ev.indexOf('create decoder 8192')<ev.indexOf('read encoder_model_quantized.onnx'),'the larger decoder goes first; the encoder is read only after the decoder was copied into WebAssembly memory: '+ev);
 assert.equal(fakeModule.seen.encoder.byteLength,0,'encoder buffer freed (detached) after the copy');
 assert.equal(fakeModule.seen.decoder.byteLength,0,'decoder buffer freed (detached) after the copy');
 assert.deepEqual(J(w,'__mod.seen.envAtLoad'),{useBrowserCache:false,numThreads:1,proxy:false});
 assert.deepEqual(J(w,'__mod.seen.opts.session_options'),{enableCpuMemArena:false,enableMemPattern:false,executionMode:'sequential'},'low-memory session');
 assert.deepEqual(J(w,'__mod.seen.opts.dtype'),{encoder_model:'q8',decoder_model_merged:'q8'},'same q8 model');
 assert.equal(run(w,'__mod.seen.opts.progress_callback'),undefined,'no progress callback (so the bytes are read with one arrayBuffer())');
 assert.deepEqual(J(w,'__mod.seen.probe'),{status:206,range:'bytes 0-0/4096'},'a size probe never reads the body');
 assert.ok(reads[CFG]>=1,'resolve/main is served from the pinned revision');
 assert.equal(eng.stats.released,2);assert.equal(eng.stats.fallback,0);assert.deepEqual(J(w,'__mod.seen.opts.device'),'wasm');
 assert.ok(!run(w,"Object.getOwnPropertyDescriptor(Uint8Array.prototype,'set')"),'Uint8Array.prototype.set restored after loading');
 assert.ok(eng.files.includes('onnx/encoder_model_quantized.onnx')&&eng.files.includes('onnx/decoder_model_merged_quantized.onnx'),'q8 weights read');
});
t('weights: a copy that is never seen releases the queue (no hang); nothing detached then',async()=>{
 const w=workerCtx();const timers:any[]=[];
 const gate=run(w,`voiceLocalWorkerWeightGate({fallbackMs:50})`);
 const mk=(n:number)=>new Response(new Uint8Array(n),{headers:{'Content-Length':String(n)}});
 const a=await gate.serve('x/encoder.onnx',mk(10));const pb=gate.serve('x/decoder.onnx',mk(20));
 let bDone=false;pb.then(()=>{bDone=true});await sleep(10);assert.equal(bDone,false,'second weight waits');
 const abA=await a.arrayBuffer();await sleep(80);assert.equal(bDone,true,'released by the fallback timer');assert.equal(abA.byteLength,10,'not detached without a seen copy');
 const b=await pb;const abB=await b.arrayBuffer();gate.finish();assert.equal(abB.byteLength,20);assert.equal(gate.stats.fallback,2);
 // Non-weight files pass through untouched.
 const r=mk(3);assert.equal(await gate.serve('x/config.json',r),r);
 void timers;
});
t('memory meter reads WebAssembly memory (the self-check page number)',()=>{
 const w=workerCtx();const meter=run(w,'voiceLocalWorkerMemMeter(globalThis)');
 run(w,'globalThis.__m=new WebAssembly.Memory({initial:32,maximum:64})');assert.equal(meter().wasmMB,2);
 run(w,'__m.grow(16)');const m=meter();assert.equal(m.wasmMB,3);assert.equal(m.wasmPeakMB,3);assert.equal(m.jsHeapMB,null);
 // The worker handler adds it to 'loaded' and 'result'.
 const posted:any[]=[];const h=run(w,'voiceLocalWorkerHandler')({createEngine:async()=>({transcribe:async()=>'x',dispose(){}}),post:(x:any)=>posted.push(x),meter});
 return h({type:'load',id:1,v:1,pack:{},runtime:{}}).then(()=>h({type:'transcribe',id:2,v:1,audio:run(w,'new Float32Array(1600)')})).then(()=>{assert.equal(posted[0].mem.wasmMB,3);assert.equal(posted[1].mem.wasmMB,3)});
});
t('iPhone/iPad options: one thread, no WebGPU, plain runtime; decoding unchanged',()=>{
 const store=new Map<string,string>();
 const ios=pageCtx(store,{navigator:{onLine:true,userAgent:IPHONE,maxTouchPoints:5,gpu:{},hardwareConcurrency:6}});
 const o=J(ios,'voiceLocalLoadOptions()');assert.equal(o.threads,1);assert.equal(o.gpu,false);assert.equal(o.lowMemory,true);assert.match(o.wasm,/ort-wasm-simd-threaded\.wasm$/,'plain build on iOS 26 too');
 const ipad=pageCtx(store,{navigator:{onLine:true,userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15',maxTouchPoints:5}});
 assert.match(J(ipad,'voiceLocalLoadOptions()').wasm,/ort-wasm-simd-threaded\.wasm$/,'iPad with a desktop user agent');
 const desk=pageCtx(store,{navigator:{onLine:true,userAgent:DESKTOP,maxTouchPoints:0}});assert.match(J(desk,'voiceLocalLoadOptions()').wasm,/asyncify\.wasm$/,'desktop unchanged');
 assert.equal(run(ios,'voiceLocalBytes(voiceLocalRuntime())'),586230+24381+14264838);
 const w=workerCtx();
 assert.deepEqual(J(w,'voiceLocalWorkerSessionOptions({lowMemory:true})'),{enableCpuMemArena:false,enableMemPattern:false,executionMode:'sequential'});
 assert.deepEqual(J(w,'voiceLocalWorkerDecodeOptions(16000*15,{language:"vietnamese",final:true})'),{language:'vietnamese',task:'transcribe',chunk_length_s:30,stride_length_s:5,return_timestamps:false,max_new_tokens:196,no_repeat_ngram_size:4},'same decoding as v1.7.2');
 assert.equal(J(w,'voiceLocalWorkerDecodeOptions(16000*30,{final:true})').max_new_tokens,224);
 assert.deepEqual(J(w,'voiceLocalWorkerChunks(new Float32Array(16000*25)).map(a=>a.length)'),[240000,160000],'≤ 20 s per inference');
});
t('a progress message never settles the load',async()=>{
 const store=new Map<string,string>(),c=pageCtx(store);let loadDone:any;
 const fake:any={postMessage(m:any){if(m.type==='load'){queueMicrotask(()=>fake.onmessage({data:{type:'progress',id:m.id,status:'download',file:'onnx/encoder_model_quantized.onnx'}}));loadDone=()=>fake.onmessage({data:{type:'loaded',id:m.id,ms:5,mem:{wasmMB:600}}})}},terminate(){}};
 c.__w=fake;const client=run(c,'voiceLocalClient(__w)');let settled=false;const p=client.load({id:'small'},{},null).then((r:any)=>{settled=true;return r});
 await sleep(10);assert.equal(settled,false,'still loading after a progress message (no callback given)');
 loadDone();const r=await p;assert.equal(r.type,'loaded');assert.equal(r.mem.wasmMB,600);
});
t('memory crashes: one guarded Try again, disabled after the second, back after a version change',async()=>{
 const store=new Map<string,string>();const asked:any[]=[];
 const boot=()=>{const c=pageCtx(store,{confirmDialog:async(o:any)=>{asked.push(o);return false},toast:()=>{}});return c};
 // Page died with the model in memory (iPhone).
 store.set('bep-voice-local-busy',JSON.stringify({pack:'small',phase:'self-test',at:1,v:2}));
 let c=boot();let f=J(c,'voiceLocalCheckCrash()');assert.equal(f.crashes,1);assert.equal(run(c,"voiceLocalDisabled('small')"),false);
 assert.match(run(c,'voiceLocalFailureHtml(voiceLocalFailed())'),/data-vl-retry="small"/,'Thử lại offered after the first crash');
 assert.match(run(c,'voiceLocalFailText(voiceLocalFailed())'),/^Giọng chính xác tạm tắt vì máy thiếu bộ nhớ/);
 await run(c,"voiceLocalRetry('small')");assert.match(asked[0].body,/tải lại một lần nữa/);
 // Automatic paths never load it again after a crash, even when the failure record is gone (pack removed + re-downloaded).
 store.delete('bep-voice-local-fail');c=boot();
 assert.equal(J(c,"(()=>{voiceLocalCap={ok:true,ios:true,packs:{small:{ok:true}}};return 1})()"),1);
 run(c,"voiceLocalStatus=async()=>'ready';voiceLocalEnsureEngine=async()=>{throw Error('must not load')}");
 assert.equal(await run(c,'voiceAutoMaybeSwitch()'),false);
 const inputs=await run(c,'voiceAutoInputs()');assert.equal(inputs.failed,true,'no automatic download/switch after a crash');
 // Second crash → disabled: no button, no self-test, no retry.
 store.set('bep-voice-local-busy',JSON.stringify({pack:'small',phase:'transcribing',at:2,v:2}));
 c=boot();f=J(c,'voiceLocalCheckCrash()');assert.equal(f.crashes,2);assert.equal(run(c,"voiceLocalDisabled('small')"),true);
 assert.doesNotMatch(run(c,'voiceLocalFailureHtml(voiceLocalFailed())'),/data-vl-retry/);assert.doesNotMatch(run(c,'voiceLocalCrashNoticeHtml(voiceLocalFailed())'),/data-vl-retry/);
 assert.match(run(c,'voiceLocalFailText(voiceLocalFailed())'),/2 lần[\s\S]*bản cập nhật/);
 assert.equal(await run(c,"voiceLocalRetry('small')"),false);assert.equal(asked.length,1,'no second dialog');
 run(c,"voiceLocalStatus=async()=>'ready'");assert.equal(await run(c,"voiceLocalSelfTest('small',{force:true})"),false);
 assert.equal(run(c,"voiceLocalUsable('small')"),false);
 // A download that dies does not count as a memory crash.
 store.set('bep-voice-local-busy',JSON.stringify({pack:'small',phase:'downloading',at:3,v:2}));c=boot();assert.equal(J(c,'voiceLocalCheckCrash()').crashes,2);
 // A new app/pack version: counting starts again (one guarded try).
 const rec=JSON.parse(store.get('bep-voice-local-crashes')!);store.set('bep-voice-local-crashes',JSON.stringify({...rec,ver:'1.7.3|old'}));
 c=boot();assert.equal(run(c,"voiceLocalDisabled('small')"),false);assert.equal(run(c,"voiceLocalCrashCount('small')"),0);
});
t('iPhone dictation tip whenever accurate voice is not in use; button opens the keyboard',()=>{
 const store=new Map<string,string>();
 const els:any={};let inserted='';let focused='';
 const box:any={id:'voice-text',value:'abc',focus(){focused='voice-text'},setSelectionRange(a:number,b:number){box.sel=[a,b]},closest:()=>({insertAdjacentHTML:(_:string,h:string)=>{inserted=h;els['vl-dictate-voice-text']={dataset:{lang:'vi'},remove(){delete els['vl-dictate-voice-text']}}}})};
 els['voice-text']=box;
 const document:any={getElementById:(id:string)=>els[id]||null,readyState:'complete',addEventListener(){},querySelector:()=>null,body:{insertAdjacentHTML(){}}};
 let stopped=0;const c=pageCtx(store,{navigator:{onLine:true,userAgent:IPHONE,maxTouchPoints:5},document,stopVoice:()=>{stopped++},voiceSetUi:()=>{}});
 assert.equal(run(c,'voiceLocalDictationWanted()'),true);assert.equal(run(c,'voiceLocalDictationTip()'),1);
 assert.match(inserted,/Trên iPhone: chạm vào ô chữ rồi bấm 🎤 trên bàn phím để đọc chính tả \(tiếng Việt rất tốt\)\./);assert.match(inserted,/data-vl-dictate="voice-text"[^>]*>⌨️ Mở bàn phím để nói/);
 assert.equal(run(c,'voiceLocalDictationTip()'),0,'shown once');
 assert.equal(run(c,"voiceLocalOpenKeyboard('voice-text')"),true);assert.equal(focused,'voice-text');assert.equal(stopped,1,'own listening stopped first');assert.deepEqual(box.sel,[3,3]);
 // Accurate voice in use on this iPhone → no tip.
 store.set('bep-voice-recognizer','local-small');store.set('bep-voice-local-selftest',JSON.stringify({pack:'small',ok:true,v:1}));
 assert.equal(run(c,'voiceLocalDictationWanted()'),false);run(c,'voiceLocalDictationTip()');assert.equal(els['vl-dictate-voice-text'],undefined,'removed');
 // Not on iPhone → never.
 const d=pageCtx(new Map(),{document});assert.equal(run(d,'voiceLocalDictationWanted()'),false);
});
t('Gỡ gói reports the space freed',async()=>{
 const store=new Map<string,string>();const m=new Map<string,any>();
 const cache={async match(u:string){return m.get(String(u))?.clone()},async put(u:string,r:any){m.set(String(u),r)},async delete(u:string){return m.delete(String(u))},async keys(){return[]}};
 const c=pageCtx(store,{caches:{open:async()=>cache,has:async()=>true},location:{href:'https://kitchen.example/'}});
 for(const f of J(c,"[...voiceLocalRuntime(),...voiceLocalPackFiles('small')]"))m.set(f.url,new Response('x',{headers:{'Content-Length':String(f.size)}}));
 await run(c,"voiceLocalRemove('small')");const freed=run(c,'voiceLocalLastFreed');
 assert.equal(freed,run(c,"voiceLocalPackBytes('small')+voiceLocalBytes(voiceLocalRuntime())"));assert.equal(m.size,0);
 assert.equal(run(c,'voiceLocalRemovedText(voiceLocalLastFreed)'),'Đã gỡ gói giọng chính xác — giải phóng 279 MB trên máy.');
});
t('self-check: pass with timings and memory, error, and "died in phase" after a reload',async()=>{
 const store=new Map<string,string>();
 const c=pageCtx(store,{navigator:{onLine:true,userAgent:IPHONE,maxTouchPoints:5,deviceMemory:undefined,hardwareConcurrency:6},performance:{memory:undefined}});
 run(c,"voiceLocalStatus=async()=>'ready';voiceLocalCap={ok:true,ios:true,packs:{small:{ok:true}}};");
 const phases:string[]=[];c.__ph=(p:string)=>phases.push(p);
 run(c,"voiceLocalEnsureEngine=async(id,p,o)=>{const rec=JSON.parse(localStorage.getItem('bep-voice-local-check'));__seen=rec.phase;voiceLocalEngine={pack:id,device:'wasm',loaded:{ms:900,mem:{wasmMB:600,wasmPeakMB:600}},transcribe:async()=>({text:'',mem:{wasmMB:724,wasmPeakMB:724}}),dispose(){}};return voiceLocalEngine}");
 const r=await run(c,"voiceLocalSelfCheck('small',{onPhase:__ph})");
 assert.equal(r.ok,true);assert.equal(r.phase,'done');assert.equal(r.mem.wasmPeakMB,724);assert.equal(r.device.cls,'iphone');assert.equal(typeof r.loadMs,'number');assert.equal(typeof r.transcribeMs,'number');
 assert.equal(run(c,'__seen'),'loading-model','the phase is stored BEFORE the model loads');
 assert.deepEqual(phases,['starting','loading-model','transcribing']);
 assert.equal(run(c,"voiceLocalSelfTestPassed('small')"),true,'counts as the iPhone self-test');
 const rows=J(c,'voiceLocalCheckRows(voiceLocalCheckRecord())').map((x:any)=>x.join(': ')).join('\n');
 assert.match(rows,/Thiết bị: iPhone · 6 nhân/);assert.match(rows,/Kết quả: Đạt/);assert.match(rows,/Bước đã tới: Xong/);assert.match(rows,/Bộ nhớ cao nhất \(mô hình\): 724 MB/);assert.match(rows,/Thời gian nạp: /);
 assert.match(run(c,'voiceLocalCheckText(voiceLocalCheckRecord())'),/Kiểm tra giọng chính xác · 1\.7\.4[\s\S]*UA: Mozilla/);
 // An error in the run: not passed, the device is marked.
 run(c,"voiceLocalEnsureEngine=async()=>{throw Object.assign(Error('oom'),{code:'crash'})}");
 const r2=await run(c,"voiceLocalSelfCheck('small')");assert.equal(r2.ok,false);assert.equal(r2.code,'crash');assert.equal(r2.phase,'loading-model');assert.ok(run(c,"voiceLocalFailed('small')"));
 // The page dies while the clip is being recognised: marker + running record left behind → next start shows the phase.
 store.delete('bep-voice-local-fail');
 store.set('bep-voice-local-check',JSON.stringify({pack:'small',v:1,running:true,phase:'transcribing',at:5}));store.set('bep-voice-local-busy',JSON.stringify({pack:'small',phase:'self-test',at:5,v:2}));
 const c2=pageCtx(store,{navigator:{onLine:true,userAgent:IPHONE,maxTouchPoints:5}});
 const f=J(c2,'voiceLocalCheckCrash()');assert.equal(f.notice,'check','the check page shows it, not the generic notice');
 const rec=J(c2,'voiceLocalCheckRecord()');assert.equal(rec.died,true);assert.equal(rec.phase,'transcribing');assert.equal(rec.open,true);assert.equal(rec.running,false);
 assert.match(J(c2,'voiceLocalCheckRows(voiceLocalCheckRecord())').map((x:any)=>x.join(': ')).join('\n'),/Kết quả: Trang bị tắt \(máy thiếu bộ nhớ\)\nBị tắt ở bước: Nhận dạng đoạn mẫu/);
 // Disabled device: the check does not run.
 store.set('bep-voice-local-crashes',JSON.stringify({pack:'small',ver:run(c2,"voiceLocalGuardVersion('small')"),n:2}));
 run(c2,"voiceLocalStatus=async()=>'ready';voiceLocalEnsureEngine=async()=>{throw Error('must not load')}");
 assert.equal((await run(c2,"voiceLocalSelfCheck('small')")).code,'disabled');
});

(async()=>{for(const [name,fn] of tests){try{await fn();count++}catch(e:any){console.error('FAIL',name);throw e}}console.log(`voice-ios-memory: ${count} checks passed (fake worker, cache and runtime; no model).`)})().catch(e=>{console.error(e);process.exit(1)});
