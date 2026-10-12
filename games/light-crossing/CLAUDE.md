# Light Crossing — developer notes

Cozy island life-sim in the browser. Vite + TypeScript (strict) + Three.js, built into ONE self-contained
`dist/index.html` (vite-plugin-singlefile). No external assets: all art is procedural low-poly geometry,
all audio is Web Audio synthesis, no web fonts, no network requests.

## Commands
- `npm run dev` — dev server (port from `$PORT`, default 5173). `.claude/launch.json` has `dev` / `preview`.
- `npm run build` — produces `dist/index.html` (single file, works from `file://` and sandboxed iframes).
- `npm test` — vitest unit tests (`tests/*.test.ts`).
- `npm run typecheck` — `tsc --noEmit` (TypeScript 7 native compiler).
- `npm run e2e` — Playwright smoke test (`e2e/`), runs against `vite preview` of the built file.
- `npm run pacing` — pacing simulation (`scripts/pacing.ts`) estimating minutes per chapter.
- `npm run analyze-playtests -- <folder>` — compare playtest exports with the pacing model.
- `npm run size` — fail if `dist/index.html` is over 2 MB. `npm run readability` — reading-level report.
- `npm run bench` — headless GPU benchmark of Low/Medium/High (`scripts/bench.ts`, 2× screen, uncapped fps) →
  `bench-results.json`. Options `--size WxH --dpr N --vsync --out f.json`.
- `npm run e2e:low` / `E2E_LOW=1` — e2e at `?quality=low` with longer waits (standard CI runners);
  `E2E_SOFTWARE=1` forces SwiftShader on a Mac to rehearse the CI job.

## Architecture (logic decoupled from rendering)
- `src/core/` — seeded RNG (`Rng`, `hashInts`, `dayRng`), value noise, typed `EventBus`, math helpers.
- `src/world/` — `worldgen.ts` pure deterministic island generator (template + noise + validation/retry),
  `types.ts` (tile enums, regions, `LEVEL_HEIGHT` visual scale).
- `src/sim/` — no DOM / no three. `GameState` (`state.ts`) is plain JSON; `World` (`world.ts`) is the runtime
  view (gen terrain + state objects/structures, collision `blocked(from,to)` incl. ramps/bridges);
  `Game` (`game.ts`) owns state + bus, steps clock/player and registered day/update hooks.
  Systems are modules of functions over `Game`.
- `src/render/` — three.js only reads state + listens to bus. `curve.ts` patches every material's
  `project_vertex` for the rolling-world bend (world-space lighting/shadows unaffected).
  Terrain = 16x16 chunk meshes; objects = `InstancedLayer`s rebuilt when `objectsChanged` fires.
- `src/input/` — keyboard/mouse, Gamepad API, touch → `InputFrame` (axes + `Command[]`).
- `src/ui/` — DOM overlay (vanilla, `h()` helper), styles.css with system rounded fonts.
- `src/data/` — all content as typed data (fish, bugs, fossils, items, recipes, villagers, dialogue,
  missions, challenges, achievements). Adding content = adding data.

## World layout
80x80 tiles. North = -z (top of screen). Levels 0/1/2 (plateau + summit with lighthouse).
Pond carved into cliff base → river south to sea with an eastward fork → lowland regions
West (start, plaza/hall/shop/museum/home lots, dock), NE, SE. Regions only connect via bridges/ramps/ladder.

## Conventions
- Facing angle f: direction = (sin f, cos f) in (x,z); f=0 faces south/camera.
- Tile index i = z*80 + x. Objects: `state.world.objects[i]`, one per tile.
- Structures footprints block tiles except dock/bridge/ramp (walkable).

## Key modules
- `src/app.ts` — screen flow (title → slots → creator → game), main loop, input routing, autosave (60s,
  day start, visibilitychange/pagehide). `app.panels[name]` registry lets sim code open UI via `game.ui.open`.
- `src/sim/systems.ts` — `installSystems(game)` registers daily hooks (order matters) + interaction resolvers;
  `createGame(state)` is the one way to build a Game.
- Interactions: resolvers return `{label, priority, run}`; highest priority wins; HUD shows the label.
  Timed actions (`game.startAction`) lock movement and drive the animation (`view` reads `game.action`).
- Items: `src/data/registry.ts` merges all content into `ITEMS`; `item(id)` lookup. Icons are canvas-drawn
  (`src/ui/icons.ts`), furniture can use 3D thumbnails via `setThumbProvider`.
- Save: `src/sim/save.ts` — `SafeStorage` (try/catch + memory fallback), `SaveManager` (3 slots + settings),
  `MIGRATIONS[v]` upgrade chain, `SAVE_VERSION` in state.ts (now 3). Bump version + add migration on schema changes.
  On-disk `format: 2` stores `world.objects` compactly (`encodeObjects`: string table + delta tile records);
  `decodeSave` still reads plain-JSON v1/v2 files. Writes go through `SafeStorage.put` → `'ok'|'memory'|'quota'|'error'`:
  verified by read-back, quota errors drop expendable `playtest.*` keys and retry; a failed write never touches
  the previous value (`app.saveNow` shows a kid-friendly "Storage is full" notice once). Budget: `SLOT_BUDGET`
  300 KB/slot (fresh ≈7 KB, maxed synthetic ≈151 KB — tests/storage.test.ts). All keys use the `lightcrossing.` prefix.
  `tests/fixtures/save-v2-*.json` are real v2 saves from `main` — never recapture them.
- UI: `UIManager` panel stack (modal panels pause the clock via game.mode='menu'), spatial focus nav for
  keyboard/gamepad (`[data-nav]` elements), `covers` panels hide those beneath.

## Status
- Phase 1 done: scaffold, single-file build, worldgen, terrain/water/vegetation, curved world, camera,
  player movement + collision, clock + day/night lighting.
- Phase 2 done: item registry (+ fish/bugs/fossils/furniture/recipes data), inventory w/ storage overflow,
  tools + durability, foraging (shake/chop/mine/pluck/pickup/dig/plant/water/ladder), daily spawns,
  gardening growth + breeding, save slots + migration, title/slots/creator/pause screens, HUD.
  (Temporary: main.ts gives starter tools on new game until the story missions exist.)
- Phase 3 done: weather roll + creature filters, fishing (shadows by water kind, cast/nibble/bite timing,
  reel minigame for size>=4, ReelBar UI), bugs (habitat spawning, stealth alert model, sneak/swing net),
  museum logic (assess fossils, donate, wing rewards), creature 3D models, rain/rainbow FX.

- Phase 4 done: economy (sell prices, foreign fruit, hot item, daily stock cart/shop), crafting UI,
  home tiers + loans + overnight construction, sleeping, interiors (home + 3-wing museum) with their own
  scene/camera (curve disabled indoors), furniture editor (place/move/rotate/store, walls/floors),
  storage, outdoor decorations (multi-tile 'deco' objects: anchor + 'fill' tiles), 3D furniture thumbnails.

- Phase 5 done: 8 villagers + 3 NPCs (data/villagers.ts), personality dialogue pools (data/dialogue.ts),
  agents with schedules + A* (sim/agents.ts, sim/pathfind.ts), friendship/gifts/requests/heart rewards
  (sim/villagers.ts), plot placement mode (sim/placement.ts), dialogue box + canvas portraits, knock on doors.
- Phase 6 (core) done: mission engine (sim/quests.ts) over data/missions.ts (5 chapters, 31 missions),
  objective kinds event/state/deliver/talk, effects, chapter banners, quest inbox → dialogue, HUD tracker +
  compass marker, Glowpad phone (Missions/Map/Island Glow/Settings), island rating (sim/rating.ts),
  festival cutscene + credits + completion screen. Story driver for tests in tests/story.ts.

- Phase 7 done: daily challenges (data/challenges.ts, 20-pool, 3/day), 44 tiered achievements with Lumen
  rewards, catalog/journal/challenges Glowpad apps, Lumen Exchange, timed contests (tournament / bug-off)
  with medals + trophies (sim/challenges.ts).
- Phase 8 done: bridges + ramps placement with validity reasons, permits at Lantern Hall, overnight
  construction (sim/build.ts), region-visit tracking. Full playthrough test reaches the finale
  (tests/fullgame.test.ts).

- Phase 9 done: Web Audio engine (src/audio/engine.ts: synthesized SFX, generative music by time/weather/
  location, waves/rain/critter ambience, dialogue blips), particles (dust/leaves/chips/dirt/splash/sparkle,
  fireflies), onboarding tips (data/tips.ts), touch controls, tool ring, adaptive pixel ratio, fades.

- Phase 10 done: Playwright smoke + file:// + sandboxed-iframe e2e (GPU headless Chromium on macOS),
  pacing simulation (scripts/pacing.ts, ~5.9 h / ~23 days) + regression test, quest/data validation
  tests, ramp/bridge site checks across seeds, README.
- Post-phase QA fixes: ramp landing collision, delivery flow, festival framing, item ground models,
  notice board notes.

## Upgrade branch (`lightcrossing-upgrade`) — plan in phases 0–10, one commit each
- Phase 0 done: v2 save fixtures, before screenshots (`scripts/screenshots.ts` → docs/screenshots/before/,
  GPU Chromium + vite dev server; `npx tsx scripts/screenshots.ts --out <dir> [--scenes a,b] [--quality q]`),
  compact save format v3 + quota/verify handling + storage budget tests.

- Phase 1 done: playtest mode + stall hints.
  - `src/sim/playtest.ts` `PlaytestRecorder`: on-device log (`lightcrossing.playtest.slotN`, ≤64 KB, expendable on quota):
    real seconds play/menu/idle (idle = `game.idleSec` ≥ 30, reset by any input in `App.tick` + pointer/key listeners),
    per mission/chapter seconds + in-game days, menu time by `Panel.name` (`UIManager.topName`; `App.panels[key]`
    auto-names the panels it pushes), stalls, Glints/Lumens by `money(..., reason)`, loans (`loanTaken` event), activity
    counts. No names/timestamps/device data. Enabled by `?playtest=1` or `settings.playtest` (Settings → tap the version
    line 5×). Export: Blob download standalone, JSON box + Copy in iframes (`src/ui/playtest.ts`).
  - `src/sim/hints.ts`: always on. Tracked mission without progress for `STALL_SEC` (6 min) of active play →
    `missionStalled` + Pemberly Glowpad call (`hintLines` per objective kind; unread hints replace each other).
    Missions app has "Ask Pemberly"; the Map app draws a pulsing ★ at `markerPos` of `trackedMission`.
  - `scripts/pacing.ts` exports `estimatePacing()` (per-mission estimates); `npm run analyze-playtests -- <folder>`
    (`scripts/analyze-playtests.ts`) prints medians vs model and *suggests* missions.ts / economy.ts edits.

- Phase 2 done: walk-in interiors.
  - `src/sim/interior.ts`: `RoomKind` = 'home' | 'museum' | 'shop' | 'hall' | `villager:<id>`; `buildRoom` builds a `Room`
    (solid grid, fixtures, `people`, shop `shelves` with today's `dailyStock`, `decor` incl. villager gifts).
    `canEnter` (shop 8–22, villager only when `villagerIsHome`), `enterInterior(g, kind, resume?)`, `exitInterior`,
    `resumeIndoors` (createGame: saves made indoors resume indoors via `player.indoor`; impossible rooms → outside).
  - Layouts are data: `src/data/interiors.ts` (8 personality homes, `HALL_ROOM`, `SHOP_ROOM` shelves). Gifted furniture
    → `VillagerState.gifts` (latest 6) → gift slots. Villager schedules gained a midday `home` slot.
  - Whereabouts: `agents.ts` `personRoom` / `roomDoorOf` / `activityOf`. Pemberly is inside the hall (outdoors in the
    plaza only during m5_finale / `flags.finaleDay`), Fennimore at the cart then behind the shop counter, Vesper in the
    museum. Knocking enters a villager's home if they're in, else says where they probably are.
  - Markers: `src/sim/markers.ts` `markerPos(g, m, 'view'|'island')` — outside: the door of the room the person is in;
    inside: the person, or the exit. `GameView.project` uses the interior camera indoors. Door fade = cut + 0.5 s fade-in.

- Phase 3 done: better decorating.
  - Furniture `layer`: 'floor' (default) | 'wall' | 'small'. 12 wall pieces (`furn_*` in data/furniture.ts; 6 recipes,
    6 shop-only) with models painting/poster/wallclock/wallshelf/wreath/sconce/kite. Wall pieces never go on floors
    or outdoors.
  - `home.walls: WallItem {uid,id,wall 0=back 1=left 2=right,pos}`; small pieces can sit on a surface piece:
    `PlacedFurniture.on = parentUid, slot` (slots row-major over the parent footprint; they ride along when the
    parent moves/turns, and are stored with it). `surfaceTop(id)` gives top height by model.
  - Undo: `homeSnapshot`/`restoreHomeSnapshot` (editor keeps 10). Editor (src/ui/editor.ts) has a big button bar,
    a wall cursor (strip around the 3 walls; F toggles walls, U undo), snaps small pieces onto the surface under
    the cursor, and hides carried pieces via `InteriorView.hidden` (never by mutating saved state).
  - Outdoors: facing a decoration → "Edit" → `DecorEditPanel` (src/ui/decorEdit.ts): `moveDecor`, `rotateDecor`
    (shifts long pieces to fit), `nudgeDecor` (`nx`/`nz` ±0.375 in 1/8 steps, visual only), put away, undo via
    `decorSnap`/`restoreDecor`.
  - Rating: `homeDecor` = floor(home decor points / 4), capped at `HOME_DECOR_MAX` 6 (only ever adds).
  - Fix: starter furniture recipes (`STARTER_RECIPES`) were never taught — now learned on `pitchTent`, and granted to
    v2 saves with a home in `MIGRATIONS[2]`.

- Phase 4 done: seasons.
  - `src/sim/seasons.ts`: `state.season {index 0..3, day 1..7, paused, lastDay}`; `dailySeason` is the first daily
    hook (7 days per season, `seasonChanged` event; paused islands never advance). v2 saves derive the season from
    `clock.day` in `fillDefaults`. `setSeason` for tests/screenshots. Settings → Seasons: Change / Stay in X.
  - Content carries `seasons?: Season[]` (absent = all year): 8 fish + 8 bugs (filtered in `availableFish` /
    `availableBugs`), 2 flower species (Blossomcup spring, Frostbell winter — wild ones spawn in season and fade
    after; seeds only sold in season), forage `SEASONAL_ITEMS` (petals, sea glass, maple leaves, pumpkins, snow
    crystals; snowberries from shaking pines in winter) via `seasonalSpawns` (own RNG stream). Picking one up
    teaches that season's 11 `unlock: 'season'` recipes.
  - Story safety: request pools and the museum rating use only all-year creatures (rating vs the core collection);
    tests/seasons.test.ts plays the whole story locked in each season (`tests/fullstory.ts` `playFullStory`).
  - Visuals: `SEASON_PALETTES` (render/palette.ts) recolor terrain chunks (`TerrainRenderer.setSeason`, rebuilt once
    per season), canopies + grass blades (`ObjectRenderer.setSeason`; no blades under snow); winter ice rim on pond/
    river banks; snow instead of rain (flurries when cloudy) in critters.ts; spring petals / autumn leaves drift in
    particles.ts; sky tint per season. HUD shows "🌸 Spring 3 · Tuesday"; catalog shows season chips.

- Phase 5 done: clothing.
  - `src/data/clothing.ts`: 46 original pieces (`ClothingDef` slot/shape/color/color2/pattern/source), 8 `DYE_COLORS`
    (one per flower color), `VILLAGER_STYLE` gifts, `CLOTHING_RECIPES` (5 'start' + dye station + standing mirror,
    9 'card'). Items are cat 'clothing'; dyed copies are ids like `cloth_sunny_tee#6`, resolved by `item()`
    (`baseId()` strips the dye).
  - `src/sim/wardrobe.ts`: `state.wardrobe {owned, worn, outfits[3]}`; `wear` (dress ↔ top/bottom), `takeOff`,
    `takeOut`, `stash`, `saveOutfit`/`wearOutfit` (skips missing), `dye` (uses one flower of that color; updates worn
    + outfits), `clothingThanks` (loved gifts → a style piece, ≤ every 3 days), `outfitHash` (villagers comment
    once per new outfit: dialogue topic `outfit`), `wornVisuals` for rendering. Inventory verb "Wear".
  - Sources: crafting, the shop (2 pieces/day on its own RNG stream; 24 shop shelves), villager gifts, events
    (festival items in Phase 6). Home: wardrobe/mirror furniture → `WardrobePanel`, dye station → `DyePanel`.
  - Visuals: `CharSpec.clothes` → `dressUp()` in render/models/character.ts (hats, glasses, skirts/dresses, shoes,
    bags, pattern bits); `playerPortraitURL` (ui/portraits.ts) on save cards (`SaveMeta.worn`), the Glowpad
    header and the closet. `GameView.rebuildPlayer` runs on `outfitChanged` (removes the old rig from any scene).

- Phase 6 done: repeating events + long-term goals (`src/data/festivals.ts`, `src/sim/happenings.ts`).
  All optional and only from Chapter 3 on (`happeningsOpen`); nothing here is needed for the story.
  - Festivals on day 5 of each season (`festivalToday`/`festivalNow`, host or Pemberly if the host hasn't moved in):
    Flower Fair (3 flower colors → Rusk), Star Night (5 `falling_star` near the plaza → Marlowe), Harvest Feast
    (3 fruit + 2 fish → Tansy), Lantern Skate (frozen pond: `world.frozenPond` makes pond tiles walkable; 5
    `skateRings`). Progress in `events.festival`; exclusive clothes + Lumens. Villagers gather in the plaza
    (`activityOf(id, hour, g)` overrides), the host stands at `festivalSpot`. Talk option via `ui/events.ts`.
  - Contests repeat on `CONTEST_DAYS` (tournament day 3, bug-off day 6) after their missions and resume after a
    reload (no reset in `installChallenges`; autosave every 15 s while one runs).
  - Wanda the heron merchant (new `heron` species): every 6 days from day 9 by the dock (`merchantSpot`), rare
    furniture + an out-of-season seed + a style piece (`merchantStock`, `buyFromMerchant`, `events.merchant`).
  - Meteor nights (`meteorNight`, ~1 in 8 clear nights) → streaks in render/events.ts, stardust on the beach next
    morning (teaches `r_furn_stardust_lamp`). Birthdays (`BIRTHDAYS`, never on days 3/5/6): they stay home 10–20,
    balloons in their room, gifts count double. The player is never asked for personal info.
  - Glow streak (`flags.glowStreak`, rewards at 3/7/14 days of 5 lanterns), full museum → Golden Lantern Statue.
  - Basement (home level 3, after the story, 80,000 loan): `homeData(g, kind)` picks the active floor for every
    housing function; `stairsDown`/`stairsUp` fixtures and `changeFloor` (keeps the way outside). Location 'basement'.
  - Glowpad Calendar app; notice board lists festivals, contest days, Wanda, birthdays and meteor nights.

- Phase 7 done: young players.
  - Read-aloud: `src/ui/speech.ts` `ReadAloud` (guarded `speechSynthesis`, injectable for tests; silent no-op when
    unsupported). Dialogue lines/prompts are read in the speaker's voice pitch (`DialogueBox` `speak` callback),
    tips too; 🔊 buttons replay a dialogue line or read the tracked mission. Settings → Read aloud (shows "Not
    available on this device" when missing).
  - Reading level: dialogue is split per personality (`src/data/dialogue/*.ts`); all player-facing data text was
    rewritten for early readers. `src/core/readability.ts` (Flesch–Kincaid, names count as easy words) +
    `npx tsx scripts/readability.ts [group]` report; tests/readability.test.ts: every line ≤ grade 6, each group
    ≤ 3.5 average, dialogue keeps tags + allowed tokens (`{place}` already says "somewhere …").
  - Bigger text: Settings → Text size (Normal / Big / Bigger) sets CSS `--ts` used by dialogue, toasts, tracker,
    tips, cards and panels.
  - QoL: craft ×1 / ×5 / All (`craftMany`, `maxCraftable`), sell a whole stack or just one (tap again), "Tidy up"
    pockets (`sortPockets`, keeps the equipped tool), 📌 Track a recipe (`state.trackedRecipe`, HUD
    `RecipeTracker` under the mission tracker with live counts).

- Phase 8 done: visuals + performance.
  - `src/render/quality.ts`: `QUALITY` low/medium/high (pixel ratio cap, shadows + map size + PCF radius — soft on
    High, grass density, foam/ripples, canopy sway, ambient particles, fog distance), `guessTier`, `urlTier`
    (`?quality=low`), `Governor` (Auto: 2.5 s under 42 fps → down, 10 s over 57 fps → up, never above its start).
    `App.setupQuality/applyTier` → `GameView.applyQuality`. Settings → Quality (Auto/Low/Medium/High).
  - Looks: per-season sun/hemisphere light (sky.ts); canopies sway (`LC_SWAY_TREE` in curve.ts); water tinted by
    time of day + shoreline foam bands + ripple rings (`WaterRenderer.frame`); blinking eyes, villagers wave when
    you walk up and hop when happy (agents.ts; `animateRig` 'wave'/'hop').
  - Benchmark: `src/ui/bench.ts` + `src/sim/benchIsland.ts` (in-memory busy island, Harvest Feast at 6 PM, slot -1 so
    nothing is saved); Settings → Test performance, `?bench=1` (current tier) or `?bench=all`; results panel +
    `window.__benchResults`. App `benchDriver` steers the player.
  - Robustness: WebGL context loss pauses the game ("Tap to continue" card, `glPaused`); furniture thumbnails render
    through the main renderer into a render target (no second WebGL context); interior rooms dispose their GPU
    resources on rebuild/exit (`InteriorView.release`).

- Phase 9 done: CI (see `docs/CI.md`; nothing pushed — the repo has no remote yet).
  - `.github/workflows/ci.yml`: ubuntu-latest, push to main/lightcrossing-upgrade + same-repo PRs into main (fork
    PRs skipped) → typecheck, build, size, unit tests, `pacing --check`, `E2E_LOW=1` e2e on SwiftShader; report +
    traces uploaded on failure.
  - `.github/workflows/gpu-e2e.yml`: `[self-hosted, macOS, ARM64, gpu]`, push + workflow_dispatch only (never PRs),
    refuses to run if the repo is public; normal-quality e2e on Metal + `npm run bench` (artifact + step summary).
  - Both: `permissions: contents: read`, `persist-credentials: false`, actions pinned by SHA. Lint with `actionlint`
    (`.github/actionlint.yaml` declares the `gpu` label).

- Phase 10 done: testing, screenshots, handoff.
  - `tests/postgame.test.ts`: the full story, then a 28-day year (all seasons, every festival, both contests each season,
    Wanda, birthdays, a meteor night, the basement), save/load and the 300 KB budget at the end.
  - Fixes found by it: Lantern Skate always gets 5 rings (closer spacing on small ponds; ~1 in 5 islands only had 3–4);
    stardust only follows a night that really had shooting stars (`flags.meteorDay`, `meteorRoll`), not one hidden by rain.
  - e2e: save inside Lantern Hall → reload → resumes inside; every localStorage key has the `lightcrossing.` prefix.
  - Screenshots: `scripts/screenshots.ts` scenes for every season, every interior (8 villager rooms, home, basement, shop,
    hall, museum), two festivals, closet, big-text dialogue; `docs/screenshots/after/` (+ `-low/-medium/-high` variants).
  - Polish from the review: clothing icons drawn per shape + pattern (`drawClothing` in ui/icons.ts, `IconSpec.v/p`);
    interior windows have a frame, panes and a sky tinted by time of day (none in the basement); phone font sizes
    survive the text-size setting.
  - README: playtest mode, performance tiers + benchmark table, CI, handoff (slug, storage keys, sizes, recapture art).

## Verification checklist
`npm run typecheck && npm test && npm run build && npm run size && npm run e2e && npm run pacing`
- `npm run e2e` runs every Playwright project: `desktop` (smoke: keyboard/mouse, file://, iframe, save indoors),
  `{chromium,webkit}-{phone,tablet}-{portrait,landscape}` (e2e/touch.spec.ts spot checks + e2e/playthrough.spec.ts:
  Chapter 1 with touch only — long), `layout-{chromium,webkit}` (every screen × 10 viewports). Subsets: `e2e:touch`,
  `e2e:layout`, `e2e:ci`. Pass `--trace=off` when iterating (traces are large; the disk is often nearly full).
(222 unit tests + 1 skipped, incl. full new-game → festival playthroughs, one per season, a year after the story, and the
readability check; 191 e2e tests: 3 desktop, 8 touch projects × (20 spot checks + the Chapter 1 playthrough), 20 layout.
Build 1,250 kB (1.19 MiB); pacing 5.86 h.)

## Known issues / limitations
- Pacing is a model estimate (scripts/pacing.ts), not measured with real players.
- Off macOS, headless e2e falls back to SwiftShader (slow): CI uses `E2E_LOW=1` for that.
- `npm audit` flags `braces` via vite-plugin-singlefile → micromatch (dev-only build dependency).
- Audio starts after the first user gesture (browser autoplay policy).

## Story / quest notes
- Missions auto-start when `requires` are done and `minDay` reached, unless `startTalk` (then the giver
  shows the intro when talked to). Talk/deliver objectives surface through `talkScene`/`questOptions`, which
  the UI (`ui/story.ts`) plugs into conversations via `app.talkHooks`.
- State objectives use `STATE_FNS` in sim/quests.ts (homeLevel, plot, museum, rating, bridges, ramps...).
- Special deliver tokens: item `$nativeFruit`, cat `foreignFruit` / `fossil`.

## Testing tips
- The Claude browser pane may be hidden → rAF paused. Use `window.__lc.debugStep(frames)` to advance the
  game synchronously, and dispatch `KeyboardEvent`s on window for input. `window.__lc` is the App.

## Touch + release pass (branch `lightcrossing-upgrade`, then merged to `main` as v2.0.0)
- Step 1 done: touch audit (`docs/touch/AUDIT.md`). `src/dev.ts` puts scene helpers on `window.__lc.dev`
  (`start`, `town`, `tools`, `equip`, `face`, `inside`, `panel`, `reel`, `plot`, `contest`, `festival`, `loseGL`...) so
  tests can stage a situation in the built single file; input still goes through the real controls.
  `e2e/lib/screens.ts`: every screen + `checkLayout()` (off screen, inside simulated safe areas `--sat/--sar/--sab/--sal`,
  tap targets < 48 px, overlapping tap targets, HUD covering menus, text < 12 px). `npx tsx scripts/touch-audit.ts
  --out <dir> [--engines chromium,webkit] [--viewports …] [--screens …]` screenshots + `report.md`.
- Steps 2–4 done: phones and tablets by touch (portrait and landscape fully supported; no rotate hint).
  - Touch controls (`src/ui/touch.ts`, touch events only so Chromium/WebKit behave alike): floating stick anywhere
    (push < 50% = 🐾 sneak → `input.touch.sneak` → `g.creeping`: SNEAK_SPEED + quiet for bugs; ≥ 95% = run), tap =
    `App.tap` (tap-to-move via `src/input/tapmove.ts` `pickTile` + `TapMover`: ground → walk there; person/door/item
    with empty hands → walk up and use; with a tool → walk up and face, tap the ring again to use it; a building →
    its front door; the door mat indoors → walk out). While a fish is on the line any touch is A (tap to hook, hold to
    reel). Buttons: big contextual A ("Dig", "Talk"…), Run, Tools (opens the ring), Bag, Glowpad, ☰ (pause menu),
    and ✔ Place / ✕ Cancel during placement. Keyboard or gamepad use hides them until the next touch
    (`Input.lastDevice`; canvas uses pointer events so a tap's fake mouse events never count as the mouse).
  - Target ring (`src/sim/target.ts` `actionTarget` + `src/render/target.ts`): the tile A will touch (green = something
    happens, white = tool in hand, nothing there). Interactions may carry `tile` (pick up / pull weeds act underfoot).
  - HUD layout (`src/ui/hudLayout.ts`, every frame): left column (clock, tracker, recipe tracker), right column
    (money, Glowpad/☰), the lane (playtest badge, contest timer, reel bar, tips, toasts) beside or under them, the
    prompt / Place bar lifted over the touch buttons; quest marker kept clear (`hudLayout.free`). Toasts queue
    (`Hud.pump`): ≤ 2 at a time on phones, only in free space, held while a full-screen menu is open.
  - CSS: safe areas via `--sat/--sar/--sab/--sal` (tests override them to simulate notches); `html.touch-ui` (touch device:
    48 px tap targets) and `html.touch-play` (controls showing) — never name a page class `touch` (that's the controls
    container). Menus sit at z 7 above the HUD, scroll inside the safe area; HUD buttons (tracker 🔊, recipe ✕) at z 6
    above the touch layer (z 5). Buttons default to 15 px (WebKit's form default is 11 px).
  - Editor on touch: drag a piece (keeps the grab offset), tap to pick / place, "＋ Add" drawer, toolbar with nudge
    arrows, Turn, On table / On floor (`floorOnly`), Put away, Walls, Undo; mouse/keyboard unchanged.
  - Mobile browser: no pinch / double-tap zoom, pull-to-refresh, callouts or selection (gesturestart, touch-action,
    overscroll-behavior); `interactive-widget=resizes-content` + `src/ui/viewport.ts` (--vvt/--vvh keep menus in the
    visual viewport, focused fields scrolled into view); audio unlock on touchend/click with a silent iOS kick;
    `ReadAloud.prime()` on the first tap; `src/ui/fullscreen.ts` (only where supported: not iPhone, not an iframe
    without permission); hidden page → save, pause menu, audio suspended (`App.goneAway/cameBack`); Auto quality =
    Low on phones (`guessTier(nav, screen)`); "Tap to continue" listens to pointer/touch/click.
  - Fixes found on the way: Lantern Skate rings checked every frame with a swept test (fast skaters missed rings);
    the melting pond puts you on land at the ice's level; the tool ring sizes itself to the safe area.
  - `?preview=<scene>` (`src/preview.ts`): cover/spring/summer/autumn/winter/festival/home/shop/villager — a staged,
    UI-free scene for the site's previews (slot -1, never saved; sets `window.__previewReady`).
- Step 5 done: tests.
  - `e2e/lib/touch.ts` `Fingers`: taps via `page.touchscreen` / `locator.tap()` (real touches); holds and drags via CDP
    `Input.dispatchTouchEvent` (Chromium) or Playwright TouchEvent dispatch on the element under the finger (WebKit).
  - `e2e/lib/play.ts` `Player`: plays like a child — looks through read-only `__lc.dev` helpers (`peek`, `nearest`
    (reachable only), `route`, `screen`, `pickAt` (what a tap there would hit), `target`, `shadows`, `castSpot`, `bugs`
    (+ `reachable`), `person`, `door`, `room`) and acts only by touch (`walkTo` taps the farthest on-screen route point
    — never within 2 tiles of a tool's ring or on your own tile, which would use the tool — else steers along the route;
    `approach` taps a thing only where the game would pick it, skipping things hidden behind buildings; `steerTo`,
    `fishOnce`, `talkThrough`, `ready` (answers anyone who calls), `equip` via the ring, retried if a call interrupts).
    A spot is tappable only if a finger there reaches the game.
  - `e2e/touch.spec.ts` (20 spot checks) and `e2e/playthrough.spec.ts` (Chapter 1 with touch only; `PT_LOG=1` logs
    progress) run in 8 projects; `e2e/layout.spec.ts` checks every screen × viewport. Staging helpers `toOpen` (a clear
    7×7 meadow), `toPlaza`, `bug(dist)` (returns its spot), `learn`, `plotSpot`.
  - Bugs found by the touch tests and fixed in the game: indoor taps on people behind counters walk to the counter;
    putting the rod away reels the line in (touch no longer stuck in "hold to reel"); the compact tracker on small
    screens (next step + "+N more"); building walls/roofs count as the building for taps; with the net out, a bug in
    reach beats "Shake tree" (`bugResolver` priority 60 via `bugInReach`, else 20 — any input, not just touch); menu
    tips (craft / shop / inventory) show inside the menu (`App.tipInside` → `TipManager.inline`, class `menu-tip`)
    instead of after it closes; `pickTile` picks a building (DOORS types, `HEIGHT` table) when the tap is inside its
    projected outline and the ground it would otherwise pick is behind it (tests/tapmove.test.ts); the interior camera
    (`InteriorView` frame) backs off on narrow aspect ratios so the room's full width fits (rooms ≤ 12 wide).
    `playwright.config.ts` sets `actionTimeout` (15 s) so a stuck tap fails fast.
  - Results: Chapter 1 by touch passes on all 8 projects (5–7 min each; 12.6 min for all 8 with 4 workers), 160/160 spot
    checks, 20/20 layout runs, 3/3 desktop. Throttled bench (`--profile phone|tablet`, CPU 4×, vsync): phone → Low,
    tablet → Medium, both 60 avg / 59.5 1%-low (docs/bench/2026-10-11-{phone,tablet}-profile.json). Before/after phone
    screenshots: docs/touch/before, docs/touch/after, docs/touch/compare-phone-{portrait,landscape}.jpg.
- Step 6 done: release 2.0.0 (local only — no remote, nothing pushed).
  - `lightcrossing-upgrade` merged into `main` (--no-ff, 5c3a16a), then on main: the interior camera fit for portrait
    phones, playthrough test robustness, `docs/REPORT.md` (full implementation report), `docs/registry-entry.json`
    (`npx tsx scripts/registry-entry.ts` after a build), README handoff size. Tag `v2.0.0` = the release commit.
  - Verified on main: typecheck, 222 unit tests (+1 skipped), build 1,250,266 bytes (reproducible; SHA-256
    7730e932006a60cc50f2112548c387a97f26ceb650fb7cf279360abea8b732c8), size, pacing 5.86 h, 191/191 e2e.
  - Any later change to `src/` changes the hash: rebuild, rerun `scripts/registry-entry.ts`, update REPORT/README.
