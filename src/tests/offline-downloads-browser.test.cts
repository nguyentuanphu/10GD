// v1.6 bandwidth/offline in a real browser with the real service worker (served on 127.0.0.2, a loopback secure
// context): lazy reference catalog (library, meal editor, menu generator) online and offline-after-download, family data
// without the catalog, this week's artwork pinned for offline, the Downloads screen and the offline-ready status.
// Screenshots: docs/reviews/v1.6/offline (375/820/1280, VI/EN, light/dark).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium } from 'playwright';
const root = path.resolve('dist'), shots = 'docs/reviews/v1.6/offline', v171 = 'docs/reviews/v1.7.1/voice-settings';
const mime: Record<string, string> = { '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.gz': 'application/gzip' };
declare const state: any, currentWeek: any, sydneyDate: any;
const served: string[] = [];
const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://x'); served.push(url.pathname);
  if (url.pathname.startsWith('/.netlify/')) { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end('{}'); return; }
  const rel = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1)), file = path.resolve(root, rel);
  if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); res.end(fs.readFileSync(file));
});
const port = 8900 + Math.floor(Math.random() * 90), origin = `http://127.0.0.2:${port}`;
// page.waitForFunction does not await a promise returned by the predicate; poll async conditions explicitly.
async function waitAsync(page: any, fn: any, arg?: any, timeout = 30000) { const end = Date.now() + timeout; for (;;) { if (await page.evaluate(fn, arg).catch(() => false)) return; if (Date.now() > end) throw Error('waitAsync timed out: ' + String(fn).slice(0, 120)); await page.waitForTimeout(250); } }
async function main() {
  fs.mkdirSync(shots, { recursive: true });
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.2', () => resolve()); });
  const browser = await chromium.launch();
  try {
    // ---- Lazy catalog paths and offline behaviour (one device, mobile size) ----
    {
      const context = await browser.newContext({ viewport: { width: 375, height: 812 }, reducedMotion: 'reduce', serviceWorkers: 'allow' });
      const page = await context.newPage(); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
      const ready = () => page.waitForFunction(() => (window as any).BEP_STARTUP?.ready, null, { timeout: 60000 });
      const loaded = () => page.evaluate(() => (window as any).catalogLoaded());
      await page.goto(origin + '/', { waitUntil: 'domcontentloaded' }); await ready();
      // New household: the reference recipes arrive with the first start.
      assert.equal(await loaded(), true, 'new household loads the catalog at start');
      assert.equal(await page.evaluate(() => state.recipes.length), 125/* v1.7.10: recognised dishes only */);
      await waitAsync(page, async () => !!(await navigator.serviceWorker.getRegistration())?.active, undefined, 60000);
      await page.reload({ waitUntil: 'domcontentloaded' }); await ready(); await page.waitForFunction(() => !!navigator.serviceWorker.controller);
      // Existing household: the catalog is not part of startup; painted art still matches (build-time hashes).
      assert.equal(await loaded(), false, 'repeat start without the catalog');
      assert.equal(await page.evaluate(() => state.recipes.filter((r: any) => (window as any).dishArtworkCell(r) !== null).length), 125/* v1.7.10 */, 'all painted art matched before the catalog loads');
      const lazyPath = async (label: string, run: string, selector: string) => {
        await page.evaluate(() => { location.hash = 'today'; }); await page.reload({ waitUntil: 'domcontentloaded' }); await ready();
        assert.equal(await loaded(), false, label + ': starts without catalog');
        await page.evaluate(run); await page.locator(selector).first().waitFor({ timeout: 20000 });
        await page.waitForFunction(() => (window as any).catalogLoaded(), null, { timeout: 20000 });
      };
      const today = await page.evaluate(() => sydneyDate());
      await lazyPath('library', "location.hash='recipes'", '[data-fm="samples"]');
      await lazyPath('meal editor', `familyEditMeal('${today}','dinner')`, '.modal');
      await lazyPath('menu generator', 'familyGeneratePreview()', '.modal');
      console.log('PASS lazy catalog online: new household gets it at start; library, meal editor and generator load it on demand');
      // Plan this week with reference dishes and a family recipe; their artwork cells are pinned for offline use.
      const expected: string[] = await page.evaluate(() => { const w = (window as any), week = currentWeek(), days = Object.keys(week.days).slice(0, 3), picks = state.recipes.filter((r: any) => w.dishArtCellPath(r)).slice(10, 16);
        days.forEach((d: string, i: number) => { week.days[d] ??= {}; week.days[d].dinner = w.createMeal(state, picks[i * 2].id, picks[i * 2 + 1].id); });
        state.recipes.push({ id: 'qa-family-dish', name: 'Canh chua nhà ngoại', custom: true, origin: 'family', category: 'soup', protein: 'fish', time: 30, ingredients: [{ id: 'fish', qty: 500 }, { id: 'tomato', qty: 200 }], prep: '', steps: ['Nấu canh'] });
        w.save(); w.render(); return w.offlineWeekArtPaths(); });
      assert.ok(expected.length >= 8, 'week paths ' + expected.length);
      await waitAsync(page, async (paths: string[]) => { const c = await caches.open('bep-art-pinned-v1'); return (await Promise.all(paths.map(p => c.match('/' + p)))).every(Boolean); }, expected);
      // Offline after the catalog was downloaded: every path works, and this week's pictures load.
      await context.setOffline(true);
      for (const [label, run, selector] of [['library', "location.hash='recipes'", '[data-fm="samples"]'], ['meal editor', `familyEditMeal('${today}','dinner')`, '.modal'], ['menu generator', 'familyGeneratePreview()', '.modal']]) {
        await page.evaluate(() => { location.hash = 'today'; }); await page.reload({ waitUntil: 'domcontentloaded' }); await ready(); assert.equal(await loaded(), false);
        await page.evaluate(run); await page.locator(selector).first().waitFor({ timeout: 20000 });
        await page.waitForFunction(() => (window as any).catalogLoaded(), null, { timeout: 20000 });
        assert.ok(true, label);
      }
      for (const p of expected) assert.equal(await page.evaluate(async (src: string) => (await fetch('/' + src)).status, p), 200, 'offline week art ' + p);
      console.log('PASS offline after download: library, meal editor and generator use the stored catalog; this week’s artwork is pinned');
      // Offline without the catalog: family recipes and planned meals still work; the generator still opens.
      await page.evaluate(async () => { await caches.delete('bep-pack-catalog-v1'); });
      await page.reload({ waitUntil: 'domcontentloaded' }); await ready();
      await page.evaluate(() => { location.hash = 'recipes'; }); await page.locator('[data-fm="own"]').first().click();
      await page.locator('#main').getByText('Canh chua nhà ngoại').first().waitFor();
      const planned: string[] = await page.evaluate(() => Object.values(currentWeek().days).flatMap((d: any) => d?.dinner?.recipes || []).map((r: any) => r.name));
      assert.ok(planned.length >= 6, 'planned meals kept offline');
      await page.evaluate(() => { location.hash = 'planner'; }); await page.waitForTimeout(800);
      // v1.7.8: the day line no longer lists dishes; open the days as the family would
      await page.evaluate(() => document.querySelectorAll('#main details.plan-day').forEach((d: any) => { d.open = true; }));
      const plannerText = await page.locator('#main').innerText();
      assert.ok(planned.some(n => plannerText.includes(n)), 'planned meals visible offline');
      await page.evaluate(() => (window as any).familyGeneratePreview()); await page.locator('.modal').first().waitFor({ timeout: 20000 });
      assert.equal(await loaded(), false);
      assert.ok(await page.evaluate(() => state.recipes.some((r: any) => r.id === 'qa-family-dish')), 'family recipe kept');
      // Offline-ready status and the header indicator.
      await page.evaluate(() => { (window as any).closeModal(); (window as any).otherSettingsModal('offline-ready'); });
      await page.locator('#offline-ready-body .offline-ready-list').waitFor();
      await page.waitForFunction(() => /Kho 125 món/.test((document.querySelector('#offline-ready-body') as HTMLElement)?.innerText || '') && !/…/.test((document.querySelector('#offline-ready-body') as HTMLElement)?.innerText || ''), null, { timeout: 15000 });
      const readyText = await page.locator('#offline-ready-body').innerText();
      assert.match(readyText, /✓\s*Thực đơn tuần này/); assert.match(readyText, /✓\s*Hình món ăn tuần này/); assert.match(readyText, /✗\s*Kho 125 món/);
      assert.match(await page.locator('#network-status').getAttribute('title') || '', /Sẵn sàng offline: .*Kho món ăn ✗/);
      await page.screenshot({ path: `${shots}/offline-status-375-vi-offline.png` });
      await context.setOffline(false);
      assert.deepEqual(errors, []);
      await context.close();
      console.log('PASS offline without the catalog: family recipes, planned meals and generator work; readiness card and header indicator');
    }
    // ---- Downloads screen: responsive, bilingual, light/dark; a real download ----
    for (const [vw, vh] of [[375, 812], [820, 1100], [1280, 800]]) for (const lang of ['vi', 'en']) for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport: { width: vw, height: vh }, reducedMotion: 'reduce', serviceWorkers: 'allow' });
      await context.addInitScript(([l, t]) => { localStorage.setItem('guest/bep-language', l); localStorage.setItem('bep-theme-mode', t); }, [lang, theme]);
      const page = await context.newPage(); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
      await page.goto(origin + '/', { waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => (window as any).BEP_STARTUP?.ready, null, { timeout: 60000 });
      await waitAsync(page, async () => !!(await navigator.serviceWorker.getRegistration())?.active, undefined, 60000);
      await page.evaluate(() => (window as any).otherSettingsModal('offline-downloads'));
      await page.locator('.offline-pack[data-pack="art"] .offline-pack-status').waitFor();
      await page.waitForFunction(() => document.querySelectorAll('.offline-pack').length >= 6 && /MB|KB/.test(document.querySelector('#offline-storage')?.textContent || ''), null, { timeout: 15000 });
      const info = await page.evaluate(() => ({ rows: [...document.querySelectorAll('.offline-pack')].map(r => (r as HTMLElement).dataset.pack), wifi: (document.getElementById('offline-wifi-only') as HTMLInputElement).checked, overflow: document.documentElement.scrollWidth > innerWidth || [...document.querySelectorAll('.offline-pack')].some(r => r.scrollWidth > r.clientWidth + 1), small: [...document.querySelectorAll('.offline-pack-actions .btn')].map(b => b.getBoundingClientRect()).filter(r => r.width && (r.height < 44 || r.width < 44)).length, text: document.querySelector('#settings-offline-downloads')!.textContent }));
      // v1.7.1: only the on-device "More accurate" pack fills the voice slot (the Light pack is retired).
      assert.deepEqual(info.rows, ['art', 'sheets', 'catalog', 'ocr', 'voice-local-small', 'price-scout']);
      assert.equal(info.wifi, true, 'Wi-Fi only is on by default'); assert.equal(info.overflow, false, 'no horizontal overflow'); assert.equal(info.small, 0, 'buttons ≥44px');
      assert.match(info.text!, lang === 'vi' ? /Tải về để dùng offline[\s\S]*Chỉ tải khi có Wi-Fi[\s\S]*Toàn bộ hình món ăn[\s\S]*Kho 125 món[\s\S]*Đọc hoá đơn\/giá bằng camera[\s\S]*Nhận giọng nói trên máy · Chính xác hơn/ : /Downloads for offline use[\s\S]*Download on Wi-Fi only[\s\S]*All dish pictures[\s\S]*125-recipe library[\s\S]*Read receipts & prices with the camera[\s\S]*On-device speech · More accurate/);
      assert.doesNotMatch(info.text!, /Netlify|Blobs/i);assert.doesNotMatch(info.text!, /Nhẹ|· Light|Not available on this server|Chưa có trên máy chủ này/);
      // v1.7.1 evidence: the Account & settings sheet (account part on top, Other settings under it) and the voice row.
      fs.mkdirSync(v171, { recursive: true });
      await page.locator('#settings-account').scrollIntoViewIfNeeded(); await page.screenshot({ path: `${v171}/account-settings-${lang}-${theme}-${vw}x${vh}.jpg`, type: 'jpeg', quality: 70 });
      await page.locator('#settings-offline-downloads').scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${shots}/downloads-${vw}-${lang}-${theme}.png` });
      if (theme === 'light' || vw === 375) { await page.locator('.offline-pack[data-pack="voice-local-small"]').scrollIntoViewIfNeeded(); await page.screenshot({ path: `${v171}/downloads-voice-row-${lang}-${theme}-${vw}x${vh}.jpg`, type: 'jpeg', quality: 70 }); }
      if (vw === 1280 && lang === 'en' && theme === 'light') {
        // Desktop counts as unmetered: the full picture pack downloads with progress, then reads as ready; Remove frees it.
        await page.locator('[data-offline-download="art"]').click();
        await page.locator('.offline-pack[data-pack="art"][data-state="ready"]').waitFor({ timeout: 120000 });
        assert.match(await page.locator('.offline-pack[data-pack="art"]').innerText(), /Downloaded/);
        await context.setOffline(true);
        assert.equal(await page.evaluate(async () => (await fetch('/artwork/cells/d500.webp')).status), 200, 'any picture offline after the download');
        await page.evaluate(() => { (window as any).closeModal(); (window as any).otherSettingsModal('offline-ready'); });
        await page.locator('#offline-ready-body .offline-ready-list').waitFor();
        await page.waitForFunction(() => /✓\s*All dish pictures/.test((document.querySelector('#offline-ready-body') as HTMLElement)?.innerText || ''), null, { timeout: 15000 });
        await page.screenshot({ path: `${shots}/offline-status-1280-en-offline.png` });
        await context.setOffline(false);
        await page.evaluate(() => (window as any).otherSettingsModal('offline-downloads'));
        await page.locator('[data-offline-remove="art"]').click(); await page.locator('#confirm-root [data-confirm="yes"]').click();
        await page.locator('.offline-pack[data-pack="art"][data-state="none"]').waitFor({ timeout: 20000 });
      }
      if (vw === 820 && lang === 'vi' && theme === 'light') {
        // Offline the screen still shows sizes and status (pack list is precached).
        await context.setOffline(true); await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => (window as any).BEP_STARTUP?.ready, null, { timeout: 60000 });
        await page.evaluate(() => (window as any).otherSettingsModal('offline-downloads'));
        await page.waitForFunction(() => /MB/.test(document.querySelector('.offline-pack[data-pack="art"]')?.textContent || ''), null, { timeout: 15000 });
        await page.screenshot({ path: `${shots}/downloads-820-vi-offline.png` });
        await context.setOffline(false);
      }
      assert.deepEqual(errors, []);
      await context.close();
    }
    console.log('PASS Downloads screen at 375/820/1280, VI/EN, light/dark: rows, Wi-Fi default, no overflow, 44px targets; real download, offline use and remove');
    // ---- v1.7.1: iPhone / iPad (MacIntel + touch) — "More accurate" is offered with an honest warning, never
    //      "Not available on this server"; downloading asks first (size, Wi-Fi, may be slow). No WebGPU = older iOS path.
    for (const dev of [
      { name: 'ipad', viewport: { width: 820, height: 1180 }, ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15', platform: 'MacIntel', touch: 5 },
      { name: 'iphone', viewport: { width: 375, height: 812 }, ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1', platform: 'iPhone', touch: 5 }]) for (const lang of ['vi', 'en']) {
      const context = await browser.newContext({ viewport: dev.viewport, userAgent: dev.ua, hasTouch: true, reducedMotion: 'reduce', serviceWorkers: 'allow' });
      await context.addInitScript(([l, p, t]) => { localStorage.setItem('guest/bep-language', l as string); Object.defineProperty(Navigator.prototype, 'platform', { get: () => p }); Object.defineProperty(Navigator.prototype, 'maxTouchPoints', { get: () => t }); Object.defineProperty(Navigator.prototype, 'gpu', { get: () => undefined }); }, [lang, dev.platform, dev.touch]);
      const page = await context.newPage(); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
      await page.goto(origin + '/', { waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => (window as any).BEP_STARTUP?.ready, null, { timeout: 60000 });
      await page.evaluate(() => (window as any).otherSettingsModal('offline-downloads'));
      const row = page.locator('.offline-pack[data-pack="voice-local-small"]');
      await page.waitForFunction(() => /chậm|slow/i.test(document.querySelector('.offline-pack[data-pack="voice-local-small"]')?.textContent || ''), null, { timeout: 15000 });
      const text = await row.innerText();
      assert.doesNotMatch(text, /Not available on this server|Chưa có trên máy chủ này|iPhone\/iPad giới hạn|limits web page memory/, `${dev.name} ${lang}: no misleading block`);
      assert.match(text, lang === 'vi' ? /Chính xác hơn[\s\S]*Máy cũ có thể chạy chậm/ : /More accurate[\s\S]*Older devices may be slow/);
      assert.equal(await row.locator('[data-offline-download="voice-local-small"]').count(), 1, `${dev.name}: download offered`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${dev.name}: no overflow`);
      await row.scrollIntoViewIfNeeded(); await page.screenshot({ path: `${v171}/downloads-voice-row-${dev.name}-${lang}-${dev.viewport.width}x${dev.viewport.height}.jpg`, type: 'jpeg', quality: 70 });
      await row.locator('[data-offline-download="voice-local-small"]').click(); await page.locator('#confirm-root').waitFor();
      assert.match(await page.locator('#confirm-body').innerText(), lang === 'vi' ? /MB[\s\S]*Wi-Fi[\s\S]*chậm/ : /MB[\s\S]*Wi-Fi[\s\S]*slow/);
      await page.locator('#confirm-root [data-confirm="no"]').click(); await page.waitForTimeout(150);
      assert.notEqual(await row.getAttribute('data-state'), 'running', 'declined: not downloading');
      // A genuine block still explains itself (here: no Web Worker) instead of blaming the server.
      await page.evaluate(() => { (0, eval)("voiceLocalCap=voiceLocalCapability({wasm:true,simd:true,worker:false,mic:true,audioWorklet:true,caches:true,ua:navigator.userAgent,touchPoints:5})"); (window as any).closeModal(); (window as any).otherSettingsModal('offline-downloads'); });
      await page.waitForFunction(() => /Web Worker/.test(document.querySelector('.offline-pack[data-pack="voice-local-small"]')?.textContent || ''), null, { timeout: 15000 });
      assert.deepEqual(errors, []);
      await context.close();
    }
    console.log('PASS iPhone/iPad (simulated UA, no WebGPU): More accurate offered with a slow-device warning and a confirm before download; genuine blocks show their own reason');
  } finally { await browser.close(); server.close(); }
}
main().catch(error => { console.error(error); process.exit(1); });
