#!/usr/bin/env node
/**
 * Real in-browser AMO screenshots on a live Gutenberg book.
 * Injects the production content-script bundle (same UI as the extension).
 *
 * Default book: Thus Spake Zarathustra
 *   https://www.gutenberg.org/cache/epub/1998/pg1998-images.html
 *
 * Usage:
 *   npm run build && node scripts/capture-amo-screenshots.mjs
 *   SCREENSHOT_URL=... node scripts/capture-amo-screenshots.mjs
 */
import { chromium } from 'playwright';
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const distDir = join(root, 'dist');
const outDir = join(root, 'store', 'screenshots');
const BOOK =
  process.env.SCREENSHOT_URL ||
  'https://www.gutenberg.org/cache/epub/1998/pg1998-images.html';

const asset = readdirSync(join(distDir, 'assets')).find((f) => f.startsWith('content.ts-') && f.endsWith('.js'));
if (!asset) {
  console.error('No content bundle in dist/assets — run npm run build');
  process.exit(1);
}
const bundlePath = join(distDir, 'assets', asset);
const bundle = readFileSync(bundlePath, 'utf8');
mkdirSync(outDir, { recursive: true });

// Stub chrome.storage so reading-theme works outside an extension process.
const chromeStub = `
window.chrome = window.chrome || {};
chrome.runtime = chrome.runtime || { lastError: null, id: 'screenshot-capture' };
chrome.storage = chrome.storage || {};
chrome.storage.local = chrome.storage.local || (function () {
  const mem = { pgGfoReadingDark: true };
  return {
    get(keys, cb) {
      const out = {};
      const list = Array.isArray(keys) ? keys : Object.keys(keys || {});
      for (const k of list) out[k] = mem[k];
      setTimeout(() => cb(out), 0);
    },
    set(obj, cb) {
      Object.assign(mem, obj);
      setTimeout(() => cb && cb(), 0);
    },
  };
})();
`;

const browser = await chromium.launch({
  headless: true,
  channel: 'chrome',
  args: ['--window-size=1280,800', '--hide-scrollbars'],
});
const page = await browser.newPage({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 1,
});
page.setDefaultTimeout(120_000);

console.log('Opening', BOOK);
await page.goto(BOOK, { waitUntil: 'domcontentloaded', timeout: 120_000 });
await page.waitForSelector('body');
// Let Gutenberg layout settle
await page.waitForTimeout(2500);

// Install chrome stub + extension bundle (same code shipped to users)
await page.addInitScript(chromeStub);
await page.evaluate((stub) => {
  // eslint-disable-next-line no-eval
  (0, eval)(stub);
}, chromeStub);
await page.evaluate((code) => {
  (0, eval)(code);
}, bundle);

// Shadow host often has zero layout box → Playwright "hidden"; attach is enough.
await page.waitForSelector('#pg-morph-outline-host', {
  state: 'attached',
  timeout: 20_000,
});
const mounted = await page.evaluate(() => {
  const h = document.querySelector('#pg-morph-outline-host');
  return {
    hasShadow: !!h?.shadowRoot,
    toggle: !!h?.shadowRoot?.querySelector('.morph-toggle'),
    ticks: h?.shadowRoot?.querySelectorAll('.tick-hit').length ?? 0,
  };
});
console.log('Outline host mounted', mounted);
if (!mounted.toggle) {
  console.error('UI did not render inside shadow root');
  await page.screenshot({ path: join(outDir, 'debug-no-ui.png') });
  await browser.close();
  process.exit(1);
}

async function drawerOpen() {
  return page.evaluate(() =>
    !!document.querySelector('#pg-morph-outline-host')?.shadowRoot?.querySelector('.viewer-drawer.open')
  );
}

async function clickShadow(sel) {
  await page.evaluate((sel) => {
    const el = document.querySelector('#pg-morph-outline-host')?.shadowRoot?.querySelector(sel);
    if (!el) throw new Error('missing ' + sel);
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
  }, sel);
}

async function ensureDrawer(open) {
  if ((await drawerOpen()) !== open) {
    await clickShadow('.morph-toggle');
    await page.waitForTimeout(450);
  }
}

async function ensureDark(dark) {
  const isDark = await page.evaluate(() =>
    document.documentElement.classList.contains('pg-gfo-dark')
  );
  if (isDark === dark) return;
  if (await drawerOpen()) {
    await clickShadow('.theme-toggle');
  } else {
    await page.keyboard.press('d');
  }
  await page.waitForTimeout(450);
}

async function shot(name) {
  const path = join(outDir, name);
  await page.screenshot({ path, type: 'png', animations: 'disabled' });
  console.log('wrote', path);
}

// Scroll into main text (past title clutter)
await page.evaluate(() => {
  const h = document.querySelector('h1, h2, .chapter');
  if (h) h.scrollIntoView({ block: 'start' });
  else window.scrollTo(0, 900);
});
await page.waitForTimeout(600);

// 01 — timeline rail visible, drawer closed, dark reading
await ensureDrawer(false);
await ensureDark(true);
await page.mouse.move(1260, 380);
await page.waitForTimeout(800);
await shot('01-timeline-scrubber.png');

// 02 — outline drawer open on real book
await ensureDrawer(true);
await ensureDark(true);
await page.waitForTimeout(500);
await shot('02-outline-drawer.png');

// 03 — dark mode reading (drawer closed)
await ensureDrawer(false);
await ensureDark(true);
await page.evaluate(() => window.scrollBy(0, 600));
await page.waitForTimeout(600);
await shot('03-reading-dark-mode.png');

// 04 — drawer + search filter on real outline
await ensureDrawer(true);
await ensureDark(true);
await page.evaluate(() => {
  const input = document
    .querySelector('#pg-morph-outline-host')
    ?.shadowRoot?.querySelector('.filter-input');
  if (!input) return;
  input.focus();
  input.value = 'zarathustra';
  input.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.waitForTimeout(500);
await shot('04-feature-overview.png');

await browser.close();
console.log('Done. Real captures from', BOOK);
