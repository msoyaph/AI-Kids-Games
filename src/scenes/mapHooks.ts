import { S } from '../app/services';
import { BODY_BY_ID, systemOf, type SystemDef, type SystemId } from '../data/bodies';
import type { StarMapScene } from './StarMapScene';

/** Star map rules. The mission director refines these at boot. */
export const mapHooks = {
  targetSystem: (): SystemId | null => null,
  isUnlocked: (sys: SystemDef, chapter: number): boolean => sys.chapter <= chapter,
  blurb: (sys: SystemDef): string => BODY_BY_ID[sys.main]?.noLand ?? `${sys.name} is waiting for you!`,
  lockedText: (sys: SystemDef): string => `Keep going, cadet! You can fly here in Chapter ${sys.chapter}.`,
  fly: (from: SystemId, to: SystemId): void => {
    const loc = S.state.data.location;
    void S.game.go('flight', { from, to, startBody: systemOf(loc).id === from ? loc : undefined });
  },
  back: (): void => {
    const loc = S.state.data.location;
    if (loc === 'earth') void S.game.go('hub');
    else {
      const area = BODY_BY_ID[loc]?.areas?.[0];
      void S.game.go(area ? 'explore' : 'hub', area ? { area } : {});
    }
  },
  onEnter: (_scene: StarMapScene): void => {},
};
