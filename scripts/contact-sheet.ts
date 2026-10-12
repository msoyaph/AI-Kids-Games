// Put many screenshots on one page to review them at a glance.
//   npx tsx scripts/contact-sheet.ts <out.jpg> <columns> <cell-width> <image>...
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

const [out, cols, cellW, ...files] = process.argv.slice(2);
const w = Number(cellW ?? 260);
const cells = files.map((f) => `<figure><img src="data:image/jpeg;base64,${readFileSync(f).toString('base64')}"><figcaption>${basename(f).replace(/\.jpg$/, '')}</figcaption></figure>`).join('');
const html = `<style>body{margin:0;background:#222;display:grid;grid-template-columns:repeat(${cols},${w}px);gap:6px;padding:6px;font:11px sans-serif;color:#eee}figure{margin:0}img{width:${w}px;display:block}figcaption{padding:2px 0}</style>${cells}`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: Number(cols) * (w + 6) + 6, height: 400 } });
await page.setContent(html);
await page.screenshot({ path: out!, fullPage: true, type: 'jpeg', quality: 80 });
await browser.close();
