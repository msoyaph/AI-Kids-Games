# Shooberry: game 9, a 3D lane-defense garden game (working slug garden-wip until 2026-10-14)

The owner's brief is [docs/prompts/shooberry.md](../../docs/prompts/shooberry.md), with its follow-up change
of direction to 3D. The plan was approved on 2026-10-14; it is summarized below, so a new session can resume
from this file alone.

## Status

| Phase | What | State |
|---|---|---|
| 0 | Setup, originality, IP log, five names | **done** |
| 1 | Style frame and engine checks; **stop for the owner's approval of the look** | **done**: v2 approved ("Ok good graphics quality") |
| 2 | Simulation core and both bots | **done**: 50/50 levels (good bot), 50/50 within two tries (casual), 5.0 h pacing |
| 3 | Vertical slice (World 1, levels 1–3) | **done** (85b75e8, with 4–5): the CI proof moved to the release PR |
| 4 | Content, world by world (24 plants, 20 critters, 6 bosses, 50 levels) | **done** (85b75e8) |
| 5 | Interface, Seed and Invader Books, settings, audio | **done** (85b75e8) |
| 6 | Garden Party, 20 Challenges, Daily, balance and pacing | **done**: reports/balance.md, reports/pacing.md (5.0 h) |
| 7 | Performance, browser tests, visual review | **done** (34d2a10): 53 browser tests on 6 projects, CI rehearsal (software WebGL) green, reports/perf.md |
| 8 | Name, site, trailer, PR, **production** (owner: "now finish the game end to end and deploy it to production") | **done: LIVE** in release **2.11.0** (2026-10-14, PR #27, merge 0b87233), list position 10 |

## Release 2.11.0 (site) with Shooberry 1.0.0

- `main` moved while this was built: the MCP session shipped website **2.9.0** and the AI Kids Games app for
  assistants (apps/mcp 1.0.0) on 2026-10-14, so Shooberry was built as website **2.10.0** (merge 4da351e).
  Then, while it stalled on a stuck preview capture, the owner chose to ship Fieldlark first as 2.10.0
  (#28), so Shooberry ships as **2.11.0** at list position **10**, with the assistants app **1.2.0** (adding a
  game bumps it, as Fieldlark's 1.1.0 did). `main` was merged in again; every shared list keeps both games.
- Manifest fields from 2.9.0: `sessionMinutes` [10, 30], `moods` cheerful/brainy/exciting, `embed` fullscreen
  (a 3D game, like Space Sky). The assistants app's catalog picks Shooberry up from `npm run manifests`; its
  pause/round-end signal reads the hook's `screen` (apps/mcp/widget/src/signals.ts). The game reads gamepads
  in a try/catch, so assistant frames without gamepad access keep running.
- Site: cover (meadow picnic: Rowan flicks a berry at the Snack Snail, Comfrey, the ant column, the gingham
  blanket) with `drift` (clouds) and `twinkle` layers, logo (berry red, ink outline, like the title), OG
  image, a 7.8 s loop and 6 stills from `apps/site/scripts/capture/shooberry.ts` (the game's ?scene= routes;
  the boss scene is meadow-10 at 385 s, when the Grand Snail is mid-garden), and a 15 s trailer
  (marketing/sizzle; `npm run publish:trailers -- shooberry` publishes only this game's trailer).
- Storage audit: one key, `shooberry.save`; a complete save is 11.8 KB (budget 100 KB, enforced). Daily
  gardens record only in `daily` (the last 30) and share one remembered seed list.
- Fixed while finishing: "Patterns for colourblind players" did nothing (now a cross on spots a card can't
  go, a striped struck-through cost on cards you can't afford); the gamepad is read once per frame.

## Rules that never change

- **The owner's process:** "Wait for my approval of the look, then continue autonomously." The brief's "Stop
  before production" was replaced on 2026-10-14 by "Ok good graphics quality, now finish the game end to end
  and deploy it to production". One signed-off commit per phase (`git commit -s`), with this file kept current.
- **Shared machine:** work only in the worktree `~/Documents/AI-Kids-Games-garden` (branch `garden-wip`).
  Another session builds a different 3D diorama game, `farm-wip` (`~/Documents/FarmerTown/AI-Kids-Games-farm`);
  others run tests in their own worktrees. "Never run heavy tests alongside another session's tests, and always
  respect the quiet check's exit code." Heavy work (browser runs, captures, renders) only when
  `pgrep -f "[p]laywright test|[v]itest"` finds nothing **and** `sysctl -n vm.loadavg` is under 6 (other
  projects' `node --test` suites are invisible to pgrep). A few-second unit run of this game is fine.
- Before every commit, check `git log` for commits this session didn't make; if any appear, stop and tell the
  owner. Never rewrite history.
- `npm run build` makes one self-contained `dist/index.html` of at most **2,500,000 bytes** (the brief's 3D
  budget; `scripts/check-build.mjs`); the build-only Content Security Policy blocks every request.
- No network requests, ads, purchases, accounts, chat, analytics, personal data, energy or lives timers,
  streaks or red dots. Read-aloud uses only `localService` speech voices (cloud voices would send text out).
- Storage: every key starts with `shooberry.` (`src/config.ts`), never `localStorage.clear()`, never touch
  other keys. Saves are versioned with migrations, stay under 100 KB, are written on `pagehide` and
  `visibilitychange`, and `?quickstart` never overwrites a real save. Renamed from `gardenwip.` on 2026-10-14
  before anything shipped or saved under it.
- The test hook (`window.__shooberry.snapshot()`) only returns copies. Capture routes (`?scene=`) never save.
- Everything is original and generated in code: no asset files. Every name and design goes through the
  IP log below, and `tests/unit/names.test.ts` lints every name.
- Dependencies: only packages already in the root lockfile, at the same versions (three **0.186.1** exactly,
  @types/three 0.186.0). A shared lockfile change makes every game's CI run.

## Commands

```bash
npm run dev --workspace games/shooberry          # http://localhost:5338
npm test --workspace games/shooberry             # unit tests (light)
npm run typecheck --workspace games/shooberry
npm run build --workspace games/shooberry        # dist/index.html, size-checked
npm run test:e2e --workspace games/shooberry     # heavy: quiet machine only
```

## Art direction (owner, 2026-10-14: "make the lane-defense game look bold, bright and premium")

The owner reviewed style frame v1 (phase 1a, commit 9215e9f: soft plush look, units too small,
camera wasting half the screen, pale colours) and set measurable targets. A screenshot of the
inspiring series was given as **a quality bar only** (readability, scale, colour punch, polish); it
stays on the owner's machine (`.reference/`, git-ignored) and nothing is copied from it.

- **Camera** (render/camera.ts): near-orthographic (12° field of view) so back lanes are as big as
  front ones; the tilt adapts to the screen's shape between 38° and 82° so the playfield fills the
  play area, and characters lean back toward the camera (seen 27° from above their front at any tilt).
  The back lane's heads may rise into the top bar's strip (the beds never go under the HUD).
- **Framing** (tests/unit/framing.test.ts, reports/framing.md): the playfield (beds and the path in)
  fills at least 85% of the play area's width and height on every phone, tablet and desktop (90–95%
  in practice); the play area is the screen minus the top bar, the card tray and safe areas. Of the
  whole screen it's 52–70% (HUD, tray and notches take the rest). Upright tablets are the exception:
  the board spans the width with sky and garden above and below (45%).
- **Tray placement** (ui/layout.ts): the card tray goes where it costs the board least, a column
  beside it (phones, most desktops) or a row below it (4:3 tablets, 16:10 laptops). Cards scale with
  the screen (66–128 px).
- **The path in** (owner asked whether the field was too short): 9 plantable columns stay (the
  genre's proven length; tiles stay big on phones), plus BOARD.runway = 1.5 tiles of garden path on
  the right where critters come through a gap in the bushes and are seen approaching. Pace (a walker
  crossing in about 40 s, waves building) is tuned with the bots in phase 2.
- **Look:** toon shading in three bold bands, a dark outline hull on every character (0.03) and prop
  (0.018), a warm rim light, soft contact shadows under everything on every tier; outlines and toon
  stay on Low (only effects and background detail drop). Palette in render/palette.ts: rich dark soil
  in alternating light/dark columns inside each bed (column bands, never a lawn checkerboard), lush
  greens, a fresh blue sky.
- **Characters:** each plant has its own silhouette, signature colour and a big expressive face
  (geo.ts bigFace): Comfrey lilac (round bud, curled bell stalk), Rowan orange (puffy autumn tree,
  flicking branch), Boxwood emerald (square hedge with a bobble). Critters are about a tile tall:
  periwinkle snail with a golden shell, chunky upright coral ants (marching in threes), black-and-white
  magpie with teal sheen. Animations: idle bounce, squash and stretch on firing and producing, walk,
  nibble, shooed (recoil), and running home in a poof of leaves and sparkles.
- **Effects:** compost pickups float and bob in a soft round green-gold glow (no rays); berries have
  short trails; leaf and sparkle poofs; all listed in render/fx.ts under 3 flashes a second.
- **Backdrop** (render/backdrop.ts): screen-space, in the strip above the beds: sky, two cloud layers
  drifting at different speeds, round trees with picnic bunting, a woven willow (wattle) fence.
- **Interface:** chunky clay-pot cards with a clear cost badge, a cooldown sweep and a "not enough
  compost" state, number-key hints; a bold wave bar with picnic-flag milestones; a chunky compost
  counter.
- **The squint test** (tests/unit/squint.test.ts on every screen; scripts/style-frame.ts in pixels):
  every unit at least 75% of its tile's height and at least 10 px tall at 25% scale on the smallest
  phone; each signature fill 3:1 or more against both soil tones and the outline 3:1 against grass;
  plant hues at least 40° apart.
- After approval: roll the look out to every plant, critter, world and menu; rerun the full suite,
  the bot balance (unit sizes must not change gameplay) and a visual review of every world on phone
  and desktop.

## The design (approved plan, summarized)

- **A 3D "2.5D diorama"** in Three.js on WebGL 2: a fixed, tilted ¾ camera (about 30° field of view and 50°
  pitch, the board centred in the open area with `setViewOffset`). The rules are pure 2D and separate from
  rendering, so rules, balance and bots never touch Three.
- **Board:** 5 lanes × 9 tiles, tiles 1.0 wide × 1.3 deep, in front of the picnic blanket. Critters walk in
  from the right.
- **Resource: compost**, always on the ground, never falling from the sky. Earthworms surface on random soil
  tiles and leave a crumbly pile; Comfrey and Yarrow make compost (both are real compost plants); shooed
  critters drop a few leaves that turn into compost. Tap to collect, or auto-collect (on by default for
  younger players). Compost works day and dusk alike.
- **Snack Basket:** 3 snacks. A critter that reaches the blanket grabs one and runs home; a level is lost only
  when all 3 are gone, and stars count the snacks left. Losing shows "Try again!" with a hint; nothing is lost.
- **Last line: the Pop-up Picnic Umbrella**, one per lane, used once. When the first critter reaches the
  blanket in its lane, it springs open (*fwump*) and spooks the critters near the blanket back to the far edge.
  Nobody is removed; it buys time.
- **Garden Friends:** some plants get a small bonus beside their real-life companions; the Seed Book explains
  the real fact.
- **Worlds** (5 × 10 levels): Meadow Picnic (Garden Friends), Glass Greenhouse (sprinkler tiles, water
  channels), Pumpkin Patch at Dusk (dusk bloomers, lanterns that lure moths and owls; no fog), Cactus Garden
  (hot tiles dry plants unless beside a channel), Cloud Garden (gaps, updrafts that lift flyers).
- **Modes:** Adventure (1–3 stars, unlocks), Garden Party (endless, local best), 20 Challenges (pre-planted,
  fixed sets, protect the snack cart, Pinecone Curling on the cloud garden's glide lanes), Daily (date-seeded,
  no streak, no penalty).
- **Interface:** plant cards as round clay-pot badges (a left column on phones), seed selection with the
  level's critters shown as cards, wave progress as a footprint path with picnic-flag milestones, a final-wave
  "Here they come!" card, 1×/2× and pause. The HUD and menus are a crisp DOM overlay over the 3D scene.

## Rules decisions (phase 2, from the bots' balance runs)

- `src/sim/game.ts` (pure, 60 Hz, seeded) + `src/sim/bot.ts`; all numbers in `src/data/tuning.ts`;
  levels in `src/data/levels.ts` (rows per world: the new plant, the new critter, the boss; waves
  are made from a seeded budget and spread over 48 s + 6 s per wave); Challenges, Garden Party and
  the Daily in `src/data/modes.ts`. `npx tsx scripts/balance.ts` prints the table quickly.
- A level's new plant is usable in that level (with its tip). Start: Rowan and Comfrey.
- A swarm (ants, moths) takes one snack together. Magpies never take snacks (they borrow one plant
  and drop it two tiles on). A packrat trades one plant for a pebble, then goes home. Moths flutter
  low (any plant reaches them); moths and owlets only come out in dusk levels. Grasshoppers hop at
  most 3 plants. Boss levels keep the boss's lane free of gaps and hot tiles, bring a lighter
  escort, start with +100 compost; the boss walks in partway into the last wave.
- **The trowel** (`dig` command): dig up a plant to make room, no compost back. Added because a lane
  full of producers with a critter nibbling a blocker could never end (found by the bot).
- When the garden is clear, the next wave comes within 8 s (a breather, not a jump).
- No single plant is required: without Comfrey (Yarrow instead) the good bot wins 36/38 of the levels
  where Yarrow exists; without Boxwood 45/49. A frog needs a straight shooter (Rowan, Arrowhead,
  Wisteria, Milkweed or Primrose); early in the Greenhouse that's Rowan or Arrowhead.

## Architecture (`src/`)

- `data/`: typed data. `roster.ts` (plants, critters, worlds), later levels, challenges, `facts.ts` (every
  Seed Book fact in one reviewable file), `invaderBook.ts`, and **`tuning.ts` (every balance value)**.
- `sim/` (phase 2): pure TypeScript, 60 Hz fixed step, seeded RNG, no DOM and no Three (a purity test enforces
  it, as farm-wip's `tests/unit/purity.test.ts`). `bot.ts` has "good" and "casual" bots.
- `render/` (phase 1): `camera.ts` pure `fitCamera(viewport, layout)` (reuse farm-wip's `camera.ts` and
  `ui/layout.ts`: `SUPPORTED_VIEWPORTS`, `openArea`); `models/` rounded low-poly parts, one InstancedMesh per
  part per species, built only for species in the level; `instanced.ts` (TheaBonk's `writeTRS`); `pools.ts`
  (structure-of-arrays, never grows after warm-up); `quality.ts` (Space Sky's `PROFILES`/`QualityGovernor`/
  `WEAK_GPU`); `fx.ts` (`FLASH_LIMIT_HZ = 3`, Agentmon's pattern and test); `pick.ts` (ray onto the board
  plane, then the nearest tile within a generous radius).
  - **Low:** blob shadows, no post effects, pixel ratio 1, `antialias:false` before the context exists.
    **Medium:** soft shadows, pixel ratio 1.5. **High:** shadow maps, pixel ratio 2, TheaBonk's `Bloom.ts`.
    `?quality=` forces a tier; software renderers start on Low at 1×. About 6 shader programs, warmed with
    `compileAsync` behind the boot screen; context loss handled.
  - The WebGL 2 pre-boot check with a friendly message (Space Sky's `index.html`) arrives with the Three
    renderer in phase 1.
- `ui/`, `input/` (tap or drag a card then a tile, long-press for info; keyboard and gamepad grid cursor;
  quick taps latched and used by the next step), `audio/` (synthesized music per world, layers that grow with
  the waves, a limiter), `save/`.
- **Hooks:** read-only `__shooberry.snapshot()` (with each tile's on-screen centre and the card rectangles for
  tests); `?scene=` routes (big wave, boss, planting, world showcase, `stress`); test mode only
  `?testmode=1&speed=N` (the real frame time is clamped before it's multiplied).
- The starter's Star Catch files (`sim.ts`, `render.ts`, `input.ts`, `audio.ts`, `main.ts`) stay until phases
  1–2 replace them, so the contract tests keep passing.

## Phase checks

0. The name lint and the trademark blocklist test pass.
1. Screenshots on a phone (landscape) and desktop at Low, Medium and High. **The pick test:** for every
   supported viewport (with notch insets) and all 45 tiles, the tile centre is inside the open area and clear of
   the HUD, a ray picks that tile, all 9 points of a 44 px finger pick it or snap to it, and each tile is at
   least 40 px on the smallest phone (if 568×320 can't reach that, raise the smallest phone and record why).
   Draw calls and CPU time per tier; build size. Style frame: Meadow board, Comfrey, Rowan and Boxwood, snail,
   ant column and magpie.
2. The purity test; the bots beat 3 sample levels.
3. CI green on a draft PR (software WebGL and WebKit); never merged before the end.
4. A bot balance test per world.
5. The flash test; screenshots of the books.
6. `reports/balance.md` and `reports/pacing.md`: every level beatable with the plants available, the casual
   bot 1-stars every Adventure level on its first or second try, no plant required or dominant, 5–6 hours.
7. Stress scene (45 plants, 40 critters, 150 projectiles): draw calls (Low ≤ 80, Medium ≤ 120, High ≤ 200),
   triangles, programs, CPU p50/p95, heap slope, GPU memory; 60 FPS on the throttled phone (844×390, DPR 3,
   CPU ×4). Full browser tests (Chromium and WebKit; phone landscape, tablet, desktop; one worker on CI,
   `E2E_LOW`), and the visual review with the lookalike check.
8. After the owner picks the name: rename slug and prefix, `import-game`, storage audit, capture route and
   previews, cover, logo, OG image, a 15 s trailer, site tests that count games from the registry, the PR,
   CI green, the preview link. Add the brief's row to `docs/prompts/README.md` then (left out until the game is
   named, to avoid a conflict with farm-wip).

## Name: Shooberry (owner's pick, 2026-10-14)

Then the owner wrote: "Ok good graphics quality, now finish the game end to end and deploy it to
production" (this replaces the brief's "stop before production" for this release).

## Five name candidates (web-checked 2026-10-14, for the owner's pick)

Searched each name with "game" and "app"; none is taken by a game or app.

| Name | What turned up | Notes |
|---|---|---|
| **Shooberry** | Nothing at all | Most distinctive. "Shoo" is the game's verb; Rowan flicks berries. |
| **Petal Guard** | Nothing exact; Petal Garden (flower growing), Petal Hill (a game-jam game about shielding a flower with gusts), Petal Crash | Clear, but "Petal" titles are common. |
| **Sprout Squad** | Nothing exact; *Sprout* board games (2011, 2019, 2025) | Friendly and kid-sized. |
| **Bloom Brigade** | Nothing exact; several "Bloom" titles, including an itch.io arena shooter with plant enemies | Crowded word. |
| **Picnic Guard** | Nothing exact; small picnic-defense game-jam titles (Picnic Defense, Picnic Panic, Picnic TD) | Says what it is, but generic. |
| Backup: Blossom Watch | No game; a Wear OS watch face of that name | Kept as a backup only. |

Dropped: Picnic Patrol (too close to a famous kids' show title on the blocklist), Leafy Lanes (an itch.io game),
Shoo Garden (near Shu's Garden), Petal Puff ("puff" echoes the inspiring series' mushroom plants).

## IP log

The repo is public, so this log describes other franchises without naming them. "The series" means the
lane-defense classic that inspired the brief, with its sequel, shooters and card game; its title, abbreviation
and publisher are on the trademark blocklist (`scripts/lib/manifest.ts`, tested in
`apps/site/tests/manifests.test.ts`).

### Never used (from the brief, plus what the plan added)

- A sun currency or any sun theme; pea shooters; nut walls; cherry or other bombs; potato-style mines;
  row-clearing mowers; cone or bucket headgear; a neighbor who sells from a car; seed packets on a conveyor;
  a zen garden; day/night/pool/fog/roof worlds.
- Also: mushrooms; lily-pad platforms; cactus spikes (Agave's leaf tips are rounded); cattails; pumpkins as
  shells; corn, cabbage or melon lobbers and catapult arms; garlic-style lane switching; clover fans; torches;
  starfruit; kelp; squash; snapdragon fire; moonflower or "shadow" plants; aloe healing; thistle homing; ice
  or freezing slows; fog of any kind; a "huge wave" warning; a bowling mini-game.
- **Style rules:** no plant shoots from a mouth (shots leave from branches, pods, stalks or flowers); no
  snouts or tube mouths; lobs come from swaying stalks or spinning wings, never catapult arms or baskets;
  plant cards are round clay-pot badges in a side column or bottom row, never paper packets in a top bar;
  costs sit on a compost-ball badge, never a sun disc. Faces changed with the owner's art direction (v2):
  big round eyes and an open smile or grin, still never a mouth that shoots.
- **The owner's quality reference (2026-10-14):** a screenshot of the inspiring series, used as a quality
  bar only (readability, scale, colour punch, polish). Not committed, not traced, no colours sampled.
  Differences kept on purpose: raised wooden beds with soil in column bands (not a striped or checkered
  lawn); a woven willow fence with round trees and bunting (not a white picket fence, house or bushes
  wall); the gingham blanket and lane umbrellas (not mowers); compost pickups are leafy balls in a round
  glow (not a rayed sun); cards in a side tray (not a seed bar along the top); a footprint-and-flag wave
  bar of our own.

### Roster v2 plants: lookalike review

Each species was searched against the series' plant lists (2026-10-14). Not found anywhere in the series:
comfrey, yarrow, wisteria, milkweed, hollyhock, maple, allium (as a plant of its own), chamomile, borage,
evening primrose, four o'clock, rowan, boxwood, lamb's ear, hops, arrowhead, pickerelweed, pampas grass,
touch-me-not, lavender, bluebell, nasturtium, agave. Basil appeared only on spam pages.

**Swapped after the check:** Mint → Lamb's Ear (the sequel has a whole family of mint plants);
water mint → Arrowhead; Oak/Acorn → Rowan (an acorn and an oak are in the shooters); Bramble Hedge → Boxwood
Topiary (a bramble bush is in the sequel; a briar rose in the card game); Morning glory → Hop Vine (one regional
edition of the sequel has it). Later, from the lookalike review: Lavender's gust → a scent (a wind plant that
blows critters back is in the sequel), Four-o'clock's dusk compost → a sleepy scent (the original has a
night-time producer), Grasshopper's "tall plants stop it" → it hops in bursts and is stopped by tangles (a tall
plant that stops jumpers is the original's).

| Plant (species) | Role | Closest thing in the series | Why ours is different |
|---|---|---|---|
| Comfrey Crumble (comfrey) | producer | the sun-making flower | Makes compost on the ground; real compost plant; no sun |
| Yarrow Brew (yarrow) | producer | — | Real compost activator; bonus beside neighbors |
| Rowan Flicker (rowan) | shooter | the pea shooter | A springy branch flicks berries; small tree, no mouth or snout |
| Wisteria Popper (wisteria) | piercing shooter | piercing fume and laser plants | Twisty pods pop open (real); seeds, not fumes or beams |
| Silky Milkweed (milkweed) | rapid shooter | a seed-blowing dandelion | Straight, quick floss tufts from opening pods; recheck in the visual review |
| Maple Twirler (maple) | lobber | catapult lobbers | Samaras spin down from the crown; no arm or basket |
| Hollyhock Tosser (hollyhock) | lobber | catapult lobbers | A swaying stalk flings flat seed discs (real seed shape) |
| Boxwood Block (boxwood) | blocker | the nut walls | A clipped square hedge; nibbled into gaps, never a cracking face |
| Pampas Plume (pampas grass) | blocker | — | Critters get stuck in the fluff |
| Agave Anchor (agave) | blocker | the cactus | Never dries on hot tiles (stores water); rounded tips, no spikes |
| Snuggly Lamb's Ear (lamb's ear) | slower | freezing slowers | Softness, not cold; critters stop to snuggle |
| Hop Vine Twister (hops) | slower | a kelp that drags under | Twining bines hold feet a moment; nobody is pulled anywhere |
| Touch-me-not Jiggler (touch-me-not) | area | an all-around fume plant | Ripe pods burst when touched (real); seeds, not fumes |
| Allium Pom (allium) | area | the lane-switching garlic; a stink plant | A ticklish pollen cloud on its own lane; never a smell, never lane switching |
| Basil Buddy (basil) | support | a bean that wakes mushrooms | Speeds its neighbors (real companion plant) |
| Chamomile Cheer (chamomile) | support | — | Cards recharge sooner |
| Borage Buzz (borage) | support | — | Its bees boost Garden Friends; bees never attack |
| Lavender Shoo (lavender) | push-back | a wind plant that blows critters back | Real pest-repelling scent; the front critter backs away |
| Nasturtium Lure (nasturtium) | lane | the lane-switching garlic (pushes away) | The opposite: a real trap crop that calls critters into its lane |
| Twilight Primrose (evening primrose) | dusk shooter | night-only mushrooms; moonflower-powered plants | Opens at dusk (real); no moon, shadow or mushroom |
| Teatime Four-o'clock (four o'clock) | dusk slower | a night-time producer mushroom | Opens in late afternoon (real); a sleepy scent, makes no compost |
| Arrowhead Skimmer (arrowhead) | water shooter | a sea mushroom; lily-pad platforms | Grows in irrigation channels; no platforms |
| Pickerelweed Splash (pickerelweed) | water slower | — | Splashes critters crossing channels |
| Bluebell Chime (bluebell) | anti-air | a cactus that pops balloons; a clover fan | A chime ripple (under 3 per second) shoos flyers |

### Roster v2 critters: lookalike review

The series' enemies are undead people with props; every critter here is a real animal that wants snacks, so
nothing is close in kind. Mechanics the brief asks for (armor, jumpers, diggers, flyers, swarms, shields,
plant stealers) are checked for close copies, and every animal against other famous characters.

| Critter (animal) | Mechanic | Watch-outs and differences |
|---|---|---|
| Snack Snail (garden snail) | walker | Not a racing-snail film look |
| Field Mouse | quick | No famous mouse look (no round black ears, no gloves) |
| Ant Column (ants) | swarm | Red-brown ants in a line, not an animated film's blue/purple ants |
| Roly-poly (pill bug) | armored | A natural shell with a plate pattern for colorblind players; no headgear |
| Magpie | flyer, borrows a plant | The original has a sky-drop plant thief; ours drops the plant a few tiles on, where it's replanted free; a natural long-tailed bird, not a round wingless bird |
| Leaf-shield Beetle (stag beetle) | shield | A leaf held in front, not a screen door |
| Grasshopper | jumper | Hops in bursts over anything; tangles and soft plants stop it (not tall plants, see above) |
| Umbrella Frog (tree frog) | lob-blocker | The series has an umbrella *plant* that blocks lobs; ours is the critter's leaf umbrella. Not a flat-faced frog mascot |
| Vole | digger | The original's digger tunnels to the house and walks back; ours shows a molehill first and pops up mid-lane, walking on |
| Hedgehog | armored front | Natural brown, no shoes, never blue, never a speed-spin |
| Moth Flutter (moths) | swarm flyer | Drawn to lanterns (real); glow stays under 3 flashes a second |
| Badger | shield | A round cake-tin lid held in front; never worn, never a pail |
| Owlet (little owl) | flyer | Swoops low past lanterns |
| Desert Gecko | quick | Faster on hot tiles; not an insurance-ad gecko look (no standing upright, no accent) |
| Nibble Goat (young goat) | nibbler | Small and cute, not a chaos-simulator goat |
| Jackrabbit | double jumper | Not a famous cartoon rabbit (no upright stance, no carrot) |
| Packrat (desert woodrat) | swapper | Trades a plant for a pebble (real packrat habit); original |
| Seagull (gull) | flyer | Dives for one snack; never says a famous film's "mine" line |
| Kite Crow (crow) | flyer on updrafts | A diamond kite on a string, never a round balloon (the original has a balloon floater) |
| Cloud Sheep (lamb) | floater | All-white with a pale face, not a famous stop-motion lamb's black face |

**v2 redesign (bold look), lookalike review of the six style-frame units:**

| Unit | v2 design | Closest thing elsewhere | Why ours is different |
|---|---|---|---|
| Comfrey Crumble | lilac round bud with a face, ring of big leaves, curled stalk of nodding bells | the series' producer: a yellow flower with a face in its petals | lilac bud, no petals around the face, the curled bell stalk; makes compost, not sun |
| Rowan Flicker | puffy orange autumn tree with a face in its crown, berry bunches, a flicking branch | the series' shooters: green heads with tube mouths | a tree; shots leave a branch, never a mouth |
| Boxwood Block | emerald clipped square hedge with a bobble, brave face | the series' wall: a brown egg-shaped nut with big eyes | square, green, leafy, with a topiary bobble; a blocker with a face is common to the genre |
| Snack Snail | periwinkle body, eyes on stalks, golden shell with a coral swirl | racing-snail film looks | no stripes or racing gear; colours our own |
| Ant (of an Ant Column) | chunky upright coral ant, six legs (four walking, two arms), big eyes, marching in threes | an animated film's upright blue and purple ants | coral, six legs, no clothes |
| Magpie | black and white with white shoulder patches and a teal sheen, long tail | the slingshot game's round wingless birds | a natural long-tailed bird with wings |

**Not used anywhere:** a raccoon/squirrel/tortoise/possum gang (an animated film's cast), a basket-stealing
bear, sock goblins (from the brief's examples, replaced by real animals), a goose that steals things in a garden.

**Bosses (phase 4):** a mini-boss per world and a giant final boss, the Snack Parade Float carrying the whole
cast (never a bear or a balloon basket). Each design gets a row here when it's made.

### Other originality notes

- Tapping to collect the resource is required by the brief; our pickups are brown crumbly piles on the ground.
- "A flag marks big waves" is from the brief; ours are picnic flags along a footprint path.
- The brief suggests "a pumpkin patch at dusk" as a world; it has no pumpkin plant, graves or fog.
- Pinecone Curling replaces a bowling mini-game: pinecones glide and stop on targets (sweeping speeds them),
  knocking hats off; nothing is bowled at critters.
