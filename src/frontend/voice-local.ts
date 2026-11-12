'use strict';
// On-device speech recognition (v1.6; v1.7.1: "More accurate" downloads itself in the background and becomes the default).
//
// Whisper (OpenAI, MIT) converted to ONNX (onnx-community, 8-bit quantised) runs in a
// Web Worker through transformers.js (Apache-2.0) + ONNX Runtime Web (MIT) on the
// WebAssembly backend. Audio is captured here (AudioWorklet, 16 kHz mono), cut into
// speech segments and transcribed inside the worker; it never leaves the device.
// The only network traffic is the one-time pack download (pinned files from
// cdn.jsdelivr.net and huggingface.co at fixed versions/revisions), stored in
// Cache Storage `bep-voice-models-v1`. During recognition the worker's fetch is
// cache-only, so nothing is requested from the network.
//
// Integration hooks (optional, typeof-guarded so this works standalone):
//  - registerVoiceRecognizer({id,label,start(lang,onResult,onEnd),stop()}) — voice sheet.
//    onResult(text, final) gets each segment's text; onEnd(info) runs once when stopped.
//  - registerOfflinePack({id,label,sizeBytes,status(),download(onProgress),remove()}) —
//    offline downloads screen (respects its Wi-Fi-only rule). status() resolves to
//    'ready' | 'partial' | 'none'; onProgress(fraction, loadedBytes, totalBytes).
// Without the voice-sheet hook this script adds its own settings block to the voice
// sheet and routes the existing mic button to the on-device recogniser when chosen.
// Any failure falls back to the browser's own speech recognition.

const VOICE_LOCAL_CACHE='bep-voice-models-v1';
const VOICE_LOCAL_PROTOCOL=1;
const VOICE_LOCAL_TF={version:'4.3.1',url:'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.1/dist/transformers.min.js',size:586230,sha256b64:'jWcW2QhvV8MKS/Nn26YbiHWTVzx3DEVEZegBmycD50M='};
const VOICE_LOCAL_ORT_BASE='https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.0-dev.20260914-8d85527a0/dist/';
// The default ONNX Runtime build (asyncify) and the plain build used for Safari < 26
// without WebGPU — the same choice transformers.js makes, pinned here so it can be cached.
const VOICE_LOCAL_ORT={
 asyncify:[{name:'ort-wasm-simd-threaded.asyncify.mjs',size:53057,sha256b64:'CWa2EFzZNnREmKpg33oiy9R68zdNvGSpq1YcCKceNhE='},{name:'ort-wasm-simd-threaded.asyncify.wasm',size:26861777,sha256b64:'SYcfWkQJUZeX4SdECGim0ZIzOdkYWQfzAaWyodkK8II='}],
 plain:[{name:'ort-wasm-simd-threaded.mjs',size:24381,sha256b64:'xXylYyiHc1OldeUbvKbxhFACfWyb8jB6LLLEE2O03p8='},{name:'ort-wasm-simd-threaded.wasm',size:14264838,sha256b64:'BroFd1PaOEfkwk8C2RqxM0VbCBfGmkSZOppTohRt+eM='}]
};
const VOICE_LOCAL_JSON=['config.json','generation_config.json','preprocessor_config.json','tokenizer.json','tokenizer_config.json'];
// Exact byte sizes from the pinned Hugging Face revisions; sha256 is the LFS object id for the weights and the
// SHA-256 of the file bytes for the JSON files (v1.7.1, measured from the pinned revision). The sha256 is also the
// file's identity in Cache Storage: a later release that pins a new revision re-uses every file whose sha256 is
// unchanged and downloads only the files that changed (see voiceLocalReuse).
const VOICE_LOCAL_PACKS={
 small:{id:'small',vi:'Chính xác hơn',en:'More accurate',model:'onnx-community/whisper-small',revision:'36050c46d777d46dc4b5f43f6d90574fc38f8732',minMemoryGB:4,
  files:[{path:'onnx/encoder_model_quantized.onnx',size:92326160,sha256:'a43a83f3c5361cd591cfa7c36f14b43cf7cb22f47a415cc14a8d557be800fa92'},{path:'onnx/decoder_model_merged_quantized.onnx',size:156750845,sha256:'ec07c3cbb64172c39791e26ee870a65ac22b458c36722bfe2776b3dbf741e0c9'},{path:'config.json',size:2227,sha256:'457854d452f17661e197d74aee12b8e74fb75ba30ebfaa7426d0d61ea1e08a18'},{path:'generation_config.json',size:3893,sha256:'f538b28220c6a6d6f1af1458d4141cacb4ef4963df3de98a19490440c412ddf0'},{path:'preprocessor_config.json',size:339,sha256:'a6a76d28c93edb273669eb9e0b0636a2bddbb1272c3261e47b7ca6dfdbac1b8d'},{path:'tokenizer.json',size:2480466,sha256:'27fc476bfe7f17299480be2273fc0608e4d5a99aba2ab5dec5374b4482d1a566'},{path:'tokenizer_config.json',size:282683,sha256:'2a4c4281cf9f51ac6ccc406fdc711a087afe6530f671fa7b80953edc498275ce'}]}
};
// v1.7.1: the Light (whisper-base) pack is retired — only "More accurate" is offered. Its files are listed so a copy
// downloaded before is removed from Cache Storage (79.7 MB) and a stored choice of it falls back to the browser recogniser.
const VOICE_LOCAL_RETIRED={base:{model:'onnx-community/whisper-base',revision:'1846881b6b3a3024392c1eea3ad983695bc23925',paths:['onnx/encoder_model_quantized.onnx','onnx/decoder_model_merged_quantized.onnx','config.json','generation_config.json','preprocessor_config.json','tokenizer.json','tokenizer_config.json']}};
const VOICE_LOCAL_SIMD_PROBE=[0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,10,1,8,0,65,0,253,15,253,98,11];

function vlT(vi,en){return typeof tr==='function'?tr(vi,en):vi}
function vlEsc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c])}
function voiceLocalModelUrl(pack,path){return 'https://huggingface.co/'+pack.model+'/resolve/'+pack.revision+'/'+path}
function voiceLocalIsOldSafari(ua,hasGpu){const m=/Version\/(\d+)[.\d]* (Mobile\/\S+ )?Safari/.exec(String(ua||''));return !!m&&!/Chrome|Chromium|CriOS|Edg|Firefox|FxiOS/.test(String(ua))&&+m[1]<26&&!hasGpu}
// v1.7.4: iPhone/iPad always use the plain build — they never use WebGPU (the only reason for the asyncify build), and the
// plain one is half the size: −50 MB at the memory peak and half the load time (Chromium, iPhone user agent).
function voiceLocalRuntimeFiles(ua,hasGpu,touchPoints=0){const set=voiceLocalIsOldSafari(ua,hasGpu)||voiceLocalIsIOS(ua,touchPoints)?VOICE_LOCAL_ORT.plain:VOICE_LOCAL_ORT.asyncify;return[{url:VOICE_LOCAL_TF.url,size:VOICE_LOCAL_TF.size,sha256b64:VOICE_LOCAL_TF.sha256b64,role:'module'},...set.map(f=>({url:VOICE_LOCAL_ORT_BASE+f.name,size:f.size,sha256b64:f.sha256b64,role:f.name.endsWith('.wasm')?'wasm':'mjs'}))]}
function voiceLocalPackFiles(id){const p=VOICE_LOCAL_PACKS[id];if(!p)return[];return p.files.map(f=>({url:voiceLocalModelUrl(p,f.path),size:f.size,sha256:f.sha256||'',role:'model'}))}
function voiceLocalBytes(files){return files.reduce((n,f)=>n+(+f.size||0),0)}
function voiceLocalPackBytes(id){return voiceLocalBytes(voiceLocalPackFiles(id))}
function voiceLocalFormatBytes(n,lang){const mb=n/1e6,loc=lang==='en'?'en-AU':'vi-VN';return (mb>=100?Math.round(mb):Math.round(mb*10)/10).toLocaleString(loc)+' MB'}
function voiceLocalIsIOS(ua,touchPoints){ua=String(ua||'');return /iPhone|iPad|iPod/.test(ua)||(/Macintosh/.test(ua)&&(+touchPoints||0)>1)}
// Pure capability decision; inputs are gathered by voiceLocalProbe().
function voiceLocalCapability(f){
 const reasons=[];
 if(!f.wasm)reasons.push('wasm');
 if(f.wasm&&!f.simd)reasons.push('simd');
 if(!f.worker)reasons.push('worker');
 if(!f.mic)reasons.push('mic');
 if(!f.audioWorklet)reasons.push('audio');
 if(!f.caches)reasons.push('storage');
 const ok=!reasons.length,mem=typeof f.memoryGB==='number'&&f.memoryGB>0?f.memoryGB:null,ios=voiceLocalIsIOS(f.ua,f.touchPoints),gpu=!!f.gpu;
 const packs={};
 // v1.7.1 (owner decision): every iPhone/iPad may download "More accurate". iOS never reports its memory; without
 // WebGPU the model runs on the CPU (WASM), so a non-blocking warning is shown before download instead of a block.
 for(const p of Object.values(VOICE_LOCAL_PACKS)){
  const why=[];
  if(!ok)why.push(...reasons);
  if(mem!==null&&mem<p.minMemoryGB)why.push('memory');
  packs[p.id]={ok:!why.length,reasons:why,warn:ios?(gpu?'ios':'ios-slow'):mem===null?'memory-unknown':''};
 }
 return{ok,reasons,memoryGB:mem,ios,gpu,packs};
}
function voiceLocalReasonText(r){return({wasm:vlT('Trình duyệt không chạy được WebAssembly.','This browser cannot run WebAssembly.'),simd:vlT('Trình duyệt thiếu WebAssembly SIMD.','This browser lacks WebAssembly SIMD.'),worker:vlT('Trình duyệt không hỗ trợ Web Worker.','This browser has no Web Worker support.'),mic:vlT('Không truy cập được micro.','No microphone access.'),audio:vlT('Trình duyệt thiếu AudioWorklet để thu âm.','This browser lacks AudioWorklet for recording.'),storage:vlT('Không có bộ nhớ đệm (Cache Storage) để lưu gói.','No Cache Storage to keep the pack.'),memory:vlT('Máy không đủ bộ nhớ (RAM) cho gói này.','Not enough memory (RAM) on this device for this pack.')})[r]||r}
// Non-blocking notes shown next to the pack and in the download warning.
function voiceLocalWarnText(w){return({'ios-slow':vlT('Máy cũ có thể chạy chậm hoặc thiếu bộ nhớ · có thể chậm vài giây mỗi câu.','Older devices may be slow or run out of memory · may take a few seconds per sentence.'),ios:vlT('Trên iPhone/iPad, app chạy thử gói một lần khi bạn không nói và chỉ bật nếu máy đủ bộ nhớ.','On iPhone/iPad the app tests the pack once while you are not speaking and switches it on only if the device has enough memory.'),'memory-unknown':vlT('Cần khoảng 1 GB RAM trống; máy yếu có thể chậm.','Needs about 1 GB of free memory; slower devices may struggle.')})[w]||''}
// The confirmation shown before a download on iPhone/iPad (size, Wi-Fi, speed on older devices).
function voiceLocalDownloadWarning(id,cap,lang){const c=cap?.packs?.[id];if(!c||!c.ok||!cap.ios)return'';const size=voiceLocalFormatBytes(voiceLocalPackBytes(id)+voiceLocalBytes(voiceLocalRuntime()),lang);return vlT(`Gói “Chính xác hơn” khoảng ${size}. Nên tải qua Wi-Fi.`,`The “More accurate” pack is about ${size}. Use Wi-Fi.`)+' '+(c.warn==='ios-slow'?voiceLocalWarnText('ios-slow')+' ':'')+voiceLocalWarnText('ios')+' '+vlT('Nếu máy không chạy nổi, app giữ giọng nói thường của máy.','If the device cannot run it, the app keeps the standard voice input.')}
async function voiceLocalProbe(){
 let simd=false;const wasm=typeof WebAssembly==='object';
 try{simd=wasm&&WebAssembly.validate(new Uint8Array(VOICE_LOCAL_SIMD_PROBE))}catch{}
 return voiceLocalCapability({wasm,simd,worker:typeof Worker==='function',mic:!!navigator.mediaDevices?.getUserMedia,audioWorklet:typeof AudioWorkletNode==='function',caches:typeof caches==='object'&&!!caches,memoryGB:navigator.deviceMemory,ua:navigator.userAgent,touchPoints:navigator.maxTouchPoints,gpu:!!navigator.gpu});
}
// Whisper language from the VI/EN toggle ('vi-VN' | 'en-AU') or automatic detection.
function voiceLocalWhisperLang(recLang,mode){if(mode==='auto')return null;return String(recLang||'').startsWith('en')?'english':'vietnamese'}
// Whisper is known to "hear" these on silence or noise (YouTube-style outros); drop them.
const VOICE_LOCAL_HALLUCINATIONS=[/hãy subscribe[^.!?]*[.!?]?/gi,/(cảm ơn|cám ơn) (các bạn|mọi người) đã (theo dõi|xem)[^.!?]*[.!?]?/gi,/đăng ký kênh[^.!?]*[.!?]?/gi,/thanks? (you )?for watching[^.!?]*[.!?]?/gi,/please subscribe[^.!?]*[.!?]?/gi,/\[(âm nhạc|nhạc|music|silence|blank_audio)\]/gi,/\((âm nhạc|nhạc|music|silence)\)/gi,/♪+/g,/^\s*(music|âm nhạc|nhạc)\s*[.!]?\s*$/gi];
function voiceLocalCleanText(text){let t=String(text||'');for(const re of VOICE_LOCAL_HALLUCINATIONS)t=t.replace(re,' ');return t.replace(/\s+/g,' ').replace(/^[\s,.;]+|[\s,]+$/g,'').trim()}
function voiceLocalDownmix(channels){if(!channels.length)return new Float32Array(0);if(channels.length===1)return channels[0];const n=channels[0].length,out=new Float32Array(n);for(const c of channels)for(let i=0;i<n;i++)out[i]+=c[i]/channels.length;return out}
function voiceLocalResample(input,from,to=16000){if(from===to)return input;const ratio=from/to,n=Math.floor(input.length/ratio),out=new Float32Array(n);for(let i=0;i<n;i++){const x=i*ratio,j=Math.floor(x),f=x-j,a=input[j]||0,b=input[j+1]??a;out[i]=a+(b-a)*f}return out}
function voiceLocalRms(frame){let s=0;for(let i=0;i<frame.length;i++)s+=frame[i]*frame[i];return Math.sqrt(s/(frame.length||1))}
// Energy-based speech segmenter (16 kHz mono frames). Emits 'partial' snapshots while
// someone is speaking and a 'final' segment after a pause or at the length cap.
function voiceLocalSegmenter({sampleRate=16000,silenceMs=800,maxMs=25000,partialMs=2500,minSpeechMs=300,floor=0.008}={}){
 let chunks=[],length=0,speech=0,silence=0,sinceP=0,noise=floor,active=false;
 const ms=n=>n*1000/sampleRate;
 const take=()=>{const out=new Float32Array(length);let o=0;for(const c of chunks){out.set(c,o);o+=c.length}return out};
 const reset=()=>{chunks=[];length=0;speech=0;silence=0;sinceP=0;active=false};
 return{
  push(frame){const e=voiceLocalRms(frame),voiced=e>Math.max(floor,noise*3),events=[];
   if(!voiced&&!active)noise=noise*.95+e*.05;
   if(voiced||active){chunks.push(frame);length+=frame.length;sinceP+=frame.length}
   if(voiced){speech+=frame.length;silence=0;active=true}else if(active)silence+=frame.length;
   if(active&&ms(speech)>=minSpeechMs&&(ms(silence)>=silenceMs||ms(length)>=maxMs)){events.push({type:'final',audio:take()});reset();return events}
   if(active&&!speech&&ms(silence)>=silenceMs){reset();return events}
   if(voiced&&ms(speech)>=minSpeechMs&&ms(sinceP)>=partialMs){sinceP=0;events.push({type:'partial',audio:take()})}
   return events},
  flush(){const out=active&&ms(speech)>=minSpeechMs?[{type:'final',audio:take()}]:[];reset();return out},
  get bufferedMs(){return ms(length)}
 };
}

// ---------- worker client (message protocol; see voice-local-worker.ts) ----------
function voiceLocalClient(worker){
 let seq=0;const waiting=new Map();
 // v1.7.4: a progress message never settles a call. Before, a load without a progress callback (the self-test, every hold)
 // was "loaded" at the first progress message — the marker said 'resident' while the model was still being built.
 worker.onmessage=e=>{const m=e.data||{},w=waiting.get(m.id);if(m.type==='progress'){try{w?.progress&&w.progress(m)}catch{}return}if(!w)return;waiting.delete(m.id);if(m.type==='error')w.reject(Object.assign(new Error(m.message||'worker error'),{code:m.code||'worker'}));else w.resolve(m)};
 worker.onerror=e=>{for(const w of waiting.values())w.reject(Object.assign(new Error(e?.message||'worker crashed'),{code:'crash'}));waiting.clear()};
 const call=(msg,transfer=[],progress=null)=>new Promise((resolve,reject)=>{const id=++seq;waiting.set(id,{resolve,reject,progress});worker.postMessage({...msg,id,v:VOICE_LOCAL_PROTOCOL},transfer)});
 return{
  hello:()=>call({type:'hello'}),
  load:(pack,runtime,progress)=>call({type:'load',pack:{id:pack.id,model:pack.model,revision:pack.revision},runtime,cacheName:VOICE_LOCAL_CACHE},[],progress),
  transcribe:(audio,language,final)=>call({type:'transcribe',audio,language,final:!!final},[audio.buffer]),
  dispose:()=>{try{worker.postMessage({type:'dispose',id:++seq,v:VOICE_LOCAL_PROTOCOL})}catch{}try{worker.terminate()}catch{}for(const w of waiting.values())w.reject(Object.assign(new Error('stopped'),{code:'stopped'}));waiting.clear()},
  get pending(){return waiting.size}
 };
}

// ---------- pack storage (Cache Storage) ----------
function voiceLocalHasGpu(){return typeof navigator!=='undefined'&&!!navigator.gpu}
function voiceLocalRuntime(){return voiceLocalRuntimeFiles(typeof navigator!=='undefined'?navigator.userAgent:'',voiceLocalHasGpu(),typeof navigator!=='undefined'?navigator.maxTouchPoints:0)}
async function voiceLocalOpenCache(){return caches.open(VOICE_LOCAL_CACHE)}
async function voiceLocalPresent(files){if(typeof caches!=='object')return files.map(()=>false);const c=await voiceLocalOpenCache();return Promise.all(files.map(async f=>!!(await c.match(f.url))))}
// 'partial' once any file of the pack or its runtime is stored (v1.7.1: the background download stores the runtime first).
async function voiceLocalStatus(id){const rt=voiceLocalRuntime(),own=voiceLocalPackFiles(id);try{const have=await voiceLocalPresent([...rt,...own]);return have.every(Boolean)?'ready':have.some(Boolean)?'partial':'none'}catch{return'none'}}
// Pack status in the offline-downloads shape (file counts let that screen show "3/7 downloaded — Resume").
async function voiceLocalPackStatus(id){let cap=null;try{cap=voiceLocalCap||await voiceLocalProbe()}catch{}if(cap&&cap.packs&&cap.packs[id]&&!cap.packs[id].ok)return{state:'unavailable',reasons:cap.packs[id].reasons.slice(),reasonText:cap.packs[id].reasons.map(voiceLocalReasonText).join(' ')};
 const files=[...voiceLocalRuntime(),...voiceLocalPackFiles(id)];let have=0;try{have=(await voiceLocalPresent(files)).filter(Boolean).length}catch{}const state=await voiceLocalStatus(id),warn=cap?.packs?.[id]?.warn||'',failed=voiceLocalFailed(id);return{state,have,total:files.length,...(warn?{warn,warnText:voiceLocalWarnText(warn)}:{}),...(failed?{failed:failed.stage,failedText:voiceLocalFailText(failed)}:{})}}
function voiceLocalHex(buf){return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('')}
function voiceLocalB64(buf){let s='';const a=new Uint8Array(buf);for(let i=0;i<a.length;i+=32768)s+=String.fromCharCode.apply(null,a.subarray(i,i+32768));return btoa(s)}
// Incremental SHA-256 (FIPS 180-4) so a 157 MB weights file is verified piece by piece from Cache Storage instead of
// being assembled in one buffer on the main thread (v1.7.2: the download alone pushed the tab +0.7 GB in Chromium).
const VOICE_LOCAL_K=new Uint32Array([0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]);
function voiceLocalSha256(){
 const H=new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]),W=new Uint32Array(64),tail=new Uint8Array(64),K=VOICE_LOCAL_K;let n=0,total=0;
 const block=(b,o)=>{for(let i=0;i<16;i++)W[i]=b[o+i*4]<<24|b[o+i*4+1]<<16|b[o+i*4+2]<<8|b[o+i*4+3];
  for(let i=16;i<64;i++){const x=W[i-15],y=W[i-2];W[i]=(((x>>>7|x<<25)^(x>>>18|x<<14)^x>>>3)+W[i-7]+((y>>>17|y<<15)^(y>>>19|y<<13)^y>>>10)+W[i-16])|0}
  let a=H[0],b2=H[1],c=H[2],d=H[3],e=H[4],f=H[5],g=H[6],h=H[7];
  for(let i=0;i<64;i++){const t1=(h+((e>>>6|e<<26)^(e>>>11|e<<21)^(e>>>25|e<<7))+(e&f^~e&g)+K[i]+W[i])|0,t2=(((a>>>2|a<<30)^(a>>>13|a<<19)^(a>>>22|a<<10))+(a&b2^a&c^b2&c))|0;h=g;g=f;f=e;e=(d+t1)|0;d=c;c=b2;b2=a;a=(t1+t2)|0}
  H[0]+=a;H[1]+=b2;H[2]+=c;H[3]+=d;H[4]+=e;H[5]+=f;H[6]+=g;H[7]+=h};
 return{update(data){let i=0;total+=data.length;if(n){const k=Math.min(64-n,data.length);tail.set(data.subarray(0,k),n);n+=k;i=k;if(n<64)return;block(tail,0);n=0}
   for(;i+64<=data.length;i+=64)block(data,i);if(i<data.length){tail.set(data.subarray(i),0);n=data.length-i}},
  digest(){const bits=total*8,pad=new Uint8Array((n<56?64:128)-n);pad[0]=0x80;const hi=Math.floor(bits/4294967296),lo=bits>>>0;const L=pad.length;pad[L-8]=hi>>>24;pad[L-7]=hi>>>16;pad[L-6]=hi>>>8;pad[L-5]=hi;pad[L-4]=lo>>>24;pad[L-3]=lo>>>16;pad[L-2]=lo>>>8;pad[L-1]=lo;
   const save=total;this.update(pad);total=save;const out=new Uint8Array(32);for(let i=0;i<8;i++){out[i*4]=H[i]>>>24;out[i*4+1]=H[i]>>>16;out[i*4+2]=H[i]>>>8;out[i*4+3]=H[i]}return out.buffer}}}
async function voiceLocalVerify(f,buf){if(!f.sha256&&!f.sha256b64)return true;if(!globalThis.crypto?.subtle)return true;const d=await crypto.subtle.digest('SHA-256',buf);return f.sha256?voiceLocalHex(d)===f.sha256:voiceLocalB64(d)===f.sha256b64}
// ---------- content-addressed storage (v1.7.1) ----------
// Cache Storage keeps each file under its pinned URL (the worker reads it from there, cache-only). An index
// (`/__bep-voice-index` in the same cache) records each stored URL's identity = its sha256. When a later release pins
// a new model revision or runtime version, a file whose sha256 is unchanged is copied to its new URL from the stored
// copy and the old entry is dropped: only files whose content changed are downloaded. App updates (service worker)
// never touch this cache (sw.ts only retires `bep-family-*` caches).
const VOICE_LOCAL_INDEX_PATH='/__bep-voice-index',VOICE_LOCAL_PART_PATH='/__bep-voice-part/',VOICE_LOCAL_CHUNK=8*1024*1024;
function voiceLocalHref(path){return new URL(path,typeof location!=='undefined'?location.href:'https://kitchen.invalid/').href}
function voiceLocalFileId(f){if(f.sha256)return String(f.sha256).toLowerCase();if(f.sha256b64){try{return[...atob(f.sha256b64)].map(c=>c.charCodeAt(0).toString(16).padStart(2,'0')).join('')}catch{}}return''}
// Every runtime variant (both ONNX Runtime builds) and every pack file the current release pins.
function voiceLocalAllRuntimeFiles(){return[{url:VOICE_LOCAL_TF.url,size:VOICE_LOCAL_TF.size,sha256b64:VOICE_LOCAL_TF.sha256b64},...Object.values(VOICE_LOCAL_ORT).flat().map(f=>({url:VOICE_LOCAL_ORT_BASE+f.name,size:f.size,sha256b64:f.sha256b64}))]}
function voiceLocalWantedFiles(){return[...voiceLocalAllRuntimeFiles(),...Object.keys(VOICE_LOCAL_PACKS).flatMap(voiceLocalPackFiles)]}
async function voiceLocalReadIndex(cache){try{const r=await cache.match(voiceLocalHref(VOICE_LOCAL_INDEX_PATH));const j=r?await r.json():null;return j&&typeof j==='object'?j:{}}catch{return{}}}
async function voiceLocalWriteIndex(cache,idx){try{await cache.put(voiceLocalHref(VOICE_LOCAL_INDEX_PATH),new Response(JSON.stringify(idx),{headers:{'Content-Type':'application/json'}}))}catch{}}
// Files stored before v1.7.1 have no index entry: they were verified when downloaded, so they are recorded as they
// are (no re-download). Returns the number of entries added.
async function voiceLocalMigrateIndex(){if(typeof caches!=='object'||!caches)return 0;try{if(caches.has&&!(await caches.has(VOICE_LOCAL_CACHE)))return 0}catch{}
 const cache=await voiceLocalOpenCache(),idx=await voiceLocalReadIndex(cache);let n=0;
 for(const f of voiceLocalWantedFiles()){const id=voiceLocalFileId(f);if(!id||idx[f.url]?.id===id)continue;if(await cache.match(f.url)){idx[f.url]={id,size:f.size};n++}}
 if(n)await voiceLocalWriteIndex(cache,idx);return n}
// Copies stored files with the same sha256 to the URLs this release pins. Returns the number of files re-used.
async function voiceLocalReuse(cache,files,have,idx){const wanted=new Set(voiceLocalWantedFiles().map(f=>f.url));let n=0;
 for(let i=0;i<files.length;i++){if(have[i])continue;const f=files[i],id=voiceLocalFileId(f);if(!id)continue;
  for(const [url,e] of Object.entries(idx)){if(url===f.url||e?.id!==id)continue;const hit=await cache.match(url);if(!hit){delete idx[url];continue}
   await cache.put(f.url,hit);idx[f.url]={id,size:f.size};have[i]=true;n++;if(!wanted.has(url)){await cache.delete(url);delete idx[url]}break}}
 return n}
// After a complete download: drop stored files no current pack or runtime uses (an older revision's changed files).
async function voiceLocalPrune(cache,idx){const wanted=new Set(voiceLocalWantedFiles().map(f=>f.url));let n=0;for(const url of Object.keys(idx)){if(wanted.has(url))continue;await cache.delete(url);delete idx[url];n++}return n}
function voiceLocalPartUrl(f,k){return voiceLocalHref(VOICE_LOCAL_PART_PATH+(voiceLocalFileId(f)||encodeURIComponent(f.url))+'/'+k)}
async function voiceLocalDropParts(cache,f){if(!f.size||f.size<=VOICE_LOCAL_CHUNK)return;for(let k=0;k<Math.ceil(f.size/VOICE_LOCAL_CHUNK);k++)await cache.delete(voiceLocalPartUrl(f,k))}
async function voiceLocalReadBody(res,onBytes){if(res.body&&res.body.getReader){const reader=res.body.getReader(),parts=[];let got=0;for(;;){const {done:end,value}=await reader.read();if(end)break;parts.push(value);got+=value.length;onBytes(value.length)}const buf=new Uint8Array(got);let o=0;for(const p of parts){buf.set(p,o);o+=p.length}return buf}
 const buf=new Uint8Array(await res.arrayBuffer());onBytes(buf.length);return buf}
let voiceLocalNoRange=false;
// One file. Large files (> 8 MB) are fetched in 8 MB ranges kept in the cache as they arrive, so a pause, a closed tab or
// a dropped connection resumes from the last whole range instead of the start of a 157 MB file. A server that ignores
// ranges (200 instead of 206) or a browser that refuses the range request falls back to one whole-file request.
async function voiceLocalFetchFile(f,cache,{fetchFn,signal,onBytes}){
 const opts={signal,mode:'cors',credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer'},get=fetchFn||fetch;
 const fail=res=>Object.assign(Error(vlT('Tải gói bị lỗi','Pack download failed')+' ('+res.status+')'),{code:'http'});
 const whole=async(skip=0)=>{const res=await get(f.url,opts);if(!res.ok)throw fail(res);let seen=0;return voiceLocalReadBody(res,n=>{const before=seen;seen+=n;const fresh=Math.max(0,seen-Math.max(before,skip));if(fresh)onBytes(fresh)})};
 // Ranges only for hosts that send the raw bytes. A CDN that compresses (e.g. Content-Encoding: br) answers a range of
 // the COMPRESSED file, which the browser then inflates, so the bytes never line up (v1.7.1 bug: 'không khớp bản gốc').
 const rangeOk=/^https:\/\/(huggingface\.co|[a-z0-9.-]*\.hf\.co)\//.test(String(f.url));
 if(!f.size||f.size<=VOICE_LOCAL_CHUNK||voiceLocalNoRange||!rangeOk)return whole();
 const n=Math.ceil(f.size/VOICE_LOCAL_CHUNK);let stored=0;
 for(let k=0;k<n;k++){const key=voiceLocalPartUrl(f,k),start=k*VOICE_LOCAL_CHUNK,end=Math.min(f.size,start+VOICE_LOCAL_CHUNK)-1,len=end-start+1;
  const hit=await cache.match(key);if(hit){onBytes(len);stored=end+1;continue}
  let res;try{res=await get(f.url,{...opts,headers:{Range:`bytes=${start}-${end}`}})}catch(e){if(signal?.aborted||k>0||stored)throw e;voiceLocalNoRange=true;return whole()}
  if(res.status===200){await voiceLocalDropParts(cache,f);return whole(stored)}
  if(res.status!==206)throw fail(res);
  const part=await voiceLocalReadBody(res,onBytes);
  // A server that ignored or re-encoded the range: start this file again as one plain request (the SHA-256 check after
  // the download still guards the content).
  if(part.length!==len){await voiceLocalDropParts(cache,f);voiceLocalNoRange=true;return whole(stored+part.length)}
  await cache.put(key,new Response(part,{headers:{'Content-Type':'application/octet-stream'}}));stored=end+1}
 // v1.7.2: the parts stay in Cache Storage; the caller verifies and stores them piece by piece (voiceLocalStoreParts).
 return{parts:n,size:f.size}}
async function voiceLocalPart(cache,f,k){const r=await cache.match(voiceLocalPartUrl(f,k));if(!r)throw Object.assign(Error('part missing'),{code:'http'});return new Uint8Array(await r.arrayBuffer())}
// Verifies a file kept as 8 MB parts (incremental SHA-256, one part in memory at a time) and stores it under its URL as a
// streamed body; browsers that refuse a streamed body get the parts as a Blob, the last resort is one buffer.
async function voiceLocalStoreParts(cache,f,got,type){
 const h=voiceLocalSha256();let len=0;for(let k=0;k<got.parts;k++){const a=await voiceLocalPart(cache,f,k);h.update(a);len+=a.length}
 const id=voiceLocalFileId(f);if(len!==f.size||id&&voiceLocalHex(h.digest())!==id)return false;
 const headers={'Content-Type':type,'Content-Length':String(f.size)};
 const streamed=()=>{let k=0;return new Response(new ReadableStream({async pull(ctl){if(k>=got.parts){ctl.close();return}ctl.enqueue(await voiceLocalPart(cache,f,k++))}}),{headers})};
 try{if(typeof ReadableStream!=='function')throw 0;await cache.put(f.url,streamed());const r=await cache.match(f.url);const n=+(r?.headers.get('Content-Length')||0);if(!r||n&&n!==f.size)throw 0;return true}catch{}
 try{const blobs=[];for(let k=0;k<got.parts;k++)blobs.push(await (await cache.match(voiceLocalPartUrl(f,k))).blob());await cache.put(f.url,new Response(new Blob(blobs),{headers}));return true}catch{}
 const buf=new Uint8Array(f.size);for(let k=0;k<got.parts;k++)buf.set(await voiceLocalPart(cache,f,k),k*VOICE_LOCAL_CHUNK);await cache.put(f.url,new Response(buf,{headers}));return true}
// A download in progress is shared: a second caller (the Downloads row while the automatic download runs) joins it and
// gets progress too. It is cancelled only when every caller has cancelled (Pause / Stop).
const voiceLocalDownloads={};
async function voiceLocalDownload(id,onProgress,{signal,fetchFn}={}){
 const join=run=>{const sub={onProgress};run.subs.add(sub);if(run.last)try{onProgress&&onProgress(...run.last)}catch{}
  if(signal){const off=()=>{run.subs.delete(sub);if(!run.subs.size)run.controller.abort()};if(signal.aborted)off();else signal.addEventListener('abort',off,{once:true})}
  return new Promise((resolve,reject)=>{const leave=()=>run.subs.delete(sub);if(signal?.aborted){leave();reject(new DOMException('Aborted','AbortError'));return}run.promise.then(v=>{leave();resolve(v)},e=>{leave();reject(e)});signal?.addEventListener?.('abort',()=>{leave();reject(new DOMException('Aborted','AbortError'))},{once:true})})};
 if(voiceLocalDownloads[id])return join(voiceLocalDownloads[id]);
 const controller=new AbortController(),run={subs:new Set(),controller,last:null,promise:null};
 const own=controller.signal;
 run.promise=(async()=>{
  const pack=VOICE_LOCAL_PACKS[id];if(!pack)throw Error('unknown pack');
  const files=[...voiceLocalRuntime(),...voiceLocalPackFiles(id)],total=voiceLocalBytes(files),cache=await voiceLocalOpenCache();
  const have=await voiceLocalPresent(files),idx=await voiceLocalReadIndex(cache);
  for(let i=0;i<files.length;i++){const fid=voiceLocalFileId(files[i]);if(have[i]&&fid&&idx[files[i].url]?.id!==fid)idx[files[i].url]={id:fid,size:files[i].size}}
  await voiceLocalReuse(cache,files,have,idx);await voiceLocalWriteIndex(cache,idx);
  let done=voiceLocalBytes(files.filter((f,i)=>have[i]));
  const need=total-done;
  try{const est=await navigator.storage?.estimate?.();if(est&&est.quota&&est.quota-(est.usage||0)<need*1.1)throw Object.assign(Error(vlT('Máy không đủ chỗ trống để tải gói này.','Not enough free storage on this device for this pack.')),{code:'quota'})}catch(e){if(e.code==='quota')throw e}
  try{await navigator.storage?.persist?.()}catch{}
  const report=()=>{run.last=[total?Math.min(1,done/total):1,done,total];for(const s of run.subs)try{s.onProgress&&s.onProgress(...run.last)}catch{}};report();
  for(let i=0;i<files.length;i++){if(have[i])continue;const f=files[i];if(own.aborted)throw new DOMException('Aborted','AbortError');
   const start=done;
   let buf=await voiceLocalFetchFile(f,cache,{fetchFn,signal:own,onBytes:n=>{done+=n;report()}});
   const bad=()=>Object.assign(Error(vlT('Tệp tải về không khớp bản gốc — đã huỷ.','A downloaded file did not match the original — cancelled.')),{code:'integrity'});
   const type=f.url.endsWith('.json')?'application/json':f.url.endsWith('.mjs')||f.url.endsWith('.js')?'text/javascript':f.url.endsWith('.wasm')?'application/wasm':'application/octet-stream';
   const size=f.size||buf.length;
   if(buf&&buf.parts){if(!(await voiceLocalStoreParts(cache,f,buf,type))){await voiceLocalDropParts(cache,f);throw bad()}}
   else{if(f.size&&buf.length!==f.size||!(await voiceLocalVerify(f,buf))){await voiceLocalDropParts(cache,f);throw bad()}
    await cache.put(f.url,new Response(buf,{headers:{'Content-Type':type,'Content-Length':String(buf.length)}}))}
   buf=null;done=start+size;await voiceLocalDropParts(cache,f);
   const fid=voiceLocalFileId(f);if(fid){idx[f.url]={id:fid,size};await voiceLocalWriteIndex(cache,idx)}report();
  }
  await voiceLocalPrune(cache,idx);await voiceLocalWriteIndex(cache,idx);
  // Keep a copy of the worker script so recognition also starts offline.
  await voiceLocalKeepWorker(cache);
  return 'ready';
 })();
 // v1.7.2: the crash marker covers a visible download too (phase 'downloading'; cleared when hidden, unloaded or done).
 voiceLocalDownloads[id]=run;voiceLocalDownloadMark();const clean=()=>{if(voiceLocalDownloads[id]===run)delete voiceLocalDownloads[id];voiceLocalDownloadUnmark()};run.promise.then(clean,clean);
 return join(run);
}
async function voiceLocalKeepWorker(cache){try{const w=await fetch('voice-local-worker.js',{cache:'no-cache'});if(w.ok)await (cache||await voiceLocalOpenCache()).put(voiceLocalHref('voice-local-worker.js'),w)}catch{}}
// v1.7.4: also counts what it frees (the stored sizes of the files actually deleted, parts included) into
// voiceLocalLastFreed, so "Gỡ gói" can say how much space came back.
let voiceLocalLastFreed=0;
async function voiceLocalRemove(id){voiceLocalEngine?.dispose();voiceLocalEngine=null;const c=await voiceLocalOpenCache(),idx=await voiceLocalReadIndex(c);let freed=0;
 const del=async(url,size)=>{let n=0;try{const hit=size?null:await c.match(url);n=size||+(hit?.headers.get('Content-Length')||0)}catch{}if(await c.delete(url))freed+=n};
 const parts=async f=>{if(!f.size||f.size<=VOICE_LOCAL_CHUNK)return;for(let k=0;k<Math.ceil(f.size/VOICE_LOCAL_CHUNK);k++)await del(voiceLocalPartUrl(f,k),Math.min(VOICE_LOCAL_CHUNK,f.size-k*VOICE_LOCAL_CHUNK))};
 for(const f of voiceLocalPackFiles(id)){await del(f.url,f.size);await parts(f);delete idx[f.url]}
 const others=Object.keys(VOICE_LOCAL_PACKS).filter(x=>x!==id);let anyReady=false;for(const o of others)if(await voiceLocalStatus(o)==='ready')anyReady=true;
 if(!anyReady){for(const f of voiceLocalAllRuntimeFiles()){await del(f.url,f.size);await parts(f);delete idx[f.url]}for(const url of Object.keys(idx)){await del(url,+idx[url]?.size||0);delete idx[url]}await c.delete(voiceLocalHref('voice-local-worker.js'))}
 if(Object.keys(idx).length)await voiceLocalWriteIndex(c,idx);else await c.delete(voiceLocalHref(VOICE_LOCAL_INDEX_PATH));
 voiceLocalLastFreed=freed;
 if(voiceLocalChoice()===id)voiceLocalSetChoice('');return 'none'}
function voiceLocalRemovedText(bytes){const lang=typeof appLanguage!=='undefined'?appLanguage:'vi';return bytes>0?vlT(`Đã gỡ gói giọng chính xác — giải phóng ${voiceLocalFormatBytes(bytes,lang)} trên máy.`,`Accurate voice pack removed — ${voiceLocalFormatBytes(bytes,lang)} freed on this device.`):vlT('Đã gỡ gói giọng chính xác.','Accurate voice pack removed.')}

// ---------- preferences ----------
// ONE selection for every voice feature: `bep-voice-recognizer` ('browser' | 'local-base' | 'local-small'), the key the
// voice sheet's recogniser selector (voice-commands.js) reads. The older on-device key `bep-voice-local` is migrated once.
const VOICE_REC_KEY='bep-voice-recognizer';
function voiceLocalMigrateChoice(){try{const cur=localStorage.getItem(VOICE_REC_KEY)||'';if(/^local-/.test(cur)&&!VOICE_LOCAL_PACKS[cur.slice(6)])localStorage.removeItem(VOICE_REC_KEY)}catch{}try{const old=localStorage.getItem('bep-voice-local');if(old===null)return;localStorage.removeItem('bep-voice-local');if(VOICE_LOCAL_PACKS[old]&&!localStorage.getItem(VOICE_REC_KEY))localStorage.setItem(VOICE_REC_KEY,'local-'+old)}catch{}}
function voiceLocalChoice(){voiceLocalMigrateChoice();try{const v=(localStorage.getItem(VOICE_REC_KEY)||'').replace(/^local-/,'');return VOICE_LOCAL_PACKS[v]&&localStorage.getItem(VOICE_REC_KEY)==='local-'+v?v:''}catch{return''}}
function voiceLocalSetChoice(v){try{if(v)localStorage.setItem(VOICE_REC_KEY,'local-'+v);else if(/^local-/.test(localStorage.getItem(VOICE_REC_KEY)||''))localStorage.removeItem(VOICE_REC_KEY)}catch{}}
// Language: the app-wide Auto mode (default) lets Whisper detect the language and follow Vietnamese/English
// code-switching ("1 ký salmon, 2kg tuna"); a Tiếng Việt / English override in Cài đặt giọng nói forces one language.
function voiceLocalLangMode(){if(typeof voiceLangPrefs==='function'){try{return voiceLangPrefs().auto?'auto':'toggle'}catch{}}try{return localStorage.getItem('bep-voice-local-lang')==='toggle'?'toggle':'auto'}catch{return'auto'}}

// ---------- failure guard (v1.7.1; rebuilt in v1.7.2 after an iPhone crash loop) ----------
// Whisper "More accurate" needs ~0.4 GB once loaded and ~1.2 GB at the peak of each inference (Chromium measurement,
// docs/reviews/v1.7.2/voice-ios-crash): iOS kills a Safari tab that goes over its memory limit and reloads it, with no
// JavaScript event. v1.7.1 wrote its marker only around the model load and each transcription and cleared it in
// between, while the model stayed in memory for the whole hold — a kill in a gap left no trace, the next hold loaded the
// model again and Safari showed "A problem repeatedly occurred". Now ONE marker (localStorage, written synchronously)
// covers the whole time the model is in memory: it is written BEFORE the worker is created and only removed when the
// worker is terminated (after use, idle, hidden tab, page unload) — never in between. A marker found at start-up means
// the page died with the model in memory: this device is marked "out of memory", falls back to the browser recogniser
// and never loads the model by itself again; a one-time notice offers Thử lại / Try again (explicit, with a warning)
// and Gỡ gói / Remove pack. Stored per device only.
const VOICE_LOCAL_FAIL_KEY='bep-voice-local-fail',VOICE_LOCAL_BUSY_KEY='bep-voice-local-busy',VOICE_LOCAL_SELFTEST_KEY='bep-voice-local-selftest',VOICE_LOCAL_SELFTEST_VERSION=1;
const VOICE_LOCAL_IDLE_MS=60000,VOICE_LOCAL_SELFTEST_TIMEOUT_MS=180000;
// Phases written into the marker: 'downloading' | 'loading-model' | 'self-test' | 'resident' (loaded, between
// sentences) | 'transcribing'. v1.7.1 markers ({stage:'load'|'run'}) are still understood.
const VOICE_LOCAL_PHASES=['downloading','loading-model','self-test','resident','transcribing'];
function voiceLocalFailed(id){try{const f=JSON.parse(localStorage.getItem(VOICE_LOCAL_FAIL_KEY)||'null');return f&&(!id||f.pack===id)?f:null}catch{return null}}
function voiceLocalMarkFailed(id,stage,code,extra={}){try{localStorage.setItem(VOICE_LOCAL_FAIL_KEY,JSON.stringify({pack:id,stage,code:String(code||''),at:Date.now(),...extra}));localStorage.removeItem(VOICE_LOCAL_BUSY_KEY);localStorage.removeItem(VOICE_LOCAL_SELFTEST_KEY)}catch{}if(voiceLocalChoice()===id)voiceLocalSetChoice('');
 const eng=voiceLocalEngine;voiceLocalEngine=null;try{eng?.dispose()}catch{}
 // The selector stops offering it at once (voiceActiveRecognizerId() then answers 'browser').
 if(voiceLocalUnregister[id]){try{voiceLocalUnregister[id]()}catch{}delete voiceLocalUnregister[id]}}
function voiceLocalClearFailed(){try{localStorage.removeItem(VOICE_LOCAL_FAIL_KEY)}catch{}}
function voiceLocalBusy(id,phase){try{if(phase)localStorage.setItem(VOICE_LOCAL_BUSY_KEY,JSON.stringify({pack:id,phase,at:Date.now(),v:2}));else localStorage.removeItem(VOICE_LOCAL_BUSY_KEY)}catch{}}
function voiceLocalBusyNow(){try{return JSON.parse(localStorage.getItem(VOICE_LOCAL_BUSY_KEY)||'null')}catch{return null}}
function voiceLocalMarkerPhase(b){if(!b)return'';if(VOICE_LOCAL_PHASES.includes(b.phase))return b.phase;return b.stage==='load'?'loading-model':b.stage==='run'?'transcribing':String(b.phase||b.stage||'')}
// At start-up (before anything can load the model): a marker left behind = the page died while the pack was in memory
// (or downloading). Turned into a failure "crash" with the phase it died in; the notice is shown once.
// v1.7.4: memory crashes are counted per device and per release of the pack's memory behaviour (this app version, the
// pinned model revision and runtime). The first crash allows ONE guarded "Thử lại"; a second crash disables accurate voice
// on this device until one of those versions changes (no button, nothing loads it). Kept when the pack is removed.
const VOICE_LOCAL_CRASHES_KEY='bep-voice-local-crashes',VOICE_LOCAL_MEM_VERSION='1.7.4';
function voiceLocalGuardVersion(id){const p=VOICE_LOCAL_PACKS[id];return[VOICE_LOCAL_MEM_VERSION,p?.revision||'',VOICE_LOCAL_TF.version,VOICE_LOCAL_ORT_BASE.split('@')[1]||''].join('|')}
function voiceLocalCrashCount(id){try{const r=JSON.parse(localStorage.getItem(VOICE_LOCAL_CRASHES_KEY)||'null');return r&&r.pack===id&&r.ver===voiceLocalGuardVersion(id)?Math.max(0,+r.n||0):0}catch{return 0}}
function voiceLocalCountCrash(id,phase){const n=voiceLocalCrashCount(id)+1;try{localStorage.setItem(VOICE_LOCAL_CRASHES_KEY,JSON.stringify({pack:id,ver:voiceLocalGuardVersion(id),n,phase:phase||'',at:Date.now()}))}catch{}return n}
function voiceLocalDisabled(id){return voiceLocalCrashCount(id)>=2}
function voiceLocalCheckCrash(){let b=null;try{b=JSON.parse(localStorage.getItem(VOICE_LOCAL_BUSY_KEY)||'null')}catch{}
 try{localStorage.removeItem(VOICE_LOCAL_BUSY_KEY)}catch{}
 if(!b||!VOICE_LOCAL_PACKS[b.pack])return null;
 const phase=voiceLocalMarkerPhase(b),n=phase==='downloading'?voiceLocalCrashCount(b.pack):voiceLocalCountCrash(b.pack,phase);
 // A self-check (Kiểm tra giọng chính xác) that was running: its result says where the page died; it opens again.
 const died=voiceLocalCheckDied(b.pack,phase);
 voiceLocalMarkFailed(b.pack,'crash','reload',{phase,crashes:n,notice:died?'check':'pending'});return voiceLocalFailed(b.pack)}
function voiceLocalIsCrash(f){return!!f&&(f.stage==='crash'||f.stage==='reload-load'||f.stage==='reload-run')}
function voiceLocalFailText(f){
 if(voiceLocalIsCrash(f))return voiceLocalDisabled(f.pack)?vlT('Giọng chính xác đã tắt trên máy này vì máy thiếu bộ nhớ (2 lần). Đang dùng giọng nói thường — sẽ thử lại được khi có bản cập nhật.','Accurate voice is off on this device: not enough memory (twice). Using the standard voice input — it can be tried again after an update.'):vlT('Giọng chính xác tạm tắt vì máy thiếu bộ nhớ — đang dùng giọng nói thường của máy.','Accurate voice is paused: not enough memory on this device — using the standard voice input.');
 const why=f.stage==='self-test'?vlT('Máy không chạy thử được bộ giọng chính xác.','This device could not run the accurate voice test.'):f.stage==='load'?vlT('Không nạp được gói trên máy.','The on-device pack could not load.'):vlT('Nhận giọng nói trên máy bị lỗi.','On-device recognition failed.');
 return why+' '+vlT('Đang dùng giọng nói thường của máy.','Using the device’s standard voice input.')}
// iPhone/iPad: the pack is only switched on after a safe self-test passed on this device (see voiceLocalSelfTest).
function voiceLocalOnIOS(){const cap=voiceLocalCap;if(cap&&typeof cap.ios==='boolean')return cap.ios;return typeof navigator!=='undefined'&&voiceLocalIsIOS(navigator.userAgent,navigator.maxTouchPoints)}
function voiceLocalSelfTestRecord(){try{return JSON.parse(localStorage.getItem(VOICE_LOCAL_SELFTEST_KEY)||'null')}catch{return null}}
function voiceLocalSelfTestPassed(id){const r=voiceLocalSelfTestRecord();return!!r&&r.pack===id&&r.ok===true&&r.v===VOICE_LOCAL_SELFTEST_VERSION}
// May this pack be offered/used as the recogniser on this device right now?
function voiceLocalUsable(id){return!voiceLocalFailed(id)&&!voiceLocalDisabled(id)&&(!voiceLocalOnIOS()||voiceLocalSelfTestPassed(id))}

// ---------- engine (worker) + recorder ----------
let voiceLocalEngine=null,voiceLocalActive=null,voiceLocalLastUsed='',voiceLocalIdleTimer=0;
async function voiceLocalWorker(){
 let url='voice-local-worker.js';
 try{if(!navigator.onLine||globalThis.BEP_OFFLINE){const hit=await (await voiceLocalOpenCache()).match(new URL(url,location.href).href);if(hit)url=URL.createObjectURL(new Blob([await hit.text()],{type:'text/javascript'}))}}catch{}
 return new Worker(url,{name:'bep-voice-local'});
}
// Runtime options for the worker. iPhone/iPad: WebAssembly only (WebGPU keeps GPU buffers AND CPU copies of the q8 ops it
// cannot run), one thread, no SharedArrayBuffer.
function voiceLocalLoadOptions(){const rt=voiceLocalRuntime(),ios=voiceLocalOnIOS();return{module:rt.find(f=>f.role==='module'),mjs:rt.find(f=>f.role==='mjs').url,wasm:rt.find(f=>f.role==='wasm').url,threads:!ios&&typeof crossOriginIsolated!=='undefined'&&crossOriginIsolated?Math.min(4,navigator.hardwareConcurrency||1):1,gpu:!ios&&voiceLocalHasGpu(),lowMemory:true}}
// Frees the model (terminates the worker) after a minute without use; the next hold loads it again.
function voiceLocalTouch(){clearTimeout(voiceLocalIdleTimer);if(!voiceLocalEngine)return;voiceLocalIdleTimer=setTimeout(()=>{if(voiceLocalActive||voiceLocalSelfTestRun.p)return voiceLocalTouch();voiceLocalRelease('idle')},VOICE_LOCAL_IDLE_MS)}
// Ends recognition and frees the model; the marker goes with it (a clean end, not a crash).
function voiceLocalRelease(why){clearTimeout(voiceLocalIdleTimer);try{voiceLocalActive?.stop(true)}catch{}const eng=voiceLocalEngine;voiceLocalEngine=null;try{eng?.dispose()}catch{}
 const b=voiceLocalBusyNow();if(b&&voiceLocalMarkerPhase(b)!=='downloading')voiceLocalBusy('','');return why}
async function voiceLocalEnsureEngine(id,onProgress,{phase='loading-model'}={}){
 if(voiceLocalEngine&&voiceLocalEngine.pack===id){voiceLocalTouch();return voiceLocalEngine}
 const old=voiceLocalEngine;voiceLocalEngine=null;try{old?.dispose()}catch{}
 voiceLocalBusy(id,phase);   // BEFORE the worker exists: a kill from here on leaves the marker behind
 let client=null;
 try{
 client=voiceLocalClient(await voiceLocalWorker());
 const hello=await client.hello();if(hello.v!==VOICE_LOCAL_PROTOCOL)throw Object.assign(Error('worker version'),{code:'version'});
 const loaded=await client.load(VOICE_LOCAL_PACKS[id],voiceLocalLoadOptions(),onProgress);
 voiceLocalBusy(id,phase==='self-test'?'self-test':'resident');   // still in memory: the marker stays until dispose
 const eng={pack:id,client,device:loaded?.device||'wasm',files:loaded?.files||[],loaded:{ms:loaded?.ms??null,stats:loaded?.stats||null,mem:loaded?.mem||null},
  async transcribe(audio,language,final,ph='transcribing'){voiceLocalBusy(id,ph);try{return await client.transcribe(audio,language,final)}finally{if(voiceLocalEngine===eng)voiceLocalBusy(id,ph==='self-test'?'self-test':'resident');voiceLocalTouch()}},
  dispose(){client.dispose();if(voiceLocalEngine===eng)voiceLocalEngine=null;const b=voiceLocalBusyNow();if(b&&b.pack===id&&voiceLocalMarkerPhase(b)!=='downloading')voiceLocalBusy(id,'')}};
 voiceLocalEngine=eng;voiceLocalTouch();
 return eng;
 }catch(e){try{client?.dispose()}catch{}voiceLocalBusy(id,'');throw e}
}
// ---------- safe self-test (v1.7.2) ----------
// Loads the model in the worker and decodes a 1 s synthetic clip while nobody is speaking, with the marker around it.
// Whisper pads every input to a 30 s window, so this reaches the same memory peak as a real sentence. Passing it is
// what switches the pack on for iPhone/iPad (and what "Thử lại / Try again" runs everywhere). If the page dies, the
// marker (phase 'self-test') marks this device at the next start; a plain error marks it at once. Interrupted (hidden
// tab, voice sheet started) → no verdict, tried again later.
const voiceLocalSelfTestRun={p:null,deferred:false};
function voiceLocalSelfTestClip(){const n=16000,a=new Float32Array(n);for(let i=0;i<n;i++)a[i]=.03*Math.sin(i*2*Math.PI*220/16000)*Math.sin(Math.PI*i/n);return a}
function voiceLocalRecording(){return!!voiceLocalActive||(typeof voiceKeepListening!=='undefined'&&!!voiceKeepListening)}
// The test itself (shared by the background self-test and the self-check page): load, decode the clip, free the model.
// Returns timings and the memory the worker reports; throws on failure (code 'stopped' = interrupted, no verdict).
async function voiceLocalTestRun(id,onPhase=(p:string)=>{}){
 const t0=Date.now();let timer=0,eng=null;
 try{const timeout=new Promise((_,rej)=>{timer=setTimeout(()=>rej(Object.assign(Error('self-test timeout'),{code:'timeout'})),VOICE_LOCAL_SELFTEST_TIMEOUT_MS)});
  onPhase('loading-model');
  eng=await Promise.race([voiceLocalEnsureEngine(id,null,{phase:'self-test'}),timeout]);
  const loadMs=Date.now()-t0,t1=Date.now();onPhase('transcribing');
  const r=await Promise.race([eng.transcribe(voiceLocalSelfTestClip(),'vietnamese',false,'self-test'),timeout]);
  if(!r||typeof r.text!=='string')throw Object.assign(Error('no result'),{code:'self-test'});
  return{loadMs,transcribeMs:Date.now()-t1,ms:Date.now()-t0,device:eng.device,loadMem:eng.loaded?.mem||null,mem:r.mem||null,weights:eng.loaded?.stats?.weights||null}}
 finally{clearTimeout(timer);if(eng&&voiceLocalEngine===eng&&!voiceLocalActive)voiceLocalRelease('self-test')}}
function voiceLocalRecordPass(id,res){try{localStorage.setItem(VOICE_LOCAL_SELFTEST_KEY,JSON.stringify({pack:id,ok:true,v:VOICE_LOCAL_SELFTEST_VERSION,at:Date.now(),ms:res.ms,device:res.device}))}catch{}}
async function voiceLocalSelfTest(id,{force=false}={}){
 if(voiceLocalSelfTestRun.p)return voiceLocalSelfTestRun.p;
 const run=(async()=>{voiceLocalSelfTestRun.deferred=false;
  if(voiceLocalFailed(id)&&!force||voiceLocalDisabled(id))return false;
  if(typeof document!=='undefined'&&document.visibilityState==='hidden'||voiceLocalRecording()){voiceLocalSelfTestRun.deferred=true;return false}
  if((await voiceLocalStatus(id).catch(()=>'none'))!=='ready')return false;
  try{voiceLocalRecordPass(id,await voiceLocalTestRun(id));return true}
  catch(e){if(e?.code==='stopped'){voiceLocalSelfTestRun.deferred=true;return false}voiceLocalMarkFailed(id,'self-test',e?.code||'error');return false}})();
 voiceLocalSelfTestRun.p=run;const clear=()=>{voiceLocalSelfTestRun.p=null};run.then(clear,clear);return run}

// ---------- self-check page (v1.7.4): "Kiểm tra giọng chính xác trên máy này" ----------
// Reached from Account & settings → "Giọng nói trên máy" and from the voice sheet's settings. Runs the same guarded test
// (marker phase 'self-test') and shows device class, pass/fail, load and transcription time, the memory the browser
// exposes (WebAssembly memory everywhere, JS heap where readable) and the phase reached. Its record
// (`bep-voice-local-check`) is written BEFORE each phase, so when iOS kills the page the next start shows where it died.
// Nothing is sent anywhere; "Sao chép kết quả" copies the text for the family to share by hand.
const VOICE_LOCAL_CHECK_KEY='bep-voice-local-check';
function voiceLocalCheckRecord(){try{return JSON.parse(localStorage.getItem(VOICE_LOCAL_CHECK_KEY)||'null')}catch{return null}}
function voiceLocalCheckSave(r){try{if(r)localStorage.setItem(VOICE_LOCAL_CHECK_KEY,JSON.stringify(r));else localStorage.removeItem(VOICE_LOCAL_CHECK_KEY)}catch{}return r}
// At start-up (from voiceLocalCheckCrash): a check that was running when the page died → its "died in phase" result.
function voiceLocalCheckDied(id,markerPhase){const r=voiceLocalCheckRecord();if(!r||!r.running||r.pack!==id)return false;
 voiceLocalCheckSave({...r,running:false,ok:false,died:true,phase:r.phase||markerPhase||'',markerPhase:markerPhase||'',endedAt:Date.now(),open:true});return true}
function voiceLocalDeviceClass(ua,touch){ua=String(ua||'');if(/iPhone|iPod/.test(ua))return'iphone';if(/iPad/.test(ua)||/Macintosh/.test(ua)&&(+touch||0)>1)return'ipad';if(/Android/.test(ua))return/Mobile/.test(ua)?'android-phone':'android-tablet';if(/Macintosh|Mac OS X/.test(ua))return'mac';if(/Windows/.test(ua))return'windows';if(/CrOS/.test(ua))return'chromebook';if(/Linux/.test(ua))return'linux';return'other'}
function voiceLocalDeviceName(c){return({iphone:'iPhone',ipad:'iPad','android-phone':vlT('Điện thoại Android','Android phone'),'android-tablet':vlT('Máy tính bảng Android','Android tablet'),mac:'Mac',windows:vlT('Máy tính Windows','Windows PC'),chromebook:'Chromebook',linux:vlT('Máy tính Linux','Linux computer')})[c]||vlT('Thiết bị khác','Other device')}
function voiceLocalPhaseName(p){return({'starting':vlT('Bắt đầu','Starting'),'loading-model':vlT('Nạp mô hình','Loading the model'),'transcribing':vlT('Nhận dạng đoạn mẫu','Recognising the test clip'),'self-test':vlT('Chạy thử','Test run'),'resident':vlT('Mô hình đã nạp','Model loaded'),'downloading':vlT('Tải gói','Downloading'),'done':vlT('Xong','Done')})[p]||String(p||'—')}
function voiceLocalDeviceInfo(){const nav=typeof navigator!=='undefined'?navigator:{};const cls=voiceLocalDeviceClass(nav.userAgent,nav.maxTouchPoints);
 return{cls,memoryGB:typeof nav.deviceMemory==='number'?nav.deviceMemory:null,cores:nav.hardwareConcurrency||null,standalone:typeof matchMedia==='function'&&matchMedia('(display-mode: standalone)').matches||nav.standalone===true,ios:voiceLocalOnIOS()}}
function voiceLocalPageMemMB(){try{const m=performance?.memory?.usedJSHeapSize;return typeof m==='number'?Math.round(m/1048576):null}catch{return null}}
async function voiceLocalUaMemMB(){try{if(typeof crossOriginIsolated!=='undefined'&&crossOriginIsolated&&typeof performance.measureUserAgentSpecificMemory==='function'){const r=await performance.measureUserAgentSpecificMemory();return Math.round(r.bytes/1048576)}}catch{}return null}
async function voiceLocalSelfCheck(id='small',{onPhase=(p:string)=>{}}={}){
 if(voiceLocalSelfTestRun.p)await voiceLocalSelfTestRun.p.catch(()=>{});
 const dev=voiceLocalDeviceInfo(),base={pack:id,v:1,ver:voiceLocalGuardVersion(id),device:dev,at:Date.now()};
 if(voiceLocalDisabled(id))return voiceLocalCheckSave({...base,ok:false,code:'disabled',phase:''});
 if((await voiceLocalStatus(id).catch(()=>'none'))!=='ready')return voiceLocalCheckSave({...base,ok:false,code:'not-downloaded',phase:''});
 if(voiceLocalRecording())return{...base,ok:false,code:'busy',phase:''};
 const rec={...base,running:true,phase:'starting'};voiceLocalCheckSave(rec);onPhase('starting');
 const run=(async()=>{try{
   const res=await voiceLocalTestRun(id,p=>{voiceLocalCheckSave({...rec,phase:p});onPhase(p)});
   voiceLocalRecordPass(id,res);
   // Passed: this device can run it now (an earlier failure no longer applies); switching it on stays a choice.
   if(voiceLocalFailed(id))voiceLocalClearFailed();
   return voiceLocalCheckSave({...base,running:false,ok:true,phase:'done',loadMs:res.loadMs,transcribeMs:res.transcribeMs,engine:res.device,mem:res.mem,loadMem:res.loadMem,pageMB:voiceLocalPageMemMB(),uaMB:await voiceLocalUaMemMB(),endedAt:Date.now()})}
  catch(e){const cur=voiceLocalCheckRecord();if(e?.code==='stopped'){voiceLocalCheckSave(null);return{...base,ok:false,code:'stopped',phase:cur?.phase||''}}
   voiceLocalMarkFailed(id,'self-test',e?.code||'error');return voiceLocalCheckSave({...base,running:false,ok:false,code:String(e?.code||'error'),message:String(e?.message||'').slice(0,160),phase:cur?.phase||'',endedAt:Date.now()})}})();
 voiceLocalSelfTestRun.p=run.then(r=>!!r?.ok);const clear=()=>{voiceLocalSelfTestRun.p=null};voiceLocalSelfTestRun.p.then(clear,clear);
 return run}
function voiceLocalMs(ms){if(typeof ms!=='number')return'—';const s=ms/1000;return(s>=10?Math.round(s):Math.round(s*10)/10).toLocaleString(typeof appLanguage!=='undefined'&&appLanguage==='en'?'en-AU':'vi-VN')+' s'}
function voiceLocalCheckRows(r){const rows=[];const dev=r?.device||voiceLocalDeviceInfo();
 rows.push([vlT('Thiết bị','Device'),voiceLocalDeviceName(dev.cls)+(dev.memoryGB?` · ${dev.memoryGB} GB RAM`:'')+(dev.cores?` · ${dev.cores} ${vlT('nhân','cores')}`:'')+(dev.standalone?` · ${vlT('ứng dụng màn hình chính','home-screen app')}`:'')]);
 if(!r)return rows;
 rows.push([vlT('Kết quả','Result'),r.running?vlT('Đang chạy…','Running…'):r.ok?vlT('Đạt — chạy được trên máy này','Passed — runs on this device'):r.died?vlT('Trang bị tắt (máy thiếu bộ nhớ)','The page was closed (out of memory)'):r.code==='disabled'?vlT('Đã tắt trên máy này','Off on this device'):r.code==='not-downloaded'?vlT('Chưa tải gói','Pack not downloaded'):vlT('Không đạt','Did not pass')+(r.code?` (${r.code})`:'')]);
 rows.push([r.died?vlT('Bị tắt ở bước','Closed during'):vlT('Bước đã tới','Phase reached'),voiceLocalPhaseName(r.phase)]);
 if(r.ok){rows.push([vlT('Thời gian nạp','Load time'),voiceLocalMs(r.loadMs)]);rows.push([vlT('Thời gian nhận dạng','Transcription time'),voiceLocalMs(r.transcribeMs)])}
 const wasm=r.mem?.wasmPeakMB||r.mem?.wasmMB||null;rows.push([vlT('Bộ nhớ cao nhất (mô hình)','Peak memory (model)'),typeof wasm==='number'?`${wasm.toLocaleString()} MB`:r.ok?vlT('Trình duyệt không cho đọc','Not exposed by this browser'):'—']);
 if(typeof r.pageMB==='number')rows.push([vlT('Bộ nhớ trang (JS)','Page memory (JS)'),`${r.pageMB.toLocaleString()} MB`]);
 if(typeof r.uaMB==='number')rows.push([vlT('Bộ nhớ trình duyệt đo được','Browser-measured memory'),`${r.uaMB.toLocaleString()} MB`]);
 if(r.at)rows.push([vlT('Lúc','When'),typeof appTimeLabel==='function'?appTimeLabel(r.at,{year:true,zone:true}):new Date(r.at).toLocaleString('vi-VN',{timeZone:'Australia/Sydney'})]);
 return rows}
function voiceLocalCheckText(r){return[vlT('Kiểm tra giọng chính xác','Accurate voice check')+' · '+VOICE_LOCAL_MEM_VERSION,...voiceLocalCheckRows(r).map(([k,v])=>k+': '+v),'UA: '+(typeof navigator!=='undefined'?String(navigator.userAgent).slice(0,200):'')].join('\n')}
const voiceLocalCheckUi={running:false,phase:'',started:0,timer:0,last:null};
function voiceLocalCheckHtml(){const id=VOICE_AUTO_PACK,r=voiceLocalCheckUi.running?{...voiceLocalCheckRecord(),running:true,phase:voiceLocalCheckUi.phase}:(voiceLocalCheckUi.last||voiceLocalCheckRecord()),disabled=voiceLocalDisabled(id),ready=voiceLocalReady[id],ios=voiceLocalOnIOS();
 const rows=voiceLocalCheckRows(r).map(([k,v])=>`<div class="vl-sc-row"><dt>${vlEsc(k)}</dt><dd>${vlEsc(v)}</dd></div>`).join('');
 const status=voiceLocalCheckUi.running?`<p class="vl-sc-status" role="status" aria-live="polite" tabindex="-1"><b>${vlEsc(voiceLocalPhaseName(voiceLocalCheckUi.phase))}…</b> <span class="vl-sc-elapsed">${vlEsc(voiceLocalMs(Date.now()-voiceLocalCheckUi.started))}</span></p>`:r?.died?`<p class="vl-sc-died" role="alert">${vlEsc(vlT(`Lần kiểm tra trước, trang bị tắt ở bước “${voiceLocalPhaseName(r.phase)}” — máy hết bộ nhớ cho gói này.`,`During the last check the page was closed at “${voiceLocalPhaseName(r.phase)}” — the device ran out of memory for this pack.`))}</p>`:'';
 const start=disabled?`<p class="hint">${vlEsc(voiceLocalFailText({pack:id,stage:'crash'}))}</p>`:voiceLocalCheckUi.running?'':`<button type="button" class="btn primary" data-vl-check-run ${ready===false?'disabled':''}>${r&&!r.running?vlT('Kiểm tra lại','Check again'):vlT('Bắt đầu kiểm tra','Start the check')}</button>`;
 const after=!voiceLocalCheckUi.running&&r?.ok&&voiceLocalChoice()!==id&&!voiceLocalFailed(id)?`<button type="button" class="btn" data-vl-check-use>${vlT('Dùng giọng chính xác','Use accurate voice')}</button>`:'';
 const copy=r&&!voiceLocalCheckUi.running?`<button type="button" class="btn" data-vl-check-copy>${vlT('Sao chép kết quả','Copy results')}</button>`:'';
 return`<div class="vl-sc" id="vl-selfcheck"><p>${vlT('Chạy thử bộ “Chính xác hơn” (Whisper small) một lần khi bạn không nói: nạp mô hình rồi nhận dạng một đoạn mẫu 1 giây. Không gửi âm thanh hay kết quả đi đâu.','Runs the “More accurate” pack (Whisper small) once while you are not speaking: loads the model, then recognises a 1-second test clip. No audio or result is sent anywhere.')}</p>
 ${ios&&!disabled?`<p class="hint">${vlT('Trên iPhone/iPad nếu máy thiếu bộ nhớ, trang có thể tải lại một lần — mở lại mục này để xem bị tắt ở bước nào.','On iPhone/iPad, if memory runs out the page may reload once — open this again to see the phase it stopped in.')}</p>`:''}
 ${ready===false?`<p class="hint">${vlT('Cần tải gói trước (Tài khoản & cài đặt → Tải về để dùng offline).','Download the pack first (Account & settings → Downloads for offline use).')}</p>`:''}
 ${status}<dl class="vl-sc-table">${rows}</dl>
 <div class="toolbar vl-sc-actions">${start}${after}${copy}${!disabled&&ready?`<button type="button" class="btn soft" data-vl-remove="${id}">${vlT('Gỡ gói','Remove pack')}</button>`:''}</div>
 <p class="hint">${vlT('Số đo bộ nhớ là bộ nhớ của mô hình mà trình duyệt cho đọc; hệ điều hành có thể dùng thêm.','The memory figure is the model memory the browser exposes; the system may use more.')}</p></div>`}
// Re-render in place; focus stays inside the check (status while running, then the first action).
function voiceLocalCheckRender(){const box=typeof document!=='undefined'&&document.getElementById('vl-selfcheck');if(!box)return false;const focused=!!document.activeElement&&box.contains(document.activeElement);box.outerHTML=voiceLocalCheckHtml();if(focused)(document.querySelector('#vl-selfcheck .vl-sc-status')||document.querySelector('#vl-selfcheck .vl-sc-actions button'))?.focus?.();return true}
async function voiceLocalCheckModal(){
 if(typeof document==='undefined')return;try{typeof stopVoice==='function'&&stopVoice()}catch{}
 const r=voiceLocalCheckRecord();if(r?.open){voiceLocalCheckSave({...r,open:false})}
 try{voiceLocalCap=voiceLocalCap||await voiceLocalProbe();voiceLocalReady[VOICE_AUTO_PACK]=(await voiceLocalStatus(VOICE_AUTO_PACK).catch(()=>'none'))==='ready'}catch{}
 const body=voiceLocalCheckHtml();
 if(typeof modal==='function'){modal(vlT('Kiểm tra giọng chính xác trên máy này','Check accurate voice on this device'),body,`<button class="btn" data-action="close-modal">${vlT('Đóng','Close')}</button>`,true);document.querySelector('.modal')?.classList.add('vl-sc-sheet')}
 else{document.getElementById('vl-selfcheck')?.remove();document.body.insertAdjacentHTML('beforeend',body)}}
async function voiceLocalCheckStart(){if(voiceLocalCheckUi.running)return;
 voiceLocalCheckUi.running=true;voiceLocalCheckUi.phase='starting';voiceLocalCheckUi.started=Date.now();voiceLocalCheckUi.last=null;voiceLocalCheckRender();
 clearInterval(voiceLocalCheckUi.timer);voiceLocalCheckUi.timer=setInterval(()=>{const el=document.querySelector('#vl-selfcheck .vl-sc-elapsed');if(el)el.textContent=voiceLocalMs(Date.now()-voiceLocalCheckUi.started);else if(!document.getElementById('vl-selfcheck'))clearInterval(voiceLocalCheckUi.timer)},1000);
 let res=null;try{res=await voiceLocalSelfCheck(VOICE_AUTO_PACK,{onPhase:p=>{voiceLocalCheckUi.phase=p;voiceLocalCheckRender()}})}catch(e){res={ok:false,code:String(e?.code||'error')}}
 clearInterval(voiceLocalCheckUi.timer);voiceLocalCheckUi.running=false;voiceLocalCheckUi.last=res;
 await voiceLocalSyncRecognizers().catch(()=>{});voiceLocalCheckRender();voiceLocalRecNote();return res}
// After a reload caused by a check that died: open the check again so the phase is visible (once).
function voiceLocalCheckLater(){if(typeof document==='undefined')return;const go=()=>setTimeout(()=>{const r=voiceLocalCheckRecord();if(r?.open&&r.died)voiceLocalCheckModal().catch(()=>{})},700);if(document.readyState==='complete')go();else addEventListener('load',go,{once:true})}
// Switch a downloaded pack on: at once off iOS, after a passed self-test on iPhone/iPad. Returns true when switched on.
async function voiceLocalActivate(id,{force=false,quiet=false}={}){
 if(force)voiceLocalClearFailed();
 if(voiceLocalOnIOS()&&!voiceLocalSelfTestPassed(id)||force){
  if(!quiet&&typeof toast==='function')toast(vlT('Đang thử bộ giọng chính xác trên máy này… vẫn dùng giọng nói thường cho tới khi xong.','Testing accurate voice on this device… standard voice input is used until it is done.'));
  if(!(await voiceLocalSelfTest(id,{force})))return false}
 if(voiceLocalFailed(id))return false;
 voiceLocalSetChoice(id);await voiceLocalSyncRecognizers().catch(()=>{});
 // The shared selector (voice-commands.js) re-renders on registry changes only; the pack may have been registered already.
 try{typeof vcRenderSettings==='function'?vcRenderSettings():(()=>{const sel=typeof document!=='undefined'&&document.getElementById('voice-recognizer');if(sel)sel.value='local-'+id})()}catch{}
 try{typeof vcModeChip==='function'&&vcModeChip()}catch{}voiceLocalRenderSettings().catch(()=>{});voiceLocalRecNote();return true}
// Visible progress for the slow first use: "Đang nạp…" while the model loads, "Đang nhận dạng…" while a sentence is decoded.
function voiceLocalNote(kind){if(typeof document==='undefined')return;const text=kind==='loading'?vlT('Đang nạp gói giọng nói trên máy… lần đầu có thể mất 10–60 giây.','Loading the on-device speech pack… the first time can take 10–60 seconds.'):kind==='recognizing'?vlT('Đang nhận dạng…','Recognising…'):kind==='listening'?vlT('Đang nghe trên máy (không gửi âm thanh).','Listening on this device (no audio sent).'):'';for(const el of [document.getElementById('voice-status'),document.getElementById('vp-status')])if(el&&text)el.textContent=text;const live=document.getElementById('voice-live')||document.getElementById('vp-live');if(live){if(kind==='loading'||kind==='recognizing')live.dataset.local=kind;else delete live.dataset.local}}
const VOICE_LOCAL_WORKLET=`class BepCapture extends AudioWorkletProcessor{process(inputs){const i=inputs[0];if(i&&i.length&&i[0].length){const chans=i.map(c=>c.slice(0));this.port.postMessage(chans,chans.map(c=>c.buffer))}return true}}registerProcessor('bep-capture',BepCapture)`;
async function voiceLocalRecorder(onFrame){
 // v1.7.6: the shared voice-sheet stream (voice-price.js) so iOS does not ask for the microphone on every hold
 const shared=typeof bepMicOpen==='function',stream=shared?await bepMicOpen():await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
 let ctx;try{ctx=new AudioContext({sampleRate:16000})}catch{ctx=new AudioContext()}
 let src;try{src=ctx.createMediaStreamSource(stream)}catch{await ctx.close().catch(()=>{});ctx=new AudioContext();src=ctx.createMediaStreamSource(stream)}
 const url=URL.createObjectURL(new Blob([VOICE_LOCAL_WORKLET],{type:'text/javascript'}));
 await ctx.audioWorklet.addModule(url);URL.revokeObjectURL(url);
 const node=new AudioWorkletNode(ctx,'bep-capture',{numberOfInputs:1,numberOfOutputs:0,channelCount:1});
 const rate=ctx.sampleRate;node.port.onmessage=e=>onFrame(voiceLocalResample(voiceLocalDownmix(e.data),rate,16000));
 src.connect(node);if(ctx.state==='suspended')await ctx.resume().catch(()=>{});
 return{stop(){try{src.disconnect()}catch{}try{node.port.onmessage=null;node.disconnect()}catch{}if(shared)bepMicIdle();else for(const t of stream.getTracks())t.stop();ctx.close().catch(()=>{})}};
}
// Recognizer object (same shape as registerVoiceRecognizer expects).
function voiceLocalRecognizer(id,deps={}){
 const pack=VOICE_LOCAL_PACKS[id];
 return{id:'local-'+id,label:vlT('Trên máy · ','On device · ')+vlT(pack.vi,pack.en),local:true,
  async available(){const cap=await (deps.probe||voiceLocalProbe)();return cap.packs[id].ok&&(deps.usable?deps.usable(id):voiceLocalUsable(id))&&(await (deps.status||voiceLocalStatus)(id))==='ready'},
  async start(lang,onResult,onEnd){
   if(voiceLocalActive)await voiceLocalActive.stop(true);
   const ensure=deps.ensure||voiceLocalEnsureEngine,record=deps.record||voiceLocalRecorder,mode=deps.langMode?deps.langMode():voiceLocalLangMode(),note=deps.note||voiceLocalNote;
   const language=voiceLocalWhisperLang(lang,lang==='auto'?'auto':mode);
   let ended=false,busy=false,queue=[],rec=null,engine=null,stopping=false;
   // ≤ 15 s per sentence; on iPhone/iPad no partial re-decodes while speaking (each one is a full Whisper pass).
   const seg=voiceLocalSegmenter({maxMs:15000,...(voiceLocalOnIOS()?{partialMs:1e9}:{}),...(deps.segmenter||{})});
   const finish=info=>{if(ended)return;ended=true;try{rec?.stop()}catch{}rec=null;if(voiceLocalActive===self)voiceLocalActive=null;voiceLocalTouch();try{onEnd&&onEnd(info||{})}catch{}};
   const pump=async()=>{if(busy||!engine)return;const next=queue.find(q=>q.type==='final')||queue[queue.length-1];if(!next){if(stopping)finish({reason:'stopped'});return}
    queue=queue.filter(q=>q!==next&&(next.type==='final'?true:q.type==='final'));busy=true;
    if(next.type==='final')note('recognizing');
    try{const r=await engine.transcribe(next.audio,language,next.type==='final');const text=voiceLocalCleanText(r.text);if(text&&!ended)onResult(text,next.type==='final');if(next.type==='final'&&!stopping)note('listening')}catch(e){if(e.code!=='stopped'){voiceLocalMarkFailed(id,'run',e.code);finish({reason:'error',error:e});return}}finally{busy=false}
    pump()};
   const self={stop:async(abort)=>{if(ended)return;stopping=true;rec?.stop();rec=null;if(abort){queue=[];finish({reason:'aborted'});return}for(const ev of seg.flush())queue.push(ev);queue=queue.filter(q=>q.type==='final');if(!busy)pump()}};
   voiceLocalActive=self;voiceLocalLastUsed='local-'+id;
   // v1.7.2: the microphone first (the iOS permission prompt appears at once, not after a long model load), then the
   // model; speech captured while it loads is queued. A hold that ended meanwhile stops the microphone again.
   try{note('loading');const r0=await record(frame=>{if(ended||stopping)return;for(const ev of seg.push(frame)){if(ev.type==='partial'&&(busy||!engine))continue;queue.push(ev)}pump()});
    if(ended){try{r0.stop()}catch{}return self}if(stopping){try{r0.stop()}catch{}}else rec=r0;
    try{engine=await ensure(id)}catch(e){if(e?.code!=='stopped')voiceLocalMarkFailed(id,'load',e?.code);throw e}if(ended)return self;if(!stopping)note('listening');pump()}catch(e){finish({reason:'error',error:e});throw e}
   return self},
  async stop(){await voiceLocalActive?.stop(false)},
  async abort(){await voiceLocalActive?.stop(true)}
 };
}

// ---------- manual benchmark (opt-in; run from the browser console or scripts/voice-bench) ----------
// await voiceLocalBenchmark('small',{seconds:8})  → speak for 8 s; or pass {audio:Float32Array(16 kHz mono)}.
async function voiceLocalBenchmark(id='small',{seconds=8,audio=null,language='vietnamese'}={}){
 if((await voiceLocalStatus(id))!=='ready')throw Error('Download the pack first (voice sheet → Voice settings).');
 voiceLocalEngine?.dispose();voiceLocalEngine=null;
 const t0=performance.now();const eng=await voiceLocalEnsureEngine(id);const loadMs=Math.round(performance.now()-t0);
 let pcm=audio;
 if(!pcm){const frames=[];const rec=await voiceLocalRecorder(f=>frames.push(f));await new Promise(r=>setTimeout(r,seconds*1000));rec.stop();const n=frames.reduce((a,f)=>a+f.length,0);pcm=new Float32Array(n);let o=0;for(const f of frames){pcm.set(f,o);o+=f.length}}
 const audioSeconds=Math.round(pcm.length/1600)/10,t1=performance.now();const r=await eng.transcribe(pcm,language,true);const transcribeMs=Math.round(performance.now()-t1);
 const second=new Float32Array(Math.min(16000*5,Math.round(audioSeconds*16000)));const t2=performance.now();await eng.transcribe(second,language,true);const warm5sMs=Math.round(performance.now()-t2);
 return{pack:id,loadMs,audioSeconds,transcribeMs,realTimeFactor:audioSeconds?Math.round(transcribeMs/10/audioSeconds)/100:null,warm5sSilenceMs:warm5sMs,text:voiceLocalCleanText(r.text),rawText:r.text,userAgent:navigator.userAgent,deviceMemoryGB:navigator.deviceMemory??null,cpuThreads:navigator.hardwareConcurrency??null,jsHeapMB:performance.memory?Math.round(performance.memory.usedJSHeapSize/1e6):null,crossOriginIsolated:typeof crossOriginIsolated!=='undefined'?crossOriginIsolated:false};
}

// ---------- hooks: voice sheet + offline downloads ----------
// The voice sheet's registry (registerVoiceRecognizer, voice-commands.js) loads AFTER this script, so registration runs
// again when it announces itself ('bep-voice-registry'). Only packs that are downloaded AND usable on this device are
// registered as recognisers, so the selector never offers one that cannot start; download/remove re-sync.
const voiceLocalUnregister={};
function voiceLocalAdapter(id){const r=voiceLocalRecognizer(id);return{id:r.id,label:r.label,offline:true,flushOnStop:true,local:true,
 // R's contract: onResult(text,{isFinal}); this recogniser reports (text, final:boolean).
 start:(lang,onResult,onEnd)=>r.start(lang,(text,final)=>onResult(text,{isFinal:!!final}),info=>{if(info&&info.reason==='error'&&voiceLocalFailed(id))voiceLocalShowFailure();return onEnd&&onEnd(info)}),stop:()=>r.stop(),abort:()=>r.abort()}}
// The fallback message with one-tap "Thử lại" (choose the pack again) and "Gỡ gói" (free the space).
// v1.7.4: no "Thử lại" once the device is disabled (second crash); "Gỡ gói" says how much space it frees.
function voiceLocalRetryButton(id){return voiceLocalDisabled(id)?'':`<button type="button" class="btn small" data-vl-retry="${vlEsc(id)}">${vlT('Thử lại','Try again')}</button>`}
// v1.7.6 (ladybug report 4 Nov: "ô màu cam là gì… Thử lại và Gỡ gói có chức năng gì… màn hình trắng rồi bị đẩy ra homepage"):
// one plain line on what happened and what each button does.
function voiceLocalExplainHtml(f){const crash=voiceLocalIsCrash(f);return`<p class="hint vl-explain">${crash?vlT('Màn hình trắng rồi về trang chủ là do máy hết bộ nhớ khi chạy giọng chính xác; app đã tự tắt nó để không lặp lại. ','A white screen and a jump back to the home page means the device ran out of memory with accurate voice; the app switched it off so it does not happen again. '):''}${vlT('Nói vẫn dùng được bình thường. «Thử lại» chạy thử giọng chính xác một lần nữa; «Gỡ gói» xoá gói giọng đã tải để lấy lại dung lượng.','Talking still works as usual. “Try again” tests accurate voice once more; “Remove pack” deletes the downloaded voice pack to free space.')}</p>`}
function voiceLocalFailureHtml(f){return`<div class="vl-fail" id="vl-fail" role="alert"><p>${vlEsc(voiceLocalFailText(f))}</p>${voiceLocalExplainHtml(f)}<div class="toolbar">${voiceLocalRetryButton(f.pack)}<button type="button" class="btn small" data-vl-remove="${vlEsc(f.pack)}">${vlT('Gỡ gói','Remove pack')}</button><button type="button" class="btn small" data-vl-check>${vlT('Kiểm tra máy này','Check this device')}</button></div></div>`}
function voiceLocalShowFailure(){if(typeof document==='undefined')return;const f=voiceLocalFailed();if(!f)return;document.getElementById('vl-fail')?.remove();const anchor=document.getElementById('voice-live')||document.getElementById('vp-live');if(anchor)anchor.insertAdjacentHTML('afterend',voiceLocalFailureHtml(f));voiceLocalSyncRecognizers().catch(()=>{})}
// v1.7.2: the one-time notice after the page died with the model in memory (non-blocking, above the bottom bar).
function voiceLocalCrashNoticeHtml(f){const id=vlEsc(f.pack);return`<div class="vl-crash-notice" id="vl-crash-notice" role="status" aria-live="polite"><p class="vl-crash-text">${vlEsc(voiceLocalFailText(f))}</p>${voiceLocalExplainHtml(f)}<div class="vl-crash-actions">${voiceLocalRetryButton(f.pack)}<button type="button" class="btn small" data-vl-remove="${id}">${vlT('Gỡ gói','Remove pack')}</button><button type="button" class="vl-crash-close" data-vl-crash-close aria-label="${vlT('Đóng thông báo','Close notice')}" title="${vlT('Đóng thông báo','Close notice')}">×</button></div></div>`}
function voiceLocalShowCrashNotice(){if(typeof document==='undefined'||!document.body)return false;const f=voiceLocalFailed();if(!voiceLocalIsCrash(f)||f.notice!=='pending')return false;
 document.getElementById('vl-crash-notice')?.remove();document.body.insertAdjacentHTML('beforeend',voiceLocalCrashNoticeHtml(f));
 try{localStorage.setItem(VOICE_LOCAL_FAIL_KEY,JSON.stringify({...f,notice:'shown'}))}catch{}return true}
function voiceLocalCrashNoticeLater(){if(typeof document==='undefined')return;const go=()=>setTimeout(()=>{try{voiceLocalShowCrashNotice()}catch{}},600);if(document.readyState==='complete')go();else addEventListener('load',go,{once:true})}
// Follows the app language while it is on screen.
function voiceLocalCrashNoticeRefresh(){const n=typeof document!=='undefined'&&document.getElementById('vl-crash-notice');if(!n)return;const f=voiceLocalFailed();if(!voiceLocalIsCrash(f)){n.remove();return}const t=n.querySelector('.vl-crash-text');if(t)t.textContent=voiceLocalFailText(f)}
// "Thử lại / Try again": explicit, with a warning; runs the self-test and switches the pack on only if it passes.
async function voiceLocalRetry(id){if(!VOICE_LOCAL_PACKS[id])return false;
 // v1.7.4: after a second memory crash there is no further attempt on this device (until an update).
 if(voiceLocalDisabled(id)){typeof toast==='function'&&toast(voiceLocalFailText({pack:id,stage:'crash'}),true);return false}
 const crash=voiceLocalIsCrash(voiceLocalFailed(id))||voiceLocalCrashCount(id)>0;
 const body=(crash?vlT('Lần trước máy thiếu bộ nhớ và trang đã tải lại.','Last time the device ran out of memory and the page reloaded.')+' ':'')+vlT('Thử lại một lần: app chạy thử khi bạn không nói, trang có thể tải lại một lần nữa. Nếu lại thiếu bộ nhớ, giọng chính xác sẽ tắt trên máy này tới bản cập nhật sau; giọng nói thường vẫn dùng được.','One more try: the app runs a test while you are not speaking and the page may reload once more. If memory runs out again, accurate voice stays off on this device until the next update; the standard voice input keeps working.');
 const ok=typeof confirmDialog==='function'?!!(await confirmDialog({title:vlT('Thử lại bộ giọng chính xác?','Try accurate voice again?'),body,confirmLabel:vlT('Thử lại','Try again'),cancelLabel:vlT('Để sau','Not now')})):confirm(body);
 if(!ok)return false;
 if(typeof document!=='undefined'){document.getElementById('vl-fail')?.remove();document.getElementById('vl-crash-notice')?.remove()}
 if((await voiceLocalStatus(id).catch(()=>'none'))!=='ready'){voiceLocalClearFailed();voiceAutoResume();return false}
 const on=await voiceLocalActivate(id,{force:true});
 if(typeof toast==='function')toast(on?vlT('Bộ giọng chính xác chạy được trên máy này — đã bật.','Accurate voice works on this device — switched on.'):vlT('Máy vẫn chưa chạy được bộ giọng chính xác — giữ giọng nói thường.','This device still cannot run accurate voice — keeping the standard voice input.'),!on);
 if(!on)voiceLocalShowFailure();return on}
// Page lifecycle: a clean end (unload, hidden tab, idle) frees the model and removes the marker; a kill does not.
function voiceLocalDownloadMark(){const id=Object.keys(voiceLocalDownloads)[0];if(id&&(typeof document==='undefined'||document.visibilityState!=='hidden')&&!voiceLocalEngine)voiceLocalBusy(id,'downloading')}
function voiceLocalDownloadUnmark(){const b=voiceLocalBusyNow();if(b&&voiceLocalMarkerPhase(b)==='downloading')voiceLocalBusy('','')}
function voiceLocalLifecycle(){if(voiceLocalLifecycle.on||typeof addEventListener!=='function'||typeof document==='undefined')return;voiceLocalLifecycle.on=true;
 addEventListener('pagehide',()=>{voiceLocalRelease('pagehide');voiceLocalDownloadUnmark()});
 addEventListener('pageshow',e=>{if(e.persisted)voiceLocalDownloadMark()});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){voiceLocalRelease('hidden');voiceLocalDownloadUnmark()}else voiceLocalDownloadMark()})}
// The voice sheet's footnote says which recogniser is really in use (and why the accurate one is not, on this device).
const voiceLocalReady={};
function voiceLocalRecNoteText(){const id=VOICE_AUTO_PACK,active=typeof voiceActiveRecognizerId==='function'?voiceActiveRecognizerId():(voiceLocalChoice()&&voiceLocalUsable(voiceLocalChoice())?'local-'+voiceLocalChoice():'browser');
 if(/^local-/.test(active))return vlT('Nhận giọng nói: trên máy · Chính xác hơn (không gửi âm thanh).','Speech recognition: on this device · More accurate (no audio sent).');
 let t=vlT('Nhận giọng nói: giọng nói thường của máy (trình duyệt).','Speech recognition: the device’s standard voice input (browser).');
 if(voiceLocalFailed(id))t+=' '+vlT('Bộ giọng chính xác đã tắt trên máy này.','Accurate voice is off on this device.');
 else if(voiceLocalReady[id]&&voiceLocalOnIOS()&&!voiceLocalSelfTestPassed(id))t+=' '+(voiceLocalSelfTestRun.p?vlT('Đang chạy thử bộ giọng chính xác…','Testing accurate voice…'):vlT('Bộ giọng chính xác sẽ bật sau khi chạy thử thành công.','Accurate voice switches on after a successful test.'));
 return t}
function voiceLocalRecNote(){if(typeof document==='undefined')return;const st=document.getElementById('voice-status');if(!st){voiceLocalDictationTip();return}let n=document.getElementById('vl-rec-note');
 if(!n){n=document.createElement('small');n.id='vl-rec-note';n.className='hint vl-rec-note';st.after(n)}n.textContent=voiceLocalRecNoteText();voiceLocalDictationTip()}
// v1.7.4 iPhone/iPad: whenever accurate voice is not the recogniser in use (not downloaded, not tested yet, failed or off),
// keyboard dictation is the best Vietnamese input there. Every voice sheet with a text box (quick voice, price, recipe)
// shows one short tip and a button that focuses the box so the keyboard — with its 🎤 key — opens.
const VOICE_LOCAL_DICTATE_TARGETS=['voice-text','vp-text','vr-text'];
function voiceLocalDictationWanted(){if(!voiceLocalOnIOS())return false;const id=voiceLocalChoice();return!(id&&voiceLocalUsable(id))}
function voiceLocalDictationTipHtml(target){const lang=typeof appLanguage!=='undefined'?appLanguage:'vi';return`<div class="vl-dictate" id="vl-dictate-${target}" data-lang="${lang}" role="note"><p>💡 ${vlT('Trên iPhone: chạm vào ô chữ rồi bấm 🎤 trên bàn phím để đọc chính tả (tiếng Việt rất tốt).','On iPhone: tap the text box, then tap 🎤 on the keyboard to dictate (Vietnamese works very well).')}</p><button type="button" class="btn small" data-vl-dictate="${target}">⌨️ ${vlT('Mở bàn phím để nói','Open the keyboard to talk')}</button></div>`}
function voiceLocalDictationTip(){if(typeof document==='undefined')return 0;const want=voiceLocalDictationWanted(),lang=typeof appLanguage!=='undefined'?appLanguage:'vi';let n=0;
 for(const t of VOICE_LOCAL_DICTATE_TARGETS){const box=document.getElementById(t),tip=document.getElementById('vl-dictate-'+t);
  if(!box||!want){tip?.remove();continue}
  if(tip){if(tip.dataset.lang!==lang)tip.outerHTML=voiceLocalDictationTipHtml(t);continue}
  (box.closest('.field')||box).insertAdjacentHTML('afterend',voiceLocalDictationTipHtml(t));n++}
 return n}
function voiceLocalDictationWatch(){if(voiceLocalDictationWatch.on||typeof document==='undefined'||typeof MutationObserver!=='function')return;const root=document.getElementById('modal-root');if(!root)return;voiceLocalDictationWatch.on=true;
 let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;try{voiceLocalDictationTip()}catch{}})}).observe(root,{childList:true,subtree:true})}
// Stops this sheet's own listening (the keyboard's dictation needs the microphone) and opens the keyboard on the box.
function voiceLocalOpenKeyboard(target){const box=document.getElementById(target);if(!box)return false;
 try{if(target==='voice-text'&&typeof stopVoice==='function')stopVoice();if(target==='vp-text'&&typeof vpState!=='undefined')vpState.take?.stop?.(true);if(target==='vr-text'&&typeof vrState!=='undefined')vrState.take?.stop?.(true)}catch{}
 box.focus();try{const n=box.value.length;box.setSelectionRange(n,n)}catch{}
 if(target==='voice-text'&&typeof voiceSetUi==='function')try{voiceSetUi('stopped',vlT('Bấm 🎤 trên bàn phím rồi nói; xong thì bấm Xem trước.','Tap 🎤 on the keyboard and speak; then tap Preview.'))}catch{}
 return true}
// Account & settings → "Giọng nói trên máy": the way to the self-check page.
function voiceLocalSettingsCardHtml(){const f=voiceLocalFailed(VOICE_AUTO_PACK),off=voiceLocalDisabled(VOICE_AUTO_PACK),r=voiceLocalCheckRecord();
 const state=off||voiceLocalIsCrash(f)?voiceLocalFailText(f||{pack:VOICE_AUTO_PACK,stage:'crash'}):r&&!r.running?(r.ok?vlT('Lần kiểm tra gần nhất: đạt.','Last check: passed.'):vlT('Lần kiểm tra gần nhất: không đạt.','Last check: did not pass.')):'';
 const body=`${state?`<p class="hint">${vlEsc(state)}</p>`:''}<button type="button" class="btn small" data-vl-check>${vlT('Kiểm tra giọng chính xác trên máy này','Check accurate voice on this device')}</button>`;
 const title=vlT('Giọng nói trên máy','On-device voice'),desc=vlT('Bộ “Chính xác hơn” chạy trên máy, không gửi âm thanh.','The “More accurate” pack runs on this device; no audio is sent.');
 return typeof settingsCard==='function'?settingsCard('settings','voice',title,desc,body):`<section class="kitchen-section kitchen-card" id="settings-voice"><h3>${title}</h3><p class="kitchen-desc">${desc}</p>${body}</section>`}
async function voiceLocalSyncRecognizers(){
 if(typeof registerVoiceRecognizer!=='function')return 0;let n=0;
 let cap=null;try{cap=voiceLocalCap||await voiceLocalProbe();voiceLocalCap=cap}catch{}
 for(const id of Object.keys(VOICE_LOCAL_PACKS)){let ok=false;try{ok=!!cap?.packs?.[id]?.ok&&voiceLocalUsable(id)&&(await voiceLocalStatus(id))==='ready'}catch{}
  voiceLocalReady[id]=!!cap?.packs?.[id]?.ok&&(await voiceLocalStatus(id).catch(()=>'none'))==='ready';
  if(ok&&!voiceLocalUnregister[id]){try{voiceLocalUnregister[id]=registerVoiceRecognizer(voiceLocalAdapter(id))||(()=>{});n++}catch{}}
  else if(!ok&&voiceLocalUnregister[id]){try{voiceLocalUnregister[id]()}catch{}delete voiceLocalUnregister[id]}}
 // A stored on-device choice whose pack is gone (removed, evicted, unsupported), failed on this device or (iPhone/iPad)
 // has not passed the self-test yet falls back to the browser recogniser.
 const id=voiceLocalChoice();if(id&&!voiceLocalUnregister[id])voiceLocalSetChoice('');
 voiceLocalRecNote();return n}
function voiceLocalRegisterHooks(){
 let n=0;
 if(typeof registerVoiceRecognizer==='function'&&!voiceLocalRegisterHooks.voice){voiceLocalRegisterHooks.voice=true;voiceLocalSyncRecognizers().catch(()=>{})}
 if(typeof registerOfflinePack==='function'&&!voiceLocalRegisterHooks.packs){voiceLocalRegisterHooks.packs=true;
  // Downloads for offline use (offline-downloads.js): status() → {state:'ready'|'partial'|'none'|'unavailable', have, total};
  // download(onProgress(doneBytes,totalBytes), signal); its Wi-Fi-only rule applies there. The voice sheet's pack rows
  // and this row share the same Cache Storage, and both re-sync the recogniser selector afterwards.
  for(const p of Object.values(VOICE_LOCAL_PACKS)){try{registerOfflinePack({id:'voice-local-'+p.id,large:true,
   label:()=>vlT('Nhận giọng nói trên máy · ','On-device speech · ')+vlT(p.vi,p.en),
   description:()=>vlT('Hiểu Vietlish (nói lẫn Việt – Anh) tốt hơn; âm thanh không rời khỏi máy, dùng được khi mất mạng.','Understands Vietlish (mixed Vietnamese–English) better; audio never leaves this device and it works offline.'),
   sizeBytes:voiceLocalPackBytes(p.id)+voiceLocalBytes(voiceLocalRuntime()),
   status:async()=>{const st=await voiceLocalPackStatus(p.id);return p.id===VOICE_AUTO_PACK&&voiceAuto.job?{...st,busy:true,busyText:vlT('Đang tự tải…','Downloading automatically…')}:st},
   extraHtml:p.id===VOICE_AUTO_PACK?()=>voiceAutoRowHtml():undefined,
   beforeDownload:async()=>{const w=voiceLocalDownloadWarning(p.id,voiceLocalCap||await voiceLocalProbe(),typeof appLanguage!=='undefined'?appLanguage:'vi');if(!w)return true;return typeof confirmDialog==='function'?!!(await confirmDialog({title:vlT('Tải gói giọng nói trên máy?','Download on-device speech?'),body:w,confirmLabel:vlT('Tải về','Download'),cancelLabel:vlT('Để sau','Not now')})):confirm(w)},
   download:async(onProgress,signal)=>{vlSet(VOICE_AUTO_PAUSED_KEY,null);vlSet(VOICE_AUTO_REMOVED_KEY,null);await voiceLocalDownload(p.id,(f,loaded,total)=>{try{onProgress&&onProgress(loaded,total)}catch{}},{signal});voiceLocalClearFailed();await voiceLocalSyncRecognizers().catch(()=>{});if(!voiceLocalChoice())voiceLocalActivate(p.id).catch(()=>{});voiceLocalRenderSettings().catch(()=>{});return true},
   remove:async()=>{voiceAutoMarkRemoved();await voiceLocalRemove(p.id);await voiceLocalSyncRecognizers().catch(()=>{});voiceLocalRenderSettings().catch(()=>{});return true}});n++}catch{}}}
 return n;
}

// ---------- v1.7.1 default: "More accurate" downloads itself and switches on (owner decision) ----------
// After the app has loaded and gone idle (~10 s after first render, never during startup) the pack downloads in the
// background when this device can run it and there is room. Where the Network Information API exists (Android, desktop
// Chrome) it waits on mobile data / Data Saver; where it does not (iPhone/iPad) it starts and shows a small progress chip
// with Tạm dừng / Pause (persisted; Tiếp tục / Resume continues from the last stored 8 MB range). It never starts on low
// battery (< 20 %, not charging) or in a hidden tab, but continues in the background once started. When the pack is ready
// it becomes the recogniser automatically (one-time toast) unless the family chose otherwise: an explicit "browser" choice
// in Voice settings, a removal of the pack (never auto-downloaded again) and a failed run on this device are all kept.
// Automated browsers (navigator.webdriver: CI, crawlers) never auto-download unless a test opts in (BEP_VOICE_AUTO_TEST).
const VOICE_AUTO_KEY='bep-voice-auto-download',VOICE_AUTO_PAUSED_KEY='bep-voice-auto-paused',VOICE_AUTO_REMOVED_KEY='bep-voice-auto-removed',VOICE_AUTO_TOAST_KEY='bep-voice-auto-toast',VOICE_AUTO_PROGRESS_KEY='bep-voice-auto-progress',VOICE_AUTO_HIDE_KEY='bep-voice-auto-chip-hidden';
const VOICE_AUTO_PACK='small',VOICE_AUTO_DELAY_MS=10000;
function vlGet(k){try{return localStorage.getItem(k)}catch{return null}}
function vlSet(k,v){try{if(v===null||v===undefined)localStorage.removeItem(k);else localStorage.setItem(k,String(v))}catch{}}
function voiceAutoEnabled(){return vlGet(VOICE_AUTO_KEY)!=='0'}
function voiceAutoSetEnabled(on){vlSet(VOICE_AUTO_KEY,on?'1':'0');if(on)vlSet(VOICE_AUTO_REMOVED_KEY,null)}
function voiceAutoPaused(){return vlGet(VOICE_AUTO_PAUSED_KEY)==='1'}
function voiceAutoExplicitBrowser(){return vlGet(VOICE_REC_KEY)==='browser'}
// 'ok' (Wi-Fi/ethernet/unknown non-cellular), 'no-api' (iPhone/iPad, Firefox: start with the visible Pause chip),
// 'cellular', 'save-data' or 'offline' (wait).
function voiceAutoNetwork(nav){if(!nav||nav.onLine===false)return'offline';const c=nav.connection||nav.mozConnection||nav.webkitConnection;if(!c)return'no-api';
 if(c.saveData===true)return'save-data';if(c.type==='none')return'offline';if(['cellular','bluetooth','wimax'].includes(c.type))return'cellular';if(['slow-2g','2g'].includes(c.effectiveType))return'cellular';return'ok'}
// Pure decision: {action:'start'|'wait'|'skip'|'ready', reason}.
function voiceAutoDecision(o){
 if(o.state==='ready')return{action:'ready',reason:'ready'};
 if(!o.enabled)return{action:'skip',reason:'off'};
 if(o.removed)return{action:'skip',reason:'removed'};
 if(o.explicitBrowser)return{action:'skip',reason:'browser-chosen'};
 if(o.failed)return{action:'skip',reason:'failed'};
 if(o.automated)return{action:'skip',reason:'automated'};
 if(!o.capable)return{action:'skip',reason:'capability'};
 if(o.quotaFree!=null&&o.need!=null&&o.quotaFree<o.need*1.1)return{action:'skip',reason:'quota'};
 if(o.paused)return{action:'wait',reason:'paused'};
 if(o.net==='offline'||o.net==='cellular'||o.net==='save-data')return{action:'wait',reason:o.net};
 if(o.battery&&typeof o.battery.level==='number'&&o.battery.level<.2&&!o.battery.charging)return{action:'wait',reason:'battery'};
 if(o.hidden)return{action:'wait',reason:'hidden'};
 return{action:'start',reason:o.net==='no-api'?'no-api':'ok'};
}
const voiceAuto={job:null,last:null,scheduled:false,running:false,listening:false,error:''};
function voiceAutoProgress(){try{const p=JSON.parse(vlGet(VOICE_AUTO_PROGRESS_KEY)||'null');return p&&typeof p.done==='number'?p:null}catch{return null}}
async function voiceAutoInputs(){
 const cap=voiceLocalCap||await voiceLocalProbe().catch(()=>null);if(cap)voiceLocalCap=cap;
 const state=await voiceLocalStatus(VOICE_AUTO_PACK).catch(()=>'none');
 let quotaFree=null,need=null;try{const est=await navigator.storage?.estimate?.();if(est&&est.quota){quotaFree=est.quota-(est.usage||0);need=Math.max(0,voiceLocalPackBytes(VOICE_AUTO_PACK)+voiceLocalBytes(voiceLocalRuntime())-(voiceAutoProgress()?.done||0))}}catch{}
 let battery=null;try{if(typeof navigator.getBattery==='function'){const b=await navigator.getBattery();battery={level:b.level,charging:b.charging};if(!voiceAuto.batteryHooked){voiceAuto.batteryHooked=true;b.addEventListener?.('levelchange',()=>voiceAutoRun('battery'));b.addEventListener?.('chargingchange',()=>voiceAutoRun('battery'))}}}catch{}
 return{state,enabled:voiceAutoEnabled(),removed:vlGet(VOICE_AUTO_REMOVED_KEY)==='1',explicitBrowser:voiceAutoExplicitBrowser(),failed:!!voiceLocalFailed(VOICE_AUTO_PACK)||voiceLocalDisabled(VOICE_AUTO_PACK)||voiceLocalCrashCount(VOICE_AUTO_PACK)>0,
  automated:!!navigator.webdriver&&!globalThis.BEP_VOICE_AUTO_TEST,capable:!!cap?.packs?.[VOICE_AUTO_PACK]?.ok,quotaFree,need,paused:voiceAutoPaused(),
  net:globalThis.BEP_OFFLINE?'offline':voiceAutoNetwork(navigator),battery,hidden:typeof document!=='undefined'&&document.visibilityState==='hidden'}}
// Once the pack is ready: make it the recogniser unless the family chose otherwise (one-time toast).
async function voiceAutoMaybeSwitch(){
 await voiceLocalSyncRecognizers().catch(()=>{});
 // v1.7.4: after a memory crash on this device nothing switches (or test-loads) the pack by itself again — only an
 // explicit "Thử lại", the self-check page or "Dùng giọng chính xác" after a passed check.
 if(voiceAutoExplicitBrowser()||voiceLocalFailed(VOICE_AUTO_PACK)||voiceLocalCrashCount(VOICE_AUTO_PACK)>0||voiceLocalChoice())return false;
 if(vlGet(VOICE_REC_KEY))return false;
 if((await voiceLocalStatus(VOICE_AUTO_PACK).catch(()=>'none'))!=='ready')return false;
 // v1.7.2 iPhone/iPad: switched on only after the background self-test passed on this device (never while speaking).
 if(voiceLocalOnIOS()&&!voiceLocalSelfTestPassed(VOICE_AUTO_PACK)){
  const ok=await voiceLocalSelfTest(VOICE_AUTO_PACK);voiceLocalRecNote();
  if(!ok){if(voiceLocalSelfTestRun.deferred&&!voiceAuto.retryTimer)voiceAuto.retryTimer=setTimeout(()=>{voiceAuto.retryTimer=0;voiceAutoRun('self-test').catch(()=>{})},30000);return false}
  await voiceLocalSyncRecognizers().catch(()=>{});
  if(voiceAutoExplicitBrowser()||voiceLocalFailed(VOICE_AUTO_PACK)||vlGet(VOICE_REC_KEY))return false}
 if(typeof registerVoiceRecognizer==='function'&&!voiceLocalUnregister[VOICE_AUTO_PACK])return false;
 voiceLocalSetChoice(VOICE_AUTO_PACK);
 try{typeof vcModeChip==='function'&&vcModeChip()}catch{}voiceLocalRenderSettings().catch(()=>{});
 if(vlGet(VOICE_AUTO_TOAST_KEY)!=='1'){vlSet(VOICE_AUTO_TOAST_KEY,'1');try{typeof toast==='function'&&toast(vlT('Đã bật giọng nói chính xác (dùng được không cần mạng)','Accurate voice is on (works offline)'))}catch{}}
 return true}
function voiceAutoListen(){if(voiceAuto.listening||typeof addEventListener!=='function')return;voiceAuto.listening=true;
 addEventListener('online',()=>voiceAutoRun('online'));
 try{(navigator.connection||navigator.mozConnection||navigator.webkitConnection)?.addEventListener?.('change',()=>voiceAutoRun('network'))}catch{}
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')voiceAutoRun('visible')})}
async function voiceAutoRun(why='idle'){
 if(voiceAuto.running||voiceAuto.job)return voiceAuto.last;voiceAuto.running=true;
 try{await voiceLocalMigrateIndex().catch(()=>0);
  const d=voiceAutoDecision(await voiceAutoInputs());voiceAuto.last=d;
  if(d.action==='ready'){vlSet(VOICE_AUTO_PAUSED_KEY,null);vlSet(VOICE_AUTO_PROGRESS_KEY,null);if(navigator.onLine!==false&&!globalThis.BEP_OFFLINE)voiceLocalKeepWorker().catch(()=>{});await voiceAutoMaybeSwitch()}
  else if(d.action==='wait'){voiceAutoListen();if(d.reason==='paused')voiceAutoRenderChip()}
  else if(d.action==='start'){voiceAutoListen();voiceAuto.running=false;voiceAutoStart(d.reason);return d}
  return d}finally{voiceAuto.running=false}}
async function voiceAutoStart(net){
 if(voiceAuto.job)return;vlSet(VOICE_AUTO_PAUSED_KEY,null);voiceAuto.error='';
 const controller=new AbortController(),prev=voiceAutoProgress(),job={controller,done:prev?.done||0,total:prev?.total||voiceLocalPackBytes(VOICE_AUTO_PACK)+voiceLocalBytes(voiceLocalRuntime()),net:net||voiceAutoNetwork(navigator)};
 voiceAuto.job=job;voiceAutoRenderChip();voiceAutoRenderRow();try{typeof offlineRefreshUi==='function'&&document.querySelector('.offline-pack-list')&&offlineRefreshUi()}catch{}let saved=0;
 try{await voiceLocalDownload(VOICE_AUTO_PACK,(f,done,total)=>{job.done=done;job.total=total||job.total;if(Date.now()-saved>1500){saved=Date.now();vlSet(VOICE_AUTO_PROGRESS_KEY,JSON.stringify({done,total:job.total}))}voiceAutoUpdateProgress()},{signal:controller.signal});
  voiceAuto.job=null;vlSet(VOICE_AUTO_PROGRESS_KEY,null);vlSet(VOICE_AUTO_PAUSED_KEY,null);voiceAutoRenderChip();
  await voiceAutoMaybeSwitch();try{typeof offlineRefreshUi==='function'&&offlineRefreshUi()}catch{}
 }catch(e){voiceAuto.job=null;vlSet(VOICE_AUTO_PROGRESS_KEY,JSON.stringify({done:job.done,total:job.total}));
  if(!controller.signal.aborted)voiceAuto.error=String(e?.message||e).slice(0,140);
  voiceAutoRenderChip();voiceAutoRenderRow();try{typeof offlineRefreshUi==='function'&&offlineRefreshUi()}catch{}}}
function voiceAutoPause(){vlSet(VOICE_AUTO_PAUSED_KEY,'1');const j=voiceAuto.job;if(j){vlSet(VOICE_AUTO_PROGRESS_KEY,JSON.stringify({done:j.done,total:j.total}));j.controller.abort()}voiceAutoRenderChip();voiceAutoRenderRow()}
function voiceAutoResume(){vlSet(VOICE_AUTO_PAUSED_KEY,null);vlSet(VOICE_AUTO_REMOVED_KEY,null);voiceAuto.error='';
 if(navigator.onLine===false||globalThis.BEP_OFFLINE){typeof toast==='function'&&toast(vlT('Tải gói cần kết nối mạng.','Downloading the pack needs an internet connection.'),true);voiceAutoRenderChip();return}
 voiceAutoStart()}
// The explicit "remove" of the pack (Downloads row, voice sheet, failure panel): never download it automatically again.
function voiceAutoMarkRemoved(){vlSet(VOICE_AUTO_REMOVED_KEY,'1');vlSet(VOICE_AUTO_PAUSED_KEY,null);vlSet(VOICE_AUTO_PROGRESS_KEY,null);voiceAuto.job?.controller.abort();voiceAuto.job=null;voiceAutoRenderChip()}
// Same unit as the Downloads row (offline-downloads.js: 1 MB = 1024 × 1024 bytes), so the chip and the row agree.
function voiceAutoMB(n){return Math.round(n/1048576).toLocaleString(typeof appLanguage!=='undefined'&&appLanguage==='en'?'en-AU':'vi-VN')}
function voiceAutoBytesText(){const j=voiceAuto.job,p=j||voiceAutoProgress();if(!p)return'';return`${voiceAutoMB(p.done||0)}/${voiceAutoMB(p.total||voiceLocalPackBytes(VOICE_AUTO_PACK)+voiceLocalBytes(voiceLocalRuntime()))} MB`}
function voiceAutoPct(){const p=voiceAuto.job||voiceAutoProgress();return p&&p.total?Math.min(100,Math.floor((p.done||0)*100/p.total)):0}
function voiceAutoChipState(){return voiceAuto.job?'running':voiceAutoPaused()&&voiceAutoEnabled()&&vlGet(VOICE_AUTO_REMOVED_KEY)!=='1'?'paused':voiceAuto.error?'error':''}
function voiceAutoHidden(){try{return sessionStorage.getItem(VOICE_AUTO_HIDE_KEY)==='1'}catch{return false}}
function voiceAutoRenderChip(){
 if(typeof document==='undefined'||!document.body)return;const st=voiceAutoChipState();let chip=document.getElementById('vl-auto-chip');
 if(!st||voiceAutoHidden()){chip?.remove();return}
 if(!chip){chip=document.createElement('div');chip.id='vl-auto-chip';chip.className='vl-auto-chip';chip.setAttribute('role','region');
  chip.innerHTML='<div class="vl-auto-main"><p class="vl-auto-text"><span class="vl-auto-label" role="status"></span> · <b class="vl-auto-bytes"></b></p><div class="vl-auto-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100"><span></span></div><small class="vl-auto-note"></small></div><button type="button" class="btn small vl-auto-act"></button><button type="button" class="vl-auto-hide" data-vl-auto-hide>×</button>';
  document.body.append(chip)}
 chip.dataset.state=st;voiceAutoUpdateProgress()}
// Text only (keeps focus on the button while bytes arrive); follows the app language on every update.
function voiceAutoUpdateProgress(){
 const chip=typeof document!=='undefined'&&document.getElementById('vl-auto-chip');
 if(chip){const st=voiceAutoChipState()||chip.dataset.state,running=st==='running',pct=voiceAutoPct();chip.dataset.state=st;
  chip.setAttribute('aria-label',vlT('Tải bộ giọng chính xác','Accurate voice download'));
  chip.querySelector('.vl-auto-label').textContent=running?vlT('Đang tải bộ giọng chính xác','Downloading accurate voice'):st==='paused'?vlT('Đã tạm dừng tải bộ giọng chính xác','Accurate voice download paused'):vlT('Tải bộ giọng chính xác bị gián đoạn','Accurate voice download interrupted');
  chip.querySelector('.vl-auto-bytes').textContent=voiceAutoBytesText()||'…';
  const bar=chip.querySelector('.vl-auto-bar');bar.setAttribute('aria-valuenow',String(pct));bar.setAttribute('aria-label',vlT('Tiến độ tải','Download progress'));bar.firstElementChild.style.width=pct+'%';
  const note=chip.querySelector('.vl-auto-note'),noApi=(voiceAuto.job?.net||voiceAutoNetwork(navigator))==='no-api';
  note.textContent=running?(noApi?vlT('Nếu đang dùng 4G/5G, bấm Tạm dừng — sẽ tiếp tục khi bạn bấm Tiếp tục.','If you’re on mobile data, tap Pause — it continues when you tap Resume.'):vlT('Tải nền qua Wi-Fi · vẫn dùng app bình thường.','Downloading in the background on Wi-Fi · keep using the app.')):st==='paused'?vlT('Bấm Tiếp tục khi có Wi-Fi — phần đã tải được giữ lại.','Tap Resume on Wi-Fi — what is downloaded is kept.'):String(voiceAuto.error||'');
  const act=chip.querySelector('.vl-auto-act');act.textContent=running?vlT('Tạm dừng','Pause'):vlT('Tiếp tục','Resume');act.toggleAttribute('data-vl-auto-pause',running);act.toggleAttribute('data-vl-auto-resume',!running);
  const hide=chip.querySelector('.vl-auto-hide');hide.setAttribute('aria-label',vlT('Ẩn (vẫn tải tiếp)','Hide (keeps downloading)'));hide.title=hide.getAttribute('aria-label')}
 voiceAutoUpdateRow()}
// The extra part of the Downloads row (offline-downloads.js calls pack.extraHtml()).
function voiceAutoRowHtml(){const st=voiceAutoChipState();
 return`<label class="vl-auto-opt"><input type="checkbox" class="check" id="vl-auto-dl" ${voiceAutoEnabled()?'checked':''}><span><b>${vlT('Tự tải bộ giọng chính xác','Download accurate voice automatically')}</b><small class="hint">${vlT('Tải nền sau khi mở app (Wi-Fi), rồi tự bật. Miễn phí, chạy trên máy.','Downloads in the background after the app opens (Wi-Fi), then switches on. Free, runs on this device.')}</small></span></label>
 <small class="hint vl-update-note">${vlT('Cập nhật app không cần tải lại gói này','App updates don’t re-download this pack')} · ${vlT('nếu gói đổi, chỉ tải phần mới.','if the pack changes, only the new parts download.')}</small>
 <div class="vl-auto-row" data-vl-auto-row ${st?'':'hidden'}><span class="vl-auto-row-text">${vlEsc(voiceAutoRowText(st))}</span>${st?`<button type="button" class="btn small" ${st==='running'?'data-vl-auto-pause':'data-vl-auto-resume'}>${st==='running'?vlT('Tạm dừng','Pause'):vlT('Tiếp tục','Resume')}</button>`:''}</div>`}
function voiceAutoRowText(st){return st==='running'?vlT('Đang tự tải','Downloading automatically')+' · '+voiceAutoBytesText():st==='paused'?vlT('Đã tạm dừng','Paused')+' · '+voiceAutoBytesText():st==='error'?String(voiceAuto.error):''}
function voiceAutoUpdateRow(){if(typeof document==='undefined')return;const row=document.querySelector('[data-vl-auto-row]');if(!row)return;const st=voiceAutoChipState(),t=row.querySelector('.vl-auto-row-text');if(t)t.textContent=voiceAutoRowText(st);if(!!st===row.hidden)voiceAutoRenderRow()}
function voiceAutoRenderRow(){if(typeof document==='undefined')return;const row=document.querySelector('[data-vl-auto-row]');if(!row)return;const box=document.createElement('div');box.innerHTML=voiceAutoRowHtml();const fresh=box.querySelector('[data-vl-auto-row]');if(fresh)row.replaceWith(fresh)}
// Starts once, after the app has loaded and the browser is idle (≥10 s after first render; never during startup).
function voiceAutoSchedule(){
 if(voiceAuto.scheduled||typeof window==='undefined')return;voiceAuto.scheduled=true;
 const delay=Number.isFinite(+globalThis.BEP_VOICE_AUTO_DELAY_MS)?+globalThis.BEP_VOICE_AUTO_DELAY_MS:VOICE_AUTO_DELAY_MS;
 const idle=()=>{const go=()=>voiceAutoRun('idle').catch(()=>{});if(typeof requestIdleCallback==='function')requestIdleCallback(go,{timeout:5000});else setTimeout(go,0)};
 const after=()=>setTimeout(idle,delay);
 if(document.readyState==='complete')after();else addEventListener('load',after,{once:true});
}
function voiceAutoInstall(){
 voiceAutoSchedule();
 document.addEventListener('click',e=>{const t=e.target?.closest?.('[data-vl-auto-pause],[data-vl-auto-resume],[data-vl-auto-hide]');if(!t)return;e.preventDefault();
  if(t.hasAttribute('data-vl-auto-pause'))voiceAutoPause();else if(t.hasAttribute('data-vl-auto-resume'))voiceAutoResume();
  else{try{sessionStorage.setItem(VOICE_AUTO_HIDE_KEY,'1')}catch{}document.getElementById('vl-auto-chip')?.remove()}});
 document.addEventListener('change',e=>{const t=e.target;if(t?.id!=='vl-auto-dl')return;voiceAutoSetEnabled(t.checked);
  if(!t.checked){if(voiceAuto.job)voiceAutoPause();vlSet(VOICE_AUTO_PAUSED_KEY,null);voiceAutoRenderChip();voiceAutoRenderRow()}else setTimeout(()=>voiceAutoRun('setting').catch(()=>{}),300)});
 if(typeof render==='function'&&!render.__vlAuto){const prev=render;render=function(...a){const out=prev.apply(this,a);try{if(document.getElementById('vl-auto-chip'))voiceAutoUpdateProgress();voiceLocalCrashNoticeRefresh();voiceLocalDictationTip();voiceLocalCheckRender()}catch{}return out};render.__vlAuto=true}
}

// ---------- standalone settings block in the voice sheet ----------
let voiceLocalCap=null;
// With the voice sheet's shared settings (voice-commands.js) this renders as one section inside its single
// "Cài đặt giọng nói" panel: packs with download/remove + consent. The recogniser itself is chosen in that panel's
// "Bộ nhận diện giọng nói" selector and the language in its Tự động / Tiếng Việt / English control, so the
// standalone radio list and the separate auto-language box are not shown there.
function voiceLocalShared(){return typeof registerVoiceRecognizer==='function'}
function voiceLocalSettingsHtml(cap,statuses){
 const shared=voiceLocalShared();
 const choice=voiceLocalChoice(),rt=voiceLocalBytes(voiceLocalRuntime()),lang=typeof appLanguage!=='undefined'?appLanguage:'vi',size=n=>voiceLocalFormatBytes(n,lang);
 const consent=typeof voiceStatsConsent==='function'?voiceStatsConsent():false;
 const packs=Object.values(VOICE_LOCAL_PACKS).map(p=>{const st=statuses[p.id]||'none',c=cap?.packs[p.id]||{ok:false,reasons:[]},ready=st==='ready';
  const title=`<b>${vlEsc(vlT(p.vi,p.en))}</b> <small>· Whisper ${p.id} · ${size(voiceLocalPackBytes(p.id))}${shared&&ready&&choice===p.id?' · '+vlT('đang dùng','in use'):''}</small>`;
  return`<div class="vl-pack" data-vl-pack="${p.id}">${shared?`<p class="vl-pack-title">${title}</p>`:`<label class="vl-choice"><input type="radio" name="vl-choice" value="${p.id}" ${choice===p.id&&ready?'checked':''} ${ready&&c.ok?'':'disabled'}><span>${title}</span></label>`}
  <div class="vl-pack-row"><span class="vl-state" data-state="${st}">${ready?vlT('Đã tải','Downloaded'):st==='partial'?vlT('Tải dở','Partly downloaded'):vlT('Chưa tải','Not downloaded')}</span>${ready?`<button type="button" class="btn small" data-vl-remove="${p.id}">${vlT('Xoá gói','Remove pack')}</button>`:`<button type="button" class="btn small" data-vl-download="${p.id}" ${c.ok?'':'disabled'}>${vlT('Tải','Download')} ${size(voiceLocalPackBytes(p.id))}</button>`}</div>
  <progress class="vl-progress" max="1" value="0" hidden aria-label="${vlT('Tiến độ tải','Download progress')}"></progress>${c.ok?c.warn?`<small class="vl-note">${vlEsc(voiceLocalWarnText(c.warn))}</small>`:'':`<small class="vl-note">${c.reasons.map(voiceLocalReasonText).map(vlEsc).join(' ')}</small>`}</div>`}).join('');
 return`${shared?'':`<summary>${vlT('Cài đặt giọng nói','Voice settings')}</summary>`}
 <fieldset class="vl-group"><legend>${shared?vlT('Nhận giọng nói trên máy (tải về)','On-device speech (download)'):vlT('Nhận giọng nói','Speech recognition')}</legend>
 ${shared?`<p class="hint">${vlT('Đang dùng','In use')}: <b>${vlEsc(choice?vlT('Trên máy · ','On device · ')+vlT(VOICE_LOCAL_PACKS[choice].vi,VOICE_LOCAL_PACKS[choice].en):vlT('Của trình duyệt (cần mạng)','Browser (needs internet)'))}</b>. ${vlT('Tải gói nâng cao để hiểu Vietlish (nói lẫn Việt – Anh) tốt hơn và dùng khi mất mạng.','Download an advanced pack to understand Vietlish (mixed Vietnamese–English) better and to work offline.')}</p>`:`<label class="vl-choice"><input type="radio" name="vl-choice" value="" ${choice?'':'checked'}><span><b>${vlT('Của trình duyệt','Browser')}</b> <small>· ${vlT('mặc định, cần mạng','default, needs internet')}</small></span></label>`}
 ${packs}
 <p class="hint">${vlT('Trên máy: âm thanh không rời khỏi máy, dùng được khi mất mạng. Chỉ tải gói một lần','On device: audio never leaves this device and it works offline. The pack downloads once')} (+${size(rt)} ${vlT('bộ chạy dùng chung','shared runtime')}).</p>
 ${shared?'':`<label class="vl-check"><input type="checkbox" class="check" id="vl-lang-auto" ${voiceLocalLangMode()==='auto'?'checked':''}> ${vlT('Trên máy: tự nhận ngôn ngữ (thay vì theo nút Tiếng Việt / English)','On device: detect language automatically (instead of the Tiếng Việt / English buttons)')}</label>`}
 ${cap&&!cap.ok?`<p class="hint vl-note">${cap.reasons.map(voiceLocalReasonText).map(vlEsc).join(' ')} ${vlT('Đang dùng nhận giọng nói của trình duyệt.','Using browser speech recognition.')}</p>`:''}
 <button type="button" class="btn small vl-sc-link" data-vl-check>${vlT('Kiểm tra giọng chính xác trên máy này','Check accurate voice on this device')}</button>
 </fieldset>
 <details class="privacy-mini vl-consent-fold"><summary>${vlT('Thống kê giọng nói','Voice statistics')}</summary><label class="vl-check vl-consent"><input type="checkbox" class="check" id="voice-stats-consent" ${consent?'checked':''}> ${vlT('Giúp cải thiện nhận giọng nói (chỉ gửi chữ, không gửi âm thanh)','Help improve voice recognition (sends text only, never audio)')}</label>
 <p class="hint">${vlT('Bật sẵn. Chỉ gửi chữ đã bỏ thông tin cá nhân, không gửi âm thanh. Tắt là xoá dữ liệu đã gửi từ máy này.','On by default. Sends text with personal details removed, never audio. Turning it off deletes what this device sent.')} <a href="/privacy.html#voice" target="_blank" rel="noopener">${vlT('Xem chi tiết','Details')}</a></p></details>`;
}
async function voiceLocalRenderSettings(){
 const box=document.getElementById('voice-local-settings');if(!box)return;
 voiceLocalCap=voiceLocalCap||await voiceLocalProbe();
 const statuses={};for(const id of Object.keys(VOICE_LOCAL_PACKS))statuses[id]=await voiceLocalStatus(id);
 if(!document.body.contains(box))return;
 const open=box.open;box.innerHTML=voiceLocalSettingsHtml(voiceLocalCap,statuses);box.open=open;
}
function voiceLocalMountSettings(){
 if(document.getElementById('voice-local-settings')||!document.getElementById('voice-text'))return;
 let box;
 if(voiceLocalShared()){
  // Inside the sheet's one "Cài đặt giọng nói" panel; it is created right after this wrapper runs and announces itself.
  const panel=document.getElementById('voice-settings');if(!panel)return;
  box=document.createElement('section');box.id='voice-local-settings';box.className='voice-local voice-local-shared';
  const body=document.getElementById('voice-settings-body');box.innerHTML=voiceLocalSettingsHtml(voiceLocalCap,{});if(body)body.before(box);else panel.append(box);
 }else{
  const anchor=document.getElementById('voice-status');if(!anchor)return;
  box=document.createElement('details');box.id='voice-local-settings';box.className='voice-local';
  box.innerHTML=voiceLocalSettingsHtml(voiceLocalCap,{});anchor.after(box);
 }
 if(voiceLocalFailed())voiceLocalShowFailure();voiceLocalRecNote();
 (voiceLocalShared()?voiceLocalSyncRecognizers().catch(()=>{}):Promise.resolve()).then(()=>voiceLocalRenderSettings()).then(voiceLocalMaybeTip).catch(()=>{});
}
// One gentle, one-time tip in Auto mode while the browser recogniser is in use and this device could run the pack.
async function voiceLocalMaybeTip(){
 try{if(localStorage.getItem('bep-voice-local-tip'))return}catch{return}
 if(!voiceLocalShared()||voiceLocalChoice()||voiceLocalLangMode()!=='auto'||!voiceLocalCap?.packs?.small?.ok)return;
 // v1.7.1: not while the pack is on its way automatically.
 if(voiceAutoEnabled()&&vlGet(VOICE_AUTO_REMOVED_KEY)!=='1'&&!voiceAutoExplicitBrowser())return;
 const status=document.getElementById('voice-status');if(!status||document.getElementById('voice-local-tip'))return;
 try{localStorage.setItem('bep-voice-local-tip','1')}catch{}
 status.insertAdjacentHTML('afterend',`<p class="hint voice-local-tip" id="voice-local-tip"><span>💡 ${vlT('Tải giọng nói nâng cao để hiểu Vietlish tốt hơn','Download advanced voice to understand Vietlish better')}</span> <button type="button" class="btn small" data-vl-tip>${vlT('Xem gói tải','See downloads')}</button></p>`);
}
function voiceLocalOnCellular(){const c=navigator.connection;return !!c&&(c.type==='cellular'||c.saveData===true)}
function voiceLocalUseLocalInSheet(){const id=voiceLocalChoice();return !!id&&voiceLocalUsable(id)&&typeof registerVoiceRecognizer!=='function'}
// Runs the on-device recogniser for the standalone voice sheet; mirrors the browser flow.
async function voiceLocalStartInSheet(auto){
 const id=voiceLocalChoice(),box=document.getElementById('voice-text');if(!id||!box)return false;
 const r=voiceLocalRecognizer(id),session=()=>typeof voiceSession!=='undefined'?voiceSession:0,sid=session();
 if(!(await r.available())){voiceLocalSetChoice('');return false}
 if(sid!==session()||!document.getElementById('voice-text'))return true;
 if(typeof voiceKeepListening!=='undefined')voiceKeepListening=true;
 const base=(box.value||'').trim(),finals=[];
 const show=interim=>{const t=document.getElementById('voice-text');if(!t)return;t.value=[base,...finals,interim].filter(Boolean).join(', ')};
 if(typeof voiceSetUi==='function')voiceSetUi('listening',vlT('Đang nghe trên máy (không gửi âm thanh)… Lần đầu cần vài giây để nạp.','Listening on this device (no audio sent)… The first start takes a few seconds to load.'));
 const lang=typeof voiceRecLang!=='undefined'&&voiceRecLang?voiceRecLang:'vi-VN';
 try{const ctl=await r.start(lang,(text,final)=>{if(final){finals.push(text);if(typeof voiceFinals!=='undefined')voiceFinals.push(text);show('')}else show(text)},info=>{if(typeof voiceRecognition!=='undefined'&&voiceRecognition?.local)voiceRecognition=null;if(info.reason==='aborted')return;show('');
   if(info.reason==='error'){if(typeof voiceSetUi==='function')voiceSetUi('stopped',vlT('Nhận giọng nói trên máy gặp lỗi — chuyển sang của trình duyệt.','On-device recognition failed — switching to the browser recogniser.'));if(!auto&&typeof startVoiceMicBrowser==='function')startVoiceMicBrowser(false)}
   else if(typeof voiceSetUi==='function')voiceSetUi('stopped',vlT('Đã dừng nghe. Kiểm tra câu rồi bấm Xem trước.','Listening stopped. Review your words, then tap Preview.'))});
  if(sid!==session()||(typeof voiceKeepListening!=='undefined'&&!voiceKeepListening)){ctl.stop(true);return true}
  if(typeof voiceRecognition!=='undefined')voiceRecognition={local:true,stop:()=>ctl.stop(false),abort:()=>ctl.stop(true)};
  return true}
 catch(e){if(typeof voiceSetUi==='function')voiceSetUi('stopped',vlT('Không mở được nhận giọng nói trên máy — dùng của trình duyệt.','Could not start on-device recognition — using the browser recogniser.'));return false}
}
async function voiceLocalCleanRetired(){if(typeof caches!=='object'||!caches)return 0;let n=0;try{if(!(await caches.has(VOICE_LOCAL_CACHE)))return 0;const c=await voiceLocalOpenCache();for(const r of Object.values(VOICE_LOCAL_RETIRED))for(const path of r.paths)if(await c.delete(voiceLocalModelUrl(r,path)))n++}catch{}return n}
function voiceLocalInstall(){
 // FIRST, before anything can load the model: a marker left by a page that died with the model in memory.
 const crash=voiceLocalCheckCrash();voiceLocalMigrateChoice();voiceLocalLifecycle();if(crash||voiceLocalFailed()?.notice==='pending')voiceLocalCrashNoticeLater();voiceLocalCleanRetired().catch(()=>{});voiceLocalRegisterHooks();voiceAutoInstall();
 // v1.7.4: a self-check that died re-opens with its phase; the iPhone dictation tip; the settings card.
 if(voiceLocalCheckRecord()?.open)voiceLocalCheckLater();
 voiceLocalDictationWatch();if(typeof document!=='undefined'&&document.readyState!=='complete')addEventListener('load',()=>voiceLocalDictationWatch(),{once:true});
 if(typeof otherSettingsModal==='function'&&!otherSettingsModal.__vl){const prevOther=otherSettingsModal;otherSettingsModal=function(section=''){const out=prevOther.apply(this,arguments);try{if(!document.getElementById('settings-voice')){const at=document.getElementById('settings-offline-ready')||document.getElementById('settings-data');const html=voiceLocalSettingsCardHtml();if(at)at.insertAdjacentHTML('beforebegin',html);else document.querySelector('.modal .modal-content')?.insertAdjacentHTML('beforeend',html)}if(section==='voice')requestAnimationFrame(()=>document.getElementById('settings-voice')?.scrollIntoView?.({block:'start'}))}catch{}return out};otherSettingsModal.__vl=true}
 document.addEventListener('click',e=>{const b=e.target?.closest?.('[data-vl-check],[data-vl-check-run],[data-vl-check-use],[data-vl-check-copy],[data-vl-dictate]');if(!b)return;e.preventDefault();
  if(b.hasAttribute('data-vl-dictate')){voiceLocalOpenKeyboard(b.dataset.vlDictate);return}
  if(b.hasAttribute('data-vl-check-run')){voiceLocalCheckStart().catch(()=>{});return}
  if(b.hasAttribute('data-vl-check-use')){voiceLocalActivate(VOICE_AUTO_PACK,{quiet:true}).then(on=>{typeof toast==='function'&&toast(on?vlT('Đã bật giọng chính xác trên máy này.','Accurate voice is on for this device.'):vlT('Chưa bật được giọng chính xác — giữ giọng nói thường.','Could not switch accurate voice on — keeping the standard voice input.'),!on);voiceLocalCheckRender()}).catch(()=>{});return}
  if(b.hasAttribute('data-vl-check-copy')){const text=voiceLocalCheckText(voiceLocalCheckUi.last||voiceLocalCheckRecord());(navigator.clipboard?.writeText?navigator.clipboard.writeText(text):Promise.reject()).then(()=>typeof toast==='function'&&toast(vlT('Đã sao chép kết quả.','Results copied.'))).catch(()=>{typeof toast==='function'&&toast(vlT('Không sao chép được — chụp màn hình giúp nhé.','Could not copy — please take a screenshot.'),true)});return}
  voiceLocalCheckModal().catch(()=>{})});
 if(typeof addEventListener==='function')addEventListener('bep-voice-registry',()=>{voiceLocalRegisterHooks();voiceLocalSyncRecognizers().catch(()=>{})});
 document.addEventListener('bep-voice-settings-mounted',()=>voiceLocalMountSettings());
 if(typeof voiceModal==='function'&&!voiceModal.__vl){const prev=voiceModal;voiceModal=function(...a){voiceLocalLastUsed='';const out=prev.apply(this,a);voiceLocalMountSettings();return out};voiceModal.__vl=true}
 if(typeof startVoiceMic==='function'&&!startVoiceMic.__vl){const prev=startVoiceMic;globalThis.startVoiceMicBrowser=prev;
  startVoiceMic=function(auto=false){if(!voiceLocalUseLocalInSheet())return prev.call(this,auto);voiceLocalStartInSheet(auto).then(ok=>{if(!ok)prev.call(this,auto)});};startVoiceMic.__vl=true}
 document.addEventListener('change',e=>{const t=e.target;if(!t)return;
  if(t.name==='vl-choice'){voiceLocalSetChoice(t.value);if(typeof stopVoice==='function')stopVoice();if(typeof voiceSetUi==='function')voiceSetUi('stopped',t.value?vlT('Đã chọn nhận giọng nói trên máy. Bấm để nói.','On-device recognition selected. Tap to speak.'):vlT('Đã chọn nhận giọng nói của trình duyệt.','Browser recognition selected.'))}
  if(t.id==='voice-recognizer')setTimeout(voiceLocalRecNote,0);
  if(t.id==='vl-lang-auto'){try{localStorage.setItem('bep-voice-local-lang',t.checked?'auto':'toggle')}catch{}}});
 document.addEventListener('click',e=>{const t=e.target?.closest?.('[data-vl-tip]');if(!t)return;e.preventDefault();const panel=document.getElementById('voice-settings');if(panel)panel.open=true;document.getElementById('voice-local-tip')?.remove();const row=document.querySelector('#voice-local-settings [data-vl-pack="small"]');row?.scrollIntoView?.({block:'nearest'});row?.querySelector('button')?.focus()});
 document.addEventListener('click',e=>{const b=e.target?.closest?.('[data-vl-retry]');if(!b)return;e.preventDefault();voiceLocalRetry(b.dataset.vlRetry).catch(()=>{})});
 document.addEventListener('click',e=>{if(!e.target?.closest?.('[data-vl-crash-close]'))return;e.preventDefault();document.getElementById('vl-crash-notice')?.remove()});
 document.addEventListener('click',async e=>{const b=e.target?.closest?.('[data-vl-download],[data-vl-remove]');if(!b)return;e.preventDefault();
  const id=b.dataset.vlDownload||b.dataset.vlRemove,row=b.closest('.vl-pack');
  if(b.dataset.vlRemove){voiceAutoMarkRemoved();voiceLocalClearFailed();document.getElementById('vl-fail')?.remove();document.getElementById('vl-crash-notice')?.remove();try{localStorage.removeItem(VOICE_LOCAL_SELFTEST_KEY)}catch{}await voiceLocalRemove(id);await voiceLocalSyncRecognizers().catch(()=>{});typeof toast==='function'&&toast(voiceLocalRemovedText(voiceLocalLastFreed));voiceLocalCheckRender();const card=document.getElementById('settings-voice');if(card)card.outerHTML=voiceLocalSettingsCardHtml();return voiceLocalRenderSettings()}
  if(!navigator.onLine||globalThis.BEP_OFFLINE){typeof toast==='function'&&toast(vlT('Tải gói cần kết nối mạng.','Downloading the pack needs an internet connection.'),true);return}
  {const warnText=voiceLocalDownloadWarning(id,voiceLocalCap||await voiceLocalProbe(),typeof appLanguage!=='undefined'?appLanguage:'vi');if(warnText&&!(typeof confirmDialog==='function'?await confirmDialog({title:vlT('Tải gói giọng nói trên máy?','Download on-device speech?'),body:warnText,confirmLabel:vlT('Tải về','Download'),cancelLabel:vlT('Để sau','Not now')}):confirm(warnText)))return}
  if(voiceLocalOnCellular()&&!confirm(vlT('Bạn đang dùng dữ liệu di động. Tải ','You are on mobile data. Download ')+voiceLocalFormatBytes(voiceLocalPackBytes(id),typeof appLanguage!=='undefined'?appLanguage:'vi')+'?'))return;
  const bar=row?.querySelector('.vl-progress');b.disabled=true;if(bar)bar.hidden=false;
  vlSet(VOICE_AUTO_PAUSED_KEY,null);vlSet(VOICE_AUTO_REMOVED_KEY,null);
  try{await voiceLocalDownload(id,f=>{if(bar)bar.value=f});voiceLocalClearFailed();await voiceLocalSyncRecognizers().catch(()=>{});
   if(!voiceLocalOnIOS()||voiceLocalSelfTestPassed(id)){await voiceLocalActivate(id);typeof toast==='function'&&toast(vlT('Đã tải xong. Đang dùng nhận giọng nói trên máy.','Downloaded. Using on-device recognition.'))}
   else voiceLocalActivate(id).then(on=>{typeof toast==='function'&&toast(on?vlT('Bộ giọng chính xác chạy được trên máy này — đã bật.','Accurate voice works on this device — switched on.'):vlT('Đã tải xong. Tạm dùng giọng nói thường của máy.','Downloaded. Using the standard voice input for now.'))}).catch(()=>{})}
  catch(err){typeof toast==='function'&&toast(err?.message||vlT('Tải gói bị lỗi.','Pack download failed.'),true)}
  voiceLocalRenderSettings()});
}
if(typeof document!=='undefined'&&typeof window!=='undefined')voiceLocalInstall();
