import { S } from '../app/services';
import { sfx } from '../audio/sfx';
import { CHAR_BY_ID } from '../data/characters';
import { CHAPTER_NAMES } from '../data/missions';
import type { RoomId } from '../r3/rooms/academy';
import type { HubPlace } from '../systems/events';
import { h, setText } from '../ui/dom';
import { showDialogue } from '../ui/dialogue';
import { button, iconEl } from '../ui/widgets';
import { objectiveLabel, whereOf } from './director';
import { hubHooks } from './hubHooks';
import { portraitEl, warmPortraits } from '../ui/portraits';
import { AcademyScene } from './AcademyScene';

const PLACE_SCENE: Record<HubPlace, string> = {
  board: 'board', hangar: 'hangar', codex: 'codex', badges: 'badges', lounge: 'lounge', map: 'map', shop: 'shop',
};

const PLACE_ICON: Record<HubPlace, string> = {
  board: 'flag', hangar: 'wrench', codex: 'book', badges: 'badge', lounge: 'chat', map: 'rocket', shop: 'bag',
};

/** Tapping a room in the diorama opens its screen. */
const ROOM_PLACE: Partial<Record<RoomId, HubPlace>> = {
  board: 'board', codex: 'codex', badges: 'badges', lounge: 'lounge', shop: 'shop', hangar: 'hangar',
};

/** The Space Sky Academy: home base, a 3D dollhouse of rooms you can tap (or use the buttons). */
export class HubScene extends AcademyScene {
  private downX = 0;
  private downY = 0;
  private banner: HTMLElement;
  private bannerTitle: HTMLElement;
  private bannerObj: HTMLElement;
  private bannerFace: HTMLElement;
  private goBtn: HTMLButtonElement;
  private navDots = new Map<string, HTMLElement>();
  private coinText: HTMLElement;
  private refreshT = 0;

  constructor() {
    super('hub');
    this.music = 'hub';
    this.ui.classList.remove('on-stage');
    this.stage.syncCast();
    this.stage.syncRocket(S.state.data.loadout);

    // Top bar.
    const d = S.state.data;
    const face = portraitEl('player', 80, 'happy', d.profile);
    face.className = 'hub-face';
    this.coinText = h('span', null, String(d.coins));
    const top = h(
      'div',
      { class: 'hub-top' },
      face,
      h('div', { class: 'hub-name' }, h('div', { class: 'h3' }, d.profile.name || 'Cadet'), h('div', { class: 'muted' }, `Chapter ${d.chapter}: ${CHAPTER_NAMES[d.chapter] ?? ''}`)),
      h('div', { class: 'spacer' }),
      h('div', { class: 'pill', 'data-testid': 'coins' }, iconEl('coin'), this.coinText),
      button('Settings', 'gear', () => hubHooks.settings(), { round: true, color: 'white', id: 'btn-settings' }),
    );

    // Mission banner.
    this.bannerFace = h('div', { class: 'banner-face' });
    this.bannerTitle = h('div', { class: 'banner-title' });
    this.bannerObj = h('div', { class: 'banner-obj' });
    this.goBtn = button('Go!', 'play', () => this.go(), { color: 'green', size: 'big', id: 'btn-go' });
    this.banner = h('div', { class: 'panel hub-banner', 'data-testid': 'hub-banner' }, this.bannerFace, h('div', { class: 'grow' }, this.bannerTitle, this.bannerObj), this.goBtn);

    // Bottom navigation.
    const nav = h('div', { class: 'hub-nav' });
    const items: Array<[HubPlace, string, string]> = [
      ['board', 'Missions', 'yellow'],
      ['map', 'Fly!', 'green'],
      ['hangar', 'Hangar', 'orange'],
      ['lounge', 'Lounge', 'pink'],
      ['codex', 'Codex', 'blue'],
      ['badges', 'Badges', 'purple'],
      ['shop', 'Shop', 'white'],
    ];
    for (const [place, label, color] of items) {
      const b = button(label, PLACE_ICON[place], () => this.open(place), { color: color as 'yellow', id: `nav-${place}` });
      b.classList.add('nav-btn');
      const dot = h('span', { class: 'badge-dot' });
      dot.style.display = 'none';
      b.append(dot);
      this.navDots.set(place, dot);
      nav.append(b);
    }
    this.ui.append(top, this.banner, nav);
  }

  override enter(): void {
    S.state.data.location = 'earth';
    this.showRoom(this.stage.academy.overview);
    const cv = S.game.r3.canvas;
    cv.addEventListener('pointerdown', this.onDown);
    cv.addEventListener('pointerup', this.onUp);
    this.refresh();
    hubHooks.onEnter(this);
    warmPortraits(['player', 'stella', 'pip', 'rio', 'boltzy', 'tuggy', ...(S.state.flag('zibboJoined') ? ['zibbo'] : [])], S.state.data.profile);
  }

  override exit(): void {
    const cv = S.game.r3.canvas;
    cv.removeEventListener('pointerdown', this.onDown);
    cv.removeEventListener('pointerup', this.onUp);
  }

  override back(): boolean {
    hubHooks.settings();
    return true;
  }

  private readonly onDown = (e: PointerEvent): void => {
    this.downX = e.clientX;
    this.downY = e.clientY;
  };

  /** A tap on a crew member chats; a tap on a room opens it. */
  private readonly onUp = (e: PointerEvent): void => {
    if (this.frozen || S.game.isSwitching || Math.hypot(e.clientX - this.downX, e.clientY - this.downY) > 12) return;
    const r = S.game.r3.canvas.getBoundingClientRect();
    const hit = this.stage.pick(this.camera, ((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    if (hit.crew) this.chat(hit.crew);
    else if (hit.room && ROOM_PLACE[hit.room]) this.open(ROOM_PLACE[hit.room]!);
  };

  override update(dt: number): void {
    this.refreshT -= dt;
    if (this.refreshT <= 0) {
      this.refreshT = 0.5;
      this.refresh();
    }
    const inp = S.input.state;
    const focused = document.activeElement && document.activeElement !== document.body;
    if (inp.actionPressed && !this.frozen && !focused) this.go();
  }

  /** Update banner, coins and notification dots. */
  refresh(): void {
    setText(this.coinText, String(S.state.data.coins));
    const cur = S.missions.currentObjective();
    const lbl = objectiveLabel();
    if (cur && lbl) {
      setText(this.bannerTitle, cur.mission.title);
      setText(this.bannerObj, lbl.text);
      if (this.bannerFace.dataset.who !== cur.mission.giver) {
        this.bannerFace.dataset.who = cur.mission.giver;
        this.bannerFace.replaceChildren(portraitEl(CHAR_BY_ID[cur.mission.giver] ? cur.mission.giver : 'stella', 84));
      }
      const w = whereOf(cur.obj);
      const place: HubPlace = w.place ?? (cur.obj.kind === 'talk' && cur.obj.area === 'lounge' ? 'lounge' : 'map');
      const lblEl = this.goBtn.querySelector('.lbl');
      if (lblEl) lblEl.textContent = place === 'map' ? 'Fly!' : 'Go!';
      this.goBtn.dataset.place = place;
    } else {
      setText(this.bannerTitle, 'Free Explore');
      setText(this.bannerObj, S.missions.available().length ? 'New missions on the board!' : 'Find stickers, race, and fill the Codex!');
      this.goBtn.dataset.place = 'board';
    }
    const avail = S.missions.available().length;
    this.setDot('board', avail);
    for (const [place, n] of Object.entries(hubHooks.dots())) this.setDot(place, n);
    // Point at the right nav button.
    for (const [place, dot] of this.navDots) dot.parentElement?.classList.toggle('hint', place === this.goBtn.dataset.place && place !== 'board');
  }

  private setDot(place: string, n: number): void {
    const dot = this.navDots.get(place);
    if (!dot) return;
    dot.style.display = n > 0 ? '' : 'none';
    setText(dot, n > 9 ? '9+' : String(n));
  }

  private go(): void {
    const place = (this.goBtn.dataset.place as HubPlace) || 'map';
    if (place === 'board' && S.missions.currentObjective()?.obj.kind === 'race') {
      sfx('whoosh');
      void S.game.go('board', { tab: 'races' });
      return;
    }
    this.open(place);
  }

  open(place: HubPlace): void {
    sfx('whoosh');
    void S.game.go(PLACE_SCENE[place]);
  }

  private chat(id: string): void {
    sfx('click');
    const c = this.stage.cast.get(id);
    if (c) {
      c.setAnim('wave');
      setTimeout(() => c.setAnim(id === 'tuggy' ? 'hover' : 'idle'), 1600);
    }
    if (!CHAR_BY_ID[id]) return;
    void showDialogue(hubHooks.chatter(id));
  }
}
