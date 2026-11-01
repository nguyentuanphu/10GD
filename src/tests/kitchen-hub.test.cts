import assert from 'node:assert/strict';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { webcrypto } from 'node:crypto';
import { chromium } from 'playwright';

// My kitchen hub, confirmations, scoped cross-tab storage and cached-identity startup.
// Set KITCHEN_SCREENSHOTS=1 to refresh the review screenshots in docs/reviews/v1.5.
const origin = 'https://kitchen.test';
const shots = process.env.KITCHEN_SCREENSHOTS === '1';
const mime = { '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp' };
const VIETNAMESE = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
const b64url = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
async function signedGrant(status: Record<string, unknown>) {
  const pair = await webcrypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const payload = b64url(new TextEncoder().encode(JSON.stringify({ ...status, version: 1, expires: Date.now() + 86400000, trusted: true, session: 'qa-session' })));
  const signature = new Uint8Array(await webcrypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, pair.privateKey, new TextEncoder().encode(payload)));
  return { payload, signature: b64url(signature), publicKey: await webcrypto.subtle.exportKey('jwk', pair.publicKey) };
}
const household = (id = 'qa', role = 'owner') => ({ configured: true, connected: true, mode: 'account', account: { username: 'qa', name: 'QA' }, household: { id, name: 'QA kitchen', role } });

async function main() {
  const browser = await chromium.launch();
  try {
    type Options = { account?: boolean; grant?: unknown; viewport?: { width: number; height: number }; status?: () => Promise<Record<string, unknown> | number>; theme?: string; members?: number };
    async function open({ account = true, grant = null, viewport = { width: 375, height: 812 }, status, theme = 'light', members = 1 }: Options = {}) {
      const context = await browser.newContext({ viewport, serviceWorkers: 'block', reducedMotion: 'reduce' });
      await context.addInitScript(({ account, grant, theme }) => {
        if (sessionStorage.getItem('qa-init')) return; sessionStorage.setItem('qa-init', '1');
        localStorage.setItem('bep-theme-mode', theme);
        if (account) localStorage.setItem('bep-account-present', 'yes');
        if (grant) localStorage.setItem('bep-offline-access-v1', JSON.stringify(grant));
      }, { account, grant, theme });
      // Record every text the startup placeholder ever shows.
      await context.addInitScript(() => {
        (globalThis as any).__qaStartupText = [];
        new MutationObserver(() => { const p = document.querySelector('#startup-progress'); if (p) (globalThis as any).__qaStartupText.push(p.textContent); }).observe(document, { childList: true, subtree: true });
      });
      const page = await context.newPage();
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await context.route(origin + '/**', async route => {
        const url = new URL(route.request().url()), path = url.pathname, op = url.searchParams.get('op');
        if (path.startsWith('/.netlify/')) {
          if (path.includes('/accounts') && op === 'families') { await route.fulfill({ json: { families: [{ id: 'qa', name: 'QA kitchen', role: 'owner' }], account: { username: 'qa', name: 'QA' }, household: { id: 'qa' } } }); return; }
          if (path.includes('/accounts') && op === 'members') { await route.fulfill({ json: { name: 'QA kitchen', members: Array.from({ length: members }, (_, i) => ({ username: i ? 'member' + i : 'qa', name: i ? 'Người nhà ' + i : 'QA', role: i ? 'editor' : 'owner' })), invites: [] } }); return; }
          if (op === 'status') {
            const value = status ? await status() : account ? household() : { configured: true, connected: false, mode: 'guest' };
            if (typeof value === 'number') await route.fulfill({ status: value, json: { error: 'x' } }); else await route.fulfill({ json: value });
            return;
          }
          await route.fulfill({ json: op === 'state' ? { state: null, etag: null } : { announcements: [], devices: [] } });
          return;
        }
        const file = resolve('dist', path === '/' ? 'index.html' : path.slice(1));
        try { await route.fulfill({ contentType: mime[extname(file) as keyof typeof mime] || 'application/octet-stream', body: readFileSync(file) }); }
        catch { await route.fulfill({ status: 404, body: 'Not found' }); }
      });
      await page.goto(origin, { waitUntil: 'domcontentloaded' });
      return { page, context, errors };
    }
    const ready = async (page: any) => {
      await page.waitForFunction(() => (document.querySelector('#main')?.textContent?.length || 0) > 500 && !document.querySelector('#startup-progress'));
      await page.waitForTimeout(300);
      // A brand-new synthetic family may show the one-time setup prompt; close it.
      const prompt = await page.evaluate(() => document.querySelector('#modal-title')?.textContent || '');
      if (prompt) { await page.keyboard.press('Escape'); }
      return prompt;
    };

    // 1. A cached identity opens the kitchen while the account check is still pending.
    {
      let release: (value: Record<string, unknown>) => void = () => {};
      const pending = new Promise<Record<string, unknown>>(r => { release = r; });
      const grant = await signedGrant(household());
      const { page, context, errors } = await open({ grant, status: () => pending });
      const started = Date.now();
      await ready(page);
      assert.ok(Date.now() - started < 8000, 'content visible before the account check resolves');
      assert.equal(await page.evaluate(() => (globalThis as any).BEP_STARTUP?.cachedIdentity), true);
      assert.equal(await page.evaluate(() => (globalThis as any).BEP_SESSION?.household?.id), 'qa');
      const texts: string[] = await page.evaluate(() => (globalThis as any).__qaStartupText);
      assert.ok(texts.every(t => !t?.trim()), 'startup placeholder has no visible text: ' + JSON.stringify(texts));
      assert.doesNotMatch(await page.locator('body').innerText(), /Đang mở bếp|Opening your kitchen/);
      assert.doesNotMatch(await page.locator('#family-summary').innerText(), /Sydney/, 'no hardcoded city');
      assert.doesNotMatch(readFileSync('dist/index.html', 'utf8'), /thành viên · Sydney|>Nhà mình</, 'shell has a neutral sidebar skeleton');
      await page.evaluate(() => { (globalThis as any).__qaSamePage = true; });
      release(household());
      await page.waitForTimeout(400);
      assert.equal(await page.evaluate(() => (globalThis as any).__qaSamePage), true, 'same identity does not reload');
      assert.deepEqual(errors, []);
      await context.close();
      console.log('PASS cached identity startup shows content before the account check, without loading text');
    }
    {
      // A different family from the live check reloads into the new identity once.
      let calls = 0;
      const grant = await signedGrant(household('old-family'));
      const { page, context } = await open({ grant, status: async () => { calls++; return household('qa'); } });
      await page.waitForFunction(() => (globalThis as any).BEP_SESSION?.household?.id === 'qa' && (document.querySelector('#main')?.textContent?.length || 0) > 500, null, { timeout: 15000 });
      await page.waitForTimeout(500);
      assert.equal(await page.evaluate(() => (globalThis as any).BEP_STARTUP?.cachedIdentity), false, 'reload confirms before using a cache');
      assert.ok(calls >= 2 && calls <= 6, 'no reload loop: ' + calls);
      await context.close();
      console.log('PASS changed family from the live check reloads once without a loop');
    }

    // 2. Cross-tab updates use the scoped storage key.
    {
      const { page, context } = await open({ account: false });
      await ready(page);
      const other = await context.newPage();
      await other.goto(origin, { waitUntil: 'domcontentloaded' });
      await ready(other);
      assert.equal(await page.evaluate(() => storageScope), 'guest/');
      await page.evaluate(() => { state.preferences.budget = 4321; save(); });
      await other.waitForFunction(() => state.preferences.budget === 4321, null, { timeout: 5000 });
      await context.close();
      console.log('PASS cross-tab storage listener follows the scoped storage key');
    }

    // 3. My kitchen order, Today invite rule, device-only and sign-out confirmations.
    {
      const { page, context, errors } = await open({ members: 1 });
      await ready(page);
      assert.equal(await page.locator('.kitchen-action-dock [data-personal=invite]').count(), 1, 'owner with one account sees Today invite');
      await page.locator('.top-avatar').click();
      await page.locator('.kitchen-hub').waitFor();
      const order = await page.$$eval('.kitchen-hub .kitchen-section', nodes => nodes.map(n => n.id));
      assert.deepEqual(order, ['kitchen-members', 'kitchen-family', 'kitchen-menu', 'kitchen-appearance', 'kitchen-currency', 'kitchen-reminders', 'kitchen-data', 'kitchen-account']);
      assert.equal(await page.locator('.kitchen-hub [data-personal=invite]').count(), 1, 'one invite button in My kitchen');
      assert.equal(await page.locator('.kitchen-hub #account-join').count(), 1, 'one join form');
      assert.equal(await page.locator('.kitchen-hub a[href*="mode=guest"]').count(), 0, 'device-only is not a plain link');
      assert.equal(await page.locator('#kitchen-account').evaluate((n: any) => n.open), false, 'account & security collapsed');
      // Offline: local sections stay usable; family management explains it needs internet.
      await page.keyboard.press('Escape');
      await page.evaluate(() => { (globalThis as any).BEP_OFFLINE = true; return settingsModal('family'); });
      await page.locator('#kitchen-family .callout:not(.join-status)').waitFor();
      assert.equal(await page.locator('.kitchen-hub #members-form input[name=budget], .kitchen-hub #settings-form input[name=budget]').count(), 1, 'menu preferences usable offline');
      assert.equal(await page.locator('.kitchen-hub [data-personal=invite]').count(), 0, 'no invite offline');
      await page.keyboard.press('Escape');
      await page.evaluate(() => { (globalThis as any).BEP_OFFLINE = false; return settingsModal('account'); });
      await page.locator('#kitchen-account[open]').waitFor();
      await page.locator('[data-personal=device-only]').click();
      const dialog = page.getByRole('alertdialog');
      await dialog.waitFor();
      assert.match(await dialog.innerText(), /Rời không gian gia đình và dùng riêng trên máy này\? Dữ liệu chỉ-trên-máy được giữ riêng, không gộp\./);
      assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-confirm')), 'no', 'focus starts on Cancel');
      for (const box of await page.$$eval('.confirm-actions .btn', nodes => nodes.map(n => n.getBoundingClientRect().height))) assert.ok(box >= 44, 'confirm buttons are at least 44px');
      await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
      assert.ok(await page.evaluate(() => !!document.activeElement?.closest('.confirm-dialog')), 'focus stays in the dialog');
      await page.keyboard.press('Escape');
      assert.equal(await dialog.count(), 0);
      assert.equal(await page.locator('.kitchen-hub').count(), 1, 'Escape closes only the confirmation');
      await page.evaluate(() => { cloudConnection.dirty = true; });
      await page.locator('[data-personal=device-only]').click();
      await page.locator('.confirm-warning').waitFor();
      if (shots) { mkdirSync('docs/reviews/v1.5/my-kitchen', { recursive: true }); await page.screenshot({ path: 'docs/reviews/v1.5/my-kitchen/confirm-device-only-375x812.png' }); }
      await page.getByRole('button', { name: 'Hủy', exact: true }).click();
      await page.locator('[data-personal=sign-out]').click();
      await dialog.waitFor();
      assert.match(await dialog.innerText(), /Đăng xuất khỏi máy này\?/);
      await page.getByRole('button', { name: 'Hủy', exact: true }).click();
      assert.equal(await page.evaluate(() => localStorage.getItem('bep-local-locked')), null, 'cancel keeps the account');
      await page.evaluate(() => { cloudConnection.dirty = false; });
      await page.locator('[data-personal=device-only]').click();
      await Promise.all([page.waitForURL(/mode=guest/), page.locator('[data-confirm=yes]').click()]);
      assert.equal(await page.evaluate(() => localStorage.getItem('bep-local-locked')), 'yes');
      assert.deepEqual(errors, []);
      await context.close();
      const busy = await open({ members: 3 });
      await ready(busy.page);
      await busy.page.waitForFunction(() => localStorage.getItem('account/qa/bep-connected-accounts') === '3');
      await busy.page.evaluate(() => render());
      assert.equal(await busy.page.locator('.kitchen-action-dock [data-personal=invite]').count(), 0, 'Today invite hidden once several accounts are connected');
      await busy.context.close();
      console.log('PASS My kitchen order, single invite/join entry, accessible device-only and sign-out confirmations');
    }

    // 4. English My kitchen has no untranslated Vietnamese (user content excluded), at every size.
    const sizes: Record<string, { width: number; height: number }> = { narrow: { width: 320, height: 740 }, mobile: { width: 375, height: 812 }, tablet: { width: 820, height: 1100 }, desktop: { width: 1280, height: 800 } };
    for (const account of [true, false]) for (const theme of ['light', 'dark']) for (const [name, viewport] of Object.entries(sizes)) {
      if (!shots && (theme === 'dark' || name === 'tablet' || name === 'narrow') && !(account && name === 'narrow')) continue;
      const { page, context, errors } = await open({ account, viewport, theme });
      await ready(page);
      if (shots && account && theme === 'light') { mkdirSync('docs/reviews/v1.5/startup', { recursive: true }); await page.screenshot({ path: `docs/reviews/v1.5/startup/today-${name}-${viewport.width}x${viewport.height}.png` }); }
      for (const lang of ['vi', 'en']) {
        if ((await page.locator('html').getAttribute('lang')) !== lang) await page.locator('#app-language').click();
        await page.evaluate(() => settingsModal());
        await page.locator('.kitchen-hub').waitFor();
        await page.waitForTimeout(150);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${name} page overflow`);
        assert.equal(await page.evaluate(() => { const m = document.querySelector('.modal')!; return m.scrollWidth > m.clientWidth + 1; }), false, `${name} My kitchen overflow`);
        if (shots && account) { mkdirSync('docs/reviews/v1.5/my-kitchen', { recursive: true }); await page.screenshot({ path: `docs/reviews/v1.5/my-kitchen/${account ? '' : 'device-'}${lang}-${theme}-${name}-${viewport.width}x${viewport.height}.png` }); }
        if (shots && theme === 'light' && (name === 'mobile' || name === 'desktop')) {
          for (const section of account ? ['family', 'account'] : ['family']) {
            await page.evaluate((id) => { const d = document.querySelector('#kitchen-account') as any; if (id === 'account' && d) d.open = true; document.querySelector('#kitchen-' + id)?.scrollIntoView({ block: 'start' }); }, section);
            await page.waitForTimeout(100);
            await page.screenshot({ path: `docs/reviews/v1.5/my-kitchen/${account ? '' : 'device-'}${lang}-${section}-${name}-${viewport.width}x${viewport.height}.png` });
          }
        }
        if (lang === 'en') {
          await page.evaluate(() => document.querySelectorAll('.kitchen-hub details').forEach((d: any) => { d.open = true; }));
          await page.waitForTimeout(100);
          const leftovers: string[] = await page.evaluate((pattern) => {
            const re = new RegExp(pattern, 'i'), found: string[] = [], root = document.querySelector('.modal')!;
            const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
            let node: Node | null;
            while ((node = walker.nextNode())) { const el = node.parentElement; if (!el || el.closest('[data-user-content]')) continue; if (re.test(node.nodeValue || '')) found.push((node.nodeValue || '').trim()); }
            for (const el of root.querySelectorAll('[aria-label],[placeholder],[title]')) for (const attr of ['aria-label', 'placeholder', 'title']) { const v = el.getAttribute(attr); if (v && re.test(v) && !el.closest('[data-user-content]')) found.push(attr + ': ' + v); }
            return found;
          }, VIETNAMESE.source);
          assert.deepEqual(leftovers, [], `${account ? 'account' : 'device'} ${name}: untranslated Vietnamese in My kitchen`);
          if (account && name === 'mobile' && theme === 'light') {
            await page.locator('[data-personal=device-only]').click();
            await page.getByRole('alertdialog').waitFor();
            assert.match(await page.getByRole('alertdialog').innerText(), /Use device-only/);
            if (shots) await page.screenshot({ path: 'docs/reviews/v1.5/my-kitchen/confirm-device-only-en-375x812.png' });
            await page.keyboard.press('Escape');
          }
        }
        await page.keyboard.press('Escape');
      }
      if (shots && account && theme === 'light' && name === 'mobile') {
        await page.locator('[data-ui-more]').click();
        await page.locator('.more-tools [data-personal=settings]').waitFor();
        await page.screenshot({ path: 'docs/reviews/v1.5/my-kitchen/more-menu-en-375x812.png' });
        await page.keyboard.press('Escape');
      }
      assert.deepEqual(errors, []);
      await context.close();
    }
    console.log('PASS My kitchen in Vietnamese and English without untranslated text or overflow (320/375/820/1280)');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
