# Light Crossing

A cozy island life-sim for the browser. Arrive on sleepy **Driftlight Isle**, pitch a tent, befriend eight
neighbors, fill a museum, and make the island glow bright enough to hold the **Lantern Crossing** festival,
when lanterns drift out to sea and the old lighthouse shines again.

A full playthrough takes about **6 hours** (5 chapters, about 20 in-game days). After the credits you can keep playing.

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
| **Home** | Tent, then cottage, then house, paid for with loans at Lantern Hall. Inside: sleep, storage, and the Decorate editor |
| **Neighbors** | Chat daily, give gifts (they have likes and dislikes), and help with requests. Friends share recipes and gifts |
| **Museum** | Donate every new fish, bug and fossil. Completing a wing earns a reward |
| **Challenges** | 3 daily challenges and 44 tiered achievements earn **Lumens** for the Lumen Exchange |
| **Building** | Bridges and ramps (Lantern Hall permits) open up the far shores and the cliffs |
| **Island Glow** | The 1–5 lantern rating grows with neighbors, museum, decorations, flowers, friendships, and fewer weeds |

The **Glowpad** (Tab / Start) holds Missions, Map, Neighbors, Island Glow, Catalog, Journal, Challenges and Settings.

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
| Decorate (at home) | E on an empty spot; arrows move, E place/pick, R rotate, X store | D-pad, A, Y rotate, X store | tap |

Saves: 3 slots with autosave (every minute, at every new day, and when the tab is hidden). Saves are versioned and migrated
automatically. If storage is unavailable, for example in a sandboxed iframe, the game still runs and warns that progress won't persist.

---

## Build and run

Requires Node 18+ (developed on Node 24).

```bash
npm install
npm run dev        # local dev server (http://127.0.0.1:5173, or $PORT)
npm run build      # -> dist/index.html (one self-contained file)
npm test           # vitest unit + headless playthrough tests
npm run e2e        # Playwright: smoke test, file:// and sandboxed-iframe checks
npm run pacing     # pacing simulation (minutes per chapter)
npm run typecheck
```

`dist/index.html` works when double-clicked (`file://`) and inside a sandboxed `<iframe sandbox="allow-scripts">`.

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
tests/       vitest (incl. a full new-game → festival playthrough)
e2e/         Playwright smoke tests
scripts/     pacing simulation
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
- **Dialogue**: add lines to `src/data/dialogue.ts` (per personality and topic). `[happy]` prefixes set the portrait
  expression; `{player}`, `{catch}`, `{item}` and similar tokens are filled in.
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
