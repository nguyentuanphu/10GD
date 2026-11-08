import assert from 'node:assert/strict';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { legacyBootstrap } from './fixtures/legacy-bootstrap.cjs';
import { chromium, webkit } from 'playwright';

const origin = 'https://kitchen.test';
const screenshots = 'docs/reviews/family-hub' + (process.env.QA_BROWSER === 'webkit' ? '/webkit' : '');
const mime = { '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp' };
async function main() {
  mkdirSync(screenshots, { recursive: true });
  const browser = await (process.env.QA_BROWSER === 'webkit' ? webkit : chromium).launch();
  try {
    async function open({ account = true, noHousehold = false, fault = '', baseline = false, viewport = { width: 375, height: 812 } } = {}) {
      const context = await browser.newContext({locale:'vi-VN', viewport, serviceWorkers: 'block', reducedMotion: 'reduce' });
      await context.addInitScript(account => {localStorage.setItem('qa-preserved','family-data-kept');if(account)localStorage.setItem('bep-account-present','yes')},account);
      const page = await context.newPage();
      if (fault === 'timeout') await page.clock.install();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route(origin + '/**', async route => {
        const path = new URL(route.request().url()).pathname;
        if (path.startsWith('/.netlify/')) {
          const op = new URL(route.request().url()).searchParams.get('op');
          // The families answer matches the status answer (same household). Before v1.6 a startup "new kitchen" modal hid that
          // this mock disagreed with status: opening My kitchen then reloaded to ?connect=1 (household changed).
          if (path.includes('/accounts') && op === 'families') { const household = account && !noHousehold ? { id: 'qa', name: 'QA kitchen', role: 'owner' } : null; await route.fulfill({json:{families:household?[household]:[],account:{username:'qa',name:'QA'},household}}); return; }
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
      if (name === 'mobile') {
        // v1.7.4: the bottom "Thêm / More" tab lines up with the other tabs (icon and label tops within 2 px).
        const tabs = await page.evaluate(() => [...document.querySelectorAll('#nav > a, #nav > .mobile-more')].filter((e: any) => e.getBoundingClientRect().height > 0).map((e: any) => { const i = e.querySelector('.nav-icon').getBoundingClientRect(), l = e.querySelector('span:not(.nav-icon)').getBoundingClientRect(); return { more: e.classList.contains('mobile-more'), icon: Math.round(i.top), iconH: Math.round(i.height), label: Math.round(l.top) }; }));
        const more = tabs.find((t: any) => t.more), first = tabs.find((t: any) => !t.more);
        assert.ok(more && first, 'mobile tabs found: ' + JSON.stringify(tabs));
        assert.ok(Math.abs(more.icon - first.icon) <= 2 && Math.abs(more.label - first.label) <= 2 && Math.abs(more.iconH - first.iconH) <= 2, 'More tab aligned with the other tabs: ' + JSON.stringify(tabs));
        // v1.7.4: "Các mục khác" rows share one layout — icon and label start at the same x on every row, incl. the guide row.
        await page.click('#nav .mobile-more'); await page.locator('.more-tools .more-guide').waitFor();
        const rows = await page.evaluate(() => [...document.querySelectorAll('.more-tools .more-row')].map((e: any) => [Math.round(e.querySelector('.more-icon').getBoundingClientRect().left), Math.round(e.querySelector('.more-label').getBoundingClientRect().left), Math.round(e.getBoundingClientRect().height)]));
        /* v1.7.17 (owner: sections already in the sliding bar are not repeated in More): guide and install remain */ assert.ok(rows.length >= 2 && rows.every((r: any) => r[0] === rows[0][0] && r[1] === rows[0][1] && r[2] >= 44), 'More sheet rows aligned: ' + JSON.stringify(rows));
        await page.click('#modal-root [data-action="close-modal"]');
      }
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
    await newcomer.page.locator('[data-device-mode]').waitFor();await newcomer.page.getByRole('button',{name:'Kết nối gia đình',exact:true}).click();
    // My kitchen opens at Family access: join is one collapsed form, create is secondary.
    await newcomer.page.locator('#kitchen-family #account-join').waitFor({state:'attached'});
    assert.equal(await newcomer.page.locator('#account-join').count(), 1, 'one join form');
    await newcomer.page.locator('[data-personal=new-family]').click();await newcomer.page.locator('#account-create').waitFor();
    assert.deepEqual(newcomer.errors, []);
    await newcomer.page.screenshot({ path: `${screenshots}/new-account.png`, fullPage: true });
    await newcomer.context.close();
    console.log('PASS account without household keeps device tools and offers optional create/join forms');
    const returning = await open();
    await returning.page.waitForFunction(() => (document.querySelector('#main')?.textContent?.length || 0) > 500);
    await returning.context.close();
    console.log('PASS personal account startup, failed download/timeout recovery and runtime failure recovery without deleting data');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
