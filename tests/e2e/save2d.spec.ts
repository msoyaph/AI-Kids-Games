import { expect, test } from '@playwright/test';
import fs from 'fs';
import { boot, go, navTo, skipDialogue, watchErrors } from './helpers';

/**
 * A save made by the original 2D game (main branch, scripts/make-2d-save.mjs): Kai, Chapter 3, in the
 * middle of "A Strange Signal" (find 3 signal chips on Ceres), with a bought Speedy Needle nose. The 3D
 * game must load it as-is and carry on with the mission.
 */
const fixture = JSON.parse(fs.readFileSync(new URL('../fixtures/save-2d-chapter3.json', import.meta.url), 'utf8')) as {
  storage: Record<string, string>;
  summary: { name: string; chapter: number; coins: number; codex: number; badges: number; objective: string };
};

type Win = { __spacesky: { state: { data: Record<string, unknown> & { loadout: { nose: string }; owned: string[]; codex: string[]; badges: string[]; coins: number; chapter: number } }; missions: { currentObjective(): { obj: { text: string } } | null }; game: { current: Record<string, unknown> } } };

test('a save from the 2D game loads in 3D and the mission carries on', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await page.addInitScript((storage) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.clear();
    for (const [k, v] of Object.entries(storage)) localStorage.setItem(k, v);
  }, fixture.storage);
  await boot(page);
  await page.getByTestId('btn-play').click();
  await expect(page.getByTestId('slot-0')).toContainText(fixture.summary.name);
  await page.getByTestId('slot-play-0').click();
  await expect(page.getByTestId('hub-banner')).toBeVisible({ timeout: 30_000 });
  await skipDialogue(page);
  await expect(page.getByTestId('hub-banner')).toContainText(fixture.summary.objective);
  const data = await page.evaluate(() => {
    const S = (window as unknown as Win).__spacesky;
    const d = S.state.data;
    return { chapter: d.chapter, coins: d.coins, nose: d.loadout.nose, owned: d.owned.includes('nose_needle'), codex: d.codex.length, badges: d.badges.length };
  });
  expect(data).toEqual({ chapter: 3, coins: fixture.summary.coins, nose: 'nose_needle', owned: true, codex: fixture.summary.codex, badges: fixture.summary.badges });

  // The bought part is on the 3D rocket in the hangar.
  await navTo(page, 'nav-hangar', 'hangar');
  await expect(page.getByTestId('part-nose_needle')).toContainText('Equipped');
  await navTo(page, 'btn-back', 'hub');

  // Carry on: pick up the three signal chips on Ceres.
  await go(page, 'explore', { area: 'ceres_station' });
  await skipDialogue(page);
  for (let i = 0; i < 3; i++) {
    const left = await page.evaluate(() => {
      const sc = (window as unknown as Win).__spacesky.game.current as unknown as {
        world2: { pickups: Array<{ x: number; y: number; taken: boolean; ent: { def: { item?: string } | null } }>; cfg: { pw: number; ph: number } };
        player: { x: number; y: number; px: number; py: number; vx: number; vy: number };
      };
      const chip = sc.world2.pickups.find((p) => !p.taken && p.ent.def?.item === 'cereschip');
      if (!chip) return 0;
      const p = sc.player;
      p.x = p.px = chip.x - sc.world2.cfg.pw / 2;
      p.y = p.py = chip.y - sc.world2.cfg.ph / 2;
      p.vx = p.vy = 0;
      return sc.world2.pickups.filter((q) => !q.taken && q.ent.def?.item === 'cereschip').length;
    });
    expect(left).toBeGreaterThan(0);
    await page.waitForTimeout(400);
    await skipDialogue(page);
  }
  const objective = () => page.evaluate(() => (window as unknown as Win).__spacesky.missions.currentObjective()?.obj.text ?? '');
  await expect.poll(objective, { timeout: 10_000 }).toBe('Fix the big antenna');

  // The 3D game saves in the same format: reload and continue.
  await go(page, 'hub');
  await page.reload();
  await expect(page.getByTestId('btn-play')).toBeVisible({ timeout: 30_000 });
  await page.getByTestId('btn-play').click();
  await expect(page.getByTestId('slot-0')).toContainText(fixture.summary.name);
  await page.getByTestId('slot-play-0').click();
  await expect(page.getByTestId('hub-banner')).toBeVisible({ timeout: 30_000 });
  await skipDialogue(page);
  await expect(page.getByTestId('hub-banner')).toContainText('Fix the big antenna');
  expect(errors).toEqual([]);
});
