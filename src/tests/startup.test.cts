import assert from 'node:assert/strict';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { legacyBootstrap } from './fixtures/legacy-bootstrap.cjs';
import { chromium, webkit } from 'playwright';

const origin = 'https://kitchen.test';
const screenshots = 'docs/reviews/startup-pack' + (process.env.QA_BROWSER === 'webkit' ? '/webkit' : '');
const mime = { '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp' };
async function main() {
  mkdirSync(screenshots, { recursive: true });
  const browser = await (process.env.QA_BROWSER === 'webkit' ? webkit : chromium).launch();
  try {
    async function open({ account = true, noHousehold = false, fault = '', baseline = false, viewport = { width: 375, height: 812 } } = {}) {
      const context = await browser.newContext({ viewport, serviceWorkers: 'block', reducedMotion: 'reduce' });
      await context.addInitScript(() => localStorage.setItem('qa-preserved', 'family-data-kept'));
      const page = await context.newPage();
      if (fault === 'timeout') await page.clock.install();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route(origin + '/**', async route => {
        const path = new URL(route.request().url()).pathname;
        if (path.startsWith('/.netlify/')) {
          const op = new URL(route.request().url()).searchParams.get('op');
          const status = { configured: true, connected: true, mode: account ? 'account' : 'legacy', ...(account ? { account: { username: 'qa', name: 'QA' }, household: noHousehold ? null : { id: 'qa', name: 'QA kitchen', role: 'owner' } } : {}) };
          await route.fulfill({ json: op === 'status' ? status : op === 'state' ? { state: null, etag: null } : { announcements: [], devices: [] } });
          return;
        }
        if (path === '/startup-scripts.json') {
          if (fault === 'timeout') return;
          if (fault === 'download') { await route.abort(); return; }
          const pack = JSON.parse(readFileSync('dist/startup-scripts.json', 'utf8'));
          if (fault === 'runtime') pack.scripts.find(entry => entry.name === 'app.js').code = 'throw new Error("Synthetic startup failure")';
          await route.fulfill({ json: pack }); return;
        }
        if (fault === 'download' && path === '/app.js') { await route.abort(); return; }
        if (fault === 'runtime' && path === '/app.js') { await route.fulfill({ contentType: 'application/javascript', body: 'throw new Error("Synthetic startup failure")' }); return; }
        if (baseline && path === '/bootstrap.js') {
          await route.fulfill({ contentType: 'application/javascript', body: legacyBootstrap }); return;
        }
        const file = resolve('dist', path === '/' ? 'index.html' : path.slice(1));
        try { await route.fulfill({ contentType: mime[extname(file)] || 'application/octet-stream', body: readFileSync(file) }); }
        catch { await route.fulfill({ status: 404, body: 'Not found' }); }
      });
      await page.goto(origin, { waitUntil: 'domcontentloaded' });
      return { page, context, errors };
    }
    // Prove the previous bootstrap leaves the photographed empty shell on a runtime failure.
    const baseline = await open({ baseline: true, fault: 'runtime' });
    await baseline.page.waitForTimeout(1000);
    assert.equal((await baseline.page.locator('#main').innerText()).trim(), '');
    assert.ok(baseline.errors.length);
    await baseline.context.close();
    console.log('PASS reproduces blank shell with previous loader and a synthetic runtime failure');
    for (const [name, viewport] of Object.entries({ mobile: { width: 375, height: 812 }, tablet: { width: 820, height: 1100 }, desktop: { width: 1280, height: 800 } })) {
      const { page, context, errors } = await open({ account: true, viewport });
      await page.waitForFunction(() => document.querySelector('.connectivity-status') || document.querySelector('[data-personal]'));
      await page.waitForTimeout(500);
      assert.ok((await page.locator('#main').innerText()).length > 500);
      await page.evaluate(() => { location.hash = 'shopping'; });
      await page.waitForTimeout(200);
      assert.match(await page.locator('#main').innerText(), /Đi chợ|Shopping/);
      await page.evaluate(() => { location.hash = 'planner'; });
      await page.waitForTimeout(200);
      assert.ok((await page.locator('#main').innerText()).length > 200);
      await page.evaluate(() => { document.querySelector('[data-action="settings"]').click(); });
      await page.waitForSelector('.modal');
      await page.keyboard.press('Escape');
      await page.locator('#app-language').click();
      assert.equal(await page.locator('html').getAttribute('lang'), 'en');
      await page.locator('#app-language').click();
      assert.equal(await page.locator('html').getAttribute('lang'), 'vi');
      await page.evaluate(() => { window.dispatchEvent(new Event('offline')); updateConnectivityIcon(); });
      assert.equal(await page.locator('#network-status').getAttribute('data-connection'), 'offline');
      await page.evaluate(() => { window.dispatchEvent(new Event('online')); });
      await page.waitForFunction(() => document.querySelector('#network-status')?.getAttribute('data-connection') === 'online');
      await page.evaluate(() => { location.hash = 'today'; });
      await page.waitForTimeout(200);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, name + ' horizontal overflow');
      assert.deepEqual(errors, []);
      await page.screenshot({ path: `${screenshots}/${name}.png`, fullPage: true });
      await context.close();
      console.log(`PASS account startup/navigation/settings/rendering at ${viewport.width}x${viewport.height}`);
      const failure = await open({ fault: 'runtime', viewport });
      await failure.page.getByRole('alert').waitFor();
      assert.match(await failure.page.getByRole('alert').innerText(), /app.js/);
      assert.equal(await failure.page.evaluate(() => localStorage.getItem('qa-preserved')), 'family-data-kept');
      assert.equal(await failure.page.getByRole('button', { name: 'Thử lại / Retry' }).count(), 1);
      await failure.page.screenshot({ path: `${screenshots}/${name}-recovery.png`, fullPage: true });
      await failure.context.close();
    }
    const download = await open({ fault: 'download' });
    await download.page.getByRole('alert').waitFor();
    assert.ok((await download.page.getByRole('alert').innerText()).length > 40);
    await download.context.close();
    const timeout = await open({ fault: 'timeout' });
    await timeout.page.waitForTimeout(500);
    await timeout.page.clock.fastForward(31000);
    await timeout.page.getByRole('alert').waitFor();
    assert.match(await timeout.page.getByRole('alert').innerText(), /quá lâu/);
    await timeout.context.close();
    const newcomer = await open({ account: true, noHousehold: true });
    await newcomer.page.locator('#account-create').waitFor();
    await newcomer.page.locator('#account-join').waitFor();
    assert.deepEqual(newcomer.errors, []);
    await newcomer.page.screenshot({ path: `${screenshots}/new-account.png`, fullPage: true });
    await newcomer.context.close();
    console.log('PASS personal account with no household shows create/join forms');
    const returning = await open();
    await returning.page.waitForFunction(() => (document.querySelector('#main')?.textContent?.length || 0) > 500);
    await returning.context.close();
    console.log('PASS personal account startup, failed download/timeout recovery and runtime failure recovery without deleting data');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
