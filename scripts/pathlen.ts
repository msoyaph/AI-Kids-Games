import { ALL_MAPS } from '../src/data/maps';
import { Game } from '../src/sim/Game';
for (const m of ALL_MAPS) {
  const g = new Game({ map: m, difficulty: 'normal', mode: 'campaign' });
  console.log(m.id.padEnd(10), m.style.padEnd(5), 'path', g.pathLength().toFixed(1), 'spawns', g.grid.spawns.length);
}
