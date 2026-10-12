# Continuous integration

Light Crossing lives in the [Ai Kids Games monorepo](../../../README.md). Its checks run in the
root workflow (`.github/workflows/ci.yml`, job **Light Crossing**) on GitHub's standard Ubuntu
runners for every pull request and every push to `main` that touches `games/light-crossing/` or
shared files: typecheck, build, build under 2 MB, unit tests (including full story playthroughs and
a year after the story), story pacing, and the browser smoke tests at **Low quality** on software
WebGL (SwiftShader) with longer timeouts (`E2E_LOW=1 npm run e2e:ci`).

Run the same checks locally from the repo root:

```bash
npm run typecheck --workspace games/light-crossing
npm run build --workspace games/light-crossing
npm run size --workspace games/light-crossing
npm test --workspace games/light-crossing
npm run pacing --workspace games/light-crossing -- --check
E2E_LOW=1 npm run e2e:ci --workspace games/light-crossing
```

The normal-quality browser tests and the performance benchmark need a real GPU: run them by hand
on your own computer, as described in [docs/BENCHMARKS.md](../../../docs/BENCHMARKS.md). Never
connect a self-hosted runner to this public repository: anyone could open a pull request that runs
code on your machine.

After changing the game, update the website's copy of it with
`npm run import-game -- light-crossing` from the repo root; CI fails if the game's source changes
without a re-import.
