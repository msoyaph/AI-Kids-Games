// Multi-touch routing for the on-screen controls. A control claims a finger (pointerId) when it goes down on it and
// then receives every move/up of that finger wherever it slides, even off the control or out of its zone. Other
// fingers can never take it over. Listens on the window, so it doesn't depend on pointer capture (which some
// browsers refuse for synthetic events); capture is still requested as a best-effort extra.

export interface PointerOwner {
  move(e: PointerEvent): void;
  /** `cancelled` = the browser took the touch away (or the page lost focus), not a normal lift. */
  up(e: PointerEvent | null, cancelled: boolean): void;
}

export class PointerRouter {
  private readonly owners = new Map<number, PointerOwner>();

  constructor() {
    window.addEventListener('pointermove', this.onMove, { capture: true, passive: true });
    window.addEventListener('pointerup', this.onUp, { capture: true });
    window.addEventListener('pointercancel', this.onCancel, { capture: true });
    window.addEventListener('blur', this.releaseAll);
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  /** Give finger `e.pointerId` to `owner`. Returns false if another control already has it. */
  claim(e: PointerEvent, owner: PointerOwner, el?: Element): boolean {
    if (this.owners.has(e.pointerId)) return false;
    this.owners.set(e.pointerId, owner);
    try {
      el?.setPointerCapture(e.pointerId);
    } catch {
      /* synthetic or already-released pointer: the window listeners still route it */
    }
    return true;
  }

  owns(owner: PointerOwner): boolean {
    for (const o of this.owners.values()) if (o === owner) return true;
    return false;
  }

  get active(): number {
    return this.owners.size;
  }

  /** Lift every finger (hiding the controls, pausing, losing focus). */
  readonly releaseAll = (): void => {
    const list = [...this.owners.values()];
    this.owners.clear();
    for (const o of list) o.up(null, true);
  };

  private readonly onMove = (e: PointerEvent): void => {
    this.owners.get(e.pointerId)?.move(e);
  };

  private readonly onUp = (e: PointerEvent): void => {
    const o = this.owners.get(e.pointerId);
    if (!o) return;
    this.owners.delete(e.pointerId);
    o.up(e, false);
  };

  private readonly onCancel = (e: PointerEvent): void => {
    const o = this.owners.get(e.pointerId);
    if (!o) return;
    this.owners.delete(e.pointerId);
    o.up(e, true);
  };

  private readonly onVisibility = (): void => {
    if (document.hidden) this.releaseAll();
  };
}
