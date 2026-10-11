// What the action button will touch right now, so the view can ring that spot: young players see
// which tile the shovel will dig or the axe will chop before they press anything.
import type { Game } from './game';
import { castTarget, fishingRT } from './fishing';
import { frontTile } from './player';
import { equippedTool } from './tools';

export interface ActionTarget {
  /** world point to mark (tile centre, or where the bobber would land) */
  x: number;
  z: number;
  tile: number;
  /** something will happen there */
  ok: boolean;
  /** a tool is in hand (the ring shows even when nothing would happen) */
  tool: boolean;
}

export function actionTarget(g: Game): ActionTarget | null {
  const p = g.state.player;
  if (p.location !== 'island' || g.mode !== 'play' || g.action) return null;
  const w = g.world;
  const tool = equippedTool(g);
  const inter = g.resolve();
  const ok = !!inter && !inter.disabled;
  if (tool?.kind === 'rod') {
    if (fishingRT(g).cast) return null;
    const t = castTarget(g);
    if (t) return { x: t.x, z: t.z, tile: w.idx(Math.floor(t.x), Math.floor(t.z)), ok, tool: true };
  }
  if (!tool && !inter) return null;
  // the tile the action really touches (usually the one in front; picking up: the one you stand on)
  const tile = inter?.tile ?? frontTile(w, p);
  return { x: (tile % w.size) + 0.5, z: Math.floor(tile / w.size) + 0.5, tile, ok, tool: !!tool };
}
