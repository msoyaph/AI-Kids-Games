/** Everything `npm run new-game -- <slug>` personalises when it copies this template. */
export const GAME = {
  slug: 'bad-game',
  title: 'Block Builder',
  /** Every localStorage key this game writes starts with this prefix. It must be unique on the site. */
  storagePrefix: 'badgame.',
  /** The read-only test hook on window (tests and the site's preview capture read it). */
  hook: '__badgame',
} as const;
