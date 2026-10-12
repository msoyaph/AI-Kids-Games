// Render the soundtrack of every cut to build/music/<cut>.wav (48 kHz, 24-bit) plus beats.json,
// the bar and beat grid that the edit and the review checks use.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { at, BAR, BEAT, BPM, CUTS, sizzle } from '../reel.config';
import { compose } from './score';
import { wav } from './synth';
import { idle } from '../guard';

idle('render');

const dir = join(sizzle, 'build/music');
mkdirSync(dir, { recursive: true });
const grid: Record<string, unknown> = { bpm: BPM, beat: BEAT, bar: BAR };
for (const cut of CUTS) {
  const started = performance.now();
  const { mix, events } = compose(cut);
  writeFileSync(join(dir, `${cut.id}.wav`), wav(mix.L, mix.R));
  grid[cut.id] = {
    seconds: at(cut.beats),
    bars: Array.from({ length: Math.ceil(cut.beats / 4) }, (_, i) => at(i * 4)),
    beats: Array.from({ length: cut.beats }, (_, i) => at(i)),
    cuts: cut.blocks.map(block => ({ kind: block.kind, at: at(block.start) }))
  };
  console.log(`${cut.id}: ${at(cut.beats).toFixed(2)} s, ${events} notes and hits, rendered in ${((performance.now() - started) / 1000).toFixed(1)} s`);
}
writeFileSync(join(sizzle, 'beats.json'), JSON.stringify(grid, null, 2) + '\n');
