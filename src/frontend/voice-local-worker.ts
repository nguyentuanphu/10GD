'use strict';
// Web Worker for on-device speech recognition (see voice-local.ts).
// Protocol v1 — every request carries {id, v:1}; every reply echoes the id:
//   {type:'hello'}                                   → {type:'hello', v}
//   {type:'load', pack:{id,model,revision}, runtime:{module:{url,sha256b64},mjs,wasm,threads,gpu}, cacheName}
//                                                    → {type:'progress', ...}* then {type:'loaded', ms}
//   {type:'transcribe', audio:Float32Array(16 kHz mono), language:'vietnamese'|'english'|null, final}
//                                                    → {type:'result', text, final, ms, seconds}
//   {type:'dispose'}                                 → {type:'disposed'}
//   any failure                                      → {type:'error', code, message}
// Transcriptions run one at a time in arrival order. Audio stays in this worker; the
// model and runtime are read from Cache Storage only (fetch is replaced by a cache
// lookup), so recognising speech makes no network request. Output length is capped by the
// audio length (≈12 tokens/s) and n-gram repeats are blocked, which stops Whisper's
// runaway loops on silence/noise.
const VOICE_LOCAL_WORKER_PROTOCOL=1;

function voiceLocalWorkerHandler({createEngine,post,now=()=>Date.now()}){
 let engine=null,loading=null,chain=Promise.resolve();
 const fail=(id,code,message)=>post({type:'error',id,code,message:String(message||code)});
 return function handle(m){
  m=m||{};const id=m.id;
  if(m.v!==VOICE_LOCAL_WORKER_PROTOCOL){fail(id,'version','protocol version mismatch');return Promise.resolve()}
  if(m.type==='hello'){post({type:'hello',id,v:VOICE_LOCAL_WORKER_PROTOCOL});return Promise.resolve()}
  if(m.type==='load'){
   const t=now();
   loading=(async()=>{try{engine?.dispose?.()}catch{}engine=null;engine=await createEngine({pack:m.pack,runtime:m.runtime,cacheName:m.cacheName,progress:p=>post({type:'progress',id,status:p?.status||'',file:p?.file||'',progress:typeof p?.progress==='number'?p.progress:null})});return engine})();
   return loading.then(e=>post({type:'loaded',id,ms:now()-t,device:e?.device||'wasm'}),e=>{engine=null;fail(id,e?.code||'load',e?.message)});
  }
  if(m.type==='transcribe'){
   chain=chain.then(async()=>{
    try{await loading}catch{}
    if(!engine){fail(id,'not-loaded','engine not loaded');return}
    const audio=m.audio;if(!(audio instanceof Float32Array)||!audio.length){fail(id,'audio','no audio');return}
    const t=now();
    try{const text=await engine.transcribe(audio,{language:m.language||null,final:!!m.final});post({type:'result',id,text:String(text||'').trim(),final:!!m.final,ms:now()-t,seconds:Math.round(audio.length/1600)/10})}
    catch(e){fail(id,e?.code||'transcribe',e?.message)}
   });
   return chain;
  }
  if(m.type==='dispose'){try{engine?.dispose?.()}catch{}engine=null;post({type:'disposed',id});return Promise.resolve()}
  fail(id,'unknown','unknown message type');return Promise.resolve();
 };
}

function voiceLocalWorkerB64(buf){let s='';const a=new Uint8Array(buf);for(let i=0;i<a.length;i+=32768)s+=String.fromCharCode.apply(null,a.subarray(i,i+32768));return btoa(s)}
// Real engine: transformers.js (pinned, integrity-checked, from the pack cache) + Whisper q8 on WASM.
async function voiceLocalTransformersEngine({pack,runtime,cacheName,progress}){
 const cache=await caches.open(cacheName);
 const hit=await cache.match(runtime.module.url);
 if(!hit)throw Object.assign(new Error('pack not downloaded'),{code:'not-downloaded'});
 const code=await hit.arrayBuffer();
 const digest=voiceLocalWorkerB64(await crypto.subtle.digest('SHA-256',code));
 if(digest!==runtime.module.sha256b64)throw Object.assign(new Error('runtime integrity check failed'),{code:'integrity'});
 const url=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));
 let mod;try{mod=await import(url)}finally{URL.revokeObjectURL(url)}
 const {env,pipeline}=mod;
 env.allowLocalModels=false;env.allowRemoteModels=true;env.useBrowserCache=true;env.cacheKey=cacheName;env.useWasmCache=true;
 env.backends.onnx.wasm.wasmPaths={mjs:runtime.mjs,wasm:runtime.wasm};
 env.backends.onnx.wasm.numThreads=Math.max(1,runtime.threads|0);env.backends.onnx.wasm.proxy=false;
 // Cache-only fetch: anything not in the downloaded pack is "missing", never fetched.
 // Some loaders ask for `resolve/main/`; serve the pinned revision that was downloaded.
 const pin=(u:string)=>u.replace('/'+pack.model+'/resolve/main/','/'+pack.model+'/resolve/'+pack.revision+'/');
 env.fetch=async input=>{const u=pin(typeof input==='string'?input:input?.url||String(input));return (await cache.match(u))||new Response('',{status:404,statusText:'Not in pack'})};
 // WebGPU (iOS/iPadOS 26+, desktop Chrome/Edge) when the page found a GPU adapter: transformers.js 4.3.1 takes
 // device:'webgpu' with the same pinned q8 files (no extra downloads; ONNX Runtime keeps ops without a GPU kernel on
 // the CPU). Any WebGPU failure falls back to the proven WASM path.
 const opts=(device:string)=>({revision:pack.revision,dtype:{encoder_model:'q8',decoder_model_merged:'q8'},device,progress_callback:progress});
 let asr=null,device='wasm';
 if(runtime.gpu&&(self as any).navigator?.gpu){try{const adapter=await (self as any).navigator.gpu.requestAdapter();if(adapter){asr=await pipeline('automatic-speech-recognition',pack.model,opts('webgpu'));device='webgpu'}}catch{asr=null}}
 if(!asr)asr=await pipeline('automatic-speech-recognition',pack.model,opts('wasm'));
 return{
  async transcribe(audio,{language,final}){const out=await asr(audio,{language:language||null,task:'transcribe',chunk_length_s:30,stride_length_s:5,return_timestamps:false,max_new_tokens:Math.min(final?224:96,16+Math.ceil(audio.length/16000*12)),no_repeat_ngram_size:4});return Array.isArray(out)?out.map(o=>o.text).join(' '):out?.text||''},
  device,
  dispose(){try{asr.dispose?.()}catch{}}
 };
}

if(typeof self!=='undefined'&&typeof WorkerGlobalScope!=='undefined'&&self instanceof WorkerGlobalScope){
 const handle=voiceLocalWorkerHandler({createEngine:(o)=>(self.__voiceLocalEngineFactory||voiceLocalTransformersEngine)(o),post:m=>self.postMessage(m)});
 self.onmessage=e=>{handle(e.data)};
}
