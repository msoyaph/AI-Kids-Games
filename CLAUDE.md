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

## Verification checklist
`npm run typecheck && npm test && npm run build && npm run e2e && npm run pacing`
(217 unit tests incl. full new-game → festival playthroughs, one per season, and the readability check; 2 e2e tests.)

## Known issues / limitations
- Pacing is a model estimate (scripts/pacing.ts), not measured with real players.
- Off macOS, headless e2e falls back to SwiftShader (very slow but functional).
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
