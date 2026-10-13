import { expect, test, type Page } from '@playwright/test';
import { parseRoom } from '../../src/core/puzzle/puzzle';
import { solve } from '../../src/core/puzzle/solver';
import { TRIAL_BY_ID } from '../../src/data/trials';
import { reachesWorld, snap, tapWalk, tileOnScreen, touchAdvance, watch } from './helpers';

const touchOnly = (name: string) => name.includes('phone') || name.includes('tablet');

test('touch only: a new adventure, Chief Nell, a partner and the first spar', async ({ page }, info) => {
  test.skip(!touchOnly(info.project.name), 'touch play is for phones and tablets');
  test.setTimeout(240_000);
  const problems = watch(page);
  await page.goto('/?fasttext');
  // the title, a slot, your Field Agent, a name, how tricky: all big buttons (no stick or A/B here)
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.glass-ui')).toBeHidden();
  await page.getByRole('button', { name: 'Play' }).tap();
  await page.getByRole('button', { name: 'New adventure' }).first().tap();
  await page.getByRole('button', { name: 'Next', exact: true }).tap();
  await page.getByRole('button', { name: /^I'm / }).tap();
  await page.getByRole('button', { name: 'Start!' }).tap();
  await expect.poll(async () => (await snap(page)).map, { timeout: 20_000 }).toBe('home');
  await expect.poll(async () => (await snap(page)).dialogue, { timeout: 5000 }).toBe(true);
  await touchAdvance(page);
  // out of Gran's house: tap the door mat
  await tapWalk(page, 4, 7);
  await expect.poll(async () => (await snap(page)).map).toBe('brightmoor');
  // tap the Academy door; Chief Nell talks as you walk in
  await tapWalk(page, 19, 6);
  await expect.poll(async () => (await snap(page)).map).toBe('academy');
  await tapWalk(page, 5, 6);
  await touchAdvance(page);
  expect((await snap(page)).flags).toContain('met-nell');
  // back out, and east to the garden (tap the exit at the edge of town)
  await tapWalk(page, 5, 8);
  await expect.poll(async () => (await snap(page)).map).toBe('brightmoor');
  await tapWalk(page, 29, 10);
  await expect.poll(async () => (await snap(page)).map, { timeout: 15_000 }).toBe('academy-garden');
  // Chief Nell says hello as you step in
  await tapWalk(page, 2, 6);
  await touchAdvance(page);
  // tap Spinnet to say hi, Yes, then the gentle Spark Ring, then Juno's friendly spar
  const s = await snap(page);
  const spinnet = tileOnScreen(s, 6, 3);
  await page.touchscreen.tap(spinnet.x, spinnet.y);
  await expect.poll(async () => (await snap(page)).dialogue, { timeout: 15_000 }).toBe(true);
  await touchAdvance(page, { seconds: 150 });
  const end = await snap(page);
  expect(end.flags).toEqual(expect.arrayContaining(['got-partner', 'juno-1', 'mission-1']));
  expect(end.team?.[0]?.species).toBe('spinnet');
  expect(problems).toEqual([]);
});

/** One Trial step by touch: wait until the last move has finished, then tap the tile next to you in that direction. */
async function tapStep(page: Page, dir: number) {
  await expect.poll(async () => { const n = await snap(page) as { moving?: boolean; busy?: boolean }; return !n.moving && !n.busy; }, { timeout: 8000, intervals: [30] }).toBe(true);
  const s = await snap(page);
  const [dx, dy] = [[0, 1], [-1, 0], [1, 0], [0, -1]][dir]!;
  const p = tileOnScreen(s, s.x! + dx, s.y! + dy);
  const before = s.moves ?? 0;
  await page.touchscreen.tap(p.x, p.y);
  await expect.poll(async () => ((await snap(page)).moves ?? 0) > before, { timeout: 8000, intervals: [20] }).toBe(true);
}

test('touch only: the first befriend, a Rest Stop nap, and a Trial room', async ({ page }, info) => {
  test.skip(!touchOnly(info.project.name), 'touch play is for phones and tablets');
  test.setTimeout(240_000);
  const problems = watch(page);
  // the Meadow Path after the opening, with a partner and some snacks
  await page.goto('/?quickstart&fasttext&difficulty=easy&at=meadow-path,11,25&flags=got-partner,mission-1,juno-1,met-nell&team=spinnet:10&items=berry-bun:3,snack-pouch:1&quest=2');
  await expect.poll(async () => (await snap(page)).map, { timeout: 20_000 }).toBe('meadow-path');
  // tap a wild Agentmon you can see (not one behind the A or B button, as on a small phone): you
  // walk up to it and the spar starts; tire it out, then Befriend
  await expect.poll(async () => ((await snap(page)) as { wild?: unknown[] }).wild?.length ?? 0, { timeout: 10_000 }).toBeGreaterThan(0);
  for (let tries = 0; tries < 10 && ((await snap(page)).team?.length ?? 0) < 2; tries++) {
    const s = await snap(page) as Awaited<ReturnType<typeof snap>> & { wild: { x: number; y: number }[] };
    const near = [...s.wild].sort((a, b) => Math.abs(a.x - s.x!) + Math.abs(a.y - s.y!) - (Math.abs(b.x - s.x!) + Math.abs(b.y - s.y!)));
    let p: { x: number; y: number } | undefined;
    for (const w of near) { const q = tileOnScreen(s, w.x, w.y); if (await reachesWorld(page, q)) { p = q; break; } }
    // none on screen (or all behind a button): walk toward the nearest one, as a kid would
    if (!p) { if (near[0]) await tapWalk(page, near[0].x, near[0].y, { within: 3, befriend: true }); continue; }
    await page.touchscreen.tap(p.x, p.y);
    await expect.poll(async () => { const n = await snap(page); return !!n.battle || (!n.busy && !n.moving); }, { timeout: 20_000 }).toBe(true);
    if ((await snap(page)).battle) await touchAdvance(page, { befriend: true, seconds: 120 });
    await page.waitForTimeout(400);
  }
  expect((await snap(page)).team?.length).toBe(2);
  // north to Saltwhistle and into the Rest Stop; tap the helper, Yes, a cozy nap
  await tapWalk(page, 10, 0);
  await expect.poll(async () => (await snap(page)).map, { timeout: 15_000 }).toBe('saltwhistle');
  await touchAdvance(page);
  await tapWalk(page, 2, 9);
  await expect.poll(async () => (await snap(page)).map).toBe('rest-saltwhistle');
  await tapWalk(page, 4, 4);
  const r = await snap(page);
  const helper = tileOnScreen(r, 4, 2);
  await page.touchscreen.tap(helper.x, helper.y);
  await expect.poll(async () => (await snap(page)).dialogue, { timeout: 10_000 }).toBe(true);
  await touchAdvance(page);
  expect(((await snap(page)) as { team?: { energy: number }[] }).team?.every(c => c.energy > 0)).toBe(true);
  // the Lighthouse Trial's first room, by tapping next to the player
  await page.goto('/?quickstart&fasttext&at=lighthouse,4,3&flags=got-partner,mission-1,met-finch,lighthouse-hall&team=lullakin:12');
  await expect.poll(async () => (await snap(page)).map, { timeout: 20_000 }).toBe('lighthouse');
  const h = await snap(page);
  const stairs = tileOnScreen(h, 4, 2);
  await page.touchscreen.tap(stairs.x, stairs.y);
  await expect.poll(async () => (await snap(page)).scene, { timeout: 10_000 }).toBe('trial');
  await touchAdvance(page);
  const room = parseRoom(TRIAL_BY_ID.lighthouse!.rooms[0]!);
  for (const a of solve(room)!.actions) await tapStep(page, a as number);
  await expect.poll(async () => (await snap(page)).roomIndex, { timeout: 10_000 }).toBe(1);
  expect(problems).toEqual([]);
});
