// Calex Cart reel takes. Production hook window.__calex.app (src/main.ts): startSession()
// starts a race on any track, and the AI autopilot drives Calex (as in the game's own tests).
import type { Device, Scenario, Take, TakeContext } from '../../../../apps/site/scripts/capture/types';

const AI = ['pip', 'juno', 'mochi', 'grumbo', 'bo', 'fennel', 'luma'];
export const PHONE: Device = { width: 844, height: 390, scale: 2, touch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' };

/**
 * Start a race: sound effects on, music off (the reel has its own), controls card already seen,
 * and the closest chase camera a player can pick in Settings for the HUD-free shots.
 */
async function race(ctx: TakeContext, track: string, opts: { ai?: number; autopilot?: boolean; hud?: boolean; seed?: number; speed?: string } = {}) {
  await ctx.page.waitForFunction(() => !!(window as any).__calex?.app?.saves);
  await ctx.page.keyboard.press('Shift'); // a key press unlocks the game's audio
  await ctx.run(async ({ track, ai, autopilot, hud, seed, speed, ids }) => {
    const a = (window as any).__calex.app;
    if (!a.saves.data) a.saves.create(3, 'Reel');
    Object.assign(a.saves.settings, { master: 0.8, music: 0, sfx: 0.8, screenShake: false, cameraDistance: hud ? 1 : 0.8, controlsSeen: { keyboard: true, gamepad: true, touch: true } });
    a.applySettings();
    a.startSession({
      mode: 'versus', trackId: track, speedClass: speed, mirror: false, items: true, itemSet: 'all', laps: 3,
      players: [{ racerId: 'calex', kart: { body: 'zoomster', wheels: 'standard', glider: 'kite', paint: 'cherry', decal: 'none' }, source: { kind: 'any' } }],
      ai: ids.slice(0, ai).map((id: string, i: number) => ({ racerId: id, kart: { body: i % 2 ? 'bubble' : 'zoomster', wheels: 'standard', glider: 'kite', paint: ['ocean', 'lime', 'sunny', 'grape', 'ocean', 'lime', 'sunny'][i], decal: 'none' } })),
      seed, intro: false
    }, () => {});
    if (autopilot) {
      // Long, high-tier spark drifts and every turbo, like the game's own time-trial ghost.
      const k = a.session.world.karts[0]; k.player = -1;
      a.session.ai.takeOver(k, 1, 'careful', { rocketStart: true, targetTier: 3, shortcutChance: 1, turboPlan: true, paceMul: 1 }); k.player = 0;
    }
    while (a.session.world.phase !== 'race') await new Promise(done => setTimeout(done, 30));
    if (!hud) (document.querySelector('.hud-layer') as HTMLElement | null)?.style.setProperty('display', 'none');
  }, { track, ai: opts.ai ?? 5, autopilot: opts.autopilot ?? true, hud: !!opts.hud, seed: opts.seed ?? 7, speed: opts.speed ?? 'pro', ids: AI });
}

/** Wait (up to `ms`) until Calex is in a drift of at least `tier`, then return. */
const kart = (ctx: TakeContext) => ctx.run(() => { const k = (window as any).__calex.app.session.world.karts[0]; return { drifting: !!k.drifting, tier: k.driftTier as number, boost: k.boostTime as number, gliding: !!k.gliding }; });
async function until(ctx: TakeContext, test: (k: Awaited<ReturnType<typeof kart>>) => boolean, ms: number) {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (test(await kart(ctx))) return true; await ctx.wait(50); }
  ctx.log('  (moment not reached; cutting anyway)'); return false;
}

const drift = (id: string, track: string, seed: number, settle: number): Take => ({
  id, query: '', audio: true,
  async setup(ctx) { await race(ctx, track, { seed }); await ctx.wait(settle); },
  async act(ctx) {
    await ctx.wait(400);
    await until(ctx, k => k.drifting && k.tier >= 2, 14000); await ctx.cut(-1.6);
    await ctx.wait(4200);
  }
});

export const scenario: Scenario = {
  slug: 'calex-cart',
  canvas: '#gl',
  takes: [
    // Cold open: a spark drift through Lantern Village on lantern-festival night.
    drift('lantern-drift', 'lantern-village', 7, 2500),
    drift('avalanche-drift', 'avalanche-peak', 5, 3000),
    {
      id: 'neon-boost', audio: true,
      async setup(ctx) { await race(ctx, 'neon-nightway', { seed: 9 }); await ctx.wait(2500); },
      async act(ctx) {
        await ctx.wait(400);
        await until(ctx, k => k.boost > 0.4, 15000); await ctx.cut(-0.5);
        await ctx.wait(4200);
      }
    },
    {
      // The full race view (positions, lap, items; the largest HUD size in Settings) as Calex
      // glides over Canyon Run's forest gorge.
      id: 'race-hud', audio: true, source: 'tab',
      async setup(ctx) {
        await race(ctx, 'canyon-run', { ai: 7, hud: true, seed: 3 });
        await ctx.run(() => { const a = (window as any).__calex.app; a.saves.settings.hudSize = 1.5; a.applySettings(); });
        await ctx.page.waitForFunction(() => (window as any).__calex.app.session.world.raceTime > 6.5, null, { timeout: 60_000 });
      },
      async act(ctx) {
        await until(ctx, k => k.gliding, 30000);
        ctx.log(`  glide at race time ${(await ctx.run(() => (window as any).__calex.app.session.world.raceTime)).toFixed(1)} s`);
        await ctx.cut(-1.4); await ctx.wait(4000);
      }
    },
    {
      // A phone, held sideways: the glass touch controls steering, drifting and boosting.
      id: 'phone', audio: true, source: 'tab', device: PHONE,
      async setup(ctx) { await race(ctx, 'lantern-village', { autopilot: false, hud: true, seed: 4, speed: 'rookie', ai: 5 }); },
      async act(ctx) {
        // Real touches drive the kart. A small pilot reads the racing line (as the game's AI
        // does) and moves the thumb on the stick; drift is held through the long corners.
        const cdp = await ctx.page.context().newCDPSession(ctx.page);
        const box = (selector: string) => ctx.run(sel => { const el = document.querySelector(sel); const r = el?.getBoundingClientRect(); return r && r.width > 0 ? { x: r.x + r.width / 2, y: r.y + r.height / 2, r: r.width / 2 } : null; }, selector);
        const stick = (await box('[data-ctl="stick"]'))!, driftAt = (await box('[data-ctl="drift"]'))!, go = await box('[data-ctl="accel"]');
        const point = (x: number, y: number, id: number) => ({ x, y, id, radiusX: 9, radiusY: 9, force: 1 });
        let down = false, drifting = false;
        const send = (type: 'touchStart' | 'touchMove' | 'touchEnd', dx: number) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: [
          ...(go ? [point(go.x, go.y, 2)] : []), ...(down ? [point(stick.x + dx, stick.y, 1)] : []), ...(drifting ? [point(driftAt.x, driftAt.y, 3)] : [])] });
        const pilot = () => ctx.run(() => {
          const s = (window as any).__calex.app.session, k = s.world.karts[0], track = s.track?.main ? s.track : s.ai.track, rb = track.main;
          const speed = Math.hypot(k.vx, k.vz), j = rb.idx(k.hint.sample + Math.round((7 + speed * 0.42) / rb.ds)), d = track.line[j];
          const want = Math.atan2(rb.px[j] + rb.rx[j] * d - k.x, rb.pz[j] + rb.rz[j] * d - k.z);
          let err = want - (k.drifting && speed > 4 ? Math.atan2(k.vx, k.vz) : k.yaw);
          while (err > Math.PI) err -= 2 * Math.PI; while (err < -Math.PI) err += 2 * Math.PI;
          return Math.max(-1, Math.min(1, -err * 2.4));
        });
        if (go) await send('touchStart', 0);
        down = true; await send('touchStart', 0); await ctx.cut();
        let bend = 0;
        for (const end = Date.now() + 9500; Date.now() < end;) {
          const steer: number = await pilot();
          bend = Math.abs(steer) > 0.55 ? bend + 1 : 0;
          const wantDrift: boolean = drifting ? Math.abs(steer) > 0.25 : bend >= 3;
          if (wantDrift !== drifting) { drifting = wantDrift; await send(drifting ? 'touchStart' : 'touchEnd', steer * stick.r * 0.9); }
          else await send('touchMove', steer * stick.r * 0.9);
          await ctx.wait(33);
        }
        down = false; drifting = false; await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await ctx.wait(300);
      }
    }
  ]
};
