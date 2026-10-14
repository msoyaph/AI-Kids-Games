// The 3D view of the garden: renderer, the screen-space backdrop, the fixed camera, a world's light,
// the static diorama and instanced layers for everything that moves. It draws a GameState (the
// rules' state) plus the controller's short-lived effects; it never changes the game. Layers are
// built only for the species in the current level. Characters lean back toward the camera
// (camera.ts lean) and stand on soft contact shadows on every tier; outlines and toon stay on Low.
import * as THREE from 'three';
import { pickNear, pickTile, snapRadius } from '../input/pick';
import { colX, COLS, ENTRY_X, laneZ, LANES, type Tile } from '../sim/board';
import { statsOf } from '../sim/game';
import type { Critter, GameState, Mood } from '../sim/types';
import type { WorldId } from '../data/roster';
import type { Insets } from '../ui/layout';
import { boing, plantSquash, poseCritter, posePlant, type CritterMood } from './animate';
import { Backdrop } from './backdrop';
import { Bloom } from './bloom';
import { fitCamera, lean, project, screenRay, upLeaned, type Fit } from './camera';
import { FX, MOTION, wave } from './fx';
import { BASKET_AT, buildGarden, buildSpecials, decorGeometry, decorSpots, GROUND_Y, laneUmbrellaZ, SLAB, snacks, UMBRELLA_X } from './garden';
import { torus } from './geo';
import { ModelLayer, SimpleLayer } from './instanced';
import { blobTexture, Materials, rim } from './materials';
import { CRITTER_MODELS } from './models/critters';
import { PLANT_MODELS } from './models/plants';
import { cart, compost, glowTexture, leaf, molehill, pebble, shotModels, sparkle, trail, umbrellaClosed, umbrellaOpen } from './models/props';
import { newPoses, type Model, type Pose } from './models/types';
import { QUALITY, type QualityTier } from './quality';
import { THEMES, type Theme } from './worlds';

export interface LeafSprite { x: number; y: number; z: number; spin: number; size: number; color: number }
export interface SparkleSprite { x: number; y: number; z: number; size: number; color: number }
/** An expanding ring on the ground (a chime, an umbrella's fwump), `age` 0–1. */
export interface RingSprite { x: number; z: number; age: number; size: number }

/** What to draw this frame: the game, the controller's effects, and the cursor. */
export interface DrawInput {
  t: number;
  reduced: boolean;
  game: GameState;
  leaves: readonly LeafSprite[];
  sparkles: readonly SparkleSprite[];
  rings: readonly RingSprite[];
  /** When each lane's umbrella sprang open (game time), for its pop-up animation. */
  umbrellaAt: readonly number[];
  highlight: Tile | null;
  /** Whether the highlighted tile can take the chosen card. */
  highlightOk: boolean;
}

const CAPACITY = { plant: 48, critter: 48, boss: 4, shot: 160, leaf: 220, sparkle: 140, compost: 24, ring: 24 } as const;
const COMPOST_H = 0.42, SHOT_H = 0.5, FLY_H = 0.75, TRAIL = 3;
const FACE_CAMERA = 0.4;
const MOOD: Record<Mood, CritterMood> = { walk: 'walk', nibble: 'nibble', shooed: 'shooed', flee: 'flee', under: 'walk', hop: 'walk' };

export class GardenView {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera();
  readonly backdrop = new Backdrop();
  readonly sun = new THREE.DirectionalLight(0xffffff, 2.5);
  readonly fill = new THREE.HemisphereLight(0xffffff, 0x7fae4e, 1.0);
  width = 1;
  height = 1;
  insets: Insets = { top: 0, right: 0, bottom: 0, left: 0 };
  tier: QualityTier;
  fit: Fit = { pitch: 1, distance: 40, ox: 0, oy: 0 };
  theme: Theme = THEMES.meadow;
  private bloom: Bloom | null = null;
  private garden: THREE.Group | null = null;
  private specials: THREE.Group | null = null;
  private readonly layers = new Map<string, ModelLayer>();
  private readonly poses = new Map<string, Pose>();
  private readonly shots = new Map<string, SimpleLayer>();
  private readonly compost: ModelLayer;
  private readonly glows: SimpleLayer;
  private readonly trails: SimpleLayer;
  private readonly leaves: SimpleLayer;
  private readonly sparkles: SimpleLayer;
  private readonly rings: SimpleLayer;
  private readonly closed: SimpleLayer;
  private readonly open: SimpleLayer;
  private readonly pebbles: SimpleLayer;
  private readonly molehills: SimpleLayer;
  private readonly cart: SimpleLayer;
  private readonly shadows: SimpleLayer;
  private readonly snackMeshes: THREE.Mesh[][] = [];
  private decorA: SimpleLayer | null = null;
  private decorB: SimpleLayer | null = null;
  private readonly ring: THREE.Mesh;
  private readonly ringOk: THREE.MeshBasicMaterial;
  private readonly ringNo: THREE.MeshBasicMaterial;
  private readonly squash = { sx: 1, sy: 1 };
  private readonly restPose = newPoses(1);
  private readonly at = new THREE.Vector3();

  constructor(canvas: HTMLCanvasElement, tier: QualityTier, antialias: boolean) {
    this.tier = tier;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias, alpha: false, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    // count every pass of a frame (backdrop, bloom), reset by render()
    this.renderer.info.autoReset = false;
    this.scene.add(this.fill, this.sun, this.sun.target);
    this.sun.position.set(-6, 9, 8);
    this.sun.target.position.set(4.5, 0, 2.9);
    const sh = this.sun.shadow;
    sh.camera.left = -9; sh.camera.right = 9; sh.camera.top = 8; sh.camera.bottom = -8; sh.camera.near = 1; sh.camera.far = 40;
    sh.bias = -0.0008;
    sh.normalBias = 0.02;
    this.compost = new ModelLayer(compost(), CAPACITY.compost);
    this.glows = new SimpleLayer(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: glowTexture(), transparent: true, depthWrite: false }), CAPACITY.compost);
    for (const [kind, m] of Object.entries(shotModels())) this.shots.set(kind, new SimpleLayer(m.geo, Materials.toonInst, CAPACITY.shot, false, m.hull));
    this.trails = new SimpleLayer(trail(), new THREE.MeshBasicMaterial({ color: 0xffd8cc, transparent: true, opacity: 0.5, depthWrite: false }), CAPACITY.shot * TRAIL);
    this.leaves = new SimpleLayer(leaf(), Materials.toonInstTwo, CAPACITY.leaf, true);
    this.sparkles = new SimpleLayer(sparkle(), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false }), CAPACITY.sparkle, true);
    this.rings = new SimpleLayer(torus(0.5, 0.05, 6, 32).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfffbe8, transparent: true, opacity: 0.7, depthWrite: false }), CAPACITY.ring);
    const u = umbrellaClosed(), o = umbrellaOpen(), pb = pebble(), mh = molehill(), ct = cart();
    this.closed = new SimpleLayer(u.geo, Materials.toonInst, LANES, false, u.hull);
    this.open = new SimpleLayer(o.geo, Materials.toonInst, LANES, false, o.hull);
    this.pebbles = new SimpleLayer(pb.geo, Materials.toonInst, LANES * COLS, false, pb.hull);
    this.molehills = new SimpleLayer(mh.geo, Materials.toonInst, 16, false, mh.hull);
    this.cart = new SimpleLayer(ct.geo, Materials.toonInst, 1, false, ct.hull);
    const shadowMat = Materials.blob.clone();
    shadowMat.map = blobTexture();
    this.shadows = new SimpleLayer(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), shadowMat, 260);
    this.glows.mesh.renderOrder = 2;
    this.trails.mesh.renderOrder = 3;
    this.sparkles.mesh.renderOrder = 4;
    this.rings.mesh.renderOrder = 4;
    for (const l of [this.shadows, this.glows, ...this.shots.values(), this.trails, this.leaves, this.sparkles, this.rings, this.closed, this.open, this.pebbles, this.molehills, this.cart]) this.scene.add(...l.all);
    this.scene.add(...this.compost.all);
    for (const s of snacks()) {
      const meshes = [new THREE.Mesh(s.geo, Materials.toon), ...(s.hull ? [new THREE.Mesh(s.hull, Materials.outline)] : [])];
      this.scene.add(...meshes);
      this.snackMeshes.push(meshes);
    }
    this.ringOk = new THREE.MeshBasicMaterial({ color: 0xfffbe8, transparent: true, opacity: 0.95, depthWrite: false });
    this.ringNo = new THREE.MeshBasicMaterial({ color: 0xff8a80, transparent: true, opacity: 0.85, depthWrite: false });
    this.ring = new THREE.Mesh(torus(0.42, 0.05, 6, 32).rotateX(Math.PI / 2), this.ringOk);
    this.ring.scale.set(1, 1, 1.15);
    this.ring.visible = false;
    this.ring.renderOrder = 5;
    this.scene.add(this.ring);
    this.setWorld('meadow');
    this.setQuality(tier);
  }

  /** Builds a world's garden, light and backdrop, and the level's special tiles. */
  setWorld(world: WorldId, specials?: GameState['spec']['specials']) {
    this.theme = THEMES[world];
    const t = this.theme;
    if (this.garden) { this.garden.removeFromParent(); this.garden.traverse(o => (o as THREE.Mesh).geometry?.dispose()); }
    if (this.specials) { this.specials.removeFromParent(); this.specials.traverse(o => (o as THREE.Mesh).geometry?.dispose()); }
    this.garden = buildGarden(t);
    this.specials = buildSpecials(specials);
    this.scene.add(this.garden, this.specials);
    this.renderer.setClearColor(t.skyLow, 1);
    this.sun.color.setHex(t.sun);
    this.sun.intensity = t.sunIntensity;
    this.fill.color.setHex(t.fillSky);
    this.fill.groundColor.setHex(t.fillGround);
    this.fill.intensity = t.fillIntensity;
    rim.color.value.setHex(t.rim);
    this.backdrop.setTheme(t);
    this.buildDecor(QUALITY[this.tier].decor);
    this.renderer.shadowMap.needsUpdate = true;
  }

  /** Makes sure the layers for these plants and critters exist (the level's roster). */
  prepare(kinds: readonly string[]) {
    for (const kind of kinds) this.layerFor(kind);
  }

  private layerFor(kind: string): ModelLayer | undefined {
    let layer = this.layers.get(kind);
    if (layer) return layer;
    const make = (PLANT_MODELS as Record<string, () => Model>)[kind] ?? (CRITTER_MODELS as Record<string, () => Model>)[kind];
    if (!make) return undefined;
    const model = make(), boss = ['grand-snail', 'big-beetle', 'badger-baron', 'billy-goat', 'captain-gull', 'parade-float'].includes(kind);
    layer = new ModelLayer(model, boss ? CAPACITY.boss : kind in PLANT_MODELS ? CAPACITY.plant : CAPACITY.critter);
    layer.lean = lean(this.fit.pitch);
    this.layers.set(kind, layer);
    this.poses.set(kind, newPoses(model.parts.length));
    this.scene.add(...layer.all);
    return layer;
  }

  setQuality(tier: QualityTier) {
    this.tier = tier;
    const spec = QUALITY[tier];
    this.renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, spec.pixelRatio));
    this.renderer.setSize(this.width, this.height, false);
    const shadows = spec.shadowMap > 0;
    this.renderer.shadowMap.enabled = shadows;
    this.renderer.shadowMap.needsUpdate = true;
    this.sun.castShadow = shadows;
    if (shadows && this.sun.shadow.mapSize.x !== spec.shadowMap) {
      this.sun.shadow.mapSize.set(spec.shadowMap, spec.shadowMap);
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
    }
    this.sun.shadow.radius = tier === 'medium' ? 4 : 2;
    rim.strength.value = spec.rim ? 0.3 : 0.18;
    this.scene.traverse(o => { const m = (o as THREE.Mesh).material; if (m) (Array.isArray(m) ? m : [m]).forEach(x => (x.needsUpdate = true)); });
    if (spec.bloom && !this.bloom) { this.bloom = new Bloom(); this.bloom.threshold = 0.92; this.bloom.strength = 0.28; }
    if (!spec.bloom && this.bloom) { this.bloom.dispose(); this.bloom = null; }
    this.bloom?.setSize(this.renderer.domElement.width, this.renderer.domElement.height);
    this.buildDecor(spec.decor);
  }

  private buildDecor(share: number) {
    for (const layer of [this.decorA, this.decorB]) if (layer) for (const m of layer.all) { m.removeFromParent(); m.dispose(); }
    const d = decorGeometry(this.theme);
    const a = decorSpots(Math.round(d.aCount * share), 11), b = decorSpots(Math.round(d.bCount * share), 23);
    this.decorA = new SimpleLayer(d.a.geo, Materials.toonInst, Math.max(1, a.length), false, d.a.hull);
    this.decorB = new SimpleLayer(d.b.geo, Materials.toonInst, Math.max(1, b.length), true, d.b.hull);
    const petals = [0xffffff, 0xffd23a, 0xff7eb6, 0xb98cff, 0xff5a4c];
    this.decorA.begin();
    for (const s of a) this.decorA.push(s.x, GROUND_Y, s.z, s.r, 0, s.s, s.s, s.s);
    this.decorA.end();
    this.decorB.begin();
    b.forEach((s, i) => this.decorB!.push(s.x, GROUND_Y, s.z, s.r, 0, s.s, s.s, s.s, this.theme.decor === 'meadow' || this.theme.decor === 'cloud' ? petals[i % petals.length] : 0xffffff));
    this.decorB.end();
    this.scene.add(...this.decorA.all, ...this.decorB.all);
  }

  /** Resize to the canvas's CSS size and refit the camera (and its tilt) to the open area. */
  resize(width: number, height: number, insets: Insets) {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.insets = insets;
    this.renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, QUALITY[this.tier].pixelRatio));
    this.renderer.setSize(this.width, this.height, false);
    this.bloom?.setSize(this.renderer.domElement.width, this.renderer.domElement.height);
    this.fit = fitCamera(this.camera, this.width, this.height, insets);
    const l = lean(this.fit.pitch);
    for (const layer of [...this.layers.values(), this.compost]) layer.lean = l;
    const ground = project(this.camera, this.width, this.height, colX(4), GROUND_Y, SLAB.z0).y;
    this.backdrop.resize(this.width, this.height, Math.max(0, ground));
    this.renderer.shadowMap.needsUpdate = true;
  }

  private critterZ(c: Critter) {
    return c.toLane === c.lane ? laneZ(c.lane) : laneZ(c.lane) + (laneZ(c.toLane) - laneZ(c.lane)) * Math.min(1, c.laneT);
  }

  draw(f: DrawInput) {
    const g = f.game, sh = this.shadows, l = lean(this.fit.pitch), t = f.t;
    sh.begin();
    // the lane umbrellas: closed in their stands until used, then open (popping up with a boing)
    this.closed.begin(); this.open.begin();
    for (let lane = 0; lane < LANES; lane++) {
      if (g.spec.umbrellas === false) continue;
      const z = laneUmbrellaZ(lane);
      if (g.umbrellas[lane]) this.closed.push(UMBRELLA_X, GROUND_Y + 0.03, z, 0, 0, 1, 1, 1, undefined, -l);
      else { const k = boing(g.t - (f.umbrellaAt[lane] ?? -10), 0.5, 0.35); this.open.push(UMBRELLA_X - 0.1, GROUND_Y + 0.03, z, 0, 0, 1 / Math.sqrt(k), k, 1 / Math.sqrt(k), undefined, -l * 0.6); }
      sh.push(UMBRELLA_X, GROUND_Y + 0.045, z, 0, 0, 0.42, 1, 0.34);
    }
    this.closed.end(); this.open.end();
    // snacks left in the basket; the cart in cart challenges
    this.snackMeshes.forEach((meshes, i) => { for (const m of meshes) m.visible = i < g.snacks && !g.spec.cartEvery; });
    this.cart.begin();
    if (g.spec.cartEvery) { this.cart.push(-0.95, GROUND_Y + 0.03, laneZ(g.cartLane), Math.PI, 0, 1, 1, 1, undefined, 0); sh.push(-0.95, GROUND_Y + 0.04, laneZ(g.cartLane), 0, 0, 0.9, 1, 0.6); }
    this.cart.end();
    // plants
    for (const layer of this.layers.values()) layer.begin();
    this.pebbles.begin();
    for (let lane = 0; lane < LANES; lane++) for (let col = 0; col < COLS; col++) {
      const cell = g.grid[lane]![col]!;
      if (cell.kind === 'pebble') { this.pebbles.push(colX(col), 0.06, laneZ(lane), lane + col, 0, 1, 1, 1); continue; }
      if (cell.kind !== 'plant') continue;
      const p = cell.plant, layer = this.layerFor(p.kind), pose = this.poses.get(p.kind);
      if (!layer || !pose) continue;
      posePlant(p.kind, pose, t, p.id * 1.7, t - p.actedAt, t - p.actedAt, f.reduced);
      const sq = plantSquash(g.t - p.bornAt, this.squash), droop = p.health / p.max < 0.35 ? 0.88 : 1;
      layer.push(colX(col), 0, laneZ(lane), 0, sq.sx, sq.sy * droop, sq.sx, pose);
      sh.push(colX(col), 0.012, laneZ(lane), 0, 0, layer.model.shadow * 2.2 * sq.sx, 1, layer.model.shadow * 1.7 * sq.sx);
    }
    this.pebbles.end();
    // critters (underground voles show as their molehill instead)
    this.molehills.begin();
    for (const c of g.critters) {
      const st = statsOf(c), z = this.critterZ(c);
      if (c.under) { this.molehills.push(st.digTo ?? 5, 0.02, laneZ(c.lane), 0, 0, 1, 1, 1); continue; }
      const layer = this.layerFor(c.kind), pose = this.poses.get(c.kind);
      if (!layer || !pose) continue;
      const fleeing = c.withSnack || c.mood === 'flee';
      poseCritter(c.kind, pose, t, c.id * 2.3, fleeing ? 'flee' : MOOD[c.mood], g.t - c.moodAt, f.reduced);
      const hop = g.t - c.hopAt < 0.5 ? Math.sin(((g.t - c.hopAt) / 0.5) * Math.PI) * 0.7 : 0;
      const h = st.moves === 'fly' ? FLY_H + (f.reduced ? 0 : Math.sin(t * 1.3 + c.id) * 0.06) : hop;
      upLeaned(this.fit.pitch, c.x, z, h, this.at);
      layer.push(this.at.x, this.at.y, this.at.z, fleeing ? Math.PI - FACE_CAMERA : FACE_CAMERA, 1, 1, 1, pose);
      const r = layer.model.shadow * (h > 0.2 ? 0.75 : 1);
      sh.push(c.x, 0.014, z, 0, 0, r * 2.3, 1, r * 1.6);
      // a magpie carrying a plant it borrowed
      if (c.carrying) { const pl = this.layerFor(c.carrying); if (pl) { upLeaned(this.fit.pitch, c.x, z, h - 0.35, this.at); pl.push(this.at.x, this.at.y, this.at.z, 0, 0.5, 0.5, 0.5, this.restPoseFor(pl)); } }
    }
    for (const layer of this.layers.values()) layer.end();
    this.molehills.end();
    // compost pickups float and bob in a soft glow
    this.compost.begin(); this.glows.begin();
    const pulse = f.reduced ? 1 : 1 + 0.08 * wave(FX.compostShimmerHz, t);
    for (const p of g.pickups) {
      const sq = plantSquash(g.t - p.bornAt, this.squash), bob = f.reduced ? 0 : 0.05 * wave(MOTION.bobHz, t, p.id);
      const z = laneZ(p.lane) + 0.12;
      upLeaned(this.fit.pitch, p.x, z, COMPOST_H + bob, this.at);
      this.compost.push(this.at.x, this.at.y - 0.17, this.at.z, f.reduced ? 0 : t * 0.6 + p.id, sq.sx, sq.sy, sq.sx, this.restPose);
      this.glows.push(this.at.x, this.at.y, this.at.z + 0.02, 0, 0, 0.95 * pulse * sq.sx, 0.95 * pulse * sq.sx, 1, undefined, -this.fit.pitch);
      sh.push(p.x, 0.016, z, 0, 0, 0.5, 1, 0.38);
    }
    this.compost.end(); this.glows.end();
    // shots: straight ones fly level with a short trail; lobs arc
    for (const layer of this.shots.values()) layer.begin();
    this.trails.begin();
    for (const s of g.shots) {
      const layer = this.shots.get(s.kind);
      if (!layer) continue;
      const z = laneZ(s.lane);
      let h = SHOT_H, spin = 0;
      if (s.lob) { const k = Math.min(1, (g.t - s.lob.at) / s.lob.len); h = SHOT_H + Math.sin(k * Math.PI) * 1.3; spin = t * 12; }
      if (s.kind === 'pinecone') { h = 0.15; spin = -g.t * 8; }
      upLeaned(this.fit.pitch, s.x, z, h, this.at);
      layer.push(this.at.x, this.at.y, this.at.z, spin, s.kind === 'pinecone' ? spin : 0, 1, 1, 1);
      if (!s.lob && s.kind !== 'pinecone') for (let k = 1; k <= TRAIL; k++) this.trails.push(this.at.x - k * 0.12, this.at.y, this.at.z, 0, 0, 1 - k * 0.25, 1 - k * 0.25, 1 - k * 0.25);
    }
    for (const layer of this.shots.values()) layer.end();
    this.trails.end();
    // effects from the controller
    this.leaves.begin();
    for (const p of f.leaves) { upLeaned(this.fit.pitch, p.x, p.z, p.y, this.at); this.leaves.push(this.at.x, this.at.y, this.at.z, p.spin, p.spin * 0.7, p.size, p.size, p.size, p.color); }
    this.leaves.end();
    this.sparkles.begin();
    for (const p of f.sparkles) { upLeaned(this.fit.pitch, p.x, p.z, p.y, this.at); this.sparkles.push(this.at.x, this.at.y, this.at.z, 0, 0, p.size, p.size, p.size, p.color, -this.fit.pitch); }
    this.sparkles.end();
    this.rings.begin();
    for (const r of f.rings) { const s = r.size * (0.4 + r.age); this.rings.push(r.x, 0.06, r.z, 0, 0, s, 1, s * 1.15); }
    this.rings.end();
    (this.rings.mesh.material as THREE.MeshBasicMaterial).opacity = 0.6;
    sh.end();
    this.ring.visible = !!f.highlight;
    this.ring.material = f.highlightOk ? this.ringOk : this.ringNo;
    if (f.highlight) this.ring.position.set(colX(f.highlight.col), 0.03, laneZ(f.highlight.lane));
    this.backdrop.update(t, f.reduced);
    if (this.bloom) this.bloom.strength = 0.28 + (f.reduced ? 0 : 0.03 * wave(FX.bloomBreatheHz, t));
  }

  private readonly rest = new Map<ModelLayer, Pose>();
  private restPoseFor(layer: ModelLayer) {
    let p = this.rest.get(layer);
    if (!p) { p = newPoses(layer.model.parts.length); this.rest.set(layer, p); }
    return p;
  }

  render() {
    const r = this.renderer;
    r.info.reset();
    r.autoClear = true;
    r.render(this.backdrop.scene, this.backdrop.camera);
    r.autoClear = false;
    r.clearDepth();
    if (this.bloom) this.bloom.render(r, this.scene, this.camera);
    else r.render(this.scene, this.camera);
    r.autoClear = true;
  }

  /** Where a tile's middle is on screen (CSS px). */
  tileOnScreen(tile: Tile) {
    return project(this.camera, this.width, this.height, colX(tile.col), 0, laneZ(tile.lane));
  }

  /** Where a point `h` up a leaned character standing at (x, z) is on screen. */
  onScreen(x: number, z: number, h = 0) {
    upLeaned(this.fit.pitch, x, z, h, this.at);
    return project(this.camera, this.width, this.height, this.at.x, this.at.y, this.at.z);
  }

  /** A compost pickup's middle on screen (for taps and tests). */
  pickupOnScreen(lane: number, x: number) { return this.onScreen(x, laneZ(lane) + 0.12, COMPOST_H); }

  /** The basket on screen (where collected compost flies to... and snacks leave from). */
  basketOnScreen() { return project(this.camera, this.width, this.height, BASKET_AT.x, 0.3, BASKET_AT.z); }

  /** The tile a tap at (sx, sy) means, snapping to the nearest tile `wanted` accepts. */
  pick(sx: number, sy: number, wanted: (tile: Tile) => boolean = () => true): Tile | null {
    const a = this.tileOnScreen({ lane: 2, col: 4 }), b = this.tileOnScreen({ lane: 2, col: 5 });
    return pickNear(pickTile(screenRay(this.camera, this.width, this.height, sx, sy)), sx, sy, wanted, t => this.tileOnScreen(t), snapRadius(Math.hypot(b.x - a.x, b.y - a.y)));
  }

  /** The tile size on screen (px), for snapping and hit areas. */
  tilePx() { const a = this.tileOnScreen({ lane: 2, col: 4 }), b = this.tileOnScreen({ lane: 2, col: 5 }); return Math.hypot(b.x - a.x, b.y - a.y); }

  stats() {
    const info = this.renderer.info;
    return { tier: this.tier, pixelRatio: this.renderer.getPixelRatio(), pitch: (this.fit.pitch * 180) / Math.PI, drawCalls: info.render.calls, triangles: info.render.triangles, programs: info.programs?.length ?? 0, geometries: info.memory.geometries, textures: info.memory.textures };
  }

  /** Warms up every shader program before the first frame is shown. */
  async warm() {
    await this.renderer.compileAsync(this.backdrop.scene, this.backdrop.camera);
    await this.renderer.compileAsync(this.scene, this.camera);
  }

  /** Where critters come in (for effects). */
  static entryX = ENTRY_X;
}
