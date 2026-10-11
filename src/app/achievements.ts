import { ACHIEVEMENTS, type AchievementCtx, type AchievementDef } from '../data/achievements';
import type { Game, GameMode } from '../sim/Game';
import type { SaveStore } from './save';

/**
 * Checks achievements live (throttled) during play and at the end of a run.
 * Unlocks are stored in the save with a timestamp.
 */
export class AchievementTracker {
  private liveTimer = 0;
  onUnlock: (def: AchievementDef) => void = () => {};

  constructor(private readonly save: SaveStore) {}

  isUnlocked(id: string): boolean {
    return !!this.save.data.achievements[id];
  }

  get unlockedCount(): number {
    return ACHIEVEMENTS.filter((a) => this.isUnlocked(a.id)).length;
  }

  private ctx(game: Game | null, mode: GameMode | null, won: boolean, ended: boolean): AchievementCtx {
    return { game, mode, won, ended, save: this.save.data, totalStars: this.save.totalStars() };
  }

  private unlock(def: AchievementDef): void {
    this.save.data.achievements[def.id] = Date.now();
    this.onUnlock(def);
  }

  /** Called every frame while playing; checks live badges about twice a second. */
  tick(dt: number, game: Game, mode: GameMode): void {
    this.liveTimer -= dt;
    if (this.liveTimer > 0) return;
    this.liveTimer = 0.5;
    const c = this.ctx(game, mode, false, false);
    let changed = false;
    for (const a of ACHIEVEMENTS) {
      if (!a.live || this.isUnlocked(a.id)) continue;
      if (a.check(c)) {
        this.unlock(a);
        changed = true;
      }
    }
    if (changed) this.save.save();
  }

  /** End of run (after progress was recorded). Returns names of new badges. */
  checkEnd(game: Game | null, won: boolean, mode: GameMode | null): string[] {
    const c = this.ctx(game, mode, won, true);
    const names: string[] = [];
    for (const a of ACHIEVEMENTS) {
      if (this.isUnlocked(a.id)) continue;
      if (a.check(c)) {
        this.unlock(a);
        names.push(a.name);
      }
    }
    if (names.length) this.save.flush();
    return names;
  }
}
