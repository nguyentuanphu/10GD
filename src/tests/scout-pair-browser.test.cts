import assert from 'node:assert/strict';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { chromium } from 'playwright';

// My kitchen → Kết nối gia đình → "Ghép máy tính này / Pair this computer" (FamTray Scout, v1.6).
// Owner sees the card; a trusted non-owner sees it; a plain member and device-only use do not.
// Pairing code + countdown, install steps (download link only when the app serves the zip),
// paired computers with revoke, VI/EN, 375/820/1280 (+320), light/dark, no overflow, ≥44 px.
// Set SCOUT_PAIR_SCREENSHOTS=1 to refresh docs/reviews/v1.6/auto-scout/pair-*.png.
const origin = 'https://kitchen.test';
const shots = process.env.SCOUT_PAIR_SCREENSHOTS === '1', shotDir = 'docs/reviews/v1.6/auto-scout';
const mime: Record<string, string> = { '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp' };
const VIETNAMESE = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
const sizes: Record<string, { width: number; height: number }> = { narrow: { width: 320, height: 740 }, mobile: { width: 375, height: 812 }, tablet: { width: 820, height: 1100 }, desktop: { width: 1280, height: 800 } };

async function main() {
  const browser = await chromium.launch();
  try {
    type Opt = { account?: boolean; role?: string; trusted?: boolean; viewport?: { width: number; height: number }; theme?: string; download?: boolean; posts?: any[] };
    async function open({ account = true, role = 'owner', trusted = false, viewport = sizes.mobile, theme = 'light', download = false, posts = [] }: Opt = {}) {
      const context = await browser.newContext({ viewport, serviceWorkers: 'block', reducedMotion: 'reduce', hasTouch: viewport.width < 1000 });
      await context.addInitScript(({ account, theme }) => { if (sessionStorage.getItem('qa-init')) return; sessionStorage.setItem('qa-init', '1'); localStorage.setItem('bep-theme-mode', theme); if (account) localStorage.setItem('bep-account-present', 'yes'); }, { account, theme });
      const page = await context.newPage(), errors: string[] = [];
      page.on('pageerror', e => errors.push(e.message));
      let devices = [{ id: 'dev-aaaaaaaaaaaa', name: 'Máy bếp (synthetic)', stores: { woolworths: 'Hurstville' }, lastHeartbeat: '2026-11-04T07:00:00+11:00', lastRunAt: null, paused: false }];
      await context.route(origin + '/**', async route => {
        const req = route.request(), url = new URL(req.url()), path = url.pathname, op = url.searchParams.get('op');
        if (path === '/downloads/famtray-scout.zip') { if (download) await route.fulfill({ status: 200, contentType: 'application/zip', body: 'PK' }); else await route.fulfill({ status: 404, body: 'Not found' }); return; }
        if (path.startsWith('/.netlify/')) {
          const household = { id: 'qa', name: 'QA kitchen', role };
          if (path.includes('/scout')) {
            if (req.method() === 'POST') posts.push({ op, body: req.postDataJSON?.() ?? null });
            if (op === 'my-devices') { await route.fulfill({ json: { trusted, familyRole: role, devices } }); return; }
            if (op === 'pair-code') { await route.fulfill({ status: 201, json: { code: 'QAPX7K2M', expires: new Date(Date.now() + 15 * 60000).toISOString() } }); return; }
            if (op === 'my-revoke') { devices = devices.filter(d => d.id !== req.postDataJSON().deviceId); await route.fulfill({ json: { ok: true } }); return; }
          }
          if (path.includes('/accounts') && op === 'families') { await route.fulfill({ json: { families: [household], account: { username: 'qa', name: 'QA' }, household: { id: 'qa' } } }); return; }
          if (path.includes('/accounts') && op === 'members') { await route.fulfill({ json: { name: 'QA kitchen', members: [{ username: 'qa', name: 'QA', role }], invites: [] } }); return; }
          if (op === 'status') { await route.fulfill({ json: account ? { configured: true, connected: true, mode: 'account', account: { username: 'qa', name: 'QA' }, household } : { configured: true, connected: false, mode: 'guest' } }); return; }
          await route.fulfill({ json: op === 'state' ? { state: null, etag: null } : { announcements: [], devices: [] } });
          return;
        }
        const file = resolve('dist', path === '/' ? 'index.html' : path.slice(1));
        try { await route.fulfill({ contentType: mime[extname(file)] || 'application/octet-stream', body: readFileSync(file) }); }
        catch { await route.fulfill({ status: 404, body: 'Not found' }); }
      });
      await page.goto(origin, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => (document.querySelector('#main')?.textContent?.length || 0) > 500 && !document.querySelector('#startup-progress'));
      await page.waitForTimeout(300);
      if (await page.evaluate(() => document.querySelector('#modal-title')?.textContent || '')) await page.keyboard.press('Escape');
      return { page, context, errors };
    }
    // A late one-time prompt can replace the sheet; close it and open My kitchen again (once).
    const kitchen = async (page: any) => { for (let i = 0; i < 2; i++) { await page.evaluate(() => (globalThis as any).settingsModal()); try { await page.locator('.kitchen-hub').waitFor({ timeout: 8000 }); await page.waitForTimeout(250); return; } catch (e) { if (i) throw e; await page.keyboard.press('Escape'); await page.waitForTimeout(300); } } };
    const setLang = async (page: any, lang: string) => { if ((await page.locator('html').getAttribute('lang')) !== lang) await page.locator('#app-language').click(); await page.waitForTimeout(100); };
    const noOverflow = async (page: any, label: string) => {
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${label}: page overflow`);
      assert.equal(await page.evaluate(() => { const c = document.querySelector('.scout-pair-card')!, m = document.querySelector('.modal')!; return m.scrollWidth > m.clientWidth + 1 || c.scrollWidth > c.clientWidth + 1; }), false, `${label}: card overflow`);
    };
    const targets = async (page: any, label: string) => {
      const small = await page.$$eval('.scout-pair-card button, .scout-pair-card a.btn, .scout-pair-card summary', (els: any[]) => els.filter(e => e.offsetParent).map(e => { const r = e.getBoundingClientRect(); return { t: (e.textContent || '').trim().slice(0, 30), h: Math.round(r.height), w: Math.round(r.width) }; }).filter(x => x.h < 44 || x.w < 44));
      assert.deepEqual(small, [], `${label}: touch targets ≥ 44 px`);
    };
    const untranslated = (page: any) => page.evaluate((pattern: string) => { const re = new RegExp(pattern, 'i'), out: string[] = [], w = document.createTreeWalker(document.querySelector('.scout-pair-card')!, NodeFilter.SHOW_TEXT); let n: Node | null; while ((n = w.nextNode())) { const el = n.parentElement; if (!el || el.closest('[data-user-content]')) continue; if (re.test(n.nodeValue || '')) out.push((n.nodeValue || '').trim()); } return out; }, VIETNAMESE.source);

    // 1. Owner at every size, VI + EN, light + dark: create code, countdown, steps, revoke.
    for (const theme of ['light', 'dark']) for (const [name, viewport] of Object.entries(sizes)) {
      if (theme === 'dark' && name === 'narrow') continue;
      const posts: any[] = [];
      const { page, context, errors } = await open({ viewport, theme, posts, download: name === 'desktop' });
      for (const lang of ['vi', 'en']) {
        await setLang(page, lang);
        await kitchen(page);
        const card = page.locator('#kitchen-family .scout-pair-card');
        await card.waitFor();
        assert.equal(await card.locator('h4').innerText(), lang === 'vi' ? '💻 Ghép máy tính này' : '💻 Pair this computer');
        await card.locator('[data-scout-devices] li').first().waitFor();
        await page.evaluate(() => document.querySelector('.scout-pair-card')?.scrollIntoView({ block: 'start' }));
        await card.locator('[data-scout-pair]').click();
        await card.locator('[data-scout-code]').waitFor();
        assert.equal(await card.locator('[data-scout-code]').innerText(), 'QAPX-7K2M', 'code shown in two groups of four');
        assert.match(await card.locator('[data-scout-left]').innerText(), /^1[45]:\d\d$/, 'expiry countdown');
        const first = await card.locator('[data-scout-left]').innerText(); await page.waitForTimeout(1200);
        assert.notEqual(await card.locator('[data-scout-left]').innerText(), first, 'countdown ticks');
        assert.match(await card.innerText(), new RegExp(origin.replace(/\./g, '\\.')), 'app address shown for the extension');
        await card.locator('.scout-pair-steps summary').click();
        assert.equal(await card.locator(`.scout-pair-steps a[href="/downloads/famtray-scout.zip"]`).count(), name === 'desktop' ? 1 : 0, 'download link only when the app serves the zip');
        assert.match(await card.locator('.scout-pair-steps').innerText(), lang === 'vi' ? /chrome:\/\/extensions.*Tải tiện ích đã giải nén/s : /chrome:\/\/extensions.*Load unpacked/s);
        await noOverflow(page, `${name} ${theme} ${lang}`);
        await targets(page, `${name} ${lang}`);
        if (lang === 'en') assert.deepEqual(await untranslated(page), [], `${name}: untranslated Vietnamese in the pair card`);
        if (shots && (theme === 'light' ? name !== 'narrow' || lang === 'vi' : lang === 'en')) { mkdirSync(shotDir, { recursive: true }); await page.screenshot({ path: `${shotDir}/pair-${name}-${viewport.width}x${viewport.height}-${lang}-${theme}.png` }); }
        await page.keyboard.press('Escape'); await page.waitForTimeout(150);
      }
      assert.equal(posts.filter(p => p.op === 'pair-code').length, 2, 'one pairing code per click');
      // Revoke the paired computer (confirm dialog).
      await kitchen(page);
      const card = page.locator('#kitchen-family .scout-pair-card');
      await card.locator('[data-scout-revoke]').first().waitFor();
      page.once('dialog', d => d.accept());
      await card.locator('[data-scout-revoke]').first().click();
      await card.locator('[data-scout-devices] .hint').waitFor();
      assert.deepEqual(posts.filter(p => p.op === 'my-revoke').map(p => p.body), [{ deviceId: 'dev-aaaaaaaaaaaa' }]);
      assert.deepEqual(errors, []);
      await context.close();
    }
    console.log('PASS owner pair card: code + countdown, steps, download link, revoke; VI/EN; 320/375/820/1280; light/dark; no overflow; ≥44 px');

    // 2. Who sees it: trusted non-owner yes; plain member no; device-only no.
    {
      const { page, context } = await open({ role: 'editor', trusted: true }); await kitchen(page);
      await page.locator('#kitchen-family .scout-pair-card').waitFor();
      // Community prices read by the extension carry a "Scout" label in Price Scout.
      const row = (sources: string[]) => page.evaluate((sources: string[]) => (globalThis as any).scoutCommunityRow({ groupId: 'g', itemId: 'nuoc-mam', label: 'Synthetic fish sauce', retailer: 'woolworths', branchLabel: 'Rockdale 2216', status: 'confirmed', price: 4.2, families: 2, ageDays: 0, sources }), sources);
      assert.match(await row(['scout']), /class="scout-src-chip"[^>]*>🔎 Scout</, 'Scout label on Scout prices');
      assert.doesNotMatch(await row(['shelf-photo']), /scout-src-chip/, 'no Scout label on family photos');
      await context.close();
    }
    for (const opt of [{ role: 'editor', trusted: false }, { account: false }] as Opt[]) {
      const { page, context } = await open(opt); await kitchen(page); await page.waitForTimeout(800);
      assert.equal(await page.locator('.scout-pair-card').count(), 0, 'no pair card for ' + JSON.stringify(opt)); await context.close();
    }
    console.log('PASS pair card only for family owners and trusted scouts; never for device-only use');

    // 3. Offline: the card says a connection is needed; no request is made.
    {
      const posts: any[] = [];
      const { page, context } = await open({ posts }); await context.setOffline(true); await page.waitForTimeout(200); await kitchen(page);
      const card = page.locator('#kitchen-family .scout-pair-card'); await card.waitFor();
      assert.equal(await card.locator('[data-scout-pair]').count(), 0); assert.match(await card.innerText(), /Cần mạng để tạo mã ghép nối/);
      await context.setOffline(false); await page.waitForTimeout(300);
      await card.locator('[data-scout-pair]').waitFor();
      assert.equal(posts.length, 0); await context.close();
    }
    console.log('PASS offline pair card');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exit(1); });
