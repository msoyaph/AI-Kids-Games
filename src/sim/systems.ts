// Wires every simulation system into a Game: daily rollover order + interaction resolvers.
import { dailySpawns } from './spawns';
import { dailyGarden } from './gardening';
import { dailyWeather } from './weather';
import { foragingResolver } from './foraging';
import { Game } from './game';
import type { GameState } from './state';

export function installSystems(g: Game): void {
  // Daily rollover — order matters: weather first, garden uses yesterday's watering,
  // spawns reset per-day counters.
  g.onDay(dailyWeather);
  g.onDay(dailyGarden);
  g.onDay(dailySpawns);
  g.addResolver(foragingResolver);
}

export function createGame(state: GameState): Game {
  const g = new Game(state);
  installSystems(g);
  g.ensureDayRolled();
  return g;
}
