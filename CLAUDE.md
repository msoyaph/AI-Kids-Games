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
- `npm run check:dist` — smoke check of dist via file:// AND a tiny http server, in full Chromium (catches
  browser-initiated requests like /favicon.ico — index.html has an inline data-URI icon for that reason).
- `npm run analyze-playtests -- <folder>` — playtest exports vs bot runs → printed tuning suggestions (never applied);
  logic in `scripts/lib/playtests.ts` (unit-tested).
- `npm run audio:levels [-- --write]` — mixing pass (~2 min): Vite dev server + Chromium render every track /
  stinger / SFX offline, print peak + LUFS, `--write` regenerates `src/audio/mix.ts`. Re-run after audio changes.
- Dev tools: `scripts/shot.mjs <url> <out.png> [w h setup.js waitMs --touch]` (screenshots; the in-app browser pane
  throttles rAF to ~3 fps, so use this for visual checks), `scripts/cpuprofile.mjs [throttle secs]` (top self-time
  functions on the built game), `scripts/simdebug.ts` (per-wave bot trace), `scripts/simmap.ts` (ASCII of bot maze),
  `scripts/render-svg.mjs <dir>` (marketing SVG → PNG).
- URL flags: `?map=<id>&diff=<d>[&endless]`, `?seed=N`, `?stress=N`, `?quality=low|medium|high|auto`,
  `?lang=en|fil|pseudo`, `?flashaudit=1[&storm=1]` (per-frame luminance probe, `src/app/flashProbe.ts`), test hooks `?screen=worlds|encyclopedia|badges|settings|research|daily|workshop`, `?brief=<mapId>`;
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
- `src/audio` — `Audio.ts` (engine: buses, rate limits, unlock on gesture incl. iOS touchend, event → sound),
  `synth.ts` (`Synth` voices usable on live or Offline contexts, deterministic noise, `masterChain`),
  `music.ts` (tracks + boss themes, 3-layer lookahead sequencer), `sfx.ts` (`SFX`, `STINGERS` as data),
  `intensity.ts`, `mix.ts` (generated gains), `offline.ts` (level metering; script-only, never imported by the game).

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
- Phase 6 done: commander heroes (`src/data/heroes.ts`, `src/sim/hero.ts`): Kestrel (starter), Brakka, Vela
  (detects cloaked), Ivo (tower aura); walk on walkable/plate cells via `heroPath` (BFS, no corner cutting),
  never touch the flow field, step aside if a tower is built under them, level 1–5 from kills/damage, take
  contact damage, knocked out → respawn at `heroHome()`. Specials: rally/quake/mark/repair (`useHeroSpecial`).
  Commander abilities (`castAbility`): Crystal Meteor (delayed strike), Chrono Field (slow zone, look 'chrono'),
  Emergency Funds. Unlocks in `src/app/unlocks.ts` (meteor after the first secured sector; other heroes and
  abilities via research ids `hero.*` / `ability.*`). HUD command bar (keys H, Q, Z/X/C) with cooldown sweeps,
  targeting chip + preview ring, commander picker in the briefing, hero line in the report, one-time tip
  (`save.hints`). Bot runs have no hero unless `GameOptions.hero` is set. Dev: `__vanex.nav` / `mapById`.
- Phase 7 done: difficulties Story(`easy`)/Normal/Hard/Expert, every difficulty earns its own stars
  (`SaveStore.totalStars` sums; `TOTAL_STARS` = maps×3×4). Research (`TUNING.research`, `src/data/research.ts`,
  `ResearchScreen`): stars − spent, free full reset, `bonusesFrom()` → `GameOptions.bonuses` (discount, damage,
  range, refund, start gold, interest, cores, lives, ability cooldown, hero level; hero/ability unlocks).
  Challenge modifiers iron/pure/budget/nocombo/speed (`GameOptions.modifiers`, chips in the briefing) → medals in
  `save.maps[id].medals` (win on Normal+). Endless mutators (`TUNING.mutators`, one more every 10 waves,
  `Ev.Mutator`). Daily (`src/data/modes.ts` `dailyFor(date)`: seeded map + 1 modifier + 2 mutators, 30 waves,
  `dailyScore`, best in `save.daily`), `DailyScreen` (unlocks after the first secured sector). 10 new badges.
  Balance suites cover Story/Normal/Hard; Expert is report-only (`npm run sim -- expert`).
- Phase 8 done: worlds 5 Skyforge Ruins (theme `sky`) and 6 Rift Citadel (`rift`), 18 campaign maps.
  Legend (`maps/types.ts`): gate pairs P→Q / p→q (`grid.teleports`, flow-field teleport edges, `Ev.Teleport`),
  bridges H/h (`MapDef.events.bridgeWaves` flip `grid.bridgePhase`), sky lane Y+F (`grid.skyPath`, flyers follow
  it via `Enemy.lane`), U unstable / R rubble (`events.shiftWave`), up to two castles (`grid.castles`,
  `nearestCastle`). `grid.applyTerrain()` + `Game.afterTerrainChange()`; `wouldKeepPath` checks every future
  terrain state (`futureTerrain()`). Map tests validate all states. Bot: greedy mazing (no zig-zag plan) on
  gate maps and shifting ground; sky-lane flight cells. Overlay sprites for bridges/rubble/growth/gates.
- Phase 9 done: Map Workshop (`src/data/workshop.ts`, `src/sim/workshopCheck.ts`, `WorkshopScreen`,
  `WorkshopEditor`). 20×12 maps, tiles `. o = # T ~ B S C P Q`, theme + construct tier (= world mechanics),
  generated names (two 32-word lists in `en.ts`, indices only). Share codes `VX1.` + Crockford base32 of a
  bit-packed payload + 16-bit FNV checksum; `decodeWorkshop` never throws (format/version/checksum/size/tile/
  theme errors). `checkWorkshop` rules (castle 2×2 ≤2, spawns ≤4, gate pair, path, ≥24 build, route ≥8);
  `WorkshopBotRun` = time-sliced good-bot run on Normal (required before sharing). ≤10 slots in
  `save.workshop` (code + validated). Game mode `workshop` (no records).
- Phase 10 done: audio. Hybrid-epic tracks per world (`THEME_TRACK`: reach/wastes/frost/deep/skyforge/rift +
  title) and a theme per boss (`boss.<enemyId>`), each with calm / action / intense layers that fade with
  `musicIntensity()` (progress, enemy count, low lives, boss alive; final wave ≥ 0.85; GameScreen feeds it every
  10 frames via `audio.updateMatch`). Track switches crossfade. Stingers in the current key on the music bus
  (wave/final/boss/phase/victory/defeat/core/level/alert); long ones duck the music. SFX for every new event
  (crit, shields, barriers, telegraphs, disables, burrow, gates, hero, abilities, meteor). Master: glue
  compressor → limiter → soft-clip waveshaper (Web Audio compressors add makeup gain; the shaper guarantees
  < −0.2 dBFS; `oversample` must stay 'none' — its filters overshoot). Separate `Synth` per bus (voice caps).
  Mix targets: tracks −18 LUFS at full intensity (calm ≈ −22.5), stingers −16 (400 ms), SFX levelled around
  their median by 100 ms "punch" loudness with group offsets (shots −2, light −3, hits +2, big events +6).
  Worst-case busy fight (boss theme + every combat SFX): −21.8 LUFS / −0.2 dBFS peak at default volumes.
  Boss themes end when the last boss is destroyed OR leaks (`bossGone`).
- Phase 11 done: i18n. `src/i18n/fil.ts` = complete Filipino draft (`Record<MessageKey, Message>`, so a missing
  key fails typecheck), `FIL_REVIEW_STATUS = 'needs-native-review'` (shows a note in Settings; README lists review
  notes + glossary). Proper nouns (tower/enemy/hero/ability/spec/world/map/research `.name`, element prefixes,
  workshop word lists) stay English — unit test enforces, plus placeholders, plural `one`+`other` (CLDR fil "one"
  covers 2,3,5… so it MUST contain `{count}`), and bitmap-font glyphs for canvas labels (`src/i18n/glyphs.ts`,
  `isBitmapKey`: `fx.*`, `hero.levelUp`). Settings → Language (Auto/device, English, Filipino, + Pseudo in dev;
  language names carry `lang` attrs). `tests/e2e/i18n.spec.ts`: every menu/codex tab/workshop editor/briefing/
  element pick/HUD/tower panel/pause in en/fil/pseudo on desktop + phones — fails on clipped, ellipsised, covered
  (by small controls) or untranslated (pseudo) text. Fixes it drove: bottom-right `.br-dock` (Build FAB + command
  bar flex together), wrapping toasts and build-card names, hero tip waits for the rotate hint, saves flush on
  `pagehide`/hidden (debounced saves were lost on quick close). New English keys need a `fil.ts` entry too.
- Phase 12 done: accessibility. `src/app/a11y.ts` `applyA11y()` → `--ts` (text size 100/115/130 %, every CSS
  `font-size` ≤ 24px is `calc(Npx * var(--ts))` — keep that for new rules), `.hc` high-contrast palette, `.rm`
  reduced motion (`motionReduced()`: setting on/off, 'auto' = system; Playwright runs with reduce → `.rm`).
  WorldView `ViewSettings.reducedMotion`: no shake/wobble/hit tint, dimmer bursts. Flash safety
  (`src/render/flash.ts`): `FlashLimiter` (≤3 full bursts/s, extras dimmed via `burstAlpha()`), `pulse()` capped
  at 2 Hz + `mixColor()` for telegraphs/beams (old 3.5 Hz wind-up and 5 Hz eclipse flicker gone), per-construct
  hit flash ≥ 0.34 s apart, HUD stat flashes ≥ 0.7 s apart. Unit "audit" scans src/render for on/off toggles and
  alpha/tint sines > 2 Hz; `tests/e2e/flash.spec.ts` measures real frames (full Chromium GPU) — WCAG flash
  count per 4×3 screen block ≤ 3/s, incl. a meteor storm. Hotkeys `src/app/hotkeys.ts` (KeyboardEvent.code,
  swap on conflict, only changes saved in `settings.hotkeys`, Esc/Space/Enter fixed); Settings → Keyboard
  (hidden on pure-touch devices); HUD key hints follow bindings (`HudHost.keyFor`). Layout helpers shared in
  `tests/e2e/layout.ts`; `a11y.spec.ts` = 130 % text + high contrast overflow sweep (en/fil, phones + desktop),
  remap test, reduced-motion test.
- Phase 13 done: device & playtest tools. `src/app/playtest.ts`: `PlaytestStore` (key `vanex-defense-playtest`,
  ≤ 30 000 chars, oldest dropped; `?playtest=1/0`), `PlaytestRecorder` (GameScreen: frame/speed/pause stats,
  records won/lost/quit), `FrameStats` (1 ms histogram → avg + 1 %-low fps). Title "Playtest · N runs" →
  `PlaytestPanel` (download only outside iframes, copy box always). `GameScreenOpts.benchmark` (stress + perf test:
  no badges, no recording). `src/app/perfTest.ts` (Settings → Device → Test performance: 3 s warm-up + 12 s at 300
  constructs, results modal). GPU context loss: `Stage.onContextLoss` → `App.graphicsLost/Restored` (ticker stops,
  GameScreen.onGraphicsLost opens pause, `.gfx-overlay` "Tap to continue", Reload after 5 s); all textures are
  CanvasSource so Pixi re-uploads. `tests/e2e/device.spec.ts` covers all three. `GAME_VERSION` in `src/app/version.ts`.
- New art helpers: `src/render/atlas/tech.ts` (TECH palette, chamfers, facets, crystals, rune rings, energy cores).
  Tower/enemy names changed, ids did not. `src/data/stats.ts` = stat rows + DPS for the HUD/codex.
- Upgrade rules: kid-safe (no gore/horror/ads/IAP/tracking/network); keep `vanex-defense-save`, new keys use the
  `vanex-defense-` prefix, total save < 200 KB; v3 save fixture in `tests/fixtures/save-v3.json` must migrate.

## Status (v1 on main)
All 10 phases done: scaffold, grid/pathing, towers/economy, elements/combos, waves/bosses, campaign/endless,
tutorial/book/badges/settings/editor, audio/polish, perf pass, tests/balance/docs. 157 unit tests + 33 E2E pass.
Perf (`npm run perf`): 60 fps on 4×-throttled phone profile with 300 creatures / ~440 shots.
