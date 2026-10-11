import type { Input } from '../input/input';
import type { TouchControls } from '../input/touch';
import type { MissionEngine } from '../systems/missions';
import type { Settings } from '../systems/save/settings';
import type { GameState } from '../systems/state';
import type { Game } from './Game';

/** Shared services, filled in during boot. Scenes import this instead of passing things around. */
export interface Services {
  game: Game;
  input: Input;
  touch: TouchControls;
  state: GameState;
  missions: MissionEngine;
  settings: Settings;
}

export const S = {} as Services;
