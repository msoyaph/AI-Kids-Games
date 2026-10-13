import { expect, test } from '@playwright/test';
import { snap, walk } from './helpers';

// Frame time with the CPU slowed down four times (a slow tablet). Local only: CI machines vary too much.
test('stays smooth with a 4× slower CPU (town, battle)', async ({ page }, info) => {
  test.skip(info.project.name !== 'chromium-desktop' || !!process.env.CI, 'local Chromium only');
  const cdp = await page.context().newCDPSession(page);
  await page.goto('/?quickstart&fasttext&at=saltwhistle,4,10&flags=got-partner,mission-1,salt-arrive&team=spinnet:12');
  await expect.poll(async () => (await snap(page)).map, { timeout: 20_000 }).toBe('saltwhistle');
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  // up and down the open street
  for (const key of ['ArrowRight', 'ArrowLeft', 'ArrowRight', 'ArrowLeft']) await walk(page, key, 4);
  const town = await snap(page);
  await page.goto('/?scene=battle&seed=7');
  await expect.poll(async () => (await snap(page)).ready, { timeout: 30_000 }).toBe(true);
  await page.waitForTimeout(2000);
  const battle = await snap(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  console.log(`frame time at 4x CPU: town ${town.frameMs} ms, battle ${battle.frameMs} ms`);
  expect(town.frameMs ?? 99).toBeLessThan(34);
  expect(battle.frameMs ?? 99).toBeLessThan(34);
});
