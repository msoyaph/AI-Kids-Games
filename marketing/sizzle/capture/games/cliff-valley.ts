// Cliff Valley 1.0 reel takes. ?scene=<name> builds a live, unsaved scene (src/game/hook.ts) and
// &hud=0 hides the HUD; the farmer is then played with the real keys (WASD, E to interact,
// Space to use a tool). The PixiJS canvas ('#game canvas') is recorded.
import type { Device, Scenario, TakeContext } from '../../../../apps/site/scripts/capture/types';

// The farm shows more tiles in a bigger window instead of bigger tiles: record a 1280×720 window at
// 1.5× pixel density, which is still a 1920×1080 canvas with the game's usual framing.
const DESKTOP: Device = { width: 1280, height: 720, scale: 1.5 };
const TABLET: Device = { width: 1180, height: 820, scale: 1, touch: true, userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' };

const storage = { 'cliffvalley.settings': JSON.stringify({ music: 0, sfx: 0.8 }) };
const info = (ctx: TakeContext) => ctx.run(() => (window as any).__cliffvalley.info as { tile: { x: number; y: number }; location: string; mode: string });
const inScene = (ctx: TakeContext) => ctx.page.waitForFunction(() => (window as any).__cliffvalley?.info?.mode === 'play', null, { timeout: 60_000 });

/** Step one tile with a held key (stops as soon as the farmer reaches the next tile). */
async function step(ctx: TakeContext, key: string, axis: 'x' | 'y', by: number) {
  const from = (await info(ctx)).tile[axis];
  await ctx.page.keyboard.down(key);
  for (let i = 0; i < 40 && (await info(ctx)).tile[axis] !== from + by; i++) await ctx.wait(15);
  await ctx.page.keyboard.up(key);
}

export const scenario: Scenario = {
  slug: 'cliff-valley',
  canvas: '#game canvas',
  takes: [
    {
      // Clover Farm at harvest time: pick a row of ripe crops (each one pops with sparkles).
      id: 'harvest', device: DESKTOP, query: '?scene=farmHarvest&hud=0&zoom=2', storage, audio: true,
      async setup(ctx) { await inScene(ctx); await ctx.page.keyboard.press('Shift'); await ctx.wait(1200); },
      async act(ctx) {
        await ctx.cut(0.2);
        for (let i = 0; i < 6; i++) { await ctx.page.keyboard.press('KeyE'); await ctx.wait(260); await step(ctx, 'KeyS', 'y', 1); await ctx.wait(60); }
        await ctx.wait(600);
      }
    },
    {
      // Starlight Night: a walk through the decorated town square in the snow.
      id: 'festival', device: DESKTOP, query: '?scene=festival&hud=0&zoom=2', storage, audio: true,
      async setup(ctx) { await inScene(ctx); await ctx.page.keyboard.press('Shift'); await ctx.wait(1500); },
      async act(ctx) {
        await ctx.cut(0.2);
        for (const [key, ms] of [['KeyW', 900], ['KeyD', 800], ['KeyW', 700], ['KeyA', 1300], ['KeyS', 500]] as const) await ctx.hold([key], ms);
        await ctx.wait(400);
      }
    },
    {
      // Deep in the crystal mine.
      id: 'mine', device: DESKTOP, query: '?scene=mine&hud=0&zoom=2', storage, audio: true,
      async setup(ctx) { await inScene(ctx); await ctx.page.keyboard.press('Shift'); await ctx.wait(1200); },
      async act(ctx) {
        await ctx.cut(0.2);
        for (const [key, ms] of [['KeyD', 700], ['KeyS', 500], ['KeyD', 600], ['KeyW', 700], ['KeyA', 500]] as const) await ctx.hold([key], ms);
        await ctx.wait(500);
      }
    },
    {
      // A tablet in landscape, played by touch: the Interact button picks the crop in front, a tap
      // on the cleared ground walks there (the HUD and its touch buttons stay on).
      id: 'tablet', query: '?scene=farmHarvest&zoom=2', storage, source: 'tab', device: TABLET,
      async setup(ctx) { await inScene(ctx); await ctx.wait(1200); },
      async act(ctx) {
        const cdp = await ctx.page.context().newCDPSession(ctx.page);
        const tap = async (x: number, y: number) => {
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1, radiusX: 9, radiusY: 9, force: 1 }] });
          await ctx.wait(90); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        };
        const centre = (sel: string) => ctx.run(q => { const r = document.querySelector(q)!.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, sel);
        await tap(TABLET.width / 2 + 200, 120); // a first touch switches the game to its touch controls
        await ctx.page.locator('.touch.on .tbtn.hand').waitFor({ timeout: 10_000 }); await ctx.wait(400);
        await ctx.cut();
        for (let i = 0; i < 5; i++) {
          await tap(...Object.values(await centre('.tbtn.hand')) as [number, number]); await ctx.wait(450);
          const { x, y } = (await info(ctx)).tile;
          const below = await ctx.run(([tx, ty]) => (window as any).__cliffvalley.screenOf(tx, ty), [x, y + 1] as const);
          await tap(below.x, below.y); await ctx.wait(650);
        }
        await ctx.wait(400);
      }
    }
  ]
};
