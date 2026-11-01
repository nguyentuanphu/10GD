// Builds the FamTray Scout Chrome/Edge extension (Manifest V3).
//   node scripts/build-extension.cjs          → dist-extension/ + dist-extension.zip
//   node scripts/build-extension.cjs --test   → dist-extension-test/ (local test build only)
// tsc -p tsconfig.extension.json must run first (it writes the compiled .js into
// dist-extension/). MV3 forbids remote code: the parser config is bundled as DATA in
// default-config.js and refreshed from the server as JSON only.
// The test build ONLY adds *.scout.test hosts (mapped to 127.0.0.1 by the browser
// test) and allows shorter pacing for fake timing; the production build never does.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const test=process.argv.includes('--test'),src='extension',compiled='dist-extension',out=test?'dist-extension-test':'dist-extension';
const manifest=JSON.parse(fs.readFileSync(src+'/manifest.json','utf8'));
const config=JSON.parse(fs.readFileSync(src+'/config/scout-config.json','utf8'));
const scripts=['scout-core.js','scout-parse.js','scout-client.js','ui-common.js','background.js','content.js','runner.js','popup.js','options.js'];
for(const f of scripts)if(!fs.existsSync(path.join(compiled,f)))throw new Error('Missing compiled extension script '+f+' (run tsc -p tsconfig.extension.json)');
if(test){fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});for(const f of scripts)fs.copyFileSync(path.join(compiled,f),path.join(out,f))}
// Never ship stale files from older builds.
for(const f of fs.readdirSync(out))if(!scripts.includes(f)&&!fs.statSync(path.join(out,f)).isDirectory())fs.rmSync(path.join(out,f));
if(test){
 const hosts=['woolworths','coles','aldi','chemist','amazon'];
 manifest.name+=' (test build)';
 manifest.host_permissions.push('http://*.scout.test/*');
 manifest.content_scripts[0].matches.push('http://*.scout.test/*');
 for(const r of hosts)config.retailers[r].hosts.push(r+'.scout.test');
}
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2));
fs.writeFileSync(path.join(out,'default-config.js'),"'use strict';\nglobalThis.SCOUT_DEFAULT_CONFIG=Object.freeze("+JSON.stringify(config)+");\n");
fs.writeFileSync(path.join(out,'build-info.js'),"'use strict';\nglobalThis.SCOUT_BUILD=Object.freeze("+JSON.stringify({test,version:manifest.version,server:/^https:\/\//.test(process.env.SCOUT_SERVER_ORIGIN||'')?process.env.SCOUT_SERVER_ORIGIN:'',keepRunnerOpen:false})+");\n");
for(const f of fs.readdirSync(src+'/pages'))fs.copyFileSync(path.join(src,'pages',f),path.join(out,f));
// ---- icons: a simple green lens, drawn as PNG without dependencies ----
function crc32(buf:Buffer){return zlib.crc32(buf)>>>0}
function chunk(type:string,data:Buffer){const len=Buffer.alloc(4);len.writeUInt32BE(data.length);const td=Buffer.concat([Buffer.from(type),data]);const c=Buffer.alloc(4);c.writeUInt32BE(crc32(td));return Buffer.concat([len,td,c])}
function icon(size:number){const raw=Buffer.alloc(size*(size*4+1));const c=size/2,r1=size*0.46,r2=size*0.30,r3=size*0.19;
 for(let y=0;y<size;y++){raw[y*(size*4+1)]=0;for(let x=0;x<size;x++){const d=Math.hypot(x+0.5-c,y+0.5-c),i=y*(size*4+1)+1+x*4;let px=[0,0,0,0];
  if(d<=r1)px=[31,122,77,255];if(d<=r2)px=[255,255,255,255];if(d<=r3)px=[31,122,77,255];raw.set(px,i)}}
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(size,0);ihdr.writeUInt32BE(size,4);ihdr[8]=8;ihdr[9]=6;ihdr[10]=0;ihdr[11]=0;ihdr[12]=0;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))])}
for(const s of [16,32,48,128])fs.writeFileSync(path.join(out,`icon-${s}.png`),icon(s));
// ---- zip (deflate) for the production build ----
function zip(dir:string,file:string){const entries:Buffer[]=[],central:Buffer[]=[];let offset=0;
 for(const name of fs.readdirSync(dir).sort()){const data=fs.readFileSync(path.join(dir,name)),comp=zlib.deflateRawSync(data),crc=crc32(data),n=Buffer.from(name);
  const lh=Buffer.alloc(30);lh.writeUInt32LE(0x04034b50,0);lh.writeUInt16LE(20,4);lh.writeUInt16LE(0,6);lh.writeUInt16LE(8,8);lh.writeUInt16LE(0,10);lh.writeUInt16LE(0x21,12);lh.writeUInt32LE(crc,14);lh.writeUInt32LE(comp.length,18);lh.writeUInt32LE(data.length,22);lh.writeUInt16LE(n.length,26);lh.writeUInt16LE(0,28);
  entries.push(lh,n,comp);
  const ch=Buffer.alloc(46);ch.writeUInt32LE(0x02014b50,0);ch.writeUInt16LE(20,4);ch.writeUInt16LE(20,6);ch.writeUInt16LE(0,8);ch.writeUInt16LE(8,10);ch.writeUInt16LE(0,12);ch.writeUInt16LE(0x21,14);ch.writeUInt32LE(crc,16);ch.writeUInt32LE(comp.length,20);ch.writeUInt32LE(data.length,24);ch.writeUInt16LE(n.length,28);ch.writeUInt32LE(offset,42);
  central.push(ch,n);offset+=30+n.length+comp.length}
 const cd=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(central.length/2,8);end.writeUInt16LE(central.length/2,10);end.writeUInt32LE(cd.length,12);end.writeUInt32LE(offset,16);
 fs.writeFileSync(file,Buffer.concat([...entries,cd,end]))}
if(!test)zip(out,'dist-extension.zip');
console.log('FamTray Scout extension built: '+out+(test?' (test build)':' + dist-extension.zip')+' · version '+manifest.version+' · config '+config.version);
