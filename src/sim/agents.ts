// Walking characters: villagers follow their daily schedules with A* paths; NPCs keep their posts.
import { hashString, Rng, hashInts } from '../core/rng';
import { approachAngle } from '../core/math';
import { NPCS, VILLAGER_BY_ID, type Activity } from '../data/villagers';
import { Ground } from '../world/types';
import type { Game, InteractCtx, Interaction } from './game';
import { findPath, lineClear } from './pathfind';
import { facingVec, tileOf } from './player';
import { reachableComponents, residents, vstate } from './villagers';
import { findStructure } from './structures';
import type { Structure } from './state';

export interface Agent {
  id: string;
  kind: 'villager' | 'npc';
  x: number;
  z: number;
  facing: number;
  speed: number;
  path: { x: number; z: number }[];
  wait: number;
  activity: Activity | 'post';
  visible: boolean;
  talking: boolean;
  /** emote bubble (heart, note, ...) */
  emote: { kind: string; t: number } | null;
  stuck: number;
}

export const AGENT_SPEED = 2.1;

export function agents(g: Game): Map<string, Agent> {
  let m = g.runtime.agents as Map<string, Agent> | undefined;
  if (!m) {
    m = new Map();
    g.runtime.agents = m;
  }
  return m;
}

function currentActivity(id: string, hour: number): Activity {
  const def = VILLAGER_BY_ID[id];
  if (!def) return 'home';
  let act: Activity = 'home';
  for (const e of def.schedule) if (hour >= e.from) act = e.act;
  return act;
}

export function homeOf(g: Game, id: string): Structure | undefined {
  const v = g.state.villagers[id];
  return g.state.world.structures.find((s) => s.id === v?.homeId);
}

function doorOf(s: { x: number; z: number; w: number; d: number }): { x: number; z: number } {
  return { x: s.x + Math.floor(s.w / 2) + 0.5, z: s.z + s.d + 0.5 };
}

/** NPC post positions. */
function npcPost(g: Game, id: string): { x: number; z: number; facing: number; visible: boolean } | null {
  const h = g.state.clock.minute / 60;
  const lots = g.world.gen.lots;
  if (id === 'pemberly') {
    const hall = lots.hall;
    const awake = h >= 6 && h < 23;
    return { x: hall.x + hall.w / 2 + 1.6, z: hall.z + hall.d + 1.2, facing: 0, visible: awake };
  }
  if (id === 'fennimore') {
    const s = findStructure(g, 'shop') ?? findStructure(g, 'shopCart');
    if (!s) return null;
    const open = h >= 8 && h < 22;
    if (s.type === 'shopCart') return { x: s.x + s.w + 0.4, z: s.z + s.d - 0.3, facing: -Math.PI / 2 + 0.3, visible: open };
    return { x: s.x + s.w / 2 + 1.4, z: s.z + s.d + 0.7, facing: 0, visible: open };
  }
  if (id === 'vesper') {
    const tent = findStructure(g, 'museumTent');
    if (!tent) return null;
    return { x: tent.x + tent.w / 2 + 1.2, z: tent.z + tent.d + 0.6, facing: 0, visible: true };
  }
  return null;
}

function pickTarget(g: Game, a: Agent, rng: Rng): { x: number; z: number } | null {
  const w = g.world;
  const { comp } = reachableComponents(g);
  const here = tileOf(w, a.x, a.z);
  const myComp = comp[here];
  const lots = w.gen.lots;
  const home = homeOf(g, a.id);
  const ok = (i: number) => w.inb(i % w.size, (i / w.size) | 0) && comp[i] === myComp && w.standable(i) && !w.obj(i);
  const near = (cx: number, cz: number, r: number, test: (i: number) => boolean = () => true) => {
    for (let t = 0; t < 40; t++) {
      const x = Math.floor(cx + rng.range(-r, r)), z = Math.floor(cz + rng.range(-r, r));
      if (!w.inb(x, z)) continue;
      const i = w.idx(x, z);
      if (ok(i) && test(i)) return { x: x + 0.5, z: z + 0.5 };
    }
    return null;
  };
  const hx = home ? home.x + 1.5 : a.x, hz = home ? home.z + 4 : a.z;
  switch (a.activity) {
    case 'plaza':
      return near(lots.plaza.x + lots.plaza.w / 2, lots.plaza.z + lots.plaza.d / 2, 5) ?? near(hx, hz, 6);
    case 'beach':
      return near(a.x, a.z, 18, (i) => w.ground(i) === Ground.Sand) ?? near(hx, hz, 6);
    case 'river':
      return (
        near(a.x, a.z, 14, (i) => {
          const x = i % w.size, z = (i / w.size) | 0;
          return [w.idx(x + 1, z), w.idx(x - 1, z), w.idx(x, z + 1), w.idx(x, z - 1)].some((k) => w.ground(k) === Ground.River || w.ground(k) === Ground.Pond);
        }) ?? near(hx, hz, 6)
      );
    case 'forest':
      return (
        near(a.x, a.z, 14, (i) => {
          const x = i % w.size, z = (i / w.size) | 0;
          let t = 0;
          for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) if (w.inb(x + dx, z + dz) && ['tree', 'pine'].includes(w.obj(w.idx(x + dx, z + dz))?.k ?? '')) t++;
          return t >= 2;
        }) ?? near(hx, hz, 6)
      );
    case 'museum': {
      const m = findStructure(g, 'museum') ?? findStructure(g, 'museumTent');
      const r = m ?? lots.museum;
      return near(r.x + r.w / 2, r.z + r.d + 2, 3) ?? near(hx, hz, 6);
    }
    case 'shop': {
      const s = findStructure(g, 'shop') ?? findStructure(g, 'shopCart');
      const r = s ?? lots.shop;
      return near(r.x + r.w / 2, r.z + r.d + 2, 3) ?? near(hx, hz, 6);
    }
    case 'home':
      return home ? doorOf(home) : null;
    default:
      return near(hx, hz, 8);
  }
}

function setPath(g: Game, a: Agent, target: { x: number; z: number }): boolean {
  const w = g.world;
  const from = tileOf(w, a.x, a.z);
  const to = tileOf(w, target.x, target.z);
  const tiles = findPath(w, from, to, 3000);
  if (!tiles) return false;
  // string-pull: keep only waypoints we can't see past
  const pts = tiles.map((t) => ({ x: (t % w.size) + 0.5, z: ((t / w.size) | 0) + 0.5 }));
  const out: { x: number; z: number }[] = [];
  let cx = a.x, cz = a.z;
  let i = 0;
  while (i < pts.length) {
    let j = pts.length - 1;
    while (j > i && !lineClear(w, cx, cz, pts[j]!.x, pts[j]!.z)) j--;
    out.push(pts[j]!);
    cx = pts[j]!.x;
    cz = pts[j]!.z;
    i = j + 1;
  }
  a.path = out;
  return true;
}

export function syncAgents(g: Game): void {
  const m = agents(g);
  const want = new Set<string>();
  for (const id of residents(g)) want.add(id);
  for (const n of NPCS) if (npcPost(g, n.id)) want.add(n.id);
  for (const id of want) {
    if (m.has(id)) continue;
    const isNpc = !VILLAGER_BY_ID[id];
    let x = g.state.player.x, z = g.state.player.z;
    if (isNpc) {
      const p = npcPost(g, id)!;
      x = p.x;
      z = p.z;
    } else {
      const home = homeOf(g, id);
      if (home) {
        const d = doorOf(home);
        x = d.x;
        z = d.z;
      }
    }
    m.set(id, { id, kind: isNpc ? 'npc' : 'villager', x, z, facing: 0, speed: 0, path: [], wait: 0, activity: 'wander', visible: true, talking: false, emote: null, stuck: 0 });
  }
  for (const id of [...m.keys()]) if (!want.has(id)) m.delete(id);
}

export function updateAgents(g: Game, dt: number): void {
  if (g.state.player.location !== 'island') return;
  syncAgents(g);
  const hour = Math.floor(g.state.clock.minute / 60);
  const p = g.state.player;
  for (const a of agents(g).values()) {
    if (a.emote) {
      a.emote.t -= dt;
      if (a.emote.t <= 0) a.emote = null;
    }
    if (a.kind === 'npc') {
      const post = npcPost(g, a.id);
      if (!post) continue;
      a.x = post.x;
      a.z = post.z;
      a.visible = post.visible;
      if (!a.talking) a.facing = approachAngle(a.facing, post.facing, dt * 4);
      a.speed = 0;
      continue;
    }
    if (a.talking) {
      a.speed = 0;
      a.facing = approachAngle(a.facing, Math.atan2(p.x - a.x, p.z - a.z), dt * 8);
      continue;
    }
    const act = currentActivity(a.id, hour);
    if (act !== a.activity) {
      a.activity = act;
      a.path = [];
      a.wait = 0;
      if (act !== 'home') a.visible = true;
    }
    if (!a.visible) continue;
    if (!a.path.length) {
      a.wait -= dt;
      a.speed = 0;
      if (a.activity === 'home') {
        const home = homeOf(g, a.id);
        if (home) {
          const d = doorOf(home);
          if (Math.hypot(d.x - a.x, d.z - a.z) < 0.6) {
            a.visible = false;
            continue;
          }
        }
      }
      if (a.wait <= 0) {
        const rng = new Rng(hashInts(g.state.seed, hashString(a.id), Math.floor(g.state.playSeconds * 3)));
        const t = pickTarget(g, a, rng);
        if (!t || !setPath(g, a, t)) a.wait = 1 + rng.next() * 2;
        else a.wait = a.activity === 'home' ? 0 : 2.5 + rng.next() * 5;
      }
      continue;
    }
    // follow path
    const wp = a.path[0]!;
    const dx = wp.x - a.x, dz = wp.z - a.z;
    const d = Math.hypot(dx, dz);
    // pause politely if the player is in the way
    if (Math.hypot(p.x - a.x, p.z - a.z) < 0.75 && Math.hypot(p.x - wp.x, p.z - wp.z) < d) {
      a.speed = 0;
      a.stuck += dt;
      if (a.stuck > 3) {
        a.path = [];
        a.stuck = 0;
      }
      continue;
    }
    a.stuck = 0;
    if (d < 0.08) {
      a.path.shift();
      continue;
    }
    const step = Math.min(d, AGENT_SPEED * dt);
    a.x += (dx / d) * step;
    a.z += (dz / d) * step;
    a.speed = AGENT_SPEED;
    a.facing = approachAngle(a.facing, Math.atan2(dx, dz), dt * 10);
  }
  // keep the player from walking through characters
  for (const a of agents(g).values()) {
    if (!a.visible) continue;
    const ex = p.x - a.x, ez = p.z - a.z;
    const dd = Math.hypot(ex, ez);
    const min = 0.55;
    if (dd < min && dd > 1e-4) {
      p.x = a.x + (ex / dd) * min;
      p.z = a.z + (ez / dd) * min;
    }
  }
}

/** The character the player is facing (within reach), if any. */
export function facingAgent(g: Game): Agent | null {
  const p = g.state.player;
  const [fx, fz] = facingVec(p.facing);
  let best: Agent | null = null;
  let bestD = 1.6;
  for (const a of agents(g).values()) {
    if (!a.visible) continue;
    const dx = a.x - p.x, dz = a.z - p.z;
    const d = Math.hypot(dx, dz);
    if (d > bestD || d < 1e-3) continue;
    const dot = (dx * fx + dz * fz) / d;
    if (dot < 0.45) continue;
    best = a;
    bestD = d;
  }
  return best;
}

export function agentName(id: string): string {
  return VILLAGER_BY_ID[id]?.name ?? NPCS.find((n) => n.id === id)?.name ?? id;
}

export function talkResolver(g: Game, _ctx: InteractCtx): Interaction | null {
  const a = facingAgent(g);
  if (!a) return null;
  return {
    label: `Talk to ${agentName(a.id)}`,
    priority: 100,
    run: () => {
      a.talking = true;
      if (a.kind === 'villager') vstate(g, a.id);
      g.ui.open('talk', a.id);
    },
  };
}

export function endTalk(g: Game, id: string): void {
  const a = agents(g).get(id);
  if (a) a.talking = false;
}

export function emote(g: Game, id: string, kind: string): void {
  const a = agents(g).get(id);
  if (a) a.emote = { kind, t: 2.2 };
}

/** Knock on a villager's door: talk if they're home. */
export function homeResolver(g: Game, ctx: InteractCtx): Interaction | null {
  const s = ctx.frontStruct;
  if (!s || s.type !== 'villagerHome' || !s.owner) return null;
  const id = s.owner;
  const name = agentName(id);
  return {
    label: `Knock on ${name}'s door`,
    priority: 85,
    run: () => {
      const a = agents(g).get(id);
      if (a && !a.visible) {
        const d = doorOf(s);
        a.x = d.x;
        a.z = d.z;
        a.visible = true;
        a.talking = true;
        a.path = [];
        a.wait = 20;
        g.emit('sfx', { name: 'knock' });
        g.ui.open('talk', id);
      } else g.toast(`${name} isn't home right now.`);
    },
  };
}
