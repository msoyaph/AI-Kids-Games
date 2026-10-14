// Controls for every device. In the garden: tap or click a tile to plant the chosen card (or drag a
// card onto the garden), tap a compost pickup to collect it, press and hold a card or plant for its
// info; keyboard and gamepad move a garden cursor, pick cards with number keys or the bumpers, plant
// with Enter/Space or A, cancel with Escape or B. Quick taps are queued as commands, so a tap between
// frames always counts. In menus, arrows and the gamepad move focus between buttons; A or Enter
// presses, B or Escape goes back.

export interface PlayControls {
  /** A tap or click at a screen point (CSS px). */
  tap(x: number, y: number): void;
  /** The pointer is over this point (mouse hover), or left the garden (null). */
  hover(x: number | null, y: number): void;
  /** Press and hold at a point (info). */
  hold(x: number, y: number, card?: string): void;
  release(): void;
  /** A card was dragged onto the garden and let go at a point. */
  drop(card: number, x: number, y: number): void;
  selectCard(index: number): void;
  nextCard(dir: 1 | -1): void;
  moveCursor(dl: number, dc: number): void;
  confirm(): void;
  cancel(): void;
  collectAll(): void;
  trowel(): void;
  pause(): void;
  speed(): void;
  playing(): boolean;
}

export interface MenuControls { back(): void; active(): boolean }

const HOLD_MS = 480, TAP_PX = 14;

export function bindPointer(canvas: HTMLCanvasElement, cards: HTMLElement, c: PlayControls) {
  let down: { x: number; y: number; at: number; timer: number } | null = null;
  canvas.addEventListener('pointerdown', e => {
    if (!c.playing()) return;
    down = { x: e.clientX, y: e.clientY, at: performance.now(), timer: window.setTimeout(() => { if (down) { c.hold(down.x, down.y); down.at = -1; } }, HOLD_MS) };
  });
  const up = (e: PointerEvent) => {
    if (!down) return;
    clearTimeout(down.timer);
    if (down.at >= 0 && Math.hypot(e.clientX - down.x, e.clientY - down.y) < TAP_PX) c.tap(e.clientX, e.clientY);
    if (down.at < 0) c.release();
    down = null;
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', () => { if (down) clearTimeout(down.timer); down = null; c.release(); });
  canvas.addEventListener('pointermove', e => {
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) >= TAP_PX) { clearTimeout(down.timer); }
    if (e.pointerType === 'mouse' && c.playing()) c.hover(e.clientX, e.clientY);
  });
  canvas.addEventListener('pointerleave', () => c.hover(null, 0));
  // cards: tap to choose, hold for info, drag onto the garden to plant there
  let drag: { id: number; index: number; x: number; y: number; timer: number; held: boolean } | null = null;
  cards.addEventListener('pointerdown', e => {
    const card = (e.target as HTMLElement).closest('.card') as HTMLElement | null;
    if (!card || !c.playing()) return;
    const index = [...cards.children].indexOf(card);
    c.selectCard(index);
    drag = { id: e.pointerId, index, x: e.clientX, y: e.clientY, held: false, timer: window.setTimeout(() => { if (drag) { drag.held = true; c.hold(drag.x, drag.y, card.dataset.plant); } }, HOLD_MS) };
    cards.setPointerCapture(e.pointerId);
  });
  cards.addEventListener('pointermove', e => {
    if (!drag || drag.id !== e.pointerId) return;
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > TAP_PX) clearTimeout(drag.timer);
    const over = document.elementFromPoint(e.clientX, e.clientY);
    c.hover(over === canvas ? e.clientX : null, e.clientY);
  });
  const endDrag = (e: PointerEvent) => {
    if (!drag || drag.id !== e.pointerId) return;
    clearTimeout(drag.timer);
    if (drag.held) c.release();
    else if (document.elementFromPoint(e.clientX, e.clientY) === canvas) c.drop(drag.index, e.clientX, e.clientY);
    c.hover(null, 0);
    drag = null;
  };
  cards.addEventListener('pointerup', endDrag);
  cards.addEventListener('pointercancel', endDrag);
}

export function bindKeys(c: PlayControls, m: MenuControls) {
  addEventListener('keydown', e => {
    if (m.active()) {
      if (e.code === 'Escape' || e.code === 'Backspace') { m.back(); e.preventDefault(); return; }
      const dir: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
      const d = dir[e.code];
      if (d && !(document.activeElement instanceof HTMLInputElement && document.activeElement.type === 'range')) { moveFocus(d[0], d[1]); e.preventDefault(); }
      return;
    }
    if (!c.playing()) return;
    if (e.code === 'Escape' || e.code === 'KeyP') { c.pause(); e.preventDefault(); return; }
    const n = Number(e.key);
    if (n >= 1 && n <= 9) { c.selectCard(n - 1); return; }
    const move: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1], KeyW: [-1, 0], KeyS: [1, 0], KeyA: [0, -1], KeyD: [0, 1] };
    const mv = move[e.code];
    if (mv) { c.moveCursor(mv[0], mv[1]); e.preventDefault(); return; }
    if (e.code === 'Enter' || e.code === 'Space') { c.confirm(); e.preventDefault(); }
    if (e.code === 'KeyC') c.collectAll();
    if (e.code === 'KeyT') c.trowel();
    if (e.code === 'KeyF') c.speed();
    if (e.code === 'KeyQ') c.nextCard(-1);
    if (e.code === 'KeyE') c.nextCard(1);
  });
}

/** Moves keyboard focus to the nearest visible button in a direction (menus). */
export function moveFocus(dx: number, dy: number) {
  const items = [...document.querySelectorAll<HTMLElement>('.screen:not([hidden]) button:not(:disabled), .screen:not([hidden]) input, .screen:not([hidden]) select')].filter(b => b.offsetParent !== null);
  const cur = document.activeElement as HTMLElement | null;
  if (!cur || !items.includes(cur)) { items[0]?.focus(); return; }
  const a = cur.getBoundingClientRect(), ax = a.x + a.width / 2, ay = a.y + a.height / 2;
  let best: HTMLElement | null = null, bestScore = Infinity;
  for (const b of items) {
    if (b === cur) continue;
    const r = b.getBoundingClientRect(), bx = r.x + r.width / 2 - ax, by = r.y + r.height / 2 - ay;
    const along = bx * dx + by * dy;
    if (along <= 2) continue;
    const across = Math.abs(bx * dy) + Math.abs(by * dx);
    const score = along + across * 2;
    if (score < bestScore) { bestScore = score; best = b; }
  }
  best?.focus();
}

/**
 * Gamepads, polled each frame. A press counts once (edge-triggered) and is latched until the game
 * uses it, so a quick tap between frames is never lost. The stick and d-pad repeat while held.
 */
export class Pads {
  private prev = new Set<number>();
  private repeatAt = 0;
  private lastDir = '';
  constructor(private readonly c: PlayControls, private readonly m: MenuControls) {}

  poll(now: number) {
    let pads: (Gamepad | null)[] = [];
    try { const list = navigator.getGamepads?.(); pads = list ? [...list] : []; } catch { return; }
    const pad = pads.find(p => p && p.connected);
    if (!pad) { this.prev.clear(); return; }
    const pressed = new Set<number>();
    pad.buttons.forEach((b, i) => { if (b.pressed || b.value > 0.5) pressed.add(i); });
    const fresh = (i: number) => pressed.has(i) && !this.prev.has(i);
    const ax = pad.axes[0] ?? 0, ay = pad.axes[1] ?? 0;
    const dx = pressed.has(15) || ax > 0.5 ? 1 : pressed.has(14) || ax < -0.5 ? -1 : 0;
    const dy = pressed.has(13) || ay > 0.5 ? 1 : pressed.has(12) || ay < -0.5 ? -1 : 0;
    const dir = `${dx},${dy}`;
    const stepDir = dir !== '0,0' && (dir !== this.lastDir || now >= this.repeatAt);
    if (stepDir) this.repeatAt = now + (dir !== this.lastDir ? 320 : 140);
    this.lastDir = dir;
    if (this.m.active()) {
      if (stepDir) moveFocus(dx, dy);
      if (fresh(0)) (document.activeElement as HTMLElement | null)?.click();
      if (fresh(1)) this.m.back();
    } else if (this.c.playing()) {
      if (stepDir) this.c.moveCursor(dy, dx);
      if (fresh(0)) this.c.confirm();
      if (fresh(1)) this.c.cancel();
      if (fresh(2)) this.c.collectAll();
      if (fresh(3)) this.c.speed();
      if (fresh(4)) this.c.nextCard(-1);
      if (fresh(5)) this.c.nextCard(1);
      if (fresh(9)) this.c.pause();
    }
    this.prev = pressed;
  }
}
