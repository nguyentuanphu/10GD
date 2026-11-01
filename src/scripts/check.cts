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
  const file = 'src/frontend/' + name.replace(/\.js$/, '.ts');
  if (!fs.existsSync(file)) continue; // generated data scripts (e.g. master-catalog.js)
  const source = fs.readFileSync(file, 'utf8');
  const unguarded = source.replace(/typeof appLanguage\s*!==?\s*'undefined'\s*(?:&&|\?)\s*appLanguage/g, '').match(/\bappLanguage\b/g);
  if (unguarded) bad.push(name + ' (' + unguarded.length + ')');
 }
 if (bad.length) throw Error('Unguarded appLanguage before language.js: ' + bad.join(', '));
 console.log('Startup order: no unguarded language reads before language.js.');
}
