import { Vector3 } from 'three';
import { S } from '../app/services';
import type { CodexEntry } from '../data/codex';
import { drawToCanvas } from '../gfx/canvas';
import { drawCodexPicture } from '../gfx/art/codexPicture';
import { disposeObject } from '../r3/dispose';
import { cloneCanvas, snapshot } from '../r3/snapshot';
import { createPlanet } from '../r3/space/planets';
import { recipeFor } from '../r3/space/recipes';
import { portraitEl } from './portraits';

/**
 * Pictures for the DOM UI (Codex pages, fact cards, the star map card). Real places are rendered
 * from the same 3D planets as the game, cached once per body; everything else uses the flat art.
 */
const cache = new Map<string, HTMLCanvasElement>();
const SUN_DIR = new Vector3(-0.55, 0.45, 0.7).normalize();

function renderBody(id: string, px: number): HTMLCanvasElement | null {
  const r3 = S.game?.r3;
  if (!r3 || r3.lost) return null;
  const key = `${id}:${px}`;
  let c = cache.get(key);
  if (!c) {
    const rec = recipeFor(id);
    const view = createPlanet(id, 1, { renderer: r3.renderer, profile: r3.profile, detail: 'normal', segments: 64 });
    // Lean ringed planets toward the camera so their rings show.
    if (rec.rings && !rec.rings.faint) view.group.rotation.x = 0.38;
    const extent = rec.rings && !rec.rings.faint ? rec.rings.outer * 1.02 : rec.kind === 'sun' ? 1.45 : 1.12;
    const fov = 30;
    const dist = extent / Math.tan(((fov / 2) * Math.PI) / 180);
    c = snapshot(r3.renderer, view.group, { size: px, distance: dist, fov, prepare: () => view.update(2.5, SUN_DIR) });
    disposeObject(view.group);
    cache.set(key, c);
  }
  return c;
}

/** A 3D picture of a body (falls back to null if 3D is unavailable). */
export function bodyPicture(id: string, cssSize: number): HTMLCanvasElement | null {
  const px = Math.min(512, Math.ceil(cssSize * Math.min(2, window.devicePixelRatio || 1)));
  // Round up so different call sites share bakes.
  const bucket = px <= 128 ? 128 : px <= 256 ? 256 : 384;
  const src = renderBody(id, bucket);
  return src ? cloneCanvas(src, cssSize) : null;
}

export function codexPicture(e: CodexEntry, cssSize: number): HTMLCanvasElement {
  if ('body' in e.picture) {
    const pic = bodyPicture(e.picture.body, cssSize);
    if (pic) return pic;
  }
  if ('char' in e.picture) return portraitEl(e.picture.char, cssSize);
  return drawToCanvas(cssSize, cssSize, (c, w, hh) => drawCodexPicture(c, e, w, hh));
}
