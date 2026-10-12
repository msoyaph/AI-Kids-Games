// Captures real save files from the current game version as migration fixtures.
// Run explicitly with: CAPTURE_FIXTURES=1 npx vitest run tests/capture-fixtures.test.ts
import { describe, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { makeGame } from './helpers';
import { craftItem, deliverAll, nextDay, placePlot, setHour, talk } from './story';
import { orderUpgrade, payLoan } from '../src/sim/housing';
import { buy, dailyStock } from '../src/sim/economy';
import { give, money } from '../src/sim/inventory';
import { BUGS, FISH } from '../src/data/registry';
import { metaOf } from '../src/sim/save';
import { SAVE_VERSION } from '../src/sim/state';
import type { Game } from '../src/sim/game';

const file = (g: Game) => JSON.stringify({ version: SAVE_VERSION, savedAt: 1760000000000, meta: { ...metaOf(g.state), savedAt: 1760000000000 }, state: g.state });

// Fixtures are v2 files captured from `main`; never recapture them with newer code.
describe.skipIf(!process.env.CAPTURE_FIXTURES || (SAVE_VERSION as number) !== 2)('capture save fixtures', () => {
  it('writes fresh and mid-game saves', () => {
    const fresh = makeGame(2468);
    fresh.state.createdAt = 1760000000000;
    writeFileSync('tests/fixtures/save-v2-fresh.json', file(fresh));
    const g = makeGame(1357);
    g.state.createdAt = 1760000000000;
    talk(g, 'pemberly');
    deliverAll(g, 'pemberly');
    for (const r of ['r_net_flimsy', 'r_rod_flimsy', 'r_axe_flimsy', 'r_shovel_flimsy']) craftItem(g, r);
    for (let k = 0; k < 2; k++) {
      g.emit('fishCaught', { id: FISH[0]!.id, size: 2, where: 'river', rarity: 1 });
      g.emit('bugCaught', { id: BUGS[0]!.id, rarity: 1 });
    }
    g.state.stats.digSpots = 2;
    g.emit('woodChopped', { id: 'timber', qty: 5 });
    g.update(1, null);
    setHour(g, 18);
    talk(g, 'pemberly');
    nextDay(g);
    talk(g, 'fennimore');
    g.emit('itemSold', { id: 'x', qty: 1, total: 2500, category: 'material' });
    deliverAll(g, 'fennimore');
    talk(g, 'pemberly');
    money(g, 1000);
    orderUpgrade(g);
    nextDay(g);
    money(g, 3000);
    payLoan(g, 3000);
    buy(g, dailyStock(g, 'shop')[0]!);
    placePlot(g, 'tansy');
    placePlot(g, 'rusk');
    for (const r of ['r_furn_driftwood_stool', 'r_furn_wick_lantern', 'r_furn_woven_rug']) craftItem(g, r);
    deliverAll(g, 'pemberly');
    nextDay(g);
    talk(g, 'tansy');
    talk(g, 'rusk');
    g.update(1, null);
    // some personal touches a real player would have
    give(g, 'shell_scallop', 4);
    give(g, 'furn_plank_table', 1);
    g.state.home.furniture.push({ uid: g.state.home.nextUid++, id: 'furn_woven_rug', x: 2, z: 2, rot: 1 });
    g.state.villagers.tansy!.friendship = 37;
    g.state.player.glints = 4321;
    g.state.player.lumens = 650;
    g.state.tips = { move: 1, net: 1 };
    g.state.events.best = { tournament: 0 };
    setHour(g, 15.5);
    writeFileSync('tests/fixtures/save-v2-midgame.json', file(g));
  });
});
