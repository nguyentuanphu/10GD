// v1.7.1 "More accurate" as the default (owner decision): the auto-download policy (capability, quota, network,
// Data Saver, battery, hidden tab, pause, explicit removal, explicit browser choice, failures, automated browsers),
// the one-time automatic switch, content-addressed storage (a model update downloads only the files whose sha256
// changed; pre-1.7.1 cache entries are migrated without a download), resumable 8 MB ranges, and the service worker
// leaving the voice cache alone on update. Synthetic files only; nothing is downloaded.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const webcrypto=require('node:crypto').webcrypto,{createHash}=require('node:crypto');
let count=0;const tests:any[]=[];const t=(name:string,fn:any)=>tests.push([name,fn]);
function fakeCaches(){const stores=new Map<string,Map<string,any>>();const open=async(name:string)=>{if(!stores.has(name))stores.set(name,new Map());const m=stores.get(name)!;return{async match(u:any){const r=m.get(String(u?.url||u));return r?r.clone():undefined},async put(u:any,res:any){m.set(String(u?.url||u),res)},async delete(u:any){return m.delete(String(u?.url||u))},async keys(){return[...m.keys()]}}};return{stores,open,async has(n:string){return stores.has(n)}}}
function memStorage(){const m=new Map<string,string>();return{m,getItem:(k:string)=>m.has(k)?m.get(k)!:null,setItem:(k:string,v:string)=>{m.set(k,String(v))},removeItem:(k:string)=>{m.delete(k)}}}
function ctx(extra:any={}){const c=vm.createContext({console,Intl,Date,Math,URL,TextEncoder,Response,Blob,crypto:webcrypto,btoa,atob,setTimeout,clearTimeout,queueMicrotask,structuredClone,AbortController,DOMException,localStorage:memStorage(),location:{href:'https://kitchen.test/'},fetch:async()=>new Response('worker'),...extra});vm.runInContext(fs.readFileSync('dist/voice-local.js','utf8'),c);return c}
const run=(c:any,src:string)=>vm.runInContext(src,c);
const hex=(b:any)=>createHash('sha256').update(b).digest('hex'),b64=(b:any)=>createHash('sha256').update(b).digest('base64');
const nav=(extra:any={})=>({userAgent:'Mozilla/5.0 (X11; Linux x86_64) Chrome/141.0 Safari/537.36',onLine:true,storage:{estimate:async()=>({quota:1e10,usage:0}),persist:async()=>true},...extra});

t('policy: starts only when capable, enabled, online on a non-cellular network, not on low battery and not hidden',()=>{const c=ctx();
 const D=(o:any)=>JSON.parse(run(c,'JSON.stringify(voiceAutoDecision('+JSON.stringify(o)+'))'));
 const ok={state:'none',enabled:true,removed:false,explicitBrowser:false,failed:false,automated:false,capable:true,quotaFree:5e9,need:3e8,paused:false,net:'ok',battery:{level:.8,charging:false},hidden:false};
 assert.deepEqual(D(ok),{action:'start',reason:'ok'});
 assert.deepEqual(D({...ok,net:'no-api'}),{action:'start',reason:'no-api'},'iPhone/iPad (no Network Information API): start with the Pause chip');
 assert.deepEqual(D({...ok,net:'cellular'}),{action:'wait',reason:'cellular'});
 assert.deepEqual(D({...ok,net:'save-data'}),{action:'wait',reason:'save-data'});
 assert.deepEqual(D({...ok,net:'offline'}),{action:'wait',reason:'offline'});
 assert.deepEqual(D({...ok,battery:{level:.15,charging:false}}),{action:'wait',reason:'battery'});
 assert.deepEqual(D({...ok,battery:{level:.15,charging:true}}).action,'start','charging is fine');
 assert.deepEqual(D({...ok,hidden:true}),{action:'wait',reason:'hidden'});
 assert.deepEqual(D({...ok,paused:true}),{action:'wait',reason:'paused'});
 assert.deepEqual(D({...ok,capable:false}),{action:'skip',reason:'capability'});
 assert.deepEqual(D({...ok,quotaFree:2e8}),{action:'skip',reason:'quota'});
 assert.deepEqual(D({...ok,removed:true}),{action:'skip',reason:'removed'},'an explicit removal is never undone automatically');
 assert.deepEqual(D({...ok,enabled:false}),{action:'skip',reason:'off'});
 assert.deepEqual(D({...ok,explicitBrowser:true}),{action:'skip',reason:'browser-chosen'});
 assert.deepEqual(D({...ok,failed:true}),{action:'skip',reason:'failed'});
 assert.deepEqual(D({...ok,automated:true}),{action:'skip',reason:'automated'});
 assert.deepEqual(D({...ok,state:'ready',enabled:false}),{action:'ready',reason:'ready'});
 // Network classification.
 const N=(n:any)=>run(c,'voiceAutoNetwork('+JSON.stringify(n)+')');
 assert.equal(N({onLine:true,connection:{type:'wifi'}}),'ok');assert.equal(N({onLine:true,connection:{type:'ethernet'}}),'ok');
 assert.equal(N({onLine:true,connection:{effectiveType:'4g'}}),'ok','desktop Chrome: no type, not cellular');
 assert.equal(N({onLine:true,connection:{type:'cellular'}}),'cellular');assert.equal(N({onLine:true,connection:{type:'wifi',saveData:true}}),'save-data');
 assert.equal(N({onLine:true,connection:{effectiveType:'2g'}}),'cellular');assert.equal(N({onLine:true}),'no-api');assert.equal(N({onLine:false}),'offline');
 assert.equal(run(c,'voiceAutoEnabled()'),true,'the setting is ON by default');
});

t('inputs: an explicit removal, an explicit browser choice and webdriver are read from the device',async()=>{
 const caches=fakeCaches(),c=ctx({caches,navigator:nav({webdriver:true})});
 run(c,"voiceLocalProbe=async()=>({ok:true,packs:{small:{ok:true}}})");
 let i=await run(c,'voiceAutoInputs()');assert.equal(i.automated,true,'automated browsers never auto-download');assert.equal(i.capable,true);assert.equal(i.state,'none');assert.equal(i.net,'no-api');
 run(c,'globalThis.BEP_VOICE_AUTO_TEST=true');i=await run(c,'voiceAutoInputs()');assert.equal(i.automated,false);
 run(c,"voiceAutoMarkRemoved()");i=await run(c,'voiceAutoInputs()');assert.equal(i.removed,true);
 run(c,"voiceAutoSetEnabled(true)");i=await run(c,'voiceAutoInputs()');assert.equal(i.removed,false,'turning the option back on is an explicit request');
 run(c,"localStorage.setItem('bep-voice-recognizer','browser')");i=await run(c,'voiceAutoInputs()');assert.equal(i.explicitBrowser,true);
 // Low battery (Battery Status API).
 run(c,"localStorage.removeItem('bep-voice-recognizer');navigator.getBattery=async()=>({level:.1,charging:false,addEventListener(){}})");
 assert.deepEqual(JSON.parse(JSON.stringify(await run(c,'voiceAutoRun()'))),{action:'wait',reason:'battery'});
 run(c,"navigator.getBattery=async()=>({level:.9,charging:false,addEventListener(){}});navigator.connection={type:'cellular',addEventListener(){}}");
 assert.deepEqual(JSON.parse(JSON.stringify(await run(c,'voiceAutoRun()'))),{action:'wait',reason:'cellular'});
});

t('ready pack becomes the recogniser once (toast once); explicit browser choice and failures are respected',async()=>{
 const toasts:string[]=[];const c=ctx({caches:fakeCaches(),navigator:nav(),toast:(m:string)=>toasts.push(m)});
 run(c,"voiceLocalStatus=async()=>'ready';voiceLocalProbe=async()=>({ok:true,packs:{small:{ok:true}}});globalThis.__recs=[];globalThis.registerVoiceRecognizer=r=>{__recs.push(r);return()=>{}}");
 assert.equal(await run(c,'voiceAutoMaybeSwitch()'),true);assert.equal(run(c,"localStorage.getItem('bep-voice-recognizer')"),'local-small');
 assert.deepEqual(toasts,['Đã bật giọng nói chính xác (dùng được không cần mạng)']);
 // The family switches back to the browser recogniser: kept.
 run(c,"localStorage.setItem('bep-voice-recognizer','browser')");assert.equal(await run(c,'voiceAutoMaybeSwitch()'),false);assert.equal(run(c,"localStorage.getItem('bep-voice-recognizer')"),'browser');
 // Choice cleared (e.g. by a model update that made the pack briefly incomplete): restored silently, no second toast.
 run(c,"localStorage.removeItem('bep-voice-recognizer')");assert.equal(await run(c,'voiceAutoMaybeSwitch()'),true);assert.equal(toasts.length,1,'toast only once');
 // A failure on this device (e.g. out of memory) is not overridden.
 run(c,"voiceLocalMarkFailed('small','load','crash')");assert.equal(run(c,"localStorage.getItem('bep-voice-recognizer')"),null);assert.equal(await run(c,'voiceAutoMaybeSwitch()'),false);
 // Not usable here (capability) → not registered → no switch.
 const c2=ctx({caches:fakeCaches(),navigator:nav()});run(c2,"voiceLocalStatus=async()=>'ready';voiceLocalProbe=async()=>({ok:false,packs:{small:{ok:false,reasons:['simd']}}});globalThis.registerVoiceRecognizer=r=>()=>{}");
 assert.equal(await run(c2,'voiceAutoMaybeSwitch()'),false);
});

// Synthetic release: pack files + runtime, sha256 of their bytes.
function release(c:any,rev:string,files:Record<string,string|Buffer>,tf:string){
 c.__files=Object.entries(files).map(([path,body])=>({path,size:Buffer.byteLength(body as any),sha256:hex(body)}));
 c.__tf={url:`https://cdn.jsdelivr.net/npm/@huggingface/transformers@${tf}/dist/transformers.min.js`,size:Buffer.byteLength('tf-'+tf),sha256b64:b64('tf-'+tf)};
 run(c,`VOICE_LOCAL_PACKS.small.revision='${rev}';VOICE_LOCAL_PACKS.small.files=__files;Object.assign(VOICE_LOCAL_TF,__tf);
  VOICE_LOCAL_ORT.asyncify[0].size=7;VOICE_LOCAL_ORT.asyncify[0].sha256b64='${b64('ort-mjs')}';VOICE_LOCAL_ORT.asyncify[1].size=8;VOICE_LOCAL_ORT.asyncify[1].sha256b64='${b64('ort-wasm')}';
  VOICE_LOCAL_ORT.plain[0].size=5;VOICE_LOCAL_ORT.plain[0].sha256b64='${b64('plain')}';VOICE_LOCAL_ORT.plain[1].size=6;VOICE_LOCAL_ORT.plain[1].sha256b64='${b64('plainw')}'`);
}
function server(files:Record<string,string|Buffer>,tf:string,log:string[],{ranges=true}={}){
 return async(u:string,o:any={})=>{log.push(u+(o.headers?.Range?' '+o.headers.Range:''));let body:any=null;
  if(u.includes('transformers@'))body=Buffer.from('tf-'+u.match(/transformers@([^/]+)/)![1]);else if(u.endsWith('asyncify.mjs'))body=Buffer.from('ort-mjs');else if(u.endsWith('asyncify.wasm'))body=Buffer.from('ort-wasm');
  else{const k=Object.keys(files).find(k=>u.endsWith('/'+k));if(k)body=Buffer.from(files[k] as any)}
  if(!body)return new Response('',{status:404});
  const r=o.headers?.Range;if(r&&ranges){const [,a,b]=r.match(/bytes=(\d+)-(\d+)/);return new Response(body.subarray(+a,+b+1),{status:206})}
  return new Response(body)}}

t('model update: only files whose sha256 changed are downloaded; unchanged files are re-used, old entries dropped',async()=>{
 const caches=fakeCaches(),c=ctx({caches,navigator:nav()}),log:string[]=[];
 const v1={'onnx/encoder_model_quantized.onnx':'encoder-v1','onnx/decoder_model_merged_quantized.onnx':'decoder-v1','config.json':'{"a":1}','tokenizer.json':'{"tok":1}'};
 release(c,'rev1',v1,'4.3.1');c.__fetch=server(v1,'4.3.1',log);
 assert.equal(await run(c,"voiceLocalDownload('small',null,{fetchFn:__fetch})"),'ready');assert.equal(log.length,7,'first download: 4 pack files + 3 runtime files');
 // Next release: new revision; only the decoder and the config changed.
 const v2={...v1,'onnx/decoder_model_merged_quantized.onnx':'decoder-v2','config.json':'{"a":2}'};
 release(c,'rev2',v2,'4.3.1');log.length=0;c.__fetch=server(v2,'4.3.1',log);
 assert.equal(await run(c,"voiceLocalStatus('small')"),'partial','new revision URLs are not stored yet (runtime unchanged)');
 const progress:number[]=[];c.__p=(f:number)=>progress.push(f);
 assert.equal(await run(c,"voiceLocalDownload('small',__p,{fetchFn:__fetch})"),'ready');
 assert.deepEqual(log.map(u=>u.split('/resolve/rev2/')[1]),['onnx/decoder_model_merged_quantized.onnx','config.json'],'only the two changed files are downloaded');
 assert.ok(progress[0]>0.5,'re-used files count as done from the start');
 const store=caches.stores.get('bep-voice-models-v1')!,keys=[...store.keys()];
 assert.ok(!keys.some(k=>k.includes('/resolve/rev1/')),'old revision entries are removed (no double storage)');
 assert.equal(await store.get(run(c,"voiceLocalPackFiles('small')[0].url")).clone().text(),'encoder-v1','unchanged encoder copied, not downloaded');
 const idx=JSON.parse(await store.get('https://kitchen.test/__bep-voice-index').clone().text());
 assert.equal(Object.keys(idx).length,7);assert.ok(Object.values(idx).every((e:any)=>/^[a-f0-9]{64}$/.test(e.id)),'index keyed by sha256');
 // Runtime: a new transformers.js version downloads only that file.
 release(c,'rev2',v2,'4.4.0');log.length=0;c.__fetch=server(v2,'4.4.0',log);
 await run(c,"voiceLocalDownload('small',null,{fetchFn:__fetch})");assert.deepEqual(log,['https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.4.0/dist/transformers.min.js']);
 assert.ok(![...store.keys()].some(k=>k.includes('transformers@4.3.1')),'old runtime version removed');
 // Same content under a new runtime URL (version bump, identical bytes) is copied, not fetched.
 c.__tfSame={url:'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.4.1/dist/transformers.min.js'};run(c,'VOICE_LOCAL_TF.url=__tfSame.url');log.length=0;
 await run(c,"voiceLocalDownload('small',null,{fetchFn:__fetch})");assert.deepEqual(log,[],'identical bytes: nothing downloaded');
});

t('pre-1.7.1 cache entries are migrated into the index without a download',async()=>{
 const caches=fakeCaches(),c=ctx({caches,navigator:nav()}),log:string[]=[];
 const v1={'onnx/encoder_model_quantized.onnx':'enc','config.json':'{}'};release(c,'rev1',v1,'4.3.1');
 // A v1.7.0 device: files stored under their URLs, no index.
 const cache=await caches.open('bep-voice-models-v1');for(const f of run(c,"[...voiceLocalRuntime(),...voiceLocalPackFiles('small')]")){const body=f.url.includes('transformers@')?'tf-4.3.1':f.url.endsWith('.mjs')?'ort-mjs':f.url.endsWith('.wasm')?'ort-wasm':(v1 as any)[f.url.split('/rev1/')[1]];await cache.put(f.url,new Response(body))}
 assert.equal(await run(c,"voiceLocalStatus('small')"),'ready');
 assert.equal(await run(c,'voiceLocalMigrateIndex()'),5);assert.equal(await run(c,'voiceLocalMigrateIndex()'),0,'idempotent');
 release(c,'rev2',{...v1,'config.json':'{"b":1}'},'4.3.1');c.__fetch=server({...v1,'config.json':'{"b":1}'},'4.3.1',log);
 await run(c,"voiceLocalDownload('small',null,{fetchFn:__fetch})");assert.deepEqual(log.map(u=>u.split('/').pop()),['config.json'],'only the changed file');
 // Removing the pack removes everything, including the index.
 await run(c,"voiceLocalRemove('small')");assert.equal(caches.stores.get('bep-voice-models-v1')!.size,0);
});

t('large files resume from the last stored 8 MB range after a pause; a server without ranges still works',async()=>{
 const caches=fakeCaches(),c=ctx({caches,navigator:nav()}),log:string[]=[];
 const big=Buffer.alloc(20*1024*1024+123);for(let i=0;i<big.length;i+=4096)big[i]=(i/4096)&255;
 const files={'onnx/decoder_model_merged_quantized.onnx':big,'config.json':'{}'};release(c,'rev1',files,'4.3.1');
 const base=server(files,'4.3.1',log);let ctl:any=null;
 // Pause (abort) while the second range of the decoder is arriving.
 c.__fetch=async(u:string,o:any)=>{if(u.endsWith('.onnx')&&o.headers?.Range==='bytes=8388608-16777215'){ctl.abort();throw new DOMException('Aborted','AbortError')}return base(u,o)};
 ctl=new AbortController();c.__sig=ctl.signal;
 await assert.rejects(()=>run(c,"voiceLocalDownload('small',null,{fetchFn:__fetch,signal:__sig})"),(e:any)=>e.name==='AbortError');
 assert.equal(await run(c,"voiceLocalStatus('small')"),'partial');
 const parts=[...caches.stores.get('bep-voice-models-v1')!.keys()].filter(k=>k.includes('/__bep-voice-part/'));assert.equal(parts.length,1,'first 8 MB range kept');
 log.length=0;c.__fetch=base;const prog:any[]=[];c.__p=(f:number,d:number,t:number)=>prog.push([d,t]);
 assert.equal(await run(c,"voiceLocalDownload('small',__p,{fetchFn:__fetch})"),'ready');
 assert.deepEqual(log.map(l=>l.split(' ').slice(1).join(' ')),['bytes=8388608-16777215','bytes=16777216-20971642',''],'resumes at the second range (then config.json)');
 assert.equal(prog.at(-1)[0],prog.at(-1)[1],'progress reaches the total');
 const stored=await (await caches.open('bep-voice-models-v1')).match(run(c,"voiceLocalPackFiles('small')[0].url"));assert.equal(hex(Buffer.from(await stored.arrayBuffer())),hex(big),'assembled file matches');
 assert.equal([...caches.stores.get('bep-voice-models-v1')!.keys()].filter(k=>k.includes('/__bep-voice-part/')).length,0,'ranges dropped once the file is stored');
 // Server ignores Range (200): one whole-file request.
 await run(c,"voiceLocalRemove('small')");log.length=0;c.__fetch=server(files,'4.3.1',log,{ranges:false});
 assert.equal(await run(c,"voiceLocalDownload('small',null,{fetchFn:__fetch})"),'ready');
 // Tampered range → integrity failure, ranges discarded.
 await run(c,"voiceLocalRemove('small')");c.__fetch=async(u:string,o:any)=>{const r=await base(u,o);if(u.endsWith('.onnx')&&o.headers?.Range?.startsWith('bytes=0-')){const b=Buffer.from(await r.arrayBuffer());b[5]^=1;return new Response(b,{status:206})}return r};
 await assert.rejects(()=>run(c,"voiceLocalDownload('small',null,{fetchFn:__fetch})"),(e:any)=>e.code==='integrity');
 assert.equal([...caches.stores.get('bep-voice-models-v1')!.keys()].filter(k=>k.includes('/__bep-voice-part/')).length,0);
 // v1.7.2: a server that answers a range with the whole (re-encoded/inflated) file — what jsDelivr does with
 // Content-Encoding: br — no longer fails with 'không khớp bản gốc': the file is fetched again as one request.
 await run(c,"voiceLocalRemove('small')");log.length=0;
 c.__fetch=async(u:string,o:any)=>{if(o.headers?.Range&&u.endsWith('.onnx')){const r=await base(u,{...o,headers:{}});return new Response(await r.arrayBuffer(),{status:206})}return base(u,o)};
 await run(c,"voiceLocalDownload('small',null,{fetchFn:__fetch})");
 assert.equal([...caches.stores.get('bep-voice-models-v1')!.keys()].filter(k=>k.includes('/__bep-voice-part/')).length,0,'no stale parts after the fallback');
});

t('a second caller joins the running download; Pause cancels only when every caller has cancelled',async()=>{
 const caches=fakeCaches(),c=ctx({caches,navigator:nav()}),log:string[]=[];
 const files={'onnx/encoder_model_quantized.onnx':'enc','config.json':'{}'};release(c,'rev1',files,'4.3.1');
 let release1:any;const gate=new Promise(r=>release1=r);const base=server(files,'4.3.1',log);
 c.__fetch=async(u:string,o:any)=>{await gate;return base(u,o)};
 const a=new AbortController(),b=new AbortController();c.__a=a.signal;c.__b=b.signal;const pa:number[]=[],pb:number[]=[];c.__pa=(f:number)=>pa.push(f);c.__pb=(f:number)=>pb.push(f);
 const first=run(c,"voiceLocalDownload('small',__pa,{fetchFn:__fetch,signal:__a})"),second=run(c,"voiceLocalDownload('small',__pb,{fetchFn:__fetch,signal:__b})");
 b.abort();await assert.rejects(second,(e:any)=>e.name==='AbortError');release1();
 assert.equal(await first,'ready','the other caller keeps going');assert.equal(log.length,5,'one download, not two');
});

t('app updates never touch the voice cache: the service worker only retires bep-family-* caches',async()=>{
 const origin='https://kitchen.example',stores=new Map<string,Map<string,any>>();
 const cacheFor=(n:string)=>{if(!stores.has(n))stores.set(n,new Map());const m=stores.get(n)!;return{match:async(k:any)=>m.get(String(k?.url||k)),put:async(k:any,v:any)=>{m.set(String(k?.url||k),v)},delete:async(k:any)=>m.delete(String(k?.url||k)),keys:async()=>[...m.keys()].map(k=>new Request(new URL(k,origin).href))}};
 cacheFor('bep-voice-models-v1').put('https://huggingface.co/onnx-community/whisper-small/resolve/x/onnx/encoder_model_quantized.onnx',new Response('weights'));
 cacheFor('bep-voice-models-v1').put(origin+'/__bep-voice-index',new Response('{}'));cacheFor('bep-family-v21-old').put('/index.html',new Response('old'));
 const handlers:any={};const self:any={location:{hostname:'kitchen.example',origin,href:origin+'/sw.js'},registration:{active:{}},addEventListener:(n:string,f:any)=>handlers[n]=f,skipWaiting:async()=>{},clients:{claim:async()=>{},matchAll:async()=>[]}};
 const swctx=vm.createContext({AbortController,setTimeout,clearTimeout,TextDecoder,TextEncoder,URL,Request,Response,Headers,console,Promise,JSON,Date,Math,
  fetch:async()=>new Response('ok',{headers:{'content-type':'text/plain'}}),caches:{open:async(n:string)=>cacheFor(n),keys:async()=>[...stores.keys()],delete:async(n:string)=>stores.delete(n),match:async()=>undefined},self,importScripts:()=>{},verifyOfflineAccess:async()=>null,offlineJwk:()=>null});
 vm.runInContext(fs.readFileSync('dist/sw.js','utf8'),swctx);
 const fire=async(name:string,event:any)=>{const waits:any[]=[];event.waitUntil=(p:any)=>waits.push(p);let responded=false;event.respondWith=()=>{responded=true};handlers[name](event);await Promise.allSettled(waits);return responded};
 await fire('install',{});await fire('activate',{});
 assert.ok(!stores.has('bep-family-v21-old'),'old app cache retired');
 assert.ok(stores.has('bep-voice-models-v1'),'voice cache kept');assert.equal(stores.get('bep-voice-models-v1')!.size,2,'voice entries untouched');
 // Pack downloads and worker model reads are cross-origin: the service worker never intercepts or caches them.
 assert.equal(await fire('fetch',{request:new Request('https://huggingface.co/onnx-community/whisper-small/resolve/x/config.json')}),false);
 assert.equal(await fire('fetch',{request:new Request('https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.1/dist/transformers.min.js')}),false);
 const src=fs.readFileSync('src/frontend/sw.ts','utf8');assert.ok(!/bep-voice/.test(src),'sw.ts never names the voice cache');
 assert.match(src,/k\.startsWith\('bep-family-'\)/,'activate filters to bep-family-* caches');
});

(async()=>{for(const [name,fn] of tests){try{await fn();count++}catch(e:any){e.message=name+': '+e.message;throw e}}console.log(`voice-default: ${count} checks passed (synthetic files, no download).`)})().catch(e=>{console.error(e);process.exit(1)});
