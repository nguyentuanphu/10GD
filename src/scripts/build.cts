import { cpSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync, statSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
// Remove the retired shared-password module from earlier generated builds.
for(const directory of ['.compiled/netlify/lib','netlify/lib'])for(const suffix of ['.mjs','.mjs.map'])rmSync(directory+'/session'+suffix,{force:true});
// Inline the compiled login client so even an older authenticated service worker
// cannot block the script needed to sign in. Escaping prevents HTML termination.
const loginCode=readFileSync('dist/login.js','utf8').replace(/\/\/# sourceMappingURL=.*$/gm,'').replace(/<\/script/gi,'<\\/script');
if(!loginCode.trim())throw new Error('Login client is missing');
writeFileSync('.compiled/netlify/lib/login-client.mjs','export const loginClient = '+JSON.stringify(loginCode)+';\n');
writeFileSync('.compiled/netlify/lib/scout-config.mjs','export const scoutDefaultConfig = '+JSON.stringify(JSON.parse(readFileSync('extension/config/scout-config.json','utf8')))+';\n');// FamTray Scout bundled parser config (data only)
// Keep public/backend/test paths stable so existing URLs and test fixtures continue working.
for (const [from, to] of [['netlify', 'netlify'], ['tests', 'tests'], ['scripts', 'scripts']]) {
  mkdirSync(to, { recursive: true });
  cpSync(`.compiled/${from}`, to, { recursive: true });
}

// Price Scout master catalog: data/master-catalog.json is the source; ship it as a
// classic script inside the startup pack so it is available offline.
const catalog=JSON.parse(readFileSync('data/master-catalog.json','utf8'));
if(catalog.version!==1||!Array.isArray(catalog.items)||catalog.items.length<100)throw new Error('Master catalog is invalid');
writeFileSync('dist/master-catalog.js',"'use strict';\nglobalThis.MASTER_CATALOG=Object.freeze("+JSON.stringify(catalog)+");\n");

// v1.6 lazy reference catalog: dist/recipe-catalog.js (complete, used by tests, Studio and the artwork audit)
// is split at its marker into recipe-catalog-data.js (475 reference recipes since v1.7.5, fetched on demand) and small helpers
// that ship in the startup pack together with the loader as recipe-catalog-core.js.
const stripMap=(code:string)=>code.replace(/\/\/# sourceMappingURL=.*$/gm,'');
const fullCatalog=stripMap(readFileSync('dist/recipe-catalog.js','utf8'));
const marker=fullCatalog.indexOf('// ==== BEP startup helpers ====');
if(marker<0)throw new Error('Recipe catalog split marker is missing');
const catalogData=fullCatalog.slice(0,marker).trimEnd()+'\n';
if(!/RECIPES\.push\(\.\.\.PLANT_RECIPES\)/.test(catalogData))throw new Error('Recipe catalog data section is incomplete');
writeFileSync('dist/recipe-catalog-data.js',catalogData);
const catalogHash=createHash('sha256').update(catalogData).digest('hex').slice(0,16);
const loaderCode=stripMap(readFileSync('dist/catalog-loader.js','utf8'));
if(!loaderCode.includes('__BEP_CATALOG_HASH__'))throw new Error('Catalog loader hash placeholder is missing');
writeFileSync('dist/recipe-catalog-core.js',"'use strict';\n"+fullCatalog.slice(marker)+'\n'+loaderCode.replace("'use strict';",'').replace('__BEP_CATALOG_HASH__',catalogHash));
for(const f of ['dist/catalog-loader.js','dist/catalog-loader.js.map'])rmSync(f,{force:true});

let catalogCount=0;
// Painted artwork for reference recipes is matched by signature; record a hash per recipe so the art stays exact
// before the lazy catalog has loaded (see catalogArtMatches in artwork.ts).
{
 const vm=require('node:vm') as typeof import('node:vm');
 const ctx=vm.createContext({foodArt:()=>'',appLanguage:'vi',normalizeText:(t:string)=>String(t).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase(),esc:(t:string)=>String(t)});
 vm.runInContext(['seed','recipe-catalog','dish-composition','artwork'].map(f=>readFileSync('dist/'+f+'.js','utf8')).join('\n')+'\nthis.count=RECIPES.length;this.hashes=Object.fromEntries([...RECIPES,...(typeof RETIRED_REFERENCE_RECIPES==="undefined"?[]:RETIRED_REFERENCE_RECIPES)].filter(r=>Object.hasOwn(REVIEWED_DISH_ART,r.id)).map(r=>[r.id,artSignatureHash(dishArtSignature(r))]))',ctx);
 const artwork=readFileSync('dist/artwork.js','utf8'),placeholder=/const CATALOG_ART_HASHES\s*=\s*null;\s*\/\*__BEP_CATALOG_ART_HASHES__\*\//;
 if(!placeholder.test(artwork))throw new Error('Artwork hash placeholder is missing');
 // v1.7.5: the owner halved the Vietnamese reference recipes (740 → 475); every remaining recipe keeps its reviewed art
 if(Object.keys(ctx.hashes).length<470||Object.keys(ctx.hashes).length<ctx.count*0.95)throw new Error('Too few artwork hashes');
 catalogCount=ctx.count;
 writeFileSync('dist/artwork.js',artwork.replace(placeholder,'const CATALOG_ART_HASHES=Object.freeze('+JSON.stringify(ctx.hashes)+');'));
}

// Self-hosted OCR (tesseract.js, Apache-2.0; traineddata from tesseract-ocr/tessdata_best int, Apache-2.0)
// so the receipt/price camera can work offline once downloaded. Generated into dist/vendor (gitignored).
const vendorFiles:[string,string][]=[
 ['node_modules/tesseract.js/dist/tesseract.min.js','vendor/tesseract/tesseract.min.js'],
 ['node_modules/tesseract.js/dist/worker.min.js','vendor/tesseract/worker.min.js'],
 ['node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js','vendor/tesseract/core/tesseract-core-simd-lstm.wasm.js'],
 ['node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js','vendor/tesseract/core/tesseract-core-lstm.wasm.js'],
 ['node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz','vendor/tesseract/lang/eng.traineddata.gz'],
 ['node_modules/@tesseract.js-data/vie/4.0.0_best_int/vie.traineddata.gz','vendor/tesseract/lang/vie.traineddata.gz']];
const ocrAvailable=vendorFiles.every(([from])=>existsSync(from));
rmSync('dist/vendor/tesseract',{recursive:true,force:true});
if(ocrAvailable){
 for(const [from,to] of vendorFiles){mkdirSync('dist/'+to.slice(0,to.lastIndexOf('/')),{recursive:true});cpSync(from,'dist/'+to)}
 writeFileSync('dist/vendor/tesseract/LICENSES.txt','tesseract.js 5.0.0 and tesseract.js-core 5.0.0: Apache License 2.0 (https://github.com/naptha/tesseract.js).\nLanguage data eng/vie (4.0.0_best_int, via @tesseract.js-data): Apache License 2.0, tesseract-ocr/tessdata_best.\n\n'+readFileSync('node_modules/tesseract.js/LICENSE.md','utf8'));
}else console.warn('OCR vendor files missing (run npm ci); the camera reader will use the public CDN.');

// Offline download packs (Settings → Other settings → Downloads for offline use). Sizes are exact bytes.
{
 const size=(p:string)=>statSync('dist/'+p).size,gz=(p:string)=>gzipSync(readFileSync('dist/'+p),{level:6}).length;
 const list=(dir:string,filter:(f:string)=>boolean)=>readdirSync('dist/'+dir).filter(filter).sort().map(f=>dir+'/'+f);
 const pack=(files:string[],text=false)=>({files:files.map(f=>[f,size(f)]),bytes:files.reduce((a,f)=>a+size(f),0),transfer:files.reduce((a,f)=>a+(text?gz(f):size(f)),0)});
 const cells=list('artwork/cells',f=>f.endsWith('.webp')),sheets=[...list('artwork',f=>f.endsWith('.webp')),...list('artwork/corrections',f=>f.endsWith('.webp'))];
 const catalogPack=pack(['recipe-catalog-data.js'],true);catalogPack.files=[['recipe-catalog-data.js?v='+catalogHash,size('recipe-catalog-data.js')]];
 const ocr=ocrAvailable?{common:pack(['vendor/tesseract/tesseract.min.js','vendor/tesseract/worker.min.js','vendor/tesseract/lang/eng.traineddata.gz','vendor/tesseract/lang/vie.traineddata.gz']),simd:pack(['vendor/tesseract/core/tesseract-core-simd-lstm.wasm.js']),plain:pack(['vendor/tesseract/core/tesseract-core-lstm.wasm.js'])}:null;
 writeFileSync('dist/offline-packs.json',JSON.stringify({version:1,catalogHash,catalogCount,art:pack(cells),sheets:pack(sheets),catalog:catalogPack,ocr,priceScout:pack(['master-catalog.js'],true)}));
}

// Keep a single authenticated download while preserving separate classic-script
// execution scopes and the startup entry's exact dependency order.
const startup = readFileSync('src/frontend/bootstrap.ts', 'utf8');
const list = startup.match(/const scripts = (\[[^;]+\]);/);
if (!list) throw new Error('Startup script order is missing');
const names = [...list[1].matchAll(/'([^']+\.js)'/g)].map(match => match[1]);
if (!names.length) throw new Error('Startup script list is empty');
const packScripts = names.map(name => ({name, code: readFileSync('dist/' + name, 'utf8')}));
// The content hash lets the service worker answer from its cache when the loader
// expects exactly this pack. `hash` stays the second key so the worker can read it
// from the first bytes without parsing the whole pack.
const hash = createHash('sha256').update(JSON.stringify(packScripts)).digest('hex').slice(0, 20);
writeFileSync('dist/startup-scripts.json', JSON.stringify({version: 1, hash, scripts: packScripts}));
const loader = readFileSync('dist/bootstrap.js', 'utf8');
const packHashPattern = /const packHash = '[^']*'/;
if (!packHashPattern.test(loader)) throw new Error('Startup loader hash placeholder is missing');
// Sortable build id: UTC build time + pack hash. Studio can require every device to run at least this build.
const buildId = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z') + '-' + hash.slice(0, 8);
if (!loader.includes("'__BEP_BUILD_ID__'")) throw new Error('Startup loader build id placeholder is missing');
// v1.7.5: the release number (package.json) is shown in Settings and in Studio.
const appVersion = String(JSON.parse(readFileSync('package.json', 'utf8')).version || '');
if (!/^\d+\.\d+\.\d+$/.test(appVersion)) throw new Error('package.json version is missing');
if (!loader.includes("'__BEP_APP_VERSION__'")) throw new Error('Startup loader version placeholder is missing');
writeFileSync('dist/bootstrap.js', loader.replace(packHashPattern, `const packHash = '${hash}'`).replace("'__BEP_BUILD_ID__'", `'${buildId}'`).replace("'__BEP_APP_VERSION__'", `'${appVersion}'`));
// v1.7.2: `extension` = the Price Check extension version this release ships (Studio flags older computers).
// v1.7.5: Studio shows emoji as our drawings too; the drawings ride inside studio.js (no extra request before content)
{const studioJs=readFileSync('dist/studio.js','utf8');if(!studioJs.startsWith('/* emoji-art */'))writeFileSync('dist/studio.js','/* emoji-art */\n'+readFileSync('dist/emoji-art.js','utf8').replace(/\/\/# sourceMappingURL=.*$/gm,'')+'\n'+studioJs)}
writeFileSync('dist/build.json', JSON.stringify({version: appVersion, build: buildId, pack: hash, extension: JSON.parse(readFileSync('extension/manifest.json','utf8')).version}));

// The service worker keeps only the current catalog download (older versions are replaced on update).
const worker=readFileSync('dist/sw.js','utf8');
if(!worker.includes('__BEP_CATALOG_HASH__'))throw new Error('Service worker catalog placeholder is missing');
writeFileSync('dist/sw.js',worker.replace(/__BEP_CATALOG_HASH__/g,catalogHash));
