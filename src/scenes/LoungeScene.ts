import { Container, Sprite } from 'pixi.js';
import { Scene } from '../app/Scene';
import { S } from '../app/services';
import { sfx } from '../audio/sfx';
import { CHAR_BY_ID } from '../data/characters';
import { dialogue } from '../data/dialogue';
import { DECOR_BY_ID } from '../data/shop';
import { drawToCanvas } from '../gfx/canvas';
import { drawNpcSide, drawPortrait } from '../gfx/art/characters';
import { drawDecor, drawLounge } from '../gfx/art/rooms';
import { ensureTex } from '../gfx/textures';
import { showDialogue } from '../ui/dialogue';
import { h } from '../ui/dom';
import { button } from '../ui/widgets';
import { crewTalk } from './crew';

/** Where bought decorations go in the room (fractions of the 1600 x 720 backdrop). */
const DECOR_SPOTS: Array<[number, number, number]> = [
  [0.08, 0.92, 1.1], [0.92, 0.92, 1.1], [0.3, 0.9, 0.9], [0.7, 0.9, 0.9], [0.5, 0.98, 1.3], [0.16, 0.74, 0.8], [0.84, 0.74, 0.8], [0.5, 0.2, 1], [0.04, 0.6, 0.8], [0.96, 0.6, 0.8],
];

/** The crew lounge: chat with the crew for hints, stories and space facts. Your decorations live here. */
export class LoungeScene extends Scene {
  private bg: Sprite;
  private decor = new Container();
  private crew = new Container();
  private cast: string[];
  private t = 0;

  constructor() {
    super('lounge');
    this.music = 'hub';
    this.bg = new Sprite(ensureTex('room_lounge', 1600, 720, (c, w, hh) => drawLounge(c, w, hh), 0.5, 0.5, 1));
    this.root.addChild(this.bg, this.decor, this.crew);
    this.cast = ['stella', 'pip', 'rio', 'boltzy'];
    if (S.state.flag('zibboJoined')) this.cast.push('zibbo');
    const people = h('div', { class: 'crew-row' });
    for (const id of this.cast) {
      const ch = CHAR_BY_ID[id];
      const face = drawToCanvas(110, 110, (c, w, hh) => drawPortrait(c, ch, w, hh));
      const b = h('button', { class: 'crew-btn', type: 'button', 'data-testid': `crew-${id}` }, face, h('span', null, ch.name));
      b.addEventListener('click', () => this.talk(id));
      people.append(b);
    }
    const header = h('div', { class: 'scr-header' }, button('Back', 'back', () => this.back(), { round: true, color: 'white', id: 'btn-back' }), h('div', { class: 'title' }, 'Crew Lounge'), h('div', { class: 'spacer' }), button('Shop', 'bag', () => void S.game.go('shop'), { color: 'white', id: 'btn-lounge-shop' }));
    this.ui.append(header, h('div', { class: 'lounge-tip' }, 'Tap a friend to talk!'), people);
    this.ui.classList.add('menu-screen');
  }

  override enter(): void {
    S.state.emit({ type: 'visit', place: 'lounge' });
    if (!S.state.flag('loungeHello')) {
      S.state.setFlag('loungeHello');
      void showDialogue(dialogue('lounge_hello'));
    }
  }

  override back(): boolean {
    void S.game.go('hub');
    return true;
  }

  override resize(w: number, hh: number): void {
    const s = Math.max(w / 1600, hh / 720);
    this.bg.position.set(w / 2, hh / 2);
    this.bg.scale.set(s);
    const ox = w / 2 - 800 * s;
    const oy = hh / 2 - 360 * s;
    this.decor.removeChildren();
    S.state.data.decorPlaced.forEach((id, i) => {
      const d = DECOR_BY_ID[id];
      const spot = DECOR_SPOTS[i % DECOR_SPOTS.length];
      if (!d) return;
      const sp = new Sprite(ensureTex(`decor_${d.style}`, 120, 120, (c, ww, h2) => drawDecor(c, d.style, ww, h2), 0.5, 1));
      sp.position.set(ox + spot[0] * 1600 * s, oy + spot[1] * 720 * s);
      sp.scale.set(spot[2] * s);
      this.decor.addChild(sp);
    });
    this.crew.removeChildren();
    this.cast.forEach((id, i) => {
      const sp = new Sprite(ensureTex(`npc_${id}`, 96, 112, (c, ww, h2) => drawNpcSide(c, CHAR_BY_ID[id], ww, h2), 0.5, 1));
      sp.position.set(ox + (0.36 + i * 0.07) * 1600 * s, oy + 0.66 * 720 * s);
      sp.scale.set(1.2 * s);
      this.crew.addChild(sp);
    });
  }

  override update(dt: number): void {
    this.t += dt;
    this.crew.children.forEach((c, i) => {
      c.scale.y = 1.2 * Math.max(0.5, this.bg.scale.y) * (1 + Math.sin(this.t * 2 + i) * 0.02);
    });
  }

  private talk(id: string): void {
    sfx('click');
    // A mission might want you to talk to this person here.
    const needed = S.missions.active().some((m) => {
      const o = S.missions.objective(m.id);
      return o?.kind === 'talk' && o.npc === id && o.area === 'lounge';
    });
    S.state.addUnique(S.state.data.stats.talkedTo, id);
    if (needed) {
      S.state.emit({ type: 'talk', npc: id, area: 'lounge' });
      return;
    }
    void showDialogue(crewTalk(id));
  }
}
