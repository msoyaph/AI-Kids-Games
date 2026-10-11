// Mission markers: where the HUD compass and the map star point for a mission, inside or outside.
import { agents, personRoom, roomDoorOf } from './agents';
import type { MissionDef } from '../data/questTypes';
import type { Game } from './game';
import { interiorRT } from './interior';
import { markerTarget } from './quests';
import { findStructure } from './structures';
import { Region } from '../world/types';

/**
 * Where the mission marker points. 'view' = in the current view (room coordinates when indoors:
 * the person if they're in this room, otherwise the way out); 'island' = island coordinates (map).
 */
export function markerPos(g: Game, m: MissionDef, space: 'view' | 'island' = 'view'): { x: number; y: number; z: number } | null {
  const outside = islandMarker(g, m);
  const rt = interiorRT(g);
  if (space === 'island' || g.state.player.location === 'island' || !rt) return outside;
  const t = markerTarget(g, m);
  if (!t) return null;
  if (t.npc) {
    const p = rt.room.people.find((pp) => pp.id === t.npc);
    if (p) return { x: p.x, y: 1.75, z: p.z };
  }
  // the target is this building itself: nothing to point at
  if (t.struct && (t.struct === rt.room.kind || (t.struct === 'home' && rt.room.kind === 'home'))) return null;
  return outside ? { x: rt.room.door.x + 0.5, y: 1.2, z: rt.room.d - 0.1 } : null;
}

function islandMarker(g: Game, m: MissionDef): { x: number; y: number; z: number } | null {
  const t = markerTarget(g, m);
  if (!t) return null;
  if (t.npc) {
    const a = agents(g).get(t.npc);
    if (a && a.visible) return { x: a.x, y: 2.2, z: a.z };
    // inside a building: point at its door
    const room = personRoom(g, t.npc);
    const door = room ? roomDoorOf(g, room) : null;
    if (door) return { x: door.x, y: 2.6, z: door.z - 0.7 };
    if (t.npc === 'pemberly') {
      const l = g.world.gen.lots.hall;
      return { x: l.x + l.w / 2, y: 3, z: l.z + l.d };
    }
    const home = g.state.world.structures.find((s) => s.owner === t.npc && s.type === 'villagerHome');
    if (home) return { x: home.x + 1.5, y: 2.5, z: home.z + 3 };
    if (t.npc === 'fennimore') {
      const s = findStructure(g, 'shop') ?? findStructure(g, 'shopCart');
      if (s) return { x: s.x + s.w / 2, y: 2.5, z: s.z + s.d };
    }
    if (t.npc === 'vesper') {
      const s = findStructure(g, 'museum') ?? findStructure(g, 'museumTent');
      if (s) return { x: s.x + s.w / 2, y: 2.5, z: s.z + s.d };
    }
    return null;
  }
  if (t.struct) {
    const s = findStructure(g, t.struct as never);
    if (s) return { x: s.x + s.w / 2, y: s.level * 1.4 + 3, z: s.z + s.d / 2 };
    return null;
  }
  if (t.lot) {
    const l = g.world.gen.lots[t.lot as keyof typeof g.world.gen.lots];
    if (l) return { x: l.x + l.w / 2, y: 2, z: l.z + l.d / 2 };
  }
  if (t.region !== undefined) {
    if (t.region === Region.Summit) {
      const l = g.world.gen.lots.lighthouse;
      return { x: l.x + 1, y: 4, z: l.z + 1 };
    }
  }
  return null;
}

