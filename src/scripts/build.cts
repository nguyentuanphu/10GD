import { cpSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
// Remove the retired shared-password module from earlier generated builds.
for(const directory of ['.compiled/netlify/lib','netlify/lib'])for(const suffix of ['.mjs','.mjs.map'])rmSync(directory+'/session'+suffix,{force:true});
// Inline the compiled login client so even an older authenticated service worker
// cannot block the script needed to sign in. Escaping prevents HTML termination.
const loginCode=readFileSync('dist/login.js','utf8').replace(/\/\/# sourceMappingURL=.*$/gm,'').replace(/<\/script/gi,'<\\/script');
if(!loginCode.trim())throw new Error('Login client is missing');
writeFileSync('.compiled/netlify/lib/login-client.mjs','export const loginClient = '+JSON.stringify(loginCode)+';\n');
// Keep public/backend/test paths stable so existing URLs and test fixtures continue working.
for (const [from, to] of [['netlify', 'netlify'], ['tests', 'tests'], ['scripts', 'scripts']]) {
  mkdirSync(to, { recursive: true });
  cpSync(`.compiled/${from}`, to, { recursive: true });
}

// Keep a single authenticated download while preserving separate classic-script
// execution scopes and the startup entry's exact dependency order.
const startup = readFileSync('src/frontend/bootstrap.ts', 'utf8');
const list = startup.match(/const scripts = (\[[^;]+\]);/);
if (!list) throw new Error('Startup script order is missing');
const names = [...list[1].matchAll(/'([^']+\.js)'/g)].map(match => match[1]);
if (!names.length) throw new Error('Startup script list is empty');
writeFileSync('dist/startup-scripts.json', JSON.stringify({version: 1, scripts: names.map(name => ({name, code: readFileSync('dist/' + name, 'utf8')}))}));
