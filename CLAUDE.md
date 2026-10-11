# Calex Cart — Claude notes

Original 3D kart racer for ages 10–14. Vite + TypeScript (strict) + Three.js. Ships as ONE self-contained
`dist/index.html` (vite-plugin-singlefile) that runs inside a sandboxed iframe on the Ai Kids Games site.

## Commands
- `npm run dev` — dev server on :5173 (dev-only track editor available here)
- `npm run build` — typecheck + single-file build → `dist/index.html`
- `npm test` — Vitest unit + headless sim tests
- `npm run test:e2e` — Playwright smoke tests (desktop / tablet / phone) against the built file
- `npm run sim` — headless AI-vs-AI balance report (tsx scripts/simulate.ts)

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

## Status
- Phase 1 ✅ scaffold, single-file build, renderer + adaptive DPR, inline loading screen.
- Phase 2 ✅ kart physics, keyboard/gamepad/touch input, chase camera on a test arena; physics unit tests.
- Phase 3 ✅ spline track system + mesh generator, laps/positions/wrong-way/respawn; sim tests (tests/sim).
- Phase 4 ✅ drift tiers/mini-turbo/hop/tricks/boost pads/gliders/water+low-grav in physics; visual feedback via
  `render/particles.ts` (pooled THREE.Points, 2 draw calls) + `effects.ts` (sparks by tier, smoke, dust, flames,
  trails, bubbles, bursts on events, skid marks, camera shake), underwater fog tint.
- Phase 5 ✅ AI racers with personalities (data/aiProfiles.ts), rubber-banding, steering assist; AI sim tests.
- Phase 6 ✅ items (12), rolls, AI item use. Phase 7 🚧 tracks: Sunrise Cup done; other cups built by agents.
- Phase 8 ✅ Grand Prix, Time Trial (+ghosts, staff ghosts), Versus (single/cup, options), Battle (4 arenas).
  Dev shortcuts (dev server only): `/?track=<id>[&autodrive][&mirror][&class=pro][&ai=7][&nointro]`, `/?arena=<id>`.
  Headless e2e: `node scripts/probe.mjs <url> <script.js>` uses Metal GPU (set SWIFTSHADER=1 to force software).
  `window.__calex.app` exposes the App (flows can be driven via `app.screens.*`, `app.loop.timeScale` speeds up sims).
