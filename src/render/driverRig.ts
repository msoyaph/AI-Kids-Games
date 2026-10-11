// Animated drivers: the racer's part list becomes ONE skinned mesh with four bones (body, head, left/right arm),
// so poses cost no extra draw calls. Roles come from `ModelPart.role` or are detected from the layout:
// mirrored parts reaching forward at shoulder height are arms, everything above the neck line is the head.
import * as THREE from 'three';
import type { ModelPart, RacerData } from '../data/types';
import { mergeColored, partGeometry } from './lowpoly';
import { damp } from '../core/math';

export type DriverPose = 'drive' | 'lookBack' | 'celebrate' | 'disappointed' | 'hit' | 'wave' | 'cheer' | 'clap';

const NECK_Y = 0.72;

export function partRole(part: ModelPart): 'body' | 'head' | 'arm' {
  if (part.role) return part.role;
  const p = part.p ?? [0, 0, 0];
  if (part.mirror && Math.abs(p[0]) >= 0.14 && p[1] >= 0.2 && p[1] <= 0.75 && p[2] >= 0.05) return 'arm';
  if (p[1] >= NECK_Y) return 'head';
  return 'body';
}

interface RigGeometry {
  geometry: THREE.BufferGeometry;
  neck: THREE.Vector3;
  shoulderL: THREE.Vector3;
  shoulderR: THREE.Vector3;
}

const cache = new Map<string, RigGeometry>();

/** Skinned geometry for a racer (cached, shared between races). */
export function rigGeometry(racer: RacerData): RigGeometry {
  const hit = cache.get(racer.id);
  if (hit) return hit;
  const tokens = { accent: racer.color2 };
  const geos: THREE.BufferGeometry[] = [];
  const bones: number[] = [];
  let headMinY = Infinity;
  let headZ = 0;
  let headN = 0;
  const shoulder = { x: 0, y: 0, z: Infinity, n: 0 };
  for (const part of racer.model) {
    const role = partRole(part);
    const p = part.p ?? [0, 0, 0];
    const s = part.s ?? [1, 1, 1];
    for (const mirrored of part.mirror ? [false, true] : [false]) {
      geos.push(partGeometry(part, tokens, mirrored));
      const x = mirrored ? -p[0] : p[0];
      bones.push(role === 'head' ? 1 : role === 'arm' ? (x >= 0 ? 2 : 3) : 0);
    }
    if (role === 'head') {
      headMinY = Math.min(headMinY, p[1] - s[1] * 0.4);
      headZ += p[2];
      headN++;
    } else if (role === 'arm') {
      shoulder.x += Math.abs(p[0]);
      shoulder.y = Math.max(shoulder.y, p[1] + s[1] * 0.3);
      shoulder.z = Math.min(shoulder.z, p[2]);
      shoulder.n++;
    }
  }
  // per-part bone index → per-vertex skin attributes
  const counts = geos.map((g) => g.getAttribute('position').count);
  const geometry = mergeColored(geos);
  const total = geometry.getAttribute('position').count;
  const idx = new Uint16Array(total * 4);
  const wt = new Float32Array(total * 4);
  let o = 0;
  counts.forEach((c, i) => {
    for (let v = 0; v < c; v++, o++) {
      idx[o * 4] = bones[i];
      wt[o * 4] = 1;
    }
  });
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(idx, 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(wt, 4));
  geometry.userData.shared = true;
  const sx = shoulder.n ? shoulder.x / shoulder.n : 0.28;
  const out: RigGeometry = {
    geometry,
    neck: new THREE.Vector3(0, Number.isFinite(headMinY) ? Math.max(0.55, headMinY) : 0.75, headN ? headZ / headN : 0),
    shoulderL: new THREE.Vector3(sx, shoulder.n ? shoulder.y : 0.6, shoulder.n ? Math.min(0.15, shoulder.z) : 0.1),
    shoulderR: new THREE.Vector3(-sx, shoulder.n ? shoulder.y : 0.6, shoulder.n ? Math.min(0.15, shoulder.z) : 0.1),
  };
  cache.set(racer.id, out);
  return out;
}

/** A posable driver. `mesh` replaces the static driver mesh; call `update` every frame. */
export class DriverRig {
  readonly mesh: THREE.SkinnedMesh;
  private readonly root = new THREE.Bone();
  private readonly head = new THREE.Bone();
  private readonly armL = new THREE.Bone();
  private readonly armR = new THREE.Bone();
  private headYaw = 0;
  private headPitch = 0;
  private headRoll = 0;
  private armLx = 0;
  private armRx = 0;
  private armLz = 0;
  private armRz = 0;
  private bob = 0;

  constructor(racer: RacerData, material: THREE.Material) {
    const g = rigGeometry(racer);
    this.mesh = new THREE.SkinnedMesh(g.geometry, material);
    this.head.position.copy(g.neck);
    this.armL.position.copy(g.shoulderL);
    this.armR.position.copy(g.shoulderR);
    this.root.add(this.head, this.armL, this.armR);
    this.mesh.add(this.root);
    this.mesh.updateMatrixWorld(true);
    this.mesh.bind(new THREE.Skeleton([this.root, this.head, this.armL, this.armR]));
    this.mesh.frustumCulled = false; // tiny; the kart group culls as a whole
  }

  update(dt: number, time: number, pose: DriverPose, steer: number, speed01: number): void {
    let hy = 0;
    let hp = 0;
    let hr = -steer * 0.12 * speed01; // lean the head into turns
    let lx = 0;
    let rx = 0;
    let lz = -steer * 0.18;
    let rz = -steer * 0.18; // arms turn the wheel
    let bob = Math.sin(time * 9) * 0.012 * speed01;
    switch (pose) {
      case 'lookBack':
        hy = 2.2;
        hr = 0;
        break;
      case 'hit':
        hp = Math.sin(time * 14) * 0.25;
        hr = Math.sin(time * 11) * 0.3;
        lx = -1.4 + Math.sin(time * 20) * 0.9;
        rx = -1.4 + Math.sin(time * 20 + 2) * 0.9;
        lz = 0.5;
        rz = -0.5;
        break;
      case 'celebrate':
      case 'cheer':
        lx = -2.0 + Math.sin(time * 9) * 0.2;
        rx = -2.0 + Math.sin(time * 9 + 1.5) * 0.2;
        lz = 0.35;
        rz = -0.35;
        hp = -0.25;
        bob = Math.abs(Math.sin(time * 7)) * 0.08;
        break;
      case 'wave':
        lx = -2.0;
        lz = 0.4 + Math.sin(time * 8) * 0.45;
        hp = -0.15;
        hy = Math.sin(time * 1.3) * 0.3;
        break;
      case 'clap': {
        const c = Math.abs(Math.sin(time * 6));
        lx = -1.2;
        rx = -1.2;
        lz = -0.4 * c;
        rz = 0.4 * c;
        hp = -0.1;
        break;
      }
      case 'disappointed':
        hp = 0.45;
        lx = 0.3;
        rx = 0.3;
        lz = 0.15;
        rz = -0.15;
        bob = 0;
        break;
      default:
        break;
    }
    const r = 12;
    this.headYaw = damp(this.headYaw, hy, pose === 'lookBack' ? 14 : 8, dt);
    this.headPitch = damp(this.headPitch, hp, r, dt);
    this.headRoll = damp(this.headRoll, hr, r, dt);
    this.armLx = damp(this.armLx, lx, r, dt);
    this.armRx = damp(this.armRx, rx, r, dt);
    this.armLz = damp(this.armLz, lz, r, dt);
    this.armRz = damp(this.armRz, rz, r, dt);
    this.bob = damp(this.bob, bob, 20, dt);
    this.head.rotation.set(this.headPitch, this.headYaw, this.headRoll, 'YXZ');
    this.armL.rotation.set(this.armLx, 0, this.armLz);
    this.armR.rotation.set(this.armRx, 0, this.armRz);
    this.root.position.y = this.bob;
  }
}
