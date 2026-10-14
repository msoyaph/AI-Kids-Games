/** Collecting a business's coin bubble with a tap (see sim/budget.ts for how bubbles fill). */
import { tapCollect } from './budget';
import type { Thing, Town } from './state';

export const collectTap = (town: Town, t: Thing) => tapCollect(town, t);
