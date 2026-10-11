# TheaBonk — agent notes

3D low-poly survivors-like roguelite. Vite + TypeScript (strict) + Three.js, fully client-side,
single-file build. All art is procedural geometry, all audio is Web Audio synthesis — never add
asset files, CDN links or web fonts.

## Commands
- `npm run dev` — dev server (http://localhost:5173). URL params: `?seed=123`, `?debug=1`
  (debug hotkeys), `?stress=1000` (stress test: keeps N enemies alive, player invulnerable).
- `npm run build` — typecheck + single-file build → `dist/index.html` (works from file:// and in a
  sandboxed iframe).
- `npm test` — Vitest unit tests (`tests/unit`).
- `npm run test:e2e` — Playwright smoke tests (`tests/e2e`), builds first via webServer config.
- `npm run simulate` — headless balance simulation (bot plays full runs per character).

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
  input/     keyboard/mouse/pointer-lock/gamepad → InputState
  ui/        DOM screens (title, select, shop, settings, pause, level-up, chest, game over),
             HUD, procedural canvas icons, menu focus navigation
  meta/      save schema + migration, gold/achievements/unlocks
  game/      Game.ts — app state machine + fixed-timestep loop (60 Hz sim, interpolated render)
```
Key rules:
- Sim runs at fixed 60 Hz (`DT`), render interpolates `prev → cur` with alpha.
- No allocation in hot loops: pools are SoA typed arrays; enemies are compacted at end of tick;
  references between entities use `uid`, never raw indices.
- Sim → render/audio communication is the `EventBuffer` (typed-array ring), drained each frame.
- Adding a weapon = add a `WeaponDef` in `config/weapons.ts` (+ optional evolution) and, if it
  needs new behavior, one function in `sim/weapons/` registered in `sim/weapons/index.ts`.
- Use `world.rng` (seeded) for anything gameplay-affecting; `Math.random` only for cosmetic FX.
- localStorage access only through `core/storage.ts` (try/catch, in-memory fallback).

## Phase plan / status
1. [x] Scaffold, single-file build, 3D scene, player movement + camera
2. [x] Enemies, spawning, collision, HP, death
3. [x] Weapons, XP, leveling, upgrade picker
4. [ ] Full weapon/item roster, evolutions, chests, shrines
5. [ ] Bosses, 20-minute waves, win/lose flow
6. [ ] Menus, characters, meta-progression, save system
7. [ ] Audio, juice, polish, settings
8. [ ] Performance pass (1000-enemy stress test)
9. [ ] Unit tests + Playwright smoke test
10. [ ] Balance pass with simulated runs
