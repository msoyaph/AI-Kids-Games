import { formatNumber, t, type MessageKey } from '../i18n';
import type { TowerDef, TowerStats } from './towers';
import { TUNING } from './tuning';

const D = TUNING.combat.defaults;

/**
 * Sustained single-target damage per second, as shown in the UI. Includes
 * multishot, average crit, burn and fully stacked poison; chain/splash extra
 * targets are shown separately.
 */
export function towerDps(def: TowerDef, st: TowerStats): number {
  const crit = 1 + (st.critChance ?? 0) * ((st.critMult ?? D.critMult) - 1);
  let direct: number;
  switch (def.behavior) {
    case 'beam':
      // average over the ramp-up window
      direct = st.damage * (1 + ((st.beamRamp ?? D.beamRamp) - 1) * 0.6);
      break;
    default:
      direct = st.damage * st.rate * crit;
  }
  const dots = (st.burnDps ?? 0) + (st.poisonDps ?? 0) * (st.poisonStacks ?? 1) + (st.zoneDps ?? 0) * 0.5;
  return direct + dots;
}

export interface StatLine {
  key: string;
  label: string;
  value: number;
  /** Formatted for display. */
  text: string;
  /** Higher is better (for colouring deltas). */
  better: 'higher' | 'lower';
}

const f1 = (n: number): string => formatNumber(Math.round(n * 10) / 10);
/** Damage-like magnitudes: whole numbers from 10 up, one decimal below. */
const fm = (n: number): string => (n >= 10 ? formatNumber(Math.round(n)) : f1(n));
const pct = (n: number): string => t('fmt.pct', { n: Math.round(n * 100) });

/** The rows shown in the tower panel / codex for one level. */
export function statLines(def: TowerDef, st: TowerStats): StatLine[] {
  const out: StatLine[] = [];
  const add = (key: string, label: MessageKey, value: number, text: string, better: 'higher' | 'lower' = 'higher'): void => {
    out.push({ key, label: t(label), value, text, better });
  };
  const perSec = (n: string): string => t('fmt.perSec', { n });
  if (def.behavior === 'beam') add('damage', 'stat.beam', st.damage, perSec(fm(st.damage)));
  else add('damage', 'stat.damage', st.damage, fm(st.damage));
  if (def.behavior !== 'beam') add('rate', 'stat.rate', st.rate, perSec(f1(st.rate)));
  add('range', 'stat.range', st.range, f1(st.range));
  const dps = towerDps(def, st);
  add('dps', 'stat.dps', dps, formatNumber(Math.round(dps)));
  if (st.shots && st.shots > 1) add('shots', 'stat.shots', st.shots, t('fmt.times', { n: st.shots }));
  if (st.chain) add('chain', 'stat.chain', st.chain, formatNumber(st.chain));
  if (st.splash) add('splash', 'stat.splash', st.splash, f1(st.splash));
  if (st.slow) add('slow', 'stat.slow', st.slow, t('fmt.pctFor', { pct: pct(st.slow), s: f1(st.slowTime ?? D.slowTime) }));
  if (st.burnDps) add('burn', 'stat.burn', st.burnDps, perSec(fm(st.burnDps)));
  if (st.poisonDps) add('poison', 'stat.poison', st.poisonDps, t('fmt.perSecStacks', { n: fm(st.poisonDps), stacks: st.poisonStacks ?? 1 }));
  if (st.armorBreak) add('armor', 'stat.armor', st.armorBreak, t('fmt.minusPct', { n: Math.round(st.armorBreak * 100) }));
  if (st.stunChance) add('stun', 'stat.stun', st.stunChance, t('fmt.pctFor', { pct: pct(st.stunChance), s: f1(st.stunTime ?? D.stunTime) }));
  if (st.critChance) add('crit', 'stat.crit', st.critChance, t('fmt.pctTimes', { pct: pct(st.critChance), n: f1(st.critMult ?? D.critMult) }));
  if (st.pushback) add('push', 'stat.push', st.pushback, t('fmt.tiles', { n: f1(st.pushback) }));
  if (st.zoneDps) add('zone', 'stat.zone', st.zoneDps, perSec(fm(st.zoneDps)));
  if (st.zoneSlow) add('zoneSlow', 'stat.zoneSlow', st.zoneSlow, pct(st.zoneSlow));
  if (st.auraRate) add('aura', 'stat.aura', st.auraRate, t('fmt.plusPct', { n: Math.round(st.auraRate * 100) }));
  if (st.auraCoins) add('gold', 'stat.gold', st.auraCoins, t('fmt.plusPct', { n: Math.round(st.auraCoins * 100) }));
  if (st.beamRamp) add('ramp', 'stat.ramp', st.beamRamp, t('fmt.times', { n: f1(st.beamRamp) }));
  return out;
}
