// Tuck Pop trailer takes: the site's own capture route (apps/site/scripts/capture/tuck-pop.ts),
// recorded as the game's ?scene= routes play them. The capture route always keeps the game's own
// sound off, so the trailer carries the soundtrack only. The full 1920×1080 frame is kept: the
// board sits in the middle of the game's own backdrop.
import { scenario as site } from '../../../../apps/site/scripts/capture/tuck-pop';
import type { Scenario } from '../../../../apps/site/scripts/capture/types';

export const scenario: Scenario = { ...site, takes: site.takes.map(({ crop: _crop, ...take }) => take) };
