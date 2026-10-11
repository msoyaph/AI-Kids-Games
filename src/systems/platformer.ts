import { clamp } from '../core/mathx';
import type { EntDef } from '../data/levelTypes';
import type { DiffTuning } from './difficulty';
import {
  isSolidTile, tileAt, TILE, T_GEYSER, T_GOO, T_ICE, T_PAD, T_PLATFORM,
  type LevelEnt, type LevelModel,
} from './level';

/**
 * Side-scrolling exploration physics. Pure logic: a level model plus a player, push blocks,
 * doors, pressure plates, power orbs, machines, color crystals and friendly bumblers.
 */

export interface PlatCfg {
  gravity: number;
  jumpV: number;
  walk: number;
  accelGround: number;
  accelAir: number;
  iceAccel: number;
  hoverTime: number;
  hoverFall: number;
  coyote: number;
  buffer: number;
  maxFall: number;
  padV: number;
  gooV: number;
  geyserV: number;
  pw: number;
  ph: number;
  rover: boolean;
}

/** Gameplay gravity factor from real surface gravity (keeps tiny moons playable). */
export function gameGravity(gravityG: number): number {
  return clamp(0.35 + 0.65 * Math.sqrt(Math.max(0, gravityG)), 0.38, 1);
}

/** Jump height in tiles for a world: lower gravity, higher jumps (but never silly). */
export function jumpHeightTiles(gravityG: number): number {
  return 2.7 / Math.sqrt(gameGravity(gravityG));
}

export function platCfg(gravityG: number, avatar: 'astronaut' | 'rover', d: DiffTuning): PlatCfg {
  const gg = gameGravity(gravityG);
  const gravity = 2400 * gg;
  const H = jumpHeightTiles(gravityG) * TILE + 6;
  const jumpV = Math.sqrt(2 * gravity * H);
  const rover = avatar === 'rover';
  return {
    gravity,
    jumpV,
    walk: rover ? 330 : 300,
    accelGround: 2600,
    accelAir: 1700,
    iceAccel: 520,
    hoverTime: rover ? 0 : d.hover,
    hoverFall: 70,
    coyote: d.coyote,
    buffer: 0.14,
    maxFall: 1100,
    padV: Math.sqrt(2 * gravity * (H * 1.9)),
    gooV: Math.sqrt(2 * gravity * (H * 1.25)),
    geyserV: Math.sqrt(2 * gravity * (H * 2.2)),
    pw: rover ? 76 : 34,
    ph: rover ? 52 : 74,
    rover,
  };
}

export interface PPlayer {
  x: number;
  y: number;
  vx: number;
  vy: number;
  px: number;
  py: number;
  onGround: boolean;
  onIce: boolean;
  coyote: number;
  buffer: number;
  hoverLeft: number;
  hovering: boolean;
  facing: 1 | -1;
  carry: number;
  bumpT: number;
  airTime: number;
  pushing: boolean;
}

export interface PBlock { x: number; y: number; vy: number; px: number; py: number; sx: number; sy: number }
export interface PDoor { ent: LevelEnt; id: string; open: string[]; amount: number; latched: boolean; x: number; y: number; h: number }
export interface PPlate { ent: LevelEnt; id: string; heavy: boolean; pressed: boolean; x: number; y: number }
export interface PMachine { ent: LevelEnt; id: string; needs: number; have: number; powered: boolean; puzzle: string; x: number; y: number }
export interface PCrystal { ent: LevelEnt; group: string; color: number; x: number; y: number; bumpT: number }
export interface POrb { x: number; y: number; vy: number; px: number; py: number; sx: number; sy: number; carried: boolean; used: boolean }
export interface PBumbler { x: number; y: number; vx: number; px: number; minX: number; maxX: number; squish: number }
export type PickupKind = 'coin' | 'sticker' | 'sample' | 'item';
export interface PPickup { ent: LevelEnt; kind: PickupKind; x: number; y: number; taken: boolean }
export interface PNpc { ent: LevelEnt; x: number; y: number; hidden: boolean }
export interface PGoal { ent: LevelEnt; x: number; y: number; reached: boolean }

export interface PlatWorld {
  model: LevelModel;
  cfg: PlatCfg;
  blocks: PBlock[];
  doors: PDoor[];
  plates: PPlate[];
  machines: PMachine[];
  crystals: PCrystal[];
  orbs: POrb[];
  bumblers: PBumbler[];
  pickups: PPickup[];
  npcs: PNpc[];
  goals: PGoal[];
  signs: Array<{ ent: LevelEnt; x: number; y: number }>;
  /** Switches currently on (pressed plates, powered machines, solved crystal groups). */
  active: Set<string>;
  solvedGroups: Set<string>;
  time: number;
  exitX: number;
  exitY: number;
}

export interface PlatEvents {
  picked: PPickup[];
  jumped: boolean;
  landed: boolean;
  bumped: boolean;
  bounced: boolean;
  solved: string[];
  opened: string[];
  pushing: boolean;
  goals: PGoal[];
  delivered: boolean;
  crystal: boolean;
}

export function makePlatEvents(): PlatEvents {
  return { picked: [], jumped: false, landed: false, bumped: false, bounced: false, solved: [], opened: [], pushing: false, goals: [], delivered: false, crystal: false };
}

export function resetPlatEvents(e: PlatEvents): void {
  e.picked.length = 0;
  e.jumped = false;
  e.landed = false;
  e.bumped = false;
  e.bounced = false;
  e.solved.length = 0;
  e.opened.length = 0;
  e.pushing = false;
  e.goals.length = 0;
  e.delivered = false;
  e.crystal = false;
}

/**
 * Build the playable world from a level. `include` decides which conditional entities are
 * present (missions/flags), `taken` lists one-time pickups already collected.
 */
export function buildPlatWorld(model: LevelModel, cfg: PlatCfg, include: (e: LevelEnt) => boolean, taken: (key: string) => boolean): PlatWorld {
  const w: PlatWorld = {
    model, cfg, blocks: [], doors: [], plates: [], machines: [], crystals: [], orbs: [], bumblers: [], pickups: [], npcs: [], goals: [], signs: [],
    active: new Set(), solvedGroups: new Set(), time: 0,
    exitX: model.startX * TILE + TILE / 2, exitY: (model.startY + 1) * TILE,
  };
  for (const e of model.ents) {
    if (!include(e)) continue;
    const cx = e.tx * TILE + TILE / 2;
    const by = (e.ty + 1) * TILE;
    const d = e.def as EntDef | null;
    switch (e.kind) {
      case 'coin':
      case 'sticker':
        if (!taken(e.key)) w.pickups.push({ ent: e, kind: e.kind, x: cx, y: by - TILE / 2, taken: false });
        break;
      case 'sample':
      case 'item':
        if (!taken(e.key)) w.pickups.push({ ent: e, kind: e.kind, x: cx, y: by - TILE / 2, taken: false });
        break;
      case 'block':
        w.blocks.push({ x: e.tx * TILE, y: e.ty * TILE, vy: 0, px: e.tx * TILE, py: e.ty * TILE, sx: e.tx * TILE, sy: e.ty * TILE });
        break;
      case 'orb':
        w.orbs.push({ x: cx, y: by - 20, vy: 0, px: cx, py: by - 20, sx: cx, sy: by - 20, carried: false, used: false });
        break;
      case 'bumbler':
        w.bumblers.push({ x: cx, y: by, vx: 70, px: cx, minX: e.tx, maxX: e.tx, squish: 0 });
        break;
      case 'door':
        if (d?.kind === 'door') w.doors.push({ ent: e, id: d.id, open: d.open, amount: 0, latched: false, x: e.tx * TILE, y: e.ty * TILE, h: e.h * TILE });
        break;
      case 'plate':
        if (d?.kind === 'plate') w.plates.push({ ent: e, id: d.id, heavy: !!d.heavy, pressed: false, x: e.tx * TILE, y: by });
        break;
      case 'machine':
        if (d?.kind === 'machine') w.machines.push({ ent: e, id: d.id, needs: d.needs, have: 0, powered: false, puzzle: d.puzzle, x: cx, y: by });
        break;
      case 'crystal':
        if (d?.kind === 'crystal') w.crystals.push({ ent: e, group: d.group, color: d.start ?? 0, x: cx, y: by, bumpT: 0 });
        break;
      case 'npc':
        w.npcs.push({ ent: e, x: cx, y: by, hidden: false });
        break;
      case 'goal':
        w.goals.push({ ent: e, x: cx, y: by, reached: false });
        break;
      case 'sign':
      case 'panel':
        w.signs.push({ ent: e, x: cx, y: by });
        break;
      default:
        break;
    }
  }
  w.crystals.sort((a, b) => a.x - b.x);
  // Bumblers patrol until a wall, a closed door or a ledge.
  for (const b of w.bumblers) {
    const tx = b.minX;
    const ty = Math.floor(b.y / TILE) - 1;
    let minX = tx;
    let maxX = tx;
    while (minX > 0 && !solidAt(w, minX - 1, ty) && isSolidTile(tileAt(model, minX - 1, ty + 1))) minX--;
    while (maxX < model.w - 1 && !solidAt(w, maxX + 1, ty) && isSolidTile(tileAt(model, maxX + 1, ty + 1))) maxX++;
    b.minX = minX * TILE + 24;
    b.maxX = (maxX + 1) * TILE - 24;
  }
  return w;
}

export function makePlayer(w: PlatWorld): PPlayer {
  const x = w.exitX - w.cfg.pw / 2 + 40;
  const y = w.exitY - w.cfg.ph;
  return { x, y, vx: 0, vy: 0, px: x, py: y, onGround: false, onIce: false, coyote: 0, buffer: 0, hoverLeft: w.cfg.hoverTime, hovering: false, facing: 1, carry: -1, bumpT: 0, airTime: 0, pushing: false };
}

// ------------------------------------------------------------------ collision helpers

function doorSolidAt(w: PlatWorld, tx: number, ty: number): boolean {
  for (let i = 0; i < w.doors.length; i++) {
    const d = w.doors[i];
    if (d.amount >= 0.95) continue;
    const dtx = d.x / TILE;
    const dty = d.y / TILE;
    if (tx === dtx && ty >= dty && ty < dty + d.h / TILE) return true;
  }
  return false;
}

/** Solid for movement (tiles + closed doors). */
export function solidAt(w: PlatWorld, tx: number, ty: number): boolean {
  return isSolidTile(tileAt(w.model, tx, ty)) || doorSolidAt(w, tx, ty);
}

function overlapsSolid(w: PlatWorld, x: number, y: number, bw: number, bh: number): boolean {
  const tx0 = Math.floor(x / TILE);
  const tx1 = Math.floor((x + bw - 0.01) / TILE);
  const ty0 = Math.floor(y / TILE);
  const ty1 = Math.floor((y + bh - 0.01) / TILE);
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) if (solidAt(w, tx, ty)) return true;
  return false;
}

function blockAt(w: PlatWorld, x: number, y: number, bw: number, bh: number, skip: PBlock | null): PBlock | null {
  for (let i = 0; i < w.blocks.length; i++) {
    const b = w.blocks[i];
    if (b === skip) continue;
    if (x < b.x + TILE && x + bw > b.x && y < b.y + TILE && y + bh > b.y) return b;
  }
  return null;
}

/** Try to move a block sideways. Returns how far it actually moved. */
function pushBlock(w: PlatWorld, b: PBlock, dx: number): number {
  const nx = b.x + dx;
  if (overlapsSolid(w, nx, b.y, TILE, TILE) || blockAt(w, nx, b.y, TILE, TILE, b)) return 0;
  // Something sitting on top of this block? Don't push stacks.
  b.x = nx;
  return dx;
}

// ------------------------------------------------------------------ step

export interface PlatInput {
  x: number;
  jump: boolean;
  jumpPressed: boolean;
}

export function stepPlatformer(w: PlatWorld, p: PPlayer, input: PlatInput, dt: number, ev: PlatEvents): void {
  const cfg = w.cfg;
  w.time += dt;
  p.px = p.x;
  p.py = p.y;
  p.bumpT = Math.max(0, p.bumpT - dt);

  // Horizontal.
  const ix = p.bumpT > 0.4 ? 0 : clamp(input.x, -1, 1);
  if (ix > 0.1) p.facing = 1;
  else if (ix < -0.1) p.facing = -1;
  const accel = p.onGround ? (p.onIce ? cfg.iceAccel : cfg.accelGround) : cfg.accelAir;
  const target = ix * cfg.walk;
  const diff = target - p.vx;
  const step = accel * dt;
  p.vx += Math.abs(diff) <= step ? diff : Math.sign(diff) * step;

  // Jump (with coyote time and a small input buffer).
  if (input.jumpPressed) p.buffer = cfg.buffer;
  else p.buffer = Math.max(0, p.buffer - dt);
  p.coyote = p.onGround ? cfg.coyote : Math.max(0, p.coyote - dt);
  if (p.buffer > 0 && p.coyote > 0) {
    p.vy = -cfg.jumpV;
    p.buffer = 0;
    p.coyote = 0;
    p.onGround = false;
    ev.jumped = true;
  }

  // Gravity + jetpack hover.
  p.vy += cfg.gravity * dt;
  p.hovering = false;
  if (!p.onGround && input.jump && p.vy > 0 && p.hoverLeft > 0) {
    p.vy = Math.min(p.vy, cfg.hoverFall);
    p.hoverLeft -= dt;
    p.hovering = true;
  }
  if (p.vy > cfg.maxFall) p.vy = cfg.maxFall;

  // Geysers: jets above vents push you up while they puff.
  const ptx0 = Math.floor(p.x / TILE);
  const ptx1 = Math.floor((p.x + cfg.pw) / TILE);
  for (let tx = ptx0; tx <= ptx1; tx++) {
    for (let k = 1; k <= 6; k++) {
      const ty = Math.floor((p.y + cfg.ph) / TILE) + k - 1;
      if (tileAt(w.model, tx, ty) === T_GEYSER && geyserOn(w, tx)) {
        const ventTop = ty * TILE;
        if (ventTop - (p.y + cfg.ph) < TILE * 5.5 && p.vy > -cfg.geyserV * 0.8) {
          p.vy = -cfg.geyserV;
          p.hoverLeft = cfg.hoverTime;
          ev.bounced = true;
        }
        break;
      }
    }
  }

  // Move X (with block pushing).
  p.pushing = false;
  let dx = p.vx * dt;
  if (dx !== 0) {
    const nx = p.x + dx;
    const blk = blockAt(w, nx, p.y + 2, cfg.pw, cfg.ph - 4, null);
    if (blk && p.onGround) {
      const want = dx > 0 ? nx + cfg.pw - blk.x : nx - (blk.x + TILE);
      const moved = pushBlock(w, blk, want * 0.6);
      if (moved !== 0) {
        p.pushing = true;
        ev.pushing = true;
      }
      // Stop at the block's edge.
      p.x = dx > 0 ? blk.x - cfg.pw : blk.x + TILE;
      p.vx *= 0.5;
      dx = 0;
    } else if (blk) {
      p.x = dx > 0 ? blk.x - cfg.pw : blk.x + TILE;
      p.vx = 0;
      dx = 0;
    } else {
      p.x = nx;
    }
    if (overlapsSolid(w, p.x, p.y, cfg.pw, cfg.ph)) {
      if (dx > 0) p.x = Math.floor((p.x + cfg.pw) / TILE) * TILE - cfg.pw - 0.01;
      else if (dx < 0) p.x = Math.floor(p.x / TILE + 1) * TILE + 0.01;
      // Safety: if still stuck, undo.
      if (overlapsSolid(w, p.x, p.y, cfg.pw, cfg.ph)) p.x = p.px;
      p.vx = 0;
    }
  }

  // Move Y.
  const wasGround = p.onGround;
  p.onGround = false;
  p.onIce = false;
  const dy = p.vy * dt;
  const prevBottom = p.y + cfg.ph;
  p.y += dy;
  if (dy > 0) {
    const bottom = p.y + cfg.ph;
    const ty = Math.floor(bottom / TILE);
    const tx0 = Math.floor((p.x + 2) / TILE);
    const tx1 = Math.floor((p.x + cfg.pw - 2) / TILE);
    let landY = Infinity;
    let landTile = -1;
    for (let tx = tx0; tx <= tx1; tx++) {
      const t = tileAt(w.model, tx, ty);
      const top = ty * TILE;
      if (solidAt(w, tx, ty) || (t === T_PLATFORM && prevBottom <= top + 1)) {
        if (top < landY) {
          landY = top;
          landTile = t;
        }
      }
    }
    const blk = blockAt(w, p.x + 2, bottom - 1, cfg.pw - 4, 2, null);
    if (blk && prevBottom <= blk.y + 1 && blk.y < landY) {
      landY = blk.y;
      landTile = -2;
    }
    if (landY !== Infinity) {
      p.y = landY - cfg.ph;
      if (landTile === T_PAD) {
        p.vy = -cfg.padV;
        ev.bounced = true;
      } else {
        if (!wasGround && p.airTime > 0.15) ev.landed = true;
        p.vy = 0;
        p.onGround = true;
        p.onIce = landTile === T_ICE;
        p.hoverLeft = cfg.hoverTime;
      }
    }
  } else if (dy < 0) {
    if (overlapsSolid(w, p.x + 2, p.y, cfg.pw - 4, 2)) {
      p.y = Math.floor(p.y / TILE + 1) * TILE + 0.01;
      p.vy = 0;
    }
    const blk = blockAt(w, p.x + 2, p.y, cfg.pw - 4, 2, null);
    if (blk) {
      p.y = blk.y + TILE + 0.01;
      p.vy = 0;
    }
  }
  if (!p.onGround && dy >= 0 && p.vy === 0) {
    // Standing still exactly on ground (no movement this frame): probe.
    if (overlapsSolid(w, p.x + 2, p.y + cfg.ph, cfg.pw - 4, 1)) {
      p.onGround = true;
      p.hoverLeft = cfg.hoverTime;
    }
  }
  p.airTime = p.onGround ? 0 : p.airTime + dt;

  // Goo: bouncy surface.
  const feetTx = Math.floor((p.x + cfg.pw / 2) / TILE);
  const feetTy = Math.floor((p.y + cfg.ph - 4) / TILE);
  if (tileAt(w.model, feetTx, feetTy) === T_GOO && p.vy >= 0) {
    p.vy = -cfg.gooV;
    p.hoverLeft = cfg.hoverTime;
    ev.bounced = true;
  }

  // Never leave the level sideways.
  p.x = clamp(p.x, 1, w.model.w * TILE - cfg.pw - 1);

  stepBlocks(w, dt);
  stepOrbs(w, p, dt);
  stepBumblers(w, p, dt, ev);
  stepSwitches(w, p, dt, ev);
  stepPickups(w, p, ev);
}

export function geyserOn(w: PlatWorld, tx: number): boolean {
  return (w.time + tx * 0.37) % 3.2 < 1.3;
}

/** Does something falling from `prevBottom` to `bottom` land on a thin platform? */
function landsOnPlatform(w: PlatWorld, x: number, width: number, prevBottom: number, bottom: number): number | null {
  const ty = Math.floor(bottom / TILE);
  const top = ty * TILE;
  if (prevBottom > top + 1) return null;
  for (let tx = Math.floor((x + 2) / TILE); tx <= Math.floor((x + width - 2) / TILE); tx++) {
    if (tileAt(w.model, tx, ty) === T_PLATFORM) return top;
  }
  return null;
}

function stepBlocks(w: PlatWorld, dt: number): void {
  for (const b of w.blocks) {
    b.px = b.x;
    b.py = b.y;
    b.vy = Math.min(b.vy + w.cfg.gravity * dt, 900);
    const ny = b.y + b.vy * dt;
    const plat = b.vy > 0 ? landsOnPlatform(w, b.x, TILE, b.y + TILE, ny + TILE) : null;
    if (plat !== null) {
      b.y = plat - TILE;
      b.vy = 0;
      continue;
    }
    if (overlapsSolid(w, b.x + 1, ny, TILE - 2, TILE) || blockAt(w, b.x + 1, ny, TILE - 2, TILE, b)) {
      // Land on the tile/block below (snap to grid row).
      b.y = Math.floor((ny + TILE) / TILE) * TILE - TILE;
      if (overlapsSolid(w, b.x + 1, b.y, TILE - 2, TILE)) b.y = b.py;
      b.vy = 0;
    } else b.y = ny;
  }
}

function stepOrbs(w: PlatWorld, p: PPlayer, dt: number): void {
  for (let i = 0; i < w.orbs.length; i++) {
    const o = w.orbs[i];
    o.px = o.x;
    o.py = o.y;
    if (o.used) continue;
    if (o.carried) {
      o.x = p.x + w.cfg.pw / 2;
      o.y = p.y - 26;
      o.vy = 0;
      continue;
    }
    o.vy = Math.min(o.vy + w.cfg.gravity * dt, 800);
    const ny = o.y + o.vy * dt;
    const plat = o.vy > 0 ? landsOnPlatform(w, o.x - 16, 32, o.y + 20, ny + 20) : null;
    if (plat !== null) {
      o.y = plat - 20;
      o.vy = 0;
      continue;
    }
    if (overlapsSolid(w, o.x - 16, ny - 16, 32, 36)) {
      o.vy = 0;
    } else o.y = ny;
  }
}

function stepBumblers(w: PlatWorld, p: PPlayer, dt: number, ev: PlatEvents): void {
  const cfg = w.cfg;
  for (const b of w.bumblers) {
    b.px = b.x;
    b.x += b.vx * dt;
    if (b.x < b.minX) {
      b.x = b.minX;
      b.vx = Math.abs(b.vx);
    } else if (b.x > b.maxX) {
      b.x = b.maxX;
      b.vx = -Math.abs(b.vx);
    }
    b.squish = Math.max(0, b.squish - dt);
    // Touch: a soft boing that pushes you away. No damage.
    const cx = p.x + cfg.pw / 2;
    const cy = p.y + cfg.ph / 2;
    if (p.bumpT <= 0 && Math.abs(cx - b.x) < 26 + cfg.pw / 2 && Math.abs(cy - (b.y - 22)) < 22 + cfg.ph / 2) {
      const dir = cx < b.x ? -1 : 1;
      p.vx = dir * 520;
      p.vy = -Math.min(cfg.jumpV * 0.7, 560);
      p.bumpT = 0.8;
      b.squish = 0.3;
      b.vx = -dir * Math.abs(b.vx);
      ev.bumped = true;
    }
  }
}

function stepSwitches(w: PlatWorld, p: PPlayer, dt: number, ev: PlatEvents): void {
  const cfg = w.cfg;
  // Plates.
  for (const pl of w.plates) {
    let pressed = false;
    for (const b of w.blocks) {
      if (b.x + TILE > pl.x + 8 && b.x < pl.x + TILE - 8 && Math.abs(b.y + TILE - pl.y) < 6) pressed = true;
    }
    if (!pl.heavy && p.onGround && p.x + cfg.pw > pl.x + 6 && p.x < pl.x + TILE - 6 && Math.abs(p.y + cfg.ph - pl.y) < 6) pressed = true;
    pl.pressed = pressed;
    if (pressed) w.active.add(pl.id);
    else w.active.delete(pl.id);
  }
  // Doors open when all their switches are on, then stay open.
  for (const d of w.doors) {
    if (!d.latched) {
      let ok = d.open.length > 0;
      for (const id of d.open) if (!w.active.has(id) && !w.solvedGroups.has(id)) ok = false;
      if (ok) {
        d.latched = true;
        ev.opened.push(d.id);
      }
    }
    if (d.latched && d.amount < 1) d.amount = Math.min(1, d.amount + dt * 1.6);
  }
  for (const c of w.crystals) c.bumpT = Math.max(0, c.bumpT - dt);
}

function stepPickups(w: PlatWorld, p: PPlayer, ev: PlatEvents): void {
  const cfg = w.cfg;
  const cx = p.x + cfg.pw / 2;
  const cy = p.y + cfg.ph / 2;
  for (const it of w.pickups) {
    if (it.taken) continue;
    if (Math.abs(cx - it.x) < cfg.pw / 2 + 20 && Math.abs(cy - it.y) < cfg.ph / 2 + 20) {
      it.taken = true;
      ev.picked.push(it);
    }
  }
  for (const g of w.goals) {
    if (g.reached) continue;
    if (Math.abs(cx - g.x) < cfg.pw / 2 + 30 && Math.abs(p.y + cfg.ph - g.y) < TILE * 1.5) {
      g.reached = true;
      ev.goals.push(g);
    }
  }
}

// ------------------------------------------------------------------ interactions (Action button)

export type InteractKind = 'talk' | 'pickOrb' | 'dropOrb' | 'deliver' | 'crystal' | 'exit' | 'sign';

export interface Interaction {
  kind: InteractKind;
  index: number;
  x: number;
  y: number;
}

/** What the Action button would do right now (nearest thing in reach), or null. */
export function findInteraction(w: PlatWorld, p: PPlayer, out: Interaction): Interaction | null {
  const cfg = w.cfg;
  const cx = p.x + cfg.pw / 2;
  const feet = p.y + cfg.ph;
  let best = Infinity;
  let found = false;
  const consider = (kind: InteractKind, index: number, x: number, y: number, range: number) => {
    const d = Math.abs(cx - x) + Math.abs(feet - y) * 0.5;
    if (d < range && d < best) {
      best = d;
      out.kind = kind;
      out.index = index;
      out.x = x;
      out.y = y;
      found = true;
    }
  };
  for (let i = 0; i < w.npcs.length; i++) if (!w.npcs[i].hidden) consider('talk', i, w.npcs[i].x, w.npcs[i].y, 90);
  if (p.carry >= 0) {
    for (let i = 0; i < w.machines.length; i++) if (!w.machines[i].powered) consider('deliver', i, w.machines[i].x, w.machines[i].y, 110);
  } else {
    for (let i = 0; i < w.orbs.length; i++) {
      const o = w.orbs[i];
      if (!o.used && !o.carried) consider('pickOrb', i, o.x, o.y + 16, 80);
    }
  }
  for (let i = 0; i < w.crystals.length; i++) {
    const c = w.crystals[i];
    if (!w.solvedGroups.has(c.group)) consider('crystal', i, c.x, c.y, 75);
  }
  for (let i = 0; i < w.signs.length; i++) consider('sign', i, w.signs[i].x, w.signs[i].y, 70);
  consider('exit', 0, w.exitX, w.exitY, 100);
  if (!found && p.carry >= 0) {
    out.kind = 'dropOrb';
    out.index = p.carry;
    out.x = cx;
    out.y = feet;
    found = true;
  }
  return found ? out : null;
}

/** Apply an interaction that the physics world handles itself. Returns true if handled. */
export function doInteraction(w: PlatWorld, p: PPlayer, it: Interaction, ev: PlatEvents): boolean {
  switch (it.kind) {
    case 'pickOrb': {
      const o = w.orbs[it.index];
      o.carried = true;
      p.carry = it.index;
      return true;
    }
    case 'dropOrb': {
      const o = w.orbs[p.carry];
      if (o) {
        o.carried = false;
        o.x = p.x + w.cfg.pw / 2 + p.facing * 30;
        o.y = p.y + w.cfg.ph - 30;
      }
      p.carry = -1;
      return true;
    }
    case 'deliver': {
      const m = w.machines[it.index];
      const o = w.orbs[p.carry];
      if (o) {
        o.carried = false;
        o.used = true;
      }
      p.carry = -1;
      m.have++;
      ev.delivered = true;
      if (m.have >= m.needs && !m.powered) {
        m.powered = true;
        w.active.add(m.id);
        ev.solved.push(m.puzzle);
      }
      return true;
    }
    case 'crystal': {
      const c = w.crystals[it.index];
      c.color = (c.color + 1) % 3;
      c.bumpT = 0.25;
      ev.crystal = true;
      checkGroup(w, c.group, ev);
      return true;
    }
    default:
      return false;
  }
}

function checkGroup(w: PlatWorld, group: string, ev: PlatEvents): void {
  const def = w.model.def.groups?.[group];
  if (!def || w.solvedGroups.has(group)) return;
  const list = w.crystals.filter((c) => c.group === group);
  if (list.length !== def.target.length) return;
  for (let i = 0; i < list.length; i++) if (list[i].color !== def.target[i]) return;
  w.solvedGroups.add(group);
  w.active.add(group);
  ev.solved.push(def.puzzle);
}

/** Restore puzzles solved on an earlier visit (machines stay powered, crystals stay matched, doors stay open). */
export function restoreSolved(w: PlatWorld, isSolved: (puzzle: string) => boolean, doorOpen: (id: string) => boolean): void {
  for (const m of w.machines) {
    if (isSolved(m.puzzle)) {
      m.powered = true;
      m.have = m.needs;
      w.active.add(m.id);
      // The orbs it used are gone.
      let used = 0;
      for (const o of w.orbs) {
        if (used >= m.needs) break;
        if (!o.used) {
          o.used = true;
          used++;
        }
      }
    }
  }
  for (const [gid, g] of Object.entries(w.model.def.groups ?? {})) {
    if (!isSolved(g.puzzle)) continue;
    w.solvedGroups.add(gid);
    w.active.add(gid);
    const list = w.crystals.filter((c) => c.group === gid);
    list.forEach((c, i) => (c.color = g.target[i] ?? c.color));
  }
  for (const d of w.doors) {
    if (doorOpen(d.id)) {
      d.latched = true;
      d.amount = 1;
    }
  }
}

/** Put blocks and orbs back where they started (pause menu "Reset puzzle"). */
export function resetPuzzle(w: PlatWorld, p: PPlayer): void {
  for (const b of w.blocks) {
    b.x = b.px = b.sx;
    b.y = b.py = b.sy;
    b.vy = 0;
  }
  for (const o of w.orbs) {
    if (o.used) continue;
    o.carried = false;
    o.x = o.px = o.sx;
    o.y = o.py = o.sy;
    o.vy = 0;
  }
  p.carry = -1;
}

/** Is the player standing on the given tile type? */
export function standingOn(w: PlatWorld, p: PPlayer, tileType: number): boolean {
  const tx = Math.floor((p.x + w.cfg.pw / 2) / TILE);
  const ty = Math.floor((p.y + w.cfg.ph + 2) / TILE);
  return tileAt(w.model, tx, ty) === tileType;
}

export { T_GOO, T_ICE, T_PAD, T_PLATFORM };
