import type { EvolutionDef, PassiveDef } from './types';

export const PASSIVES: PassiveDef[] = [
  { id: 'whetstone', name: 'Whetstone', description: '+10% damage per level.', maxLevel: 5, perLevel: { might: 0.1 }, color: 0xc7ccd6, weight: 100 },
  { id: 'quickspring', name: 'Quickspring', description: '-7% weapon cooldowns per level.', maxLevel: 5, perLevel: { cooldown: 0.07 }, color: 0x7fe0c0, weight: 100 },
  { id: 'bigHat', name: 'Brimmed Hat', description: '+10% weapon area per level.', maxLevel: 5, perLevel: { area: 0.1 }, color: 0xb07cff, weight: 100 },
  { id: 'echoShell', name: 'Echo Shell', description: '+1 projectile / orb / bolt per level.', maxLevel: 2, perLevel: { amount: 1 }, color: 0xffb3c7, weight: 70 },
  { id: 'swiftBoots', name: 'Puddle Boots', description: '+8% move speed per level.', maxLevel: 5, perLevel: { moveSpeed: 0.08 }, color: 0x5fb0ff, weight: 100 },
  { id: 'heartyStew', name: 'Hearty Stew', description: '+20 max HP per level (and heals 20).', maxLevel: 5, perLevel: { maxHp: 20 }, color: 0xff7a6b, weight: 100 },
  { id: 'mossyCharm', name: 'Mossy Charm', description: '+0.25 HP regenerated per second per level.', maxLevel: 5, perLevel: { regen: 0.25 }, color: 0x7ccf5a, weight: 90 },
  { id: 'lodestone', name: 'Lodestone', description: '+1.3 pickup reach per level.', maxLevel: 5, perLevel: { magnet: 1.3 }, color: 0xff5f5f, weight: 90 },
  { id: 'cloverButton', name: 'Clover Button', description: '+10% luck and +2% crit chance per level.', maxLevel: 5, perLevel: { luck: 0.1, crit: 0.02 }, color: 0x4fd36b, weight: 90 },
  { id: 'kettleLid', name: 'Kettle Lid', description: '-1 damage taken from every hit per level.', maxLevel: 5, perLevel: { armor: 1 }, color: 0x9aa3ad, weight: 90 },
  { id: 'hourglassSand', name: 'Hourglass Sand', description: '+10% effect duration per level.', maxLevel: 5, perLevel: { duration: 0.1 }, color: 0xf2c46b, weight: 90 },
  { id: 'velocityFeather', name: 'Gale Feather', description: '+12% projectile speed per level.', maxLevel: 5, perLevel: { projSpeed: 0.12 }, color: 0xdff6ff, weight: 80 },
  { id: 'scholarsBookmark', name: "Scholar's Bookmark", description: '+8% experience gained per level.', maxLevel: 5, perLevel: { growth: 0.08 }, color: 0xe8a75a, weight: 80 },
];

export const PASSIVE_INDEX: Record<string, number> = {};
PASSIVES.forEach((p, i) => (PASSIVE_INDEX[p.id] = i));

export function passiveDef(id: string): PassiveDef {
  const i = PASSIVE_INDEX[id];
  if (i === undefined) throw new Error(`Unknown passive ${id}`);
  return PASSIVES[i];
}

/** Max-level weapon + owned passive → evolved weapon. */
export const EVOLUTIONS: EvolutionDef[] = [
  { weapon: 'bonkRing', passive: 'kettleLid', into: 'quakeCrown' },
  { weapon: 'thistleDarts', passive: 'echoShell', into: 'thornstorm' },
  { weapon: 'lanterns', passive: 'hourglassSand', into: 'everglow' },
  { weapon: 'drumBurst', passive: 'bigHat', into: 'skyDrum' },
  { weapon: 'zapJar', passive: 'quickspring', into: 'stormBottle' },
  { weapon: 'wobbleDisc', passive: 'velocityFeather', into: 'cometDisc' },
  { weapon: 'emberSeeds', passive: 'whetstone', into: 'wildfire' },
  { weapon: 'wispBees', passive: 'cloverButton', into: 'queenSwarm' },
  { weapon: 'frostFan', passive: 'mossyCharm', into: 'glacierBloom' },
];

export function evolutionFor(weaponId: string): EvolutionDef | undefined {
  return EVOLUTIONS.find((e) => e.weapon === weaponId);
}
