/**
 * The town's model kit: the pieces every building shares (roofs, windows, doors, trim, steps,
 * fences, flower boxes), so houses, shops and the library look like one hand-made set. Every model
 * is built around the middle of its footprint at ground level (y = 0), facing south (+z); the
 * renderer turns and places it. Sizes are in tiles. Walls marked TINT take their paint from the
 * instance colour (one model, every colour, one draw call).
 */
import * as THREE from 'three';
import { bevelBox, box, cyl, ico, PAT, part, prism, TINT } from '../geo';
import { PAINT } from '../palette';

export type Parts = THREE.BufferGeometry[];
export const WHITE = 0xffffff;
export const TRIM = PAINT.trim;
export const GLASS = PAINT.glass;
export const LEAF = 0x5fae5a, LEAF_DARK = 0x3f8a4a;
export const FLOWERS = [0xff7a8a, 0xffd34d, 0xffffff, 0xff9fd0, 0xb59cff, 0xff9a4d];
export const METAL = 0x5d6470, METAL_LIGHT = 0x9aa3ad, WOOD = 0xb07a4f, WOOD_DARK = 0x8a5a3b;

/** Walls painted by the instance colour, with a pattern. */
export const tinted = (pattern: number) => pattern + TINT;

const m4 = new THREE.Matrix4();
const q = new THREE.Quaternion();
const up = new THREE.Vector3(0, 1, 0);

/** Move and turn finished parts (turn about y, then move). */
export function moved(parts: Parts, x: number, y: number, z: number, turn = 0): Parts {
  q.setFromAxisAngle(up, turn);
  m4.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 1, 1));
  for (const p of parts) p.applyMatrix4(m4);
  return parts;
}

/** The four faces of a box: the turn that makes a south-facing piece face that way. */
export const FACE = { s: 0, e: Math.PI / 2, n: Math.PI, w: -Math.PI / 2 } as const;
export type Face = keyof typeof FACE;

/** A point on the face of a w × d box centred at (cx, cz): `along` across the face, `out` beyond it. */
export function onFace(face: Face, cx: number, cz: number, w: number, d: number, along: number, out = 0): [number, number] {
  switch (face) {
    case 's': return [cx + along, cz + d / 2 + out];
    case 'n': return [cx - along, cz - d / 2 - out];
    case 'e': return [cx + w / 2 + out, cz - along];
    case 'w': return [cx - w / 2 - out, cz + along];
  }
}

/**
 * A window on a wall, built facing south at the origin: a white frame, glass that lights up at
 * night, a cross bar, a sill, and optionally shutters and a flower box.
 */
export function windowPiece(w = 0.3, h = 0.32, o: { shutters?: number; flowers?: boolean; arch?: boolean } = {}): Parts {
  const parts: Parts = [
    part(bevelBox(w + 0.07, h + 0.07, 0.05, 0.012), TRIM, { pos: [0, 0, 0.015] }),
    part(box(w, h, 0.04), GLASS, { pos: [0, 0, 0.028], pattern: PAT.glass }),
    part(box(0.025, h, 0.05), TRIM, { pos: [0, 0, 0.034] }),
    part(box(w, 0.025, 0.05), TRIM, { pos: [0, h * 0.08, 0.034] }),
    part(box(w + 0.1, 0.035, 0.07), TRIM, { pos: [0, -h / 2 - 0.035, 0.035] }),
  ];
  if (o.arch) parts.push(part(cyl(w / 2 + 0.035, w / 2 + 0.035, 0.05, 10, ), TRIM, { pos: [0, h / 2, 0.015], rot: [Math.PI / 2, 0, 0], scale: [1, 1, 0.6] }), part(cyl(w / 2, w / 2, 0.04, 10), GLASS, { pos: [0, h / 2, 0.028], rot: [Math.PI / 2, 0, 0], scale: [1, 1, 0.6], pattern: PAT.glass }));
  if (o.shutters !== undefined) for (const s of [-1, 1]) parts.push(part(box(0.1, h + 0.04, 0.03), o.shutters, { pos: [s * (w / 2 + 0.09), 0, 0.02], pattern: PAT.boards }));
  if (o.flowers) {
    parts.push(part(bevelBox(w + 0.08, 0.08, 0.1, 0.015), WOOD, { pos: [0, -h / 2 - 0.09, 0.07], pattern: PAT.boards }));
    for (let i = 0; i < 4; i++) {
      const fx = -w / 2 + 0.03 + (i / 3) * (w - 0.06);
      parts.push(part(ico(0.04, 0), LEAF, { pos: [fx, -h / 2 - 0.04, 0.08], round: true }));
      parts.push(part(ico(0.03, 0), FLOWERS[i % FLOWERS.length]!, { pos: [fx + 0.015, -h / 2 - 0.01, 0.11] }));
    }
  }
  return parts;
}

/** A front door with a frame, a step and a little lamp; built facing south at the origin (bottom at y = 0). */
export function doorPiece(color: number, w = 0.24, h = 0.42, o: { step?: boolean; lamp?: boolean; glassTop?: boolean } = {}): Parts {
  const parts: Parts = [
    part(bevelBox(w + 0.08, h + 0.05, 0.05, 0.012), TRIM, { pos: [0, h / 2, 0.015] }),
    part(bevelBox(w, h, 0.05, 0.01), color, { pos: [0, h / 2 - 0.005, 0.03], pattern: PAT.boards }),
    part(cyl(0.012, 0.012, 0.02, 5), 0xf2d38c, { pos: [w * 0.32, h * 0.48, 0.065], rot: [Math.PI / 2, 0, 0] }),
  ];
  if (o.glassTop) parts.push(part(box(w * 0.7, h * 0.22, 0.02), GLASS, { pos: [0, h * 0.78, 0.058], pattern: PAT.glass }));
  if (o.step !== false) parts.push(part(bevelBox(w + 0.16, 0.05, 0.14, 0.012), PAINT.stone, { pos: [0, 0.025, 0.08], pattern: PAT.stone }));
  if (o.lamp) parts.push(part(box(0.05, 0.07, 0.05), 0xffe7a8, { pos: [w / 2 + 0.08, h * 0.8, 0.05], pattern: PAT.glow }), part(box(0.065, 0.015, 0.065), METAL, { pos: [w / 2 + 0.08, h * 0.8 + 0.042, 0.05] }));
  return parts;
}

/**
 * A pitched roof over a w × d box centred at (cx, cz), eaves at height y, ridge along x: two tiled
 * slopes with an overhang, a ridge cap, white bargeboards and gable ends painted like the walls.
 */
export function gableRoof(cx: number, cz: number, w: number, d: number, y: number, color: number, o: { overhang?: number; pitch?: number; gable?: number } = {}): Parts {
  const overhang = o.overhang ?? 0.12, pitch = o.pitch ?? 0.6;
  const rise = Math.tan(pitch) * (d / 2);
  const half = d / 2 + overhang, len = half / Math.cos(pitch);
  const drop = Math.tan(pitch) * overhang;
  const t = 0.07;
  const dark = new THREE.Color(color).multiplyScalar(0.78).getHex();
  return [
    part(prism(w, d, rise), o.gable ?? WHITE, { pos: [cx, y, cz], pattern: o.gable === undefined ? tinted(PAT.siding) : PAT.siding }),
    part(box(w + overhang * 2, t, len), color, { pos: [cx, y - drop + (Math.sin(pitch) * len) / 2 + t / 2, cz - (Math.cos(pitch) * len) / 2], rot: [-pitch, 0, 0], pattern: PAT.tiles }),
    part(box(w + overhang * 2, t, len), color, { pos: [cx, y - drop + (Math.sin(pitch) * len) / 2 + t / 2, cz + (Math.cos(pitch) * len) / 2], rot: [pitch, 0, 0], pattern: PAT.tiles }),
    part(cyl(0.05, 0.05, w + overhang * 2 + 0.03, 6), dark, { pos: [cx, y + rise + t * 0.85, cz], rot: [0, 0, Math.PI / 2] }),
    ...[-1, 1].flatMap(sx => [-1, 1].map(sz => part(box(0.04, 0.06, len + 0.02), TRIM, { pos: [cx + sx * (w / 2 + overhang + 0.005), y - drop + (Math.sin(pitch) * len) / 2 + 0.015, cz + sz * (Math.cos(pitch) * len) / 2], rot: [sz * pitch, 0, 0] }))),
  ];
}

/** A hipped roof (sloping on all four sides) over a w × d box, eaves at y. */
export function hipRoof(cx: number, cz: number, w: number, d: number, y: number, h: number, color: number, overhang = 0.12): Parts {
  const ww = w + overhang * 2, dd = d + overhang * 2;
  const g = new THREE.CylinderGeometry(0.04, Math.SQRT1_2, 1, 4, 1);
  g.rotateY(Math.PI / 4);
  return [
    part(g, color, { pos: [cx, y + h / 2 - 0.02, cz], scale: [ww, h, dd], pattern: PAT.tiles }),
    part(box(ww + 0.02, 0.04, dd + 0.02), TRIM, { pos: [cx, y - 0.02, cz] }),
  ];
}

/**
 * A flat roof: a grey deck laid in slabs, a trim cornice and a low parapet round its edge, a vent
 * and a hatch: for shops, townhouses and the apartments.
 */
export function flatRoof(cx: number, cz: number, w: number, d: number, y: number, trim = TRIM, parapet = 0.08): Parts {
  const t = 0.07, py = y + t + parapet / 2;
  return [
    part(box(w - 0.02, 0.05, d - 0.02), ROOF_DECK, { pos: [cx, y + 0.025, cz], pattern: PAT.stone }),
    ...[-1, 1].map(s => part(bevelBox(w + 0.12, t, 0.1, 0.02), trim, { pos: [cx, y + t / 2, cz + s * (d / 2)] })),
    ...[-1, 1].map(s => part(bevelBox(0.1, t, d + 0.02, 0.02), trim, { pos: [cx + s * (w / 2), y + t / 2, cz] })),
    ...[-1, 1].map(s => part(box(w + 0.06, parapet, 0.05), trim, { pos: [cx, py, cz + s * (d / 2 + 0.02)] })),
    ...[-1, 1].map(s => part(box(0.05, parapet, d + 0.06), trim, { pos: [cx + s * (w / 2 + 0.02), py, cz] })),
    part(bevelBox(0.2, 0.12, 0.15, 0.02), 0xd3d8dc, { pos: [cx + w * 0.26, y + 0.1, cz - d * 0.22] }),
    part(box(0.12, 0.012, 0.09), 0x8c949a, { pos: [cx + w * 0.26, y + 0.165, cz - d * 0.22] }),
    part(bevelBox(0.18, 0.05, 0.18, 0.015), 0x7d868c, { pos: [cx - w * 0.3, y + 0.07, cz + d * 0.22] }),
  ];
}
const ROOF_DECK = 0x9fabad;

/** Corner boards on a w × d box from y0 to y1. */
export function corners(cx: number, cz: number, w: number, d: number, y0: number, y1: number, color = TRIM): Parts {
  const h = y1 - y0;
  return [-1, 1].flatMap(sx => [-1, 1].map(sz => part(box(0.05, h, 0.05), color, { pos: [cx + sx * (w / 2), y0 + h / 2, cz + sz * (d / 2)] })));
}

/** A low white picket fence along x from x0 to x1 at z, with a gap for a gate between g0 and g1. */
export function picketFence(x0: number, x1: number, z: number, gap?: [number, number], color = TRIM): Parts {
  const parts: Parts = [];
  const n = Math.round((x1 - x0) / 0.09);
  for (let i = 0; i <= n; i++) {
    const x = x0 + (i / n) * (x1 - x0);
    if (gap && x > gap[0] && x < gap[1]) continue;
    parts.push(part(box(0.035, 0.17, 0.02), color, { pos: [x, 0.085, z] }));
  }
  const rail = (a: number, b: number) => [0.06, 0.13].map(y => part(box(b - a, 0.025, 0.018), color, { pos: [(a + b) / 2, y, z - 0.015] }));
  if (gap) parts.push(...rail(x0, gap[0]), ...rail(gap[1], x1));
  else parts.push(...rail(x0, x1));
  return parts;
}

/** A clipped hedge from x0 to x1 (along x) at z. */
export function hedge(x0: number, x1: number, z: number, h = 0.2, depth = 0.16): Parts {
  return [
    part(bevelBox(x1 - x0, h, depth, 0.05), LEAF_DARK, { pos: [(x0 + x1) / 2, h / 2, z] }),
    part(bevelBox(x1 - x0 - 0.02, 0.05, depth - 0.02, 0.02), LEAF, { pos: [(x0 + x1) / 2, h + 0.01, z] }),
  ];
}

/** A round bush with a few flowers. */
export function shrub(x: number, z: number, r = 0.12, flower?: number): Parts {
  const parts: Parts = [
    part(ico(r, 1), LEAF_DARK, { pos: [x, r * 0.8, z], scale: [1.1, 0.85, 1], round: true }),
    part(ico(r * 0.7, 0), LEAF, { pos: [x + r * 0.3, r * 1.2, z + r * 0.2], round: true }),
  ];
  if (flower !== undefined) for (let i = 0; i < 4; i++) {
    const a = i * 1.7 + x * 3;
    parts.push(part(new THREE.OctahedronGeometry(r * 0.22, 0), flower, { pos: [x + Math.cos(a) * r * 0.8, r * (1.05 + (i % 2) * 0.3), z + Math.sin(a) * r * 0.7 + r * 0.2] }));
  }
  return parts;
}

/** Stepping stones from the door to the front edge of the lot. */
export function steppingStones(x: number, z0: number, z1: number): Parts {
  const parts: Parts = [];
  const n = Math.max(2, Math.round((z1 - z0) / 0.16));
  for (let i = 0; i < n; i++) parts.push(part(cyl(0.075, 0.08, 0.025, 7), PAINT.stone, { pos: [x + (i % 2 ? 0.02 : -0.02), 0.012, z0 + ((i + 0.5) / n) * (z1 - z0)], scale: [1.2, 1, 0.8], pattern: PAT.stone }));
  return parts;
}

/** A chimney of brick with a cap. */
export function chimney(x: number, z: number, y0: number, h: number): Parts {
  return [
    part(box(0.16, h, 0.16), PAINT.brick, { pos: [x, y0 + h / 2, z], pattern: PAT.brick }),
    part(bevelBox(0.21, 0.05, 0.21, 0.01), 0x8c847a, { pos: [x, y0 + h + 0.02, z] }),
  ];
}
