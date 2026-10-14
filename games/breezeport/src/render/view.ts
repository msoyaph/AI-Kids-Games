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
import type { Town } from '../sim/state';
import { H, inMap, W } from '../sim/map';
import { THING } from '../data/things';
import { openArea, type Insets } from '../ui/layout';
import { clampTarget, clampZoom, PITCH, placeCamera, project, rayToPlane, screenRay, YAW_STEP, type View } from './camera';
import { pickWithBoxes, type Picked } from '../input/pick';
import { TileMarks } from './marks';
import { fxUniforms } from './fx';
import { Grass } from './grass';
import { setGroundMap, setGroundSeason, setGroundShade, setGroundTiles } from './ground';
import type { Census } from '../sim/census';
import { buildable } from '../sim/map';
import { Culler, NO_AO } from './instanced';
import { Lighting } from './lighting';
import { ObjectView, turnedSize } from './objects';
import { PostChain } from './post';
import { QUALITY, type QualityTier } from './quality';
import { Scenery } from './scenery';
import { FestivalView } from './festival';
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
  readonly festival = new FestivalView();
  private grass = new Grass();
  readonly objects = new ObjectView();
  readonly walkers = new WalkerView();
  readonly marks = new TileMarks();
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
    this.scene.add(this.sky.mesh, this.terrain, this.water, this.scenery.group, this.grass.group, this.objects.group, this.walkers.group, this.marks.mesh, this.festival.group);
    this.festival.group.traverse(o => o.layers.set(NO_AO));
    this.marks.mesh.layers.set(NO_AO);
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
  syncCity(city: Town) {
    this.lastTown = city;
    this.scenery.setProjects(!!city.flags['project-lighthouse'], !!city.flags['project-pier']);
    const v = city.version ?? 0;
    if (v !== this.cityVersion) {
      this.cityVersion = v;
      setGroundTiles(city, t => turnedSize(t, THING[t.def]!));
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

  private overlay = 'off';
  private overlayKey = '';
  /** Show a map (or 'off'): happiness, a service's reach ('svc:school'…), traffic, greenery. */
  setOverlay(o: string, c: Census, pattern: boolean, traffic: Float32Array | null = null) {
    this.overlay = o;
    const key = `${o}|${pattern}|${this.cityVersion}|${c.population}|${c.happy}`;
    if (key === this.overlayKey) return;
    this.overlayKey = key;
    fxUniforms.mapDim.value = o === 'off' ? 0 : 1;
    if (o === 'off') { setGroundMap(0, null, pattern); return; }
    const v = new Float32Array(W * H).fill(NaN);
    if (o === 'happy') {
      for (const h of c.homes) { const n = c.needs.get(h.id); if (!n) continue; const s = turnedSize(h, THING[h.def]!); for (let z = h.z; z < h.z + s.d; z++) for (let x = h.x; x < h.x + s.w; x++) if (inMap(x, z)) v[z * W + x] = (n.happy - 30) / 70; }
      setGroundMap(1, v, pattern);
    } else if (o.startsWith('svc:')) {
      const cov = c.coverage[o.slice(4) as keyof Census['coverage']];
      for (let i = 0; i < W * H; i++) if (cov[i]) v[i] = 1;
      for (const h of c.homes) { const s = turnedSize(h, THING[h.def]!); for (let z = h.z; z < h.z + s.d; z++) for (let x = h.x; x < h.x + s.w; x++) if (inMap(x, z) && !cov[z * W + x]) v[z * W + x] = 0; }
      setGroundMap(2, v, pattern);
    } else if (o === 'green') {
      for (let i = 0; i < W * H; i++) if (buildable(i % W, (i / W) | 0)) v[i] = Math.min(1, c.green[i]! / 6);
      setGroundMap(1, v, pattern);
    } else if (o === 'traffic' && traffic) {
      for (let i = 0; i < W * H; i++) if (traffic[i]! > 0 || (this.lastTown?.roads[i] ?? 0)) v[i] = 1 - Math.min(1, traffic[i]! / 1.4);
      setGroundMap(1, v, pattern);
    } else setGroundMap(0, null, pattern);
  }
  get overlayOn() { return this.overlay; }
  private lastTown: Town | null = null;

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
    this.glide = Math.max(0, this.glide - dt);
    const k = reducedMotion ? 1 : 1 - Math.exp(-dt * (this.glide > 0 ? 3.2 : 10));
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
    this.scenery.update(dt, reducedMotion, duskAmount(t));
    this.festival.update(dt, reducedMotion, v);
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

  ray(sx: number, sy: number) { return screenRay(this.camera, this.width, this.height, sx, sy); }

  /** The citizen nearest a screen point (within a finger's width), with the home they belong to. */
  citizenAt(sx: number, sy: number): { x: number; z: number; home?: number } | null {
    let best = -1, bestD = 30 * 30;
    this.walkList.forEach((w, i) => {
      const p = this.project(w.x, 0.25, w.z);
      const d = (p.x - sx) ** 2 + (p.y - sy) ** 2;
      if (d < bestD) { bestD = d; best = i; }
    });
    if (best < 0) return null;
    const w = this.walkList[best]!;
    return { x: w.x, z: w.z, home: this.life?.drawnHomes[best] };
  }

  /** The tile (and the thing, if a tall one is in the way) under a screen point. */
  pick(sx: number, sy: number): Picked | null { return pickWithBoxes(this.ray(sx, sy), this.objects.boxes); }

  /** The middle of a tile, on screen. */
  tileOnScreen(x: number, z: number) { return this.project(x + 0.5, 0, z + 0.5); }

  /** Snaps the eased view to the goal (after a drag, the map stays exactly under the finger). */
  snapToGoal() {
    Object.assign(this.view, { x: this.goal.x, z: this.goal.z, zoom: this.goal.zoom, yaw: this.goal.yawStep * YAW_STEP });
    placeCamera(this.camera, this.view, this.width, this.height, this.openCenter());
  }

  /** Glide to a new goal ("Show me"); a cut with reduced motion. */
  glideTo(to: { x: number; z: number; zoom?: number; yawStep?: number }) {
    Object.assign(this.goal, { x: to.x, z: to.z, zoom: clampZoom(to.zoom ?? this.goal.zoom), yawStep: to.yawStep ?? this.goal.yawStep });
    this.glide = this.reducedMotion ? 0 : 1.2;
  }
  private glide = 0;

  stats() {
    const info = this.renderer.info;
    return {
      drawCalls: info.render.calls, triangles: info.render.triangles, tier: this.tier,
      geometries: info.memory.geometries, textures: info.memory.textures, programs: info.programs?.length ?? 0,
    };
  }
}
