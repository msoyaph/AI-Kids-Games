/** Everything `npm run new-game -- <slug>` personalises when it copies this template. */
export const GAME = {
  slug: 'test-garden',
  title: 'Test Garden',
  /** Every localStorage key this game writes starts with this prefix. It must be unique on the site. */
  storagePrefix: 'testgarden.',
  /** The read-only test hook on window (tests and the site's preview capture read it). */
  hook: '__testgarden',
} as const;
