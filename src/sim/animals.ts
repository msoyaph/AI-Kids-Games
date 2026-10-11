/**
 * Farm animals: buying, feeding (grazing on nice days or hay from the silo), petting,
 * happiness, products, and gentle wandering. The pet dog/cat lives here too.
 */
import { TILE } from '../core/math';
import { nearestOpen } from '../core/pathfind';
import { ANIMAL, ANIMALS, CAPACITY, SILO_CAP } from '../data/animals';
import { TUNING } from '../tuning';
import { addStock } from '../data/shops';
import { SERVICES } from './shops';
import { gainXp, hasPerk } from './skills';
import { simInitHooks, type Sim } from './sim';
import { seasonOf, type AnimalState } from './state';
import { registerSystem } from './systems';
import { isWet } from './weather';
import type { Loc } from './world';

export const MAX_LOVE = 1000;

export function capacity(sim: Sim, home: 'coop' | 'barn'): number {
  const lvl = sim.state.buildings.built[home];
  return lvl === undefined ? 0 : CAPACITY[lvl];
}

export function animalsIn(sim: Sim, home: 'coop' | 'barn'): AnimalState[] {
  return sim.state.animals.filter((a) => a.home === home);
}

export function canBuy(sim: Sim, kind: string): { ok: boolean; msg?: string } {
  const d = ANIMAL[kind];
  if (!d) return { ok: false };
  const lvl = sim.state.buildings.built[d.home];
  if (lvl === undefined) return { ok: false, msg: `You need a ${d.home} first! Hollis the carpenter can build one.` };
  if (lvl < d.level) return { ok: false, msg: `${d.name}s need a ${['', 'Big', 'Deluxe'][d.level]} ${d.home === 'coop' ? 'Coop' : 'Barn'}.` };
  if (animalsIn(sim, d.home).length >= capacity(sim, d.home)) return { ok: false, msg: `Your ${d.home} is full!` };
  return { ok: true };
}

export function addAnimal(sim: Sim, kind: string, name: string): AnimalState {
  const d = ANIMAL[kind];
  const loc = sim.loc(d.home);
  const p = loc.def.points.pen ?? { x: 4, y: 4 };
  const a: AnimalState = {
    id: sim.state.nextAnimalId++,
    kind,
    name: name.trim().slice(0, 12) || d.names[0],
    home: d.home,
    age: 0,
    love: TUNING.animalStartLove,
    fed: false,
    petted: false,
    prod: null,
    prodQ: 0,
    loc: d.home,
    x: p.x * TILE + 8,
    y: p.y * TILE + 14,
    pd: 0,
    out: false,
  };
  sim.state.animals.push(a);
  return a;
}

export function animalHearts(a: AnimalState): number {
  return Math.round((a.love / MAX_LOVE) * 5);
}

/** Interact with an animal: collect its product, or pet it. */
export function touchAnimal(sim: Sim, a: AnimalState): { kind: 'collect' | 'pet' | 'info'; item?: string } {
  if (a.prod) {
    const item = a.prod;
    sim.give(item, 1, a.prodQ);
    sim.state.stats.animalProducts++;
    gainXp(sim, 'farming', 5);
    a.prod = null;
    if (!a.petted) {
      a.petted = true;
      a.love = Math.min(MAX_LOVE, a.love + 15);
    }
    return { kind: 'collect', item };
  }
  if (!a.petted) {
    a.petted = true;
    a.love = Math.min(MAX_LOVE, a.love + (hasPerk(sim, 'rancher') ? 25 : 15));
    sim.state.stats.petted++;
    gainXp(sim, 'farming', 2);
    return { kind: 'pet' };
  }
  return { kind: 'info' };
}

export function hayCount(sim: Sim): number {
  return sim.state.buildings.hay;
}

export function addHay(sim: Sim, n: number): number {
  const b = sim.state.buildings;
  if (b.built.silo === undefined) return 0;
  const before = b.hay;
  b.hay = Math.min(SILO_CAP, b.hay + n);
  return b.hay - before;
}

/** Nice day = animals graze outside. */
export function grazingDay(sim: Sim): boolean {
  const st = sim.state;
  return !isWet(st.weather) && st.weather !== 'snow' && seasonOf(st.day) !== 3;
}

function outsideSpot(sim: Sim, home: string, i: number): { x: number; y: number } {
  const farm = sim.loc('farm');
  const st = farm.structs.find((s) => s.sp.id === home);
  const door = st?.def?.door ? { x: st.sp.x + st.def.door.dx, y: st.sp.y + st.def.door.dy + 2 } : { x: 30, y: 20 };
  const rng = sim.rng(0xa11, i);
  const [x, y] = nearestOpen(farm, door.x + rng.range(-3, 3), door.y + rng.range(0, 4));
  return { x: x * TILE + 8, y: y * TILE + 14 };
}

function insideSpot(sim: Sim, a: AnimalState, i: number): { x: number; y: number } {
  const loc = sim.loc(a.home);
  const rng = sim.rng(0xa12, i);
  const [x, y] = nearestOpen(loc, rng.range(2, loc.w - 3), rng.range(3, loc.h - 3));
  return { x: x * TILE + 8, y: y * TILE + 14 };
}

function goOut(sim: Sim): void {
  sim.state.animals.forEach((a, i) => {
    const p = outsideSpot(sim, a.home, i);
    a.loc = 'farm';
    a.x = p.x;
    a.y = p.y;
    a.out = true;
    a.fed = true;
  });
}

function goIn(sim: Sim): void {
  sim.state.animals.forEach((a, i) => {
    const p = insideSpot(sim, a, i);
    a.loc = a.home;
    a.x = p.x;
    a.y = p.y;
    a.out = false;
  });
}

// ── Wandering (only for animals in the player's location) ─────────
interface Wander {
  t: number;
  dx: number;
  dy: number;
}
const wander = new Map<number, Wander>();

export function updateAnimals(sim: Sim, dt: number): void {
  const here = sim.p.loc;
  for (const a of sim.state.animals) {
    if (a.loc !== here) continue;
    let w = wander.get(a.id);
    if (!w) {
      w = { t: Math.random() * 2, dx: 0, dy: 0 };
      wander.set(a.id, w);
    }
    w.t -= dt;
    if (w.t <= 0) {
      const r = Math.random();
      if (r < 0.5) {
        w.dx = 0;
        w.dy = 0;
        w.t = 1 + Math.random() * 2.5;
      } else {
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        const [dx, dy] = dirs[Math.floor(Math.random() * 4)];
        w.dx = dx;
        w.dy = dy;
        w.t = 0.6 + Math.random() * 1.2;
      }
    }
    if (w.dx || w.dy) {
      const loc = sim.here;
      const sp = (ANIMAL[a.kind]?.big ? 16 : 20) * dt;
      const nx = a.x + w.dx * sp, ny = a.y + w.dy * sp;
      if (!blockedFor(loc, nx, ny)) {
        a.x = nx;
        a.y = ny;
      } else {
        w.dx = -w.dx;
        w.dy = -w.dy;
      }
    }
  }
}

function blockedFor(loc: Loc, x: number, y: number): boolean {
  const tx = Math.floor(x / TILE), ty = Math.floor((y - 2) / TILE);
  if (loc.blocked(tx, ty) || loc.warpAtTile(tx, ty)) return true;
  const o = loc.obj(tx, ty);
  return !!o && o.k === 'crop';
}

export function wanderState(id: number): Wander | undefined {
  return wander.get(id);
}

/** Tall grass slowly spreads on the farm (spring–autumn), giving hay when cut. */
function spreadGrass(sim: Sim): void {
  if (seasonOf(sim.state.day + 1) === 3) return;
  const farm = sim.loc('farm');
  const grass: number[] = [];
  for (const [i, o] of farm.objs) if (o.k === 'grass') grass.push(i);
  if (grass.length > 260) return;
  const rng = sim.rng(0x6a55);
  for (const i of grass) {
    if (!rng.chance(0.12)) continue;
    const x = (i % farm.w) + rng.range(-1, 1), y = Math.floor(i / farm.w) + rng.range(-1, 1);
    if (farm.isTillable(x, y) && !farm.obj(x, y) && !farm.soilAt(x, y) && !farm.inClearZone(x, y)) farm.setObj(x, y, { k: 'grass', id: 'grass', n: rng.int(2) });
  }
}

// ── Pet ─────────────────────────────────────────────────────
export interface PetRt {
  loc: string;
  x: number;
  y: number;
  dir: 1 | 2;
  sit: boolean;
  sleep: boolean;
  t: number;
  dx: number;
  dy: number;
}

export function petRt(sim: Sim): PetRt {
  let p = sim.ext.pet as PetRt | undefined;
  if (!p) {
    p = { loc: 'farm', x: 33 * TILE + 8, y: 11 * TILE + 14, dir: 2, sit: true, sleep: false, t: 1, dx: 0, dy: 0 };
    sim.ext.pet = p;
    placePet(sim);
  }
  return p;
}

export function placePet(sim: Sim): void {
  const p = petRt(sim);
  const st = sim.state;
  const indoors = st.min >= 20 * 60 || st.min < 7 * 60 || isWet(st.weather) || st.weather === 'snow';
  if (indoors) {
    p.loc = 'farmhouse';
    p.x = 6 * TILE + 8;
    p.y = 5 * TILE + 14;
    p.sleep = st.min >= 21 * 60 || st.min < 7 * 60;
  } else {
    p.loc = 'farm';
    p.x = 33 * TILE + 8;
    p.y = 11 * TILE + 14;
    p.sleep = false;
  }
}

export function petPet(sim: Sim): boolean {
  const pet = sim.state.pet;
  if (pet.petted) return false;
  pet.petted = true;
  pet.love = Math.min(MAX_LOVE, pet.love + 12);
  sim.state.stats.petted++;
  return true;
}

function updatePet(sim: Sim, dt: number): void {
  const p = petRt(sim);
  if (p.loc !== sim.p.loc || p.sleep) return;
  p.t -= dt;
  if (p.t <= 0) {
    const r = Math.random();
    const near = Math.hypot(sim.p.x - p.x, sim.p.y - p.y) < 64 && sim.state.pet.love > 200;
    if (near && r < 0.4) {
      // trot toward the player a little
      p.dx = Math.sign(sim.p.x - p.x);
      p.dy = Math.sign(sim.p.y - p.y) * 0.5;
      p.t = 0.8;
      p.sit = false;
    } else if (r < 0.55) {
      p.dx = 0;
      p.dy = 0;
      p.sit = true;
      p.t = 2 + Math.random() * 3;
    } else {
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      const [dx, dy] = dirs[Math.floor(Math.random() * 4)];
      p.dx = dx;
      p.dy = dy;
      p.sit = false;
      p.t = 0.5 + Math.random();
    }
  }
  if (p.dx || p.dy) {
    const sp = 28 * dt;
    const nx = p.x + p.dx * sp, ny = p.y + p.dy * sp;
    if (!blockedFor(sim.here, nx, ny)) {
      p.x = nx;
      p.y = ny;
      if (p.dx) p.dir = p.dx < 0 ? 1 : 2;
    } else p.t = 0;
  }
}

// ── Daily cycle ─────────────────────────────────────────────
simInitHooks.push((sim) => {
  sim.frameHooks.push((s, dt) => {
    updateAnimals(s, dt);
    updatePet(s, dt);
  });
});

registerSystem({
  id: 'animals',
  endDay(sim) {
    for (const a of sim.state.animals) {
      const d = ANIMAL[a.kind];
      if (a.fed) {
        a.pd++;
        a.love = Math.min(MAX_LOVE, a.love + 5 + (a.out ? 5 : 0));
        if (a.pd >= d.every && !a.prod) {
          a.pd = 0;
          const rng = sim.rng(0xe66, a.id);
          const big = d.bigProduct && a.love > TUNING.animalBigLove && rng.chance(TUNING.animalBigChance + (a.love - TUNING.animalBigLove) / 1500);
          a.prod = big ? d.bigProduct! : d.product;
          a.prodQ = a.love > 900 ? 2 : a.love > 550 ? 1 : 0;
          if (d.bonus && a.love > 400 && rng.chance(0.3)) a.prod = d.bonus;
        }
      } else {
        a.love = Math.max(0, a.love - 15);
      }
      if (!a.petted) a.love = Math.max(0, a.love - 5);
      a.fed = false;
      a.petted = false;
      a.age++;
    }
    const pet = sim.state.pet;
    if (pet.bowl) pet.love = Math.min(MAX_LOVE, pet.love + 10);
    pet.petted = false;
    pet.bowl = false;
    spreadGrass(sim);
  },
  startDay(sim) {
    goIn(sim);
    placePet(sim);
    // a loving pet sometimes brings you a little present
    if (sim.state.pet.love > 300 && sim.rng(0x9e7).chance(0.15)) {
      const gift = sim.rng(0x9e8).pick(['acorn', 'fiber', 'sap', 'mixedSeeds', 'stone']);
      sim.give(gift, 1, 0, true);
      sim.morningNotes.push(`${sim.state.pet.name} brought you a little present this morning!`);
    }
    if (!grazingDay(sim)) {
      for (const a of sim.state.animals) {
        if (sim.state.buildings.hay > 0) {
          sim.state.buildings.hay--;
          a.fed = true;
        }
      }
      const hungry = sim.state.animals.filter((a) => !a.fed).length;
      if (hungry) sim.morningNotes.push(`${hungry} animal${hungry > 1 ? 's are' : ' is'} hungry! Cut grass with your scythe to fill the silo with hay.`);
    }
  },
  tick(sim, m) {
    if (m === 7 * 60 || m === 20 * 60) placePet(sim);
    if (m === 8 * 60 && grazingDay(sim) && sim.state.animals.length) goOut(sim);
    if (m === 18 * 60 && sim.state.animals.some((a) => a.out)) goIn(sim);
  },
});

// ── Ranch shop: hay and animals ─────────────────────────
addStock('ranch', (st) => {
  const out = [{ id: 'hay', price: 50, locked: st.buildings.built.silo === undefined ? 'Needs a Silo to keep it in (ask Hollis!)' : undefined }] as { id: string; price: number; service?: string; label?: string; desc?: string; locked?: string }[];
  for (const a of ANIMALS) {
    const lvl = st.buildings.built[a.home];
    const locked = lvl === undefined ? `Needs a ${a.home === 'coop' ? 'Coop' : 'Barn'} (ask Hollis!)` : lvl < a.level ? `Needs a ${['', 'Big', 'Deluxe'][a.level]} ${a.home === 'coop' ? 'Coop' : 'Barn'}` : undefined;
    out.push({ id: `animal.${a.id}`, price: a.price, service: `animal:${a.id}`, label: a.name, desc: a.desc, locked });
  }
  return out;
});
for (const a of ANIMALS) {
  SERVICES[`animal:${a.id}`] = (sim) => {
    const c = canBuy(sim, a.id);
    if (!c.ok) return c;
    const pick = sim.rng(0xa9, sim.state.nextAnimalId).pick(a.names);
    const an = addAnimal(sim, a.id, pick);
    sim.ev.emit('newAnimal' as never, { id: an.id } as never);
    return { ok: true, msg: `Your new ${a.name.toLowerCase()} is waiting in your ${a.home}!` };
  };
}
