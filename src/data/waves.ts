import { hashString, Rng } from '../core/rng';
import { ELEMENT_ORDER, ELEMENTS, type ElementId } from './elements';
import type { EnemyId } from './enemies';
import type { MapDef } from './maps/types';
import { TUNING } from './tuning';

export interface SpawnGroup {
  enemy: EnemyId;
  count: number;
  /** Seconds between spawns. */
  gap: number;
  /** Seconds after the wave starts. */
  delay: number;
  /** Element affinity for each creature (null = plain). Per-creature choice comes from `elements`. */
  elements?: (ElementId | null)[];
  /** Bubble shields cycle through these elements. */
  shields?: ElementId[];
  /** Element this group resists (takes reduced damage from). */
  resist?: ElementId;
}

export interface WaveDef {
  /** 1-based wave number. */
  n: number;
  groups: SpawnGroup[];
  /** Health multiplier applied to every creature in the wave. */
  hp: number;
  /** Coin multiplier. */
  coins: number;
  boss: EnemyId | null;
}

/** Creature health curve (TUNING.waves.hp). Tuned with the headless autoplay sim (npm run sim). */
export function hpScale(w: number): number {
  const k = w - 1;
  const H = TUNING.waves.hp;
  const base = 1 + H.linear * k + H.quad * k * k;
  // Endless: keep growing a little faster after the campaign length.
  return w > H.endlessAfter ? base * Math.pow(H.endlessGrowth, w - H.endlessAfter) : base;
}

export function coinScale(w: number): number {
  return 1 + TUNING.waves.coinsPerWave * (w - 1);
}

/** Gold for clearing a wave. */
export function waveClearBonus(w: number): number {
  return TUNING.economy.waveClear.base + w * TUNING.economy.waveClear.perWave;
}

/** Element core milestones (after clearing these waves). A first core is given at the start. */
export const CRYSTAL_WAVES: readonly number[] = TUNING.economy.crystalWaves;

export const BOSS_BY_DECADE: readonly EnemyId[] = ['kinggloop', 'bigclank', 'mamapuff', 'grumbleking'];

/** Time (s) the last spawn of a wave happens after the wave starts. */
export function waveSpawnDuration(w: WaveDef): number {
  let end = 0;
  for (const g of w.groups) end = Math.max(end, g.delay + g.gap * Math.max(0, g.count - 1));
  return end;
}

function elementPicker(rng: Rng, favored: readonly ElementId[], chance: number): () => ElementId | null {
  return () => {
    if (!rng.chance(chance)) return null;
    if (favored.length && rng.chance(TUNING.waves.favoredChance)) return rng.pick(favored);
    return rng.pick(ELEMENT_ORDER);
  };
}

/**
 * Generate one wave. Every map gets its own seeded variety, but the overall
 * shape repeats in cycles of 10 so kids learn the rhythm (boss every 10th).
 */
export function generateWave(w: number, map: Pick<MapDef, 'id' | 'favoredElements'> & { world?: number }): WaveDef {
  const rng = new Rng(hashString(map.id) ^ Math.imul(w, 0x9e3779b1));
  const slot = ((w - 1) % 10) + 1;
  const cycle = Math.floor((w - 1) / 10);
  const favored = map.favoredElements ?? [];
  const W = TUNING.waves;
  const elemChance = Math.min(W.elementChance.max, W.elementChance.base + cycle * W.elementChance.perCycle);
  const pickEl = elementPicker(rng, favored, elemChance);
  const c = W.count.base + Math.floor(w * W.count.perWave);
  const gap = Math.max(W.gap.min, W.gap.base - w * W.gap.perWave);
  const groups: SpawnGroup[] = [];
  const els = (n: number, f: () => ElementId | null = pickEl): (ElementId | null)[] =>
    Array.from({ length: n }, () => f());
  const add = (enemy: EnemyId, count: number, delay = 0, g = gap, elements?: (ElementId | null)[], shields?: ElementId[]): void => {
    const n = Math.max(1, Math.round(count));
    groups.push({ enemy, count: n, gap: g, delay, elements, shields });
  };
  let boss: EnemyId | null = null;

  switch (slot) {
    case 1:
      add('gloop', c, 0, gap, els(Math.round(c)));
      break;
    case 2:
      add('gloop', c * 0.6, 0, gap, els(Math.round(c * 0.6)));
      add('zoomkin', c * 0.6, 3, gap * 0.8, els(Math.round(c * 0.6)));
      break;
    case 3:
      add('clankbot', c * 0.75, 0, gap * 1.2);
      break;
    case 4:
      add('puffbat', c * 0.8, 0, gap, els(Math.round(c * 0.8)));
      break;
    case 5: {
      const a = favored[0] ?? rng.pick(ELEMENT_ORDER);
      let b = favored[1] ?? rng.pick(ELEMENT_ORDER);
      if (b === a) b = ELEMENT_ORDER[(ELEMENT_ORDER.indexOf(a) + 2) % 6]!;
      add('gloop', c * 0.55, 0, gap, els(Math.round(c * 0.55), () => a));
      add('gloop', c * 0.55, 4, gap, els(Math.round(c * 0.55), () => b));
      break;
    }
    case 6:
      add('splitblob', c * 0.45, 0, gap * 1.5);
      break;
    case 7:
      add('gloop', c * 0.6, 0, gap, els(Math.round(c * 0.6)));
      add('mendy', Math.max(2, c * 0.2), 1.5, gap * 2.5);
      break;
    case 8: {
      const n = Math.round(c * 0.7);
      const shields = rng.shuffle(ELEMENT_ORDER.slice()).slice(0, 2 + Math.min(3, cycle));
      add('bubbleimp', n, 0, gap * 1.1, undefined, shields);
      break;
    }
    case 9:
      add('zoomkin', c * 0.7, 0, gap * 0.7, els(Math.round(c * 0.7)));
      add('puffbat', c * 0.4, 2, gap, els(Math.round(c * 0.4)));
      break;
    case 10:
      boss = BOSS_BY_DECADE[cycle % BOSS_BY_DECADE.length]!;
      add('gloop', c * 0.5, 0, gap, els(Math.round(c * 0.5)));
      add(boss, 1, 4, 1);
      if (cycle >= 2) add('mendy', 2, 6, 2);
      break;
  }

  // New mechanics arrive world by world (worlds 5+ and endless past wave 40 get all of them).
  const world = map.world ?? 1;
  const allMech = world >= 5 || w > TUNING.waves.length;
  if (world > 0) {
    for (const rule of TUNING.waves.mechanics) {
      if ((allMech || world >= rule.world) && w >= rule.wave && rule.slots.includes(slot)) {
        add(rule.enemy, Math.max(rule.min ?? 1, c * rule.share), 2.5, gap * 1.25);
      }
    }
    const R = TUNING.waves.resist;
    if ((allMech || world >= R.world) && w >= R.wave) {
      for (const g of groups) {
        if ((g.enemy === 'gloop' || g.enemy === 'zoomkin') && rng.chance(R.chance)) {
          const own = g.elements?.find((e) => e) ?? null;
          // resist an element that is neutral against the group's own element
          const options = ELEMENT_ORDER.filter((e) => !own || (e !== own && ELEMENTS[e].beats !== own && ELEMENTS[own].beats !== e));
          g.resist = rng.pick(options);
        }
      }
    }
  }

  // Later cycles mix in extra groups so waves never feel the same.
  const extras: EnemyId[] = ['gloop', 'zoomkin', 'clankbot', 'puffbat', 'splitblob', 'bubbleimp', 'mendy'];
  for (let i = 0; i < Math.min(cycle, 3); i++) {
    if (slot === 10 && i > 0) break;
    const enemy = rng.pick(extras);
    const n = Math.max(2, c * 0.28);
    const elements = enemy === 'gloop' || enemy === 'zoomkin' || enemy === 'puffbat' ? els(Math.round(n)) : undefined;
    const shields = enemy === 'bubbleimp' ? [rng.pick(ELEMENT_ORDER)] : undefined;
    add(enemy, n, 5 + i * 3, gap * 1.1, elements, shields);
  }

  return { n: w, groups, hp: hpScale(w), coins: coinScale(w), boss };
}

export function buildWaves(map: MapDef): WaveDef[] {
  const count = map.waves ?? TUNING.waves.length;
  const out: WaveDef[] = [];
  for (let w = 1; w <= count; w++) out.push(generateWave(w, map));
  return out;
}

/** Enemy ids that appear in a wave (for the next-wave preview icons). */
export function wavePreview(w: WaveDef): { enemy: EnemyId; count: number; element: ElementId | null }[] {
  const out: { enemy: EnemyId; count: number; element: ElementId | null }[] = [];
  for (const g of w.groups) {
    const el = g.elements?.find((e) => e) ?? g.shields?.[0] ?? null;
    const existing = out.find((o) => o.enemy === g.enemy);
    if (existing) existing.count += g.count;
    else out.push({ enemy: g.enemy, count: g.count, element: el ?? null });
  }
  return out;
}

export interface WaveIntelRow {
  enemy: EnemyId;
  count: number;
  /** Distinct element affinities in this group (empty = plain). */
  elements: ElementId[];
  /** Ward elements (warded sentinels). */
  shields: ElementId[];
  /** Resisted elements. */
  resists: ElementId[];
}

/** Per-type breakdown of a wave for the wave-intel panel (bosses' children not included). */
export function waveIntel(w: WaveDef): WaveIntelRow[] {
  const out: WaveIntelRow[] = [];
  for (const g of w.groups) {
    let row = out.find((r) => r.enemy === g.enemy);
    if (!row) out.push((row = { enemy: g.enemy, count: 0, elements: [], shields: [], resists: [] }));
    row.count += g.count;
    for (const e of g.elements ?? []) if (e && !row.elements.includes(e)) row.elements.push(e);
    for (const e of g.shields ?? []) if (!row.shields.includes(e)) row.shields.push(e);
    if (g.resist && !row.resists.includes(g.resist)) row.resists.push(g.resist);
  }
  return out;
}
