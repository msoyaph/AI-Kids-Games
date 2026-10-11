// Calex Cart capture route. Uses the production hook window.__calex.app: it sets up a solo
// versus race, lets the game's own AI drive Calex's kart (as the game's perf script does), and
// cuts on the kart's real drift, item-hit and glider states. Builds are unchanged.
import type { Scenario, TakeContext } from './types';

async function race(ctx: TakeContext,track: RegExp,rivals = 7) {
  await ctx.page.waitForFunction(() => !!(window as any).__calex?.app,null,{ timeout: 60000 });
  const ok = await ctx.run(async ([source,aiCount]) => {
    const sleep = (ms: number) => new Promise(done => setTimeout(done,ms));
    const a = (window as any).__calex.app, pattern = new RegExp(source);
    if (!a.saves.data) a.saves.create(1,'Calex');
    a.saves.settings.quality = 'high'; a.applySettings();
    a.flow.mode = 'versus'; a.flow.players = 1; a.flow.racers = ['calex','pip']; a.flow.vs.aiCount = aiCount; a.flow.vs.items = true;
    a.screens.trackSelect(); await sleep(300);
    const find = () => [...document.querySelectorAll('.screen [data-nav]')].find(button => pattern.test(button.textContent || '')) as HTMLElement | undefined;
    let button = find();
    for (const tab of [...document.querySelectorAll('.screen .tabs [data-nav]')] as HTMLElement[]) { if (button) break; tab.click(); await sleep(150); button = find(); }
    if (!button) return false;
    button.click(); await sleep(600);
    const s = a.session, k = s.world.karts[0];
    k.player = -1; s.ai.takeOver(k); k.player = 0;
    s.world.skipIntro();
    return true;
  },[track.source,rivals] as const);
  if (!ok) throw new Error(`Track ${track} not found`);
  await ctx.page.waitForFunction(() => (window as any).__calex.app.session?.world.phase === 'race',null,{ timeout: 20000 });
}
/** Poll the player's kart until a condition holds; returns false on timeout. */
async function until(ctx: TakeContext,test: string,timeoutMs: number) {
  return ctx.page.waitForFunction(source => { const w = (window as any).__calex.app.session.world, k = w.karts[0]; return new Function('k','w',`return (${source});`)(k,w); },test,{ timeout: timeoutMs,polling: 50 }).then(() => true,() => false);
}

export const scenario: Scenario = {
  slug: 'calex-cart',
  canvas: '#gl',
  // Canyon Run reliably gives a glider leap (~14 s) and then a spark drift (~21 s).
  takes: [
    {
      id: 'glider',
      async setup(ctx) { await race(ctx,/Canyon Run/,3); await ctx.wait(3000); },
      async act(ctx) {
        if (await until(ctx,'k.gliding',60000)) await ctx.cut(-0.8);
        await ctx.wait(1200); await ctx.still('Calex glides across the forest gorge on Canyon Run');
        await ctx.wait(1800); await ctx.still('Landing back on the track in the canyon');
      }
    },
    {
      id: 'drift',
      continues: true,
      async setup() {},
      async act(ctx) {
        // Sparks appear as the drift charges through its tiers (0.85 s, 1.75 s, 2.9 s of charge).
        if (await until(ctx,'k.driftTier >= 1',90000)) await ctx.cut(-0.6);
        await ctx.wait(700); await ctx.still('Calex drifts around a canyon bend with sparks flying');
        await ctx.wait(1600);
      }
    },
    {
      id: 'item-hit',
      async setup(ctx) {
        await race(ctx,/Seashell Boardwalk/); await ctx.wait(3000);
        // Keep Calex stocked with Bumper Balls so the AI throws them at the karts ahead.
        await ctx.run(() => { const w = (window as any).__calex.app.session.world; (window as any).__capItems = setInterval(() => { const k = w.karts[0]; if (!k.item && !k.rouletteTime) k.item = 'bumperBall'; },400); });
      },
      async act(ctx) {
        const hit = 'w.karts.some((o, i) => i > 0 && (o.spinTime > 0 || o.tumbleTime > 0) && Math.hypot(o.x - k.x, o.z - k.z) < 28)';
        if (await until(ctx,hit,45000)) await ctx.cut(-1.2);
        await ctx.wait(500); await ctx.still('A Bumper Ball sends a rival kart spinning on the beach');
        await ctx.wait(1800);
      }
    }
  ]
};
