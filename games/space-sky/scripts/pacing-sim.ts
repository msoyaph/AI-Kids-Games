/**
 * Pacing simulation: `npm run pacing`
 * Prints estimated minutes per chapter on Easy and Normal (see src/systems/pacing.ts for the assumptions).
 */
import { simulatePacing, totalHours } from '../src/systems/pacing';
import { CHAPTER_NAMES } from '../src/data/missions';

for (const diff of ['easy', 'normal'] as const) {
  const p = simulatePacing(diff);
  console.log(`\n${diff.toUpperCase()}`);
  console.log('Chapter                              Main   Side   Free  Total (min)');
  for (const c of p) {
    const name = `${c.chapter}. ${CHAPTER_NAMES[c.chapter]}`.padEnd(36);
    console.log(`${name} ${c.mainMin.toFixed(0).padStart(5)} ${c.sideMin.toFixed(0).padStart(6)} ${c.freeMin.toFixed(0).padStart(6)} ${c.totalMin.toFixed(0).padStart(6)}`);
  }
  const mainOnly = simulatePacing(diff, false);
  console.log(`Total: ${totalHours(p).toFixed(2)} h  (story only: ${totalHours(mainOnly).toFixed(2)} h)`);
}
