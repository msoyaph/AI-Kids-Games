import type { TowerDef, TowerStats } from './towers';

/**
 * Sustained single-target damage per second, as shown in the UI. Includes
 * multishot, average crit, burn and fully stacked poison; chain/splash extra
 * targets are shown separately.
 */
export function towerDps(def: TowerDef, st: TowerStats): number {
  const crit = 1 + (st.critChance ?? 0) * ((st.critMult ?? 2) - 1);
  let direct: number;
  switch (def.behavior) {
    case 'beam':
      // average over the ramp-up window
      direct = st.damage * (1 + ((st.beamRamp ?? 2) - 1) * 0.6);
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

const f1 = (n: number): string => (Math.round(n * 10) / 10).toString();
/** Damage-like magnitudes: whole numbers from 10 up, one decimal below. */
const fm = (n: number): string => (n >= 10 ? Math.round(n).toString() : f1(n));
const pct = (n: number): string => `${Math.round(n * 100)}%`;

/** The rows shown in the tower panel / codex for one level. */
export function statLines(def: TowerDef, st: TowerStats): StatLine[] {
  const out: StatLine[] = [];
  const add = (key: string, label: string, value: number, text: string, better: 'higher' | 'lower' = 'higher'): void => {
    out.push({ key, label, value, text, better });
  };
  if (def.behavior === 'beam') add('damage', 'Beam damage', st.damage, `${fm(st.damage)}/s`);
  else add('damage', 'Damage', st.damage, fm(st.damage));
  if (def.behavior !== 'beam') add('rate', 'Attack speed', st.rate, `${f1(st.rate)}/s`);
  add('range', 'Range', st.range, f1(st.range));
  const dps = towerDps(def, st);
  add('dps', 'DPS', dps, Math.round(dps).toString());
  if (st.shots && st.shots > 1) add('shots', 'Targets', st.shots, `×${st.shots}`);
  if (st.chain) add('chain', 'Chain jumps', st.chain, `${st.chain}`);
  if (st.splash) add('splash', 'Splash radius', st.splash, f1(st.splash));
  if (st.slow) add('slow', 'Slow', st.slow, `${pct(st.slow)} · ${f1(st.slowTime ?? 1.5)}s`);
  if (st.burnDps) add('burn', 'Burn', st.burnDps, `${fm(st.burnDps)}/s`);
  if (st.poisonDps) add('poison', 'Poison', st.poisonDps, `${fm(st.poisonDps)}/s ×${st.poisonStacks ?? 1}`);
  if (st.armorBreak) add('armor', 'Armor break', st.armorBreak, `−${pct(st.armorBreak)}`);
  if (st.stunChance) add('stun', 'Stun', st.stunChance, `${pct(st.stunChance)} · ${f1(st.stunTime ?? 0.6)}s`);
  if (st.critChance) add('crit', 'Critical hit', st.critChance, `${pct(st.critChance)} ×${f1(st.critMult ?? 2)}`);
  if (st.pushback) add('push', 'Push back', st.pushback, `${f1(st.pushback)} tiles`);
  if (st.zoneDps) add('zone', 'Field damage', st.zoneDps, `${fm(st.zoneDps)}/s`);
  if (st.zoneSlow) add('zoneSlow', 'Field slow', st.zoneSlow, pct(st.zoneSlow));
  if (st.auraRate) add('aura', 'Ally attack speed', st.auraRate, `+${pct(st.auraRate)}`);
  if (st.auraCoins) add('gold', 'Bonus gold', st.auraCoins, `+${pct(st.auraCoins)}`);
  if (st.beamRamp) add('ramp', 'Max ramp', st.beamRamp, `×${f1(st.beamRamp)}`);
  return out;
}
