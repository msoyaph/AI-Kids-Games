import { S } from '../app/services';
import type { Line } from '../data/dialogueTypes';
import type { CondState } from '../systems/level';
import type { ExploreScene } from './ExploreScene';

export interface AreaObjective {
  text: string;
  icon?: string;
  extra?: string;
}

/**
 * Hooks that connect exploration to the mission system. The mission director replaces these
 * at boot; the defaults keep the scene usable on its own (e.g. in tests).
 */
export const exploreHooks = {
  condState: (): CondState => ({
    missionStep: (id) => {
      const m = S.state.data.missions[id];
      return m && m.status === 'active' ? m.step : null;
    },
    missionDone: (id) => S.state.data.missions[id]?.status === 'done',
    flag: (name) => S.state.flag(name),
  }),
  objective: (_area: string): AreaObjective | null => null,
  talkLines: (_npc: string, _area: string): Line[] | null => null,
  onEnter: (_scene: ExploreScene) => {},
  update: (_scene: ExploreScene, _dt: number) => {},
  onLeave: (_scene: ExploreScene) => {
    void S.game.go('map', {});
  },
};
