import { BADGES } from '../data/badges';
import type { GameState } from './state';

/** Award any badges whose rule is now true. Returns the new ones. */
export function checkBadges(st: GameState): string[] {
  const got: string[] = [];
  for (const b of BADGES) {
    if (st.data.badges.includes(b.id)) continue;
    if (b.check(st.data)) {
      st.data.badges.push(b.id);
      st.post({ kind: 'badge', id: b.id });
      got.push(b.id);
    }
  }
  if (got.length) st.markDirty();
  return got;
}
