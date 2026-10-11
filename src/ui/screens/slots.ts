// Save slot selection.
import { fmt } from '../../core/math';
import type { SaveManager, SaveMeta } from '../../sim/save';
import { btn, clear, h, type Panel, type UIManager } from '../dom';

export function formatPlaytime(sec: number): string {
  const m = Math.floor(sec / 60);
  const hrs = Math.floor(m / 60);
  return hrs > 0 ? `${hrs}h ${String(m % 60).padStart(2, '0')}m` : `${m}m`;
}

export class SlotScreen implements Panel {
  el: HTMLElement;
  modal = true;
  covers = true;
  private list = h('div', { class: 'slots' });
  constructor(
    private ui: UIManager,
    private saves: SaveManager,
    private opts: { onLoad: (slot: number) => void; onNew: (slot: number) => void; onBack: () => void },
  ) {
    this.el = h(
      'div',
      { class: 'screen' },
      h('div', { class: 'panel', style: 'position:relative;padding:22px;max-width:96vw' }, h('h2', null, 'Choose a save slot'), this.list, h('div', { class: 'row', style: 'justify-content:center;margin-top:10px' }, btn('Back', () => opts.onBack(), 'small'))),
    );
    if (!saves.storage.persistent)
      this.el.firstElementChild!.appendChild(h('div', { class: 'tag', style: 'margin-top:10px;background:#fff0e6' }, 'Saving is unavailable in this browser context — progress lasts until the page closes.'));
    this.render();
  }

  onClose(): void {}

  command(c: string): boolean {
    if (c === 'back' || c === 'cancel') {
      this.opts.onBack();
      return true;
    }
    return false;
  }

  render(): void {
    clear(this.list);
    this.saves.list().forEach((meta, slot) => this.list.appendChild(this.card(slot, meta)));
    this.ui.focusFirst(this);
  }

  private card(slot: number, meta: SaveMeta | null): HTMLElement {
    if (!meta) {
      return h('button', { class: 'slotcard', 'data-nav': '', onclick: () => this.opts.onNew(slot) }, h('div', { class: 'muted tiny' }, `Slot ${slot + 1}`), h('div', { class: 'empty' }, '＋ New Game'));
    }
    const card = h(
      'div',
      { class: 'slotcard' },
      h('div', { class: 'muted tiny' }, `Slot ${slot + 1}`),
      h('div', { class: 'nm' }, meta.name),
      h('div', null, `Day ${meta.day} · Chapter ${meta.chapter}${meta.finished ? ' ✓' : ''}`),
      h('div', { class: 'muted' }, `Played ${formatPlaytime(meta.playSeconds)}`),
      h('div', { class: 'muted' }, `✦ ${fmt(meta.glints)}`),
      h('div', { class: 'spacer' }),
      h(
        'div',
        { class: 'row' },
        btn('Continue', () => this.opts.onLoad(slot), 'primary small'),
        btn('Delete', () => this.confirmDelete(slot, meta.name), 'danger small'),
      ),
    );
    return card;
  }

  private confirmDelete(slot: number, name: string): void {
    confirmPanel(this.ui, `Delete ${name}'s island in slot ${slot + 1}? This can't be undone.`, () => {
      this.saves.remove(slot);
      this.render();
    });
  }
}

/** Generic yes/no confirmation. */
export function confirmPanel(ui: UIManager, text: string, yes: () => void, no?: () => void, labels: [string, string] = ['Yes', 'No']): void {
  const p: Panel = {
    name: 'confirm',
    modal: true,
    el: h('div', { class: 'screen', style: 'z-index:10' }, h('div', { class: 'dim' })),
    command(c) {
      if (c === 'back' || c === 'cancel') {
        ui.pop(p);
        no?.();
        return true;
      }
      return false;
    },
  };
  const box = h(
    'div',
    { class: 'panel center', style: 'padding:22px;max-width:420px;text-align:center' },
    h('div', { style: 'font-weight:700;font-size:17px;margin-bottom:16px' }, text),
    h(
      'div',
      { class: 'row', style: 'justify-content:center' },
      btn(labels[0], () => {
        ui.pop(p);
        yes();
      }, 'primary'),
      btn(labels[1], () => {
        ui.pop(p);
        no?.();
      }),
    ),
  );
  p.el.appendChild(box);
  ui.push(p);
}

/** One-button notice (e.g. storage full). */
export function noticePanel(ui: UIManager, title: string, text: string, ok = 'OK', onClose?: () => void): void {
  const close = () => {
    ui.pop(p);
    onClose?.();
  };
  const p: Panel = {
    name: 'notice',
    modal: true,
    el: h('div', { class: 'screen', style: 'z-index:10' }, h('div', { class: 'dim' })),
    command(c) {
      if (c === 'back' || c === 'cancel') {
        close();
        return true;
      }
      return false;
    },
  };
  p.el.appendChild(
    h(
      'div',
      { class: 'panel center notice', style: 'padding:22px;max-width:440px;text-align:center' },
      h('div', { style: 'font-weight:800;font-size:20px;margin-bottom:10px' }, title),
      h('div', { style: 'font-size:16px;line-height:1.45;margin-bottom:18px' }, text),
      h('div', { class: 'row', style: 'justify-content:center' }, btn(ok, close, 'primary')),
    ),
  );
  ui.push(p);
}
