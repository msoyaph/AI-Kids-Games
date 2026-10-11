/** Draws farm animals and the pet in the current location. */
import { Sprite } from 'pixi.js';
import { ANIMAL } from '../data/animals';
import { petRt, wanderState } from '../sim/animals';
import type { Sim } from '../sim/sim';
import type { Atlas } from './atlas';
import type { WorldView } from './world-view';

interface Spr {
  body: Sprite;
  shadow: Sprite;
  emote: Sprite;
  emoteUntil: number;
  emoteKind: string;
  face: number;
}

export class AnimalView {
  private sprites = new Map<number, Spr>();
  private atlas: Atlas;
  private view: WorldView;
  private petS: Spr;

  constructor(atlas: Atlas, view: WorldView) {
    this.atlas = atlas;
    this.view = view;
    this.petS = this.make();
  }

  private make(): Spr {
    const body = new Sprite();
    body.anchor.set(0.5, 1);
    body.label = 'nocull';
    const shadow = new Sprite(this.atlas.tex('shadow'));
    shadow.anchor.set(0.5);
    shadow.alpha = 0.22;
    shadow.label = 'nocull';
    const emote = new Sprite();
    emote.anchor.set(0.5, 1);
    emote.label = 'nocull';
    emote.visible = false;
    return { body, shadow, emote, emoteUntil: 0, emoteKind: '', face: 2 };
  }

  emote(id: number | 'pet', kind: string, time: number): void {
    const s = id === 'pet' ? this.petS : this.sprites.get(id);
    if (!s) return;
    s.emoteKind = kind;
    s.emoteUntil = time + 1.8;
  }

  private place(s: Spr, x: number, y: number, tex: string, flip: boolean, time: number, big: boolean): void {
    if (!s.body.parent) this.view.sorted.addChild(s.shadow, s.body, s.emote);
    s.body.texture = this.atlas.tex(tex);
    s.body.x = Math.round(x);
    s.body.y = Math.round(y) + 1;
    s.body.scale.x = flip ? -1 : 1;
    s.body.zIndex = s.body.y;
    s.shadow.texture = this.atlas.tex(big ? 'shadow.big' : 'shadow');
    s.shadow.x = s.body.x;
    s.shadow.y = s.body.y - 1;
    s.shadow.zIndex = s.body.y - 2;
    if (s.emoteUntil > time) {
      s.emote.visible = true;
      s.emote.texture = this.atlas.tex(`emote.${s.emoteKind}`);
      s.emote.x = s.body.x;
      s.emote.y = s.body.y - (big ? 30 : 16) - Math.round(Math.abs(Math.sin(time * 4)) * 2);
      s.emote.zIndex = 100000;
    } else s.emote.visible = false;
  }

  private hide(s: Spr): void {
    if (s.body.parent) {
      s.body.removeFromParent();
      s.shadow.removeFromParent();
      s.emote.removeFromParent();
    }
  }

  update(sim: Sim, time: number): void {
    const here = sim.p.loc;
    const seen = new Set<number>();
    for (const a of sim.state.animals) {
      if (a.loc !== here) continue;
      seen.add(a.id);
      let s = this.sprites.get(a.id);
      if (!s) {
        s = this.make();
        this.sprites.set(a.id, s);
      }
      const w = wanderState(a.id);
      const moving = !!w && (w.dx !== 0 || w.dy !== 0);
      if (w && w.dx) s.face = w.dx < 0 ? 1 : 2;
      const night = sim.state.min >= 20 * 60 || sim.state.min < 6 * 60 + 30;
      const frame = night && !moving ? 3 : moving ? 1 + (Math.floor(time * 6) % 2) : 0;
      this.place(s, a.x, a.y, `an.${a.kind}.${frame}`, s.face === 1, time, !!ANIMAL[a.kind]?.big);
      if (a.prod && !s.emote.visible) {
        s.emote.visible = true;
        s.emote.texture = this.atlas.tex('emote.gift');
        s.emote.x = s.body.x;
        s.emote.y = s.body.y - (ANIMAL[a.kind]?.big ? 30 : 16);
        s.emote.zIndex = 100000;
      }
    }
    for (const [id, s] of this.sprites) if (!seen.has(id)) this.hide(s);
    // pet
    const p = petRt(sim);
    if (p.loc === here) {
      const pet = sim.state.pet;
      const moving = p.dx !== 0 || p.dy !== 0;
      const frame = p.sleep ? 3 : p.sit ? 4 : moving ? 1 + (Math.floor(time * 8) % 2) : 0;
      this.place(this.petS, p.x, p.y, `pet.${pet.kind}.${pet.color % 3}.${frame}`, p.dir === 1, time, false);
    } else this.hide(this.petS);
  }

  clear(): void {
    for (const s of this.sprites.values()) this.hide(s);
    this.hide(this.petS);
  }
}
