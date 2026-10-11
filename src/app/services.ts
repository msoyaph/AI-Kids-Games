import type { Game } from './Game';

/** Shared services, filled in during boot. Scenes import this instead of passing things around. */
export interface Services {
  game: Game;
}

export const S = {} as Services;
