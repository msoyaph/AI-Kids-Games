// Home: tent -> cottage -> house upgrades paid by loans, sleeping, interior furniture grid, surfaces.
import { BASEMENT_ROOM, HOME_TIERS } from '../data/economy';
import { item } from '../data/registry';
import type { Game } from './game';
import { addToStorage, money, removeAt, stat } from './inventory';
import type { HomeRoomData, PlacedFurniture, Structure, WallItem } from './state';
import { WAKE_MINUTE } from './clock';
import { learnRecipe } from './crafting';
import { STARTER_RECIPES } from '../data/recipes';

export function homeTier(level: number) {
  return HOME_TIERS[Math.max(0, Math.min(HOME_TIERS.length - 1, level))]!;
}

/** Which floor of the home: the main room or the basement (defaults to where the player is). */
export type HomeFloor = 'home' | 'basement';
const floorOf = (g: Game, kind?: string): HomeFloor => ((kind ?? g.state.player.location) === 'basement' ? 'basement' : 'home');

/** Furniture, walls and surfaces of a floor (the basement has its own). */
export function homeData(g: Game, kind?: string): HomeRoomData {
  const h = g.state.home;
  if (floorOf(g, kind) === 'basement') {
    h.basement ??= { furniture: [], walls: [], wallpaper: 'wall_birch_panel', flooring: 'floor_honey_planks' };
    return h.basement;
  }
  return h;
}

export function roomSize(g: Game, kind?: string): { w: number; d: number } {
  if (floorOf(g, kind) === 'basement') return BASEMENT_ROOM;
  return homeTier(g.state.home.level).room;
}

export type HomeFixtureId = 'bed' | 'chest' | 'stairsDown' | 'stairsUp';

/** Built-in fixtures that furniture can't overlap. */
export function homeFixtures(g: Game, kind?: string): { id: HomeFixtureId; x: number; z: number; w: number; d: number }[] {
  const { w, d } = roomSize(g, kind);
  if (floorOf(g, kind) === 'basement') return [{ id: 'stairsUp', x: 0, z: 0, w: 2, d: 1 }];
  const big = g.state.home.level >= 1;
  const out: { id: HomeFixtureId; x: number; z: number; w: number; d: number }[] = [
    { id: 'bed', x: 0, z: 0, w: 2, d: big ? 2 : 1 },
    { id: 'chest', x: w - 1, z: 0, w: 1, d: 1 },
  ];
  if (g.state.home.level >= 3) out.push({ id: 'stairsDown', x: w - 1, z: d - 1, w: 1, d: 1 });
  return out;
}

export function doorTile(g: Game, kind?: string): { x: number; z: number } {
  // the basement has no door outside — you leave by the stairs
  if (floorOf(g, kind) === 'basement') return { x: -10, z: -10 };
  const { w, d } = roomSize(g, kind);
  return { x: Math.floor(w / 2), z: d - 1 };
}

export function footprint(id: string, rot: number): { w: number; d: number } {
  const f = item(id).furn;
  const w = f?.w ?? 1, d = f?.d ?? 1;
  return rot % 2 === 1 ? { w: d, d: w } : { w, d };
}

export function canPlace(g: Game, id: string, x: number, z: number, rot: number, ignoreUid = -1): boolean {
  const def = item(id);
  if (!def.furn || def.furn.layer === 'wall') return false;
  const { w: rw, d: rd } = roomSize(g);
  const fp = footprint(id, rot);
  if (x < 0 || z < 0 || x + fp.w > rw || z + fp.d > rd) return false;
  const overlaps = (ax: number, az: number, aw: number, ad: number) => x < ax + aw && x + fp.w > ax && z < az + ad && z + fp.d > az;
  const rug = !!def.furn.rug;
  if (!rug) {
    for (const fx of homeFixtures(g)) if (overlaps(fx.x, fx.z, fx.w, fx.d)) return false;
    const door = doorTile(g);
    if (overlaps(door.x, door.z, 1, 1)) return false;
  }
  for (const pf of homeData(g).furniture) {
    if (pf.uid === ignoreUid || pf.on !== undefined) continue;
    const other = item(pf.id).furn;
    if (!other) continue;
    if (!!other.rug !== rug) continue; // rugs layer under furniture
    const ofp = footprint(pf.id, pf.rot);
    if (overlaps(pf.x, pf.z, ofp.w, ofp.d)) return false;
  }
  return true;
}

export function furnitureAt(g: Game, x: number, z: number, preferSolid = true): PlacedFurniture | undefined {
  const hits = homeData(g).furniture.filter((pf) => {
    if (pf.on !== undefined) return false;
    const fp = footprint(pf.id, pf.rot);
    return x >= pf.x && x < pf.x + fp.w && z >= pf.z && z < pf.z + fp.d;
  });
  if (!hits.length) return undefined;
  if (preferSolid) return hits.find((h) => !item(h.id).furn?.rug) ?? hits[0];
  return hits[0];
}

/** Place furniture from a pocket slot (or a storage index). */
export function placeFromPockets(g: Game, slot: number, x: number, z: number, rot: number): boolean {
  const s = g.state.player.inv[slot];
  if (!s || !canPlace(g, s.id, x, z, rot)) return false;
  const id = s.id;
  removeAt(g, slot, 1, 'place');
  addPlaced(g, id, x, z, rot);
  return true;
}

export function placeFromStorage(g: Game, index: number, x: number, z: number, rot: number): boolean {
  const s = g.state.home.storage[index];
  if (!s || !canPlace(g, s.id, x, z, rot)) return false;
  s.qty -= 1;
  if (s.qty <= 0) g.state.home.storage.splice(index, 1);
  addPlaced(g, s.id, x, z, rot);
  return true;
}

function addPlaced(g: Game, id: string, x: number, z: number, rot: number, on?: { parent: number; slot: number }): PlacedFurniture {
  const h = g.state.home;
  const pf: PlacedFurniture = { uid: h.nextUid++, id, x, z, rot };
  if (on) {
    pf.on = on.parent;
    pf.slot = on.slot;
  }
  homeData(g).furniture.push(pf);
  stat(g, 'furniturePlaced');
  g.emit('furniturePlaced', { id, where: 'home' });
  g.emit('sfx', { name: 'place' });
  return pf;
}

export function moveFurniture(g: Game, uid: number, x: number, z: number, rot: number): boolean {
  const pf = homeData(g).furniture.find((f) => f.uid === uid);
  if (!pf || !canPlace(g, pf.id, x, z, rot, uid)) return false;
  pf.x = x;
  pf.z = z;
  pf.rot = rot;
  // small items riding on top keep their slot
  for (const child of homeData(g).furniture) if (child.on === uid) Object.assign(child, slotTile(pf, child.slot ?? 0));
  g.emit('sfx', { name: 'place' });
  return true;
}

export function storeFurniture(g: Game, uid: number, kind?: string): boolean {
  const h = homeData(g, kind);
  const i = h.furniture.findIndex((f) => f.uid === uid);
  if (i < 0) return false;
  const [pf] = h.furniture.splice(i, 1);
  addToStorage(g, pf!.id, 1);
  // anything sitting on it goes to storage too
  for (const child of h.furniture.filter((f) => f.on === uid)) {
    h.furniture.splice(h.furniture.indexOf(child), 1);
    addToStorage(g, child.id, 1);
  }
  g.emit('sfx', { name: 'pickup' });
  return true;
}

// ---------------- surfaces: small items on tables, desks, dressers and shelves ----------------

/** Height (and back offset) of a piece's top if small items can sit on it. */
export function surfaceTop(id: string): { y: number; z: number } | null {
  const f = item(id).furn;
  if (!f) return null;
  switch (f.model) {
    case 'table':
    case 'desk':
      return { y: 0.72, z: 0 };
    case 'dresser':
      return { y: 0.92, z: -0.2 };
    case 'shelf':
    case 'bookcase':
      return { y: 1.32, z: -0.25 };
    case 'box':
      return { y: 0.55, z: 0 };
    default:
      return null;
  }
}

export function isSmall(id: string): boolean {
  return item(id).furn?.layer === 'small';
}

/** The floor tile under surface slot `slot` of `parent` (slots run row by row over its footprint). */
export function slotTile(parent: PlacedFurniture, slot: number): { x: number; z: number } {
  const fp = footprint(parent.id, parent.rot);
  return { x: parent.x + (slot % fp.w), z: parent.z + Math.floor(slot / fp.w) };
}

/** Surface piece under floor tile (x,z), and which slot that tile is. */
export function surfaceAt(g: Game, x: number, z: number): { parent: PlacedFurniture; slot: number } | null {
  for (const pf of homeData(g).furniture) {
    if (pf.on !== undefined || !surfaceTop(pf.id)) continue;
    const fp = footprint(pf.id, pf.rot);
    if (x >= pf.x && x < pf.x + fp.w && z >= pf.z && z < pf.z + fp.d) return { parent: pf, slot: (z - pf.z) * fp.w + (x - pf.x) };
  }
  return null;
}

export function itemOnSlot(g: Game, parentUid: number, slot: number): PlacedFurniture | undefined {
  return homeData(g).furniture.find((f) => f.on === parentUid && f.slot === slot);
}

export function canPlaceOnSurface(g: Game, id: string, parentUid: number, slot: number, ignoreUid = -1): boolean {
  if (!isSmall(id)) return false;
  const parent = homeData(g).furniture.find((f) => f.uid === parentUid && f.on === undefined);
  if (!parent || !surfaceTop(parent.id)) return false;
  const fp = footprint(parent.id, parent.rot);
  if (slot < 0 || slot >= fp.w * fp.d) return false;
  const other = itemOnSlot(g, parentUid, slot);
  return !other || other.uid === ignoreUid;
}

export type ItemSource = { kind: 'pocket' | 'storage'; index: number };

function takeFrom(g: Game, src: ItemSource): string | null {
  if (src.kind === 'pocket') {
    const s = g.state.player.inv[src.index];
    if (!s) return null;
    removeAt(g, src.index, 1, 'place');
    return s.id;
  }
  const s = g.state.home.storage[src.index];
  if (!s) return null;
  s.qty -= 1;
  if (s.qty <= 0) g.state.home.storage.splice(src.index, 1);
  return s.id;
}

function sourceId(g: Game, src: ItemSource): string | null {
  return (src.kind === 'pocket' ? g.state.player.inv[src.index]?.id : g.state.home.storage[src.index]?.id) ?? null;
}

export function placeOnSurface(g: Game, src: ItemSource, parentUid: number, slot: number): boolean {
  const id = sourceId(g, src);
  if (!id || !canPlaceOnSurface(g, id, parentUid, slot)) return false;
  takeFrom(g, src);
  const parent = homeData(g).furniture.find((f) => f.uid === parentUid)!;
  const t = slotTile(parent, slot);
  addPlaced(g, id, t.x, t.z, 0, { parent: parentUid, slot });
  return true;
}

/** Move a placed small item onto a surface slot, or (parent -1) down onto the floor. */
export function moveSmall(g: Game, uid: number, parentUid: number, slot: number, x = 0, z = 0, rot = 0): boolean {
  const pf = homeData(g).furniture.find((f) => f.uid === uid);
  if (!pf) return false;
  if (parentUid >= 0) {
    if (parentUid === uid || !canPlaceOnSurface(g, pf.id, parentUid, slot, uid)) return false;
    const parent = homeData(g).furniture.find((f) => f.uid === parentUid)!;
    const t = slotTile(parent, slot);
    Object.assign(pf, { on: parentUid, slot, x: t.x, z: t.z, rot: 0 });
  } else {
    if (!canPlace(g, pf.id, x, z, rot, uid)) return false;
    delete pf.on;
    delete pf.slot;
    Object.assign(pf, { x, z, rot });
  }
  g.emit('sfx', { name: 'place' });
  return true;
}

// ---------------- walls ----------------

export const WALL_NAMES = ['back wall', 'left wall', 'right wall'];

/** Tiles along a wall (back = room width, sides = room depth). */
export function wallLength(g: Game, wall: number): number {
  const { w, d } = roomSize(g);
  return wall === 0 ? w : d;
}

export function canPlaceWall(g: Game, id: string, wall: number, pos: number, ignoreUid = -1): boolean {
  const f = item(id).furn;
  if (!f || f.layer !== 'wall' || wall < 0 || wall > 2) return false;
  const len = f.w;
  if (pos < 0 || pos + len > wallLength(g, wall)) return false;
  for (const wi of homeData(g).walls) {
    if (wi.uid === ignoreUid || wi.wall !== wall) continue;
    const ol = item(wi.id).furn?.w ?? 1;
    if (pos < wi.pos + ol && pos + len > wi.pos) return false;
  }
  return true;
}

export function placeWall(g: Game, src: ItemSource, wall: number, pos: number): boolean {
  const id = sourceId(g, src);
  if (!id || !canPlaceWall(g, id, wall, pos)) return false;
  takeFrom(g, src);
  const h = g.state.home;
  homeData(g).walls.push({ uid: h.nextUid++, id, wall, pos });
  stat(g, 'furniturePlaced');
  g.emit('furniturePlaced', { id, where: 'home' });
  g.emit('sfx', { name: 'place' });
  return true;
}

export function moveWall(g: Game, uid: number, wall: number, pos: number): boolean {
  const wi = homeData(g).walls.find((x) => x.uid === uid);
  if (!wi || !canPlaceWall(g, wi.id, wall, pos, uid)) return false;
  wi.wall = wall;
  wi.pos = pos;
  g.emit('sfx', { name: 'place' });
  return true;
}

export function storeWall(g: Game, uid: number): boolean {
  const i = homeData(g).walls.findIndex((x) => x.uid === uid);
  if (i < 0) return false;
  const [wi] = homeData(g).walls.splice(i, 1);
  addToStorage(g, wi!.id, 1);
  g.emit('sfx', { name: 'pickup' });
  return true;
}

export function wallItemAt(g: Game, wall: number, pos: number): WallItem | undefined {
  return homeData(g).walls.find((wi) => wi.wall === wall && pos >= wi.pos && pos < wi.pos + (item(wi.id).furn?.w ?? 1));
}

// ---------------- undo ----------------

/** Everything a decorating edit can change, as a compact snapshot string. */
export function homeSnapshot(g: Game): string {
  const h = g.state.home;
  return JSON.stringify({ f: homeData(g).furniture, w: homeData(g).walls, s: h.storage, i: g.state.player.inv, wp: homeData(g).wallpaper, fl: homeData(g).flooring, n: h.nextUid });
}

export function restoreHomeSnapshot(g: Game, snap: string): void {
  const o = JSON.parse(snap);
  const h = g.state.home;
  homeData(g).furniture = o.f;
  homeData(g).walls = o.w;
  h.storage = o.s;
  g.state.player.inv = o.i;
  homeData(g).wallpaper = o.wp;
  homeData(g).flooring = o.fl;
  h.nextUid = o.n;
  g.emit('inventoryChanged', {});
}

/** Apply wallpaper/flooring from pockets; the old one goes to storage. */
export function applySurface(g: Game, slot: number): boolean {
  const s = g.state.player.inv[slot];
  if (!s) return false;
  const def = item(s.id);
  if (def.cat !== 'wallpaper' && def.cat !== 'flooring') return false;
  const old = def.cat === 'wallpaper' ? homeData(g).wallpaper : homeData(g).flooring;
  removeAt(g, slot, 1, 'apply');
  if (def.cat === 'wallpaper') homeData(g).wallpaper = s.id;
  else homeData(g).flooring = s.id;
  if (old) addToStorage(g, old, 1);
  g.emit('sfx', { name: 'place' });
  return true;
}

// ---------------- upgrades + loans ----------------

export function nextUpgrade(g: Game) {
  const lvl = g.state.home.level;
  if (lvl < 0 || lvl >= HOME_TIERS.length - 1) return null;
  return HOME_TIERS[lvl + 1]!;
}

export function canOrderUpgrade(g: Game): { ok: boolean; reason?: string } {
  const h = g.state.home;
  if (h.level < 0) return { ok: false, reason: 'You need a home first.' };
  if (!nextUpgrade(g)) return { ok: false, reason: 'Your home is as big as it gets!' };
  if (h.upgradeReadyDay > 0) return { ok: false, reason: 'Construction is already underway.' };
  if (h.loan > 0) return { ok: false, reason: 'Pay off your current loan first.' };
  if (nextUpgrade(g)!.level >= 3 && !g.state.quests.finished) return { ok: false, reason: 'The basement opens up after the Lantern Crossing festival.' };
  return { ok: true };
}

export function orderUpgrade(g: Game): boolean {
  if (!canOrderUpgrade(g).ok) return false;
  const t = nextUpgrade(g)!;
  const h = g.state.home;
  h.loan = t.cost;
  h.loanTotal = t.cost;
  h.upgradeReadyDay = g.state.clock.day + 1;
  g.emit('loanTaken', { amount: t.cost, level: t.level });
  g.toast(`Construction on your ${t.name} starts tonight. It'll be ready tomorrow!`, 'good');
  return true;
}

export function payLoan(g: Game, amount: number): number {
  const h = g.state.home;
  const pay = Math.min(amount, h.loan, g.state.player.glints);
  if (pay <= 0) return 0;
  money(g, -pay, 0, 'loan');
  h.loan -= pay;
  stat(g, 'loanPaid', pay);
  g.emit('loanPaid', { amount: pay, remaining: h.loan });
  g.emit('sfx', { name: 'coins' });
  if (h.loan === 0) g.toast('Loan fully repaid! Your home is all yours.', 'good');
  return pay;
}

export function dailyHome(g: Game): void {
  const h = g.state.home;
  if (h.upgradeReadyDay > 0 && g.state.clock.day >= h.upgradeReadyDay) {
    h.upgradeReadyDay = 0;
    h.level = Math.min(HOME_TIERS.length - 1, h.level + 1);
    if (h.level >= 3) {
      homeData(g, 'basement');
      // make room for the stairs down
      const st = homeFixtures(g, 'home').find((f) => f.id === 'stairsDown')!;
      for (const pf of [...h.furniture]) {
        if (pf.on !== undefined) continue;
        const fp = footprint(pf.id, pf.rot);
        if (st.x >= pf.x && st.x < pf.x + fp.w && st.z >= pf.z && st.z < pf.z + fp.d && !item(pf.id).furn?.rug) storeFurniture(g, pf.uid, 'home');
      }
    }
    g.emit('homeUpgraded', { level: h.level });
    g.emit('structuresChanged', {});
    g.toast(`Your ${homeTier(h.level).name} is finished!`, 'good');
  }
}

// ---------------- setup + sleeping ----------------

/** Story: pitch the tent + camp workbench on the home lot. */
export function pitchTent(g: Game): void {
  if (g.state.home.level >= 0) return;
  const lot = g.world.gen.lots.home;
  const st = g.state.world.structures;
  const add = (s: Omit<Structure, 'id'>) => st.push({ id: g.state.world.nextStructId++, ...s });
  // clear anything spawned on the lot
  for (let z = lot.z; z < lot.z + lot.d; z++) for (let x = lot.x; x < lot.x + lot.w; x++) g.world.setObj(g.world.idx(x, z), undefined);
  add({ type: 'home', x: lot.x, z: lot.z, w: 3, d: 3, level: 0 });
  add({ type: 'workbench', x: lot.x + 3, z: lot.z + 1, w: 1, d: 1, level: 0 });
  g.state.home.level = 0;
  for (const id of STARTER_RECIPES) learnRecipe(g, id, 'tent', true);
  g.world.rebuildStructures();
  g.emit('structuresChanged', {});
  g.emit('objectsChanged', {});
}

/** Minutes until next wake-up; sleeping jumps there and runs the daily rollover. */
export function sleep(g: Game): void {
  const c = g.state.clock;
  const newDay = c.minute >= WAKE_MINUTE;
  if (newDay) c.day += 1;
  c.minute = WAKE_MINUTE;
  stat(g, 'nightsSlept');
  // after midnight the rollover already happened
  if (newDay) g.startDay();
  g.emit('slept', { day: c.day });
}

export function applySurfaceFromStorage(g: Game, index: number): boolean {
  const s = g.state.home.storage[index];
  if (!s) return false;
  const def = item(s.id);
  if (def.cat !== 'wallpaper' && def.cat !== 'flooring') return false;
  const h = g.state.home;
  const old = def.cat === 'wallpaper' ? homeData(g).wallpaper : homeData(g).flooring;
  s.qty -= 1;
  if (s.qty <= 0) h.storage.splice(index, 1);
  if (def.cat === 'wallpaper') homeData(g).wallpaper = s.id;
  else homeData(g).flooring = s.id;
  if (old) addToStorage(g, old, 1);
  g.emit('sfx', { name: 'place' });
  return true;
}
