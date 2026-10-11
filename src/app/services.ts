import type { Input } from '../input/input';
import type { TouchControls } from '../input/touch';
import type { GameState } from '../systems/state';
import type { Game } from './Game';

/** Shared services, filled in during boot. Scenes import this instead of passing things around. */
export interface Services {
  game: Game;
  input: Input;
  touch: TouchControls;
  state: GameState;
}

export const S = {} as Services;
