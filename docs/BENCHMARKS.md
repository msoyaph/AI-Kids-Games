# Full-quality tests and benchmarks (run on your own computer)

GitHub's standard runners have no GPU, so CI runs every game's browser tests in its low-quality
mode on software WebGL. The full-quality runs and the performance benchmarks below need a real
GPU. Run them by hand on your own machine (a Mac with Apple silicon is what the numbers in each
game's docs were measured on).

> **Never connect a self-hosted runner to this repository.** It is public: anyone can open a
> pull request, and a self-hosted runner would execute that code on your computer. The games
> used to ship optional self-hosted workflows from when they were private repos; those were
> removed when they moved here, and `scripts/check-repo.ts` fails CI if one ever comes back.

Install once from the repo root:

```bash
npm ci
npx playwright install chromium webkit firefox
```

Each game's Playwright config already uses the Metal GPU on macOS (ANGLE flags) unless CI is set.

## TheaBonk

```bash
npm run build --workspace games/theabonk
npm exec --workspace games/theabonk -- playwright test   # full quality on the Metal GPU
npm run bench --workspace games/theabonk                  # headless simulation benchmark
```

## Light Crossing

```bash
npm run build --workspace games/light-crossing
npm run e2e --workspace games/light-crossing            # normal quality, touch play, layouts
npm run bench --workspace games/light-crossing -- --out bench-results.json
npm run bench --workspace games/light-crossing -- --profile phone --out bench-phone.json
npm run bench --workspace games/light-crossing -- --profile tablet --out bench-tablet.json
```

## Vanex Defense

```bash
npm run build --workspace games/vanex-defense
npm run check:dist --workspace games/vanex-defense
npm exec --workspace games/vanex-defense -- playwright test     # includes the real-GPU flash audit
npm run perf --workspace games/vanex-defense            # 300 constructs, throttled phone profiles
```

## Space Sky

```bash
npm run build --workspace games/space-sky
npm run test:e2e --workspace games/space-sky
npm run perf --workspace games/space-sky                # every heavy scene, Low/Medium/High, CPU ×1/×4/×6
```

## Calex Cart

```bash
npm run build --workspace games/calex-cart
npm exec --workspace games/calex-cart -- playwright test        # Chromium + WebKit at full quality
npm exec --workspace games/calex-cart -- vite preview --port 4173 --strictPort &
for q in low medium high; do npm run bench --workspace games/calex-cart -- --quality $q --seconds 30 --json sim-report/bench-$q.json; done
npm run bench --workspace games/calex-cart -- --quality medium --seconds 30 --profile tablet --json sim-report/bench-tablet-medium.json
kill %1
```

## Cliff Valley

```bash
npm run build --workspace games/cliff-valley
npm run bench --workspace games/cliff-valley -- --gpu --cpu=4    # Metal GPU, tablet/phone profiles
npm run test:e2e --workspace games/cliff-valley
```

Keep results out of git: `perf-results/`, `sim-report/`, `reports/*.json` and Playwright reports
are ignored. Summarise notable numbers in the game's own docs instead.
