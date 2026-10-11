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
import { interiorResolve, resumeIndoors, stepInterior } from './interior';
import { decorResolver } from './decor';
import { dailyVillagers } from './villagers';
import { homeResolver, talkResolver, updateAgents } from './agents';
import { confirmPlacement, placementRT, updatePlacement } from './placement';
import { installQuests, tryStart } from './quests';
import { stepHints } from './hints';
import { dailySeason, installSeasons, seasonalSpawns } from './seasons';
import { dailyChallenges, installChallenges } from './challenges';
import { tileOf } from './player';
import { Game } from './game';
import type { GameState } from './state';

export function installSystems(g: Game): void {
  // Daily rollover — order matters: weather first, garden uses yesterday's watering,
  // spawns reset per-day counters.
  g.onDay(dailySeason);
  g.onDay(dailyWeather);
  g.onDay(dailyConstruction);
  g.onDay(dailyHome);
  g.onDay(dailyShopReset);
  g.onDay(dailyVillagers);
  g.onDay(dailyGarden);
  g.onDay(dailySpawns);
  g.onDay(seasonalSpawns);
  g.onDay(resetFishing);
  g.onDay(resetBugs);
  g.addResolver(foragingResolver);
  g.addResolver(fishingResolver);
  g.addResolver(bugResolver);
  g.addResolver(structureResolver);
  g.addResolver(decorResolver);
  g.addResolver(talkResolver);
  g.addResolver(homeResolver);
  g.onPress((game) => {
    if (!placementRT(game)) return false;
    confirmPlacement(game);
    return true;
  });
  g.interiorResolver = interiorResolve;
  g.onPress((game) => {
    if (!fishingRT(game).cast) return false;
    fishingPress(game);
    return true;
  });
  installSeasons(g);
  installQuests(g);
  installChallenges(g);
  g.onUpdate(stepHints);
  g.onUpdate((game) => {
    if (game.state.player.location !== 'island') return;
    const reg = game.world.region(tileOf(game.world, game.state.player.x, game.state.player.z));
    if (reg && !game.state.flags[`visited_${reg}`]) {
      game.state.flags[`visited_${reg}`] = 1;
      game.emit('regionVisited', { region: reg });
    }
  });
  g.onUpdate((game, dt) => {
    if (game.state.player.location !== 'island') {
      if (game.mode === 'play' && !game.action) stepInterior(game, game.moveIntent.x, game.moveIntent.z, game.moveIntent.run, dt);
      return;
    }
    updateAgents(game, dt);
    updatePlacement(game);
    updateFishing(game, dt, game.held, game.moveMag > 0.35);
    updateBugs(game, dt, game.held);
  });
}

export function createGame(state: GameState): Game {
  const g = new Game(state);
  installSystems(g);
  g.ensureDayRolled();
  // a save made indoors resumes indoors
  resumeIndoors(g);
  dailyChallenges(g);
  tryStart(g);
  return g;
}
