import { expect, test } from '@playwright/test';
import { advance, leave, snap, talk, walk, watch } from './helpers';

test('keyboard: wake up, meet Chief Nell, choose a partner and spar with Juno', async ({ page }, info) => {
  test.skip(info.project.name.includes('phone') || info.project.name.includes('tablet'), 'keyboard play is for computers (touch has its own test)');
  const problems = watch(page);
  await page.goto('/?quickstart&fasttext');
  await expect.poll(async () => (await snap(page)).map, { timeout: 20_000 }).toBe('home');
  await expect.poll(async () => (await snap(page)).dialogue, { timeout: 5000 }).toBe(true);
  await advance(page);
  expect((await snap(page)).flags).toContain('woke-up');
  // the first key press starts the sound; Gran's house has its own song
  expect((await snap(page)).audio).toEqual({ on: true, song: 'home' });
  // out of Gran's house: right, then down through the door
  await walk(page, 'ArrowRight', 1);
  await leave(page, 'ArrowDown', 'brightmoor');
  expect(await snap(page)).toMatchObject({ x: 4, y: 7 });
  // along the path to the Academy door
  await walk(page, 'ArrowRight', 15);
  await leave(page, 'ArrowUp', 'academy');
  await walk(page, 'ArrowUp', 1);
  await advance(page);
  expect((await snap(page)).flags).toContain('met-nell');
  // back outside and east to the garden
  await leave(page, 'ArrowDown', 'brightmoor');
  expect(await snap(page)).toMatchObject({ x: 19, y: 7 });
  await walk(page, 'ArrowRight', 6);
  await walk(page, 'ArrowDown', 4);
  await leave(page, 'ArrowRight', 'academy-garden');
  await walk(page, 'ArrowRight', 1);
  await advance(page);
  // to Spinnet at (6, 3): from (1, 7) go right to x 6, then up to y 4 (now facing it) and press A
  await walk(page, 'ArrowRight', 5);
  await walk(page, 'ArrowUp', 3);
  expect(await snap(page)).toMatchObject({ map: 'academy-garden', x: 6, y: 4 });
  await talk(page);
  await advance(page, 120);
  const s = await snap(page);
  expect(s.flags).toEqual(expect.arrayContaining(['got-partner', 'juno-1', 'mission-1']));
  expect(s.team?.[0]?.species).toBe('spinnet');
  expect(problems).toEqual([]);
});
