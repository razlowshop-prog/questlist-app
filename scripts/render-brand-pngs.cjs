// Renders assets/brand/*.svg to the PNGs app.json points at (needs Playwright + Chromium).
const path = require('path');
const fs = require('fs');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

const root = path.resolve(__dirname, '..');
const targets = {
  'icon.svg': 'assets/icon.png',
  'android-icon-foreground.svg': 'assets/android-icon-foreground.png',
  'android-icon-background.svg': 'assets/android-icon-background.png',
  'android-icon-monochrome.svg': 'assets/android-icon-monochrome.png',
  'splash-icon.svg': 'assets/splash-icon.png',
  'favicon.svg': 'assets/favicon.png',
};

(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  for (const [svg, png] of Object.entries(targets)) {
    const markup = fs.readFileSync(path.join(root, 'assets/brand', svg), 'utf8');
    const size = Number(/width="(\d+)"/.exec(markup)[1]);
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    await page.setContent(`<html><body style="margin:0;background:transparent">${markup}</body></html>`);
    await page.locator('body > svg').screenshot({ path: path.join(root, png), omitBackground: true });
    await page.close();
    console.log(png);
  }
  await browser.close();
})();
