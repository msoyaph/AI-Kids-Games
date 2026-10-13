import { expect, test } from '@playwright/test';
import { piece } from '../../src/sim/pieces';
import { center, snapshot, startClassic, touchDrag, watch } from './helpers';

test.describe('touch', () => {
  test.skip(({ hasTouch }) => !hasTouch, 'touch screens only');

  test('a finger drag lifts the piece above the finger, shows the ghost, and places it', async ({ page }) => {
    const problems = watch(page);
    await startClassic(page);
    // the finger goes where the lifted piece lands mid-board (as a player aims)
    const s = await snapshot(page), from = center(s.layout.slots[0]!), h = piece(s.tray[0]!.id).h;
    const to = { x: center(s.layout.board).x, y: center(s.layout.board).y + s.layout.lift + (h * s.layout.cell) / 2 };
    let during = s;
    await touchDrag(page, from, to, async () => { during = await snapshot(page); });
    expect(during.drag.visible).toBe(true);
    expect(during.drag.y).toBeLessThan(to.y - s.layout.cell); // never hidden under the finger
    expect(during.play.ghost).toBeGreaterThanOrEqual(0);
    await expect.poll(async () => (await snapshot(page)).moves).toBe(1);
    expect((await snapshot(page)).tray[0]).toBeNull();
    expect(problems).toEqual([]);
  });

  test('dropping where it can\'t go eases the piece back to the tray', async ({ page }) => {
    const problems = watch(page);
    await startClassic(page);
    const s = await snapshot(page), from = center(s.layout.slots[1]!);
    await touchDrag(page, from, { x: from.x, y: Math.max(10, s.layout.board.y - s.layout.cell * 3) });
    await expect.poll(async () => (await snapshot(page)).drag.visible, { timeout: 3000 }).toBe(false);
    const after = await snapshot(page);
    expect(after.moves).toBe(0);
    expect(after.tray[1]).toEqual(s.tray[1]);
    expect(problems).toEqual([]);
  });

  test('a drop that is a little off still snaps into place', async ({ page }) => {
    await startClassic(page);
    const s = await snapshot(page), from = center(s.layout.slots[2]!), b = s.layout.board;
    // aim between cells: a third of a cell off in both directions (the lift is added on top)
    const to = { x: b.x + b.w / 2 + s.layout.cell * 0.33, y: b.y + b.h / 2 + s.layout.cell * 0.33 + s.layout.lift };
    await touchDrag(page, from, to);
    await expect.poll(async () => (await snapshot(page)).moves).toBe(1);
  });

  test('tap a piece, then tap the board', async ({ page }) => {
    await startClassic(page);
    const s = await snapshot(page);
    await page.touchscreen.tap(center(s.layout.slots[0]!).x, center(s.layout.slots[0]!).y);
    await expect.poll(async () => (await snapshot(page)).play.selected).toBe(0);
    await page.touchscreen.tap(center(s.layout.board).x, center(s.layout.board).y);
    await expect.poll(async () => (await snapshot(page)).moves).toBe(1);
  });
});
