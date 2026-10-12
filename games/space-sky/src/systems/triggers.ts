import { TRIGGERS } from '../data/triggers';
import type { GameEvent } from './events';
import type { GameState } from './state';

/** Fires each story trigger once (remembered with a `trigger:<id>` flag). */
export function triggerListener(e: GameEvent, st: GameState): void {
  for (const t of TRIGGERS) {
    if (t.on !== e.type) continue;
    const key = `trigger:${t.id}`;
    if (st.flag(key)) continue;
    const ev = e as Record<string, unknown>;
    if (t.body && ev.body !== t.body) continue;
    if (t.system && ev.system !== t.system) continue;
    if (t.area && ev.area !== t.area) continue;
    if (t.flag && !st.flag(t.flag)) continue;
    if (t.notFlag && st.flag(t.notFlag)) continue;
    st.setFlag(key);
    st.post({ kind: 'radio', id: t.dialogue });
  }
}
