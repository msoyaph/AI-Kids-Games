// Shooberry capture route. The game's own capture routes (?scene=…, games/shooberry/src/main.ts)
// start a demo garden at a set moment, played by the game's own bot and never saved: a busy wave in
// the Meadow Picnic, the Grand Snail boss, and a garden in each later world. The HUD is DOM and
// hidden in these scenes, so every take records the canvas. The read-only hook window.__shooberry
// says when the garden has been drawn.
import type { Scenario, TakeContext } from './types';

/** Waits until the garden has been drawn for a moment (the boot screen is gone, the bot is playing). */
async function ready(ctx: TakeContext) {
  await ctx.page.waitForFunction(() => {
    const s = (window as any).__shooberry?.snapshot();
    return !!s && s.drawCalls > 0 && document.getElementById('boot')?.hidden === true;
  }, null, { timeout: 30000 });
  await ctx.wait(800);
}

const garden = (id: string, query: string, alt: string, loop = true) => ({
  id,
  loop,
  query: `${query}&quality=high`,
  async setup(ctx: TakeContext) { await ready(ctx); },
  async act(ctx: TakeContext) {
    await ctx.cut();
    await ctx.wait(1300); await ctx.still(alt);
    await ctx.wait(2200);
  }
});

export const scenario: Scenario = {
  slug: 'shooberry',
  canvas: '#game',
  clipSeconds: 2.35,
  loopOrder: ['wave', 'boss', 'dusk', 'cloud'],
  takes: [
    garden('wave', '?scene=wave', 'The Meadow Picnic: Rowan Flickers and Maple Twirlers shoo an Ant Column and a Roly-poly while Comfrey makes compost'),
    garden('boss', '?scene=boss', 'The Grand Snail, the Meadow Picnic\'s boss, slides in while a magpie flies over'),
    garden('greenhouse', '?scene=world&w=greenhouse', 'The Glass Greenhouse, with water channels where water plants grow', false),
    garden('dusk', '?scene=world&w=dusk', 'The Pumpkin Patch at dusk, where evening flowers wake up'),
    garden('desert', '?scene=world&w=desert', 'The Cactus Garden, where hot tiles dry plants out unless they sit beside a channel', false),
    garden('cloud', '?scene=world&w=cloud', 'The Cloud Garden, high in the sky, with gaps between the beds')
  ]
};
