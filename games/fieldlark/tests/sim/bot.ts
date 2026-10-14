/**
 * A headless player for the playthrough and pacing tests: it plays a new farm through the story to
 * the credits, using only the same actions the game's buttons use (src/sim/actions.ts and the sim's
 * own functions), and pays for every action in farm time (a tap and a little thinking), like an
 * engaged kid rather than a perfect machine.
 *
 * It plays by needs: what the chapter's goals, the board's story requests and the contracts ask for
 * become things to grow, raise, make or build; anything spare goes to orders, the stand or the barn's
 * buyers. `opts.crop` and the stand price let the economy test try one-sided strategies.
 */
import { ANIMAL, ANIMALS } from '../../src/data/animals';
import { BUILDING } from '../../src/data/buildings';
import type { Goal } from '../../src/data/chapters';
import { CROP, CROPS, profitPerMinute, type CropDef } from '../../src/data/crops';
import { DECOR } from '../../src/data/decor';
import { ITEMS } from '../../src/data/items';
import { LAB } from '../../src/data/lab';
import { TREES } from '../../src/data/orchard';
import { RECIPE, RECIPES } from '../../src/data/production';
import { VARIETIES } from '../../src/data/varieties';
import { act, type Action } from '../../src/sim/actions';
import { animalsIn, feedFor, isHome, isReady } from '../../src/sim/animals';
import { notYet, placeCheck, type Buyable } from '../../src/sim/build';
import { seasonOf } from '../../src/sim/clock';
import { canSendDrop } from '../../src/sim/contracts';
import { beauty, canOpen } from '../../src/sim/decorate';
import { bestEntries, enterFair, fairOpen } from '../../src/sim/fair';
import { fieldState } from '../../src/sim/fields';
import { isGreenhouse, plantPlot, plotsOf, plotState } from '../../src/sim/greenhouse';
import { assign, helperSlots, hire } from '../../src/sim/helpers';
import { count, roomLeft, barnCap, totalItems } from '../../src/sim/inventory';
import { cantLearn, labOpen } from '../../src/sim/lab';
import { AREAS, tileAt, type AreaId } from '../../src/sim/map';
import { priceOf } from '../../src/sim/market';
import { acceptTrade, giveToCoop, NEIGHBOR_LEVEL, startCoop, tradeOffer } from '../../src/sim/neighbors';
import { tileKey, type FieldObj, type OtherObj } from '../../src/sim/objects';
import { canFill, obtainable } from '../../src/sim/orders';
import { cantStart, isMachine, machineState, slotsOf } from '../../src/sim/production';
import { shelves, standOpen } from '../../src/sim/stand';
import type { Farm } from '../../src/sim/state';
import { beginChapter, chapterComplete, chapterOf, finishChapter, goalProgress, holdGrandFair, readyForGrandFair, storyDone } from '../../src/sim/story';
import { advance, type SimEvent } from '../../src/sim/tick';
import { isTree, treeRipe } from '../../src/sim/trees';
import { seedPrice, varietyChoice } from '../../src/sim/varieties';
import { channelAt, waterOpen } from '../../src/sim/water';
import { levelOf, occupancy } from '../../src/sim/world';

export interface BotOptions {
  /** Seconds of play each action costs: finding the spot, a tap and a little thinking (6 by default, a kid's pace). */
  actSec?: number;
  /** Stop after this many hours of play. */
  maxHours?: number;
  /** 'mix' (default): what's needed, else the best crop for the season; or always this one crop when it grows. */
  crop?: string;
  /** The stand's price slider for everything (1 = fair). */
  standPrice?: number;
  /** Use workshops for orders and profit, not only for what the story needs. */
  workshops?: boolean;
  /** Stop when this returns true (checked every step). */
  until?: (farm: Farm) => boolean;
}

export interface BotReport {
  done: boolean;
  /** Hours of play: farm time, plus the time spent reading the story while the farm clock is stopped. */
  hours: number;
  /** Of which: reading story dialogue, cards and results (the farm clock stops for these). */
  readingHours: number;
  /** Hours of play when each chapter was finished. */
  chapters: number[];
  /** The longest stretch (minutes) the bot spent with nothing to do but wait for coins. */
  longestCoinWait: number;
  safetyNets: number;
  events: Record<string, number>;
  /** Why it stopped early, if it did. */
  stuck: string | null;
}

const isWater = (x: number, z: number) => x >= 0 && z >= 0 && x < 56 && z < 56 && tileAt(x, z).water;

export class Bot {
  readonly opts: Required<Omit<BotOptions, 'until'>> & Pick<BotOptions, 'until'>;
  report: BotReport = { done: false, hours: 0, readingHours: 0, chapters: [], longestCoinWait: 0, safetyNets: 0, events: {}, stuck: null };
  /** Seconds spent reading (dialogue about 5 s a line; cards a few seconds). */
  private reading = 0;
  private coinWaitSince: number | null = null;
  private reserve = 0;

  constructor(public farm: Farm, opts: BotOptions = {}) {
    this.opts = { actSec: 6, maxHours: 12, crop: 'mix', standPrice: 1, workshops: true, ...opts };
  }

  // --- time ---
  private pass(sec: number) {
    let left = sec;
    while (left > 0) {
      const dt = Math.min(1, left);
      left -= dt;
      for (const e of advance(this.farm, dt)) this.onEvent(e);
    }
  }
  private onEvent(e: SimEvent) {
    this.report.events[e.type] = (this.report.events[e.type] ?? 0) + 1;
    if (e.type === 'level-up' || e.type === 'safety-net' || e.type === 'coop-done' || e.type === 'contract-done') this.reading += 5;
    if (e.type === 'safety-net') this.report.safetyNets++;
  }
  /** Coins spent and earned by each kind of action (for tuning). */
  readonly money: Record<string, number> = {};
  /** How many of each action it did, and how many failed (for tuning the bot). */
  readonly acts: Record<string, number> = {};
  private do(a: Action): boolean {
    const before = this.farm.coins;
    const r = act(this.farm, a);
    const k = `${a.type}${r.ok ? '' : '!'}`;
    this.acts[k] = (this.acts[k] ?? 0) + 1;
    // learning: the first few times a kid does a new kind of thing, they look around for it
    if (r.ok && (this.acts[a.type] ?? 0) <= 3) this.pass(20);
    const key = a.type === 'buy' ? `buy:${a.what.def}` : a.type;
    if (this.farm.coins !== before) this.money[key] = (this.money[key] ?? 0) + this.farm.coins - before;
    this.pass(this.opts.actSec);
    return r.ok;
  }

  run(): BotReport {
    const farm = this.farm;
    const limit = farm.t + this.opts.maxHours * 3600;
    const start = farm.t;
    while (farm.t < limit) {
      if (this.opts.until?.(farm)) break;
      if (this.story()) { if (storyDone(farm)) break; continue; }
      if (!this.step()) {
        // nothing useful to do: wait a little (and note how long we waited only on coins)
        this.pass(5);
        if (this.reserve > farm.coins) { this.coinWaitSince ??= farm.t; this.report.longestCoinWait = Math.max(this.report.longestCoinWait, (farm.t - this.coinWaitSince) / 60); }
        else this.coinWaitSince = null;
      } else this.coinWaitSince = null;
    }
    this.report.done = storyDone(farm);
    this.report.readingHours = this.reading / 3600;
    this.report.hours = (farm.t - start) / 3600 + this.report.readingHours;
    if (!this.report.done && !this.report.stuck) this.report.stuck = `chapter ${farm.story.chapter + 1}: ${this.openGoals().join('; ')}`;
    return this.report;
  }

  openGoals(): string[] {
    const ch = chapterOf(this.farm);
    return ch ? ch.goals.filter(g => !goalProgress(this.farm, g).done).map(g => `${g.id} ${goalProgress(this.farm, g).have}/${goalProgress(this.farm, g).need}`) : [];
  }

  /** The story's own moments: a chapter begins, ends, the Grand Fair. Returns true if something happened. */
  private story(): boolean {
    const farm = this.farm;
    if (storyDone(farm)) return true;
    // reading the story: about four seconds a line (the clock stops for dialogue in the game, so this
    // costs real time only; it is not counted as farm time)
    if (!farm.story.introSeen) { this.reading += (chapterOf(farm)?.intro.length ?? 0) * 5; beginChapter(farm); return true; }
    if (readyForGrandFair(farm)) { holdGrandFair(farm); enterFair(farm, bestEntries(farm), true); this.pass(20); }
    if (chapterComplete(farm)) {
      this.reading += (chapterOf(farm)?.outro.length ?? 0) * 5 + 8;
      finishChapter(farm);
      this.report.chapters.push(farm.t / 3600);
      return true;
    }
    return false;
  }

  // --- what the bot wants ---
  /** Items the bot is working towards: story requests, contracts, goals. (Never sold.) */
  needs(): Map<string, number> {
    const farm = this.farm;
    const need = new Map<string, number>();
    const add = (id: string, n: number) => need.set(id, (need.get(id) ?? 0) + n);
    for (const o of farm.orders) if (o.story) for (const x of o.items) add(x.id, x.n);
    for (const c of farm.contracts) if (c.done + c.sent < c.drops) for (const x of c.basket) add(x.id, x.n);
    const ch = chapterOf(farm);
    if (ch) for (const g of ch.goals) {
      if (goalProgress(farm, g).done || g.kind !== 'stat') continue;
      const p = goalProgress(farm, g);
      // "make N" means making more, whatever is in the barn already
      if (g.key.startsWith('made:')) add(g.key.slice(5), count(farm, g.key.slice(5)) + p.need - p.have);
      if (g.key.startsWith('collect:')) add(g.key.slice(8), 1);
    }
    if (farm.coop) add(farm.coop.item, Math.max(0, farm.coop.need - farm.coop.mine - farm.coop.theirs));
    // when the chapter asks for orders, the board's orders are needs too
    if (ch?.goals.some(g => g.kind === 'stat' && g.key === 'orders' && !goalProgress(farm, g).done)) for (const o of farm.orders) if (!o.story) for (const x of o.items) add(x.id, x.n);
    // expand made goods into their ingredients
    for (let pass = 0; pass < 3; pass++) for (const [id, n] of [...need]) {
      const r = RECIPE[id];
      if (!r) continue;
      const short = Math.max(0, n - count(farm, id));
      for (const [inp, k] of Object.entries(r.inputs)) if (short > 0 && !need.has(`${inp}#${id}`)) { add(inp, k * Math.ceil(short)); need.set(`${inp}#${id}`, 1); }
    }
    for (const k of [...need.keys()]) if (k.includes('#')) need.delete(k);
    return need;
  }

  private goal(kind: string): Goal | undefined {
    const ch = chapterOf(this.farm);
    return ch?.goals.find(g => !goalProgress(this.farm, g).done && (g.id === kind || (g.kind === 'stat' && g.key === kind)));
  }

  // --- one action: chores and the story's jobs take turns (a kid does both, not one then the other) ---
  private turn = 0;
  private step(): boolean {
    const chores = () => this.collectThings() || this.waterAndCompost() || this.feedAndBrush() || this.plantFields();
    const jobs = () => this.storyBuys() || this.workshops() || this.greenhouses() || this.deliver() || this.contracts() || this.helpers()
      || this.channelGoal() || this.neighbours() || this.fair() || this.lab() || this.stand() || this.expand() || this.clearSome() || this.sellSpare();
    return ++this.turn % 2 ? chores() || jobs() : jobs() || chores();
  }

  private collectThings(): boolean {
    const farm = this.farm;
    if (roomLeft(farm) < 8) return this.sellSpare(true);
    for (const o of farm.objects) {
      if (o.kind === 'field' && fieldState(farm, o) === 'ready') return this.do({ type: 'harvest', x: o.x, z: o.z });
      if (isTree(o) && treeRipe(farm, o)) return this.do({ type: 'pickTree', id: o.id });
      if (isHome(o) && ANIMAL[BUILDING[o.def]!.holds!]?.product && animalsIn(o).some(a => isReady(farm, a))) return this.do({ type: 'collect', home: o.id });
      if (isMachine(o) && machineState(o).shelf.length) return this.do({ type: 'collectGoods', machine: o.id });
      if (isGreenhouse(o)) { const i = plotsOf(o).findIndex(p => plotState(farm, p) === 'ready'); if (i >= 0) return this.do({ type: 'pickPlot', building: o.id, plot: i }); }
    }
    return false;
  }

  private waterAndCompost(): boolean {
    const farm = this.farm;
    for (const o of farm.objects) {
      if (o.kind !== 'field' || fieldState(farm, o) !== 'growing') continue;
      if (!o.watered) return this.do({ type: 'water', x: o.x, z: o.z });
      if (!o.fertilized && count(farm, 'fertilizer') > 0) return this.do({ type: 'fertilize', x: o.x, z: o.z });
    }
    return false;
  }

  private feedAndBrush(): boolean {
    const farm = this.farm;
    for (const o of farm.objects) {
      if (!isHome(o)) continue;
      const def = ANIMALS.find(a => a.home === o.def);
      if (!def || def.id === 'bee' || def.id === 'dog') continue;
      const list = animalsIn(o);
      if (list.some(a => !a.fed && !isReady(farm, a)) && feedFor(farm, def.id)) return this.do({ type: 'feed', home: o.id });
      if (list.some(a => !a.brushed && !isReady(farm, a))) return this.do({ type: 'brush', home: o.id });
    }
    return false;
  }

  // --- placing things ---
  /** A free spot for a footprint, in open land, scanning out from the cottage. */
  spot(w: number, d: number, b?: Buyable, areas?: AreaId[]): { x: number; z: number } | null {
    const farm = this.farm;
    const occ = occupancy(farm);
    const cands: { x: number; z: number; dist: number }[] = [];
    for (const a of AREAS) {
      if (!farm.unlocked.includes(a.id) || (areas && !areas.includes(a.id))) continue;
      for (let z = a.z0; z <= a.z1 - d + 1; z++) for (let x = a.x0; x <= a.x1 - w + 1; x++) {
        let free = true;
        for (let dz = 0; dz < d && free; dz++) for (let dx = 0; dx < w && free; dx++) if (occ.has(tileKey(x + dx, z + dz)) || tileAt(x + dx, z + dz).water || channelAt(farm, x + dx, z + dz)) free = false;
        if (!free) continue;
        if (b && !placeCheck(farm, b, { x, z, rot: 0 }).ok) continue;
        cands.push({ x, z, dist: Math.hypot(x - 40, z - 44) });
      }
    }
    cands.sort((p, q) => p.dist - q.dist);
    return cands[0] ?? null;
  }

  private buy(def: string, kind: 'building' | 'tree' = 'building', areas?: AreaId[]): boolean {
    const farm = this.farm;
    const b: Buyable = { kind, def };
    const info = kind === 'building' ? BUILDING[def]! : { w: 1, d: 1, cost: TREES.find(t => t.id === def)!.cost, level: TREES.find(t => t.id === def)!.level };
    if (levelOf(farm) < info.level || notYet(farm, b)) return false;
    if (farm.coins < info.cost) { this.reserve = Math.max(this.reserve, info.cost); return false; }
    const at = this.spot(info.w, info.d, b, areas);
    if (!at) return this.clearSome(true);
    const ok = this.do({ type: 'buy', what: b, x: at.x, z: at.z });
    if (ok) this.reserve = 0;
    return ok;
  }

  private has = (def: string) => this.farm.objects.some(o => o.def === def);

  /** Buildings, animals and land the chapter (or what it needs) calls for. */
  private storyBuys(): boolean {
    const farm = this.farm;
    const ch = farm.story.chapter;
    const need = this.needs();
    const level = levelOf(farm);
    // animal homes for wanted products, and enough animals
    const wantHome = (animal: string, n: number) => {
      const def = ANIMAL[animal]!;
      if (level < def.level) return false;
      const homes = farm.objects.filter(o => o.def === def.home);
      if (!homes.length) return this.buy(def.home, 'building', def.home === 'duckhouse' ? ['pond', 'home', 'riverside'] : undefined);
      const have = homes.reduce((s, o) => s + animalsIn(o as OtherObj).length, 0);
      if (have < n) {
        const home = homes.find(o => animalsIn(o as OtherObj).length < (BUILDING[def.home]!.cap ?? 0)) as OtherObj | undefined;
        if (home) { if (farm.coins >= def.cost) return this.do({ type: 'buyAnimal', home: home.id }); this.reserve = Math.max(this.reserve, def.cost); }
      }
      return false;
    };
    if (ch >= 1 && wantHome('chicken', ch >= 2 ? 4 : 2)) return true;
    const hives = farm.objects.filter(o => o.def === 'beehive').length;
    if ((ch >= 3 || need.has('honey')) && hives < (need.has('honey') ? 2 : 1) && this.buy('beehive')) return true;
    if ((need.has('milk') || need.has('cheese') || need.has('butter') || ch >= 6) && wantHome('cow', 3)) return true;
    if ((need.has('wool') || need.has('yarn') || need.has('scarf') || this.goal('c6-sheep')) && wantHome('sheep', 4)) return true;
    if ((need.has('duckegg') || this.goal('c7-ducks')) && (farm.unlocked.includes('pond') || farm.unlocked.includes('riverside')) && wantHome('duck', 2)) return true;
    // workshops for what's needed
    for (const id of need.keys()) {
      const r = RECIPE[id];
      if (r && !this.has(r.machine) && this.buy(r.machine)) return true;
    }
    if (this.goal('c3-mill') && this.buy('mill')) return true;
    if (this.goal('c6-glass') && this.buy('greenhouse')) return true;
    // fruit trees for wanted fruit
    for (const id of need.keys()) {
      const t = TREES.find(x => x.fruit === id);
      if (t && !farm.objects.some(o => o.def === t.id) && this.buy(t.id, 'tree')) return true;
    }
    // land the story asks for
    for (const g of chapterOf(farm)?.goals ?? []) {
      if (g.kind !== 'land' || goalProgress(farm, g).done) continue;
      const area = g.area.split('|')[0] as AreaId;
      const why = canOpen(farm, area);
      if (!why) return this.do({ type: 'openLand', area });
      const cost = { meadow: 400, orchard: 1500, pond: 2600, riverside: 4200, hilltop: 7000 }[area as string] ?? 0;
      this.reserve = Math.max(this.reserve, cost);
    }
    // a pretty farm for the Grand Fair
    if (this.goal('c8-beauty') && beauty(farm).score < 70) {
      const d = DECOR.find(x => x.id === (level >= 6 ? 'birdbath' : 'bench'))!;
      if (farm.coins >= d.cost + 50) { const at = this.spot(1, 1); if (at) return this.do({ type: 'decor', def: d.id, x: at.x, z: at.z }); }
      else this.reserve = Math.max(this.reserve, d.cost + 50);
    }
    return false;
  }

  // --- fields ---
  private cropFor(f: FieldObj): { crop: string; variety: string | null } | null {
    const farm = this.farm;
    const season = seasonOf(farm.t), level = levelOf(farm);
    const can = (c: CropDef) => c.level <= level && c.seasons.includes(season) && (!c.wet || [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].some(([dx, dz]) => isWater(f.x + dx!, f.z + dz!)));
    const afford = (c: CropDef, v: string | null = null) => farm.coins >= seedPrice(c, v) + this.reserve * 0.2 || (farm.freeSeeds > 0 && !v);
    if (this.opts.crop !== 'mix') { const c = CROP[this.opts.crop]; return c && can(c) && afford(c) ? { crop: c.id, variety: null } : null; }
    // the story's planting goals
    if (this.goal('planted:clover') && can(CROP.clover!)) return { crop: 'clover', variety: null };
    if (this.goal('planted-heirloom') || this.goal('bred')) {
      for (const v of VARIETIES) {
        const c = CROP[v.crop]!;
        if (!v.heirloom || !can(c) || !varietyChoice(farm, c.id).some(x => x.id === v.id) || !afford(c, v.id)) continue;
        // plant the heirloom next to the same crop, near the hive, so the bees can cross them
        const nbr = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dz]) => farm.objects.find(o => o.kind === 'field' && o.x === f.x + dx! && o.z === f.z + dz!) as FieldObj | undefined);
        if (nbr.some(n => n?.crop === c.id && !n.variety)) return { crop: c.id, variety: v.id };
        if (nbr.some(n => n?.crop === c.id && n.variety === v.id)) return { crop: c.id, variety: null };
        if (nbr.some(n => n && !n.crop)) return { crop: c.id, variety: this.goal('planted-heirloom') ? v.id : null };
      }
    }
    // crops something needs (feed for animals too)
    const need = this.needs();
    for (const a of ANIMALS) if (farm.objects.some(o => o.def === a.home) && a.feeds.length && !a.feeds.some(id => count(farm, id) > 4)) need.set(a.feeds[0]!, 6);
    const wanted = [...need].filter(([id, n]) => CROP[id] && count(farm, id) < n).map(([id]) => CROP[id]!).filter(c => can(c) && afford(c));
    const pool = wanted.length ? wanted : CROPS.filter(c => can(c) && afford(c) && c.id !== 'clover');
    if (!pool.length) return can(CROP.clover!) && afford(CROP.clover!) ? { crop: 'clover', variety: null } : null;
    // tired soil: a legume; otherwise the best a minute, rotating away from the last family
    if (f.nit < 2 && !wanted.length) { const leg = pool.filter(c => c.family === 'legume'); if (leg.length) return { crop: leg.sort((a, b) => profitPerMinute(b) - profitPerMinute(a))[0]!.id, variety: null }; }
    const best = [...pool].sort((a, b) => (profitPerMinute(b) + (b.family !== f.last ? 1 : 0)) - (profitPerMinute(a) + (a.family !== f.last ? 1 : 0)));
    return { crop: best[0]!.id, variety: null };
  }

  private plantFields(): boolean {
    const farm = this.farm;
    for (const o of farm.objects) {
      if (o.kind !== 'field' || o.crop) continue;
      const c = this.cropFor(o);
      if (!c) continue;
      if (this.do({ type: 'plant', x: o.x, z: o.z, crop: c.crop, ...(c.variety ? { variety: c.variety } : {}) })) return true;
    }
    return false;
  }

  // --- workshops ---
  private workshops(): boolean {
    const farm = this.farm;
    const need = this.needs();
    for (const m of farm.objects.filter(isMachine)) {
      const s = machineState(m);
      if (s.queue.length >= slotsOf(m, farm)) continue;
      const recipes = RECIPES.filter(r => r.machine === m.def && !cantStart(farm, m, r));
      const short = (r: { id: string }) => (need.get(r.id) ?? 0) > count(farm, r.id) + s.queue.filter(j => j.recipe === r.id).length;
      // story requests first (and what goes into them), then everything else that's needed
      const story = new Set(farm.orders.filter(o => o.story).flatMap(o => o.items.flatMap(x => [x.id, ...Object.keys(RECIPE[x.id]?.inputs ?? {})])));
      const wanted = recipes.find(r => story.has(r.id) && short(r)) ?? recipes.find(short);
      const order = farm.orders.flatMap(o => o.items).find(x => recipes.some(r => r.id === x.id) && count(farm, x.id) < x.n);
      const pick = wanted ?? (order ? RECIPE[order.id] : undefined) ?? (this.opts.workshops && totalItems(farm) > barnCap(farm) * 0.4 ? recipes.find(r => Object.entries(r.inputs).every(([id, n]) => count(farm, id) >= n * 3 && !need.has(id))) : undefined);
      if (pick) return this.do({ type: 'make', machine: m.id, recipe: pick.id });
    }
    return false;
  }

  // --- selling ---
  private deliver(): boolean {
    const farm = this.farm;
    const need = this.needs();
    const ordersGoal = !!this.goal('orders');
    for (const o of farm.orders) {
      if (!canFill(farm, o)) continue;
      // keep what the story and contracts need (unless the chapter asks for orders, or it's a story request)
      if (!o.story && !ordersGoal && o.items.some(x => need.has(x.id) && count(farm, x.id) - x.n < (need.get(x.id) ?? 0))) continue;
      return this.do({ type: 'deliver', order: o.id });
    }
    // swap orders the farm can't make yet
    const can = obtainable(farm);
    const stale = farm.orders.find(o => !o.story && o.items.some(x => !can.has(x.id)));
    if (stale) return this.do({ type: 'skipOrder', order: stale.id });
    return false;
  }

  private contracts(): boolean {
    const farm = this.farm;
    // story requests come first: keep what they need
    const story = new Map<string, number>();
    for (const o of farm.orders) if (o.story) for (const x of o.items) story.set(x.id, (story.get(x.id) ?? 0) + x.n);
    for (const c of farm.contracts) {
      if (!canSendDrop(farm, c)) continue;
      if (c.basket.some(x => story.has(x.id) && count(farm, x.id) - x.n < story.get(x.id)!)) continue;
      return this.do({ type: 'sendDrop', business: c.business });
    }
    return false;
  }

  private stand(): boolean {
    const farm = this.farm;
    if (!standOpen(farm)) return false;
    const need = this.needs();
    const list = shelves(farm);
    for (let i = 0; i < list.length; i++) {
      const s = list[i]!;
      if (s.item && s.n > 0) { if (Math.abs(s.price - this.opts.standPrice) > 0.05) return this.do({ type: 'setPrice', slot: i, price: this.opts.standPrice }); continue; }
      // stock spare crops (not what the story needs), best stars first
      const spare = Object.keys(farm.inv).filter(id => ITEMS[id]?.sellable && !need.has(id) && count(farm, id) >= 6 && !list.some(x => x.item === id && x.n > 0));
      const id = spare.sort((a, b) => count(farm, b) - count(farm, a))[0];
      if (!id) return false;
      const stars = (farm.inv[id]![2] ? 3 : farm.inv[id]![1] ? 2 : 1) as 1 | 2 | 3;
      return this.do({ type: 'stock', slot: i, item: id, stars, n: 6 });
    }
    return false;
  }

  /** Sell what nothing needs: when the barn is filling up, or coins are short for the next thing. */
  sellSpare(force = false): boolean {
    const farm = this.farm;
    const full = totalItems(farm) > barnCap(farm) * 0.6;
    if (!force && !full && farm.coins >= this.reserve) return false;
    const need = this.needs();
    const keep = (id: string) => (need.get(id) ?? 0) + (ANIMALS.some(a => a.feeds[0] === id && farm.objects.some(o => o.def === a.home)) ? 6 : 0);
    for (const id of Object.keys(farm.inv).sort((a, b) => priceOf(farm, b) * count(farm, b) - priceOf(farm, a) * count(farm, a))) {
      if (!ITEMS[id]?.sellable) continue;
      const extra = count(farm, id) - keep(id);
      if (extra <= 0) continue;
      for (const stars of [1, 2, 3] as const) {
        const n = Math.min(extra, farm.inv[id]?.[stars - 1] ?? 0);
        if (n > 0) return this.do({ type: 'sell', item: id, stars, n });
      }
    }
    return false;
  }

  // --- people ---
  private helpers(): boolean {
    const farm = this.farm;
    if (farm.helpers.length < helperSlots(farm)) {
      const c = farm.objects.find(o => o.def === 'cottage')!;
      hire(farm, { x: c.x, z: c.z });
      const i = farm.helpers.length - 1;
      const jobs = ['water', 'harvest', 'deliver', 'animals', 'workshop', 'harvest'] as const;
      const job = jobs[i]!;
      const homes = farm.objects.filter(o => isHome(o) && o.def !== 'kennel' && o.def !== 'beehive').map(o => o.id);
      const mill = farm.objects.find(o => o.def === 'mill');
      assign(farm, i, job, { homes, machine: mill?.id ?? null, recipe: 'flour' });
      this.pass(this.opts.actSec * 2);
      return true;
    }
    // keep the animal carers' homes up to date
    for (let i = 0; i < farm.helpers.length; i++) {
      const h = farm.helpers[i]!;
      if (h.job !== 'animals') continue;
      const homes = farm.objects.filter(o => isHome(o) && o.def !== 'kennel' && o.def !== 'beehive').map(o => o.id);
      if (homes.length !== h.homes.length) { assign(farm, i, 'animals', { homes }); return true; }
    }
    return false;
  }

  private neighbours(): boolean {
    const farm = this.farm;
    if (levelOf(farm) < NEIGHBOR_LEVEL) return false;
    for (const n of ['ingrid', 'femi', 'lu']) {
      const t = tradeOffer(farm, n);
      if (t && this.goal('trades') && count(farm, t.want.id) >= t.want.n + (this.needs().get(t.want.id) ?? 0)) { acceptTrade(farm, t); this.pass(this.opts.actSec); return true; }
    }
    if (this.goal('coops') && !farm.coop && levelOf(farm) > NEIGHBOR_LEVEL) { startCoop(farm); this.pass(this.opts.actSec); return true; }
    // add to a co-op order what nothing else needs (or everything, while the chapter asks for a co-op)
    if (farm.coop && count(farm, farm.coop.item) > 0) {
      const story = farm.orders.filter(o => o.story).flatMap(o => o.items).filter(x => x.id === farm.coop!.item).reduce((s, x) => s + x.n, 0);
      const spare = this.goal('coops') ? count(farm, farm.coop.item) - story : count(farm, farm.coop.item) - (this.needs().get(farm.coop.item) ?? 0);
      if (spare > 0) { giveToCoop(farm, spare); this.pass(this.opts.actSec); return true; }
    }
    return false;
  }

  private fair(): boolean {
    const farm = this.farm;
    if (!fairOpen(farm)) return false;
    enterFair(farm, bestEntries(farm));
    this.pass(20);
    return true;
  }

  private lab(): boolean {
    const farm = this.farm;
    if (!labOpen(farm)) return false;
    const pick = LAB.find(l => !cantLearn(farm, l.id));
    return pick ? this.do({ type: 'learn', idea: pick.id }) : false;
  }

  private greenhouses(): boolean {
    const farm = this.farm;
    for (const o of farm.objects) {
      if (!isGreenhouse(o)) continue;
      const i = plotsOf(o).findIndex(p => !p.crop);
      if (i < 0) continue;
      const level = levelOf(farm);
      const ok = (c: CropDef) => c.level <= level && !c.wet && farm.coins >= c.seed + 20;
      // what's needed but out of season outside goes under glass first
      const need = this.needs();
      const wanted = [...need].map(([id]) => CROP[id]).filter((c): c is CropDef => !!c && ok(c) && !c.seasons.includes(seasonOf(farm.t)) && count(farm, c.id) < (need.get(c.id) ?? 0));
      const best = wanted[0] ?? CROPS.filter(ok).sort((a, b) => profitPerMinute(b) - profitPerMinute(a))[0];
      if (best && plantPlot(farm, o, i, best.id).ok) { this.pass(this.opts.actSec); return true; }
    }
    return false;
  }

  /** Chapter 5: a channel along the river bank, with fields beside it (only where it can go). */
  private channelGoal(): boolean {
    const farm = this.farm;
    if (!waterOpen(farm) || !(this.goal('channel-wet') || this.goal('auto-watered'))) return false;
    const occ = occupancy(farm);
    const open = (x: number, z: number) => { const a = AREAS.find(r => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1); return !!a && farm.unlocked.includes(a.id) && !isWater(x, z); };
    let dug = 0;
    for (let z = 36; z <= 53 && dug < 8; z++) {
      if (!isWater(50, z) || !open(49, z)) continue;
      if (channelAt(farm, 49, z)) { dug++; continue; }
      const o = farm.objects.find(ob => ob.x === 49 && ob.z === z);
      if (o?.kind === 'debris') return this.do({ type: 'clear', id: o.id });
      if (!occ.has(tileKey(49, z)) && farm.coins >= 3) return this.do({ type: 'dig', x: 49, z });
    }
    for (let z = 36; z <= 53; z++) {
      if (!channelAt(farm, 49, z) || !open(48, z)) continue;
      const f = farm.objects.find(ob => ob.x === 48 && ob.z === z);
      if (f?.kind === 'debris') return this.do({ type: 'clear', id: f.id });
      if (!f && !occ.has(tileKey(48, z)) && farm.coins >= 20) return this.do({ type: 'plow', x: 48, z });
    }
    return false;
  }

  /** More fields as the farm grows, and a bigger barn when it fills up. */
  private expand(): boolean {
    const farm = this.farm;
    const fields = farm.objects.filter(o => o.kind === 'field').length;
    const target = Math.min(40, 6 + farm.story.chapter * 4 + (this.goal('ploughed') ? 4 : 0));
    if ((fields < target || this.goal('ploughed')) && farm.coins >= 60 + this.reserve) {
      const at = this.spot(1, 1);
      if (at) return this.do({ type: 'plow', x: at.x, z: at.z });
    }
    if (totalItems(farm) > barnCap(farm) * 0.8 && farm.barnLevel < 4) {
      const ok = act(farm, { type: 'upgradeBarn' }).ok;
      if (ok) { this.pass(this.opts.actSec); return true; }
    }
    return false;
  }

  /** Clear clutter: the first chapter asks for it, and building needs the room. */
  private clearSome(force = false): boolean {
    const farm = this.farm;
    if (!force && !this.goal('cleared') && !this.goal('c1-clear')) return false;
    const d = farm.objects.find(o => o.kind === 'debris' && o.def !== 'mushrooms' && (() => { const a = AREAS.find(x => o.x >= x.x0 && o.x <= x.x1 && o.z >= x.z0 && o.z <= x.z1); return !!a && farm.unlocked.includes(a.id); })());
    return d ? this.do({ type: 'clear', id: d.id }) : false;
  }
}

