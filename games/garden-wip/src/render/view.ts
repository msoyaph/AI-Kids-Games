// The 3D view of the garden: renderer, the screen-space backdrop, the fixed camera, world light, the
// static diorama and the instanced layers for everything that moves. It only draws what it's given
// (a Frame); the rules live elsewhere. Picking goes through the same camera math the pick test
// proves. Characters lean back toward the camera (camera.ts lean), and stand on soft contact
// shadows on every tier; outlines and toon shading stay on Low too.
import * as THREE from 'three';
import { pickNear, pickTile, snapRadius } from '../input/pick';
import { colX, laneZ, LANES, type Tile } from '../sim/board';
import type { Insets } from '../ui/layout';
import { plantSquash, poseCritter, posePlant, type CritterMood } from './animate';
import { Backdrop } from './backdrop';
import { Bloom } from './bloom';
import { fitCamera, lean, project, screenRay, upLeaned, type Fit } from './camera';
import { FX, MOTION, wave } from './fx';
import { buildGarden, decorSpots, GROUND_Y, laneUmbrellaZ, SLAB, UMBRELLA_X } from './garden';
import { torus } from './geo';
import { ModelLayer, SimpleLayer } from './instanced';
import { blobTexture, Materials, rim } from './materials';
import { CRITTER_MODELS, type CritterModelId } from './models/critters';
import { PLANT_MODELS, type PlantModelId } from './models/plants';
import { berry, compost, flower, glowTexture, leaf, sparkle, trail, tuft, umbrellaClosed } from './models/props';
import { newPoses, type Model, type Pose } from './models/types';
import { PALETTE } from './palette';
import { QUALITY, type QualityTier } from './quality';

export interface PlantSprite { species: PlantModelId; lane: number; col: number; bornAt: number; firedAt: number; madeAt: number; phase: number }
export interface CritterSprite { species: CritterModelId; x: number; z: number; /** Height above the ground (flyers). */ y: number; yaw: number; phase: number; mood: CritterMood; moodAt: number; fade: number }
export interface BerrySprite { x: number; y: number; z: number; spin: number }
export interface LeafSprite { x: number; y: number; z: number; spin: number; size: number; color: number }
export interface SparkleSprite { x: number; y: number; z: number; size: number; color: number }
export interface CompostSprite { x: number; z: number; bornAt: number; phase: number }

/** Everything that moves, for one frame. */
export interface Frame {
  t: number;
  reduced: boolean;
  plants: readonly PlantSprite[];
  critters: readonly CritterSprite[];
  berries: readonly BerrySprite[];
  leaves: readonly LeafSprite[];
  sparkles: readonly SparkleSprite[];
  compost: readonly CompostSprite[];
  /** The tile under the pointer or cursor, ringed. */
  highlight: Tile | null;
}

const LIGHT = { sky: 0xe6f6ff, ground: 0x7fae4e, sun: 0xfff1d8, rim: 0xfff4d8 };
const CAPACITY = { plant: 64, critter: 64, berry: 192, leaf: 200, sparkle: 120, compost: 24 } as const;
/** How high pickups float (world units, up a leaned character); berries trail this many puffs. */
const COMPOST_H = 0.42, TRAIL = 4;

export class GardenView {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera();
  readonly backdrop = new Backdrop();
  readonly sun = new THREE.DirectionalLight(LIGHT.sun, 2.5);
  readonly fill = new THREE.HemisphereLight(LIGHT.sky, LIGHT.ground, 1.0);
  width = 1;
  height = 1;
  insets: Insets = { top: 0, right: 0, bottom: 0, left: 0 };
  tier: QualityTier;
  fit: Fit = { pitch: 1, distance: 40, ox: 0, oy: 0 };
  private bloom: Bloom | null = null;
  private readonly plants = new Map<PlantModelId, ModelLayer>();
  private readonly critters = new Map<CritterModelId, ModelLayer>();
  private readonly poses = new Map<string, Pose>();
  private readonly compost: ModelLayer;
  private readonly glows: SimpleLayer;
  private readonly berries: SimpleLayer;
  private readonly trails: SimpleLayer;
  private readonly leaves: SimpleLayer;
  private readonly sparkles: SimpleLayer;
  private readonly umbrellas: SimpleLayer;
  private readonly shadows: SimpleLayer;
  private tufts: SimpleLayer | null = null;
  private flowers: SimpleLayer | null = null;
  private readonly ring: THREE.Mesh;
  private readonly squash = { sx: 1, sy: 1 };
  private readonly restPose = newPoses(1);
  private readonly at = new THREE.Vector3();

  constructor(canvas: HTMLCanvasElement, tier: QualityTier, antialias: boolean) {
    this.tier = tier;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setClearColor(PALETTE.skyLow, 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    // count every pass of a frame (backdrop, bloom), reset by render()
    this.renderer.info.autoReset = false;
    this.scene.add(buildGarden(), this.fill, this.sun, this.sun.target);
    // from the upper left and a little in front: characters get a lit side and a shaded side
    this.sun.position.set(-6, 9, 8);
    this.sun.target.position.set(4.5, 0, 2.9);
    const sh = this.sun.shadow;
    sh.camera.left = -9; sh.camera.right = 9; sh.camera.top = 8; sh.camera.bottom = -8; sh.camera.near = 1; sh.camera.far = 40;
    sh.bias = -0.0008;
    sh.normalBias = 0.02;
    rim.color.value.setHex(LIGHT.rim);
    for (const id of Object.keys(PLANT_MODELS) as PlantModelId[]) this.addLayer(this.plants, id, PLANT_MODELS[id](), CAPACITY.plant);
    for (const id of Object.keys(CRITTER_MODELS) as CritterModelId[]) this.addLayer(this.critters, id, CRITTER_MODELS[id](), CAPACITY.critter);
    this.compost = new ModelLayer(compost(), CAPACITY.compost);
    const glowMat = new THREE.MeshBasicMaterial({ map: glowTexture(), transparent: true, depthWrite: false });
    this.glows = new SimpleLayer(new THREE.PlaneGeometry(1, 1), glowMat, CAPACITY.compost);
    const b = berry();
    this.berries = new SimpleLayer(b.geo, Materials.toonInst, CAPACITY.berry, false, b.hull);
    this.trails = new SimpleLayer(trail(), new THREE.MeshBasicMaterial({ color: 0xffc2b5, transparent: true, opacity: 0.55, depthWrite: false }), CAPACITY.berry * TRAIL);
    this.leaves = new SimpleLayer(leaf(), Materials.toonInstTwo, CAPACITY.leaf, true);
    this.sparkles = new SimpleLayer(sparkle(), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false }), CAPACITY.sparkle, true);
    const u = umbrellaClosed();
    this.umbrellas = new SimpleLayer(u.geo, Materials.toonInst, LANES, false, u.hull);
    const shadowMat = Materials.blob.clone();
    shadowMat.map = blobTexture();
    this.shadows = new SimpleLayer(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), shadowMat, CAPACITY.plant + CAPACITY.critter + CAPACITY.compost + LANES);
    this.glows.mesh.renderOrder = 2;
    this.trails.mesh.renderOrder = 3;
    this.sparkles.mesh.renderOrder = 4;
    this.scene.add(...this.shadows.all, ...this.compost.all, ...this.glows.all, ...this.berries.all, ...this.trails.all, ...this.leaves.all, ...this.sparkles.all, ...this.umbrellas.all);
    this.ring = new THREE.Mesh(torus(0.42, 0.045, 6, 32).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfffbe8, transparent: true, opacity: 0.95, depthWrite: false }));
    this.ring.scale.set(1, 1, 1.15);
    this.ring.visible = false;
    this.ring.renderOrder = 5;
    this.scene.add(this.ring);
    this.setQuality(tier);
  }

  private addLayer<K extends string>(map: Map<K, ModelLayer>, id: K, model: Model, cap: number) {
    const layer = new ModelLayer(model, cap);
    map.set(id, layer);
    this.poses.set(id, newPoses(model.parts.length));
    this.scene.add(...layer.all);
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
    // materials compile differently with and without shadows
    this.scene.traverse(o => { const m = (o as THREE.Mesh).material; if (m) (Array.isArray(m) ? m : [m]).forEach(x => (x.needsUpdate = true)); });
    if (spec.bloom && !this.bloom) { this.bloom = new Bloom(); this.bloom.threshold = 0.92; this.bloom.strength = 0.28; }
    if (!spec.bloom && this.bloom) { this.bloom.dispose(); this.bloom = null; }
    this.bloom?.setSize(this.renderer.domElement.width, this.renderer.domElement.height);
    this.buildDecor(spec.decor);
  }

  private buildDecor(share: number) {
    for (const layer of [this.tufts, this.flowers]) if (layer) for (const m of layer.all) { m.removeFromParent(); m.dispose(); }
    const tuftSpots = decorSpots(Math.round(150 * share), 11), flowerSpots = decorSpots(Math.round(60 * share), 23);
    this.tufts = new SimpleLayer(tuft(), Materials.toonInst, tuftSpots.length);
    const f = flower();
    this.flowers = new SimpleLayer(f.geo, Materials.toonInst, flowerSpots.length, true, f.hull);
    const petals = [0xffffff, 0xffd23a, 0xff7eb6, 0xb98cff, 0xff5a4c];
    this.tufts.begin();
    for (const s of tuftSpots) this.tufts.push(s.x, GROUND_Y, s.z, s.r, 0, s.s, s.s, s.s);
    this.tufts.end();
    this.flowers.begin();
    flowerSpots.forEach((s, i) => this.flowers!.push(s.x, GROUND_Y, s.z, s.r, 0, s.s, s.s, s.s, petals[i % petals.length]));
    this.flowers.end();
    this.scene.add(...this.tufts.all, ...this.flowers.all);
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
    for (const layer of [...this.plants.values(), ...this.critters.values(), this.compost]) layer.lean = l;
    this.umbrellas.begin();
    for (let lane = 0; lane < LANES; lane++) this.umbrellas.push(UMBRELLA_X, GROUND_Y + 0.03, laneUmbrellaZ(lane), 0, 0, 1, 1, 1, undefined, -l);
    this.umbrellas.end();
    // the backdrop's fence stands where the garden's slab ends at the back
    const ground = project(this.camera, this.width, this.height, colX(4), GROUND_Y, SLAB.z0).y;
    this.backdrop.resize(this.width, this.height, Math.max(0, ground));
    this.renderer.shadowMap.needsUpdate = true;
  }

  draw(f: Frame) {
    const sh = this.shadows;
    sh.begin();
    for (let lane = 0; lane < LANES; lane++) sh.push(UMBRELLA_X, GROUND_Y + 0.045, laneUmbrellaZ(lane), 0, 0, 0.42, 1, 0.34);
    for (const layer of this.plants.values()) layer.begin();
    for (const pl of f.plants) {
      const layer = this.plants.get(pl.species)!, pose = this.poses.get(pl.species)!;
      posePlant(pl.species, pose, f.t, pl.phase, f.t - pl.firedAt, f.t - pl.madeAt, f.reduced);
      const sq = plantSquash(f.t - pl.bornAt, this.squash);
      const x = colX(pl.col), z = laneZ(pl.lane);
      layer.push(x, 0, z, 0, sq.sx, sq.sy, sq.sx, pose);
      sh.push(x, 0.012, z, 0, 0, layer.model.shadow * 2.2 * sq.sx, 1, layer.model.shadow * 1.7 * sq.sx);
    }
    for (const layer of this.plants.values()) layer.end();
    for (const layer of this.critters.values()) layer.begin();
    for (const c of f.critters) {
      const layer = this.critters.get(c.species)!, pose = this.poses.get(c.species)!;
      poseCritter(c.species, pose, f.t, c.phase, c.mood, f.t - c.moodAt, f.reduced);
      upLeaned(this.fit.pitch, c.x, c.z, c.y, this.at);
      const k = c.fade;
      layer.push(this.at.x, this.at.y, this.at.z, c.yaw, k, k, k, pose);
      const r = layer.model.shadow * (c.y > 0.2 ? 0.75 : 1) * k;
      sh.push(c.x, 0.014, c.z, 0, 0, r * 2.3, 1, r * 1.6);
    }
    for (const layer of this.critters.values()) layer.end();
    // compost pickups float and bob in a soft glow
    this.compost.begin();
    this.glows.begin();
    const pulse = f.reduced ? 1 : 1 + 0.08 * wave(FX.compostShimmerHz, f.t);
    for (const c of f.compost) {
      const sq = plantSquash(f.t - c.bornAt, this.squash), bob = f.reduced ? 0 : 0.05 * wave(MOTION.bobHz, f.t, c.phase);
      upLeaned(this.fit.pitch, c.x, c.z, COMPOST_H + bob, this.at);
      this.compost.push(this.at.x, this.at.y - 0.17, this.at.z, f.reduced ? 0 : f.t * 0.6 + c.phase, sq.sx, sq.sy, sq.sx, this.restPose);
      this.glows.push(this.at.x, this.at.y, this.at.z + 0.02, 0, 0, 0.95 * pulse * sq.sx, 0.95 * pulse * sq.sx, 1, undefined, -this.fit.pitch);
      sh.push(c.x, 0.016, c.z, 0, 0, 0.5, 1, 0.38);
    }
    this.compost.end();
    this.glows.end();
    // berries fly with a short trail behind them
    this.berries.begin();
    this.trails.begin();
    for (const b of f.berries) {
      upLeaned(this.fit.pitch, b.x, b.z, b.y, this.at);
      this.berries.push(this.at.x, this.at.y, this.at.z, b.spin, 0, 1, 1, 1);
      for (let k = 1; k <= TRAIL; k++) this.trails.push(this.at.x - k * 0.11, this.at.y, this.at.z, 0, 0, 1 - k * 0.2, 1 - k * 0.2, 1 - k * 0.2);
    }
    this.berries.end();
    this.trails.end();
    this.leaves.begin();
    for (const p of f.leaves) { upLeaned(this.fit.pitch, p.x, p.z, p.y, this.at); this.leaves.push(this.at.x, this.at.y, this.at.z, p.spin, p.spin * 0.7, p.size, p.size, p.size, p.color); }
    this.leaves.end();
    this.sparkles.begin();
    for (const p of f.sparkles) { upLeaned(this.fit.pitch, p.x, p.z, p.y, this.at); this.sparkles.push(this.at.x, this.at.y, this.at.z, 0, 0, p.size, p.size, p.size, p.color, -this.fit.pitch); }
    this.sparkles.end();
    sh.end();
    this.ring.visible = !!f.highlight;
    if (f.highlight) this.ring.position.set(colX(f.highlight.col), 0.03, laneZ(f.highlight.lane));
    this.backdrop.update(f.t, f.reduced);
    if (this.bloom) this.bloom.strength = 0.28 + (f.reduced ? 0 : 0.03 * wave(FX.bloomBreatheHz, f.t));
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

  /** The tile a tap at (sx, sy) means, snapping to the nearest tile `wanted` accepts. */
  pick(sx: number, sy: number, wanted: (tile: Tile) => boolean = () => true): Tile | null {
    const a = this.tileOnScreen({ lane: 2, col: 4 }), b = this.tileOnScreen({ lane: 2, col: 5 });
    return pickNear(pickTile(screenRay(this.camera, this.width, this.height, sx, sy)), sx, sy, wanted, t => this.tileOnScreen(t), snapRadius(Math.hypot(b.x - a.x, b.y - a.y)));
  }

  stats() {
    const info = this.renderer.info;
    return { tier: this.tier, pixelRatio: this.renderer.getPixelRatio(), pitch: (this.fit.pitch * 180) / Math.PI, drawCalls: info.render.calls, triangles: info.render.triangles, programs: info.programs?.length ?? 0, geometries: info.memory.geometries, textures: info.memory.textures };
  }

  /** Warms up every shader program before the first frame is shown. */
  async warm() {
    await this.renderer.compileAsync(this.backdrop.scene, this.backdrop.camera);
    await this.renderer.compileAsync(this.scene, this.camera);
  }
}
