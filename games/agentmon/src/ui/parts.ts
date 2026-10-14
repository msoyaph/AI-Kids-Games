/**
 * Shared UI pieces (the 1.1 component system), so every screen draws them the same way.
 * Styles: src/style.css, "components".
 */
import { h } from './dom';

/** At or under this share of energy a friend is "Tired" (also when a wild one can be befriended). */
export const TIRED_AT = 0.4;

/**
 * The energy bar: a fill with the number inside it. Under 40% it turns warm and says "Tired"; at 0
 * it says "Napping". The words carry the meaning too, so it never relies on colour alone.
 */
export function energyBar(energy: number, max: number, opts: { small?: boolean } = {}): HTMLElement {
  const share = max > 0 ? Math.max(0, Math.min(1, energy / max)) : 0;
  const state = energy <= 0 ? 'nap' : share <= TIRED_AT ? 'tired' : 'ok';
  const word = state === 'nap' ? 'Napping' : state === 'tired' ? 'Tired' : '';
  return h('div', {
    class: `ebar${opts.small ? ' small' : ''}${state === 'ok' ? '' : ` ${state}`}`,
    role: 'meter', 'aria-label': 'Energy', 'aria-valuemin': 0, 'aria-valuemax': max, 'aria-valuenow': energy,
    'aria-valuetext': `${energy} of ${max}${word ? `, ${word.toLowerCase()}` : ''}`,
  },
    h('span.track', {}, h('span.fill', { style: `width:${(share * 100).toFixed(1)}%` })),
    h('span.num', { 'aria-hidden': 'true' }, `${energy}`, h('small', {}, `/${max}`)),
    word ? h('span.flag', { 'aria-hidden': 'true' }, word) : null,
  );
}
