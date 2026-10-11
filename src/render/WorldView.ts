import { FlashLimiter, MAX_PULSE_HZ, MIN_FLASH_GAP, mixColor, pulse } from './flash';
import { BitmapText, Container, Graphics, Sprite, Texture, CanvasSource } from 'pixi.js';
import { t as tr } from '../i18n';
import type { Enemy } from '../sim/enemy';
import { easeOutBack, lerp, lerpAngle } from '../core/math';
import { ELEMENT_ORDER, ELEMENTS, type ElementId } from '../data/elements';
import { ENEMIES } from '../data/enemies';
import { TOWERS, type TowerId } from '../data/towers';
import type { Tower } from '../sim/entities';
import { Ev, type GameEvent } from '../sim/events';
import type { Game } from '../sim/Game';
import { F_WATER, F_BUILD } from '../sim/grid';
import { enemyTexName, heroTexName, projectileName, towerBaseName, towerHeadName, type Atlas } from './atlas/bake';
import { Camera, type Insets } from './Camera';
import { FloatingText, NUM_FONT } from './FloatingText';
import { paintMap, TILE } from './MapPainter';
import { Particles } from './Particles';
import type { QualityProfile } from './quality';
import { Rng } from '../core/rng';

interface EnemyView {
  body: Sprite;
  shadow: Sprite;
  hpBg: Sprite;
  hpFill: Sprite;
  shield: Sprite;
  extra: Sprite;
  /** Breakable barrier bubble + its bar, and the resisted-element token. */
  barrier: Sprite;
  barFill: Sprite;
  resist: Sprite;
  /** Prism Mark target reticle. */
  mark: Sprite;
  stamp: number;
  numCooldown: number;
  /** Hit-flash timing (flash safety: at most ~3 per second per construct). */
  flashUntil: number;
  nextFlash: number;
}

/** A telegraphed attack: danger ring that fills over the wind-up. */
interface WarnView {
  ring: Sprite;
  fill: Sprite;
  icon: Sprite;
  x: number;
  y: number;
  r: number;
  t: number;
  dur: number;
  slot: number;
}

interface TowerView {
  base: Sprite;
  head: Sprite;
  beam: Sprite | null;
  beamGlow: Sprite | null;
  level: number;
  spec: number;
  stamp: number;
  angle: number;
  off: Sprite | null;
}

interface ProjView {
  sprite: Sprite;
  glow: Sprite;
  shadow: Sprite;
  stamp: number;
  style: string;
}

interface ZoneView {
  sprite: Sprite;
  stamp: number;
}

export interface ViewSettings {
  shake: boolean;
  damageNumbers: boolean;
  /** No shake, wobble or hit flashes; dimmer, fewer bursts. */
  reducedMotion: boolean;
}

const WHITE = 0xffffff;
/** Constructs are drawn a little larger than their hit radius so they read well on phones. */
const ENEMY_DRAW_SCALE = 1.22;

// Small cached number strings for floating text (avoids building strings every hit).
const NUM_CACHE: string[] = [];
const PLUS_CACHE: string[] = [];
const num = (n: number): string => (n < 1000 ? (NUM_CACHE[n] ??= String(n)) : String(n));
const plus = (n: number): string => (n < 1000 ? (PLUS_CACHE[n] ??= `+${n}`) : `+${n}`);

/**
 * Pixi presentation of a running Game. Reads sim state every frame (with
 * interpolation) and turns sim events into particles, text and shake.
 */
export class WorldView {
  readonly world = new Container();
  readonly camera: Camera;
  private readonly L = {
    terrain: new Container(),
    ambient: new Container(),
    path: new Container(),
    zone: new Container(),
    mark: new Container(),
    shadow: new Container(),
    base: new Container(),
    enemy: new Container(),
    head: new Container(),
    proj: new Container(),
    air: new Container(),
    hp: new Container(),
    glow: new Container(),
    ghost: new Container(),
  };
  private particles: Particles;
  private particlesAdd: Particles;
  private text: FloatingText;

  private enemyViews: (EnemyView | undefined)[] = [];
  private towerViews = new Map<number, TowerView>();
  private projViews: (ProjView | undefined)[] = [];
  private zoneViews: (ZoneView | undefined)[] = [];
  private stamp = 0;
  private time = 0;
  private terrainTex: Texture | null = null;
  private castle: Sprite;
  private castleGlow: Sprite;
  private dynamicViews: { sprite: Sprite; kind: string }[] = [];
  private gateViews: Sprite[] = [];
  private terrainSeen = -1;

  /** Show the current state of bridges, rubble and crystal growth. */
  private syncTerrain(): void {
    const g = this.game.grid;
    if (this.terrainSeen === g.terrainVersion) return;
    this.terrainSeen = g.terrainVersion;
    for (const v of this.dynamicViews) {
      switch (v.kind) {
        case 'bridgeA':
          v.sprite.visible = g.bridgePhase === 0;
          break;
        case 'bridgeB':
          v.sprite.visible = g.bridgePhase === 1;
          break;
        case 'rubble':
          v.sprite.visible = !g.shifted;
          break;
        case 'unstable':
          v.sprite.visible = g.shifted;
          break;
      }
    }
  }
  private portals: Sprite[] = [];
  private ambientSprites: { s: Sprite; phase: number; kind: 0 | 1; baseY: number }[] = [];

  // overlays
  private rangeG = new Graphics();
  private cellMark: Sprite;
  private ghostBase: Sprite;
  private ghostHead: Sprite;
  private selectRing: Sprite;
  private hint: Sprite;
  private pathDots: Sprite[] = [];
  private pathVersion = -1;
  private pathPreview: number[][] | null = null;
  private paths: number[][] = [];
  selected: Tower | null = null;

  // texture lookups cached so the per-frame sync never builds strings
  private etex: Record<string, Record<string, Texture[]>> = {};
  private shieldTex = {} as Record<ElementId, Texture>;
  private pelTex = {} as Record<ElementId, Texture>;
  private stunTex: Texture;
  private shardTex: Texture;
  private ringTex: Texture;
  private dotTex: Texture;
  private coinTex: Texture;
  private killStreak = 0;
  private killWindow = -1;
  private killX = 0;
  private killY = 0;
  private lastStreakText = -1;

  private shake = 0;
  private shakeRng = new Rng(7);
  private fxRng = new Rng(99);
  private castleHurt = 0;
  /** Shared budget for big bright bursts (≤ 3 full-brightness flashes per second). */
  readonly flashes = new FlashLimiter();

  constructor(
    private readonly atlas: Atlas,
    private readonly game: Game,
    private quality: QualityProfile,
    public settings: ViewSettings,
    bakeScale: number,
    maxTexture: number,
  ) {
    const g = game.grid;
    for (const el of ELEMENT_ORDER) {
      this.shieldTex[el] = atlas.get(`shield_${el}`);
      this.pelTex[el] = atlas.get(`pel_${el}`);
    }
    this.stunTex = atlas.get('stun');
    this.shardTex = atlas.get('shard');
    this.ringTex = atlas.get('ring');
    this.dotTex = atlas.get('dot');
    this.coinTex = atlas.get('coin');
    this.camera = new Camera(this.world, g.cols * TILE, g.rows * TILE);
    for (const layer of Object.values(this.L)) this.world.addChild(layer);
    this.L.glow.blendMode = 'add';
    // Render groups: camera pan/zoom/shake becomes a single GPU transform, and the
    // busy layers (sprites appearing/disappearing every frame) only rebuild their
    // own draw lists instead of the whole scene.
    this.world.isRenderGroup = true;
    for (const layer of [this.L.shadow, this.L.enemy, this.L.air, this.L.hp, this.L.proj, this.L.glow, this.L.zone, this.L.path]) layer.isRenderGroup = true;

    // Terrain: one baked sprite
    const scale = Math.max(0.75, Math.min(bakeScale, (maxTexture - 16) / (Math.max(g.cols, g.rows) * TILE)));
    const canvas = paintMap(game.map, scale);
    this.terrainTex = new Texture({ source: new CanvasSource({ resource: canvas, resolution: scale, autoGenerateMipmaps: true }) });
    this.L.terrain.addChild(new Sprite(this.terrainTex));

    // Particles: normal + additive, both sharing the fx atlas page
    const firstFx = atlas.get('dot');
    this.particles = new Particles(firstFx, quality.particles);
    this.particlesAdd = new Particles(firstFx, Math.round(quality.particles * 0.6), true);
    this.world.addChildAt(this.particles.container, this.world.getChildIndex(this.L.glow));
    this.world.addChildAt(this.particlesAdd.container, this.world.getChildIndex(this.L.glow) + 1);
    this.text = new FloatingText(quality.floatingText);
    this.text.container.isRenderGroup = true;
    this.world.addChild(this.text.container);

    // Portals & castle
    for (const sp of g.spawns) {
      const s = new Sprite(atlas.get('portal'));
      s.position.set((g.cellX(sp) + 0.5) * TILE, (g.cellY(sp) + 0.5) * TILE);
      this.L.base.addChild(s);
      this.portals.push(s);
    }
    this.castleGlow = new Sprite(atlas.get('glow'));
    this.castleGlow.anchor.set(0.5);
    this.castleGlow.tint = 0x8ff3ff;
    this.castleGlow.position.set(g.castleX * TILE, (g.castleY - 0.6) * TILE);
    this.castleGlow.scale.set(2.2);
    this.castleGlow.alpha = 0.5;
    this.L.glow.addChild(this.castleGlow);
    this.castle = new Sprite(atlas.get('castle'));
    this.castle.position.set(g.castleX * TILE, (g.castleY + 0.75) * TILE);
    const castleScale = Math.min(1.05, (2 * TILE) / 120);
    this.castle.scale.set(castleScale);
    this.L.head.addChild(this.castle);
    // second citadel (Twin Bastions)
    for (const c of g.castles.slice(1)) {
      const glow2 = new Sprite(atlas.get('glow'));
      glow2.anchor.set(0.5);
      glow2.tint = 0x8ff3ff;
      glow2.position.set(c.x * TILE, (c.y - 0.6) * TILE);
      glow2.scale.set(2.2);
      glow2.alpha = 0.45;
      this.L.glow.addChild(glow2);
      const c2 = new Sprite(atlas.get('castle'));
      c2.position.set(c.x * TILE, (c.y + 0.75) * TILE);
      c2.scale.set(castleScale);
      this.L.head.addChild(c2);
    }
    // terrain that changes during the match: drawbridges, rubble, crystal growth; animated gates
    for (const d of g.dynamic) {
      const tex = d.kind === 'bridgeA' || d.kind === 'bridgeB' ? 'bridge' : d.kind === 'rubble' ? 'rubble' : 'growth';
      const sp = new Sprite(atlas.get(tex));
      sp.anchor.set(0.5);
      sp.position.set((g.cellX(d.cell) + 0.5) * TILE, (g.cellY(d.cell) + 0.5) * TILE);
      if (tex === 'growth') sp.tint = 0xff9be6;
      (d.kind === 'bridgeA' || d.kind === 'bridgeB' ? this.L.ambient : this.L.base).addChild(sp);
      this.dynamicViews.push({ sprite: sp, kind: d.kind });
    }
    for (const tp of g.teleports) {
      for (const [cell, tint] of [
        [tp.from, 0xffc845],
        [tp.to, 0x3ee6ff],
      ] as const) {
        const sp = new Sprite(atlas.get('portal'));
        sp.anchor.set(0.5);
        sp.position.set((g.cellX(cell) + 0.5) * TILE, (g.cellY(cell) + 0.5) * TILE);
        sp.scale.set(0.72);
        sp.tint = tint;
        this.L.ambient.addChild(sp);
        this.gateViews.push(sp);
      }
    }
    if (g.skyPath.length) {
      const sp = new Sprite(atlas.get('portal'));
      sp.anchor.set(0.5);
      sp.position.set((g.cellX(g.skyPath[0]!) + 0.5) * TILE, (g.cellY(g.skyPath[0]!) + 0.5) * TILE);
      sp.tint = 0xb07cff;
      this.L.ambient.addChild(sp);
      this.gateViews.push(sp);
    }
    this.syncTerrain();

    // Overlays
    this.cellMark = new Sprite(atlas.get('cell_ok'));
    this.cellMark.visible = false;
    this.L.mark.addChild(this.rangeG, this.cellMark);
    this.ghostBase = new Sprite(Texture.EMPTY);
    this.ghostHead = new Sprite(Texture.EMPTY);
    this.ghostBase.anchor.set(0.5);
    this.ghostHead.anchor.set(0.5);
    this.ghostBase.alpha = this.ghostHead.alpha = 0.7;
    this.ghostBase.visible = this.ghostHead.visible = false;
    this.selectRing = new Sprite(atlas.get('select'));
    this.selectRing.visible = false;
    this.hint = new Sprite(atlas.get('cell_ok'));
    this.hint.anchor.set(0.5);
    this.hint.visible = false;
    this.L.ghost.addChild(this.ghostBase, this.ghostHead, this.selectRing, this.hint);

    this.buildAmbient();
    this.setQuality(quality);
  }

  layout(w: number, h: number, insets: Insets, keepZoom: boolean): void {
    this.camera.fit(w, h, insets, keepZoom);
  }

  setQuality(q: QualityProfile): void {
    this.quality = q;
    this.particles.budget = q.particles;
    this.particlesAdd.budget = Math.round(q.particles * 0.6);
    this.text.budget = q.floatingText;
    this.L.glow.visible = q.glow;
    this.L.ambient.visible = q.ambient;
  }

  // =========================================================== ambient

  private buildAmbient(): void {
    const g = this.game.grid;
    const rng = new Rng(3);
    const water: number[] = [];
    const grass: number[] = [];
    for (let i = 0; i < g.cols * g.rows; i++) {
      if (g.flags[i]! & F_WATER) water.push(i);
      else if (g.flags[i]! & F_BUILD && rng.chance(0.12)) grass.push(i);
    }
    rng.shuffle(water);
    for (const i of water.slice(0, 24)) {
      for (let k = 0; k < 2; k++) {
        const s = new Sprite(this.atlas.get('sparkle'));
        s.anchor.set(0.5);
        s.position.set((g.cellX(i) + rng.range(0.2, 0.8)) * TILE, (g.cellY(i) + rng.range(0.2, 0.8)) * TILE);
        s.scale.set(rng.range(0.35, 0.6));
        s.tint = 0xe0f8ff;
        this.L.ambient.addChild(s);
        this.ambientSprites.push({ s, phase: rng.range(0, 6.28), kind: 0, baseY: s.y });
      }
    }
    const tuftTint =
      this.game.map.theme === 'snow' ? 0xdfeaf6 : this.game.map.theme === 'caves' ? 0x9a86e0 : this.game.map.theme === 'desert' ? 0xb8a060 : 0x5fbf8a;
    for (const i of rng.shuffle(grass).slice(0, 26)) {
      const s = new Sprite(this.atlas.get('tuft'));
      s.anchor.set(0.5, 1);
      s.position.set((g.cellX(i) + rng.range(0.15, 0.85)) * TILE, (g.cellY(i) + rng.range(0.3, 0.9)) * TILE);
      s.tint = tuftTint;
      s.scale.set(rng.range(0.7, 1));
      this.L.ambient.addChild(s);
      this.ambientSprites.push({ s, phase: rng.range(0, 6.28), kind: 1, baseY: s.y });
    }
  }

  // =========================================================== per-frame sync

  /**
   * @param alpha interpolation factor between the last two sim ticks
   * @param dt real seconds since last frame
   * @param gameDt game seconds (dt × speed, 0 while paused)
   */
  render(alpha: number, dt: number, gameDt: number): void {
    this.time += dt;
    this.stamp++;
    const a = Math.max(0, Math.min(1, alpha));
    this.syncEnemies(a, gameDt);
    this.syncHero(a, gameDt);
    this.syncTowers(a);
    this.syncProjectiles(a);
    this.syncZones(gameDt);
    this.syncWarns(dt);
    this.syncPath();
    this.animateScene(dt);
    this.particles.update(gameDt > 0 ? gameDt : 0);
    this.particlesAdd.update(gameDt > 0 ? gameDt : 0);
    this.text.update(dt);
    // shake
    if (this.shake > 0 && this.settings.shake && !this.settings.reducedMotion) {
      this.shake = Math.max(0, this.shake - dt * 18);
      this.camera.shakeX = (this.shakeRng.next() - 0.5) * this.shake * 2;
      this.camera.shakeY = (this.shakeRng.next() - 0.5) * this.shake * 2;
      this.camera.apply();
    } else if (this.camera.shakeX || this.camera.shakeY) {
      this.camera.shakeX = this.camera.shakeY = 0;
      this.shake = 0;
      this.camera.apply();
    }
  }

  private enemyView(slot: number): EnemyView {
    let v = this.enemyViews[slot];
    if (v) return v;
    const shadow = new Sprite(this.atlas.get('shadow'));
    const body = new Sprite(this.atlas.get('e_gloop'));
    const hpBg = new Sprite(this.atlas.get('hpbar'));
    const hpFill = new Sprite(this.atlas.get('hpbar'));
    const shield = new Sprite(this.atlas.get('shield_fire'));
    const extra = new Sprite(this.atlas.get('stun'));
    shadow.anchor.set(0.5);
    shield.anchor.set(0.5);
    extra.anchor.set(0.5);
    hpBg.tint = 0x2a1446;
    hpBg.alpha = 0.85;
    this.L.shadow.addChild(shadow);
    this.L.hp.addChild(hpBg, hpFill, extra);
    const barrier = new Sprite(this.atlas.get('barrier'));
    barrier.anchor.set(0.5);
    barrier.tint = 0x8ff3ff;
    const barFill = new Sprite(this.atlas.get('hpbar'));
    barFill.tint = 0x3ee6ff;
    const resist = new Sprite(this.atlas.get('resist_fire'));
    resist.anchor.set(0.5);
    const mark = new Sprite(this.atlas.get('select'));
    mark.anchor.set(0.5);
    mark.tint = 0xff4d6a;
    barrier.visible = barFill.visible = resist.visible = mark.visible = false;
    this.L.hp.addChild(barFill, resist);
    this.L.mark.addChild(mark);
    v = { body, shadow, hpBg, hpFill, shield, extra, barrier, barFill, resist, mark, stamp: 0, numCooldown: 0, flashUntil: 0, nextFlash: 0 };
    this.enemyViews[slot] = v;
    return v;
  }

  private enemyTexture(defId: string, el: ElementId | null, frame: number): Texture {
    const byEl = (this.etex[defId] ??= {});
    const k = el ?? '_';
    let arr = byEl[k];
    if (!arr) {
      const f0 = this.atlas.get(enemyTexName(defId, el, 0));
      const f1 = this.atlas.tex[enemyTexName(defId, el, 1)] ?? f0;
      arr = byEl[k] = [f0, f1];
    }
    return arr[frame]!;
  }

  private hideEnemyView(v: EnemyView): void {
    v.body.visible = v.shadow.visible = v.hpBg.visible = v.hpFill.visible = v.shield.visible = v.extra.visible = false;
    v.barrier.visible = v.barFill.visible = v.resist.visible = v.mark.visible = false;
  }

  private syncEnemies(a: number, gameDt: number): void {
    const t = this.time;
    for (const e of this.game.enemies) {
      if (!e.alive) continue;
      const v = this.enemyView(e.slot);
      v.stamp = this.stamp;
      if (v.numCooldown > 0) v.numCooldown -= gameDt;
      const def = e.def;
      // texture (element variants, bat flap frames)
      const flaps = def.look === 'wisp' || def.look === 'drone' || def.look === 'phantom' || def.look === 'jammer';
      const frame = flaps && Math.floor(t * (def.look === 'drone' || def.look === 'jammer' ? 14 : 6) + e.slot) % 2 === 1 ? 1 : 0;
      const tex = this.enemyTexture(def.id, def.elemental ? e.element : null, frame);
      if (v.body.texture !== tex) v.body.texture = tex;
      const parent = e.flying ? this.L.air : this.L.enemy;
      if (v.body.parent !== parent) parent.addChild(v.body);
      if (v.shield.parent !== parent) parent.addChild(v.shield);
      if (v.barrier.parent !== parent) parent.addChild(v.barrier);

      const x = (lerp(e.px, e.x, a) + e.laneX) * TILE;
      const y = (lerp(e.py, e.y, a) + e.laneY) * TILE;
      const R = e.radius * TILE;
      if (e.burrowed) {
        // underground: only a moving mound of rubble shows
        this.hideEnemyView(v);
        v.shadow.visible = true;
        v.shadow.position.set(x, y + R * 0.2);
        v.shadow.scale.set((R * 2.4) / 48, (R * 1.6) / 20);
        v.shadow.alpha = 0.55 + Math.sin(t * 12 + e.slot) * 0.1;
        if (gameDt > 0 && this.fxRng.chance(gameDt * 14)) {
          const o = this.particles.begin(this.shardTex, x + this.fxRng.range(-R, R), y + this.fxRng.range(-R, R) * 0.4);
          o.vy = -this.fxRng.range(20, 60);
          o.gravity = 260;
          o.life = 0.45;
          o.scale = 0.6;
          o.scaleEnd = 0.2;
          o.rotation = this.fxRng.range(0, 6.28);
          o.tint = 0xb08a5a;
          this.particles.emit(o);
        }
        continue;
      }
      const phase = t * 9 + e.slot * 1.7;
      let sx = 1;
      let sy = 1;
      let lift = 0;
      let rot = 0;
      const stunned = e.stunTime > 0;
      if (!stunned) {
        switch (def.look) {
          case 'beetle':
            // quick scuttle
            rot = Math.sin(phase * 2.4) * 0.035;
            lift = Math.abs(Math.sin(phase * 2.4)) * 1.2;
            break;
          case 'geode':
          case 'golem': {
            // heavy stomp
            const s = Math.abs(Math.sin(phase * 0.9));
            lift = s * 2.2;
            rot = Math.sin(phase * 0.9) * 0.03;
            break;
          }
          case 'drone':
            lift = 3 + Math.sin(phase * 0.8) * 2;
            rot = Math.sin(phase * 0.5) * 0.05;
            break;
          case 'wisp':
          case 'mender':
          case 'sentinel':
            lift = Math.sin(phase * 0.6) * 3.5;
            break;
          case 'archon':
            lift = Math.sin(phase * 0.35) * 3;
            break;
        }
      } else if (!this.settings.reducedMotion) rot = Math.sin(t * 20) * 0.12;
      const pop = e.spawnAge < 0.25 ? easeOutBack(e.spawnAge / 0.25) : 1;
      const fly = e.flying ? 22 : 0;
      v.body.visible = true;
      v.body.position.set(x, y - lift - fly);
      v.body.scale.set(sx * pop * e.facing * ENEMY_DRAW_SCALE, sy * pop * ENEMY_DRAW_SCALE);
      v.body.rotation = rot;
      // status tint (colour + particles; shapes come from icons/particles too)
      let tint = WHITE;
      // hit flash: spaced out per construct, off with reduced motion
      if (e.hitFlash > 0 && t >= v.nextFlash && !this.settings.reducedMotion) {
        v.flashUntil = t + 0.08;
        v.nextFlash = t + MIN_FLASH_GAP;
      }
      if (t < v.flashUntil) tint = 0xfff2f2;
      else if (stunned) tint = 0xfff0a0;
      else if (e.slowTime > 0) tint = 0xa8dcff;
      else if (e.poisonTime > 0) tint = 0xc8ff9e;
      else if (e.burnTime > 0) tint = 0xffc49e;
      // wind-up telegraph: a smooth glow (never an on/off flicker)
      if (e.windup > 0) tint = this.settings.reducedMotion ? 0xffb0bc : mixColor(WHITE, 0xffb0bc, pulse(t, MAX_PULSE_HZ));
      v.body.tint = tint;
      // cloaked: a faint shimmer unless a detector reveals it
      const hidden = e.cloaked && e.revealed <= 0;
      v.body.alpha = hidden ? 0.16 + Math.sin(t * 7 + e.slot) * 0.06 : e.cloaked ? 0.85 : 1;

      v.shadow.visible = true;
      v.shadow.position.set(x, y + R * 0.55);
      const ss = (R * 2.1) / 48 / (e.flying ? 1.4 : 1);
      v.shadow.scale.set(ss, ss);
      v.shadow.alpha = e.flying ? 0.45 : 0.7;

      v.shadow.alpha *= hidden ? 0.3 : 1;
      if (e.barrier > 0) {
        v.barrier.visible = true;
        v.barrier.position.set(x, y - lift - fly - R * 0.1);
        v.barrier.scale.set(((R * 2.9) / 72) * pop * (1 + Math.sin(t * 5 + e.slot) * 0.02));
        v.barrier.alpha = (0.45 + 0.5 * (e.barrier / Math.max(1, e.barrierMax))) * (hidden ? 0.2 : 1);
      } else v.barrier.visible = false;
      if (e.shield) {
        v.shield.visible = true;
        v.shield.texture = this.shieldTex[e.shield];
        v.shield.position.set(x, y - lift - fly - R * 0.1);
        v.shield.scale.set(((R * 2.6) / 64) * pop);
      } else v.shield.visible = false;

      // hp bar
      if (e.hp < e.maxHp) {
        const w = e.boss ? 64 : 34;
        const frac = Math.max(0, e.hp / e.maxHp);
        const by = y - fly - R * 1.35 - (e.boss ? 18 : 8);
        v.hpBg.visible = v.hpFill.visible = true;
        v.hpBg.position.set(x - w / 2 - 1, by);
        v.hpBg.scale.set((w + 2) / 32, e.boss ? 1.5 : 1.15);
        v.hpFill.position.set(x - w / 2, by);
        v.hpFill.scale.set((w * frac) / 32, e.boss ? 1.1 : 0.85);
        v.hpFill.tint = frac > 0.6 ? 0x6cf06a : frac > 0.3 ? 0xffd23f : 0xff5a6a;
      } else v.hpBg.visible = v.hpFill.visible = false;
      const barW = e.boss ? 64 : 34;
      const barY = y - fly - R * 1.35 - (e.boss ? 18 : 8);
      if (e.barrier > 0 && !hidden) {
        v.barFill.visible = true;
        v.barFill.position.set(x - barW / 2, barY - (e.boss ? 9 : 6));
        v.barFill.scale.set((barW * (e.barrier / Math.max(1, e.barrierMax))) / 32, e.boss ? 0.8 : 0.6);
      } else v.barFill.visible = false;
      if (e.resist && !hidden) {
        v.resist.visible = true;
        v.resist.texture = this.atlas.get(`resist_${e.resist}`);
        v.resist.position.set(x + barW / 2 + 9, barY + 2);
      } else v.resist.visible = false;
      if (hidden) v.hpBg.visible = v.hpFill.visible = false;
      if (e.markTime > 0 && !hidden) {
        v.mark.visible = true;
        v.mark.position.set(x, y - fly);
        v.mark.rotation = t * 2;
        v.mark.scale.set((R * 3.2) / 96);
      } else v.mark.visible = false;

      // extra: stun stars or Archon Null's element core
      if (stunned) {
        v.extra.visible = true;
        v.extra.texture = this.stunTex;
        v.extra.position.set(x + Math.cos(t * 8) * R * 0.6, y - fly - R * 1.2 + Math.sin(t * 8) * 3);
        v.extra.scale.set(1.1);
        v.extra.tint = WHITE;
      } else if (def.shiftElement && e.element) {
        v.extra.visible = true;
        v.extra.texture = this.pelTex[e.element];
        // the live element core sits in Archon Null's chest slot
        v.extra.position.set(x, y - lift - fly);
        v.extra.scale.set(1.2 + Math.sin(t * 6) * 0.06);
      } else v.extra.visible = false;

      // trailing status particles (cheap, budgeted)
      if (gameDt > 0 && !hidden && this.fxRng.chance(gameDt * 6)) {
        if (e.regenPct > 0 && e.hp < e.maxHp && e.sinceHit >= e.regenDelay && e.burnTime <= 0 && e.poisonTime <= 0) this.emitStatus(x, y - fly, R, 0x3dffa0, 'sparkle', true);
        else if (e.burnTime > 0) this.emitStatus(x, y - fly, R, 0xff8a3a, 'dot', true);
        else if (e.poisonTime > 0) this.emitStatus(x, y - fly, R, 0x8ae04a, 'dot', false);
        else if (e.slowTime > 0) this.emitStatus(x, y - fly, R, 0xbfe8ff, 'sparkle', true);
      }
    }
    for (let i = 0; i < this.enemyViews.length; i++) {
      const v = this.enemyViews[i];
      if (v && v.stamp !== this.stamp && v.body.visible) this.hideEnemyView(v);
    }
  }

  private emitStatus(x: number, y: number, R: number, tint: number, tex: string, add: boolean): void {
    const ps = add ? this.particlesAdd : this.particles;
    {
      const o = ps.begin(this.atlas.get(tex), x + this.fxRng.range(-R, R) * 0.6, y + this.fxRng.range(-R, R) * 0.4);
      o.vy = -30;
      o.life = 0.5;
      o.scale = 0.5;
      o.scaleEnd = 0.15;
      o.tint = tint;
      o.alpha = 0.9;
      ps.emit(o);
    }
  }

  private syncTowers(a: number): void {
    void a;
    for (const t of this.game.towers) {
      let v = this.towerViews.get(t.id);
      if (!v) {
        const base = new Sprite(this.atlas.get(towerBaseName(t.def.id, t.level)));
        const head = new Sprite(this.atlas.get(towerHeadName(t.def.id, t.level, t.spec)));
        base.position.set(t.x * TILE, t.y * TILE);
        head.position.set(t.x * TILE, t.y * TILE - 4);
        this.L.base.addChild(base);
        this.L.head.addChild(head);
        v = { base, head, beam: null, beamGlow: null, level: t.level, spec: t.spec, stamp: 0, angle: t.angle, off: null };
        if (t.def.behavior === 'beam') {
          v.beam = new Sprite(this.atlas.get('beam'));
          v.beamGlow = new Sprite(this.atlas.get('glow'));
          v.beamGlow.anchor.set(0.5);
          v.beam.visible = v.beamGlow.visible = false;
          this.L.glow.addChild(v.beam, v.beamGlow);
        }
        this.towerViews.set(t.id, v);
      }
      v.stamp = this.stamp;
      if (v.level !== t.level || v.spec !== t.spec) {
        v.level = t.level;
        v.spec = t.spec;
        v.base.texture = this.atlas.get(towerBaseName(t.def.id, t.level));
        v.head.texture = this.atlas.get(towerHeadName(t.def.id, t.level, t.spec));
      }
      // build / upgrade pop
      const k = t.sinceBuild < 0.4 ? easeOutBack(t.sinceBuild / 0.4) : 1;
      v.base.scale.set(0.6 + 0.4 * k);
      // head: rotate toward target, recoil after firing, idle bob otherwise
      let hx = t.x * TILE;
      let hy = t.y * TILE - 4;
      if (t.def.rotates) {
        v.angle = lerpAngle(v.angle, t.angle, 0.35);
        v.head.rotation = v.angle;
        if (t.sinceFire < 0.12) {
          const r = (1 - t.sinceFire / 0.12) * 5;
          hx -= Math.cos(v.angle) * r;
          hy -= Math.sin(v.angle) * r;
        }
        v.head.scale.set(k);
      } else {
        const bob = Math.sin(this.time * 2.4 + t.id) * 1.5;
        hy += bob;
        const punch = t.sinceFire < 0.15 ? 1 + (1 - t.sinceFire / 0.15) * 0.12 : 1;
        v.head.scale.set(k * punch);
        v.head.rotation = 0;
      }
      v.head.position.set(hx, hy);
      // knocked offline by a jammer or boss attack
      if (t.disabled > 0) {
        if (!v.off) {
          v.off = new Sprite(this.atlas.get('offline'));
          v.off.anchor.set(0.5);
          this.L.hp.addChild(v.off);
        }
        v.off.visible = true;
        v.off.position.set(t.x * TILE + 16, t.y * TILE - 26);
        v.head.tint = 0x6b7390;
        v.base.tint = 0x8a90a8;
      } else if (v.off?.visible) {
        v.off.visible = false;
        v.head.tint = WHITE;
        v.base.tint = WHITE;
      }

      if (v.beam && v.beamGlow) {
        const tg = t.beamTarget;
        if (tg && tg.alive && tg.id === t.beamTargetId) {
          const tx = (tg.x + tg.laneX) * TILE;
          const ty = (tg.y + tg.laneY) * TILE - (tg.flying ? 22 : 0);
          const sx = hx + Math.cos(v.angle) * 22;
          const sy = hy + Math.sin(v.angle) * 22;
          const dx = tx - sx;
          const dy = ty - sy;
          const len = Math.hypot(dx, dy);
          const st = t.stats;
          const ramp = Math.min(1, t.beamTime / (st.beamRampTime ?? 3));
          v.beam.visible = v.beamGlow.visible = true;
          v.beam.position.set(sx, sy);
          v.beam.rotation = Math.atan2(dy, dx);
          v.beam.scale.set(len / 32, 0.55 + ramp * 0.9 + (this.settings.reducedMotion ? 0 : Math.sin(this.time * 9) * 0.06));
          // gold ↔ violet as a slow blend (was a 5 Hz flicker)
          v.beam.tint = mixColor(0xc49bff, 0xffe66b, pulse(this.time + t.id * 0.37, 1.2));
          v.beamGlow.position.set(tx, ty);
          v.beamGlow.scale.set(0.45 + ramp * 0.5);
          v.beamGlow.tint = 0xfff3b0;
        } else v.beam.visible = v.beamGlow.visible = false;
      }
    }
    if (this.towerViews.size !== this.game.towers.length) {
      for (const [id, v] of this.towerViews) {
        if (v.stamp === this.stamp) continue;
        v.base.destroy();
        v.head.destroy();
        v.beam?.destroy();
        v.beamGlow?.destroy();
        v.off?.destroy();
        this.towerViews.delete(id);
      }
    }
  }

  private syncProjectiles(a: number): void {
    // Crowded screens: skip per-shot glow sprites and ration trail particles.
    const crowded = this.game.projectiles.length > 160;
    let trails = this.quality.tier === 'low' ? 0 : 24;
    for (const p of this.game.projectiles) {
      let v = this.projViews[p.slot];
      if (!v) {
        const sprite = new Sprite(this.atlas.get('p_arrow'));
        sprite.anchor.set(0.5);
        const glow = new Sprite(this.atlas.get('glow'));
        glow.anchor.set(0.5);
        const shadow = new Sprite(this.atlas.get('shadow'));
        shadow.anchor.set(0.5);
        this.L.proj.addChild(sprite);
        this.L.glow.addChild(glow);
        this.L.shadow.addChild(shadow);
        v = { sprite, glow, shadow, stamp: 0, style: '' };
        this.projViews[p.slot] = v;
      }
      v.stamp = this.stamp;
      if (v.style !== p.style) {
        v.style = p.style;
        v.sprite.texture = this.atlas.get(projectileName(p.style));
        const el = p.elements[0];
        v.glow.tint = el ? ELEMENTS[el].light : 0xfff6d0;
      }
      const x = lerp(p.px, p.x, a) * TILE;
      const y = lerp(p.py, p.y, a) * TILE;
      const lift = p.lob ? p.z * TILE * 0.6 : 10;
      v.sprite.visible = true;
      v.sprite.position.set(x, y - lift);
      v.sprite.rotation = p.style === 'bubble' || p.style === 'steamPuff' ? 0 : p.angle;
      v.sprite.scale.set(p.lob ? 1 + p.z * 0.25 : p.crit ? 1.3 : 1);
      const glowy = (p.elements.length > 0 && !crowded) || p.style === 'flare';
      if (v.glow.visible !== glowy) v.glow.visible = glowy;
      if (glowy) {
        v.glow.position.set(x, y - lift);
        v.glow.scale.set(p.style === 'flare' ? 0.6 : 0.36);
        v.glow.alpha = 0.6;
      }
      v.shadow.visible = p.lob;
      if (p.lob) {
        v.shadow.position.set(x, y + 4);
        v.shadow.scale.set(0.5);
      }
      // little trails for elemental shots
      if (trails > 0 && p.elements.length > 0 && this.fxRng.chance(0.35)) {
        trails--;
        const o = this.particlesAdd.begin(this.atlas.get('dot'), x, y - lift);
        o.life = 0.25;
        o.scale = 0.7;
        o.scaleEnd = 0.1;
        o.tint = v.glow.tint;
        o.alpha = 0.7;
        this.particlesAdd.emit(o);
      }
    }
    for (const v of this.projViews) {
      if (v && v.stamp !== this.stamp && v.sprite.visible) v.sprite.visible = v.glow.visible = v.shadow.visible = false;
    }
  }

  private syncZones(gameDt: number): void {
    for (const z of this.game.zones) {
      let v = this.zoneViews[z.slot];
      if (!v) {
        const sprite = new Sprite(this.atlas.get('glow'));
        sprite.anchor.set(0.5);
        this.L.zone.addChild(sprite);
        v = { sprite, stamp: 0 };
        this.zoneViews[z.slot] = v;
      }
      v.stamp = this.stamp;
      const lava = z.look === 'lava';
      const fade = Math.min(1, z.time / 0.5, (z.maxTime - z.time) / 0.25 + 0.2);
      v.sprite.visible = true;
      v.sprite.texture = this.atlas.get('field');
      v.sprite.position.set(z.x * TILE, z.y * TILE);
      const size = (z.r * 2 * TILE) / 88;
      v.sprite.scale.set(size * (1 + Math.sin(this.time * 4 + z.slot) * 0.03), size * 0.8);
      v.sprite.tint = lava ? 0xff6a2a : z.look === 'chrono' ? 0x9b8cff : 0x8fe8ff;
      v.sprite.alpha = (lava ? 0.8 : 0.6) * fade;
      if (gameDt > 0 && this.fxRng.chance(gameDt * 10)) {
        const ang = this.fxRng.range(0, Math.PI * 2);
        const rr = this.fxRng.range(0, z.r) * TILE;
        {
          const o = this.particles.begin(this.atlas.get(lava ? 'dot' : 'puff'), z.x * TILE + Math.cos(ang) * rr, z.y * TILE + Math.sin(ang) * rr);
          o.vy = lava ? -20 : -16;
          o.life = 0.8;
          o.scale = lava ? 0.6 : 0.3;
          o.scaleEnd = lava ? 0.1 : 0.5;
          o.tint = lava ? 0xffa040 : 0xbff4ff;
          o.alpha = lava ? 0.7 : 0.45;
          this.particles.emit(o);
        }
      }
    }
    for (const v of this.zoneViews) if (v && v.stamp !== this.stamp) v.sprite.visible = false;
  }

  private syncPath(): void {
    const preview = this.pathPreview;
    if (!preview && this.pathVersion === this.game.towerVersion) return;
    const paths = preview ?? this.game.currentPaths(this.paths);
    this.pathVersion = preview ? -1 : this.game.towerVersion;
    const g = this.game.grid;
    let n = 0;
    for (const path of paths) {
      for (let i = 0; i + 1 < path.length; i++) {
        const c0 = path[i]!;
        const c1 = path[i + 1]!;
        if (Math.abs(g.cellX(c0) - g.cellX(c1)) > 1 || Math.abs(g.cellY(c0) - g.cellY(c1)) > 1) continue; // gate jump
        let s = this.pathDots[n];
        if (!s) {
          s = new Sprite(this.atlas.get('chevron'));
          s.anchor.set(0.5);
          this.L.path.addChild(s);
          this.pathDots.push(s);
        }
        n++;
        const x0 = g.cellX(c0) + 0.5;
        const y0 = g.cellY(c0) + 0.5;
        const x1 = g.cellX(c1) + 0.5;
        const y1 = g.cellY(c1) + 0.5;
        s.visible = true;
        s.position.set(((x0 + x1) / 2) * TILE, ((y0 + y1) / 2) * TILE);
        s.rotation = Math.atan2(y1 - y0, x1 - x0);
        s.tint = preview ? 0xffc845 : 0x9ff3ff;
        (s as Sprite & { pathIndex?: number }).pathIndex = i;
      }
    }
    for (let i = n; i < this.pathDots.length; i++) this.pathDots[i]!.visible = false;
  }

  private animateScene(dt: number): void {
    const t = this.time;
    this.syncTerrain();
    for (let i = 0; i < this.gateViews.length; i++) this.gateViews[i]!.rotation = t * (i % 2 ? -1.6 : 1.6);
    // marching chevrons
    for (const s of this.pathDots) {
      if (!s.visible) continue;
      const i = (s as Sprite & { pathIndex?: number }).pathIndex ?? 0;
      s.alpha = (this.pathPreview ? 0.75 : 0.32) + 0.25 * Math.sin(t * 5 - i * 0.7);
    }
    for (const p of this.portals) p.scale.set(1 + Math.sin(t * 3) * 0.05);
    this.castleGlow.alpha = 0.4 + Math.sin(t * 2) * 0.12 + this.castleHurt * 0.8;
    this.castleGlow.tint = this.castleHurt > 0.05 ? 0xff7a9a : 0x8ff3ff;
    if (this.castleHurt > 0) {
      this.castleHurt = Math.max(0, this.castleHurt - dt * 2);
      this.castle.x = this.game.grid.castleX * TILE + (this.settings.reducedMotion ? 0 : Math.sin(t * 60) * this.castleHurt * 4);
    }
    if (this.quality.ambient) {
      for (const a of this.ambientSprites) {
        if (a.kind === 0) {
          a.s.alpha = Math.max(0, Math.sin(t * 1.7 + a.phase)) * 0.9;
          a.s.rotation = t * 0.8 + a.phase;
        } else a.s.skew.x = Math.sin(t * 1.6 + a.phase) * 0.18;
      }
    }
    if (this.selectRing.visible) this.selectRing.rotation = t * 0.6;
    if (this.cellMark.visible) this.cellMark.alpha = 0.75 + Math.sin(t * 6) * 0.2;
    if (this.hint.visible) {
      this.hint.scale.set(1.05 + Math.sin(t * 6) * 0.1);
      this.hint.alpha = 0.7 + Math.sin(t * 6) * 0.3;
      // hide once something is built on it
      const c = this.game.grid.cellAt(this.hint.x / TILE, this.hint.y / TILE);
      if (c >= 0 && this.game.grid.tower[c]! >= 0) this.hint.visible = false;
    }
  }

  // =========================================================== events → FX

  handleEvent(e: GameEvent): void {
    const X = e.x * TILE;
    const Y = e.y * TILE;
    switch (e.type) {
      case Ev.Kill: {
        const def = ENEMIES[e.kind as keyof typeof ENEMIES];
        const el = (e.tag as ElementId) || null;
        const col = el ? ELEMENTS[el].light : def ? def.color : 0xffffff;
        this.shatter(X, Y - 6, col, def?.boss ? 2.2 : def ? 0.7 + def.radius : 1);
        if (e.value > 0) this.text.spawn(plus(e.value), X, Y - 22, e.value2 ? 0xffe27a : 0xffc845, e.value2 ? 0.62 : 0.5, 0.85);
        if (def?.boss) this.addShake(10);
        this.countKill(X, Y);
        break;
      }
      case Ev.Leak:
        this.castleHurt = 1;
        this.addShake(6);
        for (let i = 0; i < 8; i++) {
          const o = this.particles.begin(this.shardTex, X, Y - 20);
          o.vx = this.fxRng.range(-110, 110);
          o.vy = this.fxRng.range(-170, -50);
          o.gravity = 300;
          o.life = 0.8;
          o.scale = 1;
          o.scaleEnd = 0.4;
          o.spin = this.fxRng.range(-8, 8);
          o.tint = 0xff4d6a;
          this.particles.emit(o);
        }
        this.text.spawn(`-${e.value}`, X, Y - 36, 0xff4d6a, 0.75, 1.1);
        break;
      case Ev.Hit: {
        this.sparks(X, Y, (e.tag as ElementId) || null, 3);
        if (this.settings.damageNumbers && e.value >= 1 && !e.value2) {
          const slot = e.id;
          const v = this.enemyViews[slot];
          if (!v || v.numCooldown <= 0) {
            if (v) v.numCooldown = 0.35;
            this.text.spawn(num(Math.round(e.value)), X + this.fxRng.range(-8, 8), Y - 26, WHITE, 0.42, 0.6, -55);
          }
        }
        break;
      }
      case Ev.Splash: {
        const el = (e.tag as ElementId) || null;
        const col = el ? ELEMENTS[el].color : 0xffe0a0;
        const r = e.value * TILE;
        {
          const o = this.particlesAdd.begin(this.atlas.get('ring'), X, Y);
          o.life = 0.35;
          o.scale = (r * 0.5) / 64;
          o.scaleEnd = r / 64;
          o.tint = col;
          o.alpha = 0.9;
          this.particlesAdd.emit(o);
        }
        {
          const o = this.particlesAdd.begin(this.atlas.get('glow'), X, Y);
          o.life = 0.25;
          o.scale = r / 64;
          o.scaleEnd = r / 52;
          o.tint = col;
          o.alpha = 0.55;
          this.particlesAdd.emit(o);
        }
        this.sparks(X, Y, el, 8);
        if (e.kind === 'flare') {
          this.addShake(5);
          {
            const o = this.particlesAdd.begin(this.atlas.get('ring'), X, Y);
            o.life = 0.45;
            o.scale = 0.4;
            o.scaleEnd = 1.6;
            o.tint = 0xffd84a;
            o.alpha = 1;
            this.particlesAdd.emit(o);
          }
        }
        break;
      }
      case Ev.Chain: {
        // a stretched bolt sprite as a short-lived particle
        const el = (e.tag as ElementId) || 'light';
        const dx = (e.x2 - e.x) * TILE;
        const dy = (e.y2 - e.y) * TILE;
        const len = Math.hypot(dx, dy);
        const col = e.kind === 'rainbow' ? [0xff8ad8, 0x8fd8ff, 0xfff27a, 0x9cff7a][e.value % 4]! : ELEMENTS[el].light;
        const bolt = this.atlas.get('bolt');
        // ParticleContainer uses centred anchors, so place the bolt at the segment midpoint
        {
          const o = this.particlesAdd.begin(bolt, X + dx / 2, Y + dy / 2 - 8);
          o.rotation = Math.atan2(dy, dx);
          o.life = 0.18;
          o.scale = Math.max(0.3, len / 96);
          o.scaleEnd = Math.max(0.3, len / 96);
          o.tint = col;
          o.alpha = 1;
          o.alphaEnd = 0.2;
          this.particlesAdd.emit(o);
        }
        this.sparks(e.x2 * TILE, e.y2 * TILE, el, 2);
        break;
      }
      case Ev.Pulse: {
        const el = (e.tag as ElementId) || 'earth';
        const r = e.value * TILE;
        const col = e.kind === 'gravity' ? 0xc49bff : e.kind === 'whirlpool' ? 0x7fd8ff : e.kind === 'quicksand' ? 0xe8c070 : ELEMENTS[el].color;
        {
          const o = this.particlesAdd.begin(this.atlas.get('ring'), X, Y);
          o.life = 0.45;
          o.scale = 0.2;
          o.scaleEnd = (r * 2) / 120;
          o.tint = col;
          o.alpha = 0.95;
          this.particlesAdd.emit(o);
        }
        {
          const o = this.particles.begin(this.atlas.get('ring'), X, Y);
          o.life = 0.6;
          o.scale = 0.15;
          o.scaleEnd = (r * 2) / 128;
          o.tint = col;
          o.alpha = 0.5;
          this.particles.emit(o);
        }
        for (let i = 0; i < 6; i++) {
          const ang = (i / 6) * Math.PI * 2;
          {
            const o = this.particles.begin(this.atlas.get('dot'), X + Math.cos(ang) * 10, Y + Math.sin(ang) * 10);
            o.vx = Math.cos(ang) * r * 1.6;
            o.vy = Math.sin(ang) * r * 1.6;
            o.drag = 4;
            o.life = 0.45;
            o.scale = 0.9;
            o.scaleEnd = 0.2;
            o.tint = col;
            this.particles.emit(o);
          }
        }
        if (e.kind === 'rumble' || e.kind === 'gravity') this.addShake(1.5);
        break;
      }
      case Ev.Fire: {
        if (this.quality.glow && e.tag !== 'arrow' && e.tag !== 'cannonball') {
          const t = TOWERS[e.kind as TowerId];
          const el = t?.elements[0];
          {
            const o = this.particlesAdd.begin(this.atlas.get('glow'), X, Y - 10);
            o.life = 0.18;
            o.scale = 0.35;
            o.scaleEnd = 0.6;
            o.tint = el ? ELEMENTS[el].light : 0xffffff;
            o.alpha = 0.7;
            this.particlesAdd.emit(o);
          }
        }
        break;
      }
      case Ev.Stun:
        for (let i = 0; i < 3; i++) {
          const o = this.particles.begin(this.atlas.get('stun'), X, Y - 20);
          o.vx = this.fxRng.range(-50, 50);
          o.vy = -60;
          o.gravity = 120;
          o.life = 0.5;
          o.scale = 1;
          o.scaleEnd = 0.5;
          this.particles.emit(o);
        }
        break;
      case Ev.Heal:
        if (e.kind === 'heal') {
          {
            const o = this.particlesAdd.begin(this.atlas.get('ring'), X, Y);
            o.life = 0.6;
            o.scale = 0.2;
            o.scaleEnd = (e.value * TILE * 2) / 128;
            o.tint = 0x8cff9e;
            o.alpha = 0.7;
            this.particlesAdd.emit(o);
          }
          for (let i = 0; i < 4; i++) {
            const o = this.particles.begin(this.atlas.get('heart'), X + this.fxRng.range(-20, 20), Y - 10);
            o.vy = -50;
            o.life = 0.7;
            o.scale = 0.6;
            o.scaleEnd = 0.3;
            o.tint = 0x9cffb0;
            this.particles.emit(o);
          }
        } else if (e.kind === 'shift') {
          const el = e.tag as ElementId;
          {
            const o = this.particlesAdd.begin(this.atlas.get('glow'), X, Y - 30);
            o.life = 0.5;
            o.scale = 0.6;
            o.scaleEnd = 1.6;
            o.tint = ELEMENTS[el].color;
            o.alpha = 0.9;
            this.particlesAdd.emit(o);
          }
        }
        break;
      case Ev.ShieldBlock:
        if (this.fxRng.chance(0.35)) this.text.spawn(tr('fx.ward'), X, Y - 30, ELEMENTS[e.tag as ElementId]?.light ?? WHITE, 0.36, 0.5, -30);
        break;
      case Ev.Crit:
        this.text.spawn(tr('fx.crit', { n: num(e.value) }), X, Y - 34, 0xffb347, 0.62, 0.8, -50);
        {
          const o = this.particlesAdd.begin(this.atlas.get('sparkle'), X, Y - 10);
          o.life = 0.4;
          o.scale = 1.4;
          o.scaleEnd = 2.2;
          o.spin = 4;
          o.tint = 0xfff6b0;
          this.particlesAdd.emit(o);
        }
        break;
      case Ev.Build:
      case Ev.Upgrade: {
        const t = TOWERS[e.kind as TowerId];
        const el = t?.elements[0];
        const col = el ? ELEMENTS[el].color : 0xfff0c0;
        {
          const o = this.particlesAdd.begin(this.atlas.get('ring'), X, Y);
          o.life = 0.5;
          o.scale = 0.2;
          o.scaleEnd = 0.8;
          o.tint = col;
          o.alpha = 0.9;
          this.particlesAdd.emit(o);
        }
        for (let i = 0; i < (e.type === Ev.Upgrade ? 14 : 9); i++) {
          const ang = this.fxRng.range(0, Math.PI * 2);
          {
            const o = this.particlesAdd.begin(this.atlas.get(i % 3 === 0 ? 'sparkle' : 'dot'), X, Y);
            o.vx = Math.cos(ang) * 110;
            o.vy = Math.sin(ang) * 110 - 40;
            o.drag = 3;
            o.life = 0.6;
            o.scale = 0.8;
            o.scaleEnd = 0.1;
            o.tint = i % 2 ? col : 0xffffff;
            this.particlesAdd.emit(o);
          }
        }
        if (e.type === Ev.Upgrade) this.text.spawn(tr('fx.level', { n: e.value }), X, Y - 36, 0x3dffa0, 0.5, 1);
        break;
      }
      case Ev.Sell:
        this.text.spawn(`+${e.value}`, X, Y - 20, 0xffd23f, 0.6, 0.9);
        for (let i = 0; i < 6; i++) {
          const o = this.particles.begin(this.atlas.get('coin'), X, Y);
          o.vx = this.fxRng.range(-70, 70);
          o.vy = this.fxRng.range(-200, -100);
          o.gravity = 400;
          o.life = 0.7;
          o.scale = 0.9;
          this.particles.emit(o);
        }
        {
          const o = this.particles.begin(this.atlas.get('puff'), X, Y);
          o.life = 0.5;
          o.scale = 0.6;
          o.scaleEnd = 1.3;
          o.alpha = 0.8;
          this.particles.emit(o);
        }
        break;
      case Ev.Split:
        {
          const o = this.particles.begin(this.atlas.get('puff'), X, Y);
          o.life = 0.4;
          o.scale = 0.4;
          o.scaleEnd = 1;
          o.tint = 0xc8fff0;
          this.particles.emit(o);
        }
        break;
      case Ev.Warn:
        this.addWarn(X, Y, e.value * TILE, e.value2, e.id);
        break;
      case Ev.Teleport:
        for (const [px, py, tint] of [
          [X, Y, 0xffc845],
          [e.x2 * TILE, e.y2 * TILE, 0x3ee6ff],
        ] as const) {
          const o = this.particlesAdd.begin(this.ringTex, px, py);
          o.life = 0.35;
          o.scale = 0.15;
          o.scaleEnd = 0.6;
          o.tint = tint;
          o.alpha = 1;
          this.particlesAdd.emit(o);
        }
        break;
      case Ev.Terrain:
        this.addShake(e.kind === 'shift' ? 8 : 4);
        for (const d of this.game.grid.dynamic) {
          if (!this.fxRng.chance(0.5)) continue;
          this.shatter((this.game.grid.cellX(d.cell) + 0.5) * TILE, (this.game.grid.cellY(d.cell) + 0.5) * TILE, e.kind === 'shift' ? 0xff9be6 : 0xffc845, 0.6);
        }
        break;
      case Ev.HeroFire: {
        const h = this.game.hero;
        const col = h ? h.def.accent : 0x3ee6ff;
        const dx = (e.x2 - e.x) * TILE;
        const dy = (e.y2 - e.y) * TILE;
        const len = Math.hypot(dx, dy);
        const o = this.particlesAdd.begin(this.atlas.get('bolt'), X + dx / 2, Y + dy / 2 - 8);
        o.rotation = Math.atan2(dy, dx);
        o.life = 0.12;
        o.scale = Math.max(0.3, len / 96);
        o.scaleEnd = Math.max(0.3, len / 96);
        o.tint = col;
        o.alpha = 1;
        o.alphaEnd = 0;
        this.particlesAdd.emit(o);
        this.sparks(e.x2 * TILE, e.y2 * TILE, null, 3);
        break;
      }
      case Ev.HeroSpecial: {
        const h = this.game.hero;
        const col = h ? h.def.accent : 0x3ee6ff;
        const r = e.value * TILE;
        const bright = this.burstAlpha();
        for (let i = 0; i < 2; i++) {
          const o = this.particlesAdd.begin(this.ringTex, X, Y);
          o.life = 0.5 + i * 0.25;
          o.scale = 0.2;
          o.scaleEnd = (r * 2) / 120;
          o.tint = col;
          o.alpha = bright;
          this.particlesAdd.emit(o);
        }
        if (e.kind === 'quake') this.addShake(6);
        this.sparks(X, Y, null, 10);
        break;
      }
      case Ev.HeroLevel:
        this.text.spawn(tr('hero.levelUp', { n: e.value }), X, Y - 56, 0x3dffa0, 0.55, 1.2, -40);
        this.sparks(X, Y - 20, null, 14);
        break;
      case Ev.HeroDown:
        this.shatter(X, Y - 20, this.game.hero?.def.accent ?? 0x3ee6ff, 1);
        break;
      case Ev.HeroRespawn: {
        const o = this.particlesAdd.begin(this.ringTex, X, Y);
        o.life = 0.6;
        o.scale = 0.1;
        o.scaleEnd = 1;
        o.tint = this.game.hero?.def.accent ?? 0x3ee6ff;
        o.alpha = 1;
        this.particlesAdd.emit(o);
        break;
      }
      case Ev.Ability:
        if (e.kind === 'meteor') this.addWarn(X, Y, e.value * TILE, e.value2, -1, 0xffb347);
        else if (e.kind === 'chrono') {
          const o = this.particlesAdd.begin(this.ringTex, X, Y);
          o.life = 0.5;
          o.scale = 0.2;
          o.scaleEnd = (e.value * TILE * 2) / 120;
          o.tint = 0x7fd8ff;
          o.alpha = 1;
          this.particlesAdd.emit(o);
        }
        break;
      case Ev.Meteor: {
        this.addShake(9);
        this.shatter(X, Y, 0xff7a3d, 2.2);
        const r = e.value * TILE;
        const bright = this.burstAlpha();
        for (const [life, tint] of [
          [0.5, 0xffb347],
          [0.8, 0xff7a3d],
        ] as const) {
          const o = this.particlesAdd.begin(this.ringTex, X, Y);
          o.life = life;
          o.scale = 0.2;
          o.scaleEnd = (r * 2.2) / 120;
          o.tint = tint;
          o.alpha = bright;
          this.particlesAdd.emit(o);
        }
        break;
      }
      case Ev.Disable: {
        // static burst / stomp: a fast expanding ring and an OFFLINE call-out
        const r = e.value * TILE;
        {
          const o = this.particlesAdd.begin(this.ringTex, X, Y);
          o.life = 0.4;
          o.scale = 0.2;
          o.scaleEnd = (r * 2) / 120;
          o.tint = e.kind === 'stomp' ? 0xffb347 : 0x9ff3ff;
          o.alpha = this.burstAlpha();
          this.particlesAdd.emit(o);
        }
        if (e.kind === 'stomp') this.addShake(6);
        this.text.spawn(tr('fx.offline'), X, Y - 40, 0xff4d6a, 0.55, 1);
        break;
      }
      case Ev.BossPhase:
        this.addShake(7);
        this.shatter(X, Y - 10, 0xff4d6a, 1.4);
        {
          const o = this.particlesAdd.begin(this.ringTex, X, Y);
          o.life = 0.7;
          o.scale = 0.3;
          o.scaleEnd = 2.6;
          o.tint = 0xff4d6a;
          o.alpha = this.burstAlpha();
          this.particlesAdd.emit(o);
        }
        break;
      case Ev.BarrierBreak:
        this.shatter(X, Y - 10, 0x8ff3ff, 1);
        this.text.spawn(tr('fx.barrier'), X, Y - 34, 0x8ff3ff, 0.4, 0.8, -30);
        break;
      case Ev.Burrow:
        for (let i = 0; i < 10; i++) {
          const o = this.particles.begin(this.shardTex, X, Y);
          const ang = this.fxRng.range(-Math.PI, 0);
          o.vx = Math.cos(ang) * this.fxRng.range(40, 110);
          o.vy = Math.sin(ang) * this.fxRng.range(60, 140);
          o.gravity = 360;
          o.life = 0.6;
          o.scale = 0.8;
          o.scaleEnd = 0.3;
          o.rotation = this.fxRng.range(0, 6.28);
          o.tint = 0xb08a5a;
          this.particles.emit(o);
        }
        break;
      case Ev.BossSpawn:
        this.addShake(8);
        {
          const o = this.particlesAdd.begin(this.atlas.get('glow'), X, Y);
          o.life = 0.8;
          o.scale = 1;
          o.scaleEnd = 3;
          o.tint = 0xff7ad9;
          o.alpha = 0.9;
          this.particlesAdd.emit(o);
        }
        break;
      case Ev.Coins:
        if (e.value > 0) this.text.spawn(`+${e.value}`, X, Y - 70, 0xffd23f, 0.8, 1.3);
        break;
      case Ev.WaveClear:
        if (e.value + e.value2 > 0) this.text.spawn(`+${e.value + e.value2}`, X, Y - 70, 0xffd23f, 0.8, 1.3);
        break;
      case Ev.Zone:
        if (e.kind === 'lava') this.addShake(1.2);
        break;
      case Ev.Victory:
        this.celebrate();
        break;
    }
  }

  /** Confetti of element shapes and sparkles over the castle. */
  private celebrate(): void {
    const g = this.game.grid;
    const els = ['fire', 'water', 'nature', 'light', 'shadow', 'earth'] as const;
    const cx = g.castleX * TILE;
    const cy = (g.castleY - 0.5) * TILE;
    for (let i = 0; i < 70; i++) {
      const ang = this.fxRng.range(-Math.PI, 0);
      const sp = this.fxRng.range(150, 420);
      const add = i % 3 === 0;
      {
        const ps2 = add ? this.particlesAdd : this.particles;
        const o = ps2.begin(this.atlas.get(add ? 'sparkle' : `pel_${els[i % 6]}`), cx, cy);
        o.vx = Math.cos(ang) * sp;
        o.vy = Math.sin(ang) * sp;
        o.gravity = 380;
        o.drag = 0.6;
        o.life = this.fxRng.range(1.2, 2);
        o.scale = this.fxRng.range(0.8, 1.4);
        o.scaleEnd = 0.6;
        o.alpha = 1;
        o.alphaEnd = 0.2;
        o.spin = this.fxRng.range(-6, 6);
        ps2.emit(o);
      }
    }
    {
      const o = this.particlesAdd.begin(this.atlas.get('glow'), cx, cy);
      o.life = 1;
      o.scale = 1;
      o.scaleEnd = 5;
      o.tint = 0xfff6b0;
      o.alpha = 1;
      this.particlesAdd.emit(o);
    }
  }

  /** Constructs shatter into crystal shards inside a dissolving energy ring. */
  // ------------------------------------------------------------ commander hero
  private heroSprite: Sprite | null = null;
  private heroShadow: Sprite | null = null;
  private heroRing: Sprite | null = null;
  private heroHp: Sprite | null = null;
  private heroHpBg: Sprite | null = null;
  private heroDest: Sprite | null = null;
  private heroLabel: BitmapText | null = null;
  /** Set by the game screen while the hero is selected. */
  heroSelected = false;
  private abilityRing: Sprite | null = null;

  /** Targeting preview for an armed commander ability (pass null to hide). */
  setAbilityPreview(id: string | null, x: number, y: number, r: number, tint: number): void {
    if (!id) {
      if (this.abilityRing) this.abilityRing.visible = false;
      return;
    }
    if (!this.abilityRing) {
      this.abilityRing = new Sprite(this.ringTex);
      this.abilityRing.anchor.set(0.5);
      this.L.ghost.addChild(this.abilityRing);
    }
    const ring = this.abilityRing;
    ring.visible = true;
    ring.position.set(x, y);
    ring.scale.set((r * 2) / 120);
    ring.tint = tint;
    ring.alpha = 0.9;
  }

  private syncHero(a: number, gameDt: number): void {
    const h = this.game.hero;
    if (!h) return;
    if (!this.heroSprite) {
      this.heroShadow = new Sprite(this.atlas.get('shadow'));
      this.heroShadow.anchor.set(0.5);
      this.heroRing = new Sprite(this.atlas.get('select'));
      this.heroRing.anchor.set(0.5);
      this.heroRing.tint = h.def.accent;
      this.heroSprite = new Sprite(this.atlas.get(heroTexName(h.def.id)));
      this.heroHpBg = new Sprite(this.atlas.get('hpbar'));
      this.heroHpBg.tint = 0x101828;
      this.heroHp = new Sprite(this.atlas.get('hpbar'));
      this.heroDest = new Sprite(this.atlas.get('cell_ok'));
      this.heroDest.anchor.set(0.5);
      this.heroDest.tint = h.def.accent;
      this.heroLabel = new BitmapText({ text: '', style: { fontFamily: NUM_FONT, fontSize: 30 } });
      this.heroLabel.anchor.set(0.5);
      this.heroLabel.scale.set(0.5);
      this.L.zone.addChild(this.heroRing, this.heroDest);
      this.L.shadow.addChild(this.heroShadow);
      this.L.enemy.addChild(this.heroSprite);
      this.L.hp.addChild(this.heroHpBg, this.heroHp, this.heroLabel);
    }
    const sprite = this.heroSprite;
    const ring = this.heroRing!;
    const label = this.heroLabel!;
    if (!h.alive) {
      sprite.visible = this.heroShadow!.visible = ring.visible = this.heroHp!.visible = this.heroHpBg!.visible = this.heroDest!.visible = false;
      label.visible = true;
      const g = this.game.grid;
      label.position.set((g.cellX(h.home) + 0.5) * TILE, (g.cellY(h.home) + 0.5) * TILE - 30);
      label.text = `${Math.ceil(h.respawn)}`;
      label.tint = h.def.accent;
      return;
    }
    label.visible = false;
    const x = lerp(h.px, h.x, a) * TILE;
    const y = lerp(h.py, h.y, a) * TILE;
    const moving = h.path.length > 0;
    const bob = moving ? Math.abs(Math.sin(this.time * 12)) * 2.5 : Math.sin(this.time * 2.2) * 1;
    sprite.visible = this.heroShadow!.visible = ring.visible = true;
    sprite.position.set(x, y + 10 - bob);
    const recoil = h.sinceFire < 0.1 ? 0.94 : 1;
    sprite.scale.set(h.facing * recoil * 0.95, 0.95);
    sprite.tint = h.stunned > 0 ? 0x8a90a8 : WHITE;
    sprite.rotation = h.stunned > 0 ? Math.sin(this.time * 20) * 0.08 : 0;
    this.heroShadow!.position.set(x, y + 12);
    this.heroShadow!.scale.set(0.8, 0.9);
    ring.position.set(x, y + 10);
    ring.scale.set(this.heroSelected ? 0.62 + Math.sin(this.time * 6) * 0.03 : 0.5);
    ring.alpha = this.heroSelected ? 1 : 0.45;
    ring.rotation = this.time * 0.6;
    // health bar
    const frac = h.hp / h.maxHp;
    const w = 30;
    this.heroHpBg!.visible = this.heroHp!.visible = frac < 1 || this.heroSelected;
    this.heroHpBg!.position.set(x - w / 2 - 1, y - 52);
    this.heroHpBg!.scale.set((w + 2) / 32, 1.1);
    this.heroHp!.position.set(x - w / 2, y - 52);
    this.heroHp!.scale.set((w * frac) / 32, 0.8);
    this.heroHp!.tint = frac > 0.5 ? h.def.accent : frac > 0.25 ? 0xffd23f : 0xff5a6a;
    // destination marker
    const dest = h.path.length ? h.path[h.path.length - 1]! : -1;
    if (dest >= 0) {
      const g = this.game.grid;
      this.heroDest!.visible = true;
      this.heroDest!.position.set((g.cellX(dest) + 0.5) * TILE, (g.cellY(dest) + 0.5) * TILE);
      this.heroDest!.alpha = 0.55 + Math.sin(this.time * 8) * 0.25;
    } else this.heroDest!.visible = false;
    if (moving && gameDt > 0 && this.fxRng.chance(gameDt * 8)) {
      const o = this.particles.begin(this.dotTex, x + this.fxRng.range(-6, 6), y + 14);
      o.vy = -10;
      o.life = 0.4;
      o.scale = 0.5;
      o.scaleEnd = 0.1;
      o.tint = h.def.accent;
      o.alpha = 0.6;
      this.particles.emit(o);
    }
  }

  private warns: WarnView[] = [];
  private warnFree: WarnView[] = [];

  /** Show a telegraph: a red ring at the attack radius that fills up over the wind-up. */
  private addWarn(x: number, y: number, r: number, dur: number, slot: number, tint = 0xff4d6a): void {
    let w = this.warnFree.pop();
    if (!w) {
      const ring = new Sprite(this.ringTex);
      const fill = new Sprite(this.atlas.get('glow'));
      const icon = new Sprite(this.atlas.get('warn'));
      ring.anchor.set(0.5);
      fill.anchor.set(0.5);
      icon.anchor.set(0.5);
      ring.tint = fill.tint = 0xff4d6a;
      this.L.zone.addChild(fill, ring);
      this.L.hp.addChild(icon);
      w = { ring, fill, icon, x: 0, y: 0, r: 0, t: 0, dur: 1, slot: -1 };
    }
    w.x = x;
    w.y = y;
    w.r = r;
    w.t = 0;
    w.dur = Math.max(0.2, dur);
    w.slot = slot;
    w.ring.visible = w.fill.visible = w.icon.visible = true;
    w.ring.tint = w.fill.tint = tint;
    w.icon.visible = slot >= 0;
    this.warns.push(w);
  }

  private syncWarns(dt: number): void {
    for (let i = this.warns.length - 1; i >= 0; i--) {
      const w = this.warns[i]!;
      w.t += this.game.state === 'playing' ? dt : 0;
      const f = Math.min(1, w.t / w.dur);
      // follow the caster while it winds up
      let e: Enemy | null = null;
      const list = this.game.enemies;
      for (let k = 0; k < list.length; k++) {
        if (list[k]!.slot === w.slot && list[k]!.alive) {
          e = list[k]!;
          break;
        }
      }
      if (e) {
        w.x = (e.x + e.laneX) * TILE;
        w.y = (e.y + e.laneY) * TILE;
      }
      const ringScale = (w.r * 2) / 120;
      w.ring.position.set(w.x, w.y);
      w.ring.scale.set(ringScale);
      w.ring.alpha = 0.55 + 0.4 * Math.abs(Math.sin(w.t * 6));
      w.fill.position.set(w.x, w.y);
      w.fill.scale.set((w.r * 2 * f) / 70);
      w.fill.alpha = 0.35;
      w.icon.position.set(w.x, w.y - 46);
      w.icon.scale.set(1 + 0.15 * Math.sin(w.t * 10));
      if (w.slot < 0) w.icon.visible = false;
      if (f >= 1 || (!e && w.slot >= 0)) {
        w.ring.visible = w.fill.visible = w.icon.visible = false;
        this.warns.splice(i, 1);
        this.warnFree.push(w);
      }
    }
  }

  /**
   * Alpha for a big bright burst: full while the flash budget allows (≤ 3 per
   * second), dimmed after that; always softer with reduced motion.
   */
  private burstAlpha(): number {
    const a = this.flashes.allow(this.time) ? 1 : 0.35;
    return this.settings.reducedMotion ? a * 0.6 : a;
  }

  private shatter(x: number, y: number, color: number, size: number): void {
    const rng = this.fxRng;
    const calm = this.settings.reducedMotion;
    const big = this.quality.particles > 200 && !calm;
    {
      const o = this.particlesAdd.begin(this.ringTex, x, y);
      o.life = 0.32;
      o.scale = 0.12 * size;
      o.scaleEnd = 0.55 * size;
      o.tint = color;
      o.alpha = size >= 1.4 ? 0.9 * this.burstAlpha() : calm ? 0.55 : 0.9;
      this.particlesAdd.emit(o);
    }
    const n = Math.round((big ? 10 : 6) * size);
    for (let i = 0; i < n; i++) {
      const ang = rng.range(0, Math.PI * 2);
      const sp = rng.range(90, 210) * Math.sqrt(size);
      const o = this.particles.begin(this.shardTex, x, y);
      o.vx = Math.cos(ang) * sp;
      o.vy = Math.sin(ang) * sp - 50;
      o.gravity = 320;
      o.drag = 1.5;
      o.life = rng.range(0.4, 0.7);
      o.scale = rng.range(0.55, 1.05) * Math.min(1.6, size);
      o.scaleEnd = 0.2;
      o.rotation = ang;
      o.spin = rng.range(-9, 9);
      o.tint = i % 3 === 0 ? 0xffffff : color;
      o.alphaEnd = 0.2;
      this.particles.emit(o);
    }
    for (let i = 0; i < (big ? 5 : 2); i++) {
      const ang = rng.range(0, Math.PI * 2);
      const o = this.particlesAdd.begin(this.dotTex, x, y);
      o.vx = Math.cos(ang) * 60;
      o.vy = Math.sin(ang) * 60 - 30;
      o.drag = 3;
      o.life = 0.45;
      o.scale = 0.9;
      o.scaleEnd = 0.05;
      o.tint = color;
      this.particlesAdd.emit(o);
    }
    {
      const o = this.particles.begin(this.coinTex, x, y - 6);
      o.vx = rng.range(-30, 30);
      o.vy = -140;
      o.gravity = 380;
      o.life = 0.55;
      o.scale = 0.75;
      o.scaleEnd = 0.6;
      this.particles.emit(o);
    }
  }

  /** "SHATTER ×N" when several constructs break at once. */
  private countKill(x: number, y: number): void {
    if (this.time - this.killWindow > 0.45) {
      this.killStreak = 0;
      this.killX = 0;
      this.killY = 0;
    }
    this.killWindow = this.time;
    this.killStreak++;
    this.killX += x;
    this.killY += y;
    if (this.killStreak >= 4 && this.time - this.lastStreakText > 0.6) {
      this.lastStreakText = this.time;
      this.text.spawn(tr('fx.shatter', { n: this.killStreak }), this.killX / this.killStreak, this.killY / this.killStreak - 50, 0x9ff3ff, 0.62, 1.1, -30);
    }
  }

  private sparks(x: number, y: number, el: ElementId | null, n: number): void {
    const col = el ? ELEMENTS[el].light : 0xfff0c0;
    for (let i = 0; i < n; i++) {
      const ang = this.fxRng.range(0, Math.PI * 2);
      {
        const o = this.particlesAdd.begin(this.atlas.get('dot'), x, y - 8);
        o.vx = Math.cos(ang) * 90;
        o.vy = Math.sin(ang) * 90;
        o.drag = 5;
        o.life = 0.25;
        o.scale = 0.6;
        o.scaleEnd = 0.05;
        o.tint = col;
        this.particlesAdd.emit(o);
      }
    }
  }

  addShake(amount: number): void {
    if (!this.settings.shake || this.settings.reducedMotion) return;
    this.shake = Math.min(14, this.shake + amount);
  }

  // =========================================================== overlays

  /** Show the build ghost. `type` null hides it. */
  setGhost(type: TowerId | null, cx: number, cy: number, ok: boolean): void {
    if (!type || !this.game.grid.inBounds(cx, cy)) {
      this.ghostBase.visible = this.ghostHead.visible = this.cellMark.visible = false;
      if (!this.selected) this.rangeG.clear();
      return;
    }
    const x = (cx + 0.5) * TILE;
    const y = (cy + 0.5) * TILE;
    this.ghostBase.texture = this.atlas.get(towerBaseName(type, 1));
    this.ghostHead.texture = this.atlas.get(towerHeadName(type, 1));
    this.ghostBase.position.set(x, y);
    this.ghostHead.position.set(x, y - 4);
    this.ghostBase.visible = this.ghostHead.visible = true;
    this.ghostBase.tint = this.ghostHead.tint = ok ? WHITE : 0xff8a9a;
    this.cellMark.texture = this.atlas.get(ok ? 'cell_ok' : 'cell_bad');
    this.cellMark.position.set(cx * TILE, cy * TILE);
    this.cellMark.visible = true;
    this.drawRange(x, y, TOWERS[type].levels[0]!.range, ok ? 0xffffff : 0xff8a9a);
  }

  /** Pulsing "build here" marker (tutorial). Pass -1 to hide. */
  setHint(cx: number, cy: number): void {
    this.hint.visible = cx >= 0;
    this.hint.position.set((cx + 0.5) * TILE, (cy + 0.5) * TILE);
  }

  setPreviewPath(paths: number[][] | null): void {
    this.pathPreview = paths;
    if (!paths) this.pathVersion = -1;
  }

  select(t: Tower | null): void {
    this.selected = t;
    if (!t) {
      this.selectRing.visible = false;
      this.rangeG.clear();
      return;
    }
    this.selectRing.visible = true;
    this.selectRing.position.set(t.x * TILE, t.y * TILE);
    this.drawRange(t.x * TILE, t.y * TILE, t.stats.range, 0xffffff);
  }

  /** Redraw the range circle (only when selection/ghost changes — never per frame). */
  drawRange(x: number, y: number, rangeTiles: number, color: number): void {
    const r = rangeTiles * TILE;
    this.rangeG.clear();
    this.rangeG.circle(x, y, r).fill({ color, alpha: 0.1 }).stroke({ color, alpha: 0.75, width: 3 });
    // aura towers show their aura too
  }

  get particleCount(): number {
    return this.particles.count + this.particlesAdd.count;
  }

  destroy(): void {
    this.particles.clear();
    this.particlesAdd.clear();
    this.text.clear();
    this.world.destroy({ children: true });
    this.terrainTex?.destroy(true);
  }
}
