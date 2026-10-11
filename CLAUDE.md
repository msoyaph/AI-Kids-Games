# Vanex Defense — notes for Claude

Elemental tower defense, being retargeted to ages 10–14 ("Crystal-Tech Fantasy", branch `vanex-upgrade`). Vite 8 + TypeScript (strict) + PixiJS 8. Ships as ONE self-contained
`dist/index.html` (vite-plugin-singlefile) for the Ai Kids Games site (sandboxed iframe, zero network requests).
Original IP: no Element TD names/assets. All art is Canvas2D code baked to atlases; all audio is Web Audio synthesis.

## Commands
- `npm run dev` — dev server (port from `$PORT`, default 5173). `.claude/launch.json` has `vanex-dev` (autoPort).
- `npm run build` — typecheck + single-file build → `dist/index.html` (~830 KB, ~250 KB gzip).
- `npm test` — Vitest (`tests/unit`, ~15 s incl. headless balance sims in `tests/unit/balance/`, one file per world).
- `npm run e2e` — build + Playwright (`tests/e2e`; projects desktop / phone-landscape / phone-portrait / tablet;
  served by `vite preview` on :4317; `reducedMotion: 'reduce'` because pulsing buttons are never "stable").
- `npm run sim [-- w2m1 hard] [-- --casual]` — autoplay bot over maps × difficulties (vite-node).
- `npm run perf` — `scripts/perf.mjs`: boot + `?stress=300` frame times on throttled profiles → `perf-results/`.
  Uses `channel: 'chromium'` for the REAL GPU; Playwright's default headless shell is SwiftShader (software GL).
- `npm run check:dist` — file:// smoke check (no console errors / external requests).
- Dev tools: `scripts/shot.mjs <url> <out.png> [w h setup.js waitMs --touch]` (screenshots; the in-app browser pane
  throttles rAF to ~3 fps, so use this for visual checks), `scripts/cpuprofile.mjs [throttle secs]` (top self-time
  functions on the built game), `scripts/simdebug.ts` (per-wave bot trace), `scripts/simmap.ts` (ASCII of bot maze),
  `scripts/render-svg.mjs <dir>` (marketing SVG → PNG).
- URL flags: `?map=<id>&diff=<d>[&endless]`, `?seed=N`, `?stress=N`, `?quality=low|medium|high|auto`;
  DEV only: `?editor=1`, `?gallery=1`. Dev exposes `window.__vanex` ({stage, atlas, app}) and `window.__game`.
  All builds expose read-only `window.__vanexTest` (state + cellCenter) while a game screen is active.

## Architecture
- `src/core` — `Rng` (sfc32, `hashString`), math, `Pool` + `swapRemove`.
- `src/data/tuning.ts` — **every balance number** (economy, combat constants, projectile speeds, wave curves,
  difficulties, stars, tower levels via `makeLevels`, enemy stats). Data modules keep identity/looks only.
- `src/i18n` — `t(key, vars)` (plural objects via Intl.PluralRules, numbers via Intl.NumberFormat, English
  fallback), `en.ts` = source of truth for player text (flat keys `tower.arrow.name`), `localized()` defines
  translated getters on data objects (`TOWERS.x.name` reads the current language), `pseudo.ts`, `detectLocale`.
  `?lang=en|fil|pseudo` test hook. Never hard-code player-facing text; add a key to `en.ts`.
- `src/data` — content as typed data: `elements.ts` (wheel Fire→Nature→Water→Fire, Light→Shadow→Earth→Light;
  1.6×/0.6×), `towers.ts` (2 basic + 6 element + 15 combo, `makeLevels` → 4 levels; behaviours bullet/chain/beam/
  pulse/mortar + ability fields), `enemies.ts` (hp is wave-1 strength, bosses too), `waves.ts` (seeded generator,
  cycles of 10, boss every 10th, `hpScale`/`coinScale`/`waveClearBonus`/`CRYSTAL_WAVES`), `difficulty.ts`
  (`hpEarly`→`hp` ramp by wave 20), `maps/` (ASCII grids, legend in `maps/types.ts`), `worlds.ts`,
  `achievements.ts` (28, `live` ones checked during play), `strings.ts`.
- `src/sim` — headless, no DOM/Pixi. `Game.ts` (fixed 30 Hz `step()`; waves, movement, statuses, damage, towers,
  projectiles, zones, economy, build/sell/upgrade, block check `wouldKeepPath`), `flowField.ts` (octile Dijkstra,
  no corner cutting, escape pointers for blocked cells), `grid.ts`, `spatial.ts` (hash rebuilt before AND after
  enemy movement — indices go stale after compaction), `events.ts` (ring buffer of reusable events), `entities.ts`,
  `autoplay.ts` (bot: counter elements, spawn-side serpentine wall plan, power-per-coin spending).
- `src/render` — `Stage.ts` (WebGL→Canvas fallback, DPR≤2, Pixi ticker's own render REMOVED: `App.frame` renders
  with its own 60 FPS cap because Pixi `maxFPS` truncation drops frames at 60 Hz; `requestRender()` via rAF for idle),
  `WorldView.ts` (render groups on world + busy layers; per-slot sprite views; event → FX), `Particles.ts`
  (zero-alloc: `begin()` scratch opts → `emit()`), `FloatingText.ts` (BitmapText pool), `Camera.ts`, `MapPainter.ts`,
  `quality.ts` (tiers + `FpsGovernor`), `atlas/` (packer, bake, draw*.ts, paint.ts). Particle textures live on their
  own atlas page (ParticleContainer needs one texture source).
- `src/ui` — DOM overlay (system fonts only): `Hud.ts` (diffed per-frame updates, drawer pinned on tall screens,
  slide-up + Build FAB on short ones), `modals.ts` (Pip), `styles.css`.
- `src/app` — `App.ts` (screens, ticker, quality), `GameScreen.ts` (loop, input, modals, touch ✓/✕ confirm),
  `flow.ts` (navigation, unlock rules, briefing, endless, run bookkeeping), `tutorial.ts`, `achievements.ts`,
  `save.ts` (versioned + migrations, try/catch, in-memory fallback), `stress.ts`, `screens/`.
- `src/audio` — `Audio.ts` (SFX, rate limits, unlock on gesture incl. iOS touchend), `music.ts` (lookahead sequencer).

## Rules
- Never allocate in sim/render hot loops (pools, swap-remove, cached strings/textures, scratch objects).
- No external assets / fonts / network. Only widely supported emoji in UI text (no Unicode 14+ glyphs).
- localStorage only via `SaveStore`. Bump `SAVE_VERSION` + add a migration when the save shape changes.
  Save v4 (keys: `vanex-defense-save`, one-time `vanex-defense-save-backup` of the pre-upgrade save) holds
  settings (language, textScale, highContrast, reducedMotion, hotkeys), research, hero, daily, workshop (≤10),
  codexSeen, per-map medals. `trimSave` keeps it in budget (test: worst case < 50 KB of the 200 KB budget).
- Kid-friendly copy: short sentences, "poof" not "kill".
- After balance changes run `npm run sim` (and `-- --casual`): good bot must win all 36 runs; casual bot must get
  3★ on every Easy map (enforced by tests).

## Upgrade (branch `vanex-upgrade`, plan in the approved plan; `main` = v1 for ages 7+)
- Step 1 (style slice on `w1m1` Breach Point) done → `docs/style-guide.md`, `docs/screenshots/{before,slice}/`.
  Approved 2026-10-11. Battle map, towers, constructs, FX, HUD, tower panel and title are restyled; other
  screens/text (briefing, codex, tutorial, element picker, world maps 2–4, badges screen) are still v1 → Phase 3.
- Phase 2 done: `tuning.ts`, i18n core (data text moved to `en.ts`), save v4 + v3-fixture migration test.
- Phase 3 done: every screen restyled (codex with real per-level stats via `src/ui/statTables.ts`, hex badge
  insignia, sectioned settings, dark element picker), ALL UI text in `en.ts` (PIP tutorial, briefings, HUD,
  battle labels), connected story for worlds 1–4 (Reach → Wastes → Frostspire → Hollow Deep / Archon Null).
- Phase 4 done: 42 specializations (`TUNING.specs` = mul/add/set mods on base L3/L4 via `applySpec`;
  `TowerDef.specs`, `Tower.spec`, `statsFor`, `Game.needsSpec/upgrade(t, spec)`; new stats detect/bossMult/
  airMult/wardBreak), spec head silhouettes (`SpecLook` lance/array/bastion/halo/flare, textures
  `th_<id>_<lv>_s<0|1>`), spec chooser in the tower panel (keys 1/2), after-match report (`src/ui/results.ts`;
  RunStats coinsSpent/leaksByWave/specsChosen/soldTowers), wave intel modal (`waveIntel`, key I), construct
  traits with icons (`src/data/traits.ts`, `src/ui/traitIcons.ts`). Bot picks the stronger path (`bestSpec`).
- Phase 5 done: new constructs bulwark (barrier), phantom (cloak; detectors = Focus Lens, Fog Bank, Solar
  Lance, Corona), borer (tunnels, untargetable while burrowed, `surface()`), jammer (static burst disables towers,
  `Tower.disabled`), hulk (regen, blocked by burn/poison) + resistant groups (`SpawnGroup.resist`, ×0.5).
  `TUNING.waves.mechanics` introduces them world by world. Bosses have 3 phases (`TUNING.enemies.*.phases`):
  telegraphed attacks (`Ev.Warn` → red ring + windup, boss stands still; brood/swarm/stomp/nullfield),
  `Ev.BossPhase` banner, boss bar pips. Summons never start within 5 tiles of the Citadel.
  Balance: w4m3 Hard is the tight spot (bot wins with 1 life; `TUNING.economy.mapStartCoins.w4m3 = 200`).
- New art helpers: `src/render/atlas/tech.ts` (TECH palette, chamfers, facets, crystals, rune rings, energy cores).
  Tower/enemy names changed, ids did not. `src/data/stats.ts` = stat rows + DPS for the HUD/codex.
- Upgrade rules: kid-safe (no gore/horror/ads/IAP/tracking/network); keep `vanex-defense-save`, new keys use the
  `vanex-defense-` prefix, total save < 200 KB; v3 save fixture in `tests/fixtures/save-v3.json` must migrate.

## Status (v1 on main)
All 10 phases done: scaffold, grid/pathing, towers/economy, elements/combos, waves/bosses, campaign/endless,
tutorial/book/badges/settings/editor, audio/polish, perf pass, tests/balance/docs. 157 unit tests + 33 E2E pass.
Perf (`npm run perf`): 60 fps on 4×-throttled phone profile with 300 creatures / ~440 shots.
