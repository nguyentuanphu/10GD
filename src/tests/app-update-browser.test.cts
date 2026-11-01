// Real service-worker update flow (modelled on Sparkle Valley tests/owner-update-notice.mjs). The app is served from a
// local http server on 127.0.0.2 (a loopback secure context that is not "localhost", so the app runs as deployed) and
// the worker's bytes are bumped between loads. Checks: idle → silent switch + reload; busy (edited form) → notice
// hidden while editing, shown after, Update reloads into the new worker; Studio minimum build → blocking overlay with a
// guarded retry; update events reach the Studio endpoint. 375/820/1280, VI/EN, screenshots in docs/reviews/v1.6/offline.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium } from 'playwright';
const root = path.resolve('dist'), shots = 'docs/reviews/v1.6/offline';
const mime: Record<string, string> = { '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp' };
let swVersion = 0, minBuild: string | null = null;
const events: any[] = [];
const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://x');
  if (url.pathname.startsWith('/.netlify/functions/studio')) {
    const op = url.searchParams.get('op');
    if (op === 'client-event' && req.method === 'POST') { let body = ''; req.on('data', c => body += c); req.on('end', () => { try { events.push(JSON.parse(body)); } catch { } res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":true}'); }); return; }
    if (op === 'banner') { res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify({ banner: null, maintenance: null, minAppEdition: null, updateNotice: true, minBuild, signups: 'open', flags: {} })); return; }
  }
  if (url.pathname.startsWith('/.netlify/')) { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end('{}'); return; }
  const rel = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1)), file = path.resolve(root, rel);
  if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
  let body: Buffer | string = fs.readFileSync(file);
  if (rel === 'sw.js') body = body.toString('utf8') + `\n// qa-version ${swVersion}\n`;
  res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  res.end(body);
});
const port = 8700 + Math.floor(Math.random() * 200), origin = `http://127.0.0.2:${port}`;
async function waitAsync(page: any, fn: any, arg?: any, timeout = 30000) { const end = Date.now() + timeout; for (;;) { if (await page.evaluate(fn, arg).catch(() => false)) return; if (Date.now() > end) throw Error('waitAsync timed out'); await page.waitForTimeout(250); } }
async function main() {
  fs.mkdirSync(shots, { recursive: true });
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.2', () => resolve()); });
  const browser = await chromium.launch();
  try {
    for (const [name, viewport, lang] of [['mobile', { width: 375, height: 812 }, 'vi'], ['tablet', { width: 820, height: 1100 }, 'en'], ['desktop', { width: 1280, height: 800 }, 'vi'], ['desktop', { width: 1280, height: 800 }, 'en']] as const) {
      minBuild = null; events.length = 0;
      const context = await browser.newContext({ viewport, reducedMotion: 'reduce', serviceWorkers: 'allow' });
      await context.addInitScript(l => { if (!localStorage.getItem('guest/bep-language')) localStorage.setItem('guest/bep-language', l); }, lang);
      const page = await context.newPage(); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
      const ready = async () => { await page.waitForFunction(() => (window as any).BEP_STARTUP?.ready && !!navigator.serviceWorker.controller, null, { timeout: 60000 }); await page.waitForFunction(() => !!(window as any).bepUpdater?.registration, null, { timeout: 30000 }); };
      await page.goto(origin + '/', { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => (window as any).BEP_STARTUP?.ready, null, { timeout: 60000 });
      await waitAsync(page, async () => !!(await navigator.serviceWorker.getRegistration())?.active, undefined, 60000);
      await page.reload({ waitUntil: 'domcontentloaded' }); await ready();
      const workerUrl = () => page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return (r?.active as any)?.scriptURL + '#' + (await (await fetch('/sw.js', { cache: 'no-store' })).text()).match(/qa-version (\d+)/)?.[1]; });
      // 1. Idle: the new version takes over silently and the page reloads into it.
      await page.evaluate(() => { (window as any).__notReloaded = 1; });
      swVersion++;
      await Promise.all([page.waitForEvent('load', { timeout: 60000 }), page.evaluate(async () => (await navigator.serviceWorker.getRegistration())!.update())]);
      await ready();
      assert.equal(await page.evaluate(() => (window as any).__notReloaded), undefined, name + ': idle update reloads');
      assert.equal(await page.evaluate(() => !!document.querySelector('.app-update-notice')), false, 'no notice for an idle switch');
      assert.equal(await page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())?.waiting), false, 'new worker active');
      // 2. Busy: an edited form is open; the notice waits, nothing reloads; after closing, Update switches.
      await page.evaluate(() => { (window as any).__notReloaded = 1; (window as any).modal('QA', '<form><label>QA <input id="qa-edit"></label></form>'); });
      await page.locator('#qa-edit').fill('family edit in progress');
      swVersion++;
      await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())!.update());
      await page.waitForSelector('.app-update-notice', { state: 'attached', timeout: 60000 });
      await page.waitForTimeout(1200);
      assert.equal(await page.evaluate(() => (window as any).__notReloaded), 1, 'no reload while editing');
      assert.equal(await page.locator('.app-update-notice').isVisible(), false, 'notice hidden while editing');
      assert.equal(await page.locator('#qa-edit').inputValue(), 'family edit in progress');
      await page.evaluate(() => (window as any).closeModal());
      await page.locator('.app-update-notice').waitFor({ state: 'visible', timeout: 5000 });
      const notice = await page.evaluate(() => { const n = document.querySelector('.app-update-notice')!, r = n.getBoundingClientRect(); return { text: n.textContent, h: r.height, w: r.width, right: r.right, buttons: [...n.querySelectorAll('button')].map(b => { const x = b.getBoundingClientRect(); return Math.min(x.width, x.height); }), overflow: document.documentElement.scrollWidth > innerWidth }; });
      assert.match(notice.text!, lang === 'vi' ? /Có bản cập nhật mới/ : /A new version is available/);
      assert.ok(notice.buttons.every(s => s >= 44), 'touch targets ≥44px: ' + notice.buttons);
      assert.ok(notice.right <= viewport.width && !notice.overflow, 'notice inside the viewport');
      await page.screenshot({ path: `${shots}/update-notice-${name}-${viewport.width}-${lang}.png` });
      await Promise.all([page.waitForEvent('load', { timeout: 60000 }), page.locator('.app-update-notice .app-update-go').click()]);
      await ready();
      assert.equal(await page.evaluate(() => (window as any).__notReloaded), undefined, 'Update reloads into the new version');
      assert.match(await workerUrl(), new RegExp('#' + swVersion + '$'), 'running the bumped worker');
      // 3. Forced minimum build from Studio: blocking overlay, guarded retries, no automatic loop.
      const build = await page.evaluate(() => (window as any).BEP_BUILD as string);
      assert.match(build, /^\d{8}T\d{6}Z-[a-f0-9]{8}$/);
      minBuild = '29991231T000000Z-ffffffff';
      await page.evaluate(() => (window as any).refreshPlatformNotice(true));
      await page.locator('.app-update-required').waitFor({ timeout: 10000 });
      assert.equal(await page.locator('.app-update-required').getAttribute('role'), 'alertdialog');
      assert.match(await page.locator('.app-update-required').innerText(), lang === 'vi' ? /Cần cập nhật để tiếp tục/ : /Update required/);
      await page.screenshot({ path: `${shots}/update-required-${name}-${viewport.width}-${lang}.png` });
      for (let attempt = 1; attempt <= 2; attempt++) {
        await Promise.all([page.waitForEvent('load', { timeout: 60000 }), page.locator('.app-update-required .app-update-go').click()]);
        await page.waitForFunction(() => (window as any).BEP_STARTUP?.ready, null, { timeout: 60000 });
        await page.locator('.app-update-required').waitFor({ timeout: 15000 });
      }
      assert.match(await page.locator('.app-update-required .app-update-go').innerText(), lang === 'vi' ? /Thử lại/ : /Retry/);
      assert.equal(await page.locator('.app-update-required .app-update-hint').count(), 1, 'support hint after two attempts');
      await page.evaluate(() => { (window as any).__notReloaded = 1; }); await page.waitForTimeout(3000);
      assert.equal(await page.evaluate(() => (window as any).__notReloaded), 1, 'the overlay never reloads by itself');
      await page.screenshot({ path: `${shots}/update-required-retry-${name}-${viewport.width}-${lang}.png` });
      minBuild = null; await page.evaluate(() => (window as any).refreshPlatformNotice(true));
      await page.locator('.app-update-required').waitFor({ state: 'detached', timeout: 10000 });
      assert.ok(events.some(e => e.type === 'update.started') && events.some(e => e.type === 'update.result'), 'update events sent to Studio: ' + JSON.stringify(events));
      assert.deepEqual(errors, []);
      await context.close();
      console.log(`PASS app update ${name} ${viewport.width} ${lang}: idle switch, busy notice → Update, forced overlay + retry guard, events`);
    }
  } finally { await browser.close(); server.close(); }
}
main().catch(error => { console.error(error); process.exit(1); });
