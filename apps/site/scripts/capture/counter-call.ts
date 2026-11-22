// Counter Call capture route. The game's own capture routes (?scene=…, games/counter-call/src/main.ts)
// show a set moment, played by the game's own helper and never saved: ?scene=play&day=N&seed=N&host=<id>
// is a day in full swing (&endless=1 for Endless Rush), ?scene=cast is all six hosts waving in a row,
// and ?scene=title&host=<id>&clean=1 is one host waving with the menu card hidden. The HUD, the order
// bubbles and the station buttons are DOM, so every take records the canvas. The read-only hook
// window.__countercall says which screen is up.
import type { Scenario, TakeContext } from './types';

/** Waits until the diner has been drawn for a moment on the screen this take wants. */
async function ready(ctx: TakeContext, screen: string) {
  await ctx.page.waitForFunction(want => (window as any).__countercall?.snapshot().screen === want, screen, { timeout: 30000 });
  await ctx.wait(900);
}

const moment = (id: string, query: string, alt: string, loop = true) => ({
  id,
  loop,
  query,
  async setup(ctx: TakeContext) { await ready(ctx, query.includes('scene=play') ? 'play' : 'title'); },
  async act(ctx: TakeContext) {
    await ctx.cut();
    await ctx.wait(1300); await ctx.still(alt);
    await ctx.wait(2200);
  }
});

export const scenario: Scenario = {
  slug: 'counter-call',
  canvas: '#game',
  clipSeconds: 2.35,
  loopOrder: ['counter', 'cast', 'feast', 'rush'],
  takes: [
    moment('counter', '?scene=play&day=6&seed=7&host=minty', 'Minty hurries between the cooking stations while friends wait at the counter of her diner'),
    moment('feast', '?scene=play&day=8&seed=3&host=cookie', 'Cookie Cream serves The Big Feast with all five stations open: ice cream, burgers, juice, fries and pizza'),
    moment('rush', '?scene=play&day=5&seed=5&host=single&endless=1', 'Single Scoop keeps up with Endless Rush as more friends walk in from the door'),
    moment('cast', '?scene=cast', 'The six hosts wave hello: Single Scoop, Vanilla, Minty, Cookie Cream, Raspberry and Double Scoop'),
    moment('bake', '?scene=play&day=4&seed=4&host=vanilla', 'Vanilla, the quick cook, runs the counter on Busy Lunch with four stations open', false),
    moment('berry', '?scene=play&day=7&seed=6&host=raspberry', 'Raspberry, with her big red bow, runs the counter on Festival Eve', false)
  ]
};
