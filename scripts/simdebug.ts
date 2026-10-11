// Dev tool: per-wave trace of one bot run.  vite-node scripts/simdebug.ts w4m2 normal
import { mapById } from '../src/data/maps';
import { AutoPlayer } from '../src/sim/autoplay';
import { Game } from '../src/sim/Game';
import type { Difficulty } from '../src/data/difficulty';
const [id = 'w1m1', diff = 'normal'] = process.argv.slice(2);
const g = new Game({ map: mapById(id)!, difficulty: diff as Difficulty, mode: 'campaign', seed: 1 });
const bot = new AutoPlayer(g);
let lastWave = 0;
while (g.state === 'playing' && g.tick < 30 * 3600) {
  bot.update();
  g.step();
  g.events.clear();
  if (g.waveNum !== lastWave) {
    lastWave = g.waveNum;
    const kinds = new Map<string, number>();
    for (const t of g.towers) kinds.set(`${t.def.id}${t.level}`, (kinds.get(`${t.def.id}${t.level}`) ?? 0) + 1);
    console.log(`w${g.waveNum} lives ${g.lives} coins ${Math.round(g.coins)} towers ${g.towers.length} path ${g.pathLength().toFixed(0)} els ${g.unlocked.join(',')} | ${[...kinds].map(([k, v]) => `${k}x${v}`).join(' ')}`);
  }
}
console.log(g.state, g.lives);
