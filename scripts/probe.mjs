// Dev helper: open the game in headless Chromium, run a JS snippet in the page, print the result.
// Usage: node scripts/probe.mjs <url> <snippet-file.js | -e "code"> [--shot out.png] [--size 1280x720] [--touch]
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const url = args[0] ?? 'http://localhost:5173';
let code = 'return document.title';
let shot = null;
let size = [1280, 720];
let touch = false;
for (let i = 1; i < args.length; i++) {
  if (args[i] === '-e') code = args[++i];
  else if (args[i] === '--shot') shot = args[++i];
  else if (args[i] === '--size') size = args[++i].split('x').map(Number);
  else if (args[i] === '--touch') touch = true;
  else code = readFileSync(args[i], 'utf8');
}

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: size[0], height: size[1] }, hasTouch: touch, isMobile: touch });
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`);
});
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
await page.goto(url);
try {
  await page.waitForFunction(() => window.__calex !== undefined, null, { timeout: 20000 });
} catch {
  console.log('timeout waiting for __calex');
}
const fn = new Function(`return (async () => { ${code} })()`);
try {
  const result = await page.evaluate(fn);
  console.log(typeof result === 'string' ? result : JSON.stringify(result, null, 2));
} catch (e) {
  console.log('EVAL ERROR', e.message);
}
if (shot) await page.screenshot({ path: shot });
if (errors.length) console.log('CONSOLE:\n' + errors.join('\n'));
await browser.close();
