// Tile screenshots into one image for quick review.
//   node scripts/montage.mjs out.png <columns> a.png b.png ...   (each tile 640x360, labelled)
import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const [, , out, cols, ...imgs] = process.argv;
const c = Number(cols);
const tiles = imgs
  .map((i) => `<div style="position:relative"><img src="data:image/png;base64,${fs.readFileSync(i).toString('base64')}" style="width:640px;height:360px;display:block;object-fit:cover"><span style="position:absolute;left:6px;bottom:4px;background:#000a;color:#fff;padding:1px 5px;font:14px sans-serif">${path.basename(i)}</span></div>`)
  .join('');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: c * 644, height: Math.ceil(imgs.length / c) * 364 } });
await page.setContent(`<body style="margin:0;background:#111;display:grid;grid-template-columns:repeat(${c},640px);gap:4px">${tiles}</body>`);
await page.waitForTimeout(200);
await page.screenshot({ path: out, fullPage: true });
await browser.close();
