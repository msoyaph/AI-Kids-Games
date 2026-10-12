// Render the marketing SVGs to PNG previews (dev check only).
import { chromium } from '@playwright/test';
const b = await chromium.launch();
for (const [f, w, h] of [['banner-16x9', 1280, 720], ['thumbnail-square', 512, 512]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto('file://' + process.cwd() + `/marketing/${f}.svg`);
  await p.screenshot({ path: process.argv[2] + `/${f}.png` });
}
await b.close();
