/**
 * A citizen's thought bubble: a little cloud over their head saying what their home wishes for most
 * (or how much they like the town), with "Show me" to glide to their home. It floats away by itself.
 */
import type { HomeNeeds } from '../sim/census';
import type { Town } from '../sim/state';
import { chapterOf } from '../sim/unlocks';
import { THING } from '../data/things';
import { h } from './h';

const HAPPY = ['I love living here!', 'What a lovely town.', 'Best street in Breezeport!', 'I waved at the bus driver today.', 'The sea breeze is the best.'];

/** The wish that would help this home most. */
export function wishFor(n: HomeNeeds | undefined, town: Town): string {
  if (!n) return HAPPY[Math.floor(town.t) % HAPPY.length]!.replace('Breezeport', town.name);
  if (n.work < 0.6) return 'I wish there were jobs I could get to.';
  if (n.calm < 0.6) return 'Our street is so busy! A bus would help.';
  if (n.fun < 0.5) return 'I’d love a shop or a playground nearby.';
  if (n.nature < 0.4) return 'I wish there were more trees near my home.';
  const ch = chapterOf(town);
  for (const [s, on] of Object.entries(n.services)) if (!on && ch >= (THING[s]?.chapter ?? 0)) return `Our street needs a ${THING[s]!.name.toLowerCase()} nearby.`;
  return n.happy >= 80 ? HAPPY[(n.happy + Math.floor(town.t)) % HAPPY.length]!.replace('Breezeport', town.name) : 'Things are pretty good here!';
}

let open: HTMLElement | null = null;

export function thought(root: HTMLElement, x: number, y: number, text: string, showMe: (() => void) | null) {
  open?.remove();
  const el = h('div.thought', { role: 'status', style: `left:${x}px;top:${y}px` },
    h('p', null, text),
    showMe ? h('button.chip', { onclick: () => { showMe(); el.remove(); } }, 'Show me their home') : null);
  root.appendChild(el);
  open = el;
  setTimeout(() => { if (open === el) { el.classList.add('leaving'); setTimeout(() => el.remove(), 300); } }, 4200);
}
