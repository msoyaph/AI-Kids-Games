// Vanex Defense preview loop: the trailer's takes (marketing/sizzle/capture/games/vanex-defense.ts),
// which play the current (2.0) build: a small bot builds a real maze in Frostspire Peaks and on a sky
// lane, then the Prism Matriarch arrives. The gallery keeps the game's own screenshots
// (src/data/temporary-art.ts), so no stills are taken here.
import { scenario as trailer } from '../../../../marketing/sizzle/capture/games/vanex-defense';
import type { Scenario } from './types';

export const scenario: Scenario = { ...trailer, loopOrder: ['frost-maze','sky-lane','matriarch'], gallery: false };
