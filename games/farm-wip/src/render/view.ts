/**
 * The 3D view of the farm: renderer, scene, camera, light, ground, water and scenery. It only reads
 * the farm; input moves its camera goal, and it eases the camera towards it (turns and zooms glide,
 * or snap with reduced motion).
 */
import * as THREE from 'three';
import type { Season } from '../sim/clock';
import { topY, type AreaId } from '../sim/map';
import type { CameraSave } from '../sim/state';
import { pickWithBoxes, type TileRef } from '../input/pick';
import { openArea, type Insets } from '../ui/layout';
import { clampTarget, clampZoom, placeCamera, project, screenRay, YAW_STEP, type View } from './camera';
import { Lighting } from './lighting';
import { ObjectView } from './objects';
import { rim } from './materials';
import { QUALITY, type QualityTier } from './quality';
import { Scenery } from './scenery';
import { buildTerrain } from './terrain';
import { buildWater, waterUniforms } from './water';

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
  private terrain: THREE.Mesh | null = null;
  private water: THREE.Mesh;
  private scenery = new Scenery();
  readonly objects = new ObjectView();
  private worldKey = '';
  private season: Season = 'spring';
  private highlight: THREE.LineLoop;
  private highlightOn = false;
  private shadowDirty = true;

  constructor(canvas: HTMLCanvasElement, start: CameraSave, antialias: boolean) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.lighting = new Lighting(this.scene);
    this.water = buildWater();
    this.scene.add(this.water, this.scenery.group, this.objects.group);
    this.goal = { ...start };
    this.view = { x: start.x, z: start.z, y: 0, yaw: start.yawStep * YAW_STEP, zoom: start.zoom };
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
    this.shadowDirty = true;
  }

  setQuality(tier: QualityTier) {
    this.tier = tier;
    const spec = QUALITY[tier];
    this.renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, spec.pixelRatio));
    this.renderer.setSize(this.width, this.height, false);
    this.renderer.shadowMap.enabled = spec.shadows;
    this.lighting.setShadows(spec.shadows, spec.shadowMap);
    rim.strength.value = spec.rim ? 0.35 : 0;
    // materials compile differently with and without shadows
    this.scene.traverse(o => { const m = (o as THREE.Mesh).material; if (m) (Array.isArray(m) ? m : [m]).forEach(x => (x.needsUpdate = true)); });
    this.worldKey = '';
    this.shadowDirty = true;
  }

  /** Rebuilds the ground and scenery when the season or the unlocked land changes. */
  setWorld(season: Season, unlocked: readonly AreaId[]) {
    const key = `${season}|${[...unlocked].sort().join(',')}|${this.tier}`;
    if (key === this.worldKey) return;
    this.worldKey = key;
    this.season = season;
    if (this.terrain) { this.scene.remove(this.terrain); this.terrain.geometry.dispose(); }
    this.terrain = buildTerrain(season, unlocked);
    this.scene.add(this.terrain);
    this.scenery.build(season, QUALITY[this.tier].decor);
    this.shadowDirty = true;
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

  /** Eases the camera towards its goal and updates light and water. */
  update(dt: number, t: number, reducedMotion: boolean) {
    const g = this.goal, v = this.view;
    [g.x, g.z] = clampTarget(g.x, g.z);
    g.zoom = clampZoom(g.zoom);
    const k = reducedMotion ? 1 : 1 - Math.exp(-dt * 10);
    const goalYaw = g.yawStep * YAW_STEP;
    // turn the short way round
    let dy = goalYaw - v.yaw;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    v.yaw += dy * k;
    if (Math.abs(dy) < 1e-4) v.yaw = goalYaw;
    v.x += (g.x - v.x) * k;
    v.z += (g.z - v.z) * k;
    v.zoom += (g.zoom - v.zoom) * k;
    const gy = this.groundUnder(v.x, v.z);
    v.y += (gy - v.y) * (reducedMotion ? 1 : 1 - Math.exp(-dt * 4));
    if (this.lighting.update(t, this.season)) this.shadowDirty = true;
    if (!reducedMotion) waterUniforms.time.value += dt;
    placeCamera(this.camera, v, this.width, this.height, this.openCenter());
  }

  /** Snaps the eased view to the goal (after a drag, the map stays exactly under the finger). */
  snapToGoal() {
    this.view.x = this.goal.x;
    this.view.z = this.goal.z;
    this.view.zoom = this.goal.zoom;
    placeCamera(this.camera, this.view, this.width, this.height, this.openCenter());
  }

  showHighlight(tile: TileRef | null) {
    this.highlightOn = !!tile;
    this.highlight.visible = !!tile;
    if (tile) this.highlight.position.set(tile.x, topY(tile.x, tile.z) + 0.03, tile.z);
  }

  render() {
    if (this.renderer.shadowMap.enabled && this.shadowDirty) { this.renderer.shadowMap.needsUpdate = true; this.shadowDirty = false; }
    if (this.highlightOn) (this.highlight.material as THREE.LineBasicMaterial).opacity = 0.95;
    this.renderer.render(this.scene, this.camera);
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
    const info = this.renderer.info.render;
    return { drawCalls: info.calls, triangles: info.triangles, tier: this.tier };
  }
}
