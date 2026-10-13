/**
 * Playing: turns touches, the mouse, keys and a gamepad into moves, and shows each move.
 * - Drag a piece from the tray: by touch it lifts above the finger; a ghost shows where it would
 *   land and glows the lines it would clear; it snaps to the nearest spot that fits (forgiving),
 *   and eases back to the tray when dropped where it can't go.
 * - Or tap a piece, then tap the board.
 * - Keys: 1/2/3 (and 4 for the Single block) or Tab pick a piece, arrows move it, Enter or Space
 *   places it, Escape puts it back. Gamepad: LB/RB pick, d-pad moves, A places, B puts it back.
 */
import { findLines, fitsAt, newLines } from './sim/board';
import { canPlace, place, type Game, type Move, type Slot } from './sim/game';
import type { Piece } from './sim/pieces';
import { contains, trayFit } from './render/layout';
import type { Scene } from './render/scene';
import { ease, tween } from './render/tween';
import type { PadButton } from './input/gamepad';

export interface Hooks {
  picked(slot: number): void;
  moved(m: Move): void;
  /** After a move's animations: the game is over (or a goal reached). */
  ended(): void;
  invalid(): void;
  /** Selection or cursor changed (for read-aloud, HUD and the hook). */
  changed(): void;
}

interface Drag { slot: number; id: number; touch: boolean; x0: number; y0: number; x: number; y: number; moved: boolean; pos: number; picked: boolean }

const SLOP = 10;
const lines = newLines();

export class Play {
  g!: Game;
  selected: number | null = null;
  /** Keyboard / gamepad cursor: the selected piece's top-left cell. */
  cursor = { r: 3, c: 3 };
  private drag: Drag | null = null;
  /** A tap-to-place in progress on the board (pointer id), or a mouse hovering with a piece selected. */
  private aim: { id: number; pos: number } | null = null;
  ghostPos = -1;
  locked = false;
  reduced = false;
  /** Keyboard or gamepad play shows the piece itself hovering at the cursor. */
  private keyMode = false;

  constructor(private scene: Scene, private hooks: Hooks) {}

  start(g: Game) {
    this.g = g; this.selected = null; this.drag = null; this.aim = null; this.ghostPos = -1; this.keyMode = false;
    this.scene.endDrag(); this.scene.selectSlot(null); this.scene.showGhost(null, -1);
    this.scene.syncBoard(g); this.scene.syncTray(g); this.scene.streak(g.streak, g.dry);
  }

  private slotOf(k: number): Slot | null { return k === 3 ? this.g.bonus : this.g.tray[k] ?? null; }
  /** Held slots in order (0–2, then the Single block). */
  held(): number[] { return [0, 1, 2, 3].filter(k => this.slotOf(k)); }

  hitSlot(x: number, y: number): number {
    const l = this.scene.layout;
    if (this.g.bonus && contains(this.scene.bonusRect(), x, y, 8)) return 3;
    for (let k = 0; k < 3; k++) if (contains(l.slots[k]!, x, y, 4) && this.g.tray[k]) return k;
    return -1;
  }

  /** The nearest position that fits for a piece whose center is at (cx, cy), within `radius` cells. */
  snap(p: Piece, cx: number, cy: number, radius: number): number {
    const l = this.scene.layout;
    const fr = (cy - l.board.y) / l.cell - p.h / 2, fc = (cx - l.board.x) / l.cell - p.w / 2;
    if (fr < -radius - 0.5 || fc < -radius - 0.5 || fr > 8 - p.h + radius + 0.5 || fc > 8 - p.w + radius + 0.5) return -1;
    let best = -1, bestD = radius;
    for (let r = Math.floor(fr) - 1; r <= Math.ceil(fr) + 1; r++) for (let c = Math.floor(fc) - 1; c <= Math.ceil(fc) + 1; c++) {
      if (r < 0 || c < 0 || r > 8 - p.h || c > 8 - p.w) continue;
      const i = r * (9 - p.w) + c, d = Math.hypot(r - fr, c - fc);
      if (d <= bestD && fitsAt(this.g.lo, this.g.hi, p, i)) { best = i; bestD = d; }
    }
    return best;
  }

  private ghost(p: Piece | null, pos: number) {
    this.ghostPos = p ? pos : -1;
    if (!p || pos < 0) { this.scene.showGhost(null, -1); return; }
    findLines(this.g.lo | p.lo[pos]!, this.g.hi | p.hi[pos]!, lines);
    this.scene.showGhost(p, pos, lines.rows, lines.cols);
  }

  // ---- pointer ----
  down(x: number, y: number, id: number, touch: boolean) {
    if (this.locked || this.g.over || this.drag) return;
    this.keyMode = false;
    const k = this.hitSlot(x, y);
    if (k >= 0) {
      const s = this.slotOf(k)!;
      this.drag = { slot: k, id, touch, x0: x, y0: y, x, y, moved: false, pos: -1, picked: false };
      this.scene.startDrag(s);
      this.scene.syncTray(this.g, k);
      const r = k === 3 ? this.scene.bonusRect() : this.scene.layout.slots[k]!;
      const from = { x: r.x + r.w / 2, y: r.y + r.h / 2, s: this.trayScale(k) };
      const d = this.drag;
      this.scene.moveDrag(from.x, from.y, from.s);
      tween(0.09, t => { if (this.drag !== d) return; const at = this.dragCenter(d); this.scene.moveDrag(from.x + (at.x - from.x) * t, from.y + (at.y - from.y) * t, from.s + (1.04 - from.s) * t); }, { ease: ease.out });
      this.hooks.picked(k);
      return;
    }
    if (this.selected !== null && contains(this.scene.layout.board, x, y, this.scene.layout.cell * 0.5)) {
      const p = this.slotOf(this.selected)!.piece;
      const pos = this.snap(p, x, y, 1.1);
      this.aim = { id, pos };
      this.ghost(p, pos);
      return;
    }
    if (this.selected !== null) this.select(null);
  }

  /** A piece's size in the tray, relative to the board. */
  private trayScale(k: number) {
    const l = this.scene.layout, p = this.slotOf(k)!.piece;
    return k === 3 ? (l.trayCell * 1.2) / l.cell : trayFit(l, l.slots[k]!, p.w, p.h) / l.cell;
  }

  private dragCenter(d: Drag) {
    const lift = d.touch ? this.scene.layout.lift + (this.slotOf(d.slot)!.piece.h * this.scene.layout.cell) / 2 : 0;
    return { x: d.x, y: d.y - lift };
  }

  move(x: number, y: number, id: number, buttons: boolean) {
    const d = this.drag;
    if (d && d.id === id) {
      d.x = x; d.y = y;
      if (!d.moved && Math.hypot(x - d.x0, y - d.y0) > SLOP) d.moved = true;
      const at = this.dragCenter(d);
      this.scene.moveDrag(at.x, at.y, 1.04);
      const p = this.slotOf(d.slot)!.piece;
      d.pos = d.moved ? this.snap(p, at.x, at.y, 0.85) : -1;
      this.ghost(p, d.pos);
      return;
    }
    if (this.aim && this.aim.id === id && this.selected !== null) {
      const p = this.slotOf(this.selected)!.piece;
      this.aim.pos = this.snap(p, x, y, 1.1); this.ghost(p, this.aim.pos);
      return;
    }
    // a mouse hovering over the board with a piece selected previews where it would go
    if (!buttons && this.selected !== null && !this.keyMode && !this.locked) {
      const p = this.slotOf(this.selected)!.piece;
      this.ghost(p, contains(this.scene.layout.board, x, y) ? this.snap(p, x, y, 1.1) : -1);
    }
  }

  up(id: number) {
    const d = this.drag;
    if (d && d.id === id) {
      this.drag = null;
      if (!d.moved) { this.cancelDrag(d, false); this.select(this.selected === d.slot ? null : d.slot); return; }
      if (d.pos >= 0) { this.commit(d.slot, d.pos, this.dragCenter(d)); return; }
      this.cancelDrag(d, true);
      this.hooks.invalid();
      return;
    }
    if (this.aim && this.aim.id === id) {
      const a = this.aim; this.aim = null;
      if (this.selected !== null && a.pos >= 0) this.commit(this.selected, a.pos, null);
      else { this.ghost(null, -1); this.hooks.invalid(); }
    }
  }

  cancel(id: number) {
    if (this.drag?.id === id) { const d = this.drag; this.drag = null; this.cancelDrag(d, true); }
    if (this.aim?.id === id) { this.aim = null; this.ghost(null, -1); }
  }

  /** Back to the tray: a quick ease from where it was dropped. */
  private cancelDrag(d: Drag, animate: boolean) {
    this.ghost(null, -1);
    const k = d.slot, r = k === 3 ? this.scene.bonusRect() : this.scene.layout.slots[k]!;
    const at = this.dragCenter(d), s = this.trayScale(k);
    if (!animate || this.reduced) { this.scene.endDrag(); this.scene.syncTray(this.g); return; }
    tween(0.22, t => this.scene.moveDrag(at.x + (r.x + r.w / 2 - at.x) * t, at.y + (r.y + r.h / 2 - at.y) * t, 1.04 + (s - 1.04) * t), {
      ease: ease.back, done: () => { if (!this.drag) { this.scene.endDrag(); this.scene.syncTray(this.g); } },
    });
  }

  // ---- placing ----
  /** Places for real: the piece flies the last bit into its cells, then the board updates and lines clear. */
  commit(slot: number, pos: number, from: { x: number; y: number } | null) {
    if (!canPlace(this.g, slot, pos)) { this.hooks.invalid(); return; }
    const s = this.slotOf(slot)!, p = s.piece;
    const l = this.scene.layout;
    const target = { x: l.board.x + (p.pc[pos]! + p.w / 2) * l.cell, y: l.board.y + (p.pr[pos]! + p.h / 2) * l.cell };
    const m = place(this.g, slot, pos)!;
    this.ghost(null, -1);
    if (this.selected === slot || (this.selected !== null && !this.slotOf(this.selected))) this.selected = null;
    this.scene.selectSlot(this.selected);
    this.locked = true;
    const land = () => {
      this.scene.endDrag();
      this.scene.syncBoard(this.g); this.scene.syncTray(this.g); this.scene.streak(this.g.streak, this.g.dry);
      this.scene.squash(m.placedCells, this.reduced);
      if (m.cracked.length) this.scene.crack(m.cracked);
      this.locked = false;
      this.hooks.moved(m);
      this.scene.sweep(m.cleared, m.collected, m.r + Math.floor(p.h / 2), m.c + Math.floor(p.w / 2), this.reduced, () => { if (this.g.over) this.hooks.ended(); });
      if (this.keyMode && this.selected === null) this.autoSelect();
      this.hooks.changed();
    };
    if (from && !this.reduced) {
      this.scene.startDrag(s);
      tween(0.07, t => this.scene.moveDrag(from.x + (target.x - from.x) * t, from.y + (target.y - from.y) * t, 1.04 - 0.04 * t), { ease: ease.out, done: land });
    } else land();
  }

  /** Autoplay (capture mode): the piece lifts from its slot, glides over the board showing its ghost, and drops. */
  glide(slot: number, pos: number, seconds: number) {
    const s = this.slotOf(slot); if (!s || this.locked) return;
    const p = s.piece, l = this.scene.layout;
    const r = slot === 3 ? this.scene.bonusRect() : l.slots[slot]!;
    const from = { x: r.x + r.w / 2, y: r.y + r.h / 2 }, to = { x: l.board.x + (p.pc[pos]! + p.w / 2) * l.cell, y: l.board.y + (p.pr[pos]! + p.h / 2) * l.cell };
    const s0 = this.trayScale(slot);
    this.locked = true;
    this.scene.startDrag(s); this.scene.syncTray(this.g, slot);
    tween(seconds, t => {
      const x = from.x + (to.x - from.x) * t, y = from.y + (to.y - from.y) * t - Math.sin(t * Math.PI) * l.cell * 1.2;
      this.scene.moveDrag(x, y, s0 + (1.04 - s0) * Math.min(1, t * 2.5));
      if (t > 0.55) this.ghost(p, pos);
    }, { ease: ease.inOut, done: () => { this.locked = false; this.commit(slot, pos, to); } });
  }

  // ---- selection, keys and gamepad ----
  select(k: number | null) {
    this.selected = k !== null && this.slotOf(k) ? k : null;
    this.scene.selectSlot(this.selected);
    if (this.selected !== null) {
      const p = this.slotOf(this.selected)!.piece;
      if (this.keyMode) { this.placeCursor(p); this.showCursor(); } else this.ghost(null, -1);
    } else { this.ghost(null, -1); if (!this.drag) this.scene.endDrag(); }
    this.hooks.changed();
  }

  /** The cursor starts where the piece fits closest to the board's middle. */
  private placeCursor(p: Piece) {
    let best = -1, bestD = 1e9;
    for (let i = 0; i < p.count; i++) {
      if (!fitsAt(this.g.lo, this.g.hi, p, i)) continue;
      const d = Math.hypot(p.pr[i]! + p.h / 2 - 4, p.pc[i]! + p.w / 2 - 4);
      if (d < bestD) { bestD = d; best = i; }
    }
    if (best >= 0) this.cursor = { r: p.pr[best]!, c: p.pc[best]! };
    else this.cursor = { r: Math.min(this.cursor.r, 8 - p.h), c: Math.min(this.cursor.c, 8 - p.w) };
  }

  private showCursor() {
    if (this.selected === null) return;
    const s = this.slotOf(this.selected)!, p = s.piece, l = this.scene.layout;
    const pos = this.cursor.r * (9 - p.w) + this.cursor.c;
    this.scene.startDrag(s);
    this.scene.moveDrag(l.board.x + (this.cursor.c + p.w / 2) * l.cell, l.board.y + (this.cursor.r + p.h / 2) * l.cell, 1);
    this.scene.drag.root.alpha = fitsAt(this.g.lo, this.g.hi, p, pos) ? 0.55 : 0.85;
    this.ghost(p, fitsAt(this.g.lo, this.g.hi, p, pos) ? pos : -1);
  }

  private autoSelect() { const h = this.held(); if (h.length) this.select(h[0]!); }

  private cycle(dir: 1 | -1) {
    const h = this.held(); if (!h.length) return;
    const i = this.selected === null ? (dir === 1 ? -1 : 0) : h.indexOf(this.selected);
    this.select(h[(i + dir + h.length) % h.length]!);
  }

  private nudge(dr: number, dc: number) {
    if (this.selected === null) { this.autoSelect(); return; }
    const p = this.slotOf(this.selected)!.piece;
    this.cursor = { r: Math.min(8 - p.h, Math.max(0, this.cursor.r + dr)), c: Math.min(8 - p.w, Math.max(0, this.cursor.c + dc)) };
    this.showCursor(); this.hooks.changed();
  }

  private placeAtCursor() {
    if (this.selected === null) { this.autoSelect(); return; }
    const p = this.slotOf(this.selected)!.piece, pos = this.cursor.r * (9 - p.w) + this.cursor.c;
    if (!fitsAt(this.g.lo, this.g.hi, p, pos)) { this.hooks.invalid(); return; }
    this.scene.drag.root.alpha = 1;
    this.commit(this.selected, pos, null);
  }

  /** Returns true when the key was used. */
  key(code: string): boolean {
    if (this.locked || this.g.over) return false;
    const digit = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3 }[code];
    const enter = (on: () => void) => { this.keyMode = true; on(); return true; };
    if (digit !== undefined) return this.slotOf(digit) ? enter(() => this.select(digit)) : false;
    switch (code) {
      case 'Tab': return enter(() => this.cycle(1));
      case 'ArrowUp': case 'KeyW': return enter(() => this.nudge(-1, 0));
      case 'ArrowDown': case 'KeyS': return enter(() => this.nudge(1, 0));
      case 'ArrowLeft': case 'KeyA': return enter(() => this.nudge(0, -1));
      case 'ArrowRight': case 'KeyD': return enter(() => this.nudge(0, 1));
      case 'Enter': case 'Space': case 'NumpadEnter': return enter(() => this.placeAtCursor());
      case 'Escape': if (this.selected !== null) { this.select(null); this.scene.endDrag(); return true; } return false;
    }
    return false;
  }

  /** Gamepad presses in play; returns the ones it didn't use (Start, Back, X, Y are the caller's). */
  pad(buttons: PadButton[]): PadButton[] {
    const rest: PadButton[] = [];
    for (const b of buttons) {
      if (this.locked || this.g.over) { rest.push(b); continue; }
      this.keyMode = true;
      switch (b) {
        case 'lb': this.cycle(-1); break;
        case 'rb': this.cycle(1); break;
        case 'up': this.nudge(-1, 0); break;
        case 'down': this.nudge(1, 0); break;
        case 'left': this.nudge(0, -1); break;
        case 'right': this.nudge(0, 1); break;
        case 'a': this.placeAtCursor(); break;
        case 'b': if (this.selected !== null) { this.select(null); this.scene.endDrag(); } else rest.push(b); break;
        default: rest.push(b);
      }
    }
    return rest;
  }

  /** For the read-aloud and the test hook. */
  describe() {
    const s = this.selected === null ? null : this.slotOf(this.selected);
    return { selected: this.selected, piece: s?.piece.id ?? null, cursor: { ...this.cursor }, ghost: this.ghostPos, dragging: !!this.drag, keyMode: this.keyMode };
  }
}
