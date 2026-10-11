// Low-poly vegetation / rock geometries (vertex-colored; white parts are tinted per instance).
import { PAL } from '../palette';
import { box, cone, cyl, dodec, ico, merge, part } from './geo';

const W = 0xffffff;

export const natureGeo = {
  trunk: () => merge([part(cyl(0.11, 0.17, 1.0, 6), PAL.trunk, { pos: [0, 0.5, 0] })]),
  canopy: () =>
    merge([
      part(ico(0.68, 0), W, { pos: [0, 1.45, 0], scale: [1, 0.86, 1] }),
      part(ico(0.48, 0), W, { pos: [0.2, 1.95, 0.06] }),
      part(ico(0.42, 0), W, { pos: [-0.3, 1.72, -0.12] }),
    ]),
  pineTrunk: () => merge([part(cyl(0.09, 0.14, 0.7, 6), PAL.trunkDark, { pos: [0, 0.35, 0] })]),
  pineCanopy: () =>
    merge([
      part(cone(0.66, 0.9, 7), W, { pos: [0, 0.95, 0] }),
      part(cone(0.52, 0.82, 7), W, { pos: [0, 1.42, 0], rot: [0, 0.4, 0] }),
      part(cone(0.36, 0.72, 7), W, { pos: [0, 1.88, 0], rot: [0, 0.8, 0] }),
    ]),
  palm: () => {
    const parts = [];
    const segs = [
      [0, 0.22, 0],
      [0.05, 0.64, 0],
      [0.13, 1.05, 0],
      [0.26, 1.44, 0],
    ] as const;
    segs.forEach(([x, y], k) =>
      parts.push(part(cyl(0.1 - k * 0.012, 0.13 - k * 0.012, 0.44, 6), k % 2 ? PAL.trunk : PAL.trunkDark, { pos: [x, y, 0], rot: [0, 0, -0.12 * k] })),
    );
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2;
      parts.push(
        part(box(0.95, 0.04, 0.24), PAL.palmLeaf, {
          pos: [0.32 + Math.cos(a) * 0.42, 1.62 - 0.12, Math.sin(a) * 0.42],
          rot: [0, -a, -0.45],
        }),
      );
    }
    return merge(parts);
  },
  fruit: () => merge([part(ico(0.13, 1), W)]),
  rock: () =>
    merge([
      part(dodec(0.42), W, { pos: [0, 0.22, 0], scale: [1.15, 0.78, 1] }),
      part(dodec(0.2), W, { pos: [0.34, 0.12, 0.18] }),
    ]),
  flowerStem: () =>
    merge([
      part(cyl(0.022, 0.026, 0.34, 4), 0x6fb56a, { pos: [0, 0.17, 0] }),
      part(box(0.14, 0.02, 0.06), 0x7cc475, { pos: [0.06, 0.1, 0], rot: [0, 0, 0.5] }),
      part(ico(0.05, 0), 0xffd45c, { pos: [0, 0.36, 0] }),
    ]),
  flowerPetals: () => {
    const parts = [];
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      parts.push(part(ico(0.07, 0), W, { pos: [Math.cos(a) * 0.085, 0.35, Math.sin(a) * 0.085], scale: [1, 0.6, 1] }));
    }
    return merge(parts);
  },
  grass: () =>
    merge([
      part(cone(0.035, 0.26, 3), W, { pos: [0, 0.13, 0], rot: [0.15, 0, 0.1] }),
      part(cone(0.03, 0.2, 3), W, { pos: [0.07, 0.1, 0.03], rot: [0, 0, -0.3] }),
      part(cone(0.03, 0.22, 3), W, { pos: [-0.06, 0.11, -0.02], rot: [-0.2, 0, 0.25] }),
    ]),
  weed: () =>
    merge([
      part(cone(0.06, 0.3, 4), 0x7dbb5e, { pos: [0, 0.15, 0], rot: [0.2, 0, 0.15] }),
      part(cone(0.05, 0.26, 4), 0x6aa851, { pos: [0.1, 0.13, 0.04], rot: [0, 0, -0.4] }),
      part(cone(0.05, 0.24, 4), 0x89c766, { pos: [-0.09, 0.12, -0.03], rot: [-0.3, 0, 0.35] }),
      part(cone(0.04, 0.2, 4), 0x6aa851, { pos: [0.02, 0.1, -0.1], rot: [-0.4, 0, 0] }),
    ]),
  sapling: () =>
    merge([
      part(cyl(0.035, 0.05, 0.5, 5), PAL.trunk, { pos: [0, 0.25, 0] }),
      part(ico(0.24, 0), W, { pos: [0, 0.6, 0] }),
      part(ico(0.16, 0), W, { pos: [0.12, 0.45, 0.05] }),
    ]),
  digSpot: () =>
    merge([
      part(box(0.42, 0.02, 0.08), 0x8a6a4a, { pos: [0, 0.015, 0], rot: [0, 0.6, 0] }),
      part(box(0.42, 0.02, 0.08), 0x8a6a4a, { pos: [0, 0.015, 0], rot: [0, -0.6, 0] }),
      part(box(0.18, 0.02, 0.05), 0x8a6a4a, { pos: [0.2, 0.015, 0.05], rot: [0, 0.1, 0] }),
    ]),
  hole: () =>
    merge([
      part(cyl(0.38, 0.38, 0.02, 9), 0x5a4330, { pos: [0, 0.012, 0] }),
      part(ico(0.12, 0), 0xb08a64, { pos: [0.42, 0.04, 0.1], scale: [1, 0.5, 1] }),
    ]),
  stoneChunk: () => merge([part(dodec(0.1), W, { pos: [0, 0.07, 0] })]),
};
