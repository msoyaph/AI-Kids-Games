export type Difficulty = 'easy' | 'normal' | 'hard';

export interface DifficultyDef {
  id: Difficulty;
  label: string;
  blurb: string;
  lives: number;
  /** Creature health multiplier (reached by wave 20). */
  hp: number;
  /** Health multiplier on wave 1; ramps toward `hp` so early waves stay fair. */
  hpEarly: number;
  /** Creature speed multiplier. */
  speed: number;
  startCoins: number;
  /** Multiplier on coins from creatures. */
  coins: number;
  /** Multiplier on the wait between waves. */
  breather: number;
  /** Interest paid on saved coins at the end of each wave. */
  interest: number;
}

export const DIFFICULTIES: Record<Difficulty, DifficultyDef> = {
  easy: {
    id: 'easy',
    label: 'Easy',
    blurb: 'Lots of lives and slow, sleepy creatures. Great for learning!',
    lives: 30,
    hp: 0.6,
    hpEarly: 0.6,
    speed: 0.9,
    startCoins: 1.5,
    coins: 1.2,
    breather: 1.5,
    interest: 0.05,
  },
  normal: {
    id: 'normal',
    label: 'Normal',
    blurb: 'A fair fight. Plan your maze!',
    lives: 20,
    hp: 1,
    hpEarly: 1,
    speed: 1,
    startCoins: 1,
    coins: 1,
    breather: 1,
    interest: 0.04,
  },
  hard: {
    id: 'hard',
    label: 'Hard',
    blurb: 'Tough creatures and only 10 lives. For heroes!',
    lives: 10,
    hp: 1.3,
    hpEarly: 1.05,
    speed: 1.0,
    startCoins: 1,
    coins: 0.95,
    breather: 0.85,
    interest: 0.03,
  },
};

export const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'normal', 'hard'];

/** Stars earned from the fraction of lives kept. */
export function starsFor(livesLeft: number, maxLives: number): number {
  if (livesLeft <= 0) return 0;
  const f = livesLeft / maxLives;
  if (f >= 0.8) return 3;
  if (f >= 0.4) return 2;
  return 1;
}

/** Health multiplier for a wave on this difficulty. */
export function difficultyHp(d: DifficultyDef, wave: number): number {
  const t = Math.min(1, Math.max(0, (wave - 1) / 19));
  return d.hpEarly + (d.hp - d.hpEarly) * t;
}
