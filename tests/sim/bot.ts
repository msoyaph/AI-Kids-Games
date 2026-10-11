/**
 * A headless "player" that plays Cliff Valley through the real sim rules (energy, seasons,
 * shop hours, money, bag space) from a new game to the year-one finale.
 *
 * It teleports between places but pays the walking time (route length × a wander factor),
 * and it tracks the real time a kid would spend: clock time while playing plus time with the
 * clock paused (menus, dialogue, the fishing reel, festivals, cutscenes). That feeds the
 * pacing model (tests/sim/pacing.test.ts).
 *
 * Mine critters live in the real-time frame loop, so the bot models fights as extra clock
 * time and a little lost health per floor (fainting works like the game: wake at home).
 */
import { TILE } from '../../src/core/math';
import { nearestOpen } from '../../src/core/pathfind';
import type { Rng } from '../../src/core/rng';
import { BOARDS } from '../../src/data/boards';
import { CROPS } from '../../src/data/crops';
import { festivalOn } from '../../src/data/festivals';
import { tryItem } from '../../src/data/items';
import { CRAFTS, DISHES, GROUPS } from '../../src/data/recipes';
import { SHOPS } from '../../src/data/shops';
import { SKILL_DEFS } from '../../src/data/skills';
import { VILLAGER } from '../../src/data/villagers';
import { CROP_BALANCE, TUNING } from '../../src/tuning';
import { Sim } from '../../src/sim';
import { eat, interactAt, placeItem, useSelected } from '../../src/sim/actions';
import { addHay, touchAnimal } from '../../src/sim/animals';
import { canDonate, donateToMuseum } from '../../src/sim/collections';
import { choosePerk, cook, craft, hasIngredients, pendingPerk, radioShow } from '../../src/sim/crafting';
import { canShip, sellPrice, shipFromSlot } from '../../src/sim/economy';
import { isMature, sprinklerArea } from '../../src/sim/farming';
import { finishActivity, activityDone, festivalToday } from '../../src/sim/festivals';
import { autoReel, biteDelay, biteable, landCatch, pickCatch, Reel, reelParams, zoneAt } from '../../src/sim/fishing';
import { canGift, giveGift, talk, taste } from '../../src/sim/friendship';
import { addItem, count, remove, type Slots } from '../../src/sim/inventory';
import { loadMachine, machineInputs } from '../../src/sim/machines';
import { claimAttachment } from '../../src/sim/mail';
import { canDescend, enterFloor, layerOf, liftOk, openMineChest, takeHeartstone } from '../../src/sim/mine';
import { npcs, planRoute, updateNpcs } from '../../src/sim/npcs';
import { buy, shopOpen, shopStock } from '../../src/sim/shops';
import { level } from '../../src/sim/skills';
import { seasonOf, type SkillId } from '../../src/sim/state';
import { bundleDone, bundleSlots, donatable, donate, finaleToday, optionMatches, placeHeartstone } from '../../src/sim/story';
import { SOIL_TILLED, SOIL_WATERED, type ItemStack, type WorldObject } from '../../src/sim/types';
import { useTool } from '../../src/sim/tools';
import type { Loc } from '../../src/sim/world';

/** game minutes per real second while the clock runs */
export const MPS = (TUNING.dayEndMin - TUNING.dayStartMin) / TUNING.dayRealSeconds;
const TILES_PER_GAME_MIN = TUNING.walkSpeed / TILE / MPS;
/** kids wander, stop to look at things, take the long way round */
const WANDER = 1.35;
const FIELD = { x: 22, y: 16, w: 20, h: 12 };
const SPRINKLER_SPOTS: [number, number][] = [];
for (let y = 17; y < FIELD.y + FIELD.h; y += 3) for (let x = 23; x < FIELD.x + FIELD.w; x += 3) SPRINKLER_SPOTS.push([x, y]);
const SCARECROWS: [number, number][] = [[27, 21], [37, 21]];
const CHEST_SPOTS: [number, number][] = [[27, 12], [28, 12], [30, 12], [31, 12], [32, 12], [33, 12]];
const MACHINE_SPOTS: [number, number][] = [];
for (const y of [13, 14]) for (let x = 27; x <= 41; x++) if (x !== 29) MACHINE_SPOTS.push([x, y]);
const STASH_CATS = new Set(['resource', 'ore', 'bar', 'mineral', 'gem', 'artifact', 'animal', 'fish', 'crab', 'forage', 'crop', 'fruit', 'artisan', 'machine', 'placeable', 'decor', 'junk', 'geode']);
const BED_MIN = 21 * 60 + 30;

export interface DayLog {
  day: number;
  realSec: number;
  pausedSec: number;
  bed: number;
  coins: number;
  boards: number;
  deepest: number;
  energyLeft: number;
  did: string[];
}

const isSprinkler = (o: WorldObject | null | undefined) => o?.k === 'sprinkler';

export class Bot {
  sim: Sim;
  days: DayLog[] = [];
  /** clock-running real seconds */
  playSec = 0;
  /** clock-paused real seconds */
  pausedSec = 0;
  finaleDay = -1;
  faints = 0;
  did: string[] = [];
  private spots = new Map<string, [number, number] | null>();
  private rngN = 0;

  constructor(seed = 2026) {
    this.sim = Sim.newGame({ name: 'Bot', farm: 'Test', pet: 'dog', petName: 'Byte', seed });
    this.sim.state.flags.introSeen = 1;
  }

  get p() {
    return this.sim.p;
  }
  get st() {
    return this.sim.state;
  }
  get realSec(): number {
    return this.playSec + this.pausedSec;
  }
  rng(): Rng {
    return this.sim.rng(0xb07, this.st.day, this.rngN++);
  }

  // ── Time & moving ───────────────────────────────────────
  /** Let the clock run for `gameMin` minutes (never past bedtime + a little). */
  spend(gameMin: number): void {
    if (gameMin <= 0) return;
    const m = Math.min(gameMin, Math.max(0, TUNING.dayEndMin - 20 - this.st.min));
    if (m <= 0) return;
    this.sim.advanceMinutes(m);
    updateNpcs(this.sim);
    this.playSec += m / MPS;
  }
  pause(sec: number): void {
    this.pausedSec += sec;
  }
  /** game minutes left before the bot wants to head to bed */
  left(bed = this.bedtime()): number {
    return bed - this.st.min;
  }
  bedtime(): number {
    // most nights 9:30–11pm, about one night in eight a late one (around midnight)
    const r = (this.st.day * 37 + 11) % 100;
    return BED_MIN + (r < 88 ? r * 0.9 : 150);
  }
  /** minutes before bedtime when we stop starting new things */
  windDown = 30;
  get late(): boolean {
    return this.left() < this.windDown;
  }

  goto(loc: string, x: number, y: number): void {
    const sim = this.sim;
    const pt = sim.playerTile();
    let tiles: number;
    if (sim.p.loc === loc) tiles = Math.abs(pt.x - x) + Math.abs(pt.y - y);
    else {
      const r = planRoute(sim, sim.p.loc, pt.x, pt.y, loc, x, y);
      tiles = r ? r.length : 60;
    }
    this.spend((tiles * WANDER) / TILES_PER_GAME_MIN);
    if (sim.p.loc !== loc) sim.warpTo(loc, x, y, 0);
    else {
      sim.p.x = x * TILE + 8;
      sim.p.y = y * TILE + 14;
    }
  }
  /** Walk to a location's door point (or somewhere open). */
  enter(loc: string): void {
    const l = this.sim.loc(loc);
    const d = l.def.points.door ?? l.def.points.center ?? l.def.points.start;
    let x = d ? d.x : Math.floor(l.w / 2), y = d ? d.y : Math.floor(l.h / 2);
    if (l.blocked(x, y)) {
      [x, y] = nearestOpen(l, x, y, 8);
    }
    this.goto(loc, x, y);
  }
  /** Stand next to (x, y), facing it. */
  approach(loc: string, x: number, y: number): void {
    const l = this.sim.loc(loc);
    const spots: [number, number, number][] = [[x, y + 1, 3], [x - 1, y, 2], [x + 1, y, 1], [x, y - 1, 0]];
    for (const [sx, sy, dir] of spots) {
      if (l.inb(sx, sy) && !l.blocked(sx, sy)) {
        this.goto(loc, sx, sy);
        this.p.dir = dir as 0;
        return;
      }
    }
    this.goto(loc, x, y + 1);
  }
  swing(): void {
    this.spend(0.5 * MPS);
  }

  // ── Bag & chests ────────────────────────────────────────
  has(id: string, n = 1): boolean {
    return count(this.p.inv, id) >= n;
  }
  chests(): WorldObject[] {
    const out: WorldObject[] = [];
    for (const o of this.sim.loc('farm').objs.values()) if (o.k === 'chest' && o.items) out.push(o);
    return out;
  }
  total(id: string): number {
    return count(this.p.inv, id) + this.chests().reduce((t, c) => t + count(c.items as Slots, id), 0);
  }
  freeSlots(): number {
    return this.p.inv.filter((s) => !s).length;
  }
  /** Move up to n of id (any quality, best first) from chests into the bag. */
  withdraw(id: string, n: number): number {
    let got = 0;
    for (const c of this.chests()) {
      const items = c.items as Slots;
      const idx = items.map((s, i) => [s, i] as const).filter(([s]) => s?.id === id).sort((a, b) => (b[0]!.q ?? 0) - (a[0]!.q ?? 0));
      for (const [s, i] of idx) {
        if (got >= n) return got;
        const take = Math.min(s!.n, n - got);
        const leftover = addItem(this.p.inv, id, take, s!.q ?? 0);
        const moved = take - leftover;
        s!.n -= moved;
        got += moved;
        if (s!.n <= 0) items[i] = null;
        if (leftover) return got;
      }
    }
    return got;
  }
  /** Put stashable things (materials, produce kept for later) into chests. */
  stash(): void {
    const cs = this.chests();
    if (!cs.length) return;
    for (let i = 0; i < this.p.inv.length; i++) {
      const s = this.p.inv[i];
      if (!s) continue;
      const cat = tryItem(s.id)?.cat ?? '';
      const treeSeed = cat === 'seed' && !s.id.startsWith('seed.') && s.id !== 'mixedSeeds';
      if ((!STASH_CATS.has(cat) && !treeSeed) || s.id === 'heartstone') continue;
      for (const c of cs) {
        const left = addItem(c.items as Slots, s.id, s.n, s.q ?? 0);
        if (left < s.n) {
          if (left === 0) this.p.inv[i] = null;
          else s.n = left;
          break;
        }
      }
    }
    this.pause(4);
  }
  /** Things on the floor of the Lost & Found crate come back when there is room. */
  lostAndFound(): void {
    const of = this.st.overflow;
    for (let k = of.length - 1; k >= 0; k--) {
      const s = of[k];
      const left = addItem(this.p.inv, s.id, s.n, s.q);
      if (left === 0) of.splice(k, 1);
      else s.n = left;
    }
  }
  select(id: string): boolean {
    const i = this.p.inv.findIndex((s) => s?.id === id);
    if (i < 0) return false;
    if (i >= TUNING.toolbarSize) {
      const t = this.p.inv[TUNING.toolbarSize - 1];
      this.p.inv[TUNING.toolbarSize - 1] = this.p.inv[i];
      this.p.inv[i] = t;
      this.p.sel = TUNING.toolbarSize - 1;
    } else this.p.sel = i;
    return true;
  }

  /** How many of this exact stack the boards still want. */
  boardWant(s: ItemStack): number {
    let n = 0;
    for (const bd of BOARDS)
      for (const b of bd.bundles) {
        if (bundleDone(this.sim, bd.id, b.id)) continue;
        const slots = bundleSlots(this.sim, bd.id, b.id);
        b.options.forEach((o, i) => {
          if (!slots[i] && optionMatches(o, s) && (s.q ?? 0) >= (o.q ?? 0)) n = Math.max(n, o.n);
        });
      }
    return n;
  }
  /** Number of this stack's item to hold on to (boards, cooking, machines, crafting). */
  keepOf(s: ItemStack): number {
    const d = tryItem(s.id);
    if (!d) return s.n;
    let keep = this.boardWant(s);
    if (['resource', 'ore', 'bar', 'seed', 'sapling', 'fertilizer', 'machine', 'placeable', 'special', 'tool', 'decor', 'geode', 'food'].includes(d.cat)) return s.n;
    if (d.cat === 'mineral' || d.cat === 'gem' || d.cat === 'artifact') keep = Math.max(keep, canDonate(this.sim, s.id) ? 1 : 0);
    if (this.st.buildings.houseLevel >= 1 && this.cookIngredients().has(s.id)) keep = Math.max(keep, 2);
    if (s.id === 'mapleSyrup' || s.id === 'pineTar') keep = Math.max(keep, 1);
    return keep;
  }
  private cookIng: Set<string> | null = null;
  private cookIngN = -1;
  cookIngredients(): Set<string> {
    if (this.cookIng && this.cookIngN === this.p.recipes.length) return this.cookIng;
    const set = new Set<string>();
    for (const d of DISHES) {
      if (!this.p.recipes.includes(d.id)) continue;
      for (const [k] of d.ing) {
        if (k.startsWith('any:')) for (const id of GROUPS[k.slice(4)] ?? []) set.add(id);
        else if (!k.startsWith('cat:')) set.add(k);
      }
    }
    this.cookIngN = this.p.recipes.length;
    return (this.cookIng = set);
  }

  // ── Energy & health ─────────────────────────────────────
  /** Make sure we have more than `need` energy, snacking if we can. */
  energyOk(need = 10): boolean {
    if (this.p.energy > need) return true;
    const food = this.p.inv
      .map((s, i) => [s, i] as const)
      .filter(([s]) => s && (tryItem(s.id)?.energy ?? 0) > 0 && (tryItem(s.id)?.cat === 'food' || s.n > this.keepOf(s)))
      .sort(([a], [b]) => sellPrice(null, a!.id) / tryItem(a!.id)!.energy! - sellPrice(null, b!.id) / tryItem(b!.id)!.energy!);
    for (const [s] of food) {
      while (this.p.energy <= need + 30 && this.has(s!.id) && (tryItem(s!.id)?.cat === 'food' || count(this.p.inv, s!.id) > this.keepOf(s!))) {
        if (!eat(this.sim, s!.id)) break;
        this.pause(2);
      }
      if (this.p.energy > need + 30) break;
    }
    return this.p.energy > need;
  }
  healthOk(need: number): boolean {
    while (this.p.hp < need) {
      const food = this.p.inv.find((s) => s && tryItem(s.id)?.cat === 'food');
      if (!food || !eat(this.sim, food.id)) return false;
      this.pause(2);
    }
    return true;
  }
  faint(): void {
    // like game/mine.ts: wake at home, nothing lost
    this.st.mine.floor = 0;
    this.sim.world.delete('mine');
    const bed = this.sim.loc('farmhouse').def.points.bed;
    this.sim.warpTo('farmhouse', bed.x, bed.y, 0);
    this.p.hp = this.p.maxHp;
    this.spend(Math.max(0, Math.min(120, TUNING.sleepyMin - 30 - this.st.min)));
    this.st.stats.faints++;
    this.faints++;
    this.pause(10);
  }

  // ── Morning ─────────────────────────────────────────────
  morning(): void {
    const st = this.st;
    for (const m of st.mail) {
      if (!m.read) {
        m.read = true;
        this.pause(7);
      }
      claimAttachment(this.sim, m.id);
    }
    // radio: weather every day, "Cooking with Sunny" on Restdays
    if (st.day % 5 === 4 && st.buildings.houseLevel >= 0) {
      radioShow(this.sim);
      this.pause(6);
    }
    for (let k = 0; k < 4; k++) {
      const pend = pendingPerk(this.sim);
      if (!pend) break;
      const opts = SKILL_DEFS.find((s) => s.id === pend.skill)!.perks[pend.tier];
      const pref = ['tunneler', 'tireless', 'hearty', 'lumberjack', 'trapper'];
      const pick = opts.find((o) => pref.includes(o.id)) ?? opts[0];
      choosePerk(this.sim, pick.id);
      this.pause(8);
    }
    st.pet.petted = true;
    st.pet.love = Math.min(1000, st.pet.love + 12);
    st.pet.bowl = true;
    this.lostAndFound();
    // animals: collect + pet (twice: once collects, once pets)
    for (const a of st.animals) {
      this.goto(a.loc, Math.floor(a.x / TILE), Math.floor(a.y / TILE));
      touchAnimal(this.sim, a);
      touchAnimal(this.sim, a);
      this.pause(1);
    }
    if (st.animals.length && st.buildings.built.silo === undefined && count(this.p.inv, 'hay') === 0 && seasonOf(st.day) === 3) {
      // winter without a silo: buy hay at the ranch later
      this.did.push('needHay');
    }
  }

  // ── Farm ────────────────────────────────────────────────
  farm(): Loc {
    return this.sim.loc('farm');
  }
  /** Clear whatever clutter is on a tile with the right tool. */
  clear(loc: string, x: number, y: number): boolean {
    const l = this.sim.loc(loc);
    for (let k = 0; k < 8; k++) {
      const a = l.objAnchor(x, y);
      if (!a) return true;
      const o = a.o;
      const tool = o.k === 'weed' || o.k === 'grass' ? 'scythe' : o.k === 'stone' || o.k === 'boulder' ? 'pick' : o.k === 'twig' || o.k === 'stump' || o.k === 'log' || o.k === 'tree' ? 'axe' : o.k === 'crop' && o.dead ? 'scythe' : null;
      if (!tool || !this.energyOk(6)) return false;
      this.approach(loc, x, y);
      const r = useTool(this.sim, tool, x, y);
      this.swing();
      if (!r.ok) return false;
    }
    return !l.obj(x, y);
  }
  waterSource(): [number, number] {
    const key = 'farmWater';
    if (!this.spots.has(key)) {
      const f = this.farm();
      let best: [number, number] | null = null, bd = 1e9;
      for (let y = 0; y < f.h; y++)
        for (let x = 0; x < f.w; x++) {
          if (!f.isWater(x, y)) continue;
          const d = Math.abs(x - 32) + Math.abs(y - 22);
          if (d < bd && !f.blocked(x - 1, y)) {
            bd = d;
            best = [x, y];
          }
        }
      this.spots.set(key, best);
    }
    return this.spots.get(key) ?? [45, 30];
  }
  refill(): void {
    if (this.st.buildings.built.well !== undefined) {
      this.approach('farm', 24, 12);
      useTool(this.sim, 'can', 24, 12);
    } else {
      const [x, y] = this.waterSource();
      this.goto('farm', x - 1, y);
      this.p.dir = 2;
      useTool(this.sim, 'can', x, y);
    }
    this.swing();
  }
  covered(): Set<number> {
    const f = this.farm();
    const out = new Set<number>();
    for (const [i, o] of f.objs) {
      if (!isSprinkler(o)) continue;
      const x = i % f.w, y = Math.floor(i / f.w);
      for (const [dx, dy] of sprinklerArea(o.id)) out.add((y + dy) * f.w + x + dx);
    }
    return out;
  }
  fieldTiles(): [number, number][] {
    const out: [number, number][] = [];
    const sp = new Set(SPRINKLER_SPOTS.map(([x, y]) => `${x},${y}`));
    const sc = new Set(SCARECROWS.map(([x, y]) => `${x},${y}`));
    for (let y = FIELD.y; y < FIELD.y + FIELD.h; y++)
      for (let x = FIELD.x; x < FIELD.x + FIELD.w; x++) if (!sp.has(`${x},${y}`) && !sc.has(`${x},${y}`)) out.push([x, y]);
    return out;
  }
  /** How many tiles we're happy to water by hand. */
  manualCap(): number {
    return 30 + level(this.sim, 'farming') * 3 + Math.max(0, this.p.tools.can ?? 0) * 10;
  }
  harvestAll(): void {
    const f = this.farm();
    for (const [i, o] of [...f.objs]) {
      const x = i % f.w, y = Math.floor(i / f.w);
      if (o.k === 'crop' && isMature(o, f, x, y)) {
        this.approach('farm', x, y);
        interactAt(this.sim, x, y);
        this.spend(0.3 * MPS);
      } else if (o.k === 'giant') {
        this.clear('farm', x, y);
      } else if ((o.k === 'tree' && o.tap?.out) || (o.k === 'fruitTree' && (o.n ?? 0) > 0)) {
        this.approach('farm', x, y);
        interactAt(this.sim, x, y);
      }
    }
  }
  waterAll(): void {
    const w = this.st.weather;
    if (w === 'rain' || w === 'storm' || w === 'snow') return;
    const f = this.farm();
    for (const [i, o] of f.objs) {
      if (o.k !== 'crop' || o.dead) continue;
      const x = i % f.w, y = Math.floor(i / f.w);
      if (f.soilAt(x, y) & SOIL_WATERED) continue;
      if (isMature(o, f, x, y) && !CROP_BALANCE[o.id].regrow) continue;
      if (!this.energyOk(8)) return;
      if (this.p.water <= 0) this.refill();
      this.approach('farm', x, y);
      useTool(this.sim, 'can', x, y);
      this.swing();
    }
  }
  /** Crops worth planting today, best first (board needs first, then coins per day). */
  seedPlan(): string[] {
    const s = seasonOf(this.st.day);
    const daysLeft = 10 - (this.st.day % 10);
    const need = new Set(CROPS.filter((c) => this.cropNeeded(c.id)).map((c) => c.id));
    const value = (id: string) => {
      const b = CROP_BALANCE[id];
      const harvests = b.regrow ? 1 + Math.floor((daysLeft - b.days) / b.regrow) : 1;
      const y = b.yield ? (b.yield[0] + b.yield[1]) / 2 : 1;
      return (b.sell * y * harvests - b.seed) / b.days;
    };
    return CROPS.filter((c) => c.seasons.includes(s) && CROP_BALANCE[c.id].days < daysLeft)
      .sort((a, b) => Number(need.has(b.id)) - Number(need.has(a.id)) || value(b.id) - value(a.id))
      .map((c) => c.id);
  }
  /** Does an unfinished bundle still want this crop (and we don't have it yet)? */
  cropNeeded(id: string): boolean {
    for (const bd of BOARDS)
      for (const b of bd.bundles) {
        if (bundleDone(this.sim, bd.id, b.id)) continue;
        const slots = bundleSlots(this.sim, bd.id, b.id);
        if (b.options.some((o, i) => !slots[i] && o.items?.includes(id) && this.total(id) < o.n)) return true;
      }
    return false;
  }
  /** Clear, till and plant up to the tiles we can look after. */
  plantAll(): void {
    const f = this.farm();
    const cov = this.covered();
    let manual = 0;
    for (const o of f.objs.values()) if (o.k === 'crop' && !o.dead) manual++;
    manual -= [...f.objs.entries()].filter(([i, o]) => o.k === 'crop' && cov.has(i)).length;
    const plan = this.seedPlan();
    const seeds = () => [...plan.map((c) => `seed.${c}`), ...(seasonOf(this.st.day) === 3 ? [] : ['mixedSeeds'])].find((id) => this.has(id));
    const tiles = this.fieldTiles().sort((a, b) => Number(cov.has(b[1] * f.w + b[0])) - Number(cov.has(a[1] * f.w + a[0])));
    for (const [x, y] of tiles) {
      if (this.late || !seeds()) return;
      const i = y * f.w + x;
      const o = f.obj(x, y);
      if (o && !(o.k === 'crop' && o.dead) && o.k !== 'weed' && o.k !== 'grass' && o.k !== 'stone' && o.k !== 'twig') continue;
      if (!cov.has(i) && manual >= this.manualCap()) continue;
      if (o && !this.clear('farm', x, y)) continue;
      if (!(f.soilAt(x, y) & SOIL_TILLED)) {
        if (!f.isTillable(x, y) || !this.energyOk(8)) continue;
        this.approach('farm', x, y);
        useTool(this.sim, 'hoe', x, y);
        this.swing();
        if (!(f.soilAt(x, y) & SOIL_TILLED)) continue;
      }
      const seed = seeds()!;
      this.select(seed);
      this.approach('farm', x, y);
      const u = useSelected(this.sim, x, y);
      if ('ok' in u && u.ok) {
        if (!cov.has(i)) manual++;
        this.spend(0.25 * MPS);
      }
    }
  }
  placeFarmStuff(): void {
    const sim = this.sim, f = this.farm();
    // sprinklers on the grid (best ones first)
    for (const id of ['sprinkler3', 'sprinkler2', 'sprinkler1']) {
      while (this.has(id)) {
        let spot = SPRINKLER_SPOTS.find(([x, y]) => !f.obj(x, y) && !f.blocked(x, y));
        // upgrade a weaker sprinkler
        if (!spot && id !== 'sprinkler1') {
          spot = SPRINKLER_SPOTS.find(([x, y]) => isSprinkler(f.obj(x, y)) && f.obj(x, y)!.id < id);
          if (spot) {
            const old = f.obj(spot[0], spot[1])!.id;
            f.removeObj(spot[0], spot[1]);
            sim.give(old, 1);
          }
        }
        if (!spot) break;
        if (!this.clear('farm', spot[0], spot[1])) break;
        this.approach('farm', spot[0], spot[1]);
        if (!placeItem(sim, id, spot[0], spot[1]).ok) break;
        remove(this.p.inv, id, 1);
        f.setSoil(spot[0], spot[1], 0);
      }
    }
    for (const [x, y] of SCARECROWS) {
      if (f.obj(x, y)?.k === 'scarecrow') continue;
      const id = this.has('deluxeScarecrow') ? 'deluxeScarecrow' : 'scarecrow';
      if (!this.has(id)) break;
      if (f.obj(x, y)?.k === 'crop') continue;
      if (!this.clear('farm', x, y)) continue;
      this.approach('farm', x, y);
      if (placeItem(sim, id, x, y).ok) remove(this.p.inv, id, 1);
    }
    for (const id of ['chest']) {
      while (this.has(id)) {
        const spot = CHEST_SPOTS.find(([x, y]) => !f.obj(x, y)?.k || ['weed', 'grass', 'stone', 'twig'].includes(f.obj(x, y)!.k));
        if (!spot || !this.clear('farm', spot[0], spot[1])) break;
        this.approach('farm', spot[0], spot[1]);
        if (!placeItem(sim, id, spot[0], spot[1]).ok) break;
        remove(this.p.inv, id, 1);
      }
    }
    for (const id of ['furnace', 'preservesJar', 'cheesePress', 'beeHouse', 'juicer', 'loom', 'oilPress', 'seedMaker', 'recycler']) {
      while (this.has(id)) {
        const spot = MACHINE_SPOTS.find(([x, y]) => !f.obj(x, y) || ['weed', 'grass', 'stone', 'twig'].includes(f.obj(x, y)!.k));
        if (!spot || !this.clear('farm', spot[0], spot[1])) break;
        this.approach('farm', spot[0], spot[1]);
        if (!placeItem(sim, id, spot[0], spot[1]).ok) break;
        remove(this.p.inv, id, 1);
      }
    }
    // tappers on grown maple (syrup) then oak trees
    for (const kind of ['maple', 'oak', 'pine']) {
      if (!this.has('tapper')) break;
      for (const loc of ['farm']) {
        const l = sim.loc(loc);
        for (const [i, o] of l.objs) {
          if (o.k !== 'tree' || o.id !== kind || (o.g ?? 0) < 4 || o.tap) continue;
          const x = i % l.w, y = Math.floor(i / l.w);
          this.approach(loc, x, y);
          if (placeItem(sim, 'tapper', x, y).ok) {
            remove(this.p.inv, 'tapper', 1);
            break;
          }
        }
      }
    }
  }
  machines(): void {
    const sim = this.sim, f = this.farm();
    for (const [i, o] of f.objs) {
      if (o.k !== 'machine' && o.k !== 'beehouse') continue;
      const x = i % f.w, y = Math.floor(i / f.w);
      if (o.out) {
        this.approach('farm', x, y);
        interactAt(sim, x, y);
        this.spend(0.2 * MPS);
      }
      if (o.k !== 'machine' || o.inp || o.out) continue;
      // pull likely inputs out of the chests first
      if (o.id === 'furnace') {
        for (const ore of ['copperOre', 'ironOre', 'goldOre']) if (this.total(ore) >= 5) this.withdraw(ore, 5);
        this.withdraw('coal', 1);
      }
      const opts = machineInputs(sim, o.id).filter(({ slot }) => {
        const s = this.p.inv[slot]!;
        if (o.id === 'furnace') return true;
        return count(this.p.inv, s.id) > this.keepOf(s) || this.boardWantsOutputOf(o.id);
      });
      // prefer cheap inputs (jam from low-value crops is still jam!)
      opts.sort((a, b) => sellPrice(null, this.p.inv[a.slot]!.id) - sellPrice(null, this.p.inv[b.slot]!.id));
      if (opts.length) {
        this.approach('farm', x, y);
        loadMachine(sim, o, opts[0].slot);
        this.pause(2);
      }
    }
  }
  boardWantsOutputOf(machine: string): boolean {
    if (machine === 'preservesJar') return !bundleDone(this.sim, 'crafted', 'preserves');
    if (machine === 'cheesePress') return !bundleDone(this.sim, 'animal', 'dairy');
    if (machine === 'loom') return !bundleDone(this.sim, 'animal', 'dairy') || !bundleDone(this.sim, 'crafted', 'fine');
    return false;
  }
  shipExtras(): void {
    let any = false;
    for (let i = 0; i < this.p.inv.length; i++) {
      const s = this.p.inv[i];
      if (!s || !canShip(s.id)) continue;
      const cat = tryItem(s.id)?.cat ?? '';
      if (!['crop', 'fruit', 'forage', 'fish', 'crab', 'animal', 'artisan', 'junk', 'mineral', 'gem', 'artifact'].includes(cat)) continue;
      const spare = s.n - this.keepOf(s);
      if (spare > 0 && shipFromSlot(this.sim, i, Math.min(spare, s.n))) any = true;
    }
    // also ship spare produce sitting in chests
    for (const c of this.chests()) {
      const items = c.items as Slots;
      for (let i = 0; i < items.length; i++) {
        const s = items[i];
        if (!s || !canShip(s.id)) continue;
        const cat = tryItem(s.id)?.cat ?? '';
        if (!['crop', 'fruit', 'forage', 'fish', 'crab', 'animal', 'artisan', 'junk'].includes(cat)) continue;
        const spare = s.n - this.keepOf(s);
        if (spare <= 0) continue;
        const left = addItem(this.p.inv, s.id, spare, s.q ?? 0);
        s.n -= spare - left;
        if (s.n <= 0) items[i] = null;
        const slot = this.p.inv.findIndex((x) => x?.id === s.id && (x.q ?? 0) === (s.q ?? 0));
        if (slot >= 0) shipFromSlot(this.sim, slot, spare - left);
        any = true;
      }
    }
    if (any) {
      this.goto('farm', 35, 11);
      this.pause(8);
    }
  }

  // ── Crafting & cooking ──────────────────────────────────
  /** Craft one of `id` if we know it, pulling ingredients from chests. */
  tryCraft(id: string): boolean {
    const c = CRAFTS.find((x) => x.id === id);
    if (!c || !this.p.crafts.includes(id)) return false;
    for (const [k, n] of c.ing) if (!k.includes(':') && this.total(k) < n) return false;
    for (const [k, n] of c.ing) if (!k.includes(':')) this.withdraw(k, n - count(this.p.inv, k));
    if (!hasIngredients(this.p.inv, c.ing)) return false;
    if (craft(this.sim, id).ok) {
      this.pause(4);
      return true;
    }
    return false;
  }
  crafting(): void {
    const st = this.st;
    const placed = (k: string, id?: string) => [...this.farm().objs.values()].filter((o) => o.k === k && (!id || o.id === id)).length;
    // storage first
    const chests = this.chests().length + count(this.p.inv, 'chest');
    if (chests < Math.min(CHEST_SPOTS.length, 2 + Math.floor(st.day / 8)) && (chests < 2 || this.total('wood') >= 50 + this.woodReserve())) this.tryCraft('chest');
    if (placed('scarecrow') + this.total('scarecrow') + this.total('deluxeScarecrow') < SCARECROWS.length && st.day >= 1) this.tryCraft('scarecrow');
    if (placed('machine', 'furnace') + this.total('furnace') < 2) this.tryCraft('furnace');
    const machineGoal: [string, number][] = [['preservesJar', 3], ['cheesePress', 1], ['crabPot', 3], ['beeHouse', 2], ['tapper', 2], ['loom', 1]];
    for (const [id, n] of machineGoal) {
      const have = id === 'tapper' ? [...this.farm().objs.values()].filter((o) => o.tap).length : id === 'crabPot' ? this.crabPotsPlaced() : placed(id === 'beeHouse' ? 'beehouse' : 'machine', id);
      if (have + this.total(id) < n) this.tryCraft(id);
    }
    // more sprinklers with what's left (keep some stone for machines)
    for (let k = 0; k < 3 && (this.total('copperBar') > 2 || this.total('ironBar') > 1) && this.total('stone') > 50; k++) {
      const sprinklers = placed('sprinkler') + this.total('sprinkler1') + this.total('sprinkler2');
      if (sprinklers >= SPRINKLER_SPOTS.length) break;
      if (!this.tryCraft('sprinkler2') && !this.tryCraft('sprinkler1')) break;
    }
    // the Handmade bundle wants a few small crafts
    if (!bundleDone(this.sim, 'crafted', 'handmade')) {
      if (this.total('torch') < 5) for (let k = 0; k < 3; k++) this.tryCraft('torch');
      if (this.total('woodFence') < 10 && this.total('wood') > 80) for (let k = 0; k < 2; k++) this.tryCraft('woodFence');
    }
  }
  crabPotsPlaced(): number {
    let n = 0;
    for (const id of ['beach', 'farm', 'town', 'mountain']) for (const o of this.sim.loc(id).objs.values()) if (o.k === 'crabpot') n++;
    return n;
  }
  cooking(): void {
    if (this.st.buildings.houseLevel < 1) return;
    let made = 0;
    const want = bundleDone(this.sim, 'crafted', 'kitchen') ? 2 : 4;
    for (const d of [...DISHES].sort((a, b) => b.energy - a.energy)) {
      if (made >= want || !this.p.recipes.includes(d.id)) continue;
      if (count(this.p.inv, d.id) >= 2) continue;
      for (const [k, n] of d.ing) if (!k.includes(':')) this.withdraw(k, n);
      for (const [k, n] of d.ing) if (k.startsWith('any:')) for (const id of GROUPS[k.slice(4)] ?? []) if (count(this.p.inv, id) < n) this.withdraw(id, n);
      if (hasIngredients(this.p.inv, d.ing) && cook(this.sim, d.id).ok) {
        made++;
        this.pause(6);
      }
    }
    if (made) this.enter('farmhouse');
  }

  // ── Town errands ────────────────────────────────────────
  shopEntry(shopId: string, id: string) {
    return shopStock(this.sim, shopId).find((x) => x.id === id && !x.locked);
  }
  buy(shopId: string, id: string, qty = 1): boolean {
    if (!shopOpen(this.sim, shopId).open) return false;
    const e = this.shopEntry(shopId, id);
    if (!e) return false;
    if (e.mats) for (const [m, n] of e.mats) this.withdraw(m, n - count(this.p.inv, m));
    return buy(this.sim, shopId, e, qty).ok;
  }
  visitShop(shopId: string): boolean {
    if (!shopOpen(this.sim, shopId).open || this.late) return false;
    this.enter(SHOPS[shopId].room);
    this.pause(10);
    return true;
  }
  woodReserve(): number {
    const b = this.st.buildings;
    if (b.built.coop === undefined) return 150;
    if (b.built.barn === undefined) return 250;
    if (b.houseLevel === 0) return 300;
    return 60;
  }
  /** Coins to keep aside for the next big goal (buildings, house). */
  reserve(): number {
    const b = this.st.buildings, d = this.st.day;
    if (b.built.coop === undefined && d >= 3) return 2500;
    if (b.built.barn === undefined && d >= 8) return 5000;
    if (b.houseLevel === 0 && d >= 12) return 5000;
    return 200;
  }
  seedShopping(): void {
    if (!this.visitShop('store')) return;
    const f = this.farm();
    const cov = this.covered();
    let free = 0;
    let manual = 0;
    for (const [x, y] of this.fieldTiles()) {
      const o = f.obj(x, y);
      const i = y * f.w + x;
      if (o?.k === 'crop' && !o.dead) {
        if (!cov.has(i)) manual++;
        continue;
      }
      if (cov.has(i) || manual + free < this.manualCap()) free++;
    }
    // seeds are the farm's engine: spend at least 60% of what we have on them
    let budget = Math.max(this.p.coins * 0.6, this.p.coins - this.reserve());
    const have = this.p.inv.reduce((t, s) => t + (s && s.id.startsWith('seed.') ? s.n : 0), 0);
    let want = Math.max(0, free - have);
    const plan = this.seedPlan();
    // first a few of each crop a board still needs, then the best earner
    for (const c of plan.filter((id) => this.cropNeeded(id))) {
      const n = Math.min(3 - this.total(`seed.${c}`), want, Math.floor(budget / CROP_BALANCE[c].seed));
      if (n > 0 && this.buy('store', `seed.${c}`, n)) {
        budget -= n * CROP_BALANCE[c].seed;
        want -= n;
      }
    }
    for (const c of plan.slice(0, 3)) {
      if (want <= 0 || budget < 30) break;
      const price = CROP_BALANCE[c].seed;
      const n = Math.min(want, Math.floor(budget / price), c === plan[0] ? want : Math.max(3, Math.ceil(want / 2)));
      if (n > 0 && this.buy('store', `seed.${c}`, n)) {
        budget -= n * price;
        want -= n;
      }
    }
    if (this.p.inv.length < 30 && this.p.coins > 2000 + this.reserve()) this.buy('store', 'backpack');
    else if (this.p.inv.length < 36 && this.p.coins > 8000 + this.reserve() + 3000) this.buy('store', 'backpack');
    // the Fine Goods bundle takes cooking oil from the store
    if (!bundleDone(this.sim, 'crafted', 'fine') && this.total('oil') < 1 && this.p.coins > 400) this.buy('store', 'oil', 1);
    if (this.st.buildings.houseLevel >= 1 && this.total('flour') < 2 && this.p.coins > 600) this.buy('store', 'flour', 3);
  }
  carpenter(): void {
    const b = this.st.buildings;
    // wood and stone are cheap at Hollis's: top up when the piles are low
    const wood = this.total('wood') < 120 && this.p.coins > 2200;
    const stone = this.total('stone') < 80 && this.p.coins > 3200;
    const hardwood = this.total('hardwood') < 10 && this.p.coins > 2500;
    if ((wood || stone || hardwood) && shopOpen(this.sim, 'carpenter').open && !this.late) {
      this.visitShop('carpenter');
      if (wood) this.buy('carpenter', 'wood', 100);
      if (stone) this.buy('carpenter', 'stone', 60);
      if (hardwood) this.buy('carpenter', 'hardwood', 10);
    }
    if (b.constructing || b.houseUpgrade) return;
    const order = [b.built.coop === undefined && 'bld.coop0', b.built.silo === undefined && 'bld.silo', b.built.barn === undefined && 'bld.barn0', b.houseLevel === 0 && 'house.1', b.built.well === undefined && 'bld.well', b.built.coop === 0 && this.st.day > 22 && 'bld.coop1', b.built.barn === 0 && this.st.day > 24 && this.p.coins > 15000 && 'bld.barn1'].filter(Boolean) as string[];
    const next = order[0];
    if (!next || !shopOpen(this.sim, 'carpenter').open || this.late) return;
    const e = this.shopEntry('carpenter', next);
    if (!e) return;
    const mats = e.mats ?? [];
    let cost = e.price;
    for (const [m, n] of mats) {
      const short = Math.max(0, n - this.total(m));
      if (short && !['wood', 'stone', 'hardwood', 'clay'].includes(m)) return;
      cost += short * (m === 'wood' ? 10 : m === 'stone' ? 20 : m === 'clay' ? 30 : 60);
    }
    if (this.p.coins < cost + 300) return;
    this.visitShop('carpenter');
    for (const [m, n] of mats) {
      const short = Math.max(0, n - this.total(m));
      if (short) this.buy('carpenter', m, short);
    }
    if (this.buy('carpenter', next)) this.did.push(`built ${next}`);
  }
  ranch(): void {
    const st = this.st, b = st.buildings;
    if (!shopOpen(this.sim, 'ranch').open || this.late) return;
    const coopN = st.animals.filter((a) => a.home === 'coop').length, barnN = st.animals.filter((a) => a.home === 'barn').length;
    const wants: string[] = [];
    if (b.built.coop !== undefined && coopN < (b.built.coop >= 1 ? 6 : 4)) wants.push(b.built.coop >= 1 && !st.animals.some((a) => a.kind === 'duck') ? 'animal.duck' : 'animal.chicken');
    if (b.built.barn !== undefined && barnN < 3) wants.push('animal.cow');
    else if ((b.built.barn ?? 0) >= 1 && barnN < 5 && !st.animals.some((a) => a.kind === 'goat')) wants.push('animal.goat');
    const winterSoon = seasonOf(st.day) === 3 || (seasonOf(st.day) === 2 && st.day % 10 >= 7);
    if (st.animals.length && b.built.silo !== undefined && winterSoon && b.hay < st.animals.length * 8) wants.push('hay');
    for (const id of wants) {
      const e = this.shopEntry('ranch', id);
      if (!e || this.p.coins < e.price + 300) continue;
      this.visitShop('ranch');
      const n = id === 'hay' ? Math.min(Math.floor((this.p.coins - 300) / 50), st.animals.length * 10) : 1;
      if (this.buy('ranch', id, n)) this.did.push(`bought ${id}`);
    }
    this.hay();
  }
  smithy(): void {
    if (!shopOpen(this.sim, 'smithy').open || this.late) return;
    const geodes = ['geode', 'frostGeode', 'glowGeode', 'crystalGeode'];
    for (const g of geodes) this.withdraw(g, 99);
    const n = geodes.reduce((t, g) => t + count(this.p.inv, g), 0);
    let visited = false;
    if (n > 0) {
      visited = this.visitShop('smithy');
      for (let k = 0; k < n && this.p.coins > 50 && this.freeSlots() > 0; k++) this.buy('smithy', 'geode');
    }
    // tool upgrades when comfortably rich: pickaxe, then watering can, then axe
    for (const t of ['pick', 'can', 'axe', 'hoe']) {
      const tier = this.p.tools[t] ?? 0;
      if (tier >= 2) continue;
      const e = this.shopEntry('smithy', `tool.${t}`);
      if (!e?.mats) continue;
      const [bar, need] = e.mats[0];
      if (this.total(bar) >= need + 2 && this.p.coins > e.price + this.reserve() + 1500) {
        if (!visited) visited = this.visitShop('smithy');
        if (this.buy('smithy', `tool.${t}`)) this.did.push(`upgraded ${t}`);
        break;
      }
    }
  }
  fishShop(): void {
    if (!shopOpen(this.sim, 'fishshop').open || this.late) return;
    const needRod = (this.p.tools.rod ?? -1) < 0;
    const needBait = this.crabPotsPlaced() > 0 && this.total('bait') < 6 && this.p.coins > 300;
    if (!needRod && !needBait) return;
    this.visitShop('fishshop');
    if (needRod) this.buy('fishshop', 'tool.rod');
    if (needBait) this.buy('fishshop', 'bait', 20);
  }
  cafe(snacks = false): void {
    // a treat for the road, snacks for the mine, and (once) dishes for the Kitchen Treats bundle
    if (!shopOpen(this.sim, 'cafe').open || this.late) return;
    const dishes = this.p.inv.filter((s) => s && tryItem(s.id)?.cat === 'food').reduce((t, s) => t + s!.n, 0);
    const wantKitchen = !bundleDone(this.sim, 'crafted', 'kitchen') && this.st.day >= 14 && this.st.buildings.houseLevel === 0;
    const wantSnacks = snacks && dishes < 4;
    if (!wantSnacks && !wantKitchen) return;
    if (this.p.coins < 700 + (wantSnacks ? 0 : this.reserve())) return;
    this.visitShop('cafe');
    if (wantKitchen) for (const id of ['pancakes', 'hotCocoa', 'cookies']) this.buy('cafe', id, 1);
    if (wantSnacks) {
      const n = Math.min(4, Math.floor((this.p.coins - 300) / 150));
      if (n > 0) this.buy('cafe', 'pancakes', n);
    }
    this.pause(8);
  }
  museum(): void {
    if (this.late) return;
    for (const c of this.chests()) for (const s of c.items as Slots) if (s && canDonate(this.sim, s.id) && this.boardWant(s) === 0) this.withdraw(s.id, 1);
    const give = this.p.inv.filter((s) => s && canDonate(this.sim, s.id) && this.boardWant(s) === 0);
    if (!give.length) return;
    this.enter('museum');
    for (const s of give) {
      donateToMuseum(this.sim, s!.id);
      this.pause(4);
    }
  }
  hall(): number {
    if (this.late) return 0;
    // fetch everything a bundle could take from the chests
    for (const bd of BOARDS)
      for (const b of bd.bundles) {
        if (bundleDone(this.sim, bd.id, b.id)) continue;
        const slots = bundleSlots(this.sim, bd.id, b.id);
        b.options.forEach((o, i) => {
          if (slots[i]) return;
          for (const c of this.chests())
            for (const s of c.items as Slots) if (s && optionMatches(o, s) && (s.q ?? 0) >= (o.q ?? 0) && count(this.p.inv, s.id) < o.n) this.withdraw(s.id, o.n - count(this.p.inv, s.id));
        });
      }
    let n = 0;
    for (const bd of BOARDS)
      for (const b of bd.bundles) {
        for (let k = 0; k < 8; k++) {
          const can = donatable(this.sim, bd.id, b.id);
          if (!can.length) break;
          const [oi, slot] = can[0];
          if (donate(this.sim, bd.id, b.id, oi, slot).ok) n++;
          else break;
        }
      }
    const lamp = this.st.story.heartstone === 1 && this.has('heartstone');
    if (n || lamp) {
      this.enter('hall');
      this.pause(10 + n * 3);
      if (lamp && placeHeartstone(this.sim)) {
        this.pause(45);
        this.did.push('heartstone');
      }
    }
    return n;
  }
  errands(): void {
    this.digSpots('town');
    this.fishShop();
    this.seedShopping();
    this.carpenter();
    this.ranch();
    this.smithy();
    this.cafe();
    this.museum();
    this.hall();
  }

  // ── Friends ─────────────────────────────────────────────
  socialize(max: number): void {
    let talked = 0;
    const here = this.p.loc;
    const list = npcs(this.sim).list.filter((r) => !r.hidden && !this.st.npcs[r.id]?.talked).sort((a, b) => Number(b.loc === here) - Number(a.loc === here));
    for (const rt of list) {
      if (talked >= max || this.late) break;
      const v = VILLAGER[rt.id];
      if (!v) continue;
      const l = this.sim.loc(rt.loc);
      const tx = Math.floor(rt.x / TILE), ty = Math.floor((rt.y - 2) / TILE);
      const n = nearestOpen(l, tx, ty + 1, 4);
      this.goto(rt.loc, n[0], n[1]);
      talk(this.sim, rt.id);
      this.pause(8);
      talked++;
      // a gift they like, if we have a spare one
      const gift = this.p.inv.findIndex((s) => s && canGift(this.sim, rt.id, s.id).ok && s.n > this.keepOf(s) && ['love', 'like'].includes(taste(v, s.id)));
      if (gift >= 0 && giveGift(this.sim, rt.id, gift).ok) this.pause(6);
    }
  }

  // ── Mining ──────────────────────────────────────────────
  wantsMine(): boolean {
    const st = this.st;
    if (st.story.heartstone === 0) return true;
    if (!st.story.done.includes('minerals')) return true;
    return this.total('copperBar') + this.total('copperOre') / 5 < 4 || this.total('ironOre') + this.total('ironBar') * 5 < 10;
  }
  mineTrip(until: number): void {
    const sim = this.sim, st = this.st;
    if ((this.p.tools.bonk ?? -1) < 0) {
      // Lumi's bonk stick on the lobby workbench
      this.p.tools.bonk = 0;
      sim.give('tool.bonk', 1, 0, true);
    }
    this.did.push('mine');
    const lift = liftOk(sim);
    const cap = lift ? TUNING.mineFloors : TUNING.liftFloor;
    let start = Math.min(st.mine.elevator, cap);
    // if we're stuck at the lift gate, hunt ore & gems a few floors up
    if (!lift && st.mine.deepest >= TUNING.liftFloor) start = st.day % 2 ? 15 : 10;
    this.enter('minelobby');
    this.pause(start > 0 ? 6 : 2);
    enterFloor(sim, Math.max(1, start));
    let floors = 0;
    while (st.min < until && !this.late) {
      const loc = sim.here;
      if (this.p.hp <= 0) {
        this.faint();
        return;
      }
      if (!this.energyOk(14) || !this.healthOk(30)) break;
      for (const [i, o] of [...loc.objs]) {
        const x = i % loc.w, y = Math.floor(i / loc.w);
        if (o.k === 'mineChest') {
          this.approach('mine', x, y);
          openMineChest(sim, loc, x, y);
          this.pause(4);
        }
        if (o.k === 'heartstone') {
          this.approach('mine', x, y);
          takeHeartstone(sim, loc, x, y);
          this.pause(40);
          this.did.push('found heartstone');
        }
      }
      const ladder = [...loc.objs.entries()].find(([, o]) => o.k === 'ladder');
      const deeper = st.mine.floor < cap;
      if (ladder && deeper && canDescend(sim).ok) {
        // grab any ore/gem on the way
        this.breakNodes(loc, true);
        this.approach('mine', ladder[0] % loc.w, Math.floor(ladder[0] / loc.w));
        enterFloor(sim, st.mine.floor + 1);
        floors++;
        this.critters();
        continue;
      }
      if (!this.breakNodes(loc, false)) break;
    }
    this.enter('minelobby');
    enterFloor(sim, 0);
  }
  /** Fights with bouncy critters: a little time and a bump or two (they poof into sparkles). */
  critters(): void {
    const L = layerOf(this.st.mine.floor);
    const r = this.rng();
    this.spend((8 + L * 6 + r.int(10)) * MPS);
    const tough = this.p.tools.bonk ?? 0;
    const bumps = Math.max(0, r.int(2 + L) - tough);
    this.p.hp = Math.max(0, this.p.hp - bumps * (3 + L * 2));
  }
  /** Break the nearest rock (onlyNodes: just ore/gem nodes). Returns false when nothing is left. */
  breakNodes(loc: Loc, onlyNodes: boolean): boolean {
    const pt = this.sim.playerTile();
    let best: [number, number] | null = null, bd = 1e9;
    for (const [i, o] of loc.objs) {
      const node = o.k === 'ore' || o.k === 'gem';
      if (onlyNodes ? !node : !['rock', 'ore', 'gem', 'ice', 'box'].includes(o.k)) continue;
      const x = i % loc.w, y = Math.floor(i / loc.w);
      const d = Math.abs(x - pt.x) + Math.abs(y - pt.y) - (node ? 8 : 0);
      if (d < bd && (!onlyNodes || d < 6)) {
        bd = d;
        best = [x, y];
      }
    }
    if (!best) return false;
    this.approach(loc.id, best[0], best[1]);
    for (let k = 0; k < 8 && loc.obj(best[0], best[1]) && this.energyOk(10); k++) {
      useTool(this.sim, 'pick', best[0], best[1]);
      this.swing();
    }
    return true;
  }
  quarry(): void {
    if (!this.st.story.done.includes('forage') || this.late) return;
    const l = this.sim.loc('quarry');
    this.enter('quarry');
    for (const [i, o] of [...l.objs]) {
      if (!['rock', 'ore', 'gem'].includes(o.k) || !this.energyOk(14)) continue;
      const x = i % l.w, y = Math.floor(i / l.w);
      this.approach('quarry', x, y);
      for (let k = 0; k < 6 && l.obj(x, y); k++) {
        useTool(this.sim, 'pick', x, y);
        this.swing();
      }
    }
    this.did.push('quarry');
  }

  // ── Fishing ─────────────────────────────────────────────
  fishSpot(loc: string, zone: string): [number, number, number, number] | null {
    const key = `${loc}:${zone}:${this.st.story.done.includes('fish')}`;
    if (!this.spots.has(key)) {
      const l = this.sim.loc(loc);
      let found: [number, number] | null = null;
      outer: for (let y = 1; y < l.h - 1; y++)
        for (let x = 1; x < l.w - 1; x++) {
          if (l.blocked(x, y) || l.isWater(x, y)) continue;
          for (const [dx, dy] of [[0, 1], [-1, 0], [1, 0], [0, -1]]) {
            if (zoneAt(l, x + dx, y + dy) === zone && l.isWater(x + dx * 2, y + dy * 2)) {
              found = [x, y];
              if ((x * 7 + y * 3) % 5 === 0) break outer;
            }
          }
        }
      this.spots.set(key, found);
    }
    const s = this.spots.get(key);
    if (!s) return null;
    const l = this.sim.loc(loc);
    for (const [dx, dy] of [[0, 1], [-1, 0], [1, 0], [0, -1]]) if (zoneAt(l, s[0] + dx, s[1] + dy) === zone) return [s[0], s[1], s[0] + dx, s[1] + dy];
    return null;
  }
  wantsFish(): string | null {
    if (this.st.story.done.includes('fish') || (this.p.tools.rod ?? -1) < 0) return null;
    const missing = (bundle: string) => !bundleDone(this.sim, 'fish', bundle);
    const opts: [string, string][] = [];
    if (missing('river')) opts.push(['town', 'river'], ['mountain', 'river'], ['forest', 'river']);
    if (missing('ocean')) opts.push(['beach', 'ocean']);
    if (missing('lake')) opts.push(['mountain', 'lake'], ['farm', 'pond']);
    if (!opts.length) return null;
    const [loc, zone] = opts[(this.st.day + this.rngN) % opts.length];
    return `${loc}:${zone}`;
  }
  fishTrip(where: string, minutes: number): void {
    const sim = this.sim;
    const [loc, zone] = where.split(':');
    const spot = this.fishSpot(loc, zone);
    if (!spot) return;
    this.did.push(`fish ${where}`);
    this.goto(loc, spot[0], spot[1]);
    const l = sim.here;
    const z = zoneAt(l, spot[2], spot[3]);
    if (!z) return;
    const end = this.st.min + minutes;
    while (this.st.min < end && !this.late && this.energyOk(10)) {
      if (!biteable(sim, z).length) break;
      const r = this.rng();
      const bait = this.has('bait') && remove(this.p.inv, 'bait', 1);
      sim.useEnergy(Math.max(1, TUNING.energy.fish - Math.floor(level(sim, 'fishing') / 3)));
      // cast + wait for the nibble (clock runs)
      this.spend((2 + biteDelay(sim, r, !!bait)) * MPS);
      const c = pickCatch(sim, z, r);
      const reel = new Reel(reelParams(sim, c.kind === 'fish' ? c.id : null), r.int(1e9));
      const res = autoReel(reel);
      this.pause(Math.min(20, reel.t) + 2); // the reel holds the clock
      if (res === 'caught') landCatch(sim, c, reel.perfect);
    }
  }
  crabPots(): void {
    const sim = this.sim;
    const spots: [string, string, number][] = [['farm', 'pond', 3]];
    for (const [loc, zone, want] of spots) {
      const l = sim.loc(loc);
      let pots = [...l.objs.values()].filter((o) => o.k === 'crabpot').length;
      if (pots < want) this.withdraw('crabPot', want - pots);
      if (pots < want && this.has('crabPot')) {
        for (let y = 1; y < l.h - 1 && pots < want && this.has('crabPot'); y++)
          for (let x = 1; x < l.w - 1 && pots < want && this.has('crabPot'); x += 3) {
            if (zoneAt(l, x, y) !== zone || l.obj(x, y)) continue;
            const land = [[0, -1], [-1, 0], [1, 0], [0, 1]].find(([dx, dy]) => !l.isWater(x + dx, y + dy) && !l.blocked(x + dx, y + dy));
            if (!land) continue;
            this.goto(loc, x + land[0], y + land[1]);
            if (placeItem(sim, 'crabPot', x, y).ok) {
              remove(this.p.inv, 'crabPot', 1);
              pots++;
            }
          }
      }
      if (!pots) continue;
      this.withdraw('bait', 10);
      for (const [i, o] of l.objs) {
        if (o.k !== 'crabpot' || (!o.out && o.bait)) continue;
        const x = i % l.w, y = Math.floor(i / l.w);
        const land = [[0, -1], [-1, 0], [1, 0], [0, 1]].find(([dx, dy]) => !l.isWater(x + dx, y + dy) && !l.blocked(x + dx, y + dy));
        if (land) this.goto(loc, x + land[0], y + land[1]);
        interactAt(sim, x, y); // collect
        if (!o.bait) interactAt(sim, x, y); // bait
      }
    }
  }
  /** Dig up the wiggly artifact spots with the hoe. */
  digSpots(loc: string): void {
    const l = this.sim.loc(loc);
    for (const [i, o] of [...l.objs]) {
      if (o.k !== 'spot' || this.late || !this.energyOk(10)) continue;
      const x = i % l.w, y = Math.floor(i / l.w);
      this.approach(loc, x, y);
      useTool(this.sim, 'hoe', x, y);
      this.swing();
    }
  }
  /** Keep the silo stocked: cut tall grass, or buy hay before winter. */
  hay(): void {
    const b = this.st.buildings;
    if (b.built.silo === undefined || !this.st.animals.length) return;
    if (this.has('hay')) {
      const n = count(this.p.inv, 'hay');
      remove(this.p.inv, 'hay', addHay(this.sim, n));
    }
    if (b.hay >= this.st.animals.length * 6) return;
    const f = this.farm();
    let cut = 0;
    for (const [i, o] of [...f.objs]) {
      if (o.k !== 'grass' || cut > 30 || this.late) continue;
      const x = i % f.w, y = Math.floor(i / f.w);
      this.approach('farm', x, y);
      useTool(this.sim, 'scythe', x, y);
      this.swing();
      cut++;
    }
  }

  // ── Foraging & wood ─────────────────────────────────────
  forage(loc: string, chop = false): void {
    const sim = this.sim;
    if (!sim.hasLoc(loc) || this.late) return;
    this.did.push(`forage ${loc}`);
    const l = sim.loc(loc);
    for (const [i, o] of [...l.objs]) {
      if (this.late) return;
      const x = i % l.w, y = Math.floor(i / l.w);
      if (o.k === 'forage' || (o.k === 'bush' && (o.n ?? 0) > 0 && o.inp)) {
        this.approach(loc, x, y);
        interactAt(sim, x, y);
        this.spend(0.3 * MPS);
      } else if (o.k === 'spot' && this.energyOk(10)) {
        this.approach(loc, x, y);
        useTool(sim, 'hoe', x, y);
        this.swing();
      }
    }
    if (chop) this.chop(loc, 12);
  }
  /** Chop grown trees (and stumps/twigs) for wood, sap and tree seeds. */
  chop(loc: string, maxTrees: number): void {
    const l = this.sim.loc(loc);
    let n = 0;
    const isField = (x: number, y: number) => loc === 'farm' && x >= FIELD.x - 1 && x <= FIELD.x + FIELD.w && y >= FIELD.y - 1 && y <= FIELD.y + FIELD.h;
    for (const [i, o] of [...l.objs]) {
      if (n >= maxTrees || this.late || !this.energyOk(20)) return;
      const x = i % l.w, y = Math.floor(i / l.w);
      if (loc === 'farm' && !isField(x, y) && o.k === 'tree' && (o.id === 'maple' || o.id === 'oak') && this.st.day < 30) continue; // keep some for tappers
      if (o.k === 'tree' && (o.g ?? 0) >= 4 && !o.tap) {
        this.clear(loc, x, y); // tree → stump
        this.clear(loc, x, y); // stump
        n++;
      } else if (o.k === 'twig' || o.k === 'stump') this.clear(loc, x, y);
    }
    if (n) this.did.push(`chop ${loc} ${n}`);
  }

  // ── Festivals ───────────────────────────────────────────
  festival(): void {
    const f = festivalToday(this.sim);
    if (!f || activityDone(this.sim, f)) return;
    if (this.st.min < f.open) this.spend(f.open - this.st.min);
    if (this.st.min >= f.close) return;
    this.enter('town');
    // the clock is held at the fair: look around, chat, play the minigame
    this.pause(9 * 60);
    finishActivity(this.sim, f, this.st.day % 3 === 0 ? 1 : 2);
    this.st.flags[`left.${f.id}.${Math.floor(this.st.day / 40)}`] = 1;
    // leaving ends the fair: the clock jumps to closing time (not real time)
    if (this.st.min < f.close) this.sim.advanceMinutes(f.close - this.st.min);
    this.did.push(`festival ${f.id}`);
  }

  // ── One whole day ───────────────────────────────────────
  playDay(): DayLog {
    const st = this.st;
    const day = st.day;
    const start = this.realSec, paused0 = this.pausedSec;
    this.did = [];
    this.morning();
    const fest = festivalOn(day);
    if (fest) {
      // fair day: quick chores, then off to town for the morning
      this.harvestAll();
      this.waterAll();
      this.festival();
    }
    this.harvestAll();
    this.machines();
    this.waterAll();
    this.crafting();
    this.placeFarmStuff();
    this.plantAll();
    this.waterAll();
    this.crabPots();
    this.digSpots('farm');
    this.hay();
    this.shipExtras();
    this.stash();
    // a few extra chores before the shops open
    if (st.min < 9 * 60) {
      if (this.total('wood') < this.woodReserve() + 60) this.chop('farm', 6);
      else this.forage('farm');
    }
    if (st.min < 9 * 60) this.spend(9 * 60 - st.min);
    this.errands();
    this.crafting();
    this.placeFarmStuff();
    this.plantAll();
    this.waterAll();
    // the big activity of the day (a kid picks one or two things to do)
    const fishWhere = this.wantsFish();
    const mineDay = this.wantsMine() && day >= 2 && (!fishWhere || day % 3 !== 1) && !fest;
    let blocks = 0;
    this.windDown = 80; // leave time for the evening chores
    while (!this.late && blocks < 6) {
      blocks++;
      const where = this.wantsFish();
      if (mineDay && blocks === 1) {
        this.cafe(true);
        this.mineTrip(Math.min(this.bedtime() - 60, 21 * 60));
      } else if (where && (blocks === 1 || day % 2 === 0)) this.fishTrip(where, 150);
      else if (blocks >= 3 && (this.p.tools.rod ?? -1) >= 0 && this.p.energy > 30) this.fishTrip(['beach:ocean', 'town:river', 'mountain:lake', 'farm:pond'][(day + blocks) % 4], 120); // just for fun
      else if (this.total('wood') < this.woodReserve() + 80 && this.p.energy > 40) this.forage('forest', true);
      else {
        this.forage(['forest', 'beach', 'mountain', 'town'][(day + blocks) % 4]);
        this.quarry();
      }
      if (st.min < 16 * 60) this.errands();
      if (!this.late && st.min > 17 * 60) this.socialize(4);
    }
    this.windDown = 15;
    this.goto('farm', 29, 11);
    this.lostAndFound();
    this.harvestAll();
    this.machines();
    this.crafting();
    this.placeFarmStuff();
    this.cooking();
    this.shipExtras();
    this.stash();
    // a little free time (decorating, petting the dog), then bed: kids sleep when the day's done
    this.spend(Math.max(0, Math.min(25, this.bedtime() - st.min)));
    if (finaleToday(this.sim)) {
      // everyone gathers at the Valley Hall at 6 pm
      if (st.min < 18 * 60) this.spend(18 * 60 - st.min);
      this.enter('hall');
      this.pause(6 * 60); // the reopening celebration + credits
      st.story.finale = 1;
      this.finaleDay = day;
      this.did.push('FINALE');
    }
    const log: DayLog = {
      day,
      realSec: this.realSec - start,
      pausedSec: this.pausedSec - paused0,
      bed: st.min,
      coins: this.p.coins,
      boards: st.story.done.length,
      deepest: st.mine.deepest,
      energyLeft: Math.round(this.p.energy),
      did: this.did,
    };
    this.enter('farmhouse');
    this.sim.sleep(false);
    this.pause(10); // day summary
    this.days.push(log);
    return log;
  }

  /** Unfinished bundles (for debugging). */
  missing(): string[] {
    const out: string[] = [];
    for (const bd of BOARDS) for (const b of bd.bundles) if (!bundleDone(this.sim, bd.id, b.id)) out.push(`${bd.id}.${b.id}`);
    if (this.st.story.heartstone < 2) out.push(`heartstone(${this.st.story.heartstone}, deepest ${this.st.mine.deepest})`);
    return out;
  }
  skillLevels(): Record<SkillId, number> {
    const out = {} as Record<SkillId, number>;
    for (const s of ['farming', 'mining', 'foraging', 'fishing', 'cooking'] as SkillId[]) out[s] = level(this.sim, s);
    return out;
  }
}
