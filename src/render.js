// Renders poster HTML to a 1080x1350 PNG with Playwright Chromium.

import { chromium } from 'playwright';

let browserPromise = null;

async function getBrowser() {
  if (!browserPromise) browserPromise = chromium.launch();
  return browserPromise;
}

export async function renderHtmlToPng(html, outPath) {
  const browser = await getBrowser();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
  try {
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    // Give the compositor a beat for web-font relayout and image decode.
    await page.waitForTimeout(150);
    await page.screenshot({ path: outPath, type: 'png' });
  } finally {
    await page.close();
  }
}

export async function closeBrowser() {
  if (browserPromise) {
    const b = await browserPromise;
    await b.close();
    browserPromise = null;
  }
}
