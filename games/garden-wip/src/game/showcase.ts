// The style frame (phase 1): a staged Meadow moment with the first three plants and critters, plus
// the stress scene for performance and the squint scene for the size and contrast check. Not the
// game's rules (those arrive in phase 2's sim/): critters walk in, Rowans flick berries at whatever
// is in their lane, a hit shoos a critter back a step, and after a few it runs home in a poof of
// leaves and sparkles; the snail nibbles the Boxwood; Comfrey squashes and pops out compost that
// floats in a soft glow; the magpie swoops over its lane. Tapping a free tile plants the chosen card.
import { colX, COLS, ENTRY_X, laneZ, LANES, type Tile } from '../sim/board';
import { FLICK_RELEASE, type CritterMood } from '../render/animate';
import type { BerrySprite, CompostSprite, CritterSprite, Frame, LeafSprite, PlantSprite, SparkleSprite } from '../render/view';
import type { PlantModelId } from '../render/models/plants';
import type { CritterModelId } from '../render/models/critters';
import { rng } from '../render/garden';

export type SceneName = 'style' | 'stress' | 'squint';

interface Critter extends CritterSprite { lane: number; speed: number; start: number; hits: number; flying: boolean; gone: number }
interface Berry extends BerrySprite { lane: number; vx: number }
interface Leaf extends LeafSprite { vx: number; vy: number; vz: number; life: number }
interface Sparkle extends SparkleSprite { vy: number; life: number; full: number }
interface Pickup extends CompostSprite { life: number }

const FACE_CAMERA = 0.4;
const LEAF_COLORS = [0x8fe05a, 0xa6ec6c, 0xffd23a, 0x5fb33a];
const SPARKLE_COLORS = [0xffffff, 0xfff3a0, 0xffe0f0];
/** Hits that send a critter home in the style frame. */
const HITS_HOME = 4;

export class Showcase {
  readonly plants: PlantSprite[] = [];
  readonly critters: Critter[] = [];
  readonly berries: Berry[] = [];
  readonly leaves: Leaf[] = [];
  readonly sparkles: Sparkle[] = [];
  readonly compost: Pickup[] = [];
  private readonly rand: () => number;
  private nextCompost = 2.5;
  /** Planted by taps (the style frame's one interaction). */
  planted = 0;

  /** `empty` stages nothing: the squint test's background to compare against. */
  constructor(readonly scene: SceneName, seed = 7, empty = false) {
    this.rand = rng(seed);
    if (empty) return;
    if (scene === 'style') this.stageStyle();
    else if (scene === 'stress') this.stageStress();
    else this.stageSquint();
  }

  private plant(species: PlantModelId, lane: number, col: number, t = -10) {
    this.plants.push({ species, lane, col, bornAt: t, firedAt: -10 + this.rand() * 2, madeAt: -10, phase: this.rand() * 6.28 });
  }

  private critter(species: CritterModelId, lane: number, x: number, speed: number, mood: CritterMood = 'walk') {
    const flying = species === 'magpie';
    this.critters.push({ species, lane, x, z: laneZ(lane), y: flying ? 0.75 : 0, yaw: FACE_CAMERA, phase: this.rand() * 6.28, speed, start: x, hits: 0, flying, gone: 0, mood, moodAt: -10, fade: 1 });
  }

  private stageStyle() {
    const layout: [PlantModelId, number, number][] = [
      ['comfrey', 0, 0], ['rowan', 0, 1], ['boxwood', 0, 4],
      ['comfrey', 1, 0], ['rowan', 1, 2],
      ['rowan', 2, 1], ['boxwood', 2, 3],
      ['comfrey', 3, 0], ['rowan', 3, 1], ['rowan', 3, 2],
      ['comfrey', 4, 0], ['boxwood', 4, 2],
    ];
    for (const [s, l, c] of layout) this.plant(s, l, c);
    this.critter('snail', 0, colX(4) + 0.62, 0, 'nibble');
    for (let i = 0; i < 3; i++) this.critter('ant', 1, 6.9 + i * 0.5, 0.42);
    this.critter('snail', 3, 9.6, 0.16);
    for (let i = 0; i < 3; i++) this.critter('ant', 4, ENTRY_X - 0.2 + i * 0.5, 0.42);
    this.critter('magpie', 2, 6.8, 0);
    this.compost.push({ x: colX(5), z: laneZ(4), bornAt: -10, phase: 1, life: 1e9 }, { x: colX(3) + 0.1, z: laneZ(1), bornAt: -10, phase: 2.5, life: 1e9 });
  }

  private stageStress() {
    // the brief's target: a full board of 45 plants, 40 critters and 150 berries in the air
    const kinds: PlantModelId[] = ['comfrey', 'rowan', 'boxwood'];
    for (let lane = 0; lane < LANES; lane++) for (let col = 0; col < COLS; col++) this.plant(kinds[(lane + col) % 3]!, lane, col);
    for (let i = 0; i < 40; i++) {
      const lane = i % LANES, species: CritterModelId = i % 8 === 7 ? 'magpie' : i % 3 === 0 ? 'snail' : 'ant';
      this.critter(species, lane, 1 + ((i * 2.3) % 9), species === 'snail' ? 0.16 : 0.42);
    }
    for (let i = 0; i < 150; i++) {
      const lane = i % LANES;
      this.berries.push({ lane, x: (i * 0.37) % 9.5, y: 0.5, z: laneZ(lane), spin: 0, vx: 4.2 });
    }
  }

  /** Each unit alone on its own tile, standing still: the squint test measures them. */
  private stageSquint() {
    (['comfrey', 'rowan', 'boxwood'] as const).forEach((s, i) => this.plant(s, 1, 1 + i * 3));
    (['snail', 'ant', 'magpie'] as const).forEach((s, i) => this.critter(s, 3, colX(1 + i * 3), 0));
    this.compost.push({ x: colX(8), z: laneZ(2), bornAt: -10, phase: 0, life: 1e9 });
  }

  isFree(tile: Tile) { return !this.plants.some(p => p.lane === tile.lane && p.col === tile.col); }

  /** Plants `species` on a free tile (a tap in the style frame). */
  plantAt(species: PlantModelId, tile: Tile, t: number) {
    if (!this.isFree(tile)) return false;
    this.plant(species, tile.lane, tile.col, t);
    this.poof(colX(tile.col), 0.15, laneZ(tile.lane), 6, [0x8a5432, 0xa86a3c], 3);
    this.planted++;
    return true;
  }

  private poof(x: number, y: number, z: number, n: number, colors = LEAF_COLORS, sparkles = 0) {
    for (let i = 0; i < n && this.leaves.length < 190; i++) {
      const a = this.rand() * Math.PI * 2, sp = 0.7 + this.rand() * 1.0;
      this.leaves.push({ x, y, z, vx: Math.cos(a) * sp, vy: 1.4 + this.rand() * 1.2, vz: Math.sin(a) * sp * 0.4, spin: this.rand() * 6, size: 1 + this.rand() * 0.7, color: colors[i % colors.length]!, life: 0.9 + this.rand() * 0.4 });
    }
    for (let i = 0; i < sparkles && this.sparkles.length < 110; i++) {
      const life = 0.6 + this.rand() * 0.3;
      this.sparkles.push({ x: x + (this.rand() - 0.5) * 0.6, y: y + this.rand() * 0.5, z, vy: 0.5 + this.rand() * 0.4, size: 1 + this.rand() * 0.8, color: SPARKLE_COLORS[i % 3]!, life, full: life });
    }
  }

  private setMood(c: Critter, mood: CritterMood, t: number) { c.mood = mood; c.moodAt = t; }

  update(dt: number, t: number) {
    if (this.scene === 'squint') return;
    for (const c of this.critters) {
      if (c.gone > 0) {
        // back home for a moment, then a new one walks in
        c.gone -= dt;
        if (c.gone <= 0) { c.x = ENTRY_X + 0.4 + this.rand() * 0.6; c.fade = 1; c.hits = 0; c.yaw = FACE_CAMERA; this.setMood(c, 'walk', t); }
        continue;
      }
      if (c.flying) {
        // the magpie swoops back and forth over its lane, low enough to read which lane it's in
        c.x = 6.2 + Math.sin(t * 0.55 + c.phase) * 1.8;
        c.y = 0.75 + Math.sin(t * 1.1 + c.phase) * 0.1;
        c.yaw = Math.cos(t * 0.55 + c.phase) > 0 ? Math.PI - FACE_CAMERA : FACE_CAMERA;
        continue;
      }
      if (c.mood === 'flee') {
        c.x += 2.6 * dt;
        c.yaw = Math.PI - FACE_CAMERA;
        if (t - c.moodAt > 0.9) {
          c.fade = Math.max(0, c.fade - dt * 5);
          if (c.fade === 0) { this.poof(c.x, 0.4, c.z, 10, LEAF_COLORS, 6); c.gone = 2.5; }
        }
        continue;
      }
      if (c.mood === 'shooed') {
        c.x += 0.5 * dt * Math.max(0, 1 - (t - c.moodAt) / 0.35);
        if (t - c.moodAt > 0.35) this.setMood(c, c.speed === 0 && c.species === 'snail' ? 'nibble' : 'walk', t);
        continue;
      }
      c.x -= c.speed * dt;
      if (c.x < 0.5) c.x = ENTRY_X + 0.4;
    }
    // Rowans flick a berry about every 1.5 s at a critter ahead in their lane
    for (const p of this.plants) {
      if (p.species !== 'rowan') continue;
      const target = this.critters.some(c => !c.flying && !c.gone && c.mood !== 'flee' && c.lane === p.lane && c.x > colX(p.col));
      if (this.scene === 'style' && target && t - p.firedAt > 1.5) p.firedAt = t;
      const since = t - p.firedAt;
      if (since >= FLICK_RELEASE && since - dt < FLICK_RELEASE && this.scene === 'style') this.berries.push({ lane: p.lane, x: colX(p.col) + 0.45, y: 0.55, z: laneZ(p.lane), spin: 0, vx: 4.2 });
    }
    for (let i = this.berries.length - 1; i >= 0; i--) {
      const b = this.berries[i]!;
      b.x += b.vx * dt;
      b.spin += dt * 9;
      if (this.scene === 'stress') { if (b.x > ENTRY_X) b.x -= ENTRY_X; continue; }
      const hit = this.critters.find(c => !c.flying && !c.gone && c.mood !== 'flee' && c.lane === b.lane && Math.abs(c.x - b.x) < 0.3);
      if (hit) {
        hit.hits++;
        this.poof(b.x, 0.5, b.z, 4, LEAF_COLORS, 2);
        this.setMood(hit, hit.hits >= HITS_HOME ? 'flee' : 'shooed', t);
        this.berries.splice(i, 1);
      } else if (b.x > ENTRY_X + 0.6) this.berries.splice(i, 1);
    }
    for (let i = this.leaves.length - 1; i >= 0; i--) {
      const l = this.leaves[i]!;
      l.life -= dt;
      l.vy -= 4.5 * dt;
      l.x += l.vx * dt; l.y = Math.max(0.02, l.y + l.vy * dt); l.z += l.vz * dt;
      l.spin += dt * 5;
      if (l.life <= 0) this.leaves.splice(i, 1);
    }
    for (let i = this.sparkles.length - 1; i >= 0; i--) {
      const s = this.sparkles[i]!;
      s.life -= dt;
      s.y += s.vy * dt;
      s.size = Math.max(0, (s.life / s.full) * 1.6);
      if (s.life <= 0) this.sparkles.splice(i, 1);
    }
    // Comfrey squashes and pops out compost now and then; pickups float for a while, then sparkle away
    if (this.scene === 'style' && t > this.nextCompost) {
      this.nextCompost = t + 4.5;
      const comfreys = this.plants.filter(p => p.species === 'comfrey');
      const at = comfreys[Math.floor(this.rand() * comfreys.length)];
      if (at && this.compost.length < 6) {
        at.madeAt = t;
        this.compost.push({ x: colX(at.col) + 0.5, z: laneZ(at.lane) + 0.12, bornAt: t + 0.25, phase: this.rand() * 6, life: 9 });
      }
    }
    for (let i = this.compost.length - 1; i >= 0; i--) {
      const c = this.compost[i]!;
      c.life -= dt;
      if (c.life <= 0) { this.poof(c.x, 0.5, c.z, 0, LEAF_COLORS, 5); this.compost.splice(i, 1); }
    }
  }

  frame(t: number, reduced: boolean, highlight: Tile | null): Frame {
    return { t, reduced, plants: this.plants, critters: this.critters.filter(c => !c.gone), berries: this.berries, leaves: this.leaves, sparkles: this.sparkles, compost: this.compost, highlight };
  }
}
