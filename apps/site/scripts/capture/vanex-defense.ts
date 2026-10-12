// Vanex Defense capture route. Uses production URL params (?map=&diff=) and the read-only
// hook window.__vanexTest (state() and cellCenter()), and builds through the real UI.
// One play-through is captured as a chain: a first wave, a combo tower, then the wave-10 boss.
// NOTE: Vanex is being restyled for ages 10–14; rerun this route on the new build.
import type { Scenario, TakeContext } from './types';

const save = { version: 3,settings: { music: 0,sfx: 0,quality: 'high',shake: false,speed: 1,damageNumbers: false,rotateHintSeen: true },maps: {},endlessBest: {},tutorialDone: true,achievements: {},lifetime: { kills: 0,bossKills: 0,towersBuilt: 0,wins: 0,combos: [] },lastDifficulty: 'easy' };
type State = { coins: number; lives: number; wave: number; towers: number; enemies: number; crystals: number; unlocked: string[]; modal: boolean; state: string };
const state = (ctx: TakeContext) => ctx.run(() => (window as any).__vanexTest?.state()) as Promise<State | undefined>;
const buttons = (ctx: TakeContext) => ctx.run(() => [...document.querySelectorAll('button')].map(b => (b as HTMLElement).innerText.replace(/\s+/g,' ').trim()).filter(Boolean));

/** Build a tower through the real drawer: pick its card, click the cell. */
async function build(ctx: TakeContext,card: RegExp,col: number,row: number) {
  const before = (await state(ctx))?.towers ?? 0;
  const button = ctx.page.locator('.drawer button').filter({ hasText: card }).first();
  if (!await button.isEnabled().catch(() => false)) return false;
  if (!await button.click({ timeout: 2000 }).then(() => true,() => false)) return false;
  const point = await ctx.run(([c,r]) => (window as any).__vanexTest.cellCenter(c,r),[col,row]) as { x: number; y: number };
  await ctx.page.mouse.click(point.x,point.y);
  await ctx.wait(120);
  await ctx.page.mouse.move(4,4); // no placement ghost under the cursor (Escape would pause)
  return ((await state(ctx))?.towers ?? 0) > before;
}
/** Towers line both sides of the two-lane path (rows 5–6) so every wave runs a gauntlet. */
const corridor: [number,number][] = [];
// Column 9 stays free for the combo tower.
for (const col of [5,7,11,13,6,8,10,12,4,14,15,3]) corridor.push([col,4],[col,7]);
/** Mix tower types for a lively board: the priciest affordable card in the given order. */
async function fillCorridor(ctx: TakeContext,limit = 99) {
  let built = 0;
  for (const [col,row] of corridor) {
    if (built >= limit) break;
    const coins = (await state(ctx))?.coins ?? 0;
    const card = coins >= 60 && built % 2 === 0 ? /Flame Spire/ : coins >= 35 ? /Pop Cannon/ : coins >= 20 ? /Arrow Post/ : null;
    if (!card) break;
    if (await build(ctx,card,col,row)) built++;
  }
  return built;
}
async function setSpeed(ctx: TakeContext,speed: 1 | 3) {
  for (let i = 0; i < 3; i++) { const label = await ctx.page.getByRole('button',{ name: 'Game speed' }).innerText().catch(() => ''); if (label.startsWith(`${speed}x`)) return; await ctx.page.getByRole('button',{ name: 'Game speed' }).click(); }
}
/** The element picker is a modal that opens on its own when a crystal is available. */
async function pickElement(ctx: TakeContext,element: string) {
  // At the start of a map the picker opens by itself; later crystals show a prompt button instead.
  const modal = ctx.page.locator('.modal-back');
  if (!await modal.waitFor({ state: 'visible',timeout: 2500 }).then(() => true,() => false)) await ctx.page.getByRole('button',{ name: /Pick an element/ }).first().click({ timeout: 5000,force: true }); // it pulses, so never "stable"
  const choice = ctx.page.locator('.modal-back button').filter({ hasText: new RegExp(`^\\s*${element}`) }).first();
  await choice.waitFor({ state: 'visible',timeout: 20000 });
  await choice.click();
  await ctx.page.locator('.modal-back').waitFor({ state: 'hidden',timeout: 5000 }).catch(() => {});
}
async function sendWave(ctx: TakeContext) {
  const resume = ctx.page.getByRole('button',{ name: /Keep playing/ });
  if (await resume.isVisible().catch(() => false)) await resume.click();
  await ctx.page.getByRole('button',{ name: 'Send next wave' }).click({ force: true,timeout: 3000 });
}

export const scenario: Scenario = {
  slug: 'vanex-defense',
  canvas: '#game canvas',
  loopOrder: ['boss','battle','combo'],
  takes: [
    {
      id: 'first-wave',
      loop: false,
      query: '?map=w1m1&diff=easy',
      storage: { 'vanex-defense-save': JSON.stringify(save) },
      crop: [400,150,1280,720],
      async setup(ctx) {
        await pickElement(ctx,'Fire');
        await ctx.wait(600);
        await build(ctx,/Flame Spire/,7,4); await build(ctx,/Flame Spire/,10,7);
        await fillCorridor(ctx);
        ctx.log(`  built ${(await state(ctx))?.towers} towers; buttons: ${(await buttons(ctx)).join(' | ')}`);
        await sendWave(ctx); await ctx.wait(2500);
      },
      async act(ctx) {
        await ctx.wait(3200); await ctx.cut();
        await ctx.wait(1500); await ctx.still('Little towers fire at a wave of Grumblewumps');
        await ctx.wait(2000); await ctx.still('A maze of towers guards the crystal castle');
        await ctx.wait(500);
      }
    },
    {
      id: 'combo',
      continues: true,
      crop: [442,240,960,540],
      async setup(ctx) {
        await setSpeed(ctx,3);
        // Play on until wave 5 brings a second element crystal.
        for (let i = 0; i < 400; i++) {
          const s = await state(ctx); if (!s) break;
          if (i % 15 === 0) ctx.log(`  ${JSON.stringify(s)}`);
          if (s.crystals > 0) break;
          if (s.enemies === 0) await sendWave(ctx).catch(() => {});
          if (s.coins >= 40) await fillCorridor(ctx,2);
          await ctx.wait(400);
        }
        await pickElement(ctx,'Water');
        await ctx.wait(800);
        const all = await buttons(ctx); ctx.log(`  after Water: ${all.join(' | ')}`);
        // The combo card is the last numbered card: it follows the element cards in the drawer.
        const combo = all.filter(text => /^\d+ .+ \d+$/.test(text)).at(-1);
        ctx.log(`  combo card: ${combo}`);
        while (((await state(ctx))?.coins ?? 0) < 160) { const s = await state(ctx); if (s && s.enemies === 0) await sendWave(ctx).catch(() => {}); await ctx.wait(500); }
        if (combo) { const name = combo.replace(/^\d+ /,'').replace(/ \d+$/,''); for (const [col,row] of [[9,4],[9,7]] as const) if (await build(ctx,new RegExp(name),col,row)) ctx.log(`  built ${name} at ${col},${row}`); }
        await setSpeed(ctx,1);
        while (((await state(ctx))?.enemies ?? 0) > 0) await ctx.wait(300);
        await sendWave(ctx); await ctx.wait(2200);
      },
      async act(ctx) {
        await ctx.wait(800); await ctx.cut();
        await ctx.wait(1600); await ctx.still('A steaming combo tower mixes fire and water');
        await ctx.wait(2200);
      }
    },
    {
      id: 'battle',
      continues: true,
      crop: [300,180,1280,720],
      async setup(ctx) {
        await setSpeed(ctx,3);
        for (let i = 0; i < 400; i++) {
          const s = await state(ctx); if (!s) break;
          if (s.wave >= 8 && s.enemies === 0) break;
          if (s.enemies === 0) await sendWave(ctx).catch(() => {});
          if (s.coins >= 60) await fillCorridor(ctx,2);
          await ctx.wait(400);
        }
        await setSpeed(ctx,1); await sendWave(ctx); await ctx.wait(2600);
      },
      async act(ctx) {
        await ctx.wait(600); await ctx.cut();
        await ctx.wait(1500); await ctx.still('A full tower maze fires at a big wave');
        await ctx.wait(1600);
      }
    },
    {
      id: 'boss',
      continues: true,
      crop: [222,230,960,540],
      async setup(ctx) {
        await setSpeed(ctx,3);
        for (let i = 0; i < 600; i++) {
          const s = await state(ctx); if (!s) break;
          if (s.wave >= 10 && s.enemies > 0) break;
          if (s.enemies === 0) await sendWave(ctx).catch(() => {});
          if (s.coins >= 60) await fillCorridor(ctx,2);
          await ctx.wait(400);
        }
        ctx.log(`  boss wave: ${JSON.stringify(await state(ctx))}`);
        await setSpeed(ctx,1); await ctx.wait(1500);
      },
      async act(ctx) {
        await ctx.wait(1500); await ctx.cut();
        await ctx.wait(1500); await ctx.still('King Gloop, the wave-10 boss, arrives with his crown');
        await ctx.wait(2500); await ctx.still('Towers bombard King Gloop as he marches through the maze');
        await ctx.wait(800);
      }
    }
  ]
};
