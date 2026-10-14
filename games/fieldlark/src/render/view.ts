/**
 * The 3D view of the farm: renderer, scene, camera, light, sky, ground, water, grass, scenery and the
 * post-processing chain. It only reads the farm; input moves its camera goal, and it eases the camera
 * towards it (turns and zooms glide, or cut with reduced motion). Zoom eases in distance, together with
 * the target, so the ground under a zooming cursor stays put the whole way.
 */
import * as THREE from 'three';
import type { Season } from '../sim/clock';
import { topY, type AreaId } from '../sim/map';
import type { Obj } from '../sim/objects';
import type { CameraSave, Farm } from '../sim/state';
import { pickWithBoxes, type TileRef } from '../input/pick';
import { openArea, type Insets } from '../ui/layout';
import { clampTarget, clampZoom, PITCH, placeCamera, project, rayToPlane, screenRay, YAW_STEP, type View } from './camera';
import { fxUniforms } from './fx';
import { Grass } from './grass';
import { blockedTiles, setGroundLand, setGroundSeason, setGroundWear } from './ground';
import { Lighting } from './lighting';
import { ObjectView } from './objects';
import { AnimalView } from './animals';
import { TownView } from './town';
import { TownSquare } from './square';
import { PostChain } from './post';
import { QUALITY, type QualityTier } from './quality';
import { Scenery } from './scenery';
import { Sky } from './sky';
import { buildTerrain, cullTerrain, setGroundBumps } from './terrain';
import { buildWater } from './water';
import { Life } from './life';
import { Culler, NO_AO } from './instanced';

const scratch = new THREE.PerspectiveCamera();

export class FarmView {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera();
  readonly lighting: Lighting;
  /** Where the camera is going (input changes this). */
  readonly goal: CameraSave;
  /** Where the camera is now (eased towards the goal). */
  readonly view: View;
  width = 1;
  height = 1;
  insets: Insets = { top: 0, right: 0, bottom: 0, left: 0 };
  tier: QualityTier = 'medium';
  reducedMotion = false;
  private terrain: THREE.Group;
  private water: THREE.Group;
  private sky = new Sky();
  private scenery = new Scenery();
  private grass = new Grass();
  readonly objects = new ObjectView();
  readonly animals = new AnimalView();
  readonly town = new TownView();
  readonly square = new TownSquare();
  readonly life = new Life();
  private post: PostChain | null = null;
  private worldKey = '';
  private landKey = '';
  private season: Season = 'spring';
  private highlight: THREE.LineLoop;
  private highlightOn = false;
  private shadowDirty = true;
  private wearVersion = -1;
  /** A slower glide for "Show me" (seconds left). */
  private glide = 0;
  /** Draws only the scenery and farm things near the view. */
  private culler = new Culler();

  constructor(canvas: HTMLCanvasElement, start: CameraSave, antialias: boolean) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // PCFSoftShadowMap is gone from three.js; PCF with a radius gives the soft edges
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.info.autoReset = false;
    this.lighting = new Lighting(this.scene);
    this.camera.layers.enable(NO_AO);
    this.lighting.sun.shadow.camera.layers.enable(NO_AO);
    this.terrain = buildTerrain();
    this.water = buildWater();
    // no ambient occlusion on the sky, water, grass and little bits of life (see NO_AO)
    for (const g of [this.sky.mesh, this.water, this.grass.group, this.life.group]) g.traverse(o => o.layers.set(NO_AO));
    this.scene.add(this.sky.mesh, this.terrain, this.water, this.scenery.group, this.grass.group, this.objects.group, this.animals.group, this.town.group, this.square.group, this.life.group);
    this.goal = { ...start };
    this.view = { x: start.x, z: start.z, y: 0, yaw: start.yawStep * YAW_STEP, zoom: clampZoom(start.zoom || 64) };
    this.view.y = this.groundUnder(start.x, start.z);
    const ring = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0.04, 0, 0.04), new THREE.Vector3(0.96, 0, 0.04), new THREE.Vector3(0.96, 0, 0.96), new THREE.Vector3(0.04, 0, 0.96)]);
    this.highlight = new THREE.LineLoop(ring, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, depthTest: false }));
    this.highlight.renderOrder = 10;
    this.highlight.visible = false;
    this.scene.add(this.highlight);
  }

  /** Resize to the canvas's CSS size. */
  resize(width: number, height: number, insets: Insets) {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.insets = insets;
    this.renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, QUALITY[this.tier].pixelRatio));
    this.renderer.setSize(this.width, this.height, false);
    this.post?.setSize(this.width, this.height);
    this.shadowDirty = true;
  }

  setQuality(tier: QualityTier) {
    this.tier = tier;
    const spec = QUALITY[tier];
    this.renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, spec.pixelRatio));
    this.renderer.setSize(this.width, this.height, false);
    this.renderer.shadowMap.enabled = spec.shadows;
    this.lighting.setShadows(spec.shadows, spec.shadowMap);
    fxUniforms.rimStrength.value = spec.rim ? 0.3 : 0;
    setGroundBumps(tier !== 'low');
    // Low tone-maps in the renderer; Medium and High in the post pass (ACES, like Space Sky)
    this.renderer.toneMapping = spec.post ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.post?.dispose();
    this.post = spec.post ? new PostChain(this.renderer, this.scene, this.camera, spec, this.reducedMotion) : null;
    this.post?.setSize(this.width, this.height);
    // materials compile differently with and without shadows and tone mapping
    this.scene.traverse(o => { const m = (o as THREE.Mesh).material; if (m) (Array.isArray(m) ? m : [m]).forEach(x => (x.needsUpdate = true)); });
    this.worldKey = '';
    this.shadowDirty = true;
  }

  /** Reduced motion: no camera glides, sway, drifting clouds or depth-of-field blur. */
  setReducedMotion(on: boolean) {
    if (on === this.reducedMotion) return;
    this.reducedMotion = on;
    fxUniforms.windStrength.value = on ? 0 : 1;
    fxUniforms.cloudDrift.value = on ? 0 : 1;
    this.setQuality(this.tier);
  }

  /** Rebuilds the scenery and recolours the ground when the season or the open land changes. */
  setWorld(season: Season, unlocked: readonly AreaId[]) {
    const land = [...unlocked].sort().join(',');
    if (land !== this.landKey) { this.landKey = land; setGroundLand(unlocked); }
    const key = `${season}|${this.tier}`;
    if (key === this.worldKey) return;
    this.worldKey = key;
    this.season = season;
    setGroundSeason(season);
    this.scenery.build(season, QUALITY[this.tier].decor);
    this.grass.setSeason(season);
    this.life.setSeason(season);
    this.shadowDirty = true;
  }

  /** Draw the farm's things; when they change, the worn ground, grass and smoke follow. */
  syncFarm(farm: Farm, locked: (o: Obj) => boolean) {
    this.objects.sync(farm, locked);
    if (this.objects.version !== this.wearVersion) {
      this.wearVersion = this.objects.version;
      setGroundWear(farm);
      this.grass.setBlocked(blockedTiles(farm), this.wearVersion);
      this.life.setFarm(farm, this.objects.ready);
      this.shadowDirty = true;
    }
  }

  /** The ground height under a point (for the camera's target). */
  groundUnder(x: number, z: number) {
    const tx = Math.min(55, Math.max(0, Math.floor(x))), tz = Math.min(55, Math.max(0, Math.floor(z)));
    return Math.max(0, topY(tx, tz));
  }

  /** Where taps should aim for the middle of the open area. */
  openCenter() {
    const o = openArea(this.width, this.height, this.insets);
    return { x: o.x + o.w / 2, y: o.y + o.h / 2 };
  }

  /**
   * Zoom the goal to `zoom`, keeping the ground under (sx, sy) where it is on screen (the cursor, the
   * pinch, or the middle for the buttons). The view eases there.
   */
  zoomGoalAt(zoom: number, sx: number, sy: number) {
    const g = this.goal;
    const z1 = clampZoom(zoom);
    placeCamera(scratch, { x: g.x, z: g.z, y: this.view.y, yaw: g.yawStep * YAW_STEP, zoom: g.zoom }, this.width, this.height, this.openCenter());
    const p = rayToPlane(screenRay(scratch, this.width, this.height, sx, sy), this.view.y);
    if (p) {
      const k = g.zoom / z1;
      [g.x, g.z] = clampTarget(p.x - (p.x - g.x) * k, p.z - (p.z - g.z) * k);
    }
    g.zoom = z1;
  }

  /** Glide gently to a new goal ("Show me"); a quick cut with reduced motion. */
  glideTo(to: { x: number; z: number; yawStep: number; zoom: number }) {
    Object.assign(this.goal, { x: to.x, z: to.z, yawStep: to.yawStep, zoom: clampZoom(to.zoom) });
    this.glide = this.reducedMotion ? 0 : 1.2;
  }

  /** Eases the camera towards its goal and updates light, water, grass and life. */
  update(dt: number, t: number) {
    const reducedMotion = this.reducedMotion;
    const g = this.goal, v = this.view;
    [g.x, g.z] = clampTarget(g.x, g.z);
    g.zoom = clampZoom(g.zoom);
    this.glide = Math.max(0, this.glide - dt);
    const rate = this.glide > 0 ? 3.2 : 10;
    const k = reducedMotion ? 1 : 1 - Math.exp(-dt * rate);
    const goalYaw = g.yawStep * YAW_STEP;
    // turn the short way round
    let dy = goalYaw - v.yaw;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    v.yaw += dy * k;
    if (Math.abs(dy) < 1e-4) v.yaw = goalYaw;
    v.x += (g.x - v.x) * k;
    v.z += (g.z - v.z) * k;
    // ease the distance (1 / zoom), so a zoom at the cursor keeps the cursor's ground still
    v.zoom = 1 / (1 / v.zoom + (1 / g.zoom - 1 / v.zoom) * k);
    const gy = this.groundUnder(v.x, v.z);
    v.y += (gy - v.y) * (reducedMotion ? 1 : 1 - Math.exp(-dt * 4));
    if (this.lighting.update(t, this.season)) this.shadowDirty = true;
    if (!reducedMotion) fxUniforms.fxTime.value += dt;
    placeCamera(this.camera, v, this.width, this.height, this.openCenter());
    this.sky.follow(this.camera);
    this.sky.setColors(this.lighting.zenith, this.lighting.horizon);
    this.renderer.setClearColor(this.lighting.horizon);
    // how much ground is on screen, for the shadow box and the grass
    const across = Math.max(this.width, this.height / Math.sin(PITCH)) / v.zoom;
    if (this.renderer.shadowMap.enabled && this.lighting.fitShadows(v.x, v.z, across * 0.62 + 2)) this.shadowDirty = true;
    // what's drawn changed: the shadows of things near the view need drawing again
    if (this.culler.update(this.camera, v, this.width, this.height, across, [...this.scenery.layers, ...this.objects.layerList])) {
      this.shadowDirty = true;
      cullTerrain(this.terrain, this.culler.frustum);
    }
    const spec = QUALITY[this.tier];
    this.grass.update(v.x, v.z, Math.hypot(this.width, this.height / Math.sin(PITCH)) / v.zoom * 0.6 + 1, spec.grass);
    this.life.update(dt, this.camera, v, spec.particles, reducedMotion);
    this.post?.grade.set(this.lighting.grade);
  }

  /** Snaps the eased view to the goal (after a drag, the map stays exactly under the finger). */
  snapToGoal() {
    this.view.x = this.goal.x;
    this.view.z = this.goal.z;
    this.view.zoom = this.goal.zoom;
    this.view.yaw = this.goal.yawStep * YAW_STEP;
    placeCamera(this.camera, this.view, this.width, this.height, this.openCenter());
  }

  showHighlight(tile: TileRef | null) {
    this.highlightOn = !!tile;
    this.highlight.visible = !!tile;
    if (tile) this.highlight.position.set(tile.x, topY(tile.x, tile.z) + 0.03, tile.z);
  }

  render(dt = 1 / 60) {
    this.renderer.info.reset();
    if (this.renderer.shadowMap.enabled && this.shadowDirty) { this.renderer.shadowMap.needsUpdate = true; this.shadowDirty = false; }
    if (this.highlightOn) (this.highlight.material as THREE.LineBasicMaterial).opacity = 0.95;
    if (this.post) this.post.render(dt);
    else this.renderer.render(this.scene, this.camera);
  }

  project(x: number, y: number, z: number) {
    return project(this.camera, this.width, this.height, x, y, z);
  }

  ray(sx: number, sy: number) {
    return screenRay(this.camera, this.width, this.height, sx, sy);
  }

  /** The tile under a screen point; a tap on a building or tree picks it, not the ground behind. */
  pick(sx: number, sy: number): TileRef | null {
    return pickWithBoxes(this.ray(sx, sy), this.objects.boxes);
  }

  /** Shadows need redrawing after things move. */
  markShadows() { this.shadowDirty = true; }

  /** The middle of a tile, on screen. */
  tileOnScreen(x: number, z: number) {
    return this.project(x + 0.5, topY(x, z), z + 0.5);
  }

  stats() {
    const info = this.renderer.info;
    return {
      drawCalls: info.render.calls, triangles: info.render.triangles, tier: this.tier,
      geometries: info.memory.geometries, textures: info.memory.textures, programs: info.programs?.length ?? 0,
      gpuMB: Math.round(this.gpuBytes() / 1e5) / 10,
    };
  }

  /** A rough count of the GPU memory our own buffers take: the screen, post buffers, shadow map, ground data and geometry. */
  private gpuBytes() {
    const spec = QUALITY[this.tier];
    const pr = this.renderer.getPixelRatio();
    const px = this.width * this.height * pr * pr;
    let b = px * 8; // the canvas: colour + depth
    if (spec.post) b += px * (8 * 2 + 4) + (spec.ssao ? px * 8 : 0) + (spec.bloom ? px * 8 * 0.7 : 0);
    if (spec.shadows) b += spec.shadowMap * spec.shadowMap * 4;
    b += 216 * 216 * 4 + 432 * 432;
    this.scene.traverse(o => {
      const g = (o as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
      if (!g?.attributes) return;
      for (const a of Object.values(g.attributes)) b += (a as THREE.BufferAttribute).array?.byteLength ?? 0;
      if ((o as THREE.InstancedMesh).isInstancedMesh) b += (o as THREE.InstancedMesh).instanceMatrix.array.byteLength;
    });
    return b;
  }
}
