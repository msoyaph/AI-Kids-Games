/**
 * Run the playthrough bot from the command line (a long simulation: quiet-check first):
 *   npx tsx scripts/bot-run.ts [seed] [easy|normal|hard] [fuzz]
 */
import { playthrough } from '../src/sim/bot';

const seed = Number(process.argv[2] ?? 1);
const difficulty = (process.argv[3] ?? 'normal') as 'easy' | 'normal' | 'hard';
const fuzz = Number(process.argv[4] ?? 0);
const t0 = Date.now();
const r = await playthrough({ seed, difficulty, fuzz, log: true, maxMs: Number(process.env.BOT_MS ?? 120000) });
const c = r.clock;
const total = c.walk + c.read + c.battle + c.befriend + c.puzzle + c.menus;
console.log(`${r.ok ? 'OK' : 'FAILED'}: ${r.reason}`);
console.log(`stage ${r.stage}, steps ${r.steps}, spars wild ${r.spars.wild} / trainer ${r.spars.trainer} / lost ${r.spars.lost}, friends ${r.befriends}, rests ${r.rests}, rooms ${r.roomsSolved}, fuzz ${r.fuzzActions}, reloads ${r.saveReloads}`);
console.log(`clock: ${(total / 3600).toFixed(2)} h  (walk ${(c.walk / 60).toFixed(0)} min, read ${(c.read / 60).toFixed(0)}, battle ${(c.battle / 60).toFixed(0)}, befriend ${(c.befriend / 60).toFixed(0)}, puzzle ${(c.puzzle / 60).toFixed(0)}, menus ${(c.menus / 60).toFixed(0)})`);
console.log(`team: ${r.team.map(t => `${t.species} ${t.level}`).join(', ')}`);
console.log(`stage minutes: ${r.stageTimes.map((t, i) => `${i}:${((t - (r.stageTimes[i - 1] ?? 0)) / 60).toFixed(0)}`).join(' ')}`);
console.log(`wild spars by chapter: ${JSON.stringify(r.wildByChapter)}`);
if (r.losses.length) console.log(`losses:\n  ${r.losses.join('\n  ')}`);
console.log(`(ran in ${((Date.now() - t0) / 1000).toFixed(1)} s)`);
