// Light Crossing capture route. Uses the production hook window.__lc (the App, src/main.ts in
// the game project). The DOM HUD is not part of the canvas recording. Builds stay unchanged.
import type { Scenario, TakeContext } from './types';

const look = { skin: 1,hair: 0,hairColor: 2,eyes: 0,mouth: 0,blush: true,outfit: 3 };

async function newGame(ctx: TakeContext,minute: number,zoom = 0.62,tilt = 30) {
  await ctx.page.waitForFunction(() => !!(window as any).__lc);
  await ctx.run(l => (window as any).__lc.startNewGame(0,'Mika',l,2024),look);
  await ctx.page.waitForFunction(() => (window as any).__lc.game?.mode);
  await ctx.wait(900);
  // Clear the opening narration with its own Enter prompt.
  for (let i = 0; i < 14; i++) { await ctx.page.keyboard.press('Enter'); await ctx.wait(110); }
  await ctx.run(([m,z,t]) => {
    const app = (window as any).__lc, g = app.game;
    g.state.clock.minute = m; app.settings.tips = false; app.ui.closeAll();
    app.view.rig.settings.zoom = z; app.view.rig.settings.tilt = t;
  },[minute,zoom,tilt]);
}

export const scenario: Scenario = {
  slug: 'light-crossing',
  canvas: '#game',
  clipSeconds: 2.4,
  takes: [
    {
      id: 'festival',
      async setup(ctx) {
        await newGame(ctx,20.5*60);
        await ctx.run(() => { const app = (window as any).__lc, g = app.game; g.state.flags.lighthouseLit = 1; g.mode = 'cutscene'; app.view.rebuildPlayer?.(); app.view.startFestival(); });
      },
      async act(ctx) {
        await ctx.wait(5500); await ctx.cut();
        await ctx.wait(1200); await ctx.still('Lanterns rise from the plaza at the Lantern Crossing festival');
        await ctx.wait(1800);
      }
    },
    {
      id: 'sunset-walk',
      async setup(ctx) { await newGame(ctx,18.3*60,0.55,28); await ctx.hold(['w'],900); },
      async act(ctx) {
        await ctx.hold(['w','a'],700); await ctx.cut();
        await ctx.page.keyboard.down('Shift'); await ctx.hold(['a'],1300); await ctx.still('Running along the beach at sunset');
        await ctx.hold(['a','s'],1200); await ctx.page.keyboard.up('Shift');
      }
    },
    {
      id: 'fishing',
      async setup(ctx) {
        await newGame(ctx,16.8*60,0.5,32);
        await ctx.run(() => { const p = (window as any).__lc.game.state.player; p.inv[0] = { id: 'rod_flimsy',qty: 1,dur: 12 }; p.equipped = 0; p.facing = 0; p.z += 0.6; });
        await ctx.wait(700);
      },
      async act(ctx) {
        await ctx.run(() => (window as any).__lc.game.act());
        // Lead a fish shadow to the bobber so a bite comes quickly.
        for (let i = 0; i < 90; i++) {
          const phase = await ctx.run(() => {
            const rt = (window as any).__lc.game.runtime.fishing, c = rt?.cast;
            if (c?.phase === 'floating' && c.target < 0 && rt.shadows.length) { const s = rt.shadows[0]; s.x = c.x + 1.2; s.z = c.z + 0.4; }
            return c?.phase ?? null;
          });
          if (phase === 'bite') await ctx.run(() => (window as any).__lc.game.act());
          if (phase === 'reel') await ctx.page.keyboard.down('e');
          if (phase === 'caught') { await ctx.cut(-1.1); break; }
          if (phase === 'escaped' || phase === null && i > 5) break;
          await ctx.wait(100);
        }
        await ctx.page.keyboard.up('e');
        await ctx.wait(500); await ctx.still('Reeling in a fish off the dock');
        await ctx.wait(1500);
      }
    },
    {
      id: 'festival-sea',
      async setup(ctx) {
        await newGame(ctx,20.5*60);
        await ctx.run(() => { const app = (window as any).__lc, g = app.game; g.state.flags.lighthouseLit = 1; g.mode = 'cutscene'; app.view.rebuildPlayer?.(); app.view.startFestival(); });
      },
      async act(ctx) {
        await ctx.wait(13000); await ctx.cut();
        await ctx.wait(1500); await ctx.still('The lighthouse shines again as lanterns drift out to sea');
        await ctx.wait(2500);
      }
    }
  ]
};
