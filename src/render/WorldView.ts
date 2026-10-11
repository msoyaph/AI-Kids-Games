import { Container, Graphics, Sprite, Texture, CanvasSource } from 'pixi.js';
import { easeOutBack, lerp, lerpAngle } from '../core/math';
import { ELEMENTS, type ElementId } from '../data/elements';
import { ENEMIES } from '../data/enemies';
import { TOWERS, type TowerId } from '../data/towers';
import type { Tower } from '../sim/entities';
import { Ev, type GameEvent } from '../sim/events';
import type { Game } from '../sim/Game';
import { F_WATER, F_BUILD } from '../sim/grid';
import { enemyTexName, projectileName, towerBaseName, towerHeadName, type Atlas } from './atlas/bake';
import { Camera, type Insets } from './Camera';
import { FloatingText } from './FloatingText';
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
  stamp: number;
  tex: string;
  numCooldown: number;
}

interface TowerView {
  base: Sprite;
  head: Sprite;
  beam: Sprite | null;
  beamGlow: Sprite | null;
  level: number;
  stamp: number;
  angle: number;
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
}

const WHITE = 0xffffff;

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

  private shake = 0;
  private shakeRng = new Rng(7);
  private fxRng = new Rng(99);
  private castleHurt = 0;

  constructor(
    private readonly atlas: Atlas,
    private readonly game: Game,
    private quality: QualityProfile,
    public settings: ViewSettings,
    bakeScale: number,
    maxTexture: number,
  ) {
    const g = game.grid;
    this.camera = new Camera(this.world, g.cols * TILE, g.rows * TILE);
    for (const layer of Object.values(this.L)) this.world.addChild(layer);
    this.L.glow.blendMode = 'add';

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
    this.castle.scale.set(Math.min(1.05, (Math.sqrt(g.goals.length) * TILE) / 120));
    this.L.head.addChild(this.castle);

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
    const tuftTint = this.game.map.theme === 'snow' ? 0xffffff : this.game.map.theme === 'caves' ? 0xb8a0ff : this.game.map.theme === 'desert' ? 0xc8d070 : 0x9cff7a;
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
    this.syncTowers(a);
    this.syncProjectiles(a);
    this.syncZones(gameDt);
    this.syncPath();
    this.animateScene(dt);
    this.particles.update(gameDt > 0 ? gameDt : 0);
    this.particlesAdd.update(gameDt > 0 ? gameDt : 0);
    this.text.update(dt);
    // shake
    if (this.shake > 0 && this.settings.shake) {
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
    v = { body, shadow, hpBg, hpFill, shield, extra, stamp: 0, tex: '', numCooldown: 0 };
    this.enemyViews[slot] = v;
    return v;
  }

  private hideEnemyView(v: EnemyView): void {
    v.body.visible = v.shadow.visible = v.hpBg.visible = v.hpFill.visible = v.shield.visible = v.extra.visible = false;
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
      const frame = def.look === 'bat' && Math.floor(t * 8 + e.slot) % 2 === 1 ? 1 : 0;
      const el = def.elemental ? e.element : null;
      const key = enemyTexName(def.id, el, frame);
      if (v.tex !== key) {
        v.tex = key;
        v.body.texture = this.atlas.get(key);
      }
      const parent = e.flying ? this.L.air : this.L.enemy;
      if (v.body.parent !== parent) parent.addChild(v.body);
      if (v.shield.parent !== parent) parent.addChild(v.shield);

      const x = (lerp(e.px, e.x, a) + e.laneX) * TILE;
      const y = (lerp(e.py, e.y, a) + e.laneY) * TILE;
      const R = e.radius * TILE;
      const phase = t * 9 + e.slot * 1.7;
      let sx = 1;
      let sy = 1;
      let lift = 0;
      let rot = 0;
      const stunned = e.stunTime > 0;
      if (!stunned) {
        switch (def.look) {
          case 'slime':
          case 'mushroom': {
            const s = Math.sin(phase);
            sy = 1 + 0.08 * s;
            sx = 1 - 0.06 * s;
            lift = Math.max(0, s) * R * 0.18;
            break;
          }
          case 'gremlin':
            rot = Math.sin(phase * 1.4) * 0.1;
            lift = Math.abs(Math.sin(phase * 1.4)) * 2;
            break;
          case 'robot':
            rot = Math.sin(phase * 2.2) * 0.05;
            lift = Math.abs(Math.sin(phase * 1.1)) * 2.5;
            break;
          case 'bat':
          case 'imp':
            lift = Math.sin(phase * 0.6) * 4;
            break;
          case 'king':
            sy = 1 + 0.04 * Math.sin(phase * 0.5);
            break;
        }
      } else rot = Math.sin(t * 20) * 0.12;
      const pop = e.spawnAge < 0.25 ? easeOutBack(e.spawnAge / 0.25) : 1;
      const fly = e.flying ? 22 : 0;
      v.body.visible = true;
      v.body.position.set(x, y - lift - fly);
      v.body.scale.set(sx * pop * e.facing, sy * pop);
      v.body.rotation = rot;
      // status tint (colour + particles; shapes come from icons/particles too)
      let tint = WHITE;
      if (e.hitFlash > 0) tint = 0xffc4c4;
      else if (stunned) tint = 0xfff0a0;
      else if (e.slowTime > 0) tint = 0xa8dcff;
      else if (e.poisonTime > 0) tint = 0xc8ff9e;
      else if (e.burnTime > 0) tint = 0xffc49e;
      v.body.tint = tint;

      v.shadow.visible = true;
      v.shadow.position.set(x, y + R * 0.55);
      const ss = (R * 2.1) / 48 / (e.flying ? 1.4 : 1);
      v.shadow.scale.set(ss, ss);
      v.shadow.alpha = e.flying ? 0.45 : 0.7;

      if (e.shield) {
        v.shield.visible = true;
        const tex = `shield_${e.shield}`;
        v.shield.texture = this.atlas.get(tex);
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

      // extra: stun stars or the Grumble King's crown gem
      if (stunned) {
        v.extra.visible = true;
        v.extra.texture = this.atlas.get('stun');
        v.extra.position.set(x + Math.cos(t * 8) * R * 0.6, y - fly - R * 1.2 + Math.sin(t * 8) * 3);
        v.extra.scale.set(1.1);
        v.extra.tint = WHITE;
      } else if (def.shiftElement && e.element) {
        v.extra.visible = true;
        v.extra.texture = this.atlas.get(`pel_${e.element}`);
        v.extra.position.set(x, y - lift - R * 1.48);
        v.extra.scale.set(0.9 + Math.sin(t * 6) * 0.08);
      } else v.extra.visible = false;

      // trailing status particles (cheap, budgeted)
      if (gameDt > 0 && this.fxRng.chance(gameDt * 6)) {
        if (e.burnTime > 0) this.emitStatus(x, y - fly, R, 0xff8a3a, 'dot', true);
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
    ps.emit({
      tex: this.atlas.get(tex),
      x: x + this.fxRng.range(-R, R) * 0.6,
      y: y + this.fxRng.range(-R, R) * 0.4,
      vy: -30,
      life: 0.5,
      scale: 0.5,
      scaleEnd: 0.15,
      tint,
      alpha: 0.9,
    });
  }

  private syncTowers(a: number): void {
    void a;
    for (const t of this.game.towers) {
      let v = this.towerViews.get(t.id);
      if (!v) {
        const base = new Sprite(this.atlas.get(towerBaseName(t.def.id, t.level)));
        const head = new Sprite(this.atlas.get(towerHeadName(t.def.id, t.level)));
        base.position.set(t.x * TILE, t.y * TILE);
        head.position.set(t.x * TILE, t.y * TILE - 4);
        this.L.base.addChild(base);
        this.L.head.addChild(head);
        v = { base, head, beam: null, beamGlow: null, level: t.level, stamp: 0, angle: t.angle };
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
      if (v.level !== t.level) {
        v.level = t.level;
        v.base.texture = this.atlas.get(towerBaseName(t.def.id, t.level));
        v.head.texture = this.atlas.get(towerHeadName(t.def.id, t.level));
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
          v.beam.scale.set(len / 32, 0.55 + ramp * 0.9 + Math.sin(this.time * 30) * 0.08);
          v.beam.tint = Math.floor(this.time * 10) % 2 ? 0xffe66b : 0xc49bff;
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
        this.towerViews.delete(id);
      }
    }
  }

  private syncProjectiles(a: number): void {
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
      const glowy = p.elements.length > 0 || p.style === 'flare';
      v.glow.visible = glowy;
      if (glowy) {
        v.glow.position.set(x, y - lift);
        v.glow.scale.set(p.style === 'flare' ? 0.9 : 0.42);
        v.glow.alpha = 0.75;
      }
      v.shadow.visible = p.lob;
      if (p.lob) {
        v.shadow.position.set(x, y + 4);
        v.shadow.scale.set(0.5);
      }
      // little trails for elemental shots
      if (glowy && this.fxRng.chance(0.35)) {
        this.particlesAdd.emit({
          tex: this.atlas.get('dot'),
          x,
          y: y - lift,
          life: 0.25,
          scale: 0.7,
          scaleEnd: 0.1,
          tint: v.glow.tint,
          alpha: 0.7,
        });
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
      v.sprite.texture = this.atlas.get('puff');
      v.sprite.position.set(z.x * TILE, z.y * TILE);
      const size = (z.r * 2 * TILE) / 56;
      v.sprite.scale.set(size * (1 + Math.sin(this.time * 4 + z.slot) * 0.04), size * 0.8);
      v.sprite.tint = lava ? 0xff6a2a : 0xeaf4ff;
      v.sprite.alpha = (lava ? 0.75 : 0.5) * fade;
      if (gameDt > 0 && this.fxRng.chance(gameDt * 10)) {
        const ang = this.fxRng.range(0, Math.PI * 2);
        const rr = this.fxRng.range(0, z.r) * TILE;
        this.particles.emit({
          tex: this.atlas.get(lava ? 'dot' : 'puff'),
          x: z.x * TILE + Math.cos(ang) * rr,
          y: z.y * TILE + Math.sin(ang) * rr,
          vy: lava ? -20 : -14,
          life: 0.8,
          scale: lava ? 0.6 : 0.35,
          scaleEnd: lava ? 0.1 : 0.6,
          tint: lava ? 0xffa040 : 0xffffff,
          alpha: 0.7,
        });
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
        s.tint = preview ? 0xfff27a : WHITE;
        (s as Sprite & { pathIndex?: number }).pathIndex = i;
      }
    }
    for (let i = n; i < this.pathDots.length; i++) this.pathDots[i]!.visible = false;
  }

  private animateScene(dt: number): void {
    const t = this.time;
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
      this.castle.x = this.game.grid.castleX * TILE + Math.sin(t * 60) * this.castleHurt * 4;
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
        const col = def ? def.color : 0xffffff;
        this.poof(X, Y - 6, col, (e.tag as ElementId) || null, def?.boss ? 2.2 : 1);
        if (e.value > 0) this.text.spawn(`+${e.value}`, X, Y - 22, e.value2 ? 0xfff27a : 0xffd23f, e.value2 ? 0.7 : 0.55, 0.9);
        if (def?.boss) this.addShake(10);
        break;
      }
      case Ev.Leak:
        this.castleHurt = 1;
        this.addShake(6);
        for (let i = 0; i < 6; i++) {
          this.particles.emit({
            tex: this.atlas.get('heart'),
            x: X,
            y: Y - 20,
            vx: this.fxRng.range(-80, 80),
            vy: this.fxRng.range(-160, -60),
            gravity: 260,
            life: 0.9,
            scale: 0.9,
            scaleEnd: 0.4,
          });
        }
        this.text.spawn(`-${e.value}`, X, Y - 36, 0xff6b8a, 0.8, 1.1);
        break;
      case Ev.Hit: {
        this.sparks(X, Y, (e.tag as ElementId) || null, 3);
        if (this.settings.damageNumbers && e.value >= 1) {
          const slot = e.id;
          const v = this.enemyViews[slot];
          if (!v || v.numCooldown <= 0) {
            if (v) v.numCooldown = 0.35;
            this.text.spawn(String(Math.round(e.value)), X + this.fxRng.range(-8, 8), Y - 26, WHITE, 0.42, 0.6, -55);
          }
        }
        break;
      }
      case Ev.Splash: {
        const el = (e.tag as ElementId) || null;
        const col = el ? ELEMENTS[el].color : 0xffe0a0;
        const r = e.value * TILE;
        this.particlesAdd.emit({ tex: this.atlas.get('ring'), x: X, y: Y, life: 0.35, scale: (r * 0.5) / 64, scaleEnd: r / 64, tint: col, alpha: 0.9 });
        this.particlesAdd.emit({ tex: this.atlas.get('glow'), x: X, y: Y, life: 0.3, scale: r / 48, scaleEnd: r / 40, tint: col, alpha: 0.8 });
        this.sparks(X, Y, el, 8);
        if (e.kind === 'flare') {
          this.addShake(5);
          this.particlesAdd.emit({ tex: this.atlas.get('glow'), x: X, y: Y, life: 0.45, scale: 2.2, scaleEnd: 3.4, tint: 0xfff6b0, alpha: 1 });
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
        this.particlesAdd.emit({
          tex: bolt,
          x: X + dx / 2,
          y: Y + dy / 2 - 8,
          rotation: Math.atan2(dy, dx),
          life: 0.18,
          scale: Math.max(0.3, len / 96),
          scaleEnd: Math.max(0.3, len / 96),
          tint: col,
          alpha: 1,
          alphaEnd: 0.2,
        });
        this.sparks(e.x2 * TILE, e.y2 * TILE, el, 2);
        break;
      }
      case Ev.Pulse: {
        const el = (e.tag as ElementId) || 'earth';
        const r = e.value * TILE;
        const col = e.kind === 'gravity' ? 0xc49bff : e.kind === 'whirlpool' ? 0x7fd8ff : e.kind === 'quicksand' ? 0xe8c070 : ELEMENTS[el].color;
        this.particlesAdd.emit({ tex: this.atlas.get('ring'), x: X, y: Y, life: 0.45, scale: 0.2, scaleEnd: (r * 2) / 120, tint: col, alpha: 0.95 });
        this.particles.emit({ tex: this.atlas.get('ring'), x: X, y: Y, life: 0.6, scale: 0.15, scaleEnd: (r * 2) / 128, tint: col, alpha: 0.5 });
        for (let i = 0; i < 6; i++) {
          const ang = (i / 6) * Math.PI * 2;
          this.particles.emit({
            tex: this.atlas.get('dot'),
            x: X + Math.cos(ang) * 10,
            y: Y + Math.sin(ang) * 10,
            vx: Math.cos(ang) * r * 1.6,
            vy: Math.sin(ang) * r * 1.6,
            drag: 4,
            life: 0.45,
            scale: 0.9,
            scaleEnd: 0.2,
            tint: col,
          });
        }
        if (e.kind === 'rumble' || e.kind === 'gravity') this.addShake(1.5);
        break;
      }
      case Ev.Fire: {
        if (this.quality.glow && e.tag !== 'arrow' && e.tag !== 'cannonball') {
          const t = TOWERS[e.kind as TowerId];
          const el = t?.elements[0];
          this.particlesAdd.emit({ tex: this.atlas.get('glow'), x: X, y: Y - 10, life: 0.18, scale: 0.35, scaleEnd: 0.6, tint: el ? ELEMENTS[el].light : 0xffffff, alpha: 0.7 });
        }
        break;
      }
      case Ev.Stun:
        for (let i = 0; i < 3; i++) {
          this.particles.emit({ tex: this.atlas.get('stun'), x: X, y: Y - 20, vx: this.fxRng.range(-50, 50), vy: -60, gravity: 120, life: 0.5, scale: 1, scaleEnd: 0.5 });
        }
        break;
      case Ev.Heal:
        if (e.kind === 'heal') {
          this.particlesAdd.emit({ tex: this.atlas.get('ring'), x: X, y: Y, life: 0.6, scale: 0.2, scaleEnd: (e.value * TILE * 2) / 128, tint: 0x8cff9e, alpha: 0.7 });
          for (let i = 0; i < 4; i++) this.particles.emit({ tex: this.atlas.get('heart'), x: X + this.fxRng.range(-20, 20), y: Y - 10, vy: -50, life: 0.7, scale: 0.6, scaleEnd: 0.3, tint: 0x9cffb0 });
        } else if (e.kind === 'shift') {
          const el = e.tag as ElementId;
          this.particlesAdd.emit({ tex: this.atlas.get('glow'), x: X, y: Y - 30, life: 0.5, scale: 0.6, scaleEnd: 1.6, tint: ELEMENTS[el].color, alpha: 0.9 });
        }
        break;
      case Ev.ShieldBlock:
        if (this.fxRng.chance(0.5)) this.text.spawn('Bonk', X, Y - 30, ELEMENTS[e.tag as ElementId]?.light ?? WHITE, 0.4, 0.5, -30);
        break;
      case Ev.Crit:
        this.text.spawn('WOW!', X, Y - 34, 0xfff27a, 0.75, 0.8, -50);
        this.particlesAdd.emit({ tex: this.atlas.get('sparkle'), x: X, y: Y - 10, life: 0.4, scale: 1.4, scaleEnd: 2.2, spin: 4, tint: 0xfff6b0 });
        break;
      case Ev.Build:
      case Ev.Upgrade: {
        const t = TOWERS[e.kind as TowerId];
        const el = t?.elements[0];
        const col = el ? ELEMENTS[el].color : 0xfff0c0;
        this.particlesAdd.emit({ tex: this.atlas.get('ring'), x: X, y: Y, life: 0.5, scale: 0.2, scaleEnd: 0.8, tint: col, alpha: 0.9 });
        for (let i = 0; i < (e.type === Ev.Upgrade ? 14 : 9); i++) {
          const ang = this.fxRng.range(0, Math.PI * 2);
          this.particlesAdd.emit({
            tex: this.atlas.get(i % 3 === 0 ? 'sparkle' : 'dot'),
            x: X,
            y: Y,
            vx: Math.cos(ang) * 110,
            vy: Math.sin(ang) * 110 - 40,
            drag: 3,
            life: 0.6,
            scale: 0.8,
            scaleEnd: 0.1,
            tint: i % 2 ? col : 0xffffff,
          });
        }
        if (e.type === Ev.Upgrade) this.text.spawn('Level up!', X, Y - 36, 0x9cff7a, 0.55, 1);
        break;
      }
      case Ev.Sell:
        this.text.spawn(`+${e.value}`, X, Y - 20, 0xffd23f, 0.6, 0.9);
        for (let i = 0; i < 6; i++) {
          this.particles.emit({ tex: this.atlas.get('coin'), x: X, y: Y, vx: this.fxRng.range(-70, 70), vy: this.fxRng.range(-200, -100), gravity: 400, life: 0.7, scale: 0.9 });
        }
        this.particles.emit({ tex: this.atlas.get('puff'), x: X, y: Y, life: 0.5, scale: 0.6, scaleEnd: 1.3, alpha: 0.8 });
        break;
      case Ev.Split:
        this.particles.emit({ tex: this.atlas.get('puff'), x: X, y: Y, life: 0.4, scale: 0.4, scaleEnd: 1, tint: 0xc8fff0 });
        break;
      case Ev.BossSpawn:
        this.addShake(8);
        this.particlesAdd.emit({ tex: this.atlas.get('glow'), x: X, y: Y, life: 0.8, scale: 1, scaleEnd: 3, tint: 0xff7ad9, alpha: 0.9 });
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
      (add ? this.particlesAdd : this.particles).emit({
        tex: this.atlas.get(add ? 'sparkle' : `pel_${els[i % 6]}`),
        x: cx,
        y: cy,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        gravity: 380,
        drag: 0.6,
        life: this.fxRng.range(1.2, 2),
        scale: this.fxRng.range(0.8, 1.4),
        scaleEnd: 0.6,
        alpha: 1,
        alphaEnd: 0.2,
        spin: this.fxRng.range(-6, 6),
      });
    }
    this.particlesAdd.emit({ tex: this.atlas.get('glow'), x: cx, y: cy, life: 1, scale: 1, scaleEnd: 5, tint: 0xfff6b0, alpha: 1 });
  }

  /** Creatures "poof" into sparkles, puffs, element shapes and coins. */
  private poof(x: number, y: number, color: number, el: ElementId | null, size: number): void {
    const rng = this.fxRng;
    this.particles.emit({ tex: this.atlas.get('puff'), x, y, life: 0.45, scale: 0.5 * size, scaleEnd: 1.2 * size, tint: 0xffffff, alpha: 0.9 });
    const n = Math.round(9 * size);
    for (let i = 0; i < n; i++) {
      const ang = rng.range(0, Math.PI * 2);
      const sp = rng.range(70, 170) * Math.sqrt(size);
      this.particlesAdd.emit({
        tex: this.atlas.get(i % 3 === 0 ? 'sparkle' : 'dot'),
        x,
        y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp - 40,
        drag: 3.5,
        life: rng.range(0.35, 0.7),
        scale: rng.range(0.6, 1.1),
        scaleEnd: 0.05,
        spin: rng.range(-6, 6),
        tint: i % 2 ? color : 0xffffff,
      });
    }
    if (el) {
      for (let i = 0; i < 2; i++) {
        this.particles.emit({ tex: this.atlas.get(`pel_${el}`), x, y, vx: rng.range(-60, 60), vy: rng.range(-140, -80), gravity: 280, life: 0.7, scale: 0.9, scaleEnd: 0.5 });
      }
    }
    this.particles.emit({ tex: this.atlas.get('coin'), x, y: y - 6, vx: rng.range(-30, 30), vy: -150, gravity: 380, life: 0.6, scale: 0.9, scaleEnd: 0.7, spin: 5 });
  }

  private sparks(x: number, y: number, el: ElementId | null, n: number): void {
    const col = el ? ELEMENTS[el].light : 0xfff0c0;
    for (let i = 0; i < n; i++) {
      const ang = this.fxRng.range(0, Math.PI * 2);
      this.particlesAdd.emit({
        tex: this.atlas.get('dot'),
        x,
        y: y - 8,
        vx: Math.cos(ang) * 90,
        vy: Math.sin(ang) * 90,
        drag: 5,
        life: 0.25,
        scale: 0.6,
        scaleEnd: 0.05,
        tint: col,
      });
    }
  }

  addShake(amount: number): void {
    if (!this.settings.shake) return;
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

  /** Light up all cells you could build on right now (tutorial / build mode help). */
  get towersCount(): number {
    return this.towerViews.size;
  }

  destroy(): void {
    this.particles.clear();
    this.particlesAdd.clear();
    this.text.clear();
    this.world.destroy({ children: true });
    this.terrainTex?.destroy(true);
  }
}
