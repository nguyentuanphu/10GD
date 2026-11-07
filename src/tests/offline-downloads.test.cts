// v1.6 lazy catalog guards (recipe-catalog-core.js) and the Downloads manager (offline-downloads.js) in VM harnesses.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=(f:string)=>fs.readFileSync('dist/'+f,'utf8');
(async()=>{
// ---------- 1. Lazy catalog: family data works without it; mixed-version safety ----------
{
 const c=vm.createContext({console,Intl,Date,Math,URL,structuredClone,crypto:require('node:crypto').webcrypto,setTimeout,clearTimeout,AbortController,fetch:async()=>{throw TypeError('offline')},window:{addEventListener(){},dispatchEvent(){}},Event:class{constructor(public type:string){}},globalThis:undefined as any});
 c.globalThis=c;
 for(const f of ['seed.js','recipe-catalog-core.js','core.js','spending-core.js','purchase-units.js','planning-core.js','insights-core.js','family-menu-core.js','availability-core.js','personal-core.js'])vm.runInContext(read(f),c);
 assert.equal(vm.runInContext('catalogLoaded()',c),false,'startup pack has no reference data');
 const seedCount=vm.runInContext('RECIPES.length',c);assert.ok(seedCount<120,'only seed recipes before the catalog: '+seedCount);
 // Diet/labels helpers are available without the catalog.
 assert.equal(vm.runInContext("recipeDiet({ingredients:[{id:'tofu'},{id:'rice'}]})",c),'vegan');
 vm.runInContext('installCatalogGuards()',c);
 // A household created before the catalog arrives is marked so every app version adds the reference recipes itself.
 const fresh=vm.runInContext('newHouseholdState()',c);assert.equal(fresh.seedVersion,2);assert.equal(fresh.recipes.length,seedCount);
 assert.equal(vm.runInContext('upgradeReferenceCatalog',c)(fresh),0);assert.equal(fresh.seedVersion,2,'not marked complete without the catalog');assert.deepEqual(fresh.deletedRecipeIds||[],[],'no reference recipe tombstoned');
 // A family's own recipes and planned meals need no catalog; nothing is removed or tombstoned.
 const own={id:'fam-1',name:'Canh chua nhà bà',custom:true,origin:'family',category:'soup',protein:'fish',time:30,ingredients:[{id:'fish',qty:500}],steps:['Nấu']};
 const existing={...vm.runInContext('clone(defaults())',c),seedVersion:5,appEdition:5,recipes:[own,...vm.runInContext('clone(RECIPES)',c)]};
 vm.runInContext('upgradeReferenceCatalog',c)(existing);assert.ok(existing.recipes.some((r:any)=>r.id==='fam-1'),'family recipe kept');assert.equal(existing.seedVersion,5/* v1.7.5: retiring waits until the catalogue data has loaded */);assert.ok(!(existing.deletedRecipeIds||[]).length,'nothing tombstoned');
 // Family sync never uploads a pre-catalog household.
 let synced=0;c.syncFamilyState=async()=>{synced++};c.state=fresh;vm.runInContext('installCatalogSyncGuard()',c);await vm.runInContext('syncFamilyState()',c);assert.equal(synced,0,'pre-catalog state not uploaded');
 // Catalog arrives: the reference recipes are added once and the state is complete; family deletions are respected.
 vm.runInContext(read('recipe-catalog-data.js'),c);assert.equal(vm.runInContext('catalogLoaded()',c),true);
 fresh.deletedRecipeIds=['family-v3-1'];const added=vm.runInContext('upgradeReferenceCatalog',c)(fresh);
 assert.equal(fresh.seedVersion,7/* v1.7.10 catalogue edition */);assert.ok(added>=60/* v1.7.10: the recognised Western + plant recipes join a pre-catalogue state */,'added '+added);assert.ok(!fresh.recipes.some((r:any)=>r.id==='family-v3-1'),'deleted reference recipe stays deleted');
 assert.equal(fresh.recipes.length,vm.runInContext('RECIPES.length',c)-1);
 await vm.runInContext('syncFamilyState()',c);assert.equal(synced,1,'complete state syncs');
 // After the catalog: a fresh household is complete at once.
 assert.equal(vm.runInContext('newHouseholdState()',c).seedVersion,7/* v1.7.10 catalogue edition */);
 console.log('PASS lazy catalog: helpers without data, pre-catalog households marked and never synced, upgrade adds '+added+' reference recipes once, family recipes and deletions kept');
}
// ---------- 2. Downloads manager: Wi-Fi gating, resumable downloads, remove, storage ----------
{
 const stores=new Map<string,Map<string,any>>();
 const cacheFor=(n:string)=>{if(!stores.has(n))stores.set(n,new Map());const m=stores.get(n)!;return{match:async(k:string)=>m.has(k)?new Response(m.get(k)):undefined,put:async(k:string,v:Response)=>{m.set(k,await v.arrayBuffer())},keys:async()=>[...m.keys()]}};
 const manifest={version:1,catalogHash:'abc',catalogCount:740,art:{files:[['artwork/cells/d1.webp',100],['artwork/cells/d2.webp',200],['artwork/cells/i3.webp',300]],bytes:600,transfer:600},sheets:{files:[['artwork/dishes-v1.webp',1000]],bytes:1000,transfer:1000},catalog:{files:[['recipe-catalog-data.js?v=abc',5000]],bytes:5000,transfer:700},ocr:{common:{files:[['vendor/tesseract/tesseract.min.js',10]],bytes:10},simd:{files:[['vendor/tesseract/core/tesseract-core-simd-lstm.wasm.js',20]],bytes:20},plain:{files:[['vendor/tesseract/core/tesseract-core-lstm.wasm.js',21]],bytes:21}},priceScout:{files:[['master-catalog.js',50]],bytes:50,transfer:9}};
 const fetched:string[]=[];let failOnce=new Set<string>();
 const local=new Map<string,string>(),session=new Map<string,string>(),toasts:string[]=[];let asked=0,answer=true;
 const nav:any={onLine:true,connection:{type:'cellular',addEventListener(){}},userAgent:'Mozilla/5.0 (Linux; Android 14) Mobile',maxTouchPoints:5,storage:{estimate:async()=>({usage:3*1024*1024,quota:500*1024*1024}),persist:async()=>true},serviceWorker:null};
 const c=vm.createContext({console,URL,Response,AbortController,DOMException,setTimeout,clearTimeout,Promise,JSON,Math,Date,Map,Set,Number,String,Error,WebAssembly,
  navigator:nav,localStorage:{getItem:(k:string)=>local.has(k)?local.get(k):null,setItem:(k:string,v:string)=>local.set(k,v),removeItem:(k:string)=>local.delete(k)},sessionStorage:{getItem:(k:string)=>session.get(k)??null,setItem:(k:string,v:string)=>session.set(k,v)},
  caches:{open:async(n:string)=>cacheFor(n),delete:async(n:string)=>stores.delete(n)},
  fetch:async(u:string,o:any={})=>{fetched.push(u);if(u==='offline-packs.json')return new Response(JSON.stringify(manifest),{headers:{'content-type':'application/json'}});if(failOnce.has(u)){failOnce.delete(u);throw TypeError('network')}assert.equal(o.headers?.['x-bep-download'],'1','downloads bypass the worker caches');return new Response(new Uint8Array(4))},
  document:{addEventListener(){},querySelector:()=>null},window:{addEventListener(){}},
  $:()=>null,$$:()=>[],esc:(s:any)=>String(s),tr:(vi:string,en:string)=>en,toast:(m:string)=>toasts.push(m),confirmDialog:async()=>{asked++;return answer},MASTER_CATALOG:{items:[]}});
 c.globalThis=c;vm.runInContext(read('offline-downloads.js'),c);
 const kind=(n:any)=>vm.runInContext('offlineConnectionKind',c)(n);
 assert.equal(kind({onLine:true,connection:{type:'wifi'}}),'wifi');assert.equal(kind({onLine:true,connection:{type:'cellular'}}),'cellular');assert.equal(kind({onLine:false}),'offline');
 assert.equal(kind({onLine:true,connection:{effectiveType:'4g',saveData:true}}),'cellular','Save-Data counts as metered');
 assert.equal(kind({onLine:true,userAgent:'Mozilla/5.0 (X11; Linux x86_64)',maxTouchPoints:0}),'wifi','desktop without the API: unmetered');
 assert.equal(kind({onLine:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)',maxTouchPoints:5}),'unknown','phone without the API: ask');
 const ids=()=>[...vm.runInContext('offlinePacks',c).keys()];assert.deepEqual(ids(),['art','sheets','catalog','ocr','price-scout']);
 assert.throws(()=>vm.runInContext('registerOfflinePack',c)({id:'Bad id!'}));
 vm.runInContext('registerOfflinePack',c)({id:'voice',label:'Offline voice',sizeBytes:42,status:async()=>({state:'none'}),download:async(p:any)=>{p(42,42)},remove:async()=>true});assert.ok(ids().includes('voice'),'other features register packs');
 const start=(id:string,o:any={})=>vm.runInContext('offlineStartDownload',c)(id,o);
 // Wi-Fi only (default ON) on mobile data: a large pack is queued, nothing is fetched.
 assert.equal(vm.runInContext('offlineWifiOnly()',c),true);
 await start('art');assert.deepEqual(JSON.parse(local.get('bep-offline-queue')!),['art']);assert.ok(!fetched.some(u=>u.includes('artwork')),'nothing downloaded on mobile data');
 // Small packs (catalog data) are not held back.
 await start('catalog');assert.ok(fetched.includes('/recipe-catalog-data.js?v=abc'));
 // Back on Wi-Fi: the queue resumes; one file fails and the download is resumable without refetching stored files.
 nav.connection.type='wifi';failOnce=new Set(['/artwork/cells/d2.webp','/artwork/cells/d2.webp']);
 const realSetTimeout=c.setTimeout;c.setTimeout=(f:any,ms:number)=>realSetTimeout(f,Math.min(ms,5));
 failOnce=new Set(['/artwork/cells/d2.webp']);
 await vm.runInContext('offlineStartDownload',c)('art',{now:true});
 const status=async(id:string)=>vm.runInContext('offlinePackStatus',c)(vm.runInContext('offlinePacks',c).get(id));
 assert.equal((await status('art')).state,'ready','retried file completes the pack');assert.equal(local.has('bep-offline-queue'),false,'queue cleared');
 const before=fetched.length;await start('art');assert.equal(fetched.length,before,'ready pack is not downloaded again');
 // A partial pack resumes with only the missing files.
 stores.get('bep-pack-art-v1')!.delete('/artwork/cells/i3.webp');assert.equal((await status('art')).state,'partial');
 const n0=fetched.length;await start('art');assert.deepEqual(fetched.slice(n0),['/artwork/cells/i3.webp'],'resume fetches only what is missing');
 // Unknown connection: asked once per session.
 nav.connection=undefined;nav.userAgent='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)';await start('sheets');assert.equal(asked,1);assert.equal((await status('sheets')).state,'ready');
 stores.delete('bep-pack-sheets-v1');await start('sheets');assert.equal(asked,1,'not asked twice in a session');
 // Wi-Fi only switched off: mobile data allowed.
 session.clear();nav.connection={type:'cellular',addEventListener(){}};local.set('bep-offline-wifi-only','0');stores.delete('bep-pack-sheets-v1');await start('sheets');assert.equal((await status('sheets')).state,'ready');
 // Offline: nothing starts and the family is told.
 nav.onLine=false;stores.delete('bep-pack-sheets-v1');const t0=toasts.length;await start('sheets');assert.equal((await status('sheets')).state,'none');assert.match(toasts.slice(t0).join(' '),/offline/i);nav.onLine=true;
 // Remove frees the pack; status works from caches (also offline).
 await vm.runInContext('offlineRemove',c)('art');assert.equal(stores.has('bep-pack-art-v1'),false);assert.equal((await status('art')).state,'none');
 assert.match(await vm.runInContext('offlineStorageText()',c),/Using 3\.0 MB · about 497 MB free/);
 assert.equal((await status('price-scout')).state,'builtin');
 // The OCR pack downloads exactly one core variant for this device.
 const ocr=vm.runInContext('offlineOcrFiles',c)(manifest);assert.equal(ocr.files.length,2);assert.equal(ocr.bytes,manifest.ocr.common.bytes+(ocr.files[1][0].includes('simd')?20:21));
 // v1.7.1: an 'unavailable' pack shows its own reason, never the misleading "Not available on this server".
 const st=(p:any,s:any)=>vm.runInContext('offlineStatusText',c)(p,s,null);
 assert.equal(st({id:'voice-local-small'},{state:'unavailable',reasonText:'Not enough memory (RAM) on this device for this pack.'}),'Not enough memory (RAM) on this device for this pack.');
 assert.equal(st({id:'x'},{state:'unavailable'}),'Not available on this server','server packs without a reason keep the old text');
 // A pack's beforeDownload warning (on-device speech on iPhone/iPad) can cancel before anything is fetched.
 let warned=0;vm.runInContext('registerOfflinePack',c)({id:'voice-warn',label:'Voice warn',sizeBytes:5,beforeDownload:async()=>{warned++;return false},status:async()=>({state:'none'}),download:async()=>{throw Error('must not download')}});
 await start('voice-warn',{now:true});assert.equal(warned,1);assert.ok(!vm.runInContext('offlineJobs',c).get('voice-warn')?.error,'declined: no download, no error');
 console.log('PASS downloads manager: connection heuristics, Wi-Fi-only queue + resume, ask-once on unknown, resumable/retry, remove, storage estimate, pack registration');
}
})().catch(e=>{console.error(e);process.exit(1)});
