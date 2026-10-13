// Tuck Pop trailer takes: the site's own capture route (apps/site/scripts/capture/tuck-pop.ts),
// recorded as the game's ?scene= routes play them, plus a Classic game and the Adventure map. The
// capture route always keeps the game's own sound off, so the trailer carries the soundtrack only.
// The full 1920×1080 frame is kept (the trailer zooms in on the board).
import { scenario as site } from '../../../../apps/site/scripts/capture/tuck-pop';
import type { Scenario, TakeContext } from '../../../../apps/site/scripts/capture/types';

const ready = (ctx: TakeContext) => ctx.page.waitForFunction(() => !!(window as any).__tuckpop);
const moves = (ctx: TakeContext, n: number) => ctx.page.waitForFunction(k => ((window as any).__tuckpop?.snapshot().moves ?? 0) >= k, n, { timeout: 30000 });

export const scenario: Scenario = {
  ...site,
  takes: [
    ...site.takes.map(({ crop: _crop, ...take }) => take),
    {
      id: 'play',
      query: '?scene=play&seed=3',
      async setup(ctx) { await ready(ctx); },
      async act(ctx) { await moves(ctx, 2); await ctx.cut(-0.3); await ctx.wait(3600); await ctx.still('A Classic game: pieces drop into place and lines pop'); await ctx.wait(400); }
    },
    {
      id: 'map',
      query: '?scene=map',
      // The map is part of the page, not the game's canvas: record the whole tab.
      source: 'tab',
      async setup(ctx) { await ready(ctx); await ctx.wait(800); },
      async act(ctx) { await ctx.cut(); await ctx.wait(3800); await ctx.still('The Adventure map: 60 levels across colorful worlds'); await ctx.wait(400); }
    }
  ]
};
