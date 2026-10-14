// The 3D view of the garden: renderer, scene, fixed camera, world light, the static diorama and the
// instanced layers for everything that moves. It only draws what it's given (a Frame); the rules
// live elsewhere. Picking goes through the same camera math the pick test proves.
import * as THREE from 'three';
import { pickNear, pickTile } from '../input/pick';
import { colX, laneZ, LANES, type Tile } from '../sim/board';
import type { Insets } from '../ui/layout';
import { FLICK_RELEASE, plantSquash, poseCritter, posePlant } from './animate';
import { Bloom } from './bloom';
import { fitCamera, project, screenRay } from './camera';
import { FX, wave } from './fx';
import { buildGarden, decorSpots, GROUND_Y, laneUmbrellaZ, SLAB, UMBRELLA_X } from './garden';
import { torus } from './geo';
import { ModelLayer, SimpleLayer } from './instanced';
import { blobTexture, Materials, rim } from './materials';
import { CRITTER_MODELS, type CritterModelId } from './models/critters';
import { PLANT_MODELS, type PlantModelId } from './models/plants';
import { berry, compost, flower, leaf, tuft, umbrellaClosed } from './models/props';
import { newPoses, type Model, type Pose } from './models/types';
import { QUALITY, type QualityTier } from './quality';

export interface PlantSprite { species: PlantModelId; lane: number; col: number; bornAt: number; firedAt: number; phase: number }
export interface CritterSprite { species: CritterModelId; x: number; z: number; y: number; yaw: number; phase: number }
export interface BerrySprite { x: number; y: number; z: number; spin: number }
export interface LeafSprite { x: number; y: number; z: number; spin: number; size: number; color: number }
export interface CompostSprite { x: number; z: number; bornAt: number }

/** Everything that moves, for one frame. */
export interface Frame {
  t: number;
  reduced: boolean;
  plants: readonly PlantSprite[];
  critters: readonly CritterSprite[];
  berries: readonly BerrySprite[];
  leaves: readonly LeafSprite[];
  compost: readonly CompostSprite[];
  /** The tile under the pointer or cursor, ringed. */
  highlight: Tile | null;
}

const MEADOW = { sky: 0xe4f4ff, ground: 0x6f9a4c, sun: 0xfff0d6, rim: 0xfff3d6 };
const CAPACITY = { plant: 64, critter: 64, berry: 192, leaf: 160, compost: 24 } as const;

export class GardenView {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera();
  readonly sun = new THREE.DirectionalLight(MEADOW.sun, 1.85);
  readonly fill = new THREE.HemisphereLight(MEADOW.sky, MEADOW.ground, 1.25);
  width = 1;
  height = 1;
  insets: Insets = { top: 0, right: 0, bottom: 0, left: 0 };
  tier: QualityTier;
  private bloom: Bloom | null = null;
  private readonly plants = new Map<PlantModelId, ModelLayer>();
  private readonly critters = new Map<CritterModelId, ModelLayer>();
  private readonly poses = new Map<string, Pose>();
  private readonly berries = new SimpleLayer(berry(), Materials.toonInst, CAPACITY.berry);
  private readonly leaves = new SimpleLayer(leaf(), Materials.toonInstTwo, CAPACITY.leaf, true);
  private readonly compost: ModelLayer;
  private readonly umbrellas = new SimpleLayer(umbrellaClosed(), Materials.toonInst, LANES);
  private readonly blobs: SimpleLayer;
  private tufts: SimpleLayer | null = null;
  private flowers: SimpleLayer | null = null;
  private readonly ring: THREE.Mesh;
  private readonly squash = { sx: 1, sy: 1 };
  private readonly restPose = newPoses(1);

  constructor(canvas: HTMLCanvasElement, tier: QualityTier, antialias: boolean) {
    this.tier = tier;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // count every pass of a frame (bloom draws several), reset by render()
    this.renderer.info.autoReset = false;
    this.scene.add(buildGarden(), this.fill, this.sun, this.sun.target);
    this.sun.position.set(-1.5, 12, 10);
    this.sun.target.position.set(4.5, 0, 3.2);
    const sh = this.sun.shadow;
    sh.camera.left = -9; sh.camera.right = 9; sh.camera.top = 8; sh.camera.bottom = -8; sh.camera.near = 1; sh.camera.far = 40;
    sh.bias = -0.0008;
    sh.normalBias = 0.02;
    rim.color.value.setHex(MEADOW.rim);
    for (const id of Object.keys(PLANT_MODELS) as PlantModelId[]) this.addLayer(this.plants, id, PLANT_MODELS[id](), CAPACITY.plant);
    for (const id of Object.keys(CRITTER_MODELS) as CritterModelId[]) this.addLayer(this.critters, id, CRITTER_MODELS[id](), CAPACITY.critter);
    this.compost = new ModelLayer(compost(), CAPACITY.compost);
    this.scene.add(...this.compost.meshes, this.berries.mesh, this.leaves.mesh, this.umbrellas.mesh);
    this.berries.mesh.castShadow = true;
    this.umbrellas.mesh.castShadow = true;
    const blobMat = Materials.blob.clone();
    blobMat.map = blobTexture();
    this.blobs = new SimpleLayer(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), blobMat, CAPACITY.plant + CAPACITY.critter + CAPACITY.compost);
    this.scene.add(this.blobs.mesh);
    this.ring = new THREE.Mesh(torus(0.4, 0.035, 6, 32).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfffbe8, transparent: true, opacity: 0.9, depthWrite: false }));
    this.ring.scale.set(1, 1, 1.25);
    this.ring.visible = false;
    this.ring.renderOrder = 5;
    this.scene.add(this.ring);
    this.umbrellas.begin();
    for (let lane = 0; lane < LANES; lane++) this.umbrellas.push(UMBRELLA_X, GROUND_Y + 0.03, laneUmbrellaZ(lane), 0, 0, 1.35, 1.35, 1.35);
    this.umbrellas.end();
    this.setQuality(tier);
  }

  private addLayer<K extends string>(map: Map<K, ModelLayer>, id: K, model: Model, cap: number) {
    const layer = new ModelLayer(model, cap);
    map.set(id, layer);
    this.poses.set(id, newPoses(model.parts.length));
    this.scene.add(...layer.meshes);
  }

  setQuality(tier: QualityTier) {
    this.tier = tier;
    const spec = QUALITY[tier];
    this.renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, spec.pixelRatio));
    this.renderer.setSize(this.width, this.height, false);
    const shadows = spec.shadowMap > 0;
    this.renderer.shadowMap.enabled = shadows;
    this.sun.castShadow = shadows;
    if (shadows && this.sun.shadow.mapSize.x !== spec.shadowMap) {
      this.sun.shadow.mapSize.set(spec.shadowMap, spec.shadowMap);
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
    }
    this.sun.shadow.radius = tier === 'medium' ? 4 : 2;
    rim.strength.value = spec.rim ? 0.32 : 0;
    this.blobs.mesh.visible = !shadows;
    // materials compile differently with and without shadows
    this.scene.traverse(o => { const m = (o as THREE.Mesh).material; if (m) (Array.isArray(m) ? m : [m]).forEach(x => (x.needsUpdate = true)); });
    if (spec.bloom && !this.bloom) { this.bloom = new Bloom(); this.bloom.threshold = 0.9; this.bloom.strength = 0.3; }
    if (!spec.bloom && this.bloom) { this.bloom.dispose(); this.bloom = null; }
    this.bloom?.setSize(this.renderer.domElement.width, this.renderer.domElement.height);
    this.buildDecor(spec.decor);
  }

  private buildDecor(share: number) {
    for (const layer of [this.tufts, this.flowers]) if (layer) { layer.mesh.removeFromParent(); layer.mesh.dispose(); }
    const tuftSpots = decorSpots(Math.round(170 * share), 11), flowerSpots = decorSpots(Math.round(70 * share), 23);
    this.tufts = new SimpleLayer(tuft(), Materials.toonInst, tuftSpots.length);
    this.flowers = new SimpleLayer(flower(), Materials.toonInst, flowerSpots.length, true);
    const petals = [0xffffff, 0xffffff, 0xfff0a8, 0xf7a6c4, 0xe9504a];
    this.tufts.begin();
    for (const s of tuftSpots) this.tufts.push(s.x, GROUND_Y, s.z, s.r, 0, s.s, s.s, s.s);
    this.tufts.end();
    this.flowers.begin();
    flowerSpots.forEach((s, i) => this.flowers!.push(s.x, GROUND_Y, s.z, s.r, 0, s.s, s.s, s.s, petals[i % petals.length]));
    this.flowers.end();
    this.scene.add(this.tufts.mesh, this.flowers.mesh);
  }

  /** Resize to the canvas's CSS size and refit the camera to the open area. */
  resize(width: number, height: number, insets: Insets) {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.insets = insets;
    this.renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, QUALITY[this.tier].pixelRatio));
    this.renderer.setSize(this.width, this.height, false);
    this.bloom?.setSize(this.renderer.domElement.width, this.renderer.domElement.height);
    fitCamera(this.camera, this.width, this.height, insets);
  }

  draw(f: Frame) {
    const blobs = this.blobs, showBlobs = blobs.mesh.visible;
    blobs.begin();
    for (const layer of this.plants.values()) layer.begin();
    for (const pl of f.plants) {
      const layer = this.plants.get(pl.species)!, pose = this.poses.get(pl.species)!;
      posePlant(pl.species, pose, f.t, pl.phase, f.t - pl.firedAt, f.reduced);
      const sq = plantSquash(f.t - pl.bornAt, this.squash);
      const x = colX(pl.col), z = laneZ(pl.lane);
      layer.push(x, 0, z, 0, sq.sx, sq.sy, sq.sx, pose);
      if (showBlobs) blobs.push(x, 0.005, z, 0, 0, layer.model.shadow * 2 * sq.sx, 1, layer.model.shadow * 1.6 * sq.sx);
    }
    for (const layer of this.plants.values()) layer.end();
    for (const layer of this.critters.values()) layer.begin();
    for (const c of f.critters) {
      const layer = this.critters.get(c.species)!, pose = this.poses.get(c.species)!;
      poseCritter(c.species, pose, f.t, c.phase, f.reduced);
      layer.push(c.x, c.y, c.z, c.yaw, 1, 1, 1, pose);
      if (showBlobs) { const r = layer.model.shadow * (c.y > 0.3 ? 0.7 : 1); blobs.push(c.x, 0.006, c.z, 0, 0, r * 2.2, 1, r * 1.5); }
    }
    for (const layer of this.critters.values()) layer.end();
    this.compost.begin();
    const shimmer = f.reduced ? 1 : 1 + 0.04 * wave(FX.compostShimmerHz, f.t);
    for (const c of f.compost) {
      const sq = plantSquash(f.t - c.bornAt, this.squash);
      this.compost.push(c.x, 0, c.z, 0.4, sq.sx * shimmer, sq.sy * shimmer, sq.sx * shimmer, this.restPose);
      if (showBlobs) blobs.push(c.x, 0.004, c.z, 0, 0, 0.4, 1, 0.32);
    }
    this.compost.end();
    this.berries.begin();
    for (const b of f.berries) this.berries.push(b.x, b.y, b.z, b.spin, 0, 1, 1, 1);
    this.berries.end();
    this.leaves.begin();
    for (const l of f.leaves) this.leaves.push(l.x, l.y, l.z, l.spin, l.spin * 0.7, l.size, l.size, l.size, l.color);
    this.leaves.end();
    blobs.end();
    this.ring.visible = !!f.highlight;
    if (f.highlight) this.ring.position.set(colX(f.highlight.col), 0.03, laneZ(f.highlight.lane));
    if (this.bloom) this.bloom.strength = 0.3 + (f.reduced ? 0 : 0.03 * wave(FX.bloomBreatheHz, f.t));
  }

  render() {
    this.renderer.info.reset();
    if (this.bloom) this.bloom.render(this.renderer, this.scene, this.camera);
    else this.renderer.render(this.scene, this.camera);
  }

  /** Where a tile's middle is on screen (CSS px). */
  tileOnScreen(tile: Tile) {
    return project(this.camera, this.width, this.height, colX(tile.col), 0, laneZ(tile.lane));
  }

  /** The tile a tap at (sx, sy) means, snapping to the nearest tile `wanted` accepts. */
  pick(sx: number, sy: number, wanted: (tile: Tile) => boolean = () => true): Tile | null {
    return pickNear(pickTile(screenRay(this.camera, this.width, this.height, sx, sy)), sx, sy, wanted, t => this.tileOnScreen(t));
  }

  stats() {
    const info = this.renderer.info;
    return { tier: this.tier, pixelRatio: this.renderer.getPixelRatio(), drawCalls: info.render.calls, triangles: info.render.triangles, programs: info.programs?.length ?? 0, geometries: info.memory.geometries, textures: info.memory.textures };
  }

  /** Warms up every shader program before the first frame is shown. */
  async warm() {
    await this.renderer.compileAsync(this.scene, this.camera);
  }

  /** The release flick time for a Rowan that fired at `firedAt`. */
  static berryLeaves(firedAt: number) { return firedAt + FLICK_RELEASE; }

  /** Where the scene's far edges are (for the boot screen and captures). */
  static slab = SLAB;
}
