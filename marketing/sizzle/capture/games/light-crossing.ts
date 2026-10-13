// Light Crossing 2.0 reel takes. ?preview=<scene> opens a staged, UI-free scene (src/preview.ts);
// window.__lc.dev (src/dev.ts) stages the Lantern Skate festival as the game's own tests do.
// Walking uses the real controls (held arrow keys). The reel's tablet shot is Cliff Valley's:
// recording the whole tab is too costly on this page to stay smooth.
import type { Scenario, TakeContext } from '../../../../apps/site/scripts/capture/types';

// camera.zoom scales the camera distance: 0.7 is the closest view a player can pick in Settings.
const settings = (touch: 'auto' | 'on' = 'auto', quality = 'high') => ({ 'lightcrossing.settings': JSON.stringify({ master: 0.8, music: 0, sfx: 0.8, textSpeed: 'normal', camera: { zoom: 0.7, tilt: 40, smoothing: 7 }, tips: false, touch, quality, shadows: true, reduceMotion: false, readAloud: false, textSize: 1 }) });

// dev.start() returns the whole Game object: never send that back to Node (serializing it can hang).
const dev = <T>(ctx: TakeContext, name: string, ...args: unknown[]) => ctx.run(([n, a]) => { const r = (window as any).__lc.dev[n as string](...(a as unknown[])); return n === 'start' ? null : r; }, [name, args] as const) as Promise<T>;
const ready = (ctx: TakeContext) => ctx.page.waitForFunction(() => !!(window as any).__lc?.dev, null, { timeout: 60_000 });
const previewReady = (ctx: TakeContext) => ctx.page.waitForFunction(() => (window as any).__previewReady === true, null, { timeout: 60_000 });

/** Screen-space direction from the player to a world point (keys move relative to the screen). */
const toward = (ctx: TakeContext, x: number, z: number) => ctx.run(([tx, tz]) => {
  const d = (window as any).__lc.dev, p = d.peek(), a = d.screen(p.x, 0, p.z), b = d.screen(tx, 0, tz);
  return { dx: b.x - a.x, dy: b.y - a.y, dist: Math.hypot(tx - p.x, tz - p.z) };
}, [x, z] as const);

/** Skate/walk to a point with the arrow keys, steering every 120 ms. */
async function keysTo(ctx: TakeContext, x: number, z: number, near = 0.6, ms = 9000) {
  const held = new Set<string>(); const end = Date.now() + ms;
  const set = async (keys: string[]) => { for (const k of [...held]) if (!keys.includes(k)) { await ctx.page.keyboard.up(k); held.delete(k); } for (const k of keys) if (!held.has(k)) { await ctx.page.keyboard.down(k); held.add(k); } };
  for (;;) {
    const t = await toward(ctx, x, z);
    if (t.dist <= near || Date.now() > end) break;
    const len = Math.hypot(t.dx, t.dy) || 1, ux = t.dx / len, uy = t.dy / len, keys: string[] = [];
    if (ux > 0.38) keys.push('ArrowRight'); if (ux < -0.38) keys.push('ArrowLeft');
    if (uy > 0.38) keys.push('ArrowDown'); if (uy < -0.38) keys.push('ArrowUp');
    await set(keys); await ctx.wait(120);
  }
  await set([]);
}

export const scenario: Scenario = {
  slug: 'light-crossing',
  canvas: '#game',
  takes: [
    {
      // The Lantern Skate: winter festival on the frozen pond, skating through the lantern rings.
      id: 'skate', storage: settings('auto'), audio: true,
      async setup(ctx) {
        await ready(ctx); await ctx.page.keyboard.press('Shift');
        await dev(ctx, 'start', 777, 'Wren', 2); await dev(ctx, 'town', ['tansy', 'rusk', 'juno', 'kip', 'mochi', 'marlowe']);
        await dev(ctx, 'festival', 'lanternSkate'); await ctx.wait(1500);
        // Start on the ice beside the first lantern ring (the game's tests walk there first).
        const [first] = await dev<{ x: number; z: number }[]>(ctx, 'rings');
        await dev(ctx, 'goto', first.x - 2.5, first.z + 2.5); await ctx.wait(1200);
        await ctx.run(() => (window as any).__lc.hud?.setVisible?.(false));
      },
      async act(ctx) {
        const rings = await dev<{ x: number; z: number }[]>(ctx, 'rings');
        await ctx.cut(0.3);
        for (const ring of rings) { await keysTo(ctx, ring.x, ring.z, 0.5); ctx.log(`  ring: ${(await toward(ctx, ring.x, ring.z)).dist.toFixed(2)} tiles away`); }
        await ctx.wait(400);
      }
    },
    { id: 'festival', query: '?preview=festival', storage: settings('auto'), async setup(ctx) { await previewReady(ctx); await ctx.wait(1500); }, async act(ctx) { await ctx.cut(0.3); await ctx.wait(6500); } },
    {
      // The island in autumn: a walk across the plaza past the villagers.
      id: 'autumn', storage: settings('auto'), audio: true,
      async setup(ctx) {
        await ready(ctx); await ctx.page.keyboard.press('Shift');
        await dev(ctx, 'start', 777, 'Wren', 2); await dev(ctx, 'town', ['tansy', 'rusk', 'juno', 'kip', 'mochi', 'marlowe']);
        await dev(ctx, 'season', 'autumn', 3); await dev(ctx, 'hour', 15.5); await dev(ctx, 'toPlaza'); await ctx.wait(1500);
      },
      async act(ctx) { await ctx.cut(0.2); await ctx.hold(['ArrowRight'], 1600); await ctx.hold(['ArrowUp', 'ArrowRight'], 1300); await ctx.hold(['ArrowUp'], 1200); await ctx.hold(['ArrowLeft'], 1400); await ctx.wait(400); }
    },
    {
      // A decorated home: walking round Tansy's cozy house.
      id: 'home', storage: settings('auto'), audio: true,
      async setup(ctx) {
        await ready(ctx); await ctx.page.keyboard.press('Shift');
        await dev(ctx, 'start', 777, 'Wren', 2); await dev(ctx, 'town', ['tansy', 'rusk', 'juno', 'kip', 'mochi', 'marlowe']);
        await dev(ctx, 'hour', 12.5); await dev(ctx, 'inside', 'villager:tansy'); await ctx.wait(1800);
      },
      async act(ctx) { await ctx.cut(0.2); await ctx.hold(['ArrowUp'], 900); await ctx.hold(['ArrowRight'], 1100); await ctx.hold(['ArrowUp', 'ArrowLeft'], 1000); await ctx.hold(['ArrowLeft'], 1100); await ctx.wait(500); }
    }
  ]
};
