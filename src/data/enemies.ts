import { localized, t } from '../i18n';
import type { ElementId } from './elements';
import { TUNING, type EnemyTuning } from './tuning';

export type EnemyId =
  | 'gloop'
  | 'minigloop'
  | 'zoomkin'
  | 'clankbot'
  | 'puffbat'
  | 'mendy'
  | 'splitblob'
  | 'bubbleimp'
  | 'kinggloop'
  | 'bigclank'
  | 'mamapuff'
  | 'grumbleking'
  | 'bulwark'
  | 'phantom'
  | 'borer'
  | 'jammer'
  | 'hulk';

export type EnemyLook = 'beetle' | 'drone' | 'golem' | 'wisp' | 'mender' | 'geode' | 'sentinel' | 'archon' | 'bulwark' | 'phantom' | 'borer' | 'jammer' | 'hulk';

/** A construct type: identity + looks (here), numbers (TUNING.enemies), text (i18n `enemy.<id>.*`). */
export interface EnemyDef extends EnemyTuning {
  id: EnemyId;
  /** Translated. */
  readonly name: string;
  readonly blurb: string;
  /** Codex tip (translated). */
  readonly tip: string;
  flying?: boolean;
  boss?: boolean;
  /** Can spawn with an element affinity (coloured variant). */
  elemental?: boolean;
  /** Always has an element ward: only the counter element hurts fully. */
  shielded?: boolean;
  look: EnemyLook;
  color: number;
}

type EnemyIdentity = Pick<EnemyDef, 'flying' | 'boss' | 'elemental' | 'shielded' | 'look' | 'color'>;

const IDENTITY: Record<EnemyId, EnemyIdentity> = {
  gloop: { elemental: true, look: 'beetle', color: 0x5fd6c8 },
  minigloop: { look: 'beetle', color: 0x8ff0e2 },
  zoomkin: { elemental: true, look: 'drone', color: 0xffb347 },
  clankbot: { look: 'golem', color: 0x9aa3b8 },
  puffbat: { flying: true, elemental: true, look: 'wisp', color: 0xa06bff },
  mendy: { look: 'mender', color: 0x6cffa8 },
  splitblob: { look: 'geode', color: 0x8c7fb0 },
  bubbleimp: { shielded: true, look: 'sentinel', color: 0xe0c27a },
  kinggloop: { boss: true, look: 'beetle', color: 0x52d0b8 },
  bigclank: { boss: true, look: 'golem', color: 0x8e98ae },
  mamapuff: { flying: true, boss: true, look: 'drone', color: 0xb07cff },
  grumbleking: { boss: true, look: 'archon', color: 0xff8f5a },
  bulwark: { look: 'bulwark', color: 0x7fb3ff },
  phantom: { look: 'phantom', color: 0x9b8cff },
  borer: { look: 'borer', color: 0xc9925a },
  jammer: { look: 'jammer', color: 0xffd25a },
  hulk: { look: 'hulk', color: 0x5ff0b0 },
};

export const ENEMIES = {} as Record<EnemyId, EnemyDef>;
for (const id of Object.keys(IDENTITY) as EnemyId[]) {
  ENEMIES[id] = localized({ id, ...IDENTITY[id], ...TUNING.enemies[id] } as EnemyDef, `enemy.${id}`, ['name', 'blurb', 'tip'] as const);
}

export const ENEMY_IDS = Object.keys(ENEMIES) as EnemyId[];

/** Element variant prefix, e.g. "Ember" for a fire construct (translated). */
export function elementPrefix(el: ElementId): string {
  return t(`element.${el}.prefix`);
}
