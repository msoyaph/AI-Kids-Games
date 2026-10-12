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
import { enterInterior } from './interior';
import type { Structure } from './state';
import { festivalHost, festivalNow, festivalToday, isBirthday, merchantHere } from './happenings';

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

/**
 * A villager's activity at `hour`. With the game passed in, special days win: on their birthday
 * they stay home for their party, and on festival days everyone gathers in the plaza.
 */
export function activityOf(id: string, hour: number, g?: Game): Activity {
  const def = VILLAGER_BY_ID[id];
  if (!def) return 'home';
  if (g) {
    if (isBirthday(g, id) && hour >= 10 && hour < 20) return 'home';
    const f = festivalToday(g);
    if (f && hour >= f.hours[0] && hour < f.hours[1]) return 'plaza';
  }
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

/** The island spot just outside a room's front door (null if that building doesn't exist). */
export function roomDoorOf(g: Game, kind: string): { x: number; z: number } | null {
  const vid = kind.startsWith('villager:') ? kind.slice(9) : null;
  const s = vid ? homeOf(g, vid) : findStructure(g, kind === 'home' ? 'home' : kind === 'shop' ? 'shop' : kind === 'hall' ? 'hall' : 'museum');
  return s ? doorOf(s) : null;
}

/** Pemberly waits in the plaza for the festival (all of its last mission, and festival night). */
export function pemberlyOutdoors(g: Game): boolean {
  if (g.state.quests.active.m5_finale || g.state.flags.finaleDay === g.state.clock.day) return true;
  const f = festivalNow(g);
  return !!f && festivalHost(g, f) === 'pemberly';
}

/** Where a festival host stands (a fixed spot by the Great Lantern, easy to find). */
export function festivalSpot(g: Game): { x: number; z: number } {
  const pl = g.world.gen.lots.plaza;
  return { x: pl.x + pl.w / 2 - 1.3, z: pl.z + pl.d / 2 + 1.1 };
}

/** Wanda sets up on the beach by the dock (first open sand tile found, cached). */
export function merchantSpot(g: Game): { x: number; z: number } {
  const cached = g.runtime.wandaSpot as { x: number; z: number } | undefined;
  if (cached) return cached;
  const w = g.world;
  const d = w.gen.lots.dock;
  let best = { x: d.x + 0.5, z: d.z - 1.5 };
  let bestD = 1e9;
  for (let z = d.z - 8; z <= d.z + 2; z++)
    for (let x = d.x - 8; x <= d.x + d.w + 8; x++) {
      if (!w.inb(x, z)) continue;
      const i = w.idx(x, z);
      if (w.ground(i) !== Ground.Sand || !w.standable(i) || w.obj(i) || w.structure(i)) continue;
      const dist = Math.hypot(x - (d.x - 2), z - (d.z - 1));
      if (dist < bestD) {
        bestD = dist;
        best = { x: x + 0.5, z: z + 0.5 };
      }
    }
  g.runtime.wandaSpot = best;
  return best;
}

/** Which room someone is inside right now (null = outdoors / not on the island). */
export function personRoom(g: Game, id: string): string | null {
  if (id === 'pemberly') return pemberlyOutdoors(g) ? null : 'hall';
  if (id === 'fennimore') return findStructure(g, 'shop') ? 'shop' : null;
  if (id === 'vesper') return findStructure(g, 'museum') ? 'museum' : null;
  if (!VILLAGER_BY_ID[id] || !g.state.villagers[id]?.movedIn || !homeOf(g, id)) return null;
  const a = agents(g).get(id);
  // walking home still counts as outdoors until they're through the door
  if (a && a.visible) return null;
  return activityOf(id, Math.floor(g.state.clock.minute / 60), g) === 'home' ? `villager:${id}` : null;
}

/** NPC post positions. */
function npcPost(g: Game, id: string): { x: number; z: number; facing: number; visible: boolean } | null {
  const h = g.state.clock.minute / 60;
  const lots = g.world.gen.lots;
  // Pemberly works inside Lantern Hall, except for the festival in the plaza
  if (id === 'pemberly') {
    if (!pemberlyOutdoors(g)) return null;
    const pl = lots.plaza;
    if (!g.state.quests.active.m5_finale && g.state.flags.finaleDay !== g.state.clock.day) {
      const spot = festivalSpot(g);
      return { ...spot, facing: 0, visible: true };
    }
    return { x: pl.x + pl.w / 2 + 1.3, z: pl.z + pl.d / 2 + 1.1, facing: 0, visible: true };
  }
  if (id === 'wanda') {
    if (!merchantHere(g)) return null;
    return { ...merchantSpot(g), facing: 0, visible: true };
  }
  // Fennimore minds his cart outdoors; once the shop is built he works behind its counter
  if (id === 'fennimore') {
    const s = findStructure(g, 'shopCart');
    if (!s || findStructure(g, 'shop')) return null;
    const open = h >= 8 && h < 22;
    return { x: s.x + s.w + 0.4, z: s.z + s.d - 0.3, facing: -Math.PI / 2 + 0.3, visible: open };
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
    // the festival host waits by the Great Lantern
    const fest = festivalNow(g);
    if (fest && festivalHost(g, fest) === a.id) {
      const spot = festivalSpot(g);
      a.x = spot.x;
      a.z = spot.z;
      a.path = [];
      a.visible = true;
      a.speed = 0;
      a.facing = approachAngle(a.facing, 0, dt * 4);
      continue;
    }
    const act = activityOf(a.id, hour, g);
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

const AWAY: Record<string, string> = {
  plaza: 'at the plaza',
  beach: 'at the beach',
  river: 'by the river',
  forest: 'in the forest',
  museum: 'at the museum',
  shop: 'at the shop',
  wander: 'out for a walk',
};

/** Knock on a villager's door: come in if they're home. */
export function homeResolver(g: Game, ctx: InteractCtx): Interaction | null {
  const s = ctx.frontStruct;
  if (!s || s.type !== 'villagerHome' || !s.owner) return null;
  const id = s.owner;
  const name = agentName(id);
  return {
    label: `Knock on ${name}'s door`,
    priority: 85,
    run: () => {
      g.emit('sfx', { name: 'knock' });
      const a = agents(g).get(id);
      if (a && !a.visible && activityOf(id, Math.floor(g.state.clock.minute / 60), g) === 'home') {
        a.path = [];
        g.emit('knocked', { npc: id });
        enterInterior(g, `villager:${id}`);
      } else {
        const act = activityOf(id, Math.floor(g.state.clock.minute / 60), g);
        g.toast(`${name} isn't home right now.${AWAY[act] ? ` Maybe ${AWAY[act]}?` : ''}`);
      }
    },
  };
}
