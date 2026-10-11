/**
 * Rocket fit: the shape of each body and where every other part attaches. Pure math (no Three.js)
 * so a unit test can check that every part fits every body. The 3D builder (r3/models/rocket.ts)
 * makes each part from these numbers, which is why every combination looks right.
 *
 * Units: the body's bottom is at y = 0, the nose points up (+y), windows and cargo face +z.
 */

export interface BodyShape {
  style: string;
  height: number;
  /** Radius at the top (where the nose sits), widest point, and bottom (where the engine sits). */
  rTop: number;
  rMid: number;
  rBottom: number;
  /** Where the widest point is (0..1 of the height). */
  midAt: number;
  /** Faceted (crystal) instead of round. */
  facets: number;
  /** Window rows: [y fraction, radius fraction of body radius]. */
  windows: Array<[number, number]>;
}

export const BODY_SHAPES: Record<string, BodyShape> = {
  classic: { style: 'classic', height: 2.2, rTop: 0.42, rMid: 0.52, rBottom: 0.46, midAt: 0.45, facets: 0, windows: [[0.68, 0.36]] },
  chubby: { style: 'chubby', height: 2.0, rTop: 0.5, rMid: 0.66, rBottom: 0.54, midAt: 0.42, facets: 0, windows: [[0.66, 0.36]] },
  slim: { style: 'slim', height: 2.5, rTop: 0.33, rMid: 0.38, rBottom: 0.36, midAt: 0.5, facets: 0, windows: [[0.72, 0.42]] },
  capsule: { style: 'capsule', height: 2.25, rTop: 0.46, rMid: 0.56, rBottom: 0.5, midAt: 0.45, facets: 0, windows: [[0.74, 0.3], [0.55, 0.26], [0.38, 0.22]] },
  armor: { style: 'armor', height: 2.2, rTop: 0.44, rMid: 0.54, rBottom: 0.5, midAt: 0.45, facets: 0, windows: [[0.68, 0.32]] },
  crystal: { style: 'crystal', height: 2.3, rTop: 0.42, rMid: 0.56, rBottom: 0.46, midAt: 0.5, facets: 8, windows: [[0.7, 0.34]] },
};

export function bodyShape(style: string): BodyShape {
  return BODY_SHAPES[style] ?? BODY_SHAPES.classic;
}

/** Body radius at height y (0..height). Smooth bulge: bottom → widest → top. */
export function radiusAt(b: BodyShape, y: number): number {
  const t = Math.min(1, Math.max(0, y / b.height));
  if (t <= b.midAt) {
    const u = t / b.midAt;
    const e = Math.sin((u * Math.PI) / 2);
    return b.rBottom + (b.rMid - b.rBottom) * e;
  }
  const u = (t - b.midAt) / (1 - b.midAt);
  const e = 1 - Math.cos((u * Math.PI) / 2);
  return b.rMid + (b.rTop - b.rMid) * e;
}

/** Lathe profile points [radius, y] from bottom to top, with small rounded lips at both ends. */
export function bodyProfile(b: BodyShape, steps = 24): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  pts.push([0, 0]);
  pts.push([b.rBottom * 0.9, 0]);
  for (let i = 0; i <= steps; i++) {
    const y = (i / steps) * b.height;
    pts.push([radiusAt(b, y), y]);
  }
  pts.push([b.rTop * 0.92, b.height + 0.01]);
  pts.push([0, b.height + 0.01]);
  return pts;
}

export interface NoseShape {
  height: number;
  /** Nose radius at its base always equals the body's top radius. */
  baseScale: number;
}

const NOSES: Record<string, NoseShape> = {
  cone: { height: 0.95, baseScale: 1 },
  bubble: { height: 0.55, baseScale: 1 },
  needle: { height: 1.45, baseScale: 1 },
  star: { height: 0.9, baseScale: 1 },
  comet: { height: 0.8, baseScale: 1 },
  prism: { height: 1.1, baseScale: 1 },
};

export function noseShape(style: string): NoseShape {
  return NOSES[style] ?? NOSES.cone;
}

export interface EngineShape {
  /** Bell positions (x, z) as fractions of the body's bottom radius, and bell radius fraction. */
  bells: Array<[number, number]>;
  bellR: number;
  length: number;
}

const ENGINES: Record<string, EngineShape> = {
  single: { bells: [[0, 0]], bellR: 0.62, length: 0.5 },
  twin: { bells: [[-0.45, 0], [0.45, 0]], bellR: 0.4, length: 0.45 },
  ion: { bells: [[0, 0]], bellR: 0.55, length: 0.62 },
  triple: { bells: [[0, -0.48], [-0.42, 0.24], [0.42, 0.24]], bellR: 0.36, length: 0.45 },
  turbo: { bells: [[0, 0]], bellR: 0.86, length: 0.62 },
  star: { bells: [[0, 0]], bellR: 0.66, length: 0.55 },
};

export function engineShape(style: string): EngineShape {
  return ENGINES[style] ?? ENGINES.single;
}

/** Engine bell centers and radius in body units for a body. */
export function enginePlacement(b: BodyShape, engineStyle: string): { bells: Array<{ x: number; z: number; r: number }>; length: number } {
  const e = engineShape(engineStyle);
  const R = b.rBottom;
  return { bells: e.bells.map(([x, z]) => ({ x: x * R, z: z * R, r: e.bellR * R })), length: e.length };
}

export interface FinShape {
  /** Fin angles around the body (radians, 0 = +x). */
  angles: number[];
  /** Root length along the body (fraction of height), how far it sticks out (fraction of body radius), sweep. */
  root: number;
  span: number;
  sweep: number;
  /** Fins start this far below the body's bottom (as fraction of height). */
  drop: number;
}

const THREE = [Math.PI / 2 + Math.PI, Math.PI / 2 + Math.PI + (2 * Math.PI) / 3, Math.PI / 2 + Math.PI - (2 * Math.PI) / 3];
const FINS: Record<string, FinShape> = {
  basic: { angles: THREE, root: 0.34, span: 0.85, sweep: 0.35, drop: 0.06 },
  swept: { angles: THREE, root: 0.4, span: 0.95, sweep: 0.75, drop: 0.1 },
  round: { angles: THREE, root: 0.34, span: 0.75, sweep: 0.3, drop: 0.04 },
  wing: { angles: [0, Math.PI, -Math.PI / 2], root: 0.5, span: 1.5, sweep: 0.55, drop: -0.02 },
  quad: { angles: [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4], root: 0.3, span: 0.7, sweep: 0.4, drop: 0.06 },
  star: { angles: THREE, root: 0.36, span: 0.9, sweep: 0.45, drop: 0.06 },
};

export function finShape(style: string): FinShape {
  return FINS[style] ?? FINS.basic;
}

/** Fin root placement for a body: where the fin meets the body (y range) and the body radius there. */
export function finPlacement(b: BodyShape, finStyle: string): { y0: number; y1: number; rootR: number; span: number; fin: FinShape } {
  const f = finShape(finStyle);
  const y0 = -f.drop * b.height;
  const y1 = y0 + f.root * b.height;
  const rootR = Math.min(radiusAt(b, Math.max(0, y0)), radiusAt(b, y1));
  // Wings get a bit smaller on tiny bodies and are capped so they never look silly.
  const span = Math.min(f.span * b.rMid, 0.95);
  return { y0, y1, rootR, span, fin: f };
}

export type TankKind = 'none' | 'band' | 'pods';

const TANKS: Record<string, { kind: TankKind; podR: number; podLen: number }> = {
  mini: { kind: 'band', podR: 0, podLen: 0 },
  pods: { kind: 'pods', podR: 0.16, podLen: 0.95 },
  belly: { kind: 'band', podR: 0.12, podLen: 0 },
  boosters: { kind: 'pods', podR: 0.17, podLen: 1.1 },
  ice: { kind: 'pods', podR: 0.17, podLen: 0.95 },
  glow: { kind: 'pods', podR: 0.16, podLen: 0.9 },
};

/** Side pods sit beside the body with a small gap; returns their center x and height range. */
export function tankPlacement(b: BodyShape, tankStyle: string): { kind: TankKind; x: number; y0: number; y1: number; r: number; gap: number } {
  const t = TANKS[tankStyle] ?? TANKS.mini;
  if (t.kind !== 'pods') return { kind: t.kind, x: 0, y0: b.height * 0.42, y1: b.height * 0.42, r: t.podR, gap: 0 };
  const y0 = b.height * 0.08;
  const y1 = y0 + t.podLen;
  // Widest body radius along the pod.
  let maxR = 0;
  for (let i = 0; i <= 10; i++) maxR = Math.max(maxR, radiusAt(b, y0 + ((y1 - y0) * i) / 10));
  const gap = 0.06;
  return { kind: 'pods', x: maxR + gap + t.podR, y0, y1, r: t.podR, gap };
}

/** Side pods go left/right, unless big wings are there: then they move to the front corners. */
export function podAngles(finStyle: string): number[] {
  return finStyle === 'wing' ? [Math.PI / 4, (3 * Math.PI) / 4] : [0, Math.PI];
}

/** Smallest angle between two directions around the body. */
export function angleGap(a: number, b: number): number {
  const d = Math.abs(((a - b) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  return Math.min(d, Math.PI * 2 - d);
}

/** Where cargo goes: low on the window side (+z), hugging the body. */
export function cargoPlacement(b: BodyShape): { y: number; r: number } {
  const y = b.height * 0.24;
  return { y, r: radiusAt(b, y) };
}

/** Rough overall size (for framing cameras and thumbnails). */
export function rocketExtent(bodyStyle: string, noseStyle: string, engineStyle: string, finStyle: string, tankStyle: string): { bottom: number; top: number; halfWidth: number } {
  const b = bodyShape(bodyStyle);
  const n = noseShape(noseStyle);
  const e = enginePlacement(b, engineStyle);
  const f = finPlacement(b, finStyle);
  const t = tankPlacement(b, tankStyle);
  const halfWidth = Math.max(b.rMid, f.rootR + f.span, t.kind === 'pods' ? t.x + t.r : 0);
  return { bottom: Math.min(-e.length, f.y0), top: b.height + n.height, halfWidth };
}
