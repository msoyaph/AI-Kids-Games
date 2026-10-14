/**
 * Balance: thousands of AI-vs-AI spars. No element, Agentmon or move may dominate.
 * Writes reports/balance.md (committed) so the numbers can be reviewed.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEX } from '../../src/data/index';
import { balanceMarkdown, elementRates, simulateBalance, speciesRates, teamRates, type BalanceReport } from '../../src/sim/balance';

let report: BalanceReport;

describe('balance simulation', () => {
  it('runs thousands of spars without stalemates, at a kid-friendly pace', () => {
    report = simulateBalance(DEX, { seedsPerPair: 8, teamBattles: 2000, seed: 2026 });
    mkdirSync('reports', { recursive: true });
    writeFileSync('reports/balance.md', balanceMarkdown(report, DEX));
    expect(report.battles).toBeGreaterThan(7000);
    expect(report.stalemates / report.battles).toBeLessThan(0.005);
    expect(report.avgTurns).toBeGreaterThan(3);
    expect(report.avgTurns).toBeLessThan(12);
  });

  it('no element dominates (every element wins 48–52% of its 1-vs-1 spars; 1.1 tightened this from 42–58%)', () => {
    for (const [element, r] of Object.entries(elementRates(report))) {
      expect(r, element).toBeGreaterThanOrEqual(0.48);
      expect(r, element).toBeLessThanOrEqual(0.52);
    }
  });

  it('no Agentmon dominates within its growth stage (30–70%), and none is hopeless', () => {
    for (const [id, r] of Object.entries(speciesRates(report))) {
      expect(r, id).toBeGreaterThan(0.3);
      expect(r, id).toBeLessThan(0.7);
    }
  });

  it('in 3-vs-3 team spars, every third stage pulls its weight (35–65%)', () => {
    const rates = teamRates(report);
    // one third stage per family (16 in 1.0, 24 in 1.1), counted from the data
    expect(Object.keys(rates)).toHaveLength(Object.values(DEX.species).filter(s => !s.guardian && s.stage === 3).length);
    for (const [id, r] of Object.entries(rates)) {
      expect(r, id).toBeGreaterThan(0.35);
      expect(r, id).toBeLessThan(0.65);
    }
  });

  it('no move dominates (none is more than 8% of all attack picks)', () => {
    const shares = Object.entries(report.moves).map(([id, m]) => [id, m.share] as const);
    for (const [id, share] of shares) expect(share, id).toBeLessThan(0.08);
    // and plenty of different moves get used
    expect(shares.filter(([, s]) => s > 0.005).length).toBeGreaterThan(30);
  });
});
