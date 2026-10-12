import type { SaveData } from './save';
import { HERO_IDS, HEROES, type AbilityId, type HeroId } from '../data/heroes';

/** Research node ids that unlock heroes and abilities (bought in the Research screen). */
export const HERO_RESEARCH: Record<HeroId, string | null> = { vanguard: null, warden: 'hero.warden', seer: 'hero.seer', engineer: 'hero.engineer' };
export const ABILITY_RESEARCH: Record<AbilityId, string | null> = { meteor: null, chrono: 'ability.chrono', funds: 'ability.funds' };

export function heroUnlocked(save: SaveData, id: HeroId): boolean {
  const node = HERO_RESEARCH[id];
  return HEROES[id].starter === true || (!!node && (save.research[node] ?? 0) > 0);
}

export function unlockedHeroes(save: SaveData): HeroId[] {
  return HERO_IDS.filter((id) => heroUnlocked(save, id));
}

/** The commander taken into battle: the saved pick if it's unlocked, else the starter. */
export function chosenHero(save: SaveData): HeroId {
  const id = save.hero as HeroId;
  return HERO_IDS.includes(id) && heroUnlocked(save, id) ? id : 'vanguard';
}

/**
 * Commander abilities: Crystal Meteor comes with the first secured sector,
 * the others are researched.
 */
export function unlockedAbilities(save: SaveData): AbilityId[] {
  const out: AbilityId[] = [];
  if (Object.keys(save.maps).some((id) => Object.values(save.maps[id]?.stars ?? {}).some((n) => (n ?? 0) > 0))) out.push('meteor');
  for (const id of ['chrono', 'funds'] as AbilityId[]) {
    const node = ABILITY_RESEARCH[id];
    if (node && (save.research[node] ?? 0) > 0) out.push(id);
  }
  return out;
}
