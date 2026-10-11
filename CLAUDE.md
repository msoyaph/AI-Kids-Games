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
- `npm run test:e2e` — Playwright smoke tests (`tests/e2e`), builds first via webServer config.
- `npm run simulate -- [seeds] [skill]` — headless balance simulation (bot plays full runs
  per character). `VERBOSE=1` prints every run.
- `npm run bench -- [enemies] [seconds]` — headless sim performance benchmark.
- E2E needs `npx playwright install chromium` once. On macOS it uses the real GPU via
  ANGLE/Metal; elsewhere SwiftShader (see tests/e2e/smoke.spec.ts for the one tolerated
  browser-internal compositor message).

## Architecture
```
src/
  core/      rng (seeded), math helpers, event ring buffer, safe storage
  config/    ALL tuning data (typed): weapons, passives, enemies, waves, characters, evolutions,
             shop, achievements, balance constants
  sim/       Pure game logic — NO three.js / DOM imports. Deterministic given seed + inputs.
             world.ts (state), pools.ts (SoA typed-array pools), spatialHash.ts, terrain.ts,
             player.ts (momentum movement), enemyAI.ts, director.ts (waves/bosses), combat.ts,
             weapons/*.ts (one behavior fn per weapon behavior), pickups.ts, leveling.ts,
             upgrades.ts, shrines.ts, sim.ts (fixed-step orchestration), bot.ts (AI player)
  render/    three.js only reads sim state: instanced meshes per enemy/projectile kind, gems,
             particles, terrain/props, camera rig, damage numbers (2D canvas overlay)
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
- localStorage access only through `core/storage.ts` (try/catch, in-memory fallback).

## Performance notes
- `npx tsx scripts/bench.ts 1000 20` — headless sim benchmark (stress mode keeps N enemies +
  0.4·N piercing projectiles alive). Baseline: ~0.3 ms/tick at 1000 enemies + ~450 projectiles.
- In-browser: `?stress=1000` then F3. ~50 draw calls, ~1.3 ms/frame CPU+GPU on an M-series Mac.
- Hot loops avoid calls with double arguments (V8 boxes them when not inlined): use
  `terrain.heightAt` (cached bilinear) not `height()` for non-player entities, walk
  `grid.cellStart/items` inline or use `queryCells` (integer args), and write instance
  transforms via the `TRS` scratch + `writeTRSFrom(array, offset)`.
- Instanced attribute uploads use `uploadPrefix` (only the used prefix, no per-frame range
  object allocation).

## Balance notes
`npm run simulate -- 16 0.7` (16 seeds/hero, bot skill 0.7 ≈ "decent player", no meta):
Thea ~12:35, Pip ~11:30, Brindle ~15:00 average survival (overall ~13:00); ~25% first-run
wins. Deaths
cluster at the boss gates (5:00 Grumblecap, 10:00 Clockjaw, 15:00+ Regent). Skill 0.45 →
~11:10, 0.9 → ~13:10. Main knobs: `enemyHpScale`/`enemyDamageScale` (balance.ts), wave
`rate/minAlive/maxAlive` (waves.ts), boss hp/projectileDamage (enemies.ts + bosses.ts),
`PLAYER_IFRAMES`, `LEVEL_HEAL` (leveling.ts), heart drop chance.
The bot (sim/bot.ts) kites, dodges shots predictively, sidesteps telegraphed charges,
hops shockwave rings and un-sticks itself; it never slides, so humans can do better.

## Gotchas
- `Terrain.height()` is exact (player physics); `heightAt()` is the cached approximation.
- Enemy pool is compacted at end of tick → never keep raw indices across ticks (use uid).
- Bosses live in the enemy pool (`behavior: 'boss'`); `director.bossUid` tracks the latest.
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
