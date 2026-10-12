// Dev helper: render covers (base + animated layers, frozen) and logos to PNG for review,
// with the age badge and heart drawn on top to check the safe area.
// Usage: npx tsx scripts/art/render.ts <out-dir> [slug...]
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { games } from '../../src/data/games';
import { serve } from '../capture/lib';
const [out,...only] = process.argv.slice(2);
mkdirSync(out,{ recursive: true });
const { server,origin } = await serve();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600,height: 900 } });
for (const game of games) {
  if (only.length && !only.includes(game.slug)) continue;
  const layers = game.coverLayers;
  const img = (src: string) => `<img src="${origin}/media/${game.slug}/${src}" style="position:absolute;inset:0;width:100%;height:100%">`;
  await page.setContent(`<body style="margin:0;background:#888"><div style="position:relative;width:1600px;height:900px;overflow:hidden">${img('cover.svg')}${layers.map(l => img(`cover-${l}.svg`)).join('')}
    <div style="position:absolute;top:44px;left:44px;padding:14px 26px;border-radius:999px;background:#fff;font:700 40px system-ui">Ages 6+</div>
    <div style="position:absolute;top:32px;right:32px;width:120px;height:120px;border-radius:50%;background:#fff"></div>
    <div style="position:absolute;inset:0 auto 0 0;width:96px;background:#f003"></div><div style="position:absolute;inset:0 0 0 auto;width:96px;background:#f003"></div><div style="position:absolute;inset:0 0 auto 0;height:198px;background:#f003"></div></div></body>`);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: join(out,`${game.slug}-cover.png`) });
  await page.setContent(`<body style="margin:0;background:conic-gradient(#ddd 25%,#fff 0 50%,#ddd 0 75%,#fff 0) 0 0/40px 40px"><img src="${origin}/media/${game.slug}/logo.svg" style="display:block;width:1000px;margin:60px auto"></body>`);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: join(out,`${game.slug}-logo.png`),fullPage: true }).catch(() => {});
}
await browser.close(); server.close();
