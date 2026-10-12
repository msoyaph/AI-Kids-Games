// Render sim-report SVGs to PNG (for quick visual review). Usage: node scripts/svg2png.mjs file.svg [out.png]
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
const [inp, out = inp.replace(/\.svg$/, '.png')] = process.argv.slice(2);
const svg = readFileSync(inp, 'utf8');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 1000 } });
await page.setContent(`<html><body style="margin:0;background:#fff">${svg.replace(/width="\d+"/, 'width="1000"')}</body></html>`);
const el = await page.$('svg');
await el.screenshot({ path: out });
await browser.close();
console.log(out);
