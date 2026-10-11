import { Container, Graphics, Sprite } from 'pixi.js';
import { Scene } from '../app/Scene';
import { S } from '../app/services';
import { sfx } from '../audio/sfx';
import { CHAR_BY_ID } from '../data/characters';
import { dialogue } from '../data/dialogue';
import { drawNpcSide } from '../gfx/art/characters';
import { drawGlyph } from '../gfx/art/glyphs';
import { drawSilhouette, drawSkyGradient } from '../gfx/art/backgrounds';
import { drawAcademy } from '../gfx/art/rooms';
import { glowDot } from '../gfx/canvas';
import { Particles } from '../gfx/particles';
import { hexNum } from '../gfx/palette';
import { Starfield } from '../gfx/starfield';
import { ensureTex, planetDiscFraction, planetTex, rocketTex, tex } from '../gfx/textures';
import { showDialogue } from '../ui/dialogue';
import { h } from '../ui/dom';
import { celebrate } from '../ui/fx';
import { button } from '../ui/widgets';

export interface CutsceneParams {
  id: string;
}

type Backdrop = 'academy' | 'space' | 'wormhole' | 'zephyra';

interface CutsceneDef {
  backdrop: Backdrop;
  cast: string[];
  lines: string;
  /** Where to go afterwards. */
  next: () => void;
}

const FIREWORK_COLORS = ['#ff5d73', '#ffe066', '#8cff66', '#4dd4ff', '#ff7ad9', '#9b6bff'];

/** Done callbacks so the presenter can wait for a cutscene to finish. */
export const cutsceneWaiters: Array<() => void> = [];

function finishWaiters(): void {
  while (cutsceneWaiters.length) cutsceneWaiters.shift()!();
}

const CUTSCENES: Record<string, CutsceneDef> = {
  zibbo: {
    backdrop: 'academy',
    cast: ['stella', 'player', 'zibbo', 'pip'],
    lines: 'cs_zibbo',
    next: () => void S.game.go('hub'),
  },
  starpath: {
    backdrop: 'space',
    cast: ['zibbo', 'player'],
    lines: 'cs_starpath',
    next: () => void S.game.go('hub'),
  },
  wormhole: {
    backdrop: 'wormhole',
    cast: [],
    lines: 'cs_wormhole',
    next: () => {
      S.state.data.location = 'zephyra';
      void S.game.go('flight', { from: 'zephyra', to: 'zephyra' });
    },
  },
  finale: {
    backdrop: 'zephyra',
    cast: ['ollo', 'zibbo', 'player', 'pibble', 'wobb'],
    lines: 'cs_finale',
    next: () => {
      S.state.data.location = 'earth';
      void S.game.go('credits');
    },
  },
};

/** Short story scenes: a backdrop, some happy characters, dialogue, and effects. */
export class CutsceneScene extends Scene {
  private def: CutsceneDef;
  private backdrop = new Container();
  private castLayer = new Container();
  private fx = new Particles(260, true);
  private stars: Starfield | null = null;
  private tunnel = new Graphics();
  private beam = new Sprite(tex('dot'));
  private actors: Sprite[] = [];
  private t = 0;
  private w = 1280;
  private h = 720;
  private done = false;
  private fireworkT = 0;

  constructor(private readonly p: CutsceneParams) {
    super('cutscene');
    this.def = CUTSCENES[p.id] ?? CUTSCENES.zibbo;
    this.music = p.id === 'finale' ? 'finale' : p.id === 'wormhole' ? 'wormhole' : 'hub';
    this.root.addChild(this.backdrop, this.tunnel, this.castLayer, this.fx);
    const skip = button('Skip', 'next', () => this.finish(), { size: 'small', color: 'white', id: 'btn-skip' });
    this.ui.append(h('div', { class: 'cutscene-skip' }, skip));
  }

  override async enter(): Promise<void> {
    this.buildBackdrop();
    for (const id of this.def.cast) {
      const look = S.state.data.profile;
      const t = id === 'player'
        ? ensureTex(`cs_player_${JSON.stringify(look).length}_${look.suit}_${look.helmet}`, 96, 112, (c, w, hh) => drawNpcSide(c, { ...CHAR_BY_ID.player, kind: 'human', human: { skin: look.skin, hair: look.hair, hairStyle: (look.hairStyle as 'short'), outfit: look.suit } }, w, hh), 0.5, 1)
        : ensureTex(`npc_${id}`, 96, 112, (c, w, hh) => drawNpcSide(c, CHAR_BY_ID[id], w, hh), 0.5, 1);
      const sp = new Sprite(t);
      sp.anchor.set(0.5, 1);
      this.actors.push(sp);
      this.castLayer.addChild(sp);
    }
    this.resize(S.game.metrics.width, S.game.metrics.height);
    if (this.p.id === 'finale') sfx('fanfare');
    if (this.p.id === 'wormhole') sfx('whoosh');
    setTimeout(() => void this.play(), 700);
  }

  private async play(): Promise<void> {
    await showDialogue(dialogue(this.def.lines));
    if (this.p.id === 'finale') {
      celebrate(120);
      await new Promise((r) => setTimeout(r, 1800));
    }
    this.finish();
  }

  private finish(): void {
    if (this.done) return;
    this.done = true;
    this.def.next();
    finishWaiters();
  }

  override back(): boolean {
    this.finish();
    return true;
  }

  private buildBackdrop(): void {
    const bd = this.def.backdrop;
    if (bd === 'academy') {
      const s = new Sprite(ensureTex('room_academy', 1600, 720, (c, w, hh) => drawAcademy(c, w, hh), 0.5, 0.5, 1));
      this.backdrop.addChild(s);
    } else if (bd === 'zephyra') {
      const sky = new Sprite(ensureTex('cs_zsky', 8, 256, (c, w, hh) => drawSkyGradient(c, w, hh, '#140d3a', '#6b3fd4'), 0, 0, 1));
      const far = new Sprite(ensureTex('cs_zfar', 1024, 360, (c, w, hh) => drawSilhouette(c, 'towers', '#4a2a9a', w, hh, 4), 0, 1, 1));
      const mid = new Sprite(ensureTex('cs_zmid', 1024, 300, (c, w, hh) => drawSilhouette(c, 'crystals', '#7a5cff', w, hh, 8), 0, 1, 1));
      const tower = new Sprite(ensureTex('cs_beacon', 200, 420, (c, w, hh) => {
        c.fillStyle = '#ffffff';
        drawGlyph(c, 'beacon', w / 2, hh * 0.55, w * 0.48, '#fff7b3');
        glowDot(c, w / 2, hh * 0.2, w * 0.4, '#fff7b3');
      }, 0.5, 1));
      sky.label = 'sky';
      far.label = 'far';
      mid.label = 'mid';
      tower.label = 'tower';
      this.beam.anchor.set(0.5, 1);
      this.beam.tint = 0xfff7b3;
      this.beam.blendMode = 'add';
      this.backdrop.addChild(sky, far, this.beam, tower, mid);
      this.stars = new Starfield(['#ff7ad9', '#2de0c7'], 'cs_zephyra');
      this.backdrop.addChildAt(this.stars, 1);
    } else {
      this.stars = new Starfield(['#9b6bff', '#ff7ad9', '#4dd4ff'], 'cs_space');
      this.backdrop.addChild(this.stars);
      if (bd === 'space') {
        const neb = new Sprite(planetTex('neptune'));
        neb.anchor.set(0.5);
        neb.label = 'planet';
        const worm = new Sprite(ensureTex('map_wormhole', 140, 140, (c, w) => drawGlyph(c, 'wormhole', w / 2, w / 2, w * 0.45)));
        worm.anchor.set(0.5);
        worm.label = 'worm';
        this.backdrop.addChild(neb, worm);
      } else {
        const rocket = new Sprite(rocketTex(S.state.data.loadout));
        rocket.anchor.set(0.5);
        rocket.label = 'rocket';
        this.backdrop.addChild(rocket);
      }
    }
  }

  override resize(w: number, hh: number): void {
    this.w = w;
    this.h = hh;
    this.stars?.resize(w, hh);
    for (const c of this.backdrop.children) {
      if (c instanceof Sprite) {
        if (c.label === 'sky') {
          c.width = w;
          c.height = hh;
        } else if (c.label === 'far' || c.label === 'mid') {
          c.position.set(0, hh - (c.label === 'far' ? 120 : 40));
          c.width = w;
        } else if (c.label === 'tower') c.position.set(w * 0.5, hh - 60);
        else if (c.label === 'planet') {
          c.position.set(w * 0.3, hh * 0.45);
          c.scale.set(200 / (256 * planetDiscFraction('neptune')));
        } else if (c.label === 'worm') {
          c.position.set(w * 0.72, hh * 0.4);
          c.scale.set(2.2);
        } else if (c.label === 'rocket') {
          c.position.set(w / 2, hh / 2);
          c.scale.set(0.9);
        } else if (!c.label) {
          c.position.set(w / 2, hh / 2);
          c.scale.set(Math.max(w / 1600, hh / 720));
        }
      }
    }
    this.beam.position.set(w * 0.5, hh - 300);
    const n = this.actors.length;
    this.actors.forEach((a, i) => {
      a.position.set(w * 0.5 + (i - (n - 1) / 2) * 150, hh - 70);
      a.scale.set(1.4);
    });
  }

  override update(dt: number): void {
    this.t += dt;
    this.fx.update(dt);
    if (this.def.backdrop === 'zephyra' || this.p.id === 'zibbo') {
      this.fireworkT -= dt;
      if (this.fireworkT <= 0) {
        this.fireworkT = 0.5 + Math.random() * 0.6;
        const x = this.w * (0.15 + Math.random() * 0.7);
        const y = this.h * (0.12 + Math.random() * 0.3);
        const col = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];
        this.fx.burst(tex('spark'), x, y, 36, 420, 1.2, 0.9, col, { gravity: 140, drag: 1.2 });
        this.fx.burst(tex('dot'), x, y, 16, 260, 1, 0.6, '#ffffff', { gravity: 120 });
        sfx('firework', { volume: 0.5 });
      }
    }
  }

  override render(alpha: number): void {
    this.stars?.update(this.t * (this.def.backdrop === 'wormhole' ? 600 : 30), this.t * 10, 1 / 60);
    this.actors.forEach((a, i) => {
      a.y = this.h - 70 - Math.abs(Math.sin(this.t * 3 + i * 0.8)) * 16;
      a.rotation = Math.sin(this.t * 2 + i) * 0.05;
    });
    if (this.def.backdrop === 'zephyra') {
      this.beam.scale.set(4 + Math.sin(this.t * 2) * 0.4, 40);
      this.beam.alpha = 0.5 + Math.sin(this.t * 3) * 0.15;
    }
    const worm = this.backdrop.children.find((c) => c.label === 'worm');
    if (worm) worm.rotation = this.t;
    const rocket = this.backdrop.children.find((c) => c.label === 'rocket');
    if (rocket) {
      rocket.rotation = Math.sin(this.t * 4) * 0.2;
      rocket.scale.set(0.9 + Math.sin(this.t * 2) * 0.1);
    }
    // Wormhole tunnel: colorful rings rushing past.
    const g = this.tunnel;
    g.clear();
    if (this.def.backdrop === 'wormhole') {
      const cx = this.w / 2;
      const cy = this.h / 2;
      for (let i = 0; i < 14; i++) {
        const k = ((this.t * 0.6 + i / 14) % 1);
        const r = 20 + k * k * Math.max(this.w, this.h) * 1.1;
        const col = hexNum(FIREWORK_COLORS[i % FIREWORK_COLORS.length]);
        g.ellipse(cx + Math.sin(this.t + i) * 30 * k, cy + Math.cos(this.t * 0.8 + i) * 20 * k, r, r * 0.8).stroke({ width: 6 + k * 28, color: col, alpha: 0.25 + k * 0.5 });
      }
    }
    this.fx.render(alpha);
  }
}
