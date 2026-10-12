# Continuous integration

Vanex Defense lives in the [Ai Kids Games monorepo](../../../README.md). Its checks run in the root
workflow (`.github/workflows/ci.yml`, job **Vanex Defense**) on GitHub's standard Ubuntu runners for
every pull request and every push to `main` that touches `games/vanex-defense/` or shared files:
typecheck · unit tests + balance sims · single-file build · dist checks (size < 2 MB, file:// + http,
zero requests) · all Playwright tests (desktop, phones, tablet).

GitHub's machines render WebGL in software, so with `CI=true` the Playwright config allows longer
timeouts, uses 2 workers and 1 retry, and every page reports a 2-core device so Auto quality picks
**Low** (`tests/e2e/fixtures.ts`). The flash-safety frame audit needs at least 15 frames per second,
so it skips itself there with a note ("needs a GPU").

Run the same checks locally from the repo root:

```bash
npm run typecheck --workspace games/vanex-defense
npm test --workspace games/vanex-defense
npm run build --workspace games/vanex-defense
npm run check:dist --workspace games/vanex-defense
npm exec --workspace games/vanex-defense -- playwright test
```

The full-quality run (including the real-GPU flash audit) and the `npm run perf` benchmark need a
real GPU: run them by hand on your own computer, as described in
[docs/BENCHMARKS.md](../../../docs/BENCHMARKS.md). Never connect a self-hosted runner to this public
repository: anyone could open a pull request that runs code on your machine.

After changing the game, update the website's copy of it with `npm run import-game -- vanex-defense`
from the repo root; CI fails if the game's source changes without a re-import.
