// Space Sky preview loop: the trailer's takes (marketing/sizzle/capture/games/space-sky.ts), which
// play the current 3D build after a real new game: flying past Saturn's rings, landing on the Moon
// and exploring Europa. The WebGL canvas is recorded, so the DOM HUD stays out. The gallery keeps the
// game's own screenshots (src/data/temporary-art.ts), so no stills are taken here.
import { scenario as trailer } from '../../../../marketing/sizzle/capture/games/space-sky';
import type { Scenario } from './types';

export const scenario: Scenario = { ...trailer, loopOrder: ['saturn','moon-landing','europa'], gallery: false };
