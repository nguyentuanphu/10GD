const fs=require('node:fs'),{execFileSync}=require('node:child_process');
for(const file of fs.readdirSync('dist').filter(f=>f.endsWith('.js')))execFileSync(process.execPath,['--check','dist/'+file],{stdio:'inherit'});
for(const directory of ['netlify/functions','netlify/lib'])for(const file of fs.readdirSync(directory).filter(f=>f.endsWith('.mjs')))execFileSync(process.execPath,['--check',directory+'/'+file],{stdio:'inherit'});
JSON.parse(fs.readFileSync('dist/manifest.webmanifest'));console.log('All application scripts and manifest checked.');
const sw=fs.readFileSync('dist/sw.js','utf8'),assetBlock=sw.match(/const ASSETS=(\[[^;]+\]);/);
if(!assetBlock)throw Error('Missing service worker precache');
for(const match of assetBlock[1].matchAll(/['"]\.\/([^'"]*)['"]/g)){const path='dist/'+(match[1]||'index.html');if(!fs.existsSync(path))throw Error('Missing offline asset: '+path)}
for(const name of ['ingredients-v1.webp','dishes-v1.webp']){const bytes=fs.readFileSync('dist/artwork/'+name);if(bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WEBP')throw Error('Invalid artwork encoding: '+name)}
console.log('All offline assets and artwork files verified.');
