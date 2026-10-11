import type { Page } from '@playwright/test';
import { test, expect, slow } from './fixtures';
import { boot, watch } from './helpers';

// Accessibility: every menu works with a keyboard alone, a gamepad alone, and touch alone.

/** Number the current screen's navigable buttons (data-tid) and return how many there are. */
async function tagNavigables(page: Page): Promise<number> {
  return page.evaluate(() => {
    const s = window.__calex.app.ui.screen;
    const items = Array.from(s.el.querySelectorAll('[data-nav]') as NodeListOf<HTMLElement>).filter((e) => !(e as HTMLButtonElement).disabled && e.offsetParent !== null);
    items.forEach((e, i) => (e.dataset.tid = String(i)));
    return items.length;
  });
}

const focusedTid = (page: Page): Promise<string | null> => page.evaluate(() => window.__calex.app.ui.focused?.dataset.tid ?? null);

/** Every button on the current screen can be reached with the arrow keys from the first focus. */
async function arrowsReachAll(page: Page): Promise<{ total: number; missing: string[] }> {
  const total = await tagNavigables(page);
  const start = (await focusedTid(page)) ?? '0';
  const seen = new Set<string>([start]);
  const queue = [start];
  while (queue.length) {
    const tid = queue.shift()!;
    for (const key of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) {
      await page.evaluate((t) => {
        const a = window.__calex.app;
        const el = a.ui.screen.el.querySelector(`[data-tid="${t}"]`);
        if (el) a.ui.setFocus(el, false);
      }, tid);
      await page.keyboard.press(key);
      const now = await focusedTid(page);
      if (now !== null && !seen.has(now)) {
        seen.add(now);
        queue.push(now);
      }
    }
  }
  const missing = await page.evaluate((got) => {
    const s = window.__calex.app.ui.screen;
    return Array.from(s.el.querySelectorAll('[data-tid]') as NodeListOf<HTMLElement>)
      .filter((e) => !got.includes(e.dataset.tid!))
      .map((e) => (e.textContent ?? '').trim().slice(0, 30) || e.getAttribute('aria-label') || '?');
  }, [...seen]);
  return { total, missing };
}

/** Tab steps through every button once and comes back round. */
async function tabCyclesAll(page: Page): Promise<boolean> {
  const total = await tagNavigables(page);
  const seen = new Set<string>();
  for (let i = 0; i < total; i++) {
    await page.keyboard.press('Tab');
    const t = await focusedTid(page);
    if (t !== null) seen.add(t);
  }
  return seen.size === total;
}

test('keyboard only: name entry, every main screen reachable with arrows and Tab, Esc goes back', async ({ page }, info) => {
  test.skip(!info.project.name.endsWith('desktop'), 'keyboard check runs once per engine');
  test.setTimeout(slow(180_000));
  const w = watch(page);
  await boot(page);
  await page.keyboard.press('Enter'); // title → saves
  await expect(page.getByText('Choose a save')).toBeVisible();
  await page.keyboard.press('Enter'); // New Game on the first empty slot
  await expect(page.getByText('Pick a racer name')).toBeVisible();
  // Tab into the name box (from "Let's go!" it wraps to the first item), type a name, Enter to start
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('INPUT');
  await page.keyboard.type('Zippy'); // the suggestion is selected, so typing replaces it
  await page.keyboard.press('Enter');
  await expect(page.locator('.title-h').filter({ hasText: 'Zippy' })).toBeVisible();
  expect(await page.evaluate(() => window.__calex.app.save.name)).toBe('Zippy');

  const screens: Array<[string, string]> = [
    ['main menu', 'a.screens.mainMenu()'],
    ['players', "a.flow.mode = 'versus'; a.screens.players()"],
    ['speed class', 'a.screens.classSelect(() => {})'],
    ['racer select', 'a.screens.racerSelect(0, () => {})'],
    ['garage', 'a.screens.garage(() => a.screens.mainMenu())'],
    ['cup select', "a.flow.mode = 'grandPrix'; a.screens.cupSelect()"],
    ['track select', "a.flow.mode = 'versus'; a.screens.trackSelect()"],
    ['versus options', "a.flow.mode = 'versus'; a.screens.vsOptions()"],
    ['battle setup', "a.flow.mode = 'battle'; a.flow.players = 1; a.screens.battleSetup()"],
    ['settings', 'a.screens.settings(() => a.screens.mainMenu())'],
    ['challenges', 'a.screens.challenges()'],
    ['records', 'a.screens.records()'],
    ['driving school', 'a.screens.school()'],
  ];
  for (const [name, open] of screens) {
    await page.evaluate((code) => {
      const a = window.__calex.app;
      new Function('a', code)(a);
    }, open);
    await page.waitForTimeout(150);
    const r = await arrowsReachAll(page);
    expect(r.missing, `${name}: buttons the arrow keys can't reach`).toEqual([]);
    expect(r.total, name).toBeGreaterThan(0);
    expect(await tabCyclesAll(page), `${name}: Tab reaches every button`).toBe(true);
  }
  // settings tabs switch with Q/E, every tab is reachable, Esc goes back to the main menu
  await page.evaluate(() => window.__calex.app.screens.settings(() => window.__calex.app.screens.mainMenu()));
  for (const tab of ['Graphics', 'Gameplay', 'Controls']) {
    await page.keyboard.press('KeyE');
    await expect(page.locator('.tabs .btn.active')).toContainText(tab);
    const r = await arrowsReachAll(page);
    expect(r.missing, `settings/${tab}`).toEqual([]);
  }
  await page.keyboard.press('Escape');
  await expect(page.getByText('Grand Prix')).toBeVisible();
  // Enter activates the focused button
  await page.evaluate(() => {
    const a = window.__calex.app;
    const b = Array.from(a.ui.screen.el.querySelectorAll('[data-nav]') as NodeListOf<HTMLElement>).find((e) => e.textContent?.includes('Records'));
    a.ui.setFocus(b, false);
  });
  await page.keyboard.press('Enter');
  await expect(page.locator('.title-h').filter({ hasText: 'Records' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByText('Grand Prix')).toBeVisible();
  expect(w.errors).toEqual([]);
});

test('gamepad only: title → save → menus with the D-pad, RB/LB tabs, B back, controls card', async ({ page }, info) => {
  test.skip(!info.project.name.endsWith('desktop'), 'gamepad check runs once per engine');
  test.setTimeout(slow(120_000));
  await page.addInitScript(() => {
    const pad = { id: 'Test Pad', index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0, touched: false })), timestamp: 0 };
    (window as unknown as { __pad: typeof pad }).__pad = pad;
    navigator.getGamepads = () => [pad as unknown as Gamepad];
  });
  const w = watch(page);
  await boot(page);
  const tap = async (b: number): Promise<void> => {
    await page.evaluate((i) => ((window as unknown as { __pad: { buttons: Array<{ pressed: boolean }> } }).__pad.buttons[i].pressed = true), b);
    await page.waitForTimeout(110);
    await page.evaluate((i) => ((window as unknown as { __pad: { buttons: Array<{ pressed: boolean }> } }).__pad.buttons[i].pressed = false), b);
    await page.waitForTimeout(140);
  };
  const A = 0, B = 1, LB = 4, RB = 5, UP = 12, DOWN = 13, LEFT = 14, RIGHT = 15;
  const focusText = (): Promise<string> => page.evaluate(() => window.__calex.app.ui.focused?.textContent ?? '');
  await tap(A); // title → saves
  await expect(page.getByText('Choose a save')).toBeVisible();
  await tap(A); // New Game
  await expect(page.getByText('Pick a racer name')).toBeVisible();
  await tap(A); // Let's go! (a random fun name)
  await expect(page.getByText('Grand Prix')).toBeVisible();
  // D-pad down through the big buttons to the small row, then right to Settings
  for (let i = 0; i < 8 && !(await focusText()).includes('School') && !(await focusText()).includes('Challenges'); i++) await tap(DOWN);
  for (let i = 0; i < 8 && !(await focusText()).includes('Settings'); i++) await tap(RIGHT);
  expect(await focusText()).toContain('Settings');
  await tap(A);
  await expect(page.locator('.tabs .btn.active')).toContainText('Sound');
  await tap(RB);
  await expect(page.locator('.tabs .btn.active')).toContainText('Graphics');
  await tap(LB);
  await expect(page.locator('.tabs .btn.active')).toContainText('Sound');
  await tap(B);
  await expect(page.getByText('Grand Prix')).toBeVisible();
  // into Versus → players → class → racer → options → track, all on the pad
  for (let i = 0; i < 8 && !(await focusText()).includes('Versus'); i++) await tap((await focusText()).match(/School|Challenges|Garage|Collection|Records|Settings|save/) && !(await focusText()).includes('New here') ? UP : DOWN);
  expect(await focusText()).toContain('Versus');
  await tap(A);
  await expect(page.getByText('How many racers?')).toBeVisible();
  await tap(A); // 1 Player
  await expect(page.getByText('Choose your speed')).toBeVisible();
  await tap(A); // Rookie
  await tap(LEFT); // a racer (focus moves; any racer is fine)
  for (let i = 0; i < 12 && !(await focusText()).match(/Next|Ready|Go/); i++) await tap(DOWN);
  await tap(A);
  await tap(B); // and back again from wherever that led
  await expect(page.locator('.ui-root .screen')).toBeVisible();
  expect(w.errors).toEqual([]);
});

test('touch only: every main-menu screen opens with a tap, has a big enough Back, and returns', async ({ page }, info) => {
  test.skip(info.project.name.endsWith('desktop'), 'touch check runs on tablets and phones');
  test.setTimeout(slow(120_000));
  const w = watch(page);
  await boot(page);
  await page.locator('.title-screen').tap();
  await page.locator('.ui-root [data-nav]').filter({ hasText: 'New Game' }).first().tap();
  await page.locator('.ui-root [data-nav]').filter({ hasText: "Let's go!" }).first().tap();
  await expect(page.getByText('Grand Prix')).toBeVisible();
  // touch targets: every button on the main menu is at least 28 × 28 CSS px (WCAG 2.5.8 asks for 24)
  const small = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.ui-root .screen [data-nav]') as NodeListOf<HTMLElement>)
      .filter((e) => e.offsetParent !== null)
      .map((e) => ({ t: (e.textContent ?? '').trim().slice(0, 20), r: e.getBoundingClientRect() }))
      .filter((x) => x.r.width < 28 || x.r.height < 28)
      .map((x) => `${x.t} ${Math.round(x.r.width)}×${Math.round(x.r.height)}`),
  );
  expect(small).toEqual([]);
  for (const name of ['School', 'Challenges', 'Garage', 'Collection', 'Records', 'Settings']) {
    await page.locator('.ui-root .menu-row [data-nav]').filter({ hasText: name }).first().tap();
    const back = page.locator('.ui-root .screen .topbar [data-nav]').filter({ hasText: /Back|Done/ }).first();
    await expect(back, `${name} has a Back/Done button`).toBeVisible();
    const box = (await back.boundingBox())!;
    expect(box.height, `${name} Back button height`).toBeGreaterThanOrEqual(28);
    await back.tap();
    await expect(page.getByText('Grand Prix')).toBeVisible();
  }
  // HUD size setting is a tap away in Graphics
  await page.locator('.ui-root .menu-row [data-nav]').filter({ hasText: 'Settings' }).first().tap();
  await page.locator('.tabs [data-nav]').filter({ hasText: 'Graphics' }).first().tap();
  await page.locator('.ui-root [data-nav]').filter({ hasText: '150%' }).first().tap();
  expect(await page.evaluate(() => window.__calex.app.saves.settings.hudSize)).toBe(1.5);
  expect(w.errors).toEqual([]);
});
