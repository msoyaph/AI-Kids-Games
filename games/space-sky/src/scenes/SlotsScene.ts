import { comfortOn } from '../app/comfort';
import { Scene3D } from '../app/Scene3D';
import { S } from '../app/services';
import { startSession } from '../app/session';
import { sfx } from '../audio/sfx';
import { formatPlaytime } from '../core/mathx';
import { CHAPTER_NAMES } from '../data/missions';
import { MenuBackdrop } from '../r3/space/backdrop';
import { deleteSlot, listSlots, loadSlot } from '../systems/save/saveManager';
import { storageAvailable } from '../systems/save/storage';
import { clear, h } from '../ui/dom';
import { closeTopModal, openModal } from '../ui/modal';
import { openSettings } from '../ui/settings';
import { button, iconEl } from '../ui/widgets';
import { portraitEl } from '../ui/portraits';

/** Pick one of three save slots (one per player in the family). */
export class SlotsScene extends Scene3D {
  private backdrop: MenuBackdrop;
  private list: HTMLElement;

  constructor() {
    super('slots');
    this.music = 'title';
    this.backdrop = new MenuBackdrop(this.world, this.camera);
    this.list = h('div', { class: 'slot-list' });
    const header = h(
      'div',
      { class: 'scr-header' },
      button('Back', 'back', () => this.back(), { round: true, color: 'white', id: 'btn-back' }),
      h('div', { class: 'title' }, 'Who is playing?'),
      h('div', { class: 'spacer' }),
      button('Settings', 'gear', () => openSettings(), { round: true, color: 'white', id: 'btn-settings' }),
    );
    this.ui.append(header, this.list);
    if (!storageAvailable()) this.ui.append(h('div', { class: 'storage-note' }, 'Saving is not available here, so progress will be lost when you close the game.'));
    this.ui.classList.add('menu-screen');
  }

  override enter(): void {
    this.renderSlots();
  }

  override back(): boolean {
    void S.game.go('title');
    return true;
  }

  override resize(w: number, hh: number): void {
    super.resize(w, hh);
  }

  override render(): void {
    this.backdrop.update(this.time, 1 / 60, comfortOn());
  }

  private renderSlots(): void {
    clear(this.list);
    for (const s of listSlots()) {
      if (s.empty || !s.data) {
        const card = h('button', { class: 'slot-card empty', type: 'button', 'data-testid': `slot-${s.slot}` }, iconEl('plus', 'ico slot-plus'), h('div', { class: 'h3' }, 'New Cadet'), h('div', { class: 'muted' }, 'Start a new adventure'));
        card.addEventListener('click', () => {
          sfx('click');
          void S.game.go('creator', { slot: s.slot });
        });
        this.list.append(card);
        continue;
      }
      const d = s.data;
      const face = portraitEl('player', 120, 'happy', d.profile);
      const del = button('Erase', 'trash', (e) => {
        e.stopPropagation();
        this.confirmDelete(s.slot, d.profile.name);
      }, { round: true, size: 'small', color: 'white', id: `slot-del-${s.slot}` });
      const card = h(
        'div',
        { class: 'slot-card hit', role: 'button', tabindex: '0', 'data-testid': `slot-${s.slot}` },
        face,
        h('div', { class: 'h3' }, d.profile.name || 'Cadet'),
        h('div', { class: 'slot-info' }, `Chapter ${d.chapter}: ${CHAPTER_NAMES[d.chapter]}`),
        h('div', { class: 'slot-info row' }, iconEl('badge'), `${d.badges.length}`, iconEl('coin'), `${d.coins}`, iconEl('calendar'), formatPlaytime(d.playTime)),
        h('div', { class: 'tag' }, d.difficulty === 'easy' ? 'Easy' : 'Normal'),
        button('Play!', 'play', () => this.play(s.slot), { color: 'green', id: `slot-play-${s.slot}` }),
        del,
      );
      card.addEventListener('click', () => this.play(s.slot));
      this.list.append(card);
    }
  }

  private play(slot: number): void {
    const data = loadSlot(slot);
    if (!data) return;
    sfx('launchUi');
    startSession(data);
    void S.game.go('hub');
  }

  private confirmDelete(slot: number, name: string): void {
    const panel = h(
      'div',
      { class: 'panel col center', 'data-testid': 'confirm-delete' },
      h('div', { class: 'h2' }, `Erase ${name || 'this cadet'}?`),
      h('div', { class: 'detail-text' }, 'All progress in this slot will be gone. Ask a grown-up first!'),
      h('div', { class: 'row' },
        button('No, keep it', 'back', () => closeTopModal(), { color: 'green', id: 'btn-delete-no' }),
        button('Yes, erase', 'trash', () => {
          deleteSlot(slot);
          closeTopModal();
          this.renderSlots();
        }, { color: 'red', id: 'btn-delete-yes' }),
      ),
    );
    openModal(panel);
  }
}
