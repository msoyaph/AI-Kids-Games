// When a game is paused or a round has ended, read from the game's own read-only test hook (the game
// contract's window.__<name>) or its page, in the same-origin frame. Nothing is changed in the game.
// tests/signals.test.ts checks every hook and selector named here still exists in the verified builds.
export type GameState = 'playing' | 'paused' | 'ended';
type Win = Window & Record<string,any>;
const has = (d: Document,selector: string) => !!d.querySelector(selector);

export const SIGNALS: Record<string,(w: Win,d: Document) => GameState> = {
  'tuck-pop': w => { const screen = w.__tuckpop?.snapshot?.()?.screen; return screen === 'pause' ? 'paused' : screen === 'over' || screen === 'done' ? 'ended' : 'playing'; },
  agentmon: (w,d) => ['won','lost','befriended','left','wandered'].includes(w.__agentmon?.snapshot?.()?.battle?.outcome) ? 'ended' : has(d,'.menu.pause') ? 'paused' : 'playing',
  'calex-cart': w => w.__calex?.app?.session?.completed === true ? 'ended' : w.__calex?.app?.paused ? 'paused' : 'playing',
  'light-crossing': (_w,d) => has(d,'.panel.pause') ? 'paused' : 'playing',
  'space-sky': (_w,d) => has(d,'[data-testid="race-result"],[data-testid="complete-stats"]') ? 'ended' : has(d,'[data-testid="pause-menu"]') ? 'paused' : 'playing',
  theabonk: w => ['dead','won'].includes(w.__theabonk?.world?.state) ? 'ended' : w.__theabonk?.paused ? 'paused' : 'playing',
  'vanex-defense': w => { const s = w.__vanexTest?.state?.(); return !s ? 'playing' : s.state && s.state !== 'playing' ? 'ended' : s.paused || s.modal ? 'paused' : 'playing'; },
  shooberry: w => { const screen = w.__shooberry?.snapshot?.()?.screen; return screen === 'result' ? 'ended' : screen === 'paused' ? 'paused' : 'playing'; }
};

/** The game's state, or 'playing' when it can't be read (a game without a signal, or a frame mid-load). */
export function gameState(slug: string,frame: HTMLIFrameElement): GameState {
  try { const w = frame.contentWindow as Win | null; return w && SIGNALS[slug] ? SIGNALS[slug](w,w.document) : 'playing'; }
  catch { return 'playing'; }
}
