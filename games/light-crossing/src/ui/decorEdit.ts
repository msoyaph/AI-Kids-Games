// Outdoor decoration editing in place: move a tile at a time, turn, nudge in small steps, put away,
// and undo — with big buttons (and keys: arrows, R, F, X, U, E/Esc).
import { item } from '../data/registry';
import type { Command } from '../input/input';
import type { Game } from '../sim/game';
import { decorSnap, moveDecor, nudgeDecor, pickUpOutdoor, restoreDecor, rotateDecor, type DecorSnap } from '../sim/decor';
import { btn, h, type Panel, type UIManager } from './dom';

export class DecorEditPanel implements Panel {
  name = 'decorEdit';
  el: HTMLElement;
  modal = true;
  private fine = false;
  /** undo: where the piece is now (-1 = put away) + how it was before */
  private undo: { snap: DecorSnap }[] = [];
  private say = h('div', { class: 'editor-say' });
  private fineBtn: HTMLButtonElement;
  private undoBtn: HTMLButtonElement;

  constructor(private ui: UIManager, private g: Game, private anchor: number) {
    const big = (label: string, act: string, f: () => void, cls = '') => btn(label, () => {
      f();
      this.refresh();
    }, `editor-btn ${cls}`, { 'data-act': act, 'aria-label': act });
    this.fineBtn = big('✨ Small steps', 'fine', () => (this.fine = !this.fine));
    this.undoBtn = big('↩️ Undo', 'undo', () => this.doUndo());
    this.el = h(
      'div',
      { class: 'decor-edit' },
      h(
        'div',
        { class: 'panel decor-edit-panel' },
        this.say,
        h(
          'div',
          { class: 'row wrap', style: 'justify-content:center;gap:10px' },
          h(
            'div',
            { class: 'editor-pad' },
            big('⬆', 'up', () => this.move(0, -1)),
            h('div', { class: 'row' }, big('⬅', 'left', () => this.move(-1, 0)), big('⬇', 'down', () => this.move(0, 1)), big('➡', 'right', () => this.move(1, 0))),
          ),
          h('div', { class: 'col', style: 'gap:8px' }, big('🔄 Turn', 'rotate', () => this.turn()), this.fineBtn),
          h('div', { class: 'col', style: 'gap:8px' }, big('📦 Put away', 'store', () => this.putAway()), this.undoBtn),
          big('✔ Done', 'done', () => ui.pop(this), 'primary'),
        ),
        h('div', { class: 'tiny muted', style: 'text-align:center' }, 'Keys: arrows move · R turn · F small steps · X put away · U undo · E done'),
      ),
    );
    this.refresh();
  }

  command(c: Command): boolean {
    switch (c) {
      case 'up':
        this.move(0, -1);
        break;
      case 'down':
        this.move(0, 1);
        break;
      case 'left':
        this.move(-1, 0);
        break;
      case 'right':
        this.move(1, 0);
        break;
      case 'rotate':
      case 'toolRing':
        this.turn();
        break;
      case 'fine':
        this.fine = !this.fine;
        break;
      case 'store':
      case 'inventory':
        this.putAway();
        break;
      case 'undo':
        this.doUndo();
        break;
      case 'confirm':
      case 'action':
      case 'back':
      case 'pause':
      case 'cancel':
        this.ui.pop(this);
        return true;
      default:
        return false;
    }
    this.refresh();
    return true;
  }

  private remember(): DecorSnap | null {
    return this.anchor >= 0 ? decorSnap(this.g, this.anchor) : null;
  }

  private push(snap: DecorSnap | null): void {
    if (!snap) return;
    this.undo.push({ snap });
    if (this.undo.length > 10) this.undo.shift();
  }

  private move(dx: number, dz: number): void {
    if (this.anchor < 0) return;
    const snap = this.remember();
    if (this.fine) {
      if (nudgeDecor(this.g, this.anchor, dx, dz)) this.push(snap);
      else this.g.emit('sfx', { name: 'error' });
      return;
    }
    const a = moveDecor(this.g, this.anchor, dx, dz);
    if (a >= 0) {
      this.push(snap);
      this.anchor = a;
    }
  }

  private turn(): void {
    if (this.anchor < 0) return;
    const snap = this.remember();
    const a = rotateDecor(this.g, this.anchor);
    if (a >= 0) {
      this.push(snap);
      this.anchor = a;
    }
  }

  private putAway(): void {
    if (this.anchor < 0) return;
    const snap = this.remember();
    if (pickUpOutdoor(this.g, this.anchor)) {
      this.push(snap);
      this.anchor = -1;
    }
  }

  private doUndo(): void {
    const u = this.undo.pop();
    if (!u) return;
    const a = restoreDecor(this.g, this.anchor, u.snap);
    if (a >= 0) this.anchor = a;
    this.g.emit('sfx', { name: 'pickup' });
  }

  private refresh(): void {
    const o = this.anchor >= 0 ? this.g.world.obj(this.anchor) : undefined;
    this.say.textContent = o?.item ? `${item(o.item).name}${this.fine ? ' — small steps' : ''}` : 'Put away! Undo brings it back.';
    this.fineBtn.classList.toggle('on', this.fine);
    this.undoBtn.disabled = this.undo.length === 0;
  }
}
