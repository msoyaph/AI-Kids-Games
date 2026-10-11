import type { CharacterDef } from './types';

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'thea',
    name: 'Thea',
    title: 'the Bonkwright',
    description: 'A cheerful smith who settles every argument with a mallet. Hits a little harder.',
    startWeapon: 'bonkRing',
    stats: { might: 0.1 },
    move: { speed: 1, jump: 1, slideBoost: 1, slideFriction: 1 },
    colors: { primary: 0x2fb8a6, secondary: 0xf4f0e6, accent: 0xff8a3d, skin: 0xf2c6a0 },
  },
  {
    id: 'pip',
    name: 'Pip',
    title: 'the Thistle Scout',
    description: 'A quick hedgehog courier. Fragile, but slides like greased lightning.',
    startWeapon: 'thistleDarts',
    stats: { maxHp: -20, moveSpeed: 0.12, cooldown: 0.05 },
    move: { speed: 1.06, jump: 1.08, slideBoost: 1.4, slideFriction: 0.65 },
    unlock: 'kills1000',
    colors: { primary: 0x8a5a3b, secondary: 0xe9d3a8, accent: 0xe8423f, skin: 0xf6e1c3 },
  },
  {
    id: 'brindle',
    name: 'Brindle',
    title: 'the Lantern Sage',
    description: 'An ancient tortoise mystic. Slow, sturdy, and always well lit.',
    startWeapon: 'lanterns',
    stats: { maxHp: 40, armor: 2, regen: 0.3, moveSpeed: -0.08, area: 0.1 },
    move: { speed: 0.95, jump: 0.92, slideBoost: 0.9, slideFriction: 1.25 },
    unlock: 'survive10',
    colors: { primary: 0x4f8f4a, secondary: 0xc9b27c, accent: 0xffd34d, skin: 0x9bc27a },
  },
];

export function characterDef(id: string): CharacterDef {
  const c = CHARACTERS.find((x) => x.id === id);
  if (!c) throw new Error(`Unknown character ${id}`);
  return c;
}
