import type { Line } from '../data/dialogueTypes';
import { crewTalk } from './crew';
import type { HubScene } from './HubScene';

/** Hub extension points (settings, badge/codex dots, crew chatter). */
export const hubHooks = {
  settings: () => {},
  dots: (): Record<string, number> => ({}),
  chatter: (id: string): Line[] => crewTalk(id),
  onEnter: (_scene: HubScene) => {},
};
