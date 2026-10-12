// Vanex Defense 2.0 reel takes. ?map=<id>&diff=easy starts a campaign map directly; a small
// player bot builds a real maze with the build drawer (the game refuses any cell that would
// seal the path), picks elements and sends waves early, then plays at 1x while recording.
// Read-only hook: window.__vanexTest.state() / cellCenter() (src/app/GameScreen.ts).
// Quality "medium": with a full maze and a busy wave, "high" drops to ~46 fps on the capture Mac.
import type { Scenario, TakeContext } from '../../../../apps/site/scripts/capture/types';

const settings = { music: 0, sfx: 0.8, quality: 'medium', shake: false, speed: 3, damageNumbers: false, rotateHintSeen: true, language: 'en', textScale: 1, highContrast: false, reducedMotion: 'off', hotkeys: {} };
const storage = { 'vanex-defense-save': JSON.stringify({ version: 4, settings, maps: {}, tutorialDone: true, hints: ['hero'], lastDifficulty: 'easy' }) };

type State = { coins: number; lives: number; wave: number; towers: number; enemies: number; kills: number; state: string; crystals: number; unlocked: string[]; paused: boolean; modal: boolean };
const state = (ctx: TakeContext) => ctx.run(() => (window as any).__vanexTest.state() as State);
const line = (x: number, y0: number, y1: number) => Array.from({ length: y1 - y0 + 1 }, (_, i) => [x, y0 + i] as [number, number]);

async function begin(ctx: TakeContext, element: string) {
  await ctx.page.waitForFunction(() => !!(window as any).__vanexTest, null, { timeout: 60_000 });
  await ctx.page.getByRole('button', { name: element, exact: true }).click(); // the first crystal is a gift
}

/** Build towers on the planned cells while coins last; returns the cells still to build. */
const tries = new Map<string, number>();
async function build(ctx: TakeContext, tower: RegExp, cost: number, cells: [number, number][]) {
  if (!cells.length || (await state(ctx)).coins < cost) return cells;
  const fab = ctx.page.getByRole('button', { name: 'Build', exact: true });
  if (await fab.isVisible().catch(() => false)) await fab.click();
  // An element tower has no card until its element is picked.
  const card = ctx.page.getByRole('button', { name: tower }).first();
  if (!(await card.count())) return cells;
  const left: [number, number][] = [];
  for (const [x, y] of cells) {
    const s = await state(ctx);
    if (s.coins < cost || s.modal) { left.push([x, y]); continue; }
    // Clicking the selected card again would cancel build mode.
    if (!/\bsel\b/.test(await card.getAttribute('class') ?? '')) { await card.click(); await ctx.wait(100); }
    const at = await ctx.run(([cx, cy]) => (window as any).__vanexTest.cellCenter(cx, cy), [x, y] as const);
    await ctx.page.mouse.click(at.x, at.y); await ctx.wait(120);
    if ((await state(ctx)).towers > s.towers) continue;
    // Not built (it would seal the path, or something walked there): try again later, twice at most.
    const key = `${x},${y}`, n = (tries.get(key) ?? 0) + 1; tries.set(key, n);
    if (n < 3) left.push([x, y]);
  }
  await ctx.page.mouse.move(4, 4); // off the board: no build preview under the pointer
  return left;
}

/** Keep playing (building the plan, picking elements, sending waves early) until `done`. */
async function play(ctx: TakeContext, plan: { tower: RegExp; cost: number; cells: [number, number][] }[], elements: string[], done: (s: State) => boolean, ms = 420_000) {
  const end = Date.now() + ms; let report = 0;
  for (;;) {
    const s = await state(ctx);
    if (Date.now() > report) { report = Date.now() + 10_000; ctx.log(`  wave ${s.wave}, ${s.towers} towers, ${s.coins} coins, ${s.enemies} enemies, ${s.lives} lives (${s.state}${s.modal ? ', modal' : ''})`); if (s.modal) ctx.log(`  modal: ${(await ctx.run(() => (document.querySelector('.modal-back, [role=dialog]') as HTMLElement | null)?.innerText ?? '?')).replace(/\s+/g, ' ').slice(0, 160)}`); }
    if (done(s)) return s;
    if (Date.now() > end || s.state === 'lost') throw new Error(`gave up at wave ${s.wave} (${s.state})`);
    if (s.modal) {
      const resume = ctx.page.getByRole('button', { name: /Resume/ });
      if (await resume.isVisible().catch(() => false)) { await resume.click(); continue; }
      const pick = elements.find(name => !s.unlocked.includes(name.toLowerCase()));
      const button = ctx.page.getByRole('button', { name: pick ?? 'Later', exact: true });
      if (await button.isVisible().catch(() => false)) await button.click();
      else { const close = ctx.page.getByRole('button', { name: /^(Close|Got it|OK)$/i }).first(); if (await close.isVisible().catch(() => false)) await close.click(); else await ctx.page.keyboard.press('Escape'); await ctx.wait(300); } // e.g. wave intel
      continue;
    }
    if (s.crystals > 0) { const open = ctx.page.getByRole('button', { name: 'Pick an element' }); if (await open.isVisible().catch(() => false)) { await open.click(); continue; } }
    for (const step of plan) step.cells = await build(ctx, step.tower, step.cost, step.cells);
    if (s.enemies === 0) await ctx.page.getByRole('button', { name: 'Send next wave' }).click().catch(() => {});
    await ctx.wait(700);
  }
}

/** Mouse-wheel zoom (the game's own control) toward a map cell. */
async function zoom(ctx: TakeContext, x: number, y: number, steps: number) {
  const at = await ctx.run(([cx, cy]) => (window as any).__vanexTest.cellCenter(cx, cy), [x, y] as const);
  await ctx.page.mouse.move(at.x, at.y);
  for (let i = 0; i < steps; i++) { await ctx.page.mouse.wheel(0, -120); await ctx.wait(80); }
  await ctx.page.mouse.move(4, 4); await ctx.wait(400);
}

/** Wait for the field to clear, then send the next wave at 1x and let it walk in. */
async function nextWave(ctx: TakeContext, lead: number, waves = 1) {
  await ctx.page.waitForFunction(() => (window as any).__vanexTest.state().enemies === 0, null, { timeout: 120_000 });
  await normalSpeed(ctx);
  for (let i = 0; i < waves; i++) { if (i) await ctx.wait(1800); await play(ctx, [], ['Light', 'Water', 'Shadow'], s => !s.modal); await ctx.page.getByRole('button', { name: 'Send next wave' }).click(); }
  await ctx.wait(lead);
}

/** Set the game speed with its HUD button (answering any dialog that opens first). */
async function setSpeed(ctx: TakeContext, target: '1x' | '3x') {
  const speed = ctx.page.getByRole('button', { name: 'Game speed' });
  for (let i = 0; i < 12; i++) {
    await play(ctx, [], ['Light', 'Water', 'Shadow'], s => !s.modal);
    if ((await speed.innerText()).trim().toLowerCase() === target) return;
    await speed.click({ timeout: 2000 }).catch(() => {});
    await ctx.wait(150);
  }
  throw new Error(`could not set the speed to ${target}`);
}
/** Back to 1x for natural motion while recording. */
const normalSpeed = (ctx: TakeContext) => setSpeed(ctx, '1x');

// Whiteout Slope (Frostspire Peaks, 20×12): a serpentine of Bolt Turret walls with gaps at
// alternate ends; Arc Prisms and Tidecallers hold the corners where the line bunches up.
const frostPlan = () => [
  { tower: /Arc Prism/, cost: 60, cells: [[3, 8], [7, 3]] as [number, number][] },
  { tower: /Bolt Turret/, cost: 20, cells: [...line(3, 1, 7), ...line(7, 4, 10), ...line(11, 1, 8), ...line(15, 4, 10)] },
  { tower: /Tidecaller/, cost: 60, cells: [[11, 9], [15, 3]] as [number, number][] }
];

export const scenario: Scenario = {
  slug: 'vanex-defense',
  canvas: '#game canvas',
  takes: [
    {
      id: 'frost-maze', query: '?map=w3m1&diff=easy&seed=7', storage, audio: true,
      async setup(ctx) {
        await begin(ctx, 'Light');
        await play(ctx, frostPlan(), ['Light', 'Water'], s => s.wave >= 6 && s.towers >= 20);
        await zoom(ctx, 5, 6, 2); await nextWave(ctx, 4000, 2);
      },
      async act(ctx) { await ctx.wait(500); await ctx.cut(); await ctx.wait(6500); }
    },
    {
      // Sky Lane (Skyforge Ruins): towers along the winding road; flyers follow the sky lane.
      id: 'sky-lane', query: '?map=w5m3&diff=easy&seed=5', storage, audio: true,
      async setup(ctx) {
        await begin(ctx, 'Light');
        const plan = [
          { tower: /Arc Prism/, cost: 60, cells: [[6, 4], [12, 4], [8, 7], [14, 7]] as [number, number][] },
          { tower: /Bolt Turret/, cost: 20, cells: [[3, 2], [5, 2], [7, 2], [9, 2], [11, 2], [13, 2], [15, 2], [17, 2], [4, 4], [8, 4], [10, 4], [14, 4], [4, 7], [6, 7], [10, 7], [12, 7], [3, 9], [7, 9], [11, 9], [15, 9]] as [number, number][] },
          { tower: /Umbral Lantern/, cost: 60, cells: [[17, 4], [16, 7]] as [number, number][] }
        ];
        await play(ctx, plan, ['Light', 'Shadow'], s => s.wave >= 6 && s.towers >= 20);
        await zoom(ctx, 9, 5, 2); await nextWave(ctx, 5500, 3);
      },
      async act(ctx) { await ctx.wait(800); await ctx.cut(); await ctx.wait(6000); }
    },
    {
      // The same Sky Lane run: wave 10 brings the Prism Matriarch down the middle of the road.
      id: 'matriarch', continues: true,
      async setup(ctx) {
        await setSpeed(ctx, '3x');
        await play(ctx, [], ['Light', 'Shadow'], s => s.wave >= 9);
        await nextWave(ctx, 3000);
      },
      async act(ctx) { await ctx.wait(1500); await ctx.cut(); await ctx.wait(16000); }
    }
  ]
};
