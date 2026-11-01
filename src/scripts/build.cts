import { cpSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
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
writeFileSync('dist/bootstrap.js', loader.replace(packHashPattern, `const packHash = '${hash}'`));
