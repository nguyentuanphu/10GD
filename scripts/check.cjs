const fs=require('node:fs'),{execFileSync}=require('node:child_process');
for(const file of fs.readdirSync('dist').filter(f=>f.endsWith('.js')))execFileSync(process.execPath,['--check','dist/'+file],{stdio:'inherit'});
for(const directory of ['netlify/functions','netlify/lib'])for(const file of fs.readdirSync(directory).filter(f=>f.endsWith('.mjs')))execFileSync(process.execPath,['--check',directory+'/'+file],{stdio:'inherit'});
JSON.parse(fs.readFileSync('dist/manifest.webmanifest'));console.log('All application scripts and manifest checked.');
