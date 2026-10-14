/**
 * Every player command as data, and one place that carries them out. The UI, the helpers, the
 * playthrough bot and the tests all go through `act`, so they share exactly the same rules. Each
 * action returns `{ ok: true, … }` or `{ ok: false, why }` (a kind sentence for the player).
 */
import { animalsIn, brushAll, buyAnimal, collect, feedAll, isHome } from './animals';
import { buyAndPlace, type Buyable } from './build';
import { openLand, paintPath, placeDecor } from './decorate';
import { clearDebris, fieldAt, fertilize, harvest, plant, plow, water } from './fields';
import type { Stars } from './inventory';
import { tileAt, type AreaId } from './map';
import { sell } from './market';
import { acceptTrade, giveToCoop, startCoop, tradeOffer } from './neighbors';
import type { OtherObj } from './objects';
import { deliver, skipOrder } from './orders';
import { collectGoods, isMachine, startJob, upgradeMachine } from './production';
import type { Farm } from './state';
import { compostTree, isTree, pickTree } from './trees';
import { objById, spend } from './world';
import { TUNING } from '../data/tuning';

export type Action =
  | { type: 'plow'; x: number; z: number }
  | { type: 'plant'; x: number; z: number; crop: string; variety?: string }
  | { type: 'water'; x: number; z: number }
  | { type: 'fertilize'; x: number; z: number }
  | { type: 'harvest'; x: number; z: number }
  | { type: 'clear'; id: number }
  | { type: 'pickTree'; id: number }
  | { type: 'compostTree'; id: number }
  | { type: 'sell'; item: string; stars: Stars; n: number }
  | { type: 'buy'; what: Buyable; x: number; z: number; rot?: 0 | 1 | 2 | 3 }
  | { type: 'decor'; def: string; x: number; z: number; rot?: 0 | 1 | 2 | 3 }
  | { type: 'path'; x: number; z: number; path: number }
  | { type: 'buyAnimal'; home: number }
  | { type: 'feed'; home: number }
  | { type: 'brush'; home: number }
  | { type: 'collect'; home: number }
  | { type: 'make'; machine: number; recipe: string }
  | { type: 'collectGoods'; machine: number }
  | { type: 'upgradeMachine'; machine: number }
  | { type: 'upgradeBarn' }
  | { type: 'openLand'; area: AreaId }
  | { type: 'deliver'; order: number }
  | { type: 'skipOrder'; order: number }
  | { type: 'trade'; neighbor: string }
  | { type: 'startCoop' }
  | { type: 'giveCoop'; n: number };

export type ActResult = { ok: true; [k: string]: unknown } | { ok: false; why: string };

const isWater = (x: number, z: number) => x >= 0 && z >= 0 && x < 56 && z < 56 && tileAt(x, z).water;

function home(farm: Farm, id: number): OtherObj | null {
  const o = objById(farm, id);
  return o && isHome(o) ? (o as OtherObj) : null;
}

function machine(farm: Farm, id: number): OtherObj | null {
  const o = objById(farm, id);
  return o && isMachine(o) ? (o as OtherObj) : null;
}

const no = (why: string): ActResult => ({ ok: false, why });

/** Carry out one action. Never throws. */
export function act(farm: Farm, a: Action): ActResult {
  switch (a.type) {
    case 'plow': return plow(farm, a.x, a.z);
    case 'plant': { const f = fieldAt(farm, a.x, a.z); return f ? plant(farm, f, a.crop, isWater, a.variety ?? null) : no('Seeds go in fields.'); }
    case 'water': { const f = fieldAt(farm, a.x, a.z); return f ? water(farm, f) : no('Water growing crops.'); }
    case 'fertilize': { const f = fieldAt(farm, a.x, a.z); return f ? fertilize(farm, f) : no('Compost goes on growing crops.'); }
    case 'harvest': { const f = fieldAt(farm, a.x, a.z); return f ? harvest(farm, f) : no('Nothing to pick there.'); }
    case 'clear': return clearDebris(farm, a.id);
    case 'pickTree': { const o = objById(farm, a.id); return o && isTree(o) ? pickTree(farm, o) : no('That is not a fruit tree.'); }
    case 'compostTree': { const o = objById(farm, a.id); return o && isTree(o) ? compostTree(farm, o) : no('That is not a fruit tree.'); }
    case 'sell': return sell(farm, a.item, a.stars, a.n);
    case 'buy': return buyAndPlace(farm, a.what, { x: a.x, z: a.z, rot: a.rot ?? 0 });
    case 'decor': return placeDecor(farm, a.def, { x: a.x, z: a.z, rot: a.rot ?? 0 });
    case 'path': return paintPath(farm, a.x, a.z, a.path);
    case 'buyAnimal': { const h = home(farm, a.home); return h ? buyAnimal(farm, h) : no('That is not an animal home.'); }
    case 'feed': { const h = home(farm, a.home); return h ? feedAll(farm, h) : no('That is not an animal home.'); }
    case 'brush': { const h = home(farm, a.home); return h ? brushAll(farm, h) : no('That is not an animal home.'); }
    case 'collect': { const h = home(farm, a.home); return h && animalsIn(h).length ? collect(farm, h) : no('Nothing to collect there.'); }
    case 'make': { const m = machine(farm, a.machine); return m ? startJob(farm, m, a.recipe) : no('That is not a workshop.'); }
    case 'collectGoods': { const m = machine(farm, a.machine); return m ? collectGoods(farm, m) : no('That is not a workshop.'); }
    case 'upgradeMachine': { const m = machine(farm, a.machine); return m ? upgradeMachine(farm, m) : no('That is not a workshop.'); }
    case 'upgradeBarn': {
      const cost = TUNING.barnUpgrade[farm.barnLevel + 1];
      if (cost === undefined) return no('The barn is as big as it gets.');
      if (!spend(farm, cost)) return no(`A bigger barn costs ${cost} coins.`);
      farm.barnLevel++;
      return { ok: true };
    }
    case 'openLand': return openLand(farm, a.area);
    case 'deliver': return deliver(farm, a.order);
    case 'skipOrder': return skipOrder(farm, a.order) ? { ok: true } : no('Story requests stay on the board.');
    case 'trade': { const t = tradeOffer(farm, a.neighbor); return t ? acceptTrade(farm, t) : no('No swap today.'); }
    case 'startCoop': return startCoop(farm) ? { ok: true } : no('No co-op order right now.');
    case 'giveCoop': return { ok: true, gave: giveToCoop(farm, a.n) };
  }
}
