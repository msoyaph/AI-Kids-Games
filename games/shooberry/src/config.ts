/** Everything `npm run new-game -- <slug>` personalises when it copies this template. */
export const GAME = {
  slug: 'shooberry',
  title: 'Shooberry',
  /** Every localStorage key this game writes starts with this prefix. It must be unique on the site. */
  storagePrefix: 'shooberry.',
  /** The read-only test hook on window (tests and the site's preview capture read it). */
  hook: '__shooberry',
} as const;
