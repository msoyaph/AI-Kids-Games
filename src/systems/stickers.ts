import { STICKERS, STICKER_BY_ID } from '../data/stickers';
import type { GameEvent } from './events';
import type { GameState } from './state';

/** Adds found stickers to the sticker book. */
export function stickerListener(e: GameEvent, st: GameState): void {
  if (e.type === 'sticker' && STICKER_BY_ID[e.id]) {
    if (st.addUnique(st.data.stickers, e.id)) st.post({ kind: 'sticker', id: e.id });
  }
  if (e.type === 'tow') {
    for (const s of STICKERS) if (s.source.kind === 'tow' && st.addUnique(st.data.stickers, s.id)) st.post({ kind: 'sticker', id: s.id });
  }
}
