import assert from 'node:assert/strict';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { chromium } from 'playwright';

// My kitchen → Kết nối gia đình → "Ghép máy tính này / Pair this computer" (FamTray Scout, v1.6).
// Owner sees the card; a trusted non-owner sees it; a plain member and device-only use do not.
// Pairing code + countdown, install steps (download link only when the app serves the zip),
// paired computers with revoke, VI/EN, 375/820/1280 (+320), light/dark, no overflow, ≥44 px.
// v1.7 easy install: install steps with illustrations while no extension answers, store
// button only when configured, polling picks up a newly installed extension, one-click
// "Pair now" (code handed to the extension, never shown), phones/iPad/Android tablets get
// "open on a computer" + screenshot/voice instead of a download, Edge wording.
// (The real MV3 extension end-to-end lives in scout-extension-browser.test.cts.)
// Set SCOUT_PAIR_SCREENSHOTS=1 to refresh docs/reviews/v1.7/easy-scout/*.png.
const origin = 'https://kitchen.test';
const shots = process.env.SCOUT_PAIR_SCREENSHOTS === '1', shotDir = 'docs/reviews/v1.7/easy-scout';
const UA = {
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  ipad: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  androidTablet: 'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
  firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0',
};
const mime: Record<string, string> = { '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp' };
const VIETNAMESE = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
const sizes: Record<string, { width: number; height: number }> = { narrow: { width: 320, height: 740 }, mobile: { width: 375, height: 812 }, tablet: { width: 820, height: 1100 }, desktop: { width: 1280, height: 800 } };

async function main() {
  const browser = await chromium.launch();
  try {
    type Opt = { account?: boolean; role?: string; trusted?: boolean; assigned?: boolean; hash?: string; grantedAt?: string | null; viewport?: { width: number; height: number }; theme?: string; download?: boolean; posts?: any[]; ua?: string; touch?: number; platform?: string; ext?: string | null; store?: any };
    async function open({ account = true, role = 'owner', trusted = false, assigned, hash = '', grantedAt = null, viewport = sizes.mobile, theme = 'light', download = false, posts = [], ua, touch, platform, ext = null, store = null }: Opt = {}) {
      const isAssigned = assigned ?? (role === 'owner' || trusted);
      const context = await browser.newContext({ viewport, serviceWorkers: 'block', reducedMotion: 'reduce', hasTouch: viewport.width < 1000, ...(ua ? { userAgent: ua } : {}) });
      await context.addInitScript(({ account, theme }) => { if (sessionStorage.getItem('qa-init')) return; sessionStorage.setItem('qa-init', '1'); localStorage.setItem('bep-theme-mode', theme); if (account) localStorage.setItem('bep-account-present', 'yes'); }, { account, theme });
      // Platform overrides (iPadOS reports a desktop Mac UA; only maxTouchPoints gives it away).
      await context.addInitScript(({ touch, platform }) => { if (touch !== undefined) Object.defineProperty(Navigator.prototype, 'maxTouchPoints', { get: () => touch }); if (platform) Object.defineProperty(Navigator.prototype, 'platform', { get: () => platform }); }, { touch, platform });
      // Fake installed extension: window.__fakeExt = null | 'ready' | 'paired'; messages are logged.
      await context.addInitScript((ext) => { const g: any = globalThis; g.__fakeExt = ext; g.__extMsgs = []; g.chrome = g.chrome || {};
        g.chrome.runtime = { lastError: undefined, sendMessage(id: string, msg: any, cb: any) { g.__extMsgs.push({ id, msg }); setTimeout(() => { if (!g.__fakeExt || id !== 'mjeoekikdicoojgoppnfibjbfpcfngja') { g.chrome.runtime.lastError = { message: 'Could not establish connection.' }; cb(undefined); g.chrome.runtime.lastError = undefined; return; }
          if (msg.type === 'ping') cb({ ok: true, app: 'famtray-scout', version: '1.7.0', paired: g.__fakeExt === 'paired', pairedHere: g.__fakeExt === 'paired', deviceName: g.__fakeExt === 'paired' ? 'Chrome · máy tính' : null, deviceId: g.__fakeExt === 'paired' ? 'dev-bbbbbbbbbbbb' : null });
          else if (msg.type === 'pair') { g.__fakeExt = 'paired'; g.__paired = true; cb({ ok: true, app: 'famtray-scout', paired: true, pairedHere: true, deviceName: msg.name, deviceId: 'dev-bbbbbbbbbbbb' }); } }, 30); } }; }, ext);
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
            if (op === 'my-devices') { const paired = await page.evaluate(() => (globalThis as any).__paired === true).catch(() => false); if (!isAssigned) { await route.fulfill({ json: { assigned: false, trusted: false, familyRole: null, devices: [] } }); return; } await route.fulfill({ json: { assigned: true, grantedAt, trusted, familyRole: role, devices: paired && !devices.some(d => d.id === 'dev-bbbbbbbbbbbb') ? [...devices, { id: 'dev-bbbbbbbbbbbb', name: 'Chrome · máy tính', stores: {}, lastHeartbeat: null, lastRunAt: null, paused: false }] : devices } }); return; }
            if (op === 'public') { await route.fulfill({ json: { extensionIds: ['mjeoekikdicoojgoppnfibjbfpcfngja'], storeUrl: store?.chrome || null, edgeStoreUrl: store?.edge || null } }); return; }
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
      await page.goto(origin + '/' + hash, { waitUntil: 'domcontentloaded' });
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
        assert.equal((await card.locator('h4').innerText()).trim(), lang === 'vi' ? 'Ghép máy tính này' : 'Pair this computer');assert.equal(await card.locator('h4 span.emo-art').count(), 1, 'computer drawing, not an emoji');
        await card.locator('[data-scout-devices] li').first().waitFor();
        await page.evaluate(() => document.querySelector('.scout-pair-card')?.scrollIntoView({ block: 'start' }));
        // No extension answers: illustrated install steps + waiting status; manual code in a fold.
        await card.locator('[data-scout-state="install"]').waitFor();
        assert.equal(await card.locator('.scout-install-steps li').count(), 5, 'five install steps');
        assert.equal(await card.locator('.scout-install-steps svg:not(.emo-art)').count(), 5, 'each step illustrated (inline emoji drawings not counted)');
        assert.equal(await card.locator('[data-scout-ext-page]').inputValue(), 'chrome://extensions', 'copyable extensions page address');
        assert.equal(await card.locator('[data-scout-store]').count(), 0, 'no store button unless configured');
        assert.match(await card.locator('[data-scout-waiting]').innerText(), lang === 'vi' ? /Đang chờ tiện ích/ : /Waiting for the extension/);
        assert.equal(await card.locator(`a[href="/downloads/famtray-scout.zip"]`).count(), name === 'desktop' ? 1 : 0, 'download link only when the app serves the zip');
        assert.match(await card.locator('.scout-install-steps').innerText(), lang === 'vi' ? /Chế độ dành cho nhà phát triển.*Tải tiện ích đã giải nén/s : /Developer mode.*Load unpacked/s);
        assert.equal(new URL(page.url()).searchParams.get('scout-wait'), '1', 'page marks itself as waiting for the install');
        if (shots && lang === 'vi' && theme === 'light' || shots && lang === 'en' && theme === 'dark' && name !== 'narrow') { mkdirSync(shotDir, { recursive: true }); await page.evaluate(() => document.querySelector('.scout-pair-card')?.scrollIntoView({ block: 'start' })); await page.screenshot({ path: `${shotDir}/install-${name}-${viewport.width}x${viewport.height}-${lang}-${theme}.png` }); }
        if (!(await card.locator('.scout-pair-manual').evaluate((d: any) => d.open))) await card.locator('.scout-pair-manual summary').click();
        await card.locator('[data-scout-pair]').click();
        await card.locator('[data-scout-code]').waitFor();
        assert.equal(await card.locator('[data-scout-code]').innerText(), 'QAPX-7K2M', 'code shown in two groups of four');
        assert.match(await card.locator('[data-scout-left]').innerText(), /^1[45]:\d\d$/, 'expiry countdown');
        const first = await card.locator('[data-scout-left]').innerText();
        // The countdown ticks once a second; wait for the next tick (bounded) instead of a fixed sleep, which raced on slow CI runners.
        await card.locator('[data-scout-left]').filter({ hasNotText: first }).waitFor({ timeout: 5000 }).catch(() => {});
        assert.notEqual(await card.locator('[data-scout-left]').innerText(), first, 'countdown ticks');
        assert.match(await card.innerText(), new RegExp(origin.replace(/\./g, '\\.')), 'app address shown for the extension');
        await noOverflow(page, `${name} ${theme} ${lang}`);
        await targets(page, `${name} ${lang}`);
        if (lang === 'en') assert.deepEqual(await untranslated(page), [], `${name}: untranslated Vietnamese in the pair card`);
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
    console.log('PASS owner pair card: install steps + illustrations, waiting marker, manual code + countdown, download link, revoke; VI/EN; 320/375/820/1280; light/dark; no overflow; ≥44 px');

    // 1b. One click: an installed extension answers the ping → "Pair now" hands it a fresh code.
    for (const [theme, lang] of [['light', 'en'], ['dark', 'vi']]) {
      const posts: any[] = [];
      const { page, context, errors } = await open({ viewport: sizes.desktop, theme, posts, ext: 'ready' });
      await setLang(page, lang); await kitchen(page);
      const card = page.locator('#kitchen-family .scout-pair-card');
      await card.locator('[data-scout-state="ready"]').waitFor();
      assert.equal(new URL(page.url()).searchParams.has('scout-wait'), false, 'no waiting marker once installed');
      await page.evaluate(() => { (globalThis as any).eval('scoutData.postcode="2216"'); document.querySelector('.scout-pair-card')?.scrollIntoView({ block: 'start' }); });
      await noOverflow(page, 'ready ' + lang); await targets(page, 'ready ' + lang);
      if (shots) await page.screenshot({ path: `${shotDir}/ready-desktop-1280x800-${lang}-${theme}.png` });
      await card.locator('[data-scout-pair-now]').click();
      await card.locator('[data-scout-state="paired"]').waitFor();
      const msgs = await page.evaluate(() => (globalThis as any).__extMsgs.filter((m: any) => m.msg.type === 'pair'));
      assert.deepEqual(msgs.map((m: any) => m.msg), [{ type: 'pair', code: 'QAPX7K2M', postcode: '2216', name: 'Chrome · ' + (lang === 'vi' ? 'máy tính' : 'computer') }], 'fresh one-time code + family postcode handed to the extension');
      assert.equal(posts.filter(p => p.op === 'pair-code').length, 1);
      assert.doesNotMatch(await card.innerText(), /QAPX/, 'one-click code is never shown');
      assert.match(await card.innerText(), lang === 'vi' ? /Đã ghép máy tính[\s\S]*Dùng tên này/ : /Computer paired[\s\S]*Use this name/);
      await card.locator('.scout-this-pc').waitFor();
      await noOverflow(page, 'paired ' + lang); await targets(page, 'paired ' + lang);
      if (lang === 'en') assert.deepEqual(await untranslated(page), [], 'paired: untranslated Vietnamese');
      if (shots) { await page.evaluate(() => document.querySelector('.scout-pair-card')?.scrollIntoView({ block: 'start' })); await page.screenshot({ path: `${shotDir}/paired-desktop-1280x800-${lang}-${theme}.png` }); }
      assert.deepEqual(errors, []); await context.close();
    }
    console.log('PASS Pair now: detection by ping, code + postcode handed to the extension, paired state, this-computer chip');

    // 1c. Install detected by polling; store buttons only when configured; Edge wording.
    {
      const { page, context } = await open({ viewport: sizes.desktop, store: { chrome: 'https://chromewebstore.google.com/detail/famtray-scout/abcdefghijklmnopabcdefghijklmnop' } });
      await kitchen(page); const card = page.locator('#kitchen-family .scout-pair-card');
      await card.locator('[data-scout-state="install"]').waitFor();
      assert.equal(await card.locator('[data-scout-store]').getAttribute('href'), 'https://chromewebstore.google.com/detail/famtray-scout/abcdefghijklmnopabcdefghijklmnop');
      assert.match(await card.locator('[data-scout-store]').innerText(), /Chrome Web Store/);
      if (shots) { await page.evaluate(() => document.querySelector('.scout-pair-card')?.scrollIntoView({ block: 'start' })); await page.screenshot({ path: `${shotDir}/store-button-desktop-1280x800-vi-light.png` }); }
      await page.evaluate(() => { (globalThis as any).__fakeExt = 'ready'; });
      await card.locator('[data-scout-state="ready"]').waitFor({ timeout: 8000 });
      await context.close();
    }
    {
      const { page, context } = await open({ viewport: sizes.desktop, ua: UA.edge, store: { chrome: 'https://chromewebstore.google.com/detail/x/abcdefghijklmnopabcdefghijklmnop', edge: 'https://microsoftedge.microsoft.com/addons/detail/famtray-scout/abc' } });
      await setLang(page, 'en'); await kitchen(page); const card = page.locator('#kitchen-family .scout-pair-card');
      await card.locator('[data-scout-state="install"]').waitFor();
      assert.equal(await card.locator('[data-scout-ext-page]').inputValue(), 'edge://extensions');
      assert.match(await card.locator('[data-scout-store]').innerText(), /Edge Add-ons/); assert.match(await card.locator('[data-scout-store]').getAttribute('href') || '', /microsoftedge/);
      await context.close();
    }
    console.log('PASS install polling, store button only when configured (Chrome / Edge), edge://extensions');

    // 1d. Phones, iPad (desktop-style UA + touch) and Android tablets: no extension, no zip.
    for (const [label, opt, size, re] of [
      ['phone', { ua: UA.iphone }, sizes.mobile, /Trên điện thoại/],
      ['ipad', { ua: UA.ipad, touch: 5, platform: 'MacIntel' }, sizes.tablet, /Trên iPad\/máy tính bảng/],
      ['android-tablet', { ua: UA.androidTablet, touch: 10 }, sizes.tablet, /Trên iPad\/máy tính bảng/],
    ] as [string, Opt, { width: number; height: number }, RegExp][]) {
      for (const [theme, lang] of [['light', 'vi'], ['dark', 'en']]) {
        const { page, context, errors } = await open({ ...opt, viewport: size, theme, download: true, ext: null });
        await setLang(page, lang); await kitchen(page);
        const card = page.locator('#kitchen-family .scout-pair-card');
        await card.locator('[data-scout-state="mobile"]').waitFor();
        if (lang === 'vi') assert.match(await card.innerText(), re, label + ' wording');
        else assert.match(await card.innerText(), label === 'phone' ? /On a phone, use a price screenshot or say the price/ : /On iPad\/tablets, use a price screenshot or say the price/);
        assert.equal(await card.locator('a[href$=".zip"]').count(), 0, label + ': no zip download');
        assert.equal(await card.locator('.scout-pair-manual, [data-scout-pair-now], .scout-install-steps').count(), 0, label + ': no install or pairing controls');
        assert.equal(await card.locator('[data-scout-open-link]').inputValue(), origin + '/', 'copyable app link');
        assert.equal(await card.locator('[data-scout-pair-shot]').count(), 1); assert.equal(await card.locator('[data-scout-pair-voice]').count(), 1);
        assert.equal(await page.evaluate(() => (globalThis as any).__extMsgs.length), 0, label + ': never pings an extension');
        await page.evaluate(() => document.querySelector('.scout-pair-card')?.scrollIntoView({ block: 'start' }));
        await noOverflow(page, label + ' ' + lang); await targets(page, label + ' ' + lang);
        if (lang === 'en') assert.deepEqual(await untranslated(page), [], label + ': untranslated Vietnamese');
        if (shots) await page.screenshot({ path: `${shotDir}/${label}-${size.width}x${size.height}-${lang}-${theme}.png` });
        // "Say a price" opens the voice price entry.
        await card.locator('[data-scout-pair-voice]').click(); await page.waitForTimeout(400);
        assert.equal(await page.locator('.kitchen-hub').count(), 0, 'My kitchen closed for the voice entry');
        assert.deepEqual(errors, []); await context.close();
      }
    }
    {
      const { page, context } = await open({ ua: UA.firefox, viewport: sizes.desktop });
      await kitchen(page); const card = page.locator('#kitchen-family .scout-pair-card');
      await card.locator('[data-scout-state="browser"]').waitFor(); assert.match(await card.innerText(), /Chrome hoặc Edge/);
      await context.close();
    }
    console.log('PASS phone, iPad (MacIntel + touch), Android tablet: open-on-a-computer + screenshot/voice, no zip; other desktop browsers told to use Chrome/Edge');

    // 2. Who sees it: trusted non-owner yes; plain member no; device-only no.
    {
      const { page, context } = await open({ role: 'editor', trusted: true }); await kitchen(page);
      await page.locator('#kitchen-family .scout-pair-card').waitFor();
      // Community prices read by the extension carry a "Scout" label in Price Scout.
      const row = (sources: string[]) => page.evaluate((sources: string[]) => (globalThis as any).scoutCommunityRow({ groupId: 'g', itemId: 'nuoc-mam', label: 'Synthetic fish sauce', retailer: 'woolworths', branchLabel: 'Rockdale 2216', status: 'confirmed', price: 4.2, families: 2, ageDays: 0, sources }), sources);
      assert.match(await row(['scout']), /class="scout-src-chip"[^>]*>🔎 Máy So Giá</, 'Scout label on Scout prices');
      assert.doesNotMatch(await row(['shelf-photo']), /scout-src-chip/, 'no Scout label on family photos');
      // v1.7: the capture time shown next to a community price is the capture time itself, in local time.
      const at = new Date(Date.now() - 2 * 3600000).toISOString(), old = new Date(Date.now() - 9 * 86400000).toISOString();
      const capRow = (capturedAt: string) => page.evaluate(([capturedAt]: string[]) => (globalThis as any).scoutCommunityRow({ groupId: 'g', itemId: 'nuoc-mam', label: 'Synthetic fish sauce', retailer: 'woolworths', branchLabel: 'Rockdale 2216', status: 'confirmed', price: 4.2, families: 2, ageDays: 0, sources: ['scout'], capturedAt, sourceCaptured: { scout: capturedAt } }), [capturedAt]);
      const html = await capRow(at);
      assert.match(html, new RegExp(`data-captured="${at.replace(/[.]/g, '\\.')}"`), 'time shown = capture time');
      const local = await page.evaluate((at: string) => { const d = new Date(at); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }, at);
      assert.match(html, new RegExp('🔎 Máy So Giá · 2 giờ trước · T\\d|CN \\d\\d\\/\\d\\d ' + local), 'VI relative + absolute local time: ' + html.match(/scout-captured[^<]*/)?.[0]);
      assert.ok(html.includes(local), 'local clock time shown');
      assert.match(await capRow(old), /scout-captured scout-old[^>]*>[^<]*· cũ</, 'old prices muted');
      await context.close();
    }
    // v1.7.1 (owner): only accounts assigned in Studio see anything about the extension — not even a "not allowed" note.
    const EXT_UI = '.scout-pair-card, .scout-found-banner:not(.scout-signin-banner), #settings-price-check, [data-scout-download], .scout-install-steps, a[href*="famtray-scout.zip"]';
    const extWords = /FamTray So Giá|FamTray Price Check|tiện ích|extension|Ghép máy tính|Pair this computer/i;
    for (const opt of [{ role: 'editor', trusted: false }, { role: 'owner', assigned: false }, { role: 'editor', trusted: true, assigned: false }, { account: false }] as Opt[]) {
      const { page, context } = await open({ ...opt, ext: 'ready', viewport: sizes.desktop }); await page.waitForTimeout(1200);
      assert.equal(await page.locator(EXT_UI).count(), 0, 'Today: no extension UI for ' + JSON.stringify(opt));
      await kitchen(page); await page.waitForTimeout(800);
      assert.equal(await page.locator(EXT_UI).count(), 0, 'My kitchen: no extension UI for ' + JSON.stringify(opt));
      assert.doesNotMatch(await page.locator('.modal').innerText(), extWords, 'My kitchen mentions no extension for ' + JSON.stringify(opt));
      await page.keyboard.press('Escape'); await page.evaluate(() => (globalThis as any).otherSettingsModal('')); await page.locator('.modal.account-sheet').waitFor(); await page.waitForTimeout(800);
      assert.equal(await page.locator(EXT_UI).count(), 0, 'Account & settings: no extension entry for ' + JSON.stringify(opt));
      assert.doesNotMatch(await page.locator('.modal').innerText(), extWords, 'Account & settings mention no extension for ' + JSON.stringify(opt));
      await page.keyboard.press('Escape');
      for (const h of ['#pair-extension', '#kitchen-family-pair']) { await page.goto(origin + '/' + h, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(2500); assert.equal(await page.locator(EXT_UI).count(), 0, h + ': nothing for ' + JSON.stringify(opt)); assert.equal(await page.evaluate(() => (globalThis as any).__extMsgs.filter((m: any) => m.msg.type === 'pair').length), 0, 'never pairs: ' + JSON.stringify(opt)); }
      await context.close();
    }
    { const { page, context } = await open({ role: 'editor', assigned: true }); await kitchen(page); await page.locator('#kitchen-family .scout-pair-card').waitFor(); await context.close(); }
    console.log('PASS extension UI only for accounts assigned in Studio (any family role but view-only); unassigned owners/members and device-only use see none of it in Today, My kitchen, Account & settings or the deep links');

    // 2b. One-step pairing (v1.7.1): banner on Today when the installed extension is not paired; the tap is the confirmation.
    for (const lang of ['vi', 'en']) for (const [name, viewport] of [['desktop', sizes.desktop], ['tablet', sizes.tablet], ['mobile', sizes.mobile]] as const) {
      const { page, context, errors } = await open({ ext: 'ready', viewport, theme: lang === 'en' ? 'dark' : 'light' }); await setLang(page, lang);
      const banner = page.locator('#main > .scout-found-banner:not(.scout-granted-notice)'); await banner.waitFor({ timeout: 10000 });
      assert.match(await banner.innerText(), lang === 'vi' ? /Đã thấy FamTray So Giá trên máy này/ : /Found FamTray Price Check on this computer/);
      await page.waitForTimeout(1500); assert.equal(await page.evaluate(() => (globalThis as any).__paired === true), false, 'never pairs without the tap');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'banner: no overflow ' + name);
      const small = await banner.locator('button').evaluateAll((els: any[]) => els.filter(e => e.getBoundingClientRect().height < 44).length); assert.equal(small, 0, 'banner targets ≥ 44 px');
      if (lang === 'vi' || name === 'desktop') { mkdirSync('docs/reviews/v1.7.1/rename', { recursive: true }); await page.screenshot({ path: `docs/reviews/v1.7.1/rename/banner-${name}-${viewport.width}x${viewport.height}-${lang}.png` }); }
      await banner.locator('[data-scout-found-pair]').click();
      await banner.locator('[data-scout-found-close]').waitFor({ timeout: 10000 });
      assert.equal(await page.evaluate(() => (globalThis as any).__paired), true, 'one tap paired');
      assert.equal(await page.evaluate(() => (globalThis as any).__extMsgs.filter((m: any) => m.msg.type === 'pair').length), 1, 'exactly one pair message');
      assert.deepEqual(errors, []); await context.close();
      if (name !== 'desktop') break;
    }
    { // Already paired: no banner. Dismissed for today: gone after reload, but #pair-extension (from the popup) still asks.
      const p1 = await open({ ext: 'paired', viewport: sizes.desktop }); await p1.page.waitForTimeout(2000); assert.equal(await p1.page.locator('.scout-found-banner').count(), 0, 'no banner when already paired'); await p1.context.close();
      const { page, context } = await open({ ext: 'ready', viewport: sizes.desktop });
      await page.locator('[data-scout-found-later]').click(); assert.equal(await page.locator('.scout-found-banner').count(), 0);
      await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(2500); assert.equal(await page.locator('.scout-found-banner').count(), 0, 'dismissed for the day');
      await page.goto(origin + '/#pair-extension', { waitUntil: 'domcontentloaded' });
      const banner = page.locator('#main > .scout-found-banner:not(.scout-granted-notice)'); await banner.waitFor({ timeout: 10000 });
      assert.match(await banner.innerText(), /Bấm “Ghép ngay” để xác nhận/, 'asks for the confirming tap');
      assert.equal(new URL(page.url()).hash, '#today', 'one-shot link cleared');
      await page.waitForTimeout(1500); assert.equal(await page.evaluate(() => (globalThis as any).__paired === true), false, 'the link alone never pairs');
      await page.screenshot({ path: 'docs/reviews/v1.7.1/rename/pair-extension-desktop-1280x800-vi.png' });
      await banner.locator('[data-scout-found-pair]').click(); await banner.locator('[data-scout-found-close]').waitFor();
      assert.equal(await page.evaluate(() => (globalThis as any).__paired), true);
      // Avatar sheet entry → My kitchen pairing card; #kitchen-family-pair does the same.
      await page.evaluate(() => (globalThis as any).otherSettingsModal('')); const entry = page.locator('#settings-price-check'); await entry.waitFor();
      assert.match(await entry.innerText(), /So Giá trên máy tính/);
      await entry.locator('[data-scout-open-pair]').click(); await page.locator('.kitchen-hub .scout-pair-card.scout-pair-highlight').waitFor({ timeout: 10000 });
      await page.keyboard.press('Escape'); await page.goto(origin + '/#kitchen-family-pair', { waitUntil: 'domcontentloaded' }); await page.locator('.kitchen-hub .scout-pair-card').waitFor({ timeout: 25000 });
      await context.close();
      // Signed out + #pair-extension: a plain sign-in prompt (no extension wording).
      const so = await open({ account: false, ext: 'ready', viewport: sizes.desktop, hash: '#pair-extension' }); const sb = so.page.locator('.scout-signin-banner'); await sb.waitFor({ timeout: 10000 });
      assert.doesNotMatch(await sb.innerText(), extWords); assert.equal(await sb.locator('a[href*="/login"]').count(), 1); await so.context.close();
    }
    // (b) one-time notice after Studio assigns the account; (a) the avatar entry on phones: Open on a computer + Copy + Share.
    for (const [name, viewport, ua] of [['mobile', sizes.mobile, UA.iphone], ['desktop', sizes.desktop, undefined]] as const) {
      const { page, context, errors } = await open({ grantedAt: '2026-11-01T09:00:00.000Z', viewport, ua });
      const notice = page.locator('#main > .scout-granted-notice'); await notice.waitFor({ timeout: 10000 });
      assert.match(await notice.innerText(), /Bạn đã được cấp quyền So Giá.*Cài trên máy tính/s);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'notice: no overflow ' + name);
      await page.screenshot({ path: `docs/reviews/v1.7.1/rename/granted-notice-${name}-${viewport.width}x${viewport.height}-vi.png` });
      await notice.locator('[data-scout-granted-open]').click();
      const entry = page.locator('#settings-price-check'); await entry.waitFor({ timeout: 10000 });
      if (name === 'mobile') {
        assert.match(await entry.innerText(), /Mở trên máy tính/); assert.equal(await entry.locator('[data-scout-open-link]').inputValue(), origin + '/');
        await page.evaluate(() => { (navigator as any).share = (d: any) => { (globalThis as any).__shared = d; return Promise.resolve(); }; });
        await entry.locator('[data-scout-share]').click(); await page.waitForFunction(() => (globalThis as any).__shared);
        assert.equal(await page.evaluate(() => (globalThis as any).__shared.url), origin + '/', 'Share sends the app link');
        assert.equal(await entry.locator('[data-scout-open-pair]').count(), 0, 'no install button on a phone');
        await entry.scrollIntoViewIfNeeded(); await page.screenshot({ path: 'docs/reviews/v1.7.1/rename/settings-entry-mobile-375x812-vi.png' });
      } else assert.equal(await entry.locator('[data-scout-open-pair]').count(), 1, 'desktop: install & pair button');
      await page.keyboard.press('Escape'); await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(2500);
      assert.equal(await page.locator('.scout-granted-notice').count(), 0, 'notice shown only once'); assert.deepEqual(errors, []); await context.close();
    }
    { const { page, context } = await open({ grantedAt: '2026-11-01T09:00:00.000Z', assigned: false, viewport: sizes.desktop }); await page.waitForTimeout(2500); assert.equal(await page.locator('.scout-granted-notice').count(), 0, 'assignment removed → no notice'); await context.close(); }
    console.log('PASS one-time "you can now use Price Check" notice on Today (once, hidden again when the assignment is removed); Account & settings entry: desktop install & pair, phone Open on a computer with Copy + Share');
    console.log('PASS one-step pairing: banner on Today (VI/EN, 375/820/1280, light/dark), one tap pairs and never without it, hidden when paired, dismissible for the day, #pair-extension asks to confirm, sign-in first when signed out, avatar entry and #kitchen-family-pair open the card');

    // 3. Offline: the card says a connection is needed; no request is made.
    {
      const posts: any[] = [];
      const { page, context } = await open({ posts }); await context.setOffline(true); await page.waitForTimeout(200); await kitchen(page);
      const card = page.locator('#kitchen-family .scout-pair-card'); await card.waitFor();
      assert.equal(await card.locator('[data-scout-pair]').count(), 0); assert.match(await card.innerText(), /Cần mạng để tạo mã ghép nối/);
      await context.setOffline(false); await page.waitForTimeout(300);
      await card.locator('[data-scout-pair]').waitFor({ state: 'attached' });
      assert.equal(posts.length, 0); await context.close();
    }
    console.log('PASS offline pair card');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exit(1); });
