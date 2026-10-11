// Dev tool: print the bot's maze (towers as letters) at a given wave.  vite-node scripts/simmap.ts w4m3 normal 6
import { mapById } from '../src/data/maps';
import { AutoPlayer } from '../src/sim/autoplay';
import { Game } from '../src/sim/Game';
import type { Difficulty } from '../src/data/difficulty';
const [id = 'w1m1', diff = 'normal', wave = '6'] = process.argv.slice(2);
const map = mapById(id)!;
const g = new Game({ map, difficulty: diff as Difficulty, mode: 'campaign', seed: 1 });
const bot = new AutoPlayer(g);
while (g.state === 'playing' && g.waveNum < Number(wave)) {
  bot.update();
  g.step();
  g.events.clear();
}
const path = new Set(g.currentPaths([]).flat());
const plan = (bot as unknown as { mazePlan: Set<number> }).mazePlan;
for (let y = 0; y < g.grid.rows; y++) {
  let row = '';
  for (let x = 0; x < g.grid.cols; x++) {
    const i = g.grid.idx(x, y);
    const t = g.towerAt(x, y);
    row += t ? t.def.id[0]!.toUpperCase() : path.has(i) ? '*' : plan.has(i) ? '+' : map.grid[y]![x];
  }
  console.log(row);
}
console.log('path', g.pathLength(), 'towers', g.towers.length, 'coins', Math.round(g.coins));
