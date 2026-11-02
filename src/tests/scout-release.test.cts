// v1.7 "no-command install": the production build (npm run build:production, the
// hosting build command) ships the FamTray Scout extension zip with the app address
// baked in from the hosting build's site URL, plus a Web Store zip without the pinned
// key. The zip is served as application/zip and never precached by the service worker.
// The netlify.toml `ignore` rule (AGENTS.md rule 18) must stay intact.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,existsSync} from 'node:fs';
import {inflateRawSync} from 'node:zlib';
import {createHash} from 'node:crypto';

function unzip(file:string){const buf=readFileSync(file),files:Record<string,Buffer>={};
 const end=buf.lastIndexOf(Buffer.from([0x50,0x4b,0x05,0x06]));assert.ok(end>0,'zip end record');
 const count=buf.readUInt16LE(end+10);let p=buf.readUInt32LE(end+16);
 for(let i=0;i<count;i++){assert.equal(buf.readUInt32LE(p),0x02014b50,'central directory entry');const method=buf.readUInt16LE(p+10),size=buf.readUInt32LE(p+20),nameLen=buf.readUInt16LE(p+28),extra=buf.readUInt16LE(p+30),comment=buf.readUInt16LE(p+32),off=buf.readUInt32LE(p+42);const name=buf.toString('utf8',p+46,p+46+nameLen);
  const lh=off,start=lh+30+buf.readUInt16LE(lh+26)+buf.readUInt16LE(lh+28),data=buf.subarray(start,start+size);files[name]=method===8?inflateRawSync(data):data;p+=46+nameLen+extra+comment}
 return files}

const origin='https://famtray-release.example';
const env={...process.env,URL:origin+'/',SCOUT_SERVER_ORIGIN:'',SCOUT_APP_ORIGINS:'https://kitchen-alias.example, http://insecure.example, not a url'};
execFileSync('npm',['run','build:production'],{stdio:'inherit',env});

// 1. The served zip and both build zips exist.
for(const f of ['dist/downloads/famtray-scout.zip','dist-extension.zip','dist-extension-store.zip'])assert.ok(existsSync(f),f+' exists after the production build');
assert.deepEqual(readFileSync('dist/downloads/famtray-scout.zip'),readFileSync('dist-extension.zip'),'served zip is the built zip');
const z=unzip('dist/downloads/famtray-scout.zip'),store=unzip('dist-extension-store.zip');
// v1.7.1: bundled package — one script per extension context, CSS inlined, one icon (owner: fewer files).
assert.deepEqual(Object.keys(z).sort(),['background.js','content.js','icon.png','manifest.json','options.html','popup.html','runner.html','ui.js'],'bundled package: exactly 8 files');
for(const f of ['popup.html','options.html','runner.html']){const h=z[f].toString();assert.match(h,/<script src="ui\.js"><\/script>/,f+' loads the one page script');assert.equal((h.match(/<script/g)||[]).length,1,f+' has one script');assert.ok(!h.includes('ui.css')&&h.includes('<style>'),f+' has its CSS inlined')}
assert.ok(!z['background.js'].toString().includes('importScripts('),'background worker is self-contained');
const m=JSON.parse(z['manifest.json'].toString());
assert.ok(m.key,'download zip keeps the pinned key (stable id for unpacked installs)');
assert.deepEqual(m.externally_connectable,{matches:[origin+'/*','https://kitchen-alias.example/*']},'only the https app origins may talk to the extension');
assert.ok(!JSON.stringify(m).includes('localhost')&&!JSON.stringify(m).includes('scout.test'),'no test hosts in the production manifest');
const build=z['background.js'].toString();for(const f of ['content.js','ui.js'])assert.match(z[f].toString(),/globalThis\.SCOUT_BUILD=Object\.freeze\(/,f+' embeds the build info');
assert.match(build,new RegExp('"server":"'+origin.replace(/[.]/g,'\\.')+'"'),'app address baked in from the hosting site URL');
assert.match(build,/"test":false/);assert.match(build,/"testAppHosts":\[\]/);
const sm=JSON.parse(store['manifest.json'].toString());
assert.equal(sm.key,undefined,'Web Store zip has no key (the store assigns its own id)');
assert.deepEqual({...sm},(({key,...rest})=>rest)(m),'Web Store manifest is otherwise identical');
assert.deepEqual(Object.keys(store).sort(),Object.keys(z).sort(),'Web Store zip has the same files');
// v1.7.2 update check: the build writes what the update banner offers, and it matches the zip and the server's announced version.
{const info=JSON.parse(readFileSync('dist/downloads/famtray-scout.json','utf8')),zipBuf=readFileSync('dist/downloads/famtray-scout.zip');
 assert.equal(info.version,m.version,'update info names the zipped version');assert.equal(info.version,JSON.parse(readFileSync('extension/manifest.json','utf8')).version);
 assert.equal(info.zip,'/downloads/famtray-scout.zip');assert.equal(info.bytes,zipBuf.length);assert.equal(info.sha256,createHash('sha256').update(zipBuf).digest('hex'),'checksum of the served zip');
 assert.equal(/EXTENSION_VERSION='([^']+)'/.exec(readFileSync('src/netlify/lib/scout-version.mts','utf8'))![1],m.version,'server EXTENSION_VERSION = zipped manifest version');
 assert.equal(m.key,JSON.parse(readFileSync('extension/manifest.json','utf8')).key,'pinned key unchanged: updating the unpacked folder keeps the same id, storage and pairing');}
console.log('PASS production build ships dist/downloads/famtray-scout.zip (app address + externally_connectable from URL) and dist-extension-store.zip (no key)');

// 2. Never precached; bypassed by the worker; served as a zip download.
const sw=readFileSync('dist/sw.js','utf8'),assets=sw.match(/const ASSETS\s*=\s*(\[[^;]+\]);/)![1];
assert.ok(!/downloads/.test(assets),'zip not in the precache list');
assert.match(sw,/pathname\.startsWith\('\/downloads\/'\)\)\s*return;/,'worker passes /downloads/ to the network');
const toml=readFileSync('netlify.toml','utf8');
assert.match(toml,/command = "npm run build:production"/,'hosting build runs the production build');
assert.match(toml,/for = "\/downloads\/\*\.zip"\s*\[headers\.values\]\s*Content-Type = "application\/zip"\s*Content-Disposition = "attachment"/,'zip served as application/zip attachment');
assert.ok(toml.includes(`ignore = "bash -c '[ \\"$CONTEXT\\" != \\"production\\" ] && ! git log -1 --pretty=%B | grep -qF \\"[netlify-preview]\\"'"`),'rule 18 ignore rule unchanged');
const pkg=JSON.parse(readFileSync('package.json','utf8'));
assert.match(pkg.scripts['build:production'],/^npm run check && /,'production build still runs every check');
assert.ok(pkg.scripts['test:all'].split('&&').map((s:string)=>s.trim()).includes('npm run test:scout-release'),'suite runs in CI (test:all)');
console.log('PASS zip never precached, bypassed by the service worker, served as application/zip; ignore rule intact');

// 3. Without a hosting URL the build still works: no address baked in, no page connection.
execFileSync(process.execPath,['scripts/build-extension.cjs'],{stdio:'inherit',env:{...process.env,URL:'',SCOUT_SERVER_ORIGIN:'',SCOUT_APP_ORIGINS:''}});
const plain=unzip('dist-extension.zip'),pm=JSON.parse(plain['manifest.json'].toString());
assert.equal(pm.externally_connectable,undefined,'no externally_connectable without an app origin');
assert.match(plain['background.js'].toString(),/"server":""/);
console.log('PASS build without a hosting URL: manual address + code path only');
