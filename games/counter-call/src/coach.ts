/** The first days' helper text: one short sentence about the most useful next tap. Pure. */
import { CHAR_BY_ID } from './data/characters';
import { FOOD_BY_ID } from './data/menu';
import type { State } from './sim';

export function coach(s: State): string {
  if (s.over) return '';
  const waiting = s.guests.filter(g => g.phase === 'waiting').sort((a, b) => a.patience - b.patience);
  if (!waiting.length) {
    if (s.guests.some(g => g.phase === 'arriving')) return 'A friend is coming to the counter!';
    return s.toSpawn > 0 ? 'Friends are on their way. Ring the bell to call one in!' : '';
  }
  const restless = waiting[0];
  if (s.samples > 0 && restless.patience < restless.patienceMax * 0.25) return `${CHAR_BY_ID[restless.char]?.name ?? 'A friend'} is getting restless. Tap the cake stand to share free cake!`;
  const tray = s.host.tray;
  for (const g of waiting) {
    const item = g.order.find(o => !o.done && tray.includes(o.food));
    if (item) return `Tap ${CHAR_BY_ID[g.char]?.name ?? 'your friend'} to serve the ${FOOD_BY_ID[item.food].label.toLowerCase()}!`;
  }
  const g = waiting[0];
  const item = g.order.find(o => !o.done);
  if (!item) return '';
  const food = FOOD_BY_ID[item.food];
  const station = s.stations.find(st => st.food === item.food);
  const name = CHAR_BY_ID[g.char]?.name ?? 'Your friend';
  if (station?.phase === 'ready') return `Ding! Tap the ${food.station} to pick up the ${food.label.toLowerCase()}.`;
  if (station?.phase === 'cooking') return `The ${food.label.toLowerCase()} is cooking. Tap the ${food.station} when it dings!`;
  return `${name} wants ${food.name}. Tap the ${food.station} to make it!`;
}
