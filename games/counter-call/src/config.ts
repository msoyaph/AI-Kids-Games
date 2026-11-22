/** The game's identity. Everything that names the game or its storage reads from here. */
export const GAME = {
  slug: 'counter-call',
  title: 'Counter Call',
  /** Every localStorage key this game writes starts with this prefix. It must be unique on the site. */
  storagePrefix: 'countercall.',
  /** The read-only test hook on window (tests and the site's preview capture read it). */
  hook: '__countercall',
} as const;
