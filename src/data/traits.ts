import type { EnemyDef } from './enemies';

/** Visible construct abilities: each has an icon, a codex chip and an encyclopedia line. */
export type Trait = 'boss' | 'flying' | 'fast' | 'armored' | 'ward' | 'repairs' | 'splits' | 'elemental' | 'shifting';

export const TRAIT_ORDER: Trait[] = ['boss', 'flying', 'fast', 'armored', 'ward', 'repairs', 'splits', 'shifting', 'elemental'];

/** Speed (tiles/s) from which a construct counts as fast. */
const FAST = 2.5;

export function traitsOf(d: EnemyDef): Trait[] {
  const out: Trait[] = [];
  if (d.boss) out.push('boss');
  if (d.flying) out.push('flying');
  if (d.speed >= FAST) out.push('fast');
  if (d.armor >= 0.3) out.push('armored');
  if (d.shielded) out.push('ward');
  if (d.heal) out.push('repairs');
  if (d.split) out.push('splits');
  if (d.shiftElement) out.push('shifting');
  if (d.elemental) out.push('elemental');
  return out;
}
