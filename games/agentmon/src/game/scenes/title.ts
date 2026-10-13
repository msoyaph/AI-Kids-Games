/**
 * Title: a morning meadow with a parade of Agentmon walking a path (1.1), the logo, and Play →
 * three save slots (continue, start a new adventure, or clear a slot after a confirm). Saving
 * problems are explained kindly.
 */
import { Container, Graphics, Sprite } from 'pixi.js';
import { newGameState, type GameState } from '../../core/state';
import { summarize } from '../../core/save/save';
import { BEACONS } from '../../data/chapters';
import { CODEC } from '../../data/index';
import { START } from '../../data/maps/index';
import { PLAYER_NAMES } from '../../data/names';
import { SPECIES } from '../../data/species';
import { h } from '../../ui/dom';
import { chooseNewGame } from '../../ui/newgame';
import type { App, Scene } from '../app';
import type { Game } from '../game';
import { Session } from '../session';
import { deleteSlot, loadSlot, persistent, SLOTS } from '../store';
import { OverworldScene } from './overworld';
import { BG_H, BG_W, drawBackdrop, GROUND_Y } from '../../art/backdrops';
import { footAnchor } from '../../art/painter';
import { P } from '../../art/palette';

export class TitleScene implements Scene {
  readonly name = 'title';
  readonly root = new Container();
  private sky = new Graphics();
  private bg: Sprite | null = null;
  private path = new Graphics();
  private friends: { s: Sprite; shadow: Graphics; phase: number }[] = [];
  private walk = { y: 0, gap: 0, speed: 0, m: 1 };
  private el: HTMLElement | null = null;
  private t = 0;

  constructor(private game: Game) {}

  enter(app: App): void {
    this.game.music.play('title');
    this.bg = new Sprite(app.sprites.get('bg:meadow:morning', () => drawBackdrop('meadow', 'morning')));
    this.root.addChild(this.sky, this.bg, this.path);
    // the parade: the three partners in front, then old friends and new ones
    const picks = ['spinnet', 'druzling', 'buzzbill', 'puffbit', 'lullakin', 'sprigling', 'glidelet', 'kernip', 'chinspark', 'glimmerpod', 'hummet', 'snowskip', 'stiltsprout', 'lithlet', 'gleamgrub', 'zestle'];
    picks.forEach((id, i) => {
      const s = new Sprite(app.sprites.creature(id, 64, 'happy'));
      s.anchor.set(0.5, footAnchor(s.texture.height));
      s.scale.x = -1;
      const shadow = new Graphics();
      this.root.addChild(shadow, s);
      this.friends.push({ s, shadow, phase: i * 1.3 });
    });
    this.showHome();
  }

  exit(): void { this.el?.remove(); }

  private setUi(el: HTMLElement): void {
    this.el?.remove();
    this.el = el;
    this.game.app.ui.appendChild(el);
    requestAnimationFrame(() => this.game.focus.focusFirst(el));
  }

  private showHome(): void {
    const el = h('div.screen.title-screen', {},
      h('h1', {}, 'Agent', h('span.mon', {}, 'mon')),
      h('p.panel.tagline', {}, 'Befriend creatures and relight the six Beacons.'),
      h('button.primary.big', { type: 'button', 'data-autofocus': true, onclick: () => this.showSlots() }, 'Play'),
      persistent() ? null : h('p.panel.note', {}, "This browser can't save, so your adventure lasts until you close the game."));
    this.setUi(el);
  }

  private showSlots(): void {
    const cards = SLOTS.map(slot => {
      const r = loadSlot(CODEC, slot);
      if (r.kind === 'ok') {
        const sum = summarize(r.load.state, BEACONS);
        const mins = Math.round(sum.playMs / 60000);
        return h('div.slot.panel', {},
          h('div.slot-head', {}, h('b', {}, `${PLAYER_NAMES[sum.name] ?? 'Agent'}`), h('span', {}, `${Math.floor(mins / 60)}h ${mins % 60}m`)),
          h('div.slot-info', {}, `${sum.beacons} of 6 Beacons · ${sum.friends} friends`),
          h('div.slot-team', {}, sum.team.map(s => SPECIES[s]?.name ?? s).join(', ') || 'No friends yet'),
          h('div.menu-buttons', {},
            h('button.primary', { type: 'button', onclick: () => this.continueSlot(slot) }, 'Continue'),
            h('button', { type: 'button', onclick: () => this.confirmDelete(slot) }, 'Clear')));
      }
      if (r.kind === 'newer') return h('div.slot.panel', {}, h('b', {}, `Slot ${slot}`), h('p', {}, 'This adventure was made by a newer version of Agentmon. It is kept safe.'));
      if (r.kind === 'unreadable') return h('div.slot.panel', {}, h('b', {}, `Slot ${slot}`), h('p', {}, 'This save could not be read.'), h('button', { type: 'button', onclick: () => this.confirmDelete(slot) }, 'Clear'));
      return h('div.slot.panel.empty', {}, h('b', {}, `Slot ${slot}`), h('button.primary', { type: 'button', onclick: () => void this.newGame(slot) }, 'New adventure'));
    });
    const el = h('div.screen.slots-screen', {}, h('h2.title-small', {}, 'Your adventures'), h('div.slots', {}, ...cards), h('button', { type: 'button', onclick: () => this.showHome() }, 'Back'));
    this.setUi(el);
  }

  private confirmDelete(slot: number): void {
    const el = h('div.screen', {}, h('div.panel', {}, h('p', {}, `Clear slot ${slot}? This adventure will be gone.`),
      h('div.menu-buttons', {}, h('button', { type: 'button', 'data-autofocus': true, onclick: () => this.showSlots() }, 'Keep it'), h('button', { type: 'button', onclick: () => { deleteSlot(slot); this.showSlots(); } }, 'Clear it'))));
    this.setUi(el);
  }

  private async newGame(slot: number): Promise<void> {
    this.el?.remove();
    this.el = null;
    const choice = await chooseNewGame(this.game);
    if (!choice) { this.showSlots(); return; }
    startAdventure(this.game, slot, choice.name, choice.look, choice.difficulty);
  }

  private continueSlot(slot: number): void {
    const r = loadSlot(CODEC, slot);
    if (r.kind !== 'ok') return this.showSlots();
    this.game.session = new Session(r.load.state, this.game.settings, false);
    const s = r.load.state;
    this.game.session.enterMap(s.map, s.x, s.y, s.dir);
    this.game.app.go(new OverworldScene(this.game));
  }

  resize(app: App): void {
    const { width: W, height: H } = app.host;
    // the morning meadow backdrop covers the screen, its ground along the bottom quarter
    const k = Math.max(1, Math.ceil(Math.max(W / BG_W, H / BG_H)));
    this.sky.clear().rect(0, 0, W, H).fill(0xffd8c6);
    if (this.bg) { this.bg.scale.set(k); this.bg.x = Math.round((W - BG_W * k) / 2); this.bg.y = Math.round(H - BG_H * k); }
    const ground = H - (BG_H - GROUND_Y) * k;
    // a dirt path across the grass for the parade
    const py = ground + 10 * k, ph = Math.max(8 * k, 18);
    this.path.clear().rect(0, py, W, ph).fill(P.dirt2).rect(0, py, W, Math.max(2, k)).fill(P.dirt3).rect(0, py + ph - Math.max(2, k), W, Math.max(2, k)).fill(P.dirt1);
    const m = Math.max(1, Math.min(4, Math.round(Math.min(W / 640, H / 360) * 1.5)));
    this.walk = { y: py + ph * 0.7, gap: 70 * m, speed: 18 * m, m };
    this.friends.forEach((f, i) => {
      f.s.scale.set(-m, m);
      f.s.x = W - i * this.walk.gap;
      f.s.y = this.walk.y;
      f.shadow.clear().ellipse(0, 0, 11 * m, 2.4 * m).fill({ color: 0x2a1f3d, alpha: 0.18 });
    });
  }

  update(dt: number, app: App): void {
    this.t += dt;
    const pad = this.game.input.pollGamepad();
    this.game.focus.gamepad(pad);
    if (!this.game.focus.open && (pad.a || pad.nav !== null)) {
      const el = this.el;
      if (el) {
        const buttons = [...el.querySelectorAll<HTMLButtonElement>('button')];
        if (!buttons.includes(document.activeElement as HTMLButtonElement)) buttons[0]?.focus();
        else if (pad.a) (document.activeElement as HTMLElement).click();
      }
    }
    // the parade walks to the right along the path, each with a little hop, and loops round
    const W = app.host.width, calm = this.game.settings.reducedMotion;
    const loop = this.friends.length * this.walk.gap;
    for (const f of this.friends) {
      if (!calm) {
        f.s.x += this.walk.speed * dt;
        if (f.s.x > W + this.walk.gap * 0.6) f.s.x -= loop;
      }
      const hop = calm ? 0 : Math.max(0, Math.sin(this.t * 7 + f.phase)) * 3 * this.walk.m;
      f.s.y = this.walk.y - Math.round(hop);
      f.shadow.x = f.s.x;
      f.shadow.y = this.walk.y - this.walk.m;
      f.shadow.scale.set(1 - hop / (40 * this.walk.m));
    }
  }
}

/** A brand-new adventure in a slot: Gran's house, then the opening script. */
export function startAdventure(game: Game, slot: number, name: number, look: { skin: number; hair: number; hairColor: number; outfit: number }, difficulty: 'easy' | 'normal' | 'hard', noSave = false, setup?: (s: GameState) => boolean): void {
  const state = newGameState({ slot, name, look, difficulty, seed: (Date.now() ^ (slot * 7919)) >>> 0, start: { map: START.map, x: START.x, y: START.y }, now: Date.now() });
  state.dir = START.dir;
  // tests and reviews may start somewhere else (devsetup.ts); then the opening is skipped
  const skipIntro = setup?.(state) ?? false;
  const session = new Session(state, game.settings, noSave);
  game.session = session;
  session.enterMap(state.map, state.x, state.y, state.dir);
  session.save();
  const scene = new OverworldScene(game);
  game.app.go(scene);
  if (!skipIntro) setTimeout(() => void scene.play('intro'), 400);
}
