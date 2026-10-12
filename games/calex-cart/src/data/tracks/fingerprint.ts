import type { TrackData } from '../types';
import { TrackModel } from '../../sim/track/trackModel';

/** FNV-1a over a list of numbers rounded to millimetres. */
function fnv(nums: Iterable<number>): string {
  let h = 0x811c9dc5;
  for (const n of nums) {
    const v = Math.round(n * 1000);
    h ^= v & 0xffff;
    h = Math.imul(h, 0x01000193) >>> 0;
    h ^= (v >>> 16) & 0xffff;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** Fingerprint of a track's baked road, shortcuts, item boxes and prop placements. */
export function trackFingerprint(data: TrackData, mirror: boolean): string {
  const t = new TrackModel(data, mirror);
  const nums: number[] = [];
  const rib = (r: typeof t.main): void => {
    for (let i = 0; i < r.n; i++) nums.push(r.px[i], r.py[i], r.pz[i], r.hw[i]);
  };
  rib(t.main);
  for (const sc of t.shortcuts) rib(sc);
  for (const b of t.itemBoxes) nums.push(b.s, b.d);
  for (const p of data.props ?? []) nums.push(p.x, p.z, p.y ?? 0, p.rot ?? 0, p.scale ?? 1);
  for (const pt of data.points) nums.push(pt.x, pt.z, pt.y ?? 0);
  return fnv(nums);
}
