<!-- The plan the owner approved on 2026-10-13, kept as written. Later decisions are logged in
../CLAUDE.md under "Decisions". -->

# Plan: a 3D farm-builder for Ai Kids Games (working title "Farm WIP")

## Context

The owner wants a new game for aikids.games: a polished 3D farm-building and management game for ages 8–14. Kids design and grow a farm, run production chains, fill town orders, expand their land and decorate. It should offer 6–8 hours of story and goals, then endless play, on phone, tablet and computer.

It must feel clearly different from **Cliff Valley**, the site's 2D pixel farming life-sim:
- a 3D diorama managed from above, with no avatar, energy, mining or inherited farm;
- original content with no FarmVille or Zynga IP;
- kid-friendly by construction: no timers, wilting, premium currency, social features, streaks or red dots, and a player can never get stuck broke.

**Decisions so far**
- The brief stopped partway through "3D look and performance". The owner chose the repo's precedent defaults:
  - 60 fps on mid-range phones and tablets, with quality tiers and a governor;
  - a build budget of 3 MiB or less;
  - Chromium + WebKit browser tests on phone, tablet and desktop;
  - a headless bot that plays through the whole story;
  - the work stops before the production release.
- Naming: phase 0 proposes 5 web-checked names, and the owner picks one before the site step. "FarmerTown Ville" itself won't ship, because "-Ville" echoes the inspiration. The working slug is `farm-wip` (prefix `farmwip.`, hook `__farmwip`). Tuck Pop set the precedent with `blocks-wip`.

**Repo state (read-only so far)**
- Latest main is `origin/main` f331dd9 (release 2.7.0, Agentmon, 8 games). Local `main` is stale, so the branch is cut from the fetched `origin/main`.
- The main checkout belongs to another session and is on `game-trailers`, so it is never touched.
- The brief calls this the tenth game, but main has eight and no branch has a ninth. `site.order` and the lockfile get reconciled at the site step against whatever has landed by then.

## Ground truth from the repo (what I reuse)

- **Scaffold.** `npm run new-game -- farm-wip --title "Farm WIP"` (`scripts/new-game.ts`):
  - copies `templates/game-starter`, which already has the single-file Vite build, CSP, `scripts/check-build.mjs`, storage, test hook, capture route and Playwright smoke + sandboxed-iframe tests;
  - sets `site.status: "In development"`;
  - assigns ports from a slug hash with no collision check, so I verify them by hand.
- **Contract.** One `dist/index.html`, no network, prefix-only storage, read-only hook, capture route, unit + browser tests.
- **Three.js.** Pin **three 0.186.1** exactly, the same version as the other 3D games and the community-kit allowlist.
- **Copied with credit** (no shared package exists; games copy code and note the source):
  - WebGL 2 probe and friendly fallback: `games/space-sky/index.html`; context-loss card: `games/light-crossing/src/app.ts`.
  - Rim-light material: `withRim()` in `games/calex-cart/src/render/materials.ts`.
  - Merged low-poly builders and instancing: `games/light-crossing/src/render/models/geo.ts`, `games/light-crossing/src/render/instanced.ts`.
  - Quality tiers and FPS governor: `games/light-crossing/src/render/quality.ts`.
  - Placement ghost: `games/light-crossing/src/sim/placement.ts` + `src/render/placement.ts`.
  - Synth audio engine (moods and buses): `games/light-crossing/src/audio/engine.ts`; master chain: `games/tuck-pop/src/audio/engine.ts`.
  - Read-aloud using local voices only: `games/agentmon/src/ui/speech.ts`.
  - Settings model: `games/agentmon/src/game/settings.ts`.
  - Tips and stall hints: `games/light-crossing/src/ui/tips.ts`, `src/sim/hints.ts`.
  - Gamepad focus navigation: `games/theabonk/src/ui/focus.ts`.
  - Fake gamepad in e2e: `games/tuck-pop/tests/e2e/helpers.ts`.
  - Layout check (48 px targets, overlaps, notches): `games/light-crossing/e2e/lib/screens.ts`.
- **Test patterns.**
  - Headless bot, playthrough and pacing: `games/cliff-valley/tests/sim/bot.ts`, `games/light-crossing/tests/pacing.test.ts`.
  - Save fixtures and migrations: `games/light-crossing/tests/save.test.ts`.
  - One reviewable facts file with a `check` source per fact: `games/agentmon/src/data/facts.ts` and its `content.test.ts`.
  - Readability: `games/light-crossing/tests/readability.test.ts`.
  - Sim purity (no DOM, `Date` or `Math.random`): `games/tuck-pop/tests/unit/purity.test.ts`.
- **Heavy-test etiquette.**
  - Copy `games/agentmon/scripts/quiet-check.mjs` and `when-quiet.sh`.
  - Every e2e run, bot run or capture goes through them. **Exit 1 means busy, so wait; exit 75 means still busy after 2 h, so stop and report.**
  - Unit tests and browser tests never run at the same time.
- **Trademarks.** Add `farmville` and `zynga` to `TRADEMARKS` in `scripts/lib/manifest.ts`, plus a case in `apps/site/tests/manifests.test.ts`, as Tuck Pop did.
- **Brief.** Commit it as `docs/prompts/<slug>.md`, with the inspiration's title replaced by "[a farm-building social game]" per the repo convention, and add a row to `docs/prompts/README.md`.

## Game design

### How it differs from Cliff Valley
| | Cliff Valley | This game |
|---|---|---|
| View | 2D pixel art, walking farmer | 3D toy diorama managed from above, no avatar |
| Limits | energy, 12-minute day, fainting | no energy; the clock runs only while playing |
| Story | inherited farm, storm, mine, Heartstone | a town's sleepy **community farm** brought back for the Harvest Fair |
| Depth | life-sim, villagers, mining, fishing | layout, production chains, orders, planning, decorating |
| Crops | 26 crops + 5 fruit trees | 30 different-leaning crops (only Wheat, Strawberry and Pumpkin overlap) + 10 new orchard plants |
| Delivery | train (restoration board) | **a little river boat** to the town downstream |
| Look | parchment and wood UI, pixel palette | soft-lit diorama on a floating earth block; rounded white "toy" cards with sky, sage and butter accents |

### Time and kindness rules (built into the sim and tested)
- **Clock.** It advances only while the farm view is visible and active. Settings, dialogue, a hidden tab or the pause menu stop it.
  - 1 day = 8 minutes of play (dawn → day → dusk → a brief lantern night).
  - 1 season = 6 days, about 48 minutes.
- **Growth.** Crops take 1–10 minutes of play. Nothing wilts, spoils, gets sick or loses value from being left alone. Harvest-ready crops just wait.
- **Away bonus.** "While you were away" adds at most 10 minutes of growth, capped, and only ever helps. The wall clock is read in `main.ts`; the sim stays pure.
- **Safety net.** If coins can't buy the cheapest seed and nothing is growing or sellable, the farm dog digs up a free seed pouch. A property test proves recovery from every broke state.
- **No pressure features.** No energy, premium currency, purchases, ads, accounts, network, streaks or red dots. Counters are neutral pills.

### The farm and land
- **Grid.** About 64×64 tiles with stepped heights. The starting plot (16×16) sits beside a river.
- **Five expansions**, unlocked by farm level + chapter goal + coins:
  1. Meadow (big flat fields)
  2. Orchard Hill (raised terraces)
  3. Pond (ducks, rice paddies)
  4. Riverside (a second dock and boat)
  5. Hilltop (beehives, the fair lookout)
- Locked areas show as soft misty land with a sign.

### Crops
30 real crops, each with a real fact in the Crop Book:

| Family | Crops |
|---|---|
| Grains (5) | Wheat, Oats, Barley, Rice (wet tiles by pond or river), Buckwheat |
| Legumes (4) | Peanuts, Soybeans, Chickpeas, Clover (cover crop) |
| Fibre (2) | Cotton, Flax |
| Sugar (1) | Sugar Beet |
| Vegetables (12) | Onion, Garlic, Cabbage, Turnip, Leek, Parsnip, Zucchini, Cucumber, Bell Pepper, Okra, Butternut Squash, Bok Choy |
| Fruit (4) | Strawberry, Watermelon, Pumpkin, Rhubarb |
| Herbs (2) | Chamomile, Lavender |

- Each crop has 1–2 seasons. Crops planted earlier still finish after the season turns.
- **Rain days** water every field.
- **Quality stars (1–3)** come from care: watering or rain, compost fertilizer, the rotation bonus and bee pollination.

### Bonuses that teach
- **Rotation.** Each field remembers its last crop family. A different family gives +quality. A legume after grain gives a "nitrogen boost", which is the real reason farmers rotate.
- **Bees.** Hives pollinate orchard trees and flowering crops within a radius, for +yield. Includes a real almond-and-bee fact.
- **Compost.** A compost bin turns harvest scraps into fertilizer.

### Orchards
Trees and bushes produce again and again:
- Trees: Plum, Apricot, Lemon, Fig, Walnut, Almond.
- Bushes: Raspberry, Gooseberry, Blackcurrant, Hazelnut.

### Animals
- Chickens, cows, goats, sheep, ducks, bees, and the farm dog, which greets visitors and digs up the safety-net pouch.
- Each has a coop, barn, pen, hive or kennel.
- Feeding and brushing raise happiness from content → happy → delighted. Happiness never drops below content.
- Happier animals give faster, higher-star products, and unfed animals still produce slowly.

### Production
Seven buildings, each with 3 upgrade levels (more queue slots, faster). About 40 recipes, each checked by tests to be producible and useful:

| Building | Example recipes |
|---|---|
| Mill | wheat → flour, oats → oat flakes, sugar beet → sugar, chickpeas → chickpea flour |
| Bakery | bread, cakes, oat bars, pumpkin pie, jam tarts |
| Dairy | butter, cheese, yogurt, goat cheese |
| Juice press | lemonade, watermelon juice, plum juice |
| Jam kitchen | strawberry, rhubarb, raspberry, fig and blackcurrant jams; honey jars |
| Loom | wool → yarn → sweater or scarf, cotton → cloth, flax → linen, lavender sachets |
| Kitchen | veggie soup, garden bake, hummus, stir-fry, squash soup, chamomile tea |

### Build mode
- **Placing:** place, move and rotate (90°) on the grid with footprint snapping and a ghost preview showing valid or invalid spots.
- **Undo:** a 30-step stack of actions.
- **Painting:** paint paths by dragging; fences connect automatically; plant flower beds.
- **Beauty rating:** decor points + variety + paths that connect buildings. It feeds the goals, visitors and fair bonus.
- **Decoration sets** are earned through play: fair prizes, chapters and neighbors.

### Story and cast (original; every name web-checked in phase 0 and logged)
- **Setting.** A small river town once held a Harvest Fair every autumn, supplied by its **community farm**, which the whole town shares. The farm has gone sleepy and the fair hasn't been held for years. The town hands the player the gate key.
- **Cast:**
  - a mentor, the farm's retired keeper and a beekeeper;
  - 4–5 town characters who place story orders: baker, school cook, ferry keeper, librarian and the fair judge;
  - 3 neighbor farmers with personalities: a tidy orchardist, a goat-mad family and a rice-and-ducks river farmer.
- **Chapters.** 8 chapters, roughly one per season, from a short prologue in late winter to the **Grand Harvest Fair** in the second autumn. Each chapter has a goal list, story requests and unlocks.
- **Ending.** The finale leads to credits, then endless play with rotating goal sets and a fair every season.
- **Seasonal fair.** At each season's end, enter up to 3 items (crop, animal product, made good). They are judged on stars + variety, against neighbor entries, for rosettes and decoration prizes.
- **Orders.**
  - The town order board has 6 slots, built from what you can make right now (tested). Orders can be skipped or refreshed freely.
  - Load the **boat**, which sails downstream for about 2 minutes of play and returns with coins, XP and thank-you notes.
  - Story requests come from characters.
- **Neighbors** (computer-controlled):
  - **Trade:** daily swap offers at fair value.
  - **Co-op orders:** you and a neighbor fill a big order together.
  - **Visits:** a neighbor arrives by boat, strolls your paths, admires your beauty rating and leaves a small gift.
  - You can view their farm, rendered read-only with the same engine.
- **Progression:** farm levels (XP from everything), chapter goal lists and the goal tracker.

### Learning (light)
- **Crop Book and Animal Book.** Every real fact lives in one file, `src/data/facts.ts`, with a `check` source and simple wording. Tests enforce short sentences and readability.
- **Farm Ledger.**
  - SVG charts of grown, made and earned per season.
  - A **profit per crop** hint (coins per minute of growing) that teaches planning.
- **Market.** Prices shift a little by season. Arrows show good times to sell or store. The barn keeps goods forever.

### Controls and UX
- **Touch:**
  - tap to harvest, plant and collect;
  - drag with a seed selected to plant a row;
  - one-finger drag to pan, pinch to zoom, two-finger twist to rotate in 45° steps.
- **Mouse and keyboard:**
  - click; drag empty ground to pan; wheel to zoom;
  - Q/E rotate, WASD or arrows pan;
  - B build, R rotate a piece, Ctrl/Cmd+Z undo, 1–6 tools, Esc back.
- **Gamepad:**
  - the left stick moves a tile cursor and the camera follows; the right stick pans;
  - LT/RT zoom, LB/RB rotate, A acts, B goes back, X opens tools, Y opens build, Start opens the menu;
  - menus use focus navigation.
- **Tap picking.**
  - A raycast against a stepped-height grid (DDA), with tall objects picked by their screen-space bounds first.
  - Generous hit areas and a camera that frames near-miss taps.
  - A **unit test** proves every tile in the full map is reachable at every supported screen size (phones portrait/landscape, tablets, desktops, notched insets), across 8 rotations: the clamped camera can frame it inside the HUD-free area, `pick(project(center))` returns the tile, and it is at least 48 CSS px at max zoom.
- **HUD:**
  - a crisp DOM overlay with 48 px targets;
  - always-visible goal tracker, coins, level and season/day clock;
  - bottom tool bar: Farm, Seeds, Build, Orders, Books, Ledger, Menu.
- **Settings:** music/SFX volume, larger text, read-aloud for dialogue and tips (local voices only, fails quietly), colorblind shape icons for readiness and stars, reduced motion.
- **Onboarding:** a one-time tip the first time each mechanic appears, and gentle hints after a stall.

### Look, sound and performance
- **Engine:**
  - WebGL 2 is probed inline before boot, with a friendly "needs 3D graphics" card. Context loss shows a "Tap to continue" card.
  - Lambert vertex-colour low-poly with rim light and a hemisphere + sun rig. The sun colour and angle follow day → dusk.
  - Seasonal palettes: blossom, lush, amber leaves, soft snow.
  - Rain and petal FX, animated water.
  - Soft shadows on medium/high only, with static shadow updates; blob shadows on low.
  - Every model is built in code: crops at 4 growth stages, animals with idle loops, buildings at 3 levels, decor, the boat and small NPC figures. Instancing keeps draw calls low.
- **Budgets:**
  - draw calls about 120 high / 70 low;
  - 60 fps on mid-range phones via tiers + governor;
  - build ≤ 3 MiB, aiming for about 1.8 MB;
  - `?quality=low` and `E2E_LOW=1` keep CI's software WebGL working.
- **Audio:** WebAudio only. Gentle generative music per season and time of day; synthesized SFX for planting, harvest pops, animals, coins and the boat horn; no audio files.

## Architecture (`games/<slug>/`)
- `index.html`: inline WebGL 2 probe and fallback card.
- `src/sim/` is **pure** (no DOM, `Date` or `Math.random`; seeded RNG):
  - `state`, `clock`, `grid`, `fields`, `crops`, `orchards`, `animals`, `production`, `market`, `orders`, `boat`, `neighbors`, `fair`, `story`, `goals`, `beauty`, `build` (placement + undo), `level`, `safety`, `catchup`, `ledger`;
  - `actions.ts` is a single dispatcher, so every player command is an action. The bot, undo and tests share it.
- `src/data/`:
  - `crops`, `orchard`, `animals`, `items`, `recipes`, `buildings`, `decor`, `land`, `cast`, `chapters`, `dialogue`, `tips`, `tuning`;
  - **`facts.ts`** holds all real-world facts in one reviewable file.
- `src/render/`:
  - `renderer`, `quality` (+ governor), `camera`, `terrain`, `water`, `lighting`, `materials` (rim), `geo`, `instanced`, `fx`, `ghost`, `view` (sim → scene sync);
  - `models/`: crops, trees, animals, buildings, decor, boat, people.
- `src/input/`: `pointer` (gestures), `keyboard`, `gamepad`, `pick` (pure math, unit-tested), `controller` (intents → actions per mode).
- `src/ui/`: `h` (tiny DOM helper, no framework), `hud`, `goals`, `panels/*`, `charts` (SVG), `icons` (SVG in code + colorblind shapes), `focus`, `tips`, `speech`, `style.css`.
- Other `src/`:
  - `audio/`: `engine`, `music`, `sfx`;
  - `save/`: versioned saves with migrations, two keys (`save`, `settings`) + probe;
  - `capture.ts`: `?scene=title|farm|build|fair|ending&seed=N`, never saves;
  - `hook.ts`: frozen snapshot plus capture helpers.
- `tests/`:
  - `unit/`: rules, economy, chains, orders, picking, saves, purity, content, readability, kid-safety and IP-name scans;
  - `sim/`: bot, playthrough, pacing;
  - `e2e/`.
- `scripts/`: `check-build.mjs` (3 MiB), `quiet-check.mjs`, `when-quiet.sh`.

## Phases
For every phase:
1. Check `df -h ~` and check `git log` for foreign commits.
2. Build the phase.
3. Run typecheck + unit tests, then browser tests through the quiet check.
4. Play it in the browser pane.
5. Update `games/<slug>/CLAUDE.md`.
6. Commit as "Farm WIP, phase N: …".

| # | Phase | What lands |
|---|---|---|
| 0 | Setup and names | `git fetch`; a worktree at `~/Documents/FarmerTown/AI-Kids-Games-farm` on branch `farm-wip` from `origin/main`; `npm ci`; scaffold; blocklist + site test; brief + README row; `docs/PLAN.md`; game `CLAUDE.md` (resume guide, rules, commands, decisions, **IP log**, progress); a root `CLAUDE.md` pointer; quiet-check scripts; **5 name proposals**, web-checked against the App Store, Google Play, Steam, itch.io and the web, recorded with results; cast and place names checked |
| 1 | Engine and world | renderer, WebGL 2 gate, context loss, diorama terrain with all areas (locked look), camera pan/zoom/45° rotate, unified input (pointer, keys, gamepad cursor), **raycast picking + reachability test**, play-time clock, save v1, settings, HUD shell, capture route, hook, quality tiers |
| 2 | Fields and crops | plant, harvest, drag-to-plant, 30 crops (data, facts, models at 4 stages), seasons, rain, stars, rotation, compost, coins, seed shop, market, barn, safety net, away bonus |
| 3 | Orchards and animals | 10 orchard plants, 7 animals + housing, feed and brush, happiness → quality, bee pollination, the dog |
| 4 | Production | 7 buildings, about 40 recipes, queues, upgrades; tests show every chain is closed |
| 5 | Build mode and land | place, move, rotate, snap, undo, paths, fences, flowers, decor, beauty rating, 5 expansions |
| 6 | Town and neighbors | order board, river boat, story requests, 3 neighbor farms (trade, co-op, visits, read-only farm view) |
| 7 | Story and progression | cast and dialogue, 8 chapters + goal lists, farm levels, onboarding, stall hints, seasonal fairs, Grand Harvest Fair, ending + credits, endless goals |
| 8 | Books and ledger | Crop and Animal Books, the facts review pass, Ledger charts, profit-per-crop hint |
| 9 | Look and sound | day → dusk lighting, seasonal looks, rim light, weather, animations, synth music and SFX, full accessibility settings |
| 10 | Balance, performance, QA | bot playthrough + 6–8 h pacing test, perf budgets and governor on throttled profiles, e2e matrix (Chromium/WebKit × phone/tablet/desktop), layout check, lookalike/IP review |
| 11 | Name and rename | **the owner picks the name**: rename slug, prefix, hook, ports and title (no saves exist yet), re-run every check |
| 12 | Site step | listing `game.json` ("Ready to play"), `import-game`, `manifests`, storage audit + `STORAGE_AUDIT.md`, cover/logo/OG art, capture script + previews (and a trailer if the trailers release has reached main), site e2e entries, `npm run check`; **stop before the production release** (pushing or opening a PR only when the owner says so) |

## Verification and definition of done
- **Content and play:**
  - all content above ships;
  - a headless bot plays from a new farm to the credits, and the pacing test puts the story at 6–8 hours of play;
  - endless goals keep coming after the credits.
- **Unit tests:** sim purity, time and kindness rules (no decay anywhere, the safety-net property), closed chains, satisfiable orders, the every-tile reachability test, save migrations with fixtures, the prefix-only storage audit, facts/readability/kid-safety/IP scans.
- **Browser tests** (run only when the quiet check exits 0):
  - boot with no console errors and no requests to other origins;
  - the sandboxed iframe works;
  - a save survives a reload, and only prefix keys exist;
  - the capture route saves nothing;
  - the no-WebGL 2 fallback card shows;
  - touch tap/drag-plant/pinch/twist, keyboard, and a fake-gamepad run all work;
  - 48 px layout checks at phone, tablet and desktop sizes, plus reduced motion.
- **Builds and repo checks:** each game's `npm run build` stays under budget, and `npm run check`, `manifests -- --check` and `audit-storage` all pass.
- **Hands-on:** I play it myself in the browser pane at phone, tablet and desktop sizes.

## Risks
- **Scope is very large.** Mitigations: a data-driven content layer, one low-poly model kit, and the bot catching balance holes early.
- **Phone performance with hundreds of crop tiles.** Mitigations: instancing per crop and stage, static shadows, tiers + governor, and draw-call budgets tested via the hook.
- **CI has only software WebGL.** The low tier must pass on SwiftShader, as Tuck Pop's does; otherwise the game joins `LOCAL_SUITES`.
- **Other sessions.** The quiet check gates heavy runs, origin/main is merged before the site step (lockfile, trailers branch), and the work stops if foreign commits appear.
