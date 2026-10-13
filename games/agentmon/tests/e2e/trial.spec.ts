import { expect, test, type Page } from '@playwright/test';
import { parseRoom } from '../../src/core/puzzle/puzzle';
import { solve } from '../../src/core/puzzle/solver';
import { TRIAL_BY_ID } from '../../src/data/trials';
import { advance, holdUntil, snap, talk, walk, watch } from './helpers';

const KEY = ['ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowUp'];

/**
 * One step in a Trial room: hold the arrow until the move counts, let go on that frame (holdUntil,
 * inside the page), and wait for the move to finish. Exactly one move: letting go as soon as it
 * counts means a slow device can't add a second.
 */
async function step(page: Page, dir: number) {
  const before = (await snap(page)).moves ?? 0;
  await holdUntil(page, KEY[dir]!, { moves: before });
  await expect.poll(async () => !(await snap(page)).moving, { timeout: 8000, intervals: [30] }).toBe(true);
  expect((await snap(page)).moves).toBe(before + 1);
}

test('keyboard: the Lighthouse Trial, room by room, then the Keeper and the Beacon', async ({ page }, info) => {
  test.skip(info.project.name.includes('phone') || info.project.name.includes('tablet'), 'keyboard play is for computers');
  test.setTimeout(180_000);
  const problems = watch(page);
  await page.goto('/?quickstart&fasttext&difficulty=easy&at=lighthouse,4,7&flags=got-partner,mission-1,salt-arrive,met-finch,lighthouse-hall&team=lullakin:16,spinnet:16&quest=4');
  await expect.poll(async () => (await snap(page)).map, { timeout: 20_000 }).toBe('lighthouse');
  // up the stairs into the Trial
  await page.keyboard.down('ArrowUp');
  try {
    await expect.poll(async () => (await snap(page)).scene, { timeout: 10_000, intervals: [15] }).toBe('trial');
  } finally {
    await page.keyboard.up('ArrowUp');
  }
  await advance(page); // the puzzle tutorial card
  expect((await snap(page)).audio?.song).toBe('trial-1');
  const trial = TRIAL_BY_ID.lighthouse!;
  for (let i = 0; i < trial.rooms.length; i++) {
    await expect.poll(async () => { const s = await snap(page); return s.scene === 'trial' && s.roomIndex === i && !s.busy; }, { timeout: 10_000 }).toBe(true);
    await advance(page);
    const room = parseRoom(trial.rooms[i]!);
    if (i === 0) {
      // Reset (R) puts everything back
      await step(page, solve(room)!.actions[0] as number);
      await page.keyboard.press('KeyR');
      await expect.poll(async () => { const s = await snap(page); return [s.x, s.y]; }).toEqual([room.start.x, room.start.y]);
    }
    for (const a of solve(room)!.actions) await step(page, a as number);
  }
  // the top: Marisol greets you, then the spar for the Beacon
  await expect.poll(async () => (await snap(page)).map, { timeout: 15_000 }).toBe('lighthouse-top');
  await walk(page, 'ArrowUp', 1);
  for (let tries = 0; tries < 4 && !(await snap(page)).flags?.includes('beacon-lighthouse'); tries++) {
    await advance(page, 120);
    if (!(await snap(page)).flags?.includes('beacon-lighthouse')) await talk(page);
  }
  const s = await snap(page);
  expect(s.flags).toEqual(expect.arrayContaining(['trial:lighthouse', 'beat:keeper-marisol', 'beacon-lighthouse']));
  expect(problems).toEqual([]);
});
