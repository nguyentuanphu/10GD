// Builds the FamTray So Giá / Price Compare Chrome/Edge extension (Manifest V3).
//   node scripts/build-extension.cjs          → dist-extension/ + dist-extension.zip
//   node scripts/build-extension.cjs --test   → dist-extension-test/ (local test build only)
// tsc -p tsconfig.extension.json must run first (it writes the compiled .js into
// .compiled/extension/, which this script bundles). MV3 forbids remote code: the parser config is bundled as DATA in
// the bundled scripts and refreshed from the server as JSON only.
// The test build ONLY adds *.scout.test hosts (mapped to 127.0.0.1 by the browser
// test) and allows shorter pacing for fake timing; the production build never does.
// v1.7 (no-command install): the app address is baked in from SCOUT_SERVER_ORIGIN or,
// when unset, the hosting build's site URL (`URL`, set in production builds), so the
// production deploy build ships a pre-configured zip at dist/downloads/famtray-scout.zip.
// The same origin(s) go into `externally_connectable`, so the app page can ping the
// installed extension and hand it a one-time pairing code ("Pair now"). Extra app
// origins: SCOUT_APP_ORIGINS (comma separated, https only). The test build adds only
// localhost / kitchen.localhost / *.scout.test test hosts. A Web Store variant without
// the pinned `key` (the Web Store refuses it and assigns its own id) is written to
// dist-extension-store.zip.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const test=process.argv.includes('--test'),src='extension',compiled='.compiled/extension',out=test?'dist-extension-test':'dist-extension';
const manifest=JSON.parse(fs.readFileSync(src+'/manifest.json','utf8'));
const config=JSON.parse(fs.readFileSync(src+'/config/scout-config.json','utf8'));
const scripts=['scout-core.js','scout-parse.js','scout-client.js','ui-common.js','background.js','content.js','runner.js','popup.js','options.js'];
for(const f of scripts)if(!fs.existsSync(path.join(compiled,f)))throw new Error('Missing compiled extension script '+f+' (run tsc -p tsconfig.extension.json)');
// v1.7.1 (owner: "too many files"): the package is bundled into as few files as Chrome
// allows — one script per extension context (background worker, content script, the
// three pages share ui.js), CSS inlined into each page, the parser config and build info
// embedded in the scripts, one icon file. Always rebuilt from scratch: no stale files.
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
const httpsOrigin=(v:any)=>{try{const u=new URL(String(v||'').trim());return u.protocol==='https:'&&!u.username&&!u.password?u.origin:''}catch{return ''}};
const server=httpsOrigin(process.env.SCOUT_SERVER_ORIGIN)||httpsOrigin(process.env.URL);
const appOrigins=[...new Set([server,...String(process.env.SCOUT_APP_ORIGINS||'').split(',').map(httpsOrigin)].filter(Boolean))];
// Test hosts: the app pages the browser tests open (localhost is a secure context), plus
// other.scout.test, which is deliberately connectable but NOT in the extension's own
// allowlist, so the test proves onMessageExternal checks the sender origin itself.
const TEST_APP_HOSTS=['localhost','kitchen.localhost','app.scout.test'];
const matches=test?[...TEST_APP_HOSTS.map(h=>'http://'+h+'/*'),'http://other.scout.test/*',...appOrigins.map(o=>o+'/*')]:appOrigins.map(o=>o+'/*');
if(matches.length)manifest.externally_connectable={matches};
if(test){
 const hosts=['woolworths','coles','aldi','chemist','amazon'];
 manifest.name+=' (test build)';
 manifest.host_permissions.push('http://*.scout.test/*');
 manifest.content_scripts[0].matches.push('http://*.scout.test/*');
 for(const r of hosts)config.retailers[r].hosts.push(r+'.scout.test');
}
manifest.content_scripts[0].js=['content.js'];
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2));
const BUILD_INFO={test,version:manifest.version,configVersion:config.version,server,appOrigins,testAppHosts:test?TEST_APP_HOSTS:[],keepRunnerOpen:false};
const head="'use strict';\n// "+manifest.name+' '+manifest.version+' (bundled; parser config is data, never code)\n'
 +'globalThis.SCOUT_BUILD=Object.freeze('+JSON.stringify(BUILD_INFO)+');\n'
 +'globalThis.SCOUT_DEFAULT_CONFIG=Object.freeze('+JSON.stringify(config)+');\n';
const js=(f:string)=>fs.readFileSync(path.join(compiled,f),'utf8').replace(/^\s*importScripts\([^)]*\);?\s*$/m,'').replace(/^'use strict';\s*/,'');
const page=(name:string,f:string)=>`if(location.pathname==='/${name}.html'){\n${js(f)}\n}\n`;
const bundle=(file:string,parts:string[])=>fs.writeFileSync(path.join(out,file),head+parts.join('\n')+'\n');
bundle('background.js',[js('scout-core.js'),js('scout-client.js'),js('background.js')]);
bundle('content.js',[js('scout-core.js'),js('scout-parse.js'),js('content.js')]);
bundle('ui.js',[js('scout-core.js'),js('scout-parse.js'),js('scout-client.js'),js('ui-common.js'),page('popup','popup.js'),page('options','options.js'),page('runner','runner.js')]);
const css=fs.readFileSync(path.join(src,'pages','ui.css'),'utf8');
for(const f of fs.readdirSync(src+'/pages').filter(f=>f.endsWith('.html'))){let html=fs.readFileSync(path.join(src,'pages',f),'utf8');
 html=html.replace('<link rel="stylesheet" href="ui.css">','<style>\n'+css+'</style>');
 let first=true;html=html.replace(/<script src="[^"]+"><\/script>\n?/g,()=>{if(!first)return '';first=false;return '<script src="ui.js"></script>\n'});
 if(html.includes('ui.css')||!html.includes('<script src="ui.js">'))throw new Error('Could not bundle '+f);
 fs.writeFileSync(path.join(out,f),html)}
// ---- icons: a simple green lens, drawn as PNG without dependencies ----
function crc32(buf:Buffer){return zlib.crc32(buf)>>>0}
function chunk(type:string,data:Buffer){const len=Buffer.alloc(4);len.writeUInt32BE(data.length);const td=Buffer.concat([Buffer.from(type),data]);const c=Buffer.alloc(4);c.writeUInt32BE(crc32(td));return Buffer.concat([len,td,c])}
function icon(size:number){const raw=Buffer.alloc(size*(size*4+1));const c=size/2,r1=size*0.46,r2=size*0.30,r3=size*0.19;
 for(let y=0;y<size;y++){raw[y*(size*4+1)]=0;for(let x=0;x<size;x++){const d=Math.hypot(x+0.5-c,y+0.5-c),i=y*(size*4+1)+1+x*4;let px=[0,0,0,0];
  if(d<=r1)px=[31,122,77,255];if(d<=r2)px=[255,255,255,255];if(d<=r3)px=[31,122,77,255];raw.set(px,i)}}
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(size,0);ihdr.writeUInt32BE(size,4);ihdr[8]=8;ihdr[9]=6;ihdr[10]=0;ihdr[11]=0;ihdr[12]=0;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))])}
// One icon file for every size (Chrome scales the 128 px image down for the toolbar).
fs.writeFileSync(path.join(out,'icon.png'),icon(128));
const files=fs.readdirSync(out).sort();if(files.length>8)throw new Error('Extension package grew to '+files.length+' files: '+files.join(', '));
// ---- zip (deflate) for the production build ----
function zip(dir:string,file:string){const entries:Buffer[]=[],central:Buffer[]=[];let offset=0;
 for(const name of fs.readdirSync(dir).sort()){const data=fs.readFileSync(path.join(dir,name)),comp=zlib.deflateRawSync(data),crc=crc32(data),n=Buffer.from(name);
  const lh=Buffer.alloc(30);lh.writeUInt32LE(0x04034b50,0);lh.writeUInt16LE(20,4);lh.writeUInt16LE(0,6);lh.writeUInt16LE(8,8);lh.writeUInt16LE(0,10);lh.writeUInt16LE(0x21,12);lh.writeUInt32LE(crc,14);lh.writeUInt32LE(comp.length,18);lh.writeUInt32LE(data.length,22);lh.writeUInt16LE(n.length,26);lh.writeUInt16LE(0,28);
  entries.push(lh,n,comp);
  const ch=Buffer.alloc(46);ch.writeUInt32LE(0x02014b50,0);ch.writeUInt16LE(20,4);ch.writeUInt16LE(20,6);ch.writeUInt16LE(0,8);ch.writeUInt16LE(8,10);ch.writeUInt16LE(0,12);ch.writeUInt16LE(0x21,14);ch.writeUInt32LE(crc,16);ch.writeUInt32LE(comp.length,20);ch.writeUInt32LE(data.length,24);ch.writeUInt16LE(n.length,28);ch.writeUInt32LE(offset,42);
  central.push(ch,n);offset+=30+n.length+comp.length}
 const cd=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(central.length/2,8);end.writeUInt16LE(central.length/2,10);end.writeUInt32LE(cd.length,12);end.writeUInt32LE(offset,16);
 fs.writeFileSync(file,Buffer.concat([...entries,cd,end]))}
if(!test){zip(out,'dist-extension.zip');
 // Also served by the app (My kitchen → Pair this computer). The production deploy
 // build (npm run build:production) runs this. Generated only, never committed
 // (dist/downloads/ is gitignored) and never precached by the app's service worker.
 fs.mkdirSync('dist/downloads',{recursive:true});fs.copyFileSync('dist-extension.zip','dist/downloads/famtray-scout.zip');
 // Web Store / Edge Add-ons upload: same files, manifest without the pinned `key`.
 const store='dist-extension-store';fs.rmSync(store,{recursive:true,force:true});fs.mkdirSync(store);
 for(const f of fs.readdirSync(out))fs.copyFileSync(path.join(out,f),path.join(store,f));
 const {key:_key,...storeManifest}=manifest;fs.writeFileSync(path.join(store,'manifest.json'),JSON.stringify(storeManifest,null,2));
 zip(store,'dist-extension-store.zip')}
console.log('Price Check extension built: '+out+' ('+files.length+' files: '+files.join(' ')+')'+(test?' (test build)':' + dist-extension.zip + dist-extension-store.zip')+' · version '+manifest.version+' · config '+config.version+' · app address '+(server||'(none: typed by the user)')+(matches.length?' · connectable: '+matches.join(' '):''));
