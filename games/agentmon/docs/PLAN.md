<!-- The plan the owner approved on 2026-10-13 ("Plan approved as written"), kept as written. Later decisions are logged in ../CLAUDE.md under "Decisions". -->

# Agentmon — plan

## Context
Ai Kids Games (monorepo `~/Documents/AI-Kids-Games`, main clean at 1f6721d, 6 games live) gets a
new game: **Agentmon**, an original creature-befriending pixel RPG for ages 7–12 (~8 h story +
post-game). The brief is the spec. This plan fixes the design, the architecture, the phase order,
the tests, and the site/CI work so the build can run phase by phase and resume from the game's
`CLAUDE.md` in any later session.

**Your decisions (asked):**
- **One energy bar.** Friendly bumps drain it, your own moves cost a little, and Rest refills some. At 0 the creature is tuckered out.
- **Smarter CI change detection.** CI picks the games to test from what actually changed.

**Notes:**
- The site has 6 games, so Agentmon is card 7 (card 8 if another game lands first). The grid is tested at 7 and 8.
- **Backup name:** *Beaconbound*. "Agentmon" uses the "-mon" ending that two big franchises use, which is the likeliest reason you'd need the backup. I'd run a trademark search on either name before launch.
- **Disk:** only 3.9 GB is free.
  - I'll keep browser-test artifacts to failures only (no video) and delete test results after each run.
  - If free space drops under 2 GB, I'll stop and ask you.

## Ground truth from the repo (what I reuse)
- **Scaffold:** `npm run new-game -- agentmon --title "Agentmon"` (scripts/new-game.ts).
  - It sets the `agentmon.` prefix, `window.__agentmon`, its own ports, `game.json` and `CLAUDE.md`.
  - The starter's `src/storage.ts` (probe, try/catch, memory fallback) and the build CSP in `vite.config.ts` stay.
  - `scripts/check-build.mjs` stays, with its budget raised from 2 MB to **2.5 MB**.
- **Cliff Valley code, copied and adapted** (games are independent projects with no shared package):
  - `render/pixelcanvas.ts` (pixel buffer, outline, darken/lighten)
  - `render/atlas.ts` (shelf packer, 1 px extrude, nearest-neighbour CanvasSource)
  - `render/renderer.ts` (Pixi 8 WebGL with Canvas fallback, roundPixels, integer zoom, context-loss handling)
  - `core/rng.ts`
  - `audio/audio.ts` (gesture unlock, music and SFX buses)
  - its sim/render split and DOM UI pattern
- **Glass joystick:** TheaBonk's `input/stick.ts` (pure stick response) and `ui/glass.css` (its header says it is "self-contained so sibling games can adopt it").
  - These are copied, together with the parts of `input/glassLayout.ts` I need.
  - A new small controller, `input/touch.ts`, has one floating stick, big **A/B** glass buttons and a Menu button.
  - TheaBonk's twin-stick camera code isn't needed.
- **Versions:** pixi.js ^8.22.0 (as Cliff Valley), vite ^8.3.4, vitest ^5.0.3, @playwright/test ^1.64.0, TS ~5.9.3. The lockfile should then only gain agentmon's workspace entries.
- **Site:**
  - The grid (`apps/site/src/lib/grid.ts`) already balances any count: 7 → [2,2,3], 8 → [2,3,3].
  - Category rows start at 12 games.
  - The site has no "RPG" genre yet. It has to be added in three places:
    - `GENRES` in `scripts/lib/manifest.ts`
    - the enum in `docs/game.schema.json`
    - the `Category` type in `apps/site/src/data/games.ts`

## Game design

### Elements (8 original, each has 2 strengths and 2 weaknesses)
| Element | Color + icon | Strong vs | Weak vs (takes ×1.5 from) |
|---|---|---|---|
| Flare | orange, flame | Leaf, Frost | Tide, Stone |
| Tide | blue, droplet | Flare, Stone | Leaf, Volt |
| Leaf | green, leaf | Tide, Glow ("plants drink light") | Flare, Gust |
| Stone | brown, hexagon | Flare, Volt | Tide, Frost ("frost cracks rock") |
| Gust | mint, swirl | Leaf, Glow ("blows out a glow") | Frost, Volt |
| Frost | ice-lilac, snowflake | Stone, Gust | Flare, Glow |
| Volt | yellow, bolt | Tide, Gust | Stone, Glow ("light calms static") |
| Glow | pink, 4-point star | Frost, Volt | Leaf, Gust |

- **Multipliers:** super ×1.5 and resisted ×0.67, both set in the tuning file.
- **Resistance rule:** if X is strong vs Y, then X resists Y. No element is strong against one that is strong against it, so the chart stays consistent.
- **No immunities.**
- **Colorblind mode** adds the icon to every bar and button, plus a letter badge.

### Roster: 16 families × 3 stages = 48, plus 4 guardians = 52
Two families per element. Each has a real inspiration for its fact page (9 animals, 4 plants, 1 weather, 2 minerals).

**What every design avoids:**
- the archetypes of other franchises: fire lizard, electric mouse, water turtle, plant dinosaur, seal, owl, fox, bee, seahorse, jellyfish, magnet, snowflake body, legendary birds/dogs/deer/lions/whales/dragons;
- any capture device anywhere.

| Element | Inspiration | Look (stage 1 → 3) | Draft names |
|---|---|---|---|
| Flare | Popcorn kernel | kernel with a popcorn puff of hair → fluffy cloud mane with an ember belly | Kernip, Poplet, Fluffkorn |
| Flare | Capybara (hot springs) | steamy towel on its head → a tiny hot spring on its back | Bathlet, Steambly, Thermabara |
| Tide | Manatee | baby with a sea-grass scarf → gentle giant with a coral crown | Drifty, Lullatee, Grandatee |
| Tide | Tardigrade | plump 8-legged bean → mossy coat → dew-crystal armour | Dewpud, Mossbub, Hardigrade |
| Leaf | Fern fiddlehead | curly-head sprite → unrolled frond fan | Fiddlit, Frondle, Fernadore |
| Leaf | Leafcutter ant | ant with a leaf umbrella → leaf-banner knight | Snipsy, Leafhauler, Canopant |
| Stone | Amethyst geode | stone egg with a crystal crack → crystal crown | Druzling, Druzette, Druzarch |
| Stone | Wombat | digger pup → boulder-backed burrower | Burrowby, Burrowbat, Bouldwom |
| Gust | Maple "helicopter" seed | one spinning wing → maple wind sprite | Spinnet, Twirlwing, Maplegale |
| Gust | Hummingbird | flower-hat chick → shimmering wind dancer | Hummet, Whirrbird, Galehum |
| Frost | Hailstone (layers) | layered ice ball with mittens → storm-cloud castle | Hailbit, Hailroll, Hailcastle |
| Frost | Snow leopard (scarf tail) | fluffy cub → frost-rosette elder | Flurrcub, Flurrtail, Flurrdane |
| Volt | Platypus (electric sense) | zigzag-bill pup → storm surfer | Buzzbill, Zipbill, Voltabill |
| Volt | Lemon battery | lemon with copper and zinc buttons → peel-cape lantern knight | Zestle, Zestwick, Citrivolt |
| Glow | NZ glowworm | lantern-tailed grub → cave-chandelier | Glimlet, Glimmery, Lanternella |
| Glow | Fluorite crystal | cube critter → rainbow prism | Glintle, Prismble, Fluorelle |

**Guardians** (single stage, always befriended through a quest, never by luck):

| Element | Concept | Draft name |
|---|---|---|
| Glow | aurora: a giant floating paper-lantern being trailing aurora ribbons (the finale guardian) | Aurelune |
| Frost | glacier and musk-ox wool: a shaggy, gentle snow giant | Frostmantle |
| Stone | sandstone arch: a long-legged giant whose body is a walk-under arch | Archwyn |
| Tide | Moon and tides: a giant moon snail carrying a tide-pool garden | Tidecrest |

**Name checks:**
- Every name gets a web search against monster-taming franchises and well-known games before it is final.
- Names that collide are replaced.
- Every design goes through a recorded resemblance review (phase 12).

**Starter partners** (deliberately *not* the fire/water/grass trio): Spinnet (Gust), Druzling (Stone) or Buzzbill (Volt). You befriend your pick in the tutorial.

### World and story (region: *Sunreach*)
**Route:**
1. **Brightmoor**: home town, with the Field Agent Academy.
2. Meadow Path to **Saltwhistle** (coast). Trial 1, Lighthouse: push blocks onto switches. Tide Keeper.
3. Cliff Road to **Mossgrove** (forest). Trial 2, Canopy: vines and color gates. Leaf Keeper.
4. Whisper Woods and dark Glimmer Cave (needs Glow light) to **Cragtop** (mountain). Trial 3, Old Mine: power switches, Stone boulders, moving platforms. Volt Keeper.
5. Canyon Trail to **Dunehollow** (desert canyon). Trial 4, Sunstone Canyon: light beams and mirrors. Flare Keeper.
6. Frost Pass (Flare melts ice walls) to **Frostfall** (icy peak). Trial 5, Summit: ice sliding. Frost Keeper.
7. Gust updrafts to the **Sky Island**. Trial 6, Beacon Spire: every mechanic plus wind currents. Glow Keeper.

**Finale:** relight the last Beacon, meet Aurelune, then a celebration and the credits.

**Cast:**
- Mentor: Chief Agent Nell.
- Friendly rival: Juno. Starts as a show-off and grows into a teammate; meetings at 5 story points.
- The 6 Trial Keepers.
- About 30 townspeople with about 20 small side quests.

**The misguided group: the Showcase Club**
- They are collectors who want Agentmon in a glittering show.
- Their "lure towers" call Agentmon to them. Without meaning to, the towers make the static fog.
- Story ending: they understand, switch the towers off, and turn the show into an open garden where Agentmon come and go freely. Nobody is punished.

**Field abilities:**
- Each one unlocks once you've befriended any Agentmon of that element; it doesn't have to be on your team:
  - Leaf: snip vines
  - Stone: shove boulders
  - Tide: paddle across water
  - Glow: light dark caves
  - Flare: melt ice walls
  - Gust: ride updrafts
  - Volt: power machines
  - Frost: freeze stepping stones
- The needed element is always available, and guaranteed visible, just before its first gate.

**Post-game:**
- The 3 other guardians, each found through a quest.
- Field Guide completion.
- The Challenge Tower, with local best-floor records.
- Keeper and rival rematches with stronger teams.

### Battle (pure logic)
- **Format:** 1 vs 1, teams of up to 6, switching uses your turn.
- **Stats:** Energy, Power, Guard, Speed. Levels 1–50.
- **Energy (one bar):**
  - Hits drain it; moves cost 0–20%.
  - Every creature always has a free 0-cost move, so it can never get stuck.
  - **Rest** restores about 25% and uses the turn.
  - At 0 it's tuckered out: it naps and comes back after battle.
- **Damage:** move power × Power/Guard × level factor × element × same-element bonus ×1.2 × a seeded 0.9–1.1 spread. No critical hits.
- **About 90 moves:** about 11 per element plus a few neutral ones. They cover attacks, buffs, shields, and the 5 mild statuses:
  - Sleepy: skips a turn, wakes when bumped
  - Dizzy: may wobble and miss
  - Soaked: slower, and takes more from Volt
  - Toasty: loses a little energy each turn
  - Chilly: moves cost more
  - Each status lasts 2–3 turns and clears after battle.
  - Each has an icon and a one-sentence tooltip.
- **Traits:** each species has a gentle passive trait (e.g., "Cozy: Rest restores a bit more"). Each individual has a personality that sets its favorite snack and the moods it shows when you befriend it.
- **Hints (on by default):**
  - "Super!" or "Not very strong" badges on moves.
  - A ★ on the suggested move.
  - Plain tooltips everywhere.
- **Speed:** 1×/2×; tap to skip any animation.
- **Shared experience:** a setting, on by default.
- **AI by difficulty:**
  - Easy: weighted random among sensible moves.
  - Normal: one-turn look-ahead that manages energy.
  - Hard: two-turn look-ahead with switching and well-timed rests.
  - Difficulty also scales wild and Keeper levels. All values live in `tuning.ts`.
- **Losing:** you warp to the last Rest Stop, fully healed, with nothing taken.

### Befriending (no luck grind, nothing gambling-like)
- **When:** Befriend becomes available when a wild creature's energy is at or below 40%.
- **Spark Ring (default):** a spark sweeps around a heart ring. Tap when it crosses the glowing arc; 3 sparks in all. Each hit fills the heart.
- **What makes it easier:** a bigger arc and a slower spark come from:
  - how tired the creature is
  - offering its favorite snack (any snack helps a little)
  - matching its mood emoji
  - the difficulty setting
- **No hidden roll:** your skill and the visible factors decide the result.
- **Mood Match (no timing):** a mode in Settings for accessibility. You pick the action that fits the mood the creature shows.
- **A miss:** lowers the creature's interest. At zero it wanders off peacefully and shows up again later. You never lose anything.
- **New friends:** they join your team, or go to the **Agent Base**. That's a cozy habitat where you can pet them and give snacks.
- **Nicknames:** chosen from a generated name list. No typing. The player's own name works the same way.
- **Rare "shimmer" colors:**
  - **Guaranteed:** a species' shimmer appears visibly in its habitat once its Field Guide page earns 3 research stars.
  - **Small bonus:** shimmers also appear now and then by chance, at no cost to the player.

### Exploration and puzzles
- **Movement:** grid-based with smooth steps.
- **Wild Agentmon** walk around visibly in grass, caves and water, with shy, curious or sleepy behaviour. Touching one starts a battle, and kids can walk around them. There are no hidden random encounters.
- **Tap-to-move** pathfinds to the tile, NPC or creature you tap.
- **Puzzle engine (pure logic, data-defined):**
  - blocks and switches
  - ice sliding
  - beam emitters, mirrors and receivers
  - color switches and gates
  - moving platforms
  - element obstacles
  - Every puzzle room has a **Reset** button, so it can never soft-lock.
  - A solver test proves every room is solvable.
- **Rest Stops** heal for free and set the respawn point.
- **Shops** sell snacks, berries and gear for coins. Coins come from battles and quests, and every reward is fixed (no random drops).

### UX
- **Menus are DOM; the world is a Pixi canvas.** DOM gives crisp, scalable text, screen-reader labels and focus navigation.
  - Touch targets are at least 48 px.
  - Menus: Team, Bag, Field Guide, Map, Quests, Settings, Save.
- **Settings:**
  - text size
  - read-aloud
  - battle speed
  - hints
  - difficulty (changeable any time)
  - reduced motion
  - colorblind mode
  - volume: master, music, effects, voice
  - befriend mode
  - experience sharing
- **Read-aloud:** browser `speechSynthesis` with local voices only (`localService`). Some browsers' cloud voices would send text over the network, so those are skipped. If no local voice exists, it fails quietly.
- **Tutorials:** a one-time interactive tutorial the first time each mechanic appears.
- **Stuck helper:** if you idle, retry a puzzle again and again, or wander off-route, a gentle hint appears and the quest arrow pulses.
- **Inputs:** touch (tap-to-move, glass stick, A/B), keyboard and mouse, and gamepad (standard mapping).

### Art and audio
**Art:**
- **Sizes:** 16×16 tiles, 16×24 overworld characters, 32×32 battle sprites.
- **Overworld creatures:** each creature is described once as a small shape recipe (body, ears, eyes, pattern, accessories). It is drawn as pixel art at 32×32 for battle and 16×16 for the overworld and icons.
  - An automatic outline and top-left shading keep the style consistent.
  - Hand pixel fixes on top where needed.
- **Characters:** layered from a palette (skin tones, hair, outfits), as in Cliff Valley.
- **Everything is baked into atlases at startup.**
- **Effects:** bouncy hits, sparkles and growth glows. No effect flashes more than 3 times a second; a unit test checks every effect's timeline.

**Audio:**
- **Music:** about 20 original chiptune tracks from hand-written motifs, played by a lookahead sequencer:
  - 6 towns
  - route moods
  - dungeons
  - wild, Keeper and rival battles
  - the guardian theme
  - title, Base, credits
- **Effects and cries:** synthesized SFX, plus a procedural cry for each species (pitch from size, tone from element).
- **Mix:** master bus → DynamicsCompressor limiter, with per-bus volume settings.

## Architecture (`games/agentmon/`)
```
src/core/      pure logic, no DOM or Pixi: rng, types, battle/ (engine, damage, status, ai, befriend),
               creatures (stats, xp, growth), world/ (map model, movement, encounters, triggers),
               puzzles/ (engine + solver), story (flags, scripts), quests, save/ (schema, codec, migrations)
src/data/      elements, species, moves, learnsets, items, shops, maps/ (ASCII + legend, autotiled),
               dungeons, trainers, dialogue/, quests, facts.ts (ALL real facts, one reviewable file),
               names.ts (nickname list), music/ (motifs)
src/tuning.ts  every balance number
src/art/       palette, pixelcanvas, atlas, creature shape recipes, tiles, characters, effects
src/render/    Pixi scenes: overworld (chunked RenderTextures), battle, befriend, evolution, base
src/ui/        DOM screens and menus, dialogue + read-aloud, tooltips, glass touch controls
src/input/     keyboard, pointer, gamepad, stick (TheaBonk), unified actions
src/audio/     engine, sequencer, sfx, cries, mixer/limiter
src/game/      scene state machine, autosave, test hook, capture routes, tutorials and hints
tests/unit  tests/sim (balance, level curve, playthrough bot, pacing)  tests/e2e  scripts/  reports/
```

**Saves:**
- **Keys:** `agentmon.slot1–3`, `agentmon.settings` and `agentmon.records`.
- **Probe:** `agentmon.__probe`.
- **Backup:** `agentmon.slotN.bak` is written only just before a version migration.
- **Format:** versioned, with chained migrations.
- **Compact creature codec:** each friend is a short base64 string. The Base holds up to 240.
- **Size:** the budget test's worst case is about 64 KB per slot, well under the 300 KB limit.
- **Autosave:** on map change, after battles, and on hide.
- **Full storage:** shows a friendly note and keeps the old save.

**Hooks and capture:**
- `window.__agentmon.snapshot()` returns frozen copies only.
- Capture routes, all `&seed=`, which never save:
  - `?scene=battle` (a super-effective hit)
  - `befriend`, `evolution`, `town`, `dungeon`
  - `guide`, `sheet` (all 52 creatures), `title`

## Phases (each one: run the game, run its tests, update games/agentmon/CLAUDE.md, commit)
**Before every commit:** check `git log` for foreign commits.

**Test order:** one heavy browser run at a time, never alongside another test run.

**Branch:** `agentmon` from main.

0. **Scaffold.**
   - `new-game`, deps, a 2.5 MB build check.
   - CLAUDE.md with the plan, commands and status.
   - Confirm the lockfile only gains workspace entries.
1. **Core rules.**
   - rng, elements chart, stats, damage, energy, statuses, xp and growth, battle engine, AI, befriend math, tuning.
   - Save codec, migrations, budget.
   - Unit tests.
2. **Content data.**
   - 52 species (names checked), about 90 moves, learnsets, items, snacks and gear.
   - Trainers, and `facts.ts` (each fact checked against a reputable source and noted in the file).
   - **Balance sim:** thousands of AI-vs-AI battles with win-rate bounds per element, species and move.
   - **Level-curve check:** for each starter × each difficulty.
3. **Art foundation.**
   - Pixi renderer, atlas, palette, shape recipes for all 52 creatures, tiles, characters.
   - The `?scene=sheet` route.
   - First visual and resemblance review.
4. **Overworld.**
   - Map format and autotiling, movement and collision, camera.
   - NPCs, DOM dialogue with read-aloud, visible encounters.
   - Inputs: tap-to-move, glass stick, A/B, keyboard, gamepad.
   - Rest Stops and shops.
5. **Battle and befriend.**
   - Battle scene and UI (hints, tooltips, 1×/2×, skip).
   - Spark Ring and Mood Match.
   - Evolution animation; switching; losing → Rest Stop.
6. **Puzzles.**
   - The engine and all 6 Trials.
   - A solver test for every room; Reset; field abilities.
7. **World and story.**
   - 6 towns, routes, coast, forest, mountain, canyon, icy peak, sky island.
   - Full story script, rival, Showcase Club, side quests, Keepers.
   - Finale, credits, post-game (Tower, rematches, guardians).
8. **Menus and onboarding.**
   - Team, Bag, Field Guide, Map, Quests, Settings, Agent Base habitat.
   - 3 save slots with autosave and storage-full handling.
   - Tutorials and the stuck helper.
   - Reading-level test over all dialogue: short sentences, readable for ages 7–12.
9. **Audio.** Sequencer, about 20 tracks, SFX, cries, mixing pass with the limiter.
10. **Headless bot and pacing.**
    - The bot plays new game → credits on Easy, Normal and Hard over several seeds, with a soft-lock fuzzer.
    - The pacing model targets 8 h ±10% on Normal and writes `reports/pacing.md`.
    - Then a balance retune.
11. **Browser tests** (Playwright; Chromium and WebKit; phone, tablet, desktop):
    - Touch-only opening, with CDP touches: new game → first befriend → first battle → first Rest Stop → first Trial puzzle.
    - Keyboard and gamepad menus (a stubbed `getGamepads`).
    - Save and reload.
    - file:// and the sandboxed iframe.
    - Zero console errors and zero requests.
    - A frame-time check at 4× CPU throttle (local).
12. **Visual review.**
    - Screenshots of every town, dungeon, battle type and all 52 creatures.
    - A critical review, including the franchise-resemblance check, written to `reports/visual-review.md`.
    - Fixes.
13. **Site and PR.**
    - **CI script:** `scripts/ci-pick-games.ts`, run with Node 24 directly (no installs), with a self-test in the checks job. It picks games as follows:
      - `games/<slug>/**` → that game
      - starter template files → the starter
      - lockfile → the games whose workspace entries changed; any shared dependency change → all games
      - root `package.json` or `.nvmrc` → all games
      - `scripts/` or `ci.yml` → the starter only
      - `workflow_dispatch` → all games
    - **ci.yml:** the game list comes from the `games/` folder, and agentmon gets its own checks and browsers (Chromium and WebKit).
    - **Genres and trademarks:** add the "RPG" genre (schema, manifest.ts, the site's Category). Add other monster-taming franchise names to the trademark list.
    - **Import:** `npm run import-game -- agentmon`, `npm run manifests` and `npm run audit-storage` (STORAGE_AUDIT.md).
    - **Previews and art:**
      - capture script `apps/site/scripts/capture/agentmon.ts` with its previews
      - `cover.svg` and layers, `logo.svg` (logos.ts) and the OG image (og.ts)
      - Grid tests at 7 and 8 games.
    - **Release prep:** site bumped to 2.4.0 with **no** approval recorded. Site unit and e2e tests.
    - **PR:** open it, bind it, CI green, give you the preview link. **Stop. No merge, no production.**

## Verification and definition of done
- **Per phase:**
  - `npm run typecheck|test|test:sim|build --workspace games/agentmon`, then `npm run test:e2e --workspace games/agentmon` on its own.
  - `npm run check` at the root.
- **Done means:**
  - The bot reaches the credits on all 3 difficulties with no soft-locks.
  - Every Agentmon can be obtained without luck.
  - Balance stays within bounds.
  - Pacing is about 8 h on Normal.
  - The build is under 2.5 MB; saves stay under budget.
  - All local and CI tests pass.
- **Final report to you:**
  - screenshots of a battle, befriending, a dungeon puzzle, a town and the Field Guide
  - a sheet of all 52 Agentmon
  - balance and pacing results
  - build size
  - the preview link
  - known issues

## Risks
- **Scope:** this is a very large build.
  - Content (maps, dialogue) is data-first, so it can be extended in later sessions.
  - CLAUDE.md lists what's left at every commit.
- **32×32 creature art quality:** the shape-recipe approach plus review loops. Any design that fails the review is redrawn.
- **WebKit on Linux CI may be flaky.** It is local + CI. If it flakes, I'll report the retries rather than hide them.
