# Stress scene per tier

45 plants, 40 critters, 150 shots (`?scene=stress`), headed Chromium on the release Mac (Apple M3 Pro, 120 Hz display, so frame times are tied to the display at 8.3 ms), 1280×720. Frame and CPU times are p50 / p95 over the last 240 frames; the heap is read 3 s and 13 s after the scene starts.

| Tier | Draw calls | Triangles | Programs | Frame ms | CPU ms | JS heap |
|---|---|---|---|---|---|---|
| low | 80 | 796k | 13 | 8.3 / 9.2 | 0.6 / 0.8 | 11.6 → 12.1 MB |
| medium | 80 | 816k | 28 | 8.3 / 8.8 | 0.6 / 0.9 | 8.0 → 12.2 MB |
| high | 87 | 832k | 32 | 8.3 / 8.6 | 0.6 / 1.0 | 8.5 → 7.8 MB |

Draw-call ceilings (checked by tests/e2e/perf.spec.ts on every run, CI included): Low 80, Medium 120,
High 200. Everything is instanced per model part, so draw calls depend on how many kinds are on the
board, not how many plants or critters. The CPU time per frame (rules, animation and instancing) stays
under 1 ms, so a 4× slower phone CPU still has room for 60 FPS. Triangles are about 0.8 million with
the outline hulls; all tiers use the same models (Low saves on pixel ratio, shadows and effects).
