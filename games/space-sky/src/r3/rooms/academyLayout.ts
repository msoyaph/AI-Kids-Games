import { Box3, Vector3 } from 'three';

/**
 * Where everything in the Academy diorama is (units ≈ meters, +y up, the open fronts face +z).
 * Two floors of three rooms each on the left, a double-height hangar on the right, the launch pad
 * outside to the right of the hangar's big door.
 */

export type RoomId = 'board' | 'codex' | 'badges' | 'lounge' | 'shop' | 'lobby' | 'hangar';
export interface CameraPose { pos: Vector3; look: Vector3; fov: number }
export interface CrewSpot { pos: Vector3; rotY: number; room: RoomId; seated?: boolean }

export const ROOM_IDS: RoomId[] = ['board', 'codex', 'badges', 'lounge', 'shop', 'lobby', 'hangar'];

/** Wall thickness. */
export const WT = 0.5;
/** Interior room width / depth / height. */
export const RW = 11;
export const RD = 9;
export const RH = 6.4;
/** Floor slab between the floors. */
export const SLAB = 0.7;
/** Top of the ground floor, of the upper floor, the ceiling of the upper floor and the roof top. */
export const F0 = 0.5;
export const F1 = F0 + RH + SLAB;
export const CEIL = F1 + RH;
export const ROOF = CEIL + SLAB;
/** Back wall inner face (rooms run from BACK to the open front at z = 0). */
export const BACK = -RD;
/** Column x ranges of the three main-block rooms, then the hangar. */
export const COLS: Array<[number, number]> = [
  [-27.5, -16.5],
  [-16, -5],
  [-4.5, 6.5],
];
export const HANGAR_X: [number, number] = [7, 22];
/** Outer faces of the building's side walls. */
export const LEFT_OUT = COLS[0][0] - WT;
export const RIGHT_OUT = HANGAR_X[1] + WT;
/** The hangar's big door in its right wall (z range, top). */
export const DOOR_Z: [number, number] = [-8, -1.2];
export const DOOR_TOP = F0 + 10;
/** Launch pad center (ground level) and gantry tower base. */
export const PAD = new Vector3(37, 0.25, -4.5);
export const GANTRY = new Vector3(37, 0.25, -11.5);
/** The hangar's barrel roof: circle center (x, y) and inner/outer radius (springs from CEIL at the walls). */
export const ARCH = { x: (HANGAR_X[0] + HANGAR_X[1]) / 2, y: 7.99 + (F0 - 0.5), ri: 9.61, ro: 10.2 };
export function archInnerY(x: number): number {
  const dx = x - ARCH.x;
  return ARCH.y + Math.sqrt(Math.max(0, ARCH.ri * ARCH.ri - dx * dx));
}

/** Height of the sofa seats in the lounge (for seated crew). */
export const SEAT_H = 0.66;

const cx = (c: [number, number]) => (c[0] + c[1]) / 2;

function box(x: [number, number], y0: number, y1: number): Box3 {
  return new Box3(new Vector3(x[0], y0, BACK), new Vector3(x[1], y1, 0));
}

export function roomBoxes(): Record<RoomId, Box3> {
  return {
    board: box(COLS[0], F1, CEIL),
    codex: box(COLS[1], F1, CEIL),
    badges: box(COLS[2], F1, CEIL),
    lounge: box(COLS[0], F0, F0 + RH),
    shop: box(COLS[1], F0, F0 + RH),
    lobby: box(COLS[2], F0, F0 + RH),
    hangar: box(HANGAR_X, F0, CEIL),
  };
}

/** Room centers (x) and floors. */
export const ROOM_X: Record<RoomId, number> = {
  board: cx(COLS[0]),
  codex: cx(COLS[1]),
  badges: cx(COLS[2]),
  lounge: cx(COLS[0]),
  shop: cx(COLS[1]),
  lobby: cx(COLS[2]),
  hangar: cx(HANGAR_X),
};
export const ROOM_FLOOR: Record<RoomId, number> = { board: F1, codex: F1, badges: F1, lounge: F0, shop: F0, lobby: F0, hangar: F0 };

const v = (x: number, y: number, z: number) => new Vector3(x, y, z);

/** The hub's establishing shot (16:9): the whole building, the pad and some hill in front. */
export function overviewPose(): CameraPose {
  return { pos: v(7, 16.5, 72), look: v(7, 11.4, -4), fov: 34 };
}

/** Looking into each room from just in front of its open side, a little above eye level. */
export function roomPoses(): Record<RoomId, CameraPose> {
  const p = (id: RoomId, dist = 10.5, up = 3.3, lookUp = 2.5, fov = 46): CameraPose => {
    const x = ROOM_X[id];
    const f = ROOM_FLOOR[id];
    return { pos: v(x, f + up, dist), look: v(x, f + lookUp, -4.5), fov };
  };
  return {
    board: p('board'),
    codex: p('codex'),
    badges: p('badges'),
    lounge: p('lounge'),
    shop: p('shop'),
    lobby: p('lobby'),
    hangar: { pos: v(ROOM_X.hangar + 0.5, F0 + 6.2, 17.5), look: v(ROOM_X.hangar + 0.5, F0 + 4.6, -4.5), fov: 46 },
  };
}

/** Vertical fov that keeps a 16:9 pose's horizontal view on narrower screens (4:3 tablets). */
export function fitFov(fov: number, aspect: number, designAspect = 16 / 9): number {
  if (aspect >= designAspect) return fov;
  const t = Math.tan((fov * Math.PI) / 360) * (designAspect / aspect);
  return (Math.atan(t) * 360) / Math.PI;
}

/** Lounge decoration spots (bought decor appears here, in order). */
export function decorSpots(): Array<{ pos: Vector3; rotY: number }> {
  const x0 = COLS[0][0];
  const f = F0;
  return [
    { pos: v(x0 + 7.4, f, -2.4), rotY: -0.3 }, // 1 front right of the coffee table
    { pos: v(x0 + 3.0, f, -2.6), rotY: 0.2 }, // 2 front left
    { pos: v(x0 + 9.9, f, -7.6), rotY: -0.6 }, // 3 back right corner
    { pos: v(x0 + 1.4, f, -4.6), rotY: 0.9 }, // 4 left wall, middle
    { pos: v(x0 + 9.9, f, -4.4), rotY: -1.2 }, // 5 right wall, middle
    { pos: v(x0 + 5.4, f, -1.3), rotY: 0 }, // 6 front center
    { pos: v(x0 + 1.3, f, -1.1), rotY: 0.5 }, // 7 front left corner
    { pos: v(x0 + 9.8, f, -1.2), rotY: -0.5 }, // 8 front right corner
    { pos: v(x0 + 8.6, f, -6.2), rotY: -0.4 }, // 9 next to the sofa, right
    { pos: v(x0 + 2.4, f, -6.6), rotY: 0.5 }, // 10 next to the snack machine
  ];
}

export function crewSpots(): Record<string, CrewSpot> {
  const b = COLS[0][0];
  const c = COLS[1][0];
  const h = HANGAR_X[0];
  const l = COLS[2][0];
  return {
    stella: { pos: v(b + 6.9, F1, -3.4), rotY: -0.25, room: 'board' },
    pip: { pos: v(b + 7.6, F0, -4.6), rotY: -0.45, room: 'lounge' },
    // Seated: feet on the floor just in front of the sofa's second cushion (seat top at SEAT_H, cushion center 0.75 behind).
    rio: { pos: v(b + 4.2, F0, BACK + 1.75), rotY: 0, room: 'lounge', seated: true },
    zibbo: { pos: v(b + 3.4, F0, -3.6), rotY: 0.55, room: 'lounge' },
    boltzy: { pos: v(h + 4.0, F0, -2.4), rotY: 0.45, room: 'hangar' },
    pots: { pos: v(c + 2.3, F0, -5.6), rotY: 0.35, room: 'shop' },
    tuggy: { pos: v(l + 8.9, F0 + 0.75, -6.2), rotY: -0.5, room: 'lobby' },
    ollo: { pos: v(c + 3.0, F1, -4.4), rotY: 0.4, room: 'codex' },
  };
}
