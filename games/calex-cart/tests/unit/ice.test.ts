import { describe, expect, it } from 'vitest';
import { ArenaModel } from '../../src/sim/arena';
import { TEST_ARENA } from '../../src/data/arenas';
import { World } from '../../src/sim/world';
import { SIM_DT } from '../../src/core/loop';
import type { ArenaData } from '../../src/data/types';
import type { GroundHint, GroundHit, GroundModel, SpawnPoint } from '../../src/sim/ground';
import { findTrack } from '../../src/data/tracks/index';
import { TrackModel, F_ICE } from '../../src/sim/track/trackModel';

const cfg = { body: 'zoomster', wheels: 'standard', glider: 'kite', paint: 'cherry', decal: 'none' };
const OPEN: ArenaData = { ...TEST_ARENA, size: 2000, obstacles: [], ramps: [], platforms: [] };

/** The open arena, but every surface reports as ice (or road). */
class Surface implements GroundModel {
  private readonly a = new ArenaModel(OPEN);
  constructor(private readonly kind: 'ice' | 'road') {}
  get gravityScale(): number {
    return this.a.gravityScale;
  }
  get killY(): number {
    return this.a.killY;
  }
  get length(): number {
    return this.a.length;
  }
  query(x: number, y: number, z: number, hint: GroundHint, out: GroundHit): GroundHit {
    this.a.query(x, y, z, hint, out);
    if (out.hit) out.surface = this.kind;
    return out;
  }
  respawnAt(s: number, l: number, out: SpawnPoint): SpawnPoint {
    return this.a.respawnAt(s, l, out);
  }
  resetHint(x: number, y: number, z: number, hint: GroundHint): void {
    this.a.resetHint(x, y, z, hint);
  }
}

function world(kind: 'ice' | 'road'): World {
  const w = new World({ ground: new Surface(kind), speedClass: 'pro', seed: 3, racers: [{ racerId: 'calex', kart: cfg, player: 0 }], countdownTime: 0 });
  w.events.enabled = false;
  w.karts[0].place(0, 0, -900, 0);
  return w;
}

function run(w: World, seconds: number, each?: () => void): void {
  for (let i = 0; i < Math.round(seconds / SIM_DT); i++) {
    each?.();
    w.step(SIM_DT);
  }
}

describe('ice', () => {
  it('slides: a hard turn on ice keeps much more sideways speed', () => {
    const lateral = (kind: 'ice' | 'road'): number => {
      const w = world(kind);
      const k = w.karts[0];
      run(w, 4, () => (k.input.throttle = 1));
      run(w, 0.5, () => {
        k.input.throttle = 1;
        k.input.steer = 1;
      });
      return Math.abs(k.vx * Math.cos(k.yaw) - k.vz * Math.sin(k.yaw));
    };
    expect(lateral('ice')).toBeGreaterThan(lateral('road') * 1.8);
  });

  it('glides further when coasting and accelerates a little slower', () => {
    const coast = (kind: 'ice' | 'road'): { after: number; accel: number } => {
      const w = world(kind);
      const k = w.karts[0];
      run(w, 1, () => (k.input.throttle = 1));
      const accel = k.speed;
      run(w, 4, () => (k.input.throttle = 1));
      run(w, 2, () => (k.input.throttle = 0));
      return { after: k.speed, accel };
    };
    const ice = coast('ice');
    const road = coast('road');
    expect(ice.after).toBeGreaterThan(road.after);
    expect(ice.accel).toBeLessThan(road.accel);
  });

  it('charges drift sparks faster', () => {
    const charge = (kind: 'ice' | 'road'): number => {
      const w = world(kind);
      const k = w.karts[0];
      run(w, 4, () => (k.input.throttle = 1));
      run(w, 0.05, () => {
        k.input.throttle = 1;
        k.input.steer = 1;
        k.input.drift = true;
      });
      run(w, 1.2, () => {
        k.input.throttle = 1;
        k.input.steer = 1;
        k.input.drift = true;
      });
      return k.driftCharge;
    };
    expect(charge('road')).toBeGreaterThan(0.3);
    expect(charge('ice')).toBeGreaterThan(charge('road') * 1.08);
  });

  it('Frostpeak Pass has icy road and an icy shortcut', () => {
    const t = new TrackModel(findTrack('frostpeak-pass'), false);
    let ice = 0;
    for (let i = 0; i < t.main.n; i++) if (t.main.flags[i] & F_ICE) ice++;
    expect(ice).toBeGreaterThan(20);
    expect(t.shortcuts.some((sc) => sc.flags[0] & F_ICE)).toBe(true);
  });
});
