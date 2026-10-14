/** The game's identity on the site (the owner picked "Breezeport" on 2026-10-14). */
export const GAME = {
  slug: 'breezeport',
  title: 'Breezeport',
  /** Every localStorage key this game writes starts with this prefix. It must be unique on the site. */
  storagePrefix: 'breezeport.',
  /** The read-only test hook on window (tests and the site's preview capture read it). */
  hook: '__breezeport',
} as const;
