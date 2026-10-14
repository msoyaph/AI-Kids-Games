// The style frame (phase 1): a staged Meadow moment with the first three plants and critters, plus
// the stress scene for performance. Not the game's rules (those arrive in phase 2's sim/): critters
// walk and loop, Rowans flick berries at whatever is in their lane, a hit makes a little poof of
// leaves, Comfrey makes compost, and the magpie circles. Tapping a free tile plants the chosen card.
import { colX, COLS, laneZ, LANES, type Tile } from '../sim/board';
import { FLICK_RELEASE } from '../render/animate';
import type { BerrySprite, CompostSprite, CritterSprite, Frame, LeafSprite, PlantSprite } from '../render/view';
import type { PlantModelId } from '../render/models/plants';
import { rng } from '../render/garden';

export type SceneName = 'style' | 'stress';

interface Critter extends CritterSprite { lane: number; speed: number; home: number; flying: boolean }
interface Berry extends BerrySprite { lane: number; vx: number }
interface Leaf extends LeafSprite { vx: number; vy: number; vz: number; life: number }

const CRITTER_YAW = 0.4;
const LEAF_COLORS = [0x7cc35e, 0xa3d977, 0xf1d36b, 0x5aa548];

export class Showcase {
  readonly plants: PlantSprite[] = [];
  readonly critters: Critter[] = [];
  readonly berries: Berry[] = [];
  readonly leaves: Leaf[] = [];
  readonly compost: CompostSprite[] = [];
  private readonly rand: () => number;
  private nextCompost = 3;
  /** Planted by taps (the style frame's one interaction). */
  planted = 0;

  constructor(readonly scene: SceneName, seed = 7) {
    this.rand = rng(seed);
    if (scene === 'style') this.stageStyle();
    else this.stageStress();
  }

  private plant(species: PlantModelId, lane: number, col: number, t = -10) {
    this.plants.push({ species, lane, col, bornAt: t, firedAt: -10 + this.rand() * 2, phase: this.rand() * 6.28 });
  }

  private critter(species: Critter['species'], lane: number, x: number, speed: number) {
    const flying = species === 'magpie';
    this.critters.push({ species, lane, x, z: laneZ(lane), y: flying ? 1.2 : 0, yaw: flying ? 0.2 : CRITTER_YAW, phase: this.rand() * 6.28, speed, home: x, flying });
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
    this.critter('snail', 0, 6.8, 0.12);
    for (let i = 0; i < 5; i++) this.critter('ant', 1, 7.6 + i * 0.24, 0.32);
    this.critter('snail', 3, 8.4, 0.12);
    for (let i = 0; i < 5; i++) this.critter('ant', 4, 9.4 + i * 0.24, 0.32);
    this.critter('magpie', 2, 6.5, 0);
    this.compost.push({ x: colX(5) - 0.1, z: laneZ(4) + 0.1, bornAt: -10 }, { x: colX(3) + 0.1, z: laneZ(1) - 0.05, bornAt: -10 });
  }

  private stageStress() {
    // the brief's target: a full board of 45 plants, 40 critters and 150 berries in the air
    const kinds: PlantModelId[] = ['comfrey', 'rowan', 'boxwood'];
    for (let lane = 0; lane < LANES; lane++) for (let col = 0; col < COLS; col++) this.plant(kinds[(lane + col) % 3]!, lane, col);
    for (let i = 0; i < 40; i++) {
      const lane = i % LANES, species = i % 8 === 7 ? 'magpie' : i % 3 === 0 ? 'snail' : 'ant';
      this.critter(species, lane, 1 + ((i * 2.3) % 9), species === 'snail' ? 0.12 : 0.3);
    }
    for (let i = 0; i < 150; i++) {
      const lane = i % LANES;
      this.berries.push({ lane, x: (i * 0.37) % 9.5, y: 0.45, z: laneZ(lane) + 0.05, spin: 0, vx: 4.2 });
    }
  }

  isFree(tile: Tile) { return !this.plants.some(p => p.lane === tile.lane && p.col === tile.col); }

  /** Plants `species` on a free tile (a tap in the style frame). */
  plantAt(species: PlantModelId, tile: Tile, t: number) {
    if (!this.isFree(tile)) return false;
    this.plant(species, tile.lane, tile.col, t);
    this.poof(colX(tile.col), 0.15, laneZ(tile.lane), 5, [0x7a5236, 0x8f6440]);
    this.planted++;
    return true;
  }

  private poof(x: number, y: number, z: number, n: number, colors = LEAF_COLORS) {
    for (let i = 0; i < n && this.leaves.length < 150; i++) {
      const a = this.rand() * Math.PI * 2, sp = 0.6 + this.rand() * 0.9;
      this.leaves.push({ x, y, z, vx: Math.cos(a) * sp, vy: 1.2 + this.rand() * 1.1, vz: Math.sin(a) * sp * 0.7, spin: this.rand() * 6, size: 0.7 + this.rand() * 0.6, color: colors[i % colors.length]!, life: 0.9 + this.rand() * 0.4 });
    }
  }

  update(dt: number, t: number) {
    // critters walk toward the blanket and loop back to where they came in
    for (const c of this.critters) {
      if (c.flying) {
        // the magpie circles over the middle lanes
        const a = t * 0.45 + c.phase;
        c.x = 5.6 + Math.cos(a) * 1.6;
        c.z = laneZ(c.lane) + Math.sin(a) * 1.0;
        c.y = 1.15 + Math.sin(a * 2) * 0.12;
        // the model faces -x; turn it along the circle (forward after a turn θ is (-cos θ, sin θ))
        c.yaw = Math.atan2(Math.cos(a), Math.sin(a) * 1.6);
        continue;
      }
      c.x -= c.speed * dt;
      if (c.x < 0.6) c.x += 9.5;
    }
    // Rowans flick a berry about every 1.6 s at a critter ahead in their lane
    for (const p of this.plants) {
      if (p.species !== 'rowan') continue;
      const target = this.critters.some(c => !c.flying && c.lane === p.lane && c.x > colX(p.col));
      if (this.scene === 'style' && target && t - p.firedAt > 1.6) p.firedAt = t;
      const since = t - p.firedAt;
      if (since >= FLICK_RELEASE && since - dt < FLICK_RELEASE && this.scene === 'style') this.berries.push({ lane: p.lane, x: colX(p.col) + 0.3, y: 0.42, z: laneZ(p.lane) + 0.08, spin: 0, vx: 3.6 });
    }
    for (let i = this.berries.length - 1; i >= 0; i--) {
      const b = this.berries[i]!;
      b.x += b.vx * dt;
      b.spin += dt * 8;
      b.y = 0.42 + Math.sin(b.x * 3) * 0.02;
      const hit = this.critters.find(c => !c.flying && c.lane === b.lane && Math.abs(c.x - b.x) < 0.2);
      if (this.scene === 'stress') { if (b.x > 10) b.x -= 9.5; continue; }
      if (hit || b.x > 10.5) {
        if (hit) this.poof(b.x, 0.25, b.z, 4);
        this.berries.splice(i, 1);
      }
    }
    for (let i = this.leaves.length - 1; i >= 0; i--) {
      const l = this.leaves[i]!;
      l.life -= dt;
      l.vy -= 4.5 * dt;
      l.x += l.vx * dt; l.y = Math.max(0.02, l.y + l.vy * dt); l.z += l.vz * dt;
      l.spin += dt * 5;
      if (l.life <= 0) this.leaves.splice(i, 1);
    }
    // a Comfrey makes a compost pile now and then (a worm pops up on the next spot along)
    if (this.scene === 'style' && t > this.nextCompost) {
      this.nextCompost = t + 6;
      const comfreys = this.plants.filter(p => p.species === 'comfrey');
      const at = comfreys[Math.floor(this.rand() * comfreys.length)];
      if (at && this.compost.length < 5) this.compost.push({ x: colX(at.col) + 0.32, z: laneZ(at.lane) + 0.28, bornAt: t });
      else if (this.compost.length >= 5) this.compost.splice(0, 1);
    }
  }

  frame(t: number, reduced: boolean, highlight: Tile | null): Frame {
    return { t, reduced, plants: this.plants, critters: this.critters, berries: this.berries, leaves: this.leaves, compost: this.compost, highlight };
  }
}
