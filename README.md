# Light Crossing

A cozy island life-sim for the browser. Arrive on sleepy **Driftlight Isle**, pitch a tent, befriend eight
neighbors, fill a museum, and make the island glow bright enough to hold the **Lantern Crossing** festival,
when lanterns drift out to sea and the old lighthouse shines again.

A full playthrough takes about **6 hours** (5 chapters, about 23 in-game days). After the credits the island keeps going:
four seasons, a festival every season, contests, a traveling merchant, meteor showers, birthdays, and a basement to decorate.

Made for players aged 6 and up: there is a read-aloud option, big-text settings, and every line is written at an early-reader level.

All art is procedural low-poly geometry generated in code. All music and sound effects are synthesized
with the Web Audio API. There are no image, audio or font files, and the game makes no network requests.

---

## How to play

You start on the dock. Find **Pemberly** the capybara at Lantern Hall, north of the plaza. Follow the missions in the
top-left tracker; the golden marker points to your next goal.

| Activity | How |
|---|---|
| **Foraging** | Shake trees for fruit and branches, pull weeds for fiber, collect shells on the beach, pick up items |
| **Tools** | Craft them at your workbench. Flimsy tools break; iron recipes unlock later. Swap tools with 1–6 or the tool ring |
| **Fishing** | Face water and cast near a shadow. Ignore the nibbles and press on the real bite. Big fish need reeling: hold to lift the hook and keep it in the green |
| **Bugs** | Hold the action button to sneak with your net, then release to swing. Running scares bugs away |
| **Digging** | Dig cracks for treasure and fossils. Professor Vesper identifies fossils |
| **Gardening** | Plant seeds, saplings and fruit. Water flowers daily; neighbors of the same species can cross-breed new colors |
| **Economy** | Sell to Fennimore (prices depend on rarity, plus a daily hot item). The shop stock changes every day |
| **Home** | Tent, then cottage, then house (and a basement after the story), paid for with loans at Lantern Hall. Inside: sleep, storage, the closet, and the Decorate editor |
| **Decorating** | Big buttons: move, turn, put away and undo. Furniture goes on the floor, small things on tables and shelves, and paintings, clocks and wreaths on the walls. Outdoor decorations can be moved, turned and nudged |
| **Walking in** | Visit Fennimore's shop (buy from the shelves), Lantern Hall, the museum, and every neighbor's home. Knock when they're in. Saving indoors brings you back to the same room |
| **Seasons** | 7 days each: spring blossoms, summer, autumn leaves and winter snow. Each season has its own fish, bugs, flowers, forage and recipes. Settings can pause seasons |
| **Festivals** | One a season, on day 5 (after Chapter 2): Flower Fair, Star Night, Harvest Feast and Lantern Skate on the frozen pond, each with exclusive clothes |
| **Clothing** | 46 original pieces (tops, bottoms, dresses, hats, glasses, shoes, bags), a closet with 3 saved outfits, and a dye station that uses flowers |
| **Happenings** | The fishing tournament and bug-off return every season, Wanda the heron visits with rare goods, meteor nights leave stardust, and neighbors have birthdays |
| **Neighbors** | Chat daily, give gifts (they have likes and dislikes), and help with requests. Friends share recipes and gifts |
| **Museum** | Donate every new fish, bug and fossil. Completing a wing earns a reward |
| **Challenges** | 3 daily challenges and 44 tiered achievements earn **Lumens** for the Lumen Exchange |
| **Building** | Bridges and ramps (Lantern Hall permits) open up the far shores and the cliffs |
| **Island Glow** | The 1–5 lantern rating grows with neighbors, museum, decorations, flowers, friendships, and fewer weeds |

The **Glowpad** (Tab / Start) holds Missions, Map, Neighbors, Island Glow, Catalog, Journal, Challenges, Calendar and Settings.
If you're stuck on a mission for a while, Pemberly sends a hint, and the Map shows a big star where to go.

### Controls

| Action | Keyboard / mouse | Gamepad | Touch |
|---|---|---|---|
| Move | WASD / arrows | Left stick | Drag on the left half |
| Run | Shift (hold) | B / RT (hold) | B (hold) or push the stick fully |
| Interact / use tool | E / Space / click | A | A |
| Sneak with net | Hold E | Hold A | Hold A |
| Cycle tools | `[` `]` | LB / RB | Tool |
| Tool hotkeys | 1–6 | — | — |
| Tool ring | R | Y | — |
| Put tool away | Q | — | — |
| Pockets | I | X | Bag |
| Glowpad | Tab / P | Start | Pad |
| Map | M | Select | — |
| Pause / back | Esc | B | B |
| Decorate (at home) | E on an empty spot; arrows move, E place/pick, R turn, X put away, U undo, F walls | D-pad, A, Y turn, X put away | big on-screen buttons |

Saves: 3 slots with autosave (every minute, at every new day, and when the tab is hidden). Saves are versioned and migrated
automatically. If storage is unavailable, for example in a sandboxed iframe, the game still runs and warns that progress won't persist.
If storage is full, the game says so and the last good save is kept.

### Settings for young players

- **Read aloud** speaks dialogue, tips and mission text using the browser's built-in voice. There's a 🔊 button to hear a line again.
  If the browser has no voice, the setting says so.
- **Text size**: Normal, Big or Bigger.
- **Quality**: Auto (the default), Low, Medium or High. Auto starts from a guess based on the device and steps down if frames get slow.
- **Seasons**: "Change", or "Stay in" the current season.

Quality-of-life helpers: craft 1, 5 or as many as you can; sell one or a whole stack; "Tidy up" sorts your pockets; and you can pin
a recipe to the screen to track its materials.

---

## Build and run

Requires Node 22.12+ (developed on Node 24).

```bash
npm install
npm run dev        # local dev server (http://127.0.0.1:5173, or $PORT)
npm run build      # -> dist/index.html (one self-contained file)
npm run size       # fails if dist/index.html is over 2 MB
npm test           # vitest: unit tests, full story playthroughs (one per season), a year after the story, reading level
npm run e2e        # Playwright: smoke test, file:// + sandboxed iframe, save indoors + reload (GPU on macOS)
npm run e2e:low    # the same at Low quality with longer waits (what CI runs on machines without a GPU)
npm run pacing     # pacing simulation (minutes per chapter; add -- --check to fail outside 5.5–6.5 h)
npm run bench      # performance benchmark of Low / Medium / High in headless Chromium -> bench-results.json
npm run readability            # reading-level report for every line a player reads
npm run analyze-playtests -- <folder>   # compare exported playtest logs with the pacing model
npm run typecheck
```

`dist/index.html` works when double-clicked (`file://`) and inside a sandboxed `<iframe sandbox="allow-scripts">`.

### Playtest mode

Playtest mode records how long each mission and chapter really takes, plus idle time, time in menus, where players got stuck,
and what they earned and spent. **Nothing personal is recorded and nothing is ever sent anywhere.** The log stays in the
browser (`lightcrossing.playtest.slotN`, at most 64 KB) until you export it.

1. Turn it on: open the game with `?playtest=1` added to the address, or go to Settings, tap the version line
   ("Light Crossing 1.1") 5 times, and set **Recording** to **On**. A small "● Playtest" badge shows while it's recording.
2. Play normally. If a tracked mission makes no progress for 6 minutes of active play, Pemberly sends a hint to the Glowpad
   (this happens for everyone, not just in playtest mode).
3. Export: in the same hidden Settings section, press **Export file** to download a `.json` file. Inside an iframe (like a
   game portal) the button is **Show data to copy**: it shows the JSON in a box with a **Copy** button.
4. Put the exported files in a folder and run `npm run analyze-playtests -- that-folder`. It compares real times with the
   pacing model and *suggests* changes to `src/data/missions.ts` and `src/data/economy.ts`. It doesn't apply them.

### Performance

There are three quality tiers. **Auto** picks one and moves between them as needed.

| Tier | Pixel ratio | Shadows | Grass | Shore foam, ripples, tree sway | Meant for |
|---|---|---|---|---|---|
| Low | 1 | off | 35% | off | mid-range tablets and older phones |
| Medium | up to 1.25 | 1536 map | 75% | on | most laptops |
| High | up to 2 | 2048 map, soft | 100% | on | desktops and recent Macs |

**Benchmark** (busy late-game island at the Harvest Feast, 6 PM, scripted 30-second walk; your save is never touched):
- **on a device:** Settings → **Test performance**, or open the game with `?bench=all` (all three tiers) or `?bench=1`
  (current tier). Results show on screen and in `window.__benchResults`.
- **headless:** `npm run bench` (`--size 1024x768 --dpr 1 --vsync --out file.json` to change the setup).

Measured on an Apple M3 Pro, headless Chromium on Metal, 1280×800 at 2×, frame rate uncapped
([raw results](docs/bench/2026-10-11-apple-m3-pro.json)):

| Tier | Average FPS | 1% low FPS | Draw calls | Triangles | Canvas |
|---|---|---|---|---|---|
| Low | 354 | 119 | 282 | 89k | 1280×800 |
| Medium | 240 | 83 | 510 | 147k | 1600×1000 |
| High | 227 | 89 | 507 | 153k | 2560×1600 |

With vsync on, all three tiers hold 60 FPS on that machine.

**Robustness:**
- If the browser loses the WebGL context (common on iOS when memory is tight), the game pauses with a "Tap to continue" card and rebuilds.
- Furniture thumbnails are drawn by the main renderer, so there is no second WebGL context.
- Rooms free their GPU memory when you leave.

### Continuous integration

GitHub Actions workflows live in `.github/workflows/`:
- `ci.yml` runs on GitHub's standard runners: typecheck, build, size, tests, pacing, and Low-quality e2e.
- `gpu-e2e.yml` runs on a self-hosted Mac: e2e on the GPU plus the benchmark. It never runs for pull requests.

[docs/CI.md](docs/CI.md) explains, step by step, how to put the project on GitHub, which repository settings to check, and how to
install the self-hosted runner safely.

---

## Handoff notes (Ai Kids Games)

- **Slug:** `light-crossing`.
- **Build:**
  - `npm run build` produces one file, `dist/index.html`: **1,207 kB** (1.15 MiB) against a 2 MB limit.
  - It makes no network requests and works from `file://` and in `<iframe sandbox="allow-scripts">`.
- **Storage keys:** all keys start with `lightcrossing.`

  | Key | What | Size |
  |---|---|---|
  | `lightcrossing.slot0`, `.slot1`, `.slot2` | the three save slots | ~8 KB new game, ~22 KB when the story ends, ~23 KB a year later; budget 300 KB (a synthetic maxed-out save is ~151 KB) |
  | `lightcrossing.settings` | volume, text speed and size, read-aloud, quality, camera, controls, playtest switch | < 1 KB |
  | `lightcrossing.playtest.slot0`–`slot2` | only when playtest mode is on | up to 64 KB each |
  | `lightcrossing.__probe` | written and removed at start to test whether storage works | 0 |

  The save format is now version 3 with compact world objects. Version 2 saves from the first release upgrade automatically and keep everything.
- **Please recapture the site's preview images and cover art.** The island, interiors, seasons and HUD have all changed.
  Current screenshots are in [docs/screenshots/after/](docs/screenshots/after/), with the first release's in
  [docs/screenshots/before/](docs/screenshots/before/). Run `npx tsx scripts/screenshots.ts --out <folder>` to capture fresh ones
  (add `--quality low|medium|high` and `--scenes island-autumn,festival-feast` to pick).

---

## Project layout

```
src/
  core/      seeded RNG, value noise, typed event bus, math
  world/     deterministic island generator (same seed → same island)
  data/      ALL content: items, fish, bugs, fossils, furniture, recipes, villagers, dialogue,
             missions, challenges, achievements, tips, economy knobs
  sim/       game logic, no DOM or three.js (unit-tested headlessly)
  render/    three.js views: terrain chunks, instanced vegetation, curved-world shader, characters,
             buildings, interiors, particles, festival cutscene
  audio/     Web Audio engine (SFX, generative music, ambience)
  input/     keyboard / mouse / gamepad / touch → commands
  ui/        DOM overlay: HUD, dialogue, panels, Glowpad apps, screens
tests/       vitest (incl. full playthroughs, a year after the story, storage + migration from v2 fixtures)
e2e/         Playwright smoke tests
scripts/     pacing model, playtest analyzer, readability report, benchmark, screenshots, size check
docs/        CI setup, benchmark results, before/after screenshots
.github/     CI workflows
```

The simulation (`src/sim`) is decoupled from rendering. `Game` owns a JSON-serializable `GameState` plus an event
bus. Systems register daily hooks, per-frame hooks and interaction resolvers. The renderer and UI only read state
and react to events.

---

## Adding content

Adding content means adding data. No engine code needs to change.

- **A fish or bug**: add an entry to `src/data/fish.ts` / `src/data/bugs.ts`. It shows up automatically in spawning,
  the catalog, the museum (it gets a display), challenges and achievements.
- **A fossil**: add it to `src/data/fossils.ts`. Assessment can produce it and the fossil wing grows.
- **Furniture**: add it to `src/data/furniture.ts` (`furn.model` picks one of 46 procedural model types). Then add a
  recipe in `src/data/recipes.ts` (`id: 'r_<item id>'`, unlock `start` / `mission` / `card` / `friend` / `lumen` / `museum`).
  Set `buy > 0` to put it in the rotating shop stock.
- **Dialogue**: add lines to `src/data/dialogue/<personality>.ts` (per topic). `[happy]` prefixes set the portrait
  expression; `{player}`, `{catch}`, `{item}` and similar tokens are filled in. Keep lines short and simple:
  `npm test` checks every line's reading level (grade 6 at most, about grade 3 on average).
- **Clothing**: add a piece to `src/data/clothing.ts` (slot, shape, colors, pattern). It gets a 3D model, an icon and eight dye colors automatically.
- **A festival or birthday**: `src/data/festivals.ts`.
- **Seasonal content**: give a fish, bug, seed or recipe `seasons: ['winter']`. No `seasons` means all year.
- **A villager**: add one to `src/data/villagers.ts` (look, personality, likes, schedule, rewards), then place their plot
  in a mission via `plots: [...]` and `{ type: 'moveIn' }`.
- **A mission**: add it to `src/data/missions.ts`. Objectives can be:
  - `event`: count bus events, with filters such as `{ item: 'ladder' }`, `'min:size': 4`, `'prefix:id': 'seed_'`, and `sum`.
  - `state`: checked against state each tick (see `STATE_FNS` in `src/sim/quests.ts`).
  - `deliver`: hand items over in conversation.
  - `talk`: optionally gated by time of day with `afterHour`.

  Effects (`give`, `recipe`, `money`, `spawn`, `construct`, `moveIn`, `pockets`, `finale`, …) run on start or completion.
  `tests/quests.test.ts` validates every reference.
- **Daily challenges and achievements**: `src/data/challenges.ts`.
- **Onboarding tips**: `src/data/tips.ts`.
- **Economy tuning**: `src/data/economy.ts`. Run `npm run pacing` to check that the playthrough stays within 5.5–6.5 hours.

---

## Credits

Built with [three.js](https://threejs.org), the Web Audio API, TypeScript, Vite and Vitest/Playwright.
Inspired by the gentle joys of slow island living. All characters, names, items and assets are original.
