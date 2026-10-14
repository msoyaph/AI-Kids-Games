// Breezeport trailer and reel takes: the game's own capture routes, as the site's previews use them
// (apps/site/scripts/capture/breezeport.ts), with longer takes so each can give two shots. Real play
// happens in them: a street drawn and homes zoned in a new town (fast time, so the first family
// moves in on camera), the maps switched on, and a phone and a tablet played by touch. The showcase
// (`?scene=showcase`, a grown town that never saves) gives the rest: `&t=` the season and hour,
// `&speed=` a time-lapse, `&festival=1` the Bay Festival's night, `&map=` a map, `&hud=0` no HUD.
// Most takes record the canvas, so the HUD is left out; the maps, phone and tablet record the tab.
// The capture route keeps the game's music off; takes with `audio` keep its own sounds.
import { scenario as site } from '../../../../apps/site/scripts/capture/breezeport';
import type { Device, Scenario, TakeContext } from '../../../../apps/site/scripts/capture/types';

type Hook = { snapshot(): { screen: string }; tileOnScreen(x: number, z: number): { x: number; y: number } };

async function ready(ctx: TakeContext) {
  await ctx.page.waitForFunction(() => (window as unknown as { __breezeport?: Hook }).__breezeport?.snapshot().screen === 'city', null, { timeout: 30000 });
  await ctx.wait(1500);
}

const tile = (ctx: TakeContext, x: number, z: number) => ctx.run(([tx, tz]) => (window as unknown as { __breezeport: Hook }).__breezeport.tileOnScreen(tx, tz), [x, z] as [number, number]);

/** Drag from one tile to another with the current tool, by mouse or by a finger (CDP touches). */
async function drag(ctx: TakeContext, from: [number, number], to: [number, number], ms: number, touch = false) {
  const a = await tile(ctx, ...from), b = await tile(ctx, ...to);
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

/** A slow push-in: the mouse wheel zooms towards the point under the pointer. */
async function pushIn(ctx: TakeContext, x: number, y: number, ticks: number, every: number, delta = -100) {
  await ctx.page.mouse.move(x, y);
  for (let i = 0; i < ticks; i++) { await ctx.page.mouse.wheel(0, delta); await ctx.wait(every); }
}

// Town times (a day is 480 s, a season 5 days, spring first): summer midday, a summer evening just
// before dusk (for the time-lapse), a summer night, a winter afternoon, an autumn day, spring.
const SUMMER = 6 * 480 + 200, DUSK = 6 * 480 + 290, NIGHT = 6 * 480 + 458, WINTER = 16 * 480 + 260, AUTUMN = 11 * 480 + 220, SPRING = 2 * 480 + 200;
const show = (q: string) => `?scene=showcase&seed=7&hud=0&${q}`;

const PHONE: Device = { width: 844, height: 390, scale: 2, touch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' };
const TABLET: Device = { width: 1180, height: 820, scale: 1, touch: true, userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' };

export const scenario: Scenario = {
  ...site,
  takes: [
    // --- the 15-second trailer ---
    {
      id: 'town',
      query: show(`x=46&z=17&zoom=58&t=${SUMMER}`),
      async setup(ctx) { await ready(ctx); },
      async act(ctx) { await ctx.cut(); await ctx.hold(['ArrowRight'], 450); await ctx.wait(4200); },
    },
    {
      // a brand-new town: a street drawn, homes zoned, and the first family moves in (fast time)
      id: 'build',
      query: '?scene=town&seed=7&x=39&z=18&zoom=110&speed=40',
      source: 'tab',
      audio: true,
      async setup(ctx) {
        await ready(ctx);
        await ctx.page.getByRole('button', { name: /^Roads \(\d\)$/ }).click();
        await ctx.wait(400);
      },
      async act(ctx) {
        await ctx.cut();
        await drag(ctx, [40, 17], [40, 22], 900);
        await ctx.wait(400);
        await ctx.page.getByRole('button', { name: /^Zones \(\d\)$/ }).click();
        await ctx.page.getByRole('button', { name: 'Homes' }).click();
        await ctx.wait(250);
        await drag(ctx, [38, 17], [39, 22], 900);
        await ctx.wait(400);
        await ctx.page.getByRole('button', { name: 'Shops' }).click();
        await drag(ctx, [41, 17], [42, 20], 700);
        await ctx.wait(5200);
      },
    },
    {
      id: 'street',
      query: show(`x=40.5&z=27&zoom=118&yaw=1&t=${SUMMER}`),
      async setup(ctx) { await ready(ctx); },
      async act(ctx) { await ctx.cut(); await ctx.hold(['ArrowUp'], 400); await ctx.wait(4400); },
    },
    {
      id: 'night',
      query: show(`x=38&z=12&zoom=64&t=${NIGHT}`),
      async setup(ctx) { await ready(ctx); },
      async act(ctx) { await ctx.cut(); await ctx.hold(['ArrowLeft'], 400); await ctx.wait(4400); },
    },
    {
      id: 'festival',
      query: show('festival=1&x=57&z=12&zoom=46'),
      async setup(ctx) { await ready(ctx); await ctx.wait(2500); },
      async act(ctx) { await ctx.cut(); await ctx.wait(5600); },
    },
    {
      id: 'winter',
      query: show(`x=30&z=22&zoom=70&yaw=7&t=${WINTER}`),
      async setup(ctx) { await ready(ctx); },
      async act(ctx) { await ctx.cut(); await ctx.hold(['ArrowRight'], 400); await ctx.wait(4400); },
    },

    // --- the 60-second reel ---
    {
      // from high over the bay down onto Main Street
      id: 'dive',
      query: show(`x=40&z=18&zoom=32&t=${SUMMER}`),
      async setup(ctx) { await ready(ctx); },
      async act(ctx) {
        const c = await tile(ctx, 41, 14);
        await ctx.cut();
        await pushIn(ctx, c.x, c.y, 16, 170);
        await ctx.wait(2200);
      },
    },
    {
      // a time-lapse: the afternoon turns to dusk and night, windows and lamps light up, the lighthouse sweeps the bay
      id: 'timelapse',
      query: show(`x=40&z=12&zoom=70&t=${DUSK}&speed=20`),
      async setup(ctx) { await ready(ctx); },
      async act(ctx) { await ctx.cut(); await ctx.wait(6500); },
    },
    {
      // turning round downtown, one step at a time
      id: 'orbit',
      query: show(`x=42&z=12&zoom=100&t=${SUMMER}`),
      async setup(ctx) { await ready(ctx); },
      async act(ctx) {
        await ctx.cut();
        for (let i = 0; i < 4; i++) { await ctx.hold(['KeyE'], 110); await ctx.wait(1250); }
        await ctx.wait(600);
      },
    },
    {
      // the tram climbing Main Street, buses and bikes (a little faster than life)
      id: 'tram',
      query: show(`x=40.5&z=33&zoom=140&yaw=7&t=${SUMMER}`),
      async setup(ctx) { await ready(ctx); },
      async act(ctx) { await ctx.cut(); await ctx.hold(['ArrowUp'], 300); await ctx.wait(4600); },
    },
    {
      // the happiness map comes on over the town (the panel and the map are DOM and canvas: record the tab)
      id: 'maps',
      query: '?scene=showcase&seed=7&x=36&z=26&zoom=46',
      source: 'tab',
      async setup(ctx) { await ready(ctx); },
      async act(ctx) {
        await ctx.cut();
        await ctx.wait(500);
        await ctx.page.getByRole('button', { name: /^Maps \(\d\)$/ }).click();
        await ctx.wait(400);
        await ctx.page.getByRole('button', { name: 'Happiness', exact: true }).click();
        await ctx.wait(2200);
        await ctx.page.getByRole('button', { name: 'Greenery', exact: true }).click();
        await ctx.wait(2200);
      },
    },
    {
      // the aquarium, the Ferris wheel and the stage by the boardwalk
      id: 'boardwalk',
      query: show(`x=64&z=10&zoom=96&yaw=1&t=${SUMMER}`),
      async setup(ctx) { await ready(ctx); },
      async act(ctx) { await ctx.cut(); await ctx.hold(['ArrowRight'], 400); await ctx.wait(4400); },
    },
    {
      // the glasshouse and the Greenway's parks
      id: 'greenway',
      query: show(`x=37&z=37&zoom=96&t=${SPRING}`),
      async setup(ctx) { await ready(ctx); },
      async act(ctx) { await ctx.cut(); await ctx.hold(['KeyQ'], 110); await ctx.wait(4600); },
    },
    {
      // the observatory up the hill, and the tram's last stop
      id: 'hilltop',
      query: show(`x=70&z=68&zoom=100&yaw=6&t=${AUTUMN}`),
      async setup(ctx) { await ready(ctx); },
      async act(ctx) { await ctx.cut(); await ctx.hold(['ArrowLeft'], 400); await ctx.wait(4400); },
    },
    {
      // the ferry leaving the mended pier, the lighthouse beyond
      id: 'ferry',
      query: show(`x=48&z=3&zoom=80&yaw=0&t=${SUMMER}`),
      async setup(ctx) { await ready(ctx); },
      async act(ctx) { await ctx.cut(); await ctx.wait(5000); },
    },
    {
      // a phone held sideways, played by touch: a street drawn with a finger
      id: 'phone',
      query: '?scene=town&seed=7&x=39&z=18&zoom=110&speed=40',
      source: 'tab', device: PHONE, audio: true,
      async setup(ctx) { await ready(ctx); await ctx.page.getByRole('button', { name: /^Roads \(\d\)$/ }).click(); await ctx.wait(400); },
      async act(ctx) {
        await ctx.cut();
        await ctx.wait(400);
        await drag(ctx, [40, 17], [40, 21], 1100, true);
        await ctx.wait(2600);
      },
    },
    {
      // a tablet in landscape, played by touch: homes zoned beside a street
      id: 'tablet',
      query: '?scene=town&seed=7&x=39&z=16&zoom=110&speed=40',
      source: 'tab', device: TABLET,
      async setup(ctx) {
        await ready(ctx);
        await ctx.page.getByRole('button', { name: /^Zones \(\d\)$/ }).click();
        await ctx.page.getByRole('button', { name: 'Homes' }).click();
        await ctx.wait(400);
      },
      async act(ctx) {
        await ctx.cut();
        await ctx.wait(300);
        await drag(ctx, [36, 13], [39, 14], 1200, true);
        await ctx.wait(3600);
      },
    },
  ],
};
