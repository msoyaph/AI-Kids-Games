import { clamp } from '../../core/math';
import type { Rng } from '../../core/rng';
import type { AiProfile } from '../../data/types';
import { Kart, RespawnState } from '../kart';
import type { TrackModel } from '../track/trackModel';
import type { World } from '../world';

/**
 * AI item decisions. Produces item-button presses/holds on the kart input.
 * Fairness: reaction delays, no paper-plane sniping of humans near the finish, and no superhuman aim.
 */
export class ItemBrain {
  private held = 0;
  private pressNext = false;
  private holding = false;
  private delay = 0;
  private lastItem: string | null = null;

  constructor(
    readonly kart: Kart,
    readonly world: World,
    readonly track: TrackModel | null,
    readonly profile: AiProfile,
    readonly skill: number,
    private readonly rng: Rng,
  ) {}

  update(dt: number): void {
    const k = this.kart;
    const inp = k.input;
    if (this.pressNext) {
      inp.item = true;
      this.pressNext = false;
      return;
    }
    if (!k.item || k.rouletteTime > 0 || !k.controllable) {
      this.held = 0;
      this.holding = false;
      this.lastItem = null;
      inp.item = false;
      inp.aimBack = false;
      return;
    }
    if (k.item !== this.lastItem) {
      this.lastItem = k.item;
      this.held = 0;
      this.delay = 0.35 + (1 - this.profile.itemEagerness) * 1.6 + (1 - this.skill) * 0.8 + this.rng.range(0, 0.8);
    }
    this.held += dt;
    inp.item = this.holding;
    if (this.held < this.delay && k.item !== 'rocketDash' && k.threat < 0.6) return;

    const ahead = this.target(1);
    const behind = this.target(-1);
    const straight = this.straightAhead();
    switch (k.item) {
      case 'turbo':
      case 'turbo3':
        if ((straight && k.speed > 12) || (k.offroad && k.speed > 6) || this.held > 7) this.press();
        break;
      case 'shield':
        if (k.threat > 0.45 || this.held > 4 + 10 * this.profile.defense) this.press();
        break;
      case 'magnet':
        if (ahead && ahead.dist > 15 && ahead.dist < 110 && straight) this.press();
        else if (this.held > 12) this.press();
        break;
      case 'rocketDash':
        if (this.held > 0.4) this.press();
        break;
      case 'paperPlane': {
        const t = this.rankAhead();
        if (t && !this.protectedTarget(t)) this.press();
        break;
      }
      case 'cloud':
        if (k.rank >= 3 || this.held > 10) this.press();
        break;
      case 'tornado':
        if (this.anyNear(9) || this.held > 9) this.press();
        break;
      case 'popper':
        if ((ahead && ahead.dist > 12 && ahead.dist < 34 && ahead.cone < 0.25) || this.held > 10) this.press();
        break;
      case 'bumperBall':
        if (!this.holding && this.profile.defense > 0.45 && this.held > this.delay) {
          this.holding = true;
          inp.item = true;
        } else if (this.holding) {
          if (ahead && ahead.dist < 40 && ahead.cone < 0.12 && this.rng.chance(0.08 + this.skill * 0.1)) this.release(false);
          else if (behind && behind.dist < 12 && behind.cone < 0.2 && this.rng.chance(0.05)) this.release(true);
          else if (this.held > 14) this.release(false);
        } else if (ahead && ahead.dist < 40 && ahead.cone < 0.12) this.press();
        else if (this.held > 9) this.press();
        break;
      case 'gooPuddle':
      case 'springTrap':
        if (!this.holding) {
          this.holding = true;
          inp.item = true;
        } else if ((behind && behind.dist < 16) || this.held > 7 + this.profile.defense * 6) this.release(true);
        break;
    }
  }

  private press(): void {
    this.kart.input.item = false;
    this.kart.input.aimBack = false;
    this.pressNext = true;
    this.held = 0;
  }

  private release(back: boolean): void {
    this.holding = false;
    this.kart.input.item = false;
    this.kart.input.aimBack = back;
    this.held = 0;
  }

  private target(dir: 1 | -1): { kart: Kart; dist: number; cone: number } | null {
    const k = this.kart;
    const fx = Math.sin(k.yaw) * dir;
    const fz = Math.cos(k.yaw) * dir;
    let best: { kart: Kart; dist: number; cone: number } | null = null;
    for (const o of this.world.karts) {
      if (o === k || o.respawnState !== RespawnState.None || o.finished) continue;
      const dx = o.x - k.x;
      const dz = o.z - k.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 1) continue;
      const along = (dx * fx + dz * fz) / dist;
      if (along < 0.85) continue;
      const cone = Math.acos(clamp(along, -1, 1));
      if (!best || dist < best.dist) best = { kart: o, dist, cone };
    }
    return best;
  }

  private rankAhead(): Kart | null {
    for (const o of this.world.karts) if (o.rank === this.kart.rank - 1 && !o.finished) return o;
    return null;
  }

  /** Don't snipe a human with a homing plane in the last stretch of the final lap. */
  private protectedTarget(t: Kart): boolean {
    if (!t.isPlayer || !this.track) return false;
    const laps = 3;
    const total = laps * this.track.length;
    return t.progress > total * 0.93;
  }

  private anyNear(r: number): boolean {
    const k = this.kart;
    for (const o of this.world.karts) {
      if (o === k || o.respawnState !== RespawnState.None) continue;
      if ((o.x - k.x) ** 2 + (o.z - k.z) ** 2 < r * r) return true;
    }
    return false;
  }

  private straightAhead(): boolean {
    if (!this.track) return true;
    const rb = this.track.main;
    const i = this.kart.hint.sample;
    let turn = 0;
    for (let s = 0; s < Math.round(45 / rb.ds); s += 2) turn += Math.abs(this.track.lineCurv[rb.idx(i + s)]) * rb.ds * 2;
    return turn < 0.35;
  }
}
