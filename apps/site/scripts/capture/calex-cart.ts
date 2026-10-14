// Calex Cart preview loop: the trailer's canvas takes (marketing/sizzle/capture/games/calex-cart.ts),
// raced by the game's own AI autopilot on the current build: drifts through Lantern Village and down
// Avalanche Peak, and a boost on Neon Nightway. The HUD and phone takes are for the trailer only. The
// gallery keeps the game's own screenshots (src/data/temporary-art.ts), so no stills are taken here.
import { scenario as trailer } from '../../../../marketing/sizzle/capture/games/calex-cart';
import type { Scenario } from './types';

const loop = ['lantern-drift','avalanche-drift','neon-boost'];
export const scenario: Scenario = { ...trailer, takes: trailer.takes.filter(take => loop.includes(take.id)), loopOrder: loop, gallery: false };
