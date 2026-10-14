// Small inline SVG icons for the HUD (drawn here, so nothing is loaded and they look the same everywhere).
const S = 'stroke="#2b1910" stroke-width="2.5" stroke-linejoin="round"';

export const ICONS = {
  compost: `<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="22" r="11" fill="#5e3a22" ${S}/><path d="M20 21c-7 0-12-4-13-9 6 0 11 3 13 9zM20 21c7 0 12-4 13-9-6 0-11 3-13 9z" fill="#8fe05a" ${S}/></svg>`,
  sandwich: `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M6 28 20 8l14 20z" fill="#ffe2a0" ${S}/><path d="M9 25h22" stroke="#8fe05a" stroke-width="4"/></svg>`,
  apple: `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 13c-8-4-14 2-13 10 1 7 6 12 13 10 7 2 12-3 13-10 1-8-5-14-13-10z" fill="#ff4a4a" ${S}/><path d="M20 13c0-4 2-6 4-7" ${S} fill="none"/></svg>`,
  cupcake: `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M10 20h20l-3 14H13z" fill="#ffb6d0" ${S}/><path d="M9 20c0-8 22-8 22 0z" fill="#fff6ef" ${S}/><circle cx="20" cy="9" r="3" fill="#ff4a4a" ${S}/></svg>`,
  trowel: `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M22 18 32 6c2 3 2 7-1 10L19 26z" fill="#b9c4d4" ${S}/><path d="M19 26 9 36" stroke="#8a5432" stroke-width="6" stroke-linecap="round"/><path d="M19 26 9 36" stroke="#2b1910" stroke-width="2" stroke-linecap="round" opacity="0.4"/></svg>`,
};
