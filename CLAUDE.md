# TheaBonk — agent notes

3D low-poly survivors-like roguelite. Vite + TypeScript (strict) + Three.js, fully client-side,
single-file build. All art is procedural geometry, all audio is Web Audio synthesis — never add
asset files, CDN links or web fonts.

## Commands
- `npm run dev` — dev server (http://localhost:5173). URL params: `?seed=123` (fixed run
  seed), `?stress=1000` (stress test: keeps N enemies + 0.4·N projectiles alive, player
  invulnerable). F3 toggles the debug overlay. `window.__theabonk` is the Game instance
  (`advance(seconds)` steps frames synchronously — handy when rAF is throttled).
- `npm run build` — typecheck + single-file build → `dist/index.html` (works from file:// and in a
  sandboxed iframe).
- `npm test` — Vitest unit tests (`tests/unit`).
- `npm run test:e2e` — Playwright smoke tests (`tests/e2e`), builds + serves on a dedicated port
  (47413, `E2E_PORT` overrides; never reuses a foreign server).
- `npm run simulate -- [seeds] [skill]` — headless balance simulation (bot plays full runs
  per character). `VERBOSE=1` prints every run.
- `npm run bench -- [enemies] [seconds]` — headless sim performance benchmark.
- `npm run check-size` — after build: single file, ≤1.5 MB, no external references.
- `?playtest=1` — records each run on the device (`theabonk.playtest`, ≤20 runs/60 KB):
  damage by source, cause of death, picks, build, slide/jump time, boss attack hit rates.
  Export from the title / game-over screen. `npm run analyze-playtests -- <folder>` compares
  exports with the simulator and prints suggestions (never edits files).
- `?tune=1` — live tuning panel (F2 hides). Export → `npm run apply-tuning -- file.json`
  (validates + rewrites the generated block in src/config/tuning.ts);
  `npm run simulate -- 8 0.7 --tuning file.json` tests an export headlessly.
- E2E needs `npx playwright install chromium` once. On macOS it uses the real GPU via
  ANGLE/Metal; elsewhere SwiftShader (see tests/e2e/smoke.spec.ts for the one tolerated
  browser-internal compositor message).

## Architecture
```
src/
  core/      rng (seeded), math helpers, event ring buffer, safe storage
  config/    ALL tuning data (typed): tuning.ts (every feel/balance knob, ranges, defaults
             block), weapons, passives, enemies, waves, characters, evolutions, shop,
             achievements; balance.ts keeps structural constants only
  sim/       Pure game logic — NO three.js / DOM imports. Deterministic given seed + inputs.
             world.ts (state), pools.ts (SoA typed-array pools), spatialHash.ts, terrain.ts
             (+ walkability lattice `pass`), flowField.ts (enemy pathing), player.ts (momentum movement), enemyAI.ts, director.ts (waves/bosses), combat.ts,
             weapons/*.ts (one behavior fn per weapon behavior), pickups.ts, leveling.ts,
             upgrades.ts, shrines.ts, sim.ts (fixed-step orchestration), bot.ts (AI player)
  render/    three.js only reads sim state: instanced meshes per enemy/projectile kind, gems,
             particles, terrain/props, camera rig, damage numbers (2D canvas overlay),
             occlusion.ts (GPU dithered fade of props between camera and player)
  audio/     Web Audio synth SFX + procedural music
  input/     keyboard/mouse/pointer-lock/gamepad (+ drag-look fallback in iframes)
  ui/        DOM screens (title, select, shop, settings, pause, level-up, chest, game over),
             HUD, procedural canvas icons, menu focus navigation
  meta/      save schema + migration, gold/achievements/unlocks
  game/      Game.ts — app state machine + fixed-timestep loop (60 Hz sim, interpolated render)
  audio/     Audio.ts (synth SFX), Music.ts (sequencer), bindAudio.ts (events → sounds)
scripts/     simulate.ts (balance), bench.ts (perf)
tests/       unit/ (Vitest), e2e/ (Playwright)
```
Flow: main.ts → Game (owns SaveManager, GameRenderer, InputManager, UI/Menus) → per frame:
input.poll → N × sim.step(world, input) → audio/fx consume world.events → renderer.renderGame
→ HUD update → react to world.state (levelup/chest/dead/won). World state `levelup`/`chest`
freezes the sim until the UI resolves it (`resolveLevelUp`, `closeChest`).
Key rules:
- Sim runs at fixed 60 Hz (`DT`), render interpolates `prev → cur` with alpha.
- No allocation in hot loops: pools are SoA typed arrays; enemies are compacted at end of tick;
  references between entities use `uid`, never raw indices.
- Sim → render/audio communication is the `EventBuffer` (typed-array ring), drained each frame.
- Adding a weapon = add a `WeaponDef` in `config/weapons.ts` (+ optional evolution) and, if it
  needs new behavior, one function in `sim/weapons/` registered in `sim/weapons/index.ts`.
- Use `world.rng` (seeded) for anything gameplay-affecting; `Math.random` only for cosmetic FX.
- Feel/balance numbers live in `config/tuning.ts`. Sim code reads the run's copy `w.tuning`
  (never `TUNING_DEFAULTS` directly) and applies it at use time so live panel edits take
  effect immediately; the camera reads `rig.tuning`. Runs with changed tuning are flagged
  `w.options.tuned` and never touch the save.
- localStorage access only through `core/storage.ts` (try/catch, in-memory fallback).

## Performance notes
- `npx tsx scripts/bench.ts 1000 20` — headless sim benchmark (stress mode keeps N enemies +
  0.4·N piercing projectiles alive). Baseline: ~0.3 ms/tick at 1000 enemies + ~450 projectiles.
- In-browser: `?stress=1000` then F3. ~50 draw calls, ~1.3 ms/frame CPU+GPU on an M-series Mac.
- Hot loops avoid calls with double arguments (V8 boxes them when not inlined): use
  `terrain.heightAt` (cached bilinear) not `height()` for non-player entities, walk
  `grid.cellStart/items` inline or use `queryCells` (integer args), and write instance
  transforms via the `TRS` scratch + `writeTRSFrom(array, offset)`.
- `updateEnemies` is at V8's inlining budget: new per-enemy logic goes in a small helper
  taking only ints/objects (doubles via typed scratch, see `flowSteer`/`walkerStep`). Adding
  it inline made V8 stop inlining `resolveColliders` etc. → boxed doubles, 4× GC, +60% tick.
- Flow field: ≈0.1 ms/tick at 1000 enemies (incremental Dial build, 9000 nodes/tick budget).
- Instanced attribute uploads use `uploadPrefix` (only the used prefix, no per-frame range
  object allocation).

## Balance notes
`npm run simulate -- 16 0.7` (16 seeds/hero, bot skill 0.7 ≈ "decent player", no meta):
Thea ~12:35, Pip ~11:30, Brindle ~15:00 average survival (overall ~13:00); ~25% first-run
wins. Deaths
cluster at the boss gates (5:00 Grumblecap, 10:00 Clockjaw, 15:00+ Regent). Skill 0.45 →
~11:10, 0.9 → ~13:10. Main knobs: wave
`rate/minAlive/maxAlive` (waves.ts), boss hp/projectileDamage (enemies.ts + bosses.ts),
`tuning.combat.*` (i-frames, level heal, drops, HP/damage scaling) and `tuning.spawns.*`.
The bot (sim/bot.ts) kites, dodges shots predictively, sidesteps telegraphed charges,
hops shockwave rings, un-sticks itself, and (since the upgrade) slides for travel/downhill,
chains slide boosts, bunny-hops on open ground, escapes encirclements through the widest
gap and climbs ramps to plateau shrines. `new Bot(seed, skill, false)` = the v1 bot (used by
the golden "sim" fingerprints). Damage sources: sim/sources.ts codes passed to
`damagePlayer(w, raw, source, inst)`; boss attacks call `beginAttack()` for used/hit counts.

## Gotchas
- `Terrain.height()` is exact (player physics); `heightAt()` is the cached approximation.
- Enemy pool is compacted at end of tick → never keep raw indices across ticks (use uid).
- Bosses live in the enemy pool (`behavior: 'boss'`); `director.bossUid` tracks the latest.
- Pathing: `terrain.pass` (1-unit lattice = hcache, 8-bit masks) treats plateau/ramp edges
  taller than `WALL_STEP` as walls both ways (ramp↔plateau joins use `JOIN_STEP`). Walkers
  follow `w.flow` when the path is much longer than the straight line, have wall-crossing
  steps undone, and use `heightOnLevel` (no riding up walls). Flyers (`FLYING` in combat.ts)
  and bosses are exempt. `spawnEnemy` snaps ground spawns to reachable cells and returns -1
  when there is none within 6 units. Player on an unreachable island → `flow.island` and
  everyone chases directly.
- Prop materials patched by `fadeProps` need `OCCLUSION_UNIFORMS` set each frame (Renderer
  does it); `uFocus` far away in menus disables the fade. The player's ghost silhouette
  (`GreaterDepth`) renders before the player mesh (renderOrder 1 → 2).
- AudioContext is created only inside a user-gesture handler (no autoplay warnings).
- Icon canvases use `willReadFrequently` so `toDataURL` doesn't trigger GPU readbacks.

## Upgrade branch (`theabonk-upgrade`)
Plan: phases 0–14 (safety nets → tuning → playtest/bot → pathing/camera → maps/Rimewood →
content → input/accessibility → gamepads → touch → visuals → audio → bench/low tier → CI →
balance → screenshots/handoff). Baselines in docs/BASELINES.md. Guards: `npm run check-size`
(≤1.5 MB, single file, no external refs), golden determinism test (update hashes only for
intentional sim changes), storage budget test (<100 KB across all `theabonk.*` keys).
Benchmarks are load-sensitive: compare A/B against a `main` worktree.
- [x] 0. Safety nets
- [x] 1. Tuning file + live panel + apply-tuning
- [x] 2. Playtest recording, damage sources, analyze-playtests, sliding bot
- [x] 3. Flow-field pathing + camera occlusion fade / player silhouette

## Phase plan / status (v1)
1. [x] Scaffold, single-file build, 3D scene, player movement + camera
2. [x] Enemies, spawning, collision, HP, death
3. [x] Weapons, XP, leveling, upgrade picker
4. [x] Full weapon/item roster, evolutions, chests, shrines
5. [x] Bosses, 20-minute waves, win/lose flow
6. [x] Menus, characters, meta-progression, save system
7. [x] Audio, juice, polish, settings
8. [x] Performance pass (1000-enemy stress test)
9. [x] Unit tests + Playwright smoke test
10. [x] Balance pass with simulated runs
