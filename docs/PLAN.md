# Cliff Valley — Build Plan

A cozy 2D pixel-art farming life-sim for ages 8–14, built as a single self-contained
`dist/index.html` for the Ai Kids Games site.

## Architecture (system-based, logic decoupled from rendering)

```
src/
  main.ts            boot: query params (?bench=1, ?playtest=1, ?lowq=1, ?seed=), create Game
  tuning.ts          ONE typed file with every balance value (prices, growth, energy, XP…)
  core/              engine-agnostic helpers: seeded RNG, event bus, A*, safe storage, RLE
  data/              ALL content as typed data: items, crops, trees, fish, minerals, artifacts,
                     forage, animals, recipes, machines, villagers (+schedules, dialogue, gifts,
                     cutscenes), shops, buildings, boards, festivals, quests, mail,
                     achievements, skills/perks, tips, maps (ASCII + legend)
  sim/               headless game logic (no DOM / Pixi). GameState is plain JSON-able data.
                     Sim facade exposes an action API used by the UI, the bot and tests.
  render/            PixiJS: palette-map → atlas baking, chunked tile layers (cached),
                     y-sorted pooled entity sprites with culling, camera with integer zoom,
                     lighting tint, weather particles (pooled), effects.
  render/art/        pixel art authored in code: palette-indexed maps + parametric generators
                     (crops, fish, gems, food, characters 16×32, animals, critters, buildings)
  ui/                DOM overlay (system fonts, pixel-styled CSS): HUD, menus, dialogue,
                     shops, chests, cutscenes, title/slots, settings, touch controls, toasts
  audio/             Web Audio synth: SFX + chiptune sequencer & procedural composer
  input/             keyboard+mouse, touch (tap-to-move, joystick, big tool button), gamepad
  game/              main loop & modes (title/play/menu/dialogue/cutscene/fishing/festival),
                     player controller, interactions, cutscene runner, test hook, bench, playtest
tests/
  unit/              Vitest: growth, economy, schedules, friendship, machines, save+migration…
  sim/               headless bot playthrough new game → finale; pacing model
  e2e/               Playwright: desktop/tablet/phone, file://, sandboxed iframe, no errors/requests
scripts/             check-build (size, no external refs), analyze-playtests
```

Key decisions
- **PixiJS v8** with `preference: ['webgl','canvas']` (WebGL with automatic Canvas fallback),
  nearest scaling, integer zoom computed in device pixels, `roundPixels`.
- **Single file** via `vite-plugin-singlefile`; no fetch/XHR/workers/web fonts; textures are made
  from canvases at startup.
- **UI in DOM** for readable text, text-size setting, read-aloud and touch-size targets.
- **Time:** 6:00→2:00 (1200 game min) in 720 s real → 1.667 game-min/s; 10-minute ticks.
  Seasons of 10 days, 5-day week (Seedday, Sproutday, Bloomday, Fruitday, Restday).
- **Saves:** `cliffvalley.slot.{1..3}` (+ `cliffvalley.settings`, `cliffvalley.meta`,
  `cliffvalley.playtest`). Versioned with migrations; soil layers RLE-encoded; setItem is
  atomic so a quota failure leaves the old save intact. Memory fallback when storage is blocked.
- **Story gating:** six restoration boards (Forage→Bridge to Quarry, Minerals→Mine Lift to floors
  21–40, Fish→Beach Pier, Crops→Greenhouse, Animal goods→Valley Train, Crafted goods→Valley Hall
  clock & lamp) + the Heartstone from mine floor 40. Finale on Winter 10 night when complete;
  otherwise the morning after the last piece is done (never soft-locks; board slots accept
  alternatives and year 2 repeats seasons).

## Phases (commit after each; CLAUDE.md status updated)
1. Scaffold, single-file build, pixel-art pipeline (palette maps → atlas), farm map, movement, camera.
2. Time/day, sleeping, saves + migrations, energy, HUD.
3. Tools & farming (clear, till, plant, water, grow, harvest), shipping bin, economy.
4. Town map, shops with hours, inventory & chests.
5. Villagers: schedules, dialogue, gifts, friendship, calendar.
6. Animals, buildings, carpenter upgrades, pet.
7. Mine: 40 floors, ores, geodes, mild combat.
8. Fishing (tension-reel minigame), foraging, crab pots.
9. Cooking, crafting, machines, skills & perks.
10. Story: restoration boards, unlocks, friendship cutscenes, festivals, finale & credits.
11. Season & weather visuals, museum, collections, achievements, post-game goals.
12. Audio, polish, onboarding, touch & gamepad, accessibility settings.
13. Performance pass (busy farm, festival town, deep mine) on throttled profiles.
14. Tests & pacing: unit, headless bot playthrough, pacing model (7–8 h), Playwright matrix.
15. Playtest mode + export, analyze script, GitHub Actions (+ optional self-hosted Mac runner).
