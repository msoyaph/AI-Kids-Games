// Fieldlark capture route. The game's own capture route (?scene=showcase, games/fieldlark/src/main.ts)
// shows a staged late-game farm in memory and never saves: fields at every stage, animals, workshops,
// a greenhouse, water channels, helpers at work and the farm stand in Larkford's square. `&t=` picks
// the farm time (so the season, the hour and the weather), and `&x=&z=&zoom=&yaw=` the view. The
// takes record the 3D canvas (the HUD is DOM, so it is left out) and move the camera with the game's
// own keys (arrows pan, Q and E turn).
import type { Scenario, TakeContext } from './types';

/** Waits until the farm is on screen and has drawn a few frames. */
async function ready(ctx: TakeContext) {
  await ctx.page.waitForFunction(() => (window as any).__fieldlark?.snapshot().screen === 'farm', null, { timeout: 30000 });
  await ctx.wait(1500);
}

// Times of farm day for seed 7 (games/fieldlark/src/sim/forecast.ts): a warm summer night with
// fireflies, and a snowy winter afternoon.
const NIGHT = 5256, SNOW = 9897.6;

export const scenario: Scenario = {
  slug: 'fieldlark',
  canvas: '#farm',
  clipSeconds: 2.4,
  loopOrder: ['farm', 'night', 'winter', 'town'],
  takes: [
    {
      id: 'farm',
      query: '?scene=showcase&seed=7&x=42&z=43&zoom=74',
      async setup(ctx) { await ready(ctx); },
      async act(ctx) {
        await ctx.cut();
        await ctx.hold(['ArrowRight'], 900);
        await ctx.still('A busy summer farm: fields at every stage, animals, a greenhouse and helpers at work');
        await ctx.hold(['KeyE'], 120);
        await ctx.wait(1600);
      },
    },
    {
      id: 'night',
      query: `?scene=showcase&seed=7&x=41&z=41.5&zoom=92&t=${NIGHT}`,
      async setup(ctx) { await ready(ctx); },
      async act(ctx) {
        await ctx.cut();
        await ctx.hold(['ArrowRight'], 400);
        await ctx.still('A warm summer night: lit windows, lanterns and fireflies over the fields');
        await ctx.wait(1700);
      },
    },
    {
      id: 'winter',
      query: `?scene=showcase&seed=7&x=42&z=42&zoom=70&t=${SNOW}`,
      async setup(ctx) { await ready(ctx); },
      async act(ctx) {
        await ctx.cut();
        await ctx.hold(['KeyQ'], 120);
        await ctx.wait(900);
        await ctx.still('Snow on the roofs in winter, with crops still growing in the greenhouse');
        await ctx.wait(1400);
      },
    },
    {
      id: 'town',
      query: '?scene=showcase&seed=7&x=44.5&z=64.5&zoom=84',
      async setup(ctx) { await ready(ctx); },
      async act(ctx) {
        await ctx.cut();
        await ctx.hold(['KeyQ'], 120);
        await ctx.wait(700);
        await ctx.still('Larkford square: the bakery, the school, the café and your own farm stand');
        await ctx.wait(1800);
      },
    },
    {
      id: 'greenhouse',
      loop: false,
      query: '?scene=showcase&seed=7&x=47.5&z=40.8&zoom=130',
      async setup(ctx) { await ready(ctx); },
      async act(ctx) { await ctx.wait(500); await ctx.still('A greenhouse grows any crop in any season, with a water channel and a sprinkler beside it'); },
    },
  ],
};
