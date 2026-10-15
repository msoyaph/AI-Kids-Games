/**
 * Contracts with Larkford's businesses. A contract is 3 to 5 drops of the same basket. The next drop
 * is wanted about once a day of play, but nothing ever expires: a wanted drop waits for as long as it
 * takes. A drop goes down to the dock and the Little Lark takes it to town (or a helper on Deliveries
 * sends it). Each drop pays more than the order board (×1.7), and finishing the whole contract pays a
 * bonus and two Lab ideas. Then the business signs a new contract with a fresh basket.
 */
import { BUSINESS, BUSINESSES, type BusinessId } from '../data/businesses';
import { ITEMS } from '../data/items';
import { DAY_SEC } from './clock';
import { count, take } from './inventory';
import { obtainable, queueCrate } from './orders';
import type { Farm } from './state';
import { bump, earn, levelOf, roll } from './world';

export interface Contract {
  business: BusinessId;
  basket: { id: string; n: number }[];
  drops: number;
  /** Drops delivered (paid when the boat gets there). */
  done: number;
  /** Drops sent and on their way. */
  sent: number;
  /** When the next drop is wanted (farm time). */
  wantedAt: number;
  coinsPerDrop: number;
  bonus: number;
  /** How many contracts this business has finished before this one. */
  round: number;
}

export const CONTRACT_PAY = 1.7;
const WANT_EVERY = DAY_SEC;

export const contractsOpen = (farm: Farm) => BUSINESSES.filter(b => farm.story.chapter >= b.chapter);

function newContract(farm: Farm, business: BusinessId, round: number): Contract {
  const b = BUSINESS[business];
  const can = obtainable(farm);
  const level = levelOf(farm);
  // the business's wants the farm can make now, later ones as the farm grows
  let wants = b.wants.filter(id => can.has(id));
  if (!wants.length) wants = [b.wants[0]!];
  const pick = () => wants[Math.min(wants.length - 1, Math.floor(roll(farm) * wants.length))]!;
  const a = pick();
  let c = pick();
  for (let i = 0; i < 4 && c === a && wants.length > 1; i++) c = pick();
  const size = (id: string) => Math.max(1, Math.round((3 + level * 0.25 + round) * (ITEMS[id]!.kind === 'good' ? 0.5 : 1)));
  const basket = [...new Set([a, c])].map(id => ({ id, n: size(id) }));
  const value = basket.reduce((s, x) => s + ITEMS[x.id]!.price * x.n, 0);
  const drops = 3 + Math.min(2, Math.floor(roll(farm) * 3));
  const coinsPerDrop = Math.round(value * CONTRACT_PAY);
  return { business, basket, drops, done: 0, sent: 0, wantedAt: farm.t, coinsPerDrop, bonus: Math.round(coinsPerDrop * drops * 0.25), round };
}

/** Make sure every open business has a contract. */
export function contractsTick(farm: Farm): void {
  for (const b of contractsOpen(farm)) {
    if (!farm.contracts.some(c => c.business === b.id)) farm.contracts.push(newContract(farm, b.id, farm.stats[`contracts:${b.id}`] ?? 0));
  }
}

export const contractFor = (farm: Farm, business: BusinessId) => farm.contracts.find(c => c.business === business);

/** Is the next drop wanted now (and not all drops already sent)? */
export const dropWanted = (farm: Farm, c: Contract) => c.done + c.sent < c.drops && farm.t >= c.wantedAt;
export const canSendDrop = (farm: Farm, c: Contract) => dropWanted(farm, c) && c.basket.every(x => count(farm, x.id) >= x.n);

/** Send the next drop down to the dock. */
export function sendDrop(farm: Farm, business: BusinessId): { ok: true } | { ok: false; why: string } {
  const c = contractFor(farm, business);
  if (!c) return { ok: false, why: 'No contract there yet.' };
  if (c.done + c.sent >= c.drops) return { ok: false, why: 'Every basket is on its way.' };
  if (farm.t < c.wantedAt) return { ok: false, why: 'The next basket isn’t wanted yet. There’s no rush.' };
  if (!c.basket.every(x => count(farm, x.id) >= x.n)) return { ok: false, why: 'You don’t have everything yet.' };
  for (const x of c.basket) take(farm, x.id, x.n);
  c.sent++;
  c.wantedAt = farm.t + WANT_EVERY;
  const b = BUSINESS[business];
  queueCrate(farm, { id: (farm.orderSeq = (farm.orderSeq ?? 0) + 1), who: b.owner, items: c.basket.map(x => ({ ...x })), coins: c.coinsPerDrop, xp: Math.round(c.coinsPerDrop / 4), contract: business });
  return { ok: true };
}

export type ContractEvent = { type: 'contract-done'; business: BusinessId; bonus: number };

/** The boat delivered a drop: pay it, and finish the contract on its last drop. */
export function dropDelivered(farm: Farm, business: BusinessId): ContractEvent | null {
  const c = contractFor(farm, business);
  bump(farm, `contract:${business}`);
  if (!c) return null;
  c.sent = Math.max(0, c.sent - 1);
  c.done++;
  if (c.done < c.drops) return null;
  earn(farm, c.bonus);
  farm.ideas += 2;
  bump(farm, 'contracts-done');
  bump(farm, `contracts:${business}`);
  farm.contracts = farm.contracts.filter(x => x !== c);
  return { type: 'contract-done', business, bonus: c.bonus };
}
