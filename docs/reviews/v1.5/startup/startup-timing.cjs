// Startup timing bench. Run from the worktree root: node <this> [label]
// Serves dist/ through the real gate + account/family handlers (in-memory stores),
// throttles every response server-side (150 ms latency, 1.6 Mbit/s) so service
// worker fetches are throttled too, and additionally applies CDP page throttling.
const {createServer}=require('node:http');const {readFileSync}=require('node:fs');const {resolve,extname}=require('node:path');
const {chromium}=require(process.cwd()+'/node_modules/playwright');
const LAT=150,BPS=1.6e6/8;
async function main(){
 const root=process.cwd();
 const {createAccountsHandler}=await import(root+'/netlify/lib/accounts.mjs');
 const {createFamilyHandler}=await import(root+'/netlify/functions/family.mjs');
 const {createGate}=await import(root+'/netlify/lib/gate.mjs');
 const stores=new Map();let revision=0;
 function getStoreFn({name}){if(stores.has(name))return stores.get(name);const rows=new Map(),store={async get(k){return structuredClone(rows.get(k)?.data??null)},async getWithMetadata(k){return structuredClone(rows.get(k)??null)},async setJSON(k,data,o={}){const p=rows.get(k);if(o.onlyIfNew&&p||o.onlyIfMatch&&o.onlyIfMatch!==p?.etag)return{modified:false};const etag=String(++revision);rows.set(k,{data:structuredClone(data),etag});return{modified:true,etag}},async set(k,d,o){return this.setJSON(k,d,o)},async delete(k){rows.delete(k)},async *list({prefix=''}={}){yield{blobs:[...rows.keys()].filter(x=>x.startsWith(prefix)).map(key=>({key}))}}};stores.set(name,store);return store}
 const accounts=createAccountsHandler({getStoreFn,mailer:{configured:()=>false,send:async()=>{}}}),family=createFamilyHandler({getStoreFn}),gate=createGate();
 const mime={'.js':'application/javascript','.json':'application/json','.css':'text/css','.html':'text/html','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'};
 const dist=resolve('dist');let origin='';let throttle=true;
 const server=createServer(async(req,res)=>{try{const chunks=[];for await(const c of req)chunks.push(c);const body=Buffer.concat(chunks);const request=new Request(origin+req.url,{method:req.method,headers:req.headers,...(body.length?{body}:{})});const url=new URL(request.url);
  const response=await gate(request,{next:async()=>{if(url.pathname==='/.netlify/functions/accounts')return accounts(request);if(url.pathname==='/.netlify/functions/family')return family(request);const file=resolve(dist,url.pathname==='/'?'index.html':'.'+url.pathname);try{const data=readFileSync(file);return new Response(data,{headers:{'Content-Type':mime[extname(file)]||'application/octet-stream','ETag':'"'+data.length+'-'+require('node:crypto').createHash('sha1').update(data).digest('hex').slice(0,12)+'"'}})}catch{return new Response('',{status:404})}}});
  if(process.env.STATUS_DELAY&&url.pathname==='/.netlify/functions/family'&&url.searchParams.get('op')==='status')await new Promise(r=>setTimeout(r,+process.env.STATUS_DELAY));
  let buf=Buffer.from(await response.arrayBuffer());let status=response.status;const headers=Object.fromEntries(response.headers);
  if(headers.etag&&req.headers['if-none-match']===headers.etag&&req.method==='GET'){status=304;buf=Buffer.alloc(0)}
  if(throttle)await new Promise(r=>setTimeout(r,LAT));
  res.writeHead(status,headers);
  if(!throttle||!buf.length){res.end(buf);return}
  const slice=Math.ceil(BPS/20);for(let i=0;i<buf.length;i+=slice){res.write(buf.subarray(i,i+slice));if(i+slice<buf.length)await new Promise(r=>setTimeout(r,50))}res.end();}catch{try{res.end()}catch{}}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://kitchen.localhost:'+server.address().port;
 const browser=await chromium.launch({args:['--host-resolver-rules=MAP kitchen.localhost 127.0.0.1']});
 const call=async(op,body,cookie)=>accounts(new Request(origin+'/.netlify/functions/accounts?op='+op,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','x-nf-client-connection-ip':'bench',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)}));
 const reg=await call('register',{username:'benchqa',name:'Bench QA',password:'synthetic-bench-passphrase',trust:true});const cookie=reg.headers.get('set-cookie').split(';')[0];
 const cf=await call('create-family',{name:'Bench family'},cookie);if(!cf.ok)throw Error('create-family '+cf.status+' '+await cf.text());
 const eq=cookie.indexOf('=');
 const context=await browser.newContext({viewport:{width:375,height:812},serviceWorkers:'allow',reducedMotion:'reduce'});
 await context.addCookies([{name:cookie.slice(0,eq),value:cookie.slice(eq+1),domain:'kitchen.localhost',path:'/'}]);
 await context.addInitScript(()=>{try{localStorage.setItem('bep-account-present','yes')}catch{}});
 const page=await context.newPage();const cdp=await context.newCDPSession(page);
 await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:LAT,downloadThroughput:BPS,uploadThroughput:750e3/8});
 const measure=async label=>{const t0=Date.now();await page.goto(origin+'/',{waitUntil:'commit'});
  await page.waitForFunction(()=>(document.querySelector('#main')?.innerText?.length||0)>300&&!document.querySelector('#startup-progress'),null,{timeout:120000,polling:50});
  const t=Date.now()-t0;const sw=await page.evaluate(()=>!!navigator.serviceWorker.controller);const mode=await page.evaluate(()=>globalThis.BEP_SESSION?.mode+'/'+(globalThis.BEP_SESSION?.household?.id?'household':'none'));
  console.log(JSON.stringify({label,ms:t,sw,mode}));return t};
 const out={};
 if(process.env.SKELETON_SHOT){page.goto(origin+'/',{waitUntil:'commit'}).catch(()=>{});await page.waitForSelector('#startup-progress',{timeout:30000});await page.waitForTimeout(400);await page.screenshot({path:process.env.SKELETON_SHOT});await page.waitForFunction(()=>!document.querySelector('#startup-progress'),null,{timeout:120000});await context.clearCookies();await context.addCookies([{name:cookie.slice(0,eq),value:cookie.slice(eq+1),domain:'kitchen.localhost',path:'/'}]);}
 out.first=await measure('first visit (no SW, cold HTTP cache)');
 await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>!!navigator.serviceWorker.controller,null,{timeout:60000}).catch(()=>{});
 // Let the worker finish pre-caching under throttle.
 await page.waitForFunction(async()=>{const k=await caches.keys();for(const n of k){if(!n.startsWith('bep-family-v'))continue;const c=await caches.open(n);if(await c.match('/startup-scripts.json',{ignoreSearch:true}))return true}return false},null,{timeout:120000,polling:500});
 await page.waitForTimeout(3000);
 const rep=[];for(let i=0;i<3;i++)rep.push(await measure('repeat visit #'+(i+1)+' (SW active)'));out.repeat=rep;
 console.log('SUMMARY '+process.argv[2]+' '+JSON.stringify(out));
 await browser.close();server.close();
}
main().catch(e=>{console.error(e);process.exit(1)});
