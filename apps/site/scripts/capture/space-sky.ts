// Space Sky capture route. Uses the production ?debug hook window.__spacesky (game.go() scene
// switching, ship and player objects) and the game's own data-testid buttons.
// NOTE: Space Sky is moving to 3D; rerun this route on the new build.
import type { Scenario, TakeContext } from './types';

const space = (ctx: TakeContext) => ctx.run(() => (window as any).__spacesky);
const scene = (ctx: TakeContext) => ctx.run(() => (window as any).__spacesky.game.sceneName as string);
/** Dialogue pauses the game: click through it and close any popups (as the e2e helpers do). */
async function clearDialogue(ctx: TakeContext) {
  for (let i = 0; i < 40; i++) {
    const dialogue = ctx.page.getByTestId('dialogue');
    if (!await dialogue.isVisible().catch(() => false)) { await ctx.wait(150); if (!await dialogue.isVisible().catch(() => false)) break; }
    await dialogue.click({ force: true }).catch(() => {}); await ctx.wait(90);
  }
  for (const id of ['btn-popup-ok','btn-badge-ok','btn-tip-ok']) { const button = ctx.page.getByTestId(id); if (await button.isVisible().catch(() => false)) await button.click({ force: true }); }
}
async function go(ctx: TakeContext,name: string,params: Record<string,unknown>) {
  await ctx.run(([n,p]) => (window as any).__spacesky.game.go(n,p),[name,params] as const);
  await ctx.page.waitForFunction(n => (window as any).__spacesky.game.sceneName === n && !(window as any).__spacesky.game.isSwitching,name,{ timeout: 15000 });
  await ctx.wait(600); await clearDialogue(ctx);
}

export const scenario: Scenario = {
  slug: 'space-sky',
  canvas: '#stage',
  takes: [
    {
      id: 'flight',
      query: '?debug',
      async setup(ctx) {
        await ctx.page.getByTestId('btn-play').click();
        await ctx.page.getByTestId('slot-0').click();
        await ctx.page.getByTestId('name-input').fill('Nova');
        await ctx.page.getByTestId('btn-start').click();
        await ctx.page.getByTestId('hub-banner').waitFor({ timeout: 15000 });
        await clearDialogue(ctx);
        await space(ctx);
        await go(ctx,'flight',{ from: 'earth',to: 'saturn' });
        // Start just behind Saturn and cruise past its rings (as the game's own e2e test teleports).
        await ctx.run(() => {
          const sc = (window as any).__spacesky.game.current, saturn = sc.getLayout().world.bodies.find((b: any) => b.id === 'saturn'), ship = sc.getShip();
          ship.x = saturn.x - saturn.r - 520; ship.y = saturn.y - saturn.r*0.55; ship.vx = 140; ship.vy = 0;
        });
        await clearDialogue(ctx);
      },
      async act(ctx) {
        await ctx.page.keyboard.down('ArrowRight');
        await ctx.wait(600); await ctx.cut();
        await ctx.page.keyboard.press('Space');
        await ctx.wait(1300); await ctx.still('Your rocket zooms past Saturn and its rings');
        await ctx.page.keyboard.press('Space');
        await ctx.wait(1800);
        await ctx.page.keyboard.up('ArrowRight');
      }
    },
    {
      id: 'landing',
      continues: true,
      async setup(ctx) { await go(ctx,'landing',{ body: 'mars' }); },
      async act(ctx) {
        await ctx.wait(300); await ctx.cut();
        await ctx.wait(1600); await ctx.still('Gently landing the rocket on Mars');
        for (let i = 0; i < 40 && await scene(ctx) === 'landing'; i++) await ctx.wait(250);
        await ctx.wait(400);
      }
    },
    {
      id: 'explore',
      continues: true,
      crop: [240,330,1280,720],
      async setup(ctx) { await go(ctx,'explore',{ area: 'zephyra_village' }); },
      async act(ctx) {
        await ctx.page.keyboard.down('ArrowRight');
        await ctx.wait(500); await ctx.cut();
        await ctx.wait(700); await ctx.page.keyboard.press('Space');
        await ctx.wait(900); await ctx.still('Exploring Zephyra Village with friendly aliens');
        await ctx.page.keyboard.press('Space'); await ctx.wait(1400);
        await ctx.page.keyboard.up('ArrowRight');
      }
    },
    {
      id: 'explore-ice',
      continues: true,
      crop: [240,330,1280,720],
      async setup(ctx) { await go(ctx,'explore',{ area: 'europa_ice' }); },
      async act(ctx) {
        await ctx.page.keyboard.down('ArrowRight');
        await ctx.wait(500); await ctx.cut();
        await ctx.wait(800); await ctx.page.keyboard.press('Space');
        await ctx.wait(800); await ctx.still('Sliding across the ice on Europa');
        await ctx.wait(1300);
        await ctx.page.keyboard.up('ArrowRight');
      }
    }
  ]
};
