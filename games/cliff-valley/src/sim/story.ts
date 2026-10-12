/**
 * Restoration story: donating to Valley Hall boards, overnight repairs, the Heartstone lamp,
 * and when the grand reopening (finale) happens. Never soft-locks: bundles accept many
 * options, seasons repeat in year two, and the finale simply waits until you're ready.
 */
import { BOARDS, BOARD, FINALE_DAY, type BundleOption } from '../data/boards';
import { tryItem } from '../data/items';
import { remove, count } from './inventory';
import type { Sim } from './sim';
import { registerSystem } from './systems';
import type { ItemStack } from './types';

export function optionMatches(o: BundleOption, s: ItemStack): boolean {
  if ((s.q ?? 0) < (o.q ?? 0)) return false;
  if (o.items && o.items.includes(s.id)) return true;
  if (o.cat && tryItem(s.id)?.cat === o.cat) return true;
  if (o.prefix && o.prefix.some((p) => s.id.startsWith(p))) return true;
  return false;
}

export function bundleSlots(sim: Sim, board: string, bundle: string): (string | null)[] {
  const b = BOARD[board].bundles.find((x) => x.id === bundle)!;
  const st = sim.state.story;
  st.boards[board] ??= {};
  let slots = st.boards[board][bundle];
  if (!slots || slots.length !== b.options.length) {
    slots = new Array(b.options.length).fill(null);
    st.boards[board][bundle] = slots;
  }
  return slots;
}

export function bundleDone(sim: Sim, board: string, bundle: string): boolean {
  return sim.state.story.bundles.includes(`${board}.${bundle}`);
}

export function boardDone(sim: Sim, board: string): boolean {
  return BOARD[board].bundles.every((b) => bundleDone(sim, board, b.id));
}

export function boardsDone(sim: Sim): number {
  return BOARDS.filter((b) => boardDone(sim, b.id)).length;
}

/** Options in this bundle the player could donate right now: [option index, bag slot]. */
export function donatable(sim: Sim, board: string, bundle: string): [number, number][] {
  if (bundleDone(sim, board, bundle)) return [];
  const b = BOARD[board].bundles.find((x) => x.id === bundle)!;
  const slots = bundleSlots(sim, board, bundle);
  const out: [number, number][] = [];
  b.options.forEach((o, oi) => {
    if (slots[oi]) return;
    for (let i = 0; i < sim.p.inv.length; i++) {
      const s = sim.p.inv[i];
      if (!s || !optionMatches(o, s)) continue;
      // enough of this exact id at this quality?
      const have = sim.p.inv.reduce((t, x) => t + (x && x.id === s.id && (x.q ?? 0) >= (o.q ?? 0) ? x.n : 0), 0);
      if (have >= o.n) {
        out.push([oi, i]);
        break;
      }
    }
  });
  return out;
}

export interface DonateResult {
  ok: boolean;
  msg?: string;
  bundleDone?: boolean;
  boardDone?: boolean;
  reward?: string;
}

export function donate(sim: Sim, board: string, bundle: string, optionIdx: number, slot: number): DonateResult {
  const bd = BOARD[board];
  const b = bd?.bundles.find((x) => x.id === bundle);
  if (!b || bundleDone(sim, board, bundle)) return { ok: false };
  const slots = bundleSlots(sim, board, bundle);
  const o = b.options[optionIdx];
  const s = sim.p.inv[slot];
  if (!o || slots[optionIdx] || !s || !optionMatches(o, s)) return { ok: false, msg: "That doesn't fit here." };
  if (count(sim.p.inv, s.id, o.q ?? 0) < o.n) return { ok: false, msg: `You need ${o.n} of those.` };
  remove(sim.p.inv, s.id, o.n, o.q ?? 0);
  slots[optionIdx] = s.id;
  const filled = slots.filter(Boolean).length;
  const res: DonateResult = { ok: true };
  if (filled >= b.need) {
    sim.state.story.bundles.push(`${board}.${bundle}`);
    res.bundleDone = true;
    res.reward = giveReward(sim, b.reward);
    if (boardDone(sim, board) && !sim.state.story.pending.includes(board) && !sim.state.story.done.includes(board)) {
      sim.state.story.pending.push(board);
      res.boardDone = true;
    }
  }
  return res;
}

function giveReward(sim: Sim, r: { item?: string; n?: number; coins?: number; craft?: string; recipe?: string }): string {
  const parts: string[] = [];
  if (r.item) {
    sim.give(r.item, r.n ?? 1);
    parts.push(`${r.n ?? 1} ${tryItem(r.item)?.name ?? r.item}`);
  }
  if (r.coins) {
    sim.p.coins += r.coins;
    parts.push(`${r.coins} coins`);
  }
  if (r.craft && !sim.p.crafts.includes(r.craft)) {
    sim.p.crafts.push(r.craft);
    parts.push(`how to craft a ${tryItem(r.craft)?.name ?? r.craft}`);
  }
  if (r.recipe && !sim.p.recipes.includes(r.recipe)) {
    sim.p.recipes.push(r.recipe);
    parts.push(`the ${tryItem(r.recipe)?.name ?? r.recipe} recipe`);
  }
  return parts.join(' and ');
}

/** Put the Heartstone into the Valley Hall's crystal lamp. */
export function placeHeartstone(sim: Sim): boolean {
  if (sim.state.story.heartstone !== 1 || count(sim.p.inv, 'heartstone') < 1) return false;
  remove(sim.p.inv, 'heartstone', 1);
  sim.state.story.heartstone = 2;
  sim.state.flags.lampLit = 1;
  return true;
}

export function finaleReady(sim: Sim): boolean {
  return boardsDone(sim) === BOARDS.length && sim.state.story.heartstone === 2;
}

/** Is today the grand reopening? */
export function finaleToday(sim: Sim): boolean {
  return !!sim.state.flags.finaleToday && sim.state.story.finale === 0;
}

/** Listeners for repairs (client re-renders maps, plays a little scene). */
export const repairHooks: ((sim: Sim, board: string) => void)[] = [];

registerSystem({
  id: 'story',
  startDay(sim) {
    const st = sim.state.story;
    for (const board of st.pending.splice(0)) {
      if (st.done.includes(board)) continue;
      st.done.push(board);
      sim.state.flags[`board.${board}`] = 1;
      const bd = BOARD[board];
      sim.morningNotes.push(`✨ ${bd.repairText}`);
      for (const id of ['mountain', 'beach', 'town', 'hall', 'farm']) sim.refreshLoc(id);
      for (const h of repairHooks) h(sim, board);
    }
    const f = sim.state.flags;
    if (st.finale === 0) {
      if (finaleReady(sim)) {
        if (sim.state.day >= FINALE_DAY) {
          f.finaleToday = 1;
          sim.morningNotes.push('🎉 Tonight is the grand reopening of the Valley Hall! Everyone will gather there at 6 pm.');
        } else if (!f.finaleWaitNote) {
          f.finaleWaitNote = 1;
          sim.morningNotes.push('The Valley Hall is ready! Mayor Bram says the grand reopening will be on Winter 10, at the end of the year.');
        }
      } else if (sim.state.day === FINALE_DAY && !f.finaleLateNote) {
        f.finaleLateNote = 1;
        sim.morningNotes.push('The year is ending, but the Valley Hall isn\'t quite ready. No rush! The reopening will happen as soon as it is.');
      }
    }
  },
});
