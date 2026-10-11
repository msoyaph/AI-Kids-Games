import * as THREE from 'three';
import type { KartConfig } from '../data/types';
import { findBody, findGlider, findPaint, findWheels } from '../data/parts';
import { findRacer } from '../data/racers';
import { buildRecipe, type ColorTokens } from './lowpoly';
import { Materials } from './materials';
import { lerpAngle, clamp, damp } from '../core/math';
import { Kart, RespawnState } from '../sim/kart';
import { buildDecalGeometry } from './decals';

const UP = new THREE.Vector3(0, 1, 0);
const tmpN = new THREE.Vector3();
const qAlign = new THREE.Quaternion();
const qYaw = new THREE.Quaternion();

const geoCache = new Map<string, THREE.BufferGeometry>();
function cached(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let g = geoCache.get(key);
  if (!g) {
    g = make();
    g.userData.shared = true;
    geoCache.set(key, g);
  }
  return g;
}

export function kartTokens(cfg: KartConfig): ColorTokens {
  const paint = findPaint(cfg.paint);
  return { paint: paint.color, paint2: paint.color2 };
}

/** Build a static kart+driver group (used by menus/podium too). */
export function buildKartMeshes(racerId: string, cfg: KartConfig): {
  chassis: THREE.Mesh;
  driver: THREE.Mesh;
  wheels: THREE.Mesh[];
  wheelPivots: THREE.Group[];
  glider: THREE.Mesh;
  wheelRadius: number;
} {
  const body = findBody(cfg.body);
  const wheels = findWheels(cfg.wheels);
  const glider = findGlider(cfg.glider);
  const racer = findRacer(racerId);
  const tokens = kartTokens(cfg);
  const chassisGeo = cached(`body:${body.id}:${cfg.paint}:${cfg.decal}`, () => buildRecipe(body.model, tokens, buildDecalGeometry(cfg.decal, body, tokens)));
  const driverGeo = cached(`racer:${racer.id}`, () => buildRecipe(racer.model, { accent: racer.color2 }));
  const wheelGeo = cached(`wheel:${wheels.id}:${cfg.paint}`, () => buildRecipe(wheels.model, tokens));
  const gliderGeo = cached(`glider:${glider.id}:${cfg.paint}`, () => buildRecipe(glider.model, tokens));
  const chassis = new THREE.Mesh(chassisGeo, Materials.flat);
  const driver = new THREE.Mesh(driverGeo, Materials.smooth);
  driver.position.set(0, body.seatY, -0.3);
  const wheelMeshes: THREE.Mesh[] = [];
  const pivots: THREE.Group[] = [];
  const scale = wheels.radius / 0.36;
  for (let i = 0; i < 4; i++) {
    const front = i < 2;
    const side = i % 2 === 0 ? 1 : -1;
    const at = front ? body.wheelFront : body.wheelBack;
    const pivot = new THREE.Group();
    pivot.position.set(at[0] * side, wheels.radius, at[2]);
    const w = new THREE.Mesh(wheelGeo, Materials.flat);
    w.scale.setScalar(front ? 1 : 1.08);
    pivot.add(w);
    pivots.push(pivot);
    wheelMeshes.push(w);
  }
  void scale;
  const gliderMesh = new THREE.Mesh(gliderGeo, Materials.flat);
  gliderMesh.visible = false;
  return { chassis, driver, wheels: wheelMeshes, wheelPivots: pivots, glider: gliderMesh, wheelRadius: wheels.radius };
}

/**
 * Visual representation of a sim Kart. Reads (never writes) sim state, interpolating between steps.
 * Hierarchy: root (position, yaw, ground alignment) → body (drift angle, lean, spin, hop, tricks).
 */
export class KartVisual {
  readonly root = new THREE.Group();
  readonly body = new THREE.Group();
  readonly chassis: THREE.Mesh;
  readonly driver: THREE.Mesh;
  readonly wheels: THREE.Mesh[];
  readonly pivots: THREE.Group[];
  readonly glider: THREE.Mesh;
  readonly shield: THREE.Mesh;
  readonly goo: THREE.Mesh;
  readonly drone: THREE.Group;
  /** Little stars circling the driver's head after a spin-out. */
  readonly stars: THREE.Mesh;
  private dizzy = 0;
  private wheelR: number;
  private wheelSpin = 0;
  private driftAngle = 0;
  private lean = 0;
  private pitch = 0;
  private spinAngle = 0;
  private gliderScale = 0;
  private flip = 0;
  /** Exhaust/drift particle anchor points in body space. */
  readonly rearLeft = new THREE.Vector3();
  readonly rearRight = new THREE.Vector3();

  constructor(
    readonly kart: Kart,
    shared: SharedKartGeometry,
  ) {
    const m = buildKartMeshes(kart.racerId, kart.kart);
    this.chassis = m.chassis;
    this.driver = m.driver;
    this.wheels = m.wheels;
    this.pivots = m.wheelPivots;
    this.glider = m.glider;
    this.wheelR = m.wheelRadius;
    this.body.add(this.chassis, this.driver, this.glider, ...this.pivots);
    this.root.add(this.body);
    this.shield = new THREE.Mesh(shared.shield, Materials.shield);
    this.shield.position.y = 0.8;
    this.shield.visible = false;
    this.root.add(this.shield);
    this.goo = new THREE.Mesh(shared.goo, Materials.flat);
    this.goo.visible = false;
    this.body.add(this.goo);
    this.drone = new THREE.Group();
    const droneBody = new THREE.Mesh(shared.drone, Materials.flat);
    this.drone.add(droneBody);
    const prop = new THREE.Mesh(shared.prop, Materials.flat);
    prop.name = 'prop';
    prop.position.y = 0.55;
    this.drone.add(prop);
    this.drone.visible = false;
    this.root.add(this.drone);
    const body = findBody(kart.kart.body);
    this.stars = new THREE.Mesh(shared.stars, Materials.basic);
    this.stars.position.set(0, body.seatY + 1.45, -0.3);
    this.stars.visible = false;
    this.root.add(this.stars);
    this.rearLeft.set(body.wheelBack[0], 0.15, body.wheelBack[2] - 0.2);
    this.rearRight.set(-body.wheelBack[0], 0.15, body.wheelBack[2] - 0.2);
  }

  update(alpha: number, dt: number, time: number): void {
    const k = this.kart;
    const x = k.px + (k.x - k.px) * alpha;
    const y = k.py + (k.y - k.py) * alpha;
    const z = k.pz + (k.z - k.pz) * alpha;
    const yaw = lerpAngle(k.pyaw, k.yaw, alpha);
    this.root.position.set(x, y, z);
    tmpN.set(k.nx, k.ny, k.nz).normalize();
    qAlign.setFromUnitVectors(UP, tmpN);
    qYaw.setFromAxisAngle(UP, yaw);
    this.root.quaternion.copy(qAlign).multiply(qYaw);

    // Drift angle & lean
    const targetDrift = k.drifting ? k.driftDir * -0.42 : clamp(-k.slip * 0.05, -0.3, 0.3);
    this.driftAngle = damp(this.driftAngle, targetDrift, 10, dt);
    const steer = k.controllable ? k.input.steer : 0;
    const spd = Math.min(1, Math.abs(k.speed) / 25);
    const targetLean = (k.drifting ? k.driftDir * 0.12 : steer * 0.09) * spd;
    this.lean = damp(this.lean, targetLean, 8, dt);
    const targetPitch = k.grounded ? clamp(-k.input.throttle * 0.03 * spd, -0.05, 0.05) : clamp(-k.vy * 0.015, -0.25, 0.25);
    this.pitch = damp(this.pitch, targetPitch, 6, dt);

    // Spin-out / tumble / tricks
    if (k.spinTime > 0) this.spinAngle += dt * 13;
    else this.spinAngle = damp(this.spinAngle, Math.round(this.spinAngle / (Math.PI * 2)) * Math.PI * 2, 12, dt);
    if (k.tumbleTime > 0) this.flip += dt * 9;
    else if (k.trickAnim > 0) this.flip = (1 - k.trickAnim / 0.55) * Math.PI * 2;
    else this.flip = damp(this.flip, Math.round(this.flip / (Math.PI * 2)) * Math.PI * 2, 14, dt);

    const hop = k.hopTime > 0 ? Math.sin((1 - k.hopTime / 0.32) * Math.PI) * 0.05 : 0;
    this.body.position.y = hop;
    this.body.rotation.set(this.pitch, this.driftAngle + this.spinAngle, this.lean + (k.trickAnim > 0 ? this.flip : 0), 'YXZ');
    if (k.tumbleTime > 0) this.body.rotation.x = this.flip;
    const wob = k.wobble > 0 ? Math.sin(k.wobble * 40) * k.wobble * 0.25 : 0;
    // spin-outs squash and bounce the kart like a cartoon
    const squash = k.spinTime > 0 || k.tumbleTime > 0 ? Math.abs(Math.sin(time * 17)) * 0.12 : 0;
    this.body.scale.set(1 + wob + squash * 0.5, 1 - wob - squash, 1 + wob + squash * 0.5);
    // dizzy stars linger a moment after the spin
    if (k.spinTime > 0 || k.tumbleTime > 0) this.dizzy = 0.7;
    else this.dizzy = Math.max(0, this.dizzy - dt);
    this.stars.visible = this.dizzy > 0 || k.spinTime > 0 || k.tumbleTime > 0;
    if (this.stars.visible) {
      this.stars.rotation.y = time * 7;
      this.stars.scale.setScalar(Math.min(1, (this.dizzy + (k.spinTime > 0 ? 1 : 0)) / 0.35));
    }

    // Wheels
    this.wheelSpin += (k.speed / this.wheelR) * dt;
    const steerAngle = k.controllable ? -steer * 0.42 : 0;
    for (let i = 0; i < 4; i++) {
      this.wheels[i].rotation.x = this.wheelSpin;
      if (i < 2) this.pivots[i].rotation.y = steerAngle;
    }
    // Glider
    const gTarget = k.gliding ? 1 : 0;
    this.gliderScale = damp(this.gliderScale, gTarget, 8, dt);
    this.glider.visible = this.gliderScale > 0.02;
    if (this.glider.visible) this.glider.scale.set(this.gliderScale, 1, this.gliderScale);
    // Shield bubble
    this.shield.visible = k.shieldTime > 0 && (k.shieldTime > 1 || Math.floor(time * 10) % 2 === 0);
    if (this.shield.visible) this.shield.rotation.y = time * 1.5;
    // Goo
    this.goo.visible = k.gooTime > 0;
    // Drone carrying the kart back to the track
    const carried = k.respawnState === RespawnState.Carried;
    this.drone.visible = carried;
    if (carried) {
      this.drone.position.set(0, 2.2 + Math.sin(time * 6) * 0.08, 0);
      const prop = this.drone.getObjectByName('prop');
      if (prop) prop.rotation.y = time * 40;
    }
    // Hide when invulnerable after respawn (blink)
    this.body.visible = !(k.invulnTime > 0 && k.respawnState === RespawnState.None && Math.floor(time * 14) % 2 === 0 && k.invulnTime < 1.2 && k.invulnTime > 0.05 && k.spinTime <= 0);
  }
}

export interface SharedKartGeometry {
  shield: THREE.BufferGeometry;
  goo: THREE.BufferGeometry;
  drone: THREE.BufferGeometry;
  prop: THREE.BufferGeometry;
  stars: THREE.BufferGeometry;
}

/** Shared geometry for all karts. */
export function buildSharedKartGeometry(): SharedKartGeometry {
  const shield = new THREE.IcosahedronGeometry(1.55, 1);
  const goo = buildRecipe([
    { shape: 'ico', p: [0.3, 0.8, 0.6], s: [0.6, 0.35, 0.6], c: 0xb34dff, seg: 1 },
    { shape: 'ico', p: [-0.4, 0.7, -0.2], s: [0.7, 0.3, 0.7], c: 0x9a33ee, seg: 1 },
    { shape: 'ico', p: [0.1, 1.5, 0.05], s: [0.5, 0.3, 0.5], c: 0xc56bff, seg: 1 },
    { shape: 'ico', p: [0.5, 0.6, -0.8], s: [0.45, 0.3, 0.45], c: 0xb34dff, seg: 1 },
  ]);
  const drone = buildRecipe([
    { shape: 'sphere', p: [0, 0, 0], s: [1.1, 0.6, 1.1], c: 0xffd23f, seg: 10 },
    { shape: 'sphere', p: [0.18, 0.05, 0.42], s: [0.14, 0.2, 0.1], c: 0x1d1d2b, seg: 6, mirror: true },
    { shape: 'torus', p: [0, -0.05, 0.5], s: [0.3, 0.3, 0.3], r: [0, 0, 0], c: 0xff6fae },
    { shape: 'cyl', p: [0, 0.38, 0], s: [0.08, 0.3, 0.08], c: 0x555566, seg: 6 },
    { shape: 'cyl', p: [0.35, -0.75, 0], s: [0.05, 1.2, 0.05], c: 0x555566, seg: 4, mirror: true },
  ]);
  const prop = buildRecipe([{ shape: 'box', p: [0, 0, 0], s: [2.2, 0.04, 0.22], c: 0x3fa7ff }]);
  const stars = buildRecipe([0, 1, 2].map((i) => {
    const a = (i / 3) * Math.PI * 2;
    return { shape: 'ico' as const, p: [Math.cos(a) * 0.5, Math.sin(a * 2) * 0.06, Math.sin(a) * 0.5] as [number, number, number], s: [0.2, 0.2, 0.2] as [number, number, number], r: [0, a * 57, 45] as [number, number, number], c: i === 1 ? 0xffffff : 0xffe45c, seg: 0 };
  }));
  return { shield, goo, drone, prop, stars };
}
