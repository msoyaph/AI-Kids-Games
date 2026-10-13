// CI-sized balance checks with fixed seeds (the full report: npm run sim → reports/sim.md).
import { describe, expect, it } from 'vitest';
import { Rng } from '../../src/core/rng';
import { playOut, type BotKind, type Played } from '../../src/sim/bot';
import { newGame, type Difficulty, type Mode } from '../../src/sim/game';

function run(mode: Mode, difficulty: Difficulty, kind: BotKind, n: number, from = 1000): Played[] {
  const out: Played[] = [];
  for (let i = 0; i < n; i++) out.push(playOut(newGame({ mode, difficulty, seed: from + i }), kind, new Rng((from + i) * 7 + 3)));
  return out;
}
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;
const minutes = (ps: Played[]) => ps.map(p => p.seconds / 60);

describe('balance (bots playing the real rules)', { timeout: 120_000 }, () => {
  const casualNormal = run('classic', 'normal', 'casual', 2000);
  it('a casual player\'s Classic Normal games last at least 3 minutes on average, and few end within a minute', () => {
    expect(mean(minutes(casualNormal))).toBeGreaterThanOrEqual(3);
    expect(casualNormal.filter(p => p.seconds < 60).length / casualNormal.length).toBeLessThan(0.1);
  });
  it('Easy and Relax last longer: at least 5 minutes on average', () => {
    expect(mean(minutes(run('classic', 'easy', 'casual', 1000)))).toBeGreaterThanOrEqual(5);
    expect(mean(minutes(run('relax', 'easy', 'casual', 300)))).toBeGreaterThanOrEqual(5);
  });
  it('a strong player scores far higher on Normal, but every game ends (median under 45 minutes)', () => {
    const strong = run('classic', 'normal', 'strong', 24);
    expect(strong.every(p => !p.capped && p.end === 'stuck')).toBe(true);
    expect(mean(strong.map(p => p.score))).toBeGreaterThanOrEqual(6 * mean(casualNormal.map(p => p.score)));
    expect(median(minutes(strong))).toBeLessThanOrEqual(45);
  });
  it('replays exactly: the same seeds and bots give the same games', () => {
    const a = run('classic', 'normal', 'casual', 20, 77), b = run('classic', 'normal', 'casual', 20, 77);
    expect(a).toEqual(b);
  });
});
