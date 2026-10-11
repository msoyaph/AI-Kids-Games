import type { MapDef } from '../data/maps/types';
import { paintMap } from '../render/MapPainter';

const cache = new Map<string, string>();

/** Small painted preview of a map (cached data URL). */
export function mapThumbUrl(map: MapDef): string {
  let url = cache.get(map.id);
  if (!url) {
    const c = paintMap(map, 0.2);
    url = c.toDataURL('image/jpeg', 0.82);
    cache.set(map.id, url);
  }
  return url;
}
