'use strict';
// On-device speech recognition (v1.6, optional download, OFF by default).
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
// Exact byte sizes from the pinned Hugging Face revisions; sha256 is the LFS object id.
const VOICE_LOCAL_PACKS={
 small:{id:'small',vi:'Chính xác hơn',en:'More accurate',model:'onnx-community/whisper-small',revision:'36050c46d777d46dc4b5f43f6d90574fc38f8732',minMemoryGB:4,
  files:[{path:'onnx/encoder_model_quantized.onnx',size:92326160,sha256:'a43a83f3c5361cd591cfa7c36f14b43cf7cb22f47a415cc14a8d557be800fa92'},{path:'onnx/decoder_model_merged_quantized.onnx',size:156750845,sha256:'ec07c3cbb64172c39791e26ee870a65ac22b458c36722bfe2776b3dbf741e0c9'},{path:'config.json',size:2227},{path:'generation_config.json',size:3893},{path:'preprocessor_config.json',size:339},{path:'tokenizer.json',size:2480466},{path:'tokenizer_config.json',size:282683}]}
};
// v1.7.1: the Light (whisper-base) pack is retired — only "More accurate" is offered. Its files are listed so a copy
// downloaded before is removed from Cache Storage (79.7 MB) and a stored choice of it falls back to the browser recogniser.
const VOICE_LOCAL_RETIRED={base:{model:'onnx-community/whisper-base',revision:'1846881b6b3a3024392c1eea3ad983695bc23925',paths:['onnx/encoder_model_quantized.onnx','onnx/decoder_model_merged_quantized.onnx','config.json','generation_config.json','preprocessor_config.json','tokenizer.json','tokenizer_config.json']}};
const VOICE_LOCAL_SIMD_PROBE=[0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,10,1,8,0,65,0,253,15,253,98,11];

function vlT(vi,en){return typeof tr==='function'?tr(vi,en):vi}
function vlEsc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c])}
function voiceLocalModelUrl(pack,path){return 'https://huggingface.co/'+pack.model+'/resolve/'+pack.revision+'/'+path}
function voiceLocalIsOldSafari(ua,hasGpu){const m=/Version\/(\d+)[.\d]* (Mobile\/\S+ )?Safari/.exec(String(ua||''));return !!m&&!/Chrome|Chromium|CriOS|Edg|Firefox|FxiOS/.test(String(ua))&&+m[1]<26&&!hasGpu}
function voiceLocalRuntimeFiles(ua,hasGpu){const set=voiceLocalIsOldSafari(ua,hasGpu)?VOICE_LOCAL_ORT.plain:VOICE_LOCAL_ORT.asyncify;return[{url:VOICE_LOCAL_TF.url,size:VOICE_LOCAL_TF.size,sha256b64:VOICE_LOCAL_TF.sha256b64,role:'module'},...set.map(f=>({url:VOICE_LOCAL_ORT_BASE+f.name,size:f.size,sha256b64:f.sha256b64,role:f.name.endsWith('.wasm')?'wasm':'mjs'}))]}
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
function voiceLocalWarnText(w){return({'ios-slow':vlT('Máy cũ có thể chạy chậm hoặc thiếu bộ nhớ · có thể chậm vài giây mỗi câu.','Older devices may be slow or run out of memory · may take a few seconds per sentence.'),ios:vlT('Chạy bằng WebGPU trên iPhone/iPad · lần đầu cần vài giây để nạp.','Runs with WebGPU on iPhone/iPad · the first start takes a few seconds to load.'),'memory-unknown':vlT('Cần khoảng 1 GB RAM trống; máy yếu có thể chậm.','Needs about 1 GB of free memory; slower devices may struggle.')})[w]||''}
// The confirmation shown before a download on iPhone/iPad (size, Wi-Fi, speed on older devices).
function voiceLocalDownloadWarning(id,cap,lang){const c=cap?.packs?.[id];if(!c||!c.ok||!cap.ios)return'';const size=voiceLocalFormatBytes(voiceLocalPackBytes(id)+voiceLocalBytes(voiceLocalRuntime()),lang);return vlT(`Gói “Chính xác hơn” khoảng ${size}. Nên tải qua Wi-Fi.`,`The “More accurate” pack is about ${size}. Use Wi-Fi.`)+' '+(c.warn==='ios-slow'?voiceLocalWarnText('ios-slow')+' '+vlT('Nếu máy không chạy nổi, app tự quay về nhận giọng nói của trình duyệt.','If the device cannot run it, the app falls back to browser speech recognition.'):voiceLocalWarnText('ios'))}
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
 worker.onmessage=e=>{const m=e.data||{},w=waiting.get(m.id);if(m.type==='progress'&&w?.progress){w.progress(m);return}if(!w)return;waiting.delete(m.id);if(m.type==='error')w.reject(Object.assign(new Error(m.message||'worker error'),{code:m.code||'worker'}));else w.resolve(m)};
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
function voiceLocalRuntime(){return voiceLocalRuntimeFiles(typeof navigator!=='undefined'?navigator.userAgent:'',voiceLocalHasGpu())}
async function voiceLocalOpenCache(){return caches.open(VOICE_LOCAL_CACHE)}
async function voiceLocalPresent(files){if(typeof caches!=='object')return files.map(()=>false);const c=await voiceLocalOpenCache();return Promise.all(files.map(async f=>!!(await c.match(f.url))))}
async function voiceLocalStatus(id){const rt=voiceLocalRuntime(),own=voiceLocalPackFiles(id);try{const have=await voiceLocalPresent([...rt,...own]),mine=have.slice(rt.length);return have.every(Boolean)?'ready':mine.some(Boolean)?'partial':'none'}catch{return'none'}}
// Pack status in the offline-downloads shape (file counts let that screen show "3/7 downloaded — Resume").
async function voiceLocalPackStatus(id){let cap=null;try{cap=voiceLocalCap||await voiceLocalProbe()}catch{}if(cap&&cap.packs&&cap.packs[id]&&!cap.packs[id].ok)return{state:'unavailable',reasons:cap.packs[id].reasons.slice(),reasonText:cap.packs[id].reasons.map(voiceLocalReasonText).join(' ')};
 const files=[...voiceLocalRuntime(),...voiceLocalPackFiles(id)];let have=0;try{have=(await voiceLocalPresent(files)).filter(Boolean).length}catch{}const state=await voiceLocalStatus(id),warn=cap?.packs?.[id]?.warn||'',failed=voiceLocalFailed(id);return{state,have,total:files.length,...(warn?{warn,warnText:voiceLocalWarnText(warn)}:{}),...(failed?{failed:failed.stage,failedText:voiceLocalFailText(failed)}:{})}}
function voiceLocalHex(buf){return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('')}
function voiceLocalB64(buf){let s='';const a=new Uint8Array(buf);for(let i=0;i<a.length;i+=32768)s+=String.fromCharCode.apply(null,a.subarray(i,i+32768));return btoa(s)}
async function voiceLocalVerify(f,buf){if(!f.sha256&&!f.sha256b64)return true;if(!globalThis.crypto?.subtle)return true;const d=await crypto.subtle.digest('SHA-256',buf);return f.sha256?voiceLocalHex(d)===f.sha256:voiceLocalB64(d)===f.sha256b64}
const voiceLocalDownloads={};
// Downloads a pack (+ the shared runtime if missing) into Cache Storage with progress.
async function voiceLocalDownload(id,onProgress,{signal,fetchFn}={}){
 if(voiceLocalDownloads[id])return voiceLocalDownloads[id];
 const run=(async()=>{
  const pack=VOICE_LOCAL_PACKS[id];if(!pack)throw Error('unknown pack');
  const files=[...voiceLocalRuntime(),...voiceLocalPackFiles(id)],total=voiceLocalBytes(files),cache=await voiceLocalOpenCache();
  const have=await voiceLocalPresent(files);let done=voiceLocalBytes(files.filter((f,i)=>have[i]));
  const need=total-done;
  try{const est=await navigator.storage?.estimate?.();if(est&&est.quota&&est.quota-(est.usage||0)<need*1.1)throw Object.assign(Error(vlT('Máy không đủ chỗ trống để tải gói này.','Not enough free storage on this device for this pack.')),{code:'quota'})}catch(e){if(e.code==='quota')throw e}
  try{await navigator.storage?.persist?.()}catch{}
  const report=()=>{try{onProgress&&onProgress(total?Math.min(1,done/total):1,done,total)}catch{}};report();
  for(let i=0;i<files.length;i++){if(have[i])continue;const f=files[i];
   const res=await (fetchFn||fetch)(f.url,{signal,mode:'cors',credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer'});
   if(!res.ok)throw Object.assign(Error(vlT('Tải gói bị lỗi','Pack download failed')+' ('+res.status+')'),{code:'http'});
   let buf;
   if(res.body&&res.body.getReader){const reader=res.body.getReader(),parts=[];let got=0;for(;;){const {done:end,value}=await reader.read();if(end)break;parts.push(value);got+=value.length;done+=value.length;report()}buf=new Uint8Array(got);let o=0;for(const p of parts){buf.set(p,o);o+=p.length}}
   else{buf=new Uint8Array(await res.arrayBuffer());done+=buf.length;report()}
   if(f.size&&buf.length!==f.size||!(await voiceLocalVerify(f,buf)))throw Object.assign(Error(vlT('Tệp tải về không khớp bản gốc — đã huỷ.','A downloaded file did not match the original — cancelled.')),{code:'integrity'});
   done+=Math.max(0,(f.size||0)-buf.length);
   const type=f.url.endsWith('.json')?'application/json':f.url.endsWith('.mjs')||f.url.endsWith('.js')?'text/javascript':f.url.endsWith('.wasm')?'application/wasm':'application/octet-stream';
   await cache.put(f.url,new Response(buf,{headers:{'Content-Type':type,'Content-Length':String(buf.length)}}));report();
  }
  // Keep a copy of the worker script so recognition also starts offline.
  try{const w=await fetch('voice-local-worker.js',{cache:'no-cache'});if(w.ok)await cache.put(new URL('voice-local-worker.js',location.href).href,w)}catch{}
  return 'ready';
 })();
 voiceLocalDownloads[id]=run;try{return await run}finally{delete voiceLocalDownloads[id]}
}
async function voiceLocalRemove(id){const c=await voiceLocalOpenCache();for(const f of voiceLocalPackFiles(id))await c.delete(f.url);
 const others=Object.keys(VOICE_LOCAL_PACKS).filter(x=>x!==id);let anyReady=false;for(const o of others)if(await voiceLocalStatus(o)==='ready')anyReady=true;
 if(!anyReady){for(const set of Object.values(VOICE_LOCAL_ORT))for(const f of set)await c.delete(VOICE_LOCAL_ORT_BASE+f.name);await c.delete(VOICE_LOCAL_TF.url);await c.delete(new URL('voice-local-worker.js',location.href).href)}
 if(voiceLocalChoice()===id)voiceLocalSetChoice('');voiceLocalEngine?.dispose();voiceLocalEngine=null;return 'none'}

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

// ---------- failure guard (v1.7.1) ----------
// Loading Whisper "More accurate" can exhaust memory on older iPhones: the worker crashes or iOS reloads the page.
// A marker is written before loading/recognising and cleared after; a marker left behind at start-up means the last
// attempt never finished. Either way the app switches back to the browser recogniser and says so, offering
// "Thử lại / Try again" and "Gỡ gói / Remove pack". Stored per device only.
const VOICE_LOCAL_FAIL_KEY='bep-voice-local-fail',VOICE_LOCAL_BUSY_KEY='bep-voice-local-busy';
function voiceLocalFailed(id){try{const f=JSON.parse(localStorage.getItem(VOICE_LOCAL_FAIL_KEY)||'null');return f&&(!id||f.pack===id)?f:null}catch{return null}}
function voiceLocalMarkFailed(id,stage,code){try{localStorage.setItem(VOICE_LOCAL_FAIL_KEY,JSON.stringify({pack:id,stage,code:String(code||''),at:Date.now()}));localStorage.removeItem(VOICE_LOCAL_BUSY_KEY)}catch{}if(voiceLocalChoice()===id)voiceLocalSetChoice('');try{voiceLocalEngine?.dispose()}catch{}voiceLocalEngine=null}
function voiceLocalClearFailed(){try{localStorage.removeItem(VOICE_LOCAL_FAIL_KEY)}catch{}}
function voiceLocalBusy(id,stage){try{if(stage)localStorage.setItem(VOICE_LOCAL_BUSY_KEY,JSON.stringify({pack:id,stage,at:Date.now()}));else localStorage.removeItem(VOICE_LOCAL_BUSY_KEY)}catch{}}
// At start-up: a busy marker left by a page that died while loading/recognising becomes a failure.
function voiceLocalCheckCrash(){try{const b=JSON.parse(localStorage.getItem(VOICE_LOCAL_BUSY_KEY)||'null');if(!b)return null;localStorage.removeItem(VOICE_LOCAL_BUSY_KEY);if(!VOICE_LOCAL_PACKS[b.pack])return null;voiceLocalMarkFailed(b.pack,b.stage==='load'?'reload-load':'reload-run','reload');return voiceLocalFailed(b.pack)}catch{return null}}
function voiceLocalFailText(f){const why=f.stage==='reload-load'||f.stage==='reload-run'?vlT('Trang bị tải lại khi đang chạy gói trên máy (có thể máy thiếu bộ nhớ).','The page reloaded while the on-device pack was running (the device may be short of memory).'):f.stage==='load'?vlT('Không nạp được gói trên máy.','The on-device pack could not load.'):vlT('Nhận giọng nói trên máy bị lỗi.','On-device recognition failed.');return why+' '+vlT('Đang dùng nhận giọng nói của trình duyệt.','Using browser speech recognition.')}

// ---------- engine (worker) + recorder ----------
let voiceLocalEngine=null,voiceLocalActive=null,voiceLocalLastUsed='';
async function voiceLocalWorker(){
 let url='voice-local-worker.js';
 try{if(!navigator.onLine||globalThis.BEP_OFFLINE){const hit=await (await voiceLocalOpenCache()).match(new URL(url,location.href).href);if(hit)url=URL.createObjectURL(new Blob([await hit.text()],{type:'text/javascript'}))}}catch{}
 return new Worker(url,{name:'bep-voice-local'});
}
async function voiceLocalEnsureEngine(id,onProgress){
 if(voiceLocalEngine&&voiceLocalEngine.pack===id)return voiceLocalEngine;
 voiceLocalEngine?.dispose();voiceLocalEngine=null;
 voiceLocalBusy(id,'load');
 try{
 const client=voiceLocalClient(await voiceLocalWorker());
 const hello=await client.hello();if(hello.v!==VOICE_LOCAL_PROTOCOL){client.dispose();throw Object.assign(Error('worker version'),{code:'version'})}
 const rt=voiceLocalRuntime();
 await client.load(VOICE_LOCAL_PACKS[id],{module:rt.find(f=>f.role==='module'),mjs:rt.find(f=>f.role==='mjs').url,wasm:rt.find(f=>f.role==='wasm').url,threads:typeof crossOriginIsolated!=='undefined'&&crossOriginIsolated?Math.min(4,navigator.hardwareConcurrency||1):1,gpu:voiceLocalHasGpu()},onProgress).catch(e=>{try{client.dispose()}catch{}throw e});
 voiceLocalBusy(id,'');
 voiceLocalEngine={pack:id,dispose:()=>client.dispose(),transcribe:client.transcribe,client};
 return voiceLocalEngine;
 }catch(e){voiceLocalBusy(id,'');throw e}
}
// Visible progress for the slow first use: "Đang nạp…" while the model loads, "Đang nhận dạng…" while a sentence is decoded.
function voiceLocalNote(kind){if(typeof document==='undefined')return;const text=kind==='loading'?vlT('Đang nạp gói giọng nói trên máy… lần đầu có thể mất 10–60 giây.','Loading the on-device speech pack… the first time can take 10–60 seconds.'):kind==='recognizing'?vlT('Đang nhận dạng…','Recognising…'):kind==='listening'?vlT('Đang nghe trên máy (không gửi âm thanh).','Listening on this device (no audio sent).'):'';for(const el of [document.getElementById('voice-status'),document.getElementById('vp-status')])if(el&&text)el.textContent=text;const live=document.getElementById('voice-live')||document.getElementById('vp-live');if(live){if(kind==='loading'||kind==='recognizing')live.dataset.local=kind;else delete live.dataset.local}}
const VOICE_LOCAL_WORKLET=`class BepCapture extends AudioWorkletProcessor{process(inputs){const i=inputs[0];if(i&&i.length&&i[0].length){const chans=i.map(c=>c.slice(0));this.port.postMessage(chans,chans.map(c=>c.buffer))}return true}}registerProcessor('bep-capture',BepCapture)`;
async function voiceLocalRecorder(onFrame){
 const stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
 let ctx;try{ctx=new AudioContext({sampleRate:16000})}catch{ctx=new AudioContext()}
 let src;try{src=ctx.createMediaStreamSource(stream)}catch{await ctx.close().catch(()=>{});ctx=new AudioContext();src=ctx.createMediaStreamSource(stream)}
 const url=URL.createObjectURL(new Blob([VOICE_LOCAL_WORKLET],{type:'text/javascript'}));
 await ctx.audioWorklet.addModule(url);URL.revokeObjectURL(url);
 const node=new AudioWorkletNode(ctx,'bep-capture',{numberOfInputs:1,numberOfOutputs:0,channelCount:1});
 const rate=ctx.sampleRate;node.port.onmessage=e=>onFrame(voiceLocalResample(voiceLocalDownmix(e.data),rate,16000));
 src.connect(node);if(ctx.state==='suspended')await ctx.resume().catch(()=>{});
 return{stop(){try{src.disconnect()}catch{}try{node.port.onmessage=null;node.disconnect()}catch{}for(const t of stream.getTracks())t.stop();ctx.close().catch(()=>{})}};
}
// Recognizer object (same shape as registerVoiceRecognizer expects).
function voiceLocalRecognizer(id,deps={}){
 const pack=VOICE_LOCAL_PACKS[id];
 return{id:'local-'+id,label:vlT('Trên máy · ','On device · ')+vlT(pack.vi,pack.en),local:true,
  async available(){const cap=await (deps.probe||voiceLocalProbe)();return cap.packs[id].ok&&(await (deps.status||voiceLocalStatus)(id))==='ready'},
  async start(lang,onResult,onEnd){
   if(voiceLocalActive)await voiceLocalActive.stop(true);
   const ensure=deps.ensure||voiceLocalEnsureEngine,record=deps.record||voiceLocalRecorder,mode=deps.langMode?deps.langMode():voiceLocalLangMode(),note=deps.note||voiceLocalNote;
   const language=voiceLocalWhisperLang(lang,lang==='auto'?'auto':mode);
   let ended=false,busy=false,queue=[],rec=null,engine=null,stopping=false;
   const seg=voiceLocalSegmenter(deps.segmenter||{});
   const finish=info=>{if(ended)return;ended=true;if(voiceLocalActive===self)voiceLocalActive=null;try{onEnd&&onEnd(info||{})}catch{}};
   const pump=async()=>{if(busy||!engine)return;const next=queue.find(q=>q.type==='final')||queue[queue.length-1];if(!next){if(stopping)finish({reason:'stopped'});return}
    queue=queue.filter(q=>q!==next&&(next.type==='final'?true:q.type==='final'));busy=true;
    if(next.type==='final')note('recognizing');voiceLocalBusy(id,'run');
    try{const r=await engine.transcribe(next.audio,language,next.type==='final');voiceLocalBusy(id,'');const text=voiceLocalCleanText(r.text);if(text&&!ended)onResult(text,next.type==='final');if(next.type==='final'&&!stopping)note('listening')}catch(e){voiceLocalBusy(id,'');if(e.code!=='stopped'){voiceLocalMarkFailed(id,'run',e.code);finish({reason:'error',error:e});return}}finally{busy=false}
    pump()};
   const self={stop:async(abort)=>{if(ended)return;stopping=true;rec?.stop();rec=null;if(abort){queue=[];finish({reason:'aborted'});return}for(const ev of seg.flush())queue.push(ev);queue=queue.filter(q=>q.type==='final');if(!busy)pump()}};
   voiceLocalActive=self;voiceLocalLastUsed='local-'+id;
   try{note('loading');try{engine=await ensure(id)}catch(e){voiceLocalMarkFailed(id,'load',e?.code);throw e}if(ended)return self;note('listening');rec=await record(frame=>{if(ended||stopping)return;for(const ev of seg.push(frame)){if(ev.type==='partial'&&busy)continue;queue.push(ev)}pump()})}catch(e){finish({reason:'error',error:e});throw e}
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
function voiceLocalFailureHtml(f){return`<div class="vl-fail" id="vl-fail" role="alert"><p>${vlEsc(voiceLocalFailText(f))}</p><div class="toolbar"><button type="button" class="btn small" data-vl-retry="${vlEsc(f.pack)}">${vlT('Thử lại','Try again')}</button><button type="button" class="btn small" data-vl-remove="${vlEsc(f.pack)}">${vlT('Gỡ gói','Remove pack')}</button></div></div>`}
function voiceLocalShowFailure(){if(typeof document==='undefined')return;const f=voiceLocalFailed();if(!f)return;document.getElementById('vl-fail')?.remove();const anchor=document.getElementById('voice-live')||document.getElementById('vp-live');if(anchor)anchor.insertAdjacentHTML('afterend',voiceLocalFailureHtml(f));voiceLocalSyncRecognizers().catch(()=>{})}
async function voiceLocalSyncRecognizers(){
 if(typeof registerVoiceRecognizer!=='function')return 0;let n=0;
 let cap=null;try{cap=voiceLocalCap||await voiceLocalProbe();voiceLocalCap=cap}catch{}
 for(const id of Object.keys(VOICE_LOCAL_PACKS)){let ok=false;try{ok=!!cap?.packs?.[id]?.ok&&(await voiceLocalStatus(id))==='ready'}catch{}
  if(ok&&!voiceLocalUnregister[id]){try{voiceLocalUnregister[id]=registerVoiceRecognizer(voiceLocalAdapter(id))||(()=>{});n++}catch{}}
  else if(!ok&&voiceLocalUnregister[id]){try{voiceLocalUnregister[id]()}catch{}delete voiceLocalUnregister[id]}}
 // A stored on-device choice whose pack is gone (removed, evicted, unsupported) falls back to the browser recogniser.
 const id=voiceLocalChoice();if(id&&!voiceLocalUnregister[id])voiceLocalSetChoice('');
 return n}
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
   status:()=>voiceLocalPackStatus(p.id),
   beforeDownload:async()=>{const w=voiceLocalDownloadWarning(p.id,voiceLocalCap||await voiceLocalProbe(),typeof appLanguage!=='undefined'?appLanguage:'vi');if(!w)return true;return typeof confirmDialog==='function'?!!(await confirmDialog({title:vlT('Tải gói giọng nói trên máy?','Download on-device speech?'),body:w,confirmLabel:vlT('Tải về','Download'),cancelLabel:vlT('Để sau','Not now')})):confirm(w)},
   download:async(onProgress,signal)=>{await voiceLocalDownload(p.id,(f,loaded,total)=>{try{onProgress&&onProgress(loaded,total)}catch{}},{signal});voiceLocalClearFailed();if(!voiceLocalChoice())voiceLocalSetChoice(p.id);await voiceLocalSyncRecognizers().catch(()=>{});voiceLocalRenderSettings().catch(()=>{});return true},
   remove:async()=>{await voiceLocalRemove(p.id);await voiceLocalSyncRecognizers().catch(()=>{});voiceLocalRenderSettings().catch(()=>{});return true}});n++}catch{}}}
 return n;
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
 </fieldset>
 <label class="vl-check vl-consent"><input type="checkbox" class="check" id="voice-stats-consent" ${consent?'checked':''}> ${vlT('Giúp cải thiện nhận giọng nói (chỉ gửi chữ, không gửi âm thanh)','Help improve voice recognition (sends text only, never audio)')}</label>
 <p class="hint">${vlT('Tắt mặc định. Khi bật: sau mỗi lần bạn xác nhận, app gửi câu chữ đã lược bỏ tên thành viên, email, số điện thoại; lưu tối đa 90 ngày; tắt là xoá.','Off by default. When on: after each confirmation the app sends the words with member names, emails and phone numbers removed; kept up to 90 days; switching off deletes them.')} <a href="/privacy.html#voice" target="_blank" rel="noopener">${vlT('Xem chi tiết','Details')}</a></p>`;
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
 if(voiceLocalFailed())voiceLocalShowFailure();
 (voiceLocalShared()?voiceLocalSyncRecognizers().catch(()=>{}):Promise.resolve()).then(()=>voiceLocalRenderSettings()).then(voiceLocalMaybeTip).catch(()=>{});
}
// One gentle, one-time tip in Auto mode while the browser recogniser is in use and this device could run the pack.
async function voiceLocalMaybeTip(){
 try{if(localStorage.getItem('bep-voice-local-tip'))return}catch{return}
 if(!voiceLocalShared()||voiceLocalChoice()||voiceLocalLangMode()!=='auto'||!voiceLocalCap?.packs?.small?.ok)return;
 const status=document.getElementById('voice-status');if(!status||document.getElementById('voice-local-tip'))return;
 try{localStorage.setItem('bep-voice-local-tip','1')}catch{}
 status.insertAdjacentHTML('afterend',`<p class="hint voice-local-tip" id="voice-local-tip"><span>💡 ${vlT('Tải giọng nói nâng cao để hiểu Vietlish tốt hơn','Download advanced voice to understand Vietlish better')}</span> <button type="button" class="btn small" data-vl-tip>${vlT('Xem gói tải','See downloads')}</button></p>`);
}
function voiceLocalOnCellular(){const c=navigator.connection;return !!c&&(c.type==='cellular'||c.saveData===true)}
function voiceLocalUseLocalInSheet(){const id=voiceLocalChoice();return !!id&&typeof registerVoiceRecognizer!=='function'}
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
 voiceLocalMigrateChoice();voiceLocalCheckCrash();voiceLocalCleanRetired().catch(()=>{});voiceLocalRegisterHooks();
 if(typeof addEventListener==='function')addEventListener('bep-voice-registry',()=>{voiceLocalRegisterHooks();voiceLocalSyncRecognizers().catch(()=>{})});
 document.addEventListener('bep-voice-settings-mounted',()=>voiceLocalMountSettings());
 if(typeof voiceModal==='function'&&!voiceModal.__vl){const prev=voiceModal;voiceModal=function(...a){voiceLocalLastUsed='';const out=prev.apply(this,a);voiceLocalMountSettings();return out};voiceModal.__vl=true}
 if(typeof startVoiceMic==='function'&&!startVoiceMic.__vl){const prev=startVoiceMic;globalThis.startVoiceMicBrowser=prev;
  startVoiceMic=function(auto=false){if(!voiceLocalUseLocalInSheet())return prev.call(this,auto);voiceLocalStartInSheet(auto).then(ok=>{if(!ok)prev.call(this,auto)});};startVoiceMic.__vl=true}
 document.addEventListener('change',e=>{const t=e.target;if(!t)return;
  if(t.name==='vl-choice'){voiceLocalSetChoice(t.value);if(typeof stopVoice==='function')stopVoice();if(typeof voiceSetUi==='function')voiceSetUi('stopped',t.value?vlT('Đã chọn nhận giọng nói trên máy. Bấm để nói.','On-device recognition selected. Tap to speak.'):vlT('Đã chọn nhận giọng nói của trình duyệt.','Browser recognition selected.'))}
  if(t.id==='vl-lang-auto'){try{localStorage.setItem('bep-voice-local-lang',t.checked?'auto':'toggle')}catch{}}});
 document.addEventListener('click',e=>{const t=e.target?.closest?.('[data-vl-tip]');if(!t)return;e.preventDefault();const panel=document.getElementById('voice-settings');if(panel)panel.open=true;document.getElementById('voice-local-tip')?.remove();const row=document.querySelector('#voice-local-settings [data-vl-pack="small"]');row?.scrollIntoView?.({block:'nearest'});row?.querySelector('button')?.focus()});
 document.addEventListener('click',async e=>{const b=e.target?.closest?.('[data-vl-retry]');if(!b)return;e.preventDefault();const id=b.dataset.vlRetry;voiceLocalClearFailed();document.getElementById('vl-fail')?.remove();if(!VOICE_LOCAL_PACKS[id])return;await voiceLocalSyncRecognizers().catch(()=>{});voiceLocalSetChoice(id);voiceLocalRenderSettings().catch(()=>{});typeof toast==='function'&&toast(vlT('Sẽ thử lại nhận giọng nói trên máy ở lần nói tới.','On-device recognition will be tried again next time you speak.'))});
 document.addEventListener('click',async e=>{const b=e.target?.closest?.('[data-vl-download],[data-vl-remove]');if(!b)return;e.preventDefault();
  const id=b.dataset.vlDownload||b.dataset.vlRemove,row=b.closest('.vl-pack');
  if(b.dataset.vlRemove){voiceLocalClearFailed();document.getElementById('vl-fail')?.remove();await voiceLocalRemove(id);await voiceLocalSyncRecognizers().catch(()=>{});typeof toast==='function'&&toast(vlT('Đã xoá gói nhận giọng nói.','Speech pack removed.'));return voiceLocalRenderSettings()}
  if(!navigator.onLine||globalThis.BEP_OFFLINE){typeof toast==='function'&&toast(vlT('Tải gói cần kết nối mạng.','Downloading the pack needs an internet connection.'),true);return}
  {const warnText=voiceLocalDownloadWarning(id,voiceLocalCap||await voiceLocalProbe(),typeof appLanguage!=='undefined'?appLanguage:'vi');if(warnText&&!(typeof confirmDialog==='function'?await confirmDialog({title:vlT('Tải gói giọng nói trên máy?','Download on-device speech?'),body:warnText,confirmLabel:vlT('Tải về','Download'),cancelLabel:vlT('Để sau','Not now')}):confirm(warnText)))return}
  if(voiceLocalOnCellular()&&!confirm(vlT('Bạn đang dùng dữ liệu di động. Tải ','You are on mobile data. Download ')+voiceLocalFormatBytes(voiceLocalPackBytes(id),typeof appLanguage!=='undefined'?appLanguage:'vi')+'?'))return;
  const bar=row?.querySelector('.vl-progress');b.disabled=true;if(bar)bar.hidden=false;
  try{await voiceLocalDownload(id,f=>{if(bar)bar.value=f});voiceLocalClearFailed();voiceLocalSetChoice(id);await voiceLocalSyncRecognizers().catch(()=>{});typeof toast==='function'&&toast(vlT('Đã tải xong. Đang dùng nhận giọng nói trên máy.','Downloaded. Using on-device recognition.'))}
  catch(err){typeof toast==='function'&&toast(err?.message||vlT('Tải gói bị lỗi.','Pack download failed.'),true)}
  voiceLocalRenderSettings()});
}
if(typeof document!=='undefined'&&typeof window!=='undefined')voiceLocalInstall();
