import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { snap, watch } from './helpers';

// The full board (45 plants of 8 kinds, 40 critters, 150 shots) at each tier. Draw calls are checked
// everywhere (they don't depend on the machine); frame and CPU times and the heap are recorded on a
// real GPU only (E2E_PERF=1 on the release machine) into reports/perf.md.
const CEILING = { low: 80, medium: 120, high: 200 } as const;
const rows: string[] = [];

for (const tier of ['low', 'medium', 'high'] as const) {
  test(`the stress scene at ${tier} stays within ${CEILING[tier]} draw calls`, async ({ page }, info) => {
    test.skip(info.project.name !== 'chromium-desktop', 'Chromium on the desktop only');
    test.skip(!!process.env.E2E_LOW && tier !== 'low', 'software WebGL on CI: the Low tier only');
    const problems = watch(page);
    await page.goto(`/?scene=stress&quality=${tier}`);
    await expect.poll(async () => (await snap(page)).drawCalls, { timeout: 30_000 }).toBeGreaterThan(0);
    const s = await snap(page);
    expect(s.tier).toBe(tier);
    expect(s.drawCalls).toBeLessThanOrEqual(CEILING[tier]);
    if (process.env.E2E_PERF) {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Performance.enable');
      const heap = async () => ((await cdp.send('Performance.getMetrics')).metrics.find(m => m.name === 'JSHeapUsedSize')?.value ?? 0) / 1048576;
      await page.waitForTimeout(3000);
      const h0 = await heap();
      await page.waitForTimeout(10_000);
      const h1 = await heap();
      const after = await snap(page);
      rows.push(`| ${tier} | ${after.drawCalls} | ${(after.triangles / 1000).toFixed(0)}k | ${after.programs} | ${after.frameMs.p50.toFixed(1)} / ${after.frameMs.p95.toFixed(1)} | ${after.cpuMs.p50.toFixed(1)} / ${after.cpuMs.p95.toFixed(1)} | ${h0.toFixed(1)} → ${h1.toFixed(1)} MB |`);
    }
    expect(problems).toEqual([]);
  });
}

test.afterAll(() => {
  if (!rows.length) return;
  mkdirSync('reports', { recursive: true });
  writeFileSync('reports/perf.md', `# Stress scene per tier\n\n45 plants, 40 critters, 150 shots (\`?scene=stress\`), Chromium on this Mac, 1280×720. Frame and CPU times are p50 / p95 over the last 240 frames; the heap is read 3 s and 13 s after the scene starts.\n\n| Tier | Draw calls | Triangles | Programs | Frame ms | CPU ms | JS heap |\n|---|---|---|---|---|---|---|\n${rows.join('\n')}\n`);
});
