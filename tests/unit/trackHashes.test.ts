import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { TRACKS } from '../../src/data/tracks/index';
import { trackFingerprint } from '../../src/data/tracks/fingerprint';
import { layout, left, right, straight } from '../../src/data/tracks/builder';

const golden = JSON.parse(readFileSync('tests/fixtures/track-hashes.json', 'utf8')) as Record<string, string>;

describe('layout markers', () => {
  it.each(Object.keys(golden))('%s: baked geometry and props unchanged', (key) => {
    const [id, mode] = key.split(':');
    const t = TRACKS.find((x) => x.id === id);
    expect(t, `track ${id} still exists`).toBeTruthy();
    expect(trackFingerprint(t!, mode === 'mirror')).toBe(golden[key]);
  });

  it('new layouts give marks the true road tangent (no skew at the end of curves)', () => {
    const segs = [straight(100), right(90, 40, { mark: 'a' }), straight(100, { mark: 'b' }), right(90, 40), straight(100), right(90, 40), straight(100), right(90, 40)];
    const exact = layout({ x: 0, z: 0, heading: 0 }, segs);
    const legacy = layout({ x: 0, z: 0, heading: 0 }, segs, { legacyMarkHeadings: true });
    // after one right turn from heading 0 the road heads toward -X: heading −90°
    expect(Math.abs(exact.pos.a.heading + 90)).toBeLessThan(2.5);
    expect(Math.abs(exact.pos.b.heading + 90)).toBeLessThan(2.5);
    expect(Math.abs(legacy.pos.a.heading + 90)).toBeGreaterThan(Math.abs(exact.pos.a.heading + 90));
    // positions are identical — only the headings differ
    expect(exact.pos.a.x).toBe(legacy.pos.a.x);
    expect(exact.points).toEqual(legacy.points);
    void left;
  });
});
