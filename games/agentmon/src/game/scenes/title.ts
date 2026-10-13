/**
 * Title: a sky with Agentmon strolling by, the logo, and Play → three save slots (continue, start
 * a new adventure, or clear a slot after a confirm). Saving problems are explained kindly.
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

export class TitleScene implements Scene {
  readonly name = 'title';
  readonly root = new Container();
  private sky = new Graphics();
  private friends: { s: Sprite; vx: number; phase: number }[] = [];
  private el: HTMLElement | null = null;
  private t = 0;

  constructor(private game: Game) {}

  enter(app: App): void {
    this.game.music.play('title');
    this.root.addChild(this.sky);
    const picks = ['spinnet', 'druzling', 'buzzbill', 'kernip', 'hummet', 'lullakin', 'gleamgrub', 'zestle', 'hailbit', 'bathlet'];
    picks.forEach((id, i) => {
      const s = new Sprite(app.sprites.creature(id));
      s.anchor.set(0.5, 1);
      this.root.addChild(s);
      this.friends.push({ s, vx: (i % 2 ? 1 : -1) * (12 + (i * 7) % 15), phase: i * 1.3 });
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
      h('h1', {}, 'Agentmon'),
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
    this.sky.clear().rect(0, 0, W, H).fill(0x8fc8ff).rect(0, H * 0.72, W, H * 0.28).fill(0x74c464).rect(0, H * 0.72, W, 6).fill(0x9ed97a);
    const scale = Math.max(2, Math.round(app.host.zoom * 1.2));
    this.friends.forEach((f, i) => { f.s.scale.set(scale); f.s.x = ((i + 0.5) / this.friends.length) * W; f.s.y = H * 0.72 + 8 + (i % 3) * 18; });
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
    const W = app.host.width;
    for (const f of this.friends) {
      f.s.x += f.vx * dt * Math.abs(f.s.scale.x) * 0.5;
      f.s.scale.x = Math.abs(f.s.scale.x) * (f.vx > 0 ? -1 : 1);
      if (f.s.x < -40) f.s.x = W + 40;
      if (f.s.x > W + 40) f.s.x = -40;
      f.s.pivot.y = Math.round(Math.max(0, Math.sin(this.t * 6 + f.phase)) * 2);
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
