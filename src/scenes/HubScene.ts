import { Container, Sprite } from 'pixi.js';
import { Scene } from '../app/Scene';
import { S } from '../app/services';
import { sfx } from '../audio/sfx';
import { CHAR_BY_ID } from '../data/characters';
import { CHAPTER_NAMES } from '../data/missions';
import { drawToCanvas } from '../gfx/atlas';
import { drawAcademy } from '../gfx/art/rooms';
import { drawNpcSide, drawPortrait } from '../gfx/art/characters';
import { ensureTex, rocketTex } from '../gfx/textures';
import type { HubPlace } from '../systems/events';
import { h, setText } from '../ui/dom';
import { showDialogue } from '../ui/dialogue';
import { button, iconEl } from '../ui/widgets';
import { objectiveLabel, whereOf } from './director';
import { hubHooks } from './hubHooks';

const PLACE_SCENE: Record<HubPlace, string> = {
  board: 'board', hangar: 'hangar', codex: 'codex', badges: 'badges', lounge: 'lounge', map: 'map', shop: 'shop',
};

const PLACE_ICON: Record<HubPlace, string> = {
  board: 'flag', hangar: 'wrench', codex: 'book', badges: 'badge', lounge: 'chat', map: 'rocket', shop: 'bag',
};

interface Npc {
  id: string;
  sprite: Sprite;
  baseY: number;
  phase: number;
}

/** The Space Sky Academy: home base. */
export class HubScene extends Scene {
  private bg: Sprite;
  private crew = new Container();
  private npcs: Npc[] = [];
  private rocket: Sprite;
  private banner: HTMLElement;
  private bannerTitle: HTMLElement;
  private bannerObj: HTMLElement;
  private bannerFace: HTMLElement;
  private goBtn: HTMLButtonElement;
  private navDots = new Map<string, HTMLElement>();
  private coinText: HTMLElement;
  private t = 0;
  private refreshT = 0;

  constructor() {
    super('hub');
    this.music = 'hub';
    this.bg = new Sprite(ensureTex('room_academy', 1600, 720, (c, w, hh) => drawAcademy(c, w, hh), 0.5, 0.5, 1));
    this.rocket = new Sprite(rocketTex(S.state.data.loadout));
    this.rocket.anchor.set(0.5, 1);
    this.root.addChild(this.bg, this.rocket, this.crew);
    const cast = ['boltzy', 'stella', 'pip'];
    if (S.state.flag('zibboJoined')) cast.push('zibbo');
    for (const id of cast) {
      const ch = CHAR_BY_ID[id];
      const sp = new Sprite(ensureTex(`npc_${id}`, 96, 112, (c, w, hh) => drawNpcSide(c, ch, w, hh), 0.5, 1));
      sp.anchor.set(0.5, 1);
      sp.eventMode = 'static';
      sp.cursor = 'pointer';
      sp.on('pointertap', () => this.chat(id));
      this.crew.addChild(sp);
      this.npcs.push({ id, sprite: sp, baseY: 0, phase: Math.random() * 6 });
    }

    // Top bar.
    const d = S.state.data;
    const face = drawToCanvas(80, 80, (c, w, hh) => drawPortrait(c, CHAR_BY_ID.player, w, hh, 'happy', d.profile));
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
    this.refresh();
    hubHooks.onEnter(this);
  }

  override back(): boolean {
    hubHooks.settings();
    return true;
  }

  override resize(w: number, h: number): void {
    this.bg.position.set(w / 2, h / 2);
    const s = Math.max(w / 1600, h / 720);
    this.bg.scale.set(s);
    const ground = h / 2 + 720 * s * 0.3;
    const xs: Record<string, number> = { boltzy: 0.28, stella: 0.43, pip: 0.66, zibbo: 0.56 };
    for (const n of this.npcs) {
      n.sprite.x = w / 2 + (xs[n.id] - 0.5) * 1600 * s;
      n.baseY = ground + 8;
      n.sprite.scale.set(Math.max(1, s * 1.1));
    }
    this.rocket.position.set(w / 2 + 0.41 * 1600 * s, ground - 10);
    this.rocket.scale.set(0.7 * s);
  }

  override update(dt: number): void {
    this.t += dt;
    this.refreshT -= dt;
    if (this.refreshT <= 0) {
      this.refreshT = 0.5;
      this.refresh();
    }
    const inp = S.input.state;
    if (inp.actionPressed && !this.frozen) this.go();
  }

  override render(): void {
    for (const n of this.npcs) {
      n.sprite.y = n.baseY - Math.abs(Math.sin(this.t * 2 + n.phase)) * (n.id === 'zibbo' ? 14 : 3);
    }
    this.rocket.rotation = Math.sin(this.t * 0.8) * 0.01;
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
        this.bannerFace.replaceChildren(drawToCanvas(84, 84, (c, w, hh) => drawPortrait(c, CHAR_BY_ID[cur.mission.giver] ?? CHAR_BY_ID.stella, w, hh)));
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
    this.open(place);
  }

  open(place: HubPlace): void {
    sfx('whoosh');
    void S.game.go(PLACE_SCENE[place]);
  }

  private chat(id: string): void {
    sfx('click');
    void showDialogue(hubHooks.chatter(id));
  }
}
