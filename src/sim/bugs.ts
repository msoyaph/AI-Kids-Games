// Bug catching: bugs live in habitats near the player. Approach quietly (hold the action
// button with the net to sneak), then release to swing. Running or getting too close spooks them.
import { Rng, hashInts } from '../core/rng';
import { BUGS, BUG_BY_ID } from '../data/registry';
import type { BugDef, BugHabitat } from '../data/types';
import { Ground, LEVEL_HEIGHT } from '../world/types';
import { hourInWindow } from './clock';
import type { Game, InteractCtx, Interaction } from './game';
import { give, markSeen, roomFor, stat } from './inventory';
import { RARITY_WEIGHT } from './fishing';
import { facingVec } from './player';
import { wearTool } from './tools';
import { weatherOk } from './weather';

export interface Bug {
  id: number;
  bug: string;
  habitat: BugHabitat;
  x: number;
  y: number;
  z: number;
  /** anchor (tile index) for perched bugs */
  tile: number;
  alert: number;
  state: 'idle' | 'flee' | 'gone';
  vx: number;
  vz: number;
  vy: number;
  t: number;
  phase: number;
  life: number;
}

export interface BugRuntime {
  bugs: Bug[];
  nextId: number;
  spawnT: number;
  rng: Rng;
  /** net raised (sneaking) */
  ready: boolean;
  readyT: number;
}

const MAX_BUGS = 9;
const SPAWN_R = 18;
const FLYERS = new Set<BugHabitat>(['air', 'flowers', 'water']);

export function bugRT(g: Game): BugRuntime {
  let r = g.runtime.bugs as BugRuntime | undefined;
  if (!r) {
    r = { bugs: [], nextId: 1, spawnT: 0, rng: new Rng(hashInts(g.state.seed, g.state.clock.day, 99)), ready: false, readyT: 0 };
    g.runtime.bugs = r;
  }
  return r;
}

export function availableBugs(g: Game, habitat: BugHabitat): BugDef[] {
  const h = Math.floor(g.state.clock.minute / 60);
  const w = g.state.weather.today;
  return BUGS.filter((b) => {
    if (b.habitat !== habitat) return false;
    if (!hourInWindow(h, b.hours[0], b.hours[1]) || !weatherOk(b.weather, w)) return false;
    // most flying bugs shelter from the rain unless they love it
    if (w === 'rain' && FLYERS.has(b.habitat) && b.weather !== 'rain' && b.habitat !== 'water') return false;
    return true;
  });
}

function habitatCandidates(g: Game, rt: BugRuntime, habitat: BugHabitat): number | null {
  const p = g.state.player;
  const w = g.world;
  for (let tries = 0; tries < 30; tries++) {
    const x = Math.floor(p.x + rt.rng.range(-SPAWN_R, SPAWN_R));
    const z = Math.floor(p.z + rt.rng.range(-SPAWN_R * 0.8, SPAWN_R * 0.55));
    if (!w.inb(x, z)) continue;
    const i = w.idx(x, z);
    if (Math.hypot(x + 0.5 - p.x, z + 0.5 - p.z) < 5) continue;
    const o = w.obj(i);
    const gr = w.ground(i);
    switch (habitat) {
      case 'flowers':
        if (o?.k === 'flower' && (o.g ?? 3) >= 2) return i;
        break;
      case 'trees':
        if (o && (o.k === 'tree' || o.k === 'pine' || o.k === 'palm')) return i;
        break;
      case 'fruit':
        if (o?.k === 'fruitTree' || (o?.k === 'item' && o.item?.startsWith('fruit_'))) return i;
        break;
      case 'rocks':
        if (o?.k === 'rock') return i;
        break;
      case 'ground':
        if (!o && gr === Ground.Grass && !w.structure(i)) return i;
        break;
      case 'beach':
        if (!o && gr === Ground.Sand && !w.structure(i)) return i;
        break;
      case 'water':
        if ((gr === Ground.Pond || gr === Ground.River) && w.isWater(i)) return i;
        break;
      case 'air':
        if (!w.isWater(i) && gr !== Ground.Ocean) return i;
        break;
    }
  }
  return null;
}

const HABITATS: BugHabitat[] = ['flowers', 'air', 'trees', 'ground', 'rocks', 'beach', 'water', 'fruit'];
const HABITAT_W: Record<BugHabitat, number> = { flowers: 3, air: 3, trees: 3, ground: 2.5, rocks: 1.2, beach: 1.2, water: 1, fruit: 1 };

function spawnBug(g: Game, rt: BugRuntime): void {
  const habitat = rt.rng.weighted(HABITATS, (h) => (availableBugs(g, h).length ? HABITAT_W[h] : 0));
  if (!habitat) return;
  const tile = habitatCandidates(g, rt, habitat);
  if (tile === null) return;
  const def = rt.rng.weighted(availableBugs(g, habitat), (b) => RARITY_WEIGHT[b.rarity] ?? 1);
  if (!def) return;
  const w = g.world;
  const tx = (tile % w.size) + 0.5, tz = ((tile / w.size) | 0) + 0.5;
  const base = w.height(tile) * LEVEL_HEIGHT;
  let x = tx, z = tz, y = base + 0.05;
  switch (habitat) {
    case 'flowers':
      y = base + 0.42;
      break;
    case 'trees':
      // perched on the trunk, facing the camera side
      z = tz + 0.18;
      y = base + 0.75 + rt.rng.range(0, 0.25);
      break;
    case 'fruit':
      y = base + 0.2;
      z = tz + 0.15;
      break;
    case 'rocks':
      y = base + 0.45;
      break;
    case 'water':
      y = -0.22;
      break;
    case 'air':
      y = base + 1.0 + rt.rng.range(0, 0.5);
      break;
    default:
      x += rt.rng.range(-0.3, 0.3);
      z += rt.rng.range(-0.3, 0.3);
  }
  rt.bugs.push({ id: rt.nextId++, bug: def.id, habitat, x, y, z, tile, alert: 0, state: 'idle', vx: 0, vz: 0, vy: 0, t: 0, phase: rt.rng.range(0, 10), life: rt.rng.range(60, 120) });
}

/** Where the net sweeps. */
function netPoint(g: Game): { x: number; z: number } {
  const p = g.state.player;
  const [fx, fz] = facingVec(p.facing);
  return { x: p.x + fx * 0.95, z: p.z + fz * 0.95 };
}

export function swingNet(g: Game): void {
  const rt = bugRT(g);
  rt.ready = false;
  g.emit('sfx', { name: 'swish' });
  g.startAction('net', 0.5, 0.26, () => {
    const np = netPoint(g);
    const py = g.world.surfaceY(g.state.player.x, g.state.player.z);
    let best: Bug | null = null;
    let bestD = 0.85;
    for (const b of rt.bugs) {
      if (b.state === 'gone') continue;
      const d = Math.hypot(b.x - np.x, b.z - np.z);
      const dy = b.y - py;
      if (dy > 2.1 || dy < -0.6) continue;
      // fleeing bugs can still be caught in the first moment
      if (b.state === 'flee' && b.t > 0.3) continue;
      if (d < bestD) {
        bestD = d;
        best = b;
      }
    }
    if (best) catchBug(g, best);
    else {
      g.emit('toolUsed', { tool: 'net', ok: false });
      for (const b of rt.bugs) if (Math.hypot(b.x - np.x, b.z - np.z) < 3) b.alert += 0.6;
    }
  });
}

function catchBug(g: Game, b: Bug): void {
  const def = BUG_BY_ID[b.bug]!;
  b.state = 'gone';
  b.life = 0;
  wearTool(g);
  if (roomFor(g, def.id, 1) < 1) g.toast('Pockets full — your catch went to home storage.', 'warn');
  give(g, def.id, 1, 'net');
  g.runtime.lastCatchId = def.id;
  stat(g, 'bugsCaught');
  g.emit('bugCaught', { id: def.id, rarity: def.rarity });
  g.emit('toolUsed', { tool: 'net', ok: true });
  g.emit('sfx', { name: def.rarity >= 3 ? 'fanfareBig' : 'fanfare' });
  g.toast(`You caught a ${def.name}!${def.rarity >= 4 ? ' Incredible!' : ''}`, 'good', def.id);
  g.startAction('celebrate', 1.3, 0.1);
}

export function updateBugs(g: Game, dt: number, held: boolean): void {
  const rt = bugRT(g);
  const p = g.state.player;
  if (p.location !== 'island') return;
  rt.bugs = rt.bugs.filter((b) => b.state !== 'gone' && b.life > 0 && Math.hypot(b.x - p.x, b.z - p.z) < SPAWN_R + 10);
  rt.spawnT -= dt;
  if (rt.spawnT <= 0 && rt.bugs.length < MAX_BUGS) {
    spawnBug(g, rt);
    rt.spawnT = 1.5;
  }
  // net-ready release -> swing
  if (rt.ready) {
    rt.readyT += dt;
    if (!held && !g.action) swingNet(g);
  }
  g.sneaking = rt.ready;
  const speed = g.motion.speed;
  const sneaking = rt.ready && speed < 1.6;
  for (const b of rt.bugs) {
    b.t += dt;
    b.life -= dt;
    b.phase += dt;
    const def = BUG_BY_ID[b.bug]!;
    if (b.state === 'idle') {
      // gentle idle motion
      if (b.habitat === 'air') {
        b.x += Math.sin(b.phase * 0.9) * dt * 0.6;
        b.z += Math.cos(b.phase * 0.7) * dt * 0.5;
        b.y += Math.sin(b.phase * 2.1) * dt * 0.15;
      } else if (b.habitat === 'ground' || b.habitat === 'beach') {
        if (Math.sin(b.phase * 0.8) > 0.97) {
          b.x += Math.cos(b.phase) * dt * 1.4;
          b.z += Math.sin(b.phase) * dt * 1.4;
        }
      } else if (b.habitat === 'water') {
        b.x += Math.sin(b.phase * 0.6) * dt * 0.4;
        b.z += Math.cos(b.phase * 0.5) * dt * 0.4;
      }
      // stealth: detection radius scales with how loud the player is
      const d = Math.hypot(b.x - p.x, b.z - p.z);
      const R = 1.6 + def.wariness * 0.9;
      const noise = speed < 0.2 ? 0.3 : sneaking ? 0.45 : g.motion.running ? 1.7 : 1.0;
      const radius = R * noise;
      if (d < radius) b.alert += dt * (1.2 + speed * 0.5) * (1 + (radius - d) / radius);
      else b.alert = Math.max(0, b.alert - dt * 0.6);
      if (d < 0.5 && !sneaking) b.alert = 1;
      if (b.alert >= 1) flee(g, b, def);
    } else if (b.state === 'flee') {
      b.x += b.vx * dt;
      b.z += b.vz * dt;
      b.y += b.vy * dt;
      if (b.t > 2.5) b.state = 'gone';
    }
  }
}

function flee(g: Game, b: Bug, def: BugDef): void {
  const p = g.state.player;
  b.state = 'flee';
  b.t = 0;
  const dx = b.x - p.x, dz = b.z - p.z;
  const d = Math.hypot(dx, dz) || 1;
  const sp = 2.5 + def.speed * 1.6;
  b.vx = (dx / d) * sp;
  b.vz = (dz / d) * sp;
  b.vy = FLYERS.has(b.habitat) || b.habitat === 'trees' ? 1.4 : b.habitat === 'ground' ? 0 : -0.3;
  markSeen(g, def.id);
  g.emit('bugScared', { id: def.id });
}

export function bugResolver(g: Game, ctx: InteractCtx): Interaction | null {
  if (!ctx.tool || ctx.tool.kind !== 'net') return null;
  return {
    label: 'Swing net (hold to sneak)',
    priority: 20,
    run: () => {
      const rt = bugRT(g);
      rt.ready = true;
      rt.readyT = 0;
    },
  };
}

export function isSneaking(g: Game): boolean {
  return bugRT(g).ready;
}

export function resetBugs(g: Game): void {
  const rt = bugRT(g);
  rt.bugs = [];
  rt.ready = false;
  g.sneaking = false;
  rt.rng = new Rng(hashInts(g.state.seed, g.state.clock.day, 99));
}
