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
