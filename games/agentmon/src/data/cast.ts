/**
 * The people of Sunreach: how the named characters look, and a seeded look maker for townsfolk.
 * Everyone is friendly; the Spotlight Club are misguided collectors, not villains.
 */
import type { CharLook } from '../art/characters';
import { hash32, Rng } from '../core/rng';

export const CAST: Record<string, { name: string; look: CharLook }> = {
  nell: { name: 'Chief Nell', look: { skin: 3, hair: 4, hairColor: 5, outfit: 0, coat: 0xf2f0ec, glasses: true, elder: true } },
  juno: { name: 'Juno', look: { skin: 1, hair: 5, hairColor: 4, outfit: 1, agent: true } },
  gran: { name: 'Gran', look: { skin: 2, hair: 4, hairColor: 0, outfit: 6, elder: true, apron: 0xfff0d8 } },
  helper: { name: 'Rest Stop Helper', look: { skin: 0, hair: 2, hairColor: 2, outfit: 2, apron: 0xffffff } },
  clerk: { name: 'Shopkeeper', look: { skin: 4, hair: 0, hairColor: 0, outfit: 3, apron: 0x4fa66a } },
  marisol: { name: 'Marisol', look: { skin: 3, hair: 1, hairColor: 0, outfit: 0, hat: 'cap', hatColor: 0xffffff } },
  oren: { name: 'Oren', look: { skin: 5, hair: 0, hairColor: 0, outfit: 2, scarf: 0x9ed97a } },
  vee: { name: 'Vee', look: { skin: 1, hair: 7, hairColor: 7, outfit: 3, hat: 'band', hatColor: 0xf5c830 } },
  sol: { name: 'Sol', look: { skin: 4, hair: 3, hairColor: 0, outfit: 1, hat: 'sunhat', hatColor: 0xffd84a } },
  yuki: { name: 'Yuki', look: { skin: 0, hair: 2, hairColor: 5, outfit: 5, hat: 'beanie', hatColor: 0x8fb8ff, scarf: 0xffffff } },
  celeste: { name: 'Celeste', look: { skin: 2, hair: 6, hairColor: 6, outfit: 4, hat: 'crown' } },
  velour: { name: 'Velour', look: { skin: 1, hair: 7, hairColor: 6, outfit: 4, coat: 0x9a5fb8, scarf: 0xffd2f0 } },
  club: { name: 'Spotlight Club', look: { skin: 3, hair: 0, hairColor: 1, outfit: 4, coat: 0xffd2f0, hat: 'cap', hatColor: 0x9a5fb8 } },
  agent: { name: 'Field Agent', look: { skin: 2, hair: 1, hairColor: 2, outfit: 5, agent: true } },
};

/** A friendly townsperson's look from a seed (stable for each one). */
export function townsLook(seed: string, extra: Partial<CharLook> = {}): CharLook {
  const rng = new Rng(hash32(seed.length, ...[...seed].map(c => c.charCodeAt(0))));
  const look: CharLook = { skin: rng.int(6), hair: rng.int(8), hairColor: rng.int(8), outfit: rng.int(8) };
  const r = rng.next();
  if (r < 0.15) look.hat = 'cap';
  else if (r < 0.25) look.hat = 'sunhat';
  else if (r < 0.32) look.hat = 'beanie';
  if (look.hat) look.hatColor = [0xd9604f, 0x4f7fd9, 0xffd84a, 0x9a5fb8, 0x4fa66a][rng.int(5)]!;
  if (rng.chance(0.15)) look.glasses = true;
  if (rng.chance(0.2)) look.kid = true;
  else if (rng.chance(0.15)) look.elder = true;
  return { ...look, ...extra };
}
