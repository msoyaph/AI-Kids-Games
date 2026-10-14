// Whether game progress lasts in this assistant's frame. Saves made here never reach the website's own
// storage, and hosts keep (or clear) frame storage in their own ways: ChatGPT says it isn't reliable
// across sessions, and Claude gives each conversation its own origin. So the note shows unless storage is
// there and has visibly lasted: the widget keeps one date (aikg:mcp-seen) and trusts storage once it is a
// day old. Nothing else is stored, and nothing leaves the device.
import type { HostKind } from './host';

export type StorageState = 'missing' | 'temporary' | 'kept';
const SEEN = 'aikg:mcp-seen',DAY = 86_400_000;

export function storageState(kind: HostKind,now = Date.now()): StorageState {
  let store: Storage;
  try {
    store = window.localStorage;
    store.setItem('aikg:mcp-probe','1');
    const ok = store.getItem('aikg:mcp-probe') === '1'; store.removeItem('aikg:mcp-probe');
    if (!ok) return 'missing';
  } catch { return 'missing'; }
  if (kind === 'chatgpt') return 'temporary';
  const seen = Number(store.getItem(SEEN));
  if (!seen) { try { store.setItem(SEEN,String(now)); } catch { /* full */ } return 'temporary'; }
  return now-seen > DAY ? 'kept' : 'temporary';
}
