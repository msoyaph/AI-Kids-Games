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
  `MIGRATIONS[v]` upgrade chain, `SAVE_VERSION` in state.ts. Bump version + add migration on schema changes.
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

## Story / quest notes
- Missions auto-start when `requires` are done and `minDay` reached, unless `startTalk` (then the giver
  shows the intro when talked to). Talk/deliver objectives surface through `talkScene`/`questOptions`, which
  the UI (`ui/story.ts`) plugs into conversations via `app.talkHooks`.
- State objectives use `STATE_FNS` in sim/quests.ts (homeLevel, plot, museum, rating, bridges, ramps...).
- Special deliver tokens: item `$nativeFruit`, cat `foreignFruit` / `fossil`.

## Testing tips
- The Claude browser pane may be hidden → rAF paused. Use `window.__lc.debugStep(frames)` to advance the
  game synchronously, and dispatch `KeyboardEvent`s on window for input. `window.__lc` is the App.
