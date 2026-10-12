// Keeps the HUD tidy on every screen, from a 360 px phone held upright to a desktop monitor:
// - top-left column: clock, mission tracker, recipe tracker (stacked, never overlapping);
// - top-right column: money, then the touch Glowpad / menu buttons;
// - a "lane" for the playtest badge, contest timer, reel bar, tips and toasts: beside the two columns
//   when there's room, under them when there isn't, and only in free space while a menu is open
//   (toasts wait for the menu to close if there's none);
// - the action prompt and the Place / Cancel bar lifted above the touch buttons when they'd collide.
// Everything stays inside the safe area (notch, rounded corners, home bar).
import type { App } from '../app';
import { h } from './dom';

type R = { left: number; top: number; right: number; bottom: number };

const shown = (el: HTMLElement | null): el is HTMLElement => !!el && el.style.display !== 'none' && getComputedStyle(el).display !== 'none' && el.getClientRects().length > 0;
const overlaps = (a: R, b: R) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;

export class HudLayout {
  readonly lane = h('div', { class: 'hud-lane' });
  private probe = h('div', { class: 'safe-probe' });
  private adopted = false;
  /** the lane has room right now (toasts can show) */
  open = true;

  constructor(private app: App, private root: HTMLElement) {
    root.append(this.lane, this.probe);
  }

  /** The safe area (viewport minus notch / home bar), in CSS px. */
  safe(): R {
    const r = this.probe.getBoundingClientRect();
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
  }

  private q(sel: string): HTMLElement | null {
    return this.root.querySelector(sel);
  }

  /** Move the floating widgets into the lane once (they keep their own show/hide logic). */
  private adopt(): void {
    if (this.adopted) return;
    this.adopted = true;
    for (const sel of ['.pt-badge', '.contest-hud', '.reel', '.tip', '.toasts']) {
      const el = this.q(sel);
      if (el) this.lane.append(el);
    }
  }

  update(): void {
    this.adopt();
    const safe = this.safe();
    const vw = innerWidth;
    const gap = 8;
    // ---- left column
    const clock = this.q('.hud-clock');
    const hudOn = shown(clock);
    let leftBottom = hudOn ? clock!.getBoundingClientRect().bottom : safe.top;
    let leftRight = hudOn ? clock!.getBoundingClientRect().right : safe.left;
    for (const sel of ['.tracker', '.rtrack']) {
      const el = this.q(sel);
      if (!shown(el)) continue;
      const top = `${Math.round(leftBottom + gap)}px`;
      if (el.style.top !== top) el.style.top = top;
      const r = el.getBoundingClientRect();
      leftBottom = r.bottom;
      leftRight = Math.max(leftRight, r.right);
    }
    // ---- right column
    const money = this.q('.hud-money');
    let rightBottom = shown(money) ? money!.getBoundingClientRect().bottom : safe.top;
    let rightLeft = shown(money) ? money!.getBoundingClientRect().left : safe.right;
    const top = this.q('.tc-top');
    if (shown(top)) {
      const t = `${Math.round(rightBottom + gap)}px`;
      if (top.style.top !== t) top.style.top = t;
      const r = top.getBoundingClientRect();
      rightBottom = r.bottom;
      rightLeft = Math.min(rightLeft, r.left);
    }
    // ---- bottom: touch buttons, Place / Cancel bar, action prompt
    const cluster = this.q('.tc-cluster');
    const clusterR = shown(cluster) ? cluster.getBoundingClientRect() : null;
    let floor = clusterR ? clusterR.top : safe.bottom;
    const place = this.q('.tc-place');
    if (shown(place)) {
      place.style.bottom = '';
      let r = place.getBoundingClientRect();
      if (clusterR && overlaps(r, clusterR)) {
        place.style.bottom = `${Math.round(innerHeight - clusterR.top + gap)}px`;
        r = place.getBoundingClientRect();
      }
      floor = Math.min(floor, r.top);
    }
    const prompt = this.q('.hud-prompt');
    if (prompt && !prompt.classList.contains('hidden') && shown(prompt)) {
      prompt.style.bottom = '';
      let r = prompt.getBoundingClientRect();
      // lift it over whatever it would sit on (the Place bar, then the buttons), one at a time
      const blockers = [shown(place) ? place.getBoundingClientRect() : null, clusterR].filter(Boolean) as R[];
      for (let k = 0; k < 3; k++) {
        const b = blockers.find((x) => overlaps(r, x));
        if (!b) break;
        prompt.style.bottom = `${Math.round(innerHeight - b.top + gap)}px`;
        r = prompt.getBoundingClientRect();
      }
      floor = Math.min(floor, r.top);
    }
    // ---- the lane
    const lane = this.lane;
    const ui = this.app.ui;
    let L = leftRight + gap * 1.5;
    let Rr = rightLeft - gap * 1.5;
    let T = safe.top + 6;
    let maxH = floor - gap - T;
    if (!hudOn) {
      L = safe.left + 12;
      Rr = safe.right - 12;
    } else if (Rr - L < Math.min(300, vw * 0.5)) {
      // narrow screen: under both columns, full width
      L = safe.left + 12;
      Rr = safe.right - 12;
      T = Math.max(leftBottom, rightBottom) + gap;
      maxH = floor - gap - T;
    }
    this.open = true;
    // a menu is open: only the free space above it (still clear of the HUD), or nothing
    if (ui.modalOpen && ui.top) {
      // the menu's box (a conversation counts its choices too)
      const box = ui.top.el.matches('.dlg-wrap') ? ui.top.el : ((ui.top.el.querySelector('.phone, .panel') as HTMLElement | null) ?? ui.top.el);
      const b = box.getBoundingClientRect();
      if (b.bottom - b.top > innerHeight * 0.92) this.open = false;
      if (!hudOn || getComputedStyle(this.q('.hud')!).display === 'none') T = Math.max(T, safe.top + 4);
      maxH = Math.min(maxH, b.top - gap - T);
      if (maxH < 44) this.open = false;
    }
    lane.style.display = this.open ? '' : 'none';
    lane.style.left = `${Math.round(L)}px`;
    lane.style.width = `${Math.max(0, Math.round(Rr - L))}px`;
    lane.style.top = `${Math.round(T)}px`;
    lane.style.maxHeight = `${Math.max(0, Math.round(maxH))}px`;
  }

  /** Is screen point (x, y) clear of every HUD piece and button (by `pad` px)? */
  free(x: number, y: number, pad = 18): boolean {
    const safe = this.safe();
    if (x < safe.left + pad || x > safe.right - pad || y < safe.top + pad || y > safe.bottom - pad) return false;
    for (const el of Array.from(this.root.querySelectorAll('.hud-clock, .hud-money, .tracker, .rtrack, .tc-top, .tc-cluster, .tc-place, .hud-prompt:not(.hidden), .hud-lane > *')) as HTMLElement[]) {
      if (!shown(el)) continue;
      const r = el.getBoundingClientRect();
      if (x > r.left - pad && x < r.right + pad && y > r.top - pad && y < r.bottom + pad) return false;
    }
    return true;
  }

  /** How many more toasts fit right now (the lane's other widgets come first). */
  toastRoom(showing: number): number {
    if (!this.open) return 0;
    let h = parseFloat(this.lane.style.maxHeight) || 0;
    for (const el of Array.from(this.lane.children) as HTMLElement[]) if (!el.classList.contains('toasts') && shown(el)) h -= el.getBoundingClientRect().height + 6;
    const fit = Math.floor((h - 4) / 52);
    return Math.max(0, Math.min(innerWidth < 600 ? 2 : 3, fit) - showing);
  }
}
