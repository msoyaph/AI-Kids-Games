# Block Builder

A community game for AI Kids Games by @bad-maker. It started from the starter game ("Star Catch").

## Make it yours

- Rules: `src/sim.ts`. Drawing: `src/render.ts`. Sounds: `src/audio.ts` (made in code, no files).
- Keep the plumbing: one self-contained file, no network, saves only under `badgame.`
  (`src/storage.ts`), the test hook `window.__badgame` and the capture routes (`?scene=…`).
- Describe your game in `game.json`: title, ages, content notes, controls and the originality statement.

## Commands (run them from the repository root)

```bash
npm run dev:community -- bad-game           # play it while you build
npm run check-submission -- bad-game        # every check the reviewers run, with fixes
```

When every check passes, open a pull request that changes only `community/bad-game/`. The whole
process, the kid-safety rules and what happens next are in SUBMITTING.md at the repository root.
