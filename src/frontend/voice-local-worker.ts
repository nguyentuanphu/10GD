'use strict';
// Web Worker for on-device speech recognition (see voice-local.ts).
// Protocol v1 — every request carries {id, v:1}; every reply echoes the id:
//   {type:'hello'}                                   → {type:'hello', v}
//   {type:'load', pack:{id,model,revision}, runtime:{module:{url,sha256b64},mjs,wasm,threads,gpu,lowMemory}, cacheName}
//                                                    → {type:'progress', ...}* then {type:'loaded', ms, mem}
//   {type:'transcribe', audio:Float32Array(16 kHz mono), language:'vietnamese'|'english'|null, final}
//                                                    → {type:'result', text, final, ms, seconds, mem}
//   {type:'dispose'}                                 → {type:'disposed'}
//   any failure                                      → {type:'error', code, message}
// Transcriptions run one at a time in arrival order. Audio stays in this worker; the
// model and runtime are read from Cache Storage only (fetch is replaced by a cache
// lookup), so recognising speech makes no network request. Output length is capped by the
// audio length (≈12 tokens/s) and n-gram repeats are blocked, which stops Whisper's
// runaway loops on silence/noise.
// `mem` (v1.7.4) = {wasmMB, wasmPeakMB, jsHeapMB|null}: the WebAssembly memory of ONNX Runtime (it never shrinks, so its
// size is the high-water mark) — readable on every browser, iPhone included; shown on the self-check page.
const VOICE_LOCAL_WORKER_PROTOCOL=1;

function voiceLocalWorkerHandler({createEngine,post,now=()=>Date.now(),meter=null}){
 let engine=null,loading=null,chain=Promise.resolve();
 const fail=(id,code,message)=>post({type:'error',id,code,message:String(message||code)});
 const mem=()=>{try{return meter?meter():null}catch{return null}};
 return function handle(m){
  m=m||{};const id=m.id;
  if(m.v!==VOICE_LOCAL_WORKER_PROTOCOL){fail(id,'version','protocol version mismatch');return Promise.resolve()}
  if(m.type==='hello'){post({type:'hello',id,v:VOICE_LOCAL_WORKER_PROTOCOL});return Promise.resolve()}
  if(m.type==='load'){
   const t=now();
   loading=(async()=>{try{engine?.dispose?.()}catch{}engine=null;engine=await createEngine({pack:m.pack,runtime:m.runtime,cacheName:m.cacheName,progress:p=>post({type:'progress',id,status:p?.status||'',file:p?.file||'',progress:typeof p?.progress==='number'?p.progress:null})});return engine})();
   return loading.then(e=>post({type:'loaded',id,ms:now()-t,device:e?.device||'wasm',files:Array.isArray(e?.files)?e.files.slice(0,20):[],...(e?.stats?{stats:e.stats}:{}),...(mem()?{mem:mem()}:{})}),e=>{engine=null;fail(id,e?.code||'load',e?.message)});
  }
  if(m.type==='transcribe'){
   chain=chain.then(async()=>{
    try{await loading}catch{}
    if(!engine){fail(id,'not-loaded','engine not loaded');return}
    const audio=m.audio;if(!(audio instanceof Float32Array)||!audio.length){fail(id,'audio','no audio');return}
    const t=now();
    // v1.7.2: at most 20 s (16 kHz) per inference — longer audio is decoded in 15 s pieces, so the encoder input and the
    // decoder output stay bounded (iOS kills the page when memory spikes).
    try{const parts=voiceLocalWorkerChunks(audio),texts=[];for(const part of parts)texts.push(String(await engine.transcribe(part,{language:m.language||null,final:!!m.final})||'').trim());
     post({type:'result',id,text:texts.filter(Boolean).join(' '),final:!!m.final,ms:now()-t,seconds:Math.round(audio.length/1600)/10,chunks:parts.length,...(mem()?{mem:mem()}:{})})}
    catch(e){fail(id,e?.code||'transcribe',e?.message)}
   });
   return chain;
  }
  if(m.type==='dispose'){try{engine?.dispose?.()}catch{}engine=null;post({type:'disposed',id});return Promise.resolve()}
  fail(id,'unknown','unknown message type');return Promise.resolve();
 };
}

const VOICE_LOCAL_WORKER_MAX_SAMPLES=16000*20,VOICE_LOCAL_WORKER_CHUNK_SAMPLES=16000*15;
function voiceLocalWorkerChunks(audio){if(audio.length<=VOICE_LOCAL_WORKER_MAX_SAMPLES)return[audio];const out=[];for(let o=0;o<audio.length;o+=VOICE_LOCAL_WORKER_CHUNK_SAMPLES){const part=audio.subarray(o,Math.min(audio.length,o+VOICE_LOCAL_WORKER_CHUNK_SAMPLES));if(part.length>=1600||!out.length)out.push(part)}return out}
function voiceLocalWorkerB64(buf){let s='';const a=new Uint8Array(buf);for(let i=0;i<a.length;i+=32768)s+=String.fromCharCode.apply(null,a.subarray(i,i+32768));return btoa(s)}

// ---------- memory meter (v1.7.4) ----------
// Records the WebAssembly.Memory objects ONNX Runtime creates in this worker (installed before the runtime is imported).
// Reading buffer.byteLength costs nothing and works in Safari, so the self-check page can show real numbers on an iPhone.
function voiceLocalWorkerMemMeter(scope){
 const W=scope?.WebAssembly;if(!W||typeof W.Memory!=='function')return()=>null;
 const mems=[];let peak=0;
 if(!W.Memory.__bepMeter){const Orig=W.Memory;const P=new Proxy(Orig,{construct(t,a,nt){const mm=Reflect.construct(t,a,nt);mems.push(mm);return mm}});P.__bepMeter=mems;try{W.Memory=P}catch{}}
 const list=W.Memory.__bepMeter||mems;
 return()=>{let b=0;for(const mm of list){try{b+=mm.buffer.byteLength}catch{}}peak=Math.max(peak,b);const heap=scope?.performance?.memory?.usedJSHeapSize;return{wasmMB:Math.round(b/1048576),wasmPeakMB:Math.round(peak/1048576),jsHeapMB:typeof heap==='number'?Math.round(heap/1048576):null}};
}

// ---------- one copy of each weight file (v1.7.4) ----------
// Measured in Chromium (docs/reviews/v1.7.4/voice-ios-memory): transformers.js reads BOTH weight files (92 + 157 MB) at once
// and keeps each as a JS buffer after ONNX Runtime has copied it into WebAssembly memory; nothing frees them until a
// garbage collection that may never come in an idle worker, so ~250 MB sat on top of every inference peak. Here the
// cache-only fetch hands out each weight file as ONE buffer it allocates itself, one file at a time — the larger decoder
// first (measured: its session is built while nothing else is resident, so the WebAssembly high-water mark is lower and
// the load peak −200 MB) — and frees it (detaches it: transfer(0)) as soon as ONNX Runtime has copied it.
// Detection: ONNX Runtime copies the model with HEAPU8.set(model, ptr); a watched buffer copied into WebAssembly memory is
// released on the next task (the session is created synchronously in between). A fallback timer releases the queue if
// that copy is never seen (another runtime version), so loading can never hang; the buffer is then left to the GC.
function voiceLocalWorkerDetach(ab){try{if(!ab||ab.byteLength===0)return false;if(typeof ab.transfer==='function'){ab.transfer(0);return true}if(typeof structuredClone==='function'){structuredClone(ab,{transfer:[ab]});return true}}catch{}return false}
// Reads a cached body into ONE buffer this script allocates. In Chromium a buffer made by Response.arrayBuffer() stays
// alive (the browser's own wrapper holds it) until the next full garbage collection even after it is detached; a buffer
// allocated here is freed the moment it is detached. Pieces of the stream are copied in as they arrive (no second
// whole-file copy). Falls back to arrayBuffer() when the size is unknown or streams are missing.
async function voiceLocalWorkerReadOwned(res){const n=+(res.headers?.get?.('Content-Length')||0);
 if(!n||!res.body?.getReader)return res.arrayBuffer();
 const ab=new ArrayBuffer(n),u8=new Uint8Array(ab),reader=res.body.getReader();let o=0;
 for(;;){const {done,value}=await reader.read();if(done)break;if(o+value.length>n){try{reader.cancel()}catch{}return(await res.clone?.().arrayBuffer?.())||ab}u8.set(value,o);o+=value.length}
 return o===n?ab:ab.slice(0,o)}
// `first` (a pattern) makes that weight file go first when both are requested together; the other one waits for it (at
// most `firstWaitMs` for it to be requested at all).
function voiceLocalWorkerWeightGate({scope=globalThis,isWeight=(u:string)=>/\.onnx(\?|$)/.test(u),fallbackMs=20000,first=null as any,firstWaitMs=3000,setTimer=(f,ms)=>setTimeout(f,ms),clearTimer=t=>clearTimeout(t)}={}){
 const watched=new Map();let queue=Promise.resolve(),patched=null;const stats={weights:[],released:0,fallback:0};
 let firstDone;const firstGate=new Promise(r=>firstDone=r);let firstSeen=false;
 const U8=scope.Uint8Array;
 const isWasmBuffer=b=>{const ms=scope.WebAssembly?.Memory?.__bepMeter;if(!ms)return typeof SharedArrayBuffer!=='undefined'&&b instanceof SharedArrayBuffer;return ms.some(mm=>{try{return mm.buffer===b}catch{return false}})};
 const install=()=>{if(patched||!U8?.prototype)return;const own=Object.getOwnPropertyDescriptor(U8.prototype,'set');const orig=U8.prototype.set;
  patched={own,orig};
  Object.defineProperty(U8.prototype,'set',{configurable:true,writable:true,value:function(src,off){const r=orig.call(this,src,off);try{const ab=src&&src.buffer;const w=ab&&watched.get(ab);if(w&&!w.copied&&isWasmBuffer(this.buffer)){w.copied=true;setTimer(()=>w.release('copied'),0)}}catch{}return r}})};
 const uninstall=()=>{if(!patched)return;try{if(patched.own)Object.defineProperty(U8.prototype,'set',patched.own);else delete U8.prototype.set}catch{}patched=null};
 return{
  stats,install,uninstall,
  // Wraps a cache hit for a weight file: waits for the previous weight file, then serves this one as one buffer.
  async serve(url:string,res:any){
   if(!isWeight(url)||!res)return res;
   const isFirst=!!first&&first.test(url);if(isFirst)firstSeen=true;
   if(first&&!isFirst){let t=0;await Promise.race([firstGate,new Promise(r=>{t=setTimer(()=>{if(!firstSeen)r(0)},firstWaitMs)})]);clearTimer(t);if(firstSeen)await firstGate}
   let done;const turn=new Promise(r=>done=r);const prev=queue;queue=prev.then(()=>turn);await prev;
   install();
   const ab=await voiceLocalWorkerReadOwned(res);const entry:any={url,bytes:ab.byteLength,copied:false,released:false};stats.weights.push({file:url.split('/').pop(),mb:Math.round(ab.byteLength/1048576)});
   let timer=0;
   entry.release=why=>{if(entry.released)return;entry.released=true;if(isFirst)firstDone();clearTimer(timer);watched.delete(ab);if(why==='copied'){if(voiceLocalWorkerDetach(ab))stats.released++}else stats.fallback++;done()};
   timer=setTimer(()=>entry.release('fallback'),fallbackMs);
   watched.set(ab,entry);
   const headers=new Headers(res.headers);headers.set('Content-Length',String(ab.byteLength));
   const out=new Response(null,{status:200,headers});
   // transformers.js reads the bytes with arrayBuffer() (no progress callback is passed) — hand it this exact buffer.
   Object.defineProperty(out,'arrayBuffer',{value:async()=>ab});
   return out},
  // After the pipeline is built (or failed): nothing stays watched, set() is restored.
  finish(){for(const e of [...watched.values()])e.release(e.copied?'copied':'fallback');uninstall()}
 };
}

// Session options. v1.7.2 low-memory session: no CPU memory arena and no memory pattern — the arena grows in doubling
// steps and WebAssembly memory never shrinks, so its high-water mark stayed resident. v1.7.4: the same on every device;
// numThreads 1 + no proxy on iPhone/iPad (set by the page), WebGPU never on iPhone/iPad.
function voiceLocalWorkerSessionOptions(runtime){
 if(runtime?.lowMemory===false)return{};
 const so:any={enableCpuMemArena:false,enableMemPattern:false,executionMode:'sequential'};
 if(runtime?.graphOptimizationLevel)so.graphOptimizationLevel=runtime.graphOptimizationLevel;
 if(runtime?.sessionConfig&&typeof runtime.sessionConfig==='object')so.extra={session:{...runtime.sessionConfig}};
 return so}
// Decode settings (accuracy unchanged from v1.7.2): Whisper's own 30 s window, stride 5 s for anything longer.
function voiceLocalWorkerDecodeOptions(audioLength,{language,final}){return{language:language||null,task:'transcribe',chunk_length_s:30,stride_length_s:5,return_timestamps:false,max_new_tokens:Math.min(final?224:96,16+Math.ceil(audioLength/16000*12)),no_repeat_ngram_size:4}}

// Real engine: transformers.js (pinned, integrity-checked, from the pack cache) + Whisper q8 on WASM.
// `importer` (tests only) replaces the dynamic import of the verified module text; `scope` is where caches/Uint8Array live.
async function voiceLocalTransformersEngine({pack,runtime,cacheName,progress,importer=null,scope=globalThis}:any){
 const t0=Date.now(),stats:any={};
 const cache=await caches.open(cacheName);
 const hit=await cache.match(runtime.module.url);
 if(!hit)throw Object.assign(new Error('pack not downloaded'),{code:'not-downloaded'});
 let code=await hit.arrayBuffer();
 const digest=voiceLocalWorkerB64(await crypto.subtle.digest('SHA-256',code));
 if(digest!==runtime.module.sha256b64)throw Object.assign(new Error('runtime integrity check failed'),{code:'integrity'});
 let mod;if(importer){mod=await importer(code);code=null}
 else{const url=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));code=null;try{mod=await import(url)}finally{URL.revokeObjectURL(url)}}
 const {env,pipeline}=mod;
 // v1.7.4: transformers.js's own browser cache is off — every file goes through the cache-only fetch below, so the weight
 // files can be served one at a time as single buffers (useBrowserCache read them as streamed chunks into a second buffer).
 env.allowLocalModels=false;env.allowRemoteModels=true;env.useBrowserCache=false;env.useWasmCache=true;
 env.backends.onnx.wasm.wasmPaths={mjs:runtime.mjs,wasm:runtime.wasm};
 env.backends.onnx.wasm.numThreads=Math.max(1,runtime.threads|0);env.backends.onnx.wasm.proxy=false;
 // Cache-only fetch: anything not in the downloaded pack is "missing", never fetched.
 // Some loaders ask for `resolve/main/`; serve the pinned revision that was downloaded.
 const pin=(u:string)=>u.replace('/'+pack.model+'/resolve/main/','/'+pack.model+'/resolve/'+pack.revision+'/');
 // The files actually read are reported back ('loaded'.files): benchmarks/tests confirm the q8 (`_quantized`) weights are used.
 const files:string[]=[];
 const gate=voiceLocalWorkerWeightGate({scope,fallbackMs:runtime.gateFallbackMs||20000,first:runtime.weightFirst==='encoder'?/encoder_model/:runtime.weightFirst==='none'?null:/decoder_model/});
 env.fetch=async(input,init)=>{const u=pin(typeof input==='string'?input:input?.url||String(input));const hit=await cache.match(u);
  if(!hit)return new Response('',{status:404,statusText:'Not in pack'});
  // A size probe (Range: bytes=0-0) never reads the body.
  const range=init?.headers&&(typeof init.headers.get==='function'?init.headers.get('Range'):init.headers.Range||init.headers.range);
  if(range){const n=hit.headers.get('Content-Length')||'';return new Response(new Uint8Array(1),{status:206,headers:{'Content-Range':`bytes 0-0/${n||'*'}`,'Content-Type':hit.headers.get('Content-Type')||'application/octet-stream'}})}
  const short=u.split('/').slice(-2).join('/');if(files.length<40)files.push(short);
  if(/\.onnx(\?|$)/.test(u))try{progress&&progress({status:'download',file:short})}catch{}
  return gate.serve(u,hit)};
 // WebGPU (iOS/iPadOS 26+, desktop Chrome/Edge) when the page found a GPU adapter: transformers.js 4.3.1 takes
 // device:'webgpu' with the same pinned q8 files (no extra downloads; ONNX Runtime keeps ops without a GPU kernel on
 // the CPU). Any WebGPU failure falls back to the proven WASM path. Never on iPhone/iPad (the page sends gpu:false).
 const opts=(device:string)=>({revision:pack.revision,dtype:{encoder_model:'q8',decoder_model_merged:'q8'},device,...(Object.keys(voiceLocalWorkerSessionOptions(runtime)).length?{session_options:voiceLocalWorkerSessionOptions(runtime)}:{})});
 let asr=null,device='wasm';
 try{
  if(runtime.gpu&&(self as any).navigator?.gpu){try{const adapter=await (self as any).navigator.gpu.requestAdapter();if(adapter){asr=await pipeline('automatic-speech-recognition',pack.model,opts('webgpu'));device='webgpu'}}catch{asr=null}}
  if(!asr)asr=await pipeline('automatic-speech-recognition',pack.model,opts('wasm'));
 }finally{gate.finish()}
 stats.loadMs=Date.now()-t0;stats.weights=gate.stats.weights;stats.released=gate.stats.released;stats.fallback=gate.stats.fallback;
 try{progress&&progress({status:'ready',file:''})}catch{}
 return{
  async transcribe(audio,{language,final}){const out=await asr(audio,voiceLocalWorkerDecodeOptions(audio.length,{language,final}));return Array.isArray(out)?out.map(o=>o.text).join(' '):out?.text||''},
  device,files,stats,
  dispose(){try{asr?.dispose?.()}catch{}asr=null}
 };
}

if(typeof self!=='undefined'&&typeof WorkerGlobalScope!=='undefined'&&self instanceof WorkerGlobalScope){
 // Before anything can create ONNX Runtime's memory.
 const meter=voiceLocalWorkerMemMeter(self);
 const handle=voiceLocalWorkerHandler({createEngine:(o)=>(self.__voiceLocalEngineFactory||voiceLocalTransformersEngine)(o),post:m=>self.postMessage(m),meter});
 self.onmessage=e=>{handle(e.data)};
}
