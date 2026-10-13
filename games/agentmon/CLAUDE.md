# Agentmon — working notes (read this first when resuming)

Creature-befriending pixel RPG for ages 7–12 (Ai Kids Games). Brief: `docs/prompts/agentmon.md`.
Approved plan (2026-10-13): `games/agentmon/docs/PLAN.md`. The owner's instruction: implement all 14
phases end to end, autonomously; only stop for disk < 2 GB (after cleaning our own files), a change
that would affect another game's behaviour or saves, or the production release.

**Resume:** "Continue Agentmon from CLAUDE.md" → read this file, then the **Progress** section, and
carry on from "Next".

## Workspace (another session is active)
- Agentmon lives in its own git worktree: `~/Documents/AI-Kids-Games-agentmon`, branch `agentmon`,
  based on Tuck Pop's phase 0 commit `4e03eae` (CI picker, `npm run release:local`, the
  "In development" status, Puzzle/Casual genres).
- The main checkout `~/Documents/AI-Kids-Games` belongs to the Tuck Pop session (branch
  `seventh-game`, folder `games/blocks-wip` → renamed `tuck-pop` there). Never touch that checkout,
  that branch or that game's folder. Our branch carries `games/blocks-wip` from the base commit;
  leave it alone.
- **Heavy runs:** before any browser test, capture or long simulation run
  `node games/agentmon/scripts/quiet-check.mjs` (or `--wait`). Never run heavy work alongside
  another session's tests. Easiest: `sh scripts/when-quiet.sh e2e|sim|shot …` (from
  games/agentmon) waits until quiet, then runs Playwright / the sims / a screenshot. It takes task
  names so its own command line never contains "playwright test": Tuck Pop's `when-idle.sh` and
  our `quiet-check.mjs` both look for that text, and two waiting scripts that match each other wait
  forever (that happened once). `quiet-check.mjs` ignores shells, waiting wrappers and orphans
  (ppid 1).
- **Disk:** check free space at the start of every phase (`df -h ~`). Under 2 GB: clean only our
  own regenerable files (games/agentmon/test-results, dist, reports/tmp); still under → stop and ask.
- Before every commit: `git log` for commits this session didn't make (the other session commits
  to its own branch; only `agentmon` matters here). Commit trailer:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Rules that never change
- One self-contained `dist/index.html` under **2,500,000 bytes** (`scripts/check-build.mjs`),
  works from file:// and in the site's sandboxed iframe, **no network requests** (build CSP).
- Storage: only keys starting `agentmon.` (`agentmon.slot1..3`, `agentmon.slotN.bak` only around a
  version migration, `agentmon.settings`, `agentmon.records`, probe `agentmon.__probe`). Never
  `localStorage.clear()`, never enumerate other keys. Saves are versioned; never break old saves.
  Each slot ≤ 300 KB (our own budget test: worst case ≤ 64 KB).
- Kid safety: nobody gets hurt ("tuckered out" → nap), no loss of creatures ever, losing → last
  Rest Stop healed with nothing taken, no gambling-like randomness, no ads/purchases/accounts/
  chat/trading. Flashing ≤ 3 per second. Touch targets ≥ 48 px. Reduced motion respected.
- Originality: no names/creatures/designs/items/places/music/UI/catchphrases from any franchise;
  no capture devices; no gyms/badges/elite four. Every name is web-checked; every design reviewed
  for lookalikes (log below).
- `site.status` stays **"In development"** until the last phase (keeps it off the site).
- Read-aloud uses only local speech voices (`localService`), since cloud voices would send text
  over the network.

## Commands (from the repo root of the worktree)
```bash
npm run typecheck --workspace games/agentmon
npm test --workspace games/agentmon            # unit tests (tests/unit)
npm run test:sim --workspace games/agentmon    # balance, level curve, playthrough bot, pacing (tests/sim)
npm run build --workspace games/agentmon       # typecheck + single-file build + contract check
node games/agentmon/scripts/quiet-check.mjs && npm run test:e2e --workspace games/agentmon
npm run dev --workspace games/agentmon         # http://127.0.0.1:5246
npm run check                                  # repo hygiene + build sync (root)
```
Ports: dev 5246, preview 4246.

## Architecture (see docs/PLAN.md for the full design)
- `src/core/` pure logic (no DOM/Pixi): rng, battle, creatures, world, puzzles, story, quests, save.
- `src/data/` typed content: elements, species, moves, items, maps, dungeons, trainers, dialogue,
  quests, `facts.ts` (every real fact, one reviewable file), names.
- `src/tuning.ts` every balance number.
- `src/art/` palette, pixel canvas, atlas, creature shape recipes, tiles, characters.
- `src/render/` Pixi scenes. `src/ui/` DOM menus and dialogue. `src/input/`, `src/audio/`, `src/game/`.
- Reused code (copied, adapted): Cliff Valley's PixelCanvas/Atlas/renderer/rng/audio engine;
  TheaBonk's glass stick (`input/stick.ts`, `ui/glass.css`).

## Decisions (small calls the plan didn't cover; newest last)
- 2026-10-13 Build budget is 2,500,000 bytes (decimal "2.5 MB", the stricter reading).
- 2026-10-13 Vitest runs `tests/unit` (npm test, also CI's default) and `tests/sim` (npm run test:sim).
- 2026-10-13 Playwright projects: chromium/webkit × desktop (1280×720), tablet (Galaxy Tab S4 /
  iPad gen 7), phone (Pixel 7 / iPhone 13); traces and screenshots only on failure, no video.
- 2026-10-13 Trademark list gains other monster-taming and RPG franchise names (manifest validator).
- 2026-10-13 Battles: no misses and no critical hits (fewer frustrating dice); a seeded 0.9–1.1 spread only.
  Only one status at a time; statuses never outlast a battle. Boost stages −2…+2.
- 2026-10-13 Sleepy counts the turns it actually makes the sleeper skip (2), so it lasts the same
  however fast the sleeper is; a bump wakes it. Other statuses count down at each turn's end.
- 2026-10-13 A move can't leave its user below 1 energy (never self-tucker); the free move always works.
  A shield can't be used two turns in a row. Shields/quick moves have priority 1.
- 2026-10-13 Energy carries between battles (Rest Stops matter); awake friends regain 5% after a
  battle; tuckered-out friends nap until a Rest Stop or a Wake Berry. A new friend joins at full energy.
- 2026-10-13 Experience: participants full, bench 75% with shared XP on (default); +50% catch-up for
  friends below the team's average level. Coins: wild 3×level, Keepers 8×top level×team size.
- 2026-10-13 Personalities only lift one stat (+8%), never lower one: every friend is good.
- 2026-10-13 Befriend: no hidden roll. Spark Ring arc size and spark speed come from tiredness,
  snack, mood (happy/calm/grumpy), friendliness and difficulty; 3 sparks, 2 hits fill the heart,
  near misses count half. Mood Match: 4 moods → kind actions (play/pet/snack/hum). 3 missed tries
  and a wild one wanders off; guardians never wander.
- 2026-10-13 AI: Easy picks any sensible option 45% of the time; Normal picks among options within 6%
  of the best; Hard looks one reply ahead and switches out of bad matchups. Wasteful finishers
  (a big move when a free one would finish) are penalised. The hint uses Normal scoring.
- 2026-10-13 Saves: JSON with 23-character packed creatures; flags/quests by name (robust to content
  changes). Our own per-slot budget 64 KB (brief: 300 KB); stored bytes counted as UTF-16 (2/char).
  slotN.bak is written only when an older save is migrated. A newer-version save is never overwritten.
- 2026-10-13 Pace: damage divisor 22 → about 4 turns per 1-vs-1 spar (2–4 bumps to tucker out);
  bump spread 0.85–1.15 (makes outcomes less knife-edge, so balance is robust).
- 2026-10-13 Wild and Keeper Agentmon use `bestMoveset` (a free move, best own-element bump, best
  other-element bump, one helper); the same pick is the suggested swap when a friend learns a move.
  Every Agentmon always keeps a free move (`movesAtLevel`, `canSwap`).
- 2026-10-13 Family stat levels tuned with `npx tsx scripts/tune-stats.ts` (nudges each family toward
  50%): elements 49–52%, species 35–65% in 1-vs-1. Totals now range ~370–444; guardians 450.
- 2026-10-13 Difficulty level shifts ease in over chapters 0–5 (`difficultyShift`); Hard's extra
  Keeper teammate starts at chapter 4. Story bosses (`boss: true`) always have a Rest Stop just before.
- 2026-10-13 Starters Spinnet/Druzling/Buzzbill; Juno picks a partner never strong against yours.
- 2026-10-13 Art: creatures are shape recipes (`src/art/creatures.ts`, painter in `painter.ts`) drawn at
  32×32 (battle) and 16×16 (overworld/icons) in 5 poses (idle, blink, happy, hit = dizzy swirls,
  nap); shimmer variants rotate the body hue 150° (never the face). Characters 16×24.
  Maps bake their whole ground into one PixelCanvas (`src/art/ground.ts`) with soft edges between
  terrains; trees/houses/props are depth-sorted sprites. Flat colours with sparse details
  (speckle noise looked busy). Corner rounding was tried and dropped (it made notch artifacts).
- 2026-10-13 The build keeps the starter's strict CSP (no eval): `import 'pixi.js/unsafe-eval'`
  (Pixi's no-eval polyfills) must stay first in `src/main.ts`, or WebGL setup fails.
- 2026-10-13 Overworld: trainers on routes are opt-in (talk to them to spar); only Keepers, rivals
  and story bosses are part of the story. Wild Agentmon wander only on their habitat terrain, never
  step onto or next to the player, and come back 25–45 s after leaving. Walking 0.2 s/tile, hold B
  to hurry (0.13 s), ice slides. Tap-to-move: tap a tile to walk there, tap a person/creature/thing
  to walk next to it and interact. A quick tap in the touch-stick zone also walks there.
- 2026-10-13 Field abilities work from anyone you've befriended (team or Agent Base), so no friend
  is ever "needed on the team". Snipped vines / melted ice / powered machines stay that way (flags).
- 2026-10-13 Read-aloud: auto-read is off by default (the 🔊 button on every line works anyway);
  only local voices. Text speed normal (50 chars/s); any press shows the whole line.
- 2026-10-13 Autosave: every map change, every spar, every Rest Stop nap, and every minute.
  `?quickstart` starts a test adventure in slot 3 (Easy/Normal/Hard via `&difficulty=`);
  `&fasttext` shows lines instantly (tests).
- 2026-10-13 Field Guide facts live in `src/data/facts.ts` with a "check" source per fact; facts
  verified by web search where unsure (popcorn 6,700 years, capybara ~5 min, manatee ~20 min, lemons).

- 2026-10-13 A gate's helper is guaranteed: areas list `ensure` species; while you have no friend
  of that element, one of them is out first (Sandy Shore → Tide, Cliff Road → Leaf, Mossgrove Woods
  and Glimmer Cave → Glow, Cragtop Slopes → Stone and Volt, Frost Pass → Flare, Frostfall Slopes →
  Frost, Updraft Ridge → Gust). Snipsy was added to the Cliff Road for this.
- 2026-10-13 The rushing stream on the Frostfall Slopes is a row of rapids (water-gap objects on ice),
  so a Tide friend can't paddle past the Frost gate; freezing any rapid makes an ice step.
- 2026-10-13 Trials: a solved Trial's door takes you straight to where it leads (the Keeper's top, or
  the far side for the three small puzzles). R or the Trial menu (Start / M) resets a room. Keepers
  stand straight in front of where you arrive. Losing to a Keeper: rest by the Beacon and try again.
- 2026-10-13 Story spars (Juno, the Spotlight Club) happen once; win or lose the story goes on, and
  after a loss your friends share berries (full rest). Keepers offer rematches after the credits.
- 2026-10-13 Side quests use live flags (`item:id:n`, `family:species`, `friend:species`, `guide:n`,
  `beacons:n`, in `core/state.ts` `storyFlags`) and a `take` command. 22 side quests + 3 guardian
  quests (`data/dialogue/sq.ts`, `data/quests.ts`). Guardians appear only after the credits, each
  through a key item someone gives you (Tide Pearl, Canyon Bell, Frost Feather).
- 2026-10-13 The parents are Field Agents "exploring far away" (no sad backstory).
- 2026-10-13 Main quest stages carry a `goal` tile; the stuck helper (40 s idle, or 5 min on one map
  without progress; Hints setting) shows the stage as a hint and a pulsing ★ arrow toward the goal or
  the door/edge on the way (`core/world/route.ts` `mapRoute`).
- 2026-10-13 Dark caves draw a circle of light around you (wider with a Glow friend).
- 2026-10-13 Map themes: 0 grass, 1 forest, 2 sky, 3 indoor, 4 cave, 5 desert, 6 snow, 7 mountain
  (cliff tops and faces follow the region).
- 2026-10-13 Test shortcuts with `?quickstart`: `&at=map,x,y&flags=…&team=species:level,…&items=…&quest=N`
  (`game/devsetup.ts`), so browser tests start where they need to.
- 2026-10-13 Battle menus put the keyboard/gamepad focus on the ★ suggested move when hints are on
  (else the first usable button), so pressing A picks a sensible move.
- 2026-10-13 Spark Ring arcs start a new path for each arc (Pixi joins consecutive arcs with a
  line otherwise); the friend above the ring is sized to stay on screen.

## IP log (names or designs changed after a check)
Franchise creatures and characters are described here, not named (this is a public repo).
- Manatee stage 1 "Seabun" → **Lullakin**: an upcoming indie creature-collecting game is called Seabun.
- Snow leopard line "Flurrcub/Flurrtail/Flurrdane" → **Scarfcub/Scarfpaw/Scarfspire**: "Flurr" is an
  ice character in a toy line.
- Glowworm stage 1 "Twinklet" → **Gleamgrub** (contains an adult slang word); the draft "Glimlet"
  was dropped before checking (too close to an existing crystal creature's name).
- Glowworm stage 3 was planned as a cave chandelier → **Starwisp**, a starry glowworm (a famous
  monster line is a candle → lantern → chandelier).
- Frost guardian was planned as a shaggy musk ox with fur over its eyes → **Frostmantle**, a giant
  snowshoe hare (an existing shaggy ice pig/mammoth line looks like that).
- Glow guardian was planned as a paper lantern → **Aurelune**, an aurora sky kite (an existing
  lantern creature).
- Moves: "Silly Face" → **Goofy Grin** (echoed a well-known move), "Twinkle Tap" → **Glint Tap**
  (echoed a special move's name). Avoided outright: every move name that matches a known move list.
- Names list: dropped nicknames that are franchise characters (professors, protagonists, leaders,
  team names), a toy-line and a TV dog's names, a store brand and two slangy words; player names
  "Iris", "Rosa", "Milo" → Isla, Rosie, Mika. Trainers "Ash" → Rio, "Reggie" → Rudy; the Showcase
  Club curator "Opaline" → **Velour**.
- Web checks (2026-10-13) found no existing creature or product for the remaining 52 names.
- Phase 3 art review (lookalike pass on the first drawings):
  - Twirlwing: leaves sprouting from the top of a round body echoed a famous bulb creature → its
    seed wings now spread to the sides, angled down.
  - Maplegale: four spread wings read as a butterfly → a two-blade "helicopter" rotor on its head
    and a maple-leaf collar.
  - Geode line: grey rocks with crystal crowns were too close to an existing crystal-crowned rock
    creature → sandy rocks whose crystals show in a geode window on the tummy (and, for Druzarch,
    a cut-open geode shell behind it).
  - Fluffkorn: a round white puff looked like an existing woolly sheep creature (and a fried egg) →
    a golden kernel-shell cup overflowing with buttery popcorn.
  - Mossbub/Hardigrade: a smooth moss dome read as a turtle shell → fuzzy moss tufts.
  - Frondle: raised green arms read as a cactus → drooping fronds.
  - Hailcastle: the cloud hat looked like a mushroom cap → a separate cloud floating above it.
- The misguided collectors "Showcase Club" → **Spotlight Club**: a famous creature series' anime has
  "Showcases", contests where creatures perform; a club running a creature show echoed it too closely.
- The desert Trial "Sunstone" (Trial, Mesa, Beacon, Keeper) → **Redrock**: a famous creature series
  has a "Sun Stone" evolution item. (Internal ids such as `sunstone-gate` stay; players never see them.)
- Icons: the Stone icon is a mountain peak (a hexagon looked round at 12 px); Chilly is an ice cube
  (it looked like the Frost icon); Toasty is wavy heat lines.

## Progress
| Phase | Status |
|---|---|
| 0 Scaffold, budget, RPG genre, CLAUDE.md | done |
| 1 Core rules (battle, energy, status, xp, AI, befriend, save codec) | done (72 unit tests) |
| 2 Content data + balance sim + level curve | done |
| 3 Art foundation (renderer, atlas, 52 creature recipes, tiles, characters, sheet) | done |
| 4 Overworld (maps, movement, NPCs, dialogue + read-aloud, encounters, inputs, Rest Stops, shops) | done (153 unit tests; keyboard opening + smoke e2e on desktop Chromium) |
| 5 Battle + befriend scenes, evolution | done (capture routes battle/befriend/evolution; opening e2e plays the real Spark Ring and spar) |
| 6 Puzzles + 6 Trials + solver tests + field abilities | done (Lighthouse Trial e2e: 4 rooms by keyboard, Marisol, Beacon) |
| 7 World + story content, post-game | done (57 maps, 140+ scripts, 22 side quests, 3 guardian quests; map checks in unit tests) |
| 8 Menus, Agent Base, save slots, tutorials, stuck helper, reading level | done (phases 6–8 committed together: they share the overworld wiring) |
| 9 Audio | next (engine, 21 tracks, effects and cries written; wiring in progress) |
| 10 Headless bot × 3 difficulties, pacing, retune | |
| 11 Browser tests | |
| 12 Visual + IP review | |
| 13 Site, previews, art, PR (stop before production) | |

**Phase 1 notes:** rules live in `src/core/` (`battle/engine.ts`, `battle/ai.ts`, `befriend.ts`,
`creature.ts`, `elements.ts`, `save/codec.ts`, `save/save.ts`, `state.ts`), storage in
`src/game/store.ts`, numbers in `src/tuning.ts`. Unit tests use a made-up fixture dex
(`tests/unit/fixtures.ts`), independent of the real content.

**Phase 2 notes:** content in `src/data/` (species.ts, moves.ts, items.ts, names.ts, facts.ts,
areas.ts, trainers.ts, chapters.ts, index.ts → `DEX`, `CODEC`). Simulations in `src/sim/`
(battle-runner, balance, progression); tests in `tests/sim/` write `reports/balance.md` and
`reports/level-curve.md`. Helpers: `npx tsx scripts/tune-stats.ts`, `npx tsx scripts/level-curve.ts`.
Test fix: the balance test's "moves in use" floor was set to 30 (not 40): the 1-vs-1 sim only sees
the moves known at its three fixed levels, so ~37 attack moves show up there by design.

**Phase 3 notes:** art in `src/art/` (pixelcanvas, painter, creatures, characters, icons, palette,
ground, props); Pixi in `src/render/` (renderer, atlas with lazy sprites, sprites registry); app shell
`src/game/app.ts` (scene manager + loop), scenes `title` (placeholder) and `sheet` (`?scene=sheet`,
`&shimmer=1`, `&pose=happy`, `&small=1`). Review helpers (node, no browser): `npx tsx
scripts/creature-sheet.ts [out.png] [--poses] [--small] [--shimmer] [--only=a,b]` and `npx tsx
scripts/art-sheet.ts chars|icons|scene`; in-browser: `node scripts/shot.mjs "scene=sheet" out.png`
(after a build; quiet-check first). PNGs go to `reports/tmp/` (git-ignored). Build ≈ 615 KB.

**Phase 3 commit note:** its message says "108 unit tests"; the real count at that commit was 90.

**Phase 4 notes:** world rules `src/core/world/` (map.ts parse/footprint, world.ts movement,
abilities, wild spawns, path.ts BFS), scripts `src/core/script.ts` (the `Cmd` union) run by
`src/game/runner.ts` against a `ScriptHost` (the overworld scene). `src/game/game.ts` owns input,
focus, dialogue, touch controls, toast, fade, tutorials; `session.ts` owns the game state, saving
and befriending; `scenes/overworld.ts` is the walking scene and `ScriptHost`. Maps: `src/data/maps/`
(Brightmoor, Gran's house, neighbour, Academy, Academy Garden, Rest Stop, shop, Meadow Path);
dialogue `src/data/dialogue/` (chapter 0); cast, shops, tutorials, quests in `src/data/`.
UI in `src/ui/` (dialogue + read-aloud, focus, menus, shop, new game, touch glass controls).
Inputs: `src/input/input.ts` (keyboard, gamepad, touch stick), tap-to-move in the scene.
`scenes/battle-host.ts` is a phase 4 stand-in (spars resolve with the AI-vs-AI runner). E2E: the
keyboard opening (wake up → Nell → garden → partner → spar with Juno) in `tests/e2e/opening.spec.ts`.
Test fix: its walk helper used to hold a key for a poll interval (100–350 ms) and count steps;
a held key keeps walking (also right after a door, as intended), so it took an extra step after
Gran's door and walked into the sign. It now holds the key until the exact target tile (the tile
changes at the start of a step, so letting go then never overshoots) or until a named map loads.
Also committed with phase 4 but **not wired in yet** (written ahead, unit-tested where pure):
phase 5 `src/game/battle.ts`, `render/battle-view.ts`, `render/spark-ring.ts`, `render/evolution.ts`,
`ui/battle-ui.ts`, `ui/mood-match.ts`, `art/backdrops.ts`; phase 6 `src/core/puzzle/` (engine +
BFS solver), `data/trials.ts` (36 rooms, all solved by `tests/unit/trials.test.ts`),
`art/trial-art.ts`, `game/scenes/trial.ts`. Review helpers: `scripts/backdrop-sheet.ts`,
`scripts/room-sheet.ts`, `scripts/rooms.ts` (solve/print rooms).

**Phase 5 notes:** `scenes/battle-host.ts` builds the other side and calls `game/battle.ts`
(`playBattle`: the battle view, the DOM battle UI, the turn loop, after-battle levels/moves/growing,
nicknames; `playSparkRing`; `growAnimation`). Capture routes in `game/capture.ts`:
`?scene=battle|befriend|evolution&seed=N` (`&mode=mood` for Mood Match), never saving; the hook's
snapshot says `ready: true` when the moment is on screen. The hook also shows `spark` (the Spark
Ring's spark angle and glow) and `battle` (turn, outcome) so tests can play them.
Screenshots: `sh scripts/when-quiet.sh shots "<query>" out.png …` (one browser for several).

**Phases 6–8 notes:** maps in `src/data/maps/` by region (brightmoor, meadow, coast, forest,
mountain, desert, frost, sky, postgame; `interiors.ts` builds Rest Stops, shops, homes, Trial halls
and tops); dialogue in `src/data/dialogue/` by chapter (ch0, ch2, ch3, ch5, ch7, ch9, ch11), `post.ts`
(after the story) and `sq.ts` (side quests); builders `keeperScript`, `storySpar`, `sideQuest` in
`common.ts`. Trials: `trial:<id>` doors open `scenes/trial.ts`; capture routes `town` (`&map=id,x,y`),
`dungeon` (`&trial=&room=&steps=`), `guide` (`&page=guide|guide:<species>|map|team|…`). Menu:
`ui/pause.ts` (Team, Bag, Field Guide, Map, Quests, Agent Base, Settings, Save). Credits `ui/credits.ts`,
Challenge Tower `game/tower.ts` (best floor in `agentmon.records`). Checks: `npx tsx scripts/check-maps.ts`
(rows, warps, edges, reachability; also in `tests/unit/world.test.ts`), `tests/unit/reading.test.ts`.
Runs that would otherwise wait for the other session: `sh scripts/snap-run.sh e2e|unit|sim …` copies the
game to `reports/tmp/snap` and runs there, so editing can go on.
Test fix: the map test compared edge offsets with `toBe(-offset)`, which fails for 0 (`-0` is not `0`
to `Object.is`); it now checks that the two offsets add up to 0.

**Next:** phase 9, audio: wire `src/audio/` (engine with limiter, `music.ts` 21 tracks, `sfx.ts`
effects and cries) into the game (map music, battle music by opponent, cries, effects, volumes),
browser check, commit. Then phase 10: the playthrough bot `src/sim/bot.ts` (`npx tsx scripts/bot-run.ts
seed difficulty fuzz`), the pacing model and `tests/sim/playthrough.test.ts`.