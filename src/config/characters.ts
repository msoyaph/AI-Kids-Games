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
    passive: { id: 'landingBonk', name: 'Landing Bonk', description: 'Landing from a jump bonks the Gloom around you.' },
  },
  {
    id: 'pip',
    name: 'Pip',
    title: 'the Thistle Scout',
    description: 'A quick hedgehog courier. Fragile, but slides like greased lightning.',
    startWeapon: 'thistleDarts',
    stats: { maxHp: -10, moveSpeed: 0.12, cooldown: 0.05 },
    move: { speed: 1.06, jump: 1.08, slideBoost: 1.4, slideFriction: 0.65 },
    unlock: 'kills1000',
    colors: { primary: 0x8a5a3b, secondary: 0xe9d3a8, accent: 0xe8423f, skin: 0xf6e1c3 },
    passive: { id: 'superSlide', name: 'Greased Lightning', description: 'Bigger slide boosts and slides that hardly slow down.' },
  },
  {
    id: 'brindle',
    name: 'Brindle',
    title: 'the Lantern Sage',
    description: 'An ancient tortoise mystic. Slow, sturdy, and always well lit.',
    startWeapon: 'lanterns',
    stats: { maxHp: 30, armor: 1, regen: 0.2, moveSpeed: -0.08, area: 0.1 },
    move: { speed: 0.95, jump: 0.92, slideBoost: 0.9, slideFriction: 1.25 },
    unlock: 'survive10',
    colors: { primary: 0x4f8f4a, secondary: 0xc9b27c, accent: 0xffd34d, skin: 0x9bc27a },
    passive: { id: 'shellGuard', name: 'Shell Guard', description: 'Below 30% health, takes 40% less damage.' },
  },
  {
    id: 'ottie',
    name: 'Ottie',
    title: 'the River Otter',
    description: 'A playful river otter who never walks when sliding will do.',
    startWeapon: 'wobbleDisc',
    stats: { moveSpeed: 0.06, maxHp: -5 },
    move: { speed: 1.03, jump: 1, slideBoost: 1.15, slideFriction: 0.7 },
    unlock: 'slide3k',
    colors: { primary: 0x8a5a36, secondary: 0xe8d2b0, accent: 0x4fc3d9, skin: 0xb07a4e },
    passive: { id: 'slipstream', name: 'Slipstream', description: 'Longer slides, and sliding fast bowls the Gloom over (they can’t touch you).' },
  },
  {
    id: 'bramble',
    name: 'Bramble',
    title: 'the Beetle Knight',
    description: 'A stout beetle in polished armour. Prickly to the touch.',
    startWeapon: 'emberSeeds',
    stats: { maxHp: 20, armor: 1, moveSpeed: -0.05 },
    move: { speed: 0.97, jump: 0.95, slideBoost: 0.95, slideFriction: 1.1 },
    unlock: 'clockjawNormal',
    colors: { primary: 0x2f6b4f, secondary: 0xb88a3c, accent: 0xff7a3d, skin: 0x3a3550 },
    passive: { id: 'thornshell', name: 'Thornshell', description: 'Gloom that hurt you by touch take heavy thorns damage.' },
  },
  {
    id: 'nova',
    name: 'Nova',
    title: 'the Owl Stargazer',
    description: 'A wise young owl who reads the stars — and every option.',
    startWeapon: 'zapJar',
    stats: { growth: 0.1, luck: 0.1, maxHp: -10 },
    move: { speed: 1, jump: 1.12, slideBoost: 1, slideFriction: 1 },
    unlock: 'level40',
    colors: { primary: 0x34407e, secondary: 0xe6dcc0, accent: 0xffd34d, skin: 0xa88a6a },
    passive: { id: 'wiseEyes', name: 'Wise Eyes', description: 'Four cards to choose from at every level-up.' },
  },
];

export function characterDef(id: string): CharacterDef {
  const c = CHARACTERS.find((x) => x.id === id);
  if (!c) throw new Error(`Unknown character ${id}`);
  return c;
}
