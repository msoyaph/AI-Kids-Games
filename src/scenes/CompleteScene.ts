import { Scene } from '../app/Scene';
import { S } from '../app/services';
import { formatPlaytime } from '../core/mathx';
import { STICKERS } from '../data/stickers';
import { CHAR_BY_ID } from '../data/characters';
import { drawToCanvas } from '../gfx/atlas';
import { drawPortrait } from '../gfx/art/characters';
import { Starfield } from '../gfx/starfield';
import { h } from '../ui/dom';
import { celebrate } from '../ui/fx';
import { button, iconEl } from '../ui/widgets';
import { completeHooks } from './completeHooks';

/** "You did it!" screen with play time, Codex %, missions and badges. */
export class CompleteScene extends Scene {
  private stars = new Starfield(['#ffe066', '#ff7ad9'], 'complete');
  private t = 0;

  constructor() {
    super('complete');
    this.music = 'finale';
    this.root.addChild(this.stars);
    const d = S.state.data;
    const m = S.missions.counts();
    const codex = completeHooks.codexPercent();
    const badges = completeHooks.badges();
    const stat = (icon: string, label: string, value: string) => h('div', { class: 'stat-tile' }, iconEl(icon), h('div', { class: 'stat-val' }, value), h('div', { class: 'stat-lbl' }, label));
    const face = drawToCanvas(150, 150, (c, w, hh) => drawPortrait(c, CHAR_BY_ID.player, w, hh, 'wow', d.profile));
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
    this.stars.resize(w, hh);
  }

  override render(): void {
    this.t += 1 / 60;
    this.stars.update(this.t * 15, 0, 1 / 60);
  }
}
