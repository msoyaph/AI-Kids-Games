// Shooberry trailer takes: the site's own capture route (apps/site/scripts/capture/shooberry.ts),
// recorded as its ?scene= routes play them (the soundtrack carries the trailer's sound).
import { scenario as site } from '../../../../apps/site/scripts/capture/shooberry';
import type { Scenario } from '../../../../apps/site/scripts/capture/types';

export const scenario: Scenario = site;
