/**
 * The 3D view of the town: renderer, scene, camera, light, sky, ground, the bay, the town's things,
 * the street life and the post-processing chain. It only reads the town; input moves its camera goal,
 * and it eases the camera towards it (turns and zooms glide, or cut with reduced motion).
 * (Adapted from games/fieldlark/src/render/view.ts: the same camera, tiers, post chain, culling and
 * shadow box; the town's ground, bay, things and street life instead of the farm's.)
 */
import * as THREE from 'three';
import type { Season } from '../sim/clock';
import { duskAmount } from '../sim/clock';
import type { City } from '../sim/city';
import { H, inMap, W } from '../sim/map';
import { THING } from '../data/things';
import { openArea, type Insets } from '../ui/layout';
import { clampTarget, clampZoom, PITCH, placeCamera, project, rayToPlane, screenRay, YAW_STEP, type View } from './camera';
import { fxUniforms } from './fx';
import { Grass } from './grass';
import { setGroundSeason, setGroundShade, setGroundTiles } from './ground';
import { Culler, NO_AO } from './instanced';
import { Lighting } from './lighting';
import { ObjectView, turnedSize } from './objects';
import { PostChain } from './post';
import { QUALITY, type QualityTier } from './quality';
import { Scenery } from './scenery';
import { Sky } from './sky';
import { StreetLife } from './streetlife';
import { buildTerrain, cullTerrain, setGroundBumps } from './terrain';
import { WalkerView, type Walker } from './walkers';
import { buildWater } from './water';

export interface CameraGoal { x: number; z: number; yawStep: number; zoom: number }

const scratch = new THREE.PerspectiveCamera();

export class CityView {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera();
  readonly lighting: Lighting;
  readonly goal: CameraGoal;
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
  readonly walkers = new WalkerView();
  life: StreetLife | null = null;
  private walkList: Walker[] = [];
  private post: PostChain | null = null;
  private season: Season = 'summer';
  private worldKey = '';
  private shadowDirty = true;
  private culler = new Culler();
  private cityVersion = -1;

  constructor(canvas: HTMLCanvasElement, start: CameraGoal, antialias: boolean) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.info.autoReset = false;
    this.lighting = new Lighting(this.scene);
    this.camera.layers.enable(NO_AO);
    this.lighting.sun.shadow.camera.layers.enable(NO_AO);
    this.terrain = buildTerrain();
    this.water = buildWater();
    for (const g of [this.sky.mesh, this.water, this.grass.group]) g.traverse(o => o.layers.set(NO_AO));
    this.scene.add(this.sky.mesh, this.terrain, this.water, this.scenery.group, this.grass.group, this.objects.group, this.walkers.group);
    this.goal = { ...start };
    this.view = { x: start.x, z: start.z, y: 0, yaw: start.yawStep * YAW_STEP, zoom: clampZoom(start.zoom || 64) };
  }

  setLife(life: StreetLife) {
    if (this.life) this.scene.remove(this.life.group);
    this.life = life;
    life.group.traverse(o => o.layers.set(NO_AO));
    this.scene.add(life.group);
  }

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
    this.objects.lowDetail = tier === 'low';
    this.walkers.setLow(tier === 'low');
    this.renderer.toneMapping = spec.post ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.post?.dispose();
    this.post = spec.post ? new PostChain(this.renderer, this.scene, this.camera, spec, this.reducedMotion) : null;
    this.post?.setSize(this.width, this.height);
    this.scene.traverse(o => { const m = (o as THREE.Mesh).material; if (m) (Array.isArray(m) ? m : [m]).forEach(x => (x.needsUpdate = true)); });
    this.worldKey = '';
    this.shadowDirty = true;
  }

  setReducedMotion(on: boolean) {
    if (on === this.reducedMotion) return;
    this.reducedMotion = on;
    fxUniforms.windStrength.value = on ? 0 : 1;
    fxUniforms.cloudDrift.value = on ? 0 : 1;
    this.setQuality(this.tier);
  }

  /** The season's colours and the countryside's density (when the season or the tier changes). */
  setWorld(season: Season) {
    const key = `${season}|${this.tier}`;
    if (key === this.worldKey) return;
    this.worldKey = key;
    this.season = season;
    setGroundSeason(season);
    this.scenery.build(season, QUALITY[this.tier].decor);
    this.grass.setSeason(season);
    this.shadowDirty = true;
  }

  /** Draw the town's roads, lots and things (only when they change). */
  syncCity(city: City) {
    const v = city.version ?? 0;
    if (v !== this.cityVersion) {
      this.cityVersion = v;
      setGroundTiles(city);
      setGroundShade(city.things, t => { const d = THING[t.def]!; const s = turnedSize(t, d); return { w: s.w, d: s.d, shade: d.shade, inset: d.class === 'tree' ? 0.25 : d.w > 1 ? 0.12 : 0.3 }; });
      // the grass keeps off buildings and roads, and thins round trees and props
      const blocked = new Uint8Array(W * H), finish = Uint8Array.from(city.finish);
      for (let i = 0; i < W * H; i++) if (city.roads[i]) finish[i] = 255;
      for (const t of city.things) {
        const d = THING[t.def]!, s = turnedSize(t, d);
        const hard = d.class === 'home' || d.class === 'shop' || d.class === 'civic' || d.w > 1;
        for (let z = Math.floor(t.z); z < Math.ceil(t.z + s.d); z++) for (let x = Math.floor(t.x); x < Math.ceil(t.x + s.w); x++) if (inMap(x, z)) blocked[z * W + x] = Math.max(blocked[z * W + x]!, hard ? 1 : 2);
      }
      this.grass.setBlocked(blocked, finish, v);
      this.shadowDirty = true;
    }
    if (this.objects.sync(city, this.season)) this.shadowDirty = true;
  }

  openCenter() {
    const o = openArea(this.width, this.height, this.insets);
    return { x: o.x + o.w / 2, y: o.y + o.h / 2 };
  }

  zoomGoalAt(zoom: number, sx: number, sy: number) {
    const g = this.goal;
    const z1 = clampZoom(zoom);
    placeCamera(scratch, { x: g.x, z: g.z, y: 0, yaw: g.yawStep * YAW_STEP, zoom: g.zoom }, this.width, this.height, this.openCenter());
    const p = rayToPlane(screenRay(scratch, this.width, this.height, sx, sy), 0);
    if (p) {
      const k = g.zoom / z1;
      [g.x, g.z] = clampTarget(p.x - (p.x - g.x) * k, p.z - (p.z - g.z) * k);
    }
    g.zoom = z1;
  }

  update(dt: number, t: number) {
    const reducedMotion = this.reducedMotion;
    const g = this.goal, v = this.view;
    [g.x, g.z] = clampTarget(g.x, g.z);
    g.zoom = clampZoom(g.zoom);
    const k = reducedMotion ? 1 : 1 - Math.exp(-dt * 10);
    const goalYaw = g.yawStep * YAW_STEP;
    let dy = goalYaw - v.yaw;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    v.yaw += dy * k;
    if (Math.abs(dy) < 1e-4) v.yaw = goalYaw;
    v.x += (g.x - v.x) * k;
    v.z += (g.z - v.z) * k;
    v.zoom = 1 / (1 / v.zoom + (1 / g.zoom - 1 / v.zoom) * k);
    if (this.lighting.update(t, this.season)) this.shadowDirty = true;
    if (!reducedMotion) fxUniforms.fxTime.value += dt;
    placeCamera(this.camera, v, this.width, this.height, this.openCenter());
    this.sky.follow(this.camera);
    this.sky.setColors(this.lighting.zenith, this.lighting.horizon);
    this.renderer.setClearColor(this.lighting.horizon);
    const across = Math.max(this.width, this.height / Math.sin(PITCH)) / v.zoom;
    if (this.renderer.shadowMap.enabled && this.lighting.fitShadows(v.x, v.z, across * 0.62 + 2)) this.shadowDirty = true;
    if (this.culler.update(this.camera, v, this.width, this.height, across, [...this.scenery.layers, ...this.objects.layerList])) {
      this.shadowDirty = true;
      cullTerrain(this.terrain, this.culler.frustum);
    }
    this.scenery.update(dt, reducedMotion);
    this.grass.update(v.x, v.z, Math.hypot(this.width, this.height / Math.sin(PITCH)) / v.zoom * 0.6 + 1, QUALITY[this.tier].grass);
    if (this.life) {
      this.life.update(dt);
      this.life.draw(this.frustumNow(), this.walkList);
      this.walkers.draw(this.walkList);
    }
    const night = duskAmount(t);
    fxUniforms.nightGlow.value = night;
    this.sky.setStars(night);
    this.post?.grade.set(this.lighting.grade);
  }

  private frustum = new THREE.Frustum();
  private pm = new THREE.Matrix4();
  /** The view's frustum this frame, for culling things that move. */
  private frustumNow() {
    this.pm.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
    return this.frustum.setFromProjectionMatrix(this.pm);
  }

  render(dt = 1 / 60) {
    this.renderer.info.reset();
    if (this.renderer.shadowMap.enabled && this.shadowDirty) { this.renderer.shadowMap.needsUpdate = true; this.shadowDirty = false; }
    if (this.post) this.post.render(dt);
    else this.renderer.render(this.scene, this.camera);
  }

  project(x: number, y: number, z: number) { return project(this.camera, this.width, this.height, x, y, z); }

  stats() {
    const info = this.renderer.info;
    return {
      drawCalls: info.render.calls, triangles: info.render.triangles, tier: this.tier,
      geometries: info.memory.geometries, textures: info.memory.textures, programs: info.programs?.length ?? 0,
    };
  }
}
