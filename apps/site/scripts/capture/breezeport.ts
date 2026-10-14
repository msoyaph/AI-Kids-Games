// Breezeport capture route. The game's own capture route (?scene=showcase, games/breezeport/src/game/
// showcase.ts) builds a grown seaside town near the end of the story in memory and never saves:
// downtown round City Hall, family streets, the Greenway's parks and glasshouse, the boardwalk's
// aquarium and Ferris wheel, buses, bike lanes and the tram. `&t=` picks the town time (the season
// and the hour), `&festival=1` the Bay Festival's night, `&map=` one of the town's maps, and
// `&x=&z=&zoom=&yaw=` the view. The takes record the 3D canvas (the HUD is DOM, so it is left out)
// and move the camera with the game's own keys (arrows pan, Q and E turn).
import type { Scenario, TakeContext } from './types';

/** Waits until the town is on screen and has drawn a few frames. */
async function ready(ctx: TakeContext) {
  await ctx.page.waitForFunction(() => (window as any).__breezeport?.snapshot().screen === 'city', null, { timeout: 30000 });
  await ctx.wait(1500);
}

// Town times (a day is 480 s, a season 5 days, spring first): a summer midday, a summer night and a
// winter afternoon.
const SUMMER = 6 * 480 + 200, NIGHT = 6 * 480 + 458, WINTER = 16 * 480 + 260;

export const scenario: Scenario = {
  slug: 'breezeport',
  canvas: '#town',
  clipSeconds: 2.4,
  loopOrder: ['town', 'street', 'night', 'festival'],
  takes: [
    {
      id: 'town',
      query: `?scene=showcase&seed=7&hud=0&x=46&z=17&zoom=58&t=${SUMMER}`,
      async setup(ctx) { await ready(ctx); },
      async act(ctx) {
        await ctx.cut();
        await ctx.hold(['ArrowRight'], 900);
        await ctx.still('A busy seaside town: homes, shops, offices and parks by the bay');
        await ctx.hold(['KeyE'], 120);
        await ctx.wait(1600);
      },
    },
    {
      id: 'street',
      query: `?scene=showcase&seed=7&hud=0&x=40.5&z=27&zoom=118&yaw=1&t=${SUMMER}`,
      async setup(ctx) { await ready(ctx); },
      async act(ctx) {
        await ctx.cut();
        await ctx.hold(['ArrowUp'], 500);
        await ctx.still('Main Street: the tram, buses, bikes and people on their way');
        await ctx.wait(1700);
      },
    },
    {
      id: 'night',
      query: `?scene=showcase&seed=7&hud=0&x=38&z=12&zoom=64&t=${NIGHT}`,
      async setup(ctx) { await ready(ctx); },
      async act(ctx) {
        await ctx.cut();
        await ctx.hold(['ArrowLeft'], 500);
        await ctx.still('Lit windows, street lamps and the lighthouse sweeping the bay at night');
        await ctx.wait(1700);
      },
    },
    {
      id: 'festival',
      query: '?scene=showcase&seed=7&hud=0&festival=1&x=57&z=12&zoom=46',
      async setup(ctx) { await ready(ctx); },
      async act(ctx) {
        await ctx.cut();
        await ctx.wait(800);
        await ctx.still('The Bay Festival: lanterns, kites and fireworks over the bay');
        await ctx.wait(1600);
      },
    },
    {
      id: 'winter',
      loop: false,
      query: `?scene=showcase&seed=7&hud=0&x=30&z=22&zoom=70&yaw=7&t=${WINTER}`,
      async setup(ctx) { await ready(ctx); },
      async act(ctx) { await ctx.wait(500); await ctx.still('Snowy roofs and bare trees in winter'); },
    },
    {
      id: 'map',
      loop: false,
      query: `?scene=showcase&seed=7&hud=0&map=happy&x=36&z=30&zoom=40&t=${SUMMER}`,
      async setup(ctx) { await ready(ctx); },
      async act(ctx) { await ctx.wait(500); await ctx.still('The happiness map shows where people love living, and where they need a park or a clinic'); },
    },
  ],
};
