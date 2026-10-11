# Baselines (v1 / `main` @ 9f10c36)

Recorded at the start of the `theabonk-upgrade` branch so every later phase can be compared.

## Build
- `dist/index.html`: 772,361 bytes (754 KB), single file, no external references.

## Simulation performance (`npx tsx scripts/bench.ts 1000 20`)
- Quiet machine (M3 Pro): ~0.28 ms/tick avg at 1000 enemies + ~470 projectiles.
- Under heavy background load (load average ~15): 0.64–0.88 ms/tick avg.
- **Absolute timings are load-sensitive.** Compare A/B back-to-back against a `main`
  worktree (`git worktree add <dir> main`) rather than against these numbers.

## Render performance (in-browser, `?stress=1000`, gl.finish() per frame)
- M3 Pro, 1780×1808: High 1.43 ms · Medium 1.00 ms · Low 0.89 ms per frame;
  ~50 draw calls, ~315k triangles.

## Balance (`npm run simulate -- 16 0.7`, bot skill 0.7, no meta, never slides)
| Hero | Avg survival | Wins |
| --- | --- | --- |
| Thea | 12:35 | 3/16 |
| Pip | 11:32 | 3/16 |
| Brindle | 14:59 | 6/16 |
| All | 13:02 | 12/48 |

## Saves
- Real v1 save fixture: `tests/fixtures/save-v1.json` (1.5 KB pretty-printed), produced by
  the v1 code paths (6 bot runs, shop purchases, settings changes).

## Golden determinism fingerprints (tests/unit/golden.test.ts)
- thea/4242 → `2055916a`, brindle/9001 → `f4beddb6` (120 s bot runs).
