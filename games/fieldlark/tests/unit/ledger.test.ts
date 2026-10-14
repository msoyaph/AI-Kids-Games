/** The Farm Ledger and the Farm Book's numbers (phase 8). */
import { describe, expect, it } from 'vitest';
import { CROPS } from '../../src/data/crops';
import { FACTS } from '../../src/data/facts';
import { SCIENCE } from '../../src/data/science';
import { ICONS } from '../../src/ui/icons';
import { DAY_SEC, SEASON_DAYS } from '../../src/sim/clock';
import { coinsPerHarvest, coinsPerMinute, cropLines, pageLabel, pages, topOf } from '../../src/sim/ledger';
import { newFarm } from '../../src/sim/state';
import { earn, ledgerNow, spend } from '../../src/sim/world';

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

describe('profit per crop', () => {
  it('pays every crop something after its seeds', () => {
    for (const c of CROPS) expect(coinsPerHarvest(c), c.id).toBeGreaterThan(0);
  });
  it('later crops pay at least as well a minute as early ones (the audit found the opposite)', () => {
    const early = avg(CROPS.filter(c => c.level <= 5 && c.id !== 'clover').map(coinsPerMinute));
    const late = avg(CROPS.filter(c => c.level >= 12).map(coinsPerMinute));
    expect(late).toBeGreaterThan(early * 1.15);
  });
  it('slow crops pay more each harvest than quick ones', () => {
    const quick = avg(CROPS.filter(c => c.growMin <= 3).map(coinsPerHarvest));
    const slow = avg(CROPS.filter(c => c.growMin >= 8).map(coinsPerHarvest));
    expect(slow).toBeGreaterThan(quick * 2);
  });
  it('lists the crops a farm can grow, best a minute first, with what it earned and spent', () => {
    const farm = newFarm(1);
    spend(farm, 5, 'wheat');
    earn(farm, 24, 'wheat');
    farm.stats['harvest:wheat'] = 6;
    const lines = cropLines(farm);
    expect(lines.every(l => l.crop.level <= 1)).toBe(true);
    expect(lines.map(l => l.perMinute)).toEqual([...lines.map(l => l.perMinute)].sort((a, b) => b - a));
    const wheat = lines.find(l => l.crop.id === 'wheat')!;
    expect(wheat).toMatchObject({ grown: 6, earned: 24, spent: 5 });
  });
});

describe('ledger pages', () => {
  it('names seasons by year', () => {
    expect(pageLabel(0)).toBe('Spring, year 1');
    expect(pageLabel(5)).toBe('Summer, year 2');
    expect(pageLabel(3, true)).toBe('Win 1');
  });
  it('always shows the current season, and at most eight', () => {
    const farm = newFarm(2);
    expect(pages(farm, 0)).toHaveLength(1);
    for (let s = 0; s < 11; s++) { farm.t = s * DAY_SEC * SEASON_DAYS + 10; ledgerNow(farm); }
    const list = pages(farm, 10);
    expect(list).toHaveLength(8);
    expect(list.at(-1)!.season).toBe(10);
  });
  it('picks the biggest counts', () => {
    expect(topOf({ a: 1, b: 5, c: 0, d: 3 }, 2)).toEqual([['b', 5], ['d', 3]]);
  });
});

describe('farm science pages', () => {
  it('use real facts from the facts file and real icons', () => {
    for (const s of SCIENCE) {
      expect(s.facts.length, s.id).toBeGreaterThan(0);
      for (const f of s.facts) expect(FACTS.some(x => x.about === f), `${s.id}: ${f}`).toBe(true);
      expect(s.icon in ICONS, s.id).toBe(true);
    }
  });
});
