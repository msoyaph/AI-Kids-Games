import { localized } from '../i18n';
import { TUNING, type DifficultyTuning } from './tuning';

/** Difficulty ids are stable save keys: `easy` is shown as "Story". */
export type Difficulty = 'easy' | 'normal' | 'hard';

export interface DifficultyDef extends DifficultyTuning {
  id: Difficulty;
  /** Translated. */
  readonly label: string;
  readonly blurb: string;
}

export const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'normal', 'hard'];

export const DIFFICULTIES = {} as Record<Difficulty, DifficultyDef>;
for (const id of DIFFICULTY_ORDER) {
  DIFFICULTIES[id] = localized({ id, ...TUNING.difficulties[id] } as DifficultyDef, `difficulty.${id}`, ['label', 'blurb'] as const);
}

/** Stars earned from the fraction of lives kept. */
export function starsFor(livesLeft: number, maxLives: number): number {
  if (livesLeft <= 0) return 0;
  const f = livesLeft / maxLives;
  if (f >= TUNING.stars.three) return 3;
  if (f >= TUNING.stars.two) return 2;
  return 1;
}

/** Health multiplier for a wave on this difficulty. */
export function difficultyHp(d: DifficultyDef, wave: number): number {
  const t = Math.min(1, Math.max(0, (wave - 1) / TUNING.waves.hpRampWaves));
  return d.hpEarly + (d.hp - d.hpEarly) * t;
}
