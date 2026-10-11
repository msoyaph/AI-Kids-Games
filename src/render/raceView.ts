import * as THREE from 'three';
import type { World } from '../sim/world';
import type { TrackModel } from '../sim/track/trackModel';
import type { ArenaModel } from '../sim/arena';
import { KartVisual, buildSharedKartGeometry } from './kartModel';
import { ChaseCamera } from './camera';
import { buildSky } from './sky';
import { buildTrackMeshes } from './trackMesh';
import { buildTrackProps, type TrackProps } from './props';
import { buildArenaMesh } from './arenaMesh';
import type { GameRenderer, RenderView, ViewRect } from './renderer';
import { Materials } from './materials';
import { RespawnState } from '../sim/kart';
import { Effects } from './effects';
import type { SimEvent } from '../sim/events';
import { ItemVisuals } from './itemVisuals';
import type { ItemSystem } from '../sim/items/itemSystem';
import { buildBackdrop } from './backdrop';
import { HazardVisuals } from './hazardVisuals';
import type { HazardSystem } from '../sim/hazards';

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
  readonly props: TrackProps | null = null;
  private readonly camPositions: THREE.Vector3[] = [];
  split: SplitMode = 'horizontal';
  time = 0;
  /** Local player kart indices (camera targets). */
  readonly targets: number[];
  private readonly disposers: Array<() => void> = [];
  readonly effects: Effects;
  itemVisuals: ItemVisuals | null = null;
  hazardVisuals: HazardVisuals | null = null;
  private readonly backdrop: THREE.Group;
  private readonly backdropY: number;
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
    this.backdrop = buildBackdrop(sky, course.track?.data.id ?? course.arena?.data.id ?? 'x');
    this.backdropY = sky.groundY ?? (course.track ? course.track.minY - 2 : 0);
    this.scene.add(this.backdrop);
    if (course.track) {
      const tm = buildTrackMeshes(course.track);
      this.scene.add(tm.group);
      this.boostMat = tm.boostMaterial;
      const props = buildTrackProps(course.track, course.track.data.id, gr.renderer, sky);
      this.scene.add(props.group);
      this.props = props;
      this.disposers.push(() => props.dispose());
      this.disposers.push(gr.onContextRestored(() => props.rebuildAtlas()));
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
    this.batchWheels();
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

  private balloons: THREE.Group[] = [];
  /** All kart wheels drawn as one instanced mesh per wheel geometry (cuts ~4 draw calls per kart). */
  private wheelBatches: Array<{ mesh: THREE.InstancedMesh; wheels: Array<{ m: THREE.Mesh; v: KartVisual }> }> = [];
  private static readonly ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

  private batchWheels(): void {
    const byGeo = new Map<THREE.BufferGeometry, Array<{ m: THREE.Mesh; v: KartVisual }>>();
    for (const v of this.visuals) {
      for (const w of v.wheels) {
        let list = byGeo.get(w.geometry);
        if (!list) byGeo.set(w.geometry, (list = []));
        list.push({ m: w, v });
        w.visible = false;
      }
    }
    for (const [geo, wheels] of byGeo) {
      const mesh = new THREE.InstancedMesh(geo, Materials.flat, wheels.length);
      mesh.frustumCulled = false;
      mesh.name = 'wheels';
      this.scene.add(mesh);
      this.wheelBatches.push({ mesh, wheels });
    }
  }

  private syncWheels(): void {
    for (const b of this.wheelBatches) {
      for (let i = 0; i < b.wheels.length; i++) {
        const { m, v } = b.wheels[i];
        if (!v.body.visible || !v.root.visible) b.mesh.setMatrixAt(i, RaceView.ZERO);
        else b.mesh.setMatrixAt(i, m.matrixWorld);
      }
      b.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  /** Battle mode: three balloons float above every kart. */
  enableBalloons(): void {
    const geo = new THREE.SphereGeometry(0.55, 10, 8);
    geo.scale(1, 1.2, 1);
    const stringGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.4, 3);
    const colors = [0xff4d6d, 0x3fa7ff, 0xffd23f, 0x8cff6b, 0xb47bff, 0xff9f1c, 0x4ce0d2, 0xff6fae];
    for (const v of this.visuals) {
      const g = new THREE.Group();
      const mat = new THREE.MeshLambertMaterial({ color: colors[v.kart.index % colors.length], emissive: colors[v.kart.index % colors.length], emissiveIntensity: 0.25 });
      for (let i = 0; i < 3; i++) {
        const b = new THREE.Group();
        const ball = new THREE.Mesh(geo, mat);
        ball.position.y = 0.7;
        const str = new THREE.Mesh(stringGeo, Materials.basic);
        b.add(ball, str);
        b.position.set((i - 1) * 0.55, 1.9, -0.7);
        b.rotation.z = (i - 1) * -0.25;
        g.add(b);
      }
      v.root.add(g);
      this.balloons.push(g);
    }
  }

  attachHazards(h: HazardSystem): void {
    this.hazardVisuals = new HazardVisuals(h);
    this.scene.add(this.hazardVisuals.group);
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
    this.backdrop.scale.setScalar(p.drawDistance * 0.86);
    for (const c of this.cams) {
      c.camera.far = p.drawDistance;
      c.camera.updateProjectionMatrix();
    }
    this.props?.setProfile(p);
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
    for (const v of this.visuals) {
      v.update(alpha, dt, this.time);
      v.root.updateMatrixWorld(true);
    }
    // Rivals between the chase camera and your kart would block the view: hide them while they are in the
    // line of sight (or very close to the lens).
    if (this.cams.length === 1) {
      const cp = this.cams[0].camera.position;
      const tp = this.visuals[this.targets[0]].root.position;
      const lx = tp.x - cp.x;
      const ly = tp.y - cp.y;
      const lz = tp.z - cp.z;
      const len = Math.hypot(lx, ly, lz) || 1;
      for (const v of this.visuals) {
        if (v.kart.index === this.targets[0]) continue;
        const rx = v.root.position.x - cp.x;
        const ry = v.root.position.y - cp.y;
        const rz = v.root.position.z - cp.z;
        const d2 = rx * rx + ry * ry + rz * rz;
        const t = (rx * lx + ry * ly + rz * lz) / len; // distance along the line of sight
        const lat2 = d2 - t * t;
        const blocking = t > 0 && t < len - 0.8 && lat2 < 1.8 * 1.8;
        v.root.visible = d2 > 4.2 * 4.2 && !blocking;
      }
    }
    this.syncWheels();
    for (let i = 0; i < this.targets.length; i++) {
      const k = this.world.karts[this.targets[i]];
      this.cams[i].update(k, alpha, dt, lookBack[i] ?? false);
    }
    if (this.props) {
      this.camPositions.length = 0;
      for (const c of this.cams) this.camPositions.push(c.camera.position);
      this.props.update(this.camPositions);
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
    for (let i = 0; i < this.balloons.length; i++) {
      const k = this.world.karts[i];
      const g = this.balloons[i];
      for (let b = 0; b < 3; b++) {
        const child = g.children[b];
        child.visible = b < k.balloons;
        child.rotation.x = Math.sin(this.time * 2.2 + b + i) * 0.12 - Math.min(0.5, Math.max(0, k.speed) * 0.015);
      }
    }
    this.hazardVisuals?.update();
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
    this.backdrop.position.set(cam.position.x, this.backdropY, cam.position.z);
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
    // Free everything this race created; cached/shared geometries and materials are flagged `userData.shared`.
    const mats = new Set<THREE.Material>();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry && !m.geometry.userData.shared) m.geometry.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => mats.add(x));
      else if (mat) mats.add(mat);
    });
    for (const mat of mats) {
      if (mat.userData.shared) continue;
      const tex = (mat as THREE.MeshBasicMaterial).map;
      tex?.dispose();
      mat.dispose();
    }
    this.sun.shadow.map?.dispose();
    this.scene.clear();
  }

}
