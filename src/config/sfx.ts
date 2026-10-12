/** Sound effect ids shared by sim (emits) and audio (synthesizes). */
export const SFX_NAMES = [
  'thump',
  'dart',
  'lantern',
  'drum',
  'zap',
  'disc',
  'seed',
  'bee',
  'frost',
  'explode',
  'shrine',
  'enemyShoot',
  'slam',
  'roar',
  'spores',
  // upgrade (append only: ids are indices)
  'icicle',
  'gust',
  'shatter',
  'bonk',
] as const;

export type SfxName = (typeof SFX_NAMES)[number];

const INDEX: Record<string, number> = {};
SFX_NAMES.forEach((n, i) => (INDEX[n] = i));

export function sfxId(name: string): number {
  return INDEX[name] ?? 0;
}
