/** When each theme unlocks (pure, unit-tested). Everything is earned by playing; nothing is bought. */
import { totalStars, worldDone } from '../sim/adventure';
import type { Profile } from '../save/profile';
import { THEMES, type ThemeId } from './themes';

export function earned(id: ThemeId, p: Pick<Profile, 'best' | 'adv' | 'stats'>): boolean {
  switch (id) {
    case 'classic': return true;
    case 'wood': return Math.max(p.best.easy, p.best.normal) >= 1000;
    case 'candy': return totalStars(p.adv) >= 10;
    case 'ocean': return p.stats.lines >= 100;
    case 'space': return worldDone(p.adv, 1);
    case 'night': return p.stats.dailies >= 3;
  }
}

/** Adds every newly earned theme to the profile; returns the new ones (for the "unlocked" cheer). */
export function unlockThemes(p: Profile): ThemeId[] {
  const fresh = THEMES.map(t => t.id).filter(id => !p.themes.includes(id) && earned(id, p));
  p.themes.push(...fresh);
  return fresh;
}

/** Progress toward a locked theme, for its card ("62 of 100 lines"). */
export function progressText(id: ThemeId, p: Pick<Profile, 'best' | 'adv' | 'stats'>): string {
  switch (id) {
    case 'classic': return '';
    case 'wood': return `Best so far: ${Math.max(p.best.easy, p.best.normal)}`;
    case 'candy': return `${Math.min(10, totalStars(p.adv))} of 10 stars`;
    case 'ocean': return `${Math.min(100, p.stats.lines)} of 100 lines`;
    case 'space': return `${[...p.adv.slice(15, 30)].filter(c => c !== '0').length} of 15 Ocean levels`;
    case 'night': return `${Math.min(3, p.stats.dailies)} of 3 Daily puzzles`;
  }
}
