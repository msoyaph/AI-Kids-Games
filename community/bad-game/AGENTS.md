# Working on Block Builder (a community game)

Read SUBMITTING.md at the repository root first; it is written for you too. In short:

- Change files only inside `community/bad-game/`. A pull request that touches anything else fails.
- Source only: TypeScript, HTML, CSS, JSON, Markdown and small SVGs. No binaries, no minified or
  built files, no config files, no lockfiles.
- No network of any kind: no fetch, XHR, WebSockets, outside URLs, remote fonts or scripts, no eval
  or new Function. Allowed packages only (see tooling/community-kit/allowlist.json), at exact versions.
- Storage only under `badgame.`, through `src/storage.ts`. Never call localStorage.clear().
- Kid-safe: no ads, purchases, accounts, chat, personal data, or other companies' names and characters;
  at most 3 flashes a second; 48 px touch targets; keyboard play.
- Keep the test hook `window.__badgame` and the capture routes listed in game.json working.
- Run `npm run check-submission -- bad-game` from the repository root and fix every ✗ before you finish.
- Every commit needs a sign-off line (`git commit -s`), see SUBMITTING.md.
