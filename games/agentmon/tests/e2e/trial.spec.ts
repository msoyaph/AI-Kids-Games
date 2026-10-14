import { expect, test, type Page } from '@playwright/test';
import { parseRoom } from '../../src/core/puzzle/puzzle';
import { solve } from '../../src/core/puzzle/solver';
import { TRIAL_BY_ID } from '../../src/data/trials';
import { advance, snap, talk, walk, walkUntil, watch } from './helpers';

const KEY = ['ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowUp'];

/**
 * One step in a Trial room: press the arrow (a quick tap), wait until the room has taken the tap and
 * the move has finished. A tap is always exactly one move, however slow the machine.
 */
async function step(page: Page, dir: number) {
  const s0 = await snap(page);
  const before = s0.moves ?? 0, taps = s0.taps ?? 0;
  await page.keyboard.press(KEY[dir]!);
  await expect.poll(async () => ((await snap(page)).taps ?? 0) > taps, { timeout: 15_000, intervals: [30] }).toBe(true);
  await expect.poll(async () => !(await snap(page)).moving, { timeout: 15_000, intervals: [30] }).toBe(true);
  expect((await snap(page)).moves).toBe(before + 1);
}

test('keyboard: the Lighthouse Trial, room by room, then the Keeper and the Beacon', async ({ page }, info) => {
  test.skip(info.project.name.includes('phone') || info.project.name.includes('tablet'), 'keyboard play is for computers');
  test.setTimeout(180_000);
  const problems = watch(page);
  await page.goto('/?quickstart&fasttext&difficulty=easy&at=lighthouse,4,7&flags=got-partner,mission-1,salt-arrive,met-finch,lighthouse-hall&team=lullakin:16,spinnet:16&quest=4');
  await expect.poll(async () => (await snap(page)).map, { timeout: 20_000 }).toBe('lighthouse');
  // up the stairs into the Trial, a step at a time (a held key could carry on into the first room)
  await walkUntil(page, 'ArrowUp', s => s.scene === 'trial');
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
