# Calex Cart — Claude notes

Original 3D kart racer for ages 10–14. Vite + TypeScript (strict) + Three.js. Ships as ONE self-contained
`dist/index.html` (vite-plugin-singlefile) that runs inside a sandboxed iframe on the Ai Kids Games site.

## Commands
- `npm run dev` — dev server on :5173 (dev-only track editor available here)
- `npm run build` — typecheck + single-file build → `dist/index.html`
- `npm test` — Vitest unit + headless sim tests
- `npm run test:e2e` — Playwright smoke tests (desktop / tablet / phone) against the built file
- `npm run sim` — headless AI-vs-AI balance report (tsx scripts/simulate.ts)
- `npm run calibrate-staff [-- ids]` — re-place staff ghosts (writes BALANCE.staff.tracks); RUN AFTER ANY
  physics/AI/track change (tests/sim/staff.test.ts enforces Pro AI > staff > strong bot)
- `npm run analyze-playtests -- <folder>` — aggregates exported playtest JSON, compares with sim baselines,
  prints SUGGESTED `BALANCE` edits (never applies them) → `sim-report/playtests.md`

## Hard rules
- No external assets, fonts, CDNs or network requests. All models are procedural geometry, all audio is Web Audio synthesis.
- Fully original content: no Nintendo characters/items/track designs/UI/music. No shells, banana peels, star power.
- `src/sim/**` must NOT import three.js or touch the DOM — it runs headlessly in tests.
- Sim randomness only via `Rng` (src/core/rng.ts). No `Math.random`/`Date` inside sim.
- No allocation in per-frame hot paths (reuse scratch vectors, pools).
- localStorage access only through `src/save/` (try/catch, versioned, migrations).

## Architecture
- `src/core/` — fixed-step loop (60 Hz + interpolation, pauses on hidden tab), seeded RNG, math helpers.
- `src/render/` — GameRenderer (adaptive DPR, scissor viewports), QualityManager (auto low/med/high + render scale).
- `src/sim/` — headless race sim: `world.ts` (phases, countdown/rocket start, kart-kart collisions, hooks),
  `physics.ts` (arcade kart step: drive/steer/drift-hop/mini-turbo/air/tricks/gliding/walls/drone respawn),
  `kart.ts` (Kart state), `ground.ts` (GroundModel interface), `arena.ts` (open arenas), `tuning.ts` (constants,
  speed classes, weight-class stats → physics params), `events.ts` (sim→presentation event queue).
  Yaw convention: forward = (sin yaw, cos yaw); right = (-cos yaw, sin yaw); steer +1 = right = yaw decreases.
- `src/input/` — InputManager (keyboard schemes solo/left/right, gamepad standard mapping, touch overlay, tilt),
  remappable bindings in `bindings.ts`. Auto-accelerate applies only after GO (so rocket starts stay skill-based).
- `src/render/` — `lowpoly.ts` builds merged vertex-coloured meshes from `ModelPart[]` recipes; `kartModel.ts`
  (KartVisual reads sim state + interpolates), `decals.ts`, `camera.ts` (ChaseCamera), `sky.ts`, `arenaMesh.ts`.
- `src/sim/track/` — `trackModel.ts` bakes TrackData (Catmull-Rom control points, closed loop) into a `Ribbon`
  of ~1 m samples (frames, half-width, bank, edges L/R wall|drop|open, shoulders, flags gap/water/lowgrav), plus
  shortcut ribbons (open splines mapped onto main-track s), boost-pad/ramp rects in (s,d) space, item-box spots,
  and an AI racing line (iterative relaxation). Feature positions in data use control-point units `u`.
  Ground query = local nearest-sample walk from the kart's hint → (s, d) → height/normal/surface/walls.
  Mirror mode negates x (and bank/offsets) at bake time.
- `src/sim/race.ts` — RaceTracker: continuous progress (jumps >25 m ignored → no infield/backward cheating),
  laps, finish order, ranks (insertion sort), wrong-way, grace period then projected finishes.
- `src/render/trackMesh.ts` (strips: road/kerbs/dashes/shoulders/verges/walls/fences/skirts/ramps/pads/gate),
  `props.ts` (instanced scatter from `data/props.ts` recipes), `raceView.ts` (scene assembly, cameras,
  blob shadows or follow shadow-map on High, split-screen viewports).
- `src/sim/ai/` — `aiDriver.ts` (pure-pursuit on racing line + personal lane wander, corner-based drifting to a
  skill-dependent spark tier, shortcut decisions per lap, item-box seeking, kart/hazard avoidance, rocket-start
  timing, tricks, unstick-by-reversing); `aiController.ts` (spawns drivers per AI kart with class skill ± variance,
  mild rubber-band vs best human via World.speedMul, steering assist for players).
- `src/game/` — `app.ts` (App: loop, renderer, input, audio, saves, UI, menu scene, session lifecycle, pause),
  `session.ts` (RaceSession: one race/battle — builds world+AI+items+hazards+battle rules+view+HUDs, routes events,
  records ghosts, reports SessionResult), `modes/` (GrandPrix points/grids, roster picking, staff ghosts),
  `progression.ts` (trophies, records, unlock rules), `challenges.ts`.
- `src/ui/` — DOM UI: `ui.ts` (Ui screen manager + spatial focus nav + `h()`/`button()` helpers), `hud.ts`,
  `minimap.ts`, `icons.ts` (original SVG item icons), `screens/` (menus, setup, results/podium/unlocks, settings,
  extras; `screens/index.ts` = registry + all mode flows). Menus are navigable by keyboard/gamepad/touch.
- `src/save/` — `storage.ts` (try/catch localStorage + memory fallback), `save.ts` (3 slots, versioned, MIGRATIONS
  chain, debounced autosave, settings, ghosts stored under separate keys).
- `src/sim/` extras: `ghost.ts` (15 Hz quantised delta ghosts, base64), `battle.ts` (balloons, timed, refill),
  `rules.ts` (GP points 15-12-10-8-6-4-2-1, standings, medals), `hazards.ts`, `ai/battleDriver.ts`, `ai/itemBrain.ts`.
- `src/render/menuScene.ts` — 3D backdrop for menus (turntable, title lineup, podium + confetti).
- `src/data/` — typed content (`types.ts` is the contract for everything).
- `scripts/probe.mjs` — open the game in headless Chromium and evaluate JS (`window.__calex` debug hook).
  Note: headless SwiftShader renders slowly, so drive-tests belong in Vitest sim tests; use the browser pane for visuals.

## Status (v0.2 upgrade complete on `calex-upgrade`; final report `docs/upgrade/REPORT.md`)
- 20 tracks / 5 cups (Sunrise, Thunder, Galaxy, Legend, Frost), 5 arenas (Balloons + Coin Rush), 13 racers,
  12 items, 40 challenges, Driving School (6 lessons, 2 practice courses), instant replay, 2P split.
- Tests: `npm test` (192 unit + headless sim), `npm run test:e2e` (Playwright Chromium + WebKit × desktop/tablet/
  phone, file://, sandboxed iframe, gamepad stub, a11y), `npm run validate`, `npm run sim`, `npm run balance-report`.
- Perf (Apple M3 Pro, built game): 60 fps on every tier and profile incl. the throttled tablet at Medium; Low on
  the heaviest tracks 42–46k avg triangles (v1: 71–111k). Build 1.21 MB; storage worst case 1.08 MB.

## Gotchas
- `layout()` marks: new tracks get exact tangents; the 16 original tracks use `{ legacyMarkHeadings: true }`
  (their props were placed against the old 10–15° skew). Never remove that flag without re-placing their props.
- Headless Playwright on macOS uses `--use-angle=metal`; SwiftShader is ~10× slower (CI fallback).
- Chrome blocks localhost iframes inside about:blank (private network access) — host pages in e2e are served
  via `page.route` on the same origin.
- Shared/cached geometries & materials set `userData.shared = true`; RaceView.dispose frees everything else.
- Storage: only `src/save/` touches localStorage; every save write goes through `SaveManager.write` (atomic setItem,
  frees the playtest log first when full, never touches non-`calexcart.` keys). Ghost strings use 15-bit chars.
- Playwright: projects ending in `desktop` run the "once" tests; WebKit needs `npx playwright install webkit`.

## Upgrade in progress (branch `calex-upgrade` — do NOT merge into main without user approval)
Plan: `/Users/cliffsumalpong/.claude/plans/modular-herding-pancake.md` (approved). Work Phase 0→10, commit per phase.
Stop and ask ONLY if a change would break existing saves, push the build over 2 MB, make a definition-of-done
item impossible, or need a gameplay decision beyond the plan. Otherwise decide, note it below, keep going.

Approved decisions: catch-up targets; staff = strong bot + 35 % of the gap to Pro AI; assist Auto = Light (touch) /
Off (keyboard, gamepad), old `true` → Light; Champion/Mirror unlocks stay tied to the original 4 cups; Frost Cup
unlocks with any Legend trophy (any class), playable in every class + Mirror once unlocked, not required for old
unlocks; new racer Yuki (young yeti); WebKit for Playwright.
Additions: storage budget ≤ 1.5 MB worst case (ghost for every track incl. Frost × 3 slots + full playtest log +
settings), playtest log ring buffer ≈ 100 KB, graceful full-storage handling, never touch non-`calexcart.` keys,
tests + measured numbers; "Playtest recording on" indicator + "Clear playtest data" button; optional self-hosted
Mac runner workflow (private repo only, untrusted PRs must never run on the machine); Frost tracks validated in
every class, normal + mirror, using corrected layout markers (no compatibility flag).

### Progress
- [x] Phase 0 — baseline: `docs/upgrade/baseline.json` (perf per tier, throttled tablet, sim, staff vs Pro AI,
  storage), `docs/upgrade/baseline-balance.md`, `docs/upgrade/before/*.png`, real save fixture
  `tests/fixtures/save-v2.json` (made by `scripts/makeFixture.mjs`). Tools: `scripts/capture.mjs` (screenshots),
  `scripts/perf.mjs --tablet` (1024×768 DPR 2 touch profile).
- [x] Phase 1 — `src/tuning/balance.ts` (BALANCE: classes, catch-up, stat map, item weights, AI knobs, assist
  levels, staff) read by tuning.ts/items.ts/rolls.ts/aiDriver/aiController/timeTrial — golden races identical.
  Playtest: `src/save/playtest.ts` (PlaytestStore, `calexcart.playtest`, rolling ≤ 50 K chars ≈ 100 KB),
  `src/game/playtest.ts` (record builder), `src/ui/screens/playtest.ts` (Settings tab: tap the Settings title 5×
  or `?playtest=1`; Export = download standalone / copy box in iframes; Clear), badge `.playtest-badge`,
  `src/tuning/analyze.ts` + `scripts/analyzePlaytests.ts`. Kart `assist` boolean → `assistLevel`.
  New race stats: shortcutsById, startResult, wallHits, offroadTime. `__CALEX_VERSION__` define (package 0.2.0).
- [x] Phase 2 — staff ghosts (`src/sim/timeTrialRun.ts`: runTimeTrial, expertStyle, staffReferences; AiDriver
  `DriverStyle`), catch-up (`src/sim/catchup.ts` measureCatchUp; tests/sim/catchup.test.ts), assist Off/Light/Full
  (+ Full edge guard on drop edges) with settings v2 migration (`steeringAssist` → `assist`), `resolveAssist`.
  AI drift rewrite + drift physics retune (see decisions). Reports: `npm run sim` §5 catch-up, §6 staff.
- [x] Phase 3 — scenery LOD (`src/render/props.ts`: 120 m chunks of merged meshes, full/LOD1 (`buildRecipe(…, lod 1)`)
  /impostor atlas billboards, tier distances in QualityProfile.propFullDist/propLodDist/propBigRadius; Low = LOD1 +
  impostors from 60 m, draw distance 230), benchmark (`src/game/benchmark.ts`, `src/ui/screens/benchmark.ts`,
  Settings → Graphics → Test performance, `?bench=1&seconds=&quality=`, `npm run bench -- --profile tablet`),
  WebGL context loss (GameRenderer.onContextLost/Restored, App overlay "Tap to continue", atlas re-render),
  WebKit Playwright projects (webkit-desktop/tablet/phone), storage budget (ghost format G2, GHOST_MAX_SECONDS 240,
  `SaveManager.write` single path + freeSpace/onStorageProblem, startup re-encode of CGH1 ghosts, tests in
  tests/unit/storage.test.ts → sim-report/storage.json), chase cam hides rivals in the line of sight.
- [x] Phase 4 — game feel: camera speed pull + FOV + kick (`ChaseCamera.kick`, `RaceView.setFeel/kick`), hit-stop
  (`RaceSession.hitStop`, single player, not TT), rumble (`InputManager.rumble`: gamepad dual-rumble / Android
  vibrate, Settings → Gameplay → Rumble), dizzy stars + spin squash (KartVisual.stars), tier-coloured mini-turbo
  bursts/rings, HUD spark pulse, stronger speed lines, radial speed blur post-pass on High (`GameRenderer.motionBlur`),
  Settings → Graphics → Reduce effects (default from prefers-reduced-motion; `.hud.calm`), snappier drift
  (hop 4.2→3.6, `TUNING.driftKick` 0.07), audio: engine timbre per weight class, pass-by doppler, tyre surface
  loops (`TrackData.roadSound`: road|metal; dirt/water/ice automatic), drift crackle, layered mini-turbo, finish
  celebrations by personality. Screen-shake setting now actually applies (it was ignored before).
- [x] Phase 5 — visuals: `SkyData.light` (sunDir/sun/intensities/hemiGround/grade) on all tracks via `skyLights()`;
  kart looks per tier (`kartMaterials`: Low plain, Medium Lambert+rim, High Phong+rim; rim colour from sky);
  `src/render/driverRig.ts` (one SkinnedMesh, 4 bones, roles auto-detected or `ModelPart.role`; poses drive /
  lookBack / hit / celebrate / disappointed / wave / cheer / clap; Medium/High only); `src/render/surfaces.ts`
  (water ground `SkyData.waterGround`, creek surfaces over water zones (`ZoneData.surface:false` to skip), road
  sheen `SkyData.roadSheen`, pod shimmer; shared `fxTime`); glider spring/unfold, launch puff, podium confetti,
  HUD gain/loss flash, FINAL LAP banner, item slot polish, results rows slide in. Podium karts now face the camera
  (they showed their backs before). Low verified not heavier (Neon Low 41 draws / 58k tris).
- [x] Phase 6 — ice (`TrackData.ice` ranges, shortcut `surface: 'ice'`, `F_ICE` flag, ground surface 'ice',
  TUNING.iceGrip/iceDriftGrip/iceAccel/iceCoast/iceDriftCharge, AI `iceCornerMul`, glossy sparkle ice layer on
  Medium/High (`iceMaterial`), frost sparkles, skate hiss, minimap/validator/editor), Frostpeak icy slalom + icy
  ski-jump shortcut, Canyon Run reshaped (lap 32–33 s, ~6 AI mini-turbos/race), `layout(…, { legacyMarkHeadings })`
  with exact tangents by default (16 old tracks flagged; `src/data/tracks/fingerprint.ts`,
  `scripts/trackHashes.ts --write`, tests/unit/trackHashes.test.ts; Canyon's fingerprint refreshed on purpose).
  AI: one drift decision per bend (linked bends work), extra lane room when drifting; drift kick is now a 0.15 s
  yaw-rate boost (`driftKickIn`) the AI accounts for (an instant yaw kick had halved AI drifting).
  Full assist also steers in the air (`airBlend`) → no falls for the simulated beginner.
- [x] Phase 7 — Frost Cup (`src/data/tracks/frost/*` built by worktree agents, one props file each in
  `src/data/props/frost/`, cup `frost` unlocks with any Legend trophy; `ORIGINAL_CUPS` keep Champion/Mirror rules;
  save v3 migration grants Frost to v2 saves holding a Legend trophy), Yuki (racer 13; staff racer pool pinned to
  the first 12 racers), parts snowcat/spikes/snowflake/aurora/snowflakes + `learner` (Driving School reward),
  6 Frost challenges (new goal filters `cup` on shortcut/staffGhosts, `iceDriftSeconds`), Coin Rush
  (`src/sim/coinRush.ts` ArenaRules, `src/render/coinVisuals.ts`, battle setup "Game" choice, arena
  `coin-carnival`), instant replay (`src/game/replay.ts` ReplayRecorder/ReplayPlayer, `src/ui/screens/replay.ts`,
  "Replay 🎬" on every results screen; memory only), Driving School (`src/data/school.ts` lessons + medals,
  `src/sim/school.ts` LessonSim, `src/sim/schoolRun.ts`, `src/render/schoolVisuals.ts`, `src/ui/screens/school.ts`,
  courses `school-ring`/`school-park` in `SCHOOL_TRACKS`, save field `school`, main-menu prompt for new players).
  All 4 Frost tracks use corrected markers (no legacy flag) and pass `validateTracks --all-classes` (6 runs each:
  8/8 finish, 0 falls). Staff calibrated for all 20 tracks. Worst-case storage @20 tracks: 1.08 MB / 1.5 MB budget
  (60 ghosts 936 KB, slots 48 KB, playtest log 100 KB, settings 1 KB). Build 1.21 MB.
- [x] Phase 8 — accessibility: spark tiers = 1–3 chevrons + word (MINI/SUPER/ULTRA) on the HUD and bigger/more/
  higher in-world sparks per tier; item warnings = icon + word (PLANE!/BALL!/POPPER!/CLOUD!/TWISTER!); Driving
  School gates also say ✓/✗ in a banner; Settings → Graphics → HUD size 100/125/150 % (`settings.hudSize`, CSS
  `--hud-scale` via the `scale` property per corner; split-screen caps at 125 %; minimap canvas resized, touch
  look-button moves aside); controls card (`src/ui/screens/controlsCard.ts`) before the first race per device
  (`settings.controlsSeen`), shown from the menu funnel `run()` in `screens/index.ts` (debug-hook races skip it),
  re-openable in Settings → Controls. Menus: Tab/Shift+Tab step through every button; up/down use row-first
  spatial nav (nearest row, then closest across) — fixed Settings tabs being unreachable with arrows; the name box
  is in the focus order (selects its text, Enter starts). e2e: `tests/e2e/a11y.spec.ts` (keyboard reachability
  BFS on 13 screens + Tab cycle, gamepad-only journey, touch-only screens + 28 px targets); e2e tests that aren't
  about the card call `skipControlsCard()`.
- [x] Phase 9 — CI: `.github/workflows/ci.yml` (Ubuntu: npm ci → typecheck → build with `scripts/checkSize.mjs`
  (now part of `npm run build`, fails ≥ 2,000,000 bytes) → vitest → `npm run validate` → Playwright Chromium +
  WebKit, all 6 projects, with `CI` (300 s tests, ×3 explicit waits via `slow()`, 1 retry, 1 worker, HTML report)
  and `CALEX_TESTMODE=1` (fixture in `tests/e2e/fixtures.ts` sets `window.__CALEX_TESTMODE` → `app.enterTestMode()`:
  Low + reduced effects; `?testmode=1` does the same) → report/screenshots uploaded on failure, `index.html` on
  success). `.github/workflows/mac-gpu.yml`: optional self-hosted Mac runner (label `calex-mac`), manual or push
  only, never PRs, guarded by `repository.private && actor == owner`, full quality + benchmark; warning text at
  the top of the file and in README. `CALEX_SWIFTSHADER=1` forces software GL locally to rehearse CI. Spec files
  import `test`/`expect` from `./fixtures`, not `@playwright/test`.
- [x] Phase 10 — final verification + `docs/upgrade/REPORT.md` (before/after, balance, staff times, benchmark per
  tier, build size, storage, device how-to, CI steps, registry entry, known issues). `npm run balance-report`
  (`scripts/balanceReport.ts` → `sim-report/final/balance.md`); `scripts/perf.mjs` starts races directly
  (`--url`, avg draws/tris). Review fixes: shared materials split into instanced twins (`Materials.flatInst`,
  `podInst`, `basicInstPlain` — a material shared by instanced + plain meshes re-resolves its program every frame),
  hidden rivals drop blob shadow + particles (`Effects.hidden`), particles fade within 4 m of the lens, faceted
  glowing pods (`POD_GLOW_GLSL`), Yuki in the fairness report/test, controls card fits landscape phones, results
  screen tables shrink/scroll (`.results-cols`, no `flex-wrap` + `max-height:100%`, which WebKit ignores) so the
  buttons stay tappable on a landscape iPhone.

### Upgrade notes / decisions log
- Phase 8/9 Coin Rush fix (found by a flaky e2e): AI circled coins (no slow-down), coins spawned inside obstacles
  (spot query at y=30 skips obstacles) and karts got wedged inside raised platforms / under ramp ends (every move
  rejected as "too tall"). Now: coin spots = flood fill of kart-height-clear ground from the spawn points, flat
  non-ramp cells with 3 m room; AI eases off near a target it points past, gives up a coin/pod after 6 s, detects
  "stuck" by distance moved (window restarts after reversing); arena platforms/ramp sides taller than `stepUp`
  above the kart are walls that push out. Per-AI coins in 2 min: min 0–4 → ≥ 9 in every arena.
- Baseline finding: on 9/16 tracks the plain Pro AI (best of 5 seeds) beats the staff ghost → fixed in Phase 2.
- `storage.ts`: `writeKeyStatus` → 'ok' | 'memory' (storage unavailable) | 'full' (quota); probe key is now
  `calexcart.__probe` (never touch other games' keys). e2e helpers live in `tests/e2e/helpers.ts`; new feature
  tests go in `tests/e2e/upgrade.spec.ts`.
- Phase 2 finding: drifting was a net LOSS (AI 5–15 % slower when drifting — slid wide into walls/off-road).
  Fixes: AI aims drifts by velocity heading and steers for the needed yaw rate, only drifts bends whose radius fits
  the drift's yaw-rate band, hops so it lands at turn-in, bails near edges. Physics (pulled forward from Phase 4
  "snappier drift / readable tiers"): driftGrip 2.2→3.6, driftRateMin 0.3→0.15, tiers 0.85/1.75/2.9→0.7/1.45/2.4 s,
  mini-turbo 0.7/1.15/1.75→0.9/1.4/2.1 s, new `driftSpeedKeep` 0.5. Expert drifting now ≈ 2.7 s/race faster.
- Balance changes: topSpeed perStat 0.005→0.003 (weight-class spread 0.28→0.25); AI pace 0.9+0.1·skill →
  0.82+0.18·skill (skill matters: skill-1.0 racer wins 56 %/top-3 86 % vs Pro AI; Rookie AI gentler);
  catchUp.behindStart 15→25 m. Catch-up metrics swing ±5 % with item luck — judge changes on ≥ 80 races.
- Phase 4 rebalance: last-place item weights softened (rocketDash 14→9, turbo3 15→12, magnet 13→11, bumper 5→8);
  catch-up test now uses 160 races/scenario (10 seeds) because item luck swings small samples by ±9 %.
- `SPEED_CLASSES[c]` IS `BALANCE.classes[c]` (same object) so experiments that mutate BALANCE apply live.
- Phase 3 results: Low Neon 115k→60k tris / 48→43 draws, Jadefall 74k→43k / 41→35; throttled tablet Medium 60 fps.
  Worst-case storage (16 tracks) 0.89 MB (ghost 15.6 KB per 240 s max run). Medium/High gained a few draws
  (chunked meshes) but lost 20–35 % triangles.
- Baseline storage: ghosts ≈ 180 chars/s (≈ 23 K chars per run); 16 tracks × 3 slots ≈ 2.4 MB UTF-16 → must compress.
