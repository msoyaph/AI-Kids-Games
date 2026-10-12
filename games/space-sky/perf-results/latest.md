# Space Sky performance (latest run)

Tablet profile 1024×768 at DPR 2, headless Chromium (ANGLE/Metal) on the dev Mac; CPU throttled with DevTools; `?stress` keeps each tier fixed. Build 1.44 MB. Boot to title 553 ms.

| Tier | Scene | CPU | FPS | p95 ms | Draw calls | Triangles | Heap MB |
|---|---|---|---|---|---|---|---|
| low | hub | ×1 | 60 | 16.8 | 63 | 185k | 58 |
| low | hub | ×4 | 60 | 16.7 | 63 | 185k | 58 |
| low | hub | ×6 | 60 | 16.8 | 63 | 185k | 58 |
| low | belt | ×1 | 60 | 16.7 | 29 | 30k | 58 |
| low | belt | ×4 | 59 | 16.8 | 32 | 36k | 58 |
| low | belt | ×6 | 60 | 16.7 | 31 | 36k | 58 |
| low | rings | ×1 | 59 | 16.7 | 34 | 32k | 58 |
| low | rings | ×4 | 60 | 16.8 | 37 | 35k | 58 |
| low | rings | ×6 | 60 | 16.7 | 35 | 32k | 58 |
| low | level | ×1 | 60 | 16.7 | 66 | 81k | 58 |
| low | level | ×4 | 60 | 16.8 | 66 | 81k | 58 |
| low | level | ×6 | 60 | 16.8 | 66 | 81k | 58 |
| low | finale | ×1 | 60 | 16.7 | 26 | 21k | 58 |
| low | finale | ×4 | 60 | 16.8 | 26 | 21k | 58 |
| low | finale | ×6 | 60 | 16.8 | 26 | 21k | 58 |
| medium | hub | ×1 | 60 | 16.8 | 103 | 186k | 45 |
| medium | hub | ×4 | 60 | 16.7 | 103 | 186k | 45 |
| medium | hub | ×6 | 59 | 16.8 | 103 | 186k | 45 |
| medium | belt | ×1 | 60 | 16.8 | 40 | 38k | 45 |
| medium | belt | ×4 | 60 | 16.7 | 43 | 49k | 45 |
| medium | belt | ×6 | 60 | 16.7 | 42 | 48k | 45 |
| medium | rings | ×1 | 60 | 16.8 | 44 | 35k | 45 |
| medium | rings | ×4 | 59 | 16.8 | 49 | 44k | 45 |
| medium | rings | ×6 | 60 | 16.7 | 46 | 39k | 45 |
| medium | level | ×1 | 60 | 16.8 | 88 | 84k | 45 |
| medium | level | ×4 | 60 | 16.7 | 88 | 84k | 45 |
| medium | level | ×6 | 60 | 16.7 | 88 | 84k | 45 |
| medium | finale | ×1 | 60 | 16.8 | 41 | 21k | 45 |
| medium | finale | ×4 | 60 | 16.7 | 41 | 21k | 45 |
| medium | finale | ×6 | 60 | 16.8 | 41 | 21k | 45 |
| high | hub | ×1 | 60 | 16.8 | 158 | 346k | 61 |
| high | hub | ×4 | 60 | 16.8 | 158 | 346k | 61 |
| high | hub | ×6 | 54 | 33.3 | 158 | 346k | 61 |
| high | belt | ×1 | 60 | 16.7 | 44 | 43k | 61 |
| high | belt | ×4 | 60 | 16.8 | 47 | 62k | 61 |
| high | belt | ×6 | 59 | 16.7 | 49 | 68k | 61 |
| high | rings | ×1 | 60 | 16.8 | 48 | 43k | 61 |
| high | rings | ×4 | 60 | 16.7 | 52 | 53k | 61 |
| high | rings | ×6 | 56 | 33.3 | 51 | 51k | 61 |
| high | level | ×1 | 60 | 16.8 | 137 | 135k | 61 |
| high | level | ×4 | 60 | 16.7 | 137 | 135k | 61 |
| high | level | ×6 | 51 | 33.4 | 137 | 135k | 61 |
| high | finale | ×1 | 60 | 16.7 | 45 | 21k | 61 |
| high | finale | ×4 | 60 | 16.7 | 45 | 21k | 61 |
| high | finale | ×6 | 60 | 16.8 | 45 | 21k | 61 |

## Memory across 10 scene changes (Medium)

| After | Geometries | Textures | Heap MB |
|---|---|---|---|
| hub (start) | 113 | 35 | 45 |
| lap 1: hub | 144 | 71 | 45 |
| lap 1: hub | 113 | 66 | 45 |
| lap 2: map | 124 | 66 | 45 |
| lap 2: flight | 126 | 66 | 45 |
| lap 2: landing | 116 | 66 | 45 |
| lap 2: explore | 143 | 73 | 45 |
| lap 2: hub | 175 | 80 | 45 |
| lap 2: codex | 177 | 80 | 45 |
| lap 2: hangar | 176 | 80 | 45 |
| lap 2: flight | 126 | 66 | 45 |
| lap 2: explore | 140 | 71 | 45 |
| lap 2: cutscene | 150 | 75 | 45 |
| lap 2: hub | 114 | 66 | 45 |
| hub (end, settled) | 114 | 66 | 45 |
