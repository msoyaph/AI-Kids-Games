import * as THREE from 'three';
import type { World } from '../sim/world';
import { Kart, RespawnState } from '../sim/kart';
import type { SimEvent } from '../sim/events';
import { ParticlePool, SkidMarks } from './particles';
import type { QualityProfile } from './quality';

export const TIER_COLORS = [0xd8e6ff, 0x3fa7ff, 0xff9f1c, 0xff4dd2];

interface Emit {
  smoke: number;
  sparks: number;
  flame: number;
  dust: number;
  trail: number;
  bubbles: number;
}

/**
 * Turns sim state + events into particles and skid marks. Purely visual: reads the world, never writes it.
 */
export class Effects {
  readonly soft: ParticlePool;
  readonly glow: ParticlePool;
  readonly skids: SkidMarks;
  private readonly acc: Emit[];
  private skidsOn = true;
  /** Camera positions used to cull far-away emitters. */
  readonly camPos: THREE.Vector3[] = [];
  /** Hook for camera shake on local players. */
  onShake?: (kart: number, amount: number) => void;
  offroadColor = 0x9c8a5a;
  private time = 0;

  constructor(
    readonly world: World,
    scene: THREE.Scene,
  ) {
    this.soft = new ParticlePool(1000, false, 0.9);
    this.glow = new ParticlePool(900, true, 0.6);
    this.skids = new SkidMarks(700);
    scene.add(this.soft.points, this.glow.points, this.skids.mesh);
    this.acc = world.karts.map(() => ({ smoke: 0, sparks: 0, flame: 0, dust: 0, trail: 0, bubbles: 0 }));
  }

  applyQuality(p: QualityProfile): void {
    this.soft.budget = Math.round(p.particleBudget * 0.55);
    this.glow.budget = Math.round(p.particleBudget * 0.45);
    this.skidsOn = p.skidmarks;
    this.skids.mesh.visible = p.skidmarks;
  }

  setViewport(heightPx: number, fov: number): void {
    this.soft.setViewport(heightPx, fov);
    this.glow.setViewport(heightPx, fov);
  }

  private near(k: Kart, maxDist: number): boolean {
    for (const c of this.camPos) {
      const dx = c.x - k.x;
      const dz = c.z - k.z;
      if (dx * dx + dz * dz < maxDist * maxDist) return true;
    }
    return this.camPos.length === 0;
  }

  update(dt: number): void {
    this.time += dt;
    const rnd = Math.random;
    for (let i = 0; i < this.world.karts.length; i++) {
      const k = this.world.karts[i];
      if (k.respawnState === RespawnState.Falling) continue;
      if (!this.near(k, 90)) continue;
      const a = this.acc[i];
      const fx = Math.sin(k.yaw);
      const fz = Math.cos(k.yaw);
      const rx = -fz;
      const rz = fx;
      const gy = k.y + 0.1;
      const backX = k.x - fx * 0.95;
      const backZ = k.z - fz * 0.95;
      const lx = backX - rx * 0.75;
      const lz = backZ - rz * 0.75;
      const rxp = backX + rx * 0.75;
      const rzp = backZ + rz * 0.75;
      const speed = Math.abs(k.speed);

      // Drift sparks (tier colour) + skid marks
      if (k.drifting && k.grounded) {
        a.sparks += dt * (k.driftTier > 0 ? 70 : 22);
        const col = TIER_COLORS[k.driftTier];
        while (a.sparks >= 1) {
          a.sparks -= 1;
          const side = rnd() < 0.5 ? -1 : 1;
          const px = side < 0 ? lx : rxp;
          const pz = side < 0 ? lz : rzp;
          const out = k.driftDir * 2.5;
          this.glow.spawn(px, gy, pz, -fx * 3 + rx * out * rnd() + (rnd() - 0.5) * 2, 2 + rnd() * 3, -fz * 3 + rz * out * rnd() + (rnd() - 0.5) * 2, 0.22 + rnd() * 0.15, k.driftTier > 0 ? 0.26 : 0.14, 0.04, col, 1, 12, 1);
        }
      }
      if (this.skidsOn) {
        const marking = k.grounded && (k.drifting || Math.abs(k.slip) > 4) && !k.offroad;
        this.skids.add(i * 2, lx, k.y, lz, fx, fz, marking);
        this.skids.add(i * 2 + 1, rxp, k.y, rzp, fx, fz, marking);
      }
      // Tyre smoke while drifting / sliding hard
      if (k.grounded && !k.offroad && (k.drifting || Math.abs(k.slip) > 4.5)) {
        a.smoke += dt * 14;
        while (a.smoke >= 1) {
          a.smoke -= 1;
          const side = rnd() < 0.5;
          this.soft.spawn(side ? lx : rxp, gy + 0.1, side ? lz : rzp, (rnd() - 0.5) * 1.5, 0.8 + rnd(), (rnd() - 0.5) * 1.5, 0.55, 0.35, 1.1, 0xf2f0ff, 0.32, -0.5, 1.5);
        }
      }
      // Frost sparkles kicked up on ice
      if (k.grounded && k.ice && speed > 6) {
        a.dust += dt * (k.drifting ? 26 : 10);
        while (a.dust >= 1) {
          a.dust -= 1;
          const side = rnd() < 0.5;
          this.glow.spawn(side ? lx : rxp, gy + 0.05, side ? lz : rzp, (rnd() - 0.5) * 2 - fx * 1.5, 1 + rnd() * 1.5, (rnd() - 0.5) * 2 - fz * 1.5, 0.35, 0.12, 0.03, 0xeaf8ff, 1, 4, 2);
        }
      }
      // Off-road dust
      if (k.grounded && k.offroad && speed > 5) {
        a.dust += dt * Math.min(30, speed * 1.2);
        while (a.dust >= 1) {
          a.dust -= 1;
          const side = rnd() < 0.5;
          this.soft.spawn(side ? lx : rxp, gy, side ? lz : rzp, (rnd() - 0.5) * 2 - fx * 2, 1 + rnd() * 1.5, (rnd() - 0.5) * 2 - fz * 2, 0.6, 0.4, 1.3, this.offroadColor, 0.7, 2, 1.2);
        }
      }
      // Boost flame from the exhaust
      if (k.boosting) {
        a.flame += dt * (k.rocketTime > 0 ? 90 : 55);
        const ex = k.x - fx * 1.35;
        const ez = k.z - fz * 1.35;
        while (a.flame >= 1) {
          a.flame -= 1;
          const c = rnd() < 0.35 ? 0xffe45c : rnd() < 0.5 ? 0xff9f1c : 0xff5a3c;
          const sx = (rnd() - 0.5) * 0.5;
          this.glow.spawn(ex + rx * sx, k.y + 0.7, ez + rz * sx, -fx * (6 + rnd() * 3) + k.vx * 0.6, rnd() * 1.2, -fz * (6 + rnd() * 3) + k.vz * 0.6, 0.18 + rnd() * 0.1, k.rocketTime > 0 ? 0.9 : 0.55, 0.1, c, 1, 0, 3);
        }
      }
      // Glider wingtip trails
      if (k.gliding) {
        a.trail += dt * 30;
        while (a.trail >= 1) {
          a.trail -= 1;
          const side = rnd() < 0.5 ? -1 : 1;
          this.glow.spawn(k.x + rx * 1.7 * side, k.y + 2.1, k.z + rz * 1.7 * side, 0, 0, 0, 0.5, 0.25, 0.05, 0xffffff, 0.7, 0, 0);
        }
      }
      // Underwater bubbles
      if (k.ground.water) {
        a.bubbles += dt * 10;
        while (a.bubbles >= 1) {
          a.bubbles -= 1;
          this.soft.spawn(k.x + (rnd() - 0.5) * 2, k.y + 0.5, k.z + (rnd() - 0.5) * 2, (rnd() - 0.5) * 0.5, 2 + rnd() * 2, (rnd() - 0.5) * 0.5, 1.2, 0.2, 0.35, 0xdff6ff, 0.8, -1, 0.5);
        }
      }
    }
    this.soft.update(dt);
    this.glow.update(dt);
    if (this.skidsOn) this.skids.fade(dt);
  }

  burst(x: number, y: number, z: number, n: number, color: number, speed: number, size: number, life: number, additive: boolean, gravity = 6): void {
    const pool = additive ? this.glow : this.soft;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const e = Math.random() * 0.9 + 0.1;
      const v = speed * (0.5 + Math.random() * 0.5);
      pool.spawn(x, y, z, Math.cos(a) * v * (1 - e * 0.5), e * v, Math.sin(a) * v * (1 - e * 0.5), life * (0.7 + Math.random() * 0.6), size, size * 0.3, color, 1, gravity, 1.5);
    }
  }

  onEvent(e: SimEvent): void {
    const ks = this.world.karts;
    switch (e.type) {
      case 'land': {
        const k = ks[e.kart];
        if (e.impact > 7 || e.trick) this.burst(k.x, k.y + 0.2, k.z, 10, k.offroad ? this.offroadColor : 0xeeeeff, 4, 1.1, 0.6, false, -0.5);
        if (e.trick) this.burst(k.x, k.y + 1, k.z, 14, 0xffe45c, 6, 0.5, 0.5, true);
        if (e.impact > 9) this.onShake?.(e.kart, 0.4);
        break;
      }
      case 'launch': {
        if (!e.glider) break;
        const k = ks[e.kart];
        this.burst(k.x, k.y + 1.8, k.z, 14, 0xffffff, 5, 0.6, 0.5, false, -0.5); // whoomph as the glider opens
        break;
      }
      case 'finish': {
        // confetti for podium finishers (bigger fountain for the winner)
        const k = ks[e.kart];
        if (e.rank > 3 || !this.near(k, 120)) break;
        const n = e.rank === 1 ? 70 : 30;
        const cols = [0xff6fae, 0xffd23f, 0x4ce0d2, 0x8cff6b, 0xb47bff, 0xff9f1c];
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2;
          const v = 3 + Math.random() * 5;
          this.soft.spawn(k.x, k.y + 2, k.z, Math.cos(a) * v * 0.6 + k.vx * 0.4, 6 + Math.random() * 6, Math.sin(a) * v * 0.6 + k.vz * 0.4, 1.8 + Math.random(), 0.32, 0.28, cols[i % cols.length], 1, 5, 0.6);
        }
        break;
      }
      case 'trick': {
        const k = ks[e.kart];
        this.burst(k.x, k.y + 1.2, k.z, 12, 0xffffff, 5, 0.45, 0.45, true, 0);
        break;
      }
      case 'miniTurbo': {
        // tier-coloured burst out of the exhaust, a backward streak, and (orange/pink) a ring on the road
        const k = ks[e.kart];
        const fx = Math.sin(k.yaw);
        const fz = Math.cos(k.yaw);
        const col = TIER_COLORS[e.tier];
        this.burst(k.x - fx * 1.2, k.y + 0.6, k.z - fz * 1.2, 12 + e.tier * 8, col, 7 + e.tier, 0.5 + e.tier * 0.08, 0.45, true);
        for (let i = 0; i < 6 + e.tier * 4; i++) {
          const s = 10 + Math.random() * 8;
          const side = (Math.random() - 0.5) * 1.4;
          this.glow.spawn(k.x - fx * 1.3 - fz * side, k.y + 0.4 + Math.random() * 0.4, k.z - fz * 1.3 + fx * side, -fx * s + k.vx * 0.3, Math.random() * 2, -fz * s + k.vz * 0.3, 0.25, 0.32, 0.05, col, 1, 4, 2);
        }
        if (e.tier >= 2) {
          const n = e.tier === 3 ? 22 : 14;
          for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2;
            this.glow.spawn(k.x, k.y + 0.25, k.z, Math.cos(a) * 9 + k.vx * 0.5, 0.6, Math.sin(a) * 9 + k.vz * 0.5, 0.3, 0.3, 0.05, col, 1, 0, 3);
          }
        }
        break;
      }
      case 'driftTier': {
        const k = ks[e.kart];
        this.burst(k.x, k.y + 0.4, k.z, 8, TIER_COLORS[e.tier], 5, 0.4, 0.35, true);
        break;
      }
      case 'boostPad': {
        const k = ks[e.kart];
        this.burst(k.x, k.y + 0.3, k.z, 12, 0xffe45c, 5, 0.5, 0.4, true);
        break;
      }
      case 'wall': {
        const k = ks[e.kart];
        this.burst(k.x, k.y + 0.6, k.z, 4 + Math.round(e.strength * 10), 0xffd27a, 6, 0.3, 0.3, true, 12);
        this.onShake?.(e.kart, 0.2 + e.strength * 0.5);
        break;
      }
      case 'bump': {
        const a = ks[e.kart];
        const b = ks[e.other];
        this.burst((a.x + b.x) / 2, (a.y + b.y) / 2 + 0.6, (a.z + b.z) / 2, 6, 0xffffff, 5, 0.35, 0.3, true, 10);
        this.onShake?.(e.kart, 0.25 * e.strength);
        this.onShake?.(e.other, 0.25 * e.strength);
        break;
      }
      case 'respawn': {
        const k = ks[e.kart];
        this.burst(k.x, k.y + 2, k.z, 16, 0x7fe7ff, 4, 0.5, 0.6, true, 0);
        break;
      }
      case 'startBoost': {
        const k = ks[e.kart];
        if (e.good) this.burst(k.x - Math.sin(k.yaw) * 1.3, k.y + 0.6, k.z - Math.cos(k.yaw) * 1.3, 18, 0xff9f1c, 6, 0.6, 0.4, true);
        else this.burst(k.x, k.y + 0.9, k.z, 10, 0x666677, 2, 0.9, 0.8, false, -1);
        break;
      }
      default:
        break;
    }
  }

  dispose(): void {
    this.soft.dispose();
    this.glow.dispose();
  }
}
