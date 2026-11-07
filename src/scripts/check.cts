const fs=require('node:fs'),{execFileSync}=require('node:child_process');
for(const file of fs.readdirSync('dist').filter(f=>f.endsWith('.js')))execFileSync(process.execPath,['--check','dist/'+file],{stdio:'inherit'});
for(const directory of ['netlify/functions','netlify/lib','netlify/edge-functions'])for(const file of fs.readdirSync(directory).filter(f=>/\.(mjs|js)$/.test(f)))execFileSync(process.execPath,['--check',directory+'/'+file],{stdio:'inherit'});
JSON.parse(fs.readFileSync('dist/manifest.webmanifest'));console.log('All application scripts and manifest checked.');
const sw=fs.readFileSync('dist/sw.js','utf8'),assetBlock=sw.match(/const ASSETS\s*=\s*(\[[^;]+\]);/);
if(!assetBlock)throw Error('Missing service worker precache');
for(const match of assetBlock[1].matchAll(/['"]\.\/([^'"]*)['"]/g)){const path='dist/'+(match[1]||'index.html');if(!fs.existsSync(path))throw Error('Missing offline asset: '+path)}
for(const name of ['ingredients-v1.webp','ingredients-v2.webp','ingredients-v3.webp','dishes-v1.webp']){const bytes=fs.readFileSync('dist/artwork/'+name);if(bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WEBP')throw Error('Invalid artwork encoding: '+name)}
console.log('All offline assets and artwork files verified.');

// Netlify Edge runs JavaScript as ES modules. Syntax checks alone accept CommonJS
// output, which then fails in Deno with "exports is not defined". Execute in ESM
// mode with the actual relative imports before shipping the generated entry.
for(const file of fs.readdirSync('netlify/edge-functions').filter(f=>f.endsWith('.js'))){
 execFileSync(process.execPath,['--input-type=module','--eval',fs.readFileSync('netlify/edge-functions/'+file,'utf8')],{cwd:require('node:path').resolve('netlify/edge-functions'),stdio:'inherit'});
}
console.log('Edge entry points executed as ES modules.');
{const vm=require('node:vm'),ctx=vm.createContext({});vm.runInContext(fs.readFileSync('dist/master-catalog.js','utf8')+';this.n=MASTER_CATALOG.items.length',ctx);if(ctx.n<120)throw Error('Price Scout catalog too small');if(!fs.existsSync('netlify/functions/grocery.mjs')||!fs.existsSync('netlify/functions/grocery-cron.mjs'))throw Error('Price Scout functions missing');console.log('Price Scout catalog ('+ctx.n+' items) and functions verified.')}
// Startup order guard: scripts that run before language.js must not read `appLanguage`
// (declared there) without a `typeof` check, or account startup can crash with
// "appLanguage is not defined" depending on network timing.
{
 const order: string[] = JSON.parse(fs.readFileSync('src/frontend/bootstrap.ts', 'utf8').match(/const scripts = (\[[^;]+\]);/)![1].replace(/'/g, '"'));
 const before = order.slice(0, order.indexOf('language.js'));
 const bad: string[] = [];
 for (const name of before) {
  // recipe-catalog-core.js is generated from the catalog helpers and the lazy catalog loader.
  const files = name === 'recipe-catalog-core.js' ? ['src/frontend/recipe-catalog.ts', 'src/frontend/catalog-loader.ts'] : ['src/frontend/' + name.replace(/\.js$/, '.ts')];
  if (!files.every(file => fs.existsSync(file))) continue; // generated data scripts (e.g. master-catalog.js)
  const source = files.map(file => fs.readFileSync(file, 'utf8')).join('\n');
  const unguarded = source.replace(/typeof appLanguage\s*!==?\s*'undefined'\s*(?:&&|\?)\s*appLanguage/g, '').match(/\bappLanguage\b/g);
  if (unguarded) bad.push(name + ' (' + unguarded.length + ')');
 }
 if (bad.length) throw Error('Unguarded appLanguage before language.js: ' + bad.join(', '));
 console.log('Startup order: no unguarded language reads before language.js.');
}

// v1.6 bandwidth: lite precache budget, lazy catalog outside the startup pack, and per-cell artwork thumbnails.
{
 const zlib=require('node:zlib'),vm=require('node:vm'),crypto=require('node:crypto');
 const assets=[...sw.match(/const ASSETS\s*=\s*(\[[^;]+\]);/)![1].matchAll(/['"]\.\/([^'"]*)['"]/g)].map(m=>m[1]||'index.html');
 if(assets.some(a=>a.startsWith('artwork/')))throw Error('Artwork must not be in the lite precache list');
 if(assets.some(a=>a.startsWith('downloads/')))throw Error('Downloads (the FamTray Scout zip) must not be precached');
 if(!/pathname\.startsWith\('\/downloads\/'\)\)\s*return;/.test(sw))throw Error('The service worker must pass /downloads/ straight to the network');
 const wire=[...new Set(assets)].reduce((total,f)=>{const bytes=fs.readFileSync('dist/'+f);return total+(/\.(js|json|css|html|svg|webmanifest)$/.test(f)?zlib.gzipSync(bytes).length:bytes.length)},0);
 if(wire>1.5*1024*1024)throw Error('Lite precache is '+wire+' bytes on the wire; budget 1.5 MB (plus this week\'s artwork cells)');
 const pack=JSON.parse(fs.readFileSync('dist/startup-scripts.json','utf8'));
 if(pack.scripts.some((s:{name:string;code:string})=>s.name==='recipe-catalog.js'||/const PLANT_RECIPES=/.test(s.code)))throw Error('Reference catalog data must not be in the startup pack');
 const core=pack.scripts.find((s:{name:string})=>s.name==='recipe-catalog-core.js');
 if(!core||!/function recipeDiet/.test(core.code)||!/function ensureCatalog/.test(core.code)||/__BEP_CATALOG_HASH__/.test(core.code))throw Error('Catalog helpers/loader missing from the startup pack');
 const packs=JSON.parse(fs.readFileSync('dist/offline-packs.json','utf8'));
 if(!core.code.includes(packs.catalogHash)||!sw.includes(packs.catalogHash))throw Error('Catalog hash mismatch between loader, worker and packs');
 const manifest=JSON.parse(fs.readFileSync('dist/artwork/cells/manifest.json','utf8'));
 for(const [sheet,hash] of Object.entries(manifest.sheets as Record<string,string>)){const actual=crypto.createHash('sha256').update(fs.readFileSync('dist/artwork/'+sheet+'.webp')).digest('hex').slice(0,16);if(actual!==hash)throw Error('Artwork sheet '+sheet+' changed; run python3 src/scripts/artwork-cells.py to regenerate list thumbnails')}
 const ctx=vm.createContext({foodArt:()=>'',appLanguage:'vi',normalizeText:(t:string)=>String(t).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase(),esc:(t:string)=>String(t)});
 vm.runInContext(['seed','recipe-catalog','dish-composition','artwork'].map(f=>fs.readFileSync('dist/'+f+'.js','utf8')).join('\n')+'\nthis.paths=[...RECIPES.map(dishArtCellPath),...Object.keys(INGREDIENTS).map(ingredientArtCellPath)].filter(Boolean)',ctx);
 for(const p of new Set(ctx.paths as string[])){const bytes=fs.readFileSync('dist/'+p);if(bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WEBP')throw Error('Invalid artwork cell: '+p)}
 console.log('Lite precache '+(wire/1024).toFixed(0)+' KB on the wire; catalog lazy ('+packs.catalogHash+'); '+new Set(ctx.paths).size+' artwork cells verified.');
}
// v1.7.11 (owner, 7 Nov 2026: “Rules là tất cả viết bằng ts, tại sao tôi vẫn thấy viết bằng js?”): every script is written in
// TypeScript. JavaScript only exists as build output (dist/, tests/, netlify/, scripts/ — not tracked). Fail when a hand-written
// .js/.cjs/.mjs file is tracked or a page carries an inline <script> instead of a compiled TypeScript file.
{const tracked=execFileSync('git',['ls-files'],{encoding:'utf8'}).split('\n').filter(Boolean);
 const js=tracked.filter((f:string)=>/\.(js|cjs|mjs|jsx)$/.test(f));if(js.length)throw Error('Hand-written JavaScript is tracked — write it in TypeScript: '+js.join(', '));
 const inline=tracked.filter((f:string)=>/^(dist|extension)\/.*\.html$/.test(f)&&/<script(?![^>]*\bsrc=)[^>]*>/i.test(fs.readFileSync(f,'utf8')));if(inline.length)throw Error('Inline <script> in '+inline.join(', ')+' — move it to a TypeScript file');
 console.log('All scripts are TypeScript: no hand-written JavaScript tracked, no inline page scripts.')}
