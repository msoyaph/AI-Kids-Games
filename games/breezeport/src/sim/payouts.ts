/**
 * Business payouts: shops and workplaces fill a coin bubble as town time passes (faster with more
 * customers or workers nearby). A tap collects it with a pop; a full bubble collects itself, so
 * nothing is ever lost and nobody has to come back at a set time.
 *
 * Pure: no DOM, no Date, no Math.random.
 */
import { THING } from '../data/things';
import { TUNING } from '../data/tuning';
import type { Thing } from './state';

/** Coins a full bubble holds (one minute of play at full strength); 0 for things that don't earn. */
export function bubbleSize(t: Pick<Thing, 'def' | 'level'>): number {
  const d = THING[t.def];
  if (!d?.zone || d.zone === 'home') return 0;
  const lvl = Math.min(3, Math.max(1, d.level ?? t.level)) - 1;
  const rate = d.zone === 'shop' ? TUNING.money.shopPerMin[lvl]! : TUNING.money.workPerMin[lvl]!;
  return rate * (TUNING.money.autoCollectSec / 60);
}
