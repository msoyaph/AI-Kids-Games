/**
 * Headless simulation benchmark: N enemies (stress mode), full late-game weapon loadout.
 * Usage: npx tsx scripts/bench.ts [enemies=1000] [seconds=20] [extraProjectiles=0] [--map rimewood]
 */
import { isMapId, type MapId } from '../src/config/maps';
import { newRun } from '../src/sim/run';
import { step } from '../src/sim/sim';
import { applyChoice, eligibleEvolutions } from '../src/sim/upgrades';
import { addWeapon, levelUpWeapon } from '../src/sim/weapons';
import { emptyInput } from '../src/sim/world';

const argv = process.argv.slice(2);
const mIdx = argv.indexOf('--map');
let map: MapId = 'meadow';
if (mIdx >= 0) {
  const id = argv[mIdx + 1];
  if (!isMapId(id)) throw new Error(`unknown map ${id}`);
  map = id;
  argv.splice(mIdx, 2);
}
const enemies = Number(argv[0] ?? 1000);
const seconds = Number(argv[1] ?? 20);

const extra = Number(argv[2] ?? 0);
const w = newRun({ seed: 1234, characterId: 'thea', map, stress: enemies, meta: { amount: extra } });
if (map !== 'meadow') {
  // weather on from the start so the benchmark covers it
  w.weather.nextIcicle = 0;
  w.weather.nextGust = 0;
}
for (const id of ['thistleDarts', 'lanterns', 'zapJar', 'wobbleDisc', 'wispBees']) addWeapon(w, id);
w.unlockedWeapons.add('wispBees');
for (const wi of w.weapons) while (wi.level < 5) levelUpWeapon(w, wi);
for (const p of ['echoShell', 'hourglassSand', 'quickspring', 'velocityFeather', 'cloverButton', 'kettleLid']) applyChoice(w, { kind: 'newPassive', id: p, level: 1 });
for (const e of eligibleEvolutions(w)) applyChoice(w, { kind: 'evolve', id: e.wi.def.id, level: 1 });

const input = emptyInput();
// circle so the horde keeps streaming in
const ticks = seconds * 60;
const times: number[] = [];
const cpu0 = process.cpuUsage();
let maxProj = 0;
let maxEnemies = 0;
for (let t = 0; t < ticks; t++) {
  const a = t / 240;
  input.moveX = Math.sin(a);
  input.moveZ = Math.cos(a);
  const t0 = performance.now();
  step(w, input);
  times.push(performance.now() - t0);
  w.events.clear();
  if (w.state !== 'playing') {
    w.state = 'playing';
    w.pendingLevels = 0;
    w.pendingChests = 0;
  }
  maxProj = Math.max(maxProj, w.projectiles.count + w.enemyShots.count);
  maxEnemies = Math.max(maxEnemies, w.enemies.count);
}
const cpu = process.cpuUsage(cpu0);
times.sort((a, b) => a - b);
const avg = times.reduce((a, b) => a + b, 0) / times.length;
const p95 = times[Math.floor(times.length * 0.95)];
const p99 = times[Math.floor(times.length * 0.99)];
console.log(`enemies (max alive) ${maxEnemies}, projectiles (max) ${maxProj}, kills ${w.stats.kills}`);
console.log(`sim tick: avg ${avg.toFixed(3)} ms · p95 ${p95.toFixed(3)} ms · p99 ${p99.toFixed(3)} ms · budget 16.7 ms`);
// CPU time is far less sensitive to a busy machine than wall time: compare A/B runs on this
console.log(`cpu per tick: ${((cpu.user + cpu.system) / 1000 / ticks).toFixed(3)} ms`);
