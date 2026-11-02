// v1.7.2 crash guard for on-device "More accurate" (Whisper small) after an iPhone crash loop (Henry, production
// v1.7.1: hold → page reloads → hold again → "A problem repeatedly occurred"). Checks, with a fake worker + engine
// (no model, no audio): the marker covers the WHOLE time the model is in memory (written before the worker exists,
// phase changes, removed only on dispose/release); a marker found at start-up → failure "crash" + one-time notice +
// browser recogniser, never re-enabled by the automatic default; iPhone/iPad self-test gating (nothing switched on
// before it passes; a failed or interrupted test; a page that dies during the test); explicit Try again; microphone
// first, model second (a hold that ends while loading stops the microphone); audio limited to ≤ 20 s per inference.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const webcrypto=require('node:crypto').webcrypto;
let count=0;const tests:any[]=[];const t=(name:string,fn:any)=>tests.push([name,fn]);
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
function lsOf(store:Map<string,string>){return{getItem:(k:string)=>store.has(k)?store.get(k)!:null,setItem:(k:string,v:string)=>{store.set(k,String(v))},removeItem:(k:string)=>{store.delete(k)}}}
function ctx(store:Map<string,string>,extra:any={}){const c=vm.createContext({console,Intl,Date,Math,URL,TextEncoder,Response,Blob,crypto:webcrypto,btoa,atob,setTimeout,clearTimeout,queueMicrotask,structuredClone,AbortController,DOMException,navigator:{onLine:true,userAgent:"node"},Float32Array,localStorage:lsOf(store),...extra});vm.runInContext(fs.readFileSync('dist/voice-local.js','utf8'),c);return c}
const run=(c:any,src:string)=>vm.runInContext(src,c);
const J=(c:any,src:string)=>JSON.parse(vm.runInContext('JSON.stringify('+src+')',c));
const marker=(store:Map<string,string>)=>{const v=store.get('bep-voice-local-busy');return v?JSON.parse(v):null};
// A fake Worker running the REAL worker message handler with a controllable engine.
function workerFactory(engineOpts:any={}){
 const w=vm.createContext({console,Date,Math,URL,Float32Array,Promise,setTimeout});vm.runInContext(fs.readFileSync('dist/voice-local-worker.js','utf8'),w);
 const made:any[]=[],seen:number[]=[];
 const create=()=>{const fake:any={terminated:false,postMessage(m:any){if(!fake.terminated)queueMicrotask(()=>h(m))},terminate(){fake.terminated=true}};
  const h=w.voiceLocalWorkerHandler({createEngine:async()=>{if(engineOpts.loadGate)await engineOpts.loadGate;if(engineOpts.loadError)throw Object.assign(Error('load failed'),{code:engineOpts.loadError});
    return{device:'wasm',files:['onnx/encoder_model_quantized.onnx','onnx/decoder_model_merged_quantized.onnx'],transcribe:async(a:Float32Array)=>{seen.push(a.length);if(engineOpts.transcribeGate)await engineOpts.transcribeGate;if(engineOpts.transcribeError)throw Object.assign(Error('boom'),{code:engineOpts.transcribeError});return 'hai ký thịt'},dispose(){}}},
   post:(m:any)=>queueMicrotask(()=>{if(!fake.terminated)fake.onmessage?.({data:m})})});
  made.push(fake);return fake};
 return{create,made,seen};
}
function install(c:any,wf:any,{ios=false,ready=true}={}){c.__wf=wf;run(c,`voiceLocalWorker=async()=>__wf.create();voiceLocalStatus=async()=>${ready?"'ready'":"'none'"};voiceLocalCap={ok:true,ios:${ios},packs:{small:{ok:true,reasons:[]}}};voiceLocalProbe=async()=>voiceLocalCap;voiceLocalKeepWorker=async()=>{};`)}
function registry(c:any){const reg=new Map<string,any>();c.registerVoiceRecognizer=(r:any)=>{reg.set(r.id,r);return()=>reg.delete(r.id)};return reg}

t('marker covers the whole time the model is in memory (before the worker exists → dispose)',async()=>{
 const store=new Map<string,string>(),c=ctx(store);let gate:any;const wf=workerFactory({transcribeGate:new Promise(r=>gate=r)});install(c,wf);
 let atCreate:any=null;c.__wf={create:()=>{atCreate=marker(store);return wf.create()}};
 const eng=await run(c,"voiceLocalEnsureEngine('small')");
 assert.equal(atCreate?.phase,'loading-model','written BEFORE the worker is created');assert.equal(atCreate.pack,'small');
 assert.equal(marker(store)?.phase,'resident','still marked while loaded and idle between sentences (v1.7.1 cleared it here)');
 assert.deepEqual(eng.files,['onnx/encoder_model_quantized.onnx','onnx/decoder_model_merged_quantized.onnx'],'the q8 (_quantized) weights are the ones read');
 const p=eng.transcribe(new Float32Array(16000),'vietnamese',true);await sleep(5);assert.equal(marker(store)?.phase,'transcribing');
 gate();await p;assert.equal(marker(store)?.phase,'resident','back to resident after a sentence — not cleared');
 assert.equal(await run(c,"voiceLocalEnsureEngine('small')"),eng,'one session, reused by the next hold');assert.equal(wf.made.length,1);
 run(c,'voiceLocalEngine.dispose()');assert.equal(marker(store),null,'removed only when the worker is terminated');assert.equal(wf.made[0].terminated,true);
 // Load errors (not a crash) clear the marker and terminate the worker.
 const wf2=workerFactory({loadError:'not-downloaded'});install(c,wf2);
 await assert.rejects(()=>run(c,"voiceLocalEnsureEngine('small')"));assert.equal(marker(store),null);assert.equal(wf2.made[0].terminated,true);
 // A clean release (pagehide / hidden tab / idle) removes the marker; a kill would not run it.
 const wf3=workerFactory();install(c,wf3);await run(c,"voiceLocalEnsureEngine('small')");assert.ok(marker(store));
 assert.equal(run(c,"voiceLocalRelease('pagehide')"),'pagehide');assert.equal(marker(store),null);assert.equal(wf3.made[0].terminated,true);assert.equal(run(c,'voiceLocalEngine'),null);
 // iPhone/iPad load options: WASM only, one thread, low-memory session.
 run(c,"voiceLocalCap={ok:true,ios:true,packs:{small:{ok:true,reasons:[]}}}");assert.deepEqual(J(c,'(({gpu,threads,lowMemory})=>({gpu,threads,lowMemory}))(voiceLocalLoadOptions())'),{gpu:false,threads:1,lowMemory:true});
});

t('marker at start-up → failure, one-time notice, browser recogniser; never re-enabled automatically',async()=>{
 for(const [m,phase] of [[{pack:'small',phase:'transcribing',at:1,v:2},'transcribing'],[{pack:'small',phase:'resident',at:1,v:2},'resident'],[{pack:'small',stage:'run',at:1},'transcribing'],[{pack:'small',phase:'downloading',at:1,v:2},'downloading']] as any){
  const store=new Map<string,string>([['bep-voice-recognizer','local-small'],['bep-voice-local-busy',JSON.stringify(m)],['bep-voice-local-selftest',JSON.stringify({pack:'small',ok:true,v:1})]]);
  const c=ctx(store),reg=registry(c);const wf=workerFactory();install(c,wf);
  const f=J(c,'voiceLocalCheckCrash()');assert.equal(f.stage,'crash');assert.equal(f.phase,phase);assert.equal(f.notice,'pending');
  assert.equal(store.has('bep-voice-local-busy'),false);assert.equal(store.has('bep-voice-recognizer'),false,'browser recogniser');assert.equal(store.has('bep-voice-local-selftest'),false,'an earlier self-test no longer counts');
  assert.match(run(c,'voiceLocalFailText(voiceLocalFailed())'),/hết bộ nhớ và trang bị tải lại — đã chuyển về giọng nói thường của máy/);
  assert.match(run(c,'voiceLocalCrashNoticeHtml(voiceLocalFailed())'),/data-vl-retry="small"[\s\S]*Thử lại[\s\S]*data-vl-remove="small"[\s\S]*Gỡ gói/);
  assert.equal(run(c,"voiceLocalUsable('small')"),false);
  await run(c,'voiceLocalSyncRecognizers()');assert.equal(reg.size,0,'not offered in the selector');
  assert.equal(await run(c,'voiceAutoMaybeSwitch()'),false,'the automatic default does not switch it back on');assert.equal(store.has('bep-voice-recognizer'),false);
  c.__inputs=await run(c,'voiceAutoInputs()');assert.deepEqual(J(c,'voiceAutoDecision({...__inputs,state:"none"})'),{action:'skip',reason:'failed'},'and never downloads it again by itself');
  assert.equal(wf.made.length,0,'no worker was created — the model was not loaded');
  assert.equal(run(c,'voiceLocalCheckCrash()'),null,'checked once');
  const r=run(c,"voiceLocalRecognizer('small')");assert.equal(await r.available(),false,'standalone sheet does not use it either');
 }
 // No marker → nothing happens.
 const store=new Map<string,string>(),c=ctx(store);assert.equal(run(c,'voiceLocalCheckCrash()'),null);assert.equal(run(c,'voiceLocalFailed()'),null);
});

t('iPhone/iPad: nothing switched on before the self-test passes; pass → on; fail → marked; busy → deferred',async()=>{
 // Pack ready, iOS, no self-test yet: the v1.7.1 stored choice is dropped, the selector does not offer it.
 {const store=new Map<string,string>([['bep-voice-recognizer','local-small']]),c=ctx(store),reg=registry(c);let gate:any;const wf=workerFactory({transcribeGate:new Promise(r=>gate=r)});install(c,wf,{ios:true});
  await run(c,'voiceLocalSyncRecognizers()');assert.equal(reg.size,0,'not offered before the self-test');assert.equal(store.has('bep-voice-recognizer'),false,'v1.7.1 iOS choice falls back to the browser recogniser');
  const p=run(c,'voiceAutoMaybeSwitch()');await sleep(10);
  assert.equal(marker(store)?.phase,'self-test','self-test runs with the marker');assert.equal(reg.size,0,'still not offered while testing');assert.equal(store.has('bep-voice-recognizer'),false);
  assert.match(run(c,'voiceLocalRecNoteText()'),/giọng nói thường của máy[\s\S]*Đang chạy thử/,'footnote: the browser recogniser is in use, test running');
  gate();assert.equal(await p,true);
  assert.equal(J(c,'voiceLocalSelfTestRecord()').ok,true);assert.equal(store.get('bep-voice-recognizer'),'local-small','switched on after the test');assert.ok(reg.has('local-small'));
  assert.equal(marker(store),null,'the self-test frees the model');assert.equal(wf.made[0].terminated,true);assert.deepEqual(wf.seen,[16000],'a 1 s synthetic clip');
  assert.match(run(c,'voiceLocalRecNoteText()'),/trên máy · Chính xác hơn/);
 }
 // Self-test error → device marked, not offered.
 {const store=new Map<string,string>(),c=ctx(store),reg=registry(c);install(c,workerFactory({transcribeError:'crash'}),{ios:true});
  assert.equal(await run(c,'voiceAutoMaybeSwitch()'),false);assert.equal(J(c,'voiceLocalFailed()').stage,'self-test');assert.equal(reg.size,0);assert.equal(store.has('bep-voice-recognizer'),false);assert.equal(marker(store),null);}
 // The page dies during the self-test → next start marks the device (phase self-test).
 {const store=new Map<string,string>(),c=ctx(store);install(c,workerFactory({loadGate:new Promise(()=>{})}),{ios:true});
  run(c,"voiceLocalSelfTest('small')");await sleep(10);assert.equal(marker(store)?.phase,'self-test');
  const c2=ctx(store);const f=J(c2,'voiceLocalCheckCrash()');assert.equal(f.stage,'crash');assert.equal(f.phase,'self-test');assert.equal(run(c2,"voiceLocalUsable('small')"),false);}
 // Recording in progress → deferred (no verdict, no model load).
 {const store=new Map<string,string>(),c=ctx(store);const wf=workerFactory();install(c,wf,{ios:true});run(c,'voiceLocalActive={stop(){}}');
  assert.equal(await run(c,"voiceLocalSelfTest('small')"),false);assert.equal(run(c,'voiceLocalSelfTestRun.deferred'),true);assert.equal(wf.made.length,0);assert.equal(run(c,'voiceLocalFailed()'),null);}
 // Interrupted (tab hidden → release) → no verdict.
 {const store=new Map<string,string>(),c=ctx(store);let gate:any;const wf=workerFactory({transcribeGate:new Promise(r=>gate=r)});install(c,wf,{ios:true});
  const p=run(c,"voiceLocalSelfTest('small')");await sleep(10);run(c,"voiceLocalRelease('hidden')");assert.equal(await p,false);assert.equal(run(c,'voiceLocalFailed()'),null,'not marked');assert.equal(run(c,'voiceLocalSelfTestRun.deferred'),true);assert.equal(marker(store),null);gate();}
 // Off iOS no self-test is needed (unchanged behaviour).
 {const store=new Map<string,string>(),c=ctx(store),reg=registry(c);const wf=workerFactory();install(c,wf,{ios:false});
  assert.equal(await run(c,'voiceAutoMaybeSwitch()'),true);assert.equal(wf.made.length,0,'no model load to switch on');assert.ok(reg.has('local-small'));}
});

t('Try again: explicit (warning first), runs the self-test, switches on only when it passes',async()=>{
 const store=new Map<string,string>([['bep-voice-local-busy',JSON.stringify({pack:'small',phase:'transcribing',at:1,v:2})]]);
 const asked:any[]=[];const c=ctx(store,{confirmDialog:async(o:any)=>{asked.push(o);return asked.length>1},toast:()=>{}}),reg=registry(c);install(c,workerFactory(),{ios:true});
 run(c,'voiceLocalCheckCrash()');
 assert.equal(await run(c,"voiceLocalRetry('small')"),false,'declined');assert.match(asked[0].body,/hết bộ nhớ[\s\S]*tải lại thêm lần nữa/);assert.ok(run(c,'voiceLocalFailed()'),'still marked when declined');
 assert.equal(await run(c,"voiceLocalRetry('small')"),true);assert.equal(run(c,'voiceLocalFailed()'),null);assert.equal(J(c,'voiceLocalSelfTestRecord()').ok,true);assert.equal(store.get('bep-voice-recognizer'),'local-small');assert.ok(reg.has('local-small'));
 // Try again that fails again → marked again, browser kept.
 const store2=new Map<string,string>([['bep-voice-local-busy',JSON.stringify({pack:'small',phase:'self-test',at:1,v:2})]]);const c2=ctx(store2,{confirmDialog:async()=>true,toast:()=>{}});registry(c2);install(c2,workerFactory({loadError:'crash'}),{ios:false});
 run(c2,'voiceLocalCheckCrash()');assert.equal(await run(c2,"voiceLocalRetry('small')"),false);assert.equal(J(c2,'voiceLocalFailed()').stage,'self-test');assert.equal(store2.has('bep-voice-recognizer'),false);
});

t('recogniser: microphone first, then the model; a hold that ends while loading stops the microphone',async()=>{
 const store=new Map<string,string>(),c=ctx(store);const order:string[]=[];let gate:any,stops=0,onFrame:any=null;
 c.__deps={probe:async()=>({packs:{small:{ok:true}}}),status:async()=>'ready',usable:()=>true,langMode:()=>'toggle',note:()=>{},
  record:async(cb:any)=>{order.push('mic');onFrame=cb;return{stop(){stops++}}},ensure:async()=>{order.push('model');await new Promise(r=>gate=r);return{transcribe:async(a:Float32Array)=>({text:'len '+a.length})}}};
 const ends:string[]=[];c.__e=(i:any)=>ends.push(i.reason);
 const started=run(c,"voiceLocalRecognizer('small',__deps)").start('vi-VN',()=>{},c.__e);await sleep(5);
 assert.deepEqual(order,['mic','model'],'the permission prompt comes at once, not after the model load');
 await run(c,'voiceLocalActive').stop(true);assert.equal(stops,1,'microphone stopped');assert.deepEqual(ends,['aborted']);gate();await started;
 // Long speech is cut at 15 s per sentence; the worker never decodes more than 20 s at once.
 const seen:number[]=[];c.__deps={...c.__deps,ensure:async()=>({transcribe:async(a:Float32Array)=>{seen.push(a.length);return{text:'x'}}})};
 const ctl=await run(c,"voiceLocalRecognizer('small',__deps)").start('vi-VN',()=>{},()=>{});
 const frame=()=>{const f=new Float32Array(1600);for(let i=0;i<f.length;i++)f[i]=.2*Math.sin(i/5);return f};
 for(let i=0;i<220;i++)onFrame(frame());await sleep(20);await ctl.stop(false);await sleep(20);
 assert.ok(seen.length>=2&&seen.every(n=>n<=15*16000+1600),'sentences ≤ 15 s: '+seen.join(','));
 const w=vm.createContext({console,Date,Math,URL,Float32Array,Promise,setTimeout});vm.runInContext(fs.readFileSync('dist/voice-local-worker.js','utf8'),w);
 assert.deepEqual(Array.from(w.voiceLocalWorkerChunks(new Float32Array(16000*50)),(a:any)=>a.length),[240000,240000,240000,80000]);assert.equal(w.voiceLocalWorkerChunks(new Float32Array(16000*20)).length,1);
 const lens:number[]=[];const posted:any[]=[];const h=w.voiceLocalWorkerHandler({createEngine:async()=>({transcribe:async(a:Float32Array)=>{lens.push(a.length);return 'ok'},dispose(){}}),post:(m:any)=>posted.push(m),now:()=>0});
 await h({type:'load',id:1,v:1,pack:{},runtime:{}});await h({type:'transcribe',id:2,v:1,audio:new Float32Array(16000*35),language:'vietnamese',final:true});
 assert.ok(lens.every(n=>n<=320000));assert.equal(posted.at(-1).chunks,3);assert.equal(posted.at(-1).text,'ok ok ok');
});

t('incremental SHA-256 matches WebCrypto (download verification without a whole-file buffer)',async()=>{
 const c=ctx(new Map());const data=new Uint8Array(200003);for(let i=0;i<data.length;i++)data[i]=(i*31+7)&255;c.__d=data;
 const want=Buffer.from(await webcrypto.subtle.digest('SHA-256',data)).toString('hex');
 assert.equal(run(c,"(()=>{const h=voiceLocalSha256();for(let o=0;o<__d.length;o+=65537)h.update(__d.subarray(o,o+65537));return voiceLocalHex(h.digest())})()"),want);
 assert.equal(run(c,"voiceLocalHex(voiceLocalSha256().digest())"),'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
 assert.equal(run(c,"(()=>{const h=voiceLocalSha256();h.update(new TextEncoder().encode('abc'));return voiceLocalHex(h.digest())})()"),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

(async()=>{for(const [name,fn] of tests){try{await fn();count++}catch(e:any){e.message=name+': '+e.message;throw e}}console.log(`voice-local-guard: ${count} checks passed (fake worker, no model).`);process.exit(0)})().catch(e=>{console.error(e);process.exit(1)});
