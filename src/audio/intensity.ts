/** What the adaptive music listens to (a snapshot of the match). */
export interface IntensityInput {
  wave: number;
  /** Infinity in endless. */
  totalWaves: number;
  enemies: number;
  lives: number;
  maxLives: number;
  bossAlive: boolean;
}

/**
 * Music intensity 0..1: the run's progress sets a floor, a crowded board and
 * low lives push it up, and the final wave always plays every layer.
 * (Music layers: calm < 0.2 < action < 0.55 < intense.)
 */
export function musicIntensity(s: IntensityInput): number {
  const endless = !Number.isFinite(s.totalWaves);
  const progress = endless ? Math.min(1, s.wave / 40) : s.wave / Math.max(1, s.totalWaves);
  let x = 0.12 + progress * 0.33;
  x += Math.min(1, s.enemies / 35) * 0.35;
  if (s.maxLives > 0 && s.lives / s.maxLives <= 0.35) x += 0.15;
  if (s.bossAlive) x += 0.2;
  if (!endless && s.wave >= s.totalWaves && s.enemies > 0) x = Math.max(x, 0.85);
  return Math.max(0, Math.min(1, x));
}
