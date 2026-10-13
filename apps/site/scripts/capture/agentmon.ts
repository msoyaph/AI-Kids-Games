// Agentmon capture route. The game's own capture routes (?scene=…, games/agentmon/src/game/capture.ts)
// set up each moment with a made-up adventure that never saves; `&play=1` plays it out (a few spar
// turns, the Spark Ring for real, a Trial room solved by the game's solver). The read-only hook
// window.__agentmon says when a moment is on screen (`ready`). Battle cards and text, the Mood Match
// panel and the Field Guide are DOM, so those takes record the tab; the town and the Trial record the
// canvas (no touch controls on a computer, so nothing needs hiding).
import type { Scenario, TakeContext } from './types';

/** Waits until the capture moment is on screen (the overworld has no `ready` flag: it is ready at once). */
async function ready(ctx: TakeContext) {
  await ctx.page.waitForFunction(() => {
    const s = (window as any).__agentmon?.snapshot();
    return !!s && (s.frames ?? 0) > 5 && s.ready !== false;
  }, null, { timeout: 30000 });
}

export const scenario: Scenario = {
  slug: 'agentmon',
  canvas: 'canvas',
  clipSeconds: 2.35,
  loopOrder: ['battle', 'spark-ring', 'town', 'trial'],
  takes: [
    {
      id: 'battle',
      source: 'tab',
      query: '?scene=battle&seed=3&play=1',
      async setup(ctx) { await ready(ctx); },
      async act(ctx) {
        await ctx.wait(700); await ctx.cut(-0.4);
        await ctx.wait(900); await ctx.still('A friendly spar: a Volt move is super strong against a Tide Agentmon');
        await ctx.wait(2400);
      }
    },
    {
      id: 'spark-ring',
      source: 'tab',
      query: '?scene=befriend&seed=3&play=1',
      async setup(ctx) { await ready(ctx); },
      async act(ctx) {
        await ctx.wait(600); await ctx.cut(-0.3);
        await ctx.wait(1400); await ctx.still('Befriending with the Spark Ring: tap when the spark is in the glow');
        await ctx.wait(2000);
      }
    },
    {
      id: 'town',
      query: '?scene=town&seed=3&map=saltwhistle,14,13',
      async setup(ctx) { await ready(ctx); await ctx.wait(600); },
      async act(ctx) {
        await ctx.cut();
        await ctx.hold(['ArrowRight'], 900);
        await ctx.still('Saltwhistle, a seaside town with a Rest Stop, a shop and the Lighthouse');
        await ctx.hold(['ArrowDown'], 600);
        await ctx.hold(['ArrowRight'], 700);
      }
    },
    {
      id: 'trial',
      // the room sits in the middle of the frame: zoom in on it
      crop: [448, 288, 1040, 585],
      query: '?scene=dungeon&seed=3&trial=canyon&room=2&play=1',
      async setup(ctx) { await ready(ctx); },
      async act(ctx) {
        await ctx.wait(500); await ctx.cut(-0.3);
        await ctx.wait(1500); await ctx.still('A Trial puzzle: turn the mirrors to bring the light beam to the crystal');
        await ctx.wait(2200);
      }
    },
    {
      id: 'mood-match',
      loop: false,
      source: 'tab',
      query: '?scene=befriend&seed=3&mode=mood',
      async setup(ctx) { await ready(ctx); },
      async act(ctx) { await ctx.wait(800); await ctx.still('Mood Match, the befriend game with no timing: pick what fits the mood'); }
    },
    {
      id: 'field-guide',
      loop: false,
      source: 'tab',
      query: '?scene=guide&seed=3&page=guide',
      async setup(ctx) { await ready(ctx); },
      async act(ctx) { await ctx.wait(900); await ctx.still('The Field Guide, with a real nature fact for every Agentmon'); }
    }
  ]
};
