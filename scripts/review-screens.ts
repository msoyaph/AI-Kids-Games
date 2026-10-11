// Visual review: screenshot every page on desktop, tablet and phone in light and dark mode.
// Usage: npx tsx scripts/review-screens.ts <out-dir> [base-url] [--only=home,details] [--motion]
// Serve the production build first (npm run preview). Reduced motion is on by default so
// frames are stable; --motion shows what the preview videos look like mid-play.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, devices } from 'playwright';

const args = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
const out = args[0] ?? 'review'; const base = (args[1] ?? 'http://127.0.0.1:4190').replace(/\/$/,'');
const only = process.argv.find(arg => arg.startsWith('--only='))?.slice(7).split(',');
const motion = process.argv.includes('--motion');
mkdirSync(out,{ recursive: true });
const pages: [string,string][] = [['home','/'],['search','/games'],['category','/category/action'],['details','/game/light-crossing'],['details-theabonk','/game/theabonk'],['favorites','/favorites'],['parents','/parents'],['privacy','/privacy'],['about','/about'],['not-found','/nope'],['play','/play/vanex-defense']];
const viewports = [
  { name: 'desktop',options: { viewport: { width: 1440,height: 900 } } },
  { name: 'tablet',options: { ...devices['iPad Pro 11'],defaultBrowserType: undefined } },
  { name: 'phone',options: { ...devices['iPhone 13'],defaultBrowserType: undefined } }
];
const browser = await chromium.launch({ channel: 'chromium',args: ['--use-angle=metal','--enable-gpu','--ignore-gpu-blocklist'] });
for (const viewport of viewports) for (const scheme of ['light','dark'] as const) {
  const context = await browser.newContext({ ...viewport.options,colorScheme: scheme,reducedMotion: motion ? 'no-preference' : 'reduce' });
  await context.addInitScript(() => { try { localStorage.setItem('aikg:favorites',JSON.stringify(['light-crossing','space-sky'])); localStorage.setItem('aikg:recent',JSON.stringify(['theabonk','calex-cart'])); } catch { /* no storage */ } });
  const page = await context.newPage();
  for (const [name,path] of pages) {
    if (only && !only.includes(name)) continue;
    await page.goto(base+path,{ waitUntil: 'networkidle' });
    // Scroll through once so lazy images load before the full-page capture.
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += innerHeight/2) { scrollTo(0,y); await new Promise(done => setTimeout(done,60)); } scrollTo(0,0); });
    await page.waitForLoadState('networkidle');
    if (name === 'play') await page.waitForTimeout(600); else await page.waitForTimeout(400);
    await page.screenshot({ path: join(out,`${name}-${viewport.name}-${scheme}.png`),fullPage: name !== 'play' });
  }
  await context.close();
}
await browser.close();
console.log(`screenshots in ${out}`);
