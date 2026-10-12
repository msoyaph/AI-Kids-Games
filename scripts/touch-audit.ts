// Touch audit: every screen (e2e/lib/screens.ts) on phone and tablet viewports, portrait and landscape,
// in Chromium and/or WebKit with touch emulation. Saves a screenshot per screen and a report of layout
// problems (off screen, under a notch, overlapping or small tap targets, HUD covering menus, tiny text).
//
//   npm run build && npx tsx scripts/touch-audit.ts --out docs/touch/after [--engines chromium,webkit]
//        [--viewports phone-390x844,phone-844x390] [--screens play,shop] [--no-shots]
import { chromium, webkit, type Browser } from '@playwright/test';
import { preview } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SCREENS, VIEWPORTS, checkLayout, setInsets, type LayoutIssue } from '../e2e/lib/screens';

const arg = (k: string) => {
  const i = process.argv.indexOf(k);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const out = arg('--out') ?? 'docs/touch/after';
const engines = (arg('--engines') ?? 'chromium').split(',');
const vps = arg('--viewports')?.split(',');
const only = arg('--screens')?.split(',');
const shots = !process.argv.includes('--no-shots');
mkdirSync(out, { recursive: true });

const server = await preview({ preview: { port: 0, host: '127.0.0.1' } });
const url = server.resolvedUrls?.local[0] ?? 'http://127.0.0.1:4173/';
const results: { engine: string; viewport: string; screen: string; issues: LayoutIssue[]; error?: string }[] = [];

for (const engine of engines) {
  const browser: Browser =
    engine === 'webkit'
      ? await webkit.launch()
      : await chromium.launch({ channel: 'chromium', args: process.platform === 'darwin' ? ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu'] : ['--ignore-gpu-blocklist'] });
  for (const v of VIEWPORTS) {
    if (vps && !vps.includes(v.name)) continue;
    const ctx = await browser.newContext({ viewport: { width: v.width, height: v.height }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    for (const s of SCREENS) {
      if (only && !only.includes(s.name)) continue;
      let issues: LayoutIssue[] = [];
      let error: string | undefined;
      try {
        await page.goto(url);
        await page.waitForFunction(() => !!(window as unknown as { __lc?: unknown }).__lc);
        await setInsets(page, v);
        await s.setup(page);
        await page.waitForTimeout(1200);
        issues = await checkLayout(page, v.insets);
        if (shots) await page.screenshot({ path: join(out, `${engine}-${v.name}-${s.name}.jpg`), type: 'jpeg', quality: 70 });
      } catch (e) {
        error = String(e).split('\n')[0];
      }
      results.push({ engine, viewport: v.name, screen: s.name, issues, error });
      process.stdout.write(`${engine} ${v.name} ${s.name}: ${error ? 'ERROR ' + error : issues.length + ' issues'}\n`);
    }
    await ctx.close();
  }
  await browser.close();
}
server.httpServer.close();

// summary: issues grouped by kind and element, with the screens/viewports they appear on
writeFileSync(join(out, 'report.json'), JSON.stringify(results, null, 2));
const groups = new Map<string, Set<string>>();
for (const r of results) {
  if (r.error) groups.set(`ERROR ${r.error}`, new Set([...(groups.get(`ERROR ${r.error}`) ?? []), `${r.screen}@${r.viewport}`]));
  for (const i of r.issues) {
    const k = `${i.kind}: ${i.what} ${i.kind === 'overlap' || i.kind === 'covers' ? i.detail : ''}`.trim();
    groups.set(k, new Set([...(groups.get(k) ?? []), `${r.screen}@${r.viewport}`]));
  }
}
const lines = [...groups].sort((a, b) => b[1].size - a[1].size).map(([k, where]) => `- ${k}  (${where.size}×: ${[...where].slice(0, 6).join(', ')}${where.size > 6 ? ', …' : ''})`);
writeFileSync(join(out, 'report.md'), `# Touch layout report\n\n${results.length} screen checks, ${results.reduce((a, r) => a + r.issues.length, 0)} issues\n\n${lines.join('\n')}\n`);
console.log(`\n${results.length} checks, ${groups.size} distinct issues → ${join(out, 'report.md')}`);
