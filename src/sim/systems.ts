// Wires every simulation system into a Game: daily rollover order + interaction resolvers.
import { dailySpawns } from './spawns';
import { dailyGarden } from './gardening';
import { dailyWeather } from './weather';
import { foragingResolver } from './foraging';
import { fishingPress, fishingResolver, fishingRT, resetFishing, updateFishing } from './fishing';
import { bugResolver, resetBugs, updateBugs } from './bugs';
import { dailyConstruction, structureResolver } from './structures';
import { dailyHome } from './housing';
import { dailyShopReset } from './economy';
import { interiorResolve, stepInterior } from './interior';
import { decorResolver } from './decor';
import { Game } from './game';
import type { GameState } from './state';

export function installSystems(g: Game): void {
  // Daily rollover — order matters: weather first, garden uses yesterday's watering,
  // spawns reset per-day counters.
  g.onDay(dailyWeather);
  g.onDay(dailyConstruction);
  g.onDay(dailyHome);
  g.onDay(dailyShopReset);
  g.onDay(dailyGarden);
  g.onDay(dailySpawns);
  g.onDay(resetFishing);
  g.onDay(resetBugs);
  g.addResolver(foragingResolver);
  g.addResolver(fishingResolver);
  g.addResolver(bugResolver);
  g.addResolver(structureResolver);
  g.addResolver(decorResolver);
  g.interiorResolver = interiorResolve;
  g.onPress((game) => {
    if (!fishingRT(game).cast) return false;
    fishingPress(game);
    return true;
  });
  g.onUpdate((game, dt) => {
    if (game.state.player.location !== 'island') {
      if (game.mode === 'play' && !game.action) stepInterior(game, game.moveIntent.x, game.moveIntent.z, game.moveIntent.run, dt);
      return;
    }
    updateFishing(game, dt, game.held, game.moveMag > 0.35);
    updateBugs(game, dt, game.held);
  });
}

export function createGame(state: GameState): Game {
  // interiors are runtime-only: a save made indoors resumes outside the door
  if (state.player.location !== 'island') state.player.location = 'island';
  const g = new Game(state);
  installSystems(g);
  g.ensureDayRolled();
  return g;
}
