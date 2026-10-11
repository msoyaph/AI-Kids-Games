// Wires every simulation system into a Game: daily rollover order + interaction resolvers.
import { dailySpawns } from './spawns';
import { dailyGarden } from './gardening';
import { dailyWeather } from './weather';
import { foragingResolver } from './foraging';
import { fishingPress, fishingResolver, fishingRT, resetFishing, updateFishing } from './fishing';
import { bugResolver, resetBugs, updateBugs } from './bugs';
import { Game } from './game';
import type { GameState } from './state';

export function installSystems(g: Game): void {
  // Daily rollover — order matters: weather first, garden uses yesterday's watering,
  // spawns reset per-day counters.
  g.onDay(dailyWeather);
  g.onDay(dailyGarden);
  g.onDay(dailySpawns);
  g.onDay(resetFishing);
  g.onDay(resetBugs);
  g.addResolver(foragingResolver);
  g.addResolver(fishingResolver);
  g.addResolver(bugResolver);
  g.onPress((game) => {
    if (!fishingRT(game).cast) return false;
    fishingPress(game);
    return true;
  });
  g.onUpdate((game, dt) => {
    updateFishing(game, dt, game.held, game.moveMag > 0.35);
    updateBugs(game, dt, game.held);
  });
}

export function createGame(state: GameState): Game {
  const g = new Game(state);
  installSystems(g);
  g.ensureDayRolled();
  return g;
}
