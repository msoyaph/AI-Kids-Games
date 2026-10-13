// Space Sky 2.0 (3D) reel takes. ?debug exposes window.__spacesky (src/main.ts); scenes are
// reached with game.go() exactly as the game's own screenshot script does (scripts/shots.mjs),
// after a real new game. The WebGL canvas (#stage3) is recorded, so the DOM HUD stays out.
import type { Scenario, Take, TakeContext } from '../../../../apps/site/scripts/capture/types';

const storage = { 'spacesky.settings': JSON.stringify({ music: 0, sfx: 0.8, readAloud: false, tips: false, lastSlot: -1, quality: 'high', comfort: false, flipY: false }) };
// q=medium: at q=high the 3D scenes take ~15-20 ms a frame on the capture Mac and frames land
// unevenly; medium holds a steady 60 fps. ?stress keeps the quality governor from changing tiers.
const query = '?debug&q=medium&stress';

async function skipDialogue(ctx: TakeContext) {
  for (let i = 0; i < 60; i++) {
    const d = ctx.page.getByTestId('dialogue');
    if (!(await d.isVisible().catch(() => false))) { if (i > 2) break; await ctx.wait(150); continue; }
    await d.click({ force: true }).catch(() => {}); await ctx.wait(80);
  }
}

async function newGame(ctx: TakeContext) {
  await ctx.page.getByTestId('btn-play').waitFor({ timeout: 60_000 });
  await ctx.wait(1500); // the title's intro swallows an early click
  await ctx.page.getByTestId('btn-play').click({ force: true });
  await ctx.page.getByTestId('slot-0').click({ force: true });
  await ctx.page.getByTestId('name-input').fill('Nova');
  await ctx.page.getByTestId('btn-start').click({ force: true });
  await ctx.page.getByTestId('hub-banner').waitFor({ timeout: 60_000 });
  await ctx.wait(1200); await skipDialogue(ctx);
  await ctx.run(() => { const S = (window as any).__spacesky; S.settings.tips = false; S.state.setFlag('zibboJoined'); S.audio.setVolumes(0, 0.8); });
}

async function go(ctx: TakeContext, scene: string, params: Record<string, unknown>) {
  await ctx.run(([s, p]) => { const S = (window as any).__spacesky; if (s === 'explore') S.state.setFlag(`intro:${(p as any).area}`); void S.game.go(s, p); }, [scene, params] as const);
  await ctx.page.waitForFunction(s => { const g = (window as any).__spacesky.game; return g.sceneName === s && !g.isSwitching; }, scene, { timeout: 60_000 });
  await ctx.wait(300); await skipDialogue(ctx);
  await ctx.run(() => document.querySelectorAll('.toast, .tip-card, .confetti-layer').forEach(e => e.remove()));
}

const take = (id: string, setup: Take['setup'], act: Take['act']): Take => ({ id, query, storage, audio: true, async setup(ctx) { await newGame(ctx); await setup(ctx); }, act });

export const scenario: Scenario = {
  slug: 'space-sky',
  canvas: '#stage3',
  takes: [
    take('saturn', async ctx => {
      await go(ctx, 'flight', { from: 'jupiter', to: 'saturn' });
      // Put the rocket on a course that passes just outside Saturn's rings.
      await ctx.run(() => {
        const sc = (window as any).__spacesky.game.current, sat = sc.getLayout().world.bodies.find((b: any) => b.id === 'saturn'), s = sc.getShip();
        s.x = s.px = sat.x - sat.r * 7; s.y = s.py = sat.y - sat.r * 3.1; s.h = s.ph = sat.h + sat.r * 0.5;
        s.yaw = s.pyaw = 0; s.pitch = s.ppitch = 0; s.vx = s.vy = s.vh = 0;
      });
      await ctx.wait(1800);
    }, async ctx => { await ctx.cut(0.3); await ctx.hold(['Space'], 1500); await ctx.wait(5500); }),
    take('moon-landing', async ctx => {
      // Easy: the Auto-Lander keeps the descent slow while the rocket steers to the pad.
      await ctx.run(() => { (window as any).__spacesky.state.data.difficulty = 'easy'; });
      await go(ctx, 'landing', { body: 'moon' });
    }, async ctx => {
      await ctx.cut(0);
      await ctx.page.waitForFunction(() => (window as any).__spacesky.game.sceneName !== 'landing', null, { timeout: 45_000 }).catch(() => ctx.log('  (still landing)'));
      await ctx.wait(800);
    }),
    take('europa', async ctx => { await go(ctx, 'explore', { area: 'europa_ice' }); await ctx.wait(1500); }, async ctx => {
      await ctx.cut(0.2);
      await ctx.hold(['ArrowRight'], 1600); await ctx.page.keyboard.press('Space');
      await ctx.hold(['ArrowRight'], 2200); await ctx.page.keyboard.press('Space'); await ctx.hold(['ArrowRight'], 1600);
    })
  ]
};
