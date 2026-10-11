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

## Upgrade phase 3 (pathing + occlusion), A/B vs main
- Sim bench 1000 enemies: main 0.28 ms/tick → branch 0.39 ms/tick (flow field + wall
  checks; p99 1.3 → 1.5 ms).
- In-browser `?stress=1000` (fixed one-tick frames, median with GPU sync): main
  1.2 ms CPU / 3.0 ms synced → branch 1.2 ms / 3.3 ms (within noise; load average ~9).
- Balance after pathing (16 seeds, 0.7): Thea 8:45, Pip 15:16, Brindle 13:51, all 12:37 —
  hero spread re-tuned in phase 13.

## Upgrade phase 4 (maps + Rimewood)
- Gloam Meadow is bit-identical (golden fingerprints unchanged through the MapDef conversion).
- Rimewood 1000-enemy stress (in-browser): 55 draw calls, ~408k triangles (Meadow ~50 /
  ~315k) — variant models + snowy props; aurora + snowfall are 4 extra draw calls.
- Sim profiles (1000 enemies): GC < 3% on both maps, no new hot spots; Rimewood spends a
  little more in flow-field rebuilds (gusts move the player).
- Build: 814 KB.

## Upgrade phase 11 (benchmark + Low tier)
- `?bench=1&seconds=12`, High, M3 Pro (pane, DPR 2, 1780×1434, load average ~50 from other
  work): 97 fps average (120 Hz display), 38 fps 1% low, CPU 2.65 ms/frame, sim 0.5 ms,
  57 draw calls avg / 65 max, 274k triangles avg / 300k max (budget 90 / 900k: ok).
- Low tier at run start (Meadow): 23 draw calls, 64k triangles (no grass / flowers / small
  decoration, fog ×0.72, far plane 150, pixel ratio 0.75).
- Auto quality guesses: SwiftShader / llvmpipe / Intel HD & UHD → Low; Iris Xe, Radeon iGPU,
  Mali / Adreno / PowerVR → Medium; others → High (touch devices → Tablet).
- The `npm run bench-browser` matrix (software renderer, 4× CPU laptop, throttled tablet,
  1000-enemy stress on both maps) is recorded with the touch-controller measurements below.
