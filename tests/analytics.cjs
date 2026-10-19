// Run after npm install: npm test
const { chromium } = require('playwright-core');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const origin = 'https://andredestro.github.io';
const key = 'andre_destro_analytics_consent';
const expectedAppCount = JSON.parse(fs.readFileSync(path.join(root, 'apps.json'), 'utf8')).apps.length;

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  try {
    async function fixture({ granted = false, slow = false, failCatalog = false, failImport = false } = {}) {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.addInitScript(({ granted, slow, key }) => {
        window.calls = []; window.imports = 0;
        window.support = slow ? new Promise(resolve => { window.finishSupport = resolve; }) : Promise.resolve(true);
        if (granted) localStorage.setItem(key, 'granted');
      }, { granted, slow, key });
      await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.hostname === 'www.gstatic.com') {
          if (failImport) return route.abort();
          const body = url.pathname.endsWith('firebase-app.js')
            ? 'export const initializeApp = config => (window.calls.push(["app"]), {});'
            : `window.imports++;
               export const isSupported = () => window.support;
               export const initializeAnalytics = (app, options) => (window.calls.push(['init', options]), {});
               export const setConsent = value => window.calls.push(['consent', value]);
               export const setAnalyticsCollectionEnabled = (app, value) => window.calls.push(['enabled', value]);
               export const logEvent = (app, name, params) => window.calls.push(['event', name, params]);`;
          return route.fulfill({ body, contentType: 'text/javascript', headers: { 'Access-Control-Allow-Origin': '*' } });
        }
        if (url.hostname !== 'andredestro.github.io' && url.hostname !== '127.0.0.1') return route.abort();
        if (failCatalog && url.pathname.endsWith('.json')) return route.fulfill({ status: 500, body: 'failed' });
        let file = path.join(root, url.pathname);
        try {
          if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
          return route.fulfill({ body: fs.readFileSync(file), contentType: ({ '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css' })[path.extname(file)] || 'application/octet-stream' });
        } catch {
          const notFoundPage = path.join(root, '404.html');
          if (fs.existsSync(notFoundPage)) {
            return route.fulfill({ status: 404, body: fs.readFileSync(notFoundPage), contentType: 'text/html' });
          }
          return route.fulfill({ status: 404, body: 'Not found' });
        }
      });
      return { context, page };
    }
    const events = page => page.evaluate(() => calls.filter(c => c[0] === 'event'));
    async function accept(page) { await page.click('#accept-analytics'); await page.waitForFunction(() => calls.some(c => c[0] === 'init')); }
    async function clickWithoutNavigation(page, selector) {
      await page.locator(selector).first().evaluate(el => { el.addEventListener('click', e => e.preventDefault(), { once: true }); el.click(); });
    }

    // Fresh visitor: no SDK before consent; current catalog state reported on accept.
    {
      const { page, context } = await fixture();
      await page.goto(origin + '/apps/'); await page.waitForSelector('.card');
      assert.equal(await page.evaluate(() => imports), 0);
      await clickWithoutNavigation(page, '.btn');
      assert.equal((await events(page)).length, 0);
      await accept(page);
      await page.waitForFunction(() => calls.some(c => c[1] === 'apps_load_success'));
      assert.equal((await events(page)).filter(c => c[1] === 'apps_load_success').length, 1);
      await clickWithoutNavigation(page, '.btn');
      const download = (await events(page)).find(c => c[1] === 'app_download_click');
      assert.equal(download[2].page_type, 'apps'); assert.match(download[2].destination_url, /ct=github_io/);
      await page.click('#cookie-settings'); await page.click('#decline-analytics');
      const count = (await events(page)).length;
      await clickWithoutNavigation(page, '.btn'); assert.equal((await events(page)).length, count);
      assert.equal(await page.evaluate(() => calls.filter(c => c[0] === 'enabled').at(-1)[1]), false);
      await context.close();
    }
    // Consent revoked while the SDK support check is pending must prevent initialization.
    {
      const { page, context } = await fixture({ slow: true });
      await page.goto(origin); await page.click('#accept-analytics');
      await page.waitForFunction(() => imports === 1);
      await page.click('#cookie-settings'); await page.click('#decline-analytics');
      await page.evaluate(() => finishSupport(true)); await page.waitForTimeout(50);
      assert.equal(await page.evaluate(() => calls.some(c => c[0] === 'init')), false);
      await context.close();
    }
    // Placement and internal navigation: a single semantic event per click.
    {
      const { page, context } = await fixture({ granted: true });
      await page.goto(origin); await page.waitForFunction(() => calls.some(c => c[0] === 'init'));
      for (const sel of ['.site-nav [data-social-link]', '.youtube-card', '.footer [data-social-link="youtube"]', '.apps-card']) await clickWithoutNavigation(page, sel);
      const recorded = await events(page);
      assert.deepEqual(recorded.filter(c => c[1] === 'social_link_click').map(c => c[2].link_placement), ['header', 'home_cards', 'footer']);
      assert.equal(recorded.filter(c => c[1] === 'navigation_click').length, 1);
      assert.equal(recorded.at(-1)[2].destination_path, '/apps/');
      await page.evaluate(key => { localStorage.setItem(key, 'denied'); dispatchEvent(new StorageEvent('storage', { key, newValue: 'denied' })); }, key);
      const count = (await events(page)).length;
      await clickWithoutNavigation(page, '.youtube-card'); assert.equal((await events(page)).length, count);
      await context.close();
    }
    // Setup and video catalogs have success/failure coverage; CTA is not double-counted.
    for (const route of ['/setup/', '/produtos/compras-amazon/', '/produtos/homelab/']) {
      for (const failCatalog of [false, true]) {
        const { page, context } = await fixture({ granted: true, failCatalog });
        await page.goto(origin + route);
        await page.waitForFunction(() => calls.some(c => c[0] === 'event' && c[1].startsWith('products_load_')));
        const recorded = await events(page);
        assert.equal(recorded[0][1], failCatalog ? 'products_load_error' : 'products_load_success');
        if (!failCatalog) {
          await clickWithoutNavigation(page, '.store-link');
          assert.equal((await events(page)).at(-1)[1], 'product_link_click');
          if (route.includes('produtos')) {
            await clickWithoutNavigation(page, '.setup-cta');
            assert.equal((await events(page)).at(-1)[1], 'setup_cta_click');
            assert.equal((await events(page)).filter(c => c[1] === 'navigation_click').length, 0);
          }
        }
        await context.close();
      }
    }
    // Local previews do not import Firebase, even with stored consent.
    {
      const { page, context } = await fixture({ granted: true });
      await page.goto('http://127.0.0.1/apps/'); await page.waitForSelector('.card');
      assert.equal(await page.evaluate(() => imports), 0); assert.equal((await events(page)).length, 0);
      await context.close();
    }
    // Blocked analytics cannot prevent rendering or following links.
    {
      const { page, context } = await fixture({ granted: true, failImport: true });
      await page.goto(origin + '/apps/'); await page.waitForSelector('.card');
      assert.equal(await page.locator('.card').count(), expectedAppCount);
      assert.equal(await page.evaluate(() => calls.length), 0);
      await context.close();
    }
    // The custom 404 uses its own stable type instead of the generic fallback.
    {
      const { page, context } = await fixture({ granted: true });
      await page.goto(origin + '/missing-page');
      await page.waitForFunction(() => calls.some(c => c[0] === 'init'));
      await clickWithoutNavigation(page, 'main a[href="/"]');
      const navigation = (await events(page)).find(c => c[1] === 'navigation_click');
      assert.equal(navigation[2].page_type, 'not_found');
      await context.close();
    }
    console.log('PASS: consent, initialization race, revocation, placements, catalog success/failure, CTA deduplication, local preview, blocked SDK, and 404 page type. No real Google requests sent.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
