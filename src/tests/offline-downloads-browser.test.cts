// v1.6 bandwidth/offline in a real browser with the real service worker (served on 127.0.0.2, a loopback secure
// context): lazy reference catalog (library, meal editor, menu generator) online and offline-after-download, family data
// without the catalog, this week's artwork pinned for offline, the Downloads screen and the offline-ready status.
// Screenshots: docs/reviews/v1.6/offline (375/820/1280, VI/EN, light/dark).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium } from 'playwright';
const root = path.resolve('dist'), shots = 'docs/reviews/v1.6/offline';
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
      assert.equal(await page.evaluate(() => state.recipes.length), 740);
      await waitAsync(page, async () => !!(await navigator.serviceWorker.getRegistration())?.active, undefined, 60000);
      await page.reload({ waitUntil: 'domcontentloaded' }); await ready(); await page.waitForFunction(() => !!navigator.serviceWorker.controller);
      // Existing household: the catalog is not part of startup; painted art still matches (build-time hashes).
      assert.equal(await loaded(), false, 'repeat start without the catalog');
      assert.equal(await page.evaluate(() => state.recipes.filter((r: any) => (window as any).dishArtworkCell(r) !== null).length), 740, 'all painted art matched before the catalog loads');
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
      const plannerText = await page.locator('#main').innerText();
      assert.ok(planned.some(n => plannerText.includes(n)), 'planned meals visible offline');
      await page.evaluate(() => (window as any).familyGeneratePreview()); await page.locator('.modal').first().waitFor({ timeout: 20000 });
      assert.equal(await loaded(), false);
      assert.ok(await page.evaluate(() => state.recipes.some((r: any) => r.id === 'qa-family-dish')), 'family recipe kept');
      // Offline-ready status and the header indicator.
      await page.evaluate(() => { (window as any).closeModal(); (window as any).otherSettingsModal('offline-ready'); });
      await page.locator('#offline-ready-body .offline-ready-list').waitFor();
      await page.waitForFunction(() => /Kho 740 món/.test((document.querySelector('#offline-ready-body') as HTMLElement)?.innerText || '') && !/…/.test((document.querySelector('#offline-ready-body') as HTMLElement)?.innerText || ''), null, { timeout: 15000 });
      const readyText = await page.locator('#offline-ready-body').innerText();
      assert.match(readyText, /✓\s*Thực đơn tuần này/); assert.match(readyText, /✓\s*Hình món tuần này/); assert.match(readyText, /✗\s*Kho 740 món/);
      assert.match(await page.locator('#network-status').getAttribute('title') || '', /Sẵn sàng offline: .*Kho món ✗/);
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
      // v1.6 integration: the on-device speech packs (Light / More accurate) fill the voice slot instead of the placeholder.
      assert.deepEqual(info.rows, ['art', 'sheets', 'catalog', 'ocr', 'voice-local-base', 'voice-local-small', 'price-scout']);
      assert.equal(info.wifi, true, 'Wi-Fi only is on by default'); assert.equal(info.overflow, false, 'no horizontal overflow'); assert.equal(info.small, 0, 'buttons ≥44px');
      assert.match(info.text!, lang === 'vi' ? /Tải về để dùng offline[\s\S]*Chỉ tải khi có Wi-Fi[\s\S]*Toàn bộ hình món ăn[\s\S]*Kho 740 món[\s\S]*Đọc hoá đơn\/giá bằng camera[\s\S]*Nhận giọng nói trên máy · Nhẹ[\s\S]*Nhận giọng nói trên máy · Chính xác hơn/ : /Downloads for offline use[\s\S]*Download on Wi-Fi only[\s\S]*All dish pictures[\s\S]*740-recipe library[\s\S]*Read receipts & prices with the camera[\s\S]*On-device speech · Light[\s\S]*On-device speech · More accurate/);
      assert.doesNotMatch(info.text!, /Netlify|Blobs/i);
      await page.locator('#settings-offline-downloads').scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${shots}/downloads-${vw}-${lang}-${theme}.png` });
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
  } finally { await browser.close(); server.close(); }
}
main().catch(error => { console.error(error); process.exit(1); });
