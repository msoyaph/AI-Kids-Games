// Tuck Pop capture route. The game's own capture route (?scene=…, games/tuck-pop/src/capture.ts)
// sets up each moment and plays it with its bot, never saving; the read-only hook
// window.__tuckpop tells us when moves happen. The canvas has no HUD, so recordings are clean.
import type { Scenario, TakeContext } from './types';

/** Waits until the game has made `n` moves. */
async function moves(ctx: TakeContext, n: number) {
  await ctx.page.waitForFunction(k => ((window as any).__tuckpop?.snapshot().moves ?? 0) >= k, n, { timeout: 30000 });
}
const ready = (ctx: TakeContext) => ctx.page.waitForFunction(() => !!(window as any).__tuckpop);
/** The board and tray fill a 1280×720 middle of the 1920×1080 frame (the game caps its board at 640 px). */
const crop: [number, number, number, number] = [320, 180, 1280, 720];

export const scenario: Scenario = {
  slug: 'tuck-pop',
  canvas: '#stage',
  clipSeconds: 2.4,
  loopOrder: ['combo', 'board-clear', 'adventure', 'themes'],
  takes: [
    {
      id: 'combo',
      crop,
      query: '?scene=combo&seed=7',
      async setup(ctx) { await ready(ctx); },
      async act(ctx) {
        await moves(ctx, 1); await ctx.cut(-0.6);
        await ctx.wait(450); await ctx.still('Two lines pop with sparkles, and the word shows the exact points');
        await moves(ctx, 3); await ctx.wait(500);
        await ctx.still('A fresh set of pieces to fit on the board, with room to set up the next clear');
        await ctx.wait(800);
      }
    },
    {
      id: 'board-clear',
      crop,
      query: '?scene=clear&seed=7',
      async setup(ctx) { await ready(ctx); },
      async act(ctx) {
        await moves(ctx, 1); await ctx.cut(-0.7);
        await ctx.wait(420); await ctx.still('The last piece clears the whole board: confetti, rings and "Board clear!"');
        await ctx.wait(1800);
      }
    },
    {
      id: 'adventure',
      crop,
      query: '?scene=adventure&level=32',
      async setup(ctx) { await ready(ctx); },
      async act(ctx) {
        await ctx.wait(1200); await ctx.cut(-0.4);
        await moves(ctx, 2); await ctx.wait(300);
        await ctx.still('An Adventure level in the Candy world: collect the gems and get past the stones');
        await ctx.wait(1500);
      }
    },
    {
      id: 'themes',
      crop,
      query: '?scene=themes&theme=space',
      async setup(ctx) { await ready(ctx); },
      async act(ctx) {
        await moves(ctx, 1); await ctx.cut(-0.6);
        await ctx.wait(500); await ctx.still('The Star Trip theme, one of six themes earned by playing');
        await ctx.wait(1600);
      }
    }
  ]
};
