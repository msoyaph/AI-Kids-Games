import type { CupId, KartConfig, SpeedClass, UnlockRef } from '../data/types';
import { CUPS } from '../data/cups';
import type { ClassKey, Medal, SaveData } from '../save/save';
import { medalRank } from '../sim/rules';
import type { KartRaceStats } from '../sim/kart';

export function trophyKey(cup: CupId, speedClass: SpeedClass, mirror: boolean): string {
  return `${cup}:${mirror ? 'mirror' : speedClass}`;
}

export function hasUnlock(save: SaveData, ref: UnlockRef): boolean {
  switch (ref.kind) {
    case 'racer':
      return save.unlocks.racers.includes(ref.id);
    case 'body':
      return save.unlocks.bodies.includes(ref.id);
    case 'wheels':
      return save.unlocks.wheels.includes(ref.id);
    case 'glider':
      return save.unlocks.gliders.includes(ref.id);
    case 'paint':
      return save.unlocks.paints.includes(ref.id);
    case 'decal':
      return save.unlocks.decals.includes(ref.id);
    case 'arena':
      return save.unlocks.arenas.includes(ref.id);
    case 'cup':
      return save.unlocks.cups.includes(ref.id);
    case 'class':
      return save.unlocks.classes.includes(ref.id);
  }
}

/** Add an unlock; returns true when it was new (and queues a celebration). */
export function unlock(save: SaveData, ref: UnlockRef): boolean {
  if (hasUnlock(save, ref)) return false;
  switch (ref.kind) {
    case 'racer':
      save.unlocks.racers.push(ref.id);
      break;
    case 'body':
      save.unlocks.bodies.push(ref.id);
      break;
    case 'wheels':
      save.unlocks.wheels.push(ref.id);
      break;
    case 'glider':
      save.unlocks.gliders.push(ref.id);
      break;
    case 'paint':
      save.unlocks.paints.push(ref.id);
      break;
    case 'decal':
      save.unlocks.decals.push(ref.id);
      break;
    case 'arena':
      save.unlocks.arenas.push(ref.id);
      break;
    case 'cup':
      save.unlocks.cups.push(ref.id);
      break;
    case 'class':
      save.unlocks.classes.push(ref.id);
      break;
  }
  save.newUnlocks.push(ref);
  return true;
}

/** Record a cup trophy if it beats the previous best. Returns true when improved. */
export function awardTrophy(save: SaveData, cup: CupId, speedClass: SpeedClass, mirror: boolean, medal: Medal | null): boolean {
  if (!medal) return false;
  const key = trophyKey(cup, speedClass, mirror);
  if (medalRank(medal) > medalRank(save.trophies[key])) {
    save.trophies[key] = medal;
    return true;
  }
  return false;
}

export function allGold(save: SaveData, cls: ClassKey): boolean {
  return CUPS.every((c) => save.trophies[`${c.id}:${cls}`] === 'gold');
}

export function anyTrophy(save: SaveData, cup: CupId): boolean {
  return Object.keys(save.trophies).some((k) => k.startsWith(`${cup}:`));
}

/**
 * Progression unlocks driven by trophies:
 *  - Galaxy Cup: a trophy in both Sunrise and Thunder (any class)
 *  - Legend Cup: a trophy in Galaxy
 *  - Champion class: gold in every cup on Pro
 *  - Mirror mode: gold in every cup on Champion
 */
export function checkProgressUnlocks(save: SaveData): UnlockRef[] {
  const out: UnlockRef[] = [];
  const add = (ref: UnlockRef): void => {
    if (unlock(save, ref)) out.push(ref);
  };
  if (anyTrophy(save, 'sunrise') && anyTrophy(save, 'thunder')) add({ kind: 'cup', id: 'galaxy' });
  if (anyTrophy(save, 'galaxy')) add({ kind: 'cup', id: 'legend' });
  if (allGold(save, 'pro')) add({ kind: 'class', id: 'champion' });
  if (allGold(save, 'champion')) add({ kind: 'class', id: 'mirror' });
  return out;
}

/** Track records (Time Trial). Returns which records improved. */
export function updateRecord(save: SaveData, trackId: string, total: number, bestLap: number, racer: string, kart: KartConfig): { best: boolean; lap: boolean } {
  const r = save.records[trackId];
  const best = !r || total < r.bestTime;
  const lap = !r || bestLap < r.bestLap;
  if (best || lap) {
    save.records[trackId] = {
      bestTime: best ? total : r!.bestTime,
      bestLap: lap ? bestLap : r!.bestLap,
      racer: best ? racer : r!.racer,
      kart: best ? { ...kart } : r!.kart,
      hasGhost: (r?.hasGhost ?? false) || best,
      beatStaff: r?.beatStaff ?? false,
    };
  }
  return { best, lap };
}

/** Fold one race's stats into the save's lifetime stats. */
export function addStats(save: SaveData, s: KartRaceStats, opts: { won: boolean; podium: boolean; battle: boolean; timeTrial: boolean }): void {
  const st = save.stats;
  if (opts.timeTrial) st.timeTrials++;
  else if (!opts.battle) {
    st.races++;
    if (opts.won) st.wins++;
    if (opts.podium) st.podiums++;
  }
  if (opts.battle && opts.won) st.battleWins++;
  st.battlePops += s.balloonsPopped;
  st.itemHits += s.itemHits;
  st.tricks += s.tricks;
  st.driftSeconds += s.driftTotal;
  st.miniTurbos += s.miniTurbos[0] + s.miniTurbos[1] + s.miniTurbos[2];
  st.shortcuts += s.shortcuts;
  st.boostPads += s.boostPads;
  st.dodges += s.dodges;
  if (s.perfectStart) st.perfectStarts++;
}
