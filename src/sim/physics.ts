import { approach, clamp, wrapAngle } from '../core/math';
import { RAMP_GLIDER, RAMP_NONE, type GroundModel, type SpawnPoint } from './ground';
import { Kart, RespawnState } from './kart';
import type { EventQueue } from './events';
import { TUNING } from './tuning';

export interface StepEnv {
  /** Gravity (already scaled by the course). */
  gravity: number;
  /** Rubber-band multiplier on top speed for this kart. */
  speedMul: number;
  /** False during the countdown. */
  canDrive: boolean;
  events: EventQueue;
}

const spawn: SpawnPoint = { x: 0, y: 0, z: 0, yaw: 0 };

/** Advance one kart by dt. Pure function of kart state + ground + input. */
export function stepKart(k: Kart, ground: GroundModel, env: StepEnv, dt: number): void {
  k.savePrev();
  tickTimers(k, dt);

  if (k.respawnState !== RespawnState.None) {
    stepRespawn(k, ground, env, dt);
    return;
  }

  const p = k.params;
  const inp = k.input;
  const ctl = k.controllable && env.canDrive;
  let steer = ctl ? clamp(inp.steer, -1, 1) : 0;
  const throttle = ctl ? clamp(inp.throttle, -1, 1) : 0;
  if (k.gooTime > 0) steer *= 0.6;
  const driftPressed = ctl && inp.drift && !k.prevDrift;
  k.prevDrift = inp.drift;

  const g = k.ground;
  let gravity = env.gravity;
  if (g.lowGrav) gravity *= TUNING.lowGravScale;
  if (g.water) gravity *= TUNING.waterGravity;

  const fx = Math.sin(k.yaw);
  const fz = Math.cos(k.yaw);
  let vf = k.vx * fx + k.vz * fz;
  let vl = k.vx * -fz + k.vz * fx;

  // ---- effective top speed
  let top = p.topSpeed * env.speedMul;
  if (k.offroad && k.boostTime <= 0) top *= p.offroadMul;
  if (k.gooTime > 0) top *= 0.72;
  if (g.water) top *= 0.95;
  if (k.boostTime > 0) top *= TUNING.boostSpeedMul;
  if (k.rocketTime > 0) top = p.topSpeed * 1.55;
  if (!env.canDrive) top = 0;

  if (k.grounded) {
    // ---- longitudinal
    if ((k.boostTime > 0 || k.rocketTime > 0) && env.canDrive) {
      if (vf < top) vf = Math.min(top, vf + TUNING.boostAccel * dt);
    } else if (throttle > 0.05) {
      if (vf < 0) vf += TUNING.brakeDecel * throttle * dt;
      else if (vf < top) vf = Math.min(top, vf + p.accel * Math.max(0.12, 1.08 - vf / Math.max(top, 1)) * throttle * dt);
    } else if (throttle < -0.05) {
      if (vf > 0.5) vf -= TUNING.brakeDecel * -throttle * dt;
      else vf = Math.max(vf - 12 * -throttle * dt, -TUNING.reverseSpeed);
    } else {
      vf = approach(vf, 0, TUNING.coastDecel * dt);
    }
    if (vf > top) vf = approach(vf, top, TUNING.overspeedDecay * (k.offroad ? 3 : 1) * dt);
    if (k.spinTime > 0 || k.tumbleTime > 0) vf *= Math.exp(-2.6 * dt);
    // gentle slope influence (uphill slows, downhill speeds up)
    vf += gravity * (k.nx * fx + k.nz * fz) * 0.3 * dt;

    // ---- steering
    const aspd = Math.abs(vf);
    if (k.drifting) {
      const t = (steer * k.driftDir + 1) * 0.5; // 0 = steering outward, 1 = steering into the drift
      k.yaw -= k.driftDir * p.turnRate * (0.3 + 1.0 * t) * Math.min(1, aspd / 10) * dt;
    } else {
      const lowSpeed = clamp(aspd / 7, 0, 1);
      const highSpeed = 1 - 0.18 * clamp((aspd - 0.6 * p.topSpeed) / (0.4 * p.topSpeed), 0, 1);
      const dir = vf < -0.5 ? -1 : 1;
      k.yaw -= steer * p.turnRate * lowSpeed * highSpeed * dir * dt;
    }
    if (k.spinTime > 0) k.yaw += 0; // visual spin handled by renderer; heading stays stable for fairness

    // ---- lateral grip
    let grip = k.drifting ? p.driftGrip : p.grip;
    if (k.offroad) grip *= 0.8;
    if (k.gooTime > 0) grip *= 0.65;
    if (k.spinTime > 0 || k.tumbleTime > 0) grip = 2.5;
    vl *= Math.exp(-grip * dt);

    // ---- drift state machine
    if (driftPressed && k.hopTime <= 0 && !k.drifting) {
      k.vy = TUNING.driftHopVel;
      k.grounded = false;
      k.hopTime = 0.32;
      k.hopSteer = steer > 0.25 ? 1 : steer < -0.25 ? -1 : 0;
      env.events.push({ type: 'hop', kart: k.index });
    }
    if (k.drifting) {
      if (!inp.drift || vf < 6 || !ctl) {
        releaseDrift(k, env);
      } else {
        const inward = Math.max(0, steer * k.driftDir);
        k.driftCharge += dt * (0.72 + 0.55 * inward) * (k.offroad ? 0.35 : 1);
        k.driftTime += dt;
        k.raceStats.driftTotal += dt;
        if (k.driftTime > k.raceStats.longestDrift) k.raceStats.longestDrift = k.driftTime;
        const tiers = TUNING.driftTiers;
        const tier = k.driftCharge >= tiers[2] ? 3 : k.driftCharge >= tiers[1] ? 2 : k.driftCharge >= tiers[0] ? 1 : 0;
        if (tier > k.driftTier) {
          k.driftTier = tier;
          env.events.push({ type: 'driftTier', kart: k.index, tier });
        }
      }
    }
  } else {
    // ---- airborne
    const airSteer = k.gliding ? TUNING.gliderSteer : TUNING.airSteer;
    k.yaw -= steer * p.turnRate * airSteer * dt;
    vl *= Math.exp(-1.2 * dt);
    if (k.gliding) {
      if (vf < p.topSpeed * 0.95) vf = Math.min(p.topSpeed * 0.95, vf + 6 * dt);
      const dive = throttle < -0.3 ? 2.2 : 1;
      k.vy = Math.max(k.vy - TUNING.gliderGravity * dive * dt, -TUNING.gliderMaxFall * dive);
    } else {
      k.vy -= gravity * dt;
      if (k.boostTime > 0 && vf < top) vf = Math.min(top, vf + TUNING.boostAccel * 0.5 * dt);
      vf *= Math.exp(-0.05 * dt);
    }
    if (g.water) {
      vf *= Math.pow(TUNING.waterDrag, dt);
    }
    // tricks: press drift shortly after launching off a ramp/bump
    if (k.trickWindow > 0 && driftPressed && !k.trickQueued && k.launched) {
      k.trickQueued = true;
      k.trickAnim = 0.55;
      env.events.push({ type: 'trick', kart: k.index });
    }
    // capture steer while hopping so a drift can start on landing
    if (k.hopTime > 0 && Math.abs(steer) > 0.25) k.hopSteer = steer > 0 ? 1 : -1;
    if (k.drifting && (!inp.drift || !ctl)) releaseDrift(k, env);
  }

  // ---- recompose velocity
  const rx = -fz;
  const rz = fx;
  // rotate into the new heading so grip acts relative to it next step
  k.vx = fx * vf + rx * vl;
  k.vz = fz * vf + rz * vl;
  k.speed = vf;
  k.slip = vl;
  k.yaw = wrapAngle(k.yaw);

  // ---- integrate + ground contact
  const nx = k.x + k.vx * dt;
  const nz = k.z + k.vz * dt;
  const hit = ground.query(nx, k.y, nz, k.hint, k.ground);
  let ny = k.y;
  const wasGrounded = k.grounded;

  if (k.grounded) {
    if (hit.hit && hit.height <= k.y + TUNING.stepUp && hit.height >= k.y - TUNING.snapDown - Math.max(0, -k.vy) * dt) {
      const groundVy = (hit.height - k.y) / dt;
      // crest detection: we were rising faster than the ground continues to rise → launch
      if (k.vy > 3 && k.vy - groundVy > 4.5) {
        becomeAirborne(k, env, hit.ramp);
        ny = k.y + k.vy * dt;
      } else {
        ny = hit.height;
        k.vy = groundVy * 0.5 + k.vy * 0.5;
        if (k.vy < 0 && groundVy >= 0) k.vy = groundVy;
      }
      k.onRamp = hit.ramp;
    } else if (hit.hit && hit.height > k.y + TUNING.stepUp) {
      // too tall to drive onto (platform side) — bounce back like a wall
      k.vx = -k.vx * 0.3;
      k.vz = -k.vz * 0.3;
      k.speed *= -0.3;
      env.events.push({ type: 'wall', kart: k.index, strength: 0.6 });
      k.ground.wallHit = false;
      k.x = k.px;
      k.z = k.pz;
      finishStep(k, ground, env, dt, wasGrounded);
      return;
    } else {
      becomeAirborne(k, env, k.onRamp);
      ny = k.y + k.vy * dt;
    }
  } else {
    ny = k.y + k.vy * dt;
    if (hit.hit && ny <= hit.height && hit.height <= k.y + TUNING.stepUp) {
      land(k, env, hit.height);
      ny = hit.height;
    }
  }
  k.x = nx;
  k.z = nz;
  k.y = ny;

  // ---- glider arming: passing over a glider ramp (even mid-hop) deploys the glider over the gap
  if (hit.ramp === RAMP_GLIDER) k.gliderArm = 1.2;
  else if (k.gliderArm > 0) k.gliderArm -= dt;
  if (!k.grounded && !k.gliding && k.gliderArm > 0 && (!hit.hit || k.y - hit.height > 1.5)) {
    k.gliding = true;
    k.launched = true;
    k.trickWindow = Math.max(k.trickWindow, 0.3);
    if (k.vy < 4) k.vy = 4;
    k.cancelDrift();
    env.events.push({ type: 'launch', kart: k.index, glider: true });
  }

  // ---- walls
  if (hit.wallHit) {
    k.x += hit.wallNx * hit.wallDepth;
    k.z += hit.wallNz * hit.wallDepth;
    const vn = k.vx * hit.wallNx + k.vz * hit.wallNz;
    if (vn < 0) {
      const sp = Math.hypot(k.vx, k.vz) || 1;
      k.vx -= (1 + TUNING.wallRestitution) * vn * hit.wallNx;
      k.vz -= (1 + TUNING.wallRestitution) * vn * hit.wallNz;
      const loss = 1 - 0.35 * clamp(-vn / sp, 0, 1);
      k.vx *= loss;
      k.vz *= loss;
      if (-vn > 3) {
        env.events.push({ type: 'wall', kart: k.index, strength: clamp(-vn / 15, 0, 1) });
        k.wobble = 0.3;
        if (-vn > 8 && k.drifting) releaseDrift(k, env, true);
      }
    }
  }

  finishStep(k, ground, env, dt, wasGrounded);
}

function finishStep(k: Kart, ground: GroundModel, env: StepEnv, dt: number, _wasGrounded: boolean): void {
  const hit = k.ground;
  // ---- surfaces
  if (k.grounded && hit.hit) {
    k.offroad = hit.surface === 'offroad';
    if (hit.surface === 'boost' && k.boostTime < TUNING.boostPadTime - 0.15) {
      k.startBoost(TUNING.boostPadTime);
      k.raceStats.boostPads++;
      env.events.push({ type: 'boostPad', kart: k.index });
    }
    k.lastGroundY = hit.height;
    k.airTime = 0;
    // smoothed normal for visuals + slope physics
    const a = 1 - Math.exp(-12 * dt);
    k.nx += (hit.nx - k.nx) * a;
    k.ny += (hit.ny - k.ny) * a;
    k.nz += (hit.nz - k.nz) * a;
  } else {
    k.airTime += dt;
    const a = 1 - Math.exp(-3 * dt);
    k.nx += (0 - k.nx) * a;
    k.ny += (1 - k.ny) * a;
    k.nz += (0 - k.nz) * a;
  }
  if (hit.hit && !k.grounded) k.voidTime = 0;
  else if (!k.grounded && (!k.gliding || Math.abs(hit.d) > hit.halfWidth + 30 || k.airTime > 7)) k.voidTime += dt;
  else k.voidTime = 0;

  // ---- falling out of the world → drone respawn
  if (!k.grounded && (k.y < ground.killY || k.y < k.lastGroundY - TUNING.fallDistance || k.voidTime > TUNING.maxVoidTime)) {
    beginRespawn(k, env);
  }
}

function becomeAirborne(k: Kart, env: StepEnv, ramp: number): void {
  k.grounded = false;
  if (k.vy > 4 || ramp !== RAMP_NONE) {
    k.launched = true;
    k.trickWindow = 0.5;
    k.trickQueued = false;
    if (ramp === RAMP_GLIDER) {
      k.gliding = true;
      k.vy = Math.max(k.vy, 7);
      k.cancelDrift();
    } else if (ramp !== RAMP_NONE) {
      k.vy = Math.max(k.vy, 8.5);
    }
    env.events.push({ type: 'launch', kart: k.index, glider: k.gliding });
  }
}

function land(k: Kart, env: StepEnv, h: number): void {
  const impact = -k.vy;
  k.grounded = true;
  k.y = h;
  const trick = k.trickQueued;
  if (trick) {
    k.startBoost(TUNING.trickBoostTime);
    k.raceStats.tricks++;
  }
  if (k.launched || impact > 6) env.events.push({ type: 'land', kart: k.index, impact, trick });
  if (impact > 7) k.wobble = 0.35;
  k.vy = 0;
  k.launched = false;
  k.trickQueued = false;
  k.trickWindow = 0;
  k.gliding = false;
  k.gliderArm = 0;
  // start a drift if the drift button is still held after a hop
  if (k.hopTime > 0 || k.hopSteer !== 0) {
    if (k.input.drift && k.hopSteer !== 0 && k.speed > TUNING.driftMinSpeed && k.controllable) {
      k.drifting = true;
      k.driftDir = k.hopSteer;
      k.driftCharge = 0;
      k.driftTier = 0;
      k.driftTime = 0;
    }
    k.hopTime = 0;
    k.hopSteer = 0;
  }
}

function releaseDrift(k: Kart, env: StepEnv, cancelled = false): void {
  const tier = cancelled ? 0 : k.driftTier;
  if (tier > 0) {
    k.startBoost(TUNING.miniTurboTime[tier] * k.params.miniTurboMul);
    k.raceStats.miniTurbos[tier - 1]++;
    env.events.push({ type: 'miniTurbo', kart: k.index, tier });
  }
  k.cancelDrift();
}

function tickTimers(k: Kart, dt: number): void {
  if (k.boostTime > 0) k.boostTime = Math.max(0, k.boostTime - dt);
  k.boostKick += dt;
  if (k.spinTime > 0) k.spinTime -= dt;
  if (k.tumbleTime > 0) k.tumbleTime -= dt;
  if (k.gooTime > 0) k.gooTime -= dt;
  if (k.shieldTime > 0) k.shieldTime -= dt;
  if (k.cloudTime > 0) k.cloudTime -= dt;
  if (k.rocketTime > 0) k.rocketTime -= dt;
  if (k.magnetTime > 0) k.magnetTime -= dt;
  if (k.invulnTime > 0) k.invulnTime -= dt;
  if (k.trickWindow > 0) k.trickWindow -= dt;
  if (k.trickAnim > 0) k.trickAnim -= dt;
  if (k.wobble > 0) k.wobble -= dt;
  if (k.hopTime > 0) k.hopTime -= dt;
  if ((k.spinTime > 0 || k.tumbleTime > 0) && k.drifting) k.cancelDrift();
}

export function beginRespawn(k: Kart, env: StepEnv): void {
  if (k.respawnState !== RespawnState.None) return;
  k.respawnState = RespawnState.Falling;
  k.respawnTimer = TUNING.respawnFallTime;
  k.raceStats.falls++;
  k.cancelDrift();
  k.gliding = false;
  k.boostTime = 0;
  env.events.push({ type: 'fall', kart: k.index });
}

function stepRespawn(k: Kart, ground: GroundModel, env: StepEnv, dt: number): void {
  k.respawnTimer -= dt;
  if (k.respawnState === RespawnState.Falling) {
    k.vy -= env.gravity * dt;
    k.vx *= Math.exp(-2 * dt);
    k.vz *= Math.exp(-2 * dt);
    k.x += k.vx * dt;
    k.y += k.vy * dt;
    k.z += k.vz * dt;
    if (k.respawnTimer <= 0) {
      ground.respawnAt(k.safeS, 0, spawn);
      k.place(spawn.x, spawn.y + 5, spawn.z, spawn.yaw);
      k.respawnGroundY = spawn.y;
      k.grounded = false;
      ground.resetHint(spawn.x, spawn.y, spawn.z, k.hint);
      ground.query(spawn.x, spawn.y + 1, spawn.z, k.hint, k.ground);
      k.respawnState = RespawnState.Carried;
      k.respawnTimer = TUNING.respawnCarryTime;
      env.events.push({ type: 'respawn', kart: k.index });
    }
  } else {
    // Drone lowers the kart gently onto the road.
    const t = clamp(k.respawnTimer / TUNING.respawnCarryTime, 0, 1);
    k.y = k.respawnGroundY + 0.6 + 4.4 * t * t;
    k.vx = k.vy = k.vz = 0;
    k.speed = 0;
    if (k.respawnTimer <= 0) {
      k.respawnState = RespawnState.None;
      k.invulnTime = 1.2;
      k.grounded = false;
      k.vy = -1;
      k.voidTime = 0;
      k.lastGroundY = k.respawnGroundY;
    }
  }
}
