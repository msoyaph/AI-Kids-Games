# Working on Star Sprint (a community game)

Read SUBMITTING.md at the repository root first; it is written for you too. In short:

- Change files only inside `community/star-sprint/`. A pull request that touches anything else fails.
- Source only: TypeScript, HTML, CSS, JSON, Markdown and small SVGs. No binaries, no minified or
  built files, no config files, no lockfiles.
- No network of any kind: no fetch, XHR, WebSockets, outside URLs, remote fonts or scripts, no eval
  or new Function. Allowed packages only (see tooling/community-kit/allowlist.json), at exact versions.
- Storage only under `starsprint.`, through `src/storage.ts`. Never call localStorage.clear().
- Kid-safe: no ads, purchases, accounts, chat, personal data, or other companies' names and characters;
  at most 3 flashes a second; 48 px touch targets; keyboard play.
- Keep the test hook `window.__starsprint` and the capture routes listed in game.json working.
- Run `npm run check-submission -- star-sprint` from the repository root and fix every ✗ before you finish.
- Every commit needs a sign-off line (`git commit -s`), see SUBMITTING.md.
