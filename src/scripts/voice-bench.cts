// OPT-IN manual benchmark for on-device speech recognition (not part of test:all: it
// downloads the real pinned model, ~107 MB for "Nhẹ" / ~279 MB for "Chính xác hơn"
// including the shared runtime, and needs a normal internet connection).
//
//   npm run build
//   node scripts/voice-bench.cjs --pack base --wav my-voice.wav [--lang vi|en|auto] [--headed] [--runs 3]
//
// --wav must be 16-bit PCM WAV (any sample rate, mono or stereo); it is resampled to
// 16 kHz mono in the page. Without --wav, use --headed and speak for --seconds (default 8)
// into this computer's microphone. The app is served locally from dist/ (device-only
// mode); the model is cached in the browser profile under --profile (default: the
// system temp folder, bep-voice-bench-profile) so later runs skip the download.
//
// On phones/tablets use the console helper instead (see docs/reviews/v1.6/voice-local/review.md):
//   await voiceLocalBenchmark('base',{seconds:8})
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path');
const arg=(name:string,def?:any)=>{const i=process.argv.indexOf('--'+name);return i<0?def:(process.argv[i+1]&&!process.argv[i+1].startsWith('--')?process.argv[i+1]:true)};
const pack=String(arg('pack','base')),wav=arg('wav',''),lang=String(arg('lang','vi')),headed=!!arg('headed',false),seconds=+arg('seconds',8),runs=Math.max(1,+arg('runs',1)),profile=path.resolve(String(arg('profile',path.join(require('node:os').tmpdir(),'bep-voice-bench-profile'))));
function readWav(file:string){const b=fs.readFileSync(file);if(b.toString('ascii',0,4)!=='RIFF'||b.toString('ascii',8,12)!=='WAVE')throw Error('Not a WAV file');let o=12,fmt:any=null,data:any=null;
 while(o<b.length-8){const id=b.toString('ascii',o,o+4),size=b.readUInt32LE(o+4);if(id==='fmt ')fmt={channels:b.readUInt16LE(o+10),rate:b.readUInt32LE(o+12),bits:b.readUInt16LE(o+22)};if(id==='data')data=b.subarray(o+8,o+8+size);o+=8+size+(size%2)}
 if(!fmt||!data||fmt.bits!==16)throw Error('Need 16-bit PCM WAV');const n=data.length/2/fmt.channels,out=new Array(n);for(let i=0;i<n;i++){let s=0;for(let c=0;c<fmt.channels;c++)s+=data.readInt16LE((i*fmt.channels+c)*2)/32768;out[i]=s/fmt.channels}return{rate:fmt.rate,samples:out}}
(async()=>{
 if(!fs.existsSync('dist/voice-local.js'))throw Error('Run npm run build first.');
 const audio=wav?readWav(String(wav)):null;
 // Honour an outbound proxy when one is configured (corporate/sandbox networks).
 const proxy=process.env.HTTPS_PROXY||process.env.https_proxy;
 const ctx=await chromium.launchPersistentContext(profile,{headless:!headed,permissions:['microphone'],viewport:{width:1000,height:800},...(proxy?{proxy:{server:proxy}}:{})});
 const page=ctx.pages()[0]||await ctx.newPage();page.on('console',(m:any)=>{if(m.type()==='error')console.error('[page]',m.text())});
 await page.route('http://bench.localhost/**',async(route:any)=>{const u=new URL(route.request().url());if(u.pathname.startsWith('/.netlify/'))return route.fulfill({status:401,json:{}});const f=path.resolve('dist',u.pathname==='/'?'index.html':u.pathname.slice(1));if(!fs.existsSync(f))return route.fulfill({status:404,body:''});return route.fulfill({body:fs.readFileSync(f),contentType:f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':f.endsWith('.json')?'application/json':f.endsWith('.html')?'text/html':'application/octet-stream'})});
 await page.addInitScript(()=>{localStorage.setItem('bep-local-locked','yes')});
 await page.goto('http://bench.localhost/#today');await page.waitForFunction(()=>typeof (globalThis as any).voiceLocalBenchmark==='function',null,{timeout:60000});
 console.log(`Pack ${pack}: checking download…`);const t=Date.now();
 const st=await page.evaluate((p:string)=>(globalThis as any).voiceLocalStatus(p),pack);
 if(st!=='ready'){await page.evaluate((p:string)=>(globalThis as any).voiceLocalDownload(p,(f:number)=>{(globalThis as any).__pct=Math.round(f*100)}),pack);console.log(`Downloaded in ${Math.round((Date.now()-t)/1000)} s`)}else console.log('Already downloaded (cached in profile).');
 // From here on recognition must not touch the network (everything comes from the pack cache).
 const external:string[]=[];ctx.on('request',(r:any)=>{const u=r.url();if(/^https?:/.test(u)&&!u.startsWith('http://bench.localhost/'))external.push(u)});
 for(let i=0;i<runs;i++){
  const r=await page.evaluate(async({p,audio,lang,seconds}:any)=>{const g:any=globalThis;let pcm=null;if(audio){pcm=g.voiceLocalResample(new Float32Array(audio.samples),audio.rate,16000)}return g.voiceLocalBenchmark(p,{seconds,audio:pcm,language:g.voiceLocalWhisperLang(lang==='en'?'en-AU':'vi-VN',lang==='auto'?'auto':'toggle')})},{p:pack,audio,lang,seconds});
  console.log(JSON.stringify({run:i+1,...r},null,1));
 }
 console.log(external.length?'WARNING: network requests during recognition: '+external.join(' '):'No network requests during recognition.');
 await ctx.close();
})().catch(e=>{console.error(e.message||e);process.exit(1)});
