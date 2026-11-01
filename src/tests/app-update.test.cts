// App update watcher (dist/app-update.js) in a VM harness, modelled on Sparkle Valley's service-worker update test:
// idle vs busy, activation before reload, controllerchange reload, 6 s fallback, flush before reload, double-tap,
// Studio notice switch, module-gone, forced minimum build overlay and its loop guard.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
class El{tagName:string;children:any[]=[];className='';hidden=false;isConnected=true;dataset:any={};attrs:any={};textContent='';disabled=false;onclick:any=null;type='';id='';title='';parent:any=null;
 constructor(tag:string){this.tagName=tag.toUpperCase()}
 append(...c:any[]){for(const x of c){x.parent=this;this.children.push(x)}}appendChild(c:any){this.append(c);return c}
 setAttribute(k:string,v:string){this.attrs[k]=v}getAttribute(k:string){return this.attrs[k]}focus(){}remove(){this.isConnected=false;if(this.parent)this.parent.children=this.parent.children.filter((x:any)=>x!==this)}
 all():any[]{return this.children.flatMap((c:any)=>[c,...c.all()])}
 querySelector(sel:string){return this.querySelectorAll(sel)[0]||null}
 querySelectorAll(sel:string){return this.all().filter((e:any)=>sel==='button'?e.tagName==='BUTTON':sel.startsWith('.')?e.className.split(' ').includes(sel.slice(1)):false)}}
const source=fs.readFileSync('dist/app-update.js','utf8');
function harness({busy='',notices=true,build='20261101T000000Z-aaaaaaaa',waiting=true,controller=true}:any={}){
 let clock=0;const timers:any[]=[];let seq=0;
 const t={setTimeout:(f:any,ms:number)=>{timers.push({id:++seq,at:clock+ms,f});return seq},setInterval:(f:any,ms:number)=>{const id=++seq;const run=()=>{f();timers.push({id,at:clock+ms,f:run})};timers.push({id,at:clock+ms,f:run});return id},clearInterval:(id:number)=>{for(let i=timers.length-1;i>=0;i--)if(timers[i].id===id)timers.splice(i,1)}};
 const swListeners:any={},log:string[]=[],reports:any[]=[],session=new Map<string,string>();
 const waitingWorker={postMessage:(m:any)=>log.push('post:'+m.type)};
 const reg:any={waiting:waiting?waitingWorker:null,installing:null,listeners:{} as any,addEventListener(type:string,fn:any){this.listeners[type]=fn},update:async()=>{log.push('update')}};
 const sw:any={controller:controller?{}:null,getRegistration:async()=>reg,addEventListener:(type:string,fn:any,opts:any)=>{(swListeners[type]??=[]).push({fn,once:opts?.once})}};
 const body=new El('body'),doc:any={body,visibilityState:'visible',createElement:(tag:string)=>new El(tag)};
 const ctx=vm.createContext({__bepNoAutoUpdater:true,console,Promise,String,Number,Error,RegExp,JSON});
 vm.runInContext(source,ctx);
 const state:any={busy,notices,flushes:0};
 const env={win:{},doc,nav:{serviceWorker:sw},session:{getItem:(k:string)=>session.get(k)??null,setItem:(k:string,v:string)=>session.set(k,v),removeItem:(k:string)=>session.delete(k)},t:(vi:string,en:string)=>en,
  isBusy:()=>state.busy,flush:async()=>{state.flushes++;log.push('flush')},report:(type:string,data:any)=>reports.push([type,data]),noticesEnabled:()=>state.notices,
  reload:()=>log.push('reload'),retire:()=>log.push('retire'),build:()=>build,online:()=>true,now:()=>clock,timers:t,on:()=>{}};
 const updater=ctx.createAppUpdater(env);
 const fire=(type:string)=>{for(const l of [...(swListeners[type]||[])]){l.fn();if(l.once)swListeners[type]=swListeners[type].filter((x:any)=>x!==l)}};
 const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve()};
 const advance=async(ms:number)=>{const end=clock+ms;for(;;){await flush();timers.sort((a,b)=>a.at-b.at);const next=timers[0];if(!next||next.at>end)break;timers.shift();clock=next.at;next.f()}clock=end;await flush()};
 return {updater,reg,log,reports,state,body,fire,advance,flush,session,notice:()=>body.querySelector('.app-update-notice'),overlay:()=>body.querySelector('.app-update-required')};
}
(async()=>{
 // Idle: the waiting worker is activated (after flushing) and the page reloads only on controllerchange.
 {const h=harness();h.updater.watch(h.reg);await h.flush();
  assert.deepEqual(h.log.filter(x=>x!=='update'),['flush','post:SKIP_WAITING'],'idle: flush, then activate');
  assert.equal(h.notice(),null,'no notice when idle');
  h.fire('controllerchange');assert.equal(h.log.filter(x=>x==='reload').length,1,'reload follows controllerchange');
  await h.advance(7000);assert.equal(h.log.filter(x=>x==='reload').length,1,'fallback does not reload twice');
  assert.deepEqual(h.reports.map((r:any)=>r[0]),['update.started','update.result']);assert.equal(h.reports[1][1].outcome,'success');}
 console.log('PASS idle update: flush → SKIP_WAITING → reload on controllerchange, once');
 // A worker that does not answer: reload after 6 s and report a timeout.
 {const h=harness();h.updater.watch(h.reg);await h.flush();await h.advance(5900);assert.ok(!h.log.includes('reload'));await h.advance(200);assert.ok(h.log.includes('reload'),'6 s fallback reload');assert.equal(h.reports.at(-1)[1].outcome,'timeout')}
 console.log('PASS 6 s fallback reload when controllerchange never comes');
 // Busy: a notice is offered (hidden while busy), shown again when idle; Update while busy does nothing.
 {const h=harness({busy:'form'});h.updater.watch(h.reg);await h.flush();
  const n=h.notice();assert.ok(n,'notice created');assert.equal(n.hidden,true,'hidden while editing');assert.ok(!h.log.includes('post:SKIP_WAITING'),'no activation while busy');
  await n.querySelector('.app-update-go').onclick();assert.ok(!h.log.includes('post:SKIP_WAITING'));assert.match(n.querySelector('.app-update-text').textContent,/Save or close/);
  h.state.busy='';await h.advance(600);assert.equal(n.hidden,false,'notice returns when not busy');assert.match(n.querySelector('.app-update-text').textContent,/new version/);
  const go=n.querySelector('.app-update-go');const a=go.onclick(),b=go.onclick();await a;await b;await h.flush();
  assert.equal(h.log.filter(x=>x==='post:SKIP_WAITING').length,1,'double tap activates once');
  assert.ok(h.log.indexOf('flush')<h.log.indexOf('post:SKIP_WAITING'),'data flushed before activation');
  assert.ok(!h.log.includes('reload'));h.fire('controllerchange');assert.equal(h.log.filter(x=>x==='reload').length,1)}
 console.log('PASS busy: notice steps aside, returns when idle; Update flushes first and is double-tap safe');
 // Unsaved local changes are never dropped by an update.
 {const h=harness({busy:'unsaved'});h.updater.watch(h.reg);await h.flush();const r=await h.updater.applyUpdate();assert.equal(r,false);assert.ok(!h.log.includes('post:SKIP_WAITING')&&!h.log.includes('reload'))}
 // Nothing waiting yet: ask for the new version, wait up to 8 s, then plain reload if none arrives.
 {const h=harness({waiting:false});h.updater.watch(h.reg);await h.flush();h.updater.offer();const p=h.updater.applyUpdate();await h.advance(8500);await p;assert.ok(h.log.includes('update'));assert.ok(h.log.includes('reload'));assert.ok(!h.log.includes('post:SKIP_WAITING'))}
 {const h=harness({waiting:false});h.updater.watch(h.reg);await h.flush();const p=h.updater.applyUpdate();await h.advance(1000);h.reg.waiting={postMessage:(m:any)=>h.log.push('post:'+m.type)};await h.advance(500);await p;assert.ok(h.log.includes('post:SKIP_WAITING'),'activates the version that arrived');assert.ok(!h.log.includes('reload'))}
 console.log('PASS unsaved changes block the update; Update asks for a new version and waits (8 s) before a plain reload');
 // Studio switch off: no notice for an ordinary update, but a missing part of the app still offers it.
 {const h=harness({busy:'form',notices:false});h.updater.watch(h.reg);await h.flush();assert.equal(h.notice(),null);h.updater.moduleGone('catalog');assert.ok(h.notice(),'module gone offers the update');assert.equal(h.notice().dataset.required,'1')}
 console.log('PASS notice switch respected; module-gone offers the update anyway');
 // Forced minimum build: blocking overlay (after the busy work), retries guarded, never an automatic loop.
 {const h=harness({waiting:false,controller:true});h.updater.watch(h.reg);await h.flush();
  assert.equal(h.updater.requireBuild('20261101T000000Z-aaaaaaaa'),false,'same build is not forced');assert.equal(h.updater.requireBuild('20251231T000000Z-bbbbbbbb'),false,'older minimum is ignored');assert.equal(h.overlay(),null);
  h.state.busy='form';assert.equal(h.updater.requireBuild('20261102T000000Z-cccccccc'),true);assert.equal(h.overlay(),null,'no overlay over an open edit');assert.ok(h.notice()?.dataset.required);
  h.state.busy='';await h.advance(600);const o=h.overlay();assert.ok(o,'overlay once idle');assert.equal(o.attrs.role,'alertdialog');assert.equal(h.notice(),null);
  assert.ok(!h.log.includes('reload'),'the overlay never reloads by itself');
  const go=o.querySelector('.app-update-go');assert.equal(go.textContent,'Update');const p=go.onclick();await h.advance(9000);await p;assert.equal(h.session.get('bep-update-attempts'),'1');assert.ok(h.log.includes('reload'))}
 {const h=harness({waiting:false});h.session.set('bep-update-attempts','2');h.updater.watch(h.reg);await h.flush();h.updater.requireBuild('20261102T000000Z-cccccccc');const o=h.overlay();
  assert.equal(o.querySelector('.app-update-go').textContent,'Retry');assert.ok(o.querySelector('.app-update-hint'),'support hint after two failed attempts');assert.ok(h.reports.some((r:any)=>r[0]==='update.result'&&r[1].outcome==='blocked'));
  await o.querySelector('.app-update-go').onclick();await h.flush();assert.ok(h.log.includes('retire'),'third attempt retires the worker (data kept)');assert.ok(!h.log.includes('reload'));
  h.updater.requireBuild('');assert.equal(h.overlay(),null,'withdrawn requirement removes the overlay')}
 console.log('PASS forced minimum build: overlay after busy work, single Update, attempt counter, Retry + hint, no loop');
})().catch(e=>{console.error(e);process.exit(1)});
