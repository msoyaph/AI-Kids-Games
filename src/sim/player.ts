import { DT, PLAYER_RADIUS } from '../config/balance';
import { Ev } from '../core/events';
import { clamp } from '../core/math';
import { moveSpeedMult } from './stats';
import { HeroPassive, landingBonk } from './heroes';
import { Surface } from './terrain';
import { playerWind } from './weather';
import type { SimInput, World } from './world';

const grad = new Float32Array(2);
const push = new Float32Array(2);
const wind = new Float32Array(2);

export function walkSpeed(w: World): number {
  const p = w.player;
  return w.tuning.movement.walkSpeed * p.character.move.speed * moveSpeedMult(p.stats);
}

/**
 * Momentum movement:
 *  - walking accelerates toward input; extra speed (from slides / slopes) bleeds off slowly
 *  - sliding has low friction, gains speed downhill, gets a one-shot boost on start
 *  - jumping keeps horizontal speed (air has no friction) and slide-jumps add a small boost
 *  - kicker ramps launch you because ground-following releases when terrain drops away
 */
export function updatePlayer(w: World, input: SimInput): void {
  const p = w.player;
  const t = w.terrain;
  const mv = p.character.move;
  const MOVE = w.tuning.movement;
  // ground surface (Rimewood): ice is slippery, snowdrifts are slow; frost chills slow you
  const surf = p.onGround ? t.surfaceAt(p.x, p.z) : Surface.Ground;
  const onIce = surf === Surface.Ice;
  const onSnow = surf === Surface.Snow;
  const grip = onIce ? MOVE.iceGrip : 1;
  const walk = walkSpeed(w) * (onSnow ? MOVE.snowSpeed : 1) * (p.chill > 0 ? 1 - MOVE.chillSlow : 1);
  if (p.chill > 0) p.chill = Math.max(0, p.chill - DT);

  p.coyote = p.onGround ? MOVE.coyoteTime : Math.max(0, p.coyote - DT);
  p.jumpBuffer = input.jump ? MOVE.jumpBuffer : Math.max(0, p.jumpBuffer - DT);
  p.slideCd = Math.max(0, p.slideCd - DT);
  p.landT += DT;

  let ix = input.moveX;
  let iz = input.moveZ;
  const inLen = Math.hypot(ix, iz);
  if (inLen > 1) {
    ix /= inLen;
    iz /= inLen;
  }
  let hs = Math.hypot(p.vx, p.vz);

  // ── slide state ──
  if (p.onGround) {
    if (input.slide && !p.sliding && (hs > MOVE.slideMinSpeed || inLen > 0.2)) {
      p.sliding = true;
      if (p.slideCd <= 0) {
        // boost fades out as you get faster, so spamming can't accelerate forever
        const k = clamp(1 - (hs - walk) / (walk * 1.2), 0, 1);
        const boost = MOVE.slideBoost * mv.slideBoost * k;
        let dx = hs > 0.5 ? p.vx / hs : ix;
        let dz = hs > 0.5 ? p.vz / hs : iz;
        const dl = Math.hypot(dx, dz) || 1;
        dx /= dl;
        dz /= dl;
        const ns = Math.max(hs, walk * 0.8) + boost;
        p.vx = dx * ns;
        p.vz = dz * ns;
        hs = ns;
        p.slideCd = MOVE.slideBoostCooldown;
        w.events.push(Ev.Slide, p.x, p.y, p.z, hs);
      }
    }
    if (!input.slide) p.sliding = false;
  } else if (!input.slide) {
    p.sliding = false;
  }

  // ── horizontal acceleration ──
  if (p.onGround) {
    if (p.sliding) {
      t.gradient(p.x, p.z, grad);
      p.vx -= grad[0] * MOVE.slideSlopeAccel * DT;
      p.vz -= grad[1] * MOVE.slideSlopeAccel * DT;
      hs = Math.hypot(p.vx, p.vz);
      // steer: rotate velocity toward input direction
      if (inLen > 0.1 && hs > 0.1) {
        const cur = Math.atan2(p.vx, p.vz);
        const want = Math.atan2(ix, iz);
        let d = want - cur;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        const maxTurn = MOVE.slideSteer * DT;
        const turn = clamp(d, -maxTurn, maxTurn);
        const na = cur + turn;
        p.vx = Math.sin(na) * hs;
        p.vz = Math.cos(na) * hs;
        // pulling straight back brakes
        if (Math.abs(d) > 2.4) hs = Math.max(0, hs - 6 * DT);
      }
      const fr = MOVE.slideFriction * mv.slideFriction * (onIce ? MOVE.iceSlide : onSnow ? MOVE.snowSlide : 1);
      const ns = Math.max(0, hs - fr * DT);
      if (hs > 0.0001) {
        p.vx *= ns / hs;
        p.vz *= ns / hs;
      }
      hs = ns;
      if (hs < 1.5) p.sliding = false;
    } else {
      const tx = ix * walk;
      const tz = iz * walk;
      let dvx = tx - p.vx;
      let dvz = tz - p.vz;
      const dl = Math.hypot(dvx, dvz);
      // over walk speed: keep momentum, bleed it slowly (still steerable)
      const over = hs > walk * 1.05;
      const accel = (over ? MOVE.overspeedFriction + (inLen > 0.1 ? 10 : 0) : inLen > 0.1 ? MOVE.groundAccel : MOVE.groundFriction) * grip;
      const maxDv = accel * DT;
      if (dl > maxDv) {
        dvx *= maxDv / dl;
        dvz *= maxDv / dl;
      }
      if (over && inLen > 0.1) {
        // steer momentum toward input without losing much speed
        const want = Math.atan2(ix, iz);
        const cur = Math.atan2(p.vx, p.vz);
        let d = want - cur;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        const turn = clamp(d, -4 * grip * DT, 4 * grip * DT);
        const na = cur + turn;
        const ns = Math.max(walk, hs - MOVE.overspeedFriction * grip * DT);
        p.vx = Math.sin(na) * ns;
        p.vz = Math.cos(na) * ns;
      } else {
        p.vx += dvx;
        p.vz += dvz;
      }
    }
  } else {
    // air control: can steer, can't gain speed beyond what you had (or walk speed)
    const before = Math.max(hs, walk);
    p.vx += ix * MOVE.airAccel * DT;
    p.vz += iz * MOVE.airAccel * DT;
    const after = Math.hypot(p.vx, p.vz);
    if (after > before) {
      p.vx *= before / after;
      p.vz *= before / after;
    }
  }

  // ── jump ──
  if (p.jumpBuffer > 0 && p.coyote > 0) {
    p.vy = MOVE.jumpSpeed * mv.jump;
    hs = Math.hypot(p.vx, p.vz);
    if ((p.sliding || p.landT < 0.15) && hs > 1 && hs < 26) {
      const ns = hs + MOVE.bhopBoost * mv.slideBoost;
      p.vx *= ns / hs;
      p.vz *= ns / hs;
    }
    p.onGround = false;
    p.coyote = 0;
    p.jumpBuffer = 0;
    w.stats.jumps++;
    w.events.push(Ev.Jump, p.x, p.y, p.z, hs);
  }

  // ── clamp speed ──
  hs = Math.hypot(p.vx, p.vz);
  if (hs > MOVE.maxSpeed) {
    p.vx *= MOVE.maxSpeed / hs;
    p.vz *= MOVE.maxSpeed / hs;
    hs = MOVE.maxSpeed;
  }
  if (hs > w.stats.topSpeed) w.stats.topSpeed = hs;

  // ── horizontal integration with step/wall checks ──
  let nx = p.x + p.vx * DT;
  let nz = p.z + p.vz * DT;
  const wt = w.weather;
  if (wt.gustT > 0 || wt.blizzardT > 0) {
    // wind shoves you (more so in the air) without adding to your own momentum
    playerWind(w, p.x, p.z, wind);
    const k = (p.onGround ? 1 : 1.3) * DT;
    nx += wind[0] * k;
    nz += wind[1] * k;
  }
  const limit = p.y + MOVE.stepHeight;
  if (t.height(nx, nz) > limit) {
    if (t.height(nx, p.z) <= limit) {
      nz = p.z;
      p.vz = 0;
    } else if (t.height(p.x, nz) <= limit) {
      nx = p.x;
      p.vx = 0;
    } else {
      nx = p.x;
      nz = p.z;
      p.vx = 0;
      p.vz = 0;
    }
  }
  if (t.resolveColliders(nx, nz, PLAYER_RADIUS, push)) {
    // remove the velocity component pointing into the obstacle
    const cx = push[0] - nx;
    const cz = push[1] - nz;
    const cl = Math.hypot(cx, cz);
    if (cl > 1e-5) {
      const n0 = cx / cl;
      const n1 = cz / cl;
      const vn = p.vx * n0 + p.vz * n1;
      if (vn < 0) {
        p.vx -= vn * n0;
        p.vz -= vn * n1;
      }
    }
    // never let collider push you up a cliff
    if (t.height(push[0], push[1]) <= limit) {
      nx = push[0];
      nz = push[1];
    }
  }
  const half = t.half - 2;
  if (nx < -half || nx > half) {
    nx = clamp(nx, -half, half);
    p.vx = 0;
  }
  if (nz < -half || nz > half) {
    nz = clamp(nz, -half, half);
    p.vz = 0;
  }
  p.x = nx;
  p.z = nz;

  // ── vertical ──
  const g = MOVE.gravity;
  const groundY = t.height(p.x, p.z);
  if (p.onGround) {
    const predicted = p.y + p.vy * DT - 0.5 * g * DT * DT;
    if (groundY < predicted - 0.04 && p.y - groundY > 0.12) {
      // terrain fell away faster than gravity: we're airborne (ramp lips, cliff edges)
      p.onGround = false;
      p.y = predicted;
      p.vy -= g * DT;
    } else {
      p.vy = clamp((groundY - p.y) / DT, -20, 20);
      p.y = groundY;
    }
  } else {
    p.vy -= g * DT;
    p.y += p.vy * DT;
    if (p.y <= groundY) {
      const impact = -p.vy;
      p.y = groundY;
      p.vy = 0;
      p.onGround = true;
      p.landT = 0;
      if (impact > 4) w.events.push(Ev.Land, p.x, p.y, p.z, impact);
      if (impact > 7 && p.passive === HeroPassive.LandingBonk) landingBonk(w, impact);
    }
  }

  if (p.onGround) {
    if (p.sliding) {
      w.stats.slideTime += DT;
      w.stats.slideDistance += hs * DT;
    }
  } else w.stats.airTime += DT;

  if (hs > 0.5) p.yaw = Math.atan2(p.vx, p.vz);
  else if (inLen > 0.1) p.yaw = Math.atan2(ix, iz);
}
