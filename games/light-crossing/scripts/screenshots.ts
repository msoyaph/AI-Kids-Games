// Captures screenshots of scripted scenes with GPU-accelerated headless Chromium (Metal on macOS).
//   npx tsx scripts/screenshots.ts --out docs/screenshots/after [--scenes island,shop] [--quality low|medium|high]
// Scenes are set up in the page through the dev server's module graph (window.__lc + dynamic imports).
import { chromium, type Page } from 'playwright';
import { createServer } from 'vite';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const arg = (k: string) => {
  const i = process.argv.indexOf(k);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const outDir = arg('--out') ?? 'docs/screenshots/after';
const only = arg('--scenes')?.split(',');
const quality = arg('--quality');
mkdirSync(outDir, { recursive: true });

/** In-page helpers, injected once. */
const HELPERS = `
window.__name = window.__name || ((f) => f);
window.__shot = {
  async mod(p) { return import(p); },
  imp(p) { return import(p); },
  async newGame(seed) {
    const app = window.__lc;
    app.saves.remove(2);
    app.startNewGame(2, 'Wren', { skin: 1, hair: 3, hairColor: 4, eyes: 1, mouth: 0, blush: true, outfit: 5 }, seed);
    await new Promise((r) => setTimeout(r, 1400));
    app.ui.closeAll();
    const g = app.game;
    g.runtime.quests && (g.runtime.quests.inbox.length = 0);
    g.state.tips = Object.fromEntries(['move','phone','net','rod','reel','axe','shovel','can','ladder','inventory','craft','shop','home','villager','night','rain','placement','museum','challenge','decor'].map((k) => [k, 1]));
    return g;
  },
  async town(g, residents) {
    const Q = await import('/src/sim/quests.ts');
    const H = await import('/src/sim/housing.ts');
    const P = await import('/src/sim/placement.ts');
    const V = await import('/src/sim/villagers.ts');
    H.pitchTent(g);
    g.state.home.level = 1;
    Q.applyEffect(g, { type: 'spawn', struct: 'shopCart' });
    Q.applyEffect(g, { type: 'construct', from: 'shopCart', to: 'shop' });
    Q.applyEffect(g, { type: 'spawn', struct: 'museumTent' });
    Q.applyEffect(g, { type: 'construct', from: 'museumTent', to: 'museum' });
    const w = g.world;
    for (const id of residents) {
      P.startPlotPlacement(g, id);
      const pl = P.placementRT(g);
      for (let i = 0; i < w.size * w.size; i++) {
        if (w.region(i) !== 1 || !w.standable(i)) continue;
        g.state.player.x = (i % w.size) + 0.5; g.state.player.z = ((i / w.size) | 0) + 0.5; g.state.player.facing = Math.PI; g.state.player.level = w.height(i);
        pl.compute(g, pl);
        if (pl.valid) { P.confirmPlacement(g); break; }
      }
    }
    P.scheduleMoveIn(g, residents);
    g.state.clock.minute = 22 * 60; H.sleep(g);
    for (const id of residents) V.vstate(g, id).friendship = 45;
    g.emit('structuresChanged', {});
    window.__lc.ui.closeAll();
    return g;
  },
  look(g, x, z, minute, facing = 0) {
    const p = g.state.player; p.x = x; p.z = z; p.facing = facing;
    p.level = g.world.height(g.world.idx(Math.floor(x), Math.floor(z)));
    if (minute !== undefined) g.state.clock.minute = minute;
    window.__lc.view.rig.snap(p.x, 0, p.z);
  },
  async season(g, season, day = 3) {
    const SE = await import('/src/sim/seasons.ts');
    g.state.quests.chapter = Math.max(g.state.quests.chapter, 3);
    SE.setSeason(g, season, day);
    SE.setSeasonsPaused(g, true);
    g.state.weather.today = 'sunny';
  },
  async decorate(g) {
    const H = await import('/src/sim/housing.ts');
    const I = await import('/src/sim/inventory.ts');
    const IN = await import('/src/sim/interior.ts');
    g.state.home.level = Math.max(g.state.home.level, 2);
    const ids = ['furn_woven_rug', 'furn_plank_table', 'furn_twiggy_chair', 'furn_pocket_fern', 'furn_driftwood_shelf', 'furn_wick_lantern', 'furn_bellbloom_vase', 'furn_sunset_painting', 'furn_sunny_wallclock', 'furn_leafy_wreath', 'furn_lantern_sconce'];
    for (const id of ids) I.give(g, id, 1);
    IN.enterInterior(g, 'home');
    const slot = (id) => g.state.player.inv.findIndex((s) => s && s.id === id);
    H.placeFromPockets(g, slot('furn_woven_rug'), 3, 3, 0);
    H.placeFromPockets(g, slot('furn_plank_table'), 3, 2, 0);
    H.placeFromPockets(g, slot('furn_twiggy_chair'), 5, 2, 3);
    H.placeFromPockets(g, slot('furn_pocket_fern'), 7, 0, 0);
    H.placeFromPockets(g, slot('furn_driftwood_shelf'), 0, 0, 0);
    const table = g.state.home.furniture.find((f) => f.id === 'furn_plank_table');
    if (table) {
      H.placeOnSurface(g, { kind: 'pocket', index: slot('furn_wick_lantern') }, table.uid, 0);
      H.placeOnSurface(g, { kind: 'pocket', index: slot('furn_bellbloom_vase') }, table.uid, 1);
    }
    H.placeWall(g, { kind: 'pocket', index: slot('furn_sunset_painting') }, 0, 2);
    H.placeWall(g, { kind: 'pocket', index: slot('furn_sunny_wallclock') }, 0, 5);
    H.placeWall(g, { kind: 'pocket', index: slot('furn_leafy_wreath') }, 1, 2);
    H.placeWall(g, { kind: 'pocket', index: slot('furn_lantern_sconce') }, 0, 0);
    IN.rebuildRoom(g);
    return IN;
  },
  homeOf(g, id) { return g.state.world.structures.find((s) => s.owner === id && s.type === 'villagerHome'); },
  inside(g, I, kind) {
    g.state.clock.minute = 12.5 * 60;
    I.enterInterior(g, kind);
    const rt = I.interiorRT(g);
    rt.x = rt.room.door.x + 0.5; rt.z = rt.room.d - 2.2; rt.facing = Math.PI;
    document.querySelector('.fade')?.classList.remove('on');
  },
};
`;

type Scene = { name: string; run: (page: Page) => Promise<void> };
/** scenes where the toasts are part of the picture */
const keepToasts = ['dialogue-big-text'];

const scenes: Scene[] = [
  {
    name: 'island-plaza',
    run: async (page) => {
      await page.evaluate(async () => {
        const S = (window as any).__shot;
        const g = await S.newGame(777);
        await S.town(g, ['tansy', 'rusk', 'juno', 'kip']);
        const plaza = g.world.gen.lots.plaza;
        S.look(g, plaza.x + plaza.w / 2, plaza.z + plaza.d + 2, 11 * 60);
      });
    },
  },
  {
    name: 'villager-tansy',
    run: async (page) => {
      await page.evaluate(async () => {
        const S = (window as any).__shot;
        const g = await S.newGame(777);
        await S.town(g, ['tansy', 'rusk']);
        const h = S.homeOf(g, 'tansy');
        S.look(g, h.x + 1.5, h.z + 4.5, 12 * 60, Math.PI);
        const I = await S.imp('/src/sim/interior.ts');
        if ((I as any).villagerRoom) S.inside(g, I, 'villager:tansy');
      });
    },
  },
  {
    name: 'villager-rusk',
    run: async (page) => {
      await page.evaluate(async () => {
        const S = (window as any).__shot;
        const g = await S.newGame(777);
        await S.town(g, ['tansy', 'rusk']);
        const h = S.homeOf(g, 'rusk');
        S.look(g, h.x + 1.5, h.z + 4.5, 12 * 60, Math.PI);
        const I = await S.imp('/src/sim/interior.ts');
        if ((I as any).villagerRoom) S.inside(g, I, 'villager:rusk');
      });
    },
  },
  {
    name: 'shop',
    run: async (page) => {
      await page.evaluate(async () => {
        const S = (window as any).__shot;
        const g = await S.newGame(777);
        await S.town(g, []);
        const s = g.state.world.structures.find((x: any) => x.type === 'shop');
        S.look(g, s.x + s.w / 2, s.z + s.d + 2.5, 11 * 60, Math.PI);
        const I = await S.imp('/src/sim/interior.ts');
        if ((I as any).buildShopRoom) S.inside(g, I, 'shop');
        else (window as any).__lc.panels.shop();
      });
    },
  },
  {
    name: 'hall',
    run: async (page) => {
      await page.evaluate(async () => {
        const S = (window as any).__shot;
        const g = await S.newGame(777);
        const I = await S.imp('/src/sim/interior.ts');
        S.inside(g, I, 'hall');
      });
    },
  },
  {
    name: 'editor',
    run: async (page) => {
      await page.evaluate(async () => {
        const S = (window as any).__shot;
        const g = await S.newGame(777);
        await S.town(g, []);
        const H = await S.imp('/src/sim/housing.ts');
        const I = await S.imp('/src/sim/inventory.ts');
        for (const id of ['furn_plank_table', 'furn_twiggy_chair', 'furn_woven_rug', 'furn_pocket_fern', 'furn_driftwood_shelf']) I.give(g, id, 1);
        const IN = await S.imp('/src/sim/interior.ts');
        IN.enterInterior(g, 'home');
        const slot = (id: string) => g.state.player.inv.findIndex((s: any) => s && s.id === id);
        H.placeFromPockets(g, slot('furn_woven_rug'), 3, 3, 0);
        H.placeFromPockets(g, slot('furn_plank_table'), 3, 2, 0);
        H.placeFromPockets(g, slot('furn_twiggy_chair'), 5, 2, 3);
        H.placeFromPockets(g, slot('furn_pocket_fern'), 7, 0, 0);
        IN.rebuildRoom(g);
        (window as any).__lc.panels.editor();
      });
    },
  },
  // ---- after the upgrade: every season, every interior, festivals and young-player features
  ...(['spring', 'summer', 'autumn', 'winter'] as const).map(
    (season): Scene => ({
      name: `island-${season}`,
      run: async (page) => {
        await page.evaluate(async (season) => {
          const S = (window as any).__shot;
          const g = await S.newGame(777);
          await S.town(g, ['tansy', 'rusk', 'juno', 'kip']);
          await S.season(g, season);
          const plaza = g.world.gen.lots.plaza;
          S.look(g, plaza.x + plaza.w / 2, plaza.z + plaza.d + 2, 11 * 60);
        }, season);
      },
    }),
  ),
  ...['bellamy', 'juno', 'percival', 'kip', 'mochi', 'marlowe'].map(
    (id): Scene => ({
      name: `villager-${id}`,
      run: async (page) => {
        await page.evaluate(async (id) => {
          const S = (window as any).__shot;
          const g = await S.newGame(777);
          await S.town(g, [id]);
          const I = await S.imp('/src/sim/interior.ts');
          S.inside(g, I, 'villager:' + id);
        }, id);
      },
    }),
  ),
  {
    name: 'home-decorated',
    run: async (page) => {
      await page.evaluate(async () => {
        const S = (window as any).__shot;
        const g = await S.newGame(777);
        await S.town(g, []);
        const IN = await S.decorate(g);
        S.inside(g, IN, 'home');
      });
    },
  },
  {
    name: 'basement',
    run: async (page) => {
      await page.evaluate(async () => {
        const S = (window as any).__shot;
        const g = await S.newGame(777);
        await S.town(g, []);
        const H = await S.imp('/src/sim/housing.ts');
        const I = await S.imp('/src/sim/inventory.ts');
        const IN = await S.imp('/src/sim/interior.ts');
        g.state.home.level = 3;
        S.inside(g, IN, 'home');
        IN.changeFloor(g, 'basement');
        for (const id of ['furn_woven_rug', 'furn_plank_table', 'furn_pocket_fern', 'furn_twiggy_chair']) I.give(g, id, 1);
        const slot = (id: string) => g.state.player.inv.findIndex((s: any) => s && s.id === id);
        H.placeFromPockets(g, slot('furn_woven_rug'), 4, 4, 0);
        H.placeFromPockets(g, slot('furn_plank_table'), 4, 3, 0);
        H.placeFromPockets(g, slot('furn_twiggy_chair'), 6, 3, 3);
        H.placeFromPockets(g, slot('furn_pocket_fern'), 1, 1, 0);
        IN.rebuildRoom(g);
        const rt = IN.interiorRT(g);
        rt.x = rt.room.w / 2; rt.z = rt.room.d - 2.2; rt.facing = Math.PI;
      });
    },
  },
  {
    name: 'museum',
    run: async (page) => {
      await page.evaluate(async () => {
        const S = (window as any).__shot;
        const g = await S.newGame(777);
        await S.town(g, []);
        const R = await S.imp('/src/data/registry.ts');
        const M = await S.imp('/src/sim/museum.ts');
        const I = await S.imp('/src/sim/inventory.ts');
        for (const c of [...R.FISH.slice(0, 10), ...R.BUGS.slice(0, 10), ...R.FOSSILS.slice(0, 6)]) {
          I.give(g, c.id, 1);
          M.donateSlot(g, g.state.player.inv.findIndex((s: any) => s && s.id === c.id));
        }
        const IN = await S.imp('/src/sim/interior.ts');
        S.inside(g, IN, 'museum');
      });
    },
  },
  {
    name: 'festival-feast',
    run: async (page) => {
      await page.evaluate(async () => {
        const S = (window as any).__shot;
        const g = await S.newGame(777);
        await S.town(g, ['tansy', 'rusk', 'bellamy', 'juno', 'percival', 'kip', 'mochi', 'marlowe']);
        await S.season(g, 'autumn', 5);
        const plaza = g.world.gen.lots.plaza;
        S.look(g, plaza.x + plaza.w / 2, plaza.z + plaza.d + 2.5, 17.5 * 60);
      });
    },
  },
  {
    name: 'festival-skate',
    run: async (page) => {
      await page.evaluate(async () => {
        const S = (window as any).__shot;
        const g = await S.newGame(777);
        await S.town(g, ['juno']);
        await S.season(g, 'winter', 5);
        const E = await S.imp('/src/sim/happenings.ts');
        const rings = E.skateRings(g);
        const r = rings[rings.length - 1];
        S.look(g, r.x, r.z + 1.5, 18 * 60, Math.PI);
      });
    },
  },
  {
    name: 'wardrobe',
    run: async (page) => {
      await page.evaluate(async () => {
        const S = (window as any).__shot;
        const g = await S.newGame(777);
        await S.town(g, []);
        const W = await S.imp('/src/sim/wardrobe.ts');
        const C = await S.imp('/src/data/clothing.ts');
        const owned = g.state.wardrobe.owned;
        for (const c of C.CLOTHING.slice(0, 18)) owned.push(c.id);
        for (const slot of ['hat', 'dress', 'shoes', 'bag']) {
          const c = C.CLOTHING.find((x: any) => x.slot === slot);
          if (!c) continue;
          if (!owned.includes(c.id)) owned.push(c.id);
          W.wear(g, c.id);
        }
        const IN = await S.decorate(g);
        S.inside(g, IN, 'home');
        (window as any).__lc.panels.wardrobe();
      });
    },
  },
  {
    name: 'dialogue-big-text',
    run: async (page) => {
      await page.evaluate(async () => {
        const S = (window as any).__shot;
        const app = (window as any).__lc;
        const g = await S.newGame(777);
        await S.town(g, ['tansy']);
        app.settings.textSize = 1.5;
        app.applySettings();
        const h = S.homeOf(g, 'tansy');
        S.look(g, h.x + 1.5, h.z + 4.5, 12 * 60, Math.PI);
        const C = await S.imp('/src/ui/conversation.ts');
        void C.talkToVillager(app, g, 'tansy');
      });
    },
  },
];

async function main(): Promise<void> {
  const server = await createServer({ logLevel: 'error', server: { port: 0, host: '127.0.0.1' } });
  await server.listen();
  const url = server.resolvedUrls!.local[0]!;
  const gpu = process.platform === 'darwin' ? ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu'] : ['--ignore-gpu-blocklist'];
  const browser = await chromium.launch({ channel: 'chromium', args: gpu });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  for (const s of scenes) {
    if (only && !only.includes(s.name)) continue;
    await page.goto(url + (quality ? `?quality=${quality}` : ''));
    await page.waitForFunction(() => !!(window as any).__lc);
    await page.evaluate(HELPERS);
    await s.run(page);
    await page.waitForTimeout(1500);
    // setup toasts (achievements from the scripted set-up) would cover the scene
    if (!keepToasts.includes(s.name)) await page.evaluate(() => document.querySelectorAll('.toasts > *').forEach((t) => t.remove()));
    const file = join(outDir, `${s.name}${quality ? `-${quality}` : ''}.jpg`);
    await page.screenshot({ path: file, type: 'jpeg', quality: 82 });
    console.log('saved', file);
  }
  if (errors.length) console.log('page errors:', errors);
  await browser.close();
  await server.close();
}

void main();
