# TheaBonk — agent notes

3D low-poly survivors-like roguelite. Vite + TypeScript (strict) + Three.js, fully client-side,
single-file build. All art is procedural geometry, all audio is Web Audio synthesis — never add
asset files, CDN links or web fonts.

## Commands
- `npm run dev` — dev server (http://localhost:5173). URL params: `?seed=123` (fixed run
  seed), `?map=rimewood` (force a map), `?stress=1000` (stress test: keeps N enemies +
  0.4·N projectiles alive, player invulnerable). F3 toggles the debug overlay. `window.__theabonk` is the Game instance
  (`advance(seconds)` steps frames synchronously — handy when rAF is throttled).
- `npm run build` — typecheck + single-file build → `dist/index.html` (works from file:// and in a
  sandboxed iframe).
- `npm test` — Vitest unit tests (`tests/unit`).
- `npm run test:e2e` — Playwright smoke tests (`tests/e2e`), builds + serves on a dedicated port
  (47413, `E2E_PORT` overrides; never reuses a foreign server).
- `npm run simulate -- [seeds] [skill] [--map rimewood]` — headless balance simulation (bot
  plays full runs per character). `VERBOSE=1` prints every run.
- `npm run bench -- [enemies] [seconds] [--map rimewood]` — headless sim performance benchmark
  (also prints CPU ms/tick, steadier than wall time on a busy machine).
- `npm run check-size` — after build: single file, ≤1.5 MB, no external references.
- `npm run audio-report` — builds, renders every sound + song offline (OfflineAudioContext in
  headless Chromium, through the real mix chain) and prints loudness / peaks vs the targets
  in src/audio/mix.ts; exits 1 if anything is out of range or clips. `--json` for raw rows.
  tests/e2e/audio.spec.ts runs the same check.
- `?playtest=1` — records each run on the device (`theabonk.playtest`, ≤20 runs/60 KB):
  damage by source, cause of death, picks, build, slide/jump time, boss attack hit rates.
  Export from the title / game-over screen. `npm run analyze-playtests -- <folder>` compares
  exports with the simulator and prints suggestions (never edits files).
- `?bench=1` — performance test (also Settings → Performance → Test…): fixed seed, bot-played
  invulnerable Thea, 800-enemy horde (Tablet ×0.65), final boss at 20 s, orbiting camera,
  3 s warm-up. Params `seconds`, `quality`, `map`, `enemies`. Result card (Copy) +
  `window.__benchResult`; never touches the save. `npm run bench-browser -- [seconds]
  [profile…]` runs the headless matrix (native tiers, SwiftShader, 4× CPU throttle, tablet,
  1000-enemy stress on both maps). Logic in src/game/benchmark.ts (budgets per tier).
- `?quality=low|medium|high|tablet` forces a render tier for the session (not saved). Auto
  quality = Tablet on touch devices, else `tierForGpu(gpuName)` (software / old Intel → Low,
  Iris / Radeon iGPU / mobile → Medium, else High).
- `?tune=1` — live tuning panel (F2 hides). Export → `npm run apply-tuning -- file.json`
  (validates + rewrites the generated block in src/config/tuning.ts);
  `npm run simulate -- 8 0.7 --tuning file.json` tests an export headlessly.
- E2E needs `npx playwright install chromium firefox webkit` once. Projects: chromium,
  firefox (desktop specs) and webkit-tablet, webkit-phone, chromium-tablet (tests/e2e/
  touch.spec.ts only — synthetic touch Pointer Events drive the on-screen controls). On
  macOS Chromium uses the real GPU via ANGLE/Metal; elsewhere SwiftShader. Tolerated
  browser-internal notices (never game errors) are listed in tests/e2e/smoke.spec.ts:
  SwiftShader's ReadPixels stall, Firefox's "implementation-defined" shadow filtering note
  and headless Firefox refusing pointer lock. `npx playwright test --project=firefox`.

## Architecture
```
src/
  core/      rng (seeded), math helpers, event ring buffer, safe storage
  config/    ALL tuning data (typed): tuning.ts (every feel/balance knob, ranges, defaults
             block), maps.ts (MapDef per map), difficulty.ts (Relaxed/Normal/Hard + tiers →
             RunMods), weapons, passives, enemies (+ bestiary.ts notes), waves, characters
             (with signature passives), evolutions, shop, achievements; balance.ts keeps
             structural constants only
  sim/       Pure game logic — NO three.js / DOM imports. Deterministic given seed + inputs.
             world.ts (state), pools.ts (SoA typed-array pools), spatialHash.ts, terrain.ts
             (+ walkability lattice `pass`, ice/snow `surface`), flowField.ts (enemy
             pathing), weather.ts (icicles, gusts, blizzard wind), heroes.ts (signature
             passives), player.ts (momentum movement), enemyAI.ts, director.ts (waves/bosses), combat.ts,
             weapons/*.ts (one behavior fn per weapon behavior), pickups.ts, leveling.ts,
             upgrades.ts, shrines.ts, sim.ts (fixed-step orchestration), bot.ts (AI player)
  render/    three.js only reads sim state: instanced meshes per enemy/projectile kind, gems,
             particles, terrain/props, camera rig, damage numbers (2D canvas overlay),
             occlusion.ts (GPU dithered fade of props between camera and player),
             Sky.ts (per-map moods + aurora), Snowfall.ts, Bloom.ts (Medium / High),
             flash.ts (≤ 3 Hz blink helper), Particles (chunks, stretched sparks, puffs)
  audio/     Web Audio synth SFX + procedural music
  input/     InputManager (the ONE keyboard listener: routes keys to the open menu via
             ui.handleKey, else to gameplay through remappable bindings), actions.ts
             (GameAction bindings, labels, conflicts), gamepad.ts (raw → standard layout,
             learned calibration, last-used pad, rumble), touch.ts (twin-stick on-screen
             controls), mouse/pointer-lock
  ui/        DOM screens (title, select, shop, settings, pause, level-up, chest, game over),
             HUD, procedural canvas icons, menu focus navigation
  meta/      save schema + migration, gold/achievements/unlocks, daily.ts (UTC date →
             seed/map/hero), playtest.ts
  game/      Game.ts — app state machine + fixed-timestep loop (60 Hz sim, interpolated render)
  audio/     Audio.ts (synth SFX; build(ctx) works on live or offline contexts; master chain
             glue compressor → limiter → soft clip at −1 dBFS), Music.ts (named songs, layered
             by intensity), mix.ts (per-sound gain trims, categories, loudness targets),
             report.ts (offline measurements), bindAudio.ts (events → sounds, song choice)
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
- Maps are data (`config/maps.ts`): terrain spec, props, palette, sky, hazards, waves/events,
  `variants` (base enemy → map variant; summons go through `variantOf`), `finalBoss`, music,
  banners, unlock rule. Sim reads `w.map`; Renderer.setTerrain(t, map) caches by map+seed.
  Map hazards use `w.hazardRng` only, so adding hazards never shifts the main stream.
- Difficulty lives in `w.mods` (RunMods from config/difficulty.ts), applied where it matters
  (spawnEnemy HP, damagePlayer, speedMul, director rate/maxAlive/elites, heal, hearts, boss
  enrage, gold) — never folded into `w.tuning`, so tuning exports stay clean.
- Hero passives: CharacterDef.passive.id → `p.passive` code (HeroPassive); checks are integer
  compares (Thea landing bonk, Brindle shell guard in damagePlayer, Bramble thorns in
  enemyContacts, Ottie bowling in updateHero, Nova's 4 cards in rollChoices).
- Level-up charges: `p.rerolls / p.skips / p.banishes` (BASE_STATS.skip = 1 free per run;
  shop ranks + Relaxed add). `w.banished` filters upgradeCandidates for the rest of the run.
- Daily runs: Game.startDaily → Normal, no shop bonuses / unlocked weapons; the day's hero
  and map are playable even if locked. Records: best per date, newest 30 (`save.daily`).
- Enemy data fields replace id checks: `model` (variants reuse a base model + `frostTrim`),
  `flying`, `bob`, `chill`, `roll`, `shotVisual`; bosses by `bossPattern`.
- Flash safety: every blink / pulse goes through `render/flash.ts` (≤ 3 Hz, registered in
  FLASH_EFFECTS — a test samples each; steady with reduced motion). Don't add raw
  `Math.sin(time * k) > 0` blinks.
- Accessibility (settings.access): reduced motion (auto/on/off → rig, PlayerView, flash
  helper, CSS `html.reduced-motion`), colour-blind (Okabe-Ito warnings/gems + gem shapes),
  larger text (`html.large-text` = 125% rem), high contrast. Warning circles always carry a
  per-attack pattern + outline (telegraphBasic) and a "!" marker; so do wind-ups.
- Remapping: settings.controls.bindings (Escape / F3 fixed; menus also always take arrows,
  Enter, Escape, gamepad A/B/d-pad). Slide toggle and hold-to-hop (`SimInput.autoHop` → no
  bunny-hop bonus) are options.
- Gamepads are always read through `normalizePad` (standard layout): recorded raw layouts
  (Firefox PlayStation pads, xpad Xbox) are replayed by tests/unit/gamepad.test.ts from
  tests/fixtures/gamepads.json — add a recording there when supporting a new controller.
  Check Xbox ids before PlayStation ("Xbox Wireless Controller" vs DS4 "Wireless Controller").
- Pointer lock asks for raw input (unadjustedMovement) and falls back to a plain lock; if
  lock never works in a session (pointerlockerror before any success) look switches to drag.
- Touch: `html.touch` (coarse pointer or first touch) shows the on-screen controls during
  runs, enlarges tap targets, and hides the speedometer; portrait shows the rotate hint and
  pauses. Quality 'auto' = Tablet on touch devices, High elsewhere. The tablet tier renders
  lighter (DPR 1, no shadows, thinned decoration) and its runs field ~65% of the Gloom with
  HP / XP / coins ×1/0.65 (`mods.crowd / crowdHp / enemyXp / coinValue`; bosses untouched).
- The last BOSS_RESERVE enemy-pool slots are bosses-only (a packed field never blocks one).
- Bloom (Medium / High only): the scene renders to the screen as usual (native MSAA, tone
  mapping, in-material hit flashes), then the frame is copied (`copyFramebufferToTexture`),
  bright parts are blurred at 1/4 and 1/8 res and added back. Threshold is per map
  (`sky.bloomThreshold`, higher on snow). ≈2 ms at 2.5 MP on an M-series GPU. Renderer
  resets `renderer.info` once per frame so draw-call counts include every pass.
- Feel: level-up has a short hit-stop before the picker (`levelUpAt`), evolution swings the
  camera (`rig.orbit`, sim held while it plays; skipped with reduced motion), bosses get an
  intro card + phase ticks / enrage cue on the bar (EnemyDef `epithet`, `phases`, `enrageAt`),
  enemies squash on hit and burst per `deathFx`, damage numbers merge per target.
- Audio: every sound plays at its MIX gain trim (set from the audio report: re-run it after
  adding or changing a sound and adjust the trim until it's inside its category window).
  New SFX names are appended to SFX_NAMES (ids are indices). Songs: runA/B/C (Meadow, dusk →
  deep night → before dawn), rimeA/B/C (Rimewood, bells), boss / rimeBoss (mid-bosses),
  final / oldRime (final bosses), menu, collection — chosen per frame in bindAudio.
- Interface scale: root font = `--ui-base` (16 / 13 / 11 px by screen height) × `--ui-scale`
  (Larger text). Use rem everywhere.
- localStorage access only through `core/storage.ts` (try/catch, in-memory fallback).
  Save v2 (`meta/save.ts`): older saves are migrated in sanitizeSave and copied once to
  `theabonk.save.bak` just before the first write in the new format. v2 adds maps, difficulty
  + tiers, per-map/difficulty stats, daily records, collection (keeps unknown ids, capped).
  Game runs checkAchievements at startup so unlocks earned by past progress apply at once.

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
- Warning circles / shockwaves use `alphaBasic` with a per-map style: additive glow on dark
  ground, solid see-through colour on bright ground (`palette.telegraphs: 'solid'`, snow) —
  additive white-on-white vanishes.
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
- [x] 4. Map system (MapDef) + Rimewood (ice, drifts, icicles, gusts, variants, Old Rime),
  save v2 with backup, map picker
- [x] 5. Difficulty + Hard tiers, Ottie / Bramble / Nova + signature passives for all six,
  skip (1 free) / banish / reroll charges, daily run, collection (bestiary 3D preview),
  15 achievements
- [x] 6. One input system + remapping, slide toggle / hold-to-hop, flash safety (3 Hz),
  reduced motion, colour-blind palette + patterned telegraphs + "!" markers, larger text,
  high contrast
- [x] 7. Gamepad layer (standard + raw layouts, calibration, last-used), controller test +
  quick setup, rumble, raw-input pointer lock + fallback, 125%/150% scaling e2e, Firefox e2e
- [x] 8. Touch twin-stick controls, touch-sized menus, rotate hint, safe areas, Relaxed
  preselected on touch, Tablet tier (render + crowd), boss slots reserved, WebKit e2e
- [x] 9. Feel + visuals: hit squash, per-enemy defeat bursts, sparks / puffs, merged damage
  numbers, level-up hit-stop + light pillar, evolution card (A + B → C) + camera swing,
  stronger-looking weapons, gem trails, boss intro cards + phase ticks + enrage, bloom
- [x] 10. Audio: song sets (3 run songs per map, boss / final themes incl. Old Rime, menu,
  collection), new SFX (icicle, gust, shatter, bonk), pentatonic gem chimes, gain table +
  −1 dBFS limiter, offline audio report + test
- [x] 11. Benchmark (`?bench=1`, Settings → Test…, result card, bench-browser matrix), Low
  tier (no decor, 0.72× fog + 150 far plane with the sky scaled to fit), GPU-based auto quality

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
