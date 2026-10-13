/**
 * Finding the way between maps: a breadth-first search over map edges and doors. The stuck helper's
 * quest arrow points along the first step, and the headless playthrough bot follows the whole route.
 * Doors and edges are used whatever their flags say; the story makes sure the way is open in time.
 */
import type { MapDef } from './map';

export type Hop = { map: string; via: { kind: 'edge'; side: 'n' | 's' | 'e' | 'w' } | { kind: 'warp'; x: number; y: number } };

/** The maps to walk through from `from` to `to` (the first hop first), or null. */
export function mapRoute(maps: Record<string, MapDef>, from: string, to: string): Hop[] | null {
  if (from === to) return [];
  const prev = new Map<string, { from: string; hop: Hop }>();
  const queue = [from];
  const seen = new Set([from]);
  while (queue.length) {
    const id = queue.shift()!;
    const def = maps[id];
    if (!def) continue;
    const hops: Hop[] = [
      ...(def.edges ?? []).filter(e => maps[e.to]).map(e => ({ map: e.to, via: { kind: 'edge' as const, side: e.side } })),
      ...def.warps.filter(w => maps[w.to] && w.needs !== 'never').map(w => ({ map: w.to, via: { kind: 'warp' as const, x: w.x, y: w.y } })),
    ];
    for (const hop of hops) {
      if (seen.has(hop.map)) continue;
      seen.add(hop.map);
      prev.set(hop.map, { from: id, hop });
      if (hop.map === to) {
        const out: Hop[] = [];
        for (let cur = to; cur !== from;) { const p = prev.get(cur)!; out.unshift(p.hop); cur = p.from; }
        return out;
      }
      queue.push(hop.map);
    }
  }
  return null;
}
