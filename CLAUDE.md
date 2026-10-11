# Cliff Valley — working notes for Claude

Cozy 2D pixel-art farming life-sim for ages 8–14 (Ai Kids Games). Full brief lives in the first
session; condensed plan in `docs/PLAN.md`. Ships as ONE self-contained `dist/index.html`.

## Commands
- `npm run dev` — Vite dev server (port 5181, auto-picks another if busy). Dev-only `window.__cvdev` = Game.
- `npm run build` — typecheck + single-file build + `scripts/check-build.mjs` (size ≤ 2.5 MB, no external refs).
- `npm test` — Vitest unit tests (`tests/unit`). `npm run test:sim` — headless bot playthrough + pacing.
- `npm run test:e2e` — Playwright (desktop/tablet/phone, file://, sandboxed iframe).
- `npm run analyze-playtests -- <files>` — summarize exported `?playtest=1` JSON.
- Query params: `?bench=1` (benchmark + FPS), `?playtest=1`, `?lowq=1` (low quality), `?seed=N`.

## Architecture (see docs/PLAN.md)
- `src/sim/**` is headless: no DOM/Pixi imports. `Sim` (sim/sim.ts) owns `GameState` (plain JSON) and
  runtime `Loc`s (sim/world.ts: static map + soil Uint8Array + objects Map<tileIndex, WorldObject>).
- `src/data/**` = all content (typed). Maps are built with `MapBuilder` (data/maps/builder.ts) and
  registered in `data/maps/index.ts`. Buildings/props in `data/structures.ts` (sprites generated from look params).
- `src/tuning.ts` = every balance number.
- `src/render/**` = Pixi v8 (`preference: ['webgl','canvas']`). Art authored in code (`render/art/*`) on
  `PixelCanvas`, baked into 2048² atlas pages (`render/atlas.ts`). WorldView: ground chunks rendered into
  RenderTextures (redrawn when `loc.chunkDirty`), y-sorted pooled sprites with culling.
- Renderer runs at resolution 1 with canvas sized in device pixels; zoom is an integer in device px.
- Sprite naming: `ter.{terId}.{variant}.s{season}`, `prop.{kind}[.s{season}]`, `bld.{structureKey}`,
  `obj.*`, `tree.{kind}.{stage}.s{season}`, `ch.{id}.{dir}.{frame}` (dir 0 down,1 left,2 right,3 up;
  frames 0 stand,1 walkA,2 walkB,3 use-up,4 use-down), `item.{id}` (icons).
- Warps: arrival tile is locked until the player steps off (no ping-pong). Building doors come from
  `StructurePlacement.door` + `StructureDef.door` offset.

## Conventions
- No TS enums/namespaces; const objects (`Ter`). Short keys in saved objects (`WorldObject`).
- Keep the hot loop allocation-free; pool sprites; strings only built on (re)builds.
- Kid-friendly content rules: no romance, alcohol, gambling, scary stuff; gentle failures.

## Status
- Phase 1 ✅ scaffold, single-file build, pixel-art pipeline, farm map, movement, camera.
- Phase 2 ✅ clock (12 min days, 10-min ticks, sleepy at midnight, pass out at 2am → wake at home, no loss), sleep → DayReport → save, 3 save slots (`cliffvalley.slot.N`, settings in `cliffvalley.settings`), migrations (sim/save.ts MIGRATIONS + fillDefaults), compact location tokens, DOM HUD/title/new-farm form/day summary.
- Phase 3 ✅ tools (areas by tier, energy), clearing, tilling, planting (season rules), watering (can capacity, refill at water/well), overnight growth, quality stars, regrow, trellis, giant crops, sprinklers, scarecrows/crows, fruit trees, tappers, shipping bin + overnight payout. Systems register via `registerSystem` (sim/systems.ts); import Sim from `src/sim` (index registers content+systems).
- Phase 4 ✅ town (72×56) + 11 interiors + Valley Hall, shops (data/shops.ts, hours, closed days, door guards, buy/sell, services e.g. backpack), tabbed menu (ui/menu.ts registerTab), bag (swap/sort/toss), chests w/ color labels, Lost & Found, placeables (chest, scarecrow, sprinklers, fences, gates, paths, torch), settings panel. Game extension points: `HOOKS` in game/game.ts (trigger, onEnter, onUpdate, onRender, interactNearby, special tools, inspect).
- Phase 5 ✅ 14 villagers (data/villagers.ts: looks, homes, birthdays, gift tastes, schedules by point names), dialogue/mail/cutscenes content (data/dialogue.ts, mail.ts, cutscenes.ts — types in story-types.ts), sim/npcs.ts (location graph + A* routes, time-based positions), sim/friendship.ts (talk/gift/hearts), sim/mail.ts (conditions → morning delivery), sim/quests.ts (help-wanted board), UI: dialogue box w/ portraits + read-aloud, gift picker, mailbox, friends/calendar/journal tabs.
- Phase 6/7 code in progress: data/animals.ts, sim/animals.ts (+pet), sim/buildings.ts (carpenter), farm building interiors; data/minerals.ts, sim/mine.ts, sim/critters.ts, mountain/quarry/minelobby maps, art/mine.ts.
