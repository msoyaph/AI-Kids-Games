import { PASSIVE_SLOTS, WEAPON_SLOTS } from '../config/balance';
import { EVOLUTIONS, PASSIVES, PASSIVE_INDEX, passiveDef } from '../config/passives';
import { WEAPONS, weaponDef, weaponMaxLevel } from '../config/weapons';
import { Ev } from '../core/events';
import { healPlayer } from './combat';
import { recomputePlayerStats } from './stats';
import { addWeapon, evolveWeapon, isMaxed, levelUpWeapon, refreshWeapon } from './weapons';
import type { ChoiceKind, UpgradeChoice, WeaponInstance, World } from './world';

interface Candidate {
  kind: ChoiceKind;
  id: string;
  level: number;
  weight: number;
}

/** Evolutions currently available: maxed weapon + owned catalyst passive. */
export function eligibleEvolutions(w: World): Array<{ wi: WeaponInstance; into: string }> {
  const out: Array<{ wi: WeaponInstance; into: string }> = [];
  for (const wi of w.weapons) {
    if (wi.def.evolved || !isMaxed(wi)) continue;
    const evo = EVOLUTIONS.find((e) => e.weapon === wi.def.id);
    if (!evo) continue;
    if (w.passives.some((p) => p.def.id === evo.passive)) out.push({ wi, into: evo.into });
  }
  return out;
}

/** Every upgrade that could currently be offered, with weights. */
export function upgradeCandidates(w: World): Candidate[] {
  const c: Candidate[] = [];
  for (const wi of w.weapons) {
    if (!wi.def.evolved && wi.level < weaponMaxLevel(wi.def)) c.push({ kind: 'weaponLevel', id: wi.def.id, level: wi.level + 1, weight: wi.def.weight * 1.25 });
  }
  if (w.weapons.length < WEAPON_SLOTS) {
    const owned = new Set(w.weapons.map((x) => x.def.id));
    // evolved forms also block their base weapon from re-appearing
    for (const evo of EVOLUTIONS) if (owned.has(evo.into)) owned.add(evo.weapon);
    for (const def of WEAPONS) {
      if (def.evolved || owned.has(def.id)) continue;
      if (def.unlock && !w.unlockedWeapons.has(def.id)) continue;
      c.push({ kind: 'newWeapon', id: def.id, level: 1, weight: def.weight * (w.weapons.length < 3 ? 1 : 0.6) });
    }
  }
  for (const pi of w.passives) {
    if (pi.level < pi.def.maxLevel) c.push({ kind: 'passiveLevel', id: pi.def.id, level: pi.level + 1, weight: pi.def.weight });
  }
  if (w.passives.length < PASSIVE_SLOTS) {
    const owned = new Set(w.passives.map((x) => x.def.id));
    for (const def of PASSIVES) {
      if (owned.has(def.id)) continue;
      c.push({ kind: 'newPassive', id: def.id, level: 1, weight: def.weight * 0.85 });
    }
  }
  return c;
}

/**
 * Roll the level-up offer. Evolutions (if any) always lead; the rest are weighted picks
 * without replacement. Luck can add a fourth card. Falls back to heal / gold when the
 * build is complete.
 */
export function rollChoices(w: World, forceCount?: number): UpgradeChoice[] {
  const luck = w.player.stats.luck;
  const count = forceCount ?? (w.rng.next() < Math.min(0.6, luck * 0.5) ? 4 : 3);
  const out: UpgradeChoice[] = [];
  for (const evo of eligibleEvolutions(w)) {
    if (out.length < count) out.push({ kind: 'evolve', id: evo.wi.def.id, level: 1 });
  }
  const pool = upgradeCandidates(w);
  const weights = pool.map((c) => c.weight);
  while (out.length < count) {
    const k = w.rng.weightedIndex(weights);
    if (k < 0) break;
    weights[k] = 0;
    out.push({ kind: pool[k].kind, id: pool[k].id, level: pool[k].level });
  }
  if (out.length < count) out.push({ kind: 'heal', id: 'heal', level: 0 });
  if (out.length < count) out.push({ kind: 'gold', id: 'gold', level: 0 });
  return out;
}

export function applyChoice(w: World, c: UpgradeChoice): void {
  switch (c.kind) {
    case 'newWeapon':
      addWeapon(w, c.id);
      break;
    case 'weaponLevel': {
      const wi = w.weapons.find((x) => x.def.id === c.id);
      if (wi) levelUpWeapon(w, wi);
      break;
    }
    case 'newPassive':
      if (w.passives.length < PASSIVE_SLOTS && !w.passives.some((p) => p.def.id === c.id)) {
        w.passives.push({ def: passiveDef(c.id), index: PASSIVE_INDEX[c.id], level: 1 });
        afterPassiveChange(w);
      }
      break;
    case 'passiveLevel': {
      const pi = w.passives.find((p) => p.def.id === c.id);
      if (pi && pi.level < pi.def.maxLevel) {
        pi.level++;
        afterPassiveChange(w);
      }
      break;
    }
    case 'evolve': {
      const evo = eligibleEvolutions(w).find((e) => e.wi.def.id === c.id);
      if (evo) {
        evolveWeapon(w, evo.wi, evo.into);
        w.stats.evolutions++;
        w.events.push(Ev.Evolve, 0, 0, 0, 0, 0, 0, evo.wi.index);
      }
      break;
    }
    case 'heal':
      healPlayer(w, w.player.stats.maxHp * 0.3);
      break;
    case 'gold':
      w.stats.coins += 25;
      break;
  }
}

function afterPassiveChange(w: World): void {
  recomputePlayerStats(w);
  for (const wi of w.weapons) if (wi.def.behavior === 'orbit') refreshWeapon(w, wi);
}

/** Level-up flow: roll offer for the next pending level. */
export function beginLevelUp(w: World): void {
  w.choices = rollChoices(w);
}

/** Player picked (or skipped with null). Returns true if more level-ups are queued. */
export const choiceKey = (c: UpgradeChoice): string => `${c.kind}:${c.id}`;

export function resolveLevelUp(w: World, choice: UpgradeChoice | null): boolean {
  w.stats.picks.push({ t: w.time, level: w.player.level - w.pendingLevels + 1, offered: w.choices.map(choiceKey), picked: choice ? choiceKey(choice) : null });
  if (choice) applyChoice(w, choice);
  w.pendingLevels = Math.max(0, w.pendingLevels - 1);
  if (w.pendingLevels > 0) {
    beginLevelUp(w);
    return true;
  }
  w.choices = [];
  if (w.state === 'levelup') w.state = 'playing';
  return false;
}

export function reroll(w: World): boolean {
  if (w.player.rerolls <= 0) return false;
  w.player.rerolls--;
  w.choices = rollChoices(w, w.choices.length);
  return true;
}

/**
 * Open a chest: evolutions first, then levels for owned items. 1, 3 or (rarely) 5 rewards,
 * with luck improving the odds. Rewards are applied immediately and kept for display.
 */
export function openChest(w: World): UpgradeChoice[] {
  const luck = 1 + w.player.stats.luck;
  const r = w.rng.next();
  const count = r < 0.06 * luck ? 5 : r < 0.3 * luck ? 3 : 1;
  const rewards: UpgradeChoice[] = [];
  for (let k = 0; k < count; k++) {
    const evo = eligibleEvolutions(w)[0];
    if (evo) {
      const c: UpgradeChoice = { kind: 'evolve', id: evo.wi.def.id, level: 1 };
      applyChoice(w, c);
      rewards.push({ ...c, id: evo.into });
      continue;
    }
    const pool = upgradeCandidates(w).filter((c) => c.kind === 'weaponLevel' || c.kind === 'passiveLevel');
    if (pool.length === 0) {
      const c: UpgradeChoice = { kind: 'gold', id: 'gold', level: 0 };
      applyChoice(w, c);
      rewards.push(c);
      continue;
    }
    const k2 = w.rng.weightedIndex(pool.map((c) => c.weight));
    const pick = pool[k2];
    const c: UpgradeChoice = { kind: pick.kind, id: pick.id, level: pick.level };
    applyChoice(w, c);
    rewards.push(c);
  }
  w.stats.chests.push({ t: w.time, rewards: rewards.map(choiceKey) });
  return rewards;
}

export function choiceName(c: UpgradeChoice): string {
  switch (c.kind) {
    case 'newWeapon':
    case 'weaponLevel':
    case 'evolve':
      return weaponDef(c.id).name;
    case 'newPassive':
    case 'passiveLevel':
      return passiveDef(c.id).name;
    case 'heal':
      return 'Warm Supper';
    case 'gold':
      return 'Coin Pouch';
  }
}
