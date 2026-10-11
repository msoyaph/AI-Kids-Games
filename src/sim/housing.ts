// Home: tent -> cottage -> house upgrades paid by loans, sleeping, interior furniture grid, surfaces.
import { HOME_TIERS } from '../data/economy';
import { item } from '../data/registry';
import type { Game } from './game';
import { addToStorage, money, removeAt, stat } from './inventory';
import type { PlacedFurniture, Structure } from './state';
import { WAKE_MINUTE } from './clock';

export function homeTier(level: number) {
  return HOME_TIERS[Math.max(0, Math.min(HOME_TIERS.length - 1, level))]!;
}

export function roomSize(g: Game): { w: number; d: number } {
  return homeTier(g.state.home.level).room;
}

/** Built-in fixtures that furniture can't overlap. */
export function homeFixtures(g: Game): { id: 'bed' | 'chest'; x: number; z: number; w: number; d: number }[] {
  const { w } = roomSize(g);
  const big = g.state.home.level >= 1;
  return [
    { id: 'bed', x: 0, z: 0, w: 2, d: big ? 2 : 1 },
    { id: 'chest', x: w - 1, z: 0, w: 1, d: 1 },
  ];
}

export function doorTile(g: Game): { x: number; z: number } {
  const { w, d } = roomSize(g);
  return { x: Math.floor(w / 2), z: d - 1 };
}

export function footprint(id: string, rot: number): { w: number; d: number } {
  const f = item(id).furn;
  const w = f?.w ?? 1, d = f?.d ?? 1;
  return rot % 2 === 1 ? { w: d, d: w } : { w, d };
}

export function canPlace(g: Game, id: string, x: number, z: number, rot: number, ignoreUid = -1): boolean {
  const def = item(id);
  if (!def.furn) return false;
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
  for (const pf of g.state.home.furniture) {
    if (pf.uid === ignoreUid) continue;
    const other = item(pf.id).furn;
    if (!other) continue;
    if (!!other.rug !== rug) continue; // rugs layer under furniture
    const ofp = footprint(pf.id, pf.rot);
    if (overlaps(pf.x, pf.z, ofp.w, ofp.d)) return false;
  }
  return true;
}

export function furnitureAt(g: Game, x: number, z: number, preferSolid = true): PlacedFurniture | undefined {
  const hits = g.state.home.furniture.filter((pf) => {
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

function addPlaced(g: Game, id: string, x: number, z: number, rot: number): void {
  const h = g.state.home;
  h.furniture.push({ uid: h.nextUid++, id, x, z, rot });
  stat(g, 'furniturePlaced');
  g.emit('furniturePlaced', { id, where: 'home' });
  g.emit('sfx', { name: 'place' });
}

export function moveFurniture(g: Game, uid: number, x: number, z: number, rot: number): boolean {
  const pf = g.state.home.furniture.find((f) => f.uid === uid);
  if (!pf || !canPlace(g, pf.id, x, z, rot, uid)) return false;
  pf.x = x;
  pf.z = z;
  pf.rot = rot;
  g.emit('sfx', { name: 'place' });
  return true;
}

export function storeFurniture(g: Game, uid: number): boolean {
  const h = g.state.home;
  const i = h.furniture.findIndex((f) => f.uid === uid);
  if (i < 0) return false;
  const [pf] = h.furniture.splice(i, 1);
  addToStorage(g, pf!.id, 1);
  g.emit('sfx', { name: 'pickup' });
  return true;
}

/** Apply wallpaper/flooring from pockets; the old one goes to storage. */
export function applySurface(g: Game, slot: number): boolean {
  const s = g.state.player.inv[slot];
  if (!s) return false;
  const def = item(s.id);
  if (def.cat !== 'wallpaper' && def.cat !== 'flooring') return false;
  const h = g.state.home;
  const old = def.cat === 'wallpaper' ? h.wallpaper : h.flooring;
  removeAt(g, slot, 1, 'apply');
  if (def.cat === 'wallpaper') h.wallpaper = s.id;
  else h.flooring = s.id;
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
  const old = def.cat === 'wallpaper' ? h.wallpaper : h.flooring;
  s.qty -= 1;
  if (s.qty <= 0) h.storage.splice(index, 1);
  if (def.cat === 'wallpaper') h.wallpaper = s.id;
  else h.flooring = s.id;
  if (old) addToStorage(g, old, 1);
  g.emit('sfx', { name: 'place' });
  return true;
}
