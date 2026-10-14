// Cliff Valley preview loop: the trailer's takes (marketing/sizzle/capture/games/cliff-valley.ts),
// which play the current build through its own ?scene= routes with the HUD hidden. The loop uses the
// three desktop takes (harvest, festival, mine); the tablet take is for the trailer only. The gallery
// keeps the game's own screenshots (src/data/temporary-art.ts), so no stills are taken here.
import { scenario as trailer } from '../../../../marketing/sizzle/capture/games/cliff-valley';
import type { Scenario } from './types';

export const scenario: Scenario = { ...trailer, takes: trailer.takes.filter(take => take.id !== 'tablet'), loopOrder: ['harvest','festival','mine'], gallery: false };
