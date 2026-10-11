// TheaBonk capture route. Uses the production hook window.__theabonk (src/main.ts in the
// game project) and ?seed=/?stress= URL params. Nothing in the build is changed.
import type { Scenario, TakeContext } from './types';

const settings = { masterVolume: 0,musicVolume: 0,sfxVolume: 0,sensitivity: 1,invertY: false,quality: 'high',showFps: false,screenShake: false,damageNumbers: false,mouseMode: 'drag' };
const storage = { 'theabonk.save': JSON.stringify({ version: 1,settings }) };

async function startRun(ctx: TakeContext) {
  await ctx.page.getByRole('button',{ name: 'Play',exact: true }).click();
  await ctx.page.getByRole('button',{ name: 'Start run',exact: true }).click();
  await ctx.page.waitForFunction(() => !!(window as any).__theabonk.world);
  await ctx.run(() => {
    const g = (window as any).__theabonk;
    g.world.options.god = true; g.ui.hud.show(false);
    // Kills earn XP; a natural level-up would pause the run behind a menu mid-take.
    g.world.player.xpNext = 1e9;
    g.renderer.rig.pitch = 0.36; g.renderer.rig.distance *= 0.72;
  });
}
/** Jump the wave director to just before a scripted event (see src/config/waves.ts). */
const jumpTo = (ctx: TakeContext,eventIndex: number,time: number) => ctx.run(([index,t]) => { const w = (window as any).__theabonk.world; w.director.eventIndex = index; w.time = t; },[eventIndex,time]);
/** Steer Thea in a lazy figure-eight so the ring sweeps through the crowd. */
async function strafe(ctx: TakeContext,ms: number) {
  const steps: [string[],number][] = [[['w'],700],[['w','d'],600],[['d'],500],[['s','d'],500],[['s'],600],[['s','a'],500],[['a'],500],[['w','a'],600]];
  let left = ms;
  for (let i = 0; left > 0; i = (i+1) % steps.length) { const [keys,time] = steps[i]; const t = Math.min(time,left); await ctx.hold(keys,t); left -= t; }
}

export const scenario: Scenario = {
  slug: 'theabonk',
  canvas: '#game',
  // Start (and poster) on the horde: Thea faces the camera with monsters all around.
  loopOrder: ['horde','ring-wave','level-up','boss'],
  takes: [
    {
      id: 'ring-wave',
      query: '?seed=11',
      storage,
      async setup(ctx) { await startRun(ctx); await ctx.hold(['w'],1200); await jumpTo(ctx,6,386.5); },
      async act(ctx) {
        // 6:30 brings a ring of 16 Blobbins around Thea; her Bonk Ring sweeps through them.
        await ctx.wait(5600); await ctx.cut();
        await strafe(ctx,2200); await ctx.still('Thea and her glowing Bonk Ring in a ring of pink Blobbins');
        await strafe(ctx,2000);
      }
    },
    {
      id: 'horde',
      query: '?seed=9&stress=300',
      storage,
      async setup(ctx) { await startRun(ctx); await ctx.hold(['s'],2200); await ctx.wait(5000); },
      async act(ctx) {
        await strafe(ctx,1500); await ctx.cut(-0.4);
        await strafe(ctx,500); await ctx.still('A huge crowd of cartoon monsters rushes at Thea');
        await strafe(ctx,2200);
      }
    },
    {
      id: 'level-up',
      query: '?seed=11',
      storage,
      source: 'tab',
      crop: [400,180,1120,630],
      async setup(ctx) { await startRun(ctx); await jumpTo(ctx,1,118); await strafe(ctx,5000); },
      async act(ctx) {
        await strafe(ctx,900);
        await ctx.cut();
        await ctx.run(() => { (window as any).__theabonk.world.pendingLevels = 1; });
        await ctx.wait(1700); await ctx.still('Level up: choose one of three new powers');
        await ctx.page.keyboard.press('1');
        await strafe(ctx,1800);
      }
    },
    {
      id: 'boss',
      query: '?seed=11',
      storage,
      async setup(ctx) { await startRun(ctx); await jumpTo(ctx,4,297.5); },
      async act(ctx) {
        // Grumblecap arrives at 5:00, 30 m away; turn the camera toward it and charge in.
        await ctx.wait(2600);
        await ctx.run(() => {
          const g = (window as any).__theabonk, w = g.world, e = w.enemies;
          for (let i = 0; i < e.count; i++) if (e.uid[i] === w.director.bossUid) { const dx = e.x[i]-w.player.x, dz = e.z[i]-w.player.z; g.renderer.rig.yaw = Math.atan2(-dx,-dz); }
        });
        await ctx.hold(['w'],500); await ctx.cut();
        await ctx.hold(['w'],900); await ctx.still('Thea faces Grumblecap, the giant mushroom boss');
        await strafe(ctx,2400);
      }
    }
  ]
};
