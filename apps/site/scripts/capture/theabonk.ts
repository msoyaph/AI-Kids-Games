// TheaBonk capture route (v2). Uses the production hook window.__theabonk (src/main.ts in the
// game project) and ?seed= / ?stress= / ?map= URL params. Nothing in the build is changed.
import type { Scenario, TakeContext } from './types';

const settings = { masterVolume: 0,musicVolume: 0,sfxVolume: 0,sensitivity: 1,invertY: false,quality: 'high',showFps: false,screenShake: false,damageNumbers: false,mouseMode: 'drag' };
const storage = { 'theabonk.save': JSON.stringify({ version: 1,settings }) };

async function startRun(ctx: TakeContext,hero?: string,map?: string) {
  if (hero) await ctx.run(([h,m]) => (window as any).__theabonk.startRun(h,m),[hero,map]);
  else {
    await ctx.page.getByRole('button',{ name: 'Play',exact: true }).click();
    await ctx.page.getByRole('button',{ name: 'Start run',exact: true }).click();
  }
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

/**
 * A thumb on the glass stick (touch Pointer Events through the game's real touch input, which
 * also switches the game to its touch controls): one slow loop around the stick for `ms`.
 */
async function thumb(ctx: TakeContext,ms: number) {
  await ctx.run(async (duration: number) => {
    const zone = document.querySelector('.tzone-stick') as HTMLElement, r = zone.getBoundingClientRect();
    const x0 = r.left + r.width * .35, y0 = r.top + r.height * .62, reach = 46;
    const at = (a: number, d: number): PointerEventInit => ({ pointerId: 41,pointerType: 'touch',isPrimary: true,bubbles: true,cancelable: true,clientX: x0 + Math.sin(a) * d,clientY: y0 - Math.cos(a) * d });
    zone.dispatchEvent(new PointerEvent('pointerdown',at(0,0)));
    const t0 = performance.now();
    while (performance.now() - t0 < duration) {
      const k = (performance.now() - t0) / duration;
      zone.dispatchEvent(new PointerEvent('pointermove',at(k * Math.PI * 2 * 1.25,reach)));
      await new Promise(done => requestAnimationFrame(done));
    }
    zone.dispatchEvent(new PointerEvent('pointerup',at(0,reach)));
  },ms);
}

export const scenario: Scenario = {
  slug: 'theabonk',
  canvas: '#game',
  // Start (and poster) on the horde: Thea faces the camera with monsters all around.
  loopOrder: ['horde','rimewood','touch','boss'],
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
      id: 'rimewood',
      query: '?seed=11',
      storage,
      async setup(ctx) { await startRun(ctx,'ottie','rimewood'); await jumpTo(ctx,19,896.5); },
      async act(ctx) {
        // Old Rime, the Frost Stag, arrives at 15:00 in the snowy Rimewood; Ottie turns to face it.
        await ctx.wait(3200);
        await ctx.run(() => {
          const g = (window as any).__theabonk, w = g.world, e = w.enemies;
          for (let i = 0; i < e.count; i++) if (e.uid[i] === w.director.bossUid) { const dx = e.x[i]-w.player.x, dz = e.z[i]-w.player.z; g.renderer.rig.yaw = Math.atan2(-dx,-dz); }
        });
        await ctx.hold(['w'],400); await ctx.cut();
        await ctx.hold(['w'],900); await ctx.still('Ottie faces Old Rime, the Frost Stag, in the snowy Rimewood');
        await strafe(ctx,2400);
      }
    },
    {
      id: 'touch',
      query: '?seed=9&stress=160',
      storage,
      source: 'tab',
      async setup(ctx) { await startRun(ctx); await ctx.hold(['s'],1500); await thumb(ctx,2500); },
      async act(ctx) {
        // On phones and tablets: the glass stick and buttons (the HUD stays hidden for the loop).
        await ctx.cut(); const go = thumb(ctx,6200);
        await ctx.wait(2600); await ctx.still('On a phone or tablet: the glass touch stick and the Jump and Slide buttons');
        await go;
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
