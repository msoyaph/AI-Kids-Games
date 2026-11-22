/**
 * A simple helper that plays the game by the same taps a player makes. It plays the day behind
 * the capture route (?scene=play) and keeps the difficulty honest in the unit tests.
 * It only looks at what a player can see: waiting friends, stations and the tray.
 */
import type { FoodId } from './data/menu';
import { discard, giveSamples, tap, type State } from './sim';

/** Do one useful thing if Minty is free. Returns true when it acted. */
export function botTurn(s: State): boolean {
  const h = s.host;
  if (s.over || h.queue.length || h.busy > 0 || (h.current && h.act !== 'wait')) return false;
  const waiting = s.guests.filter(g => g.phase === 'waiting').sort((a, b) => a.patience - b.patience);
  // Somebody is about to give up: free cake buys everyone time.
  if (waiting.some(g => g.patience < g.patienceMax * 0.12) && giveSamples(s)) return true;

  // Serve the most impatient friend we are carrying something for.
  for (const g of waiting) if (g.order.some(o => !o.done && h.tray.includes(o.food))) return tap(s, { kind: 'guest', spot: g.spot });

  const need = new Map<FoodId, number>();
  for (const g of waiting) for (const o of g.order) if (!o.done) need.set(o.food, (need.get(o.food) ?? 0) + 1);
  const short = (food: FoodId) => (need.get(food) ?? 0) > h.tray.filter(f => f === food).length;

  if (h.tray.length < s.mods.tray) {
    for (let i = 0; i < s.stations.length; i++) {
      const st = s.stations[i];
      if (st.unlocked && st.phase === 'ready' && short(st.food)) return tap(s, { kind: 'station', index: i });
    }
  }
  for (let i = 0; i < s.stations.length; i++) {
    const st = s.stations[i];
    if (st.unlocked && st.phase === 'idle' && short(st.food)) return tap(s, { kind: 'station', index: i });
  }
  // A full tray of things nobody wants: make room.
  if (h.tray.length >= s.mods.tray) {
    const slot = h.tray.findIndex(food => !need.get(food));
    if (slot >= 0) return discard(s, slot);
  }
  return false;
}
