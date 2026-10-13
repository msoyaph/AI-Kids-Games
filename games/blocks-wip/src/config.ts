/** Everything `npm run new-game -- <slug>` personalises when it copies this template. */
export const GAME = {
  slug: 'blocks-wip',
  title: 'Blocks (working title)',
  /** Every localStorage key this game writes starts with this prefix. It must be unique on the site. */
  storagePrefix: 'blockswip.',
  /** The read-only test hook on window (tests and the site's preview capture read it). */
  hook: '__blockswip',
} as const;
