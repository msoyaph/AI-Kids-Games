import * as THREE from 'three';
import type { World } from '../sim/world';
import type { TrackModel } from '../sim/track/trackModel';
import type { ArenaModel } from '../sim/arena';
import { KartVisual, buildSharedKartGeometry } from './kartModel';
import { ChaseCamera } from './camera';
import { buildSky } from './sky';
import { buildTrackMeshes } from './trackMesh';
import { buildTrackProps } from './props';
import { buildArenaMesh } from './arenaMesh';
import type { GameRenderer, RenderView, ViewRect } from './renderer';
import { Materials } from './materials';
import { RespawnState } from '../sim/kart';
import { Effects } from './effects';
import type { SimEvent } from '../sim/events';
import { ItemVisuals } from './itemVisuals';
import type { ItemSystem } from '../sim/items/itemSystem';

export type SplitMode = 'horizontal' | 'vertical';

const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpP = new THREE.Vector3();
const tmpS = new THREE.Vector3();
const tmpN = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

/**
 * Everything 3D for one race: scene graph built from the course + karts, cameras per local player,
 * and per-frame syncing from the sim (interpolated).
 */
export class RaceView {
  readonly scene = new THREE.Scene();
  readonly visuals: KartVisual[] = [];
  readonly cams: ChaseCamera[] = [];
  readonly sun: THREE.DirectionalLight;
  private readonly dome: THREE.Mesh;
  private readonly domeBase: number;
  private readonly blobs: THREE.InstancedMesh;
  private readonly boostMat: THREE.MeshBasicMaterial | null = null;
  private readonly setPropDensity: (f: number) => void = () => {};
  split: SplitMode = 'horizontal';
  time = 0;
  /** Local player kart indices (camera targets). */
  readonly targets: number[];
  private readonly disposers: Array<() => void> = [];
  readonly effects: Effects;
  itemVisuals: ItemVisuals | null = null;
  private readonly fogBase = new THREE.Color();
  private readonly waterFog = new THREE.Color(0x2a7fd4);
  private waterBlend = 0;

  constructor(
    readonly gr: GameRenderer,
    readonly world: World,
    readonly course: { track?: TrackModel; arena?: ArenaModel },
    targets: number[],
  ) {
    this.targets = targets;
    const profile = gr.quality.profile;
    const sky = course.track ? course.track.data.sky : course.arena!.data.sky;
    const built = buildSky(this.scene, sky, profile.drawDistance);
    this.sun = built.sun;
    this.dome = built.dome;
    this.domeBase = profile.drawDistance;
    if (course.track) {
      const tm = buildTrackMeshes(course.track);
      this.scene.add(tm.group);
      this.boostMat = tm.boostMaterial;
      const props = buildTrackProps(course.track, course.track.data.id);
      this.scene.add(props.group);
      this.setPropDensity = props.setDensity;
      if (sky.ground !== null) {
        const g = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: sky.ground }));
        g.position.y = (sky.groundY ?? course.track.minY - 0.5) - 0.05;
        g.receiveShadow = true;
        this.scene.add(g);
      }
    } else if (course.arena) {
      this.scene.add(buildArenaMesh(course.arena.data));
    }
    const shared = buildSharedKartGeometry();
    for (const k of world.karts) {
      const v = new KartVisual(k, shared);
      this.visuals.push(v);
      this.scene.add(v.root);
    }
    // Blob shadows for every kart (one draw call).
    const blobGeo = new THREE.CircleGeometry(1.25, 14).rotateX(-Math.PI / 2);
    this.blobs = new THREE.InstancedMesh(blobGeo, Materials.blob, world.karts.length);
    this.blobs.frustumCulled = false;
    this.blobs.renderOrder = 1;
    this.scene.add(this.blobs);
    for (let i = 0; i < targets.length; i++) this.cams.push(new ChaseCamera(profile.drawDistance));
    this.effects = new Effects(world, this.scene);
    if (course.track) this.effects.offroadColor = course.track.data.palette.offroad;
    for (let i = 0; i < targets.length; i++) this.effects.camPos.push(this.cams[i].camera.position);
    this.effects.onShake = (kart, amount) => {
      const ci = this.targets.indexOf(kart);
      if (ci >= 0) this.cams[ci].addShake(amount);
    };
    if (this.scene.fog) this.fogBase.copy((this.scene.fog as THREE.Fog).color);
    this.applyQuality();
    const off = gr.quality.onChange(() => this.applyQuality());
    this.disposers.push(off);
  }

  attachItems(items: ItemSystem): void {
    this.itemVisuals = new ItemVisuals(items, this.world, this.visuals, this.effects);
    this.scene.add(this.itemVisuals.group);
  }

  applyQuality(): void {
    const p = this.gr.quality.profile;
    const fog = this.scene.fog as THREE.Fog | null;
    if (fog) {
      const sky = this.course.track ? this.course.track.data.sky : this.course.arena!.data.sky;
      fog.near = (sky.fogNear ?? 0.35) * p.drawDistance;
      fog.far = p.drawDistance * 0.92;
    }
    this.dome.scale.setScalar(p.drawDistance / this.domeBase);
    for (const c of this.cams) {
      c.camera.far = p.drawDistance;
      c.camera.updateProjectionMatrix();
    }
    this.setPropDensity(p.propDensity);
    this.effects?.applyQuality(p);
    const useMap = p.shadowMap && this.targets.length === 1;
    this.sun.castShadow = useMap;
    if (useMap) {
      this.sun.shadow.mapSize.set(p.shadowMapSize, p.shadowMapSize);
      const cam = this.sun.shadow.camera;
      cam.left = -28;
      cam.right = 28;
      cam.top = 28;
      cam.bottom = -28;
      cam.near = 1;
      cam.far = 300;
      cam.updateProjectionMatrix();
      this.sun.shadow.bias = -0.0008;
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null as unknown as THREE.WebGLRenderTarget;
    }
    for (const v of this.visuals) {
      v.chassis.castShadow = useMap;
      v.driver.castShadow = useMap;
    }
    this.blobs.visible = !useMap;
  }

  update(alpha: number, dt: number, lookBack: boolean[]): void {
    this.time += dt;
    for (const v of this.visuals) v.update(alpha, dt, this.time);
    for (let i = 0; i < this.targets.length; i++) {
      const k = this.world.karts[this.targets[i]];
      this.cams[i].update(k, alpha, dt, lookBack[i] ?? false);
    }
    // blob shadows
    for (let i = 0; i < this.world.karts.length; i++) {
      const k = this.world.karts[i];
      const g = k.ground;
      const visible = g.hit && k.respawnState !== RespawnState.Falling;
      const x = k.px + (k.x - k.px) * alpha;
      const z = k.pz + (k.z - k.pz) * alpha;
      const height = k.grounded ? k.py + (k.y - k.py) * alpha : g.height;
      const above = Math.max(0, k.y - g.height);
      const s = visible ? Math.max(0.35, 1 - above * 0.06) : 0;
      tmpN.set(g.nx, g.ny, g.nz).normalize();
      tmpQ.setFromUnitVectors(UP, tmpN);
      tmpP.set(x, height + 0.06, z);
      tmpS.set(s, s, s);
      tmpM.compose(tmpP, tmpQ, tmpS);
      this.blobs.setMatrixAt(i, tmpM);
    }
    this.blobs.instanceMatrix.needsUpdate = true;
    // shadow camera follows player 1
    if (this.sun.castShadow && this.targets.length > 0) {
      const k = this.world.karts[this.targets[0]];
      this.sun.position.set(k.x + 30, k.y + 60, k.z + 20);
      this.sun.target.position.set(k.x, k.y, k.z);
      this.sun.target.updateMatrixWorld();
    }
    this.itemVisuals?.update(dt);
    this.effects.update(dt);
    // Underwater tint for player 1's view
    if (this.targets.length > 0 && this.scene.fog) {
      const k = this.world.karts[this.targets[0]];
      this.waterBlend += ((k.ground.water ? 1 : 0) - this.waterBlend) * Math.min(1, dt * 4);
      const fog = this.scene.fog as THREE.Fog;
      fog.color.copy(this.fogBase).lerp(this.waterFog, this.waterBlend * 0.8);
      (this.scene.background as THREE.Color | null)?.copy(fog.color);
    }
    if (this.boostMat) {
      const p = 0.8 + Math.sin(this.time * 10) * 0.2;
      this.boostMat.color.setRGB(p, p, p);
    }
  }

  /** Viewports for 1 or 2 local players. */
  views(): RenderView[] {
    const out: RenderView[] = [];
    const n = this.cams.length;
    for (let i = 0; i < n; i++) {
      out.push({ scene: this.scene, camera: this.cams[i].camera, rect: this.rectFor(i, n) });
    }
    return out;
  }

  rectFor(i: number, n: number): ViewRect {
    if (n === 1) return { x: 0, y: 0, w: 1, h: 1 };
    if (this.split === 'horizontal') return { x: 0, y: i === 0 ? 0.5 : 0, w: 1, h: 0.5 };
    return { x: i === 0 ? 0 : 0.5, y: 0, w: 0.5, h: 1 };
  }

  /** Sky dome must follow whichever camera is rendering. */
  beforeRender(camIndex: number): void {
    const cam = this.cams[camIndex].camera;
    this.dome.position.copy(cam.position);
    const rect = this.rectFor(camIndex, this.cams.length);
    this.effects.setViewport(this.gr.height * rect.h * this.gr.renderer.getPixelRatio(), cam.fov);
  }

  onEvent(e: SimEvent): void {
    this.effects.onEvent(e);
    this.itemVisuals?.onEvent(e);
  }

  render(): void {
    const views = this.views();
    if (views.length === 1) {
      this.beforeRender(0);
      this.gr.render(views);
      return;
    }
    // render each view separately so the sky dome can follow its camera
    for (let i = 0; i < views.length; i++) {
      this.beforeRender(i);
      this.gr.renderSub(views[i], i === 0);
    }
  }

  dispose(): void {
    for (const d of this.disposers) d();
    this.effects.dispose();
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry && !(mesh as unknown as { userData: { shared?: boolean } }).userData.shared) {
        // geometries from caches are shared; only dispose per-race ones (track/props/sky/blobs)
        if (mesh.name === 'track' || mesh.name === 'boostPads') mesh.geometry.dispose();
      }
    });
  }
}
