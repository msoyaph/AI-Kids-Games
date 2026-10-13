/**
 * Ways between maps that the map data alone doesn't show: a Trial's door leads to where the Trial
 * ends (its Keeper's top floor, or the far side of a small puzzle), and an updraft carries you to
 * where its script warps. The quest arrow and the playthrough bot route with these.
 */
import type { Cmd } from '../core/script';
import type { MapDef } from '../core/world/map';
import { mapRoute, type Hop } from '../core/world/route';
import { SCRIPTS } from '../data/dialogue/index';
import { MAPS } from '../data/maps/index';
import { TRIAL_BY_ID } from '../data/trials';

const scriptWarp = (id: string): string | undefined => (SCRIPTS[id] as Cmd[] | undefined)?.flatMap(c => ('warp' in c ? [c.warp] : []))[0];

export function extraLinks(def: MapDef): Hop[] {
  const out: Hop[] = [];
  for (const w of def.warps) {
    const t = w.to.startsWith('trial:') ? TRIAL_BY_ID[w.to.slice(6)] : undefined;
    if (t && t.to.map !== def.id) out.push({ map: t.to.map, via: { kind: 'warp', x: w.x, y: w.y } });
  }
  for (const o of def.objects) {
    const to = o.kind === 'updraft' && o.script ? scriptWarp(o.script) : undefined;
    if (to && MAPS[to]) out.push({ map: to, via: { kind: 'warp', x: o.x, y: o.y } });
  }
  return out;
}

/** The way from one map to another, Trials and updrafts included. */
export const routeBetween = (from: string, to: string) => mapRoute(MAPS, from, to, extraLinks);
