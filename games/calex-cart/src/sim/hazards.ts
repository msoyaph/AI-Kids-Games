import type { HazardData } from '../data/types';
import { RespawnState } from './kart';
import type { TrackModel } from './track/trackModel';
import type { World } from './world';
import type { HazardInfo } from './ai/aiDriver';

export interface HazardState {
  data: HazardData;
  x: number;
  y: number;
  z: number;
  /** Visual rotation / swing angle. */
  angle: number;
  /** 0..1 eruption/active amount (geysers), 1 for always-on hazards. */
  active: number;
  /** Geyser warning (bubbling) 0..1. */
  warn: number;
  radius: number;
  baseX: number;
  baseZ: number;
  rx: number;
  rz: number;
  hw: number;
  yaw: number;
}

const DEFAULT_RADIUS: Record<HazardData['kind'], number> = { roller: 1.7, bumper: 1.4, geyser: 2.6, crab: 1.1, swinger: 1.6 };

/**
 * Cartoony track hazards: rolling balls, pinball bumpers, geysers, side-stepping critters and swinging props.
 * Deterministic: positions are a pure function of race time.
 */
export class HazardSystem {
  readonly list: HazardState[] = [];
  /** Optional hit callback (item system applies spins so shields work uniformly). */
  onHit?: (kartIndex: number, kind: HazardData['kind']) => void;

  constructor(
    readonly world: World,
    readonly track: TrackModel,
    private readonly aiHazards?: HazardInfo[],
  ) {
    const rb = track.main;
    const mirror = track.mirror ? -1 : 1;
    for (const h of track.data.hazards ?? []) {
      const s = rb.sAtU(h.at);
      const i = rb.indexAtS(s);
      const hw = rb.hw[i];
      const d = (h.offset ?? 0) * hw * mirror;
      this.list.push({
        data: h,
        x: rb.px[i] + rb.rx[i] * d,
        y: rb.py[i] + rb.ry[i] * d,
        z: rb.pz[i] + rb.rz[i] * d,
        angle: 0,
        active: 1,
        warn: 0,
        radius: h.radius ?? DEFAULT_RADIUS[h.kind],
        baseX: rb.px[i] + rb.rx[i] * d,
        baseZ: rb.pz[i] + rb.rz[i] * d,
        rx: rb.rx[i],
        rz: rb.rz[i],
        hw,
        yaw: Math.atan2(rb.tx[i], rb.tz[i]),
      });
    }
    world.postStep.push(() => this.update());
  }

  update(): void {
    const t = this.world.time;
    const w = this.world;
    for (const h of this.list) {
      const d = h.data;
      const period = d.period ?? 4;
      const ph = (t / period + (d.phase ?? 0)) * Math.PI * 2;
      switch (d.kind) {
        case 'roller':
        case 'crab': {
          const amp = (d.amp ?? 0.7) * h.hw;
          const off = Math.sin(ph) * amp;
          h.x = h.baseX + h.rx * off;
          h.z = h.baseZ + h.rz * off;
          h.angle = d.kind === 'roller' ? (off / h.radius) : Math.sin(ph * 4) * 0.3;
          h.active = 1;
          break;
        }
        case 'swinger': {
          const a = Math.sin(ph) * (d.amp ?? 0.8);
          h.angle = a;
          // the head of the pendulum sweeps across the road
          const off = Math.sin(a) * h.hw * 0.9;
          h.x = h.baseX + h.rx * off;
          h.z = h.baseZ + h.rz * off;
          h.active = Math.abs(Math.cos(a)) > 0.3 ? 1 : 0;
          break;
        }
        case 'geyser': {
          const cyc = ((t / period + (d.phase ?? 0)) % 1 + 1) % 1;
          h.active = cyc > 0.7 ? 1 : 0;
          h.warn = cyc > 0.45 && cyc <= 0.7 ? (cyc - 0.45) / 0.25 : 0;
          break;
        }
        case 'bumper':
          h.active = 1;
          h.angle = t * 2;
          break;
      }
      if (h.active <= 0) continue;
      for (const k of w.karts) {
        if (k.respawnState !== RespawnState.None) continue;
        const dx = k.x - h.x;
        const dz = k.z - h.z;
        const r = h.radius + 0.9;
        const d2 = dx * dx + dz * dz;
        if (d2 > r * r || Math.abs(k.y - h.y) > 3) continue;
        const dist = Math.sqrt(d2) || 1e-3;
        const nx = dx / dist;
        const nz = dz / dist;
        switch (d.kind) {
          case 'bumper': {
            // pinball pop: push away hard, no spin
            k.x = h.x + nx * r;
            k.z = h.z + nz * r;
            const vn = k.vx * nx + k.vz * nz;
            const push = Math.max(12, -vn * 1.4);
            k.vx += nx * (push - Math.min(0, vn));
            k.vz += nz * (push - Math.min(0, vn));
            k.wobble = 0.4;
            w.events.push({ type: 'hazard', kart: k.index, kind: 'bumper' });
            break;
          }
          case 'geyser':
            if (k.grounded) {
              k.vy = 12;
              k.grounded = false;
              k.vx *= 0.7;
              k.vz *= 0.7;
              k.wobble = 0.5;
              w.events.push({ type: 'hazard', kart: k.index, kind: 'geyser' });
            }
            break;
          default:
            // rollers, critters and swingers bonk you into a spin
            k.x = h.x + nx * r;
            k.z = h.z + nz * r;
            if (k.invulnTime <= 0 && k.spinTime <= 0) {
              if (this.onHit) this.onHit(k.index, d.kind);
              else {
                k.spinTime = 0.8;
                k.invulnTime = 1.2;
                k.vx *= 0.5;
                k.vz *= 0.5;
                k.cancelDrift();
              }
              w.events.push({ type: 'hazard', kart: k.index, kind: d.kind });
            }
            break;
        }
      }
    }
    // share positions with AI avoidance (appended after item hazards)
    if (this.aiHazards) {
      let free = this.aiHazards.length - 1;
      for (const h of this.list) {
        if (free < 0) break;
        const slot = this.aiHazards[free--];
        slot.x = h.x;
        slot.z = h.z;
        slot.radius = h.radius + (h.data.kind === 'roller' || h.data.kind === 'swinger' ? 1.2 : 0.4);
        slot.active = h.data.kind !== 'geyser' || h.warn > 0 || h.active > 0;
      }
    }
  }
}
