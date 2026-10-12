/** Crafting, cooking, learning recipes from skills, perk choices and special item uses. */
import { hash32 } from '../core/rng';
import { tryItem } from '../data/items';
import { addStock } from '../data/shops';
import { COOK_LEARN, CRAFT, CRAFTS, DISHES, GROUPS, RADIO_RECIPES, type Ingredient } from '../data/recipes';
import { SKILL_DEFS } from '../data/skills';
import { addItem, canFit } from './inventory';
import { placeHooks } from './actions';
import { gainXp, level } from './skills';
import { simInitHooks, type Sim } from './sim';
import { SKILLS, type SkillId } from './state';
import { registerSystem } from './systems';
import { SERVICES } from './shops';
import type { Slots } from './inventory';
import { TREE_BALANCE } from '../tuning';

export function matches(key: string, id: string): boolean {
  if (key === id) return true;
  if (key.startsWith('cat:')) return tryItem(id)?.cat === key.slice(4);
  if (key.startsWith('any:')) return GROUPS[key.slice(4)]?.includes(id) ?? false;
  return false;
}

export function haveCount(inv: Slots, key: string): number {
  let n = 0;
  for (const s of inv) if (s && matches(key, s.id)) n += s.n;
  return n;
}

export function hasIngredients(inv: Slots, ing: Ingredient[]): boolean {
  // greedy check that respects items shared between keys
  const pool = inv.map((s) => (s ? { id: s.id, n: s.n } : null));
  for (const [key, n] of ing) {
    let need = n;
    for (const s of pool) {
      if (!s || need <= 0 || !matches(key, s.id)) continue;
      const t = Math.min(s.n, need);
      s.n -= t;
      need -= t;
    }
    if (need > 0) return false;
  }
  return true;
}

export function consume(inv: Slots, ing: Ingredient[]): void {
  for (const [key, n] of ing) {
    let need = n;
    // use lowest quality first
    const order = inv.map((s, i) => ({ s, i })).filter((x) => x.s && matches(key, x.s.id)).sort((a, b) => a.s!.q - b.s!.q);
    for (const { s, i } of order) {
      if (need <= 0) break;
      const t = Math.min(s!.n, need);
      s!.n -= t;
      need -= t;
      if (s!.n <= 0) inv[i] = null;
    }
  }
}

export function ingredientName(key: string): string {
  if (key.startsWith('cat:')) return `any ${key.slice(4)}`;
  if (key.startsWith('any:')) return `any ${key.slice(4)}`;
  return tryItem(key)?.name ?? key;
}

// ── Learning ────────────────────────────────────────────────
function learnReq(req: string, sim: Sim): boolean {
  if (req === 'start') return true;
  const [skill, lv] = req.split(':');
  if (!lv) return false;
  return SKILLS.includes(skill as SkillId) && level(sim, skill as SkillId) >= Number(lv);
}

/** Learn every craft / recipe whose requirement is now met. Returns newly learned names. */
export function refreshLearned(sim: Sim): string[] {
  const p = sim.p;
  const got: string[] = [];
  for (const c of CRAFTS) {
    if (!p.crafts.includes(c.id) && learnReq(c.learn, sim)) {
      p.crafts.push(c.id);
      got.push(tryItem(c.out ?? c.id)?.name ?? c.id);
    }
  }
  for (const [id, req] of Object.entries(COOK_LEARN)) {
    if (!p.recipes.includes(id) && learnReq(req, sim)) {
      p.recipes.push(id);
      got.push(tryItem(id)?.name ?? id);
    }
  }
  return got;
}

// ── Crafting ────────────────────────────────────────────────
export function craft(sim: Sim, id: string): { ok: boolean; msg?: string } {
  const c = CRAFT[id];
  if (!c || !sim.p.crafts.includes(id)) return { ok: false, msg: "You don't know how to make that yet." };
  if (!hasIngredients(sim.p.inv, c.ing)) return { ok: false, msg: "You don't have everything you need." };
  const out = c.out ?? c.id;
  const n = c.n ?? 1;
  if (!canFit(sim.p.inv, out, n)) return { ok: false, msg: 'Your bag is full!' };
  consume(sim.p.inv, c.ing);
  addItem(sim.p.inv, out, n, 0);
  sim.state.col.crafted[out] = (sim.state.col.crafted[out] ?? 0) + n;
  sim.state.stats.crafted++;
  return { ok: true };
}

// ── Cooking ─────────────────────────────────────────────────
export const DISH: Record<string, (typeof DISHES)[number]> = {};
for (const d of DISHES) DISH[d.id] = d;

export function cook(sim: Sim, id: string): { ok: boolean; msg?: string } {
  const d = DISH[id];
  if (!d || !sim.p.recipes.includes(id)) return { ok: false, msg: "You haven't learned that recipe yet." };
  if (!hasIngredients(sim.p.inv, d.ing)) return { ok: false, msg: "You're missing some ingredients." };
  if (!canFit(sim.p.inv, id, 1)) return { ok: false, msg: 'Your bag is full!' };
  consume(sim.p.inv, d.ing);
  addItem(sim.p.inv, id, 1, 0);
  sim.state.col.cooked[id] = (sim.state.col.cooked[id] ?? 0) + 1;
  sim.state.stats.cooked++;
  gainXp(sim, 'cooking', 12 + Math.round(d.energy / 15));
  return { ok: true };
}

/** "Cooking with Sunny" on the radio: a new recipe each Restday. */
export function radioShow(sim: Sim): { recipe: string | null; text: string } {
  const st = sim.state;
  if (st.day % 5 !== 4) {
    const w = st.tomorrow;
    const fc = w === 'rain' ? 'Rain is coming tomorrow — your crops will get a free drink!' : w === 'storm' ? 'Stormy skies tomorrow. Stay cozy!' : w === 'snow' ? 'Snow tomorrow! Bundle up.' : w === 'wind' ? 'A windy day tomorrow — leaves will dance!' : 'Sunny skies tomorrow!';
    return { recipe: null, text: `📻 Valley Radio: ${fc} (Tune in on Restday for "Cooking with Sunny"!)` };
  }
  const week = Math.floor(st.day / 5);
  const id = RADIO_RECIPES[week % RADIO_RECIPES.length];
  if (sim.p.recipes.includes(id)) return { recipe: null, text: `📻 "Cooking with Sunny" is showing a rerun of ${tryItem(id)?.name}. You already know this one!` };
  sim.p.recipes.push(id);
  return { recipe: id, text: `📻 "Hello, hungry friends! Today on Cooking with Sunny: ${tryItem(id)?.name}!" You learned a new recipe!` };
}

// ── Perks ───────────────────────────────────────────────────
export function pendingPerk(sim: Sim): { skill: SkillId; tier: 0 | 1 } | null {
  for (const sd of SKILL_DEFS) {
    const lv = level(sim, sd.id);
    for (const tier of [0, 1] as const) {
      if (lv < (tier === 0 ? 5 : 10)) continue;
      const [a, b] = sd.perks[tier];
      if (!sim.p.perks.includes(a.id) && !sim.p.perks.includes(b.id)) return { skill: sd.id, tier };
    }
  }
  return null;
}

export function choosePerk(sim: Sim, id: string): boolean {
  const pend = pendingPerk(sim);
  if (!pend) return false;
  const opts = SKILL_DEFS.find((s) => s.id === pend.skill)!.perks[pend.tier];
  if (!opts.some((p) => p.id === id)) return false;
  sim.p.perks.push(id);
  return true;
}

// ── Tapper placement ────────────────────────────────────────
placeHooks.push((sim, id, x, y) => {
  if (id !== 'tapper') return null;
  const loc = sim.here;
  const o = loc.obj(x, y);
  if (!o || o.k !== 'tree' || (o.g ?? 0) < 4 || (o.hp !== undefined && o.hp <= 0)) return { ok: false, msg: 'Tappers go on fully grown oak, maple or pine trees.' };
  if (o.tap) return { ok: false, msg: 'This tree already has a tapper.' };
  o.tap = { id: 'tapper', t: TREE_BALANCE.tapperDays[o.id] ?? 3, out: null };
  loc.touch(x, y);
  return { ok: true };
});

simInitHooks.push((sim) => {
  refreshLearned(sim);
  sim.ev.on('levelUp', () => {
    const got = refreshLearned(sim);
    if (got.length) sim.ev.emit('toast', { text: `You learned: ${got.slice(0, 3).join(', ')}${got.length > 3 ? '…' : ''}`, icon: 'ui.book' });
  });
});

registerSystem({
  id: 'crafting',
  startDay(sim) {
    refreshLearned(sim);
  },
});

// ── The café sells snacks and (rotating) recipe cards ────────
addStock('cafe', (st) => {
  const out: { id: string; price: number; label?: string; desc?: string; service?: string; limit?: number }[] = [
    { id: 'hotCocoa', price: 150, limit: 5 },
    { id: 'pancakes', price: 140, limit: 5 },
    { id: 'cookies', price: 180, limit: 5 },
    { id: 'veggieSoup', price: 200, limit: 3 },
  ];
  const unknown = DISHES.filter((d) => !st.player.recipes.includes(d.id));
  // three recipe cards a day, rotating
  const picks = new Set<string>();
  for (let k = 0; k < unknown.length && picks.size < 3; k++) picks.add(unknown[(hash32(st.day, k) >>> 0) % unknown.length].id);
  for (const id of picks) {
    const d = DISH[id];
    out.push({ id: `recipe.${id}`, price: Math.max(200, d.price * 2), label: `Recipe: ${d.name}`, desc: `Sunny's recipe card. Learn to cook ${d.name}!`, service: `recipe:${id}` });
  }
  return out;
});
for (const d of DISHES) {
  SERVICES[`recipe:${d.id}`] = (sim) => {
    if (sim.p.recipes.includes(d.id)) return { ok: false, msg: 'You already know that recipe!' };
    sim.p.recipes.push(d.id);
    return { ok: true, msg: `You learned how to make ${d.name}!` };
  };
}
