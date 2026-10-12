import { S } from '../app/services';
import { topModal } from './modal';

/** Scenes where arrow keys / d-pad move between buttons (in play scenes they steer instead). */
const MENU_SCENES = new Set(['title', 'slots', 'creator', 'hub', 'board', 'hangar', 'shop', 'codex', 'badges', 'lounge', 'complete', 'credits', 'cutscene']);

function focusables(root: HTMLElement): HTMLElement[] {
  const list = Array.from(root.querySelectorAll<HTMLElement>('button:not([disabled]), [role="button"], input[type="range"], .slot-card, .mission-row'));
  return list.filter((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 4 && r.height > 4 && getComputedStyle(el).visibility !== 'hidden';
  });
}

function scopeRoot(): HTMLElement | null {
  const dlg = S.game.topLayer.querySelector<HTMLElement>('.dlg-box');
  if (dlg) return null;
  const modal = topModal();
  if (modal) return modal.el;
  return S.game.current?.ui ?? null;
}

/** Move focus to the nearest button in a direction. */
function move(dx: number, dy: number): void {
  const root = scopeRoot();
  if (!root) return;
  const items = focusables(root);
  if (!items.length) return;
  const cur = document.activeElement as HTMLElement | null;
  if (!cur || !items.includes(cur)) {
    items[0].focus({ preventScroll: false });
    return;
  }
  const a = cur.getBoundingClientRect();
  const ax = a.left + a.width / 2;
  const ay = a.top + a.height / 2;
  let best: HTMLElement | null = null;
  let bestScore = Infinity;
  for (const el of items) {
    if (el === cur) continue;
    const b = el.getBoundingClientRect();
    const bx = b.left + b.width / 2;
    const by = b.top + b.height / 2;
    const vx = bx - ax;
    const vy = by - ay;
    const along = vx * dx + vy * dy;
    if (along <= 4) continue;
    const across = Math.abs(vx * dy) + Math.abs(vy * dx);
    const score = along + across * 2.5;
    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  }
  if (best) {
    best.focus({ preventScroll: false });
    best.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
}

/** Called every logic step from the input loop. */
export function menuNavStep(): void {
  const st = S.input.state;
  const inMenu = !!topModal() || MENU_SCENES.has(S.game.sceneName);
  if (!inMenu) return;
  if (st.navX !== 0 || st.navY !== 0) {
    if (S.input.lastSource === 'keyboard' || S.input.lastSource === 'gamepad') {
      document.body.classList.add('kbd-nav');
      move(st.navX, st.navY);
    }
  }
  // Gamepad A presses the focused button (keyboard Enter/Space already do this natively).
  if (S.input.lastSource === 'gamepad' && st.confirmPressed) {
    const cur = document.activeElement as HTMLElement | null;
    if (cur && cur !== document.body && scopeRoot()?.contains(cur)) cur.click();
    else move(0, 1);
  }
}
