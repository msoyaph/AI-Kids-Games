/** Inline SVG glyphs for the glass touch controls (code, not asset files). */

const stroke = 'fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"';

export const GLYPHS = {
  /** Jump: a double up-chevron. */
  jump: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 13.5 12 6.5l7 7" ${stroke} stroke-width="3.2"/><path d="M7.5 19 12 14.5l4.5 4.5" ${stroke} stroke-width="2.6" opacity=".75"/></svg>`,
  /** Slide: a low swoosh with an arrowhead. */
  slide: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 7.5c2.6 7.6 8.6 9.6 16.4 9" ${stroke} stroke-width="3.2"/><path d="M15.6 12.6l4.6 3.9-4.2 4" ${stroke} stroke-width="3.2"/></svg>`,
  /** Pause: two rounded bars. */
  pause: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5.5" y="4.5" width="4.6" height="15" rx="1.8" fill="currentColor"/><rect x="13.9" y="4.5" width="4.6" height="15" rx="1.8" fill="currentColor"/></svg>`,
  /** Stick base: four faint direction chevrons near the rim. */
  stickChevrons: `<svg class="gstick-chev" viewBox="0 0 100 100" aria-hidden="true"><g ${stroke} stroke-width="3.4"><path d="M43 16 50 9l7 7"/><path d="M84 43l7 7-7 7"/><path d="M43 84l7 7 7-7"/><path d="M16 43 9 50l7 7"/></g></svg>`,
  /** Fast-slide chevrons, pointing outward along the movement direction. */
  speed: `<svg class="gstick-speed" viewBox="0 0 20 30" aria-hidden="true"><g ${stroke} stroke-width="3.4"><path d="M4 11 10 5l6 6"/><path d="M4 19l6-6 6 6" opacity=".7"/><path d="M4 27l6-6 6 6" opacity=".4"/></g></svg>`,
} as const;
