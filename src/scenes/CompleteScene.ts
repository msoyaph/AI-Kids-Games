import { comfortOn } from '../app/comfort';
import { Scene3D } from '../app/Scene3D';
import { S } from '../app/services';
import { formatPlaytime } from '../core/mathx';
import { STICKERS } from '../data/stickers';
import { MenuBackdrop } from '../r3/space/backdrop';
import { h } from '../ui/dom';
import { celebrate } from '../ui/fx';
import { button, iconEl } from '../ui/widgets';
import { completeHooks } from './completeHooks';
import { portraitEl } from '../ui/portraits';

/** "You did it!" screen with play time, Codex %, missions and badges. */
export class CompleteScene extends Scene3D {
  private backdrop: MenuBackdrop;

  constructor() {
    super('complete');
    this.music = 'finale';
    this.backdrop = new MenuBackdrop(this.world, this.camera);
    const d = S.state.data;
    const m = S.missions.counts();
    const codex = completeHooks.codexPercent();
    const badges = completeHooks.badges();
    const stat = (icon: string, label: string, value: string) => h('div', { class: 'stat-tile' }, iconEl(icon), h('div', { class: 'stat-val' }, value), h('div', { class: 'stat-lbl' }, label));
    const face = portraitEl('player', 150, 'wow', d.profile);
    const finished = S.missions.isDone('c5_beacon');
    this.ui.append(
      h('div', { class: 'complete-wrap' },
        face,
        h('div', { class: 'title' }, finished ? 'You are a Star Hero!' : 'Your Journey'),
        h('div', { class: 'h3' }, d.profile.name || 'Cadet'),
        h('div', { class: 'stat-grid', 'data-testid': 'complete-stats' },
          stat('calendar', 'Play time', formatPlaytime(d.playTime)),
          stat('book', 'Codex', `${codex}%`),
          stat('flag', 'Missions', `${m.mainDone + m.sideDone} / ${m.main + m.side}`),
          stat('badge', 'Badges', `${badges.earned} / ${badges.total}`),
          stat('sticker', 'Stickers', `${d.stickers.length} / ${STICKERS.length}`),
          stat('coin', 'Star-coins earned', String(d.coinsEarned)),
        ),
        h('div', { class: 'muted' }, finished ? 'You can keep exploring, finish side missions and find every sticker!' : 'Keep going, explorer!'),
        button('Keep exploring!', 'rocket', () => void S.game.go('hub'), { color: 'green', size: 'big', id: 'btn-keep-exploring' }),
      ),
    );
  }

  override enter(): void {
    celebrate(80);
  }

  override back(): boolean {
    void S.game.go('hub');
    return true;
  }

  override resize(w: number, hh: number): void {
    super.resize(w, hh);
  }

  override render(): void {
    this.backdrop.update(this.time, 1 / 60, comfortOn());
  }
}
