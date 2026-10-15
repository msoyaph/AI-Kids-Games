// Fieldlark trailer and reel takes: the game's own capture route (?scene=showcase, a staged late-game
// farm that never saves), as the site's previews use it (apps/site/scripts/capture/fieldlark.ts), with
// longer takes so each can give two shots. Real play happens in them: rows picked, planted and watered
// with the tools, the fair entered, and a phone and a tablet played by touch. `&t=` picks the season,
// hour and weather, `&speed=` runs farm time faster (a time-lapse), `&x=&z=&zoom=` the view. Most takes
// record the canvas, so the HUD is left out; the fair, phone and tablet record the tab. The capture
// route keeps the game's music off; takes with `audio` keep its own sounds under the soundtrack.
import { scenario as site } from '../../../../apps/site/scripts/capture/fieldlark';
import type { Device, Scenario, TakeContext } from '../../../../apps/site/scripts/capture/types';

type Hook = { snapshot(): { screen: string; camera: { zoom: number } }; tileOnScreen(x: number, z: number): { x: number; y: number } };

/**
 * Waits until the farm is on screen. Now and then the camera comes up at its widest zoom instead of the
 * address's `zoom` (seen twice in about 30 takes); the page is then loaded again.
 */
async function ready(ctx: TakeContext) {
  const want = Number(new URL(ctx.page.url()).searchParams.get('zoom') ?? NaN);
  for (let attempt = 1; ; attempt++) {
    await ctx.page.waitForFunction(() => (window as unknown as { __fieldlark?: Hook }).__fieldlark?.snapshot().screen === 'farm', null, { timeout: 30000 });
    await ctx.wait(1500);
    const zoom = await ctx.run(() => (window as unknown as { __fieldlark: Hook }).__fieldlark.snapshot().camera.zoom);
    if (!(want > 0) || Math.abs(zoom - want) / want < 0.1 || attempt >= 3) return;
    ctx.log(`  the camera came up at zoom ${Math.round(zoom)}, not ${want}: loading the page again`);
    await ctx.page.reload();
  }
}

const tile = (ctx: TakeContext, x: number, z: number) => ctx.run(([tx, tz]) => (window as unknown as { __fieldlark: Hook }).__fieldlark.tileOnScreen(tx, tz), [x, z] as [number, number]);

/** Drag along a row (tile x0 → x1 at row z) with the current tool, by mouse or by a finger (CDP touches). */
async function dragRow(ctx: TakeContext, z: number, x0: number, x1: number, ms: number, touch = false) {
  const a = await tile(ctx, x0, z), b = await tile(ctx, x1, z);
  const steps = Math.max(8, Math.round(ms / 16));
  const cdp = touch ? await ctx.page.context().newCDPSession(ctx.page) : null;
  const finger = (type: 'touchStart' | 'touchMove' | 'touchEnd', x: number, y: number) =>
    cdp!.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1, radiusX: 9, radiusY: 9, force: 1 }] });
  if (cdp) await finger('touchStart', a.x, a.y);
  else { await ctx.page.mouse.move(a.x, a.y); await ctx.page.mouse.down(); }
  for (let i = 1; i <= steps; i++) {
    const x = a.x + ((b.x - a.x) * i) / steps, y = a.y + ((b.y - a.y) * i) / steps;
    if (cdp) await finger('touchMove', x, y); else await ctx.page.mouse.move(x, y);
    await ctx.wait(ms / steps);
  }
  if (cdp) await finger('touchEnd', b.x, b.y); else await ctx.page.mouse.up();
}
/** The hand tool picks a row of ripe crops. */
const pickRow = (ctx: TakeContext, z: number, x0: number, x1: number, ms: number) => dragRow(ctx, z, x0, x1, ms);

/** A slow push-in: the mouse wheel zooms towards the point under the pointer. */
async function pushIn(ctx: TakeContext, x: number, y: number, ticks: number, every: number, delta = -100) {
  await ctx.page.mouse.move(x, y);
  for (let i = 0; i < ticks; i++) { await ctx.page.mouse.wheel(0, delta); await ctx.wait(every); }
}

// Times of farm day for seed 7 (games/fieldlark/src/sim/forecast.ts; a day is 480 s, a season 6 days):
// a warm summer night with fireflies, a snowy winter afternoon, a rainy summer morning, a windy autumn
// day and a spring morning in the second year (blossom petals).
const NIGHT = 5256, SNOW = 9897.6, RAIN = 8 * 480 + 150, AUTUMN = 15 * 480 + 170, SPRING = 26 * 480 + 150;
/** The fair opens on the last day of a season: the last day of summer. */
const FAIR = 11 * 480 + 120;

const PHONE: Device = { width: 844, height: 390, scale: 2, touch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' };
const TABLET: Device = { width: 1180, height: 820, scale: 1, touch: true, userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' };

export const scenario: Scenario = {
  ...site,
  takes: [
    // --- the 15-second trailer ---
    {
      id: 'farm',
      query: '?scene=showcase&seed=7&x=41&z=43&zoom=74',
      async setup(ctx) { await ready(ctx); },
      async act(ctx) { await ctx.cut(); await ctx.hold(['ArrowRight'], 450); await ctx.wait(4200); },
    },
    {
      id: 'harvest',
      query: '?scene=showcase&seed=7&x=40&z=49&zoom=150',
      audio: true,
      async setup(ctx) { await ready(ctx); },
      async act(ctx) {
        await ctx.cut();
        await pickRow(ctx, 47, 40, 44, 1300);
        await ctx.wait(700);
        await pickRow(ctx, 46, 44, 40, 1300);
        await ctx.wait(1500);
      },
    },
    {
      id: 'night',
      query: `?scene=showcase&seed=7&x=40.5&z=41.5&zoom=92&t=${NIGHT}`,
      async setup(ctx) { await ready(ctx); },
      async act(ctx) { await ctx.cut(); await ctx.hold(['ArrowRight'], 400); await ctx.wait(4200); },
    },
    {
      id: 'town',
      query: '?scene=showcase&seed=7&x=44.5&z=64.5&zoom=84',
      async setup(ctx) { await ready(ctx); },
      async act(ctx) { await ctx.cut(); await ctx.hold(['KeyQ'], 120); await ctx.wait(4400); },
    },
    {
      id: 'winter',
      query: `?scene=showcase&seed=7&x=41&z=42.5&zoom=84&t=${SNOW}`,
      async setup(ctx) { await ready(ctx); },
      async act(ctx) { await ctx.cut(); await ctx.hold(['ArrowRight'], 400); await ctx.wait(4200); },
    },
    {
      id: 'animals',
      query: '?scene=showcase&seed=7&x=42.5&z=38&zoom=200',
      async setup(ctx) { await ready(ctx); },
      async act(ctx) { await ctx.cut(); await ctx.hold(['ArrowRight'], 300); await ctx.wait(4400); },
    },

    // --- the 60-second reel ---
    {
      // from the whole valley down onto the farm
      id: 'dive',
      query: '?scene=showcase&seed=7&x=43&z=46&zoom=32',
      async setup(ctx) { await ready(ctx); },
      async act(ctx) {
        const c = await tile(ctx, 41, 41);
        await ctx.cut();
        await pushIn(ctx, c.x, c.y, 10, 300, -60);
        await ctx.wait(2400);
      },
    },
    {
      // a time-lapse: the afternoon turns to dusk and night, windows and lanterns light up, helpers bustle
      id: 'timelapse',
      query: '?scene=showcase&seed=7&x=42&z=43&zoom=96&speed=90',
      async setup(ctx) { await ready(ctx); },
      async act(ctx) { await ctx.cut(); await ctx.wait(6000); },
    },
    {
      // turning round the farm, one step at a time
      id: 'orbit',
      query: '?scene=showcase&seed=7&x=42&z=42.5&zoom=120',
      async setup(ctx) { await ready(ctx); },
      async act(ctx) {
        await ctx.cut();
        for (let i = 0; i < 4; i++) { await ctx.hold(['KeyE'], 110); await ctx.wait(1250); }
        await ctx.wait(600);
      },
    },
    {
      // pick a row, plant strawberries along it, water them, watch them grow (fast time), pick again
      id: 'grow',
      query: '?scene=showcase&seed=7&x=40&z=49&zoom=150&speed=30&t=3322',
      audio: true,
      async setup(ctx) { await ready(ctx); },
      async act(ctx) {
        await ctx.cut();
        await pickRow(ctx, 47, 40, 44, 900);
        await ctx.wait(400);
        const first = await tile(ctx, 40, 47);
        await ctx.page.mouse.click(first.x, first.y);
        await ctx.page.getByRole('button', { name: /^Strawberry\./ }).click();
        await ctx.wait(250);
        await dragRow(ctx, 47, 41, 44, 800);
        await ctx.wait(300);
        await ctx.page.keyboard.press('Digit4');
        await ctx.wait(200);
        await dragRow(ctx, 47, 40, 44, 800);
        await ctx.page.keyboard.press('Digit1');
        await ctx.wait(4800);
        await pickRow(ctx, 47, 44, 40, 900);
        await ctx.wait(1400);
      },
    },
    {
      // the hens up close
      id: 'hens',
      query: '?scene=showcase&seed=7&x=44.6&z=37.9&zoom=240',
      async setup(ctx) { await ready(ctx); },
      async act(ctx) { await ctx.cut(); await ctx.hold(['ArrowRight'], 150); await ctx.wait(4400); },
    },
    {
      // Rufus, the farm dog, by his kennel
      id: 'dog',
      query: '?scene=showcase&seed=7&x=38.5&z=40.8&zoom=230',
      async setup(ctx) { await ready(ctx); },
      async act(ctx) { await ctx.cut(); await ctx.hold(['ArrowLeft'], 150); await ctx.wait(4400); },
    },
    {
      // the sheep shed and the beehives
      id: 'sheep',
      query: '?scene=showcase&seed=7&x=46&z=51.5&zoom=180',
      async setup(ctx) { await ready(ctx); },
      async act(ctx) { await ctx.cut(); await ctx.hold(['ArrowLeft'], 250); await ctx.wait(4400); },
    },
    {
      // helpers at work by the board and the dock (a little faster than life)
      id: 'helpers',
      query: '?scene=showcase&seed=7&x=45&z=42.5&zoom=170&speed=4',
      async setup(ctx) { await ready(ctx); },
      async act(ctx) { await ctx.cut(); await ctx.wait(4800); },
    },
    {
      // helpers looking after the cows and hens (a little faster than life)
      id: 'helpers2',
      query: '?scene=showcase&seed=7&x=42.5&z=39.5&zoom=200&speed=4',
      async setup(ctx) { await ready(ctx); },
      async act(ctx) { await ctx.cut(); await ctx.wait(4800); },
    },
    {
      // fireflies over the fields on a warm night
      id: 'fireflies',
      query: `?scene=showcase&seed=7&x=41&z=48&zoom=170&t=${NIGHT}`,
      async setup(ctx) { await ready(ctx); },
      async act(ctx) { await ctx.cut(); await ctx.hold(['ArrowRight'], 250); await ctx.wait(4500); },
    },
    {
      id: 'rain',
      query: `?scene=showcase&seed=7&x=41.5&z=44&zoom=110&t=${RAIN}`,
      async setup(ctx) { await ready(ctx); },
      async act(ctx) { await ctx.cut(); await ctx.hold(['ArrowLeft'], 300); await ctx.wait(4400); },
    },
    {
      id: 'autumn',
      query: `?scene=showcase&seed=7&x=44&z=43&zoom=80&t=${AUTUMN}`,
      async setup(ctx) { await ready(ctx); },
      async act(ctx) { await ctx.cut(); await ctx.hold(['ArrowRight'], 350); await ctx.wait(4400); },
    },
    {
      id: 'spring',
      query: `?scene=showcase&seed=7&x=44&z=43&zoom=80&t=${SPRING}`,
      async setup(ctx) { await ready(ctx); },
      async act(ctx) { await ctx.cut(); await ctx.hold(['ArrowRight'], 300); await ctx.wait(4400); },
    },
    {
      // the greenhouse up close, turning round it
      id: 'greenhouse',
      query: '?scene=showcase&seed=7&x=47.5&z=40.5&zoom=180',
      async setup(ctx) { await ready(ctx); },
      async act(ctx) { await ctx.cut(); await ctx.wait(1200); await ctx.hold(['KeyQ'], 110); await ctx.wait(3600); },
    },
    {
      // the Harvest Fair: one entry in each class, then the results and their ribbons (the panels are DOM)
      id: 'fair',
      query: `?scene=fair&seed=7&x=42&z=43&zoom=70&t=${FAIR}`,
      source: 'tab', device: { width: 960, height: 540, scale: 2 },
      async setup(ctx) {
        await ctx.page.locator('.fair .fair-option').first().waitFor({ timeout: 30000 });
        await ctx.wait(1200);
      },
      async act(ctx) {
        await ctx.cut();
        const cats = ctx.page.locator('.fair .fair-cat');
        for (let i = 0; i < await cats.count(); i++) {
          const option = cats.nth(i).locator('.fair-option').first();
          if (await option.count()) { await option.click(); await ctx.wait(550); }
        }
        await ctx.page.getByRole('button', { name: 'Enter the fair!' }).click();
        await ctx.wait(4600);
      },
    },
    {
      // a phone held sideways, played by touch: the tool rail, and a finger picks a row
      id: 'phone',
      query: '?scene=showcase&seed=7&x=41&z=48&zoom=120',
      source: 'tab', device: PHONE, audio: true,
      async setup(ctx) { await ready(ctx); },
      async act(ctx) {
        await ctx.cut();
        await ctx.wait(500);
        await dragRow(ctx, 47, 40, 44, 1100, true);
        await ctx.wait(500);
        await dragRow(ctx, 46, 44, 40, 1100, true);
        await ctx.wait(1600);
      },
    },
    {
      // a tablet in landscape, played by touch
      id: 'tablet',
      query: '?scene=showcase&seed=7&x=41.5&z=47.5&zoom=130',
      source: 'tab', device: TABLET,
      async setup(ctx) { await ready(ctx); },
      async act(ctx) {
        await ctx.cut();
        await ctx.wait(400);
        await dragRow(ctx, 48, 40, 44, 1200, true);
        await ctx.wait(500);
        await dragRow(ctx, 47, 44, 40, 1200, true);
        await ctx.wait(1600);
      },
    },
  ],
};
